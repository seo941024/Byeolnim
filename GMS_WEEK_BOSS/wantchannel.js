/* ═══════════════════════════════════════════════
   오늘의 채널 추천 — 갖고 싶은 아이템을 고르면 팝업으로, 지금 선택된
   캐릭터가 속한 서버의 점검 중이 아닌 채널 중 하나를 무작위로 추천해준다.
   캐릭터가 없거나 서버 정보를 조회한 적이 없으면 기본값(Kronos)을 쓴다.
═══════════════════════════════════════════════ */

const WANT_CATEGORIES = [
  {
    title: '칠흑의 보스 세트',
    items: [
      { file: 'Eqp_Berserked.png',               name: '루즈 컨트롤 머신 마크' },
      { file: 'Etc_Damaged_Black_Heart.png',       name: '블랙 하트' },
      { file: 'Eqp_Total_Control.png',            name: '컴플리트 언더컨트롤' },
      { file: 'Eqp_Magic_Eyepatch.png',           name: '마력이 깃든 안대' },
      { file: 'Eqp_Dreamy_Belt.png',              name: '몽환의 벨트' },
      { file: "Use_Will's_Cursed_Spellbook_Selection_Box.png", name: '저주받은 마도서' },
      { file: 'Eqp_Endless_Terror.png',           name: '거대한 공포' },
      { file: 'Eqp_Commanding_Force_Earring.png', name: '커맨더 포스 이어링' },
      { file: 'Eqp_Source_of_Suffering.png',      name: '고통의 근원' },
      { file: 'Eqp_Genesis_Badge.png',            name: '창세의 뱃지' },
      { file: "Use_Mitra's_Rage_Selection_Box.png", name: '미트라의 분노' },
    ],
  },
  {
    title: '광휘의 보스 세트',
    items: [
      { file: 'Eqp_Immortal_Legacy.png',          name: '불멸의 유산' },
      { file: 'Eqp_Blissful_Nightmare.png',       name: '황홀한 악몽' },
      { file: 'Eqp_Starving_Blood_Spirit.png',    name: '굶주리는 핏빛 원혼' },
      { file: 'Eqp_Whisper_of_the_Source.png',    name: '근원의 속삭임' },
      { file: 'Eqp_Oath_of_Death.png',            name: '죽음의 맹세' },
      { file: 'Eqp_Original_Sin_of_Pride.png',    name: '오만의 원죄' },
    ],
  },
  {
    title: '연마석',
    items: [
      { file: 'Use_Grindstone_of_Life.png',   name: '생명의 연마석' },
      { file: 'Use_Grindstone_of_Faith.png',  name: '신념의 연마석' },
    ],
  },
  {
    title: '익셉셔널 해머',
    items: [
      { file: 'Use_Exceptional_Hammer_(Belt).png',     name: '익셉셔널 해머 (벨트)' },
      { file: 'Use_Exceptional_Hammer_(Face_Acc).png', name: '익셉셔널 해머 (얼굴장식)' },
      { file: 'Use_Exceptional_Hammer_(Eye_Acc).png',  name: '익셉셔널 해머 (눈장식)' },
      { file: 'Use_Exceptional_Hammer_(Earrings).png', name: '익셉셔널 해머 (귀걸이)' },
      { file: 'Use_Exceptional_Hammer_(Medal).png',    name: '익셉셔널 해머 (훈장)' },
    ],
  },
];
const WANT_ITEMS = WANT_CATEGORIES.flatMap(c => c.items);
const WC_DEFAULT_WORLD = 'Kronos'; // 선택된 캐릭터가 없을 때만 쓰는 기본값

/* 지금 선택된 캐릭터가 어느 서버인지에 따라 추천 채널을 바꾼다.
   캐릭터 정보를 조회해둔 적이 없으면(fetched.world 없음) 기본값으로 대체한다. */
function _wcCurrentWorld() {
  return state.chars[state.activeChar]?.fetched?.world || WC_DEFAULT_WORLD;
}
/* 서버 상태 조회는 가능하면 이름 문자열이 아니라 worldID로 맞춘다 — 넥슨 쪽
   표기가 살짝 달라도(대소문자·공백 등) 안 틀리게. 캐릭터를 조회해둔 적이
   없으면 null이라, 이땐 이름으로만 찾는다(기본값 Kronos). */
function _wcCurrentWorldID() {
  return state.chars[state.activeChar]?.fetched?.worldID ?? null;
}

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

// res: 'loading' | 'error' | { channel }
function _wcModalBodyHtml(item, res) {
  if (res === 'loading') return '<p class="dt-help" style="margin:0">서버 상태 확인 중...</p>';
  if (res === 'error') return '<p class="lk-err">서버 상태를 불러오지 못했어요. 잠시 후 다시 시도하세요.</p>';
  return `
    <div class="wc-result">
      <img class="wc-result__img" src="${_wcImgSrc(item)}" alt="" />
      <div class="wc-result__body">
        <div class="wc-result__item">${item.name}</div>
        <div class="wc-result__pick">${_wcWorldIconHtml()}<span class="icon-lbl">${_wcCurrentWorld()} - ${res.channel}채널</span></div>
      </div>
    </div>`;
}

// 추천 채널 앞에 서버 아이콘. 아이콘 파일이 없으면 빈 문자열이라 글자만 나온다.
function _wcWorldIconHtml() {
  const src = serverIconSrc(_wcCurrentWorld());
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
  _wcFetchRecommend(item).then(res => render(_wcModalBodyHtml(item, res)));
}

async function _wcFetchRecommend(item) {
  try {
    // 넥슨 서버 상태는 지역별로 따로 내려오므로 EU 캐릭터는 EU 목록에서 찾는다.
    // 서버만 직접 고른 캐릭터는 region이 없어 서버 이름으로 가린다.
    const f = state.chars[state.activeChar]?.fetched;
    const region = f?.region === 'EU' || /^(Luna|Solis)$/.test(f?.world || '') ? 'eu' : 'na';
    const r = await fetch(`/api/server-status?region=${region}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || '조회 실패');
    const wid = _wcCurrentWorldID();
    const world = wid != null
      ? j.worlds.find(w => w.worldId === wid)
      : j.worlds.find(w => w.world === _wcCurrentWorld());
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
      <span class="wc-item__img-wrap"><img class="wc-item__img" src="${_wcImgSrc(item)}" alt="" /></span>
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
    <p class="dt-help">물욕 아이템의 채널을 추천해줍니다. 활성화 된 채널을 기준으로만 추천합니다.</p>
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
