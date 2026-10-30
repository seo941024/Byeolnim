/* ═══════════════════════════════════════════════
   의문의 결계 시뮬레이터 — 한국 서버 챌린저스 월드 이벤트, 동남아 서버 이름 Mysterious Barrier
   결계 제어봉 하나로 결계를 한 번 해제하면, 챌린저스 티어에 맞는 결계에서 다섯 희귀도 중 하나의 결계의 핵이 나온다.
   장착한 핵은 결계 에너지로 최대 12단계까지 강화하고, 쓰지 않는 핵은 결계 에너지로 추출한다.
   - 결계 해제 탭: 나온 핵을 세고, 모두 1단계로 추출했을 때 얻는 에너지를 더한다
   - 핵 강화 탭: 고른 핵을 1단계부터 강화한다. 실패하면 단계는 그대로이고 에너지만 쓴다. 공지에는 없고 지수 확인
   - 확률·비용 표 탭: 아래 표를 그대로 보여 준다

   출처
   - 결계 단계별 핵 확률, 강화 성공 확률과 에너지 소모량, 추출 에너지: 넥슨 공지 클라이언트 1.2.410 업데이트 안내 이벤트,
     2025-12-18. 테스트월드 업데이트 144, 메애기 표와 같다
   - 레전드리 추출은 공지에 1단계 값만 있다. 더 높은 희귀도가 없어 강화한 레전드리가 추출될 일이 없기 때문이다
   - 핵 능력치: 메애기 의문의 결계 시뮬레이터 표. 공식 공지에는 수치가 없다
   - 그림: GMS v.270 게임 파일에서 오프라인으로 옮긴 그림, images/mysticseal/official/. 원래 크기 그대로 두고 화면에서만 정수 배율로 키운다
     · 제어봉: UI/UIWindowEvent3.img/2506MysticSeal/unlock의 button:unlock·button:unlockAll 버튼 그림.
       제어봉만 따로 된 그림이 없어, 바탕색이 다른 두 버튼에서 똑같은 제어봉 픽셀만 떼어 냈다
     · 결계 에너지·메뉴 아이콘: 같은 곳 extract/layer:energyIcon
     · 결계의 핵: info/inventoryIcon, 큰 그림은 info/equipIcon
     · 챌린저스 티어: 챌린저스 월드 시즌 1 훈장 아이템 iconRaw 도트 그림. 브론즈 1143408, 골드 1143410, 에메랄드 1143411,
       다이아몬드 1143412. 시즌 2·3 훈장에는 시즌 숫자가 박혀 있어 숫자 없는 시즌 1을 쓴다(지수 요청).
       시즌 1에는 마스터가 없어, 마스터는 시즌 2 마스터 훈장 1143465에서 오른쪽 아래 숫자 자리 12×14칸을
       좌우 대칭인 왼쪽 칸으로 덮은 그림이다. 게임 원본 그대로가 아닌 것은 이 한 장뿐이다
   확률은 정수로 계산한다. 핵 확률은 0.001% 단위, 강화 확률은 0.1% 단위다
   ═══════════════════════════════════════════════════════════ */

const MS_CORES = [
  { name: '희미한', grade: '노멀' },
  { name: '안정된', grade: '레어' },
  { name: '응축된', grade: '에픽' },
  { name: '찬란한', grade: '유니크' },
  { name: '심연의', grade: '레전드리' },
];
/* 챌린저스 티어 → 해제하는 결계. prob은 노멀부터 레전드리까지, 합 100000.
   공지의 해제 조건은 골드 미만·골드 이상·에메랄드 이상·다이아몬드 이상·마스터 이상이다. 화면에는 지수 요청으로
   미만·이상을 빼고 배지 그림의 티어 이름만 적고, 조건은 버튼에 마우스를 올리면 나오는 title에 둔다 */
