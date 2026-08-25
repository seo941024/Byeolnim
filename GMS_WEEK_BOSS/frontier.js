/* ═══════════════════════════════════════════════
   미스틱 프론티어 계산기

   출처
     구조·규칙: MapleStory Wiki "Mystic Frontier"
       https://maplestorywiki.net/w/Mystic_Frontier
     옵션 실제 텍스트·속성/타입 명칭: masonym.dev/familiars → Familiar Lines →
       "elemental Familiar is on your active lineup" / "type Familiar is on your active lineup"로 검색
       (게임 파일 직파싱이 출처라 게임에 뜨는 표기 그대로다. weight는 전부 0이라 확률은 없음)
     속성/타입 7·9종 구성 확인차 참고만 했던 갤러리 글(수치·확률은 신뢰 안 함, 이제 안 씀):
       https://gall.dcinside.com/mgallery/board/view?id=heroic&no=245780

   속성 7종(영문 표기 그대로): Fire, Ice, Lightning, Poison, Dark, Holy, Non-elemental
   타입 9종(영문 표기 그대로): Human, Beast, Plant, Aquatic, Reptile, Fairy, Devil, Undead, Mechanical

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

const FRONTIER_ELEMENTS = ['Fire', 'Ice', 'Lightning', 'Poison', 'Dark', 'Holy', 'Non-elemental'];
const FRONTIER_TYPES = ['Human', 'Beast', 'Plant', 'Aquatic', 'Reptile', 'Fairy', 'Devil', 'Undead', 'Mechanical'];

/* 패밀리어 3마리, 각자 등급(카드 그림용) + 속성/타입 + 프론티어 잠재 1줄.
   일반 잠재(2줄)와 달리 프론티어 잠재는 한 마리당 한 줄만 뜬다 — 위키에도
   "a random frontier potential"(단수)이라고 돼 있다.
   한 줄이 합계·배율을 동시에 주는 경우가 실제로 있다(예: "Dice Total: -1, Final
   Multiplier: +1.4x" — masonym.dev에서 확인). 그래서 줄 하나에 두 값을 같이 받는다. */
/* condPick은 "조건은 골랐는데 수치는 아직"인 상태를 기억해 둔다 — 이게 없으면
   조건을 고르는 순간 다시 그려지면서 방금 고른 조건이 풀려버린다. */
let _frTeam = [0, 1, 2].map(() => ({
  rank: 'unique', element: '', type: '',
  line: { add: '', mult: '', catalogIdx: '' },
  condPick: { base: '', event: '' },
}));

function _frCardSrc(rank) { return 'images/familiar/mini_' + (rank || 'rare') + '.png'; }

/* 타입 아이콘 — maplehub.app에서 실제로 존재하는 걸 확인한 9장만 받아왔다.
   속성 아이콘은 그 사이트 경로가 전부 SPA 오류 페이지를 200으로 돌려주는 가짜였어서 없다. */
/* src=""는 브라우저가 "빈 문자열 = 지금 문서 자체"로 해석해서 페이지를 이미지로 다시 불러오려는
   경우가 있다(엔진에 따라 다름). 그래서 아이콘 없을 땐 빈 문자열 대신 1x1 투명 GIF를 넣는다. */
const FR_BLANK_ICON = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';
function _frTypeIconSrc(type) { return type ? 'images/frontier/type_' + type.toLowerCase() + '.webp' : FR_BLANK_ICON; }

/* 속성 아이콘 6종 — maplehub.app 콤보박스를 직접 열어서 확인한 실제 경로(elements 복수형,
   lightning은 light로 저장돼 있었다). Non-elemental은 그 목록에 아이콘이 없었다(선택지 자체가
   "None"으로 따로 있고 그림 없음) — 없는 걸 지어내지 않고 그냥 아이콘 없이 둔다. */
const FR_ELEMENT_ICON_KEY = { Fire: 'fire', Poison: 'poison', Lightning: 'lightning', Ice: 'ice', Dark: 'dark', Holy: 'holy' };
function _frElementIconSrc(el) { return FR_ELEMENT_ICON_KEY[el] ? 'images/frontier/element_' + FR_ELEMENT_ICON_KEY[el] + '.webp' : FR_BLANK_ICON; }

/* 라운드마다 클리어 보상으로 보너스 주사위를 하나씩 받는다. 1라운드는 아직 하나도 못 받은
   상태라 0개, 5라운드를 시작할 땐 그동안 4번 클리어했으니 최대 4개까지 쌓인다.
   보너스 주사위도 팀 잠재와 같은 구조(합계에 얹거나 배율에 더하거나)로 취급한다. */
const FR_MAX_BONUS_DICE = 4;
let _frBonusDice = Array.from({ length: FR_MAX_BONUS_DICE }, () => ({ add: '', mult: '', kind: '', tier: '' }));

/* 실제로 받는 보너스 주사위 20종 — 4계열 × 5등급이고 등급 색은 회색<파랑<보라<주황<초록 순이다.
   수치를 직접 적게 하면 아이템을 보고 숫자를 옮겨 적어야 해서, 아이템 자체를 고르게 한다.
   출처는 maplehub의 미스틱 프론티어 계산기 구현(수치·그림 경로 모두 거기서 확인). */
