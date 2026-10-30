/* ═══════════════════════════════════════════════
   개인 유틸 — 치명적 일격 60초 타이머
   V 매트릭스 특수 코어 치명적 일격 I(Lethal Strike I)은 1000번째 공격마다 10초 동안 크리티컬 확률을 100% 올리고,
   60초에 한 번만 발동한다. 발동을 보고 시작을 누르면 60초를 거꾸로 세고, 0이 되면 다시 발동할 수 있다고 표시한다.
   - 시작을 다시 누르면 60초부터 새로 센다. 초기화는 멈추고 60으로 되돌린다
   - 키보드: S 시작, R 초기화. 한글 입력 상태에서도 되도록 글자 대신 키 자리 e.code로 본다
   - PIP모드: 승리 포즈 연습과 같은 Document Picture-in-Picture 창. 이 화면과 작은 창이 같은 타이머를 보여 준다.
     키보드는 그 창을 눌러 둔 동안만 받는다. 게임 창을 누르면 키는 게임이 가져간다
   - 남은 시간은 끝나는 시각에서 지금 시각을 빼서 구한다. 게임 창이 앞에 있으면 브라우저가 가려진 탭의 타이머를 늦추므로,
     PIP 창이 열려 있으면 그 창의 타이머로도 다시 그린다
   - 이름은 게임 영어 이름 Lethal Strike I 그대로 적는다(지수 요청)
   - 그림: GMS v.270 Etc/VCore.img/vSkill/CoreData/30000001/icon, images/myutil/lethal_strike.png. 스킬 400007003의 icon과 같은 그림이다.
     세는 동안은 회색, 다시 발동할 수 있으면 컬러로 보인다(지수 요청). 게임의 회색 그림 iconDisabled는 maplestory.io가
     GMS v.270에서 내려 주지 못해(서버 오류), style.css grayscale 필터로 채도만 뺀다. 밝기는 그대로. KMS의 400007003은 다른 스킬이라 쓸 수 없다
   ═══════════════════════════════════════════════════════════ */

const LT_SEC = 60;
const LT_TICK_MS = 100;
const LT_ICON = 'images/myutil/lethal_strike.png?v=20261031a';

let _ltEnd = 0;           // 끝나는 시각(ms). 0이면 멈춘 상태
let _ltDone = false;      // 60초를 다 센 뒤
let _ltPipWin = null;     // 열려 있는 작은 창
const _ltTimers = new Map();   // 창 → setInterval 번호

function _ltBoardHtml(pip) {
  return `<div class="lt-board${pip ? ' lt-board--pip' : ''}" data-state="idle">
      <img class="lt-ico" src="${LT_ICON}" alt="">
      <div class="lt-main">
        <div class="lt-name">Lethal Strike I</div>
        <div class="lt-time">${LT_SEC}</div>
        <div class="lt-bar"><i></i></div>
      </div>
      <div class="lt-btns">
        <button type="button" data-lt="start">시작</button>
        <button type="button" data-lt="reset">초기화</button>
      </div>
    </div>`;
}

function _ltBoards() {
  return [document, _ltPipWin?.document].filter(Boolean).flatMap(d => [...d.querySelectorAll('.lt-board')]);
}

// 이 화면과 작은 창의 판 모두에 남은 시간을 그린다. 다 세면 창마다 돌던 타이머를 멈춘다
function _ltRender() {
  const left = _ltEnd ? Math.max(0, _ltEnd - Date.now()) : LT_SEC * 1000;
  if (_ltEnd && left === 0) { _ltEnd = 0; _ltDone = true; _ltStopTimers(); }
  const state = _ltEnd ? 'run' : _ltDone ? 'ready' : 'idle';
  const text = state === 'ready' ? '발동 가능' : String(Math.ceil(left / 1000));
  const pct = state === 'ready' ? 0 : left / (LT_SEC * 10);
  _ltBoards().forEach(b => {
    b.dataset.state = state;
    const t = b.querySelector('.lt-time');
    if (t.textContent !== text) t.textContent = text;
    b.querySelector('.lt-bar i').style.width = pct + '%';
  });
}

