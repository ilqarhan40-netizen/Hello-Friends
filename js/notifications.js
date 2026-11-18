// === 1. ВСТРАИВАЕМ HTML УВЕДОМЛЕНИЙ В СТРАНИЦУ ===
const notifyHtml = `
<!-- УВЕДОМЛЕНИЕ: ПРОПУЩЕННЫЙ ВИДЕОЗВОНОК -->
<div id="notify-video-call" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-[340px] bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-3 pointer-events-auto relative">
    <button onclick="document.getElementById('notify-video-call').style.display='none'" class="absolute top-2 right-3 text-[#8696a0] hover:text-white transition text-lg">
        <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="flex items-center gap-3 pr-6">
        <img id="notify-video-photo" src="https://ui-avatars.com/api/?name=U" class="w-10 h-10 rounded-full object-cover shrink-0 border border-[#2a3942]">
        <div class="flex flex-col overflow-hidden">
            <p class="text-[#00a884] text-[10px] font-bold uppercase tracking-widest">Пропущенный видеозвонок</p>
            <h4 id="notify-video-name" class="text-white font-bold text-[13px] mt-0.5 truncate">User</h4>
        </div>
    </div>
</div>

<!-- УВЕДОМЛЕНИЕ: ПРОПУЩЕННЫЙ АУДИОЗВОНОК -->
<div id="notify-audio-call" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-[340px] bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-3 pointer-events-auto relative">
    <button onclick="document.getElementById('notify-audio-call').style.display='none'" class="absolute top-2 right-3 text-[#8696a0] hover:text-white transition text-lg">
        <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="flex items-center gap-3 pr-6">
        <img id="notify-audio-photo" src="https://ui-avatars.com/api/?name=U" class="w-10 h-10 rounded-full object-cover shrink-0 border border-[#2a3942]">
        <div class="flex flex-col overflow-hidden">
            <p class="text-[#a29bfe] text-[10px] font-bold uppercase tracking-widest">Пропущенный вызов</p>
            <h4 id="notify-audio-name" class="text-white font-bold text-[13px] mt-0.5 truncate">User</h4>
        </div>
    </div>
</div>

<!-- УВЕДОМЛЕНИЕ: НОВАЯ ПОЧТА (EMAIL) -->
<div id="notify-new-mail" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[90%] max-w-[340px] bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-3 pointer-events-auto relative cursor-pointer hover:bg-[#202c33] transition" onclick="document.getElementById('notify-new-mail').style.display='none'; window.switchTab(5); if(window.switchArchiveTab) window.switchArchiveTab('mail');">
    <button onclick="event.stopPropagation(); document.getElementById('notify-new-mail').style.display='none';" class="absolute top-2 right-3 text-[#8696a0] hover:text-white transition text-lg z-10">
        <i class="fa-solid fa-xmark"></i>
    </button>
    <div class="flex items-center gap-3 pr-6">
        <div class="w-10 h-10 rounded-full bg-[#202c33] text-blue-500 flex items-center justify-center shrink-0 border border-[#2a3942]">
            <i class="fa-solid fa-envelope text-lg"></i>
        </div>
        <div class="flex flex-col overflow-hidden text-left">
            <p id="notify-mail-from" class="text-blue-500 text-[10px] font-bold uppercase tracking-widest">Новое письмо</p>
            <h4 id="notify-mail-subj" class="text-white font-bold text-[13px] mt-0.5 truncate">У вас сообщение</h4>
        </div>
    </div>
</div>
`;

