/* ═══════════════════════════════════════════════
   숙제 트래커 — 캐릭터별 일일 숙제 체크리스트
   캐릭터는 캐릭터 목록 state.chars를 그대로 쓴다. 추가·삭제·순서·그림은 캐릭터 목록에서만 바꾸고,
   여기서는 캐릭터마다 추적할 항목과 오늘 완료만 저장한다. 2026-11-02 지수 결정.
   처음 보는 캐릭터는 항목이 모두 켜진 채로 시작한다.
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

let _dtNewActive = new Set(); // 항목 수정 창에서 지금 체크 중인 항목(저장 전 임시 상태)
let _dtEditIdx = -1;          // 항목을 고치는 캐릭터의 state.chars 순번

function _dtPad(n) { return String(n).padStart(2, '0'); }
// 한국 기준 오전 9시를 하루의 경계로 삼는다 (게임 일일 컨텐츠 리셋 시각과 동일)
function _dtTodayKey() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  if (kst.getHours() < 9) kst.setDate(kst.getDate() - 1);
  return `${kst.getFullYear()}-${_dtPad(kst.getMonth() + 1)}-${_dtPad(kst.getDate())}`;
}

// 캐릭터 목록의 캐릭터를 가리키는 키. id가 없는 예전 캐릭터는 이름으로 잡는다.
// 헥사도 id가 없으면 순번을 키로 쓰므로, 여기서 캐릭터에 id를 새로 붙이지 않는다
function _dtKey(ch) { return ch.id != null ? String(ch.id) : 'n:' + String(ch.name || '').toLowerCase(); }

/* 처음 켜 두는 항목. 별조각 상자는 월드당으로 세서 사실상 한 캐릭터만, 몬스터 파크는 월드당 두 캐릭터만 한다. 2026-11-02 지수 설명
   그래서 같은 월드 캐릭터 중 캐릭터 목록 순서로 앞의 한 캐릭터·두 캐릭터에만 켠다. 서버를 모르는 캐릭터끼리는 한 월드로 친다 */
const DT_WORLD_LIMIT = { starspeck: 1, monsterpark: 2 };
function _dtDefaultActive(ch) {
  const world = ch.fetched?.world || '';
  const rank = state.chars.filter(c => (c.fetched?.world || '') === world).indexOf(ch);
  return DAILY_TASK_PRESETS.map(t => t.id).filter(id => !(id in DT_WORLD_LIMIT) || rank < DT_WORLD_LIMIT[id]);
}

// { v: 2, items: { [캐릭터 키]: { active, date, done } } }. active는 항목 수정 창에서 직접 고른 캐릭터만 있다
function _dtLoadAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyTasks) || 'null');
    if (raw && raw.v === 2 && raw.items) return raw;
  } catch {}
  return { v: 2, wl: 1, items: {} };
}
function _dtSaveAll(all) { localStorage.setItem(STORAGE_KEYS.dailyTasks, JSON.stringify(all)); }

// 캐릭터 하나의 오늘자 상태. 저장된 날짜가 오늘(9시 기준)이 아니면 done을 비운 채로 반환 → 자동 초기화.
// 항목을 직접 고른 적이 없는 캐릭터는 _dtDefaultActive를 따른다
function _dtState(ch) {
  const rec = _dtLoadAll().items[_dtKey(ch)];
  return {
    active: rec?.active || _dtDefaultActive(ch),
    done: rec && rec.date === _dtTodayKey() ? (rec.done || []) : [],
  };
}
// active를 넘기지 않으면 직접 고른 항목이 있을 때만 그대로 둔다. 완료 체크만으로 기본 항목이 굳지 않게 한다
function _dtSaveState(ch, active, done) {
  const all = _dtLoadAll();
  const key = _dtKey(ch);
  const keep = active !== undefined ? active : all.items[key]?.active;
  all.items[key] = { ...(keep ? { active: keep } : {}), date: _dtTodayKey(), done };
  _dtSaveAll(all);
}

