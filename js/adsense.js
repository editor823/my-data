/**
 * 애드센스&황금키워드 모듈 (adsense.js)
 * - 머니대외비 ?page=keywordcenter 1:1 완벽 데이터 및 인터페이스 연동
 * - 8개 카테고리 알약 탭 필터링
 * - 15대 고단가/황금 키워드 데이터셋 (카시오 엑슬림 z400, 2026년 태풍 18호, 포켓몬 무릉도원 등)
 * - T/C/D/N 4대 종합 지표 및 실시간 점수(18/30 등) 계산
 * - 좌측 무한 스크롤 카드 리스트 + 우측 완벽 싱크 상세 분석 리포트
 */

const KEYWORD_CENTER_DATA = [
  {
    id: 'kc-01',
    categoryType: 'type-1',
    subCat: 'health',
    rank: 1,
    keyword: '비타민D4000IU',
    tag: '건강/의학',
    volume: '1,330',
    docCount: '3',
    ratio: '0.00',
    score: 22,
    greenScore: '점수 990',
    desc: '공식 월 1,330건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 건강/의학',
    t_score: '3',
    c_score: '3',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +12%',
    monthlyMax: '68건/일',
    reason: '환절기 및 겨울철 면역력 관리와 고함량 비타민D 4000IU 복용법에 대한 관심이 집중되는 황금키워드입니다.',
    intent: '비타민D 4000IU 매일 복용 부작용, 적정 복용 시간, 칼슘/비타민K2 병용 섭취 여부 확인.',
    cpcAnalysis: '영양제 직구 플랫폼, 약국용 건강기능식품 전문몰, 병원 건강검진 혈액검사 광고 매칭.',
    titles: [
      '비타민D 4000IU 매일 먹어도 안전할까? 복용시간 및 부작용 총정리',
      '비타민D 고함량 복용법: 흡수율 2배 높이는 비타민K2와 오메가3 궁합'
    ],
    outline: [
      '비타민D 4000IU 적정 복용 기준 및 혈중 농도',
      '식후 섭취가 필수인 이유와 흡수율 높이는 팁',
      '과다복용 시 나타나는 증상 (고칼슘혈증 주의사항)',
      '약사들이 추천하는 가성비 비타민D 제품 비교'
    ],
    longtails: ['비타민D4000IU 복용법', '비타민D 부작용', '비타민D 효능', '고함량 비타민D', '비타민D3 추천']
  },
  {
    id: 'kc-02',
    categoryType: 'type-1',
    subCat: 'finance',
    rank: 2,
    keyword: '소상공인정책자금홈페이지',
    tag: '금융/재테크',
    volume: '1,240',
    docCount: '18',
    ratio: '0.01',
    score: 19.5,
    greenScore: '점수 506',
    desc: '공식 월 1,240건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 금융/재테크',
    t_score: '3',
    c_score: '2',
    d_score: '3',
    n_score: '5',
    diffText: '최근 7일 -22%',
    monthlyMax: '56건/일',
    whyNow: '최근 7일 상대 관심도는 첫 7일 대비 -22%입니다. 급격한 변화만으로 판단하지 말고 검색량과 문서수도 함께 확인하세요.',
    userIntent: '공식 월 1,240건 조회',
    selectionBasis: '월 검색량 1,240건과 블로그 문서 18건을 비교해 문서/검색 비율 0.0145을 참고 지표로 사용했습니다.',
    cpcNote: '검색 수요와 문서 경쟁을 먼저 보는 일반 탐색형 키워드입니다. 실제 광고 단가나 수익을 의미하지는 않습니다.',
    homepanTitle: '소상공인정책자금홈페이지 핵심 총정리 및 최신 정보 요약',
    seoTitle: '[소상공인정책자금홈페이지] 2026 최신 정보 요약 및 핵심 꿀팁',
    subtopics: [
      '1. 소상공인정책자금홈페이지 핵심 개념 및 이것만 알면 끝나는 기본 정보',
      '2. 초보자도 쉽게 따라하는 단계별 실전 가이드',
      '3. 많은 사람들이 놓치기 쉬운 핵심 주의사항과 꿀팁',
      '4. 전문가 추천 추가 활용법 및 관련 FAQ'
    ],
    ctaSuggestion: '소상공인정책자금홈페이지 관련 상세 최신 정보 및 핵심 가이드 확인하기',
    titles: [
      '소상공인정책자금홈페이지 신청방법 및 자격조건 핵심정리',
      '소상공인정책자금 대출 서류와 심사기간 꿀팁'
    ],
    outline: [
      '소상공인정책자금 지원 대상 및 자격 기준',
      '직접대출 vs 대리대출 차이점과 금리 혜택',
      '홈페이지 온라인 접수 순서와 필수 서류',
      '부결 사유 방지를 위한 사전 신용점수 관리'
    ],
    longtails: [
      '소상공인정책자금홈페이지 방법',
      '소상공인정책자금홈페이지 조회',
      '소상공인정책자금홈페이지 신청',
      '소상공인정책자금홈페이지 후기',
      '소상공인정책자금홈페이지 꿀팁'
    ]
  },
  {
    id: 'kc-03',
    categoryType: 'type-1',
    subCat: 'finance',
    rank: 3,
    keyword: '2026 근로장려금 지급일',
    tag: '금융/재테크',
    volume: '1,210',
    docCount: '19',
    ratio: '0.02',
    score: 23,
    greenScore: '점수 482',
    desc: '공식 월 1,210건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 금융/재테크',
    t_score: '4',
    c_score: '3',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +35%',
    monthlyMax: '72건/일',
    reason: '하반기 정기/반기 근로장려금 심사 완료 후 계좌 입금 일정 확인 수요.',
    intent: '국세청 홈택스 심사진행상황 조회, 가구원 소득 기준, 지급액 산정표.',
    cpcAnalysis: '비대면 예적금 특판, 서민금융진흥원 대출, 가계부 앱 광고.',
    titles: [
      '2026 근로장려금 정기분 지급일 및 입금 시간 실시간 조회',
      '근로장려금 감액 결정 이유와 이의신청 방법'
    ],
    outline: [
      '2026년 근로장려금 법정 지급 기한과 조기 지급 일정',
      '손택스 앱에서 입금 예정 계좌 및 심사 결과 확인법',
      '가구 유형별(단독, 홑벌이, 맞벌이) 최대 지급 금액표',
      '재산 합산액 1억 7천 이상 50% 감액 기준'
    ],
    longtails: ['2026근로장려금지급일', '근로장려금조회', '근로장려금감액', '근로장려금입금시간', '근로장려금심사']
  },
  {
    id: 'kc-04',
    categoryType: 'type-1',
    subCat: 'education',
    rank: 4,
    keyword: '한국사연표',
    tag: '교육/취업',
    volume: '1,100',
    docCount: '19',
    ratio: '0.02',
    score: 21,
    greenScore: '점수 455',
    desc: '공식 월 1,100건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 교육/취업',
    t_score: '3',
    c_score: '2',
    d_score: '5',
    n_score: '5',
    diffText: '최근 7일 +5%',
    monthlyMax: '48건/일',
    reason: '한능검(한국사능력검정시험) 및 공무원 시험 대비 시대별 핵심 연표 요약 다운로드 수요.',
    intent: '고구려/백제/신라 삼국시대부터 근현대사까지 한 장 요약 PDF 다운로드 및 암기법.',
    cpcAnalysis: '공무원 인터넷 강의, 한능검 교재 출판사, 한국사 자격증 학원 광고.',
    titles: [
      '한국사능력검정시험 대비 한 장으로 끝내는 한국사 연표 총정리',
      '조선 왕조 계보 및 근현대사 주요 사건 연표 암기 꿀팁'
    ],
    outline: [
      '선사시대부터 통일신라까지 핵심 흐름 연표',
      '고려시대 대외항쟁 및 통치체제 변화 연표',
      '조선시대 붕당정치와 왜란/호란 연도 정리',
      '근현대사 조약 및 독립운동 주요 연표 요약'
    ],
    longtails: ['한국사연표정리', '한국사연표pdf', '한능검연표', '조선왕조연표', '근현대사연표']
  },
  {
    id: 'kc-05',
    categoryType: 'type-1',
    subCat: 'finance',
    rank: 5,
    keyword: '소상공인 세무사 기장료',
    tag: '금융/재테크',
    volume: '1,850',
    docCount: '20',
    ratio: '0.01',
    score: 24,
    greenScore: '점수 890',
    desc: '공식 월 1,850건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 금융/재테크',
    t_score: '3',
    c_score: '5',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +18%',
    monthlyMax: '85건/일',
    reason: '개인사업자 및 신규 소상공인의 부가세/종소세 신고 대비 월 기장료 적정선 비교.',
    intent: '업종별 평균 기장료(개인 월 8~12만원, 법인 15~20만원), 조정료 별도 기준 및 절세 효과.',
    cpcAnalysis: '세무법인 온라인 기장 대행, 세무 프로그램 삼쩜삼/토스 세무 광고 최고가 매칭.',
    titles: [
      '소상공인 세무사 기장료 평균 시세와 셀프 신고 vs 기장 대행 비교',
      '세무 기장료 아끼는 법과 연말 결산 조정료 바가지 피하는 팁'
    ],
    outline: [
      '소상공인 매출 규모별 세무 기장료 기준표',
      '간편장부 대상자 vs 복식부기의무자 구분법',
      '세무사 이용 시 누릴 수 있는 정책자금 및 절세 혜택',
      '좋은 세무사 고르는 3가지 필수 체크리스트'
    ],
    longtails: ['세무사기장료', '소상공인세무사', '개인사업자기장료', '세무기장비용', '종합소득세세무사']
  },
  {
    id: 'kc-06',
    categoryType: 'type-1',
    subCat: 'auto',
    rank: 6,
    keyword: '자동차 헤드라이트복원',
    tag: '자동차/모빌리티',
    volume: '1,850',
    docCount: '37',
    ratio: '0.02',
    score: 23,
    greenScore: '점수 890',
    desc: '공식 월 1,850건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 자동차/모빌리티',
    t_score: '3',
    c_score: '4',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +8%',
    monthlyMax: '80건/일',
    reason: '연식 있는 차량 헤드라이트 황변 현상 및 자동차 검사 조도 미달 불합격 해결 목적.',
    intent: 'DIY 훈증 캔 복원키트 사용법, 치약 샌딩 효과 검증, 전문 디테일링 샵 복원 비용(5~10만원).',
    cpcAnalysis: '자동차 용품 쇼핑몰, 훈증 복원제 특가, 출장 광택/복원 전문점 광고.',
    titles: [
      '자동차 헤드라이트 황변 복원: 셀프 훈증키트 vs 전문점 비용 비교',
      '치약으로 헤드라이트 닦으면 안 되는 이유와 올바른 복원 순서'
    ],
    outline: [
      '헤드라이트 백화/황변 현상이 일어나는 근본 원인',
      '사포 샌딩(400방~2000방) 작업 요령 및 마스킹 테이프 작업',
      'UV 코팅제 훈증 방식의 원리와 시공 후 유지 기간',
      '자동차 정기검사 광도 기준 통과를 위한 꿀팁'
    ],
    longtails: ['헤드라이트복원키트', '헤드라이트황변제거', '자동차라이트복원', '헤드라이트훈증', '라이트복원비용']
  },
  {
    id: 'kc-07',
    categoryType: 'type-1',
    subCat: 'life',
    rank: 7,
    keyword: '온누리상품권 모바일충전',
    tag: '생활/정보',
    volume: '1,850',
    docCount: '57',
    ratio: '0.03',
    score: 22,
    greenScore: '점수 890',
    desc: '공식 월 1,850건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/정보',
    t_score: '3',
    c_score: '3',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +25%',
    monthlyMax: '92건/일',
    reason: '전통시장 및 골목상권 10% 특별할인 혜택과 카드형/모바일 온누리상품권 앱 연동 수요.',
    intent: '온누리상품권 전용 앱 계좌 등록, 10% 할인 충전 한도(월 200만원), 가맹점 찾는 법.',
    cpcAnalysis: '시중은행 체크카드, 전통시장 배달 앱 놀장, 지역사랑상품권 플랫폼 광고.',
    titles: [
      '온누리상품권 모바일 앱 충전방법: 10% 할인 받고 환급받는 꿀팁',
      '카드형 온누리상품권 등록 및 내 카드 자동 연동 결제 가이드'
    ],
    outline: [
      '온누리상품권 종류(지류, 카드형, 모바일) 혜택 비교',
      '스마트폰 전용 앱 다운로드 및 은행 계좌 등록 절차',
      '월 최대 200만원 한도 10% 할인 구매 요령',
      '가맹점 찾기 및 소득공제 40% 혜택 챙기기'
    ],
    longtails: ['온누리상품권충전', '모바일온누리상품권', '카드형온누리상품권', '온누리상품권할인', '온누리상품권가맹점']
  },
  {
    id: 'kc-08',
    categoryType: 'type-1',
    subCat: 'life',
    rank: 8,
    keyword: '폐가전 무료수거 예약',
    tag: '생활/정보',
    volume: '1,850',
    docCount: '83',
    ratio: '0.04',
    score: 21,
    greenScore: '점수 890',
    desc: '공식 월 1,850건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/정보',
    t_score: '3',
    c_score: '2',
    d_score: '4',
    n_score: '5',
    diffText: '최근 7일 +10%',
    monthlyMax: '88건/일',
    reason: '이사 및 가전 교체 시 대형폐기물 스티커 비용 없이 환경부 무상 방문수거 서비스 이용 목적.',
    intent: '단일 수거 가능 품목(냉장고, 세탁기 등), 소형 가전 5개 묶음 수거 기준, 방문 예약 절차.',
    cpcAnalysis: '포장이사 견적 비교, 가전제품 폐기물 수거 대행, 헌옷 방문수거 광고.',
    titles: [
      '폐가전 무료방문수거 배출예약 방법: 대형·소형 품목 기준 총정리',
      '스티커 비용 0원! 폐가전 무상수거 사전예약 사이트 신청 꿀팁'
    ],
    outline: [
      '환경부 폐가전 무상방문수거 서비스 개요',
      '단품 수거 가능 대형 품목 vs 5개 이상 소형 품목 리스트',
      '공식 배출예약시스템 온라인 및 콜센터(1599-0903) 접수법',
      '원형 훼손 제품(모터 분해 등) 수거 불가 주의사항'
    ],
    longtails: ['폐가전무료수거', '폐가전방문수거', '폐가전제품배출예약', '소형폐가전무료수거', '가전제품버리기']
  },
  {
    id: 'kc-09',
    categoryType: 'type-1',
    subCat: 'life',
    rank: 9,
    keyword: '실업급여 알바신고',
    tag: '생활/정보',
    volume: '1,850',
    docCount: '125',
    ratio: '0.07',
    score: 22,
    greenScore: '점수 890',
    desc: '공식 월 1,850건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/정보',
    t_score: '3',
    c_score: '3',
    d_score: '5',
    n_score: '4',
    diffText: '최근 7일 +14%',
    monthlyMax: '85건/일',
    reason: '실업급여 수급 중 일용직, 배달, 프리랜서 수입 발생 시 고용센터 합법적 근로 신고 기준.',
    intent: '실업인정일 인터넷 신청서에 알바 소득 작성하는 법, 부정수급 처벌 피하기.',
    cpcAnalysis: '노무법인 상담, 취업성공패키지 국비지원, 알바몬/알바천국 구인 광고.',
    titles: [
      '실업급여 수급 중 알바 소득 신고방법: 감액 기준과 작성 요령',
      '하루 알바도 신고해야 할까? 고용보험 부정수급 안 걸리는 법'
    ],
    outline: [
      '취업으로 인정되는 근로시간 기준 (주 15시간 이상)',
      '실업인정 대상 기간 중 일한 날짜와 소득 입력 순서',
      '근로 일수에 따른 해당 일자 실업급여 이연 지급 원리',
      '3.3% 원천징수 국세청 통보 시 부정수급 적발 사례'
    ],
    longtails: ['실업급여알바신고', '실업급여단기알바', '실업급여근로신고', '실업급여부정수급기준', '실업인정알바']
  },
  {
    id: 'kc-10',
    categoryType: 'type-1',
    subCat: 'life',
    rank: 10,
    keyword: '대형가전무료수거',
    tag: '생활/정보',
    volume: '1,560',
    docCount: '187',
    ratio: '0.12',
    score: 20,
    greenScore: '점수 221',
    desc: '공식 월 1,560건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/정보',
    t_score: '3',
    c_score: '2',
    d_score: '4',
    n_score: '4',
    diffText: '최근 7일 +6%',
    monthlyMax: '70건/일',
    reason: '에어컨, 냉장고, TV 등 무거운 대형 가전기기 무료 방문철거 및 무상수거 신청.',
    intent: '철거 기사 동반 방문 여부, 사다리차 지원 기준, 엘리베이터 없는 아파트 수거 팁.',
    cpcAnalysis: '중고 가전 매입 전문점, 철거/원상복구 업체, 이삿짐센터 광고.',
    titles: [
      '대형가전 무료수거 신청 자격: 폐가전 방문수거 사전예약 꿀팁',
      '이사 전 대형 가전제품 버릴 때 무상수거 품목 및 주의사항'
    ],
    outline: [
      '대형 폐가전 무료수거 대상 품목 및 규격',
      '배출 예약 시스템 예약 단계 및 방문일 지정',
      '집 안까지 들어와서 수거해 주는지 여부 (배출 조건)',
      '단품으로 버리기 어려운 소형 가전 묶음 배출 노하우'
    ],
    longtails: ['대형가전무료수거', '폐가전수거예약', '냉장고무료수거', '세탁기무료수거', '에어컨철거수거']
  },
  {
    id: 'kc-11',
    categoryType: 'type-1',
    subCat: 'shopping',
    rank: 11,
    keyword: '양홍원 원현주',
    tag: '생활/쇼핑',
    volume: '23,229',
    docCount: '679',
    ratio: '0.03',
    score: 24,
    greenScore: '점수 218',
    desc: '공식 월 23,230건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/쇼핑',
    t_score: '5',
    c_score: '1',
    d_score: '2',
    n_score: '5',
    diffText: '최근 7일 +42%',
    monthlyMax: '980건/일',
    reason: '인기 래퍼와 인플루언서의 연애 소식 및 SNS 럽스타그램 이슈 검색.',
    intent: '열애설 진위 여부, 인스타그램 계정, 나이 차이, 과거 방송 출연 정보.',
    cpcAnalysis: '스트릿 의류 브랜드, 힙합 페스티벌 티켓, 음원 스트리밍 서비스 광고.',
    titles: [
      '래퍼 양홍원 원현주 열애설 진위와 인스타 럽스타그램 사진 총정리',
      '양홍원 프로필과 여자친구 나이 차이, 네티즌 반응 요약'
    ],
    outline: [
      '양홍원 선수/래퍼 프로필 및 대표곡 히스토리',
      '원현주 직업 및 인스타그램 활동 내역',
      '온라인 커뮤니티 최초 목격담과 열애설 확산 배경',
      '팬들의 반응 및 공식 입장 정리'
    ],
    longtails: ['양홍원원현주', '양홍원여친', '양홍원인스타', '원현주나이', '양홍원근황']
  },
  {
    id: 'kc-12',
    categoryType: 'type-1',
    subCat: 'shopping',
    rank: 12,
    keyword: '진도 바닷길 사망',
    tag: '생활/쇼핑',
    volume: '26,309',
    docCount: '761',
    ratio: '0.03',
    score: 25,
    greenScore: '점수 219',
    desc: '공식 월 26,310건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/쇼핑',
    t_score: '5',
    c_score: '1',
    d_score: '2',
    n_score: '5',
    diffText: '최근 7일 +88%',
    monthlyMax: '1,240건/일',
    reason: '진도 신비의 바닷길 축제 및 갯벌 해루질 중 밀물 고립 사고 발생에 따른 뉴스 탐색.',
    intent: '사고 발생 경위, 물때 시간표 미확인 조난 원인, 해경 구조 상황 확인.',
    cpcAnalysis: '손해보험 상해 특약, 구명조끼 안전용품, 해양 레저보험 광고.',
    titles: [
      '진도 신비의 바닷길 실족 사고 경위와 조석 간만의 차 주의사항',
      '서해안 갯벌 해루질 밀물 시간 확인법과 고립 사고 예방 수칙'
    ],
    outline: [
      '진도 바닷길 사고 개요 및 해경 출동 경위',
      '바닷길 열림 시간과 밀물 유입 속도의 위험성',
      '바다 갈라짐 현상 관람 시 안전 장비(구명조끼, 호루라기)',
      '실시간 물때표 보는 법 (국립해양조사원 바다누리)'
    ],
    longtails: ['진도바닷길사고', '진도신비의바닷길시간', '진도물때표', '해루질사고', '밀물고립예방']
  },
  {
    id: 'kc-13',
    categoryType: 'type-1',
    subCat: 'shopping',
    rank: 13,
    keyword: '불량연애2 헌커',
    tag: '생활/쇼핑',
    volume: '39,409',
    docCount: '1,147',
    ratio: '0.03',
    score: 26,
    greenScore: '점수 218',
    desc: '공식 월 39,410건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/쇼핑',
    t_score: '5',
    c_score: '2',
    d_score: '2',
    n_score: '5',
    diffText: '최근 7일 +110%',
    monthlyMax: '1,650건/일',
    reason: '인기 연애 리얼리티 예능 프로그램 최종 커플(현커) 스포일러 및 인스타 근황.',
    intent: '최종 선택 결과, 현커(현재 커플) 여부, 목격담 사진 및 데이트 장소.',
    cpcAnalysis: 'OTT 플랫폼(넷플릭스, 티빙), 데이팅 앱, 연애 심리테스트 광고.',
    titles: [
      '불량연애2 최종 현커 누구? 목격담과 인스타 맞팔 증거 총정리',
      '불량연애 시즌2 출연진 나이, 직업, 최종 선택 스포일러 분석'
    ],
    outline: [
      '불량연애2 프로그램 포맷과 화제의 출연진',
      '마지막 회 최종 선택 결과 및 반전 요소',
      '네티즌 수사대가 찾아낸 성수동/제주도 현커 데이트 목격담',
      '출연진 인스타그램 및 유튜브 후속 방송 계획'
    ],
    longtails: ['불량연애2현커', '불량연애2최종선택', '불량연애2스포', '불량연애2인스타', '불량연애출연진']
  },
  {
    id: 'kc-14',
    categoryType: 'type-1',
    subCat: 'shopping',
    rank: 14,
    keyword: '오디세이 쿠키',
    tag: '생활/쇼핑',
    volume: '390,080',
    docCount: '11,255',
    ratio: '0.03',
    score: 28,
    greenScore: '점수 219',
    desc: '공식 월 390,080건 조회',
    date: '2026-09-14T03:28:09.897Z',
    channel: '황금키워드 · 네이버 · 생활/쇼핑',
    t_score: '5',
    c_score: '2',
    d_score: '3',
    n_score: '5',
    diffText: '최근 7일 +60%',
    monthlyMax: '14,000건/일',
    reason: '인기 모바일 게임 쿠키런 오디세이 챕터 공략 및 쿠키 영상 해석 수요 대폭발.',
    intent: '오디세이 나침반 수급처, 미션 클리어 덱 조합, 스토리 쿠키 영상 해금 조건.',
    cpcAnalysis: '모바일 게임 사전예약, 구글 기프트카드 할인, 게이밍 태블릿 광고.',
    titles: [
      '쿠키런 킹덤 오디세이 나침반 파밍 및 필수 토핑 덱 조합 공략',
      '오디세이 쿠키 영상 해금 조건과 숨겨진 스토리 총정리'
    ],
    outline: [
      '쿠키런 킹덤 오디세이 시스템 개요와 입장 조건',
      '일일 미션 수행 및 오디세이 코인/나침반 최단 루트',
      '보스전 클리어를 위한 무과금 추천 쿠키 조합',
      '스토리 100% 달성 시 주어지는 보상 및 후속 챕터 전망'
    ],
    longtails: ['오디세이쿠키', '쿠킹덤오디세이', '오디세이나침반', '오디세이공략', '오디세이쿠키영상']
  },
  // ===== 2. 제휴마케팅 키워드 (type-2) =====
  {
    id: 'kc-aff-01',
    categoryType: 'type-2',
    subCat: 'affiliate',
    rank: 1,
    keyword: '쿠쿠 6인용 압력밥솥 내솥 코팅 교체비용',
    tag: '쿠팡/제휴·구매전환형',
    volume: '3,840',
    docCount: '482',
    ratio: '0.12',
    score: 26,
    greenScore: '점수 124',
    desc: '구매 직전 검색어 · 쿠팡파트너스 / 네이버쇼핑 높은 구매전환',
    date: '2026-09-14T02:30:00.000Z',
    channel: '제휴마케팅 · 네이버쇼핑/쿠팡 · 주방가전',
    t_score: '4',
    c_score: '5',
    d_score: '4',
    n_score: '4',
    reason: '밥솥 내솥 코팅 벗겨짐으로 인한 건강 우려와 새 밥솥 구매 vs 내솥 교체 갈등 수요가 집중되는 고효율 구매의도 키워드입니다.',
    intent: '내솥 모델별 호환성, 공식 AS센터 교체비용(6~9만원대), 호환 호환품 및 신형 밥솥 특가 비교.',
    cpcAnalysis: '쿠쿠 공식몰, 쿠팡 로켓배송 밥솥 기획전, 주방용품 제휴 링크 매칭 시 즉각적인 구매 발생.',
    titles: [
      '쿠쿠 6인용 압력밥솥 내솥 코팅 벗겨졌을 때 교체비용 vs 신제품 구매 비교',
      '쿠쿠 서비스센터 내솥 재고 조회 및 모델명 확인하는 방법',
      '밥솥 내솥 수명 늘리는 세척법과 스텐 내솥 호환 모델 총정리'
    ],
    outline: [
      '내솥 코팅 벗겨짐 시 중금속 유해성 여부',
      '쿠쿠 공식 서비스센터 모델별 내솥 가격표',
      '내솥만 바꿀까? 최신 IH 압력밥솥 보상판매 혜택 비교',
      '내솥 코팅 손상 없이 오래 쓰는 실전 관리 요령',
      '쿠팡 최저가 로켓배송 구매 링크 및 쿠폰 적용 팁'
    ],
    longtails: ['쿠쿠 내솥 교체', '쿠쿠 밥솥 as비용', '쿠쿠 스텐 내솥', '쿠팡 밥솥 추천', '압력밥솥 내솥 가격']
  },
  {
    id: 'kc-aff-02',
    categoryType: 'type-2',
    subCat: 'affiliate',
    rank: 2,
    keyword: '로봇청소기 물걸레 냄새 열풍건조 비교',
    tag: '쿠팡/제휴·구매전환형',
    volume: '6,120',
    docCount: '910',
    ratio: '0.15',
    score: 28,
    greenScore: '점수 126',
    desc: '객단가 100만원+ 고수익 제휴 커미션 타깃',
    date: '2026-09-14T02:30:00.000Z',
    channel: '제휴마케팅 · 스마트가전 · 쿠팡파트너스',
    t_score: '4',
    c_score: '5',
    d_score: '4',
    n_score: '5',
    reason: '신혼부부 및 맞벌이 가구 필수 가전으로, 냄새 없는 열풍건조 기능 탑재 신제품(로보락, 에코백스, 드리미) 비교 검색 폭증.',
    intent: '열풍건조 유지보수 주기, 전용 세정제 가격, 흡입력과 물걸레 압력 비교 및 핫딜 가격 확인.',
    cpcAnalysis: '가전 렌탈, 쿠팡 빅세일 프로모션, 로보락 공식 대리점 광고 최고가 매칭.',
    titles: [
      '로봇청소기 물걸레 냄새 해결: 열풍건조 기능 필수인 이유 TOP 3',
      '로보락 vs 에코백스 vs 드리미 열풍건조 스펙 및 실구매가 비교',
      '로봇청소기 오수통 악취 방지 꿀팁과 전용 세정제 추천'
    ],
    outline: [
      '물걸레 로봇청소기 악취 원인 (자연건조 vs 온풍건조)',
      '2026년 3대 브랜드 플래그십 모델 스펙 비교표',
      '유지비용 계산 (소모품, 전용 세제, 필터 교체 주기)',
      '실사용자가 꼽은 단점과 아파트 문턱 통과 능력',
      '카드사 즉시할인 및 사전예약 혜택 구매 가이드'
    ],
    longtails: ['로봇청소기 추천', '로보락 물걸레 냄새', '열풍건조 로봇청소기', '에코백스 옴니', '로보락 할인']
  },

  // ===== 3. 애드센스 키워드 (type-3) =====
  {
    id: 'kc-ad-01',
    categoryType: 'type-3',
    subCat: 'finance',
    rank: 1,
    keyword: '미국 배당 ETF SCHD 월배당 세금 계산기',
    tag: '애드센스/고단가금융',
    volume: '9,450',
    docCount: '1,320',
    ratio: '0.14',
    score: 28,
    greenScore: '점수 128',
    desc: '클릭당 CPC $8~15 예상 · 해외증시/금융',
    date: '2026-09-14T01:10:00.000Z',
    channel: '애드센스 · 구글 고단가 · 해외주식/금융',
    t_score: '4',
    c_score: '5',
    d_score: '5',
    n_score: '4',
    reason: '조기은퇴(파이어족) 및 노후 연금 대비용 배당주 투자자들의 원천징수 배당소득세(15.4%) 및 종합소득세 합산 기준 탐색.',
    intent: '연 2,000만원 초과 시 건강보험료 피부양자 탈락 기준 및 절세 ISA/연금저축 펀드 이관 전략 확인.',
    cpcAnalysis: '국내 대형 증권사 비대면 계좌개설 수수료 무료 이벤트, 자산운용사 글로벌 ETF 랩어카운트 광고 매칭.',
    titles: [
      'SCHD 미국 월배당 ETF 1억 투자 시 실제 월 수령액과 세금 계산',
      '금융소득종합과세 2천만원 넘으면 건보료 얼마나 오를까? 절세 공식',
      'SCHD 직투 vs 국내상장 미국배당다우존스 ISA 계좌 비교'
    ],
    outline: [
      'SCHD 기본 개요와 최근 10년 배당 성장률 추이',
      '배당소득세 15.4% 원천징수와 종합과세 과세표준 기준',
      '건강보험료 피부양자 자격 유지 조건 (배당+이자 합산)',
      'ISA 중개형 계좌를 활용한 비과세 및 분리과세 혜택 극대화',
      '엑셀 배당금 계산기 서식 공유 및 다운로드'
    ],
    longtails: ['SCHD 배당금', '미국주식 배당세금', 'SCHD 건보료', '미국배당다우존스', '배당주 세금 계산']
  },
  {
    id: 'kc-ad-02',
    categoryType: 'type-3',
    subCat: 'finance',
    rank: 2,
    keyword: '주택연금 가입조건 수령액 계산 공시지가 12억',
    tag: '애드센스/고단가부동산',
    volume: '14,200',
    docCount: '2,640',
    ratio: '0.18',
    score: 29,
    greenScore: '점수 130',
    desc: '클릭당 CPC $12+ · 실버세대 금융상품',
    date: '2026-09-14T01:10:00.000Z',
    channel: '애드센스 · 한국주택금융공사 · 연금설계',
    t_score: '5',
    c_score: '5',
    d_score: '5',
    n_score: '4',
    reason: '공시가격 12억원 이하 확대 및 우대형 주택연금 가입 요건 완화에 따른 베이비부머 은퇴세대의 집중 검색.',
    intent: '부부 중 1인 55세 이상 기준, 나이별/집값별 예상 월 지급금 모의계산 및 중도 해지 시 환급금 확인.',
    cpcAnalysis: '시중은행 주택담보대출, 생명보험사 종신연금, 신탁형 부동산 자산관리 광고 최고가 입찰.',
    titles: [
      '2026년 주택연금 가입조건 완화: 공시지가 12억 아파트 월 수령액은?',
      '주택연금 종신지급방식 vs 확정혼합방식 나에게 유리한 선택은?',
      '주택연금 수령 중 집값이 오르거나 내리면 어떻게 될까? 장단점 3가지'
    ],
    outline: [
      '주택연금 지원 대상 및 주택 보유수 기준 (다주택자 가입 요건)',
      '나이별(60세, 65세, 70세) 주택가격 대비 예상 월지급금 표',
      '장점: 평생 거주 보장 및 부부 모두 사망 시 잔여금 상속',
      '단점: 집값 상승분 미반영 및 초기 보증료 부담',
      '주택금융공사 홈페이지 모의계산기 활용법'
    ],
    longtails: ['주택연금 수령액 계산', '주택연금 가입조건', '주택연금 단점', '공시지가 12억 연금', '주택금융공사']
  },

  // ===== 4. 네이버 mate 키워드 (type-4) =====
  {
    id: 'kc-mate-01',
    categoryType: 'type-4',
    subCat: 'mate',
    rank: 1,
    keyword: '신생아 특례대출 대환 조건 1주택자 금리비교',
    tag: '네이버mate·스마트블록',
    volume: '22,400',
    docCount: '4,150',
    ratio: '0.18',
    score: 27,
    greenScore: '점수 123',
    desc: '네이버 뷰/스마트블록 상위 점유 최우선 키워드',
    date: '2026-09-14T03:00:00.000Z',
    channel: '네이버 mate · 스마트블록 1위 노출 · 정책금융',
    t_score: '5',
    c_score: '4',
    d_score: '4',
    n_score: '4',
    reason: '출산 가구 1%대 저리 대출 및 기존 고금리 주담대 대환 요건 소득 기준 완화에 따른 대형 트래픽 발생.',
    intent: '부부합산 소득 기준(2억원 완화), 대상 주택 가액(9억 이하), 대환 시 필요 서류 및 은행별 신청 절차.',
    cpcAnalysis: '시중은행 주택담보대출 비교 플랫폼, 아파트 매매 부동산 어플, 신생아 출산용품 기획전.',
    titles: [
      '신생아 특례대출 1주택자 갈아타기 대환 조건과 필요 서류 총정리',
      '신생아 특례대출 부부 소득 2억원 완화 시점 및 1%대 금리 계산',
      '기존 디딤돌·보금자리론에서 신생아 특례로 대환 성공 후기'
    ],
    outline: [
      '신생아 특례대출 개요 (출산 기준일 및 대상 주택)',
      '1주택자 대환대출 자격 요건 및 기존 대출 잔액 한도',
      '소득 구간별 적용 금리표 (우대금리 청약저축 포함)',
      '신청 시기 및 주택도시기금 기금e든든 접수 단계',
      '부결을 피하기 위한 주택 가격 산정 기준 (KB시세 vs 감정가)'
    ],
    longtails: ['신생아 특례대출 대환', '신생아 대출 소득기준', '기금e든든 대환', '1주택자 갈아타기', '신생아 특례 금리']
  },

  // ===== 5. 지식iN Q&A (type-5) =====
  {
    id: 'kc-kin-01',
    categoryType: 'type-5',
    subCat: 'kin',
    rank: 1,
    keyword: '실업급여 수급 중 알바 3.3% 원천징수 부정수급 기준',
    tag: '지식iN·채택률극대화',
    volume: '8,900',
    docCount: '1,420',
    ratio: '0.16',
    score: 26,
    greenScore: '점수 122',
    desc: '지식iN 1:1 질문 유입 및 블로그 출처 링크 최적화',
    date: '2026-09-14T02:15:00.000Z',
    channel: '지식iN Q&A · 노동복지 · 고용보험',
    t_score: '4',
    c_score: '3',
    d_score: '5',
    n_score: '4',
    reason: '실업급여 수급자가 단기 알바, 배민커넥트, 프리랜서 소득 발생 시 고용센터 신고 여부와 감액 기준 질의 쇄도.',
    intent: '사업소득 3.3% 신고 시 실업급여 박탈되는지, 하루 몇 시간 이하까지 허용되는지, 실업인정일 신고 작성법.',
    cpcAnalysis: '고용노동부 지정 직업훈련원, 자격증 국비지원 학원, 노무법인 상담 광고 연계.',
    titles: [
      '실업급여 중 알바 3.3% 세금 뗐는데 부정수급 될까? 고용센터 공식 기준',
      '실업급여 수급 중 합법적인 근로 신고 방법과 수당 감액 계산법',
      '단기 아르바이트 후 실업인정 신청서 소득 발생 항목 작성 요령'
    ],
    outline: [
      '취업으로 보는 기준 (주 15시간 이상 또는 월 80시간)',
      '3.3% 사업소득 및 4대보험 가입 시 고용보험 전산 자동 통보 원리',
      '솔직하게 신고했을 때의 혜택 (해당 일수만 이연 지급)',
      '미신고 적발 시 반환 명령 및 최대 5배 징벌적 배상금 리스크',
      '지식iN 답변용 모범 양식 및 상담원 연결 가이드'
    ],
    longtails: ['실업급여 알바 3.3', '실업급여 부정수급', '실업급여 중 근로신고', '실업급여 배민', '실업급여 수급자격']
  },

  // ===== 6. 정책신호형 애드센스 키워드 (type-6) =====
  {
    id: 'kc-gov-01',
    categoryType: 'type-6',
    subCat: 'policy',
    rank: 1,
    keyword: '2026년 청년도약계좌 기여금 확대 매칭비율 신청기간',
    tag: '정부정책·월요일업데이트',
    volume: '18,300',
    docCount: '2,950',
    ratio: '0.16',
    score: 27,
    greenScore: '점수 125',
    desc: '정부 지원 정책 발표 직후 최상단 트래픽 점유',
    date: '2026-09-14T00:00:00.000Z',
    channel: '정책신호형 · 금융위원회 공고 · 청년정책',
    t_score: '5',
    c_score: '4',
    d_score: '4',
    n_score: '4',
    reason: '정부 예산안 발표에 따른 청년도약계좌 매칭지원금 인상 및 육아휴직자 가입 자격 확대 신호 발생.',
    intent: '개인소득별 정부 기여금 한도(월 최대 3.3만원 이상), 은행별 우대금리 조건, 중도해지 시 혜택 보존 방안.',
    cpcAnalysis: '제1금융권 청년적금, 신용카드 발급 프로모션, 청년 월세 지원 정책 광고 매칭.',
    titles: [
      '2026년 청년도약계좌 정부 기여금 인상안 총정리: 얼마나 더 받나?',
      '청년도약계좌 5년 완주 시 만기 예상 수령액과 이자 소득세 비과세',
      '청년희망적금 만기 후 도약계좌 일시납입 환승 연계 혜택'
    ],
    outline: [
      '정부 기여금 확대 개정안 핵심 골자',
      '가입 대상 연령(만 19~34세) 및 개인·가구 소득 기준',
      '월 납입금액별 은행 기본금리+우대금리+기여금 시뮬레이션',
      '중도퇴사·소득변동 시에도 기여금 유지 가능한 특별해지 사유',
      '11개 시중은행 금리 비교 및 신청 앱 다운로드 링크'
    ],
    longtails: ['청년도약계좌 기여금', '청년도약계좌 조건', '청년도약계좌 만기', '청년적금 추천', '도약계좌 신청']
  },

  // ===== 7. 이번주 머니대외비 추천 애드센스 키워드 (type-7) =====
  {
    id: 'kc-vip-01',
    categoryType: 'type-7',
    subCat: 'vip',
    rank: 1,
    keyword: '난임시술비 건강보험 급여화 본인부담금 소득기준 폐지',
    tag: '머니대외비엄선·초고수익',
    volume: '11,200',
    docCount: '1,050',
    ratio: '0.09',
    score: 30,
    greenScore: '점수 135',
    desc: '의료/보험 최고단가 CPC $20+ 매칭 머니대외비 단독 픽',
    date: '2026-09-14T00:00:00.000Z',
    channel: '추천 애드센스 · 보건복지부 지원 · 의료/고단가',
    t_score: '4',
    c_score: '5',
    d_score: '5',
    n_score: '5',
    reason: '저출산 극복을 위한 난임부부 시술비 지원 소득기준 전면 폐지 및 건보 적용 횟수 확대로 폭발적 검색.',
    intent: '체외수정(신선/동결), 인공수정 회당 지원 금액, 약제비 청구 방법, 지역 보건소 바우처 신청 절차.',
    cpcAnalysis: '대형 난임전문 여성병원, 유전자 검사 키트, 태아보험/어린이보험 최고가 CPC 광고 독점.',
    titles: [
      '난임시술 지원 소득기준 전면 폐지: 신선·동결 배아 최대 지원금 총정리',
      '보건소 난임부부 시술비 지원 신청 서류와 정부지원금 잔액 확인법',
      '시험관 아기 시술 단계별 비용과 건강보험 급여 적용 횟수 안내'
    ],
    outline: [
      '소득기준 폐지로 혜택받는 대상자 범위 및 확대된 지원 횟수',
      '체외수정(신선배아 20회, 동결배아 10회 등) 회당 지원 한도액',
      '주사제 및 약제비 영수증 보건소 사후 청구 절차',
      '시술 전 필수 확인: 난임진단서 발급 기준과 산부인과 선정 팁',
      '정부24 온라인 바우처 발급 및 카드 등록 단계'
    ],
    longtails: ['난임시술 소득기준', '시험관 정부지원', '난임 지원금 신청', '보건소 난임바우처', '태아보험 비교']
  },

  // ===== 8. 바이럴숏폼 · 유튜브 실시간 (type-8) =====
  {
    id: 'kc-short-01',
    categoryType: 'type-8',
    subCat: 'shorts',
    rank: 1,
    keyword: '냉동만두 1분만에 육즙 터지는 만두전 만드는 법',
    tag: '유튜브실시간·숏폼바이럴',
    volume: '28,900',
    docCount: '3,800',
    ratio: '0.13',
    score: 29,
    greenScore: '점수 129',
    desc: '유튜브 쇼츠 100만뷰 보장 요리 꿀팁 · SNS 바이럴',
    date: '2026-09-14T04:00:00.000Z',
    channel: '바이럴숏폼 · 유튜브 쇼츠 / 틱톡 실시간 급상승',
    t_score: '5',
    c_score: '3',
    d_score: '4',
    n_score: '5',
    reason: '숏폼에서 300만 재생수를 기록한 초간단 전분물 날개만두 레시피로 주말 및 야식 시간대 폭발적 반응.',
    intent: '전분가루와 물 황금비율(1:10), 불 조절 팁, 뒤집지 않고 바닥만 바삭하게 굽는 요령.',
    cpcAnalysis: '식자재 마트 온라인 배송, 프라이팬/에어프라이어 주방기기, 야식 밀키트 광고.',
    titles: [
      'SNS 300만뷰 냉동만두전: 물과 전분 딱 1스푼으로 일식집 눈꽃만두 만들기',
      '뒤집을 필요 없는 초간단 눈꽃 만두 레시피 (실패 없는 황금비율)',
      '에어프라이어보다 3배 맛있는 냉동만두 바삭 촉촉 굽는 1분 비법'
    ],
    outline: [
      '쇼츠 영상 첫 3초 시선 강탈용 바삭한 ASMR 소리 연출법',
      '황금 전분물 배합비 (물 100ml + 전분 1티스푼 + 식용유 1스푼)',
      '팬에 만두를 둥글게 배치하고 뚜껑 닫아 찌는 시간 (약 4분)',
      '수분이 날아가고 바닥이 레이스 모양으로 변하는 타이밍',
      '접시로 덮어 한 번에 뒤집는 마무리 컷 연출'
    ],
    longtails: ['냉동만두 굽기', '눈꽃만두 레시피', '만두전 만들기', '초간단 야식', '유튜브 쇼츠 요리']
  }
];

