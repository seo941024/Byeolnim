/* ═══════════════════════════════════════════════
   해방 계산기 — 세 계산기가 같이 쓰는 도우미
═══════════════════════════════════════════════ */
// todayStr()는 common.js에 있다.
/* 'YYYY-MM-DD'를 그 날짜의 로컬 자정으로 읽는다. new Date('YYYY-MM-DD')는 UTC 자정으로
   읽혀서, 아래의 getDay()·setDate() 로컬 계산과 섞이면 미국 시간대에서 하루가 밀린다. */
function libLocalDate(str) { return new Date((str || todayStr()) + 'T00:00:00'); }

/* 데스티니·아스트라 데이터는 난이도 키를 한글로 들고 있는데, 화면 표기는
   제네시스(DIFF_META)와 똑같이 영문으로 맞춘다. 키까지 바꾸면 이미 저장된
   사용자 선택이 전부 깨지므로 표시할 때만 바꾼다. */
const LIB_DIFF_LABEL = { 이지:'EASY', 노말:'NORMAL', 하드:'HARD', 카오스:'CHAOS', 익스트림:'EXTREME' };
const libKoDiffLabel = d => d === 'none' ? '-' : (LIB_DIFF_LABEL[d] || d);

/* startDate는 "오늘부터 시뮬레이션"의 기준점이라 저장된 옛날 값을 그대로 불러오면
   안 된다 — 그 사이 지난 리셋들을 하나도 안 지난 것처럼 계산해서 예상 해방일이
   완전히 틀어진다(예: 몇 달 전에 켜뒀던 값이 계속 남아있던 문제). 열 때마다 오늘로. */
function libLoadState(key, def) {
  try { Object.assign(def, JSON.parse(localStorage.getItem(key) || '{}')); } catch {}
  def.startDate = todayStr();
  return def;
}

