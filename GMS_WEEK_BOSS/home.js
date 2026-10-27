/* =============================================
   home.js — 첫 화면(홈)
   뮤즈대시 첫 화면처럼 모눈종이 머리 영역(떠다니는 별님앱 글자, 그 아래 사이드바에 있던 명찰·결정석·수익,
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
      <h1 class="home-hero__title">별님앱</h1>
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

  /* 사이드바를 끈 동안(body.no-sidebar)에는 사이드바의 캐릭터 영역을 통째로 여기로 옮긴다.
     요소를 옮기는 것이라 id와 클릭 동작이 그대로 살아 있고, app.js가 그리던 그대로 갱신된다.
     사이드바를 다시 켜면 옮기지 않으므로 내 캐릭터 칸은 빈 채로 숨는다 */
  const mine = document.getElementById('homeMine');
  const charArea = document.querySelector('.sb-char-area');
  if (document.body.classList.contains('no-sidebar') && charArea) mine.appendChild(charArea);
  else mine.hidden = true;

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
