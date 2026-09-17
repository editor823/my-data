const https = require('https');

function testQuery(q) {
  return new Promise((resolve) => {
    const url = 'https://search.naver.com/search.naver?where=news&query=' + encodeURIComponent(q) + '&sm=tab_opt&sort=1';
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 4000
    }, res => {
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => {
        const m = Array.from(html.matchAll(/data-url="([^"]+)"/g));
        console.log(`Query "${q}" => data-url count: ${m.length}`);
        resolve(m.length);
      });
    }).on('error', e => {
      console.log(`Query "${q}" => error:`, e.message);
      resolve(0);
    });
  });
}

(async () => {
  await testQuery('실적발표');
  await testQuery('실적발표 일정');
  await testQuery('보호예수 해제');
  await testQuery('신규상장');
  await testQuery('공시');
  await testQuery('공모주');
})();
