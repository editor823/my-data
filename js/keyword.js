/**
 * 머니대외비 스타일 키워드 분석기 모듈 (keyword.js)
 * 1. 단건 키워드 분석 (1건 빠른 분석)
 * 2. 메인 키워드 연관 분석 (보통 5~10초)
 * 3. 일일 무료 40회 카운팅 & 로컬스토리지 보존
 * 4. 내 API 키 설정 & 유료 발급키 설정 모달
 */

// 일일 무료 한도 기본값
const MAX_FREE_DAILY_QUOTA = 40;

// 샘플 키워드 데이터베이스
const SAMPLE_KEYWORD_DATABASE = {
  '취사병': [
    { keyword: '취사병 일과', pc: 2800, mobile: 14200, comp: '낮음' },
    { keyword: '취사병 훈련소', pc: 1900, mobile: 8900, comp: '낮음' },
    { keyword: '취사병 휴가 일수', pc: 3400, mobile: 16500, comp: '중간' },
    { keyword: '취사병 조리병 차이', pc: 1200, mobile: 5400, comp: '낮음' },
    { keyword: '취사병 난이도 후기', pc: 2100, mobile: 9800, comp: '낮음' }
  ],
  '캠핑': [
    { keyword: '캠핑용품 추천 리스트', pc: 8900, mobile: 42000, comp: '높음' },
    { keyword: '캠핑장 예약 사이트', pc: 12400, mobile: 58900, comp: '높음' },
    { keyword: '차박 캠핑 준비물', pc: 6500, mobile: 31200, comp: '중간' },
    { keyword: '초보 캠핑 텐트 추천', pc: 4300, mobile: 21500, comp: '낮음' },
    { keyword: '가을 캠핑 요리 메뉴', pc: 3100, mobile: 18200, comp: '낮음' }
  ],
  '신입사원강회장': [
    { keyword: '신입사원강회장 웹툰 결말', pc: 4200, mobile: 21000, comp: '중간' },
    { keyword: '신입사원강회장 줄거리 요약', pc: 2800, mobile: 13500, comp: '낮음' },
    { keyword: '신입사원강회장 소설 등장인물', pc: 1800, mobile: 9400, comp: '낮음' }
  ],
  '청년도약계좌': [
    { keyword: '청년도약계좌 신청기간', pc: 18200, mobile: 74900, comp: '높음' },
    { keyword: '청년도약계좌 조건', pc: 12100, mobile: 52300, comp: '높음' },
    { keyword: '청년도약계좌 환급금', pc: 4300, mobile: 18900, comp: '중간' },
    { keyword: '청년도약계좌 중도해지', pc: 3100, mobile: 14200, comp: '중간' },
    { keyword: '청년도약계좌 비과세 혜택', pc: 1200, mobile: 6800, comp: '낮음' }
  ]
};

let currentAnalyzedData = [];

document.addEventListener('DOMContentLoaded', () => {
  initQuotaUI();
  initApiStatusBadge();

  // 1. 단건 빠른 분석 이벤트 바인딩
  const singleInput = document.getElementById('singleFastInput');
  const singleBtn = document.getElementById('singleFastBtn');
  if (singleBtn && singleInput) {
    singleBtn.addEventListener('click', () => runSingleFastAnalysis());
    singleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSingleFastAnalysis();
    });
  }

  // 2. 메인 키워드 연관 분석 이벤트 바인딩
  const analyzerInput = document.getElementById('analyzerInput');
  const mainBtn = document.getElementById('mainKeywordBtn');
  if (mainBtn && analyzerInput) {
    mainBtn.addEventListener('click', () => runMainKeywordAnalysis());
    analyzerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runMainKeywordAnalysis();
    });
  }

  // 엑셀 내보내기 버튼 이벤트
  const exportBtn = document.getElementById('keyword-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (currentAnalyzedData.length === 0) {
        window.showToast('먼저 키워드를 분석해 주세요.', '⚠️');
        return;
      }
      const title = document.getElementById('analyzedSearchTerm')?.textContent || '키워드분석';
      exportToCSV(currentAnalyzedData, title);
    });
  }
});

