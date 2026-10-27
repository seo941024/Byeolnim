/* =============================================
   api/_lib.js — 공통 로직: nexon 조회, Redis, 히스토리, 응답·푸시 도우미
   여러 서버리스 함수에서 재사용. 이름이 _로 시작해 Vercel 함수 개수에 들지 않는다.
   패키지는 파일 맨 위가 아니라 쓰는 함수 안에서 require한다 — 쓰지 않는 함수의 패키지까지
   모든 함수가 시작할 때마다 읽지 않게.
   ============================================= */

/* 넥슨 공식 server-status API(worldId 필드)로 실측 확인한 값.
   기존에 Hyperion(46)/Solis(70)가 서로 뒤바뀌어 있었음 — 실제는 Hyperion=70(NA), Solis=46(EU) */
const WORLD_NAMES = {
  1:'Bera', 19:'Scania',   // NA 일반
  45:'Kronos', 70:'Hyperion',           // NA 리부트(Heroic)
  30:'Luna', 46:'Solis',                // EU
};
function worldName(id){ return WORLD_NAMES[id] || ('World #' + id); }

const NEXON_API = 'https://www.nexon.com/api/maplestory/no-auth';
const NEXON_HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

/* 실패 응답은 모두 { ok:false, error, ...extra } 모양 */
function bad(res, code, msg, extra) { res.status(code).json({ ok: false, error: msg, ...extra }); }

/* 본문이 문자열로 올 때도 있어 한 번 더 푼다. 못 풀면 null */
function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  return body;
}

/* Authorization: Bearer <secret>. allowQuery면 ?secret=<secret>도 받는다 */
function hasSecret(req, secret, allowQuery) {
  if ((req.headers['authorization'] || '') === `Bearer ${secret}`) return true;
  return !!allowQuery && ((req.query && req.query.secret) || '') === secret;
}

/* nexon 랭킹에서 캐릭터 1명 조회
   ※ 공개 랭킹 API v2는 type=overall만 실제 데이터를 반환한다.
      legion/world/job은 totalCount만 크게 주고 ranks는 항상 빈 배열 → 조회하지 않는다. */
