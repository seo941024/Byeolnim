/* ═══════════════════════════════════════════════
   믹스염색 시뮬레이터 — 여자 헤어·성형의 기준 색과 믹스 색을 고르고 비율을 조절하면
   한 캐릭터에 헤어 믹스와 렌즈 믹스를 같이 입혀 보여 준다.

   그림은 부품별로 따로 받는다(조합을 미리 다 그릴 수 없어서):
   - 기본 몸(대머리, 얼굴 없음), 얼굴 없이 헤어만 씌운 그림, 헤어 없이 얼굴만 씌운 그림
   - renderMode=1이면 전부 96×96에 발끝 위치까지 같아서, 기본 몸과 다른 픽셀만 골라
     기본 몸 → 얼굴 → 헤어 순서로 겹치면 어떤 조합이든 만들어진다
   - 믹스는 기준 색 그림 위에 믹스 색 그림을 비율만큼 섞는다

   ═══════════════════════════════════════════════════════════ */

const MX_API = 'https://maplestory.io/api';
const MX_SKIN = [2018, 12018];          // 뽀송 라벤더 피부
const MX_OUTFIT = [1051539];            // Crimson Fate Topcoat — 바탕에만 입힌다(헤어·얼굴 층은 맨몸 기준으로 뽑음)
const MX_STORE = 'gms_mixdye';

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
let _mxState = { part: 'hair', view: 'stand1', hair: _mxBlank(MX_PARTS.hair), face: _mxBlank(MX_PARTS.face) };
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
const _mxIcon = (p, r) => `${MX_API}/GMS/${window.MIXDYE_DATA.version}/item/${p.idOf(r[0], _mxColorsOf(p, r)[0])}/icon`;

function _mxSave() {
  try {
    const pick = v => ({ id: v.id, base: v.base, mix: v.mix, ratio: v.ratio, mixed: v.mixed });
    localStorage.setItem(MX_STORE, JSON.stringify({ part: _mxState.part, view: _mxState.view, hair: pick(_mxState.hair), face: pick(_mxState.face) }));
  } catch (e) {}
}
function _mxLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(MX_STORE) || 'null');
    if (!s) return;
    if (s.part === 'hair' || s.part === 'face') _mxState.part = s.part;
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
function _mxImgUrl(kind, id, view) {
  const ids = kind === 'base' ? MX_SKIN : kind === 'outfit' ? [...MX_SKIN, ...MX_OUTFIT] : [...MX_SKIN, id];
  const list = JSON.stringify(ids.map(i => ({ itemId: i, version: window.MIXDYE_DATA.version })));
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

// 지금 그려야 할 그림 주소 — 믹스를 안 하면 믹스 쪽도 기준 그림을 그대로 쓴다
function _mxUrls() {
  const H = MX_PARTS.hair, F = MX_PARTS.face, hs = _mxState.hair, fs = _mxState.face, v = _mxState.view;
  const hb = H.idOf(hs.id, hs.base), hm = _mxMixOn(H) ? H.idOf(hs.id, hs.mix) : hb;
  const u = { base: _mxImgUrl('base', 0, v), outfit: _mxImgUrl('outfit', 0, v), hb: _mxImgUrl('hair', hb, v), hm: _mxImgUrl('hair', hm, v) };
  // 뒷모습은 얼굴이 안 보여서 성형 그림이 필요 없다(뒷모습 성형 그림은 받아 두지도 않는다)
  if (v === 'stand1') {
    const fb = F.idOf(fs.id, fs.base), fm = _mxMixOn(F) ? F.idOf(fs.id, fs.mix) : fb;
    u.fb = _mxImgUrl('face', fb, v); u.fm = _mxImgUrl('face', fm, v);
  }
  return u;
}

// 옷 입은 몸 위에 얼굴 층, 그 위에 헤어 층. 층은 맨몸과 다른 픽셀이다
// (헤어 뒷머리처럼 몸에 가려진 부분은 맨몸과 같아서 층에 안 들어가고, 옷이 그대로 보인다)
function _mxCompose(g, tH, tF) {
  const base = g.base.data, n = g.base.width * g.base.height;
  const bg = g.outfit && g.outfit.data.length === base.length ? g.outfit.data : base;
  const out = new ImageData(new Uint8ClampedArray(bg), g.base.width, g.base.height);
  const d = out.data;
  const differs = (x, i) => x[i] !== base[i] || x[i + 1] !== base[i + 1] || x[i + 2] !== base[i + 2] || x[i + 3] !== base[i + 3];
  const layer = (a, b, t) => {
    if (!a || !b || a.length !== base.length || b.length !== base.length) return;
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      if (!differs(a, i) && !differs(b, i)) continue;
      for (let k = 0; k < 4; k++) d[i + k] = a[i + k] + (b[i + k] - a[i + k]) * t;
    }
  };
  if (g.fb) layer(g.fb.data, g.fm.data, tF);
  layer(g.hb.data, g.hm.data, tH);
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
  const onHair = _mxState.part === 'hair';
  const mixOn = _mxMixOn(MX_PARTS[_mxState.part]) ? 1 : 0;
  _mxPaint('mxCvBase', _mxCompose(g, onHair ? 0 : tH, onHair ? tF : 0), 2);
  _mxPaint('mxCvResult', _mxCompose(g, tH, tF), 3);
  _mxPaint('mxCvMix', _mxCompose(g, onHair ? mixOn : tH, onHair ? tF : mixOn), 2);
}

