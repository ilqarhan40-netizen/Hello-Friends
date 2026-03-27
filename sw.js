const CACHE_NAME = 'hf-chat-v2'; 

// Добавили точки! Теперь пути относительные 📁
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Активация и УДАЛЕНИЕ старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Старый кэш удален:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Захват управления вкладками
  );
});

// 3. Отдача файлов из сети или кэша
self.addEventListener('fetch', event => {
  // Игнорируем всё, кроме обычных GET-запросов (не трогаем Firebase и WebSockets)
  if (event.request.method !== 'GET') {
      return; 
  }

  // Игнорируем запросы к самому Firebase API, чтобы чат не вис
  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => {
             // Тихий fallback на случай отсутствия сети
             console.log('Оффлайн: ресурс недоступен', event.request.url);
        });
      })
  );
});
