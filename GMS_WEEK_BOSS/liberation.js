/* ═══════════════════════════════════════════════
   해방 계산기 — 제네시스 (어둠의 흔적)
═══════════════════════════════════════════════ */
// todayStr()는 app.js에 있다.
/* 'YYYY-MM-DD'를 그 날짜의 로컬 자정으로 읽는다. new Date('YYYY-MM-DD')는 UTC 자정으로
   읽혀서, 아래의 getDay()·setDate() 로컬 계산과 섞이면 미국 시간대에서 하루가 밀린다. */
function libLocalDate(str) { return new Date((str || todayStr()) + 'T00:00:00'); }

/* 데스티니·아스트라 데이터는 난이도 키를 한글로 들고 있는데, 화면 표기는
   제네시스(DIFF_META)와 똑같이 영문으로 맞춘다. 키까지 바꾸면 이미 저장된
   사용자 선택이 전부 깨지므로 표시할 때만 바꾼다. */
const LIB_DIFF_LABEL = { 이지:'EASY', 노말:'NORMAL', 하드:'HARD', 카오스:'CHAOS', 익스트림:'EXTREME' };

const genState = (() => {
  const def = { quest:0, held:0, pass:false, sel:{}, startDate: todayStr() };
  let s = def;
  try { s = Object.assign(def, JSON.parse(localStorage.getItem(STORAGE_KEYS.genesis) || '{}')); }
  catch { return def; }
  // startDate는 "오늘부터 시뮬레이션"의 기준점이라 저장된 옛날 값을 그대로 불러오면
  // 안 된다 — 그 사이 지난 리셋들을 하나도 안 지난 것처럼 계산해서 예상 해방일이
  // 완전히 틀어진다(예: 몇 달 전에 켜뒀던 값이 계속 남아있던 문제). 열 때마다 오늘로.
  s.startDate = todayStr();
  // 더스크 난이도 키를 hard → chaos로 고쳤으므로, 예전에 hard로 저장된 선택을 옮겨준다.
  // 안 하면 TRACE_YIELD에 없는 키라 획득량이 0으로 잡힌다.
  if (s.sel && s.sel.dusk && s.sel.dusk.diff === 'hard') s.sel.dusk = { ...s.sel.dusk, diff: 'chaos' };
  return s;
})();
function saveGen() { localStorage.setItem(STORAGE_KEYS.genesis, JSON.stringify(genState)); }

function bossInfo(id) { return BOSS_DATA.find(b => b.id === id) || { name:id, img:'' }; }
function fmtTrace(n) { return Number(n).toLocaleString(); }


/* ─── 계산 로직 ─── */
function calcBossTraces() {
  const mult = genState.pass ? GENESIS_PASS_MULT : 1;
  const rows = [];
  // thisWeek: 이번 주 수입 (cleared 제외)
  // fullWeek: 다음 주부터 수입 (cleared 포함, 매주 받을 수 있음)
  let thisWeekly = 0, fullWeekly = 0, thisMonthly = 0, fullMonthly = 0;

  for (const id in TRACE_YIELD) {
    const sel   = genState.sel[id] || {};
    const diff  = sel.diff || 'none';
    if (diff === 'none') continue;
    const party = Math.max(1, sel.party || 1);
    const raw   = Math.floor((TRACE_YIELD[id][diff] || 0) * mult / party);
    const isMonthly = id === 'blackmage';

    rows.push({ id, name: bossInfo(id).name, diff, raw, isMonthly, cleared: !!sel.cleared });
    if (isMonthly) {
      fullMonthly += raw;
      if (!sel.cleared) thisMonthly += raw;
    } else {
      fullWeekly += raw;
      if (!sel.cleared) thisWeekly += raw;
    }
  }
  return { rows, thisWeekly, fullWeekly, thisMonthly, fullMonthly };
}

function calcResult() {
  const { rows, thisWeekly, fullWeekly, thisMonthly, fullMonthly } = calcBossTraces();
  const mult = genState.pass ? GENESIS_PASS_MULT : 1;

  const held      = Math.max(0, genState.held);
  const questCum  = (GENESIS_QUESTS[genState.quest] || GENESIS_QUESTS[0]).cum;
  const totalSpent = questCum + held;
  const remaining  = Math.max(0, GENESIS_TARGET - totalSpent);
  const pct        = Math.min(100, Math.round(totalSpent / GENESIS_TARGET * 100));

  // 이번주 남은 수입 (미격파 보스만)
  const week1income = thisWeekly + thisMonthly;

  let daysLeft = null, targetDateStr = '—';

  if (remaining <= 0) {
    daysLeft = 0;
    targetDateStr = '이미 달성!';
  } else if (fullWeekly > 0 || fullMonthly > 0) {
    // 시작일에서 첫 목요일 리셋 찾기
    const startD = libLocalDate(genState.startDate);
    const daysToFirstReset = (4 - startD.getDay() + 7) % 7 || 7;

    /* ★ 예전에는 월간(검은 마법사)을 fullMonthly/4로 주당 환산하고, 리셋 횟수도
       (1 + ceil(...))로 한 번 더 세서 결과가 항상 1주 늦고 월간분도 어긋났다.
       이제는 실제 리셋 시점을 그대로 시뮬레이션한다:
       · 지금 이번 주에 아직 안 잡은 보스에서 한 번 (week1income)
       · 주간 보스는 목요일 리셋마다 fullWeekly
       · 검은 마법사는 매월 1일 리셋이라 그날 fullMonthly
       ★ 월간을 "목요일 리셋이 달을 넘을 때"로 묶으면 안 된다 — 1일이 화요일이면
         실제로는 그날 바로 들어오는데 그 주 목요일까지 밀려 결과가 어긋난다
         (패스 켠 조건에서 실제로 이틀 차이가 났다). 그래서 두 리셋을 각각
         독립된 이벤트로 두고 시간순으로 처리한다. */
    let acc = week1income;
    let libDate = null;

    if (acc >= remaining) {
      libDate = new Date(startD);           // 이번 주 안에 달성
    } else {
      const nextThu = new Date(startD);
      nextThu.setDate(startD.getDate() + daysToFirstReset);
      const nextMonth = new Date(startD.getFullYear(), startD.getMonth() + 1, 1);

      for (let i = 0; i < 52 * 30; i++) {   // 30년이면 사실상 무한 방지용
        const t = nextThu.getTime(), m = nextMonth.getTime();
        const when = Math.min(t, m);        // 더 이른 리셋부터, 같은 날이면 둘 다
        if (t === when) acc += fullWeekly;
        if (m === when) acc += fullMonthly;

        if (acc >= remaining) { libDate = new Date(when); break; }

        if (t === when) nextThu.setDate(nextThu.getDate() + 7);
        if (m === when) nextMonth.setMonth(nextMonth.getMonth() + 1);
      }
    }

    if (libDate) {
      // 오늘부터 해방일까지 일수
      const today = new Date();
      today.setHours(0,0,0,0);
      daysLeft = Math.round((libDate - today) / 86400000);

      targetDateStr = `${libDate.getFullYear()}년 ${String(libDate.getMonth()+1).padStart(2,'0')}월 ${String(libDate.getDate()).padStart(2,'0')}일`;
    }
  }

  const weeksStr = daysLeft != null
    ? `${(daysLeft / 7).toFixed(1)}주 · ${daysLeft}일`
    : '—';

  return { rows, weeklyTotal: thisWeekly, monthlyTotal: thisMonthly, fullWeekly, fullMonthly, mult, held, questCum, totalSpent, remaining, pct, daysLeft, weeksStr, targetDateStr };
}

