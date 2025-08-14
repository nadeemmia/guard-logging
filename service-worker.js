const CACHE = 'guardlog-v1';
const ASSETS = [
  '/', '/index.html', '/main.js', '/offline-queue.js', '/manifest.json'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res => res || fetch(req).then(networkRes=>{
      // Cache HTML shell for offline
      if(req.method==='GET' && req.headers.get('accept')?.includes('text/html')){
        const copy = networkRes.clone();
        caches.open(CACHE).then(c=> c.put(req, copy));
      }
      return networkRes;
    }).catch(()=> caches.match('/index.html')))
  );
});
