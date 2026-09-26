/* ═══════════════════════════════════════════════════════════
   소울 증폭 데이터 (2026-09-17 정식 업데이트)

   [증폭 성공률·메소 비용·게이지] — 공식 패치노트 기준.
     https://maplestory.nexon.com/news/update/813
   보조로 참고한 유저 정리글:
     https://www.inven.co.kr/board/maple/5974/7175972

   [실패할 때마다 확률이 오른다는 것] — 처음엔 "게이지 100%에서 확정 성공"만
   구현했는데, 그건 별개 규칙이고 성공률 자체도 실패마다 오른다(사용자 확인).
   1회 실패당 상승분(failInc)은 위 인벤글의 "약식 기대값" 역산치를 썼다.

   [잠재능력이 3줄이라는 것] — 실제 게임 스트리밍 화면 캡처로 확인됨(사용자
   제공). 처음엔 "7종 중 1개만 부여"로 잘못 만들었었다 — 되돌리지 말 것.
   그 화면에서 STR/DEX/LUK이 개별 옵션으로(올스탯으로 묶이지 않고) 나오는
   것도 확인됐고, 같은 옵션(공격력)이 한 아이템에 두 줄 겹쳐 나오는 것도
   확인됐다 → 3줄을 옵션 풀에서 중복 허용, 동일 확률로 각각 독립적으로 뽑는
   방식으로 구현.

   [옵션별 수치 — 2026-09-26 재수정] 처음엔 "등급×단계별 랜덤 범위"로 잘못
   만들었었다. 사용자가 실제 게임에서 확인한 바로는 랜덤이 아니라:
     1) 수치 = 0.5 × 등급랭크(레어1·에픽2·유니크3·레전드리4) × 단계, 고정값.
        (유니크 1단계 1.5%, 레전드리 1단계 2%, 2단계 3%/4%로 실측 확인됨)
     2) 3줄 중 1줄은 "잠재 자체 등급"의 값, 나머지 2줄은 "그 한 단계 아래
        등급"의 값이 뜬다(레어는 아래 등급이 없어 3줄 다 레어 값).
        예: 에픽 잠재 → 에픽/레어/레어, 유니크 잠재 → 유니크/에픽/에픽.
     3) 낮은 확률로 이 규칙을 벗어난 "이탈" 등급도 나온다고 함 — 정확한
        확률을 몰라서 이번엔 구현 안 함(TODO, 확인되면 추가).
   레어(0.5%)·에픽(1%) 쪽은 사용자가 직접 확인한 값이 아니라, 확인된 유니크
   (1.5%)·레전드리(2%) 두 지점과 정확히 들어맞는 공식(0.5×랭크×단계)을 그대로
   확장한 값이다 — 틀렸을 수 있으니 실측되면 고칠 것.
   STR/DEX/INT/LUK은 스샷에서 "LUK +8"(고정치, %아님) 한 건만 확인돼서 표를
   만들 근거가 부족해 이름만 보여준다. 그 외(올스탯·Max HP·크리티컬 확률)도
   수치 자료가 없어 이름만.
   ═══════════════════════════════════════════════════════════ */

const SOUL_STAGES = [1, 2, 3, 4];
const SOUL_POT_LINES = 3; // 잠재능력 줄 수(실측 확인)

// 단계별 증폭 성공률/메소 비용 — 공식.
// 실패할 때마다:
//   1) 성공률 자체가 failInc만큼 오른다(다음 시도부터 base+failInc*실패수).
//   2) 별개로 게이지가 gaugeStep만큼 쌓이고, 게이지가 100%에 닿으면 그 다음
//      시도는 확률과 무관하게 성공이 확정된다(1번 확률이 100%가 되기 전에도).
const SOUL_STAGE_INFO = {
  1: { chance: 0.05,  meso: 500_000_000,   gaugeStep: 0.0400, failInc: 0.010 },
  2: { chance: 0.03,  meso: 1_000_000_000, gaugeStep: 0.0303, failInc: 0.006 },
  3: { chance: 0.02,  meso: 1_750_000_000, gaugeStep: 0.0233, failInc: 0.004 },
  4: { chance: 0.015, meso: 2_750_000_000, gaugeStep: 0.0200, failInc: 0.003 },
};

// 소울 에테르 획득처(표시용) — 공식
const SOUL_ETHER_BOSS = {
  1: '최초의 대적자 · 카링',
  2: '벨로나 · 찬란한 흉성',
  3: '림보 · 발드릭스',
  4: '유피테르',
};

const SOUL_GRADES = ['RARE', 'EPIC', 'UNIQUE', 'LEGENDARY'];
const SOUL_GRADE_LABEL = { RARE: '레어', EPIC: '에픽', UNIQUE: '유니크', LEGENDARY: '레전드리' };
const SOUL_GRADE_RANK = { RARE: 1, EPIC: 2, UNIQUE: 3, LEGENDARY: 4 };

// 등급업 확률 — 공식. 소모 재료는 공지에 없어 재설정 비용을 그대로 빌려 쓴다(placeholder).
const SOUL_GRADEUP = {
  RARE:   { to: 'EPIC',      chance: 0.015    },
  EPIC:   { to: 'UNIQUE',    chance: 0.005875 },
  UNIQUE: { to: 'LEGENDARY', chance: 0.003322 },
};

