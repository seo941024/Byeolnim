/* ═══════════════════════════════════════════════
   스타포스 시뮬레이터 (직접 강화 모드)
═══════════════════════════════════════════════ */

/* 단계 드롭다운 그리드 빌드 */
function sfBuildStageGrid() {
  const grid = document.getElementById('sfStageGrid');
  if (!grid) return;
  const shining = _sfGetEvent() === 'shining';

  const rows = [];
  for (let s = 15; s <= 21; s++) {
    const curStage = _sfStages[s] || 1;
    const maxStage = (s <= 17) ? 4 : 4;

    const opts = [];
    for (let st = 1; st <= maxStage; st++) {
      const isProt = s <= 17 && st === 4;
      const label  = isProt ? '파괴방지' : `${st}단계`;
      opts.push(`<option value="${st}" ${curStage===st?'selected':''}>${label}</option>`);
    }

    const p = (s <= 17 && curStage === 4)
      ? getSfProb(s, shining, true, 1)
      : getSfProb(s, shining, false, curStage);

    const succPct = (p.succ * 100).toFixed(2);
    const failPct = (p.fail * 100).toFixed(2);
    const destPct = (p.dest * 100).toFixed(2);

    rows.push(`
      <div class="sf-stage-row2" data-star="${s}">
        <span class="sf-stage-lbl2">${s}→${s+1}</span>
        <select class="sel sf-stage-sel" data-star="${s}">${opts.join('')}</select>
        <span class="sf-stage-info">
          <span class="sf-stage-prob--succ">성공 ${succPct}%</span>
          <span class="sf-stage-prob--fail">실패 ${failPct}%</span>
          <span class="sf-stage-prob--dest">파괴 ${destPct}%</span>
        </span>
      </div>`);
  }
  grid.innerHTML = rows.join('');

  grid.querySelectorAll('.sf-stage-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      _sfStages[+sel.dataset.star] = +sel.value;
      sfBuildStageGrid();
    });
  });
}

/* 상태 */
let _sfState = { star: 0, cost: 0, attempts: 0, destroys: 0, log: [] };
let _sfStages = { 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 21:1 };
let _sfAutoTimer = null;

function _sfGetEvent()    { return document.querySelector('#sfEventGroup .sf-toggle.active')?.dataset.val || 'none'; }
function _sfGetMvp()      { return parseFloat(document.querySelector('#sfMvpGroup .sf-toggle.active')?.dataset.val || '0'); }
function _sfGetLevel()    { return parseInt(document.getElementById('sfLevel').value) || 200; }
/* 목표·현재 성수는 장비 레벨의 상한을 넘을 수 없다. 확률표는 성수 0~29를
   통짜로 갖고 있어서, 막지 않으면 120제에 22성 같은 게임에 없는 조합도
   숫자만 그럴듯하게 계산돼 버린다. */
function _sfGetFrom()     { return Math.min(sfMaxStar(_sfGetLevel()), parseInt(document.getElementById('sfFrom').value) || 0); }
function _sfGetTo()       {
  const cap = sfMaxStar(_sfGetLevel());
  return Math.min(cap, parseInt(document.getElementById('sfTo').value) || Math.min(22, cap));
}

/* 타이핑 중에 쓰는 가벼운 보정 — 상한만 즉시 걸고 그 외엔 건드리지 않는다.
   숫자를 이어 치면 값은 커지기만 하므로, 중간값이 상한을 넘었다면 최종값도
   넘는다. 즉 위쪽만 자르는 건 입력을 방해하지 않는다. 반대로 빈 칸을 기본값으로
   되돌리거나 현재>=목표를 손보는 건 다 친 뒤(change)에 해야 한다. */
function _sfClampMaxWhileTyping(el) {
  if (el.value === '') return;                 // 지우고 다시 치는 중이면 그대로 둔다
  const cap = sfMaxStar(_sfGetLevel());
  const max = el.id === 'sfFrom' ? Math.max(0, cap - 1) : cap;
  const v   = parseInt(el.value);
  if (!isNaN(v) && v > max) el.value = max;
}

/* 레벨이 바뀌면 상한도 바뀌므로 입력칸의 max와 값 자체를 상한에 맞춰 잘라준다.
   max 속성만으로는 직접 타이핑을 막지 못해 값도 같이 손봐야 한다. */
