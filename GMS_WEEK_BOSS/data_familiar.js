/* ═══════════════════════════════════════════════════════════
   패밀리어 데이터

   [등급업·융합 수치] — 넥슨 공식 공지에서 그대로 옮겼다.
     https://www.nexon.com/maplestory/news/57190/familiar-revamp-details

   [옵션별 등장 확률] — 공식 공개 자료가 없다. 넥슨은 부스터팩 등급 확률만
     공개하고 잠재 옵션 확률은 GMS·KMS 어디에도 공개하지 않는다. 그래서
     유저가 직접 모은 실측 표본을 쓴다.
       출처: GMS 히로익 갤러리 "퍼밀 유니크/에픽 옵션별 등장 확률" (2026.05.27)
       https://gall.dcinside.com/mgallery/board/view/?id=heroic&no=323745
       표본: 유니크 약 7,328장 / 에픽 약 7,176장

     공식 확률이 아니므로 화면에도 반드시 그렇게 표기한다.
     신뢰도 근거: 넥슨이 2026-07-17 공지에서 "유니크 티어는 보공 40%만 나온다"고
     밝혔는데, 이 표본에서도 보공 35%가 0건으로 정확히 일치한다.
       https://www.nexon.com/maplestory/news/general/42797/maple-memo-addressing-the-unique-tier-familiar-boss-damage-potential

   [derived: true 인 항목] — 원본 표에서 그 칸이 비어 있던 줄이다. 값을 지어내지
     않고, 나머지 줄의 합이 100%가 되도록 남은 확률을 그대로 넣었다. 측정값이
     아니므로 구분해 둔다. 둘 다 전투와 무관한 옵션이라 시뮬레이션 결과에는
     영향이 거의 없다.
═══════════════════════════════════════════════════════════ */

const FAM_RANKS = ['COMMON', 'RARE', 'EPIC', 'UNIQUE', 'LEGENDARY'];

const FAM_RANK_LABEL = {
  COMMON: '커먼', RARE: '레어', EPIC: '에픽', UNIQUE: '유니크', LEGENDARY: '레전드리',
};

/* 등급업 — 공식. 레전드리는 레드 카드 전용이라 여기 없다. */
const FAM_RANKUP = {
  COMMON: { to: 'RARE',   points: 50,  chance: 1.00 },
  RARE:   { to: 'EPIC',   points: 100, chance: 0.80 },
  EPIC:   { to: 'UNIQUE', points: 150, chance: 0.40 },
};

/* 융합 재료로 넣었을 때 주는 랭크업 포인트 — 공식 */
const FAM_FUSE_POINTS = {
  COMMON: 1, RARE: 2, EPIC: 3, UNIQUE: 4, LEGENDARY: 5,
  SUSPICIOUS_FAUX: 15,  // 수상한 포미리어 — 패밀리어 포인트 상점
  FAUX: 30,             // 포미리어 — 캐시 부스터팩, 리부트 제외
};

/* 추출 시 얻는 패밀리어 포인트 — 공식 */
const FAM_EXTRACT_POINTS = {
  COMMON: 10, RARE: 15, EPIC: 30, UNIQUE: 40, LEGENDARY: 50,
};

/* 표본 크기 — 확률에서 역산한 값(251/0.0343 등 여러 줄이 같은 값을 가리킨다) */
const FAM_SAMPLE_N = { UNIQUE: 7328, EPIC: 7176 };

/* 어떤 옵션이 "유효 옵션"인지. 시뮬레이터 목표 후보를 추릴 때 쓴다. */
const FAM_PRIME = new Set([
  'ATT6', 'MATT6', 'IED35', 'IED40', 'BOSS40', 'CRITDMG3', 'DROP110', 'DROPMESO100',
  'ATT3', 'MATT3', 'IED30', 'BOSS20', 'BOSS30', 'DROP100',
]);

/* ── 유니크 옵션 풀 ──
   key / 한글 표기 / 원문 / 확률(%) / 표본 수 */
