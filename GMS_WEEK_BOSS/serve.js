const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ttf':  'font/ttf',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

/* 요청 본문을 전부 모아 JSON으로. 실패하면 null.
   maxBytes를 받는 이유: 사진 업로드(base64)는 auth.js류보다 훨씬 커서
   기본 1MB로는 잘린다. */
function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > maxBytes) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

/* Vercel 서버리스 핸들러(req.query / req.body / res.status().json() / res.send())를
   그대로 쓰기 위한 껍데기. api/*.js를 로컬에서 복붙 없이 재사용한다. */
async function runVercelHandler(handlerPath, req, res, body) {
  const handler = require(handlerPath);
  req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
  req.body = body;
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = data => { res.end(data); return res; };
  await handler(req, res);
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  // ── API: /api/<이름> → api/<이름>.js를 Vercel과 똑같이 실행한다 ──
  // 배포와 같은 파일을 쓰므로 로컬 동작도 같다. _lib.js는 이름 규칙에 걸리지 않아 열리지 않는다.
  // Upstash 환경변수가 없는 로컬에서는 저장소를 쓰는 핸들러가 "저장소 미설정"을 그대로 돌려준다.
  const api = /^\/api\/([a-z-]+)$/.exec(u.pathname);
  if (api && fs.existsSync(path.join(ROOT, 'api', api[1] + '.js'))) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 사진 업로드(action:'upload')도 community 안 action으로 들어와서(Vercel Hobby
    // 플랜의 서버리스 함수 12개 제한 때문에 합침) 8MB로 넉넉히 잡는다
    // (base64는 원본 3MB보다 약 1.37배 커진다).
    const body = req.method === 'GET' || req.method === 'HEAD' ? null
      : await readJsonBody(req, api[1] === 'community' ? 8 * 1024 * 1024 : 1024 * 1024);
    try {
      await runVercelHandler(`./api/${api[1]}.js`, req, res, body);
    } catch (e) {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'서버 오류: ' + e.message }));
    }
    return;
  }

  // ── 정적 파일 ──
  // %2f·%5c는 URL 정규화를 지난 뒤에야 /·\로 풀리므로, 풀고 나서 ROOT 밖이면 막는다
  let url = u.pathname === '/' ? '/index.html' : u.pathname;
  let rel;
  try { rel = decodeURIComponent(url); } catch { res.writeHead(400); res.end('Bad request'); return; }
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log(`GMS_WEEK_BOSS server running at http://localhost:${PORT}`));
