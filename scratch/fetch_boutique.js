const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://m.stock.naver.com/',
  'Accept': 'application/json, text/plain, */*'
};

async function fetchJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`[${response.status}] ${url}`);
  return await response.json();
}

async function main() {
  try {
    const urls = {
      kospi: 'https://m.stock.naver.com/api/index/KOSPI/basic',
      kosdaq: 'https://m.stock.naver.com/api/index/KOSDAQ/basic',
      nasdaq: 'https://api.stock.naver.com/index/.IXIC/basic',
      sp500: 'https://api.stock.naver.com/index/.INX/basic',
      exchange: 'https://m.stock.naver.com/front-api/v1/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW'
    };

    const [kData, kdData, nData, spData, fxRaw] = await Promise.all([
      fetchJson(urls.kospi),
      fetchJson(urls.kosdaq),
      fetchJson(urls.nasdaq),
      fetchJson(urls.sp500),
      fetchJson(urls.exchange)
    ]);

    const fxData = fxRaw.result?.[0] || {};

    const result = {
      updatedAt: new Date().toISOString(),
      kospi: {
        name: '코스피',
        closePrice: kData.closePrice || kData.now,
        fluctuationsRatio: kData.fluctuationsRatio,
        compareToPreviousClosePrice: kData.compareToPreviousClosePrice
      },
      kosdaq: {
        name: '코스닥',
        closePrice: kdData.closePrice || kdData.now,
        fluctuationsRatio: kdData.fluctuationsRatio,
        compareToPreviousClosePrice: kdData.compareToPreviousClosePrice
      },
      nasdaq: {
        name: '나스닥 종합',
        closePrice: nData.closePrice,
        fluctuationsRatio: nData.fluctuationsRatio,
        compareToPreviousClosePrice: nData.compareToPreviousClosePrice
      },
      sp500: {
        name: 'S&P 500',
        closePrice: spData.closePrice,
        fluctuationsRatio: spData.fluctuationsRatio,
        compareToPreviousClosePrice: spData.compareToPreviousClosePrice
      },
      usdKrw: {
        name: '원/달러 환율',
        closePrice: fxData.closePrice || '0',
        fluctuationsRatio: fxData.fluctuationsRatio || '0',
        compareToPreviousPrice: fxData.compareToPreviousPrice || '0'
      }
    };

    const outputPath = path.join(__dirname, 'api_result.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log('5대 지표 수집 성공:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('수집 실패:', error.message);
  }
}

main();