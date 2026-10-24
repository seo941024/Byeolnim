/* 받은 층 데이터를 사이트 폴더 GMS_WEEK_BOSS/coordi/v270/으로 옮긴다. 커밋·푸시하면 정적 파일로 배포된다.

     node tools/coordi_publish.js

   - 옮기는 것: 색인 index.json, 규칙 rules.json, coordi_local의 데이터 폴더 전부. 수집 기록 같은 파일은 옮기지 않는다
   - 색인은 coordi_index.js로 새로 만든 뒤 옮긴다
   - 내용이 같은 파일은 건너뛰고, 바뀐 파일 수를 알려 준다
   - 2026-10-24 Vercel Blob 업로드에서 바꿨다. Blob은 업로드 한도와 토큰 입력이 필요했다 */

const fs = require('fs');
const path = require('path');
const { ROOT, buildIndex } = require('./coordi_index');

const DEST = path.join(__dirname, '..', 'coordi', 'v270');

buildIndex();
const names = ['index.json', 'rules.json'];
for (const dir of fs.readdirSync(ROOT).sort()) {
  if (!fs.statSync(path.join(ROOT, dir)).isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.json')).sort()) names.push(`${dir}/${f}`);
}

let changed = 0;
for (const name of names) {
  const src = fs.readFileSync(path.join(ROOT, name));
  const dst = path.join(DEST, name);
  if (fs.existsSync(dst) && src.equals(fs.readFileSync(dst))) continue;
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, src);
  changed++;
}
console.log(`파일 ${names.length}개 중 바뀐 것 ${changed}개 · ${path.relative(process.cwd(), DEST)}`);
