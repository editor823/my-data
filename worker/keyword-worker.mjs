/**
 * 키워드 분석 Worker (worker/keyword-worker.mjs)
 * - 본인 네이버 API 키로만 동작합니다 (남의 서버 사용 X).
 * - Cloudflare Worker 와 로컬 server.js 가 같은 코드를 같이 씁니다.
 * - /api/keyword          : 키워드 분석 (검색량·문서수·최근 30일 발행·발행 추천·연관 키워드)
 * - /api/keyword/insight  : 검색 추이·성별·연령 (네이버 데이터랩, 키가 있을 때만)
 * - /api/spider           : 거미줄치기 키워드 세트 (spider-core.mjs)
 * - /api/spider/compete   : 연결 키워드 경쟁도 (문서수·상위 100개 중 제목 일치·상위글 나이·공식 블로그) 최대 10개
 * - /api/spider/facts     : 메인 글에 넣을 사실 문장 (뉴스에서 일정·금액·대상·방법)
 * - /api/youtube/viral    : 바이럴숏폼 유튜브 검색 (키워드·국가·기간·정렬·영상 형태, youtube-viral.mjs)
 *
 * 필요한 비밀 값(환경변수 / Worker Secret):
 *   NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY  (검색광고 API: 검색량·연관키워드)
 *   NAVER_HUB_CLIENT_ID,  NAVER_HUB_CLIENT_SECRET                       (API HUB: 블로그 문서수·상위글·뉴스)
 *   NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET               (선택: 네이버 개발자센터 데이터랩 → 검색 추이·성별·연령)
 *
 * Cloudflare 무료 요금제는 요청 1번에 외부 호출 50번까지라, 분석(/api/keyword)과 데이터랩(/insight)을 나눠 둡니다.
 */
import { buildSpiderSet, fetchNaverSuggest, fetchGoogleSuggest, extractFacts } from './spider-core.mjs';
import { searchViral } from './youtube-viral.mjs';

const ALLOWED_ORIGINS = [
  'https://editor823.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const HUB_BASE = 'https://naverapihub.apigw.ntruss.com/search/v1';
const DAY = 86400000;
const RELATED_MAX = 24;

const ymd = (t) => new Date(t + 9 * 3600000).toISOString().slice(0, 10); // 한국 날짜
const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

// "< 10" 처럼 문자열로 오는 검색량은 5로 계산합니다.
function toCount(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 5;
}
const isUnder10 = (v) => typeof v !== 'number' && !Number.isFinite(Number(String(v).replace(/,/g, '')));

async function hmacBase64(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  let bin = '';
  new Uint8Array(sig).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

// 검색광고 API: 키워드(최대 5개, 쉼표) + 연관 키워드 검색량
async function fetchSearchAd(hints, env) {
  const uri = '/keywordstool';
  const ts = String(Date.now());
  const signature = await hmacBase64(env.NAVER_AD_SECRET_KEY, `${ts}.GET.${uri}`);
  const hint = [].concat(hints).map((h) => String(h).replace(/\s+/g, '')).filter(Boolean).slice(0, 5).join(',');
  const url = `https://api.searchad.naver.com${uri}?showDetail=1&hintKeywords=${encodeURIComponent(hint)}`;
  const res = await fetch(url, {
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': env.NAVER_AD_ACCESS_LICENSE,
      'X-Customer': env.NAVER_AD_CUSTOMER_ID,
      'X-Signature': signature,
    },
  });
  if (!res.ok) throw new Error(`검색광고 API 오류 (${res.status})`);
  const data = await res.json();
  return (data.keywordList || []).map((k) => {
    const pc = toCount(k.monthlyPcQcCnt);
    const mobile = toCount(k.monthlyMobileQcCnt);
    return { keyword: k.relKeyword, pc, mobile, total: pc + mobile, under10: isUnder10(k.monthlyPcQcCnt) || isUnder10(k.monthlyMobileQcCnt) };
  });
}

// API HUB 검색 (blog / news)
async function hubSearch(kind, query, env, params = {}) {
  const qs = new URLSearchParams({ query, ...params }).toString();
  const res = await fetch(`${HUB_BASE}/${kind}?${qs}`, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': env.NAVER_HUB_CLIENT_ID,
      'X-NCP-APIGW-API-KEY': env.NAVER_HUB_CLIENT_SECRET,
    },
  });
  if (!res.ok) throw new Error(`${kind} 검색 API 오류 (${res.status})`);
  return res.json();
}

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

