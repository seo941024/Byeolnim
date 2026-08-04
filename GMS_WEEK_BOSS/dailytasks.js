/* ═══════════════════════════════════════════════
   숙제 트래커 — 캐릭터별 일일 숙제 체크리스트
   캐릭터 추가는 2단계 모달로 진행한다:
   1단계) GMS 랭킹 조회(캐릭터 추가 시트와 동일) 또는 직접 입력(챌린저스 등
          랭킹에 안 잡히는 캐릭터용 폴백) 중 하나로 이름·이미지를 정한다.
   2단계) 추적할 항목(골럭스/아카이럼/일일퀘스트/몬스터 파크/헤이스트)을
          고른다. 이름 입력칸이 없는 화면이라 체크할 때마다 값이 날아가는 일이 없다.
═══════════════════════════════════════════════ */

const DAILY_TASK_PRESETS = [
  { id: 'gollux',      label: '골럭스',        emoji: '🐍', img: 'images/dailytasks/gollux.png' },
  { id: 'akaium',      label: '아카이럼',      emoji: '🤖', img: 'images/dailytasks/akaium.png' },
  { id: 'dailyquest',  label: '일일퀘스트',    emoji: '📜', img: 'images/dailytasks/dailyquest.png' },
  { id: 'monsterpark', label: '몬스터 파크',   emoji: '🌲', img: 'images/dailytasks/monsterpark.png' },
  { id: 'haste',       label: '헤이스트',      emoji: '⚡', img: 'images/dailytasks/haste.webp' },
];
const DT_DEFAULT_PORTRAIT = 'images/dailytasks/default.png';

let _dtStep = 1;              // 1=이름 정하기(조회/직접입력), 2=항목 선택
let _dtPendingName = '';
let _dtPendingImg = null;
let _dtNewActive = new Set(); // 2단계에서 지금 체크 중인 항목(제출 전 임시 상태)

function _dtPad(n) { return String(n).padStart(2, '0'); }
// 한국 기준 오전 9시를 하루의 경계로 삼는다 (게임 일일 컨텐츠 리셋 시각과 동일)
function _dtTodayKey() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  if (kst.getHours() < 9) kst.setDate(kst.getDate() - 1);
  return `${kst.getFullYear()}-${_dtPad(kst.getMonth() + 1)}-${_dtPad(kst.getDate())}`;
}

// { order: [charId, ...], items: { [charId]: record } } — order로 카드 배치 순서를 따로 관리(드래그 정렬용).
function _dtLoadAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyTasks) || 'null');
    if (raw && Array.isArray(raw.order) && raw.items) return raw;
    if (raw && typeof raw === 'object') return { order: Object.keys(raw), items: raw }; // 구버전(순서 없는 평면 객체) 마이그레이션
    return { order: [], items: {} };
  } catch { return { order: [], items: {} }; }
}
function _dtSaveAll(all) { localStorage.setItem(STORAGE_KEYS.dailyTasks, JSON.stringify(all)); }

// 트래커 캐릭터 하나의 오늘자 상태. 저장된 날짜가 오늘(9시 기준)이 아니면 done을 비운 채로 반환 → 자동 초기화.
function _dtGetChar(charId) {
  const rec = _dtLoadAll().items[charId];
  if (!rec) return null;
  const today = _dtTodayKey();
  return { name: rec.name, img: rec.img || null, active: rec.active || [], done: rec.date === today ? (rec.done || []) : [] };
}
function _dtSaveChar(charId, name, img, active, done) {
  const all = _dtLoadAll();
  all.items[charId] = { name, img, active, date: _dtTodayKey(), done };
  _dtSaveAll(all);
}
function _dtDeleteChar(charId) {
  const all = _dtLoadAll();
  delete all.items[charId];
  all.order = all.order.filter(id => id !== charId);
  _dtSaveAll(all);
}
function _dtCreateChar(name, img, activeIds) {
  const all = _dtLoadAll();
  const id = String(Date.now());
  all.items[id] = { name, img, active: activeIds, date: _dtTodayKey(), done: [] };
  all.order.push(id);
  _dtSaveAll(all);
}
// 드래그로 카드 순서 바꾸기: fromId를 toId 자리로 옮긴다.
function _dtReorder(fromId, toId) {
  const all = _dtLoadAll();
  const order = all.order.filter(id => id !== fromId);
  const idx = order.indexOf(toId);
  order.splice(idx < 0 ? order.length : idx, 0, fromId);
  all.order = order;
  _dtSaveAll(all);
}