const FAM_LINES_UNIQUE = [
  { key:'IGN20',        ko:'피격 시 20% 데미지 무시 10%',      en:'10% chance to ignore 20% damage when attacked', pct:1.67, n:122 },
  { key:'IGN40',        ko:'피격 시 40% 데미지 무시 10%',      en:'10% chance to ignore 40% damage when attacked', pct:1.30, n:95  },
  { key:'INVIN7',       ko:'피격 시 7초 무적 3%',              en:'3% chance to become invincible for 7 seconds when attacked', pct:1.67, n:122 },
  { key:'ALLSTAT3P',    ko:'파티원 올스탯 +3%',                en:'All Stats for party members: +3%', pct:3.49, n:256 },
  { key:'ALLSTAT3N',    ko:'주변 올스탯 +3%',                  en:'All Stats for those nearby: +3%', pct:2.87, n:210 },
  { key:'ALLSTAT3',     ko:'올스탯 +3%',                       en:'All Stats: +3%', pct:0.94, n:69  },
  { key:'ATT6',         ko:'공격력 +6%',                       en:'Attack Power: +6%', pct:3.43, n:251, lo:3.02, hi:3.87 },
  { key:'BOSS35',       ko:'보스 데미지 +35%',                 en:'Boss Damage +35%', pct:0.00, n:0,   lo:0.00, hi:0.05, removed:true },
  { key:'BOSS40',       ko:'보스 데미지 +40%',                 en:'Boss Damage +40%', pct:1.04, n:76,  lo:0.82, hi:1.30 },
  { key:'CRITDMG3',     ko:'크리티컬 데미지 +3%',              en:'Critical Damage: +3%', pct:1.75, n:128, lo:1.46, hi:2.07 },
  { key:'CRITRATE8',    ko:'크리티컬 확률 +8%',                en:'Critical Rate +8%', pct:4.45, n:326 },
  { key:'CRITRATE6',    ko:'크리티컬 확률 +6%',                en:'Critical Rate: +6%', pct:0.10, n:7   },
  { key:'DMG6',         ko:'데미지 +6%',                       en:'Damage +6%', pct:0.76, n:56  },
  { key:'DEX6',         ko:'DEX +6%',                          en:'DEX: +6%', pct:4.86, n:356 },
  { key:'HPREC20',      ko:'HP 회복 아이템·스킬 +20%',         en:'HP Recovery Items and Skills +20%', pct:1.57, n:115 },
  { key:'IED35',        ko:'방어율 무시 +35%',                 en:'Ignore Defense: +35%', pct:0.78, n:57,  lo:0.59, hi:1.01 },
  { key:'IED40',        ko:'방어율 무시 +40%',                 en:'Ignore Defense: +40%', pct:0.33, n:24,  lo:0.21, hi:0.49 },
  { key:'INT6',         ko:'INT +6%',                          en:'INT: +6%', pct:4.87, n:357 },
  { key:'INVIN2',       ko:'피격 후 2초 무적',                 en:'Invincible for +2 sec after taking damage', pct:1.49, n:109 },
  { key:'DROP10',       ko:'아이템 드롭률 +10%',               en:'Item Drop Rate Boost: +10%', pct:0.67, n:49  },
  { key:'DROP110',      ko:'아이템 드롭률 +110%',              en:'Item Drop Rate Boost: +110%', pct:0.45, n:33,  lo:0.31, hi:0.63 },
  { key:'DROPMESO100',  ko:'아이템·메소 드롭률 +100%',         en:'Item/Meso Drop Rate Boost: +100%', pct:0.31, n:23,  lo:0.20, hi:0.47 },
  { key:'DROPMESO60',   ko:'아이템·메소 드롭률 +60%',          en:'Item/Meso Drop Rate Boost: +60%', pct:0.90, n:66  },
  { key:'LUK6',         ko:'LUK +6%',                          en:'LUK: +6%', pct:5.02, n:368 },
  { key:'MATT6',        ko:'마력 +6%',                         en:'Magic ATT: +6%', pct:3.41, n:250, lo:3.01, hi:3.85 },
  { key:'MAXHP6',       ko:'최대 HP +6%',                      en:'Max HP: +6%', pct:4.98, n:365 },
  { key:'MAXMP6',       ko:'최대 MP +6%',                      en:'Max MP: +6%', pct:5.24, n:384 },
  { key:'MESODROP110',  ko:'메소 드롭률 +110%',                en:'Meso Drop Rate Boost: +110%', pct:0.29, n:21  },
  { key:'MESO10',       ko:'메소 획득량 +10%',                 en:'Mesos Obtained: +10%', pct:0.87, n:64  },
  { key:'OUTLINE_BK',   ko:'캐릭터 검은 테두리',               en:'Outlines your character in black', pct:9.25, n:678 },
  { key:'OUTLINE_RD',   ko:'캐릭터 빨간 테두리',               en:'Outlines your character in red', pct:9.54, n:699 },
  { key:'REC12HP_P',    ko:'파티원 HP 12% 주기 회복',          en:'Periodically recovers 12% HP for party members', pct:1.81, n:null, derived:true },
  { key:'REC12HP_N',    ko:'주변 HP 12% 주기 회복',            en:'Periodically recovers 12% HP for those nearby', pct:1.45, n:106 },
  { key:'REC12HPMP',    ko:'HP·MP 12% 주기 회복',              en:'Periodically recovers 12% HP/MP', pct:1.91, n:140 },
  { key:'REC12HPMP_P',  ko:'파티원 HP·MP 12% 주기 회복',       en:'Periodically recovers 12% HP/MP for party members', pct:0.74, n:54  },
  { key:'REC12HPMP_N',  ko:'주변 HP·MP 12% 주기 회복',         en:'Periodically recovers 12% HP/MP for those nearby', pct:0.81, n:59  },
  { key:'REC12MP_P',    ko:'파티원 MP 12% 주기 회복',          en:'Periodically recovers 12% MP for party members', pct:1.64, n:120 },
  { key:'REC12MP_N',    ko:'주변 MP 12% 주기 회복',            en:'Periodically recovers 12% MP for those nearby', pct:1.67, n:122 },
  { key:'REC15HP_P',    ko:'파티원 HP 15% 주기 회복',          en:'Periodically recovers 15% HP for party members', pct:0.74, n:54  },
  { key:'REC15HP_N',    ko:'주변 HP 15% 주기 회복',            en:'Periodically recovers 15% HP for those nearby', pct:0.86, n:63  },
  { key:'REC15HPMP',    ko:'HP·MP 15% 주기 회복',              en:'Periodically recovers 15% HP/MP', pct:0.86, n:63  },
  { key:'REC15HPMP_P',  ko:'파티원 HP·MP 15% 주기 회복',       en:'Periodically recovers 15% HP/MP for party members', pct:0.53, n:39  },
  { key:'REC15HPMP_N',  ko:'주변 HP·MP 15% 주기 회복',         en:'Periodically recovers 15% HP/MP for those nearby', pct:0.35, n:26  },
  { key:'REC15MP_P',    ko:'파티원 MP 15% 주기 회복',          en:'Periodically recovers 15% MP for party members', pct:0.87, n:64  },
  { key:'REC15MP_N',    ko:'주변 MP 15% 주기 회복',            en:'Periodically recovers 15% MP for those nearby', pct:0.83, n:61  },
  { key:'MPCOST15',     ko:'스킬 MP 소모 -15%',                en:'Skill MP Cost -15%', pct:1.68, n:123 },
  { key:'STR6',         ko:'STR +6%',                          en:'STR: +6%', pct:4.95, n:363 },
];