function competitionOf(blogCount, total) {
  if (!total) return '-';
  const r = blogCount / total;
  if (r < 1) return '낮음';
  if (r < 5) return '보통';
  if (r < 20) return '높음';
  return '매우 높음';
}

// 문서수 / 검색량 비율이 0.3 미만이고 검색량이 100 이상이면 황금 후보
const isGolden = (blogCount, total) => total >= 100 && blogCount / Math.max(1, total) < 0.3;

function postdateToMs(p) {
  if (!/^\d{8}$/.test(p || '')) return null;
  return new Date(`${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T00:00:00+09:00`).getTime();
}
function postdateToAgeDays(p) {
  const t = postdateToMs(p);
  return t == null ? null : Math.max(0, Math.floor((Date.now() - t) / DAY));
}

/**
 * 최신순 블로그 글 묶음으로 "최근 30일 동안 제목에 키워드가 들어간 글 수"를 셉니다.
 * 가져온 글이 30일을 다 덮지 못하면(글이 너무 많으면) 덮은 기간 비율로 늘려 어림합니다.
 */
function recentTitleCount(items, keyword) {
  const k = norm(keyword);
  const now = Date.now();
  const dated = items.map((it) => ({ t: postdateToMs(it.postdate), title: norm(stripTags(it.title)) })).filter((x) => x.t != null);
  if (!dated.length) return { count: 0, approx: false, coveredDays: 30 };
  const oldest = Math.min(...dated.map((x) => x.t));
  const coveredDays = Math.max(1, Math.min(30, (now - oldest) / DAY));
  const inWindow = dated.filter((x) => now - x.t <= 30 * DAY && x.title.includes(k)).length;
  const full = items.length >= 100 && coveredDays < 30; // 30일을 다 못 덮었으면 비율로 늘림
  return { count: full ? Math.round(inWindow * (30 / coveredDays)) : inWindow, approx: full, coveredDays: Math.round(coveredDays) };
}

/* 발행 추천 등급 · 기회지수 · 경쟁 수준 (모든 기준은 화면 툴팁에 그대로 설명) */
function gradeOf(total, recent) {
  const spp = total / Math.max(1, recent); // 최근 30일 글 1개당 월 검색수
  if (total >= 1000 && spp >= 50) return 'S';
  if (total >= 300 && spp >= 20) return 'A';
  if (total >= 100 && spp >= 5) return 'B';
  return 'C';
}
function opportunityOf(total, recent) {
  const vol = Math.min(1, Math.log10(Math.max(1, total)) / 4.5); // 3만 회 ≈ 만점
  const spp = total / Math.max(1, recent);
  const fresh = Math.min(1, Math.log10(spp + 1) / 2); // 글 1개당 검색 100회 ≈ 만점
  return Math.round(100 * (0.35 * vol + 0.65 * fresh));
}
function levelOf(recent) {
  if (recent <= 10) return '초보자';
  if (recent <= 50) return '중급자';
  if (recent <= 200) return '상급자';
  return '고수';
}

// 최신순 블로그 글을 받아 월 발행량을 어림합니다. 글이 많아 사흘도 못 덮으면 최대 1,000개까지 더 받습니다.
async function fetchRecentPosts(keyword, env) {
  const first = await hubSearch('blog', keyword, env, { display: 100, sort: 'date' });
  let items = first.items || [];
  const total = Number(first.total) || 0;
  const distinctDays = (arr) => new Set(arr.map((it) => it.postdate).filter(Boolean)).size;
  if (items.length >= 100 && total > 100 && distinctDays(items) < 4) {
    const starts = [101, 201, 301, 401, 501, 601, 701, 801, 901].filter((st) => st <= total);
    const more = await Promise.all(starts.map((start) =>
      hubSearch('blog', keyword, env, { display: 100, sort: 'date', start }).then((j) => j.items || []).catch(() => [])));
    more.forEach((m) => { items = items.concat(m); });
  }
  return { total, items };
}

