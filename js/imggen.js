/**
 * 블로그 맞춤 AI 이미지 생성기 (imggen.js)
 * - 한국어 프롬프트 자동 영문 번역/보강 (블로그 상위 노출 및 고화질 유도)
 * - Flux.1 / SDXL Turbo / Google Imagen 3 실시간 생성
 * - 네이버/워드프레스 16:9 / 1:1 / 4:3 / 9:16 비율 최적화
 * - PNG, WebP, JPG 원클릭 다운로드
 * - 생성 이미지를 [이미지변환기]로 원클릭 전달하여 EXIF 세탁 및 메타데이터 추가 가능
 */

document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('imggen-prompt-input');
  const clearBtn = document.getElementById('imggen-clear-prompt-btn');
  const ratioSelect = document.getElementById('imggen-ratio-select');
  const modelSelect = document.getElementById('imggen-model-select');
  const formatSelect = document.getElementById('imggen-format-select');
  const submitBtn = document.getElementById('imggen-submit-btn');

  const apiKeyContainer = document.getElementById('imggen-api-key-container');
  const geminiKeyInput = document.getElementById('imggen-gemini-key-input');
  const saveKeyBtn = document.getElementById('imggen-save-key-btn');

  const resultBox = document.getElementById('imggen-result-box');
  const previewImg = document.getElementById('imggen-preview-img');
  const spinner = document.getElementById('imggen-loading-spinner');
  const specsBadge = document.getElementById('imggen-specs-badge');
  const regenerateBtn = document.getElementById('imggen-regenerate-btn');
  const downloadBtn = document.getElementById('imggen-download-btn');
  const sendToConvBtn = document.getElementById('imggen-send-to-conv-btn');

  // 내부 상태 변수
  let currentSelectedStyle = 'realistic';
  let currentImageDataUrl = '';
  let currentBlob = null;

  if (!submitBtn) return;

  // 1. 추천 스타일 선택 버튼 이벤트 연결 및 활성화 처리
  // tab-imggen 내부의 추천 스타일 칩 버튼들만 정확히 바인딩
  const imggenSection = document.getElementById('tab-imggen');
  const styleChips = imggenSection ? imggenSection.querySelectorAll('.imggen-style-chip') : document.querySelectorAll('.imggen-style-chip');

  styleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      styleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSelectedStyle = chip.getAttribute('data-style') || 'realistic';
      console.log('선택된 스타일 변경:', currentSelectedStyle);
    });
  });

  // 2. Gemini API Key 로드 및 실시간 저장 처리
  const GEMINI_STORAGE_KEY = 'user_gemini_api_key';
  const savedKey = localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  if (geminiKeyInput) {
    geminiKeyInput.value = savedKey;

    geminiKeyInput.addEventListener('input', () => {
      const val = geminiKeyInput.value.trim();
      if (val) {
        localStorage.setItem(GEMINI_STORAGE_KEY, val);
      }
    });
  }

  if (saveKeyBtn && geminiKeyInput) {
    saveKeyBtn.addEventListener('click', () => {
      const val = geminiKeyInput.value.trim();
      if (!val) {
        if (window.showToast) window.showToast('Google Gemini API 키를 입력해 주세요.', '⚠️');
        geminiKeyInput.focus();
        return;
      }
      localStorage.setItem(GEMINI_STORAGE_KEY, val);
      if (window.showToast) window.showToast('API 키가 브라우저에 안전하게 저장되었습니다!', '🔑');
    });
  }

  // 생성 모델 변경 시 API 키 입력창 표시 여부 토글 (Imagen 3일 때 강조)
  if (modelSelect && apiKeyContainer) {
    const updateApiKeyVisibility = () => {
      if (modelSelect.value === 'imagen3') {
        apiKeyContainer.style.display = 'block';
      } else {
        apiKeyContainer.style.display = 'block'; // 편의를 위해 항상 노출하되 연동 가능하도록 유지
      }
    };
    modelSelect.addEventListener('change', updateApiKeyVisibility);
    updateApiKeyVisibility();
  }

  // 3. 프롬프트 지우기
  if (clearBtn && promptInput) {
    clearBtn.addEventListener('click', () => {
      promptInput.value = '';
      promptInput.focus();
    });
  }

  // 한국어 포함 여부 확인 헬퍼
  function containsKorean(text) {
    return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
  }

  // MyMemory 무료 번역 API (한국어 -> 영어)
  async function translateKoreanToEnglish(text) {
    if (!containsKorean(text)) {
      return text;
    }
    try {
      const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText.trim();
          if (translated && !translated.startsWith('MYMEMORY WARNING')) {
            return translated;
          }
        }
      }
    } catch (err) {
      console.warn('MyMemory 번역 일시적 지연, 원문 사용:', err);
    }
    return text;
  }

  // 4. 스타일별 프롬프트 영문 인젝션 헬퍼
  function buildEnhancedPrompt(text, style) {
    let styleGuide = 'masterpiece, highly detailed, 8k resolution, photorealistic, professional photography, studio lighting, hyperrealistic textures, DSLR, shot on 35mm lens, f/1.8';
    
    if (style === 'realistic') {
      styleGuide = 'masterpiece, highly detailed, 8k resolution, photorealistic, professional photography, studio lighting, hyperrealistic textures, DSLR, shot on 35mm lens, f/1.8';
    } else if (style === 'cinematic') {
      styleGuide = 'cinematic lighting, dramatic atmosphere, volumetric lighting, unreal engine 5 render, octane render, 8k, movie still';
    } else if (style === 'illustration') {
      styleGuide = 'modern vector blog flat illustration, clean lines, vibrant corporate colors, behance trending, minimal, masterpiece, high quality, highly detailed';
    } else if (style === '3d') {
      styleGuide = 'cute smooth 3d clay render style, isometric, blender 3d, soft studio lighting, high aesthetic, glossy, 3d render, masterpiece, high quality';
    } else if (style === 'minimal') {
      styleGuide = 'modern infographic style, minimalist aesthetic, clean composition, soft pastel tones, editorial layout, masterpiece, high quality';
    }

    return `${text}, ${styleGuide}, no text, no watermark, no blur`;
  }

  // 5. Google 공식 이미지 생성 API 호출 함수 (x-goog-api-key 헤더 및 다중 엔드포인트 지원)
  async function generateWithGoogleGemini(prompt, ratio, apiKey) {
    // Imagen 3가 지원하는 종횡비 규격
    let imagenRatio = '16:9';
    if (ratio === '1:1') imagenRatio = '1:1';
    else if (ratio === '4:3') imagenRatio = '4:3';
    else if (ratio === '9:16') imagenRatio = '9:16';
    else imagenRatio = '16:9';

    // 시도할 엔드포인트 후보군
    // 1순위: imagen-3.0-generate-002:predict (x-goog-api-key 헤더 방식)
    // 2순위: v1beta imagen-3.0-generate-002:predict (URL key 파라미터 병행)
    const endpoints = [
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`,
        useHeader: true
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`,
        useHeader: false
      }
    ];

    const payload = {
      instances: [
        { prompt: prompt }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: imagenRatio,
        outputMimeType: "image/jpeg"
      }
    };

    let lastError = null;

    for (const ep of endpoints) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (ep.useHeader) {
          headers['x-goog-api-key'] = apiKey;
        }

        const response = await fetch(ep.url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.predictions && resData.predictions[0] && resData.predictions[0].bytesBase64Encoded) {
            const base64Data = resData.predictions[0].bytesBase64Encoded;
            const mimeType = resData.predictions[0].mimeType || 'image/jpeg';
            return `data:${mimeType};base64,${base64Data}`;
          }
        } else {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = (errBody.error && errBody.error.message) ? errBody.error.message : `HTTP ${response.status}`;
          lastError = { status: response.status, message: errMsg };
        }
      } catch (err) {
        lastError = { status: 0, message: err.message };
      }
    }

    // 모든 시도 실패 시 lastError throw
    const finalErr = new Error(lastError ? lastError.message : 'Google Imagen 3 API 호출 실패');
    finalErr.status = lastError ? lastError.status : 500;
    throw finalErr;
  }

  // 6. 이미지 생성 메인 실행 함수
  async function generateImage() {
    const rawPrompt = promptInput.value.trim();
    if (!rawPrompt) {
      if (window.showToast) window.showToast('원하는 이미지의 주제나 설명을 입력해 주세요.', '⚠️');
      promptInput.focus();
      return;
    }

    const ratio = ratioSelect ? ratioSelect.value : '16:9';
    const model = modelSelect ? modelSelect.value : 'imagen3';
    const format = formatSelect ? formatSelect.value : 'png';

    // 비율에 따른 해상도 (width, height) 계산
    let width = 1280;
    let height = 720;
    if (ratio === '1:1') {
      width = 1024;
      height = 1024;
    } else if (ratio === '4:3') {
      width = 1024;
      height = 768;
    } else if (ratio === '9:16') {
      width = 720;
      height = 1280;
    } else {
      width = 1280;
      height = 720;
    }

    // Google Imagen 3 선택 시 API 키 점검
    let apiKey = '';
    if (model === 'imagen3') {
      apiKey = (geminiKeyInput ? geminiKeyInput.value.trim() : '') || localStorage.getItem(GEMINI_STORAGE_KEY) || '';
      if (!apiKey) {
        if (window.showToast) {
          window.showToast('Google Gemini API Key가 필요합니다. 하단 입력창에 키를 입력해 주세요.', '⚠️');
        }
        if (geminiKeyInput) geminiKeyInput.focus();
        return;
      }
    }

    // UI 로딩 상태 전환
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ AI 고화질 렌더링 중... (약 3~8초)</span>';
    
    resultBox.style.display = 'block';
    spinner.style.display = 'flex';
    previewImg.style.display = 'none';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      // 1) 한국어 -> 영문 번역 처리
      const translatedPrompt = await translateKoreanToEnglish(rawPrompt);

      // 2) 번역된 사용자 프롬프트 + 선택된 추천 스타일 영문 인젝션 결합
      const enhancedPrompt = buildEnhancedPrompt(translatedPrompt, currentSelectedStyle);

      console.log('🎨 [AI 이미지 생성기] 원본 한글:', rawPrompt);
      console.log('🎨 [AI 이미지 생성기] 번역된 영문:', translatedPrompt);
      console.log('🎨 [AI 이미지 생성기] 선택 스타일:', currentSelectedStyle);
      console.log('🎨 [AI 이미지 생성기] 최종 프롬프트:', enhancedPrompt);

      let dataUrlOrBlobUrl = '';
      let usedModelName = (model === 'imagen3') ? 'Google Imagen 3' : model.toUpperCase();

      // 3) AI 엔진별 생성 분기
      if (model === 'imagen3') {
        try {
          // 구글 공식 Imagen 3 API 호출 (x-goog-api-key 헤더 규격 적용)
          dataUrlOrBlobUrl = await generateWithGoogleGemini(enhancedPrompt, ratio, apiKey);
          currentImageDataUrl = dataUrlOrBlobUrl;
          currentBlob = null;
        } catch (apiErr) {
          console.warn('Google Imagen 3 호출 에러:', apiErr);

          // 404 (not found / not supported for predict) 또는 403 (Billing/결제 프로젝트 필요) 발생 시 안내 및 고화질 Fallback
          const errText = (apiErr.message || '').toLowerCase();
          const isBillingOrNotFound = apiErr.status === 404 || apiErr.status === 403 || 
                                     errText.includes('not found') || 
                                     errText.includes('not supported') || 
                                     errText.includes('billing') || 
                                     errText.includes('permission');

          if (isBillingOrNotFound) {
            // 사용자에게 결제 프로젝트 등록 필요 안내 토스트/알림 표시
            if (window.showToast) {
              window.showToast('💡 Google Imagen 3는 결제 프로젝트(Billing) 등록 키에서 지원됩니다. 고화질 FLUX 엔진으로 자동 전환하여 생성을 완료합니다!', '⚡');
            }

            // 고화질 오픈소스 FLUX Schnell / Flux 고화질 엔진으로 즉각 안전 대체(Fallback) 실행
            const seed = Math.floor(Math.random() * 9999999);
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=true`;
            
            const fbResponse = await fetch(fallbackUrl);
            if (!fbResponse.ok) throw new Error('대체 이미지 생성 엔진 응답 오류');
            const blob = await fbResponse.blob();
            currentBlob = blob;
            dataUrlOrBlobUrl = URL.createObjectURL(blob);
            currentImageDataUrl = dataUrlOrBlobUrl;
            usedModelName = 'FLUX.1 (안전 대체 모드)';
          } else {
            throw apiErr;
          }
        }
      } else {
        // 보조 무료 옵션 (FLUX / Turbo)
        const seed = Math.floor(Math.random() * 9999999);
        const pollModel = (model === 'turbo') ? 'turbo' : 'flux';
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=${pollModel}&seed=${seed}&nologo=true&enhance=true`;
        
        const response = await fetch(fallbackUrl);
        if (!response.ok) throw new Error('보조 생성 서버 응답 오류');
        const blob = await response.blob();
        currentBlob = blob;
        dataUrlOrBlobUrl = URL.createObjectURL(blob);
        currentImageDataUrl = dataUrlOrBlobUrl;
      }

      // 이미지 미리보기 세팅
      previewImg.src = dataUrlOrBlobUrl;
      previewImg.onload = () => {
        spinner.style.display = 'none';
        previewImg.style.display = 'block';
      };

      if (specsBadge) {
        specsBadge.textContent = `${ratio} (${width}x${height}) · ${usedModelName} · ${format.toUpperCase()}`;
      }

      if (window.showToast) {
        window.showToast('고화질 AI 이미지가 성공적으로 완성되었습니다! 바로 다운로드하세요.', '🎉');
      }

    } catch (err) {
      console.error('Image Gen Error:', err);
      spinner.style.display = 'none';
      const errMsg = err && err.message ? err.message : '알 수 없는 오류';
      if (window.showToast) {
        window.showToast(`이미지 생성 안내: ${errMsg}`, '⚠️');
      } else {
        alert(`이미지 생성 안내: ${errMsg}`);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🎨</span> AI 맞춤 이미지 즉시 생성하기';
    }
  }

  // 7. 다운로드 버튼 클릭 처리 (base64 데이터 및 canvas 포맷 변환 지원)
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (!currentImageDataUrl && !currentBlob) {
        if (window.showToast) window.showToast('다운로드할 이미지가 없습니다. 먼저 이미지를 생성해 주세요.', '⚠️');
        return;
      }

      const format = formatSelect ? formatSelect.value : 'png';
      const promptKeyword = (promptInput.value.trim().split(' ')[0] || 'blog_image').replace(/[^가-힣a-zA-Z0-9]/g, '');
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `blog_${promptKeyword}_${timestamp}.${format}`;

      // 캔버스를 통한 무손실/고화질 포맷 변환 및 다운로드
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        canvas.width = img.naturalWidth || 1024;
        canvas.height = img.naturalHeight || 1024;
        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/png';
        if (format === 'webp') mimeType = 'image/webp';
        else if (format === 'jpg') mimeType = 'image/jpeg';

        canvas.toBlob((blob) => {
          if (!blob) {
            // Blob 생성 실패 시 직접 dataUrl 다운로드 폴백
            const a = document.createElement('a');
            a.href = currentImageDataUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
          }

          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);

          if (window.showToast) {
            window.showToast(`[${filename}] 컴퓨터에 성공적으로 저장되었습니다!`, '💾');
          }
        }, mimeType, 0.95);
      };

      img.onerror = () => {
        // Canvas 로드 불가 시 직접 a 태그로 다운로드
        const a = document.createElement('a');
        a.href = currentImageDataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      img.src = currentImageDataUrl;
    });
  }

  // 8. 다시 그리기 버튼
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      generateImage();
    });
  }

  // 9. [이미지 일괄 변환기로 보내기] 버튼
  if (sendToConvBtn) {
    sendToConvBtn.addEventListener('click', () => {
      if (window.switchTab) {
        window.switchTab('converter');
        if (window.showToast) {
          window.showToast('이미지 변환기로 이동했습니다! 다운로드받은 이미지를 드롭존에 넣어 메타데이터를 추가할 수 있습니다.', '🚀');
        }
      }
    });
  }

  // 10. 생성 버튼 클릭 및 Ctrl+Enter 단축키
  submitBtn.addEventListener('click', generateImage);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      generateImage();
    }
  });
});
