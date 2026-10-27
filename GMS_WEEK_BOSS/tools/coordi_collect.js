/* 코디 시뮬레이터용 아이템 층 데이터를 maplestory.io에서 받는 스크립트. 설계는 GMS_Calc/COORDI_DESIGN.md.
   지금은 PC에서 --local로 GMS_Calc/coordi_local/에 받고, tools/coordi_publish.js가 사이트 폴더
   coordi/v270/으로 옮긴다. 사이트는 Vercel Blob을 읽지 않는다.

     node tools/coordi_collect.js --local                        GMS_Calc/coordi_local/에 저장(git 제외)
     node tools/coordi_collect.js --local --limit 3              위와 같되 첫 묶음 표본 3개만
     node tools/coordi_collect.js --local --new                  coordi_local에 없는 새 아이템만 받아 새 묶음 번호로 붙인다
                                                                 4주 캐시템 업데이트용. tools/coordi_update.js가 부른다
     BLOB_READ_WRITE_TOKEN=... node tools/coordi_collect.js     Vercel Blob에 올린다. 수동 실행용
                                                                 .github/workflows/coordi-collect.yml만 이 경로를 쓴다

   - 아이템 데이터에는 모든 동작의 그림이 들어 있어 180~600KB나 된다. 앞모습(stand1)·뒷모습(ladder)
     첫 프레임의 층만 남겨 크기를 크게 줄인다
   - 아이템 100개를 파일 하나로 묶는다. Blob 시절 Hobby 요금제 업로드 한도 월 2,000건 때문에 정한 크기
   - 묶음 하나를 다 받을 때마다 저장하고 진행 기록(manifest)도 갱신한다. 시간이 다 되면 진행 중인 묶음은
     버리고 멈춘다. 다음 실행은 manifest를 읽어 남은 묶음부터 이어 받는다
   - 한 번에 하나씩 받고, 요청마다 0.5~1초를 쉰다. 2026-10-22 동시 5개로 시험했을 때 2개부터
     요청 오류가 이어져서 1개로 고정했다. CONCURRENCY=3처럼 주면 그 수까지 올렸다 내렸다 한다.
     오류가 나면 시각·주소·오류 내용을 기록에 남긴다 */

const fs = require('fs');
const path = require('path');
const { ROOT, UA, loadSiteData, toLayerItem } = require('./coordi_index');

const API = 'https://maplestory.io/api';
// 버전은 tools/coordi_update.js가 maplestory.io 최신 버전을 넘겨 준다
const VERSION = process.env.GMS_VERSION || '270';
const PREFIX = `coordi/v${VERSION}`;
const CHUNK = 100;
// 실패해도 아이템을 건너뛰지 않고 받을 때까지 다시 요청한다. 다시 요청하기 전 쉬는 시간은 마지막 값을 계속 쓴다
const RETRY_WAITS = [5, 15, 45, 120, 300];
// 응답 대기. 90초였는데 2026-10-23 남자 성형에서 무응답이 이어져 지수 결정으로 첫 대기를 10초로 줄였다.
// 처음 요청받는 아이템은 서버가 그림을 만드느라 10초 넘게 걸릴 수 있어(측정 최대 61초) 다시 요청할수록 길게 기다린다
const RESPONSE_TIMEOUTS_SEC = [10, 10, 30, 60, 90];

const args = process.argv.slice(2);
const DRY = args.includes('--local') || args.includes('--dry');
const NEW = args.includes('--new');
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

async function fetchRetry(url) {
  const at = (list, k) => list[Math.min(k, list.length - 1)];
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const wait = at(RESPONSE_TIMEOUTS_SEC, attempt);
    const timer = setTimeout(() => ctrl.abort(), wait * 1000);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
      if (r.status === 404) return null;
      if (!r.ok) {
        const ra = r.headers.get('retry-after');
        throw new Error(`HTTP ${r.status}${ra ? ` · 다시 시도 권장 ${ra}초 뒤` : ''}`);
      }
      onOk();
      return await r.json();
    } catch (e) {
      onTrouble(url, e.name === 'AbortError' ? new Error(`${wait}초 동안 응답 없음`) : e, attempt);
      await sleep(at(RETRY_WAITS, attempt) * 1000);
    } finally {
      clearTimeout(timer);
    }
  }
}

