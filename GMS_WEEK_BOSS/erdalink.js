/* ═══════════════════════════════════════════════
   에르다 링크 계산기 — 에렐 라이트·시아 아스텔
   두 직업은 HEXA가 아니라 에르다 링크라는 룬스톤 트리를 쓴다. 헥사 계산기 탭에서
   활성 캐릭터가 두 직업이면 hexa.js renderAllHexaLists가 헥사 목록 대신 이 화면을 띄운다.
   - 수치·그림은 모두 data_erdalink.js에서 온다. GMS v.270 게임 파일을 옮긴 것이고, 이 화면을 처음 열 때만 받는다
   - 선행 조건은 트리의 prevIdx 그대로다. and는 전부, or는 하나 이상 활성이어야 활성화할 수 있다.
     게임에서 트리 스톤은 비활성으로 되돌릴 수 없으므로, 선행 스톤을 끄면 그 뒤로 이어진 스톤도 같이 끈다
   - SHINE 활성화 조건은 활성화하는 순간만 본다. SHINE은 강화 실패로 레벨이 내려가 조건이 깨져도 활성이 남기 때문
   - 스킬·얼티밋 스톤의 필요 스킬 레벨과 빛의 힘은 캐릭터 정보로 알 수 없어 막지 않고 보여 주기만 한다
   - SHINE 강화는 실패와 하락이 있어 비용을 마르코프 연쇄의 첫 도달 기댓값으로 구한다
   - 값은 캐릭터마다 _hxKey('hx_erdalink')에 { 노드 번호: [현재, 목표] }로 저장한다
═══════════════════════════════════════════════ */
const ERDALINK_KEY_BASE = 'hx_erdalink';
// 설정의 전체 초기화가 헥사 키 목록(app.js HEXA_KEY_BASES)의 접두사로 지우므로 이 키도 넣어 둔다
if (typeof HEXA_KEY_BASES !== 'undefined' && !HEXA_KEY_BASES.includes(ERDALINK_KEY_BASE)) HEXA_KEY_BASES.push(ERDALINK_KEY_BASE);

const _elEnsure = lazySection({
  isReady: () => !!window.ERDA_LINK_DATA,
  src: 'data_erdalink.js?v=20261030a',
  init: () => {},
  secId: 'elRoot',
});
function ensureErdaLinkReady(cb) { _elEnsure(cb); }

/* 종류별 한글 이름. 조건 문구에만 쓴다 */
const _EL_TYPE_KO = { origin: '오리진', skill: '스킬', ultimate: '얼티밋', boost: '부스트', rush: '러시', rushEnd: '러시 끝', SHINE: 'SHINE' };

const _el = {
  job: null,        // 게임 직업 번호 '18112' | '18212'
  key: null,        // 저장 키
  lv: {},           // 노드 번호 → [현재, 목표]
  sel: null,        // 고른 노드 번호
  built: null,      // 지금 그려 둔 판의 직업|저장 키
  nodes: null,      // 노드 번호 → { i, x, y, id, and, or, shine }
  view: { s: 1, x: 0, y: 0, min: .2, max: 2.5 },
  moved: false,     // 사용자가 판을 옮겼으면 크기가 바뀌어도 다시 맞추지 않는다
  justDragged: false,
};

function _elD() { return window.ERDA_LINK_DATA; }
function _elSrc(rel) { return _elD().img + rel; }

/* 노드 표. 트리 79칸과 SHINE 6칸을 같은 번호 체계로 둔다 */
function _elNodes() {
  if (_el.nodes) return _el.nodes;
  const D = _elD(), m = {};
  D.nodes.forEach(([i, x, y, id, and, or]) => { m[i] = { i, x, y, id, and, or, shine: false }; });
  D.shineNodes.forEach(([i, id]) => { m[i] = { i, id, and: [], or: [], shine: true }; });
  return (_el.nodes = m);
}
/* 노드의 룬스톤 정의. SHINE은 이름이 없어 순서로 붙인다 */
function _elStone(i) {
  const n = _elNodes()[i], J = _elD().jobs[_el.job];
  if (n.shine) {
    const s = J.shine[n.id];
    return { c: 'SHINE', m: s.m, o: s.o, cond: s.cond, lk: s.lk, n: `SHINE Stone ${s.o + 1}` };
  }
  return J.stones[n.id];
}
/* 오리진 스톤은 6차 전직을 마치면 자동으로 활성화된다. v.260 공식 가이드
   "After completing the 6th Job Advancement, the Origin Stone is automatically activated."
   그래서 늘 Lv. 1 이상이고 활성화 비용도 들지 않는다. 어센트 스톤은 직접 활성화한다 */
