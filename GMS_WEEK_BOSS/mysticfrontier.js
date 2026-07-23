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

/* ─── 덱 구성 ───
   슬롯 하나 = { familiarId, potentialId }. 패밀리어 카드가 곧 잠재옵션을 갖고 있으므로
   덱을 짤 때 패밀리어와 잠재옵션을 같이 지정해두면, 주사위 계산기에서 그 덱을
   그대로 불러써서 다시 고를 필요가 없다. */
function _mfLoadDecks() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.mfDecks) || '[]');
    return [0, 1, 2].map(i => {
      const d = Array.isArray(s[i]) ? s[i] : [null, null, null];
      return [0, 1, 2].map(j => {
        const v = d[j];
        if (!v) return null;
        // 구버전: 슬롯이 패밀리어 id 문자열 하나였음 → 이전
        if (typeof v === 'string') return { familiarId: v, potentialId: null };
        return { familiarId: v.familiarId ?? null, potentialId: v.potentialId ?? null };
      });
    });
  } catch { return [[null, null, null], [null, null, null], [null, null, null]]; }
}
function _mfSaveDecks() { localStorage.setItem(STORAGE_KEYS.mfDecks, JSON.stringify(_mfDecks)); }

let _mfDecks = _mfLoadDecks();

function _mfDeckSummary(deck) {
  const fams = deck.map(s => s?.familiarId ? _mfFamiliarById(s.familiarId) : null).filter(Boolean);
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
  const slot = _mfDecks[deckIdx][slotIdx];
  const f = slot?.familiarId ? _mfFamiliarById(slot.familiarId) : null;
  if (!f) {
    return `<div class="mf-slot mf-slot--empty" data-deck="${deckIdx}" data-slot="${slotIdx}">
      <span class="mf-slot__plus">+</span><span class="mf-slot__label">패밀리어 선택</span>
    </div>`;
  }
  const potential = slot.potentialId ? _mfPotentialById(slot.potentialId) : null;
  const potHtml = potential
    ? `<div class="mf-slot__pot mf-slot__pot--set" data-deck="${deckIdx}" data-slot="${slotIdx}">
         <span class="mf-rarity-badge mf-rarity--${potential.rarity}">${MF_RARITY_KO[potential.rarity]}</span>
         <span class="mf-slot__cond">${potential.ko}</span>
         <span class="mf-slot__bonus">${_mfBonusText(potential)}</span>
       </div>`
    : `<div class="mf-slot__pot mf-slot__pot--unset" data-deck="${deckIdx}" data-slot="${slotIdx}">+ 잠재옵션 설정</div>`;
  return `<div class="mf-slot mf-slot--filled mf-slot--withpot" data-deck="${deckIdx}" data-slot="${slotIdx}">
    <button class="mf-slot__remove" data-deck-remove="${deckIdx}" data-slot-remove="${slotIdx}" title="제거">×</button>
    <div class="mf-slot__fam" data-fam-deck="${deckIdx}" data-fam-slot="${slotIdx}">${_mfCardHtml(f)}</div>
    ${potHtml}
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
    el.addEventListener('click', () => _mfOpenFamiliarPicker(+el.dataset.deck, +el.dataset.slot));
  });
  wrap.querySelectorAll('.mf-slot__fam').forEach(el => {
    el.addEventListener('click', () => _mfOpenFamiliarPicker(+el.dataset.famDeck, +el.dataset.famSlot));
  });
  wrap.querySelectorAll('.mf-slot__pot').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      _mfOpenPotentialPicker(pot => {
        _mfDecks[+el.dataset.deck][+el.dataset.slot].potentialId = pot.id;
        _mfSaveDecks(); _mfRenderDecks();
      });
    });
  });
  wrap.querySelectorAll('.mf-slot__remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _mfDecks[+btn.dataset.deckRemove][+btn.dataset.slotRemove] = null;
      _mfSaveDecks(); _mfRenderDecks();
    });
  });
}

function _mfOpenFamiliarPicker(deckIdx, slotIdx) {
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
  const usedInDeck = new Set(_mfDecks[_mfPickerDeckIdx].map(s => s?.familiarId).filter(Boolean));
  const curId = _mfDecks[_mfPickerDeckIdx][_mfPickerSlotIdx]?.familiarId;
  const list = FAMILIAR_LIST
    .filter(f => !query || f.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.level - a.level);
  grid.innerHTML = list.map(f => {
    const disabled = usedInDeck.has(f.id) && curId !== f.id;
    return `<div class="mf-card mf-card--pick ${disabled ? 'mf-card--disabled' : ''}" data-id="${f.id}">${_mfCardHtml(f)}</div>`;
  }).join('') || '<p class="mf-empty">검색 결과가 없습니다.</p>';

  grid.querySelectorAll('.mf-card--pick:not(.mf-card--disabled)').forEach(el => {
    el.addEventListener('click', () => {
      // 새 패밀리어를 고르면 그 카드의 잠재옵션은 다시 설정해야 하므로 초기화
      _mfDecks[_mfPickerDeckIdx][_mfPickerSlotIdx] = { familiarId: el.dataset.id, potentialId: null };
      _mfSaveDecks(); _mfRenderDecks(); _mfClosePicker();
    });
  });
}

/* ─── 주사위 계산기 ─── */
const MF_RARITY_KO = { common:'커먼', rare:'레어', epic:'에픽', unique:'유니크', legendary:'레전더리' };
const MF_RARITY_ORDER = ['legendary', 'unique', 'epic', 'rare', 'common'];

function _mfPotentialById(id) { return FRONTIER_POTENTIALS.find(p => p.id === id) || null; }
function _mfRollerById(id) { return FRONTIER_DICE_ROLLERS.find(r => r.id === id) || null; }

function _mfLoadRoller() {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.mfRoller);
    return id ? _mfRollerById(id) : null;
  } catch { return null; }
}
function _mfSaveRoller() {
  try {
    if (_mfDiceRoller) localStorage.setItem(STORAGE_KEYS.mfRoller, _mfDiceRoller.id);
    else localStorage.removeItem(STORAGE_KEYS.mfRoller);
  } catch {}
}

let _mfDiceRoller = _mfLoadRoller(); // 선택한 다이스 롤러(최대 1) — 덱과 마찬가지로 저장됨
let _mfDiceLastRoll = null;  // { d1,d2,d3 }

/* 잠재옵션의 조건(cond, 원문 영문)이 실제로 충족됐는지 판정.
   maplehub.app 실제 배포 코드(se 함수)를 그대로 이식 — 속성/타입 조건은
   "그 옵션을 가진 패밀리어"가 아니라 "덱에 편성된 3마리 전체"를 기준으로 판정하고,
   주사위 조건은 실제로 굴린 값을 기준으로 판정한다. 즉 조건부 잠재옵션은
   해당 굴림에서 조건이 안 맞으면 보너스가 아예 붙지 않는다.
   ※ "주사위 중 하나가 N", "세 주사위가 모두 N" 두 조건은 원본 코드에도
      분기가 없어(선택해도 항상 미발동) 문구 그대로의 의미로 직접 구현했다. */
function _mfConditionMet(p, familiars, d1, d2, d3) {
  const cond = p.cond;
  if (cond === 'None') return true;
  if (familiars.length < 3) return false; // 덱이 3마리 다 안 채워졌으면 편성 조건 자체가 성립 불가
  const o = cond.toLowerCase();

  if (o.includes('elemental familiar is on your active lineup')) {
    const target = p.element;
    return familiars.some(f => (target === 'non-elemental' ? f.element === null : f.element === target));
  }
  if (o.includes('type familiar is on your active lineup')) {
    return familiars.some(f => f.type === p.type);
  }
  if (o.includes('all familiars on your active lineup have the same element')) {
    const els = familiars.map(f => f.element);
    return els.every(e => e === els[0]);
  }
  if (o.includes('all familiars on your active lineup have the same type')) {
    const ts = familiars.map(f => f.type);
    return ts.every(t => t === ts[0]);
  }
  if (o.includes('all familiars on your active lineup have a different element')) {
    return new Set(familiars.map(f => f.element)).size === 3;
  }
  if (o.includes('all familiars on your active lineup have a different type')) {
    return new Set(familiars.map(f => f.type)).size === 3;
  }
  if (o.includes('first die rolls an odd number')) return d1 % 2 !== 0;
  if (o.includes('second die rolls an odd number')) return d2 % 2 !== 0;
  if (o.includes('third die rolls an odd number')) return d3 % 2 !== 0;
  if (o.includes('first die rolls an even number')) return d1 % 2 === 0;
  if (o.includes('second die rolls an even number')) return d2 % 2 === 0;
  if (o.includes('third die rolls an even number')) return d3 % 2 === 0;
  if (o.includes('three dice roll consecutive numbers')) {
    const s = [d1, d2, d3].sort((a, b) => a - b);
    return s[1] === s[0] + 1 && s[2] === s[1] + 1;
  }
  if (o.includes('first and second dice match')) return d1 === d2;
  if (o.includes('first and third dice match')) return d1 === d3;
  if (o.includes('second and third dice match')) return d2 === d3;

  let m = o.match(/(first and second|first and third|second and third) dice add up to (\d+) or more/);
  if (m) {
    const th = parseInt(m[2], 10);
    if (m[1] === 'first and second') return d1 >= th && d2 >= th;
    if (m[1] === 'first and third') return d1 >= th && d3 >= th;
    return d2 >= th && d3 >= th;
  }
  m = o.match(/all three dice add up to (\d+) or more/);
  if (m) { const th = parseInt(m[1], 10); return d1 >= th && d2 >= th && d3 >= th; }
  m = o.match(/prevents dice from rolling over (\d+)/);
  if (m) { const th = parseInt(m[1], 10); return d1 <= th && d2 <= th && d3 <= th; }
  m = o.match(/all three dice roll a (\d+)/);
  if (m) { const v = parseInt(m[1], 10); return d1 === v && d2 === v && d3 === v; }
  m = o.match(/if a die rolls a (\d+)/);
  if (m) { const v = parseInt(m[1], 10); return d1 === v || d2 === v || d3 === v; }
  return false;
}

function _mfBonusText(item) {
  const parts = [];
  if (item.dice) parts.push(`주사위 ${item.dice > 0 ? '+' : ''}${item.dice}`);
  if (item.mult) parts.push(`배수 +${item.mult}x`);
  return parts.join(', ') || '효과 없음';
}

// 목표치 이상 달성 확률 + 가능한 최소/최대치: 3주사위(1~6) 216가지 전수 조사
// (조건부 잠재옵션이 섞여 있으면 총합이 굴림값에 따라 들쭉날쭉해져서 1,1,1/6,6,6이
//  더 이상 최소/최대를 보장하지 않으므로 216가지를 전부 계산해서 직접 구한다)
function _mfDiceStats(target, deck) {
  let hit = 0, total = 0, min = Infinity, max = -Infinity;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
    total++;
    const t = _mfComputeDiceForDeck(a, b, c, deck).total;
    if (t >= target) hit++;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return { chance: hit / total, min, max };
}

// 주사위 계산기는 독립된 옵션 슬롯이 아니라 "덱 구성"에서 만든 덱을 그대로 사용한다.
let _mfDiceSelectedDeck = 0; // 0|1|2

function _mfDeckPreviewHtml() {
  const deck = _mfDecks[_mfDiceSelectedDeck];
  return deck.map((slot, i) => {
    const f = slot?.familiarId ? _mfFamiliarById(slot.familiarId) : null;
    if (!f) return `<div class="mf-slot mf-slot--empty mf-slot--readonly"><span class="mf-slot__label">패밀리어 ${i + 1} 미지정</span></div>`;
    const potential = slot.potentialId ? _mfPotentialById(slot.potentialId) : null;
    return `<div class="mf-slot mf-slot--filled mf-slot--withpot mf-slot--readonly">
      <div class="mf-slot__fam">${_mfCardHtml(f)}</div>
      ${potential
        ? `<div class="mf-slot__pot mf-slot__pot--set">
             <span class="mf-rarity-badge mf-rarity--${potential.rarity}">${MF_RARITY_KO[potential.rarity]}</span>
             <span class="mf-slot__cond">${potential.ko}</span>
             <span class="mf-slot__bonus">${_mfBonusText(potential)}</span>
           </div>`
        : `<div class="mf-slot__pot mf-slot__pot--unset">잠재옵션 미설정</div>`}
    </div>`;
  }).join('');
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
    <span class="mf-roller-dot mf-roller-dot--${r.color}"></span>
    <div class="mf-slot__body">
      <div class="mf-slot__cond">${r.name}</div>
      <div class="mf-slot__bonus">${_mfBonusText(r)}</div>
    </div>
  </div>`;
}

