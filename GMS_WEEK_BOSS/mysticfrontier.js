/* ═══════════════════════════════════════════════
   미스틱 프론티어 — 패밀리어 도감 + 덱 구성
   프론티어 잠재옵션/주사위 계산 로직은 정확한 스펙 확보 전까지 보류.
   (덱 3개 × 슬롯 3마리 구성은 확정 스펙: MapleStoryWiki/maplefrontier.org 확인)
═══════════════════════════════════════════════ */
let _mfType = '';
let _mfElement = '';
let _mfQuery = '';
let _mfActiveTab = 'dex'; // 'dex' | 'deck'
let _mfPickerDeckIdx = null;
let _mfPickerSlotIdx = null;

const MF_TYPE_LABEL = {
  human:'휴먼', beast:'비스트', plant:'플랜트', aquatic:'아쿠아틱', fairy:'페어리',
  reptile:'렙타일', devil:'데빌', undead:'언데드', machine:'머신',
};
const MF_ELEM_LABEL = {
  fire:'화속성', poison:'독속성', light:'빛속성', ice:'냉속성', dark:'암속성', holy:'신성속성',
};

/* ─── 도감 ─── */
function _mfFilteredList() {
  return FAMILIAR_LIST.filter(f => {
    if (_mfType && f.type !== _mfType) return false;
    if (_mfElement && f.element !== _mfElement) return false;
    if (_mfQuery && !f.name.toLowerCase().includes(_mfQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.level - a.level);
}

function _mfFamiliarById(id) { return FAMILIAR_LIST.find(f => f.id === id) || null; }

function _mfCardHtml(f) {
  return `
    <div class="mf-card__img">
      <img src="images/familiars/icons/${f.id}.png" alt="" onerror="this.style.display='none'">
    </div>
    <div class="mf-card__name">${f.name}</div>
    <div class="mf-card__meta">
      <span class="mf-card__lv">Lv.${f.level}</span>
      ${f.type ? `<img class="mf-badge" src="images/familiars/type/${f.type}.webp" title="${MF_TYPE_LABEL[f.type] || f.type}" onerror="this.style.display='none'">` : ''}
      ${f.element ? `<img class="mf-badge" src="images/familiars/elements/${f.element}.webp" title="${MF_ELEM_LABEL[f.element] || f.element}" onerror="this.style.display='none'">` : ''}
    </div>`;
}

function _mfRenderList() {
  const grid = document.getElementById('mfGrid');
  const count = document.getElementById('mfCount');
  if (!grid) return;
  const list = _mfFilteredList();
  if (count) count.textContent = `${list.length} / ${FAMILIAR_LIST.length}마리`;
  grid.innerHTML = list.map(f => `<div class="mf-card">${_mfCardHtml(f)}</div>`).join('')
    || '<p class="mf-empty">조건에 맞는 패밀리어가 없습니다.</p>';
}

/* ─── 덱 구성 ─── */
function _mfLoadDecks() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.mfDecks) || '[]');
    return [0, 1, 2].map(i => Array.isArray(s[i])
      ? [s[i][0] ?? null, s[i][1] ?? null, s[i][2] ?? null]
      : [null, null, null]);
  } catch { return [[null, null, null], [null, null, null], [null, null, null]]; }
}
function _mfSaveDecks() { localStorage.setItem(STORAGE_KEYS.mfDecks, JSON.stringify(_mfDecks)); }

let _mfDecks = _mfLoadDecks();

function _mfDeckSummary(deck) {
  const fams = deck.map(id => id ? _mfFamiliarById(id) : null).filter(Boolean);
  if (!fams.length) return '';
  const types = new Set(fams.map(f => f.type).filter(Boolean));
  const elems = new Set(fams.map(f => f.element).filter(Boolean));
  const tags = [];
  if (fams.length === 3 && types.size === 1) tags.push(`타입 통일: ${MF_TYPE_LABEL[[...types][0]]}`);
  else if (fams.length === 3 && types.size === fams.length) tags.push('타입 전부 다름');
  if (fams.length === 3 && elems.size === 1 && elems.size > 0) tags.push(`속성 통일: ${MF_ELEM_LABEL[[...elems][0]]}`);
  else if (fams.length === 3 && elems.size === fams.length && elems.size > 0) tags.push('속성 전부 다름');
  return tags.length ? `<div class="mf-deck-tags">${tags.map(t => `<span class="mf-deck-tag">${t}</span>`).join('')}</div>` : '';
}

function _mfSlotHtml(deckIdx, slotIdx) {
  const id = _mfDecks[deckIdx][slotIdx];
  const f = id ? _mfFamiliarById(id) : null;
  if (!f) {
    return `<div class="mf-slot mf-slot--empty" data-deck="${deckIdx}" data-slot="${slotIdx}">
      <span class="mf-slot__plus">+</span><span class="mf-slot__label">패밀리어 선택</span>
    </div>`;
  }
  return `<div class="mf-slot mf-slot--filled" data-deck="${deckIdx}" data-slot="${slotIdx}">
    <button class="mf-slot__remove" data-deck="${deckIdx}" data-slot="${slotIdx}" title="제거">×</button>
    ${_mfCardHtml(f)}
  </div>`;
}

function _mfRenderDecks() {
  const wrap = document.getElementById('mfDeckWrap');
  if (!wrap) return;
  wrap.innerHTML = [0, 1, 2].map(d => `
    <div class="card mf-deck-card">
      <div class="card__title">덱 ${d + 1}</div>
      <div class="mf-deck-slots">
        ${[0, 1, 2].map(s => _mfSlotHtml(d, s)).join('')}
      </div>
      ${_mfDeckSummary(_mfDecks[d])}
    </div>`).join('');

  wrap.querySelectorAll('.mf-slot--empty').forEach(el => {
    el.addEventListener('click', () => _mfOpenPicker(+el.dataset.deck, +el.dataset.slot));
  });
  wrap.querySelectorAll('.mf-slot__remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _mfDecks[+btn.dataset.deck][+btn.dataset.slot] = null;
      _mfSaveDecks(); _mfRenderDecks();
    });
  });
}

