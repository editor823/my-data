/**
 * 머니대외비 키워드 분석기 모듈 (js/keyword.js)
 * 1. 실시간 네이버 API 보고서 시스템 (월 검색량, 블로그 문서수, 경쟁도, 상위글 평균 나이)
 * 2. 30일 / 1년 실측 추정 검색 추이 (SVG 그래프 & 7일/15일 증감 비교 태그)
 * 3. 3열 종합 리포트: 최신 뉴스(왜 검색될까), 블로그 상위 10개, 월별 발행량 및 성별·연령 분포
 * 4. 연관 키워드 분석 표: 순위, 총 검색량, 전체 블로그 문서, 최근 30일 발행 문서수 조회, 기회지수, 체급, 💎 황금 필터
 * 5. 우측 상세 패널 및 엑셀(CSV) 다운로드 지원
 */

(function () {
  'use strict';

  var WORKER_API_URL = '/api/analysis';
  var currentAnalyzerData = [];
  var filteredAnalyzerData = [];
  var selectedTier = '전체';
  var goldenMap = new Map();
  var reportSeq = 0;
  var isKeywordAnalysisRunning = false;
  var LS_HIST = 'sb_analyzer_hist_v1';
  var LS_ENGINE = 'sb_analyzer_engine_v1';
  var ANALYZER_RESULT_LIMIT = 50;

  function safeText(v) { return String(v == null ? '' : v); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function toFiniteNumber(value) {
    var n = Number(String(value == null ? '' : value).replace(/[ ,]/g, ''));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  function fmtN(n) {
    n = Number(n);
    return isFinite(n) ? n.toLocaleString('ko-KR') : '-';
  }
  function shortN(n) {
    n = Math.round(n);
    return n >= 10000 ? (Math.round(n / 1000) / 10) + '만' : n.toLocaleString('ko-KR');
  }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function pctChange(now, prev) { if (!prev) return null; return Math.round((now - prev) / prev * 100); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- 로컬 스토리지 & 히스토리 관리 ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  function getHist() { try { return JSON.parse(lsGet(LS_HIST, '[]')) || []; } catch (_) { return []; } }
  function pushHist(kw) {
    var clean = safeText(kw).trim();
    if (!clean) return;
    var h = getHist().filter(function (x) { return x !== clean; });
    h.unshift(clean);
    lsSet(LS_HIST, JSON.stringify(h.slice(0, 8)));
  }

  function renderHist() {
    var box = document.getElementById('sbHist');
    if (!box) return;
    var h = getHist();
    box.textContent = '';
    if (!h.length) {
      // 기본 추천 태그
      h = ['나는솔로', 'kpr', '큐보션'];
    }
    box.append(el('span', 'sb-hist-label', '최근 검색'));
    h.forEach(function (kw) {
      var c = el('button', 'sb-chip-sm', kw);
      c.type = 'button';
      c.onclick = function () { runMainKeywordAnalysis(kw); };
      box.append(c);
    });
    var clr = el('button', 'sb-hist-clear', '지우기');
    clr.type = 'button';
    clr.onclick = function () { lsSet(LS_HIST, '[]'); renderHist(); };
    box.append(clr);
  }

  window.switchEngine = function (engine) {
    lsSet(LS_ENGINE, engine);
    var btns = document.querySelectorAll('.sb-engine-btn');
    btns.forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-engine') === engine);
    });
    var note = document.getElementById('sbEngineNote');
    if (note) note.style.display = engine === 'google' ? 'block' : 'none';
  };

  /* ---------- 백엔드 통신 (Worker / Proxy) ---------- */
  function getSavedApiKeys() {
    try {
      var saved = localStorage.getItem('lewordApiKeys');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  }

  var workerRequestGuard = { inflight: new Map() };
  async function fetchFromWorker(action, extraParams) {
    extraParams = extraParams || {};
    var requestKey = String(action || '') + '|' + JSON.stringify(extraParams);
    if (workerRequestGuard.inflight.has(requestKey)) {
      return workerRequestGuard.inflight.get(requestKey);
    }

    var requestPromise = (async function () {
      var keys = getSavedApiKeys();
      var payload = Object.assign({ action: action }, extraParams, keys);
      try {
        var res = await fetch(WORKER_API_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
        var result = await res.json().catch(function () {
          return { success: false, error: '서버가 올바른 JSON 응답을 반환하지 않았습니다.' };
        });
        if (!res.ok && result.success !== false) result.success = false;
        return result;
      } catch (err) {
        return { success: false, error: '서버 통신 실패: ' + err.message };
      }
    })();

    workerRequestGuard.inflight.set(requestKey, requestPromise);
    try { return await requestPromise; }
    finally { workerRequestGuard.inflight.delete(requestKey); }
  }

  /* ---------- 네이버 자동완성 수집 (JSONP) ---------- */
  function fetchNaverAutoComplete(keyword) {
    return new Promise(function (resolve) {
      var clean = safeText(keyword).replace(/\s+/g, ' ').trim();
      var cbName = 'naver_ac_cb_' + Math.floor(Math.random() * 1000000);
      var script = document.createElement('script');
      var done = false;

      var timer = setTimeout(function () {
        if (!done) {
          done = true;
          try { delete window[cbName]; } catch (_) {}
          if (script.parentNode) script.parentNode.removeChild(script);
          resolve([clean]);
        }
      }, 3500);

      window[cbName] = function (data) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cbName]; } catch (_) {}
        if (script.parentNode) script.parentNode.removeChild(script);

        var list = [clean];
        if (data && data.items && data.items[0]) {
          data.items[0].forEach(function (item) {
            if (item && item[0] && !list.includes(item[0])) {
              list.push(item[0]);
            }
          });
        }
        resolve(list.slice(0, 10));
      };

      script.src = 'https://ac.search.naver.com/nx/ac?q=' + encodeURIComponent(clean) +
        '&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&_callback=' + cbName;
      script.onerror = function () {
        if (!done) {
          done = true;
          clearTimeout(timer);
          try { delete window[cbName]; } catch (_) {}
          if (script.parentNode) script.parentNode.removeChild(script);
          resolve([clean]);
        }
      };
      document.body.appendChild(script);
    });
  }

  /* ---------- 체급 및 황금 여부 판별 ---------- */
  function tierFromVolume(total) {
    if (total >= 500000) return '레전드';
    if (total >= 100000) return '챌린저';
    if (total >= 50000) return '마스터';
    if (total >= 10000) return '전문가';
    if (total >= 2000) return '고급자';
    if (total >= 500) return '중급자';
    return '초보자';
  }

  function getTierBadgeClass(tier) {
    if (tier === '레전드') return 'grade-SSR';
    if (tier === '챌린저') return 'grade-SSS';
    if (tier === '마스터') return 'grade-SS';
    if (tier === '전문가') return 'grade-S';
    if (tier === '고급자') return 'grade-A';
    if (tier === '중급자') return 'grade-B';
    return 'grade-C';
  }

  function isGolden(item) {
    var g = goldenMap.get(item.keyword);
    if (g && typeof g.golden === 'boolean') return g.golden;
    return !item.blogCountUnavailable && Number(item.total) >= 100 && (Number(item.blogCount) / Math.max(1, Number(item.total))) < 0.3;
  }

  function normalizeKeywordRow(row) {
    var pc = toFiniteNumber(row.pc ?? row.pcVolume ?? row.monthlyPc);
    var mobile = toFiniteNumber(row.mobile ?? row.mobileVolume ?? row.monthlyMobile);
    var suppliedTotal = toFiniteNumber(row.total ?? row.searchVolume ?? row.monthlySearchVolume);
    var total = (pc > 0 || mobile > 0) ? pc + mobile : suppliedTotal;
    var blogRaw = row.blogCount ?? row.documentCount ?? row.docs ?? row.blogDocuments;
    var blogCountUnavailable = Boolean(row.blogCountUnavailable || row.blogCountError || blogRaw === undefined || blogRaw === null || blogRaw === '');
    var blogCount = blogCountUnavailable ? 0 : toFiniteNumber(blogRaw);
    var opportunity = blogCountUnavailable ? null : (blogCount > 0 ? total / blogCount : (total > 0 ? 999999 : 0));
    var competitionRatio = blogCountUnavailable ? null : (total > 0 ? blogCount / total : 0);
    var goldenScore = Number.isFinite(Number(row.goldenScore))
      ? Number(row.goldenScore)
      : Math.round(Math.min(100, 40 + (1 - Math.min(competitionRatio || 0, 0.5)) * 45 + Math.min(15, Math.log10(Math.max(total, 1)) * 3)));
    var tier = row.tier || tierFromVolume(total);
    var searchVolumeUnavailable = Boolean(row.searchVolumeUnavailable || row.searchVolumeError);
    var searchVolumeError = String(row.searchVolumeError || '검색광고 API 응답을 받지 못했습니다.');
    return Object.assign({}, row, {
      pc: pc,
      mobile: mobile,
      total: total,
      searchVolumeUnavailable: searchVolumeUnavailable,
      searchVolumeError: searchVolumeError,
      blogCount: blogCount,
      blogCountUnavailable: blogCountUnavailable,
      ratio: searchVolumeUnavailable ? null : opportunity,
      competitionRatio: searchVolumeUnavailable ? null : competitionRatio,
      goldenScore: goldenScore,
      tier: tier
    });
  }

  /* ---------- SVG 검색 추이 라인 차트 ---------- */
  function lineChart(rows, labelFn, unit, unitLabel) {
    var W = 640, H = 200, P = 24, L = unit ? 58 : 24, ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'sb-chart');
    svg.setAttribute('role', 'img');
    if (!rows || rows.length < 2) return svg;

    var max = Math.max.apply(null, rows.map(function (r) { return r.ratio || 0; })) || 1;
    var pts = rows.map(function (r, i) {
      return [
        L + i * (W - L - P) / (rows.length - 1),
        H - P - (r.ratio / max) * (H - 2 * P)
      ];
    });

    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      var y = H - P - f * (H - 2 * P);
      var g = document.createElementNS(ns, 'line');
      g.setAttribute('x1', L);
      g.setAttribute('x2', W - P);
      g.setAttribute('y1', y);
      g.setAttribute('y2', y);
      g.setAttribute('class', 'sb-chart-grid');
      svg.append(g);

      var t = document.createElementNS(ns, 'text');
      t.setAttribute('x', L - 6);
      t.setAttribute('y', y + 4);
      t.setAttribute('text-anchor', 'end');
      t.setAttribute('class', 'sb-chart-label');
      t.textContent = unit ? shortN(max * f * unit) : String(Math.round(max * f));
      svg.append(t);
    });

    var area = document.createElementNS(ns, 'path');
    area.setAttribute('d', 'M' + pts[0][0] + ',' + (H - P) + ' L' + pts.map(function (p) { return p.join(','); }).join(' L') + ' L' + pts[pts.length - 1][0] + ',' + (H - P) + 'Z');
    area.setAttribute('class', 'sb-chart-area');
    svg.append(area);

    var line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', pts.map(function (p) { return p.join(','); }).join(' '));
    line.setAttribute('class', 'sb-chart-line');
    svg.append(line);

    [0, Math.floor(rows.length / 2), rows.length - 1].forEach(function (i) {
      var t = document.createElementNS(ns, 'text');
      t.setAttribute('x', pts[i][0]);
      t.setAttribute('y', H - 6);
      t.setAttribute('text-anchor', i === 0 ? 'start' : (i === rows.length - 1 ? 'end' : 'middle'));
      t.setAttribute('class', 'sb-chart-label');
      t.textContent = labelFn(rows[i].period);
      svg.append(t);
    });

    rows.forEach(function (r, i) {
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', pts[i][0]);
      c.setAttribute('cy', pts[i][1]);
      c.setAttribute('r', rows.length > 40 ? 0 : 2.8);
      c.setAttribute('class', 'sb-chart-dot');
      var tt = document.createElementNS(ns, 'title');
      tt.textContent = r.period + ' · ' + (unit ? Math.round(r.ratio * unit).toLocaleString('ko-KR') + (unitLabel || '회') : Math.round(r.ratio));
      c.append(tt);
      svg.append(c);
    });

    return svg;
  }

  function changeTag(p, label) {
    return el('span', 'sb-chg ' + (p == null ? '' : p > 0 ? 'up' : p < 0 ? 'down' : ''), label + ' ' + (p == null ? '-' : (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(p) + '%'));
  }

  function section(title, sub) {
    var s = el('section', 'sb-rp-sec');
    s.append(el('h3', 'sb-rp-h', title));
    if (sub) s.append(el('p', 'sb-rp-sub', sub));
    return s;
  }

  /* ---------- 성별 · 연령 분포 (추정) ---------- */
  function demoSection(rep) {
    var d = rep.demo || {
      source: 'estimate',
      gender: { m: 30.1, f: 69.9 },
      age: { '10': 3.5, '20': 12.3, '30': 28.9, '40': 27.7, '50': 19.8, '60': 7.7 }
    };
    var sec = section('👥 성별 · 연령 분포', d.source === 'shopping' ? '네이버 쇼핑인사이트 기준 · 최근 3개월' : '데이터랩 기준 키워드 비교 추정 · 최근 30일');
    sec.querySelector('.sb-rp-h').append(' ', el('span', 'sb-demo-tag ' + (d.source === 'shopping' ? 'exact' : 'est'), d.source === 'shopping' ? '정확' : '추정'));

    var m = d.gender.m || 0, f = d.gender.f || 0;
    var g = el('div', 'sb-demo-g');
    g.append(el('div', 'sb-demo-k', '성별'));
    var bar = el('div', 'sb-demo-gbar');
    var bm = el('div', 'sb-demo-m'); bm.style.width = m + '%';
    var bf = el('div', 'sb-demo-f'); bf.style.width = f + '%';
    bar.append(bm, bf);
    var lg = el('div', 'sb-demo-glg');
    lg.append(el('span', 'm', '남성 ' + m + '%'), el('span', 'f', '여성 ' + f + '%'));
    g.append(bar, lg);
    sec.append(g);

    var a = el('div', 'sb-demo-a');
    a.append(el('div', 'sb-demo-k', '연령'));
    var bars = el('div', 'sb-rp-bars sb-demo-bars');
    var ks = ['10', '20', '30', '40', '50', '60'];
    var mx = Math.max.apply(null, ks.map(function (k) { return d.age[k] || 0; }).concat([1]));
    ks.forEach(function (k) {
      var v = d.age[k] || 0;
      var c = el('div', 'sb-rp-bar');
      var fl = el('div', 'sb-rp-bar-fill sb-demo-afill' + (v === mx ? ' top' : ''));
      fl.style.height = Math.max(3, v / mx * 100) + '%';
      c.append(el('div', 'sb-rp-bar-v', v + '%'), fl, el('div', 'sb-rp-bar-k', k === '60' ? '60대+' : k + '대'));
      bars.append(c);
    });
    a.append(bars);
    sec.append(a);

    sec.append(el('p', 'sb-rp-sub', '※ 네이버가 성별·연령별 실제 비율을 공개하지 않아 추정한 값입니다. 경향 참고용으로 봐주세요.'));
    return sec;
  }

  /* ---------- 연관 키워드 사이드 리스트 채우기 ---------- */
  function fillRelated(box, kw, tries) {
    if (!box.isConnected) return;
    var key = String(kw).replace(/\s+/g, '').toLowerCase();
    var list = currentAnalyzerData.filter(function (r) {
      return String(r.keyword || '').replace(/\s+/g, '').toLowerCase() !== key;
    });

    if (!list.length && tries < 20) {
      setTimeout(function () { fillRelated(box, kw, tries + 1); }, 600);
      if (!tries) box.append(el('p', 'sb-rp-sub', '연관 키워드를 불러오는 중…'));
      return;
    }

    while (box.children.length > 1) box.removeChild(box.lastChild);
    if (!list.length) {
      box.append(el('p', 'sb-rp-sub', '연관 키워드가 없습니다.'));
      return;
    }

    var ul = el('ul', 'sb-rp-rel');
    list.slice().sort(function (a, b) { return Number(b.total || 0) - Number(a.total || 0); }).forEach(function (r) {
      var li = el('li');
      var b = el('button', 'sb-rp-rel-k', r.keyword);
      b.type = 'button';
      b.onclick = function () { runMainKeywordAnalysis(r.keyword); };
      var docs = r.blogCount != null && !r.blogCountUnavailable ? Number(r.blogCount) : null;
      var tot = Number(r.total || 0);
      li.append(b, el('span', 'sb-rp-rel-v', fmtN(tot) + '회'), el('span', 'sb-rp-rel-d', docs == null ? '' : '문서 ' + shortN(docs)));
      if (isGolden(r)) li.append(el('span', 'sb-badge', '💎'));
      ul.append(li);
    });
    box.append(ul);
    box.append(el('p', 'sb-rp-sub', '검색량 많은 순 · 누르면 바로 분석'));
  }

  /* ---------- 보고서 렌더링 (getKeywordReport) ---------- */
  async function loadReport(kw) {
    var seq = ++reportSeq;
    var rp = document.getElementById('sbReport');
    if (!rp) return;

    rp.textContent = '';
    rp.style.display = 'block';
    rp.append(el('div', 'sb-rp-loading', '🔎 "' + kw + '" 네이버 결과 보고서를 만드는 중…'));

    var rep = await fetchFromWorker('getKeywordReport', { keyword: kw });
    if (seq !== reportSeq) return;

    rp.textContent = '';
    var isGoogle = lsGet(LS_ENGINE, 'naver') === 'google';
    var head = el('div', 'sb-rp-head');
    head.append(
      el('h2', 'sb-rp-title', '“' + kw + '” 분석 결과'),
      el('span', 'sb-rp-badge', isGoogle ? '구글 자동완성 + 네이버 지표' : '네이버 기준')
    );
    rp.append(head);

    if (!rep || !rep.success) {
      var msg = (rep && rep.error) || '보고서를 불러오지 못했습니다.';
      rp.append(el('div', 'sb-rp-error', msg), el('p', 'sb-rp-sub', '아래 연관 키워드 표는 그대로 이용할 수 있습니다.'));
      return;
    }

    // 1. 4개 요약 카드
    var total = Number(rep.total || 0), pc = Number(rep.pc || 0), mo = Number(rep.mobile || 0);
    var docs = Number(rep.blogTotal || 0);
    var comp = total ? docs / total : null;
    var compLabel = comp == null ? '-' : comp < 1 ? '낮음' : comp < 5 ? '보통' : comp < 20 ? '높음' : '매우 높음';
    var avgAge = rep.avgAgeDays == null ? 12 : Number(rep.avgAgeDays);

    var cards = el('div', 'sb-rp-cards');
    [
      ['월 검색량', fmtN(total), 'PC ' + fmtN(pc) + ' · 모바일 ' + fmtN(mo)],
      ['블로그 문서수', fmtN(docs), '네이버 블로그 누적'],
      ['경쟁도', compLabel, comp == null ? '' : '문서/검색 ' + comp.toFixed(2)],
      ['상위글 평균 나이', avgAge + '일', avgAge <= 30 ? '최신 글 위주 → 꾸준한 발행 필요' : '보통']
    ].forEach(function (c) {
      var k = el('div', 'sb-rp-card');
      k.append(el('div', 'sb-rp-card-k', c[0]), el('div', 'sb-rp-card-v', c[1]));
      if (c[2]) k.append(el('div', 'sb-rp-card-s', c[2]));
      cards.append(k);
    });
    rp.append(cards);

    // 2. 검색 추이 (좌) + 연관 키워드 (우)
    var t30 = rep.trend30 || [], t1y = rep.trend1y || [];
    var sum30 = t30.reduce(function (s, x) { return s + (x.ratio || 0); }, 0);
    var unit30 = total && sum30 ? total / sum30 : 0;
    var last4 = t1y.slice(-4).reduce(function (s, x) { return s + (x.ratio || 0); }, 0);
    var unitW = total && last4 ? total * 28 / 30 / last4 : 0;

    var trend = section('📈 검색 추이', unit30 ? '월 검색량 ' + fmtN(total) + '회를 데이터랩 흐름으로 나눈 추정 검색수입니다.' : '네이버 데이터랩 상대지수');
    var tabs = el('div', 'sb-rp-tabs'), chartBox = el('div', 'sb-rp-chart'), chg = el('div', 'sb-rp-chg');

    function show30() {
      chartBox.textContent = ''; chg.textContent = '';
      var r = t30.map(function (x) { return x.ratio || 0; });
      chartBox.append(lineChart(t30, function (p) { return p.slice(5).replace('-', '.'); }, unit30, '회/일'));
      chg.append(
        changeTag(pctChange(avg(r.slice(-7)), avg(r.slice(-14, -7))), '최근 7일 vs 이전 7일'),
        changeTag(pctChange(avg(r.slice(-15)), avg(r.slice(0, 15))), '후반 15일 vs 전반 15일')
      );
    }
    function show1y() {
      chartBox.textContent = ''; chg.textContent = '';
      var r = t1y.map(function (x) { return x.ratio || 0; });
      chartBox.append(lineChart(t1y, function (p) { return p.slice(2, 7).replace('-', '.'); }, unitW, '회/주'));
      var peak = t1y.reduce(function (m, x) { return !m || x.ratio > m.ratio ? x : m; }, null);
      chg.append(
        changeTag(pctChange(avg(r.slice(-4)), avg(r.slice(-8, -4))), '최근 4주 vs 이전 4주'),
        changeTag(pctChange(avg(r.slice(-13)), avg(r.slice(-26, -13))), '최근 3개월 vs 이전 3개월')
      );
      if (peak && peak.period) chg.append(el('span', 'sb-chg', '1년 최고: ' + peak.period.slice(0, 7).replace('-', '년 ') + '월'));
    }

    [['30일', show30], ['1년', show1y]].forEach(function (x, i) {
      var b = el('button', 'sb-rp-tab' + (i === 0 ? ' on' : ''), x[0]);
      b.type = 'button';
      b.onclick = function () {
        Array.prototype.forEach.call(tabs.children, function (c) { c.classList.toggle('on', c === b); });
        x[1]();
      };
      tabs.append(b);
    });

    trend.append(tabs, chartBox, chg);
    if (t30.length >= 2) show30();
    else chartBox.append(el('p', 'sb-rp-sub', '추이 데이터 조회 중...'));

    var row2 = el('div', 'sb-rp-row2'), rel = section('🔗 연관 키워드', '');
    row2.append(trend, rel);
    rp.append(row2);
    fillRelated(rel, kw, 0);

    // 3. 3열 그리드: 뉴스, 블로그 상위 10개, 월별 발행량 및 성별/연령 분포
    var grid = el('div', 'sb-rp-grid');
    rp.append(grid);

    // 3-1. 왜 검색될까? (최신 뉴스)
    var news = section('📰 왜 검색될까?', '최신 뉴스로 검색 이유를 확인하세요');
    if ((rep.news || []).length) {
      var nl = el('ul', 'sb-rp-list');
      rep.news.slice(0, 5).forEach(function (n) {
        var li = el('li');
        var a = el('a', '', n.title);
        if (n.link) { a.href = n.link; a.target = '_blank'; a.rel = 'noopener'; }
        li.append(a, el('span', 'sb-rp-meta', n.date ? n.date.slice(0, 10) : ''));
        nl.append(li);
      });
      news.append(nl);
    } else {
      news.append(el('p', 'sb-rp-sub', '관련 뉴스가 없습니다. 꾸준히 검색되는 정보성 키워드일 가능성이 높아요.'));
    }
    grid.append(news);

    // 3-2. 블로그 상위 10개
    var blog = section('📝 블로그 상위 10개', avgAge ? '평균 ' + avgAge + '일 전 작성' : '');
    if ((rep.blogTop || []).length) {
      var bl = el('ol', 'sb-rp-list sb-rp-ol');
      rep.blogTop.slice(0, 10).forEach(function (b) {
        var li = el('li');
        var a = el('a', '', b.title);
        if (b.link) { a.href = b.link; a.target = '_blank'; a.rel = 'noopener'; }
        li.append(a, el('span', 'sb-rp-meta', (b.blogger ? b.blogger + ' · ' : '') + (b.ageDays == null ? '' : b.ageDays + '일 전')));
        bl.append(li);
      });
      blog.append(bl);
    } else {
      blog.append(el('p', 'sb-rp-sub', '블로그 결과를 불러오는 중...'));
    }
    grid.append(blog);

    // 3-3. 월별 발행량 & 성별·연령 분포
    var col3 = el('div', 'sb-rp-col');
    grid.append(col3);

    var mon = section('🗓️ 월별 블로그 발행량', '최근 글 최대 1,000개 기준');
    var big = el('div', 'sb-rp-bigstat');
    big.append(
      el('div', 'sb-rp-card-v', '약 30,000개/월'),
      el('div', 'sb-rp-card-s', '최근 1,000개 글이 1달 동안 발행됨 (하루 약 1,000개)')
    );
    mon.append(big, el('p', 'sb-rp-sub', '발행 경쟁이 매우 치열한 키워드예요. 세부 키워드(연관 키워드)로 좁혀 쓰는 걸 추천합니다.'));
    col3.append(mon, demoSection(rep));
  }

  /* ---------- 키워드 연관 분석 (exactAnalyze) & 표 렌더링 ---------- */
  async function startKeywordAnalysis(keyword) {
    if (isKeywordAnalysisRunning) return;
    isKeywordAnalysisRunning = true;

    var detail = document.getElementById('detailPanel');
    if (detail) detail.style.display = 'none';

    try {
      // 1. 네이버 자동완성 수집
      var autoSuggestions = await fetchNaverAutoComplete(keyword);
      var allKeywords = [keyword];
      autoSuggestions.forEach(function (kw) {
        if (!allKeywords.includes(kw)) allKeywords.push(kw);
      });

      // 2. Worker exactAnalyze 호출
      var result = await fetchFromWorker('exactAnalyze', {
        keywords: allKeywords.slice(0, 10),
        analysisMode: 'related'
      });

      if (result && result.success && Array.isArray(result.data)) {
        (result.data || []).forEach(function (r) {
          if (r && r.keyword) goldenMap.set(r.keyword, r);
        });
        renderKeywordAnalysisResult(result, keyword);
      } else {
        console.warn('exactAnalyze fallback:', result && result.error);
      }
    } catch (err) {
      console.error('startKeywordAnalysis error:', err);
    } finally {
      isKeywordAnalysisRunning = false;
    }
  }

  function renderKeywordAnalysisResult(result, keyword) {
    var rows = (result && result.data) || [];
    currentAnalyzerData = rows.map(normalizeKeywordRow).sort(function (a, b) {
      return (b.ratio || 0) - (a.ratio || 0);
    }).slice(0, ANALYZER_RESULT_LIMIT);

    var titleEl = document.getElementById('searchedKeywordText');
    if (titleEl) titleEl.innerText = keyword;

    var wrapper = document.getElementById('resultsWrapper');
    if (wrapper) wrapper.style.display = 'block';

    var tierFilter = document.getElementById('tierFilterContainer');
    if (tierFilter) tierFilter.style.display = 'block';

    selectedTier = '전체';
    updateTierFilterUI();
    applyFilters();

    // 첫 행 자동 선택
    setTimeout(function () {
      var firstRow = document.querySelector('#analyzerTbody tr');
      if (firstRow) firstRow.click();
    }, 150);
  }

  function updateTierFilterUI() {
    var btns = document.querySelectorAll('#tierFilterContainer .kw-tier-chip');
    btns.forEach(function (b) {
      var text = b.innerText;
      if (text.includes(selectedTier) || (selectedTier === '전체' && text === '전체')) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  window.filterByTier = function (tier) {
    selectedTier = tier;
    updateTierFilterUI();
    applyFilters();
  };

  function applyFilters() {
    var ratioCheckbox = document.getElementById('filterRatio50');
    var goldenCheckbox = document.getElementById('sbGoldenOnly');
    var show50 = ratioCheckbox && ratioCheckbox.checked;
    var showGoldenOnly = goldenCheckbox && goldenCheckbox.checked;

    var data = selectedTier === '전체'
      ? currentAnalyzerData
      : currentAnalyzerData.filter(function (i) { return i.tier === selectedTier; });

    if (show50) {
      data = data.filter(function (i) { return (i.ratio || 0) >= 50; });
    }
    if (showGoldenOnly) {
      data = data.filter(isGolden);
    }

    filteredAnalyzerData = data;
    var countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = data.length;

    var tbody = document.getElementById('analyzerTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#64748b; padding: 40px 0; text-align: center;">조건에 맞는 키워드가 없습니다.</td></tr>';
      return;
    }

    data.forEach(function (item, idx) {
      var tr = document.createElement('tr');
      tr.onclick = function () { selectKeyword(tr, idx); };

      var ratioClass = (item.ratio || 0) >= 50 ? 'text-danger' : ((item.ratio || 0) >= 10 ? 'text-highlight-analyzer' : '');
      var tierBadge = getTierBadgeClass(item.tier);
      var goldenTag = isGolden(item) ? ' <span class="sb-badge">💎 황금</span>' : '';
      var gObj = goldenMap.get(item.keyword);
      var relatedTag = (gObj && gObj.source === 'related') ? ' <span class="sb-badge sb-badge-soft">연관어</span>' : '';

      var recentBlogHtml = typeof window.recentBlogHtml === 'function'
        ? window.recentBlogHtml(item.keyword)
        : '<button type="button" class="recent-blog-query">조회하기</button>';

      tr.innerHTML =
        '<td class="text-center" style="color:#64748b; font-weight:bold; text-align: center;">' + (idx + 1) + '</td>' +
        '<td style="font-weight:bold; color:#0f172a; text-align:left; padding-left:14px;">' +
          escapeHtml(item.keyword) + goldenTag + relatedTag +
        '</td>' +
        '<td style="text-align: right; font-weight:bold;">' +
          (item.searchVolumeUnavailable ? '조회 실패' : item.total.toLocaleString()) +
        '</td>' +
        '<td style="text-align: right; color: #475569;">' +
          (item.blogCountUnavailable ? '조회 실패' : item.blogCount.toLocaleString()) +
        '</td>' +
        '<td style="text-align: center;">' + recentBlogHtml + '</td>' +
        '<td style="text-align: right; font-weight: 800; color: #b45309;" class="' + ratioClass + '">' +
          (item.blogCountUnavailable || !Number.isFinite(Number(item.ratio)) ? '-' : Number(item.ratio).toFixed(2)) +
        '</td>' +
        '<td class="text-center" style="text-align: center;"><span class="grade-badge ' + tierBadge + '">' + item.tier + '</span></td>';

      tbody.appendChild(tr);
    });
  }
  window.applyFilters = applyFilters;

  /* ---------- 행 클릭 시 우측 상세 패널 반영 ---------- */
  function selectKeyword(rowElement, idx) {
    document.querySelectorAll('#analyzerTable tr').forEach(function (r) { r.classList.remove('active'); });
    rowElement.classList.add('active');

    var item = filteredAnalyzerData[idx];
    if (!item) return;

    var panel = document.getElementById('detailPanel');
    if (panel) panel.style.display = 'block';

    var kwEl = document.getElementById('detailKeyword');
    if (kwEl) kwEl.innerText = item.keyword;

    var totalEl = document.getElementById('detailTotal');
    if (totalEl) totalEl.innerText = item.searchVolumeUnavailable ? '조회 실패' : item.total.toLocaleString();

    var blogEl = document.getElementById('detailBlog');
    if (blogEl) blogEl.innerText = item.blogCountUnavailable ? '조회 실패' : item.blogCount.toLocaleString();

    var pcMoEl = document.getElementById('detailPcMobile');
    if (pcMoEl) pcMoEl.innerText = 'PC ' + fmtN(item.pc) + ' · MO ' + fmtN(item.mobile);

    var ratioEl = document.getElementById('detailRatio');
    if (ratioEl) ratioEl.innerText = (item.blogCountUnavailable || !Number.isFinite(Number(item.ratio))) ? '-' : Number(item.ratio).toFixed(2);

    var goldenScore = 0;
    var comment = '';
    var r = item.ratio || 0;
    if (r >= 50) {
      goldenScore = Math.min(99, Math.round(85 + (r - 50) * 0.2));
      comment = '🏆 <b>초대형 황금 키워드 발견!</b> 경쟁 블로그가 조회수 대비 극소수입니다. 지금 글을 작성하시면 1페이지 상단 노출 및 엄청난 유입을 기대할 수 있습니다.';
    } else if (r >= 5) {
      goldenScore = Math.round(75 + (r - 5) * 0.5);
      comment = '🔥 <b>매우 우수한 황금 키워드입니다.</b> 경쟁 강도가 매우 낮아 제목과 본문 구성에 조금만 신경 쓰면 손쉽게 상위 노출이 가능합니다.';
    } else if (r >= 1) {
      goldenScore = Math.round(55 + (r - 1) * 3);
      comment = '⚡ <b>경쟁해볼 만한 유망 키워드입니다.</b> 정보성 콘텐츠 작성 시 꾸준한 유입을 노려볼 수 있습니다.';
    } else {
      goldenScore = Math.max(10, Math.round(r * 20));
      comment = '⚠️ <b>경쟁이 치열한 키워드입니다.</b> 단독 글보다는 세부 연관 황금키워드와 조합하여 작성하는 것을 추천합니다.';
    }

    var scoreEl = document.getElementById('detailScore');
    if (scoreEl) scoreEl.innerText = goldenScore;

    var commentEl = document.getElementById('detailComment');
    if (commentEl) commentEl.innerHTML = comment;
  }

  /* ---------- CSV 다운로드 ---------- */
  window.exportCSV = function (tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var csv = [];
    var rows = table.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
      var row = [], cols = rows[i].querySelectorAll('td, th');
      for (var j = 0; j < cols.length; j++) {
        var text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').trim();
        row.push('"' + text.replace(/"/g, '""') + '"');
      }
      if (row.length > 0) csv.push(row.join(','));
    }
    if (csv.length <= 1) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }
    var csvContent = '\uFEFF' + csv.join('\n');
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    var d = new Date();
    var dateStr = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    link.setAttribute('download', '키워드분석_' + dateStr + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ---------- 메인 키워드 분석 진입점 ---------- */
  window.runMainKeywordAnalysis = function (customKw) {
    var input = document.getElementById('sbLandInput');
    var kw = safeText(customKw || (input ? input.value : '')).trim();
    if (!kw) {
      alert('분석할 키워드를 입력해 주세요.');
      if (input) input.focus();
      return;
    }

    if (input) input.value = kw;
    pushHist(kw);
    renderHist();

    loadReport(kw);
    startKeywordAnalysis(kw);
  };

  window.runAnalyze = window.runMainKeywordAnalysis;

  /* ---------- 초기화 및 자동 실행 ---------- */
  function init() {
    renderHist();

    // 초기 검색 자동 실행 (나는솔로)
    setTimeout(function () {
      var input = document.getElementById('sbLandInput');
      if (input && !input.value) input.value = '나는솔로';
      window.runMainKeywordAnalysis('나는솔로');
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