const FR_DICE_TIERS = [['gray', 'Gray'], ['blue', 'Blue'], ['purple', 'Purple'], ['orange', 'Orange'], ['green', 'Green']];
const FR_DICE_KINDS = [
  {
    key: 'blessed', label: 'Blessed Dice',
    vals: [{ add: 3 }, { add: 6 }, { add: 9 }, { add: 12 }, { add: 15 }],
    img: t => `blessed_${t}_dice`,
  },
  {
    key: 'swift', label: 'Swift Rolling Dice',
    vals: [{ mult: 1.2 }, { mult: 1.4 }, { mult: 1.6 }, { mult: 1.8 }, { mult: 2 }],
    img: t => `swift_rolling_${t}_dice`,
  },
  {
    key: 'sharp', label: 'Sharp Edged Dice',
    vals: [{ add: -1, mult: 1.6 }, { add: -1, mult: 1.8 }, { add: -1, mult: 2 }, { add: -1, mult: 2.2 }, { add: -1, mult: 2.4 }],
    img: t => `sharp_edged_${t}_dice`,
  },
  {
    key: 'holy', label: 'Holy Rollers',
    vals: [{ add: 1, mult: 1.4 }, { add: 1, mult: 1.6 }, { add: 1, mult: 1.8 }, { add: 1, mult: 2 }, { add: 1, mult: 2.2 }],
    // 파랑만 파일 이름에 holy가 빠져 있다(원본 그대로).
    img: t => (t === 'blue' ? 'blue_rollers' : `${t}_holy_rollers`),
  },
];

function _frDiceIconSrc(kindKey, tierKey) {
  const k = FR_DICE_KINDS.find(x => x.key === kindKey);
  return k && tierKey ? `images/frontier/dice/${k.img(tierKey)}.webp` : FR_BLANK_ICON;
}

function _frDiceEffectLabel(v) {
  const p = [];
  if (v.add != null) p.push(`Dice Total ${v.add > 0 ? '+' : ''}${v.add}`);
  if (v.mult != null) p.push(`x${v.mult}`);
  return p.join(', ');
}

/* 팀에서 그 그룹(속성/타입 묶음)에 해당하는 마릿수 — 이벤트 "~마다" 옵션의 배수가 된다. */
function _frGroupCount(group) {
  return _frTeam.filter(f => group.match.some(m => f[m.f] === m.v)).length;
}

/* 옵션이 지금 주사위·팀 구성에서 실제로 발동하는지 판정한다.
   프론티어 옵션은 조건이 맞을 때만 값이 붙어서, 이걸 안 보고 그냥 더하면 점수가 틀린다. */
function _frCondMet(cond, dice) {
  if (!cond) return true;
  const els = _frTeam.map(f => f.element).filter(Boolean);
  const tys = _frTeam.map(f => f.type).filter(Boolean);
  const uniq = a => new Set(a).size;
  const sorted = [...dice].sort((a, b) => a - b);
  switch (cond.t) {
    case 'elem': return els.includes(cond.v);
    case 'type': return tys.includes(cond.v);
    // 3마리가 다 채워졌을 때만 "모두 같다/다르다"를 판정할 수 있다.
    case 'sameElem': return els.length === 3 && uniq(els) === 1;
    case 'diffElem': return els.length === 3 && uniq(els) === 3;
    case 'sameType': return tys.length === 3 && uniq(tys) === 1;
    case 'diffType': return tys.length === 3 && uniq(tys) === 3;
    case 'dieOdd': return dice[cond.i] % 2 === 1;
    case 'dieEven': return dice[cond.i] % 2 === 0;
    case 'allOdd': return dice.every(v => v % 2 === 1);
    case 'allEven': return dice.every(v => v % 2 === 0);
    case 'consec': return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
    case 'pairMin': return cond.pair.every(i => dice[i] >= cond.w);
    case 'pairMatch': return dice[cond.pair[0]] === dice[cond.pair[1]];
    case 'anyDie': return dice.includes(cond.n);
    case 'allDie': return dice.every(v => v === cond.n);
    case 'allMin': return dice.every(v => v >= cond.w);
    case 'allMax': return dice.every(v => v <= cond.w);
    case 'prevent': return true;   // 주사위 상한을 거는 대신 배율을 주는 상시 옵션
    case 'group': return true;     // 발동 여부가 아니라 마릿수로 세기 때문에 별도 처리
    case 'chance': return false;   // 주사위 확률만 바꿔서 점수식엔 안 들어간다
  }
  return true;
}

/* 팀 옵션 줄 + 보너스 주사위를 모아 더한다 — 합계값은 다 더해서 주사위 합에,
   배율값은 다 더해서 마지막에 한 번만 곱한다(사용자 확인 계산식). 한 줄이 두 값을 동시에
   가지면 둘 다 반영된다. 배율값이 하나도 안 붙었으면 곱셈 효과 없음 = ×1. */
