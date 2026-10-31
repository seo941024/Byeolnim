/* =============================================
   data_hexa.js — 헥사 매트릭스 데이터
   강화 비용표 7개는 게임 파일에 없는 서버 값이다. 2026-10-31 maplestorywiki HEXA_Matrix의 Leveling Cost 표와
   210칸을 한 칸씩 대조해 모두 같음을 확인했다. 원천·2번째·3번째 스킬, 마스터리, 강화, 공용 야누스·헤카테, 공용 5차 강화
   ============================================= */

const HEXA_SKILL_COSTS = [
  [5,100],[1,30],[1,35],[1,40],[2,45],[2,50],[2,55],[3,60],[3,65],[10,200],
  [3,80],[3,90],[4,100],[4,110],[4,120],[4,130],[4,140],[4,150],[5,160],[15,350],
  [5,170],[5,180],[5,190],[5,200],[5,210],[6,220],[6,230],[6,240],[7,250],[20,500],
];
/* 스킬 노드 1 = 오리진 스킬. 6차 전직 시 Lv1로 무료 지급 → 0→1 비용만 0으로 */
const HEXA_SKILL1_COSTS = [[0,0], ...HEXA_SKILL_COSTS.slice(1)];
/* 3rd 스킬 코어 (누적 117 SE / 3,442 조각) */
const HEXA_SKILL3_COSTS = [
  [7,140],[1,21],[1,26],[1,30],[1,34],[2,38],[2,43],[2,47],[2,51],[8,142],
  [2,62],[2,69],[3,77],[3,83],[3,91],[3,98],[3,105],[3,112],[3,120],[12,252],
  [4,128],[4,136],[4,145],[4,152],[4,161],[4,168],[5,177],[5,184],[5,193],[14,357],
];
/* 3rd 공용 코어 — 프리드의 가호 등 직업별 공용 (누적 137 SE / 4,035 조각) */
const HEXA_COMMON3_COSTS = [
  [4,90],[1,25],[1,30],[1,35],[2,40],[2,45],[2,50],[3,55],[3,60],[9,180],
  [3,73],[3,81],[3,90],[3,98],[4,107],[4,115],[4,124],[4,132],[4,141],[14,315],
  [4,151],[5,160],[5,170],[5,179],[5,189],[5,198],[5,208],[5,217],[6,227],[18,450],
];
const HEXA_MASTERY_COSTS = [
  [3,50],[1,15],[1,18],[1,20],[1,23],[1,25],[1,28],[2,30],[2,33],[5,100],
  [2,40],[2,45],[2,50],[2,55],[2,60],[2,65],[2,70],[2,75],[3,80],[8,175],
  [3,85],[3,90],[3,95],[3,100],[3,105],[3,110],[3,115],[3,120],[4,125],[10,250],
];
const HEXA_BOOST_COSTS = [
  [4,75],[1,23],[1,27],[1,30],[2,34],[2,38],[2,42],[3,45],[3,49],[8,150],
  [3,60],[3,68],[3,75],[3,83],[3,90],[3,98],[3,105],[3,113],[4,120],[12,263],
  [4,128],[4,135],[4,143],[4,150],[4,158],[5,165],[5,173],[5,180],[6,188],[15,375],
];
const HEXA_COMMON_COSTS = [
  [7,125],[2,38],[2,44],[2,50],[3,57],[3,63],[3,69],[5,75],[5,82],[14,300],
  [5,110],[5,124],[6,138],[6,152],[6,165],[6,179],[6,193],[6,207],[7,220],[17,525],
  [7,234],[7,248],[7,262],[7,275],[7,289],[9,303],[9,317],[9,330],[10,344],[20,750],
];

/* 코어 이름과 순서는 GMS v.270 게임 파일 Etc/HexaCore.img/hexaSkill을 따른다.
   - 이름: coreData/<코어 번호>/name 영문 그대로. 마스터리처럼 스킬이 여럿이면 " / "로 띄워 잇는다.
     HEXA 접두사는 게임 이름에 붙어 있을 때만 쓴다. 접두사 없는 파트는 그 코어로 새로 받는 스킬이다.
   - 순서: jobCore/<직업 번호>/{skill,mastery,enforce,common} 슬롯 순서.
   - skill·mastery·boost·common의 영문 이름이 저장값 옮기기와 비용·아이콘 판단에 쓰는 기준 이름이다.
     ko는 화면의 한글 표기 전용이다. KMS v.389 coreData 이름을 쓰되, KMS v.389 이후 개편으로 GMS 코어와
     맞지 않게 된 코어와 KMS v.389에 없는 코어는 기존 한글 이름, 한글 이름이 없으면 영문을 쓴다.
   - 3번째 스킬 코어는 GMS v.270과 KMS v.389 어디에도 없어 기존 한글 이름을 그대로 둔다.
   - 3번째 공용 코어는 v.270에 없어 v.271 패치 노트의 "3rd Common Node" 표 이름을 쓴다.
   - 레테는 GMS에 없는 직업이라 솔 야누스·솔 헤카테만 영문으로 바꾸고 나머지는 한글 그대로 둔다.
   - 에렐 라이트·시아 아스텔은 hexa.js가 에르다 링크 화면으로 보내므로 여기 값은 쓰이지 않는다. */
