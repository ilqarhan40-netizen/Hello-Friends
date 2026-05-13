document.addEventListener('DOMContentLoaded', () => {
    // Вставляем HTML структуру Omni-Search (адаптивная под темную/светлую тему)
    const searchModalHTML = `
        <div id="search-modal" class="app-modal" onclick="if(event.target===this) window.closeSearchModal();">
            <div class="app-modal-content h-[85vh] bg-[var(--wa-panel)] border border-[var(--wa-border)] rounded-t-[32px]" style="box-shadow: 0 -10px 40px rgba(0,0,0,0.8);" onclick="event.stopPropagation();">
                <div class="close-sheet-btn" onclick="window.closeSearchModal()"><i class="fa-solid fa-xmark"></i></div>
                
                <h2 class="text-xl font-bold text-[var(--wa-text)] mb-5 mt-2 flex items-center gap-2">
                    <i class="fa-solid fa-globe text-blue-400"></i> Global Omni-Search
                </h2>
                
                <div class="relative w-full mb-4 shrink-0">
                    <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0]"></i>
                    <input type="text" id="global-search-input" onkeyup="window.performOmniSearch(this.value)" placeholder="Search..." class="w-full bg-[var(--wa-bg)] text-[var(--wa-text)] border border-[var(--wa-border)] rounded-2xl pl-11 pr-10 py-3.5 outline-none focus:border-blue-400 transition shadow-inner">
                    <i id="search-clear-btn" class="fa-solid fa-circle-xmark absolute right-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] hidden cursor-pointer hover:text-blue-400 transition" onclick="window.clearOmniSearch()"></i>
                </div>

                <div id="search-categories" class="flex flex-col gap-5 overflow-y-auto pb-6 shrink-0">
                    <div>
                        <p class="text-[0.65rem] text-[#eab308] uppercase font-bold tracking-widest mb-2.5">People & Skills</p>
                        <div class="flex flex-wrap gap-2.5">
                            <button onclick="window.setSearchQuery('Engineer')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-[#eab308] transition shadow-md flex items-center gap-2"><i class="fa-solid fa-laptop-code text-[#eab308]"></i> Engineer</button>
                            <button onclick="window.setSearchQuery('Designer')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-[#eab308] transition shadow-md flex items-center gap-2"><i class="fa-solid fa-palette text-[#eab308]"></i> Designer</button>
                            <button onclick="window.setSearchQuery('Marketing')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-[#eab308] transition shadow-md flex items-center gap-2"><i class="fa-solid fa-chart-line text-[#eab308]"></i> Marketing</button>
                        </div>
                    </div>

                    <div>
                        <p class="text-[0.65rem] text-cyan-400 uppercase font-bold tracking-widest mb-2.5">Places & Languages</p>
                        <div class="flex flex-wrap gap-2.5">
                            <button onclick="window.setSearchQuery('Germany')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-gray-500/20 text-[#8696a0] px-1.5 py-0.5 rounded">DE</span> Germany</button>
                            <button onclick="window.setSearchQuery('Italy')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-gray-500/20 text-[#8696a0] px-1.5 py-0.5 rounded">IT</span> Italy</button>
                            <button onclick="window.setSearchQuery('Kazakhstan')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-gray-500/20 text-[#8696a0] px-1.5 py-0.5 rounded">KZ</span> Kazakhstan</button>
                            <button onclick="window.setSearchQuery('English')" class="px-3.5 py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">A/文</span> English</button>
                        </div>
                    </div>

                    <div>
                        <p class="text-[0.65rem] text-green-500 uppercase font-bold tracking-widest mb-2.5">Services & Actions</p>
                        <div class="flex flex-wrap gap-2.5">
                            <button onclick="window.closeSearchModal(); if(window.openBankTransferModal) window.openBankTransferModal();" class="px-4 py-2 bg-green-500/10 rounded-xl border border-green-500/30 text-green-500 text-xs font-bold hover:bg-green-500/20 transition shadow-md flex items-center gap-2"><i class="fa-solid fa-money-bill-wave"></i> Send Money</button>
                            <button onclick="window.closeSearchModal(); if(window.openEmailModal) window.openEmailModal();" class="px-4 py-2 bg-purple-500/10 rounded-xl border border-purple-500/30 text-purple-500 text-xs font-bold hover:bg-purple-500/20 transition shadow-md flex items-center gap-2"><i class="fa-solid fa-envelope"></i> Compose Email</button>
                        </div>
                    </div>

                    <div>
                        <p class="text-[0.65rem] text-blue-400 uppercase font-bold tracking-widest mb-2.5">Web Queries</p>
                        <div class="grid grid-cols-2 gap-2.5">
                            <button onclick="if(window.doNewsSearch) window.doNewsSearch('Exchange Rates')" class="py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-blue-400 transition shadow-md flex items-center justify-center gap-2"><i class="fa-solid fa-money-bill-transfer text-blue-400"></i> Exchange Rates</button>
                            <button onclick="if(window.doNewsSearch) window.doNewsSearch('World News')" class="py-2 bg-[var(--wa-bg)] rounded-xl border border-[var(--wa-border)] text-[var(--wa-text)] text-xs font-bold hover:border-blue-400 transition shadow-md flex items-center justify-center gap-2"><i class="fa-regular fa-newspaper text-blue-400"></i> World News</button>
                        </div>
                    </div>
                </div>

                <div id="search-status-text" class="text-xs text-[#8696a0] font-bold mb-3 hidden px-2 flex items-center gap-2"></div>
                <div class="w-full flex-grow overflow-y-auto flex flex-col gap-2" id="search-results-area"></div>
                
                <iframe id="search-result-frame" class="w-full h-[40vh] mt-3 rounded-xl border border-[var(--wa-border)] bg-white hidden shrink-0" src="about:blank"></iframe>
                
                <button onclick="window.executeDirectGoogleSearch()" class="w-full py-3.5 mt-auto bg-[var(--wa-bg)] rounded-2xl border border-[var(--wa-border)] text-[var(--wa-text)] font-bold text-sm hover:bg-[var(--wa-border)] transition flex items-center justify-center gap-2 shrink-0 shadow-lg mt-2">
                    Search Web: <span class="text-blue-500 text-base">G</span><span class="text-red-500 text-base">o</span><span class="text-yellow-500 text-base">o</span><span class="text-blue-500 text-base">g</span><span class="text-green-500 text-base">l</span><span class="text-red-500 text-base">e</span>
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', searchModalHTML);
});

// Функции модального окна поиска
window.openSearchModal = function() {
    if(window.closeAllMenus) window.closeAllMenus();
    document.getElementById('search-modal').classList.add('active');
    window.clearOmniSearch(); // Сброс при открытии
};

window.closeSearchModal = function() {
    document.getElementById('search-modal').classList.remove('active');
    window.clearOmniSearch();
};

// Очистка строки поиска по крестику (возвращает категории)
window.clearOmniSearch = function() {
    const input = document.getElementById('global-search-input');
    if(input) input.value = '';
    document.getElementById('search-categories').style.display = 'flex';
    document.getElementById('search-results-area').innerHTML = '';
    document.getElementById('search-clear-btn').classList.add('hidden');
    document.getElementById('search-status-text').classList.add('hidden');
    
    const frame = document.getElementById('search-result-frame');
    if(frame) frame.classList.add('hidden');
};

// Функция вставки текста из кнопок-категорий
window.setSearchQuery = function(text) {
    const input = document.getElementById('global-search-input');
    input.value = text;
    window.performOmniSearch(text);
};

// Живой поиск
window.performOmniSearch = function(value) {
    const resultsArea = document.getElementById('search-results-area');
    const categories = document.getElementById('search-categories');
    const clearBtn = document.getElementById('search-clear-btn');
    const statusText = document.getElementById('search-status-text');
    const resultFrame = document.getElementById('search-result-frame');
    
    // Если пустая строка
    if (!value || !value.trim()) {
        categories.style.display = 'flex';
        resultsArea.innerHTML = '';
        clearBtn.classList.add('hidden');
        statusText.classList.add('hidden');
        if(resultFrame) resultFrame.classList.add('hidden');
        return;
    }

    // Если есть текст, скрываем категории, показываем крестик очистки
    categories.style.display = 'none';
    clearBtn.classList.remove('hidden');
    statusText.classList.remove('hidden');
    statusText.innerHTML = `<div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div> Поиск: "${value}"...`;
    if(resultFrame) resultFrame.classList.add('hidden');
    
    // Логика фильтрации (ищет по профессии, стране, имени или языку)
    let matchedUsers = window.participants ? window.participants.filter(p => p.id !== 'ai' && (!window.myProfileInfo || p.id !== window.myProfileInfo.id) && !p.id.startsWith('guest')) : []; 
    let valLower = value.toLowerCase();
    
    matchedUsers = matchedUsers.filter(p => {
        return (p.name && p.name.toLowerCase().includes(valLower)) || 
               (p.profession && p.profession.toLowerCase().includes(valLower)) ||
               (p.country && p.country.toLowerCase().includes(valLower)) ||
               (p.flagCode && p.flagCode.toLowerCase() === valLower) ||
               (p.profileLangs && p.profileLangs.toLowerCase().includes(valLower)) ||
               (p.langCode && p.langCode.toLowerCase() === valLower);
    });
    
    resultsArea.innerHTML = '';

    if (matchedUsers.length === 0) {
        resultsArea.innerHTML = `<p class="text-[#8696a0] text-[0.8rem] text-center mt-6">В контактах совпадений не найдено.</p>`;
        return;
    }
    
    statusText.innerHTML = `<i class="fa-solid fa-check text-green-400"></i> Found ${matchedUsers.length} user(s)`;

    // Отрисовка карточки (как на твоем фото: светлый/адаптивный фон, имя + код страны, профессия синим)
    matchedUsers.forEach(p => {
        let nameTxt = (p.name || 'User').split(' ')[0];
        let prof = p.profession || 'User';
        let country = p.country || 'Global';
        let flagCodeText = (p.flagCode && p.flagCode !== 'un') ? p.flagCode.toUpperCase() : '';

        resultsArea.innerHTML += `
            <div class="bg-[var(--wa-bg)] border border-[var(--wa-border)] rounded-2xl p-3 flex items-center justify-between shadow-sm cursor-pointer hover:border-blue-400 transition group" onclick="window.closeSearchModal(); if(window.openAvatarModal) window.openAvatarModal('${p.id}');">
                <div class="flex items-center gap-3.5">
                    <img src="${p.photo}" class="w-11 h-11 rounded-full object-cover">
                    <div class="flex flex-col">
                        <span class="text-[var(--wa-text)] font-bold text-[0.9rem]">${nameTxt} <span class="text-[#8696a0] text-[0.6rem] uppercase ml-1">${flagCodeText}</span></span>
                        <span class="text-blue-400 text-[0.75rem] mt-0.5">${prof} <span class="text-[#8696a0]">| ${country}</span></span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-[#8696a0] text-sm mr-2 group-hover:text-blue-400 group-hover:translate-x-1 transition-transform"></i>
            </div>
        `;
    });
};

// Поиск в Web (через Google кнопку)
window.executeDirectGoogleSearch = function() {
    const q = document.getElementById('global-search-input').value;
    if(!q) return;
    const frame = document.getElementById('search-result-frame');
    if(frame) {
        document.getElementById('search-categories').style.display = 'none';
        document.getElementById('search-results-area').innerHTML = '';
        document.getElementById('search-status-text').classList.add('hidden');
        frame.src = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setmkt=en-us&setlang=en-us`; // Используем Bing во фрейме, т.к. Google блокирует iframe
        frame.classList.remove('hidden');
    }
};
