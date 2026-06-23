/* =============================================
   calculators.js — HEXA / 해방 / 스타포스 / 보스HP / 포스
   ============================================= */

/* ═══════════════════════════════════════════════
   HEXA 계산기
═══════════════════════════════════════════════ */
let hexaSupportSkills = [
  { name:'마스터리 코어 1', cur:0, tgt:10 },
  { name:'강화 코어 1',     cur:0, tgt:10 },
  { name:'부스트 코어 1',   cur:0, tgt:10 },
];

function renderHexaSupport() {
  const list = document.getElementById('hxSupportList');
  list.innerHTML = '';
  hexaSupportSkills.forEach((sk, i) => {
    const div = document.createElement('div');
    div.className = 'hexa-support-item';
    div.innerHTML = `
      <span>${sk.name}</span>
      <span style="font-size:.75rem;color:var(--text-sub)">현재</span>
      <input class="inp" type="number" value="${sk.cur}" min="0" max="10" data-i="${i}" data-field="cur" />
      <span style="font-size:.75rem;color:var(--text-sub)">목표</span>
      <input class="inp" type="number" value="${sk.tgt}" min="1" max="10" data-i="${i}" data-field="tgt" />
      <button onclick="removeHexaSkill(${i})" style="color:var(--danger);font-size:1rem">×</button>`;
    div.querySelectorAll('input[data-i]').forEach(inp => {
      inp.addEventListener('change', () => {
        hexaSupportSkills[i][inp.dataset.field] = Math.max(0, Math.min(10, parseInt(inp.value)||0));
      });
    });
    list.appendChild(div);
  });
}

window.removeHexaSkill = (i) => {
  hexaSupportSkills.splice(i, 1);
  renderHexaSupport();
};

document.getElementById('hxAddSupport').addEventListener('click', () => {
  hexaSupportSkills.push({ name:`스킬 ${hexaSupportSkills.length+1}`, cur:0, tgt:10 });
  renderHexaSupport();
});

document.getElementById('hxCalc').addEventListener('click', () => {
  const haveSE  = parseInt(document.getElementById('hxHaveSE').value)  || 0;
  const haveSEF = parseInt(document.getElementById('hxHaveSEF').value) || 0;

  const oriCur = Math.max(0, Math.min(30, parseInt(document.getElementById('hxOriginCur').value)||0));
  const oriTgt = Math.max(1, Math.min(30, parseInt(document.getElementById('hxOriginTgt').value)||30));

  let totalSE = 0, totalSEF = 0;

  // 오리진
  if (oriTgt > oriCur) {
    const { se, sef } = hexaCumulative(HEXA_ORIGIN_COSTS, oriCur, oriTgt);
    totalSE += se; totalSEF += sef;
  }
  // 서포트
  hexaSupportSkills.forEach(sk => {
    const cur = Math.max(0, Math.min(10, sk.cur));
    const tgt = Math.max(cur, Math.min(10, sk.tgt));
    if (tgt > cur) {
      const { se, sef } = hexaCumulative(HEXA_SUPPORT_COSTS, cur, tgt);
      totalSE += se; totalSEF += sef;
    }
  });

  // 보유 환산 (SEF 10개 = SE 1개 등가 계산)
  const haveTotalSEF = haveSE * 10 + Math.floor(haveSEF / 10);  // SE를 SEF로 통합
  // 필요량 vs 보유량
  const needSE  = totalSE;
  const needSEF = totalSEF;
  const needTotal_asSEF = needSE * 100 + needSEF; // 대략적 가중치
  const haveTotal_asSEF = haveSE * 100 + haveSEF;
  const diff = haveTotal_asSEF - needTotal_asSEF;
  const enough = diff >= 0;

  const res = document.getElementById('hxResult');
  res.innerHTML = `
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다</span><span class="rv">${needSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">필요 솔 에르다 조각</span><span class="rv">${needSEF.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다</span><span class="rv">${haveSE.toLocaleString()} 개</span></div>
    <div class="hexa-result-row"><span class="rl">보유 솔 에르다 조각</span><span class="rv">${haveSEF.toLocaleString()} 개</span></div>
    <div class="hexa-result-row" style="margin-top:8px;padding-top:8px;border-top:2px solid var(--border)">
      <span class="rl">솔 에르다 부족량</span>
      <span class="rv ${enough?'ok':'ng'}">${enough?'충분!':'부족 ' + (needSE - haveSE) + ' 개'}</span>
    </div>
    <div class="hexa-result-row">
      <span class="rl">솔 에르다 조각 부족량</span>
      <span class="rv ${haveSEF>=needSEF?'ok':'ng'}">${haveSEF>=needSEF?'충분!':'부족 ' + (needSEF - haveSEF) + ' 개'}</span>
    </div>
    <div style="margin-top:10px;font-size:.75rem;color:var(--text-sub);line-height:1.6">
      ※ 비용은 근삿값입니다. 실제 게임과 차이가 있을 수 있습니다.<br>
      ※ 오리진 ${oriCur}→${oriTgt}레벨, 서포트 ${hexaSupportSkills.length}개 스킬 기준
    </div>`;
});

