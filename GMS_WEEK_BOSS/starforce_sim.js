/* ═══════════════════════════════════════════════
   스타포스 시뮬레이터 (직접 강화 모드)
═══════════════════════════════════════════════ */

/* 단계 드롭다운 그리드 빌드 */
function sfBuildStageGrid() {
  const grid = document.getElementById('sfStageGrid');
  if (!grid) return;
  const cfg = _sfReadCfg();

  const rows = [];
  for (let s = 15; s <= 21; s++) {
    const curStage = _sfStages[s] || 1;

    const opts = [];
    for (let st = 1; st <= 4; st++) {
      const isProt = s <= 17 && st === 4;
      const label  = isProt ? '파괴방지' : `${st}단계`;
      opts.push(`<option value="${st}" ${curStage===st?'selected':''}>${label}</option>`);
    }

    const { p } = sfStepInfo(cfg, s);

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
      sel.blur();
      _sfStages[+sel.dataset.star] = +sel.value;
      sfBuildStageGrid();
      sfRenderResult();     // 별 판의 파괴 확률도 바뀐 단계로
      _sfRecalcExpected();  // 기댓값·분포도 바뀐 단계로
    });
  });
}

/* 상태 */
let _sfState = { star: 0, cost: 0, attempts: 0, destroys: 0, log: [] };
let _sfStages = { 15:1, 16:1, 17:1, 18:1, 19:1, 20:1, 21:1 };

function _sfGetEvent()    { return document.querySelector('#sfEventGroup .sf-toggle.active')?.dataset.val || 'none'; }
function _sfGetMvp()      { return parseFloat(document.querySelector('#sfMvpGroup .sf-toggle.active')?.dataset.val || '0'); }
function _sfGetLevel()    { return Math.max(1, parseInt(document.getElementById('sfLevel').value) || 200); }
/* 목표·현재 성수는 장비 레벨의 상한을 넘을 수 없다. 확률표는 성수 0~29를
   통짜로 갖고 있어서, 막지 않으면 120제에 22성 같은 게임에 없는 조합도
   숫자만 그럴듯하게 계산돼 버린다. */
/* 성수 상한은 장비 레벨로 정해지고, 고른 장비에 따로 정한 상한이 있으면 그보다 낮출 수 있다.
   시작 성수 하한은 장비를 받을 때의 성수다. 데스티니 무기는 22~25성. starforce_items.js */
function _sfCap()         { const cap = sfMaxStar(_sfGetLevel()); return _sfItem?.maxStar ? Math.min(cap, _sfItem.maxStar) : cap; }
function _sfMinFrom()     { return _sfItem?.minStar || 0; }
function _sfGetFrom()     { return Math.max(_sfMinFrom(), Math.min(_sfCap(), parseInt(document.getElementById('sfFrom').value) || 0)); }
function _sfGetTo()       {
  const cap = _sfCap();
  return Math.min(cap, parseInt(document.getElementById('sfTo').value) || Math.min(22, cap));
}

/* 타이핑 중에 쓰는 가벼운 보정 — 상한만 즉시 걸고 그 외엔 건드리지 않는다.
   숫자를 이어 치면 값은 커지기만 하므로, 중간값이 상한을 넘었다면 최종값도
   넘는다. 즉 위쪽만 자르는 건 입력을 방해하지 않는다. 반대로 빈 칸을 기본값으로
   되돌리거나 현재>=목표를 손보는 건 다 친 뒤(change)에 해야 한다. */
function _sfClampMaxWhileTyping(el) {
  if (el.value === '') return;                 // 지우고 다시 치는 중이면 그대로 둔다
  const cap = _sfCap();
  const max = el.id === 'sfFrom' ? Math.max(0, cap - 1) : cap;
  const v   = parseInt(el.value);
  if (!isNaN(v) && v > max) el.value = max;
}

/* 레벨이 바뀌면 상한도 바뀌므로 입력칸의 max와 값 자체를 상한에 맞춰 잘라준다.
   max 속성만으로는 직접 타이핑을 막지 못해 값도 같이 손봐야 한다. */
function _sfClampInputs() {
  const cap  = _sfCap();
  const toEl = document.getElementById('sfTo');
  const frEl = document.getElementById('sfFrom');
  if (!toEl || !frEl) return;

  const lo = _sfMinFrom();
  toEl.max = cap;
  toEl.min = lo + 1;
  frEl.max = Math.max(0, cap - 1);
  frEl.min = lo;

  let to = Math.min(cap, Math.max(lo + 1, parseInt(toEl.value) || Math.min(22, cap)));
  let fr = Math.min(cap - 1, Math.max(lo, parseInt(frEl.value) || 0));
  if (fr >= to) fr = to - 1;          // 현재가 목표 이상이면 굴릴 게 없다

  toEl.value = to;
  frEl.value = fr;
  if (_sfState.star > cap) _sfState.star = cap;
}

