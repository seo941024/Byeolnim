/* ═══════════════════════════════════════════════
   HEXA 계산기
   Skill Node (×3) / Mastery (×4) / Boost (×4) / Common: Sol Janus·Sol Hecate + 직업별 공용.
   코어 개수는 직업마다 다르고(data_hexa.js), 모든 노드의 최대 레벨은 30.
═══════════════════════════════════════════════ */
// 헥사 강화 수치는 캐릭터별로 저장 → 저장 키에 활성 캐릭터 id를 붙인다.
function _hxCharId() {
  try { const ch = state?.chars?.[state.activeChar]; return ch ? (ch.id ?? state.activeChar) : 'default'; }
  catch { return 'default'; }
}
function _hxKey(base) { return `${base}_${_hxCharId()}`; }

/* 코어 개수는 직업마다 다르므로(시아 마스터리 1개 등) 직업 데이터의 이름 수만큼 불러온다.
   minFirst: 첫 노드의 최소 레벨 */
function _hxLoad(base, names, minFirst = 0) {
  const stored = JSON.parse(localStorage.getItem(_hxKey(base)) || '[]');
  return names.map((name, i) => {
    const min = i === 0 ? minFirst : 0;
    let cur = stored[i]?.cur ?? 0;
    if (cur < min) cur = min;
    return { name, cur, tgt: stored[i]?.tgt ?? 30, max: 30, min };
  });
}
function _hxSave(base, nodes) {
  localStorage.setItem(_hxKey(base), JSON.stringify(nodes.map(n => ({ cur:n.cur, tgt:n.tgt }))));
}

let hxSkill, hxMastery, hxBoost, hxCommon;
let _hxJobData = null;   // 현재 직업의 HEXA 데이터 (비용 예외 참조용)

// 아이콘 로드 실패 시 .png ↔ .webp 상호 대체, 그래도 없으면 숨김
function _hxIcoFallback(img) {
  if (!img.dataset.alt && /\.png$/.test(img.src)) { img.dataset.alt = '1'; img.src = img.src.replace(/\.png$/, '.webp'); }
  else if (!img.dataset.alt && /\.webp$/.test(img.src)) { img.dataset.alt = '1'; img.src = img.src.replace(/\.webp$/, '.png'); }
  else { img.style.display = 'none'; }
}

function renderNodeList(nodes, containerId, storageKey, icons=[]) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';
  nodes.forEach((sk, i) => {
    const div = document.createElement('div');
    div.className = 'hexa-support-item';
    const iconHtml = icons[i]
      ? `<img src="${icons[i]}" class="hx-node-icon" alt="" onerror="_hxIcoFallback(this)" />`
      : '';
    const minCur = sk.min ?? 0;
    div.innerHTML = `
      <span class="hx-node-name">${iconHtml}${sk.name}</span>
      <span style="font-size:.75rem;color:var(--text-sub)">현재</span>
      <input class="inp" type="number" value="${sk.cur}" min="${minCur}" max="${sk.max}" data-i="${i}" data-field="cur" />
      <span style="font-size:.75rem;color:var(--text-sub)">목표</span>
      <input class="inp" type="number" value="${sk.tgt}" min="${minCur}" max="${sk.max}" data-i="${i}" data-field="tgt" />`;
    div.querySelectorAll('input[data-i]').forEach(inp => {
      // 입력은 자유롭게, blur/Enter(change) 때만 클램프·저장
      inp.addEventListener('change', () => {
        const v = Math.max(minCur, Math.min(sk.max, parseInt(inp.value) || 0));
        inp.value = v;
        nodes[i][inp.dataset.field] = v;
        _hxSave(storageKey, nodes);
        _hxCompute(); // 값 바뀌면 자동 재계산
      });
    });
    list.appendChild(div);
  });
}

