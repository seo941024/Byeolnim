/* ═══════════════════════════════════════════════
   큐브 기댓값 계산기
═══════════════════════════════════════════════ */

const CUBE_MESO  = { red: 12_000_000, black: 22_000_000 };
const CUBE_PARTS = ["무기","엠블렘","보조무기(포스실드, 소울링 제외)","포스실드, 소울링","방패","모자","상의","한벌옷","하의","신발","장갑","망토","벨트","어깨장식","얼굴장식","눈장식","귀고리","반지","펜던트","기계심장"];
const _CUBE_KEY  = { red:'RED', black:'POTENTIAL' };
const _GRADE_ORDER = ['RARE','EPIC','UNIQUE','LEGENDARY'];
const _GRADE_KR    = { RARE:'레어', EPIC:'에픽', UNIQUE:'유니크', LEGENDARY:'레전드리' };
const _NO_GMS_ADJ  = ['보스 몬스터 공격 시 데미지','몬스터 방어율 무시'];

/* 큐브 1회당 추가로 드는 잠재능력 재설정 비용 — 아이템 레벨의 제곱에 구간별
   계수를 곱한다. 30레벨 이하는 들지 않는다. */
function cubeRevealCost(lv) {
  if (lv <= 30) return 0;
  const k = lv <= 70 ? 0.25 : lv <= 120 ? 2.5 : 20;
  return lv * lv * k;
}

/* 큐브 1회를 쓸 때 실제로 나가는 총 메소 = 큐브 값 + 재설정 비용 */
function cubeTotalCost(type, lv) {
  return (CUBE_MESO[type] ?? 0) + cubeRevealCost(lv);
}

/* 등급업(티어업) 확률 — 넥슨 공식 발표치(maplestory.nexon.com/Guide/OtherProbability/cube/strange)
   기준이되, 글로잉/브라이트 큐브는 GMS 커뮤니티 실측 확률이 공식치보다 유의하게 높게 나와
   그쪽 값을 채택. RARE→EPIC, EPIC→UNIQUE, UNIQUE→LEGENDARY 순. */
const CUBE_TIER_RATES = {
  red:   { RARE: 0.14, EPIC: 0.06,  UNIQUE: 0.025 },
  black: { RARE: 0.17, EPIC: 0.11,  UNIQUE: 0.05  },
};

function _activeType() { return document.querySelector('.cube-type-btn.active')?.dataset.type||'red'; }
function _dataKey()    { return _CUBE_KEY[_activeType()]||'RED'; }
function _cubeLv()     { return parseInt(document.getElementById('cubeLevel')?.value||0); }
function _cubePart()   { return document.getElementById('cubePart')?.value||''; }
function _cubeGrade()  { return document.getElementById('cubeGrade')?.value||'LEGENDARY'; }

// ── 파싱 ─────────────────────────────────────
// pct:    "공격력 : +12%"             → type='pct',  cat='공격력 %', base='공격력', valNum=12
// flat:   "STR : +4"                  → type='flat', cat='STR',      base='STR',   valNum=4
// colon:  "재사용 대기시간 : -2초(...)" → type='colon', cat='재사용 대기시간', valShort='-2초'
// unique: "<쓸만한 블레스>..."          → type='unique'

function _parse(name) {
  let m = /^(.+?) : \+(\d+\.?\d*)(%?)$/.exec(name);
  if (m) { const p=!!m[3]; return {cat:m[1]+(p?' %':''), base:m[1], valNum:+m[2], pct:p, type:p?'pct':'flat', full:name}; }
  m = /^(.+?) : (.+)$/.exec(name);
  if (m) return {cat:m[1], base:m[1], valShort:m[2].replace(/\(.*\)/g,'').trim(), type:'colon', full:name};
  return {cat:name, base:name, type:'unique', full:name};
}

function _extractNum(s) { const m=/(\d+\.?\d*)/.exec(s||''); return m?+m[1]:0; }
function _extractUnit(s) { const m=/[가-힣a-zA-Z초%]+$/.exec((s||'').trim()); return m?m[0]:''; }

