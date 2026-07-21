/* ═══════════════════════════════════════════════
   미스틱 프론티어 — 패밀리어 도감 + 덱 구성 + 주사위 계산기
   잠재옵션/주사위 계산식은 maplehub.app 실제 배포 코드에서 추출한
   확정 데이터(data_frontier_potentials.js) 기준으로 구현.
   공식: totalDice = floor((주사위1+2+3 + 선택한 옵션들의 dice 합)
                            × (선택한 옵션들의 mult 합, 0이면 1) + 1e-9)
═══════════════════════════════════════════════ */
let _mfType = '';
let _mfElement = '';
let _mfQuery = '';
let _mfActiveTab = 'dex'; // 'dex' | 'deck' | 'dice'
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

/* ─── 주사위 계산기 ─── */
const MF_RARITY_KO = { common:'커먼', rare:'레어', epic:'에픽', unique:'유니크', legendary:'레전더리' };
const MF_RARITY_ORDER = ['legendary', 'unique', 'epic', 'rare', 'common'];

let _mfDicePotentials = [null, null, null]; // 선택한 잠재옵션(최대 3, 패밀리어 슬롯당 1개)
let _mfDiceRoller = null;                    // 선택한 다이스 롤러(최대 1)
let _mfDicePickerSlot = null;                // 'p0' | 'p1' | 'p2' | 'roller'
let _mfDiceLastRoll = null;                  // { d1,d2,d3 }

function _mfPotentialById(id) { return FRONTIER_POTENTIALS.find(p => p.id === id) || null; }
function _mfRollerById(id) { return FRONTIER_DICE_ROLLERS.find(r => r.id === id) || null; }

function _mfBonusText(item) {
  const parts = [];
  if (item.dice) parts.push(`주사위 ${item.dice > 0 ? '+' : ''}${item.dice}`);
  if (item.mult) parts.push(`배수 +${item.mult}x`);
  return parts.join(', ') || '효과 없음';
}

function _mfComputeDice(d1, d2, d3) {
  const rawSum = d1 + d2 + d3;
  let diceBonus = 0, multSum = 0;
  _mfDicePotentials.forEach(p => { if (p) { diceBonus += p.dice; multSum += p.mult; } });
  if (_mfDiceRoller) { diceBonus += _mfDiceRoller.dice; multSum += _mfDiceRoller.mult; }
  const bonusMultiplier = multSum > 0 ? multSum : 1;
  const total = Math.floor((rawSum + diceBonus) * bonusMultiplier + 1e-9);
  return { rawSum, diceBonus, bonusMultiplier, total };
}

// 목표치 이상 달성 확률: 3주사위(1~6) 216가지 전수 조사
function _mfSuccessChance(target) {
  let hit = 0, total = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
    total++;
    if (_mfComputeDice(a, b, c).total >= target) hit++;
  }
  return hit / total;
}

function _mfDiceSlotHtml(idx) {
  const p = _mfDicePotentials[idx];
  if (!p) {
    return `<div class="mf-slot mf-slot--empty" data-dice-slot="p${idx}">
      <span class="mf-slot__plus">+</span><span class="mf-slot__label">패밀리어 ${idx + 1} 잠재옵션</span>
    </div>`;
  }
  return `<div class="mf-slot mf-slot--filled mf-slot--potential" data-dice-slot="p${idx}">
    <button class="mf-slot__remove" data-dice-remove="p${idx}" title="제거">×</button>
    <span class="mf-rarity-badge mf-rarity--${p.rarity}">${MF_RARITY_KO[p.rarity]}</span>
    <div class="mf-slot__body">
      <div class="mf-slot__cond">${p.ko}</div>
      <div class="mf-slot__bonus">${_mfBonusText(p)}</div>
    </div>
  </div>`;
}
function _mfRollerSlotHtml() {
  const r = _mfDiceRoller;
  if (!r) {
    return `<div class="mf-slot mf-slot--empty" data-dice-slot="roller">
      <span class="mf-slot__plus">+</span><span class="mf-slot__label">다이스 롤러 (선택)</span>
    </div>`;
  }
  return `<div class="mf-slot mf-slot--filled mf-slot--potential" data-dice-slot="roller">
    <button class="mf-slot__remove" data-dice-remove="roller" title="제거">×</button>
    <span class="mf-roller-dot mf-roller-dot--${(r.id.match(/gray|blue|purple|orange|green/)||[''])[0]}"></span>
    <div class="mf-slot__body">
      <div class="mf-slot__cond">${r.id.replace(/_/g, ' ')}</div>
      <div class="mf-slot__bonus">${_mfBonusText(r)}</div>
    </div>
  </div>`;
}

