/* ═══════════════════════════════════════════════
   소울 증폭 시뮬레이터 (2026-09-17 정식 업데이트 반영)

   두 탭:
     1. 증폭 — 소울 에테르+메소를 써서 무기의 증폭 단계를 1→4까지 올린다.
        실패마다 성공률 자체가 오르고(failInc), 별개로 게이지도 쌓여 게이지가
        100%에 닿으면 다음 시도는 확정 성공(둘 다 실측 확인된 규칙).
        처음 1단계에 성공하는 순간 잠재능력(레어, 3줄)이 생긴다.
     2. 잠재 — 그 잠재능력을 재설정(3줄 다시 뽑기)하거나 등급업(레어→…→레전드리)한다.
        등급업은 줄 종류는 유지하고 수치만 새 등급 기준으로 다시 뽑는다.

   잠재능력이 3줄이고 STR/DEX/INT/LUK이 개별 옵션으로 나온다는 건 실제 게임
   스트리밍 화면 캡처로 확인된 사실이다(자세한 경위는 data_soul.js 머리
   주석 참고) — "옵션 1개만 부여"로 되돌리지 말 것.
   옵션 수치는 공격력/마력/보스데미지/데미지/몬스터 방어율 무시 5개만 근사치가
   있고(등급 랭크×단계로 고정, data_soul.js 참고) 나머지는 이름만 나온다.
   ═══════════════════════════════════════════════════════════ */

function _soulData() { return window.SOUL_DATA; }
function _soulIconSrc(g) { return `images/icons/${(g || 'rare').toLowerCase()}.png`; }

let _soulState = {
  stage: 0,       // 0~4, 0=미증폭
  gauge: 0,       // 0~1, 다음 증폭 시도의 게이지
  grade: null,    // null | RARE | EPIC | UNIQUE | LEGENDARY
  lines: [],      // [{ key, label, value }] x 3 (POT_LINES)
  tries: 0, fails: 0, mesoSpent: 0,
  etherSpent: { 1: 0, 2: 0, 3: 0, 4: 0 },
  log: [],        // 증폭 기록
};

let _soulPotStage = 1; // 잠재 탭에서 "몇 단계 기준으로 볼지" 미리보기용 — 실제 증폭 단계(_soulState.stage)와 별개

let _sgState = {
  guTries: 0, guFails: 0, guMesoSpent: 0,
  rsTries: 0, rsMesoSpent: 0,
  log: [],        // 등급업+재설정 기록
};

/* 등급업/단계업 때 쓴다 — 줄 종류(옵션)는 그대로 두고, 각 줄에 배정되는
   등급(자체 등급 1줄 + 아래 등급 2줄)과 그에 따른 수치를 새로 뽑는다. */
function _soulRerollLineValues() {
  if (!_soulState.grade) return;
  const lineGrades = soulLineGrades(_soulState.grade);
  _soulState.lines = _soulState.lines.map((l, i) => ({ ...l, grade: lineGrades[i], value: soulRollValue(l.key, lineGrades[i], _soulState.stage) }));
}

/* 현재 목표에서 몇 번 실패했는지는 게이지를 gaugeStep으로 나눠서 되돌린다
   (게이지가 실패 횟수 × gaugeStep으로 쌓이므로) — 실패 카운터를 따로 안 둬도 된다. */
function _soulAmpFailsAtTarget(info) {
  return Math.round(_soulState.gauge / info.gaugeStep);
}
function _soulAmpChanceNow(info) {
  return Math.min(1, info.chance + _soulAmpFailsAtTarget(info) * info.failInc);
}

