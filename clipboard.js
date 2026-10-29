// ==========================================
// 1. УБИВАЕМ ГУГЛ-МЕНЮ В ЧАТЕ (ДЛЯ ПК)
// ==========================================
window.oncontextmenu = function(e) {
    if (e.target.closest('.chat-bubble') || e.target.tagName === 'IMG') {
        e.preventDefault(); 
        e.stopPropagation();
        window.openChatActionMenu(e.target);
        return false;
    }
};

// ==========================================
// 2. УПРАВЛЕНИЕ МЕНЮ (С АВТО-СОЗДАНИЕМ HTML)
// ==========================================
window.currentChatTarget = null;
window.appInternalClipboard = null; 
window.chatActionMenuJustOpened = false;

let pressTimer;
let startX = 0, startY = 0;

window.openChatActionMenu = function(targetElement) {
    window.currentChatTarget = targetElement.closest('.chat-bubble') || targetElement;
    
    // 1. Создаем HTML модального окна, если его еще нет на странице
    if (!document.getElementById('chat-action-modal')) {
        const modalHTML = `
        <div id="chat-action-modal" class="hidden fixed inset-0 z-[99999] bg-[#111b21]/80 items-end sm:items-center justify-center backdrop-blur-sm" onclick="if(event.target===this) window.closeChatActionMenu();">
            <div id="chat-action-content" class="bg-[#111b21] w-full sm:w-[350px] rounded-t-3xl sm:rounded-2xl p-6 transform translate-y-full transition-transform duration-300 flex flex-col gap-3 border border-[#2a3942] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div class="w-12 h-1.5 bg-[#2a3942] rounded-full mx-auto mb-2 sm:hidden"></div>
                <h3 id="chat-action-title" class="text-white text-center font-bold mb-3 text-lg">Действие</h3>
                
                <button onclick="window.chatAction('copy')" class="w-full py-3.5 bg-[#202c33] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a3942] transition border border-[#2a3942]">
                    <i class="fa-regular fa-copy text-blue-400 text-lg"></i> <span data-translate="chat_action_copy">Скопировать</span>
                </button>
                
                <button onclick="window.chatAction('paste')" class="w-full py-3.5 bg-[#202c33] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a3942] transition border border-[#2a3942]">
                    <i class="fa-solid fa-paste text-green-400 text-lg"></i> <span data-translate="chat_action_paste">Вставить в чат</span>
                </button>

                <button onclick="window.chatAction('download')" class="w-full py-3.5 bg-[#202c33] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a3942] transition border border-[#2a3942]">
                    <i class="fa-solid fa-download text-yellow-400 text-lg"></i> <span data-translate="chat_action_download">Сохранить / Скачать</span>
                </button>
                
                <button onclick="window.chatAction('forward')" class="w-full py-3.5 bg-[#202c33] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a3942] transition border border-[#2a3942]">
                    <i class="fa-solid fa-share text-purple-400 text-lg"></i> <span data-translate="chat_action_forward">Переслать</span>
                </button>
                
                <button onclick="window.chatAction('delete')" class="w-full py-3.5 bg-red-500/10 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition border border-red-500/30 mt-2">
                    <i class="fa-solid fa-trash-can text-lg"></i> <span data-translate="chat_action_delete">Удалить у себя</span>
                </button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    let modal = document.getElementById('chat-action-modal');
    let content = document.getElementById('chat-action-content');
    let title = document.getElementById('chat-action-title');
    
    if (modal && content) {
        // Определяем тип контента
        if (window.currentChatTarget.querySelector('img') || window.currentChatTarget.tagName === 'IMG') {
            title.innerText = "Действие с фото";
        } else if (window.currentChatTarget.querySelector('video') || window.currentChatTarget.tagName === 'VIDEO') {
            title.innerText = "Действие с видео";
        } else {
            title.innerText = "Действие с сообщением";
        }

        window.chatActionMenuJustOpened = true; 
        
        if (typeof window.applyTranslations === 'function') window.applyTranslations();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => { content.classList.remove('translate-y-full'); }, 10);
        if (navigator.vibrate) navigator.vibrate(50);
    }
};

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
// 3. ДОЛГИЙ ТАП ДЛЯ МОБИЛЬНЫХ
// ==========================================
document.addEventListener('touchstart', function(e) {
    let target = e.target.closest('.chat-bubble') || (e.target.tagName === 'IMG' ? e.target : null);
    if (!target) return;
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    
    pressTimer = setTimeout(() => { 
        window.openChatActionMenu(target); 
    }, 500); 
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (Math.abs(e.touches[0].clientX - startX) > 15 || Math.abs(e.touches[0].clientY - startY) > 15) {
        clearTimeout(pressTimer);
    }
}, { passive: true });

document.addEventListener('touchend', function() { clearTimeout(pressTimer); }, { passive: true });

document.addEventListener('click', function(e) {
    if (window.chatActionMenuJustOpened) {
        e.preventDefault();
        e.stopPropagation();
        window.chatActionMenuJustOpened = false; 
    }
}, true);

// ==========================================
// 4. НЕЗАВИСИМАЯ ФУНКЦИЯ ДЕЙСТВИЙ (КОПИРОВАТЬ, СКАЧАТЬ, ВСТАВИТЬ)
// ==========================================
window.chatAction = function(action) {
    window.closeChatActionMenu();
    if (!window.currentChatTarget) return;

    let imgEl = window.currentChatTarget.querySelector('img') || (window.currentChatTarget.tagName === 'IMG' ? window.currentChatTarget : null);
    let vidEl = window.currentChatTarget.querySelector('video') || (window.currentChatTarget.tagName === 'VIDEO' ? window.currentChatTarget : null);

    if (action === 'copy') {
        if (imgEl || vidEl) {
            window.appInternalClipboard = { type: imgEl ? 'image' : 'video', src: imgEl ? imgEl.src : vidEl.src };
            if (window.showToast) window.showToast("Скопировано", "Медиафайл готов к отправке", "", "");
        } else {
            let textToCopy = window.currentChatTarget.innerText.trim();
            textToCopy = textToCopy.replace(/➔.*/g, '').trim(); 
            navigator.clipboard.writeText(textToCopy);
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
            }).catch(() => {
                if (window.showToast) window.showToast("Ошибка", "Буфер обмена пуст", "", "");
            });
        }
    } 
    else if (action === 'download') {
        if (imgEl || vidEl) {
            let mediaUrl = imgEl ? imgEl.src : vidEl.src;
            let extension = imgEl ? 'png' : 'mp4';
            let fileName = 'HelloFriends_Media_' + Date.now() + '.' + extension;
            
            fetch(mediaUrl)
                .then(response => response.blob())
                .then(blob => {
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.style.display = 'none';
                    link.href = blobUrl;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    window.URL.revokeObjectURL(blobUrl);
                    if (window.showToast) window.showToast("Скачано", "Файл сохранен на устройство", "", "");
                })
                .catch(() => {
                    if (window.showToast) window.showToast("Ошибка", "Не удалось скачать файл", "", "");
                });
        } else {
            if (window.showToast) window.showToast("Внимание", "Текст можно только скопировать", "", "");
        }
    }
    else if (action === 'forward') {
        if (window.showToast) window.showToast("Пересылка", "Выберите чат, нажмите Вставить", "", "");
    } 
    else if (action === 'delete') {
        let messageGroup = window.currentChatTarget.closest('.flex.flex-col.w-full.mt-3') || window.currentChatTarget;
        messageGroup.remove();
        if (window.showToast) window.showToast("Удалено", "Сообщение скрыто", "", "");
    }
    
    setTimeout(() => { window.currentChatTarget = null; }, 500); 
};

// ==========================================
// 5. ПЕРЕХВАТ ОБЫЧНОЙ ВСТАВКИ
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
