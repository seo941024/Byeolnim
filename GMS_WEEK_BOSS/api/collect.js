/* =============================================
   api/collect.js — Vercel Cron (매일 자동 실행)
   추적 캐릭터의 레벨/exp 스냅샷을 누적한다.

   ※ 과거에는 world/job/legion 랭킹을 통째로 크롤링해 Redis에 캐시했으나,
      넥슨 공개 API가 해당 타입에 대해 ranks를 항상 빈 배열로 반환하고
      (totalCount만 채워짐) 프론트에서도 그 값을 쓰지 않아 전량 제거했다.
   ============================================= */
const { histKey, todayStr, getRedis, pushSnapshot, lookupCharacter } = require('./_lib');

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }
  }

  const redis = getRedis();
  if (!redis) {
    res.status(500).json({ ok: false, error: 'Redis 미설정' });
    return;
  }

  // ── 추적 캐릭터 스냅샷 ──
  let tracked = [];
  try {
    tracked = await redis.smembers('tracked') || [];
  } catch (e) {
    console.error('[collect] tracked 로드 실패:', e.message);
  }

  let ok = 0, fail = 0;
  for (const entry of tracked) {
    const parts  = String(entry).split('|');
    const region = parts[1] || 'na';
    const reboot = parts[2] === '1';
    const name   = parts.slice(3).join('|');
    try {
      const info = await lookupCharacter(name, reboot, region);
      if (info) {
        await pushSnapshot(redis, histKey(info.name, region, reboot), {
          date: todayStr(), ts: Date.now(), level: info.level,
          exp: Number(info.exp) || 0, img: info.img || '', job: info.job || '',
          rank: info.rank || 0, world: info.world || '',
        });
        ok++;
      } else {
        fail++;
      }
    } catch (e) {
      console.error(`[collect] 스냅샷 실패 (${name}):`, e.message);
      fail++;
    }
  }

  console.log(`[collect] 스냅샷 완료 — ok: ${ok}, fail: ${fail}`);

  res.status(200).json({ ok: true, tracked: tracked.length, collected: ok, failed: fail });
};