/**
 * 월 발행량: 날짜가 하루 단위라, 가져온 글 중 "하루가 통째로 들어간 날"만 세어 하루 평균을 냅니다.
 * (가장 오래된 날과 오늘은 일부만 들어 있으므로 제외)
 */
function monthlyPublishOf(items, total) {
  const dates = items.map((it) => it.postdate).filter((p) => /^\d{8}$/.test(p || ''));
  if (!dates.length) return null;
  const now = Date.now();
  if (items.length >= total) {
    const n = dates.filter((p) => now - postdateToMs(p) <= 30 * DAY).length;
    return { perMonth: n, perDay: Number((n / 30).toFixed(1)), sample: items.length, days: 30, method: 'all' };
  }
  const byDay = new Map();
  dates.forEach((p) => byDay.set(p, (byDay.get(p) || 0) + 1));
  const sorted = [...byDay.keys()].sort(); // 오래된 날 → 최근
  const today = ymd(now).replace(/-/g, '');
  const full = sorted.slice(1).filter((d) => d !== today);
  if (full.length) {
    const n = full.reduce((s, d) => s + byDay.get(d), 0);
    const spanDays = Math.max(1, (postdateToMs(full[full.length - 1]) - postdateToMs(full[0])) / DAY + 1);
    const perDay = n / spanDays;
    return { perMonth: Math.round(perDay * 30), perDay: Math.round(perDay), sample: items.length, days: Math.round(spanDays), method: 'fullDays' };
  }
  // 하루가 통째로 든 날이 없을 만큼 글이 많음 → 오늘 올라온 글 수를 오늘 지난 시간 비율로 나눠 하루치를 어림
  const todayStart = postdateToMs(today);
  const elapsed = Math.min(1, Math.max(0.05, (now - todayStart) / DAY));
  const todayN = byDay.get(today) || 0;
  const todayComplete = sorted[0] !== today; // 가장 오래된 글이 어제 이전이면 오늘 글은 다 받은 것
  const perDay = todayComplete && todayN ? todayN / elapsed : items.length / elapsed;
  return { perMonth: Math.round(perDay * 30), perDay: Math.round(perDay), sample: items.length, days: 1, method: todayComplete ? 'today' : 'lowerBound' };
}

/* 연관 키워드 후보: 검색광고 연관어 + (부족하면) 네이버·구글 자동완성의 검색량 */
async function collectRelated(keyword, engine, ads, env) {
  const k = norm(keyword);
  const byKey = new Map();
  const add = (a, source) => {
    const n = norm(a.keyword);
    if (!n || n === k || byKey.has(n)) return;
    byKey.set(n, { ...a, source });
  };

  let suggest = [];
  if (engine === 'google') {
    const [g1, g2] = await Promise.all([fetchGoogleSuggest(keyword).catch(() => []), fetchGoogleSuggest(`${keyword} `).catch(() => [])]);
    suggest = g1.concat(g2).map((s) => ({ keyword: s, source: 'google' }));
  } else {
    ads.filter((a) => norm(a.keyword).includes(k)).forEach((a) => add(a, 'ad'));
    if (byKey.size < 15) {
      const [nv, gg] = await Promise.all([fetchNaverSuggest(keyword).catch(() => []), fetchGoogleSuggest(keyword).catch(() => [])]);
      suggest = nv.map((s) => ({ keyword: s, source: 'naver' })).concat(gg.map((s) => ({ keyword: s, source: 'google' })));
    }
  }

  // 자동완성 후보의 검색량을 5개씩 조회 (최대 3번)
  const cand = [];
  const seen = new Set([k, ...byKey.keys()]);
  suggest.forEach((s) => { const n = norm(s.keyword); if (!seen.has(n)) { seen.add(n); cand.push(s); } });
  const batches = [];
  for (let i = 0; i < Math.min(cand.length, 15); i += 5) batches.push(cand.slice(i, i + 5));
  const results = await Promise.all(batches.map((b) => fetchSearchAd(b.map((x) => x.keyword), env).catch(() => [])));
  const vol = new Map();
  results.flat().forEach((a) => vol.set(norm(a.keyword), a));
  cand.slice(0, 15).forEach((s) => {
    const a = vol.get(norm(s.keyword));
    if (a) add({ ...a, keyword: s.keyword }, s.source);
  });

  // 검색광고 연관어 중 키워드를 포함하지 않는 것은 자리가 남을 때만
  if (engine !== 'google' && byKey.size < 10) {
    ads.filter((a) => !norm(a.keyword).includes(k)).sort((a, b) => b.total - a.total).forEach((a) => add(a, 'ad'));
  }
  return [...byKey.values()].sort((a, b) => b.total - a.total).slice(0, RELATED_MAX);
}

