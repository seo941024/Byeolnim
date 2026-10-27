/* =============================================
   api/push-broadcast.js — 전체 공지 푸시 (관리자 전용)

   저장된 구독자 전원에게 같은 알림을 즉시 보낸다. 보스 알림(push-tick)이
   "예약된 시각에 각자에게" 보내는 것과 달리, 이건 "지금 모두에게" 보낸다.

     POST /api/push-broadcast
     Authorization: Bearer <ADMIN_SECRET>   (또는 ?secret=<ADMIN_SECRET>)
     body: { title, body, url?, dryRun? }

   ※ 비밀번호는 Vercel 환경변수 ADMIN_SECRET에만 둔다. 클라이언트 코드에 적으면
      누구나 소스를 열어 볼 수 있어 그 순간 비밀이 아니게 되고, 앱에서 하는 검사는
      우회할 수도 있다. 그래서 대조는 반드시 여기(서버)에서 한다.

   ※ 크론용 CRON_SECRET과 분리한다. 하나를 같이 쓰면 둘 중 하나만 바꾸고 싶을 때
      다른 기능까지 끊긴다.

   ※ ADMIN_SECRET이 설정돼 있지 않으면 아예 거부한다. 사용자 기기로 직접 도달하는
      기능이라 인증 없이 열어두면 안 된다.

   ※ dryRun을 주면 실제로 보내지 않고 대상 수만 돌려준다. 문구를 확인하거나
      구독자 수를 먼저 세어볼 때 쓴다.
   ============================================= */
const { getRedis, bad, parseBody, hasSecret, webPush, readSub, removeSub } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'POST만 허용');

  // 전체 발송은 되돌릴 수 없으므로 비밀번호 미설정 시 잠근다
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return bad(res, 500, 'ADMIN_SECRET 미설정 — 전체 발송을 잠급니다');
  if (!hasSecret(req, secret, true)) return bad(res, 401, 'unauthorized');

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return bad(res, 500, 'VAPID 키 미설정');

  const redis = getRedis();
  if (!redis) return bad(res, 500, 'Redis 미설정');

  const body = parseBody(req);
  const title = String((body && body.title) || '').trim().slice(0, 60);
  const text  = String((body && body.body)  || '').trim().slice(0, 160);
  const url   = String((body && body.url)   || '/').slice(0, 200);
  const dryRun = !!(body && body.dryRun);

  if (!title) return bad(res, 400, '제목(title)이 비었습니다');

  let ids = [];
  try { ids = (await redis.smembers('push:subs')) || []; } catch { ids = []; }

  /* 지금 이 사이트에서 구독한 사람에게만 보낸다.
     푸시 구독은 기기의 서비스워커에 묶여 있어 예전 주소로 설치한 사람도 같은
     VAPID 키면 알림을 받는다. 그쪽으로 새 공지가 가면 안 되므로 origin을 대조하고,
     origin이 기록돼 있지 않은 과거 구독은 출처를 알 수 없으니 보내지 않는다. */
  const here = req.headers.origin || '';
  const records = [];
  let skipped = 0;
  for (const id of ids) {
    const rec = await readSub(redis, id);
    if (!rec || !rec.sub || !rec.origin || (here && rec.origin !== here)) { skipped++; continue; }
    records.push({ id, rec });
  }

  if (dryRun) {
    res.status(200).json({ ok: true, dryRun: true, targets: records.length, skipped, title, body: text, url });
    return;
  }

  const webpush = webPush();

  // 같은 tag를 쓰면 이전 공지 알림을 덮어써서 알림창에 쌓이지 않는다
  const tag = 'notice-' + Date.now().toString(36);
  const payload = JSON.stringify({ title, body: text, tag, url });

  let sent = 0, failed = 0, pruned = 0;

  for (const { id, rec } of records) {
    try {
      /* urgency를 안 주면 normal로 나가고, 그러면 푸시 서비스가 배터리를 아끼려고
         기기가 깰 때까지 전송을 미룬다. 실제로 폰에서 알림이 바로 안 오다가 앱을
         켜야 한꺼번에 오는 증상이 있었다. 공지는 지금 보는 게 의미이므로 high로 올린다.
         TTL 하루 — 그 사이에 못 받으면 이제 와서 띄워봐야 의미가 없다. */
      await webpush.sendNotification(rec.sub, payload, { urgency: 'high', TTL: 86400 });
      sent++;
    } catch (e) {
      failed++;
      // 404/410 = 구독 만료 또는 사용자가 알림을 끔 → 목록과 계정 색인에서 정리한다
      const code = e && e.statusCode;
      if (code === 404 || code === 410) {
        try { await removeSub(redis, id, rec.userId); pruned++; }
        catch { /* 다음 발송 때 다시 정리된다 */ }
      }
    }
  }

  res.status(200).json({ ok: true, targets: records.length, skipped, sent, failed, pruned });
};
