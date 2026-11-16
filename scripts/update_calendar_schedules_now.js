/**
 * 증시 캘린더 자동 갱신 스크립트 (GitHub Actions: update_stock.yml 에서 매일 실행)
 *
 * 일정은 세 가지 출처로 자동 생성된다.
 *   1) OFFICIAL_EVENTS  : 기관이 미리 공표한 공식 일정표 (FOMC·미국 CPI/고용·한은 금통위 등) → 정식(approved)
 *   2) 규칙 계산 일정   : 국내 옵션만기(둘째 목), 미국 쿼드러플위칭(분기월 셋째 금), 수출입동향(매월 1일),
 *                         KRX 폐장/개장일 → 정식(approved)
 *   3) 뉴스 추출 일정   : 최신 증시뉴스·테마 타임라인에서 "12월 3일 출시" 같은 미래 날짜를 정규식으로 추출
 *                         → 승인 대기(pending). 사용자가 화면에서 승인해야 정식 캘린더에 올라감.
 *
 * 지난 일정은 PAST_KEEP_DAYS 일이 지나면 자동으로 빠지고, 앞으로 HORIZON_DAYS 일까지만 표시한다.
 *
 * ⚠️ OFFICIAL_EVENTS 는 공식 일정표 기준(2026-11-16 확인). 표의 마지막 날짜가 가까워지면
 *    실행 로그에 경고가 찍히니, 그때 다음 해 일정을 추가하면 된다.
 */
const fs = require('fs');
const path = require('path');

const PAST_KEEP_DAYS = 7;   // 종료 후 며칠까지 남겨둘지
const HORIZON_DAYS = 120;   // 앞으로 몇 일까지 정식 일정을 표시할지
const NEWS_HORIZON_DAYS = 90;
const MAX_PENDING = 40;

// ───────────────────────── 날짜 유틸 (모두 KST 기준) ─────────────────────────
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const toYmd = dt => ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
const addDays = (s, n) => { const dt = parseYmd(s); dt.setUTCDate(dt.getUTCDate() + n); return toYmd(dt); };
const dayName = s => DAY_NAMES[parseYmd(s).getUTCDay()];
const diffDaysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);

const kstNowIso = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
const TODAY = kstNowIso.slice(0, 10);

function calcDDay(dateStr) {
  const diffDays = diffDaysBetween(TODAY, dateStr);
  let d_day;
  if (diffDays === 0) d_day = 'D-Day 오늘';
  else if (diffDays > 0) d_day = `D-${diffDays}`;
  else d_day = `D+${Math.abs(diffDays)} 종료`;
  return { diffDays, d_day };
}

// 해당 월의 n번째 특정 요일 (weekday: 0=일 ... 6=토)
function nthWeekday(y, m, weekday, n) {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return ymd(y, m, day);
}

// 한국 증시 휴장일 (공휴일·대체공휴일·연말휴장). 옵션만기일이 휴장일이면 직전 영업일로 당겨짐.
const KRX_HOLIDAYS = new Set([
  '2026-12-25', '2026-12-31',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-01', '2027-05-05', '2027-05-13',
  '2027-08-16', '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-04', '2027-10-11',
  '2027-12-27', '2027-12-31'
]);
const isKrxClosed = s => { const w = parseYmd(s).getUTCDay(); return w === 0 || w === 6 || KRX_HOLIDAYS.has(s); };
const prevKrxBusinessDay = s => { let d = s; while (isKrxClosed(d)) d = addDays(d, -1); return d; };
const nextKrxBusinessDay = s => { let d = s; while (isKrxClosed(d)) d = addDays(d, 1); return d; };

const naverSearch = q => `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(q)}`;

function makeEvent({ id, title, date, category, key_point, press, sourceTitle, query, status = 'approved' }) {
  const url = naverSearch(query || title);
  return {
    id,
    title,
    date,
    dateDisplay: `${date} (${dayName(date)})`,
    category,
    tag: category,
    key_point,
    desc: key_point,
    press,
    sourceTitle: sourceTitle || title,
    sourceUrl: url,
    news_url: url,
    status
  };
}

