const https = require('https');

function fetchNaverNewsReal(query) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(query)}&sm=tab_opt&sort=1`;
    https.get(url, {
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
        const urlMatches = html.matchAll(/data-url="(https?:\/\/[^"]+)"/g);

        for (const m of urlMatches) {
          const postUrl = m[1];
          if (postUrl.includes('naver.com') && !postUrl.includes('news.naver.com') && !postUrl.includes('n.news.naver.com')) {
            // Keep 또는 기타 링크 제외
          }
          if (seenUrls.has(postUrl)) continue;
          seenUrls.add(postUrl);

          const pos = m.index;
          const beforeSnippet = html.slice(Math.max(0, pos - 800), pos);
          const afterSnippet = html.slice(pos, pos + 2500);

          // 언론사
          const authorMatch = beforeSnippet.match(/data-heatmap-target="\.prof"[^>]*>([\s\S]*?)<\/a>/i);
          const media = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '언론사';

          // 날짜
          const dateMatch = beforeSnippet.match(/profile-info-subtext"[^>]*>([\s\S]*?)<\/div>/i) ||
                            beforeSnippet.match(/profile-info-subtext">([0-9\.\s]+|.+?전|어제|오늘)<\/span>/i);
          const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '오늘';

          // 기사 제목
          const titleMatch = afterSnippet.match(/sds-comps-text-type-headline1[^>]*>([\s\S]*?)<\/span>/i);
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          if (title && postUrl) {
            posts.push({
              title,
              url: postUrl,
              originallink: postUrl,
              media: media.replace(/새 창 열림/g, '').trim(),
              date: dateStr
            });
          }
          if (posts.length >= 5) break;
        }
        resolve(posts);
      });
    }).on('error', () => resolve([]));
  });
}

fetchNaverNewsReal('빛샘전자').then(res => console.log('Parsed news:', res));