function _mfRenderDiceResult() {
  const el = document.getElementById('mfDiceResult');
  if (!el) return;
  const target = Math.max(3, Math.min(60, parseInt(document.getElementById('mfDiceTarget')?.value) || 15));
  const roll = _mfDiceLastRoll || { d1: 1, d2: 1, d3: 1 };
  const r = _mfComputeDice(roll.d1, roll.d2, roll.d3);
  const chance = _mfSuccessChance(target);

  el.innerHTML = `
    ${_mfDiceLastRoll ? `
      <div class="mf-dice-rolled">
        <span class="mf-die">${roll.d1}</span><span class="mf-die">${roll.d2}</span><span class="mf-die">${roll.d3}</span>
        <span class="mf-dice-eq">→ ${r.total}</span>
      </div>
      <div class="mf-dice-breakdown">
        (${roll.d1}+${roll.d2}+${roll.d3}${r.diceBonus ? (r.diceBonus > 0 ? `+${r.diceBonus}` : r.diceBonus) : ''}) × ${r.bonusMultiplier}배 = ${r.total}
      </div>` : '<p class="mf-notice" style="margin-bottom:0">주사위를 굴려보세요.</p>'}
    <div class="mf-dice-divider"></div>
    <div class="mf-dice-chance">
      <span>목표 ${target} 이상 달성 확률</span>
      <b>${(chance * 100).toFixed(1)}%</b>
    </div>
    <div class="lib-progress" style="margin-top:6px"><div class="lib-progress__fill" style="width:${(chance*100).toFixed(1)}%"></div></div>
    <div class="mf-dice-range">가능 범위: ${_mfComputeDice(1,1,1).total} ~ ${_mfComputeDice(6,6,6).total}</div>`;
}

function _mfRollDice() {
  _mfDiceLastRoll = { d1: 1 + Math.floor(Math.random()*6), d2: 1 + Math.floor(Math.random()*6), d3: 1 + Math.floor(Math.random()*6) };
  _mfRenderDiceResult();
}