// GMS는 160제 이상이면 잠재옵션 수치가 +1 (KMS는 250제부터, GMS는 250제도 동일하게 +1)
function _gmsAdj(p, lv) {
  return (p.type==='pct'||p.type==='flat') && lv>=160 && !_NO_GMS_ADJ.includes(p.base) ? 1 : 0;
}

// GMS 보정 포함 stat 기여값 반환
function _statContrib(name) {
  const p=_parse(name), lv=_cubeLv();
  if (p.type==='pct'||p.type==='flat') return {[p.cat]: p.valNum + _gmsAdj(p, lv)};
  if (p.type==='colon') return {[p.cat]: _extractNum(p.valShort)};
  return {};
}

// ── 데이터 헬퍼 ─────────────────────────────
function _bracket(dk, part, lv) {
  const t=window.CUBE_TABLE; if(!t) return null;
  const lvs=[...new Set(Object.keys(t.optionTable)
    .filter(k=>{const[c,p]=k.split('|');return c===dk&&p===part;})
    .map(k=>+k.split('|')[2]))].sort((a,b)=>a-b);
  if(!lvs.length) return null;
  let pick=lvs[0]; for(const L of lvs) if(L<=lv) pick=L;
  return pick;
}
function _rawOpts(dk, part, lv, grade) {
  const br=_bracket(dk,part,lv); if(!br) return [];
  return window.CUBE_TABLE?.optionTable[`${dk}|${part}|${br}|${grade}`]||[];
}

// ── 왼쪽 드롭다운 ───────────────────────────
// pct/flat/colon: 카테고리 1개 항목, 오른쪽 숫자 INPUT
// unique: 개별 옵션 항목, 오른쪽 없음

function _buildLeftOpts(dk, part, lv, grade) {
  const opts = _rawOpts(dk, part, lv, grade);
  if (!opts.length) return '<option value="" data-type="none">선택 안함</option><option>— 데이터 없음 —</option>';
  // 맨 위에 '선택 안함'(빈 값) — 이 줄을 목표에서 제외하고 싶을 때
  const html=['<option value="" data-type="none">선택 안함</option>'], seenCat=new Set(), seenUniq=new Set();
  for (const o of opts) {
    const p=_parse(o.name);
    if (p.type==='pct'||p.type==='flat'||p.type==='colon') {
      if (!seenCat.has(p.cat)) {
        seenCat.add(p.cat);
        const unit = p.type==='pct' ? '%' : (p.type==='colon' ? _extractUnit(p.valShort) : '');
        html.push(`<option value="${p.cat}" data-type="${p.type}" data-unit="${unit}">${p.cat}</option>`);
      }
    } else {
      if (!seenUniq.has(o.name)) {
        seenUniq.add(o.name);
        const disp=o.name.replace(/<([^>]+)>/g,'$1').replace('스킬 사용 가능','스킬').trim();
        html.push(`<option value="${o.name}" data-type="unique">${disp}</option>`);
      }
    }
  }
  return html.join('');
}

// ── 행 동기화 ───────────────────────────────
function _syncRow(row) {
  const catSel=row.querySelector('.cube-opt-cat');
  const inp   =row.querySelector('.cube-opt-inp');
  const unitEl=row.querySelector('.cube-opt-unit');
  const sel   =catSel.selectedOptions[0];
  const type  =sel?.dataset.type||'';
  if (type==='unique' || type==='none' || !catSel.value) {
    inp.style.display='none'; unitEl.style.display='none';
  } else {
    inp.style.display=''; unitEl.style.display='';
    unitEl.textContent=sel?.dataset.unit||'';
  }
}

// ── 세트 / 행 생성 ──────────────────────────
function _makeRow() {
  const row=document.createElement('div');
  row.className='cube-goal-row';
  row.innerHTML=`
    <select class="sel cube-opt-cat"></select>
    <input  class="inp cube-opt-inp" type="number" min="0" placeholder="수치">
    <span   class="cube-opt-unit"></span>`;
  row.querySelector('.cube-opt-cat').addEventListener('change',()=>_syncRow(row));
  return row;
}