function _sfClampInputs() {
  const cap  = sfMaxStar(_sfGetLevel());
  const toEl = document.getElementById('sfTo');
  const frEl = document.getElementById('sfFrom');
  if (!toEl || !frEl) return;

  toEl.max = cap;
  frEl.max = Math.max(0, cap - 1);

  let to = Math.min(cap, Math.max(1, parseInt(toEl.value) || Math.min(22, cap)));
  let fr = Math.min(cap - 1, Math.max(0, parseInt(frEl.value) || 0));
  if (fr >= to) fr = to - 1;          // 현재가 목표 이상이면 굴릴 게 없다

  toEl.value = to;
  frEl.value = fr;
  if (_sfState.star > cap) _sfState.star = cap;
}

function _sfGetCfg() {
  const star = _sfState.star;
  const btn  = _sfStages[star] || 1;
  const isShining   = _sfGetEvent() === 'shining';
  const isProtected = (star >= 15 && star <= 17) && btn === 4;
  const stage       = isProtected ? 1 : btn;
  return { level: _sfGetLevel(), mvpDiscount: _sfGetMvp(), isShining, isProtected, stage };
}

/* forAuto=true 면 목표 성수에서 멈춘다(자동 강화용). 직접 누를 때는 목표를 보지 않고
   장비 레벨 상한까지 계속 올릴 수 있다 — 목표는 자동 강화를 어디서 끊을지 정하는
   값이지, 손으로 더 못 올리게 막는 값이 아니다. */
function sfEnhanceOnce(forAuto) {
  const limit = forAuto ? _sfGetTo() : sfMaxStar(_sfGetLevel());
  if (_sfState.star >= limit) { if (forAuto) sfStopAuto(); return false; }

  const star = _sfState.star;
  const cfg  = _sfGetCfg();
  const cost = calcSfCost(cfg.level, star, cfg.mvpDiscount, cfg.isShining, cfg.isProtected, cfg.stage, 0);
  _sfState.cost += cost;
  _sfState.attempts++;

  const p = getSfProb(star, cfg.isShining, cfg.isProtected, cfg.stage);
  const r = Math.random();

  let result, nextStar;
  if (r < p.succ) {
    nextStar = star + 1;
    // 23성 이상을 얻었을 때만 그 별을 반짝이게 한다(칸 번호는 0부터라 -1)
    if (nextStar >= 23) _sfState.pop = nextStar - 1;
    result = { type: 'success', from: star, to: nextStar, cost };
  } else if (r < p.succ + p.fail) {
    nextStar = star > 0 ? star - 1 : star;
    if (star <= 14 || star === 0) nextStar = star; // 0~14성은 유지
    // 실제론 연속실패 시 강제하락 있지만 jaehoom 로직은 단순 유지
    nextStar = star; // 실패 = 유지
    result = { type: 'fail', from: star, to: star, cost };
  } else {
    _sfState.destroys++;
    nextStar = getDestStar(star);
    result = { type: 'destroy', from: star, to: nextStar, cost };
  }

  _sfState.star = nextStar;
  _sfState.log.unshift(result);
  if (_sfState.log.length > 100) _sfState.log.pop();

  sfRenderResult();
  // 계속 돌려도 되는지 — 판단 기준은 호출한 쪽과 같아야 한다(자동은 목표, 직접은 상한)
  return _sfState.star < limit;
}