// 굴린 주사위(d1,d2,d3) 기준으로 덱에 편성된 잠재옵션 중 조건이 실제로 충족된 것만 합산.
// 롤러는 조건 없이 항상 적용됨. triggered에는 각 잠재옵션의 발동 여부를 같이 담아 UI에 표시한다.
function _mfComputeDiceForDeck(d1, d2, d3, deck) {
  const familiars = deck.map(s => s?.familiarId ? _mfFamiliarById(s.familiarId) : null).filter(Boolean);
  const rawSum = d1 + d2 + d3;
  let diceBonus = 0, multSum = 0;
  const triggered = [];
  deck.forEach(s => {
    if (!s?.potentialId) return;
    const p = _mfPotentialById(s.potentialId);
    if (!p) return;
    const met = _mfConditionMet(p, familiars, d1, d2, d3);
    if (met) { diceBonus += p.dice; multSum += p.mult; }
    triggered.push({ potential: p, met });
  });
  if (_mfDiceRoller) { diceBonus += _mfDiceRoller.dice; multSum += _mfDiceRoller.mult; }
  const bonusMultiplier = multSum > 0 ? multSum : 1;
  const total = Math.floor((rawSum + diceBonus) * bonusMultiplier + 1e-9);
  return { rawSum, diceBonus, bonusMultiplier, total, triggered };
}
function _mfComputeDice(d1, d2, d3) { return _mfComputeDiceForDeck(d1, d2, d3, _mfDecks[_mfDiceSelectedDeck]); }

