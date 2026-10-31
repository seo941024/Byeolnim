/* ═══════════════════════════════════════════════
   하이퍼스탯 최적화 — 남은 포인트를 어느 스탯에 투자해야 데미지가 가장 많이
   느는지 계산한다. 그냥 스탯표만 보여주는 계산기가 아니라 "추천"이 목적이라,
   포인트 하나하나를 그 순간 가장 이득인 스탯에 그리디로 투자하는 방식이다.

   데미지 지수 공식(출처: 나무위키 "메이플스토리/스탯", 2026-09-01 조사 —
   자세한 유도 과정은 HANDOFF.md 참고):
     데미지 지수 = 스탯반영치 × 데미지%총합 × 최종데미지% × 평균크리티컬보정
   여기서는 "같은 캐릭터 안에서 포인트를 어디 쓰는 게 이득인가"라는 상대 비교만
   하므로, 무기상수·몬스터방어력처럼 캐릭터가 안 바뀌면 고정인 값은 계산식
   양쪽에서 똑같이 곱해져 순위에 영향을 안 준다 — 그래서 뺐다.
   방어율무시·속성내성무시는 몬스터 방어력이라는 별도 입력이 필요해서(값에
   따라 순위가 실제로 바뀔 수 있음) v1에서는 제외했다 — HANDOFF.md에 v2로 남김.

   ⚠️ 하이퍼스탯 레벨당 정확한 증가량(크확/크뎀/데미지%/보공%)은 위키가 전부
   이미지이거나 봇 차단이라 이번엔 확정하지 못했다. 아래 기본값은 참고용
   추정치이고, 입력칸에서 직접 정확한 값으로 고쳐 쓸 수 있게 만들었다 — 게임
   안 하이퍼스탯 UI에 정확한 "다음 레벨 증가량"이 그대로 나온다.
═══════════════════════════════════════════════ */

// 그 레벨을 "찍는 데" 드는 포인트. index = 레벨(나무위키 확인, 15레벨 누적 550).
const HS_LEVEL_COST = [0, 1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110];
const HS_MAX_LEVEL = 15;
// 141레벨부터 1레벨마다 포인트 1개
const HS_POINT_START_LEVEL = 140;

// 데미지에 영향 주는 하이퍼스탯 목록 (v1 — 방어율무시/속성내성무시은 몬스터
// 방어력 입력이 따로 필요해서 제외, 위 주석 참고). inc는 편집 가능한 기본 추정치.
const HS_STATS = [
  { id: 'mainStat', label: '주스탯',              unit: '',  inc: 30 },
  { id: 'critRate', label: '크리티컬 확률',        unit: '%', inc: 1.5 },
  { id: 'critDmg',  label: '크리티컬 데미지',      unit: '%', inc: 1 },
  { id: 'dmg',      label: '데미지',               unit: '%', inc: 3 },
  { id: 'bossDmg',  label: '보스 몬스터 공격 시 데미지', unit: '%', inc: 3.5 },
  { id: 'finalDmg', label: '최종 데미지',          unit: '%', inc: 1 },
];

function hsAvailablePoints(charLevel) {
  return Math.max(0, charLevel - HS_POINT_START_LEVEL);
}

function hsGetIncs() {
  const incs = {};
  HS_STATS.forEach(s => {
    const el = document.getElementById('hsInc_' + s.id);
    incs[s.id] = el ? (parseFloat(el.value) || 0) : s.inc;
  });
  return incs;
}

function hsGetBase() {
  const g = id => parseFloat(document.getElementById(id)?.value) || 0;
  return {
    mainStat: g('hsBaseMainStat'),
    subStat:  g('hsBaseSubStat'),
    dmg:      g('hsBaseDmg'),
    bossDmg:  g('hsBaseBossDmg'),
    finalDmg: g('hsBaseFinalDmg'),
    critRate: g('hsBaseCritRate'),
    critDmg:  g('hsBaseCritDmg'),
  };
}

