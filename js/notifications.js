// === 1. ВСТРАИВАЕМ HTML УВЕДОМЛЕНИЙ В СТРАНИЦУ ===
const notifyHtml = `
<!-- УВЕДОМЛЕНИЕ: ПРОПУЩЕННЫЙ ВИДЕОЗВОНОК -->
<div id="notify-video-call" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[92%] max-w-sm bg-[#111b21] border border-[#00a884] rounded-2xl shadow-2xl p-4 flex-col gap-3 pointer-events-auto">
    <div class="flex items-center gap-3">
        <img id="notify-video-photo" src="https://ui-avatars.com/api/?name=U&background=202c33&color=fff" class="w-11 h-11 rounded-full object-cover border border-[#00a884] shrink-0">
        <div class="flex-grow overflow-hidden">
            <h4 id="notify-video-name" class="text-white font-bold text-sm truncate">User</h4>
            <p id="notify-video-status" class="text-[#00a884] text-xs">Missed Video Call</p>
        </div>
        <i class="fa-solid fa-video text-[#00a884] text-lg"></i>
    </div>
    <div class="flex gap-2 mt-3">
        <button onclick="document.getElementById('notify-video-call').style.display='none'" class="flex-1 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-bold text-xs transition">Close</button>
        <button id="notify-video-btn" class="flex-1 py-2 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs transition">Call Back</button>
    </div>
</div>

<!-- УВЕДОМЛЕНИЕ: ПРОПУЩЕННЫЙ АУДИОЗВОНОК -->
<div id="notify-audio-call" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[92%] max-w-sm bg-[#111b21] border border-[#a29bfe] rounded-2xl shadow-2xl p-4 flex-col gap-3 pointer-events-auto">
    <div class="flex items-center gap-3">
        <img id="notify-audio-photo" src="https://ui-avatars.com/api/?name=U&background=202c33&color=fff" class="w-11 h-11 rounded-full object-cover border border-[#a29bfe] shrink-0">
        <div class="flex-grow overflow-hidden">
            <h4 id="notify-audio-name" class="text-white font-bold text-sm truncate">User</h4>
            <p id="notify-audio-status" class="text-[#a29bfe] text-xs">Missed Audio Call</p>
        </div>
        <i class="fa-solid fa-phone-volume text-[#a29bfe] text-lg"></i>
    </div>
    <div class="flex gap-2 mt-3">
        <button onclick="document.getElementById('notify-audio-call').style.display='none'" class="flex-1 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-bold text-xs transition">Close</button>
        <button id="notify-audio-btn" class="flex-1 py-2 rounded-xl bg-[#a29bfe] text-[#111b21] font-bold text-xs transition">Call Back</button>
    </div>
</div>

<!-- УВЕДОМЛЕНИЕ: НОВАЯ ПОЧТА (EMAIL) -->
<div id="notify-new-mail" style="display: none;" class="fixed top-4 left-0 right-0 mx-auto z-[9999] w-[92%] max-w-sm bg-[#111b21] border border-blue-500 rounded-2xl shadow-2xl p-3 flex-col gap-3 pointer-events-auto">
    <div class="flex items-center gap-3">
        <!-- Иконка слева (как аватарка в видеозвонке) -->
        <div class="w-11 h-11 rounded-full bg-[#202c33] text-blue-500 flex items-center justify-center border border-blue-500/50 shrink-0">
            <i class="fa-solid fa-envelope text-lg"></i>
        </div>
        <!-- Текст -->
        <div class="flex-grow overflow-hidden text-left">
            <h4 id="notify-mail-from" class="text-white font-bold text-sm truncate">От: Den</h4>
            <p id="notify-mail-subj" class="text-[#8696a0] text-xs truncate">У вас новое сообщение</p>
        </div>
    </div>
    <!-- Две кнопки снизу (как на 3-м фото) -->
    <div class="flex gap-2 mt-1">
        <button onclick="document.getElementById('notify-new-mail').style.display='none'" class="flex-1 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-bold text-xs transition">
            Закрыть
        </button>
        <button id="notify-mail-btn" onclick="document.getElementById('notify-new-mail').style.display='none'; window.switchTab(5); if(window.switchArchiveTab) window.switchArchiveTab('mail');" class="flex-1 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs transition">
            В архив
        </button>
    </div>
</div>


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

// === 2. ЗВУКИ И ЛОГИКА (С УМНЫМ i18n) ===
window.sndEmail = new Audio('email.mp3.wav');
window.sndMissedCall = new Audio('missed.mp3.wav');

window.showMailNotify = function(fromName, subject) {
    injectNotifications();
    const popup = document.getElementById('notify-new-mail');
    if (!popup) return;
    
    const lang = window.appLang || 'ru'; 
    const dict = window.i18n ? (window.i18n[lang] || window.i18n['ru'] || {}) : {};
    
    const titleText = dict['you_have_mail'] || "Вам письмо!";
    const btnText = dict['go_to_archive'] || "Перейти в архив";
    const fromWord = dict['from'] || "От";

    if (fromName) {
        document.getElementById('notify-mail-from').innerText = `${fromWord}: ${fromName}`;
    } else {
        document.getElementById('notify-mail-from').innerText = titleText;
    }
    
    if (subject) document.getElementById('notify-mail-subj').innerText = subject;
    
    const btn = document.getElementById('notify-mail-btn');
    if (btn) btn.innerText = btnText;

    popup.style.display = 'flex';
    window.sndEmail.play().catch(() => {});
};

window.showVideoCallNotify = function(name, photo, userId) {
    injectNotifications();
    const popup = document.getElementById('notify-video-call');
    if (!popup) return;

    if (name) document.getElementById('notify-video-name').innerText = name;
    if (photo) document.getElementById('notify-video-photo').src = photo;
    const btn = document.getElementById('notify-video-btn');
    if (btn && userId) {
        btn.onclick = function() {
            popup.style.display = 'none';
            window.switchTab(2);
            if (window.makeCallFromContact) window.makeCallFromContact(userId, 'video');
        };
    }
    popup.style.display = 'flex';
    window.sndMissedCall.play().catch(() => {});
};

window.showAudioCallNotify = function(name, photo, userId) {
    injectNotifications();
    const popup = document.getElementById('notify-audio-call');
    if (!popup) return;

    if (name) document.getElementById('notify-audio-name').innerText = name;
    if (photo) document.getElementById('notify-audio-photo').src = photo;
    const btn = document.getElementById('notify-audio-btn');
    if (btn && userId) {
        btn.onclick = function() {
            popup.style.display = 'none';
            window.switchTab(1);
            if (window.makeCallFromContact) window.makeCallFromContact(userId, 'voice');
        };
    }
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

        // 1. Достаем токен устройства получателя из базы
        const snapshot = await database.ref(`users/${targetUserId}/pushToken`).once('value');
        const targetPushToken = snapshot.val();

        if (!targetPushToken) {
            console.warn(`Нет токена для юзера ${targetUserId}. Пуш не отправлен.`);
            return;
        }

        // 2. Отправляем в OneSignal
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Тот самый правильный длинный ключ:
                "Authorization": "Basic Os_v2_app_6f6pqhv6fngrfgvvubo2lofpugko4vplekzucdezivrsowlwlznwrozlshdmdbudntarg3g6tqeqeqgpa3zpbrq3jy7gfgsfmqiacni"
            },
            body: JSON.stringify({
                app_id: "f17cf81e-be2b-4d12-9ab5-a05da5b8afa1", 
                include_player_ids: [targetPushToken], 
                headings: { "en": title, "ru": title },
                contents: { "en": body, "ru": body },
                data: payload // Передаем type, чтобы sw.js понял, что рисовать
            })
        });

        if (!response.ok) {
            console.error("Ошибка OneSignal:", await response.text());
        }
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
                allowLocalhostAsSecureOrigin: true, // Для тестов
            });
            
            // Если юзер дал разрешение - сохраняем его токен в Firebase
            OneSignal.on('subscriptionChange', function(isSubscribed) {
                if (isSubscribed) {
                    OneSignal.getUserId(function(userId) {
                        if (userId) {
                            firebase.database().ref(`users/${myId}/pushToken`).set(userId);
                            console.log("Push-токен сохранен:", userId);
                        }
                    });
                }
            });
            
            // Показываем окно запроса разрешений, если еще не дали
            OneSignal.showNativePrompt();
        });
    }
};

// Вызываем регистрацию после загрузки
setTimeout(() => { if (window.registerOneSignal) window.registerOneSignal(); }, 3000);
            
