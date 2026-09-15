const https = require('https');

function searchNaverNewsWeb(keyword) {
  return new Promise((resolve) => {
    const enc = encodeURIComponent(keyword);
    const options = {
      hostname: 'search.naver.com',
      path: '/search.naver?where=news&query=' + enc + '&sm=tab_opt&sort=1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(options, res => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const articles = [];
        const regex = /<a [^>]*class="[^"]*news_tit[^"]*"[^>]*href="([^"]+)"[^>]*title="([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null && articles.length < 5) {
          articles.push({
            url: match[1],
            title: match[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          });
        }
        resolve(articles);
      });
    }).on('error', () => resolve([]));
  });
}

searchNaverNewsWeb('한화에어로스페이스').then(res => {
  console.log('결과 개수:', res.length);
  console.log(JSON.stringify(res, null, 2));
});
