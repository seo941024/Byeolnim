/* ═══════════════════════════════════════════════
   코디 시뮬레이터 — 여자 헤어·성형의 믹스 염색·믹스 렌즈와 코디 아이템 착용을
   한 캐릭터에 같이 입혀 보여 준다. 탭: 헤어 | 성형 | 코디

   그림은 maplestory.io 캐릭터 렌더로 받는다. 입고 있는 코디까지 전부 넣은 완성 그림 3장:
   - A: 기준 헤어 + 기준 렌즈, B: 믹스 헤어 + 기준 렌즈, C: 기준 헤어 + 믹스 렌즈
   - A와 B가 다른 픽셀이 헤어, A와 C가 다른 픽셀이 눈이라 그 픽셀만 비율만큼 섞는다
   - 모자에 머리가 눌리는 것 같은 착용 규칙은 렌더가 처리한다
   비율만 바꿀 때는 받은 그림으로 다시 섞기만 해서 요청이 없다.
   ═══════════════════════════════════════════════════════════ */

const MX_API = 'https://maplestory.io/api';
const MX_SKIN = [2018, 12018];          // 뽀송 라벤더 피부
const MX_DEFAULT_WORN = { overall: 1051539 };   // Crimson Fate Topcoat
const MX_STORE = 'gms_mixdye';
const MX_COORDI_DATA = 'data_coordi.js?v=20261021a';

const MX_PARTS = {
  hair: {
    key: 'hair', name: '헤어', word: '색', def: 67190,
    idOf: (s, c) => s + c,
    // 게임 원문 색 이름(헤어 이름 앞말). 3번은 옛 헤어에 Blonde로 남아 있지만 지금 인게임 표기는 Yellow.
    // 칩 색은 실제 헤어보다 진하게 잡아 서로 구분되게 했다
    colors: [
      { name: 'Black', sw: '#2e2c2c' }, { name: 'Red', sw: '#e0414f' },
      { name: 'Orange', sw: '#f07b2e' }, { name: 'Yellow', sw: '#f0c541' },
      { name: 'Green', sw: '#3ea55a' }, { name: 'Blue', sw: '#3a7fdc' },
      { name: 'Purple', sw: '#a04fc8' }, { name: 'Brown', sw: '#8a5636' },
    ],
  },
  face: {
    key: 'face', name: '성형', word: '렌즈', def: 21078,
    idOf: (s, c) => s + c * 100,
    // 렌즈 이름은 일회용 렌즈 아이템 5152100~5152108의 원문(One-Time Cosmetic Lens (Black) 등)
    colors: [
      { name: 'Black', sw: '#363636' }, { name: 'Blue', sw: '#234aad' },
      { name: 'Red', sw: '#ad1729' }, { name: 'Green', sw: '#148b89' },
      { name: 'Brown', sw: '#6b3536' }, { name: 'Emerald', sw: '#237eac' },
      { name: 'Purple', sw: '#6907aa' }, { name: 'Amethyst', sw: '#ac1866' },
      { name: 'White', sw: '#c9c9c9' },
    ],
  },
};

const _mxBlank = p => ({ id: p.def, base: 0, mix: p.key === 'face' ? -1 : 1, ratio: 50, mixed: false, query: '' });
let _mxState = {
  part: 'hair', view: 'stand1',
  hair: _mxBlank(MX_PARTS.hair), face: _mxBlank(MX_PARTS.face),
  coordi: { slot: 'hat', worn: { ...MX_DEFAULT_WORN }, male: false, query: {} },
};
let _mxLists = {};

/* ── 작은 도우미 ── */
const _mxHas = (r, c) => (r[3] >> c) & 1;
const _mxColorsOf = (p, r) => p.colors.map((_, c) => c).filter(c => _mxHas(r, c));
const _mxRow = p => p.byId.get(_mxState[p.key].id);
const _mxSingle = (p, r) => _mxColorsOf(p, r).length < 2;
// 믹스 색 -1은 믹스 안 함
const _mxMixOn = p => !_mxSingle(p, _mxRow(p)) && _mxState[p.key].mix >= 0;
const _mxDot = c => `<span class="mx-dot" style="background:${c.sw}"></span>`;
const _mxEsc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const _mxVer = () => window.MIXDYE_DATA.version;
const _mxItemIcon = id => `${MX_API}/GMS/${_mxVer()}/item/${id}/icon`;
const _mxIcon = (p, r) => _mxItemIcon(p.idOf(r[0], _mxColorsOf(p, r)[0]));
const _mxCD = () => window.COORDI_DATA;
const _mxSlotName = key => (_mxCD()?.parts.find(p => p.key === key) || {}).name || key;

