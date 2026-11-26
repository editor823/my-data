/**
 * 바이럴숏폼 · 유튜브 실시간 검색 (worker/youtube-viral.mjs)
 * - API 키 없이 유튜브 웹 검색(youtubei/v1/search)을 그대로 사용합니다. 남의 서버 사용 X.
 * - Cloudflare Worker 와 로컬 server.js 가 같은 코드를 같이 씁니다.
 * - /api/youtube/viral?q=&region=KR|US|JP|CN|ALL&period=day|week|month|2month|6month|year&sort=views|rising&format=shorts|long|all
 */

const YT_SEARCH = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const CLIENT_VERSION = '2.20261123.09.00';
const SHORTS_MAX_SEC = 180; // 쇼츠 = 3분 이하

// 검색어를 비웠을 때(전체 종합) 쓰는 분야별 검색어. 뉴스로 쏠리지 않게 여러 분야를 섞습니다.
export const YT_REGIONS = {
  KR: { gl: 'KR', hl: 'ko', label: '한국', seeds: ['예능', '먹방', '브이로그', '게임', '음악', '스포츠', '동물', '요리', '뷰티', '유머', '드라마', '이슈'] },
  US: { gl: 'US', hl: 'en', label: '미국', seeds: ['funny', 'vlog', 'gaming', 'music', 'sports', 'animals', 'cooking', 'beauty', 'prank', 'movie', 'challenge', 'news'] },
  JP: { gl: 'JP', hl: 'ja', label: '일본', seeds: ['バラエティ', '料理', 'Vlog', 'ゲーム', '音楽', 'スポーツ', '動物', 'メイク', 'お笑い', 'アニメ', 'ドラマ', 'ニュース'] },
  CN: { gl: 'TW', hl: 'zh-TW', label: '중국', seeds: ['搞笑', '美食', 'vlog', '遊戲', '音樂', '運動', '動物', '美妝', '綜藝', '電影', '挑戰', '新聞'] },
  ALL: { gl: null, hl: 'en', label: '전세계', seeds: ['funny', 'music', 'gaming', 'sports', 'animals', 'cooking', 'vlog', 'challenge', 'movie', 'dance', 'satisfying', 'news'] },
};

// 방송사·언론 채널 (전체 종합에서 비중을 제한)
const NEWS_TITLE = /뉴스|news|\[속보\]|\[단독\]|ニュース|新聞|新闻/i;
const NEWS_CHANNEL = /뉴스|news|ytn|mbc|kbs|sbs|jtbc|mbn|채널\s?a|tv조선|연합|ニュース|新聞|新闻|cnn|fox|abc|nbc|cbs|bbc|reuters|times|post/i;

// date: 유튜브 업로드 날짜 필터 (2=오늘, 3=이번 주, 4=이번 달, 5=올해), days: 게시 경과일 상한
export const YT_PERIODS = {
  day: { date: 2, days: 1, label: '최근 24시간' },
  week: { date: 3, days: 7, label: '최근 일주일 (7일)' },
  month: { date: 4, days: 31, label: '30일 (1개월)' },
  '2month': { date: 5, days: 62, label: '2개월' },
  '6month': { date: 5, days: 183, label: '6개월' },
  year: { date: 5, days: 366, label: '1년' },
};

const SORT_LABEL = { views: '조회수 많은 순', rising: '조회급상승 순' };
const FORMAT_LABEL = { shorts: '숏츠만', long: '롱폼만', all: '전체' };

// 검색 필터(protobuf) → base64. sort 3 = 조회수 순, type 1 = 동영상, duration 4 = 3분 미만
function searchParams({ date, short }) {
  const filter = [0x08, date, 0x10, 0x01];
  if (short) filter.push(0x18, 0x04);
  const bytes = [0x08, 0x03, 0x12, filter.length, ...filter];
  return btoa(String.fromCharCode(...bytes));
}

// 업로드 날짜만 건 필터. 정렬·유형 필터를 걸면 유튜브가 Shorts 묶음(세로 영상)을 안 줍니다.
function dateOnlyParams(date) {
  return btoa(String.fromCharCode(0x12, 0x02, 0x08, date));
}