function _frAggregate(dice) {
  let addSum = 0, multSum = 0, multCount = 0;
  const applied = [];
  const take = (l, count = 1) => {
    if (count <= 0) return;
    const a = parseFloat(l.add), m = parseFloat(l.mult);
    if (!isNaN(a)) addSum += a * count;
    // 배율 0은 안 채운 것과 같게 본다 — 이게 배율 합에 끼면 ×1 기본값이 0으로 무너진다.
    if (!isNaN(m) && m > 0) { multSum += m * count; multCount++; }
  };
  _frTeam.forEach((f, i) => {
    const l = f.line;
    if (l.catalogIdx === '' || l.catalogIdx == null) { applied.push(null); return; }
    if (l.groupKey) {
      const g = (window.FR_EVENT_GROUPS || []).find(x => x.key === l.groupKey);
      const n = g ? _frGroupCount(g) : 0;
      take(l, n);
      applied.push({ met: n > 0, count: n });
      return;
    }
    const met = _frCondMet(l.cond, dice);
    if (met) take(l);
    applied.push({ met, count: 1 });
  });
  _frBonusDice.forEach(l => take(l));
  return { addSum, mult: multCount ? multSum : 1, applied };
}

/* 보너스 주사위는 4칸 고정으로 항상 띄운다. 매 라운드 나오는 것도 아니라서
   "몇 라운드니까 몇 개"로 자동 계산하는 것보다, 안 나온 칸은 그냥 비워두게 두는 게 편하다.
   잠재와 같이 종류 고르고 → 등급 고르는 2단계다. */
function _frBonusDiceHtml(i) {
  const b = _frBonusDice[i];
  const kind = FR_DICE_KINDS.find(k => k.key === b.kind);
  const kindOpts = FR_DICE_KINDS.map(k =>
    `<option value="${k.key}"${k.key === b.kind ? ' selected' : ''}>${k.label}</option>`).join('');
  const tierOpts = !kind ? '' : FR_DICE_TIERS.map(([t, label], ti) =>
    `<option value="${t}"${t === b.tier ? ' selected' : ''}>${label} — ${_frDiceEffectLabel(kind.vals[ti])}</option>`).join('');
  const src = _frDiceIconSrc(b.kind, b.tier);
  return `
    <div class="fr-bonus">
      <img class="fr-bonus__img" src="${src}" alt="" ${src === FR_BLANK_ICON ? 'style="visibility:hidden"' : ''}>
      <span class="fr-bonus__lbl">Bonus ${i + 1}</span>
      <select class="sel fr-bd-kind" data-bi="${i}"><option value="">-</option>${kindOpts}</select>
      <select class="sel fr-bd-tier" data-bi="${i}"${kind ? '' : ' disabled'}><option value="">-</option>${tierOpts}</select>
    </div>`;
}

function _frRenderBonusDice() {
  const box = document.getElementById('frBonusDice');
  if (!box) return;
  box.innerHTML = Array.from({ length: FR_MAX_BONUS_DICE }, (_, i) => _frBonusDiceHtml(i)).join('');

  const apply = (i) => {
    const b = _frBonusDice[i];
    const kind = FR_DICE_KINDS.find(k => k.key === b.kind);
    const ti = FR_DICE_TIERS.findIndex(([t]) => t === b.tier);
    const v = kind && ti >= 0 ? kind.vals[ti] : null;
    b.add = v && v.add != null ? v.add : '';
    b.mult = v && v.mult != null ? v.mult : '';
    _frRenderBonusDice();
    _frCalcAndRender();
  };
  box.querySelectorAll('.fr-bd-kind').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = +e.target.dataset.bi;
      _frBonusDice[i].kind = e.target.value;
      _frBonusDice[i].tier = '';   // 계열이 바뀌면 등급은 다시 고른다
      apply(i);
    });
  });
  box.querySelectorAll('.fr-bd-tier').forEach(sel => {
    sel.addEventListener('change', e => {
      const i = +e.target.dataset.bi;
      _frBonusDice[i].tier = e.target.value;
      apply(i);
    });
  });
}

/* "Prevents dice from rolling over N"을 고르면 주사위가 N을 넘을 수 없다.
   넘는 눈을 고를 수 있게 두면 있을 수 없는 조합으로 점수가 나오니, 선택지에서 아예 없앤다.
   여러 장이 각각 상한을 걸면 제일 낮은 값이 실제 상한이 된다. */
function _frDiceCap() {
  let cap = 6;
  _frTeam.forEach(f => {
    const c = f.line && f.line.cond;
    if (c && c.t === 'prevent' && c.w < cap) cap = c.w;
  });
  return cap;
}

function _frSyncDiceOptions() {
  const cap = _frDiceCap();
  ['frDice1', 'frDice2', 'frDice3'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || +sel.dataset.cap === cap) return;
    const cur = Math.min(parseInt(sel.value) || 1, cap);
    sel.dataset.cap = cap;
    sel.innerHTML = Array.from({ length: cap }, (_, i) => i + 1)
      .map(n => `<option value="${n}"${n === cur ? ' selected' : ''}>${n}</option>`).join('');
  });
}

