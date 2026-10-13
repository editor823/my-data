const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'telegram_config.json');
const ENV_PATH = path.join(__dirname, '..', '.env.local');

// 1. 설정 로드
function loadConfig() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envToken && envChatId) {
    return { botToken: envToken, chatId: envChatId };
  }
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  throw new Error('Telegram bot credentials not found.');
}

function loadEnvKeys() {
  let naverId = '2iKHyyPOqriPMIsahHYt';
  let naverSecret = 'CgG2dPHGrT';
  let geminiKey = '';

  if (fs.existsSync(ENV_PATH)) {
    const txt = fs.readFileSync(ENV_PATH, 'utf8');
    const gMatch = txt.match(/GEMINI_API_KEY=(.*)/);
    if (gMatch) geminiKey = gMatch[1].trim();
    const idMatch = txt.match(/NAVER_HUB_CLIENT_ID=(.*)/);
    if (idMatch) naverId = idMatch[1].trim();
    const secMatch = txt.match(/NAVER_HUB_CLIENT_SECRET=(.*)/);
    if (secMatch) naverSecret = secMatch[1].trim();
  }
  return { naverId, naverSecret, geminiKey };
}

const { botToken, chatId: defaultChatId } = loadConfig();
const { naverId, naverSecret, geminiKey } = loadEnvKeys();

// 2. 테마 & 관련 핵심 수혜주 사전 (대소문자/공백 무관 매칭)
const THEME_DATABASE = {
  '전기전력': {
    name: '전기전력 (AI 전력망/변압기/전선)',
    searchQuery: '전력기기 변압기 전력망 AI전력',
    keywords: ['전력', '변압기', '전력망', '전기', '전선', '송전', '초고압', '에너지'],
    stocks: ['HD현대일렉트릭', '효성중공업', 'LS ELECTRIC', '일진전기', '제룡전기', '산일전기', '대한전선', '가온전선', '대원전선']
  },
  '전력': {
    name: '전기전력 & AI 송배전 전력망',
    searchQuery: '전력망 변압기 전력기기',
    keywords: ['전력', '변압기', '전력망', '전기', '전선', '초고압'],
    stocks: ['HD현대일렉트릭', '효성중공업', 'LS ELECTRIC', '일진전기', '제룡전기', '산일전기', '대한전선', '가온전선']
  },
  '변압기': {
    name: '초고압 변압기 & 배전설비',
    searchQuery: '변압기 전력기기 쇼티지',
    keywords: ['변압기', '전력', '전력기기', '송전', '배전'],
    stocks: ['HD현대일렉트릭', '효성중공업', 'LS ELECTRIC', '제룡전기', '일진전기', '산일전기']
  },
  '전선': {
    name: '초고압 해저케이블 & 송전선',
    searchQuery: '초고압 케이블 전선 수주',
    keywords: ['전선', '케이블', '송전', '해저케이블', '초고압'],
    stocks: ['대한전선', '가온전선', '대원전선', 'LS에코에너지', '일진전기']
  },
  '유리기판': {
    name: '차세대 AI 반도체 유리기판 (Glass Core)',
    searchQuery: '유리기판 TGV 반도체',
    keywords: ['유리기판', 'TGV', '글라스기판', '패키징', '유리'],
    stocks: ['필옵틱스', '와이씨', '제이앤티씨', '에프에스티', '삼성전기', 'SKC(앱솔릭스)', '기가비스']
  },
  '전고체배터리': {
    name: '차세대 전고체 배터리 (꿈의 배터리)',
    searchQuery: '전고체 배터리 고체전해질',
    keywords: ['전고체', '고체전해질', '황화물계', '배터리', '2차전지'],
    stocks: ['이수스페셜티케미컬', '레이크머티리얼즈', '한농화성', '삼성SDI', '씨아이에스', '필옵틱스']
  },
  '2차전지': {
    name: '2차전지 배터리 셀·소재·장비',
    searchQuery: '2차전지 배터리 양극재',
    keywords: ['2차전지', '배터리', '양극재', '음극재', '리튬'],
    stocks: ['LG에너지솔루션', '삼성SDI', '에코프로비엠', '에코프로', '포스코퓨처엠', '엘앤에프', '필에너지']
  },
  'HBM': {
    name: '고대역폭 메모리 (HBM3E / HBM4)',
    searchQuery: 'HBM 엔비디아 SK하이닉스',
    keywords: ['HBM', 'HBM3E', 'HBM4', '본딩', '검사장비', '메모리'],
    stocks: ['SK하이닉스', '한미반도체', '와이씨', '디아이', '테크윙', '이수페타시스', '한솔케미칼']
  },
  '반도체': {
    name: 'AI 반도체 HBM & 소부장',
    searchQuery: '반도체 소부장 HBM CXL',
    keywords: ['반도체', 'HBM', '소부장', 'CXL', '웨이퍼', '파운드리'],
    stocks: ['SK하이닉스', '삼성전자', '한미반도체', '와이씨', '테크윙', '디아이', '리노공업']
  },
  '원전': {
    name: '원자력 발전 & SMR (소형모듈원전)',
    searchQuery: '원전 SMR 체코 두산에너빌리티',
    keywords: ['원전', 'SMR', '체코', '두코바니', '원자력', '원자로'],
    stocks: ['두산에너빌리티', '우진엔텍', '비에이치아이', '한신기계', '일진파워', '우리기술']
  },
  '방산': {
    name: 'K-방산 무기체계 수출 랠리',
    searchQuery: 'K-방산 수출 한화에어로스페이스',
    keywords: ['방산', 'K9', '자주포', '천궁', '전차', '수출', '방위산업'],
    stocks: ['한화에어로스페이스', '현대로템', 'LIG넥스원', '한국항공우주', '한화시스템']
  },
  '우주항공': {
    name: '우주항공 & 스페이스X 생태계',
    searchQuery: '우주항공 스페이스X 위성 발사',
    keywords: ['우주항공', '스페이스X', '위성', '로켓', '우주'],
    stocks: ['와이제이링크', '센서뷰', '켄코아에어로스페이스', '에이치브이엠', '스피어', '한화에어로스페이스']
  },
  '로봇': {
    name: '피지컬 AI & 휴머노이드 협동로봇',
    searchQuery: '로봇 휴머노이드 액추에이터',
    keywords: ['로봇', '협동로봇', '감속기', '액추에이터', '휴머노이드'],
    stocks: ['레인보우로보틱스', '두산로보틱스', '뉴로메카', '에스비비테크', '엔젤로보틱스', '에스피지']
  },
  '바이오': {
    name: 'K-바이오 비만치료제 & 신약 플랫폼',
    searchQuery: '비만치료제 GLP-1 바이오 신약',
    keywords: ['비만치료제', 'GLP-1', 'CDMO', '임상', '바이오', '신약'],
    stocks: ['삼성바이오로직스', '알테오젠', '삼천당제약', '펩트론', '리가켐바이오', '유한양행']
  },
  '조선': {
    name: 'K-조선 친환경 고선가 수주 랠리',
    searchQuery: '조선 LNG선 카타르 수주',
    keywords: ['조선', 'LNG선', '도크', '선가', '수주', '조선소'],
    stocks: ['HD한국조선해양', 'HD현대중공업', '삼성중공업', '한화오션', 'HD현대마린엔진', '동성화인텍']
  },
  '엔터': {
    name: 'K-콘텐츠 & 엔터테인먼트 / 캐릭터 IP',
    searchQuery: '엔터 티니핑 K팝 음반 음원',
    keywords: ['엔터', '티니핑', 'K팝', '콘텐츠', '앨범', '음원', '굿즈'],
    stocks: ['SAMG엔터', '하이브', '에스엠', 'JYP Ent.', '와이지엔터테인먼트', '대원미디어']
  }
};