/* 지금 화면 설정. stages는 복사본이라 그 뒤에 단계를 바꿔도 이 cfg는 그대로다 */
function _sfReadCfg() {
  return {
    level: _sfGetLevel(), current: _sfGetFrom(), target: _sfGetTo(),
    mvpDiscount: _sfGetMvp(), isShining: _sfGetEvent() === 'shining',
    destStar: _sfItem?.destStar ?? null, spare: _sfItem?.spare || 0,
    stages: { ..._sfStages }
  };
}

/* forAuto=true 면 목표 성수에서 멈춘다(자동 강화용). 직접 누를 때는 목표를 보지 않고
   장비 레벨 상한까지 계속 올릴 수 있다 — 목표는 자동 강화를 어디서 끊을지 정하는
   값이지, 손으로 더 못 올리게 막는 값이 아니다. */
function sfEnhanceOnce(forAuto) {
  const limit = forAuto ? _sfGetTo() : _sfCap();
  if (_sfState.star >= limit) return false;

  const star = _sfState.star;
  const cfg = _sfReadCfg();
  const { cost, p } = sfStepInfo(cfg, star);
  _sfState.cost += cost;
  _sfState.attempts++;

  const r = Math.random();

  let result, nextStar;
  if (r < p.succ) {
    nextStar = star + 1;
    // 23성 이상을 얻었을 때만 그 별을 반짝이게 한다(칸 번호는 0부터라 -1)
    if (nextStar >= 23) _sfState.pop = nextStar - 1;
    result = { type: 'success', from: star, to: nextStar, cost };
  } else if (r < p.succ + p.fail) {
    // 실제론 연속실패 시 강제하락 있지만 jaehoom 로직은 단순 유지
    nextStar = star; // 실패 = 유지
    result = { type: 'fail', from: star, to: star, cost };
  } else {
    _sfState.destroys++;
    nextStar = getDestStar(star, cfg);
    _sfState.cost += cfg.spare;   // 스페어를 사서 복구하는 장비는 파괴마다 그 값을 더 낸다
    result = { type: 'destroy', from: star, to: nextStar, cost: cost + cfg.spare };
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

  sfRenderStarPanel(to, done);
  _sfRenderMode();

  /* 창 안 "강화 정보" 칸 — 누적 메소·횟수·파괴. 게임 창에서 장비 능력치가 나오는 자리다 */
  const stat = document.getElementById('sfStats');
  if (stat) stat.innerHTML = `
    <div class="sfw__row sfw__row--big"><span>누적 소모 메소</span><b>${fmtMeso(_sfState.cost)}</b></div>
    <div class="sfw__row"><span>강화 횟수</span><b>${_sfState.attempts.toLocaleString()} 회</b></div>
    <div class="sfw__row"><span>파괴 횟수</span><b class="${_sfState.destroys > 0 ? 'is-bad' : ''}">${_sfState.destroys} 회</b></div>
    ${done ? '<div class="sfw__done">목표 달성!</div>' : ''}`;

  const logHtml = _sfState.log.map(l => {
    const cls  = l.type === 'success' ? 'log-success' : l.type === 'destroy' ? 'log-destroy' : 'log-fail';
    const icon = l.type === 'success' ? '✦' : l.type === 'destroy' ? '💥' : '✕';
    const desc = l.type === 'success' ? `${l.from}★ → ${l.to}★ 성공` : l.type === 'destroy' ? `${l.from}★ 파괴 → ${l.to}★` : `${l.from}★ 실패`;
    return `<div class="sf-log-row ${cls}"><span class="sf-log-icon">${icon}</span><span class="sf-log-desc">${desc}</span><span class="sf-log-cost">${fmtMeso(l.cost)}</span></div>`;
  }).join('');

  el.hidden = !logHtml;
  el.innerHTML = logHtml ? `<div class="card__title">강화 기록</div><div class="sf-log">${logHtml}</div>` : '';
}

/* 별 판 — 장비 레벨의 상한만큼 별칸을 만들고 현재 성수까지 채운다.
   그 아래에 "현재 ▶▶▶ 다음"과 이번 시도의 성공·실패·파괴 확률을 보여준다.
   파괴 단계는 좌측 설정에서 이미 고르므로 여기선 결과만 반영한다. */
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
  const slots = Math.max(_sfCap(), to);
  /* 바로 다음에 얻을 별 한 칸을 점멸시킨다. 목표 성수와는 무관하게 "지금 도전 중인
     칸"을 가리키므로, 별이 1개면 2번째 칸이 깜빡인다. 칸을 다 채웠으면 없다. */
  const goalIdx = (star < slots) ? star : -1;
  grid.innerHTML = Array.from({ length: slots }, (_, i) => {
    const cls = (i < star ? ' on' : '') + (i === pop ? ' pop' : '') + (i === goalIdx ? ' goal' : '');
    return `<span class="sfstar-grid__s${cls}">★</span>`;
  }).join('');

  // 23성부터는 게임처럼 창 테두리를 금색으로 바꿔 한눈에 구분되게 한다
  document.getElementById('sfw')?.classList.toggle('sfw--hi', star >= 23);

  /* "★현재 >>> ★다음" 숫자는 게임이 쓰는 그림(images/starforce/nums.png)에서 오려 쓴다.
     윗줄이 현재(노란색 0~29), 아랫줄이 다음(흰색 1~30). 30성은 노란 그림이 없어 흰 그림으로 대신한다 */
  const next = done ? star : star + 1;
  const setNum = (id, n, white) => {
    const e = document.getElementById(id);
    e.style.setProperty('--n', Math.min(n, 30));
    e.dataset.white = white || n >= 30 ? '1' : '';
    e.setAttribute('aria-label', n + '성');
  };
  setNum('sfStarCur', star, false);
  setNum('sfStarNext', Math.max(next, 1), true);

  const name = document.getElementById('sfwName');
  if (name) name.textContent = _sfItem ? gameName(_sfItem.name, _sfItem.en) : `${_sfGetLevel()}제 장비`;
  const ico = document.querySelector('.sfw__item img');
  if (ico) {
    ico.src = _sfItem ? (_sfItem.icon || `images/items/${_sfItem.id}.png`) : 'images/icons/fav_star.png';
    ico.classList.toggle('is-item', !!_sfItem);
  }

  /* 목표에 닿아도 손으로는 계속 올릴 수 있으므로 확률표는 그대로 둔다(목표 달성 문구는
     왼쪽 정보 칸에 따로 뜬다). 레벨 상한까지 다 채웠을 때만 더 올릴 수 없으니 확률표를 접는다. */
  const rates = document.getElementById('sfStarRates');
  const maxed = star >= _sfCap();
  const costEl = document.getElementById('sfSpentVal');
  if (maxed) {
    rates.innerHTML = '<div class="sfw__max">최대 성수 도달</div>';
    if (costEl) costEl.textContent = '–';
    return;
  }
  const { cost, p } = sfStepInfo(_sfReadCfg(), star);
  const pct = v => (v * 100).toFixed(2) + '%';
  rates.innerHTML = `
    <div class="sfw__rate sfw__rate--succ"><span>성공</span><b>${pct(p.succ)}</b></div>
    <div class="sfw__rate"><span>실패</span><b>${pct(p.fail)}</b></div>
    <div class="sfw__rate sfw__rate--dest"><span>파괴</span><b>${pct(p.dest)}</b></div>`;
  // 게임의 "Material Cost" 칸 — 지금 한 번 강화하는 데 드는 메소(누적 소모는 정보 칸에 따로)
  if (costEl) costEl.textContent = fmtMeso(cost);
}

