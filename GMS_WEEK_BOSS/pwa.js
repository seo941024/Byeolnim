/* ═══════════════════════════════════════════════
   pwa.js — "앱으로 설치" 안내 배너

   안드로이드/데스크톱 크롬은 설치 조건을 만족하면 beforeinstallprompt 이벤트를
   주는데, 이걸 잡아두지 않으면 브라우저가 알아서 주는 작은 배너에만 의존하게 되고
   그마저도 잘 안 뜬다. 그래서 이벤트를 가로채 두었다가 우리 버튼을 눌렀을 때
   설치창을 띄운다.

   아이폰 사파리에는 이 이벤트가 아예 없다. 설치를 코드로 띄울 방법이 없어서
   "공유 → 홈 화면에 추가"를 직접 안내하는 수밖에 없다.
═══════════════════════════════════════════════ */

const PWA_DISMISS_KEY = 'pwa_install_dismissed';

let pwaDeferredPrompt = null;

/* 이미 홈 화면 앱으로 실행 중이면 설치 안내가 필요 없다.
   iOS는 display-mode를 제대로 안 알려주는 경우가 있어 navigator.standalone도 같이 본다. */
function pwaIsInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

function pwaIsIOS() {
  const ua = navigator.userAgent;
  // 아이패드는 최근 기기에서 데스크톱 사파리로 위장하므로 터치 지원 여부로 한 번 더 거른다
  return /iPhone|iPad|iPod/i.test(ua)
      || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/* 사파리가 아닌 앱내 브라우저(네이버·카카오 등)에서는 홈 화면 추가가 막혀 있다.
   이때 사파리로 열라고 알려줘야 사용자가 헤매지 않는다. */
function pwaIsIOSInAppBrowser() {
  return pwaIsIOS() && !/Safari/.test(navigator.userAgent);
}

function pwaEnsureBanner() {
  let el = document.getElementById('pwaInstall');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'pwaInstall';
  el.className = 'pwa-install';
  document.body.appendChild(el);
  return el;
}

function pwaHide() {
  const el = document.getElementById('pwaInstall');
  if (el) el.classList.remove('open');
}

function pwaDismiss() {
  try { localStorage.setItem(PWA_DISMISS_KEY, '1'); } catch {}
  pwaHide();
}

function pwaShowBanner(mode) {
  // 이미 설치했거나, 사용자가 닫은 적이 있으면 다시 띄우지 않는다
  if (pwaIsInstalled()) return;
  try { if (localStorage.getItem(PWA_DISMISS_KEY)) return; } catch {}

  const el = pwaEnsureBanner();
  const body = mode === 'ios'
    ? `<div class="pwa-install__txt">
         <b>별님앱을 홈 화면에 추가하기</b>
         <span>아래 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 누르면 앱처럼 쓸 수 있어요.</span>
       </div>
       <button class="sbtn sbtn--ghost pwa-install__close" id="pwaClose">닫기</button>`
    : mode === 'ios-inapp'
    ? `<div class="pwa-install__txt">
         <b>별님앱을 홈 화면에 추가하기</b>
         <span>지금 앱 안의 브라우저라 설치가 안 돼요. <b>Safari로 열기</b> 후 공유 → 홈 화면에 추가를 눌러주세요.</span>
       </div>
       <button class="sbtn sbtn--ghost pwa-install__close" id="pwaClose">닫기</button>`
    : `<div class="pwa-install__txt">
         <b>별님앱 설치하기</b>
         <span>홈 화면에 추가하면 앱처럼 바로 열 수 있어요.</span>
       </div>
       <button class="sbtn sbtn--primary" id="pwaGo">설치</button>
       <button class="sbtn sbtn--ghost pwa-install__close" id="pwaClose">닫기</button>`;

  el.innerHTML = `<img class="pwa-install__icon" src="images/pwa/icon-192.png" alt="" />${body}`;
  el.classList.add('open');

  const close = document.getElementById('pwaClose');
  if (close) close.addEventListener('click', pwaDismiss);

  const go = document.getElementById('pwaGo');
  if (go) go.addEventListener('click', async () => {
    if (!pwaDeferredPrompt) return pwaHide();
    pwaDeferredPrompt.prompt();
    const { outcome } = await pwaDeferredPrompt.userChoice;
    pwaDeferredPrompt = null;
    // 거절했더라도 계속 띄우면 성가시므로 이번 방문에는 감춘다
    pwaHide();
    if (outcome === 'accepted') { try { localStorage.setItem(PWA_DISMISS_KEY, '1'); } catch {} }
  });
}

/* 안드로이드·크롬: 설치 가능해지는 순간 이벤트가 온다.
   preventDefault를 해야 브라우저 기본 배너 대신 우리 배너를 쓸 수 있다. */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  pwaDeferredPrompt = e;
  pwaShowBanner('android');
});

window.addEventListener('appinstalled', () => {
  pwaDeferredPrompt = null;
  try { localStorage.setItem(PWA_DISMISS_KEY, '1'); } catch {}
  pwaHide();
});

/* 아이폰은 이벤트가 없으므로 조건을 직접 보고 안내를 띄운다.
   페이지가 뜨자마자 가리면 거슬려서 잠깐 뒤에 올린다. */
window.addEventListener('load', () => {
  if (!pwaIsIOS() || pwaIsInstalled()) return;
  setTimeout(() => pwaShowBanner(pwaIsIOSInAppBrowser() ? 'ios-inapp' : 'ios'), 1200);
});