function sfRenderResult() {
  const el = document.getElementById('sfResult');
  if (!el) return;
  const to = _sfGetTo();
  const done = _sfState.star >= to;

  // 누적 메소 별도 영역
  const spentWrap = document.getElementById('sfSpentWrap');
  const spentVal  = document.getElementById('sfSpentVal');
  if (_sfState.attempts > 0) {
    if (spentWrap) spentWrap.style.display = 'block';
    if (spentVal)  spentVal.textContent = fmtMeso(_sfState.cost);
  }

  sfRenderStarPanel(to, done);

  const stats = `
    <div class="sf-res-item"><span class="sf-res-label">강화 횟수</span><span class="sf-res-val">${_sfState.attempts.toLocaleString()} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">파괴 횟수</span><span class="sf-res-val" style="color:${_sfState.destroys>0?'var(--danger)':'var(--text)'}">${_sfState.destroys} 회</span></div>
    ${done ? '<div class="sf-res-item" style="color:var(--success);font-weight:700;text-align:center;padding:10px 0">목표 달성!</div>' : ''}`;

  const logHtml = _sfState.log.slice(0, 100).map(l => {
    const cls  = l.type === 'success' ? 'log-success' : l.type === 'destroy' ? 'log-destroy' : 'log-fail';
    const icon = l.type === 'success' ? '✦' : l.type === 'destroy' ? '💥' : '✕';
    const desc = l.type === 'success' ? `${l.from}★ → ${l.to}★ 성공` : l.type === 'destroy' ? `${l.from}★ 파괴 → ${l.to}★` : `${l.from}★ 실패`;
    return `<div class="sf-log-row ${cls}"><span class="sf-log-icon">${icon}</span><span class="sf-log-desc">${desc}</span><span class="sf-log-cost">${fmtMeso(l.cost)}</span></div>`;
  }).join('');

  el.innerHTML = stats + (logHtml ? `<div class="sf-log">${logHtml}</div>` : '');
}

/* 별 판 — 목표 성수만큼 별칸을 만들고 현재 성수까지 채운다.
   그 아래에 "현재 ▶▶▶ 다음"과 이번 시도의 성공·실패·파괴 확률을 보여준다.
   스타캐치/파괴방지는 좌측 설정에서 이미 고르므로 여기선 결과만 반영한다. */
function sfRenderStarPanel(to, done) {
  const grid = document.getElementById('sfStarGrid');
  if (!grid) return;
  const star = _sfState.star;

  /* 방금 성공해서 얻은 별에만 반짝임을 준다. _sfState.pop 은 한 번 쓰고 비워서,
     설정을 바꿔 다시 그릴 때 애니메이션이 되풀이되지 않게 한다. */
  const pop = _sfState.pop;
  _sfState.pop = null;

  /* 칸 수는 목표가 아니라 장비 레벨의 상한을 따른다. 목표를 25로 낮춰도
     26~30번째 칸이 빈 별로 남아 있어야 게임 강화창과 같아 보인다. */
  const slots = Math.max(sfMaxStar(_sfGetLevel()), to);
  /* 바로 다음에 얻을 별 한 칸을 점멸시킨다. 목표 성수와는 무관하게 "지금 도전 중인
     칸"을 가리키므로, 별이 1개면 2번째 칸이 깜빡인다. 칸을 다 채웠으면 없다. */
  const goalIdx = (star < slots) ? star : -1;
  grid.innerHTML = Array.from({ length: slots }, (_, i) => {
    const cls = (i < star ? ' on' : '') + (i === pop ? ' pop' : '') + (i === goalIdx ? ' goal' : '');
    return `<span class="sfstar-grid__s${cls}">★</span>`;
  }).join('');

  // 23성부터는 게임처럼 판 테두리를 금색으로 바꿔 한눈에 구분되게 한다
  grid.closest('.sfstar-panel')?.classList.toggle('sfstar-panel--hi', star >= 23);

  document.getElementById('sfStarCur').textContent  = star;
  document.getElementById('sfStarNext').textContent = done ? star : star + 1;

  /* 목표에 닿아도 손으로는 계속 올릴 수 있으므로, 확률표를 치우지 않고 위에 한 줄만
     덧붙인다. 레벨 상한까지 다 채웠을 때만 더 올릴 수 없으니 확률표를 접는다. */
  const rates = document.getElementById('sfStarRates');
  const maxed = star >= sfMaxStar(_sfGetLevel());
  if (maxed) {
    rates.innerHTML = '<div class="sfstar-rates__row sfstar-rates__row--done">최대 성수 도달</div>';
    return;
  }
  const doneRow = done ? '<div class="sfstar-rates__row sfstar-rates__row--done">목표 달성!</div>' : '';
  const cfg = _sfGetCfg();
  const p   = getSfProb(star, cfg.isShining, cfg.isProtected, cfg.stage);
  const cost = calcSfCost(cfg.level, star, cfg.mvpDiscount, cfg.isShining, cfg.isProtected, cfg.stage, 0);
  const pct = v => (v * 100).toFixed(2) + '%';
  rates.innerHTML = `
    ${doneRow}
    <div class="sfstar-rates__row sfstar-rates__row--succ"><span>성공</span><span>${pct(p.succ)}</span></div>
    <div class="sfstar-rates__row"><span>실패</span><span>${pct(p.fail)}</span></div>
    <div class="sfstar-rates__row sfstar-rates__row--dest"><span>파괴</span><span>${pct(p.dest)}</span></div>
    <div class="sfstar-rates__row"><span>사용 재화</span><span>${fmtMeso(cost)}</span></div>`;
}

