// ========================================================
// THE BOUTIQUE JOURNAL - 블로그 콘텐츠 가이드 실시간 렌더러 & 검색기
// ========================================================
(function() {
  'use strict';

  const blogGuidesData = [
    {
      id: 1,
      date: "2026-09-21",
      category: "키워드 조사",
      title: "최근 30일 발행 문서수: 997건 이상이라는 표시를 읽는 방법",
      summary: "실제 조회 사례로 전체 문서수와 최근 발행 문서수, 최대 1,000개 검색 결과에서 확인한 하한값의 차이를 설명합니다.",
      link: "./posts/recent-30-day-blog-documents.html"
    },
    {
      id: 2,
      date: "2026-09-21",
      category: "키워드 조사",
      title: "검색 관심도 100은 100회가 아닙니다: 30일 그래프 읽기",
      summary: "노트북리퍼샵 조회 사례를 통해 DataLab 상대지수와 월 검색량을 구분하고, 빠진 날짜와 비교 조건을 확인하는 방법입니다.",
      link: "./posts/read-datalab-relative-interest.html"
    },
    {
      id: 3,
      date: "2026-09-21",
      category: "키워드 조사",
      title: "검색량은 나오는데 문서수는 조회 실패? API 오류 확인 순서",
      summary: "실제 401·429 표시 사례를 바탕으로 검색광고와 블로그 검색 인증을 구분하고, 재시도 전 확인할 항목을 정리합니다.",
      link: "./posts/naver-api-error-checklist.html"
    },
    {
      id: 4,
      date: "2026-09-21",
      category: "AI 글쓰기",
      title: "키워드 하나를 글쓰기 요청서로 바꾸는 6칸 작업표",
      summary: "독자·질문·근거·범위·목차·완료 기준을 먼저 정해, 키워드만 넣었을 때 생기는 반복적인 AI 초안을 줄이는 방법입니다.",
      link: "./posts/keyword-prompt-worksheet.html"
    },
    {
      id: 5,
      date: "2026-09-21",
      category: "AI 글쓰기",
      title: "발행 버튼을 누르기 전: 본문·링크·모바일 화면 점검표",
      summary: "실제 문서수와 이미지 비교 글을 기준으로, 근거·링크·대체 텍스트·모바일 표·공개 상태를 점검하는 발행 절차입니다.",
      link: "./posts/before-publish-checklist.html"
    },
    {
      id: 6,
      date: "2026-09-19",
      category: "키워드 조사",
      title: "검색량과 문서수를 함께 읽고 글감을 고르는 방법",
      summary: "청년미래적금의 실제 조회값과 가상 비교표를 구분해 검색량·문서수를 읽고, 근거를 확인해 글감을 좁히는 방법입니다.",
      link: "./posts/keyword-volume-and-document-count.html"
    },
    {
      id: 7,
      date: "2026-09-19",
      category: "시즌 글 기획",
      title: "월별 시즌 키워드를 글 기획과 발행 일정으로 바꾸기",
      summary: "시즌 주제를 대상·질문·시점으로 나누고, 신청 전후에 필요한 내용을 한 글의 목차와 업데이트 계획으로 정리하는 방법입니다.",
      link: "./posts/seasonal-keyword-planning.html"
    },
    {
      id: 8,
      date: "2026-09-19",
      category: "키워드 조사",
      title: "검색량이 많아도 바로 쓰지 말아야 할 키워드",
      summary: "검색 의도 불일치, 일시적 급등, 확인하기 어려운 정보 등 키워드를 보류해야 하는 상황과 대안을 설명합니다.",
      link: "./posts/keywords-to-avoid.html"
    },
    {
      id: 9,
      date: "2026-09-19",
      category: "AI 글쓰기",
      title: "AI 글쓰기 초안의 오류를 확인하고 고치는 순서",
      summary: "AI 초안의 주장·숫자·날짜·출처를 분리하고 원문과 대조해 수정하는 검토표와 발행 전 확인 절차입니다.",
      link: "./posts/ai-draft-verification-workflow.html"
    },
    {
      id: 10,
      date: "2026-09-19",
      category: "이미지 활용",
      title: "이미지 변환 전후 용량과 품질을 비교하는 방법",
      summary: "동일한 시험 이미지의 PNG·WebP·JPG 실제 용량을 비교하고, 원본과 결과 파일로 직접 재현하는 이미지 변환 안내입니다.",
      link: "./posts/image-conversion-comparison.html"
    }
  ];

  let currentCategory = 'all';

  function renderTabGuideCards(list) {
    const grid = document.getElementById('tabGuideCardGrid');
    const countEl = document.getElementById('tabGuideCount');
    if (!grid) return;

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <p style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">검색 결과가 없습니다.</p>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0;">다른 검색어를 입력하시거나 카테고리 필터를 변경해 보세요.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(item => `
      <article onclick="window.location.href='${item.link}'" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.03);" onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 10px 25px -5px rgba(0,0,0,0.06)';" onmouseout="this.style.transform='none'; this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.03)';">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.78rem; font-weight: 600; color: #64748b;">${item.date}</span>
            <span style="font-size: 0.78rem; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 20px;">${item.category}</span>
          </div>
          <h3 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.45; margin: 0 0 10px 0;">
            <a href="${item.link}" onclick="event.stopPropagation();" style="color: inherit; text-decoration: none;">${item.title}</a>
          </h3>
          <p style="font-size: 0.84rem; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
            ${item.summary}
          </p>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 12px; display: flex; justify-content: flex-end;">
          <span style="font-size: 0.82rem; font-weight: 800; color: #059669; display: inline-flex; align-items: center; gap: 4px;">
            읽어보기 ↗
          </span>
        </div>
      </article>
    `).join('');
  }

  function filterTabGuideArticles() {
    const input = document.getElementById('tabGuideSearchInput');
    const keyword = (input ? input.value : '').trim().toLowerCase();

    const filtered = blogGuidesData.filter(item => {
      const matchCategory = currentCategory === 'all' || item.category === currentCategory;
      const matchKeyword = !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword);
      return matchCategory && matchKeyword;
    });

    renderTabGuideCards(filtered);
  }

  function initGuideJournal() {
    // 카테고리 필터 버튼 바인딩
    const buttons = document.querySelectorAll('#tabGuideCategoryButtons .guide-filter-pill');
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        buttons.forEach(b => {
          b.classList.remove('active');
          b.style.background = '#ffffff';
          b.style.color = '#475569';
          b.style.border = '1px solid #e2e8f0';
        });
        this.classList.add('active');
        this.style.background = '#059669';
        this.style.color = '#ffffff';
        this.style.border = 'none';

        currentCategory = this.getAttribute('data-cat');
        filterTabGuideArticles();
      });
    });

    // 검색창 입력 이벤트
    const searchInput = document.getElementById('tabGuideSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', filterTabGuideArticles);
    }

    // 초기 렌더링
    renderTabGuideCards(blogGuidesData);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuideJournal);
  } else {
    initGuideJournal();
  }
})();
