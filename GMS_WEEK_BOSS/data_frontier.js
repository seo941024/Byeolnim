/* ═══════════════════════════════════════════════
   미스틱 프론티어 잠재 옵션 카탈로그

   출처: masonym.dev/familiars → Familiar Lines → System: Mystic Frontier
   (게임 파일 직파싱. weight는 전부 0이라 확률은 없고, 텍스트·수치만 신뢰할 수 있다)

   구조: FR_CATALOG[등급] = [{ label(영문 원문), add(합계값 또는 null), mult(배율값 또는 null) }, ...]
   실제 게임처럼 한 줄이 합계·배율을 동시에 가질 수 있다.

   레전드리는 팀 구성 카드에서 아직 선택지에 없어서(레어/에픽/유니크만) 뺐다.
   커먼도 카드 등급 선택지엔 없지만, 잠재 2번째 줄이 한 단계 아래 등급에서 나오므로
   (예: 레어 카드의 2번째 잠재는 커먼 풀) 옵션 선택 목록에는 포함해야 한다.
═══════════════════════════════════════════════ */

const FR_CATALOG = {
  COMMON: [
    // 속성 존재형 (7종 x 2변형)
    ...['Fire','Ice','Lightning','Poison','Dark','Holy','Non-elemental'].flatMap(e => [
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 1, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.2 },
    ]),
    // 타입 존재형 (9종 x 2변형)
    ...['Human','Beast','Plant','Aquatic','Reptile','Fairy','Devil','Undead','Mechanical'].flatMap(t => [
      { label: `If a ${t} type Familiar is on your active lineup`, add: 1, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.2 },
    ]),
    { label: 'If all Familiars on your active lineup have the same element', add: 1, mult: null },
    { label: 'If all Familiars on your active lineup have the same element', add: null, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have the same element', add: -1, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have the same element', add: 1, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have a different element', add: 1, mult: null },
    { label: 'If all Familiars on your active lineup have a different element', add: null, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have the same type', add: 1, mult: null },
    { label: 'If all Familiars on your active lineup have the same type', add: null, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have a different type', add: 1, mult: null },
    { label: 'If all Familiars on your active lineup have a different type', add: null, mult: 1.2 },
    // 오버 방지
    { label: 'Prevents dice from rolling over 3', add: null, mult: 1.6 },
    { label: 'Prevents dice from rolling over 4', add: null, mult: 1.4 },
    { label: 'Prevents dice from rolling over 5', add: null, mult: 1.2 },
    // 홀짝 (1/2/3번째 주사위)
    ...['first','second','third'].flatMap(n => [
      { label: `If the ${n} die rolls an odd number`, add: 1, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: -1, mult: 1.4 },
      { label: `If the ${n} die rolls an odd number`, add: 1, mult: 1.2 },
      { label: `If the ${n} die rolls an even number`, add: 1, mult: null },
      { label: `If the ${n} die rolls an even number`, add: -1, mult: 1.4 },
      { label: `If the ${n} die rolls an even number`, add: 1, mult: 1.2 },
    ]),
    // 주사위 합 조건 (짝 + 전체)
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice are each 2 or more`, add: 1, mult: null },
      { label: `If the ${p} dice are each 4 or more`, add: 2, mult: null },
      { label: `If the ${p} dice are each 6 or more`, add: 3, mult: null },
      { label: `If the ${p} dice are each 2 or more`, add: null, mult: 1.2 },
      { label: `If the ${p} dice are each 4 or more`, add: null, mult: 1.4 },
      { label: `If the ${p} dice are each 6 or more`, add: null, mult: 1.6 },
    ]),
    { label: 'If all three dice are each 2 or more', add: 1, mult: null },
    { label: 'If all three dice are each 3 or more', add: 2, mult: null },
    { label: 'If all three dice are each 2 or more', add: null, mult: 1.2 },
    { label: 'If all three dice are each 3 or more', add: null, mult: 1.4 },
    // 일치
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice match`, add: 2, mult: null },
      { label: `If the ${p} dice match`, add: null, mult: 1.4 },
    ]),
    // 연속
    { label: 'If the three dice roll consecutive numbers', add: 3, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: -1, mult: 1.8 },
    { label: 'If the three dice roll consecutive numbers', add: 1, mult: 1.6 },
    // 특정 숫자 (1~6 x 2변형)
    ...[1,2,3,4,5,6].flatMap(n => [
      { label: `If a die rolls a ${n}`, add: 1, mult: null },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.1 },
    ]),
    // 전부 같은 숫자 (1~3만 커먼에 확인됨)
    ...[1,2,3].flatMap(n => [
      { label: `If all three dice roll a ${n}`, add: 6, mult: null },
      { label: `If all three dice roll a ${n}`, add: null, mult: 2 },
      { label: `If all three dice roll a ${n}`, add: null, mult: 1.8 },
      { label: `If all three dice roll a ${n}`, add: null, mult: 1.6 },
    ]),
    { label: 'If all three dice roll a 3', add: -1, mult: 2.2 },
    ...[1,2,3].map(n => ({ label: `If all three dice roll a ${n}`, add: 1, mult: 2 })),
  ],

  RARE: [
    ...['Fire','Ice','Lightning','Poison','Dark','Holy','Non-elemental'].flatMap(e => [
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 3, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 2, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.4 },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.2 },
    ]),
    ...['Human','Beast','Plant','Aquatic','Reptile','Fairy','Devil','Undead','Mechanical'].flatMap(t => [
      { label: `If a ${t} type Familiar is on your active lineup`, add: 3, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: 2, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.4 },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.2 },
    ]),
    { label: 'If all Familiars on your active lineup have the same element', add: 3, mult: null },
    { label: 'If all Familiars on your active lineup have the same element', add: 2, mult: null },
    { label: 'If all Familiars on your active lineup have the same element', add: null, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have the same element', add: null, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have the same element', add: -1, mult: 1.6 },
    { label: 'If all Familiars on your active lineup have the same element', add: -1, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have the same element', add: 1, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have the same element', add: 2, mult: 1.2 },
    { label: 'If all Familiars on your active lineup have a different element', add: 3, mult: null },
    { label: 'If all Familiars on your active lineup have a different element', add: null, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have the same type', add: 3, mult: null },
    { label: 'If all Familiars on your active lineup have the same type', add: null, mult: 1.4 },
    { label: 'If all Familiars on your active lineup have a different type', add: 3, mult: null },
    { label: 'If all Familiars on your active lineup have a different type', add: null, mult: 1.4 },
    { label: 'Prevents dice from rolling over 3', add: null, mult: 1.8 },
    { label: 'Prevents dice from rolling over 4', add: null, mult: 1.6 },
    { label: 'Prevents dice from rolling over 5', add: null, mult: 1.4 },
    ...['first','second','third'].flatMap(n => [
      { label: `If the ${n} die rolls an odd number`, add: 3, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: 2, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: -1, mult: 1.6 },
      { label: `If the ${n} die rolls an odd number`, add: -1, mult: 1.4 },
      { label: `If the ${n} die rolls an even number`, add: 3, mult: null },
      { label: `If the ${n} die rolls an even number`, add: 2, mult: null },
      { label: `If the ${n} die rolls an even number`, add: -1, mult: 1.6 },
      { label: `If the ${n} die rolls an even number`, add: -1, mult: 1.4 },
    ]),
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice are each 2 or more`, add: 3, mult: null },
      { label: `If the ${p} dice are each 4 or more`, add: 4, mult: null },
      { label: `If the ${p} dice are each 6 or more`, add: 5, mult: null },
      { label: `If the ${p} dice are each 2 or more`, add: null, mult: 1.4 },
      { label: `If the ${p} dice are each 4 or more`, add: null, mult: 1.6 },
      { label: `If the ${p} dice are each 6 or more`, add: null, mult: 1.8 },
    ]),
    { label: 'If all three dice are each 2 or more', add: 3, mult: null },
    { label: 'If all three dice are each 3 or more', add: 4, mult: null },
    { label: 'If all three dice are each 2 or more', add: null, mult: 1.4 },
    { label: 'If all three dice are each 3 or more', add: null, mult: 1.6 },
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice match`, add: 5, mult: null },
      { label: `If the ${p} dice match`, add: 4, mult: null },
      { label: `If the ${p} dice match`, add: null, mult: 1.6 },
      { label: `If the ${p} dice match`, add: null, mult: 1.4 },
    ]),
    { label: 'If the three dice roll consecutive numbers', add: 6, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: 5, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: -1, mult: 2 },
    { label: 'If the three dice roll consecutive numbers', add: -1, mult: 1.8 },
    { label: 'If the three dice roll consecutive numbers', add: 1, mult: 1.8 },
    { label: 'If the three dice roll consecutive numbers', add: 2, mult: 1.6 },
    ...[1,2,3,4,5,6].flatMap(n => [
      { label: `If a die rolls a ${n}`, add: 2, mult: null },
      { label: `If a die rolls a ${n}`, add: 1, mult: null },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.2 },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.1 },
    ]),
    ...[1,2,3,4].flatMap(n => [
      { label: `If all three dice roll a ${n}`, add: 9, mult: null },
      { label: `If all three dice roll a ${n}`, add: 8, mult: null },
      { label: `If all three dice roll a ${n}`, add: null, mult: 2.2 },
    ]),
  ],

  EPIC: [
    ...['Fire','Ice','Lightning','Poison','Dark','Holy','Non-elemental'].flatMap(e => [
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 6, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 5, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 4, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.6 },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.4 },
    ]),
    ...['Human','Beast','Plant','Aquatic','Reptile','Fairy','Devil','Undead','Mechanical'].flatMap(t => [
      { label: `If a ${t} type Familiar is on your active lineup`, add: 6, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: 5, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: 4, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.6 },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.4 },
    ]),
    { label: 'Prevents dice from rolling over 3', add: null, mult: 2 },
    { label: 'Prevents dice from rolling over 4', add: null, mult: 1.8 },
    { label: 'Prevents dice from rolling over 5', add: null, mult: 1.6 },
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice are each 2 or more`, add: 6, mult: null },
      { label: `If the ${p} dice are each 4 or more`, add: 7, mult: null },
      { label: `If the ${p} dice are each 6 or more`, add: 8, mult: null },
    ]),
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice match`, add: 8, mult: null },
      { label: `If the ${p} dice match`, add: 7, mult: null },
      { label: `If the ${p} dice match`, add: 6, mult: null },
    ]),
    { label: 'If the three dice roll consecutive numbers', add: 9, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: 8, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: 7, mult: null },
    { label: 'If the three dice roll consecutive numbers', add: -2, mult: 2.2 },
    { label: 'If the three dice roll consecutive numbers', add: -1, mult: 2 },
    { label: 'If the three dice roll consecutive numbers', add: -1, mult: 1.8 },
    { label: 'If the three dice roll consecutive numbers', add: 1, mult: 2 },
    { label: 'If the three dice roll consecutive numbers', add: 2, mult: 1.8 },
    { label: 'If the three dice roll consecutive numbers', add: 3, mult: 1.6 },
  ],

  UNIQUE: [
    ...['Fire','Ice','Lightning','Poison','Dark','Holy','Non-elemental'].flatMap(e => [
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 9, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 8, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: 7, mult: null },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.8 },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.6 },
      { label: `If a ${e} elemental Familiar is on your active lineup`, add: null, mult: 1.4 },
    ]),
    ...['Human','Beast','Plant','Aquatic','Reptile','Fairy','Devil','Undead','Mechanical'].flatMap(t => [
      { label: `If a ${t} type Familiar is on your active lineup`, add: 9, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: 8, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: 7, mult: null },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.8 },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.6 },
      { label: `If a ${t} type Familiar is on your active lineup`, add: null, mult: 1.4 },
    ]),
    /* 4가지 조건(같은 속성/다른 속성/같은 타입/다른 타입) 전부 masonym에서 직접 확인했다.
       다만 "합계 전용 +3" 마지막 줄은 same element에서만 실제로 봤고, 나머지 3개는
       커먼·레어·에픽에서 4개 조건이 항상 같은 수치로 움직인 패턴을 근거로 같이 적용했다 —
       그 패턴이 유니크에서도 깨지지 않는다는 가정이 깔려 있다. */
    ...['same element','a different element','the same type','a different type'].flatMap(cond => [
      { label: `If all Familiars on your active lineup have ${cond}`, add: 9, mult: null },
      { label: `If all Familiars on your active lineup have ${cond}`, add: 8, mult: null },
      { label: `If all Familiars on your active lineup have ${cond}`, add: 7, mult: null },
      { label: `If all Familiars on your active lineup have ${cond}`, add: null, mult: 1.8 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: null, mult: 1.6 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: null, mult: 1.4 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: -2, mult: 2 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: -2, mult: 1.8 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: -1, mult: 1.6 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: 1, mult: 1.8 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: 2, mult: 1.6 },
      { label: `If all Familiars on your active lineup have ${cond}`, add: 3, mult: null },  // 마지막 값(합계 전용) — same element 기준 확인
    ]),
    { label: 'Prevents dice from rolling over 3', add: null, mult: 2.2 },
    { label: 'Prevents dice from rolling over 4', add: null, mult: 2 },
    { label: 'Prevents dice from rolling over 5', add: null, mult: 1.8 },
    ...['first','second','third'].flatMap(n => [
      { label: `If the ${n} die rolls an odd number`, add: 9, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: 8, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: 7, mult: null },
      { label: `If the ${n} die rolls an odd number`, add: -2, mult: 2 },
      { label: `If the ${n} die rolls an odd number`, add: -2, mult: 1.8 },
      { label: `If the ${n} die rolls an odd number`, add: -1, mult: 1.6 },
      { label: `If the ${n} die rolls an odd number`, add: 1, mult: 1.8 },
      { label: `If the ${n} die rolls an odd number`, add: 2, mult: 1.6 },
      { label: `If the ${n} die rolls an odd number`, add: 3, mult: 1.4 },
      { label: `If the ${n} die rolls an even number`, add: 9, mult: null },
      { label: `If the ${n} die rolls an even number`, add: 8, mult: null },
      { label: `If the ${n} die rolls an even number`, add: 7, mult: null },
      { label: `If the ${n} die rolls an even number`, add: -2, mult: 2 },
      { label: `If the ${n} die rolls an even number`, add: -2, mult: 1.8 },
      { label: `If the ${n} die rolls an even number`, add: -1, mult: 1.6 },
      { label: `If the ${n} die rolls an even number`, add: 1, mult: 1.8 },
      { label: `If the ${n} die rolls an even number`, add: 2, mult: 1.6 },
      { label: `If the ${n} die rolls an even number`, add: 3, mult: 1.4 },
    ]),
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice are each 2 or more`, add: 9, mult: null },
      { label: `If the ${p} dice are each 4 or more`, add: 10, mult: null },
      { label: `If the ${p} dice are each 6 or more`, add: 11, mult: null },
      { label: `If the ${p} dice are each 2 or more`, add: null, mult: 1.8 },
      { label: `If the ${p} dice are each 4 or more`, add: null, mult: 2 },
      { label: `If the ${p} dice are each 6 or more`, add: null, mult: 2.2 },
    ]),
    ...['first and second','first and third','second and third'].flatMap(p => [
      { label: `If the ${p} dice match`, add: 11, mult: null },
      { label: `If the ${p} dice match`, add: 10, mult: null },
      { label: `If the ${p} dice match`, add: 9, mult: null },
      { label: `If the ${p} dice match`, add: null, mult: 2 },
      { label: `If the ${p} dice match`, add: null, mult: 1.8 },
      { label: `If the ${p} dice match`, add: null, mult: 1.6 },
    ]),
    // "연속(consecutive)"은 유니크 카테고리 존재만 확인했고 수치는 못 뽑아서 뺐다 — 지어내지 않는다.
    ...[1,2,3,4,5,6].flatMap(n => [
      { label: `If a die rolls a ${n}`, add: 4, mult: null },
      { label: `If a die rolls a ${n}`, add: 3, mult: null },
      { label: `If a die rolls a ${n}`, add: 2, mult: null },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.4 },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.3 },
      { label: `If a die rolls a ${n}`, add: null, mult: 1.2 },
    ]),
    { label: 'If all three dice roll a 1', add: 15, mult: null },
    { label: 'If all three dice roll a 1', add: 14, mult: null },
    { label: 'If all three dice roll a 1', add: 13, mult: null },
    { label: 'If all three dice roll a 1', add: null, mult: 2.8 },
    { label: 'If all three dice roll a 1', add: null, mult: 2.6 },
    { label: 'If all three dice roll a 1', add: null, mult: 2.4 },
    { label: 'If all three dice roll a 1', add: 1, mult: 2.8 },
    { label: 'If all three dice roll a 1', add: 2, mult: 2.6 },
    { label: 'If all three dice roll a 1', add: 3, mult: null }, // 9번째 줄 — 확인된 6개 외 나머지 형태 미확인이라 마지막 하나만 채움
  ],
};

/* UNIQUE의 "연속(consecutive)"과 "잭팟(전부 같은 숫자 4~6)"은 카테고리 존재만 확인했고
   전체 변형 수치까지는 다 못 뽑았다. 지어내지 않고 확인된 것까지만 넣었다 — 나머지는
   자료 더 뽑으면 이어서 채운다. */

/* ═══════════════════════════════════════════════
   이벤트 잠재 — 기간 한정, 상시 카탈로그와 구조가 다르다.

   출처: masonym.dev/familiars → Familiar Lines → "Event lines" 필터 켬
   (처음엔 이 필터를 안 켜서 놓쳤다 — 상시 카탈로그와 별개로 222줄이 있었다)

   상시 옵션은 "떴다/안 떴다"로 고정값을 주는데, 이 이벤트 옵션은 다르다.
   "+3 for each Fire or Ice element"처럼 팀에 그 속성/타입이 몇 마리 있는지에
   비례해서 값이 곱해진다(마리당 값 × 매칭되는 마리 수). 그래서 계산기에서
   팀 구성을 보고 자동으로 마리 수를 세야 한다.

   8개 그룹이 속성 7종 + 타입 9종 = 16개를 정확히 둘씩 묶는다. 속성끼리도
   타입끼리도 아니라 속성-타입이 섞여 묶인 그룹도 있다(무속성+언데드).
   레어·커먼 등급엔 이 이벤트 옵션 자체가 없다(직접 확인, 없는 게 맞다).

   만료: 2026-09-08 23:59(서버 기준 표기 그대로, 시간대 미표기). 만료되면
   이 블록만 지우면 된다 — FR_CATALOG 쪽은 안 건드린다.
═══════════════════════════════════════════════ */

const FR_EVENT_EXPIRES = '2026-09-08 23:59';

const FR_EVENT_GROUPS = [
  { key: 'fire_ice',      label: 'Fire or Ice element',            match: [{ f: 'element', v: 'Fire' }, { f: 'element', v: 'Ice' }] },
  { key: 'lightning_poison', label: 'Lightning or Poison element',  match: [{ f: 'element', v: 'Lightning' }, { f: 'element', v: 'Poison' }] },
  { key: 'holy_dark',     label: 'Holy or Dark element',            match: [{ f: 'element', v: 'Holy' }, { f: 'element', v: 'Dark' }] },
  { key: 'human_beast',   label: 'Human or Beast type',             match: [{ f: 'type', v: 'Human' }, { f: 'type', v: 'Beast' }] },
  { key: 'plant_reptile', label: 'Plant or Reptile type',           match: [{ f: 'type', v: 'Plant' }, { f: 'type', v: 'Reptile' }] },
  { key: 'aquatic_mech',  label: 'Aquatic or Mechanical type',      match: [{ f: 'type', v: 'Aquatic' }, { f: 'type', v: 'Mechanical' }] },
  { key: 'fairy_devil',   label: 'Fairy or Devil type',             match: [{ f: 'type', v: 'Fairy' }, { f: 'type', v: 'Devil' }] },
  { key: 'non_undead',    label: 'Non-elemental or Undead type',    match: [{ f: 'element', v: 'Non-elemental' }, { f: 'type', v: 'Undead' }] },
];

/* 등급별 "마리당" 수치 — 그룹은 다 같은 진행값을 쓴다(8개 그룹 중 직접 확인한
   fairy_devil·non_undead·fire_ice 세 개가 전부 동일해서 나머지도 같다고 본다). */
const FR_EVENT_PER_UNIT = {
  EPIC:   { add: [3, 2, 1], mult: [0.6, 0.4, 0.2] },
  UNIQUE: { add: [6, 5, 4], mult: [1.2, 1, 0.8] },
};

/* "3 or less"는 개수 비례 스택형이 아니라 조건 충족형(상시 카탈로그와 같은 방식)이라
   groupKey 없이 label만 들고 다닌다 — 계산은 그냥 add/mult 그대로 한 번 더해진다. */
const FR_EVENT_FLAT = {
  EPIC: [
    { label: 'If all dice roll 3 or less', add: 15, mult: null },
    { label: 'If all dice roll 3 or less', add: 14, mult: null },
    { label: 'If all dice roll 3 or less', add: 13, mult: null },
    { label: 'If all dice roll 3 or less', add: null, mult: 3.8 },
    { label: 'If all dice roll 3 or less', add: null, mult: 3.6 },
    { label: 'If all dice roll 3 or less', add: null, mult: 3.4 },
  ],
  UNIQUE: [
    { label: 'If all dice roll 3 or less', add: 19, mult: null },
    { label: 'If all dice roll 3 or less', add: 18, mult: null },
    { label: 'If all dice roll 3 or less', add: 17, mult: null },
    { label: 'If all dice roll 3 or less', add: null, mult: 4.2 },
    { label: 'If all dice roll 3 or less', add: null, mult: 4 },
    { label: 'If all dice roll 3 or less', add: null, mult: 3.8 },
  ],
};

/* FR_EVENT_CATALOG[등급] = [{ groupKey, add(마리당) 또는 null, mult(마리당) 또는 null }, ...그룹형]
                          + [{ label, add, mult }, ...고정형("3 or less")] */
const FR_EVENT_CATALOG = {};
['EPIC', 'UNIQUE'].forEach(rank => {
  const per = FR_EVENT_PER_UNIT[rank];
  const grouped = FR_EVENT_GROUPS.flatMap(g => [
    ...per.add.map(v => ({ groupKey: g.key, add: v, mult: null })),
    ...per.mult.map(v => ({ groupKey: g.key, add: null, mult: v })),
  ]);
  FR_EVENT_CATALOG[rank] = [...grouped, ...(FR_EVENT_FLAT[rank] || [])];
});
FR_EVENT_CATALOG.RARE = [];
FR_EVENT_CATALOG.COMMON = [];

if (typeof window !== 'undefined') {
  window.FR_CATALOG = FR_CATALOG;
  window.FR_EVENT_GROUPS = FR_EVENT_GROUPS;
  window.FR_EVENT_CATALOG = FR_EVENT_CATALOG;
  window.FR_EVENT_EXPIRES = FR_EVENT_EXPIRES;
}
if (typeof module !== 'undefined') module.exports = { FR_CATALOG, FR_EVENT_GROUPS, FR_EVENT_CATALOG, FR_EVENT_EXPIRES };
