/**
 * 거미줄치기 키워드 공통 모듈 (worker/spider-core.mjs)
 * - Cloudflare Worker, 로컬 server.js, 추천 묶음 수집 스크립트가 같은 코드를 씁니다.
 * - 키 없이 동작합니다: 네이버 자동완성, 구글 자동완성, 네이버 지식iN 검색 결과.
 *
 * 결과 구성
 *   B 계정: 검색창 연관 검색어 (네이버·구글 자동완성)  최대 7개
 *   C 계정: 지식iN 실제 질문에서 뽑은 키워드            최대 7개
 *   예비  : 남는 것                                     최대 6개
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PER_ACCOUNT = 7;
const SPARE_MAX = 6;

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function decodeEntities(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

async function getText(url, timeoutMs = 7000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ---------- 1) 검색창 연관 검색어 ---------- */

export async function fetchNaverSuggest(keyword) {
  const url = 'https://ac.search.naver.com/nx/ac?con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&q='
    + encodeURIComponent(keyword);
  const j = JSON.parse(await getText(url));
  return ((j.items && j.items[0]) || []).map((it) => tidy(it[0])).filter(Boolean);
}

export async function fetchGoogleSuggest(keyword) {
  const url = 'https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&gl=kr&q=' + encodeURIComponent(keyword);
  const j = JSON.parse(await getText(url));
  return (j[1] || []).map(tidy).filter(Boolean);
}

/* ---------- 2) 지식iN 질문 ---------- */

// 검색 결과 HTML에서 질문 제목과 원문 링크를 꺼냅니다. (docId 기준 중복 제거)
export function parseKinHtml(html) {
  const out = [];
  const seen = new Set();
  const re = /href="(https:\/\/kin\.naver\.com\/qna\/detail\.naver\?[^"]*?docId=(\d+)[^"]*)"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html))) {
    const docId = m[2];
    if (seen.has(docId)) continue;
    const title = tidy(decodeEntities(m[3]));
    if (title.length < 4) continue;
    seen.add(docId);
    const dirId = (m[1].match(/dirId=(\d+)/) || [])[1];
    out.push({ title, link: `https://kin.naver.com/qna/detail.naver?${dirId ? `dirId=${dirId}&` : ''}docId=${docId}` });
  }
  return out;
}

export async function fetchKinQuestions(keyword, pages = 2) {
  const base = 'https://search.naver.com/search.naver?ssc=tab.kin.kqna&where=kin&query=' + encodeURIComponent(keyword);
  const urls = [base];
  for (let p = 1; p < pages; p++) urls.push(`${base}&start=${p * 10 + 1}`);
  const htmls = await Promise.all(urls.map((u) => getText(u, 8000).catch(() => '')));
  const all = [];
  const seen = new Set();
  htmls.forEach((h) => parseKinHtml(h).forEach((q) => {
    if (seen.has(q.link)) return;
    seen.add(q.link);
    all.push(q);
  }));
  return all;
}

// 질문 제목 → "메인키워드 + 핵심어" 형태의 글감 키워드
const PARTICLE = /(은|는|이|가|을|를|에|에서|에게|의|도|로|으로|와|과|랑|이랑|만|까지|부터|보다|처럼|이나|나|요)$/;
const STOP = new Set([
  '질문', '질문드려요', '질문드립니다', '궁금해요', '궁금합니다', '궁금', '문의', '도와주세요', '알려주세요', '급해요', '급합니다',
  '어떻게', '어떡하나요', '어떻게해요', '왜', '혹시', '그냥', '제가', '저는', '저', '이거', '그거', '이번', '지금', '요즘', '관련', '관해',
  '해야', '하나요', '되나요', '있나요', '없나요', '인가요', '건가요', '할까요', '될까요', '맞나요', '가능한가요', '가능할까요', '가능', '방법은',
  '수', '것', '거', '때', '이미', '벌써', '아직', '미리', '바로', '먼저', '같이', '계속', '갑자기', '어떤', '무슨', '뭔가요', 'vs', '기존', '새로', '처음', '최근', '이전', '좀', '꼭', '다시', '또', '너무', '정말', '진짜', '안', '못', '네', '번', '내가', '우리', '같은', '하는', '하면', '했는데', '했어요',
]);
const VERBISH = /(나요|까요|가요|는데|는지|어요|아요|해요|습니까|니다|세요|는거|는게|는건|던데|었는데|았는데|하고|해서|해도|하면|되면|인데|이요|할지|될지|한지|된지|는데요|거든요|네요|려고|려|할때|될때|했는데|했어요|하는|되는|같아요|싶어요|싶은데|으면|있는|없는|뉴스)$/;
// "조회할", "받은", "밀린" 처럼 꾸미는 말(동사 활용형)도 거기서 끊습니다.
const VERB_STEM = /^.{1,3}(할|될|한|된|던|은|을|린|인|친|운|받|낸)$/;
const PARTICLE_HEAD = /^(은|는|이|가|을|를|에|에서|의|도|로|으로|와|과|랑|이랑|만|및)(?=\s|$)/;

// 띄어쓰기와 상관없이 메인 키워드를 찾는 정규식 ("에너지 바우처" = "에너지바우처")
function mainRegex(main) {
  const chars = norm(main).split('').map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(chars.join('\\s*'), 'i');
}

