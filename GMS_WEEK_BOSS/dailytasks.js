/* ═══════════════════════════════════════════════
   숙제 트래커 — 캐릭터별 일일 숙제 체크리스트
   캐릭터 추가는 2단계 모달로 진행한다:
   1단계) GMS 랭킹 조회(캐릭터 추가 시트와 동일) 또는 직접 입력(챌린저스 등
          랭킹에 안 잡히는 캐릭터용 폴백) 중 하나로 이름·이미지를 정한다.
   2단계) 추적할 항목(골럭스/아카이럼/일일퀘스트/몬스터 파크/헤이스트)을
          고른다. 이름 입력칸이 없는 화면이라 체크할 때마다 값이 날아가는 일이 없다.
═══════════════════════════════════════════════ */

/* 항목 그림은 모두 GMS v.270 게임 그림이다. 2026-10-31 픽셀 대조
   - 골럭스·아카이럼: 보스 체력바 그림. UI/UIWindow2.img/MobGage/backgrnd 테두리 35×37의 위아래 한 줄씩을 뺀 35×35 위 x6·y5에
     MobGage/Mob/9390600·8860000 아이콘을 얹어 합쳤다. 테두리는 체력바 왼쪽 끝 조각이라 통째로 쓰면 위아래 선이 옆으로 뻗어
     양옆이 잘린 것처럼 보여서, 인게임 캡처와 같은 35×35를 지수가 골랐다. 얹는 좌표는 게임 데이터에 없어 캡처와 맞췄다.
     회색 테두리 바깥의 반투명 흰 테두리와 모서리 점은 지수 요청으로 투명하게 지웠다. 보스 정보 메뉴 아이콘도 같다
   - 일일퀘스트: 1714001 Grand Sacred Symbol: Geardock icon, 몬스터 파크: Map/MapHelper.img/mark/MonsterPark
   - 헤이스트: 2831711 Haste Fever Time Booster iconRaw, 별조각 상자: 2830545 Mysterious Star Speck Box iconRaw
   같은 파일 이름으로 그림을 바꿀 때는 서비스 워커가 옛 그림을 내주지 않게 v를 올린다 */
const DAILY_TASK_PRESETS = [
  { id: 'gollux',      label: '골럭스',        img: 'images/dailytasks/gollux.png?v=20261031d' },
  { id: 'akaium',      label: '아카이럼',      img: 'images/dailytasks/akaium.png?v=20261031d' },
  { id: 'dailyquest',  label: '일일퀘스트',    img: 'images/dailytasks/dailyquest.png' },
  { id: 'monsterpark', label: '몬스터 파크',   img: 'images/dailytasks/monsterpark.png' },
  { id: 'haste',       label: '헤이스트',      img: 'images/dailytasks/haste.png' },
  { id: 'starspeck',   label: '별조각 상자',   img: 'images/icons/Use_Mysterious_Star_Speck_Box.png' },
];
const DT_DEFAULT_PORTRAIT = 'images/dailytasks/default.png';

let _dtStep = 1;              // 1=이름 정하기(조회/직접입력), 2=항목 선택
let _dtPendingName = '';
let _dtPendingImg = null;
let _dtPendingLevel = null;   // GMS 랭킹 조회로 정한 경우만 채워짐(직접 입력은 레벨을 모른다)
let _dtPendingRegion = null;  // GMS 랭킹 조회로 정한 경우만 채워짐 → 자동 최신화에 사용
let _dtNewActive = new Set(); // 2단계에서 지금 체크 중인 항목(제출 전 임시 상태)
let _dtEditCharId = null;     // null이면 신규 추가, 값이 있으면 그 캐릭터의 항목 수정 모드

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
  return { name: rec.name, img: rec.img || null, level: rec.level || null, active: rec.active || [], region: rec.region || null, done: rec.date === today ? (rec.done || []) : [] };
}
function _dtSaveChar(charId, name, img, active, done, region, syncedAt, level) {
  const all = _dtLoadAll();
  const prev = all.items[charId] || {};
  all.items[charId] = {
    name, img, active, date: _dtTodayKey(), done,
    region: region !== undefined ? region : prev.region,
    syncedAt: syncedAt !== undefined ? syncedAt : prev.syncedAt,
    level: level !== undefined ? level : prev.level,
  };
  _dtSaveAll(all);
}
function _dtDeleteChar(charId) {
  const all = _dtLoadAll();
  delete all.items[charId];
  all.order = all.order.filter(id => id !== charId);
  _dtSaveAll(all);
}
function _dtCreateChar(name, img, activeIds, region, level) {
  const all = _dtLoadAll();
  const id = String(Date.now());
  all.items[id] = {
    name, img, active: activeIds, date: _dtTodayKey(), done: [],
    region: region || null, syncedAt: region ? Date.now() : null,
    level: level || null,
  };
  all.order.push(id);
  _dtSaveAll(all);
}

