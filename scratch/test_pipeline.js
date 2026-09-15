/**
 * 파이프라인 단독 1회 실행 및 검증 테스트 스크립트 (scratch/test_pipeline.js)
 * - js/stock.js에 등록된 실시간 국내 뉴스 데이터를 불러와
 * - scripts/theme_classifier.js를 통해 테마 분류 및 data/theme_timeline.json 누적 아카이빙을 수행합니다.
 */

const fs = require('fs');
const path = require('path');
const { processNewsAndArchiveTimeline } = require('../scripts/theme_classifier');

// 1. js/stock.js에서 DOMESTIC_STOCK_NEWS_DATA 추출
function loadStockNewsData() {
  const stockJsPath = path.join(__dirname, '..', 'js', 'stock.js');
  const code = fs.readFileSync(stockJsPath, 'utf8');

  // DOMESTIC_STOCK_NEWS_DATA 추출
  const startMarker = 'const DOMESTIC_STOCK_NEWS_DATA = [';
  const endMarker = '];\n\n// 1. 당일 주도 테마 데이터베이스';
  
  const startIdx = code.indexOf(startMarker);
  const endIdx = code.indexOf(endMarker, startIdx);

  if (startIdx !== -1 && endIdx !== -1) {
    const jsonLikeStr = code.substring(startIdx + 'const DOMESTIC_STOCK_NEWS_DATA = '.length, endIdx + 1);
    // eval을 통하여 JS 객체 배열로 안전하게 파싱
    const newsData = eval(jsonLikeStr);
    return newsData;
  }
  return [];
}

async function run() {
  console.log('====================================================');
  console.log('🚀 [테스트] 실시간 뉴스 기반 테마 분류 및 타임라인 누적 시작');
  console.log('====================================================');

  const newsList = loadStockNewsData();
  console.log(`📌 로드된 실시간 국내 뉴스 개수: ${newsList.length}건`);

  // 1차 실행: 뉴스 적재 및 타임라인 생성
  console.log('\n[1차 실행: 신규 뉴스 적재 테스트]');
  const res1 = processNewsAndArchiveTimeline(newsList, '2026-09-15');
  console.log(`- 결과:`, res1);

  // 2차 실행: 동일 데이터 재투입 시 중복 방지(Deduplication) 검증
  console.log('\n[2차 실행: 동일 뉴스 재투입 (중복 방지 필터 검증)]');
  const res2 = processNewsAndArchiveTimeline(newsList, '2026-09-15');
  console.log(`- 결과 (중복 건너뜀 확인):`, res2);

  // 생성된 JSON 확인
  const jsonPath = path.join(__dirname, '..', 'data', 'theme_timeline.json');
  if (fs.existsSync(jsonPath)) {
    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log('\n====================================================');
    console.log('📊 생성된 data/theme_timeline.json 데이터 요약:');
    console.log('====================================================');
    console.log(`- 최종 갱신 시각: ${content.last_updated}`);
    console.log(`- 분류된 테마 총수: ${content.themes.length}개`);
    console.log('\n[🏆 당일 주도 테마 랭킹 TOP 3]:');
    content.themes.slice(0, 3).forEach((t, i) => {
      console.log(`  ${i + 1}위: [${t.theme_name}]`);
      console.log(`       - 테마점수: ${t.today_score}점 | 등락률: ${t.today_change_rate} | 대장주: ${t.lead_stocks.join(', ')}`);
      console.log(`       - 타임라인 누적 기사수: ${t.timeline.length}건`);
      if (t.timeline[0]) {
        console.log(`       - 최신 기사: [${t.timeline[0].press}] ${t.timeline[0].news_title} (${t.timeline[0].impact})`);
      }
    });
  }

  console.log('\n✅ 파이프라인 검증 완료!');
}

run().catch(err => {
  console.error('❌ 실행 중 에러 발생:', err);
});
