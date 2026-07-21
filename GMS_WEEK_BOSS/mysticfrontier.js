/* ═══════════════════════════════════════════════
   미스틱 프론티어 — 패밀리어 도감
   덱 구성/프론티어 잠재옵션/주사위 계산 로직은 아직 설계 전.
   지금은 확보한 패밀리어 192종 데이터로 검색·필터 가능한 도감만 제공.
═══════════════════════════════════════════════ */
let _mfType = '';
let _mfElement = '';
let _mfQuery = '';

const MF_TYPE_LABEL = {
  human:'휴먼', beast:'비스트', plant:'플랜트', aquatic:'아쿠아틱', fairy:'페어리',
  reptile:'렙타일', devil:'데빌', undead:'언데드', machine:'머신',
};
const MF_ELEM_LABEL = {
  fire:'화속성', poison:'독속성', light:'빛속성', ice:'냉속성', dark:'암속성', holy:'신성속성',
};

function _mfFilteredList() {
  return FAMILIAR_LIST.filter(f => {
    if (_mfType && f.type !== _mfType) return false;
    if (_mfElement && f.element !== _mfElement) return false;
    if (_mfQuery && !f.name.toLowerCase().includes(_mfQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.level - a.level);
}

function _mfRenderList() {
  const grid = document.getElementById('mfGrid');
  const count = document.getElementById('mfCount');
  if (!grid) return;
  const list = _mfFilteredList();
  if (count) count.textContent = `${list.length} / ${FAMILIAR_LIST.length}마리`;
  grid.innerHTML = list.map(f => `
    <div class="mf-card">
      <div class="mf-card__img">
        <img src="images/familiars/icons/${f.id}.png" alt="" onerror="this.style.display='none'">
      </div>
      <div class="mf-card__name">${f.name}</div>
      <div class="mf-card__meta">
        <span class="mf-card__lv">Lv.${f.level}</span>
        ${f.type ? `<img class="mf-badge" src="images/familiars/type/${f.type}.webp" title="${MF_TYPE_LABEL[f.type] || f.type}" onerror="this.style.display='none'">` : ''}
        ${f.element ? `<img class="mf-badge" src="images/familiars/elements/${f.element}.webp" title="${MF_ELEM_LABEL[f.element] || f.element}" onerror="this.style.display='none'">` : ''}
      </div>
    </div>`).join('') || '<p class="mf-empty">조건에 맞는 패밀리어가 없습니다.</p>';
}

function renderMysticFrontier() {
  const sec = document.getElementById('sec-mysticfrontier');
  if (!sec) return;
  if (sec.querySelector('.mf-layout')) { _mfRenderList(); return; }

  const typeOpts = Object.keys(MF_TYPE_LABEL).map(t => `<option value="${t}">${MF_TYPE_LABEL[t]}</option>`).join('');
  const elemOpts = Object.keys(MF_ELEM_LABEL).map(e => `<option value="${e}">${MF_ELEM_LABEL[e]}</option>`).join('');

  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">미스틱 프론티어 — 패밀리어 도감</h2>
    </div>
    <p class="mf-notice">덱 구성/프론티어 잠재옵션/주사위 계산 기능은 준비 중입니다. 지금은 패밀리어 검색·조회만 가능합니다.</p>
    <div class="mf-filters">
      <input class="inp" id="mfSearch" placeholder="이름 검색 (영문)" autocomplete="off" />
      <select class="sel" id="mfTypeSel"><option value="">전체 타입</option>${typeOpts}</select>
      <select class="sel" id="mfElemSel"><option value="">전체 속성</option>${elemOpts}</select>
      <span class="mf-count" id="mfCount"></span>
    </div>
    <div class="mf-layout">
      <div class="mf-grid" id="mfGrid"></div>
    </div>
  `;

  document.getElementById('mfSearch').addEventListener('input', e => { _mfQuery = e.target.value.trim(); _mfRenderList(); });
  document.getElementById('mfTypeSel').addEventListener('change', e => { _mfType = e.target.value; _mfRenderList(); });
  document.getElementById('mfElemSel').addEventListener('change', e => { _mfElement = e.target.value; _mfRenderList(); });

  _mfRenderList();
}
