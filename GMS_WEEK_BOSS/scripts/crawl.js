/* GMS_WEEK_BOSS/scripts/crawl.js
   GitHub Actions에서 실행 — 넥슨 API fetch → Redis 저장
*/
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

async function fetchPage(reg, type, reboot, page) {
  try {
    const url = `${NEXON_BASE}/${reg}?type=${type}&id=weekly&reboot_index=${reboot}&page_index=${page}`;
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return [];
    const d = await r.json();
    return d.ranks || [];
  } catch { return []; }
}

async function crawlType(reg, type, reboot, maxPages = 300, concurrency = 15) {
  const result = {};
  for (let start = 1; start <= maxPages; start += concurrency) {
    const pages = [];
    for (let p = start; p < start + concurrency && p <= maxPages; p++) pages.push(p);
    const batches = await Promise.all(pages.map(p => fetchPage(reg, type, reboot, p)));
    let anyResult = false;
    for (const ranks of batches) {
      if (ranks.length === 0) continue;
      anyResult = true;
      for (const c of ranks) {
        const key = (c.characterName || '').toLowerCase();
        if (!key) continue;
        result[key] = result[key] || {};
        if (type === 'world')  result[key].worldRank    = c.rank;
        if (type === 'job')    result[key].jobRankWorld  = c.rank;
        if (type === 'legion') {
          result[key].legionRank  = c.rank;
          result[key].legionLevel = c.legionLevel || c.unionLevel || 0;
          result[key].legionPower = c.legionPower || c.legionCombatPower || c.combatPower || 0;
        }
        if (type === 'overall') {
          result[key].worldRank = c.rank;
          result[key].worldID   = c.worldID;
          result[key].world     = c.worldName || '';
          result[key].job       = c.jobName   || '';
        }
      }
    }
    if (!anyResult) break;
    console.log(`  ${reg}/${type}/reboot=${reboot} — ${start}~${start + concurrency - 1}페이지 완료`);
  }
  return result;
}

function merge(base, patch) {
  for (const [k, v] of Object.entries(patch)) {
    base[k] = Object.assign(base[k] || {}, v);
  }
}

async function main() {
  console.log('=== GMS 랭킹 크롤러 시작 ===');

  const MAX = 300;

  const [naWorld0, naWorld1, naJob0, naJob1, naLegion,
         euWorld0, euWorld1, euJob0,  euJob1,  euLegion] = await Promise.all([
    crawlType('na', 'overall', 0, MAX),
    crawlType('na', 'overall', 1, MAX),
    crawlType('na', 'job',     0, MAX),
    crawlType('na', 'job',     1, MAX),
    crawlType('na', 'legion',  0, MAX),
    crawlType('eu', 'overall', 0, MAX),
    crawlType('eu', 'overall', 1, MAX),
    crawlType('eu', 'job',     0, MAX),
    crawlType('eu', 'job',     1, MAX),
    crawlType('eu', 'legion',  0, MAX),
  ]);

  const naData = {};
  merge(naData, naWorld0); merge(naData, naWorld1);
  merge(naData, naJob0);   merge(naData, naJob1);
  merge(naData, naLegion);

  const euData = {};
  merge(euData, euWorld0); merge(euData, euWorld1);
  merge(euData, euJob0);   merge(euData, euJob1);
  merge(euData, euLegion);

  console.log(`크롤링 완료: NA ${Object.keys(naData).length}명, EU ${Object.keys(euData).length}명`);

  if (Object.keys(naData).length === 0 && Object.keys(euData).length === 0) {
    console.error('데이터 없음 → 종료');
    process.exit(1);
  }

  const ts = Date.now();
  const pipe = redis.pipeline();

  for (const [name, data] of Object.entries(naData)) {
    pipe.set(`rnk:na:${name}`, JSON.stringify({ ...data, ts }), { ex: 60 * 60 * 25 });
  }
  for (const [name, data] of Object.entries(euData)) {
    pipe.set(`rnk:eu:${name}`, JSON.stringify({ ...data, ts }), { ex: 60 * 60 * 25 });
  }

  await pipe.exec();
  console.log('Redis 저장 완료!');
}

main().catch(e => { console.error(e); process.exit(1); });