// 활성 항목의 × 클릭 → 추적 목록에서 제거(오늘 완료 표시도 같이 사라짐)
function _dtDeactivate(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  _dtSaveChar(charId, rec.name, rec.img, rec.active.filter(a => a !== taskId), rec.done.filter(d => d !== taskId));
}
// 활성 항목 클릭 → 오늘 완료(CLEAR) 토글
function _dtToggleDone(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  const i = rec.done.indexOf(taskId);
  const newDone = i === -1 ? [...rec.done, taskId] : rec.done.filter(d => d !== taskId);
  _dtSaveChar(charId, rec.name, rec.img, rec.active, newDone);
}

function _dtTileHtml(charId, task, active, done) {
  const isDone = done.includes(task.id);
  const thumbHtml = task.img
    ? `<img class="dt-tile__img" src="${task.img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-tile__emoji" style="display:none">${task.emoji}</span>`
    : `<span class="dt-tile__emoji">${task.emoji}</span>`;
  return `
    <div class="dt-tile dt-tile--active ${isDone ? 'dt-tile--done' : ''}"
         data-char="${charId}" data-task="${task.id}" title="클릭: 오늘 완료 체크">
      <span class="dt-tile__thumb">${thumbHtml}</span>
      <span class="dt-tile__label">${task.label}</span>
      ${isDone ? '<span class="dt-tile__stamp">CLEAR</span>' : ''}
      <button class="dt-tile__x" data-deact-char="${charId}" data-deact-task="${task.id}" title="추적 해제">×</button>
    </div>`;
}

function _dtCardHtml(charId, rec) {
  const { name, img, active, done } = rec;
  const portraitSrc = img || DT_DEFAULT_PORTRAIT;
  const portraitHtml = `
    <img class="dt-card__portrait-img" src="${portraitSrc}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="dt-card__portrait-no" style="display:none">NO IMG</span>`;
  const activeTasks = DAILY_TASK_PRESETS.filter(t => active.includes(t.id));
  return `
    <div class="card dt-card" draggable="true" data-char-card="${charId}">
      <div class="dt-card__head">
        <span class="dt-card__drag" title="드래그해서 순서 바꾸기">⠿</span>
        <span class="dt-card__portrait">${portraitHtml}</span>
        <span class="dt-card__name">${name}</span>
        <button class="dt-card__del" data-del-char="${charId}" title="캐릭터 삭제">×</button>
      </div>
      <div class="dt-tiles">
        ${activeTasks.length
          ? activeTasks.map(t => _dtTileHtml(charId, t, active, done)).join('')
          : '<p class="mf-empty" style="margin:4px 0">추적할 항목이 없어요.</p>'}
      </div>
    </div>`;
}

/* ── 캐릭터 추가 모달 (2단계) ── */

function _dtCloseAddModal() {
  const overlay = document.getElementById('dtAddOverlay');
  if (overlay) overlay.classList.remove('open');
  _dtStep = 1;
  _dtPendingName = '';
  _dtPendingImg = null;
  _dtNewActive = new Set();
}

function _dtOpenAddModal() {
  let overlay = document.getElementById('dtAddOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dtAddOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) _dtCloseAddModal(); });
  }
  _dtStep = 1;
  _dtPendingName = '';
  _dtPendingImg = null;
  _dtNewActive = new Set();
  _dtRenderAddModal();
  overlay.classList.add('open');
}

