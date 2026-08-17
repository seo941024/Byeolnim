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

// 한 날짜/한 캐릭터에 붙일 수 있는 일정 라벨 수. 칸이 정사각형이라 이 이상은 넘친다.
const MC_MAX_EVENTS = 4;

/* ── 저장 ──
   아이템: { 'YYYY-MM-DD': [{ id, c: 캐릭터id, f: 아이템파일 }] }
   일정  : { 'YYYY-MM-DD': [{ id, c, text, ampm:'오전'|'오후', h, mi, color }] } */
function mcLoad() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.mapleCal)) || {}; }
  catch { return {}; }
}
function mcStore(data) {
  localStorage.setItem(STORAGE_KEYS.mapleCal, JSON.stringify(data));
}
function mcLoadEv() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.mapleCalEvents)) || {}; }
  catch { return {}; }
}
function mcStoreEv(data) {
  localStorage.setItem(STORAGE_KEYS.mapleCalEvents, JSON.stringify(data));
}

/* ── 색상 (HSV → RGB) ──
   드래그로 고르는 색판이 채도/명도 평면이라 HSV로 다루고 저장할 때만 hex로 바꾼다. */
function mcHsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const t = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x]
          : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return t.map(n => Math.round((n + m) * 255));
}
function mcRgbToHex([r, g, b]) {
  return '#' + [r,g,b].map(n => n.toString(16).padStart(2,'0')).join('');
}
/* 라벨 배경이 밝으면 검은 글씨, 어두우면 흰 글씨 — 어느 색을 골라도 글자가 읽히게 */
function mcTextOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#14121c' : '#ffffff';
}

/* ── 화면 상태 ── */
const mcState = {
  y: new Date().getFullYear(),
  m: new Date().getMonth(),   // 0-11
  sel: null,                  // 선택한 날짜 'YYYY-MM-DD'
  charId: null,               // 선택한 캐릭터 id
  hue: 4, sat: .78, val: .95, // 라벨 색 (색판 드래그로 바뀐다)
};
function mcColorHex() { return mcRgbToHex(mcHsvToRgb(mcState.hue, mcState.sat, mcState.val)); }

