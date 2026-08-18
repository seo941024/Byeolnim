/* =============================================
   api/push-key.js — 브라우저가 구독할 때 쓰는 VAPID 공개키

   공개키는 말 그대로 공개되는 값이라 그대로 내려줘도 된다.
   그래도 코드에 박지 않고 환경변수에서 읽어 내려주는 이유는, 키를 바꿨을 때
   서버(발송)와 클라이언트(구독)가 서로 다른 키를 쓰는 사고를 막기 위해서다.
   ============================================= */
module.exports = async function handler(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(500).json({ ok: false, error: 'VAPID 키 미설정' });
    return;
  }
  res.status(200).json({ ok: true, key });
};
