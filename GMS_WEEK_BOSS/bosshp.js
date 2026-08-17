/* ═══════════════════════════════════════════════
   보스 HP 카드
═══════════════════════════════════════════════ */
const DIFF_KR_TO_ENG = { '이지':'easy', '노말':'normal', '하드':'hard', '카오스':'chaos', '익스트림':'extreme' };
const bossHPActiveDiffs = {};
const busChecked = new Set(); // 버스 참조에 추가된 보스명
const busDiffs   = {};        // 버스 패널 전용 난이도 선택

/* 보스 이미지 클릭 시 "획득 가능한 아이템" 팝업 (오늘의 채널 추천과 동일한 overlay/modal 패턴) */
function _bhpEnsureOverlay() {
  let overlay = document.getElementById('bhpOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'bhpOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }
  return overlay;
}

function _bhpOpenDropsModal(boss, active, dropItems) {
  const overlay = _bhpEnsureOverlay();

  overlay.innerHTML = `
    <div class="modal modal--boss-drop">
      <div class="modal__head">
        <span class="modal__title">${active.nameOverride || boss.name} · 획득 가능한 아이템</span>
        <button class="modal__close" id="bhpModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="bhp-drop-modal">
          <div class="bhp-drop-modal__img">
            <img id="bhpModalImg" alt="${boss.name}" />
            <span class="noimg" id="bhpModalNoimg" style="display:none">BOSS</span>
          </div>
          <div class="bhp-drop-modal__items">
            <div class="bhp-drops__list">
              ${dropItems.map(it => `<img class="bhp-drops__icon" src="images/WANT/${it.file}" title="${it.name}" alt="${it.name}" onerror="this.style.display='none'">`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('bhpModalClose').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.classList.add('open');

  // 정적 이미지 대신 움직이는 보스 사진(gif)을 우선 시도하고, 없으면 기존 정적 이미지로 대체
  const stemMatch = boss.img && boss.img.match(/([^/]+)\.\w+$/);
  const gifSrc = stemMatch ? `images/bosses_gif/${stemMatch[1]}.gif` : '';
  const imgEl = document.getElementById('bhpModalImg');
  const noimgEl = document.getElementById('bhpModalNoimg');
  const showNoimg = () => { imgEl.style.display = 'none'; noimgEl.style.display = 'flex'; };
  if (!gifSrc && !boss.img) {
    showNoimg();
  } else {
    imgEl.addEventListener('error', () => {
      if (gifSrc && imgEl.src.includes('bosses_gif')) {
        if (boss.img) imgEl.src = boss.img; else showNoimg();
      } else {
        showNoimg();
      }
    });
    imgEl.src = gifSrc || boss.img;
  }
}

function parseBossHpValue(value) {
  if (value == null || value === '' || value === '—') return 0;
  if (typeof value === 'number') return value;
  const raw = String(value).replace(/,/g, '').trim();
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num)) return 0;
  if (/Q$/i.test(raw)) return num * 10_000_000;
  if (/T$/i.test(raw)) return num * 10_000;
  if (/B$/i.test(raw)) return num * 10;
  if (/M$/i.test(raw)) return num / 100;
  if (raw.includes('조')) return num * 10_000;
  return num;
}

function fmtBossHpEok(eok) {
  if (!eok) return '—';
  const fmt = n => +n.toFixed(2).replace(/\.?0+$/, '');
  if (eok >= 10_000_000) return `${fmt(eok / 10_000_000)}Q`;
  if (eok >= 10_000)     return `${fmt(eok / 10_000)}T`;
  if (eok >= 10)         return `${fmt(eok / 10)}B`;
  return `${fmt(eok * 100)}M`;
}

/* 버스 패널만 다시 그리기 (카드 전체 재렌더 없이) */
function renderBusPanel(groups) {
  const busEl = document.getElementById('busTable');
  if (!busEl) return;

  const checked = groups.filter(b => busChecked.has(b.name));

  if (checked.length === 0) {
    busEl.innerHTML = '<div class="bus-empty">토글키를 눌러 보스를 추가하세요</div>';
    return;
  }

  busEl.innerHTML = `<table class="bus-tbl">
    <thead>
      <tr>
        <th>보스</th>
        <th>난이도</th>
        <th class="bus-pct5">5% 최소 딜</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${checked.map(boss => {
        const activeDiff = busDiffs[boss.name] || bossHPActiveDiffs[boss.name] || boss.diffs[0]?.diff;
        busDiffs[boss.name] = activeDiff;
        const active = boss.diffs.find(d => d.diff === activeDiff) || boss.diffs[0];
        const hp5 = parseBossHpValue(active.hp) * 0.05;

        const diffOpts = boss.diffs.map(d => {
          const eng = DIFF_KR_TO_ENG[d.diff] || 'normal';
          const meta = DIFF_META[eng] || { label: d.diff };
          return `<option value="${d.diff}"${d.diff === activeDiff ? ' selected' : ''}>${meta.label}</option>`;
        }).join('');

        const imgHtml = boss.img
          ? `<img src="${boss.img}" class="bus-boss-img" onerror="this.style.display='none'" />`
          : '';

        return `<tr data-bus-boss="${boss.name}">
          <td class="bus-boss-name">${imgHtml}<span>${boss.name}</span></td>
          <td><select class="bus-diff-sel" data-boss="${boss.name}">${diffOpts}</select></td>
          <td class="bus-pct5"><b>${hp5 > 0 ? fmtBossHpEok(hp5) : '—'}</b></td>
          <td><button class="bus-remove" data-boss="${boss.name}" title="제거">✕</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;

  busEl.querySelectorAll('.bus-diff-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      busDiffs[sel.dataset.boss] = sel.value;
      renderBusPanel(groups);
    });
  });

  busEl.querySelectorAll('.bus-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.boss;
      busChecked.delete(name);
      const chk = document.querySelector(`.bus-toggle-input[data-boss="${name}"]`);
      if (chk) chk.checked = false;
      renderBusPanel(groups);
    });
  });
}

function renderBossHPTable() {
  const norm = s => s.replace(/\s/g, '');

  const groups = [];
  const seen   = {};
  BOSS_HP_TABLE.forEach(b => {
    if (!seen[b.name]) {
      seen[b.name] = { name: b.name, img: '', monthly: false, diffs: [] };
      groups.push(seen[b.name]);
    }
    seen[b.name].diffs.push(b);
  });

  BOSS_DATA.forEach(bd => {
    const key = Object.keys(seen).find(k => norm(k) === norm(bd.name));
    if (key) { seen[key].img = bd.img; seen[key].monthly = !!bd.monthly; }
  });

  renderBusPanel(groups);

  const container = document.getElementById('bossHPCards');
  container.innerHTML = groups.map(boss => {
    const imgHtml = boss.img
      ? `<img src="${boss.img}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span>`
      : '<span class="noimg">BOSS</span>';

    const activeDiff = bossHPActiveDiffs[boss.name] || boss.diffs[0]?.diff;
    const active = boss.diffs.find(d => d.diff === activeDiff) || boss.diffs[0];
    bossHPActiveDiffs[boss.name] = active.diff;

    const activeEngDiff = DIFF_KR_TO_ENG[active.diff] || 'normal';
    const activeMeta = DIFF_META[activeEngDiff] || { label: active.diff, cls: 'diff-normal' };

    const forceEl = active.force
      ? `<span class="force ${active.ftype === 'auth' ? 'force-auth' : 'force-arc'}"><img src="images/icons/${active.ftype === 'auth' ? 'auth' : 'arc'}.png" class="force-icon" />${active.force}</span>`
      : '';

    const diffOpts = boss.diffs.map(d => {
      const eng = DIFF_KR_TO_ENG[d.diff] || 'normal';
      const meta = DIFF_META[eng] || { label: d.diff };
      return `<option value="${d.diff}"${d.diff === active.diff ? ' selected' : ''}>${meta.label}</option>`;
    }).join('');
    const diffSel = `<select class="bhp-diff-sel" data-boss="${boss.name}">${diffOpts}</select>`;

    const activePill = `<div class="bhp-active-diff"><span class="dpill ${activeMeta.cls} sel"><span class="dpill__t">${activeMeta.label}</span></span></div>`;

    const phases = (BOSS_HP_PHASES[boss.name + '_' + active.diff] || []);
    const totalHpEok = parseBossHpValue(active.hp);

    const pdrHtml = active.pdr != null
      ? `<div class="bhp-pdr">방어율 <b>${active.pdr}%</b></div>`
      : '';

    const phaseHtml = phases.length > 0
      ? phases.map((ph, i) =>
          (i > 0 ? '<hr class="bhp-sep">' : '') +
          `<div class="bhp-phase"><span>${ph.label}</span><span class="bhp-phase__val">${ph.hp || '—'}</span></div>`
        ).join('')
      : `<div class="bhp-phase"><span>총 체력</span><span class="bhp-phase__val">${fmtBossHpEok(active.hp)}</span></div>`;

    const threshHtml = totalHpEok > 0 ? `
      <div class="bhp-thresholds">
        <div class="bhp-tr"><span class="bhp-tr__pct">10%</span><span class="bhp-tr__dot--10">●</span><span class="bhp-tr__val">${fmtBossHpEok(totalHpEok * 0.10)}</span></div>
        <div class="bhp-tr"><span class="bhp-tr__pct">5%</span><span class="bhp-tr__dot--5">●</span><span class="bhp-tr__val">${fmtBossHpEok(totalHpEok * 0.05)}</span></div>
      </div>` : '';

    const isOn = busChecked.has(boss.name);

    const dropItems = BOSS_DROP_ITEMS[boss.name + '_' + active.diff] || [];
    const hasDrops = dropItems.length > 0;

    return `<div class="bhp-card${boss.monthly ? ' bhp-card--monthly' : ''}">
      <div class="bhp-card__img${hasDrops ? ' bhp-card__img--clickable' : ''}" data-boss="${boss.name}" title="${hasDrops ? '클릭: 획득 가능한 아이템 보기' : ''}">${imgHtml}</div>
      <div class="bhp-card__body">
        <div class="bhp-card__top">
          <div class="bhp-name-row">
            <div class="bhp-card__name">${active.nameOverride || boss.name}</div>
            <label class="bus-toggle-wrap" title="버스 참조에 추가">
              <input type="checkbox" class="bus-toggle-input" data-boss="${boss.name}"${isOn ? ' checked' : ''} />
              <span class="bus-toggle-track"><span class="bus-toggle-thumb"></span></span>
            </label>
          </div>
          <div class="bhp-card__info">
            <span class="bhp-lv">Lv.${active.lv ?? '—'}</span>
            ${forceEl}
          </div>
          ${pdrHtml}
          ${activePill}
          ${diffSel}
          <div class="bhp-diff">${phaseHtml}</div>
        </div>
        ${threshHtml}
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.bhp-diff-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      bossHPActiveDiffs[sel.dataset.boss] = sel.value;
      renderBossHPTable();
    });
  });

  container.querySelectorAll('.bhp-card__img--clickable').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.boss;
      const boss = groups.find(g => g.name === name);
      if (!boss) return;
      const activeDiff = bossHPActiveDiffs[boss.name] || boss.diffs[0]?.diff;
      const active = boss.diffs.find(d => d.diff === activeDiff) || boss.diffs[0];
      const dropItems = BOSS_DROP_ITEMS[boss.name + '_' + active.diff] || [];
      if (!dropItems.length) return;
      _bhpOpenDropsModal(boss, active, dropItems);
    });
  });

  container.querySelectorAll('.bus-toggle-input').forEach(chk => {
    chk.addEventListener('change', () => {
      const name = chk.dataset.boss;
      if (chk.checked) busChecked.add(name);
      else busChecked.delete(name);
      renderBusPanel(groups);
    });
  });

  requestAnimationFrame(() => {
    const cards = container.querySelectorAll('.bhp-card');
    let maxH = 0;
    cards.forEach(c => { c.style.minHeight = ''; const h = c.getBoundingClientRect().height; if (h > maxH) maxH = h; });
    cards.forEach(c => c.style.minHeight = maxH + 'px');
  });
}

renderBossHPTable();
initStarforce();
initCube();
