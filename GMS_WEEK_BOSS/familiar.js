/* ═══════════════════════════════════════════════
   패밀리어 — 옵션 재설정 시뮬레이터

   레어·에픽·유니크를 연다. 레어·커먼 풀은 확률이 추정치라
   (data_familiar.js의 FAM_ESTIMATED_RANKS) 그 풀이 쓰이는 판에는 화면에 표기한다.

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

let _famState = { rank: 'UNIQUE', cards: 0, lines: [], log: [] };

function _famData() { return window.FAMILIAR_DATA; }

/* 등급 한 단계 아래 */
function _famLower(rank) {
  const R = _famData().RANKS, i = R.indexOf(rank);
  return i > 0 ? R[i - 1] : rank;
}

/* 가중 추첨 — 확률 0인 항목(삭제된 옵션)은 자연히 안 뽑힌다 */
function _famPick(pool) {
  const total = pool.reduce((s, o) => s + o.pct, 0);
  let r = Math.random() * total;
  for (const o of pool) { r -= o.pct; if (r <= 0) return o; }
  return pool[pool.length - 1];
}

/* 두 줄을 굴린다. 반환: [{opt, grade}, {opt, grade}]
   아래 등급 풀 자료가 없으면 지어내는 대신 두 줄 모두 현재 등급에서 뽑는다. */
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

/* 카드 한 장을 쓰고 그 판의 기록 항목을 돌려준다. 기록에 올릴지는 부르는 쪽이 정한다 */
function _famDraw() {
  _famState.cards++;
  _famState.lines = _famRoll(_famState.rank);
  return { n: _famState.cards, lines: _famState.lines, prime: _famPrimeCount(_famState.lines) };
}

function _famLog(e) {
  _famState.log.unshift(e);
  if (_famState.log.length > 100) _famState.log.length = 100;
}

function _famRollOnce() { _famLog(_famDraw()); _famRender(); }

