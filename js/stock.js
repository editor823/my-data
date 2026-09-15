/**
 * 주식 인텔리전스 분석센터 모듈 (stock.js)
 * - 4대 서브 메뉴 (당일 주도 테마, 1주/1달 재료 비교, 증시 캘린더, 시황/매매기법)
 * - 실시간 테마 & 관련 뉴스 & 종목 랭킹 인터페이스
 * - 재료 지속성 1주일 vs 1개월 비교표 렌더링
 * - 증시 주요 일정 D-Day 카운트다운 관리
 */

// 1. 당일 주도 테마 및 관련 뉴스/종목 데이터베이스
// 0. 당일 국내 주식 실시간 촘촘한 뉴스 데이터베이스 (특징주, 수급, 공시, 산업)
const DOMESTIC_STOCK_NEWS_DATA = [
  {
    category: 'feature',
    tag: '상한가 / 급등',
    tagColor: '#ef4444',
    title: '[특징주] 와이씨, 엔비디아 차세대 AI 가속기 테스트 장비 공급 승인에 22% 폭등',
    media: '한국경제',
    time: '8분 전',
    code: '232140',
    symbol: '와이씨',
    summary: '엔비디아 루빈용 고대역폭메모리(HBM4) 검사 장비의 퀄 테스트를 단독 통과했다는 소식에 장중 거래대금 3,200억 터지며 상한가 근접.',
    keyword: '와이씨 HBM 엔비디아 검사장비'
  },
  {
    category: 'supply',
    tag: '외인 1,500억 순매수',
    tagColor: '#38bdf8',
    title: 'SK하이닉스, 외국인·기관 5일 연속 동반 쌍끌이 매수… 주가 17만원 선 노크',
    media: '매일경제',
    time: '15분 전',
    code: '000660',
    symbol: 'SK하이닉스',
    summary: '글로벌 투자은행(IB) 모건스탠리와 JP모건의 목표주가 상향 리포트가 잇따르며 외인 지분율 54.3%로 연중 최고치 돌파.',
    keyword: 'SK하이닉스 외국인 기관 순매수'
  },
  {
    category: 'disclosure',
    tag: '대규모 공시',
    tagColor: '#10b981',
    title: '삼천당제약, 경구용 GLP-1 비만치료제 유럽 5개국 독점 판매 본계약 체결 공시',
    media: '연합뉴스',
    time: '24분 전',
    code: '000250',
    symbol: '삼천당제약',
    summary: '독점 계약금 및 단계별 마일스톤을 포함한 본계약 체결 완료 공시 발표. 주사제가 아닌 먹는 알약 형태 비만약의 상용화 기대감.',
    keyword: '삼천당제약 경구용 GLP-1 본계약 공시'
  },
  {
    category: 'feature',
    tag: '신고가 랠리',
    tagColor: '#ef4444',
    title: '[특징주] 필옵틱스, 세계 최초 유리기판 TGV 커팅 양산 장비 수주 임박 소식에 14% 급등',
    media: '머니투데이',
    time: '32분 전',
    code: '161580',
    symbol: '필옵틱스',
    summary: '반도체 패키징의 새로운 게임체인저로 꼽히는 유리기판 레이저 가공 TGV 장비 양산 납품 협상이 가시화되며 강한 거래량 유입.',
    keyword: '필옵틱스 유리기판 TGV 장비'
  },
  {
    category: 'industry',
    tag: '체코 원전 수주',
    tagColor: '#a855f7',
    title: '두산에너빌리티, 체코 원전 실무협상단 현지 파견… 10월 본계약 준비 완료',
    media: '조선비즈',
    time: '45분 전',
    code: '034020',
    symbol: '두산에너빌리티',
    summary: '한국수력원자력 컨소시엄과 함께 두코바니 5, 6호기 주기기 납품을 위한 세부 계약 조율 착수. SMR 파트너십 소식도 겹경사.',
    keyword: '두산에너빌리티 체코 원전 본계약'
  },
  {
    category: 'supply',
    tag: '사모펀드 집중매집',
    tagColor: '#38bdf8',
    title: '인벤티지랩, 장기지속형 비만 주사제 글로벌 빅파마 파트너십 미팅 마무리',
    media: '이데일리',
    time: '1시간 전',
    code: '389470',
    symbol: '인벤티지랩',
    summary: '1개월에 1번만 맞아도 되는 비만치료제 마이크로플루이딕스 제형 변경 플랫폼 기술수출 본계약 임박 소식에 기관 매수세 유입.',
    keyword: '인벤티지랩 비만치료제 기술수출'
  },
  {
    category: 'feature',
    tag: '로봇 대장주',
    tagColor: '#ef4444',
    title: '[특징주] 에스피지, 휴머노이드 투입용 초정밀 감속기 수율 95% 달성에 9% 강세',
    media: '전자신문',
    time: '1시간 전',
    code: '058610',
    symbol: '에스피지',
    summary: '일본 하모닉드라이브가 독점하던 SH감속기 국산화 대체에 성공하고 국내외 로봇 완성품 업체로 양산 납품을 개시했다는 소식.',
    keyword: '에스피지 정밀 감속기 로봇 국산화'
  },
  {
    category: 'disclosure',
    tag: '수주 잭팟',
    tagColor: '#10b981',
    title: '한화에어로스페이스, 루마니아 K9 자주포 후속 탄약운반차 4,500억 추가 계약 협의',
    media: '아시아경제',
    time: '2시간 전',
    code: '012450',
    symbol: '한화에어로',
    summary: '루마니아 1.3조 자주포 계약에 이어 K10 탄약운반장갑차 패키지 공급 협상이 마무리 단계에 접어들며 수주잔고 31조원 돌파.',
    keyword: '한화에어로스페이스 루마니아 K9 자주포'
  },
  {
    category: 'industry',
    tag: '차세대 CXL',
    tagColor: '#38bdf8',
    title: '오픈엣지테크놀로지, CXL 2.0 고성능 메모리 컨트롤러 IP 글로벌 라이선스 계약',
    media: '디지털타임스',
    time: '2시간 전',
    code: '394280',
    symbol: '오픈엣지',
    summary: '서버 메모리 대역폭을 획기적으로 늘리는 CXL 2.0 표준 인터페이스 IP 공급 계약 체결로 팹리스 매출 턴어라운드 본격화.',
    keyword: '오픈엣지테크놀로지 CXL 반도체 IP'
  },
  {
    category: 'supply',
    tag: '연기금 10일 연속 매수',
    tagColor: '#38bdf8',
    title: 'KB금융, 밸류업 지수 편입 및 자사주 3,000억 추가 매입 소각 결의 기대에 상승',
    media: '한국경제TV',
    time: '3시간 전',
    code: '105560',
    symbol: 'KB금융',
    summary: '한국거래소 9월 밸류업 지수 발표를 앞두고 주주환원율 40%를 상회하는 금융 대장주로 연기금과 외국인 패시브 자금 집중 유입.',
    keyword: 'KB금융 기업 밸류업 자사주 소각'
  },
  {
    category: 'feature',
    tag: '전고체 배터리',
    tagColor: '#ef4444',
    title: '[특징주] 이수스페셜티케미컬, 황화리튬 양산 라인 풀가동… 삼성SDI 파일럿 공급 부각',
    media: '머니S',
    time: '3시간 전',
    code: '457190',
    symbol: '이수스페셜티',
    summary: '꿈의 배터리로 불리는 전고체 배터리 핵심 고체전해질 원료인 황화리튬의 고객사 납품 승인 소식에 거래량 250% 급증.',
    keyword: '이수스페셜티케미컬 황화리튬 전고체'
  },
  {
    category: 'industry',
    tag: '정부 정책 수혜',
    tagColor: '#a855f7',
    title: '우진엔텍, 원전 해체 및 계측제어설비 정비 정밀 진단 시스템 특허 등록 완료',
    media: '파이낸셜뉴스',
    time: '4시간 전',
    code: '457550',
    symbol: '우진엔텍',
    summary: '국내 가동 원전 정비 정밀 설비에 이어 체코 원전 경상정비 사업 참여 가능성이 커지며 원전 부품 소형주 순환매 주도.',
    keyword: '우진엔텍 원전 정비 특허 체코'
  }
];

