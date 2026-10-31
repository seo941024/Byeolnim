/* ═══════════════════════════════════════════════
   특수 코어 타이머 — 재발동 타이머: Lethal Strike I 60초, Fatal Strike I 30초
   V 매트릭스 특수 코어가 발동한 것을 보고 시작을 누르면 효과 시간과 재발동 시간을 세고, 다 세면 다시 발동할 수 있다고 표시한다.
   - Lethal Strike I, 한국 이름 치명적인 일격 Ⅰ: 1000번째 공격마다 10초 동안 크리티컬 확률 100% 증가, 60초에 한 번
   - Fatal Strike I, 한국 이름 일격필살 Ⅰ: 공격하면 4초 동안 데미지 100% 증가, 30초에 한 번
   - 스위칭: 코어를 뺐다 끼우면 그 코어는 60초 동안 발동하지 않는다, 지수가 알려 준 값. 스위칭을 누르면 그 코어를 60초 동안 회색으로 두고
     큰 숫자로 센다. 큰 숫자와 막대는 이 스위칭 60초만 센다
   - 효과 시간과 재발동 시간은 큰 숫자 없이 아이콘 우측 상단 숫자로만 보여 준다, 지수 요청. 효과 중에는 컬러 아이콘에 효과 남은 초,
     효과가 끝나면 회색 아이콘에 재발동까지 남은 초. 숫자 그림은 GMS v.270 UI/Basic.img/ItemNoSecond,
     게임 버프 시간 숫자와 픽셀까지 같은 그림이다. 0~9를 한 줄로 이어 붙인 images/myutil/num/digits.png 한 장을 CSS 배경으로 두고
     숫자마다 위치만 옮긴다. 숫자가 바뀔 때마다 새 그림을 끼우면 그림이 뜨기 전 한 프레임이 비어 점멸해 보인다
   - 코어마다 타이머는 하나이고 코어끼리는 따로 돈다. 시작과 스위칭은 서로를 덮어쓴다. 초기화는 멈추고 처음으로 되돌린다
   - 키보드: Space 시작, Esc 초기화, R 스위칭, 지수 요청. 한글 입력 상태에서도 되도록 글자 대신 키 자리 e.code로 본다.
     PIP 창에서는 그 창의 코어에, 이 화면에서는 지금 코어에 적용한다. 지금 코어는 마지막으로 버튼을 누르거나 PIP를 띄운 코어다
   - PIP: 승리 포즈 연습과 같은 Document Picture-in-Picture 창. 특수 코어는 하나만 낄 수 있어서 코어마다 PIP 버튼을 두고
     창에는 그 코어 하나만 띄운다, 지수 요청. 브라우저는 PIP 창을 하나만 허락하므로 다른 코어를 띄우면 앞 창이 닫힌다.
     키보드는 그 창을 눌러 둔 동안만 받는다. 게임 창을 누르면 키는 게임이 가져간다
   - 남은 시간은 끝나는 시각에서 지금 시각을 빼서 구한다. 게임 창이 앞에 있으면 브라우저가 가려진 탭의 타이머를 늦추므로,
     PIP 창이 열려 있으면 그 창의 타이머로도 다시 그린다
   - 이름은 게임 영어 이름 그대로 적는다, 지수 요청
   - 그림·초: GMS v.270 Etc/VCore.img/vSkill/CoreData/<코어>의 icon·iconDisabled와 spCoreOption/cond/cooltime.
     30000001이 Lethal Strike I, 스킬 400007003이고 30000023이 Fatal Strike I, 스킬 400007013이다.
     효과 시간은 Skill/40000.img/skill/<스킬>/common/time이다.
     재발동을 기다리는 동안과 스위칭 중에는 회색 iconDisabled, 그 밖에는 컬러 icon으로 보인다, 지수 요청.
     판마다 두 그림을 다 넣어 두고 style.css가 상태에 따라 하나만 보여 준다
   ═══════════════════════════════════════════════════════════ */