/* ── 증폭 ── */
function _soulAmpStep() {
  const D = _soulData();
  if (_soulState.stage >= 4) return false;
  const target = _soulState.stage + 1;
  const info = D.STAGE_INFO[target];

  _soulState.tries++;
  _soulState.mesoSpent += info.meso;
  _soulState.etherSpent[target]++;

  const forced = _soulState.gauge >= 1;
  const chanceNow = _soulAmpChanceNow(info);
  const ok = forced || Math.random() < chanceNow;
  _soulState.log.unshift({ n: _soulState.tries, target, ok, forced, chance: chanceNow });
  if (_soulState.log.length > 200) _soulState.log.length = 200;

  if (ok) {
    _soulState.stage = target;
    _soulPotStage = target;
    _soulState.gauge = 0;
    if (!_soulState.grade) {
      _soulState.grade = 'RARE';
      _soulState.lines = soulRollLines('RARE', target);
    } else {
      // 이미 잠재가 있으면 단계가 올랐으니 줄 종류는 유지하고 수치만 새 단계로 다시 뽑는다
      _soulRerollLineValues();
    }
  } else {
    _soulState.fails++;
    _soulState.gauge = Math.min(1, _soulState.gauge + info.gaugeStep);
  }
  return ok;
}

function _soulAmpRollOnce() { _soulAmpStep(); _soulRenderAmp(); }

function _soulAmpReset() {
  _soulStopAmpAuto();
  _soulState = { stage: 0, gauge: 0, grade: null, lines: [], tries: 0, fails: 0, mesoSpent: 0, etherSpent: { 1: 0, 2: 0, 3: 0, 4: 0 }, log: [] };
  _soulPotStage = 1;
  _soulRenderAmp();
  _soulRenderPotential();
}

const SOUL_AMP_AUTO_MAX = 200000;
let _soulAmpAutoTimer = null;
function _soulStopAmpAuto(msg) {
  if (_soulAmpAutoTimer) { clearTimeout(_soulAmpAutoTimer); _soulAmpAutoTimer = null; }
  const b = document.getElementById('soulAmpAutoBtn');
  if (b) b.textContent = '목표 단계까지 자동 [A]';
  if (msg) alert(msg);
}
function _soulStartAmpAuto() {
  if (_soulAmpAutoTimer) { _soulStopAmpAuto(); return; }
  const goal = Number(document.getElementById('soulAmpGoal')?.value || 4);
  if (_soulState.stage >= goal) { alert('이미 목표 단계 이상입니다.'); return; }
  const b = document.getElementById('soulAmpAutoBtn');
  if (b) b.textContent = '중지 [A]';
  const step = () => {
    for (let i = 0; i < 500; i++) {
      _soulAmpStep();
      if (_soulState.stage >= goal) { _soulStopAmpAuto(); _soulRenderAmp(); _soulRenderPotential(); return; }
      if (_soulState.tries >= SOUL_AMP_AUTO_MAX) {
        _soulStopAmpAuto(`${SOUL_AMP_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표 단계에 닿지 못해 멈췄습니다.`);
        _soulRenderAmp(); return;
      }
    }
    _soulRenderAmp();
    _soulAmpAutoTimer = setTimeout(step, 0);
  };
  step();
}

/* ── 잠재: 재설정(3줄 다시 뽑기) ── */
function _soulResetStep() {
  const D = _soulData();
  if (!_soulState.grade) return false;
  const cost = D.RESET_MESO[_soulState.grade];
  _sgState.rsTries++;
  _sgState.rsMesoSpent += cost;
  _soulState.lines = soulRollLines(_soulState.grade, _soulState.stage);
  _soulPotStage = _soulState.stage;
  _sgState.log.unshift({ type: 'reset', n: _sgState.rsTries, lines: _soulState.lines, grade: _soulState.grade });
  if (_sgState.log.length > 200) _sgState.log.length = 200;
  return true;
}
function _soulResetOnce() {
  if (!_soulState.grade) { alert('먼저 증폭 탭에서 1단계 이상 증폭해야 잠재능력이 생깁니다.'); return; }
  _soulResetStep(); _soulRenderPotential();
}

