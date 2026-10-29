// =========================================================
// 실시간 숏텐츠 (Short Contents) 데이터, 렌더러 및 글쓰기 팝업 모달
// =========================================================
(function() {
  'use strict';

  const shortContentsData = {
    enter: [
      {
        rank: 1,
        title: "어도어, 뉴진스 MV 소송 승소",
        desc: "[속보] 어도어, '뉴진스 MV 소송' 돌고래유괴단에 또 이겼다...항소 기각",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "안은진 런닝맨 뽀뽀 논란 결론",
        desc: "'런닝맨' 안은진 뽀뽀 논란…'성희롱 논란 생길 수밖에' 지적에도 '문제없음'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 3,
        title: "김지원 장원영, 운명 같은 패션",
        desc: "김지원X장원영, 3일 만에 이 정도면 운명…같은 옷·같은 행사까지",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 4,
        title: "씨엔블루, 내년 2월 KSPO DOME",
        desc: "씨엔블루, 내년 2월 KSPO DOME 입성...새해부터 '열일'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 5,
        title: "무쇠소녀단3 쇼트트랙 도전",
        desc: "\"목표는 금메달\" '무쇠소녀단3' 쇼트트랙 선수 변신",
        time: "3시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 6,
        title: "유해진 신변보호 해제·대통령 표창",
        desc: "'신변보호 해제' 유해진, 모처럼 활짝 웃는다...대중문화예술상 '대통령 표창'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 7,
        title: "유연석 서현진, 라이어 줄거리 인물관계도",
        desc: "유연석 서현진, 이 케미 10년 만! 관심폭발 앞둔 라이어 줄거리 인물관계도 정보",
        time: "17시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 8,
        title: "신민아 김우빈, 아내가 가장 많이 하는 말",
        desc: "유퀴즈 신민아 김우빈, 남편은 예쁘다는데 아내가 가장 많이 하는 말",
        time: "10시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 9,
        title: "하트 오브 비스트, 브래드 피트 영화 정보",
        desc: "하트 오브 비스트 정보 뜻 해외 평점 관람평 - 브래드 피트 군견 오디션 생존 사투 모험 영화",
        time: "2일 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 10,
        title: "장원영, 불가리 CEO 해프닝 논란",
        desc: "\"불가리 CEO에 결례?\" 장원영, 포토타임 해프닝에 매너난 '어처'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 11,
        title: "블랙핑크 로제 '아파트' 빌보드 핫100 진입",
        desc: "브루노 마스와 협업한 로제 신곡 '아파트(APT.)', 글로벌 음원 차트 1위 석권",
        time: "3시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 12,
        title: "흑백요리사 안성재 심사위원 밈 열풍",
        desc: "\"고기가 이븐하게 익지 않았어요\" 유행어 탄생과 셰프 식당 예약 폭주",
        time: "4시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=60"
      }
    ],
    drama: [
      {
        rank: 1,
        title: "정년이 김태리 국극 오디션 명장면",
        desc: "타고난 소리 천재 윤정년, 매란국극단 연구생 입단 시험 비하인드",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "지옥에서 온 판사 박신혜 사이다 참교육",
        desc: "악마 판사 강빛나, 법망 피한 범죄자들에게 내리는 무자비한 사적 제재",
        time: "3시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 3,
        title: "정숙한 세일즈 김소연 방판 4인방 결성",
        desc: "1992년 금제골 마을, 성인용품 방문판매로 뭉친 네 여성의 유쾌한 자립기",
        time: "5시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=120&auto=format&fit=crop&q=60"
      }
    ],
    movie: [
      {
        rank: 1,
        title: "베테랑2 정해인 빌런 연기 화제",
        desc: "황정민과의 치열한 격투씬, 박선우 캐릭터 해석과 결말 쿠키영상 해석",
        time: "4시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "글래디에이터2 콜로세움 해전 스케일",
        desc: "24년 만의 귀환, 리들리 스콧 감독이 완성한 로마 콜로세움 전투 명장면",
        time: "6시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=120&auto=format&fit=crop&q=60"
      }
    ],
    music: [
      {
        rank: 1,
        title: "로제 X 브루노 마스 'APT.' 틱톡 챌린지 1위",
        desc: "한국 술게임 아파트가 전 세계인을 사로잡은 비결과 신드롬 분석",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "에스파 신곡 'Whiplash' 쇠맛 댄스 챌린지",
        desc: "미니 5집 컴백과 동시에 음원 차트 1위, 독보적인 미래지향적 콘셉트",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&auto=format&fit=crop&q=60"
      }
    ],
    sports: [
      {
        rank: 1,
        title: "손흥민 햄스트링 부상 복귀전 어시스트",
        desc: "토트넘 캡틴 손흥민, 복귀와 동시에 날카로운 택배 크로스로 팀 승리 견인",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "이강인 PSG 리그 선발 풀타임 활약",
        desc: "파리 생제르맹 에이스 이강인, 날카로운 킬패스와 탈압박으로 평점 8.5 기록",
        time: "4시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=120&auto=format&fit=crop&q=60"
      }
    ],
    stock: [
      {
        rank: 1,
        title: "SK하이닉스 20만원 돌파 기대감",
        desc: "HBM3E 독점 공급 효과 톡톡, 반도체 슈퍼 사이클 주도주 굳히기",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "삼성전자 5만 전자 탈출 반등 모멘텀",
        desc: "외국인 순매수 전환과 HBM 퀄테스트 통과 기대감에 주가 반등 시도",
        time: "3시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=120&auto=format&fit=crop&q=60"
      }
    ]
  };

  const categoryNames = {
    enter: '엔터 종합',
    drama: '드라마',
    movie: '영화',
    music: '뮤직',
    sports: '스포츠 종합',
    baseball: '야구',
    soccer: '축구',
    stock: '증권',
    realty: '부동산',
    travel: '여행/맛집 종합',
    fashion: '패션/뷰티 종합',
    food: '리빙/푸드 종합',
    tech: '테크/IT 종합'
  };

  let activeCat = 'enter';
  let isExpanded = false;
  let currentModalItem = null;
  let toastTimer = null;

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

  window.openShortentsModal = function(encodedItem) {
    try {
      const item = typeof encodedItem === 'string' ? JSON.parse(decodeURIComponent(encodedItem)) : encodedItem;
      currentModalItem = item;

      const dialog = document.getElementById('shortentsDialog');
      const titleField = document.getElementById('shortentsTitleField');
      const status = document.getElementById('shortentsCopyStatus');
      const fallback = document.getElementById('shortentsCopyFallback');

      if (fallback) fallback.hidden = true;
      if (titleField) titleField.value = item.title || '';
      if (status) status.textContent = '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.';

      if (dialog) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
          dialog.style.display = 'block';
        }
      }

      // 팝업이 열릴 때 자동으로 제목 복사
      copyToClipboard(item.title || '', '숏텐츠 제목은 복사했어요. Claude 입력칸에 붙여넣으세요.');
    } catch (e) {
      console.error('Failed to open shortents modal:', e);
    }
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

  // 하위 호환성 유지용 함수
  window.startWritingFromShort = function(encodedTitle) {
    const title = decodeURIComponent(encodedTitle);
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

    let items = shortContentsData[activeCat] || shortContentsData.enter;
    const displayCount = isExpanded ? items.length : Math.min(items.length, 10);
    const visibleItems = items.slice(0, displayCount);

    container.innerHTML = visibleItems.map((item, idx) => {
      const serialized = encodeURIComponent(JSON.stringify(item));
      return `
        <div class="short-row-item">
          <div class="short-row-left">
            <span class="short-rank-num">${item.rank || (idx + 1)}</span>
            <img src="${item.thumb}" alt="${item.title}" class="short-thumb-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=60'">
            <div class="short-text-col">
              <h4 class="short-item-title" title="${item.title}">${item.title}</h4>
              <p class="short-item-desc" title="${item.desc}">${item.desc}</p>
              <div class="short-item-meta">
                <span>${item.time}</span>
                <span class="naver-badge-icon">${item.source || 'N'}</span>
              </div>
            </div>
          </div>
          <div class="short-action-col">
            <button type="button" class="btn-short-write" onclick="openShortentsModal('${serialized}')">글쓰기</button>
          </div>
        </div>
      `;
    }).join('');

    const moreBtn = document.getElementById('btnShortMore');
    if (moreBtn) {
      if (items.length <= 10) {
        moreBtn.style.display = 'none';
      } else {
        moreBtn.style.display = 'inline-block';
        moreBtn.textContent = isExpanded ? '접기' : '더보기';
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

    // 바깥 어두운 배경 클릭 시 닫기
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
        copyToClipboard(currentModalItem.title || '', '숏텐츠 제목을 복사했어요. Claude 입력칸에 붙여넣으세요.');
      };
    }

    // [기사 정보 전체 복사] 버튼
    const btnArticle = document.getElementById('btnCopyShortArticle');
    if (btnArticle) {
      btnArticle.onclick = function() {
        if (!currentModalItem) return;
        const catName = categoryNames[activeCat] || '엔터 종합';
        const text = `[키워드] ${currentModalItem.title || ''}\n[주제] ${catName}\n[관련 기사] ${currentModalItem.desc || ''}\n[출처/시간] 네이버 · ${currentModalItem.time || ''}\n※ 글 제목 맨 앞에 키워드를 그대로 넣으세요. 숏텐츠는 AI 생성 결과이므로 원문 기사로 사실을 확인하세요.`;
        copyToClipboard(text, '키워드와 기사 정보를 복사했어요. 글쓰기 도구에 붙여넣으세요.');
      };
    }

    // 글쓰기 도구 링크 클릭 시 모달 닫기
    const links = dialog.querySelectorAll('.shortents-tool-link');
    links.forEach(a => {
      a.addEventListener('click', function() {
        window.closeShortentsModal();
      });
    });
  }

  function initShortContents() {
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
        isExpanded = false;
        renderList();
      });
    });

    renderList();
    setupDialogEvents();

    // 현재 시간 표시 (예: 조회 15:40)
    const timeEl = document.getElementById('shortContentsTime');
    if (timeEl) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `조회 ${hh}:${mm}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShortContents);
  } else {
    initShortContents();
  }
})();
