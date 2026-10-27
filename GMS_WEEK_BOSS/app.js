/* =============================================
   app.js — 네비게이션 + 주보 트래커 + 업데이트 공지
   state·save·fmtMeso·showToast와 캐릭터 표시 도우미(직업·서버 아이콘, 카드 배경)도 여기 둔다.
   설정 창은 settings.js, 캐릭터 추가·수정과 캐릭터 목록 화면은 character.js.
   두 파일은 이 파일 바로 뒤에 읽히고, 각자 끝에서 자기 화면을 처음 그린다.
   ============================================= */

/* 이미지 우클릭(저장)·드래그 저장 막기. 텍스트 선택/복사는 그대로 둔다 —
   막는 대상은 이미지뿐이라 캐릭터 정보·메소 값 등은 평소처럼 긁을 수 있다. */
document.addEventListener('contextmenu', e => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});
document.addEventListener('dragstart', e => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

/* ── state ── */
let state = { chars: [], activeChar: -1, region: 'na' };
const STORAGE_KEY = STORAGE_KEYS.boss;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* 넥슨 약칭 직업명 → 정식 이름 정규화 (HEXA_JOB_DATA 키와 일치) */
const JOB_NAME_CANON = {
  'Arch Mage (I/L)': 'Arch Mage (Ice, Lightning)',
  'Arch Mage (F/P)': 'Arch Mage (Fire, Poison)',
};
function canonJobName(name) { return JOB_NAME_CANON[name] || name; }

function load() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) state = JSON.parse(r); }
  catch {}
  if (!state.chars) state.chars = [];
  if (state.activeChar === undefined) state.activeChar = -1;
  if (!state.region) state.region = 'na';
  // 기존 저장 데이터의 약칭 직업명을 정식 이름으로 마이그레이션 +
  // 검마 결정석 포함 여부를 캐릭터별로 이전(예전엔 state 전역 하나였다 —
  // 그래서 토글이 "이 캐릭터만"이 아니라 전체 캐릭터에 적용되는 버그가 있었다).
  let migrated = false;
  state.chars.forEach(c => {
    if (c.fetched && JOB_NAME_CANON[c.fetched.job]) { c.fetched.job = JOB_NAME_CANON[c.fetched.job]; migrated = true; }
    if (c.bmCrystalIncluded === undefined) {
      c.bmCrystalIncluded = state.bmCrystalIncluded !== undefined ? state.bmCrystalIncluded : true;
    }
  });
  delete state.bmCrystalIncluded;
  if (migrated) save();
  migrateCardBgIndices();
}

/* 카드 배경 58장 리넘버링(81df258)으로 bg0과 중복이던 bg1을 지우고 bg2~58을
   한 칸씩 당겼다. 그 전에 저장된 cardBg 값은 이제 다른 그림을 가리키므로,
   딱 한 번만(플래그로 막음) 예전 번호를 새 번호로 옮겨준다 — bg1은 원래
   bg0의 중복이었으니 bg0으로, bgN(N>=2)은 bg(N-1)로. */
const CARDBG_MIGRATION_KEY = 'gms_cardbg_migrated_81df258';
function migrateCardBgIndices() {
  if (localStorage.getItem(CARDBG_MIGRATION_KEY)) return;
  let changed = false;
  state.chars.forEach(c => {
    const m = typeof c.cardBg === 'string' && /^bg(\d+)$/.exec(c.cardBg);
    if (!m) return;
    const n = parseInt(m[1], 10);
    if (n === 1) { c.cardBg = 'bg0'; changed = true; }
    else if (n >= 2) { c.cardBg = 'bg' + (n - 1); changed = true; }
  });
  if (changed) save();
  localStorage.setItem(CARDBG_MIGRATION_KEY, '1');
}

/* ── 서버(NA/EU) 토글 ── */
function applyRegionUI() {
  document.querySelectorAll('.region-toggle__btn').forEach(b =>
    b.classList.toggle('active', b.dataset.region === state.region));
}
document.querySelectorAll('.region-toggle__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.region = btn.dataset.region;
    save();
    applyRegionUI();
  });
});

