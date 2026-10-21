/* data_coordi.js를 만드는 스크립트. 코디 시뮬레이터 코디 탭의 아이템 목록이다.

     node tools/gen_coordi_data.js

   maplestory.io의 GMS 캐시 장비 목록에서 코디 10부위만 추려 GMS_WEEK_BOSS/data_coordi.js를 덮어쓴다.
   한국 서버 이름은 같은 ID의 KMS 아이템 이름(번역이 아니라 KMS 원문).

   성별은 ID 천의 자리로 나눈다: 0 남자, 1 여자, 그 밖은 공용.
   (데이터의 requiredGender도 같은 값이고, 이름 표본으로 확인함 — 0은 남자 옷, 1은 드레스류) */

const fs = require('fs');
const path = require('path');

const VERSION = '270';
const KMS_VERSION = '389';
const OUT = path.join(__dirname, '..', 'data_coordi.js');
const API = 'https://maplestory.io/api';

// 화면에 보이는 순서
const PARTS = [
  { key: 'hat', sub: 'Hat', name: '모자' },
  { key: 'overall', sub: 'Overall', name: '한벌옷' },
  { key: 'top', sub: 'Top', name: '상의' },
  { key: 'bottom', sub: 'Bottom', name: '하의' },
  { key: 'shoes', sub: 'Shoes', name: '신발' },
  { key: 'glove', sub: 'Glove', name: '장갑' },
  { key: 'cape', sub: 'Cape', name: '망토' },
  { key: 'faceacc', sub: 'Face Accessory', name: '얼굴장식' },
  { key: 'eyeacc', sub: 'Eye Decoration', name: '눈장식' },
  { key: 'earrings', sub: 'Earrings', name: '귀걸이' },
];

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'byeolnim-coordi-data' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

(async () => {
  const gms = await getJson(`${API}/GMS/${VERSION}/item/?&overallCategoryFilter=Equip`);
  const kms = await getJson(`${API}/KMS/${KMS_VERSION}/item/?&overallCategoryFilter=Equip`);
  const ko = new Map(kms.filter(x => x.name).map(x => [x.id, x.name.trim()]));

  const parts = {};
  for (const P of PARTS) {
    const g = id => { const d = Math.floor(id / 1000) % 10; return d === 0 ? 0 : d === 1 ? 1 : 2; };
    parts[P.key] = gms
      .filter(x => x.isCash && x.typeInfo && x.typeInfo.subCategory === P.sub && x.name)
      .map(x => [x.id, x.name.trim(), ko.get(x.id) || '', g(x.id)])
      .sort((a, b) => b[0] - a[0]);
  }
  const meta = PARTS.map(P => ({ key: P.key, name: P.name }));
  const count = PARTS.map(P => `${P.name} ${parts[P.key].length}`).join(', ');
  const body =
`/* 코디 시뮬레이터 코디 탭 목록 — tools/gen_coordi_data.js가 만든 파일이라 손으로 고치지 말 것.
   maplestory.io GMS v${VERSION} 캐시 장비. ${count}
   각 줄: [아이템 ID, 영문 이름, 한국 서버 이름, 성별(0 남자, 1 여자, 2 공용)] */
window.COORDI_DATA = {
  version: '${VERSION}',
  parts: ${JSON.stringify(meta)},
  items: ${JSON.stringify(parts)},
};
`;
  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`${count} → ${OUT} (${Math.round(body.length / 1024)}KB)`);
})().catch(e => { console.error(e); process.exit(1); });