// 잠재 재설정 비용 — 공식
const SOUL_RESET_MESO = { RARE: 20_000_000, EPIC: 40_000_000, UNIQUE: 65_000_000, LEGENDARY: 88_000_000 };

// 옵션 풀 — 한 줄마다 이 중 하나가 동일 확률로 뽑힌다(중복 허용, 3줄).
// numeric:true 인 것만 화면에 수치를 보여준다(사용자 확인: 공격력/마력/
// 보스데미지/데미지/몬스터 방어율 무시 5개가 수치형).
const SOUL_OPTIONS = [
  { key: 'atk',       label: '공격력',                    numeric: true },
  { key: 'matk',      label: '마력',                      numeric: true },
  { key: 'bossDmg',   label: '보스 몬스터 공격 시 데미지', numeric: true },
  { key: 'dmgPct',    label: '데미지',                    numeric: true },
  { key: 'ignoreDef', label: '몬스터 방어율 무시',        numeric: true },
  { key: 'str',       label: 'STR' },
  { key: 'dex',       label: 'DEX' },
  { key: 'int_',      label: 'INT' },
  { key: 'luk',       label: 'LUK' },
  { key: 'allstat',   label: '올스탯' },
  { key: 'maxhp',     label: 'Max HP' },
  { key: 'crit',      label: '크리티컬 확률' },
];

/* numeric 옵션의 고정 수치(%) — 랜덤이 아니라 등급 랭크와 단계로 정확히
   정해진다(사용자 확인). 소수점 한 자리까지만 남긴다. */
function soulTierValue(grade, stage) {
  const rank = SOUL_GRADE_RANK[grade];
  return Math.round(0.5 * rank * stage * 10) / 10;
}

/* numeric 옵션이면 그 등급·단계의 고정 수치를, 아니면 null을 돌려준다(화면에
   옵션 이름만 뜨게). */
function soulRollValue(optionKey, grade, stage) {
  const opt = SOUL_OPTIONS.find(o => o.key === optionKey);
  if (!opt || !opt.numeric) return null;
  return soulTierValue(grade, stage);
}

function soulPickOption() {
  return SOUL_OPTIONS[Math.floor(Math.random() * SOUL_OPTIONS.length)];
}

/* 3줄 중 1줄은 잠재 자체 등급, 나머지 2줄은 그 한 단계 아래 등급의 수치가
   뜬다(레어는 아래 등급이 없어 3줄 다 레어). 어느 줄이 "자체 등급"인지는
   무작위로 섞는다 — 항상 첫 줄이라는 근거는 없어서. */
function soulLineGrades(ownerGrade) {
  const idx = SOUL_GRADES.indexOf(ownerGrade);
  const belowGrade = SOUL_GRADES[Math.max(0, idx - 1)];
  const arr = idx === 0 ? [ownerGrade, ownerGrade, ownerGrade] : [ownerGrade, belowGrade, belowGrade];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* 잠재능력 한 판 = 3줄. 줄마다 독립적으로 옵션 풀에서 뽑으므로 같은 옵션이
   두 번 겹칠 수 있다(실측 확인됨 — 공격력이 두 줄에 겹친 사례 있었음).
   각 줄의 수치는 그 줄에 배정된 등급(soulLineGrades)과 잠재 단계로 정해진다. */
function soulRollLines(grade, stage) {
  const lineGrades = soulLineGrades(grade);
  return lineGrades.map(g => {
    const opt = soulPickOption();
    return { key: opt.key, label: opt.label, grade: g, value: soulRollValue(opt.key, g, stage) };
  });
}

const SOUL_SOURCE_NOTE =
  '증폭 성공률·게이지·등급업 확률·재설정 비용은 넥슨 공식 패치노트(2026.09.17) 기준입니다. ' +
  '잠재능력은 3줄이고, 그중 1줄은 잠재 자체 등급의 수치, 나머지 2줄은 한 단계 아래 등급의 수치가 ' +
  '나옵니다(공격력·마력·보스 몬스터 공격 시 데미지·데미지·몬스터 방어율 무시 5개 옵션). ' +
  '유니크·레전드리 수치는 사용자 실측 확인값이고, 레어·에픽은 같은 공식(0.5%×등급×단계)으로 ' +
  '확장한 값이라 확인되면 달라질 수 있습니다. 나머지 옵션(STR·DEX·INT·LUK·올스탯·Max HP·크리티컬 ' +
  '확률)은 수치 자료가 없어 옵션 이름만 표시됩니다.';

if (typeof window !== 'undefined') {
  window.SOUL_DATA = {
    STAGES: SOUL_STAGES, POT_LINES: SOUL_POT_LINES, STAGE_INFO: SOUL_STAGE_INFO, ETHER_BOSS: SOUL_ETHER_BOSS,
    GRADES: SOUL_GRADES, GRADE_LABEL: SOUL_GRADE_LABEL, GRADEUP: SOUL_GRADEUP,
    RESET_MESO: SOUL_RESET_MESO, OPTIONS: SOUL_OPTIONS, SOURCE_NOTE: SOUL_SOURCE_NOTE,
  };
}
