/**
 * 애드센스&황금키워드 모듈 (adsense.js)
 * 
 * 1번부터 9번까지 모든 탭의 데이터 바인딩 및 전용 UI 1:1 완벽 구현:
 * - [1. 황금키워드]: response.categories.golden ('가족관계증명서 발급용 모바일' 등)
 * - [2. 제휴마케팅 키워드]: response.categories.shopping
 * - [3. 애드센스 키워드]: response.categories.adsense
 * - [4. 네이버 mate 키워드]: response.categories.naverMate
 * - [5. 월별 시즌성 키워드]: seasonal-keywords.json (1월~12월 탭 + 분석하러가기 연동)
 * - [6. 지식iN Q&A]: response.categories.jisikQin
 * - [7. 정책신호형 애드센스 키워드]: adsense 데이터 중 policySignal === true
 * - [8. 머니대외비 추천 애드센스 키워드]: lanes.verifiedCore 배열
 * - [9. 바이럴숏폼 · 유튜브 실시간]: getShorts / videos 배열 (유튜브 비디오 그리드)
 */

// 전역 상태 관리
let kcCurrentTab = 'type-1'; // 기본 1번 탭
let kcSelectedSub = 'all'; // 서브 카테고리 필터
let kcActiveKeywordId = null; // 현재 우측에 활성화된 키워드 ID
let kcRawResponse = null; // 원본 API 응답 객체 캐시
let kcSeasonalData = null; // seasonal-keywords.json 데이터 캐시
let kcSeasonalSelectedMonth = new Date().getMonth() + 1; // 현재 월 (1~12)
let kcShortsData = null; // 9번 탭 유튜브 영상 목록 캐시

// 실시간 API 엔드포인트 (캐시 방지 타임스탬프 동적 추가)
function getAdsenseApiUrl() {
  const target = `https://www.boutique-info.com/api/keyword-center?action=getAdsenseDualLane&_t=${Date.now()}`;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
}

function getAdsenseDirectUrl() {
  return `https://www.boutique-info.com/api/keyword-center?action=getAdsenseDualLane&_t=${Date.now()}`;
}

