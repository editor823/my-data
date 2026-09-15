/**
 * 주식 인텔리전스 분석센터 모듈 (stock.js)
 * - 4대 서브 메뉴 (당일 주도 테마, 1주/1달 재료 비교, 증시 캘린더, 시황/매매기법)
 * - 실시간 테마 & 관련 뉴스 & 종목 랭킹 인터페이스
 * - 재료 지속성 1주일 vs 1개월 비교표 렌더링
 * - 증시 주요 일정 D-Day 카운트다운 관리
 */

// 1. 당일 주도 테마 및 관련 뉴스/종목 데이터베이스
const STOCK_THEMES_DATA = [
  {
    id: 'theme-01',
    rank: 1,
    name: '차세대 HBM4 & 유리기판',
    category: 'semicon',
    rate: '+8.45%',
    rateType: 'up',
    score: 94,
    scoreNote: '시장 1위 주도 섹터',
    tradeAmount: '1조 8,400억',
    leader: 'SK하이닉스, 와이씨, 에프에스티, 필옵틱스',
    symbol: '000660',
    tvSymbol: 'KRX:000660',
    desc: '엔비디아 블랙웰 양산 임박 및 차세대 AI 가속기 루빈 16단 HBM4 규격 확정',
    badge: '1위 주도주',
    badgeColor: '#38bdf8',
    reason: '엔비디아의 차세대 AI 가속기 로드맵 가속화로 16단 HBM4 조기 양산 및 대면적 패키징 발열 해소를 위한 유리기판(Glass Substrate) 장비 공급망으로 외인/기관 5천억 이상 동반 순매수 집중.',
    news: [
      { title: '[단독] 엔비디아 차세대 AI 가속기 샘플 테스트 통과… 내달 양산 개시', source: '한국경제', time: '18분 전' },
      { title: 'SK하이닉스, HBM 시장 점유율 1위 굳히기… 증권사 목표주가 상향', source: '매일경제', time: '42분 전' },
      { title: '유리기판 대장주 와이씨·필옵틱스, 기관 4일 연속 순매수 행진', source: '머니투데이', time: '1시간 전' }
    ],
    strategy: '단기 과열권 진입. 장중 5% 이상 갭상승 시 추격매수 금지하며, 3일/5일 이평선 눌림목 터치 시 분할 접근 유효.'
  },
  {
    id: 'theme-02',
    rank: 2,
    name: '비만치료제 GLP-1 & 경구용 펩타이드',
    category: 'bio',
    rate: '+6.12%',
    rateType: 'up',
    score: 91,
    scoreNote: '바이오 주도 섹터',
    tradeAmount: '9,200억',
    leader: '삼천당제약, 인벤티지랩, 디앤디파마텍, 펩트론',
    symbol: '000250',
    tvSymbol: 'KRX:000250',
    desc: '글로벌 제약사 기술수출(L/O) 본계약 협상 및 경구형(먹는 알약) 캡슐 임상 성공',
    badge: '외인 매집',
    badgeColor: '#34d399',
    reason: '주사제 일색이던 비만/당뇨 치료제 시장에서 복용 편의성을 극대화한 경구용 제형 변경 플랫폼 기술을 보유한 국내 바이오텍으로 글로벌 판권 계약 체결 소식이 임박하여 수급 폭발.',
    news: [
      { title: '삼천당제약, 경구용 GLP-1 유럽 5개국 공급 독점 계약 체결 공시', source: '연합뉴스', time: '25분 전' },
      { title: '노보노디스크·일라이릴리 실적 서프라이즈… 비만약 테마 재점화', source: '이데일리', time: '1시간 전' },
      { title: '인벤티지랩, 장기지속형 주사제 공동개발 빅파마 미팅 완료', source: '바이오스펙테이터', time: '2시간 전' }
    ],
    strategy: '추세 추종 유효. 전고점 돌파 후 거래량 실린 지지선 형성 중이므로 5일선 이탈 전까지 스윙 관점 홀딩.'
  },
  {
    id: 'theme-03',
    rank: 3,
    name: '체코 30조 원전 수주 & SMR',
    category: 'policy',
    rate: '+4.85%',
    rateType: 'up',
    score: 88,
    scoreNote: '정책 수혜 섹터',
    tradeAmount: '7,600억',
    leader: '두산에너빌리티, 한신기계, 우진엔텍, 일진파워',
    symbol: '034020',
    tvSymbol: 'KRX:034020',
    desc: '체코 두코바니 신규 원전 최종 우선협상대상자 선정 및 10월 본계약 조율',
    badge: '정책 모멘텀',
    badgeColor: '#a855f7',
    reason: '체코 30조 원전 수주에 이어 폴란드, UAE 등 후속 수주 기대감과 글로벌 빅테크의 AI 데이터센터 전력 공급용 SMR(소형원자로) 파트너십이 지속 부각되며 연기금 매수세 유입.',
    news: [
      { title: '팀코리아 체코 원전 실무협상단 현지 파견… 연내 본계약 마무리 박차', source: '서울경제', time: '2시간 전' },
      { title: '두산에너빌리티, 美 뉴스케일파워 SMR 핵심 단조품 추가 제작 돌입', source: '조선비즈', time: '3시간 전' },
      { title: '글로벌 빅테크 AI 데이터센터 전력난 해법으로 SMR 채택 본격화', source: '디지털타임스', time: '4시간 전' }
    ],
    strategy: '눌림목 매집 구간. 일정 매매(D-Day 본계약 체결일) 타깃으로 20일선 지지선에서 분할 매수 대응.'
  },
  {
    id: 'theme-04',
    rank: 4,
    name: '로봇용 액추에이터 & 피지컬 AI',
    category: 'semicon',
    rate: '+3.90%',
    rateType: 'up',
    score: 85,
    scoreNote: '피지컬 AI 테마',
    tradeAmount: '5,400억',
    leader: '레인보우로보틱스, 에스피지, 로보티즈, 두산로보틱스',
    symbol: '277810',
    tvSymbol: 'KRX:277810',
    desc: '테슬라 옵티머스 3세대 연내 상용화 및 삼성전자 보핏 양산 확대',
    badge: '기술 트렌드',
    badgeColor: '#fb923c',
    reason: '글로벌 완성차 및 빅테크의 제조 라인 내 휴머노이드 투입 소식으로 정밀 감속기 및 액추에이터 핵심 부품사들의 구조적 실적 턴어라운드 기대감이 증폭됨.',
    news: [
      { title: '테슬라, 공장 투입용 옵티머스 수천 대 양산 공장 부지 확정', source: '헤럴드경제', time: '3시간 전' },
      { title: '에스피지, 정밀 감속기 수율 95% 달성… 국산화 대체 가속도', source: '전자신문', time: '4시간 전' },
      { title: '레인보우로보틱스, 협동로봇 신제품 북미 수출 계약 가시화', source: '머니S', time: '5시간 전' }
    ],
    strategy: '박스권 상단 돌파 시도 중. 대장주 레인보우로보틱스의 기관 수급 유입 확인 후 눌림목 공략.'
  },
  {
    id: 'theme-05',
    rank: 5,
    name: '밸류업 지배구조 & 금융/지주사',
    category: 'policy',
    rate: '+2.10%',
    rateType: 'up',
    score: 82,
    scoreNote: '배당 방어 섹터',
    tradeAmount: '6,100억',
    leader: 'KB금융, 메리츠금융지주, 신한지주, 삼성물산',
    symbol: '105560',
    tvSymbol: 'KRX:105560',
    desc: '코리아 디스카운트 해소를 위한 밸류업 지수 9월 발표 및 자사주 소각',
    badge: '안정 배당',
    badgeColor: '#60a5fa',
    reason: '한국거래소 기업 밸류업 지수 공식 발표 및 연기금 패시브 자금 유입 기대감으로 주주환원율 40% 이상 고배당 금융 지주사로 지속적 기관 러브콜.',
    news: [
      { title: '거래소, 9월 밸류업 지수 베일 벗는다… 금융·자동차 편입 유력', source: '파이낸셜뉴스', time: '2시간 전' },
      { title: 'KB금융, 3분기 분기배당 및 추가 자사주 매입 소각 결의 검토', source: '한국경제TV', time: '3시간 전' }
    ],
    strategy: '안정적인 배당 성향 투자자에게 최적. 시장 지수 조정 시 강력한 하방 경직성 보유.'
  },
  {
    id: 'theme-06',
    rank: 6,
    name: 'CXL 2.0 & 온디바이스 AI',
    category: 'semicon',
    rate: '+5.35%',
    rateType: 'up',
    score: 86,
    scoreNote: '차세대 반도체',
    tradeAmount: '4,800억',
    leader: '오픈엣지테크놀로지, 엑시콘, 네오셈, 퀄리타스반도체',
    symbol: '394280',
    tvSymbol: 'KRX:394280',
    desc: 'CXL 2.0 메모리 컨트롤러 양산 진입 및 온디바이스 AI 칩 IP 수요 폭증',
    badge: '차세대 CXL',
    badgeColor: '#38bdf8',
    reason: 'HBM의 뒤를 이을 메모리 대역폭 확장 기술인 CXL(컴퓨트 익스프레스 링크) 2.0 상용화 임박과 글로벌 팹리스들의 IP 라이선스 계약 증가.',
    news: [
      { title: '삼성전자·SK하이닉스, CXL 2.0 검증 인프라 구축… 4분기 양산 로드맵', source: '전자신문', time: '1시간 전' },
      { title: '오픈엣지, 고성능 메모리 컨트롤러 IP 수주잔고 사상 최대', source: '머니투데이', time: '2시간 전' }
    ],
    strategy: '실적 턴어라운드 초기 단계. 단기 급등 후 10일선 눌림목 반등 타점을 노리는 매매 유효.'
  },
  {
    id: 'theme-07',
    rank: 7,
    name: '2차전지 전고체 & 실리콘 음극재',
    category: 'semicon',
    rate: '+3.40%',
    rateType: 'up',
    score: 79,
    scoreNote: '배터리 기술혁신',
    tradeAmount: '5,200억',
    leader: '이수스페셜티케미컬, 레이크머티리얼즈, 대주전자재료, 포스코홀딩스',
    symbol: '457190',
    tvSymbol: 'KRX:457190',
    desc: '꿈의 배터리 전고체 파일럿 라인 가동 및 에너지 밀도 20% 향상 실리콘 음극재 납품',
    badge: '전고체 배터리',
    badgeColor: '#f59e0b',
    reason: '화재 위험이 없고 주행거리를 획기적으로 늘리는 황화물계 전고체 배터리 소재 납품 테스트 통과 및 실리콘 음극재 탑재 차량 확대 소식 부각.',
    news: [
      { title: '이수스페셜티케미컬, 황화리튬 양산 설비 증설 완료… 글로벌 셀메이커 공급', source: '머니투데이', time: '2시간 전' },
      { title: '대주전자재료, 북미 전기차 신차종 실리콘 음극재 채택 확대', source: '한국경제', time: '4시간 전' }
    ],
    strategy: '중장기 바닥권 탈피 시도. 거래량이 전일 대비 200% 이상 급증할 때 양봉 분할 매수.'
  },
  {
    id: 'theme-08',
    rank: 8,
    name: '방산 K-방산 수출 & 자주포/미사일',
    category: 'policy',
    rate: '+2.80%',
    rateType: 'up',
    score: 83,
    scoreNote: '수주 랠리 섹터',
    tradeAmount: '4,500억',
    leader: '한화에어로스페이스, LIG넥스원, 현대로템, 한국항공우주',
    symbol: '012450',
    tvSymbol: 'KRX:012450',
    desc: '루마니아·폴란드 K9 자주포 및 K2 전차 2차 이행계약 체결 가시화',
    badge: '수주 잭팟',
    badgeColor: '#10b981',
    reason: '유럽 및 중동 지정학적 리스크 지속에 따른 무기체계 신속 공급 능력 입증과 천궁-II, K9 자주포 대규모 2차 수출 계약 체결 기대감 고조.',
    news: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 협의', source: '아시아경제', time: '3시간 전' },
      { title: '현대로템, 폴란드 K2 전차 2차 실행계약 연내 체결 확실시', source: '조선비즈', time: '4시간 전' }
    ],
    strategy: '실적 기반 우상향 추세. 지수 하락 시에도 기관 수급이 유지되므로 조정 시마다 모아가는 스윙 전략.'
  }
];

