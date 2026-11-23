// =======================================================
// КОНФЕРЕНЦИЯ (РОДНАЯ СЕТКА + УМНЫЙ ИИ-ГОЛОС + ВХОДЯЩИЕ КАМЕРЫ)
// =======================================================

(function () {
    'use strict';

    const CONF_LANG_MAP = {
        en: ['gb', '🇬🇧'], kk: ['kz', '🇰🇿'], ru: ['ru', '🇷🇺'], az: ['az', '🇦🇿'],
        de: ['de', '🇩🇪'], tr: ['tr', '🇹🇷'], ar: ['ae', '🇦🇪'], it: ['it', '🇮🇹'],
        es: ['es', '🇪🇸'], fr: ['fr', '🇫🇷'], pt: ['pt', '🇵🇹'], ja: ['jp', '🇯🇵'], zh: ['cn', '🇨🇳']
    };

    const FLAG_EMOJI_TO_LANG = {
        '🇬🇧': 'en', '🇺🇸': 'en', '🇰🇿': 'kk', '🇷🇺': 'ru', '🇦🇿': 'az',
        '🇩🇪': 'de', '🇹🇷': 'tr', '🇦🇪': 'ar', '🇸🇦': 'ar', '🇮🇹': 'it',
        '🇪🇸': 'es', '🇫🇷': 'fr', '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
    };

    const CONF_SPEECH_LOCALE = {
        en: 'en-US', ru: 'ru-RU', az: 'az-AZ', tr: 'tr-TR', de: 'de-DE', kk: 'kk-KZ',
        ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
    };

    const CONF_13_LANGS = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
        { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'ar', name: 'العربية', flag: '🇦🇪' },
        { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];

    const MAX_GUEST_SLOTS = 12;

    const state = {
        isActive: false,
        isJoining: false,
        chatListenerBound: false,
        mode: 'voice', // 'voice' | 'ai'
        camEnabled: true,
        aiMicRunning: false,
        aiMicPausedByTyping: false,
        echoGuardActive: false,
        recognition: null,
        client: null,
        myAgoraUid: null,
        audioTrack: null,
        videoTrack: null,
        remoteAudioTracks: {},
        remoteVideoTracks: {},
        subscribingKeys: new Set(),
        slots: new Array(MAX_GUEST_SLOTS).fill(null),
        activeUsersMap: {},
        processedKeys: new Set(),
        presenceRef: null,
        usersListenerRef: null,
        chatListenerRef: null,
        translateCache: new Map()
    };

    window._confState = state;

    // -------------------------------------------------------
    // 1. ОПРЕДЕЛЕНИЕ ФЛАГА И ЯЗЫКА
    // -------------------------------------------------------
    function confNormLang(code) {
        if (!code || code === 'auto' || code === 'un') return null;
        const raw = String(code).trim();
        if (FLAG_EMOJI_TO_LANG[raw]) return FLAG_EMOJI_TO_LANG[raw];
        const c = raw.split(/[-_]/)[0].substring(0, 2).toLowerCase();
        const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', us: 'en', gb: 'en', uk: 'en', br: 'pt', mx: 'es' };
        return fix[c] || c;
    }

    function getConfNativeLang() {
        const p = window.myProfileInfo;
        if (p) {
            const pf = p.flag ? String(p.flag).trim() : '';
            if (pf && FLAG_EMOJI_TO_LANG[pf]) return FLAG_EMOJI_TO_LANG[pf];
            if (p.flagCode) {
                const byCode = confNormLang(p.flagCode);
                if (byCode) return byCode;
            }
            if (typeof window.getLangByFlag === 'function') {
                const byFlag = confNormLang(window.getLangByFlag(p.flagCode, p.flag));
                if (byFlag) return byFlag;
            }
            if (typeof window.getSmartLang === 'function') {
                const smart = confNormLang(window.getSmartLang(p));
                if (smart) return smart;
            }
        }
        if (typeof window.getLangPref === 'function') {
            const pref = confNormLang(window.getLangPref(false, true));
            if (pref) return pref;
        }
        return confNormLang(window.appLang) || 'ru';
    }

    function getConfAvatarLang() {
        return confNormLang(localStorage.getItem('hf_conf_avatar_lang'));
    }

    function getConfMicLang() {
        return confNormLang(localStorage.getItem('hf_conf_mic_lang'));
    }

    function getConfReadLang() {
        return confNormLang(localStorage.getItem('hf_conf_read_lang')) || getConfAvatarLang() || getConfNativeLang();
    }

    function getConfReadFlag() {
        const explicit = getConfAvatarLang() || confNormLang(localStorage.getItem('hf_conf_read_lang'));
        if (explicit && CONF_LANG_MAP[explicit]) return CONF_LANG_MAP[explicit][1];
        if (window.myProfileInfo && window.myProfileInfo.flag) return String(window.myProfileInfo.flag).trim();
        const lang = getConfReadLang();
        return (CONF_LANG_MAP[lang] ? CONF_LANG_MAP[lang][1] : '🌐');
    }

    function getConfReadFlagCode() {
        const explicit = getConfAvatarLang() || confNormLang(localStorage.getItem('hf_conf_read_lang'));
        if (explicit && CONF_LANG_MAP[explicit]) return CONF_LANG_MAP[explicit][0];
        if (window.myProfileInfo && window.myProfileInfo.flagCode) return String(window.myProfileInfo.flagCode).trim().toLowerCase();
        const lang = getConfReadLang();
        return (CONF_LANG_MAP[lang] ? CONF_LANG_MAP[lang][0] : 'un');
    }

    function getMyUid() {
        return (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : '';
    }

    // -------------------------------------------------------
    // 2. СЛОВАРЬ ПРИГЛАШЕНИЙ
    // -------------------------------------------------------
    window.confDict = {
        ru: { title: 'ПРИГЛАШЕНИЕ', desc: 'ждет вас в видеокомнату!', btn: 'Войти', no: 'Позже' },
        en: { title: 'INVITATION', desc: 'is waiting for you in the video room!', btn: 'Join', no: 'Later' },
        it: { title: 'INVITO', desc: 'ti aspetta nella stanza video!', btn: 'Entra', no: 'Più tardi' },
        es: { title: 'INVITACIÓN', desc: 'te espera en la sala de video!', btn: 'Unirse', no: 'Más tarde' },
        fr: { title: 'INVITATION', desc: 'vous attend dans le salon vidéo!', btn: 'Rejoindre', no: 'Plus tard' },
        de: { title: 'EINLADUNG', desc: 'wartet auf dich im Videoraum!', btn: 'Beitreten', no: 'Später' },
        pt: { title: 'CONVITE', desc: 'espera por você na sala de vídeo!', btn: 'Entrar', no: 'Mais tarde' },
        tr: { title: 'DAVET', desc: 'seni video odasında bekliyor!', btn: 'Katıl', no: 'Sonra' },
        az: { title: 'DƏVƏT', desc: 'sizi video otaqda gözləyir!', btn: 'Qoşul', no: 'Sonra' },
        kk: { title: 'ШАҚЫРУ', desc: 'сізді бейнебөлмеде күтуде!', btn: 'Қосылу', no: 'Кейін' },
        ar: { title: 'دعوة', desc: 'ينتظرك في غرفة الفيديو!', btn: 'انضمام', no: 'لاحقاً' },
        ja: { title: '招待', desc: 'ビデオ会議でお待ちしています！', btn: '参加', no: '後で' },
        zh: { title: '邀请', desc: '在视频房间等您！', btn: '加入', no: '稍后' }
    };

    window.getConfTranslation = function (key) {
        const uiLang = confNormLang(window.appLang) || getConfNativeLang() || 'en';
        if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
            const globalText = i18next.t(`conference.${key}`);
            if (globalText && globalText !== `conference.${key}`) return globalText;
        }
        const dict = window.confDict[uiLang] || window.confDict.en;
        return dict[key] || '';
    };

    // -------------------------------------------------------
    // 3. СТИЛИ ТОЛЬКО ДЛЯ ШАПКИ И ВИДЕО-КОНТЕЙНЕРА (СЕТКУ НЕ ТРОГАЕМ)
    // -------------------------------------------------------
    function injectConfHeaderStyles() {
        const oldBroken = document.getElementById('hf-conf-isolated-styles');
        if (oldBroken) oldBroken.remove();

        if (document.getElementById('hf-conf-header-only-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-conf-header-only-styles';
        style.textContent = `
            .conf-remote-video-box video {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
            }
            .conf-teleprompter-wrap {
                flex: 1;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 100%);
                -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 100%);
            }
            .conf-teleprompter-text {
                display: inline-block;
                white-space: nowrap;
                font-size: 0.78rem;
                font-weight: 600;
                color: #e9edef;
            }
            .conf-mode-pill {
                display: inline-flex;
                align-items: center;
                background: #0b141a;
                border: 1px solid #2a3942;
                border-radius: 9999px;
                padding: 2px;
                shrink: 0;
            }
            .conf-mode-btn {
                padding: 4px 10px;
                border-radius: 9999px;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.03em;
                transition: all 0.15s ease;
                color: #8696a0;
            }
            .conf-mode-btn.active-voice {
                background: #00a884;
                color: #111b21;
            }
            .conf-mode-btn.active-ai {
                background: #eab308;
                color: #111b21;
            }
            .conf-isolated-mic-popup {
                position: absolute;
                bottom: 62px;
                right: 12px;
                background: #111b21;
                border: 1px solid #2a3942;
                border-radius: 18px;
                padding: 12px;
                display: none;
                flex-direction: column;
                gap: 8px;
                z-index: 9999;
                min-width: 225px;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
            }
            .conf-isolated-mic-popup.active {
                display: flex;
            }
        `;
        document.head.appendChild(style);
    }

    // -------------------------------------------------------
    // 4. ВЕРХНЯЯ ПАНЕЛЬ (МИКРОФОН СЛЕВА + VOICE / AI СПРАВА)
    // -------------------------------------------------------
    function ensureConfHeaderBar() {
        const confPage = document.getElementById('conference');
        if (!confPage) return;

        const topBar = confPage.firstElementChild;
        if (!topBar || topBar.dataset.hfConfHeaderReady === '1') return;

        topBar.dataset.hfConfHeaderReady = '1';
        topBar.className = 'flex items-center justify-between gap-2 px-3 py-2 bg-[#111b21] border-b border-[#202c33] shrink-0';

        const flagEmoji = getConfReadFlag();
        topBar.innerHTML = `
            <div id="conf-live-mic-pill" class="flex items-center gap-2 flex-1 min-w-0 bg-[#202c33] border border-[#2a3942] rounded-full px-2 py-1">
                <button id="conf-ai-mic-btn" type="button" onclick="window.toggleConfLiveMic()" title="AI Mic"
                    class="w-7 h-7 rounded-full bg-[#111b21] text-[#8696a0] flex items-center justify-center shrink-0 border border-[#2a3942] transition">
                    <i class="fa-solid fa-microphone text-xs"></i>
                </button>
                <span id="conf-header-flag" class="text-sm shrink-0">${flagEmoji}</span>
                <div id="conf-live-speech-wrap" class="conf-teleprompter-wrap">
                    <span id="conf-live-speech-text" class="conf-teleprompter-text text-[#8696a0]">Voice Direct • Live</span>
                </div>
            </div>
            <div id="conf-mode-switch" class="conf-mode-pill shrink-0">
                <button id="conf-btn-mode-voice" type="button" onclick="window.setConfMode('voice')" class="conf-mode-btn active-voice">Voice</button>
                <button id="conf-btn-mode-ai" type="button" onclick="window.setConfMode('ai')" class="conf-mode-btn">AI</button>
            </div>
        `;
    }

    function updateHeaderTeleprompter(text, isLiveSpeech) {
        const wrap = document.getElementById('conf-live-speech-wrap');
        const label = document.getElementById('conf-live-speech-text');
        const micBtn = document.getElementById('conf-ai-mic-btn');
        const flagEl = document.getElementById('conf-header-flag');

        if (flagEl) flagEl.textContent = getConfReadFlag();

        if (micBtn) {
            if (state.mode === 'ai' && state.aiMicRunning && !state.aiMicPausedByTyping) {
                micBtn.className = 'w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 animate-pulse transition';
                micBtn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
            } else if (state.mode === 'ai') {
                micBtn.className = 'w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/50 transition';
                micBtn.innerHTML = '<i class="fa-solid fa-microphone text-xs"></i>';
            } else {
                micBtn.className = 'w-7 h-7 rounded-full bg-[#111b21] text-[#8696a0] flex items-center justify-center shrink-0 border border-[#2a3942] transition';
                micBtn.innerHTML = '<i class="fa-solid fa-microphone text-xs"></i>';
            }
        }

        if (label) {
            label.textContent = text;
            label.style.color = isLiveSpeech ? '#ffffff' : (state.mode === 'ai' ? '#facc15' : '#8696a0');
        }
        if (wrap) {
            wrap.scrollLeft = wrap.scrollWidth;
        }
    }

    // -------------------------------------------------------
    // 5. ПЕРЕКЛЮЧАТЕЛЬ VOICE / AI И УМНАЯ МАРШРУТИЗАЦИЯ ПО ФЛАГАМ
    // -------------------------------------------------------
    window.setConfMode = function (newMode) {
        state.mode = (newMode === 'ai') ? 'ai' : 'voice';

        const btnVoice = document.getElementById('conf-btn-mode-voice');
        const btnAi = document.getElementById('conf-btn-mode-ai');
        if (btnVoice) btnVoice.className = 'conf-mode-btn' + (state.mode === 'voice' ? ' active-voice' : '');
        if (btnAi) btnAi.className = 'conf-mode-btn' + (state.mode === 'ai' ? ' active-ai' : '');

        syncConfAudioRouting();

        if (state.mode === 'ai') {
            state.aiMicPausedByTyping = false;
            startContinuousConfAIMic();
        } else {
            stopContinuousConfAIMic();
            if (typeof window.stopVoiceAI === 'function') window.stopVoiceAI();
            updateHeaderTeleprompter('Voice Direct • Live', false);
        }
    };

    window.toggleConfLiveMic = function () {
        if (state.mode !== 'ai') {
            window.setConfMode('ai');
            return;
        }
        if (state.aiMicRunning) {
            stopContinuousConfAIMic();
            updateHeaderTeleprompter('AI Mic Paused', false);
        } else {
            state.aiMicPausedByTyping = false;
            startContinuousConfAIMic();
        }
    };

    function findUserByAgoraUid(agoraUid) {
        const aStr = String(agoraUid);
        const ids = Object.keys(state.activeUsersMap);
        for (let i = 0; i < ids.length; i++) {
            const u = state.activeUsersMap[ids[i]];
            if (!u) continue;
            if ((u.agoraUid !== undefined && String(u.agoraUid) === aStr) || String(u.id) === aStr) {
                return u;
            }
        }
        if (ids.length === 1) {
            return state.activeUsersMap[ids[0]];
        }
        return null;
    }

    function syncConfAudioRouting() {
        const myLang = getConfReadLang();
        const myFlag = getConfReadFlag();

        Object.keys(state.remoteAudioTracks).forEach(agoraUid => {
            const track = state.remoteAudioTracks[agoraUid];
            if (!track) return;

            if (state.mode === 'voice') {
                try { track.setVolume(100); } catch (e) {}
                return;
            }

            const userInfo = findUserByAgoraUid(agoraUid);
            const userLang = userInfo ? (confNormLang(userInfo.langCode) || confNormLang(userInfo.flag) || confNormLang(userInfo.flagCode)) : null;
            const userFlag = userInfo ? String(userInfo.flag || '').trim() : '';

            const isSameFlag = (userFlag && myFlag && userFlag === myFlag) || (userLang && myLang && userLang === myLang);
            try { track.setVolume(isSameFlag ? 100 : 0); } catch (e) {}
        });
    }

    // -------------------------------------------------------
    // 6. НЕПРЕРЫВНЫЙ AI-МИКРОФОН + ЗАЩИТА ОТ ЭХА ЧЕРЕЗ РОДНОЙ voice.js
    // -------------------------------------------------------
    function hookNativeAIVoiceEchoGuard() {
        if (window._confEchoGuardHooked) return;
        window._confEchoGuardHooked = true;

        const origStart = window.onAIVoiceStart;
        const origEnd = window.onAIVoiceEnd;

        window.onAIVoiceStart = function () {
            if (typeof origStart === 'function') origStart.apply(this, arguments);
            if (state.isActive && state.mode === 'ai' && state.aiMicRunning) {
                state.echoGuardActive = true;
                stopContinuousConfAIMic();
            }
        };

        window.onAIVoiceEnd = function () {
            if (typeof origEnd === 'function') origEnd.apply(this, arguments);
            if (state.echoGuardActive) {
                state.echoGuardActive = false;
                if (state.isActive && state.mode === 'ai' && !state.aiMicPausedByTyping) {
                    setTimeout(startContinuousConfAIMic, 250);
                }
            }
        };
    }

    function startContinuousConfAIMic() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            updateHeaderTeleprompter('Speech API недоступен', false);
            return;
        }
        if (state.aiMicRunning || state.aiMicPausedByTyping || state.echoGuardActive) return;

        const recBase = getConfMicLang() || getConfReadLang() || getConfNativeLang();
        const rec = new SpeechRecognition();
        rec.lang = CONF_SPEECH_LOCALE[recBase] || recBase;
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        state.recognition = rec;
        state.aiMicRunning = true;
        updateHeaderTeleprompter('● Слушаю...', false);

        rec.onresult = (event) => {
            let interim = '';
            let finalChunk = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalChunk += transcript;
                else interim += transcript;
            }

            if (interim.trim()) {
                updateHeaderTeleprompter('● ' + interim.trim(), true);
            }

            if (finalChunk.trim()) {
                const cleanFinal = finalChunk.trim();
                updateHeaderTeleprompter('✓ ' + cleanFinal, true);
                pushConfMessage(cleanFinal, recBase);
            }
        };

        rec.onerror = (e) => {
            const err = (e && e.error) ? e.error : '';
            if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
                state.aiMicRunning = false;
                updateHeaderTeleprompter('Микрофон недоступен (' + err + ')', false);
            }
        };

        rec.onend = () => {
            const shouldRestart = state.isActive && state.mode === 'ai' && state.aiMicRunning && !state.aiMicPausedByTyping && !state.echoGuardActive;
            state.aiMicRunning = false;
            if (shouldRestart) {
                setTimeout(() => {
                    if (state.isActive && state.mode === 'ai' && !state.aiMicPausedByTyping && !state.echoGuardActive) {
                        startContinuousConfAIMic();
                    }
                }, 250);
            } else if (state.mode === 'ai' && state.aiMicPausedByTyping) {
                updateHeaderTeleprompter('Пауза (ввод текста)', false);
            }
        };

        try {
            rec.start();
        } catch (e) {
            state.aiMicRunning = false;
        }
    }

    function stopContinuousConfAIMic() {
        state.aiMicRunning = false;
        if (state.recognition) {
            try { state.recognition.onend = null; state.recognition.abort(); } catch (e) {}
            state.recognition = null;
        }
    }

    // -------------------------------------------------------
    // 7. РОДНАЯ СЕТКА .video-grid (1 ГЛАВНОЕ + 12 СЛОТОВ)
    // -------------------------------------------------------
    function refreshMyFrameIdentity() {
        const myReadLang = getConfReadLang();
        const myReadFlag = getConfReadFlag();
        const myFlagCode = getConfReadFlagCode();

        const flagImg = document.getElementById('my-conf-flag-img');
        if (flagImg) flagImg.src = `https://flagcdn.com/w40/${myFlagCode}.png`;

        const headerFlag = document.getElementById('conf-header-flag');
        if (headerFlag) headerFlag.textContent = myReadFlag;

        const nameEl = document.getElementById('my-conf-username');
        if (nameEl && window.myUsername) nameEl.textContent = window.myUsername;

        const speakerMarquee = document.getElementById('speaker-marquee');
        if (speakerMarquee) {
            speakerMarquee.setAttribute('data-lang', myReadLang);
            speakerMarquee.setAttribute('data-flag', myReadFlag);
        }
    }

    window.initConference = function () {
        injectConfHeaderStyles();
        ensureConfHeaderBar();
        hookNativeAIVoiceEchoGuard();

        const confGrid = document.getElementById('conference-grid');
        if (!confGrid) return;

        confGrid.classList.remove('hf-conf-grid-13');

        if (!confGrid.dataset.gridMounted) {
            confGrid.dataset.gridMounted = '1';
            const myReadLang = getConfReadLang();
            const myReadFlag = getConfReadFlag();
            const myFlagCode = getConfReadFlagCode();

            let html = `
                <div class="video-frame main" id="my-video-container" onclick="window.openConfLangModal()">
                    <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted></video>
                    <div id="my-conf-username" class="video-overlay">${window.myUsername || 'Me'}</div>
                    <div class="flag-overlay" style="top:8px; right:8px;">
                        <img id="my-conf-flag-img" src="https://flagcdn.com/w40/${myFlagCode}.png" class="w-6 rounded-sm border border-[#2a3942]">
                    </div>
                    <div class="translation-bar">
                        <div id="speaker-marquee" class="conf-marquee-text conf-listener-marquee" data-lang="${myReadLang}" data-flag="${myReadFlag}" style="animation-duration: 28s;">
                            ${myReadFlag} Готов к конференции...
                        </div>
                    </div>
                </div>
            `;

            for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
                html += `
                    <div id="conf-slot-${i}" class="video-frame relative overflow-hidden opacity-60">
                        <div class="absolute inset-0 flex items-center justify-center bg-[#0b141a]">
                            <i class="fa-solid fa-user text-2xl text-[#2a3942]"></i>
                        </div>
                    </div>
                `;
            }

            confGrid.innerHTML = html;
        } else {
            refreshMyFrameIdentity();
        }

        bindConfControls();
        mountIsolatedConfMicPopup();
    };

    function renderGuestSlot(slotIndex, user) {
        const slotEl = document.getElementById(`conf-slot-${slotIndex}`);
        if (!slotEl) return;

        if (!user) {
            slotEl.className = 'video-frame relative overflow-hidden opacity-60';
            slotEl.removeAttribute('data-uid');
            slotEl.innerHTML = `
                <div class="absolute inset-0 flex items-center justify-center bg-[#0b141a]">
                    <i class="fa-solid fa-user text-2xl text-[#2a3942]"></i>
                </div>
            `;
            return;
        }

        const uid = String(user.id);
        const uLang = confNormLang(user.langCode) || confNormLang(user.flag) || confNormLang(user.flagCode) || 'en';
        const uFlag = String(user.flag || (CONF_LANG_MAP[uLang] ? CONF_LANG_MAP[uLang][1] : '🌐')).trim();
        const uFlagCode = String(user.flagCode || (CONF_LANG_MAP[uLang] ? CONF_LANG_MAP[uLang][0] : 'un')).trim().toLowerCase();
        const firstName = (user.name || 'User').split(' ')[0];

        if (slotEl.getAttribute('data-uid') === uid) {
            const flagImg = slotEl.querySelector('.conf-slot-flag-img');
            if (flagImg) flagImg.src = `https://flagcdn.com/w40/${uFlagCode}.png`;
            const marq = document.getElementById(`conf-marquee-${uid}`);
            if (marq) {
                marq.setAttribute('data-lang', uLang);
                marq.setAttribute('data-flag', uFlag);
            }
            tryAttachVideoForUser(user);
            return;
        }

        slotEl.className = 'video-frame relative overflow-hidden';
        slotEl.setAttribute('data-uid', uid);
        slotEl.innerHTML = `
            <div id="remote-video-${uid}" class="conf-remote-video-box absolute inset-0 w-full h-full z-20 hidden"></div>
            <div class="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10">
                ${user.photo ? `<img src="${user.photo}" class="w-12 h-12 rounded-full object-cover opacity-80">` : `<i class="fa-solid fa-user text-2xl text-[#2a3942]"></i>`}
            </div>
            <div class="video-overlay z-30">${firstName}</div>
            <div class="flag-overlay z-30" style="top:8px; right:8px;">
                <img src="https://flagcdn.com/w40/${uFlagCode}.png" class="conf-slot-flag-img w-6 rounded-sm border border-[#2a3942]">
            </div>
            <div class="translation-bar z-30">
                <div id="conf-marquee-${uid}" class="conf-marquee-text conf-listener-marquee" data-lang="${uLang}" data-flag="${uFlag}" style="animation-duration: 28s;">
                    ${uFlag} ${firstName} в эфире...
                </div>
            </div>
        `;

        tryAttachVideoForUser(user);
    }

    function tryAttachVideoForUser(user) {
        if (!user) return;
        const uid = String(user.id);
        const aUid = (user.agoraUid !== undefined && user.agoraUid !== '') ? String(user.agoraUid) : null;

        let track = (aUid && state.remoteVideoTracks[aUid]) || state.remoteVideoTracks[uid];

        if (!track && Object.keys(state.activeUsersMap).length === 1) {
            const trackKeys = Object.keys(state.remoteVideoTracks);
            if (trackKeys.length === 1) {
                track = state.remoteVideoTracks[trackKeys[0]];
            }
        }

        if (track) {
            playRemoteVideoInContainer(uid, track);
        }
    }

    function playRemoteVideoInContainer(firebaseUid, videoTrack) {
        const box = document.getElementById(`remote-video-${firebaseUid}`);
        if (!box || !videoTrack) return;

        const trackId = (typeof videoTrack.getTrackId === 'function') ? String(videoTrack.getTrackId()) : 'active';
        if (box.dataset.trackId === trackId && box.querySelector('video')) {
            box.classList.remove('hidden');
            return;
        }

        try {
            box.innerHTML = '';
            box.dataset.trackId = trackId;
            box.classList.remove('hidden');
            videoTrack.play(box);
        } catch (e) {}
    }

    function attachIncomingTrackByAgoraUid(agoraUid, videoTrack) {
        const user = findUserByAgoraUid(agoraUid);
        if (user) {
            playRemoteVideoInContainer(String(user.id), videoTrack);
        }
    }

    function syncActiveParticipants(usersMap) {
        const myId = getMyUid();
        const validGuests = {};

        Object.keys(usersMap || {}).forEach(uid => {
            const u = usersMap[uid];
            if (!u || String(uid) === myId || uid === 'ai') return;
            validGuests[String(uid)] = u;
        });

        state.activeUsersMap = validGuests;

        for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
            const occupantUid = state.slots[i];
            if (occupantUid && !validGuests[occupantUid]) {
                state.slots[i] = null;
                renderGuestSlot(i, null);
            }
        }

        Object.keys(validGuests).forEach(uid => {
            let slotIdx = state.slots.indexOf(uid);
            if (slotIdx === -1) {
                slotIdx = state.slots.indexOf(null);
                if (slotIdx !== -1) state.slots[slotIdx] = uid;
            }
            if (slotIdx !== -1) {
                renderGuestSlot(slotIdx, validGuests[uid]);
            }
        });

        syncConfAudioRouting();
    }

    // -------------------------------------------------------
    // 8. ВХОД, КАМЕРА AGORA (СВОЯ + ВХОДЯЩИЕ) И ВЫХОД
    // -------------------------------------------------------
    async function subscribeRemoteUser(user, mediaType) {
        if (!state.client || !user) return;
        const aUid = String(user.uid);
        const lockKey = `${aUid}:${mediaType}`;

        if (state.subscribingKeys.has(lockKey)) return;
        if (mediaType === 'video' && state.remoteVideoTracks[aUid]) return;
        if (mediaType === 'audio' && state.remoteAudioTracks[aUid]) return;

        state.subscribingKeys.add(lockKey);
        try {
            await state.client.subscribe(user, mediaType);
            if (mediaType === 'video' && user.videoTrack) {
                state.remoteVideoTracks[aUid] = user.videoTrack;
                attachIncomingTrackByAgoraUid(aUid, user.videoTrack);
            }
            if (mediaType === 'audio' && user.audioTrack) {
                state.remoteAudioTracks[aUid] = user.audioTrack;
                user.audioTrack.play();
                syncConfAudioRouting();
            }
        } catch (e) {
            console.warn('Conf subscribe info:', lockKey, e);
        } finally {
            state.subscribingKeys.delete(lockKey);
        }
    }

    window.enterConferenceRoom = async function () {
        window.initConference();
        refreshMyFrameIdentity();

        const myId = getMyUid();
        if (!myId) {
            setTimeout(window.enterConferenceRoom, 800);
            return;
        }

        if (state.isJoining) return;
        if (state.isActive && state.client && state.client.connectionState === 'CONNECTED') return;

        const currentCount = Object.keys(state.activeUsersMap).length;
        if (!state.isActive && currentCount >= MAX_GUEST_SLOTS) {
            if (window.showToast) window.showToast('Конференция', 'Комната заполнена (13/13)', '', '');
            return;
        }

        state.isActive = true;
        state.isJoining = true;

        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                state.presenceRef = firebase.database().ref(`conf_world/active_users/${myId}`);
                const myLang = getConfReadLang();
                const myData = {
                    id: myId,
                    name: window.myUsername || 'User',
                    photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '',
                    flag: getConfReadFlag(),
                    flagCode: getConfReadFlagCode(),
                    langCode: myLang,
                    agoraUid: state.myAgoraUid || '',
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                };
                state.presenceRef.set(myData);
                state.presenceRef.onDisconnect().remove();

                if (!state.usersListenerRef) {
                    state.usersListenerRef = firebase.database().ref('conf_world/active_users');
                    state.usersListenerRef.on('value', (snap) => {
                        syncActiveParticipants(snap.val() || {});
                    });
                }

                // Подключаем слушатель сообщений без зависимости от часов телефона
                if (!state.chatListenerBound) {
                    state.chatListenerBound = true;
                    state.chatListenerRef = firebase.database().ref('conf_world/messages');
                    state.chatListenerRef.limitToLast(20).once('value', (snap) => {
                        snap.forEach((child) => {
                            if (child.key) state.processedKeys.add(child.key);
                        });
                        if (state.isActive && state.chatListenerRef) {
                            state.chatListenerRef.limitToLast(20).on('child_added', handleConfMessage);
                        }
                    });
                }
            }

            await startConferenceWebRTC();
        } finally {
            state.isJoining = false;
        }
    };

    window.startConferenceWebRTC = async function () {
        if (typeof AgoraRTC === 'undefined') return;

        try {
            if (!state.audioTrack) {
                state.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            }
            if (!state.videoTrack) {
                state.videoTrack = await AgoraRTC.createCameraVideoTrack();
                state.camEnabled = true;
                const myVideo = document.getElementById('my-live-video');
                if (myVideo) {
                    myVideo.srcObject = new MediaStream([state.videoTrack.getMediaStreamTrack()]);
                    myVideo.play().catch(() => {});
                }
                updateCamButtonUI();
            }

            if (!state.client) {
                state.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

                state.client.on('user-published', (user, mediaType) => {
                    subscribeRemoteUser(user, mediaType);
                });

                state.client.on('user-unpublished', (user, mediaType) => {
                    const aUid = String(user.uid);
                    if (mediaType === 'video') {
                        delete state.remoteVideoTracks[aUid];
                        const uInfo = findUserByAgoraUid(aUid);
                        if (uInfo) {
                            const box = document.getElementById(`remote-video-${uInfo.id}`);
                            if (box) {
                                box.innerHTML = '';
                                delete box.dataset.trackId;
                                box.classList.add('hidden');
                            }
                        }
                    }
                    if (mediaType === 'audio') {
                        delete state.remoteAudioTracks[aUid];
                    }
                });

                state.client.on('user-left', (user) => {
                    const aUid = String(user.uid);
                    const uInfo = findUserByAgoraUid(aUid);
                    if (uInfo) {
                        const box = document.getElementById(`remote-video-${uInfo.id}`);
                        if (box) {
                            box.innerHTML = '';
                            delete box.dataset.trackId;
                            box.classList.add('hidden');
                        }
                    }
                    delete state.remoteVideoTracks[aUid];
                    delete state.remoteAudioTracks[aUid];
                });
            }

            if (state.client.connectionState === 'DISCONNECTED') {
                const channelName = window.CONF_AGORA_CHANNEL || (typeof AGORA_CHANNEL !== 'undefined' ? AGORA_CHANNEL : 'global_conference');
                const token = (typeof AGORA_TEMP_TOKEN !== 'undefined') ? AGORA_TEMP_TOKEN : (window.AGORA_TEMP_TOKEN || null);
                const appId = (typeof AGORA_APP_ID !== 'undefined') ? AGORA_APP_ID : (window.AGORA_APP_ID || '');

                if (appId) {
                    const assignedUid = await state.client.join(appId, channelName, token, null);
                    state.myAgoraUid = String(assignedUid);

                    if (state.presenceRef) {
                        state.presenceRef.update({ agoraUid: state.myAgoraUid }).catch(() => {});
                    }

                    const tracks = [state.audioTrack, state.videoTrack].filter(Boolean);
                    if (tracks.length > 0) await state.client.publish(tracks);

                    (state.client.remoteUsers || []).forEach((remUser) => {
                        if (remUser.hasVideo) subscribeRemoteUser(remUser, 'video');
                        if (remUser.hasAudio) subscribeRemoteUser(remUser, 'audio');
                    });
                }
            }
        } catch (e) {
            console.warn('Conf WebRTC error:', e);
            if (window.showToast) {
                window.showToast('Agora Conf', 'Проверьте токен/канал: ' + (e && e.code ? e.code : 'ошибка входа'), '', '');
            }
        }
    };

    window.toggleConfCamera = async function () {
        if (!state.videoTrack) return;
        state.camEnabled = !state.camEnabled;
        try { await state.videoTrack.setEnabled(state.camEnabled); } catch (e) {}

        const myVideo = document.getElementById('my-live-video');
        if (myVideo) myVideo.style.opacity = state.camEnabled ? '1' : '0.15';
        updateCamButtonUI();
    };

    function updateCamButtonUI() {
        const camBtn = document.getElementById('conf-cam-btn');
        if (!camBtn) return;
        if (state.camEnabled) {
            camBtn.className = 'w-[44px] h-[44px] rounded-full bg-[#202c33] text-white flex justify-center items-center text-xl hover:bg-[#2a3942] transition';
            camBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
        } else {
            camBtn.className = 'w-[44px] h-[44px] rounded-full bg-red-500/20 text-red-400 border border-red-500/50 flex justify-center items-center text-xl transition';
            camBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
        }
    }

    window.leaveConferenceRoom = async function () {
        state.isActive = false;
        state.isJoining = false;
        state.chatListenerBound = false;
        state.myAgoraUid = null;
        state.subscribingKeys.clear();
        state.processedKeys.clear();

        stopContinuousConfAIMic();
        if (typeof window.stopVoiceAI === 'function') window.stopVoiceAI();

        if (state.presenceRef) {
            try { await state.presenceRef.remove(); } catch (e) {}
            state.presenceRef = null;
        }
        if (state.usersListenerRef) {
            try { state.usersListenerRef.off(); } catch (e) {}
            state.usersListenerRef = null;
        }
        if (state.chatListenerRef) {
            try { state.chatListenerRef.off(); } catch (e) {}
            state.chatListenerRef = null;
        }

        if (state.audioTrack) {
            try { state.audioTrack.stop(); state.audioTrack.close(); } catch (e) {}
            state.audioTrack = null;
        }
        if (state.videoTrack) {
            try { state.videoTrack.stop(); state.videoTrack.close(); } catch (e) {}
            state.videoTrack = null;
        }
        if (state.client) {
            try { await state.client.leave(); } catch (e) {}
            state.client = null;
        }

        state.remoteAudioTracks = {};
        state.remoteVideoTracks = {};
        state.activeUsersMap = {};
        for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
            state.slots[i] = null;
            renderGuestSlot(i, null);
        }

        const myVideo = document.getElementById('my-live-video');
        if (myVideo) myVideo.srcObject = null;

        window.setConfMode('voice');
        if (typeof window.switchTab === 'function') window.switchTab(0);
    };

    window.isMeetMarqueeEnabled = true;
    window.toggleMeetMarquee = function () {
        window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled;
        document.querySelectorAll('#conference .translation-bar').forEach(b => {
            b.style.opacity = window.isMeetMarqueeEnabled ? '1' : '0';
        });
    };

    // -------------------------------------------------------
    // 9. УМНЫЙ ПЕРЕВОД + РОДНОЙ ИИ-ГОЛОС (window.playAIVoice)
    // -------------------------------------------------------
    async function translateConfTextCached(text, targetLang) {
        const tl = confNormLang(targetLang) || 'en';
        const cacheKey = `${tl}::${text}`;
        if (state.translateCache.has(cacheKey)) {
            return state.translateCache.get(cacheKey);
        }

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            const data = await res.json();
            const translated = (data && data[0]) ? data[0].map(s => (s && s[0]) ? s[0] : '').join('') : text;
            if (state.translateCache.size > 150) {
                const first = state.translateCache.keys().next().value;
                state.translateCache.delete(first);
            }
            state.translateCache.set(cacheKey, translated);
            return translated;
        } catch (e) {
            return text;
        }
    }

    function setMarqueeContent(el, html) {
        if (!el) return;
        el.innerHTML = html;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = null;
    }

    function pushConfMessage(rawText, explicitLang) {
        const text = String(rawText || '').trim();
        if (!text || typeof firebase === 'undefined' || !firebase.database) return;

        const langCode = confNormLang(explicitLang) || getConfReadLang();
        const flag = getConfReadFlag();
        const flagCode = getConfReadFlagCode();

        firebase.database().ref('conf_world/messages').push({
            userId: getMyUid() || 'guest',
            sessionId: window.mySessionId || 'sess',
            name: window.myUsername || 'User',
            text: text,
            flag: flag,
            flagCode: flagCode,
            langCode: langCode,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function speakConfTranslation(translated, targetLang) {
        if (state.mode !== 'ai' || !translated) return;
        if (typeof window.playAIVoice === 'function') {
            window.playAIVoice(encodeURIComponent(translated), targetLang);
        } else if (window.speechSynthesis) {
            try {
                const u = new SpeechSynthesisUtterance(translated);
                u.lang = CONF_SPEECH_LOCALE[targetLang] || targetLang || 'en-US';
                window.speechSynthesis.speak(u);
            } catch (e) {}
        }
    }

    function handleConfMessage(snapshot) {
        const data = snapshot.val();
        if (!data || !data.text) return;

        if (snapshot.key) {
            if (state.processedKeys.has(snapshot.key)) return;
            state.processedKeys.add(snapshot.key);
            if (state.processedKeys.size > 150) {
                const firstKey = state.processedKeys.values().next().value;
                state.processedKeys.delete(firstKey);
            }
        }

        const myId = getMyUid();
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const senderName = isMe ? (window.myUsername || 'Me') : (data.name || 'User').split(' ')[0];
        const senderLang = confNormLang(data.langCode) || confNormLang(data.flag) || confNormLang(data.flagCode) || 'en';
        const senderFlag = String(data.flag || '🌐').trim();
        const originalText = String(data.text).trim();

        // 1. В окне самого отправителя бежит его оригинал
        const speakerMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
        const speakerMarquee = document.getElementById(speakerMarqueeId);
        if (speakerMarquee) {
            setMarqueeContent(
                speakerMarquee,
                `<span class="text-white font-bold">${senderName}:</span> <span class="text-[#00a884] ml-1.5">${senderFlag} ${originalText}</span>`
            );
        }

        // 2. Умная логика по флагам в моём главном окне
        const myReadLang = getConfReadLang();
        const myReadFlag = getConfReadFlag();
        const myMainMarquee = document.getElementById('speaker-marquee');

        if (!isMe && myMainMarquee) {
            const isSameFlag = (senderFlag && myReadFlag && senderFlag === myReadFlag) || (senderLang === myReadLang);

            if (isSameFlag) {
                setMarqueeContent(
                    myMainMarquee,
                    `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-white font-bold ml-1.5">${senderFlag} ${originalText}</span>`
                );
            } else {
                translateConfTextCached(originalText, myReadLang).then(translated => {
                    setMarqueeContent(
                        myMainMarquee,
                        `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-yellow-400 font-bold ml-1.5">${myReadFlag} ${translated}</span>`
                    );
                    speakConfTranslation(translated, myReadLang);
                });
            }
        }

        // 3. Веер по остальным фреймам участников
        const listenerMarquees = Array.from(document.querySelectorAll('#conference .conf-listener-marquee'))
            .filter(el => el.id !== speakerMarqueeId && el.id !== 'speaker-marquee');

        const byLang = {};
        listenerMarquees.forEach(el => {
            const tLang = confNormLang(el.getAttribute('data-lang')) || 'en';
            if (!byLang[tLang]) byLang[tLang] = [];
            byLang[tLang].push(el);
        });

        Object.keys(byLang).forEach(targetLang => {
            if (targetLang === senderLang) {
                byLang[targetLang].forEach(el => {
                    const tFlag = el.getAttribute('data-flag') || senderFlag;
                    setMarqueeContent(
                        el,
                        `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-white font-bold ml-1.5">${tFlag} ${originalText}</span>`
                    );
                });
            } else {
                translateConfTextCached(originalText, targetLang).then(translated => {
                    byLang[targetLang].forEach(el => {
                        const tFlag = el.getAttribute('data-flag') || '🌐';
                        setMarqueeContent(
                            el,
                            `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-yellow-400 font-bold ml-1.5">${tFlag} ${translated}</span>`
                        );
                    });
                });
            }
        });
    }

    // -------------------------------------------------------
    // 10. ЧАТ КОНФЕРЕНЦИИ И КНОПКИ УПРАВЛЕНИЯ
    // -------------------------------------------------------
    window.sendConfMsg = function () {
        const inputField = document.getElementById('conf-chat-input');
        if (!inputField) return;
        const rawText = inputField.value.trim();
        if (!rawText) return;
        inputField.value = '';

        pushConfMessage(rawText, getConfReadLang());

        if (state.mode === 'ai' && state.aiMicPausedByTyping) {
            state.aiMicPausedByTyping = false;
            setTimeout(startContinuousConfAIMic, 200);
        }
    };

    function mountIsolatedConfMicPopup() {
        const confPage = document.getElementById('conference');
        if (!confPage || document.getElementById('conf-isolated-mic-popup')) return;

        const savedMic = localStorage.getItem('hf_conf_mic_lang') || 'auto';
        const optionsHtml = `<option value="auto">🤖 Auto (Profile)</option>` +
            CONF_13_LANGS.map(l => `<option value="${l.code}">${l.flag} ${l.name}</option>`).join('');

        const popup = document.createElement('div');
        popup.id = 'conf-isolated-mic-popup';
        popup.className = 'conf-isolated-mic-popup';
        popup.onclick = (e) => e.stopPropagation();
        popup.innerHTML = `
            <div class="text-[0.7rem] font-bold uppercase tracking-wider text-[#00a884] flex justify-between items-center">
                <span>🎙 Conference Mic</span>
                <span class="text-[#8696a0] text-[0.65rem] normal-case">Isolated</span>
            </div>
            <select id="conf-isolated-mic-select" class="w-full bg-[#202c33] text-white border border-[#2a3942] rounded-xl px-3 py-2 text-sm font-semibold outline-none">
                ${optionsHtml}
            </select>
            <button type="button" id="conf-single-dictate-btn" class="w-full bg-[#00a884] text-[#111b21] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 transition">
                <i class="fa-solid fa-microphone"></i> Голосом в строку
            </button>
        `;
        confPage.appendChild(popup);

        const sel = document.getElementById('conf-isolated-mic-select');
        if (sel) {
            sel.value = savedMic;
            sel.onchange = () => window.saveConfMicLang(sel.value);
        }

        const dictBtn = document.getElementById('conf-single-dictate-btn');
        if (dictBtn) {
            dictBtn.onclick = () => {
                popup.classList.remove('active');
                window.startConfSingleDictation();
            };
        }

        document.addEventListener('click', () => popup.classList.remove('active'));
    }

    window.startConfSingleDictation = function () {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recBase = getConfMicLang() || getConfReadLang() || getConfNativeLang();
        const rec = new SpeechRecognition();
        rec.lang = CONF_SPEECH_LOCALE[recBase] || recBase;
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            if (window.showToast) window.showToast('Conf Mic', 'Говорите...', '', '');
        };
        rec.onresult = (e) => {
            const spoken = e.results[0][0].transcript;
            if (spoken && spoken.trim()) {
                pushConfMessage(spoken.trim(), recBase);
            }
        };
        try { rec.start(); } catch (e) {}
    };

    window.bindConfControls = function () {
        const confPage = document.getElementById('conference');
        if (!confPage) return;

        const camBtn = document.getElementById('conf-cam-btn');
        if (camBtn && !camBtn.dataset.confCamBound) {
            camBtn.dataset.confCamBound = '1';
            camBtn.removeAttribute('onclick');
            camBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.toggleConfCamera();
            };
        }

        const redBtn = confPage.querySelector('button.bg-red-500');
        if (redBtn && !redBtn.dataset.confLeaveBound) {
            redBtn.dataset.confLeaveBound = '1';
            redBtn.removeAttribute('onclick');
            redBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.leaveConferenceRoom();
            };
        }

        const inputField = document.getElementById('conf-chat-input');
        if (inputField && !inputField.dataset.confInputBound) {
            inputField.dataset.confInputBound = '1';

            inputField.addEventListener('input', () => {
                if (state.mode === 'ai' && inputField.value.trim().length > 0 && !state.aiMicPausedByTyping) {
                    state.aiMicPausedByTyping = true;
                    stopContinuousConfAIMic();
                    updateHeaderTeleprompter('Пауза (ввод текста)', false);
                } else if (state.mode === 'ai' && inputField.value.trim().length === 0 && state.aiMicPausedByTyping) {
                    state.aiMicPausedByTyping = false;
                    startContinuousConfAIMic();
                }
            });

            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    window.sendConfMsg();
                }
            }, true);

            const inputArea = inputField.closest('.chat-input-area') || confPage;
            inputArea.querySelectorAll('button').forEach(btn => {
                const attr = btn.getAttribute('onclick') || '';
                if (attr.includes('sendFirebaseMsg') || btn.querySelector('.fa-paper-plane')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.sendConfMsg();
                    };
                } else if (attr.includes('Mic') || btn.querySelector('.fa-microphone')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const popup = document.getElementById('conf-isolated-mic-popup');
                        if (popup) popup.classList.toggle('active');
                    };
                }
            });
        }
    };

    // -------------------------------------------------------
    // 11. ВЫБОР ЯЗЫКА КОНФЕРЕНЦИИ
    // -------------------------------------------------------
    window.openConfLangModal = function () {
        const listContainer = document.getElementById('personal-lang-list');
        if (!listContainer) return;

        const currentPref = localStorage.getItem('hf_conf_avatar_lang') || 'auto';
        const langs = [{ code: 'auto', name: 'Auto (Profile)', flag: '🌐' }].concat(CONF_13_LANGS);

        let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">📹 Conference World</b></div>`;
        langs.forEach(l => {
            const isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
            html += `<div onclick="window.saveConfAvatarLang('${l.code}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
        });

        listContainer.innerHTML = html;
        document.getElementById('personal-lang-modal')?.classList.add('active');
    };

    function applyConfLangChange() {
        refreshMyFrameIdentity();

        if (state.isActive && state.presenceRef) {
            state.presenceRef.update({
                flag: getConfReadFlag(),
                flagCode: getConfReadFlagCode(),
                langCode: getConfReadLang()
            }).catch(() => {});
        }

        syncConfAudioRouting();

        if (state.mode === 'ai' && state.aiMicRunning) {
            stopContinuousConfAIMic();
            startContinuousConfAIMic();
        }
    }

    window.saveConfAvatarLang = function (langCode) {
        if (!langCode || langCode === 'auto') {
            localStorage.removeItem('hf_conf_avatar_lang');
            const micFallback = localStorage.getItem('hf_conf_mic_lang');
            if (micFallback) localStorage.setItem('hf_conf_read_lang', micFallback);
            else localStorage.removeItem('hf_conf_read_lang');
        } else {
            localStorage.setItem('hf_conf_avatar_lang', langCode);
            localStorage.setItem('hf_conf_read_lang', langCode);
        }

        applyConfLangChange();
        document.getElementById('personal-lang-modal')?.classList.remove('active');
        if (window.showToast) window.showToast('Conference Language', 'Saved strictly for Conference', '', '');
    };

    window.saveConfMicLang = function (val) {
        if (!val || val === 'auto') {
            localStorage.removeItem('hf_conf_mic_lang');
            const avatarFallback = localStorage.getItem('hf_conf_avatar_lang');
            if (avatarFallback) localStorage.setItem('hf_conf_read_lang', avatarFallback);
            else localStorage.removeItem('hf_conf_read_lang');
        } else {
            localStorage.setItem('hf_conf_mic_lang', val);
            localStorage.setItem('hf_conf_read_lang', val);
        }

        applyConfLangChange();
        if (window.showToast) window.showToast('Conference Mic', 'Language updated', '', '');
    };

    // -------------------------------------------------------
    // 12. ПРИГЛАШЕНИЯ И УВЕДОМЛЕНИЯ
    // -------------------------------------------------------
    window.openGroupInviteModal = function () {
        const list = document.getElementById('group-invite-list');
        if (!list) return;
        list.innerHTML = '';

        const myId = getMyUid();
        (window.participants || []).forEach(p => {
            if (!p || String(p.id) === myId || p.id === 'ai') return;
            list.innerHTML += `
                <label class="flex items-center justify-between p-3 bg-[#202c33] rounded-xl border border-[#2a3942] cursor-pointer hover:border-[#00a884] transition">
                    <div class="flex items-center gap-3">
                        <img src="${p.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-10 h-10 rounded-full object-cover">
                        <span class="text-white font-bold">${p.flag || ''} ${p.name ? p.name.split(' ')[0] : 'User'}</span>
                    </div>
                    <input type="checkbox" value="${p.id}" class="w-5 h-5 accent-[#00a884] invite-checkbox">
                </label>
            `;
        });

        const modal = document.getElementById('group-invite-modal');
        const content = document.getElementById('group-invite-content');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        if (content) {
            setTimeout(() => {
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
            }, 10);
        }
    };

    window.closeGroupInviteModal = function () {
        const modal = document.getElementById('group-invite-modal');
        const content = document.getElementById('group-invite-content');
        if (content) {
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
        }
        if (modal) {
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }, 200);
        }
    };

    window.selectAllForInvite = function () {
        document.querySelectorAll('.invite-checkbox').forEach(cb => { cb.checked = true; });
    };

    window.sendGroupInvites = function () {
        const checkboxes = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            if (window.showToast) window.showToast('Ошибка', 'Выберите пользователей!', '', '');
            return;
        }

        const myId = getMyUid();
        checkboxes.forEach(cb => {
            const targetId = cb.value;
            firebase.database().ref('user_notifications/' + targetId).push({
                type: 'conference',
                senderId: myId,
                name: window.myUsername || 'User',
                photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U',
                flag: getConfReadFlag(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });

        window.enterConferenceRoom();

        if (window.showToast) window.showToast('Успех', 'Приглашения доставлены адресатам!', '', '');
        window.closeGroupInviteModal();
    };

    window.listenForDirectInvites = function () {
        if (!window.myProfileInfo || !window.myProfileInfo.id) {
            setTimeout(window.listenForDirectInvites, 1000);
            return;
        }

        refreshMyFrameIdentity();

        const myId = getMyUid();
        firebase.database().ref('user_notifications/' + myId).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            if (window.sndMsg) window.sndMsg.play().catch(() => {});
            if (navigator.vibrate) navigator.vibrate([400, 200, 400, 200, 400]);

            const notifType = data.type || 'conference';
            const senderFirstName = (data.name || 'User').split(' ')[0];

            const popup = document.createElement('div');
            popup.className = 'absolute top-4 left-4 right-4 mx-auto z-[9999] max-w-[280px]';

            let contentHTML = '';
            if (notifType === 'conference') {
                const tTitle = window.getConfTranslation('title');
                const tDesc = window.getConfTranslation('desc');
                const tBtn = window.getConfTranslation('btn');
                const tNo = window.getConfTranslation('no');

                popup.classList.add('bg-[#111b21]', 'border', 'border-[#00a884]', 'rounded-xl', 'p-2.5', 'shadow-[0_0_15px_rgba(0,168,132,0.4)]');
                contentHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${data.photo}" class="w-10 h-10 shrink-0 rounded-full border border-[#00a884] object-cover shadow-md">
                        <div class="flex flex-col flex-1">
                            <span data-i18n="conf_popup_title" class="text-[0.65rem] text-[#00a884] font-bold uppercase tracking-widest leading-none mb-1">${tTitle}</span>
                            <span class="text-white text-[0.8rem] leading-tight"><b>${data.flag || '🌐'} ${senderFirstName}</b> <span data-i18n="conf_popup_desc">${tDesc}</span></span>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-1">
                        <button id="btn-no-${snapshot.key}" data-i18n="conf_popup_no" class="flex-1 bg-[#202c33] text-[#8696a0] py-1.5 rounded-lg font-bold text-[0.7rem] hover:text-white transition shadow-sm">${tNo}</button>
                        <button id="btn-yes-${snapshot.key}" class="flex-1 bg-[#00a884] text-[#111b21] py-1.5 rounded-lg font-bold text-[0.7rem] hover:scale-95 transition shadow-sm flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-video"></i> <span data-i18n="conf_invite_btn">${tBtn}</span>
                        </button>
                    </div>
                `;
            } else if (notifType === 'missed_call') {
                const callIcon = data.isVideo ? 'fa-video-slash' : 'fa-phone-slash';
                const titleText = data.isVideo ? 'ВИДЕОЗВОНОК' : 'АУДИОЗВОНОК';
                const titleKey = data.isVideo ? 'missed_video_title' : 'missed_audio_title';
                const descText = data.isVideo ? 'пропущенный видеовызов' : 'пропущенный аудиовызов';
                const descKey = data.isVideo ? 'missed_video_desc' : 'missed_audio_desc';

                popup.classList.add('bg-[#111b21]', 'border', 'border-red-500', 'rounded-xl', 'p-3', 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', 'cursor-pointer');
                contentHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500 shrink-0 shadow-md">
                            <i class="fa-solid ${callIcon} text-lg"></i>
                        </div>
                        <div class="flex flex-col flex-1">
                            <span data-i18n="${titleKey}" class="text-[0.65rem] text-red-500 font-bold uppercase tracking-widest leading-none mb-1">${titleText}</span>
                            <span class="text-white text-[0.8rem] leading-tight"><b>${data.flag || '🌐'} ${senderFirstName}</b> <span data-i18n="${descKey}">${descText}</span></span>
                        </div>
                    </div>
                `;
            } else if (notifType === 'email') {
                popup.classList.add('bg-[#111b21]', 'border', 'border-[#3b82f6]', 'rounded-xl', 'p-3', 'shadow-[0_0_15px_rgba(59,130,246,0.3)]', 'cursor-pointer');
                contentHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500 shrink-0 shadow-md">
                            <i class="fa-solid fa-envelope text-lg"></i>
                        </div>
                        <div class="flex flex-col flex-1">
                            <span data-i18n="new_email_title" class="text-[0.65rem] text-blue-400 font-bold uppercase tracking-widest leading-none mb-1">НОВОЕ ПИСЬМО</span>
                            <span class="text-white text-[0.8rem] leading-tight">От: <b>${data.flag || '📧'} ${senderFirstName}</b></span>
                        </div>
                    </div>
                `;
            }

            popup.innerHTML = contentHTML;
            const appContainer = document.querySelector('.app-wrap') || document.querySelector('#app') || document.body;
            appContainer.appendChild(popup);

            if (typeof window.updateTranslations === 'function') window.updateTranslations();
            else if (typeof window.applyTranslations === 'function') window.applyTranslations();

            if (notifType === 'conference') {
                document.getElementById(`btn-no-${snapshot.key}`).onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(0);
                    popup.remove();
                    snapshot.ref.remove();
                };
                document.getElementById(`btn-yes-${snapshot.key}`).onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(0);
                    popup.remove();
                    snapshot.ref.remove();
                    if (typeof window.switchTab === 'function') window.switchTab(2);
                    window.enterConferenceRoom();
                };
            } else {
                popup.onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(0);
                    popup.remove();
                    snapshot.ref.remove();
                    if (notifType === 'email' && typeof window.switchTab === 'function') window.switchTab(4);
                };
            }
        });
    };

    // -------------------------------------------------------
    // 13. ЗАПУСК ПРИ ОТКРЫТИИ ВКЛАДКИ КОНФЕРЕНЦИИ
    // -------------------------------------------------------
    function watchConferenceVisibility() {
        const confPage = document.getElementById('conference');
        if (!confPage || confPage.dataset.visWatched) return;
        confPage.dataset.visWatched = '1';

        const checkAndJoin = () => {
            const isVisible = confPage.offsetParent !== null && !confPage.classList.contains('hidden');
            if (isVisible && !state.isActive) {
                window.enterConferenceRoom();
            }
        };

        const observer = new MutationObserver(checkAndJoin);
        observer.observe(confPage, { attributes: true, attributeFilter: ['class', 'style'] });
        checkAndJoin();
    }

    function hookTabSwitch() {
        if (typeof window.switchTab === 'function' && !window._confTabHooked) {
            const origSwitchTab = window.switchTab;
            window.switchTab = function (idx) {
                const res = origSwitchTab.apply(this, arguments);
                if (idx === 2 || idx === 'conference') {
                    window.enterConferenceRoom();
                }
                return res;
            };
            window._confTabHooked = true;
        }
    }

    window.addEventListener('beforeunload', () => {
        if (state.presenceRef) {
            try { state.presenceRef.remove(); } catch (e) {}
        }
    });

    window.addEventListener('load', () => {
        hookTabSwitch();
        window.initConference();
        watchConferenceVisibility();
        setTimeout(() => {
            hookTabSwitch();
            watchConferenceVisibility();
            refreshMyFrameIdentity();
            window.bindConfControls();
            window.listenForDirectInvites();
        }, 1200);
    });
})();
