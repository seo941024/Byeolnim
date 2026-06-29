/* ═══════════════════════════════════════════════
   큐브 기댓값 계산기
═══════════════════════════════════════════════ */

const CUBE_MESO     = { red: 12_000_000, black: 22_000_000 };
const CUBE_PARTS    = ["무기","엠블렘","보조무기(포스실드, 소울링 제외)","포스실드, 소울링","방패","모자","상의","한벌옷","하의","신발","장갑","망토","벨트","어깨장식","얼굴장식","눈장식","귀고리","반지","펜던트","기계심장"];
const _CUBE_TABLE_KEY = { red:'RED', black:'POTENTIAL', master:'ARTISAN', craft:'MASTER' };
const _GRADE_ORDER  = ['RARE','EPIC','UNIQUE','LEGENDARY'];
const _GRADE_KR     = { RARE:'레어', EPIC:'에픽', UNIQUE:'유니크', LEGENDARY:'레전드리' };

// GMS 160~249: 보스데미지·방무시 제외 %스탯 수치가 KMS보다 1 높음
const _NO_GMS_ADJ = ['보스 몬스터 공격 시 데미지','몬스터 방어율 무시'];

function _cubeActiveType() {
  return document.querySelector('.cube-type-btn.active')?.dataset.type || 'red';
}
function _cubeDataKey() {
  return _CUBE_TABLE_KEY[_cubeActiveType()] || 'RED';
}
function _cubeLv()    { return parseInt(document.getElementById('cubeLevel')?.value || '0'); }
function _cubePart()  { return document.getElementById('cubePart')?.value || ''; }
function _cubeGrade() { return document.getElementById('cubeGrade')?.value || 'LEGENDARY'; }

// lv 160~249: KMS 수치 = GMS 수치 - 1 (보스데미지·방무시 제외)
function _gmsToKms(category, gmsVal) {
  const lv = _cubeLv();
  if (lv >= 160 && lv < 250 && !_NO_GMS_ADJ.includes(category)) return gmsVal - 1;
  return gmsVal;
}

// ── 데이터 헬퍼 ─────────────────────────────────

function _bracketFor(dataCube, part, lv) {
  const t = window.CUBE_TABLE; if (!t) return null;
  const lvs = [...new Set(
    Object.keys(t.optionTable)
      .filter(k => { const [c,p]=k.split('|'); return c===dataCube&&p===part; })
      .map(k => +k.split('|')[2])
  )].sort((a,b)=>a-b);
  if (!lvs.length) return null;
  let pick = lvs[0];
  for (const L of lvs) if (L <= lv) pick = L;
  return pick;
}

// optionTable에서 해당 조합의 옵션 배열 (없으면 [])
function _rawOpts(dataCube, part, lv, grade) {
  const bracket = _bracketFor(dataCube, part, lv);
  if (!bracket) return [];
  return window.CUBE_TABLE?.optionTable[`${dataCube}|${part}|${bracket}|${grade}`] || [];
}

// "공격력 : +13%" → {cat:"공격력", val:13, pct:true}
// "STR : +4"      → {cat:"STR",    val:4,  pct:false}
// 기타            → {cat:fullName, val:null, pct:false}
function _parseName(name) {
  const m = /^(.+?) : \+(\d+\.?\d*)(%?)$/.exec(name);
  if (m) return { cat: m[1], val: +m[2], pct: !!m[3] };
  return { cat: name, val: null, pct: false };
}

// 해당 컨텍스트에서 카테고리 목록 (표시명, unit 포함)
function _getCategories(dataCube, part, lv, grade) {
  const opts = _rawOpts(dataCube, part, lv, grade);
  const seen = new Map();
  for (const o of opts) {
    const p = _parseName(o.name);
    if (!seen.has(p.cat)) seen.set(p.cat, p.pct);
  }
  return [...seen.entries()].map(([cat, pct]) => ({ cat, unit: pct ? '%' : '' }));
}

// ── 목표 옵션 행 UI ──────────────────────────────

function _buildCatOptions(dataCube, part, lv, grade) {
  const cats = _getCategories(dataCube, part, lv, grade);
  if (!cats.length) return '<option value="">— 데이터 없음 —</option>';
  return cats.map(({ cat, unit }) =>
    `<option value="${cat}" data-unit="${unit}">${cat}${unit ? ' ' + unit : ''}</option>`
  ).join('');
}

