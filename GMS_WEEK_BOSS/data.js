/* =============================================
   data.js — 모든 게임 데이터 (GMS 기준, 일부 근삿값)
   ============================================= */

/* ── 주보 ── */
const BOSS_DATA = [
  { id:'zakum',      name:'자쿰',              diffs:{chaos:24_000_000},                                                               maxParty:6,               minLevel:140, img:'images/bosses/zakum.webp' },
  { id:'pinkbean',   name:'핑크빈',            diffs:{chaos:64_000_000},                                                               maxParty:6,               minLevel:140, img:'images/bosses/pinkbean.webp' },
  { id:'cygnus',     name:'시그너스',          diffs:{easy:45_562_500,normal:72_250_000},                                              maxParty:6,               minLevel:140, img:'images/bosses/cygnus.webp' },
  { id:'magnus',     name:'매그너스',          diffs:{hard:95_062_500},                                                                maxParty:6,               minLevel:155, img:'images/bosses/magnus.webp' },
  { id:'hilla',      name:'힐라',              diffs:{hard:56_250_000},                                                                maxParty:6,               minLevel:120, img:'images/bosses/hilla.webp' },
  { id:'bq',         name:'블러디퀸',          diffs:{chaos:81_000_000},                                                               maxParty:6,               minLevel:180, img:'images/bosses/bq.webp' },
  { id:'vanvan',     name:'반반',              diffs:{chaos:81_000_000},                                                               maxParty:6,               minLevel:180, img:'images/bosses/vanvan.webp' },
  { id:'pierre',     name:'피에르',            diffs:{chaos:81_000_000},                                                               maxParty:6,               minLevel:180, img:'images/bosses/pierre.webp' },
  { id:'vellum',     name:'벨룸',              diffs:{chaos:105_062_500},                                                              maxParty:6,               minLevel:180, img:'images/bosses/vellum.webp' },
  { id:'papulus',    name:'파풀라투스',        diffs:{chaos:132_250_000},                                                              maxParty:6,               minLevel:180, img:'images/bosses/papulus.webp' },
  { id:'nohime',     name:'노히메',            diffs:{normal:81_000_000},                                                              maxParty:6,               minLevel:140, img:'images/bosses/Princess_No.png' },
  { id:'akechi',     name:'아케치',            diffs:{normal:144_000_000},                                                             maxParty:6,               minLevel:140, img:'images/bosses/akechi.png' },
  { id:'suu',        name:'스우',              diffs:{normal:162_562_500,hard:444_675_000,extreme:1_397_500_000},                      maxParty:{normal:6,hard:6,extreme:2}, minLevel:200, img:'images/bosses/suu.webp' },
  { id:'demian',     name:'데미안',            diffs:{normal:169_000_000,hard:421_875_000},                                            maxParty:6,               minLevel:200, img:'images/bosses/demian.webp' },
  { id:'gaensl',     name:'가디언 엔젤 슬라임',diffs:{normal:231_673_500,chaos:600_578_125},                                           maxParty:6,               minLevel:200, img:'images/bosses/gaensl.webp' },
  { id:'lucid',      name:'루시드',            diffs:{easy:237_009_375,normal:253_828_125,hard:504_000_000},                           maxParty:6,               minLevel:220, img:'images/bosses/lucid.webp' },
  { id:'will',       name:'윌',               diffs:{easy:246_744_750,normal:279_075_000,hard:621_810_000},                            maxParty:6,               minLevel:235, img:'images/bosses/will.webp' },
  { id:'dusk',       name:'더스크',            diffs:{normal:297_675_000,hard:563_945_000},                                            maxParty:6,               minLevel:245, img:'images/bosses/dusk.webp' },
  { id:'dunkel',     name:'듄켈',              diffs:{normal:316_875_000,hard:667_920_000},                                            maxParty:6,               minLevel:255, img:'images/bosses/dunkel.webp' },
  { id:'jinhilla',   name:'진 힐라',           diffs:{normal:581_880_000,hard:762_105_000},                                            maxParty:6,               minLevel:250, img:'images/bosses/jinhilla.webp' },
  { id:'seren',      name:'선택받은 세렌',              diffs:{normal:889_021_875,hard:1_096_562_500,extreme:4_235_000_000},                     maxParty:6,               minLevel:260, img:'images/bosses/seren.webp' },
  { id:'kalos',      name:'감시자 칼로스',            diffs:{easy:937_500_000,normal:1_300_000_000,chaos:2_600_000_000,extreme:5_200_000_000}, maxParty:6,               minLevel:270, img:'images/bosses/kalos.webp' },
  { id:'daejuk',     name:'최초의 대적자',            diffs:{easy:985_000_000,normal:1_365_000_000,hard:2_940_000_000,extreme:5_880_000_000},  maxParty:3,               minLevel:270, img:'images/bosses/daejuk.webp' },
  { id:'kaling',     name:'카링',              diffs:{easy:1_031_250_000,normal:1_506_500_000,hard:2_990_000_000,extreme:6_026_000_000},maxParty:6,               minLevel:275, img:'images/bosses/kaling.webp' },
  { id:'hyungseong', name:'찬란한 흉성',              diffs:{normal:1_452_000_000,hard:3_990_000_000},                                        maxParty:3,               minLevel:280, img:'images/bosses/hyungseong.webp' },
  { id:'limbo',      name:'림보',              diffs:{normal:2_100_000_000,hard:3_745_000_000},                                        maxParty:3,               minLevel:285, img:'images/bosses/limbo.webp' },
  { id:'baldrix',    name:'발드릭스',          diffs:{normal:2_800_000_000,hard:4_200_000_000},                                        maxParty:3,               minLevel:290, img:'images/bosses/baldrix.webp' },
  { id:'blackmage',  name:'검은 마법사',       diffs:{hard:4_500_000_000,extreme:18_000_000_000},                                      maxParty:6,               minLevel:255, img:'images/bosses/blackmage.webp', monthly:true },
];