export async function analyzeKeyword(rawKeyword, env, engine = 'naver') {
  const keyword = String(rawKeyword || '').trim().replace(/\s+/g, ' ');
  const kwNoSpace = keyword.replace(/\s+/g, '');
  if (!keyword) return { status: 400, body: { success: false, error: '키워드를 입력해 주세요.' } };
  if (keyword.length > 40) return { status: 400, body: { success: false, error: '키워드가 너무 깁니다.' } };

  const [ads, recentMain, blogTop, news] = await Promise.all([
    fetchSearchAd(kwNoSpace, env),
    fetchRecentPosts(keyword, env),
    hubSearch('blog', keyword, env, { display: 10, sort: 'sim' }),
    hubSearch('news', keyword, env, { display: 5, sort: 'date' }).catch(() => ({ items: [] })),
  ]);

  const main = ads.find((a) => norm(a.keyword) === norm(keyword)) || { keyword, pc: 0, mobile: 0, total: 0 };
  const blogCount = recentMain.total;
  const mainRecent = recentTitleCount(recentMain.items, keyword);

  // 연관 키워드마다 최신순 100개 1번 조회 → 문서수(total) + 최근 30일 발행을 함께 얻습니다.
  const related = await collectRelated(keyword, engine, ads, env);
  const detail = await Promise.all(related.map((r) =>
    hubSearch('blog', r.keyword, env, { display: 100, sort: 'date' }).catch(() => null)));
  const relatedOut = related.map((r, i) => {
    const j = detail[i];
    const bc = j ? Number(j.total) || 0 : null;
    const rec = j ? recentTitleCount(j.items || [], r.keyword) : null;
    return {
      keyword: r.keyword,
      pc: r.pc,
      mobile: r.mobile,
      total: r.total,
      under10: !!r.under10,
      source: r.source,
      blogCount: bc,
      ratio: bc == null || !r.total ? null : Number((bc / r.total).toFixed(2)),
      competition: bc == null ? '-' : competitionOf(bc, r.total),
      golden: bc == null ? false : isGolden(bc, r.total),
      recent30: rec ? rec.count : null,
      recentApprox: rec ? rec.approx : false,
      grade: rec ? gradeOf(r.total, rec.count) : null,
      opportunity: rec ? opportunityOf(r.total, rec.count) : null,
      level: rec ? levelOf(rec.count) : null,
    };
  });

  const top = (blogTop.items || []).map((it, i) => ({
    rank: i + 1,
    title: stripTags(it.title),
    blogger: it.bloggername,
    link: it.link,
    postdate: it.postdate,
    ageDays: postdateToAgeDays(it.postdate),
  }));
  const ages = top.map((t) => t.ageDays).filter((v) => v != null);

  return {
    status: 200,
    body: {
      success: true,
      engine,
      keyword,
      pc: main.pc,
      mobile: main.mobile,
      total: main.total,
      blogCount,
      ratio: main.total ? Number((blogCount / main.total).toFixed(2)) : null,
      competition: competitionOf(blogCount, main.total),
      golden: isGolden(blogCount, main.total),
      recent30: mainRecent.count,
      recentApprox: mainRecent.approx,
      grade: gradeOf(main.total, mainRecent.count),
      opportunity: opportunityOf(main.total, mainRecent.count),
      publish: monthlyPublishOf(recentMain.items, blogCount),
      avgAgeDays: ages.length ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null,
      blogTop: top,
      news: (news.items || []).map((n) => ({ title: stripTags(n.title), link: n.originallink || n.link, pubDate: n.pubDate })),
      related: relatedOut,
      measuredAt: new Date().toISOString(),
    },
  };
}

