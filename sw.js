// 0. ПОДКЛЮЧАЕМ ONESIGNAL В САМОМ НАЧАЛЕ
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'hf-chat-v4'; // Подняли версию, чтобы точно обновить

const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 2. Активация и УДАЛЕНИЕ старого кэша
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
    }).then(() => self.clients.claim())
  );
});

// 3. БРОНЕБОЙНАЯ ОТДАЧА ФАЙЛОВ (Network-First)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; 

  if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com')) {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                console.log('Оффлайн режим: загружено из кэша', event.request.url);
                return cachedResponse;
            }
        });
      })
  );
});

// ==============================================================
// 4. ЛОГИКА ФОНОВЫХ ЗВОНКОВ И ВИБРАЦИИ (ONESIGNAL)
// ==============================================================
self.addEventListener('push', function(event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) return;

    const data = event.data ? event.data.json() : {};
    const payload = data.custom?.a || {}; // Те самые customData из calls.js

    // А. ВХОДЯЩИЙ ЗВОНОК
    if (payload.type === 'call') {
        const callOptions = {
            body: `Входящий вызов от ${payload.callerName || 'контакта'}`,
            icon: '/img/logo.png',
            tag: 'incoming-call',
            renotify: true,
            requireInteraction: true, // Уведомление висит, пока не ответишь
            vibrate: [500, 200, 500, 200, 500, 200, 800], // Будит телефон!
            data: { url: '/?index=1' } 
        };
        event.waitUntil(self.registration.showNotification('📞 Входящий Звонок', callOptions));
    }

    // Б. ПРОПУЩЕННЫЙ ЗВОНОК
    if (payload.type === 'missed') {
        // Прячем уведомление о текущем звонке
        self.registration.getNotifications({tag: 'incoming-call'}).then(notifications => {
            notifications.forEach(n => n.close());
        });

        const missedOptions = {
            body: `Пропущенный вызов от ${payload.callerName || 'контакта'}`,
            icon: '/img/logo.png',
            vibrate: [200, 100, 200], // Короткая вибрация отбоя
            tag: 'missed-call'
        };
        event.waitUntil(self.registration.showNotification('📵 Пропущенный', missedOptions));
    }
});
