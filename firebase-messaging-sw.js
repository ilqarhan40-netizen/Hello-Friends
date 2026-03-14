importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Подключаем ту же базу, что и в основном приложении
firebase.initializeApp({
  apiKey: "AIzaSyBtIJPFKNNUn1XW5b44tdomXTPHNI2Px40",
  projectId: "hello-friends-p8p3i7",
  messagingSenderId: "367351601053", // ID вашего проекта
  appId: "1:367351601053:web:7852c0326db9cc233d44ba"
});

const messaging = firebase.messaging();

// Ловим фоновые звонки и сообщения, когда телефон заблокирован
messaging.setBackgroundMessageHandler(function(payload) {
  console.log('[firebase-messaging-sw.js] Получено фоновое сообщение ', payload);
  
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || 'https://ui-avatars.com/api/?name=HF&background=00a884&color=fff',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Сильная вибрация для звонка
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
