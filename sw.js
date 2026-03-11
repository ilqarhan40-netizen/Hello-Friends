const CACHE_NAME = 'hf-app-v1';

// Установка сервис-воркера
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Установлен');
    self.skipWaiting();
});

// Активация
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Активирован');
});

// Перехват запросов (обязательно для PWA)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
