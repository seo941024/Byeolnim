/* =============================================
   character.js — 캐릭터
   추가·수정 창과 랭킹 조회, 경험치 히스토리, 캐릭터 목록 화면, 카드 이미지 저장.
   app.js·settings.js 뒤에 읽힌다. 끝에서 캐릭터 목록 화면을 처음 그리고 오래된 캐릭터를 다시 조회한다.
   ============================================= */

/* ── 캐릭터 모달 ── */
let editIdx = -1, selectedJob = 0, fetchedInfo = null, selectedCardBg = null;

function openCharModal(idx = -1) {
  const ch = idx >= 0 ? state.chars[idx] : null;
  editIdx = idx;
  selectedJob = ch ? ch.jobIdx : 0;
  fetchedInfo = ch?.fetched ? { ...ch.fetched } : null;
  selectedCardBg = ch ? (ch.cardBg || null) : null;
  document.getElementById('modalCharTitle').textContent = ch ? '캐릭터 수정' : '캐릭터 추가';
  document.getElementById('inpName').value  = ch ? ch.name  : '';
  document.getElementById('inpLevel').value = ch ? ch.level : '';
  document.getElementById('inpWorld').value = ch?.fetched?.world || '';
  document.getElementById('inpJobSearch').value = '';
  document.getElementById('lkName').value = ch ? ch.name : '';
  document.getElementById('lkResult').innerHTML = '';
  renderJobGrid('');   // 직접 입력용 직업 그리드
  renderCardBgGrid();
  document.getElementById('overlayChar').classList.add('open');
}

/* ── 카드 배경 선택 그리드 ──
   images/bg/bg{0..CARD_BG_COUNT-1}에 png 또는 webp로 넣어두면 뜨는 방식.
   파일이 아직 없는 번호는 두 확장자 다 실패하니 타일 자체를 숨긴다 —
   그래서 나중에 이미지만 채워 넣으면 코드를 안 건드려도 그 번호가 나타난다. */
function renderCardBgGrid() {
  const grid = document.getElementById('cardBgGrid');
  if (!grid) return;
  const tiles = [`<button type="button" class="cardbg-opt cardbg-opt--none${selectedCardBg ? '' : ' sel'}" data-bg="">없음</button>`];
  for (let i = 0; i < CARD_BG_COUNT; i++) {
    const bgId = 'bg' + i;
    const [primary, fallback] = cardBgCandidates(i);
    tiles.push(`
      <button type="button" class="cardbg-opt${selectedCardBg === bgId ? ' sel' : ''}" data-bg="${bgId}">
        <img src="${primary}" data-fallback="${fallback}"
             onerror="if(!this.dataset.tried){this.dataset.tried='1';this.src=this.dataset.fallback;}else{this.closest('.cardbg-opt').remove();}">
      </button>`);
  }
  grid.innerHTML = tiles.join('');
  grid.querySelectorAll('.cardbg-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCardBg = btn.dataset.bg || null;
      grid.querySelectorAll('.cardbg-opt').forEach(b => b.classList.toggle('sel', b === btn));
    });
  });
}

/* ── GMS 랭킹 조회 + 히스토리 ──
   랭킹 API는 '현재 상태'만 제공하므로, 조회할 때마다 스냅샷
   (날짜·레벨·경험치·캐릭터이미지)을 로컬에 누적해 히스토리를 만든다. */
const HIST_KEY = STORAGE_KEYS.charHistory;
function loadHist() { try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}'); } catch { return {}; } }
function saveHist(h) { localStorage.setItem(HIST_KEY, JSON.stringify(h)); }
function histKeyOf(d) { return `${(d.region||'NA').toLowerCase()}_${d.reboot?'r':'n'}_${(d.name||'').toLowerCase()}`; }

/* 조회 결과를 히스토리에 기록. 같은 날 중복은 최신값으로 갱신. */
function recordSnapshot(d) {
  const h = loadHist();
  const key = histKeyOf(d);
  const arr = h[key] || [];
  const snap = { date: todayStr(), ts: Date.now(), level: d.level, exp: Number(d.exp)||0, img: d.img || '', job: d.job || '' };
  const last = arr[arr.length - 1];
  if (last && last.date === snap.date) arr[arr.length - 1] = snap;   // 같은 날 → 갱신
  else if (!last || last.exp !== snap.exp || last.img !== snap.img || last.level !== snap.level) arr.push(snap);
  h[key] = arr.slice(-60);   // 최근 60개만 보관
  saveHist(h);
  return h[key];
}

