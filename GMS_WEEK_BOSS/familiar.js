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

/* 등급 아이콘 — 큐브 시뮬레이터와 같은 파일을 쓴다 */
function _famIconSrc(g) { return `images/icons/${(g||'rare').toLowerCase()}.png`; }

/* 지금 열려 있는 등급. 나중에 에픽까지 열면 선택형으로 바꾼다. */
const FAM_OPEN_RANKS = ['UNIQUE'];

let _famState = { rank: 'UNIQUE', cards: 0, lines: [], log: [] };

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

/* 두 줄을 굴린다. 반환: [{opt, grade}, {opt, grade}]
   레어는 아랫줄이 커먼 풀에서 나오는데 커먼 확률 자료가 없다. 없는 풀을
   지어내는 대신 두 줄 모두 레어에서 뽑는다(화면에 그 사실을 적어둔다). */
function _famRoll(rank) {
  const D = _famData();
  const lower = _famLower(rank);
  const hasLower = !!D.LINES[lower];
  const bothCurrent = !hasLower || Math.random() < D.BOTH_CURRENT_TIER;
  const g2 = bothCurrent ? rank : lower;
  return [
    { opt: _famPick(D.LINES[rank]), grade: rank },
    { opt: _famPick(D.LINES[g2]),   grade: g2   },
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
  _famRender();
}

function _famReset() {
  _famStopAuto();
  _famState = { rank: _famState.rank, cards: 0, lines: [], log: [] };
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
  if (btn) btn.textContent = '목표까지 자동 [A]';
  if (msg) alert(msg);
}

/* 한 번에 여러 판을 돌리고 화면은 묶어서 갱신한다 — 판마다 그리면 느려진다. */
function _famStartAuto() {
  if (_famAutoTimer) { _famStopAuto(); return; }
  if (!_famHasGoals()) { alert('목표 옵션을 먼저 정해주세요.'); return; }
  const btn = document.getElementById('famAutoBtn');
  if (btn) btn.textContent = '중지 [A]';

  const step = () => {
    const D = _famData();
    for (let i = 0; i < 2000; i++) {
      _famState.cards++;
      const lines = _famRoll(_famState.rank);
      _famState.lines = lines;
      const pc = _famPrimeCount(lines);
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
  const groups = [rank, lower].filter(g => D.LINES[g]).map(g => {
    const items = D.LINES[g].filter(o => o.pct > 0 && !seen.has(o.key) && seen.add(o.key));
    return `<optgroup label="${D.RANK_LABEL[g]}">` +
      items.map(o => `<option value="${o.key}">${o.en}</option>`).join('') + '</optgroup>';
  }).join('');
  return '<option value="">-</option>' + groups;
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
  if (!panel) return;

  panel.dataset.grade = _famState.rank;
  document.getElementById('famPanelTitle').textContent = D.RANK_LABEL[_famState.rank] || _famState.rank;
  const icoEl = document.getElementById('famPanelIcon');
  if (icoEl) { icoEl.src = _famIconSrc(_famState.rank); icoEl.style.display = ''; }

  linesEl.innerHTML = _famState.lines.length
    ? _famState.lines.map(_famLineHtml).join('')
    : `<div class="pot-line pot-line--empty">카드를 사용해 옵션을 확인하세요</div>`;

  if (cntEl) cntEl.textContent = _famState.cards.toLocaleString();

  /* 왼쪽 카드 그림도 등급에 맞춰 바꾼다 */
  const cardImg = document.getElementById('famCardImg');
  if (cardImg) { cardImg.src = _ruMiniSrc(_famState.rank); cardImg.style.display = ''; }

  /* 레어는 확률이 추정치라 그 사실을 반드시 같이 띄운다 */
  const noteEl = document.getElementById('famNote');
  if (noteEl) {
    const lower = _famLower(_famState.rank);
    const estList = D.ESTIMATED_RANKS || [];
    /* 이 판에 실제로 쓰이는 등급(현재 + 아랫줄) 중 추정치인 것만 짚어준다 */
    const used = [_famState.rank, D.LINES[lower] ? lower : null].filter(Boolean);
    const est = used.filter(function (g) { return estList.indexOf(g) >= 0; })
                    .map(function (g) { return D.RANK_LABEL[g]; });
    noteEl.innerHTML =
      (est.length
        ? '<b>' + est.join('·') + ' 옵션은 정확한 자료가 없어 정규화 방식으로 추론된 값입니다.</b><br>'
        : '') +
      D.SOURCE_NOTE;
  }

  if (logEl) {
    logEl.innerHTML = _famState.log.map(e => `
      <div class="fam-log-row${e.prime ? ' is-hit' : ''}">
        <span class="fam-log-n">${e.n.toLocaleString()}</span>
        <img class="fam-log-icon" src="${_famIconSrc(_famState.rank)}" alt="" onerror="this.style.display='none'">
        ${e.lines.map(l => `<span class="fam-log-line" data-grade="${l.grade}">${l.opt.en}</span>`).join('')}
      </div>`).join('');
  }
}


/* ═══════════════════════════════════════════════
   등급업 시뮬레이터
   레어 → 에픽 → 유니크. 확률과 필요 포인트는 넥슨 공식 공지 그대로다.
   천장은 공식에 없는 규칙이라 따로 둔다 — 정해진 횟수만큼 연속 실패하면
   그 다음 시도는 무조건 성공한다. */
const FAM_PITY = { RARE: 5, EPIC: 14 };

let _ruState = { rank: 'RARE', tries: 0, fails: 0, pity: 0, log: [], done: false };

function _ruMiniSrc(g) { return 'images/familiar/mini_' + (g || 'rare').toLowerCase() + '.png'; }

function _ruReset() {
  _ruStopAuto();
  _ruState = { rank: 'RARE', tries: 0, fails: 0, pity: 0, log: [], done: false };
  _ruRender();
}

/* 한 번 시도. 천장에 닿았으면 확률을 무시하고 성공시킨다. */
function _ruStep() {
  if (_ruState.done) return false;
  const D = _famData();
  const cur = _ruState.rank;
  const info = D.RANKUP[cur];
  if (!info) { _ruState.done = true; return false; }

  const cap = FAM_PITY[cur];
  const forced = cap != null && _ruState.pity >= cap;
  const ok = forced || Math.random() < info.chance;

  _ruState.tries++;
  _ruState.log.unshift({ n: _ruState.tries, from: cur, ok: ok, forced: forced });
  if (_ruState.log.length > 200) _ruState.log.length = 200;

  if (ok) {
    _ruState.rank = info.to;
    _ruState.pity = 0;
    if (!D.RANKUP[info.to]) _ruState.done = true;
  } else {
    _ruState.fails++;
    _ruState.pity++;
  }
  return ok;
}

function _ruRollOnce() { _ruStep(); _ruRender(); }

let _ruAutoTimer = null;
function _ruStopAuto() {
  if (_ruAutoTimer) { clearTimeout(_ruAutoTimer); _ruAutoTimer = null; }
  const b = document.getElementById('ruAutoBtn');
  if (b) b.textContent = '유니크까지 자동 [A]';
}

function _ruStartAuto() {
  if (_ruAutoTimer) { _ruStopAuto(); return; }
  if (_ruState.done) { alert('이미 유니크입니다. 초기화 후 다시 시작해주세요.'); return; }
  const b = document.getElementById('ruAutoBtn');
  if (b) b.textContent = '중지 [A]';
  const step = function () {
    for (let i = 0; i < 200; i++) {
      _ruStep();
      if (_ruState.done) { _ruStopAuto(); _ruRender(); return; }
    }
    _ruRender();
    _ruAutoTimer = setTimeout(step, 0);
  };
  step();
}

function _ruRender() {
  const D = _famData(); if (!D) return;
  /* 카드 그림은 지금 등급 한 장만 원본 크기로 보여준다 */
  const img = document.getElementById('ruCardImg');
  if (img) { img.src = _ruMiniSrc(_ruState.rank); img.style.display = ''; }
  const lbl = document.getElementById('ruCardLbl');
  if (lbl) { lbl.textContent = D.RANK_LABEL[_ruState.rank]; lbl.dataset.grade = _ruState.rank; }

  const info = D.RANKUP[_ruState.rank];
  const cap = FAM_PITY[_ruState.rank];
  const now = document.getElementById('ruNow');
  now.textContent = D.RANK_LABEL[_ruState.rank];
  now.dataset.grade = _ruState.rank;
  document.getElementById('ruChance').textContent = info ? Math.round(info.chance * 100) + '%' : '—';
  document.getElementById('ruPoints').textContent = info ? info.points.toLocaleString() : '—';
  document.getElementById('ruPity').textContent = (info && cap != null) ? (_ruState.pity + ' / ' + cap) : '—';
  document.getElementById('ruTries').textContent = _ruState.tries.toLocaleString();
  document.getElementById('ruFails').textContent = _ruState.fails.toLocaleString();

  let pts = 0;
  _ruState.log.forEach(function (e) { if (D.RANKUP[e.from]) pts += D.RANKUP[e.from].points; });
  document.getElementById('ruTotalPoints').textContent = pts.toLocaleString();

  const btn = document.getElementById('ruRollBtn');
  if (btn) { btn.disabled = _ruState.done; btn.textContent = _ruState.done ? '유니크 달성' : '등급업 [S]'; }

  document.getElementById('ruLog').innerHTML = _ruState.log.map(function (e) {
    return '<div class="fam-log-row' + (e.ok ? ' is-hit' : '') + '">' +
      '<span class="fam-log-n">' + e.n + '</span>' +
      '<img class="fam-log-icon" src="images/icons/' + e.from.toLowerCase() + '.png" alt="" onerror="this.style.display=\'none\'">' +
      '<span class="fam-log-line" data-grade="' + e.from + '">' + D.RANK_LABEL[e.from] + '</span>' +
      '<span class="ru-log-res ' + (e.ok ? 'ok' : 'no') + '">' + (e.ok ? '성공' : '실패') + '</span>' +
      (e.forced ? '<span class="ru-log-pity">천장</span>' : '') +
      '</div>';
  }).join('');
}

function initFamiliar() {
  const sec = document.getElementById('sec-familiar');
  const D = _famData();
  if (!sec || !D) return;

  const rankBtns = ['RARE', 'EPIC', 'UNIQUE'].map(function (r) {
    return '<button class="sf-toggle' + (r === 'UNIQUE' ? ' active' : '') + '" data-rank="' + r + '">' +
      D.RANK_LABEL[r] + '</button>';
  }).join('');

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">패밀리어 시뮬레이터</h2></div>

    <div class="sf-tabs">
      <button class="sf-tab active" data-famtab="rankup">등급업 시뮬레이터</button>
      <button class="sf-tab" data-famtab="option">옵션 시뮬레이터</button>
    </div>
    <hr class="sec-sep" />

    <!-- ══ 등급업 ══ -->
    <div id="famTabRankup">
      <div class="sf-layout">
        <!-- 왼쪽: 카드 그림 + 버튼 -->
        <div class="card fam-cardcol">
          <div class="fam-cardview">
            <img id="ruCardImg" src="" alt="" onerror="this.style.display='none'">
          </div>
          <div class="fam-cardview__lbl" id="ruCardLbl" data-grade="RARE">레어</div>

          <div class="cube-btns mt16">
            <button class="sbtn sbtn--primary cube-btn-full" id="ruRollBtn">등급업 [S]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="ruAutoBtn">유니크까지 자동 [A]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="ruResetBtn">초기화 [R]</button>
          </div>
        </div>

        <!-- 오른쪽: 현재 상태 + 누적 + 기록 -->
        <div class="card">
          <div class="card__title">현재 상태</div>
          <div class="sf-res-item"><span class="sf-res-label">등급</span><span class="sf-res-val ru-now" id="ruNow">레어</span></div>
          <div class="sf-res-item"><span class="sf-res-label">등급업 확률</span><span class="sf-res-val" id="ruChance">80%</span></div>
          <div class="sf-res-item"><span class="sf-res-label">필요 포인트</span><span class="sf-res-val" id="ruPoints">100</span></div>
          <div class="sf-res-item"><span class="sf-res-label">천장</span><span class="sf-res-val" id="ruPity">0 / 5</span></div>

          <div class="card__title mt16">누적</div>
          <div class="sf-res-item"><span class="sf-res-label">시도</span><span class="sf-res-val" id="ruTries">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">실패</span><span class="sf-res-val" id="ruFails">0</span></div>
          <div class="sf-res-item"><span class="sf-res-label">소모 포인트</span><span class="sf-res-val" id="ruTotalPoints">0</span></div>

          <div class="card__title mt16">기록</div>
          <div id="ruLog" class="fam-log"></div>
        </div>
      </div>
    </div>

    <!-- ══ 옵션 ══ -->
    <div id="famTabOption" style="display:none">
      <div class="sf-layout">
        <div class="card fam-cardcol">
          <div class="fam-cardview">
            <img id="famCardImg" src="" alt="" onerror="this.style.display='none'">
          </div>

          <div class="card__title mt16">등급</div>
          <div class="sf-toggle-group" id="famRankGroup" style="margin-top:8px">${rankBtns}</div>

          <div class="card__title mt16">목표 옵션</div>
          <div class="cube-goal-hint">
            한 개만 고르면 <b>어느 줄에든</b> 뜨면 정지, 두 개를 고르면 <b>둘 다</b> 떠야 정지합니다.
          </div>
          <div id="famGoalRows">
            <select class="sel fam-goal-sel"></select>
            <select class="sel fam-goal-sel mt8"></select>
          </div>

          <div class="cube-btns mt16">
            <button class="sbtn sbtn--primary cube-btn-full" id="famRollBtn">옵션 재설정 [S]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="famAutoBtn">목표까지 자동 [A]</button>
            <button class="sbtn sbtn--ghost cube-btn-full mt8" id="famResetBtn">초기화 [R]</button>
          </div>
        </div>

        <div class="card">
          <div class="card__title">결과</div>
          <div class="pot-panel mt8" id="famPanel" data-grade="UNIQUE">
            <div class="pot-panel__head">
              <img class="pot-panel__icon" id="famPanelIcon" src="" alt="" onerror="this.style.display='none'">
              <span>잠재옵션 <span id="famPanelTitle">유니크</span></span>
            </div>
            <div class="pot-panel__lines" id="famLines"></div>
          </div>

          <div class="sf-res-item mt16">
            <span class="sf-res-label">사용한 카드</span>
            <span class="sf-res-val hr-cubecount">
              <span class="hr-cubecount__item">
                <img src="${FAM_CARD_IMG}" alt="패밀리어 카드" title="신비한 패밀리어 카드" onerror="this.style.display='none'">
                <span id="famCardCount">0</span>개
              </span>
            </span>
          </div>

          <div class="card__title mt16">기록</div>
          <div id="famLog" class="fam-log"></div>
          <p class="dt-help mt16" id="famNote"></p>
        </div>
      </div>
    </div>`;

  // 탭 전환
  sec.querySelectorAll('.sf-tab[data-famtab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      sec.querySelectorAll('.sf-tab[data-famtab]').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      const t = tab.dataset.famtab;
      document.getElementById('famTabRankup').style.display = t === 'rankup' ? '' : 'none';
      document.getElementById('famTabOption').style.display = t === 'option' ? '' : 'none';
      _famStopAuto(); _ruStopAuto();
    });
  });

  document.getElementById('ruRollBtn').addEventListener('click', function () { _ruStopAuto(); _ruRollOnce(); });
  document.getElementById('ruAutoBtn').addEventListener('click', _ruStartAuto);
  document.getElementById('ruResetBtn').addEventListener('click', _ruReset);

  document.getElementById('famRollBtn').addEventListener('click', function () { _famStopAuto(); _famRollOnce(); });
  document.getElementById('famAutoBtn').addEventListener('click', _famStartAuto);
  document.getElementById('famResetBtn').addEventListener('click', _famReset);

  sec.querySelectorAll('#famRankGroup .sf-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sec.querySelectorAll('#famRankGroup .sf-toggle').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      _famState.rank = btn.dataset.rank;
      _famRefreshGoals();
      _famReset();
    });
  });

  /* S=굴리기, R=초기화, A=자동 — 지금 열려 있는 탭에 맞는 동작을 한다 */
  document.addEventListener('keydown', function (e) {
    if (!['KeyS', 'KeyR', 'KeyA'].includes(e.code) || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    if (!document.getElementById('sec-familiar').classList.contains('active')) return;
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (document.querySelector('.overlay[style*="flex"]')) return;
    e.preventDefault();
    const isRankup = document.getElementById('famTabRankup').style.display !== 'none';
    if (e.code === 'KeyS') {
      if (isRankup) { _ruStopAuto(); _ruRollOnce(); }
      else { _famStopAuto(); _famRollOnce(); }
    } else if (e.code === 'KeyR') {
      document.getElementById(isRankup ? 'ruResetBtn' : 'famResetBtn')?.click();
    } else if (e.code === 'KeyA') {
      document.getElementById(isRankup ? 'ruAutoBtn' : 'famAutoBtn')?.click();
    }
  });

  _famRefreshGoals();
  _ruRender();
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
      s.src = 'data_familiar.js?v=20260821c';
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
