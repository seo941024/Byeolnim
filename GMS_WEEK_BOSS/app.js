/* =============================================
   app.js — 네비게이션 + 주보 트래커
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

/* 주간 초기화 카운트다운은 헤더에서 뺐다(2026-08-23). 표시 전용이라 다른 로직이
   쓰지 않던 값이고, 그 자리에 로그인 버튼을 뒀다. */

/* ── 네비게이션 ── */
// 사이드바 메뉴는 전부 이 함수 하나를 거치므로, 어떤 메뉴가 몇 번 클릭됐는지
// Vercel Analytics 커스텀 이벤트로 여기 한 곳에서만 보내면 된다.
const NAV_LABELS = {
  wantchannel: '오늘의 채널 추천', charinfo: '캐릭터 목록', mcalendar: '메이플 캘린더',
  boss: '보스 수익 계산기', dailytasks: '숙제 트래커', hexa: '헥사 계산기',
  liberation: '해방 계산기', addoption: '추옵 시뮬레이터', starforce: '스타포스 시뮬레이터',
  cube: '큐브 시뮬레이터', bosshp: '보스 정보', serverstatus: '서버 상태',
};
function navigateTo(sec) {
  if (typeof va === 'function') va('event', { name: '메뉴 클릭', data: { section: NAV_LABELS[sec] || sec } });
  document.querySelectorAll('.sb-nav__item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  const btn = document.querySelector(`.sb-nav__item[data-sec="${sec}"]`);
  if (btn) btn.classList.add('active');
  const secEl = document.getElementById('sec-' + sec);
  if (secEl) secEl.classList.add('active');
  if (sec === 'charinfo') renderCharInfo();
  if (sec === 'bosshp')    renderBossHPTable();
  if (sec === 'serverstatus') renderServerStatus();
  if (sec === 'dailytasks') renderDailyTasks();
  if (sec === 'wantchannel') renderWantChannel();
  if (sec === 'mcalendar') renderMapleCalendar();
  if (sec === 'starforce' && typeof _sfRecalcExpected === 'function') _sfRecalcExpected();
  // 큐브 데이터(1.1MB)는 이 탭을 처음 열 때만 받는다 — ensureCubeReady가 중복 요청·중복 초기화를 알아서 막는다
  if (sec === 'cube' && typeof ensureCubeReady === 'function') ensureCubeReady();
  if (sec === 'familiar' && typeof ensureFamiliarReady === 'function') ensureFamiliarReady();
  if (sec === 'hexa')      renderAllHexaLists();
}
document.querySelectorAll('.sb-nav__item').forEach(btn => {
  btn.addEventListener('click', () => { navigateTo(btn.dataset.sec); closeSidebar(); });
});
document.getElementById('headerLogo').addEventListener('click', () => navigateTo('charinfo'));

/* ── 모바일 사이드바 드로어 토글 ── */
function closeSidebar() { document.body.classList.remove('sidebar-open'); }
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
function countWeeklyCrystals(ch) {
  let n = 0;
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    const bossId = key.slice(0, key.lastIndexOf('_'));
    const boss = BOSS_DATA.find(b => b.id === bossId);
    if (boss && !boss.monthly) n++;
  });
  return n;
}
function countMonthlyCrystals(ch) {
  let n = 0;
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    const bossId = key.slice(0, key.lastIndexOf('_'));
    const boss = BOSS_DATA.find(b => b.id === bossId);
    if (boss && boss.monthly) n++;
  });
  return n;
}
function countCrystals(ch) {
  return countWeeklyCrystals(ch) + countMonthlyCrystals(ch);
}
function countBossCrystals(ch, bossId) {
  let n = 0;
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    if (key.slice(0, key.lastIndexOf('_')) === bossId) n++;
  });
  return n;
}
/* 한 캐릭터의 주간 보스 수익 합 */
function thursdaysInMonth() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= days; d++) if (new Date(y, m, d).getDay() === 4) n++;
  return n;
}

function charWeeklyMeso(ch) {
  let sum = 0;
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    const us = key.lastIndexOf('_');
    const bossId = key.slice(0, us), diff = key.slice(us + 1);
    const boss = BOSS_DATA.find(b => b.id === bossId);
    if (!boss || !boss.diffs[diff] || boss.monthly) return; // 월간 보스 제외
    sum += Math.floor(boss.diffs[diff] / (v.party || 1));
  });
  return sum;
}

function charMonthlyMeso(ch) {
  const resets = thursdaysInMonth();
  let sum = 0;
  Object.entries(ch.checks || {}).forEach(([key, v]) => {
    if (!v?.on) return;
    const us = key.lastIndexOf('_');
    const bossId = key.slice(0, us), diff = key.slice(us + 1);
    const boss = BOSS_DATA.find(b => b.id === bossId);
    if (!boss || !boss.diffs[diff]) return;
    const count = boss.monthly ? 1 : resets;
    sum += Math.floor(boss.diffs[diff] / (v.party || 1)) * count;
  });
  return sum;
}

function updateCrystalBar() {
  const totalW = state.chars.reduce((s, c) => s + countWeeklyCrystals(c), 0);
  const totalM = state.chars.reduce((s, c) => s + countMonthlyCrystals(c), 0);
  // 캐릭터별로 토글이 꺼진 것만 뺀다 — 전부 하나의 값으로 묶여 있으면
  // 어느 캐릭터에서 토글해도 전체에 적용되는 버그가 난다.
  const bmExcluded = state.chars.reduce((s, c) =>
    s + (c.bmCrystalIncluded === false ? countBossCrystals(c, 'blackmage') : 0), 0);
  const cappedM = totalM - bmExcluded;
  const total  = Math.min(totalW + cappedM, MAX_CRYSTALS);
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
  if (elM) { elM.textContent = (monthTotal < 0 ? '-' : '') + fmtMeso(Math.abs(monthTotal)); elM.style.color = monthTotal < 0 ? 'var(--danger)' : ''; }
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
        <div class="char-card__name">${ch.name}</div>
        <div class="char-card__lv">Lv.${ch.level}</div>
        ${world ? `<div class="char-card__world-line">${sIconHtml}<span class="icon-lbl">${world}</span></div>` : ''}
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

  if (!ch) {
    nm.textContent = '캐릭터를 선택하세요';
    cp.innerHTML = `<span class="cc-item"><img src="images/icons/weekly.webp" alt="">0개</span><span class="cc-item"><img src="images/icons/monthly.webp" alt="">0개</span>`;
    tb.innerHTML = `<tr><td colspan="4" class="empty">왼쪽에서 캐릭터를 선택하세요.</td></tr>`;
    document.getElementById('weeklyTotal').textContent = '0 메소';
    initRentalSlots();
    return;
  }

  const cW = countWeeklyCrystals(ch);
  const cM = countMonthlyCrystals(ch);
  nm.textContent = `${ch.name} 보스 목록`;
  cp.innerHTML = `<span class="cc-item"><img src="images/icons/weekly.webp" alt="">${cW}개</span><span class="cc-item"><img src="images/icons/monthly.webp" alt="">${cM}개</span>`;

  let total = 0;
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
    if (price && !boss.monthly) total += price; // 월간 보스는 주간 합계 제외

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
    updateCrystalBar();
  });
  document.getElementById('bmCrystalInfo')?.addEventListener('click', () => {
    showToast('결정석을 주간 개수에 포함시키기');
  });

  const wCost = rentalWeeklyCost();
  const mCost = rentalMonthlyCost();
  const weekNet = total - wCost;
  const wEl2 = document.getElementById('weeklyTotal');
  wEl2.textContent = (weekNet < 0 ? '-' : '') + fmtMeso(Math.abs(weekNet));
  wEl2.style.color = weekNet < 0 ? 'var(--danger)' : 'var(--accent)';
  const resets = thursdaysInMonth();
  const monthEl = document.getElementById('monthlyTotal');
  const monthSubEl = document.getElementById('monthResetCount');
  if (monthEl) {
    const monthNet = charMonthlyMeso(ch) - mCost;
    monthEl.textContent = (monthNet < 0 ? '-' : '') + fmtMeso(Math.abs(monthNet));
    monthEl.style.color = monthNet < 0 ? 'var(--danger)' : '';
  }
  if (monthSubEl) monthSubEl.textContent = `(주${resets}회 기준)`;

  // 활성 캐릭터의 대여 슬롯·수요일 체크 동기화
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
        if (state.chars.reduce((s,c)=>s+countCrystals(c),0) >= MAX_CRYSTALS) {
          showToast(`주간 결정석은 최대 ${MAX_CRYSTALS}개까지 판매 가능합니다.`);
          save(); renderBossTable(); renderCharList(); return;
        }
        if (!boss.monthly && countWeeklyCrystals(ch) >= 14) {
          showToast('캐릭터당 주간 보스는 최대 14개까지 선택 가능합니다.');
          save(); renderBossTable(); renderCharList(); return;
        }
        ch.checks[ck(bossId, diff)] = { on:true, party: ch.checks[ck(bossId, diff)]?.party ?? 1 };
      }
      save(); renderBossTable(); renderCharList();
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
function saveRentalState(s, ch = state.chars[state.activeChar]) {
  if (!ch) return;
  ch.rental = s;
  save();
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
      saveRentalState(rs);
      initRentalSlots();
      updateRentalTotals();
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
  let bossWeekly = 0;
  (ch.checks ? Object.entries(ch.checks) : []).forEach(([key, val]) => {
    if (!val?.on) return;
    const sep = key.lastIndexOf('_');
    const bossId = key.slice(0, sep);
    const diff   = key.slice(sep + 1);
    const boss = BOSS_DATA.find(b => b.id === bossId);
    if (!boss || boss.monthly) return;
    bossWeekly += Math.floor((boss.diffs[diff] || 0) / Math.max(1, val.party || 1));
  });
  const wEl = document.getElementById('weeklyTotal');
  const mEl = document.getElementById('monthlyTotal');
  const wCost2 = rentalWeeklyCost();
  const mCost2 = rentalMonthlyCost();
  const weekNet = bossWeekly - wCost2;
  const monthNet = charMonthlyMeso(ch) - mCost2;
  if (wEl) { wEl.textContent = (weekNet < 0 ? '-' : '') + fmtMeso(Math.abs(weekNet)); wEl.style.color = weekNet < 0 ? 'var(--danger)' : 'var(--accent)'; }
  if (mEl) { mEl.textContent = (monthNet < 0 ? '-' : '') + fmtMeso(Math.abs(monthNet)); mEl.style.color = monthNet < 0 ? 'var(--danger)' : 'var(--accent)'; }
  updateCrystalBar();
}