function _mxSave() {
  try {
    const pick = v => ({ id: v.id, base: v.base, mix: v.mix, ratio: v.ratio, mixed: v.mixed });
    const c = _mxState.coordi;
    localStorage.setItem(MX_STORE, JSON.stringify({
      part: _mxState.part, view: _mxState.view, hair: pick(_mxState.hair), face: pick(_mxState.face),
      coordi: { slot: c.slot, worn: c.worn, male: c.male },
    }));
  } catch (e) {}
}
function _mxLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(MX_STORE) || 'null');
    if (!s) return;
    if (['hair', 'face', 'coordi'].includes(s.part)) _mxState.part = s.part;
    if (s.view === 'stand1' || s.view === 'ladder') _mxState.view = s.view;
    for (const p of Object.values(MX_PARTS)) {
      const v = s[p.key]; if (!v) continue;
      const ok = n => Number.isInteger(n) && n >= 0 && n < p.colors.length;
      const st = _mxState[p.key];
      if (p.byId.has(v.id)) st.id = v.id;
      if (ok(v.base)) st.base = v.base;
      if (ok(v.mix) || v.mix === -1) st.mix = v.mix;
      if (v.ratio >= 1 && v.ratio <= 99) st.ratio = v.ratio;
      st.mixed = !!v.mixed;
    }
    // 코디 아이템 ID는 목록을 받은 뒤 _mxCoordiReady에서 다시 확인한다
    if (s.coordi && typeof s.coordi === 'object') {
      const c = _mxState.coordi;
      if (typeof s.coordi.slot === 'string') c.slot = s.coordi.slot;
      if (s.coordi.worn && typeof s.coordi.worn === 'object') {
        c.worn = {};
        for (const [k, v] of Object.entries(s.coordi.worn)) if (Number.isInteger(v)) c.worn[k] = v;
      }
      c.male = !!s.coordi.male;
    }
  } catch (e) {}
}

// 아이템마다 없는 색이 있어서 고를 수 있는 색으로 맞춘다
function _mxFixColors(p) {
  const st = _mxState[p.key];
  const avail = _mxColorsOf(p, _mxRow(p));
  if (!avail.includes(st.base)) st.base = avail[0];
  if (avail.length < 2 || st.mix === -1) return;
  if (!avail.includes(st.mix) || st.mix === st.base) st.mix = avail.find(c => c !== st.base);
}

/* ── 그림 ── */
function _mxRenderUrl(hairId, faceId, view) {
  const ids = [...MX_SKIN, faceId, hairId, ...Object.values(_mxState.coordi.worn)];
  const list = JSON.stringify(ids.map(i => ({ itemId: i, version: _mxVer() })));
  return `${MX_API}/character/${encodeURIComponent(list.slice(1, -1))}/${view}/0?resize=1&renderMode=1`;
}

const _mxPix = new Map();
function _mxLoadPix(url) {
  if (!_mxPix.has(url)) {
    _mxPix.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, c.width, c.height));
        } catch (e) { _mxPix.delete(url); reject(e); }
      };
      img.onerror = () => { _mxPix.delete(url); reject(new Error('load')); };
      img.src = url;
    }));
  }
  return _mxPix.get(url);
}

// 믹스를 안 하면 B·C가 A와 같은 주소라 요청도 한 번만 나간다
function _mxUrls() {
  const H = MX_PARTS.hair, F = MX_PARTS.face, hs = _mxState.hair, fs = _mxState.face, v = _mxState.view;
  const hb = H.idOf(hs.id, hs.base), hm = _mxMixOn(H) ? H.idOf(hs.id, hs.mix) : hb;
  const fb = F.idOf(fs.id, fs.base), fm = _mxMixOn(F) ? F.idOf(fs.id, fs.mix) : fb;
  return { a: _mxRenderUrl(hb, fb, v), b: _mxRenderUrl(hm, fb, v), c: _mxRenderUrl(hb, fm, v) };
}

function _mxCompose(g, tH, tF) {
  const a = g.a.data, n = g.a.width * g.a.height;
  const out = new ImageData(new Uint8ClampedArray(a), g.a.width, g.a.height);
  const d = out.data;
  const blend = (x, t, from) => {
    if (!x || x === a || x.length !== a.length || t <= 0) return;
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      if (x[i] === a[i] && x[i + 1] === a[i + 1] && x[i + 2] === a[i + 2] && x[i + 3] === a[i + 3]) continue;
      for (let k = 0; k < 4; k++) d[i + k] = from[i + k] + (x[i + k] - from[i + k]) * t;
    }
  };
  blend(g.b.data, tH, a);
  blend(g.c.data, tF, d);
  return out;
}

function _mxPaint(id, img, scale) {
  const c = document.getElementById(id); if (!c) return;
  if (c.width !== img.width || c.height !== img.height) { c.width = img.width; c.height = img.height; }
  c.style.width = `${img.width * scale}px`;
  c.getContext('2d').putImageData(img, 0, 0);
}