/* ─── 결과 패널 렌더링 ─── */
function renderResult() {
  const panel = document.getElementById('genResultPanel');
  if (!panel) return;
  const r = calcResult();

  if (r.rows.length === 0) {
    panel.innerHTML = `<p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택하면 계산 결과가 표시됩니다.</p>`;
    return;
  }

  const bossRows = r.rows.map(row => {
    const isMonthly = row.isMonthly;
    const unit = isMonthly ? '/월' : '/주';
    const dimmed = row.cleared ? ' style="opacity:.4"' : '';
    return `<div class="gen-res-row"${dimmed}>
      <span class="gen-res-name">${row.name} (${DIFF_META[row.diff]?.label || row.diff})</span>
      <b class="gen-res-val">${fmtTrace(row.raw)}${unit}</b>
    </div>`;
  }).join('');

  const weeklyLine = r.fullWeekly > 0 ? `${fmtTrace(r.fullWeekly)}/주` : '';
  const monthlyLine = r.fullMonthly > 0 ? `+ ${fmtTrace(r.fullMonthly)}/월` : '';

  panel.innerHTML = `
    <div class="gen-res-section">
      ${bossRows}
    </div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row gen-res-total">
      <span>총 획득 흔적</span>
      <b>${[weeklyLine, monthlyLine].filter(Boolean).join(' ')}</b>
    </div>
    <div class="gen-res-row">
      <span>획득 / 요구 흔적</span>
      <b>${fmtTrace(r.totalSpent)} / ${fmtTrace(GENESIS_TARGET)}</b>
    </div>
    <div class="gen-res-divider"></div>
    <div class="lib-progress" style="margin:8px 0 4px"><div class="lib-progress__fill" style="width:${r.pct}%"></div></div>
    <div class="lib-pct" style="margin-bottom:12px">${r.pct}% · ${fmtTrace(r.totalSpent)} / ${fmtTrace(GENESIS_TARGET)}</div>
    <div class="gen-res-row gen-res-accent">
      <span>예상 해방 기간</span>
      <b>${r.weeksStr}</b>
    </div>
    <div class="gen-date-wrap">
      <div class="gen-date-label">예상 해방 날짜</div>
      <div class="gen-date-big">${r.targetDateStr}</div>
    </div>`;
}

