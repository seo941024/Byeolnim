/* =============================================
   serverstatus.js — 넥슨 서버 상태 (공식 API 프록시 결과 표시)
   ============================================= */
let _ssRegion = 'na';
let _ssLoading = false;

async function _ssFetch() {
  _ssLoading = true;
  const sec = document.getElementById('sec-serverstatus');
  if (sec && !sec.querySelector('.ss-grid')) _ssRenderShell(sec, true);

  let statusData = null, maintData = null;
  try {
    const [sr, mr] = await Promise.all([
      fetch(`/api/server-status?region=${_ssRegion}`).then(r => r.json()).catch(() => null),
      fetch('/api/maintenance').then(r => r.json()).catch(() => null),
    ]);
    if (sr && sr.ok) statusData = sr;
    if (mr && mr.ok) maintData = mr;
  } catch { /* 무시 — 아래에서 에러 표시 */ }

  _ssLoading = false;
  _ssRender(statusData, maintData);
}

function _ssRenderShell(sec, loading) {
  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">서버 상태</h2>
    </div>
    <div class="region-toggle" style="margin:0 0 16px;max-width:160px;">
      <button class="region-toggle__btn${_ssRegion === 'na' ? ' active' : ''}" data-ssregion="na">NA</button>
      <button class="region-toggle__btn${_ssRegion === 'eu' ? ' active' : ''}" data-ssregion="eu">EU</button>
    </div>
    <div id="ssBody">${loading ? '<p style="color:var(--text-sub);font-size:.85rem">불러오는 중…</p>' : ''}</div>
  `;
  sec.querySelectorAll('[data-ssregion]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.ssregion === _ssRegion) return;
      _ssRegion = btn.dataset.ssregion;
      sec.querySelectorAll('[data-ssregion]').forEach(b => b.classList.toggle('active', b.dataset.ssregion === _ssRegion));
      _ssFetch();
    });
  });
}

function _ssRender(statusData, maintData) {
  const sec = document.getElementById('sec-serverstatus');
  if (!sec) return;
  if (!sec.querySelector('.region-toggle')) _ssRenderShell(sec, false);
  const body = document.getElementById('ssBody');
  if (!body) return;

  if (!statusData) {
    body.innerHTML = `<p style="color:var(--danger);font-size:.85rem">서버 상태를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>`;
    return;
  }

  const maintHtml = maintData && maintData.maintenance
    ? `<div class="ss-maint">점검 진행 중입니다.</div>`
    : '';

  const cards = statusData.worlds.map(w => {
    const chOk = w.channels.total > 0 && w.channels.online === w.channels.total;
    const chPart = w.channels.online > 0 && w.channels.online < w.channels.total;
    const statusCls = w.up ? (chOk ? 'ss-up' : 'ss-partial') : 'ss-down';
    const statusLabel = w.up ? (chOk ? '정상' : '일부 채널 점검') : '점검 중';
    const updated = w.lastUpdate ? new Date(w.lastUpdate).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }) : '-';
    return `
      <div class="ss-card ${statusCls}">
        <div class="ss-card__head">
          <span class="ss-card__name">${w.world}</span>
          <span class="ss-card__badge">${statusLabel}</span>
        </div>
        <div class="ss-card__row"><span>채널</span><b>${w.channels.online} / ${w.channels.total}</b></div>
        <div class="ss-card__row"><span>로그인 게이트</span><b>${w.login.online} / ${w.login.total}</b></div>
        <div class="ss-card__upd">갱신 ${updated}</div>
      </div>`;
  }).join('');

  body.innerHTML = `
    ${maintHtml}
    <div class="ss-grid">${cards || '<p style="color:var(--text-sub);font-size:.85rem">표시할 서버 정보가 없습니다.</p>'}</div>
    <button class="sbtn sbtn--ghost mt16" id="ssRefreshBtn">새로고침</button>
  `;
  document.getElementById('ssRefreshBtn')?.addEventListener('click', () => { if (!_ssLoading) _ssFetch(); });
}

function renderServerStatus() {
  _ssFetch();
}
