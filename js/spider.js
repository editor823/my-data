/**
 * 거미줄치기 키워드 생성 (js/spider.js)
 * - 메인 키워드 → B 계정(검색창 연관 검색어) / C 계정(지식iN 질문) / D 질문형 / 예비 (+ 지역 · 내 키워드)
 * - 연결 키워드마다 경쟁도: 블로그 문서수 · 상위 100개 중 제목 일치 · 상위글 평균 나이 · 공식 블로그 → 판정 (빈집/진입 가능/공식 자료가 위 차지/경쟁 많음)
 * - A 글 가이드: 기사에서 뽑은 "지킬 사실"(출처 포함) · 꼭 넣을 소제목 · 검색이 붙을 시기 · 정부안 단계 안내 · 내 다른 글 링크
 * - 발행 일정표: 계정당 한 세트 4개까지, 날짜를 나눠 배치 · 글마다 연결 글 프롬프트(버튼 링크 포함) 복사
 * - 남는 키워드는 외부유입 생성기로 넘깁니다.
 * - 데이터: Worker /api/spider · /api/spider/compete · /api/spider/facts (로컬에서는 server.js 같은 경로)
 * - 추천 묶음: data/spider_bundles.js (window.SPIDER_BUNDLES, 사흘마다 자동 갱신)
 */