/* ── 네비게이션 ── */
// 사이드바 메뉴는 전부 이 함수 하나를 거치므로, 어떤 메뉴가 몇 번 클릭됐는지
// Vercel Analytics 커스텀 이벤트로 여기 한 곳에서만 보내면 된다.
const NAV_LABELS = {
  home: '홈', meundi: '메이플 운빨 디펜스', wantchannel: '오늘의 채널 추천', charinfo: '캐릭터 목록', mcalendar: '메이플 캘린더',
  boss: '보스 수익 계산기', dailytasks: '숙제 트래커', hexa: '헥사 계산기',
  // gearcompare: '장비 교체 비교',   // 사용자 요청으로 내림 — index.html 사이드바의 NAV 관련 주석 참고
  // hyperstat: '하이퍼스탯 최적화',   // 데이터 검증 전까지 내림 — index.html 사이드바의 NAV 관련 주석 참고
  liberation: '해방 계산기', frontier: '미스틱 프론티어 계산기',
  addoption: '추가 옵션 시뮬레이터', starforce: '스타포스 시뮬레이터',
  cube: '큐브 시뮬레이터', familiar: '패밀리어 시뮬레이터', soul: '소울 증폭 시뮬레이터', polish: '연마석 시뮬레이터',
  mixdye: '코디 시뮬레이터',
  bosshp: '보스 정보', serverstatus: '서버 상태',
  community: '커뮤니티',
};
function navigateTo(sec) {
  if (typeof va === 'function') va('event', { name: '메뉴 클릭', data: { section: NAV_LABELS[sec] || sec } });
  const btn = document.querySelector(`.sb-nav__item[data-sec="${sec}"]`);
  setActive(document.querySelectorAll('.sb-nav__item'), btn);
  setActive(document.querySelectorAll('.sec'), document.getElementById('sec-' + sec));
  // 시뮬레이터 그룹 안의 메뉴가 열리면 그룹도 펼치고 머리를 강조한다
  const grp = btn?.closest('.sb-group');
  setActive(document.querySelectorAll('.sb-group'), grp, 'has-active');
  grp?.classList.add('open');
  if (sec === 'charinfo') renderCharInfo();
  if (sec === 'bosshp')    renderBossHPTable();
  if (sec === 'serverstatus') renderServerStatus();
  // 커뮤니티는 들어올 때마다 목록을 새로 받는다 — 다른 사람이 쓴 글이 그새 올라올 수 있다
  if (sec === 'community' && typeof renderCommunity === 'function') { _cmView = 'list'; renderCommunity(); }
  if (sec === 'dailytasks') renderDailyTasks();
  if (sec === 'wantchannel') renderWantChannel();
  if (sec === 'mcalendar') renderMapleCalendar();
  if (sec === 'starforce' && typeof _sfRecalcExpected === 'function') _sfRecalcExpected();
  // 큐브 데이터(1.1MB)는 이 탭을 처음 열 때만 받는다 — ensureCubeReady가 중복 요청·중복 초기화를 알아서 막는다
  if (sec === 'cube' && typeof ensureCubeReady === 'function') ensureCubeReady();
  if (sec === 'familiar' && typeof ensureFamiliarReady === 'function') ensureFamiliarReady();
  if (sec === 'soul' && typeof ensureSoulReady === 'function') ensureSoulReady();
  if (sec === 'polish' && typeof ensurePolishReady === 'function') ensurePolishReady();
  // 헤어·성형 목록(80KB)은 이 메뉴를 처음 열 때만 받는다
  if (sec === 'mixdye' && typeof ensureMixdyeReady === 'function') ensureMixdyeReady();
  if (sec === 'frontier' && typeof initFrontier === 'function') initFrontier();
  if (sec === 'meundi' && typeof initMeundi === 'function') initMeundi();
  if (sec === 'hexa')      renderAllHexaLists();
  // 들어올 때 제목·카드가 차례로 떠오르게 0.9초만 표시를 붙인다(style.css .sec--enter).
  // 그려진 뒤에 붙여야 방금 그린 카드도 같이 움직이고, 떼고 나면 결과를 다시 그려도 움직이지 않는다
  const secEl = document.getElementById('sec-' + sec);
  if (secEl) {
    secEl.classList.remove('sec--enter');
    void secEl.offsetWidth;   // 같은 메뉴를 다시 눌러도 처음부터 다시 움직이게
    secEl.classList.add('sec--enter');
    clearTimeout(secEl._enterTimer);
    secEl._enterTimer = setTimeout(() => secEl.classList.remove('sec--enter'), 900);
  }
}
document.querySelectorAll('.sb-nav__item[data-sec]').forEach(btn => {
  btn.addEventListener('click', () => { navigateTo(btn.dataset.sec); closeSidebar(); });
});
document.querySelectorAll('.sb-group__head').forEach(head => {
  head.addEventListener('click', () => head.closest('.sb-group').classList.toggle('open'));
});
document.getElementById('headerLogo').addEventListener('click', () => navigateTo('home'));

/* ── 사이드바 ──
   모바일(≤768px): 햄버거로 여닫는 드로어(sidebar-open).
   PC: 기본은 숨김. 화면 왼쪽 끝에 마우스를 대면 튀어나오고(sidebar-peek) 벗어나면 다시 숨는다.
   사이드바의 고정 버튼을 누르면 예전처럼 항상 펼쳐 둔다(sidebar-pinned, 다음 방문에도 유지). */
function closeSidebar() {
  document.body.classList.remove('sidebar-open', 'sidebar-peek');
}
const SIDEBAR_PIN_KEY = 'gms_sidebar_pinned';
function setSidebarPinned(on) {
  document.body.classList.toggle('sidebar-pinned', on);
  document.body.classList.remove('sidebar-peek');
  const b = document.getElementById('sbBtnPin');
  if (b) { b.textContent = on ? '고정 해제' : '사이드바 고정'; b.classList.toggle('is-on', on); }
  try { localStorage.setItem(SIDEBAR_PIN_KEY, on ? '1' : '0'); } catch (e) {}
}
(() => {
  let pinned = false;
  try { pinned = localStorage.getItem(SIDEBAR_PIN_KEY) === '1'; } catch (e) {}
  setSidebarPinned(pinned);
  document.getElementById('sbBtnPin')?.addEventListener('click', () => setSidebarPinned(!document.body.classList.contains('sidebar-pinned')));

  const hot = document.createElement('div');
  hot.className = 'sidebar-hotzone';
  document.body.appendChild(hot);
  let hideTimer = null;
  const peek = () => { clearTimeout(hideTimer); document.body.classList.add('sidebar-peek'); };
  const unpeek = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => document.body.classList.remove('sidebar-peek'), 250); };
  hot.addEventListener('mouseenter', peek);
  const sb = document.querySelector('.sidebar');
  sb?.addEventListener('mouseenter', () => { if (document.body.classList.contains('sidebar-peek')) peek(); });
  sb?.addEventListener('mouseleave', unpeek);
})();
document.getElementById('btnHamburger')?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');
});
document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

/* ── 유틸 ── */
// 조/억/만 단위로 끊어서 표기 — 숫자가 커지면서 "13,860,000,000 메소"처럼 자릿수를
// 세야만 읽히던 걸 "138억 6000만 메소"처럼 바로 읽히게 한다.
function fmtMeso(n) {
  n = Math.round(n);
  const neg = n < 0;
  n = Math.abs(n);
  if (n < 10000) return (neg ? '-' : '') + n.toLocaleString() + ' 메소';

  const jo  = Math.floor(n / 1e12);
  const eok = Math.floor((n % 1e12) / 1e8);
  const man = Math.floor((n % 1e8) / 1e4);
  const rest = n % 1e4;

  const parts = [];
  if (jo)  parts.push(jo.toLocaleString() + '조');
  if (eok) parts.push(eok.toLocaleString() + '억');
  if (man) parts.push(man.toLocaleString() + '만');
  if (rest) parts.push(rest.toLocaleString());

  return (neg ? '-' : '') + parts.join(' ') + ' 메소';
}

/* 차트 축처럼 좁은 자리에 짧게 찍어야 할 때 쓴다. fmtMeso는 "32억 2,009만 1,896 메소"
   처럼 길어서, 히스토그램 x축에 여러 개를 나란히 두면 서로 겹쳐 글자가 뭉개진다
   (실제로 그렇게 보임 리포트 있었음). 단위 하나만 소수점까지 남기고 나머지는 버린다. */
