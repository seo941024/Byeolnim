/* 코디 시뮬레이터가 받은 층 데이터로 캐릭터를 조립할 때 필요한 규칙·몸 그림을 받는다. 설계는 GMS_Calc/COORDI_DESIGN.md.

     node tools/coordi_rules.js        GMS_Calc/coordi_local/에 rules.json, skins/*.json, basic/000.json 저장
     node tools/coordi_rules.js --all  이미 받은 피부도 다시 만든다. 없으면 새 피부만

   - rules.json: zmap(층 앞뒤 순서), smap(층마다 차지하는 슬롯)
   - skins/{머리 ID}.json: 피부마다 몸(머리 ID - 10000)·머리의 앞모습·뒷모습 첫 프레임 층. 피부 목록은 data_mixdye.js
     smap과 몸·머리 층은 아이템 API에 없어서 maplestory.io의 WZ 경로(/api/wz/GMS/270/...)에서 노드를 하나씩 읽는다
   - basic/000.json: 기본 상하의 4종. 캐시 아이템이 아니라 coordi_collect.js 목록에 없어서 같은 형식으로 따로 받는다
   - 요청은 한 번에 하나, 사이에 0.3초 쉰다. 받은 노드는 coordi_local/.wz_cache.json에 남겨 다시 돌릴 때 요청하지 않는다.
     요청이 실패하면 아무것도 빼지 않고 받을 때까지 다시 요청한다 */

const fs = require('fs');
const path = require('path');
const { ROOT, UA, VIEWS, loadSiteData, toLayerItem } = require('./coordi_index');

const API = 'https://maplestory.io/api';
// 버전은 tools/coordi_update.js가 maplestory.io 최신 버전을 넘겨 준다
const VERSION = process.env.GMS_VERSION || '270';
const WZ = `${API}/wz/GMS/${VERSION}/`;
// 귀 모양은 렌더 기본값(showEars 등 false)과 같이 사람 귀(humanEar)만 쓴다
const SKIP_EARS = ['ear', 'lefEar', 'highlefEar'];
const BASIC = [1041046, 1061039, 1042162, 1062112];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CACHE_FILE = path.join(ROOT, '.wz_cache.json');
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
let unsaved = 0;
const saveCache = () => { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); unsaved = 0; };

async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) });
      if (r.status === 404) return null;
      if (r.ok) { await sleep(300); return r.json(); }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      console.log(`요청 오류 ${attempt + 1}번째 · ${e.message} · ${url.replace(API, '')}`);
      await sleep(Math.min(5000 * (attempt + 1), 60000));
    }
  }
}
// 캐시 키에 버전을 붙인다 — 경로만 쓰면 GMS 버전이 올라가도 옛 버전 노드(smap 등)를 계속 쓴다
async function wz(p) {
  const k = `${VERSION}/${p}`;
  if (!(k in cache)) {
    cache[k] = await getJson(WZ + p);
    if (++unsaved >= 25) saveCache();
  }
  return cache[k];
}

/* 층: [z 이름, 기준점 x, y, 붙는 자리 {이름: [x, y]}, PNG base64] — coordi_index.js toLayerItem이 만드는 아이템 층과 같은 형식.
   머리 층은 그림이 _Canvas 쪽에 있고 붙는 자리도 그쪽 노드에만 있어서 _outlink를 따라간다 */
async function frameLayers(img, view) {
  const base = `Character/${img}/${view}/0`;
  const f = await wz(base);
  if (!f) return [];
  const out = [];
  for (const name of f.children) {
    if (SKIP_EARS.includes(name)) continue;
    const n = await wz(`${base}/${name}`);
    if (!n || n.type !== 12) continue;   // 12: 그림 노드
    const o = (await wz(`${base}/${name}/origin`)).value;
    const z = (await wz(`${base}/${name}/z`)).value;
    let mp = `${base}/${name}/map`;
    if (n.children.includes('_outlink')) {
      const link = (await wz(`${base}/${name}/_outlink`)).value;
      mp = `Character/${link.split('_Canvas/')[1]}/map`;
    }
    const map = {};
    const m = await wz(mp);
    for (const k of (m && m.children) || []) {
      const v = (await wz(`${mp}/${k}`)).value;
      map[k] = [v.x, v.y];
    }
    out.push([z, o.x, o.y, map, n.value]);
  }
  return out;
}

(async () => {
  fs.mkdirSync(ROOT, { recursive: true });
  const sm = await wz('Base/smap.img');
  const smap = {};
  for (const k of sm.children) smap[k] = (await wz(`Base/smap.img/${encodeURIComponent(k)}`)).value;
  const zmap = await getJson(`${API}/GMS/${VERSION}/zmap`);

  const skins = loadSiteData('data_mixdye.js').MIXDYE_DATA.skins;
  fs.mkdirSync(path.join(ROOT, 'skins'), { recursive: true });
  const ALL = process.argv.includes('--all');
  for (const [head, name] of skins) {
    if (!ALL && fs.existsSync(path.join(ROOT, 'skins', `${head}.json`))) continue;
    const skin = [head - 10000, head], f = {};
    for (const view of VIEWS) {
      f[view] = [];
      for (const id of skin) f[view].push(...await frameLayers(String(id).padStart(8, '0') + '.img', view));
    }
    fs.writeFileSync(path.join(ROOT, 'skins', `${head}.json`), JSON.stringify({ skin, f }));
    console.log(`skins/${head}.json · ${name} · ${VIEWS.map(v => `${v} ${f[v].length}층`).join(', ')}`);
  }
  saveCache();
  // 사이트(mixdye_layer.js)는 zmap·smap만 읽는다. 피부 몸·머리는 skins/*.json에서 받는다
  fs.writeFileSync(path.join(ROOT, 'rules.json'), JSON.stringify({ version: VERSION, zmap, smap }));
  console.log(`rules.json · smap ${Object.keys(smap).length}개`);

  const items = [];
  for (const id of BASIC) items.push(toLayerItem(id, await getJson(`${API}/GMS/${VERSION}/item/${id}`)));
  fs.mkdirSync(path.join(ROOT, 'basic'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'basic', '000.json'), JSON.stringify({ part: 'basic', items }));
  console.log(`basic/000.json · ${items.map(x => x.n).join(', ')}`);
})().catch(e => { saveCache(); console.error(e); process.exit(1); });
