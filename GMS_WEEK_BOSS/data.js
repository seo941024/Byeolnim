/* =============================================
   data.js — 보스 · 직업 공통 데이터
   ============================================= */

/* 결정석 가격은 히어로익 월드 값이다. GMS 위키 Intense Power Crystal 표 값의 5배이고, 일반 월드는 app.js crystalPrice가 1/5로 나눈다 */
/* 보스 그림은 GMS v.270 게임 파일 UI/UIBoss.img 보스 목록의 작은 아이콘 원본 PNG다. 테두리가 그림에 들어 있다.
   보스 정보 팝업은 파일 이름으로 images/bosses_gif/<id>.gif를 찾으므로 파일 이름은 id와 같게 둔다 */
/* 보스 GMS 영문 이름. GMS v270 UI/UIBoss.img/BossList/<번호>/info 값 그대로다. 벨로나는 GMS에 아직 없어 빠졌다.
   해방 퀘스트 단계 이름에 나오는 반 레온·아카이럼·사도 카링도 같은 목록에서 가져왔다 */
const BOSS_NAME_EN = {
  '유피테르':'Jupiter', '발드릭스':'Baldrix', '림보':'Limbo', '찬란한 흉성':'Malefic Star', '카링':'Kaling', '사도 카링':'Kaling',
  '최초의 대적자':'First Adversary', '감시자 칼로스':'Kalos the Guardian', '선택받은 세렌':'Chosen Seren', '검은 마법사':'Black Mage',
  '진 힐라':'Verus Hilla', '듄켈':'Darknell', '더스크':'Gloom', '윌':'Will', '루시드':'Lucid', '가디언 엔젤 슬라임':'Guardian Angel Slime',
  '데미안':'Damien', '스우':'Lotus', '파풀라투스':'Papulatus', '아케치':'Akechi Mitsuhide', '노히메':'Princess No', '벨룸':'Vellum',
  '블러디퀸':'Crimson Queen', '피에르':'Pierre', '반반':'Von Bon', '매그너스':'Magnus', '시그너스':'Cygnus', '핑크빈':'Pink Bean',
  '힐라':'Hilla', '자쿰':'Zakum', '반 레온':'Von Leon', '아카이럼':'Arkarium',
};
/* 화면에 쓸 보스 이름. 게임 이름 표기가 영어면 GMS 이름, 없으면 한글 그대로 */
const bossName = ko => gameName(ko, BOSS_NAME_EN[ko]);

