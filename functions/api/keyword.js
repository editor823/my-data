import { analyzeKeyword } from '../../worker/keyword-worker.mjs';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  // Pages 환경변수가 없으면 배포된 Worker로 자동 위임합니다.
  if (!env.NAVER_AD_SECRET_KEY || !env.NAVER_HUB_CLIENT_ID) {
    const workerRes = await fetch('https://moneyt-keyword.tkdgus8231.workers.dev/api/keyword?q=' + encodeURIComponent(q || ''));
    const text = await workerRes.text();
    return new Response(text, {
      status: workerRes.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const { status, body } = await analyzeKeyword(q, env);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message || '분석 중 오류가 발생했습니다.' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

