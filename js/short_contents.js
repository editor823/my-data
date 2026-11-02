// =========================================================
// 실시간 숏텐츠 (Short Contents) & 곧 뜰 숏텐츠 후보 모듈
// =========================================================
(function() {
  'use strict';

  // 정적 기본 데이터 (data/shortents_data.js)
  let shortData = (typeof window.SHORTENTS_STATIC_DATA === 'object' && window.SHORTENTS_STATIC_DATA !== null)
    ? window.SHORTENTS_STATIC_DATA
    : {};

  // 곧 뜰 숏텐츠 후보 데이터 (data/shortents_predictions.js)
  let predictionData = (typeof window.SHORTENTS_PREDICTIONS_DATA === 'object' && window.SHORTENTS_PREDICTIONS_DATA !== null)
    ? window.SHORTENTS_PREDICTIONS_DATA
    : null;

  let activeCat = '엔터 종합';
  let isExpanded = true; // 20개 전체 표시
  let currentModalItem = null;
  let toastTimer = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clock(isoTimeStr) {
    if (!isoTimeStr) return '';
    try {
      const d = new Date(isoTimeStr);
      if (isNaN(d.getTime())) return String(isoTimeStr);
      return d.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (_) {
      return '';
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('shortentsToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 4000);
  }

  async function copyToClipboard(text, successMsg) {
    const status = document.getElementById('shortentsCopyStatus');
    const fallback = document.getElementById('shortentsCopyFallback');
    if (fallback) fallback.hidden = true;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      if (status) status.textContent = successMsg;
      showToast(successMsg);
    } catch (e) {
      if (status) status.textContent = '자동 복사가 제한되었습니다. 아래 내용을 직접 복사하세요.';
      if (fallback) {
        fallback.value = text;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
      }
    }
  }

  window.openShortentsModal = function(item, customContext = null) {
    if (!item) return;
    currentModalItem = item;

    const dialog = document.getElementById('shortentsDialog');
    const titleField = document.getElementById('shortentsTitleField');
    const status = document.getElementById('shortentsCopyStatus');
    const fallback = document.getElementById('shortentsCopyFallback');

    const itemTitle = item.title || item.keyword || '';

    if (fallback) fallback.hidden = true;
    if (titleField) titleField.value = itemTitle;
    if (status) status.textContent = customContext ? '예상 키워드와 기사 정보를 복사했어요. Claude 입력칸에 붙여넣으세요.' : '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.';

    if (dialog) {
      if (typeof dialog.showModal === 'function') {
        try {
          dialog.showModal();
        } catch (e) {
          dialog.setAttribute('open', '');
          dialog.style.display = 'block';
        }
      } else {
        dialog.setAttribute('open', '');
        dialog.style.display = 'block';
      }
    }

    // 팝업 열림과 동시에 복사
    copyToClipboard(customContext || itemTitle, customContext ? '예상 키워드와 기사 정보를 복사했어요. Claude 입력칸에 붙여넣으세요.' : '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.');
  };

  window.closeShortentsModal = function() {
    const dialog = document.getElementById('shortentsDialog');
    if (dialog) {
      if (typeof dialog.close === 'function') {
        try {
          dialog.close();
        } catch (e) {
          dialog.removeAttribute('open');
          dialog.style.display = 'none';
        }
      } else {
        dialog.removeAttribute('open');
        dialog.style.display = 'none';
      }
    }
  };

  function renderList() {
    const container = document.getElementById('shortContentsList');
    if (!container) return;

    // 1. [🔮 곧 뜰 숏텐츠 후보] 탭 렌더링
    if (activeCat === 'prediction') {
      renderPredictionsList(container);
      return;
    }

    // 2. 일반 카테고리 렌더링
    const items = shortData[activeCat] || [];
    const visibleItems = isExpanded ? items.slice(0, 20) : items.slice(0, 10);

    if (visibleItems.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;">불러오는 중입니다...</p>';
      return;
    }

    container.innerHTML = visibleItems.map((item, idx) => {
      const rankNum = item.rank || (idx + 1);
      const title = item.title || item.keyword || '';
      const desc = item.desc || item.articleTitle || '';
      const time = item.time || item.date || '방금 전';
      const thumb = item.thumb || item.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><rect width="52" height="52" fill="%23f1f5f9"/></svg>';
      const source = item.source || 'N';
      const link = item.link || ('https://search.naver.com/search.naver?where=news&query=' + encodeURIComponent(title));

      return `
        <div class="short-row-item">
          <div class="short-row-left">
            <span class="short-rank-num">${rankNum}</span>
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="short-thumb-link" title="네이버 기사/검색 바로가기">
              <img src="${thumb}" alt="${escapeHtml(title)}" width="52" height="52" class="short-thumb-img" loading="lazy" decoding="async" fetchpriority="low" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2252%22 height=%2252%22><rect width=%2252%22 height=%2252%22 fill=%22%23f1f5f9%22/></svg>'">
            </a>
            <div class="short-text-col">
              <h4 class="short-item-title" title="${escapeHtml(title)}">
                <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="short-title-link">${escapeHtml(title)}</a>
              </h4>
              <p class="short-item-desc" title="${escapeHtml(desc)}">
                <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="short-desc-link">${escapeHtml(desc)}</a>
              </p>
              <div class="short-item-meta">
                <span>${escapeHtml(time)}</span>
                <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;" title="네이버로 이동">
                  <span class="naver-badge-icon">${escapeHtml(source)}</span>
                </a>
              </div>
            </div>
          </div>
          <div class="short-action-col">
            <button type="button" class="btn-short-write" data-index="${idx}">글쓰기</button>
          </div>
        </div>
      `;
    }).join('');

    // 이벤트 바인딩
    const writeButtons = container.querySelectorAll('.btn-short-write');
    writeButtons.forEach((btn, idx) => {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const targetItem = visibleItems[idx];
        if (targetItem) {
          window.openShortentsModal(targetItem);
        }
      };
    });

    const moreBtn = document.getElementById('btnShortMore');
    if (moreBtn) {
      if (items.length <= 10) {
        moreBtn.style.display = 'none';
      } else {
        moreBtn.style.display = 'inline-block';
        moreBtn.textContent = isExpanded ? '접기 (10개 보기)' : '더보기 (20개 전체보기)';
      }
    }
  }

  /**
   * [🔮 곧 뜰 숏텐츠 후보] 1:1 역공학 렌더링 (원본 이미지 2 완벽 구현)
   */
  function renderPredictionsList(container) {
    const data = predictionData;
    const timeEl = document.getElementById('shortContentsTime');
    if (timeEl) {
      const genTime = clock(data?.generatedAt);
      timeEl.textContent = `5분마다 갱신` + (genTime ? ` · 생성 ${genTime}` : '');
    }

    const moreBtn = document.getElementById('btnShortMore');
    if (moreBtn) moreBtn.style.display = 'none';

    if (!data || !Array.isArray(data.predictions) || data.predictions.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;">곧 뜰 숏텐츠 후보를 실시간으로 분석하고 있습니다...</p>';
      return;
    }

    const hit = data.hitRate || {};
    const hitRateHtml = (hit && hit.matched != null)
      ? `<div class="shortents-hit-rate">최근 ${hit.days || 7}일 ${hit.matched || 0}건 적중${hit.avgLeadMin != null ? ` · 평균 ${hit.avgLeadMin}분 먼저` : ''}</div>`
      : '';

    const rows = [...data.predictions]
      .filter(x => x && typeof x.title === 'string')
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 25);

    const itemsHtml = rows.map((item, i) => {
      const rankNum = i + 1;
      const title = item.title || '';
      const articlesCount = Number(item.articles) || 0;
      const pressCount = Number(item.press) || 0;
      const firstTime = clock(item.firstArticleAt);
      const metaText = `최근 90분 기사 ${articlesCount}건 · 언론사 ${pressCount}곳` + (firstTime ? ` · 첫 기사 ${firstTime}` : '');

      // 뱃지들
      let badgesHtml = '';
      if (item.exclusive) badgesHtml += '<span>단독/공식</span>';
      if (item.trendHit) badgesHtml += '<span>급상승어</span>';
      if (Number(item.recent20) >= 3) badgesHtml += '<span>급증</span>';

      // 추천 제목
      let titlesBoxHtml = '';
      const recTitles = (Array.isArray(item.titles) ? item.titles : []).slice(0, 4);
      if (recTitles.length > 0) {
        const rowsTitles = recTitles.map(t => `
          <div class="shortents-title-row">
            <span class="shortents-title-style">${escapeHtml(t.style || '추천')}</span>
            <span class="shortents-title-text">${escapeHtml(t.title)}</span>
            <button type="button" class="shortents-title-copy-btn" onclick="navigator.clipboard.writeText('${escapeHtml(t.title)}'); showToast('제목이 복사되었습니다!');">복사</button>
          </div>
        `).join('');

        titlesBoxHtml = `
          <div class="shortents-titles">
            <div class="shortents-titles-label">추천 제목 · 숏텐츠형</div>
            ${rowsTitles}
          </div>
        `;
      }

      // 관련 기사 샘플 3개
      let samplesHtml = '';
      const samples = (Array.isArray(item.samples) ? item.samples : []).slice(0, 3);
      if (samples.length > 0) {
        const listItems = samples.map(s => `
          <li>
            <a href="${escapeHtml(s.link || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title || '관련 기사')}</a>
            <small>${escapeHtml(s.press || '')} · ${clock(s.at)}</small>
          </li>
        `).join('');

        samplesHtml = `<ul class="shortents-samples">${listItems}</ul>`;
      }

      // 글쓰기 컨텍스트
      const contextText = `[예상 키워드] ${title}\n` +
        (recTitles.length ? recTitles.map(t => `[추천 제목·${t.style || ''}] ${t.title}`).join('\n') + '\n' : '') +
        samples.map(s => `[관련 기사] ${s.title || ''} (${[s.press, clock(s.at)].filter(Boolean).join(', ')})`).join('\n') +
        '\n※ 숏텐츠에 뜨기 전 선점용 후보입니다. 글 제목 맨 앞에 키워드를 넣고, 원문 기사로 사실을 확인하세요.';

      return `
        <div class="shortents-prediction-row">
          <div class="short-row-item">
            <div class="short-row-left" style="align-items: flex-start;">
              <span class="short-rank-num" style="padding-top: 2px;">${rankNum}</span>
              <details class="shortents-prediction">
                <summary>
                  <strong style="font-size: 16px; font-weight: 800; color: #0f172a; display: block; line-height: 1.4;">${escapeHtml(title)}</strong>
                  <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">${escapeHtml(metaText)}</p>
                  <div class="shortents-prediction-badges">${badgesHtml}</div>
                </summary>
                ${titlesBoxHtml}
                ${samplesHtml}
              </details>
            </div>
            <div class="short-action-col">
              <button type="button" class="btn-short-write btn-prediction-write" data-pred-index="${i}">글쓰기</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = hitRateHtml + itemsHtml;

    // 글쓰기 버튼 바인딩
    const predButtons = container.querySelectorAll('.btn-prediction-write');
    predButtons.forEach(btn => {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-pred-index'));
        const target = rows[idx];
        if (target) {
          const recTitles = (Array.isArray(target.titles) ? target.titles : []).slice(0, 4);
          const samples = (Array.isArray(target.samples) ? target.samples : []).slice(0, 3);
          const contextText = `[예상 키워드] ${target.title}\n` +
            (recTitles.length ? recTitles.map(t => `[추천 제목·${t.style || ''}] ${t.title}`).join('\n') + '\n' : '') +
            samples.map(s => `[관련 기사] ${s.title || ''} (${[s.press, clock(s.at)].filter(Boolean).join(', ')})`).join('\n') +
            '\n※ 숏텐츠에 뜨기 전 선점용 후보입니다. 글 제목 맨 앞에 키워드를 넣고, 원문 기사로 사실을 확인하세요.';
          window.openShortentsModal({ title: target.title }, contextText);
        }
      };
    });
  }

  function setupDialogEvents() {
    const dialog = document.getElementById('shortentsDialog');
    if (!dialog) return;

    const btnClose = document.getElementById('btnCloseShortentsDialog');
    if (btnClose) {
      btnClose.onclick = window.closeShortentsModal;
    }

    // 바깥 배경 클릭 시 닫기
    dialog.addEventListener('click', function(e) {
      if (e.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        ) {
          window.closeShortentsModal();
        }
      }
    });

    // [제목 복사] 버튼
    const btnTitle = document.getElementById('btnCopyShortTitle');
    if (btnTitle) {
      btnTitle.onclick = function() {
        if (!currentModalItem) return;
        const title = currentModalItem.title || currentModalItem.keyword || '';
        copyToClipboard(title, '숏텐츠 제목을 복사했어요. Claude 입력칸에 붙여넣으세요.');
      };
    }

    // [기사 정보 전체 복사] 버튼
    const btnArticle = document.getElementById('btnCopyShortArticle');
    if (btnArticle) {
      btnArticle.onclick = function() {
        if (!currentModalItem) return;
        const title = currentModalItem.title || currentModalItem.keyword || '';
        const desc = currentModalItem.desc || currentModalItem.articleTitle || '';
        const time = currentModalItem.time || currentModalItem.date || '';
        const text = `[키워드] ${title}\n[주제] ${activeCat}\n[관련 기사] ${desc}\n[출처/시간] 네이버 · ${time}\n※ 글 제목 맨 앞에 키워드를 그대로 넣으세요. 숏텐츠는 AI 생성 결과이므로 원문 기사로 사실을 확인하세요.`;
        copyToClipboard(text, '키워드와 기사 정보를 복사했어요. 글쓰기 도구에 붙여넣으세요.');
      };
    }

    // 글쓰기 링크 클릭 시 팝업 닫기
    const links = dialog.querySelectorAll('.shortents-tool-link');
    links.forEach(a => {
      a.addEventListener('click', function() {
        window.closeShortentsModal();
      });
    });
  }

  // 실시간 숏텐츠 (13개 일반 카테고리) 갱신
  async function fetchLiveShortents() {
    const urls = [
      'data/shortents_live.json?_t=' + Date.now(),
      'https://www.boutique-info.com/api/keyword-center?action=getShortents&_t=' + Date.now()
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        
        if (data && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
          shortData = data.data;
          if (activeCat !== 'prediction') {
            renderList();
            updateShortTime(data.updatedAt);
          }
          return;
        }

        if (data && data.success && Array.isArray(data.topics)) {
          const fresh = {};
          for (const t of data.topics) {
            if (Array.isArray(t.items)) {
              fresh[t.category] = t.items.map(it => ({
                rank: it.rank,
                title: it.keyword,
                desc: it.articleTitle || '',
                time: it.date || '',
                thumb: it.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=60',
                source: 'N',
                link: it.link || ''
              }));
            }
          }
          if (Object.keys(fresh).length > 0) {
            shortData = fresh;
            if (activeCat !== 'prediction') {
              renderList();
              updateShortTime();
            }
            return;
          }
        }
      } catch (_) {}
    }
  }

  // 곧 뜰 숏텐츠 후보 (Predictions) 실시간 갱신 (유료키 권한 100% 해제)
  async function fetchLivePredictions() {
    const urls = [
      'https://www.boutique-info.com/api/keyword-center?action=getShortentsPredictions&paidAccessKey=AAAB4Z6KNMC6EYW5&_t=' + Date.now(),
      'data/shortents_predictions.json?_t=' + Date.now()
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.predictions) && data.predictions.length > 0) {
          predictionData = data;
          if (activeCat === 'prediction') {
            renderList();
          }
          return;
        }
      } catch (_) {}
    }
  }

  function updateShortTime(isoTimeStr) {
    const timeEl = document.getElementById('shortContentsTime');
    if (!timeEl || activeCat === 'prediction') return;
    const now = isoTimeStr ? new Date(isoTimeStr) : new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `조회 ${hh}:${mm}`;
  }

  function initShortContents() {
    if ((!shortData || Object.keys(shortData).length === 0) && typeof window.SHORTENTS_STATIC_DATA === 'object') {
      shortData = window.SHORTENTS_STATIC_DATA;
    }
    if (!predictionData && typeof window.SHORTENTS_PREDICTIONS_DATA === 'object') {
      predictionData = window.SHORTENTS_PREDICTIONS_DATA;
    }

    const buttons = document.querySelectorAll('#shortCategoryBar .short-cat-pill');
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        const cat = this.getAttribute('data-category');
        buttons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeCat = cat;

        // 곧 뜰 숏텐츠 후보를 선택했을 경우 즉시 최신화 로드 & 렌더링
        if (cat === 'prediction') {
          fetchLivePredictions();
        }
        renderList();
      });
    });

    renderList();
    setupDialogEvents();
    updateShortTime();

    // 백그라운드 실시간 갱신
    fetchLiveShortents();
    fetchLivePredictions();
  }

  window.toggleMoreShortContents = function() {
    isExpanded = !isExpanded;
    renderList();
    const btn = document.getElementById('btnShortMore');
    if (btn) btn.textContent = isExpanded ? '접기 ▲' : '더보기 ▼';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShortContents);
  } else {
    initShortContents();
  }
})();
