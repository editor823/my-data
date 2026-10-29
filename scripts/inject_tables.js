const fs = require('fs');
const path = require('path');

const postsDir = 'c:/Users/edite/Desktop/my-local-info_n/src/content/posts';

const tableData = {
  '2026-08-15-earned-income-tax-credit.md': {
    target: '단독·홑벌이·맞벌이 가구 중 소득 및 재산(2.4억 원 미만) 요건 충족 가구',
    benefit: '근로장려금 최대 330만 원, 자녀장려금 자녀 1인당 최대 100만 원 지급',
    apply: '국세청 홈택스·손택스 앱 신청 또는 노원·도봉세무서 방문 신청',
    inquiry: '국세상담센터 ☎ 126 / 노원세무서 ☎ 02-950-8200'
  },
  '2026-08-15-hf-monthly-rent-guarantee.md': {
    target: '만 19세~39세 무주택 청년 및 연소득 5천만 원 이하 서민 가구',
    benefit: '월세 대출금의 90% 보증(최대 1,200만 원) 및 최저 1%대 저금리 이차보전',
    apply: '시중 취급은행(KB, 신한, 우리, 하나 등) 방문 또는 은행 모바일 앱',
    inquiry: '한국주택금융공사 콜센터 ☎ 1688-8114 / 서울주거포털'
  },
  '2026-08-15-preschool-tuition-support.md': {
    target: '국공립·사립 유치원 및 어린이집에 재원 중인 만 3~5세 유아',
    benefit: '국공립 월 15만 원, 사립 유치원 월 35만 원 상당 학비·보육료 바우처 전액 지원',
    apply: '복지로(bokjiro.go.kr) 온라인 신청 또는 주소지 동주민센터 방문',
    inquiry: '에듀콜 ☎ 1544-0079 / 보건복지상담센터 ☎ 129'
  },
  '2026-09-13-nowon-safety-insurance.md': {
    target: '노원구에 주민등록을 둔 모든 구민 (등록외국인 포함, 별도 가입 절차 불요)',
    benefit: '대중교통사고, 화재·폭발, 스쿨존 사고 등 최대 2,000만 원 한도 보상',
    apply: '사고 발생일로부터 3년 이내 통합보험사 전용 창구 청구',
    inquiry: '노원구청 스마트도시안전과 ☎ 02-2116-4447 / 보험 청구센터'
  },
  '2026-10-11-nowon-longevity-grant.md': {
    target: '노원구 1년 이상 연속 거주 만 95세 및 만 100세 도달 어르신',
    benefit: '만 95세 50만 원, 만 100세 100만 원 (일시금 계좌 입금)',
    apply: '생일이 속한 달부터 관할 동주민센터 방문 신청 (대리 신청 가능)',
    inquiry: '노원구청 어르신복지과 ☎ 02-2116-3755 / 동주민센터'
  },
  'dobong-dobongsan-festival.md': {
    target: '도봉구민 및 서울·경기 등 도봉산 방문객 누구나 (무료 관람)',
    benefit: '도봉산 단풍 페스티벌, 창포원 야간 등축제, 숲속 힐링 버스킹 및 플리마켓',
    apply: '별도 사전 신청 불요 (현장 무료 자율 참여)',
    inquiry: '도봉구청 문화관광과 ☎ 02-2091-2253 / 도봉문화재단'
  },
  'dobong-senior-support.md': {
    target: '도봉구 관내 만 65세 이상 기초수급·차상위 독거노인 및 돌봄 필요 어르신',
    benefit: 'AI 안부확인 전화, 생활지원사 1:1 방문 돌봄, 밑반찬·생필품 정기 지원',
    apply: '거주지 동주민센터 방문 또는 복지플래너 가정방문 상담',
    inquiry: '도봉구청 어르신장애인과 ☎ 02-2091-3062 / 동주민센터 복지팀'
  },
  'gangbuk-419-revolution-festival.md': {
    target: '강북구민, 청소년, 전국 방문객 누구나 (전 행사 무료 참여)',
    benefit: '4·19 락페스티벌, 전국 학생 미술대회, 민주묘지 참배 및 역사 체험 부스',
    apply: '현장 자유 관람 (단, 학술·경연대회는 공식 홈페이지 사전 접수)',
    inquiry: '강북구청 문화관광체육과 ☎ 02-901-6205 / 4·19문화제 위원회'
  },
  'gangbuk-maternal-health-support.md': {
    target: '강북구 거주 임산부, 가임기 여성, 영유아(출산 후 1년 이내)',
    benefit: '엽산제·철분제 무료 지급, 기형아 무료 검사, 산후도우미 본인부담금 차등 지원',
    apply: '강북구보건소 2층 모자보건실 방문 등록 또는 서울시 임신출산정보센터',
    inquiry: '강북구보건소 지역보건과 ☎ 02-901-7763'
  },
  'gangbuk-pay-local-currency.md': {
    target: '서울페이플러스(Seoul Pay+) 앱 가입자 누구나 (지역 무관 구매 가능)',
    benefit: '강북사랑상품권 5% 할인 구매(월 50만 원 한도) + 연말정산 소득공제 30%',
    apply: '서울페이플러스 앱에서 모바일 발행일 즉시 충전·구매',
    inquiry: '서울페이 고객센터 ☎ 1544-7772 / 강북구청 일자리청년과 ☎ 02-901-6453'
  },
  'gangbuk-scholarship-support.md': {
    target: '강북구 1년 이상 거주 구민 또는 자녀(고등학생·대학생, 성적우수 및 저소득)',
    benefit: '고등학생 수업료 상당액, 대학생 1인당 최대 200만 원~300만 원 장학금',
    apply: '강북구청 홈페이지 공고 확인 후 주소지 동주민센터 서류 접수',
    inquiry: '강북구장학재단 / 강북구청 교육지원과 ☎ 02-901-6302'
  },
  'gangbuk-senior-walker-support.md': {
    target: '강북구 거주 만 65세 이상 노인성 질환으로 보행이 불편한 어르신(기초수급·차상위)',
    benefit: '성인용 보행기(실버카) 구입비 1인당 최대 20만 원 범위 내 100% 실비 지원',
    apply: '의사 소견서 지참 후 거주지 관할 동주민센터 복지팀 방문 신청',
    inquiry: '강북구청 어르신복지과 ☎ 02-901-6714 / 각 동주민센터'
  },
  'gangbuk-uicheon-cherry-blossom.md': {
    target: '강북·도봉 구민 및 서울 시민 누구나 (자유 관람)',
    benefit: '우이천 벚꽃길 경관조명 점등, 수변 버스킹 공연, 벼룩시장, 푸드트럭',
    apply: '사전 예약 없이 현장 무료 자유 관람',
    inquiry: '강북구청 문화관광체육과 ☎ 02-901-6202'
  },
  'gangbuk-veterans-support.md': {
    target: '사망일 기준 강북구에 주민등록을 둔 국가보훈대상자의 유족',
    benefit: '사망위로금 20만 원 일시금 지급 (신청인 계좌 입금)',
    apply: '사망일로부터 1년 이내 관할 동주민센터 방문 신청',
    inquiry: '강북구청 복지정책과 ☎ 02-901-6644 / 동주민센터 복지팀'
  },
  'nowon-light-garden-walk.md': {
    target: '노원구민 및 서울 시민 누구나 (365일 연중무휴 무료 관람)',
    benefit: '옛 화랑대역 경춘선숲길 야간 라이팅 쇼, 기차카페, 미니어처 박물관',
    apply: '예약 없이 일몰 30분 전부터 자율 입장 (입장료 무료)',
    inquiry: '화랑대철도공원 안내센터 ☎ 02-2116-3777 / 노원구청 여가도시과'
  },
  'nowon-mask-street-festival.md': {
    target: '노원구민 및 축제 참여를 원하는 전국 시민 누구나',
    benefit: '노해로 차 없는 거리 대규모 퍼레이드, 댄스 경연, 전국 수제맥주 시음 및 푸드존',
    apply: '자유 현장 참여 (탈 경연대회 등 일부는 노원문화재단 사전 접수)',
    inquiry: '노원문화재단 ☎ 02-2289-3465 / 노원구청 문화도시과'
  },
  'nowon-north-korean-defectors-support.md': {
    target: '노원구 거주 북한이탈주민 본인(직업훈련) 및 학령기 자녀(방문학습)',
    benefit: '직업훈련 교육비(1인당 수강료 지원) + 자녀 1:1 방문학습지 전액 무상',
    apply: '노원구청 복지정책과 방문 또는 관할 동주민센터 신청',
    inquiry: '노원구청 복지정책과 ☎ 02-2116-3665 / 북한이탈주민 정착지원센터'
  }
};

