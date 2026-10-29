const fs = require('fs');
const path = require('path');

const postsDir = 'c:/Users/edite/Desktop/my-local-info_n/src/content/posts';
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

const withoutTable = [];

files.forEach(f => {
  const content = fs.readFileSync(path.join(postsDir, f), 'utf8');
  const hasTable = /\|.+\|.+\|/.test(content);
  if (!hasTable) {
    withoutTable.push(f);
  }
});

console.log('Without table (' + withoutTable.length + '):');
withoutTable.forEach(f => console.log('-', f));
