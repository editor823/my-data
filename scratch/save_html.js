const https = require('https');
const fs = require('fs');

const url = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent('삼성전자')}`;
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    fs.writeFileSync('scratch/blog_page.html', b, 'utf8');
    console.log('Saved blog_page.html, size:', b.length);
  });
});