/* ── 에픽 옵션 풀 ──
   유니크 패밀리어의 2번째 줄은 이 풀에서 뽑힌다(공식: 두 번째 잠재는 이전 등급). */
const FAM_LINES_EPIC = [
  { key:'INVIN7',       ko:'피격 시 7초 무적 2%',              en:'2% chance to become invincible for 7 seconds when attacked', pct:0.99, n:71  },
  { key:'IGN20',        ko:'피격 시 20% 데미지 무시 5%',       en:'5% chance to ignore 20% damage when attacked', pct:1.03, n:74  },
  { key:'IGN40',        ko:'피격 시 40% 데미지 무시 5%',       en:'5% chance to ignore 40% damage when attacked', pct:1.00, n:72  },
  { key:'ALLSTAT2',     ko:'올스탯 +2%',                       en:'All Stats: +2%', pct:0.43, n:31  },
  { key:'ALLSTAT5F',    ko:'올스탯 +5',                        en:'All Stats: +5', pct:1.14, n:82  },
  { key:'ATT10F',       ko:'공격력 +10',                       en:'Attack Power: +10', pct:1.98, n:142 },
  { key:'ATT3',         ko:'공격력 +3%',                       en:'Attack Power: +3%', pct:2.06, n:148, lo:1.75, hi:2.42 },
  { key:'MPREST',       ko:'공격 시 20% 확률 MP 180 회복',     en:'Attacks have a 20% chance to restore 180 MP', pct:1.74, n:125 },
  { key:'HPREST',       ko:'공격 시 20% 확률 HP 360 회복',     en:'Attacks have a 20% chance to restore 360 HP', pct:1.99, n:143 },
  { key:'BOSS20',       ko:'보스 데미지 +20%',                 en:'Boss Damage +20%', pct:0.59, n:42,  lo:0.42, hi:0.79 },
  { key:'BOSS30',       ko:'보스 데미지 +30%',                 en:'Boss Damage +30%', pct:0.25, n:18,  lo:0.15, hi:0.40 },
  { key:'CRITRATE4',    ko:'크리티컬 확률 +4%',                en:'Critical Rate: +4%', pct:4.83, n:347 },
  { key:'DMG3',         ko:'데미지 +3%',                       en:'Damage +3%', pct:0.47, n:34  },
  { key:'DEF120N',      ko:'주변 방어력 +120',                 en:'DEF of those nearby: +120', pct:2.30, n:165 },
  { key:'DEF240',       ko:'방어력 +240',                      en:'DEF: +240', pct:7.65, n:549 },
  { key:'DEF3',         ko:'방어력 +3%',                       en:'DEF: +3%', pct:3.29, n:236 },
  { key:'DEX24',        ko:'DEX +24',                          en:'DEX: +24', pct:4.50, n:323 },
  { key:'DEX3',         ko:'DEX +3%',                          en:'DEX: +3%', pct:2.42, n:174 },
  { key:'HPREC10',      ko:'HP 회복 아이템·스킬 +10%',         en:'HP Recovery Items and Skills +10%', pct:1.16, n:83  },
  { key:'IED30',        ko:'방어율 무시 +30%',                 en:'Ignore Defense: +30%', pct:0.53, n:38,  lo:0.37, hi:0.73 },
  { key:'INT24',        ko:'INT +24',                          en:'INT: +24', pct:4.68, n:336 },
  { key:'INT3',         ko:'INT +3%',                          en:'INT: +3%', pct:2.23, n:160 },
  { key:'INVIN1',       ko:'피격 후 1초 무적',                 en:'Invincible for +1 sec after taking damage', pct:1.13, n:81  },
  { key:'DROP100',      ko:'아이템 드롭률 +100%',              en:'Item Drop Rate Boost: +100%', pct:0.32, n:23,  lo:0.20, hi:0.48 },
  { key:'DROP60',       ko:'아이템 드롭률 +60%',               en:'Item Drop Rate Boost: +60%', pct:0.54, n:39  },
  { key:'DROPMESO30',   ko:'아이템·메소 드롭률 +30%',          en:'Item/Meso Drop Rate Boost: +30%', pct:0.59, n:42  },
  { key:'DROPMESO50',   ko:'아이템·메소 드롭률 +50%',          en:'Item/Meso Drop Rate Boost: +50%', pct:0.32, n:23  },
  { key:'LUK24',        ko:'LUK +24',                          en:'LUK: +24', pct:4.99, n:358 },
  { key:'LUK3',         ko:'LUK +3%',                          en:'LUK: +3%', pct:2.48, n:178 },
  { key:'MATT10F',      ko:'마력 +10',                         en:'Magic ATT: +10', pct:2.09, n:150 },
  { key:'MATT3',        ko:'마력 +3%',                         en:'Magic ATT: +3%', pct:2.33, n:167, lo:1.99, hi:2.70 },
  { key:'MAXHP240',     ko:'최대 HP +240',                     en:'Max HP: +240', pct:4.79, n:null, derived:true },
  { key:'MAXHP3',       ko:'최대 HP +3%',                      en:'Max HP: +3%', pct:2.26, n:162 },
  { key:'MAXMP240',     ko:'최대 MP +240',                     en:'Max MP: +240', pct:4.97, n:357 },
  { key:'MAXMP3',       ko:'최대 MP +3%',                      en:'Max MP: +3%', pct:2.47, n:177 },
  { key:'MESODROP100',  ko:'메소 드롭률 +100%',                en:'Meso Drop Rate Boost: +100%', pct:0.24, n:17  },
  { key:'MESODROP60',   ko:'메소 드롭률 +60%',                 en:'Meso Drop Rate Boost: +60%', pct:0.60, n:43  },
  { key:'DEF120P',      ko:'파티원 방어력 +120',               en:'Party members DEF: +120', pct:2.58, n:185 },
  { key:'REC10HP_P',    ko:'파티원 HP 10% 주기 회복',          en:'Periodically recovers 10% HP for party members', pct:0.57, n:41  },
  { key:'REC10HP_N',    ko:'주변 HP 10% 주기 회복',            en:'Periodically recovers 10% HP for those nearby', pct:0.77, n:55  },
  { key:'REC10HPMP',    ko:'HP·MP 10% 주기 회복',              en:'Periodically recovers 10% HP/MP', pct:0.38, n:27  },
  { key:'REC10HPMP_P',  ko:'파티원 HP·MP 10% 주기 회복',       en:'Periodically recovers 10% HP/MP for party members', pct:0.39, n:28  },
  { key:'REC10HPMP_N',  ko:'주변 HP·MP 10% 주기 회복',         en:'Periodically recovers 10% HP/MP for those nearby', pct:0.33, n:24  },
  { key:'REC10MP_P',    ko:'파티원 MP 10% 주기 회복',          en:'Periodically recovers 10% MP for party members', pct:0.70, n:50  },
  { key:'REC10MP_N',    ko:'주변 MP 10% 주기 회복',            en:'Periodically recovers 10% MP for those nearby', pct:0.60, n:43  },
  { key:'REC12HP',      ko:'HP 12% 주기 회복',                 en:'Periodically recovers 12% HP', pct:1.23, n:88  },
  { key:'REC12MP',      ko:'MP 12% 주기 회복',                 en:'Periodically recovers 12% MP', pct:1.07, n:77  },
  { key:'REC15HP',      ko:'HP 15% 주기 회복',                 en:'Periodically recovers 15% HP', pct:0.53, n:38  },
  { key:'REC15MP',      ko:'MP 15% 주기 회복',                 en:'Periodically recovers 15% MP', pct:0.50, n:36  },
  { key:'REC7HP_P',     ko:'파티원 HP 7% 주기 회복',           en:'Periodically recovers 7% HP for party members', pct:1.06, n:76  },
  { key:'REC7HP_N',     ko:'주변 HP 7% 주기 회복',             en:'Periodically recovers 7% HP for those nearby', pct:1.05, n:75  },
  { key:'REC7HPMP',     ko:'HP·MP 7% 주기 회복',               en:'Periodically recovers 7% HP/MP', pct:0.57, n:41  },
  { key:'REC7HPMP_P',   ko:'파티원 HP·MP 7% 주기 회복',        en:'Periodically recovers 7% HP/MP for party members', pct:0.46, n:33  },
  { key:'REC7HPMP_N',   ko:'주변 HP·MP 7% 주기 회복',          en:'Periodically recovers 7% HP/MP for those nearby', pct:0.70, n:50  },
  { key:'REC7MP_P',     ko:'파티원 MP 7% 주기 회복',           en:'Periodically recovers 7% MP for party members', pct:1.20, n:86  },
  { key:'REC7MP_N',     ko:'주변 MP 7% 주기 회복',             en:'Periodically recovers 7% MP for those nearby', pct:1.18, n:85  },
  { key:'STR24',        ko:'STR +24',                          en:'STR: +24', pct:4.46, n:320 },
  { key:'STR3',         ko:'STR +3%',                          en:'STR: +3%', pct:2.29, n:164 },
];

