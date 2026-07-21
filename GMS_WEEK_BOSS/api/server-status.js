/* =============================================
   api/server-status.js — 넥슨 서버 상태 프록시
   GET /api/server-status?region=na|eu
   넥슨 no-auth API는 CORS 헤더가 없어 브라우저에서 직접 호출이 안 되므로
   서버리스 함수를 거쳐 프론트에 넘겨준다.
   ============================================= */
const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/v1';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

/* Game/Login/기타 접두사 키들을 종류별로 묶어 온라인/전체 채널 수만 집계.
   -1 = 해당 월드에 없는(미개통) 채널 슬롯 — 전체 개수에서 제외해야 한다.
   1 = 온라인, 그 외(0 등) = 다운. */
function summarizeWorld(w) {
  const gameKeys = Object.keys(w).filter(k => /^Game\d+$/.test(k));
  const channels = gameKeys.map(k => w[k]).filter(v => v !== null && v !== -1);
  const onlineChannels = channels.filter(v => v === 1).length;
  const loginKeys = Object.keys(w).filter(k => /^Login\d+$/.test(k));
  const loginOnline = loginKeys.filter(k => w[k] === 1).length;
  const up = channels.length > 0 && onlineChannels > 0;
  return {
    worldId: w.worldId,
    world: w.worldName,
    up,
    channels: { online: onlineChannels, total: channels.length },
    login: { online: loginOnline, total: loginKeys.length },
    lastUpdate: w.LogDate || null,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const region = (req.query.region || 'na').toLowerCase() === 'eu' ? 'eu' : 'na';

  try {
    const r = await fetch(`${NEXON_BASE}/server-status/${region}`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { res.status(502).json({ ok:false, error:'넥슨 서버 상태 조회 실패' }); return; }
    const d = await r.json();
    const worlds = (d.servers || []).filter(w => w.worldId != null && w.LogDate).map(summarizeWorld);
    res.status(200).json({ ok:true, region, worlds });
  } catch (e) {
    res.status(502).json({ ok:false, error:'조회 실패: ' + e.message });
  }
};