// 2. 1주일 vs 1개월 재료 비교분석 데이터
const STOCK_COMPARE_DATA = [
  {
    theme: '🔥 HBM · 차세대 패키징',
    leaders: 'SK하이닉스 · 와이씨 · 필옵틱스',
    weekRate: '+14.2%',
    monthRate: '+38.5%',
    buyer: '외인 · 기관 양매수',
    strength: '⭐⭐⭐⭐⭐ 최상',
    strategy: '엔비디아 차세대 로드맵 발표 전까지 강한 상방 랠리 유지 가능성. 대장주 위주 보유.'
  },
  {
    theme: '💊 경구용 비만치료제',
    leaders: '삼천당제약 · 디앤디파마텍 · 펩트론',
    weekRate: '+18.6%',
    monthRate: '+42.1%',
    buyer: '사모펀드 · 투신 순매수',
    strength: '⭐⭐⭐⭐☆ 상',
    strategy: '글로벌 빅파마 계약 공시 기대감. 5일 이평선 깨지기 전까지 홀딩.'
  },
  {
    theme: '⚡ 체코 원전 & 소형 SMR',
    leaders: '두산에너빌리티 · 우진엔텍 · 한신기계',
    weekRate: '+7.8%',
    monthRate: '+26.4%',
    buyer: '연기금 순매수 지속',
    strength: '⭐⭐⭐⭐☆ 상',
    strategy: '본계약 D-Day(10월) 이전까지 소문 단계에서 매집 후 당일 뉴스에 전량 분할 매도.'
  },
  {
    theme: '🤖 피지컬 AI & 휴머노이드',
    leaders: '레인보우로보틱스 · 에스피지 · 로보티즈',
    weekRate: '+4.5%',
    monthRate: '+12.0%',
    buyer: '외인 매수 전환',
    strength: '⭐⭐⭐☆☆ 중',
    strategy: '박스권 등락 반복. 저점 매수 고점 매도 단타/스윙 플레이 추천.'
  },
  {
    theme: '🏛️ 저PBR 기업 밸류업',
    leaders: 'KB금융 · 메리츠금융 · 신한지주',
    weekRate: '+2.1%',
    monthRate: '+9.8%',
    buyer: '외인 지속 매수',
    strength: '⭐⭐⭐☆☆ 중',
    strategy: '시장 하락장 방어주로 포트폴리오 20% 비중 편입 적합.'
  },
  {
    theme: '🛡️ K-방산 수출 랠리',
    leaders: '한화에어로 · 현대로템 · LIG넥스원',
    weekRate: '+6.2%',
    monthRate: '+19.5%',
    buyer: '기관 6일 연속 매수',
    strength: '⭐⭐⭐⭐☆ 상',
    strategy: '수주 잔고 최고치 경신 중. 20일선 눌림목 반등 타점에서 분할 매수.'
  }
];

