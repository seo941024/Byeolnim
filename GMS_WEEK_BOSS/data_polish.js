/* ═══════════════════════════════════════════════════════════
   연마석 시뮬레이터 데이터 (2026-09-26, 사용자 제공 수치)

   생명의 연마석: 1개당 성공률 10%, 1개당 5억 메소. 최대 10개까지 한번에 등록.
   신념의 연마석: 1개당 성공률  5%, 1개당 5억 메소. 최대 20개까지 한번에 등록.

   [등록 개수와 성공률의 관계] — 개수를 늘릴수록 성공률이 "개수 × 개당 확률"만큼
   선형으로 쌓이고, 최대 개수(생명 10개/신념 20개)를 다 채우면 정확히 100%로
   확정 성공한다(10×10%=100%, 20×5%=100%) — 사용자 확인.
   ═══════════════════════════════════════════════════════════ */

const POLISH_TYPES = {
  life:  { key: 'life',  label: '생명의 연마석', icon: 'images/WANT/Use_Grindstone_of_Life.png',   rate: 0.10, maxCount: 10, mesoPerStone: 500_000_000 },
  faith: { key: 'faith', label: '신념의 연마석', icon: 'images/WANT/Use_Grindstone_of_Faith.png', rate: 0.05, maxCount: 20, mesoPerStone: 500_000_000 },
};

function polishChance(typeKey, count) {
  const t = POLISH_TYPES[typeKey];
  if (!t) return 0;
  const n = Math.max(1, Math.min(t.maxCount, count | 0));
  return Math.min(1, n * t.rate);
}
function polishCost(typeKey, count) {
  const t = POLISH_TYPES[typeKey];
  if (!t) return 0;
  const n = Math.max(1, Math.min(t.maxCount, count | 0));
  return n * t.mesoPerStone;
}

if (typeof window !== 'undefined') {
  window.POLISH_DATA = { TYPES: POLISH_TYPES, chance: polishChance, cost: polishCost };
}