const DIFF_META = {
  easy:    { label:'EASY',    cls:'diff-easy'    },
  normal:  { label:'NORMAL',  cls:'diff-normal'  },
  hard:    { label:'HARD',    cls:'diff-hard'    },
  chaos:   { label:'CHAOS',   cls:'diff-chaos'   },
  extreme: { label:'EXTREME', cls:'diff-extreme' },
};

const MAX_CRYSTALS    = 180;
const MAX_CRYSTALS_PP = 14;
const MAX_CHARS       = 20;

/* ── 직업 목록 (nexon 영문 직업명 기준 / name 이 곧 아이콘 파일명) ── */
const JOB_LIST = [
  {name:'Hero'},{name:'Paladin'},{name:'Dark Knight'},
  {name:'Arch Mage (Fire, Poison)'},{name:'Arch Mage (Ice, Lightning)'},{name:'Bishop'},
  {name:'Bowmaster'},{name:'Marksman'},{name:'Pathfinder'},
  {name:'Night Lord'},{name:'Shadower'},{name:'Dual Blade'},
  {name:'Buccaneer'},{name:'Corsair'},{name:'Cannoneer'},
  {name:'Dawn Warrior'},{name:'Blaze Wizard'},{name:'Wind Archer'},{name:'Night Walker'},{name:'Thunder Breaker'},{name:'Mihile'},
  {name:'Aran'},{name:'Evan'},{name:'Mercedes'},{name:'Phantom'},{name:'Luminous'},{name:'Shade'},
  {name:'Battle Mage'},{name:'Wild Hunter'},{name:'Mechanic'},{name:'Blaster'},
  {name:'Demon Slayer'},{name:'Demon Avenger'},{name:'Xenon'},
  {name:'Kaiser'},{name:'Kain'},{name:'Cadena'},{name:'Angelic Buster'},
  {name:'Hayato'},{name:'Kanna'},
  {name:'Illium'},{name:'Ark'},{name:'Adele'},{name:'Khali'},
  {name:'Hoyoung'},{name:'Lara'},
  {name:'Zero'},{name:'Kinesis'},{name:'Lynn'},
  {name:'Erel Light'},{name:'Sia Astelle'},
];

