/* 코디 시뮬레이터용 아이템 층 데이터를 maplestory.io에서 받아 Vercel Blob에 올리는 스크립트.
   GitHub Actions(.github/workflows/coordi-collect.yml)가 6시간마다 돌린다. 설계는 GMS_Calc/COORDI_DESIGN.md.

     BLOB_READ_WRITE_TOKEN=... node tools/coordi_collect.js     실제 수집·업로드
     node tools/coordi_collect.js --local                        업로드 없이 GMS_Calc/coordi_local/에 저장(git 제외)
     node tools/coordi_collect.js --local --limit 3              위와 같되 첫 묶음 표본 3개만

   - 아이템 데이터에는 모든 동작의 그림이 들어 있어 180~600KB나 된다. 앞모습(stand1)·뒷모습(ladder)
     첫 프레임의 층만 남겨 크기를 크게 줄인다
   - Hobby 요금제의 Blob 업로드 한도가 월 2,000건이라 아이템 100개를 파일 하나로 묶는다(약 300개)
   - 묶음 하나를 다 받을 때마다 올리고 진행 기록(manifest)도 갱신한다. 시간이 다 되면 진행 중인 묶음은
     버리고 멈춘다. 다음 실행은 manifest를 읽어 남은 묶음부터 이어 받는다
   - 한 번에 하나씩 받고, 요청마다 0.5~1초를 쉰다. 2026-10-22 동시 5개로 시험했을 때 2개부터
     요청 오류가 이어져서 1개로 고정했다. CONCURRENCY=3처럼 주면 그 수까지 올렸다 내렸다 한다.
     오류가 나면 시각·주소·오류 내용을 기록에 남긴다 */

const fs = require('fs');
const path = require('path');

const API = 'https://maplestory.io/api';
const VERSION = '270';
const PREFIX = `coordi/v${VERSION}`;
const CHUNK = 100;
const VIEWS = ['stand1', 'ladder'];
const SKIN = [2018, 12018];
const UA = 'byeolnim-coordi-collector (+https://byeolnim.vercel.app)';
const RETRY_WAITS = [5, 15, 45, 120, 300];

const args = process.argv.slice(2);
const DRY = args.includes('--local') || args.includes('--dry');
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0;
const TIME_BUDGET_MS = Number(process.env.TIME_BUDGET_MIN || 340) * 60000;   // Actions 6시간 제한보다 여유 있게
const started = Date.now();

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 동시 요청 수: 서버가 힘들어하면 줄이고, 괜찮으면 다시 올린다
const LADDER = [1, 2, 3, 5].filter(n => n <= Number(process.env.CONCURRENCY || 1));
let level = LADDER.length - 1, okStreak = 0;
const conc = () => LADDER[level];
function onTrouble(url, e, attempt) {
  okStreak = 0;
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  console.log(`[${t}] 요청 오류 ${attempt + 1}번째 · ${e.message} · ${url.replace(API, '')}`);
  if (level > 0) { level--; console.log(`요청 오류 — 동시 ${conc()}개로 줄임`); }
}
function onOk() {
  if (++okStreak >= 200 && level < LADDER.length - 1) { level++; okStreak = 0; console.log(`안정적 — 동시 ${conc()}개로 올림`); }
}
const jitter = () => 500 + Math.random() * 500;
const timeLeft = () => TIME_BUDGET_MS - (Date.now() - started);

// 1단계 부위. 무기는 자세가 달라 나중에
const PARTS = [
  { key: 'hat', sub: 'Hat' },
  { key: 'overall', sub: 'Overall' },
  { key: 'top', sub: 'Top' },
  { key: 'bottom', sub: 'Bottom' },
  { key: 'shoes', sub: 'Shoes' },
  { key: 'glove', sub: 'Glove' },
  { key: 'cape', sub: 'Cape' },
  { key: 'faceacc', sub: 'Face Accessory' },
  { key: 'eyeacc', sub: 'Eye Decoration' },
  { key: 'earrings', sub: 'Earrings' },
];