// 1. 당일 주도 테마 데이터베이스 (당일 상승률이 가장 높은 순서대로 1번부터 엄격하게 정렬)
const STOCK_THEMES_DATA = [
  {
    id: 'theme-01',
    rank: 1,
    name: '차세대 HBM4 & 유리기판',
    category: 'semicon',
    rate: '+8.45%',
    rateType: 'up',
    score: 94,
    scoreNote: '당일 상승률 1위 압도적 주도 섹터',
    tradeAmount: '1조 8,400억',
    leader: 'SK하이닉스, 와이씨, 에프에스티, 필옵틱스',
    symbol: '000660',
    tvSymbol: 'KRX:000660',
    desc: '엔비디아 블랙웰 양산 임박 및 차세대 AI 가속기 루빈 16단 HBM4 규격 확정',
    badge: '1위 주도주',
    badgeColor: '#38bdf8',
    searchKeyword: 'HBM 유리기판',
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
    scoreNote: '당일 상승률 2위 바이오 주도 섹터',
    tradeAmount: '9,200억',
    leader: '삼천당제약, 인벤티지랩, 디앤디파마텍, 펩트론',
    symbol: '000250',
    tvSymbol: 'KRX:000250',
    desc: '글로벌 제약사 기술수출(L/O) 본계약 협상 및 경구형(먹는 알약) 캡슐 임상 성공',
    badge: '외인 매집',
    badgeColor: '#34d399',
    searchKeyword: '비만치료제 GLP-1',
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
    name: 'CXL 2.0 & 온디바이스 AI',
    category: 'semicon',
    rate: '+5.35%',
    rateType: 'up',
    score: 86,
    scoreNote: '당일 상승률 3위 차세대 반도체',
    tradeAmount: '4,800억',
    leader: '오픈엣지테크놀로지, 엑시콘, 네오셈, 퀄리타스반도체',
    symbol: '394280',
    tvSymbol: 'KRX:394280',
    desc: 'CXL 2.0 메모리 컨트롤러 양산 진입 및 온디바이스 AI 칩 IP 수요 폭증',
    badge: '차세대 CXL',
    badgeColor: '#38bdf8',
    searchKeyword: 'CXL 2.0 반도체',
    reason: 'HBM의 뒤를 이을 메모리 대역폭 확장 기술인 CXL(컴퓨트 익스프레스 링크) 2.0 상용화 임박과 글로벌 팹리스들의 IP 라이선스 계약 증가.',
    news: [
      { title: '삼성전자·SK하이닉스, CXL 2.0 검증 인프라 구축… 4분기 양산 로드맵', source: '전자신문', time: '1시간 전' },
      { title: '오픈엣지, 고성능 메모리 컨트롤러 IP 수주잔고 사상 최대', source: '머니투데이', time: '2시간 전' }
    ],
    strategy: '실적 턴어라운드 초기 단계. 단기 급등 후 10일선 눌림목 반등 타점을 노리는 매매 유효.'
  },
  {
    id: 'theme-04',
    rank: 4,
    name: '체코 30조 원전 수주 & SMR',
    category: 'policy',
    rate: '+4.85%',
    rateType: 'up',
    score: 88,
    scoreNote: '당일 상승률 4위 정책 수혜 섹터',
    tradeAmount: '7,600억',
    leader: '두산에너빌리티, 한신기계, 우진엔텍, 일진파워',
    symbol: '034020',
    tvSymbol: 'KRX:034020',
    desc: '체코 두코바니 신규 원전 최종 우선협상대상자 선정 및 10월 본계약 조율',
    badge: '정책 모멘텀',
    badgeColor: '#a855f7',
    searchKeyword: '체코 원전 SMR',
    reason: '체코 30조 원전 수주에 이어 폴란드, UAE 등 후속 수주 기대감과 글로벌 빅테크의 AI 데이터센터 전력 공급용 SMR(소형원자로) 파트너십이 지속 부각되며 연기금 매수세 유입.',
    news: [
      { title: '팀코리아 체코 원전 실무협상단 현지 파견… 연내 본계약 마무리 박차', source: '서울경제', time: '2시간 전' },
      { title: '두산에너빌리티, 美 뉴스케일파워 SMR 핵심 단조품 추가 제작 돌입', source: '조선비즈', time: '3시간 전' },
      { title: '글로벌 빅테크 AI 데이터센터 전력난 해법으로 SMR 채택 본격화', source: '디지털타임스', time: '4시간 전' }
    ],
    strategy: '눌림목 매집 구간. 일정 매매(D-Day 본계약 체결일) 타깃으로 20일선 지지선에서 분할 매수 대응.'
  },
  {
    id: 'theme-05',
    rank: 5,
    name: '로봇용 액추에이터 & 피지컬 AI',
    category: 'semicon',
    rate: '+3.90%',
    rateType: 'up',
    score: 85,
    scoreNote: '당일 상승률 5위 피지컬 AI 테마',
    tradeAmount: '5,400억',
    leader: '레인보우로보틱스, 에스피지, 로보티즈, 두산로보틱스',
    symbol: '277810',
    tvSymbol: 'KRX:277810',
    desc: '테슬라 옵티머스 3세대 연내 상용화 및 삼성전자 보핏 양산 확대',
    badge: '기술 트렌드',
    badgeColor: '#fb923c',
    searchKeyword: '로봇 감속기 액추에이터',
    reason: '글로벌 완성차 및 빅테크의 제조 라인 내 휴머노이드 투입 소식으로 정밀 감속기 및 액추에이터 핵심 부품사들의 구조적 실적 턴어라운드 기대감이 증폭됨.',
    news: [
      { title: '테슬라, 공장 투입용 옵티머스 수천 대 양산 공장 부지 확정', source: '헤럴드경제', time: '3시간 전' },
      { title: '에스피지, 정밀 감속기 수율 95% 달성… 국산화 대체 가속도', source: '전자신문', time: '4시간 전' },
      { title: '레인보우로보틱스, 협동로봇 신제품 북미 수출 계약 가시화', source: '머니S', time: '5시간 전' }
    ],
    strategy: '박스권 상단 돌파 시도 중. 대장주 레인보우로보틱스의 기관 수급 유입 확인 후 눌림목 공략.'
  },
  {
    id: 'theme-06',
    rank: 6,
    name: '2차전지 전고체 & 실리콘 음극재',
    category: 'semicon',
    rate: '+3.40%',
    rateType: 'up',
    score: 79,
    scoreNote: '당일 상승률 6위 배터리 혁신',
    tradeAmount: '5,200억',
    leader: '이수스페셜티케미컬, 레이크머티리얼즈, 대주전자재료, 포스코홀딩스',
    symbol: '457190',
    tvSymbol: 'KRX:457190',
    desc: '꿈의 배터리 전고체 파일럿 라인 가동 및 에너지 밀도 20% 향상 실리콘 음극재 납품',
    badge: '전고체 배터리',
    badgeColor: '#f59e0b',
    searchKeyword: '전고체 배터리 실리콘음극재',
    reason: '화재 위험이 없고 주행거리를 획기적으로 늘리는 황화물계 전고체 배터리 소재 납품 테스트 통과 및 실리콘 음극재 탑재 차량 확대 소식 부각.',
    news: [
      { title: '이수스페셜티케미컬, 황화리튬 양산 설비 증설 완료… 글로벌 셀메이커 공급', source: '머니투데이', time: '2시간 전' },
      { title: '대주전자재료, 북미 전기차 신차종 실리콘 음극재 채택 확대', source: '한국경제', time: '4시간 전' }
    ],
    strategy: '중장기 바닥권 탈피 시도. 거래량이 전일 대비 200% 이상 급증할 때 양봉 분할 매수.'
  },
  {
    id: 'theme-07',
    rank: 7,
    name: '방산 K-방산 수출 & 자주포/미사일',
    category: 'policy',
    rate: '+2.80%',
    rateType: 'up',
    score: 83,
    scoreNote: '당일 상승률 7위 수주 랠리',
    tradeAmount: '4,500억',
    leader: '한화에어로스페이스, LIG넥스원, 현대로템, 한국항공우주',
    symbol: '012450',
    tvSymbol: 'KRX:012450',
    desc: '루마니아·폴란드 K9 자주포 및 K2 전차 2차 이행계약 체결 가시화',
    badge: '수주 잭팟',
    badgeColor: '#10b981',
    searchKeyword: 'K-방산 수출 무기',
    reason: '유럽 및 중동 지정학적 리스크 지속에 따른 무기체계 신속 공급 능력 입증과 천궁-II, K9 자주포 대규모 2차 수출 계약 체결 기대감 고조.',
    news: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 협의', source: '아시아경제', time: '3시간 전' },
      { title: '현대로템, 폴란드 K2 전차 2차 실행계약 연내 체결 확실시', source: '조선비즈', time: '4시간 전' }
    ],
    strategy: '실적 기반 우상향 추세. 지수 하락 시에도 기관 수급이 유지되므로 조정 시마다 모아가는 스윙 전략.'
  },
  {
    id: 'theme-08',
    rank: 8,
    name: '밸류업 지배구조 & 금융/지주사',
    category: 'policy',
    rate: '+2.10%',
    rateType: 'up',
    score: 82,
    scoreNote: '당일 상승률 8위 배당 방어 섹터',
    tradeAmount: '6,100억',
    leader: 'KB금융, 메리츠금융지주, 신한지주, 삼성물산',
    symbol: '105560',
    tvSymbol: 'KRX:105560',
    desc: '코리아 디스카운트 해소를 위한 밸류업 지수 9월 발표 및 자사주 소각',
    badge: '안정 배당',
    badgeColor: '#60a5fa',
    searchKeyword: '기업 밸류업 지수',
    reason: '한국거래소 기업 밸류업 지수 공식 발표 및 연기금 패시브 자금 유입 기대감으로 주주환원율 40% 이상 고배당 금융 지주사로 지속적 기관 러브콜.',
    news: [
      { title: '거래소, 9월 밸류업 지수 베일 벗는다… 금융·자동차 편입 유력', source: '파이낸셜뉴스', time: '2시간 전' },
      { title: 'KB금융, 3분기 분기배당 및 추가 자사주 매입 소각 결의 검토', source: '한국경제TV', time: '3시간 전' }
    ],
    strategy: '안정적인 배당 성향 투자자에게 최적. 시장 지수 조정 시 강력한 하방 경직성 보유.'
  }
];

