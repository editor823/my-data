/**
 * 테마 분류기 및 타임라인 파이프라인 엔진 (scripts/theme_classifier.js)
 * 
 * [초보자 설명서]
 * - 이 스크립트는 실시간 수집된 뉴스 기사를 하나씩 읽어서 어떤 주식 테마(HBM, 비만치료제, 원전 등)에 해당하는지 자동으로 분류합니다.
 * - 분류된 뉴스는 '4번 탭(당일 주도 테마)'의 점수(theme_score)를 계산하고,
 * - '2번 탭(주간/월간 재료 타임라인)'에 날짜별로 차곡차곡 누적(Append)하여 data/theme_timeline.json에 저장합니다.
 */

const fs = require('fs');
const path = require('path');

// 0. 상위 테마(큰 키워드)와 하위 종목군(작은 키워드) 계층형 룰셋
const THEME_STOCK_MAP = {
  "방산": ["한화에어로스페이스", "한화시스템", "LIG넥스원", "현대로템", "한국항공우주"],
  "로봇": ["레인보우로보틱스", "두산로보틱스", "뉴로메카", "에스비비테크", "엔젤로보틱스"],
  "원전": ["두산에너빌리티", "우진엔텍", "한신기계", "일진파워", "비에이치아이"],
  "반도체": ["SK하이닉스", "와이씨", "에프에스티", "필옵틱스", "오픈엣지테크놀로지"],
  "바이오": ["삼천당제약", "인벤티지랩", "디앤디파마텍", "펩트론", "알테오젠"]
};

// 1. 테마 키워드 룰셋 사전 정의
const THEME_RULES = [
  {
    theme_id: 'hbm_glass',
    theme_name: '차세대 HBM4 & 유리기판',
    category: '반도체/AI',
    keywords: ['HBM', 'HBM4', '유리기판', '패키징', 'CXL', '온디바이스', '검사장비', '와이씨', '필옵틱스', 'SK하이닉스', '루빈', '블랙웰'],
    default_rate: '+8.45%',
    default_volume: '1조 8,400억',
    lead_stocks: ['SK하이닉스', '와이씨', '에프에스티', '필옵틱스'],
    today_reason: '엔비디아 차세대 AI 가속기 로드맵 가속화 및 유리기판/HBM4 장비 공급망 수급 집중',
    base_score: 94
  },
  {
    theme_id: 'glp1_bio',
    theme_name: '비만치료제 GLP-1 & 경구용 펩타이드',
    category: '바이오/제약',
    keywords: ['GLP-1', '비만치료제', '펩타이드', '임상', '기술수출', '위고비', '젭바운드', '삼천당제약', '인벤티지랩', '디앤디파마텍', '펩트론', '경구용'],
    default_rate: '+6.12%',
    default_volume: '9,200억',
    lead_stocks: ['삼천당제약', '인벤티지랩', '디앤디파마텍', '펩트론'],
    today_reason: '글로벌 제약사 기술수출 본계약 협상 및 주사제가 아닌 먹는 비만약(경구용) 상용화 기대감 고조',
    base_score: 91
  },
  {
    theme_id: 'smr_nuclear',
    theme_name: '체코 30조 원전 & 소형 SMR/전력망',
    category: '정책/원전/전력',
    keywords: ['원전', 'SMR', '변압기', '송전망', '전력인프라', '체코', '두산에너빌리티', '우진엔텍', '한신기계', '일진파워', '전력'],
    default_rate: '+4.85%',
    default_volume: '7,600억',
    lead_stocks: ['두산에너빌리티', '한신기계', '우진엔텍', '일진파워'],
    today_reason: '체코 두코바니 30조 원전 10월 본계약 기대감 및 AI 데이터센터 전력난 해소용 SMR 수요 폭증',
    base_score: 88
  },
  {
    theme_id: 'robot_ai',
    theme_name: '로봇용 액추에이터 & 피지컬 AI',
    category: '로봇/AI',
    keywords: ['로봇', '감속기', '액추에이터', '휴머노이드', '옵티머스', '보핏', '에스피지', '레인보우로보틱스', '로보티즈', '두산로보틱스'],
    default_rate: '+3.90%',
    default_volume: '5,400억',
    lead_stocks: ['레인보우로보틱스', '에스피지', '로보티즈', '두산로보틱스'],
    today_reason: '빅테크 제조 라인 내 휴머노이드 투입 및 정밀 감속기 부품 국산화 양산 납품 본격화',
    base_score: 85
  },
  {
    theme_id: 'battery_solid',
    theme_name: '2차전지 전고체 & 실리콘 음극재',
    category: '2차전지/소재',
    keywords: ['2차전지', '배터리', '전고체', '음극재', '황화리튬', '양극재', '이수스페셜티', '이수스페셜티케미컬', '대주전자재료', '포스코홀딩스'],
    default_rate: '+3.40%',
    default_volume: '5,200억',
    lead_stocks: ['이수스페셜티케미컬', '레이크머티리얼즈', '대주전자재료', '포스코홀딩스'],
    today_reason: '꿈의 배터리 전고체 배터리 핵심 원료 고객사 납품 승인 및 차세대 음극재 채택 확대',
    base_score: 80
  },
  {
    theme_id: 'defense_k',
    theme_name: 'K-방산 수출 & 자주포/미사일',
    category: '방산/항공',
    keywords: ['방산', 'K9', '자주포', '전차', '천궁', '한화에어로', '한화에어로스페이스', '현대로템', 'LIG넥스원', '수출'],
    default_rate: '+2.80%',
    default_volume: '4,500억',
    lead_stocks: ['한화에어로스페이스', 'LIG넥스원', '현대로템', '한국항공우주'],
    today_reason: '루마니아·폴란드 후속 탄약운반차 및 전차 2차 실행계약 연내 체결 임박에 따른 수주 랠리',
    base_score: 83
  },
  {
    theme_id: 'valueup_finance',
    theme_name: '밸류업 지배구조 & 금융/지주사',
    category: '정책/금융',
    keywords: ['밸류업', '자사주', '소각', '주주환원', '배당', 'KB금융', '지주', '메리츠금융지주', '신한지주', '금융지주'],
    default_rate: '+2.10%',
    default_volume: '6,100억',
    lead_stocks: ['KB금융', '메리츠금융지주', '신한지주', '삼성물산'],
    today_reason: '한국거래소 9월 밸류업 지수 발표를 앞두고 고배당 금융 지주사로 연기금 매수세 집중',
    base_score: 82
  }
];

