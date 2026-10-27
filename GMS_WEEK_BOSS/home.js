/* =============================================
   home.js — 첫 화면(홈)
   뮤즈대시 첫 화면처럼 모눈종이 머리 영역(떠다니는 별·님·앱 스티커 글자, 그 아래 내 캐릭터 카드·결정석·수익,
   아래 화살표), 가운데 카드가 앞으로 나오는 주요 기능 슬라이드,
   사이드바와 같은 전체 메뉴 바둑판으로 짠다.
   움직임은 style.css "홈" 구역에 있고, 여기서는 그리기와 슬라이드 넘기기만 한다.
   ============================================= */

/* 주요 기능 슬라이드. art가 있으면 그 그림을 배경으로 크게 깔고, 없으면 사이드바 아이콘을 크게 띄운다 */
const HOME_FEATURES = [
  { sec: 'boss',       title: '보스 수익 계산기',   desc: '캐릭터별 주간 결정석 개수와 예상 수익을 계산합니다.', art: 'images/bosses/kalos.webp' },
  { sec: 'cube',       title: '큐브 시뮬레이터',     desc: '큐브 잠재 옵션 확률과 시뮬레이션을 사용할 수 있습니다.' },
  { sec: 'starforce',  title: '스타포스 시뮬레이터', desc: '목표 성까지 드는 메소 기댓값을 계산하고 직접 강화해 볼 수 있습니다.' },
  { sec: 'mixdye',     title: '코디 시뮬레이터',     desc: '믹스 염색과 코디를 캐릭터에 입혀 미리 볼 수 있습니다.' },
  { sec: 'mcalendar',  title: '메이플 캘린더',       desc: '보스 일정과 획득한 아이템을 날짜별로 기록합니다.' },
  { sec: 'liberation', title: '무기 해방 계산기',     desc: '해방 완료 예상 날짜를 알려줍니다.' },
  { sec: 'bosshp',     title: '보스 정보',           desc: '보스 HP와 난이도별 드랍 아이템을 보여줍니다.', art: 'images/bosses/seren.webp' },
];
const HOME_AUTO_MS = 4500;

/* 별·님·앱 스티커 글자와 반짝이. 글꼴은 메이플스토리 Bold에서 이 세 글자만 뽑은 font/maple_title.woff.
   글자마다 금색 바깥 테두리, 굵은 흰 테두리, 채움을 같은 자리에 세 번 겹쳐 그린다.
   SVG라 테두리 모서리를 둥글게 줄 수 있다. vb는 글꼴 크기 100에서 그 글자 윤곽에 테두리 15만큼을 더한
   가로 범위이고, 세로는 세 글자가 같은 줄에 서도록 모두 -90.6부터 122.4로 맞췄다.
   채움은 예전 제목과 같은 금색에서 연보라로 가는 가로 그라데이션을 세 글자에 나눠 이어 칠한다 */
const HOME_TITLE_CHARS = [
  { ch: '별', vb: '-10.7 -90.6 107.8 122.4' },
  { ch: '님', vb: '-10 -90.6 105.6 122.4' },
  { ch: '앱', vb: '-12.6 -90.6 117.7 122.4' },
];
/* 홈 머리 영역에 반짝이는 ✦와 같은 네 갈래 별 */
const HOME_TITLE_SPARK = 'M0-50Q9-9 50 0Q9 9 0 50Q-9 9-50 0Q-9-9 0-50Z';

function _homeSticker(shape, vb, cls) {
  return `<span class="home-title__ch ${cls}"><svg viewBox="${vb}" aria-hidden="true">
      ${['ring', 'white', 'fill'].map(l => shape(`home-title__${l}`)).join('')}
    </svg></span>`;
}