async function fetchRetry(url, as) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90000);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      if (r.status === 404) return null;
      if (!r.ok) {
        const ra = r.headers.get('retry-after');
        throw new Error(`HTTP ${r.status}${ra ? ` · 다시 시도 권장 ${ra}초 뒤` : ''}`);
      }
      onOk();
      return as === 'buf' ? Buffer.from(await r.arrayBuffer()) : await r.json();
    } catch (e) {
      onTrouble(url, e.name === 'AbortError' ? new Error('90초 동안 응답 없음') : e, attempt);
      if (attempt >= RETRY_WAITS.length) throw e;
      await sleep(RETRY_WAITS[attempt] * 1000);
    } finally {
      clearTimeout(timer);
    }
  }
}

/* ── 받을 아이템 목록 ── */
async function buildTargets() {
  const targets = [];   // { part, id }
  const window = {};
  new Function('window', fs.readFileSync(path.join(__dirname, '..', 'data_mixdye.js'), 'utf8'))(window);
  const D = window.MIXDYE_DATA;
  for (const [s, , , mask] of D.hairs) for (let c = 0; c < 8; c++) if (mask >> c & 1) targets.push({ part: 'hair', id: s + c });
  for (const [s, , , mask] of D.faces) for (let c = 0; c < 9; c++) if (mask >> c & 1) targets.push({ part: 'face', id: s + c * 100 });
  // 남자 헤어·성형은 따로 이름 붙인 묶음(hair_m, face_m)이라 이미 받은 여자 묶음 번호가 밀리지 않는다
  for (const [s, , , mask] of D.hairsM || []) for (let c = 0; c < 8; c++) if (mask >> c & 1) targets.push({ part: 'hair_m', id: s + c });
  for (const [s, , , mask] of D.facesM || []) for (let c = 0; c < 9; c++) if (mask >> c & 1) targets.push({ part: 'face_m', id: s + c * 100 });

  const list = await fetchRetry(`${API}/GMS/${VERSION}/item/?&overallCategoryFilter=Equip`);
  for (const P of PARTS) {
    const ids = list.filter(x => x.isCash && x.typeInfo && x.typeInfo.subCategory === P.sub).map(x => x.id).sort((a, b) => a - b);
    for (const id of ids) targets.push({ part: P.key, id });
  }
  return targets;
}

// 부위별로 CHUNK개씩 묶는다. 목록이 같으면 묶음 이름도 같아서 다음 실행에서 이어 받을 수 있다
function toChunks(targets) {
  const byPart = new Map();
  for (const t of targets) {
    if (!byPart.has(t.part)) byPart.set(t.part, []);
    byPart.get(t.part).push(t.id);
  }
  const chunks = [];
  for (const [part, ids] of byPart) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      chunks.push({ key: `${part}/${String(i / CHUNK).padStart(3, '0')}`, part, ids: ids.slice(i, i + CHUNK) });
    }
  }
  return chunks;
}

/* ── 아이템 하나를 층 데이터로 줄이기 ──
   층: [z 이름, 기준점 x, y, 붙는 자리 {이름: [x, y]}, PNG base64] */
async function getItem(id) {
  const d = await fetchRetry(`${API}/GMS/${VERSION}/item/${id}`);
  if (!d) return null;
  const fb = d.frameBooks || {};
  const out = { i: id, n: (d.description && d.description.name) || '', v: (d.metaInfo && d.metaInfo.vslots) || [], s: (d.metaInfo && d.metaInfo.islots) || [], f: {} };
  for (const view of VIEWS) {
    const book = fb[view] || fb.default;
    const frame = book && book.frames && book.frames[0];
    if (!frame || !frame.effects) continue;
    const ls = [];
    for (const v of Object.values(frame.effects)) {
      if (!v.position || !v.image) continue;
      const map = {};
      for (const [k, m] of Object.entries(v.mapOffset || {})) map[k] = [m.x, m.y];
      ls.push([v.position, v.origin.x, v.origin.y, map, v.image]);
    }
    if (ls.length) out.f[view] = ls;
  }
  return out;
}

