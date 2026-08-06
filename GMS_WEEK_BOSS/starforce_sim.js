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
function _sfGetFrom()     { return parseInt(document.getElementById('sfFrom').value) || 0; }
function _sfGetTo()       { return Math.min(30, parseInt(document.getElementById('sfTo').value) || 22); }

function _sfGetCfg() {
  const star = _sfState.star;
  const btn  = _sfStages[star] || 1;
  const isShining   = _sfGetEvent() === 'shining';
  const isProtected = (star >= 15 && star <= 17) && btn === 4;
  const stage       = isProtected ? 1 : btn;
  return { level: _sfGetLevel(), mvpDiscount: _sfGetMvp(), isShining, isProtected, stage };
}

function sfEnhanceOnce() {
  const from = _sfGetFrom();
  const to   = _sfGetTo();
  if (_sfState.star >= to) { sfStopAuto(); return false; }

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
  if (_sfState.log.length > 30) _sfState.log.pop();

  sfRenderResult();
  return _sfState.star < to;
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

  const starDisp = `<div class="sf-star-display">${_sfState.star}★ <span style="font-size:.9rem;color:var(--text-sub)">/ ${to}★</span></div>`;

  const stats = `
    <div class="sf-res-item"><span class="sf-res-label">강화 횟수</span><span class="sf-res-val">${_sfState.attempts.toLocaleString()} 회</span></div>
    <div class="sf-res-item"><span class="sf-res-label">파괴 횟수</span><span class="sf-res-val" style="color:${_sfState.destroys>0?'var(--danger)':'var(--text)'}">${_sfState.destroys} 회</span></div>
    ${done ? '<div class="sf-res-item" style="color:var(--success);font-weight:700;text-align:center;padding:10px 0">목표 달성!</div>' : ''}`;

  const logHtml = _sfState.log.slice(0, 15).map(l => {
    const cls  = l.type === 'success' ? 'log-success' : l.type === 'destroy' ? 'log-destroy' : 'log-fail';
    const icon = l.type === 'success' ? '✦' : l.type === 'destroy' ? '💥' : '✕';
    const desc = l.type === 'success' ? `${l.from}★ → ${l.to}★ 성공` : l.type === 'destroy' ? `${l.from}★ 파괴 → ${l.to}★` : `${l.from}★ 실패`;
    return `<div class="sf-log-row ${cls}"><span class="sf-log-icon">${icon}</span><span class="sf-log-desc">${desc}</span><span class="sf-log-cost">${fmtMeso(l.cost)}</span></div>`;
  }).join('');

  el.innerHTML = starDisp + stats + (logHtml ? `<div class="sf-log">${logHtml}</div>` : '');
}

function sfStopAuto() {
  if (_sfAutoTimer) { clearInterval(_sfAutoTimer); _sfAutoTimer = null; }
  const btn = document.getElementById('sfBtnAuto');
  if (btn) { btn.textContent = '자동 강화'; btn.classList.remove('sbtn--danger'); btn.classList.add('sbtn--primary'); }
}

function initStarforce() {
  if (!document.getElementById('sfStageGrid')) return;

  // 초기 별 위치를 sfFrom 값으로 세팅
  _sfState = { star: _sfGetFrom(), cost: 0, attempts: 0, destroys: 0, log: [] };
  sfBuildStageGrid();

  // 토글 그룹 처리
  document.querySelectorAll('.sf-toggle-group').forEach(grp => {
    grp.querySelectorAll('.sf-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        grp.querySelectorAll('.sf-toggle').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sfBuildStageGrid(); // 샤이닝 상태 바뀌면 파괴율 다시 계산
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
    el.addEventListener('change', _sfRecalcExpected);
  });

  // 강화 1회
  document.getElementById('sfBtn1')?.addEventListener('click', () => {
    sfStopAuto();
    sfEnhanceOnce();
  });

  // 자동 강화
  document.getElementById('sfBtnAuto')?.addEventListener('click', () => {
    if (_sfAutoTimer) { sfStopAuto(); return; }
    const btn = document.getElementById('sfBtnAuto');
    btn.textContent = '■ 중지';
    btn.classList.remove('sbtn--primary'); btn.classList.add('sbtn--danger');
    _sfAutoTimer = setInterval(() => {
      const cont = sfEnhanceOnce();
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

  // 양방향 메소 ↔ 상위% 이벤트 (한 번만 등록)
  document.getElementById('sfInputMeso').addEventListener('input', () => {
    if (!_sfLastCosts.length) return;
    const val = parseInt(document.getElementById('sfInputMeso').value, 10);
    if (!val || val <= 0) return;
    const pct = _sfPctFromMeso(val);
    document.getElementById('sfInputPct').value = pct.toFixed(3);
    _sfShowResult(pct, val);
  });
  document.getElementById('sfInputPct').addEventListener('input', () => {
    if (!_sfLastCosts.length) return;
    const pct = parseFloat(document.getElementById('sfInputPct').value);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const meso = _sfMesoFromPct(pct);
    document.getElementById('sfInputMeso').value = meso;
    _sfShowResult(pct, meso);
  });
  document.getElementById('sfInputDestroyCount').addEventListener('input', () => {
    if (!_sfLastDestroys.length) return;
    const val = parseInt(document.getElementById('sfInputDestroyCount').value, 10);
    if (isNaN(val) || val < 0) return;
    const pct = _sfDestroyPctFromCount(val);
    document.getElementById('sfInputDestroyPct').value = pct.toFixed(3);
    _sfShowDestroyResult(pct, val);
  });
  document.getElementById('sfInputDestroyPct').addEventListener('input', () => {
    if (!_sfLastDestroys.length) return;
    const pct = parseFloat(document.getElementById('sfInputDestroyPct').value);
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    const count = _sfDestroyCountFromPct(pct);
    document.getElementById('sfInputDestroyCount').value = count;
    _sfShowDestroyResult(pct, count);
  });

  // 탭 스위칭
  document.querySelectorAll('.sf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sf-tab').forEach(t => t.classList.remove('active'));
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
  if (document.querySelector('.sf-tab.active')?.dataset.sftab !== 'expected') return;
  if (_sfGetFrom() >= _sfGetTo()) return;
  sfShowExpected();
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
          ticks: { color: 'rgba(200,190,240,.6)', maxRotation: 45, font: { size: 9 }, maxTicksLimit: 10 },
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