/* 히스토리 HTML (경험치 변화) */
function renderHistHtml(d) {
  const arr = (loadHist()[histKeyOf(d)] || []).slice().reverse();   // 최신순
  if (arr.length <= 1) return '';
  const expRows = arr.map((s, i) => {
    const prev = arr[i + 1];
    let delta = '';
    if (prev) {
      const diffLv = s.level - prev.level;
      const diffExp = s.exp - prev.exp;
      const parts = [];
      if (diffLv) parts.push(`<span class="hist-up">▲${diffLv}레벨</span>`);
      // 랭킹 exp는 현재 레벨 안에서의 양이라, 레벨이 오른 날은 차이가 음수가 된다 — 그날은 레벨만 보인다
      if (diffExp && !diffLv) parts.push(`<span class="${diffExp>0?'hist-up':'hist-dn'}">${diffExp>0?'+':''}${Number(diffExp).toLocaleString()} EXP</span>`);
      delta = parts.join(' ');
    }
    return `<div class="hist-row">
      <span class="hist-date">${s.date}</span>
      <span class="hist-lv">Lv.${s.level}</span>
      <span class="hist-delta">${delta || '<span class="hp-dim">기준</span>'}</span>
    </div>`;
  }).join('');
  return `
    <div class="hist-sec"><div class="hist-title">경험치 / 레벨 히스토리</div>${expRows}</div>
    `;
}
document.getElementById('lkBtn').addEventListener('click', async () => {
  const name   = document.getElementById('lkName').value.trim();
  const box    = document.getElementById('lkResult');
  if (!name) { box.innerHTML = '<span class="lk-err">캐릭터명을 입력하세요.</span>'; return; }
  box.innerHTML = '<span class="lk-load">조회 중...</span>';
  try {
    // Heroic/일반 구분 없이 이름으로 검색되므로 reboot는 늘 0
    const r = await fetch(`/api/lookup?name=${encodeURIComponent(name)}&reboot=0&region=${state.region}`);
    const j = await r.json();
    if (!j.ok) { box.innerHTML = `<span class="lk-err">${escHtml(j.error)}</span>`; return; }
    // 레벨 200 이상만 조회해 등록한다. 랭킹에는 200 미만도 나오지만 보스 계산 대상이 아니다
    if ((parseInt(j.data.level) || 0) < 200) {
      box.innerHTML = '<span class="lk-err">캐릭터의 레벨이 200 미만입니다. 레벨 200 이상 캐릭터만 조회할 수 있습니다.</span>';
      return;
    }
    j.data.job = canonJobName(j.data.job);  // 약칭 → 정식 이름
    fetchedInfo = j.data;
    recordSnapshot(j.data);                 // 조회 시점 스냅샷 누적
    // 입력란 자동 채우기
    document.getElementById('inpName').value  = j.data.name;
    document.getElementById('inpLevel').value = j.data.level;
    // 직업 자동 선택
    const ji = jobIdxFromName(j.data.job);
    if (ji >= 0) selectedJob = ji;
    box.innerHTML = `
      <div class="lk-card">
        ${j.data.img ? `<img class="lk-card__av" src="${j.data.img}" onerror="this.style.display='none'" />` : ''}
        <div class="lk-card__info">
          <div class="lk-card__name">${escHtml(j.data.name)} <span class="lk-card__job">${escHtml(j.data.job)}</span></div>
          <div class="lk-card__meta">Lv.${j.data.level} · ${escHtml(j.data.region)} ${escHtml(j.data.world)} · 전체 ${j.data.rank.toLocaleString()}위</div>
          <div class="lk-card__exp">누적 EXP ${Number(j.data.exp).toLocaleString()}</div>
        </div>
      </div>
      <div class="lk-hist">${renderHistHtml(j.data)}</div>`;
  } catch (e) {
    box.innerHTML = '<span class="lk-err">조회 실패 — serve.js 서버가 실행 중인지 확인하세요.</span>';
  }
});

function renderJobGrid(filter) {
  const grid = document.getElementById('jobGrid');
  grid.innerHTML = '';
  const q = filter.toLowerCase();
  JOB_LIST.forEach((job, i) => {
    if (q && !job.name.toLowerCase().includes(q)) return;
    const div = document.createElement('div');
    div.className = 'job-item' + (i === selectedJob ? ' sel' : '');
    const iconSrc = charJobHeadSrc({ jobIdx:i, fetched:null });
    div.innerHTML = `<img src="${iconSrc}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="job-noimg" style="display:none">JOB</span><span>${job.name}</span>`;
    div.addEventListener('click', () => { selectedJob = i; renderJobGrid(filter); });
    grid.appendChild(div);
  });
}

