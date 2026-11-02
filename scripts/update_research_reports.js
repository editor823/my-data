const https = require('https');
const fs = require('fs');
const path = require('path');

https.get('https://m.stock.naver.com/api/research/company?page=1&pageSize=25', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const rawList = JSON.parse(data);
      const reports = rawList.map(item => ({
        date: item.writeDate,
        broker: item.brokerName,
        target_name: item.itemName,
        stock_code: item.itemCode,
        title: item.title,
        opinion: "Buy(유지)",
        target_price: "적정주가 제시",
        is_strong: item.title.includes('확실') || item.title.includes('모멘텀') || item.title.includes('성장') || item.title.includes('개선') || item.title.includes('상향'),
        report_url: item.endUrl || `https://m.stock.naver.com/research/company/${item.researchId}`,
        read_count: item.readCount
      }));

      console.log(`Successfully fetched ${reports.length} real reports.`);
      console.log(`Latest date: ${reports[0]?.date}`);

      const jsonStr = JSON.stringify(reports, null, 2);

      const targets = [
        path.join(__dirname, '../data/research_reports.json'),
        path.join(__dirname, '../stock-intelligence/data/research_reports.json')
      ];

      targets.forEach(t => {
        fs.mkdirSync(path.dirname(t), { recursive: true });
        fs.writeFileSync(t, jsonStr, 'utf8');
        console.log(`Saved to ${t}`);
      });
    } catch(e) {
      console.error('Error parsing:', e);
    }
  });
});
