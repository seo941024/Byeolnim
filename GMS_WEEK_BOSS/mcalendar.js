/* ═══════════════════════════════════════════════
   메이플 캘린더 — 어느 캐릭터가 언제 무엇을 먹었는지 달력에 기록한다.
   캐릭터를 고르고 → 날짜를 고르고 → 아이템 이미지를 클릭하면 그 칸에 쌓인다.
═══════════════════════════════════════════════ */

// 보스 반지 상자류. 오늘의 채널 추천에는 없어서 캘린더에만 따로 둔다.
const MC_RING_BOXES = [
  { file: 'Use_Life_Boss_Ring_Box.png',       name: '생명의 보스 반지 상자' },
  { file: 'Use_White_Jade_Boss_Ring_Box.png', name: '백옥의 보스 반지 상자' },
  { file: 'Use_Black_Jade_Boss_Ring_Box.png', name: '흑옥의 보스 반지 상자' },
  { file: 'Use_Red_Jade_Boss_Ring_Box.png',   name: '홍옥의 보스 반지 상자' },
  { file: 'Use_Green_Jade_Boss_Ring_Box.png', name: '녹옥의 보스 반지 상자' },
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
// 전체 보기에서 여러 캐릭터의 라벨이 겹쳐도 이 한도는 "캐릭터당"이라 충돌하지 않는다.
const MC_MAX_EVENTS = 4;
// "매주 반복"이 몇 주치를 만들지. 보스는 주 단위로 도는 게 보통이라 기본 12주(약 3개월).
const MC_REPEAT_WEEKS = 12;

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
  // 일정이 바뀌면 서버가 들고 있는 알림 시각도 같이 맞춰야 한다.
  // 저장 경로가 전부 이 함수를 지나가므로 여기 한 곳만 걸어두면 된다.
  // 알림이 꺼져 있으면 bpSync가 알아서 아무것도 하지 않는다.
  if (typeof bpSync === 'function') bpSync().catch(() => {});
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
/* 저장은 hex 하나뿐이라, 수정 시 색판을 그 색 그대로 열어주려면 거꾸로 hsv로
   되돌려야 한다(hex -> hsv). mcHsvToRgb의 역연산. */
function mcHexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
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
  charId: null,               // 기록할 캐릭터 id (전체 보기 중에도 그대로 유지된다)
  viewAll: false,             // 전체 보기 — 모든 캐릭터의 기록을 겹쳐서 본다(읽기 전용)
  tab: 'ev',                  // 날짜 모달에서 마지막에 본 탭 ('ev' | 'item')
  hue: 4, sat: .78, val: .95, // 라벨 색 (색판 드래그로 바뀐다)
  editEvId: null,             // 지금 수정 중인 일정의 id. null이면 "추가" 모드
};
function mcColorHex() { return mcRgbToHex(mcHsvToRgb(mcState.hue, mcState.sat, mcState.val)); }

/* 캘린더는 캐릭터별로 따로 보인다. 전체 보기일 때만 전부 겹쳐서 보여준다.
   라벨 한도(MC_MAX_EVENTS)는 "캐릭터당 하루" 기준이라, 전체 보기에서 여러 캐릭터의
   라벨이 겹쳐도 한도 충돌은 없다 — 칸에 다 안 들어가면 +N으로 접기만 한다. */