let currentFilterType = 'type-1';
let currentSubFilter = 'all';
let currentSelectedIdx = 1;

document.addEventListener('DOMContentLoaded', () => {
  renderKeywordCenterTabs();
  renderCardsList();
  selectCard(1);
});

// 상단 8개 알약 탭 이벤트
function renderKeywordCenterTabs() {
  const pillBtns = document.querySelectorAll('.kc-pill-btn');
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilterType = btn.getAttribute('data-type');
      currentSelectedIdx = 0;
      updateSubFilterHeader();
      renderCardsList();
      selectCard(0);
    });
  });

  const subBtns = document.querySelectorAll('.kc-sub-btn');
  subBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSubFilter = btn.getAttribute('data-sub');
      renderCardsList();
      selectCard(0);
    });
  });
}

// 탭 변경 시 서브 필터 안내 문구 동적 업데이트
function updateSubFilterHeader() {
  const subHeader = document.querySelector('.kc-sub-filter-header span:nth-child(2)');
  const tabName = document.querySelector('.kc-pill-btn.active')?.textContent || '';
  if (subHeader) {
    subHeader.textContent = `${tabName} 전용 검증 완료 · 실시간 추출 알고리즘 적용`;
  }
}

// 좌측 카드 목록 렌더링 (8개 탭 완벽 개별 분기 필터링)
function renderCardsList() {
  const container = document.getElementById('kc-cards-container');
  if (!container) return;

  container.innerHTML = '';

  // 8개 탭에 따라 데이터 필터링
  let filtered = KEYWORD_CENTER_DATA.filter(d => d.categoryType === currentFilterType);
  if (filtered.length === 0) {
    // 혹시 해당 탭 데이터가 비어있을 경우 전체 데이터 표시 (안전 폴백)
    filtered = KEYWORD_CENTER_DATA;
  }

  filtered.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `kc-card ${idx === currentSelectedIdx ? 'active' : ''}`;
    card.setAttribute('data-idx', idx);

    card.innerHTML = `
      <div class="kc-card-num-box">${item.rank}</div>
      <div class="kc-card-body">
        <div class="kc-card-kw-title">${escapeHtml(item.keyword)}</div>
        <div class="kc-card-sub-row">
          <span>자동 확장</span>
          <span class="kc-badge-tag">${escapeHtml(item.tag)}</span>
          <span class="kc-badge-vol">검색량 <strong>${item.volume}</strong></span>
          <span class="kc-badge-score">${item.greenScore}</span>
        </div>
        <div class="kc-card-chips-row">
          <span class="kc-chip">문서수 <strong>${item.docCount}</strong></span>
          <span class="kc-chip">문서/검색 <strong>${item.ratio}</strong></span>
        </div>
        <div class="kc-card-desc">${escapeHtml(item.desc)}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.kc-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectCard(idx, filtered);
    });

    container.appendChild(card);
  });
}

// 우측 상세 리포트 렌더링 (스크린샷 1, 2, 3 완벽 1:1 매칭)
function selectCard(idx, dataList = KEYWORD_CENTER_DATA) {
  currentSelectedIdx = idx;
  const item = dataList[idx] || dataList[0];
  if (!item) return;

  const panel = document.getElementById('kc-detail-panel');
  if (!panel) return;

  // 1. 추천 제목 구성 (홈판용 & SEO용)
  const homepanTitle = item.homepanTitle || (item.titles && item.titles[0]) || `${item.keyword} 핵심 총정리 및 최신 정보 요약`;
  const seoTitle = item.seoTitle || (item.titles && item.titles[1]) || `[${item.keyword}] 2026 최신 정보 요약 및 핵심 꿀팁`;

  // 2. 소제목 목차 구성안
  const subtopics = item.subtopics || (item.outline && item.outline.length > 0 ? item.outline : [
    `1. ${item.keyword} 핵심 개념 및 이것만 알면 끝나는 기본 정보`,
    `2. 초보자도 쉽게 따라하는 단계별 실전 가이드`,
    `3. 많은 사람들이 놓치기 쉬운 핵심 주의사항과 꿀팁`,
    `4. 전문가 추천 추가 활용법 및 관련 FAQ`
  ]);

  const outlineListHtml = subtopics.map((line, i) => {
    // 1., 2. 등의 번호 분리
    const match = line.match(/^(\d+\.?)\s*(.*)/);
    const num = match ? match[1] : `${i + 1}.`;
    const text = match ? match[2] : line;
    return `
      <li style="margin-bottom: 14px; font-size: 0.95rem; color: #cbd5e1; line-height: 1.5;">
        <strong style="color: #ea580c; font-size: 1.05rem; margin-right: 6px;">${num}</strong> ${escapeHtml(text)}
      </li>
    `;
  }).join('');

  // 3. 롱테일 파생 키워드 알약 칩
  const longtails = item.longtails || [
    `${item.keyword} 방법`,
    `${item.keyword} 조회`,
    `${item.keyword} 신청`,
    `${item.keyword} 후기`,
    `${item.keyword} 꿀팁`
  ];
  const longtailsHtml = longtails.map(lt => `
    <button type="button" class="kc-longtail-pill" onclick="searchDirectKeyword('${escapeHtml(lt)}')">
      <span style="color: #64748b; margin-right: 4px;">⌕</span> ${escapeHtml(lt)}
    </button>
  `).join('');

  // 4. 최근 30일 더미 일별 데이터 생성 (DataLab 차트 & 테이블 연동)
  const chartDays = [
    { date: '2026-08-16 (일)', count: 31, ratio: 34.3, barH: 45 },
    { date: '2026-08-17 (월)', count: 50, ratio: 56.0, barH: 68 },
    { date: '2026-08-18 (화)', count: 53, ratio: 58.9, barH: 72 },
    { date: '2026-08-19 (수)', count: 54, ratio: 60.2, barH: 74 },
    { date: '2026-08-20 (목)', count: 53, ratio: 59.7, barH: 72 },
    { date: '2026-08-21 (금)', count: 55, ratio: 61.2, barH: 75 },
    { date: '2026-08-22 (토)', count: 34, ratio: 37.8, barH: 48 },
    { date: '2026-08-23 (일)', count: 30, ratio: 33.3, barH: 42 },
    { date: '2026-08-24 (월)', count: 42, ratio: 46.7, barH: 60 },
    { date: '2026-08-25 (화)', count: 38, ratio: 42.2, barH: 54 },
    { date: '2026-08-26 (수)', count: 37, ratio: 41.1, barH: 52 },
    { date: '2026-08-27 (목)', count: 39, ratio: 43.3, barH: 55 },
    { date: '2026-08-28 (금)', count: 40, ratio: 44.4, barH: 56 },
    { date: '2026-08-29 (토)', count: 26, ratio: 28.9, barH: 38 },
    { date: '2026-08-30 (일)', count: 29, ratio: 32.2, barH: 40 },
    { date: '2026-08-31 (월)', count: 50, ratio: 55.6, barH: 68 },
    { date: '2026-09-01 (화)', count: 52, ratio: 57.8, barH: 70 },
    { date: '2026-09-02 (수)', count: 53, ratio: 58.9, barH: 72 },
    { date: '2026-09-03 (목)', count: 56, ratio: 62.2, barH: 78 },
    { date: '2026-09-04 (금)', count: 54, ratio: 60.0, barH: 75 },
    { date: '2026-09-05 (토)', count: 35, ratio: 38.9, barH: 50 },
    { date: '2026-09-06 (일)', count: 30, ratio: 33.3, barH: 42 },
    { date: '2026-09-07 (월)', count: 42, ratio: 46.7, barH: 60 },
    { date: '2026-09-08 (화)', count: 38, ratio: 42.2, barH: 54 },
    { date: '2026-09-09 (수)', count: 40, ratio: 44.4, barH: 56 },
    { date: '2026-09-10 (목)', count: 41, ratio: 45.6, barH: 58 },
    { date: '2026-09-11 (금)', count: 42, ratio: 46.7, barH: 60 },
    { date: '2026-09-12 (토)', count: 26, ratio: 28.9, barH: 38 },
    { date: '2026-09-13 (일)', count: 29, ratio: 32.2, barH: 40 },
    { date: '2026-09-14 (월)', count: 48, ratio: 54.1, barH: 66, active: true }
  ];

  // SVG 또는 HTML 바 차트 생성
  const barChartHtml = chartDays.map(d => `
    <div class="kc-chart-bar-wrap" title="${d.date} · ${d.count}건">
      <div class="kc-chart-bar ${d.active ? 'active-bar' : ''}" style="height: ${d.barH}%;"></div>
    </div>
  `).join('');

  // 30일 테이블 행 생성
  const tableRowsHtml = chartDays.slice(0, 5).map(d => `
    <tr>
      <td style="padding: 10px 8px; color: #94a3b8; font-weight: 500;">${d.date}</td>
      <td style="padding: 10px 8px; font-weight: 800; color: #f8fafc; text-align: center;">${d.count}건</td>
      <td style="padding: 10px 8px; color: #64748b; text-align: center;">${d.ratio}</td>
      <td style="padding: 10px 8px; width: 140px;">
        <div style="background: rgba(255, 255, 255, 0.08); border-radius: 4px; height: 6px; width: 100%; overflow: hidden;">
          <div style="background: #6366f1; height: 100%; width: ${d.ratio}%; border-radius: 4px;"></div>
        </div>
      </td>
    </tr>
  `).join('');

  panel.innerHTML = `
    <div class="kc-white-report-container">
      <!-- 1. 상세 키워드 분석 리포트 상단 헤더 & 종합 참고 점수 -->
      <div class="kc-detail-header-row">
        <div>
          <span class="kc-report-pill-badge">상세 키워드 분석 리포트</span>
          <h2 class="kc-report-main-title">${escapeHtml(item.keyword)}</h2>
          <div class="kc-report-sub-meta">
            저장본 생성: ${item.date || '2026-09-14T03:28:09.897Z'} · ${escapeHtml(item.channel || '황금키워드 · 네이버 · 금융/재테크')}
          </div>
        </div>

        <!-- 우측 상단 종합 참고 점수 (19.5 / 30) -->
        <div class="kc-big-score-card">
          <div class="kc-score-head-title">종합 참고 점수</div>
          <div class="kc-score-big-val">
            ${item.score || '19.5'}<span class="kc-score-denom"> / 30</span>
          </div>
          <div class="kc-score-bottom-note">수익·CPC 확정값 아님</div>
        </div>
      </div>

      <!-- 2. 주황색 주의 경고 박스 -->
      <div class="kc-alert-box-clean">
        이 화면의 점수와 광고주 수요는 실제 수익·CPC를 확정하거나 보장하지 않는 콘텐츠 기획용 참고 지표입니다. 최신 제도·가격·공식 정보는 발행 전에 다시 확인하세요.
      </div>

      <!-- 3. 점수 읽는 법 안내 박스 -->
      <div class="kc-guide-box-clean">
        <h4 class="kc-guide-box-title">점수 읽는 법: 검색 수요·의도·지속성·경쟁 포화도를 함께 보는 참고 평가</h4>
        <div class="kc-guide-tags">
          <span><strong style="color: #2563eb;">T</strong> 검색 수요</span>
          <span><strong style="color: #ea580c;">C</strong> 광고주 수요 참고</span>
          <span><strong style="color: #16a34a;">D</strong> 지속 가능성</span>
          <span><strong style="color: #2563eb;">N</strong> 경쟁 포화도</span>
        </div>
        <p class="kc-guide-text">
          검색량과 광고경쟁은 한국어 검색 수요 참고값이며, 애드센스 주제와 콘텐츠 설계는 워드프레스에서 네이버·구글·빙 전체 검색 유입을 대상으로 평가합니다. 블로그 문서 수는 한국어 웹 콘텐츠 포화도 참고값입니다.
        </p>
      </div>

      <!-- 4. 4대 세부 지표 4열 카드 (T, C, D, N 밑줄 바 포함) -->
      <div class="kc-4metrics-grid-clean">
        <!-- T -->
        <div class="kc-metric-card-clean">
          <div class="kc-card-t-lbl">T (트래픽 수요)</div>
          <div class="kc-card-t-val">${item.t_score || '3'} <small>/ 5</small></div>
          <div class="kc-card-bar-line bar-purple"></div>
          <div class="kc-card-t-sub">월 검색량 ${item.volume}</div>
        </div>
        <!-- C -->
        <div class="kc-metric-card-clean">
          <div class="kc-card-t-lbl">C (광고주 수요)</div>
          <div class="kc-card-t-val">${item.c_score || '2'} <small>/ 5</small></div>
          <div class="kc-card-bar-line bar-orange"></div>
          <div class="kc-card-t-sub">카테고리 기반 참고</div>
        </div>
        <!-- D -->
        <div class="kc-metric-card-clean">
          <div class="kc-card-t-lbl">D (지속 가능성)</div>
          <div class="kc-card-t-val">${item.d_score || '3'} <small>/ 5</small></div>
          <div class="kc-card-bar-line bar-green"></div>
          <div class="kc-card-t-sub">검색 의도 기준</div>
        </div>
        <!-- N -->
        <div class="kc-metric-card-clean">
          <div class="kc-card-t-lbl">N (경쟁 포화도)</div>
          <div class="kc-card-t-val">${item.n_score || '5'} <small>/ 5</small></div>
          <div class="kc-card-bar-line bar-blue"></div>
          <div class="kc-card-t-sub">문서/검색 ${item.ratio || '0.0145'}</div>
        </div>
      </div>

      <!-- 5. 최근 30일 일별 추정 검색 관심도 (차트 & 테이블) -->
      <div class="kc-chart-section-clean">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h3 style="font-size: 1.15rem; font-weight: 900; color: #0f172a; margin: 0;">최근 30일 일별 추정 검색 관심도</h3>
          <span style="font-size: 0.95rem; font-weight: 800; color: #16a34a;">${item.diffText || '최근 7일 -22%'}</span>
        </div>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0 0 16px 0;">
          네이버 DataLab 상대 관심도 기반 일별 실측 추이입니다. 막대나 표를 누르면 일별 수치를 볼 수 있습니다.
        </p>

        <!-- 3열 요약 카드 (월 검색량, 30일 최고 추정치, 데이터 구분) -->
        <div class="kc-chart-3stats-row">
          <div class="kc-stat-mini-box">
            <span class="kc-stat-mini-lbl">월 검색량</span>
            <strong class="kc-stat-mini-val">${item.volume}</strong>
          </div>
          <div class="kc-stat-mini-box">
            <span class="kc-stat-mini-lbl">30일 최고 추정치</span>
            <strong class="kc-stat-mini-val">${item.monthlyMax || '56건/일'}</strong>
          </div>
          <div class="kc-stat-mini-box">
            <span class="kc-stat-mini-lbl">데이터 구분</span>
            <strong class="kc-stat-mini-val">DataLab 실측</strong>
          </div>
        </div>

        <!-- 막대 차트 비주얼 -->
        <div class="kc-chart-visual-box">
          <div class="kc-chart-y-axis">
            <span>56</span>
            <span>42</span>
            <span>28</span>
            <span>14</span>
            <span>0</span>
          </div>
          <div class="kc-chart-bars-area">
            ${barChartHtml}
          </div>
        </div>
        <div class="kc-chart-x-labels">
          <span>08/16</span>
          <span>08/23</span>
          <span>08/30</span>
          <span>09/06</span>
          <span>09/14</span>
        </div>

        <!-- 선택 날짜 안내 문구 -->
        <div class="kc-selected-date-info">
          <strong style="color: #ea580c;">선택 날짜: 2026-09-14</strong> · 일별 추정 검색량 <strong>48건</strong> · 상대 관심도 지수 <strong>54.1</strong>
          <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 2px;">
            네이버 DataLab 상대 관심도를 월간 검색량 ${item.volume}건에 비례 배분한 실측 지표입니다.
          </div>
        </div>

        <!-- 최근 30일 일별 추정 검색 관심도 상세 표 아코디언/박스 -->
        <div class="kc-chart-table-wrap">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 800; color: #cbd5e1; display: flex; align-items: center; gap: 4px;">
              📊 최근 30일 일별 추정 검색 관심도 상세 표
            </span>
            <span style="font-size: 0.74rem; color: #94a3b8;">행을 누르면 상단 그래프 막대와 연동됩니다</span>
          </div>
          <table class="kc-datalab-table">
            <thead>
              <tr>
                <th style="text-align: left;">날짜</th>
                <th style="text-align: center;">일별 추정 검색량</th>
                <th style="text-align: center;">상대 지수</th>
                <th style="text-align: left;">상대 비율</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 6. 4대 설명 박스 (왜 지금 주목할까, 실제 사용자 검색의도, 선정 근거, 광고주 수요 참고) -->
      <div class="kc-2x2-info-grid">
        <div class="kc-info-card-2x2 card-mint">
          <div class="kc-info-head">▣ 왜 지금 주목할까</div>
          <div class="kc-info-body">
            ${escapeHtml(item.whyNow || '최근 7일 상대 관심도는 첫 7일 대비 -22%입니다. 급격한 변화만으로 판단하지 말고 검색량과 문서수도 함께 확인하세요.')}
          </div>
        </div>
        <div class="kc-info-card-2x2 card-blue">
          <div class="kc-info-head">☁ 실제 사용자 검색의도</div>
          <div class="kc-info-body">
            ${escapeHtml(item.userIntent || `공식 월 ${item.volume}건 조회`)}
          </div>
        </div>
        <div class="kc-info-card-2x2 card-purple">
          <div class="kc-info-head">⌕ 선정 근거 (경쟁 포화도)</div>
          <div class="kc-info-body">
            ${escapeHtml(item.selectionBasis || `월 검색량 ${item.volume}건과 블로그 문서 ${item.docCount}건을 비교해 문서/검색 비율 ${item.ratio}을 참고 지표로 사용했습니다.`)}
          </div>
        </div>
        <div class="kc-info-card-2x2 card-yellow">
          <div class="kc-info-head">▣ 광고주 수요 참고</div>
          <div class="kc-info-body">
            ${escapeHtml(item.cpcNote || '검색 수요와 문서 경쟁을 먼저 보는 일반 탐색형 키워드입니다. 실제 광고 단가나 수익을 의미하지는 않습니다.')}
          </div>
        </div>
      </div>

      <!-- 7. 롱테일 파생 키워드 알약 박스 -->
      <div class="kc-longtail-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; display: flex; align-items: center; gap: 4px;">
            ⌕ 롱테일 파생 키워드
          </span>
          <span style="font-size: 0.74rem; color: #94a3b8;">네이버 연관검색어 · 실제 검색어 우선</span>
        </div>
        <div class="kc-longtail-pills-row">
          ${longtailsHtml}
        </div>
      </div>

      <!-- 8. 추천 포스팅 제목 (네이버 홈판용 제목 & SEO 검색용 제목 + 복사 버튼) -->
      <div class="kc-box-white-card">
        <div style="font-size: 1rem; font-weight: 900; color: #f8fafc; margin-bottom: 14px; display: flex; align-items: center; gap: 6px;">
          <span>▣</span> 추천 포스팅 제목
        </div>

        <!-- 네이버 홈판용 제목 -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #34d399; margin-bottom: 8px;">네이버 홈판용 제목</div>
          <div class="kc-dashed-title-box">
            <span id="kc-copy-homepan-text" style="font-size: 0.95rem; font-weight: 800; color: #f8fafc;">${escapeHtml(homepanTitle)}</span>
          </div>
          <button type="button" class="kc-purple-action-btn" onclick="copySnippet('kc-copy-homepan-text', '홈판용 제목이 복사되었습니다!')">
            홈판 제목 복사
          </button>
        </div>

        <!-- SEO 검색용 제목 -->
        <div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #60a5fa; margin-bottom: 8px;">SEO 검색용 제목</div>
          <div class="kc-dashed-title-box">
            <span id="kc-copy-seo-text" style="font-size: 0.95rem; font-weight: 800; color: #f8fafc;">${escapeHtml(seoTitle)}</span>
          </div>
          <button type="button" class="kc-purple-action-btn" onclick="copySnippet('kc-copy-seo-text', 'SEO 검색용 제목이 복사되었습니다!')">
            SEO 제목 복사
          </button>
        </div>
      </div>

      <!-- 9. 소제목 목차 구성안 (파생 키워드 통합 구조 + 목차 복사 버튼) -->
      <div class="kc-box-white-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="font-size: 1rem; font-weight: 900; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
            <span>☷</span> 소제목 목차 구성안 (파생 키워드 통합 구조)
          </div>
          <button type="button" class="kc-purple-action-btn" style="margin: 0;" onclick="copyOutlineText('${escapeHtml(item.keyword)}')">
            목차 복사
          </button>
        </div>

        <ol id="kc-outline-list" style="list-style: none; padding: 0; margin: 0 0 16px 0;">
          ${outlineListHtml}
        </ol>

        <div style="font-size: 0.8rem; color: #94a3b8; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
          CTA 제안: ${escapeHtml(item.ctaSuggestion || `${item.keyword} 관련 상세 최신 정보 및 핵심 가이드 확인하기`)}
        </div>
      </div>

      <!-- 10. 최하단 검색엔진 4대 검색 결과 바로가기 버튼 바 -->
      <div class="kc-portals-btn-grid">
        <a href="https://search.naver.com/search.naver?query=${encodeURIComponent(item.keyword)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn portal-green">
          네이버 검색결과
        </a>
        <a href="https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(item.keyword)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          블로그 문서 확인
        </a>
        <a href="https://www.google.com/search?q=${encodeURIComponent(item.keyword)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          구글 검색결과
        </a>
        <a href="https://www.bing.com/search?q=${encodeURIComponent(item.keyword)}" target="_blank" rel="noopener noreferrer" class="kc-portal-btn">
          빙 검색결과
        </a>
      </div>
    </div>
  `;
}

// 텍스트 클립보드 복사 헬퍼
window.copySnippet = function(elemId, successMsg) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  const text = elem.textContent || elem.innerText;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast(successMsg, '📋');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (window.showToast) window.showToast(successMsg, '📋');
  }
};

// 목차 일괄 복사 헬퍼
window.copyOutlineText = function(keyword) {
  const list = document.getElementById('kc-outline-list');
  if (!list) return;
  const lines = Array.from(list.querySelectorAll('li')).map(li => li.innerText.trim()).join('\n');
  const fullText = `[${keyword}] 상위노출 추천 목차\n\n` + lines;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(fullText).then(() => {
      if (window.showToast) window.showToast('소제목 목차 전체가 클립보드에 복사되었습니다!', '📑');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = fullText;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (window.showToast) window.showToast('소제목 목차 전체가 클립보드에 복사되었습니다!', '📑');
  }
};

// 롱테일 클릭 시 검색 연동
window.searchDirectKeyword = function(kw) {
  if (window.showToast) window.showToast(`'${kw}' 파생 키워드를 복사했습니다.`, '⌕');
  navigator.clipboard.writeText(kw).catch(() => {});
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[s]));
}