/* 예전 트래커는 캐릭터를 따로 등록하던 형식이다. { order, items: { id: { name, img, level, region, sex, active, date, done } } }
   지수 요청으로 캐릭터 목록에 옮기지 않고 지운다. 잠깐 남겨 두던 예전 기록 사본 _old도 같이 지운다. 2026-11-02 */
function _dtDropV1() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyTasks) || 'null'); } catch {}
  if (!(raw && raw.v === 2)) localStorage.removeItem(STORAGE_KEYS.dailyTasks);
  localStorage.removeItem(STORAGE_KEYS.dailyTasks + '_old');
  // 월드당 제한 전에는 완료 체크만 해도 6개 전부가 active로 저장됐다. 그대로 두면 제한이 안 걸리므로 한 번 지운다
  if (raw && raw.v === 2 && !raw.wl) {
    const all = DAILY_TASK_PRESETS.map(t => t.id).join();
    Object.values(raw.items || {}).forEach(r => { if (r.active && r.active.join() === all) delete r.active; });
    raw.wl = 1;
    _dtSaveAll(raw);
  }
}

// 활성 항목 클릭 → 오늘 완료(CLEAR) 토글
function _dtToggleDone(ch, taskId) {
  const { done } = _dtState(ch);
  _dtSaveState(ch, undefined, done.includes(taskId) ? done.filter(d => d !== taskId) : [...done, taskId]);
}

function _dtTileHtml(i, task, done) {
  const isDone = done.includes(task.id);
  return `
    <div class="dt-tile dt-tile--active ${isDone ? 'dt-tile--done' : ''}"
         data-ci="${i}" data-task="${task.id}" title="클릭: 오늘 완료 체크">
      <span class="dt-tile__thumb"><img class="dt-tile__img" src="${task.img}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <span class="dt-tile__emoji" style="display:none"></span></span>
      <span class="dt-tile__label">${task.label}</span>
      ${isDone ? '<span class="dt-tile__stamp">CLEAR</span>' : ''}
    </div>`;
}

// 캐릭터 그림. 랭킹 그림이 없거나 못 불러오면 캐릭터 목록과 같은 기본 캐릭터
function _dtPortraitHtml(ch, cls) {
  const def = charDefaultImg(ch);
  return `<img class="${cls}" src="${escHtml(ch.fetched?.img || def)}" alt="" onerror="this.onerror=null;this.src='${def}'" />`;
}

function _dtCardHtml(ch, i) {
  const { active, done } = _dtState(ch);
  const lv = ch.fetched?.level || ch.level;
  const activeTasks = DAILY_TASK_PRESETS.filter(t => active.includes(t.id));
  // 직업 이름·서버·직업 일러스트는 캐릭터 목록 카드와 같은 함수로 그린다
  const jn = charJobLabel(ch), headSrc = charJobHeadSrc(ch);
  const world = ch.fetched?.world || '', sIcon = world ? serverIconSrc(world) : '';
  return `
    <div class="card dt-card" data-ci="${i}">
      <div class="dt-card__head">
        <span class="dt-card__portrait">${_dtPortraitHtml(ch, 'dt-card__portrait-img')}</span>
        <span class="dt-card__whoBody">
          <span class="dt-card__name">${escHtml(ch.name)}</span>
          ${jn ? `<span class="dt-card__job">${escHtml(jn)}</span>` : ''}
          <span class="dt-card__meta">
            ${lv ? `<span class="dt-card__lv">Lv.${lv}</span>` : ''}
            ${world ? `<span class="dt-card__server">${sIcon ? `<img src="${sIcon}" alt="" onerror="this.style.display='none'" />` : ''}<span class="icon-lbl">${escHtml(worldName(world))}</span></span>` : ''}
          </span>
        </span>
        ${headSrc ? `<img class="dt-card__jobicon" src="${headSrc}" alt="" onerror="this.style.display='none'" />` : ''}
        <button class="dt-card__edit" data-ci="${i}" title="추적 항목 수정">✎</button>
      </div>
      <div class="dt-tiles">
        ${activeTasks.length
          ? activeTasks.map(t => _dtTileHtml(i, t, done)).join('')
          : '<p class="empty" style="margin:4px 0">추적할 항목이 없어요.</p>'}
      </div>
    </div>`;
}

