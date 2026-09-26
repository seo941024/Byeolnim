/* ═══════════════════════════════════════════════
   연마석 시뮬레이터 — 생명의 연마석/신념의 연마석을 몇 개 등록할지 고르면
   그 개수만큼 성공률이 쌓인다(개수 × 개당 확률, 최대 개수 채우면 100% 확정).
   등록한 개수만큼 메소를 한 번에 내고 시도 1회를 굴린다.
   ═══════════════════════════════════════════════════════════ */

function _polData() { return window.POLISH_DATA; }

let _polState = { type: 'life', count: 1, tries: 0, fails: 0, mesoSpent: 0, stonesUsed: { life: 0, faith: 0 }, locked: { life: false, faith: false }, log: [] };

function _polStep() {
  const D = _polData();
  const t = D.TYPES[_polState.type];
  const chance = D.chance(_polState.type, _polState.count);
  const cost = D.cost(_polState.type, _polState.count);

  _polState.tries++;
  _polState.mesoSpent += cost;
  _polState.stonesUsed[_polState.type] += _polState.count;
  const ok = Math.random() < chance;
  if (!ok) _polState.fails++;
  else _polState.locked[_polState.type] = true; // 연마석은 한 번 성공하면 그걸로 끝 — 초기화 전까지 재시도 불가
  _polState.log.unshift({ n: _polState.tries, type: t.key, count: _polState.count, chance, ok });
  if (_polState.log.length > 200) _polState.log.length = 200;
  return ok;
}

function _polRollOnce() { _polStep(); _polRender(); }

function _polReset() {
  _polStopAuto();
  _polState = { type: _polState.type, count: _polState.count, tries: 0, fails: 0, mesoSpent: 0, stonesUsed: { life: 0, faith: 0 }, locked: { life: false, faith: false }, log: [] };
  _polRender();
}

const POL_AUTO_MAX = 200000;
let _polAutoTimer = null;
function _polStopAuto(msg) {
  if (_polAutoTimer) { clearTimeout(_polAutoTimer); _polAutoTimer = null; }
  const b = document.getElementById('polAutoBtn');
  if (b) b.textContent = '성공할 때까지 자동 [A]';
  if (msg) alert(msg);
}
function _polStartAuto() {
  if (_polAutoTimer) { _polStopAuto(); return; }
  const b = document.getElementById('polAutoBtn');
  if (b) b.textContent = '중지 [A]';
  const step = () => {
    for (let i = 0; i < 500; i++) {
      const ok = _polStep();
      if (ok) { _polStopAuto(); _polRender(); return; }
      if (_polState.tries >= POL_AUTO_MAX) {
        _polStopAuto(`${POL_AUTO_MAX.toLocaleString()}번을 돌렸지만 성공하지 못해 멈췄습니다.`);
        _polRender(); return;
      }
    }
    _polRender();
    _polAutoTimer = setTimeout(step, 0);
  };
  step();
}

function _polBuildCountOpts() {
  const D = _polData();
  const t = D.TYPES[_polState.type];
  let html = '';
  for (let n = 1; n <= t.maxCount; n++) html += `<option value="${n}"${n === _polState.count ? ' selected' : ''}>${n}개</option>`;
  return html;
}