/* 세트·부위 선택 — 고르면 그 장비의 제한 레벨이 장비 레벨 칸에 들어가고 창에 아이콘·이름이 나온다.
   레벨 칸을 직접 고치면 장비 선택은 풀린다(레벨은 사용자가 정한 값이 우선) */
let _sfItem = null;
function _sfApplyItem(item) {
  _sfItem = item;
  if (item) document.getElementById('sfLevel').value = item.lv;
  _sfClampInputs();
  // 데스티니 무기처럼 받을 때부터 별이 있는 장비는 그 성수부터 강화한다
  _sfState.star = Math.max(_sfMinFrom(), Math.min(_sfState.star, _sfCap()));
  sfRenderResult();
  _sfRecalcExpected();
}
function _sfBindItems() {
  const setSel = document.getElementById('sfItemSet'), slotSel = document.getElementById('sfItemSlot');
  if (!setSel || !slotSel || typeof SF_ITEMS === 'undefined') return;
  [...new Set(SF_ITEMS.map(i => i.set))].forEach(s => setSel.add(new Option(s, s)));
  const fillSlots = () => {
    const list = SF_ITEMS.filter(i => i.set === setSel.value);
    slotSel.innerHTML = list.length ? '' : '<option value=""></option>';
    list.forEach(i => slotSel.add(new Option(gameName(i.name, i.en), SF_ITEMS.indexOf(i))));
    slotSel.disabled = !list.length;
  };
  /* 목록을 고른 뒤에도 포커스가 select에 남아 있으면 S 단축키가 먹지 않으므로 바로 놓아준다 */
  setSel.addEventListener('change', () => {
    setSel.blur();
    fillSlots();
    _sfApplyItem(slotSel.value === '' ? null : SF_ITEMS[+slotSel.value]);
  });
  slotSel.addEventListener('change', () => { slotSel.blur(); _sfApplyItem(SF_ITEMS[+slotSel.value]); });
  // 게임 이름 표기를 바꾸면 부위 목록 글자와 창의 장비 이름만 다시 쓴다. 고른 부위는 그대로 둔다
  document.addEventListener('namelang', () => {
    [...slotSel.options].forEach(o => { const i = SF_ITEMS[+o.value]; if (o.value !== '' && i) o.text = gameName(i.name, i.en); });
    sfRenderResult();
  });
  document.getElementById('sfLevel').addEventListener('input', () => {
    if (!_sfItem) return;
    _sfItem = null;
    setSel.value = '';
    fillSlots();
  });
}

