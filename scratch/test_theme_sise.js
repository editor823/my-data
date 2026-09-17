const https = require('https');

function fetchNaverThemeList() {
  return new Promise((resolve) => {
    const url = 'https://finance.naver.com/sise/theme.naver?field=change_rate&ordering=desc';
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 4000
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const decoder = new TextDecoder('euc-kr');
          const html = decoder.decode(buffer);
          
          const themeRegex = /<td class="col_type1"><a href="\/sise\/sise_group_detail\.naver\?type=theme&no=(\d+)">([^<]+)<\/a>[\s\S]*?<td class="number"><span class="tah p11 (?:red0[12]|nv01)">([\+\-]?[0-9\.]+\%?)<\/span>/gi;
          let match;
          const themes = [];
          while ((match = themeRegex.exec(html)) !== null) {
            themes.push({
              no: match[1],
              name: match[2].trim(),
              rate: match[3].trim()
            });
            if (themes.length >= 10) break;
          }
          resolve(themes);
        } catch (e) {
          console.error(e);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error(e);
      resolve([]);
    });
  });
}

fetchNaverThemeList().then(res => console.log('Parsed themes:', res));
