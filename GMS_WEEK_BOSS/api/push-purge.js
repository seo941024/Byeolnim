/* =============================================
   api/push-purge.js — 구독 목록 전체 삭제 (관리자 전용)

     POST /api/push-purge
     Authorization: Bearer <ADMIN_SECRET>   (또는 ?secret=<ADMIN_SECRET>)
     body: { confirm: true }

   왜 필요한가: 푸시 구독은 기기의 서비스워커에 묶여 있어 사이트 주소가 바뀌거나
   죽어도 계속 살아 있다. 예전 주소로 설치한 사람도 같은 VAPID 키로 보내면 알림을
   받는다. 그런데 저장된 구독에는 어느 주소에서 구독했는지가 남아 있지 않아
   골라낼 수가 없다. 그래서 통째로 비우고 다시 받는 것이 유일하게 확실한 방법이다.

   지운 뒤에는 각자 알림을 다시 켜야 하며, 그때부터는 origin이 함께 기록된다
   (api/push-subscribe.js).
   ============================================= */
const { getRedis } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST만 허용' });
    return;
  }

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(500).json({ ok: false, error: 'ADMIN_SECRET 미설정' });
    return;
  }
  const auth = req.headers['authorization'] || '';
  const q = (req.query && req.query.secret) || '';
  if (auth !== `Bearer ${secret}` && q !== secret) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  // 되돌릴 수 없으므로 명시적인 확인 없이는 지우지 않는다
  if (!body || body.confirm !== true) {
    res.status(400).json({ ok: false, error: 'confirm:true 필요' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ ok: false, error: 'Redis 미설정' });
    return;
  }

  try {
    const ids = (await redis.smembers('push:subs')) || [];
    for (const id of ids) {
      try { await redis.del('push:sub:' + id); } catch { /* 개별 실패는 넘어간다 */ }
    }
    await redis.del('push:subs');
    res.status(200).json({ ok: true, removed: ids.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'redis 삭제 실패', detail: String(e && e.message || e) });
  }
};