/* ══════════════════════════════════════════════
   HEXA Matrix 솔 에르다 비용 (근삿값 — 게임 패치로 변경될 수 있음)
   [SE(솔 에르다), SEF(솔 에르다 조각)]  레벨 n→n+1 비용
══════════════════════════════════════════════ */
// 오리진 스킬 (최대 30레벨)
const HEXA_ORIGIN_COSTS = [
  [0,10],[0,20],[1,20],[1,30],[2,30],[2,40],[3,40],[3,50],[4,60],[5,70],
  [6,80],[7,90],[8,100],[9,110],[10,130],[12,150],[14,170],[16,190],[18,220],[20,250],
  [22,280],[25,310],[28,350],[31,390],[35,430],[39,480],[43,530],[48,590],[53,650],[60,720],
];
// 마스터리 / 강화 / 부스트 코어 (최대 10레벨, 동일 비용표 사용)
const HEXA_SUPPORT_COSTS = [
  [0,5],[0,10],[1,15],[2,25],[3,35],[4,45],[5,60],[6,80],[7,100],[8,130],
];

/* 누적 비용 헬퍼 */
function hexaCumulative(costTable, fromLv, toLv) {
  let se = 0, sef = 0;
  for (let i = fromLv; i < toLv; i++) {
    se  += costTable[i][0];
    sef += costTable[i][1];
  }
  return { se, sef };
}

/* ══════════════════════════════════════════════
   스타포스
══════════════════════════════════════════════ */
// [성공률, 실패율(유지or하락), 파괴율]
const SF_RATES = [
  [.95,.05,.00],[.90,.10,.00],[.85,.15,.00],[.85,.15,.00],[.80,.20,.00],
  [.75,.24,.01],[.70,.29,.01],[.65,.34,.01],[.60,.39,.01],[.55,.44,.01],
  [.50,.49,.01],[.45,.53,.02],[.40,.58,.02],[.35,.63,.02],[.30,.68,.02],
  [.30,.68,.02],[.30,.68,.02],[.30,.68,.02],[.30,.68,.02],[.30,.68,.02],
  [.30,.67,.03],[.30,.67,.03],[.03,.92,.05],[.02,.91,.07],[.01,.90,.09],
];
// 10성 이상 실패 시 별 하락 여부 (true = 하락)
const SF_DECREASE = [
  false,false,false,false,false,false,false,false,false,false,
  true,true,true,true,true,true,true,true,true,true,
  true,true,true,true,true,
];
// 파괴 방지 성 (12★, 17★, 22★에서 실패해도 12/17/22로 돌아옴)
const SF_NO_BOOM_FLOORS = new Set([12, 17, 22]);

// 아이템 레벨별 기준 비용 (1성당 메소, 레벨200 기준)
const SF_BASE_COST_200 = [
  500_000, 900_000, 1_400_000, 2_000_000, 2_800_000,
  3_800_000, 5_200_000, 7_000_000, 9_500_000, 12_500_000,
  16_500_000, 21_500_000, 28_000_000, 36_000_000, 46_000_000,
  58_000_000, 73_000_000, 91_000_000, 114_000_000, 142_000_000,
  176_000_000, 218_000_000, 268_000_000, 330_000_000, 410_000_000,
];

function sfCost(itemLevel, star) {
  const scale = Math.pow(itemLevel / 200, 2.7);
  return Math.round(SF_BASE_COST_200[star] * scale / 10_000) * 10_000;
}

