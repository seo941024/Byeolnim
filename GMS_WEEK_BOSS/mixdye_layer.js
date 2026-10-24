/* ═══════════════════════════════════════════════
   코디 시뮬레이터 — 받은 층 데이터로 캐릭터 조립. 설계는 GMS_Calc/COORDI_DESIGN.md.
   mixdye.js가 maplestory.io 렌더 대신 이 조립 결과를 쓴다. 같은 96×96 크기·같은 자리라 섞는 방식은 그대로다.

   데이터: tools/coordi_collect.js(아이템 층 묶음), tools/coordi_rules.js(rules.json, 피부별 몸·머리, 기본 상하의),
   tools/coordi_index.js(index.json). tools/coordi_publish.js가 GMS_Calc/coordi_local/에서 이 저장소의
   coordi/v270/으로 옮겨 정적 파일로 배포한다.

   규칙은 maplestory.io 렌더와 픽셀 비교로 맞췄다(2026-10-23, 무작위 코디 14조합 앞뒤 + 개별 표본):
   - 층 앞뒤 순서는 zmap, 위치는 몸 배꼽에서 시작해 층마다 붙는 자리(navel·neck·brow·hand)를 따라 잇는다
   - 가림: 층의 smap 슬롯 중 자기 아이템이 차지한 슬롯을 다른 아이템이 가져가면 그 층을 숨긴다.
     같은 슬롯을 여러 아이템이 차지하면 목록에서 나중 아이템이 가진다(렌더도 요청 순서를 따른다)
   - 뒷모습에서는 얼굴과 일부 얼굴·눈 장식 층을 숨긴다(MX_LAYER_LADDER_HIDE)
   - 차이 나는 곳: 아이템 효과(날개·따라다니는 동물 등)는 수집하지 않아 그리지 못한다.
     효과만 있는 아이템은 렌더를 쓴다(_mxLayerUsable)
   ═══════════════════════════════════════════════════════════ */

// 같은 사이트의 정적 파일. 2026-10-24 Vercel Blob에서 옮김 — 업로드 단계 없이 커밋만으로 배포되고,
// 캐시 기간은 vercel.json에서 정한다
const MX_LAYER_BASE = 'coordi/v270/';
// maplestory.io 96×96 렌더에서 몸 기준점(배꼽 기준 원점)이 놓이는 자리 — 렌더와 픽셀 비교로 확인
const MX_LAYER_ORIGIN = { stand1: [54, 88], ladder: [49, 100] };
const MX_LAYER_SIZE = 96;
const MX_LAYER_LADDER_HIDE = ['face', 'accessoryEye', 'accessoryEyeBelowFace', 'accessoryFaceBelowFace'];

let _mxLayer = null;          // { rules, zi, where: 아이템 ID → 묶음 이름 }, 쓸 수 없으면 false
let _mxLayerInitP = null;
const _mxLayerChunks = new Map();   // 묶음 이름 → Promise<Map(ID → 아이템)>
const _mxLayerSkins = new Map();    // 피부 머리 ID → Promise<{ skin, f: 동작별 몸·머리 층 }>
const _mxLayerImgs = new WeakMap(); // 층 → Promise<Image>

function _mxLayerInit() {
  if (!_mxLayerInitP && !MX_LAYER_BASE) { _mxLayer = false; _mxLayerInitP = Promise.resolve(); }
  if (!_mxLayerInitP) {
    const get = name => fetch(MX_LAYER_BASE + name).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    _mxLayerInitP = Promise.all([get('index.json'), get('rules.json')]).then(([index, rules]) => {
      const where = new Map();
      for (const [key, deltas] of Object.entries(index)) {
        let id = 0;
        for (const d of deltas) { id += d; where.set(id, key); }
      }
      const zi = new Map(rules.zmap.map((z, i) => [z, i]));
      _mxLayer = { rules, zi, where };
    }).catch(() => { _mxLayer = false; });
  }
  return _mxLayerInitP;
}

function _mxLayerChunk(key) {
  if (!_mxLayerChunks.has(key)) {
    _mxLayerChunks.set(key, fetch(`${MX_LAYER_BASE}${key}.json`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => new Map(d.items.map(it => [it.i, it])))
      .catch(e => { _mxLayerChunks.delete(key); throw e; }));
  }
  return _mxLayerChunks.get(key);
}

