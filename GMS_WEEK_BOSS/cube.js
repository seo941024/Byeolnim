/* ═══════════════════════════════════════════════
   큐브 시뮬레이터
═══════════════════════════════════════════════ */
const CUBE_PARTS = ["무기","엠블렘","보조무기(포스실드, 소울링 제외)","포스실드, 소울링","방패","모자","상의","한벌옷","하의","신발","장갑","망토","벨트","어깨장식","얼굴장식","눈장식","귀고리","반지","펜던트","기계심장"];
const CUBE_MESO  = { red: 12_000_000, black: 22_000_000 };

// ── 장인/명장 큐브 (KMS 풀데이터 cube_table.js 기반) ──
// UI 버튼 data-type → CUBE_TABLE 큐브 키 (등급 상한 기준 매핑: 명장=레전드리, 장인=유니크)
const _CUBE_TABLE_TYPE = { master: 'ARTISAN', craft: 'MASTER' };
const _GRADE_ORDER = ['RARE', 'EPIC', 'UNIQUE', 'LEGENDARY'];
const _GRADE_KR    = { RARE: '레어', EPIC: '에픽', UNIQUE: '유니크', LEGENDARY: '레전드리' };
// 장인/명장은 이벤트성이라 메소 단가 미정 → null (결과에서 메소 항목 생략)
function _cubeMeso(type) { return CUBE_MESO[type] != null ? CUBE_MESO[type] : null; }
function _cubeIsTableType(type) { return type === 'craft' || type === 'master'; }

function _cubeTableAvailLevels(dataCube, part) {
  const t = window.CUBE_TABLE; if (!t) return [];
  const set = new Set();
  for (const k of Object.keys(t.optionTable)) {
    const [c, p, l] = k.split('|');
    if (c === dataCube && p === part) set.add(+l);
  }
  return [...set].sort((a, b) => a - b);
}
function _cubeTableBracket(dataCube, part, lv) {
  const levels = _cubeTableAvailLevels(dataCube, part);
  if (!levels.length) return null;
  let pick = levels[0];
  for (const L of levels) if (L <= lv) pick = L;
  return pick;
}
function _cubeTableGrades(dataCube) {
  const t = window.CUBE_TABLE; if (!t) return [];
  const og = t.optionGrade[dataCube] || {};
  return _GRADE_ORDER.filter(g => og[g]);
}
// (큐브,부위,레벨,목표등급) → 기존 형식 {line1,line2,line3} 분포 합성
function _cubeTableBuildLines(dataCube, part, lv, grade) {
  const t = window.CUBE_TABLE; if (!t) return null;
  const bracket = _cubeTableBracket(dataCube, part, lv);
  if (bracket == null) return null;
  const og = (t.optionGrade[dataCube] || {})[grade];
  if (!og) return null;
  const gi = _GRADE_ORDER.indexOf(grade);
  const lowerGrade = gi > 0 ? _GRADE_ORDER[gi - 1] : null;
  const curOpts = t.optionTable[`${dataCube}|${part}|${bracket}|${grade}`] || [];
  const lowOpts = lowerGrade ? (t.optionTable[`${dataCube}|${part}|${bracket}|${lowerGrade}`] || []) : [];
  const build = lineNo => {
    const g = og.find(o => o.line === lineNo) || { currentGradeProb: 1, lowerGradeProb: 0 };
    const cp = g.currentGradeProb || 0, lp = g.lowerGradeProb || 0;
    const out = [];
    for (const o of curOpts) out.push({ option: o.name, probability: cp * o.probability });
    if (lp && lowOpts.length) for (const o of lowOpts) out.push({ option: o.name, probability: lp * o.probability });
    return out;
  };
  return { line1: build(1), line2: build(2), line3: build(3) };
}

// 단일 스탯 %옵션 파싱 — GMS("STR +12%") / KMS("STR : +12%") 양쪽 지원
function _cubeParsePctStat(s) {
  const m = /^(STR|DEX|INT|LUK)\s*:?\s*\+(\d+)%$/.exec(s);
  return m ? { stat: m[1], val: m[2] } : null;
}
// 옵션 문자열이 해당 수치의 올스탯인가 (GMS/KMS 표기 모두)
function _cubeIsAllStat(s, val) {
  return s === `올스탯 +${val}%` || s === `올스탯 : +${val}%`;
}
// 목표 옵션이 굴린 옵션으로 충족되는가 (정확 일치 또는 동일 수치 올스탯)
function _cubeOptMatch(rolled, goal) {
  if (rolled === goal) return true;
  const m = _cubeParsePctStat(goal);
  return !!(m && _cubeIsAllStat(rolled, m.val));
}

