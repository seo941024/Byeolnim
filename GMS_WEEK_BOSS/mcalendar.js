/* ═══════════════════════════════════════════════
   메이플 캘린더 — 어느 캐릭터가 언제 무엇을 먹었는지 달력에 기록한다.
   캐릭터를 고르고 → 날짜를 고르고 → 아이템 이미지를 클릭하면 그 칸에 쌓인다.
═══════════════════════════════════════════════ */

// 보스 반지 상자류. 오늘의 채널 추천에는 없어서 캘린더에만 따로 둔다.
const MC_RING_BOXES = [
  { file: 'Use_Life_Boss_Ring_Box.png',       name: '생명의 보스 반지 상자' },
  { file: 'Use_Green_Jade_Boss_Ring_Box.png', name: '녹옥의 보스 반지 상자' },
  { file: 'Use_Red_Jade_Boss_Ring_Box.png',   name: '홍옥의 보스 반지 상자' },
  { file: 'Use_Black_Jade_Boss_Ring_Box.png', name: '흑옥의 보스 반지 상자' },
  { file: 'Use_White_Jade_Boss_Ring_Box.png', name: '백옥의 보스 반지 상자' },
];

// 오늘의 채널 추천의 아이템 전부 + 반지 상자류
const MC_CATEGORIES = [
  ...WANT_CATEGORIES,
  { title: '보스 반지 상자', items: MC_RING_BOXES },
];
const MC_ITEMS = MC_CATEGORIES.flatMap(c => c.items);
function mcItem(file) { return MC_ITEMS.find(i => i.file === file); }

const MC_DOW = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 저장 ──
   { 'YYYY-MM-DD': [{ id, c: 캐릭터id, f: 아이템파일 }] } */
function mcLoad() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.mapleCal)) || {}; }
  catch { return {}; }
}
function mcStore(data) {
  localStorage.setItem(STORAGE_KEYS.mapleCal, JSON.stringify(data));
}

/* ── 화면 상태 ── */
const MC_ALL = 'all';   // 캐릭터 선택에서 "전체" — 모든 캐릭터의 기록을 겹쳐 본다
const mcState = {
  y: new Date().getFullYear(),
  m: new Date().getMonth(),   // 0-11
  sel: null,                  // 선택한 날짜 'YYYY-MM-DD'
  charId: null,               // 선택한 캐릭터 id, 또는 MC_ALL
};

/* 캘린더는 캐릭터별로 따로 보인다. "전체"일 때만 전부 겹쳐 보여준다. */
function mcVisible(recs) {
  if (!recs) return [];
  if (mcState.charId === MC_ALL) return recs;
  return recs.filter(r => r.c === mcState.charId);
}

function mcDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function mcEsc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}
function mcChar(id) { return state.chars.find(c => c.id === id); }

/* 캐릭터 얼굴. 랭킹에서 받아온 아바타가 있으면 그걸, 없으면 직업 헤드 아이콘을 쓴다. */
function mcCharFace(ch) {
  return ch.fetched?.img || charJobHeadSrc(ch) || '';
}

