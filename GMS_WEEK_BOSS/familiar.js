/* ═══════════════════════════════════════════════
   패밀리어 — 옵션 재설정 시뮬레이터

   지금은 유니크만 연다. 에픽·레어는 아랫줄이 각각 레어·커먼 풀에서 나오는데
   그 풀의 확률 자료가 없어서, 없는 값을 지어내느니 잠가둔다.
   (레어 확률표는 확보되는 대로 data_familiar.js에 추가하면 열 수 있다.)

   유니크 카드가 옵션 두 줄을 얻는 방식은 공식 문서 기준:
     1번째 줄 = 현재 등급(유니크) 풀
     2번째 줄 = 이전 등급(에픽) 풀
     단, 드물게 두 줄 모두 현재 등급에서 나온다
   그 "드물게"의 값은 공개된 적이 없어, 원 자료의 2줄 조합 확률에서 역산했다.
   (data_familiar.js의 FAM_BOTH_CURRENT_TIER 주석 참고)
═══════════════════════════════════════════════ */

const FAM_CARD_IMG = 'images/icons/Use_Mystical_Familiar_Card.png';

/* 지금 열려 있는 등급. 나중에 에픽까지 열면 선택형으로 바꾼다. */
const FAM_OPEN_RANKS = ['UNIQUE'];

let _famState = { rank: 'UNIQUE', cards: 0, lines: [], log: [], best: null };

function _famData() { return window.FAMILIAR_DATA; }

/* 등급 한 단계 아래 */
function _famLower(rank) {
  const i = _famData().RANKS.indexOf(rank);
  return i > 0 ? _famData().RANKS[i - 1] : rank;
}

/* 가중 추첨 — 확률 0인 항목(삭제된 옵션)은 자연히 안 뽑힌다 */
function _famPick(pool) {
  const total = pool.reduce((s, o) => s + o.pct, 0);
  let r = Math.random() * total;
  for (const o of pool) { r -= o.pct; if (r <= 0) return o; }
  return pool[pool.length - 1];
}

/* 두 줄을 굴린다. 반환: [{opt, grade}, {opt, grade}] */
function _famRoll(rank) {
  const D = _famData();
  const lower = _famLower(rank);
  const bothCurrent = Math.random() < D.BOTH_CURRENT_TIER;
  const g2 = bothCurrent ? rank : lower;
  return [
    { opt: _famPick(D.LINES[rank]),  grade: rank, },
    { opt: _famPick(D.LINES[g2]),    grade: g2,   },
  ];
}

/* 유효 옵션이 몇 줄 떴는지 — 기록에서 좋은 판을 가려내는 데 쓴다 */
function _famPrimeCount(lines) {
  return lines.filter(l => _famData().PRIME.has(l.opt.key)).length;
}

function _famRollOnce() {
  const D = _famData();
  if (!D) return;
  _famState.cards++;
  _famState.lines = _famRoll(_famState.rank);
  const pc = _famPrimeCount(_famState.lines);
  _famState.log.unshift({ n: _famState.cards, lines: _famState.lines, prime: pc });
  if (_famState.log.length > 100) _famState.log.length = 100;
  if (!_famState.best || pc > _famState.best.prime) {
    _famState.best = { n: _famState.cards, lines: _famState.lines, prime: pc };
  }
  _famRender();
}

function _famReset() {
  _famStopAuto();
  _famState = { rank: _famState.rank, cards: 0, lines: [], log: [], best: null };
  _famRender();
}

/* ── 목표 옵션 ──
   두 칸에 각각 옵션을 고른다. 한 칸만 고르면 "그 옵션이 어느 줄에든 뜨면" 달성,
   두 칸을 고르면 두 옵션이 동시에 떠야 달성. 같은 옵션을 두 번 고르면 2줄 모두
   그 옵션이어야 한다(공6/공6 같은 목표). 큐브 목표 칸과 같은 규칙이다. */
function _famGetGoals() {
  return [...document.querySelectorAll('#famGoalRows .fam-goal-sel')]
    .map(s => s.value).filter(Boolean);
}

function _famHasGoals() { return _famGetGoals().length > 0; }

function _famGoalsMet(lines) {
  const goals = _famGetGoals();
  if (!goals.length) return false;
  const pool = lines.map(l => l.opt.key);
  for (const g of goals) {
    const i = pool.indexOf(g);
    if (i < 0) return false;
    pool.splice(i, 1);       // 한 줄은 목표 하나만 채운다
  }
  return true;
}

const FAM_AUTO_MAX = 2000000;
let _famAutoTimer = null;

