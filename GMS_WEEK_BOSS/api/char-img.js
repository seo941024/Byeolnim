/* api/char-img.js — Nexon 캐릭터 이미지 프록시 (CORS/hotlink 우회) */
module.exports = async function handler(req, res) {
  const url = req.query.url;
  if (!url || !url.startsWith('http')) {
    res.status(400).end(); return;
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.nexon.com/',
        'Accept': 'image/webp,image/png,image/*',
      },
    });
    if (!r.ok) { res.status(r.status).end(); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    const ct  = r.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).end();
  }
};