const SOUL_RESET_AUTO_MAX = 200000;
let _soulResetAutoTimer = null;
function _soulStopResetAuto(msg) {
  if (_soulResetAutoTimer) { clearTimeout(_soulResetAutoTimer); _soulResetAutoTimer = null; }
  const b = document.getElementById('soulResetAutoBtn');
  if (b) b.textContent = '목표 옵션까지 자동 [A]';
  if (msg) alert(msg);
}
function _soulStartResetAuto() {
  if (_soulResetAutoTimer) { _soulStopResetAuto(); return; }
  if (!_soulState.grade) { alert('먼저 증폭 탭에서 1단계 이상 증폭해야 잠재능력이 생깁니다.'); return; }
  const goal = document.getElementById('soulResetGoal')?.value || '';
  if (!goal) { alert('목표 옵션을 먼저 골라주세요.'); return; }
  const b = document.getElementById('soulResetAutoBtn');
  if (b) b.textContent = '중지 [A]';
  const step = () => {
    for (let i = 0; i < 2000; i++) {
      _soulResetStep();
      if (_soulState.lines.some(l => l.key === goal)) { _soulStopResetAuto(); _soulRenderPotential(); return; }
      if (_sgState.rsTries >= SOUL_RESET_AUTO_MAX) {
        _soulStopResetAuto(`${SOUL_RESET_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표 옵션이 나오지 않아 멈췄습니다.`);
        _soulRenderPotential(); return;
      }
    }
    _soulRenderPotential();
    _soulResetAutoTimer = setTimeout(step, 0);
  };
  step();
}

/* ── 잠재: 등급업 ── */
function _soulGradeUpStep() {
  const D = _soulData();
  if (!_soulState.grade) return false;
  const info = D.GRADEUP[_soulState.grade];
  if (!info) return false; // 이미 레전드리
  const cost = D.RESET_MESO[_soulState.grade]; // 공식 재료가 없어 재설정 비용을 임시로 씀
  _sgState.guTries++;
  _sgState.guMesoSpent += cost;
  const ok = Math.random() < info.chance;
  _sgState.log.unshift({ type: 'gradeup', n: _sgState.guTries, from: _soulState.grade, ok });
  if (_sgState.log.length > 200) _sgState.log.length = 200;
  if (ok) { _soulState.grade = info.to; _soulPotStage = _soulState.stage; _soulRerollLineValues(); }
  else _sgState.guFails++;
  return ok;
}
function _soulGradeUpOnce() {
  if (!_soulState.grade) { alert('먼저 증폭 탭에서 1단계 이상 증폭해야 잠재능력이 생깁니다.'); return; }
  if (_soulState.grade === 'LEGENDARY') { alert('이미 레전드리입니다.'); return; }
  _soulGradeUpStep(); _soulRenderPotential();
}

const SOUL_GU_AUTO_MAX = 200000;
let _soulGuAutoTimer = null;
function _soulStopGuAuto(msg) {
  if (_soulGuAutoTimer) { clearTimeout(_soulGuAutoTimer); _soulGuAutoTimer = null; }
  const b = document.getElementById('soulGuAutoBtn');
  if (b) b.textContent = '목표 등급까지 자동 [G]';
  if (msg) alert(msg);
}
function _soulStartGuAuto() {
  if (_soulGuAutoTimer) { _soulStopGuAuto(); return; }
  if (!_soulState.grade) { alert('먼저 증폭 탭에서 1단계 이상 증폭해야 잠재능력이 생깁니다.'); return; }
  const D = _soulData();
  const goal = document.getElementById('soulGuGoal')?.value || 'LEGENDARY';
  if (D.GRADES.indexOf(_soulState.grade) >= D.GRADES.indexOf(goal)) { alert('이미 목표 등급 이상입니다.'); return; }
  const b = document.getElementById('soulGuAutoBtn');
  if (b) b.textContent = '중지 [G]';
  const step = () => {
    for (let i = 0; i < 500; i++) {
      if (!D.GRADEUP[_soulState.grade]) break;
      _soulGradeUpStep();
      if (D.GRADES.indexOf(_soulState.grade) >= D.GRADES.indexOf(goal)) { _soulStopGuAuto(); _soulRenderPotential(); return; }
      if (_sgState.guTries >= SOUL_GU_AUTO_MAX) {
        _soulStopGuAuto(`${SOUL_GU_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표 등급에 닿지 못해 멈췄습니다.`);
        _soulRenderPotential(); return;
      }
    }
    _soulRenderPotential();
    _soulGuAutoTimer = setTimeout(step, 0);
  };
  step();
}

