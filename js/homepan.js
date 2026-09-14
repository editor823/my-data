/**
 * 네이버 모바일 홈판형 글쓰기 반자동 작업대 (homepan.js)
 * - 네이버 홈판(MY피드) 노출 특화 서사 구조 생성
 * - 초강력 후킹 추천 제목 8개 + 실시간 선택 기능
 * - 8~15자 썸네일 카피 문구 5종 + AI 이미지 프롬프트
 * - 모바일 2~3줄 호흡 본문 + 두괄식 팩트 분석 소제목 4개
 * - 스마트블록 타깃 해시태그 8종
 * - 제목/본문/태그 원터치 클립보드 복사 지원
 */

document.addEventListener('DOMContentLoaded', () => {
  const kwInput = document.getElementById('hp-keyword-input');
  const angleInput = document.getElementById('hp-angle-input');
  const toneSelect = document.getElementById('hp-tone-select');
  const rawContentArea = document.getElementById('hp-raw-content');
  const generateBtn = document.getElementById('hp-generate-btn');

  const workspace = document.getElementById('hp-result-workspace');
  const titlesList = document.getElementById('hp-titles-list');
  const thumbCopys = document.getElementById('hp-thumbnail-copys');
  const imgPromptText = document.getElementById('hp-image-prompt-text');
  const articleBody = document.getElementById('hp-article-body');
  const tagsWrap = document.getElementById('hp-tags-wrap');
  const wordCountBadge = document.getElementById('hp-word-count-badge');

  const copyTitleBtn = document.getElementById('hp-copy-title-btn');
  const copyBodyBtn = document.getElementById('hp-copy-body-btn');
  const copyTagsBtn = document.getElementById('hp-copy-tags-btn');

  let currentTitle = '';
  let currentBodyText = '';
  let currentTags = [];

  if (!generateBtn) return;

  generateBtn.addEventListener('click', async () => {
    const keyword = kwInput.value.trim();
    if (!keyword) {
      if (window.showToast) window.showToast('메인 키워드(또는 주제)를 입력해 주세요.', '⚠️');
      kwInput.focus();
      return;
    }

    const angle = angleInput.value.trim();
    const tone = toneSelect ? toneSelect.value : 'curious';
    const rawContent = rawContentArea.value.trim();

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⚡ 네이버 홈판 알고리즘 분석 및 글 생성 중...</span>';

    // 0.6초 부드러운 생성 체감 지연
    await new Promise(r => setTimeout(r, 600));

    try {
      const generated = generateHomepanArticle(keyword, angle, tone, rawContent);
      renderHomepanWorkspace(generated);

      if (window.showToast) {
        window.showToast(`[${keyword}] 홈판형 완성 원고가 생성되었습니다! 스마트에디터에 바로 복사하세요.`);
      }

      workspace.style.display = 'block';
      workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('원고 생성 중 오류가 발생했습니다.', '❌');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '⚡ 네이버 홈판형 완성 원고 1초 생성';
    }
  });

  // 홈판 생성 엔진
  function generateHomepanArticle(kw, angle, tone, raw) {
    const snippet = raw ? raw.slice(0, 300) : `${kw} 관련 핵심 팩트와 최신 동향을 온전히 분석한 기준`;

    // 추천 제목 8개 (홈판 후킹 공식 적용)
    const titles = [
      `"${kw}" 결국 터졌다… 다들 모르고 지나쳤던 진짜 속사정 (추천)`,
      `오늘부터 달라진 ${kw}, 모르면 나만 손해 보는 결정적 이유`,
      `${kw} 논란에 직접 알아본 팩트 3가지… 생각보다 심각합니다`,
      `주변에서 왜 난리인가 했더니… ${kw} 핵심 요약 한눈에 보기`,
      `아직도 ${kw} 헷갈리시나요? 이것만 확인하면 깔끔하게 끝납니다`,
      `전문가들도 말 아끼던 ${kw}, 알고 보면 이런 맹점이 숨어있었네요`,
      `단 3분 만에 정리하는 ${kw} 실전 가이드와 주의사항`,
      `이번에 새로 나온 ${kw} 공식 발표, 절대 놓쳐선 안 될 체크리스트`
    ];

    // 썸네일 카피 문구 5종 (8~15자 내외)
    const thumbnails = [
      `"${kw} 충격 발표"\n지금 바로 확인하세요`,
      `모르면 무조건 손해!\n${kw} 핵심 3가지`,
      `다들 속고 있었습니다\n${kw} 숨은 진실`,
      `오늘부터 적용되는\n${kw} 필수 변경점`,
      `3분 만에 끝내는\n${kw} 완벽 핵심 요약`
    ];

    // 미드저니/챗GPT용 이미지 프롬프트
    const imgPrompt = `Realistic Korean lifestyle photograph representing ${kw}, subject placed centered with dramatic contrast, clear clean background, 16:9 aspect ratio, cinematic lighting, ultra-high resolution, no text, no watermark.`;

    // 본문 원고 (모바일 가독성 2~3줄 호흡 + 두괄식 소제목 4개)
    const article = `# ${titles[0].replace(' (추천)', '')}

최근 곳곳에서 "${kw}" 관련 소식이 전해지며 관심이 뜨겁게 달아오르고 있습니다.

단순한 일회성 이슈로 넘기기에는 우리 일상과 지출에 미치는 영향이 적지 않기 때문인데요.
${angle ? `특히 ${angle} 부분은 지금 당장 확인하지 않으면 불이익을 당할 수 있는 핵심 지점입니다.` : '많은 분들이 정작 가장 중요한 핵심 팩트를 놓치고 있는 상황입니다.'}

바쁘신 분들을 위해 복잡한 사족은 모두 걷어내고, 지금 당장 꼭 알아야 할 팩트와 대응 요령을 알기 쉽게 짚어보겠습니다.


■ ${kw} 핵심 한눈에 보기
- 대상 및 기준: 공식 발표 자료 기준 대상 요건 엄격 적용
- 주요 변수: 서류 접수 시점 및 예외 조항 사전 확인 필수
- 주의 사항: 확인되지 않은 루머나 이전 차수 기준 혼동 금지


## 1. 도대체 무슨 일일까? 이번 논란의 시작점

가장 먼저 짚어봐야 할 부분은 이번 이슈가 불거진 근본적인 배경입니다.

${raw ? snippet : `${kw}에 대한 수요와 관심이 급증하면서 기존 제도나 기준과의 괴리가 수면 위로 드러나기 시작했습니다.`}

단순히 소문만 믿고 가볍게 넘겼다가는 예기치 못한 착오나 불이익을 겪을 수 있어, 반드시 1차 공식 공고문의 세부 규정을 교차 검증해야 합니다.


## 2. 놓치기 쉬운 맹점: 대부분 간과하는 핵심 변수

많은 분들이 표면적인 숫자나 일정만 보고 넘어가지만, 실제 실무 적용 시 가장 빈번하게 반려되는 기준이 따로 있습니다.

첫째로 세부 자격 요건의 충족 시점입니다. 발표일 기준인지, 아니면 실제 접수일 기준인지에 따라 결과가 완전히 갈릴 수 있습니다.

둘째는 중도 변경에 따른 예외 규정입니다. 예상치 못한 상황이 발생했을 때 구제받을 수 있는 기준을 미리 숙지해 두지 않으면 기회를 놓치게 됩니다.


## 3. 남들은 어떻게 대처하고 있을까? 현명한 선택 기준

이미 소식을 발 빠르게 접한 분들은 본인에게 유리한 방향으로 사전 준비를 마치고 있습니다.

무리하게 서두르기보다는 본인의 상황에 맞는 최선의 시나리오를 점검하고, 필요한 서류나 증빙자료를 미리 구비해 두는 것이 안전합니다.

전문 기관이나 공식 문의처를 통해 1:1로 유권해석을 받아두는 것도 실패 확률을 0%로 줄이는 꿀팁입니다.


## 4. 마지막으로 꼭 기억해야 할 3줄 요약

이번 ${kw} 이슈는 준비된 사람에게는 분명한 기회가 될 수 있지만, 안일하게 대처하면 불필요한 비용과 시간을 낭비하게 됩니다.

1. 공식 발표 기준일과 세부 요건을 한 번 더 정밀 대조하세요.
2. 신청 및 접수 마감 시간을 캘린더에 반드시 메모하고 알람을 설정하세요.
3. 확인되지 않은 온라인 카더라에 휩쓸리지 말고 공식 채널 공지를 신뢰하세요.

작은 팩트 하나가 큰 결과의 차이를 만듭니다. 오늘 정리해 드린 내용을 토대로 현명하게 판단하시길 바랍니다.`;

    // 해시태그 8종
    const cleanKw = kw.replace(/\s+/g, '');
    const tags = [
      `#${cleanKw}`,
      `#${cleanKw}정보`,
      `#${cleanKw}후기`,
      `#${cleanKw}조건`,
      `#${cleanKw}신청방법`,
      `#생활꿀팁`,
      `#네이버홈판`,
      `#이슈정보`
    ];

    return {
      titles: titles,
      selectedTitle: titles[0].replace(' (추천)', ''),
      thumbnails: thumbnails,
      imgPrompt: imgPrompt,
      articleText: article,
      tags: tags
    };
  }

  // 작업대 렌더링
  function renderHomepanWorkspace(data) {
    currentTitle = data.selectedTitle;
    currentBodyText = data.articleText;
    currentTags = data.tags;

    // 1. 추천 제목 렌더링 (클릭 시 활성화 및 복사)
    titlesList.innerHTML = '';
    data.titles.forEach((t, i) => {
      const cleanT = t.replace(' (추천)', '');
      const item = document.createElement('div');
      item.className = `hp-title-item ${i === 0 ? 'selected' : ''}`;
      item.innerHTML = `
        <span style="font-weight: 800; color: #f59e0b;">${i + 1}.</span>
        <span style="flex: 1;">${escapeHtml(t)}</span>
        <span style="font-size: 0.72rem; color: var(--text-muted);">클릭 복사</span>
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('.hp-title-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        currentTitle = cleanT;

        copyToClipboard(cleanT, `제목 '${cleanT}'(이)가 복사되었습니다!`);
      });

      titlesList.appendChild(item);
    });

    // 2. 썸네일 카피 5종
    thumbCopys.innerHTML = '';
    data.thumbnails.forEach((c) => {
      const pill = document.createElement('div');
      pill.className = 'hp-copy-pill';
      pill.innerHTML = `
        <span style="white-space: pre-line;">${escapeHtml(c)}</span>
        <span style="font-size: 0.75rem; color: var(--text-sub);">복사</span>
      `;
      pill.addEventListener('click', () => {
        copyToClipboard(c.replace('\n', ' '), '썸네일 문구가 복사되었습니다!');
      });
      thumbCopys.appendChild(pill);
    });

    // 이미지 프롬프트
    if (imgPromptText) {
      imgPromptText.value = data.imgPrompt;
    }

    // 3. 본문 텍스트 렌더링
    if (articleBody) {
      articleBody.textContent = data.articleText;
    }
    if (wordCountBadge) {
      wordCountBadge.textContent = `공백 포함 약 ${data.articleText.length.toLocaleString()}자`;
    }

    // 4. 태그 렌더링
    tagsWrap.innerHTML = '';
    data.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'hp-tag-chip';
      chip.textContent = tag;
      chip.addEventListener('click', () => {
        copyToClipboard(tag, `${tag} 태그가 복사되었습니다!`);
      });
      tagsWrap.appendChild(chip);
    });
  }

  // 상단 일괄 복사 버튼 바 이벤트
  if (copyTitleBtn) {
    copyTitleBtn.addEventListener('click', () => {
      if (!currentTitle) return;
      copyToClipboard(currentTitle, `제목 [${currentTitle}]이(가) 복사되었습니다!`);
    });
  }

  if (copyBodyBtn) {
    copyBodyBtn.addEventListener('click', () => {
      if (!currentBodyText) return;
      copyToClipboard(currentBodyText, '본문 전체가 복사되었습니다! 스마트에디터에 바로 붙여넣으세요.');
    });
  }

  if (copyTagsBtn) {
    copyTagsBtn.addEventListener('click', () => {
      if (!currentTags.length) return;
      copyToClipboard(currentTags.join(' '), '해시태그 전체가 복사되었습니다!');
    });
  }

  window.copyHpTags = function() {
    if (!currentTags.length) return;
    copyToClipboard(currentTags.join(' '), '해시태그 전체가 복사되었습니다!');
  };

  function copyToClipboard(text, msg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast(msg);
      }).catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (window.showToast) window.showToast(msg);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[s]));
  }
});
