/* ═══════════════════════════════════════════════
   메운디 (메이플운빨디펜스) — Night Troupe 2026 Go Go Sidekick 치트시트 한국어판

   원본: https://nighttroupe.netlify.app/ (2026-09-30 갱신본)
   스쿼드 표기 "S10"은 랭크 S, 올릴 레벨 10. "?"는 레벨 미기록. 끝에 "*"가
   붙은 건 원본에서 점선으로 표시된 근소/갈린 결과. 순서는 빨강·검정·노랑.
   확정 항목은 원본의 Confirmed, 제보 항목은 Reported(반복 테스트 전)이며
   원본 값을 그대로 옮겼다 — 임의로 고치거나 추정해 채우지 말 것.
   ═══════════════════════════════════════════════════════════ */

const MU_CONFIRMED = [
  { roll: 3,  wave: 1, squads: ['S10 B10 B3*', 'A10 S10 C3', 'B3 S10 A10', 'A10 C3 S10', 'C3 A10 S10'] },
  { roll: 6,  wave: 2, squads: ['A9 S10 B0', 'B0 A9 S10', 'B0 S10 A9*'] },
  { roll: 7,  wave: 3, squads: ['S10 A8 B0', 'S10 B0 A8', 'A8 S10 A0', 'A8 B0 S10'] },
  { roll: 8,  wave: 3, squads: ['S10 A0 A7', 'A7 A0 S10'] },
  { roll: 10, wave: 4, squads: ['S10 S5 B0', 'S10 B0 S5', 'B0 S5 S10'] },
  { roll: 11, wave: 5, squads: ['S10 S3 S1*'] },
];

const MU_WAVE10 = [
  { roll: 8, wave: 3, squads: ['S10 B0 B7', 'B7 S10 B0', 'B7 B0 S10'] },
];

const MU_REPORTED = [
  { head: '풀클리어', squads: ['B10 B10 C10', 'B10 C10 C8!최저 제보', 'A10 D3 C10', 'A10 D8 E2!최저 제보'] },
  { head: '웨이브 10 · 8롤까지', squads: ['A10 A7 B0', 'A10 B0 A7', 'B0 A7 A10', 'S? C? C?!레벨 미기록', 'C? C? S?!레벨 미기록', 'S? D? D?!레벨 미기록'] },
  { head: '실패 사례', squads: ['A? A? A?!6롤 기준 웨이브 10, 적 약 10마리 남음', 'B3 B10 S10!3롤 기준 풀클리어까지 적 2마리 부족'] },
];

const MU_STEPS = [
  '주간 보상으로 스킬 강화를 선택하면 솔 에르다 조각으로 받는다. 주간 초기화 전까지 변경할 수 없다.',
  '자기 레벨과 20 이내 차이 나는 몬스터가 있는 맵에서 사이드킥 호출기를 열고 사냥해 게이지를 채운다. GO를 누르면 사이드킥이 소환되고 S부터 E까지 랭크가 랜덤으로 정해진다.',
  '스쿼드는 호출기 창 안에서 웨이브를 알아서 싸운다. 유저는 계속 사냥하면 되고, 300킬마다 레인저 포인트가 쌓여 60초마다 상호작용 키로 수령한다.',
  '포인트는 레벨업이나 추가 롤에 쓴다. 레벨업은 사이드킥의 분홍 화살표로 최대 10까지, 추가 롤은 GO로 더 좋은 랭크를 노린다. 롤 1회는 레벨 약 1개 값이라 롤할수록 레벨을 포기하는 셈이다.',
  '못 잡은 적은 다음 웨이브로 넘어가고, 적이 50마리가 되면 종료된다. 클리어한 최고 웨이브로 보상이 정해진다. 웨이브 10은 250조각, 전체 클리어는 500조각.',
  'X로 런을 포기하고 다시 시작할 수 있고 하루 최대 10회다. 보상은 NPC에게 하루 1번, 주 3번 수령하며 수령하면 그날 런이 끝나므로 충분히 시도한 뒤에 받는다.',
];

const MU_STRATEGY = [
  ['S가 아직 없음', '계속 롤하면서 롤 수를 센다.'],
  ['첫 S가 나옴', '무조건 먼저 10레벨까지 올린다. 이것만으로 웨이브 7 정도까지 간다.'],
  ['치트시트에 있는 조합', '롤을 멈추고 포인트를 전부 레벨업에 쓴다. S 먼저, 그다음 A 또는 두 번째 S.'],
  ['S와 B 두 개', '웨이브 10은 확정. 8롤까지 A, 10롤까지 두 번째 S를 노려볼 수 있다.'],
  ['아직 롤 중', 'B는 레벨을 올리지 않는다. 레벨은 올린 시점의 랭크 기준으로 고정돼서 슬롯이 나중에 승급해도 그대로다.'],
  ['두 슬롯이 동점', '빨강, 노랑, 검정 순으로 올린다.'],
  ['포인트가 가득 참', '바로 수령한다. 치트시트의 조합은 모두 지연 없이 수령한다는 전제다.'],
  ['6롤까지 S, A 없음', '시간이 아까우면 재시작. 이후엔 몇 롤 안에 S 두 개나 S와 A 두 개가 떠야 한다.'],
  ['10롤까지 S 없음', '재시작.'],
  ['수령일 정하기', '매번 풀클리어를 목표로 한다. 수요일 초기화까지 남은 일수가 남은 수령 횟수와 같을 때만 타협한다.'],
];

