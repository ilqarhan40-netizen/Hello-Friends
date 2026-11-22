// ==========================================
// ФАЙЛ: js/audio-room.js (ISOLATED AUDIO WORLD v2 — FAST AI ENGINE)
// - Мгновенный цикл: сказал -> ушло (0.85с пауза) -> плашка очистилась
// - Жёсткие рамки плашки + всегда видимая кнопка СТОП/DAYAN
// - Бегущая строка "поездом" (новый перевод сразу за старым)
// - Встроенная очередь ИИ-озвучки без наложений + умный анти-эхо фильтр
// - Полная изоляция от video-room.js и 13 языков экосистемы
// ==========================================

(function () {
    'use strict';

    const AUD_LANG_MAP = {
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

    const AUD_UI_FALLBACK = {
        en: { langTitle: 'Chat Language', autoProfile: 'Auto (Profile)', micTitle: 'Audio Microphone', aiVoice: 'AI Translator (Voice)', voiceToText: 'Voice Text', directMode: 'Direct Voice', aiMode: 'AI Translator', waiting: 'Waiting for voice input...', on: 'MIC ON', aiOn: 'AI VOICE ON', stop: 'STOP', selectContact: 'Select a contact first' },
        ru: { langTitle: 'Язык Чата', autoProfile: 'Авто (Профиль)', micTitle: 'Микрофон Аудио', aiVoice: 'ИИ-переводчик (Голос)', voiceToText: 'Текст голосом', directMode: 'Напрямую', aiMode: 'ИИ-переводчик', waiting: 'Ожидание голоса...', on: 'МИК ВКЛ', aiOn: 'ИИ-ГОЛОС ВКЛ', stop: 'СТОП', selectContact: 'Сначала выберите контакт' },
        az: { langTitle: 'Çat Dili', autoProfile: 'Avto (Profil)', micTitle: 'Audio Mikrofon', aiVoice: 'AI Tərcüməçi (Səs)', voiceToText: 'Səsli Mətn', directMode: 'Birbaşa', aiMode: 'AI Tərcüməçi', waiting: 'Səs gözlənilir...', on: 'MİK AÇIQ', aiOn: 'AI SƏS AÇIQ', stop: 'DAYAN', selectContact: 'Əvvəlcə kontakt seçin' },
        tr: { langTitle: 'Sohbet Dili', autoProfile: 'Oto (Profil)', micTitle: 'Ses Mikrofonu', aiVoice: 'AI Çevirmen (Ses)', voiceToText: 'Sesli Metin', directMode: 'Doğrudan', aiMode: 'AI Çevirmen', waiting: 'Ses girişi bekleniyor...', on: 'MİK AÇIK', aiOn: 'AI SES AÇIK', stop: 'DUR', selectContact: 'Önce bir kişi seçin' },
        de: { langTitle: 'Chat-Sprache', autoProfile: 'Auto (Profil)', micTitle: 'Audio-Mikrofon', aiVoice: 'KI-Übersetzer (Stimme)', voiceToText: 'Sprachtext', directMode: 'Direkt', aiMode: 'KI-Übersetzer', waiting: 'Warten auf Spracheingabe...', on: 'MIK AN', aiOn: 'KI-STIMME AN', stop: 'STOPP', selectContact: 'Bitte zuerst Kontakt wählen' },
        kk: { langTitle: 'Чат тілі', autoProfile: 'Авто (Профиль)', micTitle: 'Аудио микрофон', aiVoice: 'AI аудармашы (Дауыс)', voiceToText: 'Дауыстық мәтін', directMode: 'Тікелей', aiMode: 'AI аудармашы', waiting: 'Дауыс күтілуде...', on: 'МИК ҚОСУЛЫ', aiOn: 'AI ДАУЫС ҚОСУЛЫ', stop: 'ТОҚТА', selectContact: 'Алдымен контакт таңдаңыз' },
        ar: { langTitle: 'لغة الدردشة', autoProfile: 'تلقائي (الملف)', micTitle: 'ميكروفون الصوت', aiVoice: 'مترجم الذكاء الاصطناعي', voiceToText: 'نص صوتي', directMode: 'مباشر', aiMode: 'مترجم AI', waiting: 'في انتظار إدخال الصوت...', on: 'تشغيل', aiOn: 'صوت AI', stop: 'إيقاف', selectContact: 'اختر جهة اتصال أولاً' },
        it: { langTitle: 'Lingua Chat', autoProfile: 'Auto (Profilo)', micTitle: 'Microfono Audio', aiVoice: 'Traduttore IA (Voce)', voiceToText: 'Testo Vocale', directMode: 'Diretto', aiMode: 'Traduttore IA', waiting: 'In attesa di input vocale...', on: 'MIC ON', aiOn: 'IA VOCE ON', stop: 'STOP', selectContact: 'Seleziona prima un contatto' },
        es: { langTitle: 'Idioma del Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Micrófono Audio', aiVoice: 'Traductor IA (Voz)', voiceToText: 'Texto a Voz', directMode: 'Directo', aiMode: 'Traductor IA', waiting: 'Esperando entrada de voz...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR', selectContact: 'Selecciona un contacto primero' },
        fr: { langTitle: 'Langue du Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Micro Audio', aiVoice: 'Traductor IA (Voix)', voiceToText: 'Texte vocal', directMode: 'Direct', aiMode: 'Traducteur IA', waiting: "En attente d'entrée vocale...", on: 'MIC ON', aiOn: 'VOIX IA ON', stop: 'STOP', selectContact: 'Sélectionnez un contact' },
        pt: { langTitle: 'Idioma do Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Microfone Áudio', aiVoice: 'Tradutor IA (Voz)', voiceToText: 'Texto de Voz', directMode: 'Direto', aiMode: 'Tradutor IA', waiting: 'Aguardando entrada de voz...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR', selectContact: 'Selecione um contato primeiro' },
        ja: { langTitle: 'チャット言語', autoProfile: '自動 (プロフィール)', micTitle: '音声マイク', aiVoice: 'AI翻訳 (音声)', voiceToText: '音声テキスト', directMode: '直接通話', aiMode: 'AI翻訳', waiting: '音声入力を待っています...', on: 'マイクON', aiOn: 'AI音声ON', stop: '停止', selectContact: '先に連絡先を選択してください' },
        zh: { langTitle: '聊天语言', autoProfile: '自动 (个人资料)', micTitle: '语音麦克风', aiVoice: 'AI 翻译 (语音)', voiceToText: '语音文本', directMode: '直接通话', aiMode: 'AI 翻译', waiting: '等待语音输入...', on: '麦克风开', aiOn: 'AI语音开', stop: '停止', selectContact: '请先选择联系人' }
    };

    const SILENCE_FLUSH_MS = 850;      // Короткая пауза — сразу отправляем фразу и очищаем плашку
    const MAX_CHUNK_WORDS = 14;        // Авто-отправка длинной непрерывной речи кусками
    const MAX_CHUNK_CHARS = 95;
    const ECHO_COOLDOWN_MS = 650;      // Тишина после голоса робота, чтобы эхо не попало в мик
    const MARQUEE_GAP_PX = 44;         // Отступ между фразами в "поезде" бегущей строки

    const AR = {
        seenKeys: new Set(),
        activeMsgRoom: null,
        activeMsgListener: null,
        activeLangRoom: null,
        activeLangListener: null,
        listenerStartedAt: 0,
        serverOffset: 0,
        offsetSynced: false,
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
        ttsQueue: [],
        ttsSpeaking: false,
        ttsSafetyTimer: null,
        ttsCooldownTimer: null,
        ttsUnlocked: false,
        recentSpoken: [],
        translateCache: new Map(),
        marquee: {
            rafId: null,
            lastTs: 0,
            offsetX: 0,
            speed: 78,
            hasRealContent: false,
            passCount: 0,
            initialized: false
        }
    };

    window.HF_AUDIO_ROOM = AR;
    window.audioLiveLangs = {};
    window.audioLiveLangsLoaded = {};
    window.audioRoomMicActive = false;

    function isAudioMode() {
        return window.currentActiveCallType !== 'video';
    }

    function isAudioRoomVisibleOrInCall() {
        if (!isAudioMode()) return false;
        const host = document.getElementById('voice-translator');
        const visible = Boolean(host && host.classList.contains('active'));
        return window.currentIndex === 1 || visible || Boolean(window.agoraClient) || Boolean(window.voiceFriend);
    }

    function audEscapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeForCompare(str) {
        return String(str || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function audNormLang(code) {
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

    function audIsRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function audLangFromEmoji(flag) {
        if (!flag) return null;
        const map = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return map[String(flag).trim()] || null;
    }

    function audLangFromPhone(phone) {
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

    function getAudioNativeLang(userObj) {
        if (!userObj) return 'en';
        const byEmoji = audLangFromEmoji(userObj.flag);
        if (byEmoji) return byEmoji;
        const byFlagCode = audNormLang(userObj.flagCode);
        if (byFlagCode) return byFlagCode;
        const byPhone = audLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
        if (byPhone) return byPhone;
        const byCode = audNormLang(userObj.langCode || userObj.lang);
        if (byCode) return byCode;
        return 'en';
    }

    function getAudioNativeFlag(userObj) {
        if (userObj && audIsRealFlag(userObj.flag)) return String(userObj.flag).trim();
        const lang = getAudioNativeLang(userObj);
        return (AUD_LANG_MAP[lang] && AUD_LANG_MAP[lang].flag) ? AUD_LANG_MAP[lang].flag : '🇬🇧';
    }

    function getAudioUiLang() {
        const eco = audNormLang(window.appLang);
        if (eco && AUD_UI_FALLBACK[eco]) return eco;
        const savedEco = audNormLang(localStorage.getItem('hf_app_lang'));
        if (savedEco && AUD_UI_FALLBACK[savedEco]) return savedEco;
        const prof = getAudioNativeLang(window.myProfileInfo);
        return AUD_UI_FALLBACK[prof] ? prof : 'en';
    }

    function getAudioUiDict() {
        const lang = getAudioUiLang();
        const fb = AUD_UI_FALLBACK[lang] || AUD_UI_FALLBACK.en;
        const globalDict = (window.i18n && (window.i18n[lang] || window.i18n.en)) || {};
        return {
            langTitle: globalDict.chat_lang || fb.langTitle,
            autoProfile: fb.autoProfile,
            micTitle: fb.micTitle,
            aiVoice: fb.aiVoice,
            voiceToText: globalDict.voice_text || fb.voiceToText,
            directMode: fb.directMode,
            aiMode: fb.aiMode,
            waiting: globalDict.waiting_voice || fb.waiting,
            on: fb.on,
            aiOn: fb.aiOn,
            stop: fb.stop,
            selectContact: fb.selectContact
        };
    }

    function getAudioTargetUser() {
        let base = null;
        if (window.voiceFriend && window.voiceFriend.id) base = window.voiceFriend;
        else if (window.currentTargetUser && window.currentTargetUser.id) base = window.currentTargetUser;
        else if (window.currentCallerFallback && window.currentCallerFallback.id) base = window.currentCallerFallback;
        if (!base) return null;

        const fromList = Array.isArray(window.participants)
            ? window.participants.find(p => String(p.id) === String(base.id))
            : null;
        return Object.assign({}, fromList || {}, base);
    }

    function getAudioRoomId() {
        if (!isAudioMode()) return null;
        const target = getAudioTargetUser();
        if (!target || !target.id || !window.myProfileInfo || !window.myProfileInfo.id) return null;
        const pair = [String(window.myProfileInfo.id), String(target.id)].sort();
        return `${pair[0]}_${pair[1]}`;
    }

    function getAudioChannelStorageKey(roomId, channel) {
        return (channel === 'mic')
            ? ('hf_aud_mic_lang_' + roomId)
            : ('hf_aud_avatar_lang_' + roomId);
    }

    function getMyManualAudioLang(roomId, channel) {
        if (!roomId) return null;
        return audNormLang(localStorage.getItem(getAudioChannelStorageKey(roomId, channel)));
    }

    async function audTranslateText(text, targetLang) {
        const clean = String(text || '').trim();
        const tl = audNormLang(targetLang);
        if (!clean || !tl) return clean;

        const cacheKey = `${tl}|${clean.toLowerCase()}`;
        if (AR.translateCache.has(cacheKey)) {
            return AR.translateCache.get(cacheKey);
        }

        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeoutId = ctrl ? setTimeout(() => ctrl.abort(), 3500) : null;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('').trim();
                if (joined) {
                    if (AR.translateCache.size > 120) AR.translateCache.clear();
                    AR.translateCache.set(cacheKey, joined);
                    return joined;
                }
            }
        } catch (e) {
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
        return clean;
    }

    // ==========================================
    // 0. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ АУДИОКОМНАТЫ (avatar / mic)
    // ==========================================
    window.syncMyAudioChannelLang = function (roomId, channel, forcedLang) {
        if (typeof firebase === 'undefined' || !roomId || !window.myProfileInfo || !window.myProfileInfo.id) return;
        if (channel !== 'avatar' && channel !== 'mic') return;

        const myId = String(window.myProfileInfo.id);
        const activeLang = forcedLang !== undefined
            ? audNormLang(forcedLang)
            : getMyManualAudioLang(roomId, channel);

        const userRef = firebase.database().ref(`audio_active_langs/${roomId}/${myId}`);
        const chRef = userRef.child(channel);

        if (!window.audioLiveLangs[roomId]) window.audioLiveLangs[roomId] = {};
        if (!window.audioLiveLangs[roomId][myId]) window.audioLiveLangs[roomId][myId] = {};

        if (activeLang && AUD_LANG_MAP[activeLang]) {
            const payload = {
                langCode: activeLang,
                flagCode: AUD_LANG_MAP[activeLang].flagCode,
                flag: AUD_LANG_MAP[activeLang].flag,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            window.audioLiveLangs[roomId][myId][channel] = payload;
            chRef.set(payload).catch(() => {});
            try { userRef.onDisconnect().remove(); } catch (e) {}
        } else {
            delete window.audioLiveLangs[roomId][myId][channel];
            chRef.remove().catch(() => {});
        }
    };

    window.initAudioLiveLangSync = function (roomId) {
        const rId = roomId || getAudioRoomId();
        if (!rId || typeof firebase === 'undefined' || !window.myProfileInfo || !window.myProfileInfo.id) return;

        if (AR.activeLangRoom && AR.activeLangRoom !== rId && AR.activeLangListener) {
            firebase.database().ref('audio_active_langs/' + AR.activeLangRoom).off('value', AR.activeLangListener);
            AR.activeLangListener = null;
        }

        if (AR.activeLangRoom !== rId || !AR.activeLangListener) {
            AR.activeLangRoom = rId;
            AR.activeLangListener = firebase.database().ref('audio_active_langs/' + rId).on('value', (snap) => {
                window.audioLiveLangs[rId] = snap.val() || {};
                window.audioLiveLangsLoaded[rId] = true;
                updateAudioRoomFlagsUI();
            });
        }

        window.syncMyAudioChannelLang(rId, 'avatar');
        window.syncMyAudioChannelLang(rId, 'mic');
    };

    async function getTargetLiveAudioChannel(roomId, targetUser, channel) {
        if (!targetUser) {
            return {
                lang: getAudioNativeLang(window.myProfileInfo),
                flag: getAudioNativeFlag(window.myProfileInfo),
                photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
                name: (window.myUsername || 'User').split(' ')[0]
            };
        }

        if (roomId && !window.audioLiveLangsLoaded[roomId] && typeof firebase !== 'undefined') {
            try {
                const snap = await firebase.database().ref('audio_active_langs/' + roomId).once('value');
                window.audioLiveLangs[roomId] = snap.val() || {};
                window.audioLiveLangsLoaded[roomId] = true;
            } catch (e) {}
        }

        const roomMap = window.audioLiveLangs[roomId] || {};
        const targetLiveAll = roomMap[String(targetUser.id)] || null;
        const live = targetLiveAll ? targetLiveAll[channel] : null;

        const targetLang = (live && live.langCode)
            ? audNormLang(live.langCode)
            : getAudioNativeLang(targetUser);
        const targetFlag = (live && audIsRealFlag(live.flag))
            ? live.flag
            : getAudioNativeFlag(targetUser);

        return {
            lang: targetLang || 'en',
            flag: targetFlag,
            photo: targetUser.photo || 'https://ui-avatars.com/api/?name=U',
            name: (targetUser.name || 'User').split(' ')[0]
        };
    }

    function buildAudioMirrorMarquee(senderPhoto, senderFlag, senderName, originalText, receiverPhoto, receiverFlag, receiverName, translatedText, sourceType) {
        let icon = '<i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.65rem]"></i>';
        if (sourceType === 'ai-audio') {
            icon = '<i class="fa-solid fa-robot text-[#00e5b0] mx-2 text-[0.7rem]"></i>';
        } else if (sourceType === 'voice') {
            icon = '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem]"></i>';
        }

        return (
            `<span class="hf-ar-mq-item" data-ar-msg="1">` +
                `<img src="${audEscapeHtml(senderPhoto)}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">` +
                `<span class="text-white font-bold mr-1">${audEscapeHtml(senderName)}:</span>` +
                `<span class="text-[#e9edef] mr-1">${audEscapeHtml(senderFlag)} ${audEscapeHtml(originalText)}</span>` +
                `${icon}` +
                `<img src="${audEscapeHtml(receiverPhoto)}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover">` +
                `<span class="text-white font-bold mr-1">${audEscapeHtml(receiverName)}:</span>` +
                `<span class="text-yellow-400 font-bold">${audEscapeHtml(receiverFlag)} ${audEscapeHtml(translatedText)}</span>` +
            `</span>`
        );
    }

    function updateAudioRoomFlagsUI() {
        if (!isAudioMode()) return;
        const roomId = getAudioRoomId();

        const meFlagEl = document.getElementById('voice-me-flag');
        if (meFlagEl) {
            const myManual = getMyManualAudioLang(roomId, 'avatar');
            const desiredMe = (myManual && AUD_LANG_MAP[myManual])
                ? AUD_LANG_MAP[myManual].flag
                : getAudioNativeFlag(window.myProfileInfo);
            if (meFlagEl.textContent !== desiredMe) meFlagEl.textContent = desiredMe;
        }

        const friendFlagEl = document.getElementById('voice-friend-flag');
        const target = getAudioTargetUser();
        if (friendFlagEl && target) {
            const roomMap = (roomId && window.audioLiveLangs[roomId]) || {};
            const liveAvatar = roomMap[String(target.id)] && roomMap[String(target.id)].avatar;
            const desiredFriend = (liveAvatar && audIsRealFlag(liveAvatar.flag))
                ? liveAvatar.flag
                : getAudioNativeFlag(target);
            if (friendFlagEl.textContent !== desiredFriend) friendFlagEl.textContent = desiredFriend;
        }
    }

    // ==========================================
    // 1. СТИЛИ, ПЛАШКА РЕЖИМА (СТРОГО В РАМКАХ) И МЕНЮ
    // ==========================================
    function getAudioHost() {
        return document.getElementById('voice-translator')
            || document.getElementById('phone-body')
            || document.body;
    }

    function getAudioInput() {
        return document.getElementById('voice-chat-input');
    }

    function getAudioMicBtn() {
        const inp = getAudioInput();
        const bar = inp ? inp.closest('.chat-input-area') : null;
        return bar ? bar.querySelector('button[onclick*="toggleUniversalMic"]') : null;
    }

    function injectStyles() {
        if (document.getElementById('hf-ar-v2-styles')) return;
        const oldStyle = document.getElementById('hf-ar-v1-styles');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'hf-ar-v2-styles';
        style.textContent = `
            #voice-marquee-container-anim {
                position: relative;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
            }
            #voice-info-marquee {
                display: inline-flex !important;
                align-items: center !important;
                white-space: nowrap !important;
                animation: none !important;
                transition: none !important;
                padding-left: 0 !important;
                will-change: transform;
            }
            .hf-ar-mq-item {
                display: inline-flex;
                align-items: center;
                flex-shrink: 0;
            }
            .hf-ar-mq-item + .hf-ar-mq-item {
                margin-left: ${MARQUEE_GAP_PX}px;
            }
            #hf-ar-control-slot {
                width: 100%;
                flex: 1 1 auto;
                min-height: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 8px 12px;
                box-sizing: border-box;
                overflow: hidden;
                z-index: 30;
            }
            #hf-ar-mode-bar {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(17, 27, 33, 0.92);
                border: 1px solid #2a3942;
                border-radius: 999px;
                padding: 4px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
                max-width: 96%;
                box-sizing: border-box;
            }
            .hf-ar-mode-btn {
                border: none;
                background: transparent;
                color: #8696a0;
                border-radius: 999px;
                padding: 8px 14px;
                font-size: 0.78rem;
                font-weight: 700;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                white-space: nowrap;
                transition: all 0.2s ease;
            }
            .hf-ar-mode-btn.active-direct {
                background: #00a884;
                color: #111b21;
                box-shadow: 0 4px 14px rgba(0, 168, 132, 0.4);
            }
            .hf-ar-mode-btn.active-ai {
                background: linear-gradient(135deg, #00a884, #00e5b0);
                color: #111b21;
                box-shadow: 0 4px 18px rgba(0, 229, 176, 0.45);
            }
            #hf-ar-mic-pill {
                display: none;
                align-items: center;
                gap: 8px;
                background: rgba(17, 27, 33, 0.96);
                border: 1.5px solid #ef4444;
                color: #fff;
                padding: 7px 12px;
                border-radius: 999px;
                box-shadow: 0 8px 26px rgba(239, 68, 68, 0.4);
                font-size: 0.78rem;
                font-weight: 700;
                max-width: 94%;
                box-sizing: border-box;
                overflow: hidden;
            }
            #hf-ar-mic-pill.active { display: inline-flex; }
            #hf-ar-mic-pill.ai-mode {
                border-color: #00e5b0;
                box-shadow: 0 8px 26px rgba(0, 229, 176, 0.35);
            }
            #hf-ar-mic-pill .dot {
                width: 9px; height: 9px; border-radius: 50%;
                background: #ef4444; flex-shrink: 0;
                animation: hfArPulse 1s infinite;
            }
            #hf-ar-mic-pill.ai-mode .dot { background: #00e5b0; }
            #hf-ar-mic-label {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                display: block;
            }
            #hf-ar-mic-pill .stop-btn {
                flex-shrink: 0;
                background: #ef4444; color: #fff; border: none;
                border-radius: 999px; padding: 3px 11px;
                font-size: 0.72rem; font-weight: 800; cursor: pointer;
            }
            .hf-ar-mic-live {
                background: #dc2626 !important;
                color: #fff !important;
                border-color: #ef4444 !important;
            }
            #hf-ar-avatar-modal, #hf-ar-mic-popup {
                position: absolute;
                z-index: 9995;
                display: none;
                background: #111b21;
                border: 1.5px solid #00a884;
                border-radius: 16px;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.8);
                color: #e9edef;
                padding: 12px;
                max-width: calc(100% - 20px);
                box-sizing: border-box;
            }
            #hf-ar-avatar-modal.active, #hf-ar-mic-popup.active { display: block; }
            #hf-ar-avatar-modal {
                bottom: 124px;
                right: 10px;
                width: 245px;
                max-height: calc(100% - 140px);
                overflow-y: auto;
            }
            #hf-ar-mic-popup {
                bottom: 64px;
                right: 10px;
                width: 240px;
            }
            .hf-ar-lang-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-top: 8px;
            }
            .hf-ar-lang-btn {
                background: #202c33;
                border: 1px solid #2a3942;
                color: #e9edef;
                border-radius: 10px;
                padding: 7px 8px;
                font-size: 0.76rem;
                font-weight: 600;
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .hf-ar-lang-btn.selected {
                background: #00a884;
                color: #111b21;
                border-color: #00e5b0;
                font-weight: 800;
            }
            @keyframes hfArPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    function closeAllAudioPopups() {
        const a = document.getElementById('hf-ar-avatar-modal');
        const m = document.getElementById('hf-ar-mic-popup');
        if (a) a.classList.remove('active');
        if (m) m.classList.remove('active');
    }

    function ensureAudioControls() {
        injectStyles();
        const d = getAudioUiDict();

        let slot = document.getElementById('hf-ar-control-slot');
        if (!slot) {
            slot = document.createElement('div');
            slot.id = 'hf-ar-control-slot';
            slot.innerHTML = `
                <div id="hf-ar-mode-bar">
                    <button type="button" id="hf-ar-btn-direct" class="hf-ar-mode-btn active-direct">
                        <i class="fa-solid fa-phone-volume"></i>
                        <span id="hf-ar-lbl-direct">${audEscapeHtml(d.directMode)}</span>
                    </button>
                    <button type="button" id="hf-ar-btn-ai" class="hf-ar-mode-btn">
                        <i class="fa-solid fa-robot"></i>
                        <span id="hf-ar-lbl-ai">${audEscapeHtml(d.aiMode)}</span>
                    </button>
                </div>
                <div id="hf-ar-mic-pill">
                    <span class="dot"></span>
                    <span id="hf-ar-mic-label"></span>
                    <button type="button" class="stop-btn" id="hf-ar-stop-btn">${audEscapeHtml(d.stop)}</button>
                </div>
            `;

            slot.querySelector('#hf-ar-btn-direct').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockTTSOnGesture();
                window.switchAudioToDirect();
            });
            slot.querySelector('#hf-ar-btn-ai').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockTTSOnGesture();
                window.switchAudioToAI();
            });
            slot.querySelector('#hf-ar-stop-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.stopAudioRoomMic(false);
            });
        } else {
            const lblDirect = slot.querySelector('#hf-ar-lbl-direct');
            const lblAi = slot.querySelector('#hf-ar-lbl-ai');
            const stopBtn = slot.querySelector('#hf-ar-stop-btn');
            if (lblDirect) lblDirect.textContent = d.directMode;
            if (lblAi) lblAi.textContent = d.aiMode;
            if (stopBtn) stopBtn.textContent = d.stop;
        }

        const remoteVid = document.getElementById('direct-remote-video');
        const friendPhoto = document.getElementById('voice-friend-photo');
        const videoRow = (remoteVid && remoteVid.parentElement) ? remoteVid.parentElement.parentElement : null;
        const footer = friendPhoto ? friendPhoto.closest('.mt-auto') : null;

        if (footer && footer.parentNode) {
            if (slot.parentNode !== footer.parentNode) {
                footer.parentNode.insertBefore(slot, footer);
            }
        } else if (videoRow && videoRow.parentNode) {
            if (slot.parentNode !== videoRow.parentNode) {
                videoRow.parentNode.appendChild(slot);
            }
        } else {
            const host = getAudioHost();
            if (slot.parentNode !== host) host.appendChild(slot);
        }

        slot.style.display = isAudioMode() ? 'flex' : 'none';
        return slot;
    }

    function updateModeBarUI() {
        const slot = ensureAudioControls();
        if (!slot) return;
        slot.style.display = isAudioMode() ? 'flex' : 'none';

        const btnDirect = document.getElementById('hf-ar-btn-direct');
        const btnAi = document.getElementById('hf-ar-btn-ai');
        if (!btnDirect || !btnAi) return;

        // Birbaşa горит только когда микрофон перевода выключен (реально идёт прямой звонок)
        const isDirect = !AR.micActive;
        const isAiActive = AR.micActive && AR.micMode === 'ai-audio';
        btnDirect.classList.toggle('active-direct', isDirect);
        btnAi.classList.toggle('active-ai', isAiActive);
    }

    // МЕНЮ АВАТАРА (КАНАЛ avatar — СТРОГО ДЛЯ АУДИОКОМНАТЫ)
    function openAudioAvatarLangPanel() {
        injectStyles();
        const existing = document.getElementById('hf-ar-avatar-modal');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllAudioPopups();
        if (wasOpen) return;

        const roomId = getAudioRoomId();
        if (roomId) window.initAudioLiveLangSync(roomId);

        const host = getAudioHost();
        let modal = existing;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hf-ar-avatar-modal';
            modal.addEventListener('click', (e) => e.stopPropagation());
        }
        if (modal.parentNode !== host) host.appendChild(modal);

        const d = getAudioUiDict();
        const profileFlag = getAudioNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualAudioLang(roomId, 'avatar');

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;">🌐 ${audEscapeHtml(d.langTitle)}</span>
                <button type="button" id="hf-ar-avatar-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <button type="button" data-lang="auto" class="hf-ar-lang-btn ${!currentPref ? 'selected' : ''}" style="width:100%;justify-content:center;">
                ${profileFlag} ${audEscapeHtml(d.autoProfile)}
            </button>
            <div class="hf-ar-lang-grid">
        `;
        Object.keys(AUD_LANG_MAP).forEach(code => {
            const item = AUD_LANG_MAP[code];
            html += `<button type="button" data-lang="${code}" class="hf-ar-lang-btn ${currentPref === code ? 'selected' : ''}">${item.flag} ${item.name}</button>`;
        });
        html += `</div>`;
        modal.innerHTML = html;

        modal.querySelector('#hf-ar-avatar-close').onclick = () => modal.classList.remove('active');
        modal.querySelectorAll('.hf-ar-lang-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const chosen = btn.getAttribute('data-lang');
                const rId = getAudioRoomId();
                if (rId) {
                    const key = getAudioChannelStorageKey(rId, 'avatar');
                    if (chosen === 'auto') localStorage.removeItem(key);
                    else localStorage.setItem(key, chosen);
                    window.syncMyAudioChannelLang(rId, 'avatar', chosen === 'auto' ? null : chosen);
                }
                updateAudioRoomFlagsUI();
                modal.classList.remove('active');
            };
        });

        modal.classList.add('active');
    }

    // МЕНЮ МИКРОФОНА (КАНАЛ mic — ИИ-ПЕРЕВОДЧИК ГОЛОСОМ + ТЕКСТ ГОЛОСОМ)
    function openAudioMicMenu() {
        injectStyles();
        const existing = document.getElementById('hf-ar-mic-popup');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllAudioPopups();
        if (wasOpen) return;

        const roomId = getAudioRoomId();
        if (roomId) window.initAudioLiveLangSync(roomId);

        const host = getAudioHost();
        let popup = existing;
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'hf-ar-mic-popup';
            popup.addEventListener('click', (e) => e.stopPropagation());
        }
        if (popup.parentNode !== host) host.appendChild(popup);

        const d = getAudioUiDict();
        const profileFlag = getAudioNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualAudioLang(roomId, 'mic');

        let optionsHtml = `<option value="auto" ${!currentPref ? 'selected' : ''}>${profileFlag} ${audEscapeHtml(d.autoProfile)}</option>`;
        Object.keys(AUD_LANG_MAP).forEach(code => {
            const item = AUD_LANG_MAP[code];
            optionsHtml += `<option value="${code}" ${currentPref === code ? 'selected' : ''}>${item.flag} ${item.name}</option>`;
        });

        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;"><i class="fa-solid fa-microphone mr-1"></i> ${audEscapeHtml(d.micTitle)}</span>
                <button type="button" id="hf-ar-mic-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <select id="hf-ar-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:8px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-ar-mic-ai-btn" style="width:100%;background:linear-gradient(135deg,#00a884,#00e5b0);color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:6px;">
                <i class="fa-solid fa-robot"></i> ${audEscapeHtml(d.aiVoice)}
            </button>
            <button type="button" id="hf-ar-mic-text-btn" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone text-[#00a884]"></i> ${audEscapeHtml(d.voiceToText)}
            </button>
        `;

        popup.querySelector('#hf-ar-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-ar-mic-select').onchange = (e) => {
            const val = e.target.value;
            const rId = getAudioRoomId();
            if (rId) {
                const key = getAudioChannelStorageKey(rId, 'mic');
                if (!val || val === 'auto') localStorage.removeItem(key);
                else localStorage.setItem(key, val);
                window.syncMyAudioChannelLang(rId, 'mic', (!val || val === 'auto') ? null : val);
            }
            updateMicPill('');
        };
        popup.querySelector('#hf-ar-mic-ai-btn').onclick = (e) => {
            e.stopPropagation();
            unlockTTSOnGesture();
            popup.classList.remove('active');
            window.startAudioRoomMic('ai-audio');
        };
        popup.querySelector('#hf-ar-mic-text-btn').onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            window.startAudioRoomMic('text');
        };

        popup.classList.add('active');
    }

    // ==========================================
    // 2. БЕГУЩАЯ СТРОКА "ПОЕЗДОМ" (НОВЫЙ ТЕКСТ СРАЗУ ЗА СТАРЫМ)
    // ==========================================
    function getMarqueeNodes() {
        return {
            container: document.getElementById('voice-marquee-container-anim'),
            textEl: document.getElementById('voice-info-marquee')
        };
    }

    function takeMarqueeOwnership() {
        if (window.HF_VIDEO_ROOM && window.HF_VIDEO_ROOM.marquee && window.HF_VIDEO_ROOM.marquee.rafId) {
            cancelAnimationFrame(window.HF_VIDEO_ROOM.marquee.rafId);
            window.HF_VIDEO_ROOM.marquee.rafId = null;
        }
    }

    function marqueeLoop(ts) {
        if (!isAudioMode()) {
            AR.marquee.rafId = null;
            return;
        }
        AR.marquee.rafId = requestAnimationFrame(marqueeLoop);
        if (!AR.marquee.lastTs) { AR.marquee.lastTs = ts; return; }
        const dt = Math.min((ts - AR.marquee.lastTs) / 1000, 0.1);
        AR.marquee.lastTs = ts;

        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;
        const cw = container.clientWidth;
        const tw = textEl.scrollWidth;
        if (cw <= 0 || tw <= 0) return;

        if (!AR.marquee.initialized) {
            AR.marquee.initialized = true;
            AR.marquee.offsetX = cw;
        }

        AR.marquee.offsetX -= AR.marquee.speed * dt;

        // Если в поезде больше 1 фразы и самая старая уже полностью ушла влево — удаляем её без скачка
        const items = textEl.querySelectorAll('.hf-ar-mq-item');
        if (items.length > 1) {
            const first = items[0];
            const removeWidth = first.offsetWidth + MARQUEE_GAP_PX;
            if (AR.marquee.offsetX + removeWidth < -10) {
                first.remove();
                AR.marquee.offsetX += removeWidth;
                AR.marquee.passCount = 0;
            }
        } else if (AR.marquee.offsetX < -(tw + 24)) {
            AR.marquee.passCount += 1;
            AR.marquee.offsetX = cw + 16;
        }

        textEl.style.transform = `translate3d(${AR.marquee.offsetX}px, 0, 0)`;
    }

    function startMarqueeEngine() {
        if (!isAudioMode()) return;
        injectStyles();
        takeMarqueeOwnership();
        if (AR.marquee.rafId) return;
        AR.marquee.lastTs = 0;
        AR.marquee.rafId = requestAnimationFrame(marqueeLoop);
    }

    function pushAudioMarquee(html) {
        if (!html || !isAudioMode()) return;
        startMarqueeEngine();

        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;
        const cw = container.clientWidth || 300;

        // Если на экране заглушка или старая одиночная фраза уже докрутилась хотя бы 1 раз — сразу показываем новую
        const existingItems = textEl.querySelectorAll('.hf-ar-mq-item');
        if (!AR.marquee.hasRealContent || existingItems.length === 0 || (existingItems.length === 1 && AR.marquee.passCount >= 1)) {
            textEl.innerHTML = html;
            AR.marquee.hasRealContent = true;
            AR.marquee.passCount = 0;
            AR.marquee.initialized = true;
            AR.marquee.offsetX = cw + 12;
            textEl.style.transform = `translate3d(${AR.marquee.offsetX}px, 0, 0)`;
            return;
        }

        // Ограничиваем длину поезда (максимум 4 фразы), чтобы не копился хвост
        if (existingItems.length >= 4) {
            const oldest = existingItems[0];
            const shift = oldest.offsetWidth + MARQUEE_GAP_PX;
            oldest.remove();
            AR.marquee.offsetX += shift;
        }

        // Вставляем новую фразу сразу следом за текущей
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newNode = temp.firstElementChild;
        if (newNode) {
            textEl.appendChild(newNode);
        }
    }

    // ==========================================
    // 3. ВСТРОЕННАЯ БЫСТРАЯ ОЧЕРЕДЬ ОЗВУЧКИ + АНТИ-ЭХО
    // ==========================================
    function unlockTTSOnGesture() {
        if (AR.ttsUnlocked || typeof window.speechSynthesis === 'undefined') return;
        try {
            window.speechSynthesis.getVoices();
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
            AR.ttsUnlocked = true;
        } catch (e) {}
    }

    function stopAudioTTSQueue() {
        AR.ttsQueue = [];
        AR.ttsSpeaking = false;
        clearTimeout(AR.ttsSafetyTimer);
        clearTimeout(AR.ttsCooldownTimer);
        AR.ttsSafetyTimer = null;
        AR.ttsCooldownTimer = null;
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        if (typeof window.stopVoiceAI === 'function') {
            try { window.stopVoiceAI(); } catch (e) {}
        }
    }

    function pickBestVoice(speechLocale) {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        if (!voices.length) return null;
        const full = String(speechLocale || 'en-US').toLowerCase();
        const short = full.split('-')[0];
        return voices.find(v => (v.lang || '').toLowerCase() === full)
            || voices.find(v => (v.lang || '').toLowerCase().startsWith(short))
            || null;
    }

    function pauseMicForAI() {
        AR.isSpeakingAI = true;
        clearTimeout(AR.micRestartTimer);
        clearTimeout(AR.silenceTimer);
        clearTimeout(AR.ttsCooldownTimer);
        AR.micRestartTimer = null;
        AR.silenceTimer = null;
        AR.ttsCooldownTimer = null;
        AR.pendingInterim = '';

        if (AR.recognition) {
            try {
                AR.recognition.onresult = null;
                AR.recognition.onend = null;
                AR.recognition.onerror = null;
                AR.recognition.abort();
            } catch (e) {}
            AR.recognition = null;
        }
        if (AR.micActive) updateMicPill('');
    }

    function resumeMicAfterAI() {
        clearTimeout(AR.ttsCooldownTimer);
        AR.ttsCooldownTimer = setTimeout(() => {
            AR.ttsCooldownTimer = null;
            if (AR.ttsSpeaking || AR.ttsQueue.length > 0) return;
            AR.isSpeakingAI = false;
            if (AR.micActive && isAudioMode()) {
                launchRecognition();
            }
        }, ECHO_COOLDOWN_MS);
    }

    function recordSpokenText(text) {
        const norm = normalizeForCompare(text);
        if (!norm) return;
        const now = Date.now();
        AR.recentSpoken = AR.recentSpoken.filter(item => (now - item.ts) < 7500);
        AR.recentSpoken.push({ norm, words: norm.split(' ').filter(w => w.length >= 2), ts: now });
    }

    function isLikelyEcho(candidateText) {
        const candNorm = normalizeForCompare(candidateText);
        if (!candNorm) return true;

        const now = Date.now();
        AR.recentSpoken = AR.recentSpoken.filter(item => (now - item.ts) < 7500);
        if (!AR.recentSpoken.length) return false;

        const candWords = candNorm.split(' ').filter(w => w.length >= 2);
        for (const item of AR.recentSpoken) {
            if (candNorm === item.norm) return true;
            if (candNorm.length >= 4 && (item.norm.includes(candNorm) || candNorm.includes(item.norm))) {
                return true;
            }
            if (candWords.length >= 2 && item.words.length >= 2) {
                const spokenSet = new Set(item.words);
                let hits = 0;
                for (const w of candWords) {
                    if (spokenSet.has(w)) hits++;
                }
                if ((hits / candWords.length) >= 0.55) return true;
            }
        }
        return false;
    }

    function processAudioTTSQueue() {
        if (AR.ttsSpeaking || !AR.ttsQueue.length || !isAudioMode()) return;

        const item = AR.ttsQueue.shift();
        if (!item || !item.text) {
            processAudioTTSQueue();
            return;
        }

        // Заранее ставим распознавание на паузу ДО выхода звука из динамика
        pauseMicForAI();
        recordSpokenText(item.text);

        if (typeof window.speechSynthesis === 'undefined') {
            if (typeof window.playAIVoice === 'function') {
                window.playAIVoice(encodeURIComponent(item.text), item.lang);
            } else {
                resumeMicAfterAI();
            }
            return;
        }

        const normLang = audNormLang(item.lang) || getAudioNativeLang(window.myProfileInfo);
        const speechLocale = (AUD_LANG_MAP[normLang] && AUD_LANG_MAP[normLang].speech) || 'en-US';

        const utt = new SpeechSynthesisUtterance(item.text);
        utt.lang = speechLocale;
        utt.rate = 1.08;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        const voice = pickBestVoice(speechLocale);
        if (voice) utt.voice = voice;

        AR.ttsSpeaking = true;
        let finished = false;

        const done = () => {
            if (finished) return;
            finished = true;
            clearTimeout(AR.ttsSafetyTimer);
            AR.ttsSafetyTimer = null;
            AR.ttsSpeaking = false;

            if (AR.ttsQueue.length > 0 && isAudioMode()) {
                setTimeout(processAudioTTSQueue, 40);
            } else {
                resumeMicAfterAI();
            }
        };

        utt.onend = done;
        utt.onerror = done;

        // Страховка, если Android Chrome «забыл» прислать событие onend
        const maxDuration = Math.min(18000, Math.max(4000, item.text.length * 140));
        AR.ttsSafetyTimer = setTimeout(() => {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            done();
        }, maxDuration);

        try {
            window.speechSynthesis.speak(utt);
        } catch (e) {
            done();
        }
    }

    function enqueueAudioTTS(text, lang) {
        const clean = String(text || '').trim();
        if (!clean || !isAudioMode()) return;

        // Держим максимум 2 фразы в очереди, чтобы голос не отставал от живой речи
        if (AR.ttsQueue.length >= 2) {
            AR.ttsQueue.shift();
        }
        AR.ttsQueue.push({ text: clean, lang });
        processAudioTTSQueue();
    }

    // Совместимость с внешним voice.js
    window.onAIVoiceStart = function () {
        pauseMicForAI();
    };
    window.onAIVoiceEnd = function () {
        if (!AR.ttsSpeaking && AR.ttsQueue.length === 0) {
            resumeMicAfterAI();
        }
    };

    window.resetAudioRoomState = function () {
        stopAudioTTSQueue();
        if (AR.micActive) window.stopAudioRoomMic(true);
        AR.seenKeys.clear();
        AR.recentSpoken = [];
        AR.marquee.hasRealContent = false;
        AR.marquee.passCount = 0;
        AR.isSpeakingAI = false;
        closeAllAudioPopups();

        if (AR.activeMsgRoom && AR.activeMsgListener && typeof firebase !== 'undefined') {
            firebase.database().ref('audio_rooms/' + AR.activeMsgRoom).off('child_added', AR.activeMsgListener);
        }
        if (AR.activeLangRoom && AR.activeLangListener && typeof firebase !== 'undefined') {
            firebase.database().ref('audio_active_langs/' + AR.activeLangRoom).off('value', AR.activeLangListener);
        }
        AR.activeMsgRoom = null;
        AR.activeMsgListener = null;
        AR.activeLangRoom = null;
        AR.activeLangListener = null;

        updateModeBarUI();
        const { textEl } = getMarqueeNodes();
        if (textEl && isAudioMode()) textEl.innerHTML = getAudioUiDict().waiting;
    };

    // ==========================================
    // 4. ОТПРАВКА (КАНАЛ avatar / mic — КЛАВИАТУРА, ГОЛОС-ТЕКСТ И ИИ-ГОЛОС)
    // ==========================================
    window.sendAudioRoomPayload = async function (rawText, sourceType = 'keyboard') {
        if (!isAudioMode()) return;
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;

        window.syncAudioRoomListener();
        const roomId = getAudioRoomId();
        if (!roomId) {
            if (typeof window.showToast === 'function') {
                const d = getAudioUiDict();
                window.showToast('Audio', d.selectContact, '', '');
            }
            return;
        }

        window.initAudioLiveLangSync(roomId);

        const isVoice = (sourceType === 'voice' || sourceType === 'ai-audio');
        const channel = isVoice ? 'mic' : 'avatar';

        const manualLang = getMyManualAudioLang(roomId, channel);
        const myActiveLang = manualLang || getAudioNativeLang(window.myProfileInfo);
        const myFlag = (manualLang && AUD_LANG_MAP[manualLang])
            ? AUD_LANG_MAP[manualLang].flag
            : getAudioNativeFlag(window.myProfileInfo);
        const myFlagCode = (manualLang && AUD_LANG_MAP[manualLang])
            ? AUD_LANG_MAP[manualLang].flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode) || 'un');

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : 'guest';
        const safeName = (window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User').split(' ')[0];
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';

        const targetUser = getAudioTargetUser();
        const targetInfo = await getTargetLiveAudioChannel(roomId, targetUser, channel);

        const myBaseText = isVoice
            ? cleanText
            : await audTranslateText(cleanText, myActiveLang);

        let textToShip = myBaseText;
        if (targetInfo.lang && targetInfo.lang !== myActiveLang) {
            textToShip = await audTranslateText(myBaseText, targetInfo.lang);
        }

        const mirrorMarquee = buildAudioMirrorMarquee(
            safePhoto, myFlag, safeName, myBaseText,
            targetInfo.photo, targetInfo.flag, targetInfo.name, textToShip,
            sourceType
        );

        firebase.database().ref('audio_rooms/' + roomId).push({
            userId: safeId,
            name: safeName,
            photo: safePhoto,
            flag: myFlag,
            flagCode: myFlagCode,
            langCode: myActiveLang,
            targetLang: targetInfo.lang,
            targetFlag: targetInfo.flag,
            targetName: targetInfo.name,
            targetPhoto: targetInfo.photo,
            originalText: myBaseText,
            text: textToShip || myBaseText,
            sourceType: sourceType,
            inputChannel: channel,
            mirrorMarquee: mirrorMarquee,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isAudioRoomMsg: true
        }).catch(() => {});
    };

    window.sendAudioRoomMsg = async function () {
        if (!isAudioMode()) return;
        const input = getAudioInput();
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendAudioRoomPayload(raw, 'keyboard');
    };

    // ==========================================
    // 5. ПРИЁМ: ПОЕЗД БЕГУЩЕЙ СТРОКИ + БЫСТРАЯ ОЗВУЧКА ИИ
    // ==========================================
    function handleIncomingAudioMsg(snapshot) {
        if (!isAudioMode()) return;
        const data = snapshot.val();
        if (!data || !data.isAudioRoomMsg) return;
        if (AR.seenKeys.has(snapshot.key)) return;
        AR.seenKeys.add(snapshot.key);

        const serverNow = Date.now() + (AR.serverOffset || 0);
        if (data.timestamp) {
            if (AR.listenerStartedAt && data.timestamp < (AR.listenerStartedAt - 5000)) return;
            if ((serverNow - data.timestamp) > 60000) return;
        }

        // Гарантируем класс hf-ar-mq-item даже для сообщений от старого клиента
        let marqueeHtml = data.mirrorMarquee || '';
        if (!marqueeHtml || marqueeHtml.indexOf('hf-ar-mq-item') === -1) {
            marqueeHtml = buildAudioMirrorMarquee(
                data.photo || 'https://ui-avatars.com/api/?name=U',
                data.flag || '🌐',
                (data.name || 'User').split(' ')[0],
                data.originalText || data.text || '',
                data.targetPhoto || 'https://ui-avatars.com/api/?name=U',
                data.targetFlag || '🌐',
                (data.targetName || 'User').split(' ')[0],
                data.text || data.originalText || '',
                data.sourceType || 'keyboard'
            );
        }

        pushAudioMarquee(marqueeHtml);

        const myId = (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : '';
        if (data.sourceType === 'ai-audio' && myId && String(data.userId) !== myId && isAudioRoomVisibleOrInCall()) {
            const spokenText = (data.text || data.originalText || '').trim();
            const spokenLang = data.targetLang || getMyManualAudioLang(AR.activeMsgRoom, 'mic') || getAudioNativeLang(window.myProfileInfo);
            if (spokenText) {
                enqueueAudioTTS(spokenText, spokenLang);
            }
        }
    }

    window.syncAudioRoomListener = function () {
        if (!isAudioMode() || typeof firebase === 'undefined' || !firebase.database) return;

        if (!AR.offsetSynced) {
            AR.offsetSynced = true;
            firebase.database().ref('.info/serverTimeOffset').on('value', (s) => {
                AR.serverOffset = s.val() || 0;
            });
        }

        const roomId = getAudioRoomId();
        if (!roomId) return;

        window.initAudioLiveLangSync(roomId);

        if (AR.activeMsgRoom === roomId && AR.activeMsgListener) return;

        if (AR.activeMsgRoom && AR.activeMsgListener) {
            firebase.database().ref('audio_rooms/' + AR.activeMsgRoom).off('child_added', AR.activeMsgListener);
        }

        AR.seenKeys.clear();
        AR.activeMsgRoom = roomId;
        AR.listenerStartedAt = Date.now() + (AR.serverOffset || 0);
        AR.activeMsgListener = firebase.database()
            .ref('audio_rooms/' + roomId)
            .limitToLast(10)
            .on('child_added', handleIncomingAudioMsg);
    };

    // ==========================================
    // 6. МИКРОФОН: БЫСТРЫЙ ЦИКЛ "СКАЗАЛ -> УШЛО -> ПЛАШКА ЧИСТАЯ"
    // ==========================================
    function updateMicPill(preview = '') {
        ensureAudioControls();
        const pill = document.getElementById('hf-ar-mic-pill');
        const label = document.getElementById('hf-ar-mic-label');
        const micBtn = getAudioMicBtn();

        if (!pill) return;

        if (!AR.micActive || !isAudioMode()) {
            pill.classList.remove('active', 'ai-mode');
            if (micBtn) micBtn.classList.remove('hf-ar-mic-live');
            updateModeBarUI();
            return;
        }

        const d = getAudioUiDict();
        const roomId = getAudioRoomId();
        const manualMic = getMyManualAudioLang(roomId, 'mic');
        const flag = (manualMic && AUD_LANG_MAP[manualMic])
            ? AUD_LANG_MAP[manualMic].flag
            : getAudioNativeFlag(window.myProfileInfo);

        const isAi = AR.micMode === 'ai-audio';
        pill.classList.toggle('ai-mode', isAi);

        if (label) {
            const idleLabel = isAi ? d.aiOn : d.on;
            label.textContent = preview ? `${flag} ${preview}` : `${flag} ${idleLabel}`;
            // Автопрокрутка к новым словам строго внутри рамок плашки
            label.scrollLeft = label.scrollWidth;
        }
        pill.classList.add('active');
        if (micBtn) micBtn.classList.add('hf-ar-mic-live');
        updateModeBarUI();
    }

    function dispatchVoicePhrase(text) {
        const clean = String(text || '').trim();
        if (!clean) return;

        const norm = normalizeForCompare(clean);
        if (!norm) return;

        // Защита от дублей и эха
        const now = Date.now();
        if (norm === AR.lastSentNorm && (now - AR.lastSentAt) < 2200) return;
        if (isLikelyEcho(clean)) return;

        AR.lastSentNorm = norm;
        AR.lastSentAt = now;

        const payloadType = (AR.micMode === 'ai-audio') ? 'ai-audio' : 'voice';
        window.sendAudioRoomPayload(clean, payloadType);
    }

    function resetRecognitionFresh(delay = 80) {
        clearTimeout(AR.silenceTimer);
        AR.silenceTimer = null;
        AR.pendingInterim = '';

        if (AR.recognition) {
            try {
                AR.recognition.onresult = null;
                AR.recognition.onend = null;
                AR.recognition.onerror = null;
                AR.recognition.abort();
            } catch (e) {}
            AR.recognition = null;
        }
        if (AR.micActive && !AR.isSpeakingAI && isAudioMode()) {
            scheduleRestart(delay);
        }
    }

    function flushPendingInterim() {
        clearTimeout(AR.silenceTimer);
        AR.silenceTimer = null;

        const phrase = AR.pendingInterim.trim();
        AR.pendingInterim = '';

        // Мгновенно очищаем плашку
        updateMicPill('');

        if (!phrase || AR.isSpeakingAI) return;

        dispatchVoicePhrase(phrase);
        // Перезапускаем распознаватель с нуля, чтобы старый текст больше не копился
        resetRecognitionFresh(80);
    }

    function scheduleRestart(delay = 80) {
        if (!AR.micActive || AR.isSpeakingAI || !isAudioMode()) return;
        clearTimeout(AR.micRestartTimer);
        AR.micRestartTimer = setTimeout(() => {
            AR.micRestartTimer = null;
            launchRecognition();
        }, delay);
    }

    function launchRecognition() {
        AR.micRestartTimer = null;
        if (!AR.micActive || !isAudioMode() || AR.isSpeakingAI) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (AR.recognition) {
            try {
                AR.recognition.onresult = null;
                AR.recognition.onend = null;
                AR.recognition.onerror = null;
                AR.recognition.abort();
            } catch (e) {}
            AR.recognition = null;
        }

        AR.pendingInterim = '';

        try {
            const rec = new SpeechRec();
            const roomId = getAudioRoomId();
            const activeLang = getMyManualAudioLang(roomId, 'mic') || getAudioNativeLang(window.myProfileInfo);
            rec.lang = (AUD_LANG_MAP[activeLang] && AUD_LANG_MAP[activeLang].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length || AR.isSpeakingAI) return;

                let finalTxt = '';
                let interimTxt = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const chunk = (event.results[i][0] && event.results[i][0].transcript) || '';
                    if (event.results[i].isFinal) finalTxt += ' ' + chunk;
                    else interimTxt += ' ' + chunk;
                }
                finalTxt = finalTxt.trim();
                interimTxt = interimTxt.trim();

                if (finalTxt) {
                    clearTimeout(AR.silenceTimer);
                    AR.silenceTimer = null;
                    AR.pendingInterim = '';
                    updateMicPill('');
                    dispatchVoicePhrase(finalTxt);
                    return;
                }

                if (interimTxt) {
                    AR.pendingInterim = interimTxt;
                    updateMicPill(interimTxt);

                    // Если длинная непрерывная речь — отдаём куском сразу, не затягивая
                    const wordsCount = interimTxt.split(/\s+/).length;
                    if (wordsCount >= MAX_CHUNK_WORDS || interimTxt.length >= MAX_CHUNK_CHARS) {
                        flushPendingInterim();
                        return;
                    }

                    // Короткая пауза (0.85с) -> сразу отправляем и чистим плашку
                    clearTimeout(AR.silenceTimer);
                    AR.silenceTimer = setTimeout(flushPendingInterim, SILENCE_FLUSH_MS);
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopAudioRoomMic(false);
                    return;
                }
                if (AR.pendingInterim.trim() && !AR.isSpeakingAI) {
                    flushPendingInterim();
                    return;
                }
                if (AR.micActive && !AR.isSpeakingAI) {
                    AR.recognition = null;
                    scheduleRestart(220);
                }
            };

            rec.onend = () => {
                AR.recognition = null;
                if (AR.pendingInterim.trim() && !AR.isSpeakingAI) {
                    const tail = AR.pendingInterim.trim();
                    AR.pendingInterim = '';
                    clearTimeout(AR.silenceTimer);
                    AR.silenceTimer = null;
                    updateMicPill('');
                    dispatchVoicePhrase(tail);
                }
                if (AR.micActive && !AR.isSpeakingAI) {
                    updateMicPill('');
                    scheduleRestart(80);
                }
            };

            AR.recognition = rec;
            rec.start();
        } catch (e) {
            AR.recognition = null;
            if (AR.micActive && !AR.isSpeakingAI) scheduleRestart(300);
        }
    }

    window.startAudioRoomMic = async function (mode = 'ai-audio') {
        if (!isAudioMode()) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        unlockTTSOnGesture();

        const normalizedMode = (mode === 'text' || mode === 'voice') ? 'text' : 'ai-audio';
        AR.micMode = normalizedMode;

        if (AR.micActive) {
            updateMicPill('');
            return;
        }

        AR.micActive = true;
        AR.isSpeakingAI = false;
        window.audioRoomMicActive = true;
        window.videoRoomMicActive = true;
        window.syncAudioRoomListener();
        updateMicPill('');

        if (typeof window.pauseAgoraMicForTranslation === 'function') {
            await window.pauseAgoraMicForTranslation();
            await new Promise(r => setTimeout(r, 260));
        }

        if (!AR.micActive) return;
        launchRecognition();

        clearInterval(AR.micWatchdog);
        AR.micWatchdog = setInterval(() => {
            if (AR.micActive && !AR.isSpeakingAI && !AR.recognition && !AR.micRestartTimer) {
                launchRecognition();
            }
        }, 2000);
    };

    window.stopAudioRoomMic = async function (skipResumeAgora = false) {
        AR.micActive = false;
        window.audioRoomMicActive = false;
        window.videoRoomMicActive = false;
        clearTimeout(AR.micRestartTimer);
        clearTimeout(AR.silenceTimer);
        clearInterval(AR.micWatchdog);
        AR.micRestartTimer = null;
        AR.silenceTimer = null;
        AR.micWatchdog = null;
        AR.pendingInterim = '';

        if (AR.recognition) {
            try {
                AR.recognition.onresult = null;
                AR.recognition.onend = null;
                AR.recognition.onerror = null;
                AR.recognition.stop();
            } catch (e) {}
            AR.recognition = null;
        }

        updateMicPill('');

        if (skipResumeAgora) {
            window._agoraPausedForTranslation = false;
        } else if (typeof window.resumeAgoraMicAfterTranslation === 'function') {
            await window.resumeAgoraMicAfterTranslation();
        }
    };

    window.switchAudioToDirect = async function () {
        if (!isAudioMode()) return;
        stopAudioTTSQueue();
        AR.isSpeakingAI = false;
        await window.stopAudioRoomMic(false);
        updateModeBarUI();
    };

    window.switchAudioToAI = async function () {
        if (!isAudioMode()) return;
        unlockTTSOnGesture();
        await window.startAudioRoomMic('ai-audio');
        updateModeBarUI();
    };

    window.startVoiceRoomMic = window.startAudioRoomMic;

    // ==========================================
    // 7. БЕЗОПАСНЫЙ МОСТ С calls.js (НЕ МЕШАЕТ video-room.js)
    // ==========================================
    function bindCallModuleBridge() {
        if (typeof window.startVideoRoomMic === 'function' && !window.startVideoRoomMic._hfAudioWrapped) {
            const origStart = window.startVideoRoomMic;
            const wrappedStart = function (mode) {
                if (isAudioMode()) return window.startAudioRoomMic(mode || 'ai-audio');
                return origStart.apply(this, arguments);
            };
            wrappedStart._hfAudioWrapped = true;
            window.startVideoRoomMic = wrappedStart;
        } else if (typeof window.startVideoRoomMic !== 'function') {
            window.startVideoRoomMic = function (mode) {
                if (isAudioMode()) return window.startAudioRoomMic(mode || 'ai-audio');
            };
        }

        if (typeof window.stopVideoRoomMic === 'function' && !window.stopVideoRoomMic._hfAudioWrapped) {
            const origStop = window.stopVideoRoomMic;
            const wrappedStop = async function (skipResume) {
                if (AR.micActive || isAudioMode()) {
                    await window.stopAudioRoomMic(skipResume);
                }
                return origStop.apply(this, arguments);
            };
            wrappedStop._hfAudioWrapped = true;
            window.stopVideoRoomMic = wrappedStop;
        } else if (typeof window.stopVideoRoomMic !== 'function') {
            window.stopVideoRoomMic = function (skipResume) {
                return window.stopAudioRoomMic(skipResume);
            };
        }

        if (typeof window.syncVideoRoomListener === 'function' && !window.syncVideoRoomListener._hfAudioWrapped) {
            const origSync = window.syncVideoRoomListener;
            const wrappedSync = function () {
                if (isAudioMode()) window.syncAudioRoomListener();
                return origSync.apply(this, arguments);
            };
            wrappedSync._hfAudioWrapped = true;
            window.syncVideoRoomListener = wrappedSync;
        } else if (typeof window.syncVideoRoomListener !== 'function') {
            window.syncVideoRoomListener = function () {
                if (isAudioMode()) window.syncAudioRoomListener();
            };
        }

        if (typeof window.resetVideoRoomState === 'function' && !window.resetVideoRoomState._hfAudioWrapped) {
            const origReset = window.resetVideoRoomState;
            const wrappedReset = function () {
                window.resetAudioRoomState();
                return origReset.apply(this, arguments);
            };
            wrappedReset._hfAudioWrapped = true;
            window.resetVideoRoomState = wrappedReset;
        } else if (typeof window.resetVideoRoomState !== 'function') {
            window.resetVideoRoomState = function () {
                window.resetAudioRoomState();
            };
        }
    }

    // ==========================================
    // 8. ПЕРЕХВАТ СОБЫТИЙ СТРОГО ВНУТРИ АУДИОКОМНАТЫ
    // ==========================================
    function bindAudioRoomDelegation() {
        const host = document.getElementById('voice-translator');
        if (host && !host.dataset.hfArDelegated) {
            host.dataset.hfArDelegated = '1';
            host.addEventListener('click', (e) => {
                if (!isAudioMode()) return;

                if (e.target.closest('#voice-me-photo, #voice-me-flag')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openAudioAvatarLangPanel();
                    return;
                }

                if (e.target.closest('button[onclick*="toggleUniversalMic"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (AR.micActive) window.stopAudioRoomMic(false);
                    else openAudioMicMenu();
                    return;
                }

                if (e.target.closest('button[onclick*="sendFirebaseMsg"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.sendAudioRoomMsg();
                }
            }, true);
        }

        const ecoSelect = document.getElementById('app-lang-select');
        if (ecoSelect && !ecoSelect.dataset.hfArEcoBound) {
            ecoSelect.dataset.hfArEcoBound = '1';
            ecoSelect.addEventListener('change', () => {
                setTimeout(() => {
                    if (!isAudioMode()) return;
                    ensureAudioControls();
                    updateMicPill(AR.pendingInterim);
                    const { textEl } = getMarqueeNodes();
                    if (textEl && !AR.marquee.hasRealContent) {
                        textEl.innerHTML = getAudioUiDict().waiting;
                    }
                }, 60);
            });
        }
    }

    function init() {
        bindCallModuleBridge();
        bindAudioRoomDelegation();
        ensureAudioControls();
        updateModeBarUI();

        // Прогреваем список голосов синтезатора сразу
        try { if (window.speechSynthesis) window.speechSynthesis.getVoices(); } catch (e) {}

        document.addEventListener('click', () => {
            if (isAudioMode()) closeAllAudioPopups();
        });

        setInterval(() => {
            bindCallModuleBridge();
            ensureAudioControls();
            if (isAudioMode()) {
                bindAudioRoomDelegation();
                if (isAudioRoomVisibleOrInCall()) {
                    window.syncAudioRoomListener();
                }
                updateAudioRoomFlagsUI();
                updateModeBarUI();
            } else {
                closeAllAudioPopups();
            }
        }, 1000);

        document.addEventListener('keydown', (e) => {
            if (!isAudioMode() || e.key !== 'Enter' || !document.activeElement) return;
            if (document.activeElement.id === 'voice-chat-input') {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendAudioRoomMsg();
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', () => {
        bindCallModuleBridge();
        ensureAudioControls();
        updateModeBarUI();
    });
})();
