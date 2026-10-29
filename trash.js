// ==========================================
// TRASH.JS - Умная мультиязычность Корзины
// ==========================================

const trashDict = {
    en: { manage_chat_title: "Manage Chat", archive_chat: "Archive Chat", clear_history: "Clear History", delete_forever: "Delete Forever" },
    ru: { manage_chat_title: "Управление чатом", archive_chat: "Архивировать чат", clear_history: "Очистить историю", delete_forever: "Удалить навсегда" },
    de: { manage_chat_title: "Chat verwalten", archive_chat: "Chat archivieren", clear_history: "Verlauf leeren", delete_forever: "Endgültig löschen" },
    kk: { manage_chat_title: "Чатты басқару", archive_chat: "Чатты мұрағаттау", clear_history: "Тарихты тазалау", delete_forever: "Мәңгілікке өшіру" },
    az: { manage_chat_title: "Çatı idarə et", archive_chat: "Çatı arxivləşdir", clear_history: "Tarixçəni təmizlə", delete_forever: "Həmişəlik sil" },
    tr: { manage_chat_title: "Sohbeti Yönet", archive_chat: "Sohbeti Arşivle", clear_history: "Geçmişi Temizle", delete_forever: "Kalıcı Olarak Sil" },
    ar: { manage_chat_title: "إدارة الدردشة", archive_chat: "أرشفة الدردشة", clear_history: "مسح السجل", delete_forever: "حذف نهائي" },
    it: { manage_chat_title: "Gestisci Chat", archive_chat: "Archivia Chat", clear_history: "Cancella Cronologia", delete_forever: "Elimina per sempre" },
    es: { manage_chat_title: "Gestionar Chat", archive_chat: "Archivar Chat", clear_history: "Borrar Historial", delete_forever: "Eliminar para siempre" },
    fr: { manage_chat_title: "Gérer le Chat", archive_chat: "Archiver le Chat", clear_history: "Effacer l'historique", delete_forever: "Supprimer définitivement" },
    pt: { manage_chat_title: "Gerenciar Chat", archive_chat: "Arquivar Chat", clear_history: "Limpar Histórico", delete_forever: "Excluir para sempre" },
    ja: { manage_chat_title: "チャット管理", archive_chat: "チャットをアーカイブ", clear_history: "履歴をクリア", delete_forever: "完全に削除" },
    zh: { manage_chat_title: "管理聊天", archive_chat: "归档聊天", clear_history: "清除历史记录", delete_forever: "永久删除" }
};

// Надежный перехватчик: ждет загрузки главного словаря i18n
const checkI18n = setInterval(() => {
    if (window.i18n && window.i18n.en) {
        clearInterval(checkI18n); // Останавливаем таймер
        
        // Безопасно внедряем слова Корзины во все языки приложения
        for (let lang in trashDict) {
            if (!window.i18n[lang]) window.i18n[lang] = {};
            Object.assign(window.i18n[lang], trashDict[lang]);
        }
        
        // Принудительно переводим интерфейс
        if (typeof window.applyTranslations === 'function') {
            window.applyTranslations();
        }
    }
}, 50); // Проверяет каждые 50 миллисекунд

// ==========================================
// ФУНКЦИИ ОКНА
// ==========================================
window.openTrashModal = function() {
    if (typeof window.closeDropdown === 'function') window.closeDropdown();
    const modal = document.getElementById('trash-modal');
    if (modal) modal.classList.add('active');
};

window.closeTrashModal = function() {
    const modal = document.getElementById('trash-modal');
    if (modal) modal.classList.remove('active');
};