const MU_LEVELS = [
  [3, '10+10+3', 1], [4, '10+10+2', 1], [5, '10+10+1', 2], [6, '10+9', 2], [7, '10+8', 3],
  [8, '10+7', 3], [9, '10+6', 4], [10, '10+5', 4], [11, '10+3+1', 5], [12, '10+2', 5],
];

let _muTab = 'sheet';

function _muSquadHtml(code) {
  let [body, note] = code.split('!');
  const shaky = body.endsWith('*');
  if (shaky) body = body.slice(0, -1);
  const tiles = body.split(' ').map((t, i) => {
    const rank = t[0], lv = t.slice(1);
    const cls = ['r', 'k', 'y'][i];
    return `<div class="mu-u mu-u--${cls}"><b>${rank}</b><span${lv === '0' ? ' class="mu-zero"' : ''}>${lv}</span></div>`;
  }).join('');
  return `<div class="mu-card${shaky ? ' mu-card--shaky' : ''}"${shaky ? ' title="근소하거나 결과가 갈린 조합"' : ''}><div class="mu-units">${tiles}</div>${note ? `<div class="mu-note">${note}</div>` : ''}</div>`;
}

function _muRowsHtml(rows) {
  return rows.map(r => `
    <div class="mu-row">
      <div class="mu-head">${r.roll != null ? `<span class="mu-node">${r.roll}</span><span class="mu-wave">웨이브 ${r.wave}</span>` : `<span class="mu-wave">${r.head}</span>`}</div>
      <div class="mu-cards">${r.squads.map(_muSquadHtml).join('')}</div>
    </div>`).join('');
}

function _muSheetHtml() {
  return `
    <div class="mu-keys">
      <span class="mu-chip mu-chip--r">빨강 왼쪽</span>
      <span class="mu-chip mu-chip--k">검정 가운데</span>
      <span class="mu-chip mu-chip--y">노랑 오른쪽</span>
      <span class="mu-chip">레벨 우선 S, 동점은 빨강 노랑 검정</span>
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="mu-badge mu-badge--ok">확정</span><span class="card__title" style="margin:0">풀클리어</span><span class="mu-pay">솔 에르다 조각 500</span></div>
      ${_muRowsHtml(MU_CONFIRMED)}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="mu-badge mu-badge--ok">확정</span><span class="card__title" style="margin:0">웨이브 10</span><span class="mu-pay">솔 에르다 조각 250</span></div>
      ${_muRowsHtml(MU_WAVE10)}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="mu-badge mu-badge--warn">제보</span><span class="card__title" style="margin:0">미확인</span></div>
      ${_muRowsHtml(MU_REPORTED)}
    </div>`;
}

function _muGuideHtml() {
  return `
    <div class="card mt16">
      <div class="card__title">진행 방식</div>
      <ol class="mu-steps">${MU_STEPS.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>
    <div class="card mt16">
      <div class="card__title">상황별 행동</div>
      ${MU_STRATEGY.map(([when, what]) => `<div class="mu-st"><b>${when}</b><span>${what}</span></div>`).join('')}
    </div>
    <div class="card mt16">
      <div class="card__title">롤별 살 수 있는 레벨</div>
      ${MU_LEVELS.map(([roll, lv, wave]) => `<div class="sf-res-item"><span class="sf-res-label">${roll}롤 · 웨이브 ${wave}</span><span class="sf-res-val">${lv}</span></div>`).join('')}
    </div>`;
}

function _muRender() {
  const body = document.getElementById('muBody');
  if (!body) return;
  body.innerHTML = _muTab === 'sheet' ? _muSheetHtml() : _muGuideHtml();
  document.querySelectorAll('#sec-meundi .sf-tab').forEach(t => t.classList.toggle('active', t.dataset.mutab === _muTab));
}

function initMeundi() {
  const sec = document.getElementById('sec-meundi');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">메운디</h2></div>
    <div class="sf-tabs">
      <button class="sf-tab active" data-mutab="sheet">치트시트</button>
      <button class="sf-tab" data-mutab="guide">가이드</button>
    </div>
    <div id="muBody"></div>`;
  sec.querySelectorAll('.sf-tab').forEach(t => t.addEventListener('click', () => { _muTab = t.dataset.mutab; _muRender(); }));
  _muRender();
}
