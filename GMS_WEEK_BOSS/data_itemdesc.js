/* ═══════════════════════════════════════════════
   data_itemdesc.js — 보스 드랍 아이템의 실제 인게임 설명

   bosshp.js의 드랍 아이템 팝업에서 아이콘을 클릭하면 이 값을 찾아 보여준다.
   키는 images/WANT/ 아래 파일명(BOSS_DROP_ITEMS의 it.file과 동일).

   화면에는 desc_kr(한국어, KMS 클라이언트 실제 문구)만 띄운다 — 이 사이트
   사용자가 한국어 사용자라 GMS 영문 설명은 안 맞는다는 피드백을 받고
   한국어로 다시 리서치함(2026-09-24). desc_en/desc_en_source는 화면에
   안 쓰지만 참고용으로 남겨둔다(첫 리서치 결과, maplestorywiki.net 기준).

   desc_kr은 namu.wiki 등 실제 클라이언트 문구를 옮겨 적은 한국어 소스에서
   직접 확인한 것만 넣었다 — 영문 설명을 번역해서 채워넣지 않음. 확인 못 한
   건 null로 남겼고, 두 경우가 섞여 있다:
     1) 확인 결과 인게임에 설명 자체가 없는 아이템(장신구 장비, 로이드류 등
        다수 확인됨 — desc_en 리서치에서도 대부분 같은 아이템이 null이었음)
     2) 아직 못 찾은 것 — 상자류·해머류 등 GMS에는 있는데 한국어 소스에서
        문구를 못 찾은 것들. 나중에 다시 찾아볼 때 이 목록 위주로 보면 된다.
   구분하지 않고 "아직 등록된 설명이 없습니다"로 같이 표시한다(bosshp.js).
   ═══════════════════════════════════════════════ */
