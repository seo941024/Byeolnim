/* ═══════════════════════════════════════════════
   메운디 (메이플운빨디펜스) — Night Troupe 2026 Go Go Sidekick 치트시트 한국어판

   원본: https://nighttroupe.netlify.app/ (2026-09-30 갱신본) + 레딧 정리글
   스쿼드 표기 "S10"은 랭크 S, 올릴 레벨 10. "?"는 레벨 미기록. 끝에 "*"가
   붙은 건 원본에서 점선이나 별표로 표시된 근소/빡빡한 조합. 순서는 빨강, 검정, 노랑.
   확정 항목은 원본의 Confirmed, 제보 항목은 Reported이며 원본 값을 그대로
   옮겼다 — 임의로 고치거나 추정해 채우지 말 것.
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

const MU_REPORTED = [
  { head: '풀클리어', squads: ['B10 B10 C10', 'B10 C10 C8!최저 제보', 'A10 D3 C10', 'A10 D8 E2!최저 제보'] },
  { head: '웨이브 10 · 뽑기 8회까지', squads: ['A10 A7 B0', 'A10 B0 A7', 'B0 A7 A10', 'S? C? C?!레벨 미기록', 'C? C? S?!레벨 미기록', 'S? D? D?!레벨 미기록'] },
  { head: '실패 사례', squads: ['A? A? A?!뽑기 6회 기준 웨이브 10, 적 약 10마리 남음', 'B3 B10 S10!뽑기 3회 기준 풀클리어까지 적 2마리 부족'] },
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

/* 레딧 정리글 — 원본 표기 그대로. 3칸은 빨강, 검정, 노랑 순서의 랭크 글자이고 "-"는 빈칸,
   끝의 "*"는 원본에서 별표가 붙은 빡빡한 조합. 열은 S가 놓인 타일 기준. */
const MU_REDDIT_TLDR = '웨이브 3이 끝나기 전에 S와 A가 있으면 S, 그다음 A를 몰아서 올리면 웨이브 10 또는 풀클리어가 보장됩니다.';
const MU_REDDIT_RULE = '표의 뽑기 횟수와 웨이브는 그 조합으로 클리어할 수 있는 최대 뽑기 횟수, 가장 늦은 웨이브입니다. 그 전에 조합이 나왔다면 뽑기를 멈추고 남는 포인트는 전부 레벨업에 씁니다.';
const MU_REDDIT = [
  { title: '최소 풀클리어', roll: 5, wave: 2, cols: ['S 빨강', 'S 검정', 'S 노랑'],
    rows: [['SDA', 'ASC', 'AES*'], ['SAE*', 'BSA', 'BAS']],
    how: 'S를 먼저 올리고 그다음 A를 올립니다. 최종 S10 + A10 + 1.',
    note: '별표 조합은 매우 빡빡해서 포인트를 반드시 제때 수령하고 제때 업그레이드해야 합니다. 2번 더 뽑아 안정적인 조합을 노리는 도박도 가능합니다.' },
  { title: '풀클리어', roll: 6, wave: 2, cols: ['S 빨강', 'S 검정', 'S 노랑'],
    rows: [['SAC', 'ASB', 'ACS'], ['SCA', 'BSA*', 'BAS']],
    how: 'S를 먼저 올리고 그다음 A를 올립니다. 최종 S10 + A9 + 0.',
    note: '별표 조합은 매우 빡빡해서 포인트를 반드시 제때 수령하고 제때 업그레이드해야 합니다.' },
  { title: '풀클리어', roll: 7, wave: 3, cols: ['S 빨강', 'S 검정', 'S 노랑'],
    rows: [['SAB', 'ASA', 'ABS'], ['SBA', '-', 'BAS']],
    how: 'S를 먼저 올리고 그다음 A를 올립니다. ASA는 빨강, 노랑 순으로 우선합니다. 최종 S10 + A8 + 0.',
    note: '뽑기 7회 S+A+B가 통한다는 걸 두 댓글이 증명했습니다.' },
  { title: '더블 S 풀클리어', roll: 10, wave: 4, cols: ['S 빨강', 'S 검정', 'S 노랑'],
    rows: [['SSB', 'SSB', 'BSS'], ['SBS', 'BSS', 'SBS']],
    how: 'S를 빨강, 노랑, 검정 순으로 올립니다. 최종 S10 + S5 + B0.',
    note: '이보다 일찍 더블 S가 나오면 뽑기를 완전히 멈춥니다. S10 + S7이면 충분합니다. 자료는 여러 유저가 제공했고 TMS 유저 결과와도 일치합니다.' },
  { title: '웨이브 10', roll: 8, wave: 3, cols: ['S 빨강', 'S 검정', 'S 노랑'],
    rows: [['SDD*', 'BSB', 'BDS*'], ['-', '-', 'DBS']],
    how: 'S를 최대한 빨리 올리고 그다음 빨강, 노랑, 검정 순으로 올립니다. 최종 S10 + B7 + D0.',
    note: '별표 조합은 S 빨강이나 노랑만 맥스해도 웨이브 10에 도달합니다. S 맥스 후에도 더블, 트리플 S를 노려 계속 뽑을 수 있습니다. 다만 웨이브 6에 전멸하지 않으려면 어느 정도 일찍 얻어야 합니다.' },
  { title: '극단적 최소 풀클리어', roll: 3, wave: 1, cols: ['S 빨강'],
    rows: [['SBB']],
    how: '빨강, 검정, 노랑 순으로 올립니다. 최종 S10 B10 B3.',
    note: '순수 운에 달린 조합이며 클리어가 보장되지 않습니다.' },
];