function _mxSetStatus(html, isError) {
  document.querySelectorAll('#sec-mixdye .mx-status').forEach(el => {
    el.style.display = html ? '' : 'none';
    el.classList.toggle('is-error', !!isError);
    el.innerHTML = html || '';
  });
}

let _mxToken = 0, _mxCur = null;
function _mxDrawCards() {
  const g = _mxCur.g;
  const tH = _mxMixOn(MX_PARTS.hair) ? _mxState.hair.ratio / 100 : 0;
  const tF = _mxMixOn(MX_PARTS.face) ? _mxState.face.ratio / 100 : 0;
  _mxPaint('mxCvResult', _mxCompose(g, tH, tF), 3);
  if (_mxState.part === 'coordi') return;
  const onHair = _mxState.part === 'hair';
  const mixOn = _mxMixOn(MX_PARTS[_mxState.part]) ? 1 : 0;
  _mxPaint('mxCvBase', _mxCompose(g, onHair ? 0 : tH, onHair ? tF : 0), 2);
  _mxPaint('mxCvMix', _mxCompose(g, onHair ? mixOn : tH, onHair ? tF : mixOn), 2);
}

async function _mxDraw() {
  const my = ++_mxToken;
  const u = _mxUrls();
  const key = JSON.stringify(u);
  // 비율만 바뀌었으면 받은 그림으로 다시 섞기만 한다
  if (_mxCur && _mxCur.key === key) { _mxDrawCards(); return; }
  const slow = setTimeout(() => { if (my === _mxToken) _mxSetStatus('불러오는 중<span class="mx-status__sub">처음 보는 조합은 시간이 조금 걸립니다</span>'); }, 150);
  try {
    const [a, b, c] = await Promise.all([_mxLoadPix(u.a), _mxLoadPix(u.b), _mxLoadPix(u.c)]);
    if (my !== _mxToken) return;
    clearTimeout(slow);
    _mxSetStatus('');
    _mxCur = { key, g: { a, b, c } };
    _mxDrawCards();
    _mxPrefetch();
  } catch (e) {
    if (my !== _mxToken) return;
    clearTimeout(slow);
    _mxSetStatus('그림을 불러오지 못했습니다<button class="sbtn sbtn--ghost sbtn--sm mx-retry" type="button">다시 시도</button>', true);
    document.querySelectorAll('#sec-mixdye .mx-retry').forEach(b => b.addEventListener('click', _mxDraw));
  }
}

// 헤어·성형 탭에서는 다른 색 그림을 미리 받아 둬서 색을 바꿀 때 기다리지 않게 한다
function _mxPrefetch() {
  const key = _mxState.part;
  if (key === 'coordi') return;
  const H = MX_PARTS.hair, F = MX_PARTS.face, hs = _mxState.hair, fs = _mxState.face, v = _mxState.view;
  const hb = H.idOf(hs.id, hs.base), fb = F.idOf(fs.id, fs.base);
  if (key === 'hair') _mxColorsOf(H, _mxRow(H)).forEach(c => _mxLoadPix(_mxRenderUrl(H.idOf(hs.id, c), fb, v)).catch(() => {}));
  else if (v === 'stand1') _mxColorsOf(F, _mxRow(F)).forEach(c => _mxLoadPix(_mxRenderUrl(hb, F.idOf(fs.id, c), v)).catch(() => {}));
}

/* ── 목록 ── */
function _mxMakeItem(icon, en, sub, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mx-item';
  b.innerHTML = `<img class="mx-item__icon" loading="lazy" alt="" onerror="this.style.visibility='hidden'">
    <span class="mx-item__text"><span class="mx-item__en"></span><span class="mx-item__ko"></span></span>`;
  b.querySelector('img').src = icon;
  b.querySelector('.mx-item__en').textContent = en;
  b.querySelector('.mx-item__ko').textContent = sub;
  b.addEventListener('click', onClick);
  return b;
}

function _mxListBox(key) {
  if (_mxLists[key]) return _mxLists[key];
  const box = document.createElement('div');
  box.className = 'mx-list';
  box.style.display = 'none';
  document.getElementById('mxLists').appendChild(box);
  const empty = document.createElement('div');
  empty.className = 'mx-empty';
  empty.textContent = '검색 결과가 없습니다';
  _mxLists[key] = { box, items: [], empty };
  return _mxLists[key];
}

function _mxBuildList(p) {
  const L = _mxListBox(p.key);
  for (const r of p.rows) {
    const sub = [r[2], `ID ${r[0]}`, r[4] ? '성별 미확인' : ''].filter(Boolean).join(' · ');
    const el = _mxMakeItem(_mxIcon(p, r), r[1] || `ID ${r[0]}`, sub, () => _mxSelect(p, r[0]));
    L.box.appendChild(el);
    L.items.push({ el, r, id: r[0], hidden: !!r[4], key: `${r[1]} ${r[2]} ${r[2].replace(/\s+/g, '')} ${r[0]}`.toLowerCase() });
  }
  L.box.appendChild(L.empty);
}

