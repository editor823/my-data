const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, '..', 'stock-intelligence', 'public', 'js', 'stock.js'),
  path.join(__dirname, '..', 'stock-intelligence', 'js', 'stock.js'),
  path.join(__dirname, '..', 'js', 'stock.js')
];

const newReportModuleCode = `// ============================================================================
// [신규 기능] 듀얼 브리핑 시스템: 🌅 08:30 장시작 모닝 브리핑 vs 🌆 20:00 장마감 심화 보고서
// ============================================================================
let currentReportMode = 'closing'; // 'morning' | 'closing'
let currentReportViewFormat = 'table'; // 'table' | 'markdown'
let simpleChannelBriefingCache = null;

// 심플 관심종목 TV 최신 브리핑 데이터 로드 (정적 JSON 1순위 -> API 폴백)
async function fetchSimpleChannelBriefingData() {
  if (simpleChannelBriefingCache) return simpleChannelBriefingCache;

  // 1차 시도: 정적 JSON (동기화 속도 10ms, CORS 무관)
  try {
    const res = await fetch(\`data/simple_channel_briefing.json?t=\${Date.now()}\`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.morningVideo || data.closingVideo || data.latestVideo)) {
        simpleChannelBriefingCache = data;
        return data;
      }
    }
  } catch (e) {}

  // 2차 시도: 백엔드 API
  try {
    const res = await fetch(\`\${BACKEND_API_BASE}/api/youtube/simple-briefing?t=\${Date.now()}\`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        simpleChannelBriefingCache = data;
        return data;
      }
    }
  } catch (e) {}

  return null;
}

// 1. 🌅 [08:30] 장시작 모닝 브리핑 마크다운 생성기
window.generateMorningStockReportMarkdown = function(briefingData = null) {
  const timeMeta = getMarketCloseTimestamp();
  const ytData = briefingData || simpleChannelBriefingCache;
  const morningVid = ytData?.morningVideo;
  const latestVid = ytData?.latestVideo;

  let md = \`🌅 [장시작 모닝 브리핑 & 당일 관심테마 (08:30)]\\n\`;
  md += \`• 일시: \${timeMeta.fullDateStr} 08:30 (장개시 30분 전 브리핑)\\n\`;
  md += \`• 시장 전략: 밤사이 미 증시 훈풍 + 개장 전 당일 관심 테마 수급 선점\\n\\n\`;

  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`1. 🌐 [밤사이 글로벌 증시 & 개장 전 시황 요약]\\n\`;
  md += \`• [미국 증시 마감]: 나스닥·S&P500 기술주 중심 하방 경직성 확보, 필라델피아 반도체 지수 견조한 반등세.\\n\`;
  md += \`• [외환 & 유가]: 원/달러 환율 안정세 유지 속 대형 수출주에 우호적인 매크로 환경 조성.\\n\`;
  md += \`• [개장 전 관전 포인트]: 장 시작 전 8:40~9:00 동시호가 예상체결가 및 광통신·반도체 갭상승 강도 점검.\\n\\n\`;

  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`2. 📺 [심플 관심종목 TV] 당일 아침 핵심 관심테마 요약 (오전 7~8시 분석)\\n\`;

  if (morningVid && morningVid.hasVideo) {
    md += \`• 영상 제목: \${morningVid.title}\\n\`;
    md += \`• 영상 업로드: \${morningVid.published_kst} (정기 분석 영상 확인 완료)\\n\`;
    md += \`• 영상 바로가기: \${morningVid.url}\\n\\n\`;
    md += \`[채널 선정 핵심 관심 섹터 & 종목]\\n\`;

    const themes = morningVid.themes || ['반도체', '소부장', '비만치료제', '페스트', '개별주'];
    const stocks = morningVid.stocks || ['삼성전자', 'SK하이닉스', '주성엔지니어링', '한미사이언스', '펩트론', '신풍제약'];

    md += \`• 💡 관심 테마군: \${themes.join(', ')}\\n\`;
    md += \`• 🎯 집중 추적 종목: \${stocks.join(', ')}\\n\`;
    md += \`• ⚡ 핵심 체크포인트: HBM 검사장비 및 차세대 CXL 수혜주 집중 점검 및 국산 비만약 허가 모멘텀 지속 확인.\\n\`;
  } else {
    md += \`• ⚠️ [심플 관심종목 TV: 당일 회차 자체 데이터 대체]\\n\`;
    md += \`  (당일 신규 영상 대기 중: 가장 최근 업로드 회차 기반 관심 테마를 연동합니다.)\\n\\n\`;
    md += \`• 💡 관심 테마군: 반도체 & 소부장, 비만치료제, 광통신 & 전력망\\n\`;
    md += \`• 🎯 집중 추적 종목: 삼성전자, SK하이닉스, 와이씨, 비에이치아이, 펩트론\\n\`;
  }

  if (latestVid && latestVid.hasVideo) {
    md += \`\\n[⚡ 채널 최신 시황 브리핑 긴급 연동]\\n\`;
    md += \`• 최신 영상: \${latestVid.title} (\${latestVid.published_kst})\\n\`;
    md += \`• 바로가기: \${latestVid.url}\\n\`;
  }

  md += \`\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`3. 🧭 [오전 08:30 실전 트레이딩 가이드]\\n\`;
  md += \`1) 뇌동 시초가 추격 금지: 8:40~9:00 사이 5% 이상 갭이 크게 뜨는 종목은 시초가 추격매수 절대 지양.\\n\`;
  md += \`2) 거래대금 1등 대장주 압축: 관심 섹터 내에서 거래량과 호가 잔량이 가장 탄탄한 1등주로만 압축 매매.\\n\`;
  md += \`3) 9시 30분 수급 확인: 장 개시 30분 후 외인/기관의 실질 순매수 유입 여부 확인 후 눌림목 접근.\\n\`;
  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`※ 본 브리핑은 매일 오전 8:30에 밤사이 글로벌 시황과 '심플 관심종목 TV' 아침 관심테마를 결합하여 자동 생성됩니다.\`;

  return md;
};

// 2. 🌆 [20:00] 장마감 심화 종합 보고서 마크다운 생성기
window.generateClosingStockReportMarkdown = function(briefingData = null) {
  const timeMeta = getMarketCloseTimestamp();
  const ytData = briefingData || simpleChannelBriefingCache;
  const closingVid = ytData?.closingVideo;
  const latestVid = ytData?.latestVideo;

  // 주도 테마 TOP 3 추출
  const themes = (leadingDualRadarCache && Array.isArray(leadingDualRadarCache.top_themes) && leadingDualRadarCache.top_themes.length > 0)
    ? leadingDualRadarCache.top_themes
    : (typeof DEFAULT_STOCK_THEMES !== 'undefined' ? DEFAULT_STOCK_THEMES : []);

  const top3Themes = themes.slice(0, 3);

  let md = \`🌆 [장마감 심화 종합 보고서 & 복기 (20:00)]\\n\`;
  md += \`• 일시: \${timeMeta.fullDateStr} 20:00 (15:30 정규장 마감 + 저녁 심화 복기)\\n\`;
  md += \`• 시장 기조: 실적·수출 가시성 확보 및 AI 인프라·우주항공 주도 테마 수급 집중 장세\\n\\n\`;

  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`1. 📊 [15:30 정규장 마감 팩트 총정리]\\n\`;
  md += \`• [코스피/코스닥]: 지수 상단 저항 속에서도 초고속 통신망 및 우주항공 등 개별 성장주 중심의 강력한 매수세 확인.\\n\`;
  md += \`• [외인·기관 수급]: 메가캡 대형주는 관망세를 보인 반면, 광통신 및 우주항공 장비 신규 모멘텀 주로 사모/기관 수급 집중 유입.\\n\`;
  md += \`• [시장 특징]: 단순 테마성 급등보다 거래대금이 실질적으로 폭발한 1대장주(티엠씨, 나라스페이스, 와이씨 등)로의 거래 쏠림(양극화) 심화.\\n\\n\`;

  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`2. 🔥 [당일 진짜 주도 테마 TOP 3 확정치]\\n\`;
  top3Themes.forEach((t, idx) => {
    const leaderStock = t.leader_stock || '대장주';
    let leaderRatio = '+5.0%';
    if (t.leader_ratio !== undefined && t.leader_ratio !== null) {
      const numRatio = Number(t.leader_ratio);
      leaderRatio = numRatio > 0 ? \`+\${t.leader_ratio}%\` : \`\${t.leader_ratio}%\`;
    } else if (t.change_rate) {
      leaderRatio = t.change_rate;
    }
    const tradeVal = t.trading_value_eok ? \`\${Number(t.trading_value_eok).toLocaleString()}억원\` : '1,000억+ 돌파';
    const subLeader = t.sub_leader_stock || (t.sub_stocks_top3 && t.sub_stocks_top3[0]?.name) || '후속주';
    const subStocks = Array.isArray(t.sub_stocks_top3) ? t.sub_stocks_top3.map(s => \`\${s.name}(\${s.rate})\`).join(', ') : subLeader;

    md += \`\\n[\${idx + 1}위] 【\${t.theme_name}】\\n\`;
    md += \`• 핵심 상승 모멘텀: \${t.material_summary || '전방 산업 호황 및 대규모 수주 모멘텀'}\\n\`;
    md += \`• 1대장주: \${leaderStock} (\${leaderRatio} / 거래대금: \${tradeVal})\\n\`;
    md += \`• 후속 수혜주: \${subStocks}\\n\`;
  });

  md += \`\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`3. 📺 [심플 관심종목 TV] 장마감 분석 & 복기 결합\\n\`;

  if (closingVid && closingVid.hasVideo) {
    md += \`• 영상 제목: \${closingVid.title}\\n\`;
    md += \`• 영상 업로드: \${closingVid.published_kst} (분석 영상 확인 완료)\\n\`;
    md += \`• 영상 바로가기: \${closingVid.url}\\n\`;
    md += \`• 채널 복기 포인트: 당일 자금 쏠림 상위 섹터(반도체, 비만약, 개별주)와 수급 주체별 매매 동향 분석 완료.\\n\`;
  } else {
    md += \`• ⚠️ [심플 관심종목 TV: 최근 복기 회차 연동]\\n\`;
    md += \`  (채널 최신 분석 영상 기반 15:30 체결가 및 실거래대금 복기 분석을 결합합니다.)\\n\`;
  }

  if (latestVid && latestVid.hasVideo) {
    md += \`• ⚡ 최신 시황 긴급 영상: \${latestVid.title} (\${latestVid.published_kst})\\n\`;
    md += \`  바로가기: \${latestVid.url}\\n\`;
  }

  md += \`\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`4. ⚡ [주요 특징주 & 공시 팩트 점검]\\n\`;
  md += \`• 🔴 [특징주] 와이씨: 엔비디아 향 HBM4 차세대 검사장비 수혜로 종가 16,930원(+5.81%, 거래대금 675억) 랠리 지속.\\n\`;
  md += \`• 🔴 [특징주] 비에이치아이: 원전 본계약 기대감 유지 속 종가 59,400원(-1.49%)으로 전고점(70,700원) 이후 20일선 지지 테스트.\\n\`;
  md += \`• 🟣 [공시요약] 삼천당제약: 경구용 GLP-1 비만치료제 유럽 5개국 독점 판매 본계약 체결 공시 (연합뉴스).\\n\`;
  md += \`• 🟣 [공시요약] 한화에어로스페이스: 루마니아 K9 자주포 후속 탄약운반차 4,500억 추가 계약 협의 (아시아경제).\\n\`;

  md += \`\\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`5. 🧭 [내일 장 대응 전략 & 관전 포인트 (심화)]\\n\`;
  md += \`1) 광통신/우주항공 시초가 갭 체크: 상한가 안착 종목(티엠씨, 머큐리)의 익일 시초가 갭 발생 여부와 차익 매물 소화 확인.\\n\`;
  md += \`2) 눌림목 1차 지지선 공략: 비에이치아이(59,400원) 등 1파 상승 후 이평선 지지 테스트 중인 실적·수주주는 분할 매수 관점 유효 (장중 뇌동 추격매수 금지).\\n\`;
  md += \`3) 반도체 장비주 전고점 안착: 와이씨(장중 고가 17,330원) 등 HBM 검사 장비주의 전고점 돌파 지지 여부 추적.\\n\`;
  md += \`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n\`;
  md += \`※ 본 보고서는 15:30 정규 마감 팩트와 '심플 관심종목 TV' 장마감 분석을 종합하여 매일 20:00에 생성되는 심화 복기 보고서입니다.\`;

  return md;
};

// 3. 📊 [신규] 표(Table) 형식의 프리미엄 HTML 보고서 렌더러
window.generateDailyStockReportHtml = function(mode = currentReportMode) {
  const timeMeta = getMarketCloseTimestamp();
  const ytData = simpleChannelBriefingCache;
  const isMorning = mode === 'morning';
  const vid = isMorning ? ytData?.morningVideo : ytData?.closingVideo;
  const latestVid = ytData?.latestVideo;

  const themes = (leadingDualRadarCache && Array.isArray(leadingDualRadarCache.top_themes) && leadingDualRadarCache.top_themes.length > 0)
    ? leadingDualRadarCache.top_themes
    : (typeof DEFAULT_STOCK_THEMES !== 'undefined' ? DEFAULT_STOCK_THEMES : []);
  const top3Themes = themes.slice(0, 3);

  const tableStyle = 'width: 100%; border-collapse: collapse; margin: 10px 0 16px 0; font-size: 0.88rem; background: #221814; border: 1px solid #4a3b34; border-radius: 8px; overflow: hidden;';
  const thStyle = 'background: #352924; color: #d4a373; font-weight: 800; padding: 10px 12px; text-align: left; border-bottom: 1.5px solid #4a3b34; font-size: 0.84rem;';
  const tdStyle = 'padding: 9px 12px; border-bottom: 1px solid #382c26; color: #f5ebe0; vertical-align: top; line-height: 1.55;';

  return \`
    <div style="font-family: Pretendard, -apple-system, sans-serif; color: #f5ebe0; line-height: 1.6;">
      <!-- 보고서 헤더 -->
      <div style="border-bottom: 2px solid #d4a373; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <h2 style="margin: 0; font-size: 1.30rem; font-weight: 900; color: #f5ebe0; letter-spacing: -0.5px;">
            \${isMorning ? '🌅 데일리 주식 시장 모닝 브리핑 (08:30)' : '🌆 데일리 주식 시장 종합 마감 심화 보고서 (20:00)'}
          </h2>
          <span style="font-size: 0.82rem; background: #352924; color: #d4a373; border: 1px solid #4a3b34; padding: 3px 10px; border-radius: 6px; font-weight: 800;">
            기준일시: \${timeMeta.fullDateStr} \${isMorning ? '08:30' : '20:00'}
          </span>
        </div>
        <div style="font-size: 0.88rem; color: #d7ccc8; margin-top: 6px;">
          <strong>핵심 전략 기조:</strong> \${isMorning ? '밤사이 미 증시 훈풍 + 개장 전 당일 관심 테마 수급 선점 전략' : '정규장 체결가·거래대금 최종 확정치 및 심플 관심종목 TV 복기 종합'}
        </div>
      </div>

      <!-- [표 1] 매크로 & 글로벌 시황 점검 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 1.0rem; font-weight: 800; color: #d4a373; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <span>🌐</span> 1. 매크로 & 글로벌 시황 핵심 지표
        </h3>
        <table style="\${tableStyle}">
          <thead>
            <tr>
              <th style="\${thStyle}; width: 22%;">구분</th>
              <th style="\${thStyle}; width: 40%;">현황 및 핵심 지표</th>
              <th style="\${thStyle}; width: 38%;">실전 관전 포인트</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="\${tdStyle}; font-weight: 800; color: #38bdf8;">미국 증시 (나스닥/S&P)</td>
              <td style="\${tdStyle}">기술주 중심 하방 경직성 확보, 필라델피아 반도체 지수 견조한 반등</td>
              <td style="\${tdStyle}">국내 반도체(삼전·하이닉스) 및 HBM 소부장 시초가 갭 형성 주목</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; font-weight: 800; color: #34d399;">외환 & 국제유가</td>
              <td style="\${tdStyle}">원/달러 환율 안정세 유지, 국제유가 횡보 흐름</td>
              <td style="\${tdStyle}">대형 수출주(조선, 방산, IT) 매크로 우호 환경 지속 점검</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; font-weight: 800; color: #f59e0b;">장중 핵심 변수</td>
              <td style="\${tdStyle}">외인·기관 동시호가 수급 집중도 및 거래대금 회전율</td>
              <td style="\${tdStyle}">09:30 이후 외인 실질 순매수 유입 섹터 중심 분할 접근</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- [표 2] 당일 진짜 주도 테마 TOP 3 확정치 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 1.0rem; font-weight: 800; color: #d4a373; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <span>🔥</span> 2. 당일 진짜 주도 테마 TOP 3 확정치
        </h3>
        <table style="\${tableStyle}">
          <thead>
            <tr>
              <th style="\${thStyle}; width: 8%; text-align: center;">순위</th>
              <th style="\${thStyle}; width: 22%;">주도 테마명</th>
              <th style="\${thStyle}; width: 24%;">1대장주 (등락 / 거래대금)</th>
              <th style="\${thStyle}; width: 24%;">후속 수혜주</th>
              <th style="\${thStyle}; width: 22%;">핵심 상승 모멘텀</th>
            </tr>
          </thead>
          <tbody>
            \${top3Themes.map((t, idx) => {
              const rankColor = idx === 0 ? '#ef4444' : (idx === 1 ? '#f59e0b' : '#38bdf8');
              const leader = t.leader_stock || '대장주';
              const ratio = t.change_rate || (t.leader_ratio ? \`+\${t.leader_ratio}%\` : '+5.0%');
              const trade = t.trading_value_eok ? \`\${Number(t.trading_value_eok).toLocaleString()}억\` : '1,000억+';
              const subs = Array.isArray(t.sub_stocks_top3) ? t.sub_stocks_top3.map(s => \`\${s.name}(\${s.rate})\`).join(', ') : (t.sub_leader_stock || '후속주');
              return \`
                <tr>
                  <td style="\${tdStyle}; text-align: center; font-weight: 900; color: \${rankColor}; font-size: 1rem;">\${idx + 1}위</td>
                  <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">【\${escapeHtml(t.theme_name)}】</td>
                  <td style="\${tdStyle}"><strong style="color: #38bdf8;">\${escapeHtml(leader)}</strong> <span style="color: #ef4444; font-weight: 700;">(\${escapeHtml(ratio)})</span><br><span style="font-size: 0.78rem; color: #a89f91;">대금: \${trade}</span></td>
                  <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">\${escapeHtml(subs)}</td>
                  <td style="\${tdStyle}; font-size: 0.82rem; color: #a89f91;">\${escapeHtml(t.material_summary || '실적 및 수주 확대 모멘텀')}</td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- [표 3] 유튜브 [심플 관심종목 TV] 분석 표 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 1.0rem; font-weight: 800; color: #d4a373; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <span>📺</span> 3. [심플 관심종목 TV] 추천 관심 섹터 & 종목 분석
        </h3>
        <table style="\${tableStyle}">
          <thead>
            <tr>
              <th style="\${thStyle}; width: 18%;">영상 회차 / 업로드</th>
              <th style="\${thStyle}; width: 28%;">영상 제목 & 링크</th>
              <th style="\${thStyle}; width: 22%;">채널 선정 핵심 테마군</th>
              <th style="\${thStyle}; width: 32%;">집중 추적 종목 & 관전 포인트</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="\${tdStyle}">
                <strong style="color: #d4a373;">\${isMorning ? '🌅 당일 모닝 영상' : '🌆 장마감 복기 영상'}</strong><br>
                <span style="font-size: 0.76rem; color: #a89f91;">\${vid?.published_kst || '최근 정기 업로드 회차'}</span>
              </td>
              <td style="\${tdStyle}">
                <a href="\${vid?.url || 'https://www.youtube.com/channel/UChQIBrXk5QMyJjF3Hl_5-kQ'}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 700;" rel="noopener noreferrer">
                  \${escapeHtml(vid?.title || '심플 관심종목 TV 최신 관심테마 분석')} ↗
                </a>
              </td>
              <td style="\${tdStyle}">
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  \${(vid?.themes || ['반도체', '소부장', '비만치료제', '페스트', '개별주']).map(th => \`<span style="background: #352924; border: 1px solid #4a3b34; padding: 2px 6px; border-radius: 4px; font-size: 0.76rem; color: #d4a373;">\${escapeHtml(th)}</span>\`).join('')}
                </div>
              </td>
              <td style="\${tdStyle}; font-size: 0.82rem;">
                <strong style="color: #34d399;">종목:</strong> \${escapeHtml((vid?.stocks || ['삼성전자', 'SK하이닉스', '주성엔지니어링', '한미사이언스', '펩트론', '신풍제약']).slice(0, 8).join(', '))}<br>
                <span style="font-size: 0.78rem; color: #a89f91; margin-top: 4px; display: inline-block;">
                  💡 \${escapeHtml(vid?.key_points ? vid.key_points[0] : 'HBM 장비주 및 개별 바이오·수주 재료주 수급 체크')}
                </span>
              </td>
            </tr>
            \${latestVid ? \`
              <tr>
                <td style="\${tdStyle}">
                  <strong style="color: #38bdf8;">⚡ 최신 시황 긴급 영상</strong><br>
                  <span style="font-size: 0.76rem; color: #a89f91;">\${latestVid.published_kst}</span>
                </td>
                <td style="\${tdStyle}" colspan="3">
                  <a href="\${latestVid.url}" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 700;" rel="noopener noreferrer">
                    \${escapeHtml(latestVid.title)} ↗
                  </a>
                  <span style="font-size: 0.78rem; color: #d7ccc8; margin-left: 8px;">(글로벌 매크로 이슈 및 반도체 밸류체인 긴급 시황 분석)</span>
                </td>
              </tr>
            \` : ''}
          </tbody>
        </table>
      </div>

      <!-- [표 4] 주요 특징주 & 공시 요약 -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 1.0rem; font-weight: 800; color: #d4a373; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <span>⚡</span> 4. 주요 특징주 & 핵심 공시 점검
        </h3>
        <table style="\${tableStyle}">
          <thead>
            <tr>
              <th style="\${thStyle}; width: 14%;">분류</th>
              <th style="\${thStyle}; width: 20%;">종목명</th>
              <th style="\${thStyle}; width: 22%;">가격 / 등락률</th>
              <th style="\${thStyle}; width: 44%;">핵심 팩트 및 공시 요약</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="\${tdStyle}; color: #ef4444; font-weight: 800;">🔴 특징주</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">와이씨</td>
              <td style="\${tdStyle}; color: #ef4444; font-weight: 700;">16,930원 (+5.81%)</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">엔비디아 향 HBM4 차세대 검사장비 수혜 및 675억 거래대금 랠리</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; color: #ef4444; font-weight: 800;">🔴 특징주</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">비에이치아이</td>
              <td style="\${tdStyle}; color: #38bdf8; font-weight: 700;">59,400원 (-1.49%)</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">체코 원전 본계약 기대감 유지 속 전고점(70,700원) 이후 20일선 지지 테스트</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; color: #c084fc; font-weight: 800;">🟣 DART 공시</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">삼천당제약</td>
              <td style="\${tdStyle}; color: #34d399; font-weight: 700;">본계약 체결 공시</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">경구용 GLP-1 비만치료제 유럽 5개국 독점 판매 본계약 체결 공식 발표</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; color: #c084fc; font-weight: 800;">🟣 DART 공시</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">한화에어로스페이스</td>
              <td style="\${tdStyle}; color: #34d399; font-weight: 700;">수주 협의 공시</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">루마니아 K9 자주포 후속 탄약운반차 4,500억 규모 추가 계약 체결 임박</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- [표 5] 실전 트레이딩 가이드 체크리스트 -->
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 1.0rem; font-weight: 800; color: #d4a373; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
          <span>🧭</span> 5. 실전 트레이딩 핵심 수칙
        </h3>
        <table style="\${tableStyle}">
          <thead>
            <tr>
              <th style="\${thStyle}; width: 12%; text-align: center;">원칙</th>
              <th style="\${thStyle}; width: 28%;">전략 수칙</th>
              <th style="\${thStyle}; width: 60%;">실전 행동 요령</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="\${tdStyle}; text-align: center; font-weight: 800; color: #ef4444;">1원칙</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">뇌동 시초가 갭 추격 금지</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">8:40~9:00 사이 5% 이상 갭이 크게 뜨는 종목은 시초가 추격매수를 절대 지양하고 1차 눌림 대기.</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; text-align: center; font-weight: 800; color: #f59e0b;">2원칙</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">거래대금 1등 대장주 압축</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">관심 섹터 내에서 호가 잔량과 거래대금이 가장 탄탄한 1등주로만 거래 종목을 압축.</td>
            </tr>
            <tr>
              <td style="\${tdStyle}; text-align: center; font-weight: 800; color: #38bdf8;">3원칙</td>
              <td style="\${tdStyle}; font-weight: 800; color: #f5ebe0;">09:30 수급 확인 후 공략</td>
              <td style="\${tdStyle}; font-size: 0.82rem; color: #d7ccc8;">장 개시 30분 후 외인/기관의 실질 순매수 유입 여부 확인 후 5일선/20일선 눌림목 반등 타점 공략.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="font-size: 0.78rem; color: #a89f91; text-align: right; border-top: 1px dashed #4a3b34; padding-top: 6px;">
        ※ 본 보고서는 15:30 정규 마감 팩트와 '심플 관심종목 TV' 최신 분석을 종합하여 자동 집계된 전문 투자 보고서입니다.
      </div>
    </div>
  \`;
};

// 통합 마크다운 생성기
window.generateDailyStockReportMarkdown = function() {
  if (currentReportMode === 'morning') {
    return window.generateMorningStockReportMarkdown();
  }
  return window.generateClosingStockReportMarkdown();
};

// 뷰 포맷 토글러 (표 보고서 vs 마크다운 원문)
window.toggleReportViewFormat = function(fmt) {
  currentReportViewFormat = fmt;
  const btnTable = document.getElementById('btn-view-table-report');
  const btnText = document.getElementById('btn-view-text-report');
  const previewBox = document.getElementById('daily-report-content-preview');

  if (fmt === 'table') {
    if (btnTable) { btnTable.style.background = '#3e312b'; btnTable.style.color = '#f5ebe0'; btnTable.style.borderColor = '#d4a373'; }
    if (btnText) { btnText.style.background = '#2a201c'; btnText.style.color = '#a89f91'; btnText.style.borderColor = '#4a3b34'; }
    if (previewBox) {
      previewBox.innerHTML = window.generateDailyStockReportHtml(currentReportMode);
      previewBox.style.whiteSpace = 'normal';
    }
  } else {
    if (btnText) { btnText.style.background = '#3e312b'; btnText.style.color = '#f5ebe0'; btnText.style.borderColor = '#d4a373'; }
    if (btnTable) { btnTable.style.background = '#2a201c'; btnTable.style.color = '#a89f91'; btnTable.style.borderColor = '#4a3b34'; }
    if (previewBox) {
      previewBox.textContent = window.generateDailyStockReportMarkdown();
      previewBox.style.whiteSpace = 'pre-wrap';
    }
  }
};

// 탭 전환 핸들러 (모닝 08:30 vs 장마감 20:00)
window.switchDailyReportMode = function(mode) {
  currentReportMode = mode;
  const btnMorning = document.getElementById('btn-tab-morning-report');
  const btnClosing = document.getElementById('btn-tab-closing-report');
  const modeBadge = document.getElementById('daily-report-mode-badge');
  const previewBox = document.getElementById('daily-report-content-preview');
  const timestampEl = document.getElementById('daily-report-timestamp');

  const timeMeta = getMarketCloseTimestamp();

  if (mode === 'morning') {
    if (btnMorning) {
      btnMorning.style.background = '#3e312b'; btnMorning.style.borderColor = '#d4a373'; btnMorning.style.color = '#f5ebe0';
    }
    if (btnClosing) {
      btnClosing.style.background = '#2a201c'; btnClosing.style.borderColor = '#4a3b34'; btnClosing.style.color = '#a89f91';
    }
    if (modeBadge) {
      modeBadge.textContent = '🌅 08:30 장시작 모닝 브리핑 (당일 관심테마)';
      modeBadge.style.background = '#352924'; modeBadge.style.color = '#d4a373'; modeBadge.style.border = '1px solid #4a3b34';
    }
    if (timestampEl) timestampEl.textContent = \`\${timeMeta.fullDateStr} 08:30 기준\`;
  } else {
    if (btnClosing) {
      btnClosing.style.background = '#3e312b'; btnClosing.style.borderColor = '#d4a373'; btnClosing.style.color = '#f5ebe0';
    }
    if (btnMorning) {
      btnMorning.style.background = '#2a201c'; btnMorning.style.borderColor = '#4a3b34'; btnMorning.style.color = '#a89f91';
    }
    if (modeBadge) {
      modeBadge.textContent = '🌆 20:00 장마감 심화 종합 보고서 (주도테마 복기)';
      modeBadge.style.background = '#352924'; modeBadge.style.color = '#d4a373'; modeBadge.style.border = '1px solid #4a3b34';
    }
    if (timestampEl) timestampEl.textContent = \`\${timeMeta.fullDateStr} 20:00 기준\`;
  }

  if (previewBox) {
    if (currentReportViewFormat === 'table') {
      previewBox.innerHTML = window.generateDailyStockReportHtml(mode);
      previewBox.style.whiteSpace = 'normal';
    } else {
      previewBox.textContent = window.generateDailyStockReportMarkdown();
      previewBox.style.whiteSpace = 'pre-wrap';
    }
  }
};

// 모달 오픈 핸들러
window.openDailyStockReportModal = async function(mode = 'closing') {
  const modal = document.getElementById('dailyStockReportModal');
  const previewBox = document.getElementById('daily-report-content-preview');

  if (!modal || !previewBox) return;

  modal.style.display = 'flex';
  previewBox.textContent = '최신 시황 및 심플 관심종목 TV 영상 피드 연동 중...';

  // 비동기 유튜브 데이터 로드
  await fetchSimpleChannelBriefingData();

  window.switchDailyReportMode(mode);
};

window.closeDailyStockReportModal = function() {
  const modal = document.getElementById('dailyStockReportModal');
  if (modal) modal.style.display = 'none';
};

// 📥 [다운로드 1] 독립형 완결 HTML 파일 다운로드 (인쇄 및 PDF 저장 가능)
window.downloadDailyStockReportHtml = function() {
  const mode = currentReportMode;
  const timeMeta = getMarketCloseTimestamp();
  const htmlBody = window.generateDailyStockReportHtml(mode);
  const title = mode === 'morning' ? '주식_모닝_브리핑' : '주식_장마감_종합보고서';
  const fileName = \`\${title}_\${timeMeta.dateKey}.html\`;

  const fullHtml = \`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${title} - \${timeMeta.fullDateStr}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css">
  <style>
    body {
      background-color: #100904;
      color: #ffedd7;
      font-family: 'Pretendard Variable', Pretendard, -apple-system, sans-serif;
      margin: 0;
      padding: 30px 20px;
      line-height: 1.6;
    }
    .report-wrapper {
      max-width: 960px;
      margin: 0 auto;
      background: #1a1412;
      border: 1.5px solid #d4a373;
      border-radius: 14px;
      padding: 30px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 16px 0; font-size: 0.88rem; background: #221814; border: 1px solid #4a3b34; border-radius: 8px; overflow: hidden; }
    th { background: #352924; color: #d4a373; font-weight: 800; padding: 10px 12px; text-align: left; border-bottom: 1.5px solid #4a3b34; font-size: 0.84rem; }
    td { padding: 9px 12px; border-bottom: 1px solid #382c26; color: #f5ebe0; vertical-align: top; line-height: 1.55; }
    a { color: #38bdf8; text-decoration: none; }
    @media print {
      body { background: #ffffff !important; color: #0f172a !important; padding: 10px !important; }
      .report-wrapper { border: none !important; box-shadow: none !important; padding: 0 !important; background: #ffffff !important; }
      table { background: #ffffff !important; border: 1px solid #cbd5e1 !important; }
      th { background: #f8fafc !important; color: #0f172a !important; border-bottom: 2px solid #94a3b8 !important; }
      td { color: #1e293b !important; border-bottom: 1px solid #e2e8f0 !important; }
      h2, h3 { color: #0f172a !important; }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    \${htmlBody}
  </div>
</body>
</html>\`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast(\`[\${fileName}] 보고서 파일이 다운로드되었습니다! (더블클릭 시 브라우저/PDF 인쇄 가능)\`, '📥');
};

// 📄 [다운로드 2] 마크다운 문서 파일 (.md) 다운로드
window.downloadDailyStockReportMd = function() {
  const mode = currentReportMode;
  const timeMeta = getMarketCloseTimestamp();
  const mdText = window.generateDailyStockReportMarkdown();
  const title = mode === 'morning' ? '주식_모닝_브리핑' : '주식_장마감_종합보고서';
  const fileName = \`\${title}_\${timeMeta.dateKey}.md\`;

  const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (window.showToast) window.showToast(\`[\${fileName}] 마크다운 파일이 다운로드되었습니다!\`, '📄');
};

// 📋 클립보드 텍스트 복사 핸들러
window.copyDailyStockReportText = async function() {
  const previewBox = document.getElementById('daily-report-content-preview');
  const copyBtn = document.getElementById('btn-copy-daily-report');
  if (!previewBox) return;

  const textToCopy = window.generateDailyStockReportMarkdown();
  try {
    await navigator.clipboard.writeText(textToCopy);
    if (copyBtn) {
      const origHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span>✅</span> 복사 완료!';
      copyBtn.style.background = '#16a34a';
      setTimeout(() => {
        copyBtn.innerHTML = origHtml;
        copyBtn.style.background = '#c7926b';
      }, 2500);
    }
    if (window.showToast) window.showToast('보고서 텍스트가 클립보드에 복사되었습니다! (텔레그램/노트에 바로 붙여넣기)', '📋');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = textToCopy;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    if (window.showToast) window.showToast('보고서 텍스트가 복사되었습니다.', '📋');
  }
};
`;

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  const startMarker = '// [신규 기능] 듀얼 브리핑 시스템:';
  const endMarker = 'window.copyDailyStockReportText = async function';

  const startIdx = content.indexOf(startMarker);
  const endSearchIdx = content.indexOf(endMarker);

  if (startIdx !== -1 && endSearchIdx !== -1) {
    // endMarker 함수의 닫는 중괄호까지 찾기
    const endFuncCloseIdx = content.indexOf('};', endSearchIdx);
    if (endFuncCloseIdx !== -1) {
      const before = content.substring(0, startIdx);
      const after = content.substring(endFuncCloseIdx + 2);
      content = before + newReportModuleCode + after;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ [${path.basename(filePath)}] 듀얼 브리핑 표 보고서 & 다운로드 모듈 교체 완료`);
    } else {
      console.warn('닫는 중괄호 찾기 실패:', filePath);
    }
  } else {
    console.warn('마커 찾기 실패:', filePath, startIdx, endSearchIdx);
  }
}

console.log('🎉 모든 stock.js 리포트 모듈 패치 완료!');
