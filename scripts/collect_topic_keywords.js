/**
 * 12. 주제별 키워드 수집기 (네이버 블로그 32개 주제 × 오늘 추천 키워드)
 *
 * 주제마다 대표 검색어(SEEDS)를 네이버 검색광고 연관키워드 도구에 넣어 실제로 사람들이 검색하는
 * 해결형·정보형 키워드를 넓게 모은 뒤, 블로그 문서수를 붙여 "검색은 꾸준한데 문서는 덜 쌓인" 키워드를
 * 주제당 최대 10개 고른다. 화면은 js/topic_keywords.js 가 그린다.
 *
 * 출력: data/topic_keywords_data.js  (window.TOPIC_KEYWORDS_DATA = {...})
 * 키  : NAVER_AD_* (검색량·연관키워드, 필수) · NAVER_HUB_* (문서수, 없으면 문서수 칸만 비움)
 * 주기: 자동 수집기는 3시간마다 돌지만 이 수집은 20시간에 한 번만 새로 만든다(API 호출 절약).
 *
 * 단독 실행: node scripts/collect_topic_keywords.js [--force]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  readEnv, httpsJson, fetchBlogCounts, sleep, tierOf, FALLBACK_DIRECTORIES
} = require('./collect_homefeed_topics');

const OUT_FILE = path.join(__dirname, '..', 'data', 'topic_keywords_data.js');
const REFRESH_MS = 20 * 3600 * 1000;
const PER_TOPIC = 10;          // 화면에 보여줄 추천 수
const CANDIDATES = 22;         // 문서수를 조회할 후보 수 (주제당)
const MIN_VOLUME = 300;
const MAX_VOLUME = 300000;

// 주제별 대표 검색어: 연중 꾸준히 찾는 '해결형' 위주. 앞 단어가 연관 키워드를 거르는 핵심어가 된다.
const SEEDS = {
  '문학·책': ['독후감 쓰는법', '전자책 추천', '밀리의서재 요금', '도서관 책 대출', '베스트셀러 순위', '독서모임', '책 추천'],
  '영화': ['넷플릭스 영화 추천', 'CGV 할인', '메가박스 할인', '롯데시네마 할인', '영화 예매', '영화 결말'],
  '미술·디자인': ['캔바 사용법', '무료 폰트', '아이패드 드로잉', '그림 독학', '포토샵 무료', '로고 만들기'],
  '공연·전시': ['전시회 추천', '뮤지컬 예매', '인터파크 티켓', '콘서트 티켓팅', '서울 전시회', '연극 추천'],
  '음악': ['멜론 이용권', '유튜브 뮤직 가격', '피아노 독학', '노래방 인기곡', '기타 코드', '스포티파이 요금'],
  '드라마': ['넷플릭스 드라마 추천', '티빙 요금제', '디즈니플러스 요금', '드라마 몇부작', '쿠팡플레이 요금', '드라마 결말'],
  '스타·연예인': ['콘서트 티켓팅', '팬클럽 가입', '앨범 예약', '팬미팅 티켓팅', '위버스 멤버십', '아이돌 생일'],
  '만화·애니': ['웹툰 추천', '애니 추천', '라프텔 요금', '카카오페이지 캐시', '만화카페', '애니 순위'],
  '방송': ['티빙 요금제', '웨이브 요금제', '쿠팡플레이 요금', '예능 다시보기', 'KBS 다시보기', '예능 추천'],
  '일상·생각': ['다이어리 쓰는법', '가계부 쓰는법', '미라클모닝', '자기계발 습관', '미니멀라이프', '버킷리스트'],
  '육아·결혼': ['부모급여', '아동수당', '첫만남이용권', '출산지원금', '결혼식 비용', '신혼부부 대출', '어린이집 입소'],
  '반려동물': ['강아지 예방접종', '동물등록 방법', '고양이 사료 추천', '펫보험 비교', '강아지 산책', '고양이 중성화 비용'],
  '좋은글·이미지': ['좋은글귀', '아침인사 이미지', '명언 모음', '생일축하 문구', '감성 글귀', '새해 인사말'],
  '패션·미용': ['패딩 세탁', '셀프 염색', '겨울 코디', '선크림 추천', '피부 관리', '운동화 세탁'],
  '인테리어·DIY': ['곰팡이 제거', '결로 방지', '셀프 인테리어', '수납 정리', '벽지 셀프 시공', '욕실 청소'],
  '요리·레시피': ['김장 김치 담그는법', '에어프라이어 요리', '밑반찬 만들기', '다이어트 식단', '찌개 레시피', '도시락 메뉴'],
  '상품리뷰': ['가습기 추천', '전기장판 추천', '로봇청소기 추천', '쿠팡 반품', '공기청정기 추천', '전기요금 절약'],
  '원예·재배': ['다육이 키우기', '몬스테라 키우기', '화분 분갈이', '텃밭 가꾸기', '식물 영양제', '스투키 키우기'],
  '게임': ['닌텐도 스위치 게임 추천', '스팀 할인', '모바일 게임 추천', '게임 쿠폰', '롤 패치노트', '플스5 게임 추천'],
  '스포츠': ['헬스 루틴', '러닝화 추천', '마라톤 대회 일정', '홈트레이닝', '골프 입문', '등산 코스'],
  '사진': ['사진 보정 앱', '카메라 추천', '아이폰 사진 잘찍는법', '증명사진 잘나오는법', '사진 인화', '필름카메라'],
  '자동차': ['자동차보험 비교', '자동차세 연납', '엔진오일 교체주기', '타이어 교체', '전기차 보조금', '자동차 검사'],
  '취미': ['뜨개질 독학', '원데이클래스', '성인 취미', '캘리그라피', '직소퍼즐', '보드게임 추천'],
  '국내여행': ['KTX 환불', '고속버스 환불', '국내여행 추천', '숙박 할인', '제주도 렌트카', '기차 예매'],
  '세계여행': ['여권 발급', '여행자보험', '환전 방법', '일본 여행', '트래블카드', '전자여행허가'],
  '맛집': ['맛집 추천', '배달 할인', '뷔페 가격', '오마카세', '브런치 카페', '빕스 가격'],
  'IT·컴퓨터': ['윈도우 업데이트', '노트북 추천', '아이폰 업데이트', '엑셀 함수', '갤럭시 설정', '공유기 설정'],
  '사회·정치': ['정부지원금', '주민등록증 재발급', '민원 서류 발급', '과태료 조회', '투표소 찾기', '건강보험료 조회'],
  '건강·의학': ['독감 예방접종', '건강검진', '실손보험 청구', '감기 빨리 낫는법', '비타민 추천', '대상포진 예방접종'],
  '비즈니스·경제': ['연말정산', '종합소득세', '청년도약계좌', '적금 추천', '사업자등록', '근로장려금'],
  '어학·외국어': ['토익 시험일정', '영어 회화 독학', '오픽 등급', '일본어 독학', 'JLPT 시험일정', '토익 점수 확인'],
  '교육·학문': ['수능 등급컷', '국가장학금', '자격증 추천', '내일배움카드', '학점은행제', '검정고시 일정']
};

// 핵심어로 쓰기엔 너무 흔한 말 (연관 키워드가 주제를 벗어나는 걸 막는 용도)
const GENERIC = new Set(['추천', '방법', '사용법', '요금', '요금제', '가격', '비용', '할인', '순위', '비교', '일정', '만들기',
  '쓰는법', '하는법', '잘찍는법', '잘나오는법', '키우기', '독학', '예약', '예매', '모음', '이미지', '코스', '신청', '발급', '확인', '서울',
  '무료', '결말', '다시보기', '설정', '업데이트', '관리', '청소', '세탁', '대회', '입문', '가입', '조회', '쿠폰', '이용권', '멤버십']);

// 검색 의도 → 화면에서 제목·캡처·본문 설계를 고를 때 쓴다
const INTENTS = [
  ['refund', /(환불|취소|해지|반품|위약금|수수료|해약|탈퇴)/],
  ['apply', /(신청|발급|등록|가입|접수|재발급|예약|예매|티켓팅|청구|지원금|수당|급여|장학금)/],
  ['schedule', /(일정|기간|날짜|마감|기한|시간표|주기|접수기간|발표|등급컷)/],
  ['price', /(가격|비용|요금|금액|할인|가격표|시세|요금제|얼마)/],
  ['howto', /(방법|하는법|쓰는법|사용법|만들기|만드는법|레시피|키우기|설정|정리|세탁|제거|교체|청소|독학|보관|손질|해결)/],
  ['recommend', /(추천|순위|비교|종류|best|베스트|인기|모음|리스트)/i]
];
const EVERGREEN = /(환불|취소|해지|반품|수수료|신청|발급|등록|가입|조건|대상|기간|방법|하는법|사용법|요금|가격|비용|일정|만들기|레시피|키우기|설정|주기|교체|세탁|제거|조회|청구|예약|예매|추천|비교)/;

function intentOf(keyword) {
  for (const [kind, re] of INTENTS) if (re.test(keyword)) return kind;
  return 'info';
}

// 연관 키워드는 띄어쓰기 없이 오므로 의도를 나타내는 뒷말 앞에서만 띄운다 (검색 결과는 같다)
// 예: KTX환불수수료 → KTX 환불 수수료. 앞말 안쪽(전기차·여행자보험 등)은 건드리지 않는다.
const SUFFIX_WORDS = ['환불', '취소', '수수료', '규정', '방법', '신청', '기간', '대상', '조건', '자격', '금액', '가격표', '가격', '비용',
  '요금제', '요금', '할인', '추천', '순위', '비교', '후기', '일정', '시간표', '예약', '예매', '사이트', '어플', '무료', '확인', '조회',
  '서류', '발급', '재발급', '준비물', '만들기', '레시피', '하는법', '사용법', '키우기', '주기', '교체', '세탁', '제거제', '제거', '방지',
  '효과', '부작용', '종류', '접수', '등급컷', '점수', '마감', '지원금', '혜택', '해지', '가입', '이용권', '구독권', '견적', '증상', '전염성',
  '청구', '계산기', '계산', '양식', '문구', '인사말', '메시지', '랭킹', '디데이', '정답', '일정표', '공략', '코스', '맛집', '콘서트', '팬미팅']
  .sort((a, b) => b.length - a.length);
// 말 안쪽에 와도 앞에서 띄우는 명사 (가열식가습기 → 가열식 가습기)
const NOUN_WORDS = ['가습기', '노트북', '카메라', '웹툰', '도시락', '화분', '식물', '퍼즐', '보드게임', '게임', '러닝화', '골프', '마라톤',
  '타이어', '전기장판', '사료', '간식', '중성화', '스케일링', '치석', '프리미엄', '뮤직', '가족', '베스트셀러', '도서관', '영화', '드라마',
  '시험', '여행', '크루즈', '온천', '렌트카', '뜨개질', '연극', '뮤지컬', '전시회', '다이어리', '염색약', '패딩', '원피스', '곰팡이',
  '예방접종', '주사', '병원', '적금', '환급금', '승차권', '입석', '하객룩', '스커트', '선크림', '양념', '반찬', '고구마', '인기곡', '오리지널',
  '신작', '주간', '용량', '편집', '검사', '검사소', '정기검사', '보험료', '보험', '중간예납', '사전', '유효', '스피킹', '답지', '등록번호',
  '등록증', '청첩장', '축가', '드레스', '결혼식장', '입소', '이모티콘', '인사', '이미지', '명언', '글귀', '벽지', '수납', '연습장', '용어', '레슨',
  '대회', '인화', '어플', '랭킹', '그림', '배경', '자격증', '구독권', '요일별', '완결', '한달', 'KTX'];
// 맨 앞에 올 때 뒤에서 띄우는 머리말 (넷플릭스주간순위 → 넷플릭스 주간 순위)
const HEAD_WORDS = ['디즈니플러스', '에어프라이어', '넷플릭스', '유튜브', '카카오', '해커스', '다이어트', '자동차', '강아지', '고양이',
  '가계부', '결혼식', '오리털', '저축은행', '롯데시네마', '메가박스', '티빙', '웨이브', '수능', '토익', '엑셀', '겨울', '일본', '서울', '성수',
  '기차', '해외', 'CGV', 'KTX', 'JLPT', 'PC', 'LG', '삼성', '레노버', '게이밍', '업무용', '대학로', '어린이', '신생아', '대용량', '1인용',
  '셀프', '무료', '추천', '나이키', '트레일', '스크린', '폴라로이드', '디지털', '필름', '초소형', '똑딱이', '여권', '목도리', '대바늘', '추리',
  '성인', '직소', '종합', '국가', '독감', '실손', '종합비타민', '대상포진', '한국', '금호', '전기차', '코엑스', '혜화', '에세이', '소설', '전자'];

function prettify(raw) {
  const s = String(raw || '').trim();
  if (/\s/.test(s)) return s;
  const up = s.toUpperCase();
  const cuts = new Set();
  for (const w of SUFFIX_WORDS) {
    let i = up.indexOf(w);
    while (i >= 0) {
      // 앞말이 두 글자 이상 남고, 이미 다른 뒷말 안쪽이 아닐 때만 띄운다
      if (i >= 2 && ![...cuts].some(c => c < i && i < c + 2)) cuts.add(i);
      i = up.indexOf(w, i + w.length);
    }
  }
  for (const w of NOUN_WORDS) {
    let i = up.indexOf(w);
    while (i >= 0) {
      if (i >= 2 && ![...cuts].some(c => c < i && i < c + 2)) cuts.add(i);
      i = up.indexOf(w, i + w.length);
    }
  }
  // 머리말: 맨 앞이나 이미 띈 자리에서 시작할 때만 그 뒤를 띄운다 (전기차의 '기차'처럼 말 안쪽은 제외)
  for (let pass = 0; pass < 2; pass++) {
    for (const start of [0, ...cuts]) {
      const w = HEAD_WORDS.find(h => up.startsWith(h, start));
      if (w && start + w.length <= s.length - 2) cuts.add(start + w.length);
    }
  }
  // 한 글자짜리 조각이 생기는 자르기는 버린다
  const sorted = [...cuts].sort((a, b) => a - b);
  const keep = sorted.filter((c, idx) => c - (sorted[idx - 1] || 0) >= 2 && (sorted[idx + 1] || s.length) - c >= 2);
  cuts.clear(); keep.forEach(c => cuts.add(c));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (cuts.has(i)) out += ' ';
    out += s[i];
  }
  return out;
}

// 주제와 엇나가거나 블로그 추천에 부적절한 말
const BLOCK = /(식물성|카지노|토토|도박|성인용|19금|야동|대출)/;

const squash = k => String(k).replace(/\s+/g, '').toUpperCase();
const qc = v => (typeof v === 'number' ? v : 5);

function coreWordsOf(topicName) {
  const words = new Set();
  // 각 대표 검색어의 첫 단어가 핵심어 (신혼부부 대출 → 신혼부부: 일반 대출 상품이 섞이지 않게)
  for (const seed of SEEDS[topicName] || []) {
    const w = seed.split(/\s+/)[0];
    if (w.length >= 2 && !GENERIC.has(w)) words.add(w.toUpperCase());
  }
  return [...words];
}

async function relatedKeywords(hints, env) {
  const uri = '/keywordstool';
  const ts = String(Date.now());
  const sig = crypto.createHmac('sha256', env.NAVER_AD_SECRET_KEY).update(`${ts}.GET.${uri}`).digest('base64');
  const j = await httpsJson({
    hostname: 'api.searchad.naver.com',
    path: `${uri}?hintKeywords=${encodeURIComponent(hints.map(h => h.replace(/\s+/g, '')).join(','))}&showDetail=1`,
    method: 'GET',
    headers: { 'X-Timestamp': ts, 'X-API-KEY': env.NAVER_AD_ACCESS_LICENSE, 'X-Customer': env.NAVER_AD_CUSTOMER_ID, 'X-Signature': sig }
  });
  return (j.keywordList || []).map(x => {
    const pc = qc(x.monthlyPcQcCnt);
    const mobile = qc(x.monthlyMobileQcCnt);
    return { raw: x.relKeyword, pc, mobile, total: pc + mobile };
  });
}

async function topicCandidates(topicName, env, taken) {
  const seeds = SEEDS[topicName] || [];
  const core = coreWordsOf(topicName);
  const pool = new Map();
  for (let i = 0; i < seeds.length; i += 5) {
    const batch = seeds.slice(i, i + 5);
    let list = [];
    try { list = await relatedKeywords(batch, env); }
    catch (_) {
      for (const s of batch) {
        try { list = list.concat(await relatedKeywords([s], env)); } catch (e) { /* 받지 않는 말 */ }
        await sleep(300);
      }
    }
    for (const k of list) {
      const key = squash(k.raw);
      if (pool.has(key) || taken.has(key)) continue;
      if (k.total < MIN_VOLUME || k.total > MAX_VOLUME) continue;
      if (key.length < 3 || key.length > 14) continue;
      if (BLOCK.test(key)) continue;
      if (core.length && !core.some(c => key.includes(c))) continue; // 주제와 무관한 연관어 제외
      pool.set(key, k);
    }
    await sleep(400);
  }
  // 연중 꾸준한 해결형 의도 + 적당한 검색량을 먼저 본다
  return [...pool.values()]
    .map(k => {
      const evergreen = EVERGREEN.test(k.raw);
      const vol = Math.log10(k.total);
      const pre = vol + (evergreen ? 1.2 : 0) - (k.total > 100000 ? 0.8 : 0);
      return { ...k, evergreen, pre };
    })
    .sort((a, b) => b.pre - a.pre)
    .slice(0, CANDIDATES);
}

