const http = require('http');

http.get('http://localhost:3000/api/market/today-shooting-themes', res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(b);
      console.log('총 수집 테마 수:', j.count);
      console.log('수집 테마 목록:');
      j.items.forEach(t => {
        console.log(`- ${t.theme} | 당일: ${t.dayRate} | 대장: ${t.leaders} | 기사수: ${t.weekNewsCount}`);
        console.log(`  헤드라인: ${t.weekNewsHeadline}`);
      });
    } catch (e) {
      console.error(e.message, b.slice(0, 300));
    }
  });
});