/* ── 추적 항목 수정 창 ── */

function _dtCloseEditModal() {
  document.getElementById('dtAddOverlay')?.classList.remove('open');
  _dtEditIdx = -1;
}

function _dtOpenEditModal(i) {
  const ch = state.chars[i];
  if (!ch) return;
  let overlay = document.getElementById('dtAddOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'dtAddOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }
  _dtEditIdx = i;
  _dtNewActive = new Set(_dtState(ch).active);
  _dtRenderEditModal();
  overlay.classList.add('open');
}

function _dtRenderEditModal() {
  const overlay = document.getElementById('dtAddOverlay');
  const ch = state.chars[_dtEditIdx];
  if (!overlay || !ch) return;
  const lv = ch.fetched?.level || ch.level;
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__head">
        <span class="modal__title">추적 항목 수정</span>
        <button class="modal__close" id="dtModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="dt-step2-head">
          ${_dtPortraitHtml(ch, 'dt-step2-portrait')}
          <span class="dt-step2-namebox">
            <span class="dt-step2-name">${escHtml(ch.name)}</span>
            ${lv ? `<span class="dt-step2-lv">Lv.${lv}</span>` : ''}
          </span>
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
        <button class="sbtn sbtn--ghost" id="dtStepBack">취소</button>
        <button class="sbtn sbtn--primary" id="dtStepSave">저장</button>
      </div>
    </div>`;
  document.getElementById('dtModalClose').addEventListener('click', _dtCloseEditModal);
  document.getElementById('dtStepBack').addEventListener('click', _dtCloseEditModal);
  overlay.querySelectorAll('.dt-addform__opt').forEach(label => {
    label.addEventListener('click', e => {
      e.preventDefault();
      const id = label.dataset.preset;
      if (_dtNewActive.has(id)) _dtNewActive.delete(id); else _dtNewActive.add(id);
      _dtRenderEditModal();
    });
  });
  document.getElementById('dtStepSave').addEventListener('click', () => {
    if (_dtNewActive.size === 0) return;
    const activeIds = DAILY_TASK_PRESETS.map(t => t.id).filter(id => _dtNewActive.has(id));
    _dtSaveState(ch, activeIds, _dtState(ch).done.filter(d => activeIds.includes(d)));
    _dtCloseEditModal();
    renderDailyTasks();
  });
}

function renderDailyTasks() {
  const sec = document.getElementById('sec-dailytasks');
  if (!sec) return;
  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">숙제 트래커</h2>
    </div>
    <p class="dt-help">캐릭터별 일일·주간 숙제 체크리스트입니다.</p>
    ${state.chars.length
      ? `<div class="dt-grid">${state.chars.map((ch, i) => _dtCardHtml(ch, i)).join('')}</div>`
      : '<p class="empty">캐릭터 목록에서 캐릭터를 추가하세요.</p>'}
  `;
  sec.querySelectorAll('.dt-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const ch = state.chars[+tile.dataset.ci];
      if (!ch) return;
      _dtToggleDone(ch, tile.dataset.task);
      renderDailyTasks();
    });
  });
  sec.querySelectorAll('.dt-card__edit').forEach(btn => {
    btn.addEventListener('click', () => _dtOpenEditModal(+btn.dataset.ci));
  });
}

_dtDropV1();
// 게임 이름 표기를 바꾸면 직업 이름·서버 이름이 들어간 카드를 다시 그린다
document.addEventListener('namelang', () => { if (document.getElementById('sec-dailytasks')?.classList.contains('active')) renderDailyTasks(); });
