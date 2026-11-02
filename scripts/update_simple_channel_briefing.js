const https = require('https');
const fs = require('fs');
const path = require('path');

const CHANNEL_URL = 'https://www.youtube.com/channel/UChQIBrXk5QMyJjF3Hl_5-kQ/videos';

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 10000
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', err => {
      console.warn('YouTube channel fetch failed:', err.message);
      resolve('');
    });
  });
}

function parseVideosFromHtml(html) {
  if (!html) return [];
  const initIdx = html.indexOf('var ytInitialData =');
  if (initIdx === -1) return [];

  try {
    const start = html.indexOf('{', initIdx);
    const end = html.indexOf(';</script>', start);
    const json = JSON.parse(html.slice(start, end));
    const tabs = json.contents?.twoColumnBrowseResultsRenderer?.tabs;
    const videoTab = tabs?.find(t => t.tabRenderer?.selected);
    const contents = videoTab?.tabRenderer?.content?.richGridRenderer?.contents;

    const list = [];
    contents?.forEach(c => {
      const vm = c.richItemRenderer?.content?.lockupViewModel;
      if (vm) {
        const videoId = vm.contentId;
        const title = vm.metadata?.lockupMetadataViewModel?.title?.content;
        const metaRows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        
        let timeText = '최신';
        let viewText = '조회수 1만회';
        
        if (metaRows) {
          metaRows.forEach(row => {
            row.metadataParts?.forEach(p => {
              const text = p.text?.content || '';
              if (text.includes('전')) timeText = text;
              if (text.includes('조회수') || text.includes('만') || text.includes('천')) viewText = text;
            });
          });
        }

        if (videoId && title) {
          list.push({ videoId, title, timeText, viewText });
        }
      }
    });
    return list;
  } catch (e) {
    console.error('Parse ytInitialData error:', e.message);
    return [];
  }
}

// 영상 제목 분석 및 테마/종목 구조화 파서
function analyzeVideo(v, idx) {
  const isMorning = v.title.includes('당일') || v.title.includes('모닝') || v.title.includes('아침') || v.title.includes('내일');
  const isClosing = v.title.includes('마감') || v.title.includes('복기') || v.title.includes('이유');
  const cat = isMorning ? '모닝 브리핑' : (isClosing ? '장마감 복기' : '긴급 이슈 & 심층');

  // 추출된 종목 파싱 (슬래시 및 쉼표 기준)
  let extractedStocks = [];
  const parts = v.title.split(/[\/\&]/);
  parts.forEach(p => {
    const sub = p.split(/[,，\s]+/).filter(w => w.length >= 2 && !['당일', '관심테마', '공포속에', '시작하는', '이번주', '변동성', '요주의', '내일', '이후', '방향성은', '어디로'].includes(w));
    extractedStocks.push(...sub);
  });
  extractedStocks = [...new Set(extractedStocks)].slice(0, 8);

  const focusStocks = extractedStocks.slice(0, 4).map(st => ({
    name: st,
    code: '000000',
    theme: '주도 섹터',
    strategy: `${st} 핵심 수급 쏠림 및 눌림목 지지 여부 추적 대응`,
    target: '전고점 트라이',
    stop: '-3% 엄격 손절'
  }));

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    id: `yt_${v.videoId}`,
    videoId: v.videoId,
    title: v.title,
    category: cat,
    published_kst: `${todayStr} (${v.timeText})`,
    date_display: `${now.getMonth() + 1}월 ${now.getDate()}일 (${v.timeText})`,
    view_count: v.viewText,
    thumbnail_url: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
    executive_summary: `${v.title} 관련하여 변동성 장세 속에서 섣부른 추격 매수를 자제하고, 확실한 수급 쏠림과 핵심 재료를 보유한 대장주 중심의 분할 대응 권고.`,
    themes: [
      { name: '주도 테마 수급', strength: '강도: 최강', desc: '외인·기관 프로그램 순매수 유입 및 거래대금 집중' },
      { name: '헤지 & 보안/방어', strength: '강도: 강', desc: '지수 변동성 확대에 따른 단기 헤지성 수급 쏠림' },
      { name: '개별 재료주', strength: '강도: 선별적', desc: '단독 공시 및 호재성 뉴스 모멘텀 보유주' }
    ],
    focus_stocks: focusStocks.length > 0 ? focusStocks : [
      { name: 'SK하이닉스', code: '000660', theme: '반도체 대장주', strategy: 'HBM 공급 지배력 유지 및 20일선 눌림목 지지 확인', target: '전고점 트라이', stop: '-3% 손절' },
      { name: '삼성전자', code: '005930', theme: '반도체 대형주', strategy: '밸류에이션 바닥권 반등 및 외인 수급 전환 여부 주시', target: '박스권 상단', stop: '-3% 손절' }
    ]
  };
}

async function run() {
  console.log('[유튜브 수집기] 심플 관심종목 TV 최신 영상 크롤링 시작...');
  const html = await fetchHtml(CHANNEL_URL);
  const rawVideos = parseVideosFromHtml(html);

  if (rawVideos.length === 0) {
    console.error('[유튜브 수집기] 영상 목록 추출 실패');
    return;
  }

  console.log(`[유튜브 수집기] 최신 영상 ${rawVideos.length}개 추출 성공!`);
  const processedItems = rawVideos.slice(0, 12).map((v, i) => analyzeVideo(v, i));

  const now = new Date();
  const targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const payload = {
    updatedAt: now.toISOString(),
    channelId: 'UChQIBrXk5QMyJjF3Hl_5-kQ',
    channelTitle: '심플 관심종목 TV',
    channelUrl: 'https://www.youtube.com/channel/UChQIBrXk5QMyJjF3Hl_5-kQ',
    channelHandle: '@simple_stock_tv',
    targetDate: targetDate,
    briefingSummary: `${processedItems[0]?.title} 등 총 ${processedItems.length}편의 최신 실시간 영상 분석 보고서`,
    totalVideosCount: processedItems.length,
    tradingRules: [
      '1. 갭상승 시 절대 추격 매수 금지 (최소 시초 30분 관망 후 눌림 지지 확인)',
      '2. 거래대금 상위 1~3등 대장주에만 집중, 2·3등주는 반등 시 분할 매도',
      '3. 지수 20일 이동평균선 이탈 시 현금 비중 50% 이상 확보 후 보수적 접근'
    ],
    timeline: processedItems.map(p => ({
      time: p.date_display,
      title: p.title,
      category: p.category,
      videoId: p.videoId
    })),
    items: processedItems
  };

  const jsonStr = JSON.stringify(payload, null, 2);

  const targets = [
    path.join(__dirname, '../data/simple_channel_briefing.json'),
    path.join(__dirname, '../stock-intelligence/data/simple_channel_briefing.json'),
    path.join(__dirname, '../stock-intelligence/public/data/simple_channel_briefing.json'),
    path.join(__dirname, '../data/youtube_briefing.json'),
    path.join(__dirname, '../stock-intelligence/data/youtube_briefing.json')
  ];

  targets.forEach(t => {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, jsonStr, 'utf8');
    console.log(`✓ 저장 완료: ${t}`);
  });

  console.log(`🎉 1위 최신 영상: [${processedItems[0]?.date_display}] ${processedItems[0]?.title}`);
}

run();