const _elFree = i => { const n = _elNodes()[i]; if (n.shine) return 0; const st = _elStone(i); return st && st.c === 'origin' && st.ct === 'origin' ? 1 : 0; };
const _elCur = i => Math.max(_elFree(i), (_el.lv[i] || [0, 0])[0]);
const _elTgt = i => Math.max(_elFree(i), ...(_el.lv[i] || [0, 0]));

/* ── 저장 ── */
function _elLoad() {
  _el.key = _hxKey(ERDALINK_KEY_BASE);
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(_el.key) || '{}') || {}; } catch { raw = {}; }
  const nodes = _elNodes();
  _el.lv = {};
  Object.entries(raw).forEach(([k, v]) => {
    const n = nodes[k];
    if (!n || !Array.isArray(v)) return;
    const st = _elStone(k);
    if (!st || st.lk) return;
    const c = Math.max(0, Math.min(st.m, parseInt(v[0]) || 0));
    const t = Math.max(c, Math.min(st.m, parseInt(v[1]) || 0));
    if (c || t) _el.lv[k] = [c, t];
  });
}
function _elSave() {
  const out = {};
  Object.entries(_el.lv).forEach(([k, [c, t]]) => { if (c || t) out[k] = [c, t]; });
  localStorage.setItem(_el.key, JSON.stringify(out));
}

/* ── 조건 ── */
/* get(i): 그 상태의 레벨. and는 전부, or는 하나 이상 */
function _elPrevOk(i, get) {
  const n = _elNodes()[i];
  return n.and.every(j => get(j) > 0) && (!n.or.length || n.or.some(j => get(j) > 0));
}
function _elCharLevel() {
  const ch = state?.chars?.[state.activeChar];
  return ch ? (parseInt(ch.fetched?.level || ch.level) || 0) : 0;
}
/* SHINE 조건 한 줄씩 [문구, 충족 여부]. 충족 여부를 알 수 없으면 null. self는 지금 활성화하려는 스톤이라 세지 않는다 */
function _elShineConds(i, get) {
  const st = _elStone(i), nodes = _elNodes(), out = [];
  const tree = Object.values(nodes).filter(n => !n.shine);
  const countType = type => tree.filter(n => { const s = _elStone(n.i); return s.c === type && !s.lk && get(n.i) > 0; }).length;
  const c = st.cond || {};
  if (c.stone) out.push([`${_EL_TYPE_KO[c.stone.type] || c.stone.type} 스톤 ${c.stone.count}개 활성`, countType(c.stone.type) >= c.stone.count]);
  if (c.endstone) out.push([`${_EL_TYPE_KO.rushEnd} 스톤 ${c.endstone.count}개 활성`, countType('rushEnd') >= c.endstone.count]);
  if (c.stonelevel) {
    const { type, lv } = c.stonelevel;
    const pool = type === 'SHINE'
      ? Object.values(nodes).filter(n => n.shine && n.i !== i).map(n => get(n.i))
      : tree.filter(n => _elStone(n.i).c === type).map(n => get(n.i));
    out.push([`${_EL_TYPE_KO[type] || type} 스톤 하나 Lv. ${lv} 이상`, pool.some(v => v >= lv)]);
  }
  if (c.level) {
    const need = parseInt(c.level.level) || 0, have = _elCharLevel();
    out.push([`캐릭터 Lv. ${need} 이상`, have ? have >= need : null]);
  }
  if (c.all) out.push(['모든 스톤 활성', tree.every(n => _elStone(n.i).lk || get(n.i) > 0)]);
  return out;
}
/* 이 상태에서 i를 새로 활성화할 수 있는지 */
function _elCanActivate(i, get) {
  const st = _elStone(i);
  if (st.lk) return false;
  if (st.c === 'SHINE') return _elShineConds(i, get).every(([, ok]) => ok !== false);
  return _elPrevOk(i, get);
}
/* 선행 스톤이 꺼져 끊긴 트리 스톤을 끈다. which 0 = 현재, 1 = 목표. 끈 개수를 돌려준다 */
function _elCascade(which) {
  const nodes = Object.values(_elNodes()).filter(n => !n.shine);
  const get = which === 0 ? _elCur : _elTgt;
  let off = 0, again = true;
  while (again) {
    again = false;
    nodes.forEach(n => {
      if (get(n.i) > 0 && !_elPrevOk(n.i, get)) {
        const v = _el.lv[n.i];
        if (which === 0) v[0] = 0; else { v[0] = 0; v[1] = 0; }
        off++; again = true;
      }
    });
  }
  return off;
}