function _addGoalRow() {
  const container = document.getElementById('cubeGoalRows');
  if (!container || container.children.length >= 3) return;

  const dataCube = _cubeDataKey();
  const part     = _cubePart();
  const lv       = _cubeLv();
  const grade    = _cubeGrade();

  const row = document.createElement('div');
  row.className = 'cube-goal-row';
  row.innerHTML = `
    <select class="sel cube-opt-cat">${_buildCatOptions(dataCube, part, lv, grade)}</select>
    <input  type="number" class="inp cube-opt-val" placeholder="수치" min="0" step="1">
    <span   class="cube-goal-unit"></span>
    <button class="cube-goal-del" title="삭제">✕</button>`;

  const catSel = row.querySelector('.cube-opt-cat');
  const unitEl = row.querySelector('.cube-goal-unit');

  // 카테고리 선택 시 unit 갱신
  const syncUnit = () => {
    const opt = catSel.selectedOptions[0];
    unitEl.textContent = opt?.dataset.unit || '';
  };
  catSel.addEventListener('change', syncUnit);
  syncUnit();

  row.querySelector('.cube-goal-del').addEventListener('click', () => {
    row.remove();
    _updateAddBtn();
  });

  container.appendChild(row);
  _updateAddBtn();
}

function _updateAddBtn() {
  const btn = document.getElementById('cubeAddGoalBtn');
  if (btn) btn.disabled = document.querySelectorAll('.cube-goal-row').length >= 3;
}

// 컨텍스트 변경 시 카테고리 드롭다운 갱신 (선택 유지)
function _refreshGoalRows() {
  const dataCube = _cubeDataKey();
  const part     = _cubePart();
  const lv       = _cubeLv();
  const grade    = _cubeGrade();
  const catHtml  = _buildCatOptions(dataCube, part, lv, grade);

  document.querySelectorAll('.cube-goal-row').forEach(row => {
    const catSel  = row.querySelector('.cube-opt-cat');
    const unitEl  = row.querySelector('.cube-goal-unit');
    const prevCat = catSel.value;
    catSel.innerHTML = catHtml;
    if (prevCat) catSel.value = prevCat;
    const opt = catSel.selectedOptions[0];
    unitEl.textContent = opt?.dataset.unit || '';
  });
}

// ── 등급 드롭다운 ────────────────────────────────

function _populateGrade() {
  const sel      = document.getElementById('cubeGrade'); if (!sel) return;
  const dataCube = _cubeDataKey();
  const t        = window.CUBE_TABLE; if (!t) return;
  const grades   = _GRADE_ORDER.filter(g => t.optionGrade[dataCube]?.[g]);
  const prev     = sel.value;
  sel.innerHTML  = grades.slice().reverse()
    .map(g => `<option value="${g}">${_GRADE_KR[g]}</option>`).join('');
  if (grades.includes(prev)) sel.value = prev;
}

// ── 확률 계산 ────────────────────────────────────

function _lineProb(lineOpts, option) {
  const total = lineOpts.reduce((s,o)=>s+o.probability,0);
  if (!total) return 0;
  return lineOpts.filter(o=>o.option===option).reduce((s,o)=>s+o.probability,0)/total;
}

function _cubeExactP(lineData, goals) {
  const n = goals.length; if (!n) return 0;
  const lines = ['line1','line2','line3'].map(k=>lineData[k]||[]);
  const p = lines.map(opts=>goals.map(g=>_lineProb(opts,g)));
  const injections=[];
  if(n===1){for(let i=0;i<3;i++)injections.push([i]);}
  else if(n===2){for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(i!==j)injections.push([i,j]);}
  else{[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]].forEach(s=>injections.push(s));}
  const m=injections.length;
  let result=0;
  for(let mask=1;mask<(1<<m);mask++){
    const chosen=[];for(let b=0;b<m;b++)if(mask&(1<<b))chosen.push(b);
    const sign=chosen.length%2===1?1:-1;
    const req=[new Set(),new Set(),new Set()];
    for(const bi of chosen){const inj=injections[bi];for(let k=0;k<n;k++)req[inj[k]].add(k);}
    let prob=1,valid=true;
    for(let l=0;l<3;l++){
      const reqs=[...req[l]];if(!reqs.length)continue;
      const strs=[...new Set(reqs.map(k=>goals[k]))];if(strs.length>1){valid=false;break;}
      prob*=p[l][reqs[0]];
    }
    if(valid)result+=sign*prob;
  }
  return result;
}