function _ltStartTimers() {
  [window, _ltPipWin].filter(Boolean).forEach(w => {
    if (!_ltTimers.has(w)) _ltTimers.set(w, w.setInterval(_ltRender, LT_TICK_MS));
  });
}

function _ltStopTimers() {
  _ltTimers.forEach((id, w) => { try { w.clearInterval(id); } catch {} });
  _ltTimers.clear();
}

function _ltStart() {
  _ltEnd = Date.now() + LT_SEC * 1000;
  _ltDone = false;
  _ltStartTimers();
  _ltRender();
}

function _ltReset() {
  _ltEnd = 0;
  _ltDone = false;
  _ltStopTimers();
  _ltRender();
}

function _ltOnClick(e) {
  const b = e.target.closest('[data-lt]');
  if (!b) return;
  if (b.dataset.lt === 'start') _ltStart();
  else _ltReset();
}

// S는 시작, R은 초기화. 누르고 있어 반복되는 입력은 버린다
function _ltOnKey(e) {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.code === 'KeyS') { e.preventDefault(); _ltStart(); }
  else if (e.code === 'KeyR') { e.preventDefault(); _ltReset(); }
}

async function _ltPip() {
  if (!window.documentPictureInPicture) return;
  documentPictureInPicture.window?.close();
  // preferInitialWindowPlacement가 없으면 브라우저가 지난번 창 크기를 되살린다
  const win = await documentPictureInPicture.requestWindow({ width: 340, height: 120, preferInitialWindowPlacement: true });
  const d = win.document;
  d.head.innerHTML = '<meta charset="utf-8">' + [...document.styleSheets].filter(ss => ss.href).map(ss => `<link rel="stylesheet" href="${ss.href}">`).join('');
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme) d.documentElement.setAttribute('data-theme', theme);
  // 설정에서 고른 글꼴과 글자 크기는 settings.js가 html·body에 직접 적어서 스타일시트만으로는 따라오지 않는다
  d.documentElement.style.fontSize = document.documentElement.style.fontSize;
  d.body.style.fontFamily = document.body.style.fontFamily;
  if (document.body.dataset.font) d.body.dataset.font = document.body.dataset.font;
  d.body.className = 'lt-pip-body';
  d.body.innerHTML = _ltBoardHtml(true);
  d.body.addEventListener('click', _ltOnClick);
  win.addEventListener('keydown', _ltOnKey);
  win.addEventListener('pagehide', () => {
    if (_ltPipWin !== win) return;
    _ltTimers.delete(win);
    _ltPipWin = null;
  });
  _ltPipWin = win;
  if (_ltEnd) _ltStartTimers();
  _ltRender();
}

function initMyUtil() {
  const sec = document.getElementById('sec-myutil');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">개인 유틸</h2></div>
    <p class="dt-help">Lethal Strike I 발동 시 시작을 누릅니다. 60초 동안 아이콘이 회색으로 바뀌고, 다시 발동할 수 있으면 컬러로 돌아옵니다. S 또는 시작 버튼으로 시작하고, R 또는 초기화 버튼으로 초기화합니다.</p>
    <div class="card lt-card">
      ${window.documentPictureInPicture ? '<div class="lt-tools"><button class="lt-pip" type="button">PIP모드</button></div>' : ''}
      ${_ltBoardHtml(false)}
    </div>`;
  sec.addEventListener('click', e => {
    if (e.target.closest('.lt-pip')) { _ltPip().catch(err => console.warn('[myutil] PiP 실패', err)); return; }
    _ltOnClick(e);
  });
  // 이 화면의 키보드 입력. 승리 포즈 연습처럼 이 메뉴가 열려 있고, 입력칸을 고치는 중이 아니고, 모달이 없을 때만
  document.addEventListener('keydown', e => {
    if (!sec.classList.contains('active')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay.open, .overlay[style*="flex"]')) return;
    _ltOnKey(e);
  });
  _ltRender();
}