let updatedCount = 0;

for (const [file, info] of Object.entries(tableData)) {
  const filePath = path.join(postsDir, file);
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', file);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // 표 텍스트 구성
  const isFestival = file.includes('festival') || file.includes('walk') || file.includes('cherry');
  const tableTitle = isFestival ? '### 📌 행사 및 축제 핵심 요약' : '### 📌 핵심 혜택 및 신청 정보 한눈에 보기';
  const targetHeader = isFestival ? '참여 대상' : '지원 대상';
  const benefitHeader = isFestival ? '주요 프로그램/혜택' : '지원 내용/혜택';
  const applyHeader = isFestival ? '일정 및 참여방법' : '신청 기간/방법';
  const inquiryHeader = isFestival ? '주최 및 문의처' : '접수 및 문의처';

  const tableMarkdown = `\n${tableTitle}

| 구분 | 상세 내용 |
| :--- | :--- |
| **${targetHeader}** | ${info.target} |
| **${benefitHeader}** | ${info.benefit} |
| **${applyHeader}** | ${info.apply} |
| **${inquiryHeader}** | ${info.inquiry} |
\n`;

  // 첫 번째 '---' (frontmatter 끝) 이후의 첫 번째 본문 문단 뒤 또는 첫 소제목 앞에 삽입
  const parts = content.split('---');
  if (parts.length >= 3) {
    // parts[0] is empty, parts[1] is frontmatter, parts[2] is body
    let body = parts.slice(2).join('---');
    
    // body의 첫 번째 문단 끝 또는 첫 번째 ### 앞에 넣기
    const h3Match = body.indexOf('###');
    if (h3Match !== -1) {
      body = body.slice(0, h3Match) + tableMarkdown + body.slice(h3Match);
    } else {
      body = tableMarkdown + body;
    }

    const newContent = `---${parts[1]}---${body}`;
    fs.writeFileSync(filePath, newContent, 'utf8');
    updatedCount++;
    console.log('Updated table in:', file);
  }
}

console.log('Total files updated with tables:', updatedCount);
