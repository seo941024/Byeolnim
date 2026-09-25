/* ═══════════════════════════════════════════════════════════
   소울 증폭 데이터 (2026-09-17 정식 업데이트)

   [증폭 성공률·게이지·등급업 확률·재설정 비용] — 공식 패치노트 기준.
     https://maplestory.nexon.com/news/update/813
   보조로 참고한 유저 정리글:
     https://www.inven.co.kr/board/maple/5974/7175972

   [옵션 종류 7가지] — 공식("위대한 보스 소울" 기준, 동일 확률로 1개 부여).

   [옵션별 수치] — 공격력/마력/보스데미지 3개만 SOUL_ATK_RANGE를 공유해서
   보여준다(자세한 근거는 그 상수 옆 주석 참고). 나머지 4개(올스탯·Max HP·
   크리티컬 확률·몬스터 방어율 무시)는 수치 자료가 없어 옵션 이름만 보여준다.
   ═══════════════════════════════════════════════════════════ */

const SOUL_STAGES = [1, 2, 3, 4];

// 단계별 증폭 성공률/메소 비용/게이지 증가율(1회 실패당) — 공식.
// 게이지가 100%에 닿으면 그다음 시도는 확률과 무관하게 성공 확정된다.
const SOUL_STAGE_INFO = {
  1: { chance: 0.05,  meso: 500_000_000,   gaugeStep: 0.0400 },
  2: { chance: 0.03,  meso: 1_000_000_000, gaugeStep: 0.0303 },
  3: { chance: 0.02,  meso: 1_750_000_000, gaugeStep: 0.0233 },
  4: { chance: 0.015, meso: 2_750_000_000, gaugeStep: 0.0200 },
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

// 등급업 확률 — 공식. 소모 재료는 공지에 없어 재설정 비용을 그대로 빌려 쓴다(placeholder).
const SOUL_GRADEUP = {
  RARE:   { to: 'EPIC',      chance: 0.015    },
  EPIC:   { to: 'UNIQUE',    chance: 0.005875 },
  UNIQUE: { to: 'LEGENDARY', chance: 0.003322 },
};

// 잠재 재설정 비용 — 공식
const SOUL_RESET_MESO = { RARE: 20_000_000, EPIC: 40_000_000, UNIQUE: 65_000_000, LEGENDARY: 88_000_000 };

// 옵션 종류 — 공식(위대한 보스 소울, 7종 동일 확률).
// numeric:true 인 것만 화면에 수치를 보여준다. 공격력/마력/보스데미지는 실제
// 게임에서도 같은 표를 공유하는 옵션이라(물리/마법 캐릭터용으로 이름만 다름)
// 셋 다 SOUL_ATK_RANGE 하나를 같이 쓴다. 나머지 4개는 정확한 수치를 못 찾아
// 옵션 이름만 보여주고 숫자는 안 붙인다.
const SOUL_OPTIONS = [
  { key: 'atk',       label: '공격력',              numeric: true },
  { key: 'matk',      label: '마력',                numeric: true },
  { key: 'bossDmg',   label: '보스 몬스터 공격 시 데미지', numeric: true },
  { key: 'allstat',   label: '올스탯' },
  { key: 'maxhp',     label: 'Max HP' },
  { key: 'crit',      label: '크리티컬 확률' },
  { key: 'ignoreDef', label: '몬스터 방어율 무시' },
];

/* 공격력/마력/보스데미지 공용 수치 범위(%) — [등급][단계-1] = [최소, 최대].
   출처: 인벤 유저 정리글(공격력% 항목만 일부 기재)
     https://www.inven.co.kr/board/maple/5974/7175972
   실제로 적혀 있던 건 레전드리 1~4단계 전부와, 레어/에픽/유니크는 1단계뿐이었다.
   그 실측값들이 전부 "단계 배수(×1,×2,×3,×4)"로 정확히 들어맞아서(레전드리
   1.5~2% → 2단계 3~4% → 3단계 4.5~6% → 4단계 6~8%, 딱 2배·3배·4배),
   비어 있는 칸(레어/에픽/유니크의 2~4단계)도 그 배수 규칙으로 채웠다.
   ⚠ 레어/에픽/유니크의 2~4단계, 그리고 마력·보스데미지가 정말로 공격력과
   완전히 같은 수치인지는 게임 내에서 직접 확인된 게 아니라 추정이다. */
const SOUL_ATK_RANGE = {
  RARE:      [[0.5, 0.5], [1, 1],   [1.5, 1.5], [2, 2]],
  EPIC:      [[0.5, 1],   [1, 2],   [1.5, 3],   [2, 4]],
  UNIQUE:    [[1, 1.5],   [2, 3],   [3, 4.5],   [4, 6]],
  LEGENDARY: [[1.5, 2],   [3, 4],   [4.5, 6],   [6, 8]],
};

/* numeric 옵션이면 [최소,최대]% 사이 값을, 아니면 null을 돌려준다(화면에 옵션
   이름만 뜨게). 소수점 한 자리까지만 남긴다 — 실측값이 0.5% 단위였다. */
function soulRollValue(optionKey, grade, stage) {
  const opt = SOUL_OPTIONS.find(o => o.key === optionKey);
  if (!opt || !opt.numeric) return null;
  const [min, max] = SOUL_ATK_RANGE[grade][stage - 1];
  const raw = min + Math.random() * (max - min);
  return Math.round(raw * 10) / 10;
}

function soulPickOption() {
  return SOUL_OPTIONS[Math.floor(Math.random() * SOUL_OPTIONS.length)];
}

const SOUL_SOURCE_NOTE =
  '증폭 성공률·게이지·등급업 확률·재설정 비용은 넥슨 공식 패치노트(2026.09.17) 기준입니다. ' +
  '공격력·마력·보스 몬스터 공격 시 데미지의 수치는 커뮤니티에서 확보한 일부 실측값(레전드리 전 단계, ' +
  '나머지 등급 1단계)을 단계 배수로 확장한 값이라 근사치이고, 나머지 옵션(올스탯·Max HP·크리티컬 확률·' +
  '몬스터 방어율 무시)은 수치 자료가 없어 옵션 이름만 표시됩니다.';

if (typeof window !== 'undefined') {
  window.SOUL_DATA = {
    STAGES: SOUL_STAGES, STAGE_INFO: SOUL_STAGE_INFO, ETHER_BOSS: SOUL_ETHER_BOSS,
    GRADES: SOUL_GRADES, GRADE_LABEL: SOUL_GRADE_LABEL, GRADEUP: SOUL_GRADEUP,
    RESET_MESO: SOUL_RESET_MESO, OPTIONS: SOUL_OPTIONS, SOURCE_NOTE: SOUL_SOURCE_NOTE,
  };
}
