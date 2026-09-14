/**
 * 이미지 일괄 변환기 스크립트 (converter.js)
 * - 머니대외비(boutique-info.com) ?page=converter 1:1 완벽 인터페이스 및 기능 구현
 * - 브라우저 Canvas 재인코딩을 통한 AI 생성 정보 / GPS / 저작권 메타데이터 완전 박멸
 * - 출력 포맷 선택 (WebP / JPG / PNG)
 * - 슬라이더 실시간 품질 조절 (10% ~ 100%)
 * - 가로/세로 최대 해상도 비율 유지 리사이즈 (0=원본)
 * - 일괄 변환 및 개별 다운로드
 * - JSZip을 통한 '전체 변환 + ZIP 압축 다운로드' 원클릭 지원
 */

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('conv-dropzone');
  const fileInput = document.getElementById('conv-file-input');
  const formatSelect = document.getElementById('conv-format-select');
  const qualityRange = document.getElementById('conv-quality-range');
  const qualityValText = document.getElementById('conv-quality-val-text');
  const maxWInput = document.getElementById('conv-max-w-input');
  const maxHInput = document.getElementById('conv-max-h-input');
  const stripMetaCheckbox = document.getElementById('conv-strip-meta');

  const startBtn = document.getElementById('conv-start-btn');
  const zipBtn = document.getElementById('conv-zip-btn');
  const clearBtn = document.getElementById('conv-clear-btn');

  const listWrap = document.getElementById('conv-file-list-wrap');
  const listContainer = document.getElementById('conv-file-list');
  const fileCountText = document.getElementById('conv-file-count');
  const totalSavingsText = document.getElementById('conv-total-savings');

  if (!dropzone || !fileInput) return;

  // 선택된 원본 파일 목록 및 변환 결과 목록
  let uploadedFiles = [];
  let convertedResults = [];

  // 품질 슬라이더 이벤트
  if (qualityRange && qualityValText) {
    qualityRange.addEventListener('input', () => {
      qualityValText.textContent = `${qualityRange.value}%`;
    });
  }

  // 드롭존 클릭 시 파일 열기
  dropzone.addEventListener('click', () => fileInput.click());

  // 드래그앤드롭 이벤트
  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  });

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
    }
  });

  // 파일 추가 및 목록 표시
  function addFiles(files) {
    const validImages = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
    if (validImages.length === 0) {
      if (window.showToast) window.showToast('이미지 파일만 선택해 주세요.', '⚠️');
      return;
    }

    uploadedFiles = [...uploadedFiles, ...validImages];
    renderFileList();
    if (window.showToast) window.showToast(`${validImages.length}개의 이미지가 추가되었습니다. '변환 시작'을 눌러주세요.`);
  }

  // 목록 비우기
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      uploadedFiles = [];
      convertedResults = [];
      fileInput.value = '';
      if (listWrap) listWrap.style.display = 'none';
      if (listContainer) listContainer.innerHTML = '';
      if (zipBtn) zipBtn.disabled = true;
      if (window.showToast) window.showToast('목록이 깨끗이 비워졌습니다.');
    });
  }

  // 변환 시작 버튼
  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      if (uploadedFiles.length === 0) {
        if (window.showToast) window.showToast('먼저 변환할 이미지를 추가해 주세요.', '⚠️');
        fileInput.click();
        return;
      }

      startBtn.disabled = true;
      startBtn.textContent = '변환 진행 중...';

      convertedResults = [];
      const format = formatSelect ? formatSelect.value : 'webp';
      const quality = qualityRange ? parseFloat(qualityRange.value) / 100 : 0.85;
      const maxW = maxWInput ? parseInt(maxWInput.value, 10) || 0 : 1600;
      const maxH = maxHInput ? parseInt(maxHInput.value, 10) || 0 : 1600;

      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        try {
          const res = await processImage(file, format, quality, maxW, maxH);
          convertedResults.push(res);
        } catch (err) {
          console.error(err);
        }
      }

      renderFileList();
      startBtn.disabled = false;
      startBtn.textContent = '변환 시작';

      if (zipBtn && convertedResults.length > 0) {
        zipBtn.disabled = false;
      }

      if (window.showToast) {
        window.showToast(`총 ${convertedResults.length}개의 이미지 변환이 완료되었습니다! 🎉`);
      }
    });
  }

  // 브라우저 캔버스 기반 이미지 변환 및 리사이즈 & 메타데이터 파괴 로직
  function processImage(file, format, quality, maxW, maxH) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let targetW = img.width;
          let targetH = img.height;

          // 비율 유지 리사이즈 계산 (0보다 클 때만)
          if (maxW > 0 && targetW > maxW) {
            targetH = Math.round((targetH * maxW) / targetW);
            targetW = maxW;
          }
          if (maxH > 0 && targetH > maxH) {
            targetW = Math.round((targetW * maxH) / targetH);
            targetH = maxH;
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');

          // PNG가 아닌 경우(JPG/WebP) 배경 투명 방지용 흰색 채우기
          if (format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
          }

          // 캔버스에 그리기 (이 과정에서 기존 메타데이터/GPS/AI 태그 100% 삭제됨)
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // 포맷별 mimeType 결정
          let mimeType = 'image/webp';
          let ext = 'webp';
          if (format === 'jpeg') {
            mimeType = 'image/jpeg';
            ext = 'jpg';
          } else if (format === 'png') {
            mimeType = 'image/png';
            ext = 'png';
          }

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob 실패'));
              return;
            }

            const originalSizeKB = (file.size / 1024).toFixed(1);
            const convertedSizeKB = (blob.size / 1024).toFixed(1);
            const savedRatio = Math.round(((file.size - blob.size) / file.size) * 100);

            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const newName = `${baseName}.${ext}`;
            const downloadUrl = URL.createObjectURL(blob);

            resolve({
              originalName: file.name,
              newName: newName,
              originalSizeKB: originalSizeKB,
              convertedSizeKB: convertedSizeKB,
              savedRatio: savedRatio,
              blob: blob,
              downloadUrl: downloadUrl,
              dimensions: `${targetW} × ${targetH}px`
            });
          }, mimeType, quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 파일 목록 렌더링
  function renderFileList() {
    if (!listWrap || !listContainer) return;

    if (uploadedFiles.length === 0) {
      listWrap.style.display = 'none';
      listContainer.innerHTML = '';
      return;
    }

    listWrap.style.display = 'block';
    if (fileCountText) fileCountText.textContent = uploadedFiles.length;
    listContainer.innerHTML = '';

    uploadedFiles.forEach((file, idx) => {
      const conv = convertedResults[idx];
      const card = document.createElement('div');
      card.className = 'conv-file-card';

      const origKB = (file.size / 1024).toFixed(1);
      const isDone = Boolean(conv);

      card.innerHTML = `
        <div class="conv-thumb-box" style="width: 50px; height: 50px; border-radius: 6px; background: #0f172a; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
          <span style="font-size: 1.5rem;">${isDone ? '🖼️' : '⏳'}</span>
        </div>
        <div class="conv-file-info">
          <div class="conv-file-name" title="${escapeHtml(file.name)}">
            ${isDone ? `✨ ${escapeHtml(conv.newName)}` : escapeHtml(file.name)}
          </div>
          <div class="conv-file-meta">
            ${isDone 
              ? `<span>${conv.originalSizeKB}KB → <strong class="conv-badge-success">${conv.convertedSizeKB}KB</strong> (${conv.savedRatio >= 0 ? '-' : '+'}${Math.abs(conv.savedRatio)}%) · ${conv.dimensions}</span>`
              : `<span>원본 ${origKB}KB · 대기 중</span>`
            }
          </div>
        </div>
        ${isDone ? `
          <a href="${conv.downloadUrl}" download="${escapeHtml(conv.newName)}" class="conv-down-btn">
            다운로드
          </a>
        ` : ''}
      `;

      listContainer.appendChild(card);
    });
  }

  // 전체 변환 + ZIP 다운로드 원클릭 처리
  if (zipBtn) {
    zipBtn.addEventListener('click', async () => {
      if (convertedResults.length === 0) {
        if (window.showToast) window.showToast('먼저 변환을 완료해 주세요.', '⚠️');
        return;
      }

      if (typeof JSZip === 'undefined') {
        if (window.showToast) window.showToast('압축 라이브러리를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.', '⚠️');
        return;
      }

      zipBtn.disabled = true;
      zipBtn.textContent = 'ZIP 압축 중...';

      try {
        const zip = new JSZip();
        convertedResults.forEach(item => {
          zip.file(item.newName, item.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `converted_images_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (window.showToast) window.showToast('전체 이미지가 ZIP 파일로 다운로드되었습니다! 📦');
      } catch (err) {
        console.error('ZIP 생성 오류:', err);
        if (window.showToast) window.showToast('ZIP 압축 중 오류가 발생했습니다.', '❌');
      } finally {
        zipBtn.disabled = false;
        zipBtn.textContent = '전체 변환 + ZIP 다운로드';
      }
    });
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
