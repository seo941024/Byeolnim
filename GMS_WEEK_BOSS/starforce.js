/* ════════════════════════════════════════════════
   starforce.js — 스타포스 데이터·로직 전용 모듈
   (jaehoom.cloud 로직 기반)
   ════════════════════════════════════════════════ */

/* ── 확률 테이블 [성공%, 실패%, 파괴%] ── */
const SF_PROB = [
  /* 0성  */ [99.75,  0.25,    0      ],
  /* 1성  */ [94.50,  5.50,    0      ],
  /* 2성  */ [89.25, 10.75,    0      ],
  /* 3성  */ [89.25, 10.75,    0      ],
  /* 4성  */ [84.00, 16.00,    0      ],
  /* 5성  */ [78.75, 21.25,    0      ],
  /* 6성  */ [73.50, 26.50,    0      ],
  /* 7성  */ [68.25, 31.75,    0      ],
  /* 8성  */ [63.00, 37.00,    0      ],
  /* 9성  */ [57.75, 42.25,    0      ],
  /* 10성 */ [52.50, 47.50,    0      ],
  /* 11성 */ [47.25, 52.75,    0      ],
  /* 12성 */ [42.00, 58.00,    0      ],
  /* 13성 */ [36.75, 63.25,    0      ],
  /* 14성 */ [31.50, 68.50,    0      ],
  /* 15성 */ [31.50, 66.445,   2.055  ],
  /* 16성 */ [31.50, 66.445,   2.055  ],
  /* 17성 */ [15.75, 77.510,   6.740  ],
  /* 18성 */ [15.75, 77.510,   6.740  ],
  /* 19성 */ [15.75, 75.825,   8.425  ],
  /* 20성 */ [31.50, 58.225,  10.275  ],
  /* 21성 */ [15.75, 71.6125, 12.6375 ],
  /* 22성 */ [15.75, 67.40,   16.85   ],
  /* 23성 */ [10.50, 71.60,   17.90   ],
  /* 24성 */ [10.50, 71.60,   17.90   ],
  /* 25성 */ [10.50, 71.60,   17.90   ],
  /* 26성 */ [ 7.35, 74.16,   18.53   ],
  /* 27성 */ [ 5.25, 75.80,   18.95   ],
  /* 28성 */ [ 3.15, 77.48,   19.37   ],
  /* 29성 */ [ 1.05, 79.16,   19.79   ],
];

/* ── 비용 공식 분모 ── */
const SF_COST_D = [
  /* 0~9성  */ 36, 36, 36, 36, 36, 36, 36, 36, 36, 36,
  /* 10~14성 */ 571, 314, 214, 157, 107,
  /* 15~19성 */ 200, 200, 150,  70,  45,
  /* 20~21성 */ 200, 125,
  /* 22~29성 */ 200, 200, 200, 200, 200, 200, 200, 200,
];

const SF_SHINING_MAX = 22;

/* ── GMS 전용 스테이지 배율 ── */
const SF_STAGE_COST_MUL = {
  15: { 1: 1, 2: 1.5, 3: 2.5 },
  16: { 1: 1, 2: 1.5, 3: 2.5 },
  17: { 1: 1, 2: 1.5, 3: 2.5 },
  18: { 1: 1, 2: 2, 3: 3.5, 4: 6.5 },
  19: { 1: 1, 2: 2, 3: 3.5, 4: 6.5 },
  20: { 1: 1, 2: 2, 3: 3.5, 4: 6.5 },
  21: { 1: 1, 2: 2, 3: 3.5, 4: 6.5 },
};

const SF_STAGE_PROB = {
  15: { 2: [31.5,  67.1,  1.4 ], 3: [31.5,  67.8,  0.7 ] },
  16: { 2: [31.5,  67.1,  1.4 ], 3: [31.5,  67.8,  0.7 ] },
  17: { 2: [15.8,  79.95, 4.25], 3: [15.8,  82.5,  1.7 ] },
  18: { 2: [12.6,  83.00, 4.40], 3: [10.5,  87.70, 1.80], 4: [8.4,   91.60, 0] },
  19: { 2: [12.6,  81.24, 6.16], 3: [10.5,  85.90, 3.60], 4: [8.4,   91.60, 0] },
  20: { 2: [26.25, 66.25, 7.50], 3: [21,    75,    4   ], 4: [15.75, 84.25, 0] },
  21: { 2: [12.6,  78.60, 8.80], 3: [10.5,  85.00, 4.50], 4: [8.4,   91.60, 0] },
};