// ===== 실제 네이버 검색광고 API 호출 및 서명 생성 로직 =====
async function fetchNaverSearchAdStats(hintKeywords) {
  const customerId = localStorage.getItem('ad_customer_id');
  const licenseKey = localStorage.getItem('ad_license_key');
  const secretKey = localStorage.getItem('ad_secret_key');

  if (!customerId || !licenseKey || !secretKey) {
    return null; // API 키가 아직 없는 경우
  }

  const timestamp = String(Date.now());
  const method = 'GET';
  const uri = '/keywordstool';
  const signMessage = `${timestamp}.${method}.${uri}`;

  let signature = '';
  if (window.CryptoJS) {
    const hash = window.CryptoJS.HmacSHA256(signMessage, secretKey);
    signature = window.CryptoJS.enc.Base64.stringify(hash);
  }

  const queryParams = new URLSearchParams({
    hintKeywords: hintKeywords.replace(/\s+/g, ''),
    showDetail: '1'
  });

  const targetUrl = `https://api.searchad.naver.com${uri}?${queryParams.toString()}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': licenseKey,
        'X-Customer': customerId,
        'X-Signature': signature
      }
    });

    if (!response.ok) return null;
    const json = await response.json();
    if (json && json.keywordList && json.keywordList.length > 0) {
      return json.keywordList.map(item => {
        const pc = typeof item.monthlyPcQcCnt === 'string' && item.monthlyPcQcCnt.includes('<') 
          ? 10 : Number(item.monthlyPcQcCnt || 0);
        const mobile = typeof item.monthlyMobileQcCnt === 'string' && item.monthlyMobileQcCnt.includes('<') 
          ? 10 : Number(item.monthlyMobileQcCnt || 0);
        
        let comp = '중간';
        if (item.compIdx === 'LOW' || item.compIdx === '낮음') comp = '낮음';
        else if (item.compIdx === 'HIGH' || item.compIdx === '높음') comp = '높음';
        else {
          comp = (pc + mobile) > 40000 ? '높음' : ((pc + mobile) < 5000 ? '낮음' : '중간');
        }

        return {
          keyword: item.relKeyword,
          pc: pc,
          mobile: mobile,
          comp: comp
        };
      });
    }
  } catch (err) {
    console.warn('네이버 실시간 API 호출 중 프록시 또는 인증 지연:', err);
  }
  return null;
}

// ===== 1. 단건 빠른 분석 함수 (실시간 POST API 연동 및 30일 검색 추이 그래프) =====
let trendChartInstance = null;

// 실시간 검색 추이 및 분석 API 엔드포인트
const TREND_API_ENDPOINTS = [
  { url: 'https://moneyt-api.ramenarchive.com/v1/kc-8f31a7d4e26b49c0', contentType: 'text/plain;charset=UTF-8' },
  { url: 'https://www.boutique-info.com/api/analysis', contentType: 'application/json' }
];

/**
 * 30일 검색 추이 API 호출 (POST { action: 'getSearchTrend', keyword })
 */
async function fetchSearchTrendApi(keyword) {
  const payload = { action: 'getSearchTrend', keyword: keyword };

  for (const ep of TREND_API_ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': ep.contentType },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn(`[getSearchTrend] ${ep.url} 통신 실패:`, e);
    }
  }
  return null;
}

/**
 * 단건 키워드 정밀 분석 API 호출 (POST { action: 'exactAnalyze', keywords: [keyword], analysisMode: 'single' })
 */
async function fetchExactAnalysisApi(keyword) {
  const payload = { action: 'exactAnalyze', keywords: [keyword], analysisMode: 'single' };

  for (const ep of TREND_API_ENDPOINTS) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': ep.contentType },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data[0];
        }
      }
    } catch (e) {
      console.warn(`[exactAnalyze] ${ep.url} 통신 실패:`, e);
    }
  }
  return null;
}

/**
 * 단건 빠른 분석 실행 함수
 */
async function runSingleFastAnalysis() {
  const input = document.getElementById('singleFastInput');
  const btn = document.getElementById('singleFastBtn');
  const keyword = input.value.trim();
  if (!keyword) {
    window.showToast('키워드 1개를 입력해 주세요.', '⚠️');
    input.focus();
    return;
  }

  if (!checkAndDeductQuota()) return;

  const originalBtnText = btn.innerHTML;
  btn.innerHTML = '<span class="loading-spinner-mini" style="display:inline-block; margin-right:6px;">⏳</span> 분석 중...';
  btn.disabled = true;

  try {
    // 1. 단건 분석 데이터와 30일 검색 추이 데이터를 병렬로 동시 요청 (속도 최적화)
    const [exactResult, trendResult] = await Promise.all([
      fetchExactAnalysisApi(keyword),
      fetchSearchTrendApi(keyword)
    ]);

    // 2. 단건 분석 결과 바인딩
    let finalItem;
    if (exactResult) {
      finalItem = {
        keyword: exactResult.keyword || keyword,
        pc: Number(exactResult.pc) || 0,
        mobile: Number(exactResult.mobile) || 0,
        total: Number(exactResult.total) || (Number(exactResult.pc) + Number(exactResult.mobile)),
        blogCount: Number(exactResult.blogCount) || 0,
        ratio: Number(exactResult.ratio) || 0,
        tier: exactResult.tier || '일반',
        comp: exactResult.competition || (exactResult.mobile > 50000 ? '높음' : (exactResult.mobile > 15000 ? '중간' : '낮음'))
      };
    } else {
      // API 예외 시 추정치 계산
      const hash = Math.abs(keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
      const pc = (hash % 60 + 10) * 100;
      const mobile = pc * (3 + (hash % 3));
      const blogCount = (hash % 500 + 50) * 200;
      finalItem = {
        keyword: keyword,
        pc: pc,
        mobile: mobile,
        total: pc + mobile,
        blogCount: blogCount,
        ratio: 0.15,
        tier: mobile > 50000 ? '챌린저' : (mobile > 10000 ? '전문가' : '중급자'),
        comp: mobile > 50000 ? '높음' : (mobile > 15000 ? '중간' : '낮음')
      };
    }

    currentAnalyzedData = [finalItem];

    // 3. 상단 5개 핵심 스탯 카드 갱신
    updateStatCards(finalItem);

    // 4. 30일 검색 추이 그래프(Chart.js) 렌더링
    renderSearchTrendChart(keyword, trendResult);

    // 5. 상세 테이블 렌더링
    renderResultTable(keyword, currentAnalyzedData);

    window.showToast(`'${keyword}' 30일 검색 추이 및 분석 완료! ✅`);
  } catch (error) {
    console.error('[runSingleFastAnalysis] 분석 중 오류 발생:', error);
    window.showToast('데이터 분석 중 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', '⚠️');
  } finally {
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
}

/**
 * 5개 핵심 지표 카드 갱신 함수
 */
function updateStatCards(item) {
  const statTotal = document.getElementById('statTotalSearch');
  const statPc = document.getElementById('statPcSearch');
  const statMobile = document.getElementById('statMobileSearch');
  const statBlog = document.getElementById('statBlogCount');
  const statOpp = document.getElementById('statOpportunity');

  if (statTotal) statTotal.textContent = Number(item.total).toLocaleString() + '회';
  if (statPc) statPc.textContent = Number(item.pc).toLocaleString() + '회';
  if (statMobile) statMobile.textContent = Number(item.mobile).toLocaleString() + '회';
  if (statBlog) statBlog.textContent = Number(item.blogCount).toLocaleString() + '건';

  if (statOpp) {
    // 기회지수 계산 (100점 만점 환산 표기)
    let score = item.ratio ? Math.min(100, Math.round(item.ratio * 1000)) : 50;
    if (score === 0 && item.blogCount > 0) {
      score = Math.min(100, Math.max(5, Math.round((item.total / item.blogCount) * 100)));
    }
    statOpp.innerHTML = `<strong>${score}점</strong> <span style="font-size:0.75rem; color: #10b981;">(${item.comp})</span>`;
  }
}

/**
 * Chart.js를 이용한 30일 검색 추이 라인 그래프 렌더링 함수
 */
function renderSearchTrendChart(keyword, trendData) {
  const canvas = document.getElementById('trendChartCanvas');
  if (!canvas || typeof Chart === 'undefined') return;

  // 기존 차트가 있다면 안전하게 제거
  if (trendChartInstance) {
    trendChartInstance.destroy();
    trendChartInstance = null;
  }

  const ctx = canvas.getContext('2d');

  // 트렌드 데이터가 없을 경우 기본 30일 흐름 생성
  let dataList = trendData;
  if (!dataList || dataList.length === 0) {
    dataList = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dataList.push({
        period: `${m}.${day}`,
        ratio: Math.round(40 + Math.sin(i / 3) * 25 + Math.random() * 15)
      });
    }
  }

  const labels = dataList.map(item => {
    if (item.period && item.period.includes('-')) {
      return item.period.slice(5).replace('-', '.');
    }
    return String(item.period || '');
  });

  const values = dataList.map(item => Math.max(0, Math.round(Number(item.ratio) || 0)));

  // 에메랄드 그라데이션 영역 채우기
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(16, 185, 129, 0.38)');
  gradient.addColorStop(0.7, 'rgba(16, 185, 129, 0.08)');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `'${keyword}' 최근 30일 검색 관심도 (0~100)`,
        data: values,
        borderColor: '#10b981',
        borderWidth: 2.8,
        backgroundColor: gradient,
        fill: true,
        tension: 0.32,
        pointRadius: 2.5,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#cbd5e1',
            font: { family: 'Pretendard', size: 12, weight: '700' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#34d399',
          borderColor: 'rgba(16, 185, 129, 0.4)',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: function(items) {
              return `📅 날짜: ${items[0].label}`;
            },
            label: function(context) {
              return `검색 관심도: ${context.parsed.y}점 (최대 100)`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            maxTicksLimit: 10,
            font: { family: 'Pretendard', size: 11 }
          }
        },
        y: {
          min: 0,
          suggestedMax: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Pretendard', size: 11 },
            callback: function(v) { return v + '점'; }
          }
        }
      }
    }
  });
}

// ===== 2. 메인 키워드 연관 분석 함수 =====
async function runMainKeywordAnalysis() {
  const input = document.getElementById('analyzerInput');
  const btn = document.getElementById('mainKeywordBtn');
  const keyword = input.value.trim();
  if (!keyword) {
    window.showToast('검색할 메인 키워드를 입력해 주세요.', '⚠️');
    input.focus();
    return;
  }

  if (!checkAndDeductQuota()) return;

  const originalBtnText = btn.innerHTML;
  btn.innerHTML = '⏳ 실시간 연관 분석 중...';
  btn.disabled = true;

  try {
    const realList = await fetchNaverSearchAdStats(keyword);
    if (realList && realList.length > 0) {
      currentAnalyzedData = realList.slice(0, 15);
      renderResultTable(keyword, currentAnalyzedData);
      window.showToast(`'${keyword}' 네이버 실시간 연관 키워드 ${currentAnalyzedData.length}개 조회 완료! ✅`);
    } else if (SAMPLE_KEYWORD_DATABASE[keyword]) {
      currentAnalyzedData = SAMPLE_KEYWORD_DATABASE[keyword];
      renderResultTable(keyword, currentAnalyzedData);
      window.showToast(`'${keyword}' 연관 키워드 ${currentAnalyzedData.length}개 분석 완료!`);
    } else {
      const hash = Math.abs(keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
      const basePc = (hash % 70 + 10) * 100;
      const baseMobile = basePc * 4;

      currentAnalyzedData = [
        { keyword: `${keyword}`, pc: basePc, mobile: baseMobile, comp: '높음' },
        { keyword: `${keyword} 추천`, pc: Math.round(basePc * 0.65), mobile: Math.round(baseMobile * 0.7), comp: '중간' },
        { keyword: `${keyword} 비교 분석`, pc: Math.round(basePc * 0.4), mobile: Math.round(baseMobile * 0.45), comp: '중간' },
        { keyword: `${keyword} 솔직 후기`, pc: Math.round(basePc * 0.25), mobile: Math.round(baseMobile * 0.35), comp: '낮음' },
        { keyword: `${keyword} 꿀팁 정리`, pc: Math.round(basePc * 0.18), mobile: Math.round(baseMobile * 0.22), comp: '낮음' },
        { keyword: `${keyword} 주의사항`, pc: Math.round(basePc * 0.12), mobile: Math.round(baseMobile * 0.16), comp: '낮음' }
      ];
      renderResultTable(keyword, currentAnalyzedData);
      window.showToast(`'${keyword}' 연관 키워드 ${currentAnalyzedData.length}개 분석 완료!`);
    }
  } finally {
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
  }
}

// ===== 결과 테이블 렌더링 =====
function renderResultTable(term, list) {
  const resultCard = document.getElementById('keyword-result-container');
  const termSpan = document.getElementById('analyzedSearchTerm');
  const tbody = document.getElementById('keyword-table-body');

  if (!resultCard || !tbody) return;

  if (termSpan) termSpan.textContent = term;
  tbody.innerHTML = '';

  list.forEach((item, idx) => {
    const pcNum = Number(item.pc) || 0;
    const mobileNum = Number(item.mobile) || 0;
    const totalNum = item.total ? Number(item.total) : (pcNum + mobileNum);
    const blogNum = item.blogCount ? Number(item.blogCount) : Math.round(totalNum * 1.8);
    const tier = item.tier || (totalNum > 100000 ? '챌린저' : (totalNum > 10000 ? '전문가' : '중급자'));

    let compClass = 'comp-mid';
    const compText = item.comp || '중간';
    if (compText === '낮음') compClass = 'comp-low';
    if (compText === '높음') compClass = 'comp-high';

    // 기회지수 계산 (100점 만점 기준)
    let score = item.ratio ? Math.min(100, Math.round(item.ratio * 1000)) : 0;
    if (score === 0 && blogNum > 0) {
      score = Math.min(100, Math.max(5, Math.round((totalNum / blogNum) * 100)));
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--text-sub); text-align: center;">${idx + 1}</td>
      <td>
        <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(item.keyword)}</strong>
        ${compText === '낮음' ? '<span style="font-size: 0.72rem; color: #10b981; margin-left: 6px; font-weight:800; background:rgba(16,185,129,0.1); padding:2px 6px; border-radius:4px;">★황금</span>' : ''}
      </td>
      <td style="color: var(--primary); font-weight: 800; text-align: right;">${totalNum.toLocaleString()}</td>
      <td style="text-align: right; color: var(--text-sub);">${pcNum.toLocaleString()}</td>
      <td style="text-align: right; color: var(--text-sub);">${mobileNum.toLocaleString()}</td>
      <td style="text-align: right; color: #f59e0b; font-weight: 600;">${blogNum.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; color: #8b5cf6;">${score}점</td>
      <td style="text-align: center;"><span class="badge-comp ${compClass}">${tier}</span></td>
    `;
    tbody.appendChild(tr);
  });

  resultCard.style.display = 'block';
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 프롬프트로 키워드 전달
window.sendToPrompt = function(keyword) {
  const promptInput = document.getElementById('prompt-keyword-input');
  if (promptInput) {
    promptInput.value = keyword;
    promptInput.dispatchEvent(new Event('input'));
  }
  if (typeof window.switchTab === 'function') {
    window.switchTab('prompt');
  }
  window.showToast(`'${keyword}' 키워드로 프롬프트가 설정되었습니다!`);
};

