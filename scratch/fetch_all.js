const https = require('https');
const fs = require('fs');

async function fetchApi(period, sort, shorts) {
  const url = `https://moneyt-api.ramenarchive.com/v1/kc-8f31a7d4e26b49c0?action=searchViralShorts&keyword=&period=${period}&sort=${sort}&shorts=${shorts}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.videos || []);
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching today...');
  const today = await fetchApi('today', 'views', 'true');
  console.log('Today count:', today.length);

  console.log('Fetching week...');
  const week = await fetchApi('week', 'views', 'true');
  console.log('Week count:', week.length);

  console.log('Fetching month...');
  const month = await fetchApi('month', 'views', 'true');
  console.log('Month count:', month.length);

  const result = { today, week, month };
  fs.writeFileSync('scratch/all_boutique_videos.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('Saved all_boutique_videos.json');
}

main().catch(console.error);
