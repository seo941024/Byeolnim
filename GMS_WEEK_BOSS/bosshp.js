/* ═══════════════════════════════════════════════
   보스 HP 카드
═══════════════════════════════════════════════ */
const DIFF_KR_TO_ENG = { '이지':'easy', '노말':'normal', '하드':'hard', '카오스':'chaos', '익스트림':'extreme' };
// BOSS_DATA(보스 수익 계산기)엔 없고 보스 정보 페이지에만 있는 보스의 이미지.
// 카드 썸네일은 다른 보스와 같은 정적 컷을 쓰고, 팝업의 움직이는 gif는
// 파일명 stem(Bellona)으로 images/bosses_gif/Bellona.gif 를 자동으로 찾아간다.
// 배포 환경(리눅스)은 대소문자를 구분하므로 png/gif의 stem 대소문자가 정확히 같아야 한다.
const BOSS_IMG_EXTRA = { '벨로나': 'images/bosses/Bellona.png' };
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

/* 이 보스가 어느 난이도에서든 드랍 목록을 갖고 있는지 */
function _bhpBossHasAnyDrops(bossName) {
  const prefix = bossName + '_';
  return Object.keys(BOSS_DROP_ITEMS).some(k => k.startsWith(prefix) && BOSS_DROP_ITEMS[k].length);
}
/* 드랍이 있는 난이도를, 보스가 실제로 가진 난이도 순서(이지→익스트림)대로 */
function _bhpDropDiffs(boss) {
  const prefix = boss.name + '_';
  const own = (boss.diffs || []).map(d => d.diff);
  const keys = Object.keys(BOSS_DROP_ITEMS)
    .filter(k => k.startsWith(prefix) && BOSS_DROP_ITEMS[k].length)
    .map(k => k.slice(prefix.length));
  // 카드가 가진 난이도 순서를 그대로 따르고, 혹시 빠진 게 있으면 뒤에 붙인다
  const ordered = own.filter(d => keys.includes(d));
  keys.forEach(d => { if (!ordered.includes(d)) ordered.push(d); });
  return ordered;
}

function _bhpOpenDropsModal(boss) {
  const overlay = _bhpEnsureOverlay();
  // 난이도를 따로 고르게 하지 않고, 블로그 표처럼 이지/노말/하드… 전부 한 번에 보여준다
  const diffs = _bhpDropDiffs(boss);

  const sectionHtml = diffs.map(d => {
    const items = BOSS_DROP_ITEMS[boss.name + '_' + d] || [];
    // 난이도 표기는 앱 공용 난이도 필(.dpill)을 그대로 재사용 → EASY/NORMAL/HARD... 영문 표기
    const meta = DIFF_META[DIFF_KR_TO_ENG[d]] || DIFF_META.normal;
    return `
      <div class="bhp-drop-sec">
        <div class="bhp-drop-sec__diff"><span class="dpill ${meta.cls} sel"><span class="dpill__t">${meta.label}</span></span></div>
        <div class="bhp-drop-modal__itemlist">
          ${items.map(it => `
            <div class="bhp-drop-item" tabindex="0">
              <img class="bhp-drop-item__icon" src="images/WANT/${it.file}" alt="${it.name}" onerror="this.style.visibility='hidden'">
              <span class="bhp-drop-item__name">${it.name}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal modal--boss-drop">
      <div class="modal__head">
        <span class="modal__title modal__title--boss">${boss.name}</span>
        <button class="modal__close" id="bhpModalClose">×</button>
      </div>
      <div class="modal__body">
        <div class="bhp-drop-modal">
          <div class="bhp-drop-modal__img">
            <img id="bhpModalImg" alt="${boss.name}" />
            <span class="noimg" id="bhpModalNoimg" style="display:none">BOSS</span>
          </div>
          <div class="bhp-drop-modal__items">
            <div class="bhp-drop-modal__itemshead">획득 가능한 아이템 목록</div>
            ${sectionHtml || '<p class="bhp-drop-modal__empty">등록된 획득 아이템 정보가 없어요.</p>'}
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('bhpModalClose').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.classList.add('open');

  // 움직이는 보스 사진(gif) → 팝업 전용 정지컷(png) → 카드 썸네일 순으로 시도한다.
  // gif가 없는 보스는 images/bosses_gif/<stem>.png 를 넣어두면 그걸 쓴다.
  const stemMatch = boss.img && boss.img.match(/([^/]+)\.\w+$/);
  const stem = stemMatch ? stemMatch[1] : '';
  const candidates = [];
  if (stem) candidates.push(`images/bosses_gif/${stem}.gif`, `images/bosses_gif/${stem}.png`);
  if (boss.img) candidates.push(boss.img);
  const imgEl = document.getElementById('bhpModalImg');
  const noimgEl = document.getElementById('bhpModalNoimg');
  const showNoimg = () => { imgEl.style.display = 'none'; noimgEl.style.display = 'flex'; };
  let ci = 0;
  if (!candidates.length) {
    showNoimg();
  } else {
    imgEl.addEventListener('error', () => {
      ci += 1;
      if (ci < candidates.length) imgEl.src = candidates[ci];
      else showNoimg();
    });
    imgEl.src = candidates[0];
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
  // 보스 수익 계산기(BOSS_DATA)엔 없고 이 페이지에만 있는 보스의 이미지.
  // 벨로나는 정적 컷이 따로 없어서 gif를 그대로 카드 이미지로 쓴다(이름 글씨 없는 원본).
  Object.entries(BOSS_IMG_EXTRA).forEach(([n, src]) => {
    if (seen[n] && !seen[n].img) seen[n].img = src;
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

    // 클릭 가능 여부는 "지금 고른 난이도"가 아니라 "이 보스가 어느 난이도에서든 드랍이
    // 있는지"로 판단한다. 예전엔 선택 난이도로만 봐서, 스우처럼 노말엔 드랍이 없고
    // 하드/익스트림에만 있는 보스가 기본 난이도에선 아예 안 눌리는 것처럼 보였다.
    const hasDrops = _bhpBossHasAnyDrops(boss.name);

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
      // 선택된 난이도와 무관하게 모든 난이도를 한 번에 보여준다
      _bhpOpenDropsModal(boss);
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
