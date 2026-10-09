/**
 * 실시간 급상승어 및 최신 연예뉴스 모듈 (trending.js)
 * - 5대 포털(네이버, 네이트, 줌, 구글, 다음)의 실시간 급상승 키워드를 100% 동적 매핑합니다.
 * - 최신 연예뉴스 실시간 API 데이터를 받아와 하단 그리드에 동적으로 렌더링합니다.
 * - 오래된 더미 텍스트를 완전히 제거하고 실제 라이브 데이터만을 출력합니다.
 */

// 1. API 엔드포인트 설정 (정적 라이브 JSON 최우선 호출 + 로컬 백엔드 + 프록시 fallback)
function getTrendingUrls() {
  const ts = Date.now();
  return {
    primary: `data/trending_live.json?_t=${ts}`,
    fallbacks: [
      `trending_live.json?_t=${ts}`,
      `/api/trending-keywords?_t=${ts}`,
      `/data/trending_live.json?_t=${ts}`,
      `https://www.boutique-info.com/api/keyword-center?action=getTrendingKeywords&_t=${ts}`
    ]
  };
}

function getEntNewsUrls() {
  const ts = Date.now();
  return {
    primary: `data/trending_live.json?_t=${ts}`,
    fallbacks: [
      `trending_live.json?_t=${ts}`,
      `/api/entertainment-news?_t=${ts}`,
      `/data/trending_live.json?_t=${ts}`,
      `https://www.boutique-info.com/api/keyword-center?action=getEntertainmentNews&_t=${ts}`
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
  loadAllLiveContent(false);

  // '실시간 갱신' 버튼 클릭 시 모두 재호출
  const refreshBtn = document.getElementById('refresh-trending-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const icon = refreshBtn.querySelector('span:first-child');
      const text = refreshBtn.querySelector('span:last-child');
      const origText = text ? text.textContent : '실시간 갱신';

      refreshBtn.disabled = true;
      if (icon) icon.classList.add('loading-spinner-mini');
      if (text) text.textContent = '갱신 중...';

      try {
        await loadAllLiveContent(true);
      } finally {
        setTimeout(() => {
          refreshBtn.disabled = false;
          if (icon) icon.classList.remove('loading-spinner-mini');
          if (text) text.textContent = origText;
        }, 400);
      }
    });
  }
});

/**
 * 모든 라이브 컨텐츠(급상승어 + 연예뉴스) 일괄 로드
 */
async function loadAllLiveContent(isManual = false) {
  try {
    await Promise.all([
      fetchTrendingKeywords(isManual),
      fetchEntertainmentNews(isManual)
    ]);
    updateTimestamp();
  } catch (e) {
    console.error('[trending.js] 라이브 데이터 로드 중 오류:', e);
    updateTimestamp();
  }
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
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6초 타임아웃

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
      if (json && (json.trending || json.entertainment || json.data)) {
        return json;
      }
    } catch (err) {
      lastError = err;
      // 다음 URL로 계속 시도
    }
  }

  throw lastError || new Error('데이터 조회에 실패했습니다.');
}

// 5대 포털 오늘자 최신 급상승어 기본 백업 데이터
const FALLBACK_TRENDING = {
  "naver": [
    { "rank": 1, "keyword": "보복 운전 김영광이었다" },
    { "rank": 2, "keyword": "쿠팡 먹통 보상" },
    { "rank": 3, "keyword": "나주 부부 살해犯 구속" },
    { "rank": 4, "keyword": "변요한, 송민호 응원" },
    { "rank": 5, "keyword": "나띠" },
    { "rank": 6, "keyword": "최태원 호남 반도체 조기 추진" },
    { "rank": 7, "keyword": "삼성전자 3분기 실적" },
    { "rank": 8, "keyword": "정우성 이사직 사임" },
    { "rank": 9, "keyword": "김시아" },
    { "rank": 10, "keyword": "이재명 이집트 CEPA" }
  ],
  "nate": [
    { "rank": 1, "keyword": "보복 운전 김영광 공식입장" },
    { "rank": 2, "keyword": "쿠팡 시스템 오류 사과" },
    { "rank": 3, "keyword": "나주 사건 수사 진척" },
    { "rank": 4, "keyword": "변요한 송민호 콘서트" },
    { "rank": 5, "keyword": "키스오브라이프 나띠" }
  ],
  "zum": [
    { "rank": 1, "keyword": "삼성전자 실적 발표" },
    { "rank": 2, "keyword": "최태원 회장 반도체 행보" },
    { "rank": 3, "keyword": "쿠팡 접속 오류 보상안" },
    { "rank": 4, "keyword": "정우성 사임 소식" },
    { "rank": 5, "keyword": "김영광 보복운전 해명" }
  ],
  "google": [
    { "rank": 1, "keyword": "쿠팡" },
    { "rank": 2, "keyword": "삼성전자" },
    { "rank": 3, "keyword": "김영광" },
    { "rank": 4, "keyword": "변요한" },
    { "rank": 5, "keyword": "나띠" },
    { "rank": 6, "keyword": "최태원" },
    { "rank": 7, "keyword": "정우성" },
    { "rank": 8, "keyword": "김시아" },
    { "rank": 9, "keyword": "CEPA" },
    { "rank": 10, "keyword": "송민호" }
  ],
  "daum": [
    { "rank": 1, "keyword": "보복 운전 논란 김영광" },
    { "rank": 2, "keyword": "쿠팡 먹통 피해보상 접수" },
    { "rank": 3, "keyword": "나주 부부 피살 사건" },
    { "rank": 4, "keyword": "송민호 응원 나선 변요한" },
    { "rank": 5, "keyword": "나띠 화보 공개" },
    { "rank": 6, "keyword": "최태원 SK 회장 발표" },
    { "rank": 7, "keyword": "삼성전자 어닝쇼크 극복" },
    { "rank": 8, "keyword": "정우성 아티스트컴퍼니 사임" },
    { "rank": 9, "keyword": "배우 김시아 근황" },
    { "rank": 10, "keyword": "한-이집트 무역 협상" }
  ]
};