(function () {
  'use strict';

  var WORKER_URL = 'https://moneyt-keyword.tkdgus8231.workers.dev';
  var HIST_KEY = 'spider_history_v1';
  var DONE_KEY = 'spider_done_v1';
  var URL_KEY = 'spider_aurl_v1';      // { normKey(메인): { kw, url } }
  var CTA_KEY = 'spider_cta_text_v1';
  var PLAN_KEY = 'spider_plan_opts_v1';
  var PER_ACCOUNT_CAP = 4;             // 한 계정에는 한 세트에서 4개까지만
  var REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

  function api(path, params) {
    var h = location.hostname;
    var base = (h === 'localhost' || h === '127.0.0.1') ? '' : WORKER_URL;
    var qs = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
    return base + path + '?' + qs;
  }
  function getJson(url, ms) {
    return fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(ms || 25000) : undefined })
      .then(function (r) { return r.json().catch(function () { throw new Error('서버 응답을 읽지 못했습니다. (' + r.status + ')'); }); });
  }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function load(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  var normKey = function (s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); };

  var toastTimer = null;
  function toast(msg) {
    var t = $('spToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'spToast';
      t.className = 'sp-toast';
      $('tab-spider').appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  function copy(text, msg) {
    var done = function () { toast(msg || '복사했어요'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- 사용 기록 · 쓴 글 · 글 주소 ---------- */

  function pushHistory(kw) {
    var list = load(HIST_KEY, []).filter(function (k) { return normKey(k) !== normKey(kw); });
    list.unshift(kw);
    save(HIST_KEY, list.slice(0, 8));
    renderHistory();
  }
  function renderHistory() {
    var box = $('spHist');
    var list = load(HIST_KEY, []);
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<span>최근:</span>' + list.map(function (k) {
      return '<button type="button" class="sp-chip" data-kw="' + esc(k) + '">' + esc(k) + '</button>';
    }).join('') + '<button type="button" class="sp-chip" data-clear="1">지우기</button>';
  }
  function isDone(kw) { return load(DONE_KEY, []).indexOf(normKey(kw)) >= 0; }
  function toggleDone(kw) {
    var list = load(DONE_KEY, []);
    var k = normKey(kw);
    var i = list.indexOf(k);
    if (i >= 0) list.splice(i, 1); else list.unshift(k);
    save(DONE_KEY, list.slice(0, 300));
    return i < 0;
  }
  function getMainUrl(kw) { var m = load(URL_KEY, {})[normKey(kw)]; return m ? m.url : ''; }
  function setMainUrl(kw, url) {
    var m = load(URL_KEY, {});
    if (url) m[normKey(kw)] = { kw: kw, url: url, at: Date.now() }; else delete m[normKey(kw)];
    save(URL_KEY, m);
  }
  function ctaText(d) { return load(CTA_KEY, {})[normKey(d.keyword)] || (d.keyword + ' 신청 방법 한눈에 보기'); }
  function setCtaText(kw, text) { var m = load(CTA_KEY, {}); if (text) m[normKey(kw)] = text; else delete m[normKey(kw)]; save(CTA_KEY, m); }

  /* ---------- 세트 상태 ---------- */

  // 열 순서와 이름 (계정: 일정표에서 먼저 배정할 계정)
  var COLS = [
    { id: 'b', title: 'B 계정 · 연관 검색어', account: 'B' },
    { id: 'c', title: 'C 계정 · 지식iN 질문', account: 'C' },
    { id: 'd', title: '질문형 키워드', account: null },
    { id: 'region', title: '지역 키워드', account: null },
    { id: 'mine', title: '내가 찾은 키워드', account: null },
    { id: 'spare', title: '예비 (남는 것)', account: null },
  ];
  var SRC_LABEL = { naver: '네이버', google: '구글', kin: '지식iN', question: '질문형', region: '지역', mine: '내 키워드' };

  var current = null;   // { keyword, b, c, d, spare, region, mine, facts, schedule, draft, news, generatedAt, fromBundle }
  var metrics = {};     // normKey → 경쟁도
  var competeState = 'idle'; // idle | loading | done | unavailable
  var sortEasy = true;

  function listOf(d, id) { return d[id] || []; }
  function allItems(d) { return COLS.reduce(function (acc, c) { return acc.concat(listOf(d, c.id)); }, []); }
  function metricOf(kw) { return metrics[normKey(kw)] || null; }

  var VERDICT_RANK = { empty: 0, open: 1, official: 2, hard: 3 };
  function easeRank(x) {
    var m = metricOf(x.keyword);
    if (!m || m.error || !m.verdict) return [4, 999, 0];
    return [VERDICT_RANK[m.verdict.code] == null ? 4 : VERDICT_RANK[m.verdict.code], m.titleMatch, -(m.volume || 0)];
  }
  function byEase(a, b) {
    var x = easeRank(a), y = easeRank(b);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  }
  function sorted(list) { return sortEasy ? list.slice().sort(byEase) : list.slice(); }

  /* ---------- 텍스트 만들기 ---------- */

  var HEADINGS = ['무엇이 바뀌었나 (한 문단 요약)', '누가 받을 수 있나 (대상·조건)', '얼마나 받나 (금액)', '언제 신청하나 (기간·지급일)', '어떻게 신청하나 (방법·필요 서류)', '자주 묻는 질문'];

  function searchTiming(d) {
    if (d.schedule) return '「' + d.schedule + '」 전후로 검색이 몰립니다. 그 1~2주 전에 메인 글을 발행해 자리를 잡으세요.';
    return '신청일·지급일이 다가올 때 검색이 몰립니다. 발표 직후 먼저 써 두세요.';
  }

  function otherPosts(d) {
    var map = load(URL_KEY, {});
    var own = normKey(d.keyword);
    var saved = Object.keys(map).filter(function (k) { return k !== own; })
      .map(function (k) { return map[k]; }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 3);
    return saved;
  }

  function guideText(d) {
    var easy = sorted(allItems(d)).filter(function (x) { var m = metricOf(x.keyword); return !m || !m.verdict || m.verdict.code !== 'hard'; });
    var subs = easy.slice(0, 6).map(function (x) { return x.keyword; });
    var lines = [
      '메인 키워드: ' + d.keyword,
      '',
      '[반드시 넣을 소제목]',
    ].concat(HEADINGS.map(function (h) { return '- ' + h; }));
    if (subs.length) lines.push('- 연결 질문도 소제목·FAQ로 짧게 다루기: ' + subs.join(', '));
    lines.push('', '[지킬 사실 · 기사 문장 그대로, 출처 확인 후 사용]');
    if (d.facts && d.facts.length) {
      d.facts.forEach(function (f) { lines.push('- (' + f.types.join('·') + ') ' + f.text + (f.link ? '  [출처: ' + (f.source || '기사') + ' ' + f.link + ']' : '')); });
    } else {
      lines.push('- (가져온 기사가 없습니다. 정책브리핑·부처 보도자료에서 날짜·금액·대상을 직접 확인해 넣으세요.)');
    }
    lines.push('', '[검색이 붙을 시기]', '- ' + searchTiming(d));
    var others = otherPosts(d);
    lines.push('', '[글 끝 "함께 보면 좋은 글" 버튼 · 내 다른 글]');
    if (others.length) others.forEach(function (o) { lines.push('- ' + o.kw + ' → ' + o.url); });
    else lines.push('- (다른 메인 글 주소를 저장하면 여기에 자동으로 들어갑니다)');
    lines.push('', '[주의]',
      '- 기사에 없는 금액·날짜·조건은 지어내지 마세요.',
      d.draft ? '- 아직 확정 전인 정책(정부안·개편안 단계)입니다. 본문에 "정부안 기준"이라고 밝히세요.' : '- 확정 전인 내용이면 "정부안 기준"이라고 밝히세요.',
      '- 첫 문단에서 핵심 답(대상·금액·기간)을 먼저 쓰세요.');
    return lines.join('\n');
  }

  function buttonHtml(url, text) {
    return '<p style="text-align:center;margin:28px 0"><a href="' + (url || 'A_메인글_주소') + '" style="display:inline-block;padding:14px 28px;background:#0284c7;color:#ffffff;border-radius:10px;font-weight:700;text-decoration:none">' + text + '</a></p>';
  }

  function linkPrompt(d, item, account) {
    var url = getMainUrl(d.keyword);
    var text = ctaText(d);
    var siblings = allItems(d).filter(function (x) { return x.keyword !== item.keyword; }).slice(0, 3).map(function (x) { return x.keyword; });
    var lines = [
      '[연결 글 작성 요청' + (account ? ' · ' + account + ' 계정' : '') + ']',
      '메인 키워드: ' + item.keyword,
      '연관 키워드: ' + siblings.join(', '),
      '',
      '작성 방향:',
      '- 이 글은 「' + d.keyword + '」 메인 글로 이어지는 연결 글입니다. 「' + item.keyword + '」 질문 하나에만 답하세요.',
      '- 첫 문단에 답을 먼저 쓰고, 소제목 3~4개로 짧게 정리하세요.',
      '- 아래 "지킬 사실"만 근거로 쓰고, 기사에 없는 금액·날짜는 지어내지 마세요.' + (d.draft ? ' 정부안 단계이므로 "정부안 기준"이라고 밝히세요.' : ''),
    ];
    if (item.question) lines.push('- 실제 질문: ' + item.question);
    if (d.facts && d.facts.length) {
      lines.push('', '지킬 사실:');
      d.facts.slice(0, 4).forEach(function (f) { lines.push('- ' + f.text); });
    }
    lines.push('', '버튼 링크 (글 하나에 1개만):',
      '- 문구: ' + text,
      '- 주소: ' + (url || '(A 메인 글 주소를 먼저 저장하세요)'),
      '- 위치: 버튼 문구와 가장 잘 맞는 소제목 바로 뒤 (자동 판단)',
      '- 아래 HTML을 그 자리에 그대로 넣어 전체 본문을 HTML로 써 주세요:',
      buttonHtml(url, text));
    return lines.join('\n');
  }

  function itemLine(x) {
    var m = metricOf(x.keyword);
    var tail = m && m.verdict ? '  [' + m.verdict.label + ' · 문서 ' + fmtNum(m.blogCount) + ' · 제목 ' + m.titleMatch + '/100]' : '';
    return x.keyword + tail + (x.source === 'kin' && x.link ? '  (질문: ' + x.question + ' ' + x.link + ')' : '');
  }

  function setText(d) {
    var parts = ['■ 메인 글 · A 계정: ' + d.keyword, ''];
    COLS.forEach(function (c) {
      var list = listOf(d, c.id);
      if (!list.length && (c.id === 'region' || c.id === 'mine')) return;
      parts.push('[' + c.title + ']');
      parts.push(list.length ? sorted(list).map(function (x) { return '- ' + itemLine(x); }).join('\n') : '- (없음)');
      parts.push('');
    });
    parts.push('※ 한 계정에는 한 세트에서 3~4개까지만, 날짜를 나눠 올리고, 메인 글 링크는 글 하나에 1개만.');
    return parts.join('\n');
  }

  /* ---------- 발행 일정표 ---------- */

  function planOpts() { return load(PLAN_KEY, { perDay: 1, start: '' }); }
  function addDays(date, n) { var t = new Date(date.getTime()); t.setDate(t.getDate() + n); return t; }
  function fmtDate(t) { return (t.getMonth() + 1) + '/' + t.getDate() + ' (' + '일월화수목금토'.charAt(t.getDay()) + ')'; }
  function startDate() {
    var s = planOpts().start;
    var t = s ? new Date(s + 'T00:00:00') : addDays(new Date(), 1);
    return isNaN(t.getTime()) ? addDays(new Date(), 1) : t;
  }

  function buildPlan(d) {
    var cap = { B: PER_ACCOUNT_CAP, C: PER_ACCOUNT_CAP };
    var acc = { B: [], C: [] };
    var leftover = [];
    var pool = [];
    COLS.forEach(function (c) { listOf(d, c.id).forEach(function (x) { pool.push({ item: x, pref: c.account }); }); });
    pool.sort(function (a, b) { return byEase(a.item, b.item); });
    pool.forEach(function (p) {
      var m = metricOf(p.item.keyword);
      var weak = m && m.verdict && (m.verdict.code === 'hard' || m.verdict.code === 'official');
      var target = p.pref && acc[p.pref].length < cap[p.pref] ? p.pref
        : (acc.B.length <= acc.C.length ? (acc.B.length < cap.B ? 'B' : (acc.C.length < cap.C ? 'C' : null)) : (acc.C.length < cap.C ? 'C' : (acc.B.length < cap.B ? 'B' : null)));
      if (weak && m.verdict.code === 'hard') target = null; // 경쟁 많은 것은 블로그로 정면 승부하지 않고 외부 유입으로
      if (target) acc[target].push(p.item); else leftover.push(p.item);
    });
    var perDay = Math.max(1, Number(planOpts().perDay) || 1);
    var start = startDate();
    var rows = [{ day: 0, date: start, account: 'A', item: { keyword: d.keyword }, main: true }];
    ['B', 'C'].forEach(function (a) {
      acc[a].forEach(function (x, i) { rows.push({ day: 1 + Math.floor(i / perDay), account: a, item: x }); });
    });
    rows.forEach(function (r) { r.date = addDays(start, r.day); });
    rows.sort(function (a, b) { return a.day - b.day || (a.account < b.account ? -1 : 1); });
    return { rows: rows, leftover: leftover };
  }

  function planText(d) {
    var p = buildPlan(d);
    var lines = ['[발행 일정표] ' + d.keyword];
    p.rows.forEach(function (r) { lines.push(fmtDate(r.date) + '  ' + r.account + ' 계정  ' + r.item.keyword + (r.main ? '  (메인 글)' : '')); });
    if (p.leftover.length) lines.push('', '[외부 유입용 · 블로그·카페·SNS에 내 글 링크]', p.leftover.map(function (x) { return '- ' + x.keyword; }).join('\n'));
    return lines.join('\n');
  }

  /* ---------- 결과 그리기 ---------- */

  function fmtNum(v) { return v == null ? '-' : Number(v).toLocaleString('ko-KR'); }
  function fmtVol(v) {
    if (v == null) return '';
    return v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '만' : v.toLocaleString('ko-KR');
  }
  function ageText(days) {
    if (days == null) return '-';
    if (days < 31) return days + '일';
    if (days < 365) return Math.round(days / 30) + '개월';
    return (days / 365).toFixed(1) + '년';
  }

  function verdictBadge(m) {
    if (!m) return competeState === 'loading' ? '<span class="sp-v wait">재는 중</span>' : '';
    if (m.error || !m.verdict) return '<span class="sp-v hard">측정 실패</span>';
    return '<span class="sp-v ' + esc(m.verdict.code) + '">' + esc(m.verdict.label) + '</span>';
  }

  function itemHtml(x) {
    var m = metricOf(x.keyword);
    var q = x.source === 'kin' && x.link
      ? '<a class="sp-q" href="' + esc(x.link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(x.question) + '">질문 ↗</a>'
      : '';
    var stats = m && !m.error
      ? '<span class="sp-stat">' + (m.volume != null ? '월 ' + (m.under10 ? '<10' : fmtVol(m.volume)) + ' · ' : '') + '문서 ' + fmtVol(m.blogCount) + ' · 제목 ' + m.titleMatch + '/100 · 상위글 ' + ageText(m.avgAgeDays) + '</span>'
      : '';
    var label = SRC_LABEL[x.source] || '';
    if (x.source === 'question' && x.verified) label = '검색 확인';
    return '<li class="sp-item"><button type="button" class="sp-kw" data-copy="' + esc(x.keyword) + '" title="눌러서 복사">'
      + '<span class="sp-kw-row"><span class="sp-kw-t">' + esc(x.keyword) + '</span>' + verdictBadge(m) + '</span>'
      + '<span class="sp-kw-row sub"><span class="sp-src ' + esc(x.source) + '">' + esc(label) + '</span>' + stats + '</span>'
      + '</button>' + q + '</li>';
  }

  function colHtml(c, list) {
    return '<div class="sp-col"><div class="sp-col-head"><span class="sp-col-t">' + c.title + ' <small>· ' + list.length + '개</small></span>'
      + '<button type="button" class="sp-pill" data-col="' + c.id + '">복사</button></div>'
      + (list.length ? '<ul class="sp-items">' + sorted(list).map(itemHtml).join('') + '</ul>' : '<div class="sp-empty">가져온 키워드가 없습니다.</div>')
      + '</div>';
  }

  function renderCols() {
    var d = current;
    if (!d || !$('spCols')) return;
    $('spCols').innerHTML = COLS.filter(function (c) { return listOf(d, c.id).length || (c.id !== 'region' && c.id !== 'mine'); })
      .map(function (c) { return colHtml(c, listOf(d, c.id)); }).join('');
    var note = '';
    if (competeState === 'loading') note = '연결 키워드마다 블로그 문서수와 제목 경쟁을 재고 있어요…';
    else if (competeState === 'unavailable') note = '경쟁도를 잴 수 없습니다 (검색 키 없음 또는 일시 오류). 키워드분석기로 하나씩 확인해 주세요.';
    else if (competeState === 'done') note = '판정 기준: <b>빈집</b> 상위 100개 중 제목 일치 3개 이하 · <b>진입 가능</b> 15개 이하(또는 40개 이하이면서 상위 10개에 2주 안 새 글 3개+) · <b>공식 자료가 위 차지</b> 상위 10개 중 공식 블로그 4개+ · 나머지 <b>경쟁 많음</b>';
    $('spCompeteNote').innerHTML = note;
  }

  function renderMain() {
    var d = current;
    var m = metricOf(d.keyword);
    var box = $('spMainStats');
    if (!box) return;
    if (!m || m.error) { box.innerHTML = competeState === 'loading' ? '<span class="sp-stat">메인 키워드 경쟁도 재는 중…</span>' : ''; return; }
    var cells = [
      ['월 검색', m.volume == null ? '-' : (m.under10 ? '<10' : fmtNum(m.volume))],
      ['블로그 문서', fmtNum(m.blogCount)],
      ['상위 100개 중 제목 일치', m.titleMatch + '개'],
      ['상위 10개 평균 나이', ageText(m.avgAgeDays)],
      ['최근 30일 같은 제목 글', m.recent30 == null ? '-' : fmtNum(m.recent30) + '개'],
    ];
    box.innerHTML = cells.map(function (c) { return '<span class="sp-mcell"><small>' + c[0] + '</small><b>' + c[1] + '</b></span>'; }).join('')
      + '<span class="sp-mcell"><small>판정</small>' + verdictBadge(m) + '</span>'
      + (m.verdict && m.verdict.code !== 'empty' ? '<p class="sp-main-tip">메인 키워드는 거미줄의 중심으로 두고, 실제 유입은 아래 <b>빈집·진입 가능</b> 연결 키워드로 받으세요.</p>' : '');
  }

  function renderGuide() {
    if (!current || !$('spGuidePre')) return;
    $('spGuidePre').textContent = guideText(current);
    var f = current.facts;
    $('spFactNote').textContent = f == null ? '기사에서 지킬 사실을 찾는 중…' : (f.length ? '기사 ' + f.length + '문장을 근거로 넣었어요. 출처를 눌러 확인하세요.' : '');
  }

  function renderPlan() {
    var d = current;
    if (!d || !$('spPlanBody')) return;
    var p = buildPlan(d);
    $('spPlanBody').innerHTML = p.rows.map(function (r, i) {
      var m = r.main ? null : metricOf(r.item.keyword);
      return '<tr' + (r.main ? ' class="main"' : '') + '><td>' + fmtDate(r.date) + '</td><td><span class="sp-acc ' + r.account + '">' + r.account + '</span></td>'
        + '<td class="kw">' + esc(r.item.keyword) + (r.main ? ' <small>메인 글 · 먼저 발행</small>' : '') + '</td>'
        + '<td>' + (r.main ? '' : verdictBadge(m)) + '</td>'
        + '<td>' + (r.main ? '<button type="button" class="sp-pill" data-act="guide">가이드 복사</button>' : '<button type="button" class="sp-pill" data-prompt="' + i + '">프롬프트 복사</button>') + '</td></tr>';
    }).join('');
    $('spLeft').innerHTML = p.leftover.length
      ? '<div class="sp-left-t">외부 유입용 ' + p.leftover.length + '개 <small>계정 몫을 넘거나 경쟁이 많은 키워드 · 블로그·카페·SNS 글에서 내 글로 링크</small></div>'
        + '<div class="sp-left-list">' + p.leftover.map(function (x) { return '<span class="sp-chip">' + esc(x.keyword) + '</span>'; }).join('') + '</div>'
        + '<button type="button" class="sp-btn primary" data-act="external">외부유입 생성기로 보내기</button>'
      : '<div class="sp-left-t">남는 키워드 없음 <small>모두 B·C 계정 일정에 들어갔어요</small></div>';
    currentPlan = p;
  }
  var currentPlan = null;

  function refreshAll() { renderMain(); renderCols(); renderGuide(); renderPlan(); }

  function renderSet(d, opts) {
    opts = opts || {};
    current = d;
    d.region = d.region || [];
    d.mine = d.mine || [];
    var kinN = allItems(d).filter(function (x) { return x.source === 'kin'; }).length;
    var when = d.generatedAt ? new Date(d.generatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    var done = isDone(d.keyword);
    var news = (d.news || []).length
      ? '<ul class="sp-news">' + d.news.map(function (n) {
        return '<li>📰 <a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">' + esc(n.title) + '</a>' + (n.source ? ' · ' + esc(n.source) : '') + '</li>';
      }).join('') + '</ul>'
      : '';
    var po = planOpts();
    var url = getMainUrl(d.keyword);

    $('spResult').innerHTML =
      '<div class="sp-set">'
      + '<div class="sp-set-head"><h3 class="sp-set-kw">' + esc(d.keyword) + '</h3>'
      + '<button type="button" class="sp-pill" data-act="main">메인 키워드 복사</button>'
      + '<button type="button" class="sp-pill' + (done ? ' on' : '') + '" data-act="done">' + (done ? '✓ 썼어요' : '썼어요') + '</button>'
      + '<span class="sp-badge">메인 글 · A 계정</span></div>'
      + '<div id="spMainStats" class="sp-main-stats"></div>'
      + '<p class="sp-set-sum">연결 글 키워드 ' + allItems(d).length + '개 · 지식iN 질문에서 ' + kinN + '개'
      + (d.schedule ? ' · <span class="sp-tag sch">📅 ' + esc(d.schedule) + '</span>' : '')
      + (when ? '<span class="sp-fresh">' + (opts.fromBundle ? '추천 묶음 생성 ' : '가져온 시각 ') + esc(when) + '</span>' : '') + '</p>'
      + news

      + '<div class="sp-step"><span class="sp-step-n">1</span><span class="sp-step-t">A 메인 글 쓰기</span></div>'
      + '<div class="sp-guide"><div class="sp-guide-head"><span class="sp-guide-t">A 계정 글 가이드 · 글쓰기 프롬프트에 붙여 넣기 <small id="spFactNote"></small></span>'
      + '<button type="button" class="sp-pill" data-act="guide">가이드 복사</button></div><pre id="spGuidePre"></pre>'
      + (d.facts && d.facts.length ? '<ul class="sp-facts">' + d.facts.map(function (f) {
        return '<li><span class="sp-ft">' + esc(f.types.join('·')) + '</span>' + esc(f.text) + (f.link ? ' <a href="' + esc(f.link) + '" target="_blank" rel="noopener noreferrer">' + esc(f.source || '출처') + ' ↗</a>' : '') + '</li>';
      }).join('') + '</ul>' : '')
      + '</div>'

      + '<div class="sp-cta">'
      + '<label>발행한 A 메인 글 주소 <input id="spAUrl" type="url" placeholder="https://내사이트.com/메인글" value="' + esc(url) + '"></label>'
      + '<label>버튼 문구 <input id="spCtaText" type="text" maxlength="40" value="' + esc(ctaText(d)) + '"></label>'
      + '<button type="button" class="sp-btn" data-act="saveurl">저장</button>'
      + '<p class="sp-cta-tip">저장하면 B·C 연결 글 프롬프트에 버튼 링크가 들어가고, 다른 메인 글 가이드의 "내 다른 글" 목록에도 들어갑니다.</p>'
      + '</div>'

      + '<div class="sp-step"><span class="sp-step-n">2</span><span class="sp-step-t">연결 글 키워드 고르기</span>'
      + '<label class="sp-sort"><input type="checkbox" id="spSortEasy"' + (sortEasy ? ' checked' : '') + '> 쓰기 쉬운 순</label></div>'
      + '<p id="spCompeteNote" class="sp-compete-note"></p>'
      + '<div id="spCols" class="sp-cols"></div>'

      + '<div class="sp-tools">'
      + '<div class="sp-tool"><div class="sp-tool-t">지역 붙이기 <small>지역 이름을 붙이면 또 하나의 빈집이 됩니다</small></div>'
      + '<div class="sp-region-chips">' + REGIONS.map(function (r) { return '<button type="button" class="sp-chip" data-region="' + r + '">' + r + '</button>'; }).join('') + '</div>'
      + '<form id="spRegionForm" class="sp-mini-form"><input id="spRegionIn" type="text" maxlength="12" placeholder="시·군·구 (예: 파주)"><button type="submit" class="sp-pill">붙이기</button></form></div>'
      + '<div class="sp-tool"><div class="sp-tool-t">내가 찾은 키워드와 비교 <small>한 줄에 하나</small></div>'
      + '<textarea id="spMineIn" rows="3" placeholder="' + esc(d.keyword) + ' 연계 병원 조회&#10;' + esc(d.keyword) + ' 앱 신청"></textarea>'
      + '<button type="button" class="sp-pill" data-act="compare">비교하기</button><div id="spCompareOut" class="sp-compare-out"></div></div>'
      + '</div>'

      + '<div class="sp-step"><span class="sp-step-n">3</span><span class="sp-step-t">날짜 나눠 발행하기</span></div>'
      + '<div class="sp-plan-opts"><label>시작일 <input id="spPlanStart" type="date" value="' + esc(po.start || '') + '"></label>'
      + '<label>계정당 하루 <select id="spPlanPer"><option value="1"' + (Number(po.perDay) === 1 ? ' selected' : '') + '>1개</option><option value="2"' + (Number(po.perDay) === 2 ? ' selected' : '') + '>2개</option></select></label>'
      + '<button type="button" class="sp-pill" data-act="plancopy">일정표 복사</button></div>'
      + '<div class="sp-plan-wrap"><table class="sp-plan"><thead><tr><th>날짜</th><th>계정</th><th>키워드</th><th>판정</th><th></th></tr></thead><tbody id="spPlanBody"></tbody></table></div>'
      + '<div id="spLeft" class="sp-left"></div>'

      + '<div class="sp-actions">'
      + '<button type="button" class="sp-btn primary" data-act="analyze">메인 키워드 분석하러가기</button>'
      + '<button type="button" class="sp-btn" data-act="all">세트 전체 복사</button>'
      + (opts.fromBundle ? '<button type="button" class="sp-btn" data-act="refresh">지금 기준으로 새로 뽑기</button>' : '')
      + '</div></div>';

    refreshAll();
    if (!opts.keepMetrics) loadCompete(d); // 기사 근거만 새로 받은 경우에는 경쟁도를 다시 재지 않습니다
    if (d.facts == null) loadFacts(d);
  }

  /* ---------- 경쟁도 · 기사 근거 불러오기 ---------- */

  var competeToken = 0;
  function loadCompete(d, onlyNew) {
    var token = ++competeToken;
    var kws = [d.keyword].concat(allItems(d).map(function (x) { return x.keyword; }))
      .filter(function (k, i, a) { return a.indexOf(k) === i && (!onlyNew || !metricOf(k)); });
    if (!kws.length) return;
    competeState = 'loading';
    refreshAll();
    var chunks = [];
    for (var i = 0; i < kws.length; i += 10) chunks.push(kws.slice(i, i + 10));
    var ok = 0;
    Promise.all(chunks.map(function (c) {
      return getJson(api('/api/spider/compete', { k: c.join('|') }), 30000).then(function (r) {
        if (token !== competeToken || !r.success) return;
        ok += 1;
        r.items.forEach(function (m) { metrics[normKey(m.keyword)] = m; });
        refreshAll();
      }).catch(function () {});
    })).then(function () {
      if (token !== competeToken) return;
      competeState = ok ? 'done' : 'unavailable';
      refreshAll();
    });
  }

  function loadFacts(d) {
    getJson(api('/api/spider/facts', { q: d.keyword }), 20000).then(function (r) {
      if (current !== d) return;
      if (!r.success) { d.facts = []; renderGuide(); return; }
      d.facts = r.facts || [];
      if (!d.schedule && r.schedule) d.schedule = r.schedule;
      d.draft = !!r.draft;
      if (!(d.news || []).length && r.news) d.news = r.news;
      renderSet(d, { keepMetrics: true });
    }).catch(function () { if (current === d) { d.facts = []; renderGuide(); } });
  }

  function msg(text, isErr) {
    $('spResult').innerHTML = '<div class="sp-msg' + (isErr ? ' sp-err' : '') + '">' + esc(text) + '</div>';
  }

  /* ---------- 실시간 생성 ---------- */

  var busy = false;
  function run(kw) {
    kw = String(kw || '').trim();
    if (!kw || busy) return;
    $('spInput').value = kw;
    busy = true;
    $('spGo').disabled = true;
    $('spGo').textContent = '뽑는 중…';
    markRecActive(null);
    msg('검색창 연관 검색어, 지식iN 질문, 질문형 키워드를 모으고 있어요. (5~10초)');
    getJson(api('/api/spider', { q: kw }), 25000)
      .then(function (d) {
        if (!d.success) throw new Error(d.error || '키워드를 가져오지 못했습니다.');
        if (!allItems(d).length) throw new Error('연결 키워드를 찾지 못했습니다. 조금 더 넓은 키워드로 다시 넣어 보세요.');
        pushHistory(d.keyword);
        d.d = d.d || [];
        d.facts = null;
        renderSet(d);
      })
      .catch(function (e) {
        var text = e && e.name === 'TimeoutError' ? '응답이 늦어 중단했습니다. 잠시 후 다시 눌러 주세요.' : (e && e.message) || '오류가 발생했습니다.';
        msg(text, true);
      })
      .then(function () {
        busy = false;
        $('spGo').disabled = false;
        $('spGo').textContent = '키워드 뽑기';
      });
  }

  /* ---------- 추천 묶음 ---------- */

  function renderBundles() {
    var data = window.SPIDER_BUNDLES;
    var box = $('spRec');
    if (!data || !data.topics || !data.topics.length) {
      box.innerHTML = '<div class="sp-rec-empty">추천 묶음을 아직 만들지 않았습니다. 다음 자동 갱신 때 채워집니다.</div>';
      return;
    }
    var gen = new Date(data.generatedAt);
    var next = new Date(data.nextRefreshAt);
    var f = function (d) { return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }); };
    $('spRecStamp').textContent = f(gen) + ' 생성 · 다음 갱신 ' + f(next) + '경';
    box.innerHTML = data.topics.map(function (t, i) {
      var tags = [];
      if (t.volume != null) tags.push('<span class="sp-tag vol">월 ' + fmtVol(t.volume) + '회</span>');
      if (t.schedule) tags.push('<span class="sp-tag sch">📅 ' + esc(t.schedule) + '</span>');
      if (t.official) tags.push('<span class="sp-tag off">정책브리핑</span>');
      if (t.facts && t.facts.length) tags.push('<span class="sp-tag">근거 ' + t.facts.length + '문장</span>');
      if (t.origin === 'seed') tags.push('<span class="sp-tag seed">상시 주제</span>');
      else if (t.articleCount) tags.push('<span class="sp-tag">기사 ' + t.articleCount + '건</span>');
      if (isDone(t.keyword)) tags.push('<span class="sp-tag done">✓ 썼어요</span>');
      var headline = t.news && t.news[0] ? t.news[0].title : '해마다 신청 일정이 있는 주제';
      return '<button type="button" class="sp-rec-card" data-rec="' + i + '">'
        + '<span class="sp-rec-top"><span class="sp-rec-kw">' + esc(t.keyword) + '</span><span class="sp-rec-n">' + (i + 1) + '</span></span>'
        + '<span class="sp-rec-meta">' + tags.join('') + '</span>'
        + '<span class="sp-rec-news">' + esc(headline) + '</span></button>';
    }).join('');
  }

  function markRecActive(idx) {
    Array.prototype.forEach.call(document.querySelectorAll('#spRec .sp-rec-card'), function (c) {
      c.classList.toggle('active', idx != null && c.getAttribute('data-rec') === String(idx));
    });
  }

  function openBundle(idx) {
    var data = window.SPIDER_BUNDLES;
    var t = data && data.topics[idx];
    if (!t) return;
    $('spInput').value = t.keyword;
    renderSet({
      keyword: t.keyword, b: t.b || [], c: t.c || [], d: t.d || [], spare: t.spare || [],
      facts: t.facts || null, schedule: t.schedule || '', draft: !!t.draft, news: t.news || [],
      generatedAt: data.generatedAt,
    }, { fromBundle: true });
    markRecActive(idx);
    $('spResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- 지역 · 내 키워드 ---------- */

  function addRegion(r) {
    var d = current;
    r = String(r || '').trim().replace(/\s+/g, '');
    if (!d || !r) return;
    var base = d.keyword;
    var made = [r + ' ' + base, r + ' ' + base + ' 신청'];
    var have = allItems(d).map(function (x) { return normKey(x.keyword); });
    var added = made.filter(function (k) { return have.indexOf(normKey(k)) < 0; }).map(function (k) { return { keyword: k, source: 'region' }; });
    if (!added.length) { toast('이미 넣은 지역이에요'); return; }
    d.region = d.region.concat(added).slice(-10);
    toast(r + ' 지역 키워드 ' + added.length + '개 추가');
    loadCompete(d, true);
  }

  function compareMine() {
    var d = current;
    var lines = String($('spMineIn').value || '').split(/[\n,]/).map(function (s) { return s.trim().replace(/\s+/g, ' '); }).filter(Boolean);
    if (!d || !lines.length) { toast('비교할 키워드를 넣어 주세요'); return; }
    var where = {};
    COLS.forEach(function (c) { listOf(d, c.id).forEach(function (x) { where[normKey(x.keyword)] = c.title; }); });
    var have = [], fresh = [];
    lines.forEach(function (k) {
      var n = normKey(k);
      if (where[n]) { have.push(k + ' → ' + where[n]); return; }
      var near = Object.keys(where).filter(function (w) { return w.indexOf(n) >= 0 || n.indexOf(w) >= 0; })[0];
      fresh.push({ keyword: k, source: 'mine', near: near });
    });
    var known = (d.mine || []).map(function (x) { return normKey(x.keyword); });
    d.mine = (d.mine || []).concat(fresh.filter(function (x) { return known.indexOf(normKey(x.keyword)) < 0; })).slice(-12);
    $('spCompareOut').innerHTML =
      (have.length ? '<div><b>목록에 있음 ' + have.length + '</b> · ' + have.map(esc).join(' / ') + '</div>' : '')
      + (fresh.length ? '<div><b>목록에 없던 질문 ' + fresh.length + '</b> · ' + fresh.map(function (x) { return esc(x.keyword); }).join(', ') + ' → "내가 찾은 키워드" 열에 넣고 경쟁도를 잽니다.</div>' : '')
      + (!fresh.length ? '<div>새로 찾은 질문은 없어요. 자동 목록이 내 키워드를 모두 담고 있습니다.</div>' : '');
    if (fresh.length) loadCompete(d, true);
  }

  /* ---------- 외부유입 생성기로 넘기기 ---------- */

  function sendToExternal() {
    var d = current;
    var p = currentPlan || buildPlan(d);
    var setVal = function (id, v) {
      var el = $(id);
      if (!el) return;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    var raw = (d.facts || []).map(function (f) { return f.text; }).join('\n');
    if (raw.length < 30) raw = d.keyword + ' 핵심 정리\n' + guideText(d);
    if (typeof window.switchTab === 'function') window.switchTab('external');
    setTimeout(function () {
      setVal('ext-main-kw-input', d.keyword);
      setVal('ext-sub-kw-input', p.leftover.map(function (x) { return x.keyword; }).join(', '));
      setVal('ext-cta-link-input', getMainUrl(d.keyword));
      setVal('ext-raw-content-input', raw);
      toast(getMainUrl(d.keyword) ? '외부유입 생성기에 채웠어요' : '채웠어요 · CTA 링크에 A 글 주소를 넣어 주세요');
    }, 80);
  }

  /* ---------- 이벤트 ---------- */

  function onResultClick(e) {
    var el = e.target.closest('button');
    if (!el || !current) return;
    var d = current;
    if (el.hasAttribute('data-copy')) {
      copy(el.getAttribute('data-copy'), '「' + el.getAttribute('data-copy') + '」 복사');
      el.classList.add('copied');
      return;
    }
    if (el.hasAttribute('data-region')) { addRegion(el.getAttribute('data-region')); return; }
    if (el.hasAttribute('data-prompt')) {
      var row = (currentPlan || buildPlan(d)).rows[Number(el.getAttribute('data-prompt'))];
      if (row) copy(linkPrompt(d, row.item, row.account), '「' + row.item.keyword + '」 연결 글 프롬프트 복사');
      if (!getMainUrl(d.keyword)) toast('A 메인 글 주소를 저장하면 버튼 링크가 들어가요');
      return;
    }
    var col = el.getAttribute('data-col');
    if (col) {
      var list = sorted(listOf(d, col));
      copy(list.map(function (x) { return x.keyword; }).join('\n'), list.length + '개 복사');
      return;
    }
    switch (el.getAttribute('data-act')) {
      case 'main': copy(d.keyword, '메인 키워드 복사'); break;
      case 'guide': copy(guideText(d), 'A 계정 가이드 복사'); break;
      case 'all': copy(setText(d), '세트 전체 복사'); break;
      case 'plancopy': copy(planText(d), '일정표 복사'); break;
      case 'compare': compareMine(); break;
      case 'external': sendToExternal(); break;
      case 'saveurl': {
        var u = String($('spAUrl').value || '').trim();
        if (u && !/^https?:\/\//i.test(u)) { toast('https:// 로 시작하는 주소를 넣어 주세요'); break; }
        setMainUrl(d.keyword, u);
        setCtaText(d.keyword, String($('spCtaText').value || '').trim());
        renderGuide();
        toast(u ? '저장했어요 · 연결 글 프롬프트에 버튼 링크가 들어갑니다' : '주소를 지웠어요');
        break;
      }
      case 'done': {
        var on = toggleDone(d.keyword);
        el.classList.toggle('on', on);
        el.textContent = on ? '✓ 썼어요' : '썼어요';
        renderBundles();
        markRecActive(findBundleIdx(d.keyword));
        break;
      }
      case 'analyze':
        if (typeof window.runKeywordAnalysis === 'function') window.runKeywordAnalysis(d.keyword.replace(/\s+/g, ''));
        else if (typeof window.switchTab === 'function') window.switchTab('keyword');
        break;
      case 'refresh': run(d.keyword); break;
      default: break;
    }
  }

  function onResultChange(e) {
    var t = e.target;
    if (!current) return;
    if (t.id === 'spSortEasy') { sortEasy = t.checked; renderCols(); renderGuide(); return; }
    if (t.id === 'spPlanStart' || t.id === 'spPlanPer') {
      save(PLAN_KEY, { start: $('spPlanStart').value, perDay: Number($('spPlanPer').value) || 1 });
      renderPlan();
    }
  }

  function onResultSubmit(e) {
    if (e.target.id !== 'spRegionForm') return;
    e.preventDefault();
    addRegion($('spRegionIn').value);
    $('spRegionIn').value = '';
  }

  function findBundleIdx(kw) {
    var data = window.SPIDER_BUNDLES;
    if (!data || !data.topics) return null;
    for (var i = 0; i < data.topics.length; i++) if (normKey(data.topics[i].keyword) === normKey(kw)) return i;
    return null;
  }

  function init() {
    if (!$('tab-spider')) return;
    $('spForm').addEventListener('submit', function (e) { e.preventDefault(); run($('spInput').value); });
    $('spHist').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.getAttribute('data-clear')) { save(HIST_KEY, []); renderHistory(); return; }
      run(b.getAttribute('data-kw'));
    });
    $('spResult').addEventListener('click', onResultClick);
    $('spResult').addEventListener('change', onResultChange);
    $('spResult').addEventListener('submit', onResultSubmit);
    $('spRec').addEventListener('click', function (e) {
      var c = e.target.closest('[data-rec]');
      if (c) openBundle(Number(c.getAttribute('data-rec')));
    });
    renderHistory();
    renderBundles();
    window.runSpiderKeywords = function (kw) {
      if (typeof window.switchTab === 'function') window.switchTab('spider');
      run(kw);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
