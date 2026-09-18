const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'q4.html'), 'utf8');
const items = html.split('class="sds-comps-vertical-layout sds-comps-full-layout v33RoPVqTTc4AJaM"');
console.log('Total card items in q4.html:', items.length - 1);
for (let i = 1; i < items.length; i++) {
  const card = items[i];
  const titMatch = card.match(/data-heatmap-target="\.tit"[^>]*>([\s\S]*?)<\/span>/);
  const tit = titMatch ? titMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const naverMatch = card.match(/href="(https:\/\/n\.news\.naver\.com\/mnews\/article\/[^"]+)"/);
  const originMatch = card.match(/data-url="(https?:\/\/[^"]+)"/);
  console.log(`[${i}]`);
  console.log('  Title:', tit.slice(0, 45));
  console.log('  Naver:', naverMatch ? naverMatch[1] : 'none');
  console.log('  Origin:', originMatch ? originMatch[1] : 'none');
}
