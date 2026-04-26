importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// Слушатель фоновых событий
self.addEventListener('push', function(event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) return;

    const data = event.data ? event.data.json() : {};
    const payload = data.custom?.a || {};

    // 1. Логика ВХОДЯЩЕГО ЗВОНКА
    if (payload.type === 'call') {
        const callOptions = {
            body: `Входящий ${payload.callType === 'video' ? 'видео' : 'аудио'}звонок от ${payload.callerName}`,
            icon: '/img/logo.png',
            badge: '/img/badge.png',
            tag: 'incoming-call',
            renotify: true,
            requireInteraction: true, // Уведомление не исчезнет, пока не нажмут
            vibrate: [500, 200, 500, 200, 500, 200, 800], // Виброзвонок
            data: { url: '/?index=1' } 
        };
        event.waitUntil(self.registration.showNotification('📞 ЗВОНОК', callOptions));
    }

    // 2. Логика ПРОПУЩЕННОГО ВЫЗОВА
    if (payload.type === 'missed') {
        // Убираем уведомление о звонке, если оно еще висит
        self.registration.getNotifications({tag: 'incoming-call'}).then(notifications => {
            notifications.forEach(n => n.close());
        });

        const missedOptions = {
            body: `Пропущенный вызов от ${payload.callerName}`,
            icon: '/img/logo.png',
            vibrate: [200, 100, 200],
            tag: 'missed-call'
        };
        event.waitUntil(self.registration.showNotification('📵 ПРОПУЩЕННЫЙ', missedOptions));
    }
});