function _famStopAuto(msg) {
  if (_famAutoTimer) { clearTimeout(_famAutoTimer); _famAutoTimer = null; }
  const btn = document.getElementById('famAutoBtn');
  if (btn) btn.textContent = '목표까지 자동';
  if (msg) alert(msg);
}

/* 한 번에 여러 판을 돌리고 화면은 묶어서 갱신한다 — 판마다 그리면 느려진다. */
function _famStartAuto() {
  if (_famAutoTimer) { _famStopAuto(); return; }
  if (!_famHasGoals()) { alert('목표 옵션을 먼저 정해주세요.'); return; }
  const btn = document.getElementById('famAutoBtn');
  if (btn) btn.textContent = '중지';

  const step = () => {
    const D = _famData();
    for (let i = 0; i < 2000; i++) {
      _famState.cards++;
      const lines = _famRoll(_famState.rank);
      _famState.lines = lines;
      const pc = _famPrimeCount(lines);
      if (!_famState.best || pc > _famState.best.prime) {
        _famState.best = { n: _famState.cards, lines, prime: pc };
      }
      if (_famGoalsMet(lines)) {
        _famState.log.unshift({ n: _famState.cards, lines, prime: pc, goal: true });
        if (_famState.log.length > 100) _famState.log.length = 100;
        _famStopAuto(); _famRender(); return;
      }
      if (_famState.cards >= FAM_AUTO_MAX) {
        _famState.log.unshift({ n: _famState.cards, lines, prime: pc });
        _famStopAuto(`${FAM_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표가 나오지 않아 멈췄습니다.`);
        _famRender(); return;
      }
    }
    _famRender();
    _famAutoTimer = setTimeout(step, 0);
  };
  step();
}

/* 목표 드롭다운 채우기 — 두 줄 다 뜰 수 있는 등급의 옵션을 모두 넣는다 */
function _famBuildGoalOpts() {
  const D = _famData();
  const rank = _famState.rank, lower = _famLower(rank);
  const seen = new Set();
  const groups = [rank, lower].map(g => {
    const items = D.LINES[g].filter(o => o.pct > 0 && !seen.has(o.key) && seen.add(o.key));
    return `<optgroup label="${g}">` +
      items.map(o => `<option value="${o.key}">${o.en}</option>`).join('') + '</optgroup>';
  }).join('');
  return '<option value="">선택 안함</option>' + groups;
}

function _famRefreshGoals() {
  const html = _famBuildGoalOpts();
  document.querySelectorAll('#famGoalRows .fam-goal-sel').forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = html;
    if (prev) sel.value = prev;
  });
}

function _famLineHtml(l) {
  const star = _famData().PRIME.has(l.opt.key) ? '<span class="fam-line__star">★</span>' : '';
  return `<div class="pot-line" data-grade="${l.grade}">${star}${l.opt.en}</div>`;
}

function _famRender() {
  const D = _famData(); if (!D) return;
  const panel = document.getElementById('famPanel');
  const linesEl = document.getElementById('famLines');
  const cntEl = document.getElementById('famCardCount');
  const logEl = document.getElementById('famLog');
  const bestEl = document.getElementById('famBest');
  if (!panel) return;

  panel.dataset.grade = _famState.rank;
  document.getElementById('famPanelTitle').textContent = _famState.rank;

  linesEl.innerHTML = _famState.lines.length
    ? _famState.lines.map(_famLineHtml).join('')
    : `<div class="pot-line pot-line--empty">카드를 사용해 옵션을 확인하세요</div>`;

  if (cntEl) cntEl.textContent = _famState.cards.toLocaleString();

  if (bestEl) {
    bestEl.innerHTML = _famState.best && _famState.best.prime > 0
      ? _famState.best.lines.map(_famLineHtml).join('') +
        `<div class="fam-best__at">${_famState.best.n.toLocaleString()}번째</div>`
      : `<div class="pot-line pot-line--empty">아직 없음</div>`;
  }

  if (logEl) {
    logEl.innerHTML = _famState.log.map(e => `
      <div class="fam-log-row${e.prime ? ' is-hit' : ''}">
        <span class="fam-log-n">${e.n.toLocaleString()}</span>
        ${e.lines.map(l => `<span class="fam-log-line" data-grade="${l.grade}">${l.opt.en}</span>`).join('')}
      </div>`).join('');
  }
}