/* 탭 진입·캐릭 전환 때마다 활성 캐릭터의 저장 수치로 다시 불러와 그린다 */
function renderAllHexaLists() {
  const ch  = state.chars[state.activeChar];
  const job = ch?.fetched?.job || JOB_LIST[ch?.jobIdx]?.name || '';
  const jd  = HEXA_JOB_DATA[job] || HEXA_DEFAULT_DATA;

  const ico = (n) => jd.folder ? `images/skill/${jd.folder}/${n}.png` : null;

  _hxJobData = jd;   // 비용 계산에서 직업별 예외(skillCost 등) 참조
  hxSkill   = _hxLoad(STORAGE_KEYS.hexaSkill,   jd.skill, 1); // 노드1=오리진: 6차 전직 시 항상 Lv1 이상
  hxMastery = _hxLoad(STORAGE_KEYS.hexaMastery, jd.mastery);
  hxBoost   = _hxLoad(STORAGE_KEYS.hexaBoost,   jd.boost);
  hxCommon  = _hxLoad(STORAGE_KEYS.hexaCommon,  jd.common);

  // 공용 코어 아이콘 — 솔 야누스·헤카테는 공용 그림, 나머지는 직업 폴더 15번부터.
  // 자리로 정하면 솔 야누스가 없는 직업(데몬 어벤져)에서 아이콘이 한 칸씩 밀린다.
  const SOL_ICON = { '솔 야누스': 'images/skill/Common/sol_janus.png', '솔 헤카테': 'images/skill/Common/sol_hecate.png' };
  let jobCommonIdx = 0;
  const commonIcoFull = jd.common.map(n => SOL_ICON[n] || ico(15 + jobCommonIdx++));

  renderNodeList(hxSkill,   'hxSkillList',   STORAGE_KEYS.hexaSkill,   [ico(1), ico(2), ico(3)]);
  renderNodeList(hxMastery, 'hxMasteryList', STORAGE_KEYS.hexaMastery, [ico(5), ico(6), ico(7), ico(8)]);
  renderNodeList(hxBoost,   'hxBoostList',   STORAGE_KEYS.hexaBoost,   [ico(9), ico(10), ico(11), ico(12)]);
  renderNodeList(hxCommon,  'hxCommonList',  STORAGE_KEYS.hexaCommon,  commonIcoFull);
  _hxClampHaveSE(); // 캐릭터 레벨에 따라 솔 에르다 최대 소지량이 달라진다
  _hxCompute(); // 탭 진입/캐릭 전환 시 결과 자동 표시
}

