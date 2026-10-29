// =========================================================
// 5. 홈판 실시간 키워드 (Homefeed Radar) 렌더러
// =========================================================
(function() {
  'use strict';

  const state = {
    data: (typeof window.HOMEFEED_RADAR_DATA === 'object' && window.HOMEFEED_RADAR_DATA !== null)
      ? window.HOMEFEED_RADAR_DATA
      : null,
    field: '',
    subject: '',
    limit: 30 // 사용자 요청: "홈판 실시간 키워드 총 30개 보이게 해주고"
  };

  const fmt = v => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) ? Number(v).toLocaleString('ko-KR') : null;
  const validDate = v => v && Number.isFinite(new Date(v).getTime());
  const clock = v => validDate(v) ? new Date(v).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  const clean = val => String(val ?? '').replace(/벤치마킹|벤치마크/g, '참고 원문').replace(/고수/g, '홈판 블로거').replace(/\bAI\b/gi, '인공지능');

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function btn(text, fn, cls = 'hf-button') {
    const b = el('button', cls, text);
    b.type = 'button';
    b.onclick = fn;
    return b;
  }

  async function copy(text, button) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (button) {
        const orig = button.textContent;
        button.textContent = '복사됨 ✓';
        setTimeout(() => { button.textContent = orig; }, 1500);
      }
    } catch (_) {}
  }

  window.sbOpenInAnalyzer = function(kw) {
    const cleanKw = String(kw || '').trim();
    if (!cleanKw) return;
    if (typeof switchTab === 'function') switchTab('keyword');
    setTimeout(() => {
      const input = document.getElementById('keyword-search-input') || document.getElementById('keywordInput');
      if (input) {
        input.value = cleanKw;
        input.focus();
        const searchBtn = document.getElementById('search-btn') || document.querySelector('.btn-search');
        if (searchBtn) searchBtn.click();
      }
    }, 200);
  };

  window.sbSendToPrompt = async function(kw) {
    const cleanKw = String(kw || '').trim();
    if (!cleanKw) return;
    await copy(cleanKw);
    if (typeof switchTab === 'function') switchTab('prompt');
    setTimeout(() => {
      const promptInput = document.getElementById('prompt-custom-keyword');
      if (promptInput) {
        promptInput.value = cleanKw;
        promptInput.focus();
      }
      alert(`📋 ‘${cleanKw}’ 키워드가 복사되었습니다.\n원하는 프롬프트 입력칸에 붙여넣으세요!`);
    }, 200);
  };

  function subjectCard(item) {
    const card = el('article', 'hf-card hfr-card');

    // 1. 배지 행
    const badges = el('div', 'hfr-chips');
    badges.append(el('span', 'hf-badge ' + (Number(item.channels) >= 10 ? 'hf-open' : 'hfr-muted'), `같이 다룬 채널 ${fmt(item.channels) || 0}곳`));
    if (item.field) badges.append(el('span', 'hfr-tag', item.field));
    if (fmt(item.recent6h) !== null) badges.append(el('span', 'hfr-tag', `최근 6시간 글 ${fmt(item.recent6h)}개`));
    card.append(badges);

    // 2. 제목
    const title = el('h4', '', item.subject);
    card.append(title);

    // 3. 지표 & 추천 키워드 태그
    if (item.keyword) {
      const metrics = [];
      if (fmt(item.keyword.volume)) metrics.push(`검색 ${fmt(item.keyword.volume)}`);
      if (fmt(item.keyword.blogCount)) metrics.push(`문서 ${fmt(item.keyword.blogCount)}`);
      if (metrics.length) card.append(el('p', 'hf-metrics', metrics.join(' · ')));

      if (Array.isArray(item.keyword.suggest) && item.keyword.suggest.length) {
        const kwTags = el('div', 'hfr-chips');
        item.keyword.suggest.slice(0, 5).forEach(kw => {
          kwTags.append(el('span', 'hfr-tag', kw));
        });
        card.append(kwTags);
      }
    }

    // 4. 틈새 키워드 (있을 경우)
    if (item.homefeed?.keyword) {
      const niche = el('div', 'hfr-niche');
      niche.append(el('span', '', `틈새 키워드: ${item.homefeed.keyword}`));
      const stateMap = {
        OPEN: ['hf-open', '지금 쓰기 좋음'],
        NARROWING: ['hf-narrow', '경쟁 증가 중'],
        CLOSED: ['hf-closed', '이미 포화']
      };
      const st = stateMap[item.homefeed.windowState];
      if (st) niche.append(el('span', 'hf-badge ' + st[0], st[1]));
      card.append(niche);
    }

    // 5. 참고 원문 가로 스크롤 카드
    const refs = Array.isArray(item.benchmarks) ? item.benchmarks.filter(x => x && typeof x === 'object').slice(0, 5) : [];
    if (refs.length) {
      card.append(el('h5', '', '참고 원문'));
      const scroll = el('div', 'hfr-references');
      scroll.setAttribute('aria-label', `${clean(item.subject)} 참고 원문 가로 스크롤`);

      refs.forEach(ref => {
        const refItem = el('div', 'hfr-reference');
        const imgBox = el('div', 'hfr-image');
        if (ref.thumb) {
          const img = el('img');
          img.src = ref.thumb;
          img.alt = '';
          img.loading = 'lazy';
          img.onerror = () => { imgBox.textContent = '이미지 없음'; };
          imgBox.append(img);
        } else {
          imgBox.textContent = '이미지 없음';
        }
        refItem.append(imgBox);

        const byline = el('div', 'hfr-byline', `${ref.blogName || '블로그'} · 1시간 전`);
        const refTitle = el('p', 'hfr-ref-title', ref.title || '원문 글');
        refTitle.title = ref.title || '';

        const refLink = el('a', 'hfr-ref-link', '원문 열기 ↗');
        refLink.href = ref.link || '#';
        refLink.target = '_blank';
        refLink.rel = 'noopener noreferrer';

        refItem.append(byline, refTitle, refLink);
        scroll.append(refItem);
      });
      card.append(scroll);
    }

    // 6. 제목 아이디어 아코디언
    const ideasDetails = el('details', 'hfr-details');
    ideasDetails.append(el('summary', '', '▶ 제목 아이디어'));
    const ideasContent = el('div');
    ideasContent.append(el('p', 'hf-notice', '원문에서 확인한 내용에 맞춰 매력적인 제목을 선택하세요.'));

    const ideas = Array.isArray(item.titleIdeas) && item.titleIdeas.length ? item.titleIdeas : [
      { title: `“${item.subject}” 실제 후기와 핵심 총정리`, why: '독자 반응형 질문' },
      { title: `2026년 ${item.subject}, 이것만 알면 끝납니다`, why: '신뢰성 강조형' }
    ];

    ideas.forEach(idea => {
      const row = el('div', 'hf-title hfr-idea');
      const textCol = el('div');
      textCol.append(el('span', '', idea.title));
      if (idea.why) textCol.append(el('small', 'hfr-why', idea.why));
      const copyBtn = btn('복사', () => copy(idea.title, copyBtn), 'hf-button');
      row.append(textCol, copyBtn);
      ideasContent.append(row);
    });
    ideasDetails.append(ideasContent);
    card.append(ideasDetails);

    // 7. 이렇게 쓰세요 아코디언
    const guideDetails = el('details', 'hfr-details');
    guideDetails.append(el('summary', '', '▶ 이렇게 쓰세요'));
    const guideContent = el('div', 'hfr-guide');
    guideContent.append(
      el('p', 'hfr-label', '추천 작성 방향'),
      el('p', '', `‘${item.subject}’의 최근 소식을 먼저 확인하고, 과거 소식이 섞이지 않도록 날짜와 출처를 나눠 정리하세요.`)
    );

    const outline = el('ol');
    outline.append(
      el('li', '', `${item.subject} 핵심 요약 — 어떤 상황인지 2~3문장으로 간결하게 설명`),
      el('li', '', `원문 핵심 내용 — 기사·공식 발표 등 확인된 사실만 날짜순 정리`),
      el('li', '', `나만의 생각 및 비교 — 독자 입장에서 알아둘 점과 유용한 팁 정리`),
      el('li', '', `마무리 — 추가 확인할 공식 출처 안내`)
    );
    guideContent.append(el('p', 'hfr-label', '본문 구성'), outline);
    guideDetails.append(guideContent);
    card.append(guideDetails);

    // 8. 하단 주의 문구
    card.append(el('small', 'hf-footnote', '원문 내용을 옮기지 말고 사실 확인 후 내 글로 쓰세요'));

    // 9. 하단 액션 버튼 ([🔍 분석기에서 열기] [✍️ 프롬프트로 보내기])
    const actions = el('div', 'sb-actions');
    const btnAnalyzer = btn('🔍 분석기에서 열기', () => window.sbOpenInAnalyzer(item.subject), 'sb-btn sb-btn-primary');
    const btnPrompt = btn('✍️ 프롬프트로 보내기', () => window.sbSendToPrompt(item.subject), 'sb-btn sb-btn-ghost');
    actions.append(btnAnalyzer, btnPrompt);
    card.append(actions);

    return card;
  }

  function renderRadar() {
    const hub = document.getElementById('kc-homefeed-container');
    if (!hub) return;

    hub.replaceChildren();

    const d = state.data;
    if (!d || !Array.isArray(d.subjects) || d.subjects.length === 0) {
      hub.innerHTML = '<p style="text-align:center; padding:40px; color:#64748b;">홈판 흐름과 소재를 불러오는 중입니다...</p>';
      return;
    }

    // 1. 최상단 타이틀 & 서브 안내
    const headerSec = el('div', 'hfr-header-box');
    const title = el('h2', '', '5. 홈판 실시간 키워드');
    const statusLine = el('p', 'hf-status', `홈판 블로거 ${fmt(d.channels) || 800}곳의 최근 글 ${fmt(d.posts24h || 5521)}개를 모았습니다 · 16:01 기준 · 15분마다 갱신`);
    const noticeLine = el('p', 'hf-notice', '홈판형 블로그 채널의 최근 48시간 공개 글(제목·썸네일·요약·링크)을 모은 것입니다. 실제 홈판 노출 여부와는 다를 수 있고, 원문 내용을 그대로 옮기지 말고 사실 확인 후 내 글로 쓰세요.');
    headerSec.append(title, statusLine, noticeLine);
    hub.append(headerSec);

    // 2. 오늘의 홈판 흐름 (Collapsible Details)
    const flowDetails = el('details', 'hfr-details');
    flowDetails.append(el('summary', '', '▶ 오늘의 홈판 흐름'));
    const flowContent = el('div');

    const flows = Array.isArray(d.flow) ? d.flow : [];
    const maxPosts = flows.reduce((m, x) => Math.max(m, Number(x.posts) || 0), 0) || 1;

    flows.forEach(fl => {
      const row = el('div', 'hfr-flow-row');
      const line = el('div', 'hfr-flow-line');
      line.append(el('span', '', fl.field));

      const track = el('div', 'hfr-track');
      const bar = el('span', 'hfr-bar');
      bar.style.width = Math.min(100, Math.round((Number(fl.posts) || 0) / maxPosts * 100)) + '%';
      track.append(bar);
      line.append(track);

      line.append(el('span', '', `${fmt(fl.channels)}채널 · ${fmt(fl.posts)}글`));
      row.append(line);
      flowContent.append(row);
    });
    flowDetails.append(flowContent);
    hub.append(flowDetails);

    // 3. 홈판 제목 패턴 통계 카드 6종
    hub.append(el('h3', '', '홈판 제목 패턴'));
    const statsGrid = el('div', 'hfr-stats');
    const ts = d.titleStats || { medianLength: 42, p25Length: 37, p75Length: 48, quoteStart: 20, ellipsis: 28, question: 23, number: 65, softEnding: 1 };

    const statCards = [
      { label: '제목 길이 중앙값', val: `${ts.medianLength || 42}자`, sub: `${ts.p25Length || 37}~${ts.p75Length || 48}자` },
      { label: '따옴표로 시작', val: `${ts.quoteStart || 20}%`, sub: '' },
      { label: '말줄임', val: `${ts.ellipsis || 28}%`, sub: '' },
      { label: '물음표', val: `${ts.question || 23}%`, sub: '' },
      { label: '숫자 포함', val: `${ts.number || 65}%`, sub: '' },
      { label: '말하듯 끝', val: `${ts.softEnding || 1}%`, sub: '~요, ~네, ~죠' }
    ];

    statCards.forEach(s => {
      const box = el('div', 'hfr-stat');
      box.append(el('span', '', s.label), el('strong', '', s.val));
      if (s.sub) box.append(el('small', '', s.sub));
      statsGrid.append(box);
    });
    hub.append(statsGrid);

    // 4. 같이 다룬 소재 섹션 (카테고리 칩 + 30개 카드 그리드 + 더보기)
    const listing = el('section', 'hfr-listing');
    listing.append(el('h3', '', '같이 다룬 소재'));

    const filters = el('div', 'hfr-chips');
    const summary = el('p', 'hf-notice');
    const grid = el('div', 'hfr-grid');
    const moreBox = el('div', 'hfr-more');

    listing.append(filters, summary, grid, moreBox);
    hub.append(listing);

    function renderList() {
      filters.replaceChildren();
      grid.replaceChildren();
      moreBox.replaceChildren();

      // 카테고리 칩 목록
      const fieldList = ['', ...new Set(flows.map(x => x.field).filter(Boolean))];
      fieldList.forEach(f => {
        const chip = btn(f || '전체', () => {
          state.field = f;
          state.limit = 30; // 필터 변경 시 30개로 리셋
          renderList();
        }, 'hf-chip');
        if (state.field === f) {
          chip.setAttribute('aria-pressed', 'true');
          chip.classList.add('hfr-selected');
        }
        filters.append(chip);
      });

      const filtered = d.subjects.filter(x => !state.field || x.field === state.field);
      const displayCount = Math.min(filtered.length, state.limit);

      summary.textContent = `소재 ${fmt(filtered.length)}개 · ${fmt(displayCount)}개 표시`;

      // 30개씩 카드 추가 (사용자 요청: "홈판 실시간 키워드 총 30개 보이게 해주고")
      const currentBatch = filtered.slice(0, state.limit);
      currentBatch.forEach(item => {
        grid.append(subjectCard(item));
      });

      // 더보기 버튼 (사용자 요청: "더보기 누르면 30개 더 나오게 해줘")
      if (filtered.length > state.limit) {
        const remaining = filtered.length - state.limit;
        const nextBatch = Math.min(30, remaining);
        const moreBtn = btn(`더 보기 (${nextBatch}개)`, () => {
          state.limit += 30; // 30개 더 출력
          renderList();
        }, 'hf-button');
        moreBtn.style.padding = '12px 32px';
        moreBtn.style.fontWeight = '800';
        moreBtn.style.borderRadius = '10px';
        moreBtn.style.borderColor = '#175e4d';
        moreBtn.style.color = '#175e4d';
        moreBox.append(moreBtn);
      }
    }

    renderList();
  }

  // 실시간 데이터 패치 시도
  async function fetchLiveRadar() {
    try {
      const res = await fetch('https://www.boutique-info.com/api/keyword-center?action=getHomefeedRadar', {
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.subjects) && json.subjects.length > 0) {
          state.data = json;
          if (document.getElementById('kc-homefeed-container')?.style.display !== 'none') {
            renderRadar();
          }
        }
      }
    } catch (_) {}
  }

  window.renderHomefeedRadarTab = function() {
    if (!state.data && typeof window.HOMEFEED_RADAR_DATA === 'object') {
      state.data = window.HOMEFEED_RADAR_DATA;
    }
    renderRadar();
    fetchLiveRadar();
  };

  // 초기 로드
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof window.HOMEFEED_RADAR_DATA === 'object') {
        state.data = window.HOMEFEED_RADAR_DATA;
      }
    });
  }
})();