// ───────────────────────── 1) 공식 일정표 ─────────────────────────
// 출처: federalreserve.gov FOMC calendar, bls.gov CPI/Employment Situation 일정표,
//       한국은행 2027년 금통위 정기회의 예정일(2026-10-29 의결), 평가원 수능 시행계획, NVIDIA IR
// 날짜는 한국 증시에 반영되는 날(미국 발표는 대부분 한국시간 당일 밤 또는 다음날 새벽)이 아닌 현지 발표일 기준.
const FOMC = [ // [회의 시작일, 결정 발표일, 점도표 여부]
  ['2026-12-08', '2026-12-09', true],
  ['2027-01-26', '2027-01-27', false],
  ['2027-03-16', '2027-03-17', true],
  ['2027-04-27', '2027-04-28', false],
  ['2027-06-08', '2027-06-09', true],
  ['2027-07-27', '2027-07-28', false],
  ['2027-09-14', '2027-09-15', true],
  ['2027-10-26', '2027-10-27', false],
  ['2027-12-07', '2027-12-08', true]
];
const US_CPI = [ // [발표일, 기준월 라벨]
  ['2026-12-10', '2026년 11월'], ['2027-01-13', '2026년 12월'], ['2027-02-11', '1월'], ['2027-03-10', '2월'],
  ['2027-04-13', '3월'], ['2027-05-12', '4월'], ['2027-06-10', '5월'], ['2027-07-14', '6월'],
  ['2027-08-11', '7월'], ['2027-09-14', '8월'], ['2027-10-14', '9월'], ['2027-11-10', '10월'], ['2027-12-10', '11월']
];
const US_NFP = [
  ['2026-12-04', '2026년 11월'], ['2027-01-08', '2026년 12월'], ['2027-02-05', '1월'], ['2027-03-05', '2월'],
  ['2027-04-02', '3월'], ['2027-05-07', '4월'], ['2027-06-04', '5월'], ['2027-07-02', '6월'],
  ['2027-08-06', '7월'], ['2027-09-03', '8월'], ['2027-10-08', '9월'], ['2027-11-05', '10월'], ['2027-12-03', '11월']
];
const BOK_RATE = [
  '2026-11-26',
  '2027-01-14', '2027-02-25', '2027-04-09', '2027-05-27', '2027-07-15', '2027-08-26', '2027-10-15', '2027-11-25'
];
const ONE_OFF = [
  makeEvent({
    id: 'evt_20261117_nvda', date: '2026-11-17', category: 'AI·반도체',
    title: '엔비디아(NVIDIA) 2027 회계연도 3분기 실적 발표 (미 장 마감 후)',
    key_point: '[모멘텀 핵심] AI 반도체 대장주 실적·가이던스. 국내 HBM·반도체 장비주 흐름을 좌우하는 핵심 이벤트 (한국시간 11/18 새벽 발표).',
    press: 'NVIDIA IR', query: '엔비디아 3분기 실적'
  }),
  makeEvent({
    id: 'evt_20261119_csat', date: '2026-11-19', category: '증시일정',
    title: '2027학년도 대학수학능력시험 (국내 증시 1시간 늦은 10시 개장)',
    key_point: '[증시 일정] 수능 당일 유가증권·코스닥 시장 개장 및 마감 1시간 순연.',
    press: '한국교육과정평가원', query: '수능 증시 개장 시간'
  })
];

function buildOfficialEvents() {
  const list = [...ONE_OFF];
  FOMC.forEach(([start, decision, sep]) => {
    list.push(makeEvent({
      id: `evt_${decision.replace(/-/g, '')}_fomc`, date: decision, category: '거시경제·금리',
      title: `미국 FOMC 기준금리 결정 및 연준 의장 기자회견${sep ? ' (경제전망·점도표 공개)' : ''}`,
      key_point: `[모멘텀 핵심] ${start.slice(5).replace('-', '/')}~${decision.slice(5).replace('-', '/')} 정례회의. 결과는 한국시간 다음날 새벽 4시 발표.${sep ? ' 분기 점도표로 향후 금리 경로 확인.' : ''}`,
      press: '미국 연방준비제도', query: 'FOMC 기준금리 결정'
    }));
  });
  US_CPI.forEach(([date, label]) => {
    list.push(makeEvent({
      id: `evt_${date.replace(/-/g, '')}_uscpi`, date, category: '글로벌 매크로',
      title: `미국 ${label} 소비자물가지수(CPI) 발표`,
      key_point: '[모멘텀 핵심] 연준 금리 경로를 가늠하는 핵심 물가 지표. 한국시간 당일 밤 22:30(서머타임 해제 기준) 발표.',
      press: '미국 노동통계국(BLS)', query: '미국 CPI 발표'
    }));
  });
  US_NFP.forEach(([date, label]) => {
    list.push(makeEvent({
      id: `evt_${date.replace(/-/g, '')}_usnfp`, date, category: '글로벌 매크로',
      title: `미국 ${label} 고용보고서(비농업 고용·실업률) 발표`,
      key_point: '[모멘텀 핵심] 노동시장 둔화 속도를 보여주는 대표 지표. 금리 기대와 달러·성장주 방향에 직접 영향.',
      press: '미국 노동통계국(BLS)', query: '미국 고용보고서 비농업'
    }));
  });
  BOK_RATE.forEach(date => {
    list.push(makeEvent({
      id: `evt_${date.replace(/-/g, '')}_bok`, date, category: '거시경제·금리',
      title: '한국은행 금융통화위원회 통화정책방향(기준금리) 결정',
      key_point: '[모멘텀 핵심] 국내 기준금리 결정 및 총재 기자회견. 금융·건설·내수주와 원/달러 환율에 직접 영향.',
      press: '한국은행', query: '한국은행 금통위 기준금리'
    }));
  });
  return list;
}