function sfStopAuto() {
  if (_sfAutoTimer) { clearInterval(_sfAutoTimer); _sfAutoTimer = null; }
  const btn = document.getElementById('sfBtnAuto');
  if (btn) { btn.textContent = '자동 강화 [A]'; btn.classList.remove('sbtn--danger'); btn.classList.add('sbtn--primary'); }
}

function initStarforce() {
  if (!document.getElementById('sfStageGrid')) return;

  // 시작부터 입력칸의 max가 레벨 상한을 따르도록 한 번 맞춰둔다
  _sfClampInputs();
  // 초기 별 위치를 sfFrom 값으로 세팅
  _sfState = { star: _sfGetFrom(), cost: 0, attempts: 0, destroys: 0, log: [] };
  sfBuildStageGrid();

  // 토글 그룹 처리. .sf-toggle-group도 추옵 시뮬레이터가 같이 쓰므로 섹션 안으로 한정한다
  // (안 그러면 추옵에서 장비 종류를 바꿀 때 스타포스 재계산이 딸려 돌아간다)
  document.querySelectorAll('#sec-starforce .sf-toggle-group').forEach(grp => {
    grp.querySelectorAll('.sf-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        grp.querySelectorAll('.sf-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sfBuildStageGrid(); // 샤이닝 상태 바뀌면 파괴율 다시 계산
        sfRenderResult();   // 별 판의 확률·비용 표시도 같이 갱신
        _sfRecalcExpected();
      });
    });
  });

  // sfFrom 바뀌면 현재 별 리셋
  document.getElementById('sfFrom')?.addEventListener('change', () => {
    _sfState.star = _sfGetFrom();
    sfRenderResult();
    _sfRecalcExpected();
  });
  // 레벨·목표 성 변경 시에도 기댓값 자동 재계산.
  // change만 걸면 입력을 확정할 때까지 화면이 안 바뀌어서, 한 자씩 고쳐도
  // 반응이 없다가 한 번에 튀는 것처럼 보인다. input도 같이 듣되 재계산이
  // 2만 회 몬테카를로라 매 타건마다 돌리면 멈추므로 디바운스를 건다.
  let _sfInputTimer = null;
  const _sfRecalcDebounced = () => {
    clearTimeout(_sfInputTimer);
    _sfInputTimer = setTimeout(_sfRecalcExpected, 300);
  };
  ['sfLevel', 'sfTo', 'sfFrom'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', _sfRecalcDebounced);
    // 값을 확정할 때 빈 칸·모순까지 포함해 전부 정리한다
    el.addEventListener('change', () => { _sfClampInputs(); sfRenderResult(); _sfRecalcExpected(); });
    // 타이핑 도중에도 상한은 즉시 걸고, 별칸 수가 달라지므로 판을 다시 그린다
    el.addEventListener('input', () => { _sfClampMaxWhileTyping(el); sfRenderResult(); });
  });

  // 강화 1회
  document.getElementById('sfBtn1')?.addEventListener('click', () => {
    sfStopAuto();
    sfEnhanceOnce();
  });

  /* S=강화, R=초기화, A=자동. 스타포스 탭의 직접 강화하기가 열려 있을 때만
     동작하고, 입력칸/셀렉트에 포커스가 있으면 가로채지 않는다. */
  document.addEventListener('keydown', e => {
    if (!['KeyS', 'KeyR', 'KeyA'].includes(e.code) || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const sec = document.getElementById('sec-starforce');
    if (!sec?.classList.contains('active')) return;
    if (document.getElementById('sfRightSimulate')?.style.display === 'none') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;
    e.preventDefault();
    if (e.code === 'KeyS') { sfStopAuto(); sfEnhanceOnce(); }
    else if (e.code === 'KeyR') { document.getElementById('sfBtnReset')?.click(); }
    else if (e.code === 'KeyA') { document.getElementById('sfBtnAuto')?.click(); }
  });

  // 자동 강화
  document.getElementById('sfBtnAuto')?.addEventListener('click', () => {
    if (_sfAutoTimer) { sfStopAuto(); return; }
    const btn = document.getElementById('sfBtnAuto');
    btn.textContent = '■ 중지 [A]';
    btn.classList.remove('sbtn--primary'); btn.classList.add('sbtn--danger');
    _sfAutoTimer = setInterval(() => {
      const cont = sfEnhanceOnce(true);   // 자동은 목표 성수에서 멈춘다
      if (!cont) sfStopAuto();
    }, 80);
  });

  // 초기화
  document.getElementById('sfBtnReset')?.addEventListener('click', () => {
    sfStopAuto();
    _sfState = { star: _sfGetFrom(), cost: 0, attempts: 0, destroys: 0, log: [] };
    document.getElementById('sfResult').innerHTML = '<p class="empty">강화 버튼을 눌러주세요.</p>';
    document.getElementById('sfSpentWrap').style.display = 'none';
  });

  // 기댓값 보기
  document.getElementById('sfBtnExpected')?.addEventListener('click', () => sfShowExpected(true));

  /* 양방향 메소 ↔ 상위% 이벤트 (한 번만 등록).
     ★ ensureFresh가 내부적으로 sfShowExpected를 다시 부르면 그 끝에서 이
     두 입력칸을 "평균"값으로 덮어쓴다. 그래서 사용자가 막 타이핑한 값을
     먼저 변수에 담아두고, ensureFresh 이후에 그 값 기준으로 다시 계산해
     최종적으로 필드에 써넣는다 — 안 그러면 "70"을 쳤는데 화면이 평균값으로
     바뀌어버린다. */
  document.getElementById('sfInputMeso').addEventListener('input', () => {
    const el = document.getElementById('sfInputMeso');
    const val = parseInt(el.value, 10);
    if (!val || val <= 0) return;
    if (!_sfEnsureFreshSamples()) return;
    const pct = _sfPctFromMeso(val);
    document.getElementById('sfInputPct').value = pct.toFixed(3);
    el.value = val;
    _sfShowResult(pct, val);
  });
  document.getElementById('sfInputPct').addEventListener('input', () => {
    const el = document.getElementById('sfInputPct');
    const pct = parseFloat(el.value);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    if (!_sfEnsureFreshSamples()) return;
    const meso = _sfMesoFromPct(pct);
    document.getElementById('sfInputMeso').value = meso;
    el.value = pct;
    _sfShowResult(pct, meso);
  });
  document.getElementById('sfInputDestroyCount').addEventListener('input', () => {
    const el = document.getElementById('sfInputDestroyCount');
    const val = parseInt(el.value, 10);
    if (isNaN(val) || val < 0) return;
    if (!_sfEnsureFreshSamples()) return;
    const pct = _sfDestroyPctFromCount(val);
    document.getElementById('sfInputDestroyPct').value = pct.toFixed(3);
    el.value = val;
    _sfShowDestroyResult(pct, val);
  });
  document.getElementById('sfInputDestroyPct').addEventListener('input', () => {
    const el = document.getElementById('sfInputDestroyPct');
    const pct = parseFloat(el.value);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    if (!_sfEnsureFreshSamples()) return;
    const count = _sfDestroyCountFromPct(pct);
    document.getElementById('sfInputDestroyCount').value = count;
    el.value = pct;
    _sfShowDestroyResult(pct, count);
  });

  /* 탭 스위칭.
     ★ .sf-tab 클래스는 추옵·큐브 시뮬레이터도 같이 쓴다. 예전엔 document 전체에서
       찾아서, 스타포스 탭을 누르면 다른 섹션 탭의 active까지 벗겨졌고
       _sfRecalcExpected는 엉뚱하게 추옵 탭을 보고 그냥 빠져나갔다(그래서 기댓값
       그래프가 안 그려졌다). 반드시 스타포스 섹션 안에서만 찾는다. */
  document.querySelectorAll('#sec-starforce .sf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#sec-starforce .sf-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.sftab;
      document.getElementById('sfRightExpected').style.display  = mode === 'expected'  ? '' : 'none';
      document.getElementById('sfRightSimulate').style.display  = mode === 'simulate'  ? '' : 'none';
      document.getElementById('sfBtnWrapExpected').style.display = mode === 'expected' ? '' : 'none';
      document.getElementById('sfBtnWrapSimulate').style.display = mode === 'simulate' ? 'grid' : 'none';
      if (mode === 'expected') _sfRecalcExpected();
    });
  });
  // 초기 상태
  document.getElementById('sfBtnWrapSimulate').style.display = 'none';
}

