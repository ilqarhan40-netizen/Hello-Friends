// ==========================================
// 1. БЛОКИРОВКА ГУГЛ-МЕНЮ (CSS)
// ==========================================
const overrideStyle = document.createElement('style');
overrideStyle.innerHTML = `
    .chat-bubble img, .chat-bubble video {
        -webkit-touch-callout: none !important; /* Убивает меню Гугла только на картинках */
    }
    #custom-action-menu {
        display: none; position: absolute; z-index: 999999; background: #202c33; 
        border: 1px solid #2a3942; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); 
        padding: 6px; min-width: 150px; flex-direction: column;
    }
    .custom-menu-btn {
        background: transparent; border: none; color: #e9edef; font-size: 14.5px; 
        padding: 12px; text-align: left; width: 100%; border-radius: 8px; cursor: pointer; margin-bottom: 2px;
    }
    .custom-menu-btn-del {
        background: transparent; border: none; color: #ff4444; font-size: 14.5px; 
        padding: 12px; text-align: left; width: 100%; border-radius: 8px; cursor: pointer; font-weight: bold;
    }
`;
document.head.appendChild(overrideStyle);

// ==========================================
// 2. ВЕРСТКА НАШЕГО МЕНЮ
// ==========================================
const customMenu = document.createElement('div');
customMenu.id = 'custom-action-menu';
customMenu.innerHTML = `
    <button onclick="window.handleMenuAction('copy')" class="custom-menu-btn">Скопировать</button>
    <button onclick="window.handleMenuAction('paste')" class="custom-menu-btn">Вставить</button>
    <button onclick="window.handleMenuAction('forward')" class="custom-menu-btn">Переслать</button>
    <div style="height: 1px; background: #2a3942; margin: 4px 0;"></div>
    <button onclick="window.handleMenuAction('delete')" class="custom-menu-btn-del">Удалить</button>
`;
document.body.appendChild(customMenu);

window.currentMenuTarget = null;
window.appInternalClipboard = null; // Внутренняя память для скопированных фото

// ==========================================
// 3. ОТСЛЕЖИВАНИЕ ДОЛГОГО ТАПА
// ==========================================
let pressTimer;
let startX = 0, startY = 0;

window.showCustomMenu = function(x, y, targetElement) {
    window.currentMenuTarget = targetElement;
    if (x + 160 > window.innerWidth) x = window.innerWidth - 170;
    
    customMenu.style.left = x + 'px';
    customMenu.style.top = y + 'px';
    customMenu.style.display = 'flex';
    
    if (navigator.vibrate) navigator.vibrate(50);
};

document.addEventListener('touchstart', function(e) {
    let targetElement = e.target.closest('.chat-bubble');
    if (!targetElement) return;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    pressTimer = setTimeout(() => {
        window.showCustomMenu(startX, startY, targetElement);
    }, 400); // Открываем меню через 400мс удержания пальца
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10) {
        clearTimeout(pressTimer);
    }
}, { passive: true });

document.addEventListener('touchend', function() { clearTimeout(pressTimer); }, { passive: true });
document.addEventListener('contextmenu', function(e) {
    let targetElement = e.target.closest('.chat-bubble');
    if (targetElement) { e.preventDefault(); window.showCustomMenu(e.pageX, e.pageY, targetElement); }
});
document.addEventListener('click', function(e) {
    if (!customMenu.contains(e.target)) customMenu.style.display = 'none';
});

// ==========================================
// 4. ДЕЙСТВИЯ КНОПОК МЕНЮ
// ==========================================
window.handleMenuAction = function(action) {
    customMenu.style.display = 'none';
    if (!window.currentMenuTarget) return;

    let imgEl = window.currentMenuTarget.querySelector('img');
    let vidEl = window.currentMenuTarget.querySelector('video');

    if (action === 'copy') {
        if (imgEl || vidEl) {
            window.appInternalClipboard = { type: imgEl ? 'image' : 'video', src: imgEl ? imgEl.src : vidEl.src };
            if (window.showToast) window.showToast("Скопировано", "Медиафайл готов к вставке", "", "");
        } else {
            navigator.clipboard.writeText(window.currentMenuTarget.innerText.trim());
            window.appInternalClipboard = null; 
        }
    } 
    else if (action === 'paste') {
        if (window.appInternalClipboard) {
            // Вставляем фото
            fetch(window.appInternalClipboard.src)
                .then(res => res.blob())
                .then(blob => {
                    let ext = window.appInternalClipboard.type === 'image' ? 'png' : 'mp4';
                    triggerUpload(new File([blob], "copied_media." + ext, {type: blob.type}));
                });
        } else {
            // Вставляем текст
            navigator.clipboard.readText().then(clipText => {
                let inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input');
                if (inputField) { inputField.value += clipText; inputField.focus(); }
            }).catch(() => {});
        }
    } 
    else if (action === 'forward') {
        alert("Выберите контакт для пересылки");
    } 
    else if (action === 'delete') {
        let messageGroup = window.currentMenuTarget.closest('.flex.flex-col.w-full.mt-3') || window.currentMenuTarget;
        messageGroup.remove();
    }
};

// ==========================================
// 5. ПЕРЕХВАТ СИСТЕМНОЙ ВСТАВКИ (Защита от зеленого текста)
// ==========================================
document.addEventListener('paste', function(e) {
    let clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // Перехват гигантского кода картинки (Base64), как на твоем скрине
    let pastedText = clipboardData.getData('text');
    if (pastedText && pastedText.startsWith('data:image/')) {
        e.preventDefault();
        fetch(pastedText).then(res => res.blob()).then(blob => {
            triggerUpload(new File([blob], "image.png", {type: blob.type}));
        });
        return;
    }

    // Перехват обычного файла
    let items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            let file = items[i].getAsFile();
            if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
                e.preventDefault(); 
                triggerUpload(file);
                break; 
            }
        }
    }
});

// Отправка файла в твою систему
function triggerUpload(file) {
    let fileInput = document.getElementById('media-upload-input');
    if (fileInput) {
        let dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (typeof window.uploadMediaFile === 'function') {
        window.uploadMediaFile(file);
    } else {
        alert("Ошибка: Загрузчик файлов media-upload-input не найден в HTML");
    }
}
