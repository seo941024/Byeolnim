/* =============================================
   data_gearcompare.js — 장비 교체 비교용 무기상수 표

   출처: 나무위키 "메이플스토리/스탯" 문서(2026-09-16 조사). 기본 무기 종류별
   상수 + 문서에 명시된 직업별 예외(히어로/팔라딘)만 반영했다. 그 외 직업의
   무기상수는 이 문서에 없어서 못 넣었다 — 필요하면 직접 입력칸에 수치를
   적어 넣을 수 있게 만들어뒀다(GC_WEAPON_CONST 목록은 "채우기" 편의용일 뿐,
   계산은 항상 입력창의 실제 숫자로 한다).
   ============================================= */

const GC_WEAPON_CONST = [
  { key: 'axe_mace_staff_wand', label: '한손도끼 · 한손둔기 · 스태프 · 완드', const: 1.2 },
  { key: 'sword1', label: '한손검', const: 1.24 },
  { key: 'bow_dualbowgun_dagger', label: '활 · 듀얼보우건 · 단검', const: 1.3 },
  { key: 'cane', label: '케인', const: 1.3 },
  { key: 'shining_rod', label: '샤이닝 로드', const: 1.3 },
  { key: 'energy_sword', label: '에너지 소드', const: 1.3125 },
  { key: 'sword2_axe2_mace2', label: '두손검 · 두손도끼 · 두손둔기', const: 1.34 },
  { key: 'crossbow', label: '석궁', const: 1.35 },
  { key: 'desperado', label: '데스페라도', const: 1.2 },
  { key: 'spear_polearm', label: '창 · 폴암 · 대검', const: 1.49 },
  { key: 'gun_handcannon', label: '건 · 핸드캐논', const: 1.5 },
  { key: 'knuckle_soulshooter', label: '너클 · 소울슈터', const: 1.7 },
  { key: 'clawguard', label: '아대', const: 1.75 },
];

/* 문서에 직접 명시된 직업별 예외만 — 나머지 직업은 위 기본표를 그대로 쓴다.
   (예: 나이트로드는 단검 1.3 그대로, 시프계는 별도 언급이 없었음) */
const GC_JOB_OVERRIDES = [
  { job: '히어로', weaponKey: 'sword1', label: '히어로 — 한손검/도끼', const: 1.34 },
  { job: '히어로', weaponKey: 'sword2_axe2_mace2', label: '히어로 — 두손검/도끼', const: 1.44 },
  { job: '팔라딘', weaponKey: 'axe_mace_staff_wand', label: '팔라딘 — 한손둔기', const: 1.24 },
];