const LT_TICK_MS = 100;
const LT_DIGITS = 'images/myutil/num/digits.png?v=20261031a';
const LT_SWAP_SEC = 60;
const LT_KEYS = { Space: 'start', Escape: 'reset', KeyR: 'swap' };
// sec: 재발동 시간, buff: 효과 시간. end: 끝나는 시각(ms), 0이면 멈춘 상태. mode: 'skill' 발동 뒤, 'swap' 스위칭 뒤. done: 다 센 뒤
const LT_TIMERS = [
  { id: 'lethal', name: 'Lethal Strike I', sec: 60, buff: 10,
    icon: 'images/myutil/lethal_strike.png?v=20261031a', iconOff: 'images/myutil/lethal_strike_disabled.png?v=20261031a',
    end: 0, mode: 'skill', done: false },
  { id: 'fatal', name: 'Fatal Strike I', sec: 30, buff: 4,
    icon: 'images/myutil/fatal_strike.png?v=20261031a', iconOff: 'images/myutil/fatal_strike_disabled.png?v=20261031a',
    end: 0, mode: 'skill', done: false },
];

let _ltCur = LT_TIMERS[0];   // 이 화면 키보드가 움직이는 지금 코어
let _ltPipWin = null;     // 열려 있는 작은 창
const _ltTimers = new Map();   // 창 → setInterval 번호

function _ltBoardHtml(t, pip) {
  const pipBtn = !pip && window.documentPictureInPicture ? '<button class="lt-pip" type="button" data-lt="pip">PIP</button>' : '';
  return `<div class="lt-board${pip ? ' lt-board--pip' : ''}" data-lt-id="${t.id}" data-state="idle">
      <span class="lt-ico-wrap">
        <img class="lt-ico lt-ico--on" src="${t.icon}" alt="">
        <img class="lt-ico lt-ico--off" src="${t.iconOff}" alt="">
        <span class="lt-buffno"></span>
      </span>
      <div class="lt-main">
        <div class="lt-name">${t.name}${pipBtn}</div>
        <div class="lt-time">${LT_SWAP_SEC}</div>
        <div class="lt-bar"><i></i></div>
      </div>
      <div class="lt-btns">
        <button type="button" data-lt="start">시작</button>
        <button type="button" data-lt="reset">초기화</button>
        <button type="button" data-lt="swap">스위칭</button>
      </div>
    </div>`;
}

function _ltBoards(t) {
  return [document, _ltPipWin?.document].filter(Boolean).flatMap(d => [...d.querySelectorAll(`.lt-board[data-lt-id="${t.id}"]`)]);
}

