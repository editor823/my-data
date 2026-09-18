const https = require('https');

const CLIENT_ID = 'u8xuqbb564';
const CLIENT_SECRET = 'z4Ijlccm7b1SRXfuY2RpEfBcyOAwX1fyw10RRA6C';

const query = '와이제이링크 스페이스X';
const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=3&sort=sim`;

const options = {
  headers: {
    'X-Naver-Client-Id': CLIENT_ID,
    'X-Naver-Client-Secret': CLIENT_SECRET
  }
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('DATA:', data);
  });
}).on('error', (err) => {
  console.error('ERROR:', err);
});
