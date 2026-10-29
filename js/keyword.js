/**
 * 키워드 분석기 (js/keyword.js)
 * - 직접 만든 Worker(worker/keyword-worker.mjs)에서 데이터를 받아 화면에 보여줍니다.
 * - 월 검색량 / 블로그 문서수 / 경쟁도 / 상위글 평균 나이 / 뉴스 / 상위 블로그 / 연관 키워드 표
 */
(function () {
  'use strict';

  // ★ Cloudflare Worker 배포 후 나오는 주소를 여기에 넣으세요. (예: 'https://moneyt-keyword.내계정.workers.dev')
  var KEYWORD_WORKER_URL = 'https://moneyt-keyword.tkdgus8231.workers.dev';

  var HIST_KEY = 'kw_hist_v2';
  var current = null;
  var goldenOnly = false;

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
  function card(label, value, sub) {
    var c = el('div', 'kw-card');
    c.appendChild(el('div', 'kw-card-k', label));
    c.appendChild(el('div', 'kw-card-v', value));
    if (sub) c.appendChild(el('div', 'kw-card-s', sub));
    return c;
  }
  function section(title, sub) {
    var s = el('div', 'kw-sec');
    s.appendChild(el('h3', 'kw-sec-t', title));
    if (sub) s.appendChild(el('p', 'kw-sec-s', sub));
    return s;
  }
  function showMessage(msg, isError) {
    var box = $('kwResult'); box.textContent = '';
    box.appendChild(el('div', isError ? 'kw-msg kw-err' : 'kw-msg', msg));
  }

  function ageHint(days) {
    if (days == null) return '';
    if (days >= 180) return '오래된 글이 상위 → 새 글 진입 기회';
    if (days <= 30) return '최신 글 위주 → 꾸준한 발행 필요';
    return '보통';
  }

  function render(d) {
    current = d;
    var box = $('kwResult'); box.textContent = '';

    var head = el('div', 'kw-head');
    head.appendChild(el('h2', 'kw-title', '“' + d.keyword + '” 분석 결과'));
    head.appendChild(el('span', 'kw-badge', '네이버 기준'));
    if (d.golden) head.appendChild(el('span', 'kw-badge kw-gold', '💎 황금 후보'));
    box.appendChild(head);

    var cards = el('div', 'kw-cards');
    cards.appendChild(card('월 검색량', fmt(d.total), 'PC ' + fmt(d.pc) + ' · 모바일 ' + fmt(d.mobile)));
    cards.appendChild(card('블로그 문서수', fmt(d.blogCount), '네이버 블로그 누적'));
    cards.appendChild(card('경쟁도', d.competition, d.ratio == null ? '' : '문서/검색 ' + d.ratio));
    cards.appendChild(card('상위글 평균 나이', d.avgAgeDays == null ? '-' : d.avgAgeDays + '일', ageHint(d.avgAgeDays)));
    box.appendChild(cards);

    var cols = el('div', 'kw-cols');

    var newsSec = section('📰 왜 검색될까?', '최신 뉴스로 검색 이유를 확인하세요.');
    if (!d.news.length) newsSec.appendChild(el('p', 'kw-empty', '관련 최신 뉴스가 없습니다.'));
    var nl = el('ul', 'kw-list');
    d.news.forEach(function (n) {
      var li = el('li'); var a = el('a', null, n.title);
      a.href = n.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
      li.appendChild(a);
      if (n.pubDate) li.appendChild(el('span', 'kw-meta', new Date(n.pubDate).toLocaleDateString('ko-KR')));
      nl.appendChild(li);
    });
    newsSec.appendChild(nl);
    cols.appendChild(newsSec);

    var blogSec = section('📝 블로그 상위 10개', '검색 결과 상단에 보이는 글입니다.');
    var bl = el('ol', 'kw-list kw-ol');
    d.blogTop.forEach(function (b) {
      var li = el('li'); var a = el('a', null, b.title);
      a.href = b.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
      li.appendChild(a);
      li.appendChild(el('span', 'kw-meta', b.blogger + (b.ageDays == null ? '' : ' · ' + b.ageDays + '일 전')));
      bl.appendChild(li);
    });
    blogSec.appendChild(bl);
    cols.appendChild(blogSec);
    box.appendChild(cols);

    box.appendChild(buildRelated(d));
  }

  function buildRelated(d) {
    var sec = el('div', 'kw-sec kw-related');
    var top = el('div', 'kw-rel-top');
    top.appendChild(el('h3', 'kw-sec-t', '📊 “' + d.keyword + '” 연관 키워드 (' + d.related.length + '개)'));

    var tools = el('div', 'kw-tools');
    var lab = el('label', 'kw-golden-label');
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = goldenOnly;
    cb.onchange = function () { goldenOnly = cb.checked; fillRows(); };
    lab.appendChild(cb); lab.appendChild(document.createTextNode(' 💎 황금 후보만 (문서/검색 0.3 미만)'));
    tools.appendChild(lab);
    var dl = el('button', 'kw-btn', '엑셀(CSV) 다운로드'); dl.type = 'button';
    dl.onclick = function () { downloadCsv(d); };
    tools.appendChild(dl);
    top.appendChild(tools);
    sec.appendChild(top);

    var wrap = el('div', 'kw-table-wrap');
    var table = el('table', 'kw-table');
    var thead = document.createElement('thead'); var tr = document.createElement('tr');
    ['순위', '키워드', '총 검색량', '블로그 문서수', '문서/검색', '경쟁도'].forEach(function (t) { tr.appendChild(el('th', null, t)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = document.createElement('tbody'); tbody.id = 'kwRows'; table.appendChild(tbody);
    wrap.appendChild(table); sec.appendChild(wrap);
    sec.appendChild(el('p', 'kw-note', '※ 검색량이 10 미만인 키워드는 5로 계산합니다. 문서수는 검색량 상위 20개 연관 키워드만 조회합니다.'));
    setTimeout(fillRows, 0);
    return sec;
  }

  function fillRows() {
    var tbody = $('kwRows'); if (!tbody || !current) return;
    tbody.textContent = '';
    var rows = current.related.filter(function (r) { return !goldenOnly || r.golden; });
    if (!rows.length) {
      var tr0 = document.createElement('tr'); var td0 = el('td', 'kw-empty', '조건에 맞는 키워드가 없습니다.'); td0.colSpan = 6;
      tr0.appendChild(td0); tbody.appendChild(tr0); return;
    }
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.appendChild(el('td', 'c', String(i + 1)));
      var tdK = document.createElement('td'); var b = el('button', 'kw-link', r.keyword); b.type = 'button';
      b.onclick = function () { $('kwInput').value = r.keyword; analyze(r.keyword); };
      tdK.appendChild(b);
      if (r.golden) tdK.appendChild(el('span', 'kw-gold-mini', '💎 황금'));
      tr.appendChild(tdK);
      tr.appendChild(el('td', 'n', fmt(r.total)));
      tr.appendChild(el('td', 'n', r.blogCount == null ? '-' : fmt(r.blogCount)));
      tr.appendChild(el('td', 'n', r.ratio == null ? '-' : String(r.ratio)));
      tr.appendChild(el('td', 'c', r.competition));
      tbody.appendChild(tr);
    });
  }

  function downloadCsv(d) {
    var lines = [['키워드', 'PC', '모바일', '총검색량', '블로그문서수', '문서/검색', '경쟁도']];
    lines.push([d.keyword, d.pc, d.mobile, d.total, d.blogCount, d.ratio, d.competition]);
    d.related.forEach(function (r) { lines.push([r.keyword, r.pc, r.mobile, r.total, r.blogCount == null ? '' : r.blogCount, r.ratio == null ? '' : r.ratio, r.competition]); });
    var csv = '\uFEFF' + lines.map(function (row) {
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
    if (!base) { showMessage('분석 서버가 아직 연결되지 않았습니다. (js/keyword.js 의 KEYWORD_WORKER_URL 설정 필요)', true); return; }

    running = true;
    var btn = $('kwGo'); btn.disabled = true; btn.textContent = '분석 중…';
    showMessage('🔎 “' + kw + '” 분석 중입니다. 5~10초 정도 걸려요.', false);
    try {
      var res = await fetch(base + '?q=' + encodeURIComponent(kw));
      var data = await res.json().catch(function () { return null; });
      if (!data) throw new Error('서버 응답을 읽지 못했습니다.');
      if (!data.success) throw new Error(data.error || '분석에 실패했습니다.');
      pushHist(data.keyword); renderHist();
      render(data);
    } catch (e) {
      showMessage('분석 실패: ' + (e.message || '알 수 없는 오류'), true);
    } finally {
      running = false; btn.disabled = false; btn.textContent = '분석하기';
    }
  }
  window.runKeywordAnalysis = analyze;

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('kwForm'); if (!form) return;
    form.addEventListener('submit', function (ev) { ev.preventDefault(); analyze($('kwInput').value); });
    var h = getHist();
    if (!h.length) {
      ['나는솔로', '캠핑의자', '청년도약계좌'].forEach(function (k) { pushHist(k); });
    }
    renderHist();
  });
})();