document.getElementById('inpLevel').addEventListener('change', e => {
  const v = parseInt(e.target.value);
  if (!isNaN(v)) e.target.value = Math.max(1, Math.min(300, v));
});
document.getElementById('inpJobSearch').addEventListener('input', e => renderJobGrid(e.target.value));
document.getElementById('btnAddChar').addEventListener('click', () => {
  if (state.chars.length >= MAX_CHARS) return alert('최대 20개까지 추가 가능합니다.');
  openCharModal();
});
['modalCharClose','modalCharCancel'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => document.getElementById('overlayChar').classList.remove('open'));
});
document.getElementById('modalCharSave').addEventListener('click', () => {
  const inputName = document.getElementById('inpName').value.trim();
  // 조회 결과가 있고 이름이 일치하면 랭킹 데이터 사용, 아니면 직접 입력
  // 직접 입력 캐릭터도 서버를 고르면 fetched={world}가 생기는데 여기엔 name이 없다.
  // 그 캐릭터를 수정하려고 열면 fetchedInfo.name이 undefined라 아래 비교에서 터졌었음
  const useFetched = !!fetchedInfo?.name && inputName && fetchedInfo.name.toLowerCase() === inputName.toLowerCase();

  let name, level, fetched;
  if (useFetched) {
    name  = fetchedInfo.name;
    level = Math.min(300, parseInt(fetchedInfo.level) || 200);   // 조회는 200 이상만 받는다
    fetched = { ...fetchedInfo, syncedAt: Date.now() };   // 방금 조회 → 자동 최신화 대상에서 제외
    const ji = jobIdxFromName(fetchedInfo.job);
    selectedJob = ji >= 0 ? ji : selectedJob;
  } else {
    if (!inputName) return alert('캐릭터명을 입력하거나 랭킹 조회를 하세요.');
    name  = inputName;
    level = Math.max(1, Math.min(300, parseInt(document.getElementById('inpLevel').value) || 260));
    const manualWorld = document.getElementById('inpWorld').value;
    fetched = manualWorld ? { world: manualWorld } : null;   // 직접 입력 → 이미지 없음(서버만 선택 가능)
  }

  // 같은 캐릭터(이름) 중복 추가 방지 (대소문자 무시, 편집 중인 본인은 제외)
  const dup = state.chars.findIndex((c, idx) =>
    idx !== editIdx && c.name?.toLowerCase() === name.toLowerCase());
  if (dup >= 0) return alert('이미 추가된 캐릭터입니다.');

  if (editIdx >= 0) {
    state.chars[editIdx] = { ...state.chars[editIdx], name, level, jobIdx: selectedJob, fetched, cardBg: selectedCardBg };
  } else {
    state.chars.push({ id: Date.now(), name, level, jobIdx: selectedJob, checks: {}, fetched, cardBg: selectedCardBg });
    state.activeChar = state.chars.length - 1;
  }
  save();
  document.getElementById('overlayChar').classList.remove('open');
  renderAfterCharsChange();
  if (useFetched) syncServerHistThenRender(state.chars[state.activeChar]);
});

// 수정/삭제 버튼 (위임). 홈에 복사한 목록(#h_charList)에는 home.js가 이 함수를 붙인다
function onCharListClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const i = parseInt(btn.dataset.i);
  if (btn.dataset.action === 'edit') return openCharModal(i);
  openConfirm(`'${state.chars[i].name}' 캐릭터를 삭제하시겠습니까?`, () => {
    state.chars.splice(i, 1);
    if (state.activeChar >= state.chars.length) state.activeChar = state.chars.length - 1;
    save(); closeConfirm();
    renderAfterCharsChange();
  });
}
document.getElementById('charList').addEventListener('click', onCharListClick);

/* 캐릭터를 추가·수정·삭제한 뒤 — 캐릭터를 보여주는 화면을 모두 다시 그린다 */
function renderAfterCharsChange() {
  renderCharList(); renderBossTable(); renderCharInfo();
  // 활성 캐릭터가 바뀌었으면 헥사도 그 캐릭터 수치로 다시 읽는다 — 안 그러면 화면에 남은
  // 이전 캐릭터 값이 다음 입력 때 새 활성 캐릭터의 저장 키로 덮어써진다
  if (typeof renderAllHexaLists === 'function') renderAllHexaLists();
  // 캘린더의 캐릭터 선택 목록에도 바로 반영한다 — 새 캐릭터가 빠지거나 지운 캐릭터가 남지 않게
  if (typeof renderMapleCalendar === 'function') renderMapleCalendar();
}

/* 서버(Vercel Cron 수집) 히스토리를 가져와 로컬에 병합.
   배포 환경에서만 동작하며, 로컬/미설정 시 조용히 무시되고 로컬 스냅샷이 쓰인다. */
async function fetchServerHist(f) {
  if (!f || !f.name) return null;
  try {
    const r = await fetch(`/api/history?name=${encodeURIComponent(f.name)}&region=${(f.region||'na').toLowerCase()}&reboot=${f.reboot?1:0}`);
    const j = await r.json();
    if (j.ok && Array.isArray(j.data) && j.data.length) {
      const h = loadHist(); h[histKeyOf(f)] = j.data; saveHist(h);
      return j.data;
    }
  } catch (e) { /* 미배포/미설정 → 폴백 */ }
  return null;
}
function syncServerHistThenRender(ch) {
  if (ch?.fetched) fetchServerHist(ch.fetched).then(d => { if (d) renderCharInfo(); });
}

/* ── 랭킹 정보 자동 최신화 ──
   조회로 등록한 캐릭터는 fetched가 등록 시점에 고정되어 레벨/코디가 갱신되지 않는다.
   앱 진입 시 마지막 갱신이 REFRESH_INTERVAL 이상 지난 캐릭터만 조용히 재조회한다.
   실패해도 기존 값을 유지하며 사용자에게 알리지 않는다. */
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;   // 6시간