/* 값 바꾸기. which 0 = 현재, 1 = 목표 */
function _elSet(i, which, val) {
  const st = _elStone(i);
  if (!st || st.lk) return;
  val = Math.max(_elFree(i), Math.min(st.m, parseInt(val) || 0));
  const prev = (_el.lv[i] || [0, 0]).slice();
  const get = which === 0 ? _elCur : _elTgt;
  // 0에서 올리는 순간만 활성화 조건을 본다
  if (val > 0 && get(i) === 0 && !_elCanActivate(i, get)) {
    showToast(st.c === 'SHINE' ? '활성화 조건을 충족하지 않습니다.' : '선행 스톤이 활성화되어 있지 않습니다.');
    _elRefresh();
    return;
  }
  const v = _el.lv[i] = prev;
  if (which === 0) { v[0] = val; v[1] = Math.max(v[1], val); }
  else { v[1] = Math.max(v[0], val); }
  let off = 0;
  if (st.c !== 'SHINE' && val === 0) off = _elCascade(0) + _elCascade(1);
  if (off) showToast(`이어진 스톤 ${off}개도 해제했습니다.`);
  _elSave();
  _elRefresh();
}

/* ── 비용 ── */
function _elRows(st) { return _elD().cost[st.c][st.ct || 'default']; }
function _elSum(rows, a, b) {
  let se = 0, sef = 0;
  for (let k = a; k < b; k++) { se += rows[k][0]; sef += rows[k][1]; }
  return [se, sef];
}
/* SHINE 한 칸을 올리는 평균 비용. E[L] = L에서 처음 L+1에 닿을 때까지 드는 [솔 에르다, 조각, 메소]의 기댓값.
   L에서 한 번 도전하면 비용 c를 내고 p로 L+1, f로 그대로, d로 L-1이 된다.
   E[L] = c + f·E[L] + d·(E[L-1] + E[L])  →  E[L] = (c + d·E[L-1]) / p
   0행은 확률 100%인 활성화라 비용 그대로다 */
let _elShineE = null;
function _elShineExp() {
  if (_elShineE) return _elShineE;
  const C = _elD().shineCost, P = _elD().shineProb, E = [C[0].slice()];
  for (let L = 1; L < C.length; L++) {
    const p = P[L][0] / 100, d = P[L][2] / 100;
    E[L] = C[L].map((c, k) => (c + d * E[L - 1][k]) / p);
  }
  return (_elShineE = E);
}
/* 한 스톤의 a→b 비용. se·sef는 확정, shSef·shMeso는 SHINE 강화의 평균 */
function _elCost(i, a, b) {
  const st = _elStone(i), r = { se: 0, sef: 0, shSef: 0, shMeso: 0 };
  if (st.lk || b <= a) return r;
  if (st.c === 'SHINE') {
    const E = _elShineExp(), C = _elD().shineCost;
    // 활성화는 확정 비용, 1레벨부터의 강화는 평균 비용으로 따로 센다
    if (a === 0) { r.se += C[0][0]; r.sef += C[0][1]; }
    for (let L = Math.max(a, 1); L < b; L++) { r.shSef += E[L][1]; r.shMeso += E[L][2]; }
    return r;
  }
  // 자동으로 활성화되는 오리진 스톤은 0→1 활성화 비용을 세지 않는다
  [r.se, r.sef] = _elSum(_elRows(st), Math.max(a, _elFree(i)), b);
  return r;
}
function _elTotals() {
  const used = { se: 0, sef: 0, shSef: 0, shMeso: 0 }, need = { se: 0, sef: 0, shSef: 0, shMeso: 0 };
  const add = (t, r) => Object.keys(t).forEach(k => { t[k] += r[k]; });
  Object.keys(_elNodes()).forEach(i => {
    const c = _elCur(i), t = _elTgt(i);
    if (c) add(used, _elCost(i, 0, c));
    if (t > c) add(need, _elCost(i, c, t));
  });
  return { used, need };
}

