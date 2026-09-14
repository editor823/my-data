/**
 * 메인 전역 앱 스크립트
 * - 상단 네비게이션 탭 전환 기능
 * - 모바일 메뉴 열고 닫기
 * - 토스트(알림 팝업) 안내 메시지 표시 기능
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 네비게이션 탭 전환 로직
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabSections = document.querySelectorAll('.tab-section');
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  function switchTab(tabId, pushHistory = true) {
    // 모든 탭 섹션 숨기기
    tabSections.forEach(section => {
      section.classList.remove('active');
    });

    // 모든 네비 버튼 활성화 해제
    navBtns.forEach(btn => {
      btn.classList.remove('active');
    });

    // 선택된 탭 활성화
    const targetSection = document.getElementById(`tab-${tabId}`);
    const targetBtn = document.querySelector(`[data-tab="${tabId}"]`);

    if (targetSection) {
      targetSection.classList.add('active');
    }
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    // 모바일 메뉴가 열려있다면 닫기
    if (navMenu && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
    }

    // 브라우저 주소창 파라미터 및 뒤로가기 히스토리 스택 동기화
    if (pushHistory) {
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('page', tabId);
      window.history.pushState({ tab: tabId }, '', newUrl);
    }

    // 화면 맨 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // URL 쿼리 파라미터 (?page=keywordcenter, ?page=external 등) 확인하여 해당 탭 자동 열기
  const urlParams = new URLSearchParams(window.location.search);
  let pageParam = urlParams.get('page') || 'home';
  if (pageParam === 'keywordcenter') pageParam = 'adsense';
  
  // 최초 진입 히스토리 상태 설정
  const initialUrl = new URL(window.location);
  initialUrl.searchParams.set('page', pageParam);
  window.history.replaceState({ tab: pageParam }, '', initialUrl);
  switchTab(pageParam, false);

  // 브라우저 뒤로가기 / 앞으로가기 버튼 이벤트 감지 (구글로 빠져나가지 않고 사이트 내 탭 이동)
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.tab) {
      switchTab(e.state.tab, false);
    } else {
      const currentParams = new URLSearchParams(window.location.search);
      const curTab = currentParams.get('page') || 'home';
      switchTab(curTab, false);
    }
  });

  // 버튼 클릭 시 탭 전환 이벤트 바인딩
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      if (tabId) {
        switchTab(tabId, true);
      }
    });
  });

  // 로고 클릭 시 홈으로 이동
  const brandLogo = document.querySelector('.brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('home', true);
    });
  }

  // 모바일 햄버거 토글
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });
  }

  // 전역 switchTab 노출 (다른 스크립트나 인라인 호출용)
  window.switchTab = (tabId) => switchTab(tabId, true);
});

/**
 * 사용자 편의를 위한 토스트 알림 함수
 * 예: showToast('클립보드에 복사되었습니다!')
 */
function showToast(message, icon = '✅') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

window.showToast = showToast;