const ITEM_DESC = {
  "Use_Special_Energy_Core_S.png": {
    "name_kr": "특수형 에너지 코어(S)급",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Soul_Fragment.png": {
    "name_kr": "벨로나의 소울 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Green_Jade_Boss_Ring_Box.png": {
    "name_kr": "녹옥의 보스 반지 상자",
    "desc_kr": "초록색으로 빛나는 반지 상자이다. 상자를 개봉하면 각각 다른 확률에 따라 1~3레벨 특수 스킬 반지 중 1종을 획득할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A Ring Box radiating a brilliant green light. Open the box to obtain a special Skill Ring between Lv. 1 and Lv. 3 according to their set acquisition rates.",
    "desc_en_source": "https://maplestorywiki.net/w/Boss_Ring_Box"
  },
  "Use_AbsoLab_Armor_Box.png": {
    "name_kr": "앱솔랩스 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "Double-click to select and obtain an AbsoLab Armor of your choice. (Heroic/Reboot: Double-click to select and obtain an AbsoLab Armor for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/AbsoLab_Armor_Box"
  },
  "Use_AbsoLab_Weapon_Box.png": {
    "name_kr": "앱솔랩스 무기 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "Double-click to select and obtain an AbsoLab Weapon of your choice. (Heroic/Reboot: Double-click to select and obtain an AbsoLab Weapon for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/AbsoLab_Weapon_Box"
  },
  "Use_Red_Jade_Boss_Ring_Box.png": {
    "name_kr": "홍옥의 보스 반지 상자",
    "desc_kr": "붉게 빛나는 반지 상자이다. 상자를 개봉하면 각각 다른 확률에 따라 1~4레벨 특수 스킬 반지 중 1종을 획득할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A Ring Box radiating a brilliant red light. Open the box to obtain a special Skill Ring between Lv. 1 and Lv. 4 according to their set acquisition rates.",
    "desc_en_source": "https://maplestorywiki.net/w/Boss_Ring_Box"
  },
  "Eqp_Berserked.png": {
    "name_kr": "루즈 컨트롤 머신 마크",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Lotus_Droid.png": {
    "name_kr": "스우 로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Pitched_Whisper_Crystal.png": {
    "name_kr": "칠흑의 속삭임 결정",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "This crystal hums with intense power. Used as material for Pitched Boss Set equipment fusion.",
    "desc_en_source": "https://maplestorywiki.net/w/Pitched_Whisper_Crystal"
  },
  "Use_White_Jade_Boss_Ring_Box.png": {
    "name_kr": "백옥의 보스 반지 상자",
    "desc_kr": "환하게 빛나는 반지 상자이다. 상자를 개봉하면 각각 다른 확률에 따라 3~4레벨 특수 스킬 반지 중 1종을 획득할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A Ring Box shining brightly. Open the box to obtain a special Skill Ring between Lv. 3 and Lv. 4 according to their set acquisition rates.",
    "desc_en_source": "https://maplestorywiki.net/w/Boss_Ring_Box"
  },
  "Eqp_Total_Control.png": {
    "name_kr": "컴플리트 언더컨트롤",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Extreme_Lotus_Droid.png": {
    "name_kr": "섬멸병기 스우로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Twisted_Stigma_Soul_Stone.png": {
    "name_kr": "뒤틀린 낙인의 영혼석",
    "desc_kr": "마족의 낙인이 박힌 영혼석. 낙인 자체적으로 폭주하여 심하게 뒤틀려 있다. 어둡고 강한 마력이 느껴진다. 버려진 야영지의 병참장교 사카로를 찾아가면 스티그마 코인으로 교환할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/앱솔랩스 세트",
    "desc_en": "A Spirit Stone marked with the brand of the demon. This one is twisted, and seethes with dark energy. You can exchange it for Stigma Coins by visiting Quartermaster Sakaro at the Deserted Camp.",
    "desc_en_source": "https://maplestorywiki.net/w/Twisted_Stigma_Spirit_Stone"
  },
  "Eqp_Ruin_Force_Shield.png": {
    "name_kr": "루인 포스실드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Magic_Eyepatch.png": {
    "name_kr": "마력이 깃든 안대",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Damien_Droid.png": {
    "name_kr": "데미안로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Guardian_Angel_Ring.png": {
    "name_kr": "가디언 엔젤 링",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Dawn_Whisper_Crystal.png": {
    "name_kr": "새벽의 속삭임 결정",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "This crystal hums with intense power. Used as material for Dawn Boss Set equipment fusion.",
    "desc_en_source": "https://maplestorywiki.net/w/Dawn_Whisper_Crystal"
  },
  "Use_Black_Jade_Boss_Ring_Box.png": {
    "name_kr": "흑옥의 보스 반지 상자",
    "desc_kr": "검은색의 반지 상자이다. 상자를 개봉하면 각각 다른 확률에 따라 1~4레벨 특수 스킬 반지 중 1종을 획득할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A black Ring Box. Open the box to obtain a special Skill Ring between Lv. 1 and Lv. 4 according to their set acquisition rates.",
    "desc_en_source": "https://maplestorywiki.net/w/Boss_Ring_Box"
  },
  "Etc_Butterfly_Droplet_Stone.png": {
    "name_kr": "나비날개 물방울석",
    "desc_kr": "루시드의 마력이 흘러 들어 형태를 이룬 물방울석이다.",
    "desc_kr_source": "https://namu.wiki/w/아케인셰이드 세트",
    "desc_en": "Lucid's magical power fills this droplet stone. You can exchange it for Phantasma Coin by visiting Kanto in Trueffet Square.",
    "desc_en_source": "https://maplestorywiki.net/w/Butterfly_Droplet_Stone"
  },
  "Eqp_Twilight_Mark.png": {
    "name_kr": "트와일라이트 마크",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Dreamy_Belt.png": {
    "name_kr": "몽환의 벨트",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Lucid_Droid.png": {
    "name_kr": "루시드로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Arcane_Umbra_Armor_Box.png": {
    "name_kr": "아케인셰이드 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "The Arcane River's magical power dwells within this Armor Box. Double-click to select and obtain an Arcane Umbra Armor of your choice. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Arcane_Umbra_Armor_Box"
  },
  "Use_Arcane_Umbra_Weapon_Box.png": {
    "name_kr": "아케인셰이드 무기 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "The Arcane River's magical power dwells within this Weapon Box. Double-click to select and obtain an Arcane Umbra Weapon of your choice. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Arcane_Umbra_Weapon_Box"
  },
  "Etc_Cobweb_Droplet_Stone.png": {
    "name_kr": "코브웹 물방울석",
    "desc_kr": "윌의 마력이 흘러 들어 형태를 이룬 물방울석이다.",
    "desc_kr_source": "https://namu.wiki/w/아케인셰이드 세트",
    "desc_en": "This magical stone droplet is filled with Will's power. You can exchange it for Arachno Coins by visiting Kanto at Esfera Base Camp.",
    "desc_en_source": "https://maplestorywiki.net/w/Stone_Cobweb_Droplet"
  },
  "Use_Will's_Cursed_Spellbook_Selection_Box.png": {
    "name_kr": "저주받은 마도서 선택 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "This box emits Will's dark magic. Double-click to select and obtain a Cursed Spellbook of your choice.",
    "desc_en_source": "https://maplestorywiki.net/w/Will's_Cursed_Spellbook_Selection_Box"
  },
  "Etc_Mirror_World_Core_Gemstone.png": {
    "name_kr": "거울세계의 코어 젬스톤",
    "desc_kr": "윌이 가졌던 에르다의 일부가 녹아든 코어 젬스톤이다. 더블클릭하면 사용 가능하다. 최초 사용 시 '스파이더 인 미러' 공용 코어를 개방할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/코어 젬스톤",
    "desc_en": "Double-click to use. Obtain 1 V Point, which can be used to unlock or enhance Nodes. (First use unlocks the 'Spider in Mirror' Core skill.)",
    "desc_en_source": "https://maplestorywiki.net/w/Core_Gemstone"
  },
  "Eqp_Estella_Earrings.png": {
    "name_kr": "에스텔라 이어링",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Endless_Terror.png": {
    "name_kr": "거대한 공포",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Daybreak_Pendant.png": {
    "name_kr": "데이브레이크 펜던트",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Source_of_Suffering.png": {
    "name_kr": "고통의 근원",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Commanding_Force_Earring.png": {
    "name_kr": "커맨더 포스 이어링",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Genesis_Badge.png": {
    "name_kr": "창세의 뱃지",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Exceptional_Hammer_(Belt).png": {
    "name_kr": "익셉셔널 해머 (벨트)",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An Exceptional Hammer to draw out the true power of the Dreamy Belt. Can be used on an untradable Dreamy Belt.",
    "desc_en_source": "https://maplestorywiki.net/w/Exceptional_Hammer"
  },
  "Etc_Mitra_Core_Gemstone.png": {
    "name_kr": "미트라의 코어 젬스톤",
    "desc_kr": "태양신의 분노가 녹아든 코어 젬스톤이다. 더블클릭하면 사용 가능하다. 최초 사용 시 '크레스트 오브 더 솔라' 공용 코어를 개방할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/코어 젬스톤",
    "desc_en": "Double-click to use. Obtain 1 V Point, which can be used to unlock or enhance Nodes. (First use unlocks the 'Crest of the Solar' Core skill.)",
    "desc_en_source": "https://maplestorywiki.net/w/Core_Gemstone"
  },
  "Use_Mitra's_Rage_Selection_Box.png": {
    "name_kr": "미트라의 분노 선택 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "The sun god's wrath sounds within this box. Double-click to select and obtain a Mitra's Rage item of your choice. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Mitra's_Rage_Selection_Box"
  },
  "Use_Exceptional_Hammer_(Face_Acc).png": {
    "name_kr": "익셉셔널 해머 (얼굴장식)",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An Exceptional Hammer to draw out the true power of the Berserked and Original Sin of Pride. Can be used on an untradable Berserked and Original Sin of Pride.",
    "desc_en_source": "https://maplestorywiki.net/w/Exceptional_Hammer"
  },
  "Etc_Vestige_of_Erion.png": {
    "name_kr": "에리온의 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Nikki_Droid.png": {
    "name_kr": "니키로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Grindstone_of_Life.png": {
    "name_kr": "생명의 연마석",
    "desc_kr": "강렬한 생명의 힘이 깃든 연마석이다. 사용 시 연마석과 메소를 소모하여 특정 종류의 교환 불가 상태의 4레벨 특수 스킬 반지를 연마하여 정해진 확률에 따라 5레벨로 성장시킬 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A grindstone containing the intense power of life. Use to consume the grindstone and Mesos to polish set Level 4 Special Skill Rings that are untradable for a chance to upgrade them to Level 5. The polish success rate and Mesos consumed are based on how many grindstones are used.",
    "desc_en_source": "https://maplestorywiki.net/w/Grindstone_of_Life"
  },
  "Etc_Kalos_Will_Fragment.png": {
    "name_kr": "남겨진 칼로스의 의지 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Life_Boss_Ring_Box.png": {
    "name_kr": "생명의 보스 반지 상자",
    "desc_kr": "생명의 힘이 느껴지는 반지 상자이다. 상자를 개봉하면 각각 다른 확률에 따라 3~4레벨 특수 스킬 반지 중 1종 또는 생명의 연마석을 획득할 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A Ring Box that radiates the power of life. Open the box to obtain a special Skill Ring between Lv. 3 and Lv. 4 according to their set acquisition rates or a Grindstone of Life.",
    "desc_en_source": "https://maplestorywiki.net/w/Boss_Ring_Box"
  },
  "Etc_Kalos_Will.png": {
    "name_kr": "남겨진 칼로스의 의지",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Will.png": {
    "name_kr": "의지의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An armor box imbued with Kalos the Guardian's determination. Double-click to obtain one Hat, Top, Bottom, or Shoulder Accessory from the Eternal set. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Divine_Eternal_Armor_Box"
  },
  "Use_Exceptional_Hammer_(Eye_Acc).png": {
    "name_kr": "익셉셔널 해머 (눈장식)",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An Exceptional Hammer to draw out the true power of the Magic Eyepatch. Can be used on an untradable Magic Eyepatch.",
    "desc_en_source": "https://maplestorywiki.net/w/Exceptional_Hammer"
  },
  "Etc_Tangled_Beast_Ring_Fragment.png": {
    "name_kr": "뒤엉킨 흉수의 고리 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Kaling_Droid.png": {
    "name_kr": "카링로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Grindstone_of_Faith.png": {
    "name_kr": "신념의 연마석",
    "desc_kr": "강렬한 신념이 깃든 연마석이다. 사용 시 연마석과 메소를 소모하여 특정 종류의 교환 불가 상태의 5레벨 특수 스킬 반지를 연마하여 정해진 확률에 따라 6레벨로 성장시킬 수 있다.",
    "desc_kr_source": "https://namu.wiki/w/특수 스킬 반지",
    "desc_en": "A grindstone containing the intense power of faith. Use to consume the grindstone and Mesos to polish set Level 5 Special Skill Rings that are untradable for a chance to upgrade them to Level 6. The polish success rate and Mesos consumed are based on how many grindstones are used.",
    "desc_en_source": "https://maplestorywiki.net/w/Grindstone_of_Faith"
  },
  "Etc_Tangled_Beast_Ring.png": {
    "name_kr": "뒤엉킨 흉수의 고리",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Beast.png": {
    "name_kr": "흉수의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An armor box that still contains faint traces of ferocious beasts. Double-click to obtain one Hat, Top, Bottom, or Shoulder Accessory from the Eternal set. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Ferocious_Beast_Eternal_Armor_Box"
  },
  "Use_Exceptional_Hammer_(Earrings).png": {
    "name_kr": "익셉셔널 해머 (귀고리)",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An Exceptional Hammer to draw out the true power of the Commanding Force Earring. Can be used on an untradable Commanding Force Earring.",
    "desc_en_source": "https://maplestorywiki.net/w/Exceptional_Hammer"
  },
  "Etc_Limbo_Droid.png": {
    "name_kr": "림보로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Distorted_Desire_Crystal.png": {
    "name_kr": "왜곡된 욕망의 결정",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Whisper_of_the_Source.png": {
    "name_kr": "근원의 속삭임",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Desire.png": {
    "name_kr": "욕망의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An armor box overflowing with distorted sin. Double-click to obtain one pair of Shoes, pair of Gloves, or Cape from the Eternal set. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Eternal_Armor_of_Desire_Box"
  },
  "Etc_Baldrix_Droid.png": {
    "name_kr": "발드릭스로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Eternal_Loyalty_Trace.png": {
    "name_kr": "영원한 충성의 흔적",
    "desc_kr": "발드릭스는 주군에게 영원히 충성할 것을 맹세했다. 설령 자신의 모든 것을 버려야 할지라도.",
    "desc_kr_source": "https://namu.wiki/w/에테르넬 세트",
    "desc_en": "Even with Baldrix gone, his oath remains. He'd abandon all else if his master so did call upon him. Collect 10, then double-click to select and obtain the Eternal Shoes, Gloves, or Cape.",
    "desc_en_source": "https://maplestorywiki.net/w/Trace_of_Eternal_Loyalty"
  },
  "Eqp_Oath_of_Death.png": {
    "name_kr": "죽음의 맹세",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Oath.png": {
    "name_kr": "맹세의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An armor box permeated with traces of eternal loyalty. Double-click to obtain one following Eternal set items: Shoes, Gloves, or Cape.",
    "desc_en_source": "https://maplestorywiki.net/w/Eternal_Armor_of_Oaths_Box"
  },
  "Etc_Adversary_Droid.png": {
    "name_kr": "대적자 로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Ancient_Resolve_Fragment.png": {
    "name_kr": "이어진 고대의 결의 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "Remnants of ancient traces left behind after the First Adversary's disappearance. Collect 2 and double-click to obtain Whisper of Ancient Resolve x1.",
    "desc_en_source": "https://maplestorywiki.net/w/Whisper_of_Ancient_Resolve"
  },
  "Etc_Ancient_Resolve.png": {
    "name_kr": "이어진 고대의 결의",
    "desc_kr": "최초의 대적자는 세계의 혼란을 잠재우고, 새로운 여명을 틔웠노라. 숭고한 뜻과 선한 마음은 계속 이어질 것이다.",
    "desc_kr_source": "https://namu.wiki/w/에테르넬 세트",
    "desc_en": "Ancient traces left behind after the disappearance of the First Adversary. Collect 10 and double-click to obtain one Hat, Top, Bottom, or Shoulder Accessory from the Eternal set. The First Adversary calmed the chaos of the world and ushered in a new dawn. Their noble intentions and kind heart will continue on.",
    "desc_en_source": "https://maplestorywiki.net/w/Echo_of_Ancient_Resolve"
  },
  "Eqp_Immortal_Legacy.png": {
    "name_kr": "불멸의 유산",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Box_Ancient.png": {
    "name_kr": "고대의 에테르넬 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An armor box imbued with a Echo of Ancient Resolve. Double-click to obtain one Hat, Top, Bottom, or Shoulder Accessory from the Eternal set. (Heroic/Reboot: ...for your job.)",
    "desc_en_source": "https://maplestorywiki.net/w/Ancient_Eternal_Armor_Box"
  },
  "Use_Exceptional_Hammer_(Medal).png": {
    "name_kr": "익셉셔널 해머 (훈장)",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": "An Exceptional Hammer to draw out the true power of the Immortal Legacy. Can be used on an untradable Immortal Legacy.",
    "desc_en_source": "https://maplestorywiki.net/w/Exceptional_Hammer"
  },
  "Etc_Hyungseong_Droid.png": {
    "name_kr": "흉성로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Blissful_Illusion_Piece.png": {
    "name_kr": "황홀한 환상의 단편 조각",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Blissful_Illusion_Fragment.png": {
    "name_kr": "황홀한 환상의 단편",
    "desc_kr": "너는 끝없는 심해 속 황홀한 환상. 내 영혼은 네게 영원히 잠기리.",
    "desc_kr_source": "https://namu.wiki/w/에테르넬 세트",
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Blissful_Nightmare.png": {
    "name_kr": "황홀한 악몽",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Illusion.png": {
    "name_kr": "환상의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Jupiter_Droid.png": {
    "name_kr": "유피테르로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Twisted_Longing_Shard.png": {
    "name_kr": "뒤틀린 갈망의 편린",
    "desc_kr": "신의 권위를 되찾을 수 있으리라 믿었건만, 뒤틀린 갈망에 잠식된 패배자의 몸부림일 뿐이었나.",
    "desc_kr_source": "https://namu.wiki/w/에테르넬 세트",
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Original_Sin_of_Pride.png": {
    "name_kr": "오만의 원죄",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Longing.png": {
    "name_kr": "갈망의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Bellona_Droid.png": {
    "name_kr": "벨로나로이드",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Etc_Cursed_Spirit_Remnant.png": {
    "name_kr": "저주받은 원혼의 잔재",
    "desc_kr": "저주는 벨로나의 모든 감각을 앗아갔다. 오직 죽음의 경계에서 한 발 더 내딛는 순간의 쾌감, 그 하나만을 남긴 채.",
    "desc_kr_source": "https://namu.wiki/w/에테르넬 세트",
    "desc_en": null,
    "desc_en_source": null
  },
  "Eqp_Starving_Blood_Spirit.png": {
    "name_kr": "굶주리는 핏빛 원혼",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  },
  "Use_Eternal_Armor_Box_Madness.png": {
    "name_kr": "광기의 에테르넬 방어구 상자",
    "desc_kr": null,
    "desc_kr_source": null,
    "desc_en": null,
    "desc_en_source": null
  }
};
