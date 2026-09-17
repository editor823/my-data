const https = require('https');

const targetUrl = 'https://search.naver.com/search.naver?where=news&query=' + encodeURIComponent('실적발표') + '&sm=tab_opt&sort=1';
const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  },
  timeout: 5000
};

https.get(targetUrl, options, res => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    const re = /data-url="([^"]+)"/g;
    let match = re.exec(html);
    if (match) {
      const pos = match.index;
      const snippet = html.slice(Math.max(0, pos - 500), pos + 2500);
      console.log('Snippet around first data-url:');
      console.log(snippet);
    }
  });
});