/**
 * 기사 텍스트(제목, 요약, 키워드)를 기반으로 테마를 감지하는 분류 함수
 * @param {Object} newsItem 뉴스 객체 { title, summary, keyword, ... }
 * @returns {Array} 매칭된 테마 룰 객체 배열
 */
function classifyNewsItem(newsItem) {
  const content = `${newsItem.title || ''} ${newsItem.summary || ''} ${newsItem.keyword || ''}`.toLowerCase();
  const matchedThemes = [];

  for (const rule of THEME_RULES) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (content.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      matchedThemes.push({
        rule,
        matchCount
      });
    }
  }

  // 매칭된 키워드 개수가 많은 순서대로 정렬
  matchedThemes.sort((a, b) => b.matchCount - a.matchCount);
  return matchedThemes.map(m => m.rule);
}

/**
 * 뉴스 기사의 영향도(상승 강도)를 판별하는 함수
 */
function determineImpact(newsItem) {
  const text = `${newsItem.tag || ''} ${newsItem.title || ''} ${newsItem.summary || ''}`;
  if (text.includes('폭등') || text.includes('상한가') || text.includes('급등') || text.includes('잭팟')) {
    return '강한 상승';
  } else if (text.includes('순매수') || text.includes('체결') || text.includes('신고가') || text.includes('승인')) {
    return '상승 모멘텀';
  } else if (text.includes('급락') || text.includes('하락') || text.includes('우려')) {
    return '단기 조정';
  }
  return '모멘텀 지속';
}

/**
 * 날짜 문자열(YYYY-MM-DD) 추출 헬퍼
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 기사 고유 식별자 키 생성 (중복 방지용: URL 우선, 없으면 정제된 제목)
 */
function getArticleUniqueKey(article) {
  if (article.news_url && article.news_url.trim() && article.news_url !== 'https://...') {
    return article.news_url.trim();
  }
  // URL이 없는 경우 제목 특수문자 제거 후 식별자로 사용
  return (article.news_title || article.title || '')
    .replace(/[^\w가-힣]/g, '')
    .trim();
}

/**
 * 핵심 파이프라인 함수: 수집된 뉴스 목록을 받아 테마별로 분류하고 data/theme_timeline.json에 누적 아카이빙
 * @param {Array} newsList 뉴스 객체 목록
 * @param {string} customDate 특정 날짜 지정 (옵션, 기본값 오늘 YYYY-MM-DD)
 * @returns {Object} 갱신된 타임라인 전체 데이터
 */
