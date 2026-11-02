/* 스타포스 직작 — 세트·부위 목록. 아이콘은 images/items/<id>.png.
   제외: 포켓·뱃지·엠블렘·기계 심장·훈장은 스타포스 가능 여부를 확인하지 못해 뺐다.
   방어구·무기는 직업마다 이름이 달라 메르세데스 장비 하나를 대표로 쓴다. 방어구는 궁수, 무기는 듀얼보우건, 보조무기는 마법화살. 지수 요청
   name은 maplestory.io KMS 389 아이템 번호로 받은 한글 이름, en은 GMS 270 이름이다.
   에테르넬 아처글러브·아처슈즈·아처케이프, 데스티니 듀얼보우건, 아스트라 마법화살은 KMS 389에 아직 없어
   같은 세트의 이름 규칙대로 적었다. 게임 데이터로 확인하지 못한 이름이다
   minStar·maxStar: 강화를 시작하는 성수와 올릴 수 있는 상한. 데스티니 무기는 22성으로 받아 25성까지 올린다.
     출처 maplestorywiki.net Destiny Weapon 문서 2단계 초월 보상 "Star Force 22-Star, can be enhanced to 25 stars"
   destStar·spare: 파괴되면 스페어를 사서 destStar성으로 복구하고, 파괴마다 spare 메소를 누적 비용에 더한다.
     데스티니 무기 100억, 아스트라 보조무기 10억, 둘 다 12성 복구. 2026-11-02 지수 확인.
     KMS의 22성 확정 복구는 GMS에 들어오지 않아 넣지 않았다. 나머지 장비는 살 수 없어 스페어 0원, 복구 성수는 starforce.js getDestStar */
const SF_ITEMS = [
{ "set": "칠흑의 보스 세트", "slot": "얼굴장식", "name": "루즈 컨트롤 머신 마크", "lv": 160, "id": 1012632, "en": "Berserked" },
{ "set": "칠흑의 보스 세트", "slot": "눈장식", "name": "마력이 깃든 안대", "lv": 160, "id": 1022278, "en": "Magic Eyepatch" },
{ "set": "칠흑의 보스 세트", "slot": "벨트", "name": "몽환의 벨트", "lv": 200, "id": 1132308, "en": "Dreamy Belt" },
{ "set": "칠흑의 보스 세트", "slot": "펜던트", "name": "고통의 근원", "lv": 160, "id": 1122430, "en": "Source of Suffering" },
{ "set": "칠흑의 보스 세트", "slot": "귀고리", "name": "커맨더 포스 이어링", "lv": 200, "id": 1032316, "en": "Commanding Force Earring" },
{ "set": "칠흑의 보스 세트", "slot": "반지", "name": "거대한 공포", "lv": 200, "id": 1113306, "en": "Endless Terror" },
{ "set": "광휘의 보스 세트", "slot": "얼굴장식", "name": "오만의 원죄", "lv": 250, "id": 1012911, "en": "Original Sin of Pride" },
{ "set": "광휘의 보스 세트", "slot": "반지", "name": "근원의 속삭임", "lv": 250, "id": 1113341, "en": "Whisper of the Source" },
{ "set": "광휘의 보스 세트", "slot": "반지", "name": "황홀한 악몽", "lv": 250, "id": 1113360, "en": "Blissful Nightmare" },
{ "set": "광휘의 보스 세트", "slot": "펜던트", "name": "죽음의 맹세", "lv": 250, "id": 1122447, "en": "Oath of Death" },
{ "set": "여명의 보스 세트", "slot": "얼굴장식", "name": "트와일라이트 마크", "lv": 140, "id": 1012757, "en": "Twilight Mark" },
{ "set": "여명의 보스 세트", "slot": "펜던트", "name": "데이브레이크 펜던트", "lv": 140, "id": 1122443, "en": "Daybreak Pendant" },
{ "set": "여명의 보스 세트", "slot": "귀고리", "name": "에스텔라 이어링", "lv": 160, "id": 1032330, "en": "Estella Earrings" },
{ "set": "여명의 보스 세트", "slot": "반지", "name": "여명의 가디언 엔젤 링", "lv": 160, "id": 1113316, "en": "Dawn Guardian Angel Ring" },
{ "set": "아케인셰이드 방어구 세트", "slot": "모자", "name": "아케인셰이드 아처햇", "lv": 200, "id": 1004810, "en": "Arcane Umbra Archer Hat" },
{ "set": "아케인셰이드 방어구 세트", "slot": "한벌옷", "name": "아케인셰이드 아처슈트", "lv": 200, "id": 1053065, "en": "Arcane Umbra Archer Suit" },
{ "set": "아케인셰이드 방어구 세트", "slot": "장갑", "name": "아케인셰이드 아처글러브", "lv": 200, "id": 1082697, "en": "Arcane Umbra Archer Gloves" },
{ "set": "아케인셰이드 방어구 세트", "slot": "신발", "name": "아케인셰이드 아처슈즈", "lv": 200, "id": 1073160, "en": "Arcane Umbra Archer Shoes" },
{ "set": "아케인셰이드 방어구 세트", "slot": "망토", "name": "아케인셰이드 아처케이프", "lv": 200, "id": 1102942, "en": "Arcane Umbra Archer Cape" },
{ "set": "아케인셰이드 방어구 세트", "slot": "어깨장식", "name": "아케인셰이드 아처숄더", "lv": 200, "id": 1152198, "en": "Arcane Umbra Archer Shoulder" },
{ "set": "에테르넬 방어구 세트", "slot": "모자", "name": "에테르넬 아처햇", "lv": 250, "id": 1005982, "en": "Eternal Archer Hat" },
{ "set": "에테르넬 방어구 세트", "slot": "상의", "name": "에테르넬 아처후드", "lv": 250, "id": 1042435, "en": "Eternal Archer Hood" },
{ "set": "에테르넬 방어구 세트", "slot": "하의", "name": "에테르넬 아처팬츠", "lv": 250, "id": 1062287, "en": "Eternal Archer Pants" },
{ "set": "에테르넬 방어구 세트", "slot": "장갑", "name": "에테르넬 아처글러브", "lv": 250, "id": 1082762, "en": "Eternal Archer Gloves" },
{ "set": "에테르넬 방어구 세트", "slot": "신발", "name": "에테르넬 아처슈즈", "lv": 250, "id": 1073631, "en": "Eternal Archer Shoes" },
{ "set": "에테르넬 방어구 세트", "slot": "망토", "name": "에테르넬 아처케이프", "lv": 250, "id": 1103435, "en": "Eternal Archer Cape" },
{ "set": "에테르넬 방어구 세트", "slot": "어깨장식", "name": "에테르넬 아처숄더", "lv": 250, "id": 1152214, "en": "Eternal Archer Shoulder" },
{ "set": "데스티니 무기", "slot": "데스티니 무기", "name": "데스티니 듀얼보우건", "lv": 250, "id": 1522167, "en": "Destiny Dual Bowguns", "minStar": 22, "maxStar": 25, "destStar": 12, "spare": 10000000000 },
{ "set": "아스트라 보조무기", "slot": "보조무기", "name": "아스트라 마법화살", "lv": 200, "id": 1722100, "en": "Astra Magic Arrows", "destStar": 12, "spare": 1000000000 }
];
