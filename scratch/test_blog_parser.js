const https = require('https');

function searchNaverBlogs(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(query)}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 4000
    }, (res) => {
      let html = '';
      res.setEncoding('utf8');
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const posts = [];
        const seenUrls = new Set();

        // 1. data-url="https://blog.naver.com/..." 및 포스트 영역 패턴 매칭
        const urlMatches = html.matchAll(/data-url="(https:\/\/blog\.naver\.com\/[^"]+)"/g);
        for (const m of urlMatches) {
          const postUrl = m[1];
          if (seenUrls.has(postUrl)) continue;
          seenUrls.add(postUrl);

          const pos = m.index;
          // 앞쪽 600자에서 블로거명과 날짜 탐색
          const beforeSnippet = html.slice(Math.max(0, pos - 600), pos);
          // 뒤쪽 2500자에서 제목과 본문 요약 탐색
          const afterSnippet = html.slice(pos, pos + 2500);

          // 블로거명
          const authorMatch = beforeSnippet.match(/data-heatmap-target="articleSourceJSX_title"[^>]*>([\s\S]*?)<\/a>/i);
          const blogger = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '네이버 블로그';

          // 작성일
          const dateMatch = beforeSnippet.match(/profile-info-subtext">([0-9\.\s]+|.+?전|어제|오늘)<\/span>/i);
          const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '최근';

          // 제목 (sds-comps-text-type-headline1)
          const titleMatch = afterSnippet.match(/sds-comps-text-type-headline1[^>]*>([\s\S]*?)<\/span>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // 본문 요약 (sds-comps-text-type-body1)
          const descMatch = afterSnippet.match(/sds-comps-text-type-body1[^>]*>([\s\S]*?)<\/span>/i);
          const snippet = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          if (title && postUrl) {
            posts.push({
              title,
              link: postUrl,
              blogger_name: blogger,
              snippet,
              date: dateStr,
              stage: '블로그 분석',
              press: blogger || '네이버 블로그',
              news_title: `[블로그] ${title}`,
              news_url: postUrl,
              key_point: snippet ? snippet.slice(0, 80) + '...' : '블로그 실전 투자 및 테마 분석',
              is_blog: true
            });
          }
        }
        resolve(posts);
      });
    });

    req.on('error', (e) => {
      console.error('Blog search error:', e.message);
      resolve([]);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve([]);
    });
  });
}

searchNaverBlogs('삼성전자 반도체 분석').then(res => {
  console.log('Found blog count:', res.length);
  if (res.length > 0) {
    console.log('First result:', JSON.stringify(res[0], null, 2));
  }
});
