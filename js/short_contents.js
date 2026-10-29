// =========================================================
// 실시간 숏텐츠 (Short Contents) 데이터 및 렌더러
// =========================================================
(function() {
  'use strict';

  const shortContentsData = {
    enter: [
      {
        rank: 1,
        title: "안은진 런닝맨 뽀뽀 논란 결론",
        desc: "'런닝맨' 안은진 뽀뽀 논란... \"성희롱 논란 생긴 수색에\" 시청자도 '문제없음'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "설인아 연우, 쇼트트랙 도전",
        desc: "설인아->연우, 이번엔 쇼트트랙 도전... '무쇠소녀단3' 티저 공개",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 3,
        title: "유재명 47세 득남, 유모돈 뜻 공개",
        desc: "'47세 득남' 유재명, 유아를 필두로 지었다가 온돌... '부모돈 데 담긴 뜻은?'",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 4,
        title: "최수종, 하희라 30년 가방 들기",
        desc: "최수종 또 남편들 공공의 적 됐다 ♥하희라 가방 30년째 들고 \"남자의 역할\" 강조 (12시엔)",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 5,
        title: "유해진 신변보호 해제·대출팀 표창",
        desc: "'신변보호 해제' 된 유해진, 일상으로..대출팀 표창 받는다 [스타이슈]",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 6,
        title: "하드 오브 비스트, 브래드 피트 영화 정보",
        desc: "하드 오브 비스트 정보 뜻 하파 평점 관람평 - 브래드 피트 군건 모던과 성은 사무 모임 영화",
        time: "2일 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 7,
        title: "BTS 아리랑 투어 아르헨티나 비하인드",
        desc: "[BTS 방탄소년단] 281027 오피셜 인스타그램 업데이트 (아리랑 투어 부에노스 아이레스 비하인드 사진 공개 ft. 아르헨티나)",
        time: "15시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 8,
        title: "엑스러브, 놀라움이 사랑으로 바뀌길",
        desc: "엑스러브 \"우리만의 길 외롭지만... 놀라움이 사랑으로 바뀌길\"(종합)",
        time: "1일 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 9,
        title: "유연석 서현진, 라이어 줄거리 인물관계도",
        desc: "유연석 서현진, 이 케미 10년 만! 진실공방 멜로 라이어 줄거리 인물관계도 정보",
        time: "16시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 10,
        title: "헤이지니 논란·이지혜 56평 집 공개",
        desc: "헤이지니 노출착시 논란에 이지혜도 불똥, 56평 집 공개했다가 역풍",
        time: "1시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=60"
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
        title: "에스파 신곡 '위플래시' 쇠맛 비트 중독",
        desc: "미니 5집 Whiplash 발매, 한층 더 강렬해진 에스파의 테크노 사운드",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120&auto=format&fit=crop&q=60"
      }
    ],
    sports: [
      {
        rank: 1,
        title: "손흥민 토트넘 복귀전 1골 유도 맹활약",
        desc: "웨스트햄전 선발 출전해 시즌 3호골 폭발, 부상 털고 에이스 면모 과시",
        time: "2시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60"
      },
      {
        rank: 2,
        title: "KIA 타이거즈 한국시리즈 우승 카운트다운",
        desc: "김도영 맹타와 양현종 호투 앞세워 광주 홈에서 통합 우승 도전",
        time: "3시간 전",
        source: "N",
        thumb: "https://images.unsplash.com/photo-1562077772-3ab121866815?w=120&auto=format&fit=crop&q=60"
      }
    ],
    stock: [
      {
        rank: 1,
        title: "SK하이닉스 3분기 사상 최대 영업이익 7조원",
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

  let activeCat = 'enter';
  let isExpanded = false;

  function renderList() {
    const container = document.getElementById('shortContentsList');
    if (!container) return;

    let items = shortContentsData[activeCat] || shortContentsData.enter;
    const displayCount = isExpanded ? items.length : Math.min(items.length, 10);
    const visibleItems = items.slice(0, displayCount);

    container.innerHTML = visibleItems.map((item, idx) => `
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
          <button type="button" class="btn-short-write" onclick="startWritingFromShort('${encodeURIComponent(item.title)}')">글쓰기</button>
        </div>
      </div>
    `).join('');

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

  window.startWritingFromShort = function(encodedTitle) {
    const title = decodeURIComponent(encodedTitle);
    if (typeof switchTab === 'function') {
      switchTab('prompt');
      setTimeout(() => {
        const input = document.getElementById('prompt-custom-keyword');
        if (input) {
          input.value = title;
          input.focus();
        }
      }, 200);
    }
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

    // 현재 시간 표시 (예: 조회 15:26)
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
