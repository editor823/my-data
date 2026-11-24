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

module.exports = { collectHomefeedTopics, extractKeywords, tokenize };

if (require.main === module) {
  collectHomefeedTopics().catch(err => {
    console.error('⚠️ 주제별 홈판 키워드 수집 오류:', err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}