const MS_TIERS = [
  { label: '브론즈',     cond: '골드 미만',       barrier: '1단계 초소형', badge: 'px_tier_bronze', prob: [67490, 30450, 2030, 23, 7] },
  { label: '골드',       cond: '골드 이상',       barrier: '2단계 소형',   badge: 'px_tier_gold', prob: [52600, 31400, 15700, 250, 50] },
  { label: '에메랄드',   cond: '에메랄드 이상',   barrier: '3단계 중형',   badge: 'px_tier_emerald', prob: [49950, 29950, 14950, 5050, 100] },
  { label: '다이아몬드', cond: '다이아몬드 이상', barrier: '4단계 대형',   badge: 'px_tier_diamond', prob: [0, 29950, 62880, 6650, 520] },
  { label: '마스터',     cond: '마스터 이상',     barrier: '5단계 초대형', badge: 'px_tier_master', prob: [0, 0, 91850, 7100, 1050] },
];
// 강화 Lv.n → n+1 성공 확률. 모든 희귀도가 같다
const MS_SUCC = [1000, 900, 800, 750, 500, 200, 100, 60, 40, 20, 7];
// 강화 Lv.n → n+1 한 번 시도할 때 에너지 소모량, 희귀도별
const MS_COST = [
  [2, 3, 3, 4, 5, 10, 14, 18, 22, 26, 30],
  [4, 5, 6, 8, 10, 20, 28, 36, 44, 52, 60],
  [6, 8, 9, 12, 15, 30, 42, 54, 66, 78, 90],
  [8, 10, 12, 16, 20, 40, 56, 72, 88, 104, 120],
  [15, 18, 23, 30, 38, 75, 105, 135, 165, 195, 225],
];
// 추출 에너지, 희귀도별 Lv.1~12
const MS_EXTRACT = [
  [4, 6, 9, 12, 17, 25, 65, 180, 419, 855, 1896, 5326],
  [8, 12, 16, 23, 32, 48, 128, 352, 832, 1712, 3792, 10649],
  [15, 20, 27, 37, 50, 75, 194, 530, 1250, 2570, 5688, 16012],
  [50, 57, 66, 78, 96, 128, 288, 736, 1695, 3455, 7616, 21330],
  [150],
];
/* 핵 능력치. 희귀도가 하나 오를 때마다 6단계씩 올라간 자리에서 이어져서, 희귀도 r의 Lv.n은 6r + n번째 줄이다.
   예를 들어 희미한 Lv.7과 안정된 Lv.1이 같은 줄이다.
   줄마다 주스탯, 제논 주스탯, 데몬어벤져 주스탯, 부스탯, 공격력·마력, 주스탯 %, 제논 주스탯 %.
   부스탯과 공격력·마력은 메애기 표와 나무위키 모두 직업 구분 없이 한 값이라 모든 직업에 같이 적는다.
   제논은 세 스탯이 모두 주스탯이라 부스탯이 없고, 데몬어벤져 주스탯 %는 값이 없어 -로 적는다 */
const MS_STATS = [
  [24, 16, 1200, 20, 2, 2, 2],    [26, 17, 1300, 22, 2, 2, 2],    [28, 19, 1400, 24, 2, 2, 2],
  [30, 20, 1500, 24, 2, 2, 2],    [32, 21, 1600, 26, 2, 2, 2],    [34, 22, 1700, 26, 2, 4, 4],
  [34, 24, 1700, 26, 2, 4, 4],    [36, 25, 1800, 28, 2, 4, 4],    [38, 25, 1900, 28, 2, 6, 5],
  [38, 25, 1900, 28, 2, 8, 6],    [38, 25, 1900, 28, 2, 9, 7],    [38, 25, 1900, 28, 2, 10, 8],
  [40, 27, 2000, 30, 3, 10, 8],   [40, 27, 2000, 30, 6, 10, 8],   [40, 27, 2000, 30, 6, 12, 9],
  [49, 33, 2450, 39, 8, 12, 9],   [49, 33, 2450, 39, 8, 13, 10],  [49, 33, 2450, 40, 15, 13, 10],
  [49, 33, 2450, 40, 16, 13, 10], [52, 36, 2600, 48, 24, 13, 10], [52, 36, 2600, 48, 24, 16, 13],
  [52, 36, 2600, 48, 24, 18, 15], [55, 40, 2750, 55, 32, 18, 15], [55, 40, 2750, 55, 32, 20, 17],
  [65, 45, 3250, 65, 40, 20, 17], [65, 45, 3250, 65, 42, 22, 19], [75, 50, 3750, 75, 50, 25, 22],
  [75, 50, 3750, 75, 50, 27, 24], [82, 55, 4100, 82, 62, 27, 24], [82, 55, 4100, 82, 68, 27, 24],
  [95, 60, 4750, 90, 75, 27, 24], [95, 60, 4750, 90, 75, 30, 27], [95, 60, 4750, 90, 75, 33, 30],
  [97, 65, 4850, 90, 86, 36, 33], [97, 65, 4850, 90, 100, 36, 33], [105, 70, 5250, 90, 116, 40, 36],
];
const MS_MAX_LV = 12;
const MS_BULK = [10, 100, 1000];   // 한 번에 해제할 제어봉 개수
const MS_LOG_MAX = 200;
const MS_AUTO_MAX = 1000000;

