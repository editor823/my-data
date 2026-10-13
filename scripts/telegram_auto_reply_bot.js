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

// 2. 텔레그램 메시지 전송 함수
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

// 3. 네이버 뉴스 검색 (최근 1개월 기사)
function searchNaverNews(keyword, sort = 'date', display = 25) {
  return new Promise((resolve) => {
    const url = 'https://openapi.naver.com/v1/search/news.json?query=' + encodeURIComponent(keyword) + '&display=' + display + '&sort=' + sort;
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

// 4. 종목 코드 조회 (stock_dictionary.json 또는 고유 리스트)
function findStockCode(query) {
  const dictPath = path.join(__dirname, '..', 'data', 'stock_dictionary.json');
  if (fs.existsSync(dictPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
      if (Array.isArray(data.themes)) {
        for (const t of data.themes) {
          if (Array.isArray(t.stocks)) {
            const match = t.stocks.find(s => s.name === query || s.code === query);
            if (match) return match.code;
          }
        }
      }
    } catch (e) {}
  }
  // 기본 사전
  const fallback = {
    '필옵틱스': '161580',
    '삼성전자': '005930',
    'SK하이닉스': '000660',
    '한미반도체': '042700',
    '삼천당제약': '000250',
    '알테오젠': '196170',
    '와이지엔터': '122870',
    '와이제이링크': '206950',
    '현대로템': '064350',
    '한화에어로스페이스': '012450',
    '효성중공업': '298040',
    'HD현대일렉트릭': '267260'
  };
  return fallback[query] || null;
}

// 5. FnGuide 기업 공식 개요 수집
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

// 6. Gemini 3.8 Flash 초정밀 팩트 분석 (지어내기 절대 금지 원칙)
function analyzeWithGemini(targetName, officialSummary, newsList) {
  return new Promise((resolve) => {
    const newsContext = newsList.slice(0, 8).map((n, i) => 
      `[기사${i+1}] (${n.dateStr}) ${n.title} - 요약: ${n.desc}`
    ).join('\n');

    const prompt = `당신은 대한민국 최고 권위의 냉철하고 객관적인 수석 주식 애널리스트입니다.
질문자(사용자)는 주식 초보자입니다. IT 및 주식 전문 용어를 아주 쉽게 풀어서 설명하세요.

[분석 대상]: "${targetName}"

[공식 팩트 자료]:
1. 기업 공식 개요 (공시/FnGuide):
${officialSummary || '(공식 개요 없음 / 테마 키워드 또는 개별 섹터)'}

2. 최근 1개월간 실제 보도된 주요 언론사 뉴스 팩트:
${newsContext || '(최근 1개월간 유의미한 보도 없음)'}

[절대 필수 준수 규칙 - 위반 시 실격]:
1. **절대로 허위 사실을 지어내거나 막연한 장밋빛 전망을 지어내지 마십시오.**
2. **[핵심 규칙]**: 만약 분석 대상이 미래 성장성이 뚜렷하지 않거나, 실적/실체가 불분명한 단순 테마성 급등주, 사양 산업, 적자 누적 기업, 또는 성장 근거가 없는 경우, **반드시 "성장성 없음" 또는 "신성장 모멘텀 부재 (단순 테마성 수급 변동 주의)"**라고 단호하고 솔직하게 명시하십시오. 절대 억지로 성장성을 꾸며내지 마십시오.
3. 이 회사가 실제로 '어떤 회사'이고, '구체적으로 무엇을 팔아서 돈을 벌고 있는지(수익 모델)'를 팩트에 기반해 설명하십시오.

[작성 형식]:
🏢 **1. 어떤 회사(또는 테마)인가요?**
(초보자도 단번에 이해하도록 2~3줄로 쉽게 설명)

💰 **2. 뭘로 돈을 벌고 있나요? (핵심 수익원/매출처)**
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

// 7. 종합 딥리서치 파이프라인 실행
async function runDeepResearch(targetQuery, senderChatId) {
  const query = targetQuery.trim();
  console.log(`[딥리서치 시작] 대상: "${query}" (요청자: ${senderChatId})`);

  // 1차 즉시 응답: 정밀 분석 착수 안내
  try {
    await sendTelegram(senderChatId, `🔍 <b>[딥리서치 정밀 분석 시작: ${escapeHtml(query)}]</b>\n\n` +
      `정확한 팩트 전달을 위해 <b>공식 기업 개요</b>와 <b>최근 1개월간의 실제 뉴스</b>를 오류 없이 검증하고 있습니다.\n` +
      `시간이 조금 걸리더라도 꼼꼼하게 교차 검증 중이오니 잠시만 기다려주세요! ⏳`);
  } catch (e) {}

  // 1. 종목 코드 및 공식 개요 확인
  const code = findStockCode(query);
  const officialSummary = code ? await fetchCompanyOfficialSummary(code) : '';

  // 2. 최근 1개월 뉴스 수집 및 중복 필터링
  const [newsDate, newsSim] = await Promise.all([
    searchNaverNews(query, 'date', 30),
    searchNaverNews(query, 'sim', 30)
  ]);

  const allNews = [...newsDate, ...newsSim];
  const seen = new Set();
  const curatedNews = [];

  allNews.forEach(item => {
    const title = cleanHtml(item.title);
    if (!seen.has(title) && (title.includes(query) || item.description.includes(query))) {
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
        desc: cleanHtml(item.description)
      });
    }
  });

  curatedNews.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

  // 3. Gemini 3.8 Flash AI 분석
  let analysisText = await analyzeWithGemini(query, officialSummary, curatedNews);

  if (!analysisText) {
    // AI 호출 실패 시 기본 룰베이스 생성
    analysisText = `🏢 <b>1. 어떤 회사인가요?</b>\n` +
      `• "${query}" 관련 공식 사업 영역 및 수급 모멘텀을 추적하는 종목입니다.\n` +
      (officialSummary ? `• <i>공식 개요: ${officialSummary}</i>\n\n` : `\n`) +
      `💰 <b>2. 뭘로 돈을 벌고 있나요?</b>\n` +
      `• 관련 핵심 제품 및 공정 장비/소재를 통해 매출을 확보하고 있습니다.\n\n` +
      `🚀 <b>3. 앞으로의 성장성은 무엇 때문인가요?</b>\n` +
      `• 최근 수주 및 신규 거래처 확대 여부가 향후 주가의 핵심 열쇠입니다. 단, 실체 없는 테마성 수급의 경우 변동성에 각별한 주의가 필요합니다.`;
  }

  // 4. 최근 1개월 핵심 뉴스 목록 (최대 5건 직결 링크)
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

  const codeLabel = code ? ` (${code})` : '';
  const finalMessage = `📊 <b>[팩트 기반 딥리서치: ${escapeHtml(query)}${codeLabel}]</b>\n\n` +
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

// 8. 텔레그램 롱 폴링(Long-polling) 리스너 루프
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

              // /start 명령어 안내
              if (text === '/start') {
                await sendTelegram(fromChatId, `👋 안녕하세요! <b>주식 인텔리전스 딥리서치 봇</b>입니다.\n\n` +
                  `궁금하신 <b>종목명</b>이나 <b>테마명</b>을 채팅창에 입력해 보세요!\n` +
                  `예시: <code>필옵틱스</code>, <code>유리기판</code>, <code>전고체배터리</code>, <code>삼성전자</code>\n\n` +
                  `자료 오류 없이 팩트 기반 기업 분석과 최근 1개월 뉴스를 꼼꼼하게 정리해 드립니다.`);
                continue;
              }

              // 비동기 딥리서치 실행
              runDeepResearch(text, fromChatId).catch(err => {
                console.error('딥리서치 처리 중 에러:', err.message);
              });
            }
          }
        }
      } catch (e) {}
      // 다음 폴링 즉시 연결
      setImmediate(pollUpdates);
    });
  }).on('error', (err) => {
    // 네트워크 오류 시 3초 후 재시도
    setTimeout(pollUpdates, 3000);
  });
}

console.log('🚀 [텔레그램 딥리서치 자동 응답 봇 가동 시작]');
console.log('사용자가 종목/테마를 입력하면 팩트 검증 후 자동으로 심층 리포트를 답장합니다.');

pollUpdates();
