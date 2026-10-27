/* =============================================
   common.js — 여러 화면이 같이 쓰는 작은 도우미
   index.html에서 가장 먼저 읽는다. 여기 있는 것은 모두 전역이다.

   escHtml(s)                       사용자 입력을 innerHTML에 넣기 전에 이스케이프
   todayStr()                       오늘 날짜 'YYYY-MM-DD' (로컬 기준)
   loadScriptOnce(src)              스크립트를 한 번만 붙이고 Promise를 돌려준다
   lazySection(opts)                탭을 처음 열 때 데이터를 받고 init을 한 번만 부르는 ensure 함수를 만든다
   secLoadErrorHtml()               데이터를 못 받았을 때 섹션에 띄우는 안내
   bindSimKeys(secId, onKey)        시뮬레이터 단축키 S·R·A
   createAutoRunner(opts)           "목표까지 자동" 버튼의 시작·중지 반복
   setActive(items, el)             목록에서 하나만 active
   ============================================= */

/* 캐릭터 이름 등 사용자가 직접 입력하는 값은 innerHTML에 그대로 넣지 않는다.
   클라우드 저장으로 다른 사람 브라우저에서도 이 값이 렌더링될 수 있어서,
   여기서 안 막으면 저장된 이름이 곧 실행 가능한 스크립트가 될 수 있다. */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* 같은 주소는 같은 Promise를 돌려준다. 실패하면 기억을 지워 다음에 다시 받을 수 있게 한다. */
const _scriptLoads = new Map();
function loadScriptOnce(src) {
  if (!_scriptLoads.has(src)) {
    _scriptLoads.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { _scriptLoads.delete(src); reject(new Error(`${src} 로드 실패`)); };
      document.body.appendChild(s);
    }));
  }
  return _scriptLoads.get(src);
}

/* 큰 데이터 파일은 그 탭을 처음 열 때만 받는다. 첫 접속에 모든 탭의 데이터를 받으면 로딩만 느려진다.
   돌려주는 ensure(cb): 데이터가 없으면 받고, 처음이면 init()을, 다시 열 때는 onReopen()을 부른 뒤 cb()
     isReady   () => 데이터가 이미 있는지
     src       받을 스크립트 주소(?v= 포함)
     init      처음 한 번
     onReopen  두 번째부터 열 때마다(선택)
     onFail    받지 못했을 때(선택). 없으면 secId 섹션에 안내를 띄운다
     secId     안내를 띄울 섹션 id */
function lazySection({ isReady, src, init, onReopen, onFail, secId }) {
  let inited = false;
  const start = cb => {
    if (!inited) { inited = true; init(); }
    else if (onReopen) onReopen();
    if (cb) cb();
  };
  return cb => {
    if (isReady()) { start(cb); return; }
    loadScriptOnce(src).then(() => start(cb)).catch(() => {
      if (onFail) { onFail(); return; }
      const sec = document.getElementById(secId);
      if (sec) sec.innerHTML = secLoadErrorHtml();
    });
  };
}

function secLoadErrorHtml() {
  return '<div class="soon-box"><div class="soon-box__title">데이터를 불러오지 못했습니다</div><div class="soon-box__desc">새로고침해주세요.</div></div>';
}

/* S·R·A 단축키. 그 섹션이 열려 있고, 입력칸에서 값을 고치는 중이 아니고, 모달이 떠 있지 않을 때만.
   onKey('s' | 'r' | 'a')가 false를 돌려주면 가로채지 않는다(지금 탭에서는 쓰지 않는 키 등).
   모달은 대부분 .open 클래스로 열리고 큐브 결과 모달만 인라인 display:flex로 열린다. */
function bindSimKeys(secId, onKey) {
  const KEYS = { KeyS: 's', KeyR: 'r', KeyA: 'a' };
  document.addEventListener('keydown', e => {
    const key = KEYS[e.code];
    if (!key || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!document.getElementById(secId)?.classList.contains('active')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay.open, .overlay[style*="flex"]')) return;
    if (onKey(key) === false) return;
    e.preventDefault();   // 스크롤·버튼 재클릭 같은 기본 동작도 막는다
  });
}

/* "목표까지 자동" 버튼. 한 번에 batch판을 돌리고 묶음이 끝날 때만 다시 그린다 — 판마다 그리면 느려진다.
     btnId       버튼 id. 누를 때마다 시작·중지가 바뀐다
     idleLabel   멈춰 있을 때 버튼 글자
     runLabel    도는 동안 버튼 글자
     runClass    도는 동안 버튼에 붙일 클래스(선택)
     idleClass   도는 동안 버튼에서 뗄 클래스(선택)
     batch       한 묶음에 돌릴 판 수
     delay       묶음 사이 쉬는 ms(기본 0)
     canStart    시작 전 검사. false면 시작하지 않는다(안내는 canStart 안에서)
     onStart     시작할 때 한 번(카운터 초기화 등)
     tick        한 판. 'done'이면 목표 달성, 'max'면 상한, 그 밖에는 계속
     maxMsg      상한에 닿았을 때 띄울 안내를 돌려주는 함수
     render      다시 그리기
   돌려주는 것: { start, stop, running }. start는 이미 돌고 있으면 멈춘다. */
function createAutoRunner({ btnId, idleLabel, runLabel, runClass, idleClass, batch, delay = 0, canStart, onStart, tick, maxMsg, render }) {
  let timer = null, on = false;
  const setBtn = running => {
    const b = document.getElementById(btnId);
    if (!b) return;
    b.textContent = running ? runLabel : idleLabel;
    if (runClass) b.classList.toggle(runClass, running);
    if (idleClass) b.classList.toggle(idleClass, !running);
  };
  function stop(msg) {
    if (timer) { clearTimeout(timer); timer = null; }
    const was = on;
    on = false;
    setBtn(false);
    if (was && render) render();
    if (msg) alert(msg);
  }
  function start() {
    if (on) { stop(); return; }
    if (canStart && canStart() === false) return;
    on = true;
    setBtn(true);
    if (onStart) onStart();
    const loop = () => {
      timer = null;
      const t0 = performance.now();
      for (let i = 0; i < batch; i++) {
        const r = tick();
        if (r === 'done') { stop(); return; }
        if (r === 'max') { stop(maxMsg ? maxMsg() : ''); return; }
        if (!on) return;
      }
      if (render) render();
      // 돌리고 그린 시간만큼 빼서 setInterval처럼 일정한 간격을 지킨다(스타포스 80ms)
      timer = setTimeout(loop, Math.max(0, delay - (performance.now() - t0)));
    };
    timer = setTimeout(loop, delay);
  }
  return { start, stop, running: () => on };
}

/* 목록에서 el만 active로 둔다. 탭·토글 버튼에 쓴다. */
function setActive(items, el, cls = 'active') {
  items.forEach(x => x.classList.toggle(cls, x === el));
}
