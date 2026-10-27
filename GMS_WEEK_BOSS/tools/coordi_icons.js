/* 코디 시뮬레이터 목록 아이콘을 받은 층 데이터로 미리 그려 그림 묶음으로 만든다.
   목록 아이콘을 maplestory.io에서 받으면 처음 요청받는 아이템은 서버가 느려 비어 보여서 바꿨다(2026-10-24).

     node tools/coordi_icons.js        GMS_WEEK_BOSS/coordi/v270/icons.json, icons/*.png 저장

   - 목록: 헤어·성형 성별별, 코디 부위별, 피부. 목록 순서는 data_mixdye.js, data_coordi.js와 같다
     헤어·성형은 줄의 대표 ID로 찾고, 그림은 첫 색으로 그린다. 첫 색 데이터가 없으면 다음 색
   - 아이템 아이콘: 앞모습 첫 프레임 층만 기본 피부 몸의 연결점에 맞춰 그리고, 그림이 있는 부분만 잘라
     36×36 안에 들어가게 줄인다. 게임 공식 아이콘이 아니라 아이템 그림 자체라 모양이 다르다
   - 피부 아이콘: 그 피부의 맨몸 96×96에서 머리 부분 44×44
   - 칸 44×44, 그림 한 장에 20×20칸. 그림 파일 이름에 내용 해시를 붙여 오래 캐시해도 바뀐 그림을 받는다
   - avail: 줄마다 그릴 수 있는 색 비트. 헤어·성형은 색 순서, 코디·피부는 1비트.
     층 데이터가 없거나 그림이 1×1 빈 층뿐이면 0이고, 사이트는 그 색·아이템을 "데이터 없음"으로 막는다
   - empty: 아이콘을 못 그린 줄 번호. avail이 0인 줄과 같다 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { ROOT, loadSiteData } = require('./coordi_index');

const DEST = path.join(__dirname, '..', 'coordi', 'v270');
const CELL = 44, FIT = 36, GRID = 20, PER = GRID * GRID;
const ORIGIN = [54, 88];        // mixdye_layer.js MX_LAYER_ORIGIN.stand1
const BASE_SKIN = 12018;

const MIX = loadSiteData('data_mixdye.js').MIXDYE_DATA;
const COORDI = loadSiteData('data_coordi.js').COORDI_DATA;
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'rules.json'), 'utf8'));
const zi = new Map(rules.zmap.map((z, i) => [z, i]));
const skinOf = head => JSON.parse(fs.readFileSync(path.join(ROOT, 'skins', `${head}.json`), 'utf8'));

// 아이템 ID → 층 데이터. 남자 묶음까지 전부
const items = new Map();
for (const dir of fs.readdirSync(ROOT)) {
  if (dir === 'skins' || !fs.statSync(path.join(ROOT, dir)).isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.json'))) {
    for (const it of JSON.parse(fs.readFileSync(path.join(ROOT, dir, f), 'utf8')).items) items.set(it.i, it);
  }
}

const decoded = new Map();
async function decode(b64) {
  if (!decoded.has(b64)) {
    const { data, info } = await sharp(Buffer.from(b64, 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    decoded.set(b64, { w: info.width, h: info.height, d: data });
  }
  return decoded.get(b64);
}

// mixdye_layer.js _mxLayerCompose와 같은 방식으로 위치를 잇는다. body 층은 연결점만 쓰고 그리지 않을 수 있다
function layout(bodyLayers, itemLayers) {
  const all = [...bodyLayers.map(l => ({ l, body: true })), ...itemLayers.map(l => ({ l, body: false }))];
  const anchor = {}, placed = [];
  const place = (L, x, y) => {
    L.x = x; L.y = y;
    for (const [k, [mx, my]] of Object.entries(L.l[3])) if (!(k in anchor)) anchor[k] = [x + mx, y + my];
    placed.push(L);
  };
  const isBody = L => L.l[0] === 'body' || L.l[0] === 'backBody';
  let todo = all.filter(L => !isBody(L));
  all.filter(isBody).forEach(L => place(L, 0, 0));
  for (let guard = 0; todo.length && guard < 20; guard++) {
    todo = todo.filter(L => {
      const keys = Object.keys(L.l[3]);
      const k = keys.find(k => k in anchor);
      if (keys.length && !k) return true;
      if (!k) { place(L, 0, 0); return false; }
      place(L, anchor[k][0] - L.l[3][k][0], anchor[k][1] - L.l[3][k][1]);
      return false;
    });
  }
  return placed.sort((a, b) => (zi.has(a.l[0]) ? zi.get(a.l[0]) : -1) - (zi.has(b.l[0]) ? zi.get(b.l[0]) : -1));
}

// 층을 W×H RGBA에 source-over로 겹친다. 원점은 (ox, oy)
async function paint(layers, W, H, ox, oy) {
  const out = new Float64Array(W * H * 4);
  for (const L of layers) {
    const { w, h, d } = await decode(L.l[4]);
    const left = ox + L.x - L.l[1], top = oy + L.y - L.l[2];
    if (left >= W || top >= H || left + w <= 0 || top + h <= 0) continue;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = left + x, Y = top + y;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const s = (y * w + x) * 4, sa = d[s + 3] / 255;
      if (!sa) continue;
      const o = (Y * W + X) * 4, da = out[o + 3] / 255, oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) out[o + k] = (d[s + k] * sa + out[o + k] * da * (1 - sa)) / oa;
      out[o + 3] = oa * 255;
    }
  }
  return Buffer.from(Uint8ClampedArray.from(out, v => Math.round(v)));
}

const baseBody = skinOf(BASE_SKIN).f.stand1;
const visible = l => { const b = Buffer.from(l[4].slice(0, 40), 'base64'); return b.readUInt32BE(16) * b.readUInt32BE(20) > 1; };

// 후보 ID 중 그림이 있는 첫 아이템 → 44×44 RGBA, 그릴 게 없으면 null
async function itemIcon(ids) {
  let ls = null;
  for (const id of ids) {
    const it = items.get(id);
    ls = it && (it.f.stand1 || []).filter(visible);
    if (ls && ls.length) break;
  }
  if (!ls || !ls.length) return null;
  const placed = layout(baseBody, ls).filter(L => !L.body);
  // 층들이 차지하는 범위만큼만 그린다
  const rect = await Promise.all(placed.map(async L => { const { w, h } = await decode(L.l[4]); const x = L.x - L.l[1], y = L.y - L.l[2]; return [x, y, x + w, y + h]; }));
  const bx = Math.min(...rect.map(r => r[0])), by = Math.min(...rect.map(r => r[1]));
  const W = Math.max(...rect.map(r => r[2])) - bx, H = Math.max(...rect.map(r => r[3])) - by;
  const raw = await paint(placed, W, H, -bx, -by);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raw[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 < 0) return null;
  let img = sharp(raw, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w > FIT || h > FIT) img = sharp(await img.png().toBuffer()).resize({ width: FIT, height: FIT, fit: 'inside', kernel: 'lanczos3' });
  const icon = await img.png().toBuffer();
  const m = await sharp(icon).metadata();
  return sharp({ create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: icon, left: Math.floor((CELL - m.width) / 2), top: Math.floor((CELL - m.height) / 2) }]).raw().toBuffer();
}

async function skinIcon(head) {
  const placed = layout(skinOf(head).f.stand1, []);
  const raw = await paint(placed, 96, 96, ORIGIN[0], ORIGIN[1]);
  return sharp(raw, { raw: { width: 96, height: 96, channels: 4 } }).extract({ left: 26, top: 18, width: CELL, height: CELL }).raw().toBuffer();
}

const drawable = id => { const it = items.get(id); return !!(it && (it.f.stand1 || []).some(visible)); };
// 목록마다 [이름, 줄 ID들, 줄마다 그림 후보 ID들]. 헤어·성형 후보는 색 번호 순서, 없는 색은 null
const colorIds = (r, n, step) => { const out = []; for (let c = 0; c < n; c++) out.push(r[3] >> c & 1 ? r[0] + c * step : null); return out; };
const LISTS = [
  ['hair-f', MIX.hairs, r => colorIds(r, 8, 1)],
  ['hair-m', MIX.hairsM || [], r => colorIds(r, 8, 1)],
  ['face-f', MIX.faces, r => colorIds(r, 9, 100)],
  ['face-m', MIX.facesM || [], r => colorIds(r, 9, 100)],
  ...COORDI.parts.map(p => [`coordi-${p.key}`, COORDI.items[p.key], r => [r[0]]]),
  ['skin', MIX.skins, null],
].map(([name, rows, cand]) => [name, rows.map(r => r[0]), cand && rows.map(cand)]);

(async () => {
  fs.mkdirSync(path.join(DEST, 'icons'), { recursive: true });
  for (const f of fs.readdirSync(path.join(DEST, 'icons'))) fs.unlinkSync(path.join(DEST, 'icons', f));
  const out = { cell: CELL, fit: FIT, grid: GRID, lists: {} };
  for (const [name, ids, cand] of LISTS) {
    const empty = [], sheets = [];
    const avail = cand ? cand.map(cs => cs.reduce((m, id, c) => id !== null && drawable(id) ? m | 1 << c : m, 0)) : ids.map(() => 1);
    for (let s = 0; s * PER < ids.length; s++) {
      const comp = [];
      for (let k = s * PER; k < Math.min(ids.length, (s + 1) * PER); k++) {
        const cell = cand ? await itemIcon(cand[k].filter(id => id !== null)) : await skinIcon(ids[k]);
        if (!cell) { empty.push(k); continue; }
        const c = k - s * PER;
        comp.push({ input: cell, raw: { width: CELL, height: CELL, channels: 4 }, left: (c % GRID) * CELL, top: Math.floor(c / GRID) * CELL });
      }
      const png = await sharp({ create: { width: GRID * CELL, height: GRID * CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(comp).png({ compressionLevel: 9 }).toBuffer();
      const file = `${name}-${s}.${crypto.createHash('sha1').update(png).digest('hex').slice(0, 10)}.png`;
      fs.writeFileSync(path.join(DEST, 'icons', file), png);
      sheets.push(file);
    }
    out.lists[name] = { ids: ids.map((id, k) => k ? id - ids[k - 1] : id), avail, empty, sheets };
    console.log(`${name} · 아이콘 ${ids.length - empty.length}/${ids.length} · 데이터 없는 줄 ${avail.filter(m => !m).length} · 그림 ${sheets.length}장`);
  }
  fs.writeFileSync(path.join(DEST, 'icons.json'), JSON.stringify(out));
  const size = fs.readdirSync(path.join(DEST, 'icons')).reduce((s, f) => s + fs.statSync(path.join(DEST, 'icons', f)).size, 0);
  console.log(`icons.json ${Math.round(fs.statSync(path.join(DEST, 'icons.json')).size / 1024)}KB · 그림 합계 ${(size / 1048576).toFixed(1)}MB`);
})().catch(e => { console.error(e); process.exit(1); });
