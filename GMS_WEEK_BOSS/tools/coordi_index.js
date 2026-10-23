/* 받은 층 묶음에서 "아이템 ID → 묶음" 색인을 만든다. 사이트는 이 색인으로 아이템이 든 묶음 하나만 받는다.

     node tools/coordi_index.js        GMS_Calc/coordi_local/index.json 저장

   - 수집이 진행되면 다시 돌려서 새 묶음을 넣는다
   - 남자 헤어·성형 묶음은 넣지 않는다. 남자 캐릭터는 maplestory.io 렌더로 그려서 쓰지 않고,
     성별 미확인 헤어처럼 여자 묶음에도 있는 아이템이 남자 묶음을 가리키지 않게 한다
   - 형식: { 묶음 이름: [첫 ID, 이어지는 ID와의 차이...] }. 차이로 적어 크기를 줄인다
   - coordi_upload.js가 buildIndex로 같은 색인을 만들어 올린다 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.COORDI_LOCAL_DIR || path.join(__dirname, '..', '..', 'coordi_local');
const SKIP_PARTS = ['hair_m', 'face_m'];

function buildIndex() {
  const index = {};
  let count = 0;
  for (const part of fs.readdirSync(ROOT).sort()) {
    const dir = path.join(ROOT, part);
    if (SKIP_PARTS.includes(part) || !fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
      const ids = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).items.map(x => x.i).sort((a, b) => a - b);
      index[`${part}/${f.slice(0, -5)}`] = ids.map((id, k) => k ? id - ids[k - 1] : id);
      count += ids.length;
    }
  }
  const body = JSON.stringify(index);
  fs.writeFileSync(path.join(ROOT, 'index.json'), body);
  console.log(`index.json · 묶음 ${Object.keys(index).length}개 · 아이템 ${count}개 · ${Math.round(body.length / 1024)}KB`);
  return index;
}

if (require.main === module) buildIndex();
module.exports = { ROOT, buildIndex };
