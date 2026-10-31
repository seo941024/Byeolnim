/* ═══════════════════════════════════════════════
   보스 HP 카드
═══════════════════════════════════════════════ */
const DIFF_KR_TO_ENG = { '이지':'easy', '노말':'normal', '하드':'hard', '카오스':'chaos', '익스트림':'extreme' };
/* 난이도 표기는 앱 공용 난이도 필(DIFF_META)을 그대로 쓴다 → EASY/NORMAL/HARD... 영문 표기 */
const _bhpDiffMeta = kr => DIFF_META[DIFF_KR_TO_ENG[kr] || 'normal'];
// BOSS_DATA(보스 수익 계산기)엔 없고 보스 정보 페이지에만 있는 보스의 이미지.
// 카드 썸네일은 다른 보스와 같은 정적 컷을 쓰고, 팝업의 움직이는 gif는
// 파일명 stem(Bellona)으로 images/bosses_gif/Bellona.gif 를 자동으로 찾아간다.
// 배포 환경(리눅스)은 대소문자를 구분하므로 png/gif의 stem 대소문자가 정확히 같아야 한다.
const BOSS_IMG_EXTRA = { '벨로나': 'images/bosses/Bellona.png' };
// 위와 같은 보스의 카드 그림 파일 이름. images/official/boss_card/<이름>.png
const BOSS_CARD_EXTRA = { '벨로나': 'bellona' };
// 카드 그림을 같은 파일 이름으로 바꿀 때 서비스 워커가 옛 그림을 내주지 않도록 v를 올린다
const _bhpCardSrc = id => `images/official/boss_card/${id}.png?v=20261031b`;
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
    overlay.addEventListener('click', e => { if (e.target === overlay) _bhpCloseModal(); });
  }
  return overlay;
}

function _bhpCloseModal() {
  document.getElementById('bhpOverlay').classList.remove('open');
  _bhpCloseDesc();
}

/* 드랍이 있는 난이도를, 보스가 실제로 가진 난이도 순서(이지→익스트림)대로 */
function _bhpDropDiffs(boss) {
  const prefix = boss.name + '_';
  const keys = Object.keys(BOSS_DROP_ITEMS)
    .filter(k => k.startsWith(prefix) && BOSS_DROP_ITEMS[k].length)
    .map(k => k.slice(prefix.length));
  // 카드가 가진 난이도 순서를 그대로 따르고, 혹시 빠진 게 있으면 뒤에 붙인다
  const ordered = boss.diffs.map(d => d.diff).filter(d => keys.includes(d));
  keys.forEach(d => { if (!ordered.includes(d)) ordered.push(d); });
  return ordered;
}

