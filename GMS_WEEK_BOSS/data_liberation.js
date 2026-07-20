/* =============================================
   data_liberation.js — 해방 계산기 데이터
   ============================================= */

const TRACE_YIELD = {
  suu:      { normal:10, hard:50, extreme:50 },
  demian:   { normal:10, hard:50 },
  lucid:    { easy:15,  normal:20, hard:65 },
  will:     { easy:15,  normal:25, hard:75 },
  dusk:     { normal:20, hard:65 },
  dunkel:   { normal:25, hard:75 },
  jinhilla: { normal:45, hard:90 },
  blackmage:{ hard:600, extreme:600 },
};

const GENESIS_QUESTS = [
  { name:'반 레온',  cum:0    },
  { name:'아카이럼', cum:500  },
  { name:'매그너스', cum:1000 },
  { name:'스우',     cum:1500 },
  { name:'데미안',   cum:2500 },
  { name:'윌',       cum:3500 },
  { name:'루시드',   cum:4500 },
  { name:'진 힐라',  cum:5500 },
];
const GENESIS_TARGET   = 6500;
const TRACE_HOLD_MAX   = 3000;
const GENESIS_PASS_MULT = 3;

const DESTINY_RESOLVE_YIELD = {
  seren:      { 하드:6,   익스트림:80 },
  kalos:      { 노말:10,  하드:70,  카오스:400 },
  daejuk:     { 노말:20,  하드:120, 익스트림:500 },
  kaling:     { 노말:20,  하드:160, 익스트림:1200 },
  hyungseong: { 노말:20,  하드:380 },
  limbo:      { 노말:120, 하드:360 },
  baldrix:    { 노말:150, 하드:450 },
  jupiter:    { 노말:160, 하드:500 },
};
const DESTINY_BOSS_META = [
  { id:'seren',      name:'선택받은 세렌', maxParty:6, img:'images/bosses/seren.webp' },
  { id:'kalos',      name:'감시자 칼로스', maxParty:6, img:'images/bosses/kalos.webp' },
  { id:'daejuk',     name:'최초의 대적자', maxParty:3, img:'images/bosses/daejuk.webp' },
  { id:'kaling',     name:'카링',          maxParty:6, img:'images/bosses/kaling.webp' },
  { id:'hyungseong', name:'찬란한 흉성',   maxParty:3, img:'images/bosses/hyungseong.webp' },
  { id:'limbo',      name:'림보',          maxParty:3, img:'images/bosses/limbo.webp' },
  { id:'baldrix',    name:'발드릭스',      maxParty:3, img:'images/bosses/baldrix.webp' },
  { id:'jupiter',    name:'유피테르',      maxParty:3, img:'images/bosses/jupiter.webp' },
];
const DESTINY_1ST_TARGET  = 7500;
const DESTINY_2ND_TARGET  = 45000;
const DESTINY_RESOLVE_MAX = 50000;