async function lookupCharacter(name, reboot, region) {
  const reg = region === 'eu' ? 'eu' : 'na';
  const lc = name.toLowerCase();

  // overall 랭킹 — reboot 0/1 둘 다 시도해서 찾음
  const fetchOverall = (rb) =>
    fetch(`${NEXON_API}/ranking/v2/${reg}?type=overall&id=weekly&reboot_index=${rb}&page_index=1&character_name=${encodeURIComponent(name)}`, { headers: NEXON_HEADERS })
      .then(r => r.ok ? r.json() : null).catch(() => null);

  const [od0, od1] = await Promise.all([fetchOverall(0), fetchOverall(1)]);
  const findHit = (d) => d && d.ranks && d.ranks.find(c => (c.characterName||'').toLowerCase() === lc);
  const first = (d) => d && d.ranks && d.ranks[0];
  // 이름이 정확히 같은 캐릭터가 없으면 첫 번째 결과라도
  const hit = findHit(od0) || findHit(od1) || first(od0) || first(od1);
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
    region:       reg.toUpperCase(),
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

/* Redis 클라이언트 (환경변수 없으면 null)
   Redis.fromEnv()는 주소가 없어도 경고만 찍고 객체를 만들어서, 그대로 두면
   요청마다 연결 재시도로 몇 초를 끈 뒤 실패한다. 그래서 주소부터 직접 본다. */
let _redis = null;
function getRedis() {
  if (_redis !== null) return _redis || null;
  if (!process.env.UPSTASH_REDIS_REST_URL && !process.env.KV_REST_API_URL) { _redis = false; return null; }
  try {
    const { Redis } = require('@upstash/redis');
    _redis = Redis.fromEnv();
  } catch (e) {
    _redis = false;   // 사용 불가
  }
  return _redis || null;
}

/* @upstash/redis가 JSON을 풀어 주지만 문자열로 남은 값도 푼다. 값이 없으면 fallback */
async function getJson(redis, key, fallback = null) {
  const raw = await redis.get(key);
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : fallback;
}

/* auth.js가 발급한 세션 토큰 → 아이디. 토큰이 없거나 만료됐으면 null */
/* @upstash/redis는 값을 JSON으로 풀어 주므로 숫자로만 된 아이디("1234")가 숫자 1234로 돌아온다.
   그러면 관리자 판정·작성자 비교·푸시 계정 색인 비교가 문자열과 어긋나므로 문자열로 맞춘다. */
async function uidOf(redis, token) {
  if (!token) return null;
  const uid = await redis.get('auth:tok:' + token);
  return uid == null ? null : String(uid);
}

/* 조회 결과 → 히스토리 스냅샷 1건 */
function snapshotOf(info) {
  return {
    date: todayStr(), ts: Date.now(), level: info.level,
    exp: Number(info.exp) || 0, img: info.img || '', job: info.job || '',
    rank: info.rank || 0, world: info.world || '',
  };
}

/* 스냅샷 1건을 히스토리에 누적 (같은 날은 갱신, 최근 180개 유지) */
async function pushSnapshot(redis, key, snap) {
  let arr = await getJson(redis, 'hist:' + key, []);
  if (!Array.isArray(arr)) arr = [];
  const last = arr[arr.length - 1];
  if (last && last.date === snap.date) arr[arr.length - 1] = snap;
  else if (!last || last.exp !== snap.exp || last.level !== snap.level || last.img !== snap.img) arr.push(snap);
  arr = arr.slice(-180);
  await redis.set('hist:' + key, JSON.stringify(arr));
  return arr;
}

/* 관리자 여부 — auth.js·community.js 공용.
   ADMIN_IDS 환경변수(쉼표 구분)에 있는 아이디만 관리자다. */
function isAdminId(id) {
  return String(process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .includes(id);
}

/* VAPID 키를 넣은 web-push. 키가 있는지는 부르는 쪽에서 먼저 본다 */
function webPush() {
  const webpush = require('web-push');
  webpush.setVapidDetails('mailto:seo941024@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return webpush;
}

/* 구독 레코드 push:sub:<id>. 깨진 값은 없는 것으로 본다 */
async function readSub(redis, id) {
  try { return await getJson(redis, 'push:sub:' + id); } catch { return null; }
}

/* 구독을 목록·계정 색인·본문에서 지운다. userId가 없으면 계정 색인은 건드리지 않는다 */
async function removeSub(redis, id, userId) {
  await redis.srem('push:subs', id);
  if (userId) await redis.srem('push:user:' + userId, id);
  await redis.del('push:sub:' + id);
}

/* 계정에 연결된 모든 기기로 즉시 푸시한다. 예약 보스 알림과 달리 커뮤니티
   알림은 댓글이 달린 그 순간 보내야 하므로, 만료 구독 정리까지 여기서 공용으로
   처리한다. 발송 실패는 글/댓글 작성 자체를 막지 않는다. */
async function sendPushToUsers(redis, userIds, payload) {
  const users = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!users.length || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { sent: 0, failed: 0 };

  const webpush = webPush();
  let sent = 0, failed = 0;

  for (const uid of users) {
    let ids = [];
    try { ids = (await redis.smembers('push:user:' + uid)) || []; } catch { continue; }
    for (const id of ids) {
      const rec = await readSub(redis, id);
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
          try { await removeSub(redis, id, uid); } catch {}
        }
      }
    }
  }
  return { sent, failed };
}

module.exports = {
  WORLD_NAMES, NEXON_API, NEXON_HEADERS, bad, parseBody, hasSecret,
  lookupCharacter, histKey, todayStr, getRedis, getJson, uidOf, snapshotOf, pushSnapshot,
  isAdminId, webPush, readSub, removeSub, sendPushToUsers,
};
