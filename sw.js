// 오프라인 셸 캐시. 화면 이동(HTML)은 네트워크 우선·실패 시 캐시, 그 밖의 같은 출처 GET 자산은 캐시 우선.
// main.tsx 는 운영 빌드(import.meta.env.PROD)에서만 등록할 것 — 개발 서버 모듈을 캐시하면 HMR 이 깨진다.
const CACHE = 'ganpan-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const html = await fetch('./', { cache: 'reload' }).then((r) => r.text()).catch(() => '');
    const urls = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
    await Promise.allSettled(['./', ...urls].map((u) => c.add(u))); // 하나가 실패해도 설치는 끝낸다
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const save = (res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };
  e.respondWith(req.mode === 'navigate'
    ? fetch(req).then(save).catch(() => caches.match(req).then((hit) => hit || caches.match('./')))
    : caches.match(req).then((hit) => hit || fetch(req).then(save)));
});
