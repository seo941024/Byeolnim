/* ═══════════════════════════════════════════════
   큐브 시뮬레이터
═══════════════════════════════════════════════ */

const CUBE_MESO = { red: 12_000_000, black: 22_000_000 };

// 큐브 버튼 data-type → cube_table.js gradeUp 키
const _CUBE_TABLE_KEY = { red: 'RED', black: 'POTENTIAL', master: 'ARTISAN', craft: 'MASTER' };
const _GRADE_ORDER    = ['RARE', 'EPIC', 'UNIQUE', 'LEGENDARY'];
const _GRADE_KR       = { RARE: '레어', EPIC: '에픽', UNIQUE: '유니크', LEGENDARY: '레전드리' };
const _GRADE_NEXT     = { RARE: 'EPIC', EPIC: 'UNIQUE', UNIQUE: 'LEGENDARY' };

// ── 등급업 헬퍼 ──────────────────────────────────

function _cubeActiveType() {
  return document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
}

function _cubeGradeUpRates(type) {
  const t = window.CUBE_TABLE;
  if (!t) return {};
  return t.gradeUp[_CUBE_TABLE_KEY[type]] || {};
}

function _cubeGradeUpAvailGrades(type) {
  const rates = _cubeGradeUpRates(type);
  return _GRADE_ORDER.filter(g => rates[g] != null);
}

function _cubePopulateGradeFrom() {
  const sel = document.getElementById('cubeGradeFrom');
  if (!sel) return;
  const type   = _cubeActiveType();
  const grades = _cubeGradeUpAvailGrades(type);
  const prev   = sel.value;
  sel.innerHTML = grades.map(g => `<option value="${g}">${_GRADE_KR[g]}</option>`).join('');
  if (grades.includes(prev)) sel.value = prev;
  _cubeRenderGradeUpInfo();
}

function _cubeRenderGradeUpInfo() {
  const el = document.getElementById('cubeGradeUpInfo');
  if (!el) return;
  const type     = _cubeActiveType();
  const from     = document.getElementById('cubeGradeFrom')?.value;
  const rates    = _cubeGradeUpRates(type);
  const p        = rates[from];
  if (p == null) { el.textContent = ''; return; }
  const to       = _GRADE_NEXT[from];
  const pct      = (p * 100).toFixed(4);
  const expected = Math.ceil(1 / p);
  el.innerHTML   = `${_GRADE_KR[from]} → ${_GRADE_KR[to]}&nbsp;&nbsp;<strong>${pct}%</strong>&nbsp;&nbsp;(평균 ${expected.toLocaleString()}회)`;
}

// ── 등급업 시뮬레이션 ────────────────────────────

let _guRunning = false, _guStop = false, _guCount = 0, _guSucc = 0;