async function ytPost(body, { gl, hl }) {
  const client = { clientName: 'WEB', clientVersion: CLIENT_VERSION, hl: hl || 'ko' };
  if (gl) client.gl = gl;
  const res = await fetch(YT_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': CLIENT_VERSION,
    },
    body: JSON.stringify({ context: { client }, ...body }),
  });
  if (!res.ok) throw new Error('유튜브 검색 응답 오류 (' + res.status + ')');
  return res.json();
}

// 검색 결과 목록(itemSection) 안의 영상만 꺼냅니다. "관련 영상" 선반은 기간 필터가 안 걸려서 뺍니다.
function pickItems(json) {
  const sections = [];
  const primary = json?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (primary) sections.push(...primary);
  for (const cmd of json?.onResponseReceivedCommands || []) {
    sections.push(...(cmd.appendContinuationItemsAction?.continuationItems || []));
  }
  const videos = [];
  let token = null;
  for (const s of sections) {
    for (const c of s.itemSectionRenderer?.contents || []) {
      if (c.videoRenderer) videos.push(c.videoRenderer);
      else if (c.gridShelfViewModel || c.reelShelfRenderer) {
        (function walk(x) {
          if (!x || typeof x !== 'object') return;
          if (x.shortsLockupViewModel) { videos.push({ lockup: x.shortsLockupViewModel }); return; }
          for (const k in x) walk(x[k]);
        })(c);
      }
    }
    const t = s.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (t) token = t;
  }
  return { videos, token };
}

const text = (t) => (t ? t.simpleText || (t.runs || []).map((r) => r.text).join('') : '');

function toSeconds(len) {
  if (!len) return 0;
  return len.split(':').reduce((s, p) => s * 60 + (parseInt(p, 10) || 0), 0);
}

// "4일 전" / "3 days ago" / "3 日前" / "3 天前" → 경과 시간(시간 단위)
const AGE_UNITS = [
  [/^(초|秒|sec)/i, 1 / 3600],
  [/^(시간|時間|小時|小时|hour)/i, 1],
  [/^(분|分|min)/i, 1 / 60],
  [/^(일|日|天|day)/i, 24],
  [/^(주|週|周|week)/i, 168],
  [/^(개월|달|か月|ヶ月|ケ月|個月|个月|month)/i, 730],
  [/^(년|年|year)/i, 8760],
];
export function ageHours(pub) {
  const m = /(\d+)\s*([^\d\s]+)/.exec(pub || '');
  if (!m) return null;
  const unit = AGE_UNITS.find(([re]) => re.test(m[2]));
  return unit ? Number(m[1]) * unit[1] : null;
}

function koAge(hours, fallback) {
  if (hours == null) return fallback || '최근';
  if (hours < 1) return '방금 전';
  if (hours < 24) return Math.round(hours) + '시간 전';
  if (hours < 168) return Math.round(hours / 24) + '일 전';
  if (hours < 730) return Math.round(hours / 168) + '주 전';
  if (hours < 8760) return Math.round(hours / 730) + '개월 전';
  return Math.round(hours / 8760) + '년 전';
}

// "조회수 2.9만회" / "1.2K views" / "3.4万回視聴" → 숫자
const COMPACT = [[/천/, 1e3], [/만|万|萬/, 1e4], [/억|億|亿/, 1e8], [/K\b/i, 1e3], [/M\b/i, 1e6], [/B\b/i, 1e9]];
function parseCompactViews(s) {
  const m = /([\d.,]+)\s*([^\d\s.,]*)/.exec((s || '').replace(/^[^\d]*/, ''));
  if (!m) return 0;
  const num = parseFloat(m[1].replace(/,/g, ''));
  const unit = COMPACT.find(([re]) => re.test(m[2]));
  return Math.round(num * (unit ? unit[1] : 1));
}

