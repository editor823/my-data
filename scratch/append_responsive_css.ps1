$lines = [System.IO.File]::ReadAllLines('css/components.css')
$newBlock = @"

/* ==========================================================================
   📱 모바일 전면 반응형 미디어 쿼리 (@media (max-width: 768px))
   - 상단 지표 바 (KOSPI/KOSDAQ/USD) 3열 1fr 자동 리사이징 & 모바일 폰트 최적화
   - 6대 서브 모듈 탭 가로 스크롤 컨테이너 최적화
   - 2단 분할 레이아웃(좌측 리스트 + 우측 리포트) 1열 스택 수직 전환
   - 카드 및 박스 고정 폭 해제 및 box-sizing: border-box 안전 패딩 적용
   - 텍스트 줄바꿈 단어 분절 방지 (word-break: keep-all; overflow-wrap: break-word)
   ========================================================================== */

/* 1. 글로벌 공통 텍스트 단어 단위 개행 및 오버플로우 방지 */
h1, h2, h3, h4, h5, h6,
.kc-main-title,
.hero-title,
.card-title,
.kc-card-t-val,
.kc-guide-text,
p, li {
  word-break: keep-all;
  overflow-wrap: break-word;
}

/* 2. 상단 지표 바 기본 스타일 (데스크톱 및 모바일 공통 기반) */
.stock-market-indicators {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: stretch;
}

.stock-indicator-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 16px;
  border-radius: 12px;
  text-align: center;
  min-width: 120px;
  flex: 1;
  box-sizing: border-box;
}

.stock-indicator-title {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 700;
  white-space: nowrap;
}

.stock-indicator-val {
  font-size: 1.18rem;
  font-weight: 900;
  margin: 2px 0;
  line-height: 1.2;
}

.stock-indicator-diff {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

/* 3. 시황 기법 및 글로벌 뉴스 그리드 기본 스타일 */
.stock-technique-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}

/* 4. 모바일 화면 최적화 (768px 이하) */
@media (max-width: 768px) {
  /* [헤더 및 메인 패딩 축소] */
  .main-content {
    padding: 16px 12px 40px !important;
  }

  .kc-header-box {
    padding: 16px 14px !important;
    border-radius: 16px !important;
    margin-bottom: 16px !important;
  }

  .kc-header-top-row {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 14px !important;
    margin-bottom: 14px !important;
  }

  .kc-main-title {
    font-size: 1.35rem !important;
    line-height: 1.3 !important;
  }

  /* [상단 지표 바 3열 자동 리사이징 & 폰트 소폭 축소] */
  .stock-market-indicators {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 6px !important;
    width: 100% !important;
  }

  .stock-indicator-card {
    min-width: 0 !important;
    padding: 8px 6px !important;
    border-radius: 10px !important;
    width: 100% !important;
  }

  .stock-indicator-title {
    font-size: 0.65rem !important;
    letter-spacing: -0.5px !important;
  }

  .stock-indicator-val {
    font-size: 0.96rem !important;
    margin: 1px 0 !important;
  }

  .stock-indicator-diff {
    font-size: 0.65rem !important;
    letter-spacing: -0.4px !important;
  }

  /* [상단 6대 서브 탭 내비게이션 터치 가로 스크롤 컨테이너] */
  .stock-subtabs-scroll-wrap {
    width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
    margin-top: 14px !important;
    padding-bottom: 6px !important;
  }

  .stock-subtabs-scroll-wrap::-webkit-scrollbar {
    display: none !important;
    height: 0 !important;
    width: 0 !important;
  }

  .stock-subtabs-grid {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    gap: 8px !important;
    width: max-content !important;
    min-width: 100% !important;
  }

  .stock-sub-tab {
    padding: 9px 13px !important;
    font-size: 0.8rem !important;
    border-radius: 10px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    word-break: keep-all !important;
  }

  /* [2단 분할 레이아웃 -> 1열 스택 수직 정렬 전환] */
  .kc-dual-layout {
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
    width: 100% !important;
  }

  .kc-list-col {
    width: 100% !important;
    max-width: 100% !important;
    max-height: 480px !important;
    padding-right: 0 !important;
  }

  .kc-detail-card {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* [모든 카드 및 박스 고정 너비 해제 및 100% 안전 적용] */
  .kc-box-white-card,
  .kc-card,
  .card,
  .kc-chart-section-clean {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 14px 14px !important;
  }

  /* [그리드 레이아웃 1열 스택 전환] */
  #stock-calendar-grid,
  .stock-technique-grid,
  #global-news-container {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
  }

  /* [4열 통계 카드 2열 배치] */
  .kc-4metrics-grid-clean {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }

  .kc-metric-card-clean {
    padding: 10px 12px !important;
  }

  .kc-card-t-val {
    font-size: 1.18rem !important;
  }

  /* [입력 폼 및 필터 칩 컨테이너 모바일 최적화] */
  .imggen-style-chip,
  .stock-filter-chip {
    padding: 5px 10px !important;
    font-size: 0.74rem !important;
    white-space: nowrap !important;
  }

  /* [모달 팝업 모바일 최적화] */
  .modal-content,
  .kc-modal-box {
    width: 95% !important;
    max-width: 95% !important;
    padding: 18px 16px !important;
  }
}

/* 5. 초소형 스마트폰 화면 (360px ~ 400px) 극세 대응 */
@media (max-width: 400px) {
  .stock-indicator-title {
    font-size: 0.6rem !important;
  }

  .stock-indicator-val {
    font-size: 0.88rem !important;
  }

  .stock-indicator-diff {
    font-size: 0.6rem !important;
  }

  .kc-4metrics-grid-clean {
    grid-template-columns: 1fr !important;
  }
}
"@

$content = [System.IO.File]::ReadAllText('css/components.css')
$content = $content.TrimEnd() + "`r`n`r`n" + $newBlock
[System.IO.File]::WriteAllText('css/components.css', $content, [System.Text.Encoding]::UTF8)
Write-Output "Appended responsive media queries to css/components.css successfully!"
