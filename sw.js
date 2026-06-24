// Копібара — service worker. Оновлення КЕРОВАНЕ: нова версія чекає згоди,
// застосунок показує запит «є оновлення» з переліком змін і оновлюється лише за натиском.
const VERSION = '2026.07.05';
const NOTES = [
  '3D-перегляд конуса антени (азимут/кут/нахил/дальність, обертання, застосувати до мапи)',
  'Чорно-біла мапа (тайли grayscale), оверлеї лишаються кольоровими',
  'Чіткі SVG-іконки на головній (зліт/посадка/поділитися/карта/звіт/скинути)',
  'Нові SVG-іконки кнопок на головній',
  'Іконка-шеврон «Capibara fly mode»',
  'Звіт можна редагувати в попередньому перегляді перед надсиланням',
  'Кнопки-іконки без підписів, акуратне розташування; вимкнено масштабування пальцями',
  'Кнопки без рамок і фону, з іконками',
  'Виправлено помилку запуску (елемент не знайдено)',
  'Інтерфейс повністю українською',
  'Адаптивний інтерфейс під сучасні екрани (safe-area, масштабування)',
  'Встановлення на будь-який пристрій, з інструкцією для iOS',
  'Оновлені шаблони коментарів (артилерія, fpv, супровід, розвідка тощо)',
  'Зміна та тиждень — список вильотів (взліт–сів, тривалість, коментар)',
  'Перемикач «Показувати конус» на мапі (типово вимкнено)',
  'Сектор антени з урахуванням рельєфу (онлайн)',
  'Нові іконки застосунку',
  'Оновлення тепер за запитом, з переліком змін',
];
const CACHE = 'kapibara-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // НЕ викликаємо skipWaiting — нова версія лишається у стані waiting до згоди користувача
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  const d = e.data;
  if (d === 'skipWaiting') { self.skipWaiting(); return; }
  if (d && d.type === 'getVersion' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ version: VERSION, notes: NOTES });
  }
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  const isDoc = req.mode === 'navigate' ||
                (sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));

  // Документ — З КЕШУ перш за все (кероване оновлення), мережа лише як запас на першому завантаженні.
  if (isDoc) {
    e.respondWith(
      caches.match('./index.html').then(c => c || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(ch => ch.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./')))
    );
    return;
  }

  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