function _homeTitleHtml() {
  // 글자 k의 채움 — 단어 전체 그라데이션 중 k번째 3분의 1 구간. 구간 끝 색은 style.css의 --st-g01·--st-g12
  const grads = [
    ['--st-g0', '--st-g01'],
    ['--st-g01', '--st-g1', '--st-g12'],
    ['--st-g12', '--st-g2'],
  ];
  const stops = g => g.length === 2
    ? `<stop offset="0" style="stop-color:var(${g[0]})"/><stop offset="1" style="stop-color:var(${g[1]})"/>`
    : `<stop offset="0" style="stop-color:var(${g[0]})"/><stop offset=".2" style="stop-color:var(${g[1]})"/><stop offset="1" style="stop-color:var(${g[2]})"/>`;
  return `<h1 class="home-title" aria-label="별님앱">
      <svg class="home-title__defs" aria-hidden="true" focusable="false"><defs>
        ${grads.map((g, i) => `<linearGradient id="homeTitleFill${i + 1}">${stops(g)}</linearGradient>`).join('')}
        <linearGradient id="homeTitleSpark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--st-sa)"/><stop offset="1" style="stop-color:var(--st-sb)"/></linearGradient>
      </defs></svg>
      ${HOME_TITLE_CHARS.map((c, i) => _homeSticker(cls => `<text class="${cls}">${c.ch}</text>`, c.vb, `home-title__ch--${i + 1}`)).join('')}
      ${_homeSticker(cls => `<path class="${cls}" d="${HOME_TITLE_SPARK}"/>`, '-80 -80 160 160', 'home-title__spark')}
    </h1>`;
}

let _homeIdx = 0, _homeTimer = null, _homeHold = false;

/* 사이드바 메뉴 버튼에서 아이콘·이름을 읽는다 — 메뉴가 늘거나 바뀌어도 홈을 따로 고칠 필요가 없게 */
function _homeNavItems() {
  return [...document.querySelectorAll('.sb-nav .sb-nav__item[data-sec]')]
    .filter(b => b.dataset.sec !== 'home')
    .map(b => ({ sec: b.dataset.sec, icon: b.querySelector('.sb-nav__icon')?.getAttribute('src') || '', name: b.textContent.trim() }));
}

function _homeSlideHtml(f, i, icons) {
  const icon = icons[f.sec] || '';
  const art = f.art
    ? `<img class="home-slide__art" src="${f.art}" alt="" loading="lazy">`
    : `<span class="home-slide__glow"></span><img class="home-slide__icon" src="${icon}" alt="">`;
  return `<button class="home-slide" data-i="${i}" data-sec="${f.sec}" type="button">
      <span class="home-slide__pic${f.art ? ' home-slide__pic--art' : ''}">${art}</span>
      <span class="home-slide__body">
        <span class="home-slide__title">${escHtml(f.title)}</span>
        <span class="home-slide__desc">${escHtml(f.desc)}</span>
        <span class="home-slide__go">바로가기 →</span>
      </span>
    </button>`;
}