function initFamiliar() {
  const sec = document.getElementById('sec-familiar');
  const D = _famData();
  if (!sec || !D) return;

  const rankBtns = D.RANKS.filter(r => r !== 'LEGENDARY' && r !== 'COMMON').map(r => {
    const open = FAM_OPEN_RANKS.includes(r);
    return `<button class="sf-toggle${r === 'UNIQUE' ? ' active' : ''}${open ? '' : ' is-locked'}"
              data-rank="${r}"${open ? '' : ' disabled title="확률 자료가 없어 아직 잠겨 있습니다"'}>
              ${r}${open ? '' : ' 🔒'}
            </button>`;
  }).join('');

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">패밀리어 시뮬레이터</h2></div>
    <p class="dt-help">패밀리어 카드로 잠재 옵션을 재설정합니다. 두 줄 중 아랫줄은 한 단계 아래 등급에서 뜨고, 드물게 두 줄 모두 현재 등급에서 뜹니다.</p>

    <div class="sf-layout">
      <!-- 왼쪽: 설정 -->
      <div class="card" style="display:flex;flex-direction:column;gap:16px">
        <div>
          <div class="card__title">등급</div>
          <div class="sf-toggle-group" id="famRankGroup" style="margin-top:8px">${rankBtns}</div>
          <p class="dt-help" style="margin-top:8px">에픽·레어는 아랫줄 확률 자료가 없어 잠겨 있습니다.</p>
        </div>

        <div>
          <div class="card__title">목표 옵션</div>
          <div id="famGoalRows" style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
            <select class="sel fam-goal-sel"></select>
            <select class="sel fam-goal-sel"></select>
          </div>
          <p class="dt-help" style="margin-top:8px">한 개만 고르면 어느 줄에든 뜨면 달성, 두 개를 고르면 둘 다 떠야 달성합니다.</p>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="sbtn sbtn--add" id="famRollBtn">옵션 재설정 [S]</button>
          <button class="sbtn sbtn--ghost" id="famAutoBtn">목표까지 자동</button>
          <button class="sbtn sbtn--ghost" id="famResetBtn">초기화</button>
        </div>

        <div class="sf-res-item">
          <span class="sf-res-label">사용한 카드</span>
          <span class="sf-res-val hr-cubecount">
            <span class="hr-cubecount__item">
              <img src="${FAM_CARD_IMG}" alt="패밀리어 카드" title="신비한 패밀리어 카드" onerror="this.style.display='none'">
              <span id="famCardCount">0</span>개
            </span>
          </span>
        </div>

        <div>
          <div class="card__title">지금까지 가장 좋은 판</div>
          <div id="famBest" class="fam-best"></div>
        </div>
      </div>

      <!-- 오른쪽: 결과 -->
      <div class="card">
        <div class="pot-panel" id="famPanel" data-grade="UNIQUE">
          <div class="pot-panel__head"><span id="famPanelTitle">UNIQUE</span></div>
          <div class="pot-panel__lines" id="famLines"></div>
        </div>
        <div class="card__title mt16">기록</div>
        <div id="famLog" class="fam-log"></div>
        <p class="dt-help mt16">${D.SOURCE_NOTE}</p>
      </div>
    </div>`;

  document.getElementById('famRollBtn')?.addEventListener('click', () => { _famStopAuto(); _famRollOnce(); });
  document.getElementById('famAutoBtn')?.addEventListener('click', _famStartAuto);
  document.getElementById('famResetBtn')?.addEventListener('click', _famReset);

  sec.querySelectorAll('#famRankGroup .sf-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      sec.querySelectorAll('#famRankGroup .sf-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _famState.rank = btn.dataset.rank;
      _famRefreshGoals();
      _famReset();
    });
  });

  _famRefreshGoals();

  /* S 키로 재설정 — 큐브와 같은 규칙. 이 탭이 열려 있고 입력칸에 포커스가
     없을 때만 가로챈다. */
  document.addEventListener('keydown', e => {
    if (e.code !== 'KeyS' || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!document.getElementById('sec-familiar')?.classList.contains('active')) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;
    e.preventDefault();
    _famStopAuto();
    _famRollOnce();
  });

  _famRender();
}

/* 데이터는 이 탭을 처음 열 때만 받는다(큐브와 같은 방식) */
let _famLoading = null, _famInited = false;
function ensureFamiliarReady(cb) {
  if (window.FAMILIAR_DATA) {
    if (!_famInited) { _famInited = true; initFamiliar(); }
    cb && cb(); return;
  }
  if (!_famLoading) {
    _famLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'data_familiar.js?v=20260821a';
      s.onload = resolve;
      s.onerror = () => reject(new Error('data_familiar.js 로드 실패'));
      document.body.appendChild(s);
    });
  }
  _famLoading.then(() => {
    if (!_famInited) { _famInited = true; initFamiliar(); }
    cb && cb();
  }).catch(() => {
    const sec = document.getElementById('sec-familiar');
    if (sec) sec.innerHTML = '<div class="soon-box"><div class="soon-box__title">데이터를 불러오지 못했습니다</div><div class="soon-box__desc">새로고침해주세요.</div></div>';
  });
}