// 이 화면과 작은 창의 판 모두에 남은 시간을 그린다. 모든 코어를 다 세면 창마다 돌던 타이머를 멈춘다
// 상태: idle 처음, buff 효과 중, cool 재발동 대기, swap 스위칭 60초, ready 다 센 뒤
function _ltRender() {
  const now = Date.now();
  LT_TIMERS.forEach(t => {
    const total = (t.mode === 'swap' ? LT_SWAP_SEC : t.sec) * 1000;
    const left = t.end ? Math.max(0, t.end - now) : 0;
    if (t.end && left === 0) { t.end = 0; t.done = true; }
    // 발동한 뒤 지난 시간이 효과 시간보다 짧으면 효과 중이다
    const buffLeft = t.end && t.mode === 'skill' ? Math.max(0, t.buff * 1000 - (total - left)) : 0;
    const state = !t.end ? (t.done ? 'ready' : 'idle') : t.mode === 'swap' ? 'swap' : buffLeft ? 'buff' : 'cool';
    // 아이콘 숫자는 효과 남은 초, 효과가 끝나면 재발동까지 남은 초. 스위칭은 큰 숫자로만 센다
    const icoSec = state === 'buff' ? Math.ceil(buffLeft / 1000) : state === 'cool' ? Math.ceil(left / 1000) : 0;
    const icoText = icoSec ? String(icoSec) : '';
    const text = state === 'ready' ? '발동 가능' : state === 'swap' ? String(Math.ceil(left / 1000)) : String(LT_SWAP_SEC);
    const pct = state === 'ready' ? 0 : state === 'swap' ? left / (LT_SWAP_SEC * 10) : 100;
    _ltBoards(t).forEach(b => {
      b.dataset.state = state;
      const el = b.querySelector('.lt-time');
      if (el.textContent !== text) el.textContent = text;
      const no = b.querySelector('.lt-buffno');
      if (no.dataset.v !== icoText) {
        no.dataset.v = icoText;
        no.innerHTML = [...icoText].map(n => `<i class="lt-d${n}"></i>`).join('');
      }
      b.querySelector('.lt-bar i').style.width = pct + '%';
    });
  });
  if (!LT_TIMERS.some(t => t.end)) _ltStopTimers();
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

function _ltStart(t) {
  t.mode = 'skill';
  t.end = Date.now() + t.sec * 1000;
  t.done = false;
  _ltStartTimers();
  _ltRender();
}

// 코어를 뺐다 끼운 뒤 60초. 재발동을 기다리던 중이어도 처음부터 60초로 덮어쓴다
function _ltSwap(t) {
  t.mode = 'swap';
  t.end = Date.now() + LT_SWAP_SEC * 1000;
  t.done = false;
  _ltStartTimers();
  _ltRender();
}

function _ltReset(t) {
  t.end = 0;
  t.done = false;
  _ltRender();
}

function _ltDo(t, act) {
  if (act === 'start') _ltStart(t);
  else if (act === 'swap') _ltSwap(t);
  else if (act === 'reset') _ltReset(t);
  else if (act === 'pip') _ltPip(t).catch(err => console.warn('[myutil] PiP 실패', err));
}

function _ltOnClick(e) {
  const b = e.target.closest('[data-lt]');
  const t = b && LT_TIMERS.find(x => x.id === b.closest('.lt-board')?.dataset.ltId);
  if (!t) return;
  _ltCur = t;
  // 누른 버튼에 초점이 남으면 다음 Space가 그 버튼을 한 번 더 누른다
  b.blur();
  _ltDo(t, b.dataset.lt);
}

// Space 시작, Esc 초기화, R 스위칭. 누르고 있어 반복되는 입력은 버린다
function _ltOnKey(e, t) {
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
  const act = LT_KEYS[e.code];
  if (!act) return;
  e.preventDefault();
  _ltDo(t, act);
}

// 코어 하나만 띄운다. 다른 코어를 띄우면 앞 창은 닫힌다
async function _ltPip(t) {
  if (!window.documentPictureInPicture) return;
  documentPictureInPicture.window?.close();
  // preferInitialWindowPlacement가 없으면 브라우저가 지난번 창 크기를 되살린다
  const win = await documentPictureInPicture.requestWindow({ width: 400, height: 120, preferInitialWindowPlacement: true });
  const d = win.document;
  d.head.innerHTML = '<meta charset="utf-8">' + [...document.styleSheets].filter(ss => ss.href).map(ss => `<link rel="stylesheet" href="${ss.href}">`).join('');
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme) d.documentElement.setAttribute('data-theme', theme);
  // 설정에서 고른 글꼴과 글자 크기는 settings.js가 html·body에 직접 적어서 스타일시트만으로는 따라오지 않는다
  d.documentElement.style.fontSize = document.documentElement.style.fontSize;
  d.body.style.fontFamily = document.body.style.fontFamily;
  if (document.body.dataset.font) d.body.dataset.font = document.body.dataset.font;
  d.body.className = 'lt-pip-body';
  d.body.innerHTML = _ltBoardHtml(t, true);
  d.body.addEventListener('click', _ltOnClick);
  win.addEventListener('keydown', e => _ltOnKey(e, t));
  win.addEventListener('pagehide', () => {
    if (_ltPipWin !== win) return;
    _ltTimers.delete(win);
    _ltPipWin = null;
  });
  _ltPipWin = win;
  if (LT_TIMERS.some(x => x.end)) _ltStartTimers();
  _ltRender();
}

function initMyUtil() {
  const sec = document.getElementById('sec-myutil');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">특수 코어 타이머</h2></div>
    <p class="dt-help">스위칭용 지속시간 및 쿨타임 체크 타이머입니다.</p>
    <div class="card lt-card">
      <div class="lt-stack">${LT_TIMERS.map(t => _ltBoardHtml(t, false)).join('')}</div>
    </div>`;
  sec.addEventListener('click', _ltOnClick);
  // 이 화면의 키보드 입력. 승리 포즈 연습처럼 이 메뉴가 열려 있고, 입력칸을 고치는 중이 아니고, 모달이 없을 때만
  document.addEventListener('keydown', e => {
    if (!sec.classList.contains('active')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay.open, .overlay[style*="flex"]')) return;
    _ltOnKey(e, _ltCur);
  });
  // 숫자가 처음 뜰 때 숫자판 그림이 늦게 뜨지 않게 미리 받아 둔다. style.css의 배경 주소와 같아야 한다
  new Image().src = LT_DIGITS;
  _ltRender();
}