function sfStageMul(star, stage) {
  const m = SF_STAGE_COST_MUL[star];
  return (m && m[stage]) || 1;
}

function sfStageRow(star, stage) {
  if (stage > 1 && SF_STAGE_PROB[star] && SF_STAGE_PROB[star][stage])
    return SF_STAGE_PROB[star][stage];
  return SF_PROB[star];
}

function calcSfBaseCost(level, star) {
  const L = level, S = star;
  const d = SF_COST_D[S];
  let raw;
  if (S <= 9) {
    raw = 1000 + Math.pow(L, 3) * (S + 1) / d;
  } else {
    raw = 1000 + Math.pow(L, 3) * Math.pow(S + 1, 2.7) / d;
  }
  return Math.round(raw / 100) * 100;
}

/* mesoDiscount: 0.30 = 30% 할인 이벤트 (MVP·샤이닝과 별개로 추가 적용) */
function calcSfCost(level, star, mvpDiscount, isShining, isProtected, stage, mesoDiscount) {
  const base = Math.round(calcSfBaseCost(level, star) * sfStageMul(star, stage || 1) / 100) * 100;
  const mvp  = mvpDiscount > 0 && star < 17;
  const md   = (mesoDiscount > 0) ? (1 - mesoDiscount) : 1;

  if (isProtected) {
    /* 파괴방지: 할인된 강화비 + 기본비×2 (기본비 부분엔 할인 없음) */
    let normalCost;
    if (isShining && mvp)      normalCost = Math.round(base * (1 - mvpDiscount) * 0.7 * md / 100) * 100;
    else if (isShining)        normalCost = Math.round(base * 0.7 * md / 100) * 100;
    else if (mvp)              normalCost = Math.round(base * (1 - mvpDiscount) * md / 100) * 100;
    else                       normalCost = Math.round(base * md / 100) * 100;
    return normalCost + base * 2;
  } else {
    if (isShining && mvp)      return Math.round(base * (1 - mvpDiscount) * 0.7 * md / 100) * 100;
    else if (isShining)        return Math.round(base * 0.7 * md / 100) * 100;
    else if (mvp)              return Math.round(base * (1 - mvpDiscount) * md / 100) * 100;
    else                       return Math.round(base * md / 100) * 100;
  }
}

function getSfProb(star, isShining, isProtected, stage) {
  const row = sfStageRow(star, stage || 1);
  if (!row) return { succ: 0, fail: 1, dest: 0 };

  let [succPct, failPct, destPct] = row;

  /* 샤이닝 스타포스: 파괴율 30% 감소 → 실패로 이전 */
  if (isShining && star < SF_SHINING_MAX && destPct > 0) {
    const reduction = destPct * 0.30;
    destPct -= reduction;
    failPct += reduction;
  }
  /* 파괴방지: 파괴확률 → 실패로 이전 */
  if (isProtected && destPct > 0) {
    failPct += destPct;
    destPct = 0;
  }
  return { succ: succPct / 100, fail: failPct / 100, dest: destPct / 100 };
}

function getDestStar(star) {
  if (star <= 14) return 0;
  if (star <= 19) return 12;
  if (star === 20) return 15;
  if (star <= 22) return 17;
  if (star <= 25) return 19;
  return 20;
}

/* ── 몬테카를로 시뮬레이션 (1회) ── */
function sfRunOnce(cfg) {
  let star = cfg.current;
  let totalCost = 0;
  let destroys = 0;

  while (star < cfg.target) {
    const btn = (cfg.stages && cfg.stages[star]) || 1;

    /* 15~17성 4번 버튼 = 기존 파괴방지: stage1 확률에 파괴→실패 전환 */
    const isProtected = (star >= 15 && star <= 17) && btn === 4;
    const stage = isProtected ? 1 : btn;

    const cost = calcSfCost(cfg.level, star, cfg.mvpDiscount || 0, cfg.isShining, isProtected, stage, 0);
    totalCost += cost;

    const p = getSfProb(star, cfg.isShining, isProtected, stage);
    const r = Math.random();

    if (r < p.succ) {
      star++;
    } else if (r < p.succ + p.fail) {
      /* 실패 — 유지 */
    } else {
      destroys++;
      star = getDestStar(star);
    }
  }
  return { cost: totalCost, destroys };
}