renderHexaSupport();

/* ═══════════════════════════════════════════════
   해방 계산기 — 제네시스 (어둠의 흔적)
═══════════════════════════════════════════════ */
const genState = (() => {
  const def = { quest:0, held:0, pass:false, sel:{} };
  try { return Object.assign(def, JSON.parse(localStorage.getItem('lib_genesis_v2') || '{}')); }
  catch { return def; }
})();
function saveGen() { localStorage.setItem('lib_genesis_v2', JSON.stringify(genState)); }

function bossInfo(id) { return BOSS_DATA.find(b => b.id === id) || { name:id, img:'' }; }
function fmtTrace(n) { return Number(n).toLocaleString(); }

/* 선택된 보스들의 주간/월간 흔적 합계 (패스 배율 적용) */
function genTraceSums() {
  const mult = genState.pass ? GENESIS_PASS_MULT : 1;
  let weekly = 0, monthly = 0;
  for (const id in TRACE_YIELD) {
    const sel = genState.sel[id];
    if (!sel || !sel.on) continue;
    const yld = (TRACE_YIELD[id][sel.diff] || 0) * mult;
    if (id === 'blackmage') monthly += yld; else weekly += yld;
  }
  return { weekly, monthly, mult };
}

function renderGenesis() {
  const panel = document.getElementById('lib-genesis');
  const { weekly, monthly, mult } = genTraceSums();
  const fourWeek = weekly * 4 + monthly;
  const avgPerWeek = weekly + monthly / 4;

  const held = Math.max(0, genState.held);
  const q    = GENESIS_QUESTS[genState.quest] || GENESIS_QUESTS[0];
  const nextQ = GENESIS_QUESTS[genState.quest + 1];
  const remaining = Math.max(0, GENESIS_TARGET - held);
  const pct = Math.min(100, Math.round(held / GENESIS_TARGET * 100));
  const weeksLeft = avgPerWeek > 0 ? Math.ceil(remaining / avgPerWeek) : Infinity;

  // 현재 퀘스트 소모량 & 다음 퀘스트까지 진행
  const prevCum = genState.quest > 0 ? GENESIS_QUESTS[genState.quest - 1].cum : 0;
  const consume = q.cum - prevCum;
  const nextLabel = nextQ ? `→ 다음: ${nextQ.name} (${fmtTrace(nextQ.cum)} 흔적)` : '최종 단계';
  const toNext = nextQ ? Math.max(0, nextQ.cum - held) : 0;

  const clearedCount = Object.values(genState.sel).filter(s => s && s.on).length;
  const targetDate = (() => {
    if (!isFinite(weeksLeft)) return '—';
    const d = new Date(); d.setDate(d.getDate() + weeksLeft * 7);
    return `${d.getFullYear()}. ${String(d.getMonth()+1).padStart(2,'0')}. ${String(d.getDate()).padStart(2,'0')}.`;
  })();

  const questOpts = GENESIS_QUESTS.map((qq, i) =>
    `<option value="${i}" ${i===genState.quest?'selected':''}>${qq.name} — ${fmtTrace(qq.cum)}</option>`).join('');

  // 보스 선택 카드
  const bossCards = Object.keys(TRACE_YIELD).map(id => {
    const info = bossInfo(id);
    const sel  = genState.sel[id] || { on:false, diff:Object.keys(TRACE_YIELD[id])[0] };
    const diffOpts = Object.keys(TRACE_YIELD[id]).map(d =>
      `<option value="${d}" ${sel.diff===d?'selected':''}>${DIFF_META[d]?.label || d} · ${fmtTrace(TRACE_YIELD[id][d] * mult)}</option>`).join('');
    return `
      <div class="gen-boss ${sel.on?'on':''}" data-id="${id}">
        <div class="boss-thumb"><img src="${info.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <div class="gen-boss__main">
          <div class="gen-boss__name">${info.name}${id==='blackmage'?'<span class="boss-monthly">월간</span>':''}</div>
          <select class="sel gen-boss__diff" data-id="${id}">${diffOpts}</select>
        </div>
        <button class="gen-boss__toggle ${sel.on?'on':''}" data-id="${id}">${sel.on?'격파':'미격파'}</button>
      </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="gen-grid">
      <!-- 좌: 진행도 -->
      <div class="card gen-progress">
        <div class="card__title">해방 진행도</div>
        <div class="gen-date">${targetDate}</div>
        <div class="gen-date__sub">예상 해방일 (${isFinite(weeksLeft)?weeksLeft+'주':'—'})</div>
        <div class="gen-prog-row"><span>현재 진행</span><span>${fmtTrace(held)} / ${fmtTrace(GENESIS_TARGET)} 흔적</span></div>
        <div class="lib-progress"><div class="lib-progress__fill" style="width:${pct}%"></div></div>
        <div class="lib-pct">${pct}%</div>
        <div class="gen-quest-now">현재 퀘스트: <b>${q.name}</b> · 소모 ${fmtTrace(consume)} 흔적<br><span class="gen-quest-next">${nextLabel}${nextQ?` · ${fmtTrace(toNext)} 남음`:''}</span></div>
      </div>

      <!-- 우: 흔적 소스 -->
      <div class="card gen-sources">
        <div class="card__title">흔적 획득량</div>
        <div class="gen-src-row"><span class="dot dot-blue"></span>주간 흔적<b>${fmtTrace(weekly)}</b></div>
        <div class="gen-src-row"><span class="dot dot-purple"></span>검은 마법사 (월간)<b>${fmtTrace(monthly)}</b></div>
        <div class="gen-src-row total">4주 합계<b>${fmtTrace(fourWeek)}</b></div>
        <div class="gen-src-note">주당 평균 ≈ ${fmtTrace(Math.round(avgPerWeek))} · 남은 흔적 ${fmtTrace(remaining)}${genState.pass?' · 패스 3배 적용':''}</div>
      </div>
    </div>

    <!-- 설정 -->
    <div class="card">
      <div class="card__title">설정</div>
      <div class="gen-config">
        <div class="field">
          <label class="field__label">현재 퀘스트</label>
          <select class="sel" id="genQuest">${questOpts}</select>
        </div>
        <div class="field">
          <label class="field__label">보유 어둠의 흔적</label>
          <input class="inp" id="genHeld" type="number" min="0" max="${TRACE_HOLD_MAX}" value="${held}" />
        </div>
        <div class="field">
          <label class="field__label">제네시스 패스 (흔적 3배)</label>
          <label class="gen-switch"><input type="checkbox" id="genPass" ${genState.pass?'checked':''} /> <span>사용 ${genState.pass?'ON':'OFF'}</span></label>
        </div>
      </div>
    </div>

    <!-- 보스 선택 -->
    <div class="card">
      <div class="card__title">이번 주 보스 선택 <span class="gen-cleared">${clearedCount}개 선택</span></div>
      <div class="gen-bosses">${bossCards}</div>
    </div>`;

  // 이벤트
  document.getElementById('genQuest').addEventListener('change', e => {
    genState.quest = parseInt(e.target.value) || 0;
    // 퀘스트 선택 시 보유 흔적이 해당 누적 미만이면 맞춰줌(편의)
    saveGen(); renderGenesis();
  });
  document.getElementById('genHeld').addEventListener('input', e => {
    genState.held = Math.max(0, Math.min(TRACE_HOLD_MAX, parseInt(e.target.value) || 0));
    saveGen(); renderGenesis();
  });
  document.getElementById('genPass').addEventListener('change', e => {
    genState.pass = e.target.checked; saveGen(); renderGenesis();
  });
  panel.querySelectorAll('.gen-boss__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cur = genState.sel[id] || { on:false, diff:Object.keys(TRACE_YIELD[id])[0] };
      genState.sel[id] = { ...cur, on:!cur.on };
      saveGen(); renderGenesis();
    });
  });
  panel.querySelectorAll('.gen-boss__diff').forEach(s => {
    s.addEventListener('change', () => {
      const id = s.dataset.id;
      const cur = genState.sel[id] || { on:false };
      genState.sel[id] = { ...cur, diff:s.value };
      saveGen(); renderGenesis();
    });
  });
}