async function refreshStaleChars() {
  const now = Date.now();
  const stale = state.chars.filter(ch =>
    ch.fetched && ch.fetched.name && now - (ch.fetched.syncedAt || 0) > REFRESH_INTERVAL);
  if (!stale.length) return;

  let changed = false;
  for (const ch of stale) {
    const f = ch.fetched;
    try {
      const r = await fetch(`/api/lookup?name=${encodeURIComponent(f.name)}&reboot=${f.reboot?1:0}&region=${(f.region||'na').toLowerCase()}`);
      const j = await r.json();
      if (!j.ok || !j.data) continue;
      // reboot/region은 히스토리 키의 일부이므로 덮어쓰지 않는다
      const d = j.data;
      Object.assign(f, {
        level: d.level, exp: d.exp, rank: d.rank,
        job: canonJobName(d.job), world: d.world, worldID: d.worldID,
        img: d.img || f.img, syncedAt: now,
      });
      if (d.level) ch.level = d.level;
      changed = true;
    } catch { /* 네트워크 실패 → 다음 진입 때 재시도 */ }
  }
  // 캘린더도 캐릭터 이름·얼굴을 쓰므로 같이 다시 그린다.
  // 빠뜨리면 사이드바만 새 값이고 캘린더는 옛 이름이 남는다(실제로 그랬다).
  if (changed) {
    save(); renderCharList(); renderCharInfo();
    if (typeof renderMapleCalendar === 'function') renderMapleCalendar();
  }
}

/* ═══════════════════════════════════════════════
   캐릭터 목록 화면
   캐릭터 카드 격자, 그 아래 선택 캐릭터의 레벨·경험치 기록과 코디 컬렉션
═══════════════════════════════════════════════ */
/* 코디 컬렉션. 넥슨 아바타 주소는 코디가 같아도 조회할 때마다 바뀌는 암호문이라
   주소 비교로는 코디 변화를 알 수 없다. 이미지를 받아 내용 해시를 비교하고,
   주소별 해시는 브라우저에 저장해 다음부터는 새 주소만 받는다. */
const CI_HASH_KEY = 'ciImgHash';
function ciHashCache() { try { return JSON.parse(localStorage.getItem(CI_HASH_KEY) || '{}'); } catch { return {}; } }
async function ciImgHash(url, cache) {
  if (cache[url]) return cache[url];
  try {
    const r = await fetch(proxiedImgSrc(url));
    if (!r.ok) return null;
    const d = await crypto.subtle.digest('SHA-1', await r.arrayBuffer());
    return (cache[url] = [...new Uint8Array(d)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join(''));
  } catch { return null; }
}
function ciAgo(s) {
  const t = s.ts || Date.parse(s.date) || Date.now();
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 60) return '방금 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  const d = Math.floor(h / 24);
  if (d < 30) return d + '일 전';
  if (d <= 360) return Math.ceil(d / 30) + '개월 전';
  return Math.max(1, Math.floor(d / 365)) + '년 전';
}
async function ciFillLooks(ch) {
  const f = ch?.fetched, el = document.getElementById('ciLooks');
  if (!f || !el) return;
  const arr = (loadHist()[histKeyOf(f)] || []).filter(s => s.img);
  const cache = ciHashCache();
  const runs = [];                       // 최신 코디부터. rec 은 그 코디가 처음 기록된 스냅샷
  for (let i = arr.length - 1; i >= 0 && runs.length < 8; i -= 6) {
    const batch = arr.slice(Math.max(0, i - 5), i + 1).reverse();
    const hashes = await Promise.all(batch.map(s => ciImgHash(s.img, cache)));
    for (let k = 0; k < batch.length && runs.length < 8; k++) {
      const key = hashes[k] || 'u:' + batch[k].img;
      const last = runs[runs.length - 1];
      if (last && last.key === key) last.rec = batch[k];
      else runs.push({ key, rec: batch[k] });
    }
  }
  try {
    const keys = Object.keys(cache);
    if (keys.length > 500) keys.slice(0, keys.length - 500).forEach(k => delete cache[k]);
    localStorage.setItem(CI_HASH_KEY, JSON.stringify(cache));
  } catch { /* 저장 실패는 무시 */ }
  if (document.getElementById('ciLooks') !== el) return;
  el.innerHTML = runs.slice(0, 7).map(r => `<div class="ci-looks__item"><img src="${proxiedImgSrc(r.rec.img)}" alt="" onerror="this.style.visibility='hidden'" /><span>${ciAgo(r.rec)}</span></div>`).join('');
}

/* 선택 캐릭터의 레벨 / 경험치 기록 그래프. 세로축은 레벨에 경험치 비율을 더한 값이고,
   필요 경험치 표가 없는 레벨은 비율 없이 레벨만 쓴다. */
