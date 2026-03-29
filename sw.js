const CACHE_NAME = 'hf-chat-v3'; // ВАЖНО: Сменили v2 на v3! Это даст команду браузерам обновиться.

const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  self.skipWaiting(); // Заставляет воркер активироваться немедленно
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Активация и бронебойное УДАЛЕНИЕ старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Старый зомби-кэш убит:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Захват управления вкладками
  );
});

// 3. БРОНЕБОЙНАЯ ОТДАЧА ФАЙЛОВ (Network-First)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; 

  // Игнорируем запросы к Firebase API, чтобы чат летал в реальном времени
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
      return;
  }

  event.respondWith(
    // СНАЧАЛА идем в интернет за свежим кодом (например, на GitHub)
    fetch(event.request)
      .then(response => {
        // Если скачали успешно - параллельно обновляем кэш
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
        });
        return response; // Отдаем свежую версию юзеру
      })
      .catch(() => {
        // ЕСЛИ ИНТЕРНЕТА НЕТ (оффлайн) - только тогда берем из кэша
        return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                console.log('Оффлайн режим: загружено из кэша', event.request.url);
                return cachedResponse;
            }
        });
      })
  );
});
