// ==========================================
// 1. ПЕРЕХВАТ ВСТАВКИ ФОТО И ВИДЕО (PASTE)
// ==========================================
document.addEventListener('paste', function(e) {
    let clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    let items = clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            let file = items[i].getAsFile();
            if (!file) continue;

            if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                e.preventDefault(); 
                
                let mediaTypeStr = file.type.startsWith('image/') ? 'фото' : 'видео';
                
                if (confirm(`Отправить скопированное ${mediaTypeStr} в чат?`)) {
                    // Укажи здесь правильный ID твоего инпута-скрепки
                    let fileInput = document.getElementById('media-upload-input'); 
                    
                    if (fileInput) {
                        let dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        
                        let event = new Event('change', { bubbles: true });
                        fileInput.dispatchEvent(event);
                    } else if (typeof window.uploadMediaFile === 'function') {
                        window.uploadMediaFile(file);
                    } else {
                        alert("Загрузчик файлов не найден.");
                    }
                }
                break; 
            }
        }
    }
});

// ==========================================
// 2. СОЗДАНИЕ СВОЕГО МЕНЮ И БЛОКИРОВКА ГУГЛА
// ==========================================

// Внедряем CSS для меню и блокировки системы
const overrideStyle = document.createElement('style');
overrideStyle.innerHTML = `
    .chat-bubble, .chat-bubble img, .chat-bubble video {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
    }
    #custom-action-menu {
        transition: opacity 0.1s ease-in-out, transform 0.1s ease-in-out;
    }
`;
document.head.appendChild(overrideStyle);

// Создаем HTML нашего меню в памяти (стилизовано под твой темный чат)
const customMenu = document.createElement('div');
customMenu.id = 'custom-action-menu';
customMenu.className = 'hidden absolute z-[9999] bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl flex flex-col p-2 min-w-[160px] transform scale-95 opacity-0 origin-top-left';
customMenu.innerHTML = `
    <button onclick="window.handleMenuAction('copy')" class="flex items-center gap-3 text-[#e9edef] text-sm text-left p-3 hover:bg-[#111b21] rounded-lg transition">
        <i class="fa-regular fa-copy text-[#8696a0]"></i> Скопировать
    </button>
    <button onclick="window.handleMenuAction('paste')" class="flex items-center gap-3 text-[#e9edef] text-sm text-left p-3 hover:bg-[#111b21] rounded-lg transition">
        <i class="fa-solid fa-paste text-[#8696a0]"></i> Вставить
    </button>
    <button onclick="window.handleMenuAction('forward')" class="flex items-center gap-3 text-[#e9edef] text-sm text-left p-3 hover:bg-[#111b21] rounded-lg transition">
        <i class="fa-solid fa-share text-[#8696a0]"></i> Переслать
    </button>
    <div class="h-[1px] w-full bg-[#2a3942] my-1"></div>
    <button onclick="window.handleMenuAction('delete')" class="flex items-center gap-3 text-red-500 text-sm text-left p-3 hover:bg-red-500/10 rounded-lg transition font-bold">
        <i class="fa-regular fa-trash-can"></i> Удалить
    </button>
`;
document.body.appendChild(customMenu);

window.currentMenuTarget = null; // Запоминаем, на что кликнули

// Перехватываем долгий тап
document.addEventListener('contextmenu', function(e) {
    let targetElement = e.target.closest('.chat-bubble') || e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO';
    
    if (targetElement) {
        e.preventDefault(); // Убиваем Гугл-меню
        window.currentMenuTarget = targetElement; // Запоминаем пузырь с текстом/фото
        
        // Позиционируем меню там, где палец
        let x = e.pageX;
        let y = e.pageY;
        
        // Проверка, чтобы меню не уехало за край экрана
        if (x + 160 > window.innerWidth) x = window.innerWidth - 170;
        
        customMenu.style.left = x + 'px';
        customMenu.style.top = y + 'px';
        
        // Показываем с анимацией
        customMenu.classList.remove('hidden');
        setTimeout(() => {
            customMenu.classList.remove('scale-95', 'opacity-0');
            customMenu.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
});

// Закрываем меню при тапе в любое другое место
document.addEventListener('click', function(e) {
    if (!customMenu.contains(e.target)) {
        customMenu.classList.add('scale-95', 'opacity-0');
        customMenu.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => customMenu.classList.add('hidden'), 100);
    }
});

// ==========================================
// 3. ФУНКЦИИ КНОПОК МЕНЮ
// ==========================================
window.handleMenuAction = function(action) {
    // Прячем меню после выбора
    customMenu.classList.add('hidden', 'scale-95', 'opacity-0');
    
    if (!window.currentMenuTarget) return;

    if (action === 'copy') {
        // Копирование текста (если это текст) или ссылки (если картинка)
        let textToCopy = window.currentMenuTarget.innerText;
        let imgEl = window.currentMenuTarget.querySelector('img');
        if (imgEl) textToCopy = imgEl.src; // Если картинка, скопируется ссылка
        
        navigator.clipboard.writeText(textToCopy.trim()).then(() => {
            if (window.showToast) window.showToast("Скопировано", "Сохранено в буфер обмена", "", "");
        }).catch(err => console.log('Ошибка копирования: ', err));

    } else if (action === 'paste') {
        // Вставка текста из буфера в строку ввода
        navigator.clipboard.readText().then(clipText => {
            let inputField = document.getElementById('chat-input') || document.getElementById('conf-chat-input');
            if (inputField) {
                inputField.value += clipText;
                inputField.focus();
            }
        });

    } else if (action === 'forward') {
        // Пересылка (пока просто окно, сюда потом можно привязать вызов твоего списка контактов)
        alert("Выберите контакт для пересылки (нужно привязать базу)");

    } else if (action === 'delete') {
        // Удаление
        if(confirm("Удалить это сообщение?")) {
            // Визуальное удаление с экрана:
            let messageGroup = window.currentMenuTarget.closest('.flex.flex-col.w-full.mt-3');
            if (messageGroup) {
                messageGroup.remove();
            } else {
                window.currentMenuTarget.remove();
            }
            // *Здесь позже можно добавить удаление из Firebase по ID*
        }
    }
};