document.addEventListener('DOMContentLoaded', () => {
  initRentalSlots();
  const wedCb = document.getElementById('rentalWed');
  if (wedCb) {
    wedCb.addEventListener('change', () => {
      if (!state.chars[state.activeChar]) return;
      const rs = getRentalState();
      rs.wed = wedCb.checked;
      saveRentalState(rs);
      updateRentalTotals();
    });
  }
});

/* ── 보스 초기화 ── */
document.getElementById('btnResetBoss').addEventListener('click', () => {
  const ch = state.chars[state.activeChar];
  if (!ch) return;
  document.getElementById('confirmMsg').textContent = `'${ch.name}'의 보스 체크를 초기화할까요?`;
  document.getElementById('overlayConfirm').classList.add('open');
  document.getElementById('confirmOk').onclick = () => {
    ch.checks = {};
    save(); document.getElementById('overlayConfirm').classList.remove('open');
    renderBossTable(); renderCharList();
  };
});

/* ── 캐릭터 모달 ── */
let editIdx = -1, selectedJob = 0, fetchedInfo = null, selectedCardBg = null;

function openCharModal(idx = -1) {
  editIdx = idx;
  selectedJob = idx >= 0 ? state.chars[idx].jobIdx : 0;
  fetchedInfo = idx >= 0 && state.chars[idx].fetched ? { ...state.chars[idx].fetched } : null;
  selectedCardBg = idx >= 0 ? (state.chars[idx].cardBg || null) : null;
  document.getElementById('modalCharTitle').textContent = idx >= 0 ? '캐릭터 수정' : '캐릭터 추가';
  document.getElementById('inpName').value  = idx >= 0 ? state.chars[idx].name  : '';
  document.getElementById('inpLevel').value = idx >= 0 ? state.chars[idx].level : '';
  document.getElementById('inpJob').value = idx >= 0 ? charJobName(state.chars[idx]) : '';
  document.getElementById('inpWorld').value = idx >= 0 ? (state.chars[idx].fetched?.world || '') : '';
  document.getElementById('inpJobSearch').value = '';
  document.getElementById('lkName').value = idx >= 0 ? state.chars[idx].name : '';
  document.getElementById('lkResult').innerHTML = '';
  renderJobGrid('');   // 직접 입력용 직업 그리드
  renderCardBgGrid();
  document.getElementById('overlayChar').classList.add('open');
}

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

/* ── 카드 배경 선택 그리드 ──
   images/bg/bg{0..CARD_BG_COUNT-1}에 png 또는 webp로 넣어두면 뜨는 방식.
   파일이 아직 없는 번호는 두 확장자 다 실패하니 타일 자체를 숨긴다 —
   그래서 나중에 이미지만 채워 넣으면 코드를 안 건드려도 그 번호가 나타난다. */
function renderCardBgGrid() {
  const grid = document.getElementById('cardBgGrid');
  if (!grid) return;
  const tiles = [`<button type="button" class="cardbg-opt cardbg-opt--none${selectedCardBg ? '' : ' sel'}" data-bg="">없음</button>`];
  for (let i = 0; i < CARD_BG_COUNT; i++) {
    const bgId = 'bg' + i;
    const [primary, fallback] = cardBgCandidates(i);
    tiles.push(`
      <button type="button" class="cardbg-opt${selectedCardBg === bgId ? ' sel' : ''}" data-bg="${bgId}">
        <img src="${primary}" data-fallback="${fallback}"
             onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src=this.dataset.fallback;}else{this.closest('.cardbg-opt').remove();}">
      </button>`);
  }
  grid.innerHTML = tiles.join('');
  grid.querySelectorAll('.cardbg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCardBg = btn.dataset.bg || null;
      grid.querySelectorAll('.cardbg-opt').forEach(b => b.classList.toggle('sel', b === btn));
    });
  });
}

/* ── 캐릭터 카드를 이미지로 저장 ──
   넥슨 아바타는 다른 출처(msavatar1.nexon.net)라 캔버스에 그대로 그리면
   캔버스가 오염(tainted)되어 toDataURL이 막힌다. /api/img 프록시를 거쳐
   같은 출처처럼 받아온다(api/img.js, serve.js 둘 다 구현돼 있음). */
