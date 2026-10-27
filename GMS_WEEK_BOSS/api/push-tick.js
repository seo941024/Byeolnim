/* =============================================
   api/push-tick.js — 보스 알림 발송 (외부 크론이 주기적으로 호출)

   Vercel 무료 플랜의 크론은 하루 1회가 한계라 여기에 쓸 수 없다.
   그래서 cron-job.org 같은 무료 크론 서비스가 이 주소를 1~5분마다 부르게 한다.

     GET /api/push-tick?secret=<CRON_SECRET>
     또는 Authorization: Bearer <CRON_SECRET>

   하는 일: 저장된 구독들을 훑어 "보낼 때가 된" 알림만 골라 발송하고, 보낸 항목은
   목록에서 지운다(= 지웠으므로 다시 보내지 않는다).

   ※ 크론이 몇 분 늦거나 한 번 걸러도 알림이 통째로 사라지면 안 되므로,
      정확히 그 순간이 아니라 "지난 GRACE분 이내"면 보낸다. 반대로 너무 오래
      지난 것은 이제 와서 알려봐야 의미가 없으니 조용히 버린다.
   ============================================= */
const { getRedis, bad, hasSecret, webPush, readSub, removeSub } = require('./_lib');

// 크론이 밀리거나 한 번 실패해도 놓치지 않도록 허용하는 지연(분)
const GRACE_MIN = 15;

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && !hasSecret(req, secret, true)) return bad(res, 401, 'unauthorized');

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return bad(res, 500, 'VAPID 키 미설정');

  const redis = getRedis();
  if (!redis) return bad(res, 500, 'Redis 미설정');

  const webpush = webPush();

  const now = Date.now();
  const graceMs = GRACE_MIN * 60 * 1000;

  let ids = [];
  try { ids = (await redis.smembers('push:subs')) || []; } catch { ids = []; }

  let sent = 0, failed = 0, dropped = 0, pruned = 0;

  for (const id of ids) {
    const rec = await readSub(redis, id);
    if (!rec || !rec.sub || !Array.isArray(rec.items)) continue;

    const due = [];
    const keep = [];
    let late = 0;
    for (const it of rec.items) {
      if (it.at > now) { keep.push(it); continue; }          // 아직 멀었다
      if (now - it.at <= graceMs) { due.push(it); continue; } // 보낼 때가 됐다
      late++;                                                // 너무 늦어 버린다
    }
    dropped += late;
    let gone = false;   // 만료돼서 지운 구독은 아래에서 다시 저장하면 안 된다

    for (const it of due) {
      try {
        /* 보스 알림은 시각이 생명이라 urgency를 high로 준다. 기본값(normal)이면
           푸시 서비스가 배터리를 아끼려 전송을 미뤄서, 폰을 켤 때까지 안 오다가
           한꺼번에 도착하는 일이 생긴다.
           TTL은 GRACE와 맞춰 15분 — 그보다 늦게 도착하는 보스 알림은 의미가 없다. */
        await webpush.sendNotification(rec.sub, JSON.stringify({
          title: it.title,
          body: it.body,
          tag: 'boss-' + it.id,   // 같은 일정이 겹쳐 오면 하나로 합쳐진다
          url: '/',
        }), { urgency: 'high', TTL: GRACE_MIN * 60 });
        sent++;
      } catch (e) {
        failed++;
        // 404/410 = 구독이 만료됐거나 사용자가 알림을 끈 것 → 더 보낼 이유가 없다
        const code = e && e.statusCode;
        if (code === 404 || code === 410) {
          gone = true;
          try { await removeSub(redis, id, rec.userId); pruned++; }
          catch { /* 지우는 것도 실패하면 다음 tick에서 다시 시도된다 */ }
          break;
        }
      }
    }

    // 보낸 것과 너무 늦은 것을 빼고 남은 것만 저장한다.
    // 이 저장이 실패해도(예: 쓰기 권한 문제) 이번 구독자 처리만 실패로 남기고
    // 나머지 구독자들은 계속 처리한다 — 여기서 죽으면 이후 구독자 전원이 못 받는다.
    if (!gone && (due.length || late)) {
      try {
        await redis.set('push:sub:' + id, JSON.stringify({ ...rec, items: keep }));
      } catch (e) {
        failed++;
      }
    }
  }

  res.status(200).json({ ok: true, subs: ids.length, sent, failed, dropped, pruned });
};