/* 창 아래쪽 "Safeguard" 버튼과 "Enhancement Mode" 슬라이더 — 지금 도전하는 성수의 단계를 바꾼다.
   왼쪽 '파괴 단계 설정'과 같은 _sfStages를 쓰므로 어느 쪽을 바꿔도 서로 맞는다.
   단계 4는 15~17성에서는 파괴방지, 18성부터는 가장 비싼 4번째 모드다. 모델상 파괴방지는
   1단계 확률 위에서만 적용되므로, 켜면 슬라이더는 1에 잠기고 15~17성 슬라이더는 3까지만 간다. */
function _sfStageRange() {
  const star = _sfState.star;
  return star >= 15 && star <= 21 && star < _sfCap() ? (star <= 17 ? 3 : 4) : 0;
}
function _sfSetStage(star, v) {
  if ((_sfStages[star] || 1) === v) return;
  _sfStages[star] = v;
  sfBuildStageGrid();
  sfRenderResult();
  _sfRecalcExpected();
}
function _sfRenderMode() {
  const sg = document.getElementById('sfSafe'), mode = document.getElementById('sfMode');
  if (!sg || !mode) return;
  const star = _sfState.star, max = _sfStageRange();
  const stage = max ? (_sfStages[star] || 1) : 1;
  const safe = max === 3 && stage === 4;
  sg.disabled = max !== 3;
  sg.classList.toggle('is-on', safe);
  sg.setAttribute('aria-pressed', safe);
  const on = max > 0 && !safe;
  mode.classList.toggle('is-off', !on);
  mode.setAttribute('aria-disabled', !on);
  mode.setAttribute('aria-valuemax', max || 4);
  mode.setAttribute('aria-valuenow', safe ? 1 : stage);
  mode.style.setProperty('--m', safe ? 1 : stage);
}
function _sfBindMode() {
  const sg = document.getElementById('sfSafe'), mode = document.getElementById('sfMode');
  if (!sg || !mode) return;
  const cur = () => _sfStages[_sfState.star] || 1;
  sg.addEventListener('click', () => {
    if (_sfStageRange() === 3) _sfSetStage(_sfState.star, cur() === 4 ? 1 : 4);
  });
  // 슬라이더 선은 그림 안에서 188~374px, 눈금은 62px 간격이다
  const pick = ev => {
    const max = _sfStageRange();
    if (!max || cur() === 4 && max === 3) return;
    const x = (ev.clientX - mode.getBoundingClientRect().left) / mode.getBoundingClientRect().width * 402;
    _sfSetStage(_sfState.star, Math.max(1, Math.min(max, Math.round((x - 188) / 62) + 1)));
  };
  mode.addEventListener('pointerdown', ev => { mode.setPointerCapture(ev.pointerId); pick(ev); });
  mode.addEventListener('pointermove', ev => { if (mode.hasPointerCapture(ev.pointerId)) pick(ev); });
  mode.addEventListener('keydown', ev => {
    const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[ev.key];
    const max = _sfStageRange();
    if (!d || !max || cur() === 4 && max === 3) return;
    ev.preventDefault();
    _sfSetStage(_sfState.star, Math.max(1, Math.min(max, cur() + d)));
  });
}

