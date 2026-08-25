/* ═══════════════════════════════════════════════
   미스틱 프론티어 계산기

   출처
     구조·규칙: MapleStory Wiki "Mystic Frontier"
       https://maplestorywiki.net/w/Mystic_Frontier
     주사위 계산 순서·잠재 조건 설명: GMS 히로익 갤러리 가이드 2·3부
       https://gall.dcinside.com/mgallery/board/view?id=heroic&no=245780
       https://gall.dcinside.com/mgallery/board/view/?id=heroic&no=245946
     옵션 목록 대조: masonym.dev/familiars (게임 파일 직파싱, weight는 전부 0이라 확률 없음)

   확실한 것 — 점수 계산 순서.
     Dice Total(합계)형 옵션은 전부 더해서 주사위 합에 얹고, Final Multiplier(배율)형
     옵션은 전부 더해서 배율끼리 합친 뒤, 마지막에 그 배율을 곱한다.
       예) 주사위 5,6,1 (합 12) + 합계 옵션 +9, 배율 옵션 x2.8·x1.4가 있는 경우
           (12 + 9) × (2.8 + 1.4) = 21 × 4.2 = 88.2 → 내림 88
     배율끼리는 곱하는 게 아니라 더한 다음 마지막에 한 번만 곱한다는 게 핵심.

   불확실한 것 — 잠재 옵션이 뜰 확률.
     게임 파일 자체에 가중치가 전부 0으로 들어있어(masonym.dev 확인) 유저가 구할 수 있는 자료가
     없다. 그래서 이 계산기는 "이미 뜬 옵션의 수치를 카드에 직접 입력하면 점수를 계산"하는
     용도로만 쓴다 — 확률 시뮬레이션은 자료가 생기기 전까지 만들지 않는다.
═══════════════════════════════════════════════ */

const FRONTIER_ELEMENTS = ['불', '독', '번개', '얼음', '암흑', '신성', '무속성'];
const FRONTIER_TYPES = ['사람', '야수', '식물', '수생', '요정', '파충류', '악마', '언데드', '기계'];

/* 패밀리어 3마리, 각자 속성/타입 + 프론티어 전용 잠재 2줄(일반 잠재와 같은 2줄 구조) */
let _frTeam = [0, 1, 2].map(() => ({
  element: '', type: '',
  lines: [{ kind: '', val: '' }, { kind: '', val: '' }],
}));

