/* ═══════════════════════════════════════════════
   승리 포즈 연습 — 이벤트 게임 승리 포즈의 방향키 외우기 도우미
   게임은 방향키 그림을 3개에서 7개까지 차례로 보여 준 뒤, 그 순서대로 방향키를 누르게 한다.
   그림이 나올 때마다 여기서 같은 방향을 눌러 적어 두고, 게임에 입력한 뒤 초기화해서 다음 라운드로 넘어간다.
   - 입력은 판의 방향 버튼 클릭이나 키보드 방향키, 초기화는 초기화 버튼이나 R.
     R은 한글 입력 상태에서도 되도록 글자 대신 키 자리 e.code로 본다
   - 7개가 차면 더 적지 않는다
   - 클릭이든 키보드든 누르면 그 버튼이 잠깐 눌린 그림으로 바뀐다
   - PIP모드: Document Picture-in-Picture로 항상 위에 뜨는 작은 창에 같은 판을 띄운다. 크롬·엣지 116 이상.
     작은 창의 판과 이 화면의 판은 같은 기록을 함께 보여 준다.
     키보드는 그 창을 눌러 둔 동안만 받는다. 게임 창을 누르면 키는 게임이 가져간다
   ═══════════════════════════════════════════════════════════ */

const VP_MAX = 7;
const VP_PRESS_MS = 140;   // 눌린 그림을 보여 주는 시간
const VP_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const VP_DIRS = ['left', 'up', 'down', 'right'];   // 판 아래 버튼 순서
const VP_DIR_NAME = { up: '위', down: '아래', left: '왼쪽', right: '오른쪽' };

/* 도트 키 그림. 뒤 그림이 도트라 키도 도트로 찍는다. 글자 하나가 한 칸이고 '.'은 비운다.
   키 틀은 18×19칸. # 외곽선, H 윗면 밝은 테, F 윗면, S 옆면, D 옆면 아래 그늘.
   그 위 왼쪽 3칸·위 2칸 자리부터 12×12칸에 화살표나 R을 찍고, 글자 바로 아래 한 칸에 그림자를 둔다.
   눌린 그림은 윗면을 옆면 두 칸만큼 내리고 옆면을 없앤 틀이다.
   메뉴 아이콘 images/victorypose/icon.png는 지수가 준 victorypose.png다 */
const VP_CAP = [
  '..##############..',
  '.#HHHHHHHHHHHHHH#.',
  '#HHFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#HFFFFFFFFFFFFFFF#',
  '#FFFFFFFFFFFFFFFF#',
  '#SSSSSSSSSSSSSSSS#',
  '#SSSSSSSSSSSSSSSS#',
  '.#DDDDDDDDDDDDDD#.',
  '..##############..',
];
const VP_CAP_DOWN = ['..................', '..................', ...VP_CAP.slice(0, 15), VP_CAP[17], VP_CAP[18]];
const VP_GLYPH_UP = [
  '.....##.....',
  '....####....',
  '...######...',
  '..########..',
  '.##########.',
  '############',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
  '....####....',
];
const VP_GLYPH_R = [
  '............',
  '..######....',
  '..#######...',
  '..##...###..',
  '..##....##..',
  '..##...###..',
  '..#######...',
  '..######....',
  '..##..###...',
  '..##...###..',
  '..##....##..',
  '............',
];
/* 밝은 키는 적은 방향, 어두운 키는 방향 버튼, 빨간 키는 초기화. A 글자, a 글자 그림자.
   버튼이 눌리면 윗면이 밝아지고 글자가 금색이 된다. 색이 진하다는 지수 의견으로 채도를 한 단계 낮춘 값이다 */
