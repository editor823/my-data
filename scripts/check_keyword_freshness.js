/**
 * 블로그 키워드 데이터 신선도 검사 (daily_collector.yml 에서 수집·커밋 직후 실행)
 *
 * 수집 스크립트는 원본 수집에 실패해도 이전 데이터를 그대로 두고 "성공"으로 끝나기 때문에,
 * 여기서 각 데이터의 갱신 시각을 직접 확인해 오래된 데이터가 있으면 실패(exit 1)로 처리한다.
 * → 워크플로가 실패하면 텔레그램 알림이 발송된다.
 *
 * 사용: node scripts/check_keyword_freshness.js [--report <path>]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOUR = 3600 * 1000;

// maxAgeHours: 이 시간보다 오래되면 "멈춤"으로 판단 (GitHub 예약 실행 지연·누락을 감안해 여유 있게 설정)
// level: 'fail' = 워크플로 실패 + 알림, 'warn' = 경고만 기록
const CHECKS = [
  { name: '실시간 급상승어', file: 'data/trending_live.json', fields: ['updatedAt'], maxAgeHours: 12, level: 'fail' },
  { name: '실시간 숏텐츠', file: 'data/shortents_live.json', fields: ['updatedAt'], maxAgeHours: 12, level: 'fail' },
  { name: '곧 뜰 숏텐츠 후보', file: 'data/shortents_predictions.json', fields: ['generatedAt', 'updatedAt'], maxAgeHours: 36, level: 'fail' },
  { name: '키워드센터', file: 'data/keyword_center_live.json', fields: ['generatedAt', 'updatedAt'], maxAgeHours: 36, level: 'fail' },
  { name: '비밀 키워드', file: 'data/secret_keywords_live.json', fields: ['refreshedAt', 'generatedAt'], maxAgeHours: 36, level: 'fail' },
  // 시즌 캘린더는 월별(months[]) 항목마다 generatedAt 이 있어 가장 최근 값을 사용
  { name: '시즌 캘린더', file: 'data/seasonal_calendar_live.json', fields: ['generatedAt', 'updatedAt'], maxAgeHours: 24 * 14, level: 'warn',
    getTs: d => (Array.isArray(d.months) ? d.months.map(m => m && m.generatedAt).filter(Boolean).sort().pop() : null) }
];

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (e) {
    return { __error: e.message };
  }
}

function fmtKst(ms) {
  return new Date(ms + 9 * HOUR).toISOString().replace('T', ' ').slice(0, 16) + ' KST';
}

const now = Date.now();
const lines = [];
const failures = [];
const warnings = [];

CHECKS.forEach(c => {
  const data = readJson(c.file);
  if (data.__error) {
    const msg = `${c.name}: 파일을 읽을 수 없음 (${data.__error})`;
    (c.level === 'fail' ? failures : warnings).push(msg);
    lines.push(`${c.level === 'fail' ? '❌' : '⚠️'} ${msg}`);
    return;
  }
  const raw = c.fields.map(f => data[f]).find(Boolean) || (c.getTs ? c.getTs(data) : null);
  const ts = raw ? Date.parse(raw) : NaN;
  if (isNaN(ts)) {
    const msg = `${c.name}: 갱신 시각 필드(${c.fields.join('/')}) 없음`;
    (c.level === 'fail' ? failures : warnings).push(msg);
    lines.push(`${c.level === 'fail' ? '❌' : '⚠️'} ${msg}`);
    return;
  }
  const ageH = (now - ts) / HOUR;
  const ok = ageH <= c.maxAgeHours;
  const label = `${c.name}: ${fmtKst(ts)} (${ageH.toFixed(1)}시간 전, 기준 ${c.maxAgeHours}시간)`;
  if (ok) {
    lines.push(`✅ ${label}`);
  } else {
    (c.level === 'fail' ? failures : warnings).push(label);
    lines.push(`${c.level === 'fail' ? '❌' : '⚠️'} ${label}`);
  }
});

// 급상승어 포털별 빈 목록 확인 (일시적인 원본 오류가 잦아 경고만)
const trending = readJson('data/trending_live.json');
const portals = (trending && (trending.trending || trending.data)) || {};
['naver', 'nate', 'zum', 'google', 'daum'].forEach(p => {
  if (!Array.isArray(portals[p]) || portals[p].length === 0) {
    const msg = `급상승어 ${p} 목록 비어 있음`;
    warnings.push(msg);
    lines.push(`⚠️ ${msg}`);
  }
});

const report = [
  `[블로그 키워드 신선도 검사] ${fmtKst(now)}`,
  ...lines,
  failures.length ? `\n멈춘 데이터 ${failures.length}건 → 원본 사이트 응답 또는 수집 스크립트를 확인하세요.` : '\n모든 핵심 데이터 정상 갱신 중'
].join('\n');

console.log(report);

const reportIdx = process.argv.indexOf('--report');
if (reportIdx > -1 && process.argv[reportIdx + 1]) {
  fs.writeFileSync(process.argv[reportIdx + 1], report, 'utf8');
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '```\n' + report + '\n```\n');
}

process.exit(failures.length ? 1 : 0);
