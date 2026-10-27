/* =============================================
   serverstatus.js — 넥슨 서버 상태 (공식 API 프록시 결과 표시)
   ============================================= */
let _ssRegion = 'na';
let _ssLoading = false;

// 받아오지 못한 쪽은 null — 상태가 없으면 _ssRender가 에러를 띄운다
async function renderServerStatus() {
  _ssLoading = true;
  const sec = document.getElementById('sec-serverstatus');
  if (sec && !sec.querySelector('.ss-grid')) _ssRenderShell(sec, true);

  const [sr, mr] = await Promise.all([
    fetch(`/api/server-status?region=${_ssRegion}`).then(r => r.json()).catch(() => null),
    fetch('/api/maintenance').then(r => r.json()).catch(() => null),
  ]);

  _ssLoading = false;
  _ssRender(sr && sr.ok ? sr : null, mr && mr.ok ? mr : null);
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
  const btns = sec.querySelectorAll('[data-ssregion]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.ssregion === _ssRegion) return;
      _ssRegion = btn.dataset.ssregion;
      setActive(btns, btn);
      renderServerStatus();
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

  // 상태 API의 월드명은 Challengers-Interactive / Challengers-Heroic처럼 접미사가
  // 붙어 오는데 아이콘 파일은 Challengers.png 하나뿐이라 접미사를 떼고 찾는다.
  // 아이콘 파일이 없는 월드는 빈 문자열이 돌아와서 이름만 표시된다.
  const iconOf = world => serverIconSrc(world) || serverIconSrc(world.split('-')[0]) || '';

  // 챌린저스는 한시 이벤트 월드라 시즌이 아니면 채널이 전부 0으로 찍혀 계속 "점검 중"으로만
  // 보인다. 넥슨 API가 알아서 빼주는 게 아니라 매번 이렇게 나오므로, 여기서 직접 걸러낸다.
  const visibleWorlds = statusData.worlds.filter(w => !/challeng/i.test(w.world));

  // 2열 그리드에서 1열은 전부 인터랙티브, 2열은 전부 히로익이 되도록 짝지어 배치한다.
  // 히로익: Kronos(45)·Hyperion(70)·Solis(46)와 이름에 Heroic이 붙은 이벤트 월드.
  const HEROIC_IDS = new Set([45, 46, 70]);
  const isHeroic = w => HEROIC_IDS.has(w.worldId) || /heroic/i.test(w.world);
  const inter = visibleWorlds.filter(w => !isHeroic(w));
  const heroic = visibleWorlds.filter(isHeroic);
  const ordered = [];
  for (let i = 0; i < Math.max(inter.length, heroic.length); i++) {
    if (inter[i])  ordered.push(inter[i]);
    if (heroic[i]) ordered.push(heroic[i]);
  }

  const cards = ordered.map(w => {
    const chOk = w.channels.total > 0 && w.channels.online === w.channels.total;
    const statusCls = w.up ? (chOk ? 'ss-up' : 'ss-partial') : 'ss-down';
    const statusLabel = w.up ? (chOk ? '정상' : '일부 채널 점검') : '점검 중';
    const updated = w.lastUpdate ? new Date(w.lastUpdate).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }) : '-';
    const channelGrid = (w.channelList || []).map(c =>
      `<span class="ss-chan ${c.up ? 'ss-chan--up' : 'ss-chan--down'}" title="${c.n}번 채널 ${c.up ? '정상' : '점검'}">${c.n}</span>`
    ).join('');
    const icon = iconOf(w.world);
    return `
      <div class="ss-card ${statusCls}">
        <div class="ss-card__head">
          <span class="ss-card__name">${icon ? `<img class="ss-card__icon" src="${icon}" alt="" onerror="this.style.display='none'">` : ''}<span class="icon-lbl">${w.world}</span></span>
          <span class="ss-card__badge">${statusLabel}</span>
        </div>
        <div class="ss-card__row"><span>채널</span><b>${w.channels.online} / ${w.channels.total}</b></div>
        <div class="ss-card__row"><span>로그인 게이트</span><b>${w.login.online} / ${w.login.total}</b></div>
        <div class="ss-card__upd">갱신 ${updated}</div>
        ${w.channelList && w.channelList.length ? `<div class="ss-chan-grid">${channelGrid}</div>` : ''}
      </div>`;
  }).join('');

  body.innerHTML = `
    ${maintHtml}
    <div class="ss-grid">${cards || '<p style="color:var(--text-sub);font-size:.85rem">표시할 서버 정보가 없습니다.</p>'}</div>
    <button class="sbtn sbtn--ghost mt16" id="ssRefreshBtn">새로고침</button>
  `;
  document.getElementById('ssRefreshBtn')?.addEventListener('click', () => { if (!_ssLoading) renderServerStatus(); });
}
