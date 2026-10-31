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

/* 코어 개수는 직업마다 다르므로(시아·에렐 마스터리 2개 등) 직업 데이터의 이름 수만큼 불러온다.
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
/* 이름도 같이 적는다. 읽을 때는 자리 기준이지만, 이름이 있으면 아래 자리 옮기기를 이미 마친 값이라는 표시가 된다 */
function _hxSave(base, nodes) {
  localStorage.setItem(_hxKey(base), JSON.stringify(nodes.map(n => ({ cur:n.cur, tgt:n.tgt, name:n.name }))));
}

/* 코어 이름을 게임 영문 이름·게임 슬롯 순서로 바꾸면서 강화 코어 자리가 바뀐 직업.
   값은 예전 자리 순서를 새 이름으로 적은 것이다. 이름 없이 자리 기준으로 저장된 예전 값만 한 번 새 순서로 옮긴다 */
const _HX_LEGACY_ORDER = {
  'Hero':        { boost: ['Burning Soul Blade', 'Worldreaver', 'Instinctual Combo', 'Sword Illusion'] },
  'Wild Hunter': { boost: ["Command: Predator's Eye", 'Wild Arrow Blast: Overdrive', 'Primal Bloom', 'Overbite'] },
};
const _HX_STORE = { skill: 'hexaSkill', mastery: 'hexaMastery', boost: 'hexaBoost', common: 'hexaCommon' };
function _hxMigrateOrder(job, jd) {
  Object.entries(_HX_LEGACY_ORDER[job] || {}).forEach(([cat, oldNames]) => {
    const k = _hxKey(STORAGE_KEYS[_HX_STORE[cat]]);
    const old = JSON.parse(localStorage.getItem(k) || 'null');
    if (!Array.isArray(old) || !old.length || old.some(o => o && o.name != null)) return;
    localStorage.setItem(k, JSON.stringify(jd[cat].map(n => ({ cur: 0, tgt: 30, ...old[oldNames.indexOf(n)], name: n }))));
  });
}

/* 아이콘을 게임 그림으로 바꾼 판. 서비스 워커가 그림을 캐시에서 먼저 주므로 주소에 붙여 새 그림을 받게 한다 */
const _HX_ICON_V = '20261030';

let hxSkill, hxMastery, hxBoost, hxCommon;
let _hxJobData = null;   // 현재 직업의 HEXA 데이터 (비용 예외 참조용)

// 아이콘 로드 실패 시 .png ↔ .webp 상호 대체, 그래도 없으면 숨김
function _hxIcoFallback(img) {
  if (!img.dataset.alt && /\.png(?=\?|$)/.test(img.src)) { img.dataset.alt = '1'; img.src = img.src.replace(/\.png(?=\?|$)/, '.webp'); }
  else if (!img.dataset.alt && /\.webp(?=\?|$)/.test(img.src)) { img.dataset.alt = '1'; img.src = img.src.replace(/\.webp(?=\?|$)/, '.png'); }
  else { img.style.display = 'none'; }
}