// 코디 부위 목록은 그 부위를 처음 열 때 만든다(전체 약 1만 개라 한꺼번에 만들지 않음)
function _mxBuildSlotList(slot) {
  const key = `coordi-${slot}`;
  if (_mxLists[key]) return _mxLists[key];
  const L = _mxListBox(key);
  for (const r of _mxCD().items[slot] || []) {
    const sub = [r[2], `ID ${r[0]}`, r[3] === 0 ? '남자' : ''].filter(Boolean).join(' · ');
    const el = _mxMakeItem(_mxItemIcon(r[0]), r[1], sub, () => _mxToggleWear(slot, r[0]));
    L.box.appendChild(el);
    L.items.push({ el, r, id: r[0], hidden: r[3] === 0, key: `${r[1]} ${r[2]} ${r[2].replace(/\s+/g, '')} ${r[0]}`.toLowerCase() });
  }
  L.box.appendChild(L.empty);
  return L;
}

function _mxCurrentListKey() {
  return _mxState.part === 'coordi' ? `coordi-${_mxState.coordi.slot}` : _mxState.part;
}
function _mxQuery() {
  return _mxState.part === 'coordi' ? (_mxState.coordi.query[_mxState.coordi.slot] || '') : _mxState[_mxState.part].query;
}
function _mxShowHidden() {
  return _mxState.part === 'coordi' ? _mxState.coordi.male : _mxState[_mxState.part].mixed;
}

function _mxFilter() {
  const L = _mxLists[_mxCurrentListKey()];
  if (!L) return;
  const q = _mxQuery().trim().toLowerCase(), q2 = q.replace(/\s+/g, '');
  const showHidden = _mxShowHidden();
  let shown = 0;
  for (const it of L.items) {
    const ok = (showHidden || !it.hidden) && (!q || it.key.includes(q) || it.key.includes(q2));
    it.el.style.display = ok ? '' : 'none';
    if (ok) shown++;
  }
  L.empty.style.display = shown ? 'none' : '';
  document.getElementById('mxCount').textContent = q ? `검색 결과 ${shown.toLocaleString()}종` : `${shown.toLocaleString()}종`;
}

function _mxScrollToSelected() {
  const L = _mxLists[_mxCurrentListKey()];
  if (!L) return;
  const id = _mxState.part === 'coordi' ? _mxState.coordi.worn[_mxState.coordi.slot] : _mxState[_mxState.part].id;
  const it = L.items.find(x => x.id === id);
  L.box.scrollTop = it && it.el.style.display !== 'none' ? it.el.offsetTop - L.box.clientHeight / 2 : 0;
}

function _mxSelect(p, id) {
  _mxState[p.key].id = id;
  _mxFixColors(p);
  _mxRender();
}

/* ── 코디 ── */
// 한벌옷과 상의·하의는 같이 못 입는다
function _mxToggleWear(slot, id) {
  const w = _mxState.coordi.worn;
  if (w[slot] === id) delete w[slot];
  else {
    w[slot] = id;
    if (slot === 'overall') { delete w.top; delete w.bottom; }
    if (slot === 'top' || slot === 'bottom') delete w.overall;
  }
  _mxRender();
}

let _mxCoordiLoading = null;
function _mxEnsureCoordi() {
  if (window.COORDI_DATA) return Promise.resolve();
  if (!_mxCoordiLoading) {
    _mxCoordiLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = MX_COORDI_DATA;
      s.onload = resolve;
      s.onerror = () => { _mxCoordiLoading = null; reject(new Error('data_coordi.js 로드 실패')); };
      document.body.appendChild(s);
    });
  }
  return _mxCoordiLoading;
}

// 목록을 받은 뒤 저장돼 있던 착용 아이템이 실제로 있는지 확인한다
function _mxCoordiReady() {
  const D = _mxCD(), c = _mxState.coordi;
  if (!D.parts.some(p => p.key === c.slot)) c.slot = D.parts[0].key;
  for (const [slot, id] of Object.entries(c.worn)) {
    if (!(D.items[slot] || []).some(r => r[0] === id)) delete c.worn[slot];
  }
  document.getElementById('mxSlots').innerHTML = D.parts.map(p =>
    `<button type="button" class="mx-slot" data-slot="${p.key}">${p.name}</button>`).join('');
}