/* ── 렌더: 증폭 탭 ── */
function _soulRenderAmp() {
  const D = _soulData(); if (!D) return;
  const stage = _soulState.stage;
  const target = Math.min(stage + 1, 4);
  const info = D.STAGE_INFO[target];
  const done = stage >= 4;

  document.getElementById('soulAmpStageNow').textContent = stage === 0 ? '미증폭' : `${stage}단계`;
  const lbl = document.getElementById('soulAmpTargetLbl');
  if (lbl) lbl.textContent = done ? '—' : `${target}단계`;
  const chanceNow = done ? 0 : _soulAmpChanceNow(info);
  document.getElementById('soulAmpChance').textContent = done ? '—' : (Math.round(chanceNow * 1000) / 10) + '%';
  document.getElementById('soulAmpGaugeTxt').textContent = done ? '—' : Math.round(_soulState.gauge * 100) + '%';
  const gaugeFill = document.getElementById('soulAmpGaugeFill');
  if (gaugeFill) gaugeFill.style.width = done ? '0%' : Math.round(_soulState.gauge * 100) + '%';
  document.getElementById('soulAmpMeso').textContent = done ? '—' : fmtMeso(info.meso);

  document.getElementById('soulAmpTries').textContent = _soulState.tries.toLocaleString();
  document.getElementById('soulAmpFails').textContent = _soulState.fails.toLocaleString();
  document.getElementById('soulAmpMesoSpent').textContent = fmtMeso(_soulState.mesoSpent);
  document.getElementById('soulAmpEtherSpent').innerHTML = D.STAGES.map(s => `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:.86rem;font-weight:800;color:var(--text)">
      <img class="crystal-icon" src="images/icons/aether_${s}.webp" alt="" onerror="this.style.display='none'">
      <span>${_soulState.etherSpent[s]}개</span>
    </div>`).join('');

  const btn = document.getElementById('soulAmpRollBtn');
  if (btn) { btn.disabled = done; btn.textContent = done ? '4단계 달성' : `증폭 시도 [S]`; }

  document.getElementById('soulAmpLog').innerHTML = _soulState.log.map(e => `
    <div class="fam-log-row${e.ok ? ' is-hit' : ''}">
      <span class="fam-log-n">${e.n}</span>
      <span class="fam-log-line">${e.target}단계 시도 · ${Math.round(e.chance * 1000) / 10}%</span>
      <span class="ru-log-res ${e.ok ? 'ok' : 'no'}">${e.ok ? '성공' : '실패'}</span>
      ${e.forced ? '<span class="ru-log-pity">게이지 만렙</span>' : ''}
    </div>`).join('');
}

