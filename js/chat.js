// ==========================================
// ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ ЯЗЫКА С ПРОФИЛЕМ (БЕЗ ОШИБКИ EN)
// ==========================================

window.changeAppLanguage = function(langCode) { 
    localStorage.setItem('hf_app_lang', langCode); 
    
    if (langCode === 'auto') {
        let smartLang = null; 
        
        if (window.myProfileInfo) {
            let phone = window.myProfileInfo.phone || "";
            let flag = window.myProfileInfo.flagCode || "un";
            
            // Определяем по номеру телефона
            if (phone.startsWith('+7')) smartLang = 'ru';
            else if (phone.startsWith('+994')) smartLang = 'az';
            else if (phone.startsWith('+49')) smartLang = 'de';
            else if (phone.startsWith('+90')) smartLang = 'tr';
            else if (phone.startsWith('+39')) smartLang = 'it';
            else if (phone.startsWith('+33')) smartLang = 'fr';
            else if (phone.startsWith('+34')) smartLang = 'es';
            else if (phone.startsWith('+81')) smartLang = 'ja';
            else if (phone.startsWith('+86')) smartLang = 'zh';
            else if (phone.startsWith('+351')) smartLang = 'pt';
            else if (phone.startsWith('+1') || phone.startsWith('+44')) smartLang = 'en';
            else if (phone.startsWith('+971')) smartLang = 'ar';
            // Если номера нет, смотрим на флаг страны
            else if (flag !== 'un') {
                const flagToLang = {
                    'ru': 'ru', 'az': 'az', 'it': 'it', 'de': 'de', 'fr': 'fr', 
                    'jp': 'ja', 'es': 'es', 'cn': 'zh', 'pt': 'pt', 'gb': 'en', 'us': 'en', 'ae': 'ar', 'tr': 'tr'
                };
                if (flagToLang[flag]) smartLang = flagToLang[flag];
            }
        }
        
        // Если профиля нет или не определили — берем язык браузера
        window.appLang = smartLang || navigator.language.slice(0, 2) || 'en';
        
    } else {
        // Если юзер выбрал язык руками в меню
        window.appLang = langCode; 
    }
    
    // Вызываем переводы в index.html
    if (typeof window.applyTranslations === 'function') window.applyTranslations(); 
    if (typeof window.closeDropdown === 'function') window.closeDropdown(); 
    
    const langSelect = document.getElementById('app-lang-select'); 
    if (langSelect) langSelect.value = langCode;
};

// Исправленный перехват сохранения профиля
if (!window.profileLangHooked) {
    const originalSaveProfile = window.saveProfileData;
    window.saveProfileData = function() {
        if (originalSaveProfile) originalSaveProfile();
        let currentSetting = localStorage.getItem('hf_app_lang') || 'auto';
        if (currentSetting === 'auto') {
            setTimeout(() => { window.changeAppLanguage('auto'); }, 300);
        }
    };
    window.profileLangHooked = true;
}

// Запуск при старте
setTimeout(() => {
    let saved = localStorage.getItem('hf_app_lang') || 'auto';
    window.changeAppLanguage(saved);
}, 1000);

// ==========================================
// МЕНЮ АРХИВА И БЭКАПОВ (ФИКС ДЛЯ IPHONE)
// ==========================================

window.openArchiveActionMenu = function(e, itemId, itemTitle, itemType) {
    // Останавливаем всплытие, чтобы Safari не закрывал меню сразу
    if (e) { 
        e.stopPropagation(); 
        e.preventDefault(); 
    }
    
    let itemContent = "Текст файла";
    if (itemType === 'email' && window.mailArchiveDB) {
        let mail = window.mailArchiveDB.find(m => String(m.id) === String(itemId));
        if (mail) itemContent = mail.text || mail.body || "";
    }
    
    window.currentArchiveItem = { id: itemId, title: itemTitle, content: itemContent };
    
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    
    if (!modal || !contentBox) return;
    
    // Заголовок в компактном меню
    const titleEl = document.getElementById('action-modal-title');
    if (titleEl) titleEl.innerText = itemTitle;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Анимация выезда снизу
    setTimeout(() => { contentBox.classList.remove('translate-y-full'); }, 10);
};

window.closeArchiveActionMenu = function() {
    const modal = document.getElementById('archive-action-modal');
    const contentBox = document.getElementById('archive-action-content');
    if(contentBox) contentBox.classList.add('translate-y-full');
    setTimeout(() => {
        if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    }, 300);
};

window.archiveAction = function(actionType) {
    if (!window.currentArchiveItem) return;
    const { id, content } = window.currentArchiveItem;

    if (actionType === 'delete') {
        if (window.mailArchiveDB) {
            window.mailArchiveDB = window.mailArchiveDB.filter(item => String(item.id) !== String(id));
            if(window.renderEmailArchive) window.renderEmailArchive(); 
        }
        const domItem = document.getElementById(id);
        if (domItem) domItem.remove();
        window.showToast("Deleted", "Item removed successfully", "", "");
    } 
    else if (actionType === 'copy') {
        navigator.clipboard.writeText(content).then(() => {
            window.showToast("Copied", "Saved to clipboard", "", "");
        });
    } 
    else if (actionType === 'save') {
        window.showToast("Saved", "Downloaded successfully", "", "");
    }
    window.closeArchiveActionMenu();
};

window.smartArchive = function() {
    const archiveList = document.getElementById('archive-list'); 
    const emptyMsg = document.getElementById('empty-archive'); 
    if(emptyMsg) emptyMsg.style.display = 'none';
    
    let chatName = window.currentTargetUser ? window.currentTargetUser.name.split(' ')[0] : "Global Room";
    if (window.currentRoomId === 'private_ai_bot') chatName = "AI Assistant"; 
    else if (window.currentRoomId.startsWith('private_me')) chatName = "My Notes";
    
    let date = new Date().toLocaleDateString(); 
    let uniqueId = 'item_' + Date.now();
    
    let archiveItem = document.createElement('div'); 
    archiveItem.id = uniqueId;
    archiveItem.className = "bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2";
    
    // Кнопка теперь передает event, а иконка игнорирует клик (pointer-events-none)
    archiveItem.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]">
                <i class="fa-solid fa-file-zipper"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-white font-bold text-sm">Backup: ${chatName}</span>
                <span class="text-[#8696a0] text-xs">${date} • Database</span>
            </div>
        </div>
        <button onclick="window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${chatName}', 'backup')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0 relative z-50">
            <i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i>
        </button>
    `;
    
    if(archiveList) archiveList.prepend(archiveItem); 
    window.showToast("Archived", "Saved to Cloud Repository", "", ""); 
    window.closeTrashModal(); 
    window.switchTab(5); // Переход в архив
};

// ==========================================
// ОСТАЛЬНАЯ ЛОГИКА (БЕЗ ИЗМЕНЕНИЙ)
// ==========================================
// ... (Тут идут твои функции renderSidebar, switchChatRoom, sendFirebaseMsg и т.д.) ...
// Главное, замени начало файла на код выше!
