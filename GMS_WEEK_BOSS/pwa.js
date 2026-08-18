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

function pwaIsAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/* 네이버·카카오톡 같은 앱 안의 브라우저.
   이들은 WebView라서 안드로이드여도 beforeinstallprompt가 아예 오지 않고
   홈 화면 추가도 막혀 있다. 그래서 "설치" 버튼을 줄 수 없고,
   진짜 브라우저(크롬/사파리)로 열라고 안내하는 수밖에 없다. */
function pwaIsInAppBrowser() {
  const ua = navigator.userAgent;
  if (/NAVER|KAKAOTALK|FBAN|FBAV|FB_IAB|Instagram|Line\/|DaumApps|everytimeApp|Snapchat/i.test(ua)) return true;
  // 안드로이드 WebView는 UA에 "; wv)"가 붙는다
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return true;
  // 아이폰에서 Safari 표기가 없으면 인앱 브라우저다
  if (pwaIsIOS() && !/Safari/i.test(ua)) return true;
  return false;
}

/* 안드로이드 인앱 브라우저에서 크롬으로 같은 주소를 다시 여는 방법.
   intent:// 스킴은 크롬이 설치돼 있으면 크롬으로 넘겨준다. */
function pwaOpenInChrome() {
  const scheme = location.protocol.replace(':', '');
  const rest = location.host + location.pathname + location.search;
  location.href = 'intent://' + rest + '#Intent;scheme=' + scheme + ';package=com.android.chrome;end';
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

/* iOS 공유 버튼 아이콘(네모 밖으로 나가는 화살표). 글로만 "공유 버튼"이라고 하면
   어느 버튼인지 몰라 헤매므로 문장 안에 실제 모양을 그려 넣는다. */
const PWA_SHARE_SVG =
  '<svg class="pwa-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/>' +
  '<path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

/* 아이폰 인앱 브라우저에서 사파리로 넘기기.
   iOS에는 안드로이드의 intent:// 같은 공식 방법이 없다. x-safari-https:// 는
   비공식이라 앱에 따라 안 먹을 수 있어서, 눌러도 아무 일이 없을 때를 대비해
   배너를 닫지 않고 그대로 둔다(글로 적힌 메뉴 안내를 계속 볼 수 있게). */
function pwaOpenInSafari() {
  const url = location.href.replace(/^https?:\/\//, '');
  location.href = 'x-safari-https://' + url;
}

function pwaShowBanner(mode, force) {
  // 이미 설치했으면 안내가 필요 없다. 설정에서 직접 부른 경우(force)는 닫은 이력을 무시한다.
  if (pwaIsInstalled()) return;
  if (!force) { try { if (localStorage.getItem(PWA_DISMISS_KEY)) return; } catch {} }

  const el = pwaEnsureBanner();
  const CLOSE = `<button class="sbtn sbtn--ghost pwa-install__close" id="pwaClose">닫기</button>`;
  // "아래/위" 같은 위치는 아이폰(하단)과 아이패드(상단)가 달라 일부러 쓰지 않는다.
  // 공유 시트에서 '홈 화면에 추가'가 접혀 있어 못 찾는 경우가 가장 많아 스크롤을 짚어준다.
  const body = mode === 'ios'
    ? `<div class="pwa-install__txt">
         <b>별님앱을 홈 화면에 추가</b>
         <span>Safari의 공유 ${PWA_SHARE_SVG} 버튼 → 목록을 <b>아래로 내려</b>
               <b>홈 화면에 추가</b>를 누르세요.</span>
       </div>${CLOSE}`
    : mode === 'ios-inapp'
    ? `<div class="pwa-install__txt">
         <b>별님앱을 홈 화면에 추가</b>
         <span>Safari에서 공유 ${PWA_SHARE_SVG} → <b>홈 화면에 추가</b>를 누르세요.</span>
       </div>
       <button class="sbtn sbtn--primary" id="pwaSafari">Safari로 열기</button>${CLOSE}`
    : mode === 'android-inapp'
    ? `<div class="pwa-install__txt">
         <b>별님앱 설치하기</b>
         <span>앱 안의 브라우저에서는 설치가 안 돼요.</span>
       </div>
       <button class="sbtn sbtn--primary" id="pwaChrome">크롬으로 열기</button>${CLOSE}`
    : mode === 'unsupported'
    ? `<div class="pwa-install__txt">
         <b>별님앱 설치하기</b>
         <span>브라우저 메뉴에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누르면 앱처럼 쓸 수 있어요.</span>
       </div>${CLOSE}`
    : `<div class="pwa-install__txt">
         <b>별님앱 설치하기</b>
         <span>홈 화면에 추가하면 앱처럼 바로 열 수 있어요.</span>
       </div>
       <button class="sbtn sbtn--primary" id="pwaGo">설치</button>${CLOSE}`;

  el.innerHTML = `<img class="pwa-install__icon" src="images/pwa/icon-192.png" alt="" />${body}`;
  el.classList.add('open');

  const close = document.getElementById('pwaClose');
  if (close) close.addEventListener('click', pwaDismiss);

  const chrome = document.getElementById('pwaChrome');
  if (chrome) chrome.addEventListener('click', pwaOpenInChrome);

  const safari = document.getElementById('pwaSafari');
  if (safari) safari.addEventListener('click', pwaOpenInSafari);

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

/* 어떤 안내를 띄울지 스스로 판단한다.
   beforeinstallprompt를 주는 환경(크롬/엣지)은 그 이벤트가 오면 위에서 처리하고,
   여기서는 "이벤트가 영영 오지 않는 환경"만 챙긴다:
     - 아이폰            : 이벤트 자체가 없는 브라우저
     - 앱내 브라우저     : WebView라 설치 불가 → 진짜 브라우저로 열라고 안내
     - 그 외 미지원      : 브라우저 메뉴로 직접 추가하도록 안내
   페이지가 뜨자마자 가리면 거슬려서 잠깐 뒤에 올린다. */
function pwaDecideBanner() {
  if (pwaIsInstalled()) return;
  if (pwaDeferredPrompt) return;            // 설치 버튼을 줄 수 있는 환경 — 이미 배너가 떠 있다

  if (pwaIsInAppBrowser()) {
    pwaShowBanner(pwaIsAndroid() ? 'android-inapp' : 'ios-inapp');
    return;
  }
  if (pwaIsIOS()) { pwaShowBanner('ios'); return; }
  // 크롬이면 곧 beforeinstallprompt가 올 수 있으니 조금 더 기다렸다가 그래도 없으면 수동 안내
  pwaShowBanner('unsupported');
}

window.addEventListener('load', () => {
  setTimeout(pwaDecideBanner, 1800);
});

/* 설정 모달의 "앱 설치" 버튼 — 배너를 닫았어도 여기서 다시 부를 수 있다 */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnInstallApp');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.getElementById('overlaySettings')?.classList.remove('open');
    if (pwaIsInstalled()) { alert('이미 홈 화면에 설치되어 있어요.'); return; }
    if (pwaDeferredPrompt) { pwaShowBanner('android', true); return; }
    if (pwaIsInAppBrowser()) { pwaShowBanner(pwaIsAndroid() ? 'android-inapp' : 'ios-inapp', true); return; }
    pwaShowBanner(pwaIsIOS() ? 'ios' : 'unsupported', true);
  });
});