function mcVisible(recs) {
  if (!recs) return [];
  if (mcState.viewAll) return recs;
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
        <button class="sbtn sbtn--ghost mc-pushbtn" id="mcPushBtn">알림 받기</button>
        <button class="sbtn sbtn--ghost mc-allbtn" id="mcAllBtn">전체 보기</button>
      </div>
      <div class="mc-cal__head">
        <button class="sbtn sbtn--ghost" id="mcPrev">‹</button>
        <span class="mc-cal__title" id="mcTitle"></span>
        <button class="sbtn sbtn--ghost" id="mcNext">›</button>
        <button class="sbtn sbtn--ghost sbtn--sm" id="mcToday">이번 달로 이동</button>
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
  document.getElementById('mcAllBtn').addEventListener('click', () => {
    mcState.viewAll = !mcState.viewAll;
    mcRenderCharChip(); mcRenderGrid();
  });
  document.getElementById('mcPushBtn').addEventListener('click', mcTogglePush);
  mcRenderPushBtn();
  // 버튼만 만들어두고 기다리면 아무도 안 눌러서, 캘린더에 들어올 때 먼저 물어본다.
  // 렌더 직후 바로 물어보면 화면이 채 그려지기 전이라 어색해 살짝 늦춘다.
  if (typeof bpShowPrompt === 'function') setTimeout(bpShowPrompt, 500);

  mcRenderCharChip();
  mcRenderGrid();
}

/* ── 일정 알림 켜기/끄기 ──
   보스든 파티든 등록한 일정이면 전부 대상이다("보스 알림"이 아니다).
   앱이 닫혀 있어도 오는 알림이라 서버에 일정 시각을 올려야 한다(bosspush.js 참고). */
function mcRenderPushBtn() {
  const btn = document.getElementById('mcPushBtn');
  if (!btn) return;
  if (typeof bpSupported !== 'function' || !bpSupported()) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = '';
  const on = bpIsEnabled();
  btn.textContent = on ? '알림 끄기' : '알림 받기';
  btn.classList.toggle('sbtn--primary', on);
  btn.classList.toggle('sbtn--ghost', !on);
}