function proxiedImgSrc(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    if (/nexon\.(net|com)$/i.test(u.hostname)) return `/api/img?url=${encodeURIComponent(url)}`;
  } catch { /* 상대경로(내부 images/) 등 — 그대로 사용 */ }
  return url;
}
/* 실제 카드 DOM을 그대로 캡처(html2canvas/html-to-image 둘 다 시도)하면
   카드가 쓰는 컨테이너 쿼리(cqw, 카드 폭 기준 글씨 크기)를 두 라이브러리 다
   제대로 못 살려서 이름/직업 글씨가 통째로 사라지거나 깨졌다(실측 확인).
   그래서 캔버스에 직접 그리는 방식으로 되돌리되, 지난번에 빠졌던 서버 아이콘·
   직업 아이콘을 추가하고 워터마크는 뺐다. */
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function loadFirstAvailable(srcs) {
  for (const s of srcs) {
    try { return await loadImg(s); } catch { /* 다음 후보 시도 */ }
  }
  return null;
}
async function loadOptional(src) {
  if (!src) return null;
  try { return await loadImg(src); } catch { return null; }
}
function cardRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function cardRoundRectLeft(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function drawImgCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw, sh, sx, sy;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function drawImgContain(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function drawImgContainBottom(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  ctx.drawImage(img, x + (w - dw) / 2, y + h - dh, dw, dh);
}

async function exportCharCard(idx) {
  const ch = state.chars[idx];
  if (!ch) return;
  const f = ch.fetched || {};
  const jn = charJobName(ch);
  const region = f.region || (state.region === 'eu' ? 'EU' : 'NA');
  const world = f.world || '';
  const lv = f.level || ch.level;

  // 화면에서 실제로 쓰고 있는 폰트를 그대로 쓴다(고딕/Maple/8bit 중 사용자가 고른 것).
  const fontStack = getComputedStyle(document.body).fontFamily || "'고딕','Segoe UI','Malgun Gothic',sans-serif";
  const primaryFont = (fontStack.split(',')[0] || '고딕').trim().replace(/^['"]|['"]$/g, '');
  try {
    await Promise.all([
      document.fonts.load(`16px "${primaryFont}"`),
      document.fonts.load(`bold 16px "${primaryFont}"`),
    ]);
    await document.fonts.ready;
  } catch { /* 폰트 로드 실패해도 fallback 폰트로 계속 진행 */ }
  const F = (size, bold) => `${bold ? 'bold ' : ''}${size}px "${primaryFont}", "Segoe UI", "Malgun Gothic", sans-serif`;

  const SCALE = 2, W = 460, H = 220, PW = 190, PAD = 12;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  const cs = getComputedStyle(document.documentElement);
  const panelBg   = cs.getPropertyValue('--bg-card').trim() || '#0e0b1e';
  const panelVeil = cs.getPropertyValue('--panel-veil').trim() || 'rgba(15,10,32,.9)';
  const textColor = cs.getPropertyValue('--text').trim() || '#fff';
  const textSub   = cs.getPropertyValue('--text-sub').trim() || '#9a94b0';
  const accent    = cs.getPropertyValue('--accent').trim() || '#f5c842';
  const hue       = cs.getPropertyValue('--hue').trim() || '139,92,246';

  // 카드 배경 — 둥근 사각형 밖은 그대로 투명(캔버스 기본값)으로 둬서 다운로드된
  // png가 카드 모양 그대로 잘려 보이게 한다. panel-veil은 반투명이라 그 아래
  // 불투명 바탕(--bg-card)을 먼저 깔아 어디에 붙여넣어도 카드가 또렷하게 보이게 함.
  cardRoundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.fillStyle = panelBg;
  ctx.fill();
  ctx.fillStyle = panelVeil;
  ctx.fill();

  // 일러스트 박스(왼쪽)
  ctx.save();
  cardRoundRectLeft(ctx, 0, 0, PW, H, 14);
  ctx.clip();
  if (ch.cardBg) {
    const id = ch.cardBg.replace(/^bg/, '');
    const bgImg = await loadFirstAvailable(cardBgCandidates(id));
    if (bgImg) drawImgCover(ctx, bgImg, 0, 0, PW, H);
  }
  const hasReal = !!f.img;
  const charImg = await loadFirstAvailable(hasReal ? [proxiedImgSrc(f.img), 'images/dailytasks/default.png'] : ['images/dailytasks/default.png']);
  if (charImg) {
    const pct = 0.92;
    const boxW = PW * pct, boxH = H * pct;
    drawImgContainBottom(ctx, charImg, (PW - boxW) / 2, H - boxH, boxW, boxH);
  }
  ctx.restore();

  // 텍스트(오른쪽) — 실제 카드(.ci-card__meta, .ci-card__ranks)와 동일하게
  // 이름/직업 블록, Lv/서버 블록, 랭킹 블록 사이에 구분선을 넣는다.
  const tx = PW + PAD * 2;
  const rightEdge = W - PAD;
  const jobHeadSrc = charJobHeadSrc(ch);
  const jobHeadImg = await loadOptional(jobHeadSrc);
  const jobIconSize = 52;

  ctx.fillStyle = textColor;
  ctx.font = F(22, true);
  ctx.fillText(ch.name, tx, 38);

  if (jobHeadImg) drawImgContain(ctx, jobHeadImg, rightEdge - jobIconSize, 10, jobIconSize, jobIconSize);

  ctx.fillStyle = textSub;
  ctx.font = F(13, false);
  ctx.fillText(jn || '', tx, 60);

  const divider = y => {
    ctx.strokeStyle = cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(rightEdge, y);
    ctx.stroke();
  };

  divider(76);

  ctx.fillStyle = accent;
  ctx.font = F(19, true);
  ctx.fillText(`Lv.${lv}`, tx, 102);

  // 서버 아이콘 + "NA Kronos" 형태로 화면과 동일하게
  const sIconSrc = world ? serverIconSrc(world) : '';
  const sIconImg = await loadOptional(sIconSrc);
  let worldTx = tx;
  if (sIconImg) { drawImgContain(ctx, sIconImg, tx, 112, 16, 16); worldTx = tx + 22; }
  ctx.fillStyle = textColor;
  ctx.font = F(14, false);
  ctx.fillText(`${region} ${world}`.trim(), worldTx, 124);

  if (f.rank) {
    divider(140);
    ctx.fillStyle = textSub;
    ctx.font = F(13, false);
    ctx.fillText(`${region} 랭킹 #${f.rank.toLocaleString()}`, tx, 162);
  }

  // 카드 테두리는 맨 마지막에 그린다 — 일러스트/배경 이미지가 먼저 그려지면서
  // 왼쪽 변의 테두리 선을 덮어버려 "테두리가 없다"고 보이던 문제가 있었음.
  cardRoundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.strokeStyle = `rgba(${hue},.6)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let dataUrl;
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch (e) {
    // 다른 출처 이미지가 프록시를 안 거치고 캔버스에 그려지면(예: f.img가
    // 넥슨 도메인이 아닌 경우) 캔버스가 오염돼 여기서 SecurityError가 난다.
    // 그냥 실패해서 아무 반응 없는 것처럼 보이지 않게 알려준다.
    alert('명함 이미지를 만드는 중 오류가 발생했습니다: ' + e.message);
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${(ch.name || 'character').replace(/[\\/:*?"<>|]/g, '_')}_카드.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ── GMS 랭킹 조회 + 히스토리 ──
   랭킹 API는 '현재 상태'만 제공하므로, 조회할 때마다 스냅샷
   (날짜·레벨·경험치·캐릭터이미지)을 로컬에 누적해 히스토리를 만든다. */
const HIST_KEY = STORAGE_KEYS.charHistory;
function loadHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}'); } catch { return {}; } }
function saveHist(h) { localStorage.setItem(HIST_KEY, JSON.stringify(h)); }
function histKeyOf(d) { return `${(d.region||'NA').toLowerCase()}_${d.reboot?'r':'n'}_${(d.name||'').toLowerCase()}`; }

/* nexon 영문 직업명 → JOB_LIST 인덱스 (정규화 매칭) */
function jobIdxFromName(jobName) {
  if (!jobName) return -1;
  const norm = jobName.toLowerCase().replace(/[^a-z]/g, '');
  return JOB_LIST.findIndex(j => j.name.toLowerCase().replace(/[^a-z]/g, '') === norm);
}

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
// (JOB_HEAD_ASSET_NAMES 제거: 헤드 파일명을 전신과 통일해 JOB_ASSET_NAMES 하나로 해석)
// 파일명 대소문자는 images/server/의 실제 파일과 정확히 일치해야 한다.
// 로컬 Windows는 대소문자를 안 가리지만 배포(Vercel/리눅스)는 가려서 404가 난다.
const SERVER_ASSET_EXT = { Bera:'webp', Scania:'webp', Kronos:'webp', Hyperion:'webp', Luna:'webp', Solis:'webp', Challengers:'webp' };

/* 캐릭터 직업명/아이콘 — 전부 영문명 기준 (name 이 곧 아이콘 파일명) */
function charJobName(ch) {
  return ch.fetched?.job || JOB_LIST[ch.jobIdx]?.name || '';
}
function _resolveAsset(en, ...maps) {
  if (!en) return null;
  for (const map of maps) {
    if (map[en]) return map[en];
  }
  // 정규화 매칭 (대소문자·공백·특수문자 무시)
  const norm = en.toLowerCase().replace(/[^a-z]/g, '');
  for (const map of maps) {
    const key = Object.keys(map).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === norm);
    if (key) return map[key];
  }
  return en.replace(/\s+/g, '');
}
function charJobIconSrc(ch) {
  const en = ch.fetched?.job || JOB_LIST[ch.jobIdx]?.name;
  const asset = _resolveAsset(en, JOB_ASSET_NAMES);
  return asset ? `images/jobs/${asset}.webp` : '';
}
function charJobHeadSrc(ch) {
  const en = ch.fetched?.job || JOB_LIST[ch.jobIdx]?.name;
  // 헤드 파일명은 전신과 동일하게 통일됨 → 전신과 같은 매핑 사용
  const asset = _resolveAsset(en, JOB_ASSET_NAMES);
  return asset ? `images/jobs/Head/${asset}.webp` : '';
}
function serverIconSrc(world) {
  const ext = SERVER_ASSET_EXT[world];
  return ext ? `images/server/${encodeURIComponent(world)}.${ext}` : '';
}
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* 조회 결과를 히스토리에 기록. 같은 날 중복은 최신값으로 갱신. */
function recordSnapshot(d) {
  const h = loadHist();
  const key = histKeyOf(d);
  const arr = h[key] || [];
  const snap = { date: todayStr(), ts: Date.now(), level: d.level, exp: Number(d.exp)||0, img: d.img || '', job: d.job || '' };
  const last = arr[arr.length - 1];
  if (last && last.date === snap.date) arr[arr.length - 1] = snap;   // 같은 날 → 갱신
  else if (!last || last.exp !== snap.exp || last.img !== snap.img || last.level !== snap.level) arr.push(snap);
  h[key] = arr.slice(-60);   // 최근 60개만 보관
  saveHist(h);
  return h[key];
}

/* 히스토리 HTML (경험치 변화 + 코디 썸네일) */
function renderHistHtml(d) {
  const arr = (loadHist()[histKeyOf(d)] || []).slice().reverse();   // 최신순
  if (arr.length <= 1) return '';
  const expRows = arr.map((s, i) => {
    const prev = arr[i + 1];
    let delta = '';
    if (prev) {
      const diffLv = s.level - prev.level;
      const diffExp = s.exp - prev.exp;
      const parts = [];
      if (diffLv) parts.push(`<span class="hist-up">▲${diffLv}레벨</span>`);
      if (diffExp) parts.push(`<span class="${diffExp>0?'hist-up':'hist-dn'}">${diffExp>0?'+':''}${Number(diffExp).toLocaleString()} EXP</span>`);
      delta = parts.join(' ');
    }
    return `<div class="hist-row">
      <span class="hist-date">${s.date}</span>
      <span class="hist-lv">Lv.${s.level}</span>
      <span class="hist-delta">${delta || '<span class="hp-dim">기준</span>'}</span>
    </div>`;
  }).join('');
  const codies = arr.filter(s => s.img).map(s =>
    `<div class="hist-cody"><img src="${s.img}" onerror="this.style.display='none'" /><span>${s.date.slice(5)}</span></div>`).join('');
  return `
    <div class="hist-sec"><div class="hist-title">경험치 / 레벨 히스토리</div>${expRows}</div>
    `;
}
document.getElementById('lkBtn').addEventListener('click', async () => {
  const name   = document.getElementById('lkName').value.trim();
  const reboot = false;   // Heroic/일반 구분 없이 이름으로 검색됨
  const box    = document.getElementById('lkResult');
  if (!name) { box.innerHTML = '<span class="lk-err">캐릭터명을 입력하세요.</span>'; return; }
  box.innerHTML = '<span class="lk-load">조회 중...</span>';
  try {
    const r = await fetch(`/api/lookup?name=${encodeURIComponent(name)}&reboot=${reboot?1:0}&region=${state.region}`);
    const j = await r.json();
    if (!j.ok) { box.innerHTML = `<span class="lk-err">${j.error}</span>`; return; }
    j.data.job = canonJobName(j.data.job);  // 약칭 → 정식 이름
    fetchedInfo = j.data;
    recordSnapshot(j.data);                 // 조회 시점 스냅샷 누적
    // 입력란 자동 채우기
    document.getElementById('inpName').value  = j.data.name;
    document.getElementById('inpLevel').value = j.data.level;
    document.getElementById('inpJob').value = j.data.job || '';
    // 직업 자동 선택
    const ji = jobIdxFromName(j.data.job);
    if (ji >= 0) selectedJob = ji;
    box.innerHTML = `
      <div class="lk-card">
        ${j.data.img ? `<img class="lk-card__av" src="${j.data.img}" onerror="this.style.display='none'" />` : ''}
        <div class="lk-card__info">
          <div class="lk-card__name">${j.data.name} <span class="lk-card__job">${j.data.job}</span></div>
          <div class="lk-card__meta">Lv.${j.data.level} · ${j.data.region} ${j.data.world} · 전체 ${j.data.rank.toLocaleString()}위</div>
          <div class="lk-card__exp">누적 EXP ${Number(j.data.exp).toLocaleString()}</div>
        </div>
      </div>
      <div class="lk-hist">${renderHistHtml(j.data)}</div>`;
  } catch (e) {
    box.innerHTML = '<span class="lk-err">조회 실패 — serve.js 서버가 실행 중인지 확인하세요.</span>';
  }
});

function renderJobGrid(filter) {
  const grid = document.getElementById('jobGrid');
  grid.innerHTML = '';
  const q = filter.toLowerCase();
  JOB_LIST.forEach((job, i) => {
    if (q && !job.name.toLowerCase().includes(q)) return;
    const div = document.createElement('div');
    div.className = 'job-item' + (i === selectedJob ? ' sel' : '');
    const iconSrc = charJobHeadSrc({ jobIdx:i, fetched:null }) || charJobIconSrc({ jobIdx:i, fetched:null });
    div.innerHTML = `<img src="${iconSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="job-noimg" style="display:none">JOB</span><span>${job.name}</span>`;
    div.addEventListener('click', () => { selectedJob = i; renderJobGrid(filter); });
    grid.appendChild(div);
  });
}

document.getElementById('inpLevel').addEventListener('change', e => {
  const v = parseInt(e.target.value);
  if (!isNaN(v)) e.target.value = Math.max(1, Math.min(300, v));
});
document.getElementById('inpJobSearch').addEventListener('input', e => renderJobGrid(e.target.value));
document.getElementById('btnAddChar').addEventListener('click', () => {
  if (state.chars.length >= MAX_CHARS) return alert('최대 20개까지 추가 가능합니다.');
  openCharModal();
});
['modalCharClose','modalCharCancel'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => document.getElementById('overlayChar').classList.remove('open'));
});
document.getElementById('modalCharSave').addEventListener('click', () => {
  const inputName = document.getElementById('inpName').value.trim();
  // 조회 결과가 있고 이름이 일치하면 랭킹 데이터 사용, 아니면 직접 입력
  // 직접 입력 캐릭터도 서버를 고르면 fetched={world}가 생기는데 여기엔 name이 없다.
  // 그 캐릭터를 수정하려고 열면 fetchedInfo.name이 undefined라 아래 비교에서 터졌었음
  const useFetched = !!fetchedInfo?.name && inputName && fetchedInfo.name.toLowerCase() === inputName.toLowerCase();

  let name, level, fetched;
  if (useFetched) {
    name  = fetchedInfo.name;
    level = Math.max(200, Math.min(300, parseInt(fetchedInfo.level) || 200));
    fetched = { ...fetchedInfo, syncedAt: Date.now() };   // 방금 조회 → 자동 최신화 대상에서 제외
    const ji = jobIdxFromName(fetchedInfo.job);
    selectedJob = ji >= 0 ? ji : selectedJob;
  } else {
    if (!inputName) return alert('캐릭터명을 입력하거나 랭킹 조회를 하세요.');
    name  = inputName;
    level = Math.max(1, Math.min(300, parseInt(document.getElementById('inpLevel').value) || 260));
    const manualWorld = document.getElementById('inpWorld').value;
    fetched = manualWorld ? { world: manualWorld } : null;   // 직접 입력 → 이미지 없음(서버만 선택 가능)
  }

  // 같은 캐릭터(이름) 중복 추가 방지 (대소문자 무시, 편집 중인 본인은 제외)
  const dup = state.chars.findIndex((c, idx) =>
    idx !== editIdx && c.name?.toLowerCase() === name.toLowerCase());
  if (dup >= 0) return alert('이미 추가된 캐릭터입니다.');

  if (editIdx >= 0) {
    state.chars[editIdx] = { ...state.chars[editIdx], name, level, jobIdx: selectedJob, fetched, cardBg: selectedCardBg };
  } else {
    state.chars.push({ id: Date.now(), name, level, jobIdx: selectedJob, checks: {}, fetched, cardBg: selectedCardBg });
    state.activeChar = state.chars.length - 1;
  }
  save();
  document.getElementById('overlayChar').classList.remove('open');
  renderCharList(); renderBossTable(); renderCharInfo();
  // 캘린더의 캐릭터 선택 목록에도 새 캐릭터가 바로 보이게 한다
  if (typeof renderMapleCalendar === 'function') renderMapleCalendar();
  if (useFetched) syncServerHistThenRender(state.chars[state.activeChar]);
});

