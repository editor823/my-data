const https = require('https');

function searchNaverBlog(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(query)}`;
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 4000
    }, (res) => {
      let html = '';
      res.setEncoding('utf8');
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const posts = [];
        // 네이버 블로그 탭의 각 아이템 추출
        const itemRegex = /<li[^>]*class="[^"]*bx[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
        let match;
        while ((match = itemRegex.exec(html)) !== null) {
          const itemHtml = match[1];
          if (!itemHtml.includes('blog.naver.com') && !itemHtml.includes('infeed') && !itemHtml.includes('title_link')) continue;
          
          // 제목 & 링크
          const titleLinkMatch = itemHtml.match(/<a[^>]*class="[^"]*title_link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
          if (!titleLinkMatch) continue;
          const postUrl = titleLinkMatch[1];
          const rawTitle = titleLinkMatch[2].replace(/<[^>]+>/g, '').trim();

          // 작성자/블로그명
          const authorMatch = itemHtml.match(/<a[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                              itemHtml.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          const blogger = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '네이버 블로거';

          // 본문 요약
          const descMatch = itemHtml.match(/<div[^>]*class="[^"]*dsc_area[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                            itemHtml.match(/<a[^>]*class="[^"]*dsc_link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
          const snippet = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // 날짜
          const dateMatch = itemHtml.match(/<span[^>]*class="[^"]*sub_time[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
          const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '최근';

          if (rawTitle && postUrl) {
            posts.push({
              title: rawTitle,
              link: postUrl,
              blogger_name: blogger,
              snippet: snippet,
              date: dateStr,
              stage: '블로그 분석',
              press: blogger,
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

searchNaverBlog('삼성전자 반도체').then(results => {
  console.log('Total parsed blogs:', results.length);
  if (results.length > 0) {
    console.log('Sample 0:', results[0]);
  }
});