/* ══════════════════════════════════════════════
   보스 HP 테이블 (근삿값, 단위: 억메소 아닌 HP수치)
   hp 단위: 억 (100,000,000)
══════════════════════════════════════════════ */
/* lv: 보스 레벨 / force: 요구 포스(근삿값) / ftype: 'arc'(아케인·파랑) | 'auth'(어센틱·보라) | null
   ※ 포스 수치는 근삿값이며 maplehub 등과 대조 필요.
     데미지 보정(미구현, 참고용):
      - 아케인포스: 요구량의 150% 도달 시 데미지 1.5배
      - 어센틱포스: 요구량 +10마다 +5%, 최대 125% */
const BOSS_HP_TABLE = [
  // ── 저레벨 / 중레벨 보스 ──
  {name:'자쿰',               diff:'카오스',   hp:840,        lv:140, pdr:100, force:null, ftype:null},
  {name:'핑크빈',             diff:'카오스',   hp:693,        lv:140, pdr:100, force:null, ftype:null},
  {name:'시그너스',           diff:'이지',     hp:105,        lv:140, pdr:100, force:null, ftype:null},
  {name:'시그너스',           diff:'노말',     hp:210,        lv:160, pdr:100, force:null, ftype:null},
  {name:'매그너스',           diff:'하드',     hp:1_200,      lv:155, pdr:120, force:null, ftype:null},
  {name:'힐라',               diff:'하드',     hp:168,        lv:120, pdr:100, force:null, ftype:null},
  {name:'블러디퀸',           diff:'카오스',   hp:1_400,      lv:180, pdr:120, force:null, ftype:null},
  {name:'반반',               diff:'카오스',   hp:1_000,      lv:180, pdr:100, force:null, ftype:null},
  {name:'피에르',             diff:'카오스',   hp:800,        lv:180, pdr:80,  force:null, ftype:null},
  {name:'벨룸',               diff:'카오스',   hp:2_000,      lv:180, pdr:200, force:null, ftype:null},
  {name:'파풀라투스',         diff:'카오스',   hp:5_040,      lv:180, pdr:250, force:null, ftype:null},
  {name:'노히메',             diff:'노말',     hp:5_000,      lv:140, pdr:100, force:null, ftype:null},
  {name:'아케치',             diff:'노말',     hp:3_040,      lv:140, pdr:300, force:null, ftype:null},
  // ── 스우 ──
  {name:'스우',               diff:'노말',     hp:8_700,      lv:190, pdr:300, force:null, ftype:null},
  {name:'스우',               diff:'하드',     hp:15_700,     lv:210, pdr:300, force:null, ftype:null},
  {name:'스우',               diff:'익스트림', hp:27_900,     lv:250, pdr:380, force:null, ftype:null, nameOverride:'섬멸병기 스우'},
  // ── 데미안 ──
  {name:'데미안',             diff:'노말',     hp:6_000,      lv:190, pdr:null, force:null, ftype:null},
  {name:'데미안',             diff:'하드',     hp:12_000,     lv:210, pdr:null, force:null, ftype:null},
  // ── 가디언 엔젤 슬라임 ──
  {name:'가디언 엔젤 슬라임', diff:'노말',     hp:25_000,     lv:210, pdr:null, force:null, ftype:null},
  {name:'가디언 엔젤 슬라임', diff:'카오스',   hp:50_000,     lv:225, pdr:null, force:null, ftype:null},
  // ── 아케인 포스 보스 ──
  {name:'루시드',             diff:'이지',     hp:26_700,     lv:220, pdr:null, force:360, ftype:'arc'},
  {name:'루시드',             diff:'노말',     hp:66_700,     lv:220, pdr:null, force:360, ftype:'arc'},
  {name:'루시드',             diff:'하드',     hp:120_000,    lv:230, pdr:null, force:360, ftype:'arc'},
  {name:'윌',                 diff:'이지',     hp:36_000,     lv:235, pdr:null, force:480, ftype:'arc'},
  {name:'윌',                 diff:'노말',     hp:84_000,     lv:235, pdr:null, force:480, ftype:'arc'},
  {name:'윌',                 diff:'하드',     hp:168_000,    lv:250, pdr:null, force:480, ftype:'arc'},
  {name:'더스크',             diff:'노말',     hp:127_500,    lv:245, pdr:300, force:590, ftype:'arc'},
  {name:'더스크',             diff:'하드',     hp:255_000,    lv:255, pdr:300, force:590, ftype:'arc'},
  {name:'진 힐라',            diff:'노말',     hp:440_000,    lv:250, pdr:null, force:760, ftype:'arc'},
  {name:'진 힐라',            diff:'하드',     hp:880_000,    lv:255, pdr:300, force:760, ftype:'arc'},
  {name:'듄켈',               diff:'노말',     hp:130_000,    lv:255, pdr:300, force:900, ftype:'arc'},
  {name:'듄켈',               diff:'하드',     hp:260_000,    lv:265, pdr:300, force:900, ftype:'arc'},
  {name:'검은 마법사',        diff:'하드',     hp:4_725_000,  lv:275, pdr:null, force:1320,ftype:'arc'},
  {name:'검은 마법사',        diff:'익스트림', hp:9_450_000,  lv:285, pdr:null, force:1320,ftype:'arc'},
  // ── 어센틱 포스 보스 ──
  {name:'선택받은 세렌',               diff:'노말',     hp:1_040_000,  lv:260, pdr:380, force:130, ftype:'auth'},
  {name:'선택받은 세렌',               diff:'하드',     hp:2_080_000,  lv:270, pdr:380, force:130, ftype:'auth'},
  {name:'선택받은 세렌',               diff:'익스트림', hp:4_368_000,  lv:285, pdr:380, force:130, ftype:'auth'},
  {name:'감시자 칼로스',             diff:'이지',     hp:714_000,    lv:270, pdr:380, force:350, ftype:'auth'},
  {name:'감시자 칼로스',             diff:'노말',     hp:1_606_500,  lv:270, pdr:380, force:350, ftype:'auth'},
  {name:'감시자 칼로스',             diff:'카오스',   hp:3_570_000,  lv:275, pdr:380, force:350, ftype:'auth'},
  {name:'감시자 칼로스',             diff:'익스트림', hp:7_140_000,  lv:285, pdr:380, force:350, ftype:'auth'},
  {name:'최초의 대적자',             diff:'이지',     hp:1_142_200,  lv:270, pdr:380, force:450, ftype:'auth'},
  {name:'최초의 대적자',             diff:'노말',     hp:2_569_900,  lv:270, pdr:380, force:450, ftype:'auth'},
  {name:'최초의 대적자',             diff:'하드',     hp:5_710_900,  lv:280, pdr:380, force:450, ftype:'auth'},
  {name:'최초의 대적자',             diff:'익스트림', hp:11_421_800, lv:290, pdr:380, force:450, ftype:'auth'},
  {name:'카링',               diff:'이지',     hp:1_842_000,  lv:275, pdr:380, force:530, ftype:'auth'},
  {name:'카링',               diff:'노말',     hp:4_298_000,  lv:275, pdr:380, force:530, ftype:'auth'},
  {name:'카링',               diff:'하드',     hp:9_210_000,  lv:280, pdr:380, force:530, ftype:'auth'},
  {name:'카링',               diff:'익스트림', hp:18_420_000, lv:290, pdr:380, force:530, ftype:'auth'},
  {name:'찬란한 흉성',               diff:'노말',     hp:16_300_000, lv:280, pdr:380, force:670, ftype:'auth'},
  {name:'찬란한 흉성',               diff:'하드',     hp:32_600_000, lv:285, pdr:380, force:670, ftype:'auth'},
  {name:'림보',               diff:'노말',     hp:32_400_000, lv:285, pdr:380, force:770, ftype:'auth'},
  {name:'림보',               diff:'하드',     hp:64_800_000, lv:290, pdr:380, force:770, ftype:'auth'},
  {name:'발드릭스',           diff:'노말',     hp:45_300_000, lv:290, pdr:380, force:880, ftype:'auth'},
  {name:'발드릭스',           diff:'하드',     hp:90_600_000, lv:295, pdr:380, force:880, ftype:'auth'},
];

