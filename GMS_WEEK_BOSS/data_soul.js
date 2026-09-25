/* ═══════════════════════════════════════════════════════════
   소울 증폭 데이터 (2026-09-17 정식 업데이트)

   [증폭 성공률·게이지·등급업 확률·재설정 비용] — 공식 패치노트 기준.
     https://maplestory.nexon.com/news/update/813
   보조로 참고한 유저 정리글:
     https://www.inven.co.kr/board/maple/5974/7175972

   [옵션 종류 7가지] — 공식("위대한 보스 소울" 기준, 동일 확률로 1개 부여).

   ⚠ [옵션별 정확한 수치 범위] — 공식 자료를 못 찾았다. 패치노트가 수치를
   이미지 표로 넣어놔서 텍스트로 못 읽었고, 커뮤니티 글에도 없었다.
   사용자 요청대로 "대충" 채운 placeholder다 — 등급이 오를수록, 증폭
   단계가 오를수록 커지는 형태로만 맞춰뒀다. 실제 수치가 확인되면
   SOUL_VALUE_RANGE와 SOUL_OPTION_MULT만 갈아치우면 된다.
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

// 옵션 종류 — 공식(위대한 보스 소울, 7종 동일 확률)
const SOUL_OPTIONS = [
  { key: 'atk',       label: '공격력' },
  { key: 'matk',      label: '마력' },
  { key: 'allstat',   label: '올스탯' },
  { key: 'maxhp',     label: 'Max HP' },
  { key: 'crit',      label: '크리티컬 확률' },
  { key: 'ignoreDef', label: '몬스터 방어율 무시' },
  { key: 'bossDmg',   label: '보스 몬스터 공격 시 데미지' },
];

// ⚠ placeholder — 옵션별 배율. 올스탯·크리티컬은 보통 다른 옵션보다 낮게,
// MaxHP는 %치고 크게 잡히는 경향을 흉내만 냈다.
const SOUL_OPTION_MULT = { atk: 1, matk: 1, ignoreDef: 1, bossDmg: 1, crit: 0.6, allstat: 0.6, maxhp: 2 };

// ⚠ placeholder — [등급][단계-1] = [최소, 최대] (%). 등급·단계가 오를수록 커지게만 맞춤.
const SOUL_VALUE_RANGE = {
  RARE:      [[1, 2],  [2, 3],  [3, 4],  [4, 5]],
  EPIC:      [[3, 4],  [4, 5],  [5, 6],  [6, 7]],
  UNIQUE:    [[5, 6],  [6, 7],  [7, 8],  [8, 9]],
  LEGENDARY: [[7, 8],  [8, 9],  [9, 10], [10, 12]],
};

function soulRollValue(optionKey, grade, stage) {
  const [min, max] = SOUL_VALUE_RANGE[grade][stage - 1];
  const raw = min + Math.random() * (max - min);
  const mult = SOUL_OPTION_MULT[optionKey] || 1;
  return Math.max(1, Math.round(raw * mult));
}

function soulPickOption() {
  return SOUL_OPTIONS[Math.floor(Math.random() * SOUL_OPTIONS.length)];
}

const SOUL_SOURCE_NOTE =
  '증폭 성공률·게이지·등급업 확률·재설정 비용은 넥슨 공식 패치노트(2026.09.17) 기준입니다. ' +
  '다만 옵션별 정확한 수치 범위는 공개 자료를 찾지 못해, 등급·단계가 오를수록 커지는 형태로만 ' +
  '맞춘 임시값입니다. 실제 수치가 확인되는 대로 교체됩니다.';

if (typeof window !== 'undefined') {
  window.SOUL_DATA = {
    STAGES: SOUL_STAGES, STAGE_INFO: SOUL_STAGE_INFO, ETHER_BOSS: SOUL_ETHER_BOSS,
    GRADES: SOUL_GRADES, GRADE_LABEL: SOUL_GRADE_LABEL, GRADEUP: SOUL_GRADEUP,
    RESET_MESO: SOUL_RESET_MESO, OPTIONS: SOUL_OPTIONS, SOURCE_NOTE: SOUL_SOURCE_NOTE,
  };
}