// 기댓값 탭이 활성일 때만, 유효한 범위면 조용히 재계산 (버튼 없이도 결과 표시)
function _sfRecalcExpected() {
  if (document.querySelector('#sec-starforce .sf-tab.active')?.dataset.sftab !== 'expected') return;
  if (_sfGetFrom() >= _sfGetTo()) return;
  sfShowExpected();
}

/* _sfLastCosts/_sfLastDestroys가 "지금 화면에 보이는 설정(레벨·현재·목표·이벤트 등)"의
   샘플이 맞는지 대조할 서명. 목표 성수를 26으로 바꿔도 상위%/메소 입력칸은 이전
   샘플을 그대로 조회했었다 — sfShowExpected가 다시 안 불리면 배열이 안 바뀌기
   때문이다(레벨 입력 디바운스 도중, 또는 성수 입력 후 그 즉시 상위% 칸을 만졌을 때
   등). 그래서 "26성으로 바꿔서 봤더니 예전 20성 근처 값이 나온다" 같은 제보가 있었다.
   조회 직전에 이 서명을 항상 대조해 다르면 먼저 새로 계산한다. */
function _sfCfgSignature() {
  return [_sfGetLevel(), _sfGetFrom(), _sfGetTo(), _sfGetMvp(), _sfGetEvent(), JSON.stringify(_sfStages)].join('|');
}
let _sfLastCostsSig = null;

