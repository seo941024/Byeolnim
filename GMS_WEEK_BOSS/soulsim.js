/* ═══════════════════════════════════════════════
   소울 증폭 시뮬레이터

   두 탭은 서로 독립적이다:
     1. 증폭 — 소울 에테르+메소를 써서 무기의 증폭 단계를 1→4까지 올린다.
        실패마다 성공률 자체가 오르고(failInc), 별개로 게이지도 쌓여 게이지가
        100%에 닿으면 다음 시도는 확정 성공(둘 다 실측 확인된 규칙).
     2. 잠재 — 큐브 직작과 같은 방식. 등급·단계를 드롭다운으로 직접 고르고
        잠재능력(3줄)을 재설정한다. 등급업은 "등급업 시도"라는 별도 버튼이
        아니라, 잠재 재설정을 할 때마다 같이 굴러가는 확률이다(나무위키
        "재설정 횟수" 표로 확인 — 재설정 한 번마다 등급업 확률 판정이 같이
        일어나고, 그 등급에서 재설정을 ceil번 했는데 안 오르면 다음 재설정에서
        무조건 확정 상승하는 천장이 있다: 레어→에픽 100번, 에픽→유니크
        256번, 유니크→레전드리 451번). 처음엔 등급업 버튼을 아예 없애면서
        이 천장 메커니즘까지 같이 날려먹은 적이 있음 — 등급업 "버튼"만 없앤
        거고 확률+천장 로직 자체는 재설정 안에 반드시 살아있어야 함.
        증폭을 실제로 진행하지 않아도 바로 쓸 수 있다(증폭 진행 상황과 분리).

   잠재능력이 3줄이고 STR/DEX/INT/LUK이 개별 옵션으로 나온다는 건 실제 게임
   스트리밍 화면 캡처로 확인된 사실이다(자세한 경위는 data_soul.js 머리
   주석 참고) — "옵션 1개만 부여"로 되돌리지 말 것.
   옵션 수치는 공격력/마력/보스데미지/데미지/몬스터 방어율 무시 5개만 근사치가
   있고(등급 랭크×단계로 고정, data_soul.js 참고) 나머지는 이름만 나온다.
   ═══════════════════════════════════════════════════════════ */

function _soulData() { return window.SOUL_DATA; }
function _soulIconSrc(g) { return `images/icons/${(g || 'rare').toLowerCase()}.png`; }

const _soulAmpFresh = () => ({
  stage: 0,       // 0~4, 0=미증폭
  gauge: 0,       // 0~1, 다음 증폭 시도의 게이지
  tries: 0, mesoSpent: 0,
  etherSpent: { 1: 0, 2: 0, 3: 0, 4: 0 },
  log: [],        // 증폭 기록
});
let _soulState = _soulAmpFresh();

// 잠재 탭 전용 상태 — 증폭 탭(_soulState)과 완전히 별개다.
// gradeStreak: 지금 등급에서 등급업 없이 재설정한 횟수(천장 판정용).
let _soulPotState = { grade: 'RARE', stage: 1, lines: [], gradeStreak: 0 };

let _sgState = {
  rsTries: 0, rsMesoSpent: 0,
  log: [],        // 재설정 기록
};

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
  if (_soulState.stage >= 4) return;
  const target = _soulState.stage + 1;
  const info = D.STAGE_INFO[target];

  _soulState.tries++;
  _soulState.mesoSpent += info.meso;
  _soulState.etherSpent[target]++;

  // 2단계는 3.03%씩 33번 쌓으면 99.99%라 1에 못 미친다 — 완충 횟수 33회와 맞도록 오차를 둔다
  const forced = _soulState.gauge >= 0.999;
  const chanceNow = _soulAmpChanceNow(info);
  const ok = forced || Math.random() < chanceNow;
  _soulState.log.unshift({ n: _soulState.tries, target, ok, forced, chance: chanceNow });
  if (_soulState.log.length > 200) _soulState.log.length = 200;

  if (ok) {
    _soulState.stage = target;
    _soulState.gauge = 0;
  } else {
    _soulState.gauge = Math.min(1, _soulState.gauge + info.gaugeStep);
  }
}

function _soulAmpRollOnce() { _soulAmpStep(); _soulRenderAmp(); }

function _soulAmpReset() {
  _soulAmpAuto.stop();
  _soulState = _soulAmpFresh();
  _soulRenderAmp();
}

