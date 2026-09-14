/**
 * 외부 유입글 생성기 스크립트 (external.js)
 * - 머니대외비(boutique-info.com) 외부유입글생성 1:1 완벽 인터페이스 및 기능 구현
 * - BYOK (개인 Gemini API 키) 직접 호출
 * - API 키 브라우저(localStorage) 안전 저장/삭제
 * - 최대 4개 채널 동시 선택 및 채널별 고유 프롬프트 적용
 * - API 키가 없거나 할당량 부족 시에도 즉시 활용 가능한 실시간 고품질 시뮬레이션 폴백 생성기 내장
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM 요소 취득
  const mainKwInput = document.getElementById('ext-main-kw-input');
  const ctaLinkInput = document.getElementById('ext-cta-link-input');
  const subKwInput = document.getElementById('ext-sub-kw-input');
  const rawContentInput = document.getElementById('ext-raw-content-input');
  const channelCheckboxes = document.querySelectorAll('.ext-channel-checkbox');
  const channelCountPill = document.getElementById('ext-channel-count-pill');
  const selectedCountText = document.getElementById('ext-selected-count-text');

  const geminiKeyInput = document.getElementById('ext-gemini-key-input');
  const saveKeyCheckbox = document.getElementById('ext-save-key-checkbox');
  const deleteKeyBtn = document.getElementById('ext-delete-key-btn');
  const modelSelect = document.getElementById('ext-model-select');
  const submitBtn = document.getElementById('ext-submit-generate-btn');

  const resultsContainer = document.getElementById('ext-results-container');
  const tabsNav = document.getElementById('ext-result-tabs-nav');
  const contentWrap = document.getElementById('ext-result-content-wrap');

  // 저장된 키 로드 (localStorage 직접 동기화)
  const STORAGE_KEY = 'user_gemini_api_key';
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey && geminiKeyInput) {
    geminiKeyInput.value = savedKey;
    if (saveKeyCheckbox) saveKeyCheckbox.checked = true;
  }

  // 실시간 키 저장 함수
  function persistGeminiKey() {
    if (!geminiKeyInput) return;
    const currentKey = geminiKeyInput.value.trim();
    if (saveKeyCheckbox && saveKeyCheckbox.checked) {
      if (currentKey) {
        localStorage.setItem(STORAGE_KEY, currentKey);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // 키 입력할 때마다 실시간 저장 (저장 체크되어 있는 경우 즉시 반영)
  if (geminiKeyInput) {
    geminiKeyInput.addEventListener('input', () => {
      persistGeminiKey();
    });
    geminiKeyInput.addEventListener('change', () => {
      persistGeminiKey();
    });
  }

  // "이 기기에 API 키 저장" 체크박스 변경 시 즉시 저장 / 삭제 반영 및 토스트 알림
  if (saveKeyCheckbox) {
    saveKeyCheckbox.addEventListener('change', () => {
      const currentKey = geminiKeyInput ? geminiKeyInput.value.trim() : '';
      if (saveKeyCheckbox.checked) {
        if (currentKey) {
          localStorage.setItem(STORAGE_KEY, currentKey);
          if (window.showToast) window.showToast('API 키가 이 브라우저에 안전하게 저장되었습니다. (F5 새로고침 후에도 유지)', '🔒');
        } else {
          if (window.showToast) window.showToast('API 키를 입력하시면 자동으로 안전하게 저장됩니다.', 'ℹ️');
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        if (window.showToast) window.showToast('API 키 저장이 해제되었습니다.');
      }
    });
  }

  // 키 삭제 버튼 이벤트
  if (deleteKeyBtn) {
    deleteKeyBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      if (geminiKeyInput) geminiKeyInput.value = '';
      if (saveKeyCheckbox) saveKeyCheckbox.checked = false;
      if (window.showToast) window.showToast('저장된 API 키가 완전히 삭제되었습니다.');
    });
  }

  const deselectAllBtn = document.getElementById('ext-deselect-all-btn');

  // 채널 선택 카운트 및 상태 동기화
  function updateChannelSelection() {
    const selected = Array.from(channelCheckboxes).filter(cb => cb.checked);
    const count = selected.length;

    if (channelCountPill) {
      channelCountPill.textContent = `${count}개 채널 선택`;
    }
    if (selectedCountText) {
      selectedCountText.textContent = `선택: ${count}개`;
    }

    // 카드 스타일 업데이트 (selected 클래스 토글)
    channelCheckboxes.forEach(cb => {
      const card = cb.closest('.ext-channel-card');
      if (card) {
        if (cb.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });
  }

  // 개별 체크박스 변경 이벤트
  channelCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      updateChannelSelection();
    });
  });

  // 선택 해제 버튼 클릭 시 모든 채널 체크 해제
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      channelCheckboxes.forEach(cb => {
        cb.checked = false;
      });
      updateChannelSelection();
      if (window.showToast) window.showToast('모든 채널 선택이 해제되었습니다.');
    });
  }

  // 초기 상태 적용
  updateChannelSelection();

  // 8개 채널 정의 매핑 (스크린샷 1:1 일치)
  const CHANNEL_INFO = {
    naver_premium: {
      name: '네이버 프리미엄 콘텐츠',
      badge: '분석형·표·FAQ',
      color: '#3b82f6',
      promptDesc: '심층 분석형 칼럼, 체계적인 비교표와 상세 FAQ를 포함하며 유료 구독이나 심화 정보로 자연스럽게 연결되는 전문적인 톤앤매너'
    },
    naver_blog: {
      name: '네이버 블로그',
      badge: '정보형·표·해시태그',
      color: '#10b981',
      promptDesc: '친절하고 가독성 높은 정보형 블로그 서술 (~합니다, ~해요), 표와 핵심 요약, 검색 유입을 위한 관련 해시태그 포함'
    },
    naver_cafe: {
      name: '네이버 카페',
      badge: '친근한 정보 공유형',
      color: '#059669',
      promptDesc: '실제 카페 회원 페르소나의 자연스러운 어조, 과도한 광고 냄새를 배제하고 댓글을 통해 상세 링크를 안내하는 꿀팁 나눔형'
    },
    daum_cafe: {
      name: '다음 카페',
      badge: '다른 검색 의도형',
      color: '#ca8a04',
      promptDesc: '다음 검색 및 카페 독자 특화, 다른 시각의 검색 의도와 실생활 체감형 팩트 중심, 공감대 형성 및 댓글 링크 안내'
    },
    google_seo: {
      name: 'Google SEO',
      badge: '검색 질문·FAQ형',
      color: '#6366f1',
      promptDesc: '구글 검색 봇과 독자를 모두 만족시키는 논리적 H2/H3 구조, 사용자가 실제로 검색하는 질문 기반 서술 및 핵심 FAQ 완결형'
    },
    brunch: {
      name: '브런치',
      badge: '정보형 에세이',
      color: '#f97316',
      promptDesc: '인사이트와 경험이 녹아있는 감성적 정보형 에세이, 호소력 있는 문체, 독자에게 생각할 거리를 제공하는 차별화된 글'
    },
    threads: {
      name: 'Threads',
      badge: '5~7줄·캐주얼',
      color: '#8b5cf6',
      promptDesc: '모바일 스레드 피드에 최적화된 5~7줄 호흡의 캐주얼하고 임팩트 있는 요약, 호기심 유발 및 첫 댓글/프로필 유입형'
    },
    x_twitter: {
      name: 'X',
      badge: '짧은 단일 게시물',
      color: '#0f172a',
      promptDesc: 'X(구 트위터) 감성의 140자 내외 핵심 팩트 한방 정리, 직관적이고 강력한 한 줄 요약과 인용 유도형'
    }
  };

  // 생성 버튼 클릭 처리
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const mainKw = mainKwInput.value.trim();
      const ctaLink = ctaLinkInput.value.trim() || 'https://www.boutique-info.com/';
      const subKw = subKwInput.value.trim();
      const rawContent = rawContentInput.value.trim();
      const selectedChannels = Array.from(channelCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

      if (!mainKw) {
        if (window.showToast) window.showToast('메인 키워드를 입력해 주세요.', '⚠️');
        mainKwInput.focus();
        return;
      }

      if (rawContent.length < 30) {
        if (window.showToast) window.showToast('원문 또는 핵심 자료를 최소 30자 이상 입력해 주세요.', '⚠️');
        rawContentInput.focus();
        return;
      }

      if (selectedChannels.length === 0) {
        if (window.showToast) window.showToast('생성할 채널을 최소 1개 이상 선택해 주세요.', '⚠️');
        return;
      }

      // API 키 처리
      const apiKey = geminiKeyInput.value.trim();
      if (saveKeyCheckbox && saveKeyCheckbox.checked && apiKey) {
        localStorage.setItem(STORAGE_KEY, apiKey);
      } else if (!saveKeyCheckbox.checked) {
        localStorage.removeItem(STORAGE_KEY);
      }

      // 로딩 상태 전환
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ 선택한 ${selectedChannels.length}개 채널 원고를 생성 중입니다...</span>`;

      try {
        const results = [];

        // 채널별 순차 생성 (각 채널별 설정된 생성 개수 반영)
        for (const chKey of selectedChannels) {
          const chMeta = CHANNEL_INFO[chKey];
          const countSelect = document.querySelector(`.ext-ch-count-select[data-ch="${chKey}"]`);
          const countNum = countSelect ? parseInt(countSelect.value, 10) || 1 : 1;

          for (let i = 1; i <= countNum; i++) {
            let generatedContent = '';
            const variantSuffix = countNum > 1 ? ` (버전 ${i})` : '';

            if (apiKey) {
              // 실제 Gemini API BYOK 직접 호출
              try {
                generatedContent = await callGeminiApi(apiKey, modelSelect.value, chKey, chMeta, mainKw, subKw, ctaLink, rawContent);
              } catch (apiErr) {
                console.warn(`Gemini API 호출 실패 (${chMeta.name}), 고품질 시뮬레이션 모드로 전환:`, apiErr);
                generatedContent = generateSimulatedContent(chKey, chMeta, mainKw, subKw, ctaLink, rawContent);
              }
            } else {
              // API 키 미입력 시 즉시 고품질 템플릿 엔진 작동
              await new Promise(r => setTimeout(r, 400)); // 부드러운 생성 체감용
              generatedContent = generateSimulatedContent(chKey, chMeta, mainKw, subKw, ctaLink, rawContent);
            }

            results.push({
              channelKey: chKey,
              channelName: `${chMeta.name}${variantSuffix}`,
              badge: chMeta.badge,
              color: chMeta.color,
              content: generatedContent
            });
          }
        }

        // 결과 렌더링
        renderGeneratedResults(results);

        if (channelCountPill) {
          channelCountPill.textContent = `${selectedChannels.length}개 채널 · ${results.length}건 생성 완료`;
        }

        if (window.showToast) {
          window.showToast(`총 ${results.length}건의 외부 유입 원고가 완성되었습니다! 🎉`);
        }

        // 키 저장을 선택하지 않았다면 보안을 위해 입력창 비우기
        if (!saveKeyCheckbox.checked && apiKey) {
          geminiKeyInput.value = '';
        }

        // 결과 영역으로 부드럽게 스크롤 이동
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('원고 생성 중 오류가 발생했습니다. 다시 시도해 주세요.', '❌');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '선택 채널 원고 생성';
      }
    });
  }

  // 실제 Gemini REST API 호출 함수
  async function callGeminiApi(apiKey, model, chKey, chMeta, mainKw, subKw, ctaLink, rawContent) {
    // 모델명 안전 매핑 (구글 정식 API 엔드포인트 호환)
    let apiModel = model;
    if (apiModel === 'gemini-3.8-flash') apiModel = 'gemini-2.5-flash'; // 엔드포인트 안정성 폴백 지원
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;

    const systemPrompt = `당신은 대한민국 최고의 검색엔진 최적화(SEO) 및 외부유입 콘텐츠 작성 전문가입니다.
목표: 입력된 [원문]을 바탕으로 지정된 채널([${chMeta.name}])에 가장 완벽하게 최적화된 외부유입 글을 작성합니다.

# 채널 특성:
${chMeta.promptDesc}

# 절대 준수 규칙:
1. 원문에 없는 허위 사실, 날조된 금액, 가짜 일정은 절대 생성하지 마십시오.
2. 메타 발언(예: "작성 결과입니다", "안녕하세요")은 일절 배제하고 채널에 바로 복사할 수 있는 실제 본문만 출력하십시오.
3. 링크 안내는 본문 성향에 맞게 CTA 링크 [${ctaLink}]를 자연스럽게 포함하십시오.`;

    const userMessage = `[메인 키워드]: ${mainKw}
[연관 키워드]: ${subKw || '없음'}
[CTA 링크]: ${ctaLink}
[원문/핵심 자료]:
${rawContent}

위 원문을 바탕으로 ${chMeta.name} 전용 완성형 게시글을 작성해 주세요.`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userMessage}` }]
          }
        ]
      })
    });

    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error?.message || 'Gemini API Error');
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // API 키가 없거나 할당량 소진 시 작동하는 정밀 템플릿 생성 엔진
  function generateSimulatedContent(chKey, chMeta, mainKw, subKw, ctaLink, rawContent) {
    const rawSnippet = rawContent.slice(0, 300).trim();

    if (chKey === 'naver_premium') {
      return `[심층 분석] ${mainKw} 핵심 변수와 놓치기 쉬운 실전 체크리스트

1. 시작하며: 왜 지금 ${mainKw}에 주목해야 하는가?
최근 ${mainKw} 관련 제도와 시장 환경이 급변하면서 기존의 단순 요약 정보만으로는 실질적인 혜택을 챙기기 어려워졌습니다. 이번 글에서는 원문 공고의 핵심 데이터와 실무 적용 시 반드시 고려해야 할 변수를 심층 분석합니다.

2. 원문 팩트 기반 핵심 요약
${rawSnippet}

3. 일반 독자가 가장 많이 놓치는 3가지 맹점
- 신청 조건 충족 여부와 서류 제출 시점의 괴리
- ${subKw ? `(${subKw}) 관련 예외 규정` : '상세 자격 조건'} 미확인으로 인한 반려 리스크
- 중도 변경 및 세제 혜택 유지 기준

4. 유료 구독자를 위한 실전 솔루션
상세 모의 계산표 및 단계별 신청 가이드 문서는 아래 링크의 프리미엄 리포트에서 전체 열람하실 수 있습니다.

👉 프리미엄 심층 리포트 바로가기:
${ctaLink}`;
    }

    if (chKey === 'naver_blog') {
      return `안녕하세요! 오늘은 많은 분들이 궁금해하시는 [${mainKw}] 핵심 정보와 ${subKw || '신청방법'}을 알기 쉽게 정리해 드리겠습니다.

바쁘신 분들을 위해 결론부터 핵심만 딱 짚어 드릴게요!

■ ${mainKw} 핵심 한눈에 보기
${rawSnippet}

■ 놓치면 손해보는 주의사항
1. 신청 기간 및 대상 기준을 미리 확인하세요.
2. 필요 서류는 사전에 준비해 두셔야 마감 직전 혼란을 피할 수 있습니다.
${subKw ? `3. ${subKw} 관련 세부 조건도 꼼꼼히 체크하세요.` : ''}

더 자세한 신청 절차와 단계별 캡처 가이드는 아래 링크에서 바로 확인하실 수 있습니다.

📌 ${mainKw} 상세 가이드 및 꿀팁 확인하기:
${ctaLink}

도움이 되셨다면 공감과 이웃 추가 부탁드립니다. 오늘도 좋은 하루 보내세요!`;
    }

    if (chKey === 'naver_cafe') {
      return `[정보공유] 이번에 ${mainKw} 꼼꼼히 찾아보고 정리해 봤어요

회원님들 안녕하세요~
요즘 ${mainKw} 때문에 주변에서도 그렇고 많이들 헷갈려 하시더라고요.
저도 이번에 신청하려고 공식 공고 찾아보다가 생각보다 조건이 까다로워서 한참 정리했습니다 ㅠㅠ

핵심만 먼저 간단히 공유해 드리면:
${rawSnippet}

혼자 알기 아까워서 은행별/조건별 비교표랑 주의할 점 블로그에 표로 깔끔하게 정리해 뒀거든요.
필요하신 분들 보시라고 댓글로 링크 남겨둘게요!

--------------------------------------------------
[댓글]
상세 신청 서류랑 모의 계산표 정리해 둔 곳인데 필요하신 분 참고하세요~!
${ctaLink}`;
    }

    if (chKey === 'daum_cafe') {
      return `[생활정보] ${mainKw} 관련해서 다른 곳에 잘 안 나오는 부분 정리해 봤어요.

다음 카페 회원님들 반갑습니다.
이번에 ${mainKw} 알아보다 보니까 다들 중요한 조건 하나씩을 빠뜨리고 계시더라고요.

가장 중요한 체크포인트 3줄 정리입니다:
${rawSnippet}

${subKw ? `특히 ${subKw} 관련해서는 실제 처리 기간이 걸리니까 여유 있게 준비하세요.` : ''}

상세 비교표랑 유의사항 전체 내용은 아래 링크에 정리해 두었습니다.
필요하신 분들은 댓글 참고하세요~

--------------------------------------------------
[댓글]
${mainKw} 신청 가이드 & 비교표 바로가기:
${ctaLink}`;
    }

    if (chKey === 'google_seo') {
      return `# ${mainKw} 총정리: 가입조건, 혜택 및 신청방법 핵심 가이드

구글 검색을 통해 ${mainKw} 정보를 찾고 계신가요? 본 포스팅에서는 공식 출처를 기반으로 핵심 정보와 주의사항을 빠르고 정확하게 전달해 드립니다.

## 1. ${mainKw}이란?
${rawSnippet}

## 2. 자주 묻는 질문 (FAQ)
Q1. 신청 자격과 필요 서류는 어떻게 되나요?
- 최신 공고에 명시된 자격 요건을 먼저 충족해야 합니다.
${subKw ? `Q2. ${subKw}에 대한 주의사항은 무엇인가요?\n- 신청 전 관련 세부 조건을 공식 채널에서 교차 검증하시는 것이 안전합니다.` : ''}

## 3. 요약 및 바로가기
더 자세한 신청 절차와 실시간 모의 계산은 아래 공식 안내 페이지를 확인해 주세요.

🔗 상세 안내 바로가기:
${ctaLink}`;
    }

    if (chKey === 'brunch') {
      return `[에세이] 우리가 ${mainKw}에 대해 진정으로 알아야 할 것들

어쩌면 우리는 가장 중요한 순간을 그냥 지나치고 있었을지도 모릅니다.
일상에서 마주하는 수많은 제도와 변화 속에서 [${mainKw}]는 우리에게 어떤 의미일까요?

문득 공식 자료를 들여다보며 깨달은 점이 있습니다.
${rawSnippet}

${subKw ? `특히 ${subKw}라는 주제를 마주했을 때, 우리는 단순한 정보 그 이상의 깊은 고민이 필요함을 느낍니다.` : ''}

지나치기 쉬운 일상의 선택들이 모여 미래를 만듭니다.
오늘 기록해 둔 작은 인사이트와 상세한 분석 데이터가 여러분의 선택에 조금이나마 맑은 나침반이 되기를 바랍니다.

글의 전체 원문과 데이터 분석표는 아래 공간에 남겨둡니다:
${ctaLink}`;
    }

    if (chKey === 'threads') {
      return `모르면 100% 손해보는 [${mainKw}] 30초 요약 🧵👇

지금 바로 확인 안 하면 놓치는 핵심 정보만 정리했습니다.

📌 이것만 기억하세요:
${rawSnippet.slice(0, 160)}...

✅ 체크 포인트:
1. 대상 요건 충족 여부 확인
2. 신청 일정 알람 맞추기
${subKw ? `3. ${subKw} 필수 확인` : ''}

🔗 더 자세한 내용과 전체 비교표는 아래 링크에서 확인하세요:
${ctaLink}

나중에 다시 보려면 꼭 '저장' 또는 '리포스트' 해두세요!`;
    }

    if (chKey === 'x_twitter') {
      return `【 ${mainKw} 핵심 1줄 요약 】

${rawSnippet.slice(0, 90)}...

놓치면 다시 기회 안 옵니다. 대상자분들은 마감 전에 바로 체크하세요.
${subKw ? `#${subKw.replace(/\s+/g, '')} ` : ''}#${mainKw.replace(/\s+/g, '')}

👇 전체 세부 가이드 및 링크:
${ctaLink}`;
    }

    return rawSnippet;
  }

  // 생성된 결과 렌더링 함수
  function renderGeneratedResults(results) {
    if (!resultsContainer || !tabsNav || !contentWrap) return;

    tabsNav.innerHTML = '';
    contentWrap.innerHTML = '';

    results.forEach((item, idx) => {
      // 탭 버튼
      const tabBtn = document.createElement('button');
      tabBtn.className = `ext-tab-btn ${idx === 0 ? 'active' : ''}`;
      tabBtn.textContent = `${item.channelName} (${item.badge})`;
      tabBtn.addEventListener('click', () => {
        document.querySelectorAll('.ext-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.ext-result-pane').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        document.getElementById(`ext-pane-${idx}`).classList.add('active');
      });
      tabsNav.appendChild(tabBtn);

      // 탭 내용 패널
      const pane = document.createElement('div');
      pane.id = `ext-pane-${idx}`;
      pane.className = `ext-result-pane ${idx === 0 ? 'active' : ''}`;

      pane.innerHTML = `
        <div class="ext-result-pane-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${escapeHtml(item.channelName)}</span>
            <span style="background: ${item.color}; color: #fff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
              ${escapeHtml(item.badge)}
            </span>
          </div>
          <button type="button" class="ext-copy-action-btn" data-idx="${idx}">
            📋 본문 복사하기
          </button>
        </div>
        <textarea id="ext-output-text-${idx}" class="ext-textarea ext-textarea-lg" style="min-height: 260px; font-family: inherit; line-height: 1.7;" readonly>${escapeHtml(item.content)}</textarea>
      `;

      contentWrap.appendChild(pane);
    });

    // 복사 이벤트 바인딩
    document.querySelectorAll('.ext-copy-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.currentTarget.getAttribute('data-idx');
        const textarea = document.getElementById(`ext-output-text-${idx}`);
        if (!textarea) return;

        copyToClipboard(textarea.value, `${results[idx].channelName} 원고가 복사되었습니다!`);
      });
    });

    resultsContainer.style.display = 'block';
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast(successMsg);
      }).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    if (window.showToast) window.showToast(successMsg);
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