/* ── 저장소: 실제는 Vercel Blob, --dry면 로컬 폴더 ── */
function makeStore() {
  if (DRY) {
    const root = process.env.COORDI_LOCAL_DIR || path.join(__dirname, '..', '..', 'coordi_local');
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, '.gitignore'), '*' + String.fromCharCode(10));
    return {
      async getManifest() { try { return JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')); } catch { return null; } },
      async put(name, body) { const p = path.join(root, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); },
    };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN이 없습니다');
  const { put, list } = require('@vercel/blob');
  return {
    async getManifest() {
      const { blobs } = await list({ prefix: `${PREFIX}/manifest.json`, limit: 1 });
      if (!blobs.length) return null;
      const r = await fetch(blobs[0].url + '?t=' + Date.now());
      return r.ok ? r.json() : null;
    },
    async put(name, body) {
      await put(`${PREFIX}/${name}`, body, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
    },
  };
}

(async () => {
  const store = makeStore();
  const chunks = toChunks(await buildTargets());
  const manifest = (await store.getManifest()) || { version: VERSION, chunk: CHUNK, done: {}, missing: [] };
  // 남자 헤어·성형은 처음 요청받는 아이템이 많아 서버 오류가 잦아서 맨 뒤에 받는다. 묶음 이름은 그대로
  const LAST = ['face_m', 'hair_m'];
  let todo = chunks.filter(c => !manifest.done[c.key]);
  todo = [...todo.filter(c => !LAST.includes(c.part)), ...todo.filter(c => LAST.includes(c.part))];
  console.log(`묶음 ${chunks.length}개 중 남은 ${todo.length}개${DRY ? ' (업로드 없이 시험)' : ''}`);
  if (LIMIT) todo = todo.slice(0, 1).map(c => ({ ...c, ids: c.ids.slice(0, LIMIT) }));

  // 첫 실행에는 기본 몸 그림(96×96)도 올린다 — 헤어·얼굴·모자 층은 이 그림 위 이마 기준점에 붙는다
  if (!manifest.base) {
    const base = {};
    for (const view of VIEWS) {
      const list = JSON.stringify(SKIN.map(id => ({ itemId: id, version: VERSION })));
      const buf = await fetchRetry(`${API}/character/${encodeURIComponent(list.slice(1, -1))}/${view}/0?resize=1&renderMode=1`, 'buf');
      base[view] = buf.toString('base64');
      await sleep(jitter());
    }
    await store.put('base.json', JSON.stringify({ skin: SKIN, brow: { stand1: [46, 36] }, base }));
    manifest.base = true;
  }

  for (const c of todo) {
    // 일꾼 5명이 묶음 안의 아이템을 나눠 받는다. 동시 개수가 줄면 번호가 큰 일꾼부터 쉰다
    const got = new Array(c.ids.length);
    let next = 0, outOfTime = false;
    const worker = async w => {
      while (next < c.ids.length && !outOfTime) {
        if (w >= conc()) { await sleep(5000); continue; }
        if (timeLeft() < 3 * 60000) { outOfTime = true; break; }
        const k = next++, id = c.ids[k];
        try {
          got[k] = await getItem(id);
          if (!got[k]) manifest.missing.push(id);
        } catch (e) {
          console.log(`${id} 실패 (${e.message}) — 이번 묶음에서는 빼고 진행`);
          manifest.missing.push(id);
        }
        await sleep(jitter());
      }
    };
    await Promise.all(LADDER.slice(-1).flatMap(n => Array.from({ length: n }, (_, w) => worker(w))));
    if (outOfTime) {
      await store.put('manifest.json', JSON.stringify(manifest));
      console.log(`시간이 다 돼서 멈춤 · 완료 묶음 ${Object.keys(manifest.done).length}/${chunks.length} · 진행 중이던 ${c.key}는 다음에 처음부터`);
      return;
    }
    const items = got.filter(Boolean);
    const body = JSON.stringify({ part: c.part, items });
    await store.put(`${c.key}.json`, body);
    if (!LIMIT) manifest.done[c.key] = { n: items.length, bytes: body.length };
    await store.put('manifest.json', JSON.stringify(manifest));
    const min = Math.round((Date.now() - started) / 60000);
    console.log(`${c.key} 완료 · 아이템 ${items.length}개 · ${Math.round(body.length / 1024)}KB · 누적 ${Object.keys(manifest.done).length}/${chunks.length} · ${min}분 경과`);
  }
  console.log('끝 — 남은 묶음 없음');
})().catch(e => { console.error(e); process.exit(1); });
