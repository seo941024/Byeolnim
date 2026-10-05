/* ═══════════════════════════════════════════════
   큐브 기댓값 계산기
═══════════════════════════════════════════════ */

/* cube_table.js는 1.1MB짜리 데이터 파일이라, 큐브 탭을 한 번도 안 여는
   사람까지 접속할 때마다 무조건 받게 하면 첫 로딩만 그만큼 느려진다.
   그래서 index.html엔 <script>로 안 넣어두고, 큐브 탭을 처음 열 때만
   여기서 동적으로 붙인다. 이미 받아놨거나 받는 중이면 새로 안 받는다. */
let _cubeTableLoading = null;
let _cubeInited = false;

function ensureCubeReady(cb) {
  if (window.CUBE_TABLE) {
    if (!_cubeInited) { _cubeInited = true; initCube(); }
    cb && cb();
    return;
  }
  if (!_cubeTableLoading) {
    _cubeTableLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'cube_table.js?v=20260819b';
      s.onload = resolve;
      s.onerror = () => reject(new Error('cube_table.js 로드 실패'));
      document.body.appendChild(s);
    });
  }
  _cubeTableLoading.then(() => {
    if (!_cubeInited) { _cubeInited = true; initCube(); }
    cb && cb();
  }).catch(() => {
    alert('큐브 데이터를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해주세요.');
  });
}

const CUBE_MESO  = { red: 12_000_000, black: 22_000_000 };
const CUBE_PARTS = ["무기","엠블렘","보조무기(포스실드, 소울링 제외)","포스실드, 소울링","방패","모자","상의","한벌옷","하의","신발","장갑","망토","벨트","어깨장식","얼굴장식","눈장식","귀고리","반지","펜던트","기계심장"];
const _CUBE_KEY  = { red:'RED', black:'POTENTIAL' };
const _GRADE_ORDER = ['RARE','EPIC','UNIQUE','LEGENDARY'];
const _GRADE_KR    = { RARE:'레어', EPIC:'에픽', UNIQUE:'유니크', LEGENDARY:'레전드리' };
/* GMS 160제 +1 보정에서 빠지는 항목. type별로 따로 둔다 — 같은 이름이라도
   %(pct)과 순수 수치(flat)는 다른 옵션이라 보정 여부가 갈릴 수 있다.
   실측 확인: 크리티컬 데미지%는 160제여도 8%가 최댓값(9%로 안 오른다),
   공격력/마력의 순수 수치(%아닌 쪽)도 32가 최댓값(33으로 안 오른다).
   같은 이름의 %쪽(공격력%, 마력%)은 정상적으로 +1이 붙는다. */
const _NO_GMS_ADJ_PCT  = ['보스 몬스터 공격 시 데미지','몬스터 방어율 무시','크리티컬 데미지'];
const _NO_GMS_ADJ_FLAT = ['공격력','마력'];

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
  if (lv < 160) return 0;
  if (p.type === 'pct')  return _NO_GMS_ADJ_PCT.includes(p.base)  ? 0 : 1;
  if (p.type === 'flat') return _NO_GMS_ADJ_FLAT.includes(p.base) ? 0 : 1;
  return 0;
}

// GMS 보정 포함 stat 기여값 반환
/* 목표 판정에서 줄마다 호출되므로(자동 돌리기는 초당 수천 번) 결과를 기억해둔다.
   레벨이 바뀌면 GMS 보정이 달라지므로 레벨도 키에 넣는다. */
const _statContribCache = new Map();
function _statContrib(name) {
  const lv=_cubeLv();
  const ck = lv+'|'+name;
  if (_statContribCache.has(ck)) return _statContribCache.get(ck);
  const p=_parse(name);
  let out = {};
  if (p.type==='pct'||p.type==='flat') out = {[p.cat]: p.valNum + _gmsAdj(p, lv)};
  else if (p.type==='colon') out = {[p.cat]: _extractNum(p.valShort)};
  _statContribCache.set(ck, out);
  return out;
}

// ── 데이터 헬퍼 ─────────────────────────────
/* optionTable은 키가 1,600개가 넘어서 이 함수를 부를 때마다 전부 훑으면 꽤 비싸다.
   자동 돌리기는 한 번에 300회 × 3줄 = 900번씩 부르는데, 캐시가 없으면 그 묶음마다
   화면이 0.7초씩 멈췄다(실측). 표는 한 번 받으면 바뀌지 않으므로 결과를 기억해둔다. */