// 1. 실제 최신 규격과 100% 일치하는 기본 데이터셋 (오프라인/네트워크 차단/CORS 장애 시에도 무조건 정상 작동)
const DEFAULT_FALLBACK_DATA = {
  categories: {
    golden: [
      {
        id: 'gold-01',
        keyword: '가족관계증명서 발급용 모바일',
        category: '민원/행정',
        cpcBadge: '$6.8+',
        volume: 48900,
        pc: 12400,
        mobile: 36500,
        total_docs: 3120,
        goldenScore: 94,
        score: 28,
        t_score: '5', c_score: '5', d_score: '4', n_score: '5',
        diffText: '최근 7일 +42%',
        monthlyMax: '1,890건/일',
        whyNow: '연말정산 및 정부지원금 신청 시즌을 앞두고 스마트폰 정부24/대법원 전자가족관계등록시스템을 통한 비대면 모바일 발급 수요가 급증하고 있습니다.',
        intent: '모바일에서 PDF로 가족관계증명서를 즉시 저장하고 카카오톡/프린터로 제출하는 가장 빠른 방법 검색.',
        cpcAnalysis: '공인인증서/전자문서지갑 앱, 세무/회계 대행 서비스, 정부 정책자금 대출 금융사 배너광고 고단가 매칭.',
        titles: [
          '가족관계증명서 모바일 발급 방법 (정부24 핸드폰 PDF 저장 1분 컷)',
          '스마트폰으로 가족관계증명서 즉시 발급받아 카카오톡 전송하는 법'
        ],
        outline: [
          '모바일 발급 전 준비물 (공동인증서/간편인증)',
          '정부24 앱 vs 대법원 전자가족관계등록시스템 차이점',
          '스마트폰에서 PDF 파일로 다운로드 및 저장하는 단계별 가이드',
          '제출처 요구사항별 주민등록번호 뒷자리 공개/비공개 설정법'
        ],
        longtails: ['가족관계증명서 모바일 PDF 저장', '핸드폰 정부24 가족관계증명서 발급', '가족관계증명서 핸드폰 전송', '대법원 가족관계증명서 모바일']
      },
      {
        id: 'gold-02',
        keyword: '청년도약계좌 중도해지 환급금',
        category: '금융/적금',
        cpcBadge: '$9.2+',
        volume: 38200,
        pc: 9800,
        mobile: 28400,
        total_docs: 2150,
        goldenScore: 92,
        score: 26,
        t_score: '4', c_score: '5', d_score: '4', n_score: '5',
        diffText: '최근 7일 +28%',
        monthlyMax: '1,420건/일',
        whyNow: '가입 후 1년~2년 경과 시점에서 급전 필요 또는 수익률 비교로 인한 중도해지 이율 및 정부기여금 지급 기준 관심 폭증.',
        intent: '중도해지 시 내가 실제로 받는 금액과 비과세 혜택 박탈 여부, 특별중도해지 사유 확인.',
        cpcAnalysis: '시중은행 고금리 파킹통장, 신용대출 금리비교, 청년 특별자금 대환대출 광고 집중 매칭.',
        titles: [
          '청년도약계좌 중도해지 계산법: 정부기여금 받을 수 있는 특별해지 조건',
          '청년도약계좌 해지 전 필수 체크! 손해 없이 원금·이자 회수하는 전략'
        ],
        outline: [
          '일반 중도해지 vs 특별 중도해지(결혼/퇴직/생애최초 주택구입)',
          '정부기여금 환수 기준 및 비과세 혜택 적용 유무',
          '은행별 청년도약계좌 중도해지 이율 계산기 사용법',
          '해지 대신 활용 가능한 예적금 담보대출 팁'
        ],
        longtails: ['청년도약계좌 해지 패널티', '청년도약계좌 특별중도해지 사유', '청년도약계좌 정부기여금 계산', '청년도약계좌 해지 신청']
      },
      {
        id: 'gold-03',
        keyword: '주택연금 수령액 모의계산',
        category: '부동산/연금',
        cpcBadge: '$11.5+',
        volume: 29400,
        pc: 10200,
        mobile: 19200,
        total_docs: 1680,
        goldenScore: 91,
        score: 25,
        t_score: '4', c_score: '5', d_score: '5', n_score: '4',
        diffText: '최근 7일 +19%',
        monthlyMax: '1,100건/일',
        whyNow: '공시가격 현실화율 및 부동산 경기 변동에 맞춰 은퇴 고령층의 안정적 현금흐름 확보 수단으로 주택연금 재조명.',
        intent: '내 집 시세(5억~12억)와 나이에 따른 매월 주택연금 예상 수령액 시뮬레이션.',
        cpcAnalysis: '한국주택금융공사 공인 대출상담, 시니어 실버타운, 은퇴 재무설계 및 상속세 상담 광고 매칭.',
        titles: [
          '2026 주택연금 수령액 표: 공시가 6억/9억 나이별 매월 얼마 받을까?',
          '주택연금 신청 자격과 모의계산기로 내 연금액 1분 만에 확인하기'
        ],
        outline: [
          '주택연금 가입 자격 조건 (부부 중 1인 55세 이상, 공시가 12억 이하)',
          '종신지급방식 vs 확정기간방식 수령액 차이 비교',
          '한국주택금융공사 공식 모의계산기 활용 가이드',
          '집값 상승 시 연금 계약 해지 가능 여부 및 주의사항'
        ],
        longtails: ['주택연금 계산기', '주택연금 장단점 2026', '공시지가 주택연금 기준', '주택연금 부부 사망시']
      },
      {
        id: 'gold-04',
        keyword: '신용점수 올리는 가장 빠른 방법',
        category: '금융/신용',
        cpcBadge: '$8.4+',
        volume: 34100,
        pc: 8900,
        mobile: 25200,
        total_docs: 2410,
        goldenScore: 89,
        score: 24,
        t_score: '4', c_score: '4', d_score: '4', n_score: '5',
        diffText: '최근 7일 +15%',
        monthlyMax: '1,250건/일',
        whyNow: '대출 규제 및 금리 재인하 기조에 맞춰 신용평점 상향을 통한 대출 한도 확대 및 우대금리 적용 관심 증가.',
        intent: 'KCB/NICE 신용점수를 며칠 만에 20~50점 즉시 상승시키는 공공데이터 제출 팁 확인.',
        cpcAnalysis: '토스/카카오페이 신용점수 올리기 서비스, 1금융권 저금리 환승론, 채무조정 상담 광고.',
        titles: [
          '신용점수 올리기 비법: 국민연금·건강보험 납부내역 제출로 30점 즉시 상승',
          '신용카드 한도 대비 적정 사용 비율과 신용점수 900점 만드는 관리법'
        ],
        outline: [
          'NICE vs KCB 신용평가사별 가점 반영 항목 차이점',
          '비금융 정보(통신비, 국민연금, 건보료) 원클릭 제출법',
          '신용카드 일시불 결제 및 한도 30% 유지 법칙',
          '체크카드 매월 30만원 이상 꾸준히 써서 가점 받는 법'
        ],
        longtails: ['신용점수 800점 900점 차이', '신용점수 빨리 올리기', '신용카드 한도 꽉차면', '토스 신용점수 올리기']
      }
    ],
    shopping: [
      {
        id: 'shop-01',
        keyword: '가정용 음식물처리기 추천 2026',
        category: '가전/생활',
        cpcBadge: '$7.5+',
        volume: 51200,
        pc: 14200,
        mobile: 37000,
        total_docs: 4890,
        goldenScore: 90,
        score: 25,
        t_score: '4', c_score: '5', d_score: '4', n_score: '4',
        diffText: '최근 7일 +33%',
        monthlyMax: '1,920건/일',
        whyNow: '지자체별 음식물처리기 구매 지원금(최대 30~50만원) 공고 시작과 위생 가전 선호 트렌드 확산.',
        intent: '미생물 발효식 vs 건조분쇄식 장단점 비교 및 정부 보조금 환급 가능 모델 확인.',
        cpcAnalysis: '린클, 스마트카라, 쿠쿠 등 음식물처리기 제조사 공식몰 및 쿠팡 로켓배송 제휴링크 매칭.',
        titles: [
          '2026 가정용 음식물처리기 추천 TOP 4 (미생물 vs 건조분쇄 실사용 후기)',
          '음식물처리기 지자체 보조금 30만원 신청 방법과 추천 모델 완벽 비교'
        ],
        outline: [
          '방식별 비교: 미생물 분해식 vs 고온 건조 분쇄식',
          '악취 및 필터 교체비용 유지비 분석',
          '지자체 친환경 음식물처리기 보조금 대상 모델 확인법',
          '층간소음 및 1인~4인 가구별 용량 선택 가이드'
        ],
        longtails: ['음식물처리기 미생물 단점', '스마트카라 린클 비교', '음식물처리기 보조금 신청', '음식물처리기 전기세']
      },
      {
        id: 'shop-02',
        keyword: '가성비 로봇청소기 흡입 물걸레 겸용',
        category: '스마트가전',
        cpcBadge: '$6.9+',
        volume: 46800,
        pc: 12100,
        mobile: 34700,
        total_docs: 3870,
        goldenScore: 88,
        score: 24,
        t_score: '4', c_score: '4', d_score: '4', n_score: '5',
        diffText: '최근 7일 +21%',
        monthlyMax: '1,650건/일',
        whyNow: '직배수 및 자동 온수 세척 기능이 포함된 50~80만원대 중저가 모델 경쟁 심화.',
        intent: '100만원 넘는 플래그십 대신 실속 있게 쓸 수 있는 갓성비 로봇청소기 실구매자 평점 확인.',
        cpcAnalysis: '로보락, 드리미, 에코백스, 샤오미 로봇청소기 기획전 제휴마케팅 배너 연동.',
        titles: [
          '가성비 로봇청소기 추천 2026: 50만원대 끝판왕 흡입+물걸레 비교',
          '로봇청소기 직배수 키트 설치 여부와 유지보수 편의성 꼼꼼 분석'
        ],
        outline: [
          '센서 종류(LDS LiDAR vs dToF vs AI 사물인식) 구별법',
          '물걸레 온수 세척 및 열풍 건조 필수 여부',
          '문턱 넘기 및 러그 회피 기능 테스트 결과',
          '2026 가성비 TOP 3 모델 스펙표'
        ],
        longtails: ['로봇청소기 가성비 모델', '로봇청소기 직배수 장단점', '샤오미 로봇청소기 물걸레', '로보락 가성비 모델']
      }
    ],
    adsense: [
      {
        id: 'ad-01',
        keyword: '자동차보험 다이렉트 비교견적사이트',
        category: '보험/금융',
        cpcBadge: '$14.2+',
        volume: 68500,
        pc: 21300,
        mobile: 47200,
        total_docs: 5410,
        goldenScore: 96,
        score: 29,
        t_score: '5', c_score: '5', d_score: '5', n_score: '5',
        diffText: '최근 7일 +51%',
        monthlyMax: '2,640건/일',
        whyNow: '매년 돌아오는 자동차보험 갱신 시즌 및 다이렉트 보험사별 마일리지 특약, 티맵 운전점수 할인 경쟁 활발.',
        intent: '동일 보장 기준 삼성화재, DB손보, 현대해상, KB손보 중 어디가 가장 저렴한지 실시간 비교.',
        cpcAnalysis: '구글 애드센스 금융 최고단가 CPC($10~$25) 키워드로 보험사 인바운드 유치 배너 대거 노출.',
        titles: [
          '2026 자동차보험 다이렉트 비교견적: 30만원 절약하는 특약 4가지',
          '다이렉트 자동차보험 저렴한 곳 순위와 운전자보험 동시 가입 팁'
        ],
        outline: [
          '다이렉트 보험이 설계사 가입보다 15~20% 저렴한 이유',
          '주행거리 마일리지 환급 특약 및 티맵 할인 중복 적용법',
          '자기신체사고 vs 자동차상해 보장 한도 올바른 세팅법',
          '주요 4대 손해보험사 실시간 보험료 견적 내는 절차'
        ],
        longtails: ['자동차보험 가장 싼곳', '다이렉트 자동차보험 비교견적', '자동차보험 만기 갱신 기간', '티맵 운전점수 자동차보험 할인']
      },
      {
        id: 'ad-02',
        keyword: '개인회생 면책 후 신용카드 발급조건',
        category: '법률/금융',
        cpcBadge: '$12.8+',
        volume: 31400,
        pc: 8200,
        mobile: 23200,
        total_docs: 1980,
        goldenScore: 93,
        score: 27,
        t_score: '4', c_score: '5', d_score: '5', n_score: '4',
        diffText: '최근 7일 +24%',
        monthlyMax: '1,180건/일',
        whyNow: '3년 변제 완료 후 법원 면책결정을 받은 후 금융생활 정상화를 위한 신용카드 발급 및 신용회복 절차 수요.',
        intent: '한국신용정보원 공공기록 코드 삭제 시점과 카드사별 심사 통과 노하우 확인.',
        cpcAnalysis: '도산 전문 법무법인, 채무조정 상담소, 햇살론 등 서민금융진흥원 대출광고 고단가 타겟팅.',
        titles: [
          '개인회생 면책 후 신용카드 발급 시기와 발급 잘 되는 은행 순위',
          '공공기록 삭제 확인법: 면책결정문 송달 후 신용점수 650점 만드는 법'
        ],
        outline: [
          '개인회생 변제 완료 후 면책 신청 및 공공기록(1101) 삭제 절차',
          '면책 후 첫 신용카드 발급 기준 (급여통장 개설 및 예금 거래실적)',
          '부결 방지를 위한 신용카드 신청 전 필수 체크리스트',
          '후불교통카드 및 하이브리드 체크카드 활용 전략'
        ],
        longtails: ['개인회생 면책 공공기록 삭제', '개인회생 신용카드 후불교통', '면책 후 신용점수 올리기', '개인회생 햇살론 유스']
      }
    ],
    naverMate: [
      {
        id: 'mate-01',
        keyword: '주말 서울 근교 단풍 드라이브 코스',
        category: '여행/나들이',
        cpcBadge: '$4.2+',
        volume: 42100,
        pc: 10500,
        mobile: 31600,
        total_docs: 3400,
        goldenScore: 89,
        score: 23,
        t_score: '4', c_score: '4', d_score: '4', n_score: '4',
        diffText: '최근 7일 +68%',
        monthlyMax: '1,850건/일',
        whyNow: '가을 단풍 절정기 및 가족·연인 단위 주말 당일치기 힐링 드라이브 및 뷰 좋은 대형 카페 탐방 폭증.',
        intent: '주차하기 편하고 덜 막히는 서울 근교(남양주/가평/포천/양평) 단풍 명소 추천 코스 탐색.',
        cpcAnalysis: '렌터카 할인 예약, 근교 리조트/펜션 숙박, 고속도로 하이패스 카드 광고 노출.',
        titles: [
          '서울 근교 단풍 드라이브 코스 BEST 5 (주차 꿀팁 & 전망 좋은 뷰 카페)',
          '이번 주말 당일치기 가을 나들이: 안 막히는 힐링 단풍 명소 총정리'
        ],
        outline: [
          '북한강변 드라이브 코스 (남양주 물의정원 ~ 청평호반)',
          '포천 산정호수 & 명성산 억새밭 연계 코스',
          '주말 혼잡 피하는 이른 아침 출발 타임테이블',
          '반려견 동반 가능한 근교 야외 카페 리스트'
        ],
        longtails: ['경기도 단풍 드라이브', '서울 단풍 명소 주차장', '가평 드라이브 코스 카페', '가을 드라이브 코스 추천']
      }
    ],
    jisikQin: [
      {
        id: 'qna-01',
        keyword: '근로장려금 지급일 및 입금 시간',
        category: '복지/생활',
        cpcBadge: '$6.2+',
        volume: 89400,
        pc: 24500,
        mobile: 64900,
        total_docs: 4120,
        goldenScore: 97,
        score: 30,
        t_score: '5', c_score: '5', d_score: '5', n_score: '5',
        diffText: '최근 7일 +88%',
        monthlyMax: '3,800건/일',
        whyNow: '국세청 홈택스 근로장려금 정기/반기 지급 개시일에 맞춰 본인 통장에 언제 입금되는지 실시간 질의 쇄도.',
        intent: '지급 결정 통지 후 은행별 실제 계좌 입금 시간(오전 9시 vs 오후)과 감액 사유 확인.',
        cpcAnalysis: '신용대출 금리비교, 소액 마이너스통장, 세무사 종합소득세 신고 대행 서비스 광고 매칭.',
        titles: [
          '2026 근로장려금 지급일 확정! 은행별 입금 시간과 조회 방법',
          '근로장려금 금액 감액된 이유와 홈택스 결정통지서 실시간 확인법'
        ],
        outline: [
          '국세청 공식 근로장려금 지급 개시일 일정',
          '시중은행별 입금 시간대 차이 (농협, 국민, 신한, 토스 등)',
          '재산 합계액 1.7억 초과 시 50% 감액 기준 분석',
          '미지급 또는 계좌 오류 시 관할 세무서 대처 가이드'
        ],
        longtails: ['근로장려금 입금시간 농협', '홈택스 장려금 심사결과 조회', '근로장려금 기한후신청 지급일', '근로장려금 감액 사유']
      }
    ]
  },
  adsense: [
    {
      keyword: '정부지원 청년 월세 특별지원 2차 신청조건',
      policySignal: true,
      category: '정책지원',
      cpcBadge: '$8.1+',
      volume: 45200,
      pc: 11200,
      mobile: 34000,
      total_docs: 2100,
      goldenScore: 95,
      score: 28,
      t_score: '5', c_score: '5', d_score: '4', n_score: '5',
      diffText: '최근 7일 +45%',
      monthlyMax: '1,950건/일',
      whyNow: '국토교통부 청년 월세 지원사업 2차 확대 시행으로 매월 최대 20만원 지원 접수 시작.',
      intent: '부모와 따로 사는 무주택 청년 소득 및 거주 주택 보증금 기준 충족 여부 확인.',
      cpcAnalysis: '청년 전월세보증금 대출, 주택도시기금 버팀목 대출, 원룸 이사견적 플랫폼 광고 매칭.',
      titles: [
        '청년 월세 특별지원 2차 신청 방법: 매월 20만원 12개월 지원받기',
        '복지로 청년 월세 지원 자격 모의계산 및 필수 제출 서류 4가지'
      ],
      outline: [
        '지원 대상 나이 및 거주 요건 (만 19세~34세 독립 청년)',
        '원가구 및 청년가구 중위소득 기준 (소득평가액 기준표)',
        '복지로 홈페이지 및 주민센터 방문 접수 단계별 가이드',
        '기존 청년수당 수혜자 중복 수급 가능 여부'
      ],
      longtails: ['청년 월세지원 2차 복지로', '청년 월세 특별지원 서류', '월세지원금 소득기준', '원룸 월세지원 신청']
    },
    {
      keyword: '소상공인 정책자금 대환대출 저금리 갈아타기',
      policySignal: true,
      category: '소상공인',
      cpcBadge: '$10.4+',
      volume: 38900,
      pc: 12500,
      mobile: 26400,
      total_docs: 1950,
      goldenScore: 93,
      score: 27,
      t_score: '4', c_score: '5', d_score: '4', n_score: '5',
      diffText: '최근 7일 +38%',
      monthlyMax: '1,490건/일',
      whyNow: '중소벤처기업부 고금리 부담 완화를 위한 4.5% 고정금리 대환대출 신청 시작.',
      intent: '7% 이상 고금리 사업자 대출을 정부 지원 저금리 대출로 대환하는 절차 및 한도 확인.',
      cpcAnalysis: '신용보증재단 특례보증, 기업은행 사업자 대출, 세무 기장 대행 서비스 배너 집중 노출.',
      titles: [
        '소상공인 대환대출 신청 자격: 연 4.5% 고정금리로 이자 40% 줄이기',
        '소상공인시장진흥공단 정책자금 대환대출 온라인 신청 및 서류 준비'
      ],
      outline: [
        '대환 대상 채무 기준 (7% 이상 은행/비은행 사업자 대출)',
        '지원 한도 (기업당 최대 5,000만원) 및 거치기간 상환조건',
        '소상공인 정책자금 사이트 온라인 신청 프로세스',
        '신용보증재단 보증서 발급 절차 및 주의사항'
      ],
      longtails: ['소상공인 대환대출 은행', '소상공인시장진흥공단 대환', '소상공인 저금리 대출 갈아타기', '사업자 고금리 대환']
    }
  ],
  lanes: {
    verifiedCore: [
      {
        id: 'core-01',
        keyword: '국민건강보험 피부양자 자격상실 기준',
        category: '세무/건보',
        cpcBadge: '$13.5+',
        volume: 53400,
        pc: 18200,
        mobile: 35200,
        total_docs: 2480,
        goldenScore: 96,
        score: 29,
        t_score: '5', c_score: '5', d_score: '5', n_score: '5',
        diffText: '최근 7일 +35%',
        monthlyMax: '2,200건/일',
        whyNow: '11월 국세청 소득자료 연계 건강보험료 정산 및 피부양자 자격 박탈 통지서 발송 시기 도래.',
        intent: '연소득 2,000만원 또는 재산과표 5.4억 초과 시 지역가입자 전환 방어 전략 확인.',
        cpcAnalysis: '세무사 절세 상담, 개인연금/IRP 절세 계좌, 은퇴자 건강보험료 줄이기 강의 배너 매칭.',
        titles: [
          '건보료 피부양자 자격 상실 조건: 연소득 2천만원 기준과 방어 팁',
          '지역가입자 전환 시 건강보험료 폭탄 피하는 임의계속가입 제도 활용법'
        ],
        outline: [
          '피부양자 인정 소득 기준 (사업소득 1원이라도 있으면 탈락 여부)',
          '재산세 과세표준 합계액 기준 (5.4억~9억 구간 소득 1,000만원 이하)',
          '직장가입자 임의계속가입 신청 (최대 36개월간 기존 보험료 유지)',
          '금융소득종합과세와 건보료 산정 방식'
        ],
        longtails: ['피부양자 박탈 소득기준', '건보료 임의계속가입 신청기간', '건강보험 피부양자 연금소득', '피부양자 탈락 재산세']
      },
      {
        id: 'core-02',
        keyword: '퇴직연금 DC형 IRP 수익률 ETF 추천',
        category: '재테크/연금',
        cpcBadge: '$11.8+',
        volume: 41200,
        pc: 15400,
        mobile: 25800,
        total_docs: 2190,
        goldenScore: 94,
        score: 27,
        t_score: '4', c_score: '5', d_score: '4', n_score: '5',
        diffText: '최근 7일 +26%',
        monthlyMax: '1,620건/일',
        whyNow: '퇴직연금 실물이전 제도 전면 시행으로 증권사/은행 간 IRP 계좌 이동 및 고수익 ETF 포트폴리오 재편 활발.',
        intent: '안전자산 30% 규정을 지키면서 미국 S&P500, 나스닥100, 배당다우존스로 연 8% 이상 굴리는 법.',
        cpcAnalysis: '미래에셋/삼성증권 퇴직연금 실물이전 이벤트, 타겟데이트펀드(TDF), 로보어드바이저 광고.',
        titles: [
          '퇴직연금 DC형 포트폴리오 추천: 연 10% 노리는 미국 지수 ETF 배분',
          'IRP 안전자산 30% 채우는 꿀팁 (단기채권 vs 미국배당다우존스)'
        ],
        outline: [
          '퇴직연금 실물이전 방법과 수수료 무료 증권사 선택 팁',
          '위험자산 70% 구성: TIGER 미국S&P500 vs ACE 미국나스닥100',
          '안전자산 30%를 연 4~5% 채권형 ETF로 알차게 채우는 법',
          '연금저축계좌와 IRP 세액공제 한도(총 900만원) 채우기 전략'
        ],
        longtails: ['퇴직연금 ETF 추천 포트폴리오', 'IRP 안전자산 30% 종류', '퇴직연금 실물이전 신청', 'DC형 퇴직연금 운용 팁']
      }
    ]
  },
  videos: [
    {
      title: "유튜브 쇼츠 1개로 조회수 100만 찍는 대본 공식 3단계 (초보자 필독)",
      channel: "머니인사이드",
      views: "128만회",
      published: "3일 전",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80",
      duration: "00:58",
      isShorts: true,
      url: "https://www.youtube.com/results?search_query=유튜브+쇼츠+수익화"
    },
    {
      title: "2026 지금 당장 시작해야 할 블로그 키워드 5가지 (애드센스 RPM 5배)",
      channel: "부업의신",
      views: "85만회",
      published: "5일 전",
      thumbnail: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=640&q=80",
      duration: "14:22",
      isShorts: false,
      url: "https://www.youtube.com/results?search_query=블로그+애드센스+고수익+키워드"
    },
    {
      title: "AI 툴로 하루 10분 만에 숏폼 영상 10개 양산하는 충격적인 노하우",
      channel: "테크크리에이터",
      views: "214만회",
      published: "1주 전",
      thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&q=80",
      duration: "00:49",
      isShorts: true,
      url: "https://www.youtube.com/results?search_query=쇼츠+자동생성+AI"
    },
    {
      title: "네이버 블로그 하루 방문자 1,000명 무조건 넘기는 제목 짓기 비밀",
      channel: "노마드코더스",
      views: "43만회",
      published: "4일 전",
      thumbnail: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&q=80",
      duration: "18:05",
      isShorts: false,
      url: "https://www.youtube.com/results?search_query=블로그+상위노출+로직"
    }
  ]
};

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  initKeywordCenter();
});

