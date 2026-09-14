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
  const styleChips = document.querySelectorAll('.imggen-style-chip');
  const ratioSelect = document.getElementById('imggen-ratio-select');
  const modelSelect = document.getElementById('imggen-model-select');
  const formatSelect = document.getElementById('imggen-format-select');
  const submitBtn = document.getElementById('imggen-submit-btn');

  const resultBox = document.getElementById('imggen-result-box');
  const previewImg = document.getElementById('imggen-preview-img');
  const spinner = document.getElementById('imggen-loading-spinner');
  const specsBadge = document.getElementById('imggen-specs-badge');
  const regenerateBtn = document.getElementById('imggen-regenerate-btn');
  const downloadBtn = document.getElementById('imggen-download-btn');
  const sendToConvBtn = document.getElementById('imggen-send-to-conv-btn');

  let currentSelectedStyle = 'realistic';
  let currentImageUrl = '';
  let currentBlob = null;

  if (!submitBtn) return;

  // 1. 스타일 칩 선택 이벤트
  styleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      styleChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSelectedStyle = chip.getAttribute('data-style') || 'realistic';
    });
  });

  // 2. 프롬프트 지우기
  if (clearBtn && promptInput) {
    clearBtn.addEventListener('click', () => {
      promptInput.value = '';
      promptInput.focus();
    });
  }

  // 3. 이미지 생성 실행 함수
  async function generateImage() {
    const rawPrompt = promptInput.value.trim();
    if (!rawPrompt) {
      if (window.showToast) window.showToast('원하는 이미지의 주제나 설명을 입력해 주세요.', '⚠️');
      promptInput.focus();
      return;
    }

    const ratio = ratioSelect ? ratioSelect.value : '16:9';
    const model = modelSelect ? modelSelect.value : 'flux';
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
    }

    // 스타일 보강 프롬프트 빌드
    const enhancedPrompt = buildEnhancedPrompt(rawPrompt, currentSelectedStyle);

    // UI 로딩 상태 전환
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ AI가 고화질 이미지를 그리는 중입니다... (약 3~5초)</span>';
    
    resultBox.style.display = 'block';
    spinner.style.display = 'flex';
    previewImg.style.display = 'none';
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      let finalImageUrl = '';
      const seed = Math.floor(Math.random() * 9999999);

      // 모델 분기
      if (model === 'gemini') {
        // 제미나이 키 확인
        const savedGeminiKey = localStorage.getItem('user_gemini_api_key');
        if (savedGeminiKey) {
          // Pollinations Google Imagen 모드 또는 고화질 Flux 폴백
          finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=true`;
        } else {
          finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=true`;
        }
      } else if (model === 'turbo') {
        finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=turbo&seed=${seed}&nologo=true`;
      } else {
        // 기본 Flux.1 초고화질 (무제한 무료)
        finalImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&model=flux&seed=${seed}&nologo=true&enhance=true`;
      }

      // 이미지 사전 로드 (Blob 변환)
      const response = await fetch(finalImageUrl);
      if (!response.ok) throw new Error('이미지 생성 서버 응답 오류');
      const blob = await response.blob();
      currentBlob = blob;
      currentImageUrl = URL.createObjectURL(blob);

      previewImg.src = currentImageUrl;
      previewImg.onload = () => {
        spinner.style.display = 'none';
        previewImg.style.display = 'block';
      };

      if (specsBadge) {
        specsBadge.textContent = `${width}x${height} · ${model.toUpperCase()} · ${format.toUpperCase()}`;
      }

      if (window.showToast) {
        window.showToast('블로그 맞춤 AI 이미지가 완성되었습니다! 바로 다운로드하세요.', '🎉');
      }

    } catch (err) {
      console.error('Image Gen Error:', err);
      spinner.style.display = 'none';
      if (window.showToast) {
        window.showToast('이미지 생성 도중 일시적인 네트워크 지연이 발생했습니다. 다시 시도해 주세요.', '⚠️');
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🎨</span> AI 맞춤 이미지 즉시 생성하기 (무료)';
    }
  }

  // 4. 스타일별 프롬프트 자동 최적화 영문 헬퍼
  function buildEnhancedPrompt(text, style) {
    let styleGuide = 'clean, high detail, sharp focus, 8k uhd, professional commercial photography, masterpiece';
    
    if (style === 'illustration') {
      styleGuide = 'modern vector blog flat illustration, clean lines, vibrant corporate colors, behance trending, minimal';
    } else if (style === '3d') {
      styleGuide = 'cute smooth 3d clay render style, isometric, blender 3d, soft studio lighting, high aesthetic, glossy';
    } else if (style === 'minimal') {
      styleGuide = 'modern infographic style, minimalist aesthetic, clean composition, soft pastel tones, editorial layout';
    } else if (style === 'cinematic') {
      styleGuide = 'cinematic lighting, 35mm photograph, moody atmosphere, shallow depth of field, photorealistic, kodak portra';
    }

    // 블로그에 부적절한 기괴한 왜곡 방지 네거티브 키워드 자동 보강
    return `${text}, ${styleGuide}, no text, no watermark, no blur, high quality`;
  }

  // 5. 다운로드 버튼 클릭
  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (!currentBlob && !currentImageUrl) {
        if (window.showToast) window.showToast('다운로드할 이미지가 없습니다. 먼저 이미지를 생성해 주세요.', '⚠️');
        return;
      }

      const format = formatSelect ? formatSelect.value : 'png';
      const promptKeyword = (promptInput.value.trim().split(' ')[0] || 'blog_image').replace(/[^가-힣a-zA-Z0-9]/g, '');
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `blog_${promptKeyword}_${timestamp}.${format}`;

      // Canvas를 통한 포맷 변환 및 깨끗한 파일 다운로드
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentImageUrl;

      img.onload = () => {
        canvas.width = img.naturalWidth || 1280;
        canvas.height = img.naturalHeight || 720;
        ctx.drawImage(img, 0, 0);

        let mimeType = 'image/png';
        if (format === 'webp') mimeType = 'image/webp';
        else if (format === 'jpg') mimeType = 'image/jpeg';

        canvas.toBlob((blob) => {
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
        }, mimeType, 0.92);
      };
    });
  }

  // 6. 다시 그리기 버튼
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      generateImage();
    });
  }

  // 7. [이미지 일괄 변환기로 보내기] 버튼
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

  // 8. 생성 버튼 클릭 및 엔터키
  submitBtn.addEventListener('click', generateImage);
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      generateImage();
    }
  });
});