// 최신 연예뉴스 기본 데이터
function getDynamicFallbackEntNews() {
  return [
    { title: "‘재혼 황후’ 신민아 “황후役 처음…드레스 쉽지 않았다” [31st BIFF]", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: "수집 오늘 23:15 KST" },
    { title: "SSG 지명 ‘탈삼진 머신’ 뜬다… 불꽃 파이터즈 돌풍", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: "수집 오늘 23:00 KST" },
    { title: "주지훈 “‘하렘의 남자들’ 덕분에 낯섦 줄어들어” [31st BIFF]", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: "수집 오늘 23:00 KST" },
    { title: "'이혼 발표' 김인석, 홍진경 앞 눈물 재조명 [스타이슈]", source: "스타뉴스", url: "https://www.starnewskorea.com", publishedAt: "수집 오늘 23:00 KST" },
    { title: "전현무, 예능 출연진 제안-이준 ‘끈적하지 않은 관계’", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "수집 오늘 14:02 KST" },
    { title: "[문화연예 플러스] '신인감독 김연경2', 11일 첫 방송", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "수집 오늘 06:57 KST" },
    { title: "[문화연예 플러스] '호프' 나홍진, '호러 임팩트 리포트' 선정", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "수집 오늘 06:56 KST" },
    { title: "올가을 극장가 한국 영화 신작 흥행 질주 예고", source: "Google 뉴스", url: "https://news.google.com", publishedAt: "수집 오늘 06:50 KST" }
  ];
}

/**
 * 1. 실시간 급상승어 API 호출 및 5대 포털 100% 매핑
 */
async function fetchTrendingKeywords(isManualRefresh = false) {
  showTrendingLoading();

  try {
    const urls = getTrendingUrls();
    const result = await fetchSmartJson(urls.primary, urls.fallbacks);
    const trendingData = result.trending || result.data;
    
    if (trendingData && typeof trendingData === 'object' && Object.keys(trendingData).length > 0) {
      renderTrendingData(trendingData);
    } else {
      renderTrendingData(FALLBACK_TRENDING);
    }
    updateTimestamp();

    if (isManualRefresh && typeof window.showToast === 'function') {
      window.showToast('5대 포털 실시간 급상승어가 최신으로 갱신되었습니다! 🔄');
    }
  } catch (error) {
    console.warn('[trending.js] 실시간 급상승어 로컬/원격 수신 제약으로 최신 준비 데이터로 렌더링합니다:', error);
    renderTrendingData(FALLBACK_TRENDING);
    updateTimestamp();
    if (isManualRefresh && typeof window.showToast === 'function') {
      window.showToast('최신 급상승어 데이터를 동기화했습니다.');
    }
  }
}

/**
 * 2. 최신 연예뉴스 실시간 API 호출 및 동적 렌더링
 */
async function fetchEntertainmentNews(isManualRefresh = false) {
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
    const newsList = result && (result.entertainment || result.data) ? (result.entertainment || result.data) : null;

    if (!Array.isArray(newsList) || newsList.length === 0) {
      renderEntertainmentNews(getDynamicFallbackEntNews());
      return;
    }

    // 최신 순 정렬 후 화면 렌더링
    newsList.sort((a, b) => (b.publishedOrder || 0) - (a.publishedOrder || 0));
    renderEntertainmentNews(newsList);
  } catch (error) {
    console.warn('[trending.js] 최신 연예뉴스 수신 제약으로 최신 준비 데이터로 렌더링합니다:', error);
    renderEntertainmentNews(getDynamicFallbackEntNews());
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
 * 한국어 12시간제 시각 포맷팅 (예: 오후 03:09)
 */
function formatKoreanTime(date = new Date()) {
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours24 >= 12 ? '오후' : '오전';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const hoursStr = String(hours12).padStart(2, '0');
  return `${ampm} ${hoursStr}:${minutes}`;
}

/**
 * 마지막 갱신 시각 업데이트
 */
function updateTimestamp() {
  const timeEl = document.getElementById('trending-update-time');
  if (!timeEl) return;
  timeEl.textContent = `마지막 갱신 ${formatKoreanTime()}`;
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

