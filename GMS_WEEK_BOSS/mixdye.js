/* ═══════════════════════════════════════════════
   코디 시뮬레이터 — 캐릭터 성별을 고르고 헤어·성형의 믹스 염색·믹스 렌즈와 코디 아이템 착용을
   한 캐릭터에 같이 입혀 보여 준다. 탭: 헤어 | 성형 | 피부 | 코디

   그림은 받아 둔 층 데이터로 조립한다(mixdye_layer.js). maplestory.io는 쓰지 않는다. 입고 있는 코디까지 전부 넣은 완성 그림 3장:
   - A: 기준 헤어 + 기준 렌즈, B: 믹스 헤어 + 기준 렌즈, C: 기준 헤어 + 믹스 렌즈
   - A와 B가 다른 픽셀이 헤어, A와 C가 다른 픽셀이 눈이라 그 픽셀만 비율만큼 섞는다
   - 모자에 머리가 눌리는 것 같은 착용 규칙은 조립 단계에서 처리한다
   비율만 바꿀 때는 만든 그림으로 다시 섞기만 한다.
   층 데이터가 없는 헤어·성형 색과 코디 아이템은 "데이터 없음"으로 표시하고 고를 수 없게 한다.

   성별마다 헤어·성형·피부·코디 선택을 따로 기억한다(_mxState.chars.f / .m).

   메애기 드레스룸을 보고 더한 편의 기능. 새 데이터 없이 받아 둔 그림만으로 한다
   - 결과 그림 배율 ×2·×3·×4, 좌우 반전
   - 되돌리기·다시 하기: 모습이 바뀔 때마다 두 성별 상태를 적어 둔다. Ctrl+Z, Ctrl+Y
   - 프리셋 5칸: 지금 모습과 작은 그림을 저장해 두고 눌러서 불러온다
   - 공유 링크: 지금 성별 캐릭터의 모습을 주소 ?coordi= 뒤에 담는다
   - 랜덤 코디, 목록의 찜과 최근 고른 아이템
   ═══════════════════════════════════════════════════════════ */

const MX_DEFAULT_SKIN = 12018;          // 뽀송 라벤더 피부. 몸 ID는 머리 ID - 10000
// 커스텀 뽀송 라벤더 컬러라인 피부: 게임에서 선 색을 색조·채도·명도로 바꿀 수 있는 유일한 피부.
// 원본 그림의 선은 순수한 파란색(0,0,255)이고, 그 픽셀만 바꿔 그린다
const MX_LINE_SKINS = [12042, 12043];
// 기본 헤어·성형·옷이 바뀌어(2026-10-21) 저장 키를 새로 해서 모두 새 기본값으로 시작한다
const MX_STORE = 'gms_mixdye_v3';
const MX_COORDI_DATA = 'data_coordi.js?v=20261021a';
// 무광 구간: 커스텀 믹스 기준 색 비율이 77·84·89일 때 게임은 머리 전체를 약 7% 투명하게 그린다(알파 238).
// 메애기의 넥슨 공식 그림(반쪽 병아리콩 Black·Orange, 믹스 5~25%)과 픽셀 비교로 확인 — 무광 3구간에서만
// 머리 픽셀 절반의 알파가 238이고 색은 옆 비율과 같았다. 헤어에 따라 예외가 있다는 제보도 있다
const MX_MATTE_BASE = [77, 84, 89];
const MX_MATTE_ALPHA = 238 / 255;
const MX_SEX = { f: { name: '여자', digit: 1 }, m: { name: '남자', digit: 0 } };   // digit: 아이템 ID 천의 자리 성별 값
const MX_ZOOMS = [2, 3, 4];             // 결과 그림 배율
const MX_PRESETS = 'gms_mixdye_presets_v1', MX_PRESET_N = 5;
const MX_FAV = 'gms_mixdye_fav_v1', MX_RECENT = 'gms_mixdye_recent_v1', MX_RECENT_N = 30;
const MX_SHARE_Q = 'coordi';            // 공유 링크 주소의 쿼리 이름

// 기본 상하의 — 한벌옷을 입으면 빠지고, 벗으면 돌아온다. 여자 기본 옷은 캐시 아이템이 아니라 코디 목록에 없어 이름을 여기 둔다
const MX_BASIC = {
  f: { top: [1041046, 'Pink Tanktop'], bottom: [1061039, 'Pink Cotton Boxers'] },
  m: { top: [1042162, 'Blue-Striped Undershirt'], bottom: [1062112, 'Underpants'] },
};

