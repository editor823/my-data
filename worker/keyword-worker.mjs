/**
 * 키워드 분석 Worker (worker/keyword-worker.mjs)
 * - 본인 네이버 API 키로만 동작합니다 (남의 서버 사용 X).
 * - Cloudflare Worker 와 로컬 server.js 가 같은 코드를 같이 씁니다.
 *
 * 필요한 비밀 값(환경변수 / Worker Secret):
 *   NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY  (검색광고 API: 검색량·연관키워드)
 *   NAVER_HUB_CLIENT_ID,  NAVER_HUB_CLIENT_SECRET                       (API HUB: 블로그 문서수·상위글·뉴스)
 */

const ALLOWED_ORIGINS = [
  'https://editor823.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const HUB_BASE = 'https://naverapihub.apigw.ntruss.com/search/v1';

// "< 10" 처럼 문자열로 오는 검색량은 5로 계산합니다.
function toCount(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 5;
}

async function hmacBase64(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  let bin = '';
  new Uint8Array(sig).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

// 검색광고 API: 키워드 + 연관 키워드 검색량
async function fetchSearchAd(keyword, env) {
  const uri = '/keywordstool';
  const ts = String(Date.now());
  const signature = await hmacBase64(env.NAVER_AD_SECRET_KEY, `${ts}.GET.${uri}`);
  const url = `https://api.searchad.naver.com${uri}?showDetail=1&hintKeywords=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, {
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': env.NAVER_AD_ACCESS_LICENSE,
      'X-Customer': env.NAVER_AD_CUSTOMER_ID,
      'X-Signature': signature,
    },
  });
  if (!res.ok) throw new Error(`검색광고 API 오류 (${res.status})`);
  const data = await res.json();
  return (data.keywordList || []).map((k) => {
    const pc = toCount(k.monthlyPcQcCnt);
    const mobile = toCount(k.monthlyMobileQcCnt);
    return { keyword: k.relKeyword, pc, mobile, total: pc + mobile };
  });
}

// API HUB 검색 (blog / news)
async function hubSearch(kind, query, env, params = {}) {
  const qs = new URLSearchParams({ query, ...params }).toString();
  const res = await fetch(`${HUB_BASE}/${kind}?${qs}`, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': env.NAVER_HUB_CLIENT_ID,
      'X-NCP-APIGW-API-KEY': env.NAVER_HUB_CLIENT_SECRET,
    },
  });
  if (!res.ok) throw new Error(`${kind} 검색 API 오류 (${res.status})`);
  return res.json();
}

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

function competitionOf(blogCount, total) {
  if (!total) return '-';
  const r = blogCount / total;
  if (r < 1) return '낮음';
  if (r < 5) return '보통';
  if (r < 20) return '높음';
  return '매우 높음';
}

// 문서수 / 검색량 비율이 0.3 미만이고 검색량이 100 이상이면 황금 후보
const isGolden = (blogCount, total) => total >= 100 && blogCount / Math.max(1, total) < 0.3;

function postdateToAgeDays(p) {
  if (!/^\d{8}$/.test(p || '')) return null;
  const d = new Date(`${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}T00:00:00+09:00`);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

export async function analyzeKeyword(rawKeyword, env) {
  const keyword = String(rawKeyword || '').trim().replace(/\s+/g, '');
  if (!keyword) return { status: 400, body: { success: false, error: '키워드를 입력해 주세요.' } };
  if (keyword.length > 40) return { status: 400, body: { success: false, error: '키워드가 너무 깁니다.' } };

  const [ads, blogMain, blogTop, news] = await Promise.all([
    fetchSearchAd(keyword, env),
    hubSearch('blog', keyword, env, { display: 1 }),
    hubSearch('blog', keyword, env, { display: 10, sort: 'sim' }),
    hubSearch('news', keyword, env, { display: 5, sort: 'date' }).catch(() => ({ items: [] })),
  ]);

  const main = ads.find((a) => a.keyword === keyword) || { keyword, pc: 0, mobile: 0, total: 0 };
  const blogCount = Number(blogMain.total) || 0;

  // 연관 키워드: 검색량 많은 순 30개, 그중 상위 20개는 블로그 문서수까지 조회
  // 입력한 키워드가 들어간 연관어를 먼저, 나머지는 뒤에 (네이버가 무관한 단어도 섞어 보내기 때문)
  const others = ads.filter((a) => a.keyword !== keyword).sort((a, b) => b.total - a.total);
  const near = others.filter((a) => a.keyword.includes(keyword));
  const far = others.filter((a) => !a.keyword.includes(keyword));
  const related = near.concat(far).slice(0, 30);
  const counted = await Promise.all(related.slice(0, 20).map((r) =>
    hubSearch('blog', r.keyword, env, { display: 1 }).then((j) => Number(j.total) || 0).catch(() => null)));
  const relatedOut = related.map((r, i) => {
    const bc = i < counted.length ? counted[i] : null;
    return {
      ...r,
      blogCount: bc,
      ratio: bc == null || !r.total ? null : Number((bc / r.total).toFixed(2)),
      competition: bc == null ? '-' : competitionOf(bc, r.total),
      golden: bc == null ? false : isGolden(bc, r.total),
    };
  });

  const top = (blogTop.items || []).map((it, i) => ({
    rank: i + 1,
    title: stripTags(it.title),
    blogger: it.bloggername,
    link: it.link,
    postdate: it.postdate,
    ageDays: postdateToAgeDays(it.postdate),
  }));
  const ages = top.map((t) => t.ageDays).filter((v) => v != null);

  return {
    status: 200,
    body: {
      success: true,
      keyword,
      pc: main.pc,
      mobile: main.mobile,
      total: main.total,
      blogCount,
      ratio: main.total ? Number((blogCount / main.total).toFixed(2)) : null,
      competition: competitionOf(blogCount, main.total),
      golden: isGolden(blogCount, main.total),
      avgAgeDays: ages.length ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null,
      blogTop: top,
      news: (news.items || []).map((n) => ({ title: stripTags(n.title), link: n.originallink || n.link, pubDate: n.pubDate })),
      related: relatedOut,
      measuredAt: new Date().toISOString(),
    },
  };
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (url.pathname !== '/api/keyword') {
      return new Response(JSON.stringify({ success: false, error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
    }
    try {
      const { status, body } = await analyzeKeyword(url.searchParams.get('q'), env);
      return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message || '분석 중 오류가 발생했습니다.' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
    }
  },
};
