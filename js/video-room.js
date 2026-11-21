// ==========================================
// ФАЙЛ: js/video-room.js (ISOLATED VIDEO WORLD v11)
// Движок 1-в-1 из js/language.js (приват 1-на-1), полностью изолированный:
// - Свои ветки БД: video_rooms / video_active_langs
// - Свои ключи: hf_vid_avatar_lang_ / hf_vid_mic_lang_
// - Два раздельных канала (avatar / mic) + тупое зеркальное копирование
// - Меню строго внутри #voice-translator (фикс планшета) + словарь window.i18n
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
        en: { langTitle: 'Chat Language', autoProfile: 'Auto (Profile)', micTitle: 'Microphone', voiceToText: 'Voice Text', waiting: 'Waiting for voice input...', on: 'ON', stop: 'STOP' },
        ru: { langTitle: 'Язык Чата', autoProfile: 'Авто (Профиль)', micTitle: 'Микрофон', voiceToText: 'Текст голосом', waiting: 'Ожидание голоса...', on: 'ВКЛ', stop: 'СТОП' },
        az: { langTitle: 'Çat Dili', autoProfile: 'Avto (Profil)', micTitle: 'Mikrofon', voiceToText: 'Səsli Mətn', waiting: 'Səs gözlənilir...', on: 'AÇIQ', stop: 'DAYAN' },
        tr: { langTitle: 'Sohbet Dili', autoProfile: 'Oto (Profil)', micTitle: 'Mikrofon', voiceToText: 'Sesli Metin', waiting: 'Ses girişi bekleniyor...', on: 'AÇIK', stop: 'DUR' },
        de: { langTitle: 'Chat-Sprache', autoProfile: 'Auto (Profil)', micTitle: 'Mikrofon', voiceToText: 'Sprachtext', waiting: 'Warten auf Spracheingabe...', on: 'AN', stop: 'STOPP' },
        kk: { langTitle: 'Чат тілі', autoProfile: 'Авто (Профиль)', micTitle: 'Микрофон', voiceToText: 'Дауыстық мәтін', waiting: 'Дауыс күтілуде...', on: 'ҚОСУЛЫ', stop: 'ТОҚТА' },
        ar: { langTitle: 'لغة الدردشة', autoProfile: 'تلقائي (الملف)', micTitle: 'الميكروفون', voiceToText: 'نص صوتي', waiting: 'في انتظار إدخال الصوت...', on: 'تشغيل', stop: 'إيقاف' },
        it: { langTitle: 'Lingua Chat', autoProfile: 'Auto (Profilo)', micTitle: 'Microfono', voiceToText: 'Testo Vocale', waiting: 'In attesa di input vocale...', on: 'ON', stop: 'STOP' },
        es: { langTitle: 'Idioma del Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Micrófono', voiceToText: 'Texto a Voz', waiting: 'Esperando entrada de voz...', on: 'ON', stop: 'PARAR' },
        fr: { langTitle: 'Langue du Chat', autoProfile: 'Auto (Profil)', micTitle: 'Microphone', voiceToText: 'Texte vocal', waiting: "En attente d'entrée vocale...", on: 'ON', stop: 'STOP' },
        pt: { langTitle: 'Idioma do Chat', autoProfile: 'Auto (Perfil)', micTitle: 'Microfone', voiceToText: 'Texto de Voz', waiting: 'Aguardando entrada de voz...', on: 'ON', stop: 'PARAR' },
        ja: { langTitle: 'チャット言語', autoProfile: '自動 (プロフィール)', micTitle: 'マイク', voiceToText: '音声テキスト', waiting: '音声入力を待っています...', on: 'ON', stop: '停止' },
        zh: { langTitle: '聊天语言', autoProfile: '自动 (个人资料)', micTitle: '麦克风', voiceToText: '语音文本', waiting: '等待语音输入...', on: '开', stop: '停止' }
    };

    const VR = {
        queue: [],
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
        micRestartTimer: null,
        micWatchdog: null,
        lastTranscript: '',
        lastTranscriptAt: 0,
        marquee: {
            rafId: null,
            lastTs: 0,
            offsetX: 0,
            speed: 65,
            currentHtml: '',
            passCount: 0,
            initialized: false
        }
    };

    window.HF_VIDEO_ROOM = VR;
    window.videoLiveLangs = {};
    window.videoLiveLangsLoaded = {};

    function isVideoMode() {
        return window.currentActiveCallType === 'video';
    }

    function vidEscapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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

    // СТРОГО ОТ ФЛАГА ПРОФИЛЯ
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

    // Подписи меню привязаны к общему языку экосистемы (window.appLang / window.i18n)
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
            waiting: globalDict.waiting_voice || fb.waiting,
            on: fb.on,
            stop: fb.stop
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

    async function vidTranslateText(text, targetLang) {
        const clean = String(text || '').trim();
        const tl = vidNormLang(targetLang);
        if (!clean || !tl) return clean;
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
                if (joined) return joined;
            }
        } catch (e) {}
        return clean;
    }

    // ==========================================
    // 0. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ ВИДЕОКОМНАТЫ (РАЗДЕЛЬНО: avatar / mic)
    // ==========================================
    window.syncMyVideoChannelLang = function (roomId, channel, forcedLang) {
        if (typeof firebase === 'undefined' || !roomId || !window.myProfileInfo || !window.myProfileInfo.id) return;
        if (channel !== 'avatar' && channel !== 'mic') return;

        const myId = String(window.myProfileInfo.id);
        const activeLang = forcedLang !== undefined
            ? vidNormLang(forcedLang)
            : getMyManualVideoLang(roomId, channel);

        const userRef = firebase.database().ref(`video_active_langs/${roomId}/${myId}`);
        const chRef = userRef.child(channel);

        if (!window.videoLiveLangs[roomId]) window.videoLiveLangs[roomId] = {};
        if (!window.videoLiveLangs[roomId][myId]) window.videoLiveLangs[roomId][myId] = {};

        if (activeLang && VID_LANG_MAP[activeLang]) {
            const payload = {
                langCode: activeLang,
                flagCode: VID_LANG_MAP[activeLang].flagCode,
                flag: VID_LANG_MAP[activeLang].flag,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            window.videoLiveLangs[roomId][myId][channel] = payload;
            chRef.set(payload).catch(() => {});
            try { userRef.onDisconnect().remove(); } catch (e) {}
        } else {
            delete window.videoLiveLangs[roomId][myId][channel];
            chRef.remove().catch(() => {});
        }
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
                updateVideoRoomFlagsUI();
            });
        }

        window.syncMyVideoChannelLang(rId, 'avatar');
        window.syncMyVideoChannelLang(rId, 'mic');
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
        const icon = sourceType === 'voice'
            ? '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem]"></i>'
            : '<i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.65rem]"></i>';

        return (
            `<span class="inline-flex items-center">` +
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

    function updateVideoRoomFlagsUI() {
        if (!isVideoMode()) return;
        const roomId = getVideoRoomId();

        const meFlagEl = document.getElementById('voice-me-flag');
        if (meFlagEl) {
            const myManual = getMyManualVideoLang(roomId, 'avatar');
            const desiredMe = (myManual && VID_LANG_MAP[myManual])
                ? VID_LANG_MAP[myManual].flag
                : getVideoNativeFlag(window.myProfileInfo);
            if (meFlagEl.textContent !== desiredMe) meFlagEl.textContent = desiredMe;
        }

        const friendFlagEl = document.getElementById('voice-friend-flag');
        const target = getVideoTargetUser();
        if (friendFlagEl && target) {
            const roomMap = (roomId && window.videoLiveLangs[roomId]) || {};
            const liveAvatar = roomMap[String(target.id)] && roomMap[String(target.id)].avatar;
            const desiredFriend = (liveAvatar && vidIsRealFlag(liveAvatar.flag))
                ? liveAvatar.flag
                : getVideoNativeFlag(target);
            if (friendFlagEl.textContent !== desiredFriend) friendFlagEl.textContent = desiredFriend;
        }
    }

    // ==========================================
    // 1. СТИЛИ И ПАНЕЛИ СТРОГО ВНУТРИ #voice-translator (#phone-body)
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
        if (document.getElementById('hf-vr-v11-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-vr-v11-styles';
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
            #hf-vr-mic-slot {
                width: 100%;
                flex: 1 1 auto;
                min-height: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
                padding: 4px 12px;
                z-index: 30;
            }
            #hf-vr-mic-pill {
                display: none;
                align-items: center;
                gap: 8px;
                pointer-events: auto;
                background: rgba(17, 27, 33, 0.96);
                border: 1.5px solid #ef4444;
                color: #fff;
                padding: 7px 14px;
                border-radius: 999px;
                box-shadow: 0 8px 26px rgba(239, 68, 68, 0.4);
                font-size: 0.76rem;
                font-weight: 700;
                max-width: 94%;
                white-space: nowrap;
            }
            #hf-vr-mic-pill.active { display: inline-flex; }
            #hf-vr-mic-pill .dot {
                width: 9px; height: 9px; border-radius: 50%;
                background: #ef4444; flex-shrink: 0;
                animation: hfVrPulse 1s infinite;
            }
            #hf-vr-mic-pill .stop-btn {
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
                z-index: 9990;
                display: none;
                background: #111b21;
                border: 1.5px solid #00a884;
                border-radius: 16px;
                box-shadow: 0 12px 34px rgba(0,0,0,0.8);
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
                width: 230px;
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

    // МЕНЮ АВАТАРА (КАНАЛ avatar — СТРОГО ДЛЯ ЭТОЙ ВИДЕОКОМНАТЫ)
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
                if (rId) {
                    const key = getVideoChannelStorageKey(rId, 'avatar');
                    if (chosen === 'auto') localStorage.removeItem(key);
                    else localStorage.setItem(key, chosen);
                    window.syncMyVideoChannelLang(rId, 'avatar', chosen === 'auto' ? null : chosen);
                }
                updateVideoRoomFlagsUI();
                modal.classList.remove('active');
            };
        });

        modal.classList.add('active');
    }

    // МЕНЮ МИКРОФОНА (КАНАЛ mic — СТРОГО ДЛЯ ЭТОЙ ВИДЕОКОМНАТЫ)
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
            <select id="hf-vr-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:10px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-vr-mic-start-btn" style="width:100%;background:#00a884;color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone"></i> ${vidEscapeHtml(d.voiceToText)}
            </button>
        `;

        popup.querySelector('#hf-vr-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-vr-mic-select').onchange = (e) => {
            const val = e.target.value;
            const rId = getVideoRoomId();
            if (rId) {
                const key = getVideoChannelStorageKey(rId, 'mic');
                if (!val || val === 'auto') localStorage.removeItem(key);
                else localStorage.setItem(key, val);
                window.syncMyVideoChannelLang(rId, 'mic', (!val || val === 'auto') ? null : val);
            }
            updateMicPill();
        };
        popup.querySelector('#hf-vr-mic-start-btn').onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            window.startVideoRoomMic();
        };

        popup.classList.add('active');
    }

    // ==========================================
    // 2. БЕГУЩАЯ СТРОКА ВИДЕОКОМНАТЫ (ОЧЕРЕДЬ)
    // ==========================================
    function getMarqueeNodes() {
        return {
            container: document.getElementById('voice-marquee-container-anim'),
            textEl: document.getElementById('voice-info-marquee')
        };
    }

    function loadNextMarquee(resetRight = true) {
        const { container, textEl } = getMarqueeNodes();
        if (!container || !textEl) return;

        if (VR.queue.length > 0) {
            const next = VR.queue.shift();
            VR.marquee.currentHtml = next;
            VR.marquee.passCount = 0;
            textEl.innerHTML = next;
        }
        if (resetRight) {
            VR.marquee.offsetX = (container.clientWidth || 300) + 16;
            textEl.style.transform = `translate3d(${VR.marquee.offsetX}px, 0, 0)`;
        }
    }

    function marqueeLoop(ts) {
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
            VR.marquee.currentHtml = textEl.innerHTML;
            VR.marquee.offsetX = cw;
        }

        VR.marquee.offsetX -= VR.marquee.speed * dt;
        if (VR.marquee.offsetX < -(tw + 24)) {
            VR.marquee.passCount += 1;
            if (VR.queue.length > 0) loadNextMarquee(true);
            else VR.marquee.offsetX = cw + 16;
        }
        textEl.style.transform = `translate3d(${VR.marquee.offsetX}px, 0, 0)`;
    }

    function startMarqueeEngine() {
        injectStyles();
        if (VR.marquee.rafId) return;
        VR.marquee.lastTs = 0;
        VR.marquee.rafId = requestAnimationFrame(marqueeLoop);
    }

    function pushVideoMarquee(html) {
        if (!html) return;
        startMarqueeEngine();
        VR.queue.push(html);
        const isPlaceholder = !VR.marquee.currentHtml || VR.marquee.currentHtml.indexOf('img src=') === -1;
        if (isPlaceholder || VR.marquee.passCount >= 1) {
            loadNextMarquee(true);
        }
    }

    window.resetVideoRoomState = function () {
        if (VR.micActive) window.stopVideoRoomMic(true);
        VR.queue = [];
        VR.seenKeys.clear();
        VR.marquee.currentHtml = '';
        VR.marquee.passCount = 0;
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

        const { textEl } = getMarqueeNodes();
        if (textEl) textEl.innerHTML = getVideoUiDict().waiting;
    };

    // ==========================================
    // 3. ОТПРАВКА (КАНАЛ avatar / mic — ЗЕРКАЛЬНЫЙ ПАКЕТ, КАК В language.js)
    // ==========================================
    window.sendVideoRoomPayload = async function (rawText, sourceType = 'keyboard') {
        if (!isVideoMode()) return;
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;

        window.syncVideoRoomListener();
        const roomId = getVideoRoomId();
        if (!roomId) return;

        window.initVideoLiveLangSync(roomId);

        const isVoice = (sourceType === 'voice');
        const channel = isVoice ? 'mic' : 'avatar';

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

        // Текст отправителя приводим к языку его активного флага (как в language.js)
        const myBaseText = isVoice
            ? cleanText
            : await vidTranslateText(cleanText, myActiveLang);

        // Живой флаг собеседника СТРОГО в том же канале (avatar или mic)
        const targetUser = getVideoTargetUser();
        const targetInfo = await getTargetLiveVideoChannel(roomId, targetUser, channel);

        let textToShip = myBaseText;
        if (targetInfo.lang && targetInfo.lang !== myActiveLang) {
            textToShip = await vidTranslateText(myBaseText, targetInfo.lang);
        }

        // Готовая зеркальная бегущая дорожка — одна на двоих
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
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendVideoRoomPayload(raw, 'keyboard');
    };

    // ==========================================
    // 4. ПРИЁМ: ТУПОЕ ЗЕРКАЛЬНОЕ КОПИРОВАНИЕ (БЕЗ ПОВТОРНЫХ ПЕРЕВОДОВ)
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

        const marqueeHtml = data.mirrorMarquee || buildVideoMirrorMarquee(
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

        pushVideoMarquee(marqueeHtml);
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
    // 5. МИКРОФОН ВИДЕОКОМНАТЫ (КАНАЛ mic + ПАУЗА AGORA)
    // ==========================================
    function ensureMicPill() {
        injectStyles();
        const d = getVideoUiDict();
        let pill = document.getElementById('hf-vr-mic-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'hf-vr-mic-pill';
            pill.innerHTML = `
                <span class="dot"></span>
                <span id="hf-vr-mic-label"></span>
                <button type="button" class="stop-btn" id="hf-vr-stop-btn" onclick="event.stopPropagation(); window.stopVideoRoomMic(false)">${vidEscapeHtml(d.stop)}</button>
            `;
        } else {
            const stopBtn = pill.querySelector('#hf-vr-stop-btn');
            if (stopBtn) stopBtn.textContent = d.stop;
        }

        const remoteVid = document.getElementById('direct-remote-video');
        const friendPhoto = document.getElementById('voice-friend-photo');
        const videoRow = (remoteVid && remoteVid.parentElement) ? remoteVid.parentElement.parentElement : null;
        const footer = friendPhoto ? friendPhoto.closest('.mt-auto') : null;

        if (videoRow && footer && videoRow.parentNode === footer.parentNode) {
            let slot = document.getElementById('hf-vr-mic-slot');
            if (!slot) {
                slot = document.createElement('div');
                slot.id = 'hf-vr-mic-slot';
                videoRow.parentNode.insertBefore(slot, footer);
            }
            if (pill.parentNode !== slot) slot.appendChild(pill);
            return pill;
        }
        const host = getVideoHost();
        if (pill.parentNode !== host) host.appendChild(pill);
        return pill;
    }

    function updateMicPill(preview = '') {
        const pill = ensureMicPill();
        const label = document.getElementById('hf-vr-mic-label');
        const micBtn = getVideoMicBtn();

        if (!VR.micActive) {
            pill.classList.remove('active');
            if (micBtn) micBtn.classList.remove('hf-vr-mic-live');
            return;
        }

        const d = getVideoUiDict();
        const roomId = getVideoRoomId();
        const manualMic = getMyManualVideoLang(roomId, 'mic');
        const flag = (manualMic && VID_LANG_MAP[manualMic])
            ? VID_LANG_MAP[manualMic].flag
            : getVideoNativeFlag(window.myProfileInfo);

        if (label) {
            label.textContent = preview ? `${flag} ${preview}` : `${flag} ${d.on}`;
        }
        pill.classList.add('active');
        if (micBtn) micBtn.classList.add('hf-vr-mic-live');
    }

    function scheduleRestart(delay = 180) {
        if (!VR.micActive) return;
        clearTimeout(VR.micRestartTimer);
        VR.micRestartTimer = setTimeout(() => {
            VR.micRestartTimer = null;
            launchRecognition();
        }, delay);
    }

    function launchRecognition() {
        VR.micRestartTimer = null;
        if (!VR.micActive || !isVideoMode()) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (VR.recognition) {
            try { VR.recognition.onend = null; VR.recognition.onerror = null; VR.recognition.abort(); } catch (e) {}
            VR.recognition = null;
        }

        try {
            const rec = new SpeechRec();
            const roomId = getVideoRoomId();
            const activeLang = getMyManualVideoLang(roomId, 'mic') || getVideoNativeLang(window.myProfileInfo);
            rec.lang = (VID_LANG_MAP[activeLang] && VID_LANG_MAP[activeLang].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length) return;
                let finalTxt = '';
                let interimTxt = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const chunk = (event.results[i][0] && event.results[i][0].transcript) || '';
                    if (event.results[i].isFinal) finalTxt += ' ' + chunk;
                    else interimTxt += ' ' + chunk;
                }
                interimTxt = interimTxt.trim();
                finalTxt = finalTxt.trim();

                if (interimTxt) updateMicPill(interimTxt);
                if (finalTxt) {
                    updateMicPill('');
                    const now = Date.now();
                    if (finalTxt === VR.lastTranscript && (now - VR.lastTranscriptAt) < 1200) return;
                    VR.lastTranscript = finalTxt;
                    VR.lastTranscriptAt = now;
                    window.sendVideoRoomPayload(finalTxt, 'voice');
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopVideoRoomMic(false);
                    return;
                }
                if (VR.micActive) {
                    VR.recognition = null;
                    scheduleRestart(300);
                }
            };

            rec.onend = () => {
                VR.recognition = null;
                if (VR.micActive) {
                    updateMicPill('');
                    scheduleRestart(180);
                }
            };

            VR.recognition = rec;
            rec.start();
        } catch (e) {
            VR.recognition = null;
            if (VR.micActive) scheduleRestart(400);
        }
    }

    window.startVideoRoomMic = async function () {
        if (!isVideoMode()) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (VR.micActive) {
            updateMicPill();
            return;
        }

        VR.micActive = true;
        window.syncVideoRoomListener();
        updateMicPill();

        if (typeof window.pauseAgoraMicForTranslation === 'function') {
            await window.pauseAgoraMicForTranslation();
            await new Promise(r => setTimeout(r, 320));
        }

        if (!VR.micActive) return;
        launchRecognition();

        clearInterval(VR.micWatchdog);
        VR.micWatchdog = setInterval(() => {
            if (VR.micActive && !VR.recognition && !VR.micRestartTimer) {
                launchRecognition();
            }
        }, 2500);
    };

    window.stopVideoRoomMic = async function (skipResumeAgora = false) {
        VR.micActive = false;
        clearTimeout(VR.micRestartTimer);
        clearInterval(VR.micWatchdog);
        VR.micRestartTimer = null;
        VR.micWatchdog = null;

        if (VR.recognition) {
            try { VR.recognition.onend = null; VR.recognition.onerror = null; VR.recognition.stop(); } catch (e) {}
            VR.recognition = null;
        }
        updateMicPill();

        if (skipResumeAgora) {
            window._agoraPausedForTranslation = false;
        } else if (typeof window.resumeAgoraMicAfterTranslation === 'function') {
            await window.resumeAgoraMicAfterTranslation();
        }
    };

    // ==========================================
    // 6. ПЕРЕХВАТ СОБЫТИЙ СТРОГО ВНУТРИ ВИДЕОКОМНАТЫ
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
                    if (VR.micActive) window.stopVideoRoomMic(false);
                    else openVideoMicMenu();
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
                    updateMicPill();
                    const { textEl } = getMarqueeNodes();
                    if (textEl && (!VR.marquee.currentHtml || VR.marquee.currentHtml.indexOf('img src=') === -1)) {
                        textEl.innerHTML = getVideoUiDict().waiting;
                    }
                }, 60);
            });
        }
    }

    function init() {
        startMarqueeEngine();
        bindVideoRoomDelegation();

        document.addEventListener('click', () => {
            if (isVideoMode()) closeAllVideoPopups();
        });

        setInterval(() => {
            if (isVideoMode()) {
                window.syncVideoRoomListener();
                bindVideoRoomDelegation();
                updateVideoRoomFlagsUI();
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
})();
