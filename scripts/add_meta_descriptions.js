// 1회용: guides.html의 요약문을 각 글의 meta description으로 넣고, guides.html 자신의 설명도 추가합니다.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const guidesPath = path.join(ROOT, 'guides.html');
let guides = fs.readFileSync(guidesPath, 'utf8');

function insertDescription(file, desc) {
  let html = fs.readFileSync(file, 'utf8');
  if (/<meta[^>]+name=["']description["']/i.test(html)) return false;
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  html = html.replace(/(<title>[\s\S]*?<\/title>)/i, `$1${eol}  <meta name="description" content="${esc(desc)}">`);
  fs.writeFileSync(file, html, 'utf8');
  return true;
}

let done = 0;
for (const m of guides.matchAll(/summary:\s*"([^"]+)"[\s\S]*?link:\s*"([^"]+)"/g)) {
  const file = path.join(ROOT, m[2].replace(/^\//, ''));
  if (fs.existsSync(file) && insertDescription(file, m[1])) { done++; console.log('추가:', m[2]); }
}

if (insertDescription(guidesPath,
  '키워드 조사, AI 글쓰기, 이미지 활용, 시즌 글 기획까지 블로그 운영에 필요한 실전 가이드를 모아 둔 콘텐츠 가이드 목록입니다.')) done++;

console.log(`총 ${done}개 파일에 description 추가 완료`);