function _frCalcAndRender() {
  _frSyncDiceOptions();
  const dice = ['frDice1', 'frDice2', 'frDice3'].map(id => parseInt(document.getElementById(id)?.value) || 0);
  const diceSum = dice.reduce((a, b) => a + b, 0);
  const { addSum, mult, applied } = _frAggregate(dice);
  const raw = (diceSum + addSum) * mult;
  // 0.1 같은 값이 이진수로 딱 안 떨어져서 21×4.2가 88.19999...로 나오는 걸 막는다.
  const score = Math.floor(raw + 1e-9);

  /* 고른 옵션이 지금 주사위에서 실제로 터졌는지 카드마다 알려준다 —
     영어 문구만 봐서는 조건이 맞는지 알기 어렵다. */
  applied.forEach((a, i) => {
    const el = document.getElementById('frLineState' + i);
    if (!el) return;
    if (!a) { el.textContent = ''; el.className = 'fr-line-state'; return; }
    const l = _frTeam[i].line;
    if (l.groupKey) {
      el.textContent = a.count > 0 ? `조건 ${a.count}장 적용` : '해당 없음';
    } else if (l.cond && l.cond.t === 'chance') {
      el.textContent = '점수 계산 없음';
    } else {
      el.textContent = a.met ? '적용됨' : '조건 미달';
    }
    el.className = 'fr-line-state' + (a.met ? ' ok' : ' no');
  });

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
/* 배지 문구는 masonym.dev(게임 파일 직파싱)에서 실제로 확인한 옵션 텍스트를 그대로 쓴다.
   검색해서 존재를 확인한 것만 넣었다 — "elemental Familiar is on your active lineup",
   "type Familiar is on your active lineup", "have the same element/type",
   "have a different element/type". */
function _frRenderTeamBadges() {
  const els = _frTeam.map(f => f.element).filter(Boolean);
  const tys = _frTeam.map(f => f.type).filter(Boolean);
  const badges = [];
  [...new Set(els)].forEach(e => badges.push(`If a ${e} elemental Familiar is on your active lineup`));
  [...new Set(tys)].forEach(t => badges.push(`If a ${t} type Familiar is on your active lineup`));
  if (els.length === 3 && new Set(els).size === 1) badges.push('If all Familiars on your active lineup have the same element');
  if (tys.length === 3 && new Set(tys).size === 1) badges.push('If all Familiars on your active lineup have the same type');
  if (els.length === 3 && new Set(els).size === 3) badges.push('If all Familiars on your active lineup have a different element');
  if (tys.length === 3 && new Set(tys).size === 3) badges.push('If all Familiars on your active lineup have a different type');

  const box = document.getElementById('frTeamBadges');
  if (!box) return;
  box.innerHTML = badges.length
    ? badges.map(b => `<span class="fr-badge">${b}</span>`).join('')
    : '<span class="fr-badge fr-badge--empty">Pick an element/type to see which party conditions this lineup satisfies</span>';
}

/* 옵션 줄 하나 = 합계값 입력 + 배율값 입력, 나란히. 실제 게임 옵션 중에
   "Dice Total: -1, Final Multiplier: +1.4x"처럼 한 줄이 두 값을 동시에 주는 경우가 있어서
   둘 다 받는다. idKind/idVal는 data attribute 이름과 값 — 팀 줄은 fi+li, 보너스 주사위는 bi 하나. */
function _frTwoValLine(line, label, idKind, idVal, idKind2, idVal2) {
  const attrs = idKind2 != null ? `data-${idKind}="${idVal}" data-${idKind2}="${idVal2}"` : `data-${idKind}="${idVal}"`;
  return `
    <div class="fr-line">
      ${label ? `<span class="fr-bonus__lbl">${label}</span>` : ''}
      <div class="fr-line__field">
        <span class="fr-line__field-lbl">Dice Total</span>
        <input class="inp fr-val-add" type="number" step="0.1" placeholder="예: 9" value="${line.add}" ${attrs}>
      </div>
      <div class="fr-line__field">
        <span class="fr-line__field-lbl">× Multiplier</span>
        <input class="inp fr-val-mult" type="number" step="0.1" placeholder="예: 1.4" value="${line.mult}" ${attrs}>
      </div>
    </div>`;
}

const FR_RANKS = [['common', '커먼'], ['rare', '레어'], ['epic', '에픽'], ['unique', '유니크']];

/* 한 등급에 옵션이 366개까지 있는데, 대부분은 조건은 같고 수치만 다른 것들이다.
   그걸 한 줄로 쭉 늘어놓으면 못 고르니 조건별로 묶어서 "조건 고르고 → 수치 고르기"
   두 단계로 나눈다(366개 → 조건 59개, 조건당 수치 최대 12개).

   묶는 기준은 cond다. 사람이 정한 게 아니라 데이터에서 나온 거라 새 옵션이 들어와도
   알아서 묶인다. 조건 문구는 같은 묶음 label들의 공통 앞부분을 잘라서 쓴다 —
   따로 문구를 적어두면 원본이 바뀔 때 같이 안 바뀌어서 어긋난다. */
/* 문구 하나를 "조건 / 수치" 두 토막으로 자른다. 원본 문구가 몇 가지 정해진 꼴로만
   나와서 구조로 자를 수 있다. 공통 앞부분으로 자르면 같은 묶음이 전부 "Dice Total:"로
   시작할 때 그것까지 조건에 딸려 들어가 문구가 깨진다. */
function _frSplitLabel(label) {
  let m = label.match(/^(.*?),\s*((?:Dice Total|Final Multiplier)\s*:.*|[+x][\d.]+)$/);
  if (m) return { cond: m[1], val: m[2] };
  // 이벤트 "~마다" 꼴은 수치가 앞에 온다 — "+6 for each Fire or Ice element"
  m = label.match(/^([+x][\d.]+)\s+(for\s+(?:each|every)\s+.*)$/i);
  if (m) return { cond: m[2], val: m[1] };
  // 확률 옵션도 수치가 앞이다 — "+6% chance to roll 1 or 6 for each ..."
  m = label.match(/^(\+[\d.]+%)\s+(chance\s+to\s+roll\s+.*)$/i);
  if (m) return { cond: m[2], val: m[1] };
  return { cond: label, val: label };
}

const _frGroupCache = new Map();
function _frGroups(pool, cacheKey) {
  if (_frGroupCache.has(cacheKey)) return _frGroupCache.get(cacheKey);
  const byCond = new Map();
  pool.forEach((e, idx) => {
    /* cond만으로 묶으면 확률 옵션이 전부 cond.t === 'chance' 하나라 48개가 한 덩어리가 된다.
       조건 문구까지 키에 넣어야 "1 or 6 / 2 or 5 / 3 or 4"가 따로 갈린다. */
    const k = JSON.stringify(e.cond) + '|' + _frSplitLabel(e.label).cond;
    if (!byCond.has(k)) byCond.set(k, []);
    byCond.get(k).push({ e, idx });
  });
  /* 원본에 문구·수치가 완전히 같은 줄이 24개 들어있다(확률 옵션 위주, 예: id 140725/140726).
     고를 때 똑같은 게 두 번 뜨면 뭐가 다른가 싶으니 목록에선 하나만 남긴다.
     값이 같아서 어느 쪽을 골라도 점수는 같다. */
  const groups = [...byCond.values()].map(items => {
    const seen = new Set();
    const uniq = items.filter(x => !seen.has(x.e.label) && seen.add(x.e.label));
    return {
      label: _frSplitLabel(uniq[0].e.label).cond,
      items: uniq.map(x => ({ idx: x.idx, label: _frSplitLabel(x.e.label).val })),
    };
  });
  _frGroupCache.set(cacheKey, groups);
  return groups;
}

/* 지금 고른 값(idx)이 어느 조건 묶음에 속하는지 되찾는다 — 다시 그릴 때 선택을 유지하려고. */
function _frFindGroup(groups, idx) {
  if (idx === '' || idx == null) return -1;
  return groups.findIndex(g => g.items.some(it => String(it.idx) === String(idx)));
}

/* 드롭다운 하나 안에서 조건 → 수치로 파고든다. 칸을 둘로 나누면 자리를 두 배로 먹는데,
   실제로는 한 번에 한 단계만 보면 되니 같은 칸에서 목록만 바꿔 끼운다. */
function _frCondMenuHtml(fi, kind, groups) {
  return groups.map((g, i) =>
    `<button type="button" class="fr-dd__item fr-ln-cond" data-fi="${fi}" data-kind="${kind}" data-gi="${i}">
      <span>${g.label}</span><span class="fr-dd__more">›</span>
    </button>`).join('');
}

function _frValMenuHtml(fi, kind, groups, gi, curIdx) {
  const g = groups[gi];
  return `
    <button type="button" class="fr-dd__item fr-ln-back" data-fi="${fi}" data-kind="${kind}">‹ ${g.label}</button>
    <button type="button" class="fr-dd__item fr-ln-val" data-fi="${fi}" data-kind="${kind}" data-idx="">-</button>
    ${g.items.map(it =>
      `<button type="button" class="fr-dd__item fr-ln-val${String(it.idx) === String(curIdx) ? ' active' : ''}"
        data-fi="${fi}" data-kind="${kind}" data-idx="${it.idx}">${it.label}</button>`).join('')}`;
}

function _frTwoStepHtml(fi, kind, pool, cacheKey, curIdx) {
  if (!pool.length) return '';
  const groups = _frGroups(pool, cacheKey);
  // 수치까지 골랐으면 그걸로 조건을 되찾고, 조건만 고른 상태면 기억해 둔 값을 쓴다.
  const found = _frFindGroup(groups, curIdx);
  const picked = _frTeam[fi].condPick[kind];
  const gi = found >= 0 ? found : (picked === '' ? -1 : +picked);

  const cur = curIdx === '' || curIdx == null ? null : pool[+curIdx];
  const trigger = cur ? cur.label : (gi >= 0 ? groups[gi].label : '-');
  // 조건만 골라둔 상태면 그 조건의 수치 목록을 펼친 채로 시작한다.
  const menu = gi >= 0 ? _frValMenuHtml(fi, kind, groups, gi, curIdx) : _frCondMenuHtml(fi, kind, groups);
  return `
    <div class="fr-dd fr-dd--line" data-fi="${fi}" data-kind="${kind}">
      <button type="button" class="fr-dd__trigger fr-ln-trigger"${cur ? '' : ' data-empty="1"'}>
        <span class="fr-ln-cur">${trigger}</span><span class="fr-dd__caret">▾</span>
      </button>
      <div class="fr-dd__menu fr-dd__menu--line" hidden>${menu}</div>
    </div>`;
}

function _frPool(fi, kind) {
  const rankKey = (_frTeam[fi].rank || 'unique').toUpperCase();
  const src = kind === 'event' ? window.FR_EVENT_CATALOG : window.FR_CATALOG;
  return { pool: (src && src[rankKey]) || [], cacheKey: kind + ':' + rankKey };
}

function _frLineHtml(fi, line) {
  if (!window.FR_CATALOG) return '<div class="fr-slot__field">데이터 로딩 중...</div>';
  const cur = line.catalogIdx;
  const isEvent = String(cur || '').startsWith('e');
  const base = _frPool(fi, 'base'), ev = _frPool(fi, 'event');
  const evCur = isEvent ? +String(cur).slice(1) : '';
  return `
    <div class="fr-slot__field">
      <span class="fr-slot__field-lbl">프론티어 잠재</span>
      ${_frTwoStepHtml(fi, 'base', base.pool, base.cacheKey, isEvent ? '' : cur)}
    </div>
    ${ev.pool.length ? `<div class="fr-slot__field">
      <span class="fr-slot__field-lbl">이벤트 잠재</span>
      ${_frTwoStepHtml(fi, 'event', ev.pool, ev.cacheKey, evCur)}
    </div>` : ''}
    <span class="fr-line-state" id="frLineState${fi}"></span>`;
}

/* 속성/타입은 평소엔 접혀 있다가 누르면 그림 목록이 펼쳐지는 드롭다운으로 고른다.
   네이티브 select는 option 안에 이미지를 못 넣어서 직접 만든다. */
/* 무속성은 게임에도 아이콘 그림이 없다 — 다른 속성만 그림이 붙으면 줄이 안 맞아서
   금지 표시를 대신 그린다(maplehub도 같은 방식). currentColor라 테마를 따라간다. */
const FR_NONE_ICON = `<svg class="fr-dd__ban" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>`;

function _frIconHtml(v, iconFn) {
  const src = iconFn(v);
  return src === FR_BLANK_ICON ? FR_NONE_ICON : `<img src="${src}" alt="">`;
}

function _frIconDropdown(prefix, fi, list, iconFn, cur) {
  const items = [`<button type="button" class="fr-dd__item" data-${prefix}="${fi}" data-val="">${FR_NONE_ICON}<span>-</span></button>`]
    .concat(list.map(v =>
      `<button type="button" class="fr-dd__item${v === cur ? ' active' : ''}" data-${prefix}="${fi}" data-val="${v}">
        ${_frIconHtml(v, iconFn)}<span>${v}</span>
      </button>`));
  return `
    <div class="fr-dd" id="fr${prefix}Dd${fi}">
      <button type="button" class="fr-dd__trigger" data-toggle="${fi}">
        ${cur ? _frIconHtml(cur, iconFn) : FR_NONE_ICON}<span>${cur || '-'}</span>
        <span class="fr-dd__caret">▾</span>
      </button>
      <div class="fr-dd__menu" hidden>${items.join('')}</div>
    </div>`;
}

/* ── 덱 저장 ─────────────────────────────────────
   게임에서 덱을 캐릭터당 3개까지 쓰니 저장도 캐릭터에 붙인다(대여 정보와 같은 방식).
   state 안에 들어가므로 클라우드 세이브에도 그대로 딸려 올라간다. */
const FR_MAX_DECKS = 3;

function _frActiveChar() {
  return (typeof state === 'object' && state && Array.isArray(state.chars))
    ? state.chars[state.activeChar] : null;
}

function _frDecks(ch = _frActiveChar()) {
  if (!ch) return [];
  if (!Array.isArray(ch.frontierDecks)) ch.frontierDecks = [];
  return ch.frontierDecks;
}

/* 저장은 화면에 보이는 값만 남긴다 — add/mult/cond는 등급별 목록에서 다시 끌어오면 되고,
   그걸 같이 저장해두면 나중에 옵션 수치가 바뀔 때 옛 값이 그대로 남아 어긋난다. */
function _frSnapshot() {
  return {
    team: _frTeam.map(f => ({ rank: f.rank, element: f.element, type: f.type, idx: f.line.catalogIdx })),
    bonus: _frBonusDice.map(b => ({ kind: b.kind, tier: b.tier })),
  };
}

function _frRestore(snap) {
  if (!snap) return;
  (snap.team || []).forEach((s, i) => {
    if (i >= _frTeam.length) return;
    const f = _frTeam[i];
    f.rank = s.rank || 'unique';
    f.element = s.element || '';
    f.type = s.type || '';
    f.condPick = { base: '', event: '' };
    f.line = { add: '', mult: '', catalogIdx: '' };

    const idx = s.idx;
    if (idx === '' || idx == null) return;
    const isEvent = String(idx).startsWith('e');
    const rankKey = (f.rank || 'unique').toUpperCase();
    const src = isEvent ? window.FR_EVENT_CATALOG : window.FR_CATALOG;
    const pool = (src && src[rankKey]) || [];
    const e = pool[isEvent ? +String(idx).slice(1) : +idx];
    if (!e) return;   // 옵션 목록이 바뀌어 그 자리가 없어졌으면 비워 둔다
    f.line = {
      catalogIdx: String(idx),
      add: e.add != null ? e.add : '',
      mult: e.mult != null ? e.mult : '',
      cond: e.cond,
      groupKey: e.groupKey,
    };
  });
  (snap.bonus || []).forEach((s, i) => {
    if (i >= _frBonusDice.length) return;
    const b = _frBonusDice[i];
    b.kind = s.kind || ''; b.tier = s.tier || '';
    const kind = FR_DICE_KINDS.find(k => k.key === b.kind);
    const ti = FR_DICE_TIERS.findIndex(([t]) => t === b.tier);
    const v = kind && ti >= 0 ? kind.vals[ti] : null;
    b.add = v && v.add != null ? v.add : '';
    b.mult = v && v.mult != null ? v.mult : '';
  });
}

function _frRenderDecks() {
  const box = document.getElementById('frDecks');
  if (!box) return;
  const ch = _frActiveChar();
  if (!ch) {
    box.innerHTML = '<span class="fr-deck__empty">캐릭터를 선택하면 덱을 저장할 수 있습니다</span>';
    return;
  }
  const decks = _frDecks(ch);
  const slots = Array.from({ length: FR_MAX_DECKS }, (_, i) => {
    const d = decks[i];
    return `
      <div class="fr-deck">
        <button type="button" class="btn fr-deck__load" data-di="${i}"${d ? '' : ' disabled'}>${d ? d.name : '비어 있음'}</button>
        <button type="button" class="btn fr-deck__save" data-di="${i}">${d ? '덮어쓰기' : '저장'}</button>
        <button type="button" class="btn fr-deck__del" data-di="${i}"${d ? '' : ' disabled'}>삭제</button>
      </div>`;
  }).join('');
  box.innerHTML = `<div class="fr-deck__name">${escHtml(ch.name)}</div>${slots}`;

  box.querySelectorAll('.fr-deck__save').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.di, d = _frDecks();
    d[i] = { name: `덱 ${i + 1}`, ...(_frSnapshot()) };
    save();
    _frRenderDecks();
  }));
  box.querySelectorAll('.fr-deck__load').forEach(b => b.addEventListener('click', () => {
    _frRestore(_frDecks()[+b.dataset.di]);
    _frRenderTeam();
    _frRenderBonusDice();
    _frCalcAndRender();
  }));
  box.querySelectorAll('.fr-deck__del').forEach(b => b.addEventListener('click', () => {
    const d = _frDecks();
    delete d[+b.dataset.di];
    save();
    _frRenderDecks();
  }));
}