/* ── 탭 전환 ── */
async function _mxShowPart() {
  const part = _mxState.part, coordi = part === 'coordi';
  const sec = document.getElementById('sec-mixdye');
  sec.querySelectorAll('.mx-tab').forEach(b => b.classList.toggle('active', b.dataset.mxpart === part));
  sec.classList.toggle('is-coordi', coordi);

  if (coordi && !window.COORDI_DATA) {
    for (const L of Object.values(_mxLists)) L.box.style.display = 'none';
    document.getElementById('mxCount').textContent = '';
    try {
      document.getElementById('mxSlots').innerHTML = '<span class="mx-hint">코디 목록을 불러오는 중</span>';
      await _mxEnsureCoordi();
      _mxCoordiReady();
    } catch (e) {
      document.getElementById('mxSlots').innerHTML = '<span class="mx-hint">코디 목록을 불러오지 못했습니다. 새로고침해 주세요.</span>';
      return;
    }
    if (_mxState.part !== 'coordi') return;
  }

  if (coordi) _mxBuildSlotList(_mxState.coordi.slot);
  const key = _mxCurrentListKey();
  for (const [k, L] of Object.entries(_mxLists)) L.box.style.display = k === key ? '' : 'none';

  const q = document.getElementById('mxSearch');
  q.value = _mxQuery();
  if (coordi) {
    const name = _mxSlotName(_mxState.coordi.slot);
    q.placeholder = `${name} 이름 또는 ID 검색`;
    document.getElementById('mxMixed').checked = _mxState.coordi.male;
    document.getElementById('mxMixedLabel').textContent = '남자 아이템 포함';
    sec.querySelectorAll('.mx-slot').forEach(b => b.classList.toggle('active', b.dataset.slot === _mxState.coordi.slot));
  } else {
    const p = MX_PARTS[part];
    q.placeholder = `${p.name} 이름 또는 ID 검색`;
    document.getElementById('mxMixed').checked = _mxState[part].mixed;
    document.getElementById('mxMixedLabel').textContent = `성별 미확인 ${p.name} ${p.mixedCount}종 포함`;
    document.getElementById('mxBaseLabel').textContent = `기준 ${p.word}`;
    document.getElementById('mxMixLabel').textContent = `믹스 ${p.word}`;
    document.getElementById('mxTitleBase').textContent = `기준 ${p.word} 원본`;
    document.getElementById('mxTitleMix').textContent = `믹스 ${p.word} 원본`;
    _mxBuildSwatches(p);
  }
  _mxFilter();
  _mxRender();
  requestAnimationFrame(_mxScrollToSelected);
}

/* ── 색 칩 ── */
function _mxBuildSwatches(p) {
  const mk = (role, i, label, c) => `<button type="button" class="mx-chip" data-role="${role}" data-i="${i}">${c ? _mxDot(c) : ''}${label}</button>`;
  document.getElementById('mxBaseChips').innerHTML = p.colors.map((c, i) => mk('base', i, c.name, c)).join('');
  // 빈 선택지는 앱 전체 규칙대로 '-'. 맨 뒤에 둬야 기준 줄과 색 칸이 위아래로 맞는다
  document.getElementById('mxMixChips').innerHTML = p.colors.map((c, i) => mk('mix', i, c.name, c)).join('') + mk('mix', -1, '-', null);
  // 칸 수: 믹스 줄(색 + '-')이 PC는 두 줄, 모바일은 세 줄에 들어가게. 기준 줄도 같은 칸 수라 위아래가 맞는다
  const n = p.colors.length + 1;
  const sec = document.getElementById('sec-mixdye');
  sec.style.setProperty('--mx-cols', Math.ceil(n / 2));
  sec.style.setProperty('--mx-cols-m', Math.ceil(n / 3));
}

function _mxPick(role, i) {
  const st = _mxState[_mxState.part];
  if (role === 'mix' && i === st.base) return;
  if (role === 'base' && i === st.mix) st.mix = st.base;   // 기준을 믹스 색으로 고르면 둘을 맞바꾼다
  st[role] = i;
  _mxRender();
}

/* ── 화면 갱신 ── */
function _mxCombo(p) {
  const r = _mxRow(p), st = _mxState[p.key], C = p.colors;
  const name = `<b>${_mxEsc(r[1] || `ID ${r[0]}`)}</b>`;
  if (!_mxMixOn(p)) return `${name}${_mxDot(C[st.base])}${C[st.base].name} 100%`;
  return `${name}${_mxDot(C[st.base])}${C[st.base].name} ${100 - st.ratio}%${_mxDot(C[st.mix])}${C[st.mix].name} ${st.ratio}%`;
}

function _mxWornName(slot, id) {
  const r = _mxCD() && (_mxCD().items[slot] || []).find(x => x[0] === id);
  return r ? r[1] : `ID ${id}`;
}