// ───────────────────────── 2) 규칙 계산 일정 ─────────────────────────
function buildRuleEvents(fromDate, toDate) {
  const list = [];
  const start = parseYmd(fromDate);
  const end = parseYmd(toDate);
  for (let y = start.getUTCFullYear(), m = start.getUTCMonth() + 1; ; ) {
    if (Date.UTC(y, m - 1, 1) > end.getTime()) break;
    const quarterMonth = m % 3 === 0;

    // 국내 선물·옵션 만기일: 둘째 목요일 (휴장일이면 직전 영업일)
    const kExp = prevKrxBusinessDay(nthWeekday(y, m, 4, 2));
    list.push(makeEvent({
      id: `evt_${kExp.replace(/-/g, '')}_krexp`, date: kExp, category: '수급·만기',
      title: quarterMonth ? `국내 ${m}월 선물·옵션 동시만기일 (네 마녀의 날)` : `국내 ${m}월 옵션만기일`,
      key_point: quarterMonth
        ? '[수급 체크] 주가지수 선물·옵션과 개별주식 선물·옵션이 동시에 만기. 프로그램 매매로 장 막판 변동성 확대 주의.'
        : '[수급 체크] 월물 옵션 만기. 차익거래 청산으로 장 막판 프로그램 매매 변동성 확대 가능.',
      press: '한국거래소', query: quarterMonth ? '동시만기일 네 마녀의 날' : '옵션만기일'
    }));

    // 미국 쿼드러플 위칭: 분기월 셋째 금요일
    if (quarterMonth) {
      const uExp = nthWeekday(y, m, 5, 3);
      list.push(makeEvent({
        id: `evt_${uExp.replace(/-/g, '')}_usexp`, date: uExp, category: '수급·만기',
        title: `미국 ${m}월 쿼드러플 위칭(선물·옵션 동시만기) 및 S&P 지수 리밸런싱`,
        key_point: '[수급 체크] 미국 주가지수·개별주 선물·옵션 동시만기와 분기 지수 리밸런싱이 겹쳐 거래량 급증.',
        press: 'CME·S&P 다우존스', query: '쿼드러플 위칭'
      }));
    }

    // 한국 월간 수출입 동향: 매월 1일 09시 (산업통상자원부)
    const expDate = ymd(y, m, 1);
    const prevMonth = m === 1 ? 12 : m - 1;
    list.push(makeEvent({
      id: `evt_${expDate.replace(/-/g, '')}_krexport`, date: expDate, category: '글로벌 매크로',
      title: m === 1 ? `${y - 1}년 연간 및 12월 수출입 동향 발표` : `${prevMonth}월 수출입 동향 발표`,
      key_point: '[모멘텀 핵심] 반도체·자동차·조선 등 주력 품목 수출 증감률 확인. 수출주 실적 선행 지표.',
      press: '산업통상자원부', query: '수출입 동향 반도체 수출'
    }));

    // KRX 연말 폐장일 / 새해 개장일
    if (m === 12) {
      const closing = prevKrxBusinessDay(ymd(y, 12, 30));
      list.push(makeEvent({
        id: `evt_${closing.replace(/-/g, '')}_krxclose`, date: closing, category: '증시일정',
        title: `${y}년 국내 증시 폐장일 (12/31 휴장)`,
        key_point: '[증시 일정] 올해 마지막 거래일. 배당락·연말 수급(대주주 양도세 회피 매물) 마무리.',
        press: '한국거래소', query: '증시 폐장일'
      }));
    }
    if (m === 1) {
      const opening = nextKrxBusinessDay(ymd(y, 1, 2));
      list.push(makeEvent({
        id: `evt_${opening.replace(/-/g, '')}_krxopen`, date: opening, category: '증시일정',
        title: `${y}년 국내 증시 개장일 (오전 10시 개장)`,
        key_point: '[증시 일정] 새해 첫 거래일은 1시간 늦은 10시에 개장.',
        press: '한국거래소', query: '증시 개장일'
      }));
    }

    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return list;
}

// ───────────────────────── 3) 뉴스 추출 일정 (승인 대기) ─────────────────────────
const MOMENTUM_KEYWORDS = ['개최', '발표', '상장', '체결', '공개', '개막', '본계약', '착수', '출시', '서명', '승인', '시행', '출범', '가동', '결정'];
const NOISE_KEYWORDS = ['공모', '청약', '공모가', '수요예측', '보호예수', '의무보유', '부고', '별세'];

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function collectNewsItems() {
  const items = [];
  const news = readJson(path.join(__dirname, '../data/live_domestic_news.json'));
  (Array.isArray(news) ? news : []).forEach(n => {
    if (!n || !n.tit) return;
    const dt = String(n.dt || '');
    items.push({
      title: n.tit,
      summary: n.subcontent || '',
      press: n.ohnm || '증시뉴스',
      url: n.oid && n.aid ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}` : '',
      published: dt.length >= 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : TODAY
    });
  });
  const timeline = readJson(path.join(__dirname, '../data/theme_timeline.json'));
  if (timeline && Array.isArray(timeline.themes)) {
    timeline.themes.forEach(t => (t.timeline || []).forEach(it => {
      if (!it || !it.news_title) return;
      items.push({
        title: it.news_title,
        summary: '',
        press: it.press || '테마뉴스',
        url: it.news_url || '',
        published: /^\d{4}-\d{2}-\d{2}$/.test(it.date || '') ? it.date : TODAY
      });
    }));
  }
  return items;
}

// 기사 발행일 기준으로 "M월 D일"의 연도를 결정 (발행월보다 2달 이상 앞이면 다음 해)
function resolveYear(month, published) {
  const [py, pm] = published.split('-').map(Number);
  return month < pm - 1 ? py + 1 : py;
}

function isValidYmd(s) {
  const dt = parseYmd(s);
  return !isNaN(dt) && toYmd(dt) === s;
}

function shortHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function guessCategory(text) {
  if (/반도체|HBM|AI|엔비디아|파운드리/.test(text)) return 'AI·반도체';
  if (/금리|FOMC|연준|한은|물가|CPI|환율/.test(text)) return '거시경제·금리';
  if (/정부|정책|법안|국회|규제|예산|관세/.test(text)) return '산업·정책';
  if (/바이오|임상|신약|학회|FDA/.test(text)) return '바이오·헬스';
  if (/원전|SMR|방산|수주|조선/.test(text)) return '수주·산업';
  return '모멘텀';
}

function extractNewsEvents(newsItems) {
  const out = [];
  const maxDate = addDays(TODAY, NEWS_HORIZON_DAYS);
  newsItems.forEach(n => {
    const text = `${n.title} ${n.summary}`;
    if (!MOMENTUM_KEYWORDS.some(k => text.includes(k))) return;
    if (NOISE_KEYWORDS.some(k => text.includes(k))) return;

    let date = '';
    const full = text.match(/(20[2-3]\d)[-./]\s?(\d{1,2})[-./]\s?(\d{1,2})/);
    const md = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
    const nextMonth = text.match(/(?:내달|다음\s*달)\s*(\d{1,2})일/);
    if (full) {
      date = ymd(+full[1], +full[2], +full[3]);
    } else if (md) {
      date = ymd(resolveYear(+md[1], n.published), +md[1], +md[2]);
    } else if (nextMonth) {
      const [py, pm] = n.published.split('-').map(Number);
      date = pm === 12 ? ymd(py + 1, 1, +nextMonth[1]) : ymd(py, pm + 1, +nextMonth[1]);
    }
    if (!date || !isValidYmd(date)) return;
    if (date <= TODAY || date > maxDate) return; // 미래 일정만

    const title = n.title.replace(/\[.*?\]|【.*?】/g, '').trim();
    if (!title) return;
    const category = guessCategory(text);
    out.push({
      id: `news_evt_${date.replace(/-/g, '')}_${shortHash(title)}`,
      title,
      date,
      dateDisplay: `${date} (${dayName(date)})`,
      category,
      tag: category,
      key_point: n.summary ? n.summary.trim().slice(0, 140) : `${n.press} 보도에서 감지된 예정 일정`,
      desc: n.summary ? n.summary.trim().slice(0, 140) : `${n.press} 보도에서 감지된 예정 일정`,
      press: n.press,
      sourceTitle: n.title,
      sourceUrl: n.url || naverSearch(title),
      news_url: n.url || naverSearch(title),
      detectedAt: TODAY,
      status: 'pending'
    });
  });
  return out;
}

// ───────────────────────── 조립 ─────────────────────────
const fromDate = addDays(TODAY, -PAST_KEEP_DAYS);
const toDate = addDays(TODAY, HORIZON_DAYS);
const inWindow = e => e.date >= fromDate && e.date <= toDate;
const withDDay = e => { const { diffDays, d_day } = calcDDay(e.date); return { ...e, diff_days: diffDays, d_day }; };
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title));

const approvedMap = new Map();
[...buildOfficialEvents(), ...buildRuleEvents(fromDate, toDate)]
  .filter(inWindow)
  .forEach(e => approvedMap.set(e.id, e));
const approved = [...approvedMap.values()].sort(byDate).map(withDDay);

// 뉴스 추출: 이전 실행에서 쌓인 대기 일정 중 아직 지나지 않은 것은 유지하고 새로 찾은 것과 합친다.
const mainPath = path.join(__dirname, '../data/calendar_schedules.json');
const prev = readJson(mainPath);
const pendingMap = new Map();
(prev && Array.isArray(prev.pending_events) ? prev.pending_events : [])
  .filter(e => e && e.id && String(e.id).startsWith('news_evt_') && e.date > TODAY)
  .forEach(e => pendingMap.set(e.id, e));
const newsItems = collectNewsItems();
const found = extractNewsEvents(newsItems);
found.forEach(e => { if (!pendingMap.has(e.id)) pendingMap.set(e.id, e); });
// 정식 일정과 같은 날·비슷한 제목이면 중복이므로 제외
const approvedKeys = new Set(approved.map(e => e.date + e.title.slice(0, 8)));
const pending = [...pendingMap.values()]
  .filter(e => !approvedKeys.has(e.date + e.title.slice(0, 8)))
  .sort(byDate)
  .slice(0, MAX_PENDING)
  .map(withDDay);

const finalData = {
  version: '3.0.0',
  updated_at: kstNowIso.slice(0, 10) + ' ' + kstNowIso.slice(11, 19),
  reference_date: TODAY,
  approved_events: approved,
  pending_events: pending
};

const jsonStr = JSON.stringify(finalData, null, 2);
const targets = [
  mainPath,
  path.join(__dirname, '../stock-intelligence/data/calendar_schedules.json'),
  path.join(__dirname, '../stock-intelligence/public/data/calendar_schedules.json')
];
targets.forEach(t => {
  if (fs.existsSync(path.dirname(t))) {
    fs.writeFileSync(t, jsonStr, 'utf8');
    console.log(`Saved updated calendar to: ${t}`);
  }
});

const upcoming = approved.filter(e => e.date >= TODAY).length;
console.log(`[calendar] 기준일 ${TODAY} · 정식 ${approved.length}건(예정 ${upcoming}건) · 뉴스 감지 대기 ${pending.length}건 (이번 실행 신규 후보 ${found.length}건 / 뉴스 ${newsItems.length}건 스캔)`);

// 공식 일정표 만료 경고: 표의 마지막 날짜가 60일 이내로 다가오면 다음 해 일정 추가 필요
const lastOfficial = [FOMC[FOMC.length - 1][1], US_CPI[US_CPI.length - 1][0], US_NFP[US_NFP.length - 1][0], BOK_RATE[BOK_RATE.length - 1]].sort()[0];
if (diffDaysBetween(TODAY, lastOfficial) < 60) {
  console.warn(`⚠️ [calendar] 공식 일정표가 ${lastOfficial}에 끝납니다. scripts/update_calendar_schedules_now.js 의 OFFICIAL 표에 다음 해 일정을 추가하세요.`);
}