/* ── 커먼 옵션 풀 ── (추정치)
   레어와 같은 방식. 위키 목록 26줄을 가져와, 각 줄에 대응하는 레어 옵션의
   확률을 썼고 합이 100%가 되도록 정규화했다. 레어 자체가 이미 추정치라
   커먼은 추정 위의 추정이다 — 수치를 그대로 믿을 것은 못 된다.
   커먼 26줄은 전부 레어에 같은 계열이 있어 대응은 깔끔하게 떨어졌다.
     https://maplestorywiki.net/w/Familiars/Stat_Tables */
const FAM_LINES_COMMON = [
  { key:'STR6F', ko:'STR +6', en:'STR: +6', pct:4.57 },
  { key:'DEX6F', ko:'DEX +6', en:'DEX: +6', pct:4.68 },
  { key:'INT6F', ko:'INT +6', en:'INT: +6', pct:4.67 },
  { key:'LUK6F', ko:'LUK +6', en:'LUK: +6', pct:5.05 },
  { key:'MAXHP60', ko:'최대 HP +60', en:'Max HP: +60', pct:4.77 },
  { key:'MAXMP60', ko:'최대 MP +60', en:'Max MP: +60', pct:5.03 },
  { key:'ATT3F', ko:'공격력 +3', en:'Attack Power: +3', pct:2.73 },
  { key:'MATT3F', ko:'마력 +3', en:'Magic ATT: +3', pct:2.99 },
  { key:'DEF60', ko:'방어력 +60', en:'DEF: +60', pct:7.38 },
  { key:'STR1', ko:'STR +1%', en:'STR: +1%', pct:4.57 },
  { key:'DEX1', ko:'DEX +1%', en:'DEX: +1%', pct:4.68 },
  { key:'INT1', ko:'INT +1%', en:'INT: +1%', pct:4.67 },
  { key:'LUK1', ko:'LUK +1%', en:'LUK: +1%', pct:5.05 },
  { key:'MAXHP1', ko:'최대 HP +1%', en:'Max HP: +1%', pct:4.77 },
  { key:'MAXMP1', ko:'최대 MP +1%', en:'Max MP: +1%', pct:5.03 },
  { key:'ATT1', ko:'공격력 +1%', en:'Attack Power: +1%', pct:2.73 },
  { key:'MATT1', ko:'마력 +1%', en:'Magic ATT: +1%', pct:2.99 },
  { key:'DEF1', ko:'방어력 +1%', en:'DEF: +1%', pct:7.38 },
  { key:'CRITRATE1', ko:'크리티컬 확률 +1%', en:'Critical Rate: +1%', pct:6.53 },
  { key:'DMG1', ko:'데미지 +1%', en:'Damage +1%', pct:0.64 },
  { key:'ALLSTAT1F', ko:'올스탯 +1', en:'All Stats: +1', pct:1.06 },
  { key:'HPREST', ko:'공격 시 20% 확률 HP 240 회복', en:'Attacks have a 20% chance to restore 240 HP', pct:2.69 },
  { key:'MPREST', ko:'공격 시 20% 확률 MP 120 회복', en:'Attacks have a 20% chance to restore 120 MP', pct:2.35 },
  { key:'IED15', ko:'방어율 무시 +15%', en:'Ignore Defense: +15%', pct:0.72 },
  { key:'REC5HP', ko:'HP 5% 주기 회복', en:'Periodically recovers 5% HP', pct:1.19 },
  { key:'REC5MP', ko:'MP 5% 주기 회복', en:'Periodically recovers 5% MP', pct:1.08 },
];

