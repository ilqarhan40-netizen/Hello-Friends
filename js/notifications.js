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
<div id="notify-new-mail" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[92%] max-w-sm bg-[#111b21] border border-blue-400 rounded-2xl shadow-2xl p-4 flex-col gap-3 pointer-events-auto relative">
    <button onclick="document.getElementById('notify-new-mail').style.display='none'" class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-[#202c33] rounded-full transition">
        <i class="fa-solid fa-xmark text-lg"></i>
    </button>
    <div class="flex items-center gap-3 pr-8">
        <div class="w-11 h-11 rounded-full bg-[#202c33] text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/40">
            <i class="fa-solid fa-envelope text-lg"></i>
        </div>
        <div class="flex-grow overflow-hidden">
            <h4 id="notify-mail-from" class="text-white font-bold text-sm truncate">New Email</h4>
            <p id="notify-mail-subj" class="text-[#8696a0] text-xs truncate">You have a new message</p>
        </div>
    </div>
    <div class="flex mt-1">
        <button id="notify-mail-btn" onclick="document.getElementById('notify-new-mail').style.display='none'; window.switchTab(5); if(window.switchArchiveTab) window.switchArchiveTab('mail');" class="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition shadow-lg">
            Перейти в архив
        </button>
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
        
