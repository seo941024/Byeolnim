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

// worldID → 월드명 (NA/EU, best-effort, 모르면 fallback)
// 넥슨 공식 server-status API로 실측: Hyperion=70(NA), Solis=46(EU) — 기존 값과 뒤바뀌어 있었음
const WORLD_NAMES = {
  // NA 일반
  1:'Bera', 19:'Scania',
  // NA 리부트(Heroic)
  45:'Kronos', 70:'Hyperion',
  // EU
  30:'Luna', 46:'Solis',
};
function worldName(id){ return WORLD_NAMES[id] || ('World #' + id); }

const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2';

/* ── 캐릭터 랭킹 조회 (서버사이드 스크래핑/프록시) ── */
const HEROIC_WORLDS = new Set([45, 46, 70]);

async function lookupCharacter(name, reboot, region) {
  const reg = region === 'eu' ? 'eu' : 'na';
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  const lc = name.toLowerCase();

  // 1) overall 랭킹 — reboot 0/1 둘 다 시도
  const fetchOverall = (rb) =>
    fetch(`${NEXON_BASE}/${reg}?type=overall&id=weekly&reboot_index=${rb}&page_index=1&character_name=${encodeURIComponent(name)}`, { headers })
      .then(r => r.ok ? r.json() : null).catch(() => null);

  const [od0, od1] = await Promise.all([fetchOverall(0), fetchOverall(1)]);
  const findHit = (d) => d && d.ranks && d.ranks.find(c => (c.characterName||'').toLowerCase() === lc);
  let hit = findHit(od0) || findHit(od1);
  if (!hit) hit = (od0 && od0.ranks && od0.ranks[0]) || (od1 && od1.ranks && od1.ranks[0]);
  if (!hit) return null;

  const ri = HEROIC_WORLDS.has(hit.worldID) ? 1 : 0;

  // 2) legion / world / job 랭킹 병렬 조회
  let legionLevel = hit.legionLevel || 0;
  let legionPower = 0, legionRank = 0;
  let worldRank = 0, jobRankWorld = 0;
  const fetchRank = (type, rb) =>
    fetch(`${NEXON_BASE}/${reg}?type=${type}&id=weekly&reboot_index=${rb}&page_index=1&character_name=${encodeURIComponent(name)}`, { headers })
      .then(r => r.ok ? r.json() : null).catch(() => null);

  const [ld, wd, jd] = await Promise.all([
    fetchRank('legion', 0),
    fetchRank('world',  ri),
    fetchRank('job',    ri),
  ]);

  if (ld) {
    const lhit = (ld.ranks||[]).find(c => (c.characterName||'').toLowerCase() === lc);
    if (lhit) {
      legionLevel = lhit.legionLevel || lhit.legion_level || lhit.unionLevel || legionLevel;
      legionPower = lhit.legionPower || lhit.legionCombatPower || lhit.legion_power || lhit.unionPower || lhit.combatPower || 0;
      legionRank  = lhit.rank || lhit.legionRank || 0;
    }
  }
  if (wd) {
    const whit = (wd.ranks||[]).find(c => (c.characterName||'').toLowerCase() === lc);
    if (whit) worldRank = whit.rank || 0;
  }
  if (jd) {
    const jhit = (jd.ranks||[]).find(c => (c.characterName||'').toLowerCase() === lc);
    if (jhit) jobRankWorld = jhit.rank || 0;
  }

  return {
    name:         hit.characterName,
    level:        hit.level,
    exp:          hit.exp,
    job:          hit.jobName,
    world:        worldName(hit.worldID),
    worldID:      hit.worldID,
    rank:         hit.rank,
    worldRank,
    jobRankWorld,
    legion:       legionLevel,
    legionPower,
    legionRank,
    img:          hit.characterImgURL || '',
    reboot:       !!reboot,
    region:       region === 'eu' ? 'EU' : 'NA',
  };
}

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

/* Vercel 서버리스 핸들러(req.body / res.status().json())를 그대로 쓰기 위한 껍데기.
   api/*.js를 로컬에서 복붙 없이 재사용한다. */
