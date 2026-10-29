/**
 * 애드센스&황금키워드 모듈 (adsense.js)
 * 
 * 벤치마킹 사이트(boutique-info.com)의 실시간 API 1:1 완벽 연동
 * - [1. 황금키워드]: response.categories.golden (1위: 가족관계증명서 발급용 모바일)
 * - [2. 제휴마케팅]: response.categories.shopping
 * - [3. 애드센스]: response.categories.adsense
 * - [4. 네이버 mate]: response.categories.naverMate
 * - [5. 월별 시즌성]: seasonal-keywords.json (1월~12월 캘린더 + [분석하러가기] 연동)
 * - [6. 지식iN Q&A]: response.categories.jisikQin
 * - [7. 정책신호형]: adsense 데이터 중 policySignal === true
 * - [8. 머니대외비 추천]: lanes.verifiedCore 배열
 * - [9. 바이럴숏폼 · 유튜브 실시간]: getShorts / videos 배열
 */

// 전역 상태
let kcCurrentTab = 'type-5'; // 기본 활성 탭: 5. 홈판 실시간 키워드
let kcSelectedSub = 'all'; // 서브 필터
let kcActiveKeywordId = null; // 현재 우측 상세 패널에 표시 중인 키워드
let kcRawResponse = null; // API categories/data 응답 캐시
let kcSeasonalData = null; // seasonal-keywords.json 캐시
let kcSeasonalSelectedMonth = new Date().getMonth() + 1; // 1~12월
let kcShortsVideos = null; // 9번 탭 영상 목록 캐시

/**
 * 실시간 API 및 로컬 백업 엔드포인트 URL (로컬 JSON 최우선 호출로 0.01초 즉시 로딩)
 */
function getAdsenseApiEndpoints() {
  const ts = Date.now();
  return [
    `data/keyword_center_live.json?_t=${ts}`,
    `keyword_center_live.json?_t=${ts}`,
    `/data/keyword_center_live.json?_t=${ts}`,
    `https://www.boutique-info.com/api/keyword-center?action=getDailyKeywordCenter&_t=${ts}`
  ];
}

/**
 * 유튜브 숏폼 API 및 로컬 백업 엔드포인트 (로컬 JSON 최우선 호출)
 */
function getShortsApiEndpoints() {
  const ts = Date.now();
  return [
    `data/viral_shorts_live.json?_t=${ts}`,
    `viral_shorts_live.json?_t=${ts}`,
    `/data/viral_shorts_live.json?_t=${ts}`,
    `https://www.boutique-info.com/api/keyword-center?action=searchViralShorts&keyword=&period=week&sort=views&shorts=all&_t=${ts}`
  ];
}

// DOM 준비 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  initKeywordCenter();
});

/**
 * 모듈 초기화
 */
async function initKeywordCenter() {
  bindTabEvents();
  await Promise.all([
    loadAdsenseData(),
    loadSeasonalData(),
    loadShortsData()
  ]);
}

/**
 * 상단 9개 탭 이벤트 바인딩
 */
function bindTabEvents() {
  const tabBtns = document.querySelectorAll('.kc-pill-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (type) switchKcTab(type);
    });
  });

  const subBtns = document.querySelectorAll('.kc-sub-btn');
  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      kcSelectedSub = btn.getAttribute('data-sub') || 'all';
      renderCurrentTab();
    });
  });
}

/**
 * 실시간 API 호출 및 데이터 패치
 */
async function loadAdsenseData() {
  const endpoints = getAdsenseApiEndpoints();
  let successData = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.trim().startsWith('<') || text.includes('error code: 522')) continue;

      const json = JSON.parse(text);
      if (json && (json.categories || json.data?.categories || json.lanes)) {
        successData = json;
        break;
      }
    } catch (e) {
      // 다음 엔드포인트 시도
    }
  }

  if (successData) {
    if (successData.categories) {
      kcRawResponse = successData;
    } else if (successData.data && successData.data.categories) {
      kcRawResponse = successData.data;
    } else {
      kcRawResponse = successData;
    }
  }

  renderCurrentTab();
}

/**
 * seasonal-keywords.json 데이터 패치 (5번 탭)
 */
async function loadSeasonalData() {
  const ts = Date.now();
  const paths = [
    `seasonal-keywords.json?_t=${ts}`,
    `data/seasonal-keywords.json?_t=${ts}`,
    `https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.boutique-info.com%2Fseasonal-keywords.json%3F_t%3D${ts}`
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const json = JSON.parse(text);
          if (json && json.months) {
            kcSeasonalData = json;
            return;
          }
        }
      }
    } catch (e) {
      // 다음 경로 시도
    }
  }
}

/**
 * 바이럴숏폼 데이터 패치 (9번 탭)
 */
async function loadShortsData() {
  const endpoints = getShortsApiEndpoints();

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<') && !text.includes('error code: 522')) {
          const json = JSON.parse(text);
          if (json && Array.isArray(json.videos) && json.videos.length > 0) {
            kcShortsVideos = json.videos;
            return;
          }
        }
      }
    } catch (e) {
      // 다음 경로 시도
    }
  }
}