function renderDestiny() {
  const panel = document.getElementById('lib-destiny');
  panel.innerHTML = `
    <div class="card" style="text-align:center;padding:48px 24px">
      <div style="font-size:1rem;font-weight:800;margin-bottom:8px">데스티니 해방</div>
      <div class="lib-info">데스티니 해방 계산기는 준비 중입니다.</div>
    </div>`;
}

// 탭 전환
document.querySelectorAll('.lib-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.lib-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('lib-' + tab.dataset.lib).classList.add('active');
  });
});

renderGenesis();
renderDestiny();

/* ═══════════════════════════════════════════════
   스타포스 기댓값 계산기 (몬테카를로 시뮬레이션)
═══════════════════════════════════════════════ */
function renderSFRateTable() {
  const table = document.getElementById('sfRateTable');
  table.innerHTML = `<thead><tr>
    <th>현재 성</th><th>목표 성</th><th>성공률</th><th>실패율</th><th>파괴율</th><th>1회 비용 (Lv.200)</th>
  </tr></thead><tbody>` +
  SF_RATES.map((r, i) => `<tr>
    <td>${i}★</td><td>${i+1}★</td>
    <td style="color:var(--success);font-weight:700">${(r[0]*100).toFixed(0)}%</td>
    <td style="color:var(--primary)">${(r[1]*100).toFixed(0)}%</td>
    <td style="color:var(--danger);font-weight:${r[2]>0?700:400}">${r[2]>0?(r[2]*100).toFixed(0)+'%':'—'}</td>
    <td>${fmtMeso(sfCost(200, i))}</td>
  </tr>`).join('') + '</tbody>';
}