function _addSet() {
  const container=document.getElementById('cubeSetContainer');
  const idx=container.children.length+1;
  const set=document.createElement('div');
  set.className='cube-set';
  set.innerHTML=`
    <div class="cube-set__head">
      <span class="cube-set__title">세트 ${idx}</span>
      <button class="cube-set__del" title="삭제">✕</button>
    </div>
    <div class="cube-set__rows"></div>`;
  set.querySelector('.cube-set__del').addEventListener('click',()=>{
    set.remove(); _renumberSets();
  });
  const rowsEl=set.querySelector('.cube-set__rows');
  for(let i=0;i<3;i++) rowsEl.appendChild(_makeRow());
  container.appendChild(set);
  _refreshAllRows();
}

function _renumberSets() {
  document.querySelectorAll('.cube-set').forEach((s,i)=>{
    s.querySelector('.cube-set__title').textContent=`세트 ${i+1}`;
  });
}

function _refreshAllRows() {
  document.querySelectorAll('.cube-goal-row').forEach(row=>{
    const catSel=row.querySelector('.cube-opt-cat');
    const prev=catSel.value;
    catSel.innerHTML=_buildLeftOpts(_dataKey(),_cubePart(),_cubeLv(),_cubeGrade());
    if(prev) catSel.value=prev;
    _syncRow(row);
  });
}

// ── 등급 드롭다운 ────────────────────────────
function _populateGrade() {
  const sel=document.getElementById('cubeGrade'); if(!sel) return;
  const t=window.CUBE_TABLE; if(!t) return;
  const dk=_dataKey();
  const grades=_GRADE_ORDER.filter(g=>t.optionGrade[dk]?.[g]);
  const prev=sel.value;
  sel.innerHTML=grades.slice().reverse().map(g=>`<option value="${g}">${_GRADE_KR[g]}</option>`).join('');
  if(grades.includes(prev)) sel.value=prev;
}

// ── 확률 계산 (열거법) ───────────────────────
// 3개 라인의 모든 (opt1, opt2, opt3) 조합을 열거,
// 세트 중 하나라도 만족하면 해당 조합의 확률을 합산

