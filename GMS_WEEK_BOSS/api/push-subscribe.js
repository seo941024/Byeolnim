/* =============================================
   api/push-subscribe.js — 보스 알림 구독 저장/해제

   브라우저의 푸시 구독 정보와 "언제 알릴지" 목록을 Redis에 담아둔다.
   실제 발송은 api/push-tick.js(크론)가 한다.

   ※ 캘린더 일정은 원래 브라우저 localStorage에만 있어서 서버가 알 수 없다.
      알림을 보내려면 서버가 시각을 알아야 하므로, 알림을 켠 사람에 한해
      "알릴 시각 + 보여줄 문구"만 올려받는다. 캘린더 원본이나 캐릭터 정보를
      통째로 보내지는 않는다.

   저장 구조
     push:subs            (set)  구독 id 목록
     push:sub:<id>        (json) { sub, items: [{ id, at, title, body }], updated }
       at    = 알림을 띄울 시각(epoch ms). 클라이언트가 보스시각-30분으로 계산해 보낸다.
   ============================================= */
const { getRedis } = require('./_lib');

// 구독 URL로 안정적인 짧은 id를 만든다(같은 기기면 항상 같은 id → 중복 구독 방지)
function subId(endpoint) {
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  return 's' + (h >>> 0).toString(36);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST만 허용' });
    return;
  }

  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ ok: false, error: 'Redis 미설정' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || !body.subscription || !body.subscription.endpoint) {
    res.status(400).json({ ok: false, error: 'subscription 없음' });
    return;
  }

  const id = subId(body.subscription.endpoint);

  // 여기서부터는 전부 Redis 쓰기다. 지금까지 배포한 read 경로(push-key, push-tick의
  // smembers)는 성공했지만 write는 한 번도 실제로 통과한 적이 없어서, try/catch 없이
  // 두면 여기서 나는 오류가 함수를 통째로 죽인다(FUNCTION_INVOCATION_FAILED로 관찰됨).
  // 진짜 원인(예: Upstash 토큰이 읽기 전용으로 발급됨)을 특정하려면 오류를 그대로
  // 삼키지 말고 클라이언트에 보여줘야 하므로 감싸서 처리한다.
  try {
    // 알림 끄기
    if (body.unsubscribe) {
      await redis.srem('push:subs', id);
      await redis.del('push:sub:' + id);
      res.status(200).json({ ok: true, removed: true });
      return;
    }

    // 지난 시각은 저장할 필요가 없고, 무한정 쌓이지 않게 개수도 제한한다
    const now = Date.now();
    const items = (Array.isArray(body.items) ? body.items : [])
      .filter(it => it && typeof it.at === 'number' && it.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, 200)
      .map(it => ({
        id: String(it.id),
        at: it.at,
        title: String(it.title || '보스 알림').slice(0, 60),
        body: String(it.body || '').slice(0, 120),
      }));

    await redis.set('push:sub:' + id, JSON.stringify({
      sub: body.subscription,
      items,
      updated: now,
    }));
    await redis.sadd('push:subs', id);

    res.status(200).json({ ok: true, id, count: items.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'redis 쓰기 실패', detail: String(e && e.message || e) });
  }
};