const MX_PARTS = {
  hair: {
    // 기본: 여자 Cutie Hair 주황색, 남자 Toben Hair 검은색
    key: 'hair', name: '헤어', word: '색', def: { f: [31000, 2], m: [30000, 0] },
    idOf: (s, c) => s + c,
    // 인게임 미용실 표기(예: "Blue 55 : Hazel 45"). 3번은 옛 헤어 이름에 Blonde로 남아 있지만 지금은 Yellow,
    // 6번은 Violet, 7번은 Hazel
    // 칩 색은 실제 헤어보다 진하게 잡아 서로 구분되게 했다
    colors: [
      { name: 'Black', sw: '#2e2c2c' }, { name: 'Red', sw: '#e0414f' },
      { name: 'Orange', sw: '#f07b2e' }, { name: 'Yellow', sw: '#f0c541' },
      { name: 'Green', sw: '#3ea55a' }, { name: 'Blue', sw: '#3a7fdc' },
      { name: 'Violet', sw: '#a04fc8' }, { name: 'Hazel', sw: '#8a5636' },
    ],
  },
  face: {
    // 기본: 여자 Defiant Face 자주색(Amethyst) 렌즈, 남자 Defiant Face 파란 렌즈
    key: 'face', name: '성형', word: '렌즈', def: { f: [21000, 7], m: [20000, 1] },
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

const _mxBlank = (p, g) => ({ id: p.def[g][0], base: p.def[g][1], mix: -1, ratio: 50 });
const _mxSkinBlank = () => ({ id: MX_DEFAULT_SKIN, tone: 0, chroma: 0, bright: 0 });
const _mxChar = g => ({ hair: _mxBlank(MX_PARTS.hair, g), face: _mxBlank(MX_PARTS.face, g), worn: {}, skin: _mxSkinBlank() });
let _mxState = {
  part: 'hair', view: 'stand1', g: 'f',
  chars: { f: _mxChar('f'), m: _mxChar('m') },
  coordi: { slot: 'hat', other: false },
  q: '',
  zoom: 3, flip: false, show: 'all',    // 결과 그림 배율, 좌우 반전, 목록 보기 전체·찜·최근
};
// 헤어·성형 상태는 지금 고른 성별의 것을 가리킨다
Object.defineProperty(_mxState, 'hair', { get() { return this.chars[this.g].hair; } });
Object.defineProperty(_mxState, 'face', { get() { return this.chars[this.g].face; } });
let _mxLists = {};

/* ── 작은 도우미 ── */
const _mxHas = (r, c) => (r[3] >> c) & 1;
// 층 데이터가 있는 색만. 데이터 정보는 mixdye_layer.js _mxAvail
const _mxColorsOf = (p, r, g = _mxState.g) => p.colors.map((_, c) => c).filter(c => _mxHas(r, c) && (_mxAvail(`${p.key}-${g}`, r[0]) >> c & 1));
const _mxRow = p => p.byId.get(_mxState[p.key].id);
// 믹스 색 -1은 믹스 안 함
const _mxMixOn = p => _mxColorsOf(p, _mxRow(p)).length >= 2 && _mxState[p.key].mix >= 0;
const _mxDot = c => `<span class="mx-dot" style="background:${c.sw}"></span>`;
const _mxDotName = c => `${_mxDot(c)}${c.name}`;
const _mxCD = () => window.COORDI_DATA;
const _mxSlotName = key => (_mxCD()?.parts.find(p => p.key === key) || {}).name || ({ top: '상의', bottom: '하의' }[key] || key);
const _mxWorn = () => _mxState.chars[_mxState.g].worn;
const _mxSkin = () => _mxState.chars[_mxState.g].skin;
const _mxSkins = () => window.MIXDYE_DATA.skins || [];
const _mxSkinRow = id => _mxSkins().find(r => r[0] === id);
const _mxSkinName = id => (_mxSkinRow(id) || [0, `ID ${id}`])[1];

// 실제로 입히는 코디: 고른 것 + 한벌옷이 없으면 비어 있는 상의·하의 자리에 기본 옷
function _mxEffectiveWorn() {
  const w = _mxWorn(), out = { ...w };
  if (!w.overall) {
    const B = MX_BASIC[_mxState.g];
    if (!w.top) out.top = B.top[0];
    if (!w.bottom) out.bottom = B.bottom[0];
  }
  return out;
}
const _mxIsBasic = (slot, id) => { const b = MX_BASIC[_mxState.g][slot]; return !!b && b[0] === id && _mxWorn()[slot] !== id; };

// 캐릭터 한 명을 저장할 모양으로. 저장값·프리셋·공유 링크가 같이 쓴다
function _mxCharOut(c) {
  const pick = v => ({ id: v.id, base: v.base, mix: v.mix, ratio: v.ratio });
  return { hair: pick(c.hair), face: pick(c.face), worn: { ...c.worn }, skin: { ...c.skin } };
}

function _mxSave() {
  try {
    const chars = {};
    for (const g of Object.keys(MX_SEX)) chars[g] = _mxCharOut(_mxState.chars[g]);
    localStorage.setItem(MX_STORE, JSON.stringify({
      v: 2, part: _mxState.part, view: _mxState.view, g: _mxState.g, chars,
      coordi: { slot: _mxState.coordi.slot, other: _mxState.coordi.other },
      zoom: _mxState.zoom, flip: _mxState.flip, show: _mxState.show,
    }));
  } catch (e) {}
}

// 저장값·프리셋·공유 링크에서 읽은 캐릭터 한 명을 dst에 옮긴다. 목록에 없는 값은 버린다.
// 코디 아이템 ID는 목록을 받은 뒤 _mxCoordiReady에서, 층 데이터는 _mxDropMissing에서 다시 확인한다
function _mxCharFrom(g, src, dst) {
  for (const p of Object.values(MX_PARTS)) {
    const v = src[p.key]; if (!v) continue;
    const ok = n => Number.isInteger(n) && n >= 0 && n < p.colors.length;
    const st = dst[p.key];
    if (p.byIdBy[g].has(v.id)) st.id = v.id;
    if (ok(v.base)) st.base = v.base;
    if (ok(v.mix) || v.mix === -1) st.mix = v.mix;
    if (v.ratio >= 1 && v.ratio <= 99) st.ratio = v.ratio;
  }
  if (src.worn && typeof src.worn === 'object') {
    dst.worn = {};
    for (const [k, v] of Object.entries(src.worn)) if (Number.isInteger(v)) dst.worn[k] = v;
  }
  const sk = src.skin;
  if (sk && _mxSkinRow(sk.id)) {
    const n = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : 0;
    dst.skin = { id: sk.id, tone: n(sk.tone, 0, 359), chroma: n(sk.chroma, -99, 99), bright: n(sk.bright, -99, 99) };
  }
  return dst;
}
function _mxLoad() {
  try {
    const s = JSON.parse(localStorage.getItem(MX_STORE) || 'null');
    if (!s) return;
    if (['hair', 'face', 'coordi', 'skin'].includes(s.part)) _mxState.part = s.part;
    if (s.view === 'stand1' || s.view === 'ladder') _mxState.view = s.view;
    if (s.g === 'f' || s.g === 'm') _mxState.g = s.g;
    // 성별 기능 전에 저장된 값(v 없음)은 여자 캐릭터 것으로 옮긴다
    const chars = s.v === 2 ? s.chars : { f: { hair: s.hair, face: s.face, worn: s.coordi && s.coordi.worn } };
    for (const g of Object.keys(MX_SEX)) {
      const src = chars && chars[g];
      if (src) _mxCharFrom(g, src, _mxState.chars[g]);
    }
    if (s.coordi && typeof s.coordi.slot === 'string') _mxState.coordi.slot = s.coordi.slot;
    _mxState.coordi.other = !!(s.coordi && (s.coordi.other || s.coordi.male));
    if (MX_ZOOMS.includes(s.zoom)) _mxState.zoom = s.zoom;
    _mxState.flip = !!s.flip;
    if (['all', 'fav', 'recent'].includes(s.show)) _mxState.show = s.show;
  } catch (e) {}
  try { _mxFav = JSON.parse(localStorage.getItem(MX_FAV) || '{}') || {}; } catch (e) {}
  try { _mxRecent = JSON.parse(localStorage.getItem(MX_RECENT) || '{}') || {}; } catch (e) {}
  try { const ps = JSON.parse(localStorage.getItem(MX_PRESETS) || '[]'); if (Array.isArray(ps)) _mxPresets = ps.slice(0, MX_PRESET_N); } catch (e) {}
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
// 그림 하나를 "동작:피부:ID들" 열쇠로 부른다. 같은 열쇠는 한 번만 조립한다(mixdye_layer.js)
// hairId가 null이면 머리 없이 그린다(무광 구간에서 머리 뒤를 알아내는 용도)
function _mxPixKey(hairId, faceId, view) {
  const items = [faceId, ...(hairId ? [hairId] : []), ...Object.values(_mxEffectiveWorn())];
  return `${view}:${_mxSkin().id}:${items.join(',')}`;
}

const _mxPix = new Map();
const _mxLoadPix = key => _mxOnce(_mxPix, key, () => {
  const [view, skin, ids] = key.split(':');
  return _mxLayerCompose(view, Number(skin), ids ? ids.split(',').map(Number) : []);
});

// 믹스를 안 하면 B·C가 A와 같은 열쇠라 조립도 한 번만 한다
function _mxPixKeys() {
  const H = MX_PARTS.hair, F = MX_PARTS.face, hs = _mxState.hair, fs = _mxState.face, v = _mxState.view;
  const hb = H.idOf(hs.id, hs.base), hm = _mxMixOn(H) ? H.idOf(hs.id, hs.mix) : hb;
  const fb = F.idOf(fs.id, fs.base), fm = _mxMixOn(F) ? F.idOf(fs.id, fs.mix) : fb;
  const u = { a: _mxPixKey(hb, fb, v), b: _mxPixKey(hm, fb, v), c: _mxPixKey(hb, fm, v) };
  // 무광 구간이면 머리를 뺀 그림도 만든다(렌즈 믹스 중이면 믹스 렌즈 쪽도)
  if (_mxMatte()) {
    u.d = _mxPixKey(null, fb, v);
    if (fm !== fb) u.e = _mxPixKey(null, fm, v);
  }
  // 맨몸 그림: 무광 윤곽선 처리와 커스텀 피부 색 조절에서 피부가 보이는 자리를 찾는 용도
  if (_mxMatte() || _mxIsCustom(_mxSkin().id)) u.s = `${v}:${_mxSkin().id}:`;
  return u;
}
const _mxMatte = () => _mxMixOn(MX_PARTS.hair) && MX_MATTE_BASE.includes(100 - _mxState.hair.ratio);

function _mxCompose(g, tH, tF, matte) {
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
  // 무광: 머리 픽셀(머리 없는 그림과 다른 곳)을 머리 뒤 그림 위에 93% 불투명도로 다시 얹는다
  if (matte && g.d && g.d.data.length === a.length) {
    const D = g.d.data, E = g.e && g.e.data.length === a.length ? g.e.data : null;
    const S = g.s && g.s.data.length === a.length ? g.s.data : null, W = g.a.width;
    // 맨몸의 바깥 윤곽선: 불투명한데 위아래좌우 중 투명한 칸이 있는 픽셀
    const edge = p => {
      if (!S || S[p * 4 + 3] === 0) return false;
      const x = p % W, y = (p - x) / W;
      const empty = q => S[q * 4 + 3] === 0;
      return x === 0 || y === 0 || x === W - 1 || p + W >= n || empty(p - 1) || empty(p + 1) || empty(p - W) || empty(p + W);
    };
    for (let p = 0, i = 0; p < n; p++, i += 4) {
      if (a[i] === D[i] && a[i + 1] === D[i + 1] && a[i + 2] === D[i + 2] && a[i + 3] === D[i + 3]) continue;
      // 머리 아래 윤곽선은 비치게 하지 않는다(게임에서는 머리 가운데에 띠로 보이지 않음)
      if (edge(p) && D[i] === S[i] && D[i + 1] === S[i + 1] && D[i + 2] === S[i + 2] && D[i + 3] === S[i + 3]) continue;
      const u = [0, 1, 2, 3].map(k => E && tF > 0 ? D[i + k] + (E[i + k] - D[i + k]) * tF : D[i + k]);
      const sa = d[i + 3] / 255 * MX_MATTE_ALPHA, da = u[3] / 255;
      const oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) d[i + k] = oa ? (d[i + k] * sa + u[k] * da * (1 - sa)) / oa : 0;
      d[i + 3] = oa * 255;
    }
  }
  return out;
}

// 영문 이름에 Custom이 붙은 피부만 색조·채도·명도 조절
const _mxIsCustom = id => /^Custom /.test(_mxSkinName(id));
const _mxIsLine = id => MX_LINE_SKINS.includes(id);
const _mxHasShift = sk => _mxIsCustom(sk.id) && (sk.tone || sk.chroma || sk.bright);

/* 색조·채도·명도 변환. 컬러라인 선을 메애기에 등록된 넥슨 공식 그림 9가지와 맞춘 근사식이다.
   - 색상: 원래 색상 + 색조 (9가지 모두 일치)
   - 채도: 원래 채도 × ((100 + 채도) / 100)²
   - 밝기: 밝게는 남은 밝기의 0.4배까지, 어둡게는 현재 밝기에 비례 — HSL 기준
   넥슨 그림이 색을 16단계로 줄여 내려 주는 탓에 더 정밀하게는 못 맞췄다(9가지 중 6가지 일치).
   컬러라인이 아닌 커스텀 피부는 같은 식을 피부 전체에 적용한 근사치다 */
function _mxShift([r, g, b], sk) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
  }
  h = (h + sk.tone / 360) % 1;
  s = Math.min(1, Math.max(0, s * ((100 + sk.chroma) / 100) ** 2));
  l = Math.min(1, Math.max(0, sk.bright >= 0 ? l + (1 - l) * 0.4 * sk.bright / 100 : l * (1 + sk.bright / 100)));
  const f = t => {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    t = (t + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

// 컬러라인은 파란 선만, 그 밖의 커스텀 피부는 맨몸 그림과 같은 자리·같은 색인 픽셀만 바꾼다.
// main은 색 견본에 쓰는 대표 색
const _mxSkinColors = new Map();
function _mxColorsOfSkin(id) {
  // 머리카락과 겹친 선은 파랑이 섞인 색으로 그려져서, 파랑이 뚜렷한 색을 모두 선으로 본다
  if (_mxIsLine(id)) return { has: (r, g, b) => b >= 200 && b - Math.max(r, g) >= 150, main: [0, 0, 255] };
  if (_mxSkinColors.has(id)) return _mxSkinColors.get(id);
  _mxSkinColors.set(id, null);
  // 그 피부의 맨몸 그림에서 고른다
  _mxLoadPix(`stand1:${id}:`).then(img => {
    const cnt = new Map(), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (c === 0 || c === 0xffffff) continue;
      cnt.set(c, (cnt.get(c) || 0) + 1);
    }
    // 대표 색: 진한 색 중 가장 많이 쓰인 색, 없으면 가장 많이 쓰인 색
    const vivid = ([c]) => Math.max(c >> 16, (c >> 8) & 255, c & 255) - Math.min(c >> 16, (c >> 8) & 255, c & 255) >= 60;
    const byCount = [...cnt].sort((x, y) => y[1] - x[1]);
    const top = byCount.find(vivid) || byCount[0];
    const main = top ? [top[0] >> 16, (top[0] >> 8) & 255, top[0] & 255] : [0, 0, 0];
    _mxSkinColors.set(id, { main });
    if (_mxSkin().id === id) _mxRender();
  }).catch(() => _mxSkinColors.delete(id));
  return null;
}

function _mxApplyLine(img) {
  const sk = _mxSkin();
  if (!_mxHasShift(sk)) return img;
  const d = img.data, S = _mxCur && _mxCur.g.s && _mxCur.g.s.data.length === d.length ? _mxCur.g.s.data : null;
  let has;
  if (_mxIsLine(sk.id)) has = _mxColorsOfSkin(sk.id).has;
  else if (S) has = (r, g, b, i) => S[i + 3] > 0 && S[i] === r && S[i + 1] === g && S[i + 2] === b && (r | g | b) !== 0 && (r & g & b) !== 255;
  else return img;
  const memo = new Map();
  for (let i = 0; i < d.length; i += 4) {
    if (!has(d[i], d[i + 1], d[i + 2], i)) continue;
    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (!memo.has(c)) memo.set(c, _mxShift([d[i], d[i + 1], d[i + 2]], sk));
    const v = memo.get(c);
    d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2];
  }
  return img;
}

function _mxPaint(id, img, scale) {
  img = _mxApplyLine(img);
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
  _mxPaint('mxCvResult', _mxCompose(g, tH, tF, _mxMatte()), _mxZoomNow());
  if (_mxState.part === 'coordi' || _mxState.part === 'skin') return;
  const onHair = _mxState.part === 'hair';
  const mixOn = _mxMixOn(MX_PARTS[_mxState.part]) ? 1 : 0;
  _mxPaint('mxCvBase', _mxCompose(g, onHair ? 0 : tH, onHair ? tF : 0), 2);
  _mxPaint('mxCvMix', _mxCompose(g, onHair ? mixOn : tH, onHair ? tF : mixOn), 2);
}

async function _mxDraw() {
  const my = ++_mxToken;
  const u = _mxPixKeys();
  const key = JSON.stringify(u);
  // 비율만 바뀌었으면 만든 그림으로 다시 섞기만 한다
  // 앞서 걸어 둔 요청이 끝나지 않은 채 되돌아온 경우에도 로딩·오류 안내는 지운다
  if (_mxCur && _mxCur.key === key) { _mxSetStatus(''); _mxDrawCards(); return; }
  const slow = setTimeout(() => { if (my === _mxToken) _mxSetStatus('데이터를 불러오는 중입니다'); }, 150);
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

// 헤어·성형 탭에서는 다른 색 그림을 미리 받아 둬서 색을 바꿀 때 기다리지 않게 한다
function _mxPrefetch() {
  const part = _mxState.part;
  if (part === 'coordi' || part === 'skin') return;
  const H = MX_PARTS.hair, F = MX_PARTS.face, hs = _mxState.hair, fs = _mxState.face, v = _mxState.view;
  const hb = H.idOf(hs.id, hs.base), fb = F.idOf(fs.id, fs.base);
  if (part === 'hair') _mxColorsOf(H, _mxRow(H)).forEach(c => _mxLoadPix(_mxPixKey(H.idOf(hs.id, c), fb, v)).catch(() => {}));
  else if (v === 'stand1') _mxColorsOf(F, _mxRow(F)).forEach(c => _mxLoadPix(_mxPixKey(hb, F.idOf(fs.id, c), v)).catch(() => {}));
}

/* ── 목록 ── */
// 목록은 처음 볼 때 만든다. item(r): { en, tag: 덧붙일 설명, pick: 누를 때, off: 층 데이터가 없어 고를 수 없음, hide: 체크박스를 켜야 보이는지·코디만 }
function _mxMakeList(key, rows, item) {
  if (_mxLists[key]) return;
  const box = document.createElement('div');
  box.className = 'mx-list';
  box.style.display = 'none';
  document.getElementById('mxLists').appendChild(box);
  const empty = document.createElement('div');
  empty.className = 'mx-empty';
  empty.textContent = '검색 결과가 없습니다';
  const L = _mxLists[key] = { box, items: [], empty };
  for (const r of rows) {
    const { en, tag, pick, off, hide } = item(r);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mx-item' + (off ? ' is-off' : '');
    b.disabled = off;
    b.innerHTML = `<img class="mx-item__icon" loading="lazy" alt="" onerror="this.style.visibility='hidden'">
    <span class="mx-item__text"><span class="mx-item__en"></span><span class="mx-item__ko"></span></span>
    <span class="mx-item__fav" title="찜">★</span>`;
    b.classList.toggle('is-fav', (_mxFav[key] || []).includes(r[0]));
    _mxPutIcon(b.querySelector('img'), key, r[0], 36);
    b.querySelector('.mx-item__en').textContent = en;
    b.querySelector('.mx-item__ko').textContent = [r[2], `ID ${r[0]}`, tag, off ? '데이터 없음' : ''].filter(Boolean).join(' · ');
    // 별표를 누르면 찜만 바꾸고 입히지는 않는다
    if (!off) b.addEventListener('click', e => {
      if (e.target.closest('.mx-item__fav')) { _mxToggleFav(key, r[0], b); return; }
      _mxNoteRecent(key, r[0]);
      pick();
    });
    box.appendChild(b);
    L.items.push({ el: b, id: r[0], hide, key: `${r[1]} ${r[2]} ${r[2].replace(/\s+/g, '')} ${r[0]}`.toLowerCase() });
  }
  box.appendChild(empty);
}

// 헤어·성형 목록은 성별마다 따로
const _mxBuildList = p => _mxMakeList(`${p.key}-${_mxState.g}`, p.rows, r => ({
  en: r[1] || `ID ${r[0]}`, tag: r[4] ? '성별 미확인' : '', pick: () => _mxSelect(p, r[0]), off: !_mxColorsOf(p, r).length,
}));

// 피부 목록 — 성별과 상관없이 하나
const _mxBuildSkinList = () => _mxMakeList('skin', _mxSkins(), r => ({
  en: r[1], tag: /^Custom /.test(r[1]) ? '색 조절 가능' : '', pick: () => { _mxSkin().id = r[0]; _mxRender(); }, off: !_mxAvail('skin', r[0]),
}));

// 코디 부위 목록은 그 부위를 처음 열 때 만든다(전체 약 1만 개라 한꺼번에 만들지 않음). 지금 성별 전용이나 공용이 아니면 숨긴다
const _mxBuildSlotList = slot => _mxMakeList(`coordi-${slot}`, _mxCD().items[slot] || [], r => ({
  en: r[1], tag: r[3] === 0 ? '남자' : r[3] === 1 ? '여자' : '', pick: () => _mxToggleWear(slot, r[0]), off: !_mxAvail(`coordi-${slot}`, r[0]),
  hide: () => r[3] !== 2 && r[3] !== MX_SEX[_mxState.g].digit,
}));

function _mxCurrentListKey() {
  if (_mxState.part === 'skin') return 'skin';
  return _mxState.part === 'coordi' ? `coordi-${_mxState.coordi.slot}` : `${_mxState.part}-${_mxState.g}`;
}
// 지금 목록에서 고른 아이템
function _mxSelId() {
  const part = _mxState.part;
  return part === 'coordi' ? _mxWorn()[_mxState.coordi.slot] : part === 'skin' ? _mxSkin().id : _mxState[part].id;
}

function _mxFilter() {
  const L = _mxLists[_mxCurrentListKey()];
  if (!L) return;
  // 게임 미용실 이름을 그대로 붙여 넣어도 찾히게 앞의 ColorBlend는 뺀다
  const q = _mxState.q.trim().toLowerCase().replace(/^colorblend\s*/, ''), q2 = q.replace(/\s+/g, '');
  // 성별 미확인 헤어·성형은 항상 보이고, 코디만 반대 성별 아이템을 체크박스로 켠다
  const showHidden = _mxState.part !== 'coordi' || _mxState.coordi.other;
  // 찜은 목록 순서 그대로, 최근은 고른 차례대로 위에서부터 보인다
  const key = _mxCurrentListKey(), mode = _mxState.show;
  const fav = new Set(_mxFav[key] || []), rec = _mxRecent[key] || [];
  let shown = 0;
  for (const it of L.items) {
    const inMode = mode === 'all' || (mode === 'fav' ? fav.has(it.id) : rec.includes(it.id));
    const ok = inMode && (showHidden || !it.hide()) && (!q || it.key.includes(q) || it.key.includes(q2));
    it.el.style.display = ok ? '' : 'none';
    it.el.style.order = mode === 'recent' && ok ? rec.indexOf(it.id) : '';
    if (ok) shown++;
  }
  L.empty.textContent = mode === 'fav' && !q ? '찜한 아이템이 없습니다' : mode === 'recent' && !q ? '최근 고른 아이템이 없습니다' : '검색 결과가 없습니다';
  L.empty.style.display = shown ? 'none' : '';
  document.querySelectorAll('#sec-mixdye .mx-show').forEach(b => b.classList.toggle('active', b.dataset.mxshow === mode));
  document.getElementById('mxCount').textContent = q ? `검색 결과 ${shown.toLocaleString()}종` : `${shown.toLocaleString()}종`;
}

/* ── 찜·최근 ── 목록마다 따로 적는다. 헤어·성형은 성별 목록마다, 코디는 부위마다 */
let _mxFav = {}, _mxRecent = {};
function _mxToggleFav(key, id, el) {
  const a = _mxFav[key] || (_mxFav[key] = []), i = a.indexOf(id);
  if (i >= 0) a.splice(i, 1); else a.push(id);
  el.classList.toggle('is-fav', i < 0);
  try { localStorage.setItem(MX_FAV, JSON.stringify(_mxFav)); } catch (e) {}
  if (_mxState.show === 'fav') _mxFilter();
}
function _mxNoteRecent(key, id) {
  const a = (_mxRecent[key] || []).filter(x => x !== id);
  a.unshift(id);
  _mxRecent[key] = a.slice(0, MX_RECENT_N);
  try { localStorage.setItem(MX_RECENT, JSON.stringify(_mxRecent)); } catch (e) {}
}

function _mxScrollToSelected() {
  const L = _mxLists[_mxCurrentListKey()];
  if (!L) return;
  const id = _mxSelId(), it = L.items.find(x => x.id === id);
  L.box.scrollTop = it && it.el.style.display !== 'none' ? it.el.offsetTop - L.box.clientHeight / 2 : 0;
}

function _mxSelect(p, id) {
  _mxState[p.key].id = id;
  _mxFixColors(p);
  _mxRender();
}

/* ── 코디 ── */
// 한벌옷을 입으면 상의·하의가 빠지고, 상의나 하의를 입으면 한벌옷이 빠진다
function _mxToggleWear(slot, id) {
  const w = _mxWorn();
  if (w[slot] === id) delete w[slot];
  else {
    w[slot] = id;
    if (slot === 'overall') { delete w.top; delete w.bottom; }
    if (slot === 'top' || slot === 'bottom') delete w.overall;
  }
  _mxRender();
}

// 목록을 받은 뒤 저장돼 있던 착용 아이템이 실제로 있는지 확인한다
function _mxCoordiReady() {
  const D = _mxCD(), c = _mxState.coordi;
  if (!D.parts.some(p => p.key === c.slot)) c.slot = D.parts[0].key;
  for (const ch of Object.values(_mxState.chars)) {
    for (const [slot, id] of Object.entries(ch.worn)) {
      if (!(D.items[slot] || []).some(r => r[0] === id)) delete ch.worn[slot];
    }
  }
  document.getElementById('mxSlots').innerHTML = D.parts.map(p =>
    `<button type="button" class="mx-slot" data-slot="${p.key}">${p.name}</button>`).join('');
}

// 저장돼 있던 헤어·성형·피부·코디 중 층 데이터가 없는 것은 기본값으로 되돌리거나 벗긴다
function _mxDropMissing() {
  for (const g of Object.keys(MX_SEX)) {
    const ch = _mxState.chars[g];
    for (const p of Object.values(MX_PARTS)) {
      const r = p.byIdBy[g].get(ch[p.key].id);
      if (!r || !_mxColorsOf(p, r, g).length) Object.assign(ch[p.key], _mxBlank(p, g));
    }
    for (const [slot, id] of Object.entries(ch.worn)) if (!_mxAvail(`coordi-${slot}`, id)) delete ch.worn[slot];
    if (!_mxAvail('skin', ch.skin.id)) ch.skin = _mxSkinBlank();
  }
}

/* ── 탭·성별 전환 ── */
async function _mxShowPart() {
  // 목록 아이콘과 데이터 있는 색·아이템 정보를 먼저 받는다. 저장돼 있던 선택 중 데이터 없는 것은 기본값으로
  if (_mxIcons === null) { await _mxIconsLoad(); _mxDropMissing(); }
  const part = _mxState.part, coordi = part === 'coordi', skinTab = part === 'skin';
  const sec = document.getElementById('sec-mixdye');
  sec.querySelectorAll('.mx-tab').forEach(b => b.classList.toggle('active', b.dataset.mxpart === part));
  sec.querySelectorAll('.mx-sex').forEach(b => b.classList.toggle('active', b.dataset.mxg === _mxState.g));
  sec.classList.toggle('is-coordi', coordi);
  sec.classList.toggle('is-skin', skinTab);
  document.getElementById('mxSelIcon').classList.toggle('mx-skin-icon', skinTab);

  if (coordi && !window.COORDI_DATA) {
    for (const L of Object.values(_mxLists)) L.box.style.display = 'none';
    document.getElementById('mxCount').textContent = '';
    try {
      document.getElementById('mxSlots').innerHTML = '<span class="mx-hint">코디 목록을 불러오는 중</span>';
      await loadScriptOnce(MX_COORDI_DATA);
      _mxCoordiReady();
    } catch (e) {
      document.getElementById('mxSlots').innerHTML = '<span class="mx-hint">코디 목록을 불러오지 못했습니다. 새로고침해 주세요.</span>';
      return;
    }
    if (_mxState.part !== 'coordi') return;
  }

  if (coordi) _mxBuildSlotList(_mxState.coordi.slot);
  else if (skinTab) _mxBuildSkinList();
  else _mxBuildList(MX_PARTS[part]);
  const key = _mxCurrentListKey();
  for (const [k, L] of Object.entries(_mxLists)) L.box.style.display = k === key ? '' : 'none';

  // 탭·부위·성별을 바꾸면 검색어는 비운다(고른 아이템은 그대로)
  _mxState.q = '';
  const q = document.getElementById('mxSearch');
  q.value = '';
  if (coordi) {
    q.placeholder = `${_mxSlotName(_mxState.coordi.slot)} 이름 또는 ID 검색`;
    document.getElementById('mxMixed').checked = _mxState.coordi.other;
    document.getElementById('mxMixedLabel').textContent = `${_mxState.g === 'f' ? '남자' : '여자'} 아이템도 보기`;
  } else if (skinTab) {
    q.placeholder = '피부 이름 또는 ID 검색';
  } else {
    const p = MX_PARTS[part];
    q.placeholder = `${p.name} 이름 또는 ID 검색`;
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
  const name = `<b>${escHtml(r[1] || `ID ${r[0]}`)}</b>`, base = _mxDotName(C[st.base]);
  if (!_mxMixOn(p)) return `${name}${base} 100%`;
  return `${name}${base} ${100 - st.ratio}%${_mxDotName(C[st.mix])} ${st.ratio}%`;
}

function _mxWornName(slot, id) {
  const basic = MX_BASIC[_mxState.g][slot];
  if (basic && basic[0] === id) return basic[1];
  const r = _mxCD() && (_mxCD().items[slot] || []).find(x => x[0] === id);
  return r ? r[1] : `ID ${id}`;
}

function _mxSkinText() {
  const sk = _mxSkin();
  const line = _mxIsCustom(sk.id) ? ` 색조 ${sk.tone} · 채도 ${sk.chroma} · 명도 ${sk.bright}` : '';
  return `<b>${escHtml(_mxSkinName(sk.id))}</b>${line}`;
}

function _mxRenderSkinCard() {
  const sk = _mxSkin(), line = _mxIsCustom(sk.id);
  _mxPutIcon(document.getElementById('mxSelIcon'), 'skin', sk.id, 44);
  const r = _mxSkinRow(sk.id) || [sk.id, '', ''];
  document.getElementById('mxSelName').textContent = r[1] || `ID ${sk.id}`;
  document.getElementById('mxSelSub').textContent = [r[2], `ID ${sk.id}`].filter(Boolean).join(' · ');
  document.getElementById('mxLineBox').style.display = line ? '' : 'none';
  document.getElementById('mxLineHint').style.display = line ? 'none' : '';
  for (const k of ['tone', 'chroma', 'bright']) {
    document.getElementById(`mxLine-${k}`).value = sk[k];
    document.getElementById(`mxLineVal-${k}`).textContent = sk[k];
  }
  const C = line && _mxColorsOfSkin(sk.id);
  const [cr, cg, cb] = C ? _mxShift(C.main, sk) : [0, 0, 255];
  document.getElementById('mxLineSwatch').style.background = `rgb(${cr},${cg},${cb})`;
  document.getElementById('mxLineLabel').textContent = _mxIsLine(sk.id) ? '선 색' : '대표 색';
}

function _mxRenderCombo() {
  let html = `
    <div class="mx-combo__row"><span class="mx-label">성별</span><div class="mx-combo__val"><b>${MX_SEX[_mxState.g].name}</b></div></div>
    <div class="mx-combo__row"><span class="mx-label">헤어</span><div class="mx-combo__val">${_mxCombo(MX_PARTS.hair)}</div></div>
    <div class="mx-combo__row"><span class="mx-label">성형</span><div class="mx-combo__val">${_mxCombo(MX_PARTS.face)}</div></div>
    <div class="mx-combo__row"><span class="mx-label">피부</span><div class="mx-combo__val">${_mxSkinText()}</div></div>`;
  const D = _mxCD(), eff = _mxEffectiveWorn();
  const order = D ? D.parts.map(p => p.key) : Object.keys(eff);
  for (const slot of order) {
    const id = eff[slot];
    if (!id) continue;
    const tail = _mxIsBasic(slot, id)
      ? '<span class="mx-basic">기본</span>'
      : `<button type="button" class="sbtn sbtn--ghost mx-unwear" data-slot="${slot}" title="벗기">-</button>`;
    html += `<div class="mx-combo__row"><span class="mx-label">${_mxSlotName(slot)}</span>
      <div class="mx-combo__val"><b>${escHtml(_mxWornName(slot, id))}</b>${tail}</div></div>`;
  }
  document.getElementById('mxCombo').innerHTML = html;
}

function _mxRenderCoordiCard() {
  const slot = _mxState.coordi.slot, w = _mxWorn(), id = w[slot], shown = _mxEffectiveWorn()[slot];
  document.querySelectorAll('#sec-mixdye .mx-slot').forEach(b => {
    b.classList.toggle('active', b.dataset.slot === slot);
    b.classList.toggle('is-worn', !!w[b.dataset.slot]);
  });
  const icon = document.getElementById('mxSelIcon');
  icon.style.visibility = id ? '' : 'hidden';
  if (id) _mxPutIcon(icon, `coordi-${slot}`, id, 44);
  const name = _mxSlotName(slot);
  document.getElementById('mxSelName').textContent = shown ? _mxWornName(slot, shown) : `${name} 없음`;
  document.getElementById('mxSelSub').textContent =
    id ? `${name} 착용 중 · ID ${id}`
    : shown ? `기본 ${name} · 목록에서 아이템을 누르면 바꿔 입습니다`
    : slot === 'top' || slot === 'bottom' ? '한벌옷을 입고 있어 비어 있습니다' : '목록에서 아이템을 누르면 입습니다';
}

function _mxRender() {
  for (const p of Object.values(MX_PARTS)) _mxFixColors(p);
  const coordi = _mxState.part === 'coordi', skinTab = _mxState.part === 'skin';
  const key = _mxCurrentListKey(), L = _mxLists[key], sel = _mxSelId();
  if (L) for (const it of L.items) it.el.classList.toggle('active', it.id === sel);

  if (coordi) {
    if (window.COORDI_DATA) _mxRenderCoordiCard();
  } else if (skinTab) {
    _mxRenderSkinCard();
  } else {
    const p = MX_PARTS[_mxState.part], r = _mxRow(p), st = _mxState[p.key];
    const avail = _mxColorsOf(p, r), single = avail.length < 2, off = !_mxMixOn(p);
    const B = p.colors[st.base], M = p.colors[Math.max(0, st.mix)], b0 = _mxDotName(B), m0 = _mxDotName(M);

    _mxPutIcon(document.getElementById('mxSelIcon'), key, r[0], 44);
    document.getElementById('mxSelName').textContent = r[1] || `ID ${r[0]}`;
    document.getElementById('mxSelSub').textContent = [r[2], `ID ${r[0]}`, `${p.word} ${avail.length}종`,
      single ? `${p.word}이 하나뿐이라 믹스 불가` : '', r[4] ? '성별 미확인' : ''].filter(Boolean).join(' · ');

    document.querySelectorAll('#mxBaseChips .mx-chip').forEach(b => {
      const i = +b.dataset.i;
      b.classList.toggle('active', i === st.base);
      b.disabled = !avail.includes(i);
    });
    document.querySelectorAll('#mxMixChips .mx-chip').forEach(b => {
      const i = +b.dataset.i;
      b.classList.toggle('active', i === -1 ? off : !off && i === st.mix);
      b.disabled = i === -1 ? single : single || !avail.includes(i) || i === st.base;
    });

    const range = document.getElementById('mxRatio');
    range.value = st.ratio;
    range.disabled = off;
    document.querySelectorAll('#sec-mixdye [data-mxact]').forEach(b => { b.disabled = off; });
    const matte = p.key === 'hair' && _mxMatte();
    document.getElementById('mxReadout').innerHTML = (off ? '100<span>:</span>0' : `${100 - st.ratio}<span>:</span>${st.ratio}`)
      + (matte ? '<em class="mx-matte" title="게임에서 이 비율은 머리가 살짝 투명해져 광이 죽어 보입니다">무광</em>' : '');
    document.getElementById('mxEndBase').innerHTML = b0;
    document.getElementById('mxEndMix').innerHTML = off ? '' : `${M.name}${_mxDot(M)}`;

    document.getElementById('mxCapBase').innerHTML = b0;
    document.getElementById('mxCapMix').innerHTML = off ? '-' : m0;
    document.getElementById('mxCapResult').innerHTML = off ? `${b0} 100%` : `${b0} ${100 - st.ratio}% · ${m0} ${st.ratio}%`;
  }
  document.getElementById('mxResultTitle').textContent = coordi || skinTab ? '착용 결과' : '믹스 결과';
  if (coordi || skinTab) document.getElementById('mxCapResult').textContent = '';
  _mxRenderCombo();

  document.querySelectorAll('#sec-mixdye .mx-view').forEach(b => b.classList.toggle('active', b.dataset.mxview === _mxState.view));
  document.getElementById('mxViewNote').style.display = _mxState.part === 'face' && _mxState.view === 'ladder' ? '' : 'none';
  const fit = _mxZoomFit(), zoom = Math.min(_mxState.zoom, fit);
  _mxFitAt = fit;
  document.querySelectorAll('#sec-mixdye .mx-zoom').forEach(b => {
    b.classList.toggle('active', +b.dataset.mxzoom === zoom);
    b.disabled = +b.dataset.mxzoom > fit;
  });
  const flip = document.querySelector('#sec-mixdye .mx-flip');
  flip.classList.toggle('active', _mxState.flip);
  flip.setAttribute('aria-pressed', String(_mxState.flip));
  document.getElementById('sec-mixdye').classList.toggle('is-flip', _mxState.flip);

  _mxDraw();
  _mxSave();
  _mxHistNote();
}

/* 결과 칸에 다 들어가는 가장 큰 정수 배율. 칸이 좁은데 ×4로 그리면 칸에 맞춰 줄어들며 도트 크기가 들쭉날쭉해서,
   고른 배율이 안 들어가면 들어가는 배율로 낮춰 그리고 안 들어가는 배율 단추는 끈다. 고른 값은 그대로 기억해서 칸이 넓어지면 돌아온다 */
function _mxZoomFit() {
  const st = document.querySelector('#sec-mixdye .mx-card--result .mx-stage');
  const w = st ? st.clientWidth : 0;
  return w ? Math.max(MX_ZOOMS[0], Math.floor(w / MX_LAYER_SIZE)) : MX_ZOOMS[MX_ZOOMS.length - 1];
}
const _mxZoomNow = () => Math.min(_mxState.zoom, _mxZoomFit());
let _mxFitAt = 0;
addEventListener('resize', () => {
  if (!_mxCur || !document.getElementById('sec-mixdye')?.classList.contains('active')) return;
  const fit = _mxZoomFit();
  if (fit !== _mxFitAt) { _mxFitAt = fit; _mxRender(); }
});

/* ── 되돌리기 ── 모습이 바뀔 때마다 두 성별 상태를 통째로 적어 둔다. 탭·보기·배율 전환은 적지 않는다.
   슬라이더를 끄는 것처럼 0.35초 안에 이어진 변화는 하나로 합친다 */
const MX_HIST_MAX = 100, MX_HIST_MERGE_MS = 350;
let _mxHist = [], _mxHistAt = -1, _mxHistT = 0, _mxHistLock = false;
const _mxHistSnap = () => JSON.stringify({ g: _mxState.g, chars: _mxState.chars });

function _mxHistNote() {
  if (_mxHistLock) return;
  const snap = _mxHistSnap();
  if (snap === _mxHist[_mxHistAt]) return;
  const now = performance.now();
  if (_mxHistAt > 0 && _mxHistAt === _mxHist.length - 1 && now - _mxHistT < MX_HIST_MERGE_MS) _mxHist[_mxHistAt] = snap;
  else {
    _mxHist.length = _mxHistAt + 1;
    _mxHist.push(snap);
    if (_mxHist.length > MX_HIST_MAX) _mxHist.shift();
    _mxHistAt = _mxHist.length - 1;
  }
  _mxHistT = now;
  _mxHistButtons();
}

function _mxHistButtons() {
  const [u, r] = ['undo', 'redo'].map(k => document.querySelector(`#sec-mixdye [data-mxhist="${k}"]`));
  if (u) u.disabled = _mxHistAt <= 0;
  if (r) r.disabled = _mxHistAt >= _mxHist.length - 1;
}

function _mxHistGo(step) {
  const at = _mxHistAt + step;
  if (_mxHistLock || at < 0 || at >= _mxHist.length) return;
  _mxHistAt = at;
  const snap = JSON.parse(_mxHist[at]);
  _mxHistLock = true;
  _mxState.g = snap.g;
  _mxState.chars = snap.chars;
  _mxShowPart().finally(() => { _mxHistLock = false; _mxHistT = 0; _mxHistButtons(); });
}

/* ── 프리셋 ── 5칸. 칸을 누르면 고르고, 저장된 칸이면 그 모습을 불러온다. 저장할 때 결과 그림을 작게 같이 담는다 */
let _mxPresets = [], _mxPresetAt = 0;

function _mxRenderPresets() {
  const box = document.getElementById('mxPresetSlots');
  if (!box) return;
  box.innerHTML = Array.from({ length: MX_PRESET_N }, (_, i) => {
    const p = _mxPresets[i];
    return `<button type="button" class="mx-preset${i === _mxPresetAt ? ' active' : ''}${p ? '' : ' is-empty'}" data-mxpreset="${i}" aria-label="프리셋 ${i + 1}">
      ${p ? `<img class="mx-preset__img" src="${p.img}" alt="">` : '<span class="mx-preset__plus">+</span>'}<span class="mx-preset__n">${i + 1}</span></button>`;
  }).join('');
  document.querySelector('#sec-mixdye [data-mxpre="clear"]').disabled = !_mxPresets[_mxPresetAt];
}

function _mxPresetsSave() {
  try { localStorage.setItem(MX_PRESETS, JSON.stringify(_mxPresets)); return true; }
  catch (e) { showToast('브라우저 저장 공간이 부족해 프리셋을 저장하지 못했습니다'); return false; }
}

// 공유 링크와 프리셋을 지금 캐릭터로 불러온다. 성별이 다르면 그 성별로 바꾼다
function _mxApplyLook(look) {
  // toString 같은 상속 이름이 들어와도 통과하지 않게 MX_SEX에 직접 있는 열쇠만 받는다
  if (!look || !Object.prototype.hasOwnProperty.call(MX_SEX, look.g)) return false;
  _mxState.g = look.g;
  _mxState.chars[look.g] = _mxCharFrom(look.g, look, _mxChar(look.g));
  if (window.COORDI_DATA) _mxCoordiReady();
  if (_mxIcons) _mxDropMissing();
  _mxShowPart();
  return true;
}

async function _mxPresetAct(act, i) {
  if (act === 'pick') {
    _mxPresetAt = i;
    if (_mxPresets[i]) _mxApplyLook(_mxPresets[i].look);
    _mxRenderPresets();
  } else if (act === 'save') {
    const at = _mxPresetAt, look = { g: _mxState.g, ..._mxCharOut(_mxState.chars[_mxState.g]) };
    // 새 아이템 그림을 받는 중이면 결과 칸에 아직 예전 모습이 남아 있어서, 지금 모습을 다 그린 뒤에 담는다
    const drawn = () => _mxCur && _mxCur.key === JSON.stringify(_mxPixKeys());
    if (!drawn()) await _mxDraw();
    if (!drawn()) { showToast('그림을 다 불러온 뒤에 저장해 주세요'); return; }
    const was = _mxPresets[at];
    _mxPresets[at] = { look, img: document.getElementById('mxCvResult').toDataURL() };
    if (!_mxPresetsSave()) _mxPresets[at] = was;
    else showToast(`프리셋 ${at + 1}에 저장했습니다`);
    _mxRenderPresets();
  } else if (act === 'clear') {
    _mxPresets[_mxPresetAt] = null;
    _mxPresetsSave();
    _mxRenderPresets();
  }
}

/* ── 공유 링크 ── 지금 성별 캐릭터의 모습을 JSON으로 적어 base64url로 주소에 담는다.
   링크로 들어오면 window load에서 코디 시뮬레이터를 열고, 처음 그린 뒤에 그 모습을 덮어 그려서 되돌리기로 원래 모습에 돌아갈 수 있다 */
let _mxShared = null;
function _mxShareUrl() {
  const look = { g: _mxState.g, ..._mxCharOut(_mxState.chars[_mxState.g]) };
  const code = btoa(JSON.stringify(look)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}?${MX_SHARE_Q}=${code}`;
}
function _mxShareRead(code) {
  try {
    const b = code.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4)));
  } catch (e) { return null; }
}
async function _mxShare() {
  const url = _mxShareUrl();
  try { await navigator.clipboard.writeText(url); showToast('공유 링크를 복사했습니다'); }
  catch (e) { window.prompt('이 링크를 복사해 주세요', url); }
}
window.addEventListener('load', () => {
  const code = new URLSearchParams(location.search).get(MX_SHARE_Q);
  if (!code || typeof navigateTo !== 'function') return;
  history.replaceState(history.state, '', location.pathname);
  _mxShared = _mxShareRead(code);
  if (_mxShared) navigateTo('mixdye');
  else showToast('공유 링크를 읽지 못했습니다');
});

/* ── 랜덤 코디 ── 지금 성별로 헤어·성형을 아무 모양·색으로, 코디는 부위마다 아무거나 입힌다. 믹스와 피부는 그대로.
   믹스 색이 새 헤어·성형에 없거나 새 기준 색과 같으면 _mxRender의 _mxFixColors가 다른 색으로 맞춘다.
   한벌옷과 상의·하의는 반반, 얼굴장식·눈장식·귀걸이는 너무 어지럽지 않게 3분의 1만 입힌다 */
const MX_RANDOM_SOMETIMES = ['faceacc', 'eyeacc', 'earrings'];
async function _mxRandom() {
  if (!window.COORDI_DATA) {
    try { await loadScriptOnce(MX_COORDI_DATA); _mxCoordiReady(); }
    catch (e) { showToast('코디 목록을 불러오지 못했습니다'); return; }
  }
  const g = _mxState.g, ch = _mxState.chars[g], one = a => a[Math.floor(Math.random() * a.length)];
  for (const p of Object.values(MX_PARTS)) {
    const r = one(p.rowsBy[g].filter(r => _mxColorsOf(p, r, g).length));
    if (!r) continue;
    Object.assign(ch[p.key], { id: r[0], base: one(_mxColorsOf(p, r, g)) });
  }
  const D = _mxCD(), digit = MX_SEX[g].digit;
  const pool = slot => (D.items[slot] || []).filter(r => (r[3] === 2 || r[3] === digit) && _mxAvail(`coordi-${slot}`, r[0]));
  const wear = Math.random() < 0.5 ? ['overall'] : ['top', 'bottom'];
  ch.worn = {};
  for (const { key } of D.parts) {
    if ((key === 'overall' || key === 'top' || key === 'bottom') && !wear.includes(key)) continue;
    if (MX_RANDOM_SOMETIMES.includes(key) && Math.random() >= 1 / 3) continue;
    const r = one(pool(key));
    if (r) ch.worn[key] = r[0];
  }
  _mxShowPart();
}

function initMixdye() {
  const sec = document.getElementById('sec-mixdye');
  const D = window.MIXDYE_DATA;
  if (!sec || !D) return;
  // 목록·개수는 지금 고른 성별 것을 가리킨다
  MX_PARTS.hair.rowsBy = { f: D.hairs, m: D.hairsM || [] };
  MX_PARTS.face.rowsBy = { f: D.faces, m: D.facesM || [] };
  for (const p of Object.values(MX_PARTS)) {
    p.byIdBy = {};
    for (const g of Object.keys(MX_SEX)) p.byIdBy[g] = new Map(p.rowsBy[g].map(r => [r[0], r]));
    Object.defineProperty(p, 'rows', { get: () => p.rowsBy[_mxState.g] });
    Object.defineProperty(p, 'byId', { get: () => p.byIdBy[_mxState.g] });
  }
  _mxLoad();
  for (const g of Object.keys(MX_SEX)) {
    for (const p of Object.values(MX_PARTS)) {
      const st = _mxState.chars[g][p.key];
      if (!p.byIdBy[g].has(st.id)) st.id = p.rowsBy[g][0][0];
    }
  }

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">코디 시뮬레이터</h2></div>
    <p class="dt-help">캐릭터 성별을 고르고 헤어·성형의 믹스 염색과 믹스 렌즈를 미리 보거나, 코디 탭에서 모자·한벌옷 같은 캐시 아이템을 입혀 봅니다.</p>
    <p class="dt-help mx-notice">※ 믹스 염색·믹스 렌즈·피부 선 색은 실제 게임 계산이 아니라 비슷하게 만든 근사치입니다. 게임 화면과 색이 다를 수 있습니다.</p>
    <p class="dt-help mx-source">출처: <a href="https://maplestory.io" target="_blank" rel="noopener">maplestory.io</a> — GMS v${D.version} 아이템 데이터를 미리 받아 두고 사이트에서 직접 조합합니다. 이미지의 권리는 NEXON에 있습니다.</p>

    <div class="mx-topbar">
      <div class="sf-tabs mx-sextabs">
        <button class="sf-tab mx-sex" data-mxg="f">여자</button>
        <button class="sf-tab mx-sex" data-mxg="m">남자</button>
      </div>
      <div class="sf-tabs">
        <button class="sf-tab mx-tab" data-mxpart="hair"><img class="mx-tab__icon" src="images/icons/Mix_Hair_Color_Coupon.png" alt="" onerror="this.style.display='none'">헤어</button>
        <button class="sf-tab mx-tab" data-mxpart="face"><img class="mx-tab__icon" src="images/icons/Mix_Lens_Coupon.png" alt="" onerror="this.style.display='none'">성형</button>
        <button class="sf-tab mx-tab" data-mxpart="skin"><img class="mx-tab__icon" src="images/icons/Skin_Coupon.png" alt="" onerror="this.style.display='none'">피부</button>
        <button class="sf-tab mx-tab" data-mxpart="coordi"><img class="mx-tab__icon" src="images/icons/Mannequin.webp" alt="" onerror="this.style.display='none'">코디</button>
      </div>
    </div>
    <hr class="sec-sep" />

    <div class="mx-layout">
      <div class="card mx-browser">
        <div class="mx-slots mx-only-coordi" id="mxSlots"></div>
        <input class="inp" id="mxSearch" type="search" autocomplete="off" />
        <div class="mx-filter">
          <div class="mx-showtabs">
            <button type="button" class="mx-show" data-mxshow="all">전체</button>
            <button type="button" class="mx-show" data-mxshow="fav">찜</button>
            <button type="button" class="mx-show" data-mxshow="recent">최근</button>
          </div>
          <label class="mx-check mx-only-coordi"><input type="checkbox" id="mxMixed" /><span id="mxMixedLabel"></span></label>
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
          <div class="mx-only-skin">
            <div id="mxLineBox">
              ${[['tone', '색조', 0, 359], ['chroma', '채도', -99, 99], ['bright', '명도', -99, 99]].map(([k, label, lo, hi]) => `
              <div class="mx-row"><span class="mx-label">${label}</span>
                <div class="mx-line-row"><input class="mx-range" type="range" id="mxLine-${k}" data-line="${k}" min="${lo}" max="${hi}" step="1" aria-label="피부 ${label}" /><b class="mx-line-val" id="mxLineVal-${k}"></b></div></div>`).join('')}
              <div class="mx-row"><span class="mx-label" id="mxLineLabel">선 색</span>
                <div class="mx-line-row"><span class="mx-line-swatch" id="mxLineSwatch"></span><button class="sbtn sbtn--ghost mx-line-reset" type="button">색 초기화</button></div></div>
              <p class="mx-hint">게임처럼 색조·채도·명도로 색을 바꿉니다. 컬러라인 피부는 선 색이, 다른 커스텀 피부는 피부 색이 바뀌며 실제 게임 색과 다를 수 있습니다.</p>
            </div>
            <p class="mx-hint" id="mxLineHint">색 조절은 이름에 Custom이 붙은 커스텀 피부에서만 됩니다.</p>
          </div>
          <p class="mx-hint mx-only-coordi">목록에서 아이템을 누르면 입고, 같은 아이템을 다시 누르면 벗습니다. 한벌옷을 입으면 상의·하의가 빠지고, 벗으면 기본 옷으로 돌아옵니다.</p>
        </div>

        <div class="mx-viewbar">
          <div class="sf-tabs mx-viewtabs">
            <button class="sf-tab mx-view" data-mxview="stand1">앞모습</button>
            <button class="sf-tab mx-view" data-mxview="ladder">뒷모습</button>
          </div>
          <div class="sf-tabs mx-viewtabs" aria-label="결과 그림 배율">
            ${MX_ZOOMS.map(z => `<button class="sf-tab mx-zoom" data-mxzoom="${z}">×${z}</button>`).join('')}
          </div>
          <button class="sbtn sbtn--ghost sbtn--sm mx-flip" type="button" aria-pressed="false">좌우 반전</button>
          <div class="mx-histbtns">
            <button class="sbtn sbtn--ghost sbtn--sm" type="button" data-mxhist="undo" title="Ctrl+Z" disabled>되돌리기</button>
            <button class="sbtn sbtn--ghost sbtn--sm" type="button" data-mxhist="redo" title="Ctrl+Y" disabled>다시 하기</button>
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

        <div class="card mx-presets">
          <div class="mx-combo__head">
            <div class="card__title">프리셋</div>
            <div class="mx-combo__acts">
              <button type="button" class="sbtn sbtn--ghost" data-mxpre="save">지금 모습 저장</button>
              <button type="button" class="sbtn sbtn--ghost" data-mxpre="clear">비우기</button>
            </div>
          </div>
          <div class="mx-preset-slots" id="mxPresetSlots"></div>
        </div>

        <div class="card mx-combo">
          <div class="mx-combo__head">
            <div class="card__title">현재 조합</div>
            <div class="mx-combo__acts">
              <button type="button" class="sbtn sbtn--ghost mx-random">랜덤 코디</button>
              <button type="button" class="sbtn sbtn--ghost mx-share">공유</button>
              <button type="button" class="sbtn sbtn--ghost mx-reset" title="지금 성별 캐릭터의 헤어·성형·코디를 기본으로 되돌립니다">초기화</button>
            </div>
          </div>
          <div id="mxCombo"></div>
        </div>
      </div>
    </div>`;

  sec.querySelectorAll('.mx-tab').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mxpart === _mxState.part) return;
    _mxState.part = b.dataset.mxpart;
    _mxShowPart();
  }));
  sec.querySelectorAll('.mx-sex').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mxg === _mxState.g) return;
    _mxState.g = b.dataset.mxg;
    _mxShowPart();
  }));
  document.getElementById('mxSlots').addEventListener('click', e => {
    const b = e.target.closest('.mx-slot');
    if (!b || b.dataset.slot === _mxState.coordi.slot) return;
    _mxState.coordi.slot = b.dataset.slot;
    _mxShowPart();
  });
  document.getElementById('mxSearch').addEventListener('input', e => {
    _mxState.q = e.target.value;
    _mxFilter();
  });
  document.getElementById('mxMixed').addEventListener('change', e => {
    _mxState.coordi.other = e.target.checked;
    _mxFilter();
    _mxSave();
  });
  sec.querySelector('.mx-work').addEventListener('click', e => {
    const chip = e.target.closest('.mx-chip');
    if (chip && !chip.disabled) { _mxPick(chip.dataset.role, +chip.dataset.i); return; }
    const off = e.target.closest('.mx-unwear');
    if (off) { delete _mxWorn()[off.dataset.slot]; _mxRender(); return; }
    // 지금 성별 캐릭터의 헤어·성형·코디를 처음 기본값으로 되돌린다(다른 성별은 그대로)
    if (e.target.closest('.mx-reset')) { _mxState.chars[_mxState.g] = _mxChar(_mxState.g); _mxShowPart(); }
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
  sec.querySelectorAll('[data-line]').forEach(r => r.addEventListener('input', () => {
    _mxSkin()[r.dataset.line] = Number(r.value);
    _mxRender();
  }));
  sec.querySelector('.mx-line-reset').addEventListener('click', () => {
    Object.assign(_mxSkin(), { tone: 0, chroma: 0, bright: 0 });
    _mxRender();
  });
  sec.querySelectorAll('.mx-view').forEach(b => b.addEventListener('click', () => {
    _mxState.view = b.dataset.mxview;
    _mxRender();
  }));
  sec.querySelectorAll('.mx-zoom').forEach(b => b.addEventListener('click', () => {
    _mxState.zoom = +b.dataset.mxzoom;
    _mxRender();
  }));
  sec.querySelector('.mx-flip').addEventListener('click', () => { _mxState.flip = !_mxState.flip; _mxRender(); });
  sec.querySelectorAll('[data-mxhist]').forEach(b => b.addEventListener('click', () => _mxHistGo(b.dataset.mxhist === 'undo' ? -1 : 1)));
  sec.querySelectorAll('.mx-show').forEach(b => b.addEventListener('click', () => {
    _mxState.show = b.dataset.mxshow;
    _mxFilter();
    _mxSave();
  }));
  sec.querySelector('.mx-presets').addEventListener('click', e => {
    const slot = e.target.closest('[data-mxpreset]'), act = e.target.closest('[data-mxpre]');
    if (slot) _mxPresetAct('pick', +slot.dataset.mxpreset);
    else if (act && !act.disabled) _mxPresetAct(act.dataset.mxpre);
  });
  sec.querySelector('.mx-random').addEventListener('click', _mxRandom);
  sec.querySelector('.mx-share').addEventListener('click', _mxShare);
  // Ctrl+Z 되돌리기, Ctrl+Y·Ctrl+Shift+Z 다시 하기. common.js bindSimKeys처럼 글자를 고치는 칸에 있거나
  // 모달이 떠 있으면 넘겨서 그 칸의 글자 되돌리기를 쓴다. 슬라이더·체크박스에서는 모습 되돌리기를 쓴다
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || !sec.classList.contains('active')) return;
    const el = document.activeElement, tag = el?.tagName;
    if ((tag === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(el.type)) || tag === 'SELECT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
    if (document.querySelector('.overlay.open, .overlay[style*="flex"]')) return;
    const step = e.code === 'KeyZ' ? (e.shiftKey ? 1 : -1) : e.code === 'KeyY' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    _mxHistGo(step);
  });

  // 코디 목록은 코디 탭을 처음 열 때 받지만, 저장된 착용 아이템 이름을 보여 주려고 뒤에서 미리 받아 둔다
  loadScriptOnce(MX_COORDI_DATA).then(() => { _mxCoordiReady(); if (_mxState.part !== 'coordi') _mxRenderCombo(); }).catch(() => {});
  _mxRenderPresets();
  // 공유 링크로 들어왔으면 원래 모습을 한 번 그린 뒤 덮어 그린다
  _mxShowPart().then(() => {
    if (!_mxShared) return;
    if (_mxApplyLook(_mxShared)) showToast('공유받은 코디를 불러왔습니다');
    _mxShared = null;
  });
}

// 이미 열어 둔 뒤에 공유 링크가 오는 일은 없지만, 연 상태에서 load가 늦게 오면 바로 덮어 그린다
function _mxTakeShared() {
  if (!_mxShared || !document.getElementById('mxPresetSlots')) return;
  if (_mxApplyLook(_mxShared)) showToast('공유받은 코디를 불러왔습니다');
  _mxShared = null;
}

// 다시 열 때는 고른 아이템이 보이게 목록을 옮긴다
const _mxReady = lazySection({
  isReady: () => !!window.MIXDYE_DATA,
  src: 'data_mixdye.js?v=20261021d',
  init: initMixdye,
  onReopen: () => { _mxTakeShared(); requestAnimationFrame(_mxScrollToSelected); },
  secId: 'sec-mixdye',
});
function ensureMixdyeReady(cb) { _mxReady(cb); }