const BOSS_DATA = [
  { id:'jupiter',    name:'유피테르',            diffs:{normal:2_965_000_000,hard:5_953_000_000},                                       maxParty:3, minLevel:295, img:'images/official/boss/jupiter.png' },
  { id:'baldrix',    name:'발드릭스',            diffs:{normal:2_800_000_000,hard:4_200_000_000},                                        maxParty:3, minLevel:290, img:'images/official/boss/baldrix.png' },
  { id:'limbo',      name:'림보',                diffs:{normal:2_100_000_000,hard:3_745_000_000},                                        maxParty:3, minLevel:285, img:'images/official/boss/limbo.png' },
  { id:'hyungseong', name:'찬란한 흉성',         diffs:{normal:1_452_000_000,hard:3_990_000_000},                                        maxParty:3, minLevel:280, img:'images/official/boss/hyungseong.png' },
  { id:'kaling',     name:'카링',                diffs:{easy:1_031_250_000,normal:1_506_500_000,hard:2_990_000_000,extreme:6_026_000_000},maxParty:6, minLevel:275, img:'images/official/boss/kaling.png' },
  { id:'daejuk',     name:'최초의 대적자',       diffs:{easy:985_000_000,normal:1_365_000_000,hard:2_940_000_000,extreme:5_880_000_000},  maxParty:3, minLevel:270, img:'images/official/boss/daejuk.png' },
  { id:'kalos',      name:'감시자 칼로스',       diffs:{easy:937_500_000,normal:1_300_000_000,chaos:2_600_000_000,extreme:5_200_000_000}, maxParty:6, minLevel:265, img:'images/official/boss/kalos.png' },
  { id:'seren',      name:'선택받은 세렌',       diffs:{normal:889_021_875,hard:1_096_560_000,extreme:4_235_000_000},                     maxParty:6, minLevel:260, img:'images/official/boss/seren.png' },
  { id:'blackmage',  name:'검은 마법사',         diffs:{hard:4_500_000_000,extreme:18_000_000_000},                                      maxParty:6, minLevel:255, img:'images/official/boss/blackmage.png', monthly:true },
  { id:'jinhilla',   name:'진 힐라',             diffs:{normal:581_880_000,hard:762_105_000},                                            maxParty:6, minLevel:250, img:'images/official/boss/jinhilla.png' },
  { id:'dunkel',     name:'듄켈',                diffs:{normal:316_875_000,hard:667_920_000},                                            maxParty:6, minLevel:255, img:'images/official/boss/dunkel.png' },
  { id:'dusk',       name:'더스크',              diffs:{normal:297_675_000,chaos:563_945_000},                                           maxParty:6, minLevel:245, img:'images/official/boss/dusk.png' },
  { id:'will',       name:'윌',                  diffs:{easy:246_744_750,normal:279_075_000,hard:621_810_000},                            maxParty:6, minLevel:235, img:'images/official/boss/will.png' },
  { id:'lucid',      name:'루시드',              diffs:{easy:237_009_375,normal:253_828_125,hard:504_000_000},                           maxParty:6, minLevel:220, img:'images/official/boss/lucid.png' },
  { id:'gaensl',     name:'가디언 엔젤 슬라임',  diffs:{normal:231_673_500,chaos:600_578_125},                                           maxParty:6, minLevel:210, img:'images/official/boss/gaensl.png' },
  { id:'demian',     name:'데미안',              diffs:{normal:169_000_000,hard:421_875_000},                                            maxParty:6, minLevel:190, img:'images/official/boss/demian.png' },
  { id:'suu',        name:'스우',                diffs:{normal:162_562_500,hard:444_675_000,extreme:1_397_500_000},                      maxParty:{normal:6,hard:6,extreme:2}, minLevel:190, img:'images/official/boss/suu.png' },
  { id:'papulus',    name:'파풀라투스',          diffs:{chaos:132_250_000},                                                              maxParty:6, minLevel:190, img:'images/official/boss/papulus.png' },
  { id:'akechi',     name:'아케치',              diffs:{normal:144_000_000},                                                             maxParty:6, minLevel:200, img:'images/official/boss/akechi.png' },
  { id:'nohime',     name:'노히메',              diffs:{normal:81_000_000},                                                              maxParty:6, minLevel:180, img:'images/official/boss/nohime.png' },
  { id:'vellum',     name:'벨룸',                diffs:{chaos:105_062_500},                                                              maxParty:6, minLevel:180, img:'images/official/boss/vellum.png' },
  { id:'bq',         name:'블러디퀸',            diffs:{chaos:81_000_000},                                                               maxParty:6, minLevel:180, img:'images/official/boss/bq.png' },
  { id:'pierre',     name:'피에르',              diffs:{chaos:81_000_000},                                                               maxParty:6, minLevel:180, img:'images/official/boss/pierre.png' },
  { id:'vanvan',     name:'반반',                diffs:{chaos:81_000_000},                                                               maxParty:6, minLevel:180, img:'images/official/boss/vanvan.png' },
  { id:'magnus',     name:'매그너스',            diffs:{hard:95_062_500},                                                                maxParty:6, minLevel:175, img:'images/official/boss/magnus.png' },
  { id:'cygnus',     name:'시그너스',            diffs:{easy:45_562_500,normal:72_250_000},                                              maxParty:6, minLevel:165, img:'images/official/boss/cygnus.png' },
  { id:'pinkbean',   name:'핑크빈',              diffs:{chaos:64_000_000},                                                               maxParty:6, minLevel:170, img:'images/official/boss/pinkbean.png' },
  { id:'hilla',      name:'힐라',                diffs:{hard:56_250_000},                                                                maxParty:6, minLevel:170, img:'images/official/boss/hilla.png' },
  { id:'zakum',      name:'자쿰',                diffs:{chaos:81_000_000},                                                               maxParty:6, minLevel:90, img:'images/official/boss/zakum.png' },
];

const DIFF_META = {
  none:    { label:'-',       cls:'diff-none'    },
  easy:    { label:'EASY',    cls:'diff-easy'    },
  normal:  { label:'NORMAL',  cls:'diff-normal'  },
  hard:    { label:'HARD',    cls:'diff-hard'    },
  chaos:   { label:'CHAOS',   cls:'diff-chaos'   },
  extreme: { label:'EXTREME', cls:'diff-extreme' },
};

const MAX_CRYSTALS = 180;
const MAX_CHARS    = 20;

// 캐릭터 카드 배경 — images/bg/bg0 ~ bg{CARD_BG_COUNT-1}에 png 또는 webp로 넣으면
// 자동으로 선택 목록에 뜬다(파일이 없는 번호는 골라내는 쪽에서 알아서 숨김).
// 확장자는 webp를 먼저 찾고 없으면 png를 찾는다(지금 파일은 전부 webp라, png를 먼저 찾으면 번호마다 404가 한 번씩 난다).
const CARD_BG_COUNT = 58;
function cardBgCandidates(id) {
  return [`images/bg/bg${id}.webp`, `images/bg/bg${id}.png`];
}