function _dtRenderAddModal() {
  const overlay = document.getElementById('dtAddOverlay');
  if (!overlay) return;
  overlay.innerHTML = _dtStep === 1 ? _dtStep1Html() : _dtStep2Html();
  document.getElementById('dtModalClose').addEventListener('click', _dtCloseAddModal);
  if (_dtStep === 1) _dtWireStep1(); else _dtWireStep2();
}

function _dtStep1Html() {
  return `
    <div class="modal">
      <div class="modal__head">
        <span class="modal__title">캐릭터 추가 (1/2)</span>
        <button class="modal__close" id="dtModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="lookup-box">
          <div class="lookup-box__title">GMS 랭킹에서 불러오기</div>
          <div class="lookup-box__row">
            <input class="inp" id="dtLkName" placeholder="GMS 캐릭터명 (영문)" autocomplete="off" />
            <button class="sbtn sbtn--primary" id="dtLkBtn">조회</button>
          </div>
        </div>
        <div class="lookup-box__result" id="dtLkResult"></div>

        <div class="char-manual-sep">또는 직접 입력</div>
        <div class="field">
          <label class="field__label">캐릭터명</label>
          <input class="inp" id="dtManualName" placeholder="캐릭터명" autocomplete="off" />
        </div>
        <p style="font-size:.75rem;color:var(--text-sub);margin-top:8px">※ 챌린저스 등 랭킹 조회에 안 잡히는 캐릭터는 직접 입력을 쓰세요. 기본 이미지로 등록됩니다.</p>
        <button class="sbtn sbtn--ghost w100" id="dtManualBtn" style="margin-top:8px">직접 입력으로 계속</button>
      </div>
    </div>`;
}

function _dtWireStep1() {
  document.getElementById('dtLkBtn').addEventListener('click', async () => {
    const name = document.getElementById('dtLkName').value.trim();
    const box = document.getElementById('dtLkResult');
    if (!name) { box.innerHTML = '<span class="lk-err">캐릭터명을 입력하세요.</span>'; return; }
    box.innerHTML = '<span class="lk-load">조회 중...</span>';
    try {
      const region = typeof state !== 'undefined' ? state.region : 'na';
      const r = await fetch(`/api/lookup?name=${encodeURIComponent(name)}&reboot=0&region=${region}`);
      const j = await r.json();
      if (!j.ok) { box.innerHTML = `<span class="lk-err">${j.error}</span>`; return; }
      box.innerHTML = `
        <div class="lk-card">
          ${j.data.img ? `<img class="lk-card__av" src="${j.data.img}" onerror="this.style.display='none'" />` : ''}
          <div class="lk-card__info">
            <div class="lk-card__name">${j.data.name} <span class="lk-card__job">${j.data.job || ''}</span></div>
            <div class="lk-card__meta">Lv.${j.data.level} · ${j.data.region} ${j.data.world}</div>
          </div>
        </div>
        <button class="sbtn sbtn--primary w100" id="dtLkUse" style="margin-top:8px">이 캐릭터로 계속</button>`;
      document.getElementById('dtLkUse').addEventListener('click', () => {
        _dtPendingName = j.data.name;
        _dtPendingImg = j.data.img || null;
        _dtStep = 2;
        _dtRenderAddModal();
      });
    } catch (e) {
      box.innerHTML = '<span class="lk-err">조회 실패 — 서버(serve.js)가 실행 중인지 확인하세요.</span>';
    }
  });
  document.getElementById('dtManualBtn').addEventListener('click', () => {
    const nameInp = document.getElementById('dtManualName');
    const name = nameInp.value.trim();
    if (!name) { nameInp.focus(); return; }
    _dtPendingName = name;
    _dtPendingImg = null;
    _dtStep = 2;
    _dtRenderAddModal();
  });
}