/* 목표 단계는 자동을 시작할 때 읽어 둔다 — 도는 중에 드롭다운을 바꿔도 그대로 */
const SOUL_AMP_AUTO_MAX = 200000;
let _soulAmpGoal = 4;
const _soulAmpAuto = createAutoRunner({
  btnId: 'soulAmpAutoBtn', idleLabel: '목표 단계까지 자동 [A]', runLabel: '중지 [A]', batch: 500,
  canStart: () => {
    _soulAmpGoal = Number(document.getElementById('soulAmpGoal')?.value || 4);
    if (_soulState.stage >= _soulAmpGoal) { alert('이미 목표 단계 이상입니다.'); return false; }
  },
  tick: () => {
    _soulAmpStep();
    if (_soulState.stage >= _soulAmpGoal) return 'done';
    if (_soulState.tries >= SOUL_AMP_AUTO_MAX) return 'max';
  },
  maxMsg: () => `${SOUL_AMP_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표 단계에 닿지 못해 멈췄습니다.`,
  render: _soulRenderAmp,
});

/* ── 잠재: 등급/단계 직접 선택 ── */
/* 수치를 적을 수 있는 목표 칸을 지금 등급·단계 기준 실제 값으로 채운다. 1번째 줄은 잠재 자체
   등급 값, 2·3번째 줄은 한 단계 아래 등급 값(이탈은 드물어서 기본값으로는 안 씀 — 레어처럼
   아래 등급이 없으면 자체 등급 값으로 대체). 등급·단계가 바뀌면 채워둔 수치도 다시 계산한다
   (큐브 직작 목표 수치 버그 수정과 같은 이유). 수치 칸은 numeric 옵션을 골랐을 때만 열려 있다. */
function _soulRecomputeGoalValues() {
  const D = _soulData();
  const grade = _soulPotState.grade, stage = _soulPotState.stage;
  const idx = D.GRADES.indexOf(grade);
  const below = idx > 0 ? D.GRADES[idx - 1] : grade;
  for (let i = 1; i <= 3; i++) {
    const inp = document.getElementById(`soulResetGoalVal${i}`);
    if (!inp.disabled) inp.value = soulTierValue(i === 1 ? grade : below, stage);
  }
}
/* 등급·단계를 직접 고르면 그 기준으로 3줄을 다시 뽑는다. 등급을 바꾸면 천장 횟수도 처음부터 */
function _soulPotSet(patch) {
  Object.assign(_soulPotState, patch);
  _soulPotState.lines = soulRollLines(_soulPotState.grade, _soulPotState.stage);
  _soulRenderPotential();
  _soulRecomputeGoalValues();
}
/* 큐브 직작의 _hrReset과 동일 — 지금 골라둔 등급·단계는 그대로 두고
   재설정 진행 상황(횟수·메소·기록·천장)만 초기화한다. */
function _soulPotFullReset() {
  _soulResetAuto.stop();
  const grade = _soulPotState.grade, stage = _soulPotState.stage;
  _soulPotState = { grade, stage, lines: soulRollLines(grade, stage), gradeStreak: 0 };
  _sgState = { rsTries: 0, rsMesoSpent: 0, log: [] };
  _soulRenderPotential();
}

/* ── 잠재: 재설정(3줄 다시 뽑기) ── 등급업은 별도 시도가 아니라 재설정할 때마다
   같이 굴러가는 확률 + 천장이다(나무위키 "재설정 횟수" 표). */
function _soulResetStep() {
  const D = _soulData();
  const cost = D.RESET_MESO[_soulPotState.grade];
  _sgState.rsTries++;
  _sgState.rsMesoSpent += cost;

  const gu = D.GRADEUP[_soulPotState.grade];
  let upgraded = false;
  if (gu) {
    _soulPotState.gradeStreak++;
    // 천장: ceil번 재설정해도 안 오르면 그 다음 재설정(ceil+1번째)에서 확정 — 예) 레어→에픽 100번 실패 후 101번째
    const forced = _soulPotState.gradeStreak > gu.ceil;
    if (forced || Math.random() < gu.chance) {
      _soulPotState.grade = gu.to;
      _soulPotState.gradeStreak = 0;
      upgraded = true;
    }
  }

  _soulPotState.lines = soulRollLines(_soulPotState.grade, _soulPotState.stage);
  _sgState.log.unshift({ n: _sgState.rsTries, lines: _soulPotState.lines, grade: _soulPotState.grade, upgraded });
  if (_sgState.log.length > 200) _sgState.log.length = 200;
}
function _soulResetOnce() { _soulResetStep(); _soulRenderPotential(); }

