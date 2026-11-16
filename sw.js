/* MutqinSpace — Service Worker
   • Aset statis: cache-first (instan & bisa dibuka offline), diperbarui di latar (stale-while-revalidate).
   • Permintaan ke Google Apps Script (API) TIDAK PERNAH di-cache — data selalu dari server;
     penyimpanan offline data ditangani aplikasi (outbox di localStorage).
   Naikkan VERSI setiap kali mengunggah perubahan frontend. */
const VERSI = 'mutqinspace-v1.0.0';
const ASET = [
  './', './index.html', './manifest.json', './css/style.css?v=1.0.0',
  './js/config.js?v=1.0.0', './js/quran.js?v=1.0.0', './js/core.js?v=1.0.0', './js/ui.js?v=1.0.0', './js/app.js?v=1.0.0',
  './js/pages/komponen.js?v=1.0.0', './js/pages/dashboard.js?v=1.0.0', './js/pages/setoran.js?v=1.0.0', './js/pages/presensi.js?v=1.0.0',
  './js/pages/santri.js?v=1.0.0', './js/pages/halaqah.js?v=1.0.0', './js/pages/laporan.js?v=1.0.0', './js/pages/notifikasi.js?v=1.0.0',
  './js/pages/pengaturan.js?v=1.0.0', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then(c => Promise.all(ASET.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                              // POST ke API: biarkan lewat
  if (/script\.google(usercontent)?\.com|googleapis\.com\/oauth|accounts\.google\.com/.test(url.host + url.pathname)) return;
  const sameOrigin = url.origin === self.location.origin;
  const font = /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(url.host);
  if (!sameOrigin && !font) return;
  if (req.mode === 'navigate') {                                                  // halaman: jaringan dulu, cadangan cache
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSI).then(x => x.put('./index.html', c)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(VERSI).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