function ciExpChartHtml(ch) {
  const f = ch?.fetched;
  if (!f?.name) return '';
  let arr = (loadHist()[histKeyOf(f)] || []).filter(s => s.level && s.date);
  if (!arr.length && f.level) arr = [{ date: todayStr(), level: f.level, exp: Number(f.exp) || 0 }];
  if (!arr.length) return '';
  const md = d => { const [, m, dd] = d.split('-'); return `${+m}월 ${+dd}일`; };
  const pct = s => expPercent(s.level, s.exp);
  const last = arr[arr.length - 1];

  /* 경험치: 최근 7일. 기록이 없는 날은 변화가 없던 날이라 직전 기록 값을 그대로 쓴다. */
  const lastT = Date.parse(last.date);
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(lastT - k * 86400000).toISOString().slice(0, 10);
    const rec = [...arr].reverse().find(s => s.date <= d);
    if (rec) days.push({ date: d, level: rec.level, pct: pct(rec) });
  }
  const BW = 440, BH = 210, BT = 26, BB = 30;
  const maxP = Math.max(1, ...days.map(d => d.pct || 0));
  const slot = BW / days.length, bw = Math.min(46, slot * 0.6);
  const bars = days.map((d, i) => {
    const cx = slot * i + slot / 2;
    const h = d.pct == null ? 0 : d.pct / maxP * (BH - BT - BB);
    const y = BH - BB - h;
    return `<rect class="ci-exp__bar" x="${(cx - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="4"><title>${md(d.date)} Lv. ${d.level}${d.pct == null ? '' : ' ' + d.pct.toFixed(2) + '%'}</title></rect>
      <text class="ci-exp__val" x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}">${d.pct == null ? d.level : d.pct.toFixed(3).replace(/0$/, '') + '%'}</text>
      <text class="ci-exp__x" x="${cx.toFixed(1)}" y="${BH - 10}">${md(d.date)}</text>`;
  }).join('');

  /* 레벨: 처음 기록과 레벨이 바뀐 날, 마지막 기록 */
  const lv = arr.filter((s, i) => i === 0 || s.level !== arr[i - 1].level || i === arr.length - 1);
  const LW = 440, LH = 210, LP = 30;
  const lo = Math.min(...lv.map(s => s.level)), hi = Math.max(...lv.map(s => s.level));
  const lx = i => lv.length < 2 ? LW / 2 : LP + i * (LW - LP * 2) / (lv.length - 1);
  const ly = s => hi === lo ? LH / 2 - 8 : 36 + (1 - (s.level - lo) / (hi - lo)) * (LH - 36 - 56);
  const line = lv.map((s, i) => `${lx(i).toFixed(1)},${ly(s).toFixed(1)}`).join(' ');
  const base = LH - 30;
  const area = lv.length > 1 ? `<polygon class="ci-exp__area" points="${lx(0).toFixed(1)},${base} ${line} ${lx(lv.length - 1).toFixed(1)},${base}"/>` : '';
  const pts = lv.map((s, i) => `<circle class="ci-exp__dot" cx="${lx(i).toFixed(1)}" cy="${ly(s).toFixed(1)}" r="4.5"/>
      <text class="ci-exp__val" x="${lx(i).toFixed(1)}" y="${(ly(s) - 11).toFixed(1)}">${s.level}</text>
      <text class="ci-exp__x" x="${lx(i).toFixed(1)}" y="${LH - 10}">${md(s.date)}</text>`).join('');

  const codyHtml = arr.some(s => s.img) ? `
      <div class="card mt16"><div class="card__title">코디 컬렉션</div>
        <div class="ci-looks" id="ciLooks"></div>
      </div>` : '';

  return `
    <div class="ci-exp">
      <div class="ci-exp__head">${escHtml(ch.name)} 레벨 / 경험치</div>
      <div class="ci-exp__row">
        <div class="card"><div class="card__title">경험치 히스토리</div>
          <svg class="ci-exp__svg" viewBox="0 0 ${BW} ${BH}"><line class="ci-exp__axis" x1="0" x2="${BW}" y1="${BH - BB}" y2="${BH - BB}"/>${bars}</svg></div>
        <div class="card"><div class="card__title">레벨 히스토리</div>
          <svg class="ci-exp__svg" viewBox="0 0 ${LW} ${LH}"><line class="ci-exp__axis" x1="0" x2="${LW}" y1="${base}" y2="${base}"/>${area}${lv.length > 1 ? `<polyline class="ci-exp__line" points="${line}"/>` : ''}${pts}</svg></div>
      </div>${codyHtml}
    </div>`;
}

const CHARINFO_HEAD = `
  <div class="sec-head"><h2 class="sec-title">캐릭터 목록</h2></div>
  <p class="dt-help">추가한 캐릭터들을 카드로 모아 보여줍니다. 카드를 눌러 캐릭터를 선택하고, 드래그로 순서를 바꿀 수 있습니다.</p>`;

