/**
 * 거미줄치기 키워드 생성 (js/spider.js)
 * - 메인 키워드 → B 계정(검색창 연관 검색어) / C 계정(지식iN 질문) / 예비
 * - 데이터: Worker /api/spider (worker/spider-core.mjs), 로컬에서는 server.js /api/spider
 * - 추천 묶음: data/spider_bundles.js (window.SPIDER_BUNDLES, 사흘마다 자동 갱신)
 */
(function () {
  'use strict';

  var WORKER_URL = 'https://moneyt-keyword.tkdgus8231.workers.dev';
  var HIST_KEY = 'spider_history_v1';
  var DONE_KEY = 'spider_done_v1';

  function apiUrl(q) {
    var h = location.hostname;
    var base = (h === 'localhost' || h === '127.0.0.1') ? '' : WORKER_URL;
    return base + '/api/spider?q=' + encodeURIComponent(q);
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

  /* ---------- 사용 기록 ---------- */

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

  /* ---------- 텍스트 만들기 ---------- */

  function allItems(d) { return d.b.concat(d.c, d.spare); }

  function guideText(d) {
    return [
      '메인 키워드: ' + d.keyword,
      '반드시 포함할 내용(각각 소제목으로): ' + allItems(d).map(function (x) { return x.keyword; }).join(', '),
      '주의: 금액·날짜·조건은 지어내지 말고 공식 발표에서 확인한 내용만 쓰기',
    ].join('\n');
  }

  function itemLine(x) {
    return x.keyword + (x.source === 'kin' && x.link ? '  (질문: ' + x.question + ' ' + x.link + ')' : '');
  }

  function setText(d) {
    var part = function (title, list) {
      return '[' + title + ']\n' + (list.length ? list.map(function (x) { return '- ' + itemLine(x); }).join('\n') : '- (없음)');
    };
    return [
      '■ 메인 글 · A 계정: ' + d.keyword,
      '',
      part('B 계정 · 연관 검색어', d.b),
      '',
      part('C 계정 · 지식iN 질문', d.c),
      '',
      part('예비', d.spare),
      '',
      '※ 한 계정에는 3~4개까지만, 날짜를 나눠 올리고, 메인 글 링크는 글 하나에 1개만.',
    ].join('\n');
  }

  /* ---------- 결과 그리기 ---------- */

  var SRC_LABEL = { naver: '네이버', google: '구글', kin: '지식iN' };
  var current = null;

  function itemHtml(x) {
    var q = x.source === 'kin' && x.link
      ? '<a class="sp-q" href="' + esc(x.link) + '" target="_blank" rel="noopener noreferrer" title="' + esc(x.question) + '">질문 보기 ↗</a>'
      : '';
    return '<li class="sp-item"><button type="button" class="sp-kw" data-copy="' + esc(x.keyword) + '" title="눌러서 복사">' + esc(x.keyword)
      + '<span class="sp-src ' + esc(x.source) + '">' + esc(SRC_LABEL[x.source] || '') + '</span></button>' + q + '</li>';
  }

  function colHtml(id, title, list) {
    return '<div class="sp-col"><div class="sp-col-head"><span class="sp-col-t">' + title + ' <small>· ' + list.length + '개</small></span>'
      + '<button type="button" class="sp-pill" data-col="' + id + '">복사</button></div>'
      + (list.length ? '<ul class="sp-items">' + list.map(itemHtml).join('') + '</ul>' : '<div class="sp-empty">가져온 키워드가 없습니다.</div>')
      + '</div>';
  }

  function renderSet(d, opts) {
    opts = opts || {};
    current = d;
    var total = allItems(d).length;
    var kinN = allItems(d).filter(function (x) { return x.source === 'kin'; }).length;
    var when = d.generatedAt ? new Date(d.generatedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    var done = isDone(d.keyword);
    var news = (opts.news || []).length
      ? '<ul class="sp-news">' + opts.news.map(function (n) {
        return '<li>📰 <a href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">' + esc(n.title) + '</a>' + (n.source ? ' · ' + esc(n.source) : '') + '</li>';
      }).join('') + '</ul>'
      : '';

    $('spResult').innerHTML =
      '<div class="sp-set">'
      + '<div class="sp-set-head"><h3 class="sp-set-kw">' + esc(d.keyword) + '</h3>'
      + '<button type="button" class="sp-pill" data-act="main">메인 키워드 복사</button>'
      + '<button type="button" class="sp-pill' + (done ? ' on' : '') + '" data-act="done">' + (done ? '✓ 썼어요' : '썼어요') + '</button>'
      + '<span class="sp-badge">메인 글 · A 계정</span></div>'
      + '<p class="sp-set-sum">연결 글 키워드 ' + total + '개 · 지식iN 질문에서 ' + kinN + '개'
      + (when ? '<span class="sp-fresh">' + (opts.fromBundle ? '추천 묶음 생성 ' : '가져온 시각 ') + esc(when) + '</span>' : '') + '</p>'
      + news
      + '<div class="sp-guide"><div class="sp-guide-head"><span class="sp-guide-t">A 계정 글 가이드 · 글쓰기 프롬프트에 붙여 넣기</span>'
      + '<button type="button" class="sp-pill" data-act="guide">가이드 복사</button></div><pre>' + esc(guideText(d)) + '</pre></div>'
      + '<div class="sp-cols">'
      + colHtml('b', 'B 계정 (연관 검색어)', d.b)
      + colHtml('c', 'C 계정 (지식iN 질문)', d.c)
      + colHtml('spare', '예비 (남는 것)', d.spare)
      + '</div>'
      + '<div class="sp-actions">'
      + '<button type="button" class="sp-btn primary" data-act="analyze">메인 키워드 분석하러가기</button>'
      + '<button type="button" class="sp-btn" data-act="all">세트 전체 복사</button>'
      + (opts.fromBundle ? '<button type="button" class="sp-btn" data-act="refresh">지금 기준으로 새로 뽑기</button>' : '')
      + '</div></div>';
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
    msg('검색창 연관 검색어와 지식iN 질문을 모으고 있어요. (5~10초)');
    fetch(apiUrl(kw), { signal: AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined })
      .then(function (r) { return r.json().catch(function () { throw new Error('서버 응답을 읽지 못했습니다. (' + r.status + ')'); }); })
      .then(function (d) {
        if (!d.success) throw new Error(d.error || '키워드를 가져오지 못했습니다.');
        if (!allItems(d).length) throw new Error('연결 키워드를 찾지 못했습니다. 조금 더 넓은 키워드로 다시 넣어 보세요.');
        pushHistory(d.keyword);
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

  function fmtVol(v) {
    if (v == null) return '';
    return v >= 10000 ? (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '만' : v.toLocaleString('ko-KR');
  }

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
    renderSet({ keyword: t.keyword, b: t.b || [], c: t.c || [], spare: t.spare || [], generatedAt: data.generatedAt }, { fromBundle: true, news: t.news });
    markRecActive(idx);
    $('spResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    var col = el.getAttribute('data-col');
    if (col) {
      var list = d[col] || [];
      copy(list.map(function (x) { return x.keyword; }).join('\n'), list.length + '개 복사');
      return;
    }
    switch (el.getAttribute('data-act')) {
      case 'main': copy(d.keyword, '메인 키워드 복사'); break;
      case 'guide': copy(guideText(d), 'A 계정 가이드 복사'); break;
      case 'all': copy(setText(d), '세트 전체 복사'); break;
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