async function _mxDraw() {
  const my = ++_mxToken;
  const u = _mxUrls();
  const key = JSON.stringify(u);
  // 비율만 바뀌었으면 받은 그림으로 다시 섞기만 한다
  if (_mxCur && _mxCur.key === key) { _mxDrawCards(); return; }
  const slow = setTimeout(() => { if (my === _mxToken) _mxSetStatus('불러오는 중'); }, 150);
  try {
    const names = Object.keys(u);
    const imgs = await Promise.all(names.map(k => _mxLoadPix(u[k])));
    if (my !== _mxToken) return;
    clearTimeout(slow);
    _mxSetStatus('');
    const g = {}; names.forEach((k, i) => { g[k] = imgs[i]; });
    _mxCur = { key, g };
    _mxDrawCards();
    _mxPrefetch();
  } catch (e) {
    if (my !== _mxToken) return;
    clearTimeout(slow);
    _mxSetStatus('그림을 불러오지 못했습니다<button class="sbtn sbtn--ghost sbtn--sm mx-retry" type="button">다시 시도</button>', true);
    document.querySelectorAll('#sec-mixdye .mx-retry').forEach(b => b.addEventListener('click', _mxDraw));
  }
}

// 보고 있는 종류의 다른 색을 미리 받아 둬서 색을 바꿀 때 기다리지 않게 한다
function _mxPrefetch() {
  const p = MX_PARTS[_mxState.part], st = _mxState[p.key];
  if (p.key === 'face' && _mxState.view !== 'stand1') return;
  _mxColorsOf(p, _mxRow(p)).forEach(c => _mxLoadPix(_mxImgUrl(p.key, p.idOf(st.id, c), _mxState.view)).catch(() => {}));
}

/* ── 목록 ── */
function _mxBuildList(p) {
  const box = document.getElementById(`mxList-${p.key}`);
  const items = p.rows.map(r => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mx-item';
    b.innerHTML = `<img class="mx-item__icon" loading="lazy" alt="" onerror="this.style.visibility='hidden'">
      <span class="mx-item__text"><span class="mx-item__en"></span><span class="mx-item__ko"></span></span>`;
    b.querySelector('img').src = _mxIcon(p, r);
    b.querySelector('.mx-item__en').textContent = r[1] || `ID ${r[0]}`;
    b.querySelector('.mx-item__ko').textContent = [r[2], `ID ${r[0]}`, r[4] ? '성별 미확인' : ''].filter(Boolean).join(' · ');
    b.addEventListener('click', () => _mxSelect(p, r[0]));
    box.appendChild(b);
    return { el: b, r, key: `${r[1]} ${r[2]} ${r[2].replace(/\s+/g, '')} ${r[0]}`.toLowerCase() };
  });
  const empty = document.createElement('div');
  empty.className = 'mx-empty';
  empty.textContent = '검색 결과가 없습니다';
  box.appendChild(empty);
  _mxLists[p.key] = { box, items, empty };
}

function _mxFilter(p) {
  const st = _mxState[p.key];
  const q = st.query.trim().toLowerCase(), q2 = q.replace(/\s+/g, '');
  let shown = 0;
  for (const it of _mxLists[p.key].items) {
    const ok = (st.mixed || !it.r[4]) && (!q || it.key.includes(q) || it.key.includes(q2));
    it.el.style.display = ok ? '' : 'none';
    if (ok) shown++;
  }
  _mxLists[p.key].empty.style.display = shown ? 'none' : '';
  if (p.key === _mxState.part) document.getElementById('mxCount').textContent = q ? `검색 결과 ${shown.toLocaleString()}종` : `${shown.toLocaleString()}종`;
}

