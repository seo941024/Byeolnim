/* =============================================
   api/lookup.js — 캐릭터 조회 (Vercel 서버리스)
   조회 성공 시 추적 대상으로 등록 + 즉시 스냅샷 1건 누적.
   ============================================= */
const { lookupCharacter, histKey, getRedis, pushSnapshot, snapshotOf, bad } = require('./_lib');

/* 추적 등록(저장소 쓰기)만 IP당 시간당 횟수를 제한한다. 조회 자체는 막지 않는다.
   Redis 오류 때는 제한하지 않고 통과시킨다. */
async function underTrackLimit(redis, req) {
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const k = 'rl:track:' + ip + ':' + Math.floor(Date.now() / 3600000);
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, 3700);
    return n <= 200;
  } catch (e) { return true; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name   = (req.query.name || '').trim();
  const reboot = req.query.reboot === '1';
  /* 지역은 na/eu만 쓴다. 다른 값이 그대로 추적 키에 들어가면 저장소가 계속 불어난다 */
  const region = String(req.query.region || 'na').toLowerCase() === 'eu' ? 'eu' : 'na';

  if (!name) return bad(res, 400, '캐릭터명을 입력하세요.');
  if (name.length > 20) return bad(res, 400, '캐릭터명이 너무 깁니다.');

  try {
    const info = await lookupCharacter(name, reboot, region);
    if (!info) return bad(res, 200, '캐릭터를 찾을 수 없습니다. 캐릭터의 레벨이 200 미만이거나 월드·리부트 구분이 다를 수 있습니다.');

    // 추적 등록 + 즉시 스냅샷 (Redis 사용 가능할 때만)
    const redis = getRedis();
    if (redis && await underTrackLimit(redis, req)) {
      const key = histKey(info.name, region, reboot);
      try {
        await redis.sadd('tracked', key + '|' + region + '|' + (reboot ? 1 : 0) + '|' + info.name);
        await pushSnapshot(redis, key, snapshotOf(info));
      } catch (e) { /* 저장 실패는 조회 결과에 영향 주지 않음 */ }
    }

    res.status(200).json({ ok:true, data:info });
  } catch (e) {
    bad(res, 502, '조회 실패: ' + e.message);
  }
};
