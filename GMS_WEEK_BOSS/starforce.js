/* =============================================
   starforce.js — 스타포스 강화 확률/비용 계산 모듈
   ============================================= */

/* 성공/실패/파괴 확률(%). 넥슨 공식 발표 수치(공용 게임 데이터)이며,
   행 인덱스가 곧 현재 성수(0~29성)다. */
const ENHANCE_PROB_TABLE = [
  [99.75,  0.25,    0      ], // 0성
  [94.50,  5.50,    0      ], // 1성
  [89.25, 10.75,    0      ], // 2성
  [89.25, 10.75,    0      ], // 3성
  [84.00, 16.00,    0      ], // 4성
  [78.75, 21.25,    0      ], // 5성
  [73.50, 26.50,    0      ], // 6성
  [68.25, 31.75,    0      ], // 7성
  [63.00, 37.00,    0      ], // 8성
  [57.75, 42.25,    0      ], // 9성
  [52.50, 47.50,    0      ], // 10성
  [47.25, 52.75,    0      ], // 11성
  [42.00, 58.00,    0      ], // 12성
  [36.75, 63.25,    0      ], // 13성
  [31.50, 68.50,    0      ], // 14성
  [31.50, 66.445,   2.055  ], // 15성
  [31.50, 66.445,   2.055  ], // 16성
  [15.75, 77.510,   6.740  ], // 17성
  [15.75, 77.510,   6.740  ], // 18성
  [15.75, 75.825,   8.425  ], // 19성
  [31.50, 58.225,  10.275  ], // 20성
  [15.75, 71.6125, 12.6375 ], // 21성
  [15.75, 67.40,   16.85   ], // 22성
  [10.50, 71.60,   17.90   ], // 23성
  [10.50, 71.60,   17.90   ], // 24성
  [10.50, 71.60,   17.90   ], // 25성
  [ 7.35, 74.16,   18.53   ], // 26성
  [ 5.25, 75.80,   18.95   ], // 27성
  [ 3.15, 77.48,   19.37   ], // 28성
  [ 1.05, 79.16,   19.79   ], // 29성
];

/* 강화 비용 산식의 분모값. 구간별로 값이 바뀌므로 성수→분모 조회 테이블로 둔다. */
const COST_DENOM_TABLE = [
  36, 36, 36, 36, 36, 36, 36, 36, 36, 36,           // 0~9성
  571, 314, 214, 157, 107,                          // 10~14성
  200, 200, 150, 70, 45,                            // 15~19성
  200, 125,                                         // 20~21성
  200, 200, 200, 200, 200, 200, 200, 200,           // 22~29성
];

const SHINING_DEST_CAP = 22; // 샤이닝 파괴율 감소는 이 성수 미만에서만 적용

/* GMS 전용 "강화 단계" 시스템. 15~21성 구간에서만 등장하며, 성수별로 선택
   가능한 단계(1~4)마다 비용 배율과 확률이 따로 정의된다.
   - 15~17성: 4번 버튼은 별도 단계가 아니라 "파괴방지"를 뜻하므로 이 표에는
     없음(applyStageChoice에서 별도 처리).
   - 18~21성: 1~4 전부 실제 단계. */
const STAGE_COST_MULT = {
  15: { 2: 1.5, 3: 2.5 },
  16: { 2: 1.5, 3: 2.5 },
  17: { 2: 1.5, 3: 2.5 },
  18: { 2: 2, 3: 3.5, 4: 6.5 },
  19: { 2: 2, 3: 3.5, 4: 6.5 },
  20: { 2: 2, 3: 3.5, 4: 6.5 },
  21: { 2: 2, 3: 3.5, 4: 6.5 },
};

