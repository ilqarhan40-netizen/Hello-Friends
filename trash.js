// ==========================================
// TRASH.JS - Умная мультиязычность Корзины (v2 — 13 языков)
// ==========================================

(function () {
    'use strict';

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

    // Обратный словарь: узнаёт любую из 4 фраз на любом из 13 языков
    const reverseTextMap = {};
    Object.keys(trashDict).forEach((lang) => {
        Object.keys(trashDict[lang]).forEach((key) => {
            reverseTextMap[trashDict[lang][key].trim().toLowerCase()] = key;
        });
    });

    function getTrashLang() {
        const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', gb: 'en', us: 'en', uk: 'en', br: 'pt', mx: 'es' };
        const norm = (v) => {
            if (!v) return '';
            const s = String(v).trim().toLowerCase();
            if (!s || s === 'auto' || s === 'un') return '';
            const b = s.split(/[-_]/)[0].substring(0, 2);
            return fix[b] || b;
        };

        const active = norm(window.appLang);
        if (active && trashDict[active]) return active;

        const saved = norm(localStorage.getItem('hf_app_lang'));
        if (saved && trashDict[saved]) return saved;

        const prof = window.myProfileInfo;
        if (prof && typeof window.getSmartLang === 'function') {
            const smart = norm(window.getSmartLang(prof.phone || null, prof.flagCode || prof.flag || null));
            if (smart && trashDict[smart]) return smart;
        }

        const nav = norm(navigator.language);
        if (nav && trashDict[nav]) return nav;

        return 'en';
    }

    function injectTrashDict() {
        if (!window.i18n) window.i18n = {};
        Object.keys(trashDict).forEach((lang) => {
            if (!window.i18n[lang]) window.i18n[lang] = {};
            Object.assign(window.i18n[lang], trashDict[lang]);
        });
    }

    function setTextPreservingIcons(el, text) {
        if (!el) return;
        if (el.children.length === 0) {
            el.textContent = text;
            return;
        }
        for (let i = 0; i < el.childNodes.length; i++) {
            const node = el.childNodes[i];
            if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
                const lead = /^\s/.test(node.nodeValue) ? ' ' : '';
                node.nodeValue = lead + text;
                return;
            }
        }
        el.appendChild(document.createTextNode(' ' + text));
    }

    window.translateTrashModal = function () {
        injectTrashDict();
        const modal = document.getElementById('trash-modal');
        if (!modal) return;

        const lang = getTrashLang();
        const dict = trashDict[lang] || trashDict.en;

        // 1. Переводим элементы с data-i18n или сохранённым data-trash-key
        modal.querySelectorAll('[data-i18n], [data-trash-key]').forEach((el) => {
            const key = el.getAttribute('data-trash-key') || el.getAttribute('data-i18n');
            if (key && dict[key]) {
                setTextPreservingIcons(el, dict[key]);
            }
        });

        // 2. Страховка: если в HTML у заголовка или кнопок нет data-i18n, находим их по тексту
        modal.querySelectorAll('h1, h2, h3, h4, p, span, button, a, div').forEach((el) => {
            if (el.getAttribute('data-i18n') || el.getAttribute('data-trash-key')) return;
            if (el.querySelector('button, h1, h2, h3, h4, p, span')) return;

            let raw = '';
            if (el.children.length === 0) {
                raw = (el.textContent || '').trim().toLowerCase();
            } else {
                for (let i = 0; i < el.childNodes.length; i++) {
                    const n = el.childNodes[i];
                    if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) {
                        raw = n.nodeValue.trim().toLowerCase();
                        break;
                    }
                }
            }

            const matchedKey = reverseTextMap[raw];
            if (matchedKey && dict[matchedKey]) {
                el.setAttribute('data-trash-key', matchedKey);
                setTextPreservingIcons(el, dict[matchedKey]);
            }
        });
    };

    function hookTrashTranslations() {
        injectTrashDict();

        if (!window._hfTrashApplyHooked && typeof window.applyTranslations === 'function') {
            const origApply = window.applyTranslations;
            window.applyTranslations = function () {
                injectTrashDict();
                const res = origApply.apply(this, arguments);
                window.translateTrashModal();
                return res;
            };
            window._hfTrashApplyHooked = true;
        }

        if (!window._hfTrashChangeHooked && typeof window.changeAppLanguage === 'function') {
            const origChange = window.changeAppLanguage;
            window.changeAppLanguage = function () {
                const res = origChange.apply(this, arguments);
                setTimeout(window.translateTrashModal, 50);
                return res;
            };
            window._hfTrashChangeHooked = true;
        }
    }

    // Функции открытия и закрытия окна корзины
    window.openTrashModal = function () {
        if (typeof window.closeDropdown === 'function') window.closeDropdown();
        window.translateTrashModal();
        const modal = document.getElementById('trash-modal');
        if (modal) modal.classList.add('active');
    };

    window.closeTrashModal = function () {
        const modal = document.getElementById('trash-modal');
        if (modal) modal.classList.remove('active');
    };

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            hookTrashTranslations();
            window.translateTrashModal();
        }, 100);
    });

    window.addEventListener('load', () => {
        hookTrashTranslations();
        window.translateTrashModal();
        setTimeout(() => {
            hookTrashTranslations();
            window.translateTrashModal();
        }, 800);
    });
})();
