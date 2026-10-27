/* 받은 층 묶음에서 "아이템 ID → 묶음" 색인을 만든다. 사이트는 이 색인으로 아이템이 든 묶음 하나만 받는다.
   coordi_local 위치, 사이트 데이터 읽기, 아이템 층 변환, 목록 요청처럼 코디 도구들이 같이 쓰는 것도 여기 둔다.

     node tools/coordi_index.js        GMS_Calc/coordi_local/index.json 저장

   - 수집이 진행되면 다시 돌려서 새 묶음을 넣는다
   - 남자 헤어·성형 묶음도 넣는다. 성별 미확인 헤어처럼 양쪽 묶음에 있는 아이템은 나중 묶음을 가리킨다
   - 형식: { 묶음 이름: [첫 ID, 이어지는 ID와의 차이...] }. 차이로 적어 크기를 줄인다
   - coordi_publish.js가 buildIndex로 같은 색인을 만들어 사이트 폴더로 옮긴다 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.COORDI_LOCAL_DIR || path.join(__dirname, '..', '..', 'coordi_local');
const UA = 'byeolnim-coordi-collector (+https://byeolnim.vercel.app)';
const VIEWS = ['stand1', 'ladder'];
// skins: 피부별 몸·머리 그림이라 아이템 묶음이 아니다. 사이트가 피부 ID로 바로 받는다
const SKIP_PARTS = ['skins'];

// data_mixdye.js·data_coordi.js는 window에 값을 넣는 브라우저용 파일이라 window를 넘겨 실행해 읽는다
function loadSiteData(file) {
  const window = {};
  new Function('window', fs.readFileSync(path.join(__dirname, '..', file), 'utf8'))(window);
  return window;
}

/* maplestory.io 아이템 응답 → 층 데이터. stand1 앞모습·ladder 뒷모습의 첫 프레임 층만 남긴다.
   층: [z 이름, 기준점 x, y, 붙는 자리 {이름: [x, y]}, PNG base64] */
function toLayerItem(id, d) {
  const fb = d.frameBooks || {};
  const out = { i: id, n: (d.description && d.description.name) || '', v: (d.metaInfo && d.metaInfo.vslots) || [], s: (d.metaInfo && d.metaInfo.islots) || [], f: {} };
  for (const view of VIEWS) {
    const book = fb[view] || fb.default;
    const frame = book && book.frames && book.frames[0];
    if (!frame || !frame.effects) continue;
    const ls = [];
    for (const v of Object.values(frame.effects)) {
      if (!v.position || !v.image) continue;
      const map = {};
      for (const [k, m] of Object.entries(v.mapOffset || {})) map[k] = [m.x, m.y];
      ls.push([v.position, v.origin.x, v.origin.y, map, v.image]);
    }
    if (ls.length) out.f[view] = ls;
  }
  return out;
}

// 목록 요청은 크고 서버 오류가 잦아서 받을 때까지 다시 요청한다. gen_mixdye_data.js·gen_coordi_data.js용
async function getListJson(url, ua) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': ua } });
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
module.exports = { ROOT, UA, VIEWS, loadSiteData, toLayerItem, getListJson, buildIndex };