const STAGE_PROB_TABLE = {
  15: { 2: [31.5,  67.1,  1.4 ], 3: [31.5,  67.8,  0.7 ] },
  16: { 2: [31.5,  67.1,  1.4 ], 3: [31.5,  67.8,  0.7 ] },
  17: { 2: [15.8,  79.95, 4.25], 3: [15.8,  82.5,  1.7 ] },
  18: { 2: [12.6,  83.00, 4.40], 3: [10.5,  87.70, 1.80], 4: [8.4,   91.60, 0] },
  19: { 2: [12.6,  81.24, 6.16], 3: [10.5,  85.90, 3.60], 4: [8.4,   91.60, 0] },
  20: { 2: [26.25, 66.25, 7.50], 3: [21,    75,    4   ], 4: [15.75, 84.25, 0] },
  21: { 2: [12.6,  78.60, 8.80], 3: [10.5,  85.00, 4.50], 4: [8.4,   91.60, 0] },
};

/* 강화 그리드에서 고른 버튼(1~4)을, 실제 파괴방지 여부와 확률/비용 조회에
   쓸 단계 번호로 바꾼다. 15~17성만 4번 버튼이 "단계"가 아니라 기존 파괴방지다. */
function applyStageChoice(star, chosenBtn) {
  const btn = chosenBtn || 1;
  const legacyProtectRange = star >= 15 && star <= 17;
  if (legacyProtectRange && btn === 4) return { protect: true, stage: 1 };
  return { protect: false, stage: btn };
}

function costMultiplierFor(star, stage) {
  if (stage <= 1) return 1;
  const row = STAGE_COST_MULT[star];
  return (row && row[stage]) || 1;
}

function probRowFor(star, stage) {
  const override = stage > 1 && STAGE_PROB_TABLE[star] && STAGE_PROB_TABLE[star][stage];
  return override || ENHANCE_PROB_TABLE[star];
}

/* 할인 배율 하나로 합성 — MVP/샤이닝/메소절감을 각각 곱해서 최종 비율만 반환.
   (호출부는 이 비율을 base 비용에 곱하기만 하면 됨) */
function combinedDiscountRate(mvpActive, shiningActive, mesoDiscount) {
  let rate = 1;
  if (mvpActive) rate *= 1 - mvpActive;
  if (shiningActive) rate *= 0.7;
  if (mesoDiscount > 0) rate *= 1 - mesoDiscount;
  return rate;
}

function calcSfBaseCost(level, star) {
  const denom = COST_DENOM_TABLE[star];
  const exponent = star <= 9 ? star + 1 : Math.pow(star + 1, 2.7);
  const raw = 1000 + Math.pow(level, 3) * exponent / denom;
  return Math.round(raw / 100) * 100;
}

/* mesoDiscount: 0.30 = 30% 메소 절감 이벤트(MVP·샤이닝과는 별개로 곱해짐) */
function calcSfCost(level, star, mvpDiscount, isShining, isProtected, stage, mesoDiscount) {
  const stageMult = costMultiplierFor(star, stage || 1);
  const base = Math.round(calcSfBaseCost(level, star) * stageMult / 100) * 100;

  const mvpActive = mvpDiscount > 0 && star < 17 ? mvpDiscount : 0;
  const rate = combinedDiscountRate(mvpActive, isShining, mesoDiscount > 0 ? mesoDiscount : 0);
  const discounted = Math.round(base * rate / 100) * 100;

  if (!isProtected) return discounted;

  /* 파괴방지 = 할인 적용된 강화비 + 할인 없는 기본비 × 2 */
  return discounted + base * 2;
}

