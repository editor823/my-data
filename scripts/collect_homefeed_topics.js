/**
 * 네이버 블로그 32개 주제별 홈판 키워드 수집기
 *
 * 연예·방송·스포츠에 쏠린 기존 홈판 레이더를 보완하기 위해,
 * 네이버 블로그 공식 주제 분류(4개 대분류 · 32개 주제)의 주제별 최신 글을 모아
 * 제목에서 많이 겹치는 키워드를 주제마다 뽑아낸다.
 *
 * 데이터 출처 (네이버 블로그 홈 > 주제별 보기에서 쓰는 공개 엔드포인트):
 *   - 주제 목록 : https://section.blog.naver.com/ajax/DirectoryList.naver
 *   - 주제별 글 : https://section.blog.naver.com/ajax/DirectoryPostList.naver?directorySeq={seq}&pageNo={n}
 *
 * 출력: data/homefeed_topics_data.js  (window.HOMEFEED_TOPICS_DATA = {...})
 *
 * 단독 실행: node scripts/collect_homefeed_topics.js
 * 모듈 사용: require('./collect_homefeed_topics').collectHomefeedTopics()
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const BASE = 'https://section.blog.naver.com';
const MAX_PAGES = 10;          // 주제당 페이지 수 (페이지당 10개 글 → 주제당 최대 100개)
const WINDOW_HOURS = 24 * 7;   // 주제 큐레이션 목록은 시간순이 아니므로 최근 7일 글을 모으고 최신일수록 가중치
const CONCURRENCY = 2;         // 동시에 수집할 주제 수 (높이면 네이버가 429로 막음)
const KEYWORDS_PER_TOPIC = 15;
const POSTS_PER_TOPIC = 6;
const SAMPLES_PER_KEYWORD = 2;

// 네이버 응답이 비었을 때 쓰는 주제 목록 (2026-11 기준 DirectoryList 응답과 동일)
const FALLBACK_DIRECTORIES = [
  { seq: 1, name: '엔터테인먼트·예술', topics: [[5, '문학·책'], [6, '영화'], [8, '미술·디자인'], [7, '공연·전시'], [11, '음악'], [9, '드라마'], [12, '스타·연예인'], [13, '만화·애니'], [10, '방송']] },
  { seq: 2, name: '생활·노하우·쇼핑', topics: [[14, '일상·생각'], [15, '육아·결혼'], [16, '반려동물'], [17, '좋은글·이미지'], [18, '패션·미용'], [19, '인테리어·DIY'], [20, '요리·레시피'], [21, '상품리뷰'], [36, '원예·재배']] },
  { seq: 3, name: '취미·여가·여행', topics: [[22, '게임'], [23, '스포츠'], [24, '사진'], [25, '자동차'], [26, '취미'], [27, '국내여행'], [28, '세계여행'], [29, '맛집']] },
  { seq: 4, name: '지식·동향', topics: [[30, 'IT·컴퓨터'], [31, '사회·정치'], [32, '건강·의학'], [33, '비즈니스·경제'], [35, '어학·외국어'], [34, '교육·학문']] }
];

// 제목에 흔하지만 키워드로는 의미 없는 말
const STOPWORDS = new Set([
  '후기', '추천', '방법', '정리', '총정리', '꿀팁', '이유', '오늘', '진짜', '정말', '너무', '완전', '최신', '공개',
  '하는', '하기', '하고', '있는', '없는', '되는', '위한', '대한', '같은', '이런', '그냥', '역시', '바로', '모두',
  '어디', '언제', '누구', '무엇', '어떻게', '얼마', '가능', '사용', '이용', '확인', '비교', '소개', '내용', '사람',
  '이야기', '알아보기', '알아보자', '알아봤어요', '포함', '기준', '관련', '주의', '필수', '모음', '리스트', '시간',
  '그리고', '하지만', '때문', '이번', '지금', '요즘', '처음', '마지막', '다시', '가장', '많이', '조금', '함께',
  '네이버', '블로그', '포스팅', '일상', '기록', '리뷰', '솔직', '솔직후기', '내돈내산', '실제', '결과', '총', '편',
  '정보', '아이', '우리', '나의', '하나', '만에', '이거', '저거', '보는', '보세요', '했는데', '먹고', '챙기는', '매일', '직접',
  '달라진', '사람에게', '시작', '변경', '신규', '일정', '가격', '논란', '화제', '근황', '공유', '마음', '시대', '방문',
  '있다', '없다', '했다', '된다', '한다', '이다', '아니', '뭐가', '왜', '것', '수', '등', '및', '더', '또', '잘',
  'the', 'and', 'for', 'with', 'vs'
]);

// 한글 단어 끝에 붙는 조사 (긴 것부터 검사)
const PARTICLES = ['에서는', '으로는', '에게서', '까지는', '이라도', '이라면', '에서', '으로', '에게', '까지', '부터', '처럼',
  '보다', '이랑', '하고', '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '도', '만', '랑'];

function stripParticle(word) {
  if (!/[가-힣]$/.test(word)) return word;
  for (const p of PARTICLES) {
    if (word.length - p.length >= 2 && word.endsWith(p)) return word.slice(0, -p.length);
  }
  return word;
}

// 날짜·회차·수량처럼 주제와 무관하게 어디에나 붙는 말 (11월, 24일, 2026년, 넷째주, 3가지 …)
const NOISE_RE = /^(\d+(년|월|일|주|주차|시|분|초|개|가지|곳|명|원|만원|억|회|화|탄|기|곡|위|편|차|번|살|세|kg|cm)?|[첫둘셋넷다섯]째주|이번주|다음주|지난주|올해|내년|작년|오늘|내일|어제|주말|평일|이렇게|저렇게|그렇게|좋은|좋아|나쁜|어떤|무슨)$/i;

function isNoise(t) {
  if (t.length < 2) return true;
  if (STOPWORDS.has(t.toLowerCase())) return true;
  if (NOISE_RE.test(t)) return true;
  if (/^[A-Za-z]+$/.test(t) && t.length < 3) return true; // in, of, my …
  if (/^[가-힣]{1,2}는$/.test(t)) return true; // 읽는, 보는, 먹는 같은 관형형
  if (/[가-힣](는데|세요|어요|아요|해요|했다|한다|하는|되는|했던|하던|해서|하면|니다)$/.test(t)) return true; // 서술어 조각
  return false;
}

function rawTokens(title) {
  return String(title || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .split(/[^0-9A-Za-z가-힣]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

// 조사 떼기는 떼고 남은 말이 다른 제목에 단독으로도 나올 때만 적용한다.
// (나는솔로→나는솔, 닌텐도→닌텐, 고양이→고양 같은 오분리 방지)
function buildNormalizer(titles) {
  const vocab = new Set();
  titles.forEach(t => rawTokens(t).forEach(w => vocab.add(w)));
  return w => {
    const stem = stripParticle(w);
    return stem !== w && vocab.has(stem) ? stem : w;
  };
}

function tokenize(title, normalize = w => w) {
  return rawTokens(title).map(normalize).filter(t => !isNoise(t));
}

function getText(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer': `${BASE}/ThemePost.naver`,
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: timeoutMs
    }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// 네이버 ajax 응답은 앞에 ")]}'," 보호 문자열이 붙어 있다
async function getNaverJson(url, attempts = 4) {
  let text;
  for (let i = 1; ; i++) {
    try { text = await getText(url); break; }
    catch (e) {
      if (i >= attempts) throw e;
      await sleep(1500 * i); // 429·timeout 이면 잠시 쉬었다 재시도
    }
  }
  const start = text.indexOf('{');
  if (start < 0) throw new Error('JSON 아님');
  return JSON.parse(text.slice(start));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadDirectories() {
  try {
    const j = await getNaverJson(`${BASE}/ajax/DirectoryList.naver`);
    const groups = (j.result || []).map(g => ({
      seq: g.seq,
      name: g.name,
      topics: (g.directoryList || []).map(d => [d.seq, d.name])
    })).filter(g => g.topics.length);
    if (groups.reduce((n, g) => n + g.topics.length, 0) >= 20) return groups;
  } catch (e) {
    console.warn('  ⚠️ 주제 목록 수신 실패, 내장 목록 사용:', e.message);
  }
  return FALLBACK_DIRECTORIES;
}

async function fetchTopicPosts(seq) {
  const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const posts = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let list;
    try {
      const j = await getNaverJson(`${BASE}/ajax/DirectoryPostList.naver?directorySeq=${seq}&pageNo=${page}`);
      list = (j.result && j.result.postList) || [];
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
    if (!list.length) break;
    let added = 0;
    for (const p of list) {
      const key = `${p.domainIdOrBlogId}/${p.logNo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (p.addDate && p.addDate < cutoff) continue;
      posts.push(p);
      added++;
    }
    if (!added && page >= 3) break; // 최근 글이 더 이상 안 나오면 중단
    await sleep(250);
  }
  return posts;
}

function slimPost(p, withThumb = true) {
  const thumb = withThumb && Array.isArray(p.thumbnails) && p.thumbnails[0] ? p.thumbnails[0].url : '';
  return {
    title: String(p.title || '').trim(),
    link: p.postUrl || `https://blog.naver.com/${p.domainIdOrBlogId}/${p.logNo}`,
    blogName: p.nickname || '',
    at: p.addDate ? new Date(p.addDate).toISOString() : null,
    likes: Number(p.sympathyCnt) || 0,
    comments: Number(p.commentCnt) || 0,
    thumb
  };
}

// 제목들에서 주제 키워드 추출: 단어·두 단어 묶음이 몇 개 글에 등장했는지(문서 빈도) + 반응 수로 점수화
function extractKeywords(posts, topicName = '') {
  const stats = new Map();
  const now = Date.now();
  const normalize = buildNormalizer(posts.map(p => p.title));
  // 주제 이름 자체(드라마 주제의 '드라마', 맛집 주제의 '맛집')는 키워드에서 뺀다
  const topicWords = new Set(String(topicName).split(/[·\s]+/).filter(Boolean));

  posts.forEach((p, idx) => {
    const tokens = tokenize(p.title, normalize).filter(t => !topicWords.has(t));
    const terms = new Set(tokens);
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] !== tokens[i + 1]) terms.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    const engagement = (Number(p.sympathyCnt) || 0) + (Number(p.commentCnt) || 0) * 2;
    const ageH = p.addDate ? (now - p.addDate) / 3600000 : WINDOW_HOURS;
    const fresh = ageH <= 24 ? 2 : ageH <= 72 ? 1 : 0;
    for (const t of terms) {
      let s = stats.get(t);
      if (!s) { s = { keyword: t, posts: 0, blogs: new Set(), engagement: 0, recent6h: 0, fresh: 0, idx: [] }; stats.set(t, s); }
      if (s.blogs.has(p.domainIdOrBlogId)) continue; // 같은 블로거의 반복 글은 한 번만
      s.blogs.add(p.domainIdOrBlogId);
      s.posts++;
      s.fresh += fresh;
      s.engagement += engagement;
      if (ageH <= 6) s.recent6h++;
      s.idx.push(idx);
    }
  });

  let list = [...stats.values()]
    .filter(s => s.posts >= 2)
    .map(s => {
      const isPhrase = s.keyword.includes(' ');
      const score = s.posts * 10 + s.fresh * 3 + s.recent6h * 4 + Math.round(Math.sqrt(s.engagement)) + (isPhrase ? 6 : 0);
      return { ...s, isPhrase, score };
    })
    .sort((a, b) => b.score - a.score || b.posts - a.posts);

  // 두 단어 묶음이 단어와 거의 같은 글을 덮으면 단어는 빼서 중복을 줄인다
  const phrases = list.filter(s => s.isPhrase);
  list = list.filter(s => {
    if (s.isPhrase) return true;
    return !phrases.some(ph => ph.keyword.split(' ').includes(s.keyword) && ph.posts >= s.posts * 0.7);
  });
  // 한쪽이 다른 쪽을 포함하는 묶음끼리도 정리 (예: "김장 김치" vs "김장")
  const picked = [];
  for (const s of list) {
    if (picked.some(p => p.keyword.replace(/\s/g, '') === s.keyword.replace(/\s/g, ''))) continue;
    picked.push(s);
    if (picked.length >= KEYWORDS_PER_TOPIC) break;
  }

  return picked.map(s => ({
    keyword: s.keyword,
    posts: s.posts,
    recent6h: s.recent6h,
    engagement: s.engagement,
    score: s.score,
    samples: s.idx.slice(0, SAMPLES_PER_KEYWORD).map(i => slimPost(posts[i], false))
  }));
}

async function runPool(items, worker, limit) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}


// =========================================================
// 키워드 지표: 검색량(PC·모바일) · 블로그 문서수 · 경쟁 · 등급
//  - 검색량: 네이버 검색광고 API (NAVER_AD_CUSTOMER_ID / NAVER_AD_ACCESS_LICENSE / NAVER_AD_SECRET_KEY)
//  - 문서수·최근 30일 발행: 네이버 API HUB 블로그 검색(최신순 100개) (NAVER_HUB_CLIENT_ID / NAVER_HUB_CLIENT_SECRET)
//  계산 기준은 사이트 키워드 분석기(worker/keyword-worker.mjs)와 같다: 경쟁·발행 추천(S/A/B/C)·기회지수·난이도
//  키가 없으면 그 지표만 비워 두고 나머지는 그대로 만든다. 키 값은 로그에 남기지 않는다.
//  같은 키워드는 24시간 동안 data/homefeed_keyword_stats.json 에 저장한 값을 다시 쓴다(호출 수 절약).
// =========================================================
const STATS_FILE = path.join(__dirname, '..', 'data', 'homefeed_keyword_stats.json');
const STATS_TTL_MS = 24 * 3600 * 1000;

function readEnv() {
  const env = { ...process.env };
  for (const name of ['.env.local', '.env']) {
    try {
      for (const line of fs.readFileSync(path.join(__dirname, '..', name), 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
        if (m && !env[m[1]]) env[m[1]] = m[2];
      }
    } catch (_) { /* 파일 없음 */ }
  }
  return env;
}

