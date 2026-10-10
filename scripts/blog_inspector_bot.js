/**
 * 블로그 자동화 허브 전체 검수봇 (scripts/blog_inspector_bot.js)
 *
 * 실행:  node scripts/blog_inspector_bot.js     (또는  npm run inspect)
 *
 * 하는 일 (서버를 켜지 않아도, 파일만 보고 검사합니다):
 *  1. 필수 파일이 있는지
 *  2. JS 파일에 문법 오류가 없는지
 *  3. 데이터(JSON) 파일이 멀쩡한지 + 너무 오래 갱신 안 됐는지
 *  4. index.html이 연결한 파일(js/css/링크/이미지)이 실제로 있는지
 *  5. 화면 버튼(onclick)이 부르는 함수가 실제로 존재하는지, ID 중복은 없는지
 *  6. 글(posts/*.html)의 제목·설명·h1 같은 검색 노출 기본기, 중복 글
 *  7. 블로그 화면에 고동색/베이지(주식센터 전용 색)가 섞이지 않았는지
 *  8. 비밀번호/API키가 공개 파일에 노출되지 않았는지
 *
 * 결과는 화면에 출력하고, data/blog_inspector_report.md 파일로도 저장합니다.
 * FAIL(고쳐야 함)이 하나라도 있으면 종료코드 1로 끝납니다.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'graft', 'scratch', 'stock-intelligence', 'public', '.github']);
const DAY = 24 * 60 * 60 * 1000;

const results = []; // { group, level: 'OK'|'WARN'|'FAIL', title, detail }
function add(group, level, title, detail = '') {
  results.push({ group, level, title, detail });
}

const abs = (p) => path.join(ROOT, p);
const exists = (p) => fs.existsSync(abs(p));
const read = (p) => fs.readFileSync(abs(p), 'utf8');

function listFiles(dir, ext) {
  const full = abs(dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.posix.join(dir, f));
}

// ---------------------------------------------------------------- 1. 필수 파일
function checkRequiredFiles() {
  const G = '1. 필수 파일';
  const required = [
    'index.html', 'guides.html', 'server.js', 'package.json',
    'css/style.css', 'css/components.css',
    'js/app.js', 'js/keyword.js', 'js/prompt.js', 'js/external.js',
    'js/converter.js', 'js/imggen.js', 'js/trending.js', 'js/adsense.js',
    'js/blog_inspector.js', 'js/viral_shorts_data.js',
    'trending_live.json', 'keyword_center_live.json', 'viral_shorts_live.json', 'seasonal-keywords.json'
  ];
  const missing = required.filter((f) => !exists(f));
  if (missing.length) add(G, 'FAIL', `필수 파일 ${missing.length}개 없음`, missing.join(', '));
  else add(G, 'OK', `필수 파일 ${required.length}개 모두 있음`);
}

// ---------------------------------------------------------------- 2. JS 문법
function checkJsSyntax() {
  const G = '2. JS 문법';
  const files = [...listFiles('js', '.js'), 'server.js', ...listFiles('scripts', '.js')].filter(exists);
  const bad = [];
  for (const f of files) {
    try {
      let code = read(f);
      code = code.replace(/^#!.*/, ''); // 첫줄 shebang 제거
      new vm.Script(code, { filename: f }); // 실행하지 않고 문법만 검사
    } catch (e) {
      bad.push(`${f} → ${e.message}`);
    }
  }
  if (bad.length) add(G, 'FAIL', `문법 오류 ${bad.length}개`, bad.join('\n'));
  else add(G, 'OK', `JS ${files.length}개 문법 오류 없음`);
}

// ---------------------------------------------------------------- 3. 데이터(JSON)
function countItems(json) {
  if (Array.isArray(json)) return json.length;
  if (json && typeof json === 'object') {
    // 가장 큰 배열 하나를 대표 개수로 사용
    let max = 0;
    for (const v of Object.values(json)) if (Array.isArray(v)) max = Math.max(max, v.length);
    return max || Object.keys(json).length;
  }
  return 0;
}