/* ── 렌더 ── */
function renderMapleCalendar() {
  const sec = document.getElementById('sec-mcalendar');
  if (!sec) return;

  // 선택 상태가 유효하지 않으면(캐릭터 삭제 등) 첫 캐릭터로 되돌린다
  if (mcState.charId !== MC_ALL && !mcChar(mcState.charId)) mcState.charId = state.chars[0]?.id ?? null;
  if (!mcState.sel) mcState.sel = todayStr();

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">메이플 캘린더</h2>
    </div>
    <p class="dt-help">캐릭터를 고르고 날짜를 고른 뒤, 아이템 이미지를 클릭하면 그 날짜에 기록됩니다.</p>

    <div class="mc-panel">
      <div class="mc-step__label">1. 캐릭터</div>
      <div class="mc-chars" id="mcChars"></div>
    </div>

    <div class="mc-panel">
      <div class="mc-cal__head">
        <button class="sbtn sbtn--ghost" id="mcPrev">‹</button>
        <span class="mc-cal__title" id="mcTitle"></span>
        <button class="sbtn sbtn--ghost" id="mcNext">›</button>
        <button class="sbtn sbtn--ghost sbtn--sm" id="mcToday">오늘</button>
      </div>
      <div class="mc-grid" id="mcGrid"></div>
    </div>

    <div class="mc-panel">
      <div class="mc-step__label">3. 획득한 아이템 <span class="mc-step__sub" id="mcSelLabel"></span></div>
      <div id="mcItems"></div>
    </div>

    <div class="mc-panel">
      <div class="mc-step__label">기록 <span class="mc-step__sub" id="mcLogLabel"></span></div>
      <div class="mc-log" id="mcLog"></div>
    </div>`;

  document.getElementById('mcPrev').addEventListener('click', () => mcShiftMonth(-1));
  document.getElementById('mcNext').addEventListener('click', () => mcShiftMonth(1));
  document.getElementById('mcToday').addEventListener('click', () => {
    const now = new Date();
    mcState.y = now.getFullYear(); mcState.m = now.getMonth(); mcState.sel = todayStr();
    mcRenderGrid(); mcRenderLog(); mcRenderSelLabel();
  });

  mcRenderChars();
  mcRenderGrid();
  mcRenderItems();
  mcRenderLog();
  mcRenderSelLabel();
}

function mcShiftMonth(delta) {
  const d = new Date(mcState.y, mcState.m + delta, 1);
  mcState.y = d.getFullYear();
  mcState.m = d.getMonth();
  mcRenderGrid();
}

function mcRenderChars() {
  const box = document.getElementById('mcChars');
  if (!box) return;
  if (!state.chars.length) {
    box.innerHTML = '<p class="empty">사이드바에서 캐릭터를 먼저 추가하세요.</p>';
    return;
  }
  const chars = state.chars.map(ch => {
    const face = mcCharFace(ch);
    return `
      <button class="mc-char${ch.id === mcState.charId ? ' sel' : ''}" data-cid="${ch.id}" title="${mcEsc(ch.name)}">
        <span class="mc-char__face">
          ${face ? `<img src="${mcEsc(face)}" alt="" onerror="this.style.display='none'">` : ''}
        </span>
        <span class="mc-char__name">${mcEsc(ch.name)}</span>
      </button>`;
  }).join('');
  // 캐릭터가 둘 이상일 때만 "전체"가 의미가 있다
  const all = state.chars.length > 1 ? `
      <button class="mc-char mc-char--all${mcState.charId === MC_ALL ? ' sel' : ''}" data-cid="${MC_ALL}" title="전체">
        <span class="mc-char__face"><span class="mc-char__allmark">全</span></span>
        <span class="mc-char__name">전체</span>
      </button>` : '';
  box.innerHTML = all + chars;

  box.querySelectorAll('.mc-char').forEach(btn => {
    btn.addEventListener('click', () => {
      mcState.charId = btn.dataset.cid === MC_ALL ? MC_ALL : Number(btn.dataset.cid);
      mcRenderChars(); mcRenderGrid(); mcRenderLog(); mcRenderSelLabel();
    });
  });
}

function mcRenderGrid() {
  const grid = document.getElementById('mcGrid');
  const title = document.getElementById('mcTitle');
  if (!grid) return;
  title.textContent = `${mcState.y}년 ${mcState.m + 1}월`;

  const data = mcLoad();
  const first = new Date(mcState.y, mcState.m, 1).getDay();
  const days = new Date(mcState.y, mcState.m + 1, 0).getDate();
  const today = todayStr();

  let html = MC_DOW.map((d, i) =>
    `<div class="mc-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</div>`).join('');
  // 1일이 무슨 요일인지에 맞춰 앞을 비운다
  html += '<div class="mc-cell mc-cell--pad"></div>'.repeat(first);

  for (let d = 1; d <= days; d++) {
    const ds = mcDateStr(mcState.y, mcState.m, d);
    const recs = mcVisible(data[ds]);
    const dow = (first + d - 1) % 7;
    const cls = ['mc-cell'];
    if (ds === today) cls.push('today');
    if (ds === mcState.sel) cls.push('sel');
    if (dow === 0) cls.push('sun');
    if (dow === 6) cls.push('sat');
    // 칸이 터지지 않게 아이콘은 6개까지만 보여주고 나머지는 +N으로 줄인다
    const shown = recs.slice(0, 6);
    const rest = recs.length - shown.length;
    html += `
      <button class="${cls.join(' ')}" data-date="${ds}">
        <span class="mc-cell__d">${d}</span>
        <span class="mc-cell__icons">
          ${shown.map(r => {
            const it = mcItem(r.f);
            return `<img src="images/WANT/${mcEsc(r.f)}" alt="${mcEsc(it?.name || '')}" onerror="this.style.display='none'">`;
          }).join('')}
          ${rest > 0 ? `<span class="mc-cell__more">+${rest}</span>` : ''}
        </span>
      </button>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.mc-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      mcState.sel = cell.dataset.date;
      mcRenderGrid(); mcRenderLog(); mcRenderSelLabel();
    });
  });
}

function mcRenderItems() {
  const box = document.getElementById('mcItems');
  if (!box) return;
  box.innerHTML = MC_CATEGORIES.map(cat => `
    <div class="mc-cat">
      <div class="mc-cat__title">${mcEsc(cat.title)}</div>
      <div class="mc-itemlist">
        ${cat.items.map(it => `
          <button class="mc-item" data-file="${mcEsc(it.file)}" tabindex="0">
            <img src="images/WANT/${mcEsc(it.file)}" alt="${mcEsc(it.name)}" onerror="this.style.visibility='hidden'">
            <span class="mc-item__name">${mcEsc(it.name)}</span>
          </button>`).join('')}
      </div>
    </div>`).join('');

  box.querySelectorAll('.mc-item').forEach(btn => {
    btn.addEventListener('click', () => mcAdd(btn.dataset.file));
  });
}

function mcAdd(file) {
  if (mcState.charId === MC_ALL) return alert('기록할 캐릭터를 선택하세요. (전체 보기에서는 추가할 수 없습니다)');
  if (!mcState.charId) return alert('먼저 캐릭터를 선택하세요.');
  if (!mcState.sel) return alert('먼저 날짜를 선택하세요.');
  const data = mcLoad();
  (data[mcState.sel] ||= []).push({
    id: Date.now() + Math.random(),
    c: mcState.charId,
    f: file,
  });
  mcStore(data);
  mcRenderGrid(); mcRenderLog();
}

function mcRemove(date, id) {
  const data = mcLoad();
  const list = data[date];
  if (!list) return;
  const i = list.findIndex(r => String(r.id) === String(id));
  if (i < 0) return;
  list.splice(i, 1);
  if (!list.length) delete data[date];
  mcStore(data);
  mcRenderGrid(); mcRenderLog();
}

function mcRenderSelLabel() {
  const el = document.getElementById('mcSelLabel');
  if (!el) return;
  if (!mcState.sel) { el.textContent = ''; return; }
  if (mcState.charId === MC_ALL) { el.textContent = '→ 기록할 캐릭터를 선택하세요'; return; }
  const who = mcChar(mcState.charId)?.name;
  el.textContent = who ? `→ ${who} / ${mcState.sel}에 기록` : `→ ${mcState.sel}에 기록`;
}

function mcRenderLog() {
  const box = document.getElementById('mcLog');
  const label = document.getElementById('mcLogLabel');
  if (!box) return;
  if (label) {
    const who = mcState.charId === MC_ALL ? '전체' : mcChar(mcState.charId)?.name;
    label.textContent = [who, mcState.sel].filter(Boolean).join(' · ');
  }

  const recs = mcVisible(mcLoad()[mcState.sel]);
  if (!recs.length) {
    const who = mcState.charId === MC_ALL ? '' : mcChar(mcState.charId)?.name;
    box.innerHTML = `<p class="empty">이 날짜에 ${who ? mcEsc(who) + '가 ' : ''}기록한 아이템이 없습니다.</p>`;
    return;
  }
  box.innerHTML = recs.map(r => {
    const it = mcItem(r.f);
    const ch = mcChar(r.c);
    const face = ch ? mcCharFace(ch) : '';
    return `
      <div class="mc-logrow">
        <img class="mc-logrow__item" src="images/WANT/${mcEsc(r.f)}" alt="" onerror="this.style.visibility='hidden'">
        <span class="mc-logrow__name">${mcEsc(it?.name || r.f)}</span>
        <span class="mc-logrow__char">
          ${face ? `<img src="${mcEsc(face)}" alt="" onerror="this.style.display='none'">` : ''}
          <span>${mcEsc(ch?.name || '삭제된 캐릭터')}</span>
        </span>
        <button class="mc-logrow__del" data-id="${mcEsc(r.id)}" title="삭제">×</button>
      </div>`;
  }).join('');

  box.querySelectorAll('.mc-logrow__del').forEach(btn => {
    btn.addEventListener('click', () => mcRemove(mcState.sel, btn.dataset.id));
  });
}
