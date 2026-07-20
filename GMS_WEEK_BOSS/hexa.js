/* =============================================
   calculators.js — HEXA / 해방 / 스타포스 / 보스HP / 포스
   ============================================= */

/* ═══════════════════════════════════════════════
   HEXA 계산기 — 노드 구조 재편
   Skill Node (×2, max30) / Mastery (×4, max10) /
   Boost (×4, max10) / Common: Sol Janus·Sol Hecate (×2, max30)
═══════════════════════════════════════════════ */
// 헥사 강화 수치는 캐릭터별로 저장 → 저장 키에 활성 캐릭터 id를 붙인다.
function _hxCharId() {
  try { const ch = state?.chars?.[state.activeChar]; return ch ? (ch.id ?? state.activeChar) : 'default'; }
  catch { return 'default'; }
}
function _hxKey(base) { return `${base}_${_hxCharId()}`; }

function _hxLoad(base, names, maxLv) {
  const stored = JSON.parse(localStorage.getItem(_hxKey(base)) || '[]');
  return names.map((n, i) => ({ name:n, cur: stored[i]?.cur ?? 0, tgt: stored[i]?.tgt ?? maxLv, max: maxLv }));
}
function _hxSave(base, nodes) {
  localStorage.setItem(_hxKey(base), JSON.stringify(nodes.map(n => ({ cur:n.cur, tgt:n.tgt }))));
}

let hxSkill, hxMastery, hxBoost, hxCommon;
// 활성 캐릭터 기준으로 노드 수치를 다시 불러온다 (캐릭 전환 시 호출)
function _hxReloadForChar() {
  const stored = JSON.parse(localStorage.getItem(_hxKey(STORAGE_KEYS.hexaSkill)) || '[]');
  const defaults = [1, 0, 0];
  hxSkill = ['스킬 노드 1', '스킬 노드 2', '스킬 노드 3'].map((n, i) => {
    let cur = stored[i]?.cur ?? defaults[i];
    if (i === 0) cur = Math.max(1, cur); // 스킬 노드 1 = 오리진: 6차 전직 시 항상 Lv1 이상
    return { name:n, cur, tgt: stored[i]?.tgt ?? 30, max: 30, min: i === 0 ? 1 : 0 };
  });
  hxMastery = _hxLoad(STORAGE_KEYS.hexaMastery, ['마스터리 1','마스터리 2','마스터리 3','마스터리 4'], 30);
  hxBoost   = _hxLoad(STORAGE_KEYS.hexaBoost,   ['부스트 1','부스트 2','부스트 3','부스트 4'], 30);
  hxCommon  = _hxLoad(STORAGE_KEYS.hexaCommon,  ['솔 야누스', '솔 헤카테'], 30);
}
_hxReloadForChar();

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
        if (typeof _hxCompute === 'function') _hxCompute(); // 값 바뀌면 자동 재계산
      });
    });
    list.appendChild(div);
  });
}

function renderAllHexaLists() {
  _hxReloadForChar(); // 활성 캐릭터의 저장 수치로 다시 로드
  const ch  = typeof state !== 'undefined' ? state.chars[state.activeChar] : null;
  const job = ch?.fetched?.job || (typeof JOB_LIST !== 'undefined' && JOB_LIST[ch?.jobIdx]?.name) || '';
  const jd  = (typeof HEXA_JOB_DATA !== 'undefined' && HEXA_JOB_DATA[job]) || (typeof HEXA_DEFAULT_DATA !== 'undefined' ? HEXA_DEFAULT_DATA : { folder:null, skill:['스킬 노드 1','스킬 노드 2'], mastery:['마스터리 1','마스터리 2','마스터리 3','마스터리 4'], boost:['부스트 1','부스트 2','부스트 3','부스트 4'], common:['솔 야누스','솔 헤카테'] });

  const ico = (n) => jd.folder ? `images/skill/${jd.folder}/${n}.png` : null;

  hxSkill.forEach((n,i)   => { n.name = jd.skill[i] || `스킬 노드 ${i+1}`; });
  hxMastery.forEach((n,i) => { if(jd.mastery[i]) n.name = jd.mastery[i]; });
  hxBoost.forEach((n,i)   => { if(jd.boost[i])   n.name = jd.boost[i]; });

  // 공용 코어 개수가 직업마다 다를 수 있으므로 동적으로 맞춤 (캐릭터별 키)
  const stored = JSON.parse(localStorage.getItem(_hxKey(STORAGE_KEYS.hexaCommon)) || '[]');
  while (hxCommon.length < jd.common.length)  hxCommon.push({ name: jd.common[hxCommon.length], cur: stored[hxCommon.length]?.cur ?? 0, tgt: stored[hxCommon.length]?.tgt ?? 30, max: 30 });
  if (hxCommon.length > jd.common.length) hxCommon.length = jd.common.length;
  hxCommon.forEach((n,i)  => { if(jd.common[i])  n.name = jd.common[i]; });

  // 공용 코어 아이콘 — 3번째부터는 직업 폴더 이미지 13번 사용
  const commonIcoFull = [
    'images/skill/Common/sol_janus.png',
    'images/skill/Common/sol_hecate.png',
    ...jd.common.slice(2).map((_, i) => ico(15 + i)),
  ];

  renderNodeList(hxSkill,   'hxSkillList',   STORAGE_KEYS.hexaSkill,   [ico(1), ico(2), ico(3)]);
  renderNodeList(hxMastery, 'hxMasteryList', STORAGE_KEYS.hexaMastery, [ico(5), ico(6), ico(7), ico(8)]);
  renderNodeList(hxBoost,   'hxBoostList',   STORAGE_KEYS.hexaBoost,   [ico(9), ico(10), ico(11), ico(12)]);
  renderNodeList(hxCommon,  'hxCommonList',  STORAGE_KEYS.hexaCommon,  commonIcoFull);
  if (typeof _hxCompute === 'function') _hxCompute(); // 탭 진입/캐릭 전환 시 결과 자동 표시
}

