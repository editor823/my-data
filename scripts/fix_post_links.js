// 1회용: 글(posts)의 깨진 내부 링크 정리
//  - /archive.html?label=...  → /guides.html (콘텐츠 가이드 목록)
//  - /p/blog-page_462.html(문의 페이지) → 이 사이트에 없는 페이지이므로 링크를 빼고 글자만 남김
const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', 'posts');

let changed = 0;
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.html'))) {
  const p = path.join(dir, f);
  const before = fs.readFileSync(p, 'utf8');
  const after = before
    .replace(/href="\/archive\.html\?label=[^"]*"/g, 'href="/guides.html"')
    .replace(/<a href="\/p\/blog-page_462\.html"[^>]*>문의 페이지<\/a>/g, '사이트 문의 채널');
  if (after !== before) { fs.writeFileSync(p, after, 'utf8'); changed++; console.log('수정:', f); }
}
console.log(`총 ${changed}개 글 수정`);
