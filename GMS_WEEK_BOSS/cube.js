/* ═══════════════════════════════════════════════
   큐브 시뮬레이터
═══════════════════════════════════════════════ */
const CUBE_PARTS = ["무기","엠블렘","보조무기(포스실드, 소울링 제외)","포스실드, 소울링","방패","모자","상의","한벌옷","하의","신발","장갑","망토","벨트","어깨장식","얼굴장식","눈장식","귀고리","반지","펜던트","기계심장"];
const CUBE_MESO  = { red: 12_000_000, black: 22_000_000 };

function _cubeLineProb(lineOpts, option) {
  const total = lineOpts.reduce((s, o) => s + o.probability, 0);
  if (!total) return 0;
  const m = /^(STR|DEX|INT|LUK) \+(\d+)%$/.exec(option);
  return lineOpts
    .filter(o => o.option === option || (m && o.option === `올스탯 +${m[2]}%`))
    .reduce((s, o) => s + o.probability, 0) / total;
}

function _cubeExactP(lineData, goals) {
  const n = goals.length;
  if (!n) return 0;
  const lines = ['line1','line2','line3'].map(k => lineData[k] || []);
  const p = lines.map(opts => goals.map(g => _cubeLineProb(opts, g)));

  // 가능한 모든 단사함수 goals→lines 열거
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

    // 각 line에 요구되는 goal index Set 구성
    const req = [new Set(), new Set(), new Set()];
    for (const bi of chosen) {
      const inj = injections[bi];
      for (let k = 0; k < n; k++) req[inj[k]].add(k);
    }

    // 같은 line에 서로 다른 option string이 요구되면 불가능
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

let _cubeData     = null;
let _cubeRunning  = false;
let _cubeStop     = false;
let _cubeUseCount = 0;
let _cubeSucc     = 0;

async function _loadCubeData() {
  if (_cubeData) return _cubeData;
  _cubeData = window.CUBE_DATA;
  return _cubeData;
}

function _cubeGetLevelRange(lv) {
  if (lv >= 120 && lv <= 200) return '120~200';
  if (lv >= 201 && lv <= 250) return '201~250';
  return null;
}

const _CUBE_RENAME_160 = {
  "STR +12%":"STR +13%","DEX +12%":"DEX +13%","INT +12%":"INT +13%","LUK +12%":"LUK +13%",
  "공격력 +12%":"공격력 +13%","마력 +12%":"마력 +13%","크리티컬 확률 +12%":"크리티컬 확률 +13%",
  "데미지 +12%":"데미지 +13%","올스탯 +9%":"올스탯 +10%","STR +9%":"STR +10%",
  "DEX +9%":"DEX +10%","INT +9%":"INT +10%","LUK +9%":"LUK +10%",
  "공격력 +9%":"공격력 +10%","마력 +9%":"마력 +10%","크리티컬 확률 +9%":"크리티컬 확률 +10%",
  "데미지 +9%":"데미지 +10%","올스탯 +6%":"올스탯 +7%",
  "최대 HP +12%":"최대 HP +13%","최대 HP +9%":"최대 HP +10%",
  "최대 MP +12%":"최대 MP +13%","최대 MP +9%":"최대 MP +10%",
};

function _cubeIsLv160() {
  const lv = parseInt(document.getElementById('cubeLevel').value);
  return lv >= 160 && lv <= 200;
}

function _cubeRenameOpt(name) {
  return (_cubeIsLv160() && _CUBE_RENAME_160[name]) || name;
}

function _cubeApplyRename(lineData) {
  if (!lineData || !_cubeIsLv160()) return lineData;
  const rename = arr => arr ? arr.map(o => ({ option: _CUBE_RENAME_160[o.option] || o.option, probability: o.probability })) : arr;
  return { line1: rename(lineData.line1), line2: rename(lineData.line2), line3: rename(lineData.line3) };
}

function _weightedRandom(options) {
  const total = options.reduce((s, o) => s + o.probability, 0);
  let rand = Math.random() * total;
  for (const o of options) { rand -= o.probability; if (rand <= 0) return o.option; }
  return options[options.length-1].option;
}

function _cubeGetLineData() {
  if (!_cubeData) return null;
  const type  = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
  const part  = document.getElementById('cubePart').value;
  const range = _cubeGetLevelRange(parseInt(document.getElementById('cubeLevel').value));
  if (!part || !range) return null;
  const lineData = _cubeData[type]?.[range]?.[part];
  if (!lineData) return null;
  return _cubeApplyRename(lineData);
}

function _cubeRollOnce(lineData) {
  const line1 = _weightedRandom(lineData.line1 || []);
  const line2 = _weightedRandom(lineData.line2 || []);
  const line3 = _weightedRandom(lineData.line3 || []);
  return { line1, line2, line3 };
}

function _cubeGetGoals() {
  return [1, 2, 3]
    .map(i => document.getElementById(`cubeGoalSel${i}`)?.value || '-')
    .filter(v => v && v !== '-');
}

function _cubeCheckSuccess(rolled, goals) {
  if (!goals) goals = _cubeGetGoals();
  if (!goals.length) return false;
  const lines = [rolled.line1, rolled.line2, rolled.line3];
  const used  = [false, false, false];
  for (const opt of goals) {
    const m = /^(STR|DEX|INT|LUK) \+(\d+)%$/.exec(opt);
    let found = false;
    for (let i = 0; i < 3; i++) {
      if (used[i]) continue;
      if (lines[i] === opt || (m && lines[i] === `올스탯 +${m[2]}%`)) {
        used[i] = true; found = true; break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function _cubeRenderResults() {
  const el = document.getElementById('cubeResults');
  if (!el) return;
  if (_cubeUseCount === 0) { el.innerHTML = '<p class="empty">결과가 없습니다.</p>'; return; }
  const type = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
  const meso = CUBE_MESO[type] || 12_000_000;
  const rate  = (_cubeSucc / _cubeUseCount * 100).toFixed(4);
  el.innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">사용 횟수</span><span class="sf-res-val big">${_cubeUseCount.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공 횟수</span><span class="sf-res-val" style="color:var(--success)">${_cubeSucc.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공률</span><span class="sf-res-val">${rate}%</span></div>
    <div class="sf-res-item"><span class="sf-res-label">소요 메소</span><span class="sf-res-val">${fmtMeso(_cubeUseCount * meso)}</span></div>
    ${_cubeSucc > 0 ? `<div class="sf-res-item"><span class="sf-res-label">성공까지 평균 횟수</span><span class="sf-res-val">${Math.round(_cubeUseCount/_cubeSucc).toLocaleString()} 회</span></div>` : ''}`;
}

function _cubePopulateGoalOpts(lineData) {
  const allOpts = new Set();
  ['line1','line2','line3'].forEach(k => {
    (lineData?.[k] || []).forEach(o => allOpts.add(o.option));
  });
  const opts = ['-', ...allOpts];
  const html  = opts.map(o => `<option value="${o}">${o}</option>`).join('');
  for (let i = 1; i <= 3; i++) {
    const sel = document.getElementById(`cubeGoalSel${i}`);
    if (sel) sel.innerHTML = html;
  }
}

// 160 역방향 매핑
const _CUBE_RENAME_160_REV = Object.fromEntries(
  Object.entries(_CUBE_RENAME_160).map(([k, v]) => [v, k])
);

function _cubeRefreshGoalOpts() {
  const lv = parseInt(document.getElementById('cubeLevel')?.value);
  if (!lv || lv < 120 || lv > 250) return;

  const prev = [1, 2, 3].map(i => document.getElementById(`cubeGoalSel${i}`)?.value || '-');

  const lineData = _cubeGetLineData();
  if (!lineData) return;
  _cubePopulateGoalOpts(lineData);

  // 저장값 복원 — 레벨에 따라 리네임 적용
  const isLv160 = _cubeIsLv160();
  prev.forEach((val, idx) => {
    if (!val || val === '-') return;
    // 현재 레벨 기준으로 옵션명 변환
    const mapped = isLv160
      ? (_CUBE_RENAME_160[val] || val)
      : (_CUBE_RENAME_160_REV[val] || val);
    const sel = document.getElementById(`cubeGoalSel${idx + 1}`);
    if (!sel) return;
    const exists = [...sel.options].some(o => o.value === mapped);
    sel.value = exists ? mapped : '-';
  });
}

async function initCube() {
  // 부위 드롭다운
  const partSel = document.getElementById('cubePart');
  if (partSel) {
    partSel.innerHTML = CUBE_PARTS.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  // 큐브 타입 버튼
  document.querySelectorAll('.cube-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cube-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _cubeRefreshGoalOpts();
    });
  });

  // 부위/레벨 변경 시 옵션 갱신
  ['cubePart','cubeLevel'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', _cubeRefreshGoalOpts);
    document.getElementById(id)?.addEventListener('input',  _cubeRefreshGoalOpts);
  });

  // 데이터 미리 로드 후 옵션 초기화
  try {
    await _loadCubeData();
    _cubeRefreshGoalOpts();
  } catch(e) { console.error('큐브 데이터 로드 실패', e); }

  // 기댓값 계산
  document.getElementById('cubeExpectedBtn')?.addEventListener('click', () => {
    const goals    = _cubeGetGoals();
    const lineData = _cubeGetLineData();
    if (!goals.length)  { alert('목표 옵션을 1개 이상 선택하세요.'); return; }
    if (!lineData)      { alert('레벨과 부위를 올바르게 설정하세요.'); return; }

    const type = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
    const meso = CUBE_MESO[type] || 12_000_000;

    const el = document.getElementById('cubeResults');
    const pSuccess = _cubeExactP(lineData, goals);
    if (!pSuccess) { el.innerHTML = '<p class="empty">해당 옵션 조합 데이터가 없습니다.</p>'; return; }
    const eCubes   = 1 / pSuccess;
    const eMeso    = eCubes * meso;

    el.innerHTML = `
      <div class="sf-res-item"><span class="sf-res-label">성공 확률</span><span class="sf-res-val big">${(pSuccess * 100).toFixed(4)}%</span></div>
      <div class="sf-res-item"><span class="sf-res-label">기댓값 평균 큐브 수</span><span class="sf-res-val">${Math.ceil(eCubes).toLocaleString()} 개</span></div>
      <div class="sf-res-item"><span class="sf-res-label">기댓값 평균 메소</span><span class="sf-res-val">${fmtMeso(Math.round(eMeso))}</span></div>
      <div class="sf-res-item"><span class="sf-res-label">10% 확률 이내</span><span class="sf-res-val">${Math.ceil(eCubes * 0.105).toLocaleString()} 개</span></div>
      <div class="sf-res-item"><span class="sf-res-label">90% 확률 이내</span><span class="sf-res-val" style="color:var(--danger)">${Math.ceil(eCubes * 2.303).toLocaleString()} 개</span></div>`;
  });

  // 시뮬레이션 시작 (RAF 기반 — UI 안 멈춤)
  document.getElementById('cubeRunBtn')?.addEventListener('click', () => {
    if (_cubeRunning) return;
    const goals    = _cubeGetGoals();
    const lineData = _cubeGetLineData();
    if (!goals.length)  { alert('목표 옵션을 1개 이상 선택하세요.'); return; }
    if (!lineData)      { alert('레벨과 부위를 올바르게 설정하세요.'); return; }

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
        if (_cubeCheckSuccess(_cubeRollOnce(lineData), goals)) _cubeSucc++;
      }
      if (ts - lastRender > 100) { _cubeRenderResults(); lastRender = ts; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  document.getElementById('cubeStopBtn')?.addEventListener('click', () => { _cubeStop = true; });
}

