// ==========================================
// 1. УБИВАЕМ ГУГЛ-МЕНЮ В ЧАТЕ
// ==========================================
window.oncontextmenu = function(e) {
    if (e.target.closest('.chat-bubble') || e.target.tagName === 'IMG') {
        e.preventDefault(); 
        e.stopPropagation();
        openChatActionMenu(e.target);
        return false;
    }
};

// ==========================================
// 2. УПРАВЛЕНИЕ НАШИМ НЕЗАВИСИМЫМ МЕНЮ ЧАТА
// ==========================================
window.currentChatTarget = null;
window.appInternalClipboard = null; 
let pressTimer;
let startX = 0, startY = 0;

function openChatActionMenu(targetElement) {
    window.currentChatTarget = targetElement.closest('.chat-bubble') || targetElement;
    
    let modal = document.getElementById('chat-action-modal');
    let content = document.getElementById('chat-action-content');
    let title = document.getElementById('chat-action-title');
    
    if (modal && content) {
        if (window.currentChatTarget.querySelector('img')) {
            title.innerText = "Действие с фото";
        } else if (window.currentChatTarget.querySelector('video')) {
            title.innerText = "Действие с видео";
        } else {
            title.innerText = "Действие с сообщением";
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => { content.classList.remove('translate-y-full'); }, 10);
        if (navigator.vibrate) navigator.vibrate(50);
    }
}

window.closeChatActionMenu = function() {
    let modal = document.getElementById('chat-action-modal');
    let content = document.getElementById('chat-action-content');
    if (content) content.classList.add('translate-y-full');
    setTimeout(() => {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }, 300);
};

// ==========================================
// 3. ДОЛГИЙ ТАП (ТОЛЬКО ДЛЯ ЧАТА)
// ==========================================
document.addEventListener('touchstart', function(e) {
    let target = e.target.closest('.chat-bubble') || (e.target.tagName === 'IMG' ? e.target : null);
    if (!target) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    
    pressTimer = setTimeout(() => { openChatActionMenu(target); }, 450);
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10) {
        clearTimeout(pressTimer);
    }
}, { passive: true });

document.addEventListener('touchend', function() { clearTimeout(pressTimer); }, { passive: true });

// ==========================================
// 4. НЕЗАВИСИМАЯ ФУНКЦИЯ ДЕЙСТВИЙ
// ==========================================
window.chatAction = function(action) {
    window.closeChatActionMenu();
    if (!window.currentChatTarget) return;

    let imgEl = window.currentChatTarget.querySelector('img') || (window.currentChatTarget.tagName === 'IMG' ? window.currentChatTarget : null);
    let vidEl = window.currentChatTarget.querySelector('video');

    if (action === 'copy') {
        if (imgEl || vidEl) {
            window.appInternalClipboard = { type: imgEl ? 'image' : 'video', src: imgEl ? imgEl.src : vidEl.src };
            if (window.showToast) window.showToast("Скопировано", "Медиафайл готов к вставке", "", "");
        } else {
            navigator.clipboard.writeText(window.currentChatTarget.innerText.trim());
            window.appInternalClipboard = null;
            if (window.showToast) window.showToast("Скопировано", "Текст скопирован", "", "");
        }
    } 
    else if (action === 'paste') {
        if (window.appInternalClipboard) {
            fetch(window.appInternalClipboard.src).then(res => res.blob()).then(blob => {
                triggerAppUpload(new File([blob], "copied_media." + (window.appInternalClipboard.type === 'image' ? 'png' : 'mp4'), {type: blob.type}));
            });
        } else {
            navigator.clipboard.readText().then(clipText => {
                let inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input');
                if (inputField) { 
                    inputField.value += clipText; 
                    inputField.focus(); 
                }
            }).catch(() => {});
        }
    } 
    else if (action === 'forward') {
        if (window.showToast) window.showToast("Пересылка", "Выберите контакт", "", "");
    } 
    else if (action === 'delete') {
        let messageGroup = window.currentChatTarget.closest('.flex.flex-col.w-full.mt-3') || window.currentChatTarget;
        messageGroup.remove();
    }
    
    setTimeout(() => { window.currentChatTarget = null; }, 500); 
};

// ==========================================
// 5. ПЕРЕХВАТ ОБЫЧНОЙ ВСТАВКИ (ЗАЩИТА ОТ ЗЕЛЕНОГО ТЕКСТА)
// ==========================================
document.addEventListener('paste', function(e) {
    let clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let pastedText = clipboardData.getData('text');
    if (pastedText && pastedText.startsWith('data:image/')) {
        e.preventDefault();
        fetch(pastedText).then(res => res.blob()).then(blob => {
            triggerAppUpload(new File([blob], "image.png", {type: blob.type}));
        });
        return;
    }

    let items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            let file = items[i].getAsFile();
            if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                e.preventDefault();
                triggerAppUpload(file);
                break;
            }
        }
    }
});

function triggerAppUpload(file) {
    let fileInput = document.getElementById('media-upload-input');
    if (fileInput) {
        let dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}
