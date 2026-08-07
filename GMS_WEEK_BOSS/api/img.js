/* =============================================
   api/img.js — 넥슨 캐릭터 이미지 프록시 (Vercel 서버리스)
   캔버스로 명함 이미지를 만들 때 넥슨 아바타 이미지가 CORS로 막혀
   캔버스가 오염(tainted)되는 것을 피하려고, 같은 출처로 한 번 감싸서 내려준다.
   아무 URL이나 프록시하면 오픈 프록시가 되므로 넥슨 도메인만 허용한다.
   ============================================= */
const ALLOWED_HOST = /(^|\.)nexon\.(net|com)$/i;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = req.query.url;
  if (!url) { res.status(400).json({ ok:false, error:'url required' }); return; }

  let u;
  try { u = new URL(url); } catch { res.status(400).json({ ok:false, error:'invalid url' }); return; }
  if (!/^https?:$/.test(u.protocol) || !ALLOWED_HOST.test(u.hostname)) {
    res.status(403).json({ ok:false, error:'host not allowed' });
    return;
  }

  try {
    const r = await fetch(u.toString(), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) { res.status(502).json({ ok:false, error:'upstream fetch failed' }); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ ok:false, error:'proxy failed: ' + e.message });
  }
};