function fmtMesoCompact(n) {
  n = Math.round(n);
  const neg = n < 0; n = Math.abs(n);
  if (n >= 1e12) return (neg ? '-' : '') + (n / 1e12).toFixed(1) + '조';
  // 100억 넘어가면 소수점 자리가 어차피 안 중요해져서 정수로 끊어 더 짧게 보여준다
  if (n >= 1e10) return (neg ? '-' : '') + Math.round(n / 1e8).toLocaleString() + '억';
  if (n >= 1e8)  return (neg ? '-' : '') + (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4)  return (neg ? '-' : '') + (n / 1e4).toFixed(0) + '만';
  return (neg ? '-' : '') + n.toLocaleString();
}

/* ── 토스트 알림 ── */
let _toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  // reflow 후 show (연속 호출 시 애니메이션 재시작)
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
function getMaxParty(boss, diff) {
  return typeof boss.maxParty === 'object' ? (boss.maxParty[diff] ?? 6) : boss.maxParty;
}
function ck(bossId, diff) { return `${bossId}_${diff}`; }

/* ── 결정석 ── */
/* 체크해 둔 보스마다 fn(boss, bossId, diff, check). 키는 'bossId_diff'이고,
   BOSS_DATA에서 빠진 보스면 boss가 undefined다. */
function forEachCheck(ch, fn) {
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    const us = key.lastIndexOf('_');
    const bossId = key.slice(0, us);
    fn(BOSS_DATA.find(b => b.id === bossId), bossId, key.slice(us + 1), v);
  });
}
function countWeeklyCrystals(ch) {
  let n = 0;
  forEachCheck(ch, boss => { if (boss && !boss.monthly) n++; });
  return n;
}
function countMonthlyCrystals(ch) {
  let n = 0;
  forEachCheck(ch, boss => { if (boss && boss.monthly) n++; });
  return n;
}
function countBossCrystals(ch, bossId) {
  let n = 0;
  forEachCheck(ch, (boss, id) => { if (id === bossId) n++; });
  return n;
}
/* 판매 상한(MAX_CRYSTALS)에 드는 개수. 결정석 포함을 끈 캐릭터는 검은 마법사를 뺀다 —
   이 값을 캐릭터마다 따로 보지 않고 하나로 묶어 두면, 어느 캐릭터에서 토글해도
   전체에 적용되는 버그가 난다. */
function sellableCrystals(ch) {
  return countWeeklyCrystals(ch) + countMonthlyCrystals(ch)
    - (ch.bmCrystalIncluded === false ? countBossCrystals(ch, 'blackmage') : 0);
}

/* 이번 달 목요일(주간 초기화) 횟수 */
function thursdaysInMonth() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= days; d++) if (new Date(y, m, d).getDay() === 4) n++;
  return n;
}

/* 한 캐릭터의 주간 보스 수익 합 */
function charWeeklyMeso(ch) {
  let sum = 0;
  forEachCheck(ch, (boss, bossId, diff, v) => {
    if (!boss || !boss.diffs[diff] || boss.monthly) return; // 월간 보스 제외
    sum += Math.floor(boss.diffs[diff] / (v.party || 1));
  });
  return sum;
}

function charMonthlyMeso(ch) {
  const resets = thursdaysInMonth();
  let sum = 0;
  forEachCheck(ch, (boss, bossId, diff, v) => {
    if (!boss || !boss.diffs[diff]) return;
    const count = boss.monthly ? 1 : resets;
    sum += Math.floor(boss.diffs[diff] / (v.party || 1)) * count;
  });
  return sum;
}

function updateCrystalBar() {
  const totalW = state.chars.reduce((s, c) => s + countWeeklyCrystals(c), 0);
  const totalM = state.chars.reduce((s, c) => s + countMonthlyCrystals(c), 0);
  const total  = Math.min(state.chars.reduce((s, c) => s + sellableCrystals(c), 0), MAX_CRYSTALS);
  document.getElementById('totalCrystalCount').textContent = `${total} / ${MAX_CRYSTALS}`;
  document.getElementById('totalCrystalFill').style.width = (total/MAX_CRYSTALS*100) + '%';
  const elCW = document.getElementById('totalCrystalWeekly');
  if (elCW) elCW.textContent = totalW;
  const elCM = document.getElementById('totalCrystalMonthly');
  if (elCM) elCM.textContent = totalM;
  // 대여 비용은 캐릭터별로 합산해서 차감
  // weekDone이 켜진 캐릭터는 주간 합계에서 뺀다 — 이미 돈 캐릭터를 잠깐 빼고
  // 남은 캐릭터로 얼마가 더 들어오는지 보려는 용도. 수익 자체는 그대로 남는다.
  const weekTotal  = state.chars.reduce((s, c) =>
    c.weekDone ? s : s + charWeeklyMeso(c) - rentalWeeklyCost(c), 0);
  const monthTotal = state.chars.reduce((s, c) => s + charMonthlyMeso(c) - rentalMonthlyCost(c), 0);
  const elW = document.getElementById('totalWeekMeso');
  if (elW) elW.textContent = fmtMeso(weekTotal);
  const doneCount = state.chars.filter(c => c.weekDone).length;
  const elWN = document.getElementById('totalWeekDoneNote');
  if (elWN) {
    elWN.textContent = doneCount ? `${doneCount}명 제외됨` : '';
    elWN.style.display = doneCount ? '' : 'none';
  }
  const elM = document.getElementById('totalMonthMeso');
  if (elM) { elM.textContent = fmtMeso(monthTotal); elM.style.color = monthTotal < 0 ? 'var(--danger)' : ''; }
}

/* ── 캐릭터 목록 렌더 (사이드바: active 1개만) ── */
function renderCharList() {
  const ul = document.getElementById('charList');
  ul.innerHTML = '';
  if (!state.chars.length) {
    ul.innerHTML = '<li style="text-align:center;color:var(--text-sub);font-size:.8rem;padding:14px">캐릭터를 추가하세요</li>';
    updateCrystalBar(); return;
  }
  const i  = state.activeChar ?? 0;
  const ch = state.chars[i];
  if (!ch) { updateCrystalBar(); return; }
  const li = document.createElement('li');
  li.className = 'char-card active';
  const portrait = ch.fetched?.img
    ? `<img src="${ch.fetched.img}" onerror="this.src='images/dailytasks/default.png';this.parentElement.classList.add('char-card__portrait--no')" />`
    : `<img src="images/dailytasks/default.png" alt="" />`;
  const jn = charJobName(ch);
  const world = ch.fetched?.world || '';
  const sIcon = world ? serverIconSrc(world) : '';
  const sIconHtml = sIcon ? `<img src="${sIcon}" onerror="this.style.display='none'" />` : '';
  li.innerHTML = `
    <div class="char-card__inner">
      <div class="char-card__txt">
        <div class="char-card__name">${escHtml(ch.name)}</div>
        <div class="char-card__lv">Lv.${ch.level}</div>
        ${world ? `<div class="char-card__world-line">${sIconHtml}<span class="icon-lbl">${escHtml(world)}</span></div>` : ''}
        ${jn ? `<div class="char-card__job-line">${jn}</div>` : ''}
        <div class="char-card__btns">
          <button class="ccbtn ccbtn--edit" data-action="edit" data-i="${i}">수정</button>
          <button class="ccbtn ccbtn--del"  data-action="del"  data-i="${i}">삭제</button>
        </div>
      </div>
      <div class="char-card__portrait${ch.fetched?.img ? '' : ' char-card__portrait--no'}">${portraitBgHtml(ch.cardBg)}${portrait}</div>
    </div>`;
  li.addEventListener('click', e => { if (!e.target.closest('[data-action]')) selectChar(i); });
  ul.appendChild(li);
  updateCrystalBar();
}

