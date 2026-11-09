// ==========================================
// ФАЙЛ: video-room.js
// ДИСПЕТЧЕР ОЧЕРЕДИ ТОЛЬКО ДЛЯ VOICE ROOM
// ==========================================

window.voiceRoomQueue = [];
window.isVoiceMarqueeBusy = false;

// Единая функция-приемник для Voice Room
window.pushToVoiceMarquee = function(htmlText, type = 'text') {
    if (!htmlText) return;
    window.voiceRoomQueue.push({ text: htmlText, type: type });
    window.processVoiceMarquee();
};

window.processVoiceMarquee = function() {
    if (window.isVoiceMarqueeBusy || window.voiceRoomQueue.length === 0) return;

    window.isVoiceMarqueeBusy = true;
    let nextMessage = window.voiceRoomQueue.shift();
    
    let marqueeElement = document.getElementById('voice-info-marquee');
    
    if (marqueeElement) {
        // Вставляем готовый HTML текст (с флагами, цветами и именем)
        marqueeElement.innerHTML = nextMessage.text;
        
        // Перезапускаем анимацию
        marqueeElement.style.animation = 'none';
        void marqueeElement.offsetWidth; // Магия для сброса CSS
        marqueeElement.style.animation = 'scroll-text 8s linear forwards';
        
        // Через 8 секунд освобождаем строку
        setTimeout(() => {
            window.isVoiceMarqueeBusy = false;
            window.processVoiceMarquee();
        }, 8000); 
    } else {
        window.isVoiceMarqueeBusy = false;
    }
};