const _msImg = n => `images/mysticseal/official/${n}.png`;
// big이면 장착 칸의 큰 핵 그림을 쓴다
const _msCoreImg = (r, cls = 'ms-core', big = false) => `<img class="${cls}" src="${_msImg('core' + (r + 1) + (big ? '_big' : ''))}" alt="">`;
const _msEnergy = n => `<img class="ms-ico ms-ico--energy" src="${_msImg('energy')}" alt="">${n.toLocaleString()}`;
const _msCoreName = r => `<span class="ms-g" data-g="${r}">${MS_CORES[r].name} 결계의 핵</span>`;
const _msPct = p => `${(p / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })}%`;
const _msSuccPct = s => `${s / 10}%`;

let _msTab = 'draw', _msTier = 2, _msBulk = 100, _msTarget = 7;
const _msDrawFresh = () => ({ rods: 0, got: [0, 0, 0, 0, 0], energy: 0, log: [] });
const _msEnhFresh = core => ({ core, lv: 1, tries: 0, spent: 0, log: [] });
let _msD = _msDrawFresh(), _msE = _msEnhFresh(4);

// 0 이상 100000 미만 정수 하나를 뽑아, 희귀도별 확률 칸을 앞에서부터 빼 나가며 들어간 칸을 고른다
function _msDrawOne() {
  const prob = MS_TIERS[_msTier].prob;
  let x = Math.floor(Math.random() * 100000), r = 0;
  while (x >= prob[r]) x -= prob[r++];
  _msD.rods++;
  _msD.got[r]++;
  _msD.energy += MS_EXTRACT[r][0];
  _msD.log.unshift({ n: _msD.rods, r });
  if (_msD.log.length > MS_LOG_MAX) _msD.log.length = MS_LOG_MAX;
  return r;
}

function _msEnhOne() {
  const e = _msE;
  if (e.lv >= MS_MAX_LV) return;
  const ok = Math.random() * 1000 < MS_SUCC[e.lv - 1];
  e.tries++;
  e.spent += MS_COST[e.core][e.lv - 1];
  e.log.unshift({ n: e.tries, from: e.lv, ok });
  if (e.log.length > MS_LOG_MAX) e.log.length = MS_LOG_MAX;
  if (ok) e.lv++;
}

// 자동 상한은 초기화 없이 여러 번 돌려도 걸리지 않게 누적이 아니라 이번 실행에서 쓴 개수로 본다
let _msRun = 0;
const _msDrawAuto = createAutoRunner({
  btnId: 'msDrawAuto', idleLabel: '레전드리 나올 때까지 [A]', runLabel: '중지 [A]', batch: 300,
  onStart: () => { _msRun = 0; },
  tick: () => {
    if (_msDrawOne() === 4) return 'done';
    if (++_msRun >= MS_AUTO_MAX) return 'max';
  },
  maxMsg: () => `제어봉 ${MS_AUTO_MAX.toLocaleString()}개를 써도 레전드리가 나오지 않아 멈췄습니다.`,
  render: () => _msRender(),
});

const _msEnhAuto = createAutoRunner({
  btnId: 'msEnhAuto', idleLabel: '목표까지 자동 [A]', runLabel: '중지 [A]', batch: 20, delay: 30,
  canStart: () => _msE.lv < _msTarget,
  onStart: () => { _msRun = 0; },
  tick: () => {
    _msEnhOne();
    if (_msE.lv >= _msTarget) return 'done';
    if (++_msRun >= MS_AUTO_MAX) return 'max';
  },
  maxMsg: () => `${MS_AUTO_MAX.toLocaleString()}번을 시도해도 목표에 닿지 않아 멈췄습니다.`,
  render: () => _msRender(),
});