/* 데미지 지수 = 스탯반영치 × 데미지%총합 × 최종데미지% × 평균크리티컬보정
   (무기상수·방어율 등 캐릭터 불변 상수는 상대비교라 약분됨 — 파일 상단 주석 참고) */
function hsDamageIndex(base, incs, levels) {
  const mainStat = base.mainStat + (levels.mainStat || 0) * incs.mainStat;
  const statFactor = mainStat * 4 + base.subStat;

  const dmgTotal = 1 + (base.dmg + (levels.dmg || 0) * incs.dmg
    + base.bossDmg + (levels.bossDmg || 0) * incs.bossDmg) / 100;

  const finalDmg = 1 + (base.finalDmg + (levels.finalDmg || 0) * incs.finalDmg) / 100;

  // 크확은 100%를 넘겨봐야 의미가 없다(이미 다 크리티컬) — 넘는 순간부터는
  // 그 스탯에 더 투자해도 데미지가 안 늘어나야 하므로 여기서 캡을 건다.
  const critRate = Math.min(100, base.critRate + (levels.critRate || 0) * incs.critRate) / 100;
  const critDmg  = (base.critDmg + (levels.critDmg || 0) * incs.critDmg) / 100;
  const critFactor = 1 + critRate * (0.35 + critDmg);

  return statFactor * dmgTotal * finalDmg * critFactor;
}

/* 그리디 배분 — 남은 포인트 안에서 "포인트 1개당 데미지 지수 증가율"이 가장 큰
   스탯을 한 레벨씩 반복 투자한다. 완전탐색 최적해는 아니지만(포인트 규모가
   최대 수백이라 완전탐색은 비현실적), 이 방식은 실제 강화 계산기들이 흔히 쓰는
   방식이고 크확 100% 캡처럼 "더 투자해도 이득이 없어지는" 지점을 정확히 반영한다. */
function hsOptimize() {
  const charLevel = parseInt(document.getElementById('hsCharLevel').value) || 0;
  const totalPoints = hsAvailablePoints(charLevel);
  let remain = totalPoints;
  const base = hsGetBase();
  const incs = hsGetIncs();
  const levels = {};
  HS_STATS.forEach(s => { levels[s.id] = 0; });

  const startIndex = hsDamageIndex(base, incs, levels);
  let curIndex = startIndex;

  let guard = 0;
  while (remain > 0 && guard++ < 3000) {
    let best = null;
    for (const s of HS_STATS) {
      const lvl = levels[s.id];
      if (lvl >= HS_MAX_LEVEL) continue;
      const cost = HS_LEVEL_COST[lvl + 1];
      if (cost > remain) continue;
      const trialLevels = Object.assign({}, levels, { [s.id]: lvl + 1 });
      const gain = hsDamageIndex(base, incs, trialLevels) - curIndex;
      const eff = gain / cost;
      if (eff > 1e-12 && (!best || eff > best.eff)) best = { stat: s, cost, eff };
    }
    if (!best) break;
    levels[best.stat.id] += 1;
    remain -= best.cost;
    curIndex = hsDamageIndex(base, incs, levels);
  }

  hsRenderResult({ totalPoints, remain, levels, startIndex, curIndex });
}

