
//<![CDATA[
  // [중요 설정] Cloudflare Worker 공개 API URL
  const WORKER_API_URL = '/api/analysis';
  const TEST_KEYWORD_CENTER_API_URL = 'https://moneyt-test.sunghwaharry.workers.dev';

  let currentAnalyzerData = [];
  let currentTrendingData = [];
  let selectedTier = '전체';
  let filteredAnalyzerData = [];
  let currentGoldenRows = [];
  let selectedGoldenTier = '전체';
  let selectedGoldenChannel = 'naver';
  let homeTrendCache = {};

  // 황금키워드는 화면에 극소수만 표시하고, 모든 분석 화면에서 같은 기준을 사용합니다.
  const GOLDEN_MAX_RESULTS = 50;
  const GOLDEN_MIN_SEARCH_VOLUME = 100;
  const GOLDEN_MAX_COMPETITION_RATIO = 20.0; // 애드센스용 상한. 네이버용은 5.0 이하만 사용
  const ANALYZER_RESULT_LIMIT = 40;

  function toFiniteNumber(value) {
    const n = Number(String(value == null ? '' : value).replace(/[ ,]/g, ''));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function formatNumber(value) {
    return toFiniteNumber(value).toLocaleString('ko-KR');
  }

  // Worker 응답의 필드명이 달라도 하나의 기준으로 변환합니다.
  // 검색량은 PC+모바일, 기회지수는 검색량÷문서수로 고정합니다.
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function normalizeKeywordRow(row) {
    const pc = toFiniteNumber(row.pc ?? row.pcVolume ?? row.monthlyPc);
    const mobile = toFiniteNumber(row.mobile ?? row.mobileVolume ?? row.monthlyMobile);
    const suppliedTotal = toFiniteNumber(row.total ?? row.searchVolume ?? row.monthlySearchVolume);
    const total = (pc > 0 || mobile > 0) ? pc + mobile : suppliedTotal;
    const blogRaw = row.blogCount ?? row.documentCount ?? row.docs ?? row.blogDocuments;
    const blogCountUnavailable = Boolean(row.blogCountUnavailable || row.blogCountError || blogRaw === undefined || blogRaw === null || blogRaw === '');
    const blogCount = blogCountUnavailable ? 0 : toFiniteNumber(blogRaw);
    const opportunity = blogCountUnavailable ? null : (blogCount > 0 ? total / blogCount : (total > 0 ? 999999 : 0));
    const competitionRatio = blogCountUnavailable ? null : (total > 0 ? blogCount / total : 0);
    const goldenScore = Number.isFinite(Number(row.goldenScore))
      ? Number(row.goldenScore)
      : Math.round(Math.min(100, 40 + (1 - Math.min(competitionRatio, 0.5)) * 45 + Math.min(15, Math.log10(Math.max(total, 1)) * 3)));
    const tier = row.tier || tierFromVolume(total);
    const gradeMap = { '레전드':'SSR', '챌린저':'SSS', '마스터':'SS', '전문가':'S', '고급자':'A', '중급자':'B', '초보자':'B' };
    const grade = row.grade || gradeMap[tier] || 'B';
    // 과거 공용 캐시에 남은 dynamic-trending 값도 오늘의 실시간 후보 보드에서
    // 즉시 표시되도록 네이버 채널로 호환 처리합니다. 새 Worker 데이터는 naver로 내려옵니다.
    const suppliedChannel = String(row.channel || '');
    const channel = /^(naver|adsense)$/.test(suppliedChannel)
      ? suppliedChannel
      : (suppliedChannel === 'dynamic-trending' ? 'naver' : classifyKeywordChannel(row, competitionRatio));
    const searchVolumeUnavailable = Boolean(row.searchVolumeUnavailable || row.searchVolumeError);
    const searchVolumeError = String(row.searchVolumeError || '검색광고 API 응답을 받지 못했습니다.');
    return { ...row, pc, mobile, total, searchVolumeUnavailable, searchVolumeError, blogCount, blogCountUnavailable, ratio: searchVolumeUnavailable ? null : opportunity, competitionRatio: searchVolumeUnavailable ? null : competitionRatio, goldenScore, tier, grade, channel };
  }

  function tierFromVolume(total) {
    if (total >= 500000) return '레전드';
    if (total >= 100000) return '챌린저';
    if (total >= 50000) return '마스터';
    if (total >= 10000) return '전문가';
    if (total >= 2000) return '고급자';
    if (total >= 500) return '중급자';
    return '초보자';
  }

  function classifyKeywordChannel(row, ratio) {
    const text = String((row && row.keyword) || row || '').replace(/\s+/g, '');
    if (!text || ratio == null) return '';
    if (/^(보험|자동차보험|실비보험|실손보험|대출|신용카드|체크카드|카드|연금|세금|병원|여행|다이어트|부동산|주식|취업|교육)$/.test(text)) return '';
    const highValue = /(보험|실손|실비|대출|금리|신용점수|카드|세금|소득세|부가세|양도세|상속세|증여세|연말정산|변호사|법률|소송|이혼|파산|회생|병원|치과|임플란트|수술|시술|탈모|다이어트)/.test(text);
    const commercialPurpose = /(보장|보장범위|청구|보험금|보험료|갱신|해지|가입|조건|면책|비교|추천|가격|비용|견적|한도|금리|상환|발급|혜택|연회비|신청|환급|공제|신고|상담|수임료|치료|수술비|후기|부작용|기간|방법)/.test(text);
    const blogIntent = /(방법|후기|추천|가격|비용|비교|신청|조건|자격|준비물|발급|재발급|사용처|가맹점|조회|지원|환급|혜택|계산|일정|대상|갱신|할인|여행|육아|교육|취업|요금|급여|오류|에러|안됨|실패|해결|정리|주의사항|지급일)/.test(text);
    if (row && row.sourceType === '실시간 후보' && text.length >= 4) return 'naver';
    if (highValue && commercialPurpose && ratio <= 20.0) return 'adsense';
    if (blogIntent && ratio <= 5.0) return 'naver';
    return '';
  }

  function goldenVerdict(row) {
    if (row.blogCountUnavailable || row.competitionRatio == null) return { text:'확인 필요', cls:'watch', help:'블로그 문서수를 불러오지 못해 경쟁도를 계산할 수 없습니다.' };
    if (row.competitionRatio <= 0.5) return { text:'경쟁 매우 낮음', cls:'now', help:'검색량 대비 문서수가 매우 적은 구간입니다. 실제 검색결과를 확인한 뒤 빠르게 선점해 보세요.' };
    if (row.competitionRatio <= 2.0) return { text:'경쟁 낮음', cls:'recommend', help:'비교적 도전하기 좋은 구간입니다. 상위 글의 최신성과 품질을 확인하세요.' };
    if (row.competitionRatio <= 5.0) return { text:'경쟁 보통', cls:'watch', help:'제목과 본문 구성을 차별화하면 활용할 수 있는 구간입니다.' };
    return { text:'경쟁 높음', cls:'hard', help:'문서가 많은 구간입니다. 작성 금지가 아니라 검색 의도와 수익성을 더 꼼꼼히 확인하라는 참고 표시입니다.' };
  }

  function normalizeKeywordRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(normalizeKeywordRow)
      .filter(row => row.keyword && row.total >= 0 && row.blogCount >= 0);
  }

  function selectGoldenRows(rows) {
    return normalizeKeywordRows(rows)
      .filter(row => row.total >= (row.sourceType === '실시간 후보' ? 18 : GOLDEN_MIN_SEARCH_VOLUME)
        && !row.blogCountUnavailable
        && row.competitionRatio != null
        && ((row.channel === 'adsense' && row.competitionRatio <= 20.0)
          || (row.channel === 'naver' && (/실시간/.test(String(row.sourceType || '')) || row.competitionRatio <= 5.0)))
        && (row.channel === 'adsense' || row.channel === 'naver')
        && !/(^|\s)(zum|줌)(\s|$)|롯데온|주가|증권|코스피|코스닥|대통령|장관|국회의원|민주당|국민의힘|대표 동일|신임 대표|수사|구속|재판|사망|별세|투병|사고|광역시|시청|군청|축구|야구|선수|감독|승리|패배|복귀|속보|뉴스/i.test(row.keyword))
      .sort((a, b) => Number(b.sourceType === '실시간 후보') - Number(a.sourceType === '실시간 후보')
        || Number(Boolean(b.isLiveSeed)) - Number(Boolean(a.isLiveSeed))
        || toFiniteNumber(b.trendMomentum) - toFiniteNumber(a.trendMomentum)
        || Number(a.blogCountUnavailable) - Number(b.blogCountUnavailable)
        || (a.competitionRatio == null ? 999999 : a.competitionRatio) - (b.competitionRatio == null ? 999999 : b.competitionRatio)
        || b.goldenScore - a.goldenScore
        || b.total - a.total)
      .slice(0, GOLDEN_MAX_RESULTS);
  }

    function exportCSV(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    let csv = [];
    if(tableId==='excelAnalyzerTable'){
      const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
      csv.push(['순서','키워드','총 검색량','블로그 문서','기회지수','체급','조회 상태 / 오류 원인'].map(quote).join(','));
      excelResults.forEach((r,i)=>csv.push([i+1,r.keyword,r.searchVolumeUnavailable?'조회 실패':r.total,r.blogCountUnavailable?'조회 실패':r.blogCount,r.searchVolumeUnavailable||r.blogCountUnavailable||!Number.isFinite(Number(r.ratio))?'-':Number(r.ratio).toFixed(2),r.searchVolumeUnavailable?'조회 실패':r.tier,[r.searchVolumeUnavailable?r.searchVolumeError:'',r.blogCountUnavailable?r.blogCountError:''].filter(Boolean).join(' / ')||'정상'].map(quote).join(',')));
    }
    const rows = tableId==='excelAnalyzerTable'?[]:table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll('td, th');
      if (cols.length === 1 && cols[0].colSpan > 1) continue; // Skip loading or error rows
      for (let j = 0; j < cols.length; j++) {
        let text = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, ' ').trim();
        if (text === '🔍 분석' || text === '삭제' || text === '엑셀 다운로드') continue;
        row.push('"' + text.replace(/"/g, '""') + '"');
      }
      if (row.length > 0) csv.push(row.join(','));
    }
    if (csv.length <= 1) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }
    const csvContent = '\uFEFF' + csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const d = new Date();
    const dateStr = d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2);
    link.setAttribute('download', `키워드분석_${dateStr}.csv`);
    const previousLink=document.getElementById('csvDownload-'+tableId);
    if(previousLink){URL.revokeObjectURL(previousLink.href);previousLink.remove();}
    link.id='csvDownload-'+tableId;
    link.textContent='CSV 파일 저장 · 다운로드가 시작되지 않으면 클릭하세요';
    link.style.cssText='display:block;margin:12px 0;color:#047857;font-weight:700;text-decoration:underline';
    const downloadHost=tableId==='excelAnalyzerTable'?document.getElementById('excelProgressBox'):table.parentElement;
    downloadHost.appendChild(link);
    link.click();
  }

    async function loadWeeklyPageContent(force) {
    const target = document.getElementById('kcWeeklyPageContent');
    if (!target) return;
    if (!force && (target.dataset.loaded === '1' || target.dataset.loading === '1')) return;
    target.dataset.loading = '1';
    target.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#64748b;"><i class="fa-solid fa-spinner fa-spin" style="font-size:26.667px;color:#2563eb;margin-bottom:12px;display:block;"></i>이번주 머니대외비 추천 애드센스 키워드를 불러오는 중입니다...</div>';
    try {
      let html = '';
      const pageResponse = await fetch('/p/blog-page_23.html', {cache:'no-store'});
      if (pageResponse.ok) html = await pageResponse.text();

      if (!html) throw new Error('추천 페이지 본문을 불러오지 못했습니다.');

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const postBody = parsed.querySelector('.post-body') || parsed.querySelector('.entry-content') || parsed.body;
      if (!postBody) throw new Error('추천 페이지 본문을 찾지 못했습니다.');

      const weeklyContainer = postBody.querySelector('#moneyt-weekly-adsense') || postBody;
      const grid = weeklyContainer.querySelector('div[style*="grid"]') || weeklyContainer;

      // post-body 내 모든 추천 카드(추천 1~5 전체)를 그리드에 통합 배치
      const allArticles = Array.from(postBody.querySelectorAll('article'));
      if (grid && allArticles.length > 0) {
        allArticles.forEach(function(art) {
          art.style.marginTop = '';
          if (!grid.contains(art)) {
            grid.appendChild(art);
          }
        });
      }

      // 빈 문단 및 업데이트 마커 정리
      Array.from(weeklyContainer.querySelectorAll('p,div,span')).forEach(function(el) {
        const text = String(el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!el.children.length && (/^업데이트\s*:\s*\[/.test(text) || (!text && !el.getAttribute('style')))) {
          el.remove();
        }
      });

      target.innerHTML = weeklyContainer.innerHTML || postBody.innerHTML;
      delete target.dataset.weeklyFormatted;
      window.formatWeeklyPicks(target);
      target.dataset.loaded = '1';
    } catch (error) {
      target.innerHTML = '<div style="padding:22px 20px;border:1px solid #fecaca;border-radius:14px;background:#fff1f2;color:#991b1b;line-height:1.75;text-align:center;">' +
        '<b>주간 추천 페이지를 불러오는 데 지연이 발생했습니다.</b><br/>' +
        '<span style="font-size:15.667px;color:#b91c1c;">네트워크 상태에 따라 잠시 후 다시 주간 추천 탭을 눌러주시거나 아래 링크로 바로 확인하실 수 있습니다.</span><br/>' +
        '<a href="/p/blog-page_23.html" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:#ffffff!important;font-weight:800;padding:10px 18px;border-radius:8px;text-decoration:none;margin-top:12px;font-size:15.667px;">👉 이번주 머니대외비 추천 페이지 바로가기 ↗</a>' +
        '</div>';
      delete target.dataset.loaded;
    } finally {
      delete target.dataset.loading;
    }
  }
  window.loadWeeklyPageContent = loadWeeklyPageContent;

  var blogExposureState = { rows:[], filter:'all', payload:null };
  function exposureRankSuffix(result){return result&&result.source==='naver-search-api'?' (API 참고)':'';}
function exposureRankUnavailable(result){return result&&result.error?'조회 실패':result?(Number(result.count)?'첫 '+Number(result.count)+'개 밖'+exposureRankSuffix(result):'검색 결과 없음'+exposureRankSuffix(result)):'재측정 필요';}
function exposureEscape(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function exposureRankText(value) { var rank=Number(value); return rank>0 ? '<b style="color:#2563eb">'+rank+'위</b>' : '<span style="color:#94a3b8">100위 밖</span>'; }
  function exposureDate(value) { var date=new Date(value); if(!value || isNaN(date.getTime())) return '-'; return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
  function exposureSummaryCard(label,value,color,sub) { return '<article style="padding:15px 16px;border:1px solid #dbe3ef;border-radius:15px;background:#fff"><small style="color:#64748b">'+exposureEscape(label)+'</small><b style="display:block;margin-top:5px;color:'+color+';font-size:26.667px">'+exposureEscape(value)+'</b><span style="display:block;margin-top:3px;color:#94a3b8;font-size:12.667px">'+exposureEscape(sub||'')+'</span></article>'; }
    window.copyExposureTag = function(tag) {
    if (!tag) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(tag).then(function() {
        alert('태그가 복사되었습니다: ' + tag);
      }).catch(function() {
        prompt('태그 복사:', tag);
      });
    } else {
      prompt('태그 복사:', tag);
    }
  };

  window.setExposureFilter = function(filter) {
    if (!blogExposureState) return;
    blogExposureState.filter = filter;
    renderBlogExposure();
  };

    function generateSmartExposureTags(title, baseKw) {
    var t = String(title || '').trim();
    var kw = String(baseKw || '').replace(/\s+/g, ' ').trim();
    if (!kw || kw.length < 2) {
      var m = t.match(/^([^,·|!?:;~]+)/);
      kw = (m ? m[1] : t.slice(0, 15)).replace(/(총정리|정리|완벽|모음|방법은?|꿀팁|후기|추천)$/g, '').trim();
    }
    var tags = [];
    if (/차이|구별|비교|vs|VS|다른점|다를까/.test(t)) {
      var subj = kw.replace(/\s*(차이|비교|구별).*$/, '').trim() || kw;
      if (/암컷|수컷|암수/.test(t)) {
        tags.push(subj + ' 암수 구별');
        tags.push(kw + ' 구별법');
        tags.push(subj + ' 암컷 수컷 차이');
        tags.push(kw + ' 비교');
      } else if (/진화/.test(t)) {
        tags.push(subj + ' 진화 관계');
        tags.push(kw + ' 비교 정리');
        tags.push(subj + ' 진화 여부');
        tags.push(kw + ' 특징');
      } else {
        tags.push(kw + ' 비교');
        tags.push(subj !== kw ? (subj + ' 구별법') : (kw + ' 정리'));
        tags.push(kw + ' 특징');
        tags.push(subj !== kw ? (subj + ' 차이점') : (kw + ' 분석'));
      }
    } else if (/종류|가지|순위|목록|타입|속성/.test(t)) {
      var subj = kw.replace(/\s*(종류|타입|속성|순위|진화).*$/, '').trim() || kw;
      var numM = t.match(/(\d+가지|\d+대|\d+선)/);
      var cnt = numM ? numM[1] : '';
      if (/타입|상성|속성/.test(t)) {
        tags.push(subj + ' 타입 상성표');
        if (cnt) tags.push(kw + ' ' + cnt);
        else tags.push(subj + ' 상성 정리');
        tags.push(subj + ' 속성 상성');
        tags.push(kw + ' 추천');
      } else if (/진화/.test(t)) {
        tags.push(subj + ' 진화 조건');
        if (cnt) tags.push(kw + ' ' + cnt + ' 정리');
        else tags.push(subj + ' 진화 종류');
        tags.push(subj + ' 진화 루트');
        tags.push(subj + ' 진화 방법');
      } else {
        if (cnt) tags.push(kw + ' ' + cnt + ' 총정리');
        else tags.push(kw + ' 총정리');
        tags.push(subj + ' 특징 비교');
        tags.push(subj + ' 순위 추천');
        tags.push(kw + ' 가이드');
      }
    } else if (/지원금|신청|환급|조건|자격|기여금|혜택|청약|도약계좌|패스/.test(t)) {
      var subj = kw.replace(/\s*(신청|환급|조건|자격|지원금).*$/, '').trim() || kw;
      tags.push(subj + ' 신청 조건');
      tags.push(subj + ' 대상자 조회');
      tags.push(subj + ' 지급일 환급');
      tags.push(subj + ' 신청 가이드');
    } else if (/해결|오류|에러|고장|안됨|안뜸|실패|연결|방전/.test(t)) {
      var subj = kw.replace(/\s*(해결|오류|에러|안됨|안뜸|실패).*$/, '').trim() || kw;
      tags.push(subj + ' 해결 순서');
      tags.push(subj + ' 원인과 대처');
      tags.push(kw + ' 조치 방법');
      tags.push(subj + ' 자가 점검');
    } else if (/후기|리뷰|내돈내산|사용기|맛|방문/.test(t)) {
      tags.push(kw + ' 솔직 후기');
      tags.push(kw + ' 장단점 비교');
      tags.push(kw + ' 가격 정보');
      tags.push(kw + ' 추천 가이드');
    } else {
      tags.push(kw + ' 총정리');
      tags.push(kw + ' 핵심 특징');
      tags.push(kw + ' 실전 팁');
      tags.push(kw + ' 추천 가이드');
    }
    var clean = [];
    tags.forEach(function(tag){
      var s = String(tag||'').replace(/\s+/g, ' ').trim();
      if (s && clean.indexOf(s) === -1) clean.push(s);
    });
    return clean.slice(0, 4);
  }

  function renderExposureSeedGrid(items) {
    var grid = document.getElementById('exposureSeedGrid');
    if (!grid) return;
    var seeds = (items || []).slice(0, 6);
    if (!seeds.length) { grid.innerHTML = ''; return; }
    grid.innerHTML = seeds.map(function(item) {
      var smartTags = generateSmartExposureTags(item.title, item.keyword);
      var seedKw = (smartTags && smartTags.length) ? smartTags[0] : (item.keyword || item.title);
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(15,23,42,0.04);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
        '<span style="font-weight:800;color:#1e293b;font-size:15.667px;">' + exposureEscape(seedKw) + '</span>' +
        '<span style="background:#e0e7ff;color:#3730a3;font-size:12.667px;font-weight:800;padding:2px 6px;border-radius:4px;">확장 시드</span>' +
        '</div>' +
        '<p style="color:#64748b;font-size:14.667px;margin:8px 0 10px;line-height:1.5;">원본 글: ' + exposureEscape(item.title.slice(0, 30)) + '...</p>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="color:#059669;font-weight:700;font-size:13.667px;">순위: ' + (item.rankLabel || '측정완료') + '</span>' +
        '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(seedKw) + '" target="_blank" rel="noopener" style="color:#2563eb;font-size:13.667px;font-weight:700;text-decoration:none;">네이버 검색 ↗</a>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function renderBlogExposure() {
    var payload = blogExposureState.payload, tbody = document.getElementById('exposureTbody');
    if (!payload || !tbody) return;
    var filter = blogExposureState.filter || 'all';

    var rows = blogExposureState.rows.filter(function(row) {
      if (filter === 'exposed') return row.exposed;
      if (filter === 'hidden') return !row.exposed;
      if (filter === 'push') return row.isPushCandidate;
      return true;
    });

    tbody.innerHTML = rows.length ? rows.map(function(row, idx) {
      // 1. 상태 배지
      var statusHtml='<b style="color:'+(row.exposed?'#047857':row.error?'#b91c1c':'#b45309')+'">'+exposureEscape(row.statusText||'확인 범위 밖')+'</b><small style="display:block;margin-top:4px">'+exposureEscape(row.statusSubtext||'')+'</small>';
      // 2. 포스팅 제목 (진하고 선명한 폰트 색상 #0f172a)
      var titleHtml = '<a href="' + exposureEscape(row.link) + '" target="_blank" rel="noopener" style="color:#0f172a !important; font-size:16.667px; font-weight:700; text-decoration:none; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" onmouseover="this.style.color=\'#2563eb\'" onmouseout="this.style.color=\'#0f172a\'" title="' + exposureEscape(row.title) + '">' +
        exposureEscape(row.title) +
        '</a>';

      // 3. 발행일 (상대시간)
      var dateText = row.relativeTime || (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString('ko-KR') : '-');
      var dateHtml = '<span style="color:#64748b; font-size:14.667px; font-weight:600;">' + exposureEscape(dateText) + '</span>';

      // 4. 키워드 순위
      var kwRankHtml = '';
      if (row.keywordRank != null && Number(row.keywordRank) > 0) {
        kwRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.keyword || '') + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:16.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 블로그탭 순위 확인">' +
          row.keywordRank + exposureRankSuffix(row.keywordResult) + '위 <span style="font-size:12.667px;">↗</span></a>' +
          '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.keyword || '') + '" target="_blank" rel="noopener" style="display:inline-block; margin-top:4px; background:#f1f5f9; color:#334155; font-size:13.667px; font-weight:700; padding:3px 7px; border-radius:5px; border:1px solid #e2e8f0; text-decoration:none;">' +
          exposureEscape(row.keyword || '-') + '</a>';
      } else {
        kwRankHtml = '<span style="color:#94a3b8; font-size:15.167px; font-weight:600;">'+exposureRankUnavailable(row.keywordResult)+'</span>' +
          (row.keyword ? '<span style="display:block; margin-top:4px;"><span style="display:inline-block; background:#f8fafc; color:#64748b; font-size:13.667px; font-weight:600; padding:2px 6px; border-radius:4px; border:1px solid #f1f5f9;">' + exposureEscape(row.keyword) + '</span></span>' : '');
      }

      // 5. 확장 순위
      var extRankHtml = '';
      if (row.expandedRank != null && Number(row.expandedRank) > 0) {
        extRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.expandedKeyword || '') + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:16.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 블로그탭 순위 확인">' +
          row.expandedRank + exposureRankSuffix(row.expandedResult) + '위 <span style="font-size:12.667px;">↗</span></a>' +
          '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.expandedKeyword || '') + '" target="_blank" rel="noopener" style="display:inline-block; margin-top:4px; background:#f1f5f9; color:#334155; font-size:13.667px; font-weight:700; padding:3px 7px; border-radius:5px; border:1px solid #e2e8f0; text-decoration:none;">' +
          exposureEscape(row.expandedKeyword || '-') + '</a>';
      } else {
        extRankHtml = '<span style="color:#94a3b8; font-size:15.167px; font-weight:600;">'+exposureRankUnavailable(row.expandedResult)+'</span>' +
          (row.expandedKeyword ? '<span style="display:block; margin-top:4px;"><span style="display:inline-block; background:#f8fafc; color:#64748b; font-size:13.667px; font-weight:600; padding:2px 6px; border-radius:4px; border:1px solid #f1f5f9;">' + exposureEscape(row.expandedKeyword) + '</span></span>' : '');
      }

      // 6. 네이버 제목검색
      var titleRankHtml = '';
      if (row.titleRank != null && Number(row.titleRank) > 0) {
        titleRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.title || '') + '" target="_blank" rel="noopener" style="color:#2563eb; font-size:16.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="네이버 제목검색 순위 확인">' +
          row.titleRank + exposureRankSuffix(row.titleResult) + '위 <span style="font-size:12.667px;">↗</span></a>';
      } else {
        titleRankHtml = '<span style="color:#94a3b8; font-size:14.667px; font-weight:600;">'+exposureRankUnavailable(row.titleResult)+'</span>';
      }

      return '<tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'transparent\'">' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + statusHtml + '</td>' +
        '<td style="padding:14px 12px; vertical-align:middle;">' + titleHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + dateHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + kwRankHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + extRankHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + titleRankHtml + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:48px;text-align:center;color:#64748b;font-weight:600;">선택한 필터 조건에 해당하는 글이 없습니다.</td></tr>';

    // 버튼 스타일 갱신
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
        btn.style.background = '#2563eb';
        btn.style.borderColor = '#2563eb';
        btn.style.color = '#ffffff';
        btn.style.fontWeight = '800';
      } else {
        btn.style.background = '#ffffff';
        btn.style.borderColor = '#cbd5e1';
        btn.style.color = '#475569';
        btn.style.fontWeight = '700';
      }
    });
  }

  window.setExposureFilter = function(filter) {
    if (!blogExposureState) return;
    blogExposureState.filter = filter;
    renderBlogExposure();
  };

    function generateSmartExposureTags(title, baseKw) {
    var t = String(title || '').trim();
    var kw = String(baseKw || '').replace(/\s+/g, ' ').trim();
    if (!kw || kw.length < 2) {
      var m = t.match(/^([^,·|!?:;~]+)/);
      kw = (m ? m[1] : t.slice(0, 15)).replace(/(총정리|정리|완벽|모음|방법은?|꿀팁|후기|추천)$/g, '').trim();
    }
    var tags = [];
    if (/차이|구별|비교|vs|VS|다른점|다를까/.test(t)) {
      var subj = kw.replace(/\s*(차이|비교|구별).*$/, '').trim() || kw;
      if (/암컷|수컷|암수/.test(t)) {
        tags.push(subj + ' 암수 구별');
        tags.push(kw + ' 구별법');
        tags.push(subj + ' 암컷 수컷 차이');
        tags.push(kw + ' 비교');
      } else if (/진화/.test(t)) {
        tags.push(subj + ' 진화 관계');
        tags.push(kw + ' 비교 정리');
        tags.push(subj + ' 진화 여부');
        tags.push(kw + ' 특징');
      } else {
        tags.push(kw + ' 비교');
        tags.push(subj !== kw ? (subj + ' 구별법') : (kw + ' 정리'));
        tags.push(kw + ' 특징');
        tags.push(subj !== kw ? (subj + ' 차이점') : (kw + ' 분석'));
      }
    } else if (/종류|가지|순위|목록|타입|속성/.test(t)) {
      var subj = kw.replace(/\s*(종류|타입|속성|순위|진화).*$/, '').trim() || kw;
      var numM = t.match(/(\d+가지|\d+대|\d+선)/);
      var cnt = numM ? numM[1] : '';
      if (/타입|상성|속성/.test(t)) {
        tags.push(subj + ' 타입 상성표');
        if (cnt) tags.push(kw + ' ' + cnt);
        else tags.push(subj + ' 상성 정리');
        tags.push(subj + ' 속성 상성');
        tags.push(kw + ' 추천');
      } else if (/진화/.test(t)) {
        tags.push(subj + ' 진화 조건');
        if (cnt) tags.push(kw + ' ' + cnt + ' 정리');
        else tags.push(subj + ' 진화 종류');
        tags.push(subj + ' 진화 루트');
        tags.push(subj + ' 진화 방법');
      } else {
        if (cnt) tags.push(kw + ' ' + cnt + ' 총정리');
        else tags.push(kw + ' 총정리');
        tags.push(subj + ' 특징 비교');
        tags.push(subj + ' 순위 추천');
        tags.push(kw + ' 가이드');
      }
    } else if (/지원금|신청|환급|조건|자격|기여금|혜택|청약|도약계좌|패스/.test(t)) {
      var subj = kw.replace(/\s*(신청|환급|조건|자격|지원금).*$/, '').trim() || kw;
      tags.push(subj + ' 신청 조건');
      tags.push(subj + ' 대상자 조회');
      tags.push(subj + ' 지급일 환급');
      tags.push(subj + ' 신청 가이드');
    } else if (/해결|오류|에러|고장|안됨|안뜸|실패|연결|방전/.test(t)) {
      var subj = kw.replace(/\s*(해결|오류|에러|안됨|안뜸|실패).*$/, '').trim() || kw;
      tags.push(subj + ' 해결 순서');
      tags.push(subj + ' 원인과 대처');
      tags.push(kw + ' 조치 방법');
      tags.push(subj + ' 자가 점검');
    } else if (/후기|리뷰|내돈내산|사용기|맛|방문/.test(t)) {
      tags.push(kw + ' 솔직 후기');
      tags.push(kw + ' 장단점 비교');
      tags.push(kw + ' 가격 정보');
      tags.push(kw + ' 추천 가이드');
    } else {
      tags.push(kw + ' 총정리');
      tags.push(kw + ' 핵심 특징');
      tags.push(kw + ' 실전 팁');
      tags.push(kw + ' 추천 가이드');
    }
    var clean = [];
    tags.forEach(function(tag){
      var s = String(tag||'').replace(/\s+/g, ' ').trim();
      if (s && clean.indexOf(s) === -1) clean.push(s);
    });
    return clean.slice(0, 4);
  }

  function renderExposureSeedGrid(items) {
    var grid = document.getElementById('exposureSeedGrid');
    if (!grid) return;
    var seeds = (items || []).slice(0, 6);
    if (!seeds.length) { grid.innerHTML = ''; return; }
    grid.innerHTML = seeds.map(function(item) {
      var smartTags = generateSmartExposureTags(item.title, item.keyword);
      var seedKw = (smartTags && smartTags.length) ? smartTags[0] : (item.keyword || item.title);
      return '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;box-shadow:0 2px 8px rgba(15,23,42,0.04);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
        '<span style="font-weight:800;color:#1e293b;font-size:15.667px;">' + exposureEscape(seedKw) + '</span>' +
        '<span style="background:#e0e7ff;color:#3730a3;font-size:12.667px;font-weight:800;padding:2px 6px;border-radius:4px;">확장 시드</span>' +
        '</div>' +
        '<p style="color:#64748b;font-size:14.667px;margin:8px 0 10px;line-height:1.5;">원본 글: ' + exposureEscape(item.title.slice(0, 30)) + '...</p>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="color:#059669;font-weight:700;font-size:13.667px;">순위: ' + (item.rankLabel || '측정완료') + '</span>' +
        '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(seedKw) + '" target="_blank" rel="noopener" style="color:#2563eb;font-size:13.667px;font-weight:700;text-decoration:none;">네이버 검색 ↗</a>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  function renderBlogExposure() {
    var payload = blogExposureState.payload, tbody = document.getElementById('exposureTbody');
    if (!payload || !tbody) return;
    var filter = blogExposureState.filter || 'all';

    var rows = blogExposureState.rows.filter(function(row) {
      if (filter === 'exposed') return row.exposed;
      if (filter === 'hidden') return !row.exposed;
      if (filter === 'push') return row.isPushCandidate;
      return true;
    });

    tbody.innerHTML = rows.length ? rows.map(function(row, idx) {
      // 1. 상태 배지
      var statusHtml='<b style="color:'+(row.exposed?'#047857':row.error?'#b91c1c':'#b45309')+'">'+exposureEscape(row.statusText||'확인 범위 밖')+'</b><small style="display:block;margin-top:4px">'+exposureEscape(row.statusSubtext||'')+'</small>';
      // 2. 제목
      var titleHtml = '<a href="' + exposureEscape(row.link) + '" target="_blank" rel="noopener" style="color:#e2e8f0; font-weight:600; text-decoration:none; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;" title="' + exposureEscape(row.title) + '">' +
        exposureEscape(row.title) +
        '</a>';

      // 3. 발행일 (상대시간)
      var dateText = row.relativeTime || (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString('ko-KR') : '-');
      var dateHtml = '<span style="color:#94a3b8; font-size:14.667px;">' + exposureEscape(dateText) + '</span>';

      // 4. 키워드 순위
      var kwRankHtml = '';
      if (row.keywordRank != null && Number(row.keywordRank) > 0) {
        kwRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.keyword || '') + '" target="_blank" rel="noopener" style="color:#06b6d4; font-size:15.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">' +
          row.keywordRank + exposureRankSuffix(row.keywordResult) + '위 <span style="font-size:12.667px;">↗</span></a>' +
          '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.keyword || '') + '" target="_blank" rel="noopener" style="display:block; margin-top:3px; color:#94a3b8; font-size:13.667px; text-decoration:none;">' +
          exposureEscape(row.keyword || '-') + '</a>';
      } else {
        kwRankHtml = '<span style="color:#64748b; font-size:14.667px;">'+exposureRankUnavailable(row.keywordResult)+'</span>' +
          '<span style="display:block; margin-top:3px; color:#64748b; font-size:13.667px;">' + exposureEscape(row.keyword || '-') + '</span>';
      }

      // 5. 확장 순위
      var extRankHtml = '';
      if (row.expandedRank != null && Number(row.expandedRank) > 0) {
        extRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.expandedKeyword || '') + '" target="_blank" rel="noopener" style="color:#06b6d4; font-size:15.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">' +
          row.expandedRank + exposureRankSuffix(row.expandedResult) + '위 <span style="font-size:12.667px;">↗</span></a>' +
          '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.expandedKeyword || '') + '" target="_blank" rel="noopener" style="display:block; margin-top:3px; color:#94a3b8; font-size:13.667px; text-decoration:none;">' +
          exposureEscape(row.expandedKeyword || '-') + '</a>';
      } else {
        extRankHtml = '<span style="color:#64748b; font-size:14.667px;">'+exposureRankUnavailable(row.expandedResult)+'</span>' +
          '<span style="display:block; margin-top:3px; color:#64748b; font-size:13.667px;">' + exposureEscape(row.expandedKeyword || '-') + '</span>';
      }

      // 6. 네이버 제목검색
      var titleRankHtml = '';
      if (row.titleRank != null && Number(row.titleRank) > 0) {
        titleRankHtml = '<a href="https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query=' + encodeURIComponent(row.title || '') + '" target="_blank" rel="noopener" style="color:#06b6d4; font-size:15.667px; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">' +
          row.titleRank + exposureRankSuffix(row.titleResult) + '위 <span style="font-size:12.667px;">↗</span></a>';
      } else {
        titleRankHtml = '<span style="color:#64748b; font-size:14.667px;">'+exposureRankUnavailable(row.titleResult)+'</span>';
      }

      return '<tr style="border-bottom:1px solid #1e1e27;">' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + statusHtml + '</td>' +
        '<td style="padding:14px 12px; vertical-align:middle;">' + titleHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + dateHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + kwRankHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + extRankHtml + '</td>' +
        '<td style="text-align:center; padding:14px 8px; vertical-align:middle;">' + titleRankHtml + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:48px;text-align:center;color:#64748b;">선택한 필터 조건에 해당하는 글이 없습니다.</td></tr>';

    // 버튼 스타일 갱신
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

  window.setExposureFilter = function(filter) {
    if (!blogExposureState) return;
    blogExposureState.filter = filter;
    renderBlogExposure();
  };

  window.startBlogExposureAnalysis = async function() {
    var input = document.getElementById('exposureBlogUrl'), status = document.getElementById('exposureStatus'), button = document.getElementById('exposureStartBtn');
    if (!input || !status || !button) return;
    var blogUrl = input.value.trim();
    if (!blogUrl) { status.innerHTML = '<b style="color:#dc2626">입력 필요</b> · 네이버 블로그 주소나 아이디를 입력해 주세요.'; return; }
    var paidKey = typeof getPaidAccessKey === 'function' ? getPaidAccessKey() : '';
    button.disabled = true; button.textContent = '실시간 노출 측정 중…';
    status.innerHTML = '<b style="color:#4338ca"><i class="fa-solid fa-spinner fa-spin"></i> 분석 중</b> · 최근 발행 글의 검색 순위 데이터를 조회합니다...';
    document.getElementById('exposureResults').style.display = 'none';
    try {
      var payload = await fetchFromWorker('analyzeBlogExposure', { blogUrl: blogUrl, paidAccessKey: paidKey });
      if (!payload || !payload.success) throw new Error(payload && payload.error || '노출 추적 결과를 받지 못했습니다.');
      blogExposureState = { rows: Array.isArray(payload.rows) ? payload.rows : [], filter: 'all', payload: payload };

      var total = payload.total || blogExposureState.rows.length;
      var expCount = payload.exposedCount != null ? payload.exposedCount : blogExposureState.rows.filter(r => r.exposed).length;
      var hidCount = payload.hiddenCount != null ? payload.hiddenCount : (total - expCount);
      var pushCount = payload.pushCandidateCount != null ? payload.pushCandidateCount : blogExposureState.rows.filter(r => r.isPushCandidate).length;

      // 카운트 UI 업데이트
      var cAll = document.getElementById('expCountAll'); if (cAll) cAll.textContent = total;
      var cExp = document.getElementById('expCountExposed'); if (cExp) cExp.textContent = expCount;
      var cHid = document.getElementById('expCountHidden'); if (cHid) cHid.textContent = hidCount;
      var cPush = document.getElementById('expCountPush'); if (cPush) cPush.textContent = pushCount;

      var nText = document.getElementById('exposureNoticeCount');
      if (nText) nText.textContent = total + '건';

      var chkAt = document.getElementById('exposureCheckedAt');
      if (chkAt) chkAt.textContent = '확인 시각: ' + new Date(payload.checkedAt || Date.now()).toLocaleTimeString('ko-KR');

      document.getElementById('exposureResults').style.display = 'block';
      status.innerHTML = '<b style="color:#059669">측정 완료</b> · 총 ' + total + '개 글 중 노출 ' + expCount + '건, 밀면 되는 자리 ' + pushCount + '건';
      renderBlogExposure();
    } catch (error) {
      status.innerHTML = '<b style="color:#dc2626">확인 실패</b> · ' + exposureEscape(error.message || '잠시 후 다시 시도해 주세요.');
    } finally {
      button.disabled = false; button.textContent = '📊 실시간 노출 순위 측정';
    }
  };

function switchTab(tab) {
    var tabs = ['analyzer', 'finder', 'links', 'excel', 'exposure'];
    tabs.forEach(function(t) {
      var panel = document.getElementById('tab-' + t);
      if (panel) {
        panel.style.display = (t === tab) ? 'block' : 'none';
      }
      var btn = document.getElementById('tabBtn-' + t);
      if (btn) {
        if (t === tab) {
          btn.className = 'tab-btn active-' + t + ' active';
        } else {
          btn.className = 'tab-btn';
        }
      }
    });
    
    if (tab === 'finder' && typeof window.loadTrendingList === 'function') {
      window.loadTrendingList('naver');
    }
  }
  window.switchTab = switchTab;

  function ensureSettingsModalPortal() {
    const layer = document.getElementById('leword-app-modal-layer');
    if (layer && layer.parentElement !== document.body) document.body.appendChild(layer);
    return layer;
  }
  window.ensureSettingsModalPortal = ensureSettingsModalPortal;

  function showLoading(show) {
    const modalLayer = ensureSettingsModalPortal();
    const loadingBox = document.getElementById('loadingBox');
    const apiBox = document.getElementById('apiBox');
    const paidKeyBox = document.getElementById('paidKeyBox');
    if (show) {
      modalLayer.style.display = 'flex';
      loadingBox.style.display = 'block';
      apiBox.style.display = 'none';
      if (paidKeyBox) paidKeyBox.style.display = 'none';
    } else {
      modalLayer.style.display = 'none';
    }
  }
  window.showLoading = showLoading;

  function openApiSettings() {
    const keys = getSavedApiKeys();
    document.getElementById('apiMode').value = keys.apiMode || 'hub';
    document.getElementById('searchClientId').value = keys.searchClientId || '';
    document.getElementById('searchClientSecret').value = keys.searchClientSecret || '';
    document.getElementById('adCustomerId').value = keys.adCustomerId || '';
    document.getElementById('adLicenseKey').value = keys.adLicenseKey || '';
    document.getElementById('adSecretKey').value = keys.adSecretKey || '';
    
    ensureSettingsModalPortal().style.display = 'flex';
    document.getElementById('loadingBox').style.display = 'none';
    document.getElementById('apiBox').style.display = 'block';
    const paidKeyBox = document.getElementById('paidKeyBox'); if (paidKeyBox) paidKeyBox.style.display = 'none';
  }
  window.openApiSettings = openApiSettings;

  function getPaidAccessKey() {
    return String(localStorage.getItem('moneytCommonPaidAccessKey') || localStorage.getItem('lewordAnalysisAccessKey') || localStorage.getItem('moneytBulkAccessKey') || '').trim().toUpperCase();
  }
  window.getPaidAccessKey = getPaidAccessKey;

  function savePaidAccessKey(value) {
    const key = String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 16);
    try {
      if (key) localStorage.setItem('moneytCommonPaidAccessKey', key);
      else localStorage.removeItem('moneytCommonPaidAccessKey');
      if (key) { localStorage.setItem('lewordAnalysisAccessKey', key); localStorage.setItem('moneytBulkAccessKey', key); }
      else { localStorage.removeItem('lewordAnalysisAccessKey'); localStorage.removeItem('moneytBulkAccessKey'); }
    } catch (_) {}
    const modalInput = document.getElementById('paidAccessKeyInput');
    if (modalInput && modalInput.value !== key) modalInput.value = key;
    const status = document.getElementById('analysisQuotaStatus');
    if (status) status.textContent = key.length === 16 ? '공통 유료 발급키 저장됨' : '무료 하루 20회';
    return key;
  }
  window.savePaidAccessKey = savePaidAccessKey;

  function openPaidKeySettings() {
    const input = document.getElementById('paidAccessKeyInput');
    const status = document.getElementById('paidKeySettingStatus');
    if (input) input.value = getPaidAccessKey();
    if (status) status.textContent = getPaidAccessKey().length === 16 ? '현재 공통 유료 발급키가 저장되어 있습니다.' : '발급받은 16자리 키를 입력해 주세요.';
    ensureSettingsModalPortal().style.display = 'flex';
    document.getElementById('loadingBox').style.display = 'none';
    document.getElementById('apiBox').style.display = 'none';
    document.getElementById('paidKeyBox').style.display = 'block';
  }
  window.openPaidKeySettings = openPaidKeySettings;

  function closePaidKeySettings() { document.getElementById('leword-app-modal-layer').style.display = 'none'; }
  window.closePaidKeySettings = closePaidKeySettings;

  function savePaidKeySettings() {
    const key = savePaidAccessKey(document.getElementById('paidAccessKeyInput')?.value || '');
    const status = document.getElementById('paidKeySettingStatus');
    if (!/^[A-Z2-9]{16}$/.test(key)) { if (status) status.textContent = '16자리 영문 대문자·숫자 형식의 발급키를 확인해 주세요.'; return; }
    if (status) status.textContent = '공통 유료 발급키를 저장했습니다. 전체 공개 권한을 확인하는 중입니다.';
    if (typeof window.loadKeywordCenter === 'function') {
      setTimeout(async function(){
        var result=await window.loadKeywordCenter(true);
        if (result && result.access==='paid') {
          if (status) status.textContent='유료 발급키 확인 완료: 전체 키워드가 열렸습니다.';
          setTimeout(closePaidKeySettings, 700);
        } else if (status) {
          status.textContent=(result && result.paidKeyStatus && result.paidKeyStatus.message) ? result.paidKeyStatus.message : '저장된 유료 발급키를 확인하지 못했습니다. 발급받은 16자리 키를 다시 확인해 주세요.';
        }
      }, 80);
    }
  }
  window.savePaidKeySettings = savePaidKeySettings;

  function clearPaidKeySettings() {
    savePaidAccessKey('');
    const status = document.getElementById('paidKeySettingStatus');
    if (status) status.textContent = '저장된 공통 유료 발급키를 삭제했습니다. 무료 분석 한도로 전환됩니다.';
  }
  window.clearPaidKeySettings = clearPaidKeySettings;

  function closeApiSettings() {
    document.getElementById('leword-app-modal-layer').style.display = 'none';
  }
  window.closeApiSettings = closeApiSettings;

  function getSavedApiKeys() {
    const saved = localStorage.getItem('lewordApiKeys');
    return saved ? JSON.parse(saved) : {};
  }
  window.getSavedApiKeys = getSavedApiKeys;

  function checkInitialApiStatus() {
    if (window.checkPreviewApiStatus) { window.checkPreviewApiStatus(); return; }
    const keys = getSavedApiKeys();
    const statusDot = document.getElementById('apiStatusDot');
    const statusText = document.getElementById('apiStatusText');
    const badge = document.getElementById('apiStatusBadge');
    
    if (keys.searchClientId && keys.searchClientSecret && keys.adCustomerId && keys.adLicenseKey && keys.adSecretKey) {
      if(statusDot) statusDot.style.background = '#34d399';
      if(statusText) statusText.innerText = (keys.apiMode || 'hub') === 'hub' ? 'NAVER API HUB 연동 완료' : '기존 네이버 API 연동 완료';
      if(badge) { badge.style.color = '#34d399'; badge.style.borderColor = 'rgba(16, 185, 129, 0.4)'; badge.style.background = 'rgba(6, 78, 59, 0.4)'; }
    } else {
      if(statusDot) statusDot.style.background = '#ef4444';
      if(statusText) statusText.innerText = 'API 미연동 (설정 필요)';
      if(badge) { badge.style.color = '#fb7185'; badge.style.borderColor = 'rgba(244, 63, 94, 0.4)'; badge.style.background = 'rgba(159, 18, 57, 0.4)'; }
    }
  }

  function initializeHomeAfterLoad() {
    checkInitialApiStatus();
    savePaidAccessKey(getPaidAccessKey());
    setTimeout(function() { if (window.loadHomeDashboard) window.loadHomeDashboard(false); }, 100);
    var params = new URLSearchParams(window.location.search);
    var p = params.get('page');
    if (p) setTimeout(function() { showPage(p); }, 100);
  }
  // window.onload 대입은 다른 Blogger 스크립트가 덮어쓸 수 있으므로 독립 이벤트로 연결합니다.
  window.addEventListener('load', initializeHomeAfterLoad);
  if (document.readyState === 'complete') setTimeout(initializeHomeAfterLoad, 0);

  function checkApiKeys() {
    const keys = getSavedApiKeys();
    if (!keys.searchClientId || !keys.searchClientSecret || !keys.adCustomerId || !keys.adLicenseKey || !keys.adSecretKey) {
      alert("⚠️ 내 API 키 설정이 필요합니다!\n\n데이터 과부하 방지 및 안정적인 사용을 위해 우측 상단의 [⚙️ 내 API 키 설정]을 눌러 본인의 네이버 API 키를 먼저 등록해 주세요.");
      openApiSettings();
      return false;
    }
    return true;
  }

  async function saveApiSettings() {
    window.saveApiSettings = saveApiSettings;
    const keys = {
      apiMode: document.getElementById('apiMode').value,
      searchClientId: document.getElementById('searchClientId').value.trim(),
      searchClientSecret: document.getElementById('searchClientSecret').value.trim(),
      adCustomerId: document.getElementById('adCustomerId').value.trim(),
      adLicenseKey: document.getElementById('adLicenseKey').value.trim(),
      adSecretKey: document.getElementById('adSecretKey').value.trim(),
    };
    
    if (!keys.searchClientId || !keys.searchClientSecret || !keys.adCustomerId || !keys.adLicenseKey || !keys.adSecretKey) {
      alert("⚠️ 모든 API 키 값을 입력해 주세요.");
      return;
    }

    const saveBtn = document.querySelector('#apiBox .btn-secondary');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "⏳ API 키 검증 중...";
    saveBtn.disabled = true;

    try {
      const res = await fetch(WORKER_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'validateKeys', ...keys }),
        headers: { 'Content-Type': 'text/plain' }
      });
      const result = await res.json();

      if (result.success) {
        localStorage.setItem('lewordApiKeys', JSON.stringify(keys));
        checkInitialApiStatus();
        alert('✅ 네이버 API 연동에 성공하여 키가 저장되었습니다!');
        closeApiSettings();
      } else {
        const statusDot = document.getElementById('apiStatusDot');
        const statusText = document.getElementById('apiStatusText');
        const badge = document.getElementById('apiStatusBadge');
        if(statusDot) statusDot.style.background = '#ef4444';
        if(statusText) statusText.innerText = 'API 키 오류 (인증 실패)';
        if(badge) { badge.style.color = '#fb7185'; badge.style.borderColor = 'rgba(244, 63, 94, 0.4)'; badge.style.background = 'rgba(159, 18, 57, 0.4)'; }
        
        alert('❌ API 키 인증 실패:\n\n' + result.error);
      }
    } catch (err) {
      alert('❌ API 키 검증 중 통신 오류가 발생했습니다. Cloudflare Worker 배포 및 로그를 확인해 주세요.');
    } finally {
      saveBtn.innerText = originalText;
      saveBtn.disabled = false;
    }
  }

  window.openPaidKeyInquiryGuide = function() {
    const guide = '네이버 카페 > 공지사항 > 키워드조회기&글쓰기봇 > 키워드 Tool 유료신청 안내를 확인하세요.\n\n확인을 누르면 카페 공지사항으로 이동합니다.';
    if (window.confirm(guide)) window.open('https://cafe.naver.com/f-e/cafes/31608088/menus/18?viewType=L', '_blank', 'noopener,noreferrer');
  };

  window.openGoldenKeywordCafe = function() {
    const notice = '공지사항 > 오늘의황금키워드 탭을 확인하세요.\n황금키워드 매일 업데이트합니다.';
    if (window.confirm(notice)) window.open('https://cafe.naver.com/f-e/cafes/31608088/menus/16?viewType=L', '_blank', 'noopener,noreferrer');
  };

  function clearApiSettings() {
    localStorage.removeItem('lewordApiKeys');
    document.querySelectorAll('#apiBox input').forEach(inp => inp.value = '');
    checkInitialApiStatus();
    alert('API 키가 초기화되었습니다.');
  }

    // =====================================
  // 오늘의 황금키워드 로직
  // =====================================
    async function loadTodayGolden() {
    const viewerKeys = getSavedApiKeys();
    const canGenerateToday = Boolean(viewerKeys.searchClientId && viewerKeys.searchClientSecret && viewerKeys.adCustomerId && viewerKeys.adLicenseKey && viewerKeys.adSecretKey);
    document.getElementById('goldenLoading').style.display = 'block';
    document.getElementById('goldenGrid').innerHTML = '';
    document.getElementById('goldenUpdateDate').innerText = '';

    let res = null;
    try {
      res = await fetchFromWorker('getTodayGoldenKeywords', {});
      if (!res || !res.success) {
        if (!canGenerateToday) {
          document.getElementById('goldenLoading').style.display = 'none';
          document.getElementById('goldenGrid').innerHTML = '<div style="padding:32px;border:1px solid rgba(245,158,11,.35);border-radius:14px;color:#a16207;text-align:center">오늘의 공용 키워드가 아직 생성되지 않았습니다.<br/><small style="color:#475569">API가 연결된 운영자가 오늘 데이터 확인 버튼을 한 번 누르면 모든 방문자에게 같은 결과가 표시됩니다.</small></div>';
          return;
        }
      }
    } catch(err) {
      if (!canGenerateToday) {
        document.getElementById('goldenLoading').style.display = 'none';
        document.getElementById('goldenGrid').innerHTML = '<div style="padding:32px;border:1px solid rgba(245,158,11,.35);border-radius:14px;color:#a16207;text-align:center">오늘의 공용 키워드를 아직 불러올 수 없습니다.<br/><small style="color:#475569">API가 연결된 운영자가 오늘 데이터 확인 버튼을 눌러 생성해 주세요.</small></div>';
        return;
      }
      document.getElementById('goldenLoading').style.display = 'none';
      document.getElementById('goldenGrid').innerHTML = '<div style="color:#ef4444; padding:20px;">❌ 애드센스 키워드 생성 실패: ' + escapeHtml(err.message) + '<br/><br/>Cloudflare Worker 배포 상태를 확인해 주세요.</div>';
      return;
    }
    document.getElementById('goldenLoading').style.display = 'none';

    if (!res) {
      document.getElementById('goldenGrid').innerHTML = '<div style="color:#ef4444; padding:20px;">❌ 서버 응답이 없습니다. Cloudflare Worker가 올바르게 배포되었는지 확인해 주세요.</div>';
      return;
    }
    if (!res.success) {
      document.getElementById('goldenGrid').innerHTML = '<div style="color:#ef4444; padding:20px;">❌ 오류: ' + (res.error || '알 수 없는 오류') + '</div>';
      return;
    }

    const goldenRows = selectGoldenRows(res.data).map((row, index) => ({ ...row, _goldenIndex:index }));
    currentGoldenRows = goldenRows;
    selectedGoldenTier = '전체';
    selectedGoldenChannel = 'naver';
    document.getElementById('goldenGrid').dataset.loaded = '1';
    const updatedAt = res.date || new Date().toLocaleString('ko-KR');
    document.getElementById('goldenUpdateDate').innerText = '오늘의 공용 고정본: ' + updatedAt + (res.cached ? ' · 저장된 데이터' : ' · 오늘 최초 생성');

    let html = '';
    if (goldenRows.length === 0) {
      const d = res.diagnostics;
      const detail = d ? '<br/><small>연관어 ' + d.relatedCount + '개 · 후보 ' + d.candidateCount + '개</small>' : '';
      html = '<div style="color:#a16207; text-align:center; padding:40px; width:100%; grid-column: 1 / -1; font-size:17.667px;">오늘은 표시 기준을 충족한 활용 후보가 아직 없습니다.' + detail + '<br/><small style="color:#475569">다음 데이터 확인 시 최신 실시간 후보를 다시 반영합니다.</small></div>';
    } else {
      document.getElementById('goldenGrid').innerHTML = '';
      try {
        renderGoldenLiveBoard();
      } catch (renderError) {
        renderGoldenSimpleFallback(goldenRows, renderError);
      }
      return;
    }
    document.getElementById('goldenGrid').innerHTML = html;
  }

  function renderGoldenSimpleFallback(rows, renderError) {
    const list = (rows || []).map(function(row, index) {
      const ratio = row.competitionRatio == null ? '-' : row.competitionRatio.toFixed(4);
      return '<div style="padding:15px;border:1px solid #dbe3ef;border-radius:12px;background:#ffffff">' +
        '<div style="display:flex;justify-content:space-between;gap:12px"><strong style="color:#172033">' + (index + 1) + '. ' + escapeHtml(row.keyword) + '</strong><span style="color:#a16207">' + escapeHtml(row.tier || '분석중') + '</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;color:#475569;font-size:13.667px"><span>검색량 <b style="color:#fff">' + (row.searchVolumeUnavailable ? '조회 실패' : formatNumber(row.total)) + '</b></span><span>문서수 <b style="color:#fff">' + (row.blogCountUnavailable ? '조회 실패' : formatNumber(row.blogCount)) + '</b></span><span>비율 <b style="color:#fff">' + ratio + '</b></span></div>'+window.recentBlogHtml(row.keyword)+'</div>';
    }).join('');
    document.getElementById('goldenGrid').innerHTML = '<div style="padding:10px 0 14px;color:#a16207;font-size:14.667px">간편 목록으로 표시했습니다.</div><div style="display:grid;gap:10px">' + list + '</div>';
    if (window.console && console.error) console.error('황금키워드 상세 화면 오류', renderError);
  }

  async function loadTodayGoldenFallback() {
    let trendData = homeTrendCache || {};
    let directRows = null;
    if (!Object.keys(trendData).some(name => Array.isArray(trendData[name]) && trendData[name].length)) {
      const attempts = await Promise.allSettled([
        fetchSignalKeywordsDirect(),
        fetch(WORKER_API_URL + '?action=getTrendingKeywords&_=' + Date.now()).then(r => r.json())
      ]);
      if (attempts[0].status === 'fulfilled') directRows = attempts[0].value;
      if (attempts[1].status === 'fulfilled') {
        const gasResult = attempts[1].value || {};
        trendData = gasResult.data && typeof gasResult.data === 'object' ? gasResult.data : gasResult;
      }
      if ((!trendData.naver || !trendData.naver.length) && directRows) trendData.naver = directRows;
    }
    const names = ['naver','google','nate','zum','daum'], keywords = [], seen = {};
    for (let i = 0; i < 10 && keywords.length < 12; i++) {
      names.forEach(name => {
        const item = trendData[name] && trendData[name][i];
        const keyword = item && String(item.keyword || '').trim();
        const key = keyword ? keyword.replace(/\s+/g, '').toLowerCase() : '';
        if (keyword && !seen[key] && keywords.length < 12) { seen[key] = true; keywords.push(keyword); }
      });
    }
    if (!keywords.length) throw new Error('분석할 실시간 키워드가 없습니다.');
    const analyzed = await fetchFromWorker('exactBulkAnalyze', { keywords: keywords });
    if (!analyzed.success) {
      return {
        success:true,
        data:keywords.map(keyword => ({ keyword:keyword, pc:0, mobile:0, total:0, searchVolumeUnavailable:true, blogCount:null, blogCountUnavailable:true, error:analyzed.error || 'API 분석 실패' })),
        date:new Date().toLocaleString('ko-KR'),
        warning:analyzed.error || 'API 분석 실패'
      };
    }
    analyzed.date = new Date().toLocaleString('ko-KR');
    analyzed.cached = false;
    analyzed.diagnostics = { relatedCount:keywords.length, candidateCount:keywords.length, analyzedCount:(analyzed.data || []).length };
    return analyzed;
  }

  function renderGoldenLiveBoard() {
    const tiers = ['전체','초보자','중급자','고급자','전문가','마스터','챌린저','레전드'];
    const channelRows = currentGoldenRows.filter(row => row.channel === selectedGoldenChannel);
    const rows = selectedGoldenTier === '전체' ? channelRows : channelRows.filter(row => row.tier === selectedGoldenTier);
    const adsenseCount = currentGoldenRows.filter(row => row.channel === 'adsense').length;
    const naverCount = currentGoldenRows.filter(row => row.channel === 'naver').length;
    const channelTabs = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0">' +
      '<button class="golden-tier-filter' + (selectedGoldenChannel === 'naver' ? ' active' : '') + '" onclick="setGoldenChannel(\'naver\')">🟢 네이버 블로그 최적화 <small>(' + naverCount + ')</small></button>' +
      '<button class="golden-tier-filter' + (selectedGoldenChannel === 'adsense' ? ' active' : '') + '" onclick="setGoldenChannel(\'adsense\')">💰 애드센스 고단가 주제 <small>(' + adsenseCount + ')</small></button></div>';
    const showCompetition = selectedGoldenChannel === 'naver';
    const filters = tiers.map(tier => '<button class="golden-tier-filter' + (tier === selectedGoldenTier ? ' active' : '') + '" onclick="setGoldenTier(\'' + tier + '\')">' + tier + '</button>').join('');
    const body = rows.length ? rows.map((row, rank) => {
      const verdict = goldenVerdict(row);
      const siteLabel = ({naver:'네이버',google:'구글',nate:'네이트',zum:'줌',daum:'다음'})[row.sourceSite] || '';
      const sourceLabel = row.sourceType === '실시간 후보'
        ? '🔥 ' + (siteLabel || '실시간') + (row.isLiveSeed ? ' 급상승 원문' : ' 급상승 연관')
        : (row.sourceType || '생활형 연관어');
      return '<tr data-golden-index="' + row._goldenIndex + '" onclick="selectGoldenKeyword(' + row._goldenIndex + ')">' +
        '<td>' + (rank + 1) + '</td><td><strong>' + escapeHtml(row.keyword) + '</strong><br/><small style="color:#475569">' + escapeHtml(row.tier) + ' · ' + escapeHtml(row.grade) + ' · ' + escapeHtml(row.keywordCategory || '생활정보') + ' · ' + escapeHtml(sourceLabel) + '</small></td>' +
        '<td>' + (row.searchVolumeUnavailable ? '조회 실패' : formatNumber(row.total)) + '</td><td>' + (row.searchVolumeUnavailable ? '-' : formatNumber(row.pc)) + '</td><td>' + (row.searchVolumeUnavailable ? '-' : formatNumber(row.mobile)) + '</td>' +
        '<td>' + (row.blogCountUnavailable ? '조회 실패' : formatNumber(row.blogCount)) + '</td><td>'+window.recentBlogHtml(row.keyword)+'</td>' +
        (showCompetition ? '<td>' + (row.competitionRatio == null ? '-' : row.competitionRatio.toFixed(4)) + '</td><td><span class="golden-verdict ' + verdict.cls + '" title="' + escapeHtml(verdict.help) + '">' + verdict.text + '</span></td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="' + (showCompetition ? 9 : 7) + '" style="text-align:center;padding:35px;color:#475569">이 분류와 체급에 해당하는 키워드가 없습니다.</td></tr>';
    const guideText = selectedGoldenChannel === 'naver'
      ? '<b style="color:#047857">네이버 블로그 최적화:</b> 표 안에 네이버·구글·네이트·줌·다음 급상승어의 연관 키워드를 함께 분석해 표시합니다. 각 행에서 검색량·문서수·문서/검색 비율을 바로 비교하세요.'
      : '<b style="color:#a16207">애드센스 고단가 주제:</b> 단순 보험사 이름은 제외하고 보장·청구·보험료·비교처럼 목적이 분명한 금융·세금·법률·의료 키워드만 분류합니다. 실제 CPC를 보장하는 표시는 아닙니다.';
    const verdictGuide = '<div style="margin:10px 0 12px;padding:12px 14px;border:1px solid #dbe3ef;border-radius:12px;background:#ffffff;color:#172033;font-size:13.667px;line-height:1.7">' + guideText + '</div>';
    const tableHead = '<tr><th>#</th><th>키워드</th><th>총검색량</th><th>PC</th><th>모바일</th><th>문서수</th><th>최근 30일 발행 문서수<br><small>무료 일 20개 · 유효한 유료키 무제한</small></th>' + (showCompetition ? '<th>문서/검색</th><th>경쟁도</th>' : '') + '</tr>';
    document.getElementById('goldenGrid').innerHTML = channelTabs + '<div class="golden-tier-filters">' + filters + '</div>' + verdictGuide +
      '<div class="golden-live-board"><section class="golden-live-panel"><div class="golden-table-wrap"><table class="golden-live-table"><thead>' + tableHead + '</thead><tbody>' + body + '</tbody></table></div></section>' +
      '<aside class="golden-live-panel golden-detail" id="goldenLiveDetail"><div style="color:#475569;text-align:center;padding:80px 10px">왼쪽 키워드를 선택하면 30일 추이와 활용 판단을 표시합니다.</div></aside></div>';
    if (rows.length) setTimeout(function() { selectGoldenKeyword(rows[0]._goldenIndex); }, 0);
  }

  function setGoldenTier(tier) {
    selectedGoldenTier = tier;
    renderGoldenLiveBoard();
  }

  function setGoldenChannel(channel) {
    selectedGoldenChannel = channel;
    selectedGoldenTier = '전체';
    renderGoldenLiveBoard();
  }

  function buildContentOpportunity(row) {
    const keyword = String(row.keyword || '').trim();
    const year = new Date().getFullYear();
    const ratioText = row.channel === 'adsense'
      ? escapeHtml(row.keywordCategory || '고단가 목적형')
      : (row.competitionRatio == null ? '경쟁도 계산 전' : '문서/검색 비율 ' + row.competitionRatio.toFixed(4));
    let type = '정보 탐색형';
    let titles = [
      '[' + year + ' 최신] ' + keyword + ' 핵심 내용 한 번에 정리',
      keyword + ' 처음 알아볼 때 놓치기 쉬운 7가지',
      keyword + ' 검색 전에 꼭 확인해야 할 내용'
    ];
    let outline = ['핵심 답변 10초 요약','누가 검색하는지','꼭 알아야 할 핵심 정보','헷갈리는 부분 비교','자주 묻는 질문'];
    let ctas = [keyword + ' 핵심 내용 바로 확인하기', keyword + ' 체크리스트 확인하기', keyword + ' 관련 정보 더 알아보기'];
    let tails = [keyword + ' 뜻', keyword + ' 최신 정보', keyword + ' 확인 방법', keyword + ' 주의사항', keyword + ' 자주 묻는 질문'];
    let publishPoint = '검색자가 가장 궁금해하는 답을 첫 화면에서 먼저 보여주고, 표와 체크리스트를 추가하면 체류시간을 확보하기 좋습니다.';
    let operation = '정보를 찾는 검색자의 질문에 빠르게 답하는 구조가 좋습니다. 첫 문단에서 결론을 제시하고 세부 설명과 FAQ로 이어가세요.';
    let revenue = '정보 탐색형 키워드입니다. 관련 서비스·상품이 자연스럽게 연결되는 경우에만 광고 클릭 가능성이 높아질 수 있습니다.';

    if (/(오류|에러|안됨|안돼|실패|해결|문제|고장|먹통)/.test(keyword)) {
      type = '문제 해결형';
      titles = ['[' + year + ' 최신] ' + keyword + ' 원인과 해결 방법 총정리', keyword + ' 발생할 때 먼저 확인할 5가지', keyword + ' 해결 안 될 때 단계별 점검 방법'];
      outline = ['증상과 해결 순서 10초 요약','서비스 전체 문제인지 확인','내 설정·환경 점검','단계별 해결 방법','그래도 안 될 때 문의 방법','FAQ'];
      ctas = ['지금 문제 원인부터 확인하기','단계별 해결 방법 바로 보기','같은 오류 재발 방지 설정 확인하기'];
      tails = [keyword + ' 해결', keyword + ' 원인', keyword + ' 안될 때', keyword + ' 재시도', keyword + ' 고객센터', keyword + ' 최신 오류'];
      publishPoint = '오류가 발생한 당일 빠르게 발행하고, 해결 순서를 글 상단에 배치하세요. 이후 원인별 세부 해결 글로 확장하기 좋습니다.';
      operation = '문제 해결 의도가 강한 키워드입니다. “내 문제인지, 서비스 전체 문제인지”를 먼저 구분한 뒤 가장 빠른 해결 순서부터 제시하세요.';
      revenue = '긴급 해결형 검색은 집중도가 높습니다. 관련 도구·서비스·대체 수단을 해결 과정 안에서 자연스럽게 설명하는 방식이 적합합니다.';
    } else if (/(사용처|가맹점|어디서|사용가능|사용 가능)/.test(keyword)) {
      type = '사용처 확인형';
      titles = ['[' + year + ' 최신] ' + keyword + ' 온라인·오프라인 한눈에 확인', keyword + ' 어디서 쓸 수 있나? 지역별 확인 방법', keyword + ' 사용 가능한 곳과 결제 전 주의사항'];
      outline = ['사용 가능 여부 바로 답변','온라인 사용처','오프라인 사용처','지역별 찾는 방법','결제 제한과 주의사항','FAQ'];
      ctas = ['내 주변 사용처 바로 찾기','온라인 사용 가능 여부 확인하기','결제 전 제한 업종 확인하기'];
      tails = [keyword + ' 온라인', keyword + ' 오프라인', keyword + ' 지역별', keyword + ' 조회', keyword + ' 가맹점', keyword + ' 결제'];
      publishPoint = '지역명·온라인·오프라인으로 소제목을 나누고 공식 조회 경로를 상단에 배치하세요. 명절·휴가철 전에는 최신 정보로 갱신하는 것이 좋습니다.';
      operation = '방문 또는 결제 직전 검색하는 사용자가 많을 수 있습니다. 긴 설명보다 사용 가능 여부와 조회 경로를 먼저 보여주세요.';
      revenue = '결제·방문 행동과 가까운 검색입니다. 주변 서비스, 예약, 교통, 쇼핑 관련 문맥과 자연스럽게 연결될 수 있습니다.';
    } else if (/(신청|발급|등록|접수|재발급|가입|자격|조건)/.test(keyword)) {
      type = '신청 행동형';
      titles = ['[' + year + ' 최신] ' + keyword + ' 대상·조건·절차 총정리', keyword + ' 신청 전 준비서류와 놓치기 쉬운 조건', keyword + ' 신청 방법: 온라인부터 처리 결과 확인까지'];
      outline = ['대상 여부 10초 확인','신청 조건','준비서류','온라인·방문 신청 순서','처리 기간과 결과 확인','탈락·반려 원인','FAQ'];
      ctas = ['내가 신청 대상인지 확인하기','필요 서류 체크리스트 보기','온라인 신청 경로 바로 확인하기'];
      tails = [keyword + ' 방법', keyword + ' 조건', keyword + ' 서류', keyword + ' 기간', keyword + ' 온라인', keyword + ' 대상'];
      publishPoint = '마감일이나 제도 변경 전에 발행하고, 대상·서류·신청 버튼을 글 상단에 배치하세요. 변경 사항이 생기면 날짜를 표시해 갱신하세요.';
      operation = '실제 행동으로 이어지는 검색입니다. 대상 여부 → 준비물 → 신청 순서 → 결과 확인 순으로 구성하면 이탈을 줄일 수 있습니다.';
      revenue = '신청·가입 의도가 있는 키워드로 전환 가능성이 비교적 높을 수 있습니다. 단, 과장 없이 공식 신청 경로와 조건을 정확히 안내하세요.';
    } else if (/(지원금|환급|장려금|보조금|혜택|급여|수당)/.test(keyword)) {
      type = '혜택 확인형';
      titles = ['[' + year + '] ' + keyword + ' 대상·금액·신청일 한 번에 정리', keyword + ' 나는 받을 수 있을까? 조건과 제외 대상', keyword + ' 신청 시기와 지급일까지 꼭 확인할 내용'];
      outline = ['받을 수 있는지 10초 요약','지원 대상과 제외 대상','지원 금액','신청 기간','신청 방법과 서류','지급 일정','FAQ'];
      ctas = ['내 지원 대상 여부 확인하기','예상 혜택과 지급일 확인하기','신청 기간 놓치기 전에 체크하기'];
      tails = [keyword + ' 대상', keyword + ' 금액', keyword + ' 신청', keyword + ' 지급일', keyword + ' 조건', keyword + ' 제외 대상'];
      publishPoint = '공고 직후와 신청 마감 전에 수요가 커질 수 있습니다. 대상·금액·기간을 표로 만들고 공식 출처의 기준일을 명시하세요.';
      operation = '금액과 자격을 빠르게 확인하려는 의도가 강합니다. “누가, 얼마를, 언제, 어떻게” 받는지를 첫 화면에서 답하세요.';
      revenue = '생활·금융 관심도가 높은 키워드입니다. 금융·보험·생활 서비스 광고와 연결될 수 있지만 수익을 보장하지는 않습니다.';
    } else if (/(보험|카드|대출|연금)/.test(keyword)) {
      type = '금융 비교형';
      titles = ['[' + year + '] ' + keyword + ' 조건·혜택·주의사항 비교', keyword + ' 선택 전에 꼭 비교할 항목 7가지', keyword + ' 장점만 보면 놓치는 비용과 조건 정리'];
      outline = ['핵심 조건 요약','대상과 가입 조건','비용·혜택 비교','장점과 단점','중도 해지·제외 조건','선택 체크리스트','FAQ'];
      ctas = ['내 조건에 맞는지 확인하기','혜택과 비용 비교표 보기','가입 전 제외 조건 체크하기'];
      tails = [keyword + ' 조건', keyword + ' 혜택', keyword + ' 비교', keyword + ' 단점', keyword + ' 후기', keyword + ' 해지'];
      publishPoint = '조건과 비용이 바뀔 수 있으므로 기준일을 표시하고, 장점뿐 아니라 제외 조건과 불이익도 함께 작성하세요.';
      operation = '비교와 의사결정 의도가 강한 금융 키워드입니다. 핵심 조건을 표로 비교하고 독자 상황별 선택 기준을 제시하세요.';
      revenue = '금융 광고와 연관성이 높은 편일 수 있으나 경쟁과 정책 민감도도 높습니다. 정확성·출처·균형 잡힌 설명을 우선하세요.';
    } else if (/(후기|추천|비교|순위|장단점)/.test(keyword)) {
      type = '비교·후기형';
      titles = [keyword + ' 직접 비교: 장점·단점과 선택 기준', '[' + year + '] ' + keyword + ' 추천 전에 꼭 볼 체크포인트', keyword + ' 후기에서 자주 나오는 만족·불만 요소 정리'];
      outline = ['결론 먼저 보기','비교 기준','장점','단점','어떤 사람에게 맞는지','선택 전 체크리스트','FAQ'];
      ctas = ['나에게 맞는 선택인지 확인하기','장단점 비교표 바로 보기','구매·신청 전 체크리스트 확인하기'];
      tails = [keyword + ' 장점', keyword + ' 단점', keyword + ' 실제 후기', keyword + ' 비교', keyword + ' 추천 대상', keyword + ' 가격'];
      publishPoint = '단순 추천보다 비교 기준과 추천 대상을 분명히 하세요. 직접 경험하지 않았다면 후기처럼 단정하지 말고 자료 비교임을 밝혀야 합니다.';
      operation = '결정 직전의 검색 의도가 있습니다. 무조건 추천하기보다 어떤 사람에게 맞고 맞지 않는지를 나눠 보여주세요.';
      revenue = '상품·서비스 선택과 가까운 키워드라 광고·전환 가능성이 있을 수 있습니다. 신뢰를 위해 장단점과 제한 사항을 함께 제시하세요.';
    } else if (/(가격|비용|요금|할인|얼마)/.test(keyword)) {
      type = '가격 확인형';
      titles = ['[' + year + '] ' + keyword + ' 실제 비용과 추가금 총정리', keyword + ' 얼마가 적당할까? 가격 구성과 절약 방법', keyword + ' 할인 조건·추가 비용까지 한눈에 비교'];
      outline = ['가격 한눈에 보기','기본 비용','추가 비용','할인 조건','대안별 가격 비교','절약 체크리스트','FAQ'];
      ctas = ['최신 가격표 바로 확인하기','숨은 추가 비용 확인하기','할인받을 수 있는 조건 체크하기'];
      tails = [keyword + ' 최신 가격', keyword + ' 비용', keyword + ' 할인', keyword + ' 추가금', keyword + ' 비교', keyword + ' 저렴하게'];
      publishPoint = '가격 변동이 잦다면 기준일을 제목과 표에 표시하세요. 기본가와 실제 결제 비용을 구분하면 검색 만족도가 높아집니다.';
      operation = '구매·신청 전에 실제 지출을 확인하려는 검색입니다. 가격 숫자를 숨기지 말고 기본 비용과 추가 비용을 분리해 보여주세요.';
      revenue = '상업적 의도가 비교적 뚜렷한 키워드입니다. 가격 비교와 절약 정보를 충분히 제공한 뒤 관련 서비스를 자연스럽게 연결하세요.';
    }

    // CTA는 선택한 키워드의 세부 행동 의도까지 반영해 같은 문구가 반복되지 않도록 합니다.
    if (/(보장|보장범위|보장내용)/.test(keyword)) {
      ctas = [keyword + ' 보장 항목 바로 확인하기', keyword + ' 보장 제외 항목 체크하기', keyword + ' 보험료와 보장 수준 비교하기'];
    } else if (/(청구|보험금)/.test(keyword)) {
      ctas = [keyword + ' 필요 서류 확인하기', keyword + ' 온라인 청구 순서 보기', keyword + ' 지급 기간과 반려 사유 확인하기'];
    } else if (/(보험료|견적|가격|비용|요금)/.test(keyword)) {
      ctas = [keyword + ' 최신 비용표 확인하기', keyword + ' 추가 비용 체크하기', keyword + ' 할인 조건 비교하기'];
    } else if (/(갱신|해지)/.test(keyword)) {
      ctas = [keyword + ' 처리 조건 확인하기', keyword + ' 불이익과 환급금 체크하기', keyword + ' 온라인 처리 방법 보기'];
    } else if (/(신청|가입|발급|등록)/.test(keyword)) {
      ctas = [keyword + ' 대상 여부 확인하기', keyword + ' 준비서류 체크하기', keyword + ' 신청 경로 바로 보기'];
    } else if (/(비교|추천|후기)/.test(keyword)) {
      ctas = [keyword + ' 핵심 비교표 확인하기', keyword + ' 장단점 바로 보기', keyword + ' 나에게 맞는 선택 기준 확인하기'];
    } else if (/(오류|에러|안됨|실패|해결)/.test(keyword)) {
      ctas = [keyword + ' 원인부터 확인하기', keyword + ' 단계별 해결법 보기', keyword + ' 재발 방지 설정 확인하기'];
    } else {
      ctas = ctas.map(item => item.indexOf(keyword) >= 0 ? item : keyword + ' · ' + item);
    }

    const apiRelated = (Array.isArray(row.relatedKeywords) ? row.relatedKeywords : []).map(item => String(item.keyword || '').trim()).filter(Boolean);
    const uniqueLongtails = [];
    apiRelated.concat(tails).forEach(item => { if (item && uniqueLongtails.indexOf(item) < 0 && uniqueLongtails.length < 8) uniqueLongtails.push(item); });
    return { keyword, type, ratioText, titles, outline, ctas, longtails:uniqueLongtails, publishPoint, operation, revenue };
  }

  function renderContentOpportunity(row) {
    const report = buildContentOpportunity(row);
    const titles = report.titles.map((item, i) => '<div style="padding:7px 9px;border-radius:8px;background:#ffffff"><b style="color:#a16207">' + (i + 1) + '.</b> ' + escapeHtml(item) + '</div>').join('');
    const ctas = report.ctas.map(item => '<span style="display:inline-block;padding:7px 10px;border-radius:9px;background:rgba(16,185,129,.13);border:1px solid rgba(16,185,129,.3);color:#6ee7b7">👉 ' + escapeHtml(item) + '</span>').join(' ');
    const tails = report.longtails.map(item => '<span style="display:inline-block;padding:6px 9px;border:1px solid #dbe3ef;border-radius:14px;color:#334155;font-size:12.667px">' + escapeHtml(item) + '</span>').join(' ');
    return '<div style="margin-top:16px;padding:15px;border:1px solid rgba(245,158,11,.35);border-radius:13px;background:rgba(120,53,15,.08)">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:13px"><strong style="color:#a16207">💰 애드센스 콘텐츠 작성 설계</strong><small style="color:#475569">' + escapeHtml(report.type) + ' · ' + escapeHtml(report.ratioText) + '</small></div>' +
      '<div style="display:grid;gap:13px;font-size:13.667px;color:#172033">' +
      '<section><b style="color:#1d4ed8">✅ 운영 포인트</b><div style="margin-top:6px;line-height:1.75">' + escapeHtml(report.operation) + '<br/>' + escapeHtml(report.revenue) + '</div></section>' +
      '<section><b style="color:#a16207">✍ 제목 예시</b><div style="display:grid;gap:5px;margin-top:6px">' + titles + '</div></section>' +
      '<section><b style="color:#a78bfa">🧩 본문 구성</b><div style="margin-top:6px;line-height:1.7">' + report.outline.map(escapeHtml).join(' → ') + '</div></section>' +
      '<section><b style="color:#047857">👉 CTA 문구</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px">' + ctas + '</div></section>' +
      '<section><b style="color:#1d4ed8">🔍 추천 롱테일 키워드</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:7px">' + tails + '</div></section>' +
      '<section style="padding:10px;border-radius:9px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2)"><b style="color:#1d4ed8">📌 발행 포인트</b><div style="margin-top:5px;line-height:1.7">' + escapeHtml(report.publishPoint) + '</div></section>' +
      '<small style="color:#475569">※ 제목·CTA·수익 관점은 키워드 문구와 API 수치를 이용한 자동 작성 제안입니다. 사실관계와 공식 출처는 발행 전에 직접 확인하세요.</small></div></div>';
  }

  async function selectGoldenKeyword(index) {
    const row = currentGoldenRows[index];
    const panel = document.getElementById('goldenLiveDetail');
    if (!row || !panel) return;
    document.querySelectorAll('[data-golden-index]').forEach(tr => tr.classList.toggle('active', Number(tr.dataset.goldenIndex) === index));
    const verdict = goldenVerdict(row);
    const showCompetition = row.channel === 'naver';
    const statsHtml = showCompetition
      ? '<div class="golden-detail-stats"><div class="golden-detail-stat"><small>검색량</small><strong>' + formatNumber(row.total) + '</strong></div><div class="golden-detail-stat"><small>문서수</small><strong>' + (row.blogCountUnavailable ? '조회 실패' : formatNumber(row.blogCount)) + '</strong></div><div class="golden-detail-stat"><small>비율</small><strong>' + (row.competitionRatio == null ? '-' : row.competitionRatio.toFixed(4)) + '</strong></div></div>'
      : '<div class="golden-detail-stats" style="grid-template-columns:repeat(2,1fr)"><div class="golden-detail-stat"><small>검색량</small><strong>' + formatNumber(row.total) + '</strong></div><div class="golden-detail-stat"><small>문서수</small><strong>' + (row.blogCountUnavailable ? '조회 실패' : formatNumber(row.blogCount)) + '</strong></div></div>';
    panel.innerHTML = '<h3 style="margin:0;color:#172033;font-size:22.667px">📈 ' + escapeHtml(row.keyword) + '</h3>' +
      statsHtml +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px"><strong style="color:#172033;font-size:14.667px">최근 30일 검색 추이</strong>' + (showCompetition ? '<span class="golden-verdict ' + verdict.cls + '" id="goldenTrendVerdict" title="' + escapeHtml(verdict.help) + '">' + verdict.text + '</span>' : '<span class="golden-verdict recommend" id="goldenTrendVerdict">추이 확인</span>') + '</div>' +
      '<div class="golden-trend-wrap"><canvas height="215" id="goldenTrendCanvas" width="560"></canvas></div>' +
      '<div class="intent-box" id="goldenTrendInsight" style="margin-top:14px">' + (showCompetition ? '<b style="color:#172033">경쟁도 참고:</b> ' + escapeHtml(verdict.help) + '<br/>' : '') + '30일 추이를 확인해 실제 관심이 유지되는지도 함께 살펴보세요.</div>' +
      window.recentBlogHtml(row.keyword) + renderContentOpportunity(row) +
      '<div class="action-row"><a class="btn-mini naver" href="https://search.naver.com/search.naver?query=' + encodeURIComponent(row.keyword) + '" target="_blank">네이버 확인</a><a class="btn-mini" href="https://search.naver.com/search.naver?where=blog&amp;query=' + encodeURIComponent(row.keyword) + '" target="_blank">블로그 문서 확인</a></div>';
    await drawGoldenTrend(row);
  }

  async function drawGoldenTrend(row) {
    const canvas = document.getElementById('goldenTrendCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('30일 추이를 불러오는 중...', canvas.width / 2, canvas.height / 2);
    try {
      let result;
      if (Array.isArray(row.trend30)) {
        result = { success:row.trend30.length > 0, data:row.trend30, cached:true };
      } else {
        result = await fetchFromWorker('getSearchTrend', { keyword: row.keyword });
      }
      if (!result.success || !result.data || !result.data.length) {
        ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fbbf24'; ctx.textAlign='center';
        ctx.fillText('30일 검색 데이터가 부족한 키워드입니다.',canvas.width/2,canvas.height/2);
        const emptyInsight=document.getElementById('goldenTrendInsight');
        if (emptyInsight) emptyInsight.textContent='API 오류가 아니라 네이버 데이터랩에서 공개할 만큼의 30일 검색 추이가 부족한 경우입니다. 검색량과 문서수를 우선 참고하세요.';
        return;
      }
      const data = result.data, maxVal = Math.max(1, ...data.map(item => Number(item.ratio) || 0));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const left=18, right=8, top=12, bottom=24, w=canvas.width-left-right, h=canvas.height-top-bottom;
      const step=w/data.length, bw=Math.max(3,step-4);
      data.forEach((item,i) => { const value=Number(item.ratio)||0, bh=value/maxVal*h; ctx.fillStyle='#818cf8'; ctx.fillRect(left+i*step+2, top+h-bh, bw, bh); });
      ctx.fillStyle='#64748b'; ctx.font='9px sans-serif'; ctx.textAlign='left'; ctx.fillText(data[0].period||'',left,canvas.height-5); ctx.textAlign='right'; ctx.fillText(data[data.length-1].period||'',canvas.width-right,canvas.height-5);
      const recent=data.slice(-7).reduce((s,x)=>s+(Number(x.ratio)||0),0)/Math.min(7,data.length);
      const previous=data.slice(-14,-7).reduce((s,x)=>s+(Number(x.ratio)||0),0)/Math.max(1,Math.min(7,Math.max(0,data.length-7)));
      const trend=previous>0 ? recent/previous : 1;
      const insight=document.getElementById('goldenTrendInsight'), badge=document.getElementById('goldenTrendVerdict');
      if (trend >= 1.15) { badge.textContent='관심 상승'; badge.className='golden-verdict now'; insight.textContent='최근 7일 관심도가 이전 7일보다 상승 중입니다. 검색자가 원하는 답을 글 상단에 먼저 제시하고 관련 세부 글을 빠르게 연결해 보세요.'; }
      else if (trend < 0.75) { badge.textContent='관심 하락'; badge.className='golden-verdict watch'; insight.textContent='최근 관심도가 하락 중입니다. 계절성 또는 단기 이슈인지 검색 결과를 확인하고, 오래 검색될 정보 중심으로 구성하세요.'; }
      else { badge.textContent='관심 유지'; badge.className='golden-verdict recommend'; insight.textContent='최근 관심도가 비교적 유지되고 있습니다. 상위 문서에서 부족한 설명을 찾아 체크리스트·표·FAQ로 보완해 보세요.'; }
    } catch (err) {
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fb7185'; ctx.textAlign='center'; ctx.fillText('30일 추이를 불러오지 못했습니다.',canvas.width/2,canvas.height/2);
      const insight=document.getElementById('goldenTrendInsight'); if (insight) insight.textContent='검색어 트렌드 API 권한 또는 일시적인 호출 오류를 확인해 주세요.';
    }
  }

  const workerRequestGuard = { timestamps:[], inflight:new Map(), limit:20, windowMs:60000 };
  async function fetchFromWorker(action, extraParams = {}) {
    const requestKey = String(action || '') + '|' + JSON.stringify(extraParams || {});
    if (workerRequestGuard.inflight.has(requestKey)) return workerRequestGuard.inflight.get(requestKey);

    const now = Date.now();
    workerRequestGuard.timestamps = workerRequestGuard.timestamps.filter(function(timestamp) {
      return now - timestamp < workerRequestGuard.windowMs;
    });
    if (workerRequestGuard.timestamps.length >= workerRequestGuard.limit) {
      return { success:false, error:'안전한 서버 사용을 위해 잠시 요청을 멈췄습니다. 1분 뒤 다시 시도해 주세요.' };
    }
    workerRequestGuard.timestamps.push(now);

    const requestPromise = (async function() {
      const keys = getSavedApiKeys();
      const payload = { action: action, ...extraParams, ...keys };
      const res = await fetch(WORKER_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        // text/plain은 브라우저의 불필요한 CORS OPTIONS 사전 요청을 만들지 않습니다.
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
      const result = await res.json().catch(function() { return { success:false, error:'Worker가 JSON 응답을 반환하지 않았습니다.' }; });
      if (!res.ok && result.success !== false) result.success = false;
      return result;
    })();

    workerRequestGuard.inflight.set(requestKey, requestPromise);
    try { return await requestPromise; }
    finally { workerRequestGuard.inflight.delete(requestKey); }
  }

  async function fetchWorkerGet(action) {
    const endpoint=['getTrendingKeywords','getEntertainmentNews'].includes(action)?'/api/keyword-center':WORKER_API_URL;
    const response = await fetch(endpoint + '?action=' + encodeURIComponent(action) + '&_=' + Date.now(), { cache:'no-store' });
    const result = await response.json().catch(function() { return { success:false, error:'Worker가 JSON 응답을 반환하지 않았습니다.' }; });
    if (!response.ok && result.success !== false) result.success = false;
    return result;
  }

  function adsensePlatformMeta(platform) {
    return {
      wordpress: { title:'워드프레스', icon:'🟣', color:'#6d28d9', border:'#d8b4fe', background:'#faf5ff', desc:'비교·체크리스트·가이드형 롱폼' },
      tistory: { title:'티스토리', icon:'🟠', color:'#c2410c', border:'#fed7aa', background:'#fff7ed', desc:'사용 경험·설정·문제 해결형' },
      naver: { title:'네이버 블로그', icon:'🟢', color:'#047857', border:'#a7f3d0', background:'#ecfdf5', desc:'생활정보·행정·소비자 정보형' }
    }[platform] || { title:platform, icon:'💡', color:'#172033', border:'#dbe3ef', background:'#ffffff', desc:'' };
  }

  function renderAdsenseDailyPlatform(platform, items) {
    const meta = adsensePlatformMeta(platform);
    const rows = Array.isArray(items) ? items.slice(0, 3) : [];
    const cards = rows.map(function(item, index) {
      return '<article data-keyword="' + escapeHtml(item.keyword) + '" data-platform="' + platform + '" onclick="loadAdsenseKeywordReport(this.dataset.keyword,this.dataset.platform)" style="padding:16px;border:1px solid #cbd4de;border-radius:12px;background:#f7f8fa;cursor:pointer;transition:transform .16s ease,border-color .16s ease" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.borderColor=\'' + meta.color + '\'" onmouseleave="this.style.transform=\'\';this.style.borderColor=\'#cbd4de\'">' +
        '<div style="display:flex;align-items:center;gap:11px"><span style="flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:' + meta.background + ';color:' + meta.color + ';font-size:15.667px;font-weight:900">' + (index + 1) + '</span>' +
        '<div style="min-width:0;flex:1"><strong style="display:block;color:#172033;font-size:20.667px;line-height:1.45;letter-spacing:-.02em">' + escapeHtml(item.keyword) + '</strong><div style="margin-top:9px;color:' + meta.color + ';font-size:16.667px;font-weight:900">30일 추이·콘텐츠 전략 보기 →</div></div></div></article>';
    }).join('');
    return '<section style="padding:19px;border:1px solid ' + meta.border + ';border-radius:16px;background:' + meta.background + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px"><div><h3 style="margin:0;color:' + meta.color + ';font-size:20.667px">' + meta.icon + ' ' + meta.title + '</h3><div style="margin-top:5px;color:#475569;font-size:14.667px">' + meta.desc + '</div></div><span style="color:' + meta.color + ';font-size:15.667px;font-weight:800">3개 추천</span></div>' +
      '<div style="display:grid;gap:10px">' + cards + '</div></section>';
  }

  async function loadTodayAdsenseRecommendations(force) {
    const board = document.getElementById('adsenseDailyBoard');
    const loading = document.getElementById('adsenseDailyLoading');
    const updateDate = document.getElementById('adsenseDailyUpdateDate');
    if (!force && board.dataset.loaded === '1') return;
    loading.style.display = 'block';
    board.innerHTML = '';
    try {
      const result = await fetchFromWorker('getTodayAdsenseKeywords', {});
      if (!result || !result.success || !result.platforms) {
        throw new Error((result && result.error) || '오늘의 추천 데이터를 받을 수 없습니다.');
      }
      const platforms = result.platforms;
      const valid = ['wordpress', 'tistory', 'naver'].every(function(name) {
        return Array.isArray(platforms[name]) && platforms[name].length === 3;
      });
      if (!valid) throw new Error('추천 데이터 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.');
      board.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px">' +
        renderAdsenseDailyPlatform('wordpress', platforms.wordpress) +
        renderAdsenseDailyPlatform('tistory', platforms.tistory) +
        renderAdsenseDailyPlatform('naver', platforms.naver) + '</div>';
      board.dataset.loaded = '1';
      updateDate.textContent = '추천 기준일: ' + escapeHtml(result.date || '') + ' · 생성 시각: ' + escapeHtml(result.generatedAt || '') + (result.fallback ? ' · Gemini 무료 할당량 초과로 기본 기획 추천 표시 중' : ' · 매일 00:00(KST) 갱신');
    } catch (error) {
      board.dataset.loaded = '0';
      board.innerHTML = '<div style="padding:24px;border:1px solid rgba(248,113,113,.4);border-radius:14px;background:rgba(127,29,29,.14);color:#fecaca;text-align:center;line-height:1.8"><b>오늘의 애드센스 키워드를 불러오지 못했습니다.</b><br/><span style="font-size:14.667px;color:#172033">' + escapeHtml(error.message || '잠시 후 다시 시도해 주세요.') + '</span></div>';
      updateDate.textContent = '';
    } finally {
      loading.style.display = 'none';
    }
  }
  function adsenseScoreDescriptor(kind, score) {
    const safe = Math.max(1, Math.min(5, Number(score) || 3));
    const labels = {
      traffic:['매우 낮음','낮음','보통','높음','매우 높음'],
      cpc:['광고주 수요 낮음','광고주 수요 다소 낮음','광고주 수요 보통','광고주 수요 높음','광고주 수요 매우 높음'],
      durability:['단기성 높음','단기·계절성','보통','장기 검색 가능','에버그린 성격 강함'],
      exposure:['매우 어려움','어려움','보통','도전 가능','상대적으로 유리']
    };
    return (labels[kind] || labels.traffic)[safe - 1];
  }
  function adsenseScoreCard(label, score, icon, color, kind, explanation) {
    const safeScore = Math.max(1, Math.min(5, Number(score) || 3));
    const descriptor = adsenseScoreDescriptor(kind, safeScore);
    return '<div style="padding:15px;border:1px solid #dbe3ef;border-radius:14px;background:#ffffff"><div style="color:#334155;font-size:13.667px;font-weight:800">' + icon + ' ' + label + '</div><div style="display:flex;justify-content:space-between;align-items:end;margin-top:8px"><b style="font-size:27.667px;color:#172033">' + safeScore + '</b><span style="font-size:13.667px;color:#475569">/ 5</span></div><div style="font-size:13.667px;color:' + color + ';font-weight:800;margin-top:3px">' + descriptor + '</div><div style="height:4px;border-radius:99px;background:#e2e8f0;margin-top:8px;overflow:hidden"><span style="display:block;width:' + (safeScore * 20) + '%;height:100%;background:' + color + '"></span></div><p style="margin:9px 0 0;color:#475569;font-size:12.667px;line-height:1.55">' + explanation + '</p></div>';
  }
  function adsenseRpmBase() {
    try { return Math.max(0, Number(localStorage.getItem('adsenseBasePageRpmKrw') || 0)); } catch (_) { return 0; }
  }
  function formatKrw(value) {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    return amount ? '₩' + amount.toLocaleString('ko-KR') : '—';
  }
  function adsenseRpmMultiplier(score) {
    const safe = Math.max(1, Math.min(5, Number(score) || 3));
    const table = { 1:[0.55,0.80], 2:[0.75,0.95], 3:[0.90,1.15], 4:[1.10,1.35], 5:[1.30,1.65] };
    return table[safe];
  }
  function adsenseRpmCard(cpcScore) {
    const base = adsenseRpmBase();
    const multiplier = adsenseRpmMultiplier(cpcScore);
    const configured = base > 0;
    const min = configured ? base * multiplier[0] : 0;
    const max = configured ? base * multiplier[1] : 0;
    const cpcLabel = adsenseScoreDescriptor('cpc', cpcScore);
    const value = configured ? formatKrw(min) + ' ~ ' + formatKrw(max) : '기준 RPM 입력 필요';
    const detail = configured
      ? '최근 30일 사이트 페이지 RPM ' + formatKrw(base) + '에 광고주 수요 등급 계수 ' + multiplier[0].toFixed(2) + ' ~ ' + multiplier[1].toFixed(2) + '배를 적용했습니다.'
      : '실제 사이트의 최근 30일 페이지 RPM을 입력하면 이 주제의 상대 범위를 계산합니다.';
    return '<div style="margin:16px 0;padding:18px;border:1px solid #bfdbfe;border-radius:16px;background:#eff6ff"><div style="display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap"><div><div style="font-size:16.667px;font-weight:900;color:#1e3a8a">₩ 콘텐츠 주제 기반 예상 페이지 RPM</div><div style="margin-top:7px;font-size:clamp(20px,3vw,28px);font-weight:900;color:#172033">' + value + '</div><div style="margin-top:5px;color:#1d4ed8;font-size:14.667px;font-weight:800">광고주 수요: ' + cpcLabel + ' · 신뢰도: 낮음~보통</div></div><button type="button" class="adsense-rpm-set-btn" style="border:1px solid #2563eb;border-radius:9px;padding:9px 12px;background:#ffffff;color:#1d4ed8;font-weight:850;cursor:pointer">기준 RPM 설정</button></div><p style="margin:12px 0 0;color:#475569;font-size:13.667px;line-height:1.65">' + detail + ' 실제 RPM은 국가·기기·광고 배치·페이지뷰당 광고 노출·CTR·광고 수요에 따라 달라지며, 키워드만으로 확정 또는 보장할 수 없습니다.</p></div>';
  }
  function adsenseScoreMethodGuide() {
    return '<div style="margin:0 0 16px;padding:15px 17px;border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc"><b style="color:#172033;font-size:16.667px">점수 읽는 법: 실제 수익·CPC 확정값이 아닌 AI 콘텐츠 기획용 상대 평가</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:10px;color:#475569;font-size:13.667px;line-height:1.6"><span><b style="color:#4f46e5">T</b> 검색 수요·최근 추이 참고</span><span><b style="color:#d97706">C</b> 광고주 수요·상업성 추정</span><span><b style="color:#059669">D</b> 계절성 대비 장기 검색 가능성</span><span><b style="color:#2563eb">N</b> 경쟁 대비 상위 노출 가능성</span></div><p style="margin:9px 0 0;color:#64748b;font-size:12.667px;line-height:1.6">특히 C=3은 ‘광고주 수요가 보통’이라는 상대 등급이며, 실제 클릭단가·RPM 금액이 아닙니다.</p></div>';
  }

  function adsenseScoreQaEntries() {
    return [
      { title:'T · 트래픽 수요', text:'검색 수요와 최근 관심 흐름을 보는 상대 평가입니다. 1점은 수요가 매우 제한적일 수 있는 주제, 3점은 보통, 5점은 검색 의도가 매우 뚜렷하거나 관심이 높은 후보입니다. 실제 월간 검색량은 30일 추이와 검색량 표에서 별도로 확인하세요.' },
      { title:'C · 광고주 수요', text:'주변에 광고를 집행할 사업자·상품·서비스의 수요와 상업적 탐색 의도를 보는 상대 평가입니다. C=3은 광고주 수요가 보통이라는 뜻이며, 실제 CPC 3원 또는 실제 RPM 금액을 뜻하지 않습니다. 실제 수익은 사이트·국가·기기·광고 배치·CTR에 따라 달라집니다.' },
      { title:'D · 지속 가능성', text:'반짝 이슈인지, 계절성인지, 시간이 지나도 반복 검색될 가능성이 있는지를 봅니다. 1점은 단기성, 3점은 보통, 5점은 에버그린 성격이 강한 주제입니다.' },
      { title:'N · 상위 노출 가능성', text:'경쟁 문서와 주제 난이도를 반대로 환산한 상대 가능성입니다. 1점은 경쟁이 매우 강한 편, 3점은 보통, 5점은 상대적으로 진입 여지가 있는 편입니다. 실제 상위 노출을 보장하지 않습니다.' },
      { title:'1~5점 공통 해석', text:'1점은 매우 낮음 또는 불리함, 2점은 낮음, 3점은 보통, 4점은 높음 또는 유리함, 5점은 매우 높음 또는 매우 유리함입니다. 점수 하나만 보지 말고 T·D·N·실제 검색량·30일 추이를 함께 보세요.' },
      { title:'예상 페이지 RPM', text:'페이지 RPM은 페이지 1,000회 조회당 평균 광고 수익입니다. 기준 RPM 설정에 내 사이트 최근 30일 페이지 RPM을 원화로 입력하면 C 등급에 따라 상대 참고 범위를 표시합니다. 실제 글 하나의 수익 또는 클릭당 단가를 보장하지 않습니다.' },
      { title:'키워드 선택 순서', text:'먼저 T와 실제 검색량·30일 추이를 확인하고, 다음으로 D를 봅니다. 그 뒤 N으로 경쟁 가능성을, 마지막으로 C와 예상 RPM으로 광고주 수요 힌트를 확인하세요.' }
    ];
  }
  function escapeQaText(value) { return escapeHtml(String(value || '')); }
  function renderAdsenseScoreQaItems(query) {
    const normalized = String(query || '').trim().toLowerCase();
    const rows = adsenseScoreQaEntries().filter(function(item) {
      const haystack = (item.title + ' ' + item.text).toLowerCase();
      return !normalized || haystack.indexOf(normalized) >= 0;
    });
    const box = document.getElementById('adsenseScoreQaResults');
    if (!box) return;
    box.innerHTML = rows.length ? rows.map(function(item) {
      return '<article style="padding:15px 0;border-bottom:1px solid #e2e8f0"><b style="display:block;color:#172033;font-size:17.667px">' + escapeQaText(item.title) + '</b><p style="margin:7px 0 0;color:#475569;font-size:15.667px;line-height:1.7">' + escapeQaText(item.text) + '</p></article>';
    }).join('') : '<p style="padding:24px 0;color:#64748b;text-align:center">검색 결과가 없습니다. T, C, D, N, RPM, 검색량 등의 단어로 검색해 보세요.</p>';
  }
  function closeAdsenseScoreQa(event) {
    const modal = document.getElementById('adsenseScoreQaModal');
    if (!modal || (event && event.target !== modal)) return;
    modal.remove();
  }
  function openAdsenseScoreQa() {
    const old = document.getElementById('adsenseScoreQaModal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'adsenseScoreQaModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000002;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(15,23,42,.52);backdrop-filter:blur(3px)';
    modal.onclick = closeAdsenseScoreQa;
    modal.innerHTML = '<section style="width:min(760px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:clamp(20px,3vw,32px);box-sizing:border-box;border:1px solid #cbd5e1;border-radius:20px;background:#f8fafb;box-shadow:0 24px 70px rgba(15,23,42,.32)"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px"><div><span style="display:inline-flex;padding:5px 9px;border-radius:99px;background:#e0e7ff;color:#3730a3;font-size:13.667px;font-weight:900">T · C · D · N · RPM</span><h2 style="margin:10px 0 5px;color:#172033;font-size:clamp(21px,3vw,28px)">평가표 Q&A</h2><p style="margin:0;color:#475569;font-size:15.667px;line-height:1.65">점수의 의미와 예상 RPM 계산 방법을 검색해 확인하세요.</p></div><button type="button" onclick="closeAdsenseScoreQa()" style="width:38px;height:38px;border:1px solid #cbd5e1;border-radius:10px;background:#ffffff;color:#334155;font-size:24.667px;cursor:pointer">×</button></div><label style="display:block;margin-top:20px;color:#334155;font-size:15.667px;font-weight:800">평가표에서 찾기</label><input id="adsenseScoreQaSearch" type="search" placeholder="예: C=3, 광고 단가, RPM, 상위 노출, 검색량" oninput="renderAdsenseScoreQaItems(this.value)" style="width:100%;box-sizing:border-box;margin-top:7px;padding:13px 14px;border:1px solid #94a3b8;border-radius:10px;background:#ffffff;color:#172033;font-size:17.667px;outline:none"/><div id="adsenseScoreQaResults" style="margin-top:12px"></div><p style="margin:16px 0 0;color:#64748b;font-size:13.667px;line-height:1.65">점수는 AI 콘텐츠 기획용 상대 평가이며, 실제 광고 단가·검색량·수익·상위 노출을 보장하지 않습니다.</p></section>';
    document.body.appendChild(modal);
    renderAdsenseScoreQaItems('');
    const input = document.getElementById('adsenseScoreQaSearch');
    if (input) setTimeout(function() { input.focus(); }, 0);
  }


  function formatEstimatedSearchVolume(value) {
    const numberValue = Math.max(0, Math.round(Number(value) || 0));
    if (numberValue >= 100000000) return (numberValue / 100000000).toFixed(numberValue % 100000000 ? 1 : 0) + '억';
    if (numberValue >= 10000) return (numberValue / 10000).toFixed(numberValue % 10000 ? 1 : 0) + '만';
    return numberValue.toLocaleString() + '건';
  }

  function niceSearchAxisMax(maxValue) {
    const value = Math.max(1, Number(maxValue) || 1);
    const targetStep = value / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(targetStep)));
    const normalized = targetStep / magnitude;
    const niceNormalized = normalized <= 1 ? 1 : (normalized <= 2 ? 2 : (normalized <= 5 ? 5 : 10));
    return niceNormalized * magnitude * 5;
  }

  function buildEstimatedSearchTrend(trendData, monthlySearchVolume) {
    const rows = Array.isArray(trendData) ? trendData : [];
    const ratios = rows.map(function(item) { return Math.max(0, Number(item && item.ratio) || 0); });
    const totalRatio = ratios.reduce(function(sum, ratio) { return sum + ratio; }, 0);
    const monthly = Math.max(0, Number(monthlySearchVolume) || 0);
    const canEstimate = monthly > 0 && totalRatio > 0;
    const points = rows.map(function(item, index) {
      return {
        period:String(item && item.period || ''),
        ratio:ratios[index],
        value:canEstimate ? (monthly * ratios[index] / totalRatio) : ratios[index]
      };
    });
    return { points:points, monthly:monthly, isEstimated:canEstimate, axisMax:niceSearchAxisMax(Math.max.apply(null, points.map(function(point) { return point.value; }).concat([1]))) };
  }

  function adsenseTrendChart(data, trendQueryKeyword, trendUsedFallback, monthlySearchVolume) {
    const rows = Array.isArray(data) ? data : (Array.isArray(data && data.data) ? data.data : []);
    if (rows.length < 2) return '<div style="height:220px;display:flex;align-items:center;justify-content:center;color:#475569;font-size:15.667px;background:#f2f4f7;border:1px solid #cfd8e3;border-radius:16px">30일 검색 추이 데이터를 불러오지 못했습니다.</div>';

    const model = buildEstimatedSearchTrend(rows, monthlySearchVolume);
    const pointsData = model.points;
    const values = pointsData.map(function(point) { return point.value; });
    const width = 820, height = 265, left = 58, right = 18, top = 30, bottom = 44;
    const chartW = width - left - right, chartH = height - top - bottom, baseY = height - bottom, axisMax = model.axisMax;
    const xFor = function(index) { return left + chartW * index / (values.length - 1); };
    const yFor = function(value) { return baseY - chartH * value / axisMax; };
    const recent = values.slice(-7).reduce(function(sum, value) { return sum + value; }, 0);
    const previous = values.slice(-14, -7).reduce(function(sum, value) { return sum + value; }, 0);
    const change = previous ? Math.round(((recent - previous) / previous) * 100) : 0;
    const peakIndex = values.reduce(function(best, value, index) { return value > values[best] ? index : best; }, 0);
    const lastIndex = values.length - 1;
    const points = values.map(function(value, index) { return xFor(index).toFixed(1) + ',' + yFor(value).toFixed(1); }).join(' ');
    const area = points + ' ' + xFor(lastIndex).toFixed(1) + ',' + baseY + ' ' + xFor(0).toFixed(1) + ',' + baseY;
    const grid = [0,1,2,3,4,5].map(function(index) {
      const value = axisMax * index / 5, y = yFor(value).toFixed(1);
      return '<line x1="' + left + '" y1="' + y + '" x2="' + (width-right) + '" y2="' + y + '" stroke="#cfd8e3" stroke-dasharray="4 4"/><text x="' + (left-9) + '" y="' + (Number(y)+4) + '" fill="#475569" font-size="10" text-anchor="end">' + escapeHtml(formatEstimatedSearchVolume(value)) + '</text>';
    }).join('');
    const tickIndices = Array.from(new Set([0,1,2,3,4,5].map(function(i) { return Math.round((values.length - 1) * i / 5); })));
    const dates = tickIndices.map(function(index, order) {
      const x = xFor(index).toFixed(1), date = escapeHtml(String(pointsData[index] && pointsData[index].period || '').slice(5));
      const anchor = order === 0 ? 'start' : (order === tickIndices.length - 1 ? 'end' : 'middle');
      return '<line x1="' + x + '" y1="' + baseY + '" x2="' + x + '" y2="' + (baseY+5) + '" stroke="#94a3b8"/><text x="' + x + '" y="' + (height-14) + '" fill="#475569" font-size="11" text-anchor="' + anchor + '">' + date + '</text>';
    }).join('');
    const keyDots = Array.from(new Set([0, peakIndex, lastIndex])).map(function(index) {
      const x = xFor(index).toFixed(1), y = yFor(values[index]).toFixed(1), label = formatEstimatedSearchVolume(values[index]);
      const anchor = index === 0 ? 'start' : (index === lastIndex ? 'end' : 'middle');
      return '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="#c2410c" stroke="#f7f8fa" stroke-width="2"/><text x="' + x + '" y="' + Math.max(18, Number(y)-11) + '" fill="#172033" font-size="11" font-weight="700" text-anchor="' + anchor + '">' + escapeHtml(label) + '</text>';
    }).join('');
    const changeColor = change >= 0 ? '#047857' : '#b42318';
    const fallbackLabel = trendUsedFallback ? '<span style="display:block;margin-top:3px;color:#a16207;font-size:13.667px">대표 검색어 ‘' + escapeHtml(trendQueryKeyword || '') + '’ 기준으로 환산</span>' : '';
    const metricLabel = model.isEstimated ? '월간 검색량을 DataLab 관심도 비중으로 배분한 일별 추정 검색량' : '월간 검색량을 받지 못해 DataLab 관심도 지수로 표시';
    return '<div class="adsense-trend-card" style="padding:18px;border:1px solid #cfd8e3;border-radius:16px;background:#f7f8fa"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px"><div><b style="color:#172033;font-size:17.667px">최근 30일 일별 추정 검색량</b><span style="display:block;margin-top:3px;color:#475569;font-size:13.667px">' + metricLabel + '</span>' + fallbackLabel + '</div><span style="font-size:14.667px;color:' + changeColor + ';font-weight:800">최근 7일 ' + (change >= 0 ? '+' : '') + change + '%</span></div><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="최근 30일 일별 추정 검색량 추이" style="display:block;width:100%;height:auto;min-height:210px"><defs><linearGradient id="adsenseTrendFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#4f46e5" stop-opacity=".22"/><stop offset="1" stop-color="#4f46e5" stop-opacity=".01"/></linearGradient></defs>' + grid + '<polygon points="' + area + '" fill="url(#adsenseTrendFill)"/><polyline fill="none" stroke="#4f46e5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="' + points + '"/>' + keyDots + dates + '<text x="' + left + '" y="16" fill="#475569" font-size="11">' + (model.isEstimated ? '일별 추정 검색량' : '검색 관심도 지수') + '</text></svg></div>';
  }

  async function adsenseCopyText(text, label) {
    const value = String(text || '').trim();
    if (!value) { alert(label + ' 내용이 없습니다.'); return false; }
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); copied = true; } catch (_) {}
    }
    if (!copied) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      textarea.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
      document.body.appendChild(textarea);
      try { textarea.focus({ preventScroll:true }); } catch (_) { textarea.focus(); }
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      try { copied = Boolean(document.execCommand('copy')); } catch (_) { copied = false; }
      textarea.remove();
    }
    if (copied) alert(label + '을(를) 복사했습니다.');
    else alert('복사 권한이 차단되었습니다. 내용을 길게 눌러 직접 복사해 주세요.');
    return copied;
  }

  function renderAdsenseKeywordReport(payload) {
    const report = payload.report || {}, platform = adsensePlatformMeta(payload.platform), panel = document.getElementById('adsenseReportPanel'), scores = report.scores || {};
    const longtails = (report.longtails || []).map(function(item) { return '<span style="display:inline-flex;padding:8px 10px;border:1px solid #dbe3ef;background:#f8fafc;border-radius:999px;color:#172033;font-size:14.667px">⌕ ' + escapeHtml(item) + '</span>'; }).join('');
    const outline = (report.outline || []).map(function(item, index) { return '<li style="padding:9px 0;border-bottom:1px solid #e2e8f0;color:#172033;line-height:1.6"><b style="color:' + platform.color + '">' + (index + 1) + '.</b> ' + escapeHtml(item) + '</li>'; }).join('');
    panel.__adsenseCopyPayload = {
      title: String(report.title || ''),
      outline: (report.outline || []).map(function(item, index) { return (index + 1) + '. ' + item; }).join('\n')
    };
    panel.__adsenseReportPayload = payload;
    panel.onclick = function(event) {
      const button = event.target && event.target.closest ? event.target.closest('.adsense-copy-btn, .adsense-rpm-set-btn, .adsense-score-qa-btn') : null;
      if (!button || !panel.contains(button)) return;
      if (button.classList.contains('adsense-score-qa-btn')) {
        openAdsenseScoreQa();
        return;
      }
      if (button.classList.contains('adsense-rpm-set-btn')) {
        const current = adsenseRpmBase();
        const input = prompt('최근 30일 AdSense 페이지 RPM(원)을 입력하세요. 예: 2500\n입력값은 이 브라우저에만 저장되며, 콘텐츠 주제별 상대 범위를 계산하는 기준값입니다.', current ? String(Math.round(current)) : '');
        if (input !== null) {
          const normalized = Number(String(input).replace(/[,₩\s]/g, ''));
          if (Number.isFinite(normalized) && normalized > 0) {
            try { localStorage.setItem('adsenseBasePageRpmKrw', String(Math.round(normalized))); } catch (_) {}
            renderAdsenseKeywordReport(panel.__adsenseReportPayload);
          } else if (String(input).trim() === '') {
            try { localStorage.removeItem('adsenseBasePageRpmKrw'); } catch (_) {}
            renderAdsenseKeywordReport(panel.__adsenseReportPayload);
          } else alert('0보다 큰 원화 숫자를 입력해 주세요.');
        }
        return;
      }
      const kind = button.getAttribute('data-copy-kind');
      adsenseCopyText(panel.__adsenseCopyPayload && panel.__adsenseCopyPayload[kind], kind === 'outline' ? '목차' : '제목');
    };
    const fallbackNotice = payload.fallback ? '<div style="margin-top:14px;padding:11px 13px;border:1px solid #fde68a;border-radius:10px;background:#fffbeb;color:#92400e;font-size:14.667px;line-height:1.6">Gemini 무료 할당량 초과로 현재는 기본 콘텐츠 기획 템플릿을 표시합니다. 실제 검색 추이는 네이버 DataLab 데이터입니다.</div>' : '';
    panel.innerHTML = '<section style="padding:clamp(18px,3vw,34px);border:1px solid ' + platform.border + ';border-radius:20px;background:#ffffff;box-shadow:0 18px 55px rgba(15,23,42,.10)"><div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid #e2e8f0;padding-bottom:22px"><div><div style="display:inline-flex;padding:6px 9px;border:1px solid ' + platform.border + ';border-radius:7px;color:' + platform.color + ';font-size:13.667px;font-weight:900;background:' + platform.background + '">' + platform.icon + ' ' + platform.title + ' 상세 리포트</div><h2 style="margin:14px 0 7px;color:#172033;font-size:clamp(23px,4vw,36px);line-height:1.25">' + escapeHtml(payload.keyword) + '</h2><p style="margin:0;color:#475569;font-size:14.667px">분석 시각: ' + escapeHtml(payload.generatedAt || '') + ' · AI 콘텐츠 기획 참고용</p></div><div style="min-width:116px;padding:13px 15px;border:1px solid ' + platform.border + ';border-radius:15px;text-align:center;background:' + platform.background + '"><div style="color:#475569;font-size:12.667px;font-weight:800">종합 채점</div><b style="display:block;margin-top:6px;font-size:31.667px;color:' + platform.color + '">' + escapeHtml(scores.total || '') + '<small style="font-size:14.667px;color:#475569"> / 30</small></b><button type="button" class="adsense-score-qa-btn" style="margin-top:9px;border:1px solid ' + platform.border + ';border-radius:8px;padding:6px 8px;background:#ffffff;color:' + platform.color + ';font-size:13.667px;font-weight:850;cursor:pointer">평가표 Q&amp;A</button></div></div>' + fallbackNotice + adsenseScoreMethodGuide() + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:22px 0">' + adsenseScoreCard('T (트래픽 수요)', scores.traffic, '⌁', '#4f46e5', 'traffic', '월간 검색량·최근 추이를 함께 참고합니다.') + adsenseScoreCard('C (광고주 수요)', scores.cpc, '$', '#d97706', 'cpc', '실제 CPC가 아닌 주제의 광고 수요 상대 평가입니다.') + adsenseScoreCard('D (지속 가능성)', scores.durability, '⌛', '#059669', 'durability', '반복 검색 가능성과 계절성을 상대 비교합니다.') + adsenseScoreCard('N (상위 노출 가능성)', 6 - (Number(scores.difficulty) || 3), '◈', '#2563eb', 'exposure', '경쟁 난이도를 반대로 환산한 상대 가능성입니다.') + '</div>' + adsenseRpmCard(scores.cpc) + adsenseTrendChart(payload.trend30 || (payload.trend && payload.trend.data), payload.trendQueryKeyword, payload.trendUsedFallback, payload.monthlySearchVolume) + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:15px"><div style="padding:18px;border:1px solid #99f6e4;border-radius:15px;background:#f0fdfa"><b style="color:#0f766e">▣ 왜 지금 유입되는가 (시의성)</b><p style="margin:12px 0 0;color:#172033;font-size:15.667px;line-height:1.75">' + escapeHtml(report.selectionReason) + '</p></div><div style="padding:18px;border:1px solid #bfdbfe;border-radius:15px;background:#eff6ff"><b style="color:#1d4ed8">☁ 검색 의도 검토 및 질문</b><p style="margin:12px 0 0;color:#172033;font-size:15.667px;line-height:1.75">' + escapeHtml(report.audienceQuestion) + '</p></div><div style="padding:18px;border:1px solid #ddd6fe;border-radius:15px;background:#f5f3ff"><b style="color:#6d28d9">⌕ 선정 근거 (검색 포화도 약점)</b><p style="margin:12px 0 0;color:#172033;font-size:15.667px;line-height:1.75">' + escapeHtml(report.survivalStrategy) + '</p></div><div style="padding:18px;border:1px solid #fde68a;border-radius:15px;background:#fffbeb"><b style="color:#a16207">▣ 고단가 CPC 광고주 분석</b><p style="margin:12px 0 0;color:#172033;font-size:15.667px;line-height:1.75">' + escapeHtml(report.cpcAnalysis) + '</p></div></div><div style="margin-top:15px;padding:18px;border:1px solid #dbe3ef;border-radius:15px;background:#ffffff"><b style="color:#172033">🏷 롱테일 파생 키워드</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' + longtails + '</div></div><div style="margin-top:15px;padding:18px;border:1px solid #dbe3ef;border-radius:15px;background:#ffffff"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b style="color:#172033">✎ 추천 포스팅 제목 및 복사</b><button type="button" class="adsense-copy-btn" data-copy-kind="title" style="border:0;border-radius:8px;padding:8px 11px;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer">▣ 제목 복사</button></div><div style="margin-top:14px;padding:15px;border:1px dashed #5eead4;border-radius:12px;color:#172033;font-size:18.667px;font-weight:800;line-height:1.55;background:#f8fafc">' + escapeHtml(report.title) + '</div></div><div style="margin-top:15px;padding:18px;border:1px solid #dbe3ef;border-radius:15px;background:#ffffff"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b style="color:#172033">☷ 키워드 맞춤 목차 제안</b><button type="button" class="adsense-copy-btn" data-copy-kind="outline" style="border:0;border-radius:8px;padding:8px 11px;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer">▣ 목차 복사</button></div><ol style="list-style:none;padding:0;margin:12px 0 0">' + outline + '</ol></div><p style="margin:16px 0 0;color:#475569;font-size:13.667px;line-height:1.65">' + escapeHtml(report.disclaimer || '') + '</p></section>';
    panel.style.display = 'block'; panel.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  async function loadAdsenseKeywordReport(keyword, platform) {
    const panel = document.getElementById('adsenseReportPanel');
    panel.style.display = 'block'; panel.innerHTML = '<div style="padding:34px;border:1px solid #bfdbfe;border-radius:18px;background:#eff6ff;text-align:center;color:#334155">⌛ <b style="color:#172033">' + escapeHtml(keyword) + '</b> 상세 리포트와 30일 검색 추이를 준비하는 중입니다...</div>'; panel.scrollIntoView({ behavior:'smooth', block:'start' });
    try { const result = await fetchFromWorker('getAdsenseKeywordReport', { keyword:keyword, platform:platform }); if (!result || !result.success || !result.report) throw new Error((result && result.error) || '상세 리포트 데이터를 받을 수 없습니다.'); renderAdsenseKeywordReport(result); }
    catch (error) { panel.innerHTML = '<div style="padding:26px;border:1px solid #fecaca;border-radius:16px;background:#fff1f2;color:#9f1239;text-align:center;line-height:1.8"><b>키워드 상세 리포트를 불러오지 못했습니다.</b><br/><span style="font-size:14.667px;color:#475569">' + escapeHtml(error.message || '잠시 후 다시 시도해 주세요.') + '</span></div>'; }
  }

  function getBulkAccessKey() {
    return getPaidAccessKey();
  }
  function rememberBulkAccessKey(key) {
    return savePaidAccessKey(key);
  }

  function getAnalysisAccessKey() {
    return getPaidAccessKey();
  }
  function saveAnalysisAccessKey(value) {
    return savePaidAccessKey(value);
  }
  // 공통 유료 발급키는 선택 입력입니다. 빈 값이면 Worker가 방문자 IP 기준 무료 한도를 적용합니다.
  function requireAnalysisAccessKey() {
    const key = getPaidAccessKey();
    return /^[A-Z2-9]{16}$/.test(key) ? key : '';
  }
  function updateAnalysisQuotaStatus(usage) {
    if (!usage) return;
    const status = document.getElementById('analysisQuotaStatus');
    if (!status) return;
    if (usage.quotaSource === 'paid_unlimited' || usage.unlimited === true) {
      status.textContent = '유료 발급키 분석 · 차감 없음';
      return;
    }
    const source = usage.quotaSource === 'access_key' ? '공통 유료키' : '무료';
    status.textContent = source + ' 분석 ' + usage.used + '/' + usage.limit + ' 사용 · ' + usage.remaining + '회 남음';
  }
  function renderKeywordAnalysisResult(result, keyword) {
    currentAnalyzerData = normalizeKeywordRows(result.data).sort((a, b) => b.ratio - a.ratio).slice(0, ANALYZER_RESULT_LIMIT);
    document.getElementById('searchedKeywordText').innerText = keyword;
    document.getElementById('resultsWrapper').style.display = 'block';
    document.getElementById('tierFilterContainer').style.display = 'block';
    selectedTier = '전체';
    updateTierFilterUI();
    applyFilters();
  }

  let isKeywordAnalysisRunning = false;
  async function startSingleFastAnalysis() {
    if (isKeywordAnalysisRunning) return;
    const keyword = document.getElementById('singleFastInput').value.trim();
    if (!keyword) return alert('키워드를 1개 입력해주세요.');
    // 발급키는 선택입니다. 빈 값은 Worker에서 방문자 IP 기준 무료 한도로 처리합니다.
    const accessKey = requireAnalysisAccessKey();
    const cached = readTimedLocalCache('leword:analysis:single:v3:' + keyword.toLowerCase());

    isKeywordAnalysisRunning = true;
    showLoading(true);
    document.getElementById('detailPanel').style.display = 'none';
    try {
      const result = cached || await fetchFromWorker('exactAnalyze', { keywords:[keyword], paidAccessKey:accessKey, analysisMode:'single' });
      if (!cached && result && result.success && !result.data?.some(r=>r.blogCountUnavailable||r.searchVolumeUnavailable)) writeTimedLocalCache('leword:analysis:single:v3:' + keyword.toLowerCase(), result, 10 * 60 * 1000);
      if (result.success && result.data) {
        updateAnalysisQuotaStatus(result.usage);
      currentAnalyzerData = normalizeKeywordRows(result.data).slice(0, ANALYZER_RESULT_LIMIT);
        document.getElementById('searchedKeywordText').innerText = keyword;
        document.getElementById('resultsWrapper').style.display = 'block';
        document.getElementById('tierFilterContainer').style.display = 'block';
        
        selectedTier = '전체';
        updateTierFilterUI();
        applyFilters();
        
        // 단건이므로 첫 번째 행 자동 선택
        setTimeout(() => {
          const firstRow = document.querySelector('#analyzerTbody tr');
          if(firstRow) firstRow.click();
        }, 100);
      } else {
        alert('분석 실패: ' + (result.error || '오류 발생'));
      }
    } catch (err) {
      alert('통신 오류가 발생했습니다.');
    } finally {
      isKeywordAnalysisRunning = false;
      showLoading(false);
    }
  }

  function _fetchNaverAC(keyword) {
    return new Promise((resolve) => {
      const callbackName = 'naver_ac_callback_' + Math.round(1000000 * Math.random());
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { delete window[callbackName]; } catch(e){}
          resolve([]); // Timeout 무시하고 빈 배열 반환
        }
      }, 3000);

      window[callbackName] = function(data) {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        delete window[callbackName];
        try { document.body.removeChild(script); } catch(e){}
        const suggestions = [];
        if (data && data.items && data.items[0]) {
          data.items[0].forEach(item => { if (item && item[0]) suggestions.push(item[0]); });
        }
        resolve(suggestions);
      };
      const script = document.createElement('script');
      script.src = `https://ac.search.naver.com/nx/ac?q=` + encodeURIComponent(keyword) + `&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&_callback=` + callbackName;
      script.onerror = function() {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          try { delete window[callbackName]; } catch(e){}
          resolve([]);
        }
      };
      document.body.appendChild(script);
    });
  }

  const AUTO_COMPLETE_CACHE_TTL = 15 * 60 * 1000;
  const RELATED_ANALYSIS_KEYWORD_LIMIT = 10;
  function readTimedLocalCache(key) {
    try {
      const item = JSON.parse(localStorage.getItem(key) || 'null');
      if(item?.value?.data?.some(r=>r.blogCountUnavailable||r.searchVolumeUnavailable))return null;
      return item && item.expiresAt > Date.now() ? item.value : null;
    } catch (_) { return null; }
  }
  function writeTimedLocalCache(key, value, ttl) {
    if(value?.data?.some(r=>r.blogCountUnavailable||r.searchVolumeUnavailable))return;
    try { localStorage.setItem(key, JSON.stringify({ value:value, expiresAt:Date.now() + ttl })); } catch (_) {}
  }
  async function fetchNaverAutoComplete(keyword) {
    const cleanKeyword = String(keyword || '').replace(/\s+/g, ' ').trim();
    const cacheKey = 'leword:auto:v2:' + cleanKeyword.toLowerCase();
    const cached = readTimedLocalCache(cacheKey);
    if (Array.isArray(cached)) return cached;

    // 자동완성 원본 호출은 1회로 유지하고, 메인 키워드를 포함해 최대 10개를 분석합니다.
    const results = new Set([cleanKeyword]);
    const suggestions = await _fetchNaverAC(cleanKeyword);
    (suggestions || []).forEach(function(value) { if (value) results.add(value); });
    const list = Array.from(results).slice(0, RELATED_ANALYSIS_KEYWORD_LIMIT);
    writeTimedLocalCache(cacheKey, list, AUTO_COMPLETE_CACHE_TTL);
    return list;
  }

  async function startKeywordAnalysis() {
    if (isKeywordAnalysisRunning) return;
    const keyword = document.getElementById('analyzerInput').value.trim();
    if (!keyword) return alert('키워드를 입력해주세요.');
    // 발급키는 선택입니다. 빈 값은 Worker에서 방문자 IP 기준 무료 한도로 처리합니다.
    const accessKey = requireAnalysisAccessKey();
    const cached = readTimedLocalCache('leword:analysis:related:v3:' + keyword.toLowerCase());
    if (cached) {
      renderKeywordAnalysisResult(cached, keyword);
      return;
    }

    isKeywordAnalysisRunning = true;
    showLoading(true);
    document.getElementById('detailPanel').style.display = 'none';
    try {
      // 1단계: 네이버 자동완성으로 연관 키워드 수집
      const autoSuggestions = await fetchNaverAutoComplete(keyword);
      
      // 2단계: 메인 키워드 + 자동완성 결과를 Worker로 전송
      const allKeywords = [keyword];
      autoSuggestions.forEach(kw => { if (!allKeywords.includes(kw)) allKeywords.push(kw); });
      // 메인 키워드를 포함해 최대 10개를 서버에 보내 이전 출력 수준을 복원합니다.
      const limitedKeywords = allKeywords.slice(0, RELATED_ANALYSIS_KEYWORD_LIMIT);
      
      // 3단계: 연관 분석 전용 경로로 최대 10개를 분석합니다.
      const result = await fetchFromWorker('exactAnalyze', {
        keywords: limitedKeywords,
        paidAccessKey: accessKey,
        analysisMode: 'related'
      });
      if (result.success && result.data && result.data.length > 0) {
        writeTimedLocalCache('leword:analysis:related:v3:' + keyword.toLowerCase(), result, 10 * 60 * 1000);
        updateAnalysisQuotaStatus(result.usage);
        renderKeywordAnalysisResult(result, keyword);
      } else if (result.error) {
        alert('분석 실패: ' + result.error);
      } else {
        alert('분석 결과가 없습니다. API 키를 확인해 주세요.');
      }
    } catch (err) {
      alert('통신 오류가 발생했습니다: ' + err.message);
    } finally {
      isKeywordAnalysisRunning = false;
      showLoading(false);
    }
  }

  let excelKeywords = [];
  let excelResults = [];
  let isExcelAnalysisRunning = false;
  const EXCEL_BULK_MAX_KEYWORDS = 600;
  const EXCEL_BULK_BATCH_SIZE = 40;
  const EXCEL_BULK_RETRY_COUNT = 3;

  function normalizeExcelBulkKeywords(values) {
    const unique = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach(function(value) {
      const keyword = String(value || '').replace(/\s+/g, ' ').trim();
      const key = keyword.toLowerCase();
      if (!keyword || seen.has(key)) return;
      seen.add(key);
      unique.push(keyword);
    });
    return { keywords:unique.slice(0, EXCEL_BULK_MAX_KEYWORDS), ignored:Math.max(0, unique.length - EXCEL_BULK_MAX_KEYWORDS) };
  }

  function waitForBulkRetry(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

  function bulkBlockingError(message) {
    return /401|403|429|인증|권한|발급키|접근 키|액세스 키|한도|호출량|1분|30초|설정|요청이.*많|요청을.*멈/.test(String(message||''));
  }
  function bulkRateLimited(message) { return /429|호출 제한|호출량을 조절|요청이.*많|요청을.*멈/.test(String(message||'')); }
  async function requestExcelBulkPart(chunk, bulkAccessKey) {
    let lastError='',pending=chunk.slice(),generic=0;const done=new Map(),MAX=6;
    for(let attempt=1;attempt<=MAX&&pending.length&&isExcelAnalysisRunning;attempt++){
      let result;
      try{result=await fetchFromWorker('exactBulkAnalyze',{keywords:pending,paidAccessKey:bulkAccessKey});}catch(error){result={success:false,error:String(error.message||'연결 오류')};}
      if(result && result.success && Array.isArray(result.data) && result.data.length){
        const retry=[];
        result.data.forEach(function(r){const k=String(r.keyword||'').trim(),msg=[r.searchVolumeError,r.blogCountError,r.error].filter(Boolean).join(' / ');if(bulkRateLimited(msg)&&attempt<MAX){retry.push(k);lastError=msg;}else done.set(k,r);});
        pending=retry;
      } else {
        lastError=String(result&&result.error||'분석 결과가 비어 있습니다.');
        if(!bulkRateLimited(lastError)){if(bulkBlockingError(lastError)||++generic>=2)break;await waitForBulkRetry(3000);continue;}
      }
      if(pending.length&&attempt<MAX){const sec=/1분|429|조절/.test(lastError)?65:Math.min(60,15*attempt),st=document.getElementById('excelProgressText');if(st)st.textContent='네이버 검색광고 호출 제한 — '+sec+'초 후 자동 재시도 ('+attempt+'/'+(MAX-1)+')';await waitForBulkRetry(sec*1000);}
    }
    if(!done.size)return {success:false,error:lastError};
    return {success:true,data:chunk.map(function(k){return done.get(k)||{keyword:k,searchVolumeUnavailable:true,blogCountUnavailable:true,searchVolumeError:lastError||'조회 실패',blogCountError:lastError||'조회 실패'};})};
  }

  async function requestExcelBulkChunk(chunk, bulkAccessKey) {
    const data=[];
    for(let i=0;i<chunk.length;i+=10){
      if(i>0&&!isExcelAnalysisRunning)return {success:true,data,stopped:true};
      const started=Date.now(),result=await requestExcelBulkPart(chunk.slice(i,i+10),bulkAccessKey);
      if(!result.success)return data.length?{success:true,data,stopReason:result.error}:result;
      data.push(...result.data);
      const blocking=result.data.map(r=>[r.searchVolumeError,r.blogCountError,r.error].filter(Boolean).join(' / ')).find(bulkBlockingError);
      if(blocking)return {success:true,data,stopReason:blocking};
      if(i+10<chunk.length)await waitForBulkRetry(Math.max(0,3200-(Date.now()-started)));
    }
    return {success:true,data};
  }

  function stopExcelAnalysis() {
    isExcelAnalysisRunning = false;
    document.getElementById('excelProgressText').innerText = '중지 중... 잠시만 기다려주세요.';
  }

  function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 메모장(.txt) 파일 처리
    if (file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        const buffer = evt.target.result;
        let text = '';
        try {
          // 먼저 UTF-8로 디코딩 시도 (에러 발생 시 catch로 이동)
          text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch (e) {
          // 깨지면 한국어 윈도우 기본 인코딩(EUC-KR)으로 디코딩
          text = new TextDecoder('euc-kr').decode(buffer);
        }
        
        // 줄바꿈이나 쉼표로 분리
        const words = text.split(/[\r\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
        const normalized = normalizeExcelBulkKeywords(words);
        excelKeywords = normalized.keywords;
        document.getElementById('excelStatus').innerText = `성공! ${excelKeywords.length}개의 키워드를 분석합니다.${normalized.ignored ? ` 최대 600개만 처리되어 ${normalized.ignored}개는 제외됩니다.` : ''}`;
      };
      // 텍스트 깨짐 방지를 위해 ArrayBuffer로 읽기
      reader.readAsArrayBuffer(file);
      return;
    }

    // 엑셀(.xlsx, .csv) 파일 처리
    const reader = new FileReader();
    reader.onload = function(evt) {
      const bstr = evt.target.result;
      if (typeof XLSX === 'undefined') return alert('엑셀 라이브러리 로딩 실패. 새로고침 후 다시 시도해주세요.');
      const wb = XLSX.read(bstr, {type:'binary'});
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, {header:1});
      
      let extracted = [];
      data.forEach(row => {
        if (row && row[0] && row[0].toString().trim()) {
          extracted.push(row[0].toString().trim());
        }
      });
      // 첫 행이 헤더인지 체크
      if (extracted.length > 0 && (extracted[0].includes('키워드') || extracted[0].includes('keyword'))) {
         extracted.shift();
      }
      const normalized = normalizeExcelBulkKeywords(extracted);
      excelKeywords = normalized.keywords;
      document.getElementById('excelStatus').innerText = `성공! ${excelKeywords.length}개의 키워드를 분석합니다.${normalized.ignored ? ` 최대 600개만 처리되어 ${normalized.ignored}개는 제외됩니다.` : ''}`;
    };
    reader.readAsBinaryString(file);
  }
  
  async function startExcelAnalysis() {
    if(isExcelAnalysisRunning)return;
    if(!excelKeywords.length)return alert('키워드 파일을 먼저 선택해 주세요.');
    if(!checkApiKeys())return;
    const key=getBulkAccessKey();
    if(!/^[A-Z2-9]{16}$/.test(key))return alert('유료 발급키 설정에 대량 분석용 16자리 키를 저장해 주세요.');
    if(!confirm('본인의 네이버 API로 '+excelKeywords.length+'개 키워드를 조회합니다. 먼저 1개를 확인한 뒤 순차 처리하며 인증·한도 오류가 발생하면 중지합니다. 계속할까요?'))return;
    rememberBulkAccessKey(key);
    const words=excelKeywords.slice(),tbody=document.getElementById('excelAnalyzerTbody'),status=document.getElementById('excelProgressText');
    const input=document.getElementById('excelFileInput'),stop=document.getElementById('btnStopExcel');
    const startButton=document.querySelector('[onclick="startExcelAnalysis()"]');
    let errorBox=document.getElementById('excelErrorSummary');
    if(!errorBox){errorBox=document.createElement('p');errorBox.id='excelErrorSummary';errorBox.setAttribute('role','alert');errorBox.style.cssText='padding:14px;background:#fff1f2;color:#9f1239;border:1px solid #fecdd3;border-radius:10px;white-space:pre-wrap;line-height:1.7';document.getElementById('excelProgressBox').append(errorBox);}
    errorBox.hidden=true;errorBox.textContent='';
    const head=document.querySelector('#excelAnalyzerTable thead tr');
    if(!head.querySelector('[data-bulk-error]')){const th=document.createElement('th');th.dataset.bulkError='true';th.textContent='조회 상태 / 오류 원인';head.append(th);}
    tbody.replaceChildren();excelResults=[];isExcelAnalysisRunning=true;input.disabled=true;startButton.disabled=true;stop.style.display='inline-block';
    document.getElementById('excelProgressBox').style.display='block';
    document.getElementById('excelProgressBarInner').style.width='0%';
    let offset=0,stopReason='';
    try {
      while(offset<words.length && isExcelAnalysisRunning){
        const chunk=words.slice(offset,offset+(offset===0?1:EXCEL_BULK_BATCH_SIZE));
        status.textContent=(offset===0?'첫 키워드 연결 확인 중':'40개 묶음 분석 중')+' ('+offset+' / '+words.length+')';
        const batchStarted=Date.now();
        const result=await requestExcelBulkChunk(chunk,key);
        if(!result.success){stopReason=result.error||'서버 응답 오류';break;}
        const completedChunk=chunk.slice(0,result.data.length);
        const raw=completedChunk.map(keyword=>result.data.find(r=>String(r.keyword).trim()===keyword)||{keyword,searchVolumeUnavailable:true,blogCountUnavailable:true,searchVolumeError:'서버 결과 누락',blogCountError:'서버 결과 누락'});
        const rows=normalizeKeywordRows(raw);
        for(const item of rows){
          const errors=[item.searchVolumeUnavailable?('검색량: '+(item.searchVolumeError||'조회 실패')):'',item.blogCountUnavailable?('문서수: '+(item.blogCountError||'조회 실패')):''].filter(Boolean).join(' / ');
          excelResults.push(item);
          if(bulkBlockingError(errors))stopReason=errors;
        }
        offset+=completedChunk.length;
        if(result.stopReason)stopReason=result.stopReason;
        document.getElementById('excelProgressBarInner').style.width=Math.round(offset/words.length*100)+'%';
        if(rows.every(r=>r.searchVolumeUnavailable&&r.blogCountUnavailable))stopReason=stopReason||'검색량과 문서수를 모두 가져오지 못했습니다. 위 오류 원인을 확인해 주세요.';
        if(stopReason)break;
        if(offset<words.length && isExcelAnalysisRunning){status.textContent='호출 간격 조절 중 ('+offset+' / '+words.length+')';await waitForBulkRetry(Math.max(0,3200-(Date.now()-batchStarted)));}
      }
    }catch(error){stopReason=String(error.message||'연결 오류');}
    finally{
      const failed=excelResults.filter(r=>r.searchVolumeUnavailable||r.blogCountUnavailable).length;
      const prefix=stopReason?'오류로 중지':offset<words.length?'사용자 중지':failed?'분석 종료 · 일부 실패':'분석 완료';
      status.textContent=prefix+' · 정상 '+(excelResults.length-failed)+'개 / 실패 '+failed+'개 / 미조회 '+(words.length-offset)+'개';
      if(stopReason){errorBox.hidden=false;errorBox.textContent=stopReason+'\n남은 키워드는 요청하지 않았습니다. 설정 또는 이용 한도를 확인한 뒤 다시 실행해 주세요.';}
      isExcelAnalysisRunning=false;input.disabled=false;startButton.disabled=false;stop.style.display='none';
    }
  }

  function filterByTier(tier) {
    selectedTier = tier;
    updateTierFilterUI();
    applyFilters();
    document.getElementById('detailPanel').style.display = 'none';
    const wideTrendPanel = document.getElementById('wideTrendPanel'); if (wideTrendPanel) wideTrendPanel.style.display = 'none';
  }

  // 필터 버튼 UI 업데이트
  function updateTierFilterUI() {
    document.querySelectorAll('.tier-btn').forEach(btn => {
      // 텍스트 매칭 대신 단순 포함 여부로 체크
      if (btn.innerText.includes(selectedTier) || (selectedTier === '전체' && btn.innerText === '전체')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function applyFilters() {
    const show50 = document.getElementById('filterRatio50').checked;
    const tbody = document.getElementById('analyzerTbody');
    tbody.innerHTML = '';
    
    let data = selectedTier === '전체' 
      ? currentAnalyzerData 
      : currentAnalyzerData.filter(i => i.tier === selectedTier);
      
    if (show50) {
      data = data.filter(i => i.ratio >= 50);
    }
    
    filteredAnalyzerData = data;
    document.getElementById('resultCount').innerText = data.length;
    const blogErrorBanner = document.getElementById('blogApiErrorBanner');
    const searchAdErrorBanner = document.getElementById('searchAdErrorBanner');
    const failedBlogRow = data.find(function(item) { return item.blogCountUnavailable; });
    if (blogErrorBanner && failedBlogRow) {
      blogErrorBanner.style.display = 'block';
      blogErrorBanner.textContent = '블로그 문서 수 조회 오류: ' + (failedBlogRow.blogCountError || '오류 상세 없음') + ' · 내 API 키 설정에서 발급처·Client ID·Secret·블로그 검색 권한을 확인하세요.';
    } else if (blogErrorBanner) {
      blogErrorBanner.style.display = 'none';
      blogErrorBanner.textContent = '';
    }
    const failedSearchRow = data.find(function(item) { return item.searchVolumeUnavailable; });
    if (searchAdErrorBanner && failedSearchRow) {
      searchAdErrorBanner.style.display = 'block';
      searchAdErrorBanner.textContent = '검색량 조회 오류: ' + (failedSearchRow.searchVolumeError || '오류 상세 없음') + ' · 실패한 키워드는 0이 아니라 “조회 실패”로 표시됩니다.';
    } else if (searchAdErrorBanner) {
      searchAdErrorBanner.style.display = 'none';
      searchAdErrorBanner.textContent = '';
    }

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color:#475569; padding: 40px 0;">조건에 맞는 키워드가 없습니다.</td></tr>`;
      return;
    }
    
    data.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.onclick = function() { selectKeyword(tr, idx); };
      
      const ratioClass = item.ratio >= 50 ? 'text-danger' : (item.ratio >= 10 ? 'text-highlight-analyzer' : '');
      const tierBadge = getTierBadgeClass(item.tier);
      
      tr.innerHTML = `
        <td class="text-center" style="color:#475569; font-weight:bold;">${idx + 1}</td>
        <td style="font-weight:bold; color:white; text-align:left; padding-left:20px;">${escapeHtml(item.keyword)}</td>
        <td class="text-right" style="font-weight:bold;" title="${item.searchVolumeUnavailable ? escapeHtml(item.searchVolumeError) : ''}">${item.searchVolumeUnavailable ? '조회 실패' : item.total.toLocaleString()}</td>
        <td class="text-right text-gray" title="${item.blogCountUnavailable ? escapeHtml(item.blogCountError || '블로그 검색 권한 확인 필요') : ''}">${item.blogCountUnavailable ? '조회 실패' : item.blogCount.toLocaleString()}</td>
        <td>${window.recentBlogHtml(item.keyword)}</td>
        <td class="text-right ${ratioClass}">${(item.blogCountUnavailable || !Number.isFinite(Number(item.ratio))) ? '-' : Number(item.ratio).toFixed(2)}</td>
        <td class="text-center"><span class="grade-badge ${tierBadge}">${item.tier}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  function getTierBadgeClass(tier) {
    if (tier === '레전드') return 'grade-SSR';
    if (tier === '챌린저') return 'grade-SSS';
    if (tier === '마스터') return 'grade-SS';
    if (tier === '전문가') return 'grade-S';
    if (tier === '고급자') return 'grade-A';
    return 'grade-B';
  }

  async function selectKeyword(rowElement, idx) {
    document.querySelectorAll('#analyzerTable tr').forEach(r => r.classList.remove('active-row'));
    rowElement.classList.add('active-row');

    const item = filteredAnalyzerData[idx];
    if (!item) return;

    document.getElementById('detailPanel').style.display = 'block';
    const wideTrendPanel = document.getElementById('wideTrendPanel'); if (wideTrendPanel) wideTrendPanel.style.display = 'block';
    const wideTrendTitle = document.getElementById('wideTrendTitle'); if (wideTrendTitle) wideTrendTitle.textContent = item.keyword + ' · 최근 30일 검색 추이';
    document.getElementById('detailKeyword').innerText = item.keyword;
    let recent=document.getElementById('detailRecentBlog');if(!recent){recent=document.createElement('div');recent.id='detailRecentBlog';document.getElementById('detailPanel').append(recent);}recent.innerHTML=window.recentBlogHtml(item.keyword);
    document.getElementById('detailTotal').innerText = item.searchVolumeUnavailable ? '조회 실패' : item.total.toLocaleString();
    document.getElementById('detailBlog').innerText = item.blogCountUnavailable ? '조회 실패' : item.blogCount.toLocaleString();
    document.getElementById('detailPcMobile').innerText = item.searchVolumeUnavailable ? '검색광고 API 조회 실패' : `PC: ${item.pc.toLocaleString()} / 모바일: ${item.mobile.toLocaleString()}`;
    document.getElementById('detailRatio').innerText = (item.blogCountUnavailable || !Number.isFinite(Number(item.ratio))) ? '-' : Number(item.ratio).toFixed(2);
    if (item.blogCountUnavailable) {
      document.getElementById('detailScore').innerText = '-';
      document.getElementById('detailComment').innerHTML = '⚠️ 블로그 문서 수 API 조회에 실패했습니다. 0건으로 계산하지 않았습니다.<br/><span style="font-size:13.667px;color:#fda4af;">' + escapeHtml(item.blogCountError || 'NAVER API HUB Application에서 Search API → 블로그 검색 권한과 Cloudflare Worker 배포와 환경 변수를 확인해 주세요.') + '</span>';
      document.getElementById('btnGoNaver').href = `https://search.naver.com/search.naver?query=${encodeURIComponent(item.keyword)}`;
      document.getElementById('btnGoBlog').href = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(item.keyword)}`;
      drawTrendChart(item.keyword, item.total);
      return;
    }

    let goldenScore = 0;
    let comment = '';
    
    if (item.ratio >= 50) {
      goldenScore = Math.min(99, Math.round(85 + (item.ratio - 50) * 0.2));
      comment = `🏆 <b>초대형 황금 키워드 발견!</b> 경쟁 블로그가 조회수 대비 극소수입니다. 지금 글을 작성하시면 무조건 상단 노출 및 엄청난 유입을 기대할 수 있습니다.`;
    } else if (item.ratio >= 20) {
      goldenScore = Math.round(75 + (item.ratio - 20) * 0.3);
      comment = `🔥 <b>매우 우수한 황금 키워드입니다.</b> 경쟁 강도가 매우 낮아 제목과 본문 구성에 조금만 신경 쓰면 손쉽게 1페이지 상단 노출이 가능합니다.`;
    } else if (item.ratio >= 10) {
      goldenScore = Math.round(60 + (item.ratio - 10) * 1.5);
      comment = `⚡ <b>경쟁해볼 만한 유망 키워드입니다.</b> 충분한 유입량이 보장되며 대형 블로그들이 아직 꽉 쥐고 있지 않은 상태이므로 적극 추천합니다.`;
    } else if (item.ratio >= 3) {
      goldenScore = Math.round(40 + (item.ratio - 3) * 2.8);
      comment = `🌿 <b>보통 난이도의 키워드입니다.</b> 관련 분야 전문 블로그라면 양질의 정보글 작성을 통해 중상위 노출 영역을 노려볼 수 있습니다.`;
    } else {
      goldenScore = Math.max(10, Math.round(item.ratio * 10));
      comment = `⚠️ <b>경쟁이 매우 치열한 레드오션 키워드입니다.</b> 굳이 단독 글을 쓰기보다는 다른 연관 황금키워드를 조합해 글을 작성하는 것을 권장합니다.`;
    }

    document.getElementById('detailScore').innerText = goldenScore;
    document.getElementById('detailComment').innerHTML = comment;

    document.getElementById('btnGoNaver').href = `https://search.naver.com/search.naver?query=${encodeURIComponent(item.keyword)}`;
    document.getElementById('btnGoBlog').href = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(item.keyword)}`;

    drawTrendChart(item.keyword, item.total);
  }

  let currentTrendDetail = null;

  async function drawTrendChart(keyword, totalSearchVolume) {
    const canvas = document.getElementById('trendCanvas');
    const ctx = canvas.getContext('2d');
    const errorMsg = document.getElementById('trendErrorMsg');
    const metricNote = document.getElementById('trendMetricNote');

    errorMsg.style.display = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Pretendard';
    ctx.textAlign = 'center';
    ctx.fillText('⏳ 트렌드 분석 데이터를 수집 중...', canvas.width / 2, canvas.height / 2);

    try {
      const result = await fetchFromWorker('getSearchTrend', { keyword: keyword });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const trendData = result.data.map(function(item) {
          return { period:String(item.period || ''), ratio:Math.max(0, Number(item.ratio) || 0) };
        });
        currentTrendDetail = { keyword:String(keyword || ''), total:Math.max(0, Number(totalSearchVolume) || 0), trendData:trendData };
        if (metricNote) {
          metricNote.innerHTML = '<b style="color:#172033">월간 총 검색량 ' + currentTrendDetail.total.toLocaleString() + '건</b> · 그래프는 월간 검색량을 DataLab 관심도 비중에 따라 배분한 <b>일별 추정 검색량</b>입니다. <button onclick="openTrendDetail()" style="border:0;background:transparent;color:#4338ca;text-decoration:underline;cursor:pointer;font-size:13.667px;padding:0">상세 추이 보기</button>';
        }
        drawReadableTrendChart(canvas, ctx, trendData, false, currentTrendDetail.total);
        if(metricNote){
          const period=document.createElement('p');
          period.textContent='최근 30일 조회 · 제공된 데이터 '+trendData.length+'일 · '+trendData[0].period+' ~ '+trendData[trendData.length-1].period+' (당일 미집계·미제공 날짜 제외)';
          metricNote.appendChild(period);
          const daily=document.createElement('details');
          const summary=document.createElement('summary');summary.textContent='일별 검색 추이 전체 보기 ('+trendData.length+'일)';daily.appendChild(summary);
          const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;text-align:right;margin-top:12px';
          table.innerHTML='<thead><tr><th scope="col">날짜</th><th scope="col">관심도 지수</th><th scope="col">일별 추정 검색량</th></tr></thead>';
          const tbody=document.createElement('tbody');
          buildEstimatedSearchTrend(trendData,currentTrendDetail.total).points.forEach(function(point){const tr=document.createElement('tr');[point.period,point.ratio.toFixed(2),Math.round(point.value).toLocaleString()+'건'].forEach(function(value){const td=document.createElement('td');td.textContent=value;td.style.padding='6px';tr.appendChild(td);});tbody.appendChild(tr);});
          table.appendChild(tbody);daily.appendChild(table);metricNote.appendChild(daily);
        }
      } else {
        currentTrendDetail = null;
        errorMsg.style.display = 'flex';
        errorMsg.innerHTML = `⚠️ 30일 검색 추이 비활성화 상태<br/><span style="font-size:12.000px; color:#475569; margin-top:4px; display:block; line-height:1.4;">NAVER API HUB Application에 <b>[검색어 트렌드]</b> API를 추가하고 Cloudflare Worker의 배포·환경 변수·로그를 확인해 주세요.</span>`;
        drawDummyChart(canvas, ctx);
      }
    } catch (err) {
      currentTrendDetail = null;
      errorMsg.style.display = 'flex';
      errorMsg.innerHTML = `⚠️ 검색 추이 호출 실패<br/><span style="font-size:12.000px; color:#475569; margin-top:4px; display:block;">${escapeHtml(err && err.message ? err.message : '잠시 후 다시 시도해 주세요.')}</span>`;
      drawDummyChart(canvas, ctx);
    }
  }

  // DataLab ratio는 실제 검색 건수가 아닌 0~100 상대 관심도입니다.
  // 소형/확대 캔버스에서 동일하게 6개 날짜 눈금, 20 지수 기준선, 시작·최고·최근값을 표시합니다.
  function drawReadableTrendChart(canvas, ctx, trendData, compact, monthlySearchVolume) {
    const model = buildEstimatedSearchTrend(trendData, monthlySearchVolume);
    const pointsData = model.points;
    const w = canvas.width, h = canvas.height;
    const left = compact ? 52 : 72, right = compact ? 12 : 24, top = compact ? 22 : 34, bottom = compact ? 29 : 46;
    const chartW = w - left - right, chartH = h - top - bottom, axisMax = model.axisMax, baseY = h - bottom;
    const xFor = function(index) { return left + (pointsData.length <= 1 ? chartW / 2 : chartW * index / (pointsData.length - 1)); };
    const yFor = function(value) { return baseY - ((value / axisMax) * chartH); };
    const labelFont = compact ? '9px Pretendard Variable' : '12px Pretendard Variable';
    const dateFont = compact ? '8px Pretendard Variable' : '11px Pretendard Variable';

    ctx.font = labelFont; ctx.lineWidth = 1; ctx.textAlign = 'right';
    for (let index = 0; index <= 5; index++) {
      const value = axisMax * index / 5, y = yFor(value);
      ctx.strokeStyle = index === 0 ? 'rgba(71,85,105,.58)' : 'rgba(148,163,184,.52)';
      ctx.setLineDash(index === 0 ? [] : [3, 3]);
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.fillText(formatEstimatedSearchVolume(value), left - 8, y + 4);
    }
    ctx.setLineDash([]);

    const tickIndices = [];
    for (let i = 0; i < 6; i++) tickIndices.push(Math.round((pointsData.length - 1) * i / 5));
    const uniqueTicks = Array.from(new Set(tickIndices));
    ctx.fillStyle = '#475569'; ctx.font = dateFont;
    uniqueTicks.forEach(function(index, tickNo) {
      const x = xFor(index), date = pointsData[index].period.slice(5);
      ctx.strokeStyle = 'rgba(148,163,184,.72)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, baseY + 4); ctx.stroke();
      ctx.textAlign = tickNo === 0 ? 'left' : (tickNo === uniqueTicks.length - 1 ? 'right' : 'center');
      ctx.fillText(date, x, h - 8);
    });

    const points = pointsData.map(function(point, index) { return { x:xFor(index), y:yFor(point.value), value:point.value }; });
    const fill = ctx.createLinearGradient(0, top, 0, baseY);
    fill.addColorStop(0, 'rgba(79,70,229,.22)'); fill.addColorStop(1, 'rgba(79,70,229,.02)');
    ctx.beginPath(); points.forEach(function(point, index) { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
    ctx.lineTo(points[points.length - 1].x, baseY); ctx.lineTo(points[0].x, baseY); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.beginPath(); points.forEach(function(point, index) { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
    ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = compact ? 2.4 : 3.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();

    const peakIndex = points.reduce(function(best, point, index) { return point.value > points[best].value ? index : best; }, 0), lastIndex = points.length - 1;
    points.forEach(function(point, index) {
      const featured = index === peakIndex || index === lastIndex || index === 0;
      ctx.beginPath(); ctx.arc(point.x, point.y, featured ? (compact ? 3.5 : 5) : (compact ? 1.6 : 2.2), 0, Math.PI * 2);
      ctx.fillStyle = featured ? '#c2410c' : '#4f46e5'; ctx.fill();
    });
    const labels = Array.from(new Set([0, peakIndex, lastIndex]));
    ctx.font = compact ? 'bold 10px Pretendard Variable' : 'bold 13px Pretendard Variable';
    labels.forEach(function(index) {
      const point = points[index], label = formatEstimatedSearchVolume(point.value);
      ctx.textAlign = index === 0 ? 'left' : (index === lastIndex ? 'right' : 'center');
      ctx.fillStyle = '#172033'; ctx.fillText(label, point.x, Math.max(compact ? 12 : 18, point.y - (compact ? 8 : 12)));
    });
    ctx.textAlign = 'left'; ctx.font = compact ? '9px Pretendard Variable' : '12px Pretendard Variable'; ctx.fillStyle = '#475569';
    ctx.fillText(model.isEstimated ? '일별 추정 검색량 · 월간 검색량을 DataLab 관심도 비중으로 배분' : '검색 관심도 지수 (월간 검색량 조회 실패)', left, compact ? 11 : 16);
  }

  function openTrendDetail() {
    if (!currentTrendDetail || !currentTrendDetail.trendData || !currentTrendDetail.trendData.length) return alert('먼저 키워드를 선택해 검색 추이를 불러와 주세요.');
    const modal = document.getElementById('trendDetailModal');
    const title = document.getElementById('trendDetailTitle');
    const volume = document.getElementById('trendDetailVolume');
    const peak = Math.max.apply(null, currentTrendDetail.trendData.map(function(d) { return d.ratio; }));
    const recent = currentTrendDetail.trendData[currentTrendDetail.trendData.length - 1].ratio;
    title.textContent = currentTrendDetail.keyword + ' · 30일 검색 추이';
    volume.textContent = '월간 총 검색량 ' + currentTrendDetail.total.toLocaleString() + '건';
    document.getElementById('trendDetailMeta').innerHTML = '이 그래프는 <b>DataLab 상대 관심도 지수</b>이며 실제 검색 건수와 직접 비례하지 않습니다. · 최고 지수 <b>' + Number(peak.toFixed(1)) + '</b> · 최근 지수 <b>' + Number(recent.toFixed(1)) + '</b>';
    document.getElementById('trendDetailMeta').textContent='최근 30일 조회 · '+currentTrendDetail.trendData[0].period+' ~ '+currentTrendDetail.trendData[currentTrendDetail.trendData.length-1].period+' · 제공된 데이터 '+currentTrendDetail.trendData.length+'일. 그래프는 월간 검색량을 DataLab 관심도 비중으로 배분한 일별 추정치입니다. 미제공 날짜는 포함하지 않습니다.';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const canvas = document.getElementById('trendDetailCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawReadableTrendChart(canvas, ctx, currentTrendDetail.trendData, false, currentTrendDetail.total);
  }

  function closeTrendDetail(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('trendDetailModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  function scrollToWideTrend() {
    const panel = document.getElementById('wideTrendPanel');
    if (panel && panel.style.display !== 'none') panel.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function drawDummyChart(canvas, ctx) {
    const paddingLeft = 30;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 20;
    const chartWidth = canvas.width - paddingLeft - paddingRight;
    const chartHeight = canvas.height - paddingTop - paddingBottom;
    
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const x = paddingLeft + (i * (chartWidth / 30));
      const y = canvas.height - paddingBottom - (Math.sin(i * 0.3) * 0.3 + 0.5) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Signal.bz에서 직접 실시간 키워드 가져오기 (CORS 프록시 경유)
  async function fetchSignalKeywordsDirect() {
    try {
      // Signal.bz API 직접 호출 (CORS 허용)
      const r = await fetch('https://api.signal.bz/news/realtime');
      const data = await r.json();
      if (data && data.top10) {
        return data.top10.map((item, i) => ({ rank: i+1, keyword: item.keyword, traffic: '' }));
      }
    } catch(e) {}
    return null;
  }

  let homeDashboardLoadedAt = 0;
  const HOME_TREND_SITES = ['naver', 'nate', 'zum', 'google', 'daum'];

  function trendSearchUrl(site, keyword) {
    const q = encodeURIComponent(keyword);
    if (site === 'nate') return 'https://search.nate.com/search/all.html?q=' + q;
    if (site === 'zum') return 'https://search.zum.com/search.zum?method=uni&option=accu&query=' + q;
    if (site === 'google') return 'https://www.google.com/search?q=' + q;
    if (site === 'daum') return 'https://search.daum.net/search?q=' + q;
    return 'https://search.naver.com/search.naver?query=' + q;
  }

  function trendHomeUrl(site) {
    if (site === 'google') return 'https://trends.google.com/trending?geo=KR';
    if (site === 'daum') return 'https://www.daum.net/';
    return 'https://www.' + site + '.com/';
  }

  function renderHomeTrend(site, rows) {
    const list = document.getElementById('homeTrend-' + site);
    if (!list) return;
    list.textContent = '';
    const safeRows = Array.isArray(rows) ? rows.slice(0, 10) : [];
    if (!safeRows.length) {
      const li = document.createElement('li');
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = '·';
      const a = document.createElement('a'); a.href = trendHomeUrl(site); a.target = '_blank'; a.rel = 'noopener'; a.textContent = '사이트에서 직접 확인';
      li.appendChild(rank); li.appendChild(a); list.appendChild(li); return;
    }
    safeRows.forEach(function(row, index) {
      const keyword = String((row && (row.keyword || row.title)) || '').trim();
      if (!keyword) return;
      const li = document.createElement('li');
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(row.rank || index + 1);
      const a = document.createElement('a'); a.href = trendSearchUrl(site, keyword); a.target = '_blank'; a.rel = 'noopener'; a.textContent = keyword; a.title = keyword;
      li.appendChild(rank); li.appendChild(a); list.appendChild(li);
    });
  }

  let homeDashboardLoading=false;
  async function loadHomeDashboard(force) {
    if(homeDashboardLoading)return;
    const now=Date.now();
    if(!force&&homeDashboardLoadedAt&&now-homeDashboardLoadedAt<5*60*1000)return;
    homeDashboardLoading=true;
    const status=document.getElementById('homeTrendStatus');
    if(status)status.textContent='급상승어를 불러오는 중입니다.';
    try{
      const [result]=await Promise.all([fetchWorkerGet('getTrendingKeywords'),loadEntertainmentNews()]);
      if(!result.success||!result.data)throw new Error(result.error||'급상승어를 불러오지 못했습니다.');
      homeTrendCache=result.data;
      const missing=[];
      HOME_TREND_SITES.forEach(function(site){const rows=Array.isArray(result.data[site])?result.data[site]:[];renderHomeTrend(site,rows);if(!rows.length){missing.push(site);const list=document.getElementById('homeTrend-'+site);if(list){const note=document.createElement('li');note.textContent='현재 원본 데이터를 받지 못했습니다.';list.prepend(note);}}});
      homeDashboardLoadedAt=now;
      if(status)status.textContent='조회 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' · 서버 저장본 최대 15분 재사용'+(missing.length?' · 일부 제공처 데이터 지연':'');
    }catch(error){if(status)status.textContent=error.message||'급상승어를 불러오지 못했습니다.';}
    finally{homeDashboardLoading=false;}
  }
  window.loadHomeDashboard = loadHomeDashboard;

            
    let trendingRequest=0;
    async function loadTrendingList(type){
      const tbody=document.getElementById('naverTrendsTbody');if(!tbody)return;const request=++trendingRequest;
      ['naver','nate','zum','google','daum'].forEach(t=>{const btn=document.getElementById('tab'+t[0].toUpperCase()+t.slice(1)+'Trend');if(btn){btn.style.background=t===type?'#087f5b':'#e9f1e6';btn.style.color=t===type?'#fff':'#253b32';}});
      const message=text=>{tbody.replaceChildren();const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.textContent=text;td.style.padding='24px';tr.append(td);tbody.append(tr);};message('실시간 데이터를 불러오는 중…');
      try{const result=await fetchWorkerGet('getTrendingKeywords');if(request!==trendingRequest)return;if(!result.success)throw new Error(result.error||'급상승어를 불러오지 못했습니다.');const rows=result.data?.[type]||[];
        if(!rows.length){message('현재 이 제공처의 데이터를 받지 못했습니다. 다른 제공처를 선택해 주세요.');return;}
        tbody.replaceChildren();rows.forEach((item,i)=>{const tr=document.createElement('tr');[item.rank||i+1,item.keyword||item.title].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.color='#253b32';td.style.padding='14px';tr.append(td);});const td=document.createElement('td'),a=document.createElement('a');a.href=trendSearchUrl(type,item.keyword||item.title);a.target='_blank';a.rel='noopener noreferrer';a.textContent='검색 ↗';td.append(a);tr.append(td);tbody.append(tr);});
      }catch(e){if(request===trendingRequest)message(e.message);}
    }

    async function loadEntertainmentNews() {
      const box = document.getElementById('entNewsList');
      if (!box) return;
      box.innerHTML = '<div style="padding:20px; color:#475569; text-align:center;">최신 기사를 불러오는 중...</div>';
      try {
        const result = await fetchWorkerGet('getEntertainmentNews');
        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
          box.textContent = '최신 연예뉴스를 아직 받지 못했습니다. ' + (result.error || '잠시 후 다시 시도해 주세요.');
          box.style.cssText = 'padding:20px; color:#a16207; text-align:center;';
          return;
        }
        result.data = result.data.filter(function(item) {
          try { const u = new URL(item.url); return /^https?:$/.test(u.protocol) && !/\/(?:app-download|[^/]*vote[^/]*)(?:\/|$)/i.test(u.pathname); } catch (_) { return false; }
        });
        if (!result.data.length) { box.textContent = '표시할 최신 연예 기사가 없습니다. 잠시 후 다시 불러와 주세요.'; return; }
        result.data.sort(function(a, b) { return (b.publishedOrder || 0) - (a.publishedOrder || 0); });
        box.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr)); gap:10px;';
        box.textContent = '';
        result.data.slice(0, 16).forEach(function(item) {
          const a = document.createElement('a');
          a.href = item.url; a.target = '_blank'; a.rel = 'noopener';
          a.style.cssText = 'display:block; padding:14px; border:1px solid #dbe3ef; border-radius:12px; text-decoration:none; background:#ffffff;';
          const meta = document.createElement('div'); meta.style.cssText = 'font-size:13.667px; color:#047857; margin-bottom:6px;'; meta.textContent = String(item.source || '뉴스') + ' · ' + String(item.publishedAt || '시간 확인 필요');
          const title = document.createElement('div'); title.style.cssText = 'font-size:16.667px; line-height:1.5; color:#172033; font-weight:700;'; title.textContent = String(item.title || '제목 없음');
          a.appendChild(meta); a.appendChild(title); box.appendChild(a);
        });
      } catch (e) {
        box.textContent = '뉴스 연결 오류: ' + (e.message || '네트워크 오류') + ' · 잠시 후 다시 시도해 주세요.';
        box.style.cssText = 'padding:20px; color:#a16207; text-align:center;';
      }
    }

    // 사용자가 조회할 때만 외부 데이터를 요청합니다.

  //]]>