document.getElementById('sfCalc').addEventListener('click', () => {
  const lv       = parseInt(document.getElementById('sfLevel').value) || 200;
  const from     = parseInt(document.getElementById('sfFrom').value)  || 0;
  const to       = Math.min(25, parseInt(document.getElementById('sfTo').value) || 22);
  const discount = parseFloat(document.getElementById('sfDiscount').value) || 1;
  const safe12   = document.getElementById('sfSafe12').checked;
  const safe17   = document.getElementById('sfSafe17').checked;
  const safe22   = document.getElementById('sfSafe22').checked;
  const safeSet  = new Set([safe12?12:null, safe17?17:null, safe22?22:null].filter(Boolean));

  if (from >= to) return alert('목표 성이 현재 성보다 높아야 합니다.');

  const SIM = 100_000;
  let totalMeso = 0, totalBooms = 0, totalAttempts = 0;

  for (let sim = 0; sim < SIM; sim++) {
    let star = from, meso = 0, attempts = 0;
    while (star < to) {
      const cost = sfCost(lv, star) * discount;
      meso += cost;
      attempts++;
      const rand = Math.random();
      const [ps, pf, pd] = SF_RATES[star];
      if (rand < ps) {
        star++;
      } else if (rand < ps + pd) {
        // 파괴
        if (safeSet.has(star)) {
          // 파괴방지: 해당 성으로 복구 (비용만 지불)
        } else {
          totalBooms++;
          star = Math.max(from, 12); // 12성으로 복구 (일반)
        }
      } else {
        // 실패
        if (SF_DECREASE[star]) star = Math.max(0, star - 1);
      }
    }
    totalMeso += meso;
    totalAttempts += attempts;
  }

  const avgMeso     = Math.round(totalMeso / SIM);
  const avgAttempts = Math.round(totalAttempts / SIM);
  const avgBooms    = (totalBooms / SIM).toFixed(2);

  document.getElementById('sfResult').innerHTML = `
    <div class="sf-res-item"><span class="sf-res-label">평균 소요 메소</span><span class="sf-res-val big">${fmtMeso(avgMeso)}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">평균 시도 횟수</span><span class="sf-res-val">${avgAttempts.toLocaleString()} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">평균 파괴 횟수</span><span class="sf-res-val" style="color:var(--danger)">${avgBooms} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">아이템 레벨</span><span class="sf-res-val">${lv}</span></div>
    <div class="sf-res-item"><span class="sf-res-label">구간</span><span class="sf-res-val">${from}★ → ${to}★</span></div>
    <div class="sf-res-item"><span class="sf-res-label">메소 할인</span><span class="sf-res-val">${discount<1?Math.round((1-discount)*100)+'% 할인':'없음'}</span></div>
    <div style="margin-top:8px;font-size:.74rem;color:var(--text-sub)">
      ※ ${SIM.toLocaleString()}회 시뮬레이션 결과. 실제와 차이가 있을 수 있습니다.<br>
      ※ 비용 기준: 게임 내 실제 메소 비용과 근사값
    </div>`;
});