function selectChar(i) {
  state.activeChar = i;
  save();
  renderCharList();
  renderBossTable();
  renderCharInfo();
  if (typeof renderAllHexaLists === 'function') renderAllHexaLists(); // 헥사도 해당 캐릭 수치로 갱신
  syncServerHistThenRender(state.chars[i]);
}

/* ── 보스 테이블 렌더 ── */
function renderBossTable() {
  const ch  = state.chars[state.activeChar];
  const tb  = document.getElementById('bossTableBody');
  const nm  = document.getElementById('bossCharName');
  const cp  = document.getElementById('btnCrystalCount');

  const weekRow = document.getElementById('bossWeekRow');
  const countHtml = (w, m) => `<span class="cc-item"><img src="images/icons/weekly.webp" alt="">${w}개</span><span class="cc-item"><img src="images/icons/monthly.webp" alt="">${m}개</span>`;
  if (!ch) {
    nm.textContent = '캐릭터를 선택하세요';
    cp.innerHTML = countHtml(0, 0);
    tb.innerHTML = `<tr><td colspan="4" class="empty">왼쪽에서 캐릭터를 선택하세요.</td></tr>`;
    document.getElementById('weeklyTotal').textContent = '0 메소';
    // 마지막 캐릭터를 지웠을 때 월 예상 수익에 지운 캐릭터 금액이 남지 않게 같이 비운다
    const monthEl0 = document.getElementById('monthlyTotal');
    if (monthEl0) { monthEl0.textContent = '0 메소'; monthEl0.style.color = ''; }
    if (weekRow) weekRow.style.display = 'none';
    initRentalSlots();
    return;
  }
  if (weekRow) weekRow.style.display = '';

  nm.textContent = `${ch.name} 보스 목록`;
  cp.innerHTML = countHtml(countWeeklyCrystals(ch), countMonthlyCrystals(ch));

  // 주간 합산 토글 — 캐릭터 목록 카드에서 여기로 옮겼다(보스 목록 옆이 더 눈에 띄고,
  // 카드 한 장의 세로 길이도 그만큼 줄었다). 사이드바 카드에는 이 값이 안 보이므로 합계만 다시 센다.
  const weekToggle = document.getElementById('bossWeekToggle');
  if (weekToggle) {
    const paint = () => {
      weekToggle.classList.toggle('off', !!ch.weekDone);
      weekToggle.classList.toggle('on', !ch.weekDone);
    };
    paint();
    weekToggle.onclick = () => {
      ch.weekDone = !ch.weekDone;
      save();
      paint();
      updateCrystalBar();
    };
  }

  tb.innerHTML = '';

  BOSS_DATA.forEach(boss => {
    const locked = ch.level < boss.minLevel;
    const tr = document.createElement('tr');
    if (locked) tr.classList.add('locked');

    const diffs = Object.keys(boss.diffs);
    const activeDiff = diffs.find(d => ch.checks?.[ck(boss.id, d)]?.on);
    if (activeDiff) { tr.classList.add('done'); }

    const activeMeta = activeDiff ? DIFF_META[activeDiff] : null;
    const pillDisplay = activeMeta
      ? `<span class="dpill ${activeMeta.cls} dpill--sm sel"><span class="dpill__t">${activeMeta.label}</span></span>`
      : '';
    const diffOptsHtml = `<option value="">없음</option>` +
      diffs.map(d => `<option value="${d}"${activeDiff===d?' selected':''}>${DIFF_META[d].label}</option>`).join('');
    const pillsHtml = `<div class="boss-diff-wrap">
      <select class="boss-diff-sel" data-boss="${boss.id}">${diffOptsHtml}</select>
      <span class="boss-diff-pill">${pillDisplay}</span>
    </div>`;

    const maxP  = activeDiff ? getMaxParty(boss, activeDiff) : 6;
    const party = activeDiff ? (ch.checks[ck(boss.id, activeDiff)]?.party ?? 1) : null;
    const price = activeDiff ? Math.floor(boss.diffs[activeDiff] / party) : null;

    const partyHtml = !activeDiff
      ? '<span class="party-dash">-</span>'
      : `<div class="party-stepper" data-boss="${boss.id}" data-diff="${activeDiff}">
           <button class="pm" ${party<=1?'disabled':''}>−</button>
           <span class="party-stepper__val">${party}</span>
           <button class="pp" ${party>=maxP?'disabled':''}>+</button>
         </div>`;

    const revHtml = price
      ? `<span class="rev-val">${fmtMeso(price)}</span>`
      : `<span class="rev-dash">-</span>`;

    // title(호버 툴팁)만으로는 모바일에서 설명을 볼 방법이 없다 — ⓘ를 탭하면
    // showToast로 같은 설명을 띄운다.
    const bmToggleHtml = boss.id === 'blackmage'
      ? `<button class="bm-crystal-info" id="bmCrystalInfo" type="button" aria-label="설명 보기">ⓘ</button>
         <button class="bm-crystal-toggle ${ch.bmCrystalIncluded !== false ? 'on' : 'off'}" id="bmCrystalToggle"
                title="결정석을 주간 개수에 포함시키기">
           <span class="bm-crystal-toggle__knob"></span>
           <span class="bm-crystal-toggle__txt bm-crystal-toggle__txt--on">ON</span>
           <span class="bm-crystal-toggle__txt bm-crystal-toggle__txt--off">OFF</span>
         </button>`
      : '';

    tr.innerHTML = `
      <td><div class="boss-name-cell">
        <div class="boss-thumb"><img src="${boss.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <span class="boss-label">${boss.name}</span>
        ${bmToggleHtml}
      </div></td>
      <td>${pillsHtml}</td>
      <td>${partyHtml}</td>
      <td>${revHtml}</td>`;
    tb.appendChild(tr);
  });

  document.getElementById('bmCrystalToggle')?.addEventListener('click', () => {
    ch.bmCrystalIncluded = ch.bmCrystalIncluded === false; // 캐릭터 하나만 토글
    save();
    renderBossTable();
  });
  document.getElementById('bmCrystalInfo')?.addEventListener('click', () => {
    showToast('결정석을 주간 개수에 포함시키기');
  });

  const monthSubEl = document.getElementById('monthResetCount');
  if (monthSubEl) monthSubEl.textContent = `(주${thursdaysInMonth()}회 기준)`;

  // 활성 캐릭터의 대여 슬롯·수요일 체크 동기화. 이번 주·이번 달 합계와 사이드바 막대도 여기서 다시 그린다.
  initRentalSlots();

  // 난이도 select → 변경
  tb.querySelectorAll('.boss-diff-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      const bossId = sel.dataset.boss;
      const diff   = sel.value;
      const boss   = BOSS_DATA.find(b => b.id === bossId);
      if (!ch.checks) ch.checks = {};
      Object.keys(boss.diffs).forEach(d => { ch.checks[ck(bossId,d)] = { on:false, party: ch.checks[ck(bossId,d)]?.party ?? 1 }; });
      if (diff) {
        // 상단 막대(updateCrystalBar)와 같은 기준으로 센다
        if (state.chars.reduce((s, c) => s + sellableCrystals(c), 0) >= MAX_CRYSTALS) {
          showToast(`주간 결정석은 최대 ${MAX_CRYSTALS}개까지 판매 가능합니다.`);
        } else if (!boss.monthly && countWeeklyCrystals(ch) >= 14) {
          showToast('캐릭터당 주간 보스는 최대 14개까지 선택 가능합니다.');
        } else {
          ch.checks[ck(bossId, diff)] = { on:true, party: ch.checks[ck(bossId, diff)]?.party ?? 1 };
        }
      }
      save(); renderBossTable();
    });
  });

  // stepper 클릭
  tb.querySelectorAll('.party-stepper').forEach(st => {
    const { boss: bossId, diff } = st.dataset;
    const key = ck(bossId, diff);
    const boss = BOSS_DATA.find(b => b.id === bossId);
    const maxP = getMaxParty(boss, diff);
    st.querySelector('.pm').addEventListener('click', () => {
      const cur = ch.checks[key]?.party ?? 1;
      if (cur > 1) { ch.checks[key].party = cur-1; save(); renderBossTable(); }
    });
    st.querySelector('.pp').addEventListener('click', () => {
      const cur = ch.checks[key]?.party ?? 1;
      if (cur < maxP) { ch.checks[key].party = cur+1; save(); renderBossTable(); }
    });
  });
}