/* ---------- 거미줄치기: 연결 키워드 경쟁도 · 기사 근거 ---------- */

const COMPETE_MAX = 10; // 키워드 1개당 블로그 검색 2번 + 검색량 2번 → 요청 1번에 외부 호출 22번
// 상위 글 블로거 이름이 이런 말로 끝나거나 들어가면 공식 블로그로 봅니다 (공식 자료가 위를 막고 있는지 판단)
const OFFICIAL_RE = /(대한민국|정책브리핑|정부|청와대|부$|처$|청$|위원회|공단|공사|진흥원|재단|시청|군청|구청|도청|시$|군$|구$|공식|보건소|교육청|경찰|소방)/;

function verdictOf(m) {
  if (m.blogCount === 0 || m.titleMatch <= 3) return { code: 'empty', label: '빈집' };
  if (m.officialTop >= 4) return { code: 'official', label: '공식 자료가 위 차지' };
  // 제목 경쟁이 적거나, 중간 정도라도 상위 10개에 2주 안 새 글이 3개 이상 보이면(새 글이 올라가는 키워드) 진입 가능
  if (m.titleMatch <= 15 || (m.titleMatch <= 40 && m.freshTop >= 3)) return { code: 'open', label: '진입 가능' };
  return { code: 'hard', label: '경쟁 많음' };
}

export async function spiderCompete(rawList, env) {
  const list = [...new Set(String(rawList || '').split('|').map((k) => k.trim().replace(/\s+/g, ' ')).filter((k) => k && k.length <= 40))].slice(0, COMPETE_MAX);
  if (!list.length) return { status: 400, body: { success: false, error: '키워드를 넣어 주세요.' } };
  if (!hasHubKeys(env)) return { status: 503, body: { success: false, error: '블로그 검색 키가 없어 경쟁도를 잴 수 없습니다.' } };

  const hasAd = !!(env.NAVER_AD_CUSTOMER_ID && env.NAVER_AD_ACCESS_LICENSE && env.NAVER_AD_SECRET_KEY);
  const adChunks = [];
  for (let i = 0; i < list.length; i += 5) adChunks.push(list.slice(i, i + 5));
  const [ads, sims, dates] = await Promise.all([
    hasAd ? Promise.all(adChunks.map((c) => fetchSearchAd(c, env).catch(() => []))).then((a) => a.flat()) : Promise.resolve([]),
    Promise.all(list.map((k) => hubSearch('blog', k, env, { display: 100, sort: 'sim' }).catch(() => null))),
    Promise.all(list.map((k) => hubSearch('blog', k, env, { display: 100, sort: 'date' }).catch(() => null))),
  ]);

  const items = list.map((keyword, i) => {
    const sim = sims[i];
    if (!sim) return { keyword, error: true };
    const k = norm(keyword);
    const top = sim.items || [];
    const top10 = top.slice(0, 10);
    const ages = top10.map((it) => postdateToAgeDays(it.postdate)).filter((v) => v != null);
    const ad = ads.find((a) => norm(a.keyword) === k);
    const rec = dates[i] ? recentTitleCount(dates[i].items || [], keyword) : null;
    const m = {
      keyword,
      volume: ad ? ad.total : (hasAd ? 0 : null),
      under10: ad ? !!ad.under10 : false,
      blogCount: Number(sim.total) || 0,
      titleMatch: top.filter((it) => norm(stripTags(it.title)).includes(k)).length,
      sampled: top.length,
      avgAgeDays: ages.length ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null,
      freshTop: ages.filter((a) => a <= 14).length,
      officialTop: top10.filter((it) => OFFICIAL_RE.test(String(it.bloggername || '').trim())).length,
      recent30: rec ? rec.count : null,
    };
    m.verdict = verdictOf(m);
    return m;
  });
  return { status: 200, body: { success: true, items, measuredAt: new Date().toISOString() } };
}