function _mxLayerSkin(head) {
  if (!_mxLayerSkins.has(head)) {
    _mxLayerSkins.set(head, fetch(`${MX_LAYER_BASE}skins/${head}.json`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(e => { _mxLayerSkins.delete(head); throw e; }));
  }
  return _mxLayerSkins.get(head);
}

async function _mxLayerItem(id) {
  const key = _mxLayer && _mxLayer.where.get(id);
  if (!key) throw new Error(`층 데이터 없음 ${id}`);
  const it = (await _mxLayerChunk(key)).get(id);
  if (!it) throw new Error(`층 데이터 없음 ${id}`);
  return it;
}

// PNG 머리말에서 크기만 읽는다. 효과만 있는 아이템은 1×1 빈 그림 층만 들고 있다
const _mxLayerDim = b64 => {
  const s = atob(b64.slice(0, 32));
  const u = k => ((s.charCodeAt(k) << 24) | (s.charCodeAt(k + 1) << 16) | (s.charCodeAt(k + 2) << 8) | s.charCodeAt(k + 3)) >>> 0;
  return [u(16), u(20)];
};
const _mxLayerVisible = (it, view) => (it.f[view] || []).some(l => { const [w, h] = _mxLayerDim(l[4]); return w * h > 1; });

/* 이번 그림을 받은 데이터로 그릴 수 있는지. 하나라도 안 되면 그 장면은 전부 렌더로 그린다 —
   A·B·C 그림의 다른 픽셀을 섞는 방식이라 한 장면 안에서 그리는 방법이 섞이면 안 된다
   - 남자 캐릭터는 렌더를 쓴다
   - 몸 그림은 data_mixdye.js 피부 목록의 피부마다 받았다(skins/{머리 ID}.json) */
async function _mxLayerUsable(ids, view) {
  if (_mxState.g === 'm') return false;
  await _mxLayerInit();
  if (!_mxLayer || ids.some(id => !_mxLayer.where.has(id))) return false;
  try {
    const [items] = await Promise.all([Promise.all(ids.map(_mxLayerItem)), _mxLayerSkin(_mxSkin().id)]);
    return items.every(it => _mxLayerVisible(it, view));
  } catch (e) { return false; }
}

function _mxLayerImg(layer) {
  if (!_mxLayerImgs.has(layer)) {
    _mxLayerImgs.set(layer, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('층 그림'));
      img.src = 'data:image/png;base64,' + layer[4];
    }));
  }
  return _mxLayerImgs.get(layer);
}

// head: 피부 머리 ID, ids: 얼굴, 헤어, 코디 순서(렌더 요청과 같은 순서). 결과는 렌더와 같은 96×96 ImageData
async function _mxLayerCompose(view, head, ids) {
  await _mxLayerInit();
  if (!_mxLayer) throw new Error('층 데이터 없음');
  const { rules, zi } = _mxLayer;
  const [items, skin] = await Promise.all([Promise.all(ids.map(_mxLayerItem)), _mxLayerSkin(head)]);

  const layers = skin.f[view].map(l => ({ l, rank: -1, v: [] }));
  items.forEach((it, rank) => {
    for (const l of it.f[view] || []) {
      if (view === 'ladder' && MX_LAYER_LADDER_HIDE.includes(l[0])) continue;
      layers.push({ l, rank, v: it.v });
    }
  });
  const owner = {};
  items.forEach((it, rank) => it.v.forEach(s => { owner[s] = rank; }));
  const shown = layers.filter(L => {
    const slots = (rules.smap[L.l[0]] || '').match(/../g) || [];
    return !slots.some(s => L.v.includes(s) && owner[s] !== L.rank);
  });

  // 위치: 몸 층을 원점에 두고, 이미 정해진 붙는 자리를 가진 층부터 차례로 잇는다
  const anchor = {}, placed = [];
  const place = (L, x, y) => {
    L.x = x; L.y = y;
    for (const [k, [mx, my]] of Object.entries(L.l[3])) if (!(k in anchor)) anchor[k] = [x + mx, y + my];
    placed.push(L);
  };
  let todo = shown.filter(L => L.l[0] !== 'body' && L.l[0] !== 'backBody');
  shown.filter(L => L.l[0] === 'body' || L.l[0] === 'backBody').forEach(L => place(L, 0, 0));
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
  placed.sort((a, b) => (zi.has(a.l[0]) ? zi.get(a.l[0]) : -1) - (zi.has(b.l[0]) ? zi.get(b.l[0]) : -1));

  const imgs = await Promise.all(placed.map(L => _mxLayerImg(L.l)));
  const c = document.createElement('canvas');
  c.width = c.height = MX_LAYER_SIZE;
  const ctx = c.getContext('2d');
  const [ox, oy] = MX_LAYER_ORIGIN[view];
  placed.forEach((L, k) => ctx.drawImage(imgs[k], ox + L.x - L.l[1], oy + L.y - L.l[2]));
  return ctx.getImageData(0, 0, MX_LAYER_SIZE, MX_LAYER_SIZE);
}