const _bracketCache = new Map();
function _bracket(dk, part, lv) {
  const t=window.CUBE_TABLE; if(!t) return null;
  const ck = dk+'|'+part+'|'+lv;
  if (_bracketCache.has(ck)) return _bracketCache.get(ck);
  const lvs=[...new Set(Object.keys(t.optionTable)
    .filter(k=>{const[c,p]=k.split('|');return c===dk&&p===part;})
    .map(k=>+k.split('|')[2]))].sort((a,b)=>a-b);
  let pick=null;
  if(lvs.length){ pick=lvs[0]; for(const L of lvs) if(L<=lv) pick=L; }
  _bracketCache.set(ck, pick);
  return pick;
}
function _rawOpts(dk, part, lv, grade) {
  const br=_bracket(dk,part,lv); if(!br) return [];
  return window.CUBE_TABLE?.optionTable[`${dk}|${part}|${br}|${grade}`]||[];
}

// ── 왼쪽 드롭다운 ───────────────────────────
// pct/flat/colon: 카테고리 1개 항목, 오른쪽 숫자 INPUT
// unique: 개별 옵션 항목, 오른쪽 없음

/* grade는 하나 또는 여러 개를 받는다. 직접 큐브 까기는 시작 등급뿐 아니라 한 단계 아래
   등급 옵션도 이탈로 뜨므로, 두 등급을 합쳐 목록을 만들어야 그것도 목표로 걸 수 있다. */
function _buildLeftOpts(dk, part, lv, grade) {
  const grades = Array.isArray(grade) ? grade : [grade];
  const seenName = new Set();
  const opts = [];
  for (const g of grades) {
    for (const o of _rawOpts(dk, part, lv, g)) {
      if (seenName.has(o.name)) continue;
      seenName.add(o.name); opts.push(o);
    }
  }
  if (!opts.length) return '<option value="" data-type="none">-</option><option>-</option>';
  // 맨 위 빈 값 줄 — 이 줄을 목표에서 제외하고 싶을 때
  const html=['<option value="" data-type="none">-</option>'], seenCat=new Set(), seenUniq=new Set();
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
  const catSel=row.querySelector('.cube-opt-cat');
  catSel.addEventListener('change',()=>{
    _syncRow(row);
    if (row.closest('#hrGoalRows')) {
      const sel=catSel.selectedOptions[0];
      _hrMaybeAutoGrade(catSel.value, sel?.dataset.type);
    }
  });
  return row;
}

/* 직접 큐브 까기 목표 한 칸. 기본 줄 뒤에 '또는' 줄을 붙일 수 있고, 붙인 줄이 있으면
   그 칸은 한 줄이 그 중 어느 옵션이든 만족하면 되는 칸이 된다. */
function _makeHrGoal() {
  const wrap=document.createElement('div');
  wrap.className='hr-goal';
  const main=_makeRow();
  const orBtn=document.createElement('button');
  orBtn.type='button'; orBtn.className='hr-or-btn'; orBtn.textContent='또는';
  main.appendChild(orBtn);
  const alts=document.createElement('div');
  alts.className='hr-goal__alts';
  orBtn.addEventListener('click',()=>{ alts.appendChild(_makeAltRow()); _refreshAllRows(); });
  wrap.append(main, alts);
  return wrap;
}