function _frSetLine(fi, kind, idx) {
  const { pool } = _frPool(fi, kind);
  const entry = idx === '' ? null : pool[+idx];
  _frTeam[fi].line = entry ? {
    catalogIdx: kind === 'event' ? 'e' + idx : String(idx),
    add: entry.add != null ? entry.add : '',
    mult: entry.mult != null ? entry.mult : '',
    cond: entry.cond,
    groupKey: entry.groupKey,
  } : { add: '', mult: '', catalogIdx: '' };
  // 한쪽에서 실제로 고르면 반대쪽에 걸려 있던 조건은 풀어 준다 — 줄은 하나뿐이다.
  if (entry) _frTeam[fi].condPick[kind === 'event' ? 'base' : 'event'] = '';
  _frRenderTeam();
  _frCalcAndRender();
}

/* 조건을 누르면 같은 칸의 목록만 수치 목록으로 갈아끼운다 — 여기서 전체를 다시 그리면
   방금 연 드롭다운이 닫혀버린다. 목록을 갈아끼우면 버튼이 새로 생기니 다시 연결한다.
   조건 선택은 상태에도 남겨서, 나중에 다시 그려도 그 조건이 펼쳐진 채로 돌아온다. */
function _frBindLineMenu(box) {
  box.querySelectorAll('.fr-ln-cond').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const fi = +btn.dataset.fi, kind = btn.dataset.kind, gi = +btn.dataset.gi;
      _frTeam[fi].condPick[kind] = String(gi);
      const { pool, cacheKey } = _frPool(fi, kind);
      const groups = _frGroups(pool, cacheKey);
      // 수치가 하나뿐인 조건은 더 고를 게 없으니 바로 적용한다.
      if (groups[gi].items.length === 1) { _frSetLine(fi, kind, groups[gi].items[0].idx); return; }
      btn.closest('.fr-dd__menu').innerHTML = _frValMenuHtml(fi, kind, groups, gi, '');
      _frBindLineMenu(box);
    });
  });

  box.querySelectorAll('.fr-ln-back').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const fi = +btn.dataset.fi, kind = btn.dataset.kind;
      _frTeam[fi].condPick[kind] = '';
      const { pool, cacheKey } = _frPool(fi, kind);
      btn.closest('.fr-dd__menu').innerHTML = _frCondMenuHtml(fi, kind, _frGroups(pool, cacheKey));
      _frBindLineMenu(box);
    });
  });

  box.querySelectorAll('.fr-ln-val').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _frSetLine(+btn.dataset.fi, btn.dataset.kind, btn.dataset.idx);
    });
  });
}

