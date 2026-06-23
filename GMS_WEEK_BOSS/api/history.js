/* =============================================
   api/history.js — 캐릭터 경험치 히스토리 반환
   GET /api/history?name=...&region=na&reboot=0
   ============================================= */
const { histKey, getRedis } = require('./_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name   = (req.query.name || '').trim();
  const reboot = req.query.reboot === '1';
  const region = (req.query.region || 'na').toLowerCase();
  if (!name) { res.status(400).json({ ok:false, error:'name 필요' }); return; }

  const redis = getRedis();
  if (!redis) { res.status(200).json({ ok:false, error:'저장소 미설정', data:[] }); return; }

  try {
    const key = histKey(name, region, reboot);
    const raw = await redis.get('hist:' + key);
    let arr = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    if (!Array.isArray(arr)) arr = [];
    res.status(200).json({ ok:true, data:arr });
  } catch (e) {
    res.status(502).json({ ok:false, error:e.message, data:[] });
  }
};