function _makeAltRow() {
  const row=_makeRow();
  row.classList.add('cube-goal-row--alt');
  const lbl=document.createElement('span');
  lbl.className='hr-or-lbl'; lbl.textContent='또는';
  row.prepend(lbl);
  const del=document.createElement('button');
  del.type='button'; del.className='hr-or-del'; del.textContent='✕';
  del.addEventListener('click',()=>row.remove());
  row.appendChild(del);
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

function _refreshRowsIn(sel, grades) {
  document.querySelectorAll(sel + ' .cube-goal-row').forEach(row=>{
    const catSel=row.querySelector('.cube-opt-cat');
    const prev=catSel.value;
    catSel.innerHTML=_buildLeftOpts(_dataKey(),_cubePart(),_cubeLv(),grades);
    if(prev) catSel.value=prev;
    _syncRow(row);
  });
}

/* 옵션 시뮬레이터와 직접 큐브 까기는 등급 선택칸이 서로 다르다(cubeGrade / hrGrade).
   예전엔 두 곳의 목표 칸을 한꺼번에 cubeGrade 기준으로 채워서, 직접 큐브 까기 목표가
   남의 탭 등급에 휘둘려 목록이 비는 일이 있었다. 각자 자기 등급을 보게 나눈다.
   직접 큐브 까기 목표 칸은 시작 등급과 무관하게 이 부위가 가질 수 있는 옵션을 전부
   보여준다 — 재사용/크리데미지%처럼 레전드리 전용 옵션도 골라둘 수 있어야 하고,
   고르면 _hrMaybeAutoGrade가 알아서 시작 등급을 그 옵션이 뜨는 등급으로 올려준다. */
function _refreshAllRows() {
  _refreshRowsIn('#cubeSetContainer', _cubeGrade());
  _refreshRowsIn('#hrGoalRows', _GRADE_ORDER);
}

/* 그 옵션(카테고리 또는 유니크 이름)이 실제로 뜰 수 있는 가장 낮은 등급을 찾는다. */
function _hrRequiredGrade(cat, type) {
  const dk=_dataKey(), part=_cubePart(), lv=_cubeLv();
  for (const g of _GRADE_ORDER) {
    for (const o of _rawOpts(dk, part, lv, g)) {
      if (type==='unique') { if (o.name===cat) return g; }
      else { const p=_parse(o.name); if (p.type!=='unique' && p.cat===cat) return g; }
    }
  }
  return null;
}

/* 직접 큐브 까기 목표 칸에서 옵션을 직접 고르면, 그 옵션이 뜨는 가장 낮은 등급보다
   지금 시작 등급이 낮을 경우 자동으로 그 등급으로 올려준다 — 안 그러면 아무리
   돌려도 목표가 나올 수 없는 조합을 고르고도 이유를 모르게 된다. */
function _hrMaybeAutoGrade(cat, type) {
  if (!cat || type==='none' || !type) return;
  const need = _hrRequiredGrade(cat, type);
  if (!need) return;
  const gradeSel = document.getElementById('hrGrade');
  if (!gradeSel) return;
  if (_GRADE_ORDER.indexOf(need) > _GRADE_ORDER.indexOf(gradeSel.value)) {
    gradeSel.value = need;
    _hrStopAuto(); _hrReset(); _refreshAllRows();
  }
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
      if(type==='none' || !catSel.value) return;  // 빈 값 줄은 목표에서 제외
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
   직접 큐브 까기 — 큐브를 한 개씩 직접 열어보는 모드
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

  /* "<쓸만한 OO> 스킬 사용 가능" 같은 유니크 효과는 한 아이템에 한 줄만 붙는다
     (실제 게임 제약 — 같은 3줄 안에 두 개가 같이 뜨지 않는다). 그래서 앞선 줄에서
     이미 유니크가 나왔으면, 그 뒤 줄들은 유니크 종류를 아예 후보에서 빼고
     나머지 옵션들끼리 확률을 다시 정규화해서 뽑는다. */
  let hasUnique = false;
  const lines = [];
  for (const ln of [1, 2, 3]) {
    const info = og.find(o => o.line === ln);
    const cp = info?.currentGradeProb ?? 0;
    const lp = lower ? (info?.lowerGradeProb ?? 0) : 0;

    // 어느 등급 풀에서 뽑을지 먼저 정한다
    const useLower = _weightedPick([cp, lp]) === 1;
    const pickGrade = useLower ? lower : grade;
    let pool = pools[pickGrade] || [];
    if (hasUnique) pool = pool.filter(o => _parse(o.name).type !== 'unique');
    if (!pool.length) continue;

    const idx = _weightedPick(pool.map(o => o.probability));
    if (idx < 0) continue;
    const picked = pool[idx];
    if (_parse(picked.name).type === 'unique') hasUnique = true;
    lines.push({ name: picked.name, grade: pickGrade });
  }
  return lines;
}

/* ── 목표 옵션 ──
   판정 규칙은 옵션 시뮬레이터(_computeAllSets)와 똑같이 맞춘다.
   같은 항목을 한 줄만 적으면 세 줄 합산, 여러 줄에 적으면 그 줄 수만큼 따로 떠야 한다.
   그래야 "공격력 33"(합쳐서 33 이상)과 "공격력 3줄"(각각 한 줄씩)을 같은 칸으로 쓸 수 있다. */

/* 해당 카테고리가 특정 등급에서 가질 수 있는 실제 최댓값(GMS 보정 포함).
   레벨에 따라 표가 구간별로 다르고(160제부터 +1) 160제 미만엔 못 미치므로,
   프리셋 숫자를 고정해두지 않고 지금 부위·레벨 기준으로 그때그때 계산한다. */
function _hrMaxStatValue(cat, grade) {
  const dk = _dataKey(), part = _cubePart(), lv = _cubeLv();
  let max = null;
  for (const o of _rawOpts(dk, part, lv, grade)) {
    const v = _statContrib(o.name)[cat];
    if (v != null && (max === null || v > max)) max = v;
  }
  return max;
}

/* 몇 번째 줄인지에 따라 실제로 뽑히는 등급이 다르다 — 레전드리 아이템도
   1번째 줄만 100% 그 등급이고, 2·3번째 줄은 이탈 확률이 더 높아 대부분
   한 단계 아래 등급에서 뽑힌다(_hrRollLines와 같은 og 표를 쓴다). 그래서
   "레전드리 3줄 전부 최댓값"을 목표로 잡으면 사실상 안 뜨고, 그 줄이
   실제로 더 자주 나오는 쪽 등급의 최댓값을 목표로 삼는 게 현실적이다. */
function _hrLineGrade(ln, grade) {
  const t = window.CUBE_TABLE; if (!t) return grade;
  const dk = _dataKey();
  const og = t.optionGrade[dk]?.[grade];
  const info = og?.find(o => o.line === ln);
  if (!info) return grade;
  const gi = _GRADE_ORDER.indexOf(grade);
  const lower = gi > 0 ? _GRADE_ORDER[gi - 1] : null;
  const cp = info.currentGradeProb ?? 1;
  const lp = lower ? (info.lowerGradeProb ?? 0) : 0;
  return (lower && lp > cp) ? lower : grade;
}

/* 시작 등급을 바꿔도 목표 칸의 카테고리 선택은 그대로 남아있는데(등급과 무관하게
   전체 옵션을 보여주므로), 수치는 예전 등급 기준 최댓값 그대로 굳어 있었다 —
   레어에서 프리셋으로 채운 4%가 레전드리로 바꿔도 그대로 4%인 식. 등급이 바뀔
   때마다 채워진 칸을 전부 새 등급 기준 최댓값으로 다시 계산한다. */
function _hrRecomputeGoalValues() {
  const grade = _hrGrade();
  document.querySelectorAll('#hrGoalRows .hr-goal').forEach((goal, i) => {
    goal.querySelectorAll('.cube-goal-row').forEach(row => {
      const cat = row.querySelector('.cube-opt-cat');
      const inp = row.querySelector('.cube-opt-inp');
      if (!cat?.value || cat.selectedOptions[0]?.dataset.type === 'unique') return;
      const g = _hrLineGrade(i + 1, grade);
      const v = _hrMaxStatValue(cat.value, g) ?? _hrMaxStatValue(cat.value, grade);
      if (v != null) inp.value = v;
    });
  });
}

/* 자주 쓰는 조합. part를 같이 지정해서 버튼 하나로 부위까지 맞춘다.
   perLineMax인 프리셋은 각 줄에 그 카테고리의 실제 최댓값을 넣는다(_hrMaxStatValue) —
   "일단 뜨기만 하면" 이 아니라 "그 옵션이 최대치로 떴을 때"만 멈추게 하려는 것.
   재사용 프리셋처럼 값 자체가 목표(총합)인 것은 rows에 고정 숫자를 그대로 둔다. */
const HR_PRESETS = [
  { label:'공격력 3줄',    part:'무기', perLineMax:true, cat:'공격력 %',      lines:3 },
  { label:'마력 3줄',      part:'무기', perLineMax:true, cat:'마력 %',        lines:3 },
  { label:'재사용 4초',    part:'모자', rows:[['모든 스킬의 재사용 대기시간',4]], requireGrade:'LEGENDARY' },
  { label:'재사용 5초 이상', part:'모자', rows:[['모든 스킬의 재사용 대기시간',5]], requireGrade:'LEGENDARY' },
  { label:'크리데미지 2줄', part:'장갑', perLineMax:true, cat:'크리티컬 데미지 %', lines:2, requireGrade:'LEGENDARY' },
  { label:'크리데미지 3줄', part:'장갑', perLineMax:true, cat:'크리티컬 데미지 %', lines:3, requireGrade:'LEGENDARY' },
];

function _hrBuildPresets() {
  const box = document.getElementById('hrPresets');
  if (!box) return;
  box.innerHTML = HR_PRESETS.map((p, i) =>
    `<button class="sbtn sbtn--ghost hr-preset__btn" data-preset="${i}">${p.label}</button>`).join('');
  box.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => _hrApplyPreset(HR_PRESETS[+btn.dataset.preset]));
  });
}