function normalizeLockup(l) {
  const id = l.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || (l.entityId || '').replace(/^shorts-shelf-item-/, '');
  const title = l.overlayMetadata?.primaryText?.content || (l.accessibilityText || '').split(',')[0];
  if (!id || !title) return null;
  const viewText = l.overlayMetadata?.secondaryText?.content || '';
  const viewCount = parseCompactViews(viewText);
  const src = l.thumbnailViewModel?.thumbnailViewModel?.image?.sources || l.thumbnail?.sources || [];
  return {
    id,
    title,
    channel: 'YouTube Shorts',
    channelKnown: false,
    views: viewText ? (/조회수/.test(viewText) ? viewText : '조회수 ' + viewText) : '조회수 없음',
    viewCount,
    published: '기간 필터 기준',
    ageHours: null,
    viewsPerHour: 0,
    duration: 'Shorts',
    seconds: 0,
    isShorts: true,
    vertical: true,
    thumbnail: src.length ? src[0].url : 'https://i.ytimg.com/vi/' + id + '/oar2.jpg',
    url: 'https://www.youtube.com/shorts/' + id,
  };
}

function parseViews(s) {
  const digits = (s || '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

// 해시태그를 뺀 제목에서 한글 비중이 30% 이상이면 한국어 영상으로 봅니다.
const HANGUL = /[가-힣]/g;
const LETTERS = /[A-Za-z぀-ヿ一-鿿가-힣]/g;
function isKoreanTitle(title) {
  const plain = title.replace(/#\S+/g, '');
  const hangul = (plain.match(HANGUL) || []).length;
  const letters = (plain.match(LETTERS) || []).length;
  return letters > 0 && hangul / letters >= 0.3;
}

function normalize(v) {
  if (v.lockup) return normalizeLockup(v.lockup);
  const id = v.videoId;
  const title = text(v.title);
  const lengthText = text(v.lengthText);
  if (!id || !title || !lengthText) return null; // 라이브·예정 영상 제외
  const seconds = toSeconds(lengthText);
  const isShorts = seconds > 0 && seconds <= SHORTS_MAX_SEC;
  const viewText = text(v.viewCountText);
  const viewCount = parseViews(viewText);
  const published = text(v.publishedTimeText);
  const hours = ageHours(published);
  const thumbs = v.thumbnail?.thumbnails || [];
  return {
    id,
    title,
    channel: text(v.ownerText) || text(v.longBylineText) || '유튜브',
    channelKnown: true,
    views: viewCount ? '조회수 ' + viewCount.toLocaleString('ko-KR') + '회' : viewText || '조회수 없음',
    viewCount,
    published: koAge(hours, published),
    ageHours: hours,
    viewsPerHour: hours != null ? Math.round(viewCount / Math.max(hours, 1)) : 0,
    duration: lengthText,
    seconds,
    isShorts,
    thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
    url: isShorts ? 'https://www.youtube.com/shorts/' + id : 'https://www.youtube.com/watch?v=' + id,
  };
}

// 한 검색어로 최대 pages 페이지까지 모읍니다.
async function collect(query, params, region, pages) {
  const out = [];
  let json = await ytPost({ query, params }, region);
  for (let p = 0; p < pages; p++) {
    const { videos, token } = pickItems(json);
    out.push(...videos);
    if (!token || p === pages - 1) break;
    json = await ytPost({ continuation: token }, region);
  }
  return out;
}

export async function searchViral(opts = {}) {
  const query = String(opts.q || '').trim().slice(0, 80);
  const regionKey = YT_REGIONS[opts.region] ? opts.region : 'KR';
  const periodKey = YT_PERIODS[opts.period] ? opts.period : 'week';
  const sort = opts.sort === 'rising' ? 'rising' : 'views';
  const format = ['shorts', 'long', 'all'].includes(opts.format) ? opts.format : 'shorts';
  const region = YT_REGIONS[regionKey];
  const period = YT_PERIODS[periodKey];
  const limit = 40;

  // 전체 종합 + 영상 형태 '전체'는 숏츠·롱폼을 따로 찾으므로 분야를 8개로 줄여 요청 수를 맞춥니다.
  const queries = query ? [query] : format === 'all' ? region.seeds.slice(0, 8) : format === 'shorts' ? region.seeds.slice(0, 10) : region.seeds;
  // 키워드 검색: 2페이지(2·6개월·1년은 '올해' 결과에서 걸러내므로 3페이지). 전체 종합은 분야가 많아 1페이지씩.
  const pages = query ? 2 + (period.date === 5 ? 1 : 0) : 1;
  const kinds = format === 'all' ? [true, false] : [format === 'shorts'];

  const jobs = [];
  for (const q of queries) {
    for (const short of kinds) jobs.push(collect(q, searchParams({ date: period.date, short }), region, pages).then((list) => ({ q, list })));
    // 숏츠: "<검색어> shorts" + 업로드 날짜 필터 → 유튜브 Shorts 묶음(세로 영상)
    if (kinds.includes(true)) jobs.push(collect(q + ' shorts', dateOnlyParams(period.date), region, 1).then((list) => ({ q, list })));
  }
  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.some((r) => r.list.length) && settled.some((r) => r.status === 'rejected')) {
    throw new Error(settled.find((r) => r.status === 'rejected').reason?.message || '유튜브 검색 실패');
  }

  const assumedHours = Math.max(1, (period.days * 24) / 2); // 게시일을 모르는 Shorts 묶음 영상은 기간 중간에 올라왔다고 봅니다
  const score = sort === 'rising' ? (v) => (v.ageHours != null ? v.viewsPerHour : Math.round(v.viewCount / assumedHours)) : (v) => v.viewCount;
  const keep = (n) => {
    if (!n) return false;
    if (format === 'shorts' && !n.isShorts) return false;
    if (format === 'long' && n.isShorts) return false;
    if (n.ageHours != null && n.ageHours > period.days * 24) return false; // 선택 기간 밖 영상 제외
    if (regionKey === 'KR' && !isKoreanTitle(n.title)) return false;
    return true;
  };

  // 검색어별로 상위 영상만 가져와 섞습니다 (한 분야가 독차지하지 않게)
  const perSeed = query ? Infinity : Math.ceil((limit * 1.5) / queries.length);
  const bySeed = new Map();
  for (const { q, list } of ok) {
    const arr = bySeed.get(q) || [];
    for (const v of list) { const n = normalize(v); if (keep(n)) arr.push(n); }
    bySeed.set(q, arr);
  }
  const seen = new Set();
  let pool = [];
  for (const arr of bySeed.values()) {
    arr.sort((a, b) => score(b) - score(a));
    let taken = 0;
    for (const n of arr) {
      if (taken >= perSeed) break;
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      pool.push(n);
      taken++;
    }
  }
  pool.sort((a, b) => score(b) - score(a));

  // 같은 채널은 최대 2개(키워드 검색은 3개), 전체 종합에서는 뉴스 채널을 1/4까지만
  const channelMax = query ? 3 : 2;
  const newsMax = query ? Infinity : Math.floor(limit / 4);
  const perChannel = new Map();
  let newsCount = 0;
  let videos = [];
  for (const n of pool) {
    if (videos.length >= limit) break;
    const c = perChannel.get(n.channel) || 0;
    if (n.channelKnown && c >= channelMax) continue;
    const isNews = NEWS_CHANNEL.test(n.channel) || NEWS_TITLE.test(n.title);
    if (isNews && newsCount >= newsMax) continue;
    perChannel.set(n.channel, c + 1);
    if (isNews) newsCount++;
    videos.push(n);
  }

  return {
    status: 200,
    body: {
      success: true,
      query,
      region: regionKey,
      regionLabel: region.label,
      period: periodKey,
      periodLabel: period.label,
      sort,
      sortLabel: SORT_LABEL[sort],
      format,
      formatLabel: FORMAT_LABEL[format],
      count: videos.length,
      shortsCount: videos.filter((v) => v.isShorts).length,
      longCount: videos.filter((v) => !v.isShorts).length,
      videos,
      updatedAt: new Date().toISOString(),
    },
  };
}