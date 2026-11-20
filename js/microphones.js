// ============================================================
// НЕЗАВИСИМЫЕ МИКРОФОНЫ ДЛЯ КАЖДОЙ КОМНАТЫ (js/microphones.js)
// 4 отдельных мира: Global / Private / Conference / Video-Audio
// ============================================================

(function () {
    'use strict';

    // 1. Словарь интерфейса микрофонов на 13 языков экосистемы
    const HF_MIC_I18N = {
        en: {
            mic_lang_title: 'Mic Language',
            mic_lang_auto: '🤖 Auto (Profile)',
            voice_msg_ai: 'Voice Message (AI)',
            voice_text: 'Voice Text',
            room_global: '🌍 Global',
            room_private: '🔒 Private',
            room_conf: '🎥 Conference',
            room_video: '📞 Audio / Video',
            toast_saved: 'Saved for this room'
        },
        ru: {
            mic_lang_title: 'Язык микрофона',
            mic_lang_auto: '🤖 Авто (профиль)',
            voice_msg_ai: 'Голосовое (AI)',
            voice_text: 'Текст голосом',
            room_global: '🌍 Глобальный',
            room_private: '🔒 Приват',
            room_conf: '🎥 Конференция',
            room_video: '📞 Аудио / Видео',
            toast_saved: 'Сохранено для этой комнаты'
        },
        az: {
            mic_lang_title: 'Mikrofon dili',
            mic_lang_auto: '🤖 Avto (profil)',
            voice_msg_ai: 'Səsli mesaj (AI)',
            voice_text: 'Səslə mətn',
            room_global: '🌍 Qlobal',
            room_private: '🔒 Şəxsi',
            room_conf: '🎥 Konfrans',
            room_video: '📞 Audio / Video',
            toast_saved: 'Bu otaq üçün yadda saxlanıldı'
        },
        kk: {
            mic_lang_title: 'Микрофон тілі',
            mic_lang_auto: '🤖 Авто (профиль)',
            voice_msg_ai: 'Дауыстық хабар (AI)',
            voice_text: 'Дауыспен мәтін',
            room_global: '🌍 Ғаламдық',
            room_private: '🔒 Жеке',
            room_conf: '🎥 Конференция',
            room_video: '📞 Аудио / Бейне',
            toast_saved: 'Осы бөлме үшін сақталды'
        },
        tr: {
            mic_lang_title: 'Mikrofon dili',
            mic_lang_auto: '🤖 Otomatik (profil)',
            voice_msg_ai: 'Sesli Mesaj (AI)',
            voice_text: 'Sesle Metin',
            room_global: '🌍 Global',
            room_private: '🔒 Özel',
            room_conf: '🎥 Konferans',
            room_video: '📞 Ses / Video',
            toast_saved: 'Bu oda için kaydedildi'
        },
        de: {
            mic_lang_title: 'Mikrofonsprache',
            mic_lang_auto: '🤖 Auto (Profil)',
            voice_msg_ai: 'Sprachnachricht (AI)',
            voice_text: 'Sprache zu Text',
            room_global: '🌍 Global',
            room_private: '🔒 Privat',
            room_conf: '🎥 Konferenz',
            room_video: '📞 Audio / Video',
            toast_saved: 'Für diesen Raum gespeichert'
        },
        ar: {
            mic_lang_title: 'لغة الميكروفون',
            mic_lang_auto: '🤖 تلقائي (الملف)',
            voice_msg_ai: 'رسالة صوتية (AI)',
            voice_text: 'نص بالصوت',
            room_global: '🌍 عام',
            room_private: '🔒 خاص',
            room_conf: '🎥 مؤتمر',
            room_video: '📞 صوت / فيديو',
            toast_saved: 'تم الحفظ لهذه الغرفة'
        },
        it: {
            mic_lang_title: 'Lingua microfono',
            mic_lang_auto: '🤖 Auto (profilo)',
            voice_msg_ai: 'Messaggio vocale (AI)',
            voice_text: 'Testo vocale',
            room_global: '🌍 Globale',
            room_private: '🔒 Privato',
            room_conf: '🎥 Conferenza',
            room_video: '📞 Audio / Video',
            toast_saved: 'Salvato per questa stanza'
        },
        es: {
            mic_lang_title: 'Idioma del micrófono',
            mic_lang_auto: '🤖 Auto (perfil)',
            voice_msg_ai: 'Mensaje de voz (AI)',
            voice_text: 'Texto por voz',
            room_global: '🌍 Global',
            room_private: '🔒 Privado',
            room_conf: '🎥 Conferencia',
            room_video: '📞 Audio / Video',
            toast_saved: 'Guardado para esta sala'
        },
        fr: {
            mic_lang_title: 'Langue du micro',
            mic_lang_auto: '🤖 Auto (profil)',
            voice_msg_ai: 'Message vocal (AI)',
            voice_text: 'Texte vocal',
            room_global: '🌍 Global',
            room_private: '🔒 Privé',
            room_conf: '🎥 Conférence',
            room_video: '📞 Audio / Vidéo',
            toast_saved: 'Enregistré pour cette salle'
        },
        pt: {
            mic_lang_title: 'Idioma do microfone',
            mic_lang_auto: '🤖 Auto (perfil)',
            voice_msg_ai: 'Mensagem de voz (AI)',
            voice_text: 'Texto por voz',
            room_global: '🌍 Global',
            room_private: '🔒 Privado',
            room_conf: '🎥 Conferência',
            room_video: '📞 Áudio / Vídeo',
            toast_saved: 'Salvo para esta sala'
        },
        ja: {
            mic_lang_title: 'マイク言語',
            mic_lang_auto: '🤖 自動 (プロフィール)',
            voice_msg_ai: '音声メッセージ (AI)',
            voice_text: '音声テキスト',
            room_global: '🌍 グローバル',
            room_private: '🔒 プライベート',
            room_conf: '🎥 会議',
            room_video: '📞 音声 / ビデオ',
            toast_saved: 'このルームに保存しました'
        },
        zh: {
            mic_lang_title: '麦克风语言',
            mic_lang_auto: '🤖 自动 (个人资料)',
            voice_msg_ai: '语音消息 (AI)',
            voice_text: '语音转文字',
            room_global: '🌍 全球',
            room_private: '🔒 私聊',
            room_conf: '🎥 会议',
            room_video: '📞 语音 / 视频',
            toast_saved: '已保存到此房间'
        }
    };

    // 13 языков распознавания речи
    const MIC_LANG_OPTIONS = [
        { code: 'en', label: '🇬🇧 English' },
        { code: 'ru', label: '🇷🇺 Русский' },
        { code: 'az', label: '🇦🇿 Azərbaycanca' },
        { code: 'kk', label: '🇰🇿 Қазақша' },
        { code: 'tr', label: '🇹🇷 Türkçe' },
        { code: 'de', label: '🇩🇪 Deutsch' },
        { code: 'ar', label: '🇦🇪 العربية' },
        { code: 'it', label: '🇮🇹 Italiano' },
        { code: 'es', label: '🇪🇸 Español' },
        { code: 'fr', label: '🇫🇷 Français' },
        { code: 'pt', label: '🇵🇹 Português' },
        { code: 'ja', label: '🇯🇵 日本語' },
        { code: 'zh', label: '🇨🇳 中文' }
    ];

    const ROOM_CONFIGS = [
        { key: 'global',  popupId: 'global-mic-popup',  selectId: 'global-mic-lang',  roomLabelKey: 'room_global' },
        { key: 'private', popupId: 'private-mic-popup', selectId: 'private-mic-lang', roomLabelKey: 'room_private' },
        { key: 'conf',    popupId: 'conf-mic-popup',    selectId: 'conf-mic-lang',    roomLabelKey: 'room_conf' },
        { key: 'video',   popupId: 'video-mic-popup',   selectId: 'video-mic-lang',   roomLabelKey: 'room_video' }
    ];

    function getUiLang() {
        let code = (window.appLang || localStorage.getItem('hf_app_lang') || navigator.language || 'en');
        if (code === 'auto') code = navigator.language || 'en';
        code = String(code).slice(0, 2).toLowerCase();
        if (code === 'kz') code = 'kk';
        return HF_MIC_I18N[code] ? code : 'en';
    }

    function t(key) {
        const lang = getUiLang();
        return (HF_MIC_I18N[lang] && HF_MIC_I18N[lang][key]) || HF_MIC_I18N.en[key] || key;
    }

    function getPrivateRoomIdSafe() {
        const r = window.currentRoomId || '';
        if (!r || r === 'global' || r === 'video_room_global' || r === 'private_ai_bot' || r.startsWith('private_me_')) {
            return null;
        }
        return r;
    }

    function detectRoomType(inputId) {
        const idStr = inputId ? String(inputId).toLowerCase() : '';
        if (window.currentIndex === 2 || idStr.includes('conf') || window.currentRoomId === 'video_room_global') {
            return 'conf';
        }
        if (window.currentIndex === 1 || idStr.includes('video') || idStr.includes('voice') || idStr.includes('call')) {
            return 'video';
        }
        if (getPrivateRoomIdSafe()) {
            return 'private';
        }
        return 'global';
    }

    // 2. Стили для 4 независимых окон микрофонов
    function injectMicStyles() {
        if (document.getElementById('hf-microphones-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-microphones-styles';
        style.textContent = `
            .hf-mic-popup {
                position: absolute;
                bottom: 65px;
                right: 10px;
                background: #111b21;
                border: 1px solid #2a3942;
                border-radius: 20px;
                padding: 12px;
                display: none;
                flex-direction: column;
                gap: 8px;
                z-index: 9999;
                min-width: 235px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
            }
            .hf-mic-popup.active {
                display: flex;
            }
            .hf-mic-lang-card {
                background: #202c33;
                border: 1px solid #2a3942;
                border-radius: 14px;
                padding: 10px 12px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .hf-mic-lang-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.03em;
                color: #00a884;
                text-transform: uppercase;
            }
            .hf-mic-room-badge {
                font-size: 0.65rem;
                color: #8696a0;
                text-transform: none;
                font-weight: 600;
            }
            .hf-mic-select {
                width: 100%;
                background: #111b21;
                color: #ffffff;
                border: 1px solid #2a3942;
                border-radius: 10px;
                padding: 8px 10px;
                font-size: 0.85rem;
                font-weight: 600;
                outline: none;
                cursor: pointer;
            }
            .hf-mic-select:focus {
                border-color: #00a884;
            }
            .light-theme .hf-mic-popup {
                background: #ffffff;
                border-color: #d1d7db;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            }
            .light-theme .hf-mic-lang-card {
                background: #f0f2f5;
                border-color: #d1d7db;
            }
            .light-theme .hf-mic-select {
                background: #ffffff;
                color: #111b21;
                border-color: #d1d7db;
            }
            .light-theme .hf-mic-popup .mic-option-btn {
                background: #f0f2f5;
                color: #111b21;
            }
            .light-theme .hf-mic-popup .mic-option-btn:hover {
                background: #e2e8f0;
            }
        `;
        document.head.appendChild(style);
    }

    // 3. Автоматическая уборка старого общего меню и старого селекта в ромбе
    function cleanupLegacyMicUI() {
        let mountTarget = null;

        const oldPopup = document.getElementById('universal-mic-popup');
        if (oldPopup) {
            mountTarget = oldPopup.parentNode;
            oldPopup.remove();
        }

        const oldRhombusSelect = document.getElementById('plus-mic-lang');
        if (oldRhombusSelect) {
            const prev = oldRhombusSelect.previousElementSibling;
            if (prev && /mic|микроф/i.test(prev.textContent || '')) {
                prev.remove();
            }
            oldRhombusSelect.remove();
        }

        if (!mountTarget) {
            const msgEl = document.getElementById('message');
            mountTarget = (msgEl && msgEl.parentNode) ? msgEl.parentNode : document.body;
        }
        return mountTarget;
    }

    // 4. Создание 4 полностью независимых окон микрофонов
    function buildMicPopupHTML(cfg) {
        const optionsHtml =
            `<option value="auto" data-mic-i18n="mic_lang_auto">${t('mic_lang_auto')}</option>` +
            MIC_LANG_OPTIONS.map(o => `<option value="${o.code}">${o.label}</option>`).join('');

        return `
            <div class="hf-mic-lang-card">
                <div class="hf-mic-lang-head">
                    <span><i class="fa-solid fa-language mr-1"></i> <span data-mic-i18n="mic_lang_title">${t('mic_lang_title')}</span></span>
                    <span class="hf-mic-room-badge" data-mic-i18n="${cfg.roomLabelKey}">${t(cfg.roomLabelKey)}</span>
                </div>
                <select id="${cfg.selectId}" class="hf-mic-select" onchange="window.hfSaveRoomMic('${cfg.key}', this.value)">
                    ${optionsHtml}
                </select>
            </div>
            <button class="mic-option-btn" onclick="window.hfRunRoomMic('${cfg.key}', 'ai-audio')">
                <i class="fa-solid fa-robot mic-opt-ai"></i>
                <span data-mic-i18n="voice_msg_ai">${t('voice_msg_ai')}</span>
            </button>
            <button class="mic-option-btn" onclick="window.hfRunRoomMic('${cfg.key}', 'text')">
                <i class="fa-solid fa-microphone mic-opt-text"></i>
                <span data-mic-i18n="voice_text">${t('voice_text')}</span>
            </button>
        `;
    }

    function mountIndependentPopups() {
        injectMicStyles();
        const mountTarget = cleanupLegacyMicUI();

        ROOM_CONFIGS.forEach(cfg => {
            if (document.getElementById(cfg.popupId)) return;
            const div = document.createElement('div');
            div.id = cfg.popupId;
            div.className = 'hf-mic-popup';
            div.setAttribute('onclick', 'event.stopPropagation();');
            div.innerHTML = buildMicPopupHTML(cfg);
            mountTarget.appendChild(div);
        });

        window.syncMicLangUI();
        window.updateMicPopupsI18n();
    }

    // 5. Закрытие и открытие строго нужного микрофона
    window.closeAllMicPopups = function () {
        ROOM_CONFIGS.forEach(cfg => {
            const el = document.getElementById(cfg.popupId);
            if (el) el.classList.remove('active');
        });
    };

    window.hfOpenRoomMic = function (roomKey, e, inputId) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        if (inputId) window.currentMicInputTarget = inputId;

        const cfg = ROOM_CONFIGS.find(c => c.key === roomKey) || ROOM_CONFIGS[0];
        let popup = document.getElementById(cfg.popupId);
        if (!popup) {
            mountIndependentPopups();
            popup = document.getElementById(cfg.popupId);
        }
        if (!popup) return;

        const wasActive = popup.classList.contains('active');
        window.closeAllMicPopups();
        if (!wasActive) {
            window.syncMicLangUI();
            window.updateMicPopupsI18n();
            popup.classList.add('active');
        }
    };

    // 6. Сохранение языка СТРОГО в свой слот комнаты (без пересечений)
    window.hfSaveRoomMic = function (roomKey, val) {
        const cleanVal = (!val || val === 'auto') ? 'auto' : val;

        if (roomKey === 'global') {
            if (cleanVal === 'auto') localStorage.removeItem('hf_global_mic_lang');
            else localStorage.setItem('hf_global_mic_lang', cleanVal);
            if (typeof window.syncMyGlobalChannelLang === 'function') {
                window.syncMyGlobalChannelLang('mic');
            }
        } else if (roomKey === 'private') {
            const rId = getPrivateRoomIdSafe();
            if (rId) {
                if (cleanVal === 'auto') localStorage.removeItem('hf_priv_mic_lang_' + rId);
                else localStorage.setItem('hf_priv_mic_lang_' + rId, cleanVal);
                if (typeof window.syncMyPrivateChannelLang === 'function') {
                    window.syncMyPrivateChannelLang(rId, 'mic');
                }
            }
        } else if (roomKey === 'conf') {
            if (cleanVal === 'auto') localStorage.removeItem('hf_conf_mic_lang');
            else localStorage.setItem('hf_conf_mic_lang', cleanVal);
            if (typeof window.saveConfMicLang === 'function') {
                try { window.saveConfMicLang(cleanVal); } catch (e) {}
            }
        } else if (roomKey === 'video') {
            if (cleanVal === 'auto') localStorage.removeItem('hf_video_mic_lang');
            else localStorage.setItem('hf_video_mic_lang', cleanVal);
            if (typeof window.saveVideoMicLang === 'function') {
                try { window.saveVideoMicLang(cleanVal); } catch (e) {}
            }
        }

        if (typeof window.showToast === 'function') {
            window.showToast(t('mic_lang_title'), t('toast_saved'), '', '');
        }
    };

    // 7. Запуск распознавания речи СТРОГО для своей комнаты
    window.hfRunRoomMic = function (roomKey, mode) {
        window.closeAllMicPopups();
        if (typeof window.closeAllMenus === 'function') {
            try { window.closeAllMenus(); } catch (e) {}
        }

        if (roomKey === 'global') {
            if (typeof window.startUniversalMic === 'function') return window.startUniversalMic(mode);
        } else if (roomKey === 'private') {
            if (typeof window.startPrivateMic === 'function') return window.startPrivateMic(mode);
            if (typeof window.startUniversalMic === 'function') return window.startUniversalMic(mode);
        } else if (roomKey === 'conf') {
            if (typeof window.startConfMic === 'function') return window.startConfMic(mode);
            if (typeof window.startUniversalMic === 'function') return window.startUniversalMic(mode);
        } else if (roomKey === 'video') {
            if (typeof window.startVideoRoomMic === 'function') return window.startVideoRoomMic(mode);
            if (typeof window.startVoiceRoomMic === 'function') return window.startVoiceRoomMic(mode);
        }
    };

    // 8. Синхронизация всех 4 селектов со своей памятью
    window.syncMicLangUI = function () {
        const gSel = document.getElementById('global-mic-lang');
        if (gSel) gSel.value = localStorage.getItem('hf_global_mic_lang') || 'auto';

        const pSel = document.getElementById('private-mic-lang');
        const rId = getPrivateRoomIdSafe();
        if (pSel) {
            pSel.value = rId ? (localStorage.getItem('hf_priv_mic_lang_' + rId) || 'auto') : 'auto';
            if (rId && typeof window.initPrivateLiveLangSync === 'function') {
                window.initPrivateLiveLangSync(rId);
            }
        }

        const cSel = document.getElementById('conf-mic-lang');
        if (cSel) cSel.value = localStorage.getItem('hf_conf_mic_lang') || 'auto';

        const vSel = document.getElementById('video-mic-lang');
        if (vSel) vSel.value = localStorage.getItem('hf_video_mic_lang') || 'auto';
    };

    window.saveRoomMicLang = function (val) {
        window.hfSaveRoomMic(detectRoomType(), val);
    };

    // 9. Перевод подписей микрофонов при смене языка экосистемы (не сбрасывая выбранный язык речи!)
    window.updateMicPopupsI18n = function () {
        window.i18n = window.i18n || {};
        Object.keys(HF_MIC_I18N).forEach(code => {
            window.i18n[code] = Object.assign({}, window.i18n[code] || {}, HF_MIC_I18N[code]);
        });

        document.querySelectorAll('.hf-mic-popup [data-mic-i18n]').forEach(el => {
            const key = el.getAttribute('data-mic-i18n');
            if (key) el.textContent = t(key);
        });
    };

    // 10. Безопасный перехват стандартных функций (toggleUniversalMic / closeAllMenus / applyTranslations)
    function bindHooks() {
        window.toggleUniversalMic = function (e, inputId) {
            const roomKey = detectRoomType(inputId);
            window.hfOpenRoomMic(roomKey, e, inputId);
        };

        if (!window._hfMicCloseHooked && typeof window.closeAllMenus === 'function') {
            const origClose = window.closeAllMenus;
            window.closeAllMenus = function () {
                window.closeAllMicPopups();
                return origClose.apply(this, arguments);
            };
            window._hfMicCloseHooked = true;
        }

        if (!window._hfMicI18nHooked && typeof window.applyTranslations === 'function') {
            const origApply = window.applyTranslations;
            window.applyTranslations = function () {
                const res = origApply.apply(this, arguments);
                window.updateMicPopupsI18n();
                return res;
            };
            window._hfMicI18nHooked = true;
        }

        if (!window._hfMicChangeLangHooked && typeof window.changeAppLanguage === 'function') {
            const origChange = window.changeAppLanguage;
            window.changeAppLanguage = function () {
                const res = origChange.apply(this, arguments);
                setTimeout(window.updateMicPopupsI18n, 50);
                return res;
            };
            window._hfMicChangeLangHooked = true;
        }
    }

    document.addEventListener('click', function () {
        window.closeAllMicPopups();
    });

    function initMicrophones() {
        mountIndependentPopups();
        bindHooks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMicrophones);
    } else {
        initMicrophones();
    }

    window.addEventListener('load', function () {
        mountIndependentPopups();
        bindHooks();
        setTimeout(() => {
            window.syncMicLangUI();
            window.updateMicPopupsI18n();
        }, 600);
    });
})();