const HEXA_JOB_DATA = {
  'Mercedes': {
    folder:  'Mercedes',
    skill:   ['Unfading Glory', 'Primeval Spirits', '베리안 서지'],
    mastery: ["HEXA Ishtar's Ring", 'HEXA Leaf Tornado / HEXA Spikes Royale / HEXA Wrath of Enlil', 'HEXA Unicorn Spike / HEXA Gust Dive / HEXA Stunning Strikes', 'HEXA Elemental Knights / HEXA Final Attack'],
    boost:   ['Spirit of Elluel', "Sylvidia's Flight", "Irkalla's Wrath", 'Royal Knights'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['언페이딩 글로리', '엘리멘탈 스피릿', '베리안 서지'],
      mastery: ['이슈타르의 링 VI', '리프 토네이도 VI / 레전드리 스피어 VI / 래쓰 오브 엔릴 VI', '스트라이크 듀얼샷 VI / 유니콘 스파이크 VI / 거스트 다이브 VI', '파이널 어택 VI / 엘리멘탈 나이트 VI'],
      boost:   ['엘리멘탈 고스트', '실피디아', '이르칼라의 숨결', '로얄 나이츠'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Adele': {
    folder:  'Adele',
    skill:   ['Maestro', 'Einheit', '에테르 뤼페'],
    mastery: ['HEXA Cleave / HEXA Magic Dispatch / HEXA Aetherial Arms', 'HEXA Hunting Decree / HEXA Plummet', 'HEXA Impale / HEXA Resonance Rush / HEXA Noble Summons / HEXA Aether Bloom', 'HEXA Aether Forge / HEXA Reign of Destruction / HEXA Shardbreaker'],
    boost:   ['Ruin', 'Infinity Blade', 'Legacy Restoration', 'Storm'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Conversion Overdrive'],
    ko: {
      skill:   ['마에스트로', '아인하이트', '에테르 뤼페'],
      mastery: ['디바이드 VI / 샤드 VI / 원더 VI', '오더 VI / 트레드 VI', '임페일 VI / 레조넌스 VI / 게더링 VI / 블로섬 VI', '크리에이션 VI / 테리토리 VI / 마커 VI'],
      boost:   ['루인', '인피니트', '리스토어', '스톰'],
      common:  ['솔 야누스', '솔 헤카테', '매직 서킷 풀 드라이브 VI'],
    },
  },
  'Hero': {
    folder:  'Hero',
    skill:   ['Spirit Calibur', 'Ultrasonic Slash', '레이지 익스플로젼'],
    mastery: ['HEXA Raging Blow', 'HEXA Rising Rage', 'HEXA Beam Blade / Rending Edge', 'HEXA Puncture / HEXA Final Attack / HEXA Cry Valhalla'],
    boost:   ['Burning Soul Blade', 'Instinctual Combo', 'Worldreaver', 'Sword Illusion'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Blitz Shield'],
    ko: {
      skill:   ['스피릿 칼리버', '사일런트 클리브', '레이지 익스플로젼'],
      mastery: ['레이징 블로우 VI', '레이지 업라이징 VI', '오라 블레이드 VI / 퓨리어스 엣지', '발할라 VI / 인사이징 VI / 파이널 어택 VI'],
      boost:   ['소드 오브 버닝 소울', '콤보 인스팅트', '콤보 데스폴트', '소드 일루전'],
      common:  ['솔 야누스', '솔 헤카테', '블리츠 실드 VI / 블리츠 버스트'],
    },
  },
  'Paladin': {
    folder:  'Paladin',
    skill:   ['Sacred Bastion', 'Dominus Oblivion', '디바인 컨버전스'],
    mastery: ['HEXA Blast / HEXA Divine Judgment', 'HEXA Divine Charge / HEXA Divine Mark / Falling Justice', "HEXA Heaven's Hammer", 'HEXA Final Attack / Rising Justice'],
    boost:   ['Divine Echo', 'Hammers of the Righteous', 'Grand Guardian', 'Mighty Mjolnir'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Blitz Shield'],
    ko: {
      skill:   ['세이크리드 바스티온', '도미누스 오브리온', '디바인 컨버전스'],
      mastery: ['블래스트 VI / 디바인 저지먼트 VI', '디바인 차지 VI / 디바인 스티그마 VI / 폴링 저스티스', '생츄어리 VI', '파이널 어택 VI / 라이징 저스티스'],
      boost:   ['홀리 유니티', '블래스드 해머', '그랜드 크로스', '마이티 묠니르'],
      common:  ['솔 야누스', '솔 헤카테', '블리츠 실드 VI / 블리츠 버스트'],
    },
  },
  'Dark Knight': {
    folder:  'DarkNight',
    skill:   ['Dead Space', 'Dark Halidom', '다크니스 오브 그레이스'],
    mastery: ["HEXA Gungnir's Descent", 'HEXA Dark Impale / HEXA Nightshade Explosion', 'HEXA Final Attack / HEXA Revenge of the Evil Eye', 'HEXA Evil Eye Shock'],
    boost:   ['Spear of Darkness', 'Radiant Evil', 'Calamitous Cyclone', 'Darkness Aura'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Blitz Shield'],
    ko: {
      skill:   ['데드 스페이스', '다크 헬리덤', '다크니스 오브 그레이스'],
      mastery: ['궁니르 디센트 VI', '다크 임페일 VI / 다크 신서시스 VI', '비홀더스 리벤지 VI / 파이널 어택 VI', '비홀더 쇼크 VI'],
      boost:   ['다크 스피어', '비홀더 임팩트', '피어스 사이클론', '다크니스 오라'],
      common:  ['솔 야누스', '솔 헤카테', '블리츠 실드 VI / 블리츠 버스트'],
    },
  },
  'Arch Mage (Fire, Poison)': {
    folder:  'Arch_MageFP',
    skill:   ['Infernal Venom', 'Immortal Flame', '인페르날 웨이브'],
    mastery: ['HEXA Flame Sweep', 'HEXA Flame Haze / HEXA Mist Eruption', 'HEXA Ignite / HEXA Ifrit / HEXA Inferno Aura', 'HEXA Creeping Toxin / HEXA Meteor Shower / HEXA Megiddo Flame'],
    boost:   ['DoT Punisher', 'Poison Nova', 'Elemental Fury', 'Poison Chain'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Arcane Overdrive'],
    ko: {
      skill:   ['인페르날 베놈', '토렌셜 플레임', '인페르날 웨이브'],
      mastery: ['플레임 스윕 VI', '플레임 헤이즈 VI / 미스트 이럽션 VI', '이그나이트 VI / 이프리트 VI / 파이어 오라 VI', '포이즌 리젼 VI / 메테오 VI / 메기도 플레임 VI'],
      boost:   ['도트 퍼니셔', '포이즌 노바', '퓨리 오브 이프리트', '포이즌 체인'],
      common:  ['솔 야누스', '솔 헤카테', '아르카나 오버라이드 VI'],
    },
  },
  'Arch Mage (Ice, Lightning)': {
    folder:  'Arch_MageIL',
    skill:   ['Frozen Lightning', 'Parabolic Bolt', '서브제로 퍼미네이션'],
    mastery: ['HEXA Chain Lightning', 'HEXA Frozen Orb / HEXA Blizzard', 'HEXA Lightning Orb / Cryo Shock', 'HEXA Thunder Sphere / HEXA Elquines'],
    boost:   ['Frost Ark', 'Bolt Barrage', 'Spirit of Snow', 'Jupiter Thunder'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Arcane Overdrive'],
    ko: {
      skill:   ['프로즌 라이트닝', '파라볼릭 볼트', '서브제로 퍼미네이션'],
      mastery: ['체인 라이트닝 VI', '프로즌 오브 VI / 블리자드 VI', '라이트닝 스피어 VI / 크라이오 쇼크', '썬더 스피어 VI / 엘퀴네스 VI'],
      boost:   ['프로스트 아크', '썬더 브레이크', '스피릿 오브 스노우', '주피터 썬더'],
      common:  ['솔 야누스', '솔 헤카테', '아르카나 오버라이드 VI'],
    },
  },
  'Bishop': {
    folder:  'Bishop',
    skill:   ['Holy Advent', 'Commandment of Heaven', '엔젤스 플레지'],
    mastery: ['HEXA Angel Ray', 'HEXA Big Bang / HEXA Triumph Feather', 'HEXA Angelic Wrath / HEXA Fountain of Vengeance / HEXA Bahamut', "HEXA Genesis / HEXA Heaven's Door"],
    boost:   ['Benediction', 'Angel of Balance', 'Peacemaker', 'Divine Punishment'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Arcane Overdrive'],
    ko: {
      skill:   ['홀리 어드밴트', '커맨드 오브 헤븐', '엔젤스 플레지'],
      mastery: ['엔젤레이 VI', '빅뱅 VI / 트라이엄프 페더 VI', '엔젤릭 터치 VI / 파운틴 포 엔젤 VI / 바하뮤트 VI', '제네시스 VI / 헤븐즈 도어 VI'],
      boost:   ['프레이', '엔젤 오브 리브라', '피스메이커', '디바인 퍼니시먼트'],
      common:  ['솔 야누스', '솔 헤카테', '아르카나 오버라이드 VI'],
    },
  },
  'Bowmaster': {
    folder:  'BowMaster',
    skill:   ['Ascendant Shadow', 'Flashpoint', '아이 오브 아퀼라'],
    mastery: ['HEXA Hurricane', 'HEXA Arrow Blaster / HEXA Arrow Stream', 'HEXA Quiver Cartridge / HEXA Phoenix / Extra Quiver Cartridge', 'HEXA Speed Mirage / HEXA Gritty Gust'],
    boost:   ['Storm of Arrows', 'Inhuman Speed', 'Quiver Barrage', 'Silhouette Mirage'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Fury of the Wild'],
    ko: {
      skill:   ['어센던트 셰이드', '포인트 제로', '아이 오브 아퀼라'],
      mastery: ['폭풍의 시 VI', '애로우 플래터 VI / 언카운터블 애로우 VI', '퀴버 카트리지 VI / 피닉스 VI / 엑스트라 퀴버 카트리지', '플레시 미라주 VI / 윈드 오브 프레이 VI'],
      boost:   ['애로우 레인', '잔영의 시', '퀴버 풀버스트', '실루엣 미라주'],
      common:  ['솔 야누스', '솔 헤카테', '이볼브 VI'],
    },
  },
  'Marksman': {
    folder:  'Marksman',
    skill:   ['Final Aim', 'Fatal Trigger', '리썰 퍼니셔'],
    mastery: ['HEXA Snipe', 'HEXA Piercing Arrow', 'HEXA Frostprey / HEXA Bolt Burst', 'HEXA Final Attack / HEXA High Speed Shot'],
    boost:   ['Perfect Shot', 'Split Shot', 'Surge Bolt', 'Repeating Crossbow Cartridge'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Fury of the Wild'],
    ko: {
      skill:   ['파이널 에임', '페이탈 트리거', '리썰 퍼니셔'],
      mastery: ['스나이핑 VI', '피어싱 VI', '프리져 VI / 볼트 스위프트 VI', '파이널 어택 VI / 롱 레인지 트루샷 VI'],
      boost:   ['트루 스나이핑', '스플릿 애로우', '차지드 애로우', '리피팅 크로스보우 카트리지'],
      common:  ['솔 야누스', '솔 헤카테', '이볼브 VI'],
    },
  },
  'Pathfinder': {
    folder:  'PathFinder',
    skill:   ['Forsaken Relic', 'Piercing Relic', '마테리얼 버스트'],
    mastery: ['HEXA Cardinal Burst / HEXA Bountiful Burst', 'HEXA Cardinal Deluge / HEXA Bountiful Deluge', 'HEXA Cardinal Torrent / HEXA Glyph of Impalement / HEXA Ancient Astra', 'HEXA Shadow Raven / HEXA Combo Assault / Manifest Curse'],
    boost:   ['Nova Blast', 'Raven Tempest / Fury of the Wild Tempest', 'Obsidian Barrier', 'Relic Unbound'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Fury of the Wild'],
    ko: {
      skill:   ['포세이큰 렐릭', '렐릭 페네트레이션', '마테리얼 버스트'],
      mastery: ['카디널 블래스트 VI / 에디셔널 블래스트 VI', '카디널 디스차지 VI / 에디셔널 디스차지 VI', '엣지 오브 레조넌스 VI / 에인션트 임팩트 / 카디널 트랜지션 VI / 에인션트 아스트라 VI', '콤보 어썰트 VI / 레이븐 VI / 렐릭 마테리얼라이즈'],
      boost:   ['얼티밋 블래스트', '레이븐 템페스트 / 이볼브 템페스트', '옵시디언 배리어', '렐릭 언바운드'],
      common:  ['솔 야누스', '솔 헤카테', '이볼브 VI'],
    },
  },
  'Night Lord': {
    folder:  'NightLord',
    skill:   ['Life and Death', 'Deep Strike', '쉐도우 리츄얼'],
    mastery: ['HEXA Quad Star', "HEXA Assassin's Mark", 'HEXA Dark Flare / HEXA Showdown / Darkness Shuriken', 'HEXA Sudden Raid / HEXA Death Star'],
    boost:   ['Throwing Star Barrage', 'Shurrikane', "Dark Lord's Omen", 'Throw Blasting'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Shadow Walker'],
    ko: {
      skill:   ['생사여탈', '크루셜 어썰트', '쉐도우 리츄얼'],
      mastery: ['쿼드러플 스로우 VI', '마크 오브 어쌔신 VI', '쇼다운 챌린지 VI / 다크 플레어 VI / 다크니스 슈리켄', '포 시즌 VI / 써든레이드 VI'],
      boost:   ['스프레드 스로우', '풍마수리검', '다크로드의 비전서', '스로우 블래스팅'],
      common:  ['솔 야누스', '솔 헤카테', '얼티밋 다크 사이트 VI'],
    },
  },
  'Shadower': {
    folder:  'Shadower',
    skill:   ['Halve Cut', 'Covetous Darkness', '무아지경'],
    mastery: ['HEXA Assassinate', 'HEXA Meso Explosion', 'HEXA Dark Flare / HEXA Cruel Stab', 'HEXA Sudden Raid / HEXA Shadow Veil / Covert Edge'],
    boost:   ['Shadow Assault', 'Trickblade', 'Sonic Blow', 'Slash Shadow Formation'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Shadow Walker'],
    ko: {
      skill:   ['일도양단', '어센틱 다크니스', '무아지경'],
      mastery: ['암살 VI', '메소 익스플로젼 VI', '다크 플레어 VI / 크루얼 스탭 VI', '써든레이드 VI / 베일 오브 섀도우 VI / 커버트 쉐도우'],
      boost:   ['쉐도우 어썰트', '절개', '소닉 블로우', '멸귀참영진'],
      common:  ['솔 야누스', '솔 헤카테', '얼티밋 다크 사이트 VI'],
    },
  },
  'Dual Blade': {
    folder:  'DualBlade',
    skill:   ['Karma Blade', "Yama's Decree", '암영난참'],
    mastery: ['HEXA Phantom Blow', "HEXA Asura's Anger", 'HEXA Blade Clone / Mortality', 'HEXA Blade Fury / HEXA Sudden Raid'],
    boost:   ['Blade Storm', 'Blades of Destiny', 'Blade Tornado', 'Haunted Edge'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Shadow Walker'],
    ko: {
      skill:   ['카르마 블레이드', '야마즈 디크리', '암영난참'],
      mastery: ['팬텀 블로우 VI', '아수라 VI', '히든 블레이드 VI / 생자필멸', '블레이드 퓨리 VI / 써든레이드 VI'],
      boost:   ['블레이드 스톰', '카르마 퓨리', '블레이드 토네이도', '헌티드 엣지'],
      common:  ['솔 야누스', '솔 헤카테', '얼티밋 다크 사이트 VI'],
    },
  },
  'Buccaneer': {
    folder:  'Viper',
    skill:   ['Unleash Neptunus', 'Haymaker', '넵투누스 어드밴트'],
    mastery: ['HEXA Octopunch', "HEXA Sea Serpent / HEXA Sea Serpent's Rage / HEXA Sea Serpent Burst / Nautilus Strike", 'HEXA Serpent Scale', 'HEXA Hook Bomber'],
    boost:   ['Lightning Form', 'Lord of the Deep', 'Serpent Vortex', 'Howling Fist'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Pirate's Banner"],
    ko: {
      skill:   ['리버레이트 넵투누스', '헤이메이커', '넵투누스 어드밴트'],
      mastery: ['피스트 인레이지 VI', '씨 서펜트 VI / 씨 서펜트 인레이지 VI / 씨 서펜트 버스트 VI / 전함 노틸러스 VI', '서펜트 스톤 VI', '훅 봄버 VI'],
      boost:   ['라이트닝 폼', '서펜트 스크류', '퓨리어스 차지', '하울링 피스트'],
      common:  ['솔 야누스', '솔 헤카테', '파이렛 플래그 VI'],
    },
  },
  'Corsair': {
    folder:  'Captain',
    skill:   ['The Dreadnought', 'Firecracker Fusillade', '에어리얼 봄바드먼트'],
    mastery: ['HEXA Rapid Fire', 'HEXA Broadside / HEXA Tempest Bombardment', 'HEXA Brain Scrambler / HEXA Eight-Legs Easton', 'HEXA Siege Bomber / HEXA Scurvy Summons / HEXA Nautilus Strike / HEXA Ugly Bomb'],
    boost:   ['Bullet Barrage', 'Target Lock', 'Nautilus Assault', 'Death Trigger'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Pirate's Banner"],
    ko: {
      skill:   ['드레드노트', '파이어크래커', '에어리얼 봄바드먼트'],
      mastery: ['래피드 파이어 VI', '배틀쉽 봄버 VI / 봄바드 템페스트 VI', '헤드 샷 VI / 퍼실레이드 VI', '서먼 크루 VI / 시즈 봄버 VI / 스트레인지 봄 VI / 전함 노틸러스 VI'],
      boost:   ['불릿 파티', '데드아이', '노틸러스 어썰트', '데스 트리거'],
      common:  ['솔 야누스', '솔 헤카테', '파이렛 플래그 VI'],
    },
  },
  'Cannoneer': {
    folder:  'CannonShooter',
    skill:   ['Super Cannon Explosion', 'Barrel of Monkeys', '메가 캐논 봄바드'],
    mastery: ['HEXA Cannon Barrage', 'HEXA Cannon Bazooka / HEXA Monkey Mortar / HEXA Anchors Aweigh / HEXA Nautilus Strike', 'HEXA Rolling Rainbow', 'HEXA Monkey Fury / HEXA Support Monkey'],
    boost:   ['Cannon of Mass Destruction', 'The Nuclear Option Boost', 'Monkey Business', 'Poolmaker'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Pirate's Banner"],
    ko: {
      skill:   ['슈퍼 캐논 익스플로젼', '배럴 오브 몽키스', '메가 캐논 봄바드'],
      mastery: ['캐논 버스터 VI', '캐논 바주카 VI / 미니 캐논볼 VI / 마그네틱 앵커 VI / 전함 노틸러스 VI', '롤링 캐논 레인보우 VI', '몽키 퓨리어스 VI / 서포트 몽키 VI'],
      boost:   ['빅 휴즈 기간틱 캐논볼', 'ICBM', '스페셜 몽키 에스코트', '풀 메이커'],
      common:  ['솔 야누스', '솔 헤카테', '파이렛 플래그 VI'],
    },
  },
  'Dawn Warrior': {
    folder:  'SoulMaster',
    skill:   ['Astral Blitz', 'Totality', '셀레스티얼 클리브'],
    mastery: ['HEXA Solar Slash / HEXA Luna Divide', 'HEXA Cosmic Shower', 'HEXA Cosmic Burst', 'HEXA Equinox Slash / Equinox Power II'],
    boost:   ['Cosmos', 'Rift of Damnation', 'Soul Eclipse', 'Flare Slash'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['아스트랄 블리츠', '토탈리티', '셀레스티얼 클리브'],
      mastery: ['솔라 슬래시 VI / 루나 디바이드 VI', '코스믹 샤워 VI', '코스믹 버스트 VI', '솔루나 슬래시 VI / 솔루나 파워 II'],
      boost:   ['코스모스', '엘리시온', '소울 이클립스', '플레어 슬래시'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Blaze Wizard': {
    folder:  'FlameWizard',
    skill:   ['Eternity', 'Flame Concerto', '이그니스 레퀴엠'],
    mastery: ['HEXA Orbital Flame', 'HEXA Blazing Extinction', 'HEXA Orbital Explosion / HEXA Phoenix Drive', 'HEXA Towering Inferno'],
    boost:   ['Orbital Inferno', 'Savage Flame', 'Inferno Sphere', 'Salamander Mischief'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['이터니티', '플레임 콘체르토', '이그니스 레퀴엠'],
      mastery: ['오비탈 플레임 VI', '블레이징 익스팅션 VI', '오비탈 익스플로젼 VI / 피닉스 드라이브 VI', '인페르노라이즈 VI'],
      boost:   ['블레이징 오비탈 플레임', '플레임 디스차지', '인피니티 플레임 서클', '샐리맨더 미스칩'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Wind Archer': {
    folder:  'WindBreaker',
    skill:   ['Mistral Spring', 'Elemental Tempest', '실프스 브레스'],
    mastery: ['HEXA Song of Heaven', 'HEXA Trifling Wind', 'HEXA Fairy Spiral / HEXA Storm Bringer / HEXA Monsoon', 'HEXA Storm Whim / Anemoi'],
    boost:   ['Howling Gale', 'Merciless Winds', 'Gale Barrier', 'Vortex Sphere'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['미스트랄 스프링', '엘리멘트 템페스트', '실프스 브레스'],
      mastery: ['천공의 노래 VI', '트라이플링 윔 VI', '페어리 턴 VI / 스톰 브링어 VI / 몬순 VI', '스톰 윔 VI / 아네모이'],
      boost:   ['하울링 게일', '아이들 윔', '윈드 월', '볼텍스 스피어'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Night Walker': {
    folder:  'NightWalker',
    skill:   ['Silence', 'Stygian Command', '싱귤래러티 스로우'],
    mastery: ['HEXA Quintuple Star', 'HEXA Shadow Bat / HEXA Ravenous Bat', 'HEXA Dark Omen', 'HEXA Dominion / Abyssal Darkness'],
    boost:   ['Shadow Spear', 'Greater Dark Servant / Shadow Slide', 'Shadow Bite', 'Rapid Throw'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['사일런스', '스티지언 커맨드', '싱귤래러티 스로우'],
      mastery: ['퀸터플 스로우 VI', '쉐도우 배트 VI / 래버너스 배트 VI', '다크니스 오멘 VI', '도미니언 VI / 어비셜 다크니스'],
      boost:   ['쉐도우 스피어', '쉐도우 서번트 익스텐드', '쉐도우 바이트', '래피드 스로우'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Thunder Breaker': {
    folder:  'Striker',
    skill:   ['Thunder Wall Sea Wave', 'Annihilating Rush', '해황폭쇄'],
    mastery: ['HEXA Annihilate / Lightning Strike', 'HEXA Thunderbolt', 'HEXA Typhoon / HEXA Deep Rising', 'HEXA Sea Wave / Deep Reinforcement'],
    boost:   ['Lightning Cascade', 'Shark Torpedo', 'Lightning God Spear Strike', 'Lightning Spear Multistrike'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['뇌명벽해파', '질도섬멸', '해황폭쇄'],
      mastery: ['섬멸 VI / 낙뢰', '벽력 VI', '태풍 VI / 해신강림 VI', '해파 VI / 해신강체'],
      boost:   ['신뇌합일', '교아탄', '뇌신창격', '창뇌연격'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Mihile': {
    folder:  'Mikhail',
    skill:   ['Durendal', 'Knights Immortal', '레디언스 오브 발러'],
    mastery: ['HEXA Radiant Cross', 'HEXA Royal Guard', 'HEXA Install Shield / HEXA Charging Light', 'HEXA Offensive Defense / HEXA Final Attack / HEXA Soul Majesty'],
    boost:   ['Shield of Light', 'Sword of Light', 'Radiant Soul', 'Light of Courage'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Phalanx Charge'],
    ko: {
      skill:   ['듀란달', '나이트 임모탈스', '레디언스 오브 발러'],
      mastery: ['샤이닝 크로스 VI', '로얄 가드 VI', '데들리 차지 VI / 인스톨 실드 VI', '오펜시브 디펜스 VI / 파이널 어택 VI / 소울 마제스티 VI'],
      boost:   ['로 아이아스', '클라우 솔라스', '소드 오브 소울 라이트', '라이트 오브 커리지'],
      common:  ['솔 야누스', '솔 헤카테', '시그너스 팔랑크스 VI'],
    },
  },
  'Aran': {
    folder:  'Aran',
    skill:   ['Endgame', 'Hailstorm Howl', '마하 언리시드'],
    mastery: ['HEXA Beyond Blade', "HEXA Finisher - Hunter's Prey", 'HEXA Hyper Finisher - Last Stand', 'HEXA Permafrost / HEXA Adrenaline Overload / HEXA Final Attack'],
    boost:   ['Finisher - Adrenaline Surge', "Maha's Carnage", 'Final Beyond Blade - White Tiger', 'Blizzard Tempest'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['엔드 게임', '프로스트 블러스터', '마하 언리시드'],
      mastery: ['비욘더 VI', '부스트 엔드-헌터즈 타겟팅 VI', '하이퍼 부스트 엔드-라스트 스탠드 VI', '파이널 어택 VI / 아드레날린 맥시멈 VI / 프로즌 그라운드 VI'],
      boost:   ['부스트 엔드-아드레날린 서지', '브랜디쉬 마하', '파이널 비욘더-백호', '블리자드 템페스트'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Evan': {
    folder:  'Evan',
    skill:   ['Zodiac Burst', 'United Horizons', '드래곤 소어'],
    mastery: ['HEXA Mana Burst', 'HEXA Dragon Flash / HEXA Thunder Circle / HEXA Thunder Flash / HEXA Wind Flash', 'HEXA Dragon Dive / HEXA Thunder Dive / HEXA Earth Circle / HEXA Earth Dive', 'HEXA Wind Circle / HEXA Dragon Spark / HEXA Magic Debris / HEXA Dragon Breath / HEXA Earth Breath / HEXA Wind Breath'],
    boost:   ['Elemental Barrage', 'Dragon Slam', 'Elemental Radiance', 'Spiral of Mana'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['조디악 버스트', '유니온 드라이브', '드래곤 소어'],
      mastery: ['서클 오브 마나 VI', '드래곤 스위프트 VI / 서클 오브 썬더 VI / 스위프트 오브 썬더 VI / 스위프트 오브 윈드 VI', '서클 오브 어스 VI / 드래곤 다이브 VI / 다이브 오브 어스 VI / 다이브 오브 썬더 VI', '서클 오브 윈드 VI / 드래곤 브레스 VI / 브레스 오브 어스 VI / 브레스 오브 윈드 VI / 마법 잔해 VI / 드래곤 스파킹 VI'],
      boost:   ['엘리멘탈 블래스트', '드래곤 브레이크', '조디악 레이', '스파이럴 오브 마나'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Phantom': {
    folder:  'Phantom',
    skill:   ['Defying Fate', 'Moonlit Serenade', '플레슈 르투르'],
    mastery: ['HEXA Tempest', 'HEXA Mille Aiguilles', 'HEXA Carte Noir', 'HEXA Rose Carte Finale / La Mort Carte'],
    boost:   ['Luck of the Draw', 'Ace in the Hole', "Phantom's Mark", 'Rift Break'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['디파잉 페이트', '문리트 세레나데', '플레슈 르투르'],
      mastery: ['템페스트 오브 카드 VI', '얼티밋 드라이브 VI', '느와르 카르트 VI', '로즈 카르트 피날레 VI / 라모르 카르트'],
      boost:   ['조커', '블랙잭', '마크 오브 팬텀', '리프트 브레이크'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Luminous': {
    folder:  'Luminous',
    skill:   ['Harmonic Paradox', 'Lustrous Orb', '앱솔루트 스페이스'],
    mastery: ['HEXA Ender', 'HEXA Reflection / Endless Darkness', 'HEXA Apocalypse / Eternal Light', 'HEXA Twilight Nova'],
    boost:   ['Gate of Light', 'Aether Conduit', 'Baptism of Light and Darkness', 'Liberation Orb'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['하모닉 패러독스', '러스트러스 오브', '앱솔루트 스페이스'],
      mastery: ['앱솔루트 킬 VI', '라이트 리플렉션 VI / 엔드리스 다크니스', '아포칼립스 VI / 이터널 라이트니스', '트와일라잇 노바 VI'],
      boost:   ['진리의 문', '퍼니싱 리소네이터', '빛과 어둠의 세례', '리버레이션 오브'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Shade': {
    folder:  'Eunwol',
    skill:   ['Advent of the Fox', 'Promise Unbroken', '연우격풍'],
    mastery: ['HEXA Spirit Claw', 'HEXA Fox Spirits', 'HEXA Bomb Punch / HEXA Death Mark / Dusk Blow', 'HEXA Spirit Frenzy'],
    boost:   ['Fox God Flash', 'Spiritgate', 'True Spirit Claw', 'Smashing Multipunch'],
    common:  ['Sol Janus', 'Sol Hecate', "HEXA Freud's Wisdom"],
    ko: {
      skill:   ['호신강림', '영월', '연우격풍'],
      mastery: ['귀참 VI', '여우령 VI', '폭류권 VI / 사혼 각인 VI / 천귀야참', '소혼 장막 VI'],
      boost:   ['환혼요호진', '귀문진', '진 귀참', '파쇄 연권'],
      common:  ['솔 야누스', '솔 헤카테', '프리드의 가호 VI'],
    },
  },
  'Battle Mage': {
    folder:  'Battle',
    skill:   ['Crimson Pact', 'Duskbound Aura', '모티스 엣지'],
    mastery: ['HEXA Condemnation', 'HEXA Finishing Blow / HEXA Sweeping Staff', 'HEXA Dark Shock', 'HEXA Dark Genesis'],
    boost:   ['Aura Scythe', 'Altar of Annihilation', 'Grim Harvest', 'Abyssal Lightning'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Resistance Infantry'],
    ko: {
      skill:   ['크림슨 팩텀', '글루미 오라', '모티스 엣지'],
      mastery: ['데스 VI', '피니쉬 블로우 VI / 배틀킹 바 VI', '다크 라이트닝 VI', '다크 제네시스 VI'],
      boost:   ['유니온 오라', '블랙 매직 알터', '그림 리퍼', '어비셜 라이트닝'],
      common:  ['솔 야누스', '솔 헤카테', '레지스탕스 라인 인팬트리 VI'],
    },
  },
  'Wild Hunter': {
    folder:  'WildHunter',
    skill:   ['Synchronous Hunt', 'Gear Storm', '레조넌스 : 와일드 피어스'],
    mastery: ['HEXA Wild Arrow Blast: Apex', 'HEXA Assist', 'HEXA Command', 'HEXA Another Bite / HEXA Final Attack / HEXA Trap Seed'],
    boost:   ["Command: Predator's Eye", 'Overbite', 'Primal Bloom', 'Wild Arrow Blast: Overdrive'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Resistance Infantry'],
    ko: {
      skill:   ['링크드 임팩트', '기어 스톰', '레조넌스 : 와일드 피어스'],
      mastery: ['와일드 발칸 : 에이펙스 VI', '어시스트 : 렌드 클로우 VI / 어시스트 : 팽 스냅 VI / 어시스트 : 스컬 배쉬 VI', '커맨드 : 알파 서지 VI / 커맨드 : 타이탄 파운스 VI', '파이널 어택 VI / 트랩 시더 VI / 어나더 바이트 VI'],
      boost:   ['커맨드 : 프레데터스 아이', '오버바이트', '프라이멀 블룸', '와일드 발칸 : 오버 드라이브'],
      common:  ['솔 야누스', '솔 헤카테', '레지스탕스 라인 인팬트리 VI'],
    },
  },
  'Mechanic': {
    folder:  'Mechanic',
    skill:   ['Ground Zero', 'Mechanized Extinction', '버스터 스테이션'],
    mastery: ['HEXA Heavy Salvo Plus / HEXA AP Salvo Plus', 'HEXA Homing Beacon', 'HEXA Distortion Bomb', "HEXA Robo Launcher RM7 / HEXA Rock 'n Shock / HEXA Bots 'n Tots / Robo Conversion: CB-P1"],
    boost:   ['Doomsday Device', 'Mobile Missile Battery', 'Full Metal Barrage', 'Mecha Carrier'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Resistance Infantry'],
    ko: {
      skill:   ['그라운드 제로', '메탈아머 : 익스터미네이션', '버스터 스테이션'],
      mastery: ['매시브 파이어 : SPLASH-F VI / IRON-B VI', '호밍 미사일 VI', '디스토션 필드 VI', '로봇 런처 : RM7 VI / 마그네틱 필드 VI / 로봇 팩토리 : RM1 VI / 로봇 트랜지션 : CB-P1'],
      boost:   ['멀티플 옵션 : M-FL', '마이크로 미사일 컨테이너', '메탈아머 전탄발사', '메카 캐리어'],
      common:  ['솔 야누스', '솔 헤카테', '레지스탕스 라인 인팬트리 VI'],
    },
  },
  'Blaster': {
    folder:  'Blaster',
    skill:   ['Final Destroyer', 'Vanguard Strike', '오버히트 펀치'],
    mastery: ['HEXA Magnum Punch / HEXA Double Blast', 'HEXA Bunker Buster Explosion', 'HEXA Revolving Cannon Mastery / HEXA Hammer Smash / HEXA Shotgun Punch', 'HEXA Revolving Cannon / HEXA Ballistic Hurricane'],
    boost:   ['Rocket Punch', 'Gatling Punch', 'Bullet Blast', 'Afterimage Shock'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Resistance Infantry'],
    ko: {
      skill:   ['파이널 디스트로이어', '뱅가드 임팩트', '오버히트 펀치'],
      mastery: ['매그넘 펀치 VI / 더블 팡 VI', '릴리즈 파일 벙커 VI', '쇼크 웨이브 펀치 VI / 해머 스매시 VI / 리볼빙 캐논 마스터리 VI', '리볼빙 캐논 VI / 허리케인 믹서 VI'],
      boost:   ['벙커 버스터', '발칸 펀치', '버닝 브레이커', '애프터이미지 쇼크'],
      common:  ['솔 야누스', '솔 헤카테', '레지스탕스 라인 인팬트리 VI'],
    },
  },
  'Demon Slayer': {
    folder:  'DemonSlayer',
    skill:   ['Nightmare', 'Amethystine Incursion', '래쓰 오브 세이튼'],
    mastery: ['HEXA Demon Impact', 'HEXA Demon Lash / HEXA Infernal Concussion', 'HEXA Demon Cry / HEXA Dark Metamorphosis', 'HEXA Cerberus Chomp / Demonic Plume'],
    boost:   ['Demon Awakening', 'Spirit of Rage', 'Orthrus', 'Demon Bane'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Defender of the Demon'],
    ko: {
      skill:   ['나이트메어', '아메시스틴 인트루젼', '래쓰 오브 세이튼'],
      mastery: ['데몬 임팩트 VI', '데몬 슬래시 VI / 데몬 익스플로젼 VI', '메타모포시스 VI / 데빌 크라이 VI', '서버러스 VI / 데모닉 디센트'],
      boost:   ['데몬 어웨이크닝', '요르문간드', '오르트로스', '데몬 베인'],
      common:  ['솔 야누스', '솔 헤카테', '콜 마스테마 VI'],
    },
  },
  'Demon Avenger': {
    folder:  'DemonAvenger',
    skill:   ['Requiem', 'Rageborne Devil', '래비드 카니지'],
    mastery: ['HEXA Nether Shield', 'HEXA Exceed: Execution', 'HEXA Exceed: Lunar Slash / Maximal Exceed', 'HEXA Thousand Swords / HEXA Infernal Exceed'],
    boost:   ['Demonic Frenzy', 'Demonic Blast', 'Dimensional Sword', 'Revenant'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Defender of the Demon'],
    ko: {
      skill:   ['레퀴엠', '레이지본 데어데빌', '래비드 카니지'],
      mastery: ['실드 체이싱 VI', '익시드 : 엑스큐션 VI', '익시드 : 문라이트 슬래시 VI / 오버맥시마이징 익시드', '사우전드 소드 VI / 인핸스드 익시드 VI'],
      boost:   ['데몬 프렌지', '블러드 피스트', '디멘션 소드', '레버넌트'],
      common:  ['솔 야누스', '솔 헤카테', '콜 마스테마 VI'],
    },
  },
  'Xenon': {
    folder:  'Xenon',
    skill:   ['Artificial Evolution', 'Neoteric Snap', '레일 건 캐노네이드'],
    mastery: ['HEXA Mecha Purge', 'HEXA Triangulation / HEXA Hypogram Field', 'HEXA Salvo System / HEXA Orbital Cataclysm', 'HEXA Beam Dance'],
    boost:   ['Omega Blaster', 'Core Overload', 'Hypogram Field: Fusion', 'Photon Ray'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Resistance Infantry'],
    ko: {
      skill:   ['아티피셜 에볼루션', '네오테릭 트라이스', '레일 건 캐노네이드'],
      mastery: ['퍼지롭 매스커레이드 VI', '트라이앵글 포메이션 VI / 홀로그램 그래피티 VI', '로켓 시스템 VI / 멜트다운 익스플로젼 VI', '블레이드 댄싱 VI'],
      boost:   ['메가 스매셔', '오버로드 모드', '홀로그램 그래피티 : 융합', '포톤 레이'],
      common:  ['솔 야누스', '솔 헤카테', '레지스탕스 라인 인팬트리 VI'],
    },
  },
  'Kaiser': {
    folder:  'Kasier',
    skill:   ['Nova Triumphant', 'Pyroclastic Instinct', '드라코닉 익스팅션'],
    mastery: ['HEXA Gigas Wave', 'HEXA Blade Burst / HEXA Tempest Blades', 'HEXA Inferno Breath', 'HEXA Wing Beat / HEXA Stone Dragon'],
    boost:   ['Nova Guardians', 'Bladefall', 'Draco Surge', 'Dragonflare'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Might of the Nova'],
    ko: {
      skill:   ['마이트 오브 노바', '파이로 인스팅트', '드라코닉 익스팅션'],
      mastery: ['기가 슬래셔 VI', '소드 스트라이크 VI / 윌 오브 소드 VI', '인퍼널 브레스 VI', '페트리파이드 VI / 윙비트 VI'],
      boost:   ['가디언 오브 노바', '윌 오브 소드 : 스트라이크', '드라코 슬래셔', '드래곤 블레이즈'],
      common:  ['솔 야누스', '솔 헤카테', '판테온 VI'],
    },
  },
  'Kain': {
    folder:  'Kain',
    skill:   ['Total Annihilation', 'Churning Malice', '[발현] 스트라이크 임팩트'],
    mastery: ['HEXA Falling Dust / HEXA Poison Needle', 'HEXA Strike Arrow / HEXA Scattering Shot / HEXA Tearing Knife / HEXA Chain Sickle', 'HEXA Dragon Fang / HEXA Shaft Break / HEXA Phantom Blade / HEXA Lasting Grudge', "HEXA Death's Blessing / HEXA Chasing Shot / HEXA Unseen Sniper"],
    boost:   ['Dragon Burst', 'Fatal Blitz', 'Thanatos Descent', 'Grip of Agony'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Might of the Nova'],
    ko: {
      skill:   ['어나일레이션', '맬리셔스 플리커', '[발현] 스트라이크 임팩트'],
      mastery: ['폴링 더스트 VI / 포이즌 니들 VI', '스트라이크 애로우 VI / 스캐터링 샷 VI / 테어링 나이프 VI / 체인 시클 VI', '샤프트 브레이크 VI / [발현] 샤프트 브레이크 VI / [처형] 팬텀 블레이드 VI / 드래곤 팡 VI / 리메인 인센스 VI', '데스 블레싱 VI / 체이싱 샷 VI / 스니키 스나이핑 VI / [발현/처형] 스니키 스나이핑 VI'],
      boost:   ['드래곤 버스트', '페이탈 블리츠', '타나토스 디센트', '그립 오브 애거니'],
      common:  ['솔 야누스', '솔 헤카테', '판테온 VI'],
    },
  },
  'Cadena': {
    folder:  'Cadena',
    skill:   ['Chain Arts: Grand Arsenal', 'Brutal Rampage', '체인아츠:토렌트'],
    mastery: ['HEXA Chain Arts: Thrash', 'HEXA Muscle Memory', 'HEXA Summon Scimitar / HEXA Summon Claw / HEXA Summon Shuriken / HEXA Summon Spiked Bat / HEXA Chain Arts: Crush', 'HEXA Summon Shotgun / HEXA Summon Daggers / HEXA Summon Decoy Bomb / HEXA Summon Brick / HEXA Chain Arts: Beatdown / HEXA Veteran Shadowdealer'],
    boost:   ['Chain Arts: Void Strike', 'Apocalypse Cannon', 'Chain Arts: Maelstrom', 'Muscle Memory Finale'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Might of the Nova'],
    ko: {
      skill:   ['체인아츠:매서커', '브루탈 래비지', '체인아츠:토렌트'],
      mastery: ['체인아츠:스트로크 VI', '웨폰 버라이어티 VI', '서먼 커팅 시미터 VI / 서먼 스크래칭 클로 VI / 서먼 스로잉 윙대거 VI / 서먼 비팅 니들배트 VI / 체인아츠:크러시 VI', '서먼 슈팅 샷건 VI / 서먼 슬래싱 나이프 VI / 서먼 릴리싱 봄 VI / 서먼 스트라이킹 브릭 VI / 체인아츠:테이크다운 VI / 프로페셔널 에이전트 VI'],
      boost:   ['체인아츠:퓨리', 'A.D 오드넌스', '체인아츠:메일스트롬', '웨폰 버라이어티 피날레'],
      common:  ['솔 야누스', '솔 헤카테', '판테온 VI'],
    },
  },
  'Angelic Buster': {
    folder:  'AngelicBuster',
    skill:   ['Grand Finale', 'Surprise Encore', '팝핑 하트'],
    mastery: ['HEXA Trinity', 'HEXA Soul Seeker / HEXA Soul Seeker Expert', 'HEXA Supreme Supernova', 'HEXA Celestial Roar / Encore Ribbon'],
    boost:   ['Sparkle Burst', 'Superstar Spotlight', 'Mighty Mascot', 'Trinity Fusion'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Might of the Nova'],
    ko: {
      skill:   ['그랜드 피날레', '제뉴인 앙코르', '팝핑 하트'],
      mastery: ['트리니티 VI', '소울 시커 VI / 소울 시커 엑스퍼트 VI', '슈퍼 노바 VI', '프라이멀 로어 VI / 다카포 페투치아'],
      boost:   ['에너지 버스트', '스포트라이트', '마스코트 패밀리어', '트리니티 퓨전'],
      common:  ['솔 야누스', '솔 헤카테', '판테온 VI'],
    },
  },
  'Hayato': {
    folder:  'Hayato',
    skill:   ['Shin Quick Draw', 'Fleeting Breath', '3번째 코어'],
    mastery: ['HEXA [Shinsoku] Mist Slash / HEXA [Shinsoku] Afterimage Slash', 'HEXA [Shinsoku] Crescent Moon Cut / HEXA [Shinsoku] Silent Arc', 'HEXA [Battou] Dark Moon Cut', "HEXA [Battou] Full Moon's Rage"],
    boost:   ['Shogetsu Form Boost', '[Shinsoku] Crashing Tide', '[Shinsoku] Light Cutter', '[Battou] Wailing Heavens'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Twilight Bloom'],
    ko: {
      skill:   ['발도격·진', '찰나의 숨결', '3번째 코어'],
      mastery: ['[신속] 무참 VI / [신속] 잔영참 VI', '[신속] 신월참 VI / [신속] 침묵의 궤적 VI', '[발도] 잔월참 VI', '[발도] 만월의 포효 VI'],
      boost:   ['초월의 형', '[신속] 침몰의 만조', '[신속] 질주의 섬광', '[발도] 애호의 천광'],
      common:  ['솔 야누스', '솔 헤카테', 'HEXA Twilight Bloom'],
    },
  },
  'Kanna': {
    folder:  'Kanna',
    skill:   ['[Divine Will] Advent of Crimson', '[Divine Will] Final Rest', '3번째 코어'],
    mastery: ['HEXA Soul-Shatter Talisman: Dance / HEXA Heart-Wreck Talisman', 'HEXA: Summon Oni / HEXA [Order] Spinning Strike / HEXA [Order] Pulverizing Strike', 'HEXA Summon Tengu / HEXA [Order] Shade-Fletched Arrow', 'HEXA Summon Orochi / HEXA [Order] Execute'],
    boost:   ['[Spirit] Hakumenkonmou Juubi Boost', '[Spirit] Unleash the Radiant Flame', '[Spirit] Unleash Black-Winged Destruction Boost', '[Spirit] Unleash Soul-Searing Venom Boost'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Twilight Bloom'],
    ko: {
      skill:   ['[천령] 패왕강림', '[천령] 멸식', '3번째 코어'],
      mastery: ['파혼부 : 무 VI / 쇄심부 VI', '오니 VI / HEXA [Order] Spinning Strike / HEXA [Order] Pulverizing Strike', '텐구 VI / HEXA Shade-Fletched Arrow', '오로치 VI / HEXA [Order] Execute'],
      boost:   ['[영혼] 백면금모 십미호', '[영혼] 부분해방 : 연염광인', '[영혼] 부분해방 : 흑익파천', '[영혼] 부분해방 : 절혼독아'],
      common:  ['솔 야누스', '솔 헤카테', 'HEXA Twilight Bloom'],
    },
  },
  'Illium': {
    folder:  'Illium',
    skill:   ['Mytocrystal Expanse', 'Excidium', '글로리 윙:스플렌더'],
    mastery: ['HEXA Radiant Javelin / HEXA Winged Javelin', 'HEXA Reaction - Domination / HEXA Reaction - Destruction / HEXA Vortex Wings', 'HEXA Ex / HEXA Machina / HEXA Crystal Skill - Deus', 'HEXA Longinus / HEXA Umbral Brand III / HEXA Longinus Zone'],
    boost:   ['Crystal Ignition', 'Templar Knight', 'Crystalline Spirit', 'Crystal Gate'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Conversion Overdrive'],
    ko: {
      skill:   ['언리미티드 크리스탈', '엑시디움', '글로리 윙:스플렌더'],
      mastery: ['크래프트:자벨린 VI / 글로리 윙:자벨린 VI', '리액션:도미네이션 VI / 리액션:디스트럭션 VI / 글로리 윙:모탈 윙비트 VI', '리요 VI / 마키나 VI / 크리스탈 스킬:데우스 VI', '크래프트:롱기누스 VI / 커스 마크 완성 VI / 롱기누스 존 VI'],
      boost:   ['크리스탈 이그니션', '그람홀더', '소울 오브 크리스탈', '크리스탈 게이트'],
      common:  ['솔 야누스', '솔 헤카테', '매직 서킷 풀 드라이브 VI'],
    },
  },
  'Ark': {
    folder:  'Ark',
    skill:   ['Primordial Abyss', 'Whisper of Deepest Abyss', '원초의 격류'],
    mastery: ['HEXA Basic Charge Drive / HEXA Scarlet Charge Drive / HEXA Gust Charge Drive / HEXA Abyssal Charge Drive', 'HEXA Grievous Wound / HEXA Insatiable Hunger / HEXA Unbridled Chaos', 'HEXA Vengeful Hate / HEXA Blissful Restraint / HEXA Endless Agony', 'HEXA Ominous Nightmare / HEXA Ominous Dream'],
    boost:   ['Abyssal Recall', 'Infinity Spell', 'Devious Nightmare / Devious Dream', 'Endlessly Starving Beast'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Conversion Overdrive'],
    ko: {
      skill:   ['가장 오래된 심연', '절대 심연의 속삭임', '원초의 격류'],
      mastery: ['플레인 차지드라이브 VI / 스칼렛 차지드라이브 VI / 거스트 차지드라이브 VI / 어비스 차지드라이브 VI', '지워지지 않는 상처 VI / 채워지지 않는 굶주림 VI / 걷잡을 수 없는 혼돈 VI', '돌아오는 증오 VI / 황홀한 구속 VI / 끝없는 고통 VI', '잊혀지지 않는 악몽 VI / 잊혀지지 않는 흉몽 VI'],
      boost:   ['근원의 기억', '인피니티 스펠', '새어 나오는 악몽 / 새어 나오는 흉몽', '영원히 굶주리는 짐승'],
      common:  ['솔 야누스', '솔 헤카테', '매직 서킷 풀 드라이브 VI'],
    },
  },
  'Khali': {
    folder:  'Khalie',
    skill:   ['Hex: Sandstorm', 'Wake the Void', '헥스 : 듄 버스트'],
    mastery: ['HEXA Arts: Flurry / HEXA Arts: Crescentum', 'HEXA Void Rush / HEXA Void Blitz / HEXA Hex: Chakram Split', 'HEXA Hex: Chakram Sweep / HEXA Hex: Chakram Fury / HEXA Death Blossom', 'HEXA Resonate / HEXA Deceiving Blade'],
    boost:   ['Hex: Pandemonium', 'Void Burst', 'Arts: Astra', 'Resonate: Ultimatum'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Conversion Overdrive'],
    ko: {
      skill:   ['헥스 : 샌드스톰', '보이드 어웨이크', '헥스 : 듄 버스트'],
      mastery: ['아츠 : 플러리 VI / 아츠 : 크레센텀 VI', '보이드 러쉬 VI / 보이드 블리츠 VI / 헥스 : 차크람 스플릿 VI', '헥스 : 차크람 퓨리 VI / 헥스 : 차크람 스윕 VI / 데스 블로섬 VI', '레조네이트 VI / 디시빙 블레이드 VI'],
      boost:   ['헥스 : 판데모니움', '보이드 버스트', '아츠 : 아스트라', '레조네이트 : 얼티메이텀'],
      common:  ['솔 야누스', '솔 헤카테', '매직 서킷 풀 드라이브 VI'],
    },
  },
  'Hoyoung': {
    folder:  'HoYoung',
    skill:   ['Sage: Apotheosis', 'Millennium Spirit', '선기 : 사흉해방 도철'],
    mastery: ['HEXA Heaven: Consuming Flames / HEXA Earth: Stone Tremor / HEXA Humanity: Gold-Banded Cudgel', 'HEXA Heaven: Iron Fan Gale / HEXA Earth: Ground-Shattering Wave / HEXA Humanity: As-You-Will Fan', 'HEXA Talisman: Clone / HEXA Talisman: Seeking Ghost Flame', 'HEXA Scroll: Star Vortex / HEXA Scroll: Butterfly Dream'],
    boost:   ['Sage: Clone Rampage', 'Scroll: Tiger of Songyu', 'Sage: Wrath of Gods', 'Sage: Three Paths Apparition'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Lotus Flower'],
    ko: {
      skill:   ['선기 : 파천황', '천세휘령', '선기 : 사흉해방 도철'],
      mastery: ['멸화염 : 천 VI / 지진쇄 : 지 VI / 금고봉 : 인 VI', '파초풍 : 천 VI / 토파류 : 지 VI / 여의선 : 인 VI', '환영 분신부 VI / 추적 귀화부 VI', '권술 : 흡성와류 VI / 권술 : 호접지몽 VI'],
      boost:   ['선기 : 극대 분신난무', '권술 : 산령소환', '선기 : 강림 괴력난신', '선기 : 천지인 환영'],
      common:  ['솔 야누스', '솔 헤카테', '화중군자 VI'],
    },
  },
  'Lara': {
    folder:  'Lara',
    skill:   ['Universe in Bloom', 'Cornucopia', '한아름 아우른 숨결'],
    mastery: ['HEXA Essence Sprinkle', 'HEXA Dragon Vein Eruption / HEXA Eruption: Heaving River / HEXA Eruption: Whirlwind / HEXA Eruption: Sunrise Well', 'HEXA Dragon Vein Absorption / HEXA Absorption: River Puddle Douse / HEXA Absorption: Fierce Wind / HEXA Absorption: Sunlit Grain', 'HEXA Wakeup Call'],
    boost:   ['Big Stretch', "Land's Connection", 'Surging Essence', 'Winding Mountain Ridge'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Lotus Flower'],
    ko: {
      skill:   ['새록새록 꽃누리', '안다미로', '한아름 아우른 숨결'],
      mastery: ['정기 뿌리기 VI', '용맥 분출 VI / 분출 : 너울이는 강 VI / 분출 : 돌개바람 VI / 분출 : 해돋이 우물 VI', '용맥 흡수 VI / 흡수 : 강 웅덩이 물벼락 VI / 흡수 : 소소리 바람 VI / 흡수 : 햇빛 맹아리 VI', '잠 깨우기 VI'],
      boost:   ['큰 기지개', '해 강 산 바람', '용솟음치는 정기', '산등성이 굽이굽이'],
      common:  ['솔 야누스', '솔 헤카테', '화중군자 VI'],
    },
  },
  'Ren': {
    folder:  'Ren',
    skill:   ['Rising Azure Dragon: Divided Heavens', 'Rising Azure Dragon: Heartbound Verse', '창룡파천검 : 만참'],
    mastery: ['HEXA Plum Blossom Sword: Storm', "HEXA Imugi Spirit Sword: Spirit Strike / HEXA Second Imugi Spirit Sword: Serpent's Fang", 'HEXA Wish Unending / HEXA Final Imugi Spirit Sword: Burrowing Earth / HEXA Final Imugi Spirit Sword: Ravenous Spirit / HEXA Final Imugi Spirit Sword: Years Uncounted', 'HEXA Second Plum Blossom Sword: Raining Blossoms / HEXA Third Plum Blossom Sword: Riotous Heart'],
    boost:   ['Final Plum Blossom Sword: Thousand Blossom Flurry', 'Soul Immeasurable', 'Final Plum Blossom Sword: Dancing Annihilation', 'Final Imugi Spirit Sword: Blade of the Unbound Heart'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Lotus Flower'],
    ko: {
      skill:   ['창룡파천검 : 승천', '창룡파천검 : 일매낙화 천비인적', '창룡파천검 : 만참'],
      mastery: ['매화검 본초 : 선참 VI', '망혼검 본초 : 영격 VI / 망혼검 2초식 : 연참 VI', '망혼강림 VI / 망혼검 절기 : 열지 VI / 망혼검 절기 : 망탄 VI / 망혼검 절기 : 무량겁 VI', '매화검 2초식 : 쇄매 VI / 매화검 3초식 : 예인 VI / 매화검 3초식 : 일격예인 VI'],
      boost:   ['매화검 절기 : 만리향', '망혼각성', '매화검 절기 : 섬무', '망혼검 절기 : 심검'],
      common:  ['솔 야누스', '솔 헤카테', '화중군자 VI'],
    },
  },
  'Zero': {
    folder:  'Zero',
    skill:   ['End Time', 'Bitemporis', '타임 어소리티'],
    mastery: ['HEXA Wind Cutter / HEXA Giga Crash', 'HEXA Spin Driver / HEXA Rolling Cross', 'HEXA Flash Assault / HEXA Flash Cut', 'HEXA Moon Strike / HEXA Rising Slash / HEXA Shadow Rain / Infinite Resonance'],
    boost:   ['Chrono Break', 'Twin Blades of Time', 'Shadow Flash', 'Ego Weapon'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Transcendent'],
    ko: {
      skill:   ['크로노 트리거', '바이템포리스', '타임 어소리티'],
      mastery: ['윈드 커터 VI / 기가 크래시 VI', '터닝 드라이브 VI / 롤링 커브 VI', '프론트 슬래시 VI / 스로잉 웨폰 VI / 플래시 어썰터 VI / 스핀 커터 VI', '어퍼 슬래시 VI / 파워 스텀프 VI / 문 스트라이크 VI / 피어스 쓰러스트 VI / 쉐도우 스트라이크 VI / 쉐도우 레인 VI / 인피니트 레조넌스'],
      boost:   ['리미트 브레이크', '조인트 어택', '쉐도우 플래시', '에고 웨폰'],
      common:  ['솔 야누스', '솔 헤카테', '트랜센던트 VI'],
    },
  },
  'Kinesis': {
    folder:  'Kinesis',
    skill:   ['From Another Realm', 'Fractal Horizon', '그래비티 오브젝트'],
    mastery: ['HEXA Ultimate: Pressure / HEXA Ultimate: Check', 'HEXA Psychic Smash', 'HEXA Ultimate: Opening / HEXA Ultimate: Gambit', 'HEXA Kinetic Combo'],
    boost:   ['Ultimate: Checkmate', 'Psychic Nova', 'Psychic Shockwave', 'Psychic Castle'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Afterimage of the Otherworld'],
    ko: {
      skill:   ['어나더 렐름', '프렉탈 호라이즌', '그래비티 오브젝트'],
      mastery: ['얼티메이트 : 프레셔 VI / 얼티메이트 : 체크 VI', '싸이킥 스매싱 VI', '얼티메이트 : 오프닝 VI / 얼티메이트 : 갬빗 VI', '텔레키네시스 VI'],
      boost:   ['얼티메이트 : 체크메이트', '싸이킥 노바', '싸이킥 불릿', '싸이킥 보드'],
      common:  ['솔 야누스', '솔 헤카테', '이계의 잔상 VI'],
    },
  },
  'Lynn': {
    folder:  'Lynn',
    skill:   ['Source Flow', 'Wild Hunt', '3번째 코어'],
    mastery: ['HEXA Strike', 'HEXA Sneak Attack / HEXA Raid', 'HEXA Peck', "HEXA [Focus] Heal / HEXA [Focus] Forest Protection / HEXA Mother Nature's Touch"],
    boost:   ["Beast's Rage Boost", 'Beak Strike Boost', '[Focus] Awaken Boost', "Nature's Grace Boost"],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Ring of Samsara'],
    ko: {
      skill:   ['근원의 흐름', 'Wild Hunt', '3번째 코어'],
      mastery: ['스매시 VI', '암습 VI / 급습 VI', '쪼기 VI', '[집중] 치유 VI / [집중] 숲의 보호 VI / 대자연의 손길 VI'],
      boost:   ['맹수의 분노', '창공의 칼날', '[집중] 각성', '자연의 은혜'],
      common:  ['솔 야누스', '솔 헤카테', 'HEXA Ring of Samsara'],
    },
  },
  /* Mo Xuan의 3번째 스킬 코어는 GMS v.270에 없어 하야토·칸나·린과 같이 자리만 둔다. 아이콘 폴더 이름은 Moxuan */
  'Mo Xuan': {
    folder:  'Moxuan',
    skill:   ['Soul Art: Jianghu Dragon', 'Soul Art: Where Destiny Falls', '3번째 코어'],
    mastery: ['HEXA Xuanshan Arts [Tian] / [Di]', 'HEXA Divine Art: Howling Storm / HEXA Divine Art: Erupting Flame / HEXA Divine Art: Righteous Thunder', 'HEXA Divine Art: Swirling Tide / HEXA Divine Art: Tearing Wind / HEXA Soul Art: Black Wind', 'HEXA Secret Art: Qi Projection'],
    boost:   ['Soul Art: Beneath Heaven Boost', 'Soul Art: The Conquered Self Boost', 'Soul Art: The Opened Gate Boost', 'Divine Art: Crashing Earth Boost'],
    common:  ['Sol Janus', 'Sol Hecate', 'HEXA Ring of Samsara'],
    ko: {
      skill:   ['Soul Art: Jianghu Dragon', 'Soul Art: Where Destiny Falls', '3번째 코어'],
      mastery: ['HEXA Xuanshan Arts [Tian] / [Di]', 'HEXA Divine Art: Howling Storm / HEXA Divine Art: Erupting Flame / HEXA Divine Art: Righteous Thunder', 'HEXA Divine Art: Swirling Tide / HEXA Divine Art: Tearing Wind / HEXA Soul Art: Black Wind', 'HEXA Secret Art: Qi Projection'],
      boost:   ['Soul Art: Beneath Heaven Boost', 'Soul Art: The Conquered Self Boost', 'Soul Art: The Opened Gate Boost', 'Divine Art: Crashing Earth Boost'],
      common:  ['솔 야누스', '솔 헤카테', 'HEXA Ring of Samsara'],
    },
  },
  /* 에렐 라이트 — GMS 위키 Erel_Light/Skills 기준.
     스킬 코어 2번째 Radiant Spear: GMS는 영문 표기만 존재해 공식 한글명이 없음, 사용자 확인으로 음역 표기 유지.
     마스터리는 현재 GMS 노드 2개: 1 = SHINE Spear of Lugh, 2 = SHINE Fury of Roan + SHINE Sting of Roan.
     마스터리 3·4는 GMS 미공개라 넣지 않는다. 아이콘 5 = 스피어 오브 루, 6 = 퓨리 오브 론 */
  'Erel Light': {
    folder:  'ErelLight',
    skill:   ['폴 오브 멜린', '레디언트 스피어'],
    mastery: ['스피어 오브 루 VI', '퓨리 오브 론 VI / 스팅 오브 론 VI'],
    boost:   ['센티널 라이즈 강화', '이터널 가디언 강화', '디스트럭션 오브 론 강화', '이터널 라이트 강화'],
    common:  ['솔 야누스', '솔 헤카테', 'SHINE Tree of Stars'],
  },
  /* 시아 아스텔은 HEXA가 아닌 Erda Link 체계. GMS 위키 Sia_Astelle/Skills 기준
     스킬 2 / 마스터리 2 / 강화 4 / 공용 3. 마스터리 3·4는 GMS 미공개.
     Erda Link 비용표는 GMS 출처를 찾지 못해 기존 비용 처리를 유지한다 */
  'Sia Astelle': {
    folder:  'SiaAstelle',
    skillCost: 'common',   // 오리진 외 스킬 코어도 공용 코어 비용(208/6,268) — maplehub 기준
    skill:   ['셀레스티얼 디자인', '스탈릿 코스모스'],
    mastery: ['샤인 레이 / SHINE Stellar I - Antares', 'SHINE Boom / SHINE Stellar II - Algol / SHINE Stellar V - Fomalhaut'],
    boost:   ['샤인 강화', 'Stellar XI - Sirius 강화', 'Stellar XII - Sadalsuud 강화', '서클 오브 세이비어 강화'],
    common:  ['솔 야누스', '솔 헤카테', 'SHINE Tree of Stars'],
  },
  'Lethe': {
    folder:  'Lethe',
    skill:   ['오버로드 : 이터널 게이즈', '앱솔루트 레인', '보이드 오리진'],
    mastery: ['임프린트 VI/이딕트 : 펠 스톰 VI', '인보크 : 바르가르 VI/이딕트 : 램페이지 VI', '인보크 : 템플러 VI/이딕트 : 템플러 아츠 VI', '임펠 VI/팩트 매니페스트'],
    boost:   ['오버로드 : 템플러 온슬로트 강화', '오버로드 : 바르가르 트라이던트 강화', '인보크/오버로드 : 아즈라스 강화', '체인 커맨드 강화'],
    common:  ['Sol Janus', 'Sol Hecate', '프라이멀 퓨리 VI'],
    ko: {
      skill:   ['오버로드 : 이터널 게이즈', '앱솔루트 레인', '보이드 오리진'],
      mastery: ['임프린트 VI / 이딕트 : 펠 스톰 VI', '인보크 : 바르가르 VI / 이딕트 : 램페이지 VI', '인보크 : 템플러 VI / 이딕트 : 템플러 아츠 VI', '임펠 VI / 팩트 매니페스트'],
      boost:   ['오버로드 : 템플러 온슬로트', '오버로드 : 바르가르 트라이던트', '인보크 / 오버로드 : 아즈라스', '체인 커맨드'],
      common:  ['솔 야누스', '솔 헤카테', '프라이멀 퓨리 VI'],
    },
  },
};
const HEXA_DEFAULT_DATA = { folder:null, skill:['스킬 노드 1','스킬 노드 2'], mastery:['마스터리 1','마스터리 2','마스터리 3','마스터리 4'], boost:['부스트 1','부스트 2','부스트 3','부스트 4'], common:['Sol Janus','Sol Hecate'] };

function hexaCumulative(costTable, fromLv, toLv) {
  let se = 0, sef = 0;
  for (let i = fromLv; i < toLv; i++) {
    se  += costTable[i][0];
    sef += costTable[i][1];
  }
  return { se, sef };
}
