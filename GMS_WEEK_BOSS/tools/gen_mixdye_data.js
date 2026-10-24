/* data_mixdye.js를 만드는 스크립트.

   보통은 tools/coordi_update.js가 최신 버전을 환경 변수로 넘겨 부른다. 직접 돌릴 수도 있다:

     node tools/gen_mixdye_data.js

   maplestory.io의 GMS 아이템 목록에서 남녀 헤어·성형과 피부를 추려 GMS_WEEK_BOSS/data_mixdye.js를 덮어쓴다.
   한국 서버 이름은 같은 ID의 KMS 아이템 이름을 붙인 것이다(번역이 아니라 KMS 원문).

   성별 판정:
   - 데이터의 requiredGender가 1이면 여자
   - 2(공용)로 찍혀 있어도 원래 여자 번호대(헤어 31000·41000·61000, 성형 21000·51000)면 여자
   - 헤어 32000·39000·42000, 성형 22000번대는 남녀가 섞여 있어 "성별 미확인"으로 따로 표시 */

const fs = require('fs');
const path = require('path');

// 버전은 tools/coordi_update.js가 maplestory.io 최신 버전을 넘겨 준다. 직접 돌리면 아래 값
const VERSION = process.env.GMS_VERSION || '270';
const KMS_VERSION = process.env.KMS_VERSION || '389';
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

// 목록 요청은 크고 서버 오류가 잦아서 받을 때까지 다시 요청한다
async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'byeolnim-mixdye-data' } });
      if (r.ok) return await r.json();
      if (r.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (e.fatal) throw e;   // 주소가 틀린 것이라 다시 요청해도 소용없다
      console.log(`요청 오류 ${attempt + 1}번째 · ${e.message} · ${url}`);
      await new Promise(res => setTimeout(res, Math.min(5000 * (attempt + 1), 60000)));
    }
  }
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
  // KMS 데이터에 아직 없는 커스텀 피부의 한국 이름
  const SKIN_KO = { 12042: '커스텀 뽀송 라벤더 컬러라인 피부', 12043: '커스텀 홍조 라벤더 컬러라인 피부' };
  // 피부: 머리(Head) ID 목록. 몸 ID는 머리 ID - 10000
  const kmsHead = new Map((await getJson(listUrl('KMS', KMS_VERSION, 'Head'))).map(x => [x.id, (x.name || '').trim()]));
  const skins = (await getJson(listUrl('GMS', VERSION, 'Head')))
    .filter(x => x.name)
    .map(x => [x.id, x.name.trim(), kmsHead.get(x.id) || SKIN_KO[x.id] || ''])
    .sort((a, b) => a[0] - b[0]);
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
  skins: ${JSON.stringify(skins)},
};
`;
  fs.writeFileSync(OUT, body, 'utf8');
  console.log(`여자 헤어 ${count(hairs)}, 성형 ${count(faces)} · 남자 헤어 ${count(hairsM)}, 성형 ${count(facesM)} → ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