/* ── 대여템 ── */
const RENTAL_ITEMS = [
  { id:'face',    img:'images/icons/Red_Beryl_Face_Accessory.png',   cost: 200_000_000 },
  { id:'eye',     img:'images/icons/Red_Beryl_Eye_Accessory.png',    cost: 200_000_000 },
  { id:'ear',     img:'images/icons/Red_Beryl_Earrings.png',         cost: 300_000_000 },
  { id:'pendant', img:'images/icons/Red_Beryl_Pendant.png',          cost: 300_000_000 },
  { id:'belt',    img:'images/icons/Red_Beryl_Belt.png',             cost: 300_000_000 },
  { id:'ror',     img:'images/icons/Finite_Red_Beryl_Ring(RoR).png', cost: 100_000_000 },
  { id:'cr',      img:'images/icons/Finite_Red_Beryl_Ring(CR).png',  cost: 100_000_000 },
  { id:'arthur',  img:'images/icons/Arthur_Totem.png',               cost: 100_000_000 },
  { id:'flash',   img:'images/icons/Flash_Totem.png',                cost: 100_000_000 },
  { id:'beryl',   img:'images/icons/Red_Beryl_Totem.png',            cost: 100_000_000 },
];

// 대여는 캐릭터별로 저장 (ch.rental). 인자 없으면 활성 캐릭터 기준.
function getRentalState(ch = state.chars[state.activeChar]) {
  if (!ch) return { slots: [], wed: false };
  if (!ch.rental || typeof ch.rental !== 'object') ch.rental = { slots: [], wed: false };
  if (!Array.isArray(ch.rental.slots)) ch.rental.slots = [];
  return ch.rental;
}

function rentalWeeklyCost(ch = state.chars[state.activeChar]) {
  const s = getRentalState(ch);
  return RENTAL_ITEMS.reduce((t, item) => t + (s.slots.includes(item.id) ? item.cost : 0), 0);
}
function rentalMonthlyCost(ch = state.chars[state.activeChar]) {
  const s = getRentalState(ch);
  return rentalWeeklyCost(ch) * (s.wed ? 2 : 4);
}

function initRentalSlots() {
  const container = document.getElementById('rentalSlots');
  if (!container) return;
  const ch = state.chars[state.activeChar];
  const s = getRentalState(ch);
  container.innerHTML = '';
  RENTAL_ITEMS.forEach(item => {
    const slot = document.createElement('div');
    slot.className = 'rental-slot' + (s.slots.includes(item.id) ? ' on' : '');
    slot.dataset.id = item.id;
    slot.innerHTML = `<img src="${item.img}" alt="${item.id}" onerror="this.style.opacity='.3'">`;
    slot.addEventListener('click', () => {
      if (!state.chars[state.activeChar]) return;
      const rs = getRentalState();
      const idx = rs.slots.indexOf(item.id);
      if (idx >= 0) rs.slots.splice(idx, 1); else rs.slots.push(item.id);
      save();
      initRentalSlots();
    });
    container.appendChild(slot);
  });
  // 수요일 체크박스도 활성 캐릭터 기준으로 동기화
  const wedCb = document.getElementById('rentalWed');
  if (wedCb) wedCb.checked = s.wed;
  updateRentalTotals();
}