/* ══════════════════════════════════════════════
   포스 (아케인/사크레드) 요구량 & 포뻥
══════════════════════════════════════════════ */
const ARCANE_MAPS = [
  { area:'소멸의 여로',  req:100,  symbol:'소멸', maxSymbol:2679 },
  { area:'리버스 시티', req:120,  symbol:'리버스', maxSymbol:2679 },
  { area:'모라스',      req:200,  symbol:'모라스', maxSymbol:2679 },
  { area:'에스페라',    req:260,  symbol:'에스페라', maxSymbol:2679 },
  { area:'문브릿지',    req:380,  symbol:'문브릿지', maxSymbol:2679 },
  { area:'라비린스',    req:440,  symbol:'라비린스', maxSymbol:2679 },
  { area:'리미니아',    req:500,  symbol:'리미니아', maxSymbol:2679 },
];

const SACRED_MAPS = [
  { area:'세르니움',      req:300,  symbol:'세르니움', maxSymbol:2679 },
  { area:'버닝세르니움',  req:500,  symbol:'버닝세르니움', maxSymbol:2679 },
  { area:'호텔 아르크스', req:600,  symbol:'아르크스', maxSymbol:2679 },
  { area:'오디움',        req:700,  symbol:'오디움', maxSymbol:2679 },
  { area:'상그릴라',      req:800,  symbol:'상그릴라', maxSymbol:2679 },
  { area:'아르테리아',    req:850,  symbol:'아르테리아', maxSymbol:2679 },
  { area:'카르시온',      req:930,  symbol:'카르시온', maxSymbol:2679 },
];