const VP_PAL = {
  key:      { '#': '#2c2140', H: '#ffffff', F: '#fbf5e2', S: '#e3b54a', D: '#a07a2c', A: '#4f3d7e', a: '#ddd2b4' },
  btn:      { '#': '#110d1c', H: '#655b85', F: '#3d345a', S: '#272040', D: '#1a1530', A: '#ffffff', a: '#221c36' },
  btnDown:  { '#': '#110d1c', H: '#8f83b8', F: '#5d4f86', S: '#272040', D: '#1a1530', A: '#f2d27a', a: '#3d335e' },
  reset:    { '#': '#3a1418', H: '#f0a5a5', F: '#cf5b5f', S: '#9a3a3f', D: '#6c2a2e', A: '#ffffff', a: '#a8464b' },
  resetDown:{ '#': '#3a1418', H: '#f5c6c6', F: '#e07a7d', S: '#9a3a3f', D: '#6c2a2e', A: '#fbefc4', a: '#c26064' },
};
const VP_TURN = { up: 0, right: 1, down: 2, left: 3 };   // 위 화살표를 시계 방향으로 90도씩 돌리는 횟수

// 칸 그림을 시계 방향으로 90도씩 k번 돌린다
function _vpRotate(m, k) {
  for (; k > 0; k--) m = [...m[0]].map((_, i) => m.map(r => r[i]).reverse().join(''));
  return m;
}

