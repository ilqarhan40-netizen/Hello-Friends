// ==========================================
// ОРИГИНАЛЬНАЯ ЛОГИКА ВИДЕОКОНФЕРЕНЦИИ (CALL.JS)
// Отображение всех участников без ограничений
// ==========================================

let myVideoStream = null;

window.initConference = function() {
    const confGrid = document.getElementById('conference-grid'); 
    if(!confGrid) return;

    let myName = (window.myProfileInfo && window.myProfileInfo.name) ? window.myProfileInfo.name.split(' (')[0] : 'You';
    let myFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let myVideoSrc = (window.myProfileInfo && window.myProfileInfo.video) ? window.myProfileInfo.video : '';

    // Главный блок (Вы)
    let confHtml = `<div class="video-frame main" id="my-video-container"><video id="my-live-video" class="mirror-video" autoplay muted playsinline></video><div class="video-overlay">${myName} (You)</div><div class="flag-overlay">${myFlag}</div><div class="translation-bar"><div class="conf-marquee-text" id="speaker-marquee">➔ [AUTO] Welcome!</div></div></div>`;
    
    // Рендерим ВСЕХ участников из массива window.participants без лимитов
    if (window.participants && window.participants.length > 0) {
        window.participants.forEach(p => {
            if(p.id === 'ai') return; // Исключаем AI-бота из видеосетки
            let pName = (p.name || 'User').split(' ')[0];
            let pFlag = p.flag || '🌐';
            let pVideo = p.video || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4';
            let pLang = p.langCode || 'en';

            confHtml += `
                <div class="video-frame">
                    <video autoplay loop muted playsinline>
                        <source src="${pVideo}">
                    </video>
                    <div class="video-overlay">${pName}</div>
                    <div class="flag-overlay">${pFlag}</div>
                    <div class="translation-bar">
                        <div class="conf-marquee-text conf-listener-marquee" data-lang="${pLang}" data-flag="${pFlag}">${pFlag} Ready...</div>
                    </div>
                </div>`;
        });
    }
    
    confGrid.innerHTML = confHtml; 
    
    // Инициализация собственного видеопотока
    const videoEl = document.getElementById('my-live-video');
    if (videoEl && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => { 
            myVideoStream = stream; 
            videoEl.srcObject = stream; 
            videoEl.muted = true; 
            videoEl.play(); 
        })
        .catch(err => { 
            videoEl.src = myVideoSrc || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
            videoEl.loop = true; 
            videoEl.classList.remove('mirror-video'); 
        });
    } else if(videoEl) {
        videoEl.src = myVideoSrc || 'https://assets.mixkit.co/videos/preview/mixkit-young-man-having-a-video-call-with-his-friends-41212-large.mp4'; 
        videoEl.loop = true; 
        videoEl.classList.remove('mirror-video'); 
    }
};

window.toggleMyCamera = function(btn) {
    btn.classList.toggle('bg-[#202c33]'); 
    btn.classList.toggle('bg-red-500');
    if (myVideoStream) { 
        const videoTrack = myVideoStream.getVideoTracks()[0]; 
        if (videoTrack) { 
            videoTrack.enabled = !videoTrack.enabled; 
            const icon = btn.querySelector('i'); 
            if (icon) icon.className = videoTrack.enabled ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'; 
        } 
    }
};

window.sendConfMsg = async function() {
    const inputEl = document.getElementById('conf-chat-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if(!text) return;
    inputEl.value = '';

    const myMarquee = document.getElementById('speaker-marquee');
    if(myMarquee) { 
        myMarquee.innerHTML = `<span class="text-white">You:</span> ${text}`; 
        myMarquee.style.animation = 'none'; 
        void myMarquee.offsetWidth; 
        myMarquee.style.animation = null;
    }

    const listenerMarquees = document.querySelectorAll('.conf-listener-marquee');
    listenerMarquees.forEach(async (el) => {
        const tLang = el.getAttribute('data-lang') || 'en';
        const tFlag = el.getAttribute('data-flag') || '🌐';
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tLang}&dt=t&q=${encodeURIComponent(text)}`).then(r => r.json());
            const translated = res[0][0][0];
            el.innerHTML = `<span class="text-white">User:</span> ${tFlag} ${translated}`;
            el.style.animation = 'none'; 
            void el.offsetWidth; 
            el.style.animation = null;
        } catch(e) {}
    });
};

window.isMeetMarqueeEnabled = true;
window.toggleMeetMarquee = function() {
    window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled;
    const bars = document.querySelectorAll('.translation-bar');
    bars.forEach(b => { b.style.opacity = window.isMeetMarqueeEnabled ? "1" : "0"; });
};

// Автоматический запуск инициализации сетки при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.initConference === 'function') {
            window.initConference();
        }
    }, 600);
});
// Автоматическое обновление сетки при переходе на вкладку Meet (индекс 2)
const originalSwitchTab = window.switchTab;
window.switchTab = function(index) {
    if (originalSwitchTab) originalSwitchTab(index);
    if (index === 2) {
        setTimeout(() => {
            if (typeof window.initConference === 'function') {
                window.initConference();
            }
        }, 50);
    }
};

