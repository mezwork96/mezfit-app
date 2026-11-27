const C='mezfit-v20';
const FILES=['./','index.html','i18n.js','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'];
const NET_TIMEOUT=4000; // ms: oltre questo tempo si usa la copia in cache
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting();});
// si cancellano solo le cache di MezFit: sullo stesso dominio possono esserci altri siti
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('mezfit-')&&x!==C).map(x=>caches.delete(x)))));self.clients.claim();});
const isNav=r=>r.mode==='navigate'||(r.headers.get('accept')||'').includes('text/html');
function withTimeout(p,ms){return new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error('timeout')),ms);p.then(v=>{clearTimeout(t);res(v);},e=>{clearTimeout(t);rej(e);});});}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  if(new URL(req.url).origin!==self.location.origin)return; // altre origini (es. Open Food Facts): passano dirette, mai in cache
  e.respondWith((async()=>{
    try{
      const r=await withTimeout(fetch(req),NET_TIMEOUT);
      if(r&&r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp)).catch(()=>{});return r;} // in cache solo risposte 200 della stessa origine
      const c=await caches.match(req); return c||r; // errore del server (es. 503): meglio la copia in cache, se c'è
    }catch(err){
      const c=await caches.match(req); if(c)return c;
      if(isNav(req)){const h=await caches.match('index.html');if(h)return h;} // solo le pagine ricadono su index.html
      return new Response('',{status:504,statusText:'offline'});
    }
  })());
});
