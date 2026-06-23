/* =============================================
   api/collect.js — Vercel Cron 타겟 (매일 1회 자동 실행)
   추적 등록된 모든 캐릭터를 nexon 조회 → 히스토리 누적.
   maplehub 와 동일하게, 등록 시점부터 매일 데이터가 쌓인다.
   ============================================= */
const { lookupCharacter, histKey, todayStr, getRedis, pushSnapshot } = require('./_lib');

module.exports = async function handler(req, res) {
  // (선택) Vercel Cron 인증: CRON_SECRET 환경변수 설정 시 검증
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) { res.status(401).json({ ok:false, error:'unauthorized' }); return; }
  }

  const redis = getRedis();
  if (!redis) { res.status(500).json({ ok:false, error:'저장소(Upstash/KV) 미설정' }); return; }

  let tracked = [];
  try { tracked = await redis.smembers('tracked') || []; }
  catch (e) { res.status(500).json({ ok:false, error:'tracked 조회 실패: ' + e.message }); return; }

  let ok = 0, fail = 0;
  for (const entry of tracked) {
    // entry 형식: "key|region|rebootFlag|name"
    const parts = String(entry).split('|');
    const region = parts[1] || 'na';
    const reboot = parts[2] === '1';
    const name   = parts.slice(3).join('|');   // 이름에 | 있을 가능성 대비
    try {
      const info = await lookupCharacter(name, reboot, region);
      if (info) {
        await pushSnapshot(redis, histKey(info.name, region, reboot), {
          date: todayStr(), ts: Date.now(), level: info.level,
          exp: Number(info.exp) || 0, img: info.img || '', job: info.job || '',
        });
        ok++;
      } else fail++;
    } catch (e) { fail++; }
  }

  res.status(200).json({ ok:true, collected:ok, failed:fail, total:tracked.length });
};