function _mfRenderDiceResult() {
  const el = document.getElementById('mfDiceResult');
  if (!el) return;
  const deck = _mfDecks[_mfDiceSelectedDeck];
  const target = Math.max(3, Math.min(60, parseInt(document.getElementById('mfDiceTarget')?.value) || 15));
  const roll = _mfDiceLastRoll || { d1: 1, d2: 1, d3: 1 };
  const r = _mfComputeDiceForDeck(roll.d1, roll.d2, roll.d3, deck);
  const stats = _mfDiceStats(target, deck);

  const triggerHtml = r.triggered.length ? `
    <div class="mf-dice-trigger-list">
      ${r.triggered.map(t => `
        <div class="mf-dice-trigger ${t.met ? 'mf-dice-trigger--hit' : 'mf-dice-trigger--miss'}">
          <span class="mf-dice-trigger__mark">${t.met ? '✓' : '✗'}</span>
          <span class="mf-dice-trigger__cond">${t.potential.ko}</span>
          <span class="mf-dice-trigger__bonus">${_mfBonusText(t.potential)}</span>
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = `
    ${_mfDiceLastRoll ? `
      <div class="mf-dice-rolled">
        <span class="mf-die">${roll.d1}</span><span class="mf-die">${roll.d2}</span><span class="mf-die">${roll.d3}</span>
        <span class="mf-dice-eq">→ ${r.total}</span>
      </div>
      <div class="mf-dice-breakdown">
        (${roll.d1}+${roll.d2}+${roll.d3}${r.diceBonus ? (r.diceBonus > 0 ? `+${r.diceBonus}` : r.diceBonus) : ''}) × ${r.bonusMultiplier}배 = ${r.total}
      </div>
      ${triggerHtml}` : '<p class="mf-notice" style="margin-bottom:0">주사위를 굴려보세요.</p>'}
    <div class="mf-dice-divider"></div>
    <div class="mf-dice-chance">
      <span>목표 ${target} 이상 달성 확률</span>
      <b>${(stats.chance * 100).toFixed(1)}%</b>
    </div>
    <div class="lib-progress" style="margin-top:6px"><div class="lib-progress__fill" style="width:${(stats.chance*100).toFixed(1)}%"></div></div>
    <div class="mf-dice-range">가능 범위: ${stats.min} ~ ${stats.max}</div>`;
}