async function runVercelHandler(handlerPath, req, res, body) {
  const handler = require(handlerPath);
  req.body = body;
  res.status = code => { res.statusCode = code; return res; };
  res.json = obj => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  await handler(req, res);
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);

  // ── API: /api/auth (회원가입/로그인/저장/불러오기) ──
  // Upstash 환경변수가 없는 로컬에서는 핸들러가 "저장소 미설정"을 그대로 돌려준다.
  if (u.pathname === '/api/auth') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const body = await readJsonBody(req);
    try {
      await runVercelHandler('./api/auth.js', req, res, body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'서버 오류: ' + e.message }));
    }
    return;
  }

  // ── API: /api/community (게시판 글/댓글/사진 업로드) ──
  // 사진 업로드(action:'upload')도 이 파일 안 action으로 들어와서(Vercel Hobby
  // 플랜의 서버리스 함수 12개 제한 때문에 합침) 8MB로 넉넉히 잡는다
  // (base64는 원본 5MB보다 약 1.37배 커진다).
  if (u.pathname === '/api/community') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const body = await readJsonBody(req, 8 * 1024 * 1024);
    try {
      await runVercelHandler('./api/community.js', req, res, body);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'서버 오류: ' + e.message }));
    }
    return;
  }

  // ── API: /api/lookup?name=...&reboot=0|1 ──
  if (u.pathname === '/api/lookup') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const name   = (u.searchParams.get('name') || '').trim();
    const reboot = u.searchParams.get('reboot') === '1';
    const region = (u.searchParams.get('region') || 'na').toLowerCase();
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok:false, error:'캐릭터명을 입력하세요.' }));
    }
    try {
      const info = await lookupCharacter(name, reboot, region);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (!info) return res.end(JSON.stringify({ ok:false, error:'캐릭터를 찾을 수 없습니다. (월드/리부트 구분 확인)' }));
      res.end(JSON.stringify({ ok:true, data:info }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'조회 실패: ' + e.message }));
    }
    return;
  }

  // ── API: /api/server-status?region=na|eu ──
  if (u.pathname === '/api/server-status') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const region = (u.searchParams.get('region') || 'na').toLowerCase() === 'eu' ? 'eu' : 'na';
    try {
      const r = await fetch(`https://www.nexon.com/api/maplestory/no-auth/v1/server-status/${region}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      const d = await r.json();
      const worlds = (d.servers || []).filter(w => w.worldId != null && w.LogDate).map(w => {
        const gameKeys = Object.keys(w).filter(k => /^Game\d+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
        const channelList = gameKeys
          .map(k => ({ n: Number(k.slice(4)) + 1, v: w[k] }))
          .filter(c => c.v !== null && c.v !== -1)
          .map(c => ({ n: c.n, up: c.v === 1 }));
        const onlineChannels = channelList.filter(c => c.up).length;
        const loginKeys = Object.keys(w).filter(k => /^Login\d+$/.test(k));
        const loginOnline = loginKeys.filter(k => w[k] === 1).length;
        return { worldId: w.worldId, world: w.worldName, up: channelList.length > 0 && onlineChannels > 0,
          channels: { online: onlineChannels, total: channelList.length },
          login: { online: loginOnline, total: loginKeys.length }, channelList, lastUpdate: w.LogDate || null };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:true, region, worlds }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'조회 실패: ' + e.message }));
    }
    return;
  }

  // ── API: /api/maintenance ──
  if (u.pathname === '/api/maintenance') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const r = await fetch('https://www.nexon.com/api/maplestory/no-auth/v1/maintenance/10100',
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      const d = await r.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:true, maintenance: !!d.maintenance }));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'조회 실패: ' + e.message }));
    }
    return;
  }

  // ── API: /api/img?url=... (넥슨 아바타 이미지 프록시, 캔버스 CORS 회피용) ──
  if (u.pathname === '/api/img') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const urlParam = u.searchParams.get('url');
    let target;
    try { target = urlParam && new URL(urlParam); } catch { target = null; }
    if (!target || !/^https?:$/.test(target.protocol) || !/(^|\.)nexon\.(net|com)$/i.test(target.hostname)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok:false, error:'host not allowed' }));
    }
    try {
      const r = await fetch(target.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) { res.writeHead(502); return res.end('upstream fetch failed'); }
      const buf = Buffer.from(await r.arrayBuffer());
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/png', 'Cache-Control': 'public, max-age=86400' });
      res.end(buf);
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok:false, error:'proxy failed: ' + e.message }));
    }
    return;
  }

  // ── 정적 파일 ──
  let url = u.pathname === '/' ? '/index.html' : u.pathname;
  const filePath = path.join(ROOT, decodeURIComponent(url));
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, () => console.log(`GMS_WEEK_BOSS server running at http://localhost:${PORT}`));