function updateRentalTotals() {
  const wCost = rentalWeeklyCost();
  const label = document.getElementById('rentalCostLabel');
  if (label) label.textContent = wCost > 0 ? `-${fmtMeso(wCost)}` : '';

  const ch = state.chars[state.activeChar];
  if (!ch) return;
  const weekNet = charWeeklyMeso(ch) - wCost;
  const monthNet = charMonthlyMeso(ch) - rentalMonthlyCost();
  const wEl = document.getElementById('weeklyTotal');
  const mEl = document.getElementById('monthlyTotal');
  if (wEl) { wEl.textContent = fmtMeso(weekNet); wEl.style.color = weekNet < 0 ? 'var(--danger)' : 'var(--accent)'; }
  if (mEl) { mEl.textContent = fmtMeso(monthNet); mEl.style.color = monthNet < 0 ? 'var(--danger)' : 'var(--accent)'; }
  updateCrystalBar();
}

const rentalWedCb = document.getElementById('rentalWed');
rentalWedCb?.addEventListener('change', () => {
  if (!state.chars[state.activeChar]) return;
  getRentalState().wed = rentalWedCb.checked;
  save();
  updateRentalTotals();
});

/* ── 보스 초기화 ── */
document.getElementById('btnResetBoss').addEventListener('click', () => {
  const ch = state.chars[state.activeChar];
  if (!ch) return;
  openConfirm(`'${ch.name}'의 보스 체크를 초기화할까요?`, () => {
    ch.checks = {};
    save(); closeConfirm();
    renderBossTable();
  });
});

/* ── 캐릭터 표시 도우미 ──
   사이드바·캐릭터 목록·캘린더·커뮤니티·채널 추천·서버 상태가 같이 쓴다. */
// 캐릭터 일러스트 뒤에 깔리는 배경 그림. 기본값은 CSS에 박혀 있는
// images/icons/bg.webp이고, 캐릭터가 cardBg를 고르면 그걸로 갈아끼운다.
// png를 먼저 시도하고 없으면 webp, 둘 다 없으면 요소가 사라져 기본 배경이 드러난다.
function portraitBgHtml(cardBg) {
  if (!cardBg) return '';
  const id = cardBg.replace(/^bg/, '');
  const [primary, fallback] = cardBgCandidates(id);
  return `<img class="portrait-bg" src="${primary}" data-fallback="${fallback}" alt=""
    onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src=this.dataset.fallback;}else{this.remove();}">`;
}

/* 직업명 비교용 — 대소문자·공백·특수문자 무시 */
function normJobName(s) { return s.toLowerCase().replace(/[^a-z]/g, ''); }

/* nexon 영문 직업명 → JOB_LIST 인덱스 (정규화 매칭) */
function jobIdxFromName(jobName) {
  if (!jobName) return -1;
  const norm = normJobName(jobName);
  return JOB_LIST.findIndex(j => normJobName(j.name) === norm);
}

/* 직업 아이콘 파일명이 영문 직업명에서 공백만 뺀 것과 다른 직업 */
const JOB_ASSET_NAMES = {
  'Dark Knight':'DarkNight',
  'Arch Mage (Fire, Poison)':'Arch_MageFP',
  'Arch Mage (F/P)':'Arch_MageFP',
  'Arch Mage (Ice, Lightning)':'Arch_MageIL',
  'Arch Mage (I/L)':'Arch_MageIL',
  'Bowmaster':'BowMaster',
  'Pathfinder':'PathFinder',
  'Night Lord':'NightLord',
  'Dual Blade':'DualBlade',
  'Buccaneer':'Viper',
  'Corsair':'Captain',
  'Cannoneer':'CannonShooter',
  'Dawn Warrior':'SoulMaster',
  'Blaze Wizard':'FlameWizard',
  'Wind Archer':'WindBreaker',
  'Thunder Breaker':'Striker',
  'Mihile':'Mikhail',
  'Shade':'Eunwol',
  'Battle Mage':'Battle',
  'Demon Slayer':'DemonSlayer',
  'Demon Avenger':'DemonAvenger',
  'Angelic Buster':'AngelicBuster',
  'Erel Light':'ErelLight',
  'Sia Astelle':'SiaAstelle',
  'Hoyoung':'HoYoung',
};
// 파일명 대소문자는 images/server/의 실제 파일과 정확히 일치해야 한다.
// 로컬 Windows는 대소문자를 안 가리지만 배포(Vercel/리눅스)는 가려서 404가 난다.
const SERVER_ASSET_EXT = { Bera:'webp', Scania:'webp', Kronos:'webp', Hyperion:'webp', Luna:'webp', Solis:'webp', Challengers:'webp' };

/* 캐릭터 직업명/아이콘 — 전부 영문명 기준 (name 이 곧 아이콘 파일명) */
function charJobName(ch) {
  return ch.fetched?.job || JOB_LIST[ch.jobIdx]?.name || '';
}
function charJobHeadSrc(ch) {
  const en = charJobName(ch);
  if (!en) return '';
  // 표에 그대로 있는 이름 → 정규화해서 같은 이름 → 공백만 뺀 이름 순서로 찾는다
  const norm = normJobName(en);
  const key = JOB_ASSET_NAMES[en] ? en : Object.keys(JOB_ASSET_NAMES).find(k => normJobName(k) === norm);
  const asset = key ? JOB_ASSET_NAMES[key] : en.replace(/\s+/g, '');
  return asset ? `images/jobs/Head/${asset}.webp` : '';
}
function serverIconSrc(world) {
  const ext = SERVER_ASSET_EXT[world];
  return ext ? `images/server/${encodeURIComponent(world)}.${ext}` : '';
}
/* 랭킹으로 조회한 캐릭터는 그 지역, 직접 넣은 캐릭터는 지금 고른 서버 토글을 따른다 */
function charRegion(ch) {
  return ch.fetched?.region || (state.region === 'eu' ? 'EU' : 'NA');
}

/* ── 확인 창 ──
   확인을 누르면 onOk. 창을 닫는 건 onOk가 한다 — 닫지 않고 바로 새로고침하는 곳도 있다. */
function openConfirm(msg, onOk) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('overlayConfirm').classList.add('open');
  document.getElementById('confirmOk').onclick = onOk;
}
function closeConfirm() {
  document.getElementById('overlayConfirm').classList.remove('open');
}
['confirmClose','confirmCancel'].forEach(id => {
  document.getElementById(id).addEventListener('click', closeConfirm);
});
// 뭔가를 길게 입력하는 창은 바깥을 잘못 눌렀을 때 쓰던 내용이 통째로 날아간다.
// 그런 창(로그인, 관리자 알림 발송)은 여기서 빼고 ×로만 닫게 한다.
document.querySelectorAll('.overlay:not(#overlayAuth):not(#overlayAdmin)').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