function _polRender() {
  const D = _polData(); if (!D) return;
  const t = D.TYPES[_polState.type];
  if (_polState.count > t.maxCount) _polState.count = t.maxCount;
  const chance = D.chance(_polState.type, _polState.count);
  const cost = D.cost(_polState.type, _polState.count);

  document.querySelectorAll('.pol-type-tab').forEach(b => b.classList.toggle('active', b.dataset.poltype === _polState.type));
  const countSel = document.getElementById('polCount');
  if (countSel) countSel.innerHTML = _polBuildCountOpts();

  document.getElementById('polChance').textContent = (Math.round(chance * 1000) / 10) + '%';
  document.getElementById('polCost').textContent = fmtMeso(cost);
  document.getElementById('polConfirmNote').style.display = chance >= 1 ? '' : 'none';

  const locked = _polState.locked[_polState.type];
  document.getElementById('polRollBtn').disabled = locked;
  document.getElementById('polAutoBtn').disabled = locked;
  document.getElementById('polCount').disabled = locked;

  document.getElementById('polTries').textContent = _polState.tries.toLocaleString();
  document.getElementById('polFails').textContent = _polState.fails.toLocaleString();
  document.getElementById('polSuccesses').textContent = (_polState.tries - _polState.fails).toLocaleString();
  document.getElementById('polMesoSpent').textContent = fmtMeso(_polState.mesoSpent);
  document.getElementById('polStonesUsed').innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:.86rem;font-weight:800;color:var(--text)">
      <img class="crystal-icon" src="${t.icon}" alt="" onerror="this.style.display='none'">
      <span>${_polState.stonesUsed[_polState.type]}개</span>
    </div>`;

  document.getElementById('polLog').innerHTML = _polState.log.map(e => `
    <div class="fam-log-row${e.ok ? ' is-hit' : ''}">
      <span class="fam-log-n">${e.n}</span>
      <span class="fam-log-line">${D.TYPES[e.type].label} ${e.count}개 · ${Math.round(e.chance * 1000) / 10}%</span>
      <span class="ru-log-res ${e.ok ? 'ok' : 'no'}">${e.ok ? '성공' : '실패'}</span>
    </div>`).join('');
}

function initPolish() {
  const sec = document.getElementById('sec-polish');
  const D = _polData();
  if (!sec || !D) return;

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">연마석 시뮬레이터</h2></div>

    <div class="sf-tabs">
      <button class="sf-tab pol-type-tab active" data-poltype="life">생명의 연마석</button>
      <button class="sf-tab pol-type-tab" data-poltype="faith">신념의 연마석</button>
    </div>
    <hr class="sec-sep" />

    <div class="sf-layout">
      <div class="card">
        <div class="card__title">등록</div>
        <div class="cube-goal-hint mt8">등록 개수 <select class="sel" id="polCount">${_polBuildCountOpts()}</select></div>
        <div class="sf-res-item mt16"><span class="sf-res-label">성공률</span><span class="sf-res-val" id="polChance">100%</span></div>
        <div class="sf-res-item"><span class="sf-res-label">1회당 메소</span><span class="sf-res-val" id="polCost">0 메소</span></div>
        <p class="dt-help" id="polConfirmNote" style="display:none">※ 최대 개수라 이번 시도는 확정 성공입니다.</p>

        <div class="cube-btns mt16">
          <button class="sbtn sbtn--primary cube-btn-full" id="polRollBtn">연마 시도 [S]</button>
        </div>
        <div class="cube-btns mt8">
          <button class="sbtn sbtn--ghost cube-btn-full" id="polAutoBtn">성공할 때까지 자동 [A]</button>
          <button class="sbtn sbtn--ghost cube-btn-full mt8" id="polResetBtn">초기화 [R]</button>
        </div>
      </div>

      <div class="card">
        <div class="card__title">누적</div>
        <div class="sf-res-item"><span class="sf-res-label">시도</span><span class="sf-res-val" id="polTries">0</span></div>
        <div class="sf-res-item"><span class="sf-res-label">성공</span><span class="sf-res-val" id="polSuccesses">0</span></div>
        <div class="sf-res-item"><span class="sf-res-label">실패</span><span class="sf-res-val" id="polFails">0</span></div>
        <div class="sf-res-item" style="align-items:flex-start"><span class="sf-res-label">사용한 연마석</span><div id="polStonesUsed"></div></div>
        <div class="sf-res-item"><span class="sf-res-label">소모 메소</span><span class="sf-res-val" id="polMesoSpent">0 메소</span></div>

        <div class="card__title mt16">기록</div>
        <div id="polLog" class="fam-log"></div>
      </div>
    </div>`;

  sec.querySelectorAll('.pol-type-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.poltype === _polState.type) return;
      _polStopAuto();
      _polState.type = tab.dataset.poltype;
      _polState.count = 1;
      _polRender();
    });
  });
  document.getElementById('polCount').addEventListener('change', e => {
    _polState.count = Number(e.target.value) || 1;
    _polRender();
  });
  document.getElementById('polRollBtn').addEventListener('click', () => { _polStopAuto(); _polRollOnce(); });
  document.getElementById('polAutoBtn').addEventListener('click', _polStartAuto);
  document.getElementById('polResetBtn').addEventListener('click', _polReset);

  document.addEventListener('keydown', e => {
    if (!['KeyS', 'KeyR', 'KeyA'].includes(e.code) || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!document.getElementById('sec-polish')?.classList.contains('active')) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;
    e.preventDefault();
    if (e.code === 'KeyS') document.getElementById('polRollBtn')?.click();
    else if (e.code === 'KeyA') document.getElementById('polAutoBtn')?.click();
    else if (e.code === 'KeyR') document.getElementById('polResetBtn')?.click();
  });

  _polRender();
}

let _polLoading = null, _polInited = false;
function ensurePolishReady(cb) {
  if (window.POLISH_DATA) {
    if (!_polInited) { _polInited = true; initPolish(); }
    cb && cb(); return;
  }
  if (!_polLoading) {
    _polLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'data_polish.js?v=20260926a';
      s.onload = resolve;
      s.onerror = () => reject(new Error('data_polish.js 로드 실패'));
      document.body.appendChild(s);
    });
  }
  _polLoading.then(() => {
    if (!_polInited) { _polInited = true; initPolish(); }
    cb && cb();
  }).catch(() => {
    const sec = document.getElementById('sec-polish');
    if (sec) sec.innerHTML = '<div class="soon-box"><div class="soon-box__title">데이터를 불러오지 못했습니다</div><div class="soon-box__desc">새로고침해주세요.</div></div>';
  });
}