/* 상위%/메소 조회 직전에 반드시 부른다. 서명이 지금 화면 설정과 다르면(또는
   아예 없으면) 조용히 새로 계산한다 — scrollToResult=false라 스크롤·5천 표본
   그대로라 빠르다. 이후로는 _sfLastCosts를 안심하고 조회해도 된다. */
function _sfEnsureFreshSamples() {
  if (_sfGetFrom() >= _sfGetTo()) return false;
  if (_sfLastCostsSig !== _sfCfgSignature()) sfShowExpected(false);
  return _sfLastCosts.length > 0;
}

let _sfChart        = null;
let _sfDestroyChart = null;
let _sfLastCosts    = [];
let _sfLastDestroys = [];

function _sfHighlightBar(val) {
  if (!_sfChart) return;
  const p99 = _sfLastCosts[Math.floor(_sfLastCosts.length * 0.99)] || 1;
  const BINS = 40;
  const colors = Array(BINS).fill('rgba(139,92,246,0.45)');
  const binIdx = Math.floor(val / (p99 / BINS));
  if (binIdx >= 0 && binIdx < BINS) colors[binIdx] = 'rgba(246,199,68,0.9)';
  _sfChart.data.datasets[0].backgroundColor = colors;
  _sfChart.update('none');
}

function _sfDestroyPctFromCount(count) {
  const N = _sfLastDestroys.length;
  let lo = 0, hi = N;
  while (lo < hi) { const m = (lo+hi)>>1; if (_sfLastDestroys[m] < count) lo=m+1; else hi=m; }
  return lo / N * 100;
}

function _sfDestroyCountFromPct(pct) {
  const N = _sfLastDestroys.length;
  const idx = Math.min(N - 1, Math.max(0, Math.round(pct / 100 * N)));
  return _sfLastDestroys[idx];
}

function _sfShowDestroyResult(luckPct, count) {
  const resEl = document.getElementById('sfDestroyResult');
  if (!resEl) return;
  const cls = luckPct <= 25 ? 'lucky' : luckPct >= 75 ? 'unlucky' : '';
  resEl.innerHTML = `<div class="sf-my-result">
    <span class="sf-my-result__tag ${cls}">상위 ${luckPct.toFixed(3)}%</span>
    <span class="sf-my-result__sep"> = </span>
    <span class="sf-my-result__meso">${count}개</span>
  </div>`;
}