/* 자동 강화 — 80ms마다 한 번씩 누른다. 화면은 sfEnhanceOnce가 매번 그린다 */
const _sfAuto = createAutoRunner({
  btnId: 'sfBtnAuto', idleLabel: '자동 강화 [A]', runLabel: '■ 중지 [A]',
  runClass: 'sbtn--danger', idleClass: 'sbtn--primary', batch: 1, delay: 80,
  tick: () => { if (!sfEnhanceOnce(true)) return 'done'; },   // 자동은 목표 성수에서 멈춘다
});
function sfStopAuto() { _sfAuto.stop(); }

/* 별 위치를 sfFrom 값으로 되돌리고 별 판을 다시 그린다 */
function _sfResetState() {
  _sfState = { star: _sfGetFrom(), cost: 0, attempts: 0, destroys: 0, log: [] };
  sfRenderResult();
}

/* 강화창은 418×720 고정 배치라 좁은 화면에서는 통째로 줄여 맞춘다(넓으면 원본 크기).
   보이지 않을 때(탭이 숨겨져 폭이 0)는 건드리지 않고, 다시 보이면 ResizeObserver가 부른다 */
function _sfwFit() {
  const fit = document.getElementById('sfwFit'), win = document.getElementById('sfw');
  if (!fit || !win || !fit.clientWidth) return;
  const s = Math.min(1, fit.clientWidth / 418);
  win.style.transform = `scale(${s})`;
  win.style.marginLeft = (fit.clientWidth - 418 * s) / 2 + 'px';
  fit.style.height = 720 * s + 'px';
}