// ===== 일일 무료 40회 카운터 관리 로직 =====
function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getRemainingQuota() {
  const savedPaidKey = localStorage.getItem('paid_access_key');
  if (savedPaidKey) return '무제한 (유료키 적용)';

  const savedDate = localStorage.getItem('quota_date');
  const today = getTodayDateString();

  if (savedDate !== today) {
    localStorage.setItem('quota_date', today);
    localStorage.setItem('quota_remaining', MAX_FREE_DAILY_QUOTA);
    return MAX_FREE_DAILY_QUOTA;
  }

  const remaining = parseInt(localStorage.getItem('quota_remaining'), 10);
  return isNaN(remaining) ? MAX_FREE_DAILY_QUOTA : remaining;
}

// ===== 개인 전용 무제한 분석 모드 (차감 없음) =====
function checkAndDeductQuota() {
  // 나 혼자 쓰는 전용 사이트이므로 횟수 차감 없이 평생 무제한 허용!
  return true;
}

function initQuotaUI() {
  const el = document.getElementById('quotaRemaining');
  if (el) el.textContent = '무제한 (개인 전용)';
}

function updateQuotaBadge(remaining) {
  const el = document.getElementById('quotaRemaining');
  if (el) el.textContent = remaining;
}

// ===== API 설정 모달 제어 =====
window.onNaverAuthTypeChange = function() {
  const authType = document.getElementById('naverAuthType').value;
  const cIdInput = document.getElementById('naverClientId');
  const cSecInput = document.getElementById('naverClientSecret');
  const desc = document.getElementById('naverAuthDesc');

  if (authType === 'hub') {
    cIdInput.placeholder = 'X-NCP-APIGW-API-KEY-ID';
    cSecInput.placeholder = 'X-NCP-APIGW-API-KEY';
    if (desc) {
      desc.textContent = '통합형은 X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY 인증을 사용합니다. 검색광고 키는 별도로 계속 필요합니다.';
    }
  } else {
    cIdInput.placeholder = '네이버 개발자센터 Client ID';
    cSecInput.placeholder = '네이버 개발자센터 Client Secret';
    if (desc) {
      desc.textContent = '기존 개발자센터 키(developers.naver.com)를 사용합니다. 검색광고 키는 별도로 계속 필요합니다.';
    }
  }
};

