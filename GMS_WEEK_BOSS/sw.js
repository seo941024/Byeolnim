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
const CACHE = 'byeolnim-v1';

// 오프라인일 때 최소한 화면은 뜨도록 미리 받아두는 것들
const PRECACHE = ['/', '/index.html'];

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