export async function spiderFacts(rawKeyword, env) {
  const keyword = String(rawKeyword || '').trim().replace(/\s+/g, ' ');
  if (!keyword || keyword.length > 30) return { status: 400, body: { success: false, error: '키워드를 확인해 주세요.' } };
  if (!hasHubKeys(env)) return { status: 503, body: { success: false, error: '뉴스 검색 키가 없습니다.' } };
  const [sim, recent] = await Promise.all([
    hubSearch('news', keyword, env, { display: 30, sort: 'sim' }).catch(() => ({ items: [] })),
    hubSearch('news', keyword, env, { display: 20, sort: 'date' }).catch(() => ({ items: [] })),
  ]);
  const seen = new Set();
  const news = [];
  (recent.items || []).concat(sim.items || []).forEach((n) => {
    const link = n.originallink || n.link;
    if (seen.has(link)) return;
    seen.add(link);
    let source = '';
    try { source = new URL(link).hostname.replace(/^www\./, ''); } catch { /* 주소가 이상하면 출처 생략 */ }
    news.push({ title: stripTags(n.title), description: stripTags(n.description), link, source, pubDate: n.pubDate });
  });
  const { facts, schedule, draft } = extractFacts(news, keyword);
  return {
    status: 200,
    body: {
      success: true,
      keyword,
      facts,
      schedule,
      draft,
      news: news.slice(0, 3).map(({ title, link, source, pubDate }) => ({ title, link, source, pubDate })),
      measuredAt: new Date().toISOString(),
    },
  };
}

/* ---------- 데이터랩: 검색 추이 · 성별 · 연령 ---------- */

const ANCHOR = '날씨'; // 성별·연령 비교용 기준 키워드 (누구나 고르게 찾는 말)
const AGE_GROUPS = [
  { label: '10대', ages: ['2'] },
  { label: '20대', ages: ['3', '4'] },
  { label: '30대', ages: ['5', '6'] },
  { label: '40대', ages: ['7', '8'] },
  { label: '50대', ages: ['9', '10'] },
  { label: '60대+', ages: ['11'] },
];


// 네이버가 데이터랩 신규 이용을 NAVER API HUB로 옮겨서, HUB 키(검색 API와 같은 키)를 먼저 씁니다.
// HUB 키가 없을 때만 예전 개발자센터(openapi.naver.com) 키로 호출합니다.
const hasHubKeys = (env) => !!(env.NAVER_HUB_CLIENT_ID && env.NAVER_HUB_CLIENT_SECRET);
const hasLegacyDatalabKeys = (env) => !!(env.NAVER_DATALAB_CLIENT_ID && env.NAVER_DATALAB_CLIENT_SECRET);