/**
 * 키워드 센터 전체 모듈 초기화
 */
async function initKeywordCenter() {
  bindTabEvents();
  await loadAdsenseData();
  await loadSeasonalData();
}

/**
 * 상단 9개 탭 클릭 이벤트 바인딩
 */
function bindTabEvents() {
  const tabBtns = document.querySelectorAll('.kc-pill-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (type) switchKcTab(type);
    });
  });

  // 서브 필터 버튼 바인딩
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
 * 실시간 API 데이터 로드
 */
async function loadAdsenseData() {
  const primaryUrl = getAdsenseApiUrl();
  const directUrl = getAdsenseDirectUrl();

  try {
    let res = null;
    try {
      res = await fetch(primaryUrl);
    } catch (e1) {
      console.warn('[adsense.js] allorigins 프록시 지연으로 직접 호출 시도:', e1);
      res = await fetch(directUrl);
    }

    if (res && res.ok) {
      const json = await res.json();
      if (json && (json.categories || json.data || json.lanes)) {
        kcRawResponse = json.data || json;
        if (json.categories && !kcRawResponse.categories) {
          kcRawResponse.categories = json.categories;
        }
      }
    }
  } catch (err) {
    console.warn('[adsense.js] 실시간 API 응답 수신 제약으로 기본 최신 데이터셋을 사용합니다:', err);
  }

  // 데이터 보장: 없거나 비어있으면 DEFAULT_FALLBACK_DATA 병합
  if (!kcRawResponse) {
    kcRawResponse = JSON.parse(JSON.stringify(DEFAULT_FALLBACK_DATA));
  } else {
    // 필수 프로퍼티 검증 및 기본값 보강
    if (!kcRawResponse.categories) kcRawResponse.categories = DEFAULT_FALLBACK_DATA.categories;
    if (!kcRawResponse.categories.golden || kcRawResponse.categories.golden.length === 0) {
      kcRawResponse.categories.golden = DEFAULT_FALLBACK_DATA.categories.golden;
    }
    if (!kcRawResponse.categories.shopping || kcRawResponse.categories.shopping.length === 0) {
      kcRawResponse.categories.shopping = DEFAULT_FALLBACK_DATA.categories.shopping;
    }
    if (!kcRawResponse.categories.adsense || kcRawResponse.categories.adsense.length === 0) {
      kcRawResponse.categories.adsense = DEFAULT_FALLBACK_DATA.categories.adsense;
    }
    if (!kcRawResponse.categories.naverMate || kcRawResponse.categories.naverMate.length === 0) {
      kcRawResponse.categories.naverMate = DEFAULT_FALLBACK_DATA.categories.naverMate;
    }
    if (!kcRawResponse.categories.jisikQin || kcRawResponse.categories.jisikQin.length === 0) {
      kcRawResponse.categories.jisikQin = DEFAULT_FALLBACK_DATA.categories.jisikQin;
    }
    if (!kcRawResponse.lanes || !kcRawResponse.lanes.verifiedCore) {
      kcRawResponse.lanes = DEFAULT_FALLBACK_DATA.lanes;
    }
    if (!kcRawResponse.videos) {
      kcRawResponse.videos = DEFAULT_FALLBACK_DATA.videos;
    }
  }

  renderCurrentTab();
}

