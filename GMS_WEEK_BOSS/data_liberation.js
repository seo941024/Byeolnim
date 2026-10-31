/* =============================================
   data_liberation.js — 해방 계산기 데이터
   ============================================= */

const TRACE_YIELD = {
  suu:      { normal:10, hard:50, extreme:50 },
  demian:   { normal:10, hard:50 },
  lucid:    { easy:15,  normal:20, hard:65 },
  will:     { easy:15,  normal:25, hard:75 },
  // 더스크의 실제 난이도는 노말·카오스다. 65를 하드로 적어놨던 걸 바로잡음
  // (수치는 그대로, 라벨만 틀렸었다 — 데스티니 칼로스와 같은 유형의 오류).
  dusk:     { normal:20, chaos:65 },
  dunkel:   { normal:25, hard:75 },
  jinhilla: { normal:45, hard:90 },
  blackmage:{ hard:600, extreme:600 },
};

/* cum = 이 퀘스트를 시작하는 시점까지 이미 모은 흔적(앞 퀘스트들의 요구량 합).
   need = 이 퀘스트 자체가 요구하는 흔적. 앞의 셋만 500이고 나머지는 1,000이라
   전부 더하면 GENESIS_TARGET(6,500)과 맞는다. */
const GENESIS_QUESTS = [
  { name:'반 레온',  cum:0,    need:500  },
  { name:'아카이럼', cum:500,  need:500  },
  { name:'매그너스', cum:1000, need:500  },
  { name:'스우',     cum:1500, need:1000 },
  { name:'데미안',   cum:2500, need:1000 },
  { name:'윌',       cum:3500, need:1000 },
  { name:'루시드',   cum:4500, need:1000 },
  { name:'진 힐라',  cum:5500, need:1000 },
];
const GENESIS_TARGET   = 6500;
const TRACE_HOLD_MAX   = 3000;
const GENESIS_PASS_MULT = 3;

const DESTINY_RESOLVE_YIELD = {
  seren:      { 하드:6,   익스트림:80 },
  // ★ 칼로스는 예전에 70/400을 하드/카오스로 잘못 적어놨었다. 실제 난이도는
  //    노말·카오스·익스트림이라 라벨만 한 칸씩 밀려 있었던 것(수치는 동일).
  kalos:      { 노말:10,  카오스:70, 익스트림:400 },
  daejuk:     { 노말:15,  하드:120, 익스트림:500 },
  kaling:     { 노말:20,  하드:160, 익스트림:1200 },
  hyungseong: { 노말:20,  하드:380 },
  bellona:    { 이지:8,   노말:100, 하드:420 },
  limbo:      { 노말:120, 하드:360 },
  baldrix:    { 노말:150, 하드:450 },
  jupiter:    { 노말:160, 하드:500 },
};
/* 해방 계산기 보스·재화 그림은 GMS v.270 게임 파일 원본 PNG다. 보스는 UI/UIBoss.img 보스 목록의 작은 아이콘,
   재화는 아이템 아이콘이다. 벨로나는 GMS에 아직 없어 메이플 위키에 올라온 KMS 같은 형식 아이콘 Maple Guide - Bellona를 쓴다 */
const LIB_BOSS_ICON = id => `images/liberation/boss/${id}.png`;
const DESTINY_BOSS_META = [
  { id:'seren',      name:'선택받은 세렌', maxParty:6, img:LIB_BOSS_ICON('seren') },
  { id:'kalos',      name:'감시자 칼로스', maxParty:6, img:LIB_BOSS_ICON('kalos') },
  { id:'daejuk',     name:'최초의 대적자', maxParty:3, img:LIB_BOSS_ICON('daejuk') },
  { id:'kaling',     name:'카링',          maxParty:6, img:LIB_BOSS_ICON('kaling') },
  { id:'hyungseong', name:'찬란한 흉성',   maxParty:3, img:LIB_BOSS_ICON('hyungseong') },
  { id:'bellona',    name:'벨로나',        maxParty:3, img:LIB_BOSS_ICON('bellona') },
  { id:'limbo',      name:'림보',          maxParty:3, img:LIB_BOSS_ICON('limbo') },
  { id:'baldrix',    name:'발드릭스',      maxParty:3, img:LIB_BOSS_ICON('baldrix') },
  { id:'jupiter',    name:'유피테르',      maxParty:3, img:LIB_BOSS_ICON('jupiter') },
];

