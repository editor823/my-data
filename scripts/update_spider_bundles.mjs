/**
 * 거미줄치기 추천 묶음 생성 (scripts/update_spider_bundles.mjs)
 *
 * 하는 일
 *  1) 최근 정부 정책·지원금 뉴스 제목에서 "신청·지급 일정이 있는" 정책 이름을 뽑습니다.
 *  2) 네이버 자동완성에 실제로 연관 검색어가 붙는지 확인합니다 (= 사람들이 검색하는 주제).
 *  3) 검색광고 키가 있으면 월 검색량으로 정렬합니다.
 *  4) 상위 10개를 메인 키워드로 잡고, 각각 거미줄치기 세트(B·C·예비)를 만들어 저장합니다.
 *
 * 저장: data/spider_bundles.json, data/spider_bundles.js (window.SPIDER_BUNDLES)
 * 주기: 사흘(72시간)마다 새로 만듭니다. 그 사이에 실행되면 건너뜁니다. --force 로 강제 실행.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildSpiderSet, fetchNaverSuggest } from '../worker/spider-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'data', 'spider_bundles.json');
const OUT_JS = path.join(ROOT, 'data', 'spider_bundles.js');
const REFRESH_HOURS = 72;
const TOPIC_COUNT = 10;
const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

loadDotEnv();

function loadDotEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

/* ---------- 1) 정책 뉴스 수집 (구글 뉴스 RSS) ---------- */

const NEWS_QUERIES = [
  '지원금 신청 시작', '바우처 신청', '지급일 지원금', '수당 신청 접수', '장려금 신청',
  '환급 신청 기간', '정부 지원사업 신청 접수', '신청 마감 지원', '보조금 신청', '급여 신청 대상',
];