/* ── 그리기 ── */
function _elImg(spec, x, y, cls, extra = '') {
  const [src, w, h] = spec;
  return `<img class="${cls}" src="${_elSrc(src)}" width="${w}" height="${h}" style="left:${x}px;top:${y}px" alt="" draggable="false"${extra}>`;
}
/* 게임 숫자 그림으로 레벨을 적는다. cx는 가운데, y는 위쪽 */
function _elDigits(n, cx, y) {
  if (!n) return '';
  const D = _elD(), ds = String(n).split('').map(c => D.digit[+c]);
  const total = ds.reduce((s, d) => s + d[1], 0) + (ds.length - 1);
  let x = Math.round(cx - total / 2);
  return ds.map(d => { const h = _elImg(d, x, y, 'el-num'); x += d[1] + 1; return h; }).join('');
}
/* 스톤 아이콘 위치. 아이콘의 기준점은 왼쪽 아래(0,32)라 그만큼 되돌린다 */
function _elIconAt(spec, pos, fx, fy) {
  return [fx + pos[0] - spec[1], fy + pos[1] + 32 - spec[2]];
}
function _elStoneHtml(n) {
  const D = _elD(), st = _elStone(n.i);
  const isOrigin = st.c === 'origin';
  const fr = D.frame[st.c] || D.frame.skill;
  const fx = -fr[3], fy = -fr[4];
  let h = _elImg(fr, fx, fy, 'el-frame');
  if (st.lk) {
    const lk = isOrigin ? D.originLock : D.lock;
    return h + _elImg(lk, -lk[3], -lk[4], 'el-lock is-fixed');
  }
  const multi = st.m > 1;
  const pos = isOrigin ? D.pos.origin : multi ? D.pos.icon : D.pos.nonLevel;
  [['di', 'el-ico el-ico--off'], ['i', 'el-ico el-ico--on'], ['mi', 'el-ico el-ico--mo']].forEach(([k, cls]) => {
    const ic = st[k];
    if (!ic) return;
    const [x, y] = _elIconAt([ic[0], ic[1], ic[2]], pos, fx, fy);
    // 아이콘은 대부분 32×32지만 31px짜리도 있어 크기를 박지 않는다
    h += `<img class="${cls}" src="${_elSrc(ic[0])}" style="left:${x}px;top:${y}px" alt="" draggable="false">`;
  });
  h += `<span class="el-lv" style="left:${fx}px;top:${fy}px"></span>`;
  if (isOrigin) {
    h += _elImg(D.originRing, -D.originRing[3], -D.originRing[4], 'el-sel');
  } else {
    h += _elImg(D.act, -D.act[3], -D.act[4], 'el-act');
    h += _elImg(D.lock, -D.lock[3], -D.lock[4], 'el-lock');
    const sel = D.sel[st.c] || D.sel.skill;
    h += _elImg(sel, -sel[3], -sel[4], 'el-sel');
  }
  return h;
}
function _elShineHtml(n) {
  const D = _elD(), st = _elStone(n.i), k = D.shineBoard.kind, sel = D.sel.SHINE;
  let h = '';
  if (!st.lk) h += _elImg(k, -k[3], -k[4], 'el-ico el-ico--on');
  // 선택 테두리의 기준점은 SHINE 아이콘 왼쪽 위 기준이다
  h += _elImg(sel, -k[3] - sel[3], -k[4] - sel[4], 'el-sel');
  h += _elImg(D.lock, -D.lock[3], -D.lock[4], 'el-lock' + (st.lk ? ' is-fixed' : ''));
  h += `<span class="el-lv" style="left:0;top:0"></span>`;
  return h;
}

