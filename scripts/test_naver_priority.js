const fs = require('fs');
const path = require('path');

function parseWithNaverPriority(htmlPath) {
  const fullPath = path.join('c:/Users/edite/Desktop/my-data', htmlPath);
  if (!fs.existsSync(fullPath)) return [];
  const html = fs.readFileSync(fullPath, 'utf8');
  const articleBlockRegex = /href="(https?:\/\/[^"]+)"[^>]*data-heatmap-target="\.tit"[^>]*>([\s\S]{0,2000}?)<\/span>/g;
  let m;
  const results = [];
  while ((m = articleBlockRegex.exec(html)) !== null) {
    const originLink = m[1].replace(/&amp;/g, '&');
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    if (!title || title.length < 5) continue;
    if (originLink.includes('naver.com/main') || originLink.includes('ssl.pstatic') || originLink.includes('keep.naver')) continue;

    // 해당 기사 카드의 상위/주변 컨텍스트에서 네이버 뉴스(n.news.naver.com) 직결 링크 탐색
    const context = html.substring(Math.max(0, m.index - 800), Math.min(html.length, m.index + 800));
    const naverMatch = context.match(/https:\/\/n\.news\.naver\.com\/mnews\/article\/\d+\/\d+(\?sid=\d+)?/);
    const chosenLink = naverMatch ? naverMatch[0] : originLink;
    results.push({ title: title.slice(0, 40), origin: originLink, chosen: chosenLink, isNaver: !!naverMatch });
  }
  return results;
}

['scripts/q1.html', 'scripts/q2.html', 'scripts/q3.html', 'scripts/q4.html'].forEach(f => {
  const res = parseWithNaverPriority(f);
  console.log('=== ' + f + ' ===');
  res.slice(0, 5).forEach(r => console.log(r.isNaver ? '[NAVER DIRECT]' : '[ORIGIN]', r.title, '->', r.chosen));
});
