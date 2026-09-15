const https = require('https');
const fs = require('fs');

const enc = encodeURIComponent('한화에어로스페이스');
const options = {
  hostname: 'search.naver.com',
  path: '/search.naver?where=news&query=' + enc,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9'
  }
};
https.get(options, res => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    fs.writeFileSync('scratch/sample_news.html', html, 'utf8');
    console.log('Saved html length:', html.length);
  });
});
