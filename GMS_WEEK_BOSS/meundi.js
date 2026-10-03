/* ═══════════════════════════════════════════════
   메운디 (메이플운빨디펜스) — Night Troupe 2026 Go Go Sidekick 치트시트 한국어판

   원본: https://nighttroupe.netlify.app/ (2026-09-30 갱신본)
   스쿼드 표기 "S10"은 랭크 S, 올릴 레벨 10. "?"는 레벨 미기록. 끝에 "*"가
   붙은 건 원본에서 점선이나 별표로 표시된 근소/빡빡한 조합. 순서는 빨강, 검정, 노랑.
   확정 항목은 원본의 Confirmed, 제보 항목은 Reported이며 원본 값을 그대로
   옮겼다 — 임의로 고치거나 추정해 채우지 말 것.
   파란 테두리(rep:) 카드는 원본이 아니라 디시 GMS 히로익 갤러리에서 사용자가 사진 있는 글만 모아 준 단일 제보다.
   슬롯 순서는 글에 적힌 순서를 그대로 썼고 확인된 게 아니다.
   원본 풀클리어 제보 중 B10 B10 C10, B10 C10 C8은 레벨 합이 가능한 최대치를 넘고,
   A10 D8 E2와 A10 D3 C10은 S가 없어서 뺐다.
   용어: 원본의 roll은 문맥에 따라 뽑기, 뽑는다 등으로, run은 도전으로 옮긴다.
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

/* 제보 조합. 뽑기 횟수는 적지 않고 _muMerge가 레벨 합계로 계산해 해당 행에 넣는다.
   풀클리어는 S가 없으면 불가능해서 S가 없는 조합은 넣지 않는다. 표기는 마지막 편성의 슬롯 순서와 레벨이다.
   아래 두 목록은 갤러리에서 사진이 있는 제보만 모은 것이다. */
const MU_FULL_REPORTED = [
  'S10 D1 S10', 'A10 D1 S10', 'A10 S10 C1', 'S10 S9 D0', 'A10 S10 E1',
  'B7 C0 S10', 'E0 S8 S10', 'S10 C1 A10', 'S10 E0 S8', 'B0 S8 S10',
  'S10 S9 B0', 'S10 A9 B0', 'S10 C0 S7', 'S10 S5 B0', 'E0 S9 S10',
  'S10 A10 C2', 'S10 A10 D1',
];

const MU_WAVE10_REPORTED = [
  'S10 C0 A8', 'A9 S10 E0', 'S10 A5 B4', 'S10 C0 A7', 'S10 B0 A8',
  'D0 S6 S10', 'A7 C0 S10', 'B0 A6 S10', 'S10 D0 A6', 'B5 S10 B4',
  'S10 B0 A7', 'S10 D0 A9', 'A7 E0 S10', 'S10 A9 D0', 'C0 A9 S10',
];

/* 게이지 계산. 뽑기 1회는 150, 레벨 n에서 n+1로 올리는 강화는 100 + 5n이다. 등급과 무관하다.
   총량 3300은 사용자가 준 규칙을 원본 표(MU_LEVELS 전 행)에 대 보니 이 값에서 전부 맞아서 쓴다.
   표에서 가능한 범위는 3300 이상 3330 미만이고 직접 확인된 값이 아니다. */
const MU_ROLL_COST = 150, MU_UP_BASE = 100, MU_UP_STEP = 5, MU_GAUGE_CAP = 3300;

const MU_REPORTED = [
  { head: '웨이브 10 · 뽑기 8회까지', squads: ['A10 A7 B0', 'A10 B0 A7', 'B0 A7 A10', 'S? C? C?!레벨 미기록', 'C? C? S?!레벨 미기록', 'S? D? D?!레벨 미기록'] },
  { head: '실패 사례', squads: ['A10 A0 A9!뽑기 6회 기준 웨이브 10, 적 약 10마리 남음', 'B3 B10 S10!뽑기 3회 기준 풀클리어까지 적 2마리 부족', 'S10 E1 C10!뽑기 4회 기준 웨이브 10, 적 5마리 남음, 갤러리 후기'] },
];