function _hrApplyPreset(preset) {
  // 부위를 먼저 맞춰야 옵션 목록에 그 항목이 들어온다(무기에만 공격력%, 장갑에만 크뎀%)
  const partSel = document.getElementById('cubePart');
  if (partSel && preset.part) { partSel.value = preset.part; _refreshAllRows(); }

  // 재사용/크리데미지처럼 레전드리 전용 옵션이 있는 프리셋은 시작 등급부터 맞춰야
  // 목표가 실제로 뜰 수 있다 — 조용히 안 붙는 대신 등급을 올려서 바로 되게 한다
  if (preset.requireGrade) {
    const gradeSel = document.getElementById('hrGrade');
    if (gradeSel && gradeSel.value !== preset.requireGrade) {
      gradeSel.value = preset.requireGrade;
      _hrStopAuto(); _hrReset(); _refreshAllRows();
    }
  }

  // perLineMax면 부위가 확정된 지금 시점에, 줄마다 실제로 뽑히는 등급 기준 최댓값을 구한다
  // (1번째 줄은 시작 등급 그대로, 2·3번째 줄은 이탈이 더 흔해 대개 한 단계 아래 최댓값)
  const startGrade = _hrGrade();
  const rows = preset.perLineMax
    ? Array.from({ length: preset.lines }, (_, i) => {
        const g = _hrLineGrade(i + 1, startGrade);
        // 이탈한 등급에 그 옵션 자체가 없는 경우가 있다(예: 크리티컬 데미지%는
        // 레전드리 전용이라 유니크엔 없음) — 그럴 땐 이탈해도 뜰 수가 없으니
        // 시작 등급 값으로 되돌아간다. 그래야 "이 줄은 목표에서 제외"로
        // 잘못 비워지지 않는다.
        const v = _hrMaxStatValue(preset.cat, g) ?? _hrMaxStatValue(preset.cat, startGrade);
        return [preset.cat, v];
      })
    : preset.rows;

  document.querySelectorAll('#hrGoalRows .cube-goal-row--alt').forEach(r => r.remove());
  const rowEls = [...document.querySelectorAll('#hrGoalRows .hr-goal > .cube-goal-row')];
  rowEls.forEach((row, i) => {
    const cat = row.querySelector('.cube-opt-cat');
    const inp = row.querySelector('.cube-opt-inp');
    const spec = rows[i];
    if (!spec || spec[1] == null) { cat.value = ''; inp.value = ''; _syncRow(row); return; }
    cat.value = spec[0];
    // 그 부위에 없는 옵션이면 선택이 안 붙는다 — 조용히 비워 잘못된 목표가 남지 않게 한다
    if (cat.value !== spec[0]) { cat.value = ''; inp.value = ''; _syncRow(row); return; }
    _syncRow(row);
    inp.value = spec[1];
  });
}