/* ── 렌더: 잠재 탭 ── */
function _soulRenderPotential() {
  const D = _soulData(); if (!D) return;
  const panel = document.getElementById('soulPotPanel');
  const has = !!_soulState.grade;

  panel.dataset.grade = _soulState.grade || 'RARE';
  document.getElementById('soulPotIcon').src = _soulIconSrc(_soulState.grade);
  document.getElementById('soulPotIcon').style.display = has ? '' : 'none';

  const stageSel = document.getElementById('soulPotStage');
  if (stageSel) {
    stageSel.disabled = !has;
    stageSel.innerHTML = D.STAGES.map(s => `<option value="${s}"${s === _soulPotStage ? ' selected' : ''}>${s}단계</option>`).join('');
  }

  document.getElementById('soulPotLines').innerHTML = has
    ? _soulState.lines.map(l => `<div class="pot-line" data-grade="${l.grade || _soulState.grade}">${l.label}${l.value != null ? ` +${l.value}%` : ''}</div>`).join('')
    : `<div class="pot-line pot-line--empty">증폭 탭에서 1단계 이상 증폭하면 생깁니다</div>`;

  // 재설정
  document.getElementById('soulResetCost').textContent = has ? fmtMeso(D.RESET_MESO[_soulState.grade]) : '—';
  document.getElementById('soulResetTries').textContent = _sgState.rsTries.toLocaleString();
  document.getElementById('soulResetMesoSpent').textContent = fmtMeso(_sgState.rsMesoSpent);

  // 등급업
  const guInfo = has ? D.GRADEUP[_soulState.grade] : null;
  document.getElementById('soulGuNow').textContent = has ? D.GRADE_LABEL[_soulState.grade] : '—';
  if (has) document.getElementById('soulGuNow').dataset.grade = _soulState.grade;
  document.getElementById('soulGuChance').textContent = guInfo ? (guInfo.chance * 100).toFixed(4).replace(/\.?0+$/, '') + '%' : '—';
  document.getElementById('soulGuCost').textContent = guInfo ? fmtMeso(D.RESET_MESO[_soulState.grade]) : '—';
  const guBtn = document.getElementById('soulGuRollBtn');
  if (guBtn) { guBtn.disabled = !guInfo; guBtn.textContent = !has ? '등급업 [D]' : (guInfo ? '등급업 시도 [D]' : '레전드리 달성'); }
  document.getElementById('soulGuTries').textContent = _sgState.guTries.toLocaleString();
  document.getElementById('soulGuFails').textContent = _sgState.guFails.toLocaleString();
  document.getElementById('soulGuMesoSpent').textContent = fmtMeso(_sgState.guMesoSpent);

  document.getElementById('soulGuLog').innerHTML = _sgState.log.map(e => {
    if (e.type === 'reset') return `
      <div class="fam-log-row">
        <span class="fam-log-n">R${e.n}</span>
        <span class="fam-log-line" data-grade="${e.grade}">재설정 → ${e.lines.map(l => l.label).join(' / ')}</span>
      </div>`;
    return `
      <div class="fam-log-row${e.ok ? ' is-hit' : ''}">
        <span class="fam-log-n">G${e.n}</span>
        <span class="fam-log-line" data-grade="${e.from}">${D.GRADE_LABEL[e.from]} 등급업</span>
        <span class="ru-log-res ${e.ok ? 'ok' : 'no'}">${e.ok ? '성공' : '실패'}</span>
      </div>`;
  }).join('');
}

function _soulBuildResetGoalOpts() {
  const D = _soulData();
  return '<option value="">-</option>' + D.OPTIONS.map(o => `<option value="${o.key}">${o.label}</option>`).join('');
}
function _soulBuildGuGoalOpts() {
  const D = _soulData();
  return D.GRADES.map(g => `<option value="${g}"${g === 'LEGENDARY' ? ' selected' : ''}>${D.GRADE_LABEL[g]}</option>`).join('');
}
function _soulBuildAmpGoalOpts() {
  return _soulData().STAGES.map(s => `<option value="${s}"${s === 4 ? ' selected' : ''}>${s}단계</option>`).join('');
}

