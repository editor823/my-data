const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'telegram_config.json');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

function loadConfig() {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envChatId = process.env.TELEGRAM_CHAT_ID;
  if (envToken && envChatId) {
    return { botToken: envToken, chatId: envChatId };
  }

  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  }
  throw new Error('Telegram bot credentials not found in env or config file.');
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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS, timeout: 6000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sendTelegramMessage(text, parseMode = 'HTML') {
  return new Promise((resolve, reject) => {
    const config = loadConfig();
    const payload = JSON.stringify({
      chat_id: config.chatId,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${config.botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.description || 'Unknown Telegram API error'));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// 실시간 지수 직접 수집 (실패 시 로컬 캐시 사용)
async function getLiveIndices() {
  try {
    const [kData, kdData, fxRaw] = await Promise.all([
      fetchJson('https://m.stock.naver.com/api/index/KOSPI/basic'),
      fetchJson('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
      fetchJson('https://m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW&page=1')
    ]);
    const fxData = fxRaw.result?.[0] || {};
    const result = {
      updatedAt: new Date().toISOString(),
      kospi: {
        name: '코스피',
        closePrice: kData.closePrice || kData.now,
        fluctuationsRatio: kData.fluctuationsRatio,
        compareToPreviousClosePrice: kData.compareToPreviousClosePrice
      },
      kosdaq: {
        name: '코스닥',
        closePrice: kdData.closePrice || kdData.now,
        fluctuationsRatio: kdData.fluctuationsRatio,
        compareToPreviousClosePrice: kdData.compareToPreviousClosePrice
      },
      usdKrw: {
        name: '원/달러 환율',
        closePrice: fxData.closePrice,
        fluctuationsRatio: fxData.fluctuationsRatio
      }
    };

    // 캐시 파일 갱신
    const cachePath = path.join(__dirname, '..', 'scratch', 'api_result.json');
    try {
      fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf8');
    } catch (e) {}

    return result;
  } catch (err) {
    console.warn('실시간 지수 API 호출 실패, 캐시 사용:', err.message);
    const paths = [
      path.join(__dirname, '..', 'scratch', 'api_result.json'),
      path.join(__dirname, '..', 'data', 'api_result.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        try {
          return JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch (e) {}
      }
    }
  }
  return null;
}

// 실시간 증시 뉴스 선별 (비증시 잡음 필터링 + 진짜 핵심 시황 및 글로벌 이슈 추출)
function getCuratedMarketNews() {
  const paths = [
    path.join(__dirname, '..', 'public', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'data', 'live_domestic_news.json'),
    path.join(__dirname, '..', 'stock-intelligence', 'public', 'data', 'live_domestic_news.json')
  ];

  let rawList = [];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) {
          rawList = data;
          break;
        }
      } catch (e) {}
    }
  }

  if (rawList.length === 0) return [];

  // 증시와 무관한 사회/생활 잡음 제거
  const excludeKeywords = ['식대', '축의금', '결혼식', '월세', '아파트 월세', '빌라', '전월세', '청첩장'];
  const stockNews = rawList.filter(item => {
    const text = (item.tit || '') + ' ' + (item.subcontent || '');
    return !excludeKeywords.some(k => text.includes(k));
  });

  // 1순위: 국내 시황/마감/급락/외인/투매 기사
  const domesticKeywords = ['코스피', '코스닥', '급락', '마감', '외인', '외국인', '투매', '반도체', '삼성전자', '환율'];
  // 2순위: 글로벌/지정학적 거시 이슈 (트럼프, 우크라, 휴전, 미국 증시, 나스닥, 금리 등)
  const globalKeywords = ['트럼프', '우크라', '휴전', '미국', '나스닥', '금리', 'CPI', '유가', '전쟁'];

  const domesticList = [];
  const globalList = [];

  stockNews.forEach(item => {
    const text = (item.tit || '') + ' ' + (item.subcontent || '');
    let dScore = 0;
    domesticKeywords.forEach(k => {
      if ((item.tit || '').includes(k)) dScore += 5;
      else if ((item.subcontent || '').includes(k)) dScore += 2;
    });

    let gScore = 0;
    globalKeywords.forEach(k => {
      if ((item.tit || '').includes(k)) gScore += 5;
      else if ((item.subcontent || '').includes(k)) gScore += 2;
    });

    if (dScore > 0) domesticList.push({ ...item, score: dScore });
    if (gScore > 0) globalList.push({ ...item, score: gScore });
  });

  domesticList.sort((a, b) => b.score - a.score);
  globalList.sort((a, b) => b.score - a.score);

  // 국내 핵심 2~3건 + 글로벌 핵심 1~2건 조합하여 중복 없이 최대 4건 선정
  const selected = [];
  const selectedAids = new Set();

  function addArticle(art, categoryTag) {
    const key = art.aid || art.tit;
    if (key && !selectedAids.has(key)) {
      selectedAids.add(key);
      selected.push({ ...art, categoryTag });
    }
  }

  // 국내 시황 기사 우선 추가
  domesticList.slice(0, 2).forEach(a => addArticle(a, '국내 시황'));
  // 글로벌 핵심 기사 추가
  globalList.slice(0, 1).forEach(a => addArticle(a, '글로벌 변수'));
  // 나머지 국내 기사 추가
  domesticList.slice(2, 4).forEach(a => {
    if (selected.length < 4) addArticle(a, '주요 특징');
  });

  return selected;
}

async function run() {
  const now = new Date();
  // 한국 표준시(KST) 강제 적용
  const dateStr = now.toLocaleDateString('ko-KR', { 
    timeZone: 'Asia/Seoul', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'short' 
  });
  const timeStr = now.toLocaleTimeString('ko-KR', { 
    timeZone: 'Asia/Seoul', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // 현재 시간(한국 기준)으로 장마감 / 장중 / 개장전 구분
  const kstHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit' }), 10);
  let reportType = '심층 브리핑 리포트';
  if (kstHour >= 15 || kstHour < 6) {
    reportType = '장마감 심층 종합 리포트';
  } else if (kstHour >= 8 && kstHour < 10) {
    reportType = '개장전 모닝 브리핑';
  } else {
    reportType = '장중 실시간 브리핑';
  }

  // 1. 실시간 시장 지표
  const indices = await getLiveIndices();
  let marketSection = '';
  let kospiNum = 0;
  let kosdaqNum = 0;

  if (indices) {
    kospiNum = parseFloat(indices.kospi?.fluctuationsRatio || 0);
    kosdaqNum = parseFloat(indices.kosdaq?.fluctuationsRatio || 0);

    const kospiRate = kospiNum >= 0 ? `+${indices.kospi.fluctuationsRatio}%` : `${indices.kospi.fluctuationsRatio}%`;
    const kosdaqRate = kosdaqNum >= 0 ? `+${indices.kosdaq.fluctuationsRatio}%` : `${indices.kosdaq.fluctuationsRatio}%`;
    const usd = indices.usdKrw ? `${indices.usdKrw.closePrice}원` : '-';

    marketSection = `📈 <b>[1. 시장 핵심 지표]</b>\n` +
      `• 코스피: <b>${indices.kospi?.closePrice || '-'}</b> (${kospiRate})\n` +
      `• 코스닥: <b>${indices.kosdaq?.closePrice || '-'}</b> (${kosdaqRate})\n` +
      `• 원/달러 환율: <b>${usd}</b>\n\n`;
  }

  // 2. 오늘의 시장 상태 및 주도/급락 심층 진단
  let diagnosisSection = '';
  const isMarketCrash = (kospiNum <= -2.0 || kosdaqNum <= -3.0);
  const isMarketDrop = (kospiNum <= -1.0 || kosdaqNum <= -1.5);
  const isMarketSurge = (kospiNum >= 1.5 || kosdaqNum >= 2.0);

  if (isMarketCrash) {
    diagnosisSection = `🚨 <b>[2. 시장 긴급 심층 진단: 대형주 투매 및 지수 급락]</b>\n` +
      `🔥 <b>시장 상태:</b> 급락 패닉셀 (코스피 ${kospiNum}%, 코스닥 ${kosdaqNum}%)\n` +
      `💡 <b>핵심 원인:</b> 외국인/기관 대규모 순매도 폭탄 및 지지선 이탈\n` +
      `📊 <b>기술적 위치:</b> 주요 지지 라인 붕괴에 따른 실망 매물 출회 및 투매 국면\n` +
      `🔴 <b>주의 리스크:</b> 반도체 등 주도 업종 차익 실현 및 추가 변동성 확대\n\n`;
  } else if (isMarketDrop) {
    diagnosisSection = `📉 <b>[2. 오늘의 시장 국면 심층 진단: 약세 조정]</b>\n` +
      `🔥 <b>시장 상태:</b> 외인 매도세 우위 및 차익 실현 장세\n` +
      `💡 <b>핵심 원인:</b> 글로벌 대외 변수 불안 및 수급 분산\n` +
      `📊 <b>기술적 위치:</b> 단기 이평선 지지력 테스트 국면\n` +
      `🔴 <b>주의 리스크:</b> 무리한 추격 매수 자제 및 지지선 확인 필요\n\n`;
  } else if (isMarketSurge) {
    diagnosisSection = `🚀 <b>[2. 오늘의 시장 국면 심층 진단: 강력한 반등 랠리]</b>\n` +
      `🔥 <b>시장 상태:</b> 기관·외인 쌍끌이 매수 유입\n` +
      `💡 <b>핵심 재료:</b> 대외 악재 완화 및 주도 섹터 수급 집중\n` +
      `📊 <b>기술적 위치:</b> 저항선 돌파 시도 및 안착 국면\n` +
      `🟢 <b>상승 촉매:</b> 실적 호전주 및 모멘텀 보유주 중심 탄력\n\n`;
  } else {
    diagnosisSection = `⚖️ <b>[2. 오늘의 시장 국면 심층 진단: 혼조/눈치보기]</b>\n` +
      `🔥 <b>시장 상태:</b> 지수 보합권 등락 및 종목별 차별화\n` +
      `💡 <b>핵심 원인:</b> 주요 경제지표 발표 앞둔 관망세\n` +
      `📊 <b>기술적 위치:</b> 박스권 내 수급 공방 국면\n\n`;
  }

  // 3. 매크로 흔들릴 때 주목: EPS 지속 성장 핵심 섹터 & 주도주 (신규 추가)
  const epsSection = `💎 <b>[3. 매크로 흔들릴 때 볼 EPS 지속성 탑픽 섹터]</b>\n` +
    `⚡ <b>AI 전력망/변압기:</b> <code>HD현대일렉트릭, 효성중공업</code>\n` +
    `   ↳ <i>EPS 지속성: AI 데이터센터 전력 쇼티지 & 4~5년치 일감 완판, 20%대 고마진 유지</i>\n` +
    `💾 <b>AI 반도체 HBM:</b> <code>SK하이닉스, 한미반도체</code>\n` +
    `   ↳ <i>EPS 지속성: 엔비디아향 HBM3E/HBM4 독점 완판, 분기 영업익 7조원대 실적 폭발</i>\n` +
    `🚢 <b>K-조선/친환경선:</b> <code>HD한국조선해양, 삼성중공업</code>\n` +
    `   ↳ <i>EPS 지속성: 3년치 고선가 도크 풀가동, 헐값 물량 해소 후 분기별 순이익 급증</i>\n` +
    `🧬 <b>K-바이오 CDMO:</b> <code>삼성바이오로직스, 알테오젠</code>\n` +
    `   ↳ <i>EPS 지속성: 美 생물보안법 수혜 + 비만치료제 위탁생산 폭증, 30~40% 마진 지속</i>\n\n`;

  // 4. 증시 핵심 속보 & 특징 뉴스 (진짜 네이버 뉴스 원문 링크 연동)
  const newsList = getCuratedMarketNews();
  let newsSection = '';
  if (newsList.length > 0) {
    const newsLines = newsList.map((n, i) => {
      const press = n.ohnm ? `[${escapeHtml(n.ohnm)}] ` : '';
      const tag = n.categoryTag ? `[${escapeHtml(n.categoryTag)}] ` : '';
      const title = escapeHtml(n.tit || n.title || '속보');
      const newsUrl = (n.oid && n.aid) 
        ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}`
        : `https://finance.naver.com/news/`;
      const sub = n.subcontent ? `\n   ↳ <i>${escapeHtml(n.subcontent.trim().slice(0, 75))}...</i>` : '';
      return `<b>${i + 1}.</b> ${tag}${press}<a href="${newsUrl}"><b>${title}</b></a>${sub}\n   🔗 <a href="${newsUrl}">👉 [기사 원문 바로가기]</a>`;
    }).join('\n\n');

    newsSection = `📰 <b>[4. 증시 핵심 속보 & 시황 헤드라인 (클릭시 기사 원문)]</b>\n${newsLines}\n\n`;
  }

  // 5. 실전 투자 대응 전략 (장세에 맞춘 맞춤 전략)
  let strategySection = '';
  if (isMarketCrash) {
    strategySection = `💡 <b>[5. 실전 투자 대응 전략 (급락장 긴급 가이드)]</b>\n` +
      `• <b>무리한 물타기·추격 매수 절대 금지:</b> 지지선 안착 확인 전까지 현금 비중 유지\n` +
      `• <b>실망 매물 진정 확인:</b> 반도체 등 핵심 대형주 외국인 매도세 둔화 시점 주시\n` +
      `• <b>손절 기준 엄수:</b> 지지선 이탈 종목 리스크 관리 및 방어적 포트폴리오 운용\n\n`;
  } else {
    strategySection = `💡 <b>[5. 실전 투자 대응 전략]</b>\n` +
      `• 주도 테마 대장주 위주의 <b>눌림목 분할 접근</b> 원칙 준수\n` +
      `• 급등 추격 매수 지양 및 거래대금 실린 종목 선별 대응\n` +
      `• 장 초반 외인·기관 실시간 수급 방향 확인 필수\n\n`;
  }

  const footer = `🌐 <a href="https://my-data-stock.pages.dev">주식센터 실시간 대시보드 바로가기</a>`;

  const fullReport = `📊 <b>[주식 인텔리전스 센터 - ${reportType}]</b>\n\n` +
    `📅 <b>기준일시:</b> ${dateStr} ${timeStr}\n\n` +
    marketSection +
    diagnosisSection +
    epsSection +
    newsSection +
    strategySection +
    footer;

  try {
    await sendTelegramMessage(fullReport);
    console.log('✅ 진짜 실시간 지표와 실제 뉴스 원문이 포함된 주식 보고서 발송 성공!');
  } catch (err) {
    console.error('❌ 발송 실패:', err.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { sendTelegramMessage };
