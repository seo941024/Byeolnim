/* ═══════════════════════════════════════════════
   숙제 트래커 — 캐릭터별 일일 숙제 체크리스트
   불러온 캐릭터 목록 전부에 대해 자동으로 트래커 카드를 만들고,
   정해진 항목(골럭스/아카이럼/일일퀘스트/몬스터 파크/헤이스트 부스터) 중
   그 캐릭터가 실제로 하는 것만 활성화해서 매일 체크한다.
═══════════════════════════════════════════════ */

const DAILY_TASK_PRESETS = [
  { id: 'gollux',      label: '골럭스',        emoji: '🐍', img: 'images/dailytasks/gollux.png' },
  { id: 'akaium',      label: '아카이럼',      emoji: '🤖', img: 'images/dailytasks/akaium.png' },
  { id: 'dailyquest',  label: '일일퀘스트',    emoji: '📜', img: 'images/dailytasks/dailyquest.webp' },
  { id: 'monsterpark', label: '몬스터 파크',   emoji: '🌲', img: 'images/dailytasks/monsterpark.png' },
  { id: 'haste',       label: '헤이스트 부스터', emoji: '⚡', img: 'images/dailytasks/haste.webp' },
];

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

// 캐릭터 하나의 오늘자 상태. 저장된 날짜가 오늘(9시 기준)이 아니면 done을 비운 채로 반환 → 자동 초기화.
function _dtGetChar(charId) {
  const all = _dtLoadAll();
  const rec = all[charId] || { active: [], date: '', done: [] };
  const today = _dtTodayKey();
  return { active: rec.active || [], done: rec.date === today ? (rec.done || []) : [] };
}
function _dtSaveChar(charId, active, done) {
  const all = _dtLoadAll();
  all[charId] = { active, date: _dtTodayKey(), done };
  _dtSaveAll(all);
}

// 비활성 항목 클릭 → 이 캐릭터의 추적 목록에 추가(활성화)
function _dtActivate(charId, taskId) {
  const { active, done } = _dtGetChar(charId);
  if (active.includes(taskId)) return;
  _dtSaveChar(charId, [...active, taskId], done);
}
// 활성 항목의 × 클릭 → 추적 목록에서 제거(오늘 완료 표시도 같이 사라짐)
function _dtDeactivate(charId, taskId) {
  const { active, done } = _dtGetChar(charId);
  _dtSaveChar(charId, active.filter(a => a !== taskId), done.filter(d => d !== taskId));
}
// 활성 항목 클릭 → 오늘 완료(CLEAR) 토글
function _dtToggleDone(charId, taskId) {
  const { active, done } = _dtGetChar(charId);
  const i = done.indexOf(taskId);
  const newDone = i === -1 ? [...done, taskId] : done.filter(d => d !== taskId);
  _dtSaveChar(charId, active, newDone);
}

function _dtTileHtml(charId, task, active, done) {
  const isActive = active.includes(task.id);
  const isDone = isActive && done.includes(task.id);
  const thumbHtml = task.img
    ? `<img class="dt-tile__img" src="${task.img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-tile__emoji" style="display:none">${task.emoji}</span>`
    : `<span class="dt-tile__emoji">${task.emoji}</span>`;
  return `
    <div class="dt-tile ${isActive ? 'dt-tile--active' : 'dt-tile--inactive'} ${isDone ? 'dt-tile--done' : ''}"
         data-char="${charId}" data-task="${task.id}" title="${isActive ? '클릭: 오늘 완료 체크' : '클릭: 이 캐릭터에서 추적 시작'}">
      <span class="dt-tile__thumb">${thumbHtml}</span>
      <span class="dt-tile__label">${task.label}</span>
      ${isDone ? '<span class="dt-tile__stamp">CLEAR</span>' : ''}
      ${isActive ? `<button class="dt-tile__x" data-deact-char="${charId}" data-deact-task="${task.id}" title="추적 해제">×</button>` : ''}
    </div>`;
}

function _dtCardHtml(ch) {
  const { active, done } = _dtGetChar(ch.id);
  const doneCount = active.filter(a => done.includes(a)).length;
  const portraitHtml = ch.fetched?.img
    ? `<img class="dt-card__portrait-img" src="${ch.fetched.img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-card__portrait-no" style="display:none">NO IMG</span>`
    : `<span class="dt-card__portrait-no">NO IMG</span>`;
  return `
    <div class="card dt-card">
      <div class="dt-card__head">
        <span class="dt-card__portrait">${portraitHtml}</span>
        <span class="dt-card__name">${ch.name}</span>
        <span class="dt-card__count">${doneCount} / ${active.length}</span>
      </div>
      <div class="dt-tiles">
        ${DAILY_TASK_PRESETS.map(t => _dtTileHtml(ch.id, t, active, done)).join('')}
      </div>
    </div>`;
}

function renderDailyTasks() {
  const sec = document.getElementById('sec-dailytasks');
  if (!sec) return;
  const chars = (typeof state !== 'undefined' ? state.chars : []) || [];

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">숙제 트래커</h2>
      <span class="dt-reset-notice">매일 오전 9시(KST) 기준으로 체크가 자동 초기화돼요</span>
    </div>
    <p class="dt-help">회색 항목을 클릭하면 그 캐릭터에서 추적을 시작해요. 활성화된 항목을 클릭하면 완료(CLEAR) 체크가 됩니다.</p>
    ${chars.length
      ? `<div class="dt-grid">${chars.map(ch => _dtCardHtml(ch)).join('')}</div>`
      : '<p class="mf-empty">캐릭터를 먼저 추가하세요.</p>'}
  `;

  sec.querySelectorAll('.dt-tile').forEach(tile => {
    tile.addEventListener('click', e => {
      if (e.target.closest('.dt-tile__x')) return; // × 클릭은 별도 핸들러에서 처리
      const { char, task } = tile.dataset;
      if (tile.classList.contains('dt-tile--active')) _dtToggleDone(char, task);
      else _dtActivate(char, task);
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
}