function decode(s) {
  return String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

async function fetchNews(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:7d`)}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`news ${res.status}`);
  const xml = await res.text();
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const get = (tag) => decode((block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1]);
    let title = get('title');
    const source = get('source');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    items.push({ title, link: get('link'), source, pubDate: get('pubDate') });
  }
  return items;
}

/* ---------- 2) 뉴스 제목 → 정책 이름 후보 ---------- */

const SUFFIX = /(지원금|바우처|수당|장려금|급여|환급금|환급|보조금|지원사업|이용권|누리카드|배움카드|패스|연금|적금|통장|도약계좌|저축계좌|쿠폰|상품권|감면|공제|대출|청약|장학금|보험료|위로금|정착금|격려금|소비쿠폰)$/;
const GENERIC = new Set(['지원금', '바우처', '수당', '장려금', '급여', '환급', '환급금', '보조금', '지원사업', '이용권', '패스', '연금', '적금', '통장', '쿠폰', '상품권', '감면', '공제', '대출', '청약', '장학금', '보험료',
  '정부지원금', '정부지원사업', '지원사업', '국비지원', '현금지원금', '지역지원금', '사업지원금', '행사지원금', '단체지원금', '보험', '월급여', '추가급여', '기본급여']);
const PARTICLE = /(은|는|이|가|을|를|에|에서|의|도|로|으로|와|과|만|까지|부터|및|등)$/;
const REGION = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)?[가-힣]{0,4}(특별시|광역시|특별자치시|특별자치도|시|군|구|도)$/;
const UPCOMING = /(신청|접수|지급|모집|시작|개시|마감|예정|확대|신설|오픈|발급|사전)/;

function extractCandidates(title) {
  const words = title.replace(/[“”"'‘’\[\]()<>…·,]/g, ' ').split(/\s+/).filter(Boolean);
  const found = [];
  words.forEach((raw, i) => {
    const w = raw.replace(/[^0-9A-Za-z가-힣]/g, '').replace(PARTICLE, '');
    if (!w || !SUFFIX.test(w)) return;
    let cand = w;
    // "꿈키움 바우처"처럼 꼬리말만 따로 쓴 경우 앞 단어를 붙입니다.
    if (GENERIC.has(w) && i > 0) {
      const prev = words[i - 1].replace(/[^0-9A-Za-z가-힣]/g, '').replace(PARTICLE, '');
      if (!prev || REGION.test(prev) || /\d/.test(prev) || prev.length < 2) return;
      cand = `${prev} ${w}`;
    }
    // 지역명으로 시작하면 지역을 떼어 전국 키워드로 (강릉시민생안정지원금 → 민생안정지원금)
    cand = cand.replace(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(시|도)?/, '');
    if (norm(cand).length < 4 || GENERIC.has(norm(cand))) return;
    if (/\d{2,}/.test(cand)) return;
    found.push(cand.trim());
  });
  return found;
}

function scheduleHintOf(texts) {
  const re = /(\d{1,2}월\s?\d{1,2}일(?:\s?(?:~|부터|-)\s?(?:\d{1,2}월\s?)?\d{1,2}일(?:까지)?)?|\d{1,2}일까지|\d{1,2}일부터|연중\s?신청|상시\s?신청|\d{1,2}월\s?(?:중|초|말|부터|까지))/;
  for (const t of texts) {
    const m = t.match(re);
    if (m) return m[0].replace(/\s+/g, ' ');
  }
  return '';
}

/* ---------- 3) 검색량 (검색광고 키가 있을 때만) ---------- */

async function fetchVolume(keyword) {
  const { NAVER_AD_CUSTOMER_ID: cid, NAVER_AD_ACCESS_LICENSE: lic, NAVER_AD_SECRET_KEY: sec } = process.env;
  if (!cid || !lic || !sec) return null;
  const uri = '/keywordstool';
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', sec).update(`${ts}.GET.${uri}`).digest('base64');
  const res = await fetch(`https://api.searchad.naver.com${uri}?showDetail=1&hintKeywords=${encodeURIComponent(norm(keyword))}`, {
    headers: { 'X-Timestamp': ts, 'X-API-KEY': lic, 'X-Customer': cid, 'X-Signature': sig },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const j = await res.json();
  const toN = (v) => (typeof v === 'number' ? v : 5);
  const hit = (j.keywordList || []).find((k) => norm(k.relKeyword) === norm(keyword));
  return hit ? toN(hit.monthlyPcQcCnt) + toN(hit.monthlyMobileQcCnt) : 0;
}

/* ---------- 실행 ---------- */

// 뉴스에서 후보가 모자랄 때만 쓰는, 해마다 신청 일정이 있는 정책 목록
const SEED = ['근로장려금', '에너지 바우처', '문화누리카드', '국민내일배움카드', '기초연금', '부모급여', '아동수당', '청년월세 지원', '청년도약계좌', '국가장학금', '긴급복지지원', '주거급여'];

async function main() {
  if (!FORCE && fs.existsSync(OUT_JSON)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
      const age = (Date.now() - new Date(prev.generatedAt).getTime()) / 3600000;
      if (age < REFRESH_HOURS - 2) {
        console.log(`[spider] 마지막 생성 ${age.toFixed(1)}시간 전 → 사흘이 지나지 않아 건너뜁니다. (--force 로 강제 실행)`);
        return;
      }
    } catch { /* 깨진 파일이면 새로 만듭니다 */ }
  }

  // 1) 뉴스
  const news = [];
  const seenTitle = new Set();
  for (const q of NEWS_QUERIES) {
    try {
      (await fetchNews(q)).forEach((n) => {
        const k = norm(n.title);
        if (seenTitle.has(k)) return;
        seenTitle.add(k);
        news.push(n);
      });
    } catch (e) { console.warn(`[spider] 뉴스 수집 실패 (${q}): ${e.message}`); }
    await sleep(400);
  }
  console.log(`[spider] 정책 뉴스 ${news.length}건`);

  // 2) 후보 집계 (서로 다른 기사 수 기준)
  const cand = new Map();
  news.filter((n) => UPCOMING.test(n.title)).forEach((n) => {
    new Set(extractCandidates(n.title)).forEach((c) => {
      const k = norm(c);
      if (!cand.has(k)) cand.set(k, { keyword: c, articles: [], sources: new Set() });
      const e = cand.get(k);
      e.articles.push(n);
      if (n.source) e.sources.add(n.source);
    });
  });
  const ranked = [...cand.values()]
    .map((e) => ({ ...e, score: e.articles.length + e.sources.size }))
    .filter((e) => e.articles.length >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
  console.log(`[spider] 후보 ${ranked.length}개: ${ranked.map((e) => `${e.keyword}(${e.articles.length})`).join(', ')}`);

  // 3) 자동완성으로 검색 수요 확인 + 검색량
  const verified = [];
  for (const e of ranked) {
    const sug = await fetchNaverSuggest(e.keyword).catch(() => []);
    const related = sug.filter((s) => norm(s).includes(norm(e.keyword)));
    if (related.length >= 3) {
      const volume = await fetchVolume(e.keyword).catch(() => null);
      verified.push({ ...e, volume, suggestCount: related.length, origin: 'news' });
    }
    await sleep(250);
  }
  if (verified.some((v) => v.volume != null)) {
    verified.sort((a, b) => (b.volume || 0) - (a.volume || 0) || b.score - a.score);
  }
  let topics = verified.slice(0, TOPIC_COUNT);

  // 모자라면 해마다 신청 일정이 있는 정책으로 채움
  for (const s of SEED) {
    if (topics.length >= TOPIC_COUNT) break;
    if (topics.some((t) => norm(t.keyword) === norm(s) || norm(t.keyword).includes(norm(s)) || norm(s).includes(norm(t.keyword)))) continue;
    topics.push({ keyword: s, articles: [], sources: new Set(), volume: await fetchVolume(s).catch(() => null), origin: 'seed' });
  }

  // 4) 주제마다 거미줄치기 세트
  const out = [];
  for (const t of topics) {
    const { body } = await buildSpiderSet(t.keyword);
    if (!body.success || body.counts.total < 5) { console.warn(`[spider] ${t.keyword}: 연결 키워드 부족, 제외`); continue; }
    const texts = t.articles.map((a) => a.title);
    out.push({
      keyword: body.keyword,
      origin: t.origin,
      volume: t.volume,
      articleCount: t.articles.length,
      schedule: scheduleHintOf(texts),
      news: t.articles.slice(0, 3).map((a) => ({ title: a.title, link: a.link, source: a.source, pubDate: a.pubDate })),
      b: body.b,
      c: body.c,
      spare: body.spare,
      counts: body.counts,
    });
    console.log(`[spider] ✓ ${body.keyword}  B${body.b.length} C${body.c.length} 예비${body.spare.length}`);
    await sleep(600);
  }

  if (out.length < 3) {
    console.error(`[spider] 묶음이 ${out.length}개뿐이라 기존 파일을 유지합니다.`);
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  const data = {
    generatedAt: now.toISOString(),
    nextRefreshAt: new Date(now.getTime() + REFRESH_HOURS * 3600000).toISOString(),
    refreshHours: REFRESH_HOURS,
    newsScanned: news.length,
    topics: out,
  };
  if (DRY) { console.log(JSON.stringify(data, null, 2).slice(0, 3000)); return; }
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2));
  fs.writeFileSync(OUT_JS, `/* 자동 생성: scripts/update_spider_bundles.mjs (사흘마다) */\nwindow.SPIDER_BUNDLES = ${JSON.stringify(data)};\n`);
  console.log(`[spider] 저장 완료: 묶음 ${out.length}개`);
}

main().catch((e) => { console.error('[spider] 실패:', e); process.exitCode = 1; });