function initStarforce() {
  if (!document.getElementById('sfStageGrid')) return;
  if (window.ResizeObserver) new ResizeObserver(_sfwFit).observe(document.getElementById('sfwFit'));
  window.addEventListener('resize', _sfwFit);

  // 시작부터 입력칸의 max가 레벨 상한을 따르도록 한 번 맞춰둔다
  _sfClampInputs();
  sfBuildStageGrid();
  _sfBindMode();
  _sfBindItems();
  _sfResetState();   // 처음 열었을 때도 별 판을 그려둔다

  // 토글 그룹 처리. .sf-toggle-group도 추옵 시뮬레이터가 같이 쓰므로 섹션 안으로 한정한다
  // (안 그러면 추옵에서 장비 종류를 바꿀 때 스타포스 재계산이 딸려 돌아간다)
  document.querySelectorAll('#sec-starforce .sf-toggle-group').forEach(grp => {
    const btns = grp.querySelectorAll('.sf-toggle');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        setActive(btns, btn);
        sfBuildStageGrid(); // 샤이닝 상태 바뀌면 파괴율 다시 계산
        sfRenderResult();   // 별 판의 확률·비용 표시도 같이 갱신
        _sfRecalcExpected();
      });
    });
  });

  // 레벨·목표 성 변경 시에도 기댓값 자동 재계산.
  // change만 걸면 입력을 확정할 때까지 화면이 안 바뀌어서, 한 자씩 고쳐도
  // 반응이 없다가 한 번에 튀는 것처럼 보인다. input도 같이 듣되 재계산이
  // 5천 회 몬테카를로라 매 타건마다 돌리면 멈추므로 디바운스를 건다.
  let _sfInputTimer = null;
  const _sfRecalcDebounced = () => {
    clearTimeout(_sfInputTimer);
    _sfInputTimer = setTimeout(_sfRecalcExpected, 300);
  };
  ['sfLevel', 'sfTo', 'sfFrom'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    // 타이핑 도중 상한 클램프는 sfTo·sfFrom(별 개수)에만 건다 — sfLevel(장비
    // 레벨)까지 걸려 있으면 레벨 값 자체가 별 상한(20대)으로 잘려버린다.
    el.addEventListener('input', () => {
      _sfRecalcDebounced();
      if (id !== 'sfLevel') _sfClampMaxWhileTyping(el);
      sfRenderResult();
    });
    // 값을 확정할 때 빈 칸·모순까지 포함해 전부 정리한다.
    // sfFrom은 정리한 값으로 현재 별을 다시 맞춘다(정리 전에 읽으면 잘리기 전 값이 남는다)
    el.addEventListener('change', () => {
      _sfClampInputs();
      if (id === 'sfFrom') _sfState.star = _sfGetFrom();
      sfRenderResult();
      _sfRecalcExpected();
    });
  });

  // 강화 1회
  document.getElementById('sfBtn1')?.addEventListener('click', () => {
    sfStopAuto();
    sfEnhanceOnce();
  });

  /* S=강화, R=초기화, A=자동. 스타포스 탭의 직접 강화하기가 열려 있을 때만 */
  bindSimKeys('sec-starforce', key => {
    if (document.getElementById('sfRightSimulate')?.style.display === 'none') return false;
    if (key === 's') { sfStopAuto(); sfEnhanceOnce(); }
    else if (key === 'r') document.getElementById('sfBtnReset')?.click();
    else document.getElementById('sfBtnAuto')?.click();
  });

  document.getElementById('sfBtnAuto')?.addEventListener('click', _sfAuto.start);

  // 초기화
  document.getElementById('sfBtnReset')?.addEventListener('click', () => {
    sfStopAuto();
    _sfResetState();
  });

  // 기댓값 보기
  document.getElementById('sfBtnExpected')?.addEventListener('click', () => sfShowExpected(true));

  /* 값 ↔ 상위% 양방향 입력. 메소·파괴 횟수 두 쌍에 한 번씩만 등록한다.
     ★ ensureFresh가 내부적으로 sfShowExpected를 다시 부르면 그 끝에서 이
     두 입력칸을 "평균"값으로 덮어쓴다. 그래서 사용자가 막 타이핑한 값을
     먼저 변수에 담아두고, ensureFresh 이후에 그 값 기준으로 다시 계산해
     최종적으로 필드에 써넣는다 — 안 그러면 "70"을 쳤는데 화면이 평균값으로
     바뀌어버린다. samples는 ensureFresh 뒤에 읽어야 새 배열을 본다. */
  const bindLuckPair = (valId, pctId, samples, valOk, show) => {
    const valEl = document.getElementById(valId);
    const pctEl = document.getElementById(pctId);
    valEl.addEventListener('input', () => {
      const val = parseInt(valEl.value, 10);
      if (!valOk(val)) return;
      if (!_sfEnsureFreshSamples()) return;
      const pct = _sfPctOf(samples(), val);
      pctEl.value = pct.toFixed(3);
      valEl.value = val;
      show(pct, val);
    });
    pctEl.addEventListener('input', () => {
      const pct = parseFloat(pctEl.value);
      if (isNaN(pct) || pct < 0 || pct > 100) return;
      if (!_sfEnsureFreshSamples()) return;
      const val = _sfValAtPct(samples(), pct);
      valEl.value = val;
      pctEl.value = pct;
      show(pct, val);
    });
  };
  bindLuckPair('sfInputMeso', 'sfInputPct', () => _sfLastCosts, v => v > 0, _sfShowResult);
  bindLuckPair('sfInputDestroyCount', 'sfInputDestroyPct', () => _sfLastDestroys, v => v >= 0, _sfShowDestroyResult);

  /* 탭 스위칭.
     ★ .sf-tab 클래스는 추옵·큐브 시뮬레이터도 같이 쓴다. 예전엔 document 전체에서
       찾아서, 스타포스 탭을 누르면 다른 섹션 탭의 active까지 벗겨졌고
       _sfRecalcExpected는 엉뚱하게 추옵 탭을 보고 그냥 빠져나갔다(그래서 기댓값
       그래프가 안 그려졌다). 반드시 스타포스 섹션 안에서만 찾는다. */
  const tabs = document.querySelectorAll('#sec-starforce .sf-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setActive(tabs, tab);
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
   조회 직전에 이 서명을 항상 대조해 다르면 먼저 새로 계산한다. 서명은 _sfReadCfg를 그대로 문자열로 만든 것. */
let _sfLastCostsSig = null;

/* 상위%/메소 조회 직전에 반드시 부른다. 서명이 지금 화면 설정과 다르면(또는
   아예 없으면) 조용히 새로 계산한다 — scrollToResult=false라 스크롤·5천 표본
   그대로라 빠르다. 이후로는 _sfLastCosts를 안심하고 조회해도 된다. */
function _sfEnsureFreshSamples() {
  if (_sfGetFrom() >= _sfGetTo()) return false;
  if (_sfLastCostsSig !== JSON.stringify(_sfReadCfg())) sfShowExpected(false);
  return _sfLastCosts.length > 0;
}

let _sfChart        = null;
let _sfDestroyChart = null;
let _sfLastCosts    = [];
let _sfLastDestroys = [];
const _SF_BINS = 40;   // 메소 히스토그램 구간 수, p99까지

function _sfHighlightBar(val) {
  if (!_sfChart) return;
  const p99 = _sfLastCosts[Math.floor(_sfLastCosts.length * 0.99)] || 1;
  const colors = Array(_SF_BINS).fill('rgba(139,92,246,0.45)');
  const binIdx = Math.floor(val / (p99 / _SF_BINS));
  if (binIdx >= 0 && binIdx < _SF_BINS) colors[binIdx] = 'rgba(246,199,68,0.9)';
  _sfChart.data.datasets[0].backgroundColor = colors;
  _sfChart.update('none');
}

/* 정렬된 표본 arr에서 v 미만인 비율(%) */
function _sfPctOf(arr, v) {
  const N = arr.length;
  let lo = 0, hi = N;
  while (lo < hi) { const m = (lo+hi)>>1; if (arr[m] < v) lo=m+1; else hi=m; }
  return lo / N * 100;
}

/* 정렬된 표본 arr에서 상위 pct% 자리의 값 */
function _sfValAtPct(arr, pct) {
  const N = arr.length;
  const idx = Math.min(N - 1, Math.max(0, Math.round(pct / 100 * N)));
  return arr[idx];
}

function _sfShowLuck(resId, luckPct, valText) {
  const resEl = document.getElementById(resId);
  if (!resEl) return;
  const cls = luckPct <= 25 ? 'lucky' : luckPct >= 75 ? 'unlucky' : '';
  resEl.innerHTML = `<div class="sf-my-result">
    <span class="sf-my-result__tag ${cls}">상위 ${luckPct.toFixed(3)}%</span>
    <span class="sf-my-result__sep"> = </span>
    <span class="sf-my-result__meso">${valText}</span>
  </div>`;
}

function _sfShowDestroyResult(luckPct, count) {
  _sfShowLuck('sfDestroyResult', luckPct, `${count}개`);
}

function _sfShowResult(luckPct, mesoVal) {
  _sfShowLuck('sfMyMesoResult', luckPct, fmtMeso(mesoVal));
  _sfHighlightBar(mesoVal);
}

/* Chart.js는 스타포스 기댓값 탭의 그래프에서만 쓴다. 그런데 CDN에서 받는
   200KB짜리라, 그래프를 한 번도 안 보는 사람까지 접속할 때마다 받게 하면
   첫 로딩만 느려진다. 그래서 처음 그릴 때만 받아온다.
   못 받아도 계산 자체는 되니 그래프만 포기한다(false) — 숫자는 그대로 보여준다. */
function _sfEnsureChartLib() {
  if (typeof Chart !== 'undefined') return Promise.resolve(true);
  // 버전을 고정한다 — 주소에 버전이 없으면 새 메이저가 나올 때 그래프가 말없이 깨질 수 있다
  return loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js').then(() => true, () => false);
}

/* 히스토그램 막대 그래프. 메소·파괴 두 그래프는 색·툴팁 제목·x축 눈금만 다르다 */
function _sfBarChart(canvasId, { labels, data, bg, border, title, N, xTicks }) {
  return new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '빈도',
        data,
        backgroundColor: bg,
        borderColor: border,
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
            title,
            label: item  => `${item.raw.toLocaleString()}회 · ${(item.raw/N*100).toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgba(200,190,240,.6)', ...xTicks },
          grid: { color: 'rgba(255,255,255,.05)' }
        },
        y: {
          ticks: { color: 'rgba(200,190,240,.6)', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,.08)' }
        }
      }
    }
  });
}

function sfShowExpected(scrollToResult) {
  const cfg = _sfReadCfg();
  if (cfg.current >= cfg.target) { alert('목표 성이 현재 성보다 높아야 합니다.'); return; }

  // 평균은 정확해로 따로 구하므로 시뮬레이션은 분포(히스토그램·상위%) 전용이다.
  // 2만 회는 동기로 돌아서(성수별 비용·확률을 미리 구하기 전 실측 약 650ms) 타이핑 중에 그만큼 멈춘다.
  // 버튼을 직접 눌렀을 때만 2만 회, 입력 중 자동 재계산은 5천 회로 돌린다.
  // 40구간 히스토그램에는 5천 표본이면 충분하고, 평균값은 어느 쪽이든 동일하다.
  const N = scrollToResult ? 20_000 : 5_000;
  const costs = [], destroyArr = [];
  for (let i = 0; i < N; i++) {
    const r = sfRunOnce(cfg);
    costs.push(r.cost);
    destroyArr.push(r.destroys);
  }
  costs.sort((a, b) => a - b);
  destroyArr.sort((a, b) => a - b);
  _sfLastCosts    = costs;
  _sfLastDestroys = destroyArr;
  // 방금 이 샘플을 만든 그 cfg로 서명을 남긴다(호출부에 따라 그 사이 입력이
  // 또 바뀔 수 있으니 지금 다시 읽지 않고, 이 함수 시작에서 캡처한 값을 그대로 쓴다)
  _sfLastCostsSig = JSON.stringify(cfg);

  // 평균은 시뮬레이션 대신 마르코프 연쇄 정확해를 쓴다. 표본평균은 2만 회로도
  // 실행마다 2% 남짓 흔들려서 1레벨 차이(약 1%)보다 오차가 커, 값이 안정적으로
  // 보이지 않았다. 분포·상위%·히스토그램은 표본이 있어야 하므로 그대로 시뮬 사용.
  const exact = sfExpectedExact(cfg);
  const p99  = costs[Math.floor(N * 0.99)];

  /* 히스토그램 버킷 40개, p99 범위 */
  const step = p99 / _SF_BINS;
  const buckets = Array(_SF_BINS).fill(0);
  costs.forEach(c => { const idx = Math.floor(c / step); if (idx < _SF_BINS) buckets[idx]++; });
  const labels = buckets.map((_, i) => fmtMeso(Math.round(step * (i + 0.5))));

  // 그래프는 Chart.js를 받아온 뒤에 그린다. 숫자(기댓값·상위%)는 라이브러리와
  // 무관하므로 아래에서 그대로 먼저 채워진다.
  const drawCharts = () => {
    if (_sfChart) _sfChart.destroy();
    _sfChart = _sfBarChart('sfChart', {
      labels, data: buckets, N,
      bg: 'rgba(139,92,246,0.55)', border: 'rgba(167,139,250,0.8)',
      title: items => `소모 메소 ≈ ${labels[items[0].dataIndex]}`,
      /* labels[]는 fmtMeso로 "32억 2,009만 1,896 메소"처럼 길게 적혀 있다(툴팁용).
         그걸 축에 그대로 찍으면 회전시켜도 옆 라벨과 겹쳐 글자가 뭉개진다
         (실제로 그렇게 보인다는 제보 있었음). 축에는 억/조 단위로 짧게 줄인
         문자열을 따로 그린다 — 데이터·툴팁은 그대로 두고 표시만 바꾼다. */
      xTicks: {
        maxRotation: 45, font: { size: 9 }, maxTicksLimit: 8,
        callback: (_, idx) => fmtMesoCompact(step * (idx + 0.5)),
      },
    });

    /* 파괴 횟수 분포 차트 */
    const maxDest = Math.max(...destroyArr);
    const destBuckets = Array(maxDest + 1).fill(0);
    destroyArr.forEach(d => destBuckets[d]++);
    if (_sfDestroyChart) _sfDestroyChart.destroy();
    _sfDestroyChart = _sfBarChart('sfDestroyChart', {
      labels: destBuckets.map((_, i) => `${i}개`), data: destBuckets, N,
      bg: 'rgba(246,99,99,0.55)', border: 'rgba(246,139,139,0.8)',
      title: items => `파괴 ${items[0].label}`,
      xTicks: { font: { size: 10 } },
    });
  };
  _sfEnsureChartLib().then(ok => { if (ok) drawCharts(); });

  /* 메소 bidir 평균 세팅 */
  const avgCost = Math.round(exact.cost);
  const avgPct  = _sfPctOf(costs, avgCost);
  document.getElementById('sfInputMeso').value = avgCost;
  document.getElementById('sfInputPct').value  = avgPct.toFixed(3);
  _sfShowResult(avgPct, avgCost);

  /* 파괴 bidir 평균 세팅 */
  const avgDest    = Math.round(exact.destroys);
  const avgDestPct = _sfPctOf(destroyArr, avgDest);
  document.getElementById('sfInputDestroyCount').value = avgDest;
  document.getElementById('sfInputDestroyPct').value   = avgDestPct.toFixed(3);
  _sfShowDestroyResult(avgDestPct, avgDest);

  // 버튼을 직접 눌렀을 때만 결과로 스크롤한다. 레벨을 한 자씩 고칠 때마다
  // 화면이 끌려가면 입력을 못 하므로 자동 재계산에서는 스크롤하지 않는다.
  if (scrollToResult) {
    document.getElementById('sfRightExpected')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