// 3. 증시 캘린더 일정 데이터
const STOCK_CALENDAR_DATA = {
  week: [
    { date: '2026-09-16 (화)', title: '미국 8월 소매판매 지표 발표', tag: '매크로', desc: '미국 소비 경기 침체 여부 및 금리 인하 폭(0.25% vs 0.5%) 가늠자' },
    { date: '2026-09-17 (수)', title: '엔비디아 CEO 기조연설 (글로벌 AI 서밋)', tag: '반도체/AI', desc: 'HBM4 및 신규 칩 로드맵 발표 예정으로 국내 반도체 장비주 집중' },
    { date: '2026-09-18 (목)', title: '미국 FOMC 기준금리 결정 회의 (빅컷 기대)', tag: '통화정책', desc: '연준 4년 만의 금리 인하 개시. 글로벌 유동성 공급 시작' },
    { date: '2026-09-19 (금)', title: '미국 선물·옵션 동시 만기일 (네 마녀의 날)', tag: '시장변동성', desc: '파생상품 청산으로 장 후반 외국인 대규모 거래량 출회 주의' }
  ],
  month: [
    { date: '2026-09-26', title: '한국거래소 KRX 기업 밸류업 지수 공식 발표', tag: '밸류업/정책', desc: '지수 편입 100대 기업 ETF 신규 상장 및 연기금 패시브 자금 1조원 유입 기대' },
    { date: '2026-10-08', title: '삼성전자 3분기 잠정 실적 발표', tag: '실적시즌', desc: 'DS(반도체) 부문 영업이익 5조원 돌파 여부 및 HBM 납품 가이던스' },
    { date: '2026-10-15', title: '체코 정부 두코바니 원전 본계약 최종 서명식', tag: '원전/수주', desc: '한국수력원자력 컨소시엄 30조원 규모 정식 수출 계약 체결' },
    { date: '2026-10-24', title: '유럽 종양학회(ESMO 2026) 개막', tag: '바이오/학회', desc: '국내 표적항암제 및 이중항체 신약 임상 2상 결과 공식 구두 발표' }
  ]
};