// 이 기능이 생기기 전에 등록된 캐릭터는 region이 없어 영영 갱신 대상이 되지 못한다.
// 이미지가 있으면(=기본 이미지가 아니면) 랭킹 조회로 등록됐던 것으로 보고, 현재
// 선택된 지역을 region으로 채워 넣어 갱신 대상에 포함시킨다.
function _dtBackfillRegion() {
  const all = _dtLoadAll();
  const region = state.region;
  let changed = false;
  Object.values(all.items).forEach(rec => {
    if (rec.img && !rec.region) { rec.region = region; rec.syncedAt = 0; changed = true; }
  });
  if (changed) _dtSaveAll(all);
}

// 캐릭터 목록과 동일하게, GMS 랭킹 조회로 등록한 캐릭터는 이미지/레벨이 등록 시점에
// 고정되어 갱신되지 않는다. 앱 진입 시 마지막 갱신이 REFRESH_INTERVAL 이상 지난
// 캐릭터만 조용히 재조회한다. 실패해도 기존 값을 유지하며 사용자에게 알리지 않는다.
async function dtRefreshStaleChars() {
  _dtBackfillRegion();
  const all = _dtLoadAll();
  const now = Date.now();
  const staleIds = Object.keys(all.items).filter(id => {
    const rec = all.items[id];
    if (!rec.region) return false;
    // 레벨을 저장하기 전에 등록된 캐릭터는 방금 동기화됐어도 level이 아예 없다 —
    // 그런 경우는 다음 6시간을 기다리지 않고 한 번은 무조건 다시 불러온다.
    if (rec.level == null) return true;
    return now - (rec.syncedAt || 0) > REFRESH_INTERVAL;
  });
  if (!staleIds.length) return;

  // 캐릭터마다 /api/lookup이 넥슨 API를 2개씩 부르므로, 전부 한 번에 Promise.all로
  // 쏘면 캐릭터 수 x2만큼 동시 요청이 나간다(크롤 스크립트도 이 API는 15개로
  // 묶어서 부름 — 그거랑 똑같이 5개씩 나눠서 보낸다).
  const CONCURRENCY = 5;
  const results = [];
  for (let i = 0; i < staleIds.length; i += CONCURRENCY) {
    const batch = staleIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(async id => {
      const rec = all.items[id];
      try {
        const r = await fetch(`/api/lookup?name=${encodeURIComponent(rec.name)}&reboot=0&region=${rec.region}`);
        const j = await r.json();
        if (!j.ok || !j.data) return null;
        return { id, img: j.data.img || rec.img, level: j.data.level || rec.level };
      } catch { return null; /* 네트워크 실패 → 다음 진입 때 재시도 */ }
    }));
    results.push(...batchResults);
  }

  const updates = results.filter(Boolean);
  if (!updates.length) return;
  // 요청이 오가는 동안 사용자가 오늘 완료 체크 등을 눌러서 localStorage가 바뀌었을 수
  // 있으므로, 캡처해둔 all을 그대로 덮어쓰지 않고 지금 시점의 최신 값을 다시 읽어서
  // 이미지/동기화 시각만 얹는다.
  const fresh = _dtLoadAll();
  updates.forEach(({ id, img, level }) => {
    if (!fresh.items[id]) return;
    fresh.items[id].img = img;
    fresh.items[id].level = level;
    fresh.items[id].syncedAt = now;
  });
  _dtSaveAll(fresh);
  const sec = document.getElementById('sec-dailytasks');
  if (sec && sec.classList.contains('active')) renderDailyTasks();
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

// 활성 항목 클릭 → 오늘 완료(CLEAR) 토글
function _dtToggleDone(charId, taskId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  const i = rec.done.indexOf(taskId);
  const newDone = i === -1 ? [...rec.done, taskId] : rec.done.filter(d => d !== taskId);
  _dtSaveChar(charId, rec.name, rec.img, rec.active, newDone);
}