function _cubeLineProb(lineOpts, option) {
  const total = lineOpts.reduce((s, o) => s + o.probability, 0);
  if (!total) return 0;
  return lineOpts
    .filter(o => _cubeOptMatch(o.option, option))
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
  const type = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
  const part = document.getElementById('cubePart').value;
  const lv   = parseInt(document.getElementById('cubeLevel').value);
  if (!part) return null;

  // 장인/명장: KMS 풀데이터에서 선택 등급 기준 합성
  if (_cubeIsTableType(type)) {
    const grade = document.getElementById('cubeGrade')?.value || 'LEGENDARY';
    return _cubeTableBuildLines(_CUBE_TABLE_TYPE[type], part, lv, grade);
  }

  // 레드/블랙: 기존 GMS 데이터 (레전드리 고정)
  if (!_cubeData) return null;
  const range = _cubeGetLevelRange(lv);
  if (!range) return null;
  const lineData = _cubeData[type]?.[range]?.[part];
  if (!lineData) return null;
  return _cubeApplyRename(lineData);
}

// 활성 큐브에 맞춰 등급 드롭다운 채우기 (높은 등급 우선, 레드/블랙은 레전드리 고정)
function _cubePopulateGrades() {
  const sel = document.getElementById('cubeGrade');
  if (!sel) return;
  const type = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
  const grades = _cubeIsTableType(type) ? _cubeTableGrades(_CUBE_TABLE_TYPE[type]) : ['LEGENDARY'];
  const ordered = grades.slice().reverse();          // 레전드리 → 레어
  const prev = sel.value;
  sel.innerHTML = ordered.map(g => `<option value="${g}">${_GRADE_KR[g]}</option>`).join('');
  sel.value = ordered.includes(prev) ? prev : ordered[0];
  sel.disabled = ordered.length <= 1;
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
    let found = false;
    for (let i = 0; i < 3; i++) {
      if (used[i]) continue;
      if (_cubeOptMatch(lines[i], opt)) {
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
  const meso = _cubeMeso(type);
  const rate  = (_cubeSucc / _cubeUseCount * 100).toFixed(4);
  el.innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">사용 횟수</span><span class="sf-res-val big">${_cubeUseCount.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공 횟수</span><span class="sf-res-val" style="color:var(--success)">${_cubeSucc.toLocaleString()}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">성공률</span><span class="sf-res-val">${rate}%</span></div>
    ${meso != null ? `<div class="sf-res-item"><span class="sf-res-label">소요 메소</span><span class="sf-res-val">${fmtMeso(_cubeUseCount * meso)}</span></div>` : ''}
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
      if (btn.disabled) return;
      document.querySelectorAll('.cube-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _cubePopulateGrades();
      _cubeRefreshGoalOpts();
    });
  });

  // 부위/레벨/등급 변경 시 옵션 갱신
  ['cubePart','cubeLevel','cubeGrade'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', _cubeRefreshGoalOpts);
  });

  // 데이터 미리 로드 후 옵션 초기화
  try {
    await _loadCubeData();
    _cubePopulateGrades();
    _cubeRefreshGoalOpts();
  } catch(e) { console.error('큐브 데이터 로드 실패', e); }

  // 기댓값 계산
  document.getElementById('cubeExpectedBtn')?.addEventListener('click', () => {
    const goals    = _cubeGetGoals();
    const lineData = _cubeGetLineData();
    if (!goals.length)  { alert('목표 옵션을 1개 이상 선택하세요.'); return; }
    if (!lineData)      { alert('레벨과 부위를 올바르게 설정하세요.'); return; }

    const type = document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
    const meso = _cubeMeso(type);

    const el = document.getElementById('cubeResults');
    const pSuccess = _cubeExactP(lineData, goals);
    if (!pSuccess) { el.innerHTML = '<p class="empty">해당 옵션 조합 데이터가 없습니다.</p>'; return; }
    const eCubes   = 1 / pSuccess;

    el.innerHTML = `
      <div class="sf-res-item"><span class="sf-res-label">성공 확률</span><span class="sf-res-val big">${(pSuccess * 100).toFixed(4)}%</span></div>
      <div class="sf-res-item"><span class="sf-res-label">기댓값 평균 큐브 수</span><span class="sf-res-val">${Math.ceil(eCubes).toLocaleString()} 개</span></div>
      ${meso != null ? `<div class="sf-res-item"><span class="sf-res-label">기댓값 평균 메소</span><span class="sf-res-val">${fmtMeso(Math.round(eCubes * meso))}</span></div>` : ''}
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