function renderHome() {
  const sec = document.getElementById('sec-home');
  if (!sec) return;
  const nav = _homeNavItems();
  const icons = Object.fromEntries(nav.map(n => [n.sec, n.icon]));
  const feats = HOME_FEATURES.filter(f => icons[f.sec] !== undefined);
  sec.innerHTML = `
    <div class="home-hero">
      <span class="home-hero__spark home-hero__spark--1" aria-hidden="true">✦</span>
      <span class="home-hero__spark home-hero__spark--2" aria-hidden="true">✦</span>
      <span class="home-hero__spark home-hero__spark--3" aria-hidden="true">✦</span>
      <!-- 로고 캐릭터 얼굴 — 만들어 두었지만 지금은 끈다. 다시 쓰려면 hidden만 뺀다 -->
      <div class="home-hero__char" aria-hidden="true" hidden>
        <img class="home-hero__face" src="images/logo/head_normal.png" alt="" width="248" height="216">
        <img class="home-hero__face home-hero__face--smile" src="images/logo/head_smile.png" alt="" width="248" height="216">
      </div>
      ${_homeTitleHtml()}
      <div class="home-mine" id="homeMine"></div>
      <button class="home-hero__arrow" id="homeArrow" type="button" aria-label="주요 기능으로 내려가기"><span></span></button>
    </div>

    <div class="home-block" id="homeFeatures">
      <h2 class="home-h">주요 기능</h2>
      <div class="home-car" id="homeCar">
        <div class="home-car__track">${feats.map((f, i) => _homeSlideHtml(f, i, icons)).join('')}</div>
        <button class="home-car__nav home-car__nav--prev" data-step="-1" type="button" aria-label="이전">‹</button>
        <button class="home-car__nav home-car__nav--next" data-step="1" type="button" aria-label="다음">›</button>
      </div>
      <div class="home-car__dots">${feats.map((_, i) => `<button class="home-car__dot" data-i="${i}" type="button" aria-label="${i + 1}번째"></button>`).join('')}</div>
    </div>

    <div class="home-block">
      <h2 class="home-h">전체 메뉴</h2>
      <div class="home-grid">${nav.map(n => `
        <button class="home-tile" data-go="${n.sec}" type="button">
          <span class="home-tile__icon"><img src="${n.icon}" alt="" onerror="this.style.display='none'"></span>
          <span class="home-tile__name">${escHtml(n.name)}</span>
        </button>`).join('')}
      </div>
    </div>`;

  sec.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => navigateTo(b.dataset.go)));
  document.getElementById('homeArrow').addEventListener('click', () =>
    document.getElementById('homeFeatures').scrollIntoView({ behavior: 'smooth', block: 'start' }));

  if (document.body.classList.contains('char-home')) placeCharArea(document.querySelector('.sec.active')?.id.slice(4));
  else document.getElementById('homeMine').hidden = true;

  const car = document.getElementById('homeCar');
  const slides = [...car.querySelectorAll('.home-slide')];
  // 가운데 카드를 누르면 그 메뉴로, 옆 카드를 누르면 그 카드를 가운데로. 밀어서 넘긴 직후의 클릭은 무시한다
  let swiped = false;
  slides.forEach(s => s.addEventListener('click', () => {
    if (swiped) return;
    const i = +s.dataset.i;
    if (i === _homeIdx) navigateTo(s.dataset.sec); else _homeGo(i);
  }));
  car.querySelectorAll('.home-car__nav').forEach(b => b.addEventListener('click', () => _homeGo(_homeIdx + +b.dataset.step)));
  sec.querySelectorAll('.home-car__dot').forEach(d => d.addEventListener('click', () => _homeGo(+d.dataset.i)));
  // 마우스를 올려 둔 동안은 넘기지 않는다
  car.addEventListener('pointerenter', () => { _homeHold = true; });
  car.addEventListener('pointerleave', () => { _homeHold = false; });
  // 손가락으로 밀어 넘기기
  let x0 = null;
  car.addEventListener('pointerdown', e => { x0 = e.clientX; });
  car.addEventListener('pointerup', e => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) <= 40) return;
    _homeGo(_homeIdx + (dx < 0 ? 1 : -1));
    swiped = true;
    setTimeout(() => { swiped = false; }, 0);
  });

  _homeGo(_homeIdx);
  clearInterval(_homeTimer);
  // 홈이 보이고, 탭이 앞에 있고, 마우스가 올라가 있지 않을 때만 넘긴다
  _homeTimer = setInterval(() => {
    if (_homeHold || document.hidden || !sec.classList.contains('active')) return;
    _homeGo(_homeIdx + 1);
  }, HOME_AUTO_MS);
}

/* 캐릭터 영역 자리 — body.char-home이면 홈에서는 홈 머리 영역, 다른 메뉴에서는 사이드바 맨 위.
   한 화면에 한 번만 보이도록 요소 하나를 옮겨 다닌다. 요소를 옮기는 것이라 id와 클릭 동작이 그대로 살아 있고,
   자리마다 카드 모양이 달라서 옮긴 뒤 다시 그린다. body에서 char-home을 빼면 늘 사이드바에 있고 내 캐릭터 칸은 숨는다 */
function placeCharArea(sec) {
  const area = document.querySelector('.sb-char-area');
  const target = sec === 'home' ? document.getElementById('homeMine') : document.querySelector('.sidebar');
  if (!area || !target || !document.body.classList.contains('char-home') || area.parentElement === target) return;
  if (sec === 'home') target.appendChild(area); else target.prepend(area);
  renderCharList();
}

/* 가운데·왼쪽·오른쪽 자리만 정해 준다. 움직임은 CSS transition */
function _homeGo(i) {
  const slides = [...document.querySelectorAll('#homeCar .home-slide')];
  const n = slides.length;
  if (!n) return;
  _homeIdx = (i % n + n) % n;
  slides.forEach((s, k) => {
    const d = (k - _homeIdx + n) % n;
    s.classList.toggle('is-cur', d === 0);
    s.classList.toggle('is-next', d === 1 && n > 1);
    s.classList.toggle('is-prev', d === n - 1 && n > 2);
    s.tabIndex = d === 0 ? 0 : -1;
  });
  setActive(document.querySelectorAll('.home-car__dot'), document.querySelectorAll('.home-car__dot')[_homeIdx]);
}

renderHome();