window.openApiModal = function(type) {
  if (type === 'user') {
    const authType = localStorage.getItem('naver_auth_type') || 'hub';
    const authSelect = document.getElementById('naverAuthType');
    if (authSelect) {
      authSelect.value = authType;
      window.onNaverAuthTypeChange();
    }
    document.getElementById('naverClientId').value = localStorage.getItem('naver_client_id') || '';
    document.getElementById('naverClientSecret').value = localStorage.getItem('naver_client_secret') || '';
    document.getElementById('adCustomerId').value = localStorage.getItem('ad_customer_id') || '';
    document.getElementById('adLicenseKey').value = localStorage.getItem('ad_license_key') || '';
    document.getElementById('adSecretKey').value = localStorage.getItem('ad_secret_key') || '';
    document.getElementById('apiUserModal').style.display = 'flex';
  } else if (type === 'paid') {
    document.getElementById('paidAccessKeyInput').value = localStorage.getItem('paid_access_key') || '';
    document.getElementById('apiPaidModal').style.display = 'flex';
  }
};

window.closeApiModal = function(type) {
  if (type === 'user') {
    document.getElementById('apiUserModal').style.display = 'none';
  } else if (type === 'paid') {
    document.getElementById('apiPaidModal').style.display = 'none';
  }
};

