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
        <button id="notify-video-btn" onclick="document.getElementById('notify-video-call').style.display='none'; window.switchTab(2);" class="flex-1 py-2 rounded-xl bg-[#00a884] text-[#111b21] font-bold text-xs transition">Call Back</button>
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
        <button id="notify-audio-btn" onclick="document.getElementById('notify-audio-call').style.display='none'; window.switchTab(1);" class="flex-1 py-2 rounded-xl bg-[#a29bfe] text-[#111b21] font-bold text-xs transition">Call Back</button>
    </div>
</div>

<!-- УВЕДОМЛЕНИЕ: НОВАЯ ПОЧТА (EMAIL) -->
<div id="notify-new-mail" style="display: none;" class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-[92%] max-w-sm bg-[#111b21] border border-blue-400 rounded-2xl shadow-2xl p-4 flex-col gap-3 pointer-events-auto">
    <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full bg-[#202c33] text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/40">
            <i class="fa-solid fa-envelope text-lg"></i>
        </div>
        <div class="flex-grow overflow-hidden">
            <h4 id="notify-mail-from" class="text-white font-bold text-sm truncate">New Email</h4>
            <p id="notify-mail-subj" class="text-[#8696a0] text-xs truncate">You have a new message</p>
        </div>
    </div>
    <div class="flex gap-2 mt-3">
        <button onclick="document.getElementById('notify-new-mail').style.display='none'" class="flex-1 py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white font-bold text-xs transition">Close</button>
        <button onclick="document.getElementById('notify-new-mail').style.display='none'; window.switchTab(5); if(window.switchArchiveTab) window.switchArchiveTab('mail');" class="flex-1 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs transition">Read Mail</button>
    </div>
</div>
`;

// Ждем загрузки страницы и вставляем HTML в конец body
document.addEventListener("DOMContentLoaded", () => {
    document.body.insertAdjacentHTML('beforeend', notifyHtml);
});

// === 2. ЗВУКИ И ЛОГИКА (БЕЗ ДУБЛИРОВАНИЯ АУДИО) ===

// Почта
window.showMailNotify = function(fromName, subject) {
    if (fromName) document.getElementById('notify-mail-from').innerText = fromName;
    if (subject) document.getElementById('notify-mail-subj').innerText = subject;
    document.getElementById('notify-new-mail').style.display = 'flex';
    if (window.playSafeSound && window.sndEmail) window.playSafeSound(window.sndEmail);
};

// Видеозвонок
window.showVideoCallNotify = function(name, photo, userId) {
    if (name) document.getElementById('notify-video-name').innerText = name;
    if (photo) document.getElementById('notify-video-photo').src = photo;
    const btn = document.getElementById('notify-video-btn');
    if (btn && userId) {
        btn.onclick = function() {
            document.getElementById('notify-video-call').style.display = 'none';
            window.switchTab(2);
            if (window.makeCallFromContact) window.makeCallFromContact(userId, 'video');
        };
    }
    document.getElementById('notify-video-call').style.display = 'flex';
    if (window.playSafeSound && window.sndMissed) window.playSafeSound(window.sndMissed, [200, 100, 200]);
};

// Аудиозвонок
window.showAudioCallNotify = function(name, photo, userId) {
    if (name) document.getElementById('notify-audio-name').innerText = name;
    if (photo) document.getElementById('notify-audio-photo').src = photo;
    const btn = document.getElementById('notify-audio-btn');
    if (btn && userId) {
        btn.onclick = function() {
            document.getElementById('notify-audio-call').style.display = 'none';
            window.switchTab(1);
            if (window.makeCallFromContact) window.makeCallFromContact(userId, 'voice');
        };
    }
    document.getElementById('notify-audio-call').style.display = 'flex';
    if (window.playSafeSound && window.sndMissed) window.playSafeSound(window.sndMissed, [200, 100, 200]);
};

window.initAllNotifications = function() {
    const myId = window.myProfileInfo?.id || localStorage.getItem('hf_active_user');
    if (!myId || myId === 'guest') return;

    // Слушатель почты (работает правильно, оставляем)
    let mailLoaded = false;
    db.ref('emails/' + myId).limitToLast(1).on('child_added', snap => {
        if (!mailLoaded) return;
        const mail = snap.val();
        if (mail) {
            window.showMailNotify(mail.from || "New Email", mail.subject || "No Subject");
            const badge = document.getElementById('mail-badge');
            if (badge) badge.classList.remove('hidden');
        }
    });
    db.ref('emails/' + myId).once('value', () => { mailLoaded = true; });

    // Слушатель звонков удален, так как теперь calls.js сам дергает окна уведомлений!
};
