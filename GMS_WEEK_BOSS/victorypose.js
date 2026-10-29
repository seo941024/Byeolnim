/* ═══════════════════════════════════════════════
   승리 포즈 연습 — 이벤트 게임 승리 포즈의 방향키 외우기 도우미
   게임은 방향키 그림을 3개에서 7개까지 차례로 보여 준 뒤, 그 순서대로 방향키를 누르게 한다.
   그림이 나올 때마다 여기서 같은 방향을 눌러 적어 두고, 게임에 입력한 뒤 초기화해서 다음 라운드로 넘어간다.
   - 입력은 판의 방향 버튼 클릭이나 키보드 방향키, 초기화는 초기화 버튼이나 R.
     R은 한글 입력 상태에서도 되도록 글자 대신 키 자리 e.code로 본다
   - 7개가 차면 더 적지 않는다
   - PIP모드: Document Picture-in-Picture로 항상 위에 뜨는 작은 창에 같은 판을 띄운다. 크롬·엣지 116 이상.
     작은 창의 판과 이 화면의 판은 같은 기록을 함께 보여 준다.
     키보드는 그 창을 눌러 둔 동안만 받는다. 게임 창을 누르면 키는 게임이 가져간다
   ═══════════════════════════════════════════════════════════ */

const VP_MAX = 7;
const VP_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const VP_DIRS = ['left', 'up', 'down', 'right'];   // 판 아래 버튼 순서
const VP_DIR_NAME = { up: '위', down: '아래', left: '왼쪽', right: '오른쪽' };
// 위쪽 화살표. 다른 방향은 style.css에서 돌린다
const VP_ARROW = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 7 57 34H41v23H23V34H7Z"/></svg>';

let _vpSeq = [];          // 적은 방향 순서
let _vpPipWin = null;     // 열려 있는 작은 창

function _vpBoardHtml(pip) {
  return `<div class="vp-board${pip ? ' vp-board--pip' : ''}">
      <div class="vp-seq"></div>
      <div class="vp-pad">
        ${VP_DIRS.map(d => `<button class="vp-btn vp-btn--${d}" type="button" data-vp="${d}" aria-label="${VP_DIR_NAME[d]}">${VP_ARROW}</button>`).join('')}
        <button class="vp-reset" type="button" data-vp="reset">초기화<kbd>R</kbd></button>
      </div>
    </div>`;
}

// 이 화면과 작은 창의 판 모두에 지금 기록을 그린다. added면 방금 넣은 하나만 튀어나오게 한다
function _vpRender(added) {
  const html = _vpSeq.map((d, i) =>
    `<span class="vp-key vp-key--${d}${added && i === _vpSeq.length - 1 ? ' vp-key--new' : ''}" role="img" aria-label="${VP_DIR_NAME[d]}">${VP_ARROW}</span>`).join('');
  [document, _vpPipWin?.document].forEach(d => d?.querySelectorAll('.vp-seq').forEach(el => { el.innerHTML = html; }));
}

function _vpPush(dir) {
  if (_vpSeq.length >= VP_MAX) return;
  _vpSeq.push(dir);
  _vpRender(true);
}

function _vpReset() {
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
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">승리 포즈 연습</h2>${window.documentPictureInPicture ? '<button class="vp-pip" type="button">PIP모드</button>' : ''}</div>
    <div class="card">${_vpBoardHtml(false)}</div>`;
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
