const fs = require('fs');

// 네이버페이 증권에서 미국 지수 데이터를 가져오는 함수
async function fetchIndex(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP 요청 실패: ${response.status}`);
  }

  const data = await response.json();
  return {
    name: data.indexName,                    // 지수명 (예: 나스닥 종합, S&P 500)
    closePrice: data.closePrice,            // 장마감 지수 (종가)
    fluctuationsRatio: data.fluctuationsRatio // 전일대비 변동률 (%)
  };
}

async function main() {
  const nasdaqUrl = 'https://api.stock.naver.com/index/.IXIC/basic';
  const sp500Url = 'https://api.stock.naver.com/index/.INX/basic';

  try {
    // 두 API를 비동기(동시)로 호출합니다.
    const [nasdaq, sp500] = await Promise.all([
      fetchIndex(nasdaqUrl),
      fetchIndex(sp500Url)
    ]);

    const result = {
      updatedAt: new Date().toISOString(),
      nasdaq,
      sp500
    };

    // 결과를 scratch/api_result.json 파일에 저장
    fs.writeFileSync('scratch/api_result.json', JSON.stringify(result, null, 2), 'utf-8');
    console.log('성공적으로 저장되었습니다:', result);
  } catch (error) {
    console.error('데이터를 가져오는 중 오류가 발생했습니다:', error.message);
  }
}

main();