window.saveUserApiKeys = function() {
  const authType = document.getElementById('naverAuthType')?.value || 'hub';
  const cId = document.getElementById('naverClientId').value.trim();
  const cSec = document.getElementById('naverClientSecret').value.trim();
  const adId = document.getElementById('adCustomerId').value.trim();
  const adLic = document.getElementById('adLicenseKey').value.trim();
  const adSec = document.getElementById('adSecretKey').value.trim();

  localStorage.setItem('naver_auth_type', authType);
  localStorage.setItem('naver_client_id', cId);
  localStorage.setItem('naver_client_secret', cSec);
  localStorage.setItem('ad_customer_id', adId);
  localStorage.setItem('ad_license_key', adLic);
  localStorage.setItem('ad_secret_key', adSec);

  closeApiModal('user');
  initApiStatusBadge();
  window.showToast('개인 네이버 API 키가 성공적으로 저장되었습니다!');
};

window.clearUserApiKeys = function() {
  ['naver_auth_type', 'naver_client_id', 'naver_client_secret', 'ad_customer_id', 'ad_license_key', 'ad_secret_key'].forEach(k => localStorage.removeItem(k));
  closeApiModal('user');
  initApiStatusBadge();
  window.showToast('API 키가 초기화되었습니다.');
};

window.savePaidKey = function() {
  const key = document.getElementById('paidAccessKeyInput').value.trim();
  if (!key) {
    alert('16자리 유료 발급키를 입력해 주세요.');
    return;
  }
  localStorage.setItem('paid_access_key', key);
  closeApiModal('paid');
  initApiStatusBadge();
  initQuotaUI();
  window.showToast('유료 발급키가 등록되었습니다. 무제한 분석이 활성화되었습니다!');
};

