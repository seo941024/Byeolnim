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
const { getRedis } = require('./_lib');

// 크론이 밀리거나 한 번 실패해도 놓치지 않도록 허용하는 지연(분)
const GRACE_MIN = 15;

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    const q = (req.query && req.query.secret) || '';
    if (auth !== `Bearer ${secret}` && q !== secret) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }
  }

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    res.status(500).json({ ok: false, error: 'VAPID 키 미설정' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ ok: false, error: 'Redis 미설정' });
    return;
  }

  const webpush = require('web-push');
  webpush.setVapidDetails('mailto:seo941024@gmail.com', pub, priv);

  const now = Date.now();
  const graceMs = GRACE_MIN * 60 * 1000;

  let ids = [];
  try { ids = (await redis.smembers('push:subs')) || []; } catch { ids = []; }

  let sent = 0, failed = 0, dropped = 0, pruned = 0;

  for (const id of ids) {
    let rec = null;
    try {
      const raw = await redis.get('push:sub:' + id);
      rec = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { rec = null; }
    if (!rec || !rec.sub || !Array.isArray(rec.items)) continue;

    const due = [];
    const keep = [];
    for (const it of rec.items) {
      if (it.at > now) { keep.push(it); continue; }          // 아직 멀었다
      if (now - it.at <= graceMs) { due.push(it); continue; } // 보낼 때가 됐다
      dropped++;                                             // 너무 늦어 버린다
    }

    for (const it of due) {
      try {
        await webpush.sendNotification(rec.sub, JSON.stringify({
          title: it.title,
          body: it.body,
          tag: 'boss-' + it.id,   // 같은 일정이 겹쳐 오면 하나로 합쳐진다
          url: '/',
        }));
        sent++;
      } catch (e) {
        failed++;
        // 404/410 = 구독이 만료됐거나 사용자가 알림을 끈 것 → 더 보낼 이유가 없다
        const code = e && e.statusCode;
        if (code === 404 || code === 410) {
          await redis.srem('push:subs', id);
          await redis.del('push:sub:' + id);
          pruned++;
          break;
        }
      }
    }

    // 보낸 것과 너무 늦은 것을 빼고 남은 것만 저장한다
    if (due.length || dropped) {
      if (keep.length) {
        await redis.set('push:sub:' + id, JSON.stringify({ ...rec, items: keep }));
      } else {
        await redis.set('push:sub:' + id, JSON.stringify({ ...rec, items: [] }));
      }
    }
  }

  res.status(200).json({ ok: true, subs: ids.length, sent, failed, dropped, pruned });
};
