const fs = require('fs');

const html = fs.readFileSync('scratch/naver_news_sample.html', 'utf8');

// n.news.naver.com 기사 링크들 찾기
const articleRegex = /href="(https?:\/\/n\.news\.naver\.com\/mnews\/article\/[0-9]+\/[0-9]+)"[^>]*>([\s\S]*?)<\/a>/gi;
let match;
let count = 0;
while ((match = articleRegex.exec(html)) !== null && count < 10) {
  const text = match[2].replace(/<[^>]+>/g, '').trim();
  if (text && text.length > 5) {
    console.log(`[Link] ${match[1]}`);
    console.log(`[Title] ${text}\n`);
    count++;
  }
}

if (count === 0) {
  // naver search에서 기사 제목 태그 탐색
  const sRegex = /<a[^>]*data-heatmap-g="news"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = sRegex.exec(html)) !== null && count < 10) {
    console.log(`[Heatmap Title] ${match[1].replace(/<[^>]+>/g, '').trim()}`);
    count++;
  }
}
