/* =============================================
   api/img.js — 넥슨 캐릭터 이미지 프록시 (Vercel 서버리스)
   캔버스로 카드 이미지를 만들 때 넥슨 아바타 이미지가 CORS로 막혀
   캔버스가 오염(tainted)되는 것을 피하려고, 같은 출처로 한 번 감싸서 내려준다.
   아무 URL이나 프록시하면 오픈 프록시가 되므로 넥슨 도메인만 허용한다.
   ============================================= */
const { bad } = require('./_lib');

const ALLOWED_HOST = /(^|\.)nexon\.(net|com)$/i;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = req.query.url;
  if (!url) return bad(res, 400, 'url required');

  let u;
  try { u = new URL(url); } catch { return bad(res, 400, 'invalid url'); }
  if (!/^https?:$/.test(u.protocol) || !ALLOWED_HOST.test(u.hostname)) return bad(res, 403, 'host not allowed');

  try {
    const r = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return bad(res, 502, 'upstream fetch failed');
    // 우리 출처로 내보내는 응답이라 그림이 아니면 넘기지 않는다(넥슨 쪽 HTML이 여기서 실행되지 않게)
    const ct = r.headers.get('content-type') || 'image/png';
    if (!/^image\//i.test(ct)) return bad(res, 415, 'not an image');
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch (e) {
    bad(res, 502, 'proxy failed: ' + e.message);
  }
};
