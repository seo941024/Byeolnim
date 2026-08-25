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
let _frTeam = [0, 1, 2].map(() => ({
  rank: 'unique', element: '', type: '',
  line: { add: '', mult: '', catalogIdx: '' },
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
let _frBonusDice = Array.from({ length: FR_MAX_BONUS_DICE }, () => ({ add: '', mult: '' }));

/* 팀 전체 옵션 줄 + 보너스 주사위를 모아 더한다 — 각 줄의 합계값은 다 더해서 주사위 합에,
   배율값은 다 더해서 마지막에 한 번만 곱한다(사용자 확인 계산식). 한 줄이 두 값을 동시에
   가지면 둘 다 반영된다. 배율값이 하나도 안 채워졌으면 곱셈 효과 없음 = ×1. */
function _frAggregate() {
  let addSum = 0, multSum = 0, multCount = 0;
  /* count는 이벤트 그룹형 줄에서만 1이 아니다 — 팀에 그 속성/타입이 몇 마리인지에
     비례해서 값이 곱해지는 옵션이라(예: "불 또는 얼음 속성마다 +3"), 매칭 0마리면
     아예 안 고른 것과 같아야 한다(mult 기본값 1을 망가뜨리면 안 되니 여기서 거른다). */
  const addLine = (l, count = 1) => {
    if (count <= 0) return;
    const a = parseFloat(l.add), m = parseFloat(l.mult);
    if (!isNaN(a)) addSum += a * count;
    if (!isNaN(m)) { multSum += m * count; multCount++; }
  };
  const matchCount = group => _frTeam.filter(f => group.match.some(m => f[m.f] === m.v)).length;
  _frTeam.forEach(f => {
    if (f.line.groupKey) {
      const g = (window.FR_EVENT_GROUPS || []).find(x => x.key === f.line.groupKey);
      addLine(f.line, g ? matchCount(g) : 0);
    } else {
      addLine(f.line);
    }
  });
  _frBonusDice.forEach(l => addLine(l));
  return { addSum, mult: multCount ? multSum : 1 };
}

/* 보너스 주사위는 4칸 고정으로 항상 띄운다. 매 라운드 나오는 것도 아니라서
   "몇 라운드니까 몇 개"로 자동 계산하는 것보다, 안 나온 칸은 그냥 비워두게 두는 게 편하다. */
function _frRenderBonusDice() {
  const box = document.getElementById('frBonusDice');
  if (!box) return;
  box.innerHTML = Array.from({ length: FR_MAX_BONUS_DICE }, (_, i) =>
    _frTwoValLine(_frBonusDice[i], `보너스 주사위 ${i + 1}`, 'bi', i)).join('');

  box.querySelectorAll('.fr-val-add').forEach(inp => {
    inp.addEventListener('input', e => { _frBonusDice[+e.target.dataset.bi].add = e.target.value; _frCalcAndRender(); });
  });
  box.querySelectorAll('.fr-val-mult').forEach(inp => {
    inp.addEventListener('input', e => { _frBonusDice[+e.target.dataset.bi].mult = e.target.value; _frCalcAndRender(); });
  });
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

function _frLineHtml(fi, line) {
  const isEvent = String(line.catalogIdx || '').startsWith('e');
  return `
    <div class="fr-slot__field">
      <span class="fr-slot__field-lbl">프론티어 잠재</span>
      <select class="sel fr-line-cat" data-fi="${fi}">
        ${_frLineOptions(fi, isEvent ? '' : line.catalogIdx)}
      </select>
    </div>
    <div class="fr-slot__field">
      <span class="fr-slot__field-lbl">이벤트 잠재</span>
      <select class="sel fr-line-cat-event" data-fi="${fi}">
        ${_frLineEventOptions(fi, isEvent ? line.catalogIdx : '')}
      </select>
    </div>`;
}

const FR_RANKS = [['common', '커먼'], ['rare', '레어'], ['epic', '에픽'], ['unique', '유니크']];

function _frLineOptions(fi, selectLabel) {
  const D = window.FR_CATALOG; if (!D) return '<option value="">데이터 로딩 중...</option>';
  const rank = (_frTeam[fi].rank || 'unique').toLowerCase();
  const rankKey = rank.toUpperCase();
  const pool = D[rankKey] || [];
  const fmt = e => {
    const parts = [];
    if (e.add != null) parts.push(`Dice Total ${e.add > 0 ? '+' : ''}${e.add}`);
    if (e.mult != null) parts.push(`x${e.mult}`);
    return `${e.label} (${parts.join(', ')})`;
  };
  const opts = pool.map((e, idx) => `<option value="${idx}"${String(idx) === String(selectLabel) ? ' selected' : ''}>${fmt(e)}</option>`).join('');
  return `<option value="">— None —</option>${opts}`;
}

/* 이벤트 잠재는 값이 "몇 마리가 조건에 맞는지"에 곱해지므로 표기에 "마리당"을 붙여
   일반 잠재와 헷갈리지 않게 한다. value는 "e{idx}"로 구분한다. */
function _frLineEventOptions(fi, selectLabel) {
  const rankKey = (_frTeam[fi].rank || 'unique').toUpperCase();
  const EG = window.FR_EVENT_GROUPS || [];
  const eventPool = (window.FR_EVENT_CATALOG && window.FR_EVENT_CATALOG[rankKey]) || [];
  const fmtEvent = e => {
    const parts = [];
    if (e.add != null) parts.push(`Dice Total ${e.add > 0 ? '+' : ''}${e.add}`);
    if (e.mult != null) parts.push(`x${e.mult}`);
    if (e.groupKey) {
      const g = EG.find(x => x.key === e.groupKey);
      return `${g ? g.label : e.groupKey} 마리당 (${parts.join(', ')})`;
    }
    return `${e.label} (${parts.join(', ')})`;
  };
  const opts = eventPool.map((e, idx) => `<option value="e${idx}"${'e' + idx === String(selectLabel) ? ' selected' : ''}>${fmtEvent(e)}</option>`).join('');
  return `<option value="">— None —</option>${opts}`;
}

/* 속성/타입은 평소엔 접혀 있다가 누르면 그림 목록이 펼쳐지는 드롭다운으로 고른다.
   네이티브 select는 option 안에 이미지를 못 넣어서 직접 만든다. */
function _frIconDropdown(prefix, fi, list, iconFn, cur) {
  const curSrc = cur ? iconFn(cur) : '';
  const curHasIcon = curSrc && curSrc !== FR_BLANK_ICON;
  const items = [`<button type="button" class="fr-dd__item" data-${prefix}="${fi}" data-val="">— None —</button>`]
    .concat(list.map(v => {
      const src = iconFn(v);
      const hasIcon = src !== FR_BLANK_ICON;
      return `<button type="button" class="fr-dd__item${v === cur ? ' active' : ''}" data-${prefix}="${fi}" data-val="${v}">
        ${hasIcon ? `<img src="${src}" alt="">` : ''}<span>${v}</span>
      </button>`;
    }));
  return `
    <div class="fr-dd" id="fr${prefix}Dd${fi}">
      <button type="button" class="fr-dd__trigger" data-toggle="${fi}">
        ${curHasIcon ? `<img src="${curSrc}" alt="">` : ''}<span>${cur || '— None —'}</span>
        <span class="fr-dd__caret">▾</span>
      </button>
      <div class="fr-dd__menu" hidden>${items.join('')}</div>
    </div>`;
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
      _frRenderTeam();
      _frCalcAndRender();
    });
  });
  /* 잠재는 1개뿐이라 일반/이벤트 두 드롭다운 중 하나만 값을 가질 수 있다 —
     한쪽에서 고르면 다른 쪽은 자동으로 "선택 안 함"으로 되돌린다. */
  box.querySelectorAll('.fr-line-cat').forEach(sel => {
    sel.addEventListener('change', e => {
      const fi = +e.target.dataset.fi;
      const rankKey = (_frTeam[fi].rank || 'unique').toUpperCase();
      const val = e.target.value;
      const pool = (window.FR_CATALOG && window.FR_CATALOG[rankKey]) || [];
      const entry = val !== '' ? pool[+val] : null;
      _frTeam[fi].line = {
        catalogIdx: val,
        add: entry && entry.add != null ? entry.add : '',
        mult: entry && entry.mult != null ? entry.mult : '',
      };
      _frRenderTeam();
      _frCalcAndRender();
    });
  });
  box.querySelectorAll('.fr-line-cat-event').forEach(sel => {
    sel.addEventListener('change', e => {
      const fi = +e.target.dataset.fi;
      const rankKey = (_frTeam[fi].rank || 'unique').toUpperCase();
      const val = e.target.value;
      const pool = (window.FR_EVENT_CATALOG && window.FR_EVENT_CATALOG[rankKey]) || [];
      const entry = val !== '' ? pool[+val.slice(1)] : null;
      _frTeam[fi].line = {
        catalogIdx: val,
        add: entry && entry.add != null ? entry.add : '',
        mult: entry && entry.mult != null ? entry.mult : '',
        groupKey: entry ? entry.groupKey : undefined,
      };
      _frRenderTeam();
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

  document.addEventListener('click', () => {
    document.querySelectorAll('#sec-frontier .fr-dd__menu').forEach(m => { m.hidden = true; });
  });

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">미스틱 프론티어 계산기</h2></div>

    <!-- 위: 팀 구성 (한 화면 전체 폭) -->
    <div class="card">
      <div class="card__title">팀 구성 — 패밀리어 3마리</div>
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

      <div class="card__title mt16">보너스 주사위 (선택)</div>
      <div id="frBonusDice" class="mt8"></div>

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
    </div>`;

  ['frDice1', 'frDice2', 'frDice3', 'frTarget'].forEach(id => {
    document.getElementById(id).addEventListener('input', _frCalcAndRender);
    document.getElementById(id).addEventListener('change', _frCalcAndRender);
  });
  _frRenderTeam();
  _frRenderBonusDice();
  _frCalcAndRender();
}