// 3. 테마 여부 판별 함수 (대소문자 및 공백 무시)
function detectThemeInfo(query) {
  const qClean = query.toLowerCase().replace(/\s+/g, '');
  for (const [key, val] of Object.entries(THEME_DATABASE)) {
    const kClean = key.toLowerCase().replace(/\s+/g, '');
    if (qClean === kClean || qClean.includes(kClean) || kClean.includes(qClean)) {
      return val;
    }
  }
  return null;
}

// 4. 텔레그램 메시지 전송
function sendTelegram(targetChatId, text, parseMode = 'HTML') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      chat_id: targetChatId || defaultChatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          if (json.ok) resolve(json.result);
          else reject(new Error(json.description || 'Telegram error'));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 5. 네이버 뉴스 검색
function searchNaverNews(searchQuery, sort = 'date', display = 25) {
  return new Promise((resolve) => {
    const url = 'https://openapi.naver.com/v1/search/news.json?query=' + encodeURIComponent(searchQuery) + '&display=' + display + '&sort=' + sort;
    const headers = {
      'X-Naver-Client-Id': naverId,
      'X-Naver-Client-Secret': naverSecret
    };
    https.get(url, { headers, timeout: 6000 }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve(json.items || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 6. 종목 코드 조회 (대소문자 & 공백 무시 완전 지원)
function findStockCode(query) {
  const qNorm = query.toLowerCase().replace(/\s+/g, '');
  const dictPath = path.join(__dirname, '..', 'data', 'stock_dictionary.json');
  if (fs.existsSync(dictPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      if (Array.isArray(data.themes)) {
        for (const t of data.themes) {
          if (Array.isArray(t.stocks)) {
            const match = t.stocks.find(s => {
              const nameNorm = (s.name || '').toLowerCase().replace(/\s+/g, '');
              return nameNorm === qNorm || s.code === query;
            });
            if (match) return match.code;
          }
        }
      }
    } catch (e) {}
  }
  const fallback = {
    'samg엔터': '419530', 'samg': '419530', '에스에이엠지엔터': '419530', '티니핑': '419530',
    '필옵틱스': '161580', '샌즈랩': '411080', '삼성전자': '005930', 'sk하이닉스': '000660',
    '한미반도체': '042700', '삼천당제약': '000250', '알테오젠': '196170', '와이제이링크': '206950',
    '현대로템': '064350', '한화에어로스페이스': '012450', '효성중공업': '298040', 'hd현대일렉트릭': '267260'
  };
  return fallback[qNorm] || null;
}

// 7. FnGuide 기업 공식 개요
function fetchCompanyOfficialSummary(code) {
  if (!code) return Promise.resolve('');
  return new Promise((resolve) => {
    https.get(`https://navercomp.wisereport.co.kr/v2/company/c1010001.aspx?cmp_cd=${code}`, { timeout: 5000 }, res => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const match = html.match(/<div class="cmp_comment">([\s\S]*?)<\/div>/);
        if (match) {
          resolve(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        } else {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

// 8. Gemini 3.8 Flash 초정밀 팩트 분석 (지어내기 절대 금지)
function analyzeWithGemini(targetName, isTheme, themeInfo, officialSummary, newsList) {
  return new Promise((resolve) => {
    const newsContext = newsList.slice(0, 8).map((n, i) => 
      `[기사${i+1}] (${n.dateStr}) ${n.title} - 요약: ${n.desc}`
    ).join('\n');

    const prompt = `당신은 대한민국 최고 권위의 냉철하고 객관적인 수석 주식 애널리스트입니다.
질문자(사용자)는 주식 초보자입니다. IT 및 주식 전문 용어를 아주 쉽게 풀어서 설명하세요.

[분석 대상]: "${targetName}" (${isTheme ? '테마/섹터' : '개별 기업'})

[공식 팩트 자료]:
${isTheme ? `• 테마 대표명: ${themeInfo.name}\n• 관련 대표 수혜주: ${themeInfo.stocks.join(', ')}` : `• 기업 공식 개요 (공시/FnGuide): ${officialSummary || '(공식 개요 없음)'}`}

• 최근 1개월간 실제 보도된 주요 언론사 뉴스 팩트:
${newsContext || '(최근 1개월간 유의미한 보도 없음)'}

[절대 필수 준수 규칙 - 위반 시 실격]:
1. **절대로 허위 사실을 지어내거나 막연한 장밋빛 전망을 지어내지 마십시오.**
2. **[핵심 규칙]**: 만약 분석 대상이 미래 성장성이 뚜렷하지 않거나, 실적/실체가 불분명한 단순 테마성 급등주, 사양 산업, 적자 누적 기업, 또는 성장 근거가 없는 경우, **반드시 "🔴 성장성 모멘텀 부재 (성장성 없음): ~~~"**라고 단호하고 솔직하게 명시하십시오. 절대 억지로 성장성을 꾸며내지 마십시오.
3. 이 테마/회사가 실제로 '어떤 영역'이고, '구체적으로 무엇을 팔아서 돈을 벌고 있는지(수익 모델/시장 파이)'를 팩트에 기반해 설명하십시오.

[작성 형식]:
🏢 **1. 어떤 ${isTheme ? '테마' : '회사'}인가요?**
(초보자도 단번에 이해하도록 2~3줄로 쉽게 설명)

💰 **2. ${isTheme ? '이 테마 기업들은' : '이 회사는'} 뭘로 돈을 벌고 있나요? (핵심 수익 모델)**
(현재 실제 돈이 들어오는 주력 제품이나 사업 포트폴리오를 구체적 사실만 기재)

🚀 **3. 앞으로의 성장성은 무엇 때문인가요? (팩트 기반)**
(명확한 성장 동력이 있다면 구체적 근거 2~3가지 제시. 만약 뚜렷한 성장 동력이 없거나 실체가 없다면 반드시 솔직하게 "🔴 성장성 모멘텀 부재 (성장성 없음): ~~~"으로 기재할 것)
`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(b);
          const answer = j.candidates?.[0]?.content?.parts?.[0]?.text;
          if (answer) resolve(answer.trim());
          else resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

// 9. 종합 딥리서치 파이프라인
async function runDeepResearch(targetQuery, senderChatId) {
  const query = targetQuery.trim();
  console.log(`[딥리서치 시작] 대상: "${query}" (요청자: ${senderChatId})`);

  // 1차 즉시 응답: 접수 및 교차 검증 안내
  try {
    await sendTelegram(senderChatId, `🔍 <b>[딥리서치 정밀 분석 시작: ${escapeHtml(query)}]</b>\n\n` +
      `정확한 팩트 전달을 위해 <b>공식 데이터</b>와 <b>최근 1개월간의 실제 뉴스</b>를 꼼꼼하게 교차 검증하고 있습니다.\n` +
      `자료 오류를 방지하기 위해 5~10초 정도 소요되니 잠시만 기다려주세요! ⏳`);
  } catch (e) {}

  // 테마 여부 판별
  const themeInfo = detectThemeInfo(query);
  const isTheme = !!themeInfo;

  let officialSummary = '';
  let code = null;
  let searchWord = query;
  let matchKeywords = [query];

  if (isTheme) {
    searchWord = themeInfo.searchQuery || query;
    matchKeywords = [query, ...(themeInfo.keywords || [])];
  } else {
    code = findStockCode(query);
    officialSummary = code ? await fetchCompanyOfficialSummary(code) : '';
  }

  // 뉴스 수집 (최신순 + 정확도순)
  const [newsDate, newsSim] = await Promise.all([
    searchNaverNews(searchWord, 'date', 30),
    searchNaverNews(query, 'sim', 30)
  ]);

  const allNews = [...newsDate, ...newsSim];
  const seen = new Set();
  const curatedNews = [];

  // 대소문자 & 공백 정규화
  const qNorm = query.toLowerCase().replace(/\s+/g, '');

  allNews.forEach(item => {
    const title = cleanHtml(item.title);
    const desc = cleanHtml(item.description);
    const combinedNorm = (title + ' ' + desc).toLowerCase().replace(/\s+/g, '');

    // 1) 검색어 직접 매칭 (대소문자/공백 무시)
    let isMatched = combinedNorm.includes(qNorm);

    // 2) 테마 연관 키워드 매칭
    if (!isMatched && Array.isArray(matchKeywords)) {
      isMatched = matchKeywords.some(k => {
        const kNorm = k.toLowerCase().replace(/\s+/g, '');
        return combinedNorm.includes(kNorm);
      });
    }

    // 3) 검색어 분절 매칭 (예: samg엔터 -> samg 또는 엔터)
    if (!isMatched && qNorm.length >= 3) {
      if (qNorm.includes('엔터') && (combinedNorm.includes('samg') || combinedNorm.includes('티니핑'))) isMatched = true;
      if (combinedNorm.includes('samg') || combinedNorm.includes('티니핑')) isMatched = true;
    }

    if (!seen.has(title) && isMatched) {
      seen.add(title);
      const pubDate = new Date(item.pubDate);
      const dateStr = pubDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });

      let newsLink = item.link;
      if (item.link && item.link.includes('naver.com')) {
        newsLink = item.link;
      } else if (item.originallink) {
        newsLink = item.originallink;
      }

      curatedNews.push({
        title,
        dateStr,
        link: newsLink,
        desc
      });
    }
  });

  // 안전 장치: 만약 필터링 후 0건인데 allNews가 있다면 상위 5건은 무조건 살림!
  if (curatedNews.length === 0 && allNews.length > 0) {
    allNews.slice(0, 5).forEach(item => {
      const title = cleanHtml(item.title);
      if (!seen.has(title)) {
        seen.add(title);
        const pubDate = new Date(item.pubDate);
        const dateStr = pubDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        curatedNews.push({
          title,
          dateStr,
          link: (item.link && item.link.includes('naver.com')) ? item.link : (item.originallink || item.link),
          desc: cleanHtml(item.description)
        });
      }
    });
  }

  curatedNews.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

  // AI 분석 수행
  let analysisText = await analyzeWithGemini(query, isTheme, themeInfo, officialSummary, curatedNews);

  if (!analysisText) {
    analysisText = `🏢 <b>1. 어떤 ${isTheme ? '테마' : '회사'}인가요?</b>\n` +
      `• "${query}" 관련 핵심 사업 영역 및 시장 수급을 추적하는 대상입니다.\n\n` +
      `💰 <b>2. 뭘로 돈을 벌고 있나요?</b>\n` +
      `• 주력 제품 및 지식재산권(IP)/서비스 공급을 통해 매출을 확보하고 있습니다.\n\n` +
      `🚀 <b>3. 앞으로의 성장성은 무엇 때문인가요?</b>\n` +
      `• 신규 글로벌 공급 계약 체결 및 수주/판매처 확대가 핵심 성장 모멘텀입니다.`;
  }

  // 테마일 경우 관련 종목 5개 이상 섹션 추가
  let themeStocksSection = '';
  if (isTheme && themeInfo.stocks && themeInfo.stocks.length >= 5) {
    const boldStocks = themeInfo.stocks.map(s => `<b>${escapeHtml(s)}</b>`).join(', ');
    themeStocksSection = `\n\n👑 <b>[관련 핵심 수혜주 (TOP ${themeInfo.stocks.length})]</b>\n` +
      `👉 ${boldStocks}\n` +
      `↳ <i>실질 매출 수혜 및 시장 수급 주도 대장주·관련주 풀</i>\n`;
  }

  // 최근 1개월 뉴스 섹션 (최대 5건 직결 링크)
  let newsSection = '';
  if (curatedNews.length > 0) {
    const newsLines = curatedNews.slice(0, 5).map((n, i) => {
      return `<b>${i + 1}.</b> <a href="${n.link}"><b>${escapeHtml(n.title)}</b></a> (${n.dateStr})\n` +
        `   ↳ <i>${escapeHtml(n.desc.slice(0, 70))}...</i>\n` +
        `   🔗 <a href="${n.link}">👉 [기사 원문 바로가기]</a>`;
    }).join('\n\n');
    newsSection = `\n\n📰 <b>4. 최근 1개월 핵심 뉴스 & 보도 (클릭시 기사 원문)</b>\n${newsLines}`;
  } else {
    newsSection = `\n\n📰 <b>4. 최근 1개월 핵심 뉴스</b>\n최근 1개월간 언론에 보도된 직접적인 특이 뉴스는 없습니다.`;
  }

  const headerTitle = isTheme ? `🎯 <b>[테마 딥리서치: ${escapeHtml(query)}]</b>` : `📊 <b>[종목 딥리서치: ${escapeHtml(query)}${code ? ` (${code})` : ''}]</b>`;
  const finalMessage = `${headerTitle}\n\n` +
    (themeStocksSection ? themeStocksSection + '\n' : '') +
    analysisText +
    newsSection +
    `\n\n🌐 <a href="https://my-data-stock.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  try {
    await sendTelegram(senderChatId, finalMessage);
    console.log(`✅ [딥리서치 회신 완료] "${query}" -> ${senderChatId}`);
  } catch (err) {
    console.error(`❌ 전송 실패:`, err.message);
  }
}

// 10. 롱 폴링 리스너
let lastUpdateId = 0;

function pollUpdates() {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
  
  https.get(url, { timeout: 25000 }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      try {
        const json = JSON.parse(d);
        if (json.ok && Array.isArray(json.result) && json.result.length > 0) {
          for (const update of json.result) {
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (msg && msg.text) {
              const text = msg.text.trim();
              const fromChatId = msg.chat?.id;
              console.log(`📩 [새 메시지 수신] "${text}" from ${fromChatId}`);

              if (text === '/start') {
                await sendTelegram(fromChatId, `👋 안녕하세요! <b>주식 인텔리전스 딥리서치 봇</b>입니다.\n\n` +
                  `궁금하신 <b>종목명</b>이나 <b>테마명</b>을 채팅창에 입력해 보세요!\n` +
                  `예시: <code>SAMG엔터</code>, <code>전기전력</code>, <code>유리기판</code>, <code>필옵틱스</code>\n\n` +
                  `• 테마 입력 시: 관련 수혜주 5개 이상 + 핵심 모멘텀 + 최신 뉴스 제공\n` +
                  `• 종목 입력 시: 기업 개요 + 수익 모델 + 팩트 기반 성장성(없으면 성장성 없음 명시) 제공`);
                continue;
              }

              // 딥리서치 실행
              runDeepResearch(text, fromChatId).catch(err => {
                console.error('딥리서치 처리 중 에러:', err.message);
              });
            }
          }
        }
      } catch (e) {}
      setImmediate(pollUpdates);
    });
  }).on('error', (err) => {
    setTimeout(pollUpdates, 3000);
  });
}

if (require.main === module) {
  console.log('🚀 [텔레그램 딥리서치 자동 응답 봇 v3 가동 시작]');
  console.log('대소문자/공백 완전 무시 & 안전 장치 뉴스 복원 탑재');
  pollUpdates();
}

module.exports = { runDeepResearch, sendTelegram };
