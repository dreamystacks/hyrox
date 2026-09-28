// Offline cache. Pages always come fresh from the network when online; cache is only the offline fallback.
const VERSION='hyrox-v23';const FILES=['./','index.html','manifest.json','icon-192.png','icon-512.png','icon-volt-dark-180.png','icon-volt-dark-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 const isPage=r.mode==='navigate'||r.url.endsWith('.html')||r.url.endsWith('/');
 e.respondWith(fetch(isPage?new Request(r.url,{cache:'no-store'}):r).then(res=>{const c=res.clone();caches.open(VERSION).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});