// 파일이 마지막으로 바뀐 시각: git 기록 우선, 없으면 파일 수정일
// (GitHub 서버는 내려받는 순간 수정일이 '지금'으로 찍혀서 git 기록이 더 정확합니다)
function lastChangedMs(file) {
  try {
    const out = require('child_process')
      .execSync(`git log -1 --format=%ct -- "${file}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    if (out) return Number(out) * 1000;
  } catch (e) { /* git 없음 → 아래 기본값 */ }
  return fs.statSync(abs(file)).mtimeMs;
}

function checkJsonData() {
  const G = '3. 데이터 파일';
  const targets = [
    { file: 'trending_live.json', fresh: 2 }, // 실시간 급상승: 2일 넘으면 경고
    { file: 'keyword_center_live.json', fresh: 7 },
    { file: 'viral_shorts_live.json', fresh: 7 },
    { file: 'seasonal-keywords.json', fresh: 0 }, // 0 = 신선도 검사 안 함
    { file: 'js/live_domestic_news_seed.json', fresh: 7 }
  ];
  for (const t of targets) {
    if (!exists(t.file)) { add(G, 'FAIL', `${t.file} 없음`); continue; }
    let json;
    try { json = JSON.parse(read(t.file).replace(/^\uFEFF/, '')); }
    catch (e) { add(G, 'FAIL', `${t.file} JSON 깨짐`, e.message); continue; }

    const n = countItems(json);
    if (n === 0) { add(G, 'FAIL', `${t.file} 내용이 비어 있음`); continue; }

    const ageDays = (Date.now() - lastChangedMs(t.file)) / DAY;
    if (t.fresh && ageDays > t.fresh) {
      add(G, 'WARN', `${t.file} 갱신이 오래됨 (${ageDays.toFixed(1)}일 전)`, `기준 ${t.fresh}일 이내. 데이터 수집을 다시 돌려보세요.`);
    } else {
      add(G, 'OK', `${t.file} 정상 (항목 약 ${n}개)`);
    }
  }
}

// ---------------------------------------------------------------- 4. 연결 파일
function stripQuery(u) { return u.split('?')[0].split('#')[0]; }
function isLocalRef(u) {
  return u && !/^(https?:|\/\/|mailto:|tel:|data:|javascript:|#)/i.test(u);
}

function checkHtmlReferences(file) {
  const html = read(file);
  const baseDir = path.posix.dirname(file);
  const broken = [];
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const ref = m[1].trim();
    if (!isLocalRef(ref) || ref.includes('${')) continue; // JS 템플릿 조각은 제외
    const clean = stripQuery(ref);
    if (!clean) continue;
    const target = clean.startsWith('/')
      ? clean.slice(1)
      : path.posix.normalize(path.posix.join(baseDir, clean));
    // 폴더 링크("/")나 서버 API 경로(/api/...)는 건너뜀
    if (target === '' || target.startsWith('api/') || !path.extname(target)) continue;
    if (!exists(target)) broken.push(`${ref}`);
  }
  return [...new Set(broken)];
}

function checkLinks() {
  const G = '4. 연결 파일';
  const pages = ['index.html', 'guides.html', ...listFiles('posts', '.html')].filter(exists);
  let totalBad = 0;
  for (const p of pages) {
    const broken = checkHtmlReferences(p);
    // 글(posts)의 '/archive.html' 같은 루트 링크는 다른 사이트(블로그스팟 등)용일 수 있어 경고로만 표시
    const rootLinks = p.startsWith('posts/') ? broken.filter((b) => b.startsWith('/')) : [];
    const hard = broken.filter((b) => !rootLinks.includes(b));
    if (hard.length) {
      totalBad += hard.length;
      add(G, 'FAIL', `${p}: 없는 파일/페이지 링크 ${hard.length}개`, hard.join('\n'));
    }
    if (rootLinks.length) {
      totalBad += rootLinks.length;
      add(G, 'WARN', `${p}: 이 폴더에 없는 루트 링크 ${rootLinks.length}개`, rootLinks.map((r) => decodeURIComponent(r)).join('\n'));
    }
  }
  if (!totalBad) add(G, 'OK', `HTML ${pages.length}개의 내부 링크·스크립트·CSS 모두 연결됨`);
}

// ---------------------------------------------------------------- 5. 화면 부품(ID·버튼)
function allJsText() {
  const parts = listFiles('js', '.js').map(read);
  parts.push(read('index.html'));
  return parts.join('\n');
}

function checkUiWiring() {
  const G = '5. 화면 부품';
  if (!exists('index.html')) return;
  const html = read('index.html');

  // (a) ID 중복
  const ids = [...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  const dup = new Set();
  ids.forEach((id) => (seen.has(id) ? dup.add(id) : seen.add(id)));
  if (dup.size) add(G, 'WARN', `index.html에 같은 ID가 ${dup.size}개 중복`, [...dup].slice(0, 15).join(', '));
  else add(G, 'OK', `index.html ID ${ids.length}개 중복 없음`);

  // (b) onclick 함수가 실제로 정의돼 있는지
  const corpus = allJsText();
  const calls = new Set();
  for (const m of html.matchAll(/\bonclick\s*=\s*"([^"]*)"/g)) {
    for (const f of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) calls.add(f[1]);
  }
  const builtins = new Set(['if', 'return', 'alert', 'confirm', 'event', 'this', 'function', 'setTimeout', 'open', 'stopPropagation', 'preventDefault', 'click', 'focus', 'remove', 'add', 'toggle', 'querySelector', 'getElementById', 'closest', 'classList', 'scrollIntoView', 'scrollTo', 'back', 'reload', 'writeText']);
  const undefinedFns = [...calls].filter((fn) => {
    if (builtins.has(fn)) return false;
    const def = new RegExp(`(function\\s+${fn}\\b|window\\.${fn}\\s*=|\\b${fn}\\s*[:=]\\s*(async\\s*)?(function|\\())|(\\b(const|let|var)\\s+${fn}\\s*=)`);
    return !def.test(corpus);
  });
  if (undefinedFns.length) add(G, 'FAIL', `버튼이 부르는데 정의가 없는 함수 ${undefinedFns.length}개`, undefinedFns.join(', '));
  else add(G, 'OK', `버튼(onclick)이 부르는 함수 ${calls.size}종 모두 정의됨`);

  // (c) 기존 브라우저 검수봇이 찾는 ID들이 index.html에 있는지
  if (exists('js/blog_inspector.js')) {
    const insp = read('js/blog_inspector.js');
    const wanted = new Set();
    for (const m of insp.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) wanted.add(m[1]);
    for (const m of insp.matchAll(/querySelector(?:All)?\(\s*['"]#([\w-]+)/g)) wanted.add(m[1]);
    // 검수봇 화면(모달) 자신의 ID는 따로 보고
    const selfIds = [...wanted].filter((id) => id.startsWith('blog-inspector') || id === 'blogInspectorModal');
    const targetIds = [...wanted].filter((id) => !selfIds.includes(id));
    const idSet = new Set(ids);
    // 일부 요소는 JS가 나중에 만들어 넣으므로 JS 전체 텍스트에도 있으면 통과
    const missing = targetIds.filter((id) => !idSet.has(id) && !corpus.includes(`'${id}'`.replace(/^'|'$/g, '')) );
    if (missing.length) add(G, 'WARN', `브라우저 검수봇이 찾는 화면 요소 ${missing.length}개가 index.html에 없음`, missing.join(', '));
    else add(G, 'OK', `브라우저 검수봇이 찾는 화면 요소 ${targetIds.length}개 모두 확인`);

    const missingSelf = selfIds.filter((id) => !idSet.has(id));
    if (missingSelf.length) {
      add(G, 'WARN', '화면 속 검수봇 창(모달)이 index.html에 연결되어 있지 않음',
        `js/blog_inspector.js 는 로드되지만 ${missingSelf.join(', ')} 요소가 없어 버튼으로 열 수 없습니다. (이 검수봇은 터미널에서 실행하세요)`);
    }
  }
}

// ---------------------------------------------------------------- 6. 글(posts) 품질
function checkPosts() {
  const G = '6. 가이드 글';
  const pages = [...listFiles('posts', '.html'), 'guides.html'].filter(exists);
  const hashes = new Map();
  const problems = [];

  for (const p of pages) {
    const html = read(p);
    const issues = [];
    const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    if (!title || title.trim().length < 5) issues.push('<title> 없음/너무 짧음');
    else if (title.trim().length > 70) issues.push('<title> 너무 김(70자 초과)');
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || [])[1];
    if (!desc || desc.trim().length < 30) issues.push('meta description 없음/30자 미만');
    const h1 = (html.match(/<h1[\s>]/gi) || []).length;
    if (h1 !== 1) issues.push(`<h1>이 ${h1}개 (1개여야 함)`);
    if (!/<html[^>]+lang=/i.test(html)) issues.push('<html lang> 없음');
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (p.startsWith('posts/') && text.length < 1500) issues.push(`본문이 짧음(${text.length}자)`);
    if (/lorem ipsum|TODO|undefined|\[object Object\]|NaN/.test(text)) issues.push('미완성 문구(TODO/undefined 등) 발견');
    if (issues.length) problems.push(`${p}: ${issues.join(' / ')}`);

    const body = html.replace(/\s+/g, '');
    const h = crypto.createHash('md5').update(body).digest('hex');
    if (hashes.has(h)) hashes.get(h).push(p); else hashes.set(h, [p]);
  }

  if (problems.length) add(G, 'WARN', `글 ${problems.length}개에 보완할 점`, problems.join('\n'));
  else add(G, 'OK', `글 ${pages.length}개 SEO 기본기 양호`);

  const dups = [...hashes.values()].filter((v) => v.length > 1);
  if (dups.length) add(G, 'WARN', `내용이 완전히 같은 글 ${dups.length}묶음 (중복 콘텐츠 위험)`, dups.map((d) => d.join('  ==  ')).join('\n'));
  else add(G, 'OK', '완전히 같은 중복 글 없음');
}

// ---------------------------------------------------------------- 7. 블로그 테마 규칙
function checkBlogTheme() {
  const G = '7. 블로그 테마';
  // 주식센터 전용 고동색/베이지 (블로그 화면 금지)
  const banned = /#1a1412|#2a201c|#352924|#3e312b|#4a3b34|#d4a373/gi;
  const htmlFiles = ['index.html', 'guides.html', ...listFiles('posts', '.html')].filter(exists);
  const softFiles = ['css/style.css', 'css/components.css',
    ...listFiles('js', '.js').filter((f) => !/stock/i.test(f))].filter(exists);

  for (const f of htmlFiles) {
    const hits = read(f).match(banned);
    if (hits) add(G, 'FAIL', `${f}: 블로그 화면에 금지 색상 ${hits.length}곳`, [...new Set(hits)].join(', '));
  }
  for (const f of softFiles) {
    const hits = read(f).match(banned);
    if (hits) add(G, 'WARN', `${f}: 금지 색상 ${hits.length}곳 (주식센터 전용 영역인지 확인)`, [...new Set(hits)].join(', '));
  }
  if (!results.some((r) => r.group === G)) add(G, 'OK', '블로그 화면에 고동색/베이지(주식센터 전용) 색 없음');
}

// ---------------------------------------------------------------- 8. 보안(비밀키 및 토큰 노출 정밀 검사)
function checkSecrets() {
  const G = '8. 보안(키 노출)';
  // 프론트엔드 공개 파일뿐만 아니라 서버, 자동화 스크립트 등 git에 올라가는 모든 파일 검사
  const auditFiles = [
    'index.html', 'guides.html', 'server.js',
    ...listFiles('posts', '.html'),
    ...listFiles('js', '.js'),
    ...listFiles('css', '.css'),
    ...listFiles('scripts', '.js'),
    ...listFiles('scripts', '.ps1'),
    'trending_live.json', 'keyword_center_live.json', 'viral_shorts_live.json'
  ].filter(exists);

  const patterns = [
    { name: 'Google API 키 형태(AIza…)', re: /AIza[0-9A-Za-z_\-]{35}/ },
    { name: 'Gemini API 키 형태(AQ.…)', re: /AQ\.[A-Za-z0-9_\-]{30,}/ },
    { name: 'OpenAI/Anthropic 키 형태(sk-…)', re: /\bsk-[A-Za-z0-9_\-]{32,}/ },
    { name: '텔레그램 봇 토큰 형태', re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ }
  ];

  // .env.local 의 원문 및 Base64 인코딩 값까지 감지
  const secretEntries = [];
  if (exists('.env.local')) {
    for (const line of read('.env.local').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m) {
        const v = m[2].replace(/^["']|["']$/g, '');
        if (v.length >= 8) {
          secretEntries.push({ key: m[1], raw: v, b64: Buffer.from(v).toString('base64') });
        }
      }
    }
  }

  const found = [];
  for (const f of auditFiles) {
    const text = read(f);
    for (const p of patterns) {
      if (p.re.test(text)) found.push(`${f}: ${p.name}`);
    }
    for (const s of secretEntries) {
      if (text.includes(s.raw)) {
        found.push(`${f}: .env.local의 ${s.key} 평문 노출`);
      } else if (text.includes(s.b64)) {
        found.push(`${f}: .env.local의 ${s.key} Base64 변환값 노출`);
      }
    }
  }

  if (found.length) {
    add(G, 'FAIL', `비밀키 또는 토큰 노출 ${found.length}건 감지`, found.join('\n'));
  } else {
    add(G, 'OK', `소스 및 공개 파일 ${auditFiles.length}개에서 비밀키(평문/Base64) 노출 없음`);
  }

  // .gitignore 파일 보안 규칙 검증
  if (exists('.gitignore')) {
    const ig = read('.gitignore');
    const missingRules = [];
    if (!/\.env/.test(ig)) missingRules.push('.env / .env.local');
    if (!/telegram_config/.test(ig)) missingRules.push('telegram_config.json');

    if (missingRules.length > 0) {
      add(G, 'FAIL', `.gitignore 누락 항목: ${missingRules.join(', ')}`, '중요 설정 파일이 GitHub에 업로드될 위험이 있습니다.');
    } else {
      add(G, 'OK', '.env.local 및 telegram_config.json 모두 git 업로드 제외됨');
    }
  }
}

// ---------------------------------------------------------------- 보고서
function report() {
  const icon = { OK: '✅', WARN: '⚠️', FAIL: '❌' };
  const count = (l) => results.filter((r) => r.level === l).length;
  const ts = new Date().toLocaleString('ko-KR');
  const lines = [];

  console.log('====================================================');
  console.log(`[블로그 자동화 허브 검수봇] ${ts}`);
  console.log('====================================================');
  lines.push('# 블로그 자동화 허브 검수 보고서', '', `- 검사 시각: ${ts}`,
    `- 결과: ✅ ${count('OK')}  ⚠️ ${count('WARN')}  ❌ ${count('FAIL')}`, '');

  let lastGroup = '';
  for (const r of results) {
    if (r.group !== lastGroup) {
      console.log(`\n■ ${r.group}`);
      lines.push(`## ${r.group}`, '');
      lastGroup = r.group;
    }
    console.log(`  ${icon[r.level]} ${r.title}`);
    lines.push(`- ${icon[r.level]} ${r.title}`);
    if (r.detail) {
      r.detail.split('\n').forEach((d) => console.log(`       · ${d}`));
      lines.push('  ```', ...r.detail.split('\n').map((d) => '  ' + d), '  ```');
    }
    if (r.level !== 'OK' && lines[lines.length - 1] !== '') lines.push('');
  }

  console.log('\n----------------------------------------------------');
  const verdict = count('FAIL') ? '❌ 고쳐야 할 문제가 있습니다.'
    : count('WARN') ? '⚠️ 치명적 문제는 없지만 점검할 항목이 있습니다.'
      : '🎉 모든 항목 정상!';
  console.log(`✅ ${count('OK')}  ⚠️ ${count('WARN')}  ❌ ${count('FAIL')}   →  ${verdict}`);
  console.log('====================================================');
  lines.push('', `**종합: ${verdict}**`);

  try {
    fs.mkdirSync(abs('data'), { recursive: true });
    fs.writeFileSync(abs('data/blog_inspector_report.md'), lines.join('\n'), 'utf8');
    console.log('보고서 저장: data/blog_inspector_report.md');
  } catch (e) {
    console.warn('보고서 파일 저장 실패:', e.message);
  }
  return count('FAIL');
}

// ---------------------------------------------------------------- 실행
function safe(fn) {
  try { fn(); } catch (e) { add('검수봇 자체 오류', 'FAIL', `${fn.name} 실행 중 오류`, e.message); }
}

[checkRequiredFiles, checkJsSyntax, checkJsonData, checkLinks, checkUiWiring,
  checkPosts, checkBlogTheme, checkSecrets].forEach(safe);

process.exitCode = report() ? 1 : 0;