function _mfRollDice() {
  _mfDiceLastRoll = { d1: 1 + Math.floor(Math.random()*6), d2: 1 + Math.floor(Math.random()*6), d3: 1 + Math.floor(Math.random()*6) };
  _mfRenderDiceResult();
}

function _mfRenderDiceTab() {
  const wrap = document.getElementById('mfDiceWrap');
  if (!wrap) return;
  const deckOpts = [0, 1, 2].map(i => `<option value="${i}" ${_mfDiceSelectedDeck===i?'selected':''}>덱 ${i+1}</option>`).join('');
  wrap.innerHTML = `
    <div class="card mf-dice-config">
      <div class="field" style="margin-bottom:10px">
        <label class="field__label">사용할 덱</label>
        <select class="sel" id="mfDiceDeckSel">${deckOpts}</select>
      </div>
      <div class="card__title">덱 구성 (편성된 패밀리어·잠재옵션)</div>
      <div class="mf-deck-slots">${_mfDeckPreviewHtml()}</div>
      <p class="mf-notice" style="margin-top:8px">패밀리어·잠재옵션은 <b>덱 구성</b> 탭에서 수정하세요.</p>
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

  document.getElementById('mfDiceDeckSel').addEventListener('change', e => {
    _mfDiceSelectedDeck = +e.target.value;
    _mfDiceLastRoll = null;
    _mfRenderDiceTab();
  });
  wrap.querySelectorAll('[data-dice-slot="roller"]').forEach(el => {
    if (el.classList.contains('mf-slot--empty')) {
      el.addEventListener('click', () => _mfOpenRollerPicker(r => { _mfDiceRoller = r; _mfSaveRoller(); _mfRenderDiceTab(); }));
    }
  });
  wrap.querySelectorAll('[data-dice-remove="roller"]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); _mfDiceRoller = null; _mfSaveRoller(); _mfRenderDiceTab(); });
  });
  document.getElementById('mfRollBtn').addEventListener('click', _mfRollDice);
  document.getElementById('mfDiceTarget').addEventListener('input', _mfRenderDiceResult);
  _mfRenderDiceResult();
}

/* 잠재옵션/롤러 선택 모달 — 콜백 기반이라 덱 구성(슬롯별 잠재옵션)과
   주사위 계산기(롤러)에서 공용으로 쓴다. */
function _mfOpenPotentialPicker(onSelect) {
  _mfOpenSelectPicker({
    title: '잠재옵션 선택',
    rarityFilter: true,
    getRows: (query, rarity) => {
      let rows = FRONTIER_POTENTIALS.filter(p => {
        if (rarity && p.rarity !== rarity) return false;
        if (!query) return true;
        return p.ko.toLowerCase().includes(query)
          || String(p.dice).includes(query)
          || String(p.mult).includes(query)
          || MF_RARITY_KO[p.rarity].includes(query);
      });
      rows.sort((a, b) => (Math.abs(b.dice) + b.mult * 10) - (Math.abs(a.dice) + a.mult * 10));
      return rows;
    },
    rowHtml: p => `
      <span class="mf-rarity-badge mf-rarity--${p.rarity}">${MF_RARITY_KO[p.rarity]}</span>
      <span class="mf-potential-row__cond">${p.ko}</span>
      <span class="mf-potential-row__bonus">${_mfBonusText(p)}</span>`,
    onSelect,
  });
}
function _mfOpenRollerPicker(onSelect) {
  _mfOpenSelectPicker({
    title: '다이스 롤러 선택',
    rarityFilter: false,
    getRows: query => FRONTIER_DICE_ROLLERS.filter(r => !query || r.name.includes(query) || r.ko.toLowerCase().includes(query) || r.id.includes(query)),
    rowHtml: r => `
      <span class="mf-roller-dot mf-roller-dot--${r.color}"></span>
      <span class="mf-potential-row__cond">${r.name}</span>
      <span class="mf-potential-row__bonus">${_mfBonusText(r)}</span>`,
    onSelect,
  });
}
function _mfOpenSelectPicker({ title, rarityFilter, getRows, rowHtml, onSelect }) {
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
        <span class="modal__title">${title}</span>
        <button class="modal__close" id="mfDicePickerClose">×</button>
      </div>
      <div class="modal__body">
        <div class="mf-filters" style="margin-bottom:10px">
          <input class="inp" id="mfDicePickerSearch" placeholder="조건 검색 (예: 화속성, +12, 배수)" autocomplete="off" />
          ${rarityFilter ? `<select class="sel" id="mfDicePickerRarity" style="width:110px"><option value="">전체 등급</option>${rarityOpts}</select>` : ''}
        </div>
        <div id="mfDicePickerList" class="mf-potential-list"></div>
      </div>
    </div>`;

  const renderList = () => {
    const listEl = document.getElementById('mfDicePickerList');
    const query = (document.getElementById('mfDicePickerSearch')?.value || '').trim().toLowerCase();
    const rarity = document.getElementById('mfDicePickerRarity')?.value || '';
    let rows = getRows(query, rarity);
    const shown = rows.slice(0, 150);
    listEl.innerHTML = (shown.map(item => `<div class="mf-potential-row" data-id="${item.id}">${rowHtml(item)}</div>`).join('')
      || '<p class="mf-empty">검색 결과가 없습니다.</p>')
      + (rows.length > shown.length ? `<p class="mf-empty">외 ${rows.length - shown.length}개 더 있음 — 검색어를 더 입력해 좁혀보세요.</p>` : '');
    listEl.querySelectorAll('.mf-potential-row').forEach(el => {
      el.addEventListener('click', () => {
        const item = rows.find(r => r.id === el.dataset.id);
        overlay.style.display = 'none';
        onSelect(item);
      });
    });
  };
  document.getElementById('mfDicePickerClose').addEventListener('click', () => { overlay.style.display = 'none'; });
  document.getElementById('mfDicePickerSearch').addEventListener('input', renderList);
  document.getElementById('mfDicePickerRarity')?.addEventListener('change', renderList);
  overlay.style.display = 'flex';
  renderList();
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