function injectNotifications() {
    if (document.body && !document.getElementById('notify-video-call')) {
        document.body.insertAdjacentHTML('beforeend', notifyHtml);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", injectNotifications);
} else {
    injectNotifications();
}

// === 2. ЗВУКИ И ЛОГИКА ===
window.sndEmail = new Audio('email.mp3.wav');
window.sndMissedCall = new Audio('missed.mp3.wav');

window.showMailNotify = function(fromName, subject) {
    injectNotifications();
    const popup = document.getElementById('notify-new-mail');
    if (!popup) return;
    
    if (fromName) document.getElementById('notify-mail-from').innerText = `ОТ: ${fromName}`;
    if (subject) document.getElementById('notify-mail-subj').innerText = subject;

    popup.style.display = 'flex';
    window.sndEmail.play().catch(() => {});
};

window.showVideoCallNotify = function(name, photo, userId) {
    injectNotifications();
    const popup = document.getElementById('notify-video-call');
    if (!popup) return;

    if (name) document.getElementById('notify-video-name').innerText = `${name} не дождался ответа`;
    if (photo) document.getElementById('notify-video-photo').src = photo;
    
    popup.style.display = 'flex';
    window.sndMissedCall.play().catch(() => {});
};

window.showAudioCallNotify = function(name, photo, userId) {
    injectNotifications();
    const popup = document.getElementById('notify-audio-call');
    if (!popup) return;

    if (name) document.getElementById('notify-audio-name').innerText = `${name} оставил(а) пропущенный`;
    if (photo) document.getElementById('notify-audio-photo').src = photo;
    
    popup.style.display = 'flex';
    window.sndMissedCall.play().catch(() => {});
};

// === 3. СЛУШАТЕЛИ FIREBASE (РАДАР ПРИ ВХОДЕ В ПРИЛОЖЕНИЕ) ===
window.initAllNotifications = function() {
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    if (!myId || myId === 'guest') return;

    const database = typeof firebase !== 'undefined' ? firebase.database() : (typeof db !== 'undefined' ? db : null);
    if (!database) return;

    if (typeof injectNotifications === 'function') injectNotifications();

    // 1. ПРОПУЩЕННЫЕ ЗВОНКИ
    const missedRef = database.ref('users/' + myId + '/missedCalls');
    
    missedRef.once('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const call = child.val();
                if (call.type === 'video') window.showVideoCallNotify(call.callerName || "User", call.callerPhoto, call.callerId);
                else window.showAudioCallNotify(call.callerName || "User", call.callerPhoto, call.callerId);
            });
            missedRef.remove().catch(()=>{});
        }
    });

    missedRef.on('child_added', snap => {
        const call = snap.val();
        if (call) {
            if (call.type === 'video') window.showVideoCallNotify(call.callerName || "User", call.callerPhoto, call.callerId);
            else window.showAudioCallNotify(call.callerName || "User", call.callerPhoto, call.callerId);
            snap.ref.remove().catch(()=>{}); 
        }
    });

    // 2. НОВЫЕ ПИСЬМА
    const mailNotifRef = database.ref('notifications/' + myId);
    
    mailNotifRef.once('value', snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const mail = child.val();
                if (mail && mail.type === 'email') {
                    window.showMailNotify(mail.from || "User", mail.subject || "У вас новое сообщение");
                    const badge = document.getElementById('mail-badge');
                    if (badge) badge.classList.remove('hidden');
                }
            });
            mailNotifRef.remove().catch(()=>{});
        }
    });

    mailNotifRef.on('child_added', snap => {
        const mail = snap.val();
        if (mail && mail.type === 'email') {
            window.showMailNotify(mail.from || "User", mail.subject || "У вас новое сообщение");
            const badge = document.getElementById('mail-badge');
            if (badge) badge.classList.remove('hidden');
            snap.ref.remove().catch(()=>{});
        }
    });
};

setTimeout(() => { if (window.initAllNotifications) window.initAllNotifications(); }, 2500);

// === 4. ФУНКЦИЯ ОТПРАВКИ PUSH В ONESIGNAL ===
window.sendPushNotification = async function(targetUserId, payload, title, body) {
    if (!targetUserId) return;
    
    try {
        const database = typeof firebase !== 'undefined' ? firebase.database() : (typeof db !== 'undefined' ? db : null);
        if (!database) return;

        // Достаем токен устройства получателя
        const snapshot = await database.ref(`users/${targetUserId}/pushToken`).once('value');
        const targetPushToken = snapshot.val();

        if (!targetPushToken) return;

        // Отправляем в OneSignal
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Твой чистый REST API ключ
                "Authorization": "Basic Os_v2_app_6f6pqhv6fngrfgvvubo2lofpugko4vplekzucdezivrsowlwlznwrozlshdmdbudntarg3g6tqeqeqgpa3zpbrq3jy7gfgsfmqiacni"
            },
            body: JSON.stringify({
                app_id: "f17cf81e-be2b-4d12-9ab5-a05da5b8afa1", 
                include_player_ids: [targetPushToken], 
                headings: { "en": title, "ru": title },
                contents: { "en": body, "ru": body },
                data: payload 
            })
        });
    } catch (error) {
        console.error("Ошибка сети при отправке пуша:", error);
    }
};

// === 5. РЕГИСТРАЦИЯ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ В ONESIGNAL ===
window.registerOneSignal = function() {
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    if (!myId || myId === 'guest') return;

    if (typeof OneSignal !== 'undefined') {
        OneSignal.push(function() {
            OneSignal.init({
                appId: "f17cf81e-be2b-4d12-9ab5-a05da5b8afa1",
                allowLocalhostAsSecureOrigin: true, 
            });
            
            // Сохраняем токен в Firebase
            OneSignal.on('subscriptionChange', function(isSubscribed) {
                if (isSubscribed) {
                    OneSignal.getUserId(function(userId) {
                        if (userId) {
                            firebase.database().ref(`users/${myId}/pushToken`).set(userId);
                        }
                    });
                }
            });
            
            OneSignal.showNativePrompt();
        });
    }
};

setTimeout(() => { if (window.registerOneSignal) window.registerOneSignal(); }, 3000);
