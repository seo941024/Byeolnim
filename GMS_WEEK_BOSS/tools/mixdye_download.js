/* 믹스염색 시뮬레이터용 헤어·성형 그림을 maplestory.io에서 받아 두는 스크립트.

     node tools/mixdye_download.js

   maplestory.io가 멈춰도 시뮬레이터를 쓸 수 있게 하려는 백업용이다.
   받은 그림은 배포 폴더 밖인 GMS_Calc/mixdye_raw/에 쌓이고 git에는 올라가지 않는다.

   조합을 미리 다 그릴 수는 없어서(헤어 × 성형 × 색) 부품별로 따로 받는다.
   - base: 대머리 기본 몸(피부만). 헤어·얼굴 층을 뽑을 때 비교 기준
   - hair: 얼굴 없이 헤어만 씌운 그림
   - face: 헤어 없이 얼굴만 씌운 그림. 뒷모습에선 얼굴이 안 보여서 앞모습만
   renderMode=1이면 모든 그림이 96×96에 발끝 위치까지 같아서, 기본 몸과 다른 픽셀만
   뽑으면 그대로 층으로 겹칠 수 있다.

   중간에 끊겨도 다시 돌리면 이미 받은 파일은 건너뛴다.
   서버 부담을 줄이려고 한 번에 하나씩, 요청 사이에 0.5~1초를 쉰다. */

const fs = require('fs');
const path = require('path');

const API = 'https://maplestory.io/api';
const VERSION = '270';
const SKIN = [2018, 12018];
const OUT = path.join(__dirname, '..', '..', 'mixdye_raw');
const UA = 'byeolnim-mixdye-downloader (+https://byeolnim.vercel.app)';

const RETRY_WAITS = [5, 15, 45, 120, 300];   // 초
const PAUSE_AFTER_FAILS = 20;                 // 연속 실패가 이만큼이면 서버가 멈춘 것으로 보고 쉰다
const PAUSE_SEC = 600;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = () => 500 + Math.random() * 500;

function renderUrl(itemIds, view) {
  const list = JSON.stringify(itemIds.map(id => ({ itemId: id, version: VERSION })));
  return `${API}/character/${encodeURIComponent(list.slice(1, -1))}/${view}/0?resize=1&renderMode=1`;
}

function loadList() {
  const window = {};
  new Function('window', fs.readFileSync(path.join(__dirname, '..', 'data_mixdye.js'), 'utf8'))(window);
  return window.MIXDYE_DATA;
}

function buildJobs(D) {
  const jobs = [];
  const add = (dir, name, items, view) => jobs.push({ file: path.join(OUT, dir, `${name}_${view}.png`), url: renderUrl(items, view) });
  for (const view of ['stand1', 'ladder']) add('base', 'base', SKIN, view);

  const hairIds = [], faceIds = [];
  for (const [s, , , mask] of D.hairs) for (let c = 0; c < 8; c++) if (mask >> c & 1) hairIds.push(s + c);
  for (const [s, , , mask] of D.faces) for (let c = 0; c < 9; c++) if (mask >> c & 1) faceIds.push(s + c * 100);

  // 앞모습을 먼저 다 받아 두면 중간에 멈춰도 앞모습 시뮬레이터는 바로 쓸 수 있다
  for (const id of hairIds) add('hair', id, [...SKIN, id], 'stand1');
  for (const id of faceIds) add('face', id, [...SKIN, id], 'stand1');
  for (const id of hairIds) add('hair', id, [...SKIN, id], 'ladder');
  return jobs;
}

async function fetchPng(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (r.status === 404) return { missing: true };
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (!(r.headers.get('content-type') || '').includes('image/png') || buf.length < 100) throw new Error('PNG 아님');
    return { buf };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  for (const dir of ['base', 'hair', 'face']) fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, '.gitignore'), '*\n');

  const jobs = buildJobs(loadList());
  const todo = jobs.filter(j => !(fs.existsSync(j.file) && fs.statSync(j.file).size > 0));
  const missing = [], failed = [];
  console.log(`전체 ${jobs.length}장 중 남은 ${todo.length}장`);

  const started = Date.now();
  let done = 0, fails = 0;
  for (const job of todo) {
    let ok = false;
    for (let attempt = 0; attempt <= RETRY_WAITS.length && !ok; attempt++) {
      try {
        const res = await fetchPng(job.url);
        if (res.missing) { missing.push(path.relative(OUT, job.file)); ok = true; break; }
        fs.writeFileSync(job.file + '.tmp', res.buf);
        fs.renameSync(job.file + '.tmp', job.file);
        ok = true;
        fails = 0;
      } catch (e) {
        fails++;
        if (fails >= PAUSE_AFTER_FAILS) {
          console.log(`연속 실패 ${fails}회 — 서버가 멈춘 것으로 보고 ${PAUSE_SEC / 60}분 쉼 (${e.message})`);
          await sleep(PAUSE_SEC * 1000);
          fails = 0;
        } else if (attempt < RETRY_WAITS.length) {
          await sleep(RETRY_WAITS[attempt] * 1000);
        }
      }
    }
    if (!ok) failed.push(path.relative(OUT, job.file));
    done++;
    if (done % 100 === 0 || done === todo.length) {
      const per = (Date.now() - started) / done;
      const left = Math.round(per * (todo.length - done) / 60000);
      console.log(`${done}/${todo.length} · 남은 시간 약 ${Math.floor(left / 60)}시간 ${left % 60}분 · 없음 ${missing.length} · 실패 ${failed.length}`);
      fs.writeFileSync(path.join(OUT, 'progress.json'), JSON.stringify({ total: jobs.length, done: jobs.length - todo.length + done, missing, failed, at: new Date().toISOString() }, null, 1));
    }
    await sleep(jitter());
  }
  console.log(`끝 · 없음 ${missing.length} · 실패 ${failed.length}${failed.length ? ' — 다시 돌리면 실패한 것만 다시 받는다' : ''}`);
})().catch(e => { console.error(e); process.exit(1); });