function pensionGrade(total, ratio) {
  if (ratio == null) return total >= 3000 ? 'A' : 'B';
  if (total >= 3000 && ratio < 5) return 'S';
  if (total >= 500 && ratio < 30) return 'A';
  if (ratio < 100) return 'B';
  return 'C';
}

function reasonOf(topicName, k) {
  const parts = [];
  const intentText = {
    refund: '연중 꾸준한 해결형 검색', apply: '신청·발급 때마다 반복되는 해결형 검색', schedule: '시기마다 다시 찾는 일정형 검색',
    price: '가격·비용을 비교하려는 구매 직전 검색', howto: '방법을 찾는 해결형 검색', recommend: '고르기 전에 비교하는 추천형 검색',
    info: '정보를 찾는 검색'
  }[k.intent];
  parts.push(`${topicName} 분야 ${intentText}`);
  if (k.ratio != null) {
    if (k.ratio < 1) parts.push('검색량보다 문서가 적어 상위 노출 여지가 큼');
    else if (k.ratio < 5) parts.push('검색 대비 문서 수가 적은 편');
  }
  if (k.recent30 != null && k.recent30 >= 1 && k.recent30 <= 30) parts.push(`최근 30일 같은 제목 글 ${k.recent30}개로 적음`);
  return parts.join(' · ');
}