function initSoul() {
  const sec = document.getElementById('sec-soul');
  const D = _soulData();
  if (!sec || !D) return;

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">소울 증폭 시뮬레이터</h2></div>

    <div class="sf-tabs">
      <button class="sf-tab active" data-soultab="amp">증폭 시뮬레이터</button>
      <button class="sf-tab" data-soultab="potential">잠재 시뮬레이터</button>
    </div>
    <hr class="sec-sep" />

    <!-- ══ 증폭 ══ -->
    <div id="soulTabAmp">
      <div class="sf-layout">
        <div class="card">
          <div class="card__title">증폭 단계</div>
          <div class="sf-res-item"><span class="sf-res-label">현재 단계</span><span class="sf-res-val" id="soulAmpStageNow">미증폭</span></div>
          <div class="sf-res-item"><span class="sf-res-label">다음 목표</span><span class="sf-res-val" id="soulAmpTargetLbl">1단계</span></div>
          <div class="sf-res-item"><span class="sf-res-label">성공률</span><span class="sf-res-val" id="soulAmpChance">5%</span></div>
          <div class="sf-res-item"><span class="sf-res-label">게이지</span><span class="sf-res-val" id="soulAmpGaugeTxt">0%</span></div>
          <div class="soul-gauge"><div class="soul-gauge__fill" id="soulAmpGaugeFill" style="width:0%"></div></div>
          <div class="sf-res-item"><span class="sf-res-label">메소 소비</span><span class="sf-res-val" id="soulAmpMeso">5억 메소</span></div>

          <div class="cube-btns mt16">
            <button class="sbtn sbtn--primary cube-btn-full" id="soulAmpRollBtn">증폭 시도 [S]</button>
          </div>
          <div class="cube-goal-hint mt16">목표 단계 <select class="sel" id="soulAmpGoal">${_soulBuildAmpGoalOpts()}</select></div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--ghost cube-btn-full" id="soulAmpAutoBtn">목표 단계까지 자동 [A]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="soulAmpResetBtn">초기화 [R]</button>
          </div>
        </div>

        <div class="card">
          <div class="card__title">누적</div>
          <div class="sf-res-item"><span class="sf-res-label">시도</span><span class="sf-res-val" id="soulAmpTries">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">실패</span><span class="sf-res-val" id="soulAmpFails">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">소모 메소</span><span class="sf-res-val" id="soulAmpMesoSpent">0 메소</span></div>
          <div class="sf-res-item" style="align-items:flex-start"><span class="sf-res-label">소모 에테르</span><div id="soulAmpEtherSpent"></div></div>

          <div class="card__title mt16">기록</div>
          <div id="soulAmpLog" class="fam-log"></div>
        </div>
      </div>
    </div>

    <!-- ══ 잠재 ══ -->
    <div id="soulTabPotential" style="display:none">
      <div class="sf-layout">
        <div class="card">
          <div class="card__title">현재 잠재능력</div>
          <div class="cube-goal-hint mt8">미리 볼 단계 <select class="sel" id="soulPotStage"></select></div>
          <div class="pot-panel mt8" id="soulPotPanel" data-grade="RARE">
            <div class="pot-panel__head">
              <img class="pot-panel__icon" id="soulPotIcon" src="" alt="" onerror="this.style.display='none'">
              <span>소울 잠재</span>
            </div>
            <div class="pot-panel__lines" id="soulPotLines"></div>
          </div>

          <div class="card__title mt16">잠재 재설정</div>
          <div class="sf-res-item"><span class="sf-res-label">비용</span><span class="sf-res-val" id="soulResetCost">-</span></div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--primary cube-btn-full" id="soulResetBtn">잠재 재설정 [S]</button>
          </div>
          <div class="cube-goal-hint mt16">목표 옵션 <select class="sel" id="soulResetGoal">${_soulBuildResetGoalOpts()}</select></div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--ghost cube-btn-full" id="soulResetAutoBtn">목표 옵션까지 자동 [A]</button>
          </div>
          <div class="sf-res-item mt16"><span class="sf-res-label">재설정 횟수</span><span class="sf-res-val" id="soulResetTries">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">소모 메소</span><span class="sf-res-val" id="soulResetMesoSpent">0 메소</span></div>
        </div>

        <div class="card">
          <div class="card__title">등급업</div>
          <div class="sf-res-item"><span class="sf-res-label">현재 등급</span><span class="sf-res-val ru-now" id="soulGuNow">-</span></div>
          <div class="sf-res-item"><span class="sf-res-label">등급업 확률</span><span class="sf-res-val" id="soulGuChance">-</span></div>
          <div class="sf-res-item"><span class="sf-res-label">비용</span><span class="sf-res-val" id="soulGuCost">-</span></div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--primary cube-btn-full" id="soulGuRollBtn">등급업 시도 [D]</button>
          </div>
          <div class="cube-goal-hint mt16">목표 등급 <select class="sel" id="soulGuGoal">${_soulBuildGuGoalOpts()}</select></div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--ghost cube-btn-full" id="soulGuAutoBtn">목표 등급까지 자동 [G]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="soulGuResetBtn">전체 초기화 [R]</button>
          </div>
          <div class="sf-res-item mt16"><span class="sf-res-label">시도</span><span class="sf-res-val" id="soulGuTries">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">실패</span><span class="sf-res-val" id="soulGuFails">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">소모 메소</span><span class="sf-res-val" id="soulGuMesoSpent">0 메소</span></div>

          <div class="card__title mt16">기록</div>
          <div id="soulGuLog" class="fam-log"></div>
        </div>
      </div>
    </div>`;

  // 탭 전환
  sec.querySelectorAll('.sf-tab[data-soultab]').forEach(tab => {
    tab.addEventListener('click', () => {
      sec.querySelectorAll('.sf-tab[data-soultab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const t = tab.dataset.soultab;
      document.getElementById('soulTabAmp').style.display = t === 'amp' ? '' : 'none';
      document.getElementById('soulTabPotential').style.display = t === 'potential' ? '' : 'none';
      _soulStopAmpAuto(); _soulStopResetAuto(); _soulStopGuAuto();
    });
  });

  document.getElementById('soulAmpRollBtn').addEventListener('click', () => { _soulStopAmpAuto(); _soulAmpRollOnce(); });
  document.getElementById('soulAmpAutoBtn').addEventListener('click', _soulStartAmpAuto);
  document.getElementById('soulAmpResetBtn').addEventListener('click', () => { _soulAmpReset(); _sgState = { guTries: 0, guFails: 0, guMesoSpent: 0, rsTries: 0, rsMesoSpent: 0, log: [] }; _soulRenderPotential(); });

  document.getElementById('soulPotStage').addEventListener('change', e => {
    _soulPotStage = Number(e.target.value) || 1;
    if (_soulState.grade) _soulState.lines = _soulState.lines.map(l => ({ ...l, value: soulRollValue(l.key, l.grade, _soulPotStage) }));
    _soulRenderPotential();
  });
  document.getElementById('soulResetBtn').addEventListener('click', () => { _soulStopResetAuto(); _soulResetOnce(); });
  document.getElementById('soulResetAutoBtn').addEventListener('click', _soulStartResetAuto);
  document.getElementById('soulGuRollBtn').addEventListener('click', () => { _soulStopGuAuto(); _soulGradeUpOnce(); });
  document.getElementById('soulGuAutoBtn').addEventListener('click', _soulStartGuAuto);
  document.getElementById('soulGuResetBtn').addEventListener('click', () => { _soulAmpReset(); _sgState = { guTries: 0, guFails: 0, guMesoSpent: 0, rsTries: 0, rsMesoSpent: 0, log: [] }; _soulRenderPotential(); });

  /* S=주 동작, A=증폭/재설정 자동, G=등급업 자동, D=등급업 시도, R=초기화 — 열린 탭 기준 */
  document.addEventListener('keydown', e => {
    if (!['KeyS', 'KeyR', 'KeyA', 'KeyG', 'KeyD'].includes(e.code) || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!document.getElementById('sec-soul')?.classList.contains('active')) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;
    e.preventDefault();
    const isAmp = document.getElementById('soulTabAmp').style.display !== 'none';
    if (e.code === 'KeyS') document.getElementById(isAmp ? 'soulAmpRollBtn' : 'soulResetBtn')?.click();
    else if (e.code === 'KeyD' && !isAmp) document.getElementById('soulGuRollBtn')?.click();
    else if (e.code === 'KeyA') document.getElementById(isAmp ? 'soulAmpAutoBtn' : 'soulResetAutoBtn')?.click();
    else if (e.code === 'KeyG' && !isAmp) document.getElementById('soulGuAutoBtn')?.click();
    else if (e.code === 'KeyR') document.getElementById(isAmp ? 'soulAmpResetBtn' : 'soulGuResetBtn')?.click();
  });

  _soulRenderAmp();
  _soulRenderPotential();
}

/* 데이터는 이 탭을 처음 열 때만 받는다(큐브·패밀리어와 같은 방식) */
let _soulLoading = null, _soulInited = false;
function ensureSoulReady(cb) {
  if (window.SOUL_DATA) {
    if (!_soulInited) { _soulInited = true; initSoul(); }
    cb && cb(); return;
  }
  if (!_soulLoading) {
    _soulLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'data_soul.js?v=20260926f';
      s.onload = resolve;
      s.onerror = () => reject(new Error('data_soul.js 로드 실패'));
      document.body.appendChild(s);
    });
  }
  _soulLoading.then(() => {
    if (!_soulInited) { _soulInited = true; initSoul(); }
    cb && cb();
  }).catch(() => {
    const sec = document.getElementById('sec-soul');
    if (sec) sec.innerHTML = '<div class="soon-box"><div class="soon-box__title">데이터를 불러오지 못했습니다</div><div class="soon-box__desc">새로고침해주세요.</div></div>';
  });
}
