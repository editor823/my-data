const fs = require('fs');
const files = fs.readdirSync('c:/Users/edite/Desktop/my-local-info_n/src/content/posts');
console.log('Total post files:', files.length);
files.forEach(f => {
  if (!f.endsWith('.md')) return;
  const content = fs.readFileSync('c:/Users/edite/Desktop/my-local-info_n/src/content/posts/' + f, 'utf8');
  const lines = content.split('\n');
  const titleLine = lines.find(l => l.startsWith('title:'));
  const title = titleLine ? titleLine.replace('title:', '').trim().replace(/^["']|["']$/g, '') : '';
  const dateLine = lines.find(l => l.startsWith('date:'));
  const date = dateLine ? dateLine.replace('date:', '').trim() : '';
  console.log(f.replace('.md', ''), '|', date, '|', title);
});