function _dtTileHtml(charId, task, done) {
  const isDone = done.includes(task.id);
  return `
    <div class="dt-tile dt-tile--active ${isDone ? 'dt-tile--done' : ''}"
         data-char="${charId}" data-task="${task.id}" title="클릭: 오늘 완료 체크">
      <span class="dt-tile__thumb"><img class="dt-tile__img" src="${task.img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-tile__emoji" style="display:none"></span></span>
      <span class="dt-tile__label">${task.label}</span>
      ${isDone ? '<span class="dt-tile__stamp">CLEAR</span>' : ''}
    </div>`;
}

function _dtCardHtml(charId, rec) {
  const { name, img, level, active, done } = rec;
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
        <span class="dt-card__whoBody">
          <span class="dt-card__name">${name}</span>
          ${level ? `<span class="dt-card__lv">Lv.${level}</span>` : ''}
        </span>
        <button class="dt-card__edit" data-edit-char="${charId}" title="캐릭터 정보·추적 항목 수정">✎</button>
        <button class="dt-card__del" data-del-char="${charId}" title="캐릭터 삭제">×</button>
      </div>
      <div class="dt-tiles">
        ${activeTasks.length
          ? activeTasks.map(t => _dtTileHtml(charId, t, done)).join('')
          : '<p class="empty" style="margin:4px 0">추적할 항목이 없어요.</p>'}
      </div>
    </div>`;
}

/* ── 캐릭터 추가 모달 (2단계) ── */

function _dtResetPending() {
  _dtStep = 1;
  _dtPendingName = '';
  _dtPendingImg = null;
  _dtPendingLevel = null;
  _dtPendingRegion = null;
  _dtNewActive = new Set();
  _dtEditCharId = null;
}

function _dtCloseAddModal() {
  document.getElementById('dtAddOverlay')?.classList.remove('open');
  _dtResetPending();
}

function _dtEnsureOverlay() {
  let overlay = document.getElementById('dtAddOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dtAddOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  return overlay;
}

function _dtOpenAddModal() {
  const overlay = _dtEnsureOverlay();
  _dtResetPending();
  _dtRenderAddModal();
  overlay.classList.add('open');
}

// 기존 캐릭터의 추적 항목만 다시 고르는 모드 (이름/이미지는 그대로, 1단계 건너뜀)
function _dtOpenEditModal(charId) {
  const rec = _dtGetChar(charId);
  if (!rec) return;
  const overlay = _dtEnsureOverlay();
  _dtStep = 2;
  _dtPendingName = rec.name;
  _dtPendingImg = rec.img;
  _dtPendingLevel = rec.level;
  _dtPendingRegion = rec.region;
  _dtNewActive = new Set(rec.active);
  _dtEditCharId = charId;
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
  const editing = !!_dtEditCharId;
  return `
    <div class="modal">
      <div class="modal__head">
        <span class="modal__title">${editing ? '캐릭터 정보 수정' : '캐릭터 추가'}</span>
        <button class="modal__close" id="dtModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="lookup-box">
          <div class="lookup-box__title">검색으로 데이터 불러오기</div>
          <div class="lookup-box__row">
            <input class="inp" id="dtLkName" placeholder="캐릭터명을 입력하세요." autocomplete="off" />
            <button class="sbtn sbtn--primary" id="dtLkBtn">조회</button>
          </div>
        </div>
        <div class="lookup-box__result" id="dtLkResult"></div>

        <div class="char-manual-sep">직접 입력</div>
        <div class="field">
          <label class="field__label">캐릭터명</label>
          <input class="inp" id="dtManualName" placeholder="캐릭터명" autocomplete="off"
                 value="${_dtPendingRegion ? '' : escHtml(_dtPendingName)}" />
        </div>
        <div class="field">
          <label class="field__label">레벨</label>
          <input class="inp" id="dtManualLevel" type="number" min="1" max="300" placeholder="예: 275"
                 value="${_dtPendingRegion ? '' : (_dtPendingLevel || '')}" />
        </div>
        <p style="font-size:.75rem;color:var(--text-sub);margin-top:8px">※ 챌린저스 등 랭킹 조회에 안 잡히는 캐릭터는 직접 입력을 쓰세요. 기본 이미지로 등록됩니다. 레벨은 비워두면 표시하지 않습니다.</p>
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
      const region = state.region;
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
        _dtPendingLevel = j.data.level || null;
        _dtPendingRegion = region;
        _dtStep = 2;
        _dtRenderAddModal();
      });
    } catch {
      box.innerHTML = '<span class="lk-err">조회 실패 — serve.js 서버가 실행 중인지 확인하세요.</span>';
    }
  });
  document.getElementById('dtManualBtn').addEventListener('click', () => {
    const nameInp = document.getElementById('dtManualName');
    const name = nameInp.value.trim();
    if (!name) { nameInp.focus(); return; }
    const lvRaw = parseInt(document.getElementById('dtManualLevel')?.value, 10);
    _dtPendingName = name;
    // 수정 중이면 기존 이미지를 그대로 둔다 — 직접 입력으로 고쳤다고 그림까지 날릴 이유가 없다.
    if (!_dtEditCharId) _dtPendingImg = null;
    _dtPendingLevel = Number.isFinite(lvRaw) && lvRaw > 0 ? lvRaw : null;
    _dtPendingRegion = null;
    _dtStep = 2;
    _dtRenderAddModal();
  });
}