function _computeAllSets() {
  const dk=_dataKey(), part=_cubePart(), lv=_cubeLv(), grade=_cubeGrade();
  const t=window.CUBE_TABLE; if(!t) return 0;
  const og=t.optionGrade[dk]?.[grade]; if(!og) return 0;
  const gi=_GRADE_ORDER.indexOf(grade);
  const lower=gi>0?_GRADE_ORDER[gi-1]:null;

  const curOpts=_rawOpts(dk,part,lv,grade);
  const lowOpts=lower?_rawOpts(dk,part,lv,lower):[];
  const allNames=[...new Set([...curOpts.map(o=>o.name),...lowOpts.map(o=>o.name)])];
  if(!allNames.length) return 0;

  const curMap=Object.fromEntries(curOpts.map(o=>[o.name,o.probability]));
  const lowMap=Object.fromEntries(lowOpts.map(o=>[o.name,o.probability]));

  const lineProbs=[1,2,3].map(ln=>{
    const info=og.find(o=>o.line===ln);
    const cp=info?.currentGradeProb??0, lp=info?.lowerGradeProb??0;
    return allNames.map(name=>cp*(curMap[name]||0)+lp*(lowMap[name]||0));
  });

  // UI에서 세트 파싱
  const sets=[];
  document.querySelectorAll('.cube-set').forEach(setEl=>{
    const goals=[];
    setEl.querySelectorAll('.cube-goal-row').forEach(row=>{
      const catSel=row.querySelector('.cube-opt-cat');
      const inp   =row.querySelector('.cube-opt-inp');
      const sel   =catSel.selectedOptions[0];
      if(!sel) return;
      const type=sel.dataset.type||'';
      if(type==='none' || !catSel.value) return;  // '선택 안함' 줄은 목표에서 제외
      if(type==='unique') {
        goals.push({isUnique:true, kmsName:catSel.value});
      } else {
        const target=parseFloat(inp.value);
        if(!isNaN(target)&&target>0) goals.push({isUnique:false, cat:catSel.value, target});
      }
    });
    if(goals.length) sets.push(goals);
  });
  if(!sets.length) return 0;

  // 옵션명 → 기여값 캐시 (아래 3중 루프 안에서 매번 파싱하지 않도록)
  const contribCache=Object.fromEntries(allNames.map(nm=>[nm,_statContrib(nm)]));

  // 세트를 미리 가공: unique 목록 + 카테고리별 목표치 배열
  // 같은 카테고리를 여러 줄 지정하면(예: STR% 12/9/9) 그 줄 수만큼 서로 다른
  // 라인에서 각각 떠야 통과. 한 줄만 지정하면 기존처럼 합산으로 판정한다.
  const preparedSets=sets.map(set=>{
    const uniques=set.filter(g=>g.isUnique).map(g=>g.kmsName);
    const byCat={};
    set.filter(g=>!g.isUnique).forEach(g=>{ (byCat[g.cat]=byCat[g.cat]||[]).push(g.target); });
    // 큰 목표부터 큰 라인에 배정해야 그리디 매칭이 최적이 된다
    Object.values(byCat).forEach(arr=>arr.sort((a,b)=>b-a));
    return { uniques, byCat:Object.entries(byCat) };
  });

  // 세트 만족 체크
  function checkSet(ps, opts) {
    for(const u of ps.uniques) if(!opts.includes(u)) return false;
    for(const [cat,targets] of ps.byCat) {
      if(targets.length===1) {
        let total=0;
        for(const o of opts) total+=contribCache[o][cat]||0;
        if(total<targets[0]) return false;
      } else {
        const vals=opts.map(o=>contribCache[o][cat]||0).sort((a,b)=>b-a);
        if(targets.length>vals.length) return false;
        for(let i=0;i<targets.length;i++) if(vals[i]<targets[i]) return false;
      }
    }
    return true;
  }

  const n=allNames.length;
  let totalP=0;
  const combos=[];
  for(let i=0;i<n;i++){
    const p1=lineProbs[0][i]; if(!p1) continue;
    for(let j=0;j<n;j++){
      const p2=lineProbs[1][j]; if(!p2) continue;
      for(let k=0;k<n;k++){
        const p3=lineProbs[2][k]; if(!p3) continue;
        const combo=[allNames[i],allNames[j],allNames[k]];
        if(preparedSets.some(ps=>checkSet(ps,combo))){
          const cp=p1*p2*p3;
          totalP+=cp;
          combos.push({lines:combo, p:cp});
        }
      }
    }
  }
  combos.sort((a,b)=>b.p-a.p);
  return {p:totalP, combos};
}

// ── 옵션명 짧게 표시 ─────────────────────────
// 계산에 쓰는 값과 화면에 보이는 값이 달라지지 않도록 표시에도 GMS 보정을 반영한다
// (예전엔 160제에서 13%로 계산해놓고 화면엔 12%로 찍혀 혼란스러웠음)
function _shortName(name) {
  const p=_parse(name), lv=_cubeLv();
  const adj=_gmsAdj(p, lv);
  if(p.type==='pct')    return `${p.base} : +${p.valNum+adj}%`;
  if(p.type==='flat')   return `${p.base} : +${p.valNum+adj}`;
  if(p.type==='colon')  return `${p.cat} ${p.valShort}`;
  return name.replace(/<([^>]+)>/g,'$1').replace('스킬 사용 가능','스킬').trim();
}

