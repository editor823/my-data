const http = require('http');

http.get('http://hkconsensus.hankyung.com/tab_conReport.do', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'http://hkconsensus.hankyung.com/'
  }
}, (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    const html = buf.toString('utf8');
    console.log('HTML length:', html.length);
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let count = 0;
    let match;
    while ((match = trRegex.exec(html)) !== null) {
      const tr = match[1];
      if (tr.includes('<td')) {
        count++;
        if (count <= 3) {
          console.log(`\n=== TR ${count} ===`);
          const hrefs = [...tr.matchAll(/href="([^"]+)"/gi)].map(m => m[1]);
          console.log('HREFS:', hrefs);
          const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
          console.log('TDS:', tds);
        }
      }
    }
    console.log('Total valid TRs:', count);
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