// 수정/삭제 버튼 (위임)
document.getElementById('charList').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  if (btn.dataset.action === 'edit') return openCharModal(i);
  document.getElementById('confirmMsg').textContent = `'${state.chars[i].name}' 캐릭터를 삭제하시겠습니까?`;
  document.getElementById('overlayConfirm').classList.add('open');
  document.getElementById('confirmOk').onclick = () => {
    state.chars.splice(i, 1);
    if (state.activeChar >= state.chars.length) state.activeChar = state.chars.length - 1;
    save(); document.getElementById('overlayConfirm').classList.remove('open');
    renderCharList(); renderBossTable();
    // 지운 캐릭터가 캘린더에 그대로 남지 않게 같이 다시 그린다
    if (typeof renderMapleCalendar === 'function') renderMapleCalendar();
  };
});
['confirmClose','confirmCancel'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => document.getElementById('overlayConfirm').classList.remove('open'));
});
// 로그인/닉네임/비밀번호 입력 중에 바깥을 잘못 눌러 폼이 통째로 날아가는 게 짜증난다는
// 피드백으로 overlayAuth는 제외했다 — ×나 로그인 버튼을 다시 눌러야 닫힌다.
document.querySelectorAll('.overlay:not(#overlayAuth)').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});


/* ── 내보내기 / 불러오기 ──
   보스/캐릭(state)뿐 아니라 해방·헥사·폰트 등 모든 localStorage 키를 함께 백업 */
