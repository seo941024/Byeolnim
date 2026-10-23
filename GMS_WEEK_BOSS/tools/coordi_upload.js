/* 받은 층 데이터를 Vercel Blob에 올린다. 사이트(mixdye_layer.js)는 Blob 공개 주소에서 바로 받는다.

     BLOB_READ_WRITE_TOKEN=... node tools/coordi_upload.js

   - 올리는 것: 색인 index.json, 규칙 rules.json, 피부별 몸·머리 skins/*.json, 색인에 든 묶음 전부.
     남자 헤어·성형은 색인에서 빠져 올리지 않는다
   - Hobby 요금제 업로드 한도가 월 2,000건이라 이미 올린 파일은 기록(coordi_local/.uploaded.json)을 보고 건너뛴다.
     내용이 바뀐 파일만 다시 올린다
   - 다 올리면 사이트에 넣을 주소를 coordi_local/blob_base.txt에 남긴다 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ROOT, buildIndex } = require('./coordi_index');

const PREFIX = 'coordi/v270/';
const CONCURRENCY = 4;
const DONE_FILE = path.join(ROOT, '.uploaded.json');

(async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN이 없습니다');
  const { put } = require('@vercel/blob');

  const index = buildIndex();
  const skins = fs.readdirSync(path.join(ROOT, 'skins')).filter(f => f.endsWith('.json')).map(f => `skins/${f}`);
  const names = ['index.json', 'rules.json', ...skins, ...Object.keys(index).map(k => `${k}.json`)];
  const done = fs.existsSync(DONE_FILE) ? JSON.parse(fs.readFileSync(DONE_FILE, 'utf8')) : {};
  const hash = buf => crypto.createHash('sha1').update(buf).digest('hex');
  const todo = names.filter(n => done[n] !== hash(fs.readFileSync(path.join(ROOT, n))));
  console.log(`파일 ${names.length}개 중 올릴 것 ${todo.length}개`);

  let base = fs.existsSync(path.join(ROOT, 'blob_base.txt')) ? fs.readFileSync(path.join(ROOT, 'blob_base.txt'), 'utf8').trim() : '';
  let next = 0, ok = 0;
  const worker = async () => {
    while (next < todo.length) {
      const name = todo[next++];
      const buf = fs.readFileSync(path.join(ROOT, name));
      // 색인·규칙은 다시 올릴 수 있어 캐시를 짧게, 묶음은 길게 둔다
      const maxAge = name.includes('/') ? 30 * 86400 : 3600;
      for (let attempt = 0; ; attempt++) {
        try {
          const r = await put(PREFIX + name, buf, { access: 'public', addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: maxAge });
          base = r.url.slice(0, r.url.length - name.length);
          break;
        } catch (e) {
          console.log(`${name} 실패 ${attempt + 1}번째 · ${e.message}`);
          if (attempt >= 4) throw e;
          await new Promise(s => setTimeout(s, 5000 * (attempt + 1)));
        }
      }
      done[name] = hash(buf);
      fs.writeFileSync(DONE_FILE, JSON.stringify(done));
      if (++ok % 20 === 0 || ok === todo.length) console.log(`${ok}/${todo.length} 올림`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (base) fs.writeFileSync(path.join(ROOT, 'blob_base.txt'), base);
  console.log(`끝 · 사이트 주소 ${base}`);
})().catch(e => { console.error(e); process.exit(1); });