const MU_STEPS = [
  '주간 보상으로 스킬 강화를 선택하면 솔 에르다 조각으로 받습니다. 주간 초기화 전까지 변경할 수 없습니다.',
  '자신과 레벨 차이가 20 이내인 몬스터가 있는 맵에서 사이드킥 호출기를 열고 사냥해 게이지를 채웁니다. GO를 누르면 사이드킥이 소환되고 S부터 E까지 랭크가 랜덤으로 정해집니다.',
  '스쿼드는 호출기 창 안에서 웨이브를 알아서 싸웁니다. 유저는 계속 사냥하면 되고, 300킬마다 레인저 포인트가 쌓여 60초마다 상호작용 키로 수령합니다.',
  '포인트는 레벨업이나 추가 뽑기에 씁니다. 레벨업은 사이드킥의 분홍 화살표로 최대 10까지, 추가 뽑기는 GO로 더 좋은 랭크를 노립니다. 뽑기 1회는 레벨 약 1개 값이라 뽑을수록 레벨을 포기하는 셈입니다.',
  '못 잡은 적은 다음 웨이브로 넘어가고, 적이 50마리가 되면 종료됩니다. 클리어한 최고 웨이브로 보상이 정해지며 웨이브 10은 250조각, 전체 클리어는 500조각입니다.',
  'X로 도전 횟수를 소모하고 다시 시작할 수 있으며 하루 최대 10회입니다. 보상은 NPC에게 하루 1번, 주 3번 수령하며 수령하면 그날은 도전이 불가능하므로 충분히 시도한 뒤에 받습니다.',
];

const MU_STRATEGY = [
  ['S가 아직 없음', '계속 뽑으면서 횟수를 셉니다.'],
  ['첫 S가 나옴', '무조건 먼저 10레벨까지 올립니다. 이것만으로 웨이브 7 정도까지 갑니다.'],
  ['치트시트에 있는 조합', '뽑기를 멈추고 포인트를 전부 레벨업에 씁니다. S 먼저, 그다음 A 또는 두 번째 S입니다.'],
  ['S와 B 두 개', '웨이브 10은 확정입니다. 뽑기 8회까지 A, 10회까지 두 번째 S를 노려볼 수 있습니다.'],
  ['아직 뽑는 중', 'B는 레벨을 올리지 않습니다. 레벨은 올린 시점의 랭크 기준으로 고정되어 슬롯이 나중에 승급해도 그대로입니다.'],
  ['두 슬롯이 동점', '빨강, 노랑, 검정 순으로 올립니다.'],
  ['포인트가 가득 참', '바로 수령합니다. 치트시트의 조합은 모두 지연 없이 수령한다는 전제입니다.'],
  ['뽑기 6회까지 S, A 없음', '시간이 아까우면 재시작합니다. 이후에는 몇 번 안에 S 두 개나 S와 A 두 개가 떠야 합니다.'],
  ['뽑기 10회까지 S 없음', '재시작합니다.'],
  ['수령일 정하기', '매번 풀클리어를 목표로 합니다. 수요일 초기화까지 남은 일수가 남은 수령 횟수와 같을 때만 타협합니다.'],
];

const MU_LEVELS = [
  [3, '10+10+3', 1], [4, '10+10+2', 1], [5, '10+10+1', 2], [6, '10+9', 2], [7, '10+8', 3],
  [8, '10+7', 3], [9, '10+6', 4], [10, '10+5', 4], [11, '10+3+1', 5], [12, '10+2', 5],
];

let _muTab = 'sheet';

const _muUpCost = lv => MU_UP_BASE * lv + MU_UP_STEP * lv * (lv - 1) / 2;

/* 레벨 합계를 쓰고 남은 게이지로 뽑을 수 있는 최대 횟수. 레벨이 "?"면 계산할 수 없어 null. */
function _muLastRoll(code) {
  const lvs = code.split('!')[0].replace('*', '').split(' ').map(t => parseInt(t.slice(1), 10));
  if (lvs.some(Number.isNaN)) return null;
  const spend = lvs.reduce((s, lv) => s + _muUpCost(lv), 0);
  return Math.floor((MU_GAUGE_CAP - spend) / MU_ROLL_COST);
}

/* 확정 행에 제보를 뽑기 횟수별로 합친다. 없는 횟수는 행을 새로 만들고 웨이브는 MU_LEVELS 표를 따른다.
   처음 세 번이 기본이라 3회 미만이 나오면 불가능한 조합으로 보고 뺀다. 같은 조합이 이미 그 행에 있으면 넣지 않는다.
   레벨 미기록은 맨 아래 제보 행에 둔다. 제보 카드는 앞에 rep:를 붙여 구분한다. */
const _muKey = code => code.split('!')[0].replace('*', '');

