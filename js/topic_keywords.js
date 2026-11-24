/**
 * 12. 주제별 키워드 탭 (키워드센터)
 * 데이터: data/topic_keywords_data.js (scripts/collect_topic_keywords.js 가 매일 생성)
 * 화면 : 대분류 → 32개 주제 칩(추천 수) → 오늘 추천 키워드 카드(지표 · 추천 이유 · 글 작성 설계)
 */
(function () {
  'use strict';

  const STORE_KEY = 'tk_topic_state_v1';
  const state = loadState();

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return { group: typeof s.group === 'number' ? s.group : -1, seq: s.seq || null };
    } catch (_) { return { group: -1, seq: null }; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* 저장 불가 */ }
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  const fmt = v => (v == null || Number.isNaN(Number(v)) ? '-' : Number(v).toLocaleString('ko-KR'));
  const ratioText = v => (v == null ? '-' : Number(v).toFixed(4));

  function copyText(text, button) {
    const done = () => {
      const old = button.textContent;
      button.textContent = '복사됨';
      button.classList.add('tk-copied');
      setTimeout(() => { button.textContent = old; button.classList.remove('tk-copied'); }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) { /* 무시 */ }
      ta.remove(); done();
    }
  }

  // 검색 의도별 글 작성 설계 (제목 3 · 필수 캡처 3 · 본문 구조 3)
  const PLANS = {
    refund: {
      titles: k => [`${k} 방법 총정리: 환불 가능 기간과 금액 기준`, `${k} 앱·PC 단계별 따라하기`, `${k} 실제로 해보니 놓치기 쉬운 3가지`],
      captures: ['예약·구매 내역 메뉴 위치', '취소·환불 버튼이 있는 화면', '처리 완료·환불 안내 화면'],
      body: k => [`1단계 결론: ${k} 핵심 답을 첫 문단 3줄로 먼저 제시`, '2단계 비교표: 시점별 환불 금액·수수료 비교표', '3단계 FAQ: 자주 묻는 질문 3개로 마무리']
    },
    apply: {
      titles: k => [`${k} 방법 총정리: 대상·준비물·기간 한 번에`, `${k} 온라인으로 단계별 따라하기`, `${k} 직접 해보니 헷갈렸던 3가지`],
      captures: ['신청·예약 페이지 첫 화면', '정보 입력·서류 첨부 화면', '완료·접수 확인 화면'],
      body: k => [`1단계 결론: ${k} 대상과 기간을 첫 문단 3줄로 먼저 제시`, '2단계 정리표: 대상·금액·준비물 한눈에 보기', '3단계 FAQ: 자주 묻는 질문 3개로 마무리']
    },
    schedule: {
      titles: k => [`${k} 한눈에 정리: 날짜·접수 기간·발표일`, `${k} 놓치지 않는 준비 순서`, `${k} 지난번과 달라진 점 3가지`],
      captures: ['공식 일정 공지 화면', '접수·예약 페이지 화면', '내 일정표로 정리한 이미지'],
      body: k => [`1단계 결론: ${k} 가장 가까운 날짜를 첫 문단에 먼저 제시`, '2단계 일정표: 회차별 접수·시험·발표 날짜 표', '3단계 FAQ: 자주 묻는 질문 3개로 마무리']
    },
    price: {
      titles: k => [`${k} 총정리: 최신 가격·요금 비교`, `${k} 더 싸게 하는 방법 단계별 정리`, `${k} 직접 비교해보니 가장 이득인 선택`],
      captures: ['공식 가격표·요금 안내 화면', '할인·혜택 적용 화면', '결제 직전 최종 금액 화면'],
      body: k => [`1단계 결론: ${k} 가장 이득인 선택을 첫 문단 3줄로 제시`, '2단계 비교표: 옵션별 가격·혜택 비교표', '3단계 FAQ: 자주 묻는 질문 3개로 마무리']
    },
    howto: {
      titles: k => [`${k} 방법 총정리: 처음 해도 실패 없는 순서`, `${k} 준비물부터 마무리까지 단계별`, `${k} 직접 해보니 결과가 달라진 3가지 팁`],
      captures: ['준비물·재료가 보이는 사진', '핵심 과정 중간 단계 사진', '완성·전후 비교 사진'],
      body: k => [`1단계 결론: ${k} 핵심 순서를 첫 문단 3줄로 요약`, '2단계 과정표: 단계별 사진과 주의점 정리', '3단계 FAQ: 실패를 줄이는 질문 3개로 마무리']
    },
    recommend: {
      titles: k => [`${k} TOP 5: 직접 비교한 장단점`, `${k} 고르는 기준 3가지와 상황별 추천`, `${k} 실제로 써보니 만족한 선택`],
      captures: ['후보 제품·서비스를 나란히 놓은 화면', '가격·스펙 확인 화면', '실사용 사진·결과 화면'],
      body: k => [`1단계 결론: ${k} 상황별 추천 1개씩 첫 문단에 제시`, '2단계 비교표: 가격·장점·단점 비교표', '3단계 FAQ: 고르기 전에 묻는 질문 3개로 마무리']
    },
    info: {
      titles: k => [`${k} 총정리: 꼭 알아야 할 핵심만`, `${k} 처음 보는 사람을 위한 단계별 안내`, `${k} 직접 알아보니 의외였던 3가지`],
      captures: ['공식 안내 페이지 화면', '핵심 정보가 보이는 화면', '관련 사이트·앱 화면'],
      body: k => [`1단계 결론: ${k} 핵심 답을 첫 문단 3줄로 먼저 제시`, '2단계 정리표: 핵심 정보 한눈에 보기', '3단계 FAQ: 자주 묻는 질문 3개로 마무리']
    }
  };
  const TITLE_KINDS = [['💡', '정답·해결형 제목'], ['📊', '단계별 가이드형 제목'], ['✍️', '실제경험형 제목']];

  function ensureData(callback) {
    if (window.TOPIC_KEYWORDS_DATA) return callback();
    let script = document.getElementById('lazy-topic-keywords-data');
    if (!script) {
      script = document.createElement('script');
      script.id = 'lazy-topic-keywords-data';
      script.src = 'data/topic_keywords_data.js?v=' + Math.floor(Date.now() / 3600000);
      document.body.appendChild(script);
    }
    script.addEventListener('load', () => callback());
    script.addEventListener('error', () => callback());
  }

  function chip(label, count, on, onClick, cls) {
    const b = el('button', cls + (on ? ' tk-on' : ''));
    b.type = 'button';
    b.append(el('span', '', label));
    if (count != null) b.append(el('span', 'tk-count', String(count)));
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }

  function metric(label, value) {
    const box = el('div', 'tk-metric');
    box.append(el('span', 'tk-metric-label', label), el('strong', 'tk-metric-value', value));
    return box;
  }

  function card(item, idx, topicName) {
    const c = el('article', 'tk-card');
    const head = el('div', 'tk-card-head');
    head.append(el('span', 'tk-num', String(idx + 1)), el('h4', 'tk-kw', item.keyword));
    c.append(head);

    const tags = el('div', 'tk-tags');
    tags.append(el('span', 'tk-tag', item.type || '정보형'));
    const grade = String(item.grade || 'B');
    tags.append(el('span', 'tk-tag tk-grade-' + grade.toLowerCase(), item.type === '연금형' ? `${grade}급 연금` : `${grade}급`));
    c.append(tags);

    const metrics = el('div', 'tk-metrics');
    metrics.append(metric('월 검색량', fmt(item.total)), metric('블로그 문서수', fmt(item.blogCount)), metric('문서·검색 비율', ratioText(item.ratio)));
    c.append(metrics);
    c.append(el('p', 'tk-split', `PC ${fmt(item.pc)} · 모바일 ${fmt(item.mobile)}` + (item.recent30 != null ? ` · 최근 30일 같은 제목 글 ${fmt(item.recent30)}` : '')));

    const reason = el('div', 'tk-reason');
    reason.append(el('strong', '', '추천 이유'), el('p', '', item.reason || `${topicName} 분야에서 꾸준히 찾는 검색`));
    c.append(reason);

    const plan = PLANS[item.intent] || PLANS.info;
    const details = el('details', 'tk-plan');
    details.append(el('summary', '', '글 작성 설계 보기'));
    const inner = el('div', 'tk-plan-body');

    inner.append(el('h5', '', '추천 제목'));
    plan.titles(item.keyword).forEach((title, i) => {
      const row = el('div', 'tk-title-row');
      const text = el('div', 'tk-title-text');
      text.append(el('span', 'tk-title-kind', `${TITLE_KINDS[i][0]} ${TITLE_KINDS[i][1]}`), el('strong', '', title));
      const btn = el('button', 'tk-copy', '복사');
      btn.type = 'button';
      btn.addEventListener('click', () => copyText(title, btn));
      row.append(text, btn);
      inner.append(row);
    });

    inner.append(el('h5', '', '📷 필수 캡처 3장'));
    const cap = el('ol', 'tk-list');
    plan.captures.forEach(t => cap.append(el('li', '', t)));
    inner.append(cap);

    inner.append(el('h5', '', '⏱️ 본문 구조 3단계'));
    const body = el('ol', 'tk-list');
    plan.body(item.keyword).forEach(t => body.append(el('li', '', t)));
    inner.append(body);

    details.append(inner);
    c.append(details);

    const go = el('button', 'tk-analyze', '분석하러가기');
    go.type = 'button';
    go.addEventListener('click', () => {
      if (typeof window.sbOpenInAnalyzer === 'function') window.sbOpenInAnalyzer(item.keyword);
    });
    c.append(go);
    return c;
  }

  function render() {
    const root = document.getElementById('kc-topic-container');
    if (!root) return;
    root.replaceChildren();
    const d = window.TOPIC_KEYWORDS_DATA;

    const wrap = el('section', 'tk-wrap');
    const top = el('div', 'tk-top');
    const titleBox = el('div');
    titleBox.append(el('span', 'tk-eyebrow', 'DAILY TOPIC KEYWORDS'));
    titleBox.append(el('h2', 'tk-title', '📁 12. 주제별 키워드'));
    titleBox.append(el('p', 'tk-desc', '네이버 블로그 32개 주제에서 오늘의 글감을 찾아보세요. 카드를 선택하면 추천 제목·캡처·본문 설계를 볼 수 있습니다.'));
    top.append(titleBox, el('span', 'tk-free', '무료 · 모든 주제 공개'));
    wrap.append(top);

    if (!d || !Array.isArray(d.topics) || !d.topics.length) {
      wrap.append(el('p', 'tk-status', '주제별 키워드를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'));
      root.append(wrap);
      return;
    }

    const withKw = d.topics.filter(t => t.keywords && t.keywords.length).length;
    const updated = d.generatedAt ? new Date(d.generatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '';
    wrap.append(el('div', 'tk-status', `${d.date || ''} · 추천 있는 주제 ${withKw}/${d.topics.length}개` + (updated ? ` · 갱신 ${updated}` : '')));

    const groups = Array.isArray(d.groups) ? d.groups : [];
    if (state.group >= groups.length) state.group = -1;
    const bySeq = new Map(d.topics.map(t => [t.seq, t]));
    const visible = state.group < 0
      ? d.topics
      : groups[state.group].topics.map(t => bySeq.get(t.seq)).filter(Boolean);
    if (!visible.some(t => t.seq === state.seq)) {
      const first = visible.find(t => t.keywords && t.keywords.length) || visible[0];
      state.seq = first ? first.seq : null;
    }

    const groupBar = el('div', 'tk-groups');
    groupBar.append(chip('전체', null, state.group < 0, () => { state.group = -1; saveState(); render(); }, 'tk-group'));
    groups.forEach((g, i) => groupBar.append(chip(g.name, null, state.group === i, () => { state.group = i; state.seq = null; saveState(); render(); }, 'tk-group')));
    wrap.append(groupBar);

    const topicBar = el('div', 'tk-topics');
    visible.forEach(t => {
      const n = (t.keywords || []).length;
      const b = chip(t.name, n, t.seq === state.seq, () => { state.seq = t.seq; saveState(); render(); }, 'tk-topic');
      if (!n) b.disabled = true;
      topicBar.append(b);
    });
    wrap.append(topicBar);

    const topic = bySeq.get(state.seq);
    if (topic) {
      const list = topic.keywords || [];
      wrap.append(el('div', 'tk-crumb', `${topic.group} / ${topic.name} · 오늘 추천 ${list.length}개`));
      const grid = el('div', 'tk-grid');
      list.forEach((k, i) => grid.append(card(k, i, topic.name)));
      if (!list.length) grid.append(el('p', 'tk-status', '이 주제는 오늘 추천할 키워드가 없습니다.'));
      wrap.append(grid);
    }
    root.append(wrap);
  }

  window.renderTopicKeywordsTab = function () {
    const root = document.getElementById('kc-topic-container');
    if (root && !window.TOPIC_KEYWORDS_DATA) root.replaceChildren(el('p', 'tk-status', '주제별 키워드를 불러오는 중입니다...'));
    ensureData(render);
  };
})();