// 포뻥: 요구포스 초과분 5당 +2% 데미지 (최대 +100%)
function forceBoost(myForce, requiredForce) {
  if (myForce < requiredForce) {
    const penalty = Math.floor((requiredForce - myForce) / 5) * 10;
    return { pct: -Math.min(penalty, 100), penalty: true };
  }
  const bonus = Math.floor((myForce - requiredForce) / 5) * 2;
  return { pct: Math.min(bonus, 100), penalty: false };
}

// 아케인 심볼 레벨별 누적 경험치 (1→20레벨)
const ARCANE_SYM_EXP = [
  0,12,15,20,27,36,48,64,86,115,154,207,277,371,496,664,888,1188,1590,2130,
];
// 사크레드 심볼 레벨별 누적 경험치
const SACRED_SYM_EXP = [
  0,20,30,45,67,100,150,225,338,507,760,1140,1710,2565,3848,5772,8658,12987,19480,29220,
];

/* ══════════════════════════════════════════════
   해방 계산기 — 제네시스 (어둠의 흔적 누적/소모 방식)
   (근삿값 — 패치에 따라 변경될 수 있음)
══════════════════════════════════════════════ */

/* 보스 격파 시 어둠의 흔적 획득량 (난이도별)
   ※ blackmage 는 월간 보스 → 주간이 아닌 월 1회 누적 */
const TRACE_YIELD = {
  suu:      { normal:10, hard:50, extreme:50 },  // 스우 (Lotus)
  demian:   { normal:10, hard:50 },              // 데미안 (Damien)
  lucid:    { easy:15,  normal:20, hard:65 },    // 루시드 (Lucid)
  will:     { easy:15,  normal:25, hard:75 },    // 윌 (Will)
  dusk:     { normal:20, hard:65 },              // 더스크 (Gloom)
  dunkel:   { normal:25, hard:75 },              // 듄켈 (Darknell)
  jinhilla: { normal:45, hard:90 },              // 진 힐라 (Verus Hilla)
  blackmage:{ hard:600, extreme:600 },           // 검은 마법사 (월간)
};

/* 제네시스 해방 퀘스트 체인 — 누적 흔적 임계치(cum).
   각 퀘스트 소모량 = 해당 cum - 직전 cum.
   목표(해방) 누적 = 6500 */