function _elBuild() {
  const D = _elD(), root = document.getElementById('elRoot');
  if (!root) return;
  const nodes = _elNodes();
  const b = D.board;
  const tree = Object.values(nodes).filter(n => !n.shine);
  const shine = Object.values(nodes).filter(n => n.shine);
  const sb = D.shineBoard;
  root.innerHTML = `
    <div class="el-layout">
      <div class="card el-board">
        <div class="el-board__head">
          <div class="card__title">에르다 링크</div>
          <button type="button" class="sbtn sbtn--ghost el-fit" id="elFit">화면 맞춤</button>
        </div>
        <div class="el-view" id="elView">
          <div class="el-stage" id="elStage" style="width:${b.w}px;height:${b.h}px">
            <img class="el-bg" src="${_elSrc(b.bg)}" width="${b.w}" height="${b.h}" alt="" draggable="false">
            ${_elImg([b.symbol[0], b.symbol[3], b.symbol[4]], b.symbol[1], b.symbol[2], 'el-deco')}
            ${_elImg([b.title[0], b.title[3], b.title[4]], b.title[1], b.title[2], 'el-deco')}
            ${_elImg([b.four[0], b.four[3], b.four[4]], b.four[1], b.four[2], 'el-deco')}
            ${D.lines.map(([a, bb, src, x, y]) => `<img class="el-line" data-a="${a}" data-b="${bb}" src="${_elSrc(src)}" style="left:${x}px;top:${y}px" alt="" draggable="false">`).join('')}
            ${tree.map(n => `<button type="button" class="el-st el-st--${_elStone(n.i).c}" data-i="${n.i}" style="left:${n.x}px;top:${n.y}px" aria-label="${escHtml(_elStone(n.i).n || '')}">${_elStoneHtml(n)}</button>`).join('')}
          </div>
        </div>
        <div class="el-shine" id="elShine">
          <div class="el-shine__in" id="elShineIn" style="width:${sb.bg[1]}px;height:${sb.bg[2]}px">
            <img class="el-bg" src="${_elSrc(sb.bg[0])}" width="${sb.bg[1]}" height="${sb.bg[2]}" alt="" draggable="false">
            ${shine.map(n => { const [x, y] = sb.slots[n.i]; return `<button type="button" class="el-st el-st--SHINE" data-i="${n.i}" style="left:${x}px;top:${y}px" aria-label="${escHtml(_elStone(n.i).n)}">${_elShineHtml(n)}</button>`; }).join('')}
          </div>
        </div>
      </div>
      <div class="el-side">
        <div class="card el-detail" id="elDetail"></div>
        <div class="card">
          <div class="card__title">필요량 계산 결과</div>
          <div class="hexa-result" id="elResult"></div>
        </div>
      </div>
    </div>`;

  root.querySelectorAll('.el-st').forEach(btn => btn.addEventListener('click', () => {
    if (_el.justDragged) return;
    _el.sel = +btn.dataset.i;
    _elRefresh();
  }));
  document.getElementById('elFit').addEventListener('click', () => { _el.moved = false; _elFit(); });
  _elBindView();
  _el.moved = false;
  _elFit();
}

/* 판 위 스톤·길 상태와 옆 칸을 지금 값으로 다시 그린다.
   잠금과 활성 가능 표시는 목표 기준이다. 현재 꺼져 있어도 목표로 켠 스톤 뒤의 스톤은 풀려 보여서,
   무엇을 찍어야 어디가 열리는지 미리 보고 목표를 이어서 찍을 수 있다 */
function _elRefresh() {
  const root = document.getElementById('elRoot');
  if (!root || !root.querySelector('.el-layout')) return;
  const D = _elD();
  root.querySelectorAll('.el-st').forEach(btn => {
    const i = +btn.dataset.i, st = _elStone(i), c = _elCur(i), t = _elTgt(i);
    const can = !st.lk && t === 0 && _elCanActivate(i, _elTgt);
    btn.classList.toggle('is-on', c > 0);
    btn.classList.toggle('is-lock', !!st.lk || (t === 0 && !can));
    btn.classList.toggle('is-act', can && st.c !== 'SHINE');
    btn.classList.toggle('is-plan', t > c);
    btn.classList.toggle('is-sel', _el.sel === i);
    const lv = btn.querySelector('.el-lv');
    if (lv && lv.dataset.v !== String(c)) {
      lv.dataset.v = String(c);
      if (st.c === 'SHINE') lv.innerHTML = _elDigits(c, 0, D.shineBoard.kind[2] - D.shineBoard.kind[4] + 2);
      else if (st.c === 'origin') lv.innerHTML = _elDigits(c, D.frame.origin[1] / 2, D.frame.origin[2] + 2);
      else if (st.m > 1) lv.innerHTML = _elDigits(c, D.pos.level[0] + D.digit[0][1] / 2, D.pos.level[1]);
    }
  });
  root.querySelectorAll('.el-line').forEach(l => {
    const a = +l.dataset.a, b = +l.dataset.b;
    const on = _elCur(a) > 0 && _elCur(b) > 0;
    l.classList.toggle('is-on', on);
    l.classList.toggle('is-plan', !on && _elTgt(a) > 0 && _elTgt(b) > 0);
  });
  _elRenderDetail();
  _elRenderResult();
}

