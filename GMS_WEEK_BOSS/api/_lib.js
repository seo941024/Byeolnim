/* =============================================
   api/_lib.js — 공통 로직 (nexon 조회 + Redis + 히스토리)
   여러 서버리스 함수에서 재사용.
   ============================================= */

const WORLD_NAMES = {
  1:'Bera', 19:'Scania', 17:'Aurora',   // NA 일반
  45:'Kronos', 46:'Hyperion',           // NA 리부트(Heroic)
  30:'Luna', 70:'Solis',                // EU
};
function worldName(id){ return WORLD_NAMES[id] || ('World #' + id); }

const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2';

/* nexon 랭킹에서 캐릭터 1명 조회 */
async function lookupCharacter(name, reboot, region) {
  const reg = region === 'eu' ? 'eu' : 'na';
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

  // 1) overall 랭킹 (레벨·exp·직업·이미지·월드)
  const overallUrl = `${NEXON_BASE}/${reg}?type=overall&id=weekly&reboot_index=${reboot ? 1 : 0}`
                   + `&page_index=1&character_name=${encodeURIComponent(name)}`;
  const r = await fetch(overallUrl, { headers });
  if (!r.ok) throw new Error('Nexon 응답 오류 ' + r.status);
  const data = await r.json();
  if (!data.ranks || data.ranks.length === 0) return null;

  const lc  = name.toLowerCase();
  const hit = data.ranks.find(c => (c.characterName||'').toLowerCase() === lc) || data.ranks[0];

  // 2) legion / world / job 랭킹 병렬 조회 — 실패해도 무시
  let legionLevel = hit.legionLevel || 0;
  let legionPower = 0, legionRank = 0;
  let worldRank = 0, jobRankWorld = 0, jobRankGMS = 0;

  const ri = reboot ? 1 : 0;
  const fetchRank = (type, rb) =>
    fetch(`${NEXON_BASE}/${reg}?type=${type}&id=weekly&reboot_index=${rb}&page_index=1&character_name=${encodeURIComponent(name)}`, { headers })
      .then(r => r.ok ? r.json() : null).catch(() => null);

  const [ld, wd, jd, jgd] = await Promise.all([
    fetchRank('legion', 0),
    fetchRank('world', ri),
    fetchRank('job',   ri),
    fetchRank('job',   ri),   // GMS-wide job rank는 world 파라미터 없이 same endpoint
  ]);

  if (ld) {
    const lhit = (ld.ranks || []).find(c => (c.characterName||'').toLowerCase() === lc);
    if (lhit) {
      legionLevel = lhit.legionLevel || lhit.legion_level || lhit.unionLevel || legionLevel;
      legionPower = lhit.legionPower || lhit.legionCombatPower || lhit.legion_power || lhit.unionPower || lhit.combatPower || 0;
      legionRank  = lhit.rank || lhit.legionRank || 0;
    }
  }
  if (wd) {
    const whit = (wd.ranks || []).find(c => (c.characterName||'').toLowerCase() === lc);
    if (whit) worldRank = whit.rank || 0;
  }
  if (jd) {
    const jhit = (jd.ranks || []).find(c => (c.characterName||'').toLowerCase() === lc);
    if (jhit) jobRankWorld = jhit.rank || 0;
  }

  return {
    name:         hit.characterName,
    level:        hit.level,
    exp:          hit.exp,
    job:          hit.jobName,
    world:        worldName(hit.worldID),
    worldID:      hit.worldID,
    rank:         hit.rank,
    worldRank,
    jobRankWorld,
    legion:       legionLevel,
    legionPower,
    legionRank,
    img:          hit.characterImgURL || '',
    reboot:       !!reboot,
    region:       region === 'eu' ? 'EU' : 'NA',
  };
}

/* 프론트 histKeyOf 와 동일한 규칙으로 키 생성 */
function histKey(name, region, reboot) {
  return `${(region||'na').toLowerCase()}_${reboot ? 'r' : 'n'}_${(name||'').toLowerCase()}`;
}

/* 오늘 날짜 (UTC 기준 YYYY-MM-DD) */
function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;
}

/* Redis 클라이언트 (환경변수 없으면 null) */
let _redis = null;
function getRedis() {
  if (_redis !== null) return _redis;
  try {
    const { Redis } = require('@upstash/redis');
    _redis = Redis.fromEnv();
  } catch (e) {
    _redis = false;   // 사용 불가
  }
  return _redis || null;
}

/* 스냅샷 1건을 히스토리에 누적 (같은 날은 갱신, 최근 180개 유지) */
async function pushSnapshot(redis, key, snap) {
  let arr = [];
  const raw = await redis.get('hist:' + key);
  if (raw) arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(arr)) arr = [];
  const last = arr[arr.length - 1];
  if (last && last.date === snap.date) arr[arr.length - 1] = snap;
  else if (!last || last.exp !== snap.exp || last.level !== snap.level || last.img !== snap.img) arr.push(snap);
  arr = arr.slice(-180);
  await redis.set('hist:' + key, JSON.stringify(arr));
  return arr;
}

module.exports = { worldName, lookupCharacter, histKey, todayStr, getRedis, pushSnapshot };
