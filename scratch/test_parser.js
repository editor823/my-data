const fs = require('fs');

function extractNewsFromHtml(html) {
  const marker = 'data-block-id="news/prs_template_v2_news_tab_desk.ts"';
  const blockIdx = html.indexOf(marker);
  if (blockIdx === -1) return [];

  const bootstrapIdx = html.indexOf('entry.bootstrap(', blockIdx);
  if (bootstrapIdx === -1) return [];

  const jsonStart = html.indexOf('{', bootstrapIdx);
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = jsonStart; i < html.length; i++) {
    const char = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
  }

  if (end === -1) return [];

  try {
    const data = JSON.parse(html.substring(jsonStart, end + 1));
    const rawItems = data.body?.props?.children?.[0]?.props?.children || [];
    const articles = [];

    for (const item of rawItems) {
      const p = item.props;
      if (!p) continue;
      const title = (p.title || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const url = p.titleHref || p.contentHref || '';
      if (articles.length === 0) {
        console.log('Props keys:', Object.keys(p));
        console.log('sourceProfile keys:', Object.keys(p.sourceProfile || {}));
        console.log('sourceProfile:', p.sourceProfile);
        console.log('p.time or date info:', p.time, p.date, p.sourceProfile?.time);
      }
      if (title && url) {
        articles.push({ title, url, press, timeStr });
      }
    }
    return articles;
  } catch (e) {
    console.error('Parse error:', e.message);
    return [];
  }
}

const html = fs.readFileSync('scratch/sample_news.html', 'utf8');
const res = extractNewsFromHtml(html);
console.log('추출된 기사 수:', res.length);
console.log('샘플 기사 3개:', JSON.stringify(res.slice(0, 3), null, 2));
