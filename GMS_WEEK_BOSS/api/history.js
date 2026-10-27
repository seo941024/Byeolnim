/* =============================================
   api/history.js — 캐릭터 경험치 히스토리 반환
   GET /api/history?name=...&region=na&reboot=0
   ============================================= */
const { histKey, getRedis, getJson, bad } = require('./_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name   = (req.query.name || '').trim();
  const reboot = req.query.reboot === '1';
  const region = (req.query.region || 'na').toLowerCase();
  if (!name) return bad(res, 400, 'name 필요');

  const redis = getRedis();
  if (!redis) return bad(res, 200, '저장소 미설정', { data: [] });

  try {
    let arr = await getJson(redis, 'hist:' + histKey(name, region, reboot), []);
    if (!Array.isArray(arr)) arr = [];
    res.status(200).json({ ok:true, data:arr });
  } catch (e) {
    bad(res, 502, e.message, { data: [] });
  }
};
