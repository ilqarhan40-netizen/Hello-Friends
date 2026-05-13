// js/search.js

// 1. Вставляем HTML структуру поиска при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const searchHTML = `
        <div id="search-modal" class="app-modal" onclick="if(event.target===this) window.closeSearchModal();">
            <div class="app-modal-content h-[85vh] bg-[#141d26] border border-[#2a3942] rounded-t-[32px]" style="box-shadow: 0 -10px 40px rgba(0,0,0,0.8);" onclick="event.stopPropagation();">
                <div class="close-sheet-btn" onclick="window.closeSearchModal()"><i class="fa-solid fa-xmark"></i></div>
                <h2 class="text-xl font-bold text-white mb-5 mt-2 flex items-center gap-2">
                    <i class="fa-solid fa-globe text-blue-400"></i> Global Omni-Search
                </h2>
                
                <div class="relative w-full mb-6 shrink-0">
                    <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#8696a0]"></i>
                    <input type="text" id="global-search-input" onkeyup="window.performLiveSearch()" placeholder="Search..." class="w-full bg-[#202c33] text-white border border-[#2a3942] rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-blue-400 transition shadow-inner">
                </div>

                <div id="search-categories" class="flex flex-col gap-5 overflow-y-auto pb-6 shrink-0">
                    <div>
                        <p class="text-[0.65rem] text-[#eab308] uppercase font-bold tracking-widest mb-2.5">People & Skills</p>
                        <div class="flex flex-wrap gap-2.5">
                            <button onclick="window.filterUsers('profession', 'Engineer')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><i class="fa-solid fa-laptop-code text-cyan-400"></i> Engineer</button>
                            <button onclick="window.filterUsers('profession', 'Designer')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-pink-400 transition shadow-md flex items-center gap-2"><i class="fa-solid fa-palette text-pink-400"></i> Designer</button>
                            <button onclick="window.filterUsers('profession', 'Marketing')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-purple-400 transition shadow-md flex items-center gap-2"><i class="fa-solid fa-chart-line text-purple-400"></i> Marketing</button>
                        </div>
                    </div>

                    <div>
                        <p class="text-[0.65rem] text-cyan-400 uppercase font-bold tracking-widest mb-2.5">Places & Languages</p>
                        <div class="flex flex-wrap gap-2.5">
                            <button onclick="window.filterUsers('country', 'kz')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-gray-700/50 text-[#8696a0] px-1.5 py-0.5 rounded">KZ</span> Kazakhstan</button>
                            <button onclick="window.filterUsers('country', 'ru')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2"><span class="text-[10px] bg-gray-700/50 text-[#8696a0] px-1.5 py-0.5 rounded">RU</span> Russia</button>
                            <button onclick="window.filterUsers('language', 'English')" class="px-3.5 py-2 bg-gradient-to-r from-[#202c33] to-[#111b21] rounded-xl border border-[#2a3942] text-white text-xs font-bold hover:border-cyan-400 transition shadow-md flex items-center gap-2">English</button>
                        </div>
                    </div>
                </div>

                <div class="w-full flex-grow overflow-y-auto flex flex-col gap-2 pr-1 pt-2 border-t border-[#2a3942]" id="search-results-area"></div>
                
                <button onclick="window.doGoogleSearch()" class="w-full py-3.5 mt-auto bg-[#111b21] rounded-2xl border border-[#2a3942] text-white font-bold text-sm hover:bg-[#202c33] transition flex items-center justify-center gap-2 shrink-0">
                    Search Web with Google
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', searchHTML);
});

// 2. Логика управления поиском
window.openSearchModal = function() {
    window.closeAllMenus();
    document.getElementById('search-modal').classList.add('active');
};

window.closeSearchModal = function() {
    document.getElementById('search-modal').classList.remove('active');
    document.getElementById('search-categories').style.display = 'flex';
    document.getElementById('search-results-area').innerHTML = '';
};

window.filterUsers = function(type, value) {
    const resultsArea = document.getElementById('search-results-area');
    const categories = document.getElementById('search-categories');
    categories.style.display = 'none';
    
    resultsArea.innerHTML = `
        <div class="flex items-center gap-3 mb-4 mt-2">
            <button onclick="document.getElementById('search-categories').style.display='flex'; document.getElementById('search-results-area').innerHTML='';" class="text-xs bg-[#202c33] px-3 py-1.5 rounded-lg border border-[#2a3942] text-white">← Back</button> 
            <span class="text-sm text-[#00a884] font-bold">Results: ${value}</span>
        </div>
    `;
    
    let matched = window.participants.filter(p => p.id !== 'ai' && !p.id.startsWith('guest'));
    let val = value.toLowerCase();
    
    matched = matched.filter(p => {
        if (type === 'profession') return p.profession && p.profession.toLowerCase().includes(val);
        if (type === 'country') return p.flagCode && p.flagCode.toLowerCase() === val;
        return false;
    });

    if (matched.length === 0) {
        resultsArea.innerHTML += `<p class="text-[#8696a0] text-center mt-4">No users found.</p>`;
        return;
    }

    matched.forEach(p => {
        resultsArea.innerHTML += `
            <div class="bg-[#202c33] border border-[#2a3942] rounded-2xl p-3 mb-2 flex items-center justify-between" onclick="window.closeSearchModal(); window.openAvatarModal('${p.id}');">
                <div class="flex items-center gap-3">
                    <img src="${p.photo}" class="w-10 h-10 rounded-full object-cover">
                    <div class="flex flex-col">
                        <span class="text-white font-bold text-sm">${p.name}</span>
                        <span class="text-[#8696a0] text-xs">${p.profession || 'User'}</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right text-[#8696a0]"></i>
            </div>
        `;
    });
};