function _msStopAll() { _msDrawAuto.stop(); _msEnhAuto.stop(); }

function _msLogHtml(rows) {
  return `<div class="fam-log">${rows.join('')}</div>`;
}

function _msDrawHtml() {
  const t = MS_TIERS[_msTier], d = _msD;
  return `
    <div class="sf-layout">
      <div class="card">
        <div class="card__title">챌린저스 티어</div>
        <div class="ms-tiers">${MS_TIERS.map((x, i) => `
          <button class="ms-tier${i === _msTier ? ' active' : ''}" type="button" data-ms-tier="${i}" title="${x.cond}">
            <img src="${_msImg(x.badge)}" alt=""><span>${x.label}</span>
          </button>`).join('')}</div>
        <div class="sf-res-item mt16"><span class="sf-res-label">해제할 결계</span><span class="sf-res-val">${t.barrier} 결계</span></div>
        <div class="ms-cores mt8">${MS_CORES.map((c, r) => `
          <div class="ms-chip${t.prob[r] ? '' : ' is-zero'}">
            ${_msCoreImg(r)}<span class="ms-g" data-g="${r}">${c.grade}</span>
            <small>${_msPct(t.prob[r])}</small><b>${d.got[r].toLocaleString()}</b>
          </div>`).join('')}</div>
        <div class="cube-btns mt16"><button class="sbtn sbtn--primary cube-btn-full" type="button" data-ms="draw1">결계 해제 [S]</button></div>
        <div class="ms-row mt8">
          <select class="sel" data-ms-bulk>${MS_BULK.map(n => `<option value="${n}"${n === _msBulk ? ' selected' : ''}>${n.toLocaleString()}개</option>`).join('')}</select>
          <button class="sbtn sbtn--ghost" type="button" data-ms="drawN">한 번에 해제</button>
        </div>
        <div class="cube-btns mt8">
          <button class="sbtn sbtn--ghost cube-btn-full" type="button" id="msDrawAuto" data-ms="drawAuto">${_msDrawAuto.running() ? '중지 [A]' : '레전드리 나올 때까지 [A]'}</button>
          <button class="sbtn sbtn--ghost cube-btn-full mt8" type="button" data-ms="reset">초기화 [R]</button>
        </div>
      </div>
      <div class="card">
        <div class="card__title">누적</div>
        <div class="sf-res-item"><span class="sf-res-label">사용한 제어봉</span><span class="sf-res-val"><img class="ms-ico ms-ico--rod" src="${_msImg('rod')}" alt="">${d.rods.toLocaleString()}개</span></div>
        <div class="sf-res-item"><span class="sf-res-label">모두 추출한 에너지</span><span class="sf-res-val">${_msEnergy(d.energy)}</span></div>
        <div class="card__title mt16">기록</div>
        ${_msLogHtml(d.log.map(e => `
          <div class="fam-log-row${e.r >= 3 ? ' is-hit' : ''}">
            <span class="fam-log-n">${e.n.toLocaleString()}</span>${_msCoreImg(e.r, 'fam-log-icon')}${_msCoreName(e.r)}
          </div>`))}
      </div>
    </div>`;
}

function _msEffectHtml(core, lv) {
  const [main, xenon, da, sub, att, pct, xenonPct] = MS_STATS[core * 6 + lv - 1];
  return `
    <table class="flame-tbl ms-eff">
      <thead><tr><th></th><th>일반</th><th>제논</th><th>데몬어벤져</th></tr></thead>
      <tbody>
        <tr><td class="flame-opt-lbl">주스탯</td><td>+${main}</td><td>+${xenon}</td><td>+${da.toLocaleString()}</td></tr>
        <tr><td class="flame-opt-lbl">부스탯</td><td>+${sub}</td><td>-</td><td>+${sub}</td></tr>
        <tr><td class="flame-opt-lbl">공격력·마력</td><td>+${att}</td><td>+${att}</td><td>+${att}</td></tr>
        <tr><td class="flame-opt-lbl">주스탯 %</td><td>+${pct}%</td><td>+${xenonPct}%</td><td>-</td></tr>
      </tbody>
    </table>`;
}