function _frBuildSelect(id, list, cur, placeholder) {
  return `<select class="sel fr-cond-sel" id="${id}">
    <option value="">${placeholder}</option>
    ${list.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${v}</option>`).join('')}
  </select>`;
}

/* 팀 전체 옵션 줄을 모아 더한다 — 합계형은 다 더해서 주사위 합에, 배율형은 다 더해서
   마지막에 한 번만 곱한다(사용자 확인 계산식). 배율형이 하나도 없으면 곱셈 효과 없음 = ×1. */
function _frAggregate() {
  let addSum = 0, multSum = 0, multCount = 0;
  _frTeam.forEach(f => f.lines.forEach(l => {
    const v = parseFloat(l.val);
    if (!l.kind || isNaN(v)) return;
    if (l.kind === 'add') addSum += v;
    else { multSum += v; multCount++; }
  }));
  return { addSum, mult: multCount ? multSum : 1 };
}

function _frCalcAndRender() {
  const dice = ['frDice1', 'frDice2', 'frDice3'].map(id => parseInt(document.getElementById(id)?.value) || 0);
  const diceSum = dice.reduce((a, b) => a + b, 0);
  const { addSum, mult } = _frAggregate();
  const raw = (diceSum + addSum) * mult;
  const score = Math.floor(raw);

  const fmt = n => (Number.isInteger(n) ? n : n.toFixed(1));
  document.getElementById('frResultScore').textContent = score.toLocaleString();
  document.getElementById('frResultFormula').textContent =
    `(${diceSum} + ${fmt(addSum)}) × ${fmt(mult)} = ${fmt(raw)} → 내림 ${score.toLocaleString()}`;

  const target = parseInt(document.getElementById('frTarget')?.value);
  const passEl = document.getElementById('frPass');
  if (!isNaN(target) && target > 0) {
    const pass = score >= target;
    passEl.textContent = pass ? `목표 ${target.toLocaleString()} 달성 ✅` : `목표 ${target.toLocaleString()} 부족 (${(target - score).toLocaleString()} 모자람)`;
    passEl.className = 'fr-pass' + (pass ? ' ok' : ' no');
  } else {
    passEl.textContent = '';
    passEl.className = 'fr-pass';
  }
}

/* 파티 조건형 잠재(속성/타입 기반)가 지금 팀 구성으로 발동 가능한 조건인지만 알려준다.
   실제 보유 여부·확률은 다루지 않는다 — 그 자료가 없다. */
function _frRenderTeamBadges() {
  const els = _frTeam.map(f => f.element).filter(Boolean);
  const tys = _frTeam.map(f => f.type).filter(Boolean);
  const badges = [];
  if (els.length >= 1) badges.push(`파티 내 특정 속성 존재 (${[...new Set(els)].join('·')})`);
  if (tys.length >= 1) badges.push(`파티 내 특정 타입 존재 (${[...new Set(tys)].join('·')})`);
  if (els.length === 3 && new Set(els).size === 1) badges.push(`전체 동일 속성 (${els[0]})`);
  if (tys.length === 3 && new Set(tys).size === 1) badges.push(`전체 동일 타입 (${tys[0]})`);
  if (els.length === 3 && new Set(els).size === 3) badges.push('전체 서로 다른 속성');
  if (tys.length === 3 && new Set(tys).size === 3) badges.push('전체 서로 다른 타입');

  const box = document.getElementById('frTeamBadges');
  if (!box) return;
  box.innerHTML = badges.length
    ? badges.map(b => `<span class="fr-badge">${b}</span>`).join('')
    : '<span class="fr-badge fr-badge--empty">속성·타입을 고르면 충족되는 파티 조건이 여기 뜹니다</span>';
}

function _frLineHtml(fi, li, line) {
  const kindSel = `<select class="sel fr-line-kind" data-fi="${fi}" data-li="${li}">
    <option value="">— 없음 —</option>
    <option value="add"${line.kind === 'add' ? ' selected' : ''}>Dice Total(합계)</option>
    <option value="mult"${line.kind === 'mult' ? ' selected' : ''}>Final Multiplier(배율)</option>
  </select>`;
  const disabled = line.kind ? '' : ' disabled';
  return `
    <div class="fr-line">
      ${kindSel}
      <input class="inp fr-line-val" type="number" step="0.1" placeholder="${line.kind === 'mult' ? '예: 1.4' : '예: 9'}"
             value="${line.val}" data-fi="${fi}" data-li="${li}"${disabled}>
    </div>`;
}

function _frRenderTeam() {
  const box = document.getElementById('frTeamSlots');
  if (!box) return;
  box.innerHTML = _frTeam.map((f, i) => `
    <div class="fr-slot">
      <div class="fr-slot__title">패밀리어 ${i + 1}</div>
      <div class="fr-slot__row">
        <label class="fr-slot__lbl">속성</label>
        ${_frBuildSelect('frEl' + i, FRONTIER_ELEMENTS, f.element, '— 선택 안 함 —')}
      </div>
      <div class="fr-slot__row">
        <label class="fr-slot__lbl">타입</label>
        ${_frBuildSelect('frTy' + i, FRONTIER_TYPES, f.type, '— 선택 안 함 —')}
      </div>
      <div class="fr-slot__lines">
        ${_frLineHtml(i, 0, f.lines[0])}
        ${_frLineHtml(i, 1, f.lines[1])}
      </div>
    </div>`).join('');

  _frTeam.forEach((f, i) => {
    document.getElementById('frEl' + i).addEventListener('change', e => { _frTeam[i].element = e.target.value; _frRenderTeamBadges(); });
    document.getElementById('frTy' + i).addEventListener('change', e => { _frTeam[i].type = e.target.value; _frRenderTeamBadges(); });
  });
  box.querySelectorAll('.fr-line-kind').forEach(sel => {
    sel.addEventListener('change', e => {
      const fi = +e.target.dataset.fi, li = +e.target.dataset.li;
      _frTeam[fi].lines[li].kind = e.target.value;
      if (!e.target.value) _frTeam[fi].lines[li].val = '';
      _frRenderTeam();
      _frCalcAndRender();
    });
  });
  box.querySelectorAll('.fr-line-val').forEach(inp => {
    inp.addEventListener('input', e => {
      const fi = +e.target.dataset.fi, li = +e.target.dataset.li;
      _frTeam[fi].lines[li].val = e.target.value;
      _frCalcAndRender();
    });
  });
  _frRenderTeamBadges();
}

function initFrontier() {
  const sec = document.getElementById('sec-frontier');
  if (!sec) return;
  if (sec.dataset.inited) { _frCalcAndRender(); return; }
  sec.dataset.inited = '1';

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">미스틱 프론티어 계산기</h2></div>
    <p class="dt-help">패밀리어 3마리로 팀을 짜고 주사위로 원정 라운드를 통과합니다. 오른쪽 카드에서
      각 패밀리어의 속성·타입과 프론티어 잠재 2줄을 고르면, 왼쪽에서 주사위 값만 넣어 바로 점수를 봅니다.</p>

    <div class="sf-layout">
      <!-- 왼쪽: 점수 계산기 -->
      <div class="card">
        <div class="card__title">라운드 점수 계산기</div>
        <p class="dt-help">Dice Total(합계)형 옵션은 전부 더해 주사위 합에 얹고, Final Multiplier(배율)형
          옵션은 전부 더한 뒤 마지막에 한 번만 곱합니다.</p>

        <div class="fr-dice-row mt8">
          <div class="fr-dice">
            <label class="fr-slot__lbl">주사위 1</label>
            <select class="sel" id="frDice1">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
          </div>
          <div class="fr-dice">
            <label class="fr-slot__lbl">주사위 2</label>
            <select class="sel" id="frDice2">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
          </div>
          <div class="fr-dice">
            <label class="fr-slot__lbl">주사위 3</label>
            <select class="sel" id="frDice3">${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}</select>
          </div>
        </div>

        <div class="field mt16">
          <label class="field__label">라운드 목표 점수 (선택)</label>
          <input class="inp" id="frTarget" type="number" placeholder="예: 150" min="0">
        </div>

        <div class="sf-res-item mt16">
          <span class="sf-res-label">계산식</span>
          <span class="sf-res-val" id="frResultFormula" style="font-size:.8rem"></span>
        </div>
        <div class="sf-res-item">
          <span class="sf-res-label">최종 점수</span>
          <span class="sf-res-val big" id="frResultScore">0</span>
        </div>
        <div id="frPass" class="fr-pass"></div>
      </div>

      <!-- 오른쪽: 팀 구성 -->
      <div class="card">
        <div class="card__title">팀 구성 — 패밀리어 3마리</div>
        <p class="dt-help">속성·타입을 고르고, 카드에 뜬 프론티어 잠재 2줄의 종류와 수치를 그대로 입력하세요.</p>
        <div id="frTeamSlots" class="fr-team mt8"></div>
        <div class="card__title mt16">충족되는 파티 조건</div>
        <div id="frTeamBadges" class="fr-badges mt8"></div>
      </div>
    </div>`;

  ['frDice1', 'frDice2', 'frDice3', 'frTarget'].forEach(id => {
    document.getElementById(id).addEventListener('input', _frCalcAndRender);
    document.getElementById(id).addEventListener('change', _frCalcAndRender);
  });

  _frRenderTeam();
  _frCalcAndRender();
}
