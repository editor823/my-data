/* site-boost.js (2026-10-24, Claude)
   1) 키워드분석기 첫 화면: 오늘 바로 분석해 볼 키워드(홈판 소재·틈새 키워드·비밀 키워드 미리보기)
   2) 분석 결과 황금 후보 배지·"황금 후보만" 필터(서버 응답 golden/source 사용)
   3) 홈판 카드 → [분석기에서 열기] [프롬프트로 보내기]
   8) HOME 상단 이번 주 비밀 키워드 안내 + 단톡방 공지 문구 복사
   기존 함수(startKeywordAnalysis·applyFilters·renderKeywordAnalysisResult·fetchFromWorker·showPage)는 감싸기만 하고 동작은 그대로 둔다. */
(function () {
  'use strict';
  var goldenMap = new Map();
  var safeText = function (v) { return String(v == null ? '' : v); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function paidKey() { try { return localStorage.getItem('moneytCommonPaidAccessKey') || ''; } catch (_) { return ''; } }
  async function kc(action) {
    var endpoint = (location.hostname.includes('github.io') || location.protocol === 'file:')
      ? 'https://www.boutique-info.com/api/keyword-center'
      : '/api/keyword-center';
    try {
      var r = await fetch(endpoint + '?action=' + encodeURIComponent(action) + '&paidAccessKey=' + encodeURIComponent(paidKey()), { cache: 'no-store' });
      return await r.json();
    } catch (_) {
      return { success: false, data: [] };
    }
  }
  function toast(msg) {
    var t = el('div', 'sb-toast', msg); document.body.appendChild(t);
    setTimeout(function () { t.classList.add('sb-show'); }, 10);
    setTimeout(function () { t.classList.remove('sb-show'); setTimeout(function () { t.remove(); }, 300); }, 2600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {
      var ta = el('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok;
    }
  }

  /* ---------- 3) 분석기 / 프롬프트 연결 ---------- */
  window.sbOpenInAnalyzer = function (kw) {
    kw = safeText(kw).trim(); if (!kw) return;
    if (typeof showPage === 'function') showPage('tool');
    setTimeout(function () {
      installLanding();
      var land = document.getElementById('sbLandInput'); if (land) land.value = kw;
      runAnalyze(kw); // 검색 랜딩과 같은 흐름(연관 분석 + 결과 보고서)
    }, 150);
  };
  window.sbSendToPrompt = async function (kw) {
    kw = safeText(kw).trim(); if (!kw) return;
    await copy(kw);
    if (typeof showPage === 'function') showPage('prompt');
    setTimeout(function () {
      var page = document.getElementById('page-prompt'); if (!page) return;
      var old = document.getElementById('sbPromptBanner'); if (old) old.remove();
      var b = el('div', 'sb-prompt-banner'); b.id = 'sbPromptBanner';
      b.append(el('strong', '', '‘' + kw + '’ 키워드를 복사했습니다.'), el('span', '', ' 아래에서 쓰고 싶은 프롬프트를 열고, 입력칸에 붙여넣으세요.'));
      var x = el('button', 'sb-close', '닫기'); x.type = 'button'; x.onclick = function () { b.remove(); }; b.append(x);
      var inner = page.firstElementChild || page; inner.insertBefore(b, inner.firstChild);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };
  function actionRow(kw) {
    var row = el('div', 'sb-actions');
    var a = el('button', 'sb-btn', '🔍 분석기에서 열기'); a.type = 'button'; a.onclick = function () { window.sbOpenInAnalyzer(kw); };
    var p = el('button', 'sb-btn sb-btn-ghost', '✍️ 프롬프트로 보내기'); p.type = 'button'; p.onclick = function () { window.sbSendToPrompt(kw); };
    row.append(a, p); return row;
  }
  function decorateCards(root) {
    (root || document).querySelectorAll('article.hf-card:not([data-sb])').forEach(function (card) {
      card.setAttribute('data-sb', '1');
      var h = card.querySelector('h4'); var kw = h ? h.textContent.trim() : '';
      if (!kw) return;
      var foot = card.querySelector('.hfr-guide, .hf-footnote');
      var row = actionRow(kw);
      if (foot && foot.parentNode === card) card.insertBefore(row, foot); else card.appendChild(row);
    });
  }

  /* ---------- 2) 황금 후보 배지·필터 ---------- */
  var lockedRelated = 0;
  function remember(result) { try { if (result && result.success) lockedRelated = Number(result.lockedRelated) || 0; (result && result.data || []).forEach(function (r) { if (r && r.keyword) goldenMap.set(r.keyword, r); }); } catch (_) {} }
  function isGolden(item) {
    var g = goldenMap.get(item.keyword);
    if (g && typeof g.golden === 'boolean') return g.golden;
    return !item.blogCountUnavailable && Number(item.total) >= 100 && Number(item.blogCount) / Math.max(1, Number(item.total)) < 0.3;
  }
  function installAnalyzerHooks() {
    if (typeof fetchFromWorker === 'function' && !fetchFromWorker.__sb) {
      var of = fetchFromWorker;
      fetchFromWorker = async function () { var r = await of.apply(this, arguments); remember(r); return r; };
      fetchFromWorker.__sb = true;
    }
    if (typeof renderKeywordAnalysisResult === 'function' && !renderKeywordAnalysisResult.__sb) {
      var orr = renderKeywordAnalysisResult;
      renderKeywordAnalysisResult = function (result, keyword) { remember(result); try { return orr.apply(this, arguments); } finally { setTimeout(markGoldenRows, 0); } };
      renderKeywordAnalysisResult.__sb = true;
    }
    if (typeof applyFilters === 'function' && !applyFilters.__sb) {
      var oa = applyFilters;
      applyFilters = function () {
        var only = document.getElementById('sbGoldenOnly');
        var saved = null;
        try { if (only && only.checked && typeof currentAnalyzerData !== 'undefined') { saved = currentAnalyzerData; currentAnalyzerData = saved.filter(isGolden); } } catch (_) {}
        try { return oa.apply(this, arguments); } finally {
          if (saved) { try { currentAnalyzerData = saved; } catch (_) {} }
          markGoldenRows();
        }
      };
      applyFilters.__sb = true;
    }
    var ratio = document.getElementById('filterRatio50');
    if (ratio && !document.getElementById('sbGoldenOnly')) {
      var label = el('label', 'sb-golden-filter');
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = 'sbGoldenOnly';
      cb.onchange = function () { if (typeof applyFilters === 'function') applyFilters(); };
      label.append(cb, document.createTextNode(' 💎 황금 후보만 (문서/검색 0.3 미만)'));
      var host = ratio.closest('label') || ratio.parentNode;
      host.parentNode.insertBefore(label, host.nextSibling);
    }
  }
  // 사이트 전체 공지 팝업(2026-10-27): 연관 키워드 조회수 집계 지연 안내. 10/28(KST)까지만 표시, "오늘 하루 보지 않기" 지원
  function showSiteNotice() {
    var today = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
    if (today > '2026-10-28' || lsGet('sbNoticeHide1027', '') === today || document.getElementById('sbSiteNotice')) return;
    var bg = el('div', 'sb-pop-bg'); bg.id = 'sbSiteNotice';
    var box = el('div', 'sb-pop'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.append(el('div', 'sb-pop-t', '📢 키워드 조회수 안내'),
      el('p', 'sb-pop-p', '현재 키워드 분석기의 연관 키워드 조회수가 정확하게 표시되지 않는 문제가 있습니다.'),
      el('p', 'sb-pop-p', '내일부터 정상적으로 표시될 예정입니다. 이용에 불편을 드려 죄송합니다.'));
    var foot = el('div', 'sb-pop-f'), lab = el('label', 'sb-pop-hide'), cb = document.createElement('input'); cb.type = 'checkbox';
    lab.append(cb, document.createTextNode(' 오늘 하루 보지 않기'));
    var ok = el('button', 'sb-pop-ok', '확인'); ok.type = 'button';
    function close() { if (cb.checked) lsSet('sbNoticeHide1027', today); bg.remove(); }
    ok.onclick = close; bg.onclick = function (e) { if (e.target === bg) close(); };
    foot.append(lab, ok); box.append(foot); bg.append(box); document.body.append(bg); ok.focus();
  }
  function markGoldenRows() {
    var tbody = document.getElementById('analyzerTbody'); if (!tbody) return;
    // 무료: 연관 키워드 상위 5개만 — 나머지 개수 잠금 안내
    if (lockedRelated > 0 && !tbody.querySelector('.sb-locked-row')) {
      var tr = document.createElement('tr'); tr.className = 'sb-locked-row';
      var td = document.createElement('td'); td.colSpan = 7; td.className = 'sb-locked-cell';
      td.append(el('span', '', '🔒 연관 키워드 ' + lockedRelated + '개 더 — 유료 발급키를 저장하면 전체가 보입니다. '));
      var go = el('button', 'sb-btn', 'API/유료키설정'); go.type = 'button'; go.onclick = function () { if (typeof showPage === 'function') showPage('settings'); };
      td.append(go); tr.append(td); tbody.append(tr);
    }
    var data = (typeof filteredAnalyzerData !== 'undefined' && Array.isArray(filteredAnalyzerData)) ? filteredAnalyzerData : [];
    Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function (tr, idx) {
      var item = data[idx]; if (!item) return;
      var raw = goldenMap.get(item.keyword) || item; // 화면용 정리 과정에서 빠지는 "< 10" 표시는 서버 원본에서 읽음
      // 표시 정보가 없는 연관어는 PC·모바일이 정확히 10이면 검색광고의 "< 10"으로 간주
      var pLt = raw.pcLt10 || (raw.pcLt10 === undefined && Number(item.pc) === 10), mLt = raw.moLt10 || (raw.moLt10 === undefined && Number(item.mobile) === 10);
      var vc = tr.children[2]; if (vc && (pLt || mLt) && !vc.dataset.sbLt) { vc.dataset.sbLt = '1'; vc.textContent = pLt && mLt ? '20 미만' : vc.textContent + ' (일부 10 미만)'; vc.title = '네이버 검색광고가 10 미만으로만 공개한 값입니다. 오늘 뜬 이슈는 내일부터 반영돼요.'; }
      var cell = tr.children[1]; if (!cell || cell.querySelector('.sb-badge')) return;
      if (isGolden(item)) cell.append(' ', el('span', 'sb-badge', '💎 황금'));
      var g = goldenMap.get(item.keyword);
      if (g && g.source === 'related') cell.append(' ', el('span', 'sb-badge sb-badge-soft', '연관어'));
    });
  }

  /* ---------- 1-0) 키워드분석기 검색 랜딩(2단계): 큰 검색창 + 네이버/구글 선택 + 최근 검색 ---------- */
  var LS_HIST = 'sbAnalyzeHistory', LS_ENGINE = 'sbAnalyzeEngine';
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function getHist() { try { return JSON.parse(lsGet(LS_HIST, '[]')) || []; } catch (_) { return []; } }
  function pushHist(kw) { var h = getHist().filter(function (x) { return x !== kw; }); h.unshift(kw); lsSet(LS_HIST, JSON.stringify(h.slice(0, 8))); }
  function runAnalyze(kw) {
    kw = safeText(kw).trim(); if (!kw) return;
    pushHist(kw); renderHist();
    var input = document.getElementById('analyzerInput'); if (!input) return;
    input.value = kw;
    var note = document.getElementById('sbEngineNote');
    if (note) note.style.display = lsGet(LS_ENGINE, 'naver') === 'google' ? '' : 'none';
    // 검색 후에는 추천 키워드·무료 안내를 숨기고 결과만 보여준다
    var tab = document.getElementById('tab-analyzer'); if (tab) tab.classList.add('sb-searched');
    if (typeof startKeywordAnalysis === 'function') startKeywordAnalysis();
    loadReport(kw);
  }

  /* ---------- 1-1) 네이버 결과 보고서(3단계): 요약 카드 · 30일/1년 추이 · 뉴스 · 블로그 상위 10 · 월별 발행량(유료) ---------- */
  var reportSeq = 0;
  function fmtN(n) { n = Number(n); return isFinite(n) ? n.toLocaleString('ko-KR') : '-'; }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function pctChange(now, prev) { if (!prev) return null; return Math.round((now - prev) / prev * 100); }
  function changeTag(p, label) {
    var t = el('span', 'sb-chg ' + (p == null ? '' : p > 0 ? 'up' : p < 0 ? 'down' : ''), label + ' ' + (p == null ? '-' : (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(p) + '%'));
    return t;
  }
  function shortN(n) { n = Math.round(n); return n >= 10000 ? (Math.round(n / 1000) / 10) + '만' : n.toLocaleString('ko-KR'); }
  // unit: 상대지수 1당 검색수(월 검색량 ÷ 30일 지수 합). 있으면 좌측 축과 툴팁을 검색수로 표시
  function lineChart(rows, labelFn, unit, unitLabel) {
    var W = 640, H = 200, P = 24, L = unit ? 58 : 24, ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'sb-chart'); svg.setAttribute('role', 'img');
    if (rows.length < 2) return svg;
    var max = Math.max.apply(null, rows.map(function (r) { return r.ratio; })) || 1;
    var pts = rows.map(function (r, i) { return [L + i * (W - L - P) / (rows.length - 1), H - P - (r.ratio / max) * (H - 2 * P)]; });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var y = H - P - f * (H - 2 * P);
      var g = document.createElementNS(ns, 'line'); g.setAttribute('x1', L); g.setAttribute('x2', W - P); g.setAttribute('y1', y); g.setAttribute('y2', y); g.setAttribute('class', 'sb-chart-grid'); svg.append(g);
      var t = document.createElementNS(ns, 'text'); t.setAttribute('x', L - 6); t.setAttribute('y', y + 4); t.setAttribute('text-anchor', 'end'); t.setAttribute('class', 'sb-chart-label');
      t.textContent = unit ? shortN(max * f * unit) : String(Math.round(max * f)); svg.append(t);
    });
    var area = document.createElementNS(ns, 'path'); area.setAttribute('d', 'M' + pts[0][0] + ',' + (H - P) + ' L' + pts.map(function (p) { return p.join(','); }).join(' L') + ' L' + pts[pts.length - 1][0] + ',' + (H - P) + 'Z'); area.setAttribute('class', 'sb-chart-area'); svg.append(area);
    var line = document.createElementNS(ns, 'polyline'); line.setAttribute('points', pts.map(function (p) { return p.join(','); }).join(' ')); line.setAttribute('class', 'sb-chart-line'); svg.append(line);
    [0, Math.floor(rows.length / 2), rows.length - 1].forEach(function (i) { var t = document.createElementNS(ns, 'text'); t.setAttribute('x', pts[i][0]); t.setAttribute('y', H - 6); t.setAttribute('text-anchor', i === 0 ? 'start' : i === rows.length - 1 ? 'end' : 'middle'); t.setAttribute('class', 'sb-chart-label'); t.textContent = labelFn(rows[i].period); svg.append(t); });
    rows.forEach(function (r, i) { var c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', pts[i][0]); c.setAttribute('cy', pts[i][1]); c.setAttribute('r', rows.length > 40 ? 0 : 2.5); c.setAttribute('class', 'sb-chart-dot'); var tt = document.createElementNS(ns, 'title'); tt.textContent = r.period + ' · ' + (unit ? Math.round(r.ratio * unit).toLocaleString('ko-KR') + (unitLabel || '회') : Math.round(r.ratio)); c.append(tt); svg.append(c); });
    return svg;
  }
  function section(title, sub) { var s = el('section', 'sb-rp-sec'); s.append(el('h3', 'sb-rp-h', title)); if (sub) s.append(el('p', 'sb-rp-sub', sub)); return s; }
  function mainRow(kw) {
    var key = String(kw).replace(/\s+/g, '').toLowerCase();
    var d = (typeof currentAnalyzerData !== 'undefined' && currentAnalyzerData) || [];
    for (var i = 0; i < d.length; i++) if (String(d[i].keyword || '').replace(/\s+/g, '').toLowerCase() === key) return d[i];
    return null;
  }
  function fillSummary(box, kw, rep, tries) {
    var row = mainRow(kw);
    if (!row && (tries || 0) < 30) { setTimeout(function () { if (box.isConnected) fillSummary(box, kw, rep, (tries || 0) + 1); }, 700); }
    box.textContent = '';
    var pc = row ? Number(row.pc || 0) : Number(rep.pc || 0), mo = row ? Number(row.mobile || 0) : Number(rep.mobile || 0), total = row ? Number(row.total || pc + mo) : Number(rep.total || 0);
    if (!row && total) row = { pc: pc, mobile: mo, total: total };
    var docs = row && row.blogCount != null && !row.blogCountUnavailable ? Number(row.blogCount) : rep.blogTotal;
    var comp = total ? docs / total : null;
    var compLabel = comp == null ? '-' : comp < 1 ? '낮음' : comp < 5 ? '보통' : comp < 20 ? '높음' : '매우 높음';
    var lt = rep.pcLt10 || rep.moLt10 || (row && (row.pcLt10 || row.moLt10));
    var volCard = ['월 검색량', row ? (lt && rep.pcLt10 && rep.moLt10 ? '20 미만' : fmtN(total)) : '분석 중…', row ? 'PC ' + (rep.pcLt10 ? '10 미만' : fmtN(pc)) + ' · 모바일 ' + (rep.moLt10 ? '10 미만' : fmtN(mo)) : ''];
    if (rep.issue && rep.issue.month > total) volCard = ['월 검색량 (추정)', '약 ' + fmtN(rep.issue.month), '검색광고 ' + (lt ? '10 미만' : fmtN(total)) + ' · 데이터랩 비교 추정' + (rep.issue.last ? ' · 어제 약 ' + fmtN(rep.issue.last.count) + '회' : '')];
    [volCard,
      ['블로그 문서수', fmtN(docs), '네이버 블로그 누적'],
      ['경쟁도', compLabel, comp == null ? '' : '문서/검색 ' + comp.toFixed(2)],
      ['상위글 평균 나이', rep.avgAgeDays == null ? '-' : rep.avgAgeDays + '일', rep.avgAgeDays == null ? '' : rep.avgAgeDays >= 180 ? '오래된 글이 상위 → 새 글 진입 기회' : rep.avgAgeDays <= 30 ? '최신 글 위주 → 꾸준한 발행 필요' : '보통']
    ].forEach(function (c) { var k = el('div', 'sb-rp-card'); k.append(el('div', 'sb-rp-card-k', c[0]), el('div', 'sb-rp-card-v', c[1])); if (c[2]) k.append(el('div', 'sb-rp-card-s', c[2])); box.append(k); });
  }
  async function loadReport(kw) {
    var seq = ++reportSeq;
    var rw = document.getElementById('resultsWrapper'); if (!rw) return;
    var rp = document.getElementById('sbReport');
    if (!rp) { rp = el('div', 'sb-report glass-card'); rp.id = 'sbReport'; rw.parentNode.insertBefore(rp, rw); }
    rp.textContent = ''; rp.style.display = '';
    rp.append(el('div', 'sb-rp-loading', '🔎 "' + kw + '" 네이버 결과 보고서를 만드는 중…'));
    setTimeout(function () { rp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
    var rep;
    var paidKey = ''; try { paidKey = typeof getPaidAccessKey === 'function' ? getPaidAccessKey() || '' : ''; } catch (_) {}
    try { rep = await fetchFromWorker('getKeywordReport', { keyword: kw, paidAccessKey: paidKey }); } catch (e) { rep = { success: false, error: String(e && e.message || e) }; }
    if (seq !== reportSeq) return;
    rp.textContent = '';
    var isGoogle = lsGet(LS_ENGINE, 'naver') === 'google';
    var head = el('div', 'sb-rp-head'); head.append(el('h2', 'sb-rp-title', '“' + kw + '” 분석 결과'), el('span', 'sb-rp-badge' + (isGoogle ? ' sb-rp-badge-g' : ''), isGoogle ? '구글 자동완성 + 네이버 지표' : '네이버 기준'));
    rp.append(head);
    if (isGoogle) { var gsec = section('🌐 구글 자동완성 키워드', '구글에서 실제로 함께 입력되는 검색어입니다. 구글은 검색량을 공개하지 않아, 검색량은 네이버 기준으로 참고만 해주세요.'); rp.append(gsec); loadGoogle(gsec, kw, paidKey, seq); }
    if (!rep || !rep.success) {
      var msg = (rep && rep.error) || '보고서를 불러오지 못했습니다.';
      var eb = el('div', 'sb-rp-error', msg);
      if (rep && rep.code === 'personal_key_required') { var a = el('button', 'sb-chip', 'API/유료키설정으로 이동'); a.type = 'button'; a.onclick = function () { showPage('settings'); }; eb.append(' ', a); }
      rp.append(eb, el('p', 'sb-rp-sub', '아래 연관 키워드 표는 그대로 이용할 수 있습니다.'));
      return;
    }
    var cards = el('div', 'sb-rp-cards'); rp.append(cards); fillSummary(cards, kw, rep);

    // 검색 추이
    var t30 = rep.trend30 || [], t1y = rep.trend1y || [];
    // 실측 환산: 검색광고 월 검색량(최근 30일)을 데이터랩 일별 흐름 비율대로 나눔
    var total = Number(rep.total) || 0, sum30 = t30.reduce(function (s, x) { return s + x.ratio; }, 0);
    // 검색광고가 "< 10"이거나 집계가 늦은 경우 데이터랩 기준 키워드 비교 추정치를 그래프 환산 기준으로 사용
    var useIssue = rep.issue && rep.issue.month > total;
    if (useIssue) total = rep.issue.month;
    if (rep.pcLt10 || rep.moLt10 || useIssue) rp.append(el('div', 'sb-rp-lock', 'ℹ️ 네이버 검색광고는 검색량이 적으면 "10 미만"으로만 공개하고, 하루 이상 늦게 반영됩니다. 오늘 갑자기 뜬 이슈 키워드는 내일부터 숫자에 잡혀요.' + (useIssue ? ' 아래 수치는 데이터랩에서 기준 키워드(' + rep.issue.anchor + ')와 비교해 추정한 값입니다.' : '')));
    var unit30 = total && sum30 ? total / sum30 : 0;
    var last4 = t1y.slice(-4).reduce(function (s, x) { return s + x.ratio; }, 0);
    var unitW = total && last4 ? total * 28 / 30 / last4 : 0;
    var trend = section('📈 검색 추이', unit30 ? '월 검색량 ' + fmtN(total) + '회를 데이터랩 흐름으로 나눈 추정 검색수입니다.' : '네이버 데이터랩 상대지수(기간 내 최고 = 100)');
    var tabs = el('div', 'sb-rp-tabs'), chartBox = el('div', 'sb-rp-chart'), chg = el('div', 'sb-rp-chg');
    function show30() {
      chartBox.textContent = ''; chg.textContent = '';
      var r = t30.map(function (x) { return x.ratio; });
      chartBox.append(lineChart(t30, function (p) { return p.slice(5).replace('-', '.'); }, unit30, '회/일'));
      chg.append(changeTag(pctChange(avg(r.slice(-7)), avg(r.slice(-14, -7))), '최근 7일 vs 이전 7일'), changeTag(pctChange(avg(r.slice(-15)), avg(r.slice(0, 15))), '후반 15일 vs 전반 15일'));
    }
    function show1y() {
      chartBox.textContent = ''; chg.textContent = '';
      var r = t1y.map(function (x) { return x.ratio; });
      chartBox.append(lineChart(t1y, function (p) { return p.slice(2, 7).replace('-', '.'); }, unitW, '회/주'));
      var peak = t1y.reduce(function (m, x) { return !m || x.ratio > m.ratio ? x : m; }, null);
      chg.append(changeTag(pctChange(avg(r.slice(-4)), avg(r.slice(-8, -4))), '최근 4주 vs 이전 4주'), changeTag(pctChange(avg(r.slice(-13)), avg(r.slice(-26, -13))), '최근 3개월 vs 이전 3개월'));
      if (peak) chg.append(el('span', 'sb-chg', '1년 최고: ' + peak.period.slice(0, 7).replace('-', '년 ') + '월'));
    }
    [['30일', show30, t30], ['1년', show1y, t1y]].forEach(function (x, i) {
      var b = el('button', 'sb-rp-tab' + (i === 0 ? ' on' : ''), x[0]); b.type = 'button';
      b.onclick = function () { Array.prototype.forEach.call(tabs.children, function (c) { c.classList.toggle('on', c === b); }); x[1](); };
      tabs.append(b);
    });
    trend.append(tabs, chartBox, chg);
    if (t30.length >= 2) show30(); else chartBox.append(el('p', 'sb-rp-sub', rep.errors && rep.errors.trend30 ? '추이 조회 실패: ' + rep.errors.trend30 : '추이 데이터가 부족합니다(검색량이 적은 키워드).'));
    // 추이(좌) + 연관 키워드(우) 한 줄
    var row2 = el('div', 'sb-rp-row2'), rel = section('🔗 연관 키워드', '');
    row2.append(trend, rel); rp.append(row2);
    fillRelated(rel, kw, 0);

    // 뉴스 · 블로그 상위 10 · 월별 발행량 한 줄
    var grid = el('div', 'sb-rp-grid'); rp.append(grid);
    // 왜 검색될까? (최신 뉴스)
    var news = section('📰 왜 검색될까?', '최신 뉴스로 검색 이유를 확인하세요');
    if ((rep.news || []).length) { var nl = el('ul', 'sb-rp-list'); rep.news.forEach(function (n) { var li = el('li'); var a = el('a', '', n.title); if (n.link) { a.href = n.link; a.target = '_blank'; a.rel = 'noopener'; } li.append(a, el('span', 'sb-rp-meta', n.date ? n.date.slice(0, 10) : '')); nl.append(li); }); news.append(nl); }
    else news.append(el('p', 'sb-rp-sub', rep.errors && rep.errors.news ? '뉴스 조회 실패: ' + rep.errors.news : '관련 뉴스가 없습니다. 꾸준히 검색되는 정보성 키워드일 가능성이 높아요.'));
    grid.append(news);
    // 블로그 상위 10
    var blog = section('📝 블로그 상위 10개', rep.avgAgeDays == null ? '' : '평균 ' + rep.avgAgeDays + '일 전 작성');
    if ((rep.blogTop || []).length) { var bl = el('ol', 'sb-rp-list sb-rp-ol'); rep.blogTop.forEach(function (b) { var li = el('li'); var a = el('a', '', b.title); if (b.link) { a.href = b.link; a.target = '_blank'; a.rel = 'noopener'; } li.append(a, el('span', 'sb-rp-meta', (b.blogger ? b.blogger + ' · ' : '') + (b.ageDays == null ? '' : b.ageDays + '일 전'))); bl.append(li); }); blog.append(bl); }
    else blog.append(el('p', 'sb-rp-sub', rep.errors && rep.errors.blog ? '블로그 조회 실패: ' + rep.errors.blog : '블로그 결과가 없습니다.'));
    grid.append(blog);
    // 월별 발행량(유료)
    // 3열: 월별 발행량 + 그 아래 성별·연령 분포
    var col3 = el('div', 'sb-rp-col'); grid.append(col3);
    var mon = section('🗓️ 월별 블로그 발행량', '최근 글 최대 1,000개 기준');
    if (rep.monthlyLocked) mon.append(el('div', 'sb-rp-lock', '🔒 유료 발급키 전용 항목입니다. 경쟁 글이 매달 얼마나 쌓이는지 확인할 수 있어요.'));
    else if (rep.monthly && rep.monthly.counts) {
      var od = String(rep.monthly.oldest || ''), odT = /^\d{8}$/.test(od) ? Date.UTC(+od.slice(0, 4), +od.slice(4, 6) - 1, +od.slice(6, 8)) : 0;
      var spanDays = odT ? Math.max(1, (Date.now() - odT) / 864e5) : 0;
      if (rep.monthly.capped && spanDays && spanDays < 62) {
        // 최근 1,000개가 두 달 안에 다 쌓인 인기 키워드 → 막대 대신 월 환산 발행량
        var perMonth = Math.round(rep.monthly.fetched / spanDays * 30);
        var big = el('div', 'sb-rp-bigstat'); big.append(el('div', 'sb-rp-card-v', '약 ' + fmtN(perMonth) + '개/월'), el('div', 'sb-rp-card-s', '최근 ' + fmtN(rep.monthly.fetched) + '개 글이 ' + Math.round(spanDays) + '일 동안 발행됨 (하루 약 ' + fmtN(Math.round(rep.monthly.fetched / spanDays)) + '개)'));
        mon.append(big, el('p', 'sb-rp-sub', '발행 경쟁이 매우 치열한 키워드예요. 세부 키워드(연관 키워드)로 좁혀 쓰는 걸 추천합니다.'));
        col3.append(mon, demoSection(rep)); return;
      }
      var ks = Object.keys(rep.monthly.counts).sort().slice(-6), mx = Math.max.apply(null, ks.map(function (k) { return rep.monthly.counts[k]; }).concat([1]));
      var bars = el('div', 'sb-rp-bars');
      ks.forEach(function (k, i) { var v = rep.monthly.counts[k]; var c = el('div', 'sb-rp-bar'); var f = el('div', 'sb-rp-bar-fill'); f.style.height = Math.max(4, v / mx * 100) + '%'; c.append(el('div', 'sb-rp-bar-v', fmtN(v) + (rep.monthly.capped && i === 0 ? '+' : '')), f, el('div', 'sb-rp-bar-k', k.slice(2, 4) + '.' + k.slice(4))); bars.append(c); });
      mon.append(bars);
      if (rep.monthly.capped) mon.append(el('p', 'sb-rp-sub', '최근 1,000개만 집계 — 가장 오래된 달은 실제보다 적게 보일 수 있어요.'));
    } else mon.append(el('p', 'sb-rp-sub', '발행량 조회 실패' + (rep.errors && rep.errors.monthly ? ': ' + rep.errors.monthly : '')));
    col3.append(mon, demoSection(rep));
  }
  // 성별·연령 분포: 쇼핑 키워드는 쇼핑인사이트(정확), 나머지는 기준 키워드 대비 추정(서버에서 구분)
  function demoSection(rep) {
    var d = rep.demo;
    var sec = section('👥 성별 · 연령 분포', !d ? '' : d.source === 'shopping' ? '네이버 쇼핑인사이트 기준(' + d.category + ') · 최근 3개월' : '데이터랩 기준 키워드 비교 추정 · 최근 30일');
    if (!d) { sec.append(el('p', 'sb-rp-sub', '분포 데이터를 가져오지 못했습니다' + (rep.errors && rep.errors.demo ? ': ' + rep.errors.demo : '.'))); return sec; }
    sec.querySelector('.sb-rp-h').append(' ', el('span', 'sb-demo-tag ' + (d.source === 'shopping' ? 'exact' : 'est'), d.source === 'shopping' ? '정확' : '추정'));
    var m = d.gender.m || 0, f = d.gender.f || 0;
    var g = el('div', 'sb-demo-g'); g.append(el('div', 'sb-demo-k', '성별'));
    var bar = el('div', 'sb-demo-gbar'); var bm = el('div', 'sb-demo-m'); bm.style.width = m + '%'; var bf = el('div', 'sb-demo-f'); bf.style.width = f + '%'; bar.append(bm, bf);
    var lg = el('div', 'sb-demo-glg'); lg.append(el('span', 'm', '남성 ' + m + '%'), el('span', 'f', '여성 ' + f + '%'));
    g.append(bar, lg); sec.append(g);
    var a = el('div', 'sb-demo-a'); a.append(el('div', 'sb-demo-k', '연령'));
    var bars = el('div', 'sb-rp-bars sb-demo-bars'); var ks = ['10', '20', '30', '40', '50', '60'], mx = Math.max.apply(null, ks.map(function (k) { return d.age[k] || 0; }).concat([1]));
    ks.forEach(function (k) { var v = d.age[k] || 0, c = el('div', 'sb-rp-bar'), fl = el('div', 'sb-rp-bar-fill sb-demo-afill' + (v === mx ? ' top' : '')); fl.style.height = Math.max(3, v / mx * 100) + '%'; c.append(el('div', 'sb-rp-bar-v', v + '%'), fl, el('div', 'sb-rp-bar-k', k === '60' ? '60대+' : k + '대')); bars.append(c); });
    a.append(bars); sec.append(a);
    if (d.source !== 'shopping') sec.append(el('p', 'sb-rp-sub', '※ 네이버가 성별·연령별 실제 비율을 공개하지 않아 추정한 값입니다. 경향 참고용으로 봐주세요.'));
    return sec;
  }
  // 구글이 Cloudflare 서버 요청을 막아서 자동완성은 방문자 브라우저에서 JSONP로 받는다(서버 seeds와 같은 순서)
  function googleSuggestOne(q) {
    return new Promise(function (res) {
      var cb = '__sbg' + Date.now() + Math.floor(Math.random() * 1e6), s = document.createElement('script'), done = false;
      function fin(v) { if (done) return; done = true; try { delete window[cb]; } catch (_) { window[cb] = undefined; } s.remove(); res(v); }
      window[cb] = function (d) { fin((d && d[1] || []).map(function (x) { return Array.isArray(x) ? x[0] : x; }).filter(Boolean)); };
      s.charset = 'utf-8'; s.onerror = function () { fin([]); }; setTimeout(function () { fin([]); }, 6000);
      s.src = 'https://suggestqueries.google.com/complete/search?client=youtube&hl=ko&gl=kr&ie=utf-8&oe=utf-8&q=' + encodeURIComponent(q) + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function googleSuggestAll(kw) {
    var seeds = [kw, kw + ' '].concat('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('').map(function (c) { return kw + ' ' + c; }));
    return Promise.all(seeds.map(googleSuggestOne));
  }
  // 구글 모드(4단계): 자동완성 확장 목록 + 네이버 검색량 매칭. 무료 10개 / 유료 전체(서버에서 제한)
  async function loadGoogle(box, kw, paidKey, seq) {
    box.append(el('p', 'sb-rp-sub', '구글 자동완성을 모으는 중…'));
    var sugg = []; try { sugg = await googleSuggestAll(kw); } catch (_) {}
    var g; try { g = await fetchFromWorker('getGoogleSuggest', { keyword: kw, paidAccessKey: paidKey, suggestions: sugg }); } catch (e) { g = { success: false, error: String(e && e.message || e) }; }
    if (seq !== reportSeq || !box.isConnected) return;
    box.removeChild(box.lastChild);
    if (!g || !g.success) { box.append(el('div', 'sb-rp-error', (g && g.error) || '구글 자동완성을 불러오지 못했습니다.')); return; }
    if (!g.data.length) { box.append(el('p', 'sb-rp-sub', '구글 자동완성 결과가 없습니다.')); return; }
    var q = g.data.filter(function (x) { return x.intent; });
    if (q.length) {
      var qb = el('div', 'sb-g-q'); qb.append(el('b', '', '✍️ 구글 SEO 글감(질문·비교형) '));
      q.slice(0, 12).forEach(function (x) { var c = el('button', 'sb-chip sb-chip-sm', x.keyword); c.type = 'button'; c.onclick = function () { copy(x.keyword); c.textContent = '복사됨 ✓'; setTimeout(function () { c.textContent = x.keyword; }, 1200); }; qb.append(c); });
      box.append(qb);
    }
    var tbl = el('table', 'sb-g-table'); var th = el('thead'); var hr = el('tr');
    ['#', '구글 자동완성 키워드', '유형', '네이버 월 검색량', ''].forEach(function (h) { hr.append(el('th', '', h)); }); th.append(hr); tbl.append(th);
    var tb = el('tbody');
    g.data.forEach(function (x, i) {
      var tr = el('tr');
      var b = el('button', 'sb-rp-rel-k', x.keyword); b.type = 'button';
      b.onclick = function () { var inp = document.getElementById('sbLandInput'); if (inp) inp.value = x.keyword; runAnalyze(x.keyword); };
      var kc = el('td'); kc.append(b);
      var go = el('a', 'sb-g-link', '구글 ↗'); go.href = 'https://www.google.com/search?q=' + encodeURIComponent(x.keyword); go.target = '_blank'; go.rel = 'noopener';
      var gc = el('td'); gc.append(go);
      tr.append(el('td', 'sb-g-n', String(i + 1)), kc, el('td', '', x.intent || ''), el('td', 'sb-g-v', x.total != null ? fmtN(x.total) + '회' : '-'), gc);
      tb.append(tr);
    });
    tbl.append(tb);
    var wrap = el('div', 'sb-g-wrap'); wrap.append(tbl); box.append(wrap);
    if (g.locked) box.append(el('div', 'sb-rp-lock', '🔒 구글 자동완성 ' + g.locked + '개 더 있음 — 유료 발급키는 전체(총 ' + g.total + '개)가 표시됩니다.'));
    if (g.metricsNote) box.append(el('p', 'sb-rp-sub', g.metricsNote));
    box.append(el('p', 'sb-rp-sub', '키워드를 누르면 그 키워드로 다시 분석합니다. 검색량 "-"는 네이버 검색광고에 데이터가 없는 롱테일 키워드예요(구글 SEO에는 오히려 기회).'));
  }
  // 연관 분석 결과(무료 상위 5 / 유료 전체 — 서버에서 제한)를 보고서 우측 목록으로
  function fillRelated(box, kw, tries) {
    if (!box.isConnected) return;
    var d = (typeof currentAnalyzerData !== 'undefined' && currentAnalyzerData) || [];
    var key = String(kw).replace(/\s+/g, '').toLowerCase();
    var list = d.filter(function (r) { return String(r.keyword || '').replace(/\s+/g, '').toLowerCase() !== key; });
    var mainReady = d.some(function (r) { return String(r.keyword || '').replace(/\s+/g, '').toLowerCase() === key; });
    if (!mainReady && tries < 40) { setTimeout(function () { fillRelated(box, kw, tries + 1); }, 700); if (!tries) box.append(el('p', 'sb-rp-sub', '연관 키워드를 불러오는 중…')); return; }
    while (box.children.length > 1) box.removeChild(box.lastChild);
    if (!list.length) { box.append(el('p', 'sb-rp-sub', '연관 키워드가 없습니다.')); return; }
    var ul = el('ul', 'sb-rp-rel');
    list.slice().sort(function (a, b) { return Number(b.total || 0) - Number(a.total || 0); }).forEach(function (r) {
      var li = el('li'); var b = el('button', 'sb-rp-rel-k', r.keyword); b.type = 'button';
      b.onclick = function () { var inp = document.getElementById('sbLandInput'); if (inp) inp.value = r.keyword; runAnalyze(r.keyword); };
      var docs = r.blogCount != null && !r.blogCountUnavailable ? Number(r.blogCount) : null, tot = Number(r.total || 0);
      var rr = goldenMap.get(r.keyword) || r, lt = (rr.pcLt10 || (rr.pcLt10 === undefined && Number(r.pc) === 10)) && (rr.moLt10 || (rr.moLt10 === undefined && Number(r.mobile) === 10));
      li.append(b, el('span', 'sb-rp-rel-v', lt ? '20 미만' : fmtN(tot) + '회'), el('span', 'sb-rp-rel-d', docs == null ? '' : '문서 ' + shortN(docs)));
      if (isGolden(r)) li.append(el('span', 'sb-badge', '💎'));
      ul.append(li);
    });
    box.append(ul);
    var locked = lockedRelated;
    box.append(el('p', 'sb-rp-sub', locked ? '🔒 ' + locked + '개 더 있음 — 유료 발급키는 전체 연관 키워드가 표시됩니다.' : '검색량 많은 순 · 누르면 바로 분석'));
  }
  function renderHist() {
    var box = document.getElementById('sbHist'); if (!box) return;
    var h = getHist(); box.textContent = ''; box.style.display = h.length ? '' : 'none';
    if (!h.length) return;
    box.append(el('span', 'sb-hist-label', '최근 검색'));
    h.forEach(function (kw) { var c = el('button', 'sb-chip sb-chip-sm', kw); c.type = 'button'; c.onclick = function () { document.getElementById('sbLandInput').value = kw; runAnalyze(kw); }; box.append(c); });
    var clr = el('button', 'sb-hist-clear', '지우기'); clr.type = 'button'; clr.onclick = function () { lsSet(LS_HIST, '[]'); renderHist(); }; box.append(clr);
  }
  function installLanding() {
    var tab = document.getElementById('tab-analyzer'); if (!tab || document.getElementById('sbLanding')) return;
    var hero = el('div', 'sb-landing'); hero.id = 'sbLanding';
    hero.append(el('h1', 'sb-land-title', '어떤 키워드를 분석할까요?'), el('p', 'sb-land-sub', '검색량 · 문서수 · 경쟁도 · 연관 키워드까지 한 번에 확인합니다.'));
    var eng = el('div', 'sb-engine'); var cur = lsGet(LS_ENGINE, 'naver');
    [['naver', '네이버'], ['google', '구글']].forEach(function (e) {
      var b = el('button', 'sb-engine-btn' + (cur === e[0] ? ' on' : ''), e[1]); b.type = 'button'; b.dataset.engine = e[0];
      b.onclick = function () { lsSet(LS_ENGINE, e[0]); Array.prototype.forEach.call(eng.children, function (x) { x.classList.toggle('on', x === b); }); };
      eng.append(b);
    });
    var form = el('form', 'sb-land-form'); form.setAttribute('role', 'search');
    var inp = el('input', 'sb-land-input'); inp.id = 'sbLandInput'; inp.type = 'search'; inp.placeholder = '분석할 키워드를 입력하세요 (예: 캠핑의자)'; inp.autocomplete = 'off';
    var go = el('button', 'sb-land-go', '분석하기'); go.type = 'submit';
    form.append(inp, go); form.onsubmit = function (ev) { ev.preventDefault(); runAnalyze(inp.value); };
    var hist = el('div', 'sb-hist'); hist.id = 'sbHist';
    var note = el('div', 'sb-engine-note', '구글 모드: 구글 자동완성 키워드와 네이버 지표(검색량·문서수)를 함께 보여드려요.'); note.id = 'sbEngineNote'; note.style.display = 'none';
    hero.append(eng, form, hist, note);
    tab.insertBefore(hero, tab.firstChild);
    // 기존 단건/연관 입력 카드는 숨김(기능은 그대로 사용)
    ['singleFastInput', 'analyzerInput'].forEach(function (id) { var c = document.getElementById(id); c = c && c.closest('.glass-card'); if (c) c.style.setProperty('display', 'none', 'important'); });
    renderHist();
  }

  /* ---------- 1) 키워드분석기 첫 화면 ---------- */
  var quickLoaded = false;
  async function loadQuickStart() {
    if (quickLoaded) return; quickLoaded = true;
    // 검색 랜딩 바로 아래에 놓는다
    var after = document.getElementById('sbLanding') || document.getElementById('analysisAccessGate');
    if (!after || !after.parentNode) return;
    var box = el('div', 'sb-quick glass-card');
    box.append(el('h2', 'sb-quick-title', '⚡ 오늘 바로 분석해 볼 키워드'), el('p', 'sb-quick-sub', '키워드를 누르면 연관 분석이 바로 시작됩니다. 매일·실시간으로 바뀌는 추천입니다.'));
    var rows = el('div', 'sb-quick-rows'); box.append(rows);
    after.parentNode.insertBefore(box, after.nextSibling);
    function addRow(title, list, note) {
      list = (list || []).filter(Boolean).slice(0, 10); if (!list.length) return;
      var r = el('div', 'sb-quick-row'); r.append(el('div', 'sb-quick-label', title));
      var chips = el('div', 'sb-chips');
      list.forEach(function (kw) { var c = el('button', 'sb-chip', kw); c.type = 'button'; c.onclick = function () { window.sbOpenInAnalyzer(kw); }; chips.append(c); });
      r.append(chips); if (note) r.append(el('div', 'sb-quick-note', note)); rows.append(r);
    }
    try {
      // 비밀 키워드는 유료 전용이라 여기서는 보여주지 않는다
      var res = await Promise.allSettled([kc('getHomefeedKeywords'), kc('getHomefeedRadar')]);
      var hf = res[0].status === 'fulfilled' ? res[0].value : null, rd = res[1].status === 'fulfilled' ? res[1].value : null;
      addRow('🟢 홈판 틈새 키워드', (hf && hf.items || []).map(function (x) { return x.pick && x.pick.keyword; }), '실시간 이슈 주변에서 아직 문서가 적은 키워드');
      addRow('🔥 홈판 블로거들이 지금 쓰는 소재', (rd && rd.subjects || []).map(function (x) { return x.subject; }), '최근 48시간 여러 채널이 함께 다룬 소재');
      if (!rows.children.length) box.remove();
    } catch (_) { box.remove(); }
  }

  /* ---------- 8) HOME 이번 주 비밀 키워드 안내 ---------- */
  async function loadSecretBanner() {
    var home = document.getElementById('page-home'); if (!home || document.getElementById('sbSecretBanner')) return;
    var d = null; try { d = await kc('getSecretKeywords'); } catch (_) { return; }
    if (!d || !d.success || !d.total) return;
    var next = d.nextUpdateAt ? new Date(d.nextUpdateAt) : null;
    var fmt = function (dt) { return dt ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric' }).format(dt) : ''; };
    var b = el('div', 'sb-secret-banner'); b.id = 'sbSecretBanner';
    var txt = el('div', 'sb-secret-text');
    txt.append(el('strong', '', '🔒 이번 주 머니대외비 비밀 키워드 ' + d.total + '개 공개'), el('span', '', ' · 매주 월요일 07시 새 목록' + (next ? ' · 다음 갱신 ' + fmt(next) : '')));
    var go = el('button', 'sb-btn', '보러 가기'); go.type = 'button';
    go.onclick = function () {
      if (typeof showPage === 'function') showPage('keywordcenter');
      setTimeout(function () { var t = Array.prototype.find.call(document.querySelectorAll('button'), function (x) { return /머니대외비 비밀 키워드/.test(x.textContent) && x.offsetParent; }); if (t) t.click(); }, 400);
    };
    var cp = el('button', 'sb-btn sb-btn-ghost', '단톡방 공지 문구 복사'); cp.type = 'button';
    cp.onclick = async function () {
      var preview = (d.items || []).slice(0, 3).map(function (x) { return '· ' + x.keyword; }).join('\n');
      var msg = '[머니대외비] 이번 주 비밀 키워드 ' + d.total + '개가 공개됐어요!\n문서는 적고 검색은 많은 황금 키워드만 골랐습니다.\n' + (preview ? '\n미리보기\n' + preview + '\n' : '') + '\n👉 https://www.boutique-info.com/?page=keywordcenter\n(매주 월요일 07시 새 목록)';
      toast((await copy(msg)) ? '공지 문구를 복사했습니다.' : '복사하지 못했습니다.');
    };
    var actions = el('div', 'sb-actions'); actions.append(go, cp);
    b.append(txt, actions);
    var inner = home.firstElementChild || home; inner.insertBefore(b, inner.firstChild);
  }

  /* ---------- API/유료키설정 탭 ---------- */
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (_) { return null; } }
  function refreshSettingsState() {
    var paid = document.getElementById('sbPaidKeyState'), api = document.getElementById('sbApiKeyState');
    if (paid) { var k = paidKey(); paid.textContent = k ? '✅ 저장됨 (끝자리 ' + k.slice(-4) + ')' : '아직 저장하지 않았습니다.'; paid.className = 'sb-settings-state ' + (k ? 'sb-ok' : 'sb-none'); }
    if (api) { var a = readJSON('lewordApiKeys'); var has = a && typeof a === 'object' && Object.keys(a).some(function (x) { return a[x]; }); api.textContent = has ? '✅ 저장됨' : '아직 저장하지 않았습니다. (무료 분석은 키 없이도 하루 40회 가능)'; api.className = 'sb-settings-state ' + (has ? 'sb-ok' : 'sb-none'); }
  }
  // 다른 메뉴의 "유료 발급키 설정" 버튼(잠금 카드 등)은 설정 탭으로 보낸 뒤 그 자리에서 설정 창을 연다
  function hookKeyButtons() {
    ['openPaidKeySettings', 'openApiSettings'].forEach(function (name) {
      var orig = window[name]; if (typeof orig !== 'function' || orig.__sb) return;
      var wrapped = function () {
        var onSettings = (document.getElementById('page-settings') || {}).style && document.getElementById('page-settings').style.display === 'block';
        if (!onSettings && typeof showPage === 'function') { showPage('settings'); setTimeout(function () { orig(); }, 200); return; }
        return orig.apply(this, arguments);
      };
      wrapped.__sb = true; window[name] = wrapped;
    });
    ['savePaidKeySettings', 'clearPaidKeySettings', 'closePaidKeySettings', 'closeApiSettings', 'saveApiSettings'].forEach(function (name) {
      var orig = window[name]; if (typeof orig !== 'function' || orig.__sbr) return;
      var w = function () { var r = orig.apply(this, arguments); setTimeout(refreshSettingsState, 300); return r; }; w.__sbr = true; window[name] = w;
    });
  }

  /* ---------- 1단계(2026-10-26): 메뉴 재배치 ---------- */
  // 키워드 찾으러 가기·엑셀 대량 분석 → 애드센스&황금키워드 탭(비밀 키워드 다음), 블로그 노출 추적 → 독립 메뉴(page-exposure)
  function relocatePanels() {
    var tabRow = document.querySelector('#page-tool .tab-container'); if (tabRow) tabRow.style.setProperty('display', 'none', 'important');
    var exposure = document.getElementById('tab-exposure'), exHost = document.getElementById('sbExposureHost');
    if (exposure && exHost && exposure.parentNode !== exHost) { exHost.appendChild(exposure); exposure.style.display = 'block'; }
    var secretBtn = document.querySelector('.kc-tab[data-kc-category="secretKeywords"]');
    if (!secretBtn || document.getElementById('sbKcExtHost')) return;
    var row = secretBtn.parentNode, host = el('div', 'sb-kc-ext-host'); host.id = 'sbKcExtHost';
    row.parentNode.insertBefore(host, row.nextSibling);
    var page = document.getElementById('page-keywordcenter');
    [['links', '🔗 키워드 찾으러 가기'], ['excel', '📁 엑셀 파일 대량 분석']].forEach(function (pair, idx) {
      var panel = document.getElementById('tab-' + pair[0]); if (!panel) return;
      host.appendChild(panel); panel.style.display = 'none';
      var b = el('button', 'kc-tab sb-kc-ext-tab', pair[1]); b.type = 'button'; b.setAttribute('data-sb-panel', pair[0]);
      b.onclick = function () {
        page.classList.add('sb-kc-ext');
        Array.prototype.forEach.call(row.querySelectorAll('.kc-tab'), function (x) { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('active'); b.setAttribute('aria-selected', 'true');
        Array.prototype.forEach.call(host.children, function (x) { x.style.display = x === panel ? 'block' : 'none'; });
      };
      row.appendChild(b);
    });
    // 기존 키워드센터 탭을 누르면 옮겨온 패널은 닫는다
    row.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.kc-tab'); if (!t || t.classList.contains('sb-kc-ext-tab')) return;
      page.classList.remove('sb-kc-ext'); Array.prototype.forEach.call(host.children, function (x) { x.style.display = 'none'; });
      Array.prototype.forEach.call(row.querySelectorAll('.sb-kc-ext-tab'), function (x) { x.classList.remove('active'); });
    }, true);
  }

  /* ---------- 다크모드 ---------- */
  // 다크모드 보정: 클래스마다 제각각인 밝은 배경(상자·탭·배지)을 실제 계산된 색으로 찾아 어둡게. 라이트로 돌아가면 원복
  var darkTimer = null;
  function bgLum(c) { var m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; var v = m[1].split(',').map(Number); if (v.length > 3 && v[3] < 0.35) return null; return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; }
  function darkFix() {
    if (document.documentElement.getAttribute('data-sb-theme') !== 'dark') return;
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var e = all[i]; if (e.dataset.sbDark || /^(IMG|SVG|PATH|VIDEO|CANVAS|IFRAME|PICTURE|SOURCE|SCRIPT|STYLE|BR|OPTION)$/i.test(e.tagName)) continue;
      var cs = getComputedStyle(e), L = bgLum(cs.backgroundColor), grad = /gradient/.test(cs.backgroundImage);
      if ((L != null && L > 0.55) || grad) {
        e.dataset.sbDark = '1';
        e.style.setProperty('background-color', e.matches('button,.kc-tab,.tab-btn,.sb-chip,.sb-btn') ? '#232a36' : '#1a1f28', 'important');
        if (grad) e.style.setProperty('background-image', 'none', 'important');
      }
      var tl = bgLum(cs.color); if (tl != null && tl < 0.45 && !e.dataset.sbDarkText) { e.dataset.sbDarkText = '1'; e.style.setProperty('color', '#e6e9ef', 'important'); }
    }
  }
  function darkUndo() { Array.prototype.forEach.call(document.querySelectorAll('[data-sb-dark],[data-sb-dark-text]'), function (e) { if (e.dataset.sbDark) { e.style.removeProperty('background-color'); e.style.removeProperty('background-image'); delete e.dataset.sbDark; } if (e.dataset.sbDarkText) { e.style.removeProperty('color'); delete e.dataset.sbDarkText; } }); }
  function scheduleDarkFix() { clearTimeout(darkTimer); darkTimer = setTimeout(function () { (window.requestIdleCallback || setTimeout)(darkFix); }, 250); }
  function applyTheme(t) { document.documentElement.setAttribute('data-sb-theme', t); if (t === 'dark') scheduleDarkFix(); else darkUndo(); try { localStorage.setItem('sbTheme', t); } catch (_) {} var b = document.getElementById('sbThemeBtn'); if (b) b.textContent = t === 'dark' ? '☀️ 라이트모드' : '🌙 다크모드'; }
  function installThemeToggle() {
    var bar = document.querySelector('aside.migration-bar'); if (!bar || document.getElementById('sbThemeBtn')) return;
    var b = el('button', 'sb-theme-btn', '🌙 다크모드'); b.type = 'button'; b.id = 'sbThemeBtn';
    b.onclick = function () { applyTheme(document.documentElement.getAttribute('data-sb-theme') === 'dark' ? 'light' : 'dark'); };
    var firstLink = bar.querySelector('a'); bar.insertBefore(b, firstLink || null);
    var saved = 'light'; try { saved = localStorage.getItem('sbTheme') || 'light'; } catch (_) {}
    applyTheme(saved);
  }

  /* ---------- 공통 ---------- */
  function onPage(id) {
    if (id === 'tool' || id === 'keyword') { installAnalyzerHooks(); installLanding(); loadQuickStart(); }
    if (id === 'home') loadSecretBanner();
    if (id === 'settings') refreshSettingsState();
  }
  function hookShowPage() {
    if (typeof showPage === 'function' && !showPage.__sb) {
      var os = showPage;
      showPage = function (id) { var r = os.apply(this, arguments); try { onPage(id); } catch (_) {} return r; };
      showPage.__sb = true;
    }
    if (typeof switchTab === 'function' && !switchTab.__sb) {
      var ost = switchTab;
      switchTab = function (id) { var r = ost.apply(this, arguments); try { onPage(id); } catch (_) {} return r; };
      switchTab.__sb = true;
      window.switchTab = switchTab;
    }
  }
  var CSS = '.sb-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}' +
    '.sb-btn{border:1px solid #146c54;background:#146c54;color:#fff;border-radius:8px;padding:7px 12px;font-size:13.5px;font-weight:700;cursor:pointer}' +
    '.sb-btn:hover{filter:brightness(1.08)}.sb-btn-ghost{background:#fff;color:#146c54}' +
    '.sb-badge{display:inline-block;margin-left:4px;padding:2px 7px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:800;vertical-align:middle}' +
    '.sb-badge-soft{background:#e0f2fe;color:#075985}' +
    '.sb-golden-filter{display:inline-flex;align-items:center;gap:4px;margin-left:14px;font-weight:700;color:#92400e;cursor:pointer}' +
    '.sb-quick{padding:22px 24px;margin-bottom:20px;border-radius:14px;background:#fffdf5;border:1px solid #f1e3b4}' +
    '.sb-quick-title{margin:0 0 6px;font-size:21px;color:#1f2937}.sb-quick-sub{margin:0 0 14px;color:#64748b;font-size:14.5px}' +
    '.sb-quick-row{margin-top:12px}.sb-quick-label{font-weight:800;color:#334155;margin-bottom:8px;font-size:15px}.sb-quick-note{color:#94a3b8;font-size:12.5px;margin-top:6px}' +
    '.sb-chips{display:flex;flex-wrap:wrap;gap:8px}.sb-chip{border:1px solid #dbe3ef;background:#fff;border-radius:999px;padding:6px 12px;font-size:14px;cursor:pointer;color:#1f2937}' +
    '.sb-chip:hover{border-color:#146c54;color:#146c54;background:#f0fdf4}' +
    '.sb-secret-banner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:0 auto 18px;max-width:1200px;padding:14px 18px;border-radius:12px;background:#111827;color:#f9fafb}' +
    '.sb-secret-banner .sb-btn-ghost{background:transparent;color:#fde68a;border-color:#fde68a}.sb-secret-banner .sb-actions{margin-top:0}' +
    '.sb-prompt-banner{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 20px;padding:12px 16px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}' +
    '.sb-close{margin-left:auto;border:0;background:transparent;color:#065f46;font-weight:700;cursor:pointer}' +
    '.sb-toast{position:fixed;left:50%;bottom:30px;transform:translate(-50%,20px);opacity:0;background:#111827;color:#fff;padding:10px 16px;border-radius:10px;z-index:99999;transition:all .25s}.sb-toast.sb-show{opacity:1;transform:translate(-50%,0)}' +
    '.sb-settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.sb-settings-card h2{margin:0 0 8px;font-size:19px;color:#1f2937}.sb-settings-card p{margin:0 0 12px;color:#475569;line-height:1.6;font-size:14.5px}' +
    '.sb-settings-state{font-weight:800}.sb-settings-state.sb-ok{color:#047857}.sb-settings-state.sb-none{color:#b45309}' +
    '#page-tool .tab-container{display:none!important}' +
    '#page-keywordcenter.sb-kc-ext #sbKcExtHost~*:not(script):not(style){display:none!important}.sb-kc-ext-host{margin-top:16px}' +
    '.sb-locked-cell{text-align:center;padding:16px!important;background:#fffbeb;color:#92400e;font-weight:700}' +
    '.sb-theme-btn{border:1px solid rgba(255,255,255,.35);background:transparent;color:inherit;border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:700;cursor:pointer;margin-right:8px}' +
    // 다크모드: 페이지 전체 필터(무거움) 대신 배경·글자·테두리 색만 바꿈
    'html[data-sb-theme=dark],html[data-sb-theme=dark] body{background:#0f1218!important;color:#e6e9ef!important}' +
    'html[data-sb-theme=dark] body :is(div,section,article,aside,header,nav,main,footer,details,summary,table,thead,tbody,tr,td,th,li,ul,ol,form,fieldset,label,p,span,small,strong,b,em,h1,h2,h3,h4,h5,h6,a,button,input,textarea,select,option,blockquote,pre,code){color:#e6e9ef!important;border-color:#2c3340!important}' +
    'html[data-sb-theme=dark] body :is(div,section,article,aside,header,nav,main,footer,details,table,thead,tbody,tr,td,th,li,form,fieldset,blockquote,pre,code,summary){background-color:transparent!important;background-image:none!important}' +
    'html[data-sb-theme=dark] body :is(.glass-card,.hf-card,.hfr-card,.kc-card,.sb-quick,.sb-settings-card,.topic-card,article,details,.modal,.modal-content,table){background-color:#171b23!important}' +
    'html[data-sb-theme=dark] body :is(input,textarea,select){background-color:#0f1218!important;color:#e6e9ef!important}' +
    'html[data-sb-theme=dark] body :is(button,.btn-primary,.sb-btn,.kc-tab,.tab-btn,.site-menu-btn,.sb-chip){background-color:#1f2530!important;background-image:none!important;color:#e6e9ef!important}' +
    'html[data-sb-theme=dark] body :is(button.active,.kc-tab.active,.site-menu-btn.active,.btn-primary,.sb-btn:not(.sb-btn-ghost)){background-color:#146c54!important;color:#fff!important}' +
    'html[data-sb-theme=dark] body a{color:#7cc4ff!important}html[data-sb-theme=dark] body :is(.sb-badge,.hf-badge,.grade-badge){background-color:#3a3220!important;color:#fcd34d!important}' +
    // 페이지 id로 색을 지정한 기존 규칙보다 우선하도록 id 수준 선택자로 한 번 더
    'html[data-sb-theme=dark] body :is(#page-home,#page-tool,#page-keywordcenter,#page-exposure,#page-prompt,#page-external,#page-converter,#page-compass,#page-notice,#page-settings,#page-guide,#leword-app,#siteMenu) :is(h1,h2,h3,h4,h5,h6,p,span,small,strong,b,em,li,td,th,label,summary,div,a){color:#e6e9ef!important}' +
    'html[data-sb-theme=dark] body :is(#page-home,#page-tool,#page-keywordcenter,#page-exposure,#page-prompt,#page-external,#page-converter,#page-compass,#page-notice,#page-settings,#page-guide,#leword-app) :is(.glass-card,.hf-card,.hfr-card,.kc-card,.sb-quick,article,details,table,section.glass-card){background-color:#171b23!important;background-image:none!important}' +
    'html[data-sb-theme=dark] body :is(#page-home,#page-tool,#page-keywordcenter,#page-exposure,#page-prompt,#page-external,#page-converter,#page-compass,#page-notice,#page-settings,#page-guide,#leword-app) a{color:#7cc4ff!important}' +
    'html[data-sb-theme=dark] #siteMenu .site-menu-btn{color:#cfd5df!important;background-color:transparent!important}html[data-sb-theme=dark] #siteMenu .site-menu-btn.active{color:#6ee7b7!important;border-color:#6ee7b7!important}' +
    'html[data-sb-theme=dark] nav.site-nav,html[data-sb-theme=dark] .site-nav-inner{background:#0b0e13!important;border-color:#2c3340!important}html[data-sb-theme=dark] .site-logo-text{color:#e6e9ef!important}' +
    'html[data-sb-theme=dark] .site-header,html[data-sb-theme=dark] .site-nav,html[data-sb-theme=dark] aside.migration-bar{background:#0b0e13!important}' +
    '.sb-landing{max-width:780px;margin:36px auto 26px;text-align:center}.sb-land-title{font-size:32px;font-weight:900;margin:0 0 8px;color:#0f172a}.sb-land-sub{margin:0 0 18px;color:#64748b;font-size:15px}' +
    '.sb-engine{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:#eef2f6;margin-bottom:14px}.sb-engine-btn{border:0;background:transparent;padding:8px 22px;border-radius:999px;font-weight:800;cursor:pointer;color:#475569;font-size:15px}.sb-engine-btn.on[data-engine=naver]{background:#03c75a;color:#fff}.sb-engine-btn.on[data-engine=google]{background:#4285f4;color:#fff}' +
    '.sb-land-form{display:flex;gap:8px;background:#fff;border:2px solid #10b981;border-radius:16px;padding:6px;box-shadow:0 6px 24px rgba(16,185,129,.12)}.sb-land-input{flex:1;min-width:0;border:0;outline:0;font-size:18px;padding:12px 14px;background:transparent;color:inherit}.sb-land-go{border:0;border-radius:12px;padding:0 26px;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(90deg,#10b981,#059669);cursor:pointer;white-space:nowrap}' +
    '.sb-hist{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;margin-top:12px}.sb-hist-label{font-size:13px;color:#64748b;font-weight:700}.sb-chip-sm{font-size:13px!important;padding:4px 10px!important}.sb-hist-clear{border:0;background:none;color:#94a3b8;font-size:12px;cursor:pointer;text-decoration:underline}.sb-engine-note{margin-top:10px;font-size:13px;color:#2563eb}' +
    'html[data-sb-theme=dark] .sb-land-form{background:#171b23!important}html[data-sb-theme=dark] .sb-engine{background:#1f2530!important}html[data-sb-theme=dark] .sb-engine-btn.on[data-engine=naver]{background:#03c75a!important}html[data-sb-theme=dark] .sb-engine-btn.on[data-engine=google]{background:#4285f4!important}html[data-sb-theme=dark] .sb-land-go{background:#059669!important;color:#fff!important}' +
    '.sb-report{margin:0 0 20px;padding:22px}.sb-rp-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}.sb-rp-title{margin:0;font-size:24px;font-weight:900}.sb-rp-badge{background:#03c75a;color:#fff;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:800}.sb-rp-loading{padding:30px;text-align:center;color:#64748b}.sb-rp-error{padding:12px 14px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-size:14px}' +
    '.sb-rp-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}.sb-rp-card{border:1px solid #e2e8f0;border-radius:14px;padding:14px;background:#fff}.sb-rp-card-k{font-size:13px;color:#64748b;font-weight:700}.sb-rp-card-v{font-size:24px;font-weight:900;margin-top:4px}.sb-rp-card-s{font-size:12px;color:#64748b;margin-top:4px;line-height:1.4}' +
    '.sb-rp-sec{border-top:1px solid #e2e8f0;padding-top:16px;margin-top:16px}.sb-rp-h{margin:0 0 4px;font-size:18px;font-weight:900}.sb-rp-sub{margin:0 0 10px;font-size:13px;color:#64748b}.sb-rp-tabs{display:inline-flex;gap:4px;background:#eef2f6;border-radius:999px;padding:3px;margin-bottom:8px}.sb-rp-tab{border:0;background:transparent;border-radius:999px;padding:5px 16px;font-weight:800;cursor:pointer;color:#475569}.sb-rp-tab.on{background:#10b981;color:#fff}' +
    '.sb-chart{width:100%;height:auto;display:block}.sb-chart-line{fill:none;stroke:#10b981;stroke-width:2.5}.sb-chart-area{fill:rgba(16,185,129,.12)}.sb-chart-dot{fill:#10b981}.sb-chart-label{font-size:11px;fill:#94a3b8}.sb-rp-chg{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.sb-chg{font-size:13px;font-weight:800;padding:4px 10px;border-radius:999px;background:#f1f5f9;color:#475569}.sb-chg.up{background:#fee2e2;color:#dc2626}.sb-chg.down{background:#dbeafe;color:#2563eb}' +
    '#tierFilterContainer{display:none!important}#tab-analyzer.sb-searched .sb-quick,#tab-analyzer.sb-searched #analysisAccessGate{display:none!important}' +
    '.sb-rp-row2{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:0 22px}.sb-rp-rel{list-style:none;margin:0;padding:0;max-height:330px;overflow-y:auto}.sb-rp-rel li{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px dashed #e2e8f0;font-size:14px}.sb-rp-rel-k{flex:1;min-width:0;text-align:left;border:0;background:none;padding:0;font-weight:800;color:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sb-rp-rel-k:hover{color:#059669;text-decoration:underline}.sb-rp-rel-v{font-weight:800;white-space:nowrap}.sb-rp-rel-d{font-size:12px;color:#94a3b8;white-space:nowrap;min-width:64px;text-align:right}.sb-chart-grid{stroke:#e2e8f0;stroke-width:1}' +
    'html[data-sb-theme=dark] .sb-rp-rel-k{background:none!important}html[data-sb-theme=dark] .sb-chart-grid{stroke:#2c3340}' +
    '.sb-rp-badge-g{background:#4285f4!important}.sb-g-q{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 12px;font-size:14px}.sb-g-wrap{max-height:420px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:12px}.sb-g-table{width:100%;border-collapse:collapse;font-size:14px}.sb-g-table th{position:sticky;top:0;background:#f8fafc;text-align:left;padding:8px 10px;font-size:13px;color:#64748b}.sb-g-table td{padding:7px 10px;border-top:1px solid #eef2f6}.sb-g-n{color:#94a3b8;width:34px}.sb-g-v{font-weight:800;white-space:nowrap}.sb-g-link{color:#4285f4;font-size:12px;white-space:nowrap}' +
    'html[data-sb-theme=dark] .sb-g-table th{background:#1a1f28!important}html[data-sb-theme=dark] .sb-g-wrap{border-color:#2c3340!important}html[data-sb-theme=dark] .sb-g-table td{border-color:#2c3340!important}' +
    '.sb-demo-tag{font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;vertical-align:middle}.sb-demo-tag.exact{background:#dcfce7;color:#15803d}.sb-demo-tag.est{background:#fef3c7;color:#b45309}.sb-demo-k{font-size:13px;font-weight:800;color:#64748b;margin:8px 0 6px}.sb-demo-gbar{display:flex;height:22px;border-radius:999px;overflow:hidden;background:#eef2f6}.sb-demo-m{background:#3b82f6}.sb-demo-f{background:#ec4899}.sb-demo-glg{display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:5px}.sb-demo-glg .m{color:#3b82f6}.sb-demo-glg .f{color:#ec4899}.sb-demo-bars{height:130px}.sb-demo-afill{background:linear-gradient(#a5b4fc,#6366f1)}.sb-demo-afill.top{background:linear-gradient(#818cf8,#4338ca)}' +
    'html[data-sb-theme=dark] .sb-demo-gbar{background:#1f2530!important}html[data-sb-theme=dark] .sb-demo-m{background:#3b82f6!important}html[data-sb-theme=dark] .sb-demo-f{background:#ec4899!important}html[data-sb-theme=dark] .sb-demo-afill{background:#6366f1!important}html[data-sb-theme=dark] .sb-demo-tag.exact{background:#14361f!important;color:#86efac!important}html[data-sb-theme=dark] .sb-demo-tag.est{background:#3a2a10!important;color:#fcd34d!important}' +
    '.sb-pop-bg{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}.sb-pop{background:#fff;border-radius:16px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25)}.sb-pop-t{font-size:18px;font-weight:900;margin-bottom:10px}.sb-pop-p{margin:0 0 8px;font-size:14.5px;line-height:1.6;color:#334155}.sb-pop-f{display:flex;justify-content:space-between;align-items:center;margin-top:14px}.sb-pop-hide{font-size:13px;color:#64748b;cursor:pointer}.sb-pop-ok{border:0;border-radius:10px;padding:9px 22px;font-weight:900;color:#fff;background:#059669;cursor:pointer}' +
    'html[data-sb-theme=dark] .sb-pop{background:#171b23!important}html[data-sb-theme=dark] .sb-pop-ok{background:#059669!important;color:#fff!important}' +
    '.sb-rp-bigstat{padding:16px;border:1px solid #e2e8f0;border-radius:14px;margin:6px 0 8px}html[data-sb-theme=dark] .sb-rp-bigstat{border-color:#2c3340!important}' +
    '.sb-rp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 20px}.sb-rp-list{margin:0;padding-left:0;list-style:none}.sb-rp-ol{counter-reset:r}.sb-rp-list li{padding:7px 0;border-bottom:1px dashed #e2e8f0;font-size:14px;line-height:1.45}.sb-rp-ol li:before{counter-increment:r;content:counter(r);display:inline-block;width:20px;font-weight:900;color:#10b981}.sb-rp-list a{color:inherit;text-decoration:none;font-weight:700}.sb-rp-list a:hover{text-decoration:underline}.sb-rp-meta{display:block;font-size:12px;color:#94a3b8;margin-top:2px}' +
    '.sb-rp-lock{padding:14px;border-radius:12px;background:#fffbeb;color:#92400e;font-size:14px}.sb-rp-bars{display:flex;gap:10px;align-items:flex-end;height:160px;padding-top:8px}.sb-rp-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}.sb-rp-bar-fill{width:70%;background:linear-gradient(#34d399,#059669);border-radius:6px 6px 0 0}.sb-rp-bar-v{font-size:12px;font-weight:800;margin-bottom:3px}.sb-rp-bar-k{font-size:12px;color:#64748b;margin-top:4px}.sb-rp-foot{margin:16px 0 0;font-size:13px;color:#64748b}' +
    'html[data-sb-theme=dark] .sb-rp-card{background:#1a1f28!important;border-color:#2c3340!important}html[data-sb-theme=dark] .sb-rp-tab.on{background:#146c54!important}html[data-sb-theme=dark] .sb-rp-badge{background:#03c75a!important}html[data-sb-theme=dark] .sb-chg.up{background:#3b1d22!important;color:#fca5a5!important}html[data-sb-theme=dark] .sb-chg.down{background:#172a46!important;color:#93c5fd!important}html[data-sb-theme=dark] .sb-rp-lock{background:#2a2414!important;color:#fcd34d!important}html[data-sb-theme=dark] .sb-rp-error{background:#2a1618!important;color:#fca5a5!important}html[data-sb-theme=dark] .sb-rp-bar-fill{background:#10b981!important}' +
    // 5단계 다듬기: 연관 키워드 버튼 배경, 연령 막대 색(초록 막대 규칙에 덮이던 문제), 구글 표가 #leword-app 표 여백(17px)을 물려받던 문제
    'html[data-sb-theme=dark] body .sb-rp-rel-k{background:none!important}html[data-sb-theme=dark] body .sb-rp-rel-k:hover{color:#6ee7b7!important}' +
    '.sb-rp-bar-fill.sb-demo-afill{background:linear-gradient(#a5b4fc,#6366f1)}.sb-rp-bar-fill.sb-demo-afill.top{background:linear-gradient(#818cf8,#4338ca)}html[data-sb-theme=dark] .sb-rp-bar-fill.sb-demo-afill{background:#4f46e5!important}html[data-sb-theme=dark] .sb-rp-bar-fill.sb-demo-afill.top{background:#7479f2!important}' +
    '#leword-app .sb-g-table th,#leword-app .sb-g-table td{padding:8px 10px!important;font-size:14px;border-bottom:0!important}#leword-app .sb-g-table th{font-size:13px}.sb-rp-rel-k{font-size:inherit!important;font-family:inherit}.sb-g-table .sb-rp-rel-k{min-height:0!important}' +
    'html[data-sb-theme=dark] #leword-app tr:hover td{background:#1f2530!important}html[data-sb-theme=dark] #leword-app .golden-live-table tr:hover td,html[data-sb-theme=dark] #leword-app .golden-live-table tr.active td{background:#232a45!important}html[data-sb-theme=dark] #leword-app #exposureResults .exposure-benchmark-table tbody tr:hover{background:#1f2530!important}html[data-sb-theme=dark] #leword-app .sb-g-table td{border-top-color:#2c3340!important}' +
    '@media(max-width:980px){.sb-rp-row2,.sb-rp-grid{grid-template-columns:1fr}}@media(max-width:800px){.sb-rp-cards{grid-template-columns:1fr 1fr}}' +
    '@media(max-width:700px){.sb-land-title{font-size:24px}.sb-land-go{padding:0 16px}.sb-quick{padding:16px}.sb-golden-filter{margin-left:0;margin-top:6px}}';
  function init() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    try { installThemeToggle(); } catch (_) {}
    try { showSiteNotice(); } catch (_) {}
    try { relocatePanels(); } catch (_) {}
    hookShowPage();
    hookKeyButtons();
    installAnalyzerHooks();
    var page = new URLSearchParams(location.search).get('page') || 'home';
    onPage(page);
    onPage('keyword'); // 항상 키워드 분석기 랜딩 UI 주입 보장!
    decorateCards(document);
    new MutationObserver(function (muts) { for (var i = 0; i < muts.length; i++) if (muts[i].addedNodes.length) { decorateCards(document); scheduleDarkFix(); break; } }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