// ── 결과 모달 ────────────────────────────────
function _renderResult(totalP, combos) {
  const meso=cubeTotalCost(_activeType(), _cubeLv());
  const ec=1/totalP;

  // 기댓값 패널
  const statsHtml=`
    <div class="sf-res-item"><span class="sf-res-label">1회 시행 목표 달성 확률</span><span class="sf-res-val big">${(totalP*100).toFixed(7)}%</span></div>
    <div class="sf-res-item"><span class="sf-res-label">평균 큐브 수</span><span class="sf-res-val">${Math.ceil(ec).toLocaleString()} 회</span></div>
    ${meso!=null?`<div class="sf-res-item"><span class="sf-res-label">평균 메소</span><span class="sf-res-val">${fmtMeso(Math.round(ec*meso))}</span></div>`:''}
    <div class="sf-res-item"><span class="sf-res-label">10% 확률 이내</span><span class="sf-res-val">${Math.ceil(ec*0.105).toLocaleString()} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">90% 확률 이내</span><span class="sf-res-val" style="color:var(--danger)">${Math.ceil(ec*2.303).toLocaleString()} 회</span></div>`;

  // 조합 목록
  const MAX=50;
  const shown=combos.slice(0,MAX);
  const moreNote=combos.length>MAX?`<p class="cube-combo-note">조건을 만족하는 경우가 너무 많아 상위 ${MAX}개를 표시합니다.</p>`:'';
  const combosHtml=moreNote+shown.map(c=>`
    <div class="cube-combo-item">
      ${c.lines.map(l=>`<span class="cube-combo-line">${_shortName(l)}</span>`).join('')}
      <span class="cube-combo-p">${(c.p*100).toFixed(7)}%</span>
    </div>`).join('');

  const modal=document.getElementById('overlayCubeResult');
  modal.querySelector('.cube-result-stats').innerHTML=statsHtml;
  modal.querySelector('.cube-result-combos').innerHTML=combosHtml;
  modal.style.display='flex';
}

// 부위 표시명 — 데이터 키의 괄호 부기만 떼어낸다. 키 자체는 그대로 유지.
function _partLabel(p) {
  return p.replace(/\s*\(([^)]*)\)/, ' · $1');
}

/* ═══════════════════════════════════════════════
   까미 월루 — 큐브를 한 개씩 직접 열어보는 모드
═══════════════════════════════════════════════ */

/* 큐브를 번갈아 쓸 수 있으므로 사용 개수는 종류별로 따로 센다 */
let _hrState = { grade:'RARE', cubes:{ red:0, black:0 }, meso:0, log:[] };

function _hrGrade() { return document.getElementById('hrGrade')?.value || 'RARE'; }

