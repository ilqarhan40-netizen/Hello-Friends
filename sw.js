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
    })
  );
});

// 3. Отдача файлов из сети или кэша
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
