/* ═══════════════════════════════════════════════
   장비 교체 비교 — 장비 A(지금 낀 것) vs 장비 B(바꿀 것)의 스탯을 넣으면
   데미지가 몇 % 늘거나 주는지 계산한다.

   데미지 지수 공식(출처: 나무위키 "메이플스토리/스탯", HANDOFF.md 참고):
     데미지 지수 = 스탯반영치 × 총공격력 × 데미지%총합 × 최종데미지% × 평균크리티컬보정 × 무기상수
   방어율무시·속성내성무시는 몬스터 방어력이라는 별도 입력이 필요해서
   하이퍼스탯 최적화 때와 같은 이유로 뺐다(HANDOFF v2 TODO 참고).

   ⚠️ 무기상수는 무기 종류뿐 아니라 직업별로도 달라진다(예: 스태프는 기본
   1.2지만 모험가 마법사 계열만 해당, 히어로는 한손검이 1.34로 따로 붙음).
   data_gearcompare.js의 표는 나무위키에 직접 적힌 것만 옮겼고, 그 외
   직업 예외는 못 채웠다 — 그래서 드롭다운은 "채우기" 편의용일 뿐이고,
   계산은 항상 입력칸의 실제 숫자를 쓴다(정확한 값을 알면 직접 고쳐 쓰면 됨).
   같은 무기를 계속 쓰면서 잠재·스타포스만 비교하는 경우엔 양쪽 무기상수가
   똑같아서 계산에 영향이 없다 — 굳이 정확히 몰라도 1로 두고 비교해도 무방.
═══════════════════════════════════════════════ */

const GC_FIELDS = [
  { id: 'mainStat', label: '주스탯',            unit: '' },
  { id: 'subStat',  label: '부스탯',            unit: '' },
  { id: 'atk',      label: '공격력',            unit: '' },
  { id: 'atkPct',   label: '공격력 %',          unit: '%' },
  { id: 'dmgPct',   label: '데미지 %',          unit: '%' },
  { id: 'bossPct',  label: '보스 데미지 %',      unit: '%' },
  { id: 'finalPct', label: '최종 데미지 %',      unit: '%' },
  { id: 'critRate', label: '크리티컬 확률 %',    unit: '%' },
  { id: 'critDmg',  label: '크리티컬 데미지 %',  unit: '%' },
];

function gcWeaponOptions() {
  const base = GC_WEAPON_CONST.map(w => `<option value="${w.const}">${gcEsc(w.label)} — ${w.const}</option>`).join('');
  const jobs = GC_JOB_OVERRIDES.map(o => `<option value="${o.const}">${gcEsc(o.label)} — ${o.const}</option>`).join('');
  return `<option value="1">무기 안 바뀜 · 상수 없음(1)</option>${base}${jobs}`;
}

function gcEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }

function gcCardHtml(side, title) {
  const rows = GC_FIELDS.map(f => `
    <div class="hexa-row">
      <span class="hexa-label">${f.label}</span>
      <input class="inp" id="gc${side}_${f.id}" type="number" value="0" step="0.1" />
    </div>`).join('');
  return `
    <div class="card">
      <div class="card__title">${title}</div>
      <div class="hexa-field-group">${rows}</div>
      <div class="hexa-row mt8">
        <span class="hexa-label">무기상수 채우기</span>
        <select class="sel" id="gc${side}_weaponPick">${gcWeaponOptions()}</select>
      </div>
      <div class="hexa-row">
        <span class="hexa-label">무기상수 값</span>
        <input class="inp" id="gc${side}_weaponConst" type="number" value="1" step="0.01" />
      </div>
    </div>`;
}

function gcGetStats(side) {
  const g = id => parseFloat(document.getElementById(`gc${side}_${id}`)?.value) || 0;
  const stats = {};
  GC_FIELDS.forEach(f => { stats[f.id] = g(f.id); });
  stats.weaponConst = parseFloat(document.getElementById(`gc${side}_weaponConst`)?.value) || 1;
  return stats;
}

/* 데미지 지수 = 스탯반영치 × 총공격력 × 데미지%총합 × 최종데미지% × 평균크리티컬보정 × 무기상수 */
function gcDamageIndex(s) {
  const statFactor = s.mainStat * 4 + s.subStat;
  const totalAtk = Math.floor(s.atk * (1 + s.atkPct / 100));
  const dmgTotal = 1 + (s.dmgPct + s.bossPct) / 100;
  const finalDmg = 1 + s.finalPct / 100;
  const critRate = Math.min(100, s.critRate) / 100;
  const critFactor = 1 + critRate * (0.35 + s.critDmg / 100);
  return statFactor * totalAtk * dmgTotal * finalDmg * critFactor * s.weaponConst;
}

function gcCompute() {
  const a = gcGetStats('A');
  const b = gcGetStats('B');
  const ia = gcDamageIndex(a);
  const ib = gcDamageIndex(b);
  const pct = ia > 0 ? ((ib / ia - 1) * 100) : 0;

  const box = document.getElementById('gcResult');
  if (!box) return;
  box.innerHTML = `
    <div class="hexa-result-row"><span class="rl">장비 A 데미지 지수</span><span class="rv">${ia.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
    <div class="hexa-result-row"><span class="rl">장비 B 데미지 지수</span><span class="rv">${ib.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
    <div class="hexa-result-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="rl">B로 바꾸면</span>
      <span class="rv ${pct >= 0 ? 'ok' : 'ng'}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
    </div>
    <div style="margin-top:10px;font-size:.75rem;color:var(--text-sub);line-height:1.6">
      ※ 방어율무시·속성내성무시는 몬스터 방어력이 따로 필요해 이 계산에는
      빠져 있습니다. 무기상수가 정확하지 않아도, 양쪽 장비가 같은 무기라면
      결과(%)에는 영향이 없습니다.
    </div>`;
}

function initGearCompare() {
  const sec = document.getElementById('sec-gearcompare');
  if (!sec) return;

  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">장비 교체 비교</h2></div>

    <div class="sf-layout">
      ${gcCardHtml('A', '장비 A · 지금 낀 것')}
      ${gcCardHtml('B', '장비 B · 바꿀 것')}
    </div>

    <div class="card mt16">
      <button class="sbtn sbtn--primary w100" id="gcBtnCalc">비교하기</button>
      <div id="gcResult" style="margin-top:12px"><p class="empty">양쪽 스탯을 입력하고 비교 버튼을 눌러주세요.</p></div>
    </div>`;

  ['A', 'B'].forEach(side => {
    document.getElementById(`gc${side}_weaponPick`)?.addEventListener('change', e => {
      document.getElementById(`gc${side}_weaponConst`).value = e.target.value;
    });
  });
  document.getElementById('gcBtnCalc').addEventListener('click', gcCompute);
}

initGearCompare();
