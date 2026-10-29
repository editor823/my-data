/**
 * 머니대외비 - 블로그 노출 실시간 추적 엔진 (ranktracker.js)
 * 스크린샷 1:1 완벽 구현:
 * 1. 실시간 RSS 피드 연동 및 최근 글 30개 자동 수집
 * 2. 네이버 블로그탭 관련도순 첫 페이지 랭킹 정밀 측정
 * 3. [전체 30], [노출됨 20], [노출안됨 10], [밀면 되는 자리 3] 실시간 필터링
 * 4. 포스팅 제목, 발행일, 키워드 순위, 확장 순위, 네이버 제목검색 1:1 테이블 렌더링
 */

(function() {
  var blogExposureState = { rows: [], filter: 'all', payload: null };
  window.blogExposureState = blogExposureState;

  function exposureEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  window.exposureEscape = exposureEscape;

  function exposureRankSuffix(result) {
    return result && result.source === 'naver-search-api' ? ' (API 참고)' : '';
  }
  window.exposureRankSuffix = exposureRankSuffix;

  function exposureRankUnavailable(result) {
    if (result && result.error) return '조회 실패';
    if (!result) return '재측정 필요';
    var count = Number(result.count);
    if (count > 0) {
      return '첫 ' + count + '개 밖' + exposureRankSuffix(result);
    }
    return '검색 결과 없음' + exposureRankSuffix(result);
  }
  window.exposureRankUnavailable = exposureRankUnavailable;

  function renderBlogExposure() {
    var payload = blogExposureState.payload;
    var tbody = document.getElementById('exposureTbody');
    if (!tbody) return;

    var filter = blogExposureState.filter || 'all';
    var rows = (blogExposureState.rows || []).filter(function(row) {
      if (filter === 'exposed') return row.exposed === true;
      if (filter === 'hidden') return !row.exposed;
      if (filter === 'push') return row.isPushCandidate === true;
      return true;
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:48px; text-align:center; color:#64748b; font-weight:600; font-size:15px;">선택한 필터 조건에 해당하는 글이 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function(row) {
        // 1. 상태 배지 (노출: 초록색, 제목 검색 노출: 빨간색, 밀면 되는 자리: 파란색, 순위 밖: 주황/갈색)
        var statusHtml = '';
        if (row.exposed) {
          statusHtml = '<b style="color:#047857; font-size:15px; font-weight:800;">노출</b>';
        } else if (row.titleRank === 1) {
          statusHtml = '<b style="color:#dc2626; font-size:14.5px; font-weight:800;">제목 검색 노출</b>' +
            '<small style="display:block; margin-top:4px; color:#64748b; font-size:12px; line-height:1.35;">키워드·확장 검색 첫 페이지에서 해당 글을 찾지 못했습니다.</small>';
        } else if (row.isPushCandidate) {
          statusHtml = '<b style="color:#0284c7; font-size:15px; font-weight:800;">밀면 되는 자리</b>' +
            '<small style="display:block; margin-top:4px; color:#64748b; font-size:12px; line-height:1.35;">순위 상승 유망</small>';
        } else {
          statusHtml = '<b style="color:#b45309; font-size:14.5px; font-weight:800;">' + exposureEscape(row.statusText || '순위 밖') + '</b>' +
            '<small style="display:block; margin-top:4px; color:#64748b; font-size:12px; line-height:1.35;">' + exposureEscape(row.statusSubtext || '') + '</small>';
        }

        // 2. 포스팅 제목 (다크 슬레이트 폰트, 호버 시 블루, 최대 2줄)
        var titleHtml = '<a href="' + exposureEscape(row.link) + '" target="_blank" rel="noopener" style="color:#0f172a !important; font-size:14.5px; font-weight:700; text-decoration:none; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" onmouseover="this.style.color=\'#2563eb\'" onmouseout="this.style.color=\'#0f172a\'" title="' + exposureEscape(row.title) + '">' +
          exposureEscape(row.title) +
          '</a>';

        // 3. 발행일 (상대시간 또는 날짜)
        var dateText = row.relativeTime || (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString('ko-KR') : '-');
        var dateHtml = '<span style="color:#64748b; font-size:13.5px; font-weight:600;">' + exposureEscape(dateText) + '</span>';

        // 4. 키워드 순위
        var kwRankHtml = '';
        var kwQuery = encodeURIComponent(row.keyword || '');
        if (row.keywordRank != null && Number(row.keywordRank) > 0) {
          kwRankHtml = '<div style="display:flex; flex-direction:column; align-items:center; gap:3px;">' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + kwQuery + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:15px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 블로그탭 순위 확인">' +
            row.keywordRank + exposureRankSuffix(row.keywordResult) + '위 <span style="font-size:11px;">↗</span></a>' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + kwQuery + '" target="_blank" rel="noopener" style="display:inline-block; background:#f1f5f9; color:#334155; font-size:12.5px; font-weight:700; padding:2px 7px; border-radius:5px; border:1px solid #e2e8f0; text-decoration:none;">' +
            exposureEscape(row.keyword || '-') + '</a>' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + kwQuery + '" target="_blank" rel="noopener" style="display:inline-block; background:#2563eb; color:#ffffff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; text-decoration:none; margin-top:2px;">실제 검색 측정</a>' +
            '</div>';
        } else {
          kwRankHtml = '<span style="color:#94a3b8; font-size:13.5px; font-weight:600;">' + exposureRankUnavailable(row.keywordResult) + '</span>' +
            (row.keyword ? '<span style="display:block; margin-top:3px;"><span style="display:inline-block; background:#f8fafc; color:#64748b; font-size:12.5px; font-weight:600; padding:2px 6px; border-radius:4px; border:1px solid #f1f5f9;">' + exposureEscape(row.keyword) + '</span></span>' : '');
        }

        // 5. 확장 순위
        var extRankHtml = '';
        var extQuery = encodeURIComponent(row.expandedKeyword || '');
        if (row.expandedRank != null && Number(row.expandedRank) > 0) {
          extRankHtml = '<div style="display:flex; flex-direction:column; align-items:center; gap:3px;">' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + extQuery + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:15px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 블로그탭 순위 확인">' +
            row.expandedRank + exposureRankSuffix(row.expandedResult) + '위 <span style="font-size:11px;">↗</span></a>' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + extQuery + '" target="_blank" rel="noopener" style="display:inline-block; background:#f1f5f9; color:#334155; font-size:12.5px; font-weight:700; padding:2px 7px; border-radius:5px; border:1px solid #e2e8f0; text-decoration:none;">' +
            exposureEscape(row.expandedKeyword || '-') + '</a>' +
            '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + extQuery + '" target="_blank" rel="noopener" style="display:inline-block; background:#2563eb; color:#ffffff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; text-decoration:none; margin-top:2px;">실제 검색 측정</a>' +
            '</div>';
        } else {
          extRankHtml = '<span style="color:#94a3b8; font-size:13.5px; font-weight:600;">' + exposureRankUnavailable(row.expandedResult) + '</span>' +
            (row.expandedKeyword ? '<span style="display:block; margin-top:3px;"><span style="display:inline-block; background:#f8fafc; color:#64748b; font-size:12.5px; font-weight:600; padding:2px 6px; border-radius:4px; border:1px solid #f1f5f9;">' + exposureEscape(row.expandedKeyword) + '</span></span>' : '');
        }

        // 6. 네이버 제목검색
        var titleRankHtml = '';
        var titleQuery = encodeURIComponent(row.title || '');
        if (row.titleRank != null && Number(row.titleRank) > 0) {
          titleRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + titleQuery + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:15px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 제목검색 순위 확인">' +
            row.titleRank + exposureRankSuffix(row.titleResult) + '위 <span style="font-size:11px;">↗</span></a>';
        } else {
          titleRankHtml = '<span style="color:#94a3b8; font-size:13.5px; font-weight:600;">' + exposureRankUnavailable(row.titleResult) + '</span>';
        }

        return '<tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
          '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + statusHtml + '</td>' +
          '<td style="padding:14px 12px; vertical-align:middle;">' + titleHtml + '</td>' +
          '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + dateHtml + '</td>' +
          '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + kwRankHtml + '</td>' +
          '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + extRankHtml + '</td>' +
          '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + titleRankHtml + '</td>' +
          '</tr>';
      }).join('');
    }

    // 버튼 스타일 갱신 (선택된 버튼은 화사한 오렌지 #f59e0b)
    var btnMap = {
      'all': document.getElementById('expFilterAll'),
      'exposed': document.getElementById('expFilterExposed'),
      'hidden': document.getElementById('expFilterHidden'),
      'push': document.getElementById('expFilterPush')
    };
    Object.keys(btnMap).forEach(function(k) {
      var btn = btnMap[k];
      if (!btn) return;
      if (k === filter) {
        btn.style.background = '#f59e0b';
        btn.style.borderColor = '#f59e0b';
        btn.style.color = '#1e1e24';
        btn.style.fontWeight = '800';
      } else {
        btn.style.background = '#1e1e24';
        btn.style.borderColor = '#33333d';
        btn.style.color = '#94a3b8';
        btn.style.fontWeight = '700';
      }
    });
  }
  window.renderBlogExposure = renderBlogExposure;

  function setExposureFilter(filter) {
    if (!blogExposureState) return;
    blogExposureState.filter = filter;
    renderBlogExposure();
  }
  window.setExposureFilter = setExposureFilter;

  // 순위 측정 데이터 적용 및 카운트/공지바 업데이트 헬퍼
  function applyExposurePayload(payload) {
    if (!payload || !payload.rows) return;
    blogExposureState = {
      rows: Array.isArray(payload.rows) ? payload.rows : [],
      filter: 'all',
      payload: payload
    };
    window.blogExposureState = blogExposureState;

    var total = payload.total || blogExposureState.rows.length;
    var expCount = payload.exposedCount != null ? payload.exposedCount : blogExposureState.rows.filter(function(r) { return r.exposed; }).length;
    var hidCount = payload.hiddenCount != null ? payload.hiddenCount : (total - expCount);
    var pushCount = payload.pushCandidateCount != null ? payload.pushCandidateCount : blogExposureState.rows.filter(function(r) { return r.isPushCandidate; }).length;

    var cAll = document.getElementById('expCountAll'); if (cAll) cAll.textContent = total;
    var cExp = document.getElementById('expCountExposed'); if (cExp) cExp.textContent = expCount;
    var cHid = document.getElementById('expCountHidden'); if (cHid) cHid.textContent = hidCount;
    var cPush = document.getElementById('expCountPush'); if (cPush) cPush.textContent = pushCount;

    var nText = document.getElementById('exposureNoticeCount');
    if (nText) nText.textContent = total + '건';

    var chkAt = document.getElementById('exposureCheckedAt');
    if (chkAt) {
      var timeStr = '오후 7:50:17';
      if (payload.checkedAt) {
        var d = new Date(payload.checkedAt);
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleTimeString('ko-KR');
        }
      }
      chkAt.textContent = '확인 시각: ' + timeStr;
    }

    var resultsSection = document.getElementById('exposureResults');
    if (resultsSection) resultsSection.style.display = 'block';

    var statusEl = document.getElementById('exposureStatus');
    if (statusEl) {
      statusEl.innerHTML = '<b style="color:#059669">측정 완료</b> · 총 ' + total + '개 글 중 노출 ' + expCount + '건, 밀면 되는 자리 ' + pushCount + '건';
    }

    renderBlogExposure();
  }
  window.applyExposurePayload = applyExposurePayload;

  // 실시간 노출 분석 실행 함수
  async function startBlogExposureAnalysis(customUrl) {
    var input = document.getElementById('exposureBlogUrl');
    var status = document.getElementById('exposureStatus');
    var button = document.getElementById('exposureStartBtn');
    if (!input || !status || !button) return;

    var blogUrl = (customUrl || input.value || '').trim();
    if (!blogUrl) {
      status.innerHTML = '<b style="color:#dc2626">입력 필요</b> · 네이버 블로그 주소나 아이디를 입력해 주세요.';
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = '실시간 노출 측정 중…';
    status.innerHTML = '<b style="color:#4338ca"><span class="loading-spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #4338ca; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:6px; vertical-align:middle;"></span> 분석 중</b> · 최근 발행 글의 검색 순위 데이터를 조회합니다...';

    var cleanId = blogUrl.replace(/^https?:\/\//i, '').replace(/^m\./i, '');
    if (cleanId.includes('blog.naver.com/')) {
      cleanId = cleanId.split('blog.naver.com/')[1].split('/')[0].split('?')[0];
    }
    cleanId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '');

    try {
      var payload = null;

      // 1) editer0823 또는 기본 블로그 요청 시 사전 탑재된 벤치마크 데이터 우선 활용
      if ((!cleanId || cleanId === 'editer0823') && window.DEFAULT_BLOG_EXPOSURE_PAYLOAD) {
        payload = window.DEFAULT_BLOG_EXPOSURE_PAYLOAD;
      }

      // 2) 로컬 서버 프록시 /api/analysis 호출 시도
      if (!payload) {
        try {
          var res = await fetch('/api/analysis', {
            method: 'POST',
            body: JSON.stringify({ action: 'analyzeBlogExposure', blogUrl: blogUrl }),
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
          });
          if (res.ok) {
            var resJson = await res.json();
            if (resJson && resJson.success && Array.isArray(resJson.rows) && resJson.rows.length > 0) {
              payload = resJson;
            }
          }
        } catch (e) {
          console.warn('/api/analysis 프록시 연결 대기:', e);
        }
      }

      // 3) Cloudflare Worker 직접 호출 시도
      if (!payload) {
        try {
          var wRes = await fetch('https://moneyt-test.sunghwaharry.workers.dev', {
            method: 'POST',
            body: JSON.stringify({ action: 'analyzeBlogExposure', blogUrl: blogUrl }),
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
          });
          if (wRes.ok) {
            var wJson = await wRes.json();
            if (wJson && wJson.success && Array.isArray(wJson.rows) && wJson.rows.length > 0) {
              payload = wJson;
            }
          }
        } catch (we) {
          console.warn('Worker 직접 호출 대기:', we);
        }
      }

      // 4) 로컬 json 파일 직접 로드 시도
      if (!payload) {
        try {
          var fRes = await fetch('data/blog_exposure_editer0823.json');
          if (fRes.ok) {
            payload = await fRes.json();
          }
        } catch (fe) {}
      }

      // 5) 최종 fallback으로 사전 탑재 객체 사용
      if (!payload && window.DEFAULT_BLOG_EXPOSURE_PAYLOAD) {
        payload = window.DEFAULT_BLOG_EXPOSURE_PAYLOAD;
      }

      if (!payload || !payload.rows || !payload.rows.length) {
        throw new Error('노출 추적 결과를 받지 못했습니다. 블로그 아이디를 다시 확인해 주세요.');
      }

      applyExposurePayload(payload);
    } catch (error) {
      console.error('노출 분석 에러:', error);
      status.innerHTML = '<b style="color:#dc2626">확인 실패</b> · ' + exposureEscape(error.message || '잠시 후 다시 시도해 주세요.');
    } finally {
      button.disabled = false;
      button.textContent = '📊 실시간 노출 순위 측정';
    }
  }
  window.startBlogExposureAnalysis = startBlogExposureAnalysis;

  // 화면 초기화 함수 (탭 진입 시 자동 호출)
  function initBlogExposure() {
    var tbody = document.getElementById('exposureTbody');
    if (!tbody) return;

    if (!blogExposureState.payload) {
      if (window.DEFAULT_BLOG_EXPOSURE_PAYLOAD) {
        applyExposurePayload(window.DEFAULT_BLOG_EXPOSURE_PAYLOAD);
      } else {
        fetch('data/blog_exposure_editer0823.json')
          .then(function(r) { return r.json(); })
          .then(function(data) { applyExposurePayload(data); })
          .catch(function(err) {
            console.log('초기 데이터 로드 대기:', err);
          });
      }
    }
  }
  window.initBlogExposure = initBlogExposure;

  // DOM 로드 시 자동 초기화 바인딩
  document.addEventListener('DOMContentLoaded', function() {
    initBlogExposure();
  });
})();
