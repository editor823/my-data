const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'telegram_config.json');

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

function getLatestTimelineData() {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'theme_timeline.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data[data.length - 1];
      }
    }
  } catch (e) {}
  return null;
}

function getLatestSimpleBriefing() {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'simple_channel_briefing.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data;
    }
  } catch (e) {}
  return null;
}

async function run() {
  const args = process.argv.slice(2);
  const type = args[0] || 'test';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  if (type === 'test') {
    const msg = `🚀 <b>[주식 인텔리전스 센터 텔레그램 연동 성공!]</b>\n\n` +
      `반갑습니다! <b>'장시작마감' 알림봇</b>이 성공적으로 연결되었습니다. 🎉\n\n` +
      `📅 <b>연동 일시:</b> ${now.toLocaleString('ko-KR')}\n` +
      `🎯 <b>앞으로 매일 텔레그램으로 배달되는 알림:</b>\n` +
      `• ☀️ <b>08:30 모닝 브리핑:</b> 당일 개장 전 핵심 테마 & 관심종목\n` +
      `• 🌙 <b>20:00 장마감 심화 리포트:</b> 당일 주도 테마 결산 및 거래대금 분석\n` +
      `• 📺 <b>유튜브 심플 관심종목 TV:</b> 아침/장마감 영상 듀얼 표 보고서\n\n` +
      `이제 PC나 웹사이트를 켜지 않아도 스마트폰에서 편리하게 확인하세요! ✨`;

    try {
      await sendTelegramMessage(msg);
      console.log('✅ 테스트 메시지 발송 성공!');
    } catch (err) {
      console.error('❌ 발송 실패:', err.message);
    }
  } else if (type === 'report' || type === 'morning') {
    const timeline = getLatestTimelineData();
    const simple = getLatestSimpleBriefing();

    let themeText = '데이터 수집 중';
    let stockText = '';
    if (timeline) {
      themeText = timeline.theme || timeline.title || '최신 주도 테마';
      const stocks = timeline.stocks || timeline.leaders || [];
      if (stocks.length > 0) {
        stockText = `\n📌 <b>주요 관련주:</b> ${stocks.join(', ')}`;
      }
    }

    let simpleText = '';
    if (simple && simple.latestVideo) {
      simpleText = `\n\n📺 <b>[심플 관심종목 TV 최신 브리핑]</b>\n` +
        `• <b>영상:</b> ${simple.latestVideo.title || '최신 업로드 영상'}\n` +
        `• <b>업로드:</b> ${simple.latestVideo.date || '최신'}\n` +
        `• <b>핵심 요약:</b> ${simple.latestVideo.summary || '주요 수급 및 테마 동향'}`;
    }

    const msg = `📊 <b>[주식 인텔리전스 센터 - ${type === 'morning' ? '모닝' : '데일리'} 리포트]</b>\n\n` +
      `📅 <b>기준일자:</b> ${dateStr}\n\n` +
      `🔥 <b>오늘의 핵심 주도 섹터</b>\n` +
      `• <b>대표 테마:</b> ${themeText}${stockText}\n` +
      `• <b>시장 분석:</b> 시장 주도 거래대금 집중 섹터 추적 완료${simpleText}\n\n` +
      `🌐 <a href="https://stock-intelligence.pages.dev">주식센터 대시보드 바로가기</a>`;

    try {
      await sendTelegramMessage(msg);
      console.log('✅ 주식 보고서 발송 성공!');
    } catch (err) {
      console.error('❌ 보고서 발송 실패:', err.message);
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { sendTelegramMessage };