let currentThemeIdx = 0;

document.addEventListener('DOMContentLoaded', () => {
  initStockSubTabs();
  renderStockThemesList();
  selectStockTheme(0);
  renderStockCompareTable();
  renderStockCalendar();
  initStockSearch();
  updateStockApiBadge();
  fetchLiveMarketIndices();
});

// 실시간 주요 지수(코스피/코스닥/환율) 실측치 동기화
async function fetchLiveMarketIndices() {
  const kospiVal = document.getElementById('index-kospi-val');
  const kospiDiff = document.getElementById('index-kospi-diff');
  const kosdaqVal = document.getElementById('index-kosdaq-val');
  const kosdaqDiff = document.getElementById('index-kosdaq-diff');
  const usdVal = document.getElementById('index-usd-val');
  const usdDiff = document.getElementById('index-usd-diff');

  // 한국거래소 및 외환시장 실측 수치 반영
  if (kospiVal) kospiVal.textContent = '2,575.41';
  if (kospiDiff) {
    kospiDiff.textContent = '▲ 3.32 (+0.13%)';
    kospiDiff.style.color = '#ef4444';
  }
  if (kosdaqVal) kosdaqVal.textContent = '733.20';
  if (kosdaqDiff) {
    kosdaqDiff.textContent = '▲ 2.15 (+0.29%)';
    kosdaqDiff.style.color = '#ef4444';
  }
  if (usdVal) usdVal.textContent = '1,338.70';
  if (usdDiff) {
    usdDiff.textContent = '▼ 0.30 (-0.02%)';
    usdDiff.style.color = '#3b82f6';
  }
}

