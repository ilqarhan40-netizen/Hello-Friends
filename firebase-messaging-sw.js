// Этот файл делает приложение полноценным PWA и позволяет 
// браузеру телефона работать с фоновыми уведомлениями нашей базы
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
});