/* 목표 칸을 읽어 {slots, uniques, byCat} 형태로 정리한다.
   '또는' 줄이 붙은 칸은 slots로 빠진다 — 한 줄이 그 칸의 옵션 중 하나를 만족하면 되고,
   칸마다 서로 다른 줄이어야 한다. 나머지 칸은 옵션 시뮬레이터와 같은 규칙이다. */
function _hrGetGoals() {
  const slots = [], uniques = [], byCat = {};
  document.querySelectorAll('#hrGoalRows .hr-goal').forEach(goal => {
    const opts = [];
    goal.querySelectorAll('.cube-goal-row').forEach(row => {
      const catSel = row.querySelector('.cube-opt-cat');
      const sel = catSel.selectedOptions[0];
      if (!sel || !catSel.value || sel.dataset.type === 'none') return;
      if (sel.dataset.type === 'unique') { opts.push({ cat: catSel.value, unique: true }); return; }
      const v = parseFloat(row.querySelector('.cube-opt-inp').value);
      if (!isNaN(v) && v > 0) opts.push({ cat: catSel.value, v });
    });
    if (!opts.length) return;
    if (opts.length > 1) { slots.push(opts); return; }
    const o = opts[0];
    if (o.unique) uniques.push(o.cat);
    else (byCat[o.cat] = byCat[o.cat] || []).push(o.v);
  });
  // 큰 목표부터 큰 값에 맞춰야 그리디 매칭이 옳게 된다
  Object.values(byCat).forEach(a => a.sort((x, y) => y - x));
  return { slots, uniques, byCat: Object.entries(byCat) };
}

