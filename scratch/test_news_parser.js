const https = require('https');

function parseNaverNewsHtml(keyword) {
  return new Promise((resolve) => {
    const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}&sm=tab_opt&sort=1`; // sort=1: 최신순
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      },
      timeout: 4000
    }, res => {
      let html = '';
      res.setEncoding('utf8');
      res.on('data', c => html += c);
      res.on('end', () => {
        const newsList = [];
        // 네이버 뉴스 아이템
        const regex = /<a[^>]*class="news_tit"[^>]*href="([^"]+)"[^>]*title="([^"]+)"/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
          const href = m[1];
          const rawTitle = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          
          // 언론사 찾기: <a class="info press" ...>언론사</a>
          const pos = m.index;
          const before = html.slice(Math.max(0, pos - 500), pos);
          const pressMatch = before.match(/class="info press"[^>]*>([\s\S]*?)<\/a>/i);
          const press = pressMatch ? pressMatch[1].replace(/<[^>]+>/g, '').trim() : '언론사';

          // 날짜 찾기: <span class="info">...</span>
          const dateMatch = before.match(/<span class="info">([0-9\.\s]+|.+?전)<\/span>/i);
          const date = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '오늘';

          newsList.push({
            title: rawTitle,
            url: href,
            media: press,
            date: date
          });
          if (newsList.length >= 5) break;
        }
        resolve(newsList);
      });
    }).on('error', () => resolve([]));
  });
}

parseNaverNewsHtml('빛샘전자').then(res => {
  console.log('News for 빛샘전자:', res);
});
