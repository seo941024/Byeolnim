/* =============================================
   api/_lib.js — 공통 로직 (nexon 조회 + Redis + 히스토리)
   여러 서버리스 함수에서 재사용.
   ============================================= */

/* 넥슨 공식 server-status API(worldId 필드)로 실측 확인한 값.
   기존에 Hyperion(46)/Solis(70)가 서로 뒤바뀌어 있었음 — 실제는 Hyperion=70(NA), Solis=46(EU) */
const WORLD_NAMES = {
  1:'Bera', 19:'Scania',   // NA 일반
  45:'Kronos', 70:'Hyperion',           // NA 리부트(Heroic)
  30:'Luna', 46:'Solis',                // EU
};
function worldName(id){ return WORLD_NAMES[id] || ('World #' + id); }

const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/ranking/v2';

/* nexon 랭킹에서 캐릭터 1명 조회
   ※ 공개 랭킹 API v2는 type=overall만 실제 데이터를 반환한다.
      legion/world/job은 totalCount만 크게 주고 ranks는 항상 빈 배열 → 조회하지 않는다. */
async function lookupCharacter(name, reboot, region) {
  const reg = region === 'eu' ? 'eu' : 'na';
  const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  const lc = name.toLowerCase();

  // 1) overall 랭킹 — reboot 0/1 둘 다 시도해서 찾음
  const fetchOverall = (rb) =>
    fetch(`${NEXON_BASE}/${reg}?type=overall&id=weekly&reboot_index=${rb}&page_index=1&character_name=${encodeURIComponent(name)}`, { headers })
      .then(r => r.ok ? r.json() : null).catch(() => null);

  const [od0, od1] = await Promise.all([fetchOverall(0), fetchOverall(1)]);
  const findHit = (d) => d && d.ranks && d.ranks.find(c => (c.characterName||'').toLowerCase() === lc);
  let hit = findHit(od0) || findHit(od1);
  if (!hit) {
    // fallback: 첫 번째 결과라도
    hit = (od0 && od0.ranks && od0.ranks[0]) || (od1 && od1.ranks && od1.ranks[0]);
  }
  if (!hit) return null;

  return {
    name:         hit.characterName,
    level:        hit.level,
    exp:          hit.exp,
    job:          hit.jobName,
    world:        worldName(hit.worldID),
    worldID:      hit.worldID,
    rank:         hit.rank,
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

/* 관리자 여부 — auth.js에서 쓰던 걸 여기로 옮겨서 community.js와 같이 쓴다.
   ADMIN_IDS 환경변수(쉼표 구분)에 있는 아이디만 관리자다. */
function isAdminId(id) {
  return String(process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .includes(id);
}

/* 계정에 연결된 모든 기기로 즉시 푸시한다. 예약 보스 알림과 달리 커뮤니티
   알림은 댓글이 달린 그 순간 보내야 하므로, 만료 구독 정리까지 여기서 공용으로
   처리한다. 발송 실패는 글/댓글 작성 자체를 막지 않는다. */
async function sendPushToUsers(redis, userIds, payload) {
  const users = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!users.length || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { sent: 0, failed: 0 };

  const webpush = require('web-push');
  webpush.setVapidDetails('mailto:seo941024@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  let sent = 0, failed = 0;

  for (const uid of users) {
    let ids = [];
    try { ids = (await redis.smembers('push:user:' + uid)) || []; } catch { continue; }
    for (const id of ids) {
      let rec = null;
      try {
        const raw = await redis.get('push:sub:' + id);
        rec = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      } catch { rec = null; }
      // 로그아웃/기기 교체로 연결이 바뀐 낡은 인덱스는 발견하는 즉시 정리한다.
      if (!rec || !rec.sub || rec.userId !== uid) {
        try { await redis.srem('push:user:' + uid, id); } catch {}
        continue;
      }
      try {
        await webpush.sendNotification(rec.sub, JSON.stringify(payload), { urgency: 'normal', TTL: 24 * 60 * 60 });
        sent++;
      } catch (e) {
        failed++;
        const code = e && e.statusCode;
        if (code === 404 || code === 410) {
          try {
            await redis.srem('push:subs', id);
            await redis.srem('push:user:' + uid, id);
            await redis.del('push:sub:' + id);
          } catch {}
        }
      }
    }
  }
  return { sent, failed };
}

module.exports = { worldName, lookupCharacter, histKey, todayStr, getRedis, pushSnapshot, isAdminId, sendPushToUsers };
