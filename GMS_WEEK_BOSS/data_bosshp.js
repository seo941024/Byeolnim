/* =============================================
   data_bosshp.js — 보스 HP / 심볼 데이터
   ============================================= */

const BOSS_HP_TABLE = [
  {name:'유피테르',           diff:'노말',     hp:102_600_000,  lv:295, pdr:380, force:810,  ftype:'auth'},
  {name:'유피테르',           diff:'하드',     hp:494_000_000,  lv:295, pdr:380, force:810,  ftype:'auth'},
  {name:'발드릭스',           diff:'노말',     hp:90_600_000,   lv:290, pdr:380, force:700,  ftype:'auth'},
  {name:'발드릭스',           diff:'하드',     hp:203_400_000,  lv:290, pdr:380, force:700,  ftype:'auth'},
  {name:'림보',               diff:'노말',     hp:64_800_000,   lv:285, pdr:380, force:500,  ftype:'auth'},
  {name:'림보',               diff:'하드',     hp:125_500_000,  lv:285, pdr:380, force:500,  ftype:'auth'},
  {name:'찬란한 흉성',        diff:'노말',     hp:32_600_000,   lv:280, pdr:380, force:400,  ftype:'auth'},
  {name:'찬란한 흉성',        diff:'하드',     hp:147_000_000,  lv:280, pdr:380, force:550,  ftype:'auth'},
  {name:'카링',               diff:'이지',     hp:9_210_000,    lv:275, pdr:380, force:230,  ftype:'auth'},
  {name:'카링',               diff:'노말',     hp:39_300_000,   lv:285, pdr:380, force:330,  ftype:'auth'},
  {name:'카링',               diff:'하드',     hp:94_000_000,   lv:285, pdr:380, force:350,  ftype:'auth'},
  {name:'카링',               diff:'익스트림', hp:545_900_000,  lv:285, pdr:380, force:480,  ftype:'auth'},
  {name:'최초의 대적자',      diff:'이지',     hp:5_710_900,    lv:270, pdr:380, force:220,  ftype:'auth'},
  {name:'최초의 대적자',      diff:'노말',     hp:16_400_000,   lv:280, pdr:380, force:320,  ftype:'auth'},
  {name:'최초의 대적자',      diff:'하드',     hp:105_900_000,  lv:285, pdr:380, force:340,  ftype:'auth'},
  {name:'최초의 대적자',      diff:'익스트림', hp:335_600_000,  lv:290, pdr:380, force:460,  ftype:'auth'},
  {name:'감시자 칼로스',      diff:'이지',     hp:3_570_000,    lv:270, pdr:380, force:200,  ftype:'auth'},
  {name:'감시자 칼로스',      diff:'노말',     hp:10_600_000,   lv:280, pdr:380, force:300,  ftype:'auth'},
  {name:'감시자 칼로스',      diff:'카오스',   hp:51_000_000,   lv:285, pdr:380, force:330,  ftype:'auth'},
  {name:'감시자 칼로스',      diff:'익스트림', hp:215_700_000,  lv:285, pdr:380, force:440,  ftype:'auth'},
  {name:'선택받은 세렌',      diff:'노말',     hp:2_080_000,    lv:270, pdr:380, force:200,  ftype:'auth'},
  {name:'선택받은 세렌',      diff:'하드',     hp:4_830_000,    lv:275, pdr:380, force:200,  ftype:'auth'},
  {name:'선택받은 세렌',      diff:'익스트림', hp:64_800_000,   lv:280, pdr:380, force:200,  ftype:'auth'},
  {name:'검은 마법사',        diff:'하드',     hp:4_725_000,    lv:275, pdr:300, force:1320, ftype:'arc'},
  {name:'검은 마법사',        diff:'익스트림', hp:48_100_000,   lv:280, pdr:300, force:1320, ftype:'arc'},
  {name:'진 힐라',            diff:'노말',     hp:880_000,      lv:250, pdr:300, force:820,  ftype:'arc'},
  {name:'진 힐라',            diff:'하드',     hp:1_760_000,    lv:255, pdr:300, force:900,  ftype:'arc'},
  {name:'듄켈',               diff:'노말',     hp:260_000,      lv:265, pdr:300, force:850,  ftype:'arc'},
  {name:'듄켈',               diff:'하드',     hp:1_575_000,    lv:265, pdr:300, force:850,  ftype:'arc'},
  {name:'더스크',             diff:'노말',     hp:255_000,      lv:255, pdr:300, force:730,  ftype:'arc'},
  {name:'더스크',             diff:'카오스',   hp:1_275_000,    lv:255, pdr:300, force:730,  ftype:'arc'},
  {name:'윌',                 diff:'이지',     hp:168_000,      lv:235, pdr:300, force:560,  ftype:'arc'},
  {name:'윌',                 diff:'노말',     hp:252_000,      lv:250, pdr:300, force:760,  ftype:'arc'},
  {name:'윌',                 diff:'하드',     hp:1_260_000,    lv:250, pdr:300, force:760,  ftype:'arc'},
  {name:'루시드',             diff:'이지',     hp:120_000,      lv:230, pdr:300, force:360,  ftype:'arc'},
  {name:'루시드',             diff:'노말',     hp:240_000,      lv:230, pdr:300, force:360,  ftype:'arc'},
  {name:'루시드',             diff:'하드',     hp:1_176_000,    lv:230, pdr:300, force:360,  ftype:'arc'},
  {name:'가디언 엔젤 슬라임', diff:'노말',     hp:50_000,       lv:210, pdr:300, force:null, ftype:null},
  {name:'가디언 엔젤 슬라임', diff:'카오스',   hp:900_000,      lv:220, pdr:300, force:null, ftype:null},
  {name:'데미안',             diff:'노말',     hp:12_000,       lv:190, pdr:300, force:null, ftype:null},
  {name:'데미안',             diff:'하드',     hp:360_000,      lv:210, pdr:300, force:null, ftype:null},
  {name:'스우',               diff:'노말',     hp:15_700,       lv:190, pdr:300, force:null, ftype:null},
  {name:'스우',               diff:'하드',     hp:335_000,      lv:210, pdr:300, force:null, ftype:null},
  {name:'스우',               diff:'익스트림', hp:18_100_000,   lv:285, pdr:380, force:null, ftype:null, nameOverride:'섬멸병기 스우'},
  {name:'파풀라투스',         diff:'카오스',   hp:5_040,        lv:180, pdr:250, force:null, ftype:null},
  {name:'아케치',             diff:'노말',     hp:3_040,        lv:140, pdr:300, force:null, ftype:null},
  {name:'노히메',             diff:'노말',     hp:5_000,        lv:140, pdr:100, force:null, ftype:null},
  {name:'벨룸',               diff:'카오스',   hp:2_000,        lv:180, pdr:200, force:null, ftype:null},
  {name:'블러디퀸',           diff:'카오스',   hp:1_400,        lv:180, pdr:120, force:null, ftype:null},
  {name:'피에르',             diff:'카오스',   hp:800,          lv:180, pdr:80,  force:null, ftype:null},
  {name:'반반',               diff:'카오스',   hp:1_000,        lv:180, pdr:100, force:null, ftype:null},
  {name:'매그너스',           diff:'하드',     hp:1_200,        lv:155, pdr:120, force:null, ftype:null},
  {name:'시그너스',           diff:'이지',     hp:105,          lv:140, pdr:100, force:null, ftype:null},
  {name:'시그너스',           diff:'노말',     hp:210,          lv:160, pdr:100, force:null, ftype:null},
  {name:'핑크빈',             diff:'카오스',   hp:693,          lv:140, pdr:100, force:null, ftype:null},
  {name:'힐라',               diff:'하드',     hp:168,          lv:120, pdr:100, force:null, ftype:null},
  {name:'자쿰',               diff:'카오스',   hp:840,          lv:140, pdr:100, force:null, ftype:null},
];