/* ── 첫 방문 공지 카드 ──
   ※ 배포(커밋/푸시)할 때마다 여기에 이번에 바뀐 내용을 정리해 넣는다.
      id를 새 값으로 바꿔야 예전에 "확인"을 누른 사람에게도 새 공지가 다시 뜬다. */
// 하루 단위로 쌓는다. 맨 위가 최신. 같은 날 또 배포하면 그 날 items에 줄만 추가하면 된다.
const NOTICE_LOG = [
  {
    date: '2026. 10. 21.',
    items: [
      {
        head: '코디 시뮬레이터 추가',
        desc: '시뮬레이터 메뉴 맨 위에 새로 생겼습니다. 헤어·성형을 골라 믹스 염색과 믹스 렌즈를 비율별로 미리 볼 수 있습니다.',
      },
      {
        head: '코디 탭에서 아이템 입혀 보기',
        desc: '코디 탭에서 모자·한벌옷·신발 등을 골라 캐릭터에 입혀 볼 수 있습니다. 목록에서 누르면 입고, 다시 누르면 벗습니다.',
      },
      {
        head: '코디 시뮬레이터 캐릭터 성별 선택',
        desc: '여자·남자 캐릭터를 골라 볼 수 있습니다. 남자 헤어·성형도 추가됐고, 처음에는 기본 옷을 입고 있습니다. 한벌옷을 입으면 기본 옷이 빠집니다.',
      },
      {
        head: '코디 시뮬레이터 사용 편의 개선',
        desc: '처음 들어가면 기본 헤어·성형·옷을 입은 캐릭터로 시작합니다. 현재 조합의 "초기화"를 누르면 헤어·성형·코디가 처음 상태로 돌아갑니다. 탭이나 부위를 바꾸면 검색어가 비워지고, 고른 아이템은 그대로 남습니다.',
      },
      {
        head: '코디 시뮬레이터 피부 탭 추가',
        desc: '피부 탭에서 피부를 골라 입혀 볼 수 있습니다. 이름에 Custom이 붙은 커스텀 피부는 색조·채도·명도로 색도 바꿀 수 있습니다.',
      },
      {
        head: '믹스 염색 무광 구간 반영',
        desc: '게임에서 머리 광이 죽어 보이는 기준 색 77·84·89 비율도 그대로 보여 줍니다. 이 비율을 고르면 "무광" 표시가 나옵니다.',
      },
      {
        head: '헤어 색 이름을 게임과 같게 수정',
        desc: '헤어 색이 게임 미용실과 같은 이름으로 나옵니다. 게임의 "ColorBlend 헤어 이름"을 그대로 검색해도 찾을 수 있습니다.',
      },
      {
        head: 'PC 메뉴 자동 숨김',
        desc: '화면 왼쪽 끝에 마우스를 대면 메뉴가 나옵니다. 메뉴 위쪽 "사이드바 고정"을 누르면 항상 펼쳐 둡니다.',
      },
    ],
  },
  {
    date: '2026. 10. 03.',
    items: [
      {
        head: '운빨 디펜스 카드에 사이드킥 얼굴 추가',
        desc: '팀별 사이드킥 얼굴과 레벨이 카드에 함께 나옵니다.',
      },
      {
        head: '운빨 디펜스 제보 조합 추가',
        desc: '갤러리에서 제보된 조합을 뽑기 횟수별로 볼 수 있습니다.',
      },
      {
        head: '운빨 디펜스 작은 창 보기 개선',
        desc: '작은 창이 더 넓게 열리고, 확정된 조합만 보여 줍니다.',
      },
    ],
  },
  {
    date: '2026. 10. 02.',
    items: [
      {
        head: '메이플 운빨 디펜스 공략 추가',
        desc: '사이드킥 조합과 공략을 한국어로 정리했습니다. 확정 조합과 제보 조합을 나눠서 볼 수 있습니다.',
      },
    ],
  },
  {
    date: '2026. 09. 26.',
    items: [
      {
        head: '연마석 시뮬레이터 추가',
        desc: '생명의 연마석·신념의 연마석을 몇 개 쓸지 고르고 돌려 볼 수 있습니다. 최대 개수를 쓰면 반드시 성공합니다.',
      },
      {
        head: '소울 증폭 목표 옵션 설정 추가',
        desc: '옵션마다 원하는 수치를 넣고, 같은 옵션을 여러 줄로 정할 수 있습니다. 공격력·마력 3줄은 버튼 한 번으로 정해집니다.',
      },
      {
        head: '소울 증폭 등급 상승 반영',
        desc: '재설정할 때마다 등급이 오를 수 있고, 100·256·451번째에는 반드시 오릅니다.',
      },
      {
        head: '큐브 목표 수치 자동 맞춤',
        desc: '시작 등급을 바꾸면 목표 옵션 수치도 그 등급에 맞게 바뀝니다.',
      },
    ],
  },
  {
    date: '2026. 09. 25.',
    items: [
      {
        head: '소울 증폭 시뮬레이터 추가',
        desc: '새로 나온 소울 증폭을 미리 돌려 볼 수 있습니다. 레어·에픽 옵션 수치는 예상값이라 실제와 조금 다를 수 있습니다.',
      },
    ],
  },
  {
    date: '2026. 09. 24.',
    items: [
      {
        head: '보스 드랍 아이템 설명 보기',
        desc: '보스 정보에서 아이템 아이콘에 마우스를 올리면 이름이, 누르면 게임 속 설명이 나옵니다. 일부 아이템은 아직 설명이 없습니다.',
      },
    ],
  },
  /* 장비 교체 비교 공지 — 사용자 요청으로 기능 자체를 내려서 같이 주석 처리
  {
    date: '2026. 09. 16.',
    items: [
      {
        head: '장비 교체 비교 계산기가 생겼습니다',
        desc: '지금 낀 장비와 바꾸려는 장비의 스탯을 각각 넣으면 데미지가 몇 % 늘거나 주는지 계산해드립니다.',
      },
    ],
  },
  */
  /* 하이퍼스탯 최적화 공지 — 데이터 검증 전까지 내림
  {
    date: '2026. 09. 01.',
    items: [
      {
        head: '하이퍼스탯 최적화 계산기가 생겼습니다',
        desc: '남은 하이퍼스탯 포인트를 어느 스탯에 쓰는 게 가장 이득인지 계산해 추천해드립니다.',
      },
    ],
  },
  */
  {
    date: '2026. 09. 01.',
    items: [
      {
        head: '캐릭터 카드에 이번 주 예상 수익 표시',
        desc: '보스 수익 계산기에서 체크한 보스와 대여비를 반영한 수익이 캐릭터 카드 아래에 나옵니다. 마우스를 올리면 정확한 금액을 볼 수 있습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 26.',
    items: [
      {
        head: '커뮤니티 글 꾸미기와 사진 넣기',
        desc: '글자를 굵게·기울게·밑줄·크기로 꾸밀 수 있고, 색은 빨강·노랑·파랑 중에서 고릅니다. 사진은 글 중간 원하는 곳에 넣을 수 있습니다.',
      },
      {
        head: '닉네임으로 대표 캐릭터 보기',
        desc: '계정 설정에서 대표 캐릭터를 정해 두면, 다른 사람이 내 닉네임을 눌렀을 때 그 캐릭터가 보입니다.',
      },
      {
        head: '댓글 알림과 답글',
        desc: '내 글이나 댓글에 새 댓글이 달리면 알려 드리고, 댓글에 답글을 이어서 달 수 있습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 25.',
    items: [
      {
        head: '미스틱 프론티어 계산기 추가',
        desc: '패밀리어 3장과 잠재, 주사위 눈을 넣으면 라운드 점수를 계산합니다. 목표 점수를 적으면 넘는지도 알려 줍니다.',
      },
      {
        head: '프론티어 잠재 쉽게 고르기',
        desc: '잠재 옵션을 목록에서 조건과 수치만 골라 넣습니다. 이벤트 잠재도 따로 고를 수 있습니다.',
      },
      {
        head: '조건에 맞는 잠재만 점수에 반영',
        desc: '지금 주사위와 팀 구성에서 실제로 적용되는 잠재만 계산하고, 카드마다 적용 여부를 보여 줍니다.',
      },
      {
        head: '보너스 주사위 고르기',
        desc: '보너스 주사위를 종류와 등급으로 고르면 수치가 자동으로 들어갑니다.',
      },
      {
        head: '프론티어 덱 저장',
        desc: '캐릭터마다 팀 구성과 보너스 주사위를 3개까지 저장하고 다시 불러올 수 있습니다. 로그인하면 다른 기기에서도 이어서 쓸 수 있습니다.',
      },
    ],
  },
];
// 카드에 보여줄 최근 며칠치. 너무 길어지면 읽지 않으므로 잘라서 보여준다.
const NOTICE_SHOW_DAYS = 3;
const NOTICE = {
  id: '2026-10-21-coordi-j',   // 이 값이 바뀌어야 이미 확인한 사람에게도 다시 뜬다
  title: '업데이트 안내',
  days: NOTICE_LOG.slice(0, NOTICE_SHOW_DAYS),
};
const NOTICE_SEEN_KEY = 'gms_notice_seen';

function showNoticeModal() {
  if (!NOTICE.days.length) return;
  if (localStorage.getItem(NOTICE_SEEN_KEY) === NOTICE.id) return;

  let overlay = document.getElementById('noticeOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'noticeOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal" style="width:min(520px,94vw)">
      <div class="modal__head">
        <span class="modal__title modal__title--notice">${escHtml(NOTICE.title)}</span>
      </div>
      <div class="modal__body">
        ${NOTICE.days.map(day => `
          <div class="notice-day">
            <div class="notice-date">${escHtml(day.date)}</div>
            ${day.items.map(it => `
              <div class="notice-item">
                <div class="notice-item__head">${escHtml(it.head)}</div>
                <div class="notice-item__desc">${escHtml(it.desc)}</div>
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="modal__foot">
        <button class="sbtn sbtn--ghost" id="noticeLater">다음 업데이트까지 보지 않기</button>
        <button class="sbtn sbtn--primary" id="noticeOk">확인</button>
      </div>
    </div>`;
  overlay.classList.add('open');

  // 바깥을 눌러도 닫히지 않으므로 실수로 넘길 일은 없다.
  // 두 버튼의 의미가 다르다:
  //   확인 — 이번 방문에서만 닫는다. 다시 들어오면 또 보인다.
  //   다음 업데이트까지 보지 않기 — 지금 id를 저장해, 다음 배포로 id가 바뀔 때까지 숨긴다.
  document.getElementById('noticeOk').addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  document.getElementById('noticeLater').addEventListener('click', () => {
    localStorage.setItem(NOTICE_SEEN_KEY, NOTICE.id);
    overlay.classList.remove('open');
  });
}
document.addEventListener('DOMContentLoaded', showNoticeModal);

/* ── 초기화 ── */
load();

// 구버전: 대여가 전역(localStorage 'rental')이었음 → 첫 캐릭터로 1회 이전 후 제거
(function migrateRental() {
  const legacy = localStorage.getItem('rental');
  if (!legacy) return;
  try {
    const s = JSON.parse(legacy);
    if (state.chars[0] && !state.chars[0].rental && (s.slots?.length || s.wed)) {
      state.chars[0].rental = { slots: Array.isArray(s.slots) ? s.slots : [], wed: !!s.wed };
      save();
    }
  } catch {}
  localStorage.removeItem('rental');
})();

// 헥사는 캐릭터별 키(hx_skill_<id> 등)에 저장한다. 전체 초기화(settings.js)도 이 목록을 쓴다.
const HEXA_KEY_BASES = [STORAGE_KEYS.hexaSkill, STORAGE_KEYS.hexaMastery, STORAGE_KEYS.hexaBoost, STORAGE_KEYS.hexaCommon];

// 구버전: 헥사가 전역(hx_skill 등)이었음 → 첫 캐릭터 키로 1회 이전 후 제거
(function migrateHexa() {
  const ch0 = state.chars[0];
  const cid = ch0 ? (ch0.id ?? 0) : null;
  HEXA_KEY_BASES.forEach(base => {
    const legacy = localStorage.getItem(base); // 접미사 없는 구버전 키
    if (legacy == null) return;
    if (cid != null && localStorage.getItem(`${base}_${cid}`) == null) {
      localStorage.setItem(`${base}_${cid}`, legacy);
    }
    localStorage.removeItem(base);
  });
})();

applyRegionUI();
renderCharList();
renderBossTable();

/* 입력칸에서 Enter → blur(=commit). 입력은 바깥 클릭/Enter 전까지 자유롭게. */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') {
    e.target.blur();
  }
});
