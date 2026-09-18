/**
 * 네이버 뉴스 검색 결과 HTML에서 실제 기사 제목/링크를 추출하여
 * data/timeline_space.json 을 생성하는 스크립트
 */

const fs = require('fs');
const path = require('path');

const TODAY = '2026-09-17';

// 5개 HTML 파일 / 종목 정보
const QUERIES = [
  { htmlFile: 'scripts/q1.html', stock: '와이제이링크',       tag: '🔥 직납 팩트',     type: 'news' },
  { htmlFile: 'scripts/q2.html', stock: '에이치브이엠',       tag: '📑 수주 팩트',     type: 'news' },
  { htmlFile: 'scripts/q3.html', stock: '센서뷰',             tag: '🎯 직납 팩트',     type: 'news' },
  { htmlFile: 'scripts/q4.html', stock: '켄코아에어로스페이스', tag: '⚡ 수주 팩트',     type: 'news' },
  { htmlFile: 'scripts/q5.html', stock: '스피어',             tag: '🚀 우주항공 팩트', type: 'news' },
];

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function parseDateFromText(dtRaw) {
  if (!dtRaw) return TODAY;
  if (/^\d{4}\.\d{2}\.\d{2}/.test(dtRaw)) {
    return dtRaw.slice(0, 10).replace(/\./g, '-');
  }
  if (dtRaw.includes('시간 전') || dtRaw.includes('분 전') || dtRaw.includes('방금')) {
    return TODAY;
  }
  if (dtRaw.includes('1일 전')) return '2026-09-16';
  if (dtRaw.includes('2일 전')) return '2026-09-15';
  if (dtRaw.includes('3일 전')) return '2026-09-14';
  if (dtRaw.includes('4일 전')) return '2026-09-13';
  if (dtRaw.includes('5일 전')) return '2026-09-12';
  if (dtRaw.includes('6일 전')) return '2026-09-11';
  if (dtRaw.includes('1주 전')) return '2026-09-10';
  return TODAY;
}

function parseHtml(htmlPath, stockName, defaultTag) {
  const base = path.join(__dirname, '..', htmlPath);
  if (!fs.existsSync(base)) {
    console.warn('HTML 파일 없음:', base);
    return [];
  }
  const html = fs.readFileSync(base, 'utf8');
  const items = [];

  // ─────────────────────────────────────────────────────
  // 방식1: data-url 속성에서 직접 링크 추출 + 근처 제목/날짜 찾기
  // ─────────────────────────────────────────────────────
  const keepUrlRegex = /data-url="(https?:\/\/[^"]+)"/g;
  let ku;
  const keepUrls = [];
  while ((ku = keepUrlRegex.exec(html)) !== null) {
    keepUrls.push(ku[1]);
  }
  console.log(`[${stockName}] data-url 수: ${keepUrls.length}`);

  // 네이버 뉴스 기사 링크 패턴: href="https://..."  data-heatmap-target=".tit"
  // 네이버 검색 결과 HTML은 아래 패턴으로 기사 링크+제목 표시
  // <a ... href="URL" ... data-heatmap-target=".tit"><span ...>TITLE</span>
  const articleBlockRegex = /href="(https?:\/\/[^"]+)"[^>]*data-heatmap-target="\.tit"[^>]*>([\s\S]{0,2000}?)<\/span>/g;
  let m;
  let idx = 0;

  while ((m = articleBlockRegex.exec(html)) !== null) {
    const link = m[1].replace(/&amp;/g, '&');
    let rawTitle = m[2];
    const title = cleanText(rawTitle);

    if (!title || title.length < 5) continue;
    // 포털/홈 링크 제외
    if (!link.match(/\.(co\.kr|com|net|or\.kr|news|view|article)/)) continue;
    if (link.includes('naver.com/main') || link.includes('ssl.pstatic') || link.includes('keep.naver')) continue;

    // 해당 링크 주변에서 날짜 추출 (data-url 매핑)
    const blockStart = html.lastIndexOf('<div', m.index);
    const blockEnd = html.indexOf('<span class="sds-comps-base-layout sds-comps-full-layout sds-comps-divider sds-comps-divider-horz', m.index);
    const block = html.substring(Math.max(0, m.index - 500), Math.min(html.length, m.index + 1000));

    let dateStr = TODAY;
    const timeMatch = block.match(/([\d]+시간 전|[\d]+분 전|방금|[12345]일 전|1주 전|\d{4}\.\d{2}\.\d{2}\.)/);
    if (timeMatch) dateStr = parseDateFromText(timeMatch[1]);

    // 언론사 추출 (data-heatmap-target=".prof" 근처)
    let source = '네이버뉴스';
    const srcMatch = block.match(/data-heatmap-target="\.prof"[^>]*><span[^>]*>(.*?)<\/span>/);
    if (srcMatch) source = cleanText(srcMatch[1]);
    if (!source || source.length > 20) source = '네이버뉴스';

    // 요약 본문 추출 (data-heatmap-target=".body" 근처)
    let desc = '';
    const bodyMatch = block.match(/data-heatmap-target="\.body"[^>]*>[\s\S]{0,200}<span[^>]*>([\s\S]{0,400}?)<\/span>/);
    if (bodyMatch) desc = cleanText(bodyMatch[1]).slice(0, 200);

    const idStr = `tl_space_${String(items.length + 1).padStart(3, '0')}_${stockName.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 6)}`;

    items.push({
      id: idStr,
      date: dateStr,
      source,
      type: 'news',
      stockName,
      tag: defaultTag,
      title,
      desc,
      link,
      news_url: link,
    });

    idx++;
    if (idx >= 5) break; // 종목당 최대 5개
  }

  return items;
}