async function mcTogglePush() {
  const btn = document.getElementById('mcPushBtn');
  if (!btn) return;
  const wasOn = bpIsEnabled();
  btn.disabled = true;

  try {
    if (wasOn) {
      await bpDisable();
      mcToast('알림을 껐습니다.');
      // 꺼서 다시 물어볼 만한 상태가 됐으니, 바로 옆에서 다시 켤 기회를 준다
      if (typeof bpShowPrompt === 'function') setTimeout(bpShowPrompt, 400);
    } else {
      const r = await bpEnable();
      if (!r.ok) { alert(r.msg); return; }
      mcToast('알림을 켰습니다.');
    }
  } finally {
    btn.disabled = false;
    mcRenderPushBtn();
  }
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

  const allBtn = document.getElementById('mcAllBtn');
  if (allBtn) {
    // 캐릭터가 둘 이상일 때만 전체 보기가 의미가 있다
    allBtn.style.display = state.chars.length > 1 ? '' : 'none';
    allBtn.classList.toggle('sbtn--primary', mcState.viewAll);
    allBtn.classList.toggle('sbtn--ghost', !mcState.viewAll);
    allBtn.textContent = mcState.viewAll ? '전체 보기 끄기' : '전체 보기';
  }
  chip.classList.toggle('dim', mcState.viewAll);

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

  // 이미 이번 달을 보고 있으면 "이번 달" 버튼은 할 일이 없다 → 눌러도 아무 일이 없다는 걸
  // 눈으로 알 수 있게 꺼둔다(예전엔 멀쩡해 보이는데 반응이 없어 오해를 샀다)
  const nowD = new Date();
  const atNow = mcState.y === nowD.getFullYear() && mcState.m === nowD.getMonth();
  const todayBtn = document.getElementById('mcToday');
  if (todayBtn) { todayBtn.disabled = atNow; todayBtn.classList.toggle('is-off', atNow); }

  const data = mcLoad();
  const evData = mcLoadEv();
  const first = new Date(mcState.y, mcState.m, 1).getDay();
  const days = new Date(mcState.y, mcState.m + 1, 0).getDate();
  const today = todayStr();

  /* 칸에 몇 개를 그릴지는 "화면 폭"이 아니라 "칸 크기"로 정해야 한다.
     칸은 정사각형이라 폭=높이인데, 전체 보기로 여러 캐릭터가 겹치면 창이 조금만
     좁아져도(1000px 등) 아이콘이 줄바꿈되며 칸을 뚫고 나가 통째로 잘렸다.
     아이콘 줄(.mc-cell__icons)은 flex-shrink:0이라 스스로 줄지 않기 때문.
     그래서 그리기 전에 칸 폭을 계산해 한 줄에 들어갈 만큼만 그린다. */
  const gridGap = parseFloat(getComputedStyle(grid).columnGap) || 4;
  const cellW = (grid.clientWidth - gridGap * 6) / 7;
  // 라벨 글씨를 읽을 수 없는 크기면 색 막대만 보여주는 압축 모드로 전환
  const compact = cellW < 92;
  grid.classList.toggle('mc-grid--compact', compact);

  // 아래 숫자들은 .mc-grid--compact CSS의 값과 짝이다 — 한쪽만 바꾸면 계산이 어긋난다
  const cellPad = compact ? 4 : 5;
  const iconPx = compact ? 14 : 21;
  const iconGap = 2;
  const innerW = cellW - cellPad * 2;
  // 한 줄에 들어가는 아이콘 수 (줄바꿈은 무조건 막는다)
  const iconFit = Math.max(1, Math.floor((innerW + iconGap) / (iconPx + iconGap)));
  // 압축 모드는 라벨이 색 막대 한 줄로 눕기 때문에 개수 제한이 필요 없다.
  // 아닐 때만 라벨이 세로로 쌓이므로 남는 높이만큼만 편다.
  const dateH = compact ? 13 : 20, rowGap = compact ? 1 : 3, labelH = 20;
  const freeH = cellW - cellPad * 2 - dateH - rowGap * 2 - iconPx;
  const fitEvCap = compact ? Infinity : Math.max(1, Math.floor(freeH / labelH));

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
    // 아이콘은 한 줄에 들어갈 만큼만. 더 있으면 마지막 한 칸을 "+N" 자리로 양보한다.
    let shown = recs.slice(0, iconFit);
    let rest = recs.length - shown.length;
    if (rest > 0) {
      shown = recs.slice(0, Math.max(1, iconFit - 1));
      rest = recs.length - shown.length;
    }
    // 전체 보기에서는 여러 캐릭터의 라벨이 겹치므로 더 적게 편다.
    // 어느 쪽이든 칸 높이에 실제로 들어가는 수(fitEvCap)를 넘지 않는다.
    const evCap = Math.min(mcState.viewAll ? 3 : MC_MAX_EVENTS, fitEvCap);
    const evShown = evs.slice(0, evCap);
    const evRest = evs.length - evShown.length;
    // 일정 라벨은 위에서부터 차례로, 아이템은 항상 칸 맨 아래에 깔린다
    html += `
      <button class="${cls.join(' ')}" data-date="${ds}">
        <span class="mc-cell__d">${d}</span>
        <span class="mc-cell__evs">
          ${evShown.map(ev => `
            <span class="mc-cell__ev" style="background:${mcEsc(ev.color)};color:${mcTextOn(ev.color)}"
                  title="${mcEsc(mcFmtTime(ev))} ${mcEsc(ev.text)}">
              ${mcEsc(mcFmtTime(ev))} ${mcEsc(ev.text)}
            </span>`).join('')}
          ${evRest > 0 ? `<span class="mc-cell__more">일정 +${evRest}</span>` : ''}
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
  mcState.editEvId = null;   // 다른 날짜를 열면 이전 날짜의 수정 상태는 버린다
  if (mcState.viewAll) return mcOpenDayAll(date);
  const ch = mcChar(mcState.charId);
  const dow = MC_DOW[new Date(date + 'T00:00:00').getDay()];

  const ov = mcOverlay('mcDayOverlay');
  ov.innerHTML = `
    <div class="modal modal--mc-day">
      <div class="modal__head">
        <span class="modal__title modal__title--mc">${mcEsc(date)} (${dow}) · ${mcEsc(ch.name)}</span>
        <button class="modal__close" id="mcDayClose">×</button>
      </div>
      <div class="mc-tabs">
        <button class="mc-tab" data-tab="ev">보스 일정</button>
        <button class="mc-tab" data-tab="item">획득한 아이템</button>
      </div>
      <div class="modal__body">
        <div class="mc-pane" data-pane="ev">
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
            <label class="mc-ev__repeat">
              <input type="checkbox" id="mcEvRepeat">
              <span>매주 반복 <b>(${MC_REPEAT_WEEKS}주)</b></span>
            </label>
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
            <div class="mc-ev__btns">
              <button class="sbtn sbtn--primary mc-ev__add" id="mcEvAdd">일정 추가</button>
              <button class="sbtn sbtn--ghost mc-ev__cancel" id="mcEvEditCancel" style="display:none">수정 취소</button>
            </div>
          </div>
          <div class="mc-sec__label mc-sec__label--sub">등록한 일정</div>
          <div class="mc-log" id="mcEvLog"></div>
        </div>

        <div class="mc-pane" data-pane="item">
          <div class="mc-sec__label">획득한 아이템</div>
          <div id="mcItems"></div>
          <div class="mc-sec__label mc-sec__label--sub">기록한 아이템</div>
          <div class="mc-log" id="mcItemLog"></div>
        </div>
      </div>
    </div>`;
  ov.classList.add('open');

  document.getElementById('mcDayClose').addEventListener('click', () => ov.classList.remove('open'));
  ov.querySelectorAll('.mc-tab').forEach(btn => {
    btn.addEventListener('click', () => mcSetTab(btn.dataset.tab));
  });
  mcSetTab(mcState.tab);
  document.getElementById('mcEvAdd').addEventListener('click', mcAddEvent);
  document.getElementById('mcEvEditCancel').addEventListener('click', mcCancelEditEvent);
  // 00~12 / 00~59. 두 자리로 맞춰 넣어야 09시, 00분처럼 적힌다.
  mcTimeInput(document.getElementById('mcEvH'), 12);
  mcTimeInput(document.getElementById('mcEvM'), 59);

  mcInitPicker();
  mcRenderItems();
  mcRenderLog();
  mcRenderEvSub();
}

/* ── 전체 보기의 날짜 모달 ──
   그날 모든 캐릭터의 일정과 아이템을 캐릭터별로 묶어서 보여준다.
   어느 캐릭터에 넣을지 알 수 없으므로 추가/삭제 없이 읽기만 한다. */
function mcOpenDayAll(date) {
  const dow = MC_DOW[new Date(date + 'T00:00:00').getDay()];
  const evs = mcLoadEv()[date] || [];
  const recs = mcLoad()[date] || [];

  // 캐릭터 목록 순서대로 묶는다. 삭제된 캐릭터의 기록도 빠뜨리지 않고 맨 뒤에 모은다.
  const ids = state.chars.map(c => c.id).filter(id => evs.some(e => e.c === id) || recs.some(r => r.c === id));
  const orphan = [...evs, ...recs].some(x => !mcChar(x.c));
  if (orphan) ids.push(null);

  const blocks = ids.map(id => {
    const mineEv = evs.filter(e => (id === null ? !mcChar(e.c) : e.c === id));
    const mineIt = recs.filter(r => (id === null ? !mcChar(r.c) : r.c === id));
    const ch = id === null ? null : mcChar(id);
    const face = ch ? mcCharFace(ch) : '';
    return `
      <div class="mc-allblock">
        <div class="mc-allblock__head">
          ${face ? `<img src="${mcEsc(face)}" alt="" onerror="this.style.display='none'">` : ''}
          <span>${mcEsc(ch ? ch.name : '삭제된 캐릭터')}</span>
        </div>
        ${mineEv.map(ev => `
          <div class="mc-logrow">
            <span class="mc-logrow__chip" style="background:${mcEsc(ev.color)}"></span>
            <span class="mc-logrow__time">${mcEsc(mcFmtTime(ev))}</span>
            <span class="mc-logrow__name">${mcEsc(ev.text)}</span>
          </div>`).join('')}
        ${mineIt.length ? `
          <div class="mc-allblock__items">
            ${mineIt.map(r => {
              const it = mcItem(r.f);
              return `<img class="mc-allblock__item" src="images/WANT/${mcEsc(r.f)}"
                        alt="${mcEsc(it?.name || '')}" title="${mcEsc(it?.name || r.f)}"
                        onerror="this.style.visibility='hidden'">`;
            }).join('')}
          </div>` : ''}
      </div>`;
  }).join('');

  const ov = mcOverlay('mcDayOverlay');
  ov.innerHTML = `
    <div class="modal modal--mc-day">
      <div class="modal__head">
        <span class="modal__title modal__title--mc">${mcEsc(date)} (${dow}) · 전체</span>
        <button class="modal__close" id="mcDayClose">×</button>
      </div>
      <div class="modal__body">
        ${blocks || '<p class="empty">이 날짜에 기록한 일정과 아이템이 없습니다.</p>'}
        <p class="dt-help">전체 보기에서는 읽기만 됩니다. 기록하려면 전체 보기를 끄고 캐릭터를 고르세요.</p>
      </div>
    </div>`;
  ov.classList.add('open');
  document.getElementById('mcDayClose').addEventListener('click', () => ov.classList.remove('open'));
}

/* 탭 전환. 마지막에 본 탭은 mcState.tab에 남아서 다음에 열 때도 그 탭으로 열린다. */
function mcSetTab(tab) {
  mcState.tab = tab;
  const ov = document.getElementById('mcDayOverlay');
  if (!ov) return;
  ov.querySelectorAll('.mc-tab').forEach(b => b.classList.toggle('sel', b.dataset.tab === tab));
  ov.querySelectorAll('.mc-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === tab));
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

/* 목록의 ✎ 버튼 — 폼에 기존 값을 채워 넣고 "추가" 버튼을 "수정 완료"로 바꾼다.
   반복 등록은 여러 날짜에 걸친 일이라 "이 한 건만 고친다"는 수정과는 안 맞으므로
   수정 중엔 숨긴다. */
function mcEditEvent(date, id) {
  const list = mcLoadEv()[date] || [];
  const ev = list.find(e => String(e.id) === String(id));
  if (!ev) return;

  mcState.editEvId = ev.id;
  mcRenderLog();   // 목록에 "수정 중" 표시가 바로 보이게
  document.getElementById('mcEvText').value = ev.text;
  document.getElementById('mcEvAmpm').value = ev.ampm;
  document.getElementById('mcEvH').value = String(ev.h).padStart(2, '0');
  document.getElementById('mcEvM').value = String(ev.mi).padStart(2, '0');

  const hsv = mcHexToHsv(ev.color);
  mcState.hue = hsv.h; mcState.sat = hsv.s; mcState.val = hsv.v || 1;
  mcRenderPicker();

  const repeatBox = document.getElementById('mcEvRepeat');
  repeatBox.checked = false;
  repeatBox.closest('.mc-ev__repeat').style.display = 'none';
  document.getElementById('mcEvAdd').textContent = '수정 완료';
  document.getElementById('mcEvEditCancel').style.display = '';
  document.getElementById('mcEvText').focus();
}

function mcCancelEditEvent() {
  mcState.editEvId = null;
  document.getElementById('mcEvText').value = '';
  document.getElementById('mcEvAmpm').value = '오전';
  document.getElementById('mcEvH').value = '00';
  document.getElementById('mcEvM').value = '00';
  document.getElementById('mcEvAdd').textContent = '일정 추가';
  document.getElementById('mcEvEditCancel').style.display = 'none';
  document.getElementById('mcEvRepeat').closest('.mc-ev__repeat').style.display = '';
}

function mcAddEvent() {
  const text = document.getElementById('mcEvText').value.trim();
  if (!text) return alert('보스 명 혹은 파티 명을 간단하게 적어주세요.');

  const h = parseInt(document.getElementById('mcEvH').value, 10) || 0;
  const mi = parseInt(document.getElementById('mcEvM').value, 10) || 0;
  const ampm = document.getElementById('mcEvAmpm').value;

  // 수정 모드 — 새로 추가하지 않고 기존 항목을 그대로 덮어쓴다
  if (mcState.editEvId != null) {
    const data = mcLoadEv();
    const list = data[mcState.sel] || [];
    const ev = list.find(e => String(e.id) === String(mcState.editEvId));
    if (ev) {
      Object.assign(ev, { text, ampm, h, mi, color: mcColorHex() });
      mcStoreEv(data);
      mcToast(`${text} 일정 수정 완료!`);
    }
    mcCancelEditEvent();
    mcRenderGrid(); mcRenderLog(); mcRenderEvSub();
    return;
  }

  const data = mcLoadEv();
  const mine = (data[mcState.sel] || []).filter(e => e.c === mcState.charId);
  if (mine.length >= MC_MAX_EVENTS) {
    return alert(`하루에 일정은 ${MC_MAX_EVENTS}개까지만 추가할 수 있습니다.`);
  }

  // 매주 반복 — 같은 요일/같은 시간으로 앞으로 몇 주치를 한꺼번에 넣는다.
  const repeat = document.getElementById('mcEvRepeat').checked;
  const weeks = repeat ? MC_REPEAT_WEEKS : 1;
  const base = new Date(mcState.sel + 'T00:00:00');
  let added = 0, skipped = 0;

  for (let w = 0; w < weeks; w++) {
    const d = new Date(base);
    d.setDate(d.getDate() + w * 7);
    const ds = mcDateStr(d.getFullYear(), d.getMonth(), d.getDate());
    const list = (data[ds] ||= []);
    // 이미 그 날 한도를 채운 캐릭터는 건너뛴다 — 반복 때문에 한도가 무너지면 안 된다
    if (list.filter(e => e.c === mcState.charId).length >= MC_MAX_EVENTS) { skipped++; continue; }
    list.push({
      id: Date.now() + Math.random() + w,
      c: mcState.charId,
      text, ampm, h, mi, color: mcColorHex(),
    });
    added++;
  }

  mcStoreEv(data);
  document.getElementById('mcEvText').value = '';
  document.getElementById('mcEvH').value = '00';
  document.getElementById('mcEvM').value = '00';
  mcRenderGrid(); mcRenderLog(); mcRenderEvSub();
  mcToast(repeat
    ? `${text} ${added}주 반복 추가 완료!${skipped ? ` (${skipped}주는 한도 초과로 건너뜀)` : ''}`
    : `${text} 일정 추가 완료!`);
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
  // 지금 수정 중이던 걸 지웠다면 폼이 고아 상태로 남으므로 원상 복귀한다
  if (String(mcState.editEvId) === String(id)) mcCancelEditEvent();
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
    // 툴팁을 버튼 안에 두면 모달 본문(overflow:auto)에 잘린다 → body에 띄우고 화면 기준으로 위치
    btn.addEventListener('mouseenter', () => mcShowTip(btn, mcItem(btn.dataset.file)?.name || ''));
    btn.addEventListener('focus', () => mcShowTip(btn, mcItem(btn.dataset.file)?.name || ''));
    btn.addEventListener('mouseleave', mcHideTip);
    btn.addEventListener('blur', mcHideTip);
  });
}

/* ── 아이템 이름 툴팁 (body 직속, position:fixed) ── */
function mcTipEl() {
  let el = document.getElementById('mcTip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mcTip';
    el.className = 'mc-tip';
    document.body.appendChild(el);
  }
  return el;
}
function mcShowTip(anchor, text) {
  if (!text) return;
  const el = mcTipEl();
  el.textContent = text;
  el.classList.add('on');
  const a = anchor.getBoundingClientRect();
  const t = el.getBoundingClientRect();
  // 화면 밖으로 나가지 않게 좌우를 물려 넣는다 — 첫 칸/마지막 칸에서 글자가 잘리던 원인
  const x = Math.min(window.innerWidth - t.width - 8, Math.max(8, a.left + a.width / 2 - t.width / 2));
  // 위쪽에 자리가 없으면 아래로 뒤집는다
  const above = a.top - t.height - 10;
  el.style.left = x + 'px';
  el.style.top = (above >= 8 ? above : a.bottom + 10) + 'px';
}
function mcHideTip() {
  document.getElementById('mcTip')?.classList.remove('on');
}

/* ── 추가됐다는 걸 눈으로 알려주는 토스트 ── */
function mcToast(msg) {
  let box = document.getElementById('mcToasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'mcToasts';
    box.className = 'mc-toasts';
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'mc-toast';
  t.textContent = msg;
  box.appendChild(t);
  // 애니메이션이 끝나면 알아서 사라진다
  setTimeout(() => t.classList.add('out'), 1400);
  setTimeout(() => t.remove(), 1750);
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
  mcToast(`${mcItem(file)?.name || file} 추가 완료!`);
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

/* ── 그날의 기록 — 탭이 나뉘어 있으므로 목록도 각 탭 안에 따로 둔다 ── */
function mcRenderLog() {
  const evBox = document.getElementById('mcEvLog');
  const itemBox = document.getElementById('mcItemLog');
  if (!evBox || !itemBox) return;

  const evs = mcEventsOf(mcState.sel);
  evBox.innerHTML = evs.length ? evs.map(ev => `
      <div class="mc-logrow${String(ev.id) === String(mcState.editEvId) ? ' mc-logrow--editing' : ''}">
        <span class="mc-logrow__chip" style="background:${mcEsc(ev.color)}"></span>
        <span class="mc-logrow__time">${mcEsc(mcFmtTime(ev))}</span>
        <span class="mc-logrow__name">${mcEsc(ev.text)}</span>
        <button class="mc-logrow__edit" data-ev-edit="${mcEsc(ev.id)}" title="수정">✎</button>
        <button class="mc-logrow__del" data-ev="${mcEsc(ev.id)}" title="삭제">×</button>
      </div>`).join('')
    : '<p class="empty">이 날짜에 등록한 일정이 없습니다.</p>';

  const recs = mcVisible(mcLoad()[mcState.sel]);
  itemBox.innerHTML = recs.length ? recs.map(r => {
    const it = mcItem(r.f);
    return `
      <div class="mc-logrow">
        <img class="mc-logrow__item" src="images/WANT/${mcEsc(r.f)}" alt="" onerror="this.style.visibility='hidden'">
        <span class="mc-logrow__name">${mcEsc(it?.name || r.f)}</span>
        <button class="mc-logrow__del" data-id="${mcEsc(r.id)}" title="삭제">×</button>
      </div>`;
  }).join('') : '<p class="empty">이 날짜에 기록한 아이템이 없습니다.</p>';

  [evBox, itemBox].forEach(box => box.querySelectorAll('.mc-logrow__del').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.ev != null) mcRemoveEvent(mcState.sel, btn.dataset.ev);
      else mcRemove(mcState.sel, btn.dataset.id);
    });
  }));
  evBox.querySelectorAll('.mc-logrow__edit').forEach(btn => {
    btn.addEventListener('click', () => mcEditEvent(mcState.sel, btn.dataset.evEdit));
  });
}

/* 칸에 몇 개를 그릴지는 칸 폭에 달려 있어서(mcRenderGrid 참고), 창 크기가 바뀌면
   다시 그려야 압축 모드와 아이콘 개수가 맞는다. 리사이즈는 연속으로 들어오므로
   프레임 단위로 한 번만 처리한다. */
let mcResizeRaf = 0;
window.addEventListener('resize', () => {
  if (mcResizeRaf) return;
  mcResizeRaf = requestAnimationFrame(() => {
    mcResizeRaf = 0;
    if (document.getElementById('mcGrid')) mcRenderGrid();
  });
});
