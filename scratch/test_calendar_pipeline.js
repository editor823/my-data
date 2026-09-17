const https = require('https');

function calculateDDay(targetDateStr) {
  if (!targetDateStr) return { d_day: 'D-Day', diffDays: 0 };
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return { d_day: 'D-Day', diffDays: 0 };
  const now = new Date();
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffTime = tDate.getTime() - nowDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { d_day: 'D-Day 오늘', diffDays };
  if (diffDays > 0) return { d_day: `D-${diffDays}`, diffDays };
  return { d_day: `D+${Math.abs(diffDays)} 종료`, diffDays };
}

const getHttpsJson = (url, timeout = 4000) => new Promise((resolve) => {
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://m.stock.naver.com/'
    },
    timeout: timeout
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
    });
  }).on('error', () => resolve(null));
});

const fetchNewsHtml = (query) => new Promise((resolve) => {
  const searchUrl = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}&sm=tab_opt&sort=1`;
  https.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    },
    timeout: 4000
  }, (res) => {
    let html = '';
    res.setEncoding('utf8');
    res.on('data', c => html += c);
    res.on('end', () => {
      const posts = [];
      const seenUrls = new Set();
      const urlMatches = html.matchAll(/data-url="(https?:\/\/[^"]+)"/g);
      for (const m of urlMatches) {
        const postUrl = m[1];
        if (seenUrls.has(postUrl)) continue;
        seenUrls.add(postUrl);

        const pos = m.index;
        const beforeSnippet = html.slice(Math.max(0, pos - 800), pos);
        const afterSnippet = html.slice(pos, pos + 2500);

        const authorMatch = beforeSnippet.match(/data-heatmap-target="\.prof"[^>]*>([\s\S]*?)<\/a>/i) ||
                            beforeSnippet.match(/class="[^"]*prof[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
        const media = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '언론사';

        const dateMatch = beforeSnippet.match(/profile-info-subtext"[^>]*>([\s\S]*?)<\/div>/i) ||
                          beforeSnippet.match(/profile-info-subtext">([0-9\.\s]+|.+?전|어제|오늘)<\/span>/i) ||
                          beforeSnippet.match(/sds-comps-text-type-body2[^>]*>([0-9\.\s]+|.+?전|어제|오늘)<\/span>/i);
        const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '오늘';

        const titleMatch = afterSnippet.match(/sds-comps-text-type-headline1[^>]*>([\s\S]*?)<\/span>/i) ||
                          afterSnippet.match(/class="[^"]*news_tit[^"]*"[^>]*title="([^"]+)"/i) ||
                          afterSnippet.match(/<a[^>]*data-heatmap-target="\.tit"[^>]*>([\s\S]*?)<\/a>/i);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2]).replace(/<[^>]+>/g, '').trim() : '';

        const descMatch = afterSnippet.match(/sds-comps-text-type-body1[^>]*>([\s\S]*?)<\/span>/i) ||
                          afterSnippet.match(/class="[^"]*news_dsc[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                          afterSnippet.match(/<a[^>]*data-heatmap-target="\.body"[^>]*>([\s\S]*?)<\/a>/i);
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        if (title && postUrl) {
          posts.push({
            title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            desc: desc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            url: postUrl,
            press: media.replace(/새 창 열림/g, '').trim(),
            date: dateStr
          });
        }
        if (posts.length >= 10) break;
      }
      resolve(posts);
    });
  }).on('error', () => resolve([]));
});

(async () => {
  const [ipoData, news1, news2, news3] = await Promise.all([
    getHttpsJson('https://m.stock.naver.com/api/stocks/ipo?page=1&pageSize=15'),
    fetchNewsHtml('실적발표 OR 공시 OR 신규상장 OR 유상증자'),
    fetchNewsHtml('임상 OR 승인 예정 OR 계약 체결 OR 공개 예정'),
    fetchNewsHtml('보호예수 해제 OR 청약 일정 OR 상장일')
  ]);

  console.log('IPO Data raw count:', (ipoData && ipoData.ipoCoInfos) ? ipoData.ipoCoInfos.length : 0);
  console.log('News1 count:', news1.length);
  console.log('News2 count:', news2.length);
  console.log('News3 count:', news3.length);

  const approvedEvents = [];
  const pendingEvents = [];

  // 1) IPO 파싱
  const ipoList = (ipoData && Array.isArray(ipoData.ipoCoInfos)) ? ipoData.ipoCoInfos : ((ipoData && Array.isArray(ipoData.items)) ? ipoData.items : []);
  ipoList.forEach(ipo => {
    const stockName = ipo.itemName || ipo.stockName || ipo.name || '공모주';
    let targetDate = ipo.listedDueDate || ipo.poStartDate || ipo.poEndDate || ipo.listingDate || ipo.subDate;
    if (targetDate && typeof targetDate === 'string' && targetDate.length >= 8) {
      const cleanDate = targetDate.replace(/[^0-9]/g, '');
      const formattedDate = (cleanDate.length === 8) 
        ? `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`
        : targetDate.slice(0, 10);
      
      const { d_day } = calculateDDay(formattedDate);
      const poPriceStr = ipo.poPrice ? `${Number(ipo.poPrice).toLocaleString()}원` : (ipo.expectedPoStart ? `${Number(ipo.expectedPoStart).toLocaleString()}원` : '-');
      const itemUrl = ipo.endUrl || (ipo.itemCode ? `https://m.stock.naver.com/ipo/${ipo.itemCode}` : `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(stockName + ' 공모주')}`);

      approvedEvents.push({
        id: `ipo_${ipo.itemCode || stockName}_${formattedDate}`,
        title: `${stockName} 코스닥/코스피 신규 상장·공모 (공모가 ${poPriceStr})`,
        date: formattedDate,
        dateDisplay: formattedDate,
        d_day: d_day,
        category: '신규상장(IPO)',
        tag: '신규상장(IPO)',
        key_point: `주관사: ${ipo.leadManager || '증권사'} | 청약기간: ${ipo.poStartDate || '-'} ~ ${ipo.poEndDate || '-'} | 상장예정일: ${formattedDate}`,
        desc: `주관사: ${ipo.leadManager || '증권사'} | 공모가 ${poPriceStr} | 상장예정일: ${formattedDate}`,
        press: '네이버증권',
        sourceUrl: itemUrl,
        news_url: itemUrl
      });
    }
  });

  console.log('Processed approvedEvents from IPO:', approvedEvents.length);
})();