function _famReset() {
  _famAuto.stop();
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

function _famGoalsMet(lines) {
  const goals = _famGetGoals();
  if (!goals.length) return false;
  // 등급마다 수치가 다른 옵션이 같은 key를 쓰기도 해서(IGN20 등) 문구(en)로 가린다
  const pool = lines.map(l => l.opt.en);
  for (const g of goals) {
    const i = pool.indexOf(g);
    if (i < 0) return false;
    pool.splice(i, 1);       // 한 줄은 목표 하나만 채운다
  }
  return true;
}

/* 자동은 목표·상한에 닿은 판만 기록에 올린다 */
const FAM_AUTO_MAX = 2000000;
const _famAuto = createAutoRunner({
  btnId: 'famAutoBtn', idleLabel: '목표까지 자동 [A]', runLabel: '중지 [A]', batch: 2000,
  canStart: () => {
    if (!_famGetGoals().length) { alert('목표 옵션을 먼저 정해주세요.'); return false; }
  },
  tick: () => {
    const e = _famDraw();
    if (_famGoalsMet(e.lines)) { e.goal = true; _famLog(e); return 'done'; }
    if (_famState.cards >= FAM_AUTO_MAX) { _famState.log.unshift(e); return 'max'; }
  },
  maxMsg: () => `${FAM_AUTO_MAX.toLocaleString()}번을 돌렸지만 목표가 나오지 않아 멈췄습니다.`,
  render: _famRender,
});

/* 목표 드롭다운 채우기 — 두 줄 다 뜰 수 있는 등급의 옵션을 모두 넣는다 */
function _famBuildGoalOpts() {
  const D = _famData();
  const rank = _famState.rank, lower = _famLower(rank);
  const seen = new Set();
  const groups = [rank, lower].filter(g => D.LINES[g]).map(g => {
    const items = D.LINES[g].filter(o => o.pct > 0 && !seen.has(o.en) && seen.add(o.en));
    return `<optgroup label="${D.RANK_LABEL[g]}">` +
      items.map(o => `<option value="${o.en}">${o.en}</option>`).join('') + '</optgroup>';
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
  const D = _famData();
  const rank = _famState.rank;

  document.getElementById('famPanel').dataset.grade = rank;
  document.getElementById('famPanelTitle').textContent = D.RANK_LABEL[rank] || rank;
  const icoEl = document.getElementById('famPanelIcon');
  icoEl.src = _famIconSrc(rank); icoEl.style.display = '';

  document.getElementById('famLines').innerHTML = _famState.lines.length
    ? _famState.lines.map(_famLineHtml).join('')
    : `<div class="pot-line pot-line--empty">카드를 사용해 옵션을 확인하세요</div>`;

  document.getElementById('famCardCount').textContent = _famState.cards.toLocaleString();

  /* 왼쪽 카드 그림도 등급에 맞춰 바꾼다 */
  const cardImg = document.getElementById('famCardImg');
  cardImg.src = _ruMiniSrc(rank); cardImg.style.display = '';

  /* 레어는 확률이 추정치라 그 사실을 반드시 같이 띄운다.
     이 판에 실제로 쓰이는 등급(현재 + 아랫줄) 중 추정치인 것만 짚어준다 */
  const est = [rank, _famLower(rank)]
    .filter(g => D.LINES[g] && D.ESTIMATED_RANKS.includes(g))
    .map(g => D.RANK_LABEL[g]);
  document.getElementById('famNote').innerHTML =
    (est.length ? '<b>' + est.join('·') + ' 옵션은 정확한 자료가 없어 정규화 방식으로 추론된 값입니다.</b><br>' : '') +
    D.SOURCE_NOTE;

  document.getElementById('famLog').innerHTML = _famState.log.map(e => `
      <div class="fam-log-row${e.prime ? ' is-hit' : ''}">
        <span class="fam-log-n">${e.n.toLocaleString()}</span>
        <img class="fam-log-icon" src="${_famIconSrc(rank)}" alt="" onerror="this.style.display='none'">
        ${e.lines.map(l => `<span class="fam-log-line" data-grade="${l.grade}">${l.opt.en}</span>`).join('')}
      </div>`).join('');
}


/* ═══════════════════════════════════════════════
   등급업 시뮬레이터
   레어 → 에픽 → 유니크. 확률과 필요 포인트는 넥슨 공식 공지 그대로다.
   천장은 GMS v.264 패치노트의 Rank-Up Guarantee이고 레어→에픽, 에픽→유니크에 붙는다. 횟수는 공지에 없어
   maplestorywiki "fails 14 times in a row ... the 15th attempt is guaranteed to succeed"를 따른다.
   실패하면 포인트가 최대치의 절반으로 남아서, 다시 시도할 때는 필요 포인트의 절반만 더 모으면 된다(같은 위키). */
const FAM_PITY = { RARE: 14, EPIC: 14 };

const _ruFresh = () => ({ rank: 'RARE', tries: 0, fails: 0, pity: 0, spent: 0, log: [], done: false });
let _ruState = _ruFresh();

function _ruMiniSrc(g) { return 'images/familiar/mini_' + (g || 'rare').toLowerCase() + '.png'; }

function _ruReset() {
  _ruAuto.stop();
  _ruState = _ruFresh();
  _ruRender();
}

/* 한 번 시도. 천장에 닿았으면 확률을 무시하고 성공시킨다. */
function _ruStep() {
  if (_ruState.done) return;
  const D = _famData();
  const cur = _ruState.rank;
  const info = D.RANKUP[cur];
  if (!info) { _ruState.done = true; return; }

  const cap = FAM_PITY[cur];
  const forced = cap != null && _ruState.pity >= cap;
  const ok = forced || Math.random() < info.chance;

  // 이 등급에서 바로 앞 시도가 실패했으면 포인트가 절반 남아 있어 절반만 쓴다
  _ruState.spent += _ruState.pity > 0 ? info.points / 2 : info.points;
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
}

function _ruRollOnce() { _ruStep(); _ruRender(); }

const _ruAuto = createAutoRunner({
  btnId: 'ruAutoBtn', idleLabel: '유니크까지 자동 [A]', runLabel: '중지 [A]', batch: 200,
  canStart: () => {
    if (_ruState.done) { alert('이미 유니크입니다. 초기화 후 다시 시작해주세요.'); return false; }
  },
  tick: () => { _ruStep(); if (_ruState.done) return 'done'; },
  render: _ruRender,
});

function _ruRender() {
  const D = _famData();
  /* 카드 그림은 지금 등급 한 장만 원본 크기로 보여준다 */
  const img = document.getElementById('ruCardImg');
  img.src = _ruMiniSrc(_ruState.rank); img.style.display = '';
  const lbl = document.getElementById('ruCardLbl');
  lbl.textContent = D.RANK_LABEL[_ruState.rank]; lbl.dataset.grade = _ruState.rank;

  const info = D.RANKUP[_ruState.rank];
  const cap = FAM_PITY[_ruState.rank];
  const now = document.getElementById('ruNow');
  now.textContent = D.RANK_LABEL[_ruState.rank];
  now.dataset.grade = _ruState.rank;
  document.getElementById('ruChance').textContent = info ? Math.round(info.chance * 100) + '%' : '—';
  document.getElementById('ruPoints').textContent = info ? (_ruState.pity > 0 ? info.points / 2 : info.points).toLocaleString() : '—';
  document.getElementById('ruPity').textContent = (info && cap != null) ? (_ruState.pity + ' / ' + cap) : '—';
  document.getElementById('ruTries').textContent = _ruState.tries.toLocaleString();
  document.getElementById('ruFails').textContent = _ruState.fails.toLocaleString();

  document.getElementById('ruTotalPoints').textContent = _ruState.spent.toLocaleString();

  const btn = document.getElementById('ruRollBtn');
  btn.disabled = _ruState.done; btn.textContent = _ruState.done ? '유니크 달성' : '등급업 [S]';

  document.getElementById('ruLog').innerHTML = _ruState.log.map(function (e) {
    return '<div class="fam-log-row' + (e.ok ? ' is-hit' : '') + '">' +
      '<span class="fam-log-n">' + e.n + '</span>' +
      '<img class="fam-log-icon" src="' + _famIconSrc(e.from) + '" alt="" onerror="this.style.display=\'none\'">' +
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
  const tabs = sec.querySelectorAll('.sf-tab[data-famtab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      setActive(tabs, tab);
      const t = tab.dataset.famtab;
      document.getElementById('famTabRankup').style.display = t === 'rankup' ? '' : 'none';
      document.getElementById('famTabOption').style.display = t === 'option' ? '' : 'none';
      _famAuto.stop(); _ruAuto.stop();
    });
  });

  const ruRoll = () => { _ruAuto.stop(); _ruRollOnce(); };
  const famRoll = () => { _famAuto.stop(); _famRollOnce(); };
  document.getElementById('ruRollBtn').addEventListener('click', ruRoll);
  document.getElementById('ruAutoBtn').addEventListener('click', _ruAuto.start);
  document.getElementById('ruResetBtn').addEventListener('click', _ruReset);

  document.getElementById('famRollBtn').addEventListener('click', famRoll);
  document.getElementById('famAutoBtn').addEventListener('click', _famAuto.start);
  document.getElementById('famResetBtn').addEventListener('click', _famReset);

  const rankEls = sec.querySelectorAll('#famRankGroup .sf-toggle');
  rankEls.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActive(rankEls, btn);
      _famState.rank = btn.dataset.rank;
      _famRefreshGoals();
      _famReset();
    });
  });

  /* S=굴리기, R=초기화, A=자동 — 지금 열려 있는 탭에 맞는 동작을 한다 */
  bindSimKeys('sec-familiar', key => {
    const isRankup = document.getElementById('famTabRankup').style.display !== 'none';
    if (key === 's') (isRankup ? ruRoll : famRoll)();
    else if (key === 'r') (isRankup ? _ruReset : _famReset)();
    else (isRankup ? _ruAuto : _famAuto).start();
  });

  _famRefreshGoals();
  _ruRender();
  _famRender();
}

/* 데이터는 이 탭을 처음 열 때만 받는다 */
const _famEnsure = lazySection({
  isReady: () => !!window.FAMILIAR_DATA, src: 'data_familiar.js?v=20260821c', init: initFamiliar, secId: 'sec-familiar',
});
function ensureFamiliarReady(cb) { _famEnsure(cb); }