function renderCharInfo() {
  const box = document.getElementById('charInfoBody');
  if (!box) return;

  if (!state.chars.length) {
    box.innerHTML = `${CHARINFO_HEAD}<div class="ci-empty">캐릭터를 추가하세요.</div>`;
    return;
  }

  const cards = state.chars.map((ch, i) => {
    const f = ch.fetched;
    const jn = charJobName(ch);
    const world = f?.world || '';
    const region = charRegion(ch);
    const sIcon = world ? serverIconSrc(world) : '';
    const sIconHtml = sIcon ? `<img class="ci-servericon" src="${sIcon}" onerror="this.style.display='none'" />` : '';
    // 넥슨 원본 URL 대신 /api/img 프록시를 거친다 — 카드 이미지 저장이 캔버스에
    // 그릴 때 다른 출처 이미지면 캔버스가 오염돼 막히기 때문. 화면에 보이는
    // 모습은 완전히 동일(프록시가 원본 그대로 스트리밍).
    const portrait = f?.img
      ? `<img src="${proxiedImgSrc(f.img)}" crossorigin="anonymous" onerror="this.src='images/dailytasks/default.png';this.parentElement.classList.add('cg-portrait--no')" />`
      : `<img src="images/dailytasks/default.png" alt="" />`;
    const lv = f?.level || ch.level;
    const headSrc = charJobHeadSrc(ch);
    const headHtml = headSrc ? `<img class="ci-jobicon" src="${headSrc}" onerror="this.style.display='none'" />` : '';
    const rankRowHtml = f?.rank
      ? `<div class="ci-rank-row"><span>${region} 랭킹</span><b>#${f.rank.toLocaleString()}</b></div>` : '';
    // 보스 수익 계산기에서 체크한 것 - 대여비. weekTotal(updateCrystalBar)과 같은 식이라
    // 사이드바 합계와 카드에 찍힌 숫자가 항상 일치한다.
    const weekly = charWeeklyMeso(ch) - rentalWeeklyCost(ch);
    // 카드의 정보 칸은 일러스트 고정폭(112px) 때문에 실측 145px 안팎으로 좁다.
    // fmtMeso 전체 표기("4억 4,467만 5,000 메소")는 여기서 값만으로도 108px를 먹어
    // "이번 주 예상 수익" 라벨이 "이번…"으로 잘렸다(실측) — 라벨을 줄여도 근본
    // 해결이 안 돼서, 히스토그램 축에 쓰던 fmtMesoCompact("4.4억")로 바꿨다.
    // 정확한 값은 title(호버)로 남긴다.
    const weeklyRowHtml = `<div class="ci-rank-row"><span>주간 수익</span><b${weekly < 0 ? ' style="color:var(--danger)"' : ''} title="${fmtMeso(weekly)}">${ch.weekDone ? '<i class="ci-income-done">완료 · </i>' : ''}${fmtMesoCompact(weekly)}</b></div>`;
    // 랭킹 유무와 무관하게 항상 보이는 하나의 카드 하단 블록으로 합친다
    const rankRow = `<div class="ci-card__ranks">${rankRowHtml}${weeklyRowHtml}</div>`;
    const isActive = i === state.activeChar;
    return `
      <div class="cg-card${isActive ? ' cg-card--active' : ''}" data-ci="${i}">
        <button type="button" class="cg-card__save" data-ci="${i}">메애기 저장하기</button>
        <div class="cg-portrait${f?.img ? '' : ' cg-portrait--no'}">${portraitBgHtml(ch.cardBg)}${portrait}</div>
        <div class="ci-card__body">
          <div class="ci-card__nameline">
            <div>
              <div class="ci-card__name">${escHtml(ch.name)}</div>
              <div class="ci-card__job">${escHtml(jn || '')}</div>
            </div>
            ${headHtml}
          </div>
          <div class="ci-card__meta">
            <span class="ci-lv">Lv.${lv}</span>
            <span class="ci-server">${sIconHtml}<span class="icon-lbl">${escHtml(region)} ${escHtml(world)}</span></span>
          </div>
        </div>
        ${rankRow}
      </div>`;
  }).join('');

  box.innerHTML = `${CHARINFO_HEAD}<div class="cg-grid">${cards}</div>${ciExpChartHtml(state.chars[state.activeChar])}`;
  ciFillLooks(state.chars[state.activeChar]);
  box.querySelectorAll('.cg-card__save').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const i = Number(btn.dataset.ci);
      btn.disabled = true; btn.textContent = '저장 중...';
      exportCharCard(i).finally(() => { btn.disabled = false; btn.textContent = '메애기 저장하기'; });
    });
  });

  let dragSrc = null;
  const clearOver = () => box.querySelectorAll('.cg-card').forEach(c => c.classList.remove('drag-over'));
  // 순서를 바꾸면서 활성 캐릭터 번호도 같은 캐릭터를 계속 가리키게 옮긴다
  const moveChar = (from, to) => {
    const arr = state.chars;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    if (state.activeChar === from) state.activeChar = to;
    else if (from < to && state.activeChar > from && state.activeChar <= to) state.activeChar--;
    else if (from > to && state.activeChar >= to && state.activeChar < from) state.activeChar++;
    save(); renderCharList(); renderBossTable(); renderCharInfo();
  };
  box.querySelectorAll('.cg-card').forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      selectChar(parseInt(card.dataset.ci));
    });
    card.addEventListener('dragstart', e => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      clearOver();
    });

    // 터치 드래그 — 롱프레스(400ms) 후 드래그 시작, 그 전엔 스크롤 허용
    let longPressTimer = null, touchDragging = false;
    card.addEventListener('touchstart', e => {
      touchDragging = false;
      longPressTimer = setTimeout(() => {
        touchDragging = true;
        dragSrc = card;
        card.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(40);
      }, 400);
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      if (!touchDragging) { clearTimeout(longPressTimer); return; }
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('.cg-card');
      clearOver();
      if (target && target !== dragSrc) target.classList.add('drag-over');
    }, { passive: false });
    card.addEventListener('touchend', e => {
      clearTimeout(longPressTimer);
      card.classList.remove('dragging');
      clearOver();
      if (!touchDragging) { dragSrc = null; return; }
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el && el.closest('.cg-card');
      if (!target || target === dragSrc) { dragSrc = null; return; }
      const from = parseInt(dragSrc.dataset.ci);
      dragSrc = null;
      moveChar(from, parseInt(target.dataset.ci));
    });
    card.addEventListener('touchcancel', () => {
      clearTimeout(longPressTimer);
      card.classList.remove('dragging');
      clearOver();
      dragSrc = null; touchDragging = false;
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (card !== dragSrc) {
        clearOver();
        card.classList.add('drag-over');
      }
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (!dragSrc || dragSrc === card) return;
      moveChar(parseInt(dragSrc.dataset.ci), parseInt(card.dataset.ci));
    });
  });
}