// 목표들로부터 lineData 합성 후 성공 확률 계산
function _computeP(goals) {
  // goals: [{cat, gmsVal, unit}]
  const dataCube = _cubeDataKey();
  const part     = _cubePart();
  const lv       = _cubeLv();
  const grade    = _cubeGrade();
  const t        = window.CUBE_TABLE; if (!t) return 0;

  const og = t.optionGrade[dataCube]?.[grade]; if (!og) return 0;
  const gi = _GRADE_ORDER.indexOf(grade);
  const lowerGrade = gi > 0 ? _GRADE_ORDER[gi-1] : null;

  const names = goals.map((_,i)=>`__g${i}__`);

  const getOptProb = (g, gmsVal, cat) => {
    const kmsVal = _gmsToKms(cat, gmsVal);
    const opts   = _rawOpts(dataCube, part, lv, g);
    return opts.find(o => { const p=_parseName(o.name); return p.cat===cat&&p.val===kmsVal; })?.probability ?? 0;
  };

  const buildLine = lineNo => {
    const lineInfo = og.find(o=>o.line===lineNo);
    const cp = lineInfo?.currentGradeProb ?? 0;
    const lp = lineInfo?.lowerGradeProb  ?? 0;
    const opts = goals.map((g,i)=>{
      const curP = cp * getOptProb(grade,      g.gmsVal, g.cat);
      const lowP = lp * (lowerGrade ? getOptProb(lowerGrade, g.gmsVal, g.cat) : 0);
      return { option: names[i], probability: curP + lowP };
    });
    const total = opts.reduce((s,o)=>s+o.probability,0);
    if (total < 1) opts.push({ option:'__rest__', probability: 1-total });
    return opts;
  };

  return _cubeExactP(
    { line1: buildLine(1), line2: buildLine(2), line3: buildLine(3) },
    names
  );
}

// ── 결과 렌더 ────────────────────────────────────

function _renderResult(pSuccess) {
  const el     = document.getElementById('cubeResults');
  const type   = _cubeActiveType();
  const meso   = CUBE_MESO[type] ?? null;
  const eCubes = 1 / pSuccess;
  const sim10w = Math.round(100_000 * pSuccess);

  el.innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">성공 확률</span><span class="sf-res-val big">${(pSuccess*100).toFixed(4)}%</span></div>
    <div class="sf-res-item"><span class="sf-res-label">기댓값 (평균 큐브 수)</span><span class="sf-res-val">${Math.ceil(eCubes).toLocaleString()} 개</span></div>
    ${meso!=null?`<div class="sf-res-item"><span class="sf-res-label">기댓값 (평균 메소)</span><span class="sf-res-val">${fmtMeso(Math.round(eCubes*meso))}</span></div>`:''}
    <div class="sf-res-item"><span class="sf-res-label">10만 회 시도 시 기대 성공</span><span class="sf-res-val">${sim10w.toLocaleString()} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">10% 확률 이내</span><span class="sf-res-val">${Math.ceil(eCubes*0.105).toLocaleString()} 개</span></div>
    <div class="sf-res-item"><span class="sf-res-label">90% 확률 이내</span><span class="sf-res-val" style="color:var(--danger)">${Math.ceil(eCubes*2.303).toLocaleString()} 개</span></div>`;
}

// ── 초기화 ──────────────────────────────────────

async function initCube() {
  // 부위 드롭다운
  const partSel = document.getElementById('cubePart');
  if (partSel) partSel.innerHTML = CUBE_PARTS.map(p=>`<option value="${p}">${p}</option>`).join('');

  // 큐브 타입 버튼
  document.querySelectorAll('.cube-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cube-type-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      _populateGrade();
      _refreshGoalRows();
    });
  });

  // 부위·레벨·등급 변경
  ['cubePart','cubeLevel','cubeGrade'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', _refreshGoalRows)
  );
  document.getElementById('cubeLevel')?.addEventListener('input', _refreshGoalRows);

  // + 목표 옵션 추가
  document.getElementById('cubeAddGoalBtn')?.addEventListener('click', _addGoalRow);

  // 초기 상태
  _populateGrade();
  _addGoalRow();

  // 기댓값 계산
  document.getElementById('cubeExpectedBtn')?.addEventListener('click', () => {
    const rows  = [...document.querySelectorAll('.cube-goal-row')];
    const goals = rows.map(row => ({
      cat:    row.querySelector('.cube-opt-cat')?.value || '',
      gmsVal: parseFloat(row.querySelector('.cube-opt-val')?.value) || 0,
      unit:   row.querySelector('.cube-goal-unit')?.textContent || '',
    })).filter(g => g.cat && g.gmsVal > 0);

    const el = document.getElementById('cubeResults');
    if (!goals.length) { alert('목표 옵션을 1개 이상 입력하세요.'); return; }

    const p = _computeP(goals);
    if (!p) { el.innerHTML = '<p class="empty">해당 옵션 데이터가 없습니다. 부위·레벨·등급을 확인하세요.</p>'; return; }
    _renderResult(p);
  });
}
