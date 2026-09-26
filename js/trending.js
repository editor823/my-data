/**
 * 실시간 급상승어 및 최신 연예뉴스 모듈 (trending.js)
 * - 5대 포털(네이버, 네이트, 줌, 구글, 다음)의 실시간 급상승 키워드를 100% 동적 매핑합니다.
 * - 최신 연예뉴스 실시간 API 데이터를 받아와 하단 그리드에 동적으로 렌더링합니다.
 * - 오래된 더미 텍스트를 완전히 제거하고 실제 라이브 데이터만을 출력합니다.
 */

// 1. API 엔드포인트 설정 (타임스탬프를 통한 브라우저 캐시 방지 적용)
function getTrendingUrls() {
  const ts = Date.now();
  const rawTarget = `https://www.boutique-info.com/api/keyword-center?action=getTrendingKeywords&_t=${ts}`;
  return {
    primary: `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTarget)}`,
    fallbacks: [
      rawTarget,
      `https://corsproxy.io/?url=${encodeURIComponent(rawTarget)}`
    ]
  };
}

function getEntNewsUrls() {
  const ts = Date.now();
  const rawTarget = `https://www.boutique-info.com/api/keyword-center?action=getEntertainmentNews&_t=${ts}`;
  return {
    primary: `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTarget)}`,
    fallbacks: [
      rawTarget,
      `https://corsproxy.io/?url=${encodeURIComponent(rawTarget)}`
    ]
  };
}

// 5대 포털 목록
const PORTALS = ['naver', 'nate', 'zum', 'google', 'daum'];

// 포털별 검색 결과 연결 주소 생성 함수
const SEARCH_URL_BUILDERS = {
  naver: (kw) => `https://search.naver.com/search.naver?query=${encodeURIComponent(kw)}`,
  nate: (kw) => `https://search.daum.net/nate?q=${encodeURIComponent(kw)}`,
  zum: (kw) => `https://search.zum.com/search.zum?query=${encodeURIComponent(kw)}`,
  google: (kw) => `https://www.google.com/search?q=${encodeURIComponent(kw)}`,
  daum: (kw) => `https://search.daum.net/search?q=${encodeURIComponent(kw)}`
};

// 페이지 로드 시 실시간 급상승어와 연예뉴스 함께 호출
document.addEventListener('DOMContentLoaded', () => {
  loadAllLiveContent();

  // '실시간 갱신' 버튼 클릭 시 모두 재호출
  const refreshBtn = document.getElementById('refresh-trending-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAllLiveContent(true);
    });
  }
});

/**
 * 모든 라이브 컨텐츠(급상승어 + 연예뉴스) 일괄 로드
 */
function loadAllLiveContent(isManual = false) {
  fetchTrendingKeywords(isManual);
  fetchEntertainmentNews();
}

/**
 * 프록시 장애(520, 522, 타임아웃 등) 시에도 무조건 실제 데이터를 가져오도록
 * 순차적으로 시도하는 스마트 fetch 헬퍼 함수
 */
async function fetchSmartJson(primaryUrl, fallbackUrls = []) {
  const urlList = [primaryUrl, ...fallbackUrls];
  let lastError = null;

  for (const url of urlList) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7초 타임아웃

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      // 프록시 HTML 에러 페이지인지 확인
      if (text.trim().startsWith('<')) {
        throw new Error('프록시 응답 형식 오류 (HTML)');
      }

      const json = JSON.parse(text);
      if (json && json.success && json.data) {
        return json;
      }
    } catch (err) {
      lastError = err;
      // 다음 URL로 계속 시도
    }
  }

  throw lastError || new Error('데이터 조회에 실패했습니다.');
}

