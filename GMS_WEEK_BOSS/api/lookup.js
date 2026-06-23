/* =============================================
   api/lookup.js — 캐릭터 조회 (Vercel 서버리스)
   조회 성공 시 추적 대상으로 등록 + 즉시 스냅샷 1건 누적.
   ============================================= */
const { lookupCharacter, histKey, todayStr, getRedis, pushSnapshot } = require('./_lib');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name   = (req.query.name || '').trim();
  const reboot = req.query.reboot === '1';
  const region = (req.query.region || 'na').toLowerCase();

  if (!name) { res.status(400).json({ ok:false, error:'캐릭터명을 입력하세요.' }); return; }

  try {
    const info = await lookupCharacter(name, reboot, region);
    if (!info) { res.status(200).json({ ok:false, error:'캐릭터를 찾을 수 없습니다. (월드/리부트 구분 확인)' }); return; }

    // 추적 등록 + 즉시 스냅샷 (Redis 사용 가능할 때만)
    const redis = getRedis();
    if (redis) {
      const key = histKey(info.name, region, reboot);
      try {
        await redis.sadd('tracked', key + '|' + region + '|' + (reboot ? 1 : 0) + '|' + info.name);
        await pushSnapshot(redis, key, {
          date: todayStr(), ts: Date.now(), level: info.level,
          exp: Number(info.exp) || 0, img: info.img || '', job: info.job || '',
        });
      } catch (e) { /* 저장 실패는 조회 결과에 영향 주지 않음 */ }
    }

    res.status(200).json({ ok:true, data:info });
  } catch (e) {
    res.status(502).json({ ok:false, error:'조회 실패: ' + e.message });
  }
};
