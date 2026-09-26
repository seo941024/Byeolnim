/* ═══════════════════════════════════════════════════════════
   소울 증폭 데이터 (2026-09-17 정식 업데이트)

   [증폭 성공률·메소 비용·게이지] — 공식 패치노트 기준.
     https://maplestory.nexon.com/news/update/813
   보조로 참고한 유저 정리글:
     https://www.inven.co.kr/board/maple/5974/7175972
   2026-09-26 나무위키 "소울웨폰" 문서(사용자 제공 스크린샷)로 재확인함 —
   실패당 상승분/게이지스텝/게이지완충횟수 표가 지금 값과 정확히 일치
   (1단계 1%·4.00%·25, 2단계 0.6%·3.03%·33, 3단계 0.4%·2.33%·43,
   4단계 0.3%·2.00%·50). 등급업 확률·재설정 비용도 동일하게 일치 확인됨.

   [잠재능력이 3줄, 첫 줄은 항상 잠재 자체 등급이라는 것 — 2026-09-26
   나무위키 "소울 잠재능력 재설정 > 등급 설정확률" 표로 확정] 첫 번째 옵션은
   100% 잠재 자체 등급. 두·세 번째 옵션은 각각 독립적으로:
     - 레어 잠재: 1/51 확률로 레어(자체), 50/51 확률로 "노멀"(레어보다 낮은,
       가중치 표가 없는 등급 — 데이터가 없어 수치는 안 보여줌)
     - 에픽 잠재: 1/21 확률로 에픽(자체), 20/21 확률로 레어(한 단계 아래)
     - 유니크 잠재: 1/51 확률로 유니크(자체), 50/51 확률로 에픽(한 단계 아래)
       (원문 표는 "1/51"로만 보였는데 51분모 기준 나머지 확률이 안 맞아서
       50/51로 보정 — 레어·유니크 두 분모가 같은 51이라 일관성 있음)
     - 레전드리 잠재: 1/201 확률로 레전드리(자체), 200/201 확률로 유니크
   즉 "이탈"은 실제로는 낮은 확률로 한 단계 아래가 아니라 자체 등급이 다시
   나오는 경우를 가리키는 말이었다(전에 반대로 이해해서 구현했었음).

   [옵션 풀 + 등급별 가중치 — 2026-09-26 나무위키 "옵션 등장 가중치" 표로
   확정, 사용자 스크린샷 제공] 아래 w:{RARE,EPIC,UNIQUE,LEGENDARY} 그대로
   옮김(도합 51/34/43/39로 원문 합계와 일치 확인). "노멀" 등급 줄은 가중치
   표가 없어 임시로 레어 표를 재사용한다(가정치 — 확인되면 고칠 것).

   [옵션 수치 크기] 나무위키 표는 가중치만 있고 실제 %수치는 안 나와 있다.
   %형 옵션(numeric:true)은 여전히 "0.5 × 등급랭크(레어1·에픽2·유니크3·
   레전드리4) × 단계"로 계산한다 — 유니크 1단계 1.5%·레전드리 1단계 2%·
   2단계 3%/4%는 사용자 실측 확인값이고, 레어(0.5%)·에픽(1%)은 그 공식을
   그대로 확장한 추정치라 확인되면 달라질 수 있다. "노멀" 등급 줄은 수치
   자료가 전혀 없어 null(이름만 표시).
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
const SOUL_GRADE_LABEL = { RARE: '레어', EPIC: '에픽', UNIQUE: '유니크', LEGENDARY: '레전드리', NORMAL: '노멀' };
const SOUL_GRADE_RANK = { RARE: 1, EPIC: 2, UNIQUE: 3, LEGENDARY: 4 };

// 등급업 확률 — 공식. 소모 재료는 공지에 없어 재설정 비용을 그대로 빌려 쓴다(placeholder).
const SOUL_GRADEUP = {
  RARE:   { to: 'EPIC',      chance: 0.015    },
  EPIC:   { to: 'UNIQUE',    chance: 0.005875 },
  UNIQUE: { to: 'LEGENDARY', chance: 0.003322 },
};

// 잠재 재설정 비용 — 공식
const SOUL_RESET_MESO = { RARE: 20_000_000, EPIC: 40_000_000, UNIQUE: 65_000_000, LEGENDARY: 88_000_000 };

// 두·세 번째 옵션 줄이 "잠재 자체 등급"으로 나올 확률과, 아닐 때 내려가는 등급.
const SOUL_LINE_OWN_PROB = { RARE: 1 / 51, EPIC: 1 / 21, UNIQUE: 1 / 51, LEGENDARY: 1 / 201 };
const SOUL_LINE_BELOW = { RARE: 'NORMAL', EPIC: 'RARE', UNIQUE: 'EPIC', LEGENDARY: 'UNIQUE' };

// 옵션 풀 — w는 등급별 가중치(나무위키 표 그대로). numeric:true 인 것만
// 화면에 %수치를 보여준다.
const SOUL_OPTIONS = [
  { key: 'str',        label: 'STR 증가',                   numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'dex',        label: 'DEX 증가',                   numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'int_',       label: 'INT 증가',                   numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'luk',        label: 'LUK 증가',                   numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'maxhp',      label: '최대 HP 증가',                numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'maxmp',      label: '최대 MP 증가',                numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'speed',      label: '이동속도 증가',               numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'jump',       label: '점프력 증가',                 numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'atk',        label: '공격력 증가',                 numeric: false, w: { RARE: 2, EPIC: 0, UNIQUE: 0, LEGENDARY: 1 } },
  { key: 'matk',       label: '마력 증가',                   numeric: false, w: { RARE: 2, EPIC: 0, UNIQUE: 0, LEGENDARY: 1 } },
  { key: 'def',        label: '방어력 증가',                 numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'strPct',     label: 'STR %증가',                  numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'dexPct',     label: 'DEX %증가',                  numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'intPct',     label: 'INT %증가',                  numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'lukPct',     label: 'LUK %증가',                  numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'maxhpPct',   label: '최대 HP %증가',               numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'maxmpPct',   label: '최대 MP %증가',               numeric: true,  w: { RARE: 2, EPIC: 3, UNIQUE: 3, LEGENDARY: 3 } },
  { key: 'atkPct',     label: '공격력% 증가',                numeric: true,  w: { RARE: 1, EPIC: 2, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'matkPct',    label: '마력% 증가',                  numeric: true,  w: { RARE: 1, EPIC: 2, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'crit',       label: '크리티컬 확률 증가',           numeric: true,  w: { RARE: 2, EPIC: 1, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'dmgPct',     label: '데미지 %증가',                numeric: true,  w: { RARE: 1, EPIC: 1, UNIQUE: 1, LEGENDARY: 1 } },
  { key: 'allstat',    label: '올스탯 증가',                 numeric: false, w: { RARE: 3, EPIC: 0, UNIQUE: 0, LEGENDARY: 0 } },
  { key: 'allstatPct', label: '올스탯 %증가',                numeric: true,  w: { RARE: 0, EPIC: 2, UNIQUE: 2, LEGENDARY: 2 } },
  { key: 'hpDrain',    label: '공격 시 일정 확률로 HP 회복',  numeric: false, w: { RARE: 0, EPIC: 3, UNIQUE: 3, LEGENDARY: 0 } },
  { key: 'mpDrain',    label: '공격 시 일정 확률로 MP 회복',  numeric: false, w: { RARE: 0, EPIC: 3, UNIQUE: 3, LEGENDARY: 0 } },
  { key: 'bossDmg',    label: '보스 공격 시 데미지 % 증가',   numeric: true,  w: { RARE: 0, EPIC: 0, UNIQUE: 1, LEGENDARY: 1 } },
  { key: 'ignoreDef',  label: '몬스터 방어율 무시',          numeric: true,  w: { RARE: 0, EPIC: 2, UNIQUE: 1, LEGENDARY: 1 } },
];

/* numeric 옵션의 고정 수치(%) — 랜덤이 아니라 등급 랭크와 단계로 정해진다.
   "노멀"은 랭크·수치 자료가 없어 null. 소수점 한 자리까지만 남긴다. */