function processNewsAndArchiveTimeline(newsList = [], customDate = null) {
  const targetDate = customDate || getTodayDateString();
  const dataDir = path.join(__dirname, '..', 'data');
  const timelineFilePath = path.join(dataDir, 'theme_timeline.json');

  // data 디렉터리가 없으면 자동 생성
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. 기존 theme_timeline.json 읽기 (누적 보존)
  let timelineDb = {
    last_updated: new Date().toISOString(),
    themes: []
  };

  if (fs.existsSync(timelineFilePath)) {
    try {
      const raw = fs.readFileSync(timelineFilePath, 'utf8');
      timelineDb = JSON.parse(raw);
    } catch (e) {
      console.warn('⚠️ 기존 타임라인 JSON 파싱 실패, 신규 생성합니다:', e.message);
    }
  }

  // 기존 테마 목록을 빠른 조회를 위해 Map으로 인덱싱
  const themeMap = new Map();
  for (const t of (timelineDb.themes || [])) {
    themeMap.set(t.theme_id, t);
  }

  // 2. 전체 룰셋의 테마가 themeMap에 없으면 기본 구조 등록
  for (const rule of THEME_RULES) {
    if (!themeMap.has(rule.theme_id)) {
      themeMap.set(rule.theme_id, {
        theme_id: rule.theme_id,
        theme_name: rule.theme_name,
        category: rule.category,
        today_score: rule.base_score,
        today_change_rate: rule.default_rate,
        today_trading_volume: rule.default_volume,
        lead_stocks: rule.lead_stocks,
        today_reason: rule.today_reason,
        timeline: []
      });
    }
  }

  // 3. 테마별 오늘 언급 횟수 카운터
  const themeNewsCount = {};
  THEME_RULES.forEach(r => themeNewsCount[r.theme_id] = 0);

  // 4. 뉴스 목록 순회 및 테마 태깅 & 타임라인 누적
  let addedCount = 0;
  let skippedDuplicateCount = 0;

  for (const news of newsList) {
    const matchedRules = classifyNewsItem(news);
    if (!matchedRules.length) continue;

    // 가장 적합한 1순위 테마 선택
    const primaryRule = matchedRules[0];
    const themeObj = themeMap.get(primaryRule.theme_id);
    if (!themeObj) continue;

    themeNewsCount[primaryRule.theme_id] = (themeNewsCount[primaryRule.theme_id] || 0) + 1;

    // 신규 타임라인 기사 아이템 생성
    const title = (news.title || '').trim();
    const cleanTitle = title.replace(/\[.*?\]/g, '').trim();
    const newsUrl = news.url || news.news_url || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(cleanTitle || title)}`;
    const press = news.media || news.press || news.source || '증시속보';
    const impact = determineImpact(news);
    const targetStock = news.target_stock || news.stock || news.symbol || (primaryRule.lead_stocks && primaryRule.lead_stocks[0]) || '';

    const newArticle = {
      theme: primaryRule.theme_name || news.theme || '',
      target_stock: targetStock,
      date: targetDate,
      news_title: title,
      news_url: newsUrl,
      press: press,
      impact: impact
    };

    const newKey = getArticleUniqueKey(newArticle);

    // 중복 방지 검사: 해당 테마 타임라인 내 동일 URL 또는 동일 정제 제목이 있는지 확인
    const isAlreadyExists = themeObj.timeline.some(existing => {
      return getArticleUniqueKey(existing) === newKey;
    });

    if (isAlreadyExists) {
      skippedDuplicateCount++;
    } else {
      // 최신 날짜 역순으로 맨 앞(unshift)에 추가
      themeObj.timeline.unshift(newArticle);
      addedCount++;
    }
  }

  // 5. theme_score(테마 강도 점수) 계산 & 랭킹 재계산
  // 공식: 기본점수(base_score) + 당일 뉴스 언급량 가산점 (언급 건수당 +2점, 최대 100점)
  for (const rule of THEME_RULES) {
    const t = themeMap.get(rule.theme_id);
    if (!t) continue;
    const count = themeNewsCount[rule.theme_id] || 0;
    const dynamicScore = Math.min(100, rule.base_score + (count * 2));
    t.today_score = dynamicScore;

    // 타임라인을 날짜 최신순(내림차순)으로 최종 정렬
    t.timeline.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // 점수가 높은 순으로 정렬하여 당일 주도 테마 랭킹화
  const finalThemes = Array.from(themeMap.values()).sort((a, b) => b.today_score - a.today_score);

  timelineDb.last_updated = new Date().toISOString();
  timelineDb.themes = finalThemes;

  // 6. JSON 파일로 안전하게 쓰기
  fs.writeFileSync(timelineFilePath, JSON.stringify(timelineDb, null, 2), 'utf8');

  return {
    success: true,
    filePath: timelineFilePath,
    addedCount,
    skippedDuplicateCount,
    totalThemes: finalThemes.length,
    topTheme: finalThemes[0] ? `${finalThemes[0].theme_name} (${finalThemes[0].today_score}점)` : null
  };
}

/**
 * 네이버 뉴스 실시간 검색 헬퍼 (웹 스크랩 및 JSON 파싱)
 * @param {string} query 검색어 (예: '한화에어로스페이스' 또는 '방산')
 * @returns {Promise<Array>} 검색된 기사 목록 [{ title, url, press, date }]
 */
function fetchNaverNewsLive(query) {
  const https = require('https');
  return new Promise((resolve) => {
    const enc = encodeURIComponent(query);
    const options = {
      hostname: 'search.naver.com',
      path: '/search.naver?where=news&query=' + enc + '&sm=tab_opt&sort=1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    };

    https.get(options, res => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const marker = 'data-block-id="news/prs_template_v2_news_tab_desk.ts"';
        const blockIdx = html.indexOf(marker);
        if (blockIdx === -1) return resolve([]);
        const bootstrapIdx = html.indexOf('entry.bootstrap(', blockIdx);
        if (bootstrapIdx === -1) return resolve([]);
        const jsonStart = html.indexOf('{', bootstrapIdx);
        let depth = 0, end = -1, inString = false, escape = false;
        for (let i = jsonStart; i < html.length; i++) {
          const char = html[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') { depth--; if (depth === 0) { end = i; break; } }
          }
        }
        if (end === -1) return resolve([]);
        try {
          const data = JSON.parse(html.substring(jsonStart, end + 1));
          const rawItems = data.body?.props?.children?.[0]?.props?.children || [];
          const articles = [];
          for (const item of rawItems) {
            const p = item.props;
            if (!p) continue;
            const title = (p.title || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const url = p.titleHref || p.contentHref || '';
            const press = p.sourceProfile?.title || p.sourceProfile?.name || '언론사';
            if (title && url) {
              articles.push({
                title,
                url,
                press,
                date: getTodayDateString()
              });
            }
          }
          resolve(articles);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 2. 정밀 검색 & 필터링 파이프라인 (2단계 쿼리 로직)
 * - Step 1: 상위 테마 키워드(예: '방산')로 거시 뉴스/섹터 이슈 1차 수집
 * - Step 2: 매핑된 하위 개별 종목들을 단독 검색어로 각각 개별 검색
 * - Step 3: [핵심] 실제 기사가 검색된 종목만 선별하여 등록 (결과 없는 종목 제외)
 * - Step 4: 메타데이터 태깅 (theme, target_stock, title, url, date, press)
 * - Step 5: 중복 방지 및 data/theme_timeline.json 누적 아카이빙
 */
async function runHierarchicalStockNewsPipeline(customDate = null) {
  console.log(`[${new Date().toISOString()}] 🚀 계층형 정밀 뉴스 수집 파이프라인 시작...`);
  const collectedNews = [];

  for (const [themeName, stockList] of Object.entries(THEME_STOCK_MAP)) {
    console.log(`\n📌 [테마 수집] 상위 테마: '${themeName}' 거시 이슈 검색 중...`);
    // Step 1: 상위 테마 키워드로 거시 뉴스 수집
    const macroArticles = await fetchNaverNewsLive(themeName);
    for (const art of macroArticles.slice(0, 3)) {
      collectedNews.push({
        theme: themeName,
        target_stock: stockList[0] || themeName, // 대장주 매핑
        title: art.title,
        url: art.url,
        press: art.press,
        date: customDate || getTodayDateString()
      });
    }

    // Step 2 & Step 3: 하위 개별 종목들을 단독 검색어로 호출 및 실제 기사 존재하는 종목만 선별
    for (const stock of stockList) {
      const stockArticles = await fetchNaverNewsLive(stock);
      if (stockArticles && stockArticles.length > 0) {
        // Step 4: 메타데이터 태깅
        for (const art of stockArticles.slice(0, 2)) {
          collectedNews.push({
            theme: themeName,
            target_stock: stock,
            title: art.title,
            url: art.url,
            press: art.press,
            date: customDate || getTodayDateString()
          });
        }
        console.log(`  ✅ [종목 확인] '${stock}' 기사 ${stockArticles.length}건 발굴 -> 타임라인 등록 대상 포함`);
      } else {
        console.log(`  ⚪ [종목 제외] '${stock}' 당일 기사 없음 -> 더미 데이터 없이 제외`);
      }
    }
  }

  // Step 5: 타임라인 JSON에 중복 방지 적재
  const result = processNewsAndArchiveTimeline(collectedNews, customDate);
  console.log(`\n🎉 계층형 정밀 수집 완료: 총 ${collectedNews.length}건 기사 처리 -> 신규 ${result.addedCount}건 반영 (중복 제외 ${result.skippedDuplicateCount}건)`);
  return result;
}

// 모듈 내보내기 (Node.js & 브라우저 공용 호환)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    THEME_STOCK_MAP,
    THEME_RULES,
    classifyNewsItem,
    determineImpact,
    processNewsAndArchiveTimeline,
    fetchNaverNewsLive,
    runHierarchicalStockNewsPipeline,
    getTodayDateString
  };
}