function _mfOpenPicker(deckIdx, slotIdx) {
  _mfPickerDeckIdx = deckIdx;
  _mfPickerSlotIdx = slotIdx;
  let overlay = document.getElementById('mfPickerOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mfPickerOverlay';
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="modal" style="width:min(640px,95vw)">
        <div class="modal__head">
          <span class="modal__title">패밀리어 선택</span>
          <button class="modal__close" id="mfPickerClose">×</button>
        </div>
        <div class="modal__body">
          <input class="inp" id="mfPickerSearch" placeholder="이름 검색 (영문)" autocomplete="off" style="margin-bottom:10px" />
          <div class="mf-picker-grid" id="mfPickerGrid"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('mfPickerClose').addEventListener('click', _mfClosePicker);
    overlay.addEventListener('click', e => { if (e.target === overlay) _mfClosePicker(); });
    document.getElementById('mfPickerSearch').addEventListener('input', e => _mfRenderPickerGrid(e.target.value.trim()));
  }
  overlay.style.display = 'flex';
  document.getElementById('mfPickerSearch').value = '';
  _mfRenderPickerGrid('');
}
function _mfClosePicker() {
  const overlay = document.getElementById('mfPickerOverlay');
  if (overlay) overlay.style.display = 'none';
}
function _mfRenderPickerGrid(query) {
  const grid = document.getElementById('mfPickerGrid');
  if (!grid) return;
  const usedInDeck = new Set(_mfDecks[_mfPickerDeckIdx].filter(Boolean));
  const list = FAMILIAR_LIST
    .filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.level - a.level);
  grid.innerHTML = list.map(f => {
    const disabled = usedInDeck.has(f.id) && _mfDecks[_mfPickerDeckIdx][_mfPickerSlotIdx] !== f.id;
    return `<div class="mf-card mf-card--pick ${disabled ? 'mf-card--disabled' : ''}" data-id="${f.id}">${_mfCardHtml(f)}</div>`;
  }).join('') || '<p class="mf-empty">검색 결과가 없습니다.</p>';

  grid.querySelectorAll('.mf-card--pick:not(.mf-card--disabled)').forEach(el => {
    el.addEventListener('click', () => {
      _mfDecks[_mfPickerDeckIdx][_mfPickerSlotIdx] = el.dataset.id;
      _mfSaveDecks(); _mfRenderDecks(); _mfClosePicker();
    });
  });
}

/* ─── 탭 전환 ─── */
function _mfSwitchTab(tab) {
  _mfActiveTab = tab;
  document.querySelectorAll('#sec-mysticfrontier .lib-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mftab === tab));
  const dexPanel  = document.getElementById('mfPanelDex');
  const deckPanel = document.getElementById('mfPanelDeck');
  if (dexPanel)  dexPanel.style.display  = tab === 'dex'  ? '' : 'none';
  if (deckPanel) deckPanel.style.display = tab === 'deck' ? '' : 'none';
  if (tab === 'deck') _mfRenderDecks();
}

function renderMysticFrontier() {
  const sec = document.getElementById('sec-mysticfrontier');
  if (!sec) return;
  if (sec.querySelector('.mf-tabs')) { _mfRenderList(); _mfRenderDecks(); return; }

  const typeOpts = Object.keys(MF_TYPE_LABEL).map(t => `<option value="${t}">${MF_TYPE_LABEL[t]}</option>`).join('');
  const elemOpts = Object.keys(MF_ELEM_LABEL).map(e => `<option value="${e}">${MF_ELEM_LABEL[e]}</option>`).join('');

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">미스틱 프론티어</h2>
    </div>
    <div class="lib-tabs mf-tabs">
      <button class="lib-tab active" data-mftab="dex">패밀리어 도감</button>
      <button class="lib-tab" data-mftab="deck">덱 구성</button>
    </div>

    <div id="mfPanelDex">
      <p class="mf-notice">프론티어 잠재옵션 · 원정 주사위 계산 기능은 정확한 게임 스펙 확인 후 추가 예정입니다.</p>
      <div class="mf-filters">
        <input class="inp" id="mfSearch" placeholder="이름 검색 (영문)" autocomplete="off" />
        <select class="sel" id="mfTypeSel"><option value="">전체 타입</option>${typeOpts}</select>
        <select class="sel" id="mfElemSel"><option value="">전체 속성</option>${elemOpts}</select>
        <span class="mf-count" id="mfCount"></span>
      </div>
      <div class="mf-layout">
        <div class="mf-grid" id="mfGrid"></div>
      </div>
    </div>

    <div id="mfPanelDeck" style="display:none">
      <p class="mf-notice">덱마다 패밀리어 3마리를 선택하세요. 저장은 자동으로 됩니다.</p>
      <div class="mf-deck-wrap" id="mfDeckWrap"></div>
    </div>
  `;

  sec.querySelectorAll('.mf-tabs .lib-tab').forEach(btn => {
    btn.addEventListener('click', () => _mfSwitchTab(btn.dataset.mftab));
  });

  document.getElementById('mfSearch').addEventListener('input', e => { _mfQuery = e.target.value.trim(); _mfRenderList(); });
  document.getElementById('mfTypeSel').addEventListener('change', e => { _mfType = e.target.value; _mfRenderList(); });
  document.getElementById('mfElemSel').addEventListener('change', e => { _mfElement = e.target.value; _mfRenderList(); });

  _mfRenderList();
  _mfRenderDecks();
}