function _sfPctFromMeso(val) {
  const N = _sfLastCosts.length;
  let lo = 0, hi = N;
  while (lo < hi) { const m = (lo+hi)>>1; if (_sfLastCosts[m] < val) lo=m+1; else hi=m; }
  return lo / N * 100;
}

function _sfMesoFromPct(pct) {
  const N = _sfLastCosts.length;
  const idx = Math.min(N - 1, Math.max(0, Math.round(pct / 100 * N)));
  return _sfLastCosts[idx];
}

function _sfShowResult(luckPct, mesoVal) {
  const resEl = document.getElementById('sfMyMesoResult');
  if (!resEl) return;
  const cls = luckPct <= 25 ? 'lucky' : luckPct >= 75 ? 'unlucky' : '';
  resEl.innerHTML = `<div class="sf-my-result">
    <span class="sf-my-result__tag ${cls}">상위 ${luckPct.toFixed(3)}%</span>
    <span class="sf-my-result__sep"> = </span>
    <span class="sf-my-result__meso">${fmtMeso(mesoVal)}</span>
  </div>`;
  _sfHighlightBar(mesoVal);
}

/* Chart.js는 스타포스 기댓값 탭의 그래프에서만 쓴다. 그런데 CDN에서 받는
   200KB짜리라, 그래프를 한 번도 안 보는 사람까지 접속할 때마다 받게 하면
   첫 로딩만 느려진다. 그래서 처음 그릴 때만 받아온다. */
let _sfChartLibLoading = null;
function _sfEnsureChartLib() {
  if (typeof Chart !== 'undefined') return Promise.resolve(true);
  if (!_sfChartLibLoading) {
    _sfChartLibLoading = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = () => resolve(true);
      // 못 받아도 계산 자체는 되니 그래프만 포기한다 — 숫자는 그대로 보여준다
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }
  return _sfChartLibLoading;
}

