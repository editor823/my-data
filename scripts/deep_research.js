const https = require('https');
const fs = require('fs');
const path = require('path');

// 1. 네이버 뉴스 검색 API 호출 함수
function searchNaverNews(keyword, sort = 'date', display = 30) {
  return new Promise((resolve) => {
    const url = 'https://openapi.naver.com/v1/search/news.json?query=' + encodeURIComponent(keyword) + '&display=' + display + '&sort=' + sort;
    const headers = {
      'X-Naver-Client-Id': '2iKHyyPOqriPMIsahHYt',
      'X-Naver-Client-Secret': 'CgG2dPHGrT'
    };
    https.get(url, { headers, timeout: 6000 }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(d);
          resolve(json.items || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

// 2. 딥리서치 리포트 생성기
async function generateDeepResearch(targetName) {
  const query = targetName.trim();
  
  // 뉴스 검색 (최신순 30개 + 정확도순 30개 병합)
  const [newsDate, newsSim] = await Promise.all([
    searchNaverNews(query, 'date', 30),
    searchNaverNews(query, 'sim', 30)
  ]);

  const allNews = [...newsDate, ...newsSim];
  const seen = new Set();
  const curatedNews = [];

  allNews.forEach(item => {
    const title = cleanHtml(item.title);
    if (!seen.has(title) && (title.includes(query) || item.description.includes(query))) {
      seen.add(title);
      const pubDate = new Date(item.pubDate);
      const dateStr = pubDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      // 네이버 뉴스 직결 링크(n.news.naver.com) 우선 확인
      let newsLink = item.link;
      if (item.link && item.link.includes('naver.com')) {
        newsLink = item.link;
      } else if (item.originallink) {
        newsLink = item.originallink;
      }

      curatedNews.push({
        title,
        dateStr,
        link: newsLink,
        desc: cleanHtml(item.description)
      });
    }
  });

  // 날짜순 정렬
  curatedNews.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

  return {
    target: query,
    totalNewsFound: curatedNews.length,
    recentNews: curatedNews.slice(0, 10)
  };
}

module.exports = { generateDeepResearch, searchNaverNews, cleanHtml };

if (require.main === module) {
  const target = process.argv[2] || '필옵틱스';
  generateDeepResearch(target).then(res => {
    console.log(`=== ${res.target} 딥리서치 검색 결과 (${res.totalNewsFound}건) ===`);
    res.recentNews.forEach((n, i) => {
      console.log(`[${i + 1}] (${n.dateStr}) ${n.title}`);
      console.log(`    🔗 ${n.link}`);
      console.log(`    ↳ ${n.desc.slice(0, 80)}...\n`);
    });
  });
}