function _hrHasGoals() {
  const g = _hrGetGoals();
  return g.slots.length > 0 || g.uniques.length > 0 || g.byCat.length > 0;
}

function _hrLineFitsSlot(line, slot) {
  return slot.some(o => o.unique ? line.name === o.cat : (_statContrib(line.name)[o.cat] || 0) >= o.v);
}

/* 단독 칸(uniques, byCat)이 주어진 줄들로 만족되는지 */
function _hrPlainMet(g, lines) {
  const names = lines.map(l => l.name);
  for (const u of g.uniques) if (!names.includes(u)) return false;
  for (const [cat, targets] of g.byCat) {
    const vals = names.map(n => _statContrib(n)[cat] || 0);
    if (targets.length === 1) {
      if (vals.reduce((a, b) => a + b, 0) < targets[0]) return false;
    } else {
      const sorted = vals.slice().sort((a, b) => b - a);
      if (targets.length > sorted.length) return false;
      for (let i = 0; i < targets.length; i++) if (sorted[i] < targets[i]) return false;
    }
  }
  return true;
}

/* 지금 뜬 세 줄이 목표를 만족하는지. '또는' 칸에 줄을 하나씩 배정해 보고,
   배정되지 않은 나머지 줄로 단독 칸을 판정한다. */
function _hrGoalsMet(lines) {
  const g = _hrGetGoals();
  if (!g.slots.length && !g.uniques.length && !g.byCat.length) return false;
  const assign = (k, used) => {
    if (k === g.slots.length) return _hrPlainMet(g, lines.filter((_, i) => !used.includes(i)));
    return lines.some((ln, i) => !used.includes(i) && _hrLineFitsSlot(ln, g.slots[k]) && assign(k + 1, [...used, i]));
  };
  return assign(0, []);
}

/* silent=true면 화면을 갱신하지 않는다 — 자동 돌리기에서 매 회 다시 그리면 느려서,
   묶음이 끝날 때 한 번만 그린다. */
function _hrRoll(silent) {
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
  if (_hrState.log.length > 100) _hrState.log.pop();
  if (!silent) _hrRender();
  return lines;
}

/* ── 목표까지 자동 돌리기 ──
   한 번에 다 돌리면 화면이 멈추므로 묶음으로 나눠 돌리고, 묶음 사이에 브라우저가
   숨 쉴 틈을 준다(중지 버튼도 그래야 눌린다). 목표를 못 만나도 무한정 돌지 않게
   상한을 둔다 — 확률이 아주 낮은 목표를 걸어두면 영영 안 끝나기 때문. */
let _hrAutoTimer = null;
const HR_AUTO_BATCH = 300;
const HR_AUTO_MAX   = 300000;
let _hrAutoDone = 0;

function _hrStopAuto(msg) {
  if (_hrAutoTimer) { clearInterval(_hrAutoTimer); _hrAutoTimer = null; }
  const btn = document.getElementById('hrAutoBtn');
  if (btn) { btn.textContent = '목표까지 자동 [A]'; btn.classList.remove('sbtn--danger'); }
  _hrRender();
  if (msg) alert(msg);
}