function httpsJson(options) {
  return new Promise((resolve, reject) => {
    const req = https.request({ timeout: 15000, ...options }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('JSON 아님')); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

const squash = k => String(k).replace(/\s+/g, '').toUpperCase();
const qc = v => (typeof v === 'number' ? v : 5); // "< 10" 은 사이트 분석기와 같이 5로 계산

// 검색광고 API: 한 번에 5개까지. 실패한 묶음은 하나씩 다시 묻는다.
async function fetchVolumes(words, env) {
  const out = new Map();
  if (!env.NAVER_AD_CUSTOMER_ID || !env.NAVER_AD_ACCESS_LICENSE || !env.NAVER_AD_SECRET_KEY) {
    console.warn('  ⚠️ 검색광고 API 키가 없어 검색량을 건너뜁니다.');
    return out;
  }
  async function ask(batch) {
    const uri = '/keywordstool';
    const ts = String(Date.now());
    const sig = crypto.createHmac('sha256', env.NAVER_AD_SECRET_KEY).update(`${ts}.GET.${uri}`).digest('base64');
    const hints = batch.map(w => w.replace(/\s+/g, '')).join(',');
    const j = await httpsJson({
      hostname: 'api.searchad.naver.com',
      path: `${uri}?hintKeywords=${encodeURIComponent(hints)}&showDetail=1`,
      method: 'GET',
      headers: { 'X-Timestamp': ts, 'X-API-KEY': env.NAVER_AD_ACCESS_LICENSE, 'X-Customer': env.NAVER_AD_CUSTOMER_ID, 'X-Signature': sig }
    });
    const byKey = new Map((j.keywordList || []).map(x => [squash(x.relKeyword), x]));
    for (const w of batch) {
      const hit = byKey.get(squash(w));
      const pc = hit ? qc(hit.monthlyPcQcCnt) : 0;
      const mobile = hit ? qc(hit.monthlyMobileQcCnt) : 0;
      out.set(w, { pc, mobile, total: pc + mobile });
    }
  }
  for (let i = 0; i < words.length; i += 5) {
    const batch = words.slice(i, i + 5);
    try { await ask(batch); }
    catch (_) {
      for (const w of batch) {
        try { await ask([w]); } catch (e) { /* 검색광고가 받지 않는 말(특수문자 등) */ }
        await sleep(250);
      }
    }
    await sleep(300);
  }
  return out;
}

async function fetchBlogCounts(words, env) {
  const out = new Map();
  if (!env.NAVER_HUB_CLIENT_ID || !env.NAVER_HUB_CLIENT_SECRET) {
    console.warn('  ⚠️ 네이버 API HUB 키가 없어 문서수를 건너뜁니다.');
    return out;
  }
  await runPool(words, async w => {
    try {
      const j = await httpsJson({
        hostname: 'naverapihub.apigw.ntruss.com',
        path: `/search/v1/blog?query=${encodeURIComponent(w)}&display=100&sort=date`,
        method: 'GET',
        headers: { 'X-NCP-APIGW-API-KEY-ID': env.NAVER_HUB_CLIENT_ID, 'X-NCP-APIGW-API-KEY': env.NAVER_HUB_CLIENT_SECRET }
      });
      if (typeof j.total === 'number') out.set(w, { blogCount: j.total, ...recentTitleCount(j.items || [], w) });
    } catch (_) { /* 한 개 실패는 비워 둔다 */ }
    await sleep(120);
  }, 3);
  return out;
}

const DAY = 24 * 3600 * 1000;
const normKw = v => String(v || '').replace(/\s+/g, '').toLowerCase();
const stripTags = v => String(v || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
const postdateMs = p => (/^\d{8}$/.test(p || '') ? new Date(`${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T00:00:00+09:00`).getTime() : null);

// 최근 30일 동안 제목에 키워드가 들어간 글 수 (최신 100개 표본, 30일을 다 못 덮으면 비율로 어림)
function recentTitleCount(items, keyword) {
  const k = normKw(keyword);
  const now = Date.now();
  const dated = items.map(it => ({ t: postdateMs(it.postdate), title: normKw(stripTags(it.title)) })).filter(x => x.t != null);
  if (!dated.length) return { recent30: 0, recentApprox: false };
  const oldest = Math.min(...dated.map(x => x.t));
  const covered = Math.max(1, Math.min(30, (now - oldest) / DAY));
  const inWindow = dated.filter(x => now - x.t <= 30 * DAY && x.title.includes(k)).length;
  const approx = items.length >= 100 && covered < 30;
  return { recent30: approx ? Math.round(inWindow * (30 / covered)) : inWindow, recentApprox: approx };
}

// 검색량 등급 (사이트 황금키워드와 같은 구간)
function tierOf(total) {
  if (total >= 500000) return '레전드';
  if (total >= 100000) return '챌린저';
  if (total >= 50000) return '마스터';
  if (total >= 10000) return '전문가';
  if (total >= 2000) return '고급자';
  if (total >= 500) return '중급자';
  return '초보자';
}
// 경쟁 = 블로그 문서수 ÷ 월 검색량
function competitionOf(blogCount, total) {
  if (blogCount == null || !total) return { competition: '', competitionRatio: null };
  const r = blogCount / total;
  const competition = r < 1 ? '낮음' : r < 5 ? '보통' : r < 20 ? '높음' : '매우 높음';
  return { competition, competitionRatio: Math.round(r * 100) / 100 };
}
// 발행 추천: 최근 30일 글 1개당 월 검색수
function publishGradeOf(total, recent) {
  const spp = total / Math.max(1, recent);
  if (total >= 1000 && spp >= 50) return 'S';
  if (total >= 300 && spp >= 20) return 'A';
  if (total >= 100 && spp >= 5) return 'B';
  return 'C';
}
function opportunityOf(total, recent) {
  const vol = Math.min(1, Math.log10(Math.max(1, total)) / 4.5);
  const spp = total / Math.max(1, recent);
  const fresh = Math.min(1, Math.log10(spp + 1) / 2);
  return Math.round(100 * (0.35 * vol + 0.65 * fresh));
}
// 작성 난이도: 최근 30일 경쟁 글 수
function levelOf(recent) {
  if (recent <= 10) return '초보자';
  if (recent <= 50) return '중급자';
  if (recent <= 200) return '상급자';
  return '고수';
}

async function enrichKeywordStats(topics) {
  const env = readEnv();
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (_) { saved = {}; }
  const now = Date.now();
  const words = [...new Set(topics.flatMap(t => t.keywords.map(k => k.keyword)))];
  const fresh = w => saved[w] && now - new Date(saved[w].checkedAt).getTime() < STATS_TTL_MS;
  const needVolume = words.filter(w => !(fresh(w) && saved[w].total != null));
  const needDocs = words.filter(w => !(fresh(w) && saved[w].recent30 != null));
  console.log(`  📊 키워드 지표: 전체 ${words.length}개 · 검색량 새로 ${needVolume.length}개 · 문서수 새로 ${needDocs.length}개`);

  const volumes = await fetchVolumes(needVolume, env);
  const docs = await fetchBlogCounts(needDocs, env);
  const stamp = new Date(now).toISOString();
  for (const w of words) {
    const next = fresh(w) ? { ...saved[w] } : {};
    if (volumes.has(w)) Object.assign(next, volumes.get(w));
    if (docs.has(w)) Object.assign(next, docs.get(w));
    if (volumes.has(w) || docs.has(w)) next.checkedAt = stamp;
    if (next.checkedAt) saved[w] = next;
  }
  // 7일 지난 항목 정리
  for (const [w, st] of Object.entries(saved)) {
    if (!st.checkedAt || now - new Date(st.checkedAt).getTime() > 7 * 24 * 3600 * 1000) delete saved[w];
  }
  fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(saved), 'utf8');

  let withVolume = 0;
  let withDocs = 0;
  for (const t of topics) {
    for (const k of t.keywords) {
      const st = saved[k.keyword] || {};
      const total = st.total != null ? st.total : null;
      if (total != null) withVolume++;
      if (st.blogCount != null) withDocs++;
      const hasRecent = st.recent30 != null && total != null;
      Object.assign(k, {
        total,
        pc: st.pc != null ? st.pc : null,
        mobile: st.mobile != null ? st.mobile : null,
        blogCount: st.blogCount != null ? st.blogCount : null,
        recent30: st.recent30 != null ? st.recent30 : null,
        recentApprox: !!st.recentApprox,
        tier: total != null ? tierOf(total) : '',
        ...competitionOf(st.blogCount, total),
        publishGrade: hasRecent ? publishGradeOf(total, st.recent30) : '',
        opportunity: hasRecent ? opportunityOf(total, st.recent30) : null,
        level: st.recent30 != null ? levelOf(st.recent30) : ''
      });
    }
  }
  console.log(`  ✅ 키워드 지표 붙임: 검색량 ${withVolume}개 · 문서수 ${withDocs}개`);
}

async function collectHomefeedTopics(outPath = path.join(__dirname, '..', 'data', 'homefeed_topics_data.js')) {
  console.log('📡 네이버 블로그 32개 주제별 홈판 키워드 수집 시작...');
  const groups = await loadDirectories();
  const flat = [];
  groups.forEach(g => g.topics.forEach(([seq, name]) => flat.push({ seq, name, group: g.name, groupSeq: g.seq })));

  const topics = await runPool(flat, async t => {
    try {
      const posts = await fetchTopicPosts(t.seq);
      const keywords = extractKeywords(posts, t.name);
      const latest = [...posts]
        .sort((a, b) => ((b.sympathyCnt || 0) + (b.commentCnt || 0) * 2) - ((a.sympathyCnt || 0) + (a.commentCnt || 0) * 2))
        .slice(0, POSTS_PER_TOPIC)
        .map(slimPost);
      console.log(`  ✅ ${t.group} > ${t.name}: 글 ${posts.length}개 · 키워드 ${keywords.length}개`);
      return { ...t, postCount: posts.length, keywords, topPosts: latest };
    } catch (e) {
      console.warn(`  ⚠️ ${t.name} 수집 실패:`, e.message);
      return { ...t, postCount: 0, keywords: [], topPosts: [], error: e.message };
    }
  }, CONCURRENCY);

  const okTopics = topics.filter(t => t.keywords.length > 0).length;
  if (okTopics < 8) {
    // 대부분 실패하면 기존 파일을 덮어쓰지 않는다 (빈 화면 방지)
    console.warn(`  ⚠️ 키워드가 나온 주제가 ${okTopics}개뿐이라 기존 데이터를 유지합니다.`);
    return null;
  }

  try {
    await enrichKeywordStats(topics);
  } catch (e) {
    console.warn('  ⚠️ 키워드 지표 붙이기 실패(키워드 목록은 그대로 저장):', e.message);
  }

  const output = {
    success: true,
    source: 'naver-blog-directory',
    generatedAt: new Date().toISOString(),
    windowHours: WINDOW_HOURS,
    totalPosts: topics.reduce((n, t) => n + t.postCount, 0),
    groups: groups.map(g => ({ seq: g.seq, name: g.name, topics: g.topics.map(([seq, name]) => ({ seq, name })) })),
    topics
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `window.HOMEFEED_TOPICS_DATA = ${JSON.stringify(output)};\n`, 'utf8');
  console.log(`  💾 저장 완료: ${path.relative(path.join(__dirname, '..'), outPath)} (주제 ${okTopics}/${topics.length}, 글 ${output.totalPosts}개)`);
  return output;
}

module.exports = {
  collectHomefeedTopics, extractKeywords, tokenize,
  // 주제별 추천 키워드 수집기(collect_topic_keywords.js)가 함께 쓰는 도구
  readEnv, httpsJson, fetchBlogCounts, runPool, sleep, tierOf, FALLBACK_DIRECTORIES
};

if (require.main === module) {
  collectHomefeedTopics().catch(err => {
    console.error('⚠️ 주제별 홈판 키워드 수집 오류:', err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}
