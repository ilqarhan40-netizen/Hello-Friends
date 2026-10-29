// ==========================================
// ИДЕАЛЬНЫЙ CLIPBOARD.JS (Точная логика кнопок для Фото, Видео, Карт, Текста)
// ==========================================

// 1. ТОТАЛЬНАЯ БЛОКИРОВКА МЕНЮ CHROME (С невидимым щитом для медиа)
(function blockChromeMenuGlobally() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            body, img, video, a, .message, div {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
                touch-action: pan-y; 
            }
            input, textarea, [contenteditable="true"] {
                -webkit-touch-callout: default !important;
                -webkit-user-select: text !important;
                user-select: text !important;
                touch-action: auto;
            }
            .media-shield { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; cursor: pointer; }
            .media-wrapper { position: relative; display: inline-block; }
        `;
        document.head.appendChild(style);
    }
})();

function applyMediaShields() {
    document.querySelectorAll('.message img, .message video').forEach(el => {
        if (!el.parentElement.classList.contains('media-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'media-wrapper';
            el.parentNode.insertBefore(wrapper, el);
            wrapper.appendChild(el);
            const shield = document.createElement('div');
            shield.className = 'media-shield';
            shield.dataset.src = el.src || (el.querySelector('source') ? el.querySelector('source').src : '');
            shield.dataset.type = el.tagName.toLowerCase();
            wrapper.appendChild(shield);
        }
    });
}
document.addEventListener('DOMContentLoaded', applyMediaShields);
setInterval(applyMediaShields, 2000); 

// 2. УМНЫЙ СЛОВАРЬ
const localClipDict = {
    ru: { action_photo: "Действие с фото", action_video: "Действие с видео", action_text: "Действие с текстом", action_loc: "Действие с картой", action_link: "Действие со ссылкой", copy: "Скопировать", paste: "Вставить в чат", save: "Сохранить / Скачать", forward: "Переслать", del: "Удалить у себя" },
    en: { action_photo: "Photo Action", action_video: "Video Action", action_text: "Text Action", action_loc: "Location Action", action_link: "Link Action", copy: "Copy", paste: "Paste to chat", save: "Save / Download", forward: "Forward", del: "Delete for me" },
    de: { action_photo: "Fotoaktion", action_video: "Videoaktion", action_text: "Textaktion", action_loc: "Kartenaktion", action_link: "Linkaktion", copy: "Kopieren", paste: "In den Chat einfügen", save: "Speichern / Herunterladen", forward: "Weiterleiten", del: "Für mich löschen" },
    az: { action_photo: "Şəkil əməliyyatı", action_video: "Video əməliyyatı", action_text: "Mətn əməliyyatı", action_loc: "Xəritə əməliyyatı", action_link: "Link əməliyyatı", copy: "Kopyala", paste: "Çata yerləşdir", save: "Yadda saxla / Yüklə", forward: "Yönləndir", del: "Özüm üçün sil" },
    tr: { action_photo: "Fotoğraf işlemi", action_video: "Video işlemi", action_text: "Metin işlemi", action_loc: "Harita işlemi", action_link: "Bağlantı işlemi", copy: "Kopyala", paste: "Sohbete yapıştır", save: "Kaydet / İndir", forward: "İlet", del: "Benden sil" }
};
function getClipT(key) {
    const lang = window.appLang || localStorage.getItem('appLang') || 'en';
    const dict = localClipDict[lang] || localClipDict['en'];
    return dict[key] || localClipDict['en'][key];
}

window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 

// 3. ОТКРЫТИЕ МЕНЮ
window.openClipboardMenu = function(content, type, targetEl) {
    if (window.closeAllMenus) window.closeAllMenus();
    window.currentClipContent = content; window.currentClipType = type; window.currentTargetElement = targetEl;

    let titleKey = 'action_text';
    if (type === 'image') titleKey = 'action_photo';
    if (type === 'video') titleKey = 'action_video';
    if (type === 'location') titleKey = 'action_loc';
    if (type === 'link') titleKey = 'action_link';

    let modal = document.getElementById('clipboard-modal-clean');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:none !important; z-index:9999; justify-content:center; align-items:center;">
            <div class="flex flex-col p-5 w-full max-w-[300px] bg-[#0b141a] border border-[#2a3942] rounded-2xl shadow-2xl transition-transform duration-200">
                <div class="text-center mb-4"><h3 class="text-white font-bold text-sm tracking-wide" id="clip-title-text">${getClipT(titleKey)}</h3></div>
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-regular fa-copy text-[#8696a0]"></i> <span id="clip-copy-text">${getClipT('copy')}</span>
                    </button>
                    <button type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-paste text-[#00a884]"></i> <span id="clip-paste-text">${getClipT('paste')}</span>
                    </button>
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-download text-[#f59e0b]"></i> <span id="clip-save-text">${getClipT('save')}</span>
                    </button>
                    <button type="button" onclick="window.execForwardAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium transition border border-[#202c33]">
                        <i class="fa-solid fa-share text-[#a855f7]"></i> <span id="clip-forward-text">${getClipT('forward')}</span>
                    </button>
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center justify-center gap-3 w-full py-3 mt-1 bg-red-950/20 hover:bg-red-950/40 text-[#ef4444] rounded-xl text-sm font-medium transition border border-red-900/30">
                        <i class="fa-regular fa-trash-can"></i> <span id="clip-delete-text">${getClipT('del')}</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal-clean');
    } else {
        document.getElementById('clip-title-text').innerText = getClipT(titleKey);
        document.getElementById('clip-copy-text').innerText = getClipT('copy');
        document.getElementById('clip-paste-text').innerText = getClipT('paste');
        document.getElementById('clip-save-text').innerText = getClipT('save');
        document.getElementById('clip-forward-text').innerText = getClipT('forward');
        document.getElementById('clip-delete-text').innerText = getClipT('del');
    }

    // Сохранить можно только фото и видео. Для карт/текста кнопка прячется.
    document.getElementById('clip-save-btn').style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';
    modal.style.display = 'flex';
};
window.closeClipboardModal = function() { const modal = document.getElementById('clipboard-modal-clean'); if (modal) modal.style.display = 'none'; };


// --- 4. ТОЧНАЯ ЛОГИКА КНОПОК ---

// СКОПИРОВАТЬ (Умная логика по типу контента)
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    try {
        if (window.currentClipType === 'image') {
            // ФОТО: копируем как настоящую картинку-файл
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
        } else {
            // ТЕКСТ / ЛОКАЦИЯ / ССЫЛКА / ВИДЕО: копируем текст или ссылку на медиа/карту
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "", "", "");
    } catch (err) {
        // Запасной метод, если телефон капризничает
        const el = document.createElement('textarea');
        el.value = window.currentClipContent;
        document.body.appendChild(el);
        el.select(); document.execCommand('copy'); document.body.removeChild(el);
        if (window.showToast) window.showToast("✔", "", "", "");
    }
    window.closeClipboardModal();
};

// ВСТАВИТЬ
window.execPasteAction = async function() {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        let activeInput = document.getElementById('msg-input') || document.querySelector('input[type="text"]');
        if (activeInput) {
            const start = activeInput.selectionStart || 0;
            const end = activeInput.selectionEnd || 0;
            activeInput.value = activeInput.value.slice(0, start) + text + activeInput.value.slice(end);
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } catch (err) {}
    window.closeClipboardModal();
};

// СОХРАНИТЬ (Только медиа файлы)
window.execSaveAction = function() {
    if (!window.currentClipContent || (window.currentClipType !== 'image' && window.currentClipType !== 'video')) return;
    const a = document.createElement('a');
    a.href = window.currentClipContent;
    // Назначаем правильное расширение
    a.download = `Media_${Date.now()}.${window.currentClipType === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast("💾", "", "", "");
    window.closeClipboardModal();
};

// ПЕРЕСЛАТЬ (Умная подготовка контента к пересылке)
window.execForwardAction = function() {
    if (window.currentClipContent) {
        // Сохраняем контент в глобальную переменную, чтобы ваш чат мог его подхватить
        window.hfForwardData = {
            content: window.currentClipContent,
            type: window.currentClipType // image, video, location, link, text
        };
        // Если у вас есть функция открытия списка контактов, её нужно вызвать здесь
        // if(window.openForwardDialog) window.openForwardDialog(); 
        
        if (window.showToast) window.showToast("➥ " + getClipT('forward'), "", "", "");
    }
    window.closeClipboardModal();
};

// УДАЛИТЬ У СЕБЯ
window.execDeleteAction = function() {
    if (window.currentTargetElement) {
        const msgBlock = window.currentTargetElement.closest('.message') || window.currentTargetElement;
        msgBlock.remove();
    }
    window.closeClipboardModal();
};

// --- 5. ГЛОБАЛЬНЫЙ ПЕРЕХВАТЧИК ---
function handleContextRequest(e, target) {
    let content = '', type = 'text';

    if (target.classList.contains('media-shield')) {
        content = target.dataset.src;
        type = target.dataset.type === 'img' ? 'image' : 'video';
    } else if (target.tagName === 'IFRAME') {
        content = target.src; type = 'location';
    } else if (target.tagName === 'A') {
        content = target.href; type = 'link';
    } else {
        content = target.innerText || target.textContent || ''; type = 'text';
        if (!content.trim()) return;
    }

    if (content) {
        e.preventDefault();
        const elToPass = target.classList.contains('media-shield') ? target.parentElement : target; 
        window.openClipboardMenu(content, type, elToPass);
    }
}

// Перехват правого клика
document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); e.stopPropagation(); }
    const target = e.target.closest('.media-shield, iframe, a') || e.target.closest('.message');
    if (target) handleContextRequest(e, target);
}, { capture: true }); 

// Перехват долгого тапа
let touchTimer = null; let touchMoved = false;
document.addEventListener('touchstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        const target = e.target.closest('.media-shield, iframe, a') || e.target.closest('.message');
        if (target) {
            handleContextRequest(e, target);
            if (e.cancelable) e.preventDefault(); 
        }
    }, 400); 
}, { passive: false });
document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); });