document.getElementById('btnExport').addEventListener('click', () => {
  const extra = {};
  // 모든 localStorage 키 백업 (캐릭터별 헥사 hx_*_<id> 등 포함)
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k === STORAGE_KEYS.boss) continue; // state로 따로 저장
    extra[k] = localStorage.getItem(k);
  }
  const bundle = { _mapbbu: 1, state, extra };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));
  a.download = `mapbbu_data_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
});
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('fileImport').click());
document.getElementById('fileImport').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data && (data._mapbbu || data._mappu)) {
        // 신규 통합 포맷: state + 전 모듈 localStorage 복원
        if (data.state) { state = data.state; save(); }
        Object.entries(data.extra || {}).forEach(([k, v]) => {
          if (typeof v === 'string') localStorage.setItem(k, v);
        });
        showToast('불러오기 완료! 새로고침합니다…');
        setTimeout(() => location.reload(), 600);
      } else {
        // 구버전 포맷: state 자체
        state = data; save();
        renderCharList(); renderBossTable(); showToast('불러오기 완료!');
      }
    } catch { showToast('파일 형식이 올바르지 않습니다.'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ═══════════════════════════════════════════════
   캐릭터 정보 패널 (maplehub 스타일)
   - 좌측: 큰 캐릭터 카드 (이미지 80% + 정보)
   - 우측: 경험치 평균(7/14/30/90일), 일별 EXP 차트, 랭킹
═══════════════════════════════════════════════ */
/* 서버(Vercel Cron 수집) 히스토리를 가져와 로컬에 병합.
   배포 환경에서만 동작하며, 로컬/미설정 시 조용히 무시되고 로컬 스냅샷이 쓰인다. */
async function fetchServerHist(f) {
  if (!f || !f.name) return null;
  try {
    const r = await fetch(`/api/history?name=${encodeURIComponent(f.name)}&region=${(f.region||'na').toLowerCase()}&reboot=${f.reboot?1:0}`);
    const j = await r.json();
    if (j.ok && Array.isArray(j.data) && j.data.length) {
      const h = loadHist(); h[histKeyOf(f)] = j.data; saveHist(h);
      return j.data;
    }
  } catch (e) { /* 미배포/미설정 → 폴백 */ }
  return null;
}
function syncServerHistThenRender(ch) {
  if (ch?.fetched) fetchServerHist(ch.fetched).then(d => { if (d) renderCharInfo(); });
}

/* ── 랭킹 정보 자동 최신화 ──
   조회로 등록한 캐릭터는 fetched가 등록 시점에 고정되어 레벨/코디가 갱신되지 않는다.
   앱 진입 시 마지막 갱신이 REFRESH_INTERVAL 이상 지난 캐릭터만 조용히 재조회한다.
   실패해도 기존 값을 유지하며 사용자에게 알리지 않는다. */
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;   // 6시간

async function refreshStaleChars() {
  const now = Date.now();
  const stale = state.chars.filter(ch =>
    ch.fetched && ch.fetched.name && now - (ch.fetched.syncedAt || 0) > REFRESH_INTERVAL);
  if (!stale.length) return;

  let changed = false;
  for (const ch of stale) {
    const f = ch.fetched;
    try {
      const r = await fetch(`/api/lookup?name=${encodeURIComponent(f.name)}&reboot=${f.reboot?1:0}&region=${(f.region||'na').toLowerCase()}`);
      const j = await r.json();
      if (!j.ok || !j.data) continue;
      // reboot/region은 히스토리 키의 일부이므로 덮어쓰지 않는다
      const d = j.data;
      Object.assign(f, {
        level: d.level, exp: d.exp, rank: d.rank,
        job: canonJobName(d.job), world: d.world, worldID: d.worldID,
        img: d.img || f.img, syncedAt: now,
      });
      if (d.level) ch.level = d.level;
      changed = true;
    } catch { /* 네트워크 실패 → 다음 진입 때 재시도 */ }
  }
  // 캘린더도 캐릭터 이름·얼굴을 쓰므로 같이 다시 그린다.
  // 빠뜨리면 사이드바만 새 값이고 캘린더는 옛 이름이 남는다(실제로 그랬다).
  if (changed) {
    save(); renderCharList(); renderCharInfo();
    if (typeof renderMapleCalendar === 'function') renderMapleCalendar();
  }
}

const CHARINFO_HEAD = `
  <div class="sec-head"><h2 class="sec-title">캐릭터 목록</h2></div>
  <p class="dt-help">추가한 캐릭터들을 카드로 모아 보여줍니다. 카드를 눌러 캐릭터를 선택하고, 드래그로 순서를 바꿀 수 있습니다.</p>`;

function renderCharInfo() {
  const box = document.getElementById('charInfoBody');
  if (!box) return;

  if (!state.chars.length) {
    box.innerHTML = `${CHARINFO_HEAD}<div class="ci-empty">캐릭터를 추가하세요.</div>`;
    return;
  }

  const cards = state.chars.map((ch, i) => {
    const f = ch.fetched;
    const jn = charJobName(ch);
    const world = f?.world || '';
    const region = f?.region || (state.region === 'eu' ? 'EU' : 'NA');
    const sIcon = world ? serverIconSrc(world) : '';
    const sIconHtml = sIcon ? `<img class="ci-servericon" src="${sIcon}" onerror="this.style.display='none'" />` : '';
    // 넥슨 원본 URL 대신 /api/img 프록시를 거친다 — 카드 이미지 저장(html2canvas)이
    // 캔버스에 그릴 때 다른 출처 이미지면 캔버스가 오염돼 막히기 때문. 화면에 보이는
    // 모습은 완전히 동일(프록시가 원본 그대로 스트리밍).
    const portrait = f?.img
      ? `<img src="${proxiedImgSrc(f.img)}" crossorigin="anonymous" onerror="this.src='images/dailytasks/default.png';this.parentElement.classList.add('cg-portrait--no')" />`
      : `<img src="images/dailytasks/default.png" alt="" />`;
    const lv = f?.level || ch.level;
    const headSrc = charJobHeadSrc(ch);
    const headHtml = headSrc ? `<img class="ci-jobicon" src="${headSrc}" onerror="this.style.display='none'" />` : '';
    const rankRow = f?.rank ? `
      <div class="ci-card__ranks">
        <div class="ci-rank-row"><span>${region} 랭킹</span><b>#${f.rank.toLocaleString()}</b></div>
      </div>` : '';
    const isActive = i === state.activeChar;
    return `
      <div class="cg-card${isActive ? ' cg-card--active' : ''}" data-ci="${i}">
        <button type="button" class="cg-card__save" data-ci="${i}">메애기 저장하기</button>
        <div class="cg-portrait${f?.img ? '' : ' cg-portrait--no'}">${portraitBgHtml(ch.cardBg)}${portrait}</div>
        <div class="ci-card__body">
          <div class="ci-card__nameline">
            <div>
              <div class="ci-card__name">${ch.name}</div>
              <div class="ci-card__job">${jn || ''}</div>
            </div>
            ${headHtml}
          </div>
          <div class="ci-card__meta">
            <span class="ci-lv">Lv.${lv}</span>
            <span class="ci-server">${sIconHtml}<span class="icon-lbl">${region} ${world}</span></span>
          </div>
          <div class="cg-weekrow" title="끄면 이 캐릭터의 주간 수익이 전체 주간 획득 메소에서 빠집니다. 이미 돈 캐릭터를 잠깐 빼고 남은 캐릭터로 얼마가 더 들어오는지 볼 때 씁니다.">
            <span class="cg-weekrow__lbl">주간 합산</span>
            <button type="button" class="cg-weektoggle ${ch.weekDone ? 'off' : 'on'}" data-i="${i}"
                    aria-label="주간 합산 포함 여부">
              <span class="cg-weektoggle__knob"></span>
              <span class="cg-weektoggle__txt cg-weektoggle__txt--on">포함</span>
              <span class="cg-weektoggle__txt cg-weektoggle__txt--off">제외</span>
            </button>
          </div>
        </div>
        ${rankRow}
      </div>`;
  }).join('');

  box.innerHTML = `${CHARINFO_HEAD}<div class="cg-grid">${cards}</div>`;
  // 주간 합산 토글 — 카드 클릭(캐릭터 선택)으로 번지지 않게 막는다
  box.querySelectorAll('.cg-weektoggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = Number(btn.dataset.i);
      state.chars[i].weekDone = !state.chars[i].weekDone;
      save();
      btn.classList.toggle('off', !!state.chars[i].weekDone);
      btn.classList.toggle('on', !state.chars[i].weekDone);
      updateCrystalBar();
    });
  });
  box.querySelectorAll('.cg-card__save').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = Number(btn.dataset.ci);
      btn.disabled = true; btn.textContent = '저장 중...';
      exportCharCard(i).finally(() => { btn.disabled = false; btn.textContent = '메애기 저장하기'; });
    });
  });

  let dragSrc = null;
  box.querySelectorAll('.cg-card').forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      selectChar(parseInt(card.dataset.ci));
    });
    card.addEventListener('dragstart', e => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
    });

    // 터치 드래그 — 롱프레스(400ms) 후 드래그 시작, 그 전엔 스크롤 허용
    let longPressTimer = null, touchDragging = false;
    card.addEventListener('touchstart', e => {
      touchDragging = false;
      longPressTimer = setTimeout(() => {
        touchDragging = true;
        dragSrc = card;
        card.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(40);
      }, 400);
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      if (!touchDragging) { clearTimeout(longPressTimer); return; }
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('.cg-card');
      box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
      if (target && target !== dragSrc) target.classList.add('drag-over');
    }, { passive: false });
    card.addEventListener('touchend', e => {
      clearTimeout(longPressTimer);
      card.classList.remove('dragging');
      box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
      if (!touchDragging) { dragSrc = null; return; }
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('.cg-card');
      if (!target || target === dragSrc) { dragSrc = null; return; }
      const from = parseInt(dragSrc.dataset.ci);
      const to   = parseInt(target.dataset.ci);
      const arr  = state.chars;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      if (state.activeChar === from) state.activeChar = to;
      else if (from < to && state.activeChar > from && state.activeChar <= to) state.activeChar--;
      else if (from > to && state.activeChar >= to && state.activeChar < from) state.activeChar++;
      dragSrc = null;
      save(); renderCharList(); renderBossTable(); renderCharInfo();
    });
    card.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      card.classList.remove('dragging');
      box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
      dragSrc = null; touchDragging = false;
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (card !== dragSrc) {
        box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === card) return;
      const from = parseInt(dragSrc.dataset.ci);
      const to   = parseInt(card.dataset.ci);
      const arr  = state.chars;
      arr.splice(to, 0, arr.splice(from, 1)[0]);
      if (state.activeChar === from) state.activeChar = to;
      else if (from < to && state.activeChar > from && state.activeChar <= to) state.activeChar--;
      else if (from > to && state.activeChar >= to && state.activeChar < from) state.activeChar++;
      save(); renderCharList(); renderBossTable(); renderCharInfo();
    });
  });
}

/* ── 설정 모달 ── */
const FONT_KEY = STORAGE_KEYS.font;
const overlaySettings = document.getElementById('overlaySettings');
document.getElementById('sbBtnSettings').addEventListener('click', () => overlaySettings.classList.add('open'));
document.getElementById('headerBtnSettings').addEventListener('click', () => overlaySettings.classList.add('open'));
document.getElementById('settingsClose').addEventListener('click', () => overlaySettings.classList.remove('open'));
overlaySettings.addEventListener('click', e => { if (e.target === overlaySettings) overlaySettings.classList.remove('open'); });

/* ── 관리자 — 전체 알림 발송 ──
   비밀번호를 앱 안에서 대조하지 않는다. 클라이언트 코드는 누구나 열어볼 수 있어
   거기 적힌 비밀번호는 이미 비밀이 아니고, 검사 자체도 우회할 수 있기 때문.
   대신 입력한 값을 그대로 서버로 보내 서버가 판단한다(api/push-broadcast).
   비밀번호가 틀리면 서버가 거부하므로 관리자탭이 열려 있어도 발송되지 않는다. */
/* 예전엔 ?admin=1 로만 항목을 드러냈는데, 한 번 들어오면 기기에 기억돼서 그냥
   주소로 들어와도 계속 보였다(= 숨기는 의미가 없었다). 지금은 비밀번호로 로그인해야
   실제 기능이 드러나므로, 항목 자체는 그냥 두고 로그인으로 막는다. */
const overlayAdmin = document.getElementById('overlayAdmin');

/* 로그인에 성공한 비밀번호를 이 모달이 열려 있는 동안만 들고 있는다.
   저장하지 않으므로 닫으면 다시 로그인해야 한다. */
let _admSecret = null;

function admSetLoggedIn(on) {
  _admSecret = on ? _admSecret : null;
  document.getElementById('admLoginStep').style.display  = on ? 'none' : '';
  document.getElementById('admWorkStep').style.display   = on ? '' : 'none';
  document.getElementById('admBtnLogin').style.display   = on ? 'none' : '';
  document.getElementById('admBtnCheck').style.display   = on ? '' : 'none';
  document.getElementById('admBtnSend').style.display    = on ? '' : 'none';
}

document.getElementById('btnAdmin')?.addEventListener('click', () => {
  overlaySettings.classList.remove('open');
  // 열 때마다 로그아웃 상태에서 시작한다
  document.getElementById('admSecret').value = '';
  document.getElementById('admResult').textContent = '';
  admSetLoggedIn(false);
  overlayAdmin.classList.add('open');
});

/* 로그인 — 비밀번호가 맞는지는 서버만 알 수 있으므로, 아무것도 보내지 않는
   dryRun 요청으로 확인한다(대상 수만 세고 발송은 안 한다). 401이면 거부. */
document.getElementById('admBtnLogin')?.addEventListener('click', async () => {
  const resEl = document.getElementById('admResult');
  const secret = document.getElementById('admSecret').value.trim();
  if (!secret) { resEl.className = 'adm-result is-err'; resEl.textContent = '비밀번호를 입력하세요.'; return; }

  const btn = document.getElementById('admBtnLogin');
  btn.disabled = true;
  resEl.className = 'adm-result'; resEl.textContent = '확인 중…';
  try {
    const r = await fetch('/api/push-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
      body: JSON.stringify({ title: '로그인 확인', dryRun: true }),
    });
    const j = await r.json().catch(() => null);
    if (r.status === 401) { resEl.className = 'adm-result is-err'; resEl.textContent = '비밀번호가 맞지 않습니다.'; return; }
    if (!r.ok || !j || !j.ok) {
      resEl.className = 'adm-result is-err';
      resEl.textContent = (j && j.error) || `요청 실패 (${r.status})`;
      return;
    }
    _admSecret = secret;
    admSetLoggedIn(true);
    resEl.className = 'adm-result is-ok';
    resEl.textContent = `로그인됨 · 받을 사람 ${j.targets}명` + (j.skipped ? ` (제외 ${j.skipped})` : '');
  } catch (e) {
    resEl.className = 'adm-result is-err';
    resEl.textContent = '요청 실패: ' + (e && e.message || e);
  } finally {
    btn.disabled = false;
  }
});
document.getElementById('adminClose')?.addEventListener('click', () => overlayAdmin.classList.remove('open'));
/* 바깥을 클릭해도 닫지 않는다 — 알림 문구를 길게 쓰다가 실수로 바깥을 누르면
   작성하던 내용이 통째로 날아간다. 닫기(×)로만 닫게 한다. */

async function admSend(dryRun) {
  const resEl  = document.getElementById('admResult');
  const secret = _admSecret;   // 로그인할 때 확인된 비밀번호만 쓴다
  const title  = document.getElementById('admTitle').value.trim();
  const body   = document.getElementById('admBody').value.trim();

  const say = (msg, ok) => {
    resEl.textContent = msg;
    resEl.className = 'adm-result' + (ok === true ? ' is-ok' : ok === false ? ' is-err' : '');
  };

  if (!secret) { say('비밀번호를 입력하세요.', false); return; }
  if (!title)  { say('제목을 입력하세요.', false); return; }
  // 전체 발송은 되돌릴 수 없으므로 한 번 더 묻는다
  if (!dryRun && !confirm(`"${title}"\n\n알림을 켠 전원에게 지금 보냅니다. 취소할 수 없습니다.`)) return;

  const btnC = document.getElementById('admBtnCheck');
  const btnS = document.getElementById('admBtnSend');
  btnC.disabled = btnS.disabled = true;
  say(dryRun ? '확인 중…' : '발송 중…');

  try {
    const r = await fetch('/api/push-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
      body: JSON.stringify({ title, body, url: '/', dryRun }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) {
      const msg = r.status === 401 ? '비밀번호가 맞지 않습니다.' : ((j && j.error) || `요청 실패 (${r.status})`);
      say(msg, false);
    } else if (dryRun) {
      say(`받을 사람 ${j.targets}명` + (j.skipped ? ` (제외 ${j.skipped})` : ''), true);
    } else {
      say(`발송 완료 · 성공 ${j.sent} / 실패 ${j.failed}`
          + (j.pruned ? ` / 만료 정리 ${j.pruned}` : '')
          + (j.skipped ? ` / 제외 ${j.skipped}` : ''), true);
    }
  } catch (e) {
    say('요청 실패: ' + (e && e.message || e), false);
  } finally {
    btnC.disabled = btnS.disabled = false;
  }
}
document.getElementById('admBtnCheck')?.addEventListener('click', () => admSend(true));
document.getElementById('admBtnSend')?.addEventListener('click', () => admSend(false));

/* 구독 목록 비우기 — 예전 주소로 설치한 기기까지 확실히 끊어내는 유일한 방법이다.
   저장된 구독에는 출처가 없어 골라낼 수 없기 때문(이제부터 구독하는 것만 기록된다). */
document.getElementById('admBtnPurge')?.addEventListener('click', async () => {
  const resEl  = document.getElementById('admResult');
  const secret = _admSecret;   // 로그인할 때 확인된 비밀번호만 쓴다
  const say = (msg, ok) => {
    resEl.textContent = msg;
    resEl.className = 'adm-result' + (ok === true ? ' is-ok' : ok === false ? ' is-err' : '');
  };
  if (!secret) { say('비밀번호를 입력하세요.', false); return; }
  if (!confirm('저장된 구독을 모두 지웁니다.\n\n지운 뒤에는 모두가 알림을 다시 켜야 합니다. 되돌릴 수 없습니다.')) return;

  const btn = document.getElementById('admBtnPurge');
  btn.disabled = true;
  say('삭제 중…');
  try {
    const r = await fetch('/api/push-purge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
      body: JSON.stringify({ confirm: true }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) {
      say(r.status === 401 ? '비밀번호가 맞지 않습니다.' : ((j && j.error) || `요청 실패 (${r.status})`), false);
    } else {
      say(`구독 ${j.removed}개를 지웠습니다. 모두 알림을 다시 켜야 합니다.`, true);
    }
  } catch (e) {
    say('요청 실패: ' + (e && e.message || e), false);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('btnResetAll').addEventListener('click', () => {
  document.getElementById('confirmMsg').textContent = '모든 데이터를 초기화하시겠습니까? 되돌릴 수 없습니다.';
  document.getElementById('overlayConfirm').classList.add('open');
  document.getElementById('confirmOk').onclick = () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    location.reload();
  };
});

/* 글자 크기 기준값(rem의 기준). 거의 모든 크기가 rem이라 여기만 올리면 전체가 같이 커진다.
   PC에서 글씨가 작다는 피드백에 데스크톱만 +3px까지 올렸다가, 이번엔 너무 커졌다는
   지적을 받아 +1px로 낮춘다(사이드바 메뉴 글씨가 특히 커 보였다).
   '고딕'(ONE_Mobile_Title)은 원래 폭이 넓게 렌더링돼 15px로 낮춰뒀던 값이라 그 차이는 유지. */
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');
function rootFontPx() {
  const base = document.body.dataset.font === '고딕' ? 15 : 16;
  return MOBILE_MQ.matches ? base : base + 1;
}
function applyRootFontSize() {
  document.documentElement.style.fontSize = rootFontPx() + 'px';
}
// resize 이벤트만 보면 창 크기 변경을 놓치는 경우가 있어 미디어쿼리 변화도 같이 구독
MOBILE_MQ.addEventListener('change', applyRootFontSize);
window.addEventListener('resize', applyRootFontSize);

/* ── 첫 방문 공지 카드 ──
   ※ 배포(커밋/푸시)할 때마다 여기에 이번에 바뀐 내용을 정리해 넣는다.
      id를 새 값으로 바꿔야 예전에 "확인"을 누른 사람에게도 새 공지가 다시 뜬다. */
// 하루 단위로 쌓는다. 맨 위가 최신. 같은 날 또 배포하면 그 날 items에 줄만 추가하면 된다.
const NOTICE_LOG = [
  {
    date: '2026. 08. 24.',
    items: [
      {
        head: '로그인 창이 바깥을 눌러도 안 닫히게 했습니다',
        desc: '아이디·비밀번호·닉네임을 입력하다가 실수로 바깥을 눌러 폼이 날아가는 걸 막았습니다. ×나 로그인 버튼을 다시 눌러야 닫힙니다.',
      },
    ],
  },
  {
    date: '2026. 08. 23.',
    items: [
      {
        head: '로그인 버튼이 헤더로 이동했습니다',
        desc: '헤더 우측의 로그인 버튼을 누르면 아이디를 만들고 로그인해, 데이터를 서버에 저장해두고 다른 기기에서 그대로 불러올 수 있습니다. 불러오기는 그 기기의 데이터를 덮어쓰니 주의해주세요.',
      },
      {
        head: '헤더의 초기화 카운트다운을 없앴습니다',
        desc: '초기화 시간은 보스 수익 계산기 등 필요한 곳에서 이미 안내되고 있어 헤더에서는 뺐습니다.',
      },
      {
        head: '패밀리어 옵션 목록의 등급 이름이 안 보이던 문제를 고쳤습니다',
        desc: '다크 모드에서 옵션을 고를 때 유니크·에픽 같은 등급 이름 줄이 흰 막대로만 보였습니다.',
      },
      {
        head: '회원가입에 비밀번호 확인란을 추가했습니다',
        desc: '비밀번호를 잘못 눌러 적었다가 나중에 로그인이 안 되는 일을 막기 위해, 가입할 때 비밀번호를 한 번 더 입력해 확인합니다.',
      },
      {
        head: '비밀번호 변경 기능이 생겼습니다',
        desc: '로그인 후 클라우드 저장 화면에서 비밀번호 변경을 누르면, 현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿀 수 있습니다.',
      },
      {
        head: '닉네임을 정할 수 있습니다',
        desc: '로그인 후 클라우드 저장 화면에서 한글·영문·숫자·기호로 1~12자까지 닉네임을 정하면, 우측 위 버튼에 그 이름으로 표시됩니다. 따로 정하지 않으면 아이디가 그대로 보입니다.',
      },
      {
        head: '화이트 모드 상단 버튼을 다듬었습니다',
        desc: '로그인·설정 버튼의 안쪽 색을 없애고 테두리만 남겨 더 깔끔하게 바꿨습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 21.',
    items: [
      {
        head: '큐브와 추옵에 목표를 정해두고 자동으로 돌릴 수 있습니다',
        desc: '원하는 옵션을 적어두고 목표까지 자동을 누르면 그 조건이 나올 때까지 알아서 돌아갑니다. 큐브는 한 항목만 적으면 세 줄 합산으로, 같은 항목을 여러 줄에 적으면 그 줄 수만큼 떠야 멈춥니다. 추옵은 적어둔 옵션이 전부 그 등급 이상으로 떴을 때 멈춥니다. 공격력 3줄이나 재사용 4초처럼 자주 쓰는 조합은 버튼으로 바로 넣을 수 있습니다.',
      },
      {
        head: '큐브 확률에 있던 오류를 바로잡았습니다',
        desc: '크리티컬 데미지와 공격력·마력의 고정 수치에 160제 보정이 잘못 붙어 실제보다 1 높게 계산되고 있었습니다. 또 쓸만한 스킬 같은 옵션이 한 번에 두 줄 뜨던 문제도 고쳤습니다.',
      },
      {
        head: '큐브 탭을 열 때만 데이터를 받도록 바꿔 첫 로딩이 빨라졌습니다',
        desc: '큐브 옵션표가 커서 접속할 때마다 받고 있었는데, 이제 큐브를 실제로 열 때만 받습니다.',
      },
      {
        head: '추옵에서 무기 종류를 고를 수 있습니다',
        desc: 'STR·DEX·INT·LUK 같은 순수 스탯 추가옵션은 레벨이 아니라 무기 자체의 기본 공격력에 따라 값이 달라집니다. 무기 종류를 고르면 그 무기 기준의 정확한 값으로 계산합니다(제네시스 무기 기준). 고르지 않으면 기존처럼 레벨만 보고 계산합니다.',
      },
      {
        head: '스타포스 기댓값 탭이 추옵 탭에 끌려다니던 문제를 고쳤습니다',
        desc: '추옵 탭에서 하위 탭을 바꾸면 스타포스 기댓값 계산이 같이 꼬여 그래프가 안 그려지는 경우가 있었습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 20.',
    items: [
      {
        head: '스타포스와 큐브, 추옵에 직접 해보는 탭이 생겼습니다',
        desc: '직접 하나씩 눌러보는 탭입니다. 스타포스는 성수가 오를 때마다 별이 채워지고 23성부터는 테두리가 빛나며 성공할 때 반짝입니다. 큐브는 등급과 옵션 세 줄이 등급 색으로 표시되어 이탈 여부를 바로 볼 수 있습니다. 추옵은 네 줄의 등급을 1추 7점부터 매겨 한 번에 몇 점인지 보여주고, 1추가 뜬 줄은 따로 빛납니다. 세 곳 모두 S 키로 누를 수 있습니다.',
      },
      {
        head: '스타포스 26성 확률이 잘못되어 있어 바로잡았습니다',
        desc: '실패 확률이 잘못 적혀 있어 확률의 합이 100%를 넘었고, 이 때문에 높은 성수의 기댓값이 실제보다 부풀려지거나 30성은 계산 자체가 되지 않았습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 19.',
    items: [
      {
        head: '아스트라 보조무기 계산기가 추가되었습니다',
        desc: '해방 계산기에 아스트라 탭이 생겼습니다. 현재 보조무기 단계와 일일 퀘스트 지역을 고르면 에리온의 조각과 격전의 흔적을 함께 계산해 1차부터 3차까지 예상 완료 날짜를 알려드립니다.',
      },
      {
        head: '데스티니 해방 계산기가 업데이트되었습니다',
        desc: '진행 중인 결전 퀘스트를 고를 수 있게 되어 남은 결의량이 정확해졌습니다. 벨로나가 추가되었고, 일부 보스의 난이도 표기와 획득량도 바로잡았습니다.',
      },
      {
        head: '제네시스 해방 계산기의 오류를 수정했습니다',
        desc: '예상 해방 날짜가 실제와 다르게 나오던 문제를 고쳤습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 18.',
    items: [
      {
        head: '설치한 앱을 지울 때 주의하세요',
        desc: '브라우저에 따라 홈 화면에 설치한 앱을 삭제하면 저장된 데이터까지 함께 지워질 수 있습니다. 앱을 지우기 전에는 설정 → 데이터 저장으로 미리 백업해두세요.',
      },
      {
        head: '숙제 트래커에 신비한 별조각 상자가 추가되었습니다',
        desc: '캐릭터 추적 항목에서 선택해 체크할 수 있습니다.',
      },
    ],
  },
  {
    date: '2026. 08. 17.',
    items: [
      {
        head: '앱으로 설치할 수 있습니다',
        desc: '홈 화면에 추가하면 앱처럼 바로 열 수 있습니다. 안드로이드는 안내창의 설치 버튼을, 아이폰은 사파리에서 공유 → 홈 화면에 추가를 눌러주세요. 설정에서도 언제든 다시 볼 수 있습니다.',
      },
      {
        head: '일정 알림',
        desc: '캘린더에서 알림을 켜두면 등록한 일정 시각에 알림으로 알려드립니다. 앱이나 창을 닫아두어도 옵니다. 폰과 데스크톱 모두 사용할 수 있습니다.',
      },
      {
        head: '일정 수정',
        desc: '등록한 일정의 수정 버튼을 누르면 내용과 시간, 색을 고칠 수 있습니다. 지우고 다시 만들지 않아도 됩니다.',
      },
      {
        head: '화면 테마를 설정으로 옮겼습니다',
        desc: '모바일에서 상단 제목이 잘리던 문제를 고치면서, 다크/화이트 선택을 설정 안으로 옮겼습니다.',
      },
      {
        head: '보스 정보 카드 정리',
        desc: '창 크기에 따라 카드가 짓눌리며 이름이 세로로 쪼개지던 문제를 고쳤습니다. 이제 화면이 좁아지면 다음 줄로 넘어갑니다.',
      },
    ],
  },
  {
    date: '2026. 08. 16.',
    items: [
      {
        head: '메이플 캘린더 추가',
        desc: '캐릭터별로 달력에 획득한 아이템을 기록할 수 있습니다. 캐릭터와 날짜를 고른 뒤 아이템 이미지를 클릭하면 저장됩니다.',
      },
      {
        head: '보스 일정 등록',
        desc: '날짜를 클릭하면 보스 일정을 시간과 함께 적어둘 수 있습니다. 일정마다 라벨 색을 직접 골라 표시할 수 있고, 캐릭터마다 하루 4개까지 추가됩니다.',
      },
      {
        head: '매주 반복 일정',
        desc: '보스처럼 매주 같은 요일에 도는 일정은 반복에 체크하면 12주치가 한 번에 등록됩니다.',
      },
      {
        head: '전체 보기',
        desc: '전체 보기를 켜면 모든 캐릭터의 일정과 획득 아이템을 한 달력에서 볼 수 있습니다. 날짜를 클릭하면 캐릭터별로 묶어서 보여줍니다.',
      },
    ],
  },
  {
    date: '2026. 08. 15.',
    items: [
      {
        head: '보스 카드 업데이트',
        desc: '노말 스우 이상의 보스는 카드를 클릭하면 난이도별로 획득 가능한 아이템 목록을 확인할 수 있습니다.',
      },
      {
        head: '벨로나 추가',
        desc: '보스 정보에 벨로나가 추가되었습니다. 오늘의 채널 추천에도 굶주리는 핏빛 원혼이 추가되었습니다.',
      },
    ],
  },
];
// 카드에 보여줄 최근 며칠치. 너무 길어지면 읽지 않으므로 잘라서 보여준다.
const NOTICE_SHOW_DAYS = 3;
const NOTICE = {
  id: '2026-08-24-authclick',   // 이 값이 바뀌어야 이미 확인한 사람에게도 다시 뜬다
  title: '업데이트 안내',
  days: NOTICE_LOG.slice(0, NOTICE_SHOW_DAYS),
};
const NOTICE_SEEN_KEY = 'gms_notice_seen';

function showNoticeModal() {
  if (!NOTICE.days.length) return;
  if (localStorage.getItem(NOTICE_SEEN_KEY) === NOTICE.id) return;

  const esc = s => s.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
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
        <span class="modal__title modal__title--notice">${esc(NOTICE.title)}</span>
      </div>
      <div class="modal__body">
        ${NOTICE.days.map(day => `
          <div class="notice-day">
            <div class="notice-date">${esc(day.date)}</div>
            ${day.items.map(it => `
              <div class="notice-item">
                <div class="notice-item__head">${esc(it.head)}</div>
                <div class="notice-item__desc">${esc(it.desc)}</div>
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

function applyFont(name) {
  document.body.style.fontFamily = `'${name}', 'Segoe UI', 'Malgun Gothic', sans-serif`;
  document.body.dataset.font = name;
  applyRootFontSize();
  localStorage.setItem(FONT_KEY, name);
  document.querySelectorAll('.settings-font-btns [data-font]').forEach(b => {
    b.classList.toggle('sbtn--primary', b.dataset.font === name);
  });
}

document.querySelectorAll('.settings-font-btns [data-font]').forEach(btn => {
  btn.addEventListener('click', () => applyFont(btn.dataset.font));
});

/* ── 테마 ──
   색은 대부분 :root의 CSS 변수를 거쳐 쓰이므로, html에 data-theme만 걸면
   style.css의 :root[data-theme="light"] 블록이 변수를 갈아끼운다. */
const THEME_KEY = STORAGE_KEYS.theme;
function applyTheme(name) {
  const t = name === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.classList.toggle('theme-toggle--light', t === 'light');
    btn.setAttribute('aria-pressed', t === 'light');
  }
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = t === 'light' ? '화이트 모드' : '다크 모드';
  // 설정 모달의 테마 버튼도 같은 상태를 보여줘야 한다(헤더 토글은 모바일에서 숨겨진다)
  document.querySelectorAll('[data-theme-set]').forEach(b => {
    b.classList.toggle('sbtn--primary', b.dataset.themeSet === t);
  });
}
document.getElementById('themeToggle')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});
// 모바일은 헤더 폭이 모자라 토글을 숨기므로 설정에서 고른다
document.querySelectorAll('[data-theme-set]').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeSet));
});
applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

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

// 구버전: 헥사가 전역(hx_skill 등)이었음 → 첫 캐릭터 키로 1회 이전 후 제거
(function migrateHexa() {
  const bases = [STORAGE_KEYS.hexaSkill, STORAGE_KEYS.hexaMastery, STORAGE_KEYS.hexaBoost, STORAGE_KEYS.hexaCommon];
  const ch0 = state.chars[0];
  const cid = ch0 ? (ch0.id ?? 0) : null;
  bases.forEach(base => {
    const legacy = localStorage.getItem(base); // 접미사 없는 구버전 키
    if (legacy == null) return;
    if (cid != null && localStorage.getItem(`${base}_${cid}`) == null) {
      localStorage.setItem(`${base}_${cid}`, legacy);
    }
    localStorage.removeItem(base);
  });
})();

applyRegionUI();
applyFont(localStorage.getItem(FONT_KEY) || '고딕');
renderCharList();
renderBossTable();
renderCharInfo();
refreshStaleChars();


/* 입력칸에서 Enter → blur(=commit). 입력은 바깥 클릭/Enter 전까지 자유롭게. */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') {
    e.target.blur();
  }
});