function getSfProb(star, isShining, isProtected, stage) {
  const row = probRowFor(star, stage || 1);
  if (!row) return { succ: 0, fail: 1, dest: 0 };

  let [succPct, failPct, destPct] = row;

  if (isShining && star < SHINING_DEST_CAP && destPct > 0) {
    const moved = destPct * 0.30;
    destPct -= moved;
    failPct += moved;
  }
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

/* ── 목표 성수까지의 기대 비용/파괴횟수/시행횟수를 정확히 계산 ──
   상태 수가 최대 30개뿐이므로 시뮬레이션 대신 흡수 마르코프 연쇄를 직접
   풀어서 기댓값을 구한다(반복 시뮬레이션보다 빠르고 오차가 없음).

   상태 s에서 목표(to)까지 남은 기대값을 E[s]라 하면
     E[s] = cost(s) + succ·E[s+1] + fail·E[s] + dest·E[destStar(s)]
   destStar(s)가 s보다 낮은 값으로 튈 수 있어 단순 하향식 점화식이 안 되고,
   n개 미지수의 연립 1차방정식이 된다. 이를
     (1 - fail)·E[s] - succ·E[s+1] - dest·E[destStar(s)] = cost(s)
   형태의 행렬로 세우고 가우스 소거로 한 번에 푼다. 비용/파괴횟수/시행횟수
   세 값 모두 좌변(계수 행렬)은 같고 우변만 다르므로 한 번의 소거로 동시에
   구한다. */
function sfExpectedExact(cfg) {
  const target = cfg.target;
  const stateCount = target; // 상태 0..target-1 (target은 흡수 상태, E=0)
  if (stateCount <= 0 || cfg.current >= target) return { cost: 0, destroys: 0, attempts: 0 };

  const coef = Array.from({ length: stateCount }, () => new Float64Array(stateCount));
  const rhs = Array.from({ length: stateCount }, () => new Float64Array(3)); // [비용, 파괴, 시행]

  for (let s = 0; s < stateCount; s++) {
    const btn = (cfg.stages && cfg.stages[s]) || 1;
    const { protect, stage } = applyStageChoice(s, btn);

    const cost = calcSfCost(cfg.level, s, cfg.mvpDiscount || 0, cfg.isShining, protect, stage, 0);
    const p = getSfProb(s, cfg.isShining, protect, stage);

    coef[s][s] += 1 - p.fail;
    if (s + 1 < target) coef[s][s + 1] -= p.succ;
    if (p.dest > 0) {
      const dst = getDestStar(s);
      if (dst < target) coef[s][dst] -= p.dest;
    }
    rhs[s][0] = cost;
    rhs[s][1] = p.dest;
    rhs[s][2] = 1;
  }

  gaussEliminateInPlace(coef, rhs);

  const s0 = cfg.current;
  return { cost: rhs[s0][0], destroys: rhs[s0][1], attempts: rhs[s0][2] };
}

/* coef·x = rhs 를 부분 피벗 가우스 소거로 풀고, 해를 rhs에 덮어쓴다.
   coef의 어떤 행이 애초에 도달 불가능한 상태(피벗이 0)면 그대로 건너뛴다. */
function gaussEliminateInPlace(coef, rhs) {
  const n = coef.length;
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(coef[r][col]) > Math.abs(coef[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(coef[pivotRow][col]) < 1e-12) continue;

    if (pivotRow !== col) {
      [coef[col], coef[pivotRow]] = [coef[pivotRow], coef[col]];
      [rhs[col], rhs[pivotRow]] = [rhs[pivotRow], rhs[col]];
    }

    const pivot = coef[col][col];
    for (let c = col; c < n; c++) coef[col][c] /= pivot;
    for (let k = 0; k < 3; k++) rhs[col][k] /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = coef[r][col];
      if (!factor) continue;
      for (let c = col; c < n; c++) coef[r][c] -= factor * coef[col][c];
      for (let k = 0; k < 3; k++) rhs[r][k] -= factor * rhs[col][k];
    }
  }
}

function sfRunOnce(cfg) {
  let star = cfg.current;
  let totalCost = 0;
  let destroys = 0;

  while (star < cfg.target) {
    const btn = (cfg.stages && cfg.stages[star]) || 1;
    const { protect, stage } = applyStageChoice(star, btn);

    totalCost += calcSfCost(cfg.level, star, cfg.mvpDiscount || 0, cfg.isShining, protect, stage, 0);

    const p = getSfProb(star, cfg.isShining, protect, stage);
    const roll = Math.random();

    if (roll < p.succ) {
      star++;
    } else if (roll < p.succ + p.fail) {
      // 실패: 성수 유지
    } else {
      destroys++;
      star = getDestStar(star);
    }
  }
  return { cost: totalCost, destroys };
}
