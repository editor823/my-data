/**
 * 관리자 전용 시크릿 콘솔 모듈 (admin.js)
 * - 방문자에게는 메뉴가 보이지 않음
 * - 하단 카피라이트 더블클릭 또는 비밀 키보드 단축키 (Ctrl + Shift + A) 입력 시 관리자 비밀번호 창 오픈
 * - 초기 비밀번호: 1234 (관리자가 직접 변경 가능)
 * - 9개 챗봇의 제목, 설명, 링크, 프롬프트 원문을 웹 화면에서 직접 수정 및 실시간 반영
 */

const ADMIN_PASSWORD_KEY = 'admin_secret_password';
const DEFAULT_ADMIN_PASSWORD = '!ekrnfl8259';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 단축키 바인딩 (Ctrl + Shift + A)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      tryOpenAdminModal();
    }
  });

  // 2. 하단 카피라이트 영역 더블클릭 시 관리자 창 열기
  const footerCopy = document.getElementById('footer-copyright');
  if (footerCopy) {
    footerCopy.style.cursor = 'pointer';
    footerCopy.setAttribute('title', '더블클릭 시 관리자 모드');
    footerCopy.addEventListener('dblclick', () => {
      tryOpenAdminModal();
    });
  }

  // 관리자 모달 내 탭 전환 및 이벤트
  const botSelect = document.getElementById('admin-bot-select');
  if (botSelect) {
    botSelect.addEventListener('change', () => {
      loadBotDataToAdminForm(botSelect.value);
    });
  }

  const saveBtn = document.getElementById('admin-save-bot-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveAdminBotChanges);
  }
});

// 관리자 인증창 열기
function tryOpenAdminModal() {
  const isAuthed = sessionStorage.getItem('is_admin_authenticated') === 'true';
  if (isAuthed) {
    openAdminDashboard();
  } else {
    document.getElementById('adminLoginModal').style.display = 'flex';
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminPasswordInput').focus();
  }
}

window.checkAdminLogin = function() {
  const input = document.getElementById('adminPasswordInput').value.trim();
  const realPassword = localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;

  if (input === realPassword) {
    sessionStorage.setItem('is_admin_authenticated', 'true');
    document.getElementById('adminLoginModal').style.display = 'none';
    openAdminDashboard();
    window.showToast('관리자 인증에 성공했습니다! 👑');
  } else {
    alert('비밀번호가 일치하지 않습니다. (초기 비밀번호: admin)');
    document.getElementById('adminPasswordInput').focus();
  }
};

window.closeAdminLogin = function() {
  document.getElementById('adminLoginModal').style.display = 'none';
};

// 관리자 대시보드 열기
function openAdminDashboard() {
  const modal = document.getElementById('adminDashboardModal');
  if (!modal) return;

  // 봇 셀렉트 박스 채우기
  const select = document.getElementById('admin-bot-select');
  select.innerHTML = '';

  if (window.CUSTOM_BOT_PROMPTS && window.CUSTOM_BOT_PROMPTS.length > 0) {
    window.CUSTOM_BOT_PROMPTS.forEach(bot => {
      const opt = document.createElement('option');
      opt.value = bot.id;
      opt.textContent = `[${bot.badge}] ${bot.title}`;
      select.appendChild(opt);
    });

    loadBotDataToAdminForm(select.value);
  }

  modal.style.display = 'flex';
}

window.closeAdminDashboard = function() {
  document.getElementById('adminDashboardModal').style.display = 'none';
};

// 선택된 봇 데이터를 폼에 로드
function loadBotDataToAdminForm(botId) {
  const bot = window.CUSTOM_BOT_PROMPTS.find(b => b.id === botId);
  if (!bot) return;

  document.getElementById('admin-edit-title').value = bot.title;
  document.getElementById('admin-edit-subtitle').value = bot.subTitle;
  document.getElementById('admin-edit-badge').value = bot.badge;
  document.getElementById('admin-edit-link').value = bot.link;
  document.getElementById('admin-edit-prompt').value = bot.promptText;
}

// 봇 정보 저장 및 화면 실시간 갱신
function saveAdminBotChanges() {
  const botId = document.getElementById('admin-bot-select').value;
  const bot = window.CUSTOM_BOT_PROMPTS.find(b => b.id === botId);
  if (!bot) return;

  bot.title = document.getElementById('admin-edit-title').value.trim();
  bot.subTitle = document.getElementById('admin-edit-subtitle').value.trim();
  bot.badge = document.getElementById('admin-edit-badge').value.trim();
  bot.link = document.getElementById('admin-edit-link').value.trim();
  bot.promptText = document.getElementById('admin-edit-prompt').value.trim();

  // 브라우저 로컬 저장소에 영구 보존
  localStorage.setItem(`saved_bot_${botId}`, JSON.stringify(bot));

  // 화면 실시간 재렌더링
  if (typeof renderCustomBots === 'function') {
    renderCustomBots();
  }

  window.showToast(`[${bot.title}] 내용이 성공적으로 저장 및 적용되었습니다! ✅`);
}

// 저장된 커스텀 봇 데이터 복원 (초기 로드시)
function restoreSavedBotData() {
  if (!window.CUSTOM_BOT_PROMPTS) return;

  window.CUSTOM_BOT_PROMPTS.forEach(bot => {
    const saved = localStorage.getItem(`saved_bot_${bot.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        bot.title = parsed.title || bot.title;
        bot.subTitle = parsed.subTitle || bot.subTitle;
        bot.badge = parsed.badge || bot.badge;
        bot.link = parsed.link || bot.link;
        bot.promptText = parsed.promptText || bot.promptText;
      } catch (e) {}
    }
  });
}

// 초기화 시 로컬 저장 데이터 자동 복원
restoreSavedBotData();