/* ── 레어 옵션 풀 ── (추정치)
   레어는 실측 표본이 없다. 위키에 옵션 '목록'은 있으나 확률은 없고, 넥슨도
   v.264 패치 뒤로는 게임 데이터에서 가중치를 빼서 아무도 알 수 없는 상태다.
     https://maplestorywiki.net/w/Familiars/Stat_Tables

   그래서 레어 41줄 각각에 대해, 에픽 표에서 같은 계열 옵션(수치만 다른 것)의
   실측 확률을 가져와 합이 100%가 되도록 정규화했다. 같은 계열이 에픽에 여럿
   있으면(예: 주기 회복 12%/15%) 그 평균을 썼다.
   근거: 레어는 에픽의 열화판이라 옵션 구성이 대응되고 수치만 절반 수준이다
   (공격력 2%/3%, 방무 15%/30%, 올스탿 1%/2%, STR +12/+24, 방어력 +120/+240).
   다만 어디까지나 추정이므로 화면에도 추정치임을 표기한다. */
const FAM_LINES_RARE = [
  { key:'STR12', ko:'STR +12', en:'STR: +12', pct:3.86 },
  { key:'DEX12', ko:'DEX +12', en:'DEX: +12', pct:3.96 },
  { key:'INT12', ko:'INT +12', en:'INT: +12', pct:3.95 },
  { key:'LUK12', ko:'LUK +12', en:'LUK: +12', pct:4.27 },
  { key:'MAXHP120', ko:'최대 HP +120', en:'Max HP: +120', pct:4.03 },
  { key:'MAXMP120', ko:'최대 MP +120', en:'Max MP: +120', pct:4.25 },
  { key:'ATT6F', ko:'공격력 +6', en:'Attack Power: +6', pct:2.31 },
  { key:'MATT6F', ko:'마력 +6', en:'Magic ATT: +6', pct:2.53 },
  { key:'DEF120', ko:'방어력 +120', en:'DEF: +120', pct:6.25 },
  { key:'STR2', ko:'STR +2%', en:'STR: +2%', pct:3.86 },
  { key:'DEX2', ko:'DEX +2%', en:'DEX: +2%', pct:3.96 },
  { key:'INT2', ko:'INT +2%', en:'INT: +2%', pct:3.95 },
  { key:'LUK2', ko:'LUK +2%', en:'LUK: +2%', pct:4.27 },
  { key:'MAXHP2', ko:'최대 HP +2%', en:'Max HP: +2%', pct:4.03 },
  { key:'MAXMP2', ko:'최대 MP +2%', en:'Max MP: +2%', pct:4.25 },
  { key:'ATT2', ko:'공격력 +2%', en:'Attack Power: +2%', pct:2.31 },
  { key:'MATT2', ko:'마력 +2%', en:'Magic ATT: +2%', pct:2.53 },
  { key:'DEF2', ko:'방어력 +2%', en:'DEF: +2%', pct:6.22 },
  { key:'CRITRATE2', ko:'크리티컬 확률 +2%', en:'Critical Rate: +2%', pct:5.52 },
  { key:'DMG2', ko:'데미지 +2%', en:'Damage +2%', pct:0.54 },
  { key:'ALLSTAT3F', ko:'올스탯 +3', en:'All Stats: +3', pct:0.90 },
  { key:'ALLSTAT1', ko:'올스탯 +1%', en:'All Stats: +1%', pct:0.90 },
  { key:'HPREST', ko:'공격 시 20% 확률 HP 300 회복', en:'Attacks have a 20% chance to restore 300 HP', pct:2.27 },
  { key:'MPREST', ko:'공격 시 20% 확률 MP 150 회복', en:'Attacks have a 20% chance to restore 150 MP', pct:1.99 },
  { key:'IED15', ko:'방어율 무시 +15%', en:'Ignore Defense: +15%', pct:0.61 },
  { key:'REC7HP', ko:'HP 7% 주기 회복', en:'Periodically recovers 7% HP', pct:1.01 },
  { key:'REC10HP', ko:'HP 10% 주기 회복', en:'Periodically recovers 10% HP', pct:1.01 },
  { key:'REC7MP', ko:'MP 7% 주기 회복', en:'Periodically recovers 7% MP', pct:0.90 },
  { key:'REC10MP', ko:'MP 10% 주기 회복', en:'Periodically recovers 10% MP', pct:0.90 },
  { key:'REC5HPMP', ko:'HP·MP 5% 주기 회복', en:'Periodically recovers 5% HP/MP', pct:0.54 },
  { key:'MESODROP30', ko:'메소 드롭률 +30%', en:'Meso Drop Rate Boost: +30%', pct:0.48 },
  { key:'MESODROP50', ko:'메소 드롭률 +50%', en:'Meso Drop Rate Boost: +50%', pct:0.48 },
  { key:'DROP30', ko:'아이템 드롭률 +30%', en:'Item Drop Rate Boost: +30%', pct:0.49 },
  { key:'DROP50', ko:'아이템 드롭률 +50%', en:'Item Drop Rate Boost: +50%', pct:0.49 },
  { key:'DROPMESO20', ko:'아이템·메소 드롭률 +20%', en:'Item/Meso Drop Rate Boost: +20%', pct:0.52 },
  { key:'REC5HP_P', ko:'파티원 HP 5% 주기 회복', en:'Periodically recovers 5% HP for party members', pct:0.93 },
  { key:'REC5MP_P', ko:'파티원 MP 5% 주기 회복', en:'Periodically recovers 5% MP for party members', pct:1.09 },
  { key:'DEF60P', ko:'파티원 방어력 +60', en:'Party members DEF: +60', pct:2.95 },
  { key:'REC5HP_N', ko:'주변 HP 5% 주기 회복', en:'Periodically recovers 5% HP for those nearby', pct:1.04 },
  { key:'REC5MP_N', ko:'주변 MP 5% 주기 회복', en:'Periodically recovers 5% MP for those nearby', pct:1.02 },
  { key:'DEF60N', ko:'주변 방어력 +60', en:'DEF of those nearby: +60', pct:2.63 },
];

