const fs = require('fs');
const path = require('path');

function parseNaverHtml(htmlPath, stockName, defaultTag) {
  if (!fs.existsSync(htmlPath)) return [];
  const html = fs.readFileSync(htmlPath, 'utf8');

  // 네이버 검색 결과 JSON 블록 내 newsItem 추출
  // 각 아이템은 "titleHref":"...", "title":"...", "content":"...", "contentHref":"...", "sourceProfile":{"title":"..."} 형태
  const itemBlocks = html.split('{"props":{"clickLog"');
  const items = [];

  for (let i = 1; i < itemBlocks.length; i++) {
    const block = itemBlocks[i];
    
    // title 추출
    const titleMatch = block.match(/"title":"([^"]+)"/);
    if (!titleMatch) continue;
    let title = titleMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .trim();

    // 언론사 추출
    let source = "네이버뉴스";
    const srcMatch = block.match(/"sourceProfile":\{[^}]*"title":"([^"]+)"/);
    if (srcMatch) {
      source = srcMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // 본문 요약 (content)
    let desc = "";
    const contentMatch = block.match(/"content":"([^"]+)"/);
    if (contentMatch) {
      desc = contentMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .trim();
    }

    // 날짜 (subTexts: [{"text":"2026.09.15."}] 또는 "1일 전", "3시간 전")
    let dateStr = "2026-09-17";
    const dateMatch = block.match(/"subTexts":\[\{"text":"([^"]+)"\}/);
    if (dateMatch) {
      const dtRaw = dateMatch[1];
      if (/^\d{4}\.\d{2}\.\d{2}/.test(dtRaw)) {
        dateStr = dtRaw.slice(0, 10).replace(/\./g, '-');
      } else if (dtRaw.includes('시간 전') || dtRaw.includes('분 전') || dtRaw.includes('방금')) {
        dateStr = "2026-09-17";
      } else if (dtRaw.includes('1일 전')) {
        dateStr = "2026-09-16";
      } else if (dtRaw.includes('2일 전')) {
        dateStr = "2026-09-15";
      } else if (dtRaw.includes('3일 전')) {
        dateStr = "2026-09-14";
      } else if (dtRaw.includes('1주 전')) {
        dateStr = "2026-09-10";
      }
    }

    // 링크 추출 (n.news.naver.com 우선, 없으면 titleHref 또는 contentHref)
    let link = "";
    const naverNewsMatch = block.match(/https:\/\/n\.news\.naver\.com\/mnews\/article\/\d+\/\d+/);
    if (naverNewsMatch) {
      link = naverNewsMatch[0];
    } else {
      const titleHrefMatch = block.match(/"titleHref":"(https:\/\/[^"]+)"/);
      if (titleHrefMatch) {
        link = titleHrefMatch[1].replace(/\\u0026/g, '&');
      } else {
        const contentHrefMatch = block.match(/"contentHref":"(https:\/\/[^"]+)"/);
        if (contentHrefMatch) {
          link = contentHrefMatch[1].replace(/\\u0026/g, '&');
        }
      }
    }

    if (title && link && !title.includes('네이버뉴스') && !title.includes('동영상 기사')) {
      items.push({
        title,
        link,
        source,
        desc,
        date: dateStr,
        stockName,
        tag: defaultTag
      });
    }
  }

  return items;
}

const q1Items = parseNaverHtml(path.join(__dirname, 'q1.html'), '와이제이링크', '🔥 직납 팩트');
console.log('Q1 items count:', q1Items.length);
q1Items.slice(0, 5).forEach((it, i) => {
  console.log(`[${i+1}] ${it.title} | ${it.source} | ${it.link}`);
});