/* 자주 쓰는 프리셋(큐브 직작의 "공격력 3줄"류와 같은 방식) — 3칸 전부 같은
   옵션으로 채우고, 수치는 _soulRecomputeGoalValues가 지금 등급·단계 기준 실제 값으로 채운다. */
const SOUL_PRESETS = [
  { label: '공격력 3줄', key: 'atkPct' },
  { label: '마력 3줄',   key: 'matkPct' },
];
function _soulApplyPreset(key) {
  for (let i = 1; i <= 3; i++) {
    const sel = document.getElementById(`soulResetGoal${i}`);
    sel.value = key;
    sel.dispatchEvent(new Event('change'));
  }
  _soulRecomputeGoalValues();
}

/* 목표 옵션 3칸 — 큐브 직작과 똑같은 판정: 같은 키를 한 칸에만 적으면 세 줄
   합산 기준, 같은 키를 여러 칸에 나눠 적으면 그 칸 수만큼 각 줄이 따로
   만족해야 한다. 수치를 안 적으면(0 또는 빈칸) 그 키가 나왔는지 존재만 본다. */
function _soulGetGoals() {
  const byKey = {};
  for (let i = 1; i <= 3; i++) {
    const key = document.getElementById(`soulResetGoal${i}`)?.value;
    if (!key) continue;
    const v = parseFloat(document.getElementById(`soulResetGoalVal${i}`)?.value);
    (byKey[key] = byKey[key] || []).push(!isNaN(v) && v > 0 ? v : 0);
  }
  Object.values(byKey).forEach(a => a.sort((x, y) => y - x));
  return Object.entries(byKey);
}
function _soulGoalsMet(lines) {
  const goals = _soulGetGoals();
  if (!goals.length) return false;
  for (const [key, targets] of goals) {
    const vals = lines.filter(l => l.key === key).map(l => l.value || 0).sort((a, b) => b - a);
    if (targets.every(t => t === 0)) {
      if (vals.length < targets.length) return false;
      continue;
    }
    if (targets.length === 1) {
      if (vals.reduce((a, b) => a + b, 0) < targets[0]) return false;
    } else {
      if (targets.length > vals.length) return false;
      for (let i = 0; i < targets.length; i++) if ((vals[i] || 0) < targets[i]) return false;
    }
  }
  return true;
}

const SOUL_RESET_AUTO_MAX = 200000;
const _soulResetAuto = createAutoRunner({
  btnId: 'soulResetAutoBtn', idleLabel: '목표 옵션까지 자동 [A]', runLabel: '중지 [A]', batch: 2000,
  canStart: () => {
    if (!_soulGetGoals().length) { alert('목표 옵션을 먼저 골라주세요.'); return false; }
  },
  tick: () => {
    _soulResetStep();
    if (_soulGoalsMet(_soulPotState.lines)) return 'done';
    if (_sgState.rsTries >= SOUL_RESET_AUTO_MAX) return 'max';
  },
  maxMsg: () => `${SOUL_RESET_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표 옵션이 나오지 않아 멈췄습니다.`,
  render: _soulRenderPotential,
});

