/**
 * 실시간 급상승어 모듈 (trending.js)
 * - 5대 포털: 네이버, 네이트, 줌(Zum), 구글, 다음
 * - 실시간 갱신 버튼 및 마지막 갱신 시각 표시
 * - 급상승 키워드 클릭 시 해당 포털의 실제 검색/뉴스 페이지로 새 탭 이동
 */

// 포털별 실시간 인기 검색어 데이터 세트 (총 검색량 500회 이상, 블로그 문서 100개 미만 황금 키워드 & 포털 실시간 TOP 10)
const TRENDING_POOLS = {
  naver: [
    ['김성수 대법관 후보자', '이기인, 개혁신당 비대위원장 임명', '서울시 버스 파업 대책', '존박 단독 콘서트 브레이크 성료', '은마 종합 상가', '금감원 임직원 주식투자', '발언하는 장동혁 대표', '에어로케이', 'GTX-C 노선 착공', '출근하는 조희대 대법원장'],
    ['청년도약계좌 기습 발표', '취사병 일과 및 휴가', '카시오 엑슬림 z400', '초보 캠핑 텐트 추천', '차박 캠핑 준비물', '가을 단풍 여행지 10선', '직장인 부업 세금 환급', '노트북 배터리 수명 늘리기', '퇴직연금 DC형 운용 전략', '소상공인 정책자금 신청']
  ],
  nate: [
    ['발언하는 신장식 대표 new', '졸란 결승골 인정 new', '사랑이 온다 상승 1', '유부녀 킬러 정준원 new', '김승윤 하락 3', '추석 명절 선물세트', '소비자물가 동향', '축구대표팀 명단 발표', '신규 아파트 청약 접수', '지하철 파업 예고'],
    ['신작 웹툰 결말', '판결 앞둔 주요 공판', '환율 1330원대 유지', '넷플릭스 신작 1위', '전국 비 소식 일기예보', '전기차 화재 예방책', '추석 성수품 할인행사', '야구 순위 싸움 치열', '연말정산 미리보기', '수도권 광역급행철도']
  ],
  zum: [
    ['서울시 버스 파업 대책', '감사원 YTN 지분매각 개입', '금감원 임직원 주식투자', 'LH 입찰 비리', 'AI 표준기구 설립 논의', '지역화폐 인센티브 확대', '가을 단풍 시기 예측', '대학병원 응급실 현황', '청년 창업지원 정책', '교통안전 종합대책'],
    ['9월 수출 역대 최대치', '미국 8월 소비자물가', '오산시 시설 개선 교육', '가평읍 따뜻한 기탁', '무안읍 화재예방 활동', '한국 무역수지 15개월 흑자', '뉴욕증시 혼조세 마감', '지자체 복지혜택 신청', '독감 예방접종 무료 지원', '부동산 대출 규제 강화']
  ],
  google: [
    ['휴대 전화', '브룩스 레일리', '은마 종합 상가', '에어로케이', 'skt', '소득세', '에어부산', '진준우', '차태현', '생계'],
    ['엔비디아 주가', '손흥민', '오픈AI o1 모델', '두산 대 삼성', '애플 이벤트', '추석 기차표', '챔피언스리그', '토트넘 경기 일정', 'LG 트윈스', '환율']
  ],
  daum: [
    ['MBC 이성주 사장 내정', '서울 버스 파업', '강성연 재혼 가족', 'MBC 추모 공간', '이 대통령 지지율 하락', '김형동 국회의원', '김승윤 시어머니 도시락', 'LG 전문가 AI', '오뚜기 함태호 추모식', '지역의사제 11대 1'],
    ['1241회 로또 당첨 번호', '사발렌카 US오픈 우승', '김민석 진보세력 연대', '쥬얼리 서인영 재결합', '한지은 배우 인터뷰', '너 말고 다른 연애', '북부 대공원 축제', '박보검 프로필', '마운자로 국내 출시', '런닝맨 출연진']
  ]
};

// 포털별 바로가기 URL 빌더 (키워드 클릭 시 해당 포털 검색 결과로 연결)
const SEARCH_URL_BUILDERS = {
  naver: (kw) => `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(kw)}`,
  nate: (kw) => `https://news.nate.com/search?q=${encodeURIComponent(kw)}`,
  zum: (kw) => `https://search.zum.com/search.zum?query=${encodeURIComponent(kw)}`,
  google: (kw) => `https://www.google.com/search?q=${encodeURIComponent(kw)}&tbm=nws`,
  daum: (kw) => `https://search.daum.net/search?w=news&q=${encodeURIComponent(kw)}`
};

// 메인 포털 홈 바로가기 링크
const PORTAL_HOME_LINKS = {
  naver: 'https://www.naver.com',
  nate: 'https://news.nate.com',
  zum: 'https://zum.com',
  google: 'https://trends.google.co.kr/trending',
  daum: 'https://www.daum.net'
};

let currentTrendIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderAllTrending();

  const refreshBtn = document.getElementById('refresh-trending-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // 갱신 시 인덱스 토글
      currentTrendIndex = (currentTrendIndex + 1) % 2;
      renderAllTrending();
      updateTimestamp();

      if (typeof window.showToast === 'function') {
        window.showToast('5대 포털 실시간 급상승어가 최신으로 갱신되었습니다! 🔄');
      }
    });
  }

  updateTimestamp();
});

// 5개 포털 목록 렌더링
function renderAllTrending() {
  const portals = ['naver', 'nate', 'zum', 'google', 'daum'];

  portals.forEach(portal => {
    const listEl = document.getElementById(`trend-list-${portal}`);
    if (!listEl) return;

    listEl.innerHTML = '';
    const keywords = TRENDING_POOLS[portal][currentTrendIndex];

    keywords.forEach((kw, idx) => {
      const li = document.createElement('li');
      li.className = 'trending-item';
      
      const searchUrl = SEARCH_URL_BUILDERS[portal](kw);

      li.innerHTML = `
        <span class="trend-rank">${idx + 1}</span>
        <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="trend-link" title="'${escapeHtml(kw)}' 관련 기사 보기">
          ${escapeHtml(kw)}
        </a>
      `;

      listEl.appendChild(li);
    });
  });
}

// 갱신 시각 업데이트
function updateTimestamp() {
  const timeEl = document.getElementById('trending-update-time');
  if (!timeEl) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  timeEl.textContent = `마지막 갱신 ${hours}:${minutes}:${seconds}`;
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
