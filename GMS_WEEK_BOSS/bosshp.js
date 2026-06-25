/* ═══════════════════════════════════════════════
   보스 HP 카드
═══════════════════════════════════════════════ */
const DIFF_KR_TO_ENG = { '이지':'easy', '노말':'normal', '하드':'hard', '카오스':'chaos', '익스트림':'extreme' };
const bossHPActiveDiffs = {};

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

function renderBossHPTable() {
  const norm = s => s.replace(/\s/g, '');

  // 보스명으로 그룹화 (BOSS_HP_TABLE 순서 유지)
  const groups = [];
  const seen   = {};
  BOSS_HP_TABLE.forEach(b => {
    if (!seen[b.name]) {
      seen[b.name] = { name: b.name, img: '', monthly: false, diffs: [] };
      groups.push(seen[b.name]);
    }
    seen[b.name].diffs.push(b);
  });

  // BOSS_DATA 에서 이미지·월간 여부 매핑
  BOSS_DATA.forEach(bd => {
    const key = Object.keys(seen).find(k => norm(k) === norm(bd.name));
    if (key) { seen[key].img = bd.img; seen[key].monthly = !!bd.monthly; }
  });

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

    // 난이도 select
    const diffOpts = boss.diffs.map(d => {
      const eng = DIFF_KR_TO_ENG[d.diff] || 'normal';
      const meta = DIFF_META[eng] || { label: d.diff };
      return `<option value="${d.diff}"${d.diff === active.diff ? ' selected' : ''}>${meta.label}</option>`;
    }).join('');
    const diffSel = `<select class="bhp-diff-sel" data-boss="${boss.name}">${diffOpts}</select>`;

    // 선택된 난이도 pill
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

    return `<div class="bhp-card${boss.monthly ? ' bhp-card--monthly' : ''}">
      <div class="bhp-card__img">${imgHtml}</div>
      <div class="bhp-card__body">
        <div class="bhp-card__top">
          <div class="bhp-card__name">${active.nameOverride || boss.name}</div>
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

  // 모든 카드 높이를 최대 카드 기준으로 통일
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