/* 확률 배열에서 인덱스 하나를 뽑는다(가중 추첨). 전부 0이면 -1. */
function _weightedPick(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/* 해당 등급의 옵션 3줄을 뽑는다.
   각 줄은 현재 등급 옵션이 뜰 확률(currentGradeProb)과 한 단계 아래 등급 옵션이
   뜰 확률(lowerGradeProb)로 나뉜다. 어느 쪽 풀에서 나왔는지를 화면에서 "이탈"
   여부로 보여줘야 하므로, 두 풀을 합쳐 한 번에 뽑지 않고 풀을 먼저 정한 뒤
   그 안에서 옵션을 뽑는다(확률적으로는 합쳐 뽑는 것과 동일).
   반환: [{ name, grade }, ...] — grade는 그 줄 옵션이 속한 등급. */
function _hrRollLines(grade) {
  const dk = _dataKey(), part = _cubePart(), lv = _cubeLv();
  const t = window.CUBE_TABLE; if (!t) return [];
  const og = t.optionGrade[dk]?.[grade]; if (!og) return [];

  const gi = _GRADE_ORDER.indexOf(grade);
  const lower = gi > 0 ? _GRADE_ORDER[gi - 1] : null;
  const pools = {
    [grade]: _rawOpts(dk, part, lv, grade),
    ...(lower ? { [lower]: _rawOpts(dk, part, lv, lower) } : {}),
  };

  return [1, 2, 3].map(ln => {
    const info = og.find(o => o.line === ln);
    const cp = info?.currentGradeProb ?? 0;
    const lp = lower ? (info?.lowerGradeProb ?? 0) : 0;

    // 어느 등급 풀에서 뽑을지 먼저 정한다
    const useLower = _weightedPick([cp, lp]) === 1;
    const pickGrade = useLower ? lower : grade;
    const pool = pools[pickGrade] || [];
    if (!pool.length) return null;

    const idx = _weightedPick(pool.map(o => o.probability));
    if (idx < 0) return null;
    return { name: pool[idx].name, grade: pickGrade };
  }).filter(Boolean);
}

function _hrRoll() {
  const type = _activeType();
  _hrState.cubes[type] = (_hrState.cubes[type] || 0) + 1;
  _hrState.meso += cubeTotalCost(type, _cubeLv());

  /* 최고 등급이 아니면 먼저 등급업 판정을 하고, 성공하면 올라간 등급에서 옵션을 뽑는다.
     미라클 타임이면 등급업 확률이 2배(단, 1을 넘지 않게 자른다). */
  const dmt = document.getElementById('hrDmt')?.checked;
  const base = CUBE_TIER_RATES[type]?.[_hrState.grade] ?? 0;
  const rate = dmt ? Math.min(1, base * 2) : base;
  const tieredUp = rate > 0 && Math.random() < rate;
  if (tieredUp) {
    const gi = _GRADE_ORDER.indexOf(_hrState.grade);
    _hrState.grade = _GRADE_ORDER[Math.min(gi + 1, _GRADE_ORDER.length - 1)];
  }

  const lines = _hrRollLines(_hrState.grade);
  _hrState.log.unshift({ grade: _hrState.grade, tieredUp, lines });
  if (_hrState.log.length > 30) _hrState.log.pop();
  _hrRender();
}

/* 로그 줄의 등급 글자도 패널과 같은 색을 쓰도록, 등급 → 색을 한 곳에서 관리 */
const _GRADE_COLOR = { RARE:'#6699ff', EPIC:'#b978ff', UNIQUE:'#ffcc00', LEGENDARY:'#ccff00' };
const _GRADE_ICON  = { RARE:'rare', EPIC:'epic', UNIQUE:'unique', LEGENDARY:'legendary' };
function _gradeIconSrc(g) { return `images/icons/${_GRADE_ICON[g] || 'rare'}.png`; }

function _hrRender() {
  const panel   = document.getElementById('hrPanel');
  const mesoEl  = document.getElementById('hrMesoSpent');
  const logEl   = document.getElementById('hrLog');
  if (!panel) return;

  panel.dataset.grade = _hrState.grade;
  document.getElementById('hrPanelGrade').textContent = _GRADE_KR[_hrState.grade] || '—';
  const iconEl = document.getElementById('hrPanelIcon');
  if (iconEl) { iconEl.src = _gradeIconSrc(_hrState.grade); iconEl.style.display = ''; }

  /* 아직 한 번도 안 굴렸으면 빈 줄 3개를 띄워 패널 형태를 유지한다.
     줄마다 그 옵션이 속한 등급 색을 입혀서, 레전드리 옵션이 몇 줄 떴는지
     (= 이탈이 아닌 줄이 몇 개인지) 한눈에 보이게 한다. */
  const cur = _hrState.log[0];
  document.getElementById('hrPanelLines').innerHTML = cur
    ? cur.lines.map(l => `<div class="pot-line" data-grade="${l.grade}">${_shortName(l.name)}</div>`).join('')
    : '<div class="pot-line pot-line--empty">— 옵션 없음 —</div>'.repeat(3);

  document.getElementById('hrCountRed').textContent   = (_hrState.cubes.red   || 0).toLocaleString();
  document.getElementById('hrCountBlack').textContent = (_hrState.cubes.black || 0).toLocaleString();
  mesoEl.textContent = fmtMeso(_hrState.meso);

  logEl.innerHTML = _hrState.log.map(e => `
    <div class="hr-log-row">
      <img class="hr-log-icon" src="${_gradeIconSrc(e.grade)}" alt="" onerror="this.style.display='none'">
      <span class="hr-log-grade" style="color:${_GRADE_COLOR[e.grade]}">${_GRADE_KR[e.grade]}</span>
      ${e.tieredUp ? '<span class="hr-log-up">등급업</span>' : ''}
      ${e.lines.map(l => `<span class="hr-log-line" style="color:${_GRADE_COLOR[l.grade]}">${_shortName(l.name)}</span>`).join('')}
    </div>`).join('');
}

function _hrReset() {
  _hrState = { grade: _hrGrade(), cubes: { red:0, black:0 }, meso: 0, log: [] };
  _hrRender();
}

/* 레전드리도 고를 수 있다 — 등급업은 없지만 옵션 재설정은 계속 돌리기 때문. */
function _hrPopulateGrade() {
  const sel = document.getElementById('hrGrade'); if (!sel) return;
  const t = window.CUBE_TABLE; if (!t) return;
  const dk = _dataKey();
  const grades = _GRADE_ORDER.filter(g => t.optionGrade[dk]?.[g]);
  const prev = sel.value;
  sel.innerHTML = grades.map(g => `<option value="${g}">${_GRADE_KR[g]}</option>`).join('');
  if (grades.includes(prev)) sel.value = prev;
}

// ── 초기화 ──────────────────────────────────
async function initCube() {
  const partSel=document.getElementById('cubePart');
  // 부위명은 cube_table의 키로 그대로 쓰이므로 value는 절대 건드리지 않고,
  // 화면에 보이는 글자만 괄호 없는 표기로 바꾼다.
  if(partSel) partSel.innerHTML=CUBE_PARTS.map(p=>`<option value="${p}">${_partLabel(p)}</option>`).join('');

  document.querySelectorAll('.cube-type-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.cube-type-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); _populateGrade(); _hrPopulateGrade(); _refreshAllRows();
  }));

  ['cubePart','cubeGrade'].forEach(id=>document.getElementById(id)?.addEventListener('change',_refreshAllRows));
  document.getElementById('cubeLevel')?.addEventListener('input',_refreshAllRows);
  // max 속성은 스피너만 막고 직접 입력은 못 막는다. 재설정 비용이 레벨의 제곱이라
  // 오타 하나로 값이 터지므로 입력 확정 시 1~250으로 잘라준다.
  document.getElementById('cubeLevel')?.addEventListener('change',e=>{
    const v=Math.max(1,Math.min(250,parseInt(e.target.value)||200));
    e.target.value=v; _refreshAllRows(); _hrRender();
  });
  document.getElementById('cubeAddSetBtn')?.addEventListener('click',_addSet);

  _populateGrade();
  _hrPopulateGrade();
  _addSet(); // 기본 세트 1개

  // 까미 월루 — 시작 등급을 바꾸면 진행 상황을 초기화한다
  document.getElementById('hrGrade')?.addEventListener('change',_hrReset);
  document.getElementById('hrRollBtn')?.addEventListener('click',_hrRoll);
  document.getElementById('hrResetBtn')?.addEventListener('click',_hrReset);
  _hrReset();

  /* 스페이스바로 재설정. 큐브 탭의 까미 월루가 열려 있을 때만 동작하고,
     입력칸/셀렉트에 포커스가 있으면(값을 고치는 중이면) 가로채지 않는다.
     기본 동작(스크롤·버튼 재클릭)도 막는다. */
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const sec = document.getElementById('sec-cube');
    if (!sec?.classList.contains('active')) return;
    if (document.getElementById('cubeTabHandroll')?.style.display === 'none') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;  // 모달 떠 있으면 무시
    e.preventDefault();
    _hrRoll();
  });

  // 탭 전환
  document.querySelectorAll('#sec-cube .sf-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('#sec-cube .sf-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const isSim = tab.dataset.cubetab === 'sim';
      document.getElementById('cubeTabSim').style.display            = isSim ? '' : 'none';
      document.getElementById('cubeTabHandroll').style.display       = isSim ? 'none' : '';
      document.getElementById('hrDmtWrap').style.display             = isSim ? 'none' : '';
      document.getElementById('cubeTabSimResult').style.display      = isSim ? '' : 'none';
      document.getElementById('cubeTabHandrollResult').style.display = isSim ? 'none' : '';
    });
  });

  document.getElementById('cubeExpectedBtn')?.addEventListener('click',()=>{
    const res=_computeAllSets();
    if(!res||!res.p){
      alert('목표 옵션을 입력하거나 데이터를 확인하세요.');return;
    }
    _renderResult(res.p, res.combos);
  });

  // 모달 닫기
  document.getElementById('cubeResultClose')?.addEventListener('click',()=>{
    document.getElementById('overlayCubeResult').style.display='none';
  });
  document.getElementById('overlayCubeResult')?.addEventListener('click',e=>{
    if(e.target===e.currentTarget) e.currentTarget.style.display='none';
  });
}
