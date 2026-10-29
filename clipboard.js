// ==========================================
// CLIPBOARD.JS - Умный буфер обмена (Масштабируемый, Безопасный)
// ==========================================

// 1. Блокировка системного меню Chrome (Только для элементов чата)
(function initClipboardStyles() {
    if (!document.getElementById('hf-clip-styles')) {
        const style = document.createElement('style');
        style.id = 'hf-clip-styles';
        style.innerHTML = `
            .message img, .message video, .message iframe, .message a, .msg-text {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                user-select: none !important;
            }
        `;
        document.head.appendChild(style);
    }
})();

// 2. Базовые словари для Клипборда
const clipDict = {
    en: { clip_photo: "Photo Action", clip_video: "Video Action", clip_text: "Text Action", clip_loc: "Location Action", clip_link: "Link Action", clip_copy: "Copy", clip_paste: "Paste to chat", clip_save: "Save / Download", clip_forward: "Forward", clip_del: "Delete for me" },
    ru: { clip_photo: "Действие с фото", clip_video: "Действие с видео", clip_text: "Действие с текстом", clip_loc: "Действие с картой", clip_link: "Действие со ссылкой", clip_copy: "Скопировать", clip_paste: "Вставить в чат", clip_save: "Сохранить / Скачать", clip_forward: "Переслать", clip_del: "Удалить у себя" },
    de: { clip_photo: "Fotoaktion", clip_video: "Videoaktion", clip_text: "Textaktion", clip_loc: "Kartenaktion", clip_link: "Linkaktion", clip_copy: "Kopieren", clip_paste: "In den Chat einfügen", clip_save: "Speichern / Herunterladen", clip_forward: "Weiterleiten", clip_del: "Für mich löschen" },
    kk: { clip_photo: "Фото әрекеті", clip_video: "Видео әрекеті", clip_text: "Мәтін әрекеті", clip_loc: "Карта әрекеті", clip_link: "Сілтеме әрекеті", clip_copy: "Көшіру", clip_paste: "Чатқа кірістіру", clip_save: "Сақтау / Жүктеу", clip_forward: "Қайта жіберу", clip_del: "Өзім үшін жою" },
    az: { clip_photo: "Şəkil əməliyyatı", clip_video: "Video əməliyyatı", clip_text: "Mətn əməliyyatı", clip_loc: "Xəritə əməliyyatı", clip_link: "Link əməliyyatı", clip_copy: "Kopyala", clip_paste: "Çata yerləşdir", clip_save: "Yadda saxla / Yüklə", clip_forward: "Yönləndir", clip_del: "Özüm üçün sil" },
    tr: { clip_photo: "Fotoğraf işlemi", clip_video: "Video işlemi", clip_text: "Metin işlemi", clip_loc: "Harita işlemi", clip_link: "Bağlantı işlemi", clip_copy: "Kopyala", clip_paste: "Sohbete yapıştır", clip_save: "Kaydet / İndir", clip_forward: "İlet", clip_del: "Benden sil" },
    ar: { clip_photo: "إجراء الصورة", clip_video: "إجراء الفيديو", clip_text: "إجراء النص", clip_loc: "إجراء الخريطة", clip_link: "إجراء الرابط", clip_copy: "نسخ", clip_paste: "لصق في الدردشة", clip_save: "حفظ / تنزيل", clip_forward: "إرسال", clip_del: "حذف لدي" },
    it: { clip_photo: "Azione Foto", clip_video: "Azione Video", clip_text: "Azione Testo", clip_loc: "Azione Mappa", clip_link: "Azione Link", clip_copy: "Copia", clip_paste: "Incolla nella chat", clip_save: "Salva / Scarica", clip_forward: "Inoltra", clip_del: "Elimina per me" },
    es: { clip_photo: "Acción de Foto", clip_video: "Acción de Video", clip_text: "Acción de Texto", clip_loc: "Acción de Mapa", clip_link: "Acción de Enlace", clip_copy: "Copiar", clip_paste: "Pegar en el chat", clip_save: "Guardar / Descargar", clip_forward: "Reenviar", clip_del: "Eliminar para mí" },
    fr: { clip_photo: "Action Photo", clip_video: "Action Vidéo", clip_text: "Action Texte", clip_loc: "Action Carte", clip_link: "Action Lien", clip_copy: "Copier", clip_paste: "Coller dans le chat", clip_save: "Enregistrer / Télécharger", clip_forward: "Transférer", clip_del: "Supprimer pour moi" },
    pt: { clip_photo: "Ação de Foto", clip_video: "Ação de Vídeo", clip_text: "Ação de Texto", clip_loc: "Ação de Mapa", clip_link: "Ação de Link", clip_copy: "Copiar", clip_paste: "Colar no chat", clip_save: "Salvar / Baixar", clip_forward: "Encaminhar", clip_del: "Excluir para mim" },
    ja: { clip_photo: "写真アクション", clip_video: "ビデオアクション", clip_text: "テキストアクション", clip_loc: "マップアクション", clip_link: "リンクアクション", clip_copy: "コピー", clip_paste: "チャットに貼り付け", clip_save: "保存 / ダウンロード", clip_forward: "転送", clip_del: "自分の分を削除" },
    zh: { clip_photo: "照片操作", clip_video: "视频操作", clip_text: "文本操作", clip_loc: "地图操作", clip_link: "链接操作", clip_copy: "复制", clip_paste: "粘贴到聊天", clip_save: "保存 / 下载", clip_forward: "转发", clip_del: "为我删除" }
};