function _frRenderTeam() {
  const box = document.getElementById('frTeamSlots');
  if (!box) return;
  box.innerHTML = _frTeam.map((f, i) => `
    <div class="fr-slot">
      <img class="fr-slot__img" id="frCardImg${i}" src="${_frCardSrc(f.rank)}" alt="" onerror="this.style.display='none'">
      <select class="sel fr-slot__rank" id="frRank${i}">
        ${FR_RANKS.map(([v, label]) => `<option value="${v}"${f.rank === v ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
      <div class="fr-slot__field">
        <span class="fr-slot__field-lbl">Element</span>
        ${_frIconDropdown('el', i, FRONTIER_ELEMENTS, _frElementIconSrc, f.element)}
      </div>
      <div class="fr-slot__field">
        <span class="fr-slot__field-lbl">Type</span>
        ${_frIconDropdown('ty', i, FRONTIER_TYPES, _frTypeIconSrc, f.type)}
      </div>
      ${_frLineHtml(i, f.line)}
    </div>`).join('');

  /* 드롭다운 열고 닫기 — 하나 열면 다른 건 닫는다 */
  box.querySelectorAll('.fr-dd__trigger').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      const willOpen = menu.hidden;
      box.querySelectorAll('.fr-dd__menu').forEach(m => { m.hidden = true; });
      menu.hidden = !willOpen;
    });
  });
  box.querySelectorAll('.fr-dd__item[data-el]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.el;
      _frTeam[i].element = btn.dataset.val;
      _frRenderTeam();
      _frRenderTeamBadges();
    });
  });
  box.querySelectorAll('.fr-dd__item[data-ty]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.ty;
      _frTeam[i].type = btn.dataset.val;
      _frRenderTeam();
      _frRenderTeamBadges();
    });
  });
  _frTeam.forEach((f, i) => {
    document.getElementById('frRank' + i).addEventListener('change', e => {
      _frTeam[i].rank = e.target.value;
      // 등급이 바뀌면 옵션 풀 자체가 바뀌어서 기존 선택 인덱스가 다른 옵션을 가리키게 된다 —
      // 헷갈리지 않게 그 카드의 잠재 선택을 비워서 다시 고르게 한다.
      _frTeam[i].line = { add: '', mult: '', catalogIdx: '' };
      _frTeam[i].condPick = { base: '', event: '' };
      _frRenderTeam();
      _frCalcAndRender();
    });
  });
  /* 잠재는 1개뿐이라 일반/이벤트 어느 쪽에서 고르든 그 카드의 한 줄을 덮어쓴다.
     다시 그릴 때 반대쪽은 자동으로 비워진다(_frLineHtml이 catalogIdx로 판단). */
  _frBindLineMenu(box);
  _frRenderTeamBadges();
}

function initFrontier() {
  const sec = document.getElementById('sec-frontier');
  if (!sec) return;
  // 다시 들어올 때마다 덱 목록을 새로 그린다 — 그 사이 캐릭터가 바뀌었을 수 있다.
  if (sec.dataset.inited) { _frRenderDecks(); _frCalcAndRender(); return; }
  sec.dataset.inited = '1';

  document.addEventListener('click', () => {
    document.querySelectorAll('#sec-frontier .fr-dd__menu').forEach(m => { m.hidden = true; });
  });

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">미스틱 프론티어 계산기</h2></div>

    <!-- 위: 팀 구성 (한 화면 전체 폭) -->
    <div class="card">
      <div class="card__title">팀 구성</div>
      <div id="frDecks" class="fr-decks mt8"></div>
      <div id="frTeamSlots" class="fr-team mt8"></div>
      <div class="card__title mt16">충족되는 파티 조건</div>
      <div id="frTeamBadges" class="fr-badges mt8"></div>
    </div>

    <!-- 아래: 점수 계산기 -->
    <div class="card mt16">
      <div class="card__title">라운드 점수 계산기</div>

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

      <div class="card__title mt16">보너스 주사위</div>
      <div id="frBonusDice" class="mt8"></div>

      <div class="field mt16">
        <label class="field__label">라운드 목표 점수</label>
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
    </div>`;

  ['frDice1', 'frDice2', 'frDice3', 'frTarget'].forEach(id => {
    document.getElementById(id).addEventListener('input', _frCalcAndRender);
    document.getElementById(id).addEventListener('change', _frCalcAndRender);
  });
  _frRenderDecks();
  _frRenderTeam();
  _frRenderBonusDice();
  _frCalcAndRender();
}