const _elFmtN = n => Math.round(n).toLocaleString();
const _EL_ICON = {
  se:   '<span class="hx-res-icon-wrap"><img src="images/icons/Use_Sol_Erda.png" class="hx-res-icon" alt=""></span>',
  sef:  '<span class="hx-res-icon-wrap"><img src="images/official/item/sol_erda_fragment.png" class="hx-res-icon" alt=""></span>',
  meso: '<span class="hx-res-icon-wrap"><img src="images/icons/meso.webp" class="hx-res-icon" alt=""></span>',
};
function _elRow(label, val, icon) {
  return `<div class="hexa-result-row el-row"><span class="rl">${label}</span><span class="rv"><span class="el-row__v">${val}</span>${icon || ''}</span></div>`;
}
function _elCostRows(r, shine) {
  let h = _elRow('솔 에르다', _elFmtN(r.se), _EL_ICON.se) + _elRow('솔 에르다 조각', _elFmtN(r.sef), _EL_ICON.sef);
  if (shine) h += _elRow('SHINE 평균 조각', _elFmtN(r.shSef), _EL_ICON.sef) + _elRow('SHINE 평균 메소', fmtMeso(r.shMeso), _EL_ICON.meso);
  return h;
}
function _elRenderResult() {
  const box = document.getElementById('elResult');
  if (!box) return;
  const { used, need } = _elTotals();
  box.innerHTML = `
    <div class="hexa-result-label">사용량</div>
    ${_elCostRows(used, true)}
    <div class="hx-result-sep"></div>
    <div class="hexa-result-label">목표까지 필요량</div>
    ${_elCostRows(need, true)}`;
}