/* labels: 화면에 보일 이름. 없으면 기준 이름 sk.name */
function renderNodeList(nodes, containerId, storageKey, icons=[], labels=[]) {
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
      <span class="hx-node-name">${iconHtml}${labels[i] ?? sk.name}</span>
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

/* 에렐 라이트·시아 아스텔은 HEXA가 아니라 에르다 링크를 쓴다. 값은 게임 파일의 직업 번호 */
const ERDALINK_JOBS = { 'Erel Light': '18112', 'Sia Astelle': '18212' };
const _HX_TITLE = { hexa: '헥사 매트릭스 솔 에르다 계산기', erdalink: '에르다 링크 솔 에르다 계산기' };
/* 헥사 목록과 에르다 링크 판 중 하나만 보이게 한다 */
function _hxShowErdaLink(on) {
  const layout = document.querySelector('#sec-hexa .hexa-layout');
  const root   = document.getElementById('elRoot');
  const title  = document.querySelector('#sec-hexa .sec-title');
  if (layout) layout.style.display = on ? 'none' : '';
  if (root)   root.style.display   = on ? '' : 'none';
  if (title)  title.textContent    = on ? _HX_TITLE.erdalink : _HX_TITLE.hexa;
  // 이름 표기 스위치는 헥사 목록에만 쓰이므로 에르다 링크 판에서는 감춘다
  const lang = document.getElementById('hxLang');
  if (lang) lang.style.display = on ? 'none' : '';
}

/* 코어 이름 표기. 영어가 기본이고 고른 값은 STORAGE_KEYS.hexaLang에 남긴다.
   화면 이름만 바꾸며 저장값·비용·아이콘은 기준 영문 이름으로 판단하므로 영향이 없다 */
let _hxLang = 'en';
try { if (localStorage.getItem(STORAGE_KEYS.hexaLang) === 'ko') _hxLang = 'ko'; } catch (e) {}
let _hxIcons = null;   // 현재 직업의 노드별 아이콘 주소. 표기만 바꿔 다시 그릴 때 쓴다

function _hxSyncLangToggle() {
  const btn = document.getElementById('hxLangToggle');
  const label = document.getElementById('hxLangLabel');
  const ko = _hxLang === 'ko';
  if (btn) { btn.classList.toggle('is-ko', ko); btn.setAttribute('aria-pressed', ko); }
  if (label) label.textContent = ko ? '한글' : '영어';
}

/* 불러 둔 노드를 현재 표기로 다시 그린다. 저장값은 다시 읽지 않는다 */
function _hxRenderLists() {
  const jd = _hxJobData;
  if (!jd || !_hxIcons) return;
  const label = cat => jd[cat].map((n, i) => (_hxLang === 'ko' && jd.ko?.[cat]?.[i]) || n);
  renderNodeList(hxSkill,   'hxSkillList',   STORAGE_KEYS.hexaSkill,   _hxIcons.skill,   label('skill'));
  renderNodeList(hxMastery, 'hxMasteryList', STORAGE_KEYS.hexaMastery, _hxIcons.mastery, label('mastery'));
  renderNodeList(hxBoost,   'hxBoostList',   STORAGE_KEYS.hexaBoost,   _hxIcons.boost,   label('boost'));
  renderNodeList(hxCommon,  'hxCommonList',  STORAGE_KEYS.hexaCommon,  _hxIcons.common,  label('common'));
}

document.getElementById('hxLangToggle')?.addEventListener('click', () => {
  _hxLang = _hxLang === 'ko' ? 'en' : 'ko';
  try { localStorage.setItem(STORAGE_KEYS.hexaLang, _hxLang); } catch (e) {}
  _hxSyncLangToggle();
  _hxRenderLists();
});
_hxSyncLangToggle();

/* 탭 진입·캐릭 전환 때마다 활성 캐릭터의 저장 수치로 다시 불러와 그린다 */
function renderAllHexaLists() {
  const ch  = state.chars[state.activeChar];
  const raw = ch?.fetched?.job || JOB_LIST[ch?.jobIdx]?.name || '';
  // 넥슨 랭킹 직업명 Bow Master·Blade Master 등은 JOB_NAME_CANON으로 우리 키에 맞춘다
  const job = typeof canonJobName === 'function' ? canonJobName(raw) : raw;
  const elJob = ERDALINK_JOBS[job];
  _hxShowErdaLink(!!elJob);
  if (elJob) {
    // 에르다 링크 데이터는 헥사 탭이 열려 있을 때만 받는다. 다른 탭에서 캐릭터를 바꿀 때는 자리만 바꿔 둔다
    if (document.getElementById('sec-hexa')?.classList.contains('active') && typeof ensureErdaLinkReady === 'function') {
      ensureErdaLinkReady(() => renderErdaLink(elJob));
    }
    return;
  }
  const jd  = HEXA_JOB_DATA[job] || HEXA_DEFAULT_DATA;

  const ico = (n) => jd.folder ? `images/skill/${jd.folder}/${n}.png?v=${_HX_ICON_V}` : null;

  _hxJobData = jd;   // 비용 계산에서 직업별 예외(skillCost 등) 참조
  _hxMigrateOrder(job, jd);
  hxSkill   = _hxLoad(STORAGE_KEYS.hexaSkill,   jd.skill, 1); // 노드1=오리진: 6차 전직 시 항상 Lv1 이상
  hxMastery = _hxLoad(STORAGE_KEYS.hexaMastery, jd.mastery);
  hxBoost   = _hxLoad(STORAGE_KEYS.hexaBoost,   jd.boost);
  // 데몬 어벤져는 공용 코어 맨 앞에 솔 야누스가 새로 들어갔다. 예전에 솔 헤카테·콜 마스테마 두 칸으로
  // 저장된 값은 자리 기준이라 그대로 읽으면 한 칸씩 밀리므로, 앞에 빈 칸을 하나 끼워 한 번만 옮긴다
  if (job === 'Demon Avenger') {
    const k = _hxKey(STORAGE_KEYS.hexaCommon);
    const old = JSON.parse(localStorage.getItem(k) || 'null');
    if (Array.isArray(old) && old.length === 2) localStorage.setItem(k, JSON.stringify([{ cur: 0, tgt: 30 }, ...old]));
  }
  hxCommon  = _hxLoad(STORAGE_KEYS.hexaCommon,  jd.common);

  // 공용 코어 아이콘 — 솔 야누스·헤카테는 공용 그림, 나머지는 직업 폴더 15번부터.
  // 자리가 아니라 이름으로 가려야 공용 코어 구성이 다른 직업에서도 아이콘이 밀리지 않는다.
  const SOL_ICON = { 'Sol Janus': 'sol_janus', 'Sol Hecate': 'sol_hecate', '솔 야누스': 'sol_janus', '솔 헤카테': 'sol_hecate' };
  const solIco = n => SOL_ICON[n] && `images/skill/Common/${SOL_ICON[n]}.png?v=${_HX_ICON_V}`;
  let jobCommonIdx = 0;
  const commonIcoFull = jd.common.map(n => solIco(n) || ico(15 + jobCommonIdx++));

  _hxIcons = { skill: [ico(1), ico(2), ico(3)], mastery: [ico(5), ico(6), ico(7), ico(8)],
               boost: [ico(9), ico(10), ico(11), ico(12)], common: commonIcoFull };
  _hxRenderLists();
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
  // 솔 야누스/헤카테는 공용 비용, 나머지 = 직업별 3번째 공용(프리드의 가호 등)은 HEXA_COMMON3_COSTS.
  // 화면 표기가 아니라 노드의 기준 이름 name으로 가리므로 한글·영어 전환과 상관없다
  const commonTable = i => /^(Sol (Janus|Hecate)|솔 (야누스|헤카테))$/.test(hxCommon[i]?.name || '') ? HEXA_COMMON_COSTS : HEXA_COMMON3_COSTS;
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
    <div class="hexa-result-row"><span class="rl">이미 사용한 솔 에르다</span><span class="rv">${SE_ICON(usedSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">이미 사용한 솔 에르다 조각</span><span class="rv">${SEF_ICON(usedSEF)}</span></div>
    <div class="hexa-result-row"><span class="rl">만렙까지 남은 솔 에르다</span><span class="rv">${SE_ICON(remainSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">만렙까지 남은 솔 에르다 조각</span><span class="rv">${SEF_ICON(remainSEF)}</span></div>
    <div class="hx-result-sep"></div>
    <div class="hexa-result-label">필요량 계산 결과</div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다</span><span class="rv">${SE_ICON(totalSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다 조각</span><span class="rv">${SEF_ICON(totalSEF)}</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다</span><span class="rv">${SE_ICON(haveSE)}</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다 조각</span><span class="rv">${SEF_ICON(haveSEF)}</span></div>
    <div class="hexa-result-row">
      <span class="rl">솔 에르다 부족량</span>
      <span class="rv ${enough?'hp-suf':'ng'}">${enough?'요구량 충족':(totalSE-haveSE).toLocaleString()+' 개 부족'}</span>
    </div>
    <div class="hexa-result-row">
      <span class="rl">솔 에르다 조각 부족량</span>
      <span class="rv ${enoughF?'hp-suf':'ng'}">${enoughF?'요구량 충족':(totalSEF-haveSEF).toLocaleString()+' 개 부족'}</span>
    </div>`;
  // 비용은 근삿값이라 실제 게임과 차이가 있을 수 있다. 화면 안내는 지수 요청으로 뺐다
}
/* 솔 에르다 최대 소지량 — 캐릭터 레벨에 따라 274까지 20개, 275~289는 25개, 290부터 30개.
   GMS 위키 Sol_Erda 표 260-274 20, 275-289 25, 290+ 30 기준.
   캐릭터가 없으면 레벨을 모르므로 가장 큰 30개까지 받는다 */
function solErdaMax() {
  const ch = state.chars[state.activeChar];
  if (!ch) return 30;
  const lv = parseInt(ch.fetched?.level || ch.level) || 0;
  return lv >= 290 ? 30 : lv >= 275 ? 25 : 20;
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