/* 캘린더는 캐릭터별로 따로 보인다 — 선택한 캐릭터의 기록만 남긴다. */
function mcVisible(recs) {
  if (!recs) return [];
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


/* ═══════════ 달력 화면 ═══════════
   달력이 주인공이고, 캐릭터 선택과 기록 입력은 눌렀을 때 모달로 연다. */
function renderMapleCalendar() {
  const sec = document.getElementById('sec-mcalendar');
  if (!sec) return;

  // 선택 상태가 유효하지 않으면(캐릭터 삭제 등) 첫 캐릭터로 되돌린다
  if (!mcChar(mcState.charId)) mcState.charId = state.chars[0]?.id ?? null;
  if (!mcState.sel) mcState.sel = todayStr();

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">메이플 캘린더</h2>
    </div>
    <p class="dt-help">날짜를 클릭하면 보스 일정과 획득한 아이템을 기록할 수 있습니다.</p>

    <div class="mc-panel">
      <div class="mc-topbar">
        <button class="mc-charchip" id="mcCharChip"></button>
        <div class="mc-cal__head">
          <button class="sbtn sbtn--ghost" id="mcPrev">‹</button>
          <span class="mc-cal__title" id="mcTitle"></span>
          <button class="sbtn sbtn--ghost" id="mcNext">›</button>
          <button class="sbtn sbtn--ghost sbtn--sm" id="mcToday">오늘</button>
        </div>
      </div>
      <div class="mc-grid" id="mcGrid"></div>
    </div>`;

  document.getElementById('mcPrev').addEventListener('click', () => mcShiftMonth(-1));
  document.getElementById('mcNext').addEventListener('click', () => mcShiftMonth(1));
  document.getElementById('mcToday').addEventListener('click', () => {
    const now = new Date();
    mcState.y = now.getFullYear(); mcState.m = now.getMonth();
    mcRenderGrid();
  });
  document.getElementById('mcCharChip').addEventListener('click', mcOpenCharPicker);

  mcRenderCharChip();
  mcRenderGrid();
}

function mcShiftMonth(delta) {
  const d = new Date(mcState.y, mcState.m + delta, 1);
  mcState.y = d.getFullYear();
  mcState.m = d.getMonth();
  mcRenderGrid();
}

/* ── 지금 보고 있는 캐릭터 ── */
function mcRenderCharChip() {
  const chip = document.getElementById('mcCharChip');
  if (!chip) return;
  const ch = mcChar(mcState.charId);
  if (!ch) {
    chip.innerHTML = '<span class="mc-charchip__name">사이드바에서 캐릭터를 먼저 추가하세요</span>';
    return;
  }
  const face = mcCharFace(ch);
  chip.innerHTML = `
    <span class="mc-charchip__face">
      ${face ? `<img src="${mcEsc(face)}" alt="" onerror="this.style.display='none'">` : ''}
    </span>
    <span class="mc-charchip__body">
      <span class="mc-charchip__name">${mcEsc(ch.name)}</span>
      <span class="mc-charchip__sub">캐릭터 변경</span>
    </span>`;
}

/* ── 캐릭터 선택 모달 ── */
function mcOverlay(id) {
  let ov = document.getElementById(id);
  if (!ov) {
    ov = document.createElement('div');
    ov.id = id;
    ov.className = 'overlay';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
  }
  return ov;
}

function mcOpenCharPicker() {
  if (!state.chars.length) return alert('사이드바에서 캐릭터를 먼저 추가하세요.');
  const ov = mcOverlay('mcCharOverlay');
  ov.innerHTML = `
    <div class="modal" style="width:min(680px,94vw)">
      <div class="modal__head">
        <span class="modal__title modal__title--mc">캐릭터 선택</span>
        <button class="modal__close" id="mcCharClose">×</button>
      </div>
      <div class="modal__body">
        <div class="mc-chars">
          ${state.chars.map(ch => {
            const face = mcCharFace(ch);
            return `
              <button class="mc-char${ch.id === mcState.charId ? ' sel' : ''}" data-cid="${ch.id}" title="${mcEsc(ch.name)}">
                <span class="mc-char__face">
                  ${face ? `<img src="${mcEsc(face)}" alt="" onerror="this.style.display='none'">` : ''}
                </span>
                <span class="mc-char__name">${mcEsc(ch.name)}</span>
              </button>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  ov.classList.add('open');
  document.getElementById('mcCharClose').addEventListener('click', () => ov.classList.remove('open'));
  ov.querySelectorAll('.mc-char').forEach(btn => {
    btn.addEventListener('click', () => {
      mcState.charId = Number(btn.dataset.cid);
      ov.classList.remove('open');
      mcRenderCharChip(); mcRenderGrid();
    });
  });
}

/* ── 달력 ── */
function mcRenderGrid() {
  const grid = document.getElementById('mcGrid');
  const title = document.getElementById('mcTitle');
  if (!grid) return;
  title.textContent = `${mcState.y}년 ${mcState.m + 1}월`;

  const data = mcLoad();
  const evData = mcLoadEv();
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
    const evs = mcVisible(evData[ds]);
    const dow = (first + d - 1) % 7;
    const cls = ['mc-cell'];
    if (ds === today) cls.push('today');
    if (dow === 0) cls.push('sun');
    if (dow === 6) cls.push('sat');
    // 칸이 터지지 않게 아이콘은 6개까지만 보여주고 나머지는 +N으로 줄인다
    const shown = recs.slice(0, 6);
    const rest = recs.length - shown.length;
    // 일정 라벨은 위에서부터 차례로, 아이템은 항상 칸 맨 아래에 깔린다
    html += `
      <button class="${cls.join(' ')}" data-date="${ds}">
        <span class="mc-cell__d">${d}</span>
        <span class="mc-cell__evs">
          ${evs.map(ev => `
            <span class="mc-cell__ev" style="background:${mcEsc(ev.color)};color:${mcTextOn(ev.color)}"
                  title="${mcEsc(mcFmtTime(ev))} ${mcEsc(ev.text)}">
              ${mcEsc(mcFmtTime(ev))} ${mcEsc(ev.text)}
            </span>`).join('')}
        </span>
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
    cell.addEventListener('click', () => mcOpenDay(cell.dataset.date));
  });
}

/* ═══════════ 날짜 모달 — 여기서 일정과 아이템을 기록한다 ═══════════ */
function mcOpenDay(date) {
  if (!mcState.charId) return alert('사이드바에서 캐릭터를 먼저 추가하세요.');
  mcState.sel = date;
  const ch = mcChar(mcState.charId);
  const dow = MC_DOW[new Date(date + 'T00:00:00').getDay()];

  const ov = mcOverlay('mcDayOverlay');
  ov.innerHTML = `
    <div class="modal modal--mc-day">
      <div class="modal__head">
        <span class="modal__title modal__title--mc">${mcEsc(date)} (${dow}) · ${mcEsc(ch.name)}</span>
        <button class="modal__close" id="mcDayClose">×</button>
      </div>
      <div class="modal__body">
        <div class="mc-sec">
          <div class="mc-sec__label">
            보스 일정
            <span class="mc-sec__sub">라벨은 ${MC_MAX_EVENTS}개까지 추가 가능합니다 <b id="mcEvSub"></b></span>
          </div>
          <div class="mc-ev-form">
            <input class="inp mc-ev__text" id="mcEvText" type="text" maxlength="40"
                   placeholder="보스 명 혹은 파티 명을 간단하게 적어주세요.">
            <div class="mc-ev__time">
              <select class="inp mc-ev__ampm" id="mcEvAmpm">
                <option value="오전">오전</option>
                <option value="오후">오후</option>
              </select>
              <input class="inp mc-ev__num" id="mcEvH" type="text" inputmode="numeric" maxlength="2" value="00">
              <span class="mc-ev__colon">:</span>
              <input class="inp mc-ev__num" id="mcEvM" type="text" inputmode="numeric" maxlength="2" value="00">
            </div>
            <div class="mc-ev__color">
              <div class="mc-pick">
                <div class="mc-pick__sv" id="mcPickSv"><span class="mc-pick__dot" id="mcPickSvDot"></span></div>
                <div class="mc-pick__hue" id="mcPickHue"><span class="mc-pick__hdot" id="mcPickHueDot"></span></div>
              </div>
              <div class="mc-pick__out">
                <span class="mc-pick__prev" id="mcPickPrev"></span>
                <span class="mc-pick__val" id="mcPickVal"></span>
              </div>
            </div>
            <button class="sbtn sbtn--primary mc-ev__add" id="mcEvAdd">일정 추가</button>
          </div>
        </div>

        <div class="mc-sec">
          <div class="mc-sec__label">획득한 아이템</div>
          <div id="mcItems"></div>
        </div>

        <div class="mc-sec">
          <div class="mc-sec__label">기록</div>
          <div class="mc-log" id="mcLog"></div>
        </div>
      </div>
    </div>`;
  ov.classList.add('open');

  document.getElementById('mcDayClose').addEventListener('click', () => ov.classList.remove('open'));
  document.getElementById('mcEvAdd').addEventListener('click', mcAddEvent);
  // 00~12 / 00~59. 두 자리로 맞춰 넣어야 09시, 00분처럼 적힌다.
  mcTimeInput(document.getElementById('mcEvH'), 12);
  mcTimeInput(document.getElementById('mcEvM'), 59);

  mcInitPicker();
  mcRenderItems();
  mcRenderLog();
  mcRenderEvSub();
}

/* 숫자만, 두 자리로, 범위 밖은 아예 못 적게. 다 지우면 00으로 되돌린다. */
function mcTimeInput(el, max) {
  el.addEventListener('input', () => {
    let v = el.value.replace(/\D/g, '').slice(0, 2);
    if (v !== '' && parseInt(v, 10) > max) v = String(max).padStart(2, '0');
    el.value = v;
  });
  el.addEventListener('blur', () => {
    const n = parseInt(el.value, 10);
    el.value = isNaN(n) ? '00' : String(Math.min(max, Math.max(0, n))).padStart(2, '0');
  });
  el.addEventListener('focus', () => el.select());
}

/* ── 라벨 색 고르기 ──
   위쪽 사각형은 채도/명도 평면, 아래 띠는 색상(hue). 둘 다 눌러서 끌면 따라온다. */
function mcInitPicker() {
  const sv = document.getElementById('mcPickSv');
  const hue = document.getElementById('mcPickHue');
  if (!sv || !hue) return;

  // 포인터를 영역 밖으로 끌고 나가도 계속 따라오게 캡처한다
  const drag = (el, onMove) => {
    const handle = e => {
      const r = el.getBoundingClientRect();
      onMove(
        Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      );
      mcRenderPicker();
    };
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      handle(e);
      const move = ev => handle(ev);
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  };
  drag(sv, (x, y) => { mcState.sat = x; mcState.val = 1 - y; });
  drag(hue, x => { mcState.hue = x * 360; });
  mcRenderPicker();
}

function mcRenderPicker() {
  const sv = document.getElementById('mcPickSv');
  if (!sv) return;
  const hex = mcColorHex();
  const [r, g, b] = mcHsvToRgb(mcState.hue, mcState.sat, mcState.val);
  sv.style.setProperty('--mc-hue', mcRgbToHex(mcHsvToRgb(mcState.hue, 1, 1)));
  document.getElementById('mcPickSvDot').style.left = (mcState.sat * 100) + '%';
  document.getElementById('mcPickSvDot').style.top = ((1 - mcState.val) * 100) + '%';
  document.getElementById('mcPickHueDot').style.left = (mcState.hue / 360 * 100) + '%';
  document.getElementById('mcPickPrev').style.background = hex;
  document.getElementById('mcPickVal').textContent = `RGB ${r}, ${g}, ${b}  ${hex.toUpperCase()}`;
}

/* ── 일정 ── */
function mcEventsOf(date) { return mcVisible(mcLoadEv()[date]); }

function mcFmtTime(ev) {
  return `${ev.ampm} ${String(ev.h).padStart(2, '0')}:${String(ev.mi).padStart(2, '0')}`;
}

function mcAddEvent() {
  const text = document.getElementById('mcEvText').value.trim();
  if (!text) return alert('보스 명 혹은 파티 명을 간단하게 적어주세요.');

  const h = parseInt(document.getElementById('mcEvH').value, 10) || 0;
  const mi = parseInt(document.getElementById('mcEvM').value, 10) || 0;

  const data = mcLoadEv();
  const mine = (data[mcState.sel] || []).filter(e => e.c === mcState.charId);
  if (mine.length >= MC_MAX_EVENTS) {
    return alert(`하루에 일정은 ${MC_MAX_EVENTS}개까지만 추가할 수 있습니다.`);
  }

  (data[mcState.sel] ||= []).push({
    id: Date.now() + Math.random(),
    c: mcState.charId,
    text, ampm: document.getElementById('mcEvAmpm').value,
    h, mi, color: mcColorHex(),
  });
  mcStoreEv(data);
  document.getElementById('mcEvText').value = '';
  document.getElementById('mcEvH').value = '00';
  document.getElementById('mcEvM').value = '00';
  mcRenderGrid(); mcRenderLog(); mcRenderEvSub();
}

function mcRemoveEvent(date, id) {
  const data = mcLoadEv();
  const list = data[date];
  if (!list) return;
  const i = list.findIndex(e => String(e.id) === String(id));
  if (i < 0) return;
  list.splice(i, 1);
  if (!list.length) delete data[date];
  mcStoreEv(data);
  mcRenderGrid(); mcRenderLog(); mcRenderEvSub();
}

function mcRenderEvSub() {
  const el = document.getElementById('mcEvSub');
  if (el) el.textContent = `(${mcEventsOf(mcState.sel).length}/${MC_MAX_EVENTS})`;
}

/* ── 아이템 ── */
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

/* ── 그날의 기록 ── */
function mcRenderLog() {
  const box = document.getElementById('mcLog');
  if (!box) return;

  const evs = mcEventsOf(mcState.sel);
  const recs = mcVisible(mcLoad()[mcState.sel]);
  if (!recs.length && !evs.length) {
    box.innerHTML = '<p class="empty">이 날짜에 기록한 일정과 아이템이 없습니다.</p>';
    return;
  }

  const evHtml = evs.map(ev => `
      <div class="mc-logrow">
        <span class="mc-logrow__chip" style="background:${mcEsc(ev.color)}"></span>
        <span class="mc-logrow__time">${mcEsc(mcFmtTime(ev))}</span>
        <span class="mc-logrow__name">${mcEsc(ev.text)}</span>
        <button class="mc-logrow__del" data-ev="${mcEsc(ev.id)}" title="삭제">×</button>
      </div>`).join('');

  box.innerHTML = evHtml + recs.map(r => {
    const it = mcItem(r.f);
    return `
      <div class="mc-logrow">
        <img class="mc-logrow__item" src="images/WANT/${mcEsc(r.f)}" alt="" onerror="this.style.visibility='hidden'">
        <span class="mc-logrow__name">${mcEsc(it?.name || r.f)}</span>
        <button class="mc-logrow__del" data-id="${mcEsc(r.id)}" title="삭제">×</button>
      </div>`;
  }).join('');

  box.querySelectorAll('.mc-logrow__del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.ev != null) mcRemoveEvent(mcState.sel, btn.dataset.ev);
      else mcRemove(mcState.sel, btn.dataset.id);
    });
  });
}