const GENESIS_QUESTS = [
  { name:'반 레온',      cum:0    },
  { name:'아카이럼',     cum:500  },
  { name:'매그너스',     cum:1000 },
  { name:'스우(로터스)', cum:1500 },
  { name:'데미안',       cum:2500 },
  { name:'윌',           cum:3500 },
  { name:'루시드',       cum:4500 },
  { name:'진 힐라',      cum:5500 },
  { name:'해방 완료',    cum:6500 },
];
const GENESIS_TARGET = 6500;
const TRACE_HOLD_MAX = 3000;
const GENESIS_PASS_MULT = 3;     // 제네시스 패스: 흔적 획득 3배

/* ══════════════════════════════════════════════
   보스 HP 페이즈 데이터 (직접 기입)
   형식: '보스명_난이도': [{label:'페이즈1', hp:'300억'}]
   ※ BOSS_HP_TABLE 의 diff 값(한글)과 동일하게 키를 작성하세요.
══════════════════════════════════════════════ */
const BOSS_HP_PHASES = {
  '아케치_노말': [
    { label:'1페이즈', hp:'152B' },
    { label:'2페이즈', hp:'152B' },
  ],
  '파풀라투스_카오스': [
    { label:'1페이즈', hp:'378B' },
    { label:'2페이즈', hp:'126B' },
  ],
  '스우_하드': [
    { label:'1페이즈', hp:'470B' },
    { label:'2페이즈', hp:'470B' },
    { label:'3페이즈', hp:'630B' },
  ],
  '데미안_하드': [
    { label:'1페이즈', hp:'840B' },
    { label:'2페이즈', hp:'360B' },
  ],
  '루시드_하드': [
    { label:'1페이즈', hp:'6T' },
    { label:'2페이즈', hp:'6T' },
  ],
  '윌_하드': [
    { label:'1페이즈 (파랑)', hp:'933.33B' },
    { label:'1페이즈 (보라)', hp:'933.33B' },
    { label:'2페이즈', hp:'2.10T' },
    { label:'3페이즈', hp:'7T' },
  ],
  '진 힐라_하드': [
    { label:'1페이즈', hp:'22T' },
    { label:'2페이즈', hp:'22T' },
    { label:'3페이즈', hp:'22T' },
    { label:'4페이즈', hp:'22T' },
  ],
  '세렌_하드': [
    { label:'1페이즈', hp:'52.50T' },
    { label:'2페이즈', hp:'155.50T' },
  ],
  '칼로스_카오스': [
    { label:'1페이즈', hp:'94.50T' },
    { label:'2페이즈 (×4)', hp:'65.63T' },
  ],
  '대적자_하드': [
    { label:'1페이즈', hp:'171.54T' },
    { label:'2페이즈', hp:'171.54T' },
    { label:'3페이즈', hp:'228.01T' },
  ],
  '카링_하드': [
    { label:'1페이즈 페릴스 (×3)', hp:'96T' },
    { label:'2페이즈', hp:'105T' },
    { label:'3페이즈 보스', hp:'150T' },
    { label:'3페이즈 페릴스 (×3)', hp:'126T' },
  ],
  '흉성_하드': [
    { label:'1페이즈', hp:'657.60T' },
    { label:'2페이즈', hp:'1.30Q' },
    { label:'3페이즈', hp:'1.30Q' },
  ],
  '림보_하드': [
    { label:'1페이즈', hp:'1.94Q' },
    { label:'2페이즈', hp:'970T' },
    { label:'3페이즈', hp:'2.60Q' },
  ],
  '발드릭스_하드': [
    { label:'1페이즈', hp:'2.38Q' },
    { label:'2페이즈', hp:'2.53Q' },
    { label:'3페이즈', hp:'4.15Q' },
  ],
  '검은 마법사_하드': [
    { label:'1페이즈', hp:'63T' },
    { label:'2페이즈', hp:'115.50T' },
    { label:'3페이즈', hp:'157.50T' },
    { label:'4페이즈', hp:'136.50T' },
  ],
};