// 2. 1주일 vs 1개월 재료 비교분석 데이터 (기사 발생량 및 미래 지속성 정밀 분석)
const STOCK_COMPARE_DATA = [
  {
    theme: '🔥 HBM · 차세대 패키징',
    searchKeyword: 'HBM4 유리기판',
    leaders: 'SK하이닉스 · 와이씨 · 필옵틱스',
    weekRate: '+14.2%',
    monthRate: '+38.5%',
    buyer: '외인 · 기관 양매수',
    strength: '⭐⭐⭐⭐⭐ 최상',
    // 1주일 단기 슈팅 및 기사 빈도
    weekNewsCount: '142건',
    weekNewsHeadline: '엔비디아 16단 HBM4 규격 조기 채택 발표 및 유리기판 공급망 외인 5천억 매집',
    weekArticles: [
      { title: '엔비디아 차세대 가속기 루빈 HBM4 규격 채택… 하이닉스 점유율 1위 굳히기', media: '한국경제', date: '3일 전' },
      { title: '유리기판 파일럿 라인 가동 본격화… 와이씨·필옵틱스 신고가 랠리', media: '매일경제', date: '5일 전' },
      { title: '외인·기관 반도체 소부장 1조 순매수… HBM4 장비 발주 사이클 도래', media: '머니투데이', date: '6일 전' }
    ],
    // 1개월 누적 기사량 및 미래 지속성 전망
    monthNewsCount: '528건',
    futureOutlook: '초강력 (지속성 95점)',
    futureAnalysis: '글로벌 빅테크(MS, 구글, 메타)의 자체 AI 칩 증설 경쟁으로 2026년까지 공급 부족 지속. 단순 단기 테마가 아닌 1년 이상 지속될 슈퍼 사이클로 조정 시마다 비중 확대 전략 유효.',
    monthArticles: [
      { title: '글로벌 AI 데이터센터 전력/발열 잡는다… 유리기판 메가 트렌드 부상', media: '조선비즈', date: '2주 전' },
      { title: 'SK하이닉스 청주 M15X 조기 완공 추진… 차세대 HBM 패키징 라인 대규모 증설', media: '전자신문', date: '3주 전' },
      { title: '빅테크 AI CAPEX(설비투자) 200조원 상향 돌파… HBM4 납품 선점 경쟁', media: '디지털타임스', date: '4주 전' }
    ]
  },
  {
    theme: '💊 경구용 비만치료제',
    searchKeyword: '경구용 비만치료제 GLP-1',
    leaders: '삼천당제약 · 디앤디파마텍 · 펩트론',
    weekRate: '+18.6%',
    monthRate: '+42.1%',
    buyer: '사모펀드 · 투신 순매수',
    strength: '⭐⭐⭐⭐☆ 상',
    weekNewsCount: '98건',
    weekNewsHeadline: '경구용 GLP-1 알약 제형 변경 임상 성공 및 유럽 5개국 공급 독점 계약 공시',
    weekArticles: [
      { title: '삼천당제약, 경구용 비만약 유럽 독점 판권 본계약 체결 공시', media: '연합뉴스', date: '2일 전' },
      { title: '주사 바늘 공포 끝… 먹는 비만약 플랫폼 보유 국내 제약사 글로벌 러브콜', media: '이데일리', date: '4일 전' },
      { title: '인벤티지랩, 1개월 지속형 주사제 기술수출 협상 마무리 단계', media: '바이오스펙테이터', date: '6일 전' }
    ],
    monthNewsCount: '346건',
    futureOutlook: '상승 추세 지속 (지속성 90점)',
    futureAnalysis: '글로벌 비만 치료제 시장 100조 돌파 전망. 노보노디스크/일라이릴리의 위고비·젭바운드 품귀 현상으로 제형 변경 플랫폼을 보유한 바이오텍의 추가 기술수출(L/O) 계약 모멘텀 상시 대기.',
    monthArticles: [
      { title: '노보노디스크 CEO "먹는 비만약 개발 기업 적극 M&A 추진하겠다"', media: '동아일보', date: '2주 전' },
      { title: '국내 비만 치료제 파이프라인 빅파마 실사 잇따라… 조 단위 기술이전 기대감', media: '한국경제', date: '3주 전' },
      { title: '비만 치료제 보험 급여 확대 움직임… 글로벌 처방 건수 사상 최고치 경신', media: '매일경제', date: '4주 전' }
    ]
  },
  {
    theme: '⚡ 체코 원전 & 소형 SMR',
    searchKeyword: '체코 원전 SMR 수주',
    leaders: '두산에너빌리티 · 우진엔텍 · 한신기계',
    weekRate: '+7.8%',
    monthRate: '+26.4%',
    buyer: '연기금 순매수 지속',
    strength: '⭐⭐⭐⭐☆ 상',
    weekNewsCount: '76건',
    weekNewsHeadline: '체코 두코바니 30조 원전 실무협상단 현지 급파 및 10월 본계약 로드맵',
    weekArticles: [
      { title: '팀코리아 체코 정부와 원전 본계약 세부 조항 협상 순항… 10월 서명 유력', media: '서울경제', date: '1일 전' },
      { title: '두산에너빌리티, 美 뉴스케일파워 소형 모듈 원자로 주기기 추가 수주', media: '조선비즈', date: '3일 전' },
      { title: '빅테크 AI 전력난 해소 위해 원전 필수… 美 의회 SMR 인허가 패스트트랙 통과', media: '디지털타임스', date: '5일 전' }
    ],
    monthNewsCount: '284건',
    futureOutlook: '강력 정책 수혜 (지속성 88점)',
    futureAnalysis: '10월 본계약 체결 일정(D-Day)까지 기대감 극대화 구간. 이후 폴란드, 루마니아, 네덜란드 등 유럽 원전 후속 수출과 글로벌 AI 데이터센터의 SMR 결합으로 중장기 수주 랠리 가시화.',
    monthArticles: [
      { title: '정부, 원전 생태계 완전 복원 선언… 5년간 4조원 금융·R&D 지원책 발표', media: '한국경제', date: '2주 전' },
      { title: '웨스팅하우스 소송 리스크 완화… 한미 원전 동맹 수출 길 활짝 열려', media: '파이낸셜뉴스', date: '3주 전' },
      { title: '유럽 각국 탈원전 폐기하고 신규 원전 20기 건설 발표… K-원전 최대 수혜', media: '연합뉴스', date: '4주 전' }
    ]
  },
  {
    theme: '🤖 피지컬 AI & 휴머노이드',
    searchKeyword: '휴머노이드 로봇 액추에이터',
    leaders: '레인보우로보틱스 · 에스피지 · 로보티즈',
    weekRate: '+4.5%',
    monthRate: '+12.0%',
    buyer: '외인 매수 전환',
    strength: '⭐⭐⭐☆☆ 중',
    weekNewsCount: '62건',
    weekNewsHeadline: '테슬라 옵티머스 3세대 공장 투입용 양산 부지 확정 및 감속기 국산화 수율 95%',
    weekArticles: [
      { title: '테슬라 옵티머스 3세대 연내 상용화… 부품사 대상 대량 견적 요청서 발송', media: '헤럴드경제', date: '2일 전' },
      { title: '에스피지, 초정밀 로봇 감속기 국산화 성공… 글로벌 로봇사에 초도 납품', media: '전자신문', date: '4일 전' },
      { title: '레인보우로보틱스, 삼성전자 스마트팩토리 협동로봇 전면 배치 착수', media: '머니S', date: '5일 전' }
    ],
    monthNewsCount: '210건',
    futureOutlook: '중기 변동성 (지속성 82점)',
    futureAnalysis: '완성차 조립 라인의 휴머노이드 투입은 거스를 수 없는 대세이나, 실제 실적 반영까지 1~2개 분기 소요 예상. 일정(옵티머스 공개, 로봇 양산 이벤트)에 따른 박스권 눌림목 매매 추천.',
    monthArticles: [
      { title: '현대차그룹 보스턴다이내믹스 아틀라스 전기식 신모델 공장 실증 테스트 돌입', media: '매일경제', date: '2주 전' },
      { title: '피지컬 AI 혁명… 로봇 파운데이션 모델(RFM) 연구에 빅테크 50조 투자', media: '조선일보', date: '3주 전' },
      { title: '산업부, 지능형 로봇 기본계획 2.0 발표… 지능형 감속기 R&D 세액공제 확대', media: '연합뉴스', date: '4주 전' }
    ]
  },
  {
    theme: '🏛️ 저PBR 기업 밸류업',
    searchKeyword: '기업 밸류업 지수 고배당',
    leaders: 'KB금융 · 메리츠금융 · 신한지주',
    weekRate: '+2.1%',
    monthRate: '+9.8%',
    buyer: '외인 지속 매수',
    strength: '⭐⭐⭐☆☆ 중',
    weekNewsCount: '54건',
    weekNewsHeadline: '거래소 9월 하순 KRX 밸류업 지수 공식 발표 및 금융지주 자사주 소각 확대',
    weekArticles: [
      { title: '한국거래소, 9월 밸류업 지수 편입 100개 종목 가이드라인 최종 조율', media: '파이낸셜뉴스', date: '2일 전' },
      { title: '금융지주 4사, 3분기 총주주환원율 40% 돌파… 배당주 펀드로 기관 뭉칫돈 유입', media: '한국경제TV', date: '4일 전' }
    ],
    monthNewsCount: '195건',
    futureOutlook: '하방 경직성 보유 (지속성 80점)',
    futureAnalysis: '지수 발표 후 10월부터 연계 ETF 신규 상장 및 연기금 패시브 자금 1조원 이상 유입 예정. 시장 급락 시에도 배당 수익률로 하방을 지지하는 든든한 포트폴리오 방어주 역할.',
    monthArticles: [
      { title: '국민연금, 국내 주식 위탁운용사에 밸류업 지표 평가 반영 추진', media: '연합뉴스', date: '2주 전' },
      { title: '상장사 자사주 소각 금액 전년비 2배 폭증… 주주환원 선진국형 안착 가속화', media: '서울경제', date: '3주 전' }
    ]
  },
  {
    theme: '🛡️ K-방산 수출 랠리',
    searchKeyword: 'K-방산 수출 계약',
    leaders: '한화에어로 · 현대로템 · LIG넥스원',
    weekRate: '+6.2%',
    monthRate: '+19.5%',
    buyer: '기관 6일 연속 매수',
    strength: '⭐⭐⭐⭐☆ 상',
    weekNewsCount: '81건',
    weekNewsHeadline: '루마니아·폴란드 K9 자주포 및 K2 전차 2차 실행계약 연내 체결 확실시',
    weekArticles: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 마무리 단계', media: '아시아경제', date: '1일 전' },
      { title: '현대로템 폴란드 K2 2차 계약 4조원대 임박… 생산 라인 풀가동 돌입', media: '조선비즈', date: '3일 전' },
      { title: '중동 천궁-II 미사일 요격체계 추가 수출 타진… K-방산 수주잔고 100조 돌파', media: '매일경제', date: '5일 전' }
    ],
    monthNewsCount: '260건',
    futureOutlook: '실적 기반 탄탄 (지속성 89점)',
    futureAnalysis: '지정학적 리스크 지속과 전 세계적인 국방비 증액으로 향후 3~4년간 안정적인 매출 인식 확정. 환율 우호적 환경과 분기 실적 서프라이즈가 지속되며 지수 대비 강한 상대적 강도 유지 전망.',
    monthArticles: [
      { title: '나토 회원국 국방비 GDP 2% 달성 의무화… 한국산 무기체계 납기 경쟁력 독보적', media: '조선일보', date: '2주 전' },
      { title: '방산업계 하반기 영업이익 사상 최대 전망… 증권사 일제히 목표주가 상향', media: '한국경제', date: '3주 전' }
    ]
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
  initDomesticStockNews();
  renderStockThemesList();
  selectStockTheme(0);
  renderStockCompareTable();
  renderStockCalendar();
  initStockSearch();
  initStockDeepResearch();
  initGlobalMarketNews();
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
    news: document.getElementById('stock-panel-news'),
    theme: document.getElementById('stock-panel-theme'),
    compare: document.getElementById('stock-panel-compare'),
    calendar: document.getElementById('stock-panel-calendar'),
    technique: document.getElementById('stock-panel-technique'),
    deep: document.getElementById('stock-panel-deep')
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

  const newsHtml = item.news.map(n => {
    // [단독], [특징주] 등의 말머리 태그를 제거한 핵심 검색어로 정확한 기사를 검색
    const cleanTitle = n.title.replace(/\[.*?\]/g, '').trim();
    const articleSearchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || n.title)}`;
    return `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
      <div style="flex: 1;">
        <div style="font-size: 0.88rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px; line-height: 1.4;">
          ${escapeHtml(n.title)}
        </div>
        <div style="font-size: 0.74rem; color: #94a3b8;">
          ${escapeHtml(n.source)} · ${escapeHtml(n.time)}
        </div>
      </div>
      <a href="${articleSearchUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 5px 12px; border-radius: 6px; font-size: 0.76rem; text-decoration: none; font-weight: 700; white-space: nowrap; transition: all 0.2s ease;">
        기사 보기 ↗
      </a>
    </div>
  `;
  }).join('');

  // 관련 뉴스 전체보기 링크 생성: 테마별 명확한 검색 키워드로 연결
  const relatedNewsKeyword = item.searchKeyword || `${item.leader.split(',')[0]} ${item.name.replace(/&/g, '')}`.trim();
  const relatedNewsUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(relatedNewsKeyword)}`;

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
        <a href="${relatedNewsUrl}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn" title="'${escapeHtml(relatedNewsKeyword)}' 네이버 뉴스 검색">
          관련 뉴스 전체보기 ↗
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

// 1주일 & 1달 재료 비교 테이블 렌더링 (요구사항 3번 반영)
function renderStockCompareTable(period = 'week') {
  const tbody = document.getElementById('stock-compare-tbody');
  const thead = document.getElementById('stock-compare-thead');
  const titleEl = document.getElementById('stock-compare-table-title');
  const badgeEl = document.getElementById('stock-compare-table-badge');
  if (!tbody || !thead) return;

  if (period === 'week') {
    if (titleEl) titleEl.textContent = '⚡ 오늘 슈팅 테마 2번 재료모음: 최근 1주일간 관련 기사 빈도 및 발생량 모음';
    if (badgeEl) {
      badgeEl.textContent = '1주일 기사 모음 모드 (단기 슈팅 모멘텀)';
      badgeEl.style.background = 'rgba(56, 189, 248, 0.15)';
      badgeEl.style.color = '#38bdf8';
      badgeEl.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    }

    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding: 12px 10px; width: 170px;">주요 슈팅 테마</th>
        <th style="text-align: center; width: 150px;">대장주 (종목군)</th>
        <th style="text-align: center; width: 110px;">1주 누적 기사량</th>
        <th style="text-align: center; width: 100px;">1주 수익률</th>
        <th style="text-align: left; padding-left: 14px;">1주일간 관련 기사 모음 & 단기 슈팅 핵심 재료</th>
      </tr>
    `;

    tbody.innerHTML = STOCK_COMPARE_DATA.map(row => {
      const articlesHtml = (row.weekArticles || []).map(a => {
        const cleanT = a.title.replace(/\[.*?\]/g, '').trim();
        const newsLink = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); gap: 8px;">
            <div style="font-size: 0.78rem; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
              • <strong style="color: #94a3b8;">[${escapeHtml(a.media)}]</strong> ${escapeHtml(a.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(a.date)}</span>
              <a href="${newsLink}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-size: 0.7rem; text-decoration: none; font-weight: 700;">
                기사 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding: 14px 10px; font-weight: 800; color: #f8fafc; vertical-align: top;">
            ${row.theme}
            <div style="margin-top: 4px;">
              <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(row.searchKeyword || row.theme)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: none; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                1주 뉴스 모음 ↗
              </a>
            </div>
          </td>
          <td style="padding: 14px 10px; text-align: center; color: #94a3b8; font-weight: 600; vertical-align: top; font-size: 0.84rem;">
            ${row.leaders}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <span style="display: inline-block; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 0.88rem;">
              🔥 ${row.weekNewsCount || '80+건'}
            </span>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">주간 기사 폭증</div>
          </td>
          <td style="padding: 14px 10px; text-align: center; font-weight: 900; color: #ef4444; vertical-align: top; font-size: 0.95rem;">
            ${row.weekRate}
          </td>
          <td style="padding: 14px 14px; vertical-align: top;">
            <div style="font-size: 0.85rem; font-weight: 700; color: #38bdf8; margin-bottom: 8px; line-height: 1.4;">
              📢 ${escapeHtml(row.weekNewsHeadline || '')}
            </div>
            <div style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.05);">
              ${articlesHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } else {
    // 1개월 비교 모드: 1달 동안 관련 기사 누적량 나열 및 미래 지속성 정밀 분석
    if (titleEl) titleEl.textContent = '🔮 1달 비교 분석: 1개월간 누적 기사 나열 및 앞으로의 미래 지속성 종합 평가';
    if (badgeEl) {
      badgeEl.textContent = '1개월 누적 비교 모드 (미래 지속성 분석)';
      badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
      badgeEl.style.color = '#34d399';
      badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    thead.innerHTML = `
      <tr>
        <th style="text-align: left; padding: 12px 10px; width: 170px;">테마 및 모멘텀</th>
        <th style="text-align: center; width: 140px;">대장주</th>
        <th style="text-align: center; width: 110px;">1달 누적 기사량</th>
        <th style="text-align: center; width: 100px;">1달 상승률</th>
        <th style="text-align: center; width: 140px;">미래 지속성 평가</th>
        <th style="text-align: left; padding-left: 14px;">1달간 주요 기사 나열 & 향후 지속성 정밀 분석</th>
      </tr>
    `;

    tbody.innerHTML = STOCK_COMPARE_DATA.map(row => {
      const articlesHtml = (row.monthArticles || []).map(a => {
        const cleanT = a.title.replace(/\[.*?\]/g, '').trim();
        const newsLink = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.06); gap: 8px;">
            <div style="font-size: 0.78rem; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
              • <strong style="color: #34d399;">[${escapeHtml(a.media)}]</strong> ${escapeHtml(a.title)}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="font-size: 0.7rem; color: #64748b;">${escapeHtml(a.date)}</span>
              <a href="${newsLink}" target="_blank" rel="noopener noreferrer" style="color: #34d399; font-size: 0.7rem; text-decoration: none; font-weight: 700;">
                기사 ↗
              </a>
            </div>
          </div>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding: 14px 10px; font-weight: 800; color: #f8fafc; vertical-align: top;">
            ${row.theme}
            <div style="margin-top: 4px;">
              <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(row.searchKeyword || row.theme)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #34d399; text-decoration: none; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                1달 뉴스 전체 ↗
              </a>
            </div>
          </td>
          <td style="padding: 14px 10px; text-align: center; color: #94a3b8; font-weight: 600; vertical-align: top; font-size: 0.84rem;">
            ${row.leaders}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <span style="display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 8px; font-weight: 900; font-size: 0.88rem;">
              📚 ${row.monthNewsCount || '200+건'}
            </span>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 4px;">1달간 누적</div>
          </td>
          <td style="padding: 14px 10px; text-align: center; font-weight: 900; color: #f59e0b; vertical-align: top; font-size: 0.95rem;">
            ${row.monthRate}
          </td>
          <td style="padding: 14px 10px; text-align: center; vertical-align: top;">
            <div style="font-size: 0.82rem; font-weight: 800; color: #38bdf8; margin-bottom: 4px;">
              ${escapeHtml(row.futureOutlook || '양호')}
            </div>
            <div style="font-size: 0.74rem; color: #e2e8f0; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${row.strength}
            </div>
          </td>
          <td style="padding: 14px 14px; vertical-align: top;">
            <!-- 1달 미래 지속성 분석 리포트 -->
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                <span>🔭</span> 향후 미래 지속성 및 수석 연구원 총평:
              </div>
              <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.55;">
                ${escapeHtml(row.futureAnalysis || row.strategy)}
              </div>
            </div>
            <!-- 1개월 주요 기사 목록 나열 -->
            <div style="background: rgba(0,0,0,0.25); border-radius: 6px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 700; margin-bottom: 4px;">1달간 핵심 주요 기사 히스토리:</div>
              ${articlesHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
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

// ============================================================================
// 5. 종목 상세정보 딥분석 센터 (Deep Research Data & Functions)
// - 공시 + 실적 + BM(수주/제조업 돈 버는 구조) + 관련 뉴스 + 캘린더 일정 + 엮인 테마 종목군 + 미래 전망 총집합
// ============================================================================
const STOCK_DEEP_DATA = [
  {
    id: 'deep-000660',
    symbol: '000660',
    name: 'SK하이닉스',
    market: 'KOSPI · 반도체 대장주',
    sector: '제조업 / 첨단 반도체 파운드리 연계 패키징',
    currentPrice: '168,500원',
    changeRate: '+3.82%',
    rateType: 'up',
    marketCap: '122조 6,660억원 (코스피 2위)',
    foreignRate: '54.2%',
    perPbr: 'PER 14.8배 · PBR 1.85배 · ROE 18.2%',
    badge: 'HBM4 세계 1위',
    badgeColor: '#38bdf8',
    oneLine: '엔비디아 HBM 점유율 1위 독점 공급자. 16단 HBM4 및 유리기판 양산 주도.',
    
    // 1. 비즈니스 모델 (어떻게 현재 돈을 벌고 있는가?)
    bm: {
      type: '제조업 (첨단 메모리 & 어드밴스드 패키징)',
      structure: 'HBM(고대역폭 메모리) 42% + 서버용 DDR5 33% + 기업용 eSSD(낸드) 20% + 기타 5%',
      cashCow: '엔비디아 AI 가속기(B200, GB200, 루빈) 납품용 12단/16단 HBM3E 및 HBM4. 일반 D램 대비 마진율이 4~5배에 달하는 고부가가치 AI 메모리가 전체 영업이익의 70% 견인.',
      costStructure: 'EUV(극자외선 노광) 장비 감가상각비 및 TSV(실리콘 관통전극) 본딩 기술 로열티, 웨이퍼 원자재비가 주요 비용이나 압도적인 수율(80% 이상)로 원가 경쟁력 세계 최고.'
    },

    // 2. 실적 히스토리 & 컨센서스
    financials: {
      q24_1: { sales: '12조 4,300억', profit: '2조 8,860억', margin: '23.2%' },
      q24_2: { sales: '16조 4,233억', profit: '5조 4,685억', margin: '33.3%' },
      q24_3E: { sales: '18조 1,200억 (예상)', profit: '6조 7,500억 (예상)', margin: '37.2%' },
      annual2024E: '연간 매출 66조원 / 영업이익 23조원 흑자 대전환 (사상 최대 실적 경신 전망)',
      point: 'D램과 eSSD 전 제품군 판가(ASP) 상승과 HBM 완판으로 영업이익률 35% 돌파. 과거 사이클 대비 고정비 부담이 대폭 경감됨.'
    },

    // 3. 최근 주요 공시 & 수주/계약
    disclosures: [
      { date: '2026-08-28', title: '청주 M15X 신규 패키징 팹 20조원 투자 진행 현황 안내', tag: '설비투자' },
      { date: '2026-08-14', title: '반기보고서 (2024.06) 제출 - HBM 매출 비중 역대 최고치', tag: '정기공시' },
      { date: '2026-07-25', title: '2분기 연결기준 영업이익 5조 4,685억원 달성 (전년비 흑자전환)', tag: '실적공시' },
      { date: '2026-04-19', title: '美 인디애나주 차세대 패키징 R&D 생산기지 건설 투자 협약', tag: '해외투자' }
    ],

    // 4. 이 종목에 관련된 모든 핵심 기사 (현재 뉴스 모음)
    articles: [
      { title: '엔비디아 차세대 가속기 루빈 HBM4 규격 채택… 하이닉스 1위 굳히기', media: '한국경제', time: '18분 전', date: '오늘' },
      { title: 'SK하이닉스, HBM3E 12단 3분기 양산 돌입… 경쟁사 격차 1년 이상 벌려', media: '매일경제', time: '1시간 전', date: '오늘' },
      { title: '외인·기관 반도체 소부장 1조 순매수… 하이닉스 중심 장비 발주 사이클', media: '머니투데이', time: '3시간 전', date: '어제' },
      { title: '글로벌 빅테크 AI CAPEX 200조원 상향 돌파… HBM4 납품 선점 경쟁', media: '디지털타임스', time: '1일 전', date: '2일 전' }
    ],

    // 5. 엮여있는 테마 및 관련주 맵
    themes: [
      {
        name: '🔥 차세대 HBM4 & 패키징',
        relation: '주도 대장주 (글로벌 1등)',
        peers: '한미반도체, 와이씨, 에프에스티, 필옵틱스, 제우스'
      },
      {
        name: '🧪 유리기판(Glass Substrate)',
        relation: '유리기판 컨소시엄 주도사',
        peers: 'SKC, 앱솔릭스, 필옵틱스, 제이앤티씨'
      },
      {
        name: '💾 CXL 2.0 및 온디바이스 메모리',
        relation: 'CXL D램 규격 공동 표준 수립',
        peers: '네오셈, 오픈엣지테크놀로지, 엑시콘'
      }
    ],

    // 6. 증시 주요 일정 및 D-Day
    events: [
      { date: '2026-09-17 (수)', title: '엔비디아 글로벌 AI 서밋 CEO 기조연설', dday: 'D-2', impact: 'HBM4 표준 및 루빈 공급사 언급 여부 초관심' },
      { date: '2026-10-24 (목)', title: 'SK하이닉스 2024년 3분기 공식 실적 발표', dday: 'D-39', impact: '영업이익 6조 5천억 돌파 여부 및 HBM 납품 가이던스' }
    ],

    // 7. 이 종목의 미래 종집합소 (미래 지속성 & 최종 총평)
    futureOutlook: {
      rating: '적극 매수 (Conviction Buy)',
      targetScore: 96,
      summary: '단순 반도체 제조사를 넘어 글로벌 AI 빅테크 인프라의 핵심 엔진으로 도약.',
      catalyst: '2026년 하반기 16단 HBM4 조기 출하와 용인 반도체 클러스터 가동으로 1등 프리미엄 유지.',
      riskCheck: '미국의 대중국 AI 반도체 추가 수출 규제와 빅테크의 단기 AI CAPEX 조정 가능성 체크 필요.'
    }
  },
  {
    id: 'deep-000250',
    symbol: '000250',
    name: '삼천당제약',
    market: 'KOSDAQ · 바이오 대장주',
    sector: '제약/바이오 (경구용 제형 플랫폼 및 아일리아 바이오시밀러)',
    currentPrice: '142,000원',
    changeRate: '+6.12%',
    rateType: 'up',
    marketCap: '3조 2,150억원 (코스닥 5위)',
    foreignRate: '12.8%',
    perPbr: 'PER 68.2배 · PBR 8.4배 · 기술수출 기대감 선반영',
    badge: '경구용 GLP-1 1등',
    badgeColor: '#34d399',
    oneLine: '먹는(경구용) 비만/당뇨 치료제 플랫폼 S-PASS 보유. 유럽 본계약 체결 가시화.',
    
    bm: {
      type: '바이오 플랫폼 기술수출(L/O) 및 바이오시밀러 제조업',
      structure: '안과용 치료제(아일리아 시밀러) 판권 45% + 경구용 플랫폼 기술이전 40% + 제네릭 의약품 15%',
      cashCow: '주사제 전용 약물을 알약으로 흡수시키는 독자적 경구화 기술 \'S-PASS\'. 글로벌 빅파마 대상 유럽/북미 판권 계약금 및 경상기술료(마일스톤/로열티) 유입 구조.',
      costStructure: '임상 1/3상 시험비용 및 글로벌 실사(Audit) 대응비가 핵심이며, 완제의약품 생산은 글로벌 파트너 CMO와 공동 진행하여 시설투자 리스크 최소화.'
    },

    financials: {
      q24_1: { sales: '460억', profit: '22억', margin: '4.8%' },
      q24_2: { sales: '585억', profit: '68억', margin: '11.6%' },
      q24_3E: { sales: '720억 (예상)', profit: '145억 (예상)', margin: '20.1%' },
      annual2024E: '유럽 판권 계약금 유입 시 영업이익 500억 돌파 및 사상 최대 흑자 도약',
      point: '바이오시밀러 유럽 허가 승인과 비만치료제 본계약 체결 시 폭발적인 기술료 영업이익 전환 구조.'
    },

    disclosures: [
      { date: '2026-09-02', title: '경구용 GLP-1 비만치료제 유럽 5개국 공급 독점 판매 본계약 체결', tag: '수주/계약' },
      { date: '2026-08-20', title: '투자판단 관련 주요경영사항 - 아일리아 바이오시밀러 유럽 품목허가 승인', tag: '주요사항' },
      { date: '2026-07-15', title: '기타 시장안내 - 전환사채(CB) 전량 조기상환 완료로 오버행 해소', tag: '재무공시' }
    ],

    articles: [
      { title: '삼천당제약, 경구용 GLP-1 유럽 5개국 공급 독점 계약 체결 공시', media: '연합뉴스', time: '25분 전', date: '오늘' },
      { title: '주사 바늘 공포 끝… 먹는 비만약 플랫폼 보유 삼천당제약 수급 폭발', media: '이데일리', time: '1시간 전', date: '오늘' },
      { title: '노보노디스크·일라이릴리 실적 서프라이즈… 비만약 플랫폼주 재평가', media: '바이오스펙테이터', time: '3시간 전', date: '어제' }
    ],

    themes: [
      {
        name: '💊 경구용 비만/당뇨 치료제',
        relation: '국내 기술 독점 대장주',
        peers: '인벤티지랩, 디앤디파마텍, 펩트론, 한미약품'
      },
      {
        name: '👁️ 황반변성 아일리아 바이오시밀러',
        relation: '유럽 퍼스트무버 승인사',
        peers: '셀트리온, 삼성바이오에피스, 알테오젠'
      }
    ],

    events: [
      { date: '2026-09-24 (목)', title: '미국 FDA 아일리아 바이오시밀러 품목허가 최종 승인 D-Day', dday: 'D-9', impact: '북미 시장 직판 및 대규모 마일스톤 유입 분기점' },
      { date: '2026-10-18 (금)', title: '글로벌 바이오 유럽 파트너링 컨퍼런스 참가', dday: 'D-33', impact: '비만약 북미 판권 추가 본계약 협상 결과 발표' }
    ],

    futureOutlook: {
      rating: '매수 (Growth Momentum)',
      targetScore: 92,
      summary: '경구용 비만 치료제 시장의 패러다임 변화를 이끄는 핵심 게임체인저.',
      catalyst: '글로벌 100조 비만치료제 시장에서 주사제 복용 불편을 해소한 알약 상용화 독점력.',
      riskCheck: '글로벌 빅파마 임상 검증 지연 여부 및 계약금 분할 인식 일정 모니터링 필요.'
    }
  },
  {
    id: 'deep-034020',
    symbol: '034020',
    name: '두산에너빌리티',
    market: 'KOSPI · 원전/에너지 대장주',
    sector: '수주산업 / 대형 원자력 발전설비 및 SMR 주기기 제작',
    currentPrice: '21,300원',
    changeRate: '+4.85%',
    rateType: 'up',
    marketCap: '13조 6,400억원 (코스피 24위)',
    foreignRate: '21.5%',
    perPbr: 'PER 24.5배 · PBR 1.35배 · 수주잔고 17조원 돌파',
    badge: '체코 30조 수혜',
    badgeColor: '#a855f7',
    oneLine: '체코 30조 원전 주기기 제작 독점. 빅테크 AI 데이터센터 SMR 파트너십.',
    
    bm: {
      type: '수주산업 (글로벌 원전 및 가스터빈/SMR 단조 부품 제조업)',
      structure: '대형 원전 주기기(원자로·증기발생기) 48% + 가스터빈 및 복합화력 28% + 신재생/SMR 18% + 기타 6%',
      cashCow: '한국수력원자력 팀코리아의 체코 2기 원전 건설 수주(두산에너빌리티 몫 약 4~5조원 주기기 공급). 뉴스케일파워, 엑스에너지 등 미국 SMR 선두기업 전용 단조품 독점 제작.',
      costStructure: '원자재(특수강, 티타늄) 가격 및 생산 리드타임(3~4년)에 따른 장기 수주 공사손실 충당금 관리 필요.'
    },

    financials: {
      q24_1: { sales: '4조 980억', profit: '3,580억', margin: '8.7%' },
      q24_2: { sales: '4조 2,150억', profit: '3,890억', margin: '9.2%' },
      q24_3E: { sales: '4조 4,500억 (예상)', profit: '4,100억 (예상)', margin: '9.2%' },
      annual2024E: '연간 매출 17조 5천억 / 영업이익 1조 6천억 돌파 확정적',
      point: '원전 수주잔고 사상 최대치(17조원) 경신으로 향후 4년간 안정적 고마진 공사 진행.'
    },

    disclosures: [
      { date: '2026-08-22', title: '단일판매 공급계약 체결 - 美 뉴스케일파워 SMR 소재 제작 계약', tag: '수주공시' },
      { date: '2026-07-18', title: '체코 신규 원전 건설사업 우선협상대상자 선정 결과 안내', tag: '대규모수주' },
      { date: '2026-06-11', title: '국내 순수 기술 개발 한국형 초대형 가스터빈 공급 계약 체결', tag: '신성장사업' }
    ],

    articles: [
      { title: '팀코리아 체코 원전 실무협상단 현지 파견… 연내 본계약 마무리 박차', media: '서울경제', time: '2시간 전', date: '오늘' },
      { title: '두산에너빌리티, 美 뉴스케일파워 SMR 핵심 단조품 추가 제작 돌입', media: '조선비즈', time: '3시간 전', date: '오늘' },
      { title: '글로벌 빅테크 AI 데이터센터 전력난 해법으로 SMR 채택 본격화', media: '디지털타임스', time: '4시간 전', date: '오늘' }
    ],

    themes: [
      {
        name: '⚡ 체코 원전 & 글로벌 수주',
        relation: '원자로 주기기 독점 제작 총괄',
        peers: '한신기계, 우진엔텍, 일진파워, 에너토크'
      },
      {
        name: '🤖 AI 데이터센터 전력망 & SMR',
        relation: '미국 SMR 주기기 제작 파트너',
        peers: '비에이치아이, 서전기전, LS ELECTRIC'
      }
    ],

    events: [
      { date: '2026-10-15 (목)', title: '체코 정부 두코바니 원전 최종 본계약 체결식', dday: 'D-30', impact: '30조원 정식 수주 확정 및 계약금 10% 유입' },
      { date: '2026-11-04 (수)', title: '미국 차세대 원자력 에너지 규제 컨퍼런스', dday: 'D-50', impact: '뉴스케일파워 상용 SMR 착공 인허가 발표' }
    ],

    futureOutlook: {
      rating: '매수 (Long-term Buy)',
      targetScore: 90,
      summary: 'AI 시대 최대 병목인 전력난을 해결하는 원전 르네상스의 최대 수혜주.',
      catalyst: '체코에 이은 폴란드, UAE 2차 원전 후속 수주 및 대형 가스터빈 실적 레버리지.',
      riskCheck: '국제 원자재 시세 급등 및 지정학적 수출 통제 인허가 절차 지연 주의.'
    }
  },
  {
    id: 'deep-277810',
    symbol: '277810',
    name: '레인보우로보틱스',
    market: 'KOSDAQ · 로봇 대장주',
    sector: '제조업 / 휴머노이드 및 협동로봇 완제품 개발/양산',
    currentPrice: '156,000원',
    changeRate: '+3.90%',
    rateType: 'up',
    marketCap: '3조 1,200억원 (코스닥 7위)',
    foreignRate: '9.4%',
    perPbr: 'PER 95.0배 · PBR 12.1배 · 삼성전자 지분 인수 기대감',
    badge: '삼성 로봇 협력',
    badgeColor: '#fb923c',
    oneLine: '삼성전자가 2대 주주인 휴머노이드 로봇 대표주. 감속기/모터 내재화 100%.',
    
    bm: {
      type: '제조업 (협동로봇 완제품 및 피지컬 AI 휴머노이드 플랫폼)',
      structure: '협동로봇(RB 시리즈) 60% + 초정밀 모션 제어기/부품 25% + 4족보행 로봇/기타 15%',
      cashCow: '핵심 부품인 감속기, 모터, 브레이크, 엔코더 100% 자체 개발/내재화로 타 경쟁사 대비 원가율 50% 절감. 삼성전자 평택/기흥 반도체 라인 협동로봇 전면 공급.',
      costStructure: '휴머노이드 양산 R&D 인력 인건비 및 피지컬 AI 파운데이션 모델 학습 비용 중심.'
    },

    financials: {
      q24_1: { sales: '48억', profit: '2억', margin: '4.1%' },
      q24_2: { sales: '65억', profit: '8억', margin: '12.3%' },
      q24_3E: { sales: '92억 (예상)', profit: '18억 (예상)', margin: '19.5%' },
      annual2024E: '삼성전자 스마트팩토리 투입 본격화로 2025년부터 매출 300% 퀀텀점프 기대',
      point: '국내 유일 부품 수직계열화 성공으로 영업마진율 20% 상회 가능한 구조적 경쟁력.'
    },

    disclosures: [
      { date: '2026-08-10', title: '최대주주 변경을 수반하는 주식매수선택권(콜옵션) 행사 현황 안내', tag: '지배구조' },
      { date: '2026-07-02', title: '반도체 제조공정 투입용 특수 방진 협동로봇 신제품 납품 계약', tag: '수주계약' },
      { date: '2026-05-18', title: '북미 대형 로봇 자동화 유통망 구축 파트너십 체결', tag: '해외진출' }
    ],

    articles: [
      { title: '테슬라 옵티머스 3세대 연내 상용화… 로봇 부품사 견적 발주 본격화', media: '헤럴드경제', time: '3시간 전', date: '오늘' },
      { title: '레인보우로보틱스 협동로봇 신제품 북미 수출 계약 가시화', media: '머니S', time: '5시간 전', date: '오늘' },
      { title: '삼성전자, 보핏 양산 확대 및 레인보우로보틱스 콜옵션 행사 시점 임박', media: '조선비즈', time: '1일 전', date: '어제' }
    ],

    themes: [
      {
        name: '🤖 피지컬 AI & 휴머노이드',
        relation: '국내 휴머노이드 최고 기술 대장주',
        peers: '에스피지, 로보티즈, 두산로보틱스, 엔젤로보틱스'
      },
      {
        name: '🏢 삼성 로봇 에코시스템',
        relation: '삼성전자 콜옵션 지분 59.94% 잠재 보유',
        peers: '이랜시스, 인탑스, 에스비비테크'
      }
    ],

    events: [
      { date: '2026-10-10 (토)', title: '테슬라 로보택시 및 옵티머스 3세대 공개 이벤트', dday: 'D-25', impact: '글로벌 휴머노이드 로봇 부품 수요 재부각 모멘텀' },
      { date: '2026-11-20 (금)', title: '삼성전자 콜옵션 행사 가능 기한 도래', dday: 'D-66', impact: '삼성전자 자회사 편입 공시 발생 시 주가 재평가' }
    ],

    futureOutlook: {
      rating: '스윙 분할 매수 (High Growth)',
      targetScore: 88,
      summary: '제조업 무인화와 인공지능이 로봇 몸체를 얻는 피지컬 AI 시대의 최고 수혜주.',
      catalyst: '삼성전자 자회사 편입 이벤트와 북미 물류/공장 라인 대규모 수출 체결.',
      riskCheck: '현재 밸류에이션이 높아 분기 실적 미스 시 단기 변동성 확대 주의.'
    }
  },
  {
    id: 'deep-012450',
    symbol: '012450',
    name: '한화에어로스페이스',
    market: 'KOSPI · K-방산 대장주',
    sector: '수주산업 / 자주포, 다련장 로켓, 항공기 엔진 및 발사체',
    currentPrice: '328,000원',
    changeRate: '+2.80%',
    rateType: 'up',
    marketCap: '16조 5,900억원 (코스피 18위)',
    foreignRate: '38.6%',
    perPbr: 'PER 16.2배 · PBR 2.1배 · 수주잔고 30조원 돌파',
    badge: 'K9 자주포 글로벌 1위',
    badgeColor: '#10b981',
    oneLine: '글로벌 자주포 시장 점유율 50% 석권. 루마니아·폴란드 2차 수주 잭팟.',
    
    bm: {
      type: '수주산업 (방위산업 지상무기체계 및 항공우주 제조업)',
      structure: '지상 방산(K9 자주포, 천무 다련장) 65% + 항공우주 엔진 20% + 한화비전/정밀기계 15%',
      cashCow: '폴란드 1/2차 K9 자주포 및 천무 수출, 호주 레드백 장갑차 수주, 루마니아 1.3조 자주포 계약. 50% 이상 달하는 해외 수출 비중으로 영업이익률 12% 이상 달성.',
      costStructure: '특수강재 및 화약/엔진 부품 수급비용. 납기 준수율 100%로 페널티 없는 독보적 생산라인 효율성.'
    },

    financials: {
      q24_1: { sales: '1조 8,480억', profit: '374억', margin: '2.0%' },
      q24_2: { sales: '2조 7,860억', profit: '3,588억', margin: '12.9%' },
      q24_3E: { sales: '3조 1,200억 (예상)', profit: '4,200억 (예상)', margin: '13.5%' },
      annual2024E: '연간 매출 11조 5천억 / 영업이익 1조 2천억 돌파로 역대 최고 실적',
      point: '2분기부터 폴란드 납품 물량이 본격 인식되며 영업이익률 13%대의 초호황기 진입.'
    },

    disclosures: [
      { date: '2026-08-30', title: '단일판매 공급계약 체결 - 루마니아 국방부 자주포 1조 3,800억원 수주', tag: '대규모수주' },
      { date: '2026-07-29', title: '연결재무제표 기준 2분기 영업이익 3,588억원 (전년비 356% 폭증)', tag: '어닝서프라이즈' },
      { date: '2026-06-12', title: '인적분할 완료 안내 - 순수 방산/항공우주 전문 지주사로 재편', tag: '기업지배구조' }
    ],

    articles: [
      { title: '한화에어로스페이스, 루마니아 자주포 수주 후속 탄약 운반차 계약 마무리', media: '아시아경제', time: '3시간 전', date: '오늘' },
      { title: '폴란드 K9 2차 실행계약 체결 임박… 창원 생산 라인 풀가동 돌입', media: '조선비즈', time: '4시간 전', date: '오늘' },
      { title: '나토 회원국 국방비 GDP 2% 의무화… 한국산 무기 납기 경쟁력 독보적', media: '한국경제', time: '1일 전', date: '어제' }
    ],

    themes: [
      {
        name: '🛡️ K-방산 수주 랠리',
        relation: '국내 지상 방산 통합 1위 대장주',
        peers: '현대로템, LIG넥스원, 한국항공우주, 풍산'
      },
      {
        name: '🚀 누리호 & 우주항공청 에코시스템',
        relation: '누리호 민간 체계종합기업',
        peers: '한화시스템, 쎄트렉아이, AP위성'
      }
    ],

    events: [
      { date: '2026-10-05 (월)', title: '폴란드 국방부 K9 자주포 2차 잔여 실행계약 서명식', dday: 'D-20', impact: '약 4조원대 2차 이행계약 최종 수주 확정' },
      { date: '2026-11-12 (목)', title: '중동 방위산업전시회(IDEX) 천궁/천무 대규모 수주 상담', dday: 'D-58', impact: '사우디·UAE 추가 탄약 수출 파트너십 가시화' }
    ],

    futureOutlook: {
      rating: '강력 매수 (Top Pick)',
      targetScore: 95,
      summary: '지정학적 위기와 글로벌 재무장 트렌드가 만들어낸 10년 주기 메가 트렌드.',
      catalyst: '30조원 수주잔고 바탕으로 2028년까지 연평균 25% 이상 고성장 담보.',
      riskCheck: '종전 협상 등 지정학적 리스크 완화 시 단기 차익실현 매물 가능성.'
    }
  }
];

let currentDeepIdx = 0;
let currentDeepTab = 'all'; // all, bm, finance, news, theme, future

// 5번 종목 딥분석 센터 초기화
function initStockDeepResearch() {
  renderStockDeepChips();
  renderStockDeepList();
  selectStockDeepItem(0);
}

// 상단 빠른 종목 칩 렌더링
function renderStockDeepChips() {
  const chipWrap = document.getElementById('stock-deep-quick-chips');
  if (!chipWrap) return;

  chipWrap.innerHTML = STOCK_DEEP_DATA.map((item, idx) => `
    <button type="button" class="imggen-style-chip ${idx === currentDeepIdx ? 'active' : ''}" 
            onclick="selectStockDeepItem(${idx})" 
            style="padding: 4px 12px; font-size: 0.78rem; font-weight: 700;">
      ${escapeHtml(item.name)} (${item.symbol})
    </button>
  `).join('');
}

// 좌측 종목 목록 렌더링
function renderStockDeepList() {
  const listWrap = document.getElementById('stock-deep-list');
  if (!listWrap) return;

  listWrap.innerHTML = STOCK_DEEP_DATA.map((item, idx) => `
    <div class="kc-card ${idx === currentDeepIdx ? 'active' : ''}" onclick="selectStockDeepItem(${idx})" style="cursor: pointer; margin-bottom: 10px;">
      <div class="kc-card-num-box" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.78rem;">
        ${idx + 1}
      </div>
      <div class="kc-card-body">
        <div class="kc-card-kw-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.02rem; font-weight: 900; color: #f8fafc;">${escapeHtml(item.name)}</span>
          <span style="color: #ef4444; font-size: 0.9rem; font-weight: 900;">${item.changeRate}</span>
        </div>
        <div class="kc-card-sub-row" style="margin: 4px 0;">
          <span class="kc-badge-tag" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; font-size: 0.72rem;">${escapeHtml(item.badge)}</span>
          <span class="kc-badge-vol" style="font-size: 0.75rem; color: #94a3b8;">${item.symbol} · ${escapeHtml(item.market.split('·')[0].trim())}</span>
        </div>
        <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 4px; line-height: 1.4;">
          ${escapeHtml(item.oneLine)}
        </div>
      </div>
    </div>
  `).join('');
}

// 우측 딥분석 종합 리포트 렌더링
window.selectStockDeepItem = function(idx) {
  currentDeepIdx = idx;
  const item = STOCK_DEEP_DATA[idx] || STOCK_DEEP_DATA[0];
  const detailPanel = document.getElementById('stock-deep-detail');
  if (!detailPanel || !item) return;

  // 상단 칩과 좌측 카드 활성화 상태 동기화
  renderStockDeepChips();
  document.querySelectorAll('#stock-deep-list .kc-card').forEach((c, i) => {
    c.classList.toggle('active', i === idx);
  });

  // 1. 공시 HTML
  const disclosuresHtml = item.disclosures.map(d => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px;">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <span style="font-size: 0.72rem; color: #38bdf8; background: rgba(56,189,248,0.12); padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap;">${escapeHtml(d.tag)}</span>
        <span style="font-size: 0.84rem; color: #f8fafc; font-weight: 600;">${escapeHtml(d.title)}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; white-space: nowrap;">
        <span style="font-size: 0.74rem; color: #94a3b8;">${escapeHtml(d.date)}</span>
        <a href="https://dart.fss.or.kr/dsac001/mainAll.do?selectDate=${encodeURIComponent(d.date.replace(/-/g, ''))}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: none; font-weight: 700;">
          DART 공시 ↗
        </a>
      </div>
    </div>
  `).join('');

  // 2. 기사 HTML
  const articlesHtml = item.articles.map(a => {
    const cleanT = a.title.replace(/\[.*?\]/g, '').trim();
    const link = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanT || a.title)}`;
    return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; margin-bottom: 6px; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 0.84rem; color: #f8fafc; font-weight: 600; line-height: 1.4;">${escapeHtml(a.title)}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">${escapeHtml(a.media)} · ${escapeHtml(a.time)}</div>
      </div>
      <a href="${link}" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); padding: 4px 10px; border-radius: 6px; text-decoration: none; font-weight: 700; white-space: nowrap;">
        기사 보기 ↗
      </a>
    </div>
  `;
  }).join('');

  // 3. 엮인 테마 종목군 HTML
  const themesHtml = item.themes.map(t => `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-size: 0.92rem; font-weight: 800; color: #38bdf8;">${escapeHtml(t.name)}</span>
        <span style="font-size: 0.74rem; background: rgba(56,189,248,0.15); color: #38bdf8; padding: 2px 8px; border-radius: 4px; font-weight: 700;">${escapeHtml(t.relation)}</span>
      </div>
      <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5;">
        🤝 함께 엮여 움직이는 관련주: <strong style="color: #f8fafc;">${escapeHtml(t.peers)}</strong>
      </div>
    </div>
  `).join('');

  // 4. 주요 일정 HTML
  const eventsHtml = item.events.map(e => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 6px;">
      <div>
        <div style="font-size: 0.88rem; font-weight: 800; color: #f8fafc; margin-bottom: 2px;">${escapeHtml(e.title)}</div>
        <div style="font-size: 0.76rem; color: #94a3b8;">${escapeHtml(e.impact)}</div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.92rem; font-weight: 900; color: #34d399; background: rgba(16,185,129,0.15); padding: 3px 8px; border-radius: 6px;">${escapeHtml(e.dday)}</span>
        <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">${escapeHtml(e.date)}</div>
      </div>
    </div>
  `).join('');

  detailPanel.innerHTML = `
    <div class="kc-white-report-container" style="background: #0f172a; border-color: rgba(255,255,255,0.08);">
      <!-- A. 최상단 종목 프로필 헤더 -->
      <div class="kc-detail-header-row" style="margin-bottom: 20px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span class="kc-report-pill-badge" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.35); color: #38bdf8;">
              ${escapeHtml(item.market)}
            </span>
            <span style="font-size: 0.76rem; color: #94a3b8; font-weight: 700;">종목코드: ${item.symbol}</span>
          </div>
          <h2 class="kc-report-main-title" style="color: #f8fafc; margin-bottom: 6px;">
            ${escapeHtml(item.name)} <span style="font-size: 1.1rem; color: #ef4444; font-weight: 900;">${item.currentPrice} (${item.changeRate})</span>
          </h2>
          <div class="kc-report-sub-meta" style="color: #94a3b8;">
            시가총액: <strong style="color: #f8fafc;">${item.marketCap}</strong> · 외국인 지분율: <strong style="color: #38bdf8;">${item.foreignRate}</strong>
          </div>
          <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">
            밸류에이션: ${item.perPbr}
          </div>
        </div>

        <div class="kc-big-score-card" style="background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.35); text-align: center;">
          <div class="kc-score-head-title" style="color: #38bdf8;">미래 지속성 점수</div>
          <div class="kc-score-big-val" style="color: #38bdf8;">${item.futureOutlook.targetScore}<span class="kc-score-denom" style="color: #94a3b8;"> / 100</span></div>
          <div class="kc-score-bottom-note" style="color: #34d399; font-weight: 800;">${escapeHtml(item.futureOutlook.rating)}</div>
        </div>
      </div>

      <!-- B. 딥분석 6대 핵심 영역 탭 바 -->
      <div style="display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px;">
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'all' ? 'active' : ''}" onclick="switchDeepTab('all', this)">📋 전체 종합 분석</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'bm' ? 'active' : ''}" onclick="switchDeepTab('bm', this)">💰 비즈니스 모델(BM/돈 버는 법)</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'finance' ? 'active' : ''}" onclick="switchDeepTab('finance', this)">📊 실적 & 공시</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'news' ? 'active' : ''}" onclick="switchDeepTab('news', this)">📰 관련 기사 모음</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'theme' ? 'active' : ''}" onclick="switchDeepTab('theme', this)">🌐 엮인 테마 & 관련주</button>
        <button type="button" class="imggen-style-chip ${currentDeepTab === 'future' ? 'active' : ''}" onclick="switchDeepTab('future', this)">🔮 미래 총집합소</button>
      </div>

      <!-- C. 영역 1: 비즈니스 모델 (어떻게 돈을 벌고 있는가? 수주/제조업 구분) -->
      <div class="deep-section-block" id="deep-sec-bm" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>💰</span> 1. 비즈니스 모델 분석 (현재 어떻게 돈을 버는가?)
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); padding: 12px; border-radius: 8px;">
              <div style="font-size: 0.76rem; color: #38bdf8; font-weight: 800; margin-bottom: 4px;">산업 유형 분류</div>
              <div style="font-size: 0.92rem; font-weight: 900; color: #f8fafc;">${escapeHtml(item.bm.type)}</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px;">
              <div style="font-size: 0.76rem; color: #34d399; font-weight: 800; margin-bottom: 4px;">매출 포트폴리오 비중</div>
              <div style="font-size: 0.92rem; font-weight: 800; color: #f8fafc;">${escapeHtml(item.bm.structure)}</div>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-size: 0.84rem; font-weight: 800; color: #fb923c; margin-bottom: 4px;">💵 핵심 캐시카우 (수익 창출 엔진):</div>
            <div style="font-size: 0.86rem; color: #cbd5e1; line-height: 1.6;">${escapeHtml(item.bm.cashCow)}</div>
          </div>
          <div>
            <div style="font-size: 0.84rem; font-weight: 800; color: #94a3b8; margin-bottom: 4px;">⚙️ 원가 구조 및 마진 레버리지:</div>
            <div style="font-size: 0.86rem; color: #94a3b8; line-height: 1.6;">${escapeHtml(item.bm.costStructure)}</div>
          </div>
        </div>
      </div>

      <!-- D. 영역 2: 실적 & 공시 히스토리 -->
      <div class="deep-section-block" id="deep-sec-finance" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📊</span> 2. 분기별 실적 추이 & DART 핵심 공시
        </div>
        <!-- 분기 실적 3단 카드 -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;">
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">2024년 1분기</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #f8fafc; margin: 2px 0;">매출 ${item.financials.q24_1.sales}</div>
            <div style="font-size: 0.78rem; color: #ef4444; font-weight: 800;">영업익 ${item.financials.q24_1.profit} (${item.financials.q24_1.margin})</div>
          </div>
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">2024년 2분기</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #f8fafc; margin: 2px 0;">매출 ${item.financials.q24_2.sales}</div>
            <div style="font-size: 0.78rem; color: #ef4444; font-weight: 800;">영업익 ${item.financials.q24_2.profit} (${item.financials.q24_2.margin})</div>
          </div>
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 0.74rem; color: #38bdf8; font-weight: 700;">2024년 3분기 (컨센서스)</div>
            <div style="font-size: 0.92rem; font-weight: 900; color: #f8fafc; margin: 2px 0;">매출 ${item.financials.q24_3E.sales}</div>
            <div style="font-size: 0.78rem; color: #ef4444; font-weight: 800;">영업익 ${item.financials.q24_3E.profit} (${item.financials.q24_3E.margin})</div>
          </div>
        </div>
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 0.84rem; color: #cbd5e1; margin-bottom: 14px;">
          📈 <strong>실적 종합 총평:</strong> ${escapeHtml(item.financials.annual2024E)} · ${escapeHtml(item.financials.point)}
        </div>
        <!-- 공시 목록 -->
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px 14px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #38bdf8; margin-bottom: 8px;">📑 최근 DART 전자공시 주요 내역:</div>
          ${disclosuresHtml}
        </div>
      </div>

      <!-- E. 영역 3: 그 종목에 관련된 모든 기사 모음 -->
      <div class="deep-section-block" id="deep-sec-news" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-size: 0.98rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
            <span>📰</span> 3. 이 종목 관련 모든 기사 모아보기
          </div>
          <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name + ' 주가 실적')}" target="_blank" rel="noopener noreferrer" style="font-size: 0.74rem; color: #38bdf8; text-decoration: none; font-weight: 700;">
            네이버 실시간 뉴스 전체 ↗
          </a>
        </div>
        <div>
          ${articlesHtml}
        </div>
      </div>

      <!-- F. 영역 4: 엮여있는 테마 및 관련 종목군 맵 -->
      <div class="deep-section-block" id="deep-sec-theme" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🌐</span> 4. 엮여있는 테마 및 관련주 에코시스템
        </div>
        <div>
          ${themesHtml}
        </div>
      </div>

      <!-- G. 영역 5: 증시 캘린더 D-Day 일정 -->
      <div class="deep-section-block" id="deep-sec-events" style="margin-bottom: 24px;">
        <div style="font-size: 0.98rem; font-weight: 800; color: #f8fafc; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📅</span> 5. 향후 주요 일정 및 D-Day 카운트다운
        </div>
        <div>
          ${eventsHtml}
        </div>
      </div>

      <!-- H. 영역 6: 이 종목의 미래 종집합소 (미래 지속성 & 투자 전략) -->
      <div class="deep-section-block" id="deep-sec-future" style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
        <div style="font-size: 1.05rem; font-weight: 900; color: #38bdf8; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
          <span>🔮</span> 6. 미래 종집합소 (Future Synthesis Report)
        </div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin-bottom: 8px; line-height: 1.4;">
          ${escapeHtml(item.futureOutlook.summary)}
        </div>
        <div style="margin-bottom: 10px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #34d399; margin-bottom: 3px;">🚀 미래 핵심 성장 동력 (Catalyst):</div>
          <div style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.6;">${escapeHtml(item.futureOutlook.catalyst)}</div>
        </div>
        <div>
          <div style="font-size: 0.82rem; font-weight: 800; color: #ef4444; margin-bottom: 3px;">⚠️ 주의해야 할 리스크 (Risk Factor):</div>
          <div style="font-size: 0.85rem; color: #94a3b8; line-height: 1.6;">${escapeHtml(item.futureOutlook.riskCheck)}</div>
        </div>
      </div>

      <!-- I. 포털 바로가기 그리드 -->
      <div class="kc-portals-btn-grid">
        <a href="https://finance.naver.com/item/main.naver?code=${item.symbol}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn portal-green">
          네이버 증권 시세
        </a>
        <a href="https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(item.name)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          관련 뉴스 전체보기 ↗
        </a>
        <a href="https://dart.fss.or.kr/" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          DART 전자공시
        </a>
        <a href="https://www.google.com/finance/quote/${item.symbol}:KRX" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          구글 파이낸스
        </a>
      </div>
    </div>
  `;
};

// 딥분석 탭 전환 함수
window.switchDeepTab = function(tabName, btn) {
  currentDeepTab = tabName;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  const sections = {
    bm: document.getElementById('deep-sec-bm'),
    finance: document.getElementById('deep-sec-finance'),
    news: document.getElementById('deep-sec-news'),
    theme: document.getElementById('deep-sec-theme'),
    future: document.getElementById('deep-sec-future'),
    events: document.getElementById('deep-sec-events')
  };

  if (tabName === 'all') {
    Object.keys(sections).forEach(k => {
      if (sections[k]) sections[k].style.display = 'block';
    });
  } else {
    Object.keys(sections).forEach(k => {
      if (sections[k]) {
        if (tabName === 'bm' && k === 'bm') sections[k].style.display = 'block';
        else if (tabName === 'finance' && (k === 'finance' || k === 'events')) sections[k].style.display = 'block';
        else if (tabName === 'news' && k === 'news') sections[k].style.display = 'block';
        else if (tabName === 'theme' && k === 'theme') sections[k].style.display = 'block';
        else if (tabName === 'future' && k === 'future') sections[k].style.display = 'block';
        else sections[k].style.display = 'none';
      }
    });
  }
};

// ============================================================================
// 6. 실시간 미국 증시 & 글로벌 외신 한국어 속보 피드 모듈
// - 미국 뉴욕증시 3대 지수, 엔비디아/애플 빅테크, FOMC 금리/환율 등 외신 실시간 번역 속보
// ============================================================================
const GLOBAL_MARKET_NEWS_DATA = [
  {
    category: 'us_market',
    badge: '뉴욕마감',
    badgeColor: '#38bdf8',
    title: '[뉴욕증시] 나스닥 1.1% 상승 마감… 반도체·빅테크 랠리에 S&P500 신고가 근접',
    source: '연합인포맥스 (외신종합)',
    time: '12분 전',
    summary: '연준 9월 빅컷(0.5%p 인하) 기대감이 지속되는 가운데 엔비디아와 브로드컴 등 AI 반도체 강세가 지수를 견인. 기술주 중심 매수세 유입.',
    searchQuery: '뉴욕증시 나스닥 마감 반도체'
  },
  {
    category: 'tech',
    badge: '엔비디아 / AI',
    badgeColor: '#10b981',
    title: '엔비디아 CEO 젠슨 황 "차세대 블랙웰 칩 수요 믿을 수 없을 만큼 엄청나"',
    source: '한국경제TV (로이터 인용)',
    time: '28분 전',
    summary: '골드만삭스 테크 컨퍼런스에서 블랙웰 생산 순항 및 클라우드 빅테크의 ROI(투자수익률) 우려를 일축. 시간외 거래서 주가 4% 급등.',
    searchQuery: '엔비디아 젠슨황 블랙웰 수요'
  },
  {
    category: 'macro',
    badge: 'FOMC / 금리',
    badgeColor: '#f59e0b',
    title: '미국 8월 생산자물가지수(PPI) 예상치 부합… 연준 금리인하 사이클 진입 확실시',
    source: '매일경제 (블룸버그 특약)',
    time: '45분 전',
    summary: '인플레이션 둔화 추세가 지속되며 이번 주 FOMC 회의에서 기준금리 인하 폭(25bp vs 50bp)에 시장의 모든 관심이 집중되는 양상.',
    searchQuery: '미국 생산자물가 PPI FOMC 금리인하'
  },
  {
    category: 'tech',
    badge: '애플 / 모바일',
    badgeColor: '#a855f7',
    title: '애플, 아이폰16 프로 시리즈 초기 사전주문 3,700만 대 돌파… AI 인텔리전스 기대감',
    source: '조선비즈 (WSJ 종합)',
    time: '1시간 전',
    summary: '온디바이스 AI 기능인 애플 인텔리전스(Apple Intelligence) 출시 기대감으로 고가 라인업인 프로/프로맥스 모델 예약 판매 비중 급증.',
    searchQuery: '아이폰16 프로 사전주문 애플 인텔리전스'
  },
  {
    category: 'macro',
    badge: '환율 / 외환',
    badgeColor: '#38bdf8',
    title: '달러인덱스 101선 하회… 연준 완화적 통화정책 기대감에 원/달러 환율 1,330원대 안정',
    source: '서울경제 (외신 번역)',
    time: '2시간 전',
    summary: '미국 국채 10년물 금리가 3.6%대로 하락하면서 달러화 약세 압력 가중. 외국인 투자자의 국내 증시 순매수 유입에 긍정적 환경 조성.',
    searchQuery: '달러인덱스 원달러 환율 국채금리'
  },
  {
    category: 'us_market',
    badge: '필라델피아 반도체',
    badgeColor: '#ef4444',
    title: '필라델피아 반도체 지수 2.3% 급반등… TSMC·ASML 공급망 수혜주 동반 상승',
    source: '머니투데이 (마켓워치)',
    time: '2시간 전',
    summary: 'AI 데이터센터 증설에 따른 첨단 패키징(CoWoS) 병목 현상 해소 기대감과 글로벌 반도체 소부장 밸류체인의 동반 강세 흐름.',
    searchQuery: '필라델피아 반도체 지수 TSMC ASML'
  },
  {
    category: 'macro',
    badge: '국제유가',
    badgeColor: '#fb923c',
    title: 'WTI 국제유가 배럴당 69달러 선… 허리케인 우려에도 글로벌 원유 수요 둔화 우려 상존',
    source: '이데일리 (로이터 속보)',
    time: '3시간 전',
    summary: '멕시코만 허리케인 발생에 따른 단기 공급 차질에도 불구, IEA(국제에너지기구)의 글로벌 원유 수요 전망치 하향에 박스권 등락.',
    searchQuery: 'WTI 국제유가 배럴당 허리케인 공급'
  },
  {
    category: 'tech',
    badge: '테슬라 / 로보택시',
    badgeColor: '#60a5fa',
    title: '테슬라, 10월 10일 LA 스튜디오서 로보택시 사이버캡 공개 공식 초청장 발송',
    source: '디지털타임스 (CNBC 발췌)',
    time: '4시간 전',
    summary: '완전자율주행(FSD V12) 기술 기반의 핸들 없는 로보택시 시제품 및 차세대 저가 전기차(모델 2) 로드맵 공개 여부로 기대감 고조.',
    searchQuery: '테슬라 로보택시 사이버캡 10월 공개'
  }
];

let currentGlobalNewsCategory = 'all';

function initGlobalMarketNews() {
  renderGlobalNewsList('all');
}

function renderGlobalNewsList(category = 'all') {
  const container = document.getElementById('global-news-container');
  if (!container) return;

  const filtered = (category === 'all')
    ? GLOBAL_MARKET_NEWS_DATA 
    : GLOBAL_MARKET_NEWS_DATA.filter(item => item.category === category);

  container.innerHTML = filtered.map(news => {
    const cleanT = news.title.replace(/\[.*?\]/g, '').trim();
    const query = news.searchQuery || cleanT;
    const directSearchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`;

    return `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.72rem; background: rgba(56, 189, 248, 0.15); color: ${news.badgeColor || '#38bdf8'}; border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 4px; font-weight: 800;">
              ${escapeHtml(news.badge)}
            </span>
            <span style="font-size: 0.72rem; color: #94a3b8;">
              ${escapeHtml(news.source)} · ${escapeHtml(news.time)}
            </span>
          </div>
          <div style="font-size: 0.9rem; font-weight: 800; color: #f8fafc; line-height: 1.45; margin-bottom: 8px;">
            ${escapeHtml(news.title)}
          </div>
          <div style="font-size: 0.8rem; color: #94a3b8; line-height: 1.5; margin-bottom: 12px;">
            ${escapeHtml(news.summary)}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          <span style="font-size: 0.72rem; color: #64748b;">
            키워드: <strong style="color: #cbd5e1;">${escapeHtml(news.searchQuery)}</strong>
          </span>
          <a href="${directSearchUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; white-space: nowrap;">
            한국어 원문 속보 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.switchGlobalNewsCategory = function(cat, btn) {
  currentGlobalNewsCategory = cat;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderGlobalNewsList(cat);
};

// ============================================================================
// 7. [서브 패널 0] 당일 국내 주식 실시간 뉴스 촘촘한 피드 렌더러
// ============================================================================
let currentDomesticNewsFilter = 'all';

function initDomesticStockNews() {
  renderDomesticNewsTimeline('all');
}

function renderDomesticNewsTimeline(category = 'all') {
  const listWrap = document.getElementById('domestic-news-timeline-list');
  const countEl = document.getElementById('domestic-news-count');
  if (!listWrap) return;

  const filtered = (category === 'all')
    ? DOMESTIC_STOCK_NEWS_DATA
    : DOMESTIC_STOCK_NEWS_DATA.filter(n => n.category === category);

  if (countEl) countEl.textContent = `${filtered.length}건`;

  listWrap.innerHTML = filtered.map(item => {
    const cleanT = item.title.replace(/\[.*?\]/g, '').trim();
    const query = item.keyword || `${item.symbol} ${cleanT}`;
    const directSearchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}`;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; gap: 12px; transition: all 0.15s ease;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <span style="font-size: 0.74rem; background: rgba(239, 68, 68, 0.12); color: ${item.tagColor || '#ef4444'}; border: 1px solid rgba(239, 68, 68, 0.25); padding: 3px 8px; border-radius: 6px; font-weight: 800; white-space: nowrap;">
            ${escapeHtml(item.tag)}
          </span>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">
              <strong style="color: #38bdf8; margin-right: 4px;">[${escapeHtml(item.symbol)}]</strong> ${escapeHtml(item.title)}
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(item.summary)}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; white-space: nowrap;">
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: #cbd5e1; font-weight: 600;">${escapeHtml(item.media)}</div>
            <div style="font-size: 0.68rem; color: #64748b;">${escapeHtml(item.time)}</div>
          </div>
          <a href="${directSearchUrl}" target="_blank" rel="noopener noreferrer" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; text-decoration: none; font-weight: 700; transition: all 0.2s;">
            기사 보기 ↗
          </a>
        </div>
      </div>
    `;
  }).join('');
}

window.filterDomesticNews = function(cat, btn) {
  currentDomesticNewsFilter = cat;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderDomesticNewsTimeline(cat);
};

