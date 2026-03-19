importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Ваши ключи из index.html
firebase.initializeApp({
  apiKey: "AIzaSyCVFkMsqelcnjjeIwGnAKmn1CFhDGc7kR0",
  projectId: "hello-friends-p8p3i7",
  messagingSenderId: "367351601053",
  appId: "1:367351601053:web:7852c0326db9cc233d44ba"
});

const messaging = firebase.messaging();

// Ловим сообщения в фоновом режиме (когда приложение свернуто)
messaging.onBackgroundMessage(function(payload) {
  console.log('Пойман фоновый Push: ', payload);

  const notificationTitle = payload.data.title || 'Hello Friends';
  const notificationOptions = {
    body: payload.data.body || 'Новое уведомление',
    icon: payload.data.icon || 'https://ui-avatars.com/api/?name=HF&background=00a884&color=fff',
    badge: 'https://ui-avatars.com/api/?name=HF&background=00a884&color=fff',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // Длинная вибрация для привлечения внимания
    data: { url: '/' } // Куда перекинуть при клике на Push
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