function _mxScrollToSelected(p) {
  const { box, items } = _mxLists[p.key];
  const it = items.find(x => x.r[0] === _mxState[p.key].id);
  if (it && it.el.style.display !== 'none') box.scrollTop = it.el.offsetTop - box.clientHeight / 2;
}

function _mxSelect(p, id) {
  _mxState[p.key].id = id;
  _mxFixColors(p);
  _mxRender();
}

function _mxShowPart() {
  const p = MX_PARTS[_mxState.part];
  document.querySelectorAll('#sec-mixdye .mx-tab').forEach(b => b.classList.toggle('active', b.dataset.mxpart === p.key));
  for (const k of Object.keys(MX_PARTS)) {
    _mxLists[k].box.style.display = k === p.key ? '' : 'none';
  }
  const q = document.getElementById('mxSearch');
  q.value = _mxState[p.key].query;
  q.placeholder = `${p.name} 이름 또는 ID 검색`;
  document.getElementById('mxMixed').checked = _mxState[p.key].mixed;
  document.getElementById('mxMixedLabel').textContent = `성별 미확인 ${p.name} ${p.mixedCount}종 포함`;
  document.getElementById('mxBaseLabel').textContent = `기준 ${p.word}`;
  document.getElementById('mxMixLabel').textContent = `믹스 ${p.word}`;
  document.getElementById('mxTitleBase').textContent = `기준 ${p.word} 원본`;
  document.getElementById('mxTitleMix').textContent = `믹스 ${p.word} 원본`;
  _mxBuildSwatches(p);
  _mxFilter(p);
  requestAnimationFrame(() => _mxScrollToSelected(p));
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

function _mxRender() {
  for (const p of Object.values(MX_PARTS)) _mxFixColors(p);
  const p = MX_PARTS[_mxState.part], r = _mxRow(p), st = _mxState[p.key];
  const single = _mxSingle(p, r), off = !_mxMixOn(p);
  const B = p.colors[st.base], M = p.colors[Math.max(0, st.mix)];

  for (const it of _mxLists[p.key].items) it.el.classList.toggle('active', it.r[0] === st.id);
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
  range.style.setProperty('--mx-fill', `${st.ratio}%`);
  document.querySelectorAll('#sec-mixdye [data-mxact]').forEach(b => { b.disabled = off; });
  document.getElementById('mxReadout').innerHTML = off ? '100<span>:</span>0' : `${100 - st.ratio}<span>:</span>${st.ratio}`;
  document.getElementById('mxEndBase').innerHTML = `${_mxDot(B)}${B.name}`;
  document.getElementById('mxEndMix').innerHTML = off ? '' : `${M.name}${_mxDot(M)}`;

  document.getElementById('mxCapBase').innerHTML = `${_mxDot(B)}${B.name}`;
  document.getElementById('mxCapMix').innerHTML = off ? '-' : `${_mxDot(M)}${M.name}`;
  document.getElementById('mxCapResult').innerHTML = off ? `${_mxDot(B)}${B.name} 100%` : `${_mxDot(B)}${B.name} ${100 - st.ratio}% · ${_mxDot(M)}${M.name} ${st.ratio}%`;
  document.getElementById('mxComboHair').innerHTML = _mxCombo(MX_PARTS.hair);
  document.getElementById('mxComboFace').innerHTML = _mxCombo(MX_PARTS.face);

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
    <div class="sec-head"><h2 class="sec-title">믹스염색 시뮬레이터</h2></div>
    <p class="dt-help">여자 캐릭터 헤어 ${MX_PARTS.hair.femaleCount.toLocaleString()}종·성형 ${MX_PARTS.face.femaleCount.toLocaleString()}종의 믹스 염색과 믹스 렌즈를 미리 봅니다. 기준 색 위에 믹스 색을 비율만큼 겹쳐 그리는 방식이라 실제 게임 화면과 조금 다를 수 있습니다.</p>
    <p class="dt-help mx-source">출처: <a href="https://maplestory.io" target="_blank" rel="noopener">maplestory.io</a> — GMS v${D.version} 아이템 데이터와 캐릭터 렌더링을 사용하고 착용 규칙을 참고했습니다. 게임 그림의 권리는 NEXON에 있습니다.</p>

    <div class="sf-tabs">
      <button class="sf-tab mx-tab" data-mxpart="hair"><img class="mx-tab__icon" src="images/icons/Mix_Hair_Color_Coupon.png" alt="" onerror="this.style.display='none'">헤어</button>
      <button class="sf-tab mx-tab" data-mxpart="face"><img class="mx-tab__icon" src="images/icons/Mix_Lens_Coupon.png" alt="" onerror="this.style.display='none'">성형</button>
    </div>
    <hr class="sec-sep" />

    <div class="mx-layout">
      <div class="card mx-browser">
        <input class="inp" id="mxSearch" type="search" autocomplete="off" />
        <div class="mx-filter">
          <label class="mx-check"><input type="checkbox" id="mxMixed" /><span id="mxMixedLabel"></span></label>
          <span id="mxCount"></span>
        </div>
        <div class="mx-list" id="mxList-hair"></div>
        <div class="mx-list" id="mxList-face"></div>
      </div>

      <div class="mx-work">
        <div class="card">
          <div class="mx-sel">
            <img class="mx-sel__icon" id="mxSelIcon" alt="" onerror="this.style.visibility='hidden'">
            <div class="mx-sel__text"><div class="mx-sel__name" id="mxSelName"></div><div class="mx-sel__sub" id="mxSelSub"></div></div>
          </div>
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

        <div class="mx-viewbar">
          <div class="sf-tabs mx-viewtabs">
            <button class="sf-tab mx-view" data-mxview="stand1">앞모습</button>
            <button class="sf-tab mx-view" data-mxview="ladder">뒷모습</button>
          </div>
          <span class="mx-viewnote" id="mxViewNote">뒷모습은 얼굴이 보이지 않습니다</span>
        </div>

        <div class="mx-compare">
          <div class="card mx-card mx-card--base">
            <div class="mx-stage"><canvas id="mxCvBase"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title" id="mxTitleBase"></div><div class="mx-cap__val" id="mxCapBase"></div></div>
          </div>
          <div class="card mx-card mx-card--result">
            <div class="mx-stage"><canvas id="mxCvResult"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title">믹스 결과</div><div class="mx-cap__val" id="mxCapResult"></div></div>
          </div>
          <div class="card mx-card mx-card--mix">
            <div class="mx-stage"><canvas id="mxCvMix"></canvas><div class="mx-status" style="display:none"></div></div>
            <div class="mx-cap"><div class="mx-cap__title" id="mxTitleMix"></div><div class="mx-cap__val" id="mxCapMix"></div></div>
          </div>
        </div>

        <div class="card mx-combo">
          <div class="card__title">현재 조합</div>
          <div class="mx-combo__row"><span class="mx-label">헤어</span><div class="mx-combo__val" id="mxComboHair"></div></div>
          <div class="mx-combo__row"><span class="mx-label">성형</span><div class="mx-combo__val" id="mxComboFace"></div></div>
        </div>
      </div>
    </div>`;

  for (const p of Object.values(MX_PARTS)) _mxBuildList(p);

  sec.querySelectorAll('.mx-tab').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mxpart === _mxState.part) return;
    _mxState.part = b.dataset.mxpart;
    _mxShowPart();
    _mxRender();
  }));
  document.getElementById('mxSearch').addEventListener('input', e => {
    _mxState[_mxState.part].query = e.target.value;
    _mxFilter(MX_PARTS[_mxState.part]);
  });
  document.getElementById('mxMixed').addEventListener('change', e => {
    _mxState[_mxState.part].mixed = e.target.checked;
    _mxFilter(MX_PARTS[_mxState.part]);
    _mxSave();
  });
  sec.querySelector('.mx-work').addEventListener('click', e => {
    const chip = e.target.closest('.mx-chip');
    if (chip && !chip.disabled) _mxPick(chip.dataset.role, +chip.dataset.i);
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

  _mxShowPart();
  _mxRender();
}

let _mxLoading = null, _mxInited = false;
function ensureMixdyeReady(cb) {
  const start = () => {
    if (!_mxInited) { _mxInited = true; initMixdye(); }
    else requestAnimationFrame(() => _mxScrollToSelected(MX_PARTS[_mxState.part]));
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
