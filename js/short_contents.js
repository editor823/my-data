// =========================================================
// 실시간 숏텐츠 (Short Contents) 데이터, 렌더러 및 글쓰기 모달
// =========================================================
(function() {
  'use strict';

  // 정적 기본 데이터 (data/shortents_data.js 또는 폴백 데이터)
  let shortData = (typeof window.SHORTENTS_STATIC_DATA === 'object' && window.SHORTENTS_STATIC_DATA !== null)
    ? window.SHORTENTS_STATIC_DATA
    : {};

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

  window.openShortentsModal = function(item) {
    if (!item) return;
    currentModalItem = item;

    const dialog = document.getElementById('shortentsDialog');
    const titleField = document.getElementById('shortentsTitleField');
    const status = document.getElementById('shortentsCopyStatus');
    const fallback = document.getElementById('shortentsCopyFallback');

    const itemTitle = item.title || item.keyword || '';

    if (fallback) fallback.hidden = true;
    if (titleField) titleField.value = itemTitle;
    if (status) status.textContent = '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.';

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

    // 팝업 열림과 동시에 제목 자동 복사
    copyToClipboard(itemTitle, '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.');
  };

  window.closeShortentsModal = function() {
    const dialog = document.getElementById('shortentsDialog');
    if (dialog) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
        dialog.style.display = 'none';
      }
    }
  };

  // 하위 호환용 글로벌 함수
  window.startWritingFromShort = function(title) {
    window.openShortentsModal({
      title: title,
      desc: '선택한 숏텐츠 주제',
      time: '방금',
      source: 'N'
    });
  };

  function renderList() {
    const container = document.getElementById('shortContentsList');
    if (!container) return;

    // 카테고리 데이터 가져오기 (매핑 확인)
    let items = shortData[activeCat];
    if (!items || !items.length) {
      // 혹시 영문 키일 경우 대비 폴백 매핑
      const altKey = Object.keys(shortData).find(k => k.includes(activeCat) || activeCat.includes(k));
      items = altKey ? shortData[altKey] : (shortData['엔터 종합'] || []);
    }

    // 각 카테고리별 20개 표시 (isExpanded에 따라 10개 또는 20개)
    const displayCount = isExpanded ? Math.min(items.length, 20) : Math.min(items.length, 10);
    const visibleItems = items.slice(0, displayCount);

    if (visibleItems.length === 0) {
      container.innerHTML = '<p style="text-align:center; padding:30px; color:#64748b;">불러오는 중입니다...</p>';
      return;
    }

    // 인라인 onclick 문자열 대신 data-index를 이용해 안전하게 렌더링 (따옴표 에러 원천 차단)
    container.innerHTML = visibleItems.map((item, idx) => {
      const rankNum = item.rank || (idx + 1);
      const title = item.title || item.keyword || '';
      const desc = item.desc || item.articleTitle || '';
      const time = item.time || item.date || '방금 전';
      const thumb = item.thumb || item.image || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><rect width="52" height="52" fill="%23f1f5f9"/></svg>';
      const source = item.source || 'N';

      return `
        <div class="short-row-item">
          <div class="short-row-left">
            <span class="short-rank-num">${rankNum}</span>
            <img src="${thumb}" alt="${escapeHtml(title)}" width="52" height="52" class="short-thumb-img" loading="lazy" decoding="async" fetchpriority="low" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2252%22 height=%2252%22><rect width=%2252%22 height=%2252%22 fill=%22%23f1f5f9%22/></svg>'">
            <div class="short-text-col">
              <h4 class="short-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</h4>
              <p class="short-item-desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</p>
              <div class="short-item-meta">
                <span>${escapeHtml(time)}</span>
                <span class="naver-badge-icon">${escapeHtml(source)}</span>
              </div>
            </div>
          </div>
          <div class="short-action-col">
            <button type="button" class="btn-short-write" data-index="${idx}">글쓰기</button>
          </div>
        </div>
      `;
    }).join('');

    // 모든 글쓰기 버튼에 메모리 기반 클릭 이벤트 직접 바인딩 (1~20번 모든 버튼 100% 정상 작동)
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

    // 하단 더보기/접기 버튼 상태 업데이트
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

  window.toggleMoreShortContents = function() {
    isExpanded = !isExpanded;
    renderList();
  };

  window.copySecretNoticeText = function() {
    const text = `[머니대외비] 이번 주 비밀 키워드 200개 공개\n매주 월요일 07시 새 목록 업데이트!\n지금 접속하여 확인하세요: ${window.location.origin}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 단톡방 공지 문구가 복사되었습니다!\n원하는 채팅방에 붙여넣기(Ctrl+V)하세요.');
      });
    } else {
      prompt('공지 문구를 복사하세요:', text);
    }
  };

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

  // 실시간 갱신 시도 (네트워크 환경에 따라 실패 시 정적 데이터 유지)
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
        
        // shortents_live.json 구조인 경우 (data.data)
        if (data && data.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
          shortData = data.data;
          renderList();
          updateShortTime(data.updatedAt);
          return;
        }

        // 원본 boutique API topics 구조인 경우
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
            renderList();
            updateShortTime();
            return;
          }
        }
      } catch (_) {
        // 다음 URL 시도
      }
    }
  }

  function updateShortTime(isoTimeStr) {
    const timeEl = document.getElementById('shortContentsTime');
    if (!timeEl) return;
    const now = isoTimeStr ? new Date(isoTimeStr) : new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `조회 ${hh}:${mm}`;
  }

  function initShortContents() {
    // 1. window.SHORTENTS_STATIC_DATA 로드
    if ((!shortData || Object.keys(shortData).length === 0) && typeof window.SHORTENTS_STATIC_DATA === 'object') {
      shortData = window.SHORTENTS_STATIC_DATA;
    }

    const buttons = document.querySelectorAll('#shortCategoryBar .short-cat-pill');
    buttons.forEach(btn => {
      btn.addEventListener('click', function() {
        const cat = this.getAttribute('data-category');
        if (cat === 'pro') {
          if (typeof switchTab === 'function') switchTab('adsense');
          return;
        }
        buttons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeCat = cat;
        // 카테고리 전환 시 20개 유지
        renderList();
      });
    });

    renderList();
    setupDialogEvents();
    updateShortTime();

    // 2. 실시간 라이브 데이터 즉시 동기화 호출!
    fetchLiveShortents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShortContents);
  } else {
    initShortContents();
  }
})();