function forceBoost(myForce, requiredForce) {
  if (myForce < requiredForce) {
    const penalty = Math.floor((requiredForce - myForce) / 5) * 10;
    return { pct: -Math.min(penalty, 100), penalty: true };
  }
  const bonus = Math.floor((myForce - requiredForce) / 5) * 2;
  return { pct: Math.min(bonus, 100), penalty: false };
}

const ARCANE_SYM_EXP = [
  0,12,15,20,27,36,48,64,86,115,154,207,277,371,496,664,888,1188,1590,2130,
];
const SACRED_SYM_EXP = [
  0,20,30,45,67,100,150,225,338,507,760,1140,1710,2565,3848,5772,8658,12987,19480,29220,
];

const BOSS_HP_PHASES = {
  '아케치_노말': [
    { label:'Phase 1', hp:'152B' },
    { label:'Phase 2', hp:'152B' },
  ],
  '파풀라투스_카오스': [
    { label:'Phase 1', hp:'378B' },
    { label:'Phase 2', hp:'126B' },
  ],
  '데미안_노말': [
    { label:'Phase 1', hp:'840B' },
    { label:'Phase 2', hp:'360B' },
  ],
  '데미안_하드': [
    { label:'Phase 1', hp:'25.20T' },
    { label:'Phase 2', hp:'10.80T' },
  ],
  '스우_노말': [
    { label:'Phase 1', hp:'470B' },
    { label:'Phase 2', hp:'470B' },
    { label:'Phase 3', hp:'630B' },
  ],
  '스우_하드': [
    { label:'Phase 1', hp:'10T' },
    { label:'Phase 2', hp:'10T' },
    { label:'Phase 3', hp:'13.50T' },
  ],
  '스우_익스트림': [
    { label:'Phase 1', hp:'545T' },
    { label:'Phase 2', hp:'545T' },
    { label:'Phase 3', hp:'720T' },
  ],
  '루시드_이지': [
    { label:'Phase 1', hp:'6T' },
    { label:'Phase 2', hp:'6T' },
  ],
  '루시드_노말': [
    { label:'Phase 1', hp:'12T' },
    { label:'Phase 2', hp:'12T' },
  ],
  '루시드_하드': [
    { label:'Phase 1', hp:'50.80T' },
    { label:'Phase 2', hp:'54T' },
    { label:'Phase 3', hp:'12.80T' },
  ],
  '윌_이지': [
    { label:'Phase 1 Blue (×3)', hp:'933.33B' },
    { label:'Phase 1 Purple (×3)', hp:'933.33B' },
    { label:'Phase 2 (×2)', hp:'2.10T' },
    { label:'Phase 3', hp:'7T' },
  ],
  '윌_노말': [
    { label:'Phase 1 Blue (×3)', hp:'1.40T' },
    { label:'Phase 1 Purple (×3)', hp:'1.40T' },
    { label:'Phase 2 (×2)', hp:'3.15T' },
    { label:'Phase 3', hp:'10.50T' },
  ],
  '윌_하드': [
    { label:'Phase 1 Blue (×3)', hp:'7T' },
    { label:'Phase 1 Purple (×3)', hp:'7T' },
    { label:'Phase 2 (×2)', hp:'15.75T' },
    { label:'Phase 3', hp:'52.50T' },
  ],
  '진 힐라_노말': [
    { label:'Phase 1', hp:'22T' },
    { label:'Phase 2', hp:'22T' },
    { label:'Phase 3', hp:'22T' },
    { label:'Phase 4', hp:'22T' },
  ],
  '진 힐라_하드': [
    { label:'Phase 1', hp:'44T' },
    { label:'Phase 2', hp:'44T' },
    { label:'Phase 3', hp:'44T' },
    { label:'Phase 4', hp:'44T' },
  ],
  '검은 마법사_하드': [
    { label:'Phase 1', hp:'63T' },
    { label:'Phase 2', hp:'115.50T' },
    { label:'Phase 3', hp:'157.50T' },
    { label:'Phase 4', hp:'136.50T' },
  ],
  '검은 마법사_익스트림': [
    { label:'Phase 1', hp:'1.18Q' },
    { label:'Phase 2', hp:'1.19Q' },
    { label:'Phase 3', hp:'1.28Q' },
    { label:'Phase 4', hp:'1.15Q' },
  ],
  '선택받은 세렌_노말': [
    { label:'Phase 1', hp:'52.50T' },
    { label:'Phase 2', hp:'155.50T' },
  ],
  '선택받은 세렌_하드': [
    { label:'Phase 1', hp:'126T' },
    { label:'Phase 2', hp:'357T' },
  ],
  '선택받은 세렌_익스트림': [
    { label:'Phase 1', hp:'1.32Q' },
    { label:'Phase 2', hp:'5.16Q' },
  ],
  '감시자 칼로스_이지': [
    { label:'Phase 1', hp:'94.50T' },
    { label:'Phase 2 (×4)', hp:'65.63T' },
  ],
  '감시자 칼로스_노말': [
    { label:'Phase 1', hp:'336T' },
    { label:'Phase 2 (×4)', hp:'180T' },
  ],
  '감시자 칼로스_카오스': [
    { label:'Phase 1', hp:'1.06Q' },
    { label:'Phase 2 (×4)', hp:'1.01Q' },
  ],
  '감시자 칼로스_익스트림': [
    { label:'Phase 1', hp:'5.97Q' },
    { label:'Phase 2 (×4)', hp:'3.90Q' },
  ],
  '최초의 대적자_이지': [
    { label:'Phase 1', hp:'171.54T' },
    { label:'Phase 2', hp:'171.54T' },
    { label:'Phase 3', hp:'228.01T' },
  ],
  '최초의 대적자_노말': [
    { label:'Phase 1', hp:'494.11T' },
    { label:'Phase 2', hp:'494.11T' },
    { label:'Phase 3', hp:'646.78T' },
  ],
  '최초의 대적자_하드': [
    { label:'Phase 1', hp:'3.18Q' },
    { label:'Phase 2', hp:'3.18Q' },
    { label:'Phase 3', hp:'4.23Q' },
  ],
  '최초의 대적자_익스트림': [
    { label:'Phase 1', hp:'10.08Q' },
    { label:'Phase 2', hp:'10.08Q' },
    { label:'Phase 3', hp:'13.40Q' },
  ],
  '카링_이지': [
    { label:'Phase 1 Perils (×3)', hp:'96T' },
    { label:'Phase 2', hp:'105T' },
    { label:'Phase 3 Kaling', hp:'150T' },
    { label:'Phase 3 Perils (×3)', hp:'126T' },
  ],
  '카링_노말': [
    { label:'Phase 1 Perils (×3)', hp:'400T' },
    { label:'Phase 2', hp:'468T' },
    { label:'Phase 3 Kaling', hp:'722T' },
    { label:'Phase 3 Perils (×3)', hp:'512T' },
  ],
  '카링_하드': [
    { label:'Phase 1 Perils (×3)', hp:'906T' },
    { label:'Phase 2', hp:'1.40Q' },
    { label:'Phase 3 Kaling', hp:'2.24Q' },
    { label:'Phase 3 Perils (×3)', hp:'1.83Q' },
  ],
  '카링_익스트림': [
    { label:'Phase 1 Perils (×3)', hp:'6.07Q' },
    { label:'Phase 2', hp:'6.93Q' },
    { label:'Phase 3 Kaling', hp:'8.66Q' },
    { label:'Phase 3 Perils (×3)', hp:'6.93Q' },
  ],
  '찬란한 흉성_노말': [
    { label:'Phase 1', hp:'657.60T' },
    { label:'Phase 2', hp:'1.30Q' },
    { label:'Phase 3', hp:'1.30Q' },
  ],
  '찬란한 흉성_하드': [
    { label:'Phase 1', hp:'2.90Q' },
    { label:'Phase 2', hp:'5.90Q' },
    { label:'Phase 3', hp:'5.90Q' },
  ],
  '림보_노말': [
    { label:'Phase 1', hp:'1.94Q' },
    { label:'Phase 2 (×2)', hp:'970T' },
    { label:'Phase 3', hp:'2.60Q' },
  ],
  '림보_하드': [
    { label:'Phase 1', hp:'3.78Q' },
    { label:'Phase 2 (×2)', hp:'1.89Q' },
    { label:'Phase 3', hp:'4.99Q' },
  ],
  '발드릭스_노말': [
    { label:'Phase 1', hp:'2.38Q' },
    { label:'Phase 2', hp:'2.53Q' },
    { label:'Phase 3', hp:'4.15Q' },
  ],
  '발드릭스_하드': [
    { label:'Phase 1', hp:'5.34Q' },
    { label:'Phase 2', hp:'5.69Q' },
    { label:'Phase 3', hp:'9.31Q' },
  ],
  '유피테르_노말': [
    { label:'Phase 1', hp:'2.05Q' },
    { label:'Phase 2', hp:'3.08Q' },
    { label:'Phase 3', hp:'5.13Q' },
  ],
  '유피테르_하드': [
    { label:'Phase 1', hp:'9.88Q' },
    { label:'Phase 2', hp:'14.82Q' },
    { label:'Phase 3', hp:'24.70Q' },
  ],
};