/* ── 렌더: 증폭 탭 ── */
function _soulRenderAmp() {
  const D = _soulData();
  const stage = _soulState.stage;
  const target = Math.min(stage + 1, 4);
  const info = D.STAGE_INFO[target];
  const done = stage >= 4;
  const gauge = Math.round(_soulState.gauge * 100) + '%';

  document.getElementById('soulAmpStageNow').textContent = stage === 0 ? '미증폭' : `${stage}단계`;
  document.getElementById('soulAmpTargetLbl').textContent = done ? '—' : `${target}단계`;
  document.getElementById('soulAmpChance').textContent = done ? '—' : (Math.round(_soulAmpChanceNow(info) * 1000) / 10) + '%';
  document.getElementById('soulAmpGaugeTxt').textContent = done ? '—' : gauge;
  document.getElementById('soulAmpGaugeFill').style.width = done ? '0%' : gauge;
  document.getElementById('soulAmpMeso').textContent = done ? '—' : fmtMeso(info.meso);

  document.getElementById('soulAmpTries').textContent = _soulState.tries.toLocaleString();
  document.getElementById('soulAmpMesoSpent').textContent = fmtMeso(_soulState.mesoSpent);
  document.getElementById('soulAmpEtherSpent').innerHTML = D.STAGES.map(s => `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:.86rem;font-weight:800;color:var(--text)">
      <img class="crystal-icon" src="images/icons/aether_${s}.webp" alt="" onerror="this.style.display='none'">
      <span style="display:inline-block;min-width:2ch;text-align:right">${_soulState.etherSpent[s]}</span><span>개</span>
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

/* ── 렌더: 잠재 탭 (큐브 직작과 같은 좌 설정 / 우 결과 배치) ── */
function _soulRenderPotential() {
  const D = _soulData();
  const grade = _soulPotState.grade;

  document.getElementById('soulPotPanel').dataset.grade = grade;
  document.getElementById('soulPotIcon').src = _soulIconSrc(grade);

  const gradeSel = document.getElementById('soulPotGrade');
  if (gradeSel.value !== grade) gradeSel.value = grade;
  document.getElementById('soulPotStage').innerHTML = D.STAGES.map(s => `<option value="${s}"${s === _soulPotState.stage ? ' selected' : ''}>${s}단계</option>`).join('');

  document.getElementById('soulResetCost').textContent = fmtMeso(D.RESET_MESO[grade]);
  const gu = D.GRADEUP[grade];
  const streakEl = document.getElementById('soulGuStreak');
  streakEl.closest('.sf-res-item').style.display = gu ? '' : 'none';
  if (gu) streakEl.textContent = `${_soulPotState.gradeStreak} / ${gu.ceil}`;

  document.getElementById('soulPotLines').innerHTML = _soulPotState.lines
    .map(l => `<div class="pot-line" data-grade="${l.grade}">${l.value != null ? `${l.label.replace(/\s*%$/, '')} : +${l.value}%` : l.label}</div>`).join('');

  document.getElementById('soulResetTries').textContent = _sgState.rsTries.toLocaleString();
  document.getElementById('soulResetMesoSpent').textContent = fmtMeso(_sgState.rsMesoSpent);

  document.getElementById('soulGuLog').innerHTML = _sgState.log.map(e => `
    <div class="fam-log-row${e.upgraded ? ' is-hit' : ''}">
      <span class="fam-log-n">${e.n}</span>
      <span class="fam-log-line" data-grade="${e.grade}">${e.upgraded ? `${D.GRADE_LABEL[e.grade]} 등급업 · ` : ''}${e.lines.map(l => l.label).join(' / ')}</span>
    </div>`).join('');
}

function _soulBuildGoalOpts() {
  return '<option value="">-</option>' + _soulData().OPTIONS.map(o => `<option value="${o.key}">${o.label}</option>`).join('');
}
function _soulBuildGradeOpts() {
  const D = _soulData();
  return D.GRADES.map(g => `<option value="${g}">${D.GRADE_LABEL[g]}</option>`).join('');
}
function _soulBuildAmpGoalOpts() {
  return _soulData().STAGES.map(s => `<option value="${s}"${s === 4 ? ' selected' : ''}>${s}단계</option>`).join('');
}

function initSoul() {
  const sec = document.getElementById('sec-soul');
  const D = _soulData();
  if (!sec || !D) return;

  _soulPotState.lines = soulRollLines(_soulPotState.grade, _soulPotState.stage);

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
          <div class="card__title">설정</div>
          <div class="cube-goal-hint mt8">등급 선택 <select class="sel" id="soulPotGrade">${_soulBuildGradeOpts()}</select></div>
          <div class="cube-goal-hint">단계 선택 <select class="sel" id="soulPotStage"></select></div>
          <div class="sf-res-item mt16"><span class="sf-res-label">재설정 비용</span><span class="sf-res-val" id="soulResetCost">-</span></div>
          <div class="sf-res-item"><span class="sf-res-label">등급업</span><span class="sf-res-val" id="soulGuStreak">-</span></div>

          <div class="card__title mt16">목표 옵션</div>
          <div class="hr-preset" id="soulPresets"></div>
          <div id="soulGoalRows">
            <div class="cube-goal-row"><select class="sel cube-opt-cat" id="soulResetGoal1">${_soulBuildGoalOpts()}</select><input class="inp cube-opt-inp" type="number" min="0" placeholder="수치" id="soulResetGoalVal1" disabled></div>
            <div class="cube-goal-row"><select class="sel cube-opt-cat" id="soulResetGoal2">${_soulBuildGoalOpts()}</select><input class="inp cube-opt-inp" type="number" min="0" placeholder="수치" id="soulResetGoalVal2" disabled></div>
            <div class="cube-goal-row"><select class="sel cube-opt-cat" id="soulResetGoal3">${_soulBuildGoalOpts()}</select><input class="inp cube-opt-inp" type="number" min="0" placeholder="수치" id="soulResetGoalVal3" disabled></div>
          </div>

          <div class="cube-btns mt16">
            <button class="sbtn sbtn--primary cube-btn-full" id="soulResetBtn">잠재 재설정 [S]</button>
          </div>
          <div class="cube-btns mt8">
            <button class="sbtn sbtn--ghost cube-btn-full" id="soulResetAutoBtn">목표 옵션까지 자동 [A]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="soulGuResetBtn">초기화 [R]</button>
          </div>
        </div>

        <div class="card">
          <div class="card__title">결과</div>
          <div class="pot-panel mt8" id="soulPotPanel" data-grade="RARE">
            <div class="pot-panel__head">
              <img class="pot-panel__icon" id="soulPotIcon" src="" alt="" onerror="this.style.display='none'">
              <span>잠재옵션</span>
            </div>
            <div class="pot-panel__lines" id="soulPotLines"></div>
          </div>

          <div class="sf-res-item mt16"><span class="sf-res-label">재설정 횟수</span><span class="sf-res-val" id="soulResetTries">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">소모 메소</span><span class="sf-res-val" id="soulResetMesoSpent">0 메소</span></div>

          <div class="card__title mt16">타임라인</div>
          <div id="soulGuLog" class="fam-log"></div>
        </div>
      </div>
    </div>`;

  // 탭 전환
  const tabs = sec.querySelectorAll('.sf-tab[data-soultab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActive(tabs, tab);
      const t = tab.dataset.soultab;
      document.getElementById('soulTabAmp').style.display = t === 'amp' ? '' : 'none';
      document.getElementById('soulTabPotential').style.display = t === 'potential' ? '' : 'none';
      _soulAmpAuto.stop(); _soulResetAuto.stop();
    });
  });

  document.getElementById('soulAmpRollBtn').addEventListener('click', () => { _soulAmpAuto.stop(); _soulAmpRollOnce(); });
  document.getElementById('soulAmpAutoBtn').addEventListener('click', _soulAmpAuto.start);
  document.getElementById('soulAmpResetBtn').addEventListener('click', _soulAmpReset);

  document.getElementById('soulPotGrade').addEventListener('change', e => { _soulResetAuto.stop(); _soulPotSet({ grade: e.target.value, gradeStreak: 0 }); });
  document.getElementById('soulPotStage').addEventListener('change', e => { _soulResetAuto.stop(); _soulPotSet({ stage: Number(e.target.value) || 1 }); });
  document.getElementById('soulResetBtn').addEventListener('click', () => { _soulResetAuto.stop(); _soulResetOnce(); });
  document.getElementById('soulResetAutoBtn').addEventListener('click', _soulResetAuto.start);
  document.getElementById('soulGuResetBtn').addEventListener('click', _soulPotFullReset);

  // 목표 옵션 칸: 수치 데이터가 있는 옵션(numeric)을 고를 때만 수치 입력을 열어준다
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`soulResetGoal${i}`).addEventListener('change', e => {
      const D = _soulData();
      const opt = D.OPTIONS.find(o => o.key === e.target.value);
      const valInp = document.getElementById(`soulResetGoalVal${i}`);
      valInp.disabled = !opt?.numeric;
      if (!opt?.numeric) valInp.value = '';
    });
  }

  const presets = document.getElementById('soulPresets');
  presets.innerHTML = SOUL_PRESETS
    .map((p, i) => `<button class="sbtn sbtn--ghost hr-preset__btn" data-preset="${i}">${p.label}</button>`).join('');
  presets.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => _soulApplyPreset(SOUL_PRESETS[+btn.dataset.preset].key));
  });

  /* S=주 동작, A=자동, R=초기화 — 열린 탭 기준. 버튼을 누르는 방식이라 꺼진 버튼은 단축키도 안 듣는다 */
  bindSimKeys('sec-soul', key => {
    const isAmp = document.getElementById('soulTabAmp').style.display !== 'none';
    const ids = isAmp
      ? { s: 'soulAmpRollBtn', a: 'soulAmpAutoBtn', r: 'soulAmpResetBtn' }
      : { s: 'soulResetBtn', a: 'soulResetAutoBtn', r: 'soulGuResetBtn' };
    document.getElementById(ids[key]).click();
  });

  _soulRenderAmp();
  _soulRenderPotential();
}

/* 데이터는 이 탭을 처음 열 때만 받는다 */
const _soulEnsure = lazySection({
  isReady: () => !!window.SOUL_DATA, src: 'data_soul.js?v=20260927a', init: initSoul, secId: 'sec-soul',
});
function ensureSoulReady(cb) { _soulEnsure(cb); }