function sfShowExpected(scrollToResult) {
  const from = _sfGetFrom();
  const to   = _sfGetTo();
  if (from >= to) { alert('목표 성이 현재 성보다 높아야 합니다.'); return; }

  const cfg = {
    level: _sfGetLevel(), current: from, target: to,
    mvpDiscount: _sfGetMvp(), isShining: _sfGetEvent() === 'shining',
    stages: { ..._sfStages }
  };

  // 평균은 정확해로 따로 구하므로 시뮬레이션은 분포(히스토그램·상위%) 전용이다.
  // 2만 회는 한 번에 약 650ms를 동기로 잡아먹어서 타이핑 중에 그만큼 멈춘다.
  // 버튼을 직접 눌렀을 때만 2만 회, 입력 중 자동 재계산은 5천 회로 돌린다.
  // 40구간 히스토그램에는 5천 표본이면 충분하고, 평균값은 어느 쪽이든 동일하다.
  const N = scrollToResult ? 20_000 : 5_000;
  const costs = [], destroyArr = [];
  let totalDestroy = 0;
  for (let i = 0; i < N; i++) {
    const r = sfRunOnce(cfg);
    costs.push(r.cost);
    destroyArr.push(r.destroys);
    totalDestroy += r.destroys;
  }
  costs.sort((a, b) => a - b);
  destroyArr.sort((a, b) => a - b);
  _sfLastCosts    = costs;
  _sfLastDestroys = destroyArr;
  // 방금 이 샘플을 만든 그 cfg로 서명을 남긴다(호출부에 따라 그 사이 입력이
  // 또 바뀔 수 있으니 지금 다시 읽지 않고, 이 함수 시작에서 캡처한 값을 그대로 쓴다)
  _sfLastCostsSig = [cfg.level, cfg.current, cfg.target, cfg.mvpDiscount, cfg.isShining ? 'shining' : 'none', JSON.stringify(cfg.stages)].join('|');

  // 평균은 시뮬레이션 대신 마르코프 연쇄 정확해를 쓴다. 표본평균은 2만 회로도
  // 실행마다 2% 남짓 흔들려서 1레벨 차이(약 1%)보다 오차가 커, 값이 안정적으로
  // 보이지 않았다. 분포·상위%·히스토그램은 표본이 있어야 하므로 그대로 시뮬 사용.
  const exact = sfExpectedExact(cfg);
  const mean = exact.cost;
  const p99  = costs[Math.floor(N * 0.99)];
  const avgDestroy = exact.destroys;

  /* 히스토그램 버킷 40개, p99 범위 */
  const BINS = 40;
  const step = p99 / BINS;
  const buckets = Array(BINS).fill(0);
  costs.forEach(c => { const idx = Math.floor(c / step); if (idx < BINS) buckets[idx]++; });
  const labels = buckets.map((_, i) => fmtMeso(Math.round(step * (i + 0.5))));


  // 그래프는 Chart.js를 받아온 뒤에 그린다. 숫자(기댓값·상위%)는 라이브러리와
  // 무관하므로 아래에서 그대로 먼저 채워진다.
  const drawCharts = () => {
  const canvas = document.getElementById('sfChart');
  if (_sfChart) { _sfChart.destroy(); _sfChart = null; }
  _sfChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '빈도',
        data: buckets,
        backgroundColor: 'rgba(139,92,246,0.55)',
        borderColor: 'rgba(167,139,250,0.8)',
        borderWidth: 1,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `소모 메소 ≈ ${labels[items[0].dataIndex]}`,
            label: item  => `${item.raw.toLocaleString()}회 · ${(item.raw/N*100).toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          /* labels[]는 fmtMeso로 "32억 2,009만 1,896 메소"처럼 길게 적혀 있다(툴팁용).
             그걸 축에 그대로 찍으면 회전시켜도 옆 라벨과 겹쳐 글자가 뭉개진다
             (실제로 그렇게 보인다는 제보 있었음). 축에는 억/조 단위로 짧게 줄인
             문자열을 따로 그린다 — 데이터·툴팁은 그대로 두고 표시만 바꾼다. */
          ticks: {
            color: 'rgba(200,190,240,.6)', maxRotation: 45, font: { size: 9 }, maxTicksLimit: 8,
            callback: (_, idx) => fmtMesoCompact(step * (idx + 0.5)),
          },
          grid: { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: { color: 'rgba(200,190,240,.6)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,.08)' }
        }
      }
    }
  });

  /* 파괴 횟수 분포 차트 */
  const maxDest = Math.max(...destroyArr);
  const destBuckets = Array(maxDest + 1).fill(0);
  destroyArr.forEach(d => destBuckets[d]++);
  const destLabels = destBuckets.map((_, i) => `${i}개`);
  const destCanvas = document.getElementById('sfDestroyChart');
  if (_sfDestroyChart) { _sfDestroyChart.destroy(); _sfDestroyChart = null; }
  _sfDestroyChart = new Chart(destCanvas, {
    type: 'bar',
    data: {
      labels: destLabels,
      datasets: [{
        label: '빈도',
        data: destBuckets,
        backgroundColor: 'rgba(246,99,99,0.55)',
        borderColor: 'rgba(246,139,139,0.8)',
        borderWidth: 1,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `파괴 ${items[0].label}`,
            label: item  => `${item.raw.toLocaleString()}회 · ${(item.raw/N*100).toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgba(200,190,240,.6)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: { color: 'rgba(200,190,240,.6)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,.08)' }
        }
      }
    }
  });

  };
  _sfEnsureChartLib().then(ok => { if (ok) drawCharts(); });

  /* 메소 bidir 평균 세팅 */
  const avgCost = Math.round(mean);
  const avgPct  = _sfPctFromMeso(avgCost);
  document.getElementById('sfInputMeso').value = avgCost;
  document.getElementById('sfInputPct').value  = avgPct.toFixed(3);
  _sfShowResult(avgPct, avgCost);

  /* 파괴 bidir 평균 세팅 */
  const avgDest    = Math.round(avgDestroy);
  const avgDestPct = _sfDestroyPctFromCount(avgDest);
  document.getElementById('sfInputDestroyCount').value = avgDest;
  document.getElementById('sfInputDestroyPct').value   = avgDestPct.toFixed(3);
  _sfShowDestroyResult(avgDestPct, avgDest);

  // 버튼을 직접 눌렀을 때만 결과로 스크롤한다. 레벨을 한 자씩 고칠 때마다
  // 화면이 끌려가면 입력을 못 하므로 자동 재계산에서는 스크롤하지 않는다.
  if (scrollToResult) {
    document.getElementById('sfRightExpected')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