async function collectTopicKeywords({ force = false, outPath = OUT_FILE } = {}) {
  if (!force) {
    try {
      const prev = fs.readFileSync(outPath, 'utf8');
      const m = prev.match(/"generatedAt":"([^"]+)"/);
      if (m && Date.now() - new Date(m[1]).getTime() < REFRESH_MS) {
        console.log('📁 주제별 키워드: 20시간 안에 만든 데이터가 있어 건너뜁니다.');
        return null;
      }
    } catch (_) { /* 첫 실행 */ }
  }
  const env = readEnv();
  if (!env.NAVER_AD_CUSTOMER_ID || !env.NAVER_AD_ACCESS_LICENSE || !env.NAVER_AD_SECRET_KEY) {
    console.warn('⚠️ 주제별 키워드: 검색광고 API 키가 없어 건너뜁니다.');
    return null;
  }
  console.log('📁 12. 주제별 키워드 수집 시작 (32개 주제 × 연관 키워드)...');

  const taken = new Set();
  const topics = [];
  for (const g of FALLBACK_DIRECTORIES) {
    for (const [seq, name] of g.topics) {
      let cands = [];
      try { cands = await topicCandidates(name, env, taken); }
      catch (e) { console.warn(`  ⚠️ ${name} 연관 키워드 실패:`, e.message); }
      topics.push({ seq, name, group: g.name, groupSeq: g.seq, cands });
    }
  }

  // 문서수·최근 30일 발행 (후보 전체 한 번에)
  const words = topics.flatMap(t => t.cands.map(c => c.raw));
  const docs = await fetchBlogCounts(words, env);
  console.log(`  📊 후보 ${words.length}개 · 문서수 확보 ${docs.size}개`);

  for (const t of topics) {
    const scored = t.cands.map(c => {
      const d = docs.get(c.raw) || {};
      const blogCount = d.blogCount != null ? d.blogCount : null;
      const ratio = blogCount != null ? Math.round((blogCount / c.total) * 10000) / 10000 : null;
      const score = Math.log10(c.total) * 2 + (c.evergreen ? 1.5 : 0)
        - (ratio != null ? Math.log10(ratio + 0.1) * 1.6 : 0.5)
        - (d.recent30 != null ? Math.log10(d.recent30 + 1) * 0.4 : 0);
      return { c, d, blogCount, ratio, score };
    }).filter(x => x.ratio == null || x.ratio < 300) // 문서가 검색의 300배 넘게 쌓인 포화 키워드는 뺀다
      .sort((a, b) => b.score - a.score);

    const picked = [];
    for (const x of scored) {
      const key = squash(x.c.raw);
      // 거의 같은 말(한쪽이 다른 쪽을 그대로 포함하고 길이 차가 2자 이하) 중복 방지
      if (picked.some(p => { const pk = squash(p.raw); return (pk.includes(key) || key.includes(pk)) && Math.abs(pk.length - key.length) <= 2; })) continue;
      const keyword = prettify(x.c.raw);
      const item = {
        keyword,
        raw: x.c.raw,
        total: x.c.total,
        pc: x.c.pc,
        mobile: x.c.mobile,
        blogCount: x.blogCount,
        ratio: x.ratio,
        recent30: x.d.recent30 != null ? x.d.recent30 : null,
        type: x.c.evergreen ? '연금형' : '정보형',
        grade: pensionGrade(x.c.total, x.ratio),
        tier: tierOf(x.c.total),
        intent: intentOf(x.c.raw)
      };
      item.reason = reasonOf(t.name, item);
      picked.push(item);
      taken.add(key);
      if (picked.length >= PER_TOPIC) break;
    }
    t.keywords = picked;
    delete t.cands;
    console.log(`  ✅ ${t.group} > ${t.name}: ${picked.length}개`);
  }

  const okTopics = topics.filter(t => t.keywords.length).length;
  if (okTopics < 16) {
    console.warn(`  ⚠️ 추천이 나온 주제가 ${okTopics}개뿐이라 기존 데이터를 유지합니다.`);
    return null;
  }
  const output = {
    success: true,
    generatedAt: new Date().toISOString(),
    date: new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10),
    groups: FALLBACK_DIRECTORIES.map(g => ({ seq: g.seq, name: g.name, topics: g.topics.map(([seq, name]) => ({ seq, name })) })),
    topics
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `window.TOPIC_KEYWORDS_DATA = ${JSON.stringify(output)};\n`, 'utf8');
  console.log(`  💾 저장: data/topic_keywords_data.js (추천 있는 주제 ${okTopics}/${topics.length}, 키워드 ${topics.reduce((n, t) => n + t.keywords.length, 0)}개)`);
  return output;
}

module.exports = { collectTopicKeywords, prettify, intentOf };

if (require.main === module) {
  collectTopicKeywords({ force: process.argv.includes('--force') }).catch(err => {
    console.error('⚠️ 주제별 키워드 수집 오류:', err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}
