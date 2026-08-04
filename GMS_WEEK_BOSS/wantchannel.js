/* ═══════════════════════════════════════════════
   오늘의 채널 추천 — 갖고 싶은 아이템을 고르면 지금 서버 상태 기준으로
   "점검 중이 아닌" 월드/채널 중 하나를 무작위로 추천해준다.
   (드랍률이 채널마다 다르다는 뜻은 아니고, 오늘 어디서 사냥할지 정하기 애매할 때
   쓰는 무작위 추천용 — 추천 대상은 항상 서버 상태 API 기준 정상 채널만.)
═══════════════════════════════════════════════ */

const WANT_ITEMS = [
  { file: 'Eqp_Berserked.png',                 name: 'Berserked' },
  { file: 'Eqp_Black_Heart.png',                name: 'Black Heart' },
  { file: 'Eqp_Commanding_Force_Earring.png',   name: 'Commanding Force Earring' },
  { file: 'Eqp_Cursed_Red_Spellbook.png',       name: 'Cursed Red Spellbook' },
  { file: 'Eqp_Dreamy_Belt.png',                name: 'Dreamy Belt' },
  { file: 'Eqp_Endless_Terror.png',             name: 'Endless Terror' },
  { file: 'Eqp_Genesis_Badge.png',              name: 'Genesis Badge' },
  { file: 'Eqp_Magic_Eyepatch.png',             name: 'Magic Eyepatch' },
  { file: "Eqp_Mitra's_Rage_Warrior.png",       name: "Mitra's Rage Warrior" },
  { file: 'Eqp_Source_of_Suffering.png',        name: 'Source of Suffering' },
  { file: 'Eqp_Total_Control.png',              name: 'Total Control' },
];

let _wcRegion = 'na';
let _wcPicked = null;   // 지금 고른 아이템
let _wcResult = null;   // { world, channel } | 'loading' | 'error' | null

function _wcImgSrc(item) { return `images/WANT/${item.file}`; }

async function _wcRecommend(item) {
  _wcPicked = item;
  _wcResult = 'loading';
  _wcRender();
  try {
    const r = await fetch(`/api/server-status?region=${_wcRegion}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '조회 실패');
    const upWorlds = j.worlds.filter(w => w.up && w.channelList.some(c => c.up));
    if (!upWorlds.length) { _wcResult = 'error'; _wcRender(); return; }
    const world = upWorlds[Math.floor(Math.random() * upWorlds.length)];
    const upChannels = world.channelList.filter(c => c.up);
    const channel = upChannels[Math.floor(Math.random() * upChannels.length)];
    _wcResult = { world: world.world, channel: channel.n };
  } catch {
    _wcResult = 'error';
  }
  _wcRender();
}

function _wcResultHtml() {
  if (!_wcPicked) return '<p class="mf-empty">위에서 갖고 싶은 아이템을 클릭하세요.</p>';
  if (_wcResult === 'loading') return '<p class="dt-help" style="margin:0">서버 상태 확인 중...</p>';
  if (_wcResult === 'error') return '<p class="lk-err">서버 상태를 불러오지 못했어요. 잠시 후 다시 시도하세요.</p>';
  if (!_wcResult) return '';
  return `
    <div class="wc-result">
      <img class="wc-result__img" src="${_wcImgSrc(_wcPicked)}" alt="" />
      <div class="wc-result__body">
        <div class="wc-result__item">${_wcPicked.name}</div>
        <div class="wc-result__pick">${_wcResult.world} - ${_wcResult.channel}번 채널</div>
        <div class="wc-result__note">※ 실제 드랍률과는 무관한 무작위 추천이에요. 점검 중이 아닌 채널만 골라줘요.</div>
      </div>
    </div>`;
}

function renderWantChannel() {
  const sec = document.getElementById('sec-wantchannel');
  if (!sec) return;
  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">오늘의 채널 추천</h2>
    </div>
    <div class="region-toggle" style="margin:0 0 16px;max-width:160px;">
      <button class="region-toggle__btn${_wcRegion === 'na' ? ' active' : ''}" data-wcregion="na">NA</button>
      <button class="region-toggle__btn${_wcRegion === 'eu' ? ' active' : ''}" data-wcregion="eu">EU</button>
    </div>
    <p class="dt-help">갖고 싶은 아이템을 클릭하면 지금 점검 중이 아닌 서버·채널 중 하나를 무작위로 추천해줘요.</p>
    <div class="wc-grid">
      ${WANT_ITEMS.map(item => `
        <div class="wc-item ${_wcPicked === item ? 'wc-item--picked' : ''}" data-want="${item.file}" title="${item.name}">
          <img class="wc-item__img" src="${_wcImgSrc(item)}" alt="" />
          <span class="wc-item__name">${item.name}</span>
        </div>`).join('')}
    </div>
    <div class="card wc-result-card">${_wcResultHtml()}</div>
  `;

  sec.querySelectorAll('[data-wcregion]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.wcregion === _wcRegion) return;
      _wcRegion = btn.dataset.wcregion;
      if (_wcPicked) _wcRecommend(_wcPicked); else _wcRender();
    });
  });
  sec.querySelectorAll('.wc-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = WANT_ITEMS.find(i => i.file === el.dataset.want);
      _wcRecommend(item);
    });
  });
}
function _wcRender() { renderWantChannel(); }