// БЕЗОПАСНОЕ МАСШТАБИРУЕМОЕ ВНЕДРЕНИЕ (Для любых будущих языков)
const checkClipI18n = setInterval(() => {
    if (window.i18n && window.i18n.en) {
        clearInterval(checkClipI18n);
        
        // Сканируем ВСЕ языки, которые загружены в вашу экосистему
        for (let sysLang in window.i18n) {
            // Если для языка есть перевод - берем его. Если это новый будущий язык - подставляем English
            const dictToApply = clipDict[sysLang] || clipDict['en'];
            Object.assign(window.i18n[sysLang], dictToApply);
        }
    }
}, 50);

// Глобальные переменные буфера
window.currentClipContent = null;
window.currentClipType = 'text';
window.currentTargetElement = null; 

// 3. Открытие окна
window.openClipboardMenu = function(content, type, targetEl) {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    
    window.currentClipContent = content;
    window.currentClipType = type;
    window.currentTargetElement = targetEl;

    let titleKey = 'clip_text';
    if (type === 'image') titleKey = 'clip_photo';
    if (type === 'video') titleKey = 'clip_video';
    if (type === 'location') titleKey = 'clip_loc';
    if (type === 'link') titleKey = 'clip_link';

    let modal = document.getElementById('clipboard-modal-clean');
    if (!modal) {
        const modalHTML = `
        <div id="clipboard-modal-clean" onclick="if(event.target===this) window.closeClipboardModal();" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center;">
            <div class="flex flex-col p-5 w-full max-w-[300px] bg-[#0b141a] border border-[#2a3942] rounded-2xl shadow-2xl">
                
                <div class="text-center mb-4">
                    <h3 class="text-white font-bold text-sm tracking-wide" id="clip-title-text" data-i18n="${titleKey}">Action</h3>
                </div>
                
                <div class="flex flex-col gap-2">
                    <button type="button" onclick="window.execCopyAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium border border-[#202c33] transition">
                        <i class="fa-regular fa-copy text-[#8696a0]"></i> <span data-i18n="clip_copy">Copy</span>
                    </button>
                    
                    <button type="button" onclick="window.execPasteAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium border border-[#202c33] transition">
                        <i class="fa-solid fa-paste text-[#00a884]"></i> <span data-i18n="clip_paste">Paste to chat</span>
                    </button>
                    
                    <button id="clip-save-btn" type="button" onclick="window.execSaveAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium border border-[#202c33] transition">
                        <i class="fa-solid fa-download text-[#f59e0b]"></i> <span data-i18n="clip_save">Save / Download</span>
                    </button>
                    
                    <button type="button" onclick="window.execForwardAction()" class="flex items-center justify-center gap-3 w-full py-3 bg-[#182229] hover:bg-[#202c33] text-[#d1d7db] rounded-xl text-sm font-medium border border-[#202c33] transition">
                        <i class="fa-solid fa-share text-[#a855f7]"></i> <span data-i18n="clip_forward">Forward</span>
                    </button>
                    
                    <button type="button" onclick="window.execDeleteAction()" class="flex items-center justify-center gap-3 w-full py-3 mt-1 bg-red-950/20 hover:bg-red-950/40 text-[#ef4444] rounded-xl text-sm font-medium border border-red-900/30 transition">
                        <i class="fa-regular fa-trash-can"></i> <span data-i18n="clip_del">Delete for me</span>
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('clipboard-modal-clean');
    } else {
        const titleEl = document.getElementById('clip-title-text');
        if (titleEl) titleEl.setAttribute('data-i18n', titleKey);
    }

    if (typeof window.applyTranslations === 'function') window.applyTranslations();

    const saveBtn = document.getElementById('clip-save-btn');
    if (saveBtn) saveBtn.style.display = (type === 'image' || type === 'video') ? 'flex' : 'none';

    modal.style.display = 'flex';
};

window.closeClipboardModal = function() {
    const modal = document.getElementById('clipboard-modal-clean');
    if (modal) modal.style.display = 'none';
};

// 4. Логика кнопок
window.execCopyAction = async function() {
    if (!window.currentClipContent) return;
    try {
        if (window.currentClipType === 'image') {
            const res = await fetch(window.currentClipContent);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
        } else {
            await navigator.clipboard.writeText(window.currentClipContent);
        }
        if (window.showToast) window.showToast("✔", "", "", "");
    } catch (err) {
        const el = document.createElement('textarea');
        el.value = window.currentClipContent;
        document.body.appendChild(el);
        el.select(); document.execCommand('copy'); document.body.removeChild(el);
        if (window.showToast) window.showToast("✔", "", "", "");
    }
    window.closeClipboardModal();
};

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

window.execSaveAction = function() {
    if (!window.currentClipContent || (window.currentClipType !== 'image' && window.currentClipType !== 'video')) return;
    const a = document.createElement('a');
    a.href = window.currentClipContent;
    a.download = `Media_${Date.now()}.${window.currentClipType === 'video' ? 'mp4' : 'jpg'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast("💾", "", "", "");
    window.closeClipboardModal();
};

window.execForwardAction = function() {
    if (window.currentClipContent) {
        window.hfForwardData = { content: window.currentClipContent, type: window.currentClipType };
        if (window.showToast) window.showToast("➥", "Ready to forward", "", "");
    }
    window.closeClipboardModal();
};

window.execDeleteAction = function() {
    if (window.currentTargetElement) {
        const msgBlock = window.currentTargetElement.closest('.message') || window.currentTargetElement.closest('.chat-bubble-wrapper');
        if (msgBlock) msgBlock.remove();
    }
    window.closeClipboardModal();
};

// 5. Перехватчик событий
function handleContextRequest(e, target) {
    let content = '', type = 'text';

    if (target.tagName === 'IMG') {
        content = target.src; type = 'image';
    } else if (target.tagName === 'VIDEO') {
        content = target.src || target.querySelector('source')?.src; type = 'video';
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
        e.stopPropagation();
        window.openClipboardMenu(content, type, target);
    }
}

// Захват ПКМ на десктопе
document.addEventListener('contextmenu', function(e) {
    const msgBlock = e.target.closest('.message img, .message video, .message iframe, .message a, .msg-text');
    if (msgBlock) {
        e.preventDefault();
        handleContextRequest(e, msgBlock);
    }
});

// Захват долгого тапа
let touchTimer = null;
let touchMoved = false;

document.addEventListener('touchstart', function(e) {
    const msgBlock = e.target.closest('.message img, .message video, .message iframe, .message a, .msg-text');
    if (!msgBlock) return;
    
    touchMoved = false;
    touchTimer = setTimeout(() => {
        if (touchMoved) return; 
        handleContextRequest(e, msgBlock);
        if (e.cancelable) e.preventDefault(); 
    }, 450); 
}, { passive: false });

document.addEventListener('touchend', function() { if (touchTimer) clearTimeout(touchTimer); });
document.addEventListener('touchmove', function() { touchMoved = true; if (touchTimer) clearTimeout(touchTimer); });
        