/* ── 받을 아이템 목록 ── */
async function buildTargets() {
  const targets = [];   // { part, id }
  const D = loadSiteData('data_mixdye.js').MIXDYE_DATA;
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

// 부위별로 CHUNK개씩 묶는다. 목록이 같으면 묶음 이름도 같아서 다음 실행에서 이어 받을 수 있다.
// start: 부위별 첫 묶음 번호. --new에서는 이미 있는 묶음 다음 번호부터
function toChunks(targets, start = {}) {
  const byPart = new Map();
  for (const t of targets) {
    if (!byPart.has(t.part)) byPart.set(t.part, []);
    byPart.get(t.part).push(t.id);
  }
  const chunks = [];
  for (const [part, ids] of byPart) {
    for (let i = 0; i < ids.length; i += CHUNK) {
      chunks.push({ key: `${part}/${String((start[part] || 0) + i / CHUNK).padStart(3, '0')}`, part, ids: ids.slice(i, i + CHUNK) });
    }
  }
  return chunks;
}

/* ── 아이템 하나를 층 데이터로 줄이기. 404면 null ── */
async function getItem(id) {
  const d = await fetchRetry(`${API}/GMS/${VERSION}/item/${id}`);
  return d ? toLayerItem(id, d) : null;
}

/* ── 저장소: --local·--dry면 로컬 폴더, 아니면 Vercel Blob ── */
function makeStore() {
  if (DRY) {
    fs.mkdirSync(ROOT, { recursive: true });
    fs.writeFileSync(path.join(ROOT, '.gitignore'), '*\n');
    return {
      async getManifest() { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); } catch { return null; } },
      async put(name, body) { const p = path.join(ROOT, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); },
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
  let targets = await buildTargets(), start = {};
  if (NEW) {
    // 이미 받은 아이템은 빼고, 부위마다 마지막 묶음 다음 번호부터 새 묶음을 만든다
    if (!DRY) throw new Error('--new는 --local과 같이 쓴다');
    const have = new Set();
    for (const part of fs.readdirSync(ROOT)) {
      const dir = path.join(ROOT, part);
      if (part === 'skins' || part === 'basic' || !fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        start[part] = Math.max(start[part] || 0, Number(f.slice(0, -5)) + 1);
        for (const it of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items) have.add(it.i);
      }
    }
    const before = targets.length;
    targets = targets.filter(t => !have.has(t.id));
    console.log(`새 아이템 ${targets.length}개 · 이미 받은 ${before - targets.length}개는 건너뜀`);
  }
  const chunks = toChunks(targets, start);
  const manifest = (await store.getManifest()) || { version: VERSION, chunk: CHUNK, done: {}, missing: [] };
  // 남자 헤어·성형은 처음 요청받는 아이템이 많아 서버 오류가 잦아서 맨 뒤에 받는다. 묶음 이름은 그대로
  const LAST = ['face_m', 'hair_m'];
  let todo = chunks.filter(c => !manifest.done[c.key]);
  todo = [...todo.filter(c => !LAST.includes(c.part)), ...todo.filter(c => LAST.includes(c.part))];
  console.log(`묶음 ${chunks.length}개 중 남은 ${todo.length}개${DRY ? ' · 로컬 저장' : ''}`);
  if (LIMIT) todo = todo.slice(0, 1).map(c => ({ ...c, ids: c.ids.slice(0, LIMIT) }));

  for (const c of todo) {
    // 최대 동시 수만큼 일꾼을 띄워 묶음 안의 아이템을 나눠 받는다. 동시 개수가 줄면 번호가 큰 일꾼부터 쉰다
    const got = new Array(c.ids.length);
    let next = 0, outOfTime = false;
    const worker = async w => {
      while (next < c.ids.length && !outOfTime) {
        if (w >= conc()) { await sleep(5000); continue; }
        if (timeLeft() < 3 * 60000) { outOfTime = true; break; }
        const k = next++, id = c.ids[k];
        // 요청 실패는 fetchRetry가 받을 때까지 다시 시도한다. 그 밖의 오류는 아이템을 빼지 않고 수집을 멈춘다
        try {
          got[k] = await getItem(id);
        } catch (e) {
          console.log(`${id} 처리 오류 (${e.message}) — 아이템을 빼지 않으려고 수집을 멈춤. ${c.key}는 다음에 처음부터`);
          throw e;
        }
        if (!got[k] && !manifest.missing.includes(id)) manifest.missing.push(id);   // 404: maplestory.io에 데이터가 없는 아이템
        await sleep(jitter());
      }
    };
    await Promise.all(Array.from({ length: LADDER[LADDER.length - 1] }, (_, w) => worker(w)));
    if (outOfTime) {
      await store.put('manifest.json', JSON.stringify(manifest));
      console.log(`시간이 다 돼서 멈춤 · 완료 묶음 ${Object.keys(manifest.done).length}/${chunks.length} · 진행 중이던 ${c.key}는 다음에 처음부터`);
      return;
    }
    const items = got.filter(Boolean);
    // 전부 404면 빈 묶음 파일을 만들지 않는다. --new에서 다음에 다시 시도한다
    if (!items.length) { await store.put('manifest.json', JSON.stringify(manifest)); console.log(`${c.key} · 받은 아이템 없음, 404 ${c.ids.length}개`); continue; }
    const body = JSON.stringify({ part: c.part, items });
    await store.put(`${c.key}.json`, body);
    if (!LIMIT) manifest.done[c.key] = { n: items.length, bytes: body.length };
    await store.put('manifest.json', JSON.stringify(manifest));
    const min = Math.round((Date.now() - started) / 60000);
    console.log(`${c.key} 완료 · 아이템 ${items.length}개 · ${Math.round(body.length / 1024)}KB · 누적 ${Object.keys(manifest.done).length}/${chunks.length} · ${min}분 경과`);
  }
  console.log('끝 — 남은 묶음 없음');
})().catch(e => { console.error(e); process.exit(1); });