/* ── 두 줄이 모두 현재 등급에서 나올 확률 ──
   공식 문서상 잠재는 [1번째 = 현재 등급 / 2번째 = 이전 등급]이 기본이고,
   "드물게 두 줄 모두 현재 등급에서 나오는 경우가 있다"고만 적혀 있다. 수치는 비공개.

   그 수치를 원 글의 두 자료로 역산했다. 글쓴이가 올린 2줄 조합 확률(FAM_REF_COMBOS)을
   같은 글의 단일 줄 확률로 계산한 값과 나눠보면 6개 조합이 모두 같은 비율로 나온다:
     공6/공6 0.01020, 보40/공6 0.00981, 보40/크뎀3 0.01099,
     보40/방무35 0.01048, 보40/보40 0.00925, 보40/방무40 0.01020
     → 평균 0.01015, 변동계수 5.3%

   조합마다 옵션도 확률도 다른데 비율만 일정하다는 건 공통 계수가 하나 곱해져
   있다는 뜻이고, 그게 바로 "두 줄 다 현재 등급" 확률이다. 6개가 독립적으로
   같은 값을 가리키므로 표본 오차 수준에서 신뢰할 만하다. */
const FAM_BOTH_CURRENT_TIER = 0.0101;

/* 원 글쓴이가 같이 올린 2줄 조합 기댓값. 우리 계산 결과를 검산할 때 쓴다.
   원문 주: "두 번째 줄 이탈은 제외함" — 두 줄 모두 유니크에서 나온 경우만 센 값이라
   위 FAM_BOTH_CURRENT_TIER가 이미 곱해져 있다. */