function pickWords(tokens, mainN, limit) {
  const picked = [];
  for (const raw of tokens) {
    if (picked.length >= limit) break;
    if (/\d{3,}/.test(raw) && !/(년|월|일|만원|원|cc|기)$/.test(raw)) continue;
    let w = raw.replace(/[^0-9A-Za-z가-힣]/g, '');
    if (!w) continue;
    if (VERBISH.test(w) || VERB_STEM.test(w)) break; // 서술어가 나오면 거기서 끝
    w = w.replace(PARTICLE, '').replace(/(질문|문의|궁금증)$/, '').replace(/(.{2,})시$/, '$1');
    if (w.length < 2 || STOP.has(w) || norm(w).includes(mainN) || mainN.includes(norm(w))) continue;
    picked.push(w);
  }
  return picked;
}

export function questionToKeyword(title, mainKeyword) {
  const main = tidy(mainKeyword);
  const mainN = norm(main);
  const re = mainRegex(main);
  const clauses = title.replace(/vs/gi, ' vs ').split(/[,?!.…·\n|/]|\s-\s/).map((c) => c.replace(/\[[^\]]*\]|\([^)]*\)|["'“”‘’]/g, ' ')).filter((c) => tidy(c));
  if (!clauses.length) return '';

  // 1순위: 메인 키워드가 들어간 문장에서 키워드 바로 뒤의 단어
  let picked = [];
  const withMain = clauses.find((c) => re.test(c));
  if (withMain) {
    const m = withMain.match(re);
    const after = withMain.slice(m.index + m[0].length).replace(PARTICLE_HEAD, ' ');
    picked = pickWords(tidy(after).split(' ').filter(Boolean), mainN, 2);
    if (!picked.length) picked = pickWords(tidy(withMain.slice(0, m.index)).split(' ').filter(Boolean).slice(-2), mainN, 2);
  }
  // 2순위: 메인 키워드가 없는 첫 문장의 앞쪽 단어
  if (!picked.length) picked = pickWords(tidy(clauses[0]).split(' ').filter(Boolean), mainN, 2);
  if (!picked.length) return '';
  return tidy(`${main} ${picked.join(' ')}`);
}

/* ---------- 3) 세트 만들기 ---------- */

export async function buildSpiderSet(rawKeyword) {
  const keyword = tidy(rawKeyword);
  if (!keyword) return { status: 400, body: { success: false, error: '메인 키워드를 입력해 주세요.' } };
  if (keyword.length > 30) return { status: 400, body: { success: false, error: '키워드가 너무 깁니다. (30자 이하)' } };

  const mainN = norm(keyword);
  const [nav, ggl, kin] = await Promise.all([
    fetchNaverSuggest(keyword).catch(() => []),
    fetchGoogleSuggest(keyword).catch(() => []),
    fetchKinQuestions(keyword).catch(() => []),
  ]);
  // 구글은 끝에 한 칸 띄운 질의로 한 번 더 받아 후보를 늘립니다.
  const ggl2 = await fetchGoogleSuggest(`${keyword} `).catch(() => []);

  const used = new Set([mainN]);
  const take = (kw) => {
    const n = norm(kw);
    if (!n || used.has(n) || n.length > 40) return false;
    used.add(n);
    return true;
  };

  // 검색창 연관 검색어: 네이버와 구글을 번갈아 섞고, 메인 키워드를 포함한 것 우선
  const suggest = [];
  const navL = nav.map((k) => ({ keyword: k, source: 'naver' }));
  const gglL = ggl.concat(ggl2).map((k) => ({ keyword: k, source: 'google' }));
  for (let i = 0; i < Math.max(navL.length, gglL.length); i++) {
    if (navL[i]) suggest.push(navL[i]);
    if (gglL[i]) suggest.push(gglL[i]);
  }
  const suggestNear = suggest.filter((s) => norm(s.keyword).includes(mainN));
  const suggestFar = suggest.filter((s) => !norm(s.keyword).includes(mainN));
  const suggestOut = [];
  suggestNear.concat(suggestFar).forEach((s) => { if (take(s.keyword)) suggestOut.push(s); });

  const kinOut = [];
  kin.forEach((q) => {
    const kw = questionToKeyword(q.title, keyword);
    if (kw && take(kw)) kinOut.push({ keyword: kw, source: 'kin', question: q.title, link: q.link });
  });

  const b = suggestOut.slice(0, PER_ACCOUNT);
  const c = kinOut.slice(0, PER_ACCOUNT);
  const spareSrc = [];
  const sr = suggestOut.slice(PER_ACCOUNT);
  const kr = kinOut.slice(PER_ACCOUNT);
  for (let i = 0; i < Math.max(sr.length, kr.length); i++) {
    if (sr[i]) spareSrc.push(sr[i]);
    if (kr[i]) spareSrc.push(kr[i]);
  }
  const spare = spareSrc.slice(0, SPARE_MAX);

  const all = b.concat(c, spare);
  return {
    status: 200,
    body: {
      success: true,
      keyword,
      b,
      c,
      spare,
      counts: { total: all.length, kin: all.filter((x) => x.source === 'kin').length },
      sources: { naver: nav.length, google: ggl.length + ggl2.length, kinQuestions: kin.length },
      generatedAt: new Date().toISOString(),
    },
  };
}
