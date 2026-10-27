/* 얼굴을 지우는 아이템 찾기. 얼굴장식·눈장식·모자 중 게임 원본 info에 invisibleFace가 있는 아이템을 모은다.
   이런 아이템을 쓰면 게임은 성형 그림을 그리지 않고 아이템 그림만 얼굴에 보여 준다.
   maplestory.io 아이템 정보(api/GMS/.../item/ID)에는 이 값이 빠져 있어서 원본 WZ 경로를 하나씩 읽는다.

     node tools/coordi_invisible_face.js          검사해서 coordi/invisible_face_v270.json 저장

   - 대상 ID는 사이트 폴더 coordi/v270/의 faceacc·eyeacc·hat 묶음에서 읽는다. 시뮬레이터에서 입을 수 있는 것만 본다
   - 한 번에 하나씩 받고 요청마다 0.3~0.6초 쉰다. info 한 칸만 읽는 가벼운 요청이다
   - 다 본 ID는 GMS_Calc/coordi_local/invisible_face_progress.json에 적어 두어, 멈췄다 다시 돌리면 이어서 본다
   - info 아래 이름이 invisible로 시작하는 값은 모두 세어 끝에 보여 준다. 사이트에는 invisibleFace만 쓴다 */

const fs = require('fs');
const path = require('path');
const { ROOT, UA } = require('./coordi_index');

const VERSION = process.env.GMS_VERSION || '270';
const SITE = path.join(__dirname, '..', 'coordi', `v${VERSION}`);
const OUT = path.join(__dirname, '..', 'coordi', `invisible_face_v${VERSION}.json`);
const PROGRESS = path.join(ROOT, 'invisible_face_progress.json');
const WZ = `https://maplestory.io/api/wz/GMS/${VERSION}/Character`;
// 사이트 부위 → WZ 폴더. 얼굴장식·눈장식은 둘 다 Accessory 안에 있다
const PARTS = { faceacc: 'Accessory', eyeacc: 'Accessory', hat: 'Cap' };
const RETRY_WAITS = [5, 15, 45, 120, 300];
const TIMEOUT_MS = 30000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = () => 300 + Math.random() * 300;

// 404는 그 경로에 값이 없다는 뜻이라 null로 돌려준다. 그 밖의 오류는 받을 때까지 다시 요청한다
async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      const wait = RETRY_WAITS[Math.min(attempt, RETRY_WAITS.length - 1)];
      console.log(`요청 오류 ${attempt + 1}번째 · ${e.message} · ${url.replace(WZ, '')} · ${wait}초 뒤 다시`);
      await sleep(wait * 1000);
    }
  }
}

function siteIds(part) {
  const dir = path.join(SITE, part);
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()
    .flatMap(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items.map(it => it.i));
}

async function main() {
  // done: ID → info 아래 invisible 값들 {이름: 값}. info가 없던 ID는 null
  const done = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : {};
  const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(done));
  const todo = Object.entries(PARTS).flatMap(([part, folder]) => siteIds(part).map(id => ({ part, folder, id })));
  const left = todo.filter(t => !(t.id in done));
  console.log(`대상 ${todo.length}개 · 이미 본 것 ${todo.length - left.length}개 · 남은 것 ${left.length}개`);

  let n = 0;
  for (const t of left) {
    const base = `${WZ}/${t.folder}/0${t.id}.img/info`;
    const info = await getJson(base);
    if (!info) done[t.id] = null;
    else {
      const found = {};
      for (const k of (info.children || []).filter(k => /^invisible/i.test(k))) {
        const v = await getJson(`${base}/${k}`);
        found[k] = v ? v.value : null;
        await sleep(jitter());
      }
      done[t.id] = found;
      if (Object.keys(found).length) console.log(`${t.part} ${t.id} ${JSON.stringify(found)}`);
    }
    if (++n % 50 === 0) { save(); console.log(`${n} / ${left.length}`); }
    await sleep(jitter());
  }
  save();

  // 값이 0이 아닌 invisibleFace만 사이트에 쓴다
  const ids = todo.filter(t => done[t.id] && Number(done[t.id].invisibleFace)).map(t => t.id).sort((a, b) => a - b);
  const missing = todo.filter(t => done[t.id] === null).map(t => t.id);
  const byPart = {}, keys = {};
  for (const t of todo) {
    if (ids.includes(t.id)) byPart[t.part] = (byPart[t.part] || 0) + 1;
    for (const k of Object.keys(done[t.id] || {})) keys[k] = (keys[k] || 0) + 1;
  }
  fs.writeFileSync(OUT, JSON.stringify({ ver: VERSION, ids }) + '\n');
  console.log(`invisibleFace ${ids.length}개 ${JSON.stringify(byPart)} → ${path.relative(path.join(__dirname, '..'), OUT)}`);
  console.log(`info 아래 invisible 값 종류 ${JSON.stringify(keys)}`);
  if (missing.length) console.log(`info를 찾지 못한 ID ${missing.length}개: ${missing.join(' ')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