function _mxRenderCombo() {
  let html = `
    <div class="mx-combo__row"><span class="mx-label">헤어</span><div class="mx-combo__val">${_mxCombo(MX_PARTS.hair)}</div></div>
    <div class="mx-combo__row"><span class="mx-label">성형</span><div class="mx-combo__val">${_mxCombo(MX_PARTS.face)}</div></div>`;
  const D = _mxCD();
  const order = D ? D.parts.map(p => p.key) : Object.keys(_mxState.coordi.worn);
  for (const slot of order) {
    const id = _mxState.coordi.worn[slot];
    if (!id) continue;
    html += `<div class="mx-combo__row"><span class="mx-label">${_mxSlotName(slot)}</span>
      <div class="mx-combo__val"><b>${_mxEsc(_mxWornName(slot, id))}</b>
      <button type="button" class="sbtn sbtn--ghost mx-unwear" data-slot="${slot}" title="벗기">-</button></div></div>`;
  }
  document.getElementById('mxCombo').innerHTML = html;
}

function _mxRenderCoordiCard() {
  const c = _mxState.coordi, slot = c.slot, id = c.worn[slot];
  document.querySelectorAll('#sec-mixdye .mx-slot').forEach(b => {
    b.classList.toggle('active', b.dataset.slot === slot);
    b.classList.toggle('is-worn', !!c.worn[b.dataset.slot]);
  });
  const L = _mxLists[`coordi-${slot}`];
  if (L) for (const it of L.items) it.el.classList.toggle('active', it.id === id);
  const icon = document.getElementById('mxSelIcon');
  icon.style.visibility = id ? '' : 'hidden';
  if (id) icon.src = _mxItemIcon(id);
  document.getElementById('mxSelName').textContent = id ? _mxWornName(slot, id) : `${_mxSlotName(slot)} 없음`;
  document.getElementById('mxSelSub').textContent = id ? `${_mxSlotName(slot)} 착용 중 · ID ${id}` : '목록에서 아이템을 누르면 입습니다';
}

function _mxRender() {
  for (const p of Object.values(MX_PARTS)) _mxFixColors(p);
  const coordi = _mxState.part === 'coordi';

  if (coordi) {
    if (window.COORDI_DATA) _mxRenderCoordiCard();
  } else {
    const p = MX_PARTS[_mxState.part], r = _mxRow(p), st = _mxState[p.key];
    const single = _mxSingle(p, r), off = !_mxMixOn(p);
    const B = p.colors[st.base], M = p.colors[Math.max(0, st.mix)];

    for (const it of _mxLists[p.key].items) it.el.classList.toggle('active', it.id === st.id);
    const icon = document.getElementById('mxSelIcon');
    icon.style.visibility = '';
    icon.src = _mxIcon(p, r);
    document.getElementById('mxSelName').textContent = r[1] || `ID ${r[0]}`;
    document.getElementById('mxSelSub').textContent = [r[2], `ID ${r[0]}`, `${p.word} ${_mxColorsOf(p, r).length}종`,
      single ? `${p.word}이 하나뿐이라 믹스 불가` : '', r[4] ? '성별 미확인' : ''].filter(Boolean).join(' · ');

    document.querySelectorAll('#mxBaseChips .mx-chip').forEach(b => {
      const i = +b.dataset.i;
      b.classList.toggle('active', i === st.base);
      b.disabled = !_mxHas(r, i);
    });
    document.querySelectorAll('#mxMixChips .mx-chip').forEach(b => {
      const i = +b.dataset.i;
      b.classList.toggle('active', i === -1 ? off : !off && i === st.mix);
      b.disabled = i === -1 ? single : single || !_mxHas(r, i) || i === st.base;
    });

    const range = document.getElementById('mxRatio');
    range.value = st.ratio;
    range.disabled = off;
    document.querySelectorAll('#sec-mixdye [data-mxact]').forEach(b => { b.disabled = off; });
    document.getElementById('mxReadout').innerHTML = off ? '100<span>:</span>0' : `${100 - st.ratio}<span>:</span>${st.ratio}`;
    document.getElementById('mxEndBase').innerHTML = `${_mxDot(B)}${B.name}`;
    document.getElementById('mxEndMix').innerHTML = off ? '' : `${M.name}${_mxDot(M)}`;

    document.getElementById('mxCapBase').innerHTML = `${_mxDot(B)}${B.name}`;
    document.getElementById('mxCapMix').innerHTML = off ? '-' : `${_mxDot(M)}${M.name}`;
    document.getElementById('mxCapResult').innerHTML = off ? `${_mxDot(B)}${B.name} 100%` : `${_mxDot(B)}${B.name} ${100 - st.ratio}% · ${_mxDot(M)}${M.name} ${st.ratio}%`;
  }
  document.getElementById('mxResultTitle').textContent = coordi ? '착용 결과' : '믹스 결과';
  if (coordi) document.getElementById('mxCapResult').textContent = '';
  _mxRenderCombo();

  document.querySelectorAll('#sec-mixdye .mx-view').forEach(b => b.classList.toggle('active', b.dataset.mxview === _mxState.view));
  document.getElementById('mxViewNote').style.display = _mxState.part === 'face' && _mxState.view === 'ladder' ? '' : 'none';

  _mxDraw();
  _mxSave();
}

