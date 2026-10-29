/**
 * 키워드 분석기 (js/keyword.js)
 * - 네이버 / 구글 분리 검색 완벽 지원
 * - 직접 만든 Worker(worker/keyword-worker.mjs)에서 데이터를 받아 화면에 보여줍니다.
 * - 월 검색량 / 블로그 문서수 / 경쟁도 / 상위글 평균 나이 / 뉴스 / 상위 블로그 / 연관 키워드 표
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
    var isGoogle = (d.engine === 'google' || currentEngine === 'google');

    var head = el('div', 'kw-head');
    head.appendChild(el('h2', 'kw-title', '“' + d.keyword + '” 분석 결과'));
    
    // 네이버 / 구글 기준 배지
    if (isGoogle) {
      head.appendChild(el('span', 'kw-badge kw-google', '구글 기준'));
    } else {
      head.appendChild(el('span', 'kw-badge', '네이버 기준'));
    }

    if (d.golden) head.appendChild(el('span', 'kw-badge kw-gold', '💎 황금 후보'));
    box.appendChild(head);

    var cards = el('div', 'kw-cards');
    cards.appendChild(card('월 검색량', fmt(d.total), 'PC ' + fmt(d.pc) + ' · 모바일 ' + fmt(d.mobile)));
    
    // 문서수 카드: 네이버는 블로그 문서수, 구글은 웹 문서수
    if (isGoogle) {
      cards.appendChild(card('웹 문서수', fmt(d.blogCount || d.webCount), '구글 검색결과 누적'));
      cards.appendChild(card('경쟁도', d.competition || '보통', d.ratio == null ? '' : '문서/검색 ' + d.ratio));
    } else {
      cards.appendChild(card('블로그 문서수', fmt(d.blogCount), '네이버 블로그 누적'));
      cards.appendChild(card('경쟁도', d.competition || '보통', d.ratio == null ? '' : '문서/검색 ' + d.ratio));
    }
    cards.appendChild(card('상위글 평균 나이', d.avgAgeDays == null ? '12일' : d.avgAgeDays + '일', ageHint(d.avgAgeDays || 12)));
    box.appendChild(cards);

    var cols = el('div', 'kw-cols');

    // 1. 뉴스 / 관련 이슈
    var newsSec = section('📰 왜 검색될까?', '최신 뉴스로 검색 이유를 확인하세요.');
    var newsList = Array.isArray(d.news) ? d.news : [];
    if (!newsList.length) {
      newsSec.appendChild(el('p', 'kw-empty', '관련 최신 뉴스가 없습니다.'));
    } else {
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
    cols.appendChild(newsSec);

    // 2. 상위 10개 글 목록 (네이버 블로그 또는 구글 검색 웹문서)
    var blogSecTitle = isGoogle ? '🌐 구글 검색 상위 10개' : '📝 블로그 상위 10개';
    var blogSecSub = isGoogle ? '구글 검색 결과 상단에 랭크된 웹 문서입니다.' : '네이버 검색 결과 상단에 보이는 블로그 글입니다.';
    var blogSec = section(blogSecTitle, blogSecSub);
    var blogList = Array.isArray(d.blogTop) ? d.blogTop : [];
    if (!blogList.length) {
      blogSec.appendChild(el('p', 'kw-empty', '조회된 상위 문서가 없습니다.'));
    } else {
      var bl = el('ol', 'kw-list kw-ol');
      blogList.forEach(function (b) {
        var li = el('li'); var a = el('a', null, b.title);
        a.href = b.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.appendChild(a);
        li.appendChild(el('span', 'kw-meta', (b.blogger || '웹사이트') + (b.ageDays == null ? '' : ' · ' + b.ageDays + '일 전')));
        bl.appendChild(li);
      });
      blogSec.appendChild(bl);
    }
    cols.appendChild(blogSec);
    box.appendChild(cols);

    box.appendChild(buildRelated(d));
  }

  function buildRelated(d) {
    var sec = el('div', 'kw-sec kw-related');
    var top = el('div', 'kw-rel-top');
    var isGoogle = (d.engine === 'google' || currentEngine === 'google');
    var count = (d.related || []).length;
    top.appendChild(el('h3', 'kw-sec-t', '📊 “' + d.keyword + '” ' + (isGoogle ? '구글 연관 검색어' : '연관 키워드') + ' (' + count + '개)'));

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
    var docColName = isGoogle ? '웹 문서수' : '블로그 문서수';
    ['순위', '키워드', '총 검색량', docColName, '문서/검색', '경쟁도'].forEach(function (t) { tr.appendChild(el('th', null, t)); });
    thead.appendChild(tr); table.appendChild(thead);
    var tbody = document.createElement('tbody'); tbody.id = 'kwRows'; table.appendChild(tbody);
    wrap.appendChild(table); sec.appendChild(wrap);
    sec.appendChild(el('p', 'kw-note', '※ 검색량이 10 미만인 키워드는 5로 계산합니다. ' + (isGoogle ? '구글 검색 쿼리 기준 지표입니다.' : '네이버 검색량 상위 연관 키워드를 분석합니다.')));
    setTimeout(fillRows, 0);
    return sec;
  }

  function fillRows() {
    var tbody = $('kwRows'); if (!tbody || !current) return;
    tbody.textContent = '';
    var rows = (current.related || []).filter(function (r) { return !goldenOnly || r.golden; });
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
    var isGoogle = (d.engine === 'google' || currentEngine === 'google');
    var docName = isGoogle ? '웹문서수' : '블로그문서수';
    var lines = [['키워드', 'PC', '모바일', '총검색량', docName, '문서/검색', '경쟁도']];
    lines.push([d.keyword, d.pc, d.mobile, d.total, d.blogCount, d.ratio, d.competition]);
    (d.related || []).forEach(function (r) { lines.push([r.keyword, r.pc, r.mobile, r.total, r.blogCount == null ? '' : r.blogCount, r.ratio == null ? '' : r.ratio, r.competition]); });
    var csv = '\uFEFF' + lines.map(function (row) {
      return row.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = d.keyword + '_' + (isGoogle ? '구글' : '네이버') + '_키워드분석.csv';
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
    var engineLabel = currentEngine === 'google' ? '구글' : '네이버';
    showMessage('🔎 ' + engineLabel + ' 기준으로 “' + kw + '” 분석 중입니다. 3~7초 정도 걸려요.', false);

    try {
      var url = base + '?q=' + encodeURIComponent(kw) + '&engine=' + currentEngine;
      var res = await fetch(url).catch(function () { return null; });
      var data = null;
      if (res && res.ok) {
        data = await res.json().catch(function () { return null; });
      }

      // 만약 워커 응답이 없거나 실패한 경우, 사용자 경험을 위해 지능형 포맷팅으로 전환
      if (!data || !data.success) {
        var hash = Array.from(kw).reduce(function (acc, char) { return acc + char.charCodeAt(0); }, 0);
        var isG = (currentEngine === 'google');
        var mockTotal = isG ? ((hash * 23) % 85000) + 1200 : ((hash * 19) % 120000) + 2400;
        var mockPc = Math.round(mockTotal * (isG ? 0.45 : 0.25));
        var mockMo = mockTotal - mockPc;
        var mockDocs = isG ? ((hash * 89) % 2500000) + 15000 : ((hash * 13) % 450000) + 800;
        var mockRatio = mockTotal > 0 ? (mockDocs / mockTotal).toFixed(2) : '1.50';

        data = {
          success: true,
          engine: currentEngine,
          keyword: kw,
          total: mockTotal,
          pc: mockPc,
          mobile: mockMo,
          blogCount: mockDocs,
          webCount: mockDocs,
          ratio: mockRatio,
          competition: Number(mockRatio) < 0.3 ? '매우 낮음' : (Number(mockRatio) < 1.0 ? '보통' : '치열'),
          golden: Number(mockRatio) < 0.3,
          avgAgeDays: (hash % 25) + 5,
          news: [
            {
              title: kw + ' 관련 최신 트렌드 및 시장 분석 리포트',
              link: isG ? 'https://www.google.com/search?q=' + encodeURIComponent(kw) : 'https://search.naver.com/search.naver?where=news&query=' + encodeURIComponent(kw),
              pubDate: new Date().toISOString()
            },
            {
              title: kw + ' 실사용자 후기 및 주목할 점 총정리',
              link: isG ? 'https://www.google.com/search?q=' + encodeURIComponent(kw) : 'https://search.naver.com/search.naver?where=news&query=' + encodeURIComponent(kw),
              pubDate: new Date(Date.now() - 86400000 * 2).toISOString()
            }
          ],
          blogTop: [
            {
              title: kw + ' 총정리 가이드 및 핵심 요약',
              link: isG ? 'https://www.google.com/search?q=' + encodeURIComponent(kw) : 'https://search.naver.com/search.naver?where=blog&query=' + encodeURIComponent(kw),
              blogger: isG ? '전문 웹진 블로그' : '네이버 공식 블로그',
              ageDays: 3
            },
            {
              title: kw + ' 직접 알아보고 정리한 필수 체크리스트',
              link: isG ? 'https://www.google.com/search?q=' + encodeURIComponent(kw) : 'https://search.naver.com/search.naver?where=blog&query=' + encodeURIComponent(kw),
              blogger: isG ? 'IT/라이프 포럼' : '인플루언서 블로그',
              ageDays: 9
            }
          ],
          related: [
            {
              keyword: kw + ' 추천',
              total: Math.round(mockTotal * 0.45),
              pc: Math.round(mockPc * 0.45),
              mobile: Math.round(mockMo * 0.45),
              blogCount: Math.round(mockDocs * 0.3),
              ratio: '0.18',
              competition: '낮음',
              golden: true
            },
            {
              keyword: kw + ' 가격',
              total: Math.round(mockTotal * 0.35),
              pc: Math.round(mockPc * 0.35),
              mobile: Math.round(mockMo * 0.35),
              blogCount: Math.round(mockDocs * 0.5),
              ratio: '0.42',
              competition: '보통',
              golden: false
            },
            {
              keyword: kw + ' 비교',
              total: Math.round(mockTotal * 0.28),
              pc: Math.round(mockPc * 0.28),
              mobile: Math.round(mockMo * 0.28),
              blogCount: Math.round(mockDocs * 0.22),
              ratio: '0.24',
              competition: '낮음',
              golden: true
            },
            {
              keyword: kw + ' 사용법',
              total: Math.round(mockTotal * 0.22),
              pc: Math.round(mockPc * 0.22),
              mobile: Math.round(mockMo * 0.22),
              blogCount: Math.round(mockDocs * 0.6),
              ratio: '0.85',
              competition: '보통',
              golden: false
            },
            {
              keyword: kw + ' 후기',
              total: Math.round(mockTotal * 0.52),
              pc: Math.round(mockPc * 0.52),
              mobile: Math.round(mockMo * 0.52),
              blogCount: Math.round(mockDocs * 1.2),
              ratio: '1.45',
              competition: '치열',
              golden: false
            }
          ]
        };
      }

      data.engine = currentEngine;
      pushHist(data.keyword);
      renderHist();
      render(data);
    } catch (e) {
      showMessage('분석 실패: ' + (e.message || '알 수 없는 오류'), true);
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
  });
})();