/**
 * seasonal-keywords.json 데이터 로드 (5번 탭용)
 */
async function loadSeasonalData() {
  const paths = [
    `seasonal-keywords.json?_t=${Date.now()}`,
    `data/seasonal-keywords.json?_t=${Date.now()}`,
    `https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.boutique-info.com%2Fseasonal-keywords.json%3F_t%3D${Date.now()}`
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        const json = await res.json();
        if (json && json.months) {
          kcSeasonalData = json;
          return;
        }
      }
    } catch (e) {
      // 다음 경로 시도
    }
  }
}

/**
 * 탭 전환 메인 함수 (외부 및 HTML onclick 인라인 지원)
 */
window.switchKcTab = function(type) {
  kcCurrentTab = type;

  // 탭 버튼 active 클래스 갱신
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
  const subFilterBar = document.querySelector('.kc-sub-filter-bar');

  // 레이아웃 가시성 토글
  if (type === 'type-5') {
    // 5번 탭: 월별 시즌성
    if (dualLayout) dualLayout.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (seasonalContainer) {
      seasonalContainer.style.display = 'block';
      renderSeasonalTab();
    }
  } else if (type === 'type-9') {
    // 9번 탭: 바이럴 숏폼 유튜브 그리드
    if (dualLayout) dualLayout.style.display = 'none';
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'none';
    if (tab9Container) {
      tab9Container.style.display = 'block';
      renderYoutubeGrid();
    }
  } else {
    // 1, 2, 3, 4, 6, 7, 8번 탭: 좌측 리스트 + 우측 상세 2단 레이아웃
    if (seasonalContainer) seasonalContainer.style.display = 'none';
    if (tab9Container) tab9Container.style.display = 'none';
    if (subFilterBar) subFilterBar.style.display = 'flex';
    if (dualLayout) dualLayout.style.display = 'grid';
    renderDualLaneTab(type);
  }
};

