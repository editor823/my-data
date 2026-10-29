const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'posts');
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // href="/?page=keywordcenter" -> href="../index.html#tab-adsense"
  content = content.replace(/href="\/\?page=keywordcenter"/g, 'href="../index.html#tab-adsense"');

  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('Fixed keywordcenter links');
