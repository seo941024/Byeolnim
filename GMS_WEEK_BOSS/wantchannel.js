/* ═══════════════════════════════════════════════
   오늘의 채널 추천 — 갖고 싶은 아이템을 고르면 팝업으로 Kronos 서버의
   지금 점검 중이 아닌 채널 중 하나를 무작위로 추천해준다.
═══════════════════════════════════════════════ */

const WANT_CATEGORIES = [
  {
    title: '칠흑의 보스 세트',
    items: [
      { file: 'Eqp_Berserked.png',               name: '루즈 컨트롤 머신 마크' },
      { file: 'Eqp_Black_Heart.png',              name: '블랙 하트' },
      { file: 'Eqp_Commanding_Force_Earring.png', name: '커맨더 포스 이어링' },
      { file: 'Eqp_Cursed_Red_Spellbook.png',     name: '저주받은 마도서' },
      { file: 'Eqp_Dreamy_Belt.png',              name: '몽환의 벨트' },
      { file: 'Eqp_Endless_Terror.png',           name: '거대한 공포' },
      { file: 'Eqp_Genesis_Badge.png',            name: '창세의 뱃지' },
      { file: 'Eqp_Magic_Eyepatch.png',           name: '마력이 깃든 안대' },
      { file: "Eqp_Mitra's_Rage_Warrior.png",     name: '미트라의 분노' },
      { file: 'Eqp_Source_of_Suffering.png',      name: '고통의 근원' },
      { file: 'Eqp_Total_Control.png',            name: '컴플리트 언더컨트롤' },
    ],
  },
  {
    title: '광휘의 보스 세트',
    items: [
      { file: 'Eqp_Original_Sin_of_Pride.png',    name: '오만의 원죄' },
      { file: 'Eqp_Whisper_of_the_Source.png',    name: '근원의 속삭임' },
      { file: 'Eqp_Blissful_Nightmare.png',       name: '황홀한 악몽' },
      { file: 'Eqp_Oath_of_Death.png',            name: '죽음의 맹세' },
      { file: 'Eqp_Immortal_Legacy.png',          name: '불멸의 유산' },
    ],
  },
];
const WANT_ITEMS = WANT_CATEGORIES.flatMap(c => c.items);
const WC_WORLD = 'Kronos';

function _wcImgSrc(item) { return `images/WANT/${item.file}`; }

function _wcEnsureOverlay() {
  let overlay = document.getElementById('wcOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wcOverlay';
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  }
  return overlay;
}

function _wcModalBodyHtml(item, state) {
  if (state === 'loading') return '<p class="dt-help" style="margin:0">서버 상태 확인 중...</p>';
  if (state === 'error') return '<p class="lk-err">서버 상태를 불러오지 못했어요. 잠시 후 다시 시도하세요.</p>';
  return `
    <div class="wc-result">
      <img class="wc-result__img" src="${_wcImgSrc(item)}" alt="" />
      <div class="wc-result__body">
        <div class="wc-result__item">${item.name}</div>
        <div class="wc-result__pick">${_wcWorldIconHtml()}<span class="icon-lbl">${WC_WORLD} - ${state.channel}채널</span></div>
      </div>
    </div>`;
}

// 추천 채널 앞에 서버 아이콘. 아이콘 파일이 없으면 빈 문자열이라 글자만 나온다.
function _wcWorldIconHtml() {
  const src = serverIconSrc(WC_WORLD);
  return src ? `<img class="wc-result__world" src="${src}" alt="" onerror="this.style.display='none'">` : '';
}

function _wcOpenModal(item) {
  const overlay = _wcEnsureOverlay();
  const render = body => {
    overlay.innerHTML = `
      <div class="modal" style="width:min(420px,92vw)">
        <div class="modal__head">
          <span class="modal__title">오늘의 채널 추천</span>
          <button class="modal__close" id="wcModalClose">×</button>
        </div>
        <div class="modal__body">${body}</div>
      </div>`;
    document.getElementById('wcModalClose').addEventListener('click', () => overlay.classList.remove('open'));
  };
  render(_wcModalBodyHtml(item, 'loading'));
  overlay.classList.add('open');
  _wcFetchRecommend(item).then(state => render(_wcModalBodyHtml(item, state)));
}

async function _wcFetchRecommend(item) {
  try {
    const r = await fetch(`/api/server-status?region=na`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '조회 실패');
    const world = j.worlds.find(w => w.world === WC_WORLD);
    const upChannels = (world?.channelList || []).filter(c => c.up);
    if (!world || !world.up || !upChannels.length) return 'error';
    const channel = upChannels[Math.floor(Math.random() * upChannels.length)];
    return { channel: channel.n };
  } catch {
    return 'error';
  }
}

function _wcRowHtml(item) {
  return `
    <div class="wc-item" data-want="${item.file}">
      <img class="wc-item__img" src="${_wcImgSrc(item)}" alt="" />
      <span class="wc-item__name">${item.name}</span>
    </div>`;
}

function renderWantChannel() {
  const sec = document.getElementById('sec-wantchannel');
  if (!sec) return;
  sec.innerHTML = `
    <div class="sec-head">
      <h2 class="sec-title">오늘의 채널 추천</h2>
    </div>
    <p class="dt-help">갖고 싶은 아이템을 클릭하면 점검 중이 아닌 무작위 채널중 추천해줍니다.</p>
    ${WANT_CATEGORIES.map(cat => `
      <div class="wc-category">
        <div class="wc-category__title">${cat.title}</div>
        <div class="wc-list">${cat.items.map(_wcRowHtml).join('')}</div>
      </div>`).join('')}
  `;

  sec.querySelectorAll('.wc-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = WANT_ITEMS.find(i => i.file === el.dataset.want);
      _wcOpenModal(item);
    });
  });
}