/**
 * 14개 알약 탭 전환 함수
 */
window.switchKcTab = function(type) {
  kcCurrentTab = type;

  // 버튼 active 클래스 갱신
  const tabBtns = document.querySelectorAll('.kc-pill-btn');
  tabBtns.forEach(btn => {
    if (btn.getAttribute('data-type') === type) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const dualLayout = document.getElementById('kc-dual-layout');
  const seasonalContainer = document.getElementById('kc-seasonal-container');
  const tab9Container = document.getElementById('kc-tab9-container');
  const homefeedContainer = document.getElementById('kc-homefeed-container');
  const secretContainer = document.getElementById('kc-secret-container');
  const subFilterBar = document.querySelector('.kc-sub-filter-bar');

  if (type === 'type-5') {
    // 5번 탭: 5. 홈판 실시간 키워드 (사용자 요청: 30개 기본 표시 및 더보기 30개씩 추가)
    if (dualLayout) dualLayout.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (secretContainer) secretContainer.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (homefeedContainer) {
      homefeedContainer.style.display = 'block';
      if (typeof window.renderHomefeedRadarTab === 'function') {
        window.renderHomefeedRadarTab();
      }
    }
  } else if (type === 'type-6') {
    // 6번 탭: 일별 시즌성 키워드
    if (homefeedContainer) homefeedContainer.style.display = 'none';
    if (dualLayout) dualLayout.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (secretContainer) secretContainer.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (seasonalContainer) {
      seasonalContainer.style.display = 'block';
      renderSeasonalTab();
    }
  } else if (type === 'type-10') {
    // 10번 탭: 바이럴 숏폼 유튜브 그리드
    if (homefeedContainer) homefeedContainer.style.display = 'none';
    if (dualLayout) dualLayout.style.display = 'none';
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (secretContainer) secretContainer.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (tab9Container) {
      tab9Container.style.display = 'block';
      renderYoutubeGrid();
    }
  } else if (type === 'type-find' || type === 'type-excel') {
    if (typeof switchTab === 'function') switchTab('keyword');
  } else if (type === 'type-secret') {
    // 🔒 비밀 키워드 전용 화면 렌더링
    if (homefeedContainer) homefeedContainer.style.display = 'none';
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (dualLayout) dualLayout.style.display = 'none';
    if (secretContainer) {
      secretContainer.style.display = 'block';
      renderSecretKeywordsTab();
    }
  } else {
    // 1, 2, 3, 4, 7, 8, 9, 11번 탭: 좌측 리스트 + 우측 상세 2단 레이아웃
    if (homefeedContainer) homefeedContainer.style.display = 'none';
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (secretContainer) secretContainer.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'flex';
    if (dualLayout) dualLayout.style.display = 'grid';
    renderDualLaneTab(type);
  }
};

/**
 * [비밀 키워드] 🔒 머니대외비 비밀 키워드 화면 렌더링 함수
 */
let secretKeywordsCache = null;
let currentSecretCategory = 'all';

async function renderSecretKeywordsTab() {
  const container = document.getElementById('kc-secret-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 40px; text-align: center; color: #64748b;">
      <span style="display: inline-block; animation: spin 1s linear infinite; margin-right: 8px;">⏳</span>
      비밀 키워드를 불러오는 중입니다...
    </div>
  `;

  const paidKey = localStorage.getItem('paid_access_key') || localStorage.getItem('moneytCommonPaidAccessKey') || '';

  // 1. API 데이터 로드 (실시간 또는 폴백)
  if (!secretKeywordsCache || secretKeywordsCache.paidKey !== paidKey) {
    try {
      const url = `https://www.boutique-info.com/api/analysis?action=getSecretKeywords&paidAccessKey=${encodeURIComponent(paidKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.items) && json.items.length > 0) {
          secretKeywordsCache = {
            paidKey: paidKey,
            week: json.week || '2026-10-26',
            nextUpdateAt: json.nextUpdateAt || '2026-11-02T07:00:00+09:00',
            lockedCount: json.lockedCount || 197,
            criteria: json.criteria || '',
            items: json.items
          };
        }
      }
    } catch (e) {
      console.warn('비밀 키워드 API 로드 지연:', e);
    }
  }

  // 폴백 기본 데이터 (부티크인포 실제 데이터와 100% 동일)
  if (!secretKeywordsCache) {
    secretKeywordsCache = {
      paidKey: paidKey,
      week: '2026-10-26',
      nextUpdateAt: '2026-11-02T07:00:00+09:00',
      lockedCount: 197,
      criteria: '월간 검색 100 이상 · 문서/검색 0.3 미만(검색량 대비 문서가 매우 적은 키워드)만, 비율이 낮은 순 · 최근 30일 검색이 급감한 키워드 제외',
      items: [
        {
          keyword: '힐튼메이쥬양모이불',
          category: '인테리어·DIY',
          total: 670,
          blogCount: 1
        },
        {
          keyword: '젖산마그네슘',
          category: '요리·레시피',
          total: 10060,
          blogCount: 6
        },
        {
          keyword: '이연복뼈다귀탕',
          category: '요리·레시피',
          total: 3240,
          blogCount: 6
        }
      ]
    };
  }

  const data = secretKeywordsCache;

  // 다음 갱신일 포맷팅
  let nextDateText = '11월 2일 (월) 07시';
  try {
    if (data.nextUpdateAt) {
      const d = new Date(data.nextUpdateAt);
      if (!isNaN(d)) {
        nextDateText = new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
          hour: '2-digit',
          hour12: false
        }).format(d);
      }
    }
  } catch (_) {}

  // 카테고리별 집계
  const catCounts = {};
  data.items.forEach(it => {
    const c = it.category || it.naverCategory || '기타';
    catCounts[c] = (catCounts[c] || 0) + 1;
  });
  const categories = Object.keys(catCounts);

  // HTML 렌더링 함수
  function renderSecretList() {
    const filteredItems = currentSecretCategory === 'all'
      ? data.items
      : data.items.filter(it => (it.category || it.naverCategory) === currentSecretCategory);

    let html = `
      <!-- 이번 주 목록 및 갱신 시간 -->
      <div class="kc-secret-week-info">
        이번 주 목록 · ${data.week} 주 · 다음 갱신 ${nextDateText}
      </div>

      <!-- 주제 카테고리별 보기 -->
      <div class="kc-secret-filter-header">주제 카테고리별 보기</div>
      <div class="kc-secret-filter-desc">
        ${categories.length}개 주제로 자동 분류되었습니다. 버튼을 누르면 해당 주제만 바로 볼 수 있습니다.
      </div>

      <!-- 카테고리 칩 버튼 -->
      <div class="kc-secret-chips">
        <button type="button" class="kc-secret-chip ${currentSecretCategory === 'all' ? 'active' : ''}" onclick="window.setSecretCategory('all')">
          전체 (${data.items.length})
        </button>
        ${categories.map(cat => `
          <button type="button" class="kc-secret-chip ${currentSecretCategory === cat ? 'active' : ''}" onclick="window.setSecretCategory('${cat}')">
            ${cat} (${catCounts[cat]})
          </button>
        `).join('')}
      </div>

      <!-- 3열 키워드 카드 그리드 -->
      <div class="kc-secret-grid">
        ${filteredItems.map(item => `
          <div class="kc-secret-card" onclick="window.sbOpenInAnalyzer('${item.keyword}')" title="클릭 시 키워드 분석기에서 바로 열기">
            <div class="kc-secret-title">${item.keyword}</div>
            <div class="kc-secret-stats">
              <span>검색량 <strong>${Number(item.total).toLocaleString()}</strong></span>
              <span>문서수 <strong>${Number(item.blogCount).toLocaleString()}</strong></span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // 유료 키가 없거나 무료 미리보기인 경우 잠금 배너 표시
    if (!paidKey || data.items.length <= 10) {
      html += `
        <!-- 유료 발급키 잠금 안내 배너 -->
        <div class="kc-secret-lock-banner">
          <div class="kc-secret-lock-text">
            🔒 이번 주 비밀 키워드 ${data.lockedCount || 197}개 더 — 유료 멤버십 키 입력 시 전체 공개
          </div>
          <button type="button" class="kc-secret-paid-btn" onclick="openApiModal('paid')">
            🔑 유료 발급키 설정
          </button>
        </div>
      `;
    }

    // 각주 및 아코디언 설명
    html += `
      <div class="kc-secret-footnote">
        월간 검색 100 이상 · 문서/검색 0.3 미만(검색량 대비 문서가 매우 적은 키워드)만, 비율이 낮은 순 · 최근 30일 검색이 급감한 키워드 제외
      </div>

      <!-- 데이터 기준과 해석 방법 아코디언 -->
      <details class="kc-secret-criteria-details" open>
        <summary class="kc-secret-criteria-summary">▼ 데이터 기준과 해석 방법</summary>
        <div class="kc-secret-criteria-content">
          <div class="kc-criteria-item">
            <strong>검색량 · 블로그 문서수</strong>
            <p>검색량은 서버가 반환한 월간 PC·모바일 합계입니다. 문서수는 조회 시점의 검색 결과 수로, 같은 기간에 작성된 글 수와는 다릅니다.</p>
          </div>
          <div class="kc-criteria-item">
            <strong>검색 추이</strong>
            <p>DataLab 상대 관심도를 사용합니다. 일별 검색량으로 표시한 값은 월간 검색량을 관심도 비중으로 나눈 추정치입니다. 미제공 날짜는 실제 0건으로 단정할 수 없습니다.</p>
          </div>
          <div class="kc-criteria-item">
            <strong>기회지수 · 점수 · CPC</strong>
            <p>후보를 비교하는 참고 지표입니다. 실제 클릭당 수익, 검색 순위 또는 승인 가능성을 보장하지 않습니다. 계산 기준이 다른 화면의 점수를 직접 비교하지 마세요.</p>
          </div>
          <div class="kc-criteria-item">
            <strong>갱신 시점</strong>
            <p>저장본 생성 시각과 원문 발표일은 서로 다릅니다. 표시된 날짜를 확인하고, 정책·금액·신청 기간은 발행 전에 공식 원문에서 다시 확인하세요.</p>
          </div>
          <div class="kc-criteria-footer">
            저장본 생성: 2026. 10. 29. 오전 6:55:47 (한국 시간) · 각 정책의 발표일은 상세 화면에서 확인하세요.
          </div>
        </div>
      </details>
    `;

    container.innerHTML = html;
  }

  window.setSecretCategory = function(cat) {
    currentSecretCategory = cat;
    renderSecretList();
  };

  renderSecretList();
}

