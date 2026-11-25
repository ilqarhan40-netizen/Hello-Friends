// ==========================================
// ФАЙЛ: js/video-room.js (ISOLATED VIDEO WORLD v12 — CLEAN SYNC + AI VOICE)
// Движок 1-в-1 из js/audio-room.js v3, полностью изолированный для видеокомнаты:
// - Свои ветки БД: video_rooms / video_active_langs
// - Свои ключи: hf_vid_avatar_lang_ / hf_vid_mic_lang_
// - Переключатель режимов "Напрямую / ИИ-переводчик" между камерами и аватарами
// - В меню микрофона только выбор языка и "Текст голосом" (без лишней кнопки ИИ)
// - Бегущая строка "поездом" + очередь ИИ-озвучки + анти-эхо + фикс перевода az
// ==========================================

(function () {
    'use strict';

    const VID_LANG_MAP = {
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

    const VID_UI_FALLBACK = {
        en: { langTitle: 'Chat Language', autoProfile: 'Auto (Profile)', micTitle: 'Video Microphone', voiceToText: 'Voice Text', directMode: 'Direct Voice', aiMode: 'AI Translator', waiting: 'Waiting for voice input...', on: 'MIC ON', aiOn: 'AI VOICE ON', stop: 'STOP', selectContact: 'Select a contact first' },
        ru: { langTitle: 'Язык Чата', autoProfile: 'Авто (Профиль)', micTitle: 'Микрофон Видео', voiceToText: 'Текст голосом', directMode: 'Напрямую', aiMode: 'ИИ-переводчик', waiting: 'Ожидание голоса...', on: 'МИК ВКЛ', aiOn: 'ИИ-ГОЛОС ВКЛ', stop: 'СТОП', selectContact: 'Сначала выберите контакт' },
        az: { langTitle: 'Çat Dili', autoProfile: 'Avto (Profil)', micTitle: 'Video Mikrofon', voiceToText: 'Səsli Mətn', directMode: 'Birbaşa', aiMode: 'AI Tərcüməçi', waiting: 'Səs gözlənilir...', on: 'MİK AÇIQ', aiOn: 'AI SƏS AÇIQ', stop: 'DAYAN', selectContact: 'Əvvəlcə kontakt seçin' },
        tr: { langTitle: 'Sohbet Dili', autoProfile: 'Oto (Profil)', micTitle: 'Video Mikrofonu', voiceToText: 'Sesli Metin', directMode: 'Doğrudan', aiMode: 'AI Çevirmen', waiting: 'Ses girişi bekleniyor...', on: 'MİK AÇIK', aiOn: 'AI SES AÇIK', stop: 'DUR', selectContact: 'Önce bir kişi seçin' },
        de: { langTitle: 'Chat-Sprache', autoProfile: 'Auto (Profil)', micTitle: 'Video-Mikrofon', voiceToText: 'Sprachtext', directMode: 'Direkt', aiMode: 'KI-Übersetzer', waiting: 'Warten auf Spracheingabe...', on: 'MIK AN', aiOn: 'KI-STIMME AN', stop: 'STOPP', selectContact: 'Bitte zuerst Kontakt wählen' },
        kk: { langTitle: 'Чат тілі', autoProfile: 'Авто (Профиль)', micTitle: 'Видео микрофон', voiceToText: 'Дауыстық мәтін', directMode: 'Тікелей', aiMode: 'AI аудармашы', waiting: 'Дауыс күтілуде...', on: 'МИК ҚОСУЛЫ', aiOn: 'AI ДАУЫС ҚОСУЛЫ', stop: 'ТОҚТА', selectContact: 'Алдымен контакт таңдаңыз' },
        ar: { langTitle: 'لغة الدردشة', autoProfile: 'تلقائي (الملف)', micTitle: 'ميكروفون الفيديو', voiceToText: 'نص صوتي', directMode: 'مباشر', aiMode: 'مترجم AI', waiting: 'في انتظار إدخال الصوت...', on: 'تشغيل', aiOn: 'صوت AI', stop: 'إيقاف', selectContact: 'اختر جهة اتصال أولاً' },
        it: { langTitle: 'Lingua Chat', autoProfile: 'Auto (Profilo)', micTitle: 'Microfono Video', voiceToText: 'Testo Vocale', directMode: 'Diretto', aiMode: 'Traduttore IA', waiting: 'In attesa di input vocale...', on: 'MIC ON', aiOn: 'IA VOCE ON', stop: 'STOP', selectContact: 'Seleziona prima un contatto' },
        es: { langTitle: 'Idioma del Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Micrófono Video', voiceToText: 'Texto a Voz', directMode: 'Directo', aiMode: 'Traductor IA', waiting: 'Esperando entrada de voz...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR', selectContact: 'Selecciona un contacto primero' },
        fr: { langTitle: 'Langue du Chat', autoProfile: 'Auto (Profil)', micTitle: 'Micro Vidéo', voiceToText: 'Texte vocal', directMode: 'Direct', aiMode: 'Traducteur IA', waiting: "En attente d'entrée vocale...", on: 'MIC ON', aiOn: 'VOIX IA ON', stop: 'STOP', selectContact: 'Sélectionnez un contact' },
        pt: { langTitle: 'Idioma do Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Microfone Vídeo', voiceToText: 'Texto de Voz', directMode: 'Direto', aiMode: 'Tradutor IA', waiting: 'Aguardando entrada de voz...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR', selectContact: 'Selecione um contato primeiro' },
        ja: { langTitle: 'チャット言語', autoProfile: '自動 (プロフィール)', micTitle: 'ビデオマイク', voiceToText: '音声テキスト', directMode: '直接通話', aiMode: 'AI翻訳', waiting: '音声入力を待っています...', on: 'マイクON', aiOn: 'AI音声ON', stop: '停止', selectContact: '先に連絡先を選択してください' },
        zh: { langTitle: '聊天语言', autoProfile: '自动 (个人资料)', micTitle: '视频麦克风', voiceToText: '语音文本', directMode: '直接通话', aiMode: 'AI 翻译', waiting: '等待语音输入...', on: '麦克风开', aiOn: 'AI语音开', stop: '停止', selectContact: '请先选择联系人' }
    };

    const VID_SILENCE_FLUSH_MS = 850;
    const VID_MAX_CHUNK_WORDS = 14;
    const VID_MAX_CHUNK_CHARS = 95;
    const VID_ECHO_COOLDOWN_MS = 650;
    const VID_MARQUEE_GAP_PX = 44;

    const VR = {
        seenKeys: new Set(),
        activeMsgRoom: null,
        activeMsgListener: null,
        activeLangRoom: null,
        activeLangListener: null,
        activeChannel: 'avatar',
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

    window.HF_VIDEO_ROOM = VR;
    window.videoLiveLangs = {};
    window.videoLiveLangsLoaded = {};
    window.videoRoomMicActive = false;

    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('hf_vid_avatar_lang_') || k.startsWith('hf_vid_mic_lang_')) {
            localStorage.removeItem(k);
        }
    });

    function isVideoMode() {
        return window.currentActiveCallType === 'video';
    }

    function isVideoRoomVisibleOrInCall() {
        if (!isVideoMode()) return false;
        const host = document.getElementById('voice-translator');
        const visible = Boolean(host && host.classList.contains('active'));
        return window.currentIndex === 1 || visible || Boolean(window.agoraClient) || Boolean(window.voiceFriend);
    }

    function vidEscapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function vidNormalizeForCompare(str) {
        return String(str || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function vidNormLang(code) {
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

    function vidIsRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function vidLangFromEmoji(flag) {
        if (!flag) return null;
        const map = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return map[String(flag).trim()] || null;
    }

    function vidLangFromPhone(phone) {
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

    function getVideoNativeLang(userObj) {
        if (!userObj) return 'en';
        const byEmoji = vidLangFromEmoji(userObj.flag);
        if (byEmoji) return byEmoji;
        const byFlagCode = vidNormLang(userObj.flagCode);
        if (byFlagCode) return byFlagCode;
        const byPhone = vidLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
        if (byPhone) return byPhone;
        const byCode = vidNormLang(userObj.langCode || userObj.lang);
        if (byCode) return byCode;
        return 'en';
    }

    function getVideoNativeFlag(userObj) {
        if (userObj && vidIsRealFlag(userObj.flag)) return String(userObj.flag).trim();
        const lang = getVideoNativeLang(userObj);
        return (VID_LANG_MAP[lang] && VID_LANG_MAP[lang].flag) ? VID_LANG_MAP[lang].flag : '🇬🇧';
    }

    function getVideoUiLang() {
        const eco = vidNormLang(window.appLang);
        if (eco && VID_UI_FALLBACK[eco]) return eco;
        const savedEco = vidNormLang(localStorage.getItem('hf_app_lang'));
        if (savedEco && VID_UI_FALLBACK[savedEco]) return savedEco;
        const prof = getVideoNativeLang(window.myProfileInfo);
        return VID_UI_FALLBACK[prof] ? prof : 'en';
    }

    function getVideoUiDict() {
        const lang = getVideoUiLang();
        const fb = VID_UI_FALLBACK[lang] || VID_UI_FALLBACK.en;
        const globalDict = (window.i18n && (window.i18n[lang] || window.i18n.en)) || {};
        return {
            langTitle: globalDict.chat_lang || fb.langTitle,
            autoProfile: fb.autoProfile,
            micTitle: fb.micTitle,
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

    function getVideoTargetUser() {
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

    function getVideoRoomId() {
        if (!isVideoMode()) return null;
        const target = getVideoTargetUser();
        if (!target || !target.id || !window.myProfileInfo || !window.myProfileInfo.id) return null;
        const pair = [String(window.myProfileInfo.id), String(target.id)].sort();
        return `${pair[0]}_${pair[1]}`;
    }

    function getVideoChannelStorageKey(roomId, channel) {
        return (channel === 'mic')
            ? ('hf_vid_mic_lang_' + roomId)
            : ('hf_vid_avatar_lang_' + roomId);
    }

    function getMyManualVideoLang(roomId, channel) {
        if (!roomId) return null;
        return vidNormLang(localStorage.getItem(getVideoChannelStorageKey(roomId, channel)));
    }

    async function vidTranslateText(text, targetLang, sourceLang = 'auto') {
        const clean = String(text || '').trim();
        const tl = vidNormLang(targetLang);
        const sl = (sourceLang && sourceLang !== 'auto') ? (vidNormLang(sourceLang) || 'auto') : 'auto';
        if (!clean || !tl) return clean;
        if (sl !== 'auto' && sl === tl) return clean;

        const cacheKey = `${sl}|${tl}|${clean.toLowerCase()}`;
        if (VR.translateCache.has(cacheKey)) {
            return VR.translateCache.get(cacheKey);
        }

        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeoutId = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('').trim();
                if (joined) {
                    if (VR.translateCache.size > 120) VR.translateCache.clear();
                    VR.translateCache.set(cacheKey, joined);
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
    // 0. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ ВИДЕОКОМНАТЫ (avatar / mic / display)
    // ==========================================
    window.syncMyVideoChannelLang = function (roomId, channel, forcedLang, makeActive = true) {
        if (typeof firebase === 'undefined' || !roomId || !window.myProfileInfo || !window.myProfileInfo.id) return;
        if (channel !== 'avatar' && channel !== 'mic') return;

        const myId = String(window.myProfileInfo.id);
        const activeLang = forcedLang !== undefined
            ? vidNormLang(forcedLang)
            : getMyManualVideoLang(roomId, channel);

        const effLang = (activeLang && VID_LANG_MAP[activeLang])
            ? activeLang
            : getVideoNativeLang(window.myProfileInfo);
        const effFlag = (activeLang && VID_LANG_MAP[activeLang])
            ? VID_LANG_MAP[activeLang].flag
            : getVideoNativeFlag(window.myProfileInfo);
        const effFlagCode = (activeLang && VID_LANG_MAP[activeLang])
            ? VID_LANG_MAP[activeLang].flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode) || (VID_LANG_MAP[effLang] && VID_LANG_MAP[effLang].flagCode) || 'un');

        const userRef = firebase.database().ref(`video_active_langs/${roomId}/${myId}`);
        const chRef = userRef.child(channel);

        if (!window.videoLiveLangs[roomId]) window.videoLiveLangs[roomId] = {};
        if (!window.videoLiveLangs[roomId][myId]) window.videoLiveLangs[roomId][myId] = {};

        const payload = {
            langCode: effLang,
            flagCode: effFlagCode,
            flag: effFlag,
            isAuto: !activeLang,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        window.videoLiveLangs[roomId][myId][channel] = payload;
        chRef.set(payload).catch(() => {});

        if (makeActive) {
            VR.activeChannel = channel;
            const displayPayload = {
                channel: channel,
                langCode: effLang,
                flagCode: effFlagCode,
                flag: effFlag,
                isAuto: !activeLang,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            window.videoLiveLangs[roomId][myId].display = displayPayload;
            userRef.child('display').set(displayPayload).catch(() => {});
            renderVideoRoomFlags(roomId);
        }
        try { userRef.onDisconnect().remove(); } catch (e) {}
    };

    window.initVideoLiveLangSync = function (roomId) {
        const rId = roomId || getVideoRoomId();
        if (!rId || typeof firebase === 'undefined' || !window.myProfileInfo || !window.myProfileInfo.id) return;

        if (VR.activeLangRoom && VR.activeLangRoom !== rId && VR.activeLangListener) {
            firebase.database().ref('video_active_langs/' + VR.activeLangRoom).off('value', VR.activeLangListener);
            VR.activeLangListener = null;
        }

        if (VR.activeLangRoom !== rId || !VR.activeLangListener) {
            VR.activeLangRoom = rId;
            VR.activeLangListener = firebase.database().ref('video_active_langs/' + rId).on('value', (snap) => {
                window.videoLiveLangs[rId] = snap.val() || {};
                window.videoLiveLangsLoaded[rId] = true;
                renderVideoRoomFlags(rId);
            });
            const curCh = VR.micActive ? 'mic' : (VR.activeChannel || 'avatar');
            window.syncMyVideoChannelLang(rId, 'avatar', undefined, curCh === 'avatar');
            window.syncMyVideoChannelLang(rId, 'mic', undefined, curCh === 'mic');
        }
    };

    async function getTargetLiveVideoChannel(roomId, targetUser, channel) {
        if (!targetUser) {
            return {
                lang: getVideoNativeLang(window.myProfileInfo),
                flag: getVideoNativeFlag(window.myProfileInfo),
                photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
                name: (window.myUsername || 'User').split(' ')[0]
            };
        }

        if (roomId && !window.videoLiveLangsLoaded[roomId] && typeof firebase !== 'undefined') {
            try {
                const snap = await firebase.database().ref('video_active_langs/' + roomId).once('value');
                window.videoLiveLangs[roomId] = snap.val() || {};
                window.videoLiveLangsLoaded[roomId] = true;
            } catch (e) {}
        }

        const roomMap = window.videoLiveLangs[roomId] || {};
        const targetLiveAll = roomMap[String(targetUser.id)] || null;
        const live = targetLiveAll ? targetLiveAll[channel] : null;

        const targetLang = (live && live.langCode)
            ? vidNormLang(live.langCode)
            : getVideoNativeLang(targetUser);
        const targetFlag = (live && vidIsRealFlag(live.flag))
            ? live.flag
            : getVideoNativeFlag(targetUser);

        return {
            lang: targetLang || 'en',
            flag: targetFlag,
            photo: targetUser.photo || 'https://ui-avatars.com/api/?name=U',
            name: (targetUser.name || 'User').split(' ')[0]
        };
    }

    function buildVideoMirrorMarquee(senderPhoto, senderFlag, senderName, originalText, receiverPhoto, receiverFlag, receiverName, translatedText, sourceType) {
        let icon = '<i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.65rem]"></i>';
        if (sourceType === 'ai-audio') {
            icon = '<i class="fa-solid fa-robot text-[#00e5b0] mx-2 text-[0.7rem]"></i>';
        } else if (sourceType === 'voice') {
            icon = '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem]"></i>';
        }

        return (
            `<span class="hf-vr-mq-item" data-vr-msg="1">` +
                `<img src="${vidEscapeHtml(senderPhoto)}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">` +
                `<span class="text-white font-bold mr-1">${vidEscapeHtml(senderName)}:</span>` +
                `<span class="text-[#e9edef] mr-1">${vidEscapeHtml(senderFlag)} ${vidEscapeHtml(originalText)}</span>` +
                `${icon}` +
                `<img src="${vidEscapeHtml(receiverPhoto)}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover">` +
                `<span class="text-white font-bold mr-1">${vidEscapeHtml(receiverName)}:</span>` +
                `<span class="text-yellow-400 font-bold">${vidEscapeHtml(receiverFlag)} ${vidEscapeHtml(translatedText)}</span>` +
            `</span>`
        );
    }

    // ================= ЕДИНЫЙ РЕНДЕР ФЛАГОВ ПО ТУМБЛЕРУ (activeChannel / display) =================
    function renderVideoRoomFlags(roomId) {
        if (!isVideoMode()) return;

        const myCh = (VR.activeChannel === 'mic') ? 'mic' : 'avatar';
        const meEl = document.getElementById('voice-me-flag');
        if (meEl) {
            const myLang = getMyManualVideoLang(roomId, myCh);
            const myFlag = (myLang && VID_LANG_MAP[myLang])
                ? VID_LANG_MAP[myLang].flag
                : getVideoNativeFlag(window.myProfileInfo);
            if (meEl.textContent !== myFlag) meEl.textContent = myFlag;
        }

        const fEl = document.getElementById('voice-friend-flag');
        const target = getVideoTargetUser();
        if (fEl && target) {
            const targetLive = ((roomId && window.videoLiveLangs[roomId]) || {})[String(target.id)] || null;
            let friendFlag = null;
            if (targetLive && targetLive.display && vidIsRealFlag(targetLive.display.flag)) {
                friendFlag = targetLive.display.flag;
            } else if (targetLive) {
                const m = targetLive.mic;
                const a = targetLive.avatar;
                const mTs = (m && typeof m.updatedAt === 'number') ? m.updatedAt : 0;
                const aTs = (a && typeof a.updatedAt === 'number') ? a.updatedAt : 0;
                const picked = (mTs > aTs) ? m : (a || m);
                if (picked && vidIsRealFlag(picked.flag)) friendFlag = picked.flag;
            }
            if (!friendFlag) friendFlag = getVideoNativeFlag(target);
            if (fEl.textContent !== friendFlag) fEl.textContent = friendFlag;
        }
    }

    // ================= МИР 1: МИКРОФОН (работает только когда тумблер = mic) =================
    const VR_MIC_WORLD = {
        lastRoomId: null,
        flagRoomId: null,
        hadCall: false,
        wasVisible: false,
        recentBuckets: { send: [], tts: [] },

        isDuplicate(text, bucket) {
            const norm = String(text || '')
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (!norm) return true;
            const now = Date.now();
            const win = norm.length > 10 ? 6500 : 2500;
            const list = (this.recentBuckets[bucket] || []).filter(x => (now - x.ts) < 7000);
            const dup = list.some(x =>
                (x.norm === norm && (now - x.ts) < win) ||
                (norm.length >= 8 && (now - x.ts) < 3500 && x.norm.includes(norm))
            );
            if (dup) {
                this.recentBuckets[bucket] = list;
                return true;
            }
            list.push({ norm, ts: now });
            this.recentBuckets[bucket] = list;
            return false;
        },

        applyMyFlag(roomId) {
            VR.activeChannel = 'mic';
            renderVideoRoomFlags(roomId);
        },

        resetSession(rId) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('hf_vid_mic_lang_')) localStorage.removeItem(k);
            });
            const sel = document.getElementById('hf-vr-mic-select');
            if (sel && sel.value !== 'auto') sel.value = 'auto';
            this.recentBuckets = { send: [], tts: [] };
            if (rId && typeof window.syncMyVideoChannelLang === 'function') {
                window.syncMyVideoChannelLang(rId, 'mic', '', false);
            }
        },

        tick(roomId) {
            const inCall = Boolean(window.agoraClient) && isVideoMode();
            const visible = isVideoRoomVisibleOrInCall();
            if (roomId) this.lastRoomId = roomId;

            if (inCall) {
                this.hadCall = true;
            } else if (this.hadCall) {
                this.hadCall = false;
                this.resetSession(roomId || this.lastRoomId);
            }

            if (visible) {
                this.wasVisible = true;
            } else if (this.wasVisible) {
                this.wasVisible = false;
                this.resetSession(roomId || this.lastRoomId);
            }

            if (this.flagRoomId !== roomId) {
                const oldRoom = this.flagRoomId;
                this.flagRoomId = roomId;
                if (oldRoom && roomId) this.resetSession(oldRoom);
            }
        }
    };

    // ================= МИР 2: АВАТАР / КЛАВИАТУРА (работает только когда тумблер = avatar) =================
    const VR_AVATAR_WORLD = {
        lastRoomId: null,
        flagRoomId: null,
        hadCall: false,
        wasVisible: false,

        applyMyFlag(roomId) {
            VR.activeChannel = 'avatar';
            renderVideoRoomFlags(roomId);
        },

        resetSession(rId) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('hf_vid_avatar_lang_')) localStorage.removeItem(k);
            });
            VR.activeChannel = 'avatar';
            if (rId && typeof window.syncMyVideoChannelLang === 'function') {
                window.syncMyVideoChannelLang(rId, 'avatar', '', true);
            }
        },

        tick(roomId) {
            const inCall = Boolean(window.agoraClient) && isVideoMode();
            const visible = isVideoRoomVisibleOrInCall();
            if (roomId) this.lastRoomId = roomId;

            if (inCall) {
                this.hadCall = true;
            } else if (this.hadCall) {
                this.hadCall = false;
                this.resetSession(roomId || this.lastRoomId);
            }

            if (visible) {
                this.wasVisible = true;
            } else if (this.wasVisible) {
                this.wasVisible = false;
                this.resetSession(roomId || this.lastRoomId);
            }

            if (this.flagRoomId !== roomId) {
                const oldRoom = this.flagRoomId;
                this.flagRoomId = roomId;
                if (oldRoom && roomId) this.resetSession(oldRoom);
            }
        }
    };

    function updateVideoRoomFlagsUI() {
        const roomId = isVideoMode() ? getVideoRoomId() : null;
        VR_MIC_WORLD.tick(roomId);
        VR_AVATAR_WORLD.tick(roomId);
        if (isVideoMode()) renderVideoRoomFlags(roomId);
    }

    // ==========================================
    // 1. СТИЛИ, ПЛАШКА РЕЖИМА (СТРОГО В РАМКАХ) И МЕНЮ
    // ==========================================
    function getVideoHost() {
        return document.getElementById('voice-translator')
            || document.getElementById('phone-body')
            || document.body;
    }

    function getVideoInput() {
        return document.getElementById('voice-chat-input');
    }

    function getVideoMicBtn() {
        const inp = getVideoInput();
        const bar = inp ? inp.closest('.chat-input-area') : null;
        return bar ? bar.querySelector('button[onclick*="toggleUniversalMic"]') : null;
    }

    function injectStyles() {
        if (document.getElementById('hf-vr-v12-styles')) return;
        const oldStyle = document.getElementById('hf-vr-v11-styles');
        if (oldStyle) oldStyle.remove();
        const oldSlot = document.getElementById('hf-vr-mic-slot');
        if (oldSlot) oldSlot.remove();

        const style = document.createElement('style');
        style.id = 'hf-vr-v12-styles';
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
            .hf-vr-mq-item {
                display: inline-flex;
                align-items: center;
                flex-shrink: 0;
            }
            .hf-vr-mq-item + .hf-vr-mq-item {
                margin-left: ${VID_MARQUEE_GAP_PX}px;
            }
            #hf-vr-control-slot {
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
            #hf-vr-mode-bar {
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
            .hf-vr-mode-btn {
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
            .hf-vr-mode-btn.active-direct {
                background: #00a884;
                color: #111b21;
                box-shadow: 0 4px 14px rgba(0, 168, 132, 0.4);
            }
            .hf-vr-mode-btn.active-ai {
                background: linear-gradient(135deg, #00a884, #00e5b0);
                color: #111b21;
                box-shadow: 0 4px 18px rgba(0, 229, 176, 0.45);
            }
            #hf-vr-mic-pill {
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
            #hf-vr-mic-pill.active { display: inline-flex; }
            #hf-vr-mic-pill.ai-mode {
                border-color: #00e5b0;
                box-shadow: 0 8px 26px rgba(0, 229, 176, 0.35);
            }
            #hf-vr-mic-pill .dot {
                width: 9px; height: 9px; border-radius: 50%;
                background: #ef4444; flex-shrink: 0;
                animation: hfVrPulse 1s infinite;
            }
            #hf-vr-mic-pill.ai-mode .dot { background: #00e5b0; }
            #hf-vr-mic-label {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                display: block;
            }
            #hf-vr-mic-pill .stop-btn {
                flex-shrink: 0;
                background: #ef4444; color: #fff; border: none;
                border-radius: 999px; padding: 3px 11px;
                font-size: 0.72rem; font-weight: 800; cursor: pointer;
            }
            .hf-vr-mic-live {
                background: #dc2626 !important;
                color: #fff !important;
                border-color: #ef4444 !important;
            }
            #hf-vr-avatar-modal, #hf-vr-mic-popup {
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
            #hf-vr-avatar-modal.active, #hf-vr-mic-popup.active { display: block; }
            #hf-vr-avatar-modal {
                bottom: 124px;
                right: 10px;
                width: 245px;
                max-height: calc(100% - 140px);
                overflow-y: auto;
            }
            #hf-vr-mic-popup {
                bottom: 64px;
                right: 10px;
                width: 240px;
            }
            .hf-vr-lang-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-top: 8px;
            }
            .hf-vr-lang-btn {
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
            .hf-vr-lang-btn.selected {
                background: #00a884;
                color: #111b21;
                border-color: #00e5b0;
                font-weight: 800;
            }
            @keyframes hfVrPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    function closeAllVideoPopups() {
        const a = document.getElementById('hf-vr-avatar-modal');
        const m = document.getElementById('hf-vr-mic-popup');
        if (a) a.classList.remove('active');
        if (m) m.classList.remove('active');
    }

    function ensureVideoControls() {
        injectStyles();
        const d = getVideoUiDict();

        let slot = document.getElementById('hf-vr-control-slot');
        if (!slot) {
            slot = document.createElement('div');
            slot.id = 'hf-vr-control-slot';
            slot.innerHTML = `
                <div id="hf-vr-mode-bar">
                    <button type="button" id="hf-vr-btn-direct" class="hf-vr-mode-btn active-direct">
                        <i class="fa-solid fa-phone-volume"></i>
                        <span id="hf-vr-lbl-direct">${vidEscapeHtml(d.directMode)}</span>
                    </button>
                    <button type="button" id="hf-vr-btn-ai" class="hf-vr-mode-btn">
                        <i class="fa-solid fa-robot"></i>
                        <span id="hf-vr-lbl-ai">${vidEscapeHtml(d.aiMode)}</span>
                    </button>
                </div>
                <div id="hf-vr-mic-pill">
                    <span class="dot"></span>
                    <span id="hf-vr-mic-label"></span>
                    <button type="button" class="stop-btn" id="hf-vr-stop-btn">${vidEscapeHtml(d.stop)}</button>
                </div>
            `;

            slot.querySelector('#hf-vr-btn-direct').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockTTSOnGesture();
                window.switchVideoToDirect();
            });
            slot.querySelector('#hf-vr-btn-ai').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockTTSOnGesture();
                window.switchVideoToAI();
            });
            slot.querySelector('#hf-vr-stop-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.stopVideoRoomMic(false);
            });
        } else {
            const lblDirect = slot.querySelector('#hf-vr-lbl-direct');
            const lblAi = slot.querySelector('#hf-vr-lbl-ai');
            const stopBtn = slot.querySelector('#hf-vr-stop-btn');
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
            const host = getVideoHost();
            if (slot.parentNode !== host) host.appendChild(slot);
        }

        slot.style.display = isVideoMode() ? 'flex' : 'none';
        return slot;
    }

    function updateModeBarUI() {
        const slot = ensureVideoControls();
        if (!slot) return;
        slot.style.display = isVideoMode() ? 'flex' : 'none';

        const btnDirect = document.getElementById('hf-vr-btn-direct');
        const btnAi = document.getElementById('hf-vr-btn-ai');
        if (!btnDirect || !btnAi) return;

        const isDirect = !VR.micActive;
        const isAiActive = VR.micActive && VR.micMode === 'ai-audio';
        btnDirect.classList.toggle('active-direct', isDirect);
        btnAi.classList.toggle('active-ai', isAiActive);
    }

    // МЕНЮ АВАТАРА (переключает тумблер на avatar)
    function openVideoAvatarLangPanel() {
        injectStyles();
        const existing = document.getElementById('hf-vr-avatar-modal');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllVideoPopups();
        if (wasOpen) return;

        const roomId = getVideoRoomId();
        if (roomId) window.initVideoLiveLangSync(roomId);

        const host = getVideoHost();
        let modal = existing;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hf-vr-avatar-modal';
            modal.addEventListener('click', (e) => e.stopPropagation());
        }
        if (modal.parentNode !== host) host.appendChild(modal);

        const d = getVideoUiDict();
        const profileFlag = getVideoNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualVideoLang(roomId, 'avatar');

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;">🌐 ${vidEscapeHtml(d.langTitle)}</span>
                <button type="button" id="hf-vr-avatar-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <button type="button" data-lang="auto" class="hf-vr-lang-btn ${!currentPref ? 'selected' : ''}" style="width:100%;justify-content:center;">
                ${profileFlag} ${vidEscapeHtml(d.autoProfile)}
            </button>
            <div class="hf-vr-lang-grid">
        `;
        Object.keys(VID_LANG_MAP).forEach(code => {
            const item = VID_LANG_MAP[code];
            html += `<button type="button" data-lang="${code}" class="hf-vr-lang-btn ${currentPref === code ? 'selected' : ''}">${item.flag} ${item.name}</button>`;
        });
        html += `</div>`;
        modal.innerHTML = html;

        modal.querySelector('#hf-vr-avatar-close').onclick = () => modal.classList.remove('active');
        modal.querySelectorAll('.hf-vr-lang-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const chosen = btn.getAttribute('data-lang');
                const rId = getVideoRoomId();
                VR.activeChannel = 'avatar';
                if (rId) {
                    const key = getVideoChannelStorageKey(rId, 'avatar');
                    if (chosen === 'auto') localStorage.removeItem(key);
                    else localStorage.setItem(key, chosen);
                    window.syncMyVideoChannelLang(rId, 'avatar', chosen === 'auto' ? null : chosen, true);
                } else {
                    renderVideoRoomFlags(rId);
                }
                modal.classList.remove('active');
            };
        });

        modal.classList.add('active');
    }

    // МЕНЮ МИКРОФОНА (только язык на лету + "Текст голосом", без дублирующей кнопки ИИ)
    function openVideoMicMenu() {
        injectStyles();
        const existing = document.getElementById('hf-vr-mic-popup');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllVideoPopups();
        if (wasOpen) return;

        const roomId = getVideoRoomId();
        if (roomId) window.initVideoLiveLangSync(roomId);

        const host = getVideoHost();
        let popup = existing;
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'hf-vr-mic-popup';
            popup.addEventListener('click', (e) => e.stopPropagation());
        }
        if (popup.parentNode !== host) host.appendChild(popup);

        const d = getVideoUiDict();
        const profileFlag = getVideoNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualVideoLang(roomId, 'mic');

        let optionsHtml = `<option value="auto" ${!currentPref ? 'selected' : ''}>${profileFlag} ${vidEscapeHtml(d.autoProfile)}</option>`;
        Object.keys(VID_LANG_MAP).forEach(code => {
            const item = VID_LANG_MAP[code];
            optionsHtml += `<option value="${code}" ${currentPref === code ? 'selected' : ''}>${item.flag} ${item.name}</option>`;
        });

        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;"><i class="fa-solid fa-microphone mr-1"></i> ${vidEscapeHtml(d.micTitle)}</span>
                <button type="button" id="hf-vr-mic-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <select id="hf-vr-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:8px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-vr-mic-text-btn" style="width:100%;background:#00a884;color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone"></i> ${vidEscapeHtml(d.voiceToText)}
            </button>
        `;

        popup.querySelector('#hf-vr-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-vr-mic-select').onchange = (e) => {
            const val = e.target.value;
            const rId = getVideoRoomId();
            VR.activeChannel = 'mic';
            if (rId) {
                const key = getVideoChannelStorageKey(rId, 'mic');
                if (!val || val === 'auto') localStorage.removeItem(key);
                else localStorage.setItem(key, val);
                window.syncMyVideoChannelLang(rId, 'mic', (!val || val === 'auto') ? null : val, true);
            } else {
                renderVideoRoomFlags(rId);
            }
            updateMicPill('');
            if (VR.micActive && !VR.isSpeakingAI) resetRecognitionFresh(80);
        };
        popup.querySelector('#hf-vr-mic-text-btn').onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            window.startVideoRoomMic('text');
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

    function takeVideoMarqueeOwnership() {
        if (window.HF_AUDIO_ROOM && window.HF_AUDIO_ROOM.marquee && window.HF_AUDIO_ROOM.marquee.rafId) {
            cancelAnimationFrame(window.HF_AUDIO_ROOM.marquee.rafId);
            window.HF_AUDIO_ROOM.marquee.rafId = null;
        }
    }

    function marqueeLoop(ts) {
        if (!isVideoMode()) {
            VR.marquee.rafId = null;
            return;
        }
        VR.marquee.rafId = requestAnimationFrame(marqueeLoop);
        if (!VR.marquee.lastTs) { VR.marquee.lastTs = ts; return; }
        const dt = Math.min((ts - VR.marquee.lastTs) / 1000, 0.1);
        VR.marquee.lastTs = ts;

        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;
        const cw = container.clientWidth;
        const tw = textEl.scrollWidth;
        if (cw <= 0 || tw <= 0) return;

        if (!VR.marquee.initialized) {
            VR.marquee.initialized = true;
            VR.marquee.offsetX = cw;
        }

        VR.marquee.offsetX -= VR.marquee.speed * dt;

        const items = textEl.querySelectorAll('.hf-vr-mq-item');
        if (items.length > 1) {
            const first = items[0];
            const removeWidth = first.offsetWidth + VID_MARQUEE_GAP_PX;
            if (VR.marquee.offsetX + removeWidth < -10) {
                first.remove();
                VR.marquee.offsetX += removeWidth;
                VR.marquee.passCount = 0;
            }
        } else if (VR.marquee.offsetX < -(tw + 24)) {
            VR.marquee.passCount += 1;
            VR.marquee.offsetX = cw + 16;
        }

        textEl.style.transform = `translate3d(${VR.marquee.offsetX}px, 0, 0)`;
    }

    function startMarqueeEngine() {
        if (!isVideoMode()) return;
        injectStyles();
        takeVideoMarqueeOwnership();
        if (VR.marquee.rafId) return;
        VR.marquee.lastTs = 0;
        VR.marquee.rafId = requestAnimationFrame(marqueeLoop);
    }

    function pushVideoMarquee(html) {
        if (!html || !isVideoMode()) return;
        startMarqueeEngine();

        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;
        const cw = container.clientWidth || 300;

        const existingItems = textEl.querySelectorAll('.hf-vr-mq-item');
        if (!VR.marquee.hasRealContent || existingItems.length === 0 || (existingItems.length === 1 && VR.marquee.passCount >= 1)) {
            textEl.innerHTML = html;
            VR.marquee.hasRealContent = true;
            VR.marquee.passCount = 0;
            VR.marquee.initialized = true;
            VR.marquee.offsetX = cw + 12;
            textEl.style.transform = `translate3d(${VR.marquee.offsetX}px, 0, 0)`;
            return;
        }

        if (existingItems.length >= 4) {
            const oldest = existingItems[0];
            const shift = oldest.offsetWidth + VID_MARQUEE_GAP_PX;
            oldest.remove();
            VR.marquee.offsetX += shift;
        }

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
        if (VR.ttsUnlocked || typeof window.speechSynthesis === 'undefined') return;
        try {
            window.speechSynthesis.getVoices();
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
            VR.ttsUnlocked = true;
        } catch (e) {}
    }

    function stopVideoTTSQueue() {
        const hadWork = VR.ttsSpeaking || VR.ttsQueue.length > 0;
        VR.ttsQueue = [];
        VR.ttsSpeaking = false;
        clearTimeout(VR.ttsSafetyTimer);
        clearTimeout(VR.ttsCooldownTimer);
        VR.ttsSafetyTimer = null;
        VR.ttsCooldownTimer = null;
        if (hadWork || isVideoMode()) {
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
            if (typeof window.stopVoiceAI === 'function') {
                try { window.stopVoiceAI(); } catch (e) {}
            }
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
        VR.isSpeakingAI = true;
        clearTimeout(VR.micRestartTimer);
        clearTimeout(VR.silenceTimer);
        clearTimeout(VR.ttsCooldownTimer);
        VR.micRestartTimer = null;
        VR.silenceTimer = null;
        VR.ttsCooldownTimer = null;
        VR.pendingInterim = '';

        if (VR.recognition) {
            try {
                VR.recognition.onresult = null;
                VR.recognition.onend = null;
                VR.recognition.onerror = null;
                VR.recognition.abort();
            } catch (e) {}
            VR.recognition = null;
        }
        if (VR.micActive) updateMicPill('');
    }

    function resumeMicAfterAI() {
        clearTimeout(VR.ttsCooldownTimer);
        VR.ttsCooldownTimer = setTimeout(() => {
            VR.ttsCooldownTimer = null;
            if (VR.ttsSpeaking || VR.ttsQueue.length > 0) return;
            VR.isSpeakingAI = false;
            if (VR.micActive && isVideoMode()) {
                launchRecognition();
            }
        }, VID_ECHO_COOLDOWN_MS);
    }

    function recordSpokenText(text) {
        const norm = vidNormalizeForCompare(text);
        if (!norm) return;
        const now = Date.now();
        VR.recentSpoken = VR.recentSpoken.filter(item => (now - item.ts) < 7500);
        VR.recentSpoken.push({ norm, words: norm.split(' ').filter(w => w.length >= 2), ts: now });
    }

    function isLikelyEcho(candidateText) {
        const candNorm = vidNormalizeForCompare(candidateText);
        if (!candNorm) return true;

        const now = Date.now();
        VR.recentSpoken = VR.recentSpoken.filter(item => (now - item.ts) < 7500);
        if (!VR.recentSpoken.length) return false;

        const candWords = candNorm.split(' ').filter(w => w.length >= 2);
        for (const item of VR.recentSpoken) {
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

    function processVideoTTSQueue() {
        if (VR.ttsSpeaking || !VR.ttsQueue.length || !isVideoMode()) return;

        const item = VR.ttsQueue.shift();
        if (!item || !item.text) {
            processVideoTTSQueue();
            return;
        }

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

        const normLang = vidNormLang(item.lang) || getVideoNativeLang(window.myProfileInfo);
        const speechLocale = (VID_LANG_MAP[normLang] && VID_LANG_MAP[normLang].speech) || 'en-US';

        const utt = new SpeechSynthesisUtterance(item.text);
        utt.lang = speechLocale;
        utt.rate = 1.08;
        utt.pitch = 1.0;
        utt.volume = 1.0;

        const voice = pickBestVoice(speechLocale);
        if (voice) utt.voice = voice;

        VR.ttsSpeaking = true;
        let finished = false;

        const done = () => {
            if (finished) return;
            finished = true;
            clearTimeout(VR.ttsSafetyTimer);
            VR.ttsSafetyTimer = null;
            VR.ttsSpeaking = false;

            if (VR.ttsQueue.length > 0 && isVideoMode()) {
                setTimeout(processVideoTTSQueue, 40);
            } else {
                resumeMicAfterAI();
            }
        };

        utt.onend = done;
        utt.onerror = done;

        const maxDuration = Math.min(18000, Math.max(4000, item.text.length * 140));
        VR.ttsSafetyTimer = setTimeout(() => {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            done();
        }, maxDuration);

        try {
            window.speechSynthesis.speak(utt);
        } catch (e) {
            done();
        }
    }

    function enqueueVideoTTS(text, lang) {
        const clean = String(text || '').trim();
        if (!clean || !isVideoMode()) return;
        if (VR_MIC_WORLD.isDuplicate(clean, 'tts')) return;

        if (VR.ttsQueue.length >= 2) {
            VR.ttsQueue.shift();
        }
        VR.ttsQueue.push({ text: clean, lang });
        processVideoTTSQueue();
    }

    function bindAIVoiceCallbacks() {
        if (!window.onAIVoiceStart || !window.onAIVoiceStart._hfVidWrapped) {
            const origStart = window.onAIVoiceStart;
            const wrappedStart = function () {
                if (isVideoMode()) {
                    pauseMicForAI();
                    return;
                }
                if (typeof origStart === 'function') return origStart.apply(this, arguments);
            };
            wrappedStart._hfVidWrapped = true;
            window.onAIVoiceStart = wrappedStart;
        }

        if (!window.onAIVoiceEnd || !window.onAIVoiceEnd._hfVidWrapped) {
            const origEnd = window.onAIVoiceEnd;
            const wrappedEnd = function () {
                if (isVideoMode()) {
                    if (!VR.ttsSpeaking && VR.ttsQueue.length === 0) {
                        resumeMicAfterAI();
                    }
                    return;
                }
                if (typeof origEnd === 'function') return origEnd.apply(this, arguments);
            };
            wrappedEnd._hfVidWrapped = true;
            window.onAIVoiceEnd = wrappedEnd;
        }
    }

    window.resetVideoRoomState = function () {
        stopVideoTTSQueue();
        if (VR.micActive) window.stopVideoRoomMic(true);
        VR.seenKeys.clear();
        VR.recentSpoken = [];
        VR.marquee.hasRealContent = false;
        VR.marquee.passCount = 0;
        VR.isSpeakingAI = false;
        VR.activeChannel = 'avatar';
        closeAllVideoPopups();

        if (VR.activeMsgRoom && VR.activeMsgListener && typeof firebase !== 'undefined') {
            firebase.database().ref('video_rooms/' + VR.activeMsgRoom).off('child_added', VR.activeMsgListener);
        }
        if (VR.activeLangRoom && VR.activeLangListener && typeof firebase !== 'undefined') {
            firebase.database().ref('video_active_langs/' + VR.activeLangRoom).off('value', VR.activeLangListener);
        }
        VR.activeMsgRoom = null;
        VR.activeMsgListener = null;
        VR.activeLangRoom = null;
        VR.activeLangListener = null;

        updateModeBarUI();
        const { textEl } = getMarqueeNodes();
        if (textEl && isVideoMode()) textEl.innerHTML = getVideoUiDict().waiting;
    };

    // ==========================================
    // 4. ОТПРАВКА (ТУМБЛЕР avatar / mic)
    // ==========================================
    window.sendVideoRoomPayload = async function (rawText, sourceType = 'keyboard') {
        if (!isVideoMode()) return;
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;
        if ((sourceType === 'voice' || sourceType === 'ai-audio') && VR_MIC_WORLD.isDuplicate(cleanText, 'send')) return;

        window.syncVideoRoomListener();
        const roomId = getVideoRoomId();
        if (!roomId) {
            if (typeof window.showToast === 'function') {
                const d = getVideoUiDict();
                window.showToast('Video', d.selectContact, '', '');
            }
            return;
        }

        window.initVideoLiveLangSync(roomId);

        const isVoice = (sourceType === 'voice' || sourceType === 'ai-audio');
        const channel = isVoice ? 'mic' : 'avatar';
        VR.activeChannel = channel;
        window.syncMyVideoChannelLang(roomId, channel, undefined, true);

        const manualLang = getMyManualVideoLang(roomId, channel);
        const myActiveLang = manualLang || getVideoNativeLang(window.myProfileInfo);
        const myFlag = (manualLang && VID_LANG_MAP[manualLang])
            ? VID_LANG_MAP[manualLang].flag
            : getVideoNativeFlag(window.myProfileInfo);
        const myFlagCode = (manualLang && VID_LANG_MAP[manualLang])
            ? VID_LANG_MAP[manualLang].flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode) || 'un');

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : 'guest';
        const safeName = (window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User').split(' ')[0];
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';

        const targetUser = getVideoTargetUser();
        const targetInfo = await getTargetLiveVideoChannel(roomId, targetUser, channel);

        const myBaseText = isVoice
            ? cleanText
            : await vidTranslateText(cleanText, myActiveLang);

        let textToShip = myBaseText;
        if (targetInfo.lang && targetInfo.lang !== myActiveLang) {
            textToShip = await vidTranslateText(myBaseText, targetInfo.lang, myActiveLang);
        }

        const mirrorMarquee = buildVideoMirrorMarquee(
            safePhoto, myFlag, safeName, myBaseText,
            targetInfo.photo, targetInfo.flag, targetInfo.name, textToShip,
            sourceType
        );

        firebase.database().ref('video_rooms/' + roomId).push({
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
            isVideoRoomMsg: true
        }).catch(() => {});
    };

    window.sendVideoRoomMsg = async function () {
        if (!isVideoMode()) return;
        const input = getVideoInput();
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        VR_AVATAR_WORLD.applyMyFlag(getVideoRoomId());
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendVideoRoomPayload(raw, 'keyboard');
    };

    // ==========================================
    // 5. ПРИЁМ: ПОЕЗД БЕГУЩЕЙ СТРОКИ + БЫСТРАЯ ОЗВУЧКА ИИ
    // ==========================================
    function handleIncomingVideoMsg(snapshot) {
        if (!isVideoMode()) return;
        const data = snapshot.val();
        if (!data || !data.isVideoRoomMsg) return;
        if (VR.seenKeys.has(snapshot.key)) return;
        VR.seenKeys.add(snapshot.key);

        const serverNow = Date.now() + (VR.serverOffset || 0);
        if (data.timestamp) {
            if (VR.listenerStartedAt && data.timestamp < (VR.listenerStartedAt - 5000)) return;
            if ((serverNow - data.timestamp) > 60000) return;
        }

        let marqueeHtml = data.mirrorMarquee || '';
        if (!marqueeHtml || marqueeHtml.indexOf('hf-vr-mq-item') === -1) {
            marqueeHtml = buildVideoMirrorMarquee(
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

        pushVideoMarquee(marqueeHtml);

        const myId = (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : '';
         if (myId && String(data.userId) !== myId) {
            const incomingChannel = (data.inputChannel === 'mic' || data.sourceType === 'voice' || data.sourceType === 'ai-audio')
                ? 'mic'
                : 'avatar';
            const syncRoomId = VR.activeMsgRoom || getVideoRoomId();
            if (VR.activeChannel !== incomingChannel) {
                VR.activeChannel = incomingChannel;
                if (syncRoomId) {
                    window.syncMyVideoChannelLang(syncRoomId, incomingChannel, undefined, true);
                } else {
                    renderVideoRoomFlags(syncRoomId);
                }
            } else {
                renderVideoRoomFlags(syncRoomId);
            }
                }
        
        if (data.sourceType === 'ai-audio' && myId && String(data.userId) !== myId && isVideoRoomVisibleOrInCall()) {
            const spokenText = (data.text || data.originalText || '').trim();
            const spokenLang = data.targetLang || getMyManualVideoLang(VR.activeMsgRoom, 'mic') || getVideoNativeLang(window.myProfileInfo);
            if (spokenText) {
                enqueueVideoTTS(spokenText, spokenLang);
            }
        }
    }

    window.syncVideoRoomListener = function () {
        if (!isVideoMode() || typeof firebase === 'undefined' || !firebase.database) return;

        if (!VR.offsetSynced) {
            VR.offsetSynced = true;
            firebase.database().ref('.info/serverTimeOffset').on('value', (s) => {
                VR.serverOffset = s.val() || 0;
            });
        }

        const roomId = getVideoRoomId();
        if (!roomId) return;

        window.initVideoLiveLangSync(roomId);

        if (VR.activeMsgRoom === roomId && VR.activeMsgListener) return;

        if (VR.activeMsgRoom && VR.activeMsgListener) {
            firebase.database().ref('video_rooms/' + VR.activeMsgRoom).off('child_added', VR.activeMsgListener);
        }

        VR.seenKeys.clear();
        VR.activeMsgRoom = roomId;
        VR.listenerStartedAt = Date.now() + (VR.serverOffset || 0);
        VR.activeMsgListener = firebase.database()
            .ref('video_rooms/' + roomId)
            .limitToLast(10)
            .on('child_added', handleIncomingVideoMsg);
    };

    // ==========================================
    // 6. МИКРОФОН: БЫСТРЫЙ ЦИКЛ "СКАЗАЛ -> УШЛО -> ПЛАШКА ЧИСТАЯ"
    // ==========================================
    function updateMicPill(preview = '') {
        ensureVideoControls();
        const pill = document.getElementById('hf-vr-mic-pill');
        const label = document.getElementById('hf-vr-mic-label');
        const micBtn = getVideoMicBtn();

        if (!pill) return;

        if (!VR.micActive || !isVideoMode()) {
            pill.classList.remove('active', 'ai-mode');
            if (micBtn && isVideoMode()) micBtn.classList.remove('hf-vr-mic-live');
            updateModeBarUI();
            return;
        }

        const d = getVideoUiDict();
        const roomId = getVideoRoomId();
        const manualMic = getMyManualVideoLang(roomId, 'mic');
        const flag = (manualMic && VID_LANG_MAP[manualMic])
            ? VID_LANG_MAP[manualMic].flag
            : getVideoNativeFlag(window.myProfileInfo);

        const isAi = VR.micMode === 'ai-audio';
        pill.classList.toggle('ai-mode', isAi);

        if (label) {
            const idleLabel = isAi ? d.aiOn : d.on;
            label.textContent = preview ? `${flag} ${preview}` : `${flag} ${idleLabel}`;
            label.scrollLeft = label.scrollWidth;
        }
        pill.classList.add('active');
        if (micBtn) micBtn.classList.add('hf-vr-mic-live');
        updateModeBarUI();
    }

    function dispatchVoicePhrase(text) {
        const clean = String(text || '').trim();
        if (!clean) return;

        const norm = vidNormalizeForCompare(clean);
        if (!norm) return;

        const now = Date.now();
        if (norm === VR.lastSentNorm && (now - VR.lastSentAt) < 2200) return;
        if (isLikelyEcho(clean)) return;

        VR.lastSentNorm = norm;
        VR.lastSentAt = now;

        const payloadType = (VR.micMode === 'ai-audio') ? 'ai-audio' : 'voice';
        window.sendVideoRoomPayload(clean, payloadType);
    }

    function resetRecognitionFresh(delay = 80) {
        clearTimeout(VR.silenceTimer);
        VR.silenceTimer = null;
        VR.pendingInterim = '';

        if (VR.recognition) {
            try {
                VR.recognition.onresult = null;
                VR.recognition.onend = null;
                VR.recognition.onerror = null;
                VR.recognition.abort();
            } catch (e) {}
            VR.recognition = null;
        }
        if (VR.micActive && !VR.isSpeakingAI && isVideoMode()) {
            scheduleRestart(delay);
        }
    }

    function flushPendingInterim() {
        clearTimeout(VR.silenceTimer);
        VR.silenceTimer = null;

        const phrase = VR.pendingInterim.trim();
        VR.pendingInterim = '';

        updateMicPill('');

        if (!phrase || VR.isSpeakingAI) return;

        dispatchVoicePhrase(phrase);
        resetRecognitionFresh(80);
    }

    function scheduleRestart(delay = 80) {
        if (!VR.micActive || VR.isSpeakingAI || !isVideoMode()) return;
        clearTimeout(VR.micRestartTimer);
        VR.micRestartTimer = setTimeout(() => {
            VR.micRestartTimer = null;
            launchRecognition();
        }, delay);
    }

    function launchRecognition() {
        VR.micRestartTimer = null;
        if (!VR.micActive || !isVideoMode() || VR.isSpeakingAI) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (VR.recognition) {
            try {
                VR.recognition.onresult = null;
                VR.recognition.onend = null;
                VR.recognition.onerror = null;
                VR.recognition.abort();
            } catch (e) {}
            VR.recognition = null;
        }

        VR.pendingInterim = '';

        try {
            const rec = new SpeechRec();
            const roomId = getVideoRoomId();
            const activeLang = getMyManualVideoLang(roomId, 'mic') || getVideoNativeLang(window.myProfileInfo);
            rec.lang = (VID_LANG_MAP[activeLang] && VID_LANG_MAP[activeLang].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length || VR.isSpeakingAI) return;

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
                    clearTimeout(VR.silenceTimer);
                    VR.silenceTimer = null;
                    VR.pendingInterim = '';
                    updateMicPill('');
                    dispatchVoicePhrase(finalTxt);
                    return;
                }

                if (interimTxt) {
                       if (VR.activeChannel !== 'mic' && !isLikelyEcho(interimTxt)) {
                        VR.activeChannel = 'mic';
                        const activeRId = getVideoRoomId() || roomId;
                        if (activeRId) {
                            window.syncMyVideoChannelLang(activeRId, 'mic', undefined, true);
                        } else {
                            renderVideoRoomFlags(activeRId);
                        }
                                        }
                    
                    VR.pendingInterim = interimTxt;
                    updateMicPill(interimTxt);

                    const wordsCount = interimTxt.split(/\s+/).length;
                    if (wordsCount >= VID_MAX_CHUNK_WORDS || interimTxt.length >= VID_MAX_CHUNK_CHARS) {
                        flushPendingInterim();
                        return;
                    }

                    clearTimeout(VR.silenceTimer);
                    VR.silenceTimer = setTimeout(flushPendingInterim, activeLang === 'az' ? 1400 : VID_SILENCE_FLUSH_MS);
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopVideoRoomMic(false);
                    return;
                }
                if (VR.pendingInterim.trim() && !VR.isSpeakingAI) {
                    flushPendingInterim();
                    return;
                }
                if (VR.micActive && !VR.isSpeakingAI) {
                    VR.recognition = null;
                    scheduleRestart(220);
                }
            };

            rec.onend = () => {
                VR.recognition = null;
                if (VR.pendingInterim.trim() && !VR.isSpeakingAI) {
                    const tail = VR.pendingInterim.trim();
                    VR.pendingInterim = '';
                    clearTimeout(VR.silenceTimer);
                    VR.silenceTimer = null;
                    updateMicPill('');
                    dispatchVoicePhrase(tail);
                }
                if (VR.micActive && !VR.isSpeakingAI) {
                    updateMicPill('');
                    scheduleRestart(80);
                }
            };

            VR.recognition = rec;
            rec.start();
        } catch (e) {
            VR.recognition = null;
            if (VR.micActive && !VR.isSpeakingAI) scheduleRestart(300);
        }
    }

    window.startVideoRoomMic = async function (mode = 'ai-audio') {
        if (!isVideoMode()) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        unlockTTSOnGesture();

        const normalizedMode = (mode === 'text' || mode === 'voice') ? 'text' : 'ai-audio';
        VR.micMode = normalizedMode;
        VR.activeChannel = 'mic';

        const activeRoomId = getVideoRoomId();
        if (activeRoomId) window.syncMyVideoChannelLang(activeRoomId, 'mic', undefined, true);
        else renderVideoRoomFlags(activeRoomId);

        if (VR.micActive) {
            updateMicPill('');
            return;
        }

        VR.micActive = true;
        VR.isSpeakingAI = false;
        window.videoRoomMicActive = true;
        window.syncVideoRoomListener();
        updateMicPill('');

        if (typeof window.pauseAgoraMicForTranslation === 'function') {
            await window.pauseAgoraMicForTranslation();
            await new Promise(r => setTimeout(r, 260));
        }

        if (!VR.micActive) return;
        launchRecognition();

        clearInterval(VR.micWatchdog);
        VR.micWatchdog = setInterval(() => {
            if (VR.micActive && !VR.isSpeakingAI && !VR.recognition && !VR.micRestartTimer) {
                launchRecognition();
            }
        }, 2000);
    };

    window.stopVideoRoomMic = async function (skipResumeAgora = false) {
        const wasActive = VR.micActive;
        VR.micActive = false;
        if (isVideoMode()) window.videoRoomMicActive = false;
        clearTimeout(VR.micRestartTimer);
        clearTimeout(VR.silenceTimer);
        clearInterval(VR.micWatchdog);
        VR.micRestartTimer = null;
        VR.silenceTimer = null;
        VR.micWatchdog = null;
        VR.pendingInterim = '';

        if (VR.recognition) {
            try {
                VR.recognition.onresult = null;
                VR.recognition.onend = null;
                VR.recognition.onerror = null;
                VR.recognition.stop();
            } catch (e) {}
            VR.recognition = null;
        }

        if (!wasActive && !isVideoMode()) return;

        updateMicPill('');

        // Возвращаем тумблер обратно на мир аватара на обоих телефонах
        VR.activeChannel = 'avatar';
        const stopRoomId = getVideoRoomId();
        if (stopRoomId) window.syncMyVideoChannelLang(stopRoomId, 'avatar', undefined, true);
        else if (isVideoMode()) renderVideoRoomFlags(stopRoomId);

        if (skipResumeAgora) {
            if (isVideoMode()) window._agoraPausedForTranslation = false;
        } else if (isVideoMode() && typeof window.resumeAgoraMicAfterTranslation === 'function') {
            await window.resumeAgoraMicAfterTranslation();
        }
    };

    window.switchVideoToDirect = async function () {
        if (!isVideoMode()) return;
        stopVideoTTSQueue();
        VR.isSpeakingAI = false;
        await window.stopVideoRoomMic(false);
        updateModeBarUI();
    };

    window.switchVideoToAI = async function () {
        if (!isVideoMode()) return;
        unlockTTSOnGesture();
        await window.startVideoRoomMic('ai-audio');
        updateModeBarUI();
    };

    // ==========================================
    // 7. ПЕРЕХВАТ СОБЫТИЙ СТРОГО ВНУТРИ ВИДЕОКОМНАТЫ
    // ==========================================
    function bindVideoRoomDelegation() {
        const host = document.getElementById('voice-translator');
        if (host && !host.dataset.hfVrDelegated) {
            host.dataset.hfVrDelegated = '1';
            host.addEventListener('click', (e) => {
                if (!isVideoMode()) return;

                if (e.target.closest('#voice-me-photo, #voice-me-flag')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openVideoAvatarLangPanel();
                    return;
                }

                if (e.target.closest('button[onclick*="toggleUniversalMic"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openVideoMicMenu();
                    return;
                }

                if (e.target.closest('button[onclick*="sendFirebaseMsg"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.sendVideoRoomMsg();
                }
            }, true);
        }

        const ecoSelect = document.getElementById('app-lang-select');
        if (ecoSelect && !ecoSelect.dataset.hfVrEcoBound) {
            ecoSelect.dataset.hfVrEcoBound = '1';
            ecoSelect.addEventListener('change', () => {
                setTimeout(() => {
                    if (!isVideoMode()) return;
                    ensureVideoControls();
                    updateMicPill(VR.pendingInterim);
                    const { textEl } = getMarqueeNodes();
                    if (textEl && !VR.marquee.hasRealContent) {
                        textEl.innerHTML = getVideoUiDict().waiting;
                    }
                }, 60);
            });
        }
    }

    function init() {
        bindAIVoiceCallbacks();
        bindVideoRoomDelegation();
        ensureVideoControls();
        updateModeBarUI();

        try { if (window.speechSynthesis) window.speechSynthesis.getVoices(); } catch (e) {}

        document.addEventListener('click', () => {
            if (isVideoMode()) closeAllVideoPopups();
        });

        setInterval(() => {
            bindAIVoiceCallbacks();
            ensureVideoControls();
            if (isVideoMode()) {
                bindVideoRoomDelegation();
                if (isVideoRoomVisibleOrInCall()) {
                    window.syncVideoRoomListener();
                }
                updateVideoRoomFlagsUI();
                updateModeBarUI();
            } else {
                updateVideoRoomFlagsUI();
                closeAllVideoPopups();
            }
        }, 1000);

        document.addEventListener('keydown', (e) => {
            if (!isVideoMode() || e.key !== 'Enter' || !document.activeElement) return;
            if (document.activeElement.id === 'voice-chat-input') {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendVideoRoomMsg();
            }
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.addEventListener('load', () => {
        bindAIVoiceCallbacks();
        ensureVideoControls();
        updateModeBarUI();
    });
})();