function _renderGradeUpResults() {
  const el = document.getElementById('cubeGradeUpResults');
  if (!el || _guCount === 0) return;
  const type  = _cubeActiveType();
  const meso  = CUBE_MESO[type] ?? null;
  const rate  = (_guSucc / _guCount * 100).toFixed(4);
  el.innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">사용 횟수</span><span class="sf-res-val big">${_guCount.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">등급업 횟수</span><span class="sf-res-val" style="color:var(--success)">${_guSucc.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">등급업 확률</span><span class="sf-res-val">${rate}%</span></div>
    ${meso != null ? `<div class="sf-res-item"><span class="sf-res-label">소요 메소</span><span class="sf-res-val">${fmtMeso(_guCount * meso)}</span></div>` : ''}
    ${_guSucc > 0 ? `<div class="sf-res-item"><span class="sf-res-label">등급업까지 평균</span><span class="sf-res-val">${Math.round(_guCount / _guSucc).toLocaleString()} 회</span></div>` : ''}`;
}

// ── 옵션 뽑기 — 수동 입력 ───────────────────────

function _cubeAddGoalRow() {
  const container = document.getElementById('cubeManualGoals');
  if (!container || container.children.length >= 3) return;
  const row = document.createElement('div');
  row.className = 'cube-manual-goal-row';
  row.innerHTML = `
    <input type="text" class="inp cube-goal-label" placeholder="옵션명 (예: 공격력 21%)">
    <input type="number" class="inp cube-goal-prob" placeholder="확률" step="0.0001" min="0" max="100">
    <span class="cube-goal-unit">% / 줄</span>
    <button class="cube-goal-del" title="삭제">✕</button>`;
  row.querySelector('.cube-goal-del').addEventListener('click', () => {
    row.remove();
    _updateAddGoalBtn();
  });
  container.appendChild(row);
  _updateAddGoalBtn();
}

function _updateAddGoalBtn() {
  const container = document.getElementById('cubeManualGoals');
  const btn       = document.getElementById('cubeAddGoalBtn');
  if (!btn || !container) return;
  btn.disabled = container.children.length >= 3;
}

function _cubeGetGoalProbs() {
  return [...document.querySelectorAll('.cube-manual-goal-row')].map(row => ({
    label: row.querySelector('.cube-goal-label')?.value.trim() || '',
    prob:  parseFloat(row.querySelector('.cube-goal-prob')?.value) || 0,
  })).filter(g => g.prob > 0);
}

// 포함-배제로 (goals on distinct lines) 확률 계산
// goals: [{prob}], prob = 한 줄에 뜰 확률 (0~100)
function _cubeManualExactP(goals) {
  const n = goals.length;
  if (!n) return 0;

  const probs = goals.map(g => g.prob / 100);  // 0~1
  const totalP = probs.reduce((s, p) => s + p, 0);

  // 합성 lineData — 목표 옵션들 + 나머지를 filler로 채워 합=1
  const names = probs.map((_, i) => `__g${i}__`);
  const buildLine = () => {
    const opts = probs.map((p, i) => ({ option: names[i], probability: p }));
    const rest = 1 - totalP;
    if (rest > 0) opts.push({ option: '__rest__', probability: rest });
    return opts;
  };
  const lineData = { line1: buildLine(), line2: buildLine(), line3: buildLine() };
  return _cubeExactP(lineData, names);
}

// Bernoulli 근사 시뮬레이션 (각 줄 독립)
function _cubeManualRollSuccess(goalProbs) {
  const n = goalProbs.length;
  const appears = goalProbs.map(p => [Math.random() < p, Math.random() < p, Math.random() < p]);
  const usedLines = [false, false, false];
  for (let g = 0; g < n; g++) {
    let found = false;
    for (let l = 0; l < 3; l++) {
      if (!usedLines[l] && appears[g][l]) { usedLines[l] = true; found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

// ── 포함-배제 (기존 유지) ───────────────────────

function _cubeLineProb(lineOpts, option) {
  const total = lineOpts.reduce((s, o) => s + o.probability, 0);
  if (!total) return 0;
  return lineOpts.filter(o => o.option === option).reduce((s, o) => s + o.probability, 0) / total;
}

function _cubeExactP(lineData, goals) {
  const n = goals.length;
  if (!n) return 0;
  const lines = ['line1', 'line2', 'line3'].map(k => lineData[k] || []);
  const p = lines.map(opts => goals.map(g => _cubeLineProb(opts, g)));

  const injections = [];
  if (n === 1) {
    for (let i = 0; i < 3; i++) injections.push([i]);
  } else if (n === 2) {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (i !== j) injections.push([i, j]);
  } else {
    [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].forEach(s => injections.push(s));
  }

  const m = injections.length;
  let result = 0;
  for (let mask = 1; mask < (1 << m); mask++) {
    const chosen = [];
    for (let b = 0; b < m; b++) if (mask & (1 << b)) chosen.push(b);
    const sign = chosen.length % 2 === 1 ? 1 : -1;
    const req = [new Set(), new Set(), new Set()];
    for (const bi of chosen) {
      const inj = injections[bi];
      for (let k = 0; k < n; k++) req[inj[k]].add(k);
    }
    let prob = 1, valid = true;
    for (let l = 0; l < 3; l++) {
      const reqs = [...req[l]];
      if (!reqs.length) continue;
      const strs = [...new Set(reqs.map(k => goals[k]))];
      if (strs.length > 1) { valid = false; break; }
      prob *= p[l][reqs[0]];
    }
    if (valid) result += sign * prob;
  }
  return result;
}

// ── 옵션 뽑기 시뮬 상태 ─────────────────────────

let _cubeRunning = false, _cubeStop = false, _cubeUseCount = 0, _cubeSucc = 0;

function _cubeRenderResults() {
  const el = document.getElementById('cubeResults');
  if (!el || _cubeUseCount === 0) return;
  const type = _cubeActiveType();
  const meso = CUBE_MESO[type] ?? null;
  const rate = (_cubeSucc / _cubeUseCount * 100).toFixed(4);
  el.innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">사용 횟수</span><span class="sf-res-val big">${_cubeUseCount.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공 횟수</span><span class="sf-res-val" style="color:var(--success)">${_cubeSucc.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공률</span><span class="sf-res-val">${rate}%</span></div>
    ${meso != null ? `<div class="sf-res-item"><span class="sf-res-label">소요 메소</span><span class="sf-res-val">${fmtMeso(_cubeUseCount * meso)}</span></div>` : ''}
    ${_cubeSucc > 0 ? `<div class="sf-res-item"><span class="sf-res-label">성공까지 평균</span><span class="sf-res-val">${Math.round(_cubeUseCount / _cubeSucc).toLocaleString()} 회</span></div>` : ''}`;
}

// ── 초기화 ──────────────────────────────────────

async function initCube() {
  // 첫 목표 옵션 행 추가
  _cubeAddGoalRow();

  // 큐브 타입 버튼
  document.querySelectorAll('.cube-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cube-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _cubePopulateGradeFrom();
    });
  });

  // 현재 등급 변경 → 정보 갱신
  document.getElementById('cubeGradeFrom')?.addEventListener('change', _cubeRenderGradeUpInfo);

  // + 목표 옵션 추가 버튼
  document.getElementById('cubeAddGoalBtn')?.addEventListener('click', _cubeAddGoalRow);

  // 등급업 확률 초기화
  _cubePopulateGradeFrom();

  // ── 등급업 시뮬레이션 ──
  document.getElementById('cubeGradeUpRunBtn')?.addEventListener('click', () => {
    if (_guRunning) return;
    const type  = _cubeActiveType();
    const from  = document.getElementById('cubeGradeFrom')?.value;
    const rates = _cubeGradeUpRates(type);
    const p     = rates[from];
    if (!p) { alert('선택한 큐브/등급 조합의 등급업 데이터가 없습니다.'); return; }

    _guCount = 0; _guSucc = 0; _guRunning = true; _guStop = false;
    document.getElementById('cubeGradeUpRunBtn').disabled  = true;
    document.getElementById('cubeGradeUpStopBtn').disabled = false;

    let lastRender = 0;
    function tick(ts) {
      if (_guStop) {
        _guRunning = false;
        document.getElementById('cubeGradeUpRunBtn').disabled  = false;
        document.getElementById('cubeGradeUpStopBtn').disabled = true;
        _renderGradeUpResults();
        return;
      }
      for (let i = 0; i < 500; i++) {
        _guCount++;
        if (Math.random() < p) _guSucc++;
      }
      if (ts - lastRender > 100) { _renderGradeUpResults(); lastRender = ts; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  document.getElementById('cubeGradeUpStopBtn')?.addEventListener('click', () => { _guStop = true; });

  // ── 옵션 뽑기 기댓값 계산 ──
  document.getElementById('cubeExpectedBtn')?.addEventListener('click', () => {
    const goals = _cubeGetGoalProbs();
    const el    = document.getElementById('cubeResults');
    if (!goals.length) { alert('목표 옵션 확률을 1개 이상 입력하세요.'); return; }

    const type      = _cubeActiveType();
    const meso      = CUBE_MESO[type] ?? null;
    const pSuccess  = _cubeManualExactP(goals);
    if (!pSuccess)  { el.innerHTML = '<p class="empty">확률이 0입니다. 입력값을 확인하세요.</p>'; return; }
    const eCubes    = 1 / pSuccess;

    el.innerHTML = `
      <div class="sf-res-item"><span class="sf-res-label">성공 확률</span><span class="sf-res-val big">${(pSuccess * 100).toFixed(4)}%</span></div>
      <div class="sf-res-item"><span class="sf-res-label">기댓값 평균 큐브 수</span><span class="sf-res-val">${Math.ceil(eCubes).toLocaleString()} 개</span></div>
      ${meso != null ? `<div class="sf-res-item"><span class="sf-res-label">기댓값 평균 메소</span><span class="sf-res-val">${fmtMeso(Math.round(eCubes * meso))}</span></div>` : ''}
      <div class="sf-res-item"><span class="sf-res-label">10% 확률 이내</span><span class="sf-res-val">${Math.ceil(eCubes * 0.105).toLocaleString()} 개</span></div>
      <div class="sf-res-item"><span class="sf-res-label">90% 확률 이내</span><span class="sf-res-val" style="color:var(--danger)">${Math.ceil(eCubes * 2.303).toLocaleString()} 개</span></div>`;
  });

  // ── 옵션 뽑기 시뮬레이션 ──
  document.getElementById('cubeRunBtn')?.addEventListener('click', () => {
    if (_cubeRunning) return;
    const goals = _cubeGetGoalProbs();
    if (!goals.length) { alert('목표 옵션 확률을 1개 이상 입력하세요.'); return; }
    const goalProbs = goals.map(g => g.prob / 100);

    _cubeUseCount = 0; _cubeSucc = 0; _cubeRunning = true; _cubeStop = false;
    document.getElementById('cubeRunBtn').disabled  = true;
    document.getElementById('cubeStopBtn').disabled = false;

    let lastRender = 0;
    function tick(ts) {
      if (_cubeStop) {
        _cubeRunning = false;
        document.getElementById('cubeRunBtn').disabled  = false;
        document.getElementById('cubeStopBtn').disabled = true;
        _cubeRenderResults();
        return;
      }
      for (let i = 0; i < 500; i++) {
        _cubeUseCount++;
        if (_cubeManualRollSuccess(goalProbs)) _cubeSucc++;
      }
      if (ts - lastRender > 100) { _cubeRenderResults(); lastRender = ts; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  document.getElementById('cubeStopBtn')?.addEventListener('click', () => { _cubeStop = true; });
}
