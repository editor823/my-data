const fs = require('fs');
const path = require('path');

['q1.html', 'q2.html', 'q3.html', 'q4.html'].forEach(fn => {
  const html = fs.readFileSync(path.join(__dirname, fn), 'utf8');
  const regex = /href="(https?:\/\/[^"]+)"[^>]*data-heatmap-target="\.tit"[^>]*>([\s\S]{0,2000}?)<\/span>/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const link = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    const block = html.substring(Math.max(0, m.index - 500), Math.min(html.length, m.index + 1000));
    if (block.includes('스피어') || title.includes('스피어')) {
      console.log(`[${fn}] TITLE: ${title}`);
      console.log(`LINK: ${link}`);
      const bodyMatch = block.match(/data-heatmap-target="\.body"[^>]*>[\s\S]{0,200}<span[^>]*>([\s\S]{0,400}?)<\/span>/);
      if (bodyMatch) {
        console.log(`DESC: ${bodyMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 100)}`);
      }
      console.log('-------------------');
    }
  }
});
