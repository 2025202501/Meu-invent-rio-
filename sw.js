// AgroCall Service Worker — v1.0
const CACHE = 'agrocall-v1';

// Arquivos para cache offline
const ASSETS = [
  './agrocall.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

// Instalar — cachear assets principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Ativar — limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first para assets, network-first para Firebase/API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Deixar Firebase e APIs passarem direto pela rede
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('microsoft.com') ||
    url.hostname.includes('microsoftonline.com')
  ) {
    return; // sem interceptação
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cachear apenas respostas válidas e de origens confiáveis
        if (
          response.ok &&
          (url.hostname === self.location.hostname ||
           url.hostname.includes('cdnjs.cloudflare.com'))
        ) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: retornar o HTML principal
        if (e.request.destination === 'document') {
          return caches.match('./agrocall.html');
        }
      });
    })
  );
});