async function datalab(body, env) {
  const hub = hasHubKeys(env);
  const res = await fetch(hub ? 'https://naverapihub.apigw.ntruss.com/search-trend/v1/search' : 'https://openapi.naver.com/v1/datalab/search', {
    method: 'POST',
    headers: hub
      ? { 'Content-Type': 'application/json', 'X-NCP-APIGW-API-KEY-ID': env.NAVER_HUB_CLIENT_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_HUB_CLIENT_SECRET }
      : { 'Content-Type': 'application/json', 'X-Naver-Client-Id': env.NAVER_DATALAB_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_DATALAB_CLIENT_SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try { const e = await res.json(); detail = [e.errorCode, e.errorMessage].filter(Boolean).join(' '); } catch (_) { /* 본문 없음 */ }
    throw new Error(`데이터랩 API 오류 (${res.status}${detail ? ` · ${detail}` : ''})`);
  }
  return res.json();
}

// 같은 요청 안의 [키워드, 기준어] 비율 → 키워드 검색 비중 (데이터랩은 요청마다 최댓값을 100으로 맞추므로 기준어로 나눔)
function shareVsAnchor(json) {
  const sum = (g) => (g && g.data ? g.data.reduce((s, d) => s + (d.ratio || 0), 0) : 0);
  const [t, a] = json.results || [];
  const at = sum(a);
  return at ? sum(t) / at : 0;
}

export async function keywordInsight(rawKeyword, env) {
  const keyword = String(rawKeyword || '').trim().replace(/\s+/g, ' ');
  if (!keyword) return { status: 400, body: { success: false, error: '키워드를 입력해 주세요.' } };
  if (!hasHubKeys(env) && !hasLegacyDatalabKeys(env)) {
    return { status: 200, body: { success: true, available: false, keyword } };
  }
  const end = Date.now() - DAY; // 데이터랩은 어제까지
  const startYear = ymd(end - 364 * DAY);
  const start30 = ymd(end - 29 * DAY);
  const endD = ymd(end);
  const pair = { keywordGroups: [{ groupName: 'k', keywords: [keyword] }, { groupName: 'a', keywords: [ANCHOR] }] };

  const [trend, male, female, ...ageRes] = await Promise.all([
    datalab({ startDate: startYear, endDate: endD, timeUnit: 'date', keywordGroups: [{ groupName: 'k', keywords: [keyword] }] }, env),
    datalab({ startDate: start30, endDate: endD, timeUnit: 'month', gender: 'm', ...pair }, env).catch(() => null),
    datalab({ startDate: start30, endDate: endD, timeUnit: 'month', gender: 'f', ...pair }, env).catch(() => null),
    ...AGE_GROUPS.map((g) => datalab({ startDate: start30, endDate: endD, timeUnit: 'month', ages: g.ages, ...pair }, env).catch(() => null)),
  ]);

  const daily = ((trend.results && trend.results[0] && trend.results[0].data) || []).map((d) => ({ date: d.period, ratio: d.ratio }));

  let gender = null;
  if (male && female) {
    const m = shareVsAnchor(male);
    const f = shareVsAnchor(female);
    if (m + f > 0) gender = { male: Math.round((m / (m + f)) * 100), female: 100 - Math.round((m / (m + f)) * 100) };
  }
  let ages = null;
  const av = ageRes.map((r) => (r ? shareVsAnchor(r) : 0));
  const asum = av.reduce((s, v) => s + v, 0);
  if (asum > 0) ages = AGE_GROUPS.map((g, i) => ({ label: g.label, pct: Number(((av[i] / asum) * 100).toFixed(1)) }));

  return {
    status: 200,
    body: { success: true, available: true, keyword, anchor: ANCHOR, daily, gender, ages, measuredAt: new Date().toISOString() },
  };
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    const json = { ...cors, 'Content-Type': 'application/json; charset=utf-8' };
    const reply = async (fn, maxAge) => {
      try {
        const { status, body } = await fn();
        return new Response(JSON.stringify(body), { status, headers: { ...json, 'Cache-Control': `public, max-age=${maxAge}` } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message || '분석 중 오류가 발생했습니다.' }), { status: 502, headers: json });
      }
    };
    const q = url.searchParams.get('q');

    if (url.pathname === '/api/spider') return reply(() => buildSpiderSet(q), 600);
    if (url.pathname === '/api/spider/compete') return reply(() => spiderCompete(url.searchParams.get('k'), env), 21600);
    if (url.pathname === '/api/spider/facts') return reply(() => spiderFacts(q, env), 3600);
    if (url.pathname === '/api/keyword/insight') return reply(() => keywordInsight(q, env), 3600);
    if (url.pathname === '/api/youtube/viral') {
      const p = url.searchParams;
      return reply(() => searchViral({ q, region: p.get('region'), period: p.get('period'), sort: p.get('sort'), format: p.get('format') }), 600);
    }
    if (url.pathname === '/api/keyword') {
      const engine = url.searchParams.get('engine') === 'google' ? 'google' : 'naver';
      return reply(() => analyzeKeyword(q, env, engine), 300);
    }
    return new Response(JSON.stringify({ success: false, error: 'not found' }), { status: 404, headers: json });
  },
};