function _mfRenderDiceTab() {
  const wrap = document.getElementById('mfDiceWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="card mf-dice-config">
      <div class="card__title">잠재옵션 선택 (패밀리어별 1개)</div>
      <div class="mf-deck-slots">
        ${[0, 1, 2].map(i => _mfDiceSlotHtml(i)).join('')}
      </div>
      <div class="card__title" style="margin-top:14px">다이스 롤러 (선택)</div>
      <div class="mf-deck-slots">${_mfRollerSlotHtml()}</div>
      <button class="sbtn sbtn--primary w100" id="mfRollBtn" style="margin-top:14px">🎲 주사위 굴리기</button>
    </div>
    <div class="card mf-dice-result-card">
      <div class="card__title">결과</div>
      <div class="field" style="margin:10px 0">
        <label class="field__label">목표 수치</label>
        <input class="inp" id="mfDiceTarget" type="number" value="15" min="3" max="60" />
      </div>
      <div id="mfDiceResult"></div>
    </div>`;

  wrap.querySelectorAll('[data-dice-slot]').forEach(el => {
    if (el.classList.contains('mf-slot--empty')) {
      el.addEventListener('click', () => _mfOpenDicePicker(el.dataset.diceSlot));
    }
  });
  wrap.querySelectorAll('[data-dice-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const slot = btn.dataset.diceRemove;
      if (slot === 'roller') _mfDiceRoller = null;
      else _mfDicePotentials[+slot.slice(1)] = null;
      _mfRenderDiceTab();
    });
  });
  document.getElementById('mfRollBtn').addEventListener('click', _mfRollDice);
  document.getElementById('mfDiceTarget').addEventListener('input', _mfRenderDiceResult);
  _mfRenderDiceResult();
}

function _mfOpenDicePicker(slot) {
  _mfDicePickerSlot = slot;
  const isRoller = slot === 'roller';
  let overlay = document.getElementById('mfDicePickerOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mfDicePickerOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
  }
  const rarityOpts = MF_RARITY_ORDER.map(r => `<option value="${r}">${MF_RARITY_KO[r]}</option>`).join('');
  overlay.innerHTML = `
    <div class="modal" style="width:min(680px,95vw)">
      <div class="modal__head">
        <span class="modal__title">${isRoller ? '다이스 롤러 선택' : '잠재옵션 선택'}</span>
        <button class="modal__close" id="mfDicePickerClose">×</button>
      </div>
      <div class="modal__body">
        <div class="mf-filters" style="margin-bottom:10px">
          <input class="inp" id="mfDicePickerSearch" placeholder="조건 검색 (예: 화속성, +12, 배수)" autocomplete="off" />
          ${isRoller ? '' : `<select class="sel" id="mfDicePickerRarity" style="width:110px"><option value="">전체 등급</option>${rarityOpts}</select>`}
        </div>
        <div id="mfDicePickerList" class="mf-potential-list"></div>
      </div>
    </div>`;
  document.getElementById('mfDicePickerClose').addEventListener('click', () => { overlay.style.display = 'none'; });
  document.getElementById('mfDicePickerSearch').addEventListener('input', () => _mfRenderDicePickerList(isRoller));
  document.getElementById('mfDicePickerRarity')?.addEventListener('change', () => _mfRenderDicePickerList(isRoller));
  overlay.style.display = 'flex';
  _mfRenderDicePickerList(isRoller);
}

function _mfRenderDicePickerList(isRoller) {
  const listEl = document.getElementById('mfDicePickerList');
  if (!listEl) return;
  const query = (document.getElementById('mfDicePickerSearch')?.value || '').trim().toLowerCase();
  const rarity = document.getElementById('mfDicePickerRarity')?.value || '';

  if (isRoller) {
    const rows = FRONTIER_DICE_ROLLERS.filter(r => !query || r.ko.toLowerCase().includes(query) || r.id.includes(query));
    listEl.innerHTML = rows.map(r => `
      <div class="mf-potential-row" data-roller="${r.id}">
        <span class="mf-roller-dot mf-roller-dot--${(r.id.match(/gray|blue|purple|orange|green/)||[''])[0]}"></span>
        <span class="mf-potential-row__cond">${r.ko}</span>
      </div>`).join('') || '<p class="mf-empty">검색 결과가 없습니다.</p>';
    listEl.querySelectorAll('.mf-potential-row').forEach(el => {
      el.addEventListener('click', () => {
        _mfDiceRoller = _mfRollerById(el.dataset.roller);
        document.getElementById('mfDicePickerOverlay').style.display = 'none';
        _mfRenderDiceTab();
      });
    });
    return;
  }

  let rows = FRONTIER_POTENTIALS.filter(p => {
    if (rarity && p.rarity !== rarity) return false;
    if (!query) return true;
    return p.ko.toLowerCase().includes(query)
      || String(p.dice).includes(query)
      || String(p.mult).includes(query)
      || MF_RARITY_KO[p.rarity].includes(query);
  });
  // 조건 미입력 시 너무 많으므로 임팩트(수치) 큰 순으로 상위만 노출
  rows = rows.sort((a, b) => (Math.abs(b.dice) + b.mult * 10) - (Math.abs(a.dice) + a.mult * 10));
  const shown = rows.slice(0, 150);

  listEl.innerHTML = (shown.map(p => `
    <div class="mf-potential-row" data-potential="${p.id}">
      <span class="mf-rarity-badge mf-rarity--${p.rarity}">${MF_RARITY_KO[p.rarity]}</span>
      <span class="mf-potential-row__cond">${p.ko}</span>
      <span class="mf-potential-row__bonus">${_mfBonusText(p)}</span>
    </div>`).join('') || '<p class="mf-empty">검색 결과가 없습니다.</p>')
    + (rows.length > shown.length ? `<p class="mf-empty">외 ${rows.length - shown.length}개 더 있음 — 검색어를 더 입력해 좁혀보세요.</p>` : '');

  listEl.querySelectorAll('.mf-potential-row[data-potential]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = +_mfDicePickerSlot.slice(1);
      _mfDicePotentials[idx] = _mfPotentialById(el.dataset.potential);
      document.getElementById('mfDicePickerOverlay').style.display = 'none';
      _mfRenderDiceTab();
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
  const dicePanel = document.getElementById('mfPanelDice');
  if (dexPanel)  dexPanel.style.display  = tab === 'dex'  ? '' : 'none';
  if (deckPanel) deckPanel.style.display = tab === 'deck' ? '' : 'none';
  if (dicePanel) dicePanel.style.display = tab === 'dice' ? '' : 'none';
  if (tab === 'deck') _mfRenderDecks();
  if (tab === 'dice') _mfRenderDiceTab();
}

function renderMysticFrontier() {
  const sec = document.getElementById('sec-mysticfrontier');
  if (!sec) return;
  if (sec.querySelector('.mf-tabs')) {
    _mfRenderList(); _mfRenderDecks();
    if (_mfActiveTab === 'dice') _mfRenderDiceTab();
    return;
  }

  const typeOpts = Object.keys(MF_TYPE_LABEL).map(t => `<option value="${t}">${MF_TYPE_LABEL[t]}</option>`).join('');
  const elemOpts = Object.keys(MF_ELEM_LABEL).map(e => `<option value="${e}">${MF_ELEM_LABEL[e]}</option>`).join('');

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">미스틱 프론티어</h2>
    </div>
    <div class="lib-tabs mf-tabs">
      <button class="lib-tab active" data-mftab="dex">패밀리어 도감</button>
      <button class="lib-tab" data-mftab="deck">덱 구성</button>
      <button class="lib-tab" data-mftab="dice">주사위 계산기</button>
    </div>

    <div id="mfPanelDex">
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

    <div id="mfPanelDice" style="display:none">
      <p class="mf-notice">패밀리어별 잠재옵션(최대 3개)과 다이스 롤러를 선택하면 주사위 결과·목표 달성 확률을 계산합니다.</p>
      <div class="mf-dice-wrap" id="mfDiceWrap"></div>
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
