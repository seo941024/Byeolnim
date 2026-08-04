/* ═══════════════════════════════════════════════
   숙제 트래커 — 캐릭터별 일일 숙제 체크리스트
   위쪽 "캐릭터 추가" 폼에서 이름을 직접 입력하고 추적할 항목을 미리 골라야
   카드가 생긴다 (전체 캐릭터 목록에서 자동으로 뽑아오지 않음). 카드에는
   그때 고른 항목만 표시된다.
═══════════════════════════════════════════════ */

const DAILY_TASK_PRESETS = [
  { id: 'gollux',      label: '골럭스',        emoji: '🐍', img: 'images/dailytasks/gollux.png' },
  { id: 'akaium',      label: '아카이럼',      emoji: '🤖', img: 'images/dailytasks/akaium.png' },
  { id: 'dailyquest',  label: '일일퀘스트',    emoji: '📜', img: 'images/dailytasks/dailyquest.webp' },
  { id: 'monsterpark', label: '몬스터 파크',   emoji: '🌲', img: 'images/dailytasks/monsterpark.png' },
  { id: 'haste',       label: '헤이스트 부스터', emoji: '⚡', img: 'images/dailytasks/haste.webp' },
];

let _dtNewActive = new Set(); // 캐릭터 추가 모달에서 지금 체크 중인 항목(제출 전 임시 상태)

function _dtPad(n) { return String(n).padStart(2, '0'); }
// 한국 기준 오전 9시를 하루의 경계로 삼는다 (게임 일일 컨텐츠 리셋 시각과 동일)
function _dtTodayKey() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  if (kst.getHours() < 9) kst.setDate(kst.getDate() - 1);
  return `${kst.getFullYear()}-${_dtPad(kst.getMonth() + 1)}-${_dtPad(kst.getDate())}`;
}

function _dtLoadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyTasks) || '{}'); }
  catch { return {}; }
}
function _dtSaveAll(all) { localStorage.setItem(STORAGE_KEYS.dailyTasks, JSON.stringify(all)); }

// 트래커 캐릭터 하나의 오늘자 상태. 저장된 날짜가 오늘(9시 기준)이 아니면 done을 비운 채로 반환 → 자동 초기화.
function _dtGetChar(charId) {
  const all = _dtLoadAll();
  const rec = all[charId];
  if (!rec) return null;
  const today = _dtTodayKey();
  return { name: rec.name, active: rec.active || [], done: rec.date === today ? (rec.done || []) : [] };
}
function _dtSaveChar(charId, name, active, done) {
  const all = _dtLoadAll();
  all[charId] = { name, active, date: _dtTodayKey(), done };
  _dtSaveAll(all);
}
function _dtDeleteChar(charId) {
  const all = _dtLoadAll();
  delete all[charId];
  _dtSaveAll(all);
}

function _dtCreateChar(name, activeIds) {
  const all = _dtLoadAll();
  const id = String(Date.now());
  all[id] = { name, active: activeIds, date: _dtTodayKey(), done: [] };
  _dtSaveAll(all);
}

// 비활성 항목 클릭 → 이 캐릭터의 추적 목록에 추가(활성화)
function _dtActivate(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec || rec.active.includes(taskId)) return;
  _dtSaveChar(charId, rec.name, [...rec.active, taskId], rec.done);
}
// 활성 항목의 × 클릭 → 추적 목록에서 제거(오늘 완료 표시도 같이 사라짐)
function _dtDeactivate(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  _dtSaveChar(charId, rec.name, rec.active.filter(a => a !== taskId), rec.done.filter(d => d !== taskId));
}
// 활성 항목 클릭 → 오늘 완료(CLEAR) 토글
function _dtToggleDone(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  const i = rec.done.indexOf(taskId);
  const newDone = i === -1 ? [...rec.done, taskId] : rec.done.filter(d => d !== taskId);
  _dtSaveChar(charId, rec.name, rec.active, newDone);
}

