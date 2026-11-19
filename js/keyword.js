/**
 * 키워드 분석기 (js/keyword.js)
 * - 네이버 / 구글 분리 검색 완벽 지원
 * - 직접 만든 Worker(worker/keyword-worker.mjs)에서 데이터를 받아 화면에 보여줍니다.
 * - 월 검색량 / 문서수 / 경쟁도 / 발행 추천·기회지수 / 검색 추이 / 월 발행량 / 성별·연령 / 뉴스 / 상위 블로그 / 연관 키워드 표
 * - 검색 추이·성별·연령은 /api/keyword/insight (네이버 데이터랩 키가 있을 때)
 */
(function () {
  'use strict';

  var KEYWORD_WORKER_URL = 'https://moneyt-keyword.tkdgus8231.workers.dev';

  var HIST_KEY = 'kw_hist_v2';
  var current = null;
  var goldenOnly = false;
  var currentEngine = 'naver'; // 'naver' | 'google'

  function apiBase() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return '/api/keyword';
    return KEYWORD_WORKER_URL ? KEYWORD_WORKER_URL.replace(/\/$/, '') + '/api/keyword' : '';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function fmt(n) { return (n == null || !isFinite(n)) ? '-' : Number(n).toLocaleString('ko-KR'); }
  function $(id) { return document.getElementById(id); }

  /* ---------- 최근 검색 ---------- */
  function getHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (_) { return []; } }
  function pushHist(kw) {
    var h = getHist().filter(function (x) { return x !== kw; });
    h.unshift(kw);
    try { localStorage.setItem(HIST_KEY, JSON.stringify(h.slice(0, 8))); } catch (_) {}
  }
  function renderHist() {
    var box = $('kwHist'); if (!box) return;
    var h = getHist(); box.textContent = '';
    if (!h.length) return;
    box.appendChild(el('span', 'kw-hist-label', '최근 검색'));
    h.forEach(function (kw) {
      var b = el('button', 'kw-chip', kw); b.type = 'button';
      b.onclick = function () { $('kwInput').value = kw; analyze(kw); };
      box.appendChild(b);
    });
    var c = el('button', 'kw-hist-clear', '지우기'); c.type = 'button';
    c.onclick = function () { try { localStorage.removeItem(HIST_KEY); } catch (_) {} renderHist(); };
    box.appendChild(c);
  }

  /* ---------- 화면 조각 ---------- */
  function card(label, value, sub, tip) {
    var c = el('div', 'kw-card');
    if (tip) c.title = tip;
    c.appendChild(el('div', 'kw-card-k', label));
    c.appendChild(el('div', 'kw-card-v', value));
    if (sub) c.appendChild(el('div', 'kw-card-s', sub));
    return c;
  }
  function section(title, sub, cls) {
    var s = el('div', 'kw-sec' + (cls ? ' ' + cls : ''));
    s.appendChild(el('h3', 'kw-sec-t', title));
    if (sub) s.appendChild(el('p', 'kw-sec-s', sub));
    return s;
  }
  function showMessage(msg, isError) {
    var box = $('kwResult'); box.textContent = '';
    box.appendChild(el('div', isError ? 'kw-msg kw-err' : 'kw-msg', msg));
  }
  function short(n) {
    if (n == null || !isFinite(n)) return '-';
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + '만';
    return fmt(n);
  }
  function analyzeLink(kw, cls) {
    var b = el('button', cls || 'kw-link', kw); b.type = 'button';
    b.onclick = function () { $('kwInput').value = kw; analyze(kw); };
    return b;
  }

  function ageHint(days) {
    if (days == null) return '';
    if (days >= 180) return '오래된 글이 상위 → 새 글 진입 기회';
    if (days <= 30) return '최신 글 위주 → 꾸준한 발행 필요';
    return '보통';
  }

  var GRADE_TIP = '발행 추천 = 월 검색량 ÷ 최근 30일 동안 제목에 키워드가 들어간 글 수\n'
    + 'S: 검색 1,000 이상 · 글 1개당 검색 50회 이상\nA: 검색 300 이상 · 글 1개당 20회 이상\nB: 검색 100 이상 · 글 1개당 5회 이상\nC: 그 밖';
  var OPP_TIP = '기회지수(0~100) = 검색량 35% + 최근 글 대비 검색 여유 65%\n검색이 많고 최근 글이 적을수록 높습니다.';
  var LEVEL_TIP = '최근 30일 제목 포함 글 기준\n초보자: 10개 이하 · 중급자: 50개 이하 · 상급자: 200개 이하 · 고수: 그 이상';

  function gradeBadge(g, tip) {
    var b = el('span', 'kw-grade kw-grade-' + (g || 'none'), g || '-');
    b.title = tip || GRADE_TIP;
    return b;
  }
  function recentText(n, approx) {
    if (n == null) return '-';
    return (approx && n > 0 ? '약 ' : '') + fmt(n) + '개';
  }

  function verdict(d) {
    var g = d.grade;
    if (!d.total) return '검색량이 거의 없는 키워드예요. 연관 키워드 표에서 검색이 있는 표현을 골라 보세요.';
    if (g === 'S') return '검색에 비해 최근 글이 적어요. 지금 쓰기 좋은 키워드입니다.';
    if (g === 'A') return '검색이 꾸준하고 경쟁이 아직 버틸 만해요. 제목 앞쪽에 키워드를 그대로 넣어 써 보세요.';
    if (g === 'B') return '최근 글이 많은 편이에요. 아래 연관 키워드 중 S·A 등급으로 좁혀 쓰는 걸 추천합니다.';
    return '최근 글이 검색보다 많아요. 메인 키워드 대신 세부 키워드(연관 키워드)로 쓰세요.';
  }

  function render(d) {
    current = d;
    insightState = { keyword: d.keyword, data: null, loading: true, error: null };
    var box = $('kwResult'); box.textContent = '';
    var isGoogle = d.engine === 'google';

    var head = el('div', 'kw-head');
    head.appendChild(el('h2', 'kw-title', '“' + d.keyword + '” 분석 결과'));
    head.appendChild(el('span', 'kw-badge', '네이버 기준'));
    if (isGoogle) head.appendChild(el('span', 'kw-badge kw-google', '연관 키워드: 구글 검색창'));
    if (d.golden) head.appendChild(el('span', 'kw-badge kw-gold', '💎 황금 후보'));
    box.appendChild(head);

    var cards = el('div', 'kw-cards');
    cards.appendChild(card('월 검색량', fmt(d.total), 'PC ' + fmt(d.pc) + ' · 모바일 ' + fmt(d.mobile), '네이버 검색광고 기준 최근 30일 검색수'));
    cards.appendChild(card('블로그 문서수', fmt(d.blogCount), '네이버 블로그 누적'));
    cards.appendChild(card('경쟁도', d.competition || '-', d.ratio == null ? '' : '문서/검색 ' + d.ratio, '누적 문서수 ÷ 월 검색량 (1 미만 낮음 · 5 미만 보통 · 20 미만 높음)'));
    cards.appendChild(card('상위글 평균 나이', d.avgAgeDays == null ? '-' : d.avgAgeDays + '일', ageHint(d.avgAgeDays)));
    box.appendChild(cards);

    // 판정 줄: 발행 추천 · 기회지수 · 최근 30일 제목 포함 글
    var vd = el('div', 'kw-verdict kw-verdict-' + (d.grade || 'C'));
    var vl = el('div', 'kw-verdict-l');
    vl.appendChild(el('span', 'kw-verdict-k', '발행 추천'));
    vl.appendChild(gradeBadge(d.grade));
    var opp = el('span', 'kw-verdict-opp', '기회지수 ' + (d.opportunity == null ? '-' : d.opportunity)); opp.title = OPP_TIP;
    vl.appendChild(opp);
    var rc = el('span', 'kw-verdict-rc', '최근 30일 제목 포함 글 ' + recentText(d.recent30, d.recentApprox));
    rc.title = '최근 30일 동안 제목에 “' + d.keyword + '”가 들어간 블로그 글 수 (최신 글 표본에서 어림)';
    vl.appendChild(rc);
    vd.appendChild(vl);
    vd.appendChild(el('p', 'kw-verdict-t', verdict(d)));
    box.appendChild(vd);

    // 1행: 검색 추이 | 연관 키워드 요약
    var row1 = el('div', 'kw-row kw-row-2');
    var trend = section('📈 검색 추이', '월 검색량 ' + fmt(d.total) + '회를 데이터랩 흐름으로 나눈 추정 검색수입니다.', 'kw-trend');
    trend.appendChild(el('div', 'kw-trend-body', null)).id = 'kwTrendBody';
    row1.appendChild(trend);
    row1.appendChild(buildRelSide(d));
    box.appendChild(row1);

    // 2행: 뉴스 | 블로그 상위 | 월별 발행량 + 성별·연령
    var row2 = el('div', 'kw-row kw-row-3');
    var newsSec = section('📰 왜 검색될까?', '최신 뉴스로 검색 이유를 확인하세요.');
    var newsList = Array.isArray(d.news) ? d.news : [];
    if (!newsList.length) newsSec.appendChild(el('p', 'kw-empty', '관련 최신 뉴스가 없습니다.'));
    else {
      var nl = el('ul', 'kw-list');
      newsList.forEach(function (n) {
        var li = el('li'); var a = el('a', null, n.title);
        a.href = n.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.appendChild(a);
        if (n.pubDate) li.appendChild(el('span', 'kw-meta', new Date(n.pubDate).toLocaleDateString('ko-KR')));
        nl.appendChild(li);
      });
      newsSec.appendChild(nl);
    }
    row2.appendChild(newsSec);

    var blogList = Array.isArray(d.blogTop) ? d.blogTop : [];
    var blogSec = section('📝 블로그 상위 10개', d.avgAgeDays == null ? '네이버 검색 결과 상단의 블로그 글' : '평균 ' + d.avgAgeDays + '일 전 작성');
    if (!blogList.length) blogSec.appendChild(el('p', 'kw-empty', '조회된 상위 문서가 없습니다.'));
    else {
      var bl = el('ol', 'kw-list kw-ol');
      blogList.forEach(function (b) {
        var li = el('li'); var a = el('a', null, b.title);
        a.href = b.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.appendChild(a);
        li.appendChild(el('span', 'kw-meta', (b.blogger || '') + (b.ageDays == null ? '' : ' · ' + b.ageDays + '일 전')));
        bl.appendChild(li);
      });
      blogSec.appendChild(bl);
    }
    row2.appendChild(blogSec);

    var side = el('div', 'kw-side');
    side.appendChild(buildPublish(d));
    var demo = section('👥 성별 · 연령 분포', '데이터랩 기준 키워드 비교 추정 · 최근 30일', 'kw-demo');
    demo.querySelector('.kw-sec-t').appendChild(el('span', 'kw-est', '추정'));
    demo.appendChild(el('div', null, null)).id = 'kwDemoBody';
    side.appendChild(demo);
    row2.appendChild(side);
    box.appendChild(row2);

    box.appendChild(buildRelated(d));
    renderInsight();
  }

  function buildRelSide(d) {
    var sec = section('🔗 연관 키워드', '검색량 많은 순 · 누르면 바로 분석', 'kw-relside');
    var list = (d.related || []).slice().sort(function (a, b) { return b.total - a.total; });
    if (!list.length) { sec.appendChild(el('p', 'kw-empty', '연관 키워드가 없습니다.')); return sec; }
    var ul = el('ul', 'kw-relside-list');
    list.forEach(function (r) {
      var li = el('li');
      li.appendChild(analyzeLink(r.keyword, 'kw-relside-k'));
      li.appendChild(el('span', 'kw-relside-v', fmt(r.total) + '회'));
      li.appendChild(el('span', 'kw-relside-d', r.blogCount == null ? '' : '문서 ' + short(r.blogCount)));
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    return sec;
  }

  function buildPublish(d) {
    var p = d.publish;
    var sec = section('🗓️ 월별 블로그 발행량', p ? '최근 글 최대 ' + fmt(p.sample) + '개 기준' : '');
    if (!p) { sec.appendChild(el('p', 'kw-empty', '발행 데이터를 가져오지 못했습니다.')); return sec; }
    var big = el('div', 'kw-pub');
    big.appendChild(el('div', 'kw-pub-v', (p.method === 'all' ? '' : '약 ') + fmt(p.perMonth) + '개/월' + (p.method === 'lowerBound' ? ' 이상' : '')));
    var how = p.method === 'all' ? '전체 글 중 최근 30일에 올라온 글 수'
      : p.method === 'fullDays' ? '최근 ' + fmt(p.sample) + '개 글 중 ' + p.days + '일 동안 하루 평균 ' + fmt(p.perDay) + '개 발행'
      : '오늘 올라온 글로 어림 (하루 약 ' + fmt(p.perDay) + '개)';
    big.appendChild(el('div', 'kw-pub-s', how));
    sec.appendChild(big);
    var pm = p.perMonth;
    var msg = pm >= 3000 ? '발행 경쟁이 매우 치열한 키워드예요. 세부 키워드(연관 키워드)로 좁혀 쓰는 걸 추천합니다.'
      : pm >= 600 ? '꾸준히 글이 올라오는 키워드예요. 상위 글과 다른 각도(질문·비교·후기)로 차별화하세요.'
      : pm >= 100 ? '발행량이 보통이에요. 정확한 정보로 쓰면 자리를 잡을 수 있습니다.'
      : '새 글이 거의 없어요. 검색이 있다면 선점하기 좋은 키워드입니다.';
    sec.appendChild(el('p', 'kw-pub-msg', msg));
    return sec;
  }

  /* ---------- 데이터랩 (검색 추이 · 성별 · 연령) ---------- */
  var insightState = null;
  var trendMode = '30';

  function insightUrl(kw) {
    var h = location.hostname;
    var base = (h === 'localhost' || h === '127.0.0.1') ? '' : KEYWORD_WORKER_URL.replace(/\/$/, '');
    return base + '/api/keyword/insight?q=' + encodeURIComponent(kw);
  }

  function loadInsight(kw) {
    fetch(insightUrl(kw)).then(function (r) { return r.json(); }).then(function (j) {
      if (!insightState || insightState.keyword !== kw) return;
      insightState.loading = false;
      if (!j.success) insightState.error = j.error || '데이터랩 조회 실패';
      else insightState.data = j;
      renderInsight();
    }).catch(function () {
      if (!insightState || insightState.keyword !== kw) return;
      insightState.loading = false; insightState.error = '데이터랩에 연결하지 못했습니다.';
      renderInsight();
    });
  }

  function setupNotice() {
    var w = el('div', 'kw-setup');
    w.appendChild(el('b', null, '네이버 데이터랩 키를 연결하면 보입니다'));
    var ol = el('ol');
    ['developers.naver.com → Application 등록 → 사용 API에서 「데이터랩(검색어트렌드)」 선택',
      '발급된 Client ID / Secret을 Worker Secret에 등록: NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET',
      '로컬에서 쓸 때는 .env.local 에 같은 이름으로 추가'].forEach(function (t) { ol.appendChild(el('li', null, t)); });
    w.appendChild(ol);
    return w;
  }

  function renderInsight() {
    var tb = $('kwTrendBody'); var db = $('kwDemoBody');
    if (!tb || !db || !insightState || !current) return;
    tb.textContent = ''; db.textContent = '';
    if (insightState.loading) { tb.appendChild(el('p', 'kw-empty', '검색 추이를 불러오는 중…')); db.appendChild(el('p', 'kw-empty', '불러오는 중…')); return; }
    if (insightState.error) { tb.appendChild(el('p', 'kw-empty', insightState.error)); db.appendChild(el('p', 'kw-empty', insightState.error)); return; }
    var ins = insightState.data;
    if (!ins.available) { tb.appendChild(setupNotice()); db.appendChild(el('p', 'kw-empty', '데이터랩 키를 연결하면 성별·연령 분포가 보입니다.')); return; }
    renderTrend(tb, ins);
    renderDemo(db, ins);
  }

  // 데이터랩 일별 비율 → 월 검색량에 맞춘 추정 검색수
  function trendSeries(ins, total, mode) {
    var daily = ins.daily || [];
    if (!daily.length) return [];
    var last30 = daily.slice(-30);
    var base = last30.reduce(function (s, x) { return s + x.ratio; }, 0) || 1;
    var unit = total / base;
    if (mode === '30') return last30.map(function (x) { return { label: x.date.slice(5).replace('-', '.'), v: Math.round(x.ratio * unit) }; });
    var out = [];
    for (var end = daily.length; end - 30 >= 0 && out.length < 12; end -= 30) {
      var blk = daily.slice(end - 30, end);
      out.unshift({ label: blk[blk.length - 1].date.slice(5).replace('-', '.'), v: Math.round(blk.reduce(function (s, x) { return s + x.ratio; }, 0) * unit) });
    }
    return out;
  }

  function pct(a, b) { return b ? Math.round(((a - b) / b) * 100) : null; }
  function cmpPill(label, p) {
    if (p == null) return null;
    var cls = p > 0 ? 'up' : p < 0 ? 'down' : '';
    return el('span', 'kw-cmp ' + cls, label + ' ' + (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(p) + '%');
  }

  function renderTrend(tb, ins) {
    var tabs = el('div', 'kw-seg');
    [['30', '30일'], ['365', '1년']].forEach(function (t) {
      var b = el('button', 'kw-seg-btn' + (trendMode === t[0] ? ' active' : ''), t[1]); b.type = 'button';
      b.onclick = function () { trendMode = t[0]; renderInsight(); };
      tabs.appendChild(b);
    });
    tb.appendChild(tabs);
    var series = trendSeries(ins, current.total, trendMode);
    if (series.length < 2) { tb.appendChild(el('p', 'kw-empty', '데이터랩에 이 키워드의 추이 데이터가 없습니다.')); return; }
    tb.appendChild(lineChart(series, trendMode === '30' ? '회/일' : '회/30일'));
    var cmps = el('div', 'kw-cmps');
    var d30 = trendSeries(ins, current.total, '30').map(function (x) { return x.v; });
    var sum = function (a) { return a.reduce(function (s, v) { return s + v; }, 0); };
    if (d30.length >= 30) {
      [cmpPill('최근 7일 vs 이전 7일', pct(sum(d30.slice(-7)), sum(d30.slice(-14, -7)))),
        cmpPill('후반 15일 vs 전반 15일', pct(sum(d30.slice(-15)), sum(d30.slice(0, 15))))].forEach(function (p) { if (p) cmps.appendChild(p); });
    }
    var yr = trendSeries(ins, current.total, '365');
    if (yr.length >= 12) {
      var peak = yr.reduce(function (m, x) { return x.v > m.v ? x : m; }, yr[0]);
      cmps.appendChild(el('span', 'kw-cmp', '1년 중 가장 많이 찾은 30일: ' + peak.label + '까지 (' + short(peak.v) + '회)'));
    }
    tb.appendChild(cmps);
  }

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function lineChart(series, unit) {
    var W = 640, H = 240, L = 46, R = 12, T = 12, B = 28;
    var max = Math.max.apply(null, series.map(function (x) { return x.v; })) || 1;
    var nice = Math.ceil(max / 4) * 4;
    var x = function (i) { return L + (i * (W - L - R)) / (series.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - v / nice); };
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'kw-chart', role: 'img', 'aria-label': '검색 추이 그래프' });
    for (var g = 0; g <= 4; g++) {
      var gv = (nice / 4) * g;
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: y(gv), y2: y(gv), class: 'kw-grid' }));
      var t = svg('text', { x: L - 6, y: y(gv) + 4, class: 'kw-axis', 'text-anchor': 'end' }); t.textContent = short(Math.round(gv)); root.appendChild(t);
    }
    var pts = series.map(function (p, i) { return x(i) + ',' + y(p.v); });
    root.appendChild(svg('polygon', { points: L + ',' + y(0) + ' ' + pts.join(' ') + ' ' + x(series.length - 1) + ',' + y(0), class: 'kw-area' }));
    root.appendChild(svg('polyline', { points: pts.join(' '), class: 'kw-line' }));
    var step = Math.max(1, Math.round(series.length / 6));
    series.forEach(function (p, i) {
      var c = svg('circle', { cx: x(i), cy: y(p.v), r: 3.2, class: 'kw-dot' });
      var tt = svg('title', {}); tt.textContent = p.label + ' · ' + fmt(p.v) + unit; c.appendChild(tt);
      root.appendChild(c);
      if (i % step === 0 || i === series.length - 1) {
        var lt = svg('text', { x: x(i), y: H - 8, class: 'kw-axis', 'text-anchor': 'middle' }); lt.textContent = p.label; root.appendChild(lt);
      }
    });
    var wrap = el('div', 'kw-chart-wrap'); wrap.appendChild(root);
    return wrap;
  }

  function renderDemo(db, ins) {
    if (!ins.gender && !ins.ages) { db.appendChild(el('p', 'kw-empty', '검색이 적어 성별·연령 데이터가 없습니다.')); return; }
    if (ins.gender) {
      db.appendChild(el('div', 'kw-demo-k', '성별'));
      var bar = el('div', 'kw-gbar');
      var m = el('div', 'kw-gbar-m'); m.style.width = ins.gender.male + '%';
      var f = el('div', 'kw-gbar-f'); f.style.width = ins.gender.female + '%';
      bar.appendChild(m); bar.appendChild(f); db.appendChild(bar);
      var lg = el('div', 'kw-glabel');
      lg.appendChild(el('span', 'm', '남성 ' + ins.gender.male + '%'));
      lg.appendChild(el('span', 'f', '여성 ' + ins.gender.female + '%'));
      db.appendChild(lg);
    }
    if (ins.ages) {
      db.appendChild(el('div', 'kw-demo-k', '연령'));
      var mx = Math.max.apply(null, ins.ages.map(function (a) { return a.pct; })) || 1;
      var bars = el('div', 'kw-abars');
      ins.ages.forEach(function (a) {
        var col = el('div', 'kw-abar' + (a.pct === mx ? ' top' : ''));
        col.appendChild(el('span', 'kw-abar-v', a.pct + '%'));
        var fill = el('div', 'kw-abar-f'); fill.style.height = Math.max(2, (a.pct / mx) * 100) + '%';
        var holder = el('div', 'kw-abar-h'); holder.appendChild(fill); col.appendChild(holder);
        col.appendChild(el('span', 'kw-abar-k', a.label));
        bars.appendChild(col);
      });
      db.appendChild(bars);
    }
    db.appendChild(el('p', 'kw-note', '※ 네이버는 성별·연령 실제 비율을 공개하지 않아, 「' + ins.anchor + '」와 비교해 추정한 값입니다. 경향 참고용으로 보세요.'));
  }

  /* ---------- 연관 키워드 표 ---------- */
  var oppOnly = false;
  var sortKey = null;
  var sortDir = -1;
  var COLS = [
    { k: 'rank', t: '순위' },
    { k: 'keyword', t: '키워드' },
    { k: 'total', t: '총 검색량', n: true },
    { k: 'blogCount', t: '블로그 문서수', n: true },
    { k: 'recent30', t: '최근 30일 발행', n: true, tip: '최근 30일 동안 제목에 키워드가 들어간 블로그 글 수 (최신 100개 표본, "약"은 비율로 어림)' },
    { k: 'grade', t: '발행 추천', tip: GRADE_TIP },
    { k: 'opportunity', t: '기회지수', n: true, tip: OPP_TIP },
    { k: 'ratio', t: '문서/검색', n: true, tip: '누적 문서수 ÷ 월 검색량' },
    { k: 'level', t: '경쟁 수준', tip: LEVEL_TIP },
  ];
  var GRADE_ORDER = { S: 4, A: 3, B: 2, C: 1 };
  var LEVEL_ORDER = { '초보자': 4, '중급자': 3, '상급자': 2, '고수': 1 };

  function buildRelated(d) {
    var sec = el('div', 'kw-sec kw-related');
    var top = el('div', 'kw-rel-top');
    var rel = d.related || [];
    top.appendChild(el('h3', 'kw-sec-t', '📊 “' + d.keyword + '” ' + (d.engine === 'google' ? '구글 연관 검색어' : '연관 키워드') + ' (' + rel.length + '개)'));

    var tools = el('div', 'kw-tools');
    var lab1 = el('label', 'kw-filter');
    var cb1 = document.createElement('input'); cb1.type = 'checkbox'; cb1.checked = oppOnly;
    cb1.onchange = function () { oppOnly = cb1.checked; fillRows(); };
    lab1.appendChild(cb1); lab1.appendChild(document.createTextNode(' ⭐ 기회지수 50점 이상'));
    tools.appendChild(lab1);
    var lab = el('label', 'kw-filter kw-golden-label');
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = goldenOnly;
    cb.onchange = function () { goldenOnly = cb.checked; fillRows(); };
    lab.appendChild(cb); lab.appendChild(document.createTextNode(' 💎 황금 후보만 (문서/검색 0.3 미만)'));
    tools.appendChild(lab);
    var dl = el('button', 'kw-btn', '엑셀(CSV) 다운로드'); dl.type = 'button';
    dl.onclick = function () { downloadCsv(d); };
    tools.appendChild(dl);
    top.appendChild(tools);
    sec.appendChild(top);

    var cnt = { S: 0, A: 0, B: 0, C: 0 };
    rel.forEach(function (r) { if (r.grade) cnt[r.grade]++; });
    var sum = el('div', 'kw-relsum');
    var st = el('div', 'kw-relsum-t');
    st.appendChild(el('b', null, '바로 쓰기 좋은 키워드 · S ' + cnt.S + '개 · A ' + cnt.A + '개'));
    st.appendChild(el('span', null, ' (B ' + cnt.B + ' · C ' + cnt.C + ')'));
    sum.appendChild(st);
    sum.appendChild(el('p', null, '발행 추천 = 월 검색량 ÷ 최근 30일 동안 제목에 키워드가 들어간 글 수. 검색은 많고 최근 글이 적을수록 S에 가깝습니다. 표 머리글을 누르면 정렬되고, 마우스를 올리면 기준이 보입니다.'));
    sec.appendChild(sum);

    var wrap = el('div', 'kw-table-wrap');
    var table = el('table', 'kw-table');
    var thead = document.createElement('thead'); var tr = document.createElement('tr');
    COLS.forEach(function (c) {
      var th = el('th', c.n ? 'n' : null, c.t);
      if (c.tip) th.title = c.tip;
      if (c.k !== 'rank') {
        th.className = (th.className ? th.className + ' ' : '') + 'sortable';
        th.onclick = function () {
          if (sortKey === c.k) sortDir = -sortDir; else { sortKey = c.k; sortDir = c.k === 'keyword' ? 1 : -1; }
          fillRows();
        };
      }
      tr.appendChild(th);
    });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = document.createElement('tbody'); tbody.id = 'kwRows'; table.appendChild(tbody);
    wrap.appendChild(table); sec.appendChild(wrap);
    sec.appendChild(el('p', 'kw-note', '※ 검색량이 10 미만인 키워드는 5로 계산합니다. 검색량은 네이버 검색광고 기준'
      + (d.engine === 'google' ? ', 키워드 목록은 구글 검색창 연관 검색어입니다.' : '이고, 광고 연관어가 부족하면 네이버·구글 검색창 연관 검색어로 채웁니다.')));
    setTimeout(fillRows, 0);
    return sec;
  }

  function sortVal(r, k) {
    if (k === 'grade') return GRADE_ORDER[r.grade] || 0;
    if (k === 'level') return LEVEL_ORDER[r.level] || 0;
    if (k === 'keyword') return r.keyword;
    return r[k] == null ? -1 : r[k];
  }

  function fillRows() {
    var tbody = $('kwRows'); if (!tbody || !current) return;
    tbody.textContent = '';
    var rows = (current.related || []).filter(function (r) {
      return (!goldenOnly || r.golden) && (!oppOnly || (r.opportunity || 0) >= 50);
    });
    if (sortKey) {
      rows = rows.slice().sort(function (a, b) {
        var va = sortVal(a, sortKey), vb = sortVal(b, sortKey);
        if (typeof va === 'string') return sortDir * va.localeCompare(vb, 'ko');
        return sortDir * (va - vb);
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('#tab-keyword .kw-table th.sortable'), function (th, i) {
      var c = COLS[i + 1];
      th.classList.toggle('sorted', c.k === sortKey);
      th.setAttribute('data-dir', c.k === sortKey ? (sortDir > 0 ? '▲' : '▼') : '');
    });
    if (!rows.length) {
      var tr0 = document.createElement('tr'); var td0 = el('td', 'kw-empty', '조건에 맞는 키워드가 없습니다.'); td0.colSpan = COLS.length;
      tr0.appendChild(td0); tbody.appendChild(tr0); return;
    }
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', 'c rk', String(i + 1)));
      var tdK = document.createElement('td');
      tdK.appendChild(analyzeLink(r.keyword));
      if (r.golden) tdK.appendChild(el('span', 'kw-gold-mini', '💎 황금'));
      tr.appendChild(tdK);
      tr.appendChild(el('td', 'n b', fmt(r.total) + (r.under10 ? ' (일부 10 미만)' : '')));
      tr.appendChild(el('td', 'n mute', r.blogCount == null ? '-' : fmt(r.blogCount)));
      var tdR = el('td', 'n b', recentText(r.recent30, r.recentApprox));
      tr.appendChild(tdR);
      var tdG = el('td', 'c'); tdG.appendChild(gradeBadge(r.grade,
        r.grade ? GRADE_TIP + '\n\n이 키워드: 월 ' + fmt(r.total) + '회 ÷ 최근 글 ' + fmt(Math.max(1, r.recent30)) + '개 = 글 1개당 ' + fmt(Math.round(r.total / Math.max(1, r.recent30))) + '회' : '')); tr.appendChild(tdG);
      var tdO = el('td', 'n'); var ob = el('span', 'kw-opp' + ((r.opportunity || 0) >= 70 ? ' hi' : (r.opportunity || 0) >= 50 ? ' mid' : ''), r.opportunity == null ? '-' : String(r.opportunity));
      ob.title = OPP_TIP; tdO.appendChild(ob); tr.appendChild(tdO);
      tr.appendChild(el('td', 'n mute', r.ratio == null ? '-' : r.ratio.toFixed ? r.ratio.toFixed(2) : String(r.ratio)));
      var tdL = el('td', 'c'); var lv = el('span', 'kw-level kw-level-' + ({ '초보자': 1, '중급자': 2, '상급자': 3, '고수': 4 }[r.level] || 0), r.level || '-');
      lv.title = LEVEL_TIP; tdL.appendChild(lv); tr.appendChild(tdL);
      tbody.appendChild(tr);
    });
  }

  function downloadCsv(d) {
    var lines = [['키워드', 'PC', '모바일', '총검색량', '블로그문서수', '최근30일발행', '발행추천', '기회지수', '문서/검색', '경쟁수준', '출처']];
    lines.push([d.keyword, d.pc, d.mobile, d.total, d.blogCount, d.recent30, d.grade, d.opportunity, d.ratio, '', '메인']);
    (d.related || []).forEach(function (r) {
      lines.push([r.keyword, r.pc, r.mobile, r.total, r.blogCount, r.recent30, r.grade, r.opportunity, r.ratio, r.level,
        { ad: '검색광고', naver: '네이버 자동완성', google: '구글 자동완성' }[r.source] || '']);
    });
    var csv = '﻿' + lines.map(function (row) {
      return row.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = d.keyword + '_키워드분석.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /* ---------- 분석 실행 ---------- */
  var running = false;
  async function analyze(raw) {
    var kw = String(raw || '').trim();
    if (!kw) { showMessage('분석할 키워드를 입력해 주세요.', true); return; }
    if (running) return;
    var base = apiBase();

    running = true;
    var btn = $('kwGo'); btn.disabled = true; btn.textContent = '분석 중…';
    showMessage('🔎 “' + kw + '” 분석 중입니다. 검색량·최근 발행·연관 키워드까지 모으느라 5~10초 걸려요.', false);

    try {
      var res = await fetch(base + '?q=' + encodeURIComponent(kw) + '&engine=' + currentEngine);
      var data = await res.json().catch(function () { return null; });
      if (!data) throw new Error('서버 응답을 읽지 못했습니다. (' + res.status + ')');
      if (!data.success) throw new Error(data.error || '분석에 실패했습니다.');
      pushHist(data.keyword);
      renderHist();
      render(data);
      loadInsight(data.keyword);
    } catch (e) {
      showMessage('분석 실패: ' + (e && e.message ? e.message : '알 수 없는 오류') + ' — 잠시 후 다시 시도해 주세요.', true);
    } finally {
      running = false;
      btn.disabled = false;
      btn.textContent = '분석하기';
    }
  }
  window.runKeywordAnalysis = analyze;

  // 엔진 토글 세팅
  function setupEngineToggle() {
    var toggleWrap = $('kwEngineToggle');
    var form = $('kwForm');
    var input = $('kwInput');
    if (!toggleWrap) return;

    var btns = toggleWrap.querySelectorAll('.kw-engine-btn');
    btns.forEach(function (b) {
      b.onclick = function () {
        var engine = b.getAttribute('data-engine');
        if (engine === currentEngine) return;

        currentEngine = engine;
        btns.forEach(function (btn) {
          if (btn.getAttribute('data-engine') === engine) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        if (form) {
          if (engine === 'google') {
            form.classList.add('engine-google');
            if (input) input.placeholder = '구글 분석할 키워드를 입력하세요 (예: 캠핑의자)';
          } else {
            form.classList.remove('engine-google');
            if (input) input.placeholder = '분석할 키워드를 입력하세요 (예: 캠핑의자)';
          }
        }

        // 이미 입력창에 키워드가 있다면 새 엔진으로 자동 재분석
        if (input && input.value.trim()) {
          analyze(input.value.trim());
        }
      };
    });
  }

  // 추천 칩(홈판 틈새 키워드 / 지금 쓰는 소재) 실시간 자동 갱신
  function updateRecommendChips() {
    var nicheBox = $('kwRecNicheChips');
    var hotBox = $('kwRecHotChips');
    if (!nicheBox && !hotBox) return;

    var radar = window.HOMEFEED_RADAR_DATA;
    if (!radar && typeof window.ensureHomefeedDataLoaded === 'function') {
      window.ensureHomefeedDataLoaded(function() {
        updateRecommendChips();
      });
      return;
    }

    if (!radar || !Array.isArray(radar.subjects) || !radar.subjects.length) return;

    // 1. 지금 쓰는 소재 (상위 채널 발행 소재 10개)
    if (hotBox) {
      var hotList = radar.subjects.slice(0, 10).map(function(s) { return s.subject; }).filter(Boolean);
      if (hotList.length) {
        hotBox.innerHTML = '';
        hotList.forEach(function(sub) {
          var btn = el('button', 'kw-rec-chip', sub);
          btn.type = 'button';
          btn.onclick = function() { window.runKeywordAnalysis(sub); };
          hotBox.appendChild(btn);
        });
      }
    }

    // 2. 홈판 틈새 키워드 (homefeed.keyword 우선, 없으면 suggest 롱테일 키워드 10개)
    if (nicheBox) {
      var nicheList = [];
      radar.subjects.forEach(function(s) {
        if (s.homefeed && s.homefeed.keyword && !nicheList.includes(s.homefeed.keyword)) {
          nicheList.push(s.homefeed.keyword);
        }
      });
      if (nicheList.length < 10) {
        radar.subjects.forEach(function(s) {
          if (s.keyword && Array.isArray(s.keyword.suggest)) {
            s.keyword.suggest.forEach(function(sug) {
              if (sug && sug !== s.subject && !nicheList.includes(sug) && nicheList.length < 10) {
                nicheList.push(sug);
              }
            });
          }
        });
      }
      if (nicheList.length) {
        nicheBox.innerHTML = '';
        nicheList.slice(0, 10).forEach(function(kw) {
          var btn = el('button', 'kw-rec-chip', kw);
          btn.type = 'button';
          btn.onclick = function() { window.runKeywordAnalysis(kw); };
          nicheBox.appendChild(btn);
        });
      }
    }
  }

  // 외부 및 추천 칩에서 즉시 분석 실행할 수 있는 전역 함수 노출
  window.runKeywordAnalysis = function (kw) {
    if (!kw) return;
    var input = $('kwInput');
    if (input) input.value = kw;
    if (typeof window.switchTab === 'function') {
      window.switchTab('keyword');
    }
    analyze(kw);
    var hero = document.querySelector('#tab-keyword .kw-hero');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('kwForm');
    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        analyze($('kwInput').value);
      });
    }

    setupEngineToggle();

    var h = getHist();
    if (!h.length) {
      ['나는솔로', '캠핑의자', '청년도약계좌'].forEach(function (k) { pushHist(k); });
    }
    renderHist();

    // 추천 칩 실시간 데이터 동기화
    updateRecommendChips();
  });
})();
