// =======================================================
// ФАЙЛ: js/live-room.js (OPEN LIVE ROOMS — PROTOTYPE: conference.js)
// - Отдельные открытые ("проходные") комнаты у каждого пользователя
// - Камера при входе ВЫКЛЮЧЕНА (личный выбор каждого, до 6 видео в сетке)
// - При выключенной камере свой фрейм и бегущая строка переводов продолжают работать
// - Верхняя строка CC: оригиналы всех участников комнаты
// - Внутренняя строка фрейма: медленная очередь переводов чужих фраз на твой активный язык
// - Тап по видеофрейму -> ручная панель смены языка
// - Тап по флагу -> информация о стране
// - Корзина -> родная window.openTrashModal()
// - Полная изоляция от switchTab(1) и switchTab(2)
// =======================================================

(function () {
    'use strict';

    const LIVE_LANG_MAP = {
        en: { name: 'English', flagCode: 'gb', flag: '🇬🇧', speech: 'en-US' },
        kk: { name: 'Қазақша', flagCode: 'kz', flag: '🇰🇿', speech: 'kk-KZ' },
        ru: { name: 'Русский', flagCode: 'ru', flag: '🇷🇺', speech: 'ru-RU' },
        az: { name: 'Azərbaycanca', flagCode: 'az', flag: '🇦🇿', speech: 'az-AZ' },
        de: { name: 'Deutsch', flagCode: 'de', flag: '🇩🇪', speech: 'de-DE' },
        tr: { name: 'Türkçe', flagCode: 'tr', flag: '🇹🇷', speech: 'tr-TR' },
        ar: { name: 'العربية', flagCode: 'ae', flag: '🇦🇪', speech: 'ar-AE' },
        it: { name: 'Italiano', flagCode: 'it', flag: '🇮🇹', speech: 'it-IT' },
        es: { name: 'Español', flagCode: 'es', flag: '🇪🇸', speech: 'es-ES' },
        fr: { name: 'Français', flagCode: 'fr', flag: '🇫🇷', speech: 'fr-FR' },
        pt: { name: 'Português', flagCode: 'pt', flag: '🇵🇹', speech: 'pt-PT' },
        ja: { name: '日本語', flagCode: 'jp', flag: '🇯🇵', speech: 'ja-JP' },
        zh: { name: '中文', flagCode: 'cn', flag: '🇨🇳', speech: 'zh-CN' }
    };

    const LIVE_I18N_BUNDLE = {
        en: {
            live_nav: 'Live', live_msg_placeholder: 'Message Live...',
            live_lang_title: 'Live Language', live_auto: 'Auto (Profile)', live_mic_title: 'Live Mic',
            live_direct: 'Direct', live_ai: 'AI', live_on: 'MIC ON', live_ai_on: 'AI VOICE ON', live_stop: 'STOP',
            live_cc_wait: 'Live originals...', live_wait_trans: 'Translations will appear here...',
            live_badge: 'LIVE', live_voice_text: 'Voice Text', live_cam_off: 'Camera Off'
        },
        ru: {
            live_nav: 'Эфир', live_msg_placeholder: 'Написать в эфир...',
            live_lang_title: 'Язык эфира', live_auto: 'Авто (Профиль)', live_mic_title: 'Микрофон эфира',
            live_direct: 'Напрямую', live_ai: 'ИИ', live_on: 'МИК ВКЛ', live_ai_on: 'ИИ-ГОЛОС ВКЛ', live_stop: 'СТОП',
            live_cc_wait: 'Оригиналы речи и сообщений...', live_wait_trans: 'Здесь появятся переводы...',
            live_badge: 'LIVE', live_voice_text: 'Текст голосом', live_cam_off: 'Камера выключена'
        },
        kk: {
            live_nav: 'Тікелей', live_msg_placeholder: 'Эфирге жазу...',
            live_lang_title: 'Эфир тілі', live_auto: 'Авто (Профиль)', live_mic_title: 'Эфир микрофоны',
            live_direct: 'Тікелей', live_ai: 'AI', live_on: 'МИК ҚОСУЛЫ', live_ai_on: 'AI ДАУЫС ҚОСУЛЫ', live_stop: 'ТОҚТА',
            live_cc_wait: 'Түпнұсқа сөздер мен хабарламалар...', live_wait_trans: 'Аудармалар осында...',
            live_badge: 'LIVE', live_voice_text: 'Дауыстық мәтін', live_cam_off: 'Камера өшірулі'
        },
        az: {
            live_nav: 'Canlı', live_msg_placeholder: 'Efirə yaz...',
            live_lang_title: 'Efir Dili', live_auto: 'Avto (Profil)', live_mic_title: 'Efir Mikrofonu',
            live_direct: 'Birbaşa', live_ai: 'AI', live_on: 'MİK AÇIQ', live_ai_on: 'AI SƏS AÇIQ', live_stop: 'DAYAN',
            live_cc_wait: 'Orijinal nitq və mesajlar...', live_wait_trans: 'Tərcümələr burada...',
            live_badge: 'LIVE', live_voice_text: 'Səsli Mətn', live_cam_off: 'Kamera bağlıdır'
        },
        tr: {
            live_nav: 'Canlı', live_msg_placeholder: 'Yayına yaz...',
            live_lang_title: 'Yayın Dili', live_auto: 'Oto (Profil)', live_mic_title: 'Yayın Mikrofonu',
            live_direct: 'Doğrudan', live_ai: 'AI', live_on: 'MİK AÇIK', live_ai_on: 'AI SES AÇIK', live_stop: 'DUR',
            live_cc_wait: 'Orijinal konuşma ve mesajlar...', live_wait_trans: 'Çeviriler burada...',
            live_badge: 'LIVE', live_voice_text: 'Sesli Metin', live_cam_off: 'Kamera Kapalı'
        },
        de: {
            live_nav: 'Live', live_msg_placeholder: 'In den Live-Stream...',
            live_lang_title: 'Live-Sprache', live_auto: 'Auto (Profil)', live_mic_title: 'Live-Mikrofon',
            live_direct: 'Direkt', live_ai: 'KI', live_on: 'MIK AN', live_ai_on: 'KI-STIMME AN', live_stop: 'STOPP',
            live_cc_wait: 'Originale...', live_wait_trans: 'Übersetzungen erscheinen hier...',
            live_badge: 'LIVE', live_voice_text: 'Sprachtext', live_cam_off: 'Kamera aus'
        },
        ar: {
            live_nav: 'مباشر', live_msg_placeholder: 'اكتب في البث...',
            live_lang_title: 'لغة البث', live_auto: 'تلقائي (الملف)', live_mic_title: 'ميكروفون البث',
            live_direct: 'مباشر', live_ai: 'AI', live_on: 'تشغيل', live_ai_on: 'صوت AI', live_stop: 'إيقاف',
            live_cc_wait: 'الرسائل الأصلية...', live_wait_trans: 'ستظهر الترجمات هنا...',
            live_badge: 'LIVE', live_voice_text: 'نص صوتي', live_cam_off: 'الكاميرا مغلقة'
        },
        it: {
            live_nav: 'Diretta', live_msg_placeholder: 'Scrivi in diretta...',
            live_lang_title: 'Lingua Diretta', live_auto: 'Auto (Profilo)', live_mic_title: 'Microfono Diretta',
            live_direct: 'Diretto', live_ai: 'IA', live_on: 'MIC ON', live_ai_on: 'IA VOCE ON', live_stop: 'STOP',
            live_cc_wait: 'Messaggi originali...', live_wait_trans: 'Le traduzioni appariranno qui...',
            live_badge: 'LIVE', live_voice_text: 'Testo Vocale', live_cam_off: 'Fotocamera spenta'
        },
        es: {
            live_nav: 'En Vivo', live_msg_placeholder: 'Escribir en vivo...',
            live_lang_title: 'Idioma en Vivo', live_auto: 'Auto (Perfil)', live_mic_title: 'Micrófono en Vivo',
            live_direct: 'Directo', live_ai: 'IA', live_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR',
            live_cc_wait: 'Mensajes originales...', live_wait_trans: 'Las traducciones aparecerán aquí...',
            live_badge: 'LIVE', live_voice_text: 'Texto a Voz', live_cam_off: 'Cámara apagada'
        },
        fr: {
            live_nav: 'Direct', live_msg_placeholder: 'Écrire dans le direct...',
            live_lang_title: 'Langue du Direct', live_auto: 'Auto (Profil)', live_mic_title: 'Micro Direct',
            live_direct: 'Direct', live_ai: 'IA', live_on: 'MIC ON', live_ai_on: 'VOIX IA ON', live_stop: 'STOP',
            live_cc_wait: 'Messages originaux...', live_wait_trans: 'Les traductions apparaîtront ici...',
            live_badge: 'LIVE', live_voice_text: 'Texte vocal', live_cam_off: 'Caméra coupée'
        },
        pt: {
            live_nav: 'Ao Vivo', live_msg_placeholder: 'Escrever na live...',
            live_lang_title: 'Idioma da Live', live_auto: 'Auto (Perfil)', live_mic_title: 'Microfone Live',
            live_direct: 'Direto', live_ai: 'IA', live_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR',
            live_cc_wait: 'Mensagens originais...', live_wait_trans: 'As traduções aparecerão aqui...',
            live_badge: 'LIVE', live_voice_text: 'Texto de Voz', live_cam_off: 'Câmera desligada'
        },
        ja: {
            live_nav: 'ライブ', live_msg_placeholder: 'ライブに送信...',
            live_lang_title: 'ライブ言語', live_auto: '自動 (プロフィール)', live_mic_title: 'ライブマイク',
            live_direct: '直接', live_ai: 'AI', live_on: 'マイクON', live_ai_on: 'AI音声ON', live_stop: '停止',
            live_cc_wait: 'オリジナル音声・メッセージ...', live_wait_trans: '翻訳がここに表示されます...',
            live_badge: 'LIVE', live_voice_text: '音声テキスト', live_cam_off: 'カメラオフ'
        },
        zh: {
            live_nav: '直播', live_msg_placeholder: '发送消息到直播...',
            live_lang_title: '直播语言', live_auto: '自动 (个人资料)', live_mic_title: '直播麦克风',
            live_direct: '直接', live_ai: 'AI', live_on: '麦克风开', live_ai_on: 'AI语音开', live_stop: '停止',
            live_cc_wait: '实时原文...', live_wait_trans: '翻译将显示在此处...',
            live_badge: 'LIVE', live_voice_text: '语音文本', live_cam_off: '摄像头已关'
        }
    };

    const LIVE_TAB_INDEX = 8;
    const MAX_VIDEO_SLOTS = 6;
    const LIVE_SILENCE_FLUSH_MS = 850;
    const LIVE_MAX_CHUNK_WORDS = 14;
    const LIVE_MAX_CHUNK_CHARS = 95;
    const LIVE_ECHO_COOLDOWN_MS = 650;

    const LV = {
        isActive: false,
        isJoining: false,
        isLeaving: false,
        isStartingAgora: false,
        isTogglingCam: false,
        camEnabled: false, // При входе камера ВСЕГДА выключена
        facingMode: 'user',
        marqueeEnabled: true,
        agoraPausedForTranslation: false,
        activeChannel: 'avatar', // 'avatar' | 'mic'

        // Открытая комната (ID владельца комнаты)
        currentRoomOwnerId: null,
        allActiveRooms: {},   // live_world/rooms -> кто где в эфире с камерой
        roomCameras: {},      // live_world/rooms/<ownerId>/cameras
        roomMembersCount: 0,
        liveLangs: {},

        // Agora
        client: null,
        myAgoraUid: null,
        localAudioTrack: null,
        localVideoTrack: null,
        remoteAudioTracks: {},
        remoteVideoTracks: {},
        subscribing: new Set(),

        // Firebase
        roomsListBound: false,
        myCamRef: null,
        myMemberRef: null,
        roomCamsRef: null,
        roomCamsListener: null,
        roomMembersRef: null,
        roomMembersListener: null,
        langsRef: null,
        langsListener: null,
        msgRef: null,
        msgListener: null,
        listenerStartedAt: 0,
        serverOffset: 0,
        offsetSynced: false,
        seenKeys: new Set(),

        // Медленные бегущие строки
        ccQueue: [],
        ccRunning: false,
        ccAnim: null,
        frameQueue: [],
        frameRunning: false,
        frameAnim: null,

        // Микрофон (прототип conference.js)
        recognition: null,
        micActive: false,
        micMode: 'ai-audio',
        isSpeakingAI: false,
        micRestartTimer: null,
        micWatchdog: null,
        silenceTimer: null,
        pendingInterim: '',
        lastSentNorm: '',
        lastSentAt: 0,
        recentBuckets: { send: [], tts: [] },

        // TTS + анти-эхо
        ttsQueue: [],
        ttsSpeaking: false,
        ttsSafetyTimer: null,
        ttsCooldownTimer: null,
        ttsUnlocked: false,
        recentSpoken: [],
        translateCache: new Map(),

        lastUiLang: ''
    };

    window.HF_LIVE_ROOM = LV;
    window.liveRoomMicActive = false;

    localStorage.removeItem('hf_live_avatar_lang');
    localStorage.removeItem('hf_live_mic_lang');

    // =======================================================
    // 1. ХЕЛПЕРЫ ЯЗЫКА, i18n И ПРОФИЛЬ
    // =======================================================
    function lvEscapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function lvNormCompare(str) {
        return String(str || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function lvNormLang(code) {
        if (!code || code === 'auto' || code === 'un') return null;
        const raw = String(code).trim().toLowerCase();
        if (!raw || raw === 'auto' || raw === 'un') return null;
        const c = raw.split(/[-_]/)[0].substring(0, 2);
        const fix = {
            kz: 'kk', cn: 'zh', jp: 'ja',
            ae: 'ar', sa: 'ar', eg: 'ar',
            us: 'en', gb: 'en', uk: 'en',
            br: 'pt', mx: 'es'
        };
        return fix[c] || c;
    }

    function lvIsRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function lvLangFromEmoji(flag) {
        if (!flag) return null;
        const map = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return map[String(flag).trim()] || null;
    }

    function lvLangFromPhone(phone) {
        if (!phone) return null;
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return null;
        const prefixes = [
            ['994', 'az'], ['971', 'ar'], ['966', 'ar'], ['351', 'pt'],
            ['77', 'kk'], ['76', 'kk'], ['90', 'tr'], ['49', 'de'],
            ['44', 'en'], ['39', 'it'], ['34', 'es'], ['33', 'fr'],
            ['81', 'ja'], ['86', 'zh'], ['55', 'pt'], ['20', 'ar'],
            ['7', 'ru'], ['1', 'en']
        ];
        for (const [pref, lang] of prefixes) {
            if (digits.startsWith(pref)) return lang;
        }
        return null;
    }

    function getMyId() {
        const id = window.myProfileInfo && window.myProfileInfo.id;
        return (id && id !== 'guest') ? String(id) : '';
    }

    function isLiveVisible() {
        const page = document.getElementById('live-room-page');
        return Boolean(page && page.classList.contains('active'));
    }

    function getLiveNativeLang(userObj) {
        if (!userObj) return 'en';
        const byEmoji = lvLangFromEmoji(userObj.flag);
        if (byEmoji) return byEmoji;
        const byFlagCode = lvNormLang(userObj.flagCode);
        if (byFlagCode) return byFlagCode;
        const byPhone = lvLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
        if (byPhone) return byPhone;
        const byCode = lvNormLang(userObj.langCode || userObj.lang);
        if (byCode) return byCode;
        return 'en';
    }

    function getLiveNativeFlag(userObj) {
        if (userObj && lvIsRealFlag(userObj.flag)) return String(userObj.flag).trim();
        const lang = getLiveNativeLang(userObj);
        return (LIVE_LANG_MAP[lang] && LIVE_LANG_MAP[lang].flag) ? LIVE_LANG_MAP[lang].flag : '🇬🇧';
    }

    function getUiLangCode() {
        const saved = localStorage.getItem('hf_app_lang');
        let raw = (saved && saved !== 'auto') ? saved : (window.appLang || getLiveNativeLang(window.myProfileInfo) || navigator.language || 'en');
        const norm = lvNormLang(raw) || 'en';
        return LIVE_I18N_BUNDLE[norm] ? norm : 'en';
    }

    function lt(key) {
        const l = getUiLangCode();
        if (window.i18n && window.i18n[l] && window.i18n[l][key]) return window.i18n[l][key];
        return (LIVE_I18N_BUNDLE[l] && LIVE_I18N_BUNDLE[l][key]) || LIVE_I18N_BUNDLE.en[key] || key;
    }

    function mergeLiveIntoGlobalI18n() {
        if (!window.i18n) return false;
        Object.keys(LIVE_I18N_BUNDLE).forEach(code => {
            if (!window.i18n[code]) window.i18n[code] = {};
            Object.assign(window.i18n[code], LIVE_I18N_BUNDLE[code]);
        });
        if (window.i18n.kk && !window.i18n.kz) window.i18n.kz = window.i18n.kk;
        return true;
    }

    function getMyManualLiveLang(channel) {
        const key = (channel === 'mic') ? 'hf_live_mic_lang' : 'hf_live_avatar_lang';
        return lvNormLang(localStorage.getItem(key));
    }

    function getMyEffectiveLiveInfo(channel) {
        const ch = (channel === 'mic' || channel === 'avatar') ? channel : LV.activeChannel;
        const manual = getMyManualLiveLang(ch);
        const lang = (manual && LIVE_LANG_MAP[manual]) ? manual : getLiveNativeLang(window.myProfileInfo);
        const flag = (manual && LIVE_LANG_MAP[manual]) ? LIVE_LANG_MAP[manual].flag : getLiveNativeFlag(window.myProfileInfo);
        const flagCode = (manual && LIVE_LANG_MAP[manual])
            ? LIVE_LANG_MAP[manual].flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode)
                ? String(window.myProfileInfo.flagCode).trim().toLowerCase()
                : ((LIVE_LANG_MAP[lang] && LIVE_LANG_MAP[lang].flagCode) || 'un'));
        return { lang, flag, flagCode, isAuto: !manual };
    }

    // Тап по флагу -> информация о стране (как в Сообществах)
    function openLiveCountryInfo(flagCode, flagEmoji, userName) {
        const fc = String(flagCode || 'un').toLowerCase();
        if (typeof window.showCountryInfo === 'function') {
            window.showCountryInfo(fc);
            return;
        }
        if (typeof window.openCountryInfo === 'function') {
            window.openCountryInfo(fc);
            return;
        }
        if (typeof window.openCountryModal === 'function') {
            window.openCountryModal(fc);
            return;
        }
        const info = (window.countryData && window.countryData[fc]) || null;
        if (typeof window.showToast === 'function') {
            const title = info ? `${flagEmoji || ''} ${info.name || fc.toUpperCase()}` : `${flagEmoji || '🌐'} ${fc.toUpperCase()}`;
            const details = info
                ? [info.capital ? `🏛 ${info.capital}` : '', info.pop ? `👥 ${info.pop}` : '', info.desc || ''].filter(Boolean).join('<br>')
                : (userName || '');
            window.showToast(title, details, '', info && info.phone ? info.phone : '');
        }
    }

    function isLiveDuplicate(text, bucket) {
        const norm = lvNormCompare(text);
        if (!norm) return true;
        const now = Date.now();
        const win = norm.length > 10 ? 6500 : 2500;
        const list = (LV.recentBuckets[bucket] || []).filter(x => (now - x.ts) < 7000);
        const dup = list.some(x =>
            (x.norm === norm && (now - x.ts) < win) ||
            (norm.length >= 8 && (now - x.ts) < 3500 && x.norm.includes(norm))
        );
        if (dup) {
            LV.recentBuckets[bucket] = list;
            return true;
        }
        list.push({ norm, ts: now });
        LV.recentBuckets[bucket] = list;
        return false;
    }

    async function lvTranslateText(text, targetLang, sourceLang = 'auto') {
        const clean = String(text || '').trim();
        const tl = lvNormLang(targetLang);
        const sl = (sourceLang && sourceLang !== 'auto') ? (lvNormLang(sourceLang) || 'auto') : 'auto';
        if (!clean || !tl) return clean;
        if (sl !== 'auto' && sl === tl) return clean;

        const cacheKey = `${sl}|${tl}|${clean.toLowerCase()}`;
        if (LV.translateCache.has(cacheKey)) return LV.translateCache.get(cacheKey);

        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeoutId = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('').trim();
                if (joined) {
                    if (LV.translateCache.size > 150) LV.translateCache.clear();
                    LV.translateCache.set(cacheKey, joined);
                    return joined;
                }
            }
        } catch (e) {
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
        return clean;
    }

    // =======================================================
    // 2. СИНХРОНИЗАЦИЯ ФЛАГОВ ЭФИРА
    // =======================================================
    function syncMyLiveChannelLang(channel, forcedLang, makeActive = true) {
        const myId = getMyId();
        if (channel !== 'avatar' && channel !== 'mic') return;

        if (forcedLang !== undefined) {
            const key = (channel === 'mic') ? 'hf_live_mic_lang' : 'hf_live_avatar_lang';
            const clean = lvNormLang(forcedLang);
            if (!clean) localStorage.removeItem(key);
            else localStorage.setItem(key, clean);
        }

        const info = getMyEffectiveLiveInfo(channel);
        if (makeActive) LV.activeChannel = channel;

        renderLiveGrid();
        syncLiveRemoteAudioVolume();

        if (!myId || typeof firebase === 'undefined' || !firebase.database) return;

        const payload = {
            langCode: info.lang,
            flagCode: info.flagCode,
            flag: info.flag,
            isAuto: info.isAuto,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const ref = firebase.database().ref(`live_world/active_langs/${myId}`);
        if (!LV.liveLangs[myId]) LV.liveLangs[myId] = {};
        LV.liveLangs[myId][channel] = payload;
        ref.child(channel).set(payload).catch(() => {});
        if (makeActive) {
            const disp = Object.assign({ channel }, payload);
            LV.liveLangs[myId].display = disp;
            ref.child('display').set(disp).catch(() => {});
            if (LV.camEnabled && LV.myCamRef) {
                LV.myCamRef.update({
                    langCode: info.lang,
                    flagCode: info.flagCode,
                    flag: info.flag
                }).catch(() => {});
            }
        }
        try { ref.onDisconnect().remove(); } catch (e) {}
    }

    // =======================================================
    // 3. СТИЛИ
    // =======================================================
    function injectLiveStyles() {
        document.getElementById('hf-live-styles')?.remove();
        document.getElementById('hf-lv-v3-styles')?.remove();
        if (document.getElementById('hf-lv-v4-styles')) return;

        const style = document.createElement('style');
        style.id = 'hf-lv-v4-styles';
        style.textContent = `
            #hf-lv-mode-bar {
                display: inline-flex; align-items: center; gap: 3px;
                background: #0b141a; border: 1px solid #2a3942;
                border-radius: 999px; padding: 2px; flex-shrink: 0;
            }
            .hf-lv-mode-btn {
                border: none; background: transparent; color: #8696a0;
                border-radius: 999px; padding: 5px 9px; font-size: 0.7rem;
                font-weight: 800; cursor: pointer; display: inline-flex;
                align-items: center; gap: 4px; white-space: nowrap; transition: 0.18s;
            }
            .hf-lv-mode-btn.active-direct { background: #00a884; color: #111b21; }
            .hf-lv-mode-btn.active-ai { background: linear-gradient(135deg, #00a884, #00e5b0); color: #111b21; }

            #hf-lv-mic-pill {
                display: flex; align-items: center; gap: 6px; flex: 1 1 auto; min-width: 0;
                background: #202c33; border: 1px solid #2a3942; border-radius: 999px;
                padding: 4px 8px; color: #e9edef; font-size: 0.74rem; font-weight: 700;
                overflow: hidden; transition: 0.2s;
            }
            #hf-lv-mic-pill.live-text { border-color: #ef4444; box-shadow: 0 0 12px rgba(239,68,68,0.35); }
            #hf-lv-mic-pill.live-ai { border-color: #00e5b0; box-shadow: 0 0 12px rgba(0,229,176,0.35); }
            #hf-lv-mic-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex-shrink: 0; animation: hfLvPulse 1.1s infinite; }
            #hf-lv-mic-pill.live-ai #hf-lv-mic-dot { background: #00e5b0; }
            #hf-lv-mic-label { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; display: block; color: #e9edef; }
            #hf-lv-stop-btn {
                display: none; flex-shrink: 0; background: #ef4444; color: #fff;
                border: none; border-radius: 999px; padding: 2px 8px; font-size: 0.66rem;
                font-weight: 800; cursor: pointer;
            }
            #hf-lv-mic-pill.live-text #hf-lv-stop-btn,
            #hf-lv-mic-pill.live-ai #hf-lv-stop-btn { display: inline-block; }
            .hf-lv-mic-btn-live { background: #dc2626 !important; color: #fff !important; border-color: #ef4444 !important; }

            #live-cc-viewport {
                flex: 1; overflow: hidden; white-space: nowrap; position: relative;
                height: 20px; display: flex; align-items: center;
            }
            #live-cc-track {
                display: inline-block; white-space: nowrap; will-change: transform;
                font-size: 0.78rem; color: #00a884; font-weight: 700;
            }

            /* Динамическая сетка видеофреймов (1..6) */
            #live-grid {
                display: grid; gap: 6px; width: 100%; height: 100%;
                min-height: 0; grid-auto-rows: 1fr;
            }
            #live-grid.cols-1 { grid-template-columns: 1fr; }
            #live-grid.cols-2 { grid-template-columns: 1fr 1fr; }

            .lv-tile {
                position: relative; border-radius: 14px; overflow: hidden;
                background: #111b21; border: 1.5px solid #202c33;
                min-height: 0; display: flex; flex-direction: column;
            }
            .lv-tile.is-me { border-color: #00a884; cursor: pointer; }
            .lv-tile video {
                position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
            }
            .lv-tile video.mirror-video { transform: scaleX(-1); }

            /* Бегущая строка переводов внутри твоего фрейма */
            #live-frame-bar {
                position: absolute; left: 0; right: 0; bottom: 0; z-index: 25;
                background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 32%, rgba(0,0,0,0.94) 100%);
                padding: 12px 8px 7px 8px; display: flex; align-items: center; gap: 6px;
                border-top: 1px solid rgba(255,255,255,0.08); transition: opacity 0.25s;
            }
            #live-frame-viewport {
                flex: 1; overflow: hidden; white-space: nowrap; position: relative;
                height: 22px; display: flex; align-items: center;
            }
            #live-frame-track {
                display: inline-block; white-space: nowrap; will-change: transform;
                font-size: 0.84rem; font-weight: 800; color: #facc15;
                text-shadow: 0 1px 4px rgba(0,0,0,0.95);
            }

            #hf-lv-avatar-modal, #hf-lv-mic-popup {
                position: absolute; z-index: 9995; display: none;
                background: #111b21; border: 1.5px solid #00a884; border-radius: 16px;
                box-shadow: 0 12px 34px rgba(0,0,0,0.85); color: #e9edef; padding: 12px;
                max-width: calc(100% - 20px); box-sizing: border-box;
            }
            #hf-lv-avatar-modal.active, #hf-lv-mic-popup.active { display: block; }
            #hf-lv-avatar-modal { top: 56px; right: 10px; width: 245px; max-height: calc(100% - 130px); overflow-y: auto; }
            #hf-lv-mic-popup { bottom: 64px; right: 10px; width: 240px; }
            .hf-lv-lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
            .hf-lv-lang-btn {
                background: #202c33; border: 1px solid #2a3942; color: #e9edef;
                border-radius: 10px; padding: 7px 8px; font-size: 0.76rem; font-weight: 600;
                text-align: left; cursor: pointer; display: flex; align-items: center; gap: 6px;
            }
            .hf-lv-lang-btn.selected { background: #00a884; color: #111b21; border-color: #00e5b0; font-weight: 800; }

            @keyframes hfLvPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    // =======================================================
    // 4. МЕДЛЕННЫЕ ОЧЕРЕДИ БЕГУЩИХ СТРОК
    // =======================================================
    function resetLiveTicker(kind) {
        if (kind === 'cc') {
            LV.ccQueue = [];
            LV.ccRunning = false;
            if (LV.ccAnim) { try { LV.ccAnim.cancel(); } catch (e) {} LV.ccAnim = null; }
            const tr = document.getElementById('live-cc-track');
            if (tr) { tr.style.transform = 'translateX(0)'; tr.textContent = lt('live_cc_wait'); }
        } else {
            LV.frameQueue = [];
            LV.frameRunning = false;
            if (LV.frameAnim) { try { LV.frameAnim.cancel(); } catch (e) {} LV.frameAnim = null; }
            const tr = document.getElementById('live-frame-track');
            const qBadge = document.getElementById('live-q-badge');
            if (qBadge) qBadge.classList.add('hidden');
            if (tr) { tr.style.transform = 'translateX(0)'; tr.textContent = lt('live_wait_trans'); }
        }
    }

    function updateLiveQueueBadge() {
        const badge = document.getElementById('live-q-badge');
        if (!badge) return;
        const left = LV.frameQueue.length;
        if (left > 0) {
            badge.textContent = `+${left}`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    function enqueueLiveCcOriginal(flag, name, text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        LV.ccQueue.push({ flag: flag || '🌐', name: name || 'User', text: clean });
        if (LV.ccQueue.length > 25) LV.ccQueue.shift();
        if (!LV.ccRunning) runNextLiveCc();
    }

    function runNextLiveCc() {
        const vp = document.getElementById('live-cc-viewport');
        const tr = document.getElementById('live-cc-track');
        if (!vp || !tr || !LV.ccQueue.length) { LV.ccRunning = false; return; }
        LV.ccRunning = true;
        const item = LV.ccQueue.shift();
        tr.innerHTML = `<span class="text-[#00a884] mr-1.5">${lvEscapeHtml(item.flag)} ${lvEscapeHtml(item.name)}:</span><span class="text-white">${lvEscapeHtml(item.text)}</span>`;

        const vpW = vp.clientWidth || 260;
        const trW = tr.scrollWidth || 160;
        const durationMs = Math.max(5500, Math.min(24000, Math.round(((vpW + trW) / 56) * 1000)));

        if (LV.ccAnim) { try { LV.ccAnim.cancel(); } catch (e) {} }
        if (typeof tr.animate === 'function') {
            LV.ccAnim = tr.animate(
                [{ transform: `translateX(${vpW}px)` }, { transform: `translateX(-${trW + 24}px)` }],
                { duration: durationMs, easing: 'linear', fill: 'forwards' }
            );
            LV.ccAnim.onfinish = () => {
                LV.ccAnim = null;
                if (LV.ccQueue.length > 0) runNextLiveCc();
                else { LV.ccRunning = false; tr.style.transform = 'translateX(0)'; }
            };
        } else {
            setTimeout(() => { LV.ccRunning = false; runNextLiveCc(); }, 5000);
        }
    }

    function enqueueLiveFrameTranslation(flag, name, text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        LV.frameQueue.push({ flag: flag || '🌐', name: name || 'User', text: clean });
        if (LV.frameQueue.length > 30) LV.frameQueue.shift();
        updateLiveQueueBadge();
        if (!LV.frameRunning) runNextLiveFrame();
    }

    function runNextLiveFrame() {
        const vp = document.getElementById('live-frame-viewport');
        const tr = document.getElementById('live-frame-track');
        if (!vp || !tr || !LV.frameQueue.length) {
            LV.frameRunning = false;
            updateLiveQueueBadge();
            return;
        }
        LV.frameRunning = true;
        const item = LV.frameQueue.shift();
        updateLiveQueueBadge();

        tr.innerHTML = `<span class="text-white mr-1.5">${lvEscapeHtml(item.flag)} ${lvEscapeHtml(item.name)}:</span><span class="text-yellow-300">${lvEscapeHtml(item.text)}</span>`;

        const vpW = vp.clientWidth || 240;
        const trW = tr.scrollWidth || 180;
        const durationMs = Math.max(6800, Math.min(30000, Math.round(((vpW + trW) / 46) * 1000)));

        if (LV.frameAnim) { try { LV.frameAnim.cancel(); } catch (e) {} }
        if (typeof tr.animate === 'function') {
            LV.frameAnim = tr.animate(
                [{ transform: `translateX(${vpW}px)` }, { transform: `translateX(-${trW + 28}px)` }],
                { duration: durationMs, easing: 'linear', fill: 'forwards' }
            );
            LV.frameAnim.onfinish = () => {
                LV.frameAnim = null;
                if (LV.frameQueue.length > 0) runNextLiveFrame();
                else { LV.frameRunning = false; tr.style.transform = 'translateX(0)'; }
            };
        } else {
            setTimeout(() => { LV.frameRunning = false; runNextLiveFrame(); }, 6000);
        }
    }

    window.toggleLiveMarquee = function () {
        LV.marqueeEnabled = !LV.marqueeEnabled;
        const ccBar = document.getElementById('live-cc-bar-wrap');
        const frBar = document.getElementById('live-frame-bar');
        if (ccBar) ccBar.style.opacity = LV.marqueeEnabled ? '1' : '0';
        if (frBar) frBar.style.opacity = LV.marqueeEnabled ? '1' : '0';
    };

    // =======================================================
    // 5. МОНТИРОВАНИЕ ЭКРАНА #live-room-page
    // =======================================================
    function closeAllLivePopups() {
        document.getElementById('hf-lv-avatar-modal')?.classList.remove('active');
        document.getElementById('hf-lv-mic-popup')?.classList.remove('active');
    }

    function ensureLivePageMounted() {
        injectLiveStyles();
        let page = document.getElementById('live-room-page');
        if (page) return page;

        const mainEl = document.querySelector('main') || document.getElementById('conference')?.parentElement;
        if (!mainEl) return null;

        page = document.createElement('div');
        page.id = 'live-room-page';
        page.className = 'page-content h-full flex flex-col bg-[#0b141a] relative z-10';

        const myInfo = getMyEffectiveLiveInfo('avatar');

        page.innerHTML = `
            <!-- 1. ПАНЕЛЬ РЕЖИМОВ (ПРОТОТИП conference.js) -->
            <div class="flex items-center justify-between gap-2 px-2.5 py-2 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <div id="hf-lv-mic-pill">
                    <span id="hf-lv-mic-dot"></span>
                    <span id="hf-lv-mic-label">${myInfo.flag} ${lvEscapeHtml(lt('live_direct'))}</span>
                    <span id="live-viewers-chip" class="text-[0.66rem] text-[#8696a0] font-bold shrink-0 ml-1">👁 0</span>
                    <button type="button" id="hf-lv-stop-btn">${lvEscapeHtml(lt('live_stop'))}</button>
                </div>
                <div id="hf-lv-mode-bar">
                    <button type="button" id="hf-lv-btn-direct" class="hf-lv-mode-btn active-direct">
                        <i class="fa-solid fa-phone-volume"></i>
                        <span id="hf-lv-lbl-direct">${lvEscapeHtml(lt('live_direct'))}</span>
                    </button>
                    <button type="button" id="hf-lv-btn-ai" class="hf-lv-mode-btn">
                        <i class="fa-solid fa-robot"></i>
                        <span id="hf-lv-lbl-ai">${lvEscapeHtml(lt('live_ai'))}</span>
                    </button>
                </div>
            </div>

            <!-- 2. ВЕРХНЯЯ БЕГУЩАЯ СТРОКА CC (ОРИГИНАЛЫ ВСЕХ УЧАСТНИКОВ) -->
            <div id="live-cc-bar-wrap" class="chat-info-marquee-container bg-[#111b21] border-b border-[#202c33] shrink-0 transition-opacity duration-300">
                <button type="button" onclick="window.toggleLiveMarquee()" class="text-[#00a884] hover:text-white transition px-1 shrink-0 z-10" title="CC">
                    <i class="fa-solid fa-closed-captioning text-xl"></i>
                </button>
                <div id="live-cc-viewport">
                    <div id="live-cc-track">${lvEscapeHtml(lt('live_cc_wait'))}</div>
                </div>
            </div>

            <!-- 3. БОКОВАЯ ПАНЕЛЬ КОМНАТ + ДИНАМИЧЕСКАЯ СЕТКА ВИДЕО -->
            <div class="flex flex-1 min-h-0 overflow-hidden w-full bg-[#0b141a]">
                <div class="chat-sidebar" id="live-sidebar"></div>
                <div class="flex-1 flex flex-col min-w-0 min-h-0 p-2 relative overflow-hidden">
                    <div id="live-grid" class="cols-1"></div>
                </div>
            </div>

            <!-- 4. РОДНОЙ РЯД КНОПОК (#conference + КРАСНАЯ КНОПКА ОТБОЯ) -->
            <div class="flex justify-center items-center gap-6 py-2.5 bg-[#111b21] border-t border-[#202c33] shrink-0">
                <button type="button" onclick="window.toggleLiveMarquee()" class="w-[44px] h-[44px] rounded-full bg-[#202c33] text-[#00a884] flex justify-center items-center text-xl hover:text-white hover:bg-gray-700 transition" title="Toggle CC">
                    <i class="fa-solid fa-closed-captioning"></i>
                </button>
                <button type="button" id="live-cam-btn" onclick="window.toggleLiveCamera()" class="w-[44px] h-[44px] rounded-full bg-[#202c33] text-[#8696a0] flex justify-center items-center text-xl hover:bg-[#2a3942] transition" title="Camera">
                    <i class="fa-solid fa-video-slash"></i>
                </button>
                <button type="button" id="live-flip-btn" onclick="window.flipLiveCamera()" class="hidden w-[44px] h-[44px] rounded-full bg-[#202c33] text-white flex justify-center items-center text-xl hover:bg-[#2a3942] transition" title="Switch Camera">
                    <i class="fa-solid fa-camera-rotate"></i>
                </button>
                <button type="button" id="live-hangup-btn" onclick="window.leaveLiveRoom(false)" class="w-[44px] h-[44px] rounded-full bg-red-500 text-white flex justify-center items-center text-xl shadow-lg hover:bg-red-600 transition" title="End Live">
                    <i class="fa-solid fa-phone-slash"></i>
                </button>
            </div>

            <!-- 5. РОДНАЯ СТРОКА ВВОДА (СКРЕПКА, СМАЙЛ, РОДНАЯ КОРЗИНА, МИКРОФОН, ОТПРАВКА) -->
            <div class="chat-input-area border-t border-[#202c33] shrink-0 px-2 gap-1.5 bg-[#111b21]">
                <button type="button" class="text-[#8696a0] hover:text-[#00a884] transition text-xl px-1" onclick="window.openAttachModal()">
                    <i class="fa-solid fa-paperclip"></i>
                </button>
                <div class="flex-grow bg-[#202c33] rounded-full flex items-center px-3 py-1.5 border border-[#2a3942]">
                    <i class="fa-regular fa-face-smile text-[#8696a0] text-[1.2rem] cursor-pointer hover:text-white mr-2" onclick="window.toggleEmojiPicker('live-chat-input'); event.stopPropagation();"></i>
                    <input type="text" id="live-chat-input" data-i18n-placeholder="live_msg_placeholder" placeholder="${lvEscapeHtml(lt('live_msg_placeholder'))}" class="bg-transparent border-none text-white w-full outline-none text-[0.95rem]">
                    <i class="fa-solid fa-trash text-[#8696a0] text-[1rem] cursor-pointer hover:text-red-500 ml-2" onclick="window.openTrashModal()" title="Manage Chat"></i>
                </div>
                <button type="button" id="live-mic-btn" class="w-[40px] h-[40px] rounded-full bg-[#202c33] text-[#8696a0] border border-[#2a3942] flex justify-center items-center text-[1.1rem] shrink-0 transition">
                    <i class="fa-solid fa-microphone"></i>
                </button>
                <button type="button" id="live-send-btn" class="w-[40px] h-[40px] rounded-full bg-[#00a884] text-[#111b21] flex justify-center items-center text-[1.1rem] shrink-0 hover:scale-95 transition">
                    <i class="fa-solid fa-paper-plane ml-[-2px]"></i>
                </button>
            </div>
        `;

        mainEl.appendChild(page);
        bindLivePageEvents(page);
        return page;
    }

    function bindLivePageEvents(page) {
        page.querySelector('#hf-lv-btn-direct')?.addEventListener('click', (e) => {
            e.stopPropagation();
            unlockLiveTTSOnGesture();
            window.switchLiveToDirect();
        });
        page.querySelector('#hf-lv-btn-ai')?.addEventListener('click', (e) => {
            e.stopPropagation();
            unlockLiveTTSOnGesture();
            window.switchLiveToAI();
        });
        page.querySelector('#hf-lv-stop-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.stopLiveRoomMic(false);
        });
        page.querySelector('#live-mic-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openLiveMicMenu();
        });
        page.querySelector('#live-send-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.sendLiveRoomMsg();
        });
        page.querySelector('#live-chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendLiveRoomMsg();
            }
        });
    }

    function refreshLiveUITexts() {
        const lblD = document.getElementById('hf-lv-lbl-direct');
        const lblA = document.getElementById('hf-lv-lbl-ai');
        const stopB = document.getElementById('hf-lv-stop-btn');
        const inp = document.getElementById('live-chat-input');
        if (lblD) lblD.textContent = lt('live_direct');
        if (lblA) lblA.textContent = lt('live_ai');
        if (stopB) stopB.textContent = lt('live_stop');
        if (inp) inp.placeholder = lt('live_msg_placeholder');
        updateLiveMicPill(LV.pendingInterim);
        updateLiveCamButtons();
    }

    function updateLiveCamButtons() {
        const camBtn = document.getElementById('live-cam-btn');
        const flipBtn = document.getElementById('live-flip-btn');
        if (camBtn) {
            camBtn.className = LV.camEnabled
                ? 'w-[44px] h-[44px] rounded-full bg-[#00a884] text-[#111b21] flex justify-center items-center text-xl shadow-lg transition'
                : 'w-[44px] h-[44px] rounded-full bg-[#202c33] text-[#8696a0] flex justify-center items-center text-xl hover:bg-[#2a3942] transition';
            camBtn.innerHTML = LV.camEnabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
        }
        if (flipBtn) {
            flipBtn.classList.toggle('hidden', !LV.camEnabled);
        }
    }

    function updateLiveModeBarUI() {
        const btnDirect = document.getElementById('hf-lv-btn-direct');
        const btnAi = document.getElementById('hf-lv-btn-ai');
        if (!btnDirect || !btnAi) return;
        btnDirect.classList.toggle('active-direct', !LV.micActive);
        btnAi.classList.toggle('active-ai', LV.micActive && LV.micMode === 'ai-audio');
    }

    function updateLiveMicPill(preview = '') {
        const pill = document.getElementById('hf-lv-mic-pill');
        const label = document.getElementById('hf-lv-mic-label');
        const micBtn = document.getElementById('live-mic-btn');
        if (!pill) return;

        if (!LV.micActive) {
            pill.classList.remove('live-text', 'live-ai');
            const info = getMyEffectiveLiveInfo('avatar');
            if (label) label.textContent = `${info.flag} ${lt('live_direct')}`;
            if (micBtn) micBtn.classList.remove('hf-lv-mic-btn-live');
            updateLiveModeBarUI();
            return;
        }

        const micInfo = getMyEffectiveLiveInfo('mic');
        const isAi = LV.micMode === 'ai-audio';
        pill.classList.toggle('live-ai', isAi);
        pill.classList.toggle('live-text', !isAi);

        if (label) {
            const idle = isAi ? lt('live_ai_on') : lt('live_on');
            label.textContent = preview ? `${micInfo.flag} ${preview}` : `${micInfo.flag} ${idle}`;
            label.scrollLeft = label.scrollWidth;
        }
        if (micBtn) micBtn.classList.add('hf-lv-mic-btn-live');
        updateLiveModeBarUI();
    }

    // Ручная панель смены языка (открывается тапом по видеофрейму, НЕ по флагу)
    function openLiveAvatarLangPanel() {
        const existing = document.getElementById('hf-lv-avatar-modal');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllLivePopups();
        if (wasOpen) return;

        const host = document.getElementById('live-room-page') || document.body;
        let modal = existing;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hf-lv-avatar-modal';
            modal.addEventListener('click', (e) => e.stopPropagation());
            host.appendChild(modal);
        }

        const profileFlag = getLiveNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualLiveLang('avatar');

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;">🌐 ${lvEscapeHtml(lt('live_lang_title'))}</span>
                <button type="button" id="hf-lv-avatar-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <button type="button" data-lang="auto" class="hf-lv-lang-btn ${!currentPref ? 'selected' : ''}" style="width:100%;justify-content:center;">
                ${profileFlag} ${lvEscapeHtml(lt('live_auto'))}
            </button>
            <div class="hf-lv-lang-grid">
        `;
        Object.keys(LIVE_LANG_MAP).forEach(code => {
            const item = LIVE_LANG_MAP[code];
            html += `<button type="button" data-lang="${code}" class="hf-lv-lang-btn ${currentPref === code ? 'selected' : ''}">${item.flag} ${item.name}</button>`;
        });
        html += `</div>`;
        modal.innerHTML = html;

        modal.querySelector('#hf-lv-avatar-close').onclick = () => modal.classList.remove('active');
        modal.querySelectorAll('.hf-lv-lang-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const chosen = btn.getAttribute('data-lang');
                syncMyLiveChannelLang('avatar', chosen === 'auto' ? null : chosen, true);
                updateLiveMicPill(LV.pendingInterim);
                modal.classList.remove('active');
            };
        });
        modal.classList.add('active');
    }

    function openLiveMicMenu() {
        const existing = document.getElementById('hf-lv-mic-popup');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllLivePopups();
        if (wasOpen) return;

        const host = document.getElementById('live-room-page') || document.body;
        let popup = existing;
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'hf-lv-mic-popup';
            popup.addEventListener('click', (e) => e.stopPropagation());
            host.appendChild(popup);
        }

        const profileFlag = getLiveNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualLiveLang('mic');

        let optionsHtml = `<option value="auto" ${!currentPref ? 'selected' : ''}>${profileFlag} ${lvEscapeHtml(lt('live_auto'))}</option>`;
        Object.keys(LIVE_LANG_MAP).forEach(code => {
            const item = LIVE_LANG_MAP[code];
            optionsHtml += `<option value="${code}" ${currentPref === code ? 'selected' : ''}>${item.flag} ${item.name}</option>`;
        });

        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;"><i class="fa-solid fa-microphone mr-1"></i> ${lvEscapeHtml(lt('live_mic_title'))}</span>
                <button type="button" id="hf-lv-mic-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <select id="hf-lv-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:8px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-lv-mic-text-btn" style="width:100%;background:#00a884;color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone"></i> ${lvEscapeHtml(lt('live_voice_text'))}
            </button>
        `;

        popup.querySelector('#hf-lv-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-lv-mic-select').onchange = (e) => {
            const val = e.target.value;
            syncMyLiveChannelLang('mic', (!val || val === 'auto') ? null : val, true);
            updateLiveMicPill('');
            if (LV.micActive && !LV.isSpeakingAI) resetLiveRecognitionFresh(80);
        };
        popup.querySelector('#hf-lv-mic-text-btn').onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            unlockLiveTTSOnGesture();
            window.startLiveRoomMic('text');
        };
        popup.classList.add('active');
    }

    // =======================================================
    // 6. БОКОВАЯ ПАНЕЛЬ КОМНАТ И ДИНАМИЧЕСКАЯ СЕТКА ВИДЕО (1..6)
    // =======================================================
    function roomHasLiveCameras(ownerId) {
        const room = LV.allActiveRooms && LV.allActiveRooms[String(ownerId)];
        return Boolean(room && room.cameras && Object.keys(room.cameras).length > 0);
    }

    function renderLiveSidebar() {
        const sb = document.getElementById('live-sidebar');
        if (!sb) return;

        const myId = getMyId() || 'guest';
        const myName = (window.myUsername || 'Me').split(' ')[0];
        const myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=Me';
        const myFlag = getLiveNativeFlag(window.myProfileInfo);
        const myRoomLive = roomHasLiveCameras(myId) || (LV.camEnabled && String(LV.currentRoomOwnerId) === myId);
        const mySel = String(LV.currentRoomOwnerId) === myId;

        let html = `
            <div class="chat-contact ${mySel ? 'active-room' : ''}" onclick="window.selectLiveRoom('${lvEscapeHtml(myId)}')">
                <div class="chat-contact-icon" style="background-image:url('${lvEscapeHtml(myPhoto)}'); border-color:${myRoomLive ? '#ef4444' : (mySel ? '#00a884' : 'transparent')};">
                    <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-0.5 leading-none">${lvEscapeHtml(myFlag)}</span>
                    ${myRoomLive ? '<span class="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 py-[1px] rounded bg-red-600 text-[0.5rem] font-extrabold text-white">LIVE</span>' : ''}
                </div>
                <span class="chat-contact-name">${lvEscapeHtml(myName)}</span>
            </div>
        `;

        const others = (window.participants || []).filter(p => p && p.id && p.id !== 'ai' && String(p.id) !== myId);
        others.sort((a, b) => {
            const aLive = roomHasLiveCameras(a.id);
            const bLive = roomHasLiveCameras(b.id);
            if (aLive !== bLive) return aLive ? -1 : 1;
            return 0;
        });

        others.forEach(p => {
            const pid = String(p.id);
            const isLive = roomHasLiveCameras(pid);
            const isSel = String(LV.currentRoomOwnerId) === pid;
            const photo = p.photo || 'https://ui-avatars.com/api/?name=U';
            html += `
                <div class="chat-contact ${isSel ? 'active-room' : ''}" onclick="window.selectLiveRoom('${lvEscapeHtml(pid)}')">
                    <div class="chat-contact-icon" style="background-image:url('${lvEscapeHtml(photo)}'); border-color:${isLive ? '#ef4444' : (isSel ? '#00a884' : 'transparent')}; opacity:${isLive || isSel ? '1' : '0.72'};">
                        <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-0.5 leading-none">${lvEscapeHtml(p.flag || '🌐')}</span>
                        ${isLive ? '<span class="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 py-[1px] rounded bg-red-600 text-[0.5rem] font-extrabold text-white">LIVE</span>' : ''}
                    </div>
                    <span class="chat-contact-name">${lvEscapeHtml((p.name || 'User').split(' ')[0])}</span>
                </div>
            `;
        });

        sb.innerHTML = html;
    }

    function attachTrackToVideoEl(videoEl, track, mirror) {
        if (!videoEl || !track) return;
        try {
            const mediaTrack = track.getMediaStreamTrack();
            if (!mediaTrack) return;
            const cur = (videoEl.srcObject && videoEl.srcObject.getVideoTracks) ? videoEl.srcObject.getVideoTracks()[0] : null;
            if (!cur || cur.id !== mediaTrack.id) {
                videoEl.srcObject = new MediaStream([mediaTrack]);
            }
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.autoplay = true;
            videoEl.classList.remove('hidden');
            videoEl.classList.toggle('mirror-video', Boolean(mirror));
            if (videoEl.paused) videoEl.play().catch(() => {});
        } catch (e) {}
    }

    function renderLiveGrid() {
        const grid = document.getElementById('live-grid');
        if (!grid) return;

        const myId = getMyId() || 'guest';
        const myName = (window.myUsername || 'Me').split(' ')[0];
        const myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || '';
        const myInfo = getMyEffectiveLiveInfo(LV.activeChannel);

        // Собираем список других участников с включённой камерой в текущей комнате (до 5 + я = 6)
        const remoteCams = Object.values(LV.roomCameras || {})
            .filter(c => c && c.userId && String(c.userId) !== myId && c.online)
            .slice(0, MAX_VIDEO_SLOTS - 1);

        const totalTiles = 1 + remoteCams.length;
        grid.className = totalTiles === 1 ? 'cols-1' : 'cols-2';

        // Сохраняем текущее состояние строки переводов, чтобы не сбрасывать её при перерисовке
        const existingBar = document.getElementById('live-frame-bar');

        // 1. Мой фрейм (всегда есть, даже если камера выключена — в нём бежит перевод)
        let myTile = document.getElementById('lv-tile-me');
        if (!myTile) {
            myTile = document.createElement('div');
            myTile.id = 'lv-tile-me';
            myTile.className = 'lv-tile is-me';
            myTile.innerHTML = `
                <video id="lv-video-me" class="hidden" playsinline autoplay muted></video>
                <div id="lv-ph-me" class="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#111b21] z-10">
                    <img id="lv-ph-img-me" src="${lvEscapeHtml(myPhoto)}" class="w-16 h-16 rounded-full object-cover border-2 border-[#00a884] ${myPhoto ? '' : 'hidden'}">
                    <span id="lv-ph-txt-me" class="text-[0.7rem] text-[#8696a0] font-semibold">${lvEscapeHtml(lt('live_cam_off'))}</span>
                </div>
                <div class="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-full">
                    <span id="lv-badge-me" class="hidden px-1 py-[1px] rounded bg-red-600 text-[0.52rem] font-extrabold text-white">${lvEscapeHtml(lt('live_badge'))}</span>
                    <span id="lv-name-me" class="text-[0.7rem] font-bold text-white truncate max-w-[90px]">${lvEscapeHtml(myName)}</span>
                </div>
                <div id="lv-flag-me" class="flag-overlay cursor-pointer z-30" style="top:8px; right:8px;" title="Country Info">
                    <img id="lv-flag-img-me" src="https://flagcdn.com/w40/${myInfo.flagCode}.png" class="w-6 rounded-sm border border-[#2a3942]">
                </div>
            `;
            // Тап по видеофрейму -> панель ручной смены языка
            myTile.addEventListener('click', (e) => {
                e.stopPropagation();
                openLiveAvatarLangPanel();
            });
            // Тап по флагу -> информация о стране (не открывает языковую панель)
            myTile.querySelector('#lv-flag-me').addEventListener('click', (e) => {
                e.stopPropagation();
                const cur = getMyEffectiveLiveInfo(LV.activeChannel);
                openLiveCountryInfo(cur.flagCode, cur.flag, myName);
            });
            grid.appendChild(myTile);
        }

        // Прикрепляем бегущую строку переводов внутрь моего фрейма
        if (!existingBar) {
            const bar = document.createElement('div');
            bar.id = 'live-frame-bar';
            bar.style.opacity = LV.marqueeEnabled ? '1' : '0';
            bar.innerHTML = `
                <span id="live-q-badge" class="hidden px-1.5 py-0.5 rounded-full bg-yellow-400 text-[#111b21] text-[0.6rem] font-extrabold shrink-0"></span>
                <div id="live-frame-viewport">
                    <div id="live-frame-track">${lvEscapeHtml(lt('live_wait_trans'))}</div>
                </div>
            `;
            myTile.appendChild(bar);
        } else if (existingBar.parentElement !== myTile) {
            myTile.appendChild(existingBar);
        }

        // Обновляем мой фрейм (флаг, имя, видео/заглушка)
        const myFlagImg = document.getElementById('lv-flag-img-me');
        if (myFlagImg) myFlagImg.src = `https://flagcdn.com/w40/${myInfo.flagCode}.png`;
        const myBadge = document.getElementById('lv-badge-me');
        if (myBadge) myBadge.classList.toggle('hidden', !LV.camEnabled);
        const myPh = document.getElementById('lv-ph-me');
        const myVid = document.getElementById('lv-video-me');
        if (LV.camEnabled && LV.localVideoTrack) {
            attachTrackToVideoEl(myVid, LV.localVideoTrack, LV.facingMode === 'user');
            if (myPh) myPh.classList.add('hidden');
        } else {
            if (myVid) { myVid.srcObject = null; myVid.classList.add('hidden'); }
            if (myPh) myPh.classList.remove('hidden');
        }

        // 2. Удаляем старые чужие плитки, которых больше нет в roomCameras
        const activeRemoteIds = new Set(remoteCams.map(c => `lv-tile-${c.userId}`));
        Array.from(grid.children).forEach(child => {
            if (child.id !== 'lv-tile-me' && !activeRemoteIds.has(child.id)) {
                child.remove();
            }
        });

        // 3. Добавляем/обновляем плитки участников с включённой камерой
        remoteCams.forEach(c => {
            const tileId = `lv-tile-${c.userId}`;
            let tile = document.getElementById(tileId);
            const uFlagCode = (c.flagCode || 'un').toLowerCase();
            const uName = (c.name || 'User').split(' ')[0];

            if (!tile) {
                tile = document.createElement('div');
                tile.id = tileId;
                tile.className = 'lv-tile';
                tile.innerHTML = `
                    <video id="lv-video-${lvEscapeHtml(c.userId)}" class="hidden" playsinline autoplay muted></video>
                    <div id="lv-ph-${lvEscapeHtml(c.userId)}" class="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] z-10">
                        <img src="${lvEscapeHtml(c.photo || '')}" class="w-14 h-14 rounded-full object-cover border-2 border-[#2a3942] ${c.photo ? '' : 'hidden'}">
                    </div>
                    <div class="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-full">
                        <span class="px-1 py-[1px] rounded bg-red-600 text-[0.52rem] font-extrabold text-white">LIVE</span>
                        <span class="text-[0.7rem] font-bold text-white truncate max-w-[85px]">${lvEscapeHtml(uName)}</span>
                    </div>
                    <div class="flag-overlay cursor-pointer z-30" style="top:8px; right:8px;" data-flag-code="${lvEscapeHtml(uFlagCode)}" data-flag-emoji="${lvEscapeHtml(c.flag || '🌐')}" data-user-name="${lvEscapeHtml(uName)}">
                        <img src="https://flagcdn.com/w40/${lvEscapeHtml(uFlagCode)}.png" class="w-6 rounded-sm border border-[#2a3942]">
                    </div>
                `;
                tile.querySelector('.flag-overlay').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const el = e.currentTarget;
                    openLiveCountryInfo(el.dataset.flagCode, el.dataset.flagEmoji, el.dataset.userName);
                });
                grid.appendChild(tile);
            }

            const aUid = String(c.agoraUid || c.userId);
            const track = LV.remoteVideoTracks[aUid] || LV.remoteVideoTracks[String(c.userId)];
            const vEl = document.getElementById(`lv-video-${c.userId}`);
            const pEl = document.getElementById(`lv-ph-${c.userId}`);
            if (track && vEl) {
                attachTrackToVideoEl(vEl, track, false);
                if (pEl) pEl.classList.add('hidden');
            }
        });
    }

    // =======================================================
    // 7. TTS + АНТИ-ЭХО (ПРОТОТИП conference.js)
    // =======================================================
    function unlockLiveTTSOnGesture() {
        if (LV.ttsUnlocked || typeof window.speechSynthesis === 'undefined') return;
        try {
            window.speechSynthesis.getVoices();
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
            LV.ttsUnlocked = true;
        } catch (e) {}
    }

    function stopLiveTTSQueue() {
        const hadWork = LV.ttsSpeaking || LV.ttsQueue.length > 0;
        LV.ttsQueue = [];
        LV.ttsSpeaking = false;
        clearTimeout(LV.ttsSafetyTimer);
        clearTimeout(LV.ttsCooldownTimer);
        LV.ttsSafetyTimer = LV.ttsCooldownTimer = null;
        if (hadWork || LV.isActive) {
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        }
    }

    function pickBestLiveVoice(speechLocale) {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        if (!voices.length) return null;
        const full = String(speechLocale || 'en-US').toLowerCase();
        const short = full.split('-')[0];
        let match = voices.find(v => (v.lang || '').toLowerCase() === full)
            || voices.find(v => (v.lang || '').toLowerCase().startsWith(short));
        if (!match && short === 'az') match = voices.find(v => (v.lang || '').toLowerCase().startsWith('tr'));
        return match || null;
    }

    function pauseLiveMicForAI() {
        LV.isSpeakingAI = true;
        clearTimeout(LV.micRestartTimer);
        clearTimeout(LV.silenceTimer);
        clearTimeout(LV.ttsCooldownTimer);
        LV.micRestartTimer = LV.silenceTimer = LV.ttsCooldownTimer = null;
        LV.pendingInterim = '';
        if (LV.recognition) {
            try {
                LV.recognition.onresult = LV.recognition.onend = LV.recognition.onerror = null;
                LV.recognition.abort();
            } catch (e) {}
            LV.recognition = null;
        }
        if (LV.micActive) updateLiveMicPill('');
    }

    function resumeLiveMicAfterAI() {
        clearTimeout(LV.ttsCooldownTimer);
        LV.ttsCooldownTimer = setTimeout(() => {
            LV.ttsCooldownTimer = null;
            if (LV.ttsSpeaking || LV.ttsQueue.length > 0) return;
            LV.isSpeakingAI = false;
            if (LV.micActive && LV.isActive) launchLiveRecognition();
        }, LIVE_ECHO_COOLDOWN_MS);
    }

    function recordLiveSpokenText(text) {
        const norm = lvNormCompare(text);
        if (!norm) return;
        const now = Date.now();
        LV.recentSpoken = LV.recentSpoken.filter(item => (now - item.ts) < 7500);
        LV.recentSpoken.push({ norm, words: norm.split(' ').filter(w => w.length >= 2), ts: now });
    }

    function isLiveLikelyEcho(candidateText) {
        const candNorm = lvNormCompare(candidateText);
        if (!candNorm) return true;
        const now = Date.now();
        LV.recentSpoken = LV.recentSpoken.filter(item => (now - item.ts) < 7500);
        if (!LV.recentSpoken.length) return false;
        const candWords = candNorm.split(' ').filter(w => w.length >= 2);
        for (const item of LV.recentSpoken) {
            if (candNorm === item.norm) return true;
            if (candNorm.length >= 4 && (item.norm.includes(candNorm) || candNorm.includes(item.norm))) return true;
            if (candWords.length >= 2 && item.words.length >= 2) {
                const spokenSet = new Set(item.words);
                let hits = 0;
                for (const w of candWords) if (spokenSet.has(w)) hits++;
                if ((hits / candWords.length) >= 0.55) return true;
            }
        }
        return false;
    }

    function processLiveTTSQueue() {
        if (LV.ttsSpeaking || !LV.ttsQueue.length || !LV.isActive) return;
        const item = LV.ttsQueue.shift();
        if (!item || !item.text) return processLiveTTSQueue();

        pauseLiveMicForAI();
        recordLiveSpokenText(item.text);

        if (typeof window.speechSynthesis === 'undefined') {
            resumeLiveMicAfterAI();
            return;
        }

        const normLang = lvNormLang(item.lang) || getLiveNativeLang(window.myProfileInfo);
        let speechLocale = (LIVE_LANG_MAP[normLang] && LIVE_LANG_MAP[normLang].speech) || 'en-US';
        const voice = pickBestLiveVoice(speechLocale);
        if (normLang === 'az' && voice && voice.lang && voice.lang.toLowerCase().startsWith('tr')) {
            speechLocale = 'tr-TR';
        }

        const utt = new SpeechSynthesisUtterance(item.text);
        utt.lang = speechLocale;
        utt.rate = 1.06;
        utt.volume = 1.0;
        if (voice) utt.voice = voice;

        LV.ttsSpeaking = true;
        let finished = false;
        const done = () => {
            if (finished) return;
            finished = true;
            clearTimeout(LV.ttsSafetyTimer);
            LV.ttsSafetyTimer = null;
            LV.ttsSpeaking = false;
            if (LV.ttsQueue.length > 0 && LV.isActive) setTimeout(processLiveTTSQueue, 40);
            else resumeLiveMicAfterAI();
        };

        utt.onend = done;
        utt.onerror = done;
        LV.ttsSafetyTimer = setTimeout(() => {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            done();
        }, Math.min(18000, Math.max(4000, item.text.length * 140)));

        try { window.speechSynthesis.speak(utt); } catch (e) { done(); }
    }

    function enqueueLiveTTS(text, lang) {
        const clean = String(text || '').trim();
        if (!clean || !LV.isActive) return;
        if (isLiveDuplicate(clean, 'tts')) return;
        if (LV.ttsQueue.length >= 3) LV.ttsQueue.shift();
        LV.ttsQueue.push({ text: clean, lang });
        processLiveTTSQueue();
    }

    // =======================================================
    // 8. AGORA: ВИДЕО + АУДИО (ФИЛЬТРАЦИЯ ПО ТЕКУЩЕЙ КОМНАТЕ)
    // =======================================================
    function getRoomAgoraUidSet() {
        const set = new Set();
        Object.values(LV.roomCameras || {}).forEach(c => {
            if (c && c.online) {
                if (c.agoraUid) set.add(String(c.agoraUid));
                if (c.userId) set.add(String(c.userId));
            }
        });
        return set;
    }

    function syncLiveRemoteAudioVolume() {
        const allowedUids = getRoomAgoraUidSet();
        const isAiActive = LV.micActive && LV.micMode === 'ai-audio';
        Object.keys(LV.remoteAudioTracks).forEach(aUid => {
            const tr = LV.remoteAudioTracks[aUid];
            if (!tr) return;
            const inRoom = allowedUids.has(String(aUid));
            if (!inRoom) {
                try { tr.setVolume(0); } catch (e) {}
                return;
            }
            const vol = (!LV.agoraPausedForTranslation && !isAiActive && !LV.isSpeakingAI) ? 100 : 0;
            try { tr.setVolume(vol); } catch (e) {}
        });
    }

    async function pauseLiveAgoraMicForTranslation() {
        LV.agoraPausedForTranslation = true;
        if (LV.localAudioTrack) {
            try { await LV.localAudioTrack.setEnabled(false); }
            catch (e) { try { await LV.localAudioTrack.setMuted(true); } catch (err) {} }
        }
        syncLiveRemoteAudioVolume();
    }

    async function resumeLiveAgoraMicAfterTranslation() {
        LV.agoraPausedForTranslation = false;
        if (LV.localAudioTrack && LV.camEnabled) {
            try { await LV.localAudioTrack.setEnabled(true); }
            catch (e) { try { await LV.localAudioTrack.setMuted(false); } catch (err) {} }
        }
        syncLiveRemoteAudioVolume();
    }

    async function subscribeLiveRemote(user, mediaType) {
        if (!LV.client || !user) return;
        const aUid = String(user.uid);
        const lock = `${aUid}:${mediaType}`;
        if (LV.subscribing.has(lock)) return;
        LV.subscribing.add(lock);
        try {
            await LV.client.subscribe(user, mediaType);
            if (mediaType === 'video' && user.videoTrack) {
                LV.remoteVideoTracks[aUid] = user.videoTrack;
                renderLiveGrid();
            }
            if (mediaType === 'audio' && user.audioTrack) {
                LV.remoteAudioTracks[aUid] = user.audioTrack;
                user.audioTrack.play();
                syncLiveRemoteAudioVolume();
            }
        } catch (e) {
            console.warn('Live subscribe:', lock, e);
        } finally {
            LV.subscribing.delete(lock);
        }
    }

    function trySubscribeRoomUsers() {
        if (!LV.client) return;
        const allowed = getRoomAgoraUidSet();
        (LV.client.remoteUsers || []).forEach(rem => {
            if (allowed.has(String(rem.uid))) {
                if (rem.hasVideo) subscribeLiveRemote(rem, 'video');
                if (rem.hasAudio) subscribeLiveRemote(rem, 'audio');
            }
        });
    }

    async function stopLocalLiveMedia() {
        if (LV.client && (LV.localAudioTrack || LV.localVideoTrack)) {
            const list = [LV.localAudioTrack, LV.localVideoTrack].filter(Boolean);
            try { await LV.client.unpublish(list); } catch (e) {}
        }
        if (LV.localAudioTrack) { try { LV.localAudioTrack.close(); } catch (e) {} LV.localAudioTrack = null; }
        if (LV.localVideoTrack) { try { LV.localVideoTrack.close(); } catch (e) {} LV.localVideoTrack = null; }
        if (LV.myCamRef) { try { await LV.myCamRef.remove(); } catch (e) {} LV.myCamRef = null; }
        LV.camEnabled = false;
        updateLiveCamButtons();
        renderLiveGrid();
    }

    async function startLiveAgora() {
        if (LV.isStartingAgora || LV.isLeaving) return;
        if (typeof AgoraRTC === 'undefined') {
            setTimeout(() => { if (LV.isActive && !LV.isLeaving) startLiveAgora(); }, 1000);
            return;
        }
        if (LV.client && LV.client.connectionState === 'CONNECTED') {
            trySubscribeRoomUsers();
            syncLiveRemoteAudioVolume();
            return;
        }

        LV.isStartingAgora = true;
        try {
            if (LV.client) {
                try { await LV.client.leave(); } catch (e) {}
                LV.client = null;
            }

            LV.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

            LV.client.on('user-published', (user, mediaType) => {
                const allowed = getRoomAgoraUidSet();
                if (allowed.has(String(user.uid))) subscribeLiveRemote(user, mediaType);
            });
            LV.client.on('user-unpublished', (user, mediaType) => {
                const aUid = String(user.uid);
                if (mediaType === 'video') {
                    delete LV.remoteVideoTracks[aUid];
                    renderLiveGrid();
                }
                if (mediaType === 'audio') {
                    if (user.audioTrack) { try { user.audioTrack.stop(); } catch (e) {} }
                    delete LV.remoteAudioTracks[aUid];
                }
            });
            LV.client.on('user-left', (user) => {
                const aUid = String(user.uid);
                delete LV.remoteVideoTracks[aUid];
                delete LV.remoteAudioTracks[aUid];
                renderLiveGrid();
            });

            const appId = window.CALLS_AGORA_APP_ID || (typeof AGORA_APP_ID !== 'undefined' ? AGORA_APP_ID : window.AGORA_APP_ID) || '';
            const token = window.CALLS_AGORA_TEMP_TOKEN || (typeof AGORA_TEMP_TOKEN !== 'undefined' ? AGORA_TEMP_TOKEN : window.AGORA_TEMP_TOKEN) || null;
            const channelName = window.LIVE_AGORA_CHANNEL || window.CALLS_AGORA_CHANNEL || 'hello';
            const myId = getMyId();
            if (!appId) return;

            let joinedUid = null;
            try { joinedUid = await LV.client.join(appId, channelName, token, myId ? `live_${myId}` : null); }
            catch (e1) {
                try { joinedUid = await LV.client.join(appId, channelName, token, myId || null); }
                catch (e2) { joinedUid = await LV.client.join(appId, channelName, token, null); }
            }

            if (!LV.isActive || LV.isLeaving) {
                try { await LV.client.leave(); } catch (e) {}
                LV.client = null;
                return;
            }

            LV.myAgoraUid = String(joinedUid);
            trySubscribeRoomUsers();
        } catch (e) {
            console.warn('Live Agora error:', e);
        } finally {
            LV.isStartingAgora = false;
        }
    }

    function registerMyCameraInRoom() {
        const myId = getMyId();
        const ownerId = LV.currentRoomOwnerId;
        if (!myId || !ownerId || !LV.isActive || typeof firebase === 'undefined' || !firebase.database) return;
        const myInfo = getMyEffectiveLiveInfo(LV.activeChannel);
        LV.myCamRef = firebase.database().ref(`live_world/rooms/${ownerId}/cameras/${myId}`);
        LV.myCamRef.set({
            userId: myId,
            agoraUid: LV.myAgoraUid || myId,
            name: (window.myUsername || 'User').split(' ')[0],
            photo: (window.myProfileInfo && window.myProfileInfo.photo) || '',
            flag: myInfo.flag,
            flagCode: myInfo.flagCode,
            langCode: myInfo.lang,
            online: true,
            startedAt: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
        try { LV.myCamRef.onDisconnect().remove(); } catch (e) {}
    }

    window.toggleLiveCamera = async function () {
        if (LV.isTogglingCam || !LV.isActive) return;
        LV.isTogglingCam = true;
        try {
            if (!LV.camEnabled) {
                if (!LV.client || LV.client.connectionState !== 'CONNECTED') {
                    await startLiveAgora();
                }
                const toPublish = [];
                if (!LV.localAudioTrack) {
                    try {
                        LV.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
                        toPublish.push(LV.localAudioTrack);
                    } catch (e) {}
                }
                if (!LV.localVideoTrack) {
                    LV.localVideoTrack = await AgoraRTC.createCameraVideoTrack({ facingMode: LV.facingMode });
                    toPublish.push(LV.localVideoTrack);
                }
                if (toPublish.length > 0 && LV.client && LV.client.connectionState === 'CONNECTED') {
                    await LV.client.publish(toPublish);
                }
                LV.camEnabled = true;
                registerMyCameraInRoom();
                if (LV.micActive || LV.agoraPausedForTranslation) await pauseLiveAgoraMicForTranslation();
                updateLiveCamButtons();
                renderLiveGrid();
                renderLiveSidebar();
            } else {
                await stopLocalLiveMedia();
                renderLiveSidebar();
            }
        } catch (e) {
            console.warn('Live cam toggle:', e);
        } finally {
            LV.isTogglingCam = false;
        }
    };

    window.flipLiveCamera = async function () {
        if (!LV.camEnabled || LV.isTogglingCam) return;
        LV.isTogglingCam = true;
        LV.facingMode = (LV.facingMode === 'user') ? 'environment' : 'user';
        try {
            if (typeof AgoraRTC !== 'undefined' && LV.client && LV.client.connectionState === 'CONNECTED') {
                const newTrack = await AgoraRTC.createCameraVideoTrack({ facingMode: LV.facingMode });
                if (LV.localVideoTrack) {
                    try { await LV.client.unpublish([LV.localVideoTrack]); } catch (e) {}
                    try { LV.localVideoTrack.close(); } catch (e) {}
                }
                LV.localVideoTrack = newTrack;
                await LV.client.publish([LV.localVideoTrack]);
                renderLiveGrid();
            }
        } catch (e) {
            console.warn('Live flip cam:', e);
        } finally {
            LV.isTogglingCam = false;
        }
    };

    // =======================================================
    // 9. МИКРОФОН ЭФИРА (ПРОТОТИП conference.js)
    // =======================================================
    function dispatchLiveVoicePhrase(text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        const norm = lvNormCompare(clean);
        if (!norm) return;
        const now = Date.now();
        if (norm === LV.lastSentNorm && (now - LV.lastSentAt) < 2200) return;
        if (isLiveLikelyEcho(clean)) return;
        LV.lastSentNorm = norm;
        LV.lastSentAt = now;
        window.sendLiveRoomPayload(clean, LV.micMode === 'ai-audio' ? 'ai-audio' : 'voice');
    }

    function resetLiveRecognitionFresh(delay = 80) {
        clearTimeout(LV.silenceTimer);
        LV.silenceTimer = null;
        LV.pendingInterim = '';
        if (LV.recognition) {
            try {
                LV.recognition.onresult = LV.recognition.onend = LV.recognition.onerror = null;
                LV.recognition.abort();
            } catch (e) {}
            LV.recognition = null;
        }
        if (LV.micActive && !LV.isSpeakingAI && LV.isActive) scheduleLiveRestart(delay);
    }

    function flushLivePendingInterim() {
        clearTimeout(LV.silenceTimer);
        LV.silenceTimer = null;
        const phrase = LV.pendingInterim.trim();
        LV.pendingInterim = '';
        updateLiveMicPill('');
        if (!phrase || LV.isSpeakingAI) return;
        dispatchLiveVoicePhrase(phrase);
        resetLiveRecognitionFresh(80);
    }

    function scheduleLiveRestart(delay = 80) {
        if (!LV.micActive || LV.isSpeakingAI || !LV.isActive) return;
        clearTimeout(LV.micRestartTimer);
        LV.micRestartTimer = setTimeout(() => {
            LV.micRestartTimer = null;
            launchLiveRecognition();
        }, delay);
    }

    function launchLiveRecognition() {
        LV.micRestartTimer = null;
        if (!LV.micActive || !LV.isActive || LV.isSpeakingAI) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (LV.recognition) {
            try {
                LV.recognition.onresult = LV.recognition.onend = LV.recognition.onerror = null;
                LV.recognition.abort();
            } catch (e) {}
            LV.recognition = null;
        }
        LV.pendingInterim = '';

        try {
            const rec = new SpeechRec();
            const activeLang = getMyEffectiveLiveInfo('mic').lang;
            rec.lang = (LIVE_LANG_MAP[activeLang] && LIVE_LANG_MAP[activeLang].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length || LV.isSpeakingAI) return;
                let finalTxt = '';
                let interimTxt = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const ch = (event.results[i][0] && event.results[i][0].transcript) || '';
                    if (event.results[i].isFinal) finalTxt += ' ' + ch;
                    else interimTxt += ' ' + ch;
                }
                finalTxt = finalTxt.trim();
                interimTxt = interimTxt.trim();

                if (finalTxt) {
                    clearTimeout(LV.silenceTimer);
                    LV.silenceTimer = null;
                    LV.pendingInterim = '';
                    updateLiveMicPill('');
                    dispatchLiveVoicePhrase(finalTxt);
                    return;
                }
                if (interimTxt) {
                    if (LV.activeChannel !== 'mic' && !isLiveLikelyEcho(interimTxt)) {
                        syncMyLiveChannelLang('mic', undefined, true);
                    }
                    LV.pendingInterim = interimTxt;
                    updateLiveMicPill(interimTxt);

                    const words = interimTxt.split(/\s+/).length;
                    if (words >= LIVE_MAX_CHUNK_WORDS || interimTxt.length >= LIVE_MAX_CHUNK_CHARS) {
                        flushLivePendingInterim();
                        return;
                    }
                    clearTimeout(LV.silenceTimer);
                    LV.silenceTimer = setTimeout(flushLivePendingInterim, activeLang === 'az' ? 1400 : LIVE_SILENCE_FLUSH_MS);
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopLiveRoomMic(false);
                    return;
                }
                if (LV.pendingInterim.trim() && !LV.isSpeakingAI) return flushLivePendingInterim();
                if (LV.micActive && !LV.isSpeakingAI) {
                    LV.recognition = null;
                    scheduleLiveRestart(220);
                }
            };

            rec.onend = () => {
                LV.recognition = null;
                if (LV.pendingInterim.trim() && !LV.isSpeakingAI) {
                    const tail = LV.pendingInterim.trim();
                    LV.pendingInterim = '';
                    clearTimeout(LV.silenceTimer);
                    LV.silenceTimer = null;
                    updateLiveMicPill('');
                    dispatchLiveVoicePhrase(tail);
                }
                if (LV.micActive && !LV.isSpeakingAI) {
                    updateLiveMicPill('');
                    scheduleLiveRestart(80);
                }
            };

            LV.recognition = rec;
            rec.start();
        } catch (e) {
            LV.recognition = null;
            if (LV.micActive && !LV.isSpeakingAI) scheduleLiveRestart(300);
        }
    }

    window.startLiveRoomMic = async function (mode = 'ai-audio') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;
        unlockLiveTTSOnGesture();
        if (!LV.isActive) await window.enterLiveRoom();

        LV.micMode = (mode === 'text' || mode === 'voice') ? 'text' : 'ai-audio';
        syncMyLiveChannelLang('mic', undefined, true);

        if (LV.micActive) {
            updateLiveMicPill('');
            syncLiveRemoteAudioVolume();
            return;
        }

        LV.micActive = true;
        LV.isSpeakingAI = false;
        window.liveRoomMicActive = true;
        updateLiveMicPill('');

        await pauseLiveAgoraMicForTranslation();
        await new Promise(r => setTimeout(r, 260));
        if (!LV.micActive) return;

        launchLiveRecognition();
        clearInterval(LV.micWatchdog);
        LV.micWatchdog = setInterval(() => {
            if (LV.micActive && !LV.isSpeakingAI && !LV.recognition && !LV.micRestartTimer) {
                launchLiveRecognition();
            }
        }, 2000);
    };

    window.stopLiveRoomMic = async function (skipResumeAgora = false) {
        LV.micActive = false;
        window.liveRoomMicActive = false;
        clearTimeout(LV.micRestartTimer);
        clearTimeout(LV.silenceTimer);
        clearInterval(LV.micWatchdog);
        LV.micRestartTimer = LV.silenceTimer = LV.micWatchdog = null;
        LV.pendingInterim = '';

        if (LV.recognition) {
            try {
                LV.recognition.onresult = LV.recognition.onend = LV.recognition.onerror = null;
                LV.recognition.stop();
            } catch (e) {}
            LV.recognition = null;
        }

        if (!LV.isLeaving) syncMyLiveChannelLang('avatar', undefined, true);
        updateLiveMicPill('');

        if (skipResumeAgora) LV.agoraPausedForTranslation = false;
        else await resumeLiveAgoraMicAfterTranslation();
    };

    window.switchLiveToDirect = async function () {
        stopLiveTTSQueue();
        LV.isSpeakingAI = false;
        await window.stopLiveRoomMic(false);
        updateLiveModeBarUI();
    };

    window.switchLiveToAI = async function () {
        unlockLiveTTSOnGesture();
        await window.startLiveRoomMic('ai-audio');
        updateLiveModeBarUI();
    };

    // =======================================================
    // 10. ВХОД, ПЕРЕКЛЮЧЕНИЕ КОМНАТ, СООБЩЕНИЯ И ПЕРЕВОД
    // =======================================================
    function detachLiveRoomListeners() {
        if (LV.msgRef && LV.msgListener) { LV.msgRef.off('child_added', LV.msgListener); LV.msgListener = null; }
        if (LV.roomCamsRef && LV.roomCamsListener) { LV.roomCamsRef.off('value', LV.roomCamsListener); LV.roomCamsListener = null; }
        if (LV.roomMembersRef && LV.roomMembersListener) { LV.roomMembersRef.off('value', LV.roomMembersListener); LV.roomMembersListener = null; }
        if (LV.myMemberRef) { LV.myMemberRef.remove().catch(() => {}); LV.myMemberRef = null; }
    }

    window.selectLiveRoom = async function (ownerId) {
        if (!ownerId) return;
        const myId = getMyId() || 'guest';
        const targetId = String(ownerId);

        detachLiveRoomListeners();
        if (LV.camEnabled) await stopLocalLiveMedia();

        LV.currentRoomOwnerId = targetId;
        LV.roomCameras = {};
        LV.roomMembersCount = 0;
        LV.seenKeys.clear();

        resetLiveTicker('cc');
        resetLiveTicker('frame');
        renderLiveSidebar();
        renderLiveGrid();

        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();

            if (myId !== 'guest') {
                LV.myMemberRef = db.ref(`live_world/rooms/${targetId}/members/${myId}`);
                LV.myMemberRef.set({ joinedAt: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
                try { LV.myMemberRef.onDisconnect().remove(); } catch (e) {}
            }

            LV.roomMembersRef = db.ref(`live_world/rooms/${targetId}/members`);
            LV.roomMembersListener = LV.roomMembersRef.on('value', (snap) => {
                const val = snap.val();
                LV.roomMembersCount = val ? Object.keys(val).length : 0;
                const vChip = document.getElementById('live-viewers-chip');
                if (vChip) vChip.textContent = `👁 ${LV.roomMembersCount}`;
            });

            LV.roomCamsRef = db.ref(`live_world/rooms/${targetId}/cameras`);
            LV.roomCamsListener = LV.roomCamsRef.on('value', (snap) => {
                LV.roomCameras = snap.val() || {};
                renderLiveGrid();
                trySubscribeRoomUsers();
                syncLiveRemoteAudioVolume();
            });

            LV.listenerStartedAt = Date.now() + (LV.serverOffset || 0);
            LV.msgRef = db.ref(`live_world/messages/${targetId}`);
            LV.msgListener = LV.msgRef.limitToLast(15).on('child_added', handleIncomingLiveMsg);
        }

        if (LV.isActive) {
            await startLiveAgora();
            trySubscribeRoomUsers();
            syncLiveRemoteAudioVolume();
        }
    };

    window.sendLiveRoomPayload = async function (rawText, sourceType = 'keyboard') {
        const cleanText = String(rawText || '').trim();
        const ownerId = LV.currentRoomOwnerId;
        if (!cleanText || !ownerId || typeof firebase === 'undefined' || !firebase.database) return;

        const isVoice = (sourceType === 'voice' || sourceType === 'ai-audio');
        if (isVoice && isLiveDuplicate(cleanText, 'send')) return;

        const channel = isVoice ? 'mic' : 'avatar';
        syncMyLiveChannelLang(channel, undefined, true);

        const myInfo = getMyEffectiveLiveInfo(channel);
        const safeId = getMyId() || 'guest';
        const safeName = (window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User').split(' ')[0];

        firebase.database().ref(`live_world/messages/${ownerId}`).push({
            userId: safeId,
            sessionId: window.mySessionId || 'sess',
            name: safeName,
            flag: myInfo.flag,
            flagCode: myInfo.flagCode,
            langCode: myInfo.lang,
            originalText: cleanText,
            text: cleanText,
            sourceType: sourceType,
            inputChannel: channel,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
    };

    window.sendLiveRoomMsg = async function () {
        const input = document.getElementById('live-chat-input');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendLiveRoomPayload(raw, 'keyboard');
    };

    async function handleIncomingLiveMsg(snapshot) {
        const data = snapshot.val();
        if (!data || !data.text) return;
        if (LV.seenKeys.has(snapshot.key)) return;
        LV.seenKeys.add(snapshot.key);
        if (LV.seenKeys.size > 150) LV.seenKeys.delete(LV.seenKeys.values().next().value);

        const serverNow = Date.now() + (LV.serverOffset || 0);
        if (data.timestamp) {
            if (LV.listenerStartedAt && data.timestamp < (LV.listenerStartedAt - 4000)) return;
            if ((serverNow - data.timestamp) > 60000) return;
        }

        const myId = getMyId();
        const senderId = String(data.userId || '');
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && senderId === myId);
        const senderName = (data.name || 'User').split(' ')[0];
        const senderLang = lvNormLang(data.langCode) || lvLangFromEmoji(data.flag) || lvNormLang(data.flagCode) || 'en';
        const senderFlag = lvIsRealFlag(data.flag) ? String(data.flag).trim() : ((LIVE_LANG_MAP[senderLang] && LIVE_LANG_MAP[senderLang].flag) || '🌐');
        const originalText = String(data.originalText || data.text || '').trim();
        if (!originalText) return;

        // 1. Верхняя бегущая строка (CC) — оригиналы всех участников комнаты
        enqueueLiveCcOriginal(senderFlag, senderName, originalText);

        // 2. Внутренняя строка твоего фрейма — переводы чужих фраз на твой активный язык
        if (isMe) return;

        const myInfo = getMyEffectiveLiveInfo(LV.activeChannel);
        const translated = (senderLang === myInfo.lang)
            ? originalText
            : await lvTranslateText(originalText, myInfo.lang, senderLang);

        enqueueLiveFrameTranslation(senderFlag, senderName, translated);

        if (data.sourceType === 'ai-audio' && LV.isActive && LV.micActive && LV.micMode === 'ai-audio') {
            enqueueLiveTTS(translated, myInfo.lang);
        }
    }

    window.enterLiveRoom = async function (targetOwnerId) {
        ensureLivePageMounted();
        refreshLiveUITexts();

        const myId = getMyId();
        if (!myId) {
            setTimeout(() => { if (isLiveVisible() && !LV.isLeaving) window.enterLiveRoom(targetOwnerId); }, 700);
            return;
        }
        if (LV.isJoining || LV.isLeaving) return;

        if (window.HF_CONF_ROOM && window.HF_CONF_ROOM.isActive && typeof window.leaveConferenceRoom === 'function') {
            try { await window.leaveConferenceRoom(); } catch (e) {}
        }

        LV.isActive = true;
        LV.isJoining = true;
        LV.camEnabled = false; // При входе камера всегда выключена
        updateLiveCamButtons();

        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                if (!LV.offsetSynced) {
                    LV.offsetSynced = true;
                    firebase.database().ref('.info/serverTimeOffset').on('value', (s) => {
                        LV.serverOffset = s.val() || 0;
                    });
                }
                syncMyLiveChannelLang('avatar', undefined, LV.activeChannel === 'avatar');
                syncMyLiveChannelLang('mic', undefined, LV.activeChannel === 'mic');

                if (!LV.langsListener) {
                    LV.langsRef = firebase.database().ref('live_world/active_langs');
                    LV.langsListener = LV.langsRef.on('value', (snap) => {
                        LV.liveLangs = snap.val() || {};
                    });
                }
            }

            const chosenRoom = targetOwnerId || LV.currentRoomOwnerId || myId;
            await window.selectLiveRoom(chosenRoom);
        } finally {
            LV.isJoining = false;
        }
    };

    window.leaveLiveRoom = async function (silent = false) {
        if (LV.isLeaving) return;
        LV.isLeaving = true;
        LV.isActive = false;
        LV.isJoining = false;
        LV.isStartingAgora = false;

        closeAllLivePopups();

        if (!silent) {
            if (typeof window.switchTab === 'function') window.switchTab(0);
            if (typeof window.openGlobalChat === 'function') {
                try { window.openGlobalChat(); } catch (e) {}
            }
        }

        try {
            stopLiveTTSQueue();
            await window.stopLiveRoomMic(true);
            detachLiveRoomListeners();
            await stopLocalLiveMedia();

            if (LV.client) {
                try { await LV.client.leave(); } catch (e) {}
                LV.client = null;
            }

            LV.myAgoraUid = null;
            LV.currentRoomOwnerId = null;
            LV.roomCameras = {};
            LV.subscribing.clear();
            LV.seenKeys.clear();
            LV.remoteAudioTracks = {};
            LV.remoteVideoTracks = {};
            LV.recentSpoken = [];
            LV.recentBuckets = { send: [], tts: [] };
            LV.camEnabled = false;
            LV.activeChannel = 'avatar';

            localStorage.removeItem('hf_live_avatar_lang');
            localStorage.removeItem('hf_live_mic_lang');

            const myId = getMyId();
            if (myId && typeof firebase !== 'undefined' && firebase.database) {
                firebase.database().ref(`live_world/active_langs/${myId}`).remove().catch(() => {});
            }
            if (LV.langsRef && LV.langsListener) {
                LV.langsRef.off('value', LV.langsListener);
                LV.langsListener = null;
            }

            resetLiveTicker('cc');
            resetLiveTicker('frame');
            updateLiveMicPill('');
            updateLiveModeBarUI();
        } finally {
            LV.isLeaving = false;
        }
    };

    // =======================================================
    // 11. ПРИВЯЗКА НИЖНЕЙ ВИДЕОКНОПКИ И switchTab(8)
    // =======================================================
    function bindBottomLiveButton() {
        const navWrap = document.querySelector('.bottom-nav-container .nav-links-wrapper');
        if (!navWrap) return;

        let liveBtn = document.getElementById('nav-live-btn');
        if (!liveBtn) {
            const links = Array.from(navWrap.querySelectorAll('.nav-item'));
            liveBtn = links.find(a => a.querySelector('.fa-video')) || links[1] || null;
            if (liveBtn) liveBtn.id = 'nav-live-btn';
        }
        if (!liveBtn) return;

        if (liveBtn.getAttribute('onclick') !== `window.switchTab(${LIVE_TAB_INDEX})`) {
            liveBtn.setAttribute('onclick', `window.switchTab(${LIVE_TAB_INDEX})`);
        }
        const span = liveBtn.querySelector('span');
        if (span && span.getAttribute('data-i18n') !== 'live_nav') {
            span.setAttribute('data-i18n', 'live_nav');
            span.textContent = lt('live_nav');
        }
    }

    function openLiveTabScreen() {
        const page = ensureLivePageMounted();
        if (!page) return;

        const navLinks = Array.from(document.querySelectorAll('.nav-item'));
        const pages = document.querySelectorAll('.page-content');
        const emptyState = document.getElementById('empty-state-screen');

        if (window.currentIndex === LIVE_TAB_INDEX && page.classList.contains('active')) {
            pages.forEach(p => p.classList.remove('active'));
            navLinks.forEach(l => l.classList.remove('active'));
            window.currentIndex = null;
            if (typeof window.closeAllMenus === 'function') window.closeAllMenus();
            document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('active'));
            if (emptyState) emptyState.style.display = 'flex';
            window.leaveLiveRoom(true);
            return;
        }

        if (typeof window.closeAllMenus === 'function') window.closeAllMenus();
        document.querySelectorAll('.app-modal').forEach(m => m.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        if (emptyState) emptyState.style.display = 'none';

        page.classList.add('active');
        const liveBtn = document.getElementById('nav-live-btn') || navLinks[1];
        if (liveBtn) liveBtn.classList.add('active');
        window.currentIndex = LIVE_TAB_INDEX;

        unlockLiveTTSOnGesture();
        window.enterLiveRoom();
    }

    function hookLiveSwitchTab() {
        if (typeof window.switchTab !== 'function') return;
        if (window.switchTab._hfLiveHooked) return;

        const origSwitch = window.switchTab;
        const wrapped = function (index) {
            if (index === LIVE_TAB_INDEX || index === 'live') {
                openLiveTabScreen();
                return;
            }
            const livePage = document.getElementById('live-room-page');
            if (livePage && livePage.classList.contains('active')) {
                livePage.classList.remove('active');
            }
            if (LV.isActive && !LV.isLeaving) {
                window.leaveLiveRoom(true);
            }
            return origSwitch.apply(this, arguments);
        };
        wrapped._hfLiveHooked = true;
        window.switchTab = wrapped;
    }

    function bindFirebaseRoomsList() {
        if (typeof firebase === 'undefined' || !firebase.database) {
            setTimeout(bindFirebaseRoomsList, 600);
            return;
        }
        if (LV.roomsListBound) return;
        LV.roomsListBound = true;

        firebase.database().ref('live_world/rooms').on('value', (snap) => {
            LV.allActiveRooms = snap.val() || {};
            if (isLiveVisible()) renderLiveSidebar();
        });
    }

    window.addEventListener('beforeunload', () => {
        if (LV.myCamRef) try { LV.myCamRef.remove(); } catch (e) {}
        if (LV.myMemberRef) try { LV.myMemberRef.remove(); } catch (e) {}
    });

    function bootLiveRoom() {
        mergeLiveIntoGlobalI18n();
        injectLiveStyles();
        bindBottomLiveButton();
        ensureLivePageMounted();
        hookLiveSwitchTab();
        bindFirebaseRoomsList();

        if (typeof window.applyTranslations === 'function') window.applyTranslations();

        document.addEventListener('click', () => closeAllLivePopups());

        const ecoSelect = document.getElementById('app-lang-select');
        if (ecoSelect && !ecoSelect.dataset.hfLvEcoBound) {
            ecoSelect.dataset.hfLvEcoBound = '1';
            ecoSelect.addEventListener('change', () => {
                setTimeout(() => {
                    mergeLiveIntoGlobalI18n();
                    bindBottomLiveButton();
                    refreshLiveUITexts();
                }, 60);
            });
        }

        LV.lastUiLang = getUiLangCode();
        setInterval(() => {
            mergeLiveIntoGlobalI18n();
            bindBottomLiveButton();
            hookLiveSwitchTab();

            const curLang = getUiLangCode();
            if (curLang !== LV.lastUiLang) {
                LV.lastUiLang = curLang;
                if (typeof window.applyTranslations === 'function') window.applyTranslations();
                refreshLiveUITexts();
            }
            if (isLiveVisible()) renderLiveSidebar();
        }, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootLiveRoom);
    } else {
        bootLiveRoom();
    }
})();
