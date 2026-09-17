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
    console.log('HTML length:', html.length);
    const dataUrls = [];
    const re = /data-url="([^"]+)"/g;
    let match;
    while ((match = re.exec(html)) !== null) {
      dataUrls.push(match[1]);
    }
    console.log('data-url count:', dataUrls.length);
    if (dataUrls.length > 0) {
      console.log('Sample URL:', dataUrls[0]);
    }
    const titleRe = /class="news_tit"[^>]*title="([^"]+)"[^>]*href="([^"]+)"/g;
    let tMatch;
    const titles = [];
    while ((tMatch = titleRe.exec(html)) !== null) {
      titles.push({ title: tMatch[1], href: tMatch[2] });
    }
    console.log('news_tit count:', titles.length);
    if (titles.length > 0) {
      console.log('Sample news_tit:', titles[0]);
    }
  });
}).on('error', e => console.error(e));