function _muMerge(base, reported, needS) {
  const rows = base.map(r => ({ ...r, squads: [...r.squads] }));
  const unknown = [];
  reported.forEach(code => {
    if (needS && !/S/.test(_muKey(code).replace(/[0-9?]/g, ''))) { console.warn('[meundi] S가 없어 제외', code); return; }
    const roll = _muLastRoll(code);
    if (roll == null) { unknown.push('rep:' + code); return; }
    if (roll < 3) { console.warn('[meundi] 레벨 합이 게이지를 넘어 제외', code); return; }
    let row = rows.find(r => r.roll === roll);
    if (!row) {
      row = { roll, wave: (MU_LEVELS.find(l => l[0] === roll) || [])[2], squads: [] };
      rows.push(row);
      rows.sort((a, b) => a.roll - b.roll);
    }
    if (row.squads.some(s => _muKey(s.replace(/^rep:/, '')) === _muKey(code))) return;
    row.squads.push('rep:' + code);
  });
  if (unknown.length) rows.push({ head: '제보', squads: unknown });
  return rows;
}

function _muSquadHtml(code) {
  const rep = code.startsWith('rep:');
  if (rep) code = code.slice(4);
  let [body, note] = code.split('!');
  const shaky = body.endsWith('*');
  if (shaky) body = body.slice(0, -1);
  const tiles = body.split(' ').map((t, i) => {
    const rank = t[0], lv = t.slice(1);
    const cls = ['r', 'k', 'y'][i];
    const team = ['Red', 'Black', 'Yellow'][i];
    return `<div class="mu-u mu-u--${cls}"><img src="images/meundi/${team}_${rank}.png?v=20261003b" alt="${rank}" width="46" height="46"><span${lv === '0' ? ' class="mu-zero"' : ''}>Lv. ${lv}</span></div>`;
  }).join('');
  return `<div class="mu-card${shaky ? ' mu-card--shaky' : ''}${rep ? ' mu-card--rep' : ''}"${shaky ? ' title="근소하거나 결과가 갈린 조합"' : rep ? ' title="단일 제보"' : note ? ` title="${note}"` : ''}><div class="mu-units">${tiles}</div></div>`;
}

function _muRowsHtml(rows) {
  return rows.map(r => `
    <div class="mu-row">
      <div class="mu-head">${r.roll != null ? `<span class="mu-roll">뽑기 횟수 : ${r.roll}</span><span class="mu-wave">웨이브 ${r.wave}</span>` : `<span class="mu-wave">${r.head}</span>`}</div>
      <div class="mu-cards">${r.squads.map(_muSquadHtml).join('')}</div>
    </div>`).join('');
}

function _muSheetHtml() {
  return `
    <div class="mu-keys">
      <span class="mu-chip">레벨업 : 등급이 높은 순부터, 같은 등급일 경우 빨강 &gt; 노랑 &gt; 검정 순으로 강화</span>
      <span class="mu-chip">PIP모드로 창을 띄워서 메이플스토리를 플레이하며 편하게 공략카드를 볼 수 있습니다.</span>
    </div>
    <div class="card mt16" id="muFullCard">
      <div class="mu-panel-h">${window.documentPictureInPicture ? '<button class="mu-pip" type="button">PIP모드</button>' : ''}<span class="card__title" style="margin:0">풀클리어</span><span class="mu-pay">보상 : 솔 에르다 조각 500개</span></div>
      ${_muRowsHtml(_muMerge(MU_CONFIRMED, MU_FULL_REPORTED, true))}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="card__title" style="margin:0">웨이브 10</span><span class="mu-pay">보상 : 솔 에르다 조각 250개</span></div>
      ${_muRowsHtml(_muMerge(MU_WAVE10, MU_WAVE10_REPORTED, false))}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="card__title" style="margin:0">미확인</span></div>
      ${_muRowsHtml(MU_REPORTED)}
    </div>`;
}

function _muGuideHtml() {
  return `
    <div class="mu-ref">참고 링크 : <a href="https://nighttroupe.netlify.app/" target="_blank" rel="noopener">https://nighttroupe.netlify.app/</a></div>
    <div class="card mt16">
      <div class="card__title">진행 방식</div>
      <ol class="mu-steps">${MU_STEPS.map(s => `<li>${s}</li>`).join('')}</ol>
    </div>
    <div class="card mt16">
      <div class="card__title">상황별 행동</div>
      ${MU_STRATEGY.map(([when, what]) => `<div class="mu-st"><b>${when}</b><span>${what}</span></div>`).join('')}
    </div>
    <div class="card mt16">
      <div class="card__title">뽑기 횟수별 살 수 있는 레벨</div>
      ${MU_LEVELS.map(([roll, lv, wave]) => `<div class="sf-res-item"><span class="sf-res-label">뽑기 ${roll}회 · 웨이브 ${wave}</span><span class="sf-res-val">${lv}</span></div>`).join('')}
    </div>`;
}

function _muRender() {
  const body = document.getElementById('muBody');
  if (!body) return;
  body.innerHTML = _muTab === 'sheet' ? _muSheetHtml() : _muGuideHtml();
  document.querySelectorAll('#sec-meundi .sf-tab').forEach(t => t.classList.toggle('active', t.dataset.mutab === _muTab));
}

