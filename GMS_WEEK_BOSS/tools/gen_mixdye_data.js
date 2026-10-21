/* data_mixdye.js를 만드는 스크립트.

   새 헤어·성형이 추가되면(maplestory.io 데이터 버전이 오르면) VERSION을 바꾸고 다시 돌리면 된다:

     node tools/gen_mixdye_data.js

   maplestory.io의 GMS 아이템 목록에서 여자 헤어·성형만 추려 GMS_WEEK_BOSS/data_mixdye.js를 덮어쓴다.
   한국 서버 이름은 같은 ID의 KMS 아이템 이름을 붙인 것이다(번역이 아니라 KMS 원문).

   성별 판정:
   - 데이터의 requiredGender가 1이면 여자
   - 2(공용)로 찍혀 있어도 원래 여자 번호대(헤어 31000·41000·61000, 성형 21000·51000)면 여자
   - 헤어 32000·39000·42000, 성형 22000번대는 남녀가 섞여 있어 "성별 미확인"으로 따로 표시 */

const fs = require('fs');
const path = require('path');

const VERSION = '270';
const KMS_VERSION = '389';
const OUT = path.join(__dirname, '..', 'data_mixdye.js');
const API = 'https://maplestory.io/api';
const listUrl = (region, ver, sub) =>
  `${API}/${region}/${ver}/item/?&categoryFilter=Character&overallCategoryFilter=Equip&subCategoryFilter=${sub}`;

const PARTS = {
  hair: {
    sub: 'Hair',
    // 헤어는 일의 자리가 색
    styleOf: id => id - (id % 10),
    colorOf: id => id % 10,
    colors: 8,
    female: new Set([31, 41, 61]),
    male: new Set([30, 40, 60]),
    mixed: new Set([32, 39, 42]),
    enPrefix: /^(Black|Red|Orange|Blonde|Blond|Yellow|Green|Blue|Purple|Brown)\s+/i,
    koPrefix: /^(검은색|검정색|빨간색|빨강색|주황색|노란색|노랑색|초록색|파란색|파랑색|보라색|갈색)\s*/,
  },
  face: {
    sub: 'Face',
    // 성형은 백의 자리가 렌즈 색
    styleOf: id => id - (Math.floor(id / 100) % 10) * 100,
    colorOf: id => Math.floor(id / 100) % 10,
    colors: 9,
    female: new Set([21, 51]),
    male: new Set([20, 50]),
    mixed: new Set([22]),
    enPrefix: null,
    koPrefix: null,
  },
};

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'byeolnim-mixdye-data' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// sex: 1 여자, 0 남자. 남녀가 섞인 번호대(mixed)는 양쪽 목록에 '성별 미확인'으로 들어간다
async function build(key, sex) {
  const P = PARTS[key];
  const gms = await getJson(listUrl('GMS', VERSION, P.sub));
  const kms = await getJson(listUrl('KMS', KMS_VERSION, P.sub));

  const koNames = new Map();
  for (const x of kms) {
    const s = P.styleOf(x.id);
    let name = (x.name || '').trim();
    if (P.koPrefix) name = name.replace(P.koPrefix, '');
    if (name && (!koNames.has(s) || x.id === s)) koNames.set(s, name);
  }

  const styles = new Map();
  for (const x of gms) {
    const s = P.styleOf(x.id);
    if (!styles.has(s)) styles.set(s, new Map());
    styles.get(s).set(P.colorOf(x.id), x);
  }

  const rows = [];
  for (const [s, colors] of styles) {
    const sample = colors.get(0) || colors.values().next().value;
    const gender = sample.requiredGender;
    const bucket = Math.floor(s / 1000);
    let flag;
    const own = sex === 1 ? P.female : P.male;
    if (gender === sex || (gender === 2 && own.has(bucket))) flag = 0;
    else if (gender === 2 && P.mixed.has(bucket)) flag = 1;
    else continue;
    let en = (sample.name || '').trim();
    if (P.enPrefix) en = en.replace(P.enPrefix, '').trim();
    let mask = 0;
    for (const c of colors.keys()) if (c < P.colors) mask |= 1 << c;
    if (!mask) continue;
    rows.push([s, en, koNames.get(s) || '', mask, flag]);
  }
  rows.sort((a, b) => b[0] - a[0]);
  return rows;
}

(async () => {
  const hairs = await build('hair', 1);
  const faces = await build('face', 1);
  const hairsM = await build('hair', 0);
  const facesM = await build('face', 0);
  const count = rows => `${rows.filter(r => !r[4]).length}종(+성별 미확인 ${rows.filter(r => r[4]).length}종)`;
  const body =
`/* 믹스염색 시뮬레이터 목록 — tools/gen_mixdye_data.js가 만든 파일이라 손으로 고치지 말 것.
   maplestory.io GMS v${VERSION} 기준 여자 헤어 ${count(hairs)}, 여자 성형 ${count(faces)},
   남자 헤어 ${count(hairsM)}, 남자 성형 ${count(facesM)}.
   각 줄: [대표 ID, 영문 이름, 한국 서버 이름, 보유 색 비트, 성별 미확인 여부] */
window.MIXDYE_DATA = {
  version: '${VERSION}',
  hairs: ${JSON.stringify(hairs)},
  faces: ${JSON.stringify(faces)},
  hairsM: ${JSON.stringify(hairsM)},
  facesM: ${JSON.stringify(facesM)},
};
`;
  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`여자 헤어 ${count(hairs)}, 성형 ${count(faces)} · 남자 헤어 ${count(hairsM)}, 성형 ${count(facesM)} → ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