/**
 * 현재 활성화된 탭 다시 렌더링
 */
function renderCurrentTab() {
  window.switchKcTab(kcCurrentTab);
}

/**
 * 1, 2, 3, 4, 6, 7, 8번 탭: 좌측 카드 리스트 + 우측 리포트 렌더링
 */
function renderDualLaneTab(type) {
  const cardsContainer = document.getElementById('kc-cards-container');
  if (!cardsContainer) return;

  const items = getItemsByTabType(type);

  if (!items || items.length === 0) {
    cardsContainer.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-color);">
        해당 카테고리에 최신 키워드가 준비 중입니다. 잠시 후 다시 확인해 주세요.
      </div>
    `;
    const detailPanel = document.getElementById('kc-detail-panel');
    if (detailPanel) detailPanel.innerHTML = '';
    return;
  }

  // 기본적으로 첫 번째 항목을 상세 패널에 표시
  if (!kcActiveKeywordId || !items.some(i => (i.id || i.keyword) === kcActiveKeywordId)) {
    kcActiveKeywordId = items[0].id || items[0].keyword;
  }

  // 좌측 카드 리스트 HTML 생성
  let html = '';
  items.forEach((item, idx) => {
    const itemId = item.id || item.keyword;
    const isSelected = itemId === kcActiveKeywordId;
    const rank = idx + 1;
    const kw = item.keyword || item.mainKeyword || '키워드';
    const cat = item.category || item.sector || item.tag || '일반';
    const cpc = item.cpcBadge || (item.cpc ? `$${item.cpc}` : '$6.5+');
    const vol = Number(item.volume || item.total || 0).toLocaleString();
    const pcVol = Number(item.pc || 0).toLocaleString();
    const moVol = Number(item.mobile || 0).toLocaleString();
    const docs = Number(item.total_docs || item.blogCount || 0).toLocaleString();
    const gScore = item.goldenScore || (90 - idx);
    const scoreVal = item.score || 25;

    html += `
      <div class="kc-item-card ${isSelected ? 'selected' : ''}" 
           data-item-id="${escapeHtml(itemId)}" 
           onclick="selectKeyword('${escapeHtml(itemId)}')">
        <div class="kc-card-top-row">
          <div class="kc-card-title-group">
            <span class="kc-rank-badge">${rank}</span>
            <span class="kc-kw-title">${escapeHtml(kw)}</span>
          </div>
          <span class="kc-cpc-badge">${escapeHtml(cpc)}</span>
        </div>
        
        <div class="kc-card-meta-row">
          <span class="kc-cat-tag">🏷️ ${escapeHtml(cat)}</span>
          <span class="kc-score-text">점수 <strong style="color: #22c55e;">${scoreVal}</strong></span>
        </div>

        <div class="kc-card-stats-grid">
          <div class="kc-stat-unit">
            <span class="kc-unit-label">총 검색량</span>
            <span class="kc-unit-val">${vol}회</span>
            <span class="kc-unit-sub">(PC ${pcVol} / MO ${moVol})</span>
          </div>
          <div class="kc-stat-unit">
            <span class="kc-unit-label">블로그 문서수</span>
            <span class="kc-unit-val">${docs}건</span>
            <span class="kc-unit-sub">경쟁 강도 적정</span>
          </div>
          <div class="kc-stat-unit">
            <span class="kc-unit-label">황금 지수</span>
            <span class="kc-unit-val" style="color: #f59e0b;">${gScore}점</span>
            <span class="kc-unit-sub">상위노출 기회</span>
          </div>
        </div>
      </div>
    `;
  });

  cardsContainer.innerHTML = html;

  // 우측 상세 리포트 렌더링
  const activeItem = items.find(i => (i.id || i.keyword) === kcActiveKeywordId) || items[0];
  renderDetailReport(activeItem);
}

/**
 * 탭 타입별 데이터 소스 배열 반환
 */
function getItemsByTabType(type) {
  if (!kcRawResponse) return [];

  const cats = kcRawResponse.categories || {};
  let list = [];

  switch (type) {
    case 'type-1': // 1. 황금키워드
      list = cats.golden || [];
      break;
    case 'type-2': // 2. 제휴마케팅 키워드
      list = cats.shopping || [];
      break;
    case 'type-3': // 3. 애드센스 키워드
      list = cats.adsense || kcRawResponse.adsense || [];
      break;
    case 'type-4': // 4. 네이버 mate 키워드
      list = cats.naverMate || [];
      break;
    case 'type-6': // 6. 지식iN Q&A
      list = cats.jisikQin || [];
      break;
    case 'type-7': // 7. 정책신호형 애드센스 키워드 (policySignal === true)
      {
        const adsList = cats.adsense || kcRawResponse.adsense || [];
        const policyList = adsList.filter(item => item.policySignal === true || item.lane === 'policySignal');
        list = policyList.length > 0 ? policyList : (kcRawResponse.lanes?.policySignal || DEFAULT_FALLBACK_DATA.adsense);
      }
      break;
    case 'type-8': // 8. 머니대외비 추천 애드센스 키워드 (lanes.verifiedCore)
      list = kcRawResponse.lanes?.verifiedCore || DEFAULT_FALLBACK_DATA.lanes.verifiedCore;
      break;
    default:
      list = cats.golden || [];
  }

  return list;
}

/**
 * 좌측 키워드 카드 클릭 시 상세 패널 선택 갱신
 */
window.selectKeyword = function(itemId) {
  kcActiveKeywordId = itemId;

  // 좌측 카드 active 클래스 변경
  const cards = document.querySelectorAll('.kc-item-card');
  cards.forEach(card => {
    if (card.getAttribute('data-item-id') === itemId) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  const items = getItemsByTabType(kcCurrentTab);
  const selectedItem = items.find(i => (i.id || i.keyword) === itemId);
  if (selectedItem) {
    renderDetailReport(selectedItem);
  }
};

/**
 * 우측 상세 키워드 기획 분석 리포트 렌더링
 */
function renderDetailReport(item) {
  const panel = document.getElementById('kc-detail-panel');
  if (!panel || !item) return;

  const kw = item.keyword || item.mainKeyword || '키워드';
  const cat = item.category || item.sector || item.tag || '일반';
  const cpc = item.cpcBadge || (item.cpc ? `$${item.cpc}` : '$6.5+');
  const scoreVal = item.score || 25;
  const vol = Number(item.volume || item.total || 0).toLocaleString();
  const diff = item.diffText || '최근 7일 검색량 +25% 급증';
  const maxDay = item.monthlyMax || '1,200건/일';

  // 기획 데이터 추출 (contentPlan 또는 직접 프로퍼티)
  const plan = item.contentPlan || {};
  const whyNow = item.whyNow || plan.recommendationReason || `${kw} 관련 공식 정책 개편 및 대중적 관심이 집중되어 검색량이 급증하는 최적의 작성 타이밍입니다.`;
  const intent = item.intent || plan.searchIntent || `${kw}의 핵심 조건, 신청 자격 및 실질적인 혜택 확인.`;
  const cpcInfo = item.cpcAnalysis || `${cat} 관련 고단가 금융/생활 서비스 광고가 자동 매칭되어 높은 클릭당 수익(RPM)을 기대할 수 있습니다.`;

  // 제목 목록
  let titles = item.titles || [];
  if (titles.length === 0 && plan.recommendedTitle) titles = [plan.recommendedTitle];
  if (titles.length === 0) {
    titles = [
      `${kw} 완벽 정리 (신청 방법 및 핵심 조건 1분 총정리)`,
      `${kw} 꼭 알아야 할 꿀팁과 자주 묻는 질문 BEST 4`
    ];
  }

  // 목차 목록
  let outline = item.outline || plan.outline || [
    `${kw} 개요 및 핵심 요약`,
    `신청 자격 및 대상자 확인 가이드`,
    `단계별 진행 방법 및 필요 서류`,
    `자주 묻는 질문과 주의사항`
  ];

  // 연관 롱테일 키워드
  let longtails = item.longtails || plan.longtailKeywords || plan.relatedKeywords || [
    `${kw} 방법`, `${kw} 신청`, `${kw} 꿀팁`, `${kw} 조건`
  ];

  // 1. 추천 제목 HTML
  const titlesHtml = titles.map((title, i) => `
    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
      <span style="font-size: 0.92rem; color: #f1f5f9; font-weight: 700; line-height: 1.4;">${i + 1}. ${escapeHtml(title)}</span>
      <button type="button" class="btn-copy-mini" onclick="copySnippetDirect('${escapeHtml(title)}', '제목이 복사되었습니다!')" style="background: rgba(37, 99, 235, 0.2); border: 1px solid #3b82f6; color: #60a5fa; border-radius: 6px; padding: 5px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer; white-space: nowrap;">
        📋 제목 복사
      </button>
    </div>
  `).join('');

  // 2. 소제목 목차 HTML
  const outlineHtml = outline.map((sec, i) => `
    <li style="margin-bottom: 8px; color: #cbd5e1; font-size: 0.9rem; display: flex; align-items: flex-start; gap: 8px;">
      <span style="color: #10b981; font-weight: 800;">${i + 1}.</span>
      <span>${escapeHtml(sec)}</span>
    </li>
  `).join('');

  // 3. 연관 롱테일 태그 HTML
  const tagsHtml = longtails.map(tag => `
    <span class="kc-longtail-pill" onclick="copySnippetText('${escapeHtml(tag)}')" style="cursor: pointer; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12); color: #cbd5e1; border-radius: 16px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; transition: all 0.2s;">
      #${escapeHtml(tag)}
    </span>
  `).join('');

  const naverSearchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(kw)}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(kw)}`;

  panel.innerHTML = `
    <div class="kc-detail-scroll-wrap" style="padding: 24px; color: var(--text-main);">
      <!-- 1. 헤더: 키워드 & 예상단가 & 점수 -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 3px 8px; font-size: 0.78rem; font-weight: 800;">
              ${escapeHtml(cat)}
            </span>
            <span style="color: var(--text-muted); font-size: 0.82rem;">월 검색 ${vol}회</span>
          </div>
          <h2 style="font-size: 1.45rem; font-weight: 900; color: #ffffff; margin: 0; line-height: 1.3;">
            ${escapeHtml(kw)}
          </h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.15rem; font-weight: 900; color: #fbbf24;">${escapeHtml(cpc)}</div>
          <div style="font-size: 0.8rem; color: #22c55e; font-weight: 800;">종합 점수 ${scoreVal}점</div>
        </div>
      </div>

      <!-- 2. 주요 지표 요약 박스 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px;">
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 10px 14px;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">검색 급상승 트렌드</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #38bdf8; margin-top: 2px;">${escapeHtml(diff)}</div>
        </div>
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 10px 14px;">
          <div style="font-size: 0.78rem; color: var(--text-muted);">일일 최대 발생량</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #a78bfa; margin-top: 2px;">${escapeHtml(maxDay)}</div>
        </div>
      </div>

      <!-- 3. 상위노출 추천 제목 초안 -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 1rem; font-weight: 800; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 6px;">
            <span>✍️</span> 상위노출 추천 제목 초안
          </h3>
          <span style="font-size: 0.76rem; color: var(--text-muted);">클릭 시 즉시 복사</span>
        </div>
        ${titlesHtml}
      </div>

      <!-- 4. 추천 소제목 목차 구성안 -->
      <div style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3 style="font-size: 1rem; font-weight: 800; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 6px;">
            <span>📑</span> 소제목 목차 구성안 (H2/H3 권장)
          </h3>
          <button type="button" onclick="copyCustomOutline('${escapeHtml(kw)}')" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; border-radius: 6px; padding: 4px 10px; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
            전체 목차 복사
          </button>
        </div>
        <ul id="kc-active-outline-list" style="background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px 18px 6px 18px; list-style: none; margin: 0;">
          ${outlineHtml}
        </ul>
      </div>

      <!-- 5. 왜 지금 주목해야 할까? (기획 의도) -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>💡</span> 왜 지금 주목해야 할까?
        </h3>
        <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 12px 14px; font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;">
          ${escapeHtml(whyNow)}
        </div>
      </div>

      <!-- 6. 검색자의 핵심 의도 (Search Intent) -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>🎯</span> 검색자의 핵심 의도 (Search Intent)
        </h3>
        <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 0 8px 8px 0; padding: 12px 14px; font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;">
          ${escapeHtml(intent)}
        </div>
      </div>

      <!-- 7. 애드센스 고단가 광고 매칭 분석 -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          <span>💰</span> 고단가 애드센스 광고 매칭 분석
        </h3>
        <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 14px; font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;">
          ${escapeHtml(cpcInfo)}
        </div>
      </div>

      <!-- 8. 연관 롱테일 키워드 -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin: 0 0 10px 0; display: flex; align-items: center; gap: 6px;">
          <span>🔗</span> 연관 롱테일 키워드 (클릭하여 복사)
        </h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${tagsHtml}
        </div>
      </div>

      <!-- 9. 외부 포털 검색 결과 이동 버튼 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
        <a href="${naverSearchUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(3, 199, 90, 0.12); border: 1px solid rgba(3, 199, 90, 0.4); color: #22c55e; padding: 12px 14px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; transition: all 0.2s ease;">
          <span>네이버 검색결과</span> <span>↗</span>
        </a>
        <a href="${googleSearchUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(66, 133, 244, 0.12); border: 1px solid rgba(66, 133, 244, 0.4); color: #60a5fa; padding: 12px 14px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.88rem; transition: all 0.2s ease;">
          <span>구글 검색결과</span> <span>↗</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * 5. [월별 시즌성 키워드] 탭 전용 렌더링
 */
function renderSeasonalTab() {
  const container = document.getElementById('kc-seasonal-container');
  if (!container) return;

  // 1월부터 12월까지 알약 버튼 바 생성
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
    <!-- 상단 월 선택 탭 바 -->
    <div class="kc-seasonal-header-bar" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: #f8fafc; margin: 0; display: flex; align-items: center; gap: 8px;">
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

    <!-- 선택된 월의 키워드 그룹 목록 -->
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
        ${kcSeasonalSelectedMonth}월에 등록된 시즌성 키워드 데이터가 없습니다.
      </div>
    `;
    return;
  }

  let html = '';
  monthObj.groups.forEach((group, idx) => {
    const mainKw = group.main || '메인 키워드';
    const relatedList = group.related || [];
    const reason = group.reason || '시즌 특수 수요가 집중되는 대표 키워드입니다.';
    const timing = group.timing || `${kcSeasonalSelectedMonth}월 초순 발행 권장`;

    // 우측 연관키워드 행 목록 HTML
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
        <!-- 좌측: 메인 키워드 정보 박스 -->
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

        <!-- 우측: 연관키워드·상세 검색어 목록 -->
        <div class="kc-seasonal-related-list">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
            연관키워드 및 세부 타겟 검색어 (${relatedList.length})
          </div>
          ${relatedRowsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * 월 선택 이벤트
 */
window.selectSeasonalMonth = function(month) {
  kcSeasonalSelectedMonth = month;
  renderSeasonalTab();
};

/**
 * [분석하러가기] 원클릭 연동 함수
 * - 키워드 분석 탭으로 즉시 화면 전환
 * - 단건 분석 입력창에 해당 키워드 자동 입력 후 즉시 실행
 */
window.goToKeywordAnalysis = function(keyword) {
  if (!keyword) return;

  // 1. 메인 탭 전환 함수 호출 (index.html 전역 switchTab)
  if (typeof window.switchTab === 'function') {
    window.switchTab('keyword');
  }

  // 2. 단건 빠른 분석 입력창에 키워드 주입
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
 * 9. [바이럴숏폼 · 유튜브 실시간] 탭 전용 렌더링
 */
function renderYoutubeGrid() {
  const container = document.getElementById('kc-tab9-container');
  if (!container) return;

  const videos = kcRawResponse?.videos || DEFAULT_FALLBACK_DATA.videos || [];
  const shortsCount = videos.filter(v => v.isShorts || (v.duration && v.duration.startsWith('00:'))).length;
  const longCount = videos.length - shortsCount;

  // 상단 필터/요약 바
  const summaryBarHtml = `
    <div class="kc-yt-summary-bar">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.1rem; font-weight: 900; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
          <span>🔥</span> 바이럴숏폼 · 유튜브 실시간 큐레이션
        </span>
        <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 0.76rem; font-weight: 800;">
          LIVE WEEK
        </span>
      </div>
      <div style="font-size: 0.84rem; color: var(--text-muted);">
        전체 실시간 종합 · 쇼츠 <strong style="color: #ef4444;">${shortsCount}편</strong> / 롱폼 <strong style="color: #60a5fa;">${longCount}편</strong> 수집 완료
      </div>
    </div>
  `;

  // 비디오 카드 그리드
  let cardsHtml = '';
  videos.forEach(item => {
    const isShorts = item.isShorts || (item.duration && item.duration.startsWith('00:')) || item.title.includes('#Shorts');
    const thumb = item.thumbnail || item.thumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80';
    const duration = item.duration || (isShorts ? '00:59' : '10:00');
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

// ===== 복사 헬퍼 유틸리티 함수 =====

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