/* ── 캐릭터 카드를 이미지로 저장 ──
   넥슨 아바타는 다른 출처(msavatar1.nexon.net)라 캔버스에 그대로 그리면
   캔버스가 오염(tainted)되어 toDataURL이 막힌다. /api/img 프록시를 거쳐
   같은 출처처럼 받아온다(api/img.js, serve.js 둘 다 구현돼 있음). */
function proxiedImgSrc(url) {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    if (/nexon\.(net|com)$/i.test(u.hostname)) return `/api/img?url=${encodeURIComponent(url)}`;
  } catch { /* 상대경로(내부 images/) 등 — 그대로 사용 */ }
  return url;
}
/* 실제 카드 DOM을 그대로 캡처(html2canvas/html-to-image 둘 다 시도)하면
   카드가 쓰는 컨테이너 쿼리(cqw, 카드 폭 기준 글씨 크기)를 두 라이브러리 다
   제대로 못 살려서 이름/직업 글씨가 통째로 사라지거나 깨졌다(실측 확인).
   그래서 캔버스에 직접 그린다. */
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function loadFirstAvailable(srcs) {
  for (const s of srcs) {
    try { return await loadImg(s); } catch { /* 다음 후보 시도 */ }
  }
  return null;
}
function loadOptional(src) {
  return src ? loadFirstAvailable([src]) : Promise.resolve(null);
}
function cardRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function cardRoundRectLeft(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function drawImgCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw, sh, sx, sy;
  if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2; sy = 0; }
  else { sw = img.width; sh = sw / br; sx = 0; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
/* 비율을 지켜 상자 안에 넣는다. 가로는 가운데, 세로는 가운데 또는 바닥(bottom) */
function drawImgContain(ctx, img, x, y, w, h, bottom) {
  const ir = img.width / img.height, br = w / h;
  let dw, dh;
  if (ir > br) { dw = w; dh = w / ir; } else { dh = h; dw = h * ir; }
  ctx.drawImage(img, x + (w - dw) / 2, bottom ? y + h - dh : y + (h - dh) / 2, dw, dh);
}

async function exportCharCard(idx) {
  const ch = state.chars[idx];
  if (!ch) return;
  const f = ch.fetched || {};
  const jn = charJobName(ch);
  const region = charRegion(ch);
  const world = f.world || '';
  const lv = f.level || ch.level;

  // 화면에서 실제로 쓰고 있는 폰트를 그대로 쓴다(고딕/Maple/8bit 중 사용자가 고른 것).
  const fontStack = getComputedStyle(document.body).fontFamily || "'고딕','Segoe UI','Malgun Gothic',sans-serif";
  const primaryFont = (fontStack.split(',')[0] || '고딕').trim().replace(/^['"]|['"]$/g, '');
  try {
    await Promise.all([
      document.fonts.load(`16px "${primaryFont}"`),
      document.fonts.load(`bold 16px "${primaryFont}"`),
    ]);
    await document.fonts.ready;
  } catch { /* 폰트 로드 실패해도 fallback 폰트로 계속 진행 */ }
  const F = (size, bold) => `${bold ? 'bold ' : ''}${size}px "${primaryFont}", "Segoe UI", "Malgun Gothic", sans-serif`;

  const SCALE = 2, W = 460, H = 220, PW = 190, PAD = 12;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE; canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  const cs = getComputedStyle(document.documentElement);
  const panelBg   = cs.getPropertyValue('--bg-card').trim() || '#0e0b1e';
  const panelVeil = cs.getPropertyValue('--panel-veil').trim() || 'rgba(15,10,32,.9)';
  const textColor = cs.getPropertyValue('--text').trim() || '#fff';
  const textSub   = cs.getPropertyValue('--text-sub').trim() || '#9a94b0';
  const accent    = cs.getPropertyValue('--accent').trim() || '#f5c842';
  const hue       = cs.getPropertyValue('--hue').trim() || '139,92,246';
  const border    = cs.getPropertyValue('--border').trim() || 'rgba(255,255,255,.12)';

  // 카드 배경 — 둥근 사각형 밖은 그대로 투명(캔버스 기본값)으로 둬서 다운로드된
  // png가 카드 모양 그대로 잘려 보이게 한다. panel-veil은 반투명이라 그 아래
  // 불투명 바탕(--bg-card)을 먼저 깔아 어디에 붙여넣어도 카드가 또렷하게 보이게 함.
  cardRoundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.fillStyle = panelBg;
  ctx.fill();
  ctx.fillStyle = panelVeil;
  ctx.fill();

  // 일러스트 박스(왼쪽)
  ctx.save();
  cardRoundRectLeft(ctx, 0, 0, PW, H, 14);
  ctx.clip();
  if (ch.cardBg) {
    const id = ch.cardBg.replace(/^bg/, '');
    const bgImg = await loadFirstAvailable(cardBgCandidates(id));
    if (bgImg) drawImgCover(ctx, bgImg, 0, 0, PW, H);
  }
  const charImg = await loadFirstAvailable(f.img ? [proxiedImgSrc(f.img), 'images/dailytasks/default.png'] : ['images/dailytasks/default.png']);
  if (charImg) {
    const pct = 0.92;
    const boxW = PW * pct, boxH = H * pct;
    drawImgContain(ctx, charImg, (PW - boxW) / 2, H - boxH, boxW, boxH, true);
  }
  ctx.restore();

  // 텍스트(오른쪽) — 실제 카드(.ci-card__meta, .ci-card__ranks)와 동일하게
  // 이름/직업 블록, Lv/서버 블록, 랭킹 블록 사이에 구분선을 넣는다.
  const tx = PW + PAD * 2;
  const rightEdge = W - PAD;
  const jobHeadSrc = charJobHeadSrc(ch);
  const jobHeadImg = await loadOptional(jobHeadSrc);
  const jobIconSize = 52;

  ctx.fillStyle = textColor;
  ctx.font = F(22, true);
  ctx.fillText(ch.name, tx, 38);

  if (jobHeadImg) drawImgContain(ctx, jobHeadImg, rightEdge - jobIconSize, 10, jobIconSize, jobIconSize);

  ctx.fillStyle = textSub;
  ctx.font = F(13, false);
  ctx.fillText(jn || '', tx, 60);

  const divider = y => {
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(rightEdge, y);
    ctx.stroke();
  };

  divider(76);

  ctx.fillStyle = accent;
  ctx.font = F(19, true);
  ctx.fillText(`Lv.${lv}`, tx, 102);

  // 서버 아이콘 + "NA Kronos" 형태로 화면과 동일하게
  const sIconSrc = world ? serverIconSrc(world) : '';
  const sIconImg = await loadOptional(sIconSrc);
  let worldTx = tx;
  if (sIconImg) { drawImgContain(ctx, sIconImg, tx, 112, 16, 16); worldTx = tx + 22; }
  ctx.fillStyle = textColor;
  ctx.font = F(14, false);
  ctx.fillText(`${region} ${world}`.trim(), worldTx, 124);

  if (f.rank) {
    divider(140);
    ctx.fillStyle = textSub;
    ctx.font = F(13, false);
    ctx.fillText(`${region} 랭킹 #${f.rank.toLocaleString()}`, tx, 162);
  }

  // 카드 테두리는 맨 마지막에 그린다 — 일러스트/배경 이미지가 먼저 그려지면서
  // 왼쪽 변의 테두리 선을 덮어버려 "테두리가 없다"고 보이던 문제가 있었음.
  cardRoundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
  ctx.strokeStyle = `rgba(${hue},.6)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  let dataUrl;
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch (e) {
    // 다른 출처 이미지가 프록시를 안 거치고 캔버스에 그려지면(예: f.img가
    // 넥슨 도메인이 아닌 경우) 캔버스가 오염돼 여기서 SecurityError가 난다.
    // 그냥 실패해서 아무 반응 없는 것처럼 보이지 않게 알려준다.
    alert('명함 이미지를 만드는 중 오류가 발생했습니다: ' + e.message);
    return;
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${(ch.name || 'character').replace(/[\\/:*?"<>|]/g, '_')}_카드.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

renderCharInfo();
refreshStaleChars();