function _dtStep2Html() {
  return `
    <div class="modal">
      <div class="modal__head">
        <span class="modal__title">추적할 항목 선택 (2/2)</span>
        <button class="modal__close" id="dtModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="dt-step2-name">${_dtPendingName}</div>
        <div class="dt-addform__presets">
          ${DAILY_TASK_PRESETS.map(t => `
            <label class="dt-addform__opt ${_dtNewActive.has(t.id) ? 'dt-addform__opt--checked' : ''}" data-preset="${t.id}">
              <input type="checkbox" ${_dtNewActive.has(t.id) ? 'checked' : ''} />
              <span>${t.label}</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="modal__foot">
        <button class="sbtn sbtn--ghost" id="dtStepBack">이전</button>
        <button class="sbtn sbtn--primary" id="dtStepSave">추가 완료</button>
      </div>
    </div>`;
}

function _dtWireStep2() {
  document.querySelectorAll('.dt-addform__opt').forEach(label => {
    label.addEventListener('click', e => {
      e.preventDefault();
      const id = label.dataset.preset;
      if (_dtNewActive.has(id)) _dtNewActive.delete(id); else _dtNewActive.add(id);
      _dtRenderAddModal(); // 이름 입력칸이 없는 화면이라 다시 그려도 값이 안 날아감
    });
  });
  document.getElementById('dtStepBack').addEventListener('click', () => { _dtStep = 1; _dtRenderAddModal(); });
  document.getElementById('dtStepSave').addEventListener('click', () => {
    if (_dtNewActive.size === 0) return;
    _dtCreateChar(_dtPendingName, _dtPendingImg, DAILY_TASK_PRESETS.map(t => t.id).filter(id => _dtNewActive.has(id)));
    _dtCloseAddModal();
    renderDailyTasks();
  });
}

let _dtDragId = null;

function renderDailyTasks() {
  const sec = document.getElementById('sec-dailytasks');
  if (!sec) return;
  const all = _dtLoadAll();
  const ids = all.order.filter(id => all.items[id]);

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">숙제 트래커</h2>
      <button class="sbtn sbtn--primary" id="dtToggleAdd">+ 캐릭터 추가</button>
    </div>
    ${ids.length
      ? `<div class="dt-grid">${ids.map(id => _dtCardHtml(id, _dtGetChar(id))).join('')}</div>`
      : '<p class="mf-empty">위에서 캐릭터를 추가하세요.</p>'}
  `;

  document.getElementById('dtToggleAdd').addEventListener('click', _dtOpenAddModal);

  sec.querySelectorAll('.dt-card').forEach(card => {
    card.addEventListener('dragstart', () => {
      _dtDragId = card.dataset.charCard;
      card.classList.add('dt-card--dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dt-card--dragging');
      _dtDragId = null;
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      if (!_dtDragId || _dtDragId === card.dataset.charCard) return;
      card.classList.add('dt-card--dragover');
    });
    card.addEventListener('dragleave', () => card.classList.remove('dt-card--dragover'));
    card.addEventListener('drop', e => {
      e.preventDefault();
      card.classList.remove('dt-card--dragover');
      const targetId = card.dataset.charCard;
      if (!_dtDragId || _dtDragId === targetId) return;
      _dtReorder(_dtDragId, targetId);
      renderDailyTasks();
    });
  });

  sec.querySelectorAll('.dt-tile').forEach(tile => {
    tile.addEventListener('click', e => {
      if (e.target.closest('.dt-tile__x')) return;
      _dtToggleDone(tile.dataset.char, tile.dataset.task);
      renderDailyTasks();
    });
  });
  sec.querySelectorAll('.dt-tile__x').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _dtDeactivate(btn.dataset.deactChar, btn.dataset.deactTask);
      renderDailyTasks();
    });
  });
  sec.querySelectorAll('.dt-card__del').forEach(btn => {
    btn.addEventListener('click', () => {
      _dtDeleteChar(btn.dataset.delChar);
      renderDailyTasks();
    });
  });
}