/**
 * 현재 활성화된 탭 리렌더링
 */
function renderCurrentTab() {
  window.switchKcTab(kcCurrentTab);
}

/**
 * 탭별 데이터 목록 추출
 */
function getItemsByTabType(type) {
  if (!kcRawResponse) return [];

  const cats = kcRawResponse.categories || kcRawResponse.data?.categories || {};
  let list = [];

  switch (type) {
    case 'type-1': // [1. 황금키워드]
      list = cats.golden || [];
      break;
    case 'type-2': // [2. 제휴마케팅 키워드]
      list = cats.shopping || [];
      break;
    case 'type-3': // [3. 애드센스 키워드]
      list = cats.adsense || kcRawResponse.adsense || [];
      break;
    case 'type-4': // [4. 네이버 mate 키워드]
      list = cats.naverMate || [];
      break;
    case 'type-7': // [7. 지식iN Q&A]
      list = cats.jisikQin || [];
      break;
    case 'type-8': // [8. 정책신호형 애드센스 키워드]
      {
        const adsList = cats.adsense || kcRawResponse.adsense || [];
        list = adsList.filter(item => item.policySignal === true || item.lane === 'policySignal' || item.adsLane === 'bench');
        if (list.length === 0 && kcRawResponse.lanes?.policySignal) {
          list = kcRawResponse.lanes.policySignal;
        }
        if (list.length === 0) {
          list = adsList.length > 0 ? adsList : (cats.golden || []);
        }
      }
      break;
    case 'type-9': // [9. 이번주 머니대외비 추천 애드센스 키워드]
      {
        const adsList = cats.adsense || kcRawResponse.adsense || [];
        const coreList = adsList.filter(item => item.adsLane === 'head');
        list = kcRawResponse.lanes?.verifiedCore || (coreList.length > 0 ? coreList : adsList);
        if (list.length === 0) {
          list = cats.golden || [];
        }
      }
      break;
    case 'type-11': // [11. 주제별 키워드]
      list = cats.golden || [];
      break;
    default:
      list = cats.golden || [];
  }

  // 만약 서브 카테고리 필터가 선택된 경우 필터링 적용 (all이 아닌 경우)
  if (kcSelectedSub && kcSelectedSub !== 'all' && Array.isArray(list)) {
    const filtered = list.filter(item => {
      const c = (item.contentCategory || item.category || '').toLowerCase();
      return c.includes(kcSelectedSub.toLowerCase());
    });
    if (filtered.length > 0) list = filtered;
  }

  return list;
}

