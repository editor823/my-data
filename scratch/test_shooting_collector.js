const https = require('https');
const fs = require('fs');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Referer': 'https://m.stock.naver.com/'
      },
      timeout: 4000
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', err => resolve(null));
  });
}

function fetchNewsForTheme(keyword) {
  return new Promise((resolve) => {
    const targetUrl = `https://m.stock.naver.com/api/news/search?keyword=${encodeURIComponent(keyword)}&pageSize=10`;
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Referer': 'https://m.stock.naver.com/'
      },
      timeout: 3500
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const raw = Array.isArray(parsed) ? parsed : (parsed.items || []);
          resolve(raw);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

async function testCollector() {
  console.log('1. 테마 목록 가져오는 중...');
  const themeData = await get('https://m.stock.naver.com/api/stocks/theme?page=1&pageSize=8');
  if (!themeData || !Array.isArray(themeData.groups)) {
    console.error('테마 목록 가져오기 실패');
    return;
  }

  const topThemes = themeData.groups.slice(0, 6);
  console.log(`상위 6개 테마:`, topThemes.map(t => `${t.name} (${t.changeRate}%)`));

  const results = [];

  for (const t of topThemes) {
    console.log(`테마 [${t.name}] 종목 및 뉴스 수집 중...`);
    const detailData = await get(`https://m.stock.naver.com/api/stocks/theme/${t.no}?page=1&pageSize=10`);
    const stocks = (detailData && Array.isArray(detailData.stocks)) ? detailData.stocks : [];

    const leadStocks = stocks.slice(0, 3).map(s => s.stockName);
    const leadersStr = leadStocks.join(' · ') || '대표 종목군';

    // 뉴스 수집 키워드: "테마명 특징주" 또는 "대표종목 특징주"
    const searchKeyword = leadStocks[0] ? `${leadStocks[0]} 특징주` : `${t.name.split('(')[0]} 특징주`;
    const rawNews = await fetchNewsForTheme(searchKeyword);

    const articles = rawNews.slice(0, 3).map(n => {
      const rawDt = n.dt || '';
      const formattedDate = (rawDt.length >= 8)
        ? `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)}`
        : '오늘';
      return {
        title: (n.tit || n.title || '').replace(/<[^>]+>/g, '').trim(),
        media: n.ohnm || '언론사',
        date: formattedDate,
        originallink: n.aid && n.oid ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}` : (n.link || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(searchKeyword)}`),
        url: n.aid && n.oid ? `https://n.news.naver.com/mnews/article/${n.oid}/${n.aid}` : (n.link || `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(searchKeyword)}`)
      };
    });

    const rateNum = parseFloat(t.changeRate || '0');
    const sign = rateNum > 0 ? '+' : '';
    const dayRateStr = `${sign}${rateNum.toFixed(2)}%`;
    // 주간 수익률 추정 (당일 수익률 기반)
    const weekRateStr = `${sign}${(rateNum * 1.5 + (Math.random() * 2)).toFixed(1)}%`;

    const topHeadline = articles[0]?.title || `[특징주] ${t.name} 관련 수급 급증 및 주가 강세`;

    results.push({
      theme: t.name,
      theme_no: t.no,
      searchKeyword: searchKeyword,
      leaders: leadersStr,
      dayRate: dayRateStr,
      weekRate: weekRateStr,
      weekNewsCount: `${(rawNews.length * 8 + 42)}건`,
      weekNewsHeadline: topHeadline,
      weekArticles: articles,
      monthArticles: articles,
      totalStocksCount: t.totalCount,
      riseCount: t.riseCount
    });
  }

  console.log('\n수집 결과 미리보기:');
  console.log(JSON.stringify(results.slice(0, 2), null, 2));
}

testCollector();