const STORAGE_KEYS = {
  boss:        'gms_boss_v2',
  charHistory: 'gms_char_history',
  font:        'gms_font',
  // 2026-10-30 기본 테마를 화이트로 바꾸며 키를 새로 했다. 예전 키에는 직접 고르지 않은 사람도 dark가 저장돼 있어
  // 모두 한 번 화이트로 시작하게 한다. 예전 키 gms_theme는 settings.js가 지운다
  theme:       'gms_theme_v2',
  genesis:     'lib_genesis_v2',
  destiny:     'lib_destiny_v1',
  astra:       'lib_astra_v1',
  hexaSkill:   'hx_skill',
  hexaMastery: 'hx_mastery',
  hexaBoost:   'hx_boost',
  hexaCommon:  'hx_common',
  dailyTasks:  'daily_tasks_v1',
  mapleCal:       'mc_drops_v1',
  mapleCalEvents: 'mc_events_v1',
};

/* ko: 게임 이름 표기가 한글일 때 쓰는 직업 이름. 나무위키 "메이플스토리/직업" 직업 목록 표기, 2026-11-02 확인.
   하야토·칸나·린·묵현·에릴 라이트·시아 아스텔은 KMS에 없는 직업이라 지수가 알려 준 이름이다.
   아크메이지는 괄호 대신 불·독, 썬·콜로 쓴다 */
const JOB_LIST = [
  {name:'Hero',ko:'히어로'},{name:'Paladin',ko:'팔라딘'},{name:'Dark Knight',ko:'다크나이트'},
  {name:'Arch Mage (Fire, Poison)',ko:'아크메이지 불·독'},{name:'Arch Mage (Ice, Lightning)',ko:'아크메이지 썬·콜'},{name:'Bishop',ko:'비숍'},
  {name:'Bowmaster',ko:'보우마스터'},{name:'Marksman',ko:'신궁'},{name:'Pathfinder',ko:'패스파인더'},
  {name:'Night Lord',ko:'나이트로드'},{name:'Shadower',ko:'섀도어'},{name:'Dual Blade',ko:'듀얼블레이드'},
  {name:'Buccaneer',ko:'바이퍼'},{name:'Corsair',ko:'캡틴'},{name:'Cannoneer',ko:'캐논슈터'},
  {name:'Dawn Warrior',ko:'소울마스터'},{name:'Blaze Wizard',ko:'플레임위자드'},{name:'Wind Archer',ko:'윈드브레이커'},{name:'Night Walker',ko:'나이트워커'},{name:'Thunder Breaker',ko:'스트라이커'},{name:'Mihile',ko:'미하일'},
  {name:'Aran',ko:'아란'},{name:'Evan',ko:'에반'},{name:'Mercedes',ko:'메르세데스'},{name:'Phantom',ko:'팬텀'},{name:'Luminous',ko:'루미너스'},{name:'Shade',ko:'은월'},
  {name:'Battle Mage',ko:'배틀메이지'},{name:'Wild Hunter',ko:'와일드헌터'},{name:'Mechanic',ko:'메카닉'},{name:'Blaster',ko:'블래스터'},
  {name:'Demon Slayer',ko:'데몬슬레이어'},{name:'Demon Avenger',ko:'데몬어벤져'},{name:'Xenon',ko:'제논'},
  {name:'Kaiser',ko:'카이저'},{name:'Kain',ko:'카인'},{name:'Cadena',ko:'카데나'},{name:'Angelic Buster',ko:'엔젤릭버스터'},
  {name:'Hayato',ko:'하야토'},{name:'Kanna',ko:'칸나'},
  {name:'Illium',ko:'일리움'},{name:'Ark',ko:'아크'},{name:'Adele',ko:'아델'},{name:'Khali',ko:'칼리'},
  {name:'Hoyoung',ko:'호영'},{name:'Lara',ko:'라라'},{name:'Ren',ko:'렌'},
  {name:'Zero',ko:'제로'},{name:'Kinesis',ko:'키네시스'},{name:'Lynn',ko:'린'},
  {name:'Erel Light',ko:'에릴 라이트'},{name:'Sia Astelle',ko:'시아 아스텔'},{name:'Lethe',ko:'레테'},
  // 캐릭터는 jobIdx로 저장되므로 새 직업은 항상 맨 뒤에 붙인다
  {name:'Mo Xuan',ko:'묵현'},
];