function _msEnhHtml() {
  const e = _msE, top = e.lv >= MS_MAX_LV, extract = MS_EXTRACT[e.core][e.lv - 1];
  const targets = [];
  for (let lv = 2; lv <= MS_MAX_LV; lv++) targets.push(`<option value="${lv}"${lv === _msTarget ? ' selected' : ''}>목표 Lv.${lv}</option>`);
  return `
    <div class="sf-layout">
      <div class="card">
        <div class="card__title">강화할 핵</div>
        <div class="ms-pick">${MS_CORES.map((c, r) => `
          <button class="${r === e.core ? 'active' : ''}" type="button" data-ms-core="${r}">${_msCoreImg(r)}<span class="ms-g" data-g="${r}">${c.grade}</span></button>`).join('')}</div>
        <div class="ms-now mt16">${_msCoreImg(e.core, 'ms-now__img', true)}<div>${_msCoreName(e.core)}<b>Lv.${e.lv}</b></div></div>
        <div class="sf-res-item mt8"><span class="sf-res-label">성공 확률</span><span class="sf-res-val">${top ? '최대 단계' : _msSuccPct(MS_SUCC[e.lv - 1])}</span></div>
        <div class="sf-res-item"><span class="sf-res-label">에너지 소모량</span><span class="sf-res-val">${top ? '-' : _msEnergy(MS_COST[e.core][e.lv - 1])}</span></div>
        <div class="cube-btns mt16"><button class="sbtn sbtn--primary cube-btn-full" type="button" data-ms="enh1"${top ? ' disabled' : ''}>강화 [S]</button></div>
        <div class="ms-row mt8">
          <select class="sel" data-ms-target>${targets.join('')}</select>
          <button class="sbtn sbtn--ghost" type="button" id="msEnhAuto" data-ms="enhAuto">${_msEnhAuto.running() ? '중지 [A]' : '목표까지 자동 [A]'}</button>
        </div>
        <div class="cube-btns mt8"><button class="sbtn sbtn--ghost cube-btn-full" type="button" data-ms="reset">초기화 [R]</button></div>
      </div>
      <div class="card">
        <div class="card__title">누적</div>
        <div class="sf-res-item"><span class="sf-res-label">시도</span><span class="sf-res-val">${e.tries.toLocaleString()}</span></div>
        <div class="sf-res-item"><span class="sf-res-label">사용한 에너지</span><span class="sf-res-val">${_msEnergy(e.spent)}</span></div>
        ${extract === undefined ? '' : `<div class="sf-res-item"><span class="sf-res-label">지금 추출하면</span><span class="sf-res-val">${_msEnergy(extract)}</span></div>`}
        <div class="card__title mt16">Lv.${e.lv} 효과</div>
        ${_msEffectHtml(e.core, e.lv)}
        <div class="card__title mt16">기록</div>
        ${_msLogHtml(e.log.map(x => `
          <div class="fam-log-row${x.ok ? ' is-hit' : ''}">
            <span class="fam-log-n">${x.n.toLocaleString()}</span>
            <span class="fam-log-line">Lv.${x.from} → ${x.from + 1} · ${_msSuccPct(MS_SUCC[x.from - 1])}</span>
            <span class="ru-log-res ${x.ok ? 'ok' : 'no'}">${x.ok ? '성공' : '실패'}</span>
          </div>`))}
      </div>
    </div>`;
}