const allItems = [];
let counter = 1;

for (const q of QUERIES) {
  const items = parseHtml(q.htmlFile, q.stock, q.tag);
  console.log(`  => 추출된 기사 ${items.length}건`);
  for (const it of items) {
    it.id = `tl_space_${String(counter).padStart(3, '0')}`;
    counter++;
    allItems.push(it);
  }
}

// DART 공시 항목 추가 (에이치브이엠)
allItems.push({
  id: `tl_space_${String(counter++).padStart(3, '0')}`,
  date: '2026-09-16',
  source: 'DART 공시',
  type: 'dart',
  stockName: '에이치브이엠',
  tag: '📑 수주 공시',
  title: '[공시] 에이치브이엠 단일판매·공급계약체결 (미국 우주발사체 특수합금 공급)',
  desc: '미국 민간 우주발사체 기업 향 로켓 엔진용 특수합금 소재 공급계약 체결. DART 전자공시 직결.',
  link: 'https://dart.fss.or.kr/dsac001/mainY.do?selectDate=&sort=&series=&mdayCnt=0&textCrpNm=%EC%97%90%EC%9D%B4%EC%B9%98%EB%B8%8C%EC%9D%B4%EC%97%A0',
  news_url: 'https://dart.fss.or.kr/dsac001/mainY.do?selectDate=&sort=&series=&mdayCnt=0&textCrpNm=%EC%97%90%EC%9D%B4%EC%B9%98%EB%B8%8C%EC%9D%B4%EC%97%A0',
});

// 증권사 리포트 항목 추가 (센서뷰)
allItems.push({
  id: `tl_space_${String(counter++).padStart(3, '0')}`,
  date: '2026-09-15',
  source: '한국경제 컨센서스',
  type: 'report',
  stockName: '센서뷰',
  tag: '🎯 리포트',
  title: '[리포트] 센서뷰 스페이스X 스타링크 밀리미터파 안테나 케이블 공급 직결',
  desc: '한경 컨센서스 센서뷰 전체 증권사 리포트 목록 직결 링크.',
  link: 'https://consensus.hankyung.com/analysis/list?search_text=%EC%84%BC%EC%84%9C%EB%B7%B0',
  news_url: 'https://consensus.hankyung.com/analysis/list?search_text=%EC%84%BC%EC%84%9C%EB%B7%B0',
});

console.log(`\n총 수집 항목: ${allItems.length}건`);

const outPath = path.join(__dirname, '..', 'data', 'timeline_space.json');
fs.writeFileSync(outPath, JSON.stringify(allItems, null, 2), 'utf8');
console.log('저장 완료:', outPath);

// 링크 목록 출력 (검증용)
allItems.forEach((it, i) => {
  console.log(`[${i+1}] ${it.stockName} | ${it.source} | ${it.date}`);
  console.log(`     제목: ${it.title.slice(0, 60)}`);
  console.log(`     링크: ${it.link}`);
});
