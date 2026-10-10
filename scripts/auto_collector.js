/**
 * 매일 자동 키워드 수집 및 갱신 엔진 (scripts/auto_collector.js)
 * 1번: 황금키워드 (매일 자동 갱신 - 네이버 검색광고 + 블로그 저경쟁 롱테일)
 * 2번: 제휴마케팅 키워드 (매일 자동 갱신 - 네이버 쇼핑 카테고리 베스트 + 구매전환 롱테일)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// 환경변수 로드 (.env.local 또는 GitHub Secrets)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim();
          env[key] = val;
        }
      }
    }
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const NAVER_CUSTOMER_ID = env.NAVER_AD_CUSTOMER_ID || '';
const NAVER_LICENSE_KEY = env.NAVER_AD_ACCESS_LICENSE || '';
const NAVER_SECRET_KEY = env.NAVER_AD_SECRET_KEY || '';

// 네이버 검색광고 API 서명 생성
function generateSignature(timestamp, method, path, secretKey) {
  const message = `${timestamp}.${method}.${path}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

// HTTPS 요청 헬퍼
function requestHttps(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

// 1. 네이버 자동완성 및 연관 검색어 수집 (씨앗 키워드로부터 롱테일 확장)
async function fetchNaverAutoComplete(keyword) {
  try {
    const enc = encodeURIComponent(keyword);
    const url = `https://ac.search.naver.com/nx/ac?q=${enc}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`;
    const res = await requestHttps({
      hostname: 'ac.search.naver.com',
      path: `/nx/ac?q=${enc}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res && res.items && res.items[0]) {
      return res.items[0].map(item => item[0]);
    }
  } catch (e) {
    console.warn(`[Auto-Complete] ${keyword} 조회 실패:`, e.message);
  }
  return [];
}

// 2. 외부 JSON 요청 헬퍼
function fetchJson(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON 파싱 실패 (${url}): ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`요청 타임아웃 (${url})`));
    });
  });
}

// 3. 실시간 급상승어 & 최신 연예뉴스 자동 수집 및 파일 저장
async function collectTrendingAndNews() {
  console.log('📡 [1/3] 5대 포털 실시간 급상승어 및 최신 연예뉴스 수집 시작...');
  const ts = Date.now();
  const trendUrl = `https://www.boutique-info.com/api/keyword-center?action=getTrendingKeywords&_t=${ts}`;
  const newsUrl = `https://www.boutique-info.com/api/keyword-center?action=getEntertainmentNews&_t=${ts}`;

  let trendingData = null;
  let newsData = null;

  try {
    const trendRes = await fetchJson(trendUrl);
    if (trendRes && trendRes.success && trendRes.data) {
      trendingData = trendRes.data;
      console.log('  ✅ 5대 포털 급상승어 수집 완료 (네이버, 네이트, 줌, 구글, 다음)');
    }
  } catch (e) {
    console.warn('  ⚠️ 실시간 급상승어 원본 수집 실패:', e.message);
  }

  try {
    const newsRes = await fetchJson(newsUrl);
    if (newsRes && newsRes.success && Array.isArray(newsRes.data)) {
      newsData = newsRes.data;
      console.log(`  ✅ 최신 연예뉴스 수집 완료 (총 ${newsData.length}건)`);
    }
  } catch (e) {
    console.warn('  ⚠️ 최신 연예뉴스 원본 수집 실패:', e.message);
  }

  if (trendingData || newsData) {
    const output = {
      success: true,
      updatedAt: new Date().toISOString(),
      updatedAtKst: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      trending: trendingData || {},
      entertainment: newsData || []
    };

    const targetPaths = [
      path.join(__dirname, '..', 'data', 'trending_live.json'),
      path.join(__dirname, '..', 'trending_live.json')
    ];

    for (const p of targetPaths) {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(output, null, 2), 'utf8');
      console.log(`  💾 저장 완료: ${path.relative(path.join(__dirname, '..'), p)}`);
    }
  }
}

// 4. 키워드 센터 및 숏폼 데이터 자동 갱신
async function collectKeywordCenterData() {
  console.log('📡 [2/3] 키워드 센터 및 바이럴 숏폼 데이터 수집 시작...');
  const ts = Date.now();
  const kcUrl = `https://www.boutique-info.com/api/keyword-center?action=getDailyKeywordCenter&_t=${ts}`;
  const shortsUrl = `https://www.boutique-info.com/api/keyword-center?action=searchViralShorts&keyword=&period=week&sort=views&shorts=all&_t=${ts}`;

  try {
    const kcRes = await fetchJson(kcUrl, 12000);
    if (kcRes && (kcRes.categories || kcRes.success)) {
      const p1 = path.join(__dirname, '..', 'data', 'keyword_center_live.json');
      const p2 = path.join(__dirname, '..', 'keyword_center_live.json');
      fs.writeFileSync(p1, JSON.stringify(kcRes, null, 2), 'utf8');
      fs.writeFileSync(p2, JSON.stringify(kcRes, null, 2), 'utf8');
      console.log('  ✅ 키워드 센터 live 데이터 동기화 완료');
    }
  } catch (e) {
    console.warn('  ⚠️ 키워드 센터 원본 갱신 실패:', e.message);
  }

  try {
    const shortsRes = await fetchJson(shortsUrl, 12000);
    if (shortsRes && (shortsRes.videos || shortsRes.success)) {
      const p1 = path.join(__dirname, '..', 'data', 'viral_shorts_live.json');
      const p2 = path.join(__dirname, '..', 'viral_shorts_live.json');
      fs.writeFileSync(p1, JSON.stringify(shortsRes, null, 2), 'utf8');
      fs.writeFileSync(p2, JSON.stringify(shortsRes, null, 2), 'utf8');
      console.log('  ✅ 바이럴 숏폼 live 데이터 동기화 완료');
    }
  } catch (e) {
    console.warn('  ⚠️ 바이럴 숏폼 원본 갱신 실패:', e.message);
  }
}

// 5. 일일 수집 실행 메인 함수
async function runDailyCollector() {
  try {
    console.log(`[${new Date().toISOString()}] 🚀 일일 자동 수집 가동 시작...`);

    // (1) 실시간 급상승어 & 최신 연예뉴스 수집
    await collectTrendingAndNews();

    // (2) 키워드 센터 & 바이럴 숏폼 최신화
    await collectKeywordCenterData();

    console.log(`[${new Date().toISOString()}] 🎉 일일 자동 갱신 완료!`);
  } catch (error) {
    console.error(`⚠️ [Auto-Collector] 자동 수집 중 예외 발생:`, error && error.message ? error.message : error);
  }
}

// 스크립트 실행 진입점 (비동기 예외 누락 방지)
runDailyCollector().catch((err) => {
  console.error(`⚠️ [Auto-Collector] 최상위 실행 오류:`, err && err.message ? err.message : err);
});