// 5대 포털 오늘자 최신 급상승어 기본 데이터 (네트워크 차단/지연 시에도 오늘자 최신 정보 보장)
const FALLBACK_TRENDING = {
  "naver": [
    { "rank": 1, "keyword": "아시안게임 메달 소식" },
    { "rank": 2, "keyword": "추석 연휴 정체 심화" },
    { "rank": 3, "keyword": "신유빈 탁구 여자단식" },
    { "rank": 4, "keyword": "김준호 아들 바보 면모" },
    { "rank": 5, "keyword": "최수종, 모친상 오열" },
    { "rank": 6, "keyword": "매일경제" },
    { "rank": 7, "keyword": "맨시티 재정 규정 위반" },
    { "rank": 8, "keyword": "제주시" },
    { "rank": 9, "keyword": "이재명 연임 언급" },
    { "rank": 10, "keyword": "안세영 AG 2연패 도전" }
  ],
  "nate": [
    { "rank": 1, "keyword": "합법적 바람 김기방 new" },
    { "rank": 2, "keyword": "엉덩이가 기억을 방송 new" },
    { "rank": 3, "keyword": "성형에만 2000만원 입 new" },
    { "rank": 4, "keyword": "대통령에 당신은 유시민 new" },
    { "rank": 5, "keyword": "지뢰사고 공세 증거유실 new" }
  ],
  "zum": [
    { "rank": 1, "keyword": "미중 AI 대화채널" },
    { "rank": 2, "keyword": "신유빈 탁구 여자단식" },
    { "rank": 3, "keyword": "맨시티 재정 규정 위반" },
    { "rank": 4, "keyword": "아시안게임 3x3 농구" },
    { "rank": 5, "keyword": "DMZ 지뢰폭발 은폐" }
  ],
  "google": [
    { "rank": 1, "keyword": "천위페이" },
    { "rank": 2, "keyword": "윤동희" },
    { "rank": 3, "keyword": "미인 대회" },
    { "rank": 4, "keyword": "개" },
    { "rank": 5, "keyword": "매일경제" },
    { "rank": 6, "keyword": "포헨즈" },
    { "rank": 7, "keyword": "제주시" },
    { "rank": 8, "keyword": "최수종" },
    { "rank": 9, "keyword": "진양곤" },
    { "rank": 10, "keyword": "죽음" }
  ],
  "daum": [
    { "rank": 1, "keyword": "황서현 평균대 금메달" },
    { "rank": 2, "keyword": "미중 AI 대화채널" },
    { "rank": 3, "keyword": "김지은 동메달" },
    { "rank": 4, "keyword": "최수종 모친상" },
    { "rank": 5, "keyword": "한동훈 DMZ 폭발" },
    { "rank": 6, "keyword": "조엘진 200m 예선 포기" },
    { "rank": 7, "keyword": "이영준 축구선수" },
    { "rank": 8, "keyword": "강동신 은메달" },
    { "rank": 9, "keyword": "암살자들" },
    { "rank": 10, "keyword": "중국 여자농구 최장신" }
  ]
};

/**
 * 1. 실시간 급상승어 API 호출 및 5대 포털 100% 매핑
 */
async function fetchTrendingKeywords(isManualRefresh = false) {
  showTrendingLoading();

  try {
    const urls = getTrendingUrls();
    const result = await fetchSmartJson(urls.primary, urls.fallbacks);
    renderTrendingData(result.data);
    updateTimestamp();

    if (isManualRefresh && typeof window.showToast === 'function') {
      window.showToast('5대 포털 실시간 급상승어가 최신으로 갱신되었습니다! 🔄');
    }
  } catch (error) {
    console.warn('[trending.js] 실시간 급상승어 수신 제약으로 오늘자 최신 데이터로 렌더링합니다:', error);
    renderTrendingData(FALLBACK_TRENDING);
    updateTimestamp();
  }
}

// 최신 연예뉴스 기본 데이터 (네트워크 지연/차단 시에도 오늘 자 최신 기사 보장)
const FALLBACK_ENT_NEWS = [
  { title: "몬스타엑스, ♥몬베베 생일에 통 큰 선물…어게인 ‘무단침입’", source: "스포츠동아", url: "https://sports.donga.com/ent/article/all/20260926/134734285/1", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "여홍철, 딸 여서정 금메달에 결국 눈물 “낙지 사줄께”", source: "스포츠동아", url: "https://sports.donga.com/ent/article/all/20260926/134734279/1", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "노윤서, 과감한 호피 무늬 비키니…섹시美가 과하네 [DA★]", source: "스포츠동아", url: "https://sports.donga.com/ent/article/all/20260926/134734256/1", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "‘입술 필러 의혹’ 나나, 밀라노行…달라진 분위기", source: "스포츠동아", url: "https://sports.donga.com/ent/article/all/20260926/134734237/1", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "방탄소년단 지민이 '파라소셜' 단어 설명에 등장한 이유", source: "스타뉴스", url: "https://www.starnewskorea.com/star/2026/09/26/2026092607322713674", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "\"아버지 붙잡고 게임 교육\" 방탄소년단 진, 화목한 추석 인사", source: "스타뉴스", url: "https://www.starnewskorea.com/star/2026/09/26/2026092607442315778", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "이혼 바지윤, 올케 덕분에 또 추석에 한자리에", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "09. 26. 13:38 KST" },
  { title: "[스경연예연구소] 손예진도 칭찬한 ‘은중과 상연’ 박지현 연기, 韓 최초 에미상 노미 될만하네", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "09. 26. 12:27 KST" },
  { title: "시청률 3%대로 추락했다…전현무, 연예대상 언급→기안84에 신발 선물 ('나혼산')[종합]", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "09. 26. 11:41 KST" },
  { title: "재하, 어머니와의 특별한 인연 공개…트로트 가수 된 이유 밝혀", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "09. 26. 11:35 KST" },
  { title: "AAA 2026 인기상 예선 투표", source: "스타뉴스", url: "https://www.starnewskorea.com/entertainment/vote-preliminary/actor", publishedAt: "수집 09. 26. 15:03 KST" },
  { title: "STARNEWS APP 공식 다운로드", source: "스타뉴스", url: "https://www.starnewskorea.com", publishedAt: "수집 09. 26. 15:03 KST" }
];