/* 게임 설명의 #c…# 강조를 살리고 나머지는 그대로 적는다. 이스케이프한 &#39;의 #을 지우지 않게 먼저 나눈다 */
function _elDesc(s) {
  return String(s || '').split(/#c([\s\S]*?)#/)
    .map((p, k) => k % 2 ? `<b class="el-hl">${escHtml(p)}</b>` : escHtml(p.replace(/#/g, '')))
    .join('');
}
function _elRenderDetail() {
  const box = document.getElementById('elDetail');
  if (!box) return;
  const D = _elD(), i = _el.sel;
  if (i == null || !_elNodes()[i]) {
    box.innerHTML = `<div class="card__title">스톤 정보</div><p class="empty">스톤 선택</p>`;
    return;
  }
  const st = _elStone(i), c = _elCur(i), t = _elTgt(i), isShine = st.c === 'SHINE';
  const label = D.label[st.c];
  const ico = isShine ? (st.lk ? null : [D.shineBoard.kind[0], D.shineBoard.kind[1], D.shineBoard.kind[2]]) : (st.i ? [st.i[0]] : null);
  let h = `<div class="card__title">스톤 정보</div>
    <div class="el-dt__head">
      ${ico ? `<span class="el-dt__ico"><img src="${_elSrc(ico[0])}" alt=""></span>` : ''}
      <div class="el-dt__name">
        <b>${escHtml(st.n || '잠긴 스톤')}</b>
        ${label ? `<img class="el-dt__label" src="${_elSrc(label[0])}" width="${label[1]}" height="${label[2]}" alt="${_EL_TYPE_KO[st.c]} 스톤">` : ''}
      </div>
    </div>`;
  if (st.d) h += `<div class="el-dt__desc">${_elDesc(st.d)}</div>`;

  // 조건
  const conds = [];
  if (!isShine && !st.lk) {
    const n = _elNodes()[i];
    // 목표를 이어서 찍을 수 있는지가 중요해서 충족 여부는 목표 기준으로 적는다
    if (n.and.length || n.or.length) conds.push([n.and.length ? '선행 스톤 모두 활성' : '선행 스톤 하나 이상 활성', _elPrevOk(i, _elTgt)]);
  }
  if (isShine) conds.push(..._elShineConds(i, _elTgt));
  const reqs = st.req || [];
  if (conds.length || reqs.length) {
    h += `<div class="el-dt__sub">활성화 조건</div><div class="el-conds">`;
    conds.forEach(([txt, ok]) => {
      const tag = ok === null ? '' : `<span class="el-cond__ok ${ok ? 'is-ok' : 'is-ng'}">${ok ? '충족' : '미충족'}</span>`;
      h += `<div class="el-cond"><span>${escHtml(txt)}</span>${tag}</div>`;
    });
    reqs.forEach(([name, lv]) => { h += `<div class="el-cond"><span>${escHtml(name)} Lv. ${lv}</span></div>`; });
    h += `</div>`;
  }

  if (st.lk) {
    h += `<div class="el-dt__lock">잠김</div>`;
    box.innerHTML = h;
    return;
  }

  // 현재·목표
  if (st.m > 1) {
    h += `<div class="el-inputs">
      <label class="el-in"><span>현재 레벨</span><input class="inp" type="number" min="${_elFree(i)}" max="${st.m}" value="${c}" data-w="0"></label>
      <label class="el-in"><span>목표 레벨</span><input class="inp" type="number" min="${_elFree(i)}" max="${st.m}" value="${t}" data-w="1"></label>
      <span class="el-in__max">최대 Lv. ${st.m}</span>
    </div>`;
  } else {
    const tg = (w, on) => `<div class="el-tg" data-w="${w}"><button type="button" class="${on ? '' : 'active'}" data-v="0">미활성</button><button type="button" class="${on ? 'active' : ''}" data-v="1">활성</button></div>`;
    h += `<div class="el-inputs">
      <div class="el-in"><span>현재</span>${tg(0, c > 0)}</div>
      <div class="el-in"><span>목표</span>${tg(1, t > 0)}</div>
    </div>`;
  }

  // 이 스톤의 비용
  h += `<div class="el-dt__sub">사용량</div><div class="hexa-result">${_elCostRows(_elCost(i, 0, c), isShine)}</div>
    <div class="el-dt__sub">목표까지 필요량</div><div class="hexa-result">${_elCostRows(_elCost(i, c, t), isShine)}</div>`;
  box.innerHTML = h;

  box.querySelectorAll('input[data-w]').forEach(inp => {
    inp.addEventListener('change', () => _elSet(i, +inp.dataset.w, inp.value));
  });
  box.querySelectorAll('.el-tg').forEach(g => {
    g.querySelectorAll('button').forEach(b => b.addEventListener('click', () => _elSet(i, +g.dataset.w, +b.dataset.v)));
  });
}

/* ── 이동·확대 ── */
function _elApply() {
  const st = document.getElementById('elStage');
  if (!st) return;
  const v = _el.view;
  st.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`;
}
/* 판 일부가 늘 보이게 옮길 수 있는 범위를 막는다 */
function _elClamp() {
  const view = document.getElementById('elView');
  if (!view) return;
  const v = _el.view, b = _elD().board, w = view.clientWidth, h = view.clientHeight, keep = 80;
  v.x = Math.min(w - keep, Math.max(keep - b.w * v.s, v.x));
  v.y = Math.min(h - keep, Math.max(keep - b.h * v.s, v.y));
}
/* 트리 전체가 보이게 맞춘다. 스톤 바깥으로 60px씩 여유를 둔다 */
function _elFit() {
  const view = document.getElementById('elView');
  if (!view) return;
  const w = view.clientWidth, h = view.clientHeight;
  if (!w || !h) return;
  const ns = Object.values(_elNodes()).filter(n => !n.shine);
  const pad = 60;
  const x0 = Math.min(...ns.map(n => n.x)) - pad, x1 = Math.max(...ns.map(n => n.x)) + pad;
  const y0 = Math.min(...ns.map(n => n.y)) - pad, y1 = Math.max(...ns.map(n => n.y)) + pad;
  const s = Math.min(w / (x1 - x0), h / (y1 - y0));
  const v = _el.view;
  v.s = s; v.min = s * .8; v.max = Math.max(2.5, s);
  v.x = (w - (x1 - x0) * s) / 2 - x0 * s;
  v.y = (h - (y1 - y0) * s) / 2 - y0 * s;
  _elApply();
}
function _elZoomAt(px, py, s) {
  const v = _el.view;
  s = Math.max(v.min, Math.min(v.max, s));
  const bx = (px - v.x) / v.s, by = (py - v.y) / v.s;
  v.s = s; v.x = px - bx * s; v.y = py - by * s;
  _el.moved = true;
  _elClamp(); _elApply();
}
function _elBindView() {
  const view = document.getElementById('elView');
  const pts = new Map();
  let drag = null, pinch = null;
  const local = (x, y) => { const r = view.getBoundingClientRect(); return [x - r.left, y - r.top]; };
  const startPinch = () => {
    const [a, b] = [...pts.values()];
    const [mx, my] = local((a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: _el.view.s, bx: (mx - _el.view.x) / _el.view.s, by: (my - _el.view.y) / _el.view.s };
  };
  view.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: _el.view.x, vy: _el.view.y, moved: false };
    else if (pts.size === 2) { startPinch(); if (drag) drag.moved = true; try { view.setPointerCapture(e.pointerId); } catch {} }
  });
  view.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = _el.view;
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()];
      const [mx, my] = local((a.x + b.x) / 2, (a.y + b.y) / 2);
      v.s = Math.max(v.min, Math.min(v.max, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      v.x = mx - pinch.bx * v.s; v.y = my - pinch.by * v.s;
      _el.moved = true;
      _elClamp(); _elApply();
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 5) {
      drag.moved = true;
      try { view.setPointerCapture(e.pointerId); } catch {}
      view.classList.add('is-drag');
    }
    if (drag.moved) {
      v.x = drag.vx + dx; v.y = drag.vy + dy;
      _el.moved = true;
      _elClamp(); _elApply();
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) {
      // 두 손가락 중 하나를 떼면 남은 손가락으로 이어서 옮긴다
      const [[id, p]] = [...pts];
      drag = { id, sx: p.x, sy: p.y, vx: _el.view.x, vy: _el.view.y, moved: true };
      return;
    }
    if (!pts.size) {
      if (drag?.moved) { _el.justDragged = true; setTimeout(() => { _el.justDragged = false; }, 0); }
      drag = null;
      view.classList.remove('is-drag');
    }
  };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
  view.addEventListener('wheel', e => {
    e.preventDefault();
    const [px, py] = local(e.clientX, e.clientY);
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    _elZoomAt(px, py, _el.view.s * Math.exp(-dy * .0015));
  }, { passive: false });
  // 처음 그릴 때 숨어 있었거나 화면 폭이 바뀌면 다시 맞춘다. 사용자가 옮긴 뒤에는 범위만 다시 막는다
  if (window.ResizeObserver) {
    _el.ro?.disconnect();
    (_el.ro = new ResizeObserver(() => {
      if (!_el.moved) _elFit(); else { _elClamp(); _elApply(); }
      _elShineScale();
    })).observe(view);
  }
  _elShineScale();
}
/* SHINE 판은 원래 크기 509px을 넘지 않게, 좁은 화면에서는 폭에 맞춰 줄인다 */
function _elShineScale() {
  const wrap = document.getElementById('elShine'), inner = document.getElementById('elShineIn');
  if (!wrap || !inner) return;
  const bw = _elD().shineBoard.bg[1], bh = _elD().shineBoard.bg[2];
  const k = Math.min(1, (wrap.clientWidth || bw) / bw);
  inner.style.transform = `scale(${k})`;
  wrap.style.height = `${Math.round(bh * k)}px`;
}

/* hexa.js가 부른다. jobId = '18112' 에렐 라이트 | '18212' 시아 아스텔 */
function renderErdaLink(jobId) {
  if (!window.ERDA_LINK_DATA || !_elD().jobs[jobId]) return;
  const key = _hxKey(ERDALINK_KEY_BASE);
  const sig = `${jobId}|${key}`;
  _el.job = jobId;
  _elLoad();
  if (_el.built !== sig || !document.getElementById('elStage')) {
    _el.built = sig;
    _el.sel = null;
    _elBuild();
  }
  _elRefresh();
}