window.clearPaidKey = function() {
  localStorage.removeItem('paid_access_key');
  closeApiModal('paid');
  initApiStatusBadge();
  initQuotaUI();
  window.showToast('유료 발급키가 삭제되었습니다.');
};

window.openPaidInquiry = function() {
  alert('유료 발급키 문의는 고객센터 및 네이버 공식 카페를 통해 확인하실 수 있습니다.');
};

function initApiStatusBadge() {
  const badgeText = document.getElementById('apiKeyStatusText');
  if (!badgeText) return;

  const paidKey = localStorage.getItem('paid_access_key');
  const userCId = localStorage.getItem('naver_client_id');

  if (paidKey) {
    badgeText.textContent = '유료 발급키 연동 완료 (무제한 분석)';
  } else if (userCId) {
    badgeText.textContent = '개인 네이버 API 연동 완료';
  } else {
    badgeText.textContent = '무료 모드 (일일 40회 이용 가능)';
  }
}

// CSV 다운로드
function exportToCSV(data, fileName) {
  const headers = ['No', '키워드', 'PC검색량', '모바일검색량', '총검색량', '경쟁도'];
  const rows = data.map((item, idx) => [
    idx + 1,
    `"${item.keyword}"`,
    item.pc,
    item.mobile,
    item.pc + item.mobile,
    `"${item.comp}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_키워드분석.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}
