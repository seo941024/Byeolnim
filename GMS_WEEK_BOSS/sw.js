/* ═══════════════════════════════════════════════
   서비스 워커 — PWA(홈 화면에 추가) 설치와 오프라인 지원.

   ★ 캐시 전략을 이렇게 잡은 이유 (중요)
   이 프로젝트는 "고쳤는데 반영이 안 된다"는 오보고가 여러 세션 반복돼서
   index.html의 ?v= 캐시 버스팅까지 도입한 이력이 있다. 서비스 워커는 그 위에
   캐시 계층을 하나 더 얹는 것이라, 잘못 만들면 같은 문제를 훨씬 악질적으로
   되살린다(사용자가 강력 새로고침을 해도 SW가 옛 파일을 준다).
   그래서 코드(HTML/JS/CSS)는 반드시 네트워크를 먼저 보고, 캐시는 오프라인일 때만
   쓰는 network-first로 간다. 이미지·폰트만 cache-first로 캐싱해서 속도를 얻는다.
   API 응답은 서버 상태·랭킹 같은 실시간 데이터라 아예 캐싱하지 않는다.
═══════════════════════════════════════════════ */

// 캐시 이름을 바꾸면 이전 캐시는 activate에서 전부 지워진다.
const CACHE = 'mappu-v3';

/* 오프라인일 때 최소한 화면은 뜨도록 미리 받아두는 것들.
   알림 아이콘도 넣는다 — 푸시로 워커가 막 깨어난 순간에는 네트워크가 아직
   느려서 아이콘을 못 받아오고, 그러면 크롬 기본 아이콘(종 모양)으로 대체된다.
   이미지는 cache-first라 미리 넣어두면 네트워크 없이 즉시 뜬다. */
const PRECACHE = ['/', '/index.html', '/images/pwa/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      // 하나라도 실패해도 설치는 계속한다 — 오프라인 대비는 부가 기능일 뿐
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── 보스 알림 ──
   서버(api/push-tick)가 밀어준 알림을 띄운다. 앱이 닫혀 있어도 이 워커는 깨어나
   실행되기 때문에, 폰이 잠겨 있어도 알림이 뜬다. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }

  e.waitUntil(self.registration.showNotification(d.title || '보스 시간', {
    body: d.body || '',
    // 절대 경로로 둔다 — 상대 경로는 워커 위치를 기준으로 풀려서, 나중에 워커를
    // 하위 폴더로 옮기면 조용히 깨진다. 이 경로 그대로 PRECACHE에도 넣어야 한다.
    icon: '/images/pwa/icon-192.png',
    badge: '/images/pwa/icon-192.png',
    // 같은 일정이 여러 번 와도 알림이 쌓이지 않게 하나로 합친다
    tag: d.tag || 'boss',
    renotify: true,
    data: { url: d.url || '/' },
  }));
});

/* 알림을 누르면 이미 열려 있는 창을 앞으로 가져오고, 없으면 새로 연다.
   무조건 새 창을 열면 탭이 계속 쌓인다. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});

/* 이미지·폰트인지 (cache-first 대상). 보스 gif가 수 MB라 캐싱 효과가 크고,
   파일명이 바뀌지 않는 정적 리소스라 오래 캐싱해도 안전하다. */
function isAsset(req, url) {
  if (req.destination === 'image' || req.destination === 'font') return true;
  return /\.(png|jpe?g|webp|gif|svg|ico|ttf|woff2?)$/i.test(url.pathname);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 다른 도메인(넥슨 아바타 이미지 등)은 건드리지 않는다
  if (url.origin !== self.location.origin) return;
  // 서버 상태·랭킹 조회는 실시간 데이터 — 캐싱하면 안 된다
  if (url.pathname.startsWith('/api/')) return;

  if (isAsset(req, url)) {
    // cache-first: 있으면 즉시 주고, 없으면 받아서 저장
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // 코드(HTML/JS/CSS): network-first — 배포한 수정이 항상 바로 반영되게 한다.
  // 네트워크가 죽었을 때만 캐시로 떨어지고, 그것도 없으면 시작 페이지를 준다.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit =>
        hit || (req.mode === 'navigate' ? caches.match('/index.html') : undefined)
      ))
  );
});
