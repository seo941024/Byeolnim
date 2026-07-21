/* =============================================
   api/maintenance.js — 넥슨 점검 상태 프록시
   GET /api/maintenance
   game id 10100은 NA/EU 공통 — 메이플허브도 지역 구분 없이 동일 id로 조회한다.
   ============================================= */
const NEXON_BASE = 'https://www.nexon.com/api/maplestory/no-auth/v1';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
const GAME_ID = 10100;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const r = await fetch(`${NEXON_BASE}/maintenance/${GAME_ID}`, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { res.status(502).json({ ok:false, error:'점검 상태 조회 실패' }); return; }
    const d = await r.json();
    res.status(200).json({ ok:true, maintenance: !!d.maintenance });
  } catch (e) {
    res.status(502).json({ ok:false, error:'조회 실패: ' + e.message });
  }
};