const DT_DEFAULT_PORTRAIT = 'images/dailytasks/default.png';
// 캐릭터 목록(state.chars)에 같은 이름이 있으면 그 캐릭터의 초상화를 가져다 쓰고, 없으면 기본 이미지를 쓴다.
function _dtPortraitFor(name) {
  try {
    const ch = (typeof state !== 'undefined' ? state.chars : []).find(c => c.name === name);
    return ch?.fetched?.img || DT_DEFAULT_PORTRAIT;
  } catch { return DT_DEFAULT_PORTRAIT; }
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
  const { name, active, done } = rec;
  const portraitSrc = _dtPortraitFor(name);
  const portraitHtml = portraitSrc
    ? `<img class="dt-card__portrait-img" src="${portraitSrc}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-card__portrait-no" style="display:none">NO IMG</span>`
    : `<span class="dt-card__portrait-no">NO IMG</span>`;
  const activeTasks = DAILY_TASK_PRESETS.filter(t => active.includes(t.id));
  return `
    <div class="card dt-card">
      <div class="dt-card__head">
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

function _dtRenderAddModalBody() {
  const body = document.getElementById('dtModalBody');
  if (!body) return;
  body.innerHTML = `
    <div class="field">
      <label class="field__label">캐릭터명</label>
      <input class="inp" id="dtNewName" type="text" placeholder="캐릭터 이름" maxlength="20" autocomplete="off" />
    </div>
    <div class="field" style="margin-top:12px">
      <label class="field__label">추적할 항목</label>
      <div class="dt-addform__presets">
        ${DAILY_TASK_PRESETS.map(t => `
          <label class="dt-addform__opt ${_dtNewActive.has(t.id) ? 'dt-addform__opt--checked' : ''}" data-preset="${t.id}">
            <input type="checkbox" data-preset-cb="${t.id}" ${_dtNewActive.has(t.id) ? 'checked' : ''} />
            <span>${t.label}</span>
          </label>`).join('')}
      </div>
    </div>`;
  body.querySelectorAll('.dt-addform__opt').forEach(label => {
    label.addEventListener('click', e => {
      e.preventDefault();
      const id = label.dataset.preset;
      if (_dtNewActive.has(id)) _dtNewActive.delete(id); else _dtNewActive.add(id);
      _dtRenderAddModalBody();
    });
  });
}

function _dtCloseAddModal() {
  const overlay = document.getElementById('dtAddOverlay');
  if (overlay) overlay.classList.remove('open');
  _dtNewActive = new Set();
}

function _dtOpenAddModal() {
  let overlay = document.getElementById('dtAddOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dtAddOverlay';
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__head">
          <span class="modal__title">캐릭터 추가</span>
          <button class="modal__close" id="dtModalClose">×</button>
        </div>
        <div class="modal__body" id="dtModalBody"></div>
        <div class="modal__foot">
          <button class="sbtn sbtn--ghost" id="dtModalCancel">취소</button>
          <button class="sbtn sbtn--primary" id="dtModalSave">저장</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) _dtCloseAddModal(); });
    document.getElementById('dtModalClose').addEventListener('click', _dtCloseAddModal);
    document.getElementById('dtModalCancel').addEventListener('click', _dtCloseAddModal);
    document.getElementById('dtModalSave').addEventListener('click', () => {
      const nameInp = document.getElementById('dtNewName');
      const name = nameInp.value.trim();
      if (!name || _dtNewActive.size === 0) { nameInp.focus(); return; }
      _dtCreateChar(name, DAILY_TASK_PRESETS.map(t => t.id).filter(id => _dtNewActive.has(id)));
      _dtCloseAddModal();
      renderDailyTasks();
    });
  }
  _dtRenderAddModalBody();
  overlay.classList.add('open');
  document.getElementById('dtNewName').value = '';
}

function renderDailyTasks() {
  const sec = document.getElementById('sec-dailytasks');
  if (!sec) return;
  const all = _dtLoadAll();
  const ids = Object.keys(all);

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

  // 카드
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