function _dtStep2Html() {
  const editing = !!_dtEditCharId;
  return `
    <div class="modal">
      <div class="modal__head">
        <span class="modal__title">${editing ? '추적 항목 수정' : '항목 선택'}</span>
        <button class="modal__close" id="dtModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="dt-step2-head">
          <img class="dt-step2-portrait" src="${_dtPendingImg || DT_DEFAULT_PORTRAIT}" alt="" onerror="this.src='${DT_DEFAULT_PORTRAIT}'" />
          <span class="dt-step2-namebox">
            <span class="dt-step2-name">${_dtPendingName}</span>
            ${_dtPendingLevel ? `<span class="dt-step2-lv">Lv.${_dtPendingLevel}</span>` : ''}
          </span>
          <button class="sbtn sbtn--ghost sbtn--sm" id="dtEditWho">이름·레벨 수정</button>
        </div>
        <div class="dt-addform__presets">
          ${DAILY_TASK_PRESETS.map(t => `
            <label class="dt-addform__opt ${_dtNewActive.has(t.id) ? 'dt-addform__opt--checked' : ''}" data-preset="${t.id}">
              <input type="checkbox" ${_dtNewActive.has(t.id) ? 'checked' : ''} />
              <span>${t.label}</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="modal__foot">
        <button class="sbtn sbtn--ghost" id="dtStepBack">${editing ? '취소' : '이전'}</button>
        <button class="sbtn sbtn--primary" id="dtStepSave">${editing ? '저장' : '추가 완료'}</button>
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
  // 수정 중에도 1단계로 돌아가 이름·레벨을 다시 정할 수 있다. _dtEditCharId는 그대로
  // 남으므로, 거기서 다시 넘어와 저장하면 새 캐릭터가 아니라 이 캐릭터가 수정된다.
  document.getElementById('dtEditWho').addEventListener('click', () => {
    _dtStep = 1;
    _dtRenderAddModal();
  });
  document.getElementById('dtStepBack').addEventListener('click', () => {
    if (_dtEditCharId) { _dtCloseAddModal(); return; }
    _dtStep = 1;
    _dtRenderAddModal();
  });
  document.getElementById('dtStepSave').addEventListener('click', () => {
    if (_dtNewActive.size === 0) return;
    const activeIds = DAILY_TASK_PRESETS.map(t => t.id).filter(id => _dtNewActive.has(id));
    if (_dtEditCharId) {
      const rec = _dtGetChar(_dtEditCharId);
      // region이 바뀌면(랭킹으로 다시 조회) 자동 갱신 대상도 그에 맞게 바뀌어야 한다.
      _dtSaveChar(_dtEditCharId, _dtPendingName, _dtPendingImg, activeIds,
        rec.done.filter(d => activeIds.includes(d)),
        _dtPendingRegion, _dtPendingRegion ? Date.now() : null, _dtPendingLevel);
    } else {
      _dtCreateChar(_dtPendingName, _dtPendingImg, activeIds, _dtPendingRegion, _dtPendingLevel);
    }
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
    <p class="dt-help">캐릭터별 일일·주간 숙제 체크리스트입니다.</p>
    ${ids.length
      ? `<div class="dt-grid">${ids.map(id => _dtCardHtml(id, _dtGetChar(id))).join('')}</div>`
      : '<p class="empty">위에서 캐릭터를 추가하세요.</p>'}
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
    tile.addEventListener('click', () => {
      _dtToggleDone(tile.dataset.char, tile.dataset.task);
      renderDailyTasks();
    });
  });
  sec.querySelectorAll('.dt-card__del').forEach(btn => {
    btn.addEventListener('click', () => {
      _dtDeleteChar(btn.dataset.delChar);
      renderDailyTasks();
    });
  });
  sec.querySelectorAll('.dt-card__edit').forEach(btn => {
    btn.addEventListener('click', () => _dtOpenEditModal(btn.dataset.editChar));
  });
}

dtRefreshStaleChars();