/* 결전 퀘스트 — 각 퀘스트를 열려면 "요구 대적자의 결의"만큼 모아야 한다.
   cum은 처음부터 그 퀘스트까지 필요한 누적량(= 앞 퀘스트들 요구량의 합 + 자기 요구량).
   1차 초월 누적 7,500 / 2차 초월 누적 45,000으로, 기존 목표치와 정확히 맞는다. */
const DESTINY_QUESTS = [
  { stage:1, name:'선택받은 세렌', need:2000,  cum:2000  },
  { stage:1, name:'감시자 칼로스', need:2500,  cum:4500  },
  { stage:1, name:'사도 카링',     need:3000,  cum:7500  },
  { stage:2, name:'최초의 대적자', need:10000, cum:17500 },
  { stage:2, name:'림보',          need:12500, cum:30000 },
  { stage:2, name:'발드릭스',      need:15000, cum:45000 },
];
const DESTINY_1ST_TARGET  = 7500;
const DESTINY_2ND_TARGET  = 45000;
// GMS v.270 패치노트 "Up to 15,000 Adversary's Determination can be accumulated."
const DESTINY_RESOLVE_MAX = 15000;

/* =============================================
   아스트라 보조무기 — 조각(일일 퀘스트) + 흔적(주간 보스)
   ============================================= */
const ASTRA_TRACE_YIELD = {
  seren:      { 노말:6,  하드:15, 익스트림:180 },
  kalos:      { 이지:6,  노말:30, 카오스:100, 익스트림:500 },
  daejuk:     { 이지:10, 노말:40, 하드:180,   익스트림:540 },
  kaling:     { 이지:20, 노말:80, 하드:240,   익스트림:1440 },
  hyungseong: { 노말:60, 하드:240 },
  bellona:    { 이지:25, 노말:80, 하드:240 },
  limbo:      { 노말:80, 하드:240 },
  baldrix:    { 노말:80, 하드:240 },
  jupiter:    { 노말:210, 하드:630 },
};
// 유피테르 흔적은 GMS v.270 패치노트와 maplestorywiki "Astra Secondary Weapon" 표 기준
const ASTRA_BOSS_META = DESTINY_BOSS_META;
// 격전의 흔적은 1,000개까지만 모을 수 있다. maplestorywiki "Up to 1,000 Traces of Battle can be accumulated"
const ASTRA_TRACE_MAX = 1000;

// 일일 퀘스트 지역 — 높은 지역일수록 하루에 얻는 조각이 많다
const ASTRA_DAILY_AREAS = [
  { name:'기어드락',      lv:295, frag:65 },
  { name:'탈라하트',      lv:290, frag:45 },
  { name:'카르시온',      lv:285, frag:25 },
  { name:'아르테리아',    lv:280, frag:15 },
  { name:'도원경',        lv:275, frag:10 },
  { name:'오디움',        lv:270, frag:6  },
  { name:'호텔 아르크스', lv:265, frag:3  },
  { name:'세르니움',      lv:260, frag:1  },
];

// 보조무기 단계별 퀘스트 요구량. 지금 낀 무기가 '일반'이면 3개 다 해야 한다.
const ASTRA_QUESTS = [
  { name:'1차 퀘스트', frag:3000, trace:600 },
  { name:'2차 퀘스트', frag:3000, trace:600 },
  { name:'3차 퀘스트', frag:4000, trace:800 },
];
// 지금 낀 보조무기. 3차 해방이 마지막이라 '아스트라 3차'를 고르면 남은 퀘스트가 없다
const ASTRA_WEAPON_STAGES = ['일반', '아스트라 1차', '아스트라 2차', '아스트라 3차'];