function soulTierValue(grade, stage) {
  if (grade === 'NORMAL') return null;
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

/* 등급별 가중치로 옵션 하나를 뽑는다. "노멀"은 가중치 표가 없어 레어 표를
   임시로 재사용한다(가정치). */
function soulPickOption(grade) {
  const g = grade === 'NORMAL' ? 'RARE' : (grade || 'RARE');
  const pool = SOUL_OPTIONS.filter(o => (o.w[g] || 0) > 0);
  const total = pool.reduce((s, o) => s + o.w[g], 0);
  let r = Math.random() * total;
  for (const o of pool) {
    r -= o.w[g];
    if (r <= 0) return o;
  }
  return pool[pool.length - 1];
}

/* 두·세 번째 옵션 줄에 배정될 등급 하나를 뽑는다(첫 줄은 항상 잠재 자체 등급). */
function soulLineGradeFor(ownerGrade) {
  return Math.random() < SOUL_LINE_OWN_PROB[ownerGrade] ? ownerGrade : SOUL_LINE_BELOW[ownerGrade];
}

/* 3줄의 등급 배정: 첫 줄은 100% 잠재 자체 등급, 나머지 2줄은 각각 독립적으로
   soulLineGradeFor로 뽑는다(나무위키 "등급 설정확률" 표 기준). */
function soulLineGrades(ownerGrade) {
  return [ownerGrade, soulLineGradeFor(ownerGrade), soulLineGradeFor(ownerGrade)];
}

/* 잠재능력 한 판 = 3줄. 줄마다 배정된 등급의 가중치로 옵션을 뽑으므로 같은
   옵션이 두 번 겹칠 수 있다(실측 확인됨 — 공격력이 두 줄에 겹친 사례 있었음). */
function soulRollLines(grade, stage) {
  const lineGrades = soulLineGrades(grade);
  return lineGrades.map(g => {
    const opt = soulPickOption(g);
    return { key: opt.key, label: opt.label, grade: g, value: soulRollValue(opt.key, g, stage) };
  });
}

const SOUL_SOURCE_NOTE =
  '증폭 성공률·게이지·등급업 확률·재설정 비용, 옵션 풀과 등급별 가중치, 줄 등급 배정 확률은 ' +
  '나무위키 "소울웨폰" 문서 2026.09.26 확인 기준입니다. 옵션 %수치 크기는 표에 없어 유니크·레전드리 ' +
  '실측값 0.5%×등급랭크×단계를 레어·에픽까지 확장한 추정치이며, 확인되면 달라질 수 있습니다. ' +
  '"노멀" 등급 줄은 가중치·수치 자료가 없어 레어 가중치를 임시로 쓰고 수치는 이름만 표시합니다.';

if (typeof window !== 'undefined') {
  window.SOUL_DATA = {
    STAGES: SOUL_STAGES, POT_LINES: SOUL_POT_LINES, STAGE_INFO: SOUL_STAGE_INFO, ETHER_BOSS: SOUL_ETHER_BOSS,
    GRADES: SOUL_GRADES, GRADE_LABEL: SOUL_GRADE_LABEL, GRADEUP: SOUL_GRADEUP,
    RESET_MESO: SOUL_RESET_MESO, OPTIONS: SOUL_OPTIONS, SOURCE_NOTE: SOUL_SOURCE_NOTE,
  };
}