const MU_REDDIT_STRATEGY = [
  { title: '일반 전략, 10회 도전 약 1시간', lead: '웨이브 4 전에 멈추고 뽑기 5, 6회 또는 10회 더블 S 풀클리어나 웨이브 10을 노립니다.', steps: [
    'S가 나올 때까지 뽑고 몇 번 걸렸는지 기억합니다. 웨이브 4 끝까지 S가 하나도 안 나오면 재시작해도 됩니다.',
    'S를 먼저 10레벨까지 올립니다. 웨이브 6을 안전하게 넘길 수 있습니다.',
    'S가 10레벨이 된 뒤에도 총 6~10번째 뽑기까지 계속 뽑습니다.',
    '필요한 뽑기 횟수 안에 풀클리어나 웨이브 10 조합을 노립니다.',
    '풀클리어 조합이 안 나와도 웨이브 9~10까지는 쉽게 갑니다.',
    'A를 8레벨 이상, 또는 두 번째 S를 5레벨 이상 올립니다. 여기서 보통 웨이브 10이나 풀클리어로 끝납니다.',
  ] },
  { title: '빠른 전략, 10회 도전 약 30분', lead: '웨이브 3 전에 멈추고 뽑기 5, 6회 풀클리어 조합만 노립니다.', steps: [
    '연속으로 6번 뽑습니다. S+A나 S+S가 안 나왔으면 우측 상단 X로 재시작합니다.',
    'S를 맥스하고 A를 최대한 올립니다. 세 번째가 B 이상이면 대체로 풀클리어하고, 아니면 웨이브 10에 도달합니다. 그것도 괜찮은 종료점입니다.',
    '6번째 뽑기까지 S+A가 없으면 이후 3번 안에 두 번째 S나 SAA, AAS가 필요한데 가능성이 매우 낮습니다. 여기서 끝내면 도전당 3분을 아낍니다.',
    '6번째 뽑기까지 S가 하나뿐이어도 끝까지 하길 권합니다. 일반 전략 2단계부터 이어가도 되고, 잘 풀리면 최소 웨이브 9~10입니다.',
  ] },
  { title: '풀클리어 전용 전략, 10회 도전 1시간 이상', lead: '일반 전략과 거의 같지만 게임 오버까지 계속 뽑습니다.', steps: [
    '웨이브 4 이후에도 가능한 만큼 뽑습니다. 트리플 S의 희박한 가능성이 있습니다.',
    'S는 나오는 즉시 업그레이드합니다.',
    '필요한 뽑기 횟수 안에 아무 풀클리어 조합이 완성되면 뽑기를 멈추고 레벨업에 집중합니다.',
    '웨이브 5부터 풀클리어에는 트리플 S가 필요합니다. 웨이브 8쯤에 트리플 S를 얻어도 레벨업이 모자라 게임 오버가 됩니다.',
    'S를 최대한 빨리 올려야 합니다. 레벨 0 S는 혼자서 웨이브 6을 넘기지 못합니다. S+E+E 최악의 뽑기여도 S10이면 웨이브 8 이상에 가고, 거기서는 웨이브당 2번 뽑을 수 있어 다른 S로 반전할 수 있습니다.',
  ] },
];