function _bhpOpenDropsModal(boss) {
  const overlay = _bhpEnsureOverlay();
  // 난이도를 따로 고르게 하지 않고, 블로그 표처럼 이지/노말/하드… 전부 한 번에 보여준다
  const diffs = _bhpDropDiffs(boss);

  const sectionHtml = diffs.map(d => {
    const items = BOSS_DROP_ITEMS[boss.name + '_' + d] || [];
    const meta = _bhpDiffMeta(d);
    return `
      <div class="bhp-drop-sec">
        <div class="bhp-drop-sec__diff"><span class="dpill ${meta.cls} sel"><span class="dpill__t">${meta.label}</span></span></div>
        <div class="bhp-drop-modal__itemlist">
          ${items.map(it => `
            <div class="bhp-drop-item" tabindex="0" data-file="${it.file}" data-name="${it.name}">
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
  document.getElementById('bhpModalClose').addEventListener('click', _bhpCloseModal);
  overlay.classList.add('open');
  overlay.querySelectorAll('.bhp-drop-item').forEach(el => {
    el.addEventListener('click', () => _bhpToggleDesc(el, el.dataset.file, el.dataset.name));
  });

  // 움직이는 보스 사진(gif) → 팝업 전용 정지컷(png) → 카드 썸네일 순으로 시도한다.
  // gif가 없는 보스는 images/bosses_gif/<stem>.png 를 넣어두면 그걸 쓴다.
  const stem = boss.img?.match(/([^/]+)\.\w+$/)?.[1];
  const candidates = [];
  if (stem) candidates.push(`images/bosses_gif/${stem}.gif`, `images/bosses_gif/${stem}.png`);
  if (boss.img) candidates.push(boss.img);
  const imgEl = document.getElementById('bhpModalImg');
  const noimgEl = document.getElementById('bhpModalNoimg');
  const showNoimg = () => { imgEl.style.display = 'none'; noimgEl.style.display = 'flex'; };
  if (!candidates.length) { showNoimg(); return; }
  let ci = 0;
  imgEl.addEventListener('error', () => {
    if (++ci < candidates.length) imgEl.src = candidates[ci];
    else showNoimg();
  });
  imgEl.src = candidates[0];
}

/* ── 드랍 아이템 인게임 설명 (클릭하면 열림) ──
   호버는 이름만(.bhp-drop-item__name, CSS) 보여주고, 클릭하면 실제 인게임
   설명 텍스트를 body 직속 고정 위치 패널로 띄운다. 모달 본문이
   overflow:auto라 아이템 안에 넣으면 스크롤에 잘리므로(과거 캘린더 툴팁에서
   겪은 문제와 동일) body에 붙이고 좌표만 계산해서 옮긴다. */
let _bhpDescOpenFile = null;
function _bhpDescEl() {
  let el = document.getElementById('bhpDescTip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bhpDescTip';
    el.className = 'bhp-item-desc';
    document.body.appendChild(el);
  }
  return el;
}
function _bhpCloseDesc() {
  document.getElementById('bhpDescTip')?.classList.remove('open');
  _bhpDescOpenFile = null;
  document.removeEventListener('click', _bhpDescOutside, true);
}
function _bhpDescOutside(e) {
  if (e.target.closest('.bhp-drop-item') || e.target.closest('#bhpDescTip')) return;
  _bhpCloseDesc();
}
function _bhpToggleDesc(itemEl, file, name) {
  if (_bhpDescOpenFile === file) { _bhpCloseDesc(); return; }
  // 화면엔 한국어(KMS) 설명만 띄운다. GMS 영문(desc_en)은 참고용으로 데이터에만 남아있다.
  const entry = (typeof ITEM_DESC !== 'undefined') ? ITEM_DESC[file] : null;
  const desc = entry?.desc_kr;
  const el = _bhpDescEl();
  el.innerHTML = `
    <div class="bhp-item-desc__name">${name}</div>
    <div class="bhp-item-desc__body">${desc ? desc.replace(/\n/g, '<br>') : '아직 등록된 설명이 없습니다.'}</div>`;
  el.classList.add('open');
  _bhpDescOpenFile = file;

  const a = itemEl.getBoundingClientRect();
  const t = el.getBoundingClientRect();
  const x = Math.min(window.innerWidth - t.width - 8, Math.max(8, a.left + a.width / 2 - t.width / 2));
  const above = a.top - t.height - 10;
  el.style.left = x + 'px';
  el.style.top = (above >= 8 ? above : a.bottom + 10) + 'px';

  // 지금 이 클릭으로 열렸는데 같은 틱에서 바로 "바깥 클릭"으로 잡히지 않게 다음 틱에 건다
  setTimeout(() => document.addEventListener('click', _bhpDescOutside, true), 0);
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

/* 난이도 드롭다운 옵션 — 보스 카드와 버스 패널이 같이 쓴다 */
function _bhpDiffOpts(boss, selected) {
  return boss.diffs.map(d => `<option value="${d.diff}"${d.diff === selected ? ' selected' : ''}>${_bhpDiffMeta(d.diff).label}</option>`).join('');
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

        const imgHtml = boss.img
          ? `<img src="${boss.img}" class="bus-boss-img" onerror="this.style.display='none'" />`
          : '';

        return `<tr data-bus-boss="${boss.name}">
          <td class="bus-boss-name">${imgHtml}<span>${boss.name}</span></td>
          <td><select class="bus-diff-sel" data-boss="${boss.name}">${_bhpDiffOpts(boss, activeDiff)}</select></td>
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

/* 이름이 칸보다 길면 줄바꿈 대신 글자 가로폭만 줄여 한 줄에 맞춘다. 칸이 안 보이는 상태에서는 건너뛴다. */
function _bhpFitNames() {
  document.querySelectorAll('.bhp-card__name').forEach(box => {
    const t = box.firstElementChild;
    if (!t || !box.clientWidth) return;
    t.style.transform = '';
    if (t.scrollWidth > box.clientWidth) t.style.transform = 'scaleX(' + (box.clientWidth / t.scrollWidth).toFixed(3) + ')';
  });
}
{
  let _bhpFitT = 0;
  window.addEventListener('resize', () => { clearTimeout(_bhpFitT); _bhpFitT = setTimeout(_bhpFitNames, 120); });
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

  /* 카드 그림은 게임 파일 UI/UIBoss.img 보스 목록의 큰 그림 422×500이고 보스 이름 글자가 그림에 들어 있다. 지수 요청으로 한글판을 쓴다.
     - KMS v.389 그림 21장: 서버마다 번호가 달라 GMS 그림과 글자 아래쪽 모양을 대조해 짝지었다
     - 벨로나·림보·발드릭스·최초의 대적자·찬란한 흉성·유피테르: KMS v.389 뒤에 나온 보스라 메이플 위키 Boss UI 파일 역사에 남은
       KMS 한글판을 지수가 받아 왔다. 글자 아래 그림이 GMS 게임 그림과 픽셀까지 같다, 찬란한 흉성만 조금 다르다
     - 스우: KMS v.389 그림은 리뉴얼 전 옛 일러스트라 새 일러스트인 GMS 영문 그림. 새 그림의 한글판을 구하면 바꾼다
     - 아케치·노히메: KMS에 없는 일본 보스라 JMS v.444 일본어 그림
     boss.img는 드랍 팝업이 GIF를 찾는 이름으로 쓰므로 그대로 두고 카드 그림만 따로 든다 */
  BOSS_DATA.forEach(bd => {
    const key = Object.keys(seen).find(k => norm(k) === norm(bd.name));
    if (key) { seen[key].img = bd.img; seen[key].card = _bhpCardSrc(bd.id); seen[key].monthly = !!bd.monthly; }
  });
  // 보스 수익 계산기(BOSS_DATA)엔 없고 이 페이지에만 있는 보스의 이미지(BOSS_IMG_EXTRA)와 카드 그림(BOSS_CARD_EXTRA).
  Object.entries(BOSS_IMG_EXTRA).forEach(([n, src]) => {
    if (seen[n] && !seen[n].img) seen[n].img = src;
  });
  Object.entries(BOSS_CARD_EXTRA).forEach(([n, id]) => {
    if (seen[n] && !seen[n].card) seen[n].card = _bhpCardSrc(id);
  });

  renderBusPanel(groups);

  const container = document.getElementById('bossHPCards');
  container.innerHTML = groups.map(boss => {
    const imgSrc = boss.card || boss.img;
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" loading="lazy" decoding="async"${boss.card ? ' class="bhp-card__art"' : ''} onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="noimg" style="display:none">BOSS</span>`
      : '<span class="noimg">BOSS</span>';

    const activeDiff = bossHPActiveDiffs[boss.name] || boss.diffs[0]?.diff;
    const active = boss.diffs.find(d => d.diff === activeDiff) || boss.diffs[0];
    bossHPActiveDiffs[boss.name] = active.diff;

    const activeMeta = _bhpDiffMeta(active.diff);

    // 포스 아이콘은 GMS v.270 게임 파일 UI/UIWindow4.img 맵 아케인·어센틱 포스 표시의 원본 PNG다
    const ft = active.ftype === 'auth' ? 'auth' : 'arc';
    const forceEl = active.force
      ? `<span class="force force-${ft}"><img src="images/official/force/${ft}.png" class="force-icon" />${active.force}</span>`
      : '';

    const diffSel = `<select class="bhp-diff-sel" data-boss="${boss.name}">${_bhpDiffOpts(boss, active.diff)}</select>`;

    const activePill = `<div class="bhp-active-diff"><span class="dpill ${activeMeta.cls} sel"><span class="dpill__t">${activeMeta.label}</span></span></div>`;

    const phases = BOSS_HP_PHASES[boss.name + '_' + active.diff] || [];
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
    // 있는지"로 판단한다. 예전엔 선택 난이도로만 봐서, 기본 난이도엔 드랍이 없고
    // 윗 난이도에만 있는 보스가 아예 안 눌리는 것처럼 보였다.
    const hasDrops = _bhpDropDiffs(boss).length > 0;

    return `<div class="bhp-card${boss.monthly ? ' bhp-card--monthly' : ''}">
      <div class="bhp-card__img${hasDrops ? ' bhp-card__img--clickable' : ''}" data-boss="${boss.name}" title="${hasDrops ? '클릭: 획득 가능한 아이템 보기' : ''}">${imgHtml}</div>
      <div class="bhp-card__body">
        <div class="bhp-card__top">
          <div class="bhp-name-row">
            <div class="bhp-card__name"><span class="bhp-card__name-t">${active.nameOverride || boss.name}</span></div>
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

  _bhpFitNames();

  container.querySelectorAll('.bhp-diff-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      bossHPActiveDiffs[sel.dataset.boss] = sel.value;
      renderBossHPTable();
    });
  });

  container.querySelectorAll('.bhp-card__img--clickable').forEach(el => {
    el.addEventListener('click', () => {
      const boss = groups.find(g => g.name === el.dataset.boss);
      if (boss) _bhpOpenDropsModal(boss);
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
// 큐브는 데이터가 1.1MB라 탭을 열 때만 불러와 초기화한다(cube.js의 ensureCubeReady, navigateTo에서 호출)