const FAM_REF_COMBOS = [
  { ko:'공격력 6% / 공격력 6%',     pct:0.0012,   one_in:82000    },
  { ko:'보스 40% / 공격력 6%',      pct:0.0007,   one_in:140000   },
  { ko:'보스 40% / 크뎀 3%',        pct:0.0004,   one_in:270000   },
  { ko:'보스 40% / 방무 35%',       pct:0.00017,  one_in:600000   },
  { ko:'보스 40% / 보스 40%',       pct:0.0001,   one_in:900000   },
  { ko:'보스 40% / 방무 40%',       pct:0.00007,  one_in:1420000  },
];

const FAM_LINES = { UNIQUE: FAM_LINES_UNIQUE, EPIC: FAM_LINES_EPIC, RARE: FAM_LINES_RARE, COMMON: FAM_LINES_COMMON };

/* 확률이 추정치인 등급 */
const FAM_ESTIMATED_RANKS = ['RARE', 'COMMON'];

/* 출처 표기 — 화면에 그대로 띄운다 */
const FAM_SOURCE_NOTE =
  '옵션 확률은 넥슨 공식 자료가 아니라 유저가 모은 실측 표본입니다. ' +
  '유니크 약 7,300장, 에픽 약 7,200장 기준이며 실제 값과 차이가 있을 수 있습니다. ' +
  '등급업 확률과 융합 포인트는 넥슨 공식 공지 기준입니다.';

if (typeof window !== 'undefined') {
  window.FAMILIAR_DATA = {
    RANKS: FAM_RANKS, RANK_LABEL: FAM_RANK_LABEL,
    RANKUP: FAM_RANKUP, FUSE_POINTS: FAM_FUSE_POINTS, EXTRACT_POINTS: FAM_EXTRACT_POINTS,
    LINES: FAM_LINES, SAMPLE_N: FAM_SAMPLE_N, PRIME: FAM_PRIME,
    BOTH_CURRENT_TIER: FAM_BOTH_CURRENT_TIER,
    REF_COMBOS: FAM_REF_COMBOS, SOURCE_NOTE: FAM_SOURCE_NOTE,
    ESTIMATED_RANKS: FAM_ESTIMATED_RANKS,
  };
}
if (typeof module !== 'undefined') module.exports = { FAM_LINES, FAM_RANKUP, FAM_REF_COMBOS, FAM_SAMPLE_N, FAM_BOTH_CURRENT_TIER, FAM_ESTIMATED_RANKS };
