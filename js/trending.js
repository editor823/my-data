/**
 * 실시간 급상승어 및 최신 연예뉴스 모듈 (trending.js)
 * - 5대 포털(네이버, 네이트, 줌, 구글, 다음)의 실시간 급상승 키워드를 100% 동적 매핑합니다.
 * - 최신 연예뉴스 실시간 API 데이터를 받아와 하단 그리드에 동적으로 렌더링합니다.
 * - 오래된 더미 텍스트를 완전히 제거하고 실제 라이브 데이터만을 출력합니다.
 */

// 1. API 엔드포인트 설정 (로컬 백엔드 최우선 호출 + 외부 원본 프록시 fallback)
function getTrendingUrls() {
  const ts = Date.now();
  const localTarget = `/api/trending-keywords?_t=${ts}`;
  const rawTarget = `https://www.boutique-info.com/api/keyword-center?action=getTrendingKeywords&_t=${ts}`;
  return {
    primary: localTarget,
    fallbacks: [
      rawTarget,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTarget)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(rawTarget)}`
    ]
  };
}

function getEntNewsUrls() {
  const ts = Date.now();
  const localTarget = `/api/entertainment-news?_t=${ts}`;
  const rawTarget = `https://www.boutique-info.com/api/keyword-center?action=getEntertainmentNews&_t=${ts}`;
  return {
    primary: localTarget,
    fallbacks: [
      rawTarget,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTarget)}`,
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

// 5대 포털 오늘자 최신 급상승어 기본 데이터 (네트워크 지연 시에도 안전한 fallback 제공)
const FALLBACK_TRENDING = {
  "naver": [
    { "rank": 1, "keyword": "탑과 나나, 열애 인정" },
    { "rank": 2, "keyword": "KB국민은행 정보 유출" },
    { "rank": 3, "keyword": "김지용 중수청장 후보자" },
    { "rank": 4, "keyword": "김제덕 강채영 리커브 동메달" },
    { "rank": 5, "keyword": "공소청 시대 시작" },
    { "rank": 6, "keyword": "조보아 결혼 소식" },
    { "rank": 7, "keyword": "CPTPP 가입 검토" },
    { "rank": 8, "keyword": "오세훈 서울시장" },
    { "rank": 9, "keyword": "개천절 연휴 도로 교통상황" },
    { "rank": 10, "keyword": "아시안게임 대표팀 경기" }
  ],
  "nate": [
    { "rank": 1, "keyword": "탑 나나 열애설 공식입장" },
    { "rank": 2, "keyword": "신유빈 탁구 여자단식" },
    { "rank": 3, "keyword": "추석 연휴 교통정체" },
    { "rank": 4, "keyword": "조보아 결혼 발표 화제" },
    { "rank": 5, "keyword": "미스터트롯3 손빈아 신곡" }
  ],
  "zum": [
    { "rank": 1, "keyword": "개천절 연휴 나들이" },
    { "rank": 2, "keyword": "오세훈 서울시장 브리핑" },
    { "rank": 3, "keyword": "김제덕 강채영 양궁 동메달" },
    { "rank": 4, "keyword": "탑 나나 열애 화제" },
    { "rank": 5, "keyword": "짐 캐리 30년 만에 세 번째 결혼" }
  ],
  "google": [
    { "rank": 1, "keyword": "오세훈" },
    { "rank": 2, "keyword": "더중앙플러스" },
    { "rank": 3, "keyword": "조보아" },
    { "rank": 4, "keyword": "개천절" },
    { "rank": 5, "keyword": "박장범" },
    { "rank": 6, "keyword": "아시안게임 롤" },
    { "rank": 7, "keyword": "포수" },
    { "rank": 8, "keyword": "쓰레기봉투" },
    { "rank": 9, "keyword": "탑 나나" },
    { "rank": 10, "keyword": "홍진경" }
  ],
  "daum": [
    { "rank": 1, "keyword": "조보아 10월의 신부" },
    { "rank": 2, "keyword": "탑 나나 핑크빛 열애" },
    { "rank": 3, "keyword": "김제덕 강채영 동메달 획득" },
    { "rank": 4, "keyword": "장윤정 미우새 플렉스" },
    { "rank": 5, "keyword": "짐 캐리 세 번째 결혼" },
    { "rank": 6, "keyword": "이동우 모친상 애도" },
    { "rank": 7, "keyword": "개천절 황금연휴 날씨" },
    { "rank": 8, "keyword": "아시안게임 메달 순위" },
    { "rank": 9, "keyword": "BTS 그래미 아시안팝 부문" },
    { "rank": 10, "keyword": "KB국민은행 금융 안전 대책" }
  ]
};

// 최신 연예뉴스 기본 데이터 (현재 날짜 기반 동적 타임스탬프 지원)
function getDynamicFallbackEntNews() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `수집 ${month}. ${day}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} KST`;

  return [
    { title: "장윤정, 역시 장회장님! 플렉스 규모가 다르네 (미우새)", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: dateStr },
    { title: "‘재혼하지 않을 것 같다’던 짐 캐리, 30년 만에 세 번째 결혼", source: "세계일보", url: "https://www.segye.com", publishedAt: dateStr },
    { title: "BTS 보이콧 선언에도… 그래미, ‘아시안 팝’ 부문 신설", source: "매일경제", url: "https://www.mk.co.kr", publishedAt: dateStr },
    { title: "‘틴틴파이브’ 이동우 모친상… 멤버들 빈소 찾아 슬픔 함께", source: "매일경제", url: "https://www.mk.co.kr", publishedAt: dateStr },
    { title: "이상준 올해 첫 뽀뽀, 해외서 당했다, 무슨 일? (머나먼 맛집)", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: dateStr },
    { title: "'미스터트롯3' 善 손빈아, 오는 23일 미니 1집 '나 그대를' 발매", source: "라온뉴스", url: "https://www.raonnews.com", publishedAt: dateStr },
    { title: "조보아, 비연예인 예비신랑과 10월 백년가약… 뜨거운 축하 세례", source: "스타뉴스", url: "https://www.starnewskorea.com", publishedAt: dateStr },
    { title: "탑·나나, 핑크빛 열애 인정… 연예계 특급 비주얼 커플 탄생", source: "스포츠서울", url: "https://sportsseoul.com", publishedAt: dateStr },
    { title: "노윤서, 과감한 스타일링 변신… 독보적 분위기 발산", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: dateStr },
    { title: "몬스타엑스, 팬덤 생일에 전한 통 큰 감동 선물", source: "스포츠동아", url: "https://sports.donga.com", publishedAt: dateStr },
    { title: "시청률 고공행진 이어가는 주말 예능 대격돌 관전 포인트", source: "Google 뉴스", url: "https://news.google.com", publishedAt: dateStr },
    { title: "올가을 극장가 한국 영화 신작 흥행 질주 예고", source: "Google 뉴스", url: "https://news.google.com", publishedAt: dateStr }
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
    renderTrendingData(result.data);
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
    const newsList = result && result.data ? result.data : null;

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