const MU_REDDIT_FAQ = [
  ['미니게임을 일찍 재시작하려면', '미니게임 UI 우측 상단 X를 누릅니다.'],
  ['미니게임 창은 어떻게 여닫나', '소비 인벤토리의 M-Force 사이드킥 호출기 아이템을 씁니다.'],
  ['왜 S를 먼저 올리나', 'S를 먼저 올리면 일이 틀어져도 더 높은 웨이브를 확보합니다. 두 번째 S가 필요해지기 전까지 몇 번 더 뽑을 수 있습니다. 다만 그 사이 이월된 몬스터가 너무 많아져 예상보다 훨씬 일찍 실패할 수도 있습니다.'],
  ['웨이브 10 조합이 일찍 나온 뒤에도 계속 뽑나', '감수할 위험에 달렸습니다. 웨이브 10 결과로 만족하거나 주간 초기화가 가까우면 위험을 지지 않는 쪽을 권합니다. 웨이브 10 도전을 잃지 않고 총 8번째 뽑기까지 굴릴 수 있고, S 맥스 후 풀클리어 조합을 노려도 됩니다. 그 이상, 예를 들어 9, 10번째 뽑기에서 더블 S를 노리면 레벨업을 뽑기와 맞바꾸는 셈이라 웨이브 10 미만에서 게임 오버가 납니다. 8번은 S 검정 기준이고 S 빨강이면 약 14번입니다. 웨이브 10 표를 참고합니다.'],
  ['S가 나왔는데 풀클리어 조합이 아니다', '이 목록이 전부가 아니고 S가 워낙 귀하니 끝까지 해봅니다. 운 좋게 클리어하거나 두 번째 S가 나올 수 있습니다.'],
  ['풀클리어 조합이 표의 웨이브보다 일찍 나왔다', '뽑기를 멈추고 유닛 업그레이드에 집중합니다. 축하합니다.'],
  ['뽑기 사이에 레인저 레벨업을 해도 되나', '안 됩니다. 레벨업은 소급 적용되지 않습니다. 예를 들어 B 랭크일 때 올린 레벨은 나중에 S로 승급해도 스탯 하나만 오릅니다. S가 아닌 유닛은 뽑기를 다 끝낸 뒤에 레벨업합니다.'],
  ['조합이 맞는데 풀클리어에 실패했다', '이 조합들은 풀클리어에 성공한 가장 낮은 랭크 조합과 최대 뽑기 횟수 기준이라 빠듯합니다. 포인트 수령과 업그레이드를 제때 해야 하고 1~2초 지연에도 실패할 수 있습니다. 일부 운도 작용합니다. 그래도 표의 조합과 업그레이드 순서를 따르는 게 최선입니다. 포인트는 상호작용 키보다 버튼을 클릭하는 쪽이 더 빨리 수령됩니다. 결정적 차이는 아니지만 몇 초를 아낄 수 있습니다.'],
  ['보상은', '공식 이벤트 공지를 참고합니다.'],
  ['작성자 안내', '정보 대부분은 메이플 SEA에서 6주간 진행된 이벤트에서 모았습니다. GMS는 작성자가 직접 10회 도전해본 경험상 S, A 랭크가 더 잘 나오는 것 같지만 클리어 조건은 같아 보입니다. 일부는 틀릴 수 있습니다. GMS는 SEA, TMS의 원래 확률보다 크게 상향된 것 같으니 풀클리어를 목표로 하고, 주간 초기화 수요일 UTC 0시까지 3일 미만 남았을 때만 타협하길 권합니다.'],
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
      <div class="mu-head">${r.roll != null ? `<span class="mu-roll">뽑기 횟수 : ${r.roll}</span><span class="mu-wave">웨이브 ${r.wave}</span>` : `<span class="mu-wave">${r.head}</span>`}</div>
      <div class="mu-cards">${r.squads.map(_muSquadHtml).join('')}</div>
    </div>`).join('');
}

function _muComboHtml(code) {
  if (code === '-') return '<div class="mu-combo mu-combo--empty">-</div>';
  const shaky = code.endsWith('*');
  const body = shaky ? code.slice(0, -1) : code;
  const tiles = [...body].map((c, i) => `<div class="mu-u mu-u--${['r', 'k', 'y'][i]}"><b>${c}</b></div>`).join('');
  return `<div class="mu-combo${shaky ? ' mu-card--shaky' : ''}"${shaky ? ' title="매우 빡빡한 조합"' : ''}>${tiles}</div>`;
}

function _muRedditSheetHtml() {
  const panels = MU_REDDIT.map(r => `
    <div class="mu-rd">
      <div class="mu-rd-h"><b>${r.title}</b><span class="mu-wave">뽑기 ${r.roll}회 · 웨이브 ${r.wave}</span></div>
      <div class="mu-rd-grid" style="grid-template-columns:repeat(${r.cols.length},max-content)">
        ${r.cols.map(c => `<div class="mu-rd-col">${c}</div>`).join('')}
        ${r.rows.flat().map(_muComboHtml).join('')}
      </div>
      <div class="mu-rd-how">${r.how}</div>
      <div class="mu-note mu-note--wide">${r.note}</div>
    </div>`).join('');
  return `
    <div class="card mt16">
      <div class="mu-panel-h"><span class="mu-badge mu-badge--warn">레딧</span><span class="card__title" style="margin:0">정리글</span></div>
      <div class="mu-rd-tldr">${MU_REDDIT_TLDR}</div>
      <div class="mu-note mu-note--wide">${MU_REDDIT_RULE}</div>
      ${panels}
    </div>`;
}

function _muRedditGuideHtml() {
  const strat = MU_REDDIT_STRATEGY.map(g => `
    <div class="card mt16">
      <div class="card__title">${g.title}</div>
      <div class="mu-note mu-note--wide">${g.lead}</div>
      <ol class="mu-steps">${g.steps.map(t => `<li>${t}</li>`).join('')}</ol>
    </div>`).join('');
  const faq = `
    <div class="card mt16">
      <div class="card__title">자주 묻는 질문</div>
      ${MU_REDDIT_FAQ.map(([q, a]) => `<div class="mu-st"><b>${q}</b><span>${a}</span></div>`).join('')}
    </div>`;
  return strat + faq;
}

function _muSheetHtml() {
  return `
    <div class="mu-keys">
      <span class="mu-chip">레벨업 : 등급이 높은 순부터, 같은 등급일 경우 빨강 &gt; 노랑 &gt; 검정 순으로 강화</span>
      <span class="mu-chip">PIP모드로 창을 띄워서 메이플스토리를 플레이하며 편하게 공략카드를 볼 수 있습니다.</span>
    </div>
    <div class="card mt16" id="muFullCard">
      <div class="mu-panel-h">${window.documentPictureInPicture ? '<button class="mu-pip" type="button">PIP모드</button>' : ''}<span class="card__title" style="margin:0">풀클리어</span><span class="mu-pay">솔 에르다 조각 500</span></div>
      ${_muRowsHtml(MU_CONFIRMED)}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="card__title" style="margin:0">웨이브 10</span><span class="mu-pay">솔 에르다 조각 250</span></div>
      ${_muRowsHtml(MU_WAVE10)}
    </div>
    <div class="card mt16">
      <div class="mu-panel-h"><span class="card__title" style="margin:0">미확인</span></div>
      ${_muRowsHtml(MU_REPORTED)}
    </div>
    ${_muRedditSheetHtml()}`;
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
    </div>
    ${_muRedditGuideHtml()}`;
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
  const win = await documentPictureInPicture.requestWindow({
    width: Math.min(Math.max(src.offsetWidth, 420), 760),
    height: Math.min(src.offsetHeight + 24, 720),
  });
  const d = win.document;
  [...document.styleSheets].forEach(ss => {
    if (ss.href) {
      const l = d.createElement('link');
      l.rel = 'stylesheet'; l.href = ss.href;
      d.head.appendChild(l);
    } else {
      try {
        const st = d.createElement('style');
        st.textContent = [...ss.cssRules].map(r => r.cssText).join('\n');
        d.head.appendChild(st);
      } catch {}
    }
  });
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme) d.documentElement.setAttribute('data-theme', theme);
  const cs = getComputedStyle(document.body);
  d.body.style.cssText = `margin:0;padding:8px;background:${cs.backgroundColor};color:${cs.color};font-family:${cs.fontFamily}`;
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.remove('mt16');
  clone.querySelector('.mu-pip')?.remove();
  d.body.appendChild(clone);
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