function _hxCompute() {
  if (!document.getElementById('hxResult')) return;
  const haveSE  = parseInt(document.getElementById('hxHaveSE').value)  || 0;
  const haveSEF = parseInt(document.getElementById('hxHaveSEF').value) || 0;
  let totalSE = 0, totalSEF = 0;

  // costTable이 함수면 노드 인덱스별로 다른 테이블 사용 (스킬 노드 1만 무료)
  const tableFor = (costTable, i) => typeof costTable === 'function' ? costTable(i) : costTable;

  function addNodes(nodes, costTable) {
    nodes.forEach((sk, i) => {
      const ct  = tableFor(costTable, i);
      const cur = Math.max(0, Math.min(sk.max, sk.cur));
      const tgt = Math.max(cur, Math.min(sk.max, sk.tgt));
      if (tgt > cur) { const { se, sef } = hexaCumulative(ct, cur, tgt); totalSE += se; totalSEF += sef; }
    });
  }

  // 노드1 = 오리진(4,400조각/145SE), 노드2 = 어센트 이후는 공용 코어와 동일(6,268/208)
  // 노드1 = 오리진(첫 레벨 무료), 노드2 = 어센트(스킬 코어), 노드3 = 3rd 스킬 코어
  const skillTable  = i => i === 0 ? HEXA_SKILL1_COSTS : i === 1 ? HEXA_SKILL_COSTS : HEXA_SKILL3_COSTS;
  // 공용 1·2 = 솔 야누스/헤카테, 3번째부터 = 직업별 공용(프리드의 가호 등)
  const commonTable = i => i < 2 ? HEXA_COMMON_COSTS : HEXA_COMMON3_COSTS;
  addNodes(hxSkill,   skillTable);
  addNodes(hxMastery, HEXA_MASTERY_COSTS);
  addNodes(hxBoost,   HEXA_BOOST_COSTS);
  addNodes(hxCommon,  commonTable);

  // 전체 통계 (0→max, 0→cur, cur→max)
  let totalAllSE = 0, totalAllSEF = 0;
  let usedSE = 0, usedSEF = 0;
  let remainSE = 0, remainSEF = 0;
  function addStats(nodes, costTable) {
    nodes.forEach((sk, i) => {
      const ct  = tableFor(costTable, i);
      const cur = Math.max(0, Math.min(sk.max, sk.cur));
      { const r = hexaCumulative(ct, 0, sk.max); totalAllSE += r.se; totalAllSEF += r.sef; }
      { const r = hexaCumulative(ct, 0, cur);    usedSE   += r.se; usedSEF   += r.sef; }
      { const r = hexaCumulative(ct, cur, sk.max); remainSE += r.se; remainSEF += r.sef; }
    });
  }
  addStats(hxSkill,   skillTable);
  addStats(hxMastery, HEXA_MASTERY_COSTS);
  addStats(hxBoost,   HEXA_BOOST_COSTS);
  addStats(hxCommon,  commonTable);

  const enough  = haveSE >= totalSE;
  const enoughF = haveSEF >= totalSEF;
  const res = document.getElementById('hxResult');
  const SE_ICON  = `<img src="images/skill/Common/sol_erda.png"  class="hx-res-icon" alt="">`;
  const SEF_ICON = `<img src="images/skill/Common/fragment.png" class="hx-res-icon" alt="">`;
  res.innerHTML = `
    <div class="hexa-result-row"><span class="rl">총 요구 솔 에르다</span><span class="rv">${SE_ICON}${totalAllSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">총 요구 솔 에르다 조각</span><span class="rv">${SEF_ICON}${totalAllSEF.toLocaleString()} 개</span></div>
    <div class="hexa-result-row" style="margin-top:6px"><span class="rl">이미 사용한 솔 에르다</span><span class="rv">${SE_ICON}${usedSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">이미 사용한 솔 에르다 조각</span><span class="rv">${SEF_ICON}${usedSEF.toLocaleString()} 개</span></div>
    <div class="hexa-result-row" style="margin-top:6px"><span class="rl">만렙까지 남은 솔 에르다</span><span class="rv">${SE_ICON}${remainSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">만렙까지 남은 솔 에르다 조각</span><span class="rv">${SEF_ICON}${remainSEF.toLocaleString()} 개</span></div>
    <div class="hx-result-sep"></div>
    <div class="hexa-result-label">필요량 계산 결과</div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다</span><span class="rv">${SE_ICON}${totalSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다 조각</span><span class="rv">${SEF_ICON}${totalSEF.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다</span><span class="rv">${SE_ICON}${haveSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다 조각</span><span class="rv">${SEF_ICON}${haveSEF.toLocaleString()} 개</span></div>
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
document.getElementById('hxCalc')?.addEventListener('click', _hxCompute);
// 보유 솔 에르다/조각 변경 시 자동 재계산
['hxHaveSE','hxHaveSEF'].forEach(id => document.getElementById(id)?.addEventListener('change', _hxCompute));

renderAllHexaLists();

/* 보유 솔 에르다 max=20 실시간 강제 */
(function() {
  const seInp = document.getElementById('hxHaveSE');
  if (!seInp) return;
  seInp.addEventListener('change', () => {
    seInp.value = Math.max(0, Math.min(20, parseInt(seInp.value) || 0));
  });
})();

