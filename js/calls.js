
// ==========================================
// ВИДЕОКОНФЕРЕНЦИЯ, СЕТКА И УМНЫЙ ПЕРЕВОД (CALL.JS)
// ==========================================

window.currentCallActive = false;
window.localStream = null;

// Отрисовка сетки конференции с именами, флагами и элементами умного перевода
window.renderVideoConferenceGrid = function() {
    const gridContainer = document.getElementById('video-conference-grid');
    if (!gridContainer) return;

    let gridHTML = '';

    // 1. Главный спикер / Локальный участник (Вы)
    let myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';
    let myFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let myName = window.myUsername || 'You';

    gridHTML += `
        <div class="relative bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden flex flex-col items-center justify-center aspect-video shadow-lg group">
            <video id="local-video" autoplay muted playsinline class="w-full h-full object-cover"></video>
            <div class="absolute bottom-2 left-2 bg-[#111b21]/80 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-2 border border-[#2a3942] z-20">
                <img src="${myPhoto}" class="w-5 h-5 rounded-full object-cover">
                <span class="text-white text-xs font-bold">${myName}</span>
                <span class="text-sm">${myFlag}</span>
            </div>
            <!-- Бегущая строка главного спикера для синхронизации с chat.js -->
            <div id="speaker-marquee" class="absolute top-2 left-2 right-2 bg-[#202c33]/90 backdrop-blur text-xs px-3 py-1.5 rounded-lg text-[#00a884] font-bold truncate z-20 hidden">
                <span class="text-white">Waiting for speech...</span>
            </div>
        </div>
    `;

    // 2. Остальные участники с флагами и бегущими строками для перевода
    if (window.participants && window.participants.length > 0) {
        window.participants.filter(p => p.id !== 'ai').forEach(p => {
            let pPhoto = p.photo || 'https://ui-avatars.com/api/?name=U';
            let pFlag = p.flag || '🌐';
            let pName = (p.name || 'User').split(' ')[0];
            let pLang = window.getSmartLang(p);

            gridHTML += `
                <div class="relative bg-[#111b21] border border-[#2a3942] rounded-2xl overflow-hidden flex flex-col items-center justify-center aspect-video shadow-lg group">
                    <div class="absolute inset-0 bg-cover bg-center opacity-30 filter blur-sm" style="background-image: url('${pPhoto}');"></div>
                    <img src="${pPhoto}" class="w-16 h-16 rounded-full object-cover border-2 border-[#00a884] relative z-10 mb-2 shadow-md">
                    <div class="absolute bottom-2 left-2 bg-[#111b21]/80 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-2 border border-[#2a3942] z-20">
                        <span class="text-white text-xs font-bold">${pName}</span>
                        <span class="text-sm">${pFlag}</span>
                    </div>
                    <!-- Бегущая строка слушателя для перевода в реальном времени из chat.js -->
                    <div id="conf-marquee-${p.id}" class="conf-listener-marquee absolute top-2 left-2 right-2 bg-[#202c33]/90 backdrop-blur text-xs px-3 py-1.5 rounded-lg text-yellow-400 font-bold truncate z-20 hidden" data-lang="${pLang}" data-flag="${pFlag}">
                        <span class="text-[#8696a0]">Listening...</span>
                    </div>
                </div>
            `;
        });
    }

    gridContainer.innerHTML = gridHTML;
};

// Запуск видео и аудиопотока
window.startVideoConference = async function() {
    try {
        window.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = window.localStream;
        }
        window.currentCallActive = true;
        window.renderVideoConferenceGrid();
        if (window.showToast) window.showToast("Conference Active", "Camera and microphone connected", "", "");
    } catch (err) {
        console.error("Camera access error:", err);
        if (window.showToast) window.showToast("Camera Error", "Could not access media devices", "", "");
    }
};

// Завершение конференции
window.stopVideoConference = function() {
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
        window.localStream = null;
    }
    window.currentCallActive = false;
    if (window.showToast) window.showToast("Conference Ended", "Call terminated", "", "");
};

// Автоматическая отрисовка сетки при загрузке
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.renderVideoConferenceGrid === 'function') {
            window.renderVideoConferenceGrid();
        }
    }, 500);
});