function _msTableHtml() {
  const head = MS_CORES.map((c, r) => `<th>${_msCoreImg(r, 'ms-th-img')}<span class="ms-g" data-g="${r}">${c.grade}</span></th>`).join('');
  const lvs = Array.from({ length: MS_MAX_LV }, (_, i) => i);
  return `
    <div class="card">
      <div class="card__title">결계 단계별 핵 확률</div>
      <div class="ms-tbl-wrap"><table class="flame-tbl ms-tbl">
        <thead><tr><th>챌린저스 티어</th><th>결계</th>${head}</tr></thead>
        <tbody>${MS_TIERS.map(t => `<tr>
          <td class="flame-opt-lbl"><img class="ms-badge" src="${_msImg(t.badge)}" alt="">${t.label}</td><td>${t.barrier}</td>
          ${t.prob.map(p => `<td${p ? '' : ' class="flame-t--zero"'}>${_msPct(p)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="card mt16">
      <div class="card__title">강화 성공 확률과 에너지 소모량</div>
      <div class="ms-tbl-wrap"><table class="flame-tbl ms-tbl">
        <thead><tr><th>강화</th><th>성공 확률</th>${head}</tr></thead>
        <tbody>${lvs.slice(0, MS_MAX_LV - 1).map(i => `<tr>
          <td class="flame-opt-lbl">Lv.${i + 1} → ${i + 2}</td><td>${_msSuccPct(MS_SUCC[i])}</td>
          ${MS_COST.map(c => `<td>${c[i]}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="card mt16">
      <div class="card__title">추출 에너지</div>
      <div class="ms-tbl-wrap"><table class="flame-tbl ms-tbl">
        <thead><tr><th>단계</th>${head}</tr></thead>
        <tbody>${lvs.map(i => `<tr>
          <td class="flame-opt-lbl">Lv.${i + 1}</td>
          ${MS_EXTRACT.map(x => x[i] === undefined ? '<td class="flame-t--zero">-</td>' : `<td>${x[i].toLocaleString()}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function _msRender() {
  const body = document.getElementById('msBody');
  if (!body) return;
  document.querySelectorAll('.ms-tab').forEach(b => b.classList.toggle('active', b.dataset.mstab === _msTab));
  body.innerHTML = _msTab === 'draw' ? _msDrawHtml() : _msTab === 'enh' ? _msEnhHtml() : _msTableHtml();
}

function _msAction(act) {
  if (act === 'draw1') { _msStopAll(); _msDrawOne(); }
  else if (act === 'drawN') { _msStopAll(); for (let i = 0; i < _msBulk; i++) _msDrawOne(); }
  else if (act === 'drawAuto') { _msEnhAuto.stop(); _msDrawAuto.start(); return; }
  else if (act === 'enh1') { _msStopAll(); _msEnhOne(); }
  else if (act === 'enhAuto') { _msDrawAuto.stop(); _msEnhAuto.start(); return; }
  else if (act === 'reset') {
    _msStopAll();
    if (_msTab === 'draw') _msD = _msDrawFresh();
    else _msE = _msEnhFresh(_msE.core);
  }
  _msRender();
}

function initMysticSeal() {
  const sec = document.getElementById('sec-mysticseal');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">의문의 결계 시뮬레이터</h2></div>
    <div class="sf-tabs">
      <button class="sf-tab ms-tab active" type="button" data-mstab="draw">결계 해제</button>
      <button class="sf-tab ms-tab" type="button" data-mstab="enh">핵 강화</button>
      <button class="sf-tab ms-tab" type="button" data-mstab="table">확률·비용 표</button>
    </div>
    <hr class="sec-sep" />
    <div id="msBody"></div>`;
  sec.querySelectorAll('.ms-tab').forEach(t => t.addEventListener('click', () => {
    if (t.dataset.mstab === _msTab) return;
    _msStopAll();
    _msTab = t.dataset.mstab;
    _msRender();
  }));
  const body = document.getElementById('msBody');
  body.addEventListener('click', e => {
    const tier = e.target.closest('[data-ms-tier]'), core = e.target.closest('[data-ms-core]'), act = e.target.closest('[data-ms]');
    if (tier) { _msDrawAuto.stop(); _msTier = Number(tier.dataset.msTier); _msRender(); }
    else if (core) {
      _msEnhAuto.stop();
      if (Number(core.dataset.msCore) !== _msE.core) _msE = _msEnhFresh(Number(core.dataset.msCore));
      _msRender();
    }
    else if (act && !act.disabled) _msAction(act.dataset.ms);
  });
  body.addEventListener('change', e => {
    if (e.target.matches('[data-ms-bulk]')) _msBulk = Number(e.target.value) || MS_BULK[0];
    if (e.target.matches('[data-ms-target]')) { _msEnhAuto.stop(); _msTarget = Number(e.target.value) || MS_MAX_LV; _msRender(); }
  });
  // S는 한 번, A는 자동, R은 초기화. 표 탭에서는 쓰지 않는다
  bindSimKeys('sec-mysticseal', key => {
    if (_msTab === 'table') return false;
    const act = { s: _msTab === 'draw' ? 'draw1' : 'enh1', a: _msTab === 'draw' ? 'drawAuto' : 'enhAuto', r: 'reset' }[key];
    if (act === 'enh1' && _msE.lv >= MS_MAX_LV) return false;
    _msAction(act);
  });
  _msRender();
}
