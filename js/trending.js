/**
 * 실시간 급상승어 모듈 (trending.js)
 * - 5대 포털(네이버, 네이트, 줌, 구글, 다음)의 실시간 급상승 키워드를 API에서 받아와 화면에 표시합니다.
 * - API 엔드포인트: https://www.boutique-info.com/api/keyword-center?action=getTrendingKeywords
 * - 로딩 상태 및 CORS/네트워크 에러 예외 처리 지원
 */

// 실시간 급상승어 CORS 우회 프록시 URL (file:// 로컬 환경 및 브라우저 CORS 차단 해결)
const proxyUrl = 'https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.boutique-info.com%2Fapi%2Fkeyword-center%3Faction%3DgetTrendingKeywords';

// 로컬 file:// 환경 또는 네트워크 차단 시 화면에 보여줄 기본 데이터 (Fallback Data)
const fallbackData = {
  "naver": [
    { "rank": 1, "keyword": "장상원 1인승 은메달" },
    { "rank": 2, "keyword": "강도범 무고 혐의 추" },
    { "rank": 3, "keyword": "추석에 어머니 잃은" },
    { "rank": 4, "keyword": "신유빈 탁구 여자단" },
    { "rank": 5, "keyword": "트럼프 이란 7일 계" },
    { "rank": 6, "keyword": "맨시티 재정 규정 위" },
    { "rank": 7, "keyword": "진양곤" },
    { "rank": 8, "keyword": "아시안게임 3x3 농구" },
    { "rank": 9, "keyword": "윤호중 장관의 외교" },
    { "rank": 10, "keyword": "죽음" }
  ],
  "nate": [
    { "rank": 1, "keyword": "아시안게임 동일" },
    { "rank": 2, "keyword": "추석 연휴 정체 상승" },
    { "rank": 3, "keyword": "김준호 아들 바보" },
    { "rank": 4, "keyword": "최수종 상승 1" },
    { "rank": 5, "keyword": "안세영 AG 2연패 상승" }
  ],
  "zum": [
    { "rank": 1, "keyword": "서울시 버스 파업 대책" },
    { "rank": 2, "keyword": "감사원 YTN 지분매각" },
    { "rank": 3, "keyword": "금감원 임직원 주식투자" },
    { "rank": 4, "keyword": "AI 표준기구 설립 논의" },
    { "rank": 5, "keyword": "가을 단풍 시기 예측" }
  ],
  "google": [
    { "rank": 1, "keyword": "엔비디아 주가" },
    { "rank": 2, "keyword": "손흥민" },
    { "rank": 3, "keyword": "오픈AI o1 모델" },
    { "rank": 4, "keyword": "애플 이벤트" },
    { "rank": 5, "keyword": "추석 기차표" }
  ],
  "daum": [
    { "rank": 1, "keyword": "MBC 이성주 사장 내정" },
    { "rank": 2, "keyword": "서울 버스 파업" },
    { "rank": 3, "keyword": "1241회 로또 당첨 번호" },
    { "rank": 4, "keyword": "사발렌카 US오픈 우승" },
    { "rank": 5, "keyword": "마운자로 국내 출시" }
  ]
};

// 포털별 검색 결과 연결 주소 생성 함수
const SEARCH_URL_BUILDERS = {
  naver: (kw) => `https://search.naver.com/search.naver?query=${encodeURIComponent(kw)}`,
  nate: (kw) => `https://search.daum.net/nate?q=${encodeURIComponent(kw)}`,
  zum: (kw) => `https://search.zum.com/search.zum?query=${encodeURIComponent(kw)}`,
  google: (kw) => `https://www.google.com/search?q=${encodeURIComponent(kw)}`,
  daum: (kw) => `https://search.daum.net/search?q=${encodeURIComponent(kw)}`
};

// 5대 포털 목록
const PORTALS = ['naver', 'nate', 'zum', 'google', 'daum'];