// 키 틀에 글자를 찍어 SVG로. 같은 색이 가로로 이어진 칸은 사각형 하나로 묶는다
function _vpTile(glyph, pal, down) {
  const grid = (down ? VP_CAP_DOWN : VP_CAP).map(r => [...r]);
  const oy = down ? 4 : 2;
  glyph.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#' && glyph[y + 1]?.[x] !== '#') grid[y + oy + 1][x + 3] = 'a'; }));
  glyph.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') grid[y + oy][x + 3] = 'A'; }));
  let rects = '';
  grid.forEach((row, y) => {
    for (let x = 0, w; x < row.length; x += w) {
      for (w = 1; row[x + w] === row[x]; w++);
      if (row[x] !== '.') rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${pal[row[x]]}"/>`;
    }
  });
  return `<svg class="vp-t${down ? ' vp-t--down' : ''}" viewBox="0 0 18 ${VP_CAP.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

let _vpTiles = null;   // { key·btn: 방향 → 그림, reset: 그림 }. 버튼은 평소 그림과 눌린 그림을 함께 갖는다. 처음 그릴 때 만든다
function _vpTileSet() {
  if (!_vpTiles) {
    const arrow = d => _vpRotate(VP_GLYPH_UP, VP_TURN[d]);
    _vpTiles = {
      key: Object.fromEntries(VP_DIRS.map(d => [d, _vpTile(arrow(d), VP_PAL.key)])),
      btn: Object.fromEntries(VP_DIRS.map(d => [d, _vpTile(arrow(d), VP_PAL.btn) + _vpTile(arrow(d), VP_PAL.btnDown, true)])),
      reset: _vpTile(VP_GLYPH_R, VP_PAL.reset) + _vpTile(VP_GLYPH_R, VP_PAL.resetDown, true),
    };
  }
  return _vpTiles;
}

let _vpSeq = [];          // 적은 방향 순서
let _vpPipWin = null;     // 열려 있는 작은 창

function _vpBoardHtml(pip) {
  const t = _vpTileSet();
  return `<div class="vp-board${pip ? ' vp-board--pip' : ''}">
      <div class="vp-seq"></div>
      <div class="vp-pad">
        ${VP_DIRS.map(d => `<button class="vp-btn" type="button" data-vp="${d}" aria-label="${VP_DIR_NAME[d]}">${t.btn[d]}</button>`).join('')}
        <button class="vp-btn vp-reset" type="button" data-vp="reset" aria-label="초기화">${t.reset}<span>초기화</span></button>
      </div>
    </div>`;
}

function _vpBoards() {
  return [document, _vpPipWin?.document].filter(Boolean);
}

// 이 화면과 작은 창의 판 모두에 지금 기록을 그린다. added면 방금 넣은 하나만 튀어나오게 한다
function _vpRender(added) {
  const t = _vpTileSet();
  const html = _vpSeq.map((d, i) =>
    `<span class="vp-key${added && i === _vpSeq.length - 1 ? ' vp-key--new' : ''}" role="img" aria-label="${VP_DIR_NAME[d]}">${t.key[d]}</span>`).join('');
  _vpBoards().forEach(d => d.querySelectorAll('.vp-seq').forEach(el => { el.innerHTML = html; }));
}

// 누른 버튼을 두 판 모두에서 잠깐 눌린 그림으로. 빠른 클릭은 :active가 너무 짧아 따로 표시한다
function _vpPress(what) {
  _vpBoards().forEach(d => d.querySelectorAll(`.vp-btn[data-vp="${what}"]`).forEach(b => {
    b.classList.add('is-press');
    clearTimeout(b._pressTimer);
    b._pressTimer = setTimeout(() => b.classList.remove('is-press'), VP_PRESS_MS);
  }));
}

function _vpPush(dir) {
  _vpPress(dir);
  if (_vpSeq.length >= VP_MAX) return;
  _vpSeq.push(dir);
  _vpRender(true);
}

function _vpReset() {
  _vpPress('reset');
  _vpSeq = [];
  _vpRender(false);
}

function _vpOnClick(e) {
  const b = e.target.closest('[data-vp]');
  if (!b) return;
  if (b.dataset.vp === 'reset') _vpReset();
  else _vpPush(b.dataset.vp);
}

// 방향키는 적고 R은 초기화. 누르고 있어 반복되는 입력은 버린다. 처리한 키는 스크롤 같은 기본 동작을 막는다
function _vpOnKey(e) {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  const dir = VP_KEYS[e.key];
  if (dir) { e.preventDefault(); _vpPush(dir); }
  else if (e.code === 'KeyR') { e.preventDefault(); _vpReset(); }
}

async function _vpPip() {
  if (!window.documentPictureInPicture) return;
  documentPictureInPicture.window?.close();
  // 판 그림과 같은 비율로 연다. preferInitialWindowPlacement가 없으면 브라우저가 지난번 창 크기를 되살린다
  const win = await documentPictureInPicture.requestWindow({ width: 598, height: 229, preferInitialWindowPlacement: true });
  const d = win.document;
  d.head.innerHTML = '<meta charset="utf-8">' + [...document.styleSheets].filter(ss => ss.href).map(ss => `<link rel="stylesheet" href="${ss.href}">`).join('');
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme) d.documentElement.setAttribute('data-theme', theme);
  d.body.className = 'vp-pip-body';
  d.body.innerHTML = _vpBoardHtml(true);
  d.body.addEventListener('click', _vpOnClick);
  win.addEventListener('keydown', _vpOnKey);
  win.addEventListener('pagehide', () => { if (_vpPipWin === win) _vpPipWin = null; });
  _vpPipWin = win;
  _vpRender(false);
}

function initVictoryPose() {
  const sec = document.getElementById('sec-victorypose');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  // PIP모드 버튼은 판 바로 위 왼쪽에 둔다. 제목 줄 오른쪽 끝에 두었더니 잘 안 보인다는 지수 의견
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">승리 포즈 연습</h2></div>
    <p class="dt-help">PIP모드로 창을 띄워 화면에 나오는 방향을 키보드로 입력하거나 클릭해서 저장합니다. R 또는 초기화 버튼 클릭으로 초기화합니다.</p>
    <div class="card vp-card">
      ${window.documentPictureInPicture ? '<div class="vp-tools"><button class="vp-pip" type="button">PIP모드</button></div>' : ''}
      ${_vpBoardHtml(false)}
    </div>`;
  sec.addEventListener('click', e => {
    if (e.target.closest('.vp-pip')) { _vpPip().catch(err => console.warn('[victorypose] PiP 실패', err)); return; }
    _vpOnClick(e);
  });
  // 이 화면의 키보드 입력. common.js bindSimKeys처럼 이 메뉴가 열려 있고, 입력칸을 고치는 중이 아니고, 모달이 없을 때만
  document.addEventListener('keydown', e => {
    if (!sec.classList.contains('active')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay.open, .overlay[style*="flex"]')) return;
    _vpOnKey(e);
  });
  _vpRender(false);
}
