/* data_frontier.js를 만드는 스크립트.

   미스틱 프론티어 옵션이 바뀌면(이벤트 교체 등) 이걸 다시 돌리면 된다:

     node tools/gen_frontier_data.js

   원본을 알아서 받아서 GMS_WEEK_BOSS/data_frontier.js를 덮어쓴다.
   원본은 게임 파일을 그대로 덤프한 것이라 문구·수치가 인게임과 같다.
   손으로 옮겨적다 옵션을 통째로 빠뜨린 적이 있어서 생성 방식으로 바꿨다. */

const fs = require('fs');
const path = require('path');

const SRC = 'https://masonym.dev/familiar_data/familiar_options.json';
const OUT = path.join(__dirname, '..', 'data_frontier.js');

const GROUPS = [
  { key: 'fire_ice', re: /Fire or Ice element/, match: [{ f: 'element', v: 'Fire' }, { f: 'element', v: 'Ice' }] },
  { key: 'lightning_poison', re: /Electric or Poison element/, match: [{ f: 'element', v: 'Lightning' }, { f: 'element', v: 'Poison' }] },
  { key: 'holy_dark', re: /Holy or Dark element/, match: [{ f: 'element', v: 'Holy' }, { f: 'element', v: 'Dark' }] },
  { key: 'human_beast', re: /Human or Beast type/, match: [{ f: 'type', v: 'Human' }, { f: 'type', v: 'Beast' }] },
  { key: 'plant_reptile', re: /Plant or Reptile type/, match: [{ f: 'type', v: 'Plant' }, { f: 'type', v: 'Reptile' }] },
  { key: 'aquatic_mech', re: /Aquatic or Mechanical type/, match: [{ f: 'type', v: 'Aquatic' }, { f: 'type', v: 'Mechanical' }] },
  { key: 'fairy_devil', re: /Fairy or Devil type/, match: [{ f: 'type', v: 'Fairy' }, { f: 'type', v: 'Devil' }] },
  { key: 'non_undead', re: /non-elemental or Undead type/, match: [{ f: 'element', v: 'Non-elemental' }, { f: 'type', v: 'Undead' }] },
];

function render(desc, lv) {
  // 긴 키부터 치환해야 #mul이 #mulx의 앞부분만 갉아먹지 않는다.
  const keys = Object.keys(lv).sort((a, b) => b.length - a.length);
  let s = desc;
  keys.forEach(k => { s = s.split('#' + k).join(String(lv[k])); });
  return s.replace(/\s+/g, ' ').trim();
}

const PAIR = { 'first and second': [0, 1], 'first and third': [0, 2], 'second and third': [1, 2] };
const NTH = { first: 0, second: 1, third: 2 };

/* 원본 설명문을 기계가 판정할 수 있는 조건으로 바꾼다. 문구가 템플릿이라 규칙으로 다 잡힌다.
   조건이 없는 상시 옵션은 always, 확률만 바꿔서 점수엔 못 넣는 건 chance. */