function _hrStartAuto() {
  if (_hrAutoTimer) { _hrStopAuto(); return; }
  if (!_hrHasGoals()) { alert('목표 옵션을 먼저 정해주세요.'); return; }

  const btn = document.getElementById('hrAutoBtn');
  if (btn) { btn.textContent = '■ 중지 [A]'; btn.classList.add('sbtn--danger'); }
  _hrAutoDone = 0;

  _hrAutoTimer = setInterval(() => {
    for (let i = 0; i < HR_AUTO_BATCH; i++) {
      const lines = _hrRoll(true);
      _hrAutoDone++;
      if (_hrGoalsMet(lines)) { _hrStopAuto(); return; }
      if (_hrAutoDone >= HR_AUTO_MAX) {
        _hrStopAuto(`${HR_AUTO_MAX.toLocaleString()}회를 돌렸지만 목표가 나오지 않아 멈췄습니다.`);
        return;
      }
    }
    _hrRender();   // 묶음이 끝날 때만 그린다
  }, 0);
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
  const iconEl = document.getElementById('hrPanelIcon');
  if (iconEl) { iconEl.src = _gradeIconSrc(_hrState.grade); iconEl.style.display = ''; }

  /* 아직 한 번도 안 굴렸으면 빈 줄 3개를 띄워 패널 형태를 유지한다.
     줄마다 그 옵션이 속한 등급 색을 입혀서, 레전드리 옵션이 몇 줄 떴는지
     (= 이탈이 아닌 줄이 몇 개인지) 한눈에 보이게 한다. */
  const cur = _hrState.log[0];
  document.getElementById('hrPanelLines').innerHTML = cur
    ? cur.lines.map(l => `<div class="pot-line" data-grade="${l.grade}">${_shortName(l.name)}</div>`).join('')
    : '<div class="pot-line pot-line--empty">-</div>'.repeat(3);

  document.getElementById('hrCountRed').textContent   = (_hrState.cubes.red   || 0).toLocaleString();
  document.getElementById('hrCountBlack').textContent = (_hrState.cubes.black || 0).toLocaleString();
  mesoEl.textContent = fmtMeso(_hrState.meso);

  logEl.innerHTML = _hrState.log.map(e => `
    <div class="hr-log-row">
      <img class="hr-log-icon" src="${_gradeIconSrc(e.grade)}" alt="" onerror="this.style.display='none'">
      <span class="hr-log-grade" data-grade="${e.grade}">${_GRADE_KR[e.grade]}</span>
      ${e.tieredUp ? '<span class="hr-log-up">등급업</span>' : ''}
      ${e.lines.map(l => `<span class="hr-log-line" data-grade="${l.grade}">${_shortName(l.name)}</span>`).join('')}
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

  // 직접 큐브 까기 — 목표 칸 3줄과 프리셋 버튼을 만들어둔다(_refreshAllRows가 채워준다)
  const goalBox = document.getElementById('hrGoalRows');
  if (goalBox) { for (let i=0;i<3;i++) goalBox.appendChild(_makeHrGoal()); }
  _hrBuildPresets();
  _refreshAllRows();

  // 시작 등급을 바꾸면 진행 상황을 초기화한다
  // 시작 등급이 바뀌면 목표 칸 옵션 목록도 그 등급 기준으로 다시 채워야 한다
  document.getElementById('hrGrade')?.addEventListener('change',()=>{ _hrStopAuto(); _hrReset(); _refreshAllRows(); _hrRecomputeGoalValues(); });
  document.getElementById('hrRollBtn')?.addEventListener('click',()=>{ _hrStopAuto(); _hrRoll(); });
  document.getElementById('hrAutoBtn')?.addEventListener('click',_hrStartAuto);
  document.getElementById('hrResetBtn')?.addEventListener('click',()=>{ _hrStopAuto(); _hrReset(); });
  _hrReset();

  /* S=까기, R=초기화, A=자동. 큐브 탭의 직접 큐브 까기가 열려 있을 때만
     동작하고, 입력칸/셀렉트에 포커스가 있으면(값을 고치는 중이면) 가로채지
     않는다. 기본 동작(스크롤·버튼 재클릭)도 막는다. */
  document.addEventListener('keydown', e => {
    if (!['KeyS', 'KeyR', 'KeyA'].includes(e.code) || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const sec = document.getElementById('sec-cube');
    if (!sec?.classList.contains('active')) return;
    if (document.getElementById('cubeTabHandroll')?.style.display === 'none') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;  // 모달 떠 있으면 무시
    e.preventDefault();
    if (e.code === 'KeyS') { _hrStopAuto(); _hrRoll(); }
    else if (e.code === 'KeyR') { document.getElementById('hrResetBtn')?.click(); }
    else if (e.code === 'KeyA') { document.getElementById('hrAutoBtn')?.click(); }
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