function _hxCompute() {
  if (!document.getElementById('hxResult')) return;
  const haveSE  = parseInt(document.getElementById('hxHaveSE').value)  || 0;
  const haveSEF = parseInt(document.getElementById('hxHaveSEF').value) || 0;
  let totalSE = 0, totalSEF = 0;         // 현재 → 목표
  let totalAllSE = 0, totalAllSEF = 0;   // 0 → max
  let usedSE = 0, usedSEF = 0;           // 0 → 현재
  let remainSE = 0, remainSEF = 0;       // 현재 → max

  // costTable이 함수면 노드 인덱스별로 다른 테이블 사용 (스킬 노드 1만 무료)
  const tableFor = (costTable, i) => typeof costTable === 'function' ? costTable(i) : costTable;

  function addNodes(nodes, costTable) {
    nodes.forEach((sk, i) => {
      const ct  = tableFor(costTable, i);
      const cur = Math.max(0, Math.min(sk.max, sk.cur));
      const tgt = Math.max(cur, Math.min(sk.max, sk.tgt));
      if (tgt > cur) { const { se, sef } = hexaCumulative(ct, cur, tgt); totalSE += se; totalSEF += sef; }
      { const r = hexaCumulative(ct, 0, sk.max); totalAllSE += r.se; totalAllSEF += r.sef; }
      { const r = hexaCumulative(ct, 0, cur);    usedSE   += r.se; usedSEF   += r.sef; }
      { const r = hexaCumulative(ct, cur, sk.max); remainSE += r.se; remainSEF += r.sef; }
    });
  }

  // 노드1 = 오리진(첫 레벨 무료), 노드2 = 어센트(스킬 코어), 노드3 = 3rd 스킬 코어
  // skillCost:'common' 직업(시아 아스텔)은 오리진 외 스킬 코어도 공용 비용 사용
  const skillIsCommon = _hxJobData?.skillCost === 'common';
  const skillTable  = i => i === 0 ? HEXA_SKILL1_COSTS
                         : skillIsCommon ? HEXA_COMMON_COSTS
                         : i === 1 ? HEXA_SKILL_COSTS : HEXA_SKILL3_COSTS;
  // 솔 야누스/헤카테는 공용 비용, 나머지 = 직업별 공용(프리드의 가호 등). 이름으로 가린다(데몬 어벤져는 야누스가 없다)
  const commonTable = i => /^솔 (야누스|헤카테)$/.test(hxCommon[i]?.name || '') ? HEXA_COMMON_COSTS : HEXA_COMMON3_COSTS;
  addNodes(hxSkill,   skillTable);
  addNodes(hxMastery, HEXA_MASTERY_COSTS);
  addNodes(hxBoost,   HEXA_BOOST_COSTS);
  addNodes(hxCommon,  commonTable);

  const enough  = haveSE >= totalSE;
  const enoughF = haveSEF >= totalSEF;
  const res = document.getElementById('hxResult');
  // 아이콘은 항상 값 뒤(오른쪽 끝)에 고정폭 상자로 붙는다 — 그래야 숫자 자릿수가
  // 달라도 아이콘 위치(=행의 끝점)가 전부 같아진다.
  const seIcon  = `<span class="hx-res-icon-wrap"><img src="images/icons/Use_Sol_Erda.png" class="hx-res-icon" alt=""></span>`;
  const sefIcon = `<span class="hx-res-icon-wrap"><img src="images/icons/Etc_Sol_Erda_Fragment_(Full_Size).png" class="hx-res-icon" alt=""></span>`;
  const SE_ICON  = n => `${n.toLocaleString()}${seIcon}`;
  const SEF_ICON = n => `${n.toLocaleString()}${sefIcon}`;
  res.innerHTML = `
    <div class="hexa-result-row"><span class="rl">총 요구 솔 에르다</span><span class="rv">${SE_ICON(totalAllSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">총 요구 솔 에르다 조각</span><span class="rv">${SEF_ICON(totalAllSEF)}</span></div>
    <div class="hexa-result-row" style="margin-top:6px"><span class="rl">이미 사용한 솔 에르다</span><span class="rv">${SE_ICON(usedSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">이미 사용한 솔 에르다 조각</span><span class="rv">${SEF_ICON(usedSEF)}</span></div>
    <div class="hexa-result-row" style="margin-top:6px"><span class="rl">만렙까지 남은 솔 에르다</span><span class="rv">${SE_ICON(remainSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">만렙까지 남은 솔 에르다 조각</span><span class="rv">${SEF_ICON(remainSEF)}</span></div>
    <div class="hx-result-sep"></div>
    <div class="hexa-result-label">필요량 계산 결과</div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다</span><span class="rv">${SE_ICON(totalSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다 조각</span><span class="rv">${SEF_ICON(totalSEF)}</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다</span><span class="rv">${SE_ICON(haveSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다 조각</span><span class="rv">${SEF_ICON(haveSEF)}</span></div>
    <div class="hexa-result-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="rl">솔 에르다 부족량</span>
      <span class="rv ${enough?'hp-suf':'ng'}">${enough?'요구량 충족':(totalSE-haveSE).toLocaleString()+' 개 부족'}</span>
    </div>
    <div class="hexa-result-row">
      <span class="rl">솔 에르다 조각 부족량</span>
      <span class="rv ${enoughF?'hp-suf':'ng'}">${enoughF?'요구량 충족':(totalSEF-haveSEF).toLocaleString()+' 개 부족'}</span>
    </div>
    <div style="margin-top:10px;font-size:.75rem;color:var(--text-sub);line-height:1.6">
      ※ 비용은 근삿값입니다. 실제 게임과 차이가 있을 수 있습니다.
    </div>`;
}
/* 솔 에르다 최대 소지량 — 캐릭터 레벨에 따라 284까지 20개, 285~289는 25개, 290부터 30개.
   캐릭터가 없으면 레벨을 모르므로 가장 큰 30개까지 받는다 */
function solErdaMax() {
  const ch = state.chars[state.activeChar];
  if (!ch) return 30;
  const lv = parseInt(ch.fetched?.level || ch.level) || 0;
  return lv >= 290 ? 30 : lv >= 285 ? 25 : 20;
}
/* 보유 솔 에르다 칸의 최대값을 활성 캐릭터에 맞추고, 넘는 값은 최대로 잘라 칸에도 되돌려 적는다 */
function _hxClampHaveSE() {
  const inp = document.getElementById('hxHaveSE');
  if (!inp) return;
  const max = solErdaMax();
  inp.max = max;
  inp.value = Math.max(0, Math.min(max, parseInt(inp.value) || 0));
}

document.getElementById('hxCalc')?.addEventListener('click', _hxCompute);
// 보유 솔 에르다/조각 변경 시 자동 재계산
document.getElementById('hxHaveSE')?.addEventListener('change', () => {
  _hxClampHaveSE();
  _hxCompute();
});
document.getElementById('hxHaveSEF')?.addEventListener('change', _hxCompute);

renderAllHexaLists();

