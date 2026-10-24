/* 코디 시뮬레이터 데이터 업데이트. 4주마다 GMS 캐시템 업데이트가 있은 뒤 한 번 돌린다.
   GMS_Calc/코디데이터_업데이트.cmd를 더블클릭하면 이 스크립트가 실행된다.

     node tools/coordi_update.js            maplestory.io에 새 GMS 버전이 있을 때만 진행
     node tools/coordi_update.js --force    버전이 같아도 진행. 새 아이템이 없으면 바뀌는 것도 없다

   순서
   1. maplestory.io의 GMS·KMS 최신 버전 확인. 그림까지 준비된 정수 버전만 본다. 205.2.0 같은 버전은 뺀다
   2. data_mixdye.js, data_coordi.js 목록 새로 만들기
   3. 새 아이템만 수집해 coordi_local에 새 묶음 번호로 붙이기
   4. 새 피부가 있으면 몸·머리 받기
   5. 색인 만들고 사이트 폴더로 복사, 목록 아이콘 다시 그리기
   6. 사이트가 새 파일을 받도록 캐시 버전 올리기
   7. 커밋·푸시. Vercel이 자동으로 배포한다
   중간에 실패하면 거기서 멈추고 커밋하지 않는다. 다시 실행하면 수집은 받은 데까지 이어서 한다 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SITE = path.join(__dirname, '..');
const REPO = path.join(SITE, '..');
const UA = 'byeolnim-coordi-collector (+https://byeolnim.vercel.app)';
const FORCE = process.argv.includes('--force');

const step = (n, msg) => console.log(`\n[${n}/7] ${msg}`);
function run(args, env = {}) {
  const r = spawnSync(process.execPath, args, { cwd: SITE, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${args.join(' ')} 실패`);
}
function git(...args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} 실패\n${r.stderr}`);
  return r.stdout.trim();
}
// 파일 안 한 곳을 바꾼다. 못 찾으면 멈춘다
function replaceIn(file, re, to) {
  const p = path.join(SITE, file), s = fs.readFileSync(p, 'utf8');
  if (!re.test(s)) throw new Error(`${file}에서 ${re} 를 못 찾음`);
  fs.writeFileSync(p, s.replace(re, to));
}

async function latestVersions() {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch('https://maplestory.io/api/wz', { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list = await r.json();
      const top = region => Math.max(...list.filter(x => x.region === region && x.isReady && x.hasImages && /^\d+$/.test(x.mapleVersionId)).map(x => Number(x.mapleVersionId)));
      const gms = top('GMS'), kms = top('KMS');
      if (!Number.isFinite(gms) || !Number.isFinite(kms)) throw Object.assign(new Error('버전 목록에서 GMS·KMS 버전을 못 찾음'), { fatal: true });
      return { gms: String(gms), kms: String(kms) };
    } catch (e) {
      if (e.fatal) throw e;
      console.log(`버전 확인 오류 ${attempt + 1}번째 · ${e.message}`);
      await new Promise(res => setTimeout(res, Math.min(5000 * (attempt + 1), 60000)));
    }
  }
}

(async () => {
  step(1, 'maplestory.io 최신 버전 확인');
  const now = fs.readFileSync(path.join(SITE, 'data_coordi.js'), 'utf8').match(/version: '(\d+)'/)[1];
  const { gms, kms } = await latestVersions();
  console.log(`지금 데이터 GMS v${now} · maplestory.io 최신 GMS v${gms}, KMS v${kms}`);
  if (gms === now && !FORCE) {
    console.log('\nmaplestory.io에 아직 새 GMS 버전이 없습니다. 하루 이틀 뒤 다시 실행해 주세요.');
    return;
  }
  const env = { GMS_VERSION: gms, KMS_VERSION: kms };

  step(2, `헤어·성형·코디 목록 새로 만들기 · GMS v${gms}`);
  run(['tools/gen_mixdye_data.js'], env);
  run(['tools/gen_coordi_data.js'], env);

  step(3, '새 아이템만 수집');
  run(['tools/coordi_collect.js', '--local', '--new'], { ...env, TIME_BUDGET_MIN: '100000' });

  step(4, '새 피부 몸·머리 받기');
  run(['tools/coordi_rules.js'], env);

  step(5, '색인·복사·목록 아이콘');
  run(['tools/coordi_publish.js']);
  run(['tools/coordi_icons.js']);

  step(6, '캐시 버전 올리기');
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  replaceIn('mixdye_layer.js', /const MX_LAYER_DATA_VER = '[^']*';/, `const MX_LAYER_DATA_VER = '${stamp}';`);
  replaceIn('mixdye.js', /data_coordi\.js\?v=[0-9a-z]+/, `data_coordi.js?v=${stamp}`);
  replaceIn('mixdye.js', /data_mixdye\.js\?v=[0-9a-z]+/, `data_mixdye.js?v=${stamp}`);
  replaceIn('index.html', /mixdye_layer\.js\?v=[0-9a-z]+/, `mixdye_layer.js?v=${stamp}`);
  replaceIn('index.html', /mixdye\.js\?v=[0-9a-z]+/, `mixdye.js?v=${stamp}`);
  console.log(`버전 ${stamp}`);

  step(7, '커밋·푸시');
  git('add', 'GMS_WEEK_BOSS/data_mixdye.js', 'GMS_WEEK_BOSS/data_coordi.js', 'GMS_WEEK_BOSS/coordi/v270',
    'GMS_WEEK_BOSS/mixdye.js', 'GMS_WEEK_BOSS/mixdye_layer.js', 'GMS_WEEK_BOSS/index.html');
  if (!git('diff', '--cached', '--name-only')) { console.log('바뀐 파일이 없어 커밋하지 않습니다.'); return; }
  git('commit', '-q', '-m', `코디 시뮬레이터 데이터 업데이트: GMS v${gms}`);
  git('push', 'origin', 'HEAD');
  console.log(`\n끝 · ${git('log', '--oneline', '-1')} · 몇 분 뒤 사이트에 반영됩니다.`);
})().catch(e => { console.error(`\n멈춤: ${e.message}`); process.exit(1); });