/* 풀클리어 카드만 항상 위에 떠 있는 별도 창으로 띄운다. 현재 페이지의 스타일시트를 그대로 복사한다. */
async function _muPip() {
  const src = document.getElementById('muFullCard');
  if (!src || !window.documentPictureInPicture) return;
  const old = documentPictureInPicture.window;
  if (old) old.close();
  const PW = 1150;   // 카드를 이 폭으로 그려 두고 창 크기에 맞춰 통째로 축소 확대한다
  /* preferInitialWindowPlacement가 없으면 브라우저가 지난번 크기를 되살려 좁고 긴 창이 뜰 수 있다 */
  const win = await documentPictureInPicture.requestWindow({ width: PW, height: 600, preferInitialWindowPlacement: true });
  const d = win.document;
  const links = [...document.styleSheets].filter(ss => ss.href).map(ss => `<link rel="stylesheet" href="${ss.href}">`).join('');
  const theme = document.documentElement.getAttribute('data-theme');
  const cs = getComputedStyle(document.body);
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.remove('mt16');
  clone.querySelector('.mu-pip')?.remove();
  /* 제보 카드는 창에서 뺀다. 카드가 많으면 창이 길어져 글자가 작아진다. */
  clone.querySelectorAll('.mu-card--rep').forEach(c => c.remove());
  clone.querySelectorAll('.mu-row').forEach(r => { if (!r.querySelector('.mu-card')) r.remove(); });
  d.documentElement.style.cssText = `background:${cs.backgroundColor}`;
  d.body.style.cssText = `margin:0;overflow:hidden;background:${cs.backgroundColor}`;
  const fr = d.createElement('iframe');
  fr.style.cssText = `position:absolute;left:0;top:0;border:0;width:${PW}px;height:600px;transform-origin:0 0;background:transparent`;
  fr.srcdoc = `<!doctype html><html${theme ? ` data-theme="${theme}"` : ''}><head><meta charset="utf-8">${links}<style>.mu-cards{flex-wrap:nowrap}</style></head><body style="margin:0;padding:8px;background:${cs.backgroundColor};color:${cs.color};font-family:${cs.fontFamily}">${clone.outerHTML}</body></html>`;
  const fit = () => {
    const h = (fr.contentDocument?.body.firstElementChild?.offsetHeight + 16) || 600;
    fr.style.height = h + 'px';
    const s = Math.min(win.innerWidth / PW, win.innerHeight / h);
    fr.style.transform = `translate(${(win.innerWidth - PW * s) / 2}px,${(win.innerHeight - h * s) / 2}px) scale(${s})`;
  };
  fr.addEventListener('load', () => {
    fit();
    const h = fr.contentDocument.body.firstElementChild.offsetHeight + 16;
    try { win.resizeTo(PW, Math.round(PW * h / PW) + (win.outerHeight - win.innerHeight)); } catch {}
    fit();
  });
  /* 창 비율 보정: 드래그를 놓으면 높이를 카드 비율에 맞춰 되돌린다. 브라우저가 사용자 조작 없는 크기 변경을 막으면 조용히 무시된다. */
  let fixTimer = 0;
  win.addEventListener('resize', () => {
    fit();
    clearTimeout(fixTimer);
    fixTimer = setTimeout(() => {
      const h = (fr.contentDocument?.body.firstElementChild?.offsetHeight + 16) || 0;
      if (!h) return;
      const want = Math.round(win.innerWidth * h / PW);
      if (Math.abs(want - win.innerHeight) < 3) return;
      try { win.resizeBy(0, want - win.innerHeight); } catch {}
    }, 150);
  });
  d.body.appendChild(fr);
}

function initMeundi() {
  const sec = document.getElementById('sec-meundi');
  if (!sec || sec.dataset.inited) return;
  sec.dataset.inited = '1';
  sec.innerHTML = `
    <div class="sec-head"><h2 class="sec-title">메이플 운빨 디펜스 공략</h2></div>
    <div class="sf-tabs">
      <button class="sf-tab active" data-mutab="sheet">치트시트</button>
      <button class="sf-tab" data-mutab="guide">가이드</button>
    </div>
    <div id="muBody"></div>`;
  sec.querySelectorAll('.sf-tab').forEach(t => t.addEventListener('click', () => { _muTab = t.dataset.mutab; _muRender(); }));
  document.getElementById('muBody').addEventListener('click', e => { if (e.target.closest('.mu-pip')) _muPip().catch(err => console.warn('[meundi] PiP 실패', err)); });
  _muRender();
}