// 페이지 로드 시 실시간 급상승어 조회 시작
document.addEventListener('DOMContentLoaded', () => {
  fetchTrendingKeywords();

  // '실시간 갱신' 버튼 클릭 시 다시 API 호출
  const refreshBtn = document.getElementById('refresh-trending-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchTrendingKeywords(true);
    });
  }
});

/**
 * 실시간 급상승어 API를 호출(fetch)하는 함수
 * 로컬 file:// 환경이나 네트워크 차단 시 fallback 기본 데이터를 렌더링합니다.
 * @param {boolean} isManualRefresh 사용자가 직접 갱신 버튼을 눌렀는지 여부
 */
async function fetchTrendingKeywords(isManualRefresh = false) {
  // 1. 데이터를 가져오는 동안 "불러오는 중..." 로딩 UI 표시
  showLoadingState();

  try {
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`서버 응답 오류 (상태 코드: ${response.status})`);
    }

    // 프록시 응답 본문을 안전하게 텍스트로 읽은 후 JSON 파싱
    const textData = await response.text();
    let result;
    try {
      result = typeof textData === 'string' ? JSON.parse(textData) : textData;
    } catch (parseError) {
      throw new Error('응답 데이터를 JSON 형식으로 변환할 수 없습니다.');
    }

    // 응답 데이터 검증
    if (!result || !result.success || !result.data) {
      throw new Error('API 응답 결과가 올바르지 않습니다.');
    }

    // 2. 응답받은 데이터로 화면에 키워드 렌더링 (naver, nate 등)
    renderTrendingData(result.data);
    updateTimestamp();

    if (isManualRefresh && typeof window.showToast === 'function') {
      window.showToast('5대 포털 실시간 급상승어가 최신으로 갱신되었습니다! 🔄');
    }
  } catch (error) {
    // 3. 로컬 file:// 환경 또는 CORS/네트워크 차단 시 콘솔에 안내를 남기고 fallbackData 렌더링
    console.warn('[trending.js] 로컬 file:// 프로토콜 환경 또는 네트워크 제약으로 인해 Fallback(기본) 데이터로 렌더링합니다:', error);
    renderTrendingData(fallbackData);
    updateTimestamp();

    if (isManualRefresh && typeof window.showToast === 'function') {
      window.showToast('로컬 기본 급상승어 데이터로 갱신되었습니다. 🔄');
    }
  }
}

/**
 * 데이터 로딩 중 상태를 카드에 표시하는 함수
 */
function showLoadingState() {
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
 * 에러 발생 시 화면에 친절한 오류 안내 문구를 띄우는 함수
 * @param {Error} error 발생한 에러 객체
 */
function showErrorState(error) {
  const isCorsOrNetwork = error.name === 'TypeError' || String(error.message).includes('Failed to fetch');
  const errorText = isCorsOrNetwork
    ? '데이터를 불러오지 못했습니다. (네트워크 또는 보안/CORS 연결 문제)'
    : '데이터를 불러오는 중 문제가 발생했습니다.';

  PORTALS.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = `
      <li class="trending-error">
        <span>⚠️ ${escapeHtml(errorText)}</span>
      </li>
    `;
  });
}

/**
 * API에서 받은 포털별 키워드 배열을 순회하여 화면에 렌더링하는 함수
 * @param {Object} data API response.data 객체 (naver, nate, zum, google, daum 배열 포함)
 */
function renderTrendingData(data) {
  PORTALS.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = '';
    const items = data[portal];

    // 해당 포털의 키워드 배열이 없거나 비어있는 경우 처리
    if (!items || !Array.isArray(items) || items.length === 0) {
      listEl.innerHTML = '<li class="trending-empty">실시간 급상승어 데이터가 없습니다.</li>';
      return;
    }

    // 배열 순회하며 순위, 키워드, 검색 링크 생성
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
 * 마지막 갱신 시각 업데이트 함수
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
 * XSS(악성 스크립트 삽입) 방지를 위한 텍스트 이스케이프 함수
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
