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
     push:sub:<id>        (json) { sub, origin, items: [{ id, at, title, body }], userId, updated }
       at    = 알림을 띄울 시각(epoch ms). 클라이언트가 보스시각에서 BP_NOTIFY_BEFORE_MIN을 빼서 보낸다.
     push:user:<uid>      (set)  로그인한 계정에 연결된 구독 id 목록(커뮤니티 알림용)
   ============================================= */
const { getRedis, bad, parseBody, getJson, uidOf, removeSub } = require('./_lib');

// 구독 URL로 안정적인 짧은 id를 만든다(같은 기기면 항상 같은 id → 중복 구독 방지)
function subId(endpoint) {
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  return 's' + (h >>> 0).toString(36);
}

module.exports = async function handler(req, res) {
  /* GET /api/push-subscribe?key=1 — bosspush.js가 VAPID 공개키를 받아 간다.
     Vercel Hobby 플랜의 서버리스 함수 12개 제한 때문에 따로 두지 않고 여기 GET으로 받는다. */
  if (req.method === 'GET') {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return bad(res, 500, 'VAPID 키 미설정');
    res.status(200).json({ ok: true, key });
    return;
  }

  if (req.method !== 'POST') return bad(res, 405, 'POST만 허용');

  const redis = getRedis();
  if (!redis) return bad(res, 500, 'Redis 미설정');

  const body = parseBody(req);
  if (!body || !body.subscription || !body.subscription.endpoint) return bad(res, 400, 'subscription 없음');

  const id = subId(body.subscription.endpoint);

  // Redis 쓰기 오류가 함수를 통째로 죽여 FUNCTION_INVOCATION_FAILED만 보이던 적이 있다.
  // Upstash 토큰이 읽기 전용으로 발급된 경우처럼 진짜 원인을 알 수 있게 오류를 detail로 돌려준다.
  try {
    const oldRec = await getJson(redis, 'push:sub:' + id);
    // 로그인한 상태에서 동기화하면 이 기기를 계정에 연결한다. 커뮤니티 알림은
    // 계정 소유자에게만 보내야 하므로, 브라우저가 보낸 id를 그대로 믿지 않는다.
    const uid = await uidOf(redis, String(body.token || ''));

    // 알림 끄기
    if (body.unsubscribe) {
      await removeSub(redis, id, oldRec && oldRec.userId);
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

    // 토큰이 없거나 만료됐으면 로그아웃한 기기라 계정 연결을 끊는다
    const userId = uid || null;
    if (oldRec && oldRec.userId && oldRec.userId !== userId) await redis.srem('push:user:' + oldRec.userId, id);
    await redis.set('push:sub:' + id, JSON.stringify({
      sub: body.subscription,
      /* 어느 주소에서 구독했는지 함께 남긴다.
         푸시 구독은 기기의 서비스워커에 묶여 있어 사이트 주소가 바뀌거나 죽어도 살아
         있다. 예전 주소로 설치한 사람도 같은 VAPID 키면 알림을 받으므로, 전체 발송
         때 지금 주소에서 구독한 사람만 골라내려면 이 값이 필요하다.
         endpoint(fcm.googleapis.com/...)로는 출처를 알 수 없다. */
      origin: req.headers.origin || '',
      items,
      userId,
      updated: now,
    }));
    await redis.sadd('push:subs', id);
    if (userId) await redis.sadd('push:user:' + userId, id);

    res.status(200).json({ ok: true, id, count: items.length });
  } catch (e) {
    bad(res, 500, 'redis 쓰기 실패', { detail: String(e && e.message || e) });
  }
};
