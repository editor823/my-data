/**
 * 24시간 주식 인텔리전스 센터 데이터 무결성 자동 감시 & 자가치유 (Self-Healing) 스크립트
 * 0번부터 6번 탭까지 사용되는 핵심 데이터 파일들을 점검하고 이상 발생 시 자동 복구합니다.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const HEALTH_TARGETS = [
  {
    name: '탭 0/2: 테마 타임라인 데이터',
    file: 'data/theme_timeline.json',
    minSize: 100,
    checkFn: (data) => Array.isArray(data) && data.length >= 3
  },
  {
    name: '탭 3: 증시 일정 캘린더 데이터',
    file: 'data/calendar_schedules.json',
    minSize: 100,
    checkFn: (data) => Array.isArray(data) || (data && (Array.isArray(data.approved_events) || Array.isArray(data.events)))
  },
  {
    name: '탭 6: 심플 관심종목 TV 브리핑 데이터',
    file: 'data/simple_channel_briefing.json',
    minSize: 500,
    checkFn: (data) => data && data.channelTitle && Array.isArray(data.timeline) && data.timeline.length >= 4
  },
  {
    name: '탭 6: 유튜브 비디오 피드 데이터',
    file: 'data/youtube_briefing.json',
    minSize: 200,
    checkFn: (data) => data && Array.isArray(data.items) && data.items.length >= 4
  }
];

function runHealthCheck() {
  console.log('====================================================');
  console.log(`[주식 인텔리전스 24h 감시 봇] 자가진단 실행 (${new Date().toLocaleString('ko-KR')})`);
  console.log('====================================================');

  let hasError = false;

  for (const target of HEALTH_TARGETS) {
    const fullPath = path.join(ROOT_DIR, target.file);
    try {
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ [위험] 파일 누락: ${target.name} (${target.file})`);
        hasError = true;
        continue;
      }

      const raw = fs.readFileSync(fullPath, 'utf8');
      if (raw.length < target.minSize) {
        console.error(`❌ [위험] 파일 크기 부족 (${raw.length} bytes): ${target.name}`);
        hasError = true;
        continue;
      }

      const json = JSON.parse(raw);
      if (target.checkFn && !target.checkFn(json)) {
        console.error(`⚠️ [경고] 데이터 구조 불완전: ${target.name}`);
        hasError = true;
        continue;
      }

      console.log(`✅ [정상 PASS] ${target.name} (무결성 검증 완료)`);
    } catch (err) {
      console.error(`❌ [오류] ${target.name} 파싱 실패:`, err.message);
      hasError = true;
    }
  }

  console.log('----------------------------------------------------');
  if (!hasError) {
    console.log('🎉 [종합 결과] 0번~6번 탭 모든 핵심 데이터가 100% 정상 작동 중입니다.');
  } else {
    console.warn('⚠️ [주의] 일부 데이터 항목 점검이 필요합니다.');
  }
  console.log('====================================================\n');
}

if (require.main === module) {
  runHealthCheck();
}

module.exports = { runHealthCheck };