function hsRenderResult(r) {
  const box = document.getElementById('hsResult');
  if (!box) return;
  const gainPct = r.startIndex > 0 ? ((r.curIndex / r.startIndex - 1) * 100) : 0;
  const rows = HS_STATS.map(s => {
    const lvl = r.levels[s.id] || 0;
    if (!lvl) return '';
    return `<div class="hexa-result-row"><span class="rl">${s.label}</span><span class="rv">Lv.${lvl}</span></div>`;
  }).join('');
  box.innerHTML = `
    <div class="hexa-result-row"><span class="rl">가용 포인트</span><span class="rv">${r.totalPoints.toLocaleString()}</span></div>
    <div class="hexa-result-row"><span class="rl">남은 포인트</span><span class="rv">${r.remain.toLocaleString()}</span></div>
    <div class="hx-result-sep"></div>
    <div class="hexa-result-label">추천 배분</div>
    ${rows || '<p class="empty">투자할 포인트가 없습니다.</p>'}
    <div class="hexa-result-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="rl">예상 데미지 증가</span><span class="rv ok">${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%</span>
    </div>
    <div style="margin-top:10px;font-size:.75rem;color:var(--text-sub);line-height:1.6">
      ※ 방어율무시·속성내성무시는 몬스터 방어력에 따라 값이 달라져 이 계산에는
      빠져 있습니다. 하이퍼스탯 레벨당 증가량은 참고용 추정치이니, 게임 내
      하이퍼스탯 화면에서 정확한 값을 확인해 위 입력칸에서 고쳐 쓰면 더
      정확해집니다.
    </div>`;
}

function initHyperStat() {
  const sec = document.getElementById('sec-hyperstat');
  if (!sec) return;

  const incRows = HS_STATS.map(s => `
    <div class="hexa-row">
      <span class="hexa-label">${s.label}</span>
      <input class="inp" id="hsInc_${s.id}" type="number" value="${s.inc}" step="0.1" style="width:90px" />
      <span style="font-size:.78rem;color:var(--text-sub);min-width:14px">${s.unit || ''}</span>
    </div>`).join('');

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">하이퍼스탯 최적화</h2></div>

    <div class="hexa-layout">
      <div class="card">
        <div class="card__title">캐릭터 정보</div>
        <div class="hexa-field-group">
          <div class="hexa-row">
            <span class="hexa-label">캐릭터 레벨</span>
            <input class="inp" id="hsCharLevel" type="number" value="260" min="140" max="300" />
          </div>
        </div>

        <div class="card__title mt16">기본 스탯 · 하이퍼스탯 제외</div>
        <div class="hexa-field-group">
          <div class="hexa-row"><span class="hexa-label">주스탯</span><input class="inp" id="hsBaseMainStat" type="number" value="0" /></div>
          <div class="hexa-row"><span class="hexa-label">부스탯</span><input class="inp" id="hsBaseSubStat" type="number" value="0" /></div>
          <div class="hexa-row"><span class="hexa-label">데미지 %</span><input class="inp" id="hsBaseDmg" type="number" value="0" step="0.1" /></div>
          <div class="hexa-row"><span class="hexa-label">보스 데미지 %</span><input class="inp" id="hsBaseBossDmg" type="number" value="0" step="0.1" /></div>
          <div class="hexa-row"><span class="hexa-label">최종 데미지 %</span><input class="inp" id="hsBaseFinalDmg" type="number" value="0" step="0.1" /></div>
          <div class="hexa-row"><span class="hexa-label">크리티컬 확률 %</span><input class="inp" id="hsBaseCritRate" type="number" value="0" step="0.1" /></div>
          <div class="hexa-row"><span class="hexa-label">크리티컬 데미지 %</span><input class="inp" id="hsBaseCritDmg" type="number" value="0" step="0.1" /></div>
        </div>

        <div class="card__title mt16">하이퍼스탯 레벨당 증가량 · 수정 가능</div>
        <div class="hexa-field-group">${incRows}</div>

        <button class="sbtn sbtn--primary w100 mt16" id="hsBtnCalc">최적 배분 계산</button>
      </div>

      <div class="card" id="hsResultCard">
        <div class="card__title">계산 결과</div>
        <div id="hsResult" style="margin-top:10px"><p class="empty">캐릭터 레벨과 기본 스탯을 입력하고 계산 버튼을 눌러주세요.</p></div>
      </div>
    </div>`;

  document.getElementById('hsBtnCalc').addEventListener('click', hsOptimize);
}

initHyperStat();