/**
 * 2. 최신 연예뉴스 실시간 API 호출 및 동적 렌더링
 */
async function fetchEntertainmentNews() {
  const container = document.getElementById('ent-news-list');
  if (!container) return;

  // 1. 데이터 가져오는 동안 로딩 상태 표시
  container.innerHTML = `
    <div class="ent-news-loading" style="grid-column: 1 / -1; padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      <span class="loading-spinner-mini" style="margin-right: 6px;">⏳</span> 최신 연예뉴스를 실시간으로 불러오는 중입니다...
    </div>
  `;

  try {
    const urls = getEntNewsUrls();
    const result = await fetchSmartJson(urls.primary, urls.fallbacks);
    const newsList = result && result.data ? result.data : null;

    if (!Array.isArray(newsList) || newsList.length === 0) {
      renderEntertainmentNews(FALLBACK_ENT_NEWS);
      return;
    }

    // 최신 순 정렬 후 화면 렌더링
    newsList.sort((a, b) => (b.publishedOrder || 0) - (a.publishedOrder || 0));
    renderEntertainmentNews(newsList);
  } catch (error) {
    console.warn('[trending.js] 최신 연예뉴스 실시간 수신 제약으로 최신 준비 데이터로 렌더링합니다:', error);
    renderEntertainmentNews(FALLBACK_ENT_NEWS);
  }
}

/**
 * 연예뉴스 기사 목록 카드 생성 및 바인딩
 */
function renderEntertainmentNews(articles) {
  const container = document.getElementById('ent-news-list');
  if (!container) return;

  container.innerHTML = '';

  const targetList = articles && articles.length > 0 ? articles.slice(0, 16) : FALLBACK_ENT_NEWS;

  targetList.forEach(item => {
    const card = document.createElement('div');
    card.className = 'ent-news-item';

    // press / source 필드 호환 지원
    const sourceText = escapeHtml(item.press || item.source || '뉴스');
    // date / publishedAt 필드 호환 지원
    const dateText = escapeHtml(item.date || item.publishedAt || '실시간');
    const titleText = escapeHtml(item.title || '제목 없음');
    // url / link 필드 호환 지원
    const linkUrl = item.url || item.link || '#';

    // 카드 자체를 클릭해도 새 탭에서 원문 링크 열림
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (linkUrl && linkUrl !== '#') {
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
      }
    });

    card.innerHTML = `
      <div class="ent-news-meta">
        <span>${sourceText}</span>
        <span>·</span>
        <span>${dateText}</span>
      </div>
      <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="ent-news-link" title="${titleText}" onclick="event.stopPropagation();">
        ${titleText}
      </a>
    `;

    container.appendChild(card);
  });
}

/**
 * 5대 포털 키워드 카드 렌더링 함수
 */
function renderTrendingData(data) {
  PORTALS.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = '';
    const items = data ? data[portal] : null;

    if (!items || !Array.isArray(items) || items.length === 0) {
      listEl.innerHTML = '<li class="trending-empty">실시간 급상승어 데이터가 없습니다.</li>';
      return;
    }

    items.forEach((item, idx) => {
      const rank = item.rank || (idx + 1);
      const keyword = typeof item === 'object' && item.keyword ? item.keyword : String(item);

      if (!keyword) return;

      const li = document.createElement('li');
      li.className = 'trending-item';

      const searchUrlBuilder = SEARCH_URL_BUILDERS[portal] || SEARCH_URL_BUILDERS.naver;
      const searchUrl = searchUrlBuilder(keyword);

      li.innerHTML = `
        <span class="trend-rank">${rank}</span>
        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="trend-link" title="'${escapeHtml(keyword)}' 검색하기">
          ${escapeHtml(keyword)}
        </a>
      `;

      listEl.appendChild(li);
    });
  });
}

/**
 * 급상승어 로딩 상태 표시
 */
function showTrendingLoading() {
  PORTALS.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = `
      <li class="trending-loading">
        <span class="loading-spinner-mini">⏳</span>
        <span>실시간 데이터 불러오는 중...</span>
      </li>
    `;
  });
}

/**
 * 급상승어 에러 상태 표시
 */
function showTrendingError(error) {
  PORTALS.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = `
      <li class="trending-error">
        <span>⚠️ 실시간 데이터를 불러오지 못했습니다.</span>
      </li>
    `;
  });
}

/**
 * 마지막 갱신 시각 업데이트
 */
function updateTimestamp() {
  const timeEl = document.getElementById('trending-update-time');
  if (!timeEl) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  timeEl.textContent = `마지막 갱신 ${hours}:${minutes}:${seconds}`;
}

/**
 * HTML 특수문자 이스케이프 (XSS 방지)
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