/* ═══════════════════════════════════════════════
   보스 HP 카드
═══════════════════════════════════════════════ */
const DIFF_KR_TO_ENG = { '이지':'easy', '노말':'normal', '하드':'hard', '카오스':'chaos', '익스트림':'extreme' };
const bossHPActiveDiffs = {};

function parseBossHpValue(value) {
  if (value == null || value === '' || value === '—') return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).replace(/,/g, '').trim();
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num)) return 0;
  if (/Q$/i.test(raw)) return num * 10_000_000;
  if (/T$/i.test(raw)) return num * 10_000;
  if (/B$/i.test(raw)) return num * 10;
  if (/M$/i.test(raw)) return num / 100;
  if (raw.includes('조')) return num * 10_000;
  return num;
}

function fmtBossHpEok(eok) {
  if (!eok) return '—';
  const fmt = n => +n.toFixed(2).replace(/\.?0+$/, '');
  if (eok >= 10_000_000) return `${fmt(eok / 10_000_000)}Q`;
  if (eok >= 10_000)     return `${fmt(eok / 10_000)}T`;
  if (eok >= 10)         return `${fmt(eok / 10)}B`;
  return `${fmt(eok * 100)}M`;
}

function renderBossHPTable() {
  const norm = s => s.replace(/\s/g, '');

  // 보스명으로 그룹화 (BOSS_HP_TABLE 순서 유지)
  const groups = [];
  const seen   = {};
  BOSS_HP_TABLE.forEach(b => {
    if (!seen[b.name]) {
      seen[b.name] = { name: b.name, img: '', monthly: false, diffs: [] };
      groups.push(seen[b.name]);
    }
    seen[b.name].diffs.push(b);
  });

  // BOSS_DATA 에서 이미지·월간 여부 매핑
  BOSS_DATA.forEach(bd => {
    const key = Object.keys(seen).find(k => norm(k) === norm(bd.name));
    if (key) { seen[key].img = bd.img; seen[key].monthly = !!bd.monthly; }
  });

  // 월간보스 맨 뒤, 그 외 레벨 내림차순
  groups.sort((a, b) => {
    if (a.monthly !== b.monthly) return (a.monthly ? 1 : 0) - (b.monthly ? 1 : 0);
    const aLv = Math.max(...a.diffs.map(d => d.lv || 0));
    const bLv = Math.max(...b.diffs.map(d => d.lv || 0));
    return bLv - aLv;
  });

  const container = document.getElementById('bossHPCards');
  container.innerHTML = groups.map(boss => {
    const imgHtml = boss.img
      ? `<img src="${boss.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span>`
      : '<span class="noimg">BOSS</span>';

    const activeDiff = bossHPActiveDiffs[boss.name] || boss.diffs[0]?.diff;
    const active = boss.diffs.find(d => d.diff === activeDiff) || boss.diffs[0];
    bossHPActiveDiffs[boss.name] = active.diff;

    const activeEngDiff = DIFF_KR_TO_ENG[active.diff] || 'normal';
    const activeMeta = DIFF_META[activeEngDiff] || { label: active.diff, cls: 'diff-normal' };

    const forceEl = active.force
      ? `<span class="force ${active.ftype === 'auth' ? 'force-auth' : 'force-arc'}">${active.force}</span>`
      : '';

    // 난이도 select
    const diffOpts = boss.diffs.map(d => {
      const eng = DIFF_KR_TO_ENG[d.diff] || 'normal';
      const meta = DIFF_META[eng] || { label: d.diff };
      return `<option value="${d.diff}"${d.diff === active.diff ? ' selected' : ''}>${meta.label}</option>`;
    }).join('');
    const diffSel = `<select class="bhp-diff-sel" data-boss="${boss.name}">${diffOpts}</select>`;

    // 선택된 난이도 pill
    const activePill = `<div class="bhp-active-diff"><span class="dpill ${activeMeta.cls} sel"><span class="dpill__t">${activeMeta.label}</span></span></div>`;

    const phases = (BOSS_HP_PHASES[boss.name + '_' + active.diff] || []);
    const totalHpEok = parseBossHpValue(active.hp);

    const pdrHtml = active.pdr != null
      ? `<div class="bhp-pdr">방어율 <b>${active.pdr}%</b></div>`
      : '';

    const phaseHtml = phases.length > 0
      ? phases.map((ph, i) =>
          (i > 0 ? '<hr class="bhp-sep">' : '') +
          `<div class="bhp-phase"><span>${ph.label}</span><span class="bhp-phase__val">${ph.hp || '—'}</span></div>`
        ).join('')
      : `<div class="bhp-phase"><span>총 체력</span><span class="bhp-phase__val">${fmtBossHpEok(active.hp)}</span></div>`;

    const threshHtml = totalHpEok > 0 ? `
      <div class="bhp-thresholds">
        <div class="bhp-thresh bhp-thresh--10"><span>10%</span><b>${fmtBossHpEok(totalHpEok * 0.10)}</b></div>
        <div class="bhp-thresh bhp-thresh--5"><span>5%</span><b>${fmtBossHpEok(totalHpEok * 0.05)}</b></div>
      </div>` : '';

    return `<div class="bhp-card${boss.monthly ? ' bhp-card--monthly' : ''}">
      <div class="bhp-card__img">${imgHtml}</div>
      <div class="bhp-card__body">
        <div class="bhp-card__name">${active.nameOverride || boss.name}${boss.monthly ? '<span class="boss-monthly">월간</span>' : ''}</div>
        <div class="bhp-card__info">
          <span class="bhp-lv">Lv.${active.lv ?? '—'}</span>
          ${forceEl}
        </div>
        ${pdrHtml}
        ${activePill}
        ${diffSel}
        <div class="bhp-diff">${phaseHtml}</div>
        ${threshHtml}
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.bhp-diff-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      bossHPActiveDiffs[sel.dataset.boss] = sel.value;
      renderBossHPTable();
    });
  });
}

renderBossHPTable();
renderSFRateTable();