function parseCond(desc, lv, group) {
  const D = desc;
  if (group) return { t: 'group', key: group.key };
  if (lv.x != null) return { t: 'chance' };

  let m;
  if ((m = D.match(/If an? ([\w-]+)[- ]?elemental Familiar is on your active lineup/i))) {
    const raw = m[1].replace(/-$/, '');
    const v = /^non$|^non-elemental$/i.test(raw) ? 'Non-elemental' : raw;
    return { t: 'elem', v };
  }
  if ((m = D.match(/If an? (\w+) type Familiar is on your active lineup/))) return { t: 'type', v: m[1] };
  if (/all Familiars on your active lineup have the same element/.test(D)) return { t: 'sameElem' };
  if (/all Familiars on your active lineup have a different element/.test(D)) return { t: 'diffElem' };
  if (/all Familiars on your active lineup have the same type/.test(D)) return { t: 'sameType' };
  if (/all Familiars on your active lineup have a different type/.test(D)) return { t: 'diffType' };

  if ((m = D.match(/If the (first|second|third) die rolls an (odd|even) number/))) return { t: m[2] === 'odd' ? 'dieOdd' : 'dieEven', i: NTH[m[1]] };
  if (/If all dice roll an odd number/.test(D)) return { t: 'allOdd' };
  if (/If all dice roll an even number/.test(D)) return { t: 'allEven' };
  if (/If the three dice roll consecutive numbers/.test(D)) return { t: 'consec' };
  if ((m = D.match(/If the (first and second|first and third|second and third) dice are each #?\w* ?or more/))) return { t: 'pairMin', pair: PAIR[m[1]], w: lv.w };
  if ((m = D.match(/If the (first and second|first and third|second and third) dice match/))) return { t: 'pairMatch', pair: PAIR[m[1]] };
  if ((m = D.match(/If a die rolls a (\d)/))) return { t: 'anyDie', n: +m[1] };
  if ((m = D.match(/If all three dice roll a (\d)/))) return { t: 'allDie', n: +m[1] };
  if (/If all three dice are each .* or more/.test(D)) return { t: 'allMin', w: lv.w };
  if (/If all dice roll 3 or less/.test(D)) return { t: 'allMax', w: 3 };
  if (/If all dice roll 4 or higher/.test(D)) return { t: 'allMin', w: 4 };
  if (/Prevents dice from rolling over/.test(D)) return { t: 'prevent', w: lv.w };
  return null;
}

function build(d) {
const base = {}, event = {};
['COMMON', 'RARE', 'EPIC', 'UNIQUE'].forEach(r => { base[r] = []; event[r] = []; });

// 레전드리는 게임에 없어서 뺀다.
const mf = d.filter(o => o.system === 'Mystic Frontier' && o.rarity !== 'Legendary');
let skippedExpired = 0, unparsed = [];
mf.forEach(o => {
  const lv = o.levels['1'] || {};
  // 설명에 종료일이 박제된 지난 이벤트는 지금 못 뽑으니 뺀다.
  if (/^\[EVENT\]/.test(o.description)) { skippedExpired++; return; }

  const label = render(o.description, lv);
  const g = GROUPS.find(x => x.re.test(o.description));
  const cond = parseCond(o.description, lv, g);
  if (!cond) unparsed.push(o.description);

  const add = lv.add != null ? lv.add : (lv.sub != null ? -lv.sub : null);
  const mult = lv.mul != null ? lv.mul : null;

  const entry = { label, add, mult, cond };
  if (g) entry.groupKey = g.key;

  (o.endTime ? event : base)[o.rarity.toUpperCase()].push(entry);
});

const j = v => JSON.stringify(v);
const dump = obj => '{\n' + Object.keys(obj).map(r =>
  `  ${r}: [\n${obj[r].map(e => '    ' + j(e)).join(',\n')}\n  ]`
).join(',\n') + '\n}';

const out = `/* 미스틱 프론티어 잠재 옵션 카탈로그.

   출처: masonym.dev/familiar_data/familiar_options.json — 게임 파일을 그대로 덤프한
   데이터라 문구와 수치가 인게임과 같다. 이 파일은 스크립트로 통째로 생성하니
   손으로 고치지 말고 원본을 다시 받아서 다시 생성해야 한다.

   레전드리는 아직 게임에 없어서 뺐고, 설명에 종료일이 박제된 지난 이벤트도 뺐다.

   cond는 이 옵션이 언제 발동하는지를 기계가 판정할 수 있게 옮긴 것이다.
   프론티어는 조건이 맞을 때만 값이 붙어서, 이걸 안 보고 더하면 점수가 틀린다.
   cond.t === 'chance'는 주사위 눈이 나올 확률만 바꿔서 점수식엔 안 들어간다.
   groupKey가 붙은 줄은 값이 고정이 아니라 팀에서 조건에 맞는 장수만큼 곱해진다. */

const FR_EVENT_GROUPS = [
${GROUPS.map(g => '  ' + j({ key: g.key, match: g.match })).join(',\n')}
];

const FR_CATALOG = ${dump(base)};

const FR_EVENT_CATALOG = ${dump(event)};

if (typeof window !== 'undefined') {
  window.FR_CATALOG = FR_CATALOG;
  window.FR_EVENT_GROUPS = FR_EVENT_GROUPS;
  window.FR_EVENT_CATALOG = FR_EVENT_CATALOG;
}
if (typeof module !== 'undefined') module.exports = { FR_CATALOG, FR_EVENT_GROUPS, FR_EVENT_CATALOG };
`;

fs.writeFileSync(OUT, out);
console.log('지난 이벤트 제외:', skippedExpired);
Object.keys(base).forEach(r => console.log(' ', r.padEnd(7), '일반', base[r].length, '/ 이벤트', event[r].length));

// 조건을 못 읽은 줄이 있으면 그 옵션은 점수에 안 붙는다 — 조용히 넘어가면 안 된다.
if (unparsed.length) {
  console.error('\n조건 해석 실패', unparsed.length, '건 — parseCond에 규칙을 추가해야 한다:');
  [...new Set(unparsed)].forEach(u => console.error('  ', u));
  process.exitCode = 1;
} else {
  console.log('\n조건 해석 실패 0건 →', OUT);
}
}

fetch(SRC)
  .then(r => { if (!r.ok) throw new Error(`${SRC} → HTTP ${r.status}`); return r.json(); })
  .then(build)
  .catch(e => { console.error('원본을 받지 못했다:', e.message); process.exit(1); });
