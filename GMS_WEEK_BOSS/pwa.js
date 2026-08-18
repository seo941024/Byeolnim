/* ═══════════════════════════════════════════════
   pwa.js — "앱으로 설치" 안내 배너

   안드로이드/데스크톱 크롬은 설치 조건을 만족하면 beforeinstallprompt 이벤트를
   주는데, 이걸 잡아두지 않으면 브라우저가 알아서 주는 작은 배너에만 의존하게 되고
   그마저도 잘 안 뜬다. 그래서 이벤트를 가로채 두었다가 우리 버튼을 눌렀을 때
   설치창을 띄운다.

   아이폰 사파리에는 이 이벤트가 아예 없다. 설치를 코드로 띄울 방법이 없어서
   "공유 → 홈 화면에 추가"를 직접 안내하는 수밖에 없다.
═══════════════════════════════════════════════ */

const PWA_DISMISS_KEY = 'pwa_install_dismissed';   // 닫기 누른 시각(ms). 기간이 지나면 다시 뜬다
const PWA_INSTALLED_KEY = 'pwa_installed';        // 진짜 설치가 끝났을 때만 기록
const PWA_DISMISS_DAYS = 7;

let pwaDeferredPrompt = null;

/* 닫기를 눌렀어도 영영 숨기지는 않는다. 한 번 놓치면 다시 볼 방법이 없어지기 때문. */
function pwaRecentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(PWA_DISMISS_KEY) || 0);
    if (!t) return false;
    return Date.now() - t < PWA_DISMISS_DAYS * 86400000;
  } catch { return false; }
}

/* 설치 완료 여부. 브라우저 탭으로 열면 standalone이 아니라서 화면만으로는 알 수 없어
   appinstalled 이벤트가 왔을 때 남겨둔 기록도 같이 본다. */
function pwaAlreadyInstalled() {
  if (pwaIsInstalled()) return true;
  try { return localStorage.getItem(PWA_INSTALLED_KEY) === '1'; } catch { return false; }
}

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

/* 좁은 화면(= 사실상 폰)인지. 설치 안내와 알림 유도는 폰에서만 저절로 띄운다.
   웹/모바일 사이트를 따로 만들 필요 없이 이 조건 하나로 갈린다. */
function pwaIsNarrow() {
  return window.matchMedia('(max-width: 768px)').matches;
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

/* 닫기 — 지금 화면에서만 치운다. 다음에 들어오면 다시 뜬다.
   한 번 닫았다고 영영 숨기면 나중에 설치하고 싶어졌을 때 방법이 없어진다. */
function pwaDismiss() {
  pwaHide();
}

/* 일주일간 보지 않기 — 이걸 눌렀을 때만 기간을 두고 숨긴다 */
function pwaSnooze() {
  try { localStorage.setItem(PWA_DISMISS_KEY, String(Date.now())); } catch {}
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
  if (pwaAlreadyInstalled()) return;
  // 홈 화면에 추가하는 건 폰에서 하는 일이라, 데스크톱에서 저절로 뜨면 방해만 된다.
  // 설정에서 직접 부른 경우(force)는 본인이 원한 것이므로 화면 크기와 무관하게 보여준다.
  if (!force && !pwaIsNarrow()) return;
  if (!force && pwaRecentlyDismissed()) return;

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

  el.innerHTML =
    `<button class="pwa-install__snooze" id="pwaSnooze">일주일간 보지 않기</button>` +
    `<img class="pwa-install__icon" src="images/pwa/icon-192.png" alt="" />${body}`;
  el.classList.add('open');

  const close = document.getElementById('pwaClose');
  if (close) close.addEventListener('click', pwaDismiss);

  const snooze = document.getElementById('pwaSnooze');
  if (snooze) snooze.addEventListener('click', pwaSnooze);

  const chrome = document.getElementById('pwaChrome');
  if (chrome) chrome.addEventListener('click', pwaOpenInChrome);

  const safari = document.getElementById('pwaSafari');
  if (safari) safari.addEventListener('click', pwaOpenInSafari);

  const go = document.getElementById('pwaGo');
  if (go) go.addEventListener('click', async () => {
    // 설치 이벤트를 이미 써버렸거나 못 받은 경우. 아무 반응이 없으면 사용자가
    // 뭘 잘못했나 싶으므로, 브라우저 메뉴로 설치하는 방법을 대신 안내한다.
    if (!pwaDeferredPrompt) return pwaShowBanner('unsupported', true);

    pwaDeferredPrompt.prompt();
    await pwaDeferredPrompt.userChoice;
    // prompt()는 한 번만 쓸 수 있어 결과와 무관하게 버린다
    pwaDeferredPrompt = null;
    // ★ "설치를 눌렀다"와 "설치가 끝났다"는 다르다. 눌러도 마지막 단계에서
    //   실패하는 일이 실제로 있었고, 그때 설치된 것으로 기록해버리면 앱은 없는데
    //   안내는 영영 안 뜨는 상태가 된다. 완료 기록은 appinstalled에서만 남긴다.
    pwaHide();
  });
}

/* 안드로이드·크롬: 설치 가능해지는 순간 이벤트가 온다.
   preventDefault를 해야 브라우저 기본 배너 대신 우리 배너를 쓸 수 있다.

   ★ 이 이벤트가 온다는 것 자체가 "지금은 설치돼 있지 않다"는 확실한 신호다
   (이미 설치된 상태면 브라우저가 이 이벤트를 안 준다). 그런데 설치 완료 기록은
   한 번 남기면 지우질 않아서, 설치했다가 앱을 지워도 그 기록이 그대로 남아
   배너가 영영 다시 뜨지 않는 문제가 있었다(실제로 겪음: 설치→삭제→재방문해도
   배너가 안 뜸). 이 이벤트를 받은 순간 그 낡은 기록부터 지운다. */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  pwaDeferredPrompt = e;
  try { localStorage.removeItem(PWA_INSTALLED_KEY); } catch {}
  pwaShowBanner('android');
});

// 설치가 진짜로 끝났을 때만 온다. 여기서만 "설치됨"을 기록한다.
window.addEventListener('appinstalled', () => {
  pwaDeferredPrompt = null;
  try { localStorage.setItem(PWA_INSTALLED_KEY, '1'); } catch {}
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