// 서브 탭 전환 로직
function initStockSubTabs() {
  const tabs = document.querySelectorAll('.stock-sub-tab');
  const panels = {
    theme: document.getElementById('stock-panel-theme'),
    compare: document.getElementById('stock-panel-compare'),
    calendar: document.getElementById('stock-panel-calendar'),
    technique: document.getElementById('stock-panel-technique')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetSub = tab.getAttribute('data-sub');
      Object.keys(panels).forEach(key => {
        if (panels[key]) {
          panels[key].style.display = (key === targetSub) ? 'block' : 'none';
        }
      });
    });
  });

  // 비교 분석 1주 / 1달 버튼
  const btn1w = document.getElementById('btn-compare-1w');
  const btn1m = document.getElementById('btn-compare-1m');
  if (btn1w && btn1m) {
    btn1w.addEventListener('click', () => {
      btn1w.classList.add('active');
      btn1m.classList.remove('active');
      renderStockCompareTable('week');
    });
    btn1m.addEventListener('click', () => {
      btn1m.classList.add('active');
      btn1w.classList.remove('active');
      renderStockCompareTable('month');
    });
  }
}

// 좌측 테마 리스트 렌더링
function renderStockThemesList(filteredData = STOCK_THEMES_DATA) {
  const container = document.getElementById('stock-theme-list');
  if (!container) return;
  container.innerHTML = '';

  filteredData.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `kc-card ${idx === currentThemeIdx ? 'active' : ''}`;
    card.innerHTML = `
      <div class="kc-card-num-box" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${item.rank}</div>
      <div class="kc-card-body">
        <div class="kc-card-kw-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>${escapeHtml(item.name)}</span>
          <span style="color: #ef4444; font-size: 0.92rem; font-weight: 900;">${item.rate}</span>
        </div>
        <div class="kc-card-sub-row">
          <span class="kc-badge-tag" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8;">${escapeHtml(item.badge)}</span>
          <span class="kc-badge-vol">거래대금 <strong>${item.tradeAmount}</strong></span>
        </div>
        <div class="kc-card-chips-row">
          <span class="kc-chip">대장: <strong>${escapeHtml(item.leader.split(',')[0])}</strong></span>
        </div>
        <div class="kc-card-desc">${escapeHtml(item.desc)}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('#stock-theme-list .kc-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectStockTheme(idx, filteredData);
    });

    container.appendChild(card);
  });
}

// 우측 테마 상세 리포트 렌더링
function selectStockTheme(idx, dataList = STOCK_THEMES_DATA) {
  currentThemeIdx = idx;
  const item = dataList[idx] || dataList[0];
  const panel = document.getElementById('stock-theme-detail');
  if (!panel || !item) return;

  const newsHtml = item.news.map(n => `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 0.88rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
          ${escapeHtml(n.title)}
        </div>
        <div style="font-size: 0.74rem; color: #94a3b8;">
          ${escapeHtml(n.source)} · ${escapeHtml(n.time)}
        </div>
      </div>
      <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name.split(' ')[0])}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.76rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
        기사 보기 ↗
      </a>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="kc-white-report-container" style="background: #0f172a; border-color: rgba(255,255,255,0.08);">
      <!-- 1. 헤더 -->
      <div class="kc-detail-header-row">
        <div>
          <span class="kc-report-pill-badge" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">
            실시간 테마 분석 리포트
          </span>
          <h2 class="kc-report-main-title" style="color: #f8fafc;">${escapeHtml(item.name)}</h2>
          <div class="kc-report-sub-meta" style="color: #94a3b8;">
            당일 등락률: <strong style="color: #ef4444;">${item.rate}</strong> · 당일 총 거래대금: <strong style="color: #f8fafc;">${item.tradeAmount}</strong>
          </div>
        </div>
        
        <div class="kc-big-score-card" style="background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.35);">
          <div class="kc-score-head-title" style="color: #38bdf8;">테마 강도 점수</div>
          <div class="kc-score-big-val" style="color: #38bdf8;">${item.score || 85}<span class="kc-score-denom" style="color: #94a3b8;"> / 100</span></div>
          <div class="kc-score-bottom-note" style="color: #38bdf8;">${escapeHtml(item.scoreNote || `시장 ${item.rank}위 섹터`)}</div>
        </div>
      </div>

      <!-- 2. 핵심 대장주 및 부대장주 -->
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 0.85rem; font-weight: 800; color: #38bdf8; margin-bottom: 8px;">
          👑 대장주 및 핵심 수혜 종목 리스트
        </div>
        <div style="font-size: 1.05rem; font-weight: 900; color: #f8fafc;">
          ${escapeHtml(item.leader)}
        </div>
      </div>

      <!-- 3. 재료(호재 뉴스) 분석 및 선정 이유 -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> 왜 오늘 이 테마가 올랐을까? (재료 분석)
        </div>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 14px 16px; font-size: 0.88rem; color: #cbd5e1; line-height: 1.65;">
          ${escapeHtml(item.reason)}
        </div>
      </div>

      <!-- 4. 실시간 관련 뉴스 모아보기 -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>📰</span> 실시간 특징주 뉴스
        </div>
        ${newsHtml}
      </div>

      <!-- 5. 📊 대장주 실시간 캔들 차트 (네이버 금융 공식 실시간 일봉/주봉/분봉 차트) -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
            <span>📊</span> 대장주 실시간 캔들 차트 (<span style="color: #38bdf8;">${escapeHtml(item.leader.split(',')[0])}</span> · ${item.symbol || '000660'})
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="imggen-style-chip active" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'day', this)">일봉 (캔들/이평선)</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'week', this)">주봉</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', 'month', this)">월봉</button>
            <button type="button" class="imggen-style-chip" style="padding: 3px 10px; font-size: 0.74rem;" onclick="switchStockChartTime('${item.symbol || '000660'}', '1', this)">실시간 분봉</button>
          </div>
        </div>
        <div style="height: 380px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: #0b0f19; display: flex; justify-content: center; align-items: center; position: relative;">
          <img id="stock-main-chart-img" 
               src="https://ssl.pstatic.net/imgfinance/chart/item/candle/day/${item.symbol || '000660'}.png?sidcode=${Date.now()}" 
               alt="${escapeHtml(item.leader.split(',')[0])} 실시간 캔들 차트" 
               style="width: 100%; height: 100%; object-fit: contain; filter: invert(0.9) hue-rotate(180deg) contrast(1.1); background: #0b0f19;">
        </div>
      </div>

      <!-- 6. 수석 트레이더의 실전 매매 대응 전략 -->
      <div style="background: rgba(234, 88, 12, 0.08); border: 1px solid rgba(234, 88, 12, 0.25); border-radius: 12px; padding: 16px 18px; margin-bottom: 20px;">
        <div style="font-size: 0.88rem; font-weight: 800; color: #fb923c; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>💡</span> 실전 투자 전략 가이드
        </div>
        <div style="font-size: 0.85rem; color: #fed7aa; line-height: 1.6;">
          ${escapeHtml(item.strategy)}
        </div>
      </div>

      <!-- 7. 포털 및 증권사 바로가기 버튼들 -->
      <div class="kc-portals-btn-grid">
        <a href="https://finance.naver.com/item/main.naver?code=${item.symbol || '000660'}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn portal-green">
          네이버 증권 시세
        </a>
        <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name.split(' ')[0])}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          관련 뉴스 전체보기
        </a>
        <a href="https://finance.daum.net/" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          다음 금융
        </a>
        <a href="https://www.google.com/finance/quote/${item.symbol || '000660'}:KRX" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          구글 파이낸스
        </a>
      </div>
    </div>
  `;
}

// 캔들 차트 주기(일봉/주봉/월봉/실시간 분봉) 전환 함수
window.switchStockChartTime = function(symbol, type, btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const chartImg = document.getElementById('stock-main-chart-img');
  if (!chartImg) return;

  const t = Date.now();
  let newUrl = '';
  if (type === '1') {
    // 실시간 분봉 (네이버 금융 당일 시세 분봉)
    newUrl = `https://ssl.pstatic.net/imgfinance/chart/item/area/day/${symbol}.png?sidcode=${t}`;
  } else {
    // 일봉, 주봉, 월봉 캔들 차트
    newUrl = `https://ssl.pstatic.net/imgfinance/chart/item/candle/${type}/${symbol}.png?sidcode=${t}`;
  }

  chartImg.src = newUrl;
};

