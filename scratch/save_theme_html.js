const https = require('https');
const fs = require('fs');

const url = 'https://finance.naver.com/sise/theme.naver?field=change_rate&ordering=desc';
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, res => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const decoder = new TextDecoder('euc-kr');
    const html = decoder.decode(Buffer.concat(chunks));
    fs.writeFileSync('scratch/theme_sise.html', html, 'utf8');
    console.log('Saved theme_sise.html, length:', html.length);
  });
});