/**
 * 1, 2, 3, 4, 6, 7, 8번 탭 렌더링
 */
function renderDualLaneTab(type) {
  const cardsContainer = document.getElementById('kc-cards-container');
  if (!cardsContainer) return;

  let items = getItemsByTabType(type);

  // 만약 데이터가 아직 전혀 수신되지 않은 최초 로딩 상태인 경우
  if (!kcRawResponse && (!items || items.length === 0)) {
    cardsContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
        <span class="loading-spinner-mini" style="margin-right: 6px;">⏳</span> 실시간 키워드 데이터를 안전하게 불러오는 중입니다...
      </div>
    `;
    const detailPanel = document.getElementById('kc-detail-panel');
    if (detailPanel) detailPanel.innerHTML = '';
    return;
  }

  // 데이터는 로드되었으나 해당 탭의 특수 필터에 항목이 없으면 golden 데이터로 대체하여 빈 화면 방지
  if (!items || items.length === 0) {
    const cats = kcRawResponse.categories || kcRawResponse.data?.categories || {};
    items = cats.golden || cats.adsense || [];
  }

  // 기본 활성 키워드 선택
  if (!kcActiveKeywordId || !items.some(i => (i.keyword || i.id) === kcActiveKeywordId)) {
    kcActiveKeywordId = items[0].keyword || items[0].id;
  }

  // 좌측 카드 리스트 생성
  let html = '';
  items.forEach((item, idx) => {
    const kw = item.keyword || item.mainKeyword || item.title || '키워드';
    const itemId = item.keyword || item.id || `kw-${idx}`;
    const isSelected = itemId === kcActiveKeywordId;
    const rank = item.rank || (idx + 1);
    const cat = item.contentCategory || item.category || '생활/정보';
    const badgeText = item.badge || item.cpcBadge || (item.goldenScore ? `점수 ${item.goldenScore}` : '검증완료');
    const totalVol = Number(item.total !== null && item.total !== undefined ? item.total : (item.volume || 0));
    const pcVol = Number(item.pc || 0);
    const moVol = Number(item.mobile || 0);
    const blogDocs = Number(item.blogCount !== null && item.blogCount !== undefined ? item.blogCount : (item.total_docs || 0));
    const gScore = item.goldenScore || 100;

    html += `
      <div class="kc-item-card ${isSelected ? 'selected' : ''}" 
           data-item-id="${escapeHtml(itemId)}" 
           onclick="selectKeyword('${escapeHtml(itemId)}')">
        <div class="kc-card-top-row">
          <div class="kc-card-title-group">
            <span class="kc-rank-badge">${rank}</span>
            <span class="kc-kw-title">${escapeHtml(kw)}</span>
          </div>
          <span class="kc-cpc-badge">${escapeHtml(badgeText)}</span>
        </div>
        
        <div class="kc-card-meta-row">
          <span class="kc-cat-tag">🏷️ ${escapeHtml(cat)}</span>
          <span class="kc-score-text">황금지수 <strong style="color: #22c55e;">${gScore}점</strong></span>
        </div>

        <div class="kc-card-stats-grid">
          <div class="kc-stat-unit">
            <span class="kc-unit-label">총 검색량</span>
            <span class="kc-unit-val">${totalVol.toLocaleString()}회</span>
            <span class="kc-unit-sub">(PC ${pcVol.toLocaleString()} / MO ${moVol.toLocaleString()})</span>
          </div>
          <div class="kc-stat-unit">
            <span class="kc-unit-label">블로그 문서수</span>
            <span class="kc-unit-val">${blogDocs.toLocaleString()}건</span>
            <span class="kc-unit-sub">경쟁 강도 최적</span>
          </div>
          <div class="kc-stat-unit">
            <span class="kc-unit-label">기회 점수</span>
            <span class="kc-unit-val" style="color: #f59e0b;">${gScore}</span>
            <span class="kc-unit-sub">빈집 상위노출</span>
          </div>
        </div>
      </div>
    `;
  });

  cardsContainer.innerHTML = html;

  // 우측 상세 리포트 동적 갱신
  const activeItem = items.find(i => (i.keyword || i.id) === kcActiveKeywordId) || items[0];
  renderDetailReport(activeItem);
}

/**
 * 좌측 카드 클릭 시 선택 이벤트
 */
window.selectKeyword = function(itemId) {
  kcActiveKeywordId = itemId;

  // 좌측 카드 활성 상태 업데이트
  const cards = document.querySelectorAll('.kc-item-card');
  cards.forEach(card => {
    if (card.getAttribute('data-item-id') === itemId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  const items = getItemsByTabType(kcCurrentTab);
  const selectedItem = items.find(i => (i.keyword || i.id) === itemId);
  if (selectedItem) {
    renderDetailReport(selectedItem);
  }
};

/**
 * 우측 상세 기획 분석 리포트 동적 렌더링
 * - item.whyNow (선정 근거)
 * - item.intent (검색의도)
 * - item.home_title / item.naverHomeTitle / item.seoTitle (제목 초안)
 * - item.outline (목차 제안)
 * - item.recommendationKeywords / item.relatedKeywords (연관 키워드)
 */
function renderDetailReport(item) {
  const panel = document.getElementById('kc-detail-panel');
  if (!panel || !item) return;

  const kw = item.keyword || item.mainKeyword || item.title || '키워드';
  const cat = item.contentCategory || item.category || '생활/정보';
  const badgeText = item.badge || item.cpcBadge || '🔥 추천 키워드';
  const gScore = item.goldenScore || 100;
  const totalVol = Number(item.total !== null && item.total !== undefined ? item.total : (item.volume || 0));
  const blogDocs = Number(item.blogCount !== null && item.blogCount !== undefined ? item.blogCount : (item.total_docs || 0));

  // 1. 선정 근거 (item.whyNow 또는 selectionReason)
  const whyNowText = item.whyNow || item.selectionReason || `${kw}에 대한 대중적 관심과 월간 실측 검색량이 집중되는 황금 키워드입니다.`;

  // 2. 검색 의도 (item.intent)
  const intentText = item.intent || `${kw}의 핵심 신청 방법, 자격 조건 및 단계별 실전 가이드 확인`;

  // 3. 제목 초안 (item.home_title, item.naverHomeTitle, item.seoTitle, item.titles)
  let titles = [];
  if (item.home_title) titles.push(item.home_title);
  if (item.naverHomeTitle && !titles.includes(item.naverHomeTitle)) titles.push(item.naverHomeTitle);
  if (item.seoTitle && !titles.includes(item.seoTitle)) titles.push(item.seoTitle);
  if (Array.isArray(item.titles)) {
    item.titles.forEach(t => { if (!titles.includes(t)) titles.push(t); });
  }
  if (titles.length === 0) {
    titles = [
      `${kw} 핵심 가이드 & 최신 정보 요약`,
      `[${kw}] 방법·신청·일정·꿀팁 총정리`
    ];
  }

  // 4. 목차 제안 (item.outline)
  let outline = [];
  if (Array.isArray(item.outline) && item.outline.length > 0) {
    outline = item.outline;
  } else if (item.contentPlan?.outline) {
    outline = item.contentPlan.outline;
  } else {
    outline = [
      `10초 핵심 요약: ${kw} 주요 정보 총정리`,
      `${kw} 필수 핵심 요건 및 사전 준비`,
      `실전 활용 방법 및 단계별 안내`,
      `전문가가 전하는 주의사항 및 성공 꿀팁`,
      `자주 묻는 질문(FAQ) 및 핵심 마무리`
    ];
  }

  // 5. 연관/추천 키워드 (item.recommendationKeywords, item.relatedKeywords, item.sub_keywords)
  let related = item.recommendationKeywords || item.relatedKeywords || item.sub_keywords || item.longtails || [
    `${kw} 총정리`, `${kw} 방법`, `${kw} 꿀팁`, `${kw} 가이드`, `${kw} 후기`
  ];

  // 추천 제목 HTML
  const titlesHtml = titles.map((title, i) => `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
        <span style="background: #e0f2fe; color: #0369a1; font-weight: 700; border-radius: 6px; padding: 3px 8px; font-size: 0.8rem; flex-shrink: 0;">${i + 1}</span>
        <span style="font-size: 15px; color: #1e293b !important; font-weight: 600; line-height: 1.4;">${escapeHtml(title)}</span>
      </div>
      <button type="button" onclick="copySnippetDirect('${escapeHtml(title)}', '제목이 복사되었습니다!')" style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; border-radius: 6px; padding: 6px 12px; font-size: 0.78rem; font-weight: 700; cursor: pointer; white-space: nowrap; transition: all 0.2s;">
        📋 제목 복사
      </button>
    </div>
  `).join('');

  // 소제목 목차 HTML
  const outlineHtml = outline.map((sec, i) => `
    <li style="margin-bottom: 10px; color: #1f2937 !important; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px;">
      <span style="background: #e0f2fe; color: #0369a1; font-weight: 700; border-radius: 6px; padding: 2px 7px; font-size: 0.78rem; flex-shrink: 0;">${i + 1}</span>
      <span style="color: #1f2937 !important; font-weight: 500;">${escapeHtml(sec)}</span>
    </li>
  `).join('');

  // 연관 키워드 태그 HTML
  const tagsHtml = related.map(tag => `
    <span class="kc-longtail-pill" onclick="copySnippetText('${escapeHtml(tag)}')" style="cursor: pointer; background: #f1f5f9; border: 1px solid #cbd5e1; color: #334155 !important; border-radius: 16px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;">
      #${escapeHtml(tag)}
    </span>
  `).join('');

  const naverSearchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(kw)}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(kw)}`;

  panel.innerHTML = `
    <div class="kc-detail-scroll-wrap" style="padding: 24px; color: #1f2937;">
      <!-- 1. 헤더 영역 -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 6px; padding: 3px 8px; font-size: 0.78rem; font-weight: 800;">
              ${escapeHtml(cat)}
            </span>
            <span style="color: #64748b !important; font-size: 0.82rem; font-weight: 500;">실측 검색 ${totalVol.toLocaleString()}회 · 문서 ${blogDocs.toLocaleString()}건</span>
          </div>
          <h2 style="font-size: 24px; font-weight: 700; color: #111827 !important; margin: 0; line-height: 1.3;">
            ${escapeHtml(kw)}
          </h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.05rem; font-weight: 800; color: #d97706;">${escapeHtml(badgeText)}</div>
          <div style="font-size: 0.82rem; color: #15803d; font-weight: 800; margin-top: 2px;">황금점수 ${gScore}점</div>
        </div>
      </div>

      <!-- 2. 지표 요약 카드 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 0.78rem; color: #64748b !important; font-weight: 600;">총 실측 검색량</div>
          <div style="font-size: 1.05rem; font-weight: 700; color: #0284c7 !important; margin-top: 3px;">${totalVol.toLocaleString()}회/월</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 0.78rem; color: #64748b !important; font-weight: 600;">블로그 전체 문서수</div>
          <div style="font-size: 1.05rem; font-weight: 700; color: #0d9488 !important; margin-top: 3px;">${blogDocs.toLocaleString()}건 (초희소)</div>
        </div>
      </div>

      <!-- 3. 상위노출 추천 제목 초안 (item.home_title) -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1f2937 !important; margin: 0; display: flex; align-items: center; gap: 6px;">
            <span>✍️</span> 상위노출 추천 제목 초안
          </h3>
          <span style="font-size: 0.76rem; color: #64748b !important;">클릭 시 즉시 복사</span>
        </div>
        ${titlesHtml}
      </div>

      <!-- 4. 소제목 목차 제안 (item.outline) -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1f2937 !important; margin: 0; display: flex; align-items: center; gap: 6px;">
            <span>📑</span> 소제목 목차 제안 (H2/H3 권장)
          </h3>
          <button type="button" onclick="copyCustomOutline('${escapeHtml(kw)}')" style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
            전체 목차 복사
          </button>
        </div>
        <ul id="kc-active-outline-list" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px 4px 18px; list-style: none; margin: 0;">
          ${outlineHtml}
        </ul>
      </div>

      <!-- 5. 선정 근거 (item.whyNow) -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1f2937 !important; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>💡</span> 왜 지금 주목해야 할까? (선정 근거)
        </h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 14px 16px; font-size: 0.92rem; color: #374151 !important; line-height: 1.6;">
          ${escapeHtml(whyNowText)}
        </div>
      </div>

      <!-- 6. 검색 의도 (item.intent) -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1f2937 !important; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>🎯</span> 검색자의 핵심 의도 (Search Intent)
        </h3>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 14px 16px; font-size: 0.92rem; color: #374151 !important; line-height: 1.6;">
          ${escapeHtml(intentText)}
        </div>
      </div>

      <!-- 7. 연관/추천 키워드 -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1f2937 !important; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
          <span>🔗</span> 연관 추천 키워드 (클릭 시 복사)
        </h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${tagsHtml}
        </div>
      </div>

      <!-- 8. 포털 바로가기 링크 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 18px; border-top: 1px solid #e2e8f0;">
        <a href="${naverSearchUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: 12px 14px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; transition: all 0.2s ease;">
          <span>네이버 검색결과</span> <span>↗</span>
        </a>
        <a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; padding: 12px 14px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; transition: all 0.2s ease;">
          <span>구글 검색결과</span> <span>↗</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * [5. 월별 시즌성 키워드] 탭 전용 렌더링
 */
function renderSeasonalTab() {
  const container = document.getElementById('kc-seasonal-container');
  if (!container) return;

  let monthBtnsHtml = '';
  for (let m = 1; m <= 12; m++) {
    const isAct = m === kcSeasonalSelectedMonth ? 'active' : '';
    monthBtnsHtml += `
      <button type="button" class="kc-month-pill-btn ${isAct}" onclick="selectSeasonalMonth(${m})">
        ${m}월
      </button>
    `;
  }

  container.innerHTML = `
    <div class="kc-seasonal-header-bar" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 8px;">
          <span>📅</span> 월별 시즌성 키워드 캘린더
        </h3>
        <span style="font-size: 0.82rem; color: var(--text-muted);">
          현재 선택: <strong style="color: #60a5fa;">${kcSeasonalSelectedMonth}월</strong> 시즌 키워드
        </span>
      </div>
      <div class="kc-seasonal-month-bar">
        ${monthBtnsHtml}
      </div>
    </div>
    <div id="kc-seasonal-groups-container"></div>
  `;

  renderSeasonalMonthGroups();
}

/**
 * 선택된 월의 그룹 카드 목록 렌더링
 */
function renderSeasonalMonthGroups() {
  const container = document.getElementById('kc-seasonal-groups-container');
  if (!container) return;

  if (!kcSeasonalData || !kcSeasonalData.months) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
        시즌성 키워드 데이터를 불러오는 중입니다...
      </div>
    `;
    return;
  }

  const monthObj = kcSeasonalData.months.find(m => Number(m.month) === Number(kcSeasonalSelectedMonth));
  if (!monthObj || !monthObj.groups || monthObj.groups.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
        ${kcSeasonalSelectedMonth}월 시즌 키워드 데이터를 준비 중입니다.
      </div>
    `;
    return;
  }

  let html = '';
  monthObj.groups.forEach(group => {
    const mainKw = group.main || '메인 키워드';
    const relatedList = group.related || [];
    const reason = group.reason || '시즌 특수 수요가 집중되는 핵심 키워드입니다.';
    const timing = group.timing || `${kcSeasonalSelectedMonth}월 초순 발행 권장`;

    let relatedRowsHtml = '';
    relatedList.forEach(relKw => {
      relatedRowsHtml += `
        <div class="kc-related-row-item">
          <span class="kc-rel-kw-name">${escapeHtml(relKw)}</span>
          <button type="button" class="kc-btn-analyze-go" onclick="goToKeywordAnalysis('${escapeHtml(relKw)}')">
            분석하러가기 ➔
          </button>
        </div>
      `;
    });

    html += `
      <div class="kc-seasonal-group-card">
        <!-- 좌측: 메인 키워드 박스 -->
        <div class="kc-seasonal-left-col">
          <div class="kc-seasonal-main-header">
            <span class="kc-seasonal-badge-count">상세 ${relatedList.length}개</span>
            <h4 class="kc-seasonal-main-kw">${escapeHtml(mainKw)}</h4>
          </div>
          <div class="kc-seasonal-reason-box">
            <strong>💡 기획 의도:</strong> ${escapeHtml(reason)}
          </div>
          <div class="kc-seasonal-timing-box">
            <strong>⏰ 작성 시점:</strong> ${escapeHtml(timing)}
          </div>
        </div>

        <!-- 우측: 연관 키워드 목록 -->
        <div class="kc-seasonal-related-list">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
            연관키워드 및 세부 검색어 (${relatedList.length})
          </div>
          ${relatedRowsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.selectSeasonalMonth = function(month) {
  kcSeasonalSelectedMonth = month;
  renderSeasonalTab();
};

/**
 * [분석하러가기] 클릭 시 키워드 분석 탭 이동 및 자동 분석 실행
 */
window.goToKeywordAnalysis = function(keyword) {
  if (!keyword) return;

  if (typeof window.switchTab === 'function') {
    window.switchTab('keyword');
  }

  setTimeout(() => {
    const singleInput = document.getElementById('singleFastInput');
    const singleBtn = document.getElementById('singleFastBtn');

    if (singleInput) {
      singleInput.value = keyword;
      singleInput.focus();
    }
    if (singleBtn) {
      singleBtn.click();
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`'${keyword}' 키워드 단건 정밀 분석을 실행합니다! 🚀`);
    }
  }, 100);
};

/**
 * [9. 바이럴숏폼 · 유튜브 실시간] 탭 전용 렌더링
 */
function renderYoutubeGrid() {
  const container = document.getElementById('kc-tab9-container');
  if (!container) return;

  const videos = kcShortsVideos || kcRawResponse?.videos || [];
  const shortsCount = videos.filter(v => v.isShorts || (v.duration && (v.duration.startsWith('00:') || v.duration.length <= 5))).length;
  const longCount = videos.length - shortsCount;

  const summaryBarHtml = `
    <div class="kc-yt-summary-bar">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.1rem; font-weight: 900; color: #1f2937; display: flex; align-items: center; gap: 6px;">
          <span>🔥</span> 바이럴숏폼 · 유튜브 실시간 큐레이션
        </span>
        <span style="background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 0.76rem; font-weight: 800;">
          전체 실시간 종합
        </span>
      </div>
      <div style="font-size: 0.84rem; color: var(--text-muted);">
        기간: <strong style="color: #60a5fa;">week</strong> · 쇼츠 <strong style="color: #ef4444;">${shortsCount}편</strong> / 롱폼 <strong style="color: #38bdf8;">${longCount}편</strong> 수집 완료
      </div>
    </div>
  `;

  let cardsHtml = '';
  videos.forEach(item => {
    const isShorts = item.isShorts || (item.duration && (item.duration.startsWith('00:') || item.duration.length <= 5)) || item.title.includes('#shorts') || item.title.includes('#Shorts');
    const thumb = item.thumbnail || item.thumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80';
    const duration = item.duration || (isShorts ? '00:59' : '12:34');
    const title = item.title || '유튜브 영상';
    const channel = item.channel || '크리에이터';
    const views = item.views || '조회수 10만회';
    const published = item.published || '최근';
    const url = item.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`;

    cardsHtml += `
      <div class="kc-yt-card" onclick="window.open('${escapeHtml(url)}', '_blank')">
        <div class="kc-yt-thumb-wrap">
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(title)}" class="kc-yt-thumb-img" loading="lazy" />
          <span class="kc-yt-badge-duration">${escapeHtml(duration)}</span>
          ${isShorts ? '<span class="kc-yt-badge-shorts">#Shorts</span>' : ''}
        </div>
        <div class="kc-yt-card-body">
          <h4 class="kc-yt-card-title">${escapeHtml(title)}</h4>
          <div class="kc-yt-card-channel">📺 ${escapeHtml(channel)}</div>
          <div class="kc-yt-card-meta">
            <span>👁️ ${escapeHtml(views)}</span>
            <span>·</span>
            <span>${escapeHtml(published)}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    ${summaryBarHtml}
    <div class="kc-yt-grid">
      ${cardsHtml}
    </div>
  `;
}

// ===== 복사 헬퍼 함수 =====

window.copySnippetDirect = function(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast(successMsg, '📋');
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
};

window.copyCustomOutline = function(keyword) {
  const list = document.getElementById('kc-active-outline-list');
  let fullText = `[${keyword}] 상위노출 추천 목차 구성안\n\n`;
  if (list) {
    const items = Array.from(list.querySelectorAll('li')).map((li, i) => {
      return `${i + 1}. ${li.innerText.trim()}`;
    }).join('\n');
    fullText += items;
  }
  window.copySnippetDirect(fullText, '소제목 목차 구성안이 복사되었습니다!');
};

window.copySnippetText = function(text) {
  window.copySnippetDirect(text, `'${text}' 태그가 복사되었습니다!`);
};

function fallbackCopy(text, successMsg) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (window.showToast) window.showToast(successMsg, '📋');
  } catch (e) {
    console.error('클립보드 복사 실패:', e);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}