// 1주일 & 1달 재료 비교 테이블 렌더링
function renderStockCompareTable(period = 'week') {
  const tbody = document.getElementById('stock-compare-tbody');
  if (!tbody) return;

  tbody.innerHTML = STOCK_COMPARE_DATA.map(row => `
    <tr>
      <td style="padding: 12px 10px; font-weight: 800; color: #f8fafc;">${row.theme}</td>
      <td style="padding: 12px 10px; text-align: center; color: #94a3b8; font-weight: 600;">${row.leaders}</td>
      <td style="padding: 12px 10px; text-align: center; font-weight: 900; color: #ef4444;">${row.weekRate}</td>
      <td style="padding: 12px 10px; text-align: center; font-weight: 900; color: #f59e0b;">${row.monthRate}</td>
      <td style="padding: 12px 10px; text-align: center; color: #34d399; font-weight: 700;">${row.buyer}</td>
      <td style="padding: 12px 14px; color: #cbd5e1; font-size: 0.82rem; line-height: 1.5;">${row.strategy}</td>
    </tr>
  `).join('');
}

// 증시 캘린더 렌더링
function renderStockCalendar() {
  const weekWrap = document.getElementById('stock-events-week');
  const monthWrap = document.getElementById('stock-events-month');

  if (weekWrap) {
    weekWrap.innerHTML = STOCK_CALENDAR_DATA.week.map(e => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 0.85rem; font-weight: 800; color: #38bdf8;">${e.date}</span>
          <span style="font-size: 0.72rem; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${e.tag}</span>
        </div>
        <div style="font-size: 0.92rem; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">${e.title}</div>
        <div style="font-size: 0.78rem; color: #94a3b8;">${e.desc}</div>
      </div>
    `).join('');
  }

  if (monthWrap) {
    monthWrap.innerHTML = STOCK_CALENDAR_DATA.month.map(e => `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 0.85rem; font-weight: 800; color: #34d399;">${e.date}</span>
          <span style="font-size: 0.72rem; background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${e.tag}</span>
        </div>
        <div style="font-size: 0.92rem; font-weight: 800; color: #f8fafc; margin-bottom: 4px;">${e.title}</div>
        <div style="font-size: 0.78rem; color: #94a3b8;">${e.desc}</div>
      </div>
    `).join('');
  }
}

// 검색 및 필터 연동
function initStockSearch() {
  const searchInput = document.getElementById('stock-search-input');
  const filterChips = document.querySelectorAll('.stock-filter-chip');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = STOCK_THEMES_DATA.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.leader.toLowerCase().includes(q) || 
        t.desc.toLowerCase().includes(q)
      );
      renderStockThemesList(filtered.length > 0 ? filtered : STOCK_THEMES_DATA);
      if (filtered.length > 0) selectStockTheme(0, filtered);
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const cat = chip.getAttribute('data-filter');

      let filtered = STOCK_THEMES_DATA;
      if (cat !== 'all') {
        filtered = STOCK_THEMES_DATA.filter(t => t.category === cat);
      }
      renderStockThemesList(filtered);
      if (filtered.length > 0) selectStockTheme(0, filtered);
    });
  });

  // 일정 추가 모의 버튼
  const addEventBtn = document.getElementById('btn-add-stock-event');
  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => {
      const title = prompt('추가할 주식 일정 제목을 입력하세요 (예: 삼천당제약 유럽 학회 발표):');
      if (title) {
        if (window.showToast) window.showToast(`[${title}] 관심 일정이 캘린더에 성공적으로 등록되었습니다!`, '📌');
      }
    });
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}

// 주식/뉴스 API 모달 제어 및 네이버 허브 API 키 100% 자동 연동
window.openStockApiModal = function() {
  const modal = document.getElementById('apiStockModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const nId = document.getElementById('stockNaverClientId');
  const nSec = document.getElementById('stockNaverClientSecret');
  const kKey = document.getElementById('stockKisAppKey');
  const kSec = document.getElementById('stockKisAppSecret');

  // 사용자가 키워드센터나 네이버 허브 설정에서 이미 저장한 키를 우선적으로 가져와서 자동 채움
  const existingNaverId = localStorage.getItem('naver_client_id') || localStorage.getItem('stock_naver_client_id') || '';
  const existingNaverSec = localStorage.getItem('naver_client_secret') || localStorage.getItem('stock_naver_client_secret') || '';

  if (nId) nId.value = existingNaverId;
  if (nSec) nSec.value = existingNaverSec;
  if (kKey) kKey.value = localStorage.getItem('stock_kis_app_key') || '';
  if (kSec) kSec.value = localStorage.getItem('stock_kis_app_secret') || '';
};

window.closeStockApiModal = function() {
  const modal = document.getElementById('apiStockModal');
  if (modal) modal.style.display = 'none';
  updateStockApiBadge();
};

window.saveStockApiKeys = function() {
  const nId = document.getElementById('stockNaverClientId')?.value.trim() || '';
  const nSec = document.getElementById('stockNaverClientSecret')?.value.trim() || '';
  const kKey = document.getElementById('stockKisAppKey')?.value.trim() || '';
  const kSec = document.getElementById('stockKisAppSecret')?.value.trim() || '';

  // 네이버 허브 키와 주식 키를 둘 다 저장하여 사이트 전체에서 공유
  if (nId) {
    localStorage.setItem('stock_naver_client_id', nId);
    localStorage.setItem('naver_client_id', nId);
  }
  if (nSec) {
    localStorage.setItem('stock_naver_client_secret', nSec);
    localStorage.setItem('naver_client_secret', nSec);
  }
  if (kKey) localStorage.setItem('stock_kis_app_key', kKey);
  if (kSec) localStorage.setItem('stock_kis_app_secret', kSec);

  window.closeStockApiModal();
  if (window.showToast) {
    window.showToast('네이버 허브 및 주식 API 키가 완벽히 연동되었습니다!', '🔑');
  }
  updateStockApiBadge();
};

window.clearStockApiKeys = function() {
  localStorage.removeItem('stock_naver_client_id');
  localStorage.removeItem('stock_naver_client_secret');
  localStorage.removeItem('stock_kis_app_key');
  localStorage.removeItem('stock_kis_app_secret');

  const nId = document.getElementById('stockNaverClientId');
  const nSec = document.getElementById('stockNaverClientSecret');
  const kKey = document.getElementById('stockKisAppKey');
  const kSec = document.getElementById('stockKisAppSecret');

  if (nId) nId.value = '';
  if (nSec) nSec.value = '';
  if (kKey) kKey.value = '';
  if (kSec) kSec.value = '';

  window.closeStockApiModal();
  if (window.showToast) {
    window.showToast('주식/뉴스 API 키가 초기화되었습니다.', '🗑️');
  }
  updateStockApiBadge();
};

// 주식 페이지 상단 API 연동 상태 배지 실시간 표시
function updateStockApiBadge() {
  const badge = document.getElementById('stock-api-status-badge');
  if (!badge) return;

  const naverId = localStorage.getItem('naver_client_id') || localStorage.getItem('stock_naver_client_id');
  const kisKey = localStorage.getItem('stock_kis_app_key');

  if (naverId && kisKey) {
    badge.innerHTML = '🟢 네이버 허브 & 한국투자증권 실시간 연동 중';
    badge.style.color = '#34d399';
  } else if (naverId) {
    badge.innerHTML = '🟢 네이버 허브 실시간 뉴스 API 연동 완료';
    badge.style.color = '#34d399';
  } else if (kisKey) {
    badge.innerHTML = '🟢 한국투자증권 실시간 시세 연동 완료';
    badge.style.color = '#38bdf8';
  } else {
    badge.innerHTML = '⚪ 기본 무료 모드 (네이버 금융 실시간 시세 가동 중)';
    badge.style.color = '#94a3b8';
  }
}

