const https = require('https');

function searchNaverNews(keyword) {
  return new Promise((resolve) => {
    const enc = encodeURIComponent(keyword);
    const options = {
      hostname: 'search.naver.com',
      path: '/search.naver?where=news&query=' + enc + '&sm=tab_opt&sort=1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    };
    https.get(options, res => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const marker = 'data-block-id="news/prs_template_v2_news_tab_desk.ts"';
        const blockIdx = html.indexOf(marker);
        if (blockIdx === -1) return resolve([]);
        const bootstrapIdx = html.indexOf('entry.bootstrap(', blockIdx);
        if (bootstrapIdx === -1) return resolve([]);
        const jsonStart = html.indexOf('{', bootstrapIdx);
        let depth = 0, end = -1, inString = false, escape = false;
        for (let i = jsonStart; i < html.length; i++) {
          const char = html[i];
          if (escape) { escape = false; continue; }
          if (char === '\\') { escape = true; continue; }
          if (char === '"') { inString = !inString; continue; }
          if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') { depth--; if (depth === 0) { end = i; break; } }
          }
        }
        if (end === -1) return resolve([]);
        try {
          const data = JSON.parse(html.substring(jsonStart, end + 1));
          const rawItems = data.body?.props?.children?.[0]?.props?.children || [];
          const articles = [];
          for (const item of rawItems) {
            const p = item.props;
            if (!p) continue;
            const title = (p.title || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const url = p.titleHref || p.contentHref || '';
            const press = p.sourceProfile?.title || p.sourceProfile?.name || '언론사';
            if (title && url) {
              articles.push({ title, url, press });
            }
          }
          resolve(articles);
        } catch (e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

async function testAll() {
  const stock = '현대로템';
  const list = await searchNaverNews(stock);
  console.log('Stock:', stock, 'Found:', list.length);
  if (list.length) console.log('1st article:', list[0]);
}
testAll();