function libFmt(n) { return Number(n).toLocaleString(); }
function libDateStr(d) {
  return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,'0')}월 ${String(d.getDate()).padStart(2,'0')}일`;
}
// 오늘 자정부터 d까지 일수
function libDaysLeft(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((d - today) / 86400000);
}
function libWeeksStr(days) { return `${(days/7).toFixed(1)}주 · ${days}일`; }
const libMsgHtml = msg => `<p style="color:var(--text-sub);font-size:.85rem;text-align:center;padding:24px 0">${msg}</p>`;

/* 주간 리셋은 로컬 목요일. 시작일에서 resets번째 리셋 날짜, 0이면 시작일 그대로.
   시작일이 목요일이면 다음 주 목요일부터 센다. */
function libResetDate(startD, resets) {
  const d = new Date(startD);
  if (resets > 0) d.setDate(startD.getDate() + ((4 - startD.getDay() + 7) % 7 || 7) + (resets - 1) * 7);
  return d;
}

/* ★ 수입 모델: 지금 이번 주에 아직 안 잡은 보스에서 thisWeekly를 한 번 더 벌 수 있고,
     그 뒤로는 리셋마다 fullWeekly씩 들어온다. 즉 N번째 리셋 시점의 누적은
     thisWeekly + N × fullWeekly 다.
   ★ 예전에는 리셋 수를 (1 + ceil(...))로 세고 날짜도 그만큼 뒤로 밀어서 결과가
     항상 정확히 1주 늦게 나왔다. N = ceil((remaining - thisWeekly) / fullWeekly)로
     세고, 날짜는 첫 리셋에서 (N-1)주 뒤가 맞다. */
function libResetsNeeded(remaining, thisWeekly, fullWeekly) {
  return Math.max(0, Math.ceil((remaining - thisWeekly) / fullWeekly));
}

/* ─── 보스 카드 — 세 계산기가 모양과 동작을 같이 쓴다 ───
   cfg  st 상태 · key 저장 키 · cls 카드 입력 클래스 앞부분 · resultId 결과 칸 id
        bosses [{ id, name, img, maxParty }] · yields 보스별 { 난이도: 획득량 }
        mult() 획득 배율 · diffLabel(d) 난이도 표기 · ckLabel(id) 격파 체크 글자 · render() 결과 그리기 */
function libSave(cfg) { localStorage.setItem(cfg.key, JSON.stringify(cfg.st)); }

// 결과가 이미 계산돼 있으면(계산하기를 한 번이라도 눌렀으면) 변경 즉시 재계산
function libRefresh(cfg) {
  const p = '#' + cfg.resultId;
  if (document.querySelector(`${p} .gen-date-big, ${p} .gen-res-row`)) cfg.render();
}

/* 보스의 최대 파티 인원. 숫자 하나이거나 난이도별 묶음(스우 익스트림 2인 등)이다 */
function libMaxParty(b, diff) {
  return typeof b.maxParty === 'object' ? (b.maxParty[diff] ?? 6) : b.maxParty;
}

function libYield(cfg, id) {
  const sel  = cfg.st.sel[id] || {};
  const diff = sel.diff || 'none';
  if (diff === 'none') return 0;
  return Math.floor(((cfg.yields[id] || {})[diff] || 0) * cfg.mult() / Math.max(1, sel.party || 1));
}

// 고른 보스마다 한 줄
function libBossRows(cfg) {
  return cfg.bosses.filter(b => ((cfg.st.sel[b.id] || {}).diff || 'none') !== 'none').map(b => {
    const sel = cfg.st.sel[b.id];
    return { id: b.id, name: b.name, diff: sel.diff, raw: libYield(cfg, b.id), cleared: !!sel.cleared };
  });
}
// full: 다음 주부터 매주 들어오는 양(격파 포함) · left: 이번 주에 아직 남은 양(격파 제외)
function libTotals(rows) {
  let full = 0, left = 0;
  rows.forEach(r => { full += r.raw; if (!r.cleared) left += r.raw; });
  return { full, left };
}

function libResRowHtml(cfg, row, unit) {
  return `<div class="gen-res-row"${row.cleared ? ' style="opacity:.4"' : ''}>
      <span class="gen-res-name">${row.name} (${cfg.diffLabel(row.diff)})</span>
      <b class="gen-res-val">${libFmt(row.raw)}${unit}</b>
    </div>`;
}

function libBossCardHtml(cfg, b) {
  const sel    = cfg.st.sel[b.id] || {};
  const diff   = sel.diff || 'none';
  const party  = Math.max(1, sel.party || 1);
  const active = diff !== 'none';
  const diffOpts = ['none', ...Object.keys(cfg.yields[b.id] || {})].map(d =>
    `<option value="${d}" ${diff===d?'selected':''}>${cfg.diffLabel(d)}</option>`
  ).join('');
  const name = `<span class="gen-boss__name">${b.name}</span>`;
  return `
      <div class="gen-boss ${active?'on':''}" data-id="${b.id}">
        <div class="boss-thumb"><img src="${b.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span></div>
        <div class="gen-boss__body">
          <div class="gen-boss__top">${cfg.topNl ? `\n            ${name}\n          ` : name}</div>
          <div class="gen-boss__row2">
            <select class="sel ${cfg.cls}__diff" data-id="${b.id}">${diffOpts}</select>
            <div class="party-stepper ${cfg.cls}__party" data-id="${b.id}">
              <button class="pm" ${party<=1?'disabled':''}>−</button>
              <span class="party-stepper__val">${party}</span>
              <button class="pp" ${party>=libMaxParty(b, diff)?'disabled':''}>+</button>
            </div>
          </div>
          <div class="gen-boss__row3">
            <label class="gen-boss__ck">
              <input type="checkbox" class="${cfg.cls}__cb" data-id="${b.id}" ${sel.cleared?'checked':''}/>
              <span>${cfg.ckLabel(b.id)}</span>
            </label>
            <span class="gen-boss__trace ${active?'on':''}">+${libFmt(libYield(cfg, b.id))}</span>
          </div>
        </div>
      </div>`;
}

/* 보스 카드 부분 업데이트 (전체 재렌더 없이) */
function libUpdateCard(cfg, panel, b) {
  const card = panel.querySelector(`.gen-boss[data-id="${b.id}"]`);
  if (!card) return;
  const sel    = cfg.st.sel[b.id] || {};
  const party  = Math.max(1, sel.party || 1);
  const active = (sel.diff || 'none') !== 'none';
  card.classList.toggle('on', active);
  const traceEl = card.querySelector('.gen-boss__trace');
  traceEl.textContent = `+${libFmt(libYield(cfg, b.id))}`;
  traceEl.classList.toggle('on', active);
  card.querySelector('.pm').disabled = party <= 1;
  card.querySelector('.pp').disabled = party >= libMaxParty(b, sel.diff || 'none');
  card.querySelector('.party-stepper__val').textContent = party;
}

function libBindBossCards(cfg, panel) {
  const set = (b, patch, updateCard) => {
    cfg.st.sel[b.id] = { ...(cfg.st.sel[b.id] || {}), ...patch };
    libSave(cfg);
    if (updateCard) libUpdateCard(cfg, panel, b);
    libRefresh(cfg);
  };
  const bossOf = el => cfg.bosses.find(b => b.id === el.dataset.id);
  panel.querySelectorAll(`.${cfg.cls}__party`).forEach(ps => {
    const b = bossOf(ps);
    const party = () => (cfg.st.sel[b.id] || {}).party || 1;
    ps.querySelector('.pm').addEventListener('click', () => { if (party() > 1) set(b, { party: party() - 1 }, true); });
    ps.querySelector('.pp').addEventListener('click', () => {
      if (party() < libMaxParty(b, (cfg.st.sel[b.id] || {}).diff || 'none')) set(b, { party: party() + 1 }, true);
    });
  });
  panel.querySelectorAll(`.${cfg.cls}__cb`).forEach(cb => {
    cb.addEventListener('change', () => set(bossOf(cb), { cleared: cb.checked }, false));
  });
  panel.querySelectorAll(`.${cfg.cls}__diff`).forEach(s => {
    // 난이도를 바꿔 최대 인원이 줄면 인원도 거기 맞춘다(하드 6인 → 익스트림 2인)
    s.addEventListener('change', () => {
      const b = bossOf(s), max = libMaxParty(b, s.value);
      const party = (cfg.st.sel[b.id] || {}).party || 1;
      set(b, party > max ? { diff: s.value, party: max } : { diff: s.value }, true);
    });
  });
}

/* 입력은 자유롭게, 바깥 클릭(blur)/Enter 때만 반영·저장 */
function libOnChange(cfg, elId, apply) {
  document.getElementById(elId).addEventListener('change', e => { apply(e.target); libSave(cfg); libRefresh(cfg); });
}
// 보유량은 0~max로 잘라서 칸에도 되돌려 적는다
function libHeld(el, max = Infinity) {
  const v = Math.max(0, Math.min(max, parseInt(el.value) || 0));
  el.value = v;
  return v;
}

/* ═══════════════════════════════════════════════
   해방 계산기 — 제네시스 (어둠의 흔적)
═══════════════════════════════════════════════ */
const genState = libLoadState(STORAGE_KEYS.genesis, { quest:0, held:0, pass:false, sel:{}, startDate: todayStr() });
// 더스크 난이도 키를 hard → chaos로 고쳤으므로, 예전에 hard로 저장된 선택을 옮겨준다.
// 안 하면 TRACE_YIELD에 없는 키라 획득량이 0으로 잡힌다.
if (genState.sel && genState.sel.dusk && genState.sel.dusk.diff === 'hard') genState.sel.dusk = { ...genState.sel.dusk, diff: 'chaos' };

const genMonthly = id => id === 'blackmage';   // 검은 마법사만 월간 보스
const GEN = {
  st: genState, key: STORAGE_KEYS.genesis, cls: 'gen-boss', resultId: 'genResultPanel',
  topNl: true,   // 제네시스 카드만 이름 줄 앞뒤에 줄바꿈이 들어간다 — innerHTML을 그대로 두려고 맞춤
  bosses: Object.keys(TRACE_YIELD).map(id => {
    const b = BOSS_DATA.find(x => x.id === id) || { name:id, img:'' };
    return { id, name: b.name, img: b.img, maxParty: b.maxParty ?? 6 };   // 보스 수익 계산기와 같은 난이도별 최대 인원
  }),
  yields: TRACE_YIELD,
  mult: () => genState.pass ? GENESIS_PASS_MULT : 1,
  diffLabel: d => DIFF_META[d]?.label || d,
  ckLabel: id => genMonthly(id) ? '금월 격파' : '이번주',
  render: renderResult,
};
// 예전에는 제네시스만 모든 보스를 6인까지 받았다 — 저장된 인원이 그 난이도 최대보다 크면 최대로 맞춘다
GEN.bosses.forEach(b => {
  const sel = genState.sel && genState.sel[b.id];
  if (sel && sel.party > libMaxParty(b, sel.diff || 'none')) sel.party = libMaxParty(b, sel.diff || 'none');
});

/* ─── 계산 로직 ─── */
function calcResult() {
  const rows  = libBossRows(GEN);
  const week  = libTotals(rows.filter(r => !genMonthly(r.id)));
  const month = libTotals(rows.filter(r => genMonthly(r.id)));

  const totalSpent = (GENESIS_QUESTS[genState.quest] || GENESIS_QUESTS[0]).cum + Math.max(0, genState.held);
  const remaining  = Math.max(0, GENESIS_TARGET - totalSpent);
  const pct        = Math.min(100, Math.round(totalSpent / GENESIS_TARGET * 100));

  let weeksStr = '—', targetDateStr = '—';

  if (remaining <= 0) {
    weeksStr = libWeeksStr(0);
    targetDateStr = '이미 달성!';
  } else if (week.full > 0 || month.full > 0) {
    const startD = libLocalDate(genState.startDate);

    /* ★ 예전에는 월간(검은 마법사)을 fullMonthly/4로 주당 환산하고, 리셋 횟수도
       (1 + ceil(...))로 한 번 더 세서 결과가 항상 1주 늦고 월간분도 어긋났다.
       이제는 실제 리셋 시점을 그대로 시뮬레이션한다:
       · 지금 이번 주에 아직 안 잡은 보스에서 한 번
       · 주간 보스는 목요일 리셋마다 week.full
       · 검은 마법사는 매월 1일 리셋이라 그날 month.full
       ★ 월간을 "목요일 리셋이 달을 넘을 때"로 묶으면 안 된다 — 1일이 화요일이면
         실제로는 그날 바로 들어오는데 그 주 목요일까지 밀려 결과가 어긋난다
         (패스 켠 조건에서 실제로 이틀 차이가 났다). 그래서 두 리셋을 각각
         독립된 이벤트로 두고 시간순으로 처리한다. */
    let acc = week.left + month.left;
    let libDate = null;

    if (acc >= remaining) {
      libDate = new Date(startD);           // 이번 주 안에 달성
    } else {
      const nextThu = libResetDate(startD, 1);
      const nextMonth = new Date(startD.getFullYear(), startD.getMonth() + 1, 1);

      for (let i = 0; i < 52 * 30; i++) {   // 30년이면 사실상 무한 방지용
        const t = nextThu.getTime(), m = nextMonth.getTime();
        const when = Math.min(t, m);        // 더 이른 리셋부터, 같은 날이면 둘 다
        if (t === when) acc += week.full;
        if (m === when) acc += month.full;

        if (acc >= remaining) { libDate = new Date(when); break; }

        if (t === when) nextThu.setDate(nextThu.getDate() + 7);
        if (m === when) nextMonth.setMonth(nextMonth.getMonth() + 1);
      }
    }

    if (libDate) {
      weeksStr = libWeeksStr(libDaysLeft(libDate));
      targetDateStr = libDateStr(libDate);
    }
  }

  return { rows, fullWeekly: week.full, fullMonthly: month.full, totalSpent, pct, weeksStr, targetDateStr };
}

/* ─── 결과 패널 렌더링 ─── */
function renderResult() {
  const panel = document.getElementById('genResultPanel');
  if (!panel) return;
  const r = calcResult();

  if (r.rows.length === 0) {
    panel.innerHTML = libMsgHtml('보스를 선택하면 계산 결과가 표시됩니다.');
    return;
  }

  const bossRows = r.rows.map(row => libResRowHtml(GEN, row, genMonthly(row.id) ? '/월' : '/주')).join('');
  const weeklyLine = r.fullWeekly > 0 ? `${libFmt(r.fullWeekly)}/주` : '';
  const monthlyLine = r.fullMonthly > 0 ? `+ ${libFmt(r.fullMonthly)}/월` : '';

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
      <b>${libFmt(r.totalSpent)} / ${libFmt(GENESIS_TARGET)}</b>
    </div>
    <div class="gen-res-divider"></div>
    <div class="lib-progress" style="margin:8px 0 4px"><div class="lib-progress__fill" style="width:${r.pct}%"></div></div>
    <div class="lib-pct" style="margin-bottom:12px">${r.pct}% · ${libFmt(r.totalSpent)} / ${libFmt(GENESIS_TARGET)}</div>
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
    `<option value="${i}" ${i===genState.quest?'selected':''}>${qq.name} (${libFmt(qq.need)})</option>`
  ).join('');
  const bossCards = GEN.bosses.map(b => libBossCardHtml(GEN, b)).join('');
  const held = Math.max(0, genState.held);

  panel.innerHTML = `
    <div class="gen-main-layout">
      <!-- 좌측: 설정 + 보스 목록 -->
      <div class="gen-left">
        <div class="card gen-inputs">
          <div class="gen-input-row">
            <div class="field">
              <label class="field__label">시작 날짜</label>
              <input class="inp gen-inp" id="genStartDate" type="date" value="${genState.startDate}" />
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
        <div id="genResultPanel">${libMsgHtml('보스를 선택 후 계산하기를 눌러주세요.')}</div>
      </div>
    </div>`;

  libOnChange(GEN, 'genHeld', el => { genState.held = libHeld(el, TRACE_HOLD_MAX); });
  libOnChange(GEN, 'genPass', el => {
    genState.pass = el.checked;
    // 패스 ON/OFF: 흔적량만 업데이트
    const lbl = document.querySelector('.gen-switch__label');
    if (lbl) lbl.textContent = genState.pass ? 'ON' : 'OFF';
    const passCard = document.querySelector('.gen-cfg-card--pass');
    if (passCard) passCard.classList.toggle('on', genState.pass);
    GEN.bosses.forEach(b => libUpdateCard(GEN, panel, b));
  });
  libOnChange(GEN, 'genStartDate', el => { genState.startDate = el.value || todayStr(); });
  libOnChange(GEN, 'genQuestSel', el => { genState.quest = parseInt(el.value); });
  libBindBossCards(GEN, panel);
  document.getElementById('genCalcBtn').addEventListener('click', renderResult);
}

/* ═══════════════════════════════════════════════
   해방 계산기 — 데스티니 (결의)
═══════════════════════════════════════════════ */
const destState = libLoadState(STORAGE_KEYS.destiny, { heldResolve: 0, sel: {}, startDate: todayStr(), questIdx: 0 });
const DEST = {
  st: destState, key: STORAGE_KEYS.destiny, cls: 'dest-boss', resultId: 'destResultPanel',
  bosses: DESTINY_BOSS_META, yields: DESTINY_RESOLVE_YIELD, mult: () => 1,
  diffLabel: libKoDiffLabel, ckLabel: () => '이번주 격파', render: renderDestinyResult,
};
const destQuestIdx = () => Math.min(Math.max(0, destState.questIdx|0), DESTINY_QUESTS.length - 1);

/* 주간 리셋(목요일) 기준 달성 예정일. 수입 모델은 libResetsNeeded 참고 */
function libTargetDate(remaining, thisWeekly, fullWeekly, startDateStr) {
  if (remaining <= 0) return { weeksStr: '이미 달성!', dateStr: '이미 달성!' };
  if (fullWeekly <= 0) return { weeksStr: '—', dateStr: '—' };

  const resets = libResetsNeeded(remaining, thisWeekly, fullWeekly);
  if (resets === 0) return { weeksStr: '이번 주 달성', dateStr: '이번 주 안에 달성' };

  const libDate = libResetDate(libLocalDate(startDateStr), resets);
  return { weeksStr: libWeeksStr(libDaysLeft(libDate)), dateStr: libDateStr(libDate) };
}

function calcDestinyResult() {
  const rows = libBossRows(DEST);
  const { full: fullWeekly, left: thisWeekly } = libTotals(rows);

  const held = Math.max(0, destState.heldResolve);
  // 지금 진행 중인 결전 퀘스트 이전 것들은 이미 깬 것이므로 그만큼 목표에서 뺀다
  const qi      = destQuestIdx();
  const quest   = DESTINY_QUESTS[qi];
  const doneCum = qi > 0 ? DESTINY_QUESTS[qi - 1].cum : 0;
  const have    = doneCum + held;

  const r1 = libTargetDate(Math.max(0, DESTINY_1ST_TARGET - have), thisWeekly, fullWeekly, destState.startDate);
  const r2 = libTargetDate(Math.max(0, DESTINY_2ND_TARGET - have), thisWeekly, fullWeekly, destState.startDate);
  const pct1 = Math.min(100, Math.round(have / DESTINY_1ST_TARGET * 100));
  const pct2 = Math.min(100, Math.round(have / DESTINY_2ND_TARGET * 100));

  return { rows, fullWeekly, held, quest, doneCum, have, pct1, pct2, r1, r2 };
}

function renderDestinyResult() {
  const panel = document.getElementById('destResultPanel');
  if (!panel) return;
  const r = calcDestinyResult();

  if (r.rows.length === 0) {
    panel.innerHTML = libMsgHtml('보스를 선택하면 계산 결과가 표시됩니다.');
    return;
  }

  const bossRows = r.rows.map(row => libResRowHtml(DEST, row, '/주')).join('');

  panel.innerHTML = `
    <div class="gen-res-section">${bossRows}</div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row gen-res-total">
      <span>주당 총 결의</span>
      <b>${libFmt(r.fullWeekly)}/주</b>
    </div>
    <div class="gen-res-row">
      <span>현재 보유 결의</span>
      <b>${libFmt(r.held)}</b>
    </div>
    <div class="gen-res-row">
      <span>진행 중 · ${r.quest.name}</span>
      <b>${libFmt(r.quest.need)}</b>
    </div>
    ${r.doneCum > 0 ? `<div class="gen-res-row">
      <span>앞선 퀘스트로 완료</span>
      <b>${libFmt(r.doneCum)}</b>
    </div>` : ''}
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px"><span style="font-weight:700">1차 해방 · 누적 ${libFmt(DESTINY_1ST_TARGET)} 결의</span></div>
    <div class="lib-progress" style="margin:4px 0"><div class="lib-progress__fill" style="width:${r.pct1}%"></div></div>
    <div class="lib-pct" style="margin-bottom:4px">${r.pct1}% · ${libFmt(r.have)} / ${libFmt(DESTINY_1ST_TARGET)}</div>
    <div class="gen-res-row gen-res-accent">
      <span>1차 예상 기간</span><b>${r.r1.weeksStr}</b>
    </div>
    <div class="gen-date-wrap">
      <div class="gen-date-label">1차 해방 예상 날짜</div>
      <div class="gen-date-big">${r.r1.dateStr}</div>
    </div>
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px"><span style="font-weight:700">2차 해방 · 누적 ${libFmt(DESTINY_2ND_TARGET)} 결의</span></div>
    <div class="lib-progress" style="margin:4px 0"><div class="lib-progress__fill" style="width:${r.pct2}%"></div></div>
    <div class="lib-pct" style="margin-bottom:4px">${r.pct2}% · ${libFmt(r.have)} / ${libFmt(DESTINY_2ND_TARGET)}</div>
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

  const bossCards = DEST.bosses.map(b => libBossCardHtml(DEST, b)).join('');
  const held      = Math.max(0, destState.heldResolve);
  // 결전 퀘스트는 1차/2차 초월로 묶여 있으므로 optgroup으로 나눠 보여준다
  const curQuest  = destQuestIdx();
  const questOpts = [1, 2].map(stage => {
    const inner = DESTINY_QUESTS
      .map((q, i) => ({ q, i }))
      .filter(x => x.q.stage === stage)
      .map(({ q, i }) => `<option value="${i}" ${curQuest===i?'selected':''}>${q.name} (${libFmt(q.need)})</option>`)
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
              <input class="inp gen-inp" id="destStartDate" type="date" value="${destState.startDate}" />
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
        <div id="destResultPanel">${libMsgHtml('보스를 선택 후 계산하기를 눌러주세요.')}</div>
      </div>
    </div>`;

  libOnChange(DEST, 'destHeld', el => { destState.heldResolve = libHeld(el, DESTINY_RESOLVE_MAX); });
  libOnChange(DEST, 'destStartDate', el => { destState.startDate = el.value || todayStr(); });
  libOnChange(DEST, 'destQuest', el => { destState.questIdx = parseInt(el.value) || 0; });
  libBindBossCards(DEST, panel);
  document.getElementById('destCalcBtn').addEventListener('click', renderDestinyResult);
}

/* ═══════════════════════════════════════════════
   해방 계산기 — 아스트라 보조무기 (조각 + 흔적)

   데스티니와 달리 재화가 둘이다:
   · 조각 — 일일 퀘스트로 매일 받는다(지역이 높을수록 많다)
   · 흔적 — 주간 보스로 받는다(리셋 기준)
   퀘스트는 조각과 흔적을 둘 다 요구하므로, 완료일은 둘 중 늦은 쪽이 결정한다.
═══════════════════════════════════════════════ */
const astraState = libLoadState(STORAGE_KEYS.astra, { startDate: todayStr(), weaponIdx: 0, areaIdx: 0, heldFrag: 0, heldTrace: 0, sel: {} });
const ASTRA = {
  st: astraState, key: STORAGE_KEYS.astra, cls: 'astra-boss', resultId: 'astraResultPanel',
  bosses: ASTRA_BOSS_META, yields: ASTRA_TRACE_YIELD, mult: () => 1,
  diffLabel: libKoDiffLabel, ckLabel: () => '이번주 격파', render: renderAstraResult,
};

/* 조각은 매일 들어오므로 리셋과 무관하게 그냥 나눗셈이다.
   N일 뒤 보유량 = 시작 보유 + N × 하루치 → 필요량을 넘는 첫 N을 찾는다. */
function astraFragDays(remaining, perDay) {
  if (remaining <= 0) return 0;
  if (perDay <= 0) return Infinity;
  return Math.ceil(remaining / perDay);
}

function calcAstraResult() {
  const rows = libBossRows(ASTRA);
  const { full: fullWeekly, left: thisWeekly } = libTotals(rows);

  const area     = ASTRA_DAILY_AREAS[astraState.areaIdx] || ASTRA_DAILY_AREAS[0];
  const perDay   = area.frag;
  const heldFrag = Math.max(0, astraState.heldFrag);
  const heldTrace= Math.max(0, astraState.heldTrace);
  const startD   = libLocalDate(astraState.startDate);

  // 지금 낀 보조무기 다음 단계부터가 남은 퀘스트다
  const from = Math.min(Math.max(0, astraState.weaponIdx|0), ASTRA_QUESTS.length);
  const quests = [];
  let cumFrag = 0, cumTrace = 0;

  for (let i = from; i < ASTRA_QUESTS.length; i++) {
    const q = ASTRA_QUESTS[i];
    cumFrag  += q.frag;
    cumTrace += q.trace;

    const fragDays = astraFragDays(cumFrag - heldFrag, perDay);
    let fragDate = null;
    if (Number.isFinite(fragDays)) { fragDate = new Date(startD); fragDate.setDate(startD.getDate() + fragDays); }

    // 흔적은 데스티니와 완전히 같은 리셋 모델. 보스를 하나도 안 고르면 영영 못 채운다(null)
    const traceRemain = Math.max(0, cumTrace - heldTrace);
    const traceDate = traceRemain <= 0 ? new Date(startD)
      : fullWeekly <= 0 ? null
      : libResetDate(startD, libResetsNeeded(traceRemain, thisWeekly, fullWeekly));

    // 둘 다 채워야 하므로 늦은 쪽이 완료일
    const doneDate = traceDate && fragDate ? (traceDate > fragDate ? traceDate : fragDate) : null;

    const daysLeft = doneDate ? libDaysLeft(doneDate) : null;
    // 날짜가 오늘이어도 이번 주 보스를 더 잡아야 채워지는 경우는 데스티니처럼 "이번 주 달성"으로 적는다
    const already = cumFrag <= heldFrag && traceRemain <= 0;
    quests.push({
      name: q.name, cumFrag, cumTrace,
      dateStr: doneDate ? libDateStr(doneDate) : '—',
      weeksStr: daysLeft === null ? '—' : already ? '이미 달성!' : (daysLeft <= 0 ? '이번 주 달성' : libWeeksStr(daysLeft)),
    });
  }

  return { rows, fullWeekly, perDay, area, heldFrag, heldTrace, quests, allDone: from >= ASTRA_QUESTS.length };
}

function renderAstraResult() {
  const panel = document.getElementById('astraResultPanel');
  if (!panel) return;
  const r = calcAstraResult();

  if (r.allDone) {
    panel.innerHTML = libMsgHtml('아스트라 3차 해방까지 모두 완료했습니다.');
    return;
  }
  if (r.rows.length === 0) {
    panel.innerHTML = libMsgHtml('보스를 선택하면 계산 결과가 표시됩니다.');
    return;
  }

  const bossRows = r.rows.map(row => `
    ${libResRowHtml(ASTRA, row, '/주')}`).join('');

  const questBlocks = r.quests.map(q => `
    <div class="gen-res-divider"></div>
    <div class="gen-res-row" style="margin-bottom:4px">
      <span style="font-weight:700">${q.name}</span>
      <b style="font-size:.78rem;color:var(--text-sub)">누적 조각 ${libFmt(q.cumFrag)} · 누적 흔적 ${libFmt(q.cumTrace)}</b>
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
    <div class="gen-res-row gen-res-total"><span>주당 총 격전의 흔적</span><b>${libFmt(r.fullWeekly)}/주</b></div>
    <div class="gen-res-row"><span>하루 에리온의 조각 · ${r.area.name}</span><b>${libFmt(r.perDay)}/일</b></div>
    <div class="gen-res-row"><span>보유 에리온의 조각</span><b>${libFmt(r.heldFrag)}</b></div>
    <div class="gen-res-row"><span>보유 격전의 흔적</span><b>${libFmt(r.heldTrace)}</b></div>
    ${questBlocks}`;
}

function renderAstra() {
  const panel = document.getElementById('lib-astra');
  if (!panel) return;

  const bossCards = ASTRA.bosses.map(b => libBossCardHtml(ASTRA, b)).join('');
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
              <input class="inp gen-inp" id="astraStartDate" type="date" value="${astraState.startDate}" />
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
        <div id="astraResultPanel">${libMsgHtml('보스를 선택 후 계산하기를 눌러주세요.')}</div>
      </div>
    </div>`;

  libOnChange(ASTRA, 'astraStartDate', el => { astraState.startDate = el.value || todayStr(); });
  libOnChange(ASTRA, 'astraWeapon', el => { astraState.weaponIdx = parseInt(el.value) || 0; });
  libOnChange(ASTRA, 'astraArea', el => { astraState.areaIdx = parseInt(el.value) || 0; });
  libOnChange(ASTRA, 'astraHeldFrag', el => { astraState.heldFrag = libHeld(el); });
  libOnChange(ASTRA, 'astraHeldTrace', el => { astraState.heldTrace = libHeld(el); });
  libBindBossCards(ASTRA, panel);
  document.getElementById('astraCalcBtn').addEventListener('click', renderAstraResult);
}

// 탭 전환
const libTabs = document.querySelectorAll('.lib-tab');
libTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    setActive(libTabs, tab);
    setActive(document.querySelectorAll('.lib-panel'), document.getElementById('lib-' + tab.dataset.lib));
  });
});

renderGenesis();
renderDestiny();
renderAstra();
