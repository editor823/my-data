const https = require('https');

const url = 'https://finance.naver.com/sise/theme.naver?field=change_rate&ordering=desc';
const req = https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://finance.naver.com/'
  }
}, res => {
  console.log('Status:', res.statusCode, 'Headers:', res.headers);
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    console.log('Total bytes:', Buffer.concat(chunks).length);
  });
});
req.on('error', e => console.error('Error:', e));