function initMixdye() {
  const sec = document.getElementById('sec-mixdye');
  const D = window.MIXDYE_DATA;
  if (!sec || !D) return;
  MX_PARTS.hair.rows = D.hairs;
  MX_PARTS.face.rows = D.faces;
  for (const p of Object.values(MX_PARTS)) {
    p.byId = new Map(p.rows.map(r => [r[0], r]));
    p.femaleCount = p.rows.filter(r => !r[4]).length;
    p.mixedCount = p.rows.length - p.femaleCount;
  }
  _mxLoad();
  if (!MX_PARTS.hair.byId.has(_mxState.hair.id)) _mxState.hair.id = D.hairs[0][0];
  if (!MX_PARTS.face.byId.has(_mxState.face.id)) _mxState.face.id = D.faces[0][0];

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">코디 시뮬레이터</h2></div>
    <p class="dt-help">여자 캐릭터 헤어 ${MX_PARTS.hair.femaleCount.toLocaleString()}종·성형 ${MX_PARTS.face.femaleCount.toLocaleString()}종의 믹스 염색과 믹스 렌즈를 미리 보고, 코디 탭에서 모자·한벌옷 같은 캐시 아이템을 입혀 봅니다. 기준 색 위에 믹스 색을 비율만큼 겹쳐 그리는 방식이라 실제 게임 화면과 조금 다를 수 있습니다.</p>
    <p class="dt-help mx-source">출처: <a href="https://maplestory.io" target="_blank" rel="noopener">maplestory.io</a> — GMS v${D.version} 아이템 데이터와 캐릭터 렌더링을 사용하고 착용 규칙을 참고했습니다. 게임 그림의 권리는 NEXON에 있습니다.</p>

    <div class="sf-tabs">
      <button class="sf-tab mx-tab" data-mxpart="hair"><img class="mx-tab__icon" src="images/icons/Mix_Hair_Color_Coupon.png" alt="" onerror="this.style.display='none'">헤어</button>
      <button class="sf-tab mx-tab" data-mxpart="face"><img class="mx-tab__icon" src="images/icons/Mix_Lens_Coupon.png" alt="" onerror="this.style.display='none'">성형</button>
      <button class="sf-tab mx-tab" data-mxpart="coordi"><img class="mx-tab__icon" src="images/icons/Mannequin.webp" alt="" onerror="this.style.display='none'">코디</button>
    </div>
    <hr class="sec-sep" />

    <div class="mx-layout">
      <div class="card mx-browser">
        <div class="mx-slots mx-only-coordi" id="mxSlots"></div>
        <input class="inp" id="mxSearch" type="search" autocomplete="off" />
        <div class="mx-filter">
          <label class="mx-check"><input type="checkbox" id="mxMixed" /><span id="mxMixedLabel"></span></label>
          <span id="mxCount"></span>
        </div>
        <div class="mx-lists" id="mxLists"></div>
      </div>

      <div class="mx-work">
        <div class="card">
          <div class="mx-sel">
            <img class="mx-sel__icon" id="mxSelIcon" alt="" onerror="this.style.visibility='hidden'">
            <div class="mx-sel__text"><div class="mx-sel__name" id="mxSelName"></div><div class="mx-sel__sub" id="mxSelSub"></div></div>
          </div>
          <div class="mx-no-coordi">
            <div class="mx-row"><span class="mx-label" id="mxBaseLabel"></span><div class="mx-chips" id="mxBaseChips"></div></div>
            <div class="mx-row"><span class="mx-label" id="mxMixLabel"></span><div class="mx-chips" id="mxMixChips"></div></div>
            <div class="mx-row">
              <span class="mx-label">믹스 비율</span>
              <div class="mx-slider">
                <div class="mx-readout">
                  <div class="mx-readout__val" id="mxReadout"></div>
                  <div class="mx-tools">
                    <button class="sbtn sbtn--ghost sbtn--sm" type="button" data-mxact="minus" aria-label="기준 색 1% 늘리기" title="기준 색 1% 늘리기">◀</button>
                    <button class="sbtn sbtn--ghost sbtn--sm" type="button" data-mxact="reset">50:50</button>
                    <button class="sbtn sbtn--ghost sbtn--sm" type="button" data-mxact="plus" aria-label="믹스 색 1% 늘리기" title="믹스 색 1% 늘리기">▶</button>
                  </div>
                </div>
                <input class="mx-range" type="range" id="mxRatio" min="1" max="99" step="1" aria-label="믹스 비율" />
                <div class="mx-ends"><span id="mxEndBase"></span><span id="mxEndMix"></span></div>
              </div>
            </div>
          </div>
          <p class="mx-hint mx-only-coordi">목록에서 아이템을 누르면 입고, 같은 아이템을 다시 누르면 벗습니다. 한벌옷을 입으면 상의·하의는 벗겨집니다.</p>
        </div>

        <div class="mx-viewbar">
          <div class="sf-tabs mx-viewtabs">
            <button class="sf-tab mx-view" data-mxview="stand1">앞모습</button>
            <button class="sf-tab mx-view" data-mxview="ladder">뒷모습</button>
          </div>
          <span class="mx-viewnote" id="mxViewNote">뒷모습은 얼굴이 보이지 않습니다</span>
        </div>

        <div class="mx-compare">
          <div class="card mx-card mx-card--base mx-no-coordi">
            <div class="mx-stage"><canvas id="mxCvBase"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title" id="mxTitleBase"></div><div class="mx-cap__val" id="mxCapBase"></div></div>
          </div>
          <div class="card mx-card mx-card--result">
            <div class="mx-stage"><canvas id="mxCvResult"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title" id="mxResultTitle">믹스 결과</div><div class="mx-cap__val" id="mxCapResult"></div></div>
          </div>
          <div class="card mx-card mx-card--mix mx-no-coordi">
            <div class="mx-stage"><canvas id="mxCvMix"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title" id="mxTitleMix"></div><div class="mx-cap__val" id="mxCapMix"></div></div>
          </div>
        </div>

        <div class="card mx-combo">
          <div class="card__title">현재 조합</div>
          <div id="mxCombo"></div>
        </div>
      </div>
    </div>`;

  for (const p of Object.values(MX_PARTS)) _mxBuildList(p);

  sec.querySelectorAll('.mx-tab').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mxpart === _mxState.part) return;
    _mxState.part = b.dataset.mxpart;
    _mxShowPart();
  }));
  document.getElementById('mxSlots').addEventListener('click', e => {
    const b = e.target.closest('.mx-slot');
    if (!b || b.dataset.slot === _mxState.coordi.slot) return;
    _mxState.coordi.slot = b.dataset.slot;
    _mxShowPart();
  });
  document.getElementById('mxSearch').addEventListener('input', e => {
    if (_mxState.part === 'coordi') _mxState.coordi.query[_mxState.coordi.slot] = e.target.value;
    else _mxState[_mxState.part].query = e.target.value;
    _mxFilter();
  });
  document.getElementById('mxMixed').addEventListener('change', e => {
    if (_mxState.part === 'coordi') _mxState.coordi.male = e.target.checked;
    else _mxState[_mxState.part].mixed = e.target.checked;
    _mxFilter();
    _mxSave();
  });
  sec.querySelector('.mx-work').addEventListener('click', e => {
    const chip = e.target.closest('.mx-chip');
    if (chip && !chip.disabled) { _mxPick(chip.dataset.role, +chip.dataset.i); return; }
    const off = e.target.closest('.mx-unwear');
    if (off) { delete _mxState.coordi.worn[off.dataset.slot]; _mxRender(); }
  });
  document.getElementById('mxRatio').addEventListener('input', e => {
    _mxState[_mxState.part].ratio = Number(e.target.value);
    _mxRender();
  });
  sec.querySelectorAll('[data-mxact]').forEach(b => b.addEventListener('click', () => {
    const st = _mxState[_mxState.part];
    if (b.dataset.mxact === 'minus') st.ratio = Math.max(1, st.ratio - 1);
    else if (b.dataset.mxact === 'plus') st.ratio = Math.min(99, st.ratio + 1);
    else if (b.dataset.mxact === 'reset') st.ratio = 50;
    _mxRender();
  }));
  sec.querySelectorAll('.mx-view').forEach(b => b.addEventListener('click', () => {
    _mxState.view = b.dataset.mxview;
    _mxRender();
  }));

  // 코디 목록은 코디 탭을 처음 열 때 받지만, 저장된 착용 아이템 이름을 보여 주려고 뒤에서 미리 받아 둔다
  _mxEnsureCoordi().then(() => { _mxCoordiReady(); if (_mxState.part !== 'coordi') _mxRenderCombo(); }).catch(() => {});
  _mxShowPart();
}

let _mxLoading = null, _mxInited = false;
function ensureMixdyeReady(cb) {
  const start = () => {
    if (!_mxInited) { _mxInited = true; initMixdye(); }
    else requestAnimationFrame(_mxScrollToSelected);
    cb && cb();
  };
  if (window.MIXDYE_DATA) { start(); return; }
  if (!_mxLoading) {
    _mxLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'data_mixdye.js?v=20261021a';
      s.onload = resolve;
      s.onerror = () => reject(new Error('data_mixdye.js 로드 실패'));
      document.body.appendChild(s);
    });
  }
  _mxLoading.then(start).catch(() => {
    _mxLoading = null;
    const sec = document.getElementById('sec-mixdye');
    if (sec) sec.innerHTML = '<div class="soon-box"><div class="soon-box__title">데이터를 불러오지 못했습니다</div><div class="soon-box__desc">새로고침해주세요.</div></div>';
  });
}