/* ─── 메인 렌더 ─── */
function renderGenesis() {
  const panel = document.getElementById('lib-genesis');

  const questOpts = GENESIS_QUESTS.map((qq, i) =>
    `<option value="${i}" ${i===genState.quest?'selected':''}>${qq.name} (${fmtTrace(qq.need)})</option>`
  ).join('');

  const mult = genState.pass ? GENESIS_PASS_MULT : 1;

  const bossCards = Object.keys(TRACE_YIELD).map(id => {
    const info  = bossInfo(id);
    const sel   = genState.sel[id] || {};
    const diff  = sel.diff || 'none';
    const party = Math.max(1, sel.party || 1);
    const cleared = !!sel.cleared;
    const yld   = diff === 'none' ? 0 : Math.floor((TRACE_YIELD[id][diff] || 0) * mult / party);
    const active = diff !== 'none';
    const isMonthly = id === 'blackmage';

    const diffOpts = ['none', ...Object.keys(TRACE_YIELD[id])].map(d =>
      `<option value="${d}" ${diff===d?'selected':''}>${DIFF_META[d]?.label || d}</option>`
    ).join('');

    return `
      <div class="gen-boss ${active?'on':''}" data-id="${id}">
        <div class="boss-thumb"><img src="${info.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <div class="gen-boss__body">
          <div class="gen-boss__top">
            <span class="gen-boss__name">${info.name}</span>
          </div>
          <div class="gen-boss__row2">
            <select class="sel gen-boss__diff" data-id="${id}">${diffOpts}</select>
            <div class="party-stepper gen-boss__party" data-id="${id}">
              <button class="pm" ${party<=1?'disabled':''}>−</button>
              <span class="party-stepper__val">${party}</span>
              <button class="pp" ${party>=6?'disabled':''}>+</button>
            </div>
          </div>
          <div class="gen-boss__row3">
            <label class="gen-boss__ck">
              <input type="checkbox" class="gen-boss__cb" data-id="${id}" ${cleared?'checked':''}/>
              <span>${isMonthly ? '금월 격파' : '이번주'}</span>
            </label>
            <span class="gen-boss__trace ${active?'on':''}">+${fmtTrace(yld)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const held = Math.max(0, genState.held);
  const startDate = genState.startDate || todayStr();

  panel.innerHTML = `
    <div class="gen-main-layout">
      <!-- 좌측: 설정 + 보스 목록 -->
      <div class="gen-left">
        <div class="card gen-inputs">
          <div class="gen-input-row">
            <div class="field">
              <label class="field__label">시작 날짜</label>
              <input class="inp gen-inp" id="genStartDate" type="date" value="${startDate}" />
            </div>
            <div class="field" style="flex:1.5">
              <label class="field__label">현재 퀘스트</label>
              <select class="sel gen-inp" id="genQuestSel">${questOpts}</select>
            </div>
          </div>
          <div class="gen-input-row" style="margin-top:12px;align-items:stretch">
            <div class="gen-cfg-card">
              <img class="gen-cfg-card__img" src="images/icons/Trace_of_darkness.webp" alt="">
              <div class="gen-cfg-card__body">
                <div class="gen-cfg-card__title">보유 어둠의 흔적</div>
                <input class="inp" id="genHeld" type="number" min="0" max="${TRACE_HOLD_MAX}" value="${held}" />
              </div>
            </div>
            <div class="gen-cfg-card gen-cfg-card--pass${genState.pass?' on':''}">
              <img class="gen-cfg-card__img" src="images/icons/Genesis.png" alt="">
              <div class="gen-cfg-card__body">
                <div class="gen-cfg-card__title">제네시스 패스</div>
                <label class="gen-switch gen-pass-toggle">
                  <input type="checkbox" id="genPass" ${genState.pass?'checked':''} />
                  <span class="gen-switch__track"><span class="gen-switch__thumb"></span></span>
                  <span class="gen-switch__label">${genState.pass?'ON':'OFF'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__title">주간 보스 설정</div>
          <div class="gen-bosses">${bossCards}</div>
        </div>

        <button class="sbtn sbtn--primary w100" id="genCalcBtn" style="margin-top:4px;padding:14px;font-size:1rem;font-weight:700">계산하기</button>
      </div>

      <!-- 우측: 계산 결과 -->
      <div class="card gen-stat-panel">
        <div class="card__title" style="margin-bottom:12px">계산 결과</div>
        <div id="genResultPanel"><p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택 후 계산하기를 눌러주세요.</p></div>
      </div>
    </div>`;

  /* 보스 카드 부분 업데이트 (전체 재렌더 없이) */
  function updateBossCard(id) {
    const card = panel.querySelector(`.gen-boss[data-id="${id}"]`);
    if (!card) return;
    const mult = genState.pass ? GENESIS_PASS_MULT : 1;
    const sel  = genState.sel[id] || {};
    const diff = sel.diff || 'none';
    const party = Math.max(1, sel.party || 1);
    const active = diff !== 'none';
    const yld = active ? Math.floor((TRACE_YIELD[id][diff] || 0) * mult / party) : 0;

    card.classList.toggle('on', active);
    const traceEl = card.querySelector('.gen-boss__trace');
    traceEl.textContent = `+${fmtTrace(yld)}`;
    traceEl.classList.toggle('on', active);
    const pm = card.querySelector('.pm');
    const pp = card.querySelector('.pp');
    pm.disabled = party <= 1;
    pp.disabled = party >= 6;
    card.querySelector('.party-stepper__val').textContent = party;
  }

  // 결과가 이미 계산돼 있으면(계산하기를 한 번이라도 눌렀으면) 변경 즉시 재계산
  const refreshResultIfShown = () => {
    if (document.querySelector('#genResultPanel .gen-date-big, #genResultPanel .gen-res-row')) renderResult();
  };

  /* 이벤트 — 입력은 자유롭게, 바깥 클릭(blur)/Enter 때만 클램프·저장 */
  const genHeldEl = document.getElementById('genHeld');
  genHeldEl.addEventListener('change', e => {
    const val = Math.max(0, Math.min(TRACE_HOLD_MAX, parseInt(e.target.value) || 0));
    genState.held = val;
    e.target.value = val;
    saveGen(); refreshResultIfShown();
  });

  document.getElementById('genPass').addEventListener('change', e => {
    genState.pass = e.target.checked;
    saveGen();
    // 패스 ON/OFF: 흔적량만 업데이트
    const lbl = document.querySelector('.gen-switch__label');
    if (lbl) lbl.textContent = genState.pass ? 'ON' : 'OFF';
    const passCard = document.querySelector('.gen-cfg-card--pass');
    if (passCard) passCard.classList.toggle('on', genState.pass);
    Object.keys(TRACE_YIELD).forEach(id => updateBossCard(id));
    refreshResultIfShown();
  });
  document.getElementById('genStartDate').addEventListener('change', e => {
    genState.startDate = e.target.value || todayStr();
    saveGen(); refreshResultIfShown();
  });
  document.getElementById('genQuestSel').addEventListener('change', e => {
    genState.quest = parseInt(e.target.value);
    saveGen(); refreshResultIfShown();
  });

  panel.querySelectorAll('.gen-boss__party').forEach(ps => {
    const id = ps.dataset.id;
    ps.querySelector('.pm').addEventListener('click', () => {
      const cur = genState.sel[id] || {};
      if ((cur.party||1) > 1) {
        genState.sel[id] = { ...cur, party:(cur.party||1)-1 };
        saveGen(); updateBossCard(id); refreshResultIfShown();
      }
    });
    ps.querySelector('.pp').addEventListener('click', () => {
      const cur = genState.sel[id] || {};
      if ((cur.party||1) < 6) {
        genState.sel[id] = { ...cur, party:(cur.party||1)+1 };
        saveGen(); updateBossCard(id); refreshResultIfShown();
      }
    });
  });
  panel.querySelectorAll('.gen-boss__cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      genState.sel[id] = { ...(genState.sel[id] || {}), cleared: cb.checked };
      saveGen(); refreshResultIfShown();
    });
  });
  panel.querySelectorAll('.gen-boss__diff').forEach(s => {
    s.addEventListener('change', () => {
      const id = s.dataset.id;
      genState.sel[id] = { ...(genState.sel[id] || {}), diff: s.value };
      saveGen(); updateBossCard(id); refreshResultIfShown();
    });
  });

  document.getElementById('genCalcBtn').addEventListener('click', renderResult);
}

/* ═══════════════════════════════════════════════
   해방 계산기 — 데스티니 (결의)
═══════════════════════════════════════════════ */
const destState = (() => {
  const def = { heldResolve: 0, sel: {}, startDate: todayStr(), questIdx: 0 };
  let s = def;
  try { s = Object.assign(def, JSON.parse(localStorage.getItem(STORAGE_KEYS.destiny) || '{}')); }
  catch { return def; }
  s.startDate = todayStr();   // genState와 같은 이유 — 저장된 옛날 날짜를 쓰면 안 됨
  return s;
})();
function saveDest() { localStorage.setItem(STORAGE_KEYS.destiny, JSON.stringify(destState)); }
function fmtResolve(n) { return Number(n).toLocaleString(); }

/* 주간 리셋(목요일) 기준 달성 예정일.
   ★ 수입 모델: 지금 이번 주에 아직 안 잡은 보스에서 thisWeekly를 한 번 더 벌 수 있고,
     그 뒤로는 리셋마다 fullWeekly씩 들어온다. 즉 N번째 리셋 시점의 누적은
     thisWeekly + N × fullWeekly 다.
   ★ 예전에는 리셋 수를 (1 + ceil(...))로 세고 날짜도 그만큼 뒤로 밀어서 결과가
     항상 정확히 1주 늦게 나왔다. N = ceil((remaining - thisWeekly) / fullWeekly)로
     세고, 날짜는 첫 리셋에서 (N-1)주 뒤가 맞다. */
function libTargetDate(remaining, thisWeekly, fullWeekly, startDateStr) {
  if (remaining <= 0) return { weeksStr: '이미 달성!', dateStr: '이미 달성!' };
  if (fullWeekly <= 0) return { weeksStr: '—', dateStr: '—' };

  const startD = libLocalDate(startDateStr);
  const daysToReset = (4 - startD.getDay() + 7) % 7 || 7;

  const resets = Math.max(0, Math.ceil((remaining - thisWeekly) / fullWeekly));
  if (resets === 0) return { weeksStr: '이번 주 달성', dateStr: '이번 주 안에 달성' };

  const libDate = new Date(startD);
  libDate.setDate(startD.getDate() + daysToReset + (resets - 1) * 7);

  const today = new Date(); today.setHours(0,0,0,0);
  const daysLeft = Math.round((libDate - today) / 86400000);
  const weeksStr = `${(daysLeft/7).toFixed(1)}주 · ${daysLeft}일`;
  const dateStr  = `${libDate.getFullYear()}년 ${String(libDate.getMonth()+1).padStart(2,'0')}월 ${String(libDate.getDate()).padStart(2,'0')}일`;
  return { weeksStr, dateStr };
}

function calcDestinyResult() {
  let thisWeekly = 0, fullWeekly = 0;
  const rows = [];

  for (const id in DESTINY_RESOLVE_YIELD) {
    const sel   = destState.sel[id] || {};
    const diff  = sel.diff || 'none';
    if (diff === 'none') continue;
    const party = Math.max(1, sel.party || 1);
    const raw   = Math.floor((DESTINY_RESOLVE_YIELD[id][diff] || 0) / party);
    rows.push({ id, name: (DESTINY_BOSS_META.find(b=>b.id===id)||{name:id}).name, diff, raw, cleared: !!sel.cleared });
    fullWeekly += raw;
    if (!sel.cleared) thisWeekly += raw;
  }

  const held = Math.max(0, destState.heldResolve);
  // 지금 진행 중인 결전 퀘스트 이전 것들은 이미 깬 것이므로 그만큼 목표에서 뺀다
  const qi      = Math.min(Math.max(0, destState.questIdx|0), DESTINY_QUESTS.length - 1);
  const quest   = DESTINY_QUESTS[qi];
  const doneCum = qi > 0 ? DESTINY_QUESTS[qi - 1].cum : 0;
  const have    = doneCum + held;

  const r1 = libTargetDate(Math.max(0, DESTINY_1ST_TARGET - have), thisWeekly, fullWeekly, destState.startDate);
  const r2 = libTargetDate(Math.max(0, DESTINY_2ND_TARGET - have), thisWeekly, fullWeekly, destState.startDate);
  const pct1 = Math.min(100, Math.round(have / DESTINY_1ST_TARGET * 100));
  const pct2 = Math.min(100, Math.round(have / DESTINY_2ND_TARGET * 100));

  return { rows, thisWeekly, fullWeekly, held, quest, doneCum, have, pct1, pct2, r1, r2 };
}

function renderDestinyResult() {
  const panel = document.getElementById('destResultPanel');
  if (!panel) return;
  const r = calcDestinyResult();

  if (r.rows.length === 0) {
    panel.innerHTML = `<p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택하면 계산 결과가 표시됩니다.</p>`;
    return;
  }

  const bossRows = r.rows.map(row => {
    const dimmed = row.cleared ? ' style="opacity:.4"' : '';
    return `<div class="gen-res-row"${dimmed}>
      <span class="gen-res-name">${row.name} (${LIB_DIFF_LABEL[row.diff]||row.diff})</span>
      <b class="gen-res-val">${fmtResolve(row.raw)}/주</b>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="gen-res-section">${bossRows}</div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row gen-res-total">
      <span>주당 총 결의</span>
      <b>${fmtResolve(r.fullWeekly)}/주</b>
    </div>
    <div class="gen-res-row">
      <span>현재 보유 결의</span>
      <b>${fmtResolve(r.held)}</b>
    </div>
    <div class="gen-res-row">
      <span>진행 중 · ${r.quest.name}</span>
      <b>${fmtResolve(r.quest.need)}</b>
    </div>
    ${r.doneCum > 0 ? `<div class="gen-res-row">
      <span>앞선 퀘스트로 완료</span>
      <b>${fmtResolve(r.doneCum)}</b>
    </div>` : ''}
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px"><span style="font-weight:700">1차 해방 · 누적 ${fmtResolve(DESTINY_1ST_TARGET)} 결의</span></div>
    <div class="lib-progress" style="margin:4px 0"><div class="lib-progress__fill" style="width:${r.pct1}%"></div></div>
    <div class="lib-pct" style="margin-bottom:4px">${r.pct1}% · ${fmtResolve(r.have)} / ${fmtResolve(DESTINY_1ST_TARGET)}</div>
    <div class="gen-res-row gen-res-accent">
      <span>1차 예상 기간</span><b>${r.r1.weeksStr}</b>
    </div>
    <div class="gen-date-wrap">
      <div class="gen-date-label">1차 해방 예상 날짜</div>
      <div class="gen-date-big">${r.r1.dateStr}</div>
    </div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px"><span style="font-weight:700">2차 해방 · 누적 ${fmtResolve(DESTINY_2ND_TARGET)} 결의</span></div>
    <div class="lib-progress" style="margin:4px 0"><div class="lib-progress__fill" style="width:${r.pct2}%"></div></div>
    <div class="lib-pct" style="margin-bottom:4px">${r.pct2}% · ${fmtResolve(r.have)} / ${fmtResolve(DESTINY_2ND_TARGET)}</div>
    <div class="gen-res-row gen-res-accent">
      <span>2차 예상 기간</span><b>${r.r2.weeksStr}</b>
    </div>
    <div class="gen-date-wrap">
      <div class="gen-date-label">2차 해방 예상 날짜</div>
      <div class="gen-date-big">${r.r2.dateStr}</div>
    </div>`;
}

function renderDestiny() {
  const panel = document.getElementById('lib-destiny');


  const bossCards = DESTINY_BOSS_META.map(meta => {
    const { id, name, maxParty, img } = meta;
    const yieldMap = DESTINY_RESOLVE_YIELD[id] || {};
    const sel    = destState.sel[id] || {};
    const diff   = sel.diff || 'none';
    const party  = Math.max(1, sel.party || 1);
    const cleared = !!sel.cleared;
    const active = diff !== 'none';
    const yld    = active ? Math.floor((yieldMap[diff] || 0) / party) : 0;

    const diffOpts = ['none', ...Object.keys(yieldMap)].map(d =>
      `<option value="${d}" ${diff===d?'selected':''}>${d==='none'?'-':(LIB_DIFF_LABEL[d]||d)}</option>`
    ).join('');

    return `
      <div class="gen-boss ${active?'on':''}" data-id="${id}">
        <div class="boss-thumb"><img src="${img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <div class="gen-boss__body">
          <div class="gen-boss__top"><span class="gen-boss__name">${name}</span></div>
          <div class="gen-boss__row2">
            <select class="sel dest-boss__diff" data-id="${id}">${diffOpts}</select>
            <div class="party-stepper dest-boss__party" data-id="${id}">
              <button class="pm" ${party<=1?'disabled':''}>−</button>
              <span class="party-stepper__val">${party}</span>
              <button class="pp" ${party>=maxParty?'disabled':''}>+</button>
            </div>
          </div>
          <div class="gen-boss__row3">
            <label class="gen-boss__ck">
              <input type="checkbox" class="dest-boss__cb" data-id="${id}" ${cleared?'checked':''}/>
              <span>이번주 격파</span>
            </label>
            <span class="gen-boss__trace ${active?'on':''}">+${fmtResolve(yld)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const held      = Math.max(0, destState.heldResolve);
  const startDate = destState.startDate || todayStr();
  // 결전 퀘스트는 1차/2차 초월로 묶여 있으므로 optgroup으로 나눠 보여준다
  const curQuest  = Math.min(Math.max(0, destState.questIdx|0), DESTINY_QUESTS.length - 1);
  const questOpts = [1, 2].map(stage => {
    const inner = DESTINY_QUESTS
      .map((q, i) => ({ q, i }))
      .filter(x => x.q.stage === stage)
      .map(({ q, i }) => `<option value="${i}" ${curQuest===i?'selected':''}>${q.name} (${fmtResolve(q.need)})</option>`)
      .join('');
    return `<optgroup label="${stage}차 초월">${inner}</optgroup>`;
  }).join('');

  panel.innerHTML = `
    <div class="gen-main-layout">
      <div class="gen-left">
        <div class="card gen-inputs">
          <div class="gen-input-row">
            <div class="field">
              <label class="field__label">시작 날짜</label>
              <input class="inp gen-inp" id="destStartDate" type="date" value="${startDate}" />
            </div>
            <div class="field" style="flex:1.6">
              <label class="field__label">진행 중인 결전 퀘스트</label>
              <select class="sel" id="destQuest">${questOpts}</select>
            </div>
          </div>
          <div class="gen-input-row" style="margin-top:12px;align-items:stretch">
            <div class="gen-cfg-card">
              <img class="gen-cfg-card__img" src="images/icons/Rivals_resolve.webp" alt="" onerror="this.style.display='none'">
              <div class="gen-cfg-card__body">
                <div class="gen-cfg-card__title">보유 대적자의 결의</div>
                <input class="inp" id="destHeld" type="number" min="0" max="${DESTINY_RESOLVE_MAX}" value="${held}" />
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__title">주간 보스 설정</div>
          <div class="gen-bosses" id="destBossGrid">${bossCards}</div>
        </div>

        <button class="sbtn sbtn--primary w100" id="destCalcBtn" style="margin-top:4px;padding:14px;font-size:1rem;font-weight:700">계산하기</button>
      </div>

      <div class="card gen-stat-panel">
        <div class="card__title" style="margin-bottom:12px">계산 결과</div>
        <div id="destResultPanel"><p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택 후 계산하기를 눌러주세요.</p></div>
      </div>
    </div>`;

  function updateDestCard(id) {
    const card = panel.querySelector(`.gen-boss[data-id="${id}"]`);
    if (!card) return;
    const yieldMap = DESTINY_RESOLVE_YIELD[id] || {};
    const sel  = destState.sel[id] || {};
    const diff = sel.diff || 'none';
    const party = Math.max(1, sel.party || 1);
    const active = diff !== 'none';
    const yld = active ? Math.floor((yieldMap[diff] || 0) / party) : 0;
    const meta = DESTINY_BOSS_META.find(b => b.id === id) || {};

    card.classList.toggle('on', active);
    const traceEl = card.querySelector('.gen-boss__trace');
    traceEl.textContent = `+${fmtResolve(yld)}`;
    traceEl.classList.toggle('on', active);
    const pm = card.querySelector('.pm');
    const pp = card.querySelector('.pp');
    pm.disabled = party <= 1;
    pp.disabled = party >= (meta.maxParty || 6);
    card.querySelector('.party-stepper__val').textContent = party;
  }

  // 결과가 이미 계산돼 있으면 변경 즉시 재계산
  const refreshDestIfShown = () => {
    if (document.querySelector('#destResultPanel .gen-date-big, #destResultPanel .gen-res-row')) renderDestinyResult();
  };

  document.getElementById('destHeld').addEventListener('change', e => {
    const val = Math.max(0, Math.min(DESTINY_RESOLVE_MAX, parseInt(e.target.value) || 0));
    destState.heldResolve = val;
    e.target.value = val;
    saveDest(); refreshDestIfShown();
  });
  document.getElementById('destStartDate').addEventListener('change', e => {
    destState.startDate = e.target.value || todayStr();
    saveDest(); refreshDestIfShown();
  });
  document.getElementById('destQuest').addEventListener('change', e => {
    destState.questIdx = parseInt(e.target.value) || 0;
    saveDest(); refreshDestIfShown();
  });

  panel.querySelectorAll('.dest-boss__party').forEach(ps => {
    const id = ps.dataset.id;
    const meta = DESTINY_BOSS_META.find(b => b.id === id) || {};
    ps.querySelector('.pm').addEventListener('click', () => {
      const cur = destState.sel[id] || {};
      if ((cur.party||1) > 1) {
        destState.sel[id] = { ...cur, party:(cur.party||1)-1 };
        saveDest(); updateDestCard(id); refreshDestIfShown();
      }
    });
    ps.querySelector('.pp').addEventListener('click', () => {
      const cur = destState.sel[id] || {};
      if ((cur.party||1) < (meta.maxParty||6)) {
        destState.sel[id] = { ...cur, party:(cur.party||1)+1 };
        saveDest(); updateDestCard(id); refreshDestIfShown();
      }
    });
  });
  panel.querySelectorAll('.dest-boss__cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      destState.sel[id] = { ...(destState.sel[id]||{}), cleared: cb.checked };
      saveDest(); refreshDestIfShown();
    });
  });
  panel.querySelectorAll('.dest-boss__diff').forEach(s => {
    s.addEventListener('change', () => {
      const id = s.dataset.id;
      destState.sel[id] = { ...(destState.sel[id]||{}), diff: s.value };
      saveDest(); updateDestCard(id); refreshDestIfShown();
    });
  });

  document.getElementById('destCalcBtn').addEventListener('click', renderDestinyResult);
}

/* ═══════════════════════════════════════════════
   해방 계산기 — 아스트라 보조무기 (조각 + 흔적)

   데스티니와 달리 재화가 둘이다:
   · 조각 — 일일 퀘스트로 매일 받는다(지역이 높을수록 많다)
   · 흔적 — 주간 보스로 받는다(리셋 기준)
   퀘스트는 조각과 흔적을 둘 다 요구하므로, 완료일은 둘 중 늦은 쪽이 결정한다.
═══════════════════════════════════════════════ */
const astraState = (() => {
  const def = { startDate: todayStr(), weaponIdx: 0, areaIdx: 0, heldFrag: 0, heldTrace: 0, sel: {} };
  let s = def;
  try { s = Object.assign(def, JSON.parse(localStorage.getItem(STORAGE_KEYS.astra) || '{}')); }
  catch { return def; }
  s.startDate = todayStr();   // genState와 같은 이유 — 저장된 옛날 날짜를 쓰면 안 됨
  return s;
})();
function saveAstra() { localStorage.setItem(STORAGE_KEYS.astra, JSON.stringify(astraState)); }
function fmtAstra(n) { return Number(n).toLocaleString(); }

/* 조각은 매일 들어오므로 리셋과 무관하게 그냥 나눗셈이다.
   N일 뒤 보유량 = 시작 보유 + N × 하루치 → 필요량을 넘는 첫 N을 찾는다. */
function astraFragDays(remaining, perDay) {
  if (remaining <= 0) return 0;
  if (perDay <= 0) return Infinity;
  return Math.ceil(remaining / perDay);
}

function calcAstraResult() {
  let thisWeekly = 0, fullWeekly = 0;
  const rows = [];
  for (const meta of ASTRA_BOSS_META) {
    const id    = meta.id;
    const sel   = astraState.sel[id] || {};
    const diff  = sel.diff || 'none';
    if (diff === 'none') continue;
    const party = Math.max(1, sel.party || 1);
    const raw   = Math.floor(((ASTRA_TRACE_YIELD[id] || {})[diff] || 0) / party);
    rows.push({ id, name: meta.name, diff, raw, cleared: !!sel.cleared });
    fullWeekly += raw;
    if (!sel.cleared) thisWeekly += raw;
  }

  const area     = ASTRA_DAILY_AREAS[astraState.areaIdx] || ASTRA_DAILY_AREAS[0];
  const perDay   = area.frag;
  const heldFrag = Math.max(0, astraState.heldFrag);
  const heldTrace= Math.max(0, astraState.heldTrace);
  const startD   = libLocalDate(astraState.startDate);
  const today    = new Date(); today.setHours(0,0,0,0);

  // 지금 낀 보조무기 다음 단계부터가 남은 퀘스트다
  const from = Math.min(Math.max(0, astraState.weaponIdx|0), ASTRA_QUESTS.length);
  const quests = [];
  let cumFrag = 0, cumTrace = 0;

  for (let i = from; i < ASTRA_QUESTS.length; i++) {
    const q = ASTRA_QUESTS[i];
    cumFrag  += q.frag;
    cumTrace += q.trace;

    const fragDays = astraFragDays(cumFrag - heldFrag, perDay);
    const fragDate = Number.isFinite(fragDays)
      ? (() => { const d = new Date(startD); d.setDate(startD.getDate() + fragDays); return d; })()
      : null;

    // 흔적은 데스티니와 완전히 같은 리셋 모델
    const traceRemain = Math.max(0, cumTrace - heldTrace);
    let traceDate = null, traceNever = false;
    if (traceRemain <= 0) {
      traceDate = new Date(startD);
    } else if (fullWeekly <= 0) {
      traceNever = true;
    } else {
      const resets = Math.max(0, Math.ceil((traceRemain - thisWeekly) / fullWeekly));
      const daysToReset = (4 - startD.getDay() + 7) % 7 || 7;
      traceDate = new Date(startD);
      if (resets > 0) traceDate.setDate(startD.getDate() + daysToReset + (resets - 1) * 7);
    }

    // 둘 다 채워야 하므로 늦은 쪽이 완료일
    let doneDate = null;
    if (!traceNever && fragDate) {
      doneDate = (traceDate && traceDate > fragDate) ? traceDate : fragDate;
    }

    const daysLeft = doneDate ? Math.round((doneDate - today) / 86400000) : null;
    // 날짜가 오늘이어도 이번 주 보스를 더 잡아야 채워지는 경우는 데스티니처럼 "이번 주 달성"으로 적는다
    const already = cumFrag <= heldFrag && traceRemain <= 0;
    quests.push({
      name: q.name, frag: q.frag, trace: q.trace, cumFrag, cumTrace,
      dateStr: doneDate
        ? `${doneDate.getFullYear()}년 ${String(doneDate.getMonth()+1).padStart(2,'0')}월 ${String(doneDate.getDate()).padStart(2,'0')}일`
        : '—',
      weeksStr: daysLeft === null ? '—' : already ? '이미 달성!' : (daysLeft <= 0 ? '이번 주 달성' : `${(daysLeft/7).toFixed(1)}주 · ${daysLeft}일`),
    });
  }

  return { rows, thisWeekly, fullWeekly, perDay, area, heldFrag, heldTrace, quests, allDone: from >= ASTRA_QUESTS.length };
}

function renderAstraResult() {
  const panel = document.getElementById('astraResultPanel');
  if (!panel) return;
  const r = calcAstraResult();

  if (r.allDone) {
    panel.innerHTML = `<p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">아스트라 2차까지 모두 완료했습니다.</p>`;
    return;
  }
  if (r.rows.length === 0) {
    panel.innerHTML = `<p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택하면 계산 결과가 표시됩니다.</p>`;
    return;
  }

  const bossRows = r.rows.map(row => `
    <div class="gen-res-row"${row.cleared ? ' style="opacity:.4"' : ''}>
      <span class="gen-res-name">${row.name} (${LIB_DIFF_LABEL[row.diff]||row.diff})</span>
      <b class="gen-res-val">${fmtAstra(row.raw)}/주</b>
    </div>`).join('');

  const questBlocks = r.quests.map(q => `
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px">
      <span style="font-weight:700">${q.name}</span>
      <b style="font-size:.78rem;color:var(--text-sub)">누적 조각 ${fmtAstra(q.cumFrag)} · 누적 흔적 ${fmtAstra(q.cumTrace)}</b>
    </div>
    <div class="gen-res-row gen-res-accent">
      <span>예상 기간</span><b>${q.weeksStr}</b>
    </div>
    <div class="gen-date-wrap">
      <div class="gen-date-label">${q.name} 예상 날짜</div>
      <div class="gen-date-big">${q.dateStr}</div>
    </div>`).join('');

  panel.innerHTML = `
    <div class="gen-res-section">${bossRows}</div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row gen-res-total"><span>주당 총 격전의 흔적</span><b>${fmtAstra(r.fullWeekly)}/주</b></div>
    <div class="gen-res-row"><span>하루 에리온의 조각 · ${r.area.name}</span><b>${fmtAstra(r.perDay)}/일</b></div>
    <div class="gen-res-row"><span>보유 에리온의 조각</span><b>${fmtAstra(r.heldFrag)}</b></div>
    <div class="gen-res-row"><span>보유 격전의 흔적</span><b>${fmtAstra(r.heldTrace)}</b></div>
    ${questBlocks}`;
}

function renderAstra() {
  const panel = document.getElementById('lib-astra');
  if (!panel) return;


  const bossCards = ASTRA_BOSS_META.map(meta => {
    const { id, name, maxParty, img } = meta;
    const yieldMap = ASTRA_TRACE_YIELD[id] || {};
    const sel    = astraState.sel[id] || {};
    const diff   = sel.diff || 'none';
    const party  = Math.max(1, sel.party || 1);
    const cleared = !!sel.cleared;
    const active = diff !== 'none';
    const yld    = active ? Math.floor((yieldMap[diff] || 0) / party) : 0;

    const diffOpts = ['none', ...Object.keys(yieldMap)].map(d =>
      `<option value="${d}" ${diff===d?'selected':''}>${d==='none'?'-':(LIB_DIFF_LABEL[d]||d)}</option>`
    ).join('');

    return `
      <div class="gen-boss ${active?'on':''}" data-id="${id}">
        <div class="boss-thumb"><img src="${img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <div class="gen-boss__body">
          <div class="gen-boss__top"><span class="gen-boss__name">${name}</span></div>
          <div class="gen-boss__row2">
            <select class="sel astra-boss__diff" data-id="${id}">${diffOpts}</select>
            <div class="party-stepper astra-boss__party" data-id="${id}">
              <button class="pm" ${party<=1?'disabled':''}>−</button>
              <span class="party-stepper__val">${party}</span>
              <button class="pp" ${party>=maxParty?'disabled':''}>+</button>
            </div>
          </div>
          <div class="gen-boss__row3">
            <label class="gen-boss__ck">
              <input type="checkbox" class="astra-boss__cb" data-id="${id}" ${cleared?'checked':''}/>
              <span>이번주 격파</span>
            </label>
            <span class="gen-boss__trace ${active?'on':''}">+${fmtAstra(yld)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  const weaponOpts = ASTRA_WEAPON_STAGES.map((s, i) =>
    `<option value="${i}" ${astraState.weaponIdx===i?'selected':''}>${s}</option>`).join('');
  const areaOpts = ASTRA_DAILY_AREAS.map((a, i) =>
    `<option value="${i}" ${astraState.areaIdx===i?'selected':''}>${a.name} · ${a.frag}</option>`).join('');

  panel.innerHTML = `
    <div class="gen-main-layout">
      <div class="gen-left">
        <div class="card gen-inputs">
          <div class="gen-input-row">
            <div class="field">
              <label class="field__label">시작 날짜</label>
              <input class="inp gen-inp" id="astraStartDate" type="date" value="${astraState.startDate || todayStr()}" />
            </div>
            <div class="field" style="flex:1.2">
              <label class="field__label">현재 보조무기</label>
              <select class="sel" id="astraWeapon">${weaponOpts}</select>
            </div>
          </div>
          <!-- 지역 이름·레벨·조각수가 다 들어가 제일 긴 항목이라 한 줄을 통째로 준다.
               셋을 한 줄에 두면 좁아질 때 라벨이 "일일 퀘스트 지 / 역"처럼 쪼개진다. -->
          <div class="gen-input-row" style="margin-top:10px">
            <div class="field" style="flex:1">
              <label class="field__label">일일 퀘스트 지역</label>
              <select class="sel" id="astraArea">${areaOpts}</select>
            </div>
          </div>
          <div class="gen-input-row" style="margin-top:12px;align-items:stretch">
            <div class="gen-cfg-card">
              <img class="gen-cfg-card__img" src="images/WANT/Etc_Vestige_of_Erion.png" alt="" onerror="this.style.display='none'">
              <div class="gen-cfg-card__body">
                <div class="gen-cfg-card__title">보유 에리온의 조각</div>
                <input class="inp" id="astraHeldFrag" type="number" min="0" value="${Math.max(0, astraState.heldFrag)}" />
              </div>
            </div>
            <div class="gen-cfg-card">
              <!-- 파일 이름을 그대로 두고 내용만 바꾸면 브라우저가 옛 그림을 계속 쓴다.
                   그림을 손볼 때마다 v를 올려야 바뀐 게 보인다. -->
              <img class="gen-cfg-card__img" src="images/icons/Traces_of_Fierce_Battle.png?v=2" alt="" onerror="this.style.display='none'">
              <div class="gen-cfg-card__body">
                <div class="gen-cfg-card__title">보유 격전의 흔적</div>
                <input class="inp" id="astraHeldTrace" type="number" min="0" value="${Math.max(0, astraState.heldTrace)}" />
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__title">주간 보스 설정</div>
          <div class="gen-bosses" id="astraBossGrid">${bossCards}</div>
        </div>

        <button class="sbtn sbtn--primary w100" id="astraCalcBtn" style="margin-top:4px;padding:14px;font-size:1rem;font-weight:700">계산하기</button>
      </div>

      <div class="card gen-stat-panel">
        <div class="card__title" style="margin-bottom:12px">계산 결과</div>
        <div id="astraResultPanel"><p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">보스를 선택 후 계산하기를 눌러주세요.</p></div>
      </div>
    </div>`;

  function updateAstraCard(id) {
    const card = panel.querySelector(`.gen-boss[data-id="${id}"]`);
    if (!card) return;
    const yieldMap = ASTRA_TRACE_YIELD[id] || {};
    const sel  = astraState.sel[id] || {};
    const diff = sel.diff || 'none';
    const party = Math.max(1, sel.party || 1);
    const active = diff !== 'none';
    const yld = active ? Math.floor((yieldMap[diff] || 0) / party) : 0;
    const meta = ASTRA_BOSS_META.find(b => b.id === id) || {};

    card.classList.toggle('on', active);
    const traceEl = card.querySelector('.gen-boss__trace');
    traceEl.textContent = `+${fmtAstra(yld)}`;
    traceEl.classList.toggle('on', active);
    card.querySelector('.pm').disabled = party <= 1;
    card.querySelector('.pp').disabled = party >= (meta.maxParty || 6);
    card.querySelector('.party-stepper__val').textContent = party;
  }

  const refreshAstraIfShown = () => {
    if (document.querySelector('#astraResultPanel .gen-date-big, #astraResultPanel .gen-res-row')) renderAstraResult();
  };

  document.getElementById('astraStartDate').addEventListener('change', e => {
    astraState.startDate = e.target.value || todayStr(); saveAstra(); refreshAstraIfShown();
  });
  document.getElementById('astraWeapon').addEventListener('change', e => {
    astraState.weaponIdx = parseInt(e.target.value) || 0; saveAstra(); refreshAstraIfShown();
  });
  document.getElementById('astraArea').addEventListener('change', e => {
    astraState.areaIdx = parseInt(e.target.value) || 0; saveAstra(); refreshAstraIfShown();
  });
  document.getElementById('astraHeldFrag').addEventListener('change', e => {
    const v = Math.max(0, parseInt(e.target.value) || 0);
    astraState.heldFrag = v; e.target.value = v; saveAstra(); refreshAstraIfShown();
  });
  document.getElementById('astraHeldTrace').addEventListener('change', e => {
    const v = Math.max(0, parseInt(e.target.value) || 0);
    astraState.heldTrace = v; e.target.value = v; saveAstra(); refreshAstraIfShown();
  });

  panel.querySelectorAll('.astra-boss__party').forEach(ps => {
    const id = ps.dataset.id;
    const meta = ASTRA_BOSS_META.find(b => b.id === id) || {};
    ps.querySelector('.pm').addEventListener('click', () => {
      const cur = astraState.sel[id] || {};
      if ((cur.party||1) > 1) {
        astraState.sel[id] = { ...cur, party:(cur.party||1)-1 };
        saveAstra(); updateAstraCard(id); refreshAstraIfShown();
      }
    });
    ps.querySelector('.pp').addEventListener('click', () => {
      const cur = astraState.sel[id] || {};
      if ((cur.party||1) < (meta.maxParty||6)) {
        astraState.sel[id] = { ...cur, party:(cur.party||1)+1 };
        saveAstra(); updateAstraCard(id); refreshAstraIfShown();
      }
    });
  });
  panel.querySelectorAll('.astra-boss__cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.id;
      astraState.sel[id] = { ...(astraState.sel[id]||{}), cleared: cb.checked };
      saveAstra(); refreshAstraIfShown();
    });
  });
  panel.querySelectorAll('.astra-boss__diff').forEach(s => {
    s.addEventListener('change', () => {
      const id = s.dataset.id;
      astraState.sel[id] = { ...(astraState.sel[id]||{}), diff: s.value };
      saveAstra(); updateAstraCard(id); refreshAstraIfShown();
    });
  });

  document.getElementById('astraCalcBtn').addEventListener('click', renderAstraResult);
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
renderAstra();
