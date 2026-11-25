// =======================================================
// ФАЙЛ: conference.js (ISOLATED CONFERENCE WORLD — 1-в-1 ДВИЖОК video-room.js + КАМЕРЫ calls.js)
// - Родная сетка .video-grid (1 главное окно + 12 слотов, без ломки CSS)
// - Изолированные ветки БД: conf_world/active_users, conf_world/messages, conf_world/active_langs
// - Изолированные ключи: hf_conf_avatar_lang, hf_conf_mic_lang (сброс при выходе)
// - Камеры для всех участников через CALLS_AGORA_APP_ID / CALLS_AGORA_TEMP_TOKEN / CALLS_AGORA_CHANNEL
// - Включение/выключение камеры с переключением на аватар
// - Пауза аудио-трека Agora (260 мс) перед ИИ-микрофоном без отключения камер
// - Жёсткое разделение миров: avatar (чат без озвучки) и mic (голос / ИИ-переводчик)
// - Выход по красной кнопке только для себя с переходом в глобальный чат
// =======================================================

(function () {
    'use strict';

    const CONF_LANG_MAP = {
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

    const CONF_UI_FALLBACK = {
        en: { langTitle: 'Conference Language', autoProfile: 'Auto (Profile)', micTitle: 'Conference Mic', voiceToText: 'Voice Text', directMode: 'Direct', aiMode: 'AI', waiting: 'Ready for conference...', on: 'MIC ON', aiOn: 'AI VOICE ON', stop: 'STOP' },
        ru: { langTitle: 'Язык Конференции', autoProfile: 'Авто (Профиль)', micTitle: 'Микрофон Конференции', voiceToText: 'Текст голосом', directMode: 'Напрямую', aiMode: 'ИИ', waiting: 'Готов к конференции...', on: 'МИК ВКЛ', aiOn: 'ИИ-ГОЛОС ВКЛ', stop: 'СТОП' },
        az: { langTitle: 'Konfrans Dili', autoProfile: 'Avto (Profil)', micTitle: 'Konfrans Mikrofonu', voiceToText: 'Səsli Mətn', directMode: 'Birbaşa', aiMode: 'AI', waiting: 'Konfransa hazırdır...', on: 'MİK AÇIQ', aiOn: 'AI SƏS AÇIQ', stop: 'DAYAN' },
        tr: { langTitle: 'Konferans Dili', autoProfile: 'Oto (Profil)', micTitle: 'Konferans Mikrofonu', voiceToText: 'Sesli Metin', directMode: 'Doğrudan', aiMode: 'AI', waiting: 'Konferansa hazır...', on: 'MİK AÇIQ', aiOn: 'AI SES AÇIK', stop: 'DUR' },
        de: { langTitle: 'Konferenzsprache', autoProfile: 'Auto (Profil)', micTitle: 'Konferenz-Mikrofon', voiceToText: 'Sprachtext', directMode: 'Direkt', aiMode: 'KI', waiting: 'Bereit für Konferenz...', on: 'MIK AN', aiOn: 'KI-STIMME AN', stop: 'STOPP' },
        kk: { langTitle: 'Конференция тілі', autoProfile: 'Авто (Профиль)', micTitle: 'Конференция микрофоны', voiceToText: 'Дауыстық мәтін', directMode: 'Тікелей', aiMode: 'AI', waiting: 'Конференцияға дайын...', on: 'МИК ҚОСУЛЫ', aiOn: 'AI ДАУЫС ҚОСУЛЫ', stop: 'ТОҚТА' },
        ar: { langTitle: 'لغة المؤتمر', autoProfile: 'تلقائي (الملف)', micTitle: 'ميكروفون المؤتمر', voiceToText: 'نص صوتي', directMode: 'مباشر', aiMode: 'AI', waiting: 'جاهز للمؤتمر...', on: 'تشغيل', aiOn: 'صوت AI', stop: 'إيقاف' },
        it: { langTitle: 'Lingua Conferenza', autoProfile: 'Auto (Profilo)', micTitle: 'Microfono Conferenza', voiceToText: 'Testo Vocale', directMode: 'Diretto', aiMode: 'IA', waiting: 'Pronto per la conferenza...', on: 'MIC ON', aiOn: 'IA VOCE ON', stop: 'STOP' },
        es: { langTitle: 'Idioma Conferencia', autoProfile: 'Auto (Perfil)', micTitle: 'Micrófono Conferencia', voiceToText: 'Texto a Voz', directMode: 'Directo', aiMode: 'IA', waiting: 'Listo para conferencia...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR' },
        fr: { langTitle: 'Langue Conférence', autoProfile: 'Auto (Profil)', micTitle: 'Micro Conférence', voiceToText: 'Texte vocal', directMode: 'Direct', aiMode: 'IA', waiting: 'Prêt pour la conférence...', on: 'MIC ON', aiOn: 'VOIX IA ON', stop: 'STOP' },
        pt: { langTitle: 'Idioma Conferência', autoProfile: 'Auto (Perfil)', micTitle: 'Microfone Conferência', voiceToText: 'Texto de Voz', directMode: 'Direto', aiMode: 'IA', waiting: 'Pronto para conferência...', on: 'MIC ON', aiOn: 'VOZ IA ON', stop: 'PARAR' },
        ja: { langTitle: '会議言語', autoProfile: '自動 (プロフィール)', micTitle: '会議マイク', voiceToText: '音声テキスト', directMode: '直接', aiMode: 'AI', waiting: '会議の準備完了...', on: 'マイクON', aiOn: 'AI音声ON', stop: '停止' },
        zh: { langTitle: '会议语言', autoProfile: '自动 (个人资料)', micTitle: '会议麦克风', voiceToText: '语音文本', directMode: '直接', aiMode: 'AI', waiting: '准备就绪...', on: '麦克风开', aiOn: 'AI语音开', stop: '停止' }
    };

    const MAX_GUEST_SLOTS = 12;
    const CONF_SILENCE_FLUSH_MS = 850;
    const CONF_MAX_CHUNK_WORDS = 14;
    const CONF_MAX_CHUNK_CHARS = 95;
    const CONF_ECHO_COOLDOWN_MS = 650;

    const CF = {
        isActive: false,
        isJoining: false,
        isLeaving: false,
        isStartingAgora: false,
        isTogglingCam: false,
        camEnabled: true,
        agoraPausedForTranslation: false,
        activeChannel: 'avatar', // 'avatar' | 'mic'

        // Agora
        client: null,
        myAgoraUid: null,
        localAudioTrack: null,
        localVideoTrack: null,
        remoteAudioTracks: {},
        remoteVideoTracks: {},
        subscribing: new Set(),

        // Участники и слоты
        slots: new Array(MAX_GUEST_SLOTS).fill(null),
        activeUsers: {},
        liveLangs: {},

        // Firebase слушатели и синхронизация времени
        presenceRef: null,
        usersRef: null,
        usersListener: null,
        langsRef: null,
        langsListener: null,
        msgRef: null,
        msgListener: null,
        listenerStartedAt: 0,
        serverOffset: 0,
        offsetSynced: false,
        seenKeys: new Set(),

        // Микрофон и распознавание (1-в-1 video-room.js)
        recognition: null,
        micActive: false,
        micMode: 'ai-audio', // 'ai-audio' | 'text'
        isSpeakingAI: false,
        micRestartTimer: null,
        micWatchdog: null,
        silenceTimer: null,
        pendingInterim: '',
        lastSentNorm: '',
        lastSentAt: 0,
        recentBuckets: { send: [], tts: [] },

        // Очередь TTS + анти-эхо (1-в-1 video-room.js)
        ttsQueue: [],
        ttsSpeaking: false,
        ttsSafetyTimer: null,
        ttsCooldownTimer: null,
        ttsUnlocked: false,
        recentSpoken: [],
        translateCache: new Map()
    };

    window.HF_CONF_ROOM = CF;
    window.confRoomMicActive = false;

    // Сбрасываем старые сессионные ключи конференции при загрузке (как в video-room.js)
    localStorage.removeItem('hf_conf_avatar_lang');
    localStorage.removeItem('hf_conf_mic_lang');

    // =======================================================
    // 1. ХЕЛПЕРЫ ЯЗЫКА, ФЛАГОВ И ИНТЕРФЕЙСА
    // =======================================================
    function isConfVisible() {
        const page = document.getElementById('conference');
        if (!page) return false;
        if (page.classList.contains('active')) return true;
        return window.currentIndex === 2 || (window.getComputedStyle(page).display !== 'none' && !page.classList.contains('hidden'));
    }

    function getMyId() {
        return (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : '';
    }

    function cfEscapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function cfNormCompare(str) {
        return String(str || '')
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function cfNormLang(code) {
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

    function cfIsRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function cfLangFromEmoji(flag) {
        if (!flag) return null;
        const map = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return map[String(flag).trim()] || null;
    }

    function cfLangFromPhone(phone) {
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

    function getConfNativeLang(userObj) {
        if (!userObj) return 'en';
        const byEmoji = cfLangFromEmoji(userObj.flag);
        if (byEmoji) return byEmoji;
        const byFlagCode = cfNormLang(userObj.flagCode);
        if (byFlagCode) return byFlagCode;
        const byPhone = cfLangFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
        if (byPhone) return byPhone;
        const byCode = cfNormLang(userObj.langCode || userObj.lang);
        if (byCode) return byCode;
        return 'en';
    }

    function getConfNativeFlag(userObj) {
        if (userObj && cfIsRealFlag(userObj.flag)) return String(userObj.flag).trim();
        const lang = getConfNativeLang(userObj);
        return (CONF_LANG_MAP[lang] && CONF_LANG_MAP[lang].flag) ? CONF_LANG_MAP[lang].flag : '🇬🇧';
    }

    function getConfUiDict() {
        const eco = cfNormLang(window.appLang) || cfNormLang(localStorage.getItem('hf_app_lang'));
        const lang = (eco && CONF_UI_FALLBACK[eco]) ? eco : (CONF_UI_FALLBACK[getConfNativeLang(window.myProfileInfo)] ? getConfNativeLang(window.myProfileInfo) : 'en');
        const fb = CONF_UI_FALLBACK[lang] || CONF_UI_FALLBACK.en;
        const globalDict = (window.i18n && (window.i18n[lang] || window.i18n.en)) || {};
        return {
            langTitle: fb.langTitle,
            autoProfile: fb.autoProfile,
            micTitle: fb.micTitle,
            voiceToText: globalDict.voice_text || fb.voiceToText,
            directMode: fb.directMode,
            aiMode: fb.aiMode,
            waiting: fb.waiting,
            on: fb.on,
            aiOn: fb.aiOn,
            stop: fb.stop
        };
    }

    function getMyManualConfLang(channel) {
        const key = (channel === 'mic') ? 'hf_conf_mic_lang' : 'hf_conf_avatar_lang';
        return cfNormLang(localStorage.getItem(key));
    }

    function getMyEffectiveConfInfo(channel) {
        const ch = (channel === 'mic' || channel === 'avatar') ? channel : CF.activeChannel;
        const manual = getMyManualConfLang(ch);
        const lang = (manual && CONF_LANG_MAP[manual]) ? manual : getConfNativeLang(window.myProfileInfo);
        const flag = (manual && CONF_LANG_MAP[manual]) ? CONF_LANG_MAP[manual].flag : getConfNativeFlag(window.myProfileInfo);
        const flagCode = (manual && CONF_LANG_MAP[manual])
            ? CONF_LANG_MAP[manual].flagCode
            : ((window.myProfileInfo && window.myProfileInfo.flagCode)
                ? String(window.myProfileInfo.flagCode).trim().toLowerCase()
                : ((CONF_LANG_MAP[lang] && CONF_LANG_MAP[lang].flagCode) || 'un'));
        return { lang, flag, flagCode, isAuto: !manual };
    }

    function getGuestEffectiveInfo(userObj, channel) {
        if (!userObj) return { lang: 'en', flag: '🇬🇧', flagCode: 'gb' };
        const uid = String(userObj.id);
        const liveAll = CF.liveLangs[uid] || null;
        let picked = null;
        if (liveAll) {
            if (channel && liveAll[channel] && liveAll[channel].langCode) {
                picked = liveAll[channel];
            } else if (liveAll.display && liveAll.display.langCode) {
                picked = liveAll.display;
            } else {
                picked = liveAll.mic || liveAll.avatar || null;
            }
        }
        const lang = (picked && cfNormLang(picked.langCode)) || getConfNativeLang(userObj);
        const flag = (picked && cfIsRealFlag(picked.flag)) ? String(picked.flag).trim() : getConfNativeFlag(userObj);
        const flagCode = (picked && picked.flagCode)
            ? String(picked.flagCode).trim().toLowerCase()
            : ((userObj.flagCode ? String(userObj.flagCode).trim().toLowerCase() : '') || (CONF_LANG_MAP[lang] && CONF_LANG_MAP[lang].flagCode) || 'un');
        return { lang, flag, flagCode };
    }

    function isConfDuplicate(text, bucket) {
        const norm = cfNormCompare(text);
        if (!norm) return true;
        const now = Date.now();
        const win = norm.length > 10 ? 6500 : 2500;
        const list = (CF.recentBuckets[bucket] || []).filter(x => (now - x.ts) < 7000);
        const dup = list.some(x =>
            (x.norm === norm && (now - x.ts) < win) ||
            (norm.length >= 8 && (now - x.ts) < 3500 && x.norm.includes(norm))
        );
        if (dup) {
            CF.recentBuckets[bucket] = list;
            return true;
        }
        list.push({ norm, ts: now });
        CF.recentBuckets[bucket] = list;
        return false;
    }

    async function cfTranslateText(text, targetLang, sourceLang = 'auto') {
        const clean = String(text || '').trim();
        const tl = cfNormLang(targetLang);
        const sl = (sourceLang && sourceLang !== 'auto') ? (cfNormLang(sourceLang) || 'auto') : 'auto';
        if (!clean || !tl) return clean;
        if (sl !== 'auto' && sl === tl) return clean;

        const cacheKey = `${sl}|${tl}|${clean.toLowerCase()}`;
        if (CF.translateCache.has(cacheKey)) return CF.translateCache.get(cacheKey);

        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timeoutId = ctrl ? setTimeout(() => ctrl.abort(), 4500) : null;

        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('').trim();
                if (joined) {
                    if (CF.translateCache.size > 150) CF.translateCache.clear();
                    CF.translateCache.set(cacheKey, joined);
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
    // 2. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ КОНФЕРЕНЦИИ (avatar / mic / display)
    // =======================================================
    function syncMyConfChannelLang(channel, forcedLang, makeActive = true) {
        const myId = getMyId();
        if (channel !== 'avatar' && channel !== 'mic') return;

        if (forcedLang !== undefined) {
            const key = (channel === 'mic') ? 'hf_conf_mic_lang' : 'hf_conf_avatar_lang';
            const clean = cfNormLang(forcedLang);
            if (!clean) localStorage.removeItem(key);
            else localStorage.setItem(key, clean);
        }

        const info = getMyEffectiveConfInfo(channel);
        if (makeActive) CF.activeChannel = channel;

        refreshMyConfFrameUI();
        syncConfAudioByFlags();

        if (!myId || typeof firebase === 'undefined' || !firebase.database) return;

        const payload = {
            langCode: info.lang,
            flagCode: info.flagCode,
            flag: info.flag,
            isAuto: info.isAuto,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const userLangRef = firebase.database().ref(`conf_world/active_langs/${myId}`);
        if (!CF.liveLangs[myId]) CF.liveLangs[myId] = {};
        CF.liveLangs[myId][channel] = payload;
        userLangRef.child(channel).set(payload).catch(() => {});

        if (makeActive) {
            const disp = Object.assign({ channel }, payload);
            CF.liveLangs[myId].display = disp;
            userLangRef.child('display').set(disp).catch(() => {});

            if (CF.isActive && CF.presenceRef) {
                CF.presenceRef.update({
                    langCode: info.lang,
                    flagCode: info.flagCode,
                    flag: info.flag
                }).catch(() => {});
            }
        }
        try { userLangRef.onDisconnect().remove(); } catch (e) {}
    }

    // =======================================================
    // 3. СТИЛИ (СТРОГО БЕЗ ТРОГАНИЯ .video-grid) + ШАПКА + ПОПАПЫ
    // =======================================================
    function injectConfStyles() {
        ['hf-conf-isolated-styles', 'hf-conf-header-only-styles', 'hf-conf-minimal-styles', 'hf-conf-ui-styles'].forEach(id => {
            const old = document.getElementById(id);
            if (old) old.remove();
        });

        if (document.getElementById('hf-cf-v12-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-cf-v12-styles';
        style.textContent = `
            #hf-cf-mode-bar {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                background: #0b141a;
                border: 1px solid #2a3942;
                border-radius: 999px;
                padding: 2px;
                flex-shrink: 0;
            }
            .hf-cf-mode-btn {
                border: none;
                background: transparent;
                color: #8696a0;
                border-radius: 999px;
                padding: 5px 10px;
                font-size: 0.72rem;
                font-weight: 800;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
                transition: all 0.18s ease;
            }
            .hf-cf-mode-btn.active-direct {
                background: #00a884;
                color: #111b21;
            }
            .hf-cf-mode-btn.active-ai {
                background: linear-gradient(135deg, #00a884, #00e5b0);
                color: #111b21;
            }
            #hf-cf-mic-pill {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1 1 auto;
                min-width: 0;
                background: #202c33;
                border: 1px solid #2a3942;
                border-radius: 999px;
                padding: 4px 8px;
                color: #e9edef;
                font-size: 0.75rem;
                font-weight: 700;
                overflow: hidden;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            #hf-cf-mic-pill.live-text {
                border-color: #ef4444;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.35);
            }
            #hf-cf-mic-pill.live-ai {
                border-color: #00e5b0;
                box-shadow: 0 0 12px rgba(0, 229, 176, 0.35);
            }
            #hf-cf-mic-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #8696a0;
                flex-shrink: 0;
            }
            #hf-cf-mic-pill.live-text #hf-cf-mic-dot {
                background: #ef4444;
                animation: hfCfPulse 1s infinite;
            }
            #hf-cf-mic-pill.live-ai #hf-cf-mic-dot {
                background: #00e5b0;
                animation: hfCfPulse 1s infinite;
            }
            #hf-cf-mic-label {
                flex: 1 1 auto;
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                display: block;
                color: #8696a0;
            }
            #hf-cf-mic-pill.live-text #hf-cf-mic-label,
            #hf-cf-mic-pill.live-ai #hf-cf-mic-label {
                color: #ffffff;
            }
            #hf-cf-stop-btn {
                display: none;
                flex-shrink: 0;
                background: #ef4444;
                color: #fff;
                border: none;
                border-radius: 999px;
                padding: 2px 8px;
                font-size: 0.68rem;
                font-weight: 800;
                cursor: pointer;
            }
            #hf-cf-mic-pill.live-text #hf-cf-stop-btn,
            #hf-cf-mic-pill.live-ai #hf-cf-stop-btn {
                display: inline-block;
            }
            .hf-cf-mic-btn-live {
                background: #dc2626 !important;
                color: #fff !important;
                border-color: #ef4444 !important;
            }
            #hf-cf-cam-fallback-btn {
                position: absolute;
                top: 8px;
                left: 8px;
                z-index: 35;
                width: 34px;
                height: 34px;
                border-radius: 999px;
                border: 1px solid #2a3942;
                background: rgba(17, 27, 33, 0.82);
                color: #00e5b0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.9rem;
                cursor: pointer;
            }
            #hf-cf-cam-fallback-btn.cam-off {
                background: rgba(239, 68, 68, 0.25);
                border-color: rgba(239, 68, 68, 0.7);
                color: #f87171;
            }
            #hf-cf-avatar-modal, #hf-cf-mic-popup {
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
            #hf-cf-avatar-modal.active, #hf-cf-mic-popup.active { display: block; }
            #hf-cf-avatar-modal {
                top: 56px;
                right: 10px;
                width: 245px;
                max-height: calc(100% - 130px);
                overflow-y: auto;
            }
            #hf-cf-mic-popup {
                bottom: 64px;
                right: 10px;
                width: 240px;
            }
            .hf-cf-lang-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
                margin-top: 8px;
            }
            .hf-cf-lang-btn {
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
            .hf-cf-lang-btn.selected {
                background: #00a884;
                color: #111b21;
                border-color: #00e5b0;
                font-weight: 800;
            }
            @keyframes hfCfPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }

    function closeAllConfPopups() {
        document.getElementById('hf-cf-avatar-modal')?.classList.remove('active');
        document.getElementById('hf-cf-mic-popup')?.classList.remove('active');
    }

    function getConfBottomMicBtn() {
        const inp = document.getElementById('conf-chat-input');
        const bar = inp ? inp.closest('.chat-input-area') : null;
        if (!bar) return null;
        return bar.querySelector('button[onclick*="Mic"]') || bar.querySelector('button .fa-microphone')?.closest('button') || null;
    }

    function ensureConfHeaderBar() {
        injectConfStyles();
        const confPage = document.getElementById('conference');
        if (!confPage) return;
        const topBar = confPage.firstElementChild;
        if (!topBar) return;

        const d = getConfUiDict();
        if (topBar.dataset.hfCfHeaderReady !== '1') {
            topBar.dataset.hfCfHeaderReady = '1';
            topBar.className = 'flex items-center justify-between gap-2 px-2.5 py-2 bg-[#111b21] border-b border-[#202c33] shrink-0';
            topBar.innerHTML = `
                <div id="hf-cf-mic-pill">
                    <span id="hf-cf-mic-dot"></span>
                    <span id="hf-cf-mic-label">${getMyEffectiveConfInfo().flag} ${cfEscapeHtml(d.directMode)}</span>
                    <button type="button" id="hf-cf-stop-btn">${cfEscapeHtml(d.stop)}</button>
                </div>
                <div id="hf-cf-mode-bar">
                    <button type="button" id="hf-cf-btn-direct" class="hf-cf-mode-btn active-direct">
                        <i class="fa-solid fa-phone-volume"></i>
                        <span id="hf-cf-lbl-direct">${cfEscapeHtml(d.directMode)}</span>
                    </button>
                    <button type="button" id="hf-cf-btn-ai" class="hf-cf-mode-btn">
                        <i class="fa-solid fa-robot"></i>
                        <span id="hf-cf-lbl-ai">${cfEscapeHtml(d.aiMode)}</span>
                    </button>
                </div>
            `;

            topBar.querySelector('#hf-cf-btn-direct').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockConfTTSOnGesture();
                window.switchConfToDirect();
            });
            topBar.querySelector('#hf-cf-btn-ai').addEventListener('click', (e) => {
                e.stopPropagation();
                unlockConfTTSOnGesture();
                window.switchConfToAI();
            });
            topBar.querySelector('#hf-cf-stop-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.stopConfRoomMic(false);
            });
        } else {
            const lblD = document.getElementById('hf-cf-lbl-direct');
            const lblA = document.getElementById('hf-cf-lbl-ai');
            const stopB = document.getElementById('hf-cf-stop-btn');
            if (lblD) lblD.textContent = d.directMode;
            if (lblA) lblA.textContent = d.aiMode;
            if (stopB) stopB.textContent = d.stop;
        }
    }

    function updateConfModeBarUI() {
        ensureConfHeaderBar();
        const btnDirect = document.getElementById('hf-cf-btn-direct');
        const btnAi = document.getElementById('hf-cf-btn-ai');
        if (!btnDirect || !btnAi) return;

        const isDirect = !CF.micActive;
        const isAiActive = CF.micActive && CF.micMode === 'ai-audio';
        btnDirect.classList.toggle('active-direct', isDirect);
        btnAi.classList.toggle('active-ai', isAiActive);
    }

    function updateConfMicPill(preview = '') {
        ensureConfHeaderBar();
        const pill = document.getElementById('hf-cf-mic-pill');
        const label = document.getElementById('hf-cf-mic-label');
        const micBtn = getConfBottomMicBtn();
        const d = getConfUiDict();

        if (!pill) return;

        if (!CF.micActive) {
            pill.classList.remove('live-text', 'live-ai');
            if (label) {
                const info = getMyEffectiveConfInfo('avatar');
                label.textContent = `${info.flag} ${d.directMode}`;
            }
            if (micBtn) micBtn.classList.remove('hf-cf-mic-btn-live');
            updateConfModeBarUI();
            return;
        }

        const micInfo = getMyEffectiveConfInfo('mic');
        const isAi = CF.micMode === 'ai-audio';
        pill.classList.toggle('live-ai', isAi);
        pill.classList.toggle('live-text', !isAi);

        if (label) {
            const idleLabel = isAi ? d.aiOn : d.on;
            label.textContent = preview ? `${micInfo.flag} ${preview}` : `${micInfo.flag} ${idleLabel}`;
            label.scrollLeft = label.scrollWidth;
        }
        if (micBtn) micBtn.classList.add('hf-cf-mic-btn-live');
        updateConfModeBarUI();
    }

    // МЕНЮ АВАТАРА (1-в-1 video-room.js, переключает тумблер на avatar)
    function openConfAvatarLangPanel() {
        injectConfStyles();
        const existing = document.getElementById('hf-cf-avatar-modal');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllConfPopups();
        if (wasOpen) return;

        const host = document.getElementById('conference') || document.body;
        let modal = existing;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hf-cf-avatar-modal';
            modal.addEventListener('click', (e) => e.stopPropagation());
        }
        if (modal.parentNode !== host) host.appendChild(modal);

        const d = getConfUiDict();
        const profileFlag = getConfNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualConfLang('avatar');

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;">🌐 ${cfEscapeHtml(d.langTitle)}</span>
                <button type="button" id="hf-cf-avatar-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <button type="button" data-lang="auto" class="hf-cf-lang-btn ${!currentPref ? 'selected' : ''}" style="width:100%;justify-content:center;">
                ${profileFlag} ${cfEscapeHtml(d.autoProfile)}
            </button>
            <div class="hf-cf-lang-grid">
        `;
        Object.keys(CONF_LANG_MAP).forEach(code => {
            const item = CONF_LANG_MAP[code];
            html += `<button type="button" data-lang="${code}" class="hf-cf-lang-btn ${currentPref === code ? 'selected' : ''}">${item.flag} ${item.name}</button>`;
        });
        html += `</div>`;
        modal.innerHTML = html;

        modal.querySelector('#hf-cf-avatar-close').onclick = () => modal.classList.remove('active');
        modal.querySelectorAll('.hf-cf-lang-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const chosen = btn.getAttribute('data-lang');
                syncMyConfChannelLang('avatar', chosen === 'auto' ? null : chosen, true);
                updateConfMicPill(CF.pendingInterim);
                modal.classList.remove('active');
            };
        });

        modal.classList.add('active');
    }

    // МЕНЮ МИКРОФОНА (1-в-1 video-room.js: выбор языка + "Текст голосом")
    function openConfMicMenu() {
        injectConfStyles();
        const existing = document.getElementById('hf-cf-mic-popup');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllConfPopups();
        if (wasOpen) return;

        const host = document.getElementById('conference') || document.body;
        let popup = existing;
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'hf-cf-mic-popup';
            popup.addEventListener('click', (e) => e.stopPropagation());
        }
        if (popup.parentNode !== host) host.appendChild(popup);

        const d = getConfUiDict();
        const profileFlag = getConfNativeFlag(window.myProfileInfo);
        const currentPref = getMyManualConfLang('mic');

        let optionsHtml = `<option value="auto" ${!currentPref ? 'selected' : ''}>${profileFlag} ${cfEscapeHtml(d.autoProfile)}</option>`;
        Object.keys(CONF_LANG_MAP).forEach(code => {
            const item = CONF_LANG_MAP[code];
            optionsHtml += `<option value="${code}" ${currentPref === code ? 'selected' : ''}>${item.flag} ${item.name}</option>`;
        });

        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;"><i class="fa-solid fa-microphone mr-1"></i> ${cfEscapeHtml(d.micTitle)}</span>
                <button type="button" id="hf-cf-mic-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <select id="hf-cf-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:8px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-cf-mic-text-btn" style="width:100%;background:#00a884;color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone"></i> ${cfEscapeHtml(d.voiceToText)}
            </button>
        `;

        popup.querySelector('#hf-cf-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-cf-mic-select').onchange = (e) => {
            const val = e.target.value;
            syncMyConfChannelLang('mic', (!val || val === 'auto') ? null : val, true);
            updateConfMicPill('');
            if (CF.micActive && !CF.isSpeakingAI) resetConfRecognitionFresh(80);
        };
        popup.querySelector('#hf-cf-mic-text-btn').onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove('active');
            unlockConfTTSOnGesture();
            window.startConfRoomMic('text');
        };

        popup.classList.add('active');
    }

    // =======================================================
    // 4. БЫСТРАЯ ОЧЕРЕДЬ TTS + АНТИ-ЭХО (1-в-1 video-room.js)
    // =======================================================
    function unlockConfTTSOnGesture() {
        if (CF.ttsUnlocked || typeof window.speechSynthesis === 'undefined') return;
        try {
            window.speechSynthesis.getVoices();
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
            CF.ttsUnlocked = true;
        } catch (e) {}
    }

    function stopConfTTSQueue() {
        const hadWork = CF.ttsSpeaking || CF.ttsQueue.length > 0;
        CF.ttsQueue = [];
        CF.ttsSpeaking = false;
        clearTimeout(CF.ttsSafetyTimer);
        clearTimeout(CF.ttsCooldownTimer);
        CF.ttsSafetyTimer = null;
        CF.ttsCooldownTimer = null;
        if (hadWork || CF.isActive) {
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
            if (typeof window.stopVoiceAI === 'function') {
                try { window.stopVoiceAI(); } catch (e) {}
            }
        }
    }

    function pickBestConfVoice(speechLocale) {
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        if (!voices.length) return null;
        const full = String(speechLocale || 'en-US').toLowerCase();
        const short = full.split('-')[0];
        let match = voices.find(v => (v.lang || '').toLowerCase() === full)
            || voices.find(v => (v.lang || '').toLowerCase().startsWith(short));
        if (!match && short === 'az') {
            match = voices.find(v => (v.lang || '').toLowerCase().startsWith('tr'));
        }
        return match || null;
    }

    function pauseConfMicForAI() {
        CF.isSpeakingAI = true;
        clearTimeout(CF.micRestartTimer);
        clearTimeout(CF.silenceTimer);
        clearTimeout(CF.ttsCooldownTimer);
        CF.micRestartTimer = null;
        CF.silenceTimer = null;
        CF.ttsCooldownTimer = null;
        CF.pendingInterim = '';

        if (CF.recognition) {
            try {
                CF.recognition.onresult = null;
                CF.recognition.onend = null;
                CF.recognition.onerror = null;
                CF.recognition.abort();
            } catch (e) {}
            CF.recognition = null;
        }
        if (CF.micActive) updateConfMicPill('');
    }

    function resumeConfMicAfterAI() {
        clearTimeout(CF.ttsCooldownTimer);
        CF.ttsCooldownTimer = setTimeout(() => {
            CF.ttsCooldownTimer = null;
            if (CF.ttsSpeaking || CF.ttsQueue.length > 0) return;
            CF.isSpeakingAI = false;
            if (CF.micActive && CF.isActive) {
                launchConfRecognition();
            }
        }, CONF_ECHO_COOLDOWN_MS);
    }

    function recordConfSpokenText(text) {
        const norm = cfNormCompare(text);
        if (!norm) return;
        const now = Date.now();
        CF.recentSpoken = CF.recentSpoken.filter(item => (now - item.ts) < 7500);
        CF.recentSpoken.push({ norm, words: norm.split(' ').filter(w => w.length >= 2), ts: now });
    }

    function isConfLikelyEcho(candidateText) {
        const candNorm = cfNormCompare(candidateText);
        if (!candNorm) return true;

        const now = Date.now();
        CF.recentSpoken = CF.recentSpoken.filter(item => (now - item.ts) < 7500);
        if (!CF.recentSpoken.length) return false;

        const candWords = candNorm.split(' ').filter(w => w.length >= 2);
        for (const item of CF.recentSpoken) {
            if (candNorm === item.norm) return true;
            if (candNorm.length >= 4 && (item.norm.includes(candNorm) || candNorm.includes(item.norm))) return true;
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

    function processConfTTSQueue() {
        if (CF.ttsSpeaking || !CF.ttsQueue.length || !CF.isActive) return;

        const item = CF.ttsQueue.shift();
        if (!item || !item.text) {
            processConfTTSQueue();
            return;
        }

        pauseConfMicForAI();
        recordConfSpokenText(item.text);

        if (typeof window.speechSynthesis === 'undefined') {
            if (typeof window.playAIVoice === 'function') {
                window.playAIVoice(encodeURIComponent(item.text), item.lang);
            } else {
                resumeConfMicAfterAI();
            }
            return;
        }

        const normLang = cfNormLang(item.lang) || getConfNativeLang(window.myProfileInfo);
        let speechLocale = (CONF_LANG_MAP[normLang] && CONF_LANG_MAP[normLang].speech) || 'en-US';
        const voice = pickBestConfVoice(speechLocale);
        if (normLang === 'az' && voice && voice.lang && voice.lang.toLowerCase().startsWith('tr')) {
            speechLocale = 'tr-TR';
        }

        const utt = new SpeechSynthesisUtterance(item.text);
        utt.lang = speechLocale;
        utt.rate = 1.08;
        utt.pitch = 1.0;
        utt.volume = 1.0;
        if (voice) utt.voice = voice;

        CF.ttsSpeaking = true;
        let finished = false;

        const done = () => {
            if (finished) return;
            finished = true;
            clearTimeout(CF.ttsSafetyTimer);
            CF.ttsSafetyTimer = null;
            CF.ttsSpeaking = false;

            if (CF.ttsQueue.length > 0 && CF.isActive) {
                setTimeout(processConfTTSQueue, 40);
            } else {
                resumeConfMicAfterAI();
            }
        };

        utt.onend = done;
        utt.onerror = done;

        const maxDuration = Math.min(18000, Math.max(4000, item.text.length * 140));
        CF.ttsSafetyTimer = setTimeout(() => {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            done();
        }, maxDuration);

        try {
            window.speechSynthesis.speak(utt);
        } catch (e) {
            done();
        }
    }

    function enqueueConfTTS(text, lang) {
        const clean = String(text || '').trim();
        if (!clean || !CF.isActive) return;
        if (isConfDuplicate(clean, 'tts')) return;

        if (CF.ttsQueue.length >= 3) CF.ttsQueue.shift();
        CF.ttsQueue.push({ text: clean, lang });
        processConfTTSQueue();
    }

    function bindConfAIVoiceCallbacks() {
        if (!window.onAIVoiceStart || !window.onAIVoiceStart._hfConfWrapped) {
            const origStart = window.onAIVoiceStart;
            const wrappedStart = function () {
                if (CF.isActive && isConfVisible()) {
                    pauseConfMicForAI();
                    return;
                }
                if (typeof origStart === 'function') return origStart.apply(this, arguments);
            };
            wrappedStart._hfConfWrapped = true;
            window.onAIVoiceStart = wrappedStart;
        }

        if (!window.onAIVoiceEnd || !window.onAIVoiceEnd._hfConfWrapped) {
            const origEnd = window.onAIVoiceEnd;
            const wrappedEnd = function () {
                if (CF.isActive && isConfVisible()) {
                    if (!CF.ttsSpeaking && CF.ttsQueue.length === 0) resumeConfMicAfterAI();
                    return;
                }
                if (typeof origEnd === 'function') return origEnd.apply(this, arguments);
            };
            wrappedEnd._hfConfWrapped = true;
            window.onAIVoiceEnd = wrappedEnd;
        }
    }

    // =======================================================
    // 5. ПАУЗА / ВОЗВРАТ АУДИО AGORA ПОД АНДРОИД (КАМЕРЫ НЕ ТРОГАЕМ!)
    // =======================================================
    function findGuestByAgoraUid(aUid) {
        const key = String(aUid);
        if (CF.activeUsers[key]) return CF.activeUsers[key];
        const ids = Object.keys(CF.activeUsers);
        for (let i = 0; i < ids.length; i++) {
            const u = CF.activeUsers[ids[i]];
            if (u && (String(u.agoraUid || '') === key || String(u.id) === key)) return u;
        }
        return null;
    }

    function syncConfAudioByFlags() {
        const myInfo = getMyEffectiveConfInfo(CF.micActive ? 'mic' : CF.activeChannel);
        const isAiActive = CF.micActive && CF.micMode === 'ai-audio';

        Object.keys(CF.remoteAudioTracks).forEach(aUid => {
            const track = CF.remoteAudioTracks[aUid];
            if (!track) return;

            // В режиме Direct слышим всех вживую
            if (!CF.agoraPausedForTranslation && !isAiActive) {
                try { track.setVolume(100); } catch (e) {}
                return;
            }

            // В режиме AI / голосового ввода глушим всех с другим флагом (чтобы не перебивали ИИ)
            const guest = findGuestByAgoraUid(aUid);
            if (!guest) {
                try { track.setVolume(0); } catch (e) {}
                return;
            }
            const gInfo = getGuestEffectiveInfo(guest, 'mic');
            const sameFlag = (gInfo.flag && myInfo.flag && gInfo.flag === myInfo.flag) || (gInfo.lang === myInfo.lang);

            const vol = (sameFlag && !CF.isSpeakingAI && !CF.agoraPausedForTranslation) ? 100 : (sameFlag && !CF.isSpeakingAI && isAiActive ? 100 : 0);
            try { track.setVolume(vol); } catch (e) {}
        });
    }

    async function pauseConfAgoraMicForTranslation() {
        CF.agoraPausedForTranslation = true;
        if (CF.localAudioTrack) {
            try {
                await CF.localAudioTrack.setEnabled(false);
            } catch (e) {
                try { await CF.localAudioTrack.setMuted(true); } catch (err) {}
            }
        }
        syncConfAudioByFlags();
    }

    async function resumeConfAgoraMicAfterTranslation() {
        CF.agoraPausedForTranslation = false;
        if (CF.localAudioTrack) {
            try {
                await CF.localAudioTrack.setEnabled(true);
            } catch (e) {
                try { await CF.localAudioTrack.setMuted(false); } catch (err) {}
            }
        }
        syncConfAudioByFlags();
    }

    // =======================================================
    // 6. МИКРОФОН КОНФЕРЕНЦИИ (1-в-1 ДВИЖОК video-room.js)
    // =======================================================
    function dispatchConfVoicePhrase(text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        const norm = cfNormCompare(clean);
        if (!norm) return;

        const now = Date.now();
        if (norm === CF.lastSentNorm && (now - CF.lastSentAt) < 2200) return;
        if (isConfLikelyEcho(clean)) return;

        CF.lastSentNorm = norm;
        CF.lastSentAt = now;

        const payloadType = (CF.micMode === 'ai-audio') ? 'ai-audio' : 'voice';
        window.sendConfRoomPayload(clean, payloadType);
    }

    function resetConfRecognitionFresh(delay = 80) {
        clearTimeout(CF.silenceTimer);
        CF.silenceTimer = null;
        CF.pendingInterim = '';

        if (CF.recognition) {
            try {
                CF.recognition.onresult = null;
                CF.recognition.onend = null;
                CF.recognition.onerror = null;
                CF.recognition.abort();
            } catch (e) {}
            CF.recognition = null;
        }
        if (CF.micActive && !CF.isSpeakingAI && CF.isActive) {
            scheduleConfRestart(delay);
        }
    }

    function flushConfPendingInterim() {
        clearTimeout(CF.silenceTimer);
        CF.silenceTimer = null;

        const phrase = CF.pendingInterim.trim();
        CF.pendingInterim = '';
        updateConfMicPill('');

        if (!phrase || CF.isSpeakingAI) return;

        dispatchConfVoicePhrase(phrase);
        resetConfRecognitionFresh(80);
    }

    function scheduleConfRestart(delay = 80) {
        if (!CF.micActive || CF.isSpeakingAI || !CF.isActive) return;
        clearTimeout(CF.micRestartTimer);
        CF.micRestartTimer = setTimeout(() => {
            CF.micRestartTimer = null;
            launchConfRecognition();
        }, delay);
    }

    function launchConfRecognition() {
        CF.micRestartTimer = null;
        if (!CF.micActive || !CF.isActive || CF.isSpeakingAI) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (CF.recognition) {
            try {
                CF.recognition.onresult = null;
                CF.recognition.onend = null;
                CF.recognition.onerror = null;
                CF.recognition.abort();
            } catch (e) {}
            CF.recognition = null;
        }

        CF.pendingInterim = '';

        try {
            const rec = new SpeechRec();
            const activeLang = getMyEffectiveConfInfo('mic').lang;
            rec.lang = (CONF_LANG_MAP[activeLang] && CONF_LANG_MAP[activeLang].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length || CF.isSpeakingAI) return;

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
                    clearTimeout(CF.silenceTimer);
                    CF.silenceTimer = null;
                    CF.pendingInterim = '';
                    updateConfMicPill('');
                    dispatchConfVoicePhrase(finalTxt);
                    return;
                }

                if (interimTxt) {
                    if (CF.activeChannel !== 'mic' && !isConfLikelyEcho(interimTxt)) {
                        syncMyConfChannelLang('mic', undefined, true);
                    }
                    CF.pendingInterim = interimTxt;
                    updateConfMicPill(interimTxt);

                    const wordsCount = interimTxt.split(/\s+/).length;
                    if (wordsCount >= CONF_MAX_CHUNK_WORDS || interimTxt.length >= CONF_MAX_CHUNK_CHARS) {
                        flushConfPendingInterim();
                        return;
                    }

                    clearTimeout(CF.silenceTimer);
                    CF.silenceTimer = setTimeout(flushConfPendingInterim, activeLang === 'az' ? 1400 : CONF_SILENCE_FLUSH_MS);
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopConfRoomMic(false);
                    return;
                }
                if (CF.pendingInterim.trim() && !CF.isSpeakingAI) {
                    flushConfPendingInterim();
                    return;
                }
                if (CF.micActive && !CF.isSpeakingAI) {
                    CF.recognition = null;
                    scheduleConfRestart(220);
                }
            };

            rec.onend = () => {
                CF.recognition = null;
                if (CF.pendingInterim.trim() && !CF.isSpeakingAI) {
                    const tail = CF.pendingInterim.trim();
                    CF.pendingInterim = '';
                    clearTimeout(CF.silenceTimer);
                    CF.silenceTimer = null;
                    updateConfMicPill('');
                    dispatchConfVoicePhrase(tail);
                }
                if (CF.micActive && !CF.isSpeakingAI) {
                    updateConfMicPill('');
                    scheduleConfRestart(80);
                }
            };

            CF.recognition = rec;
            rec.start();
        } catch (e) {
            CF.recognition = null;
            if (CF.micActive && !CF.isSpeakingAI) scheduleConfRestart(300);
        }
    }

    window.startConfRoomMic = async function (mode = 'ai-audio') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        unlockConfTTSOnGesture();
        if (!CF.isActive) await window.enterConferenceRoom();

        const normalizedMode = (mode === 'text' || mode === 'voice') ? 'text' : 'ai-audio';
        CF.micMode = normalizedMode;
        syncMyConfChannelLang('mic', undefined, true);

        if (CF.micActive) {
            updateConfMicPill('');
            syncConfAudioByFlags();
            return;
        }

        CF.micActive = true;
        CF.isSpeakingAI = false;
        window.confRoomMicActive = true;
        updateConfMicPill('');

        // Освобождаем аппаратный микрофон Android от Agora (камеры остаются работать!)
        await pauseConfAgoraMicForTranslation();
        await new Promise(r => setTimeout(r, 260));

        if (!CF.micActive) return;
        launchConfRecognition();

        clearInterval(CF.micWatchdog);
        CF.micWatchdog = setInterval(() => {
            if (CF.micActive && !CF.isSpeakingAI && !CF.recognition && !CF.micRestartTimer) {
                launchConfRecognition();
            }
        }, 2000);
    };

    window.stopConfRoomMic = async function (skipResumeAgora = false) {
        CF.micActive = false;
        window.confRoomMicActive = false;
        clearTimeout(CF.micRestartTimer);
        clearTimeout(CF.silenceTimer);
        clearInterval(CF.micWatchdog);
        CF.micRestartTimer = null;
        CF.silenceTimer = null;
        CF.micWatchdog = null;
        CF.pendingInterim = '';

        if (CF.recognition) {
            try {
                CF.recognition.onresult = null;
                CF.recognition.onend = null;
                CF.recognition.onerror = null;
                CF.recognition.stop();
            } catch (e) {}
            CF.recognition = null;
        }

        if (!CF.isLeaving) syncMyConfChannelLang('avatar', undefined, true);
        updateConfMicPill('');

        if (skipResumeAgora) {
            CF.agoraPausedForTranslation = false;
        } else {
            await resumeConfAgoraMicAfterTranslation();
        }
    };

    window.switchConfToDirect = async function () {
        stopConfTTSQueue();
        CF.isSpeakingAI = false;
        await window.stopConfRoomMic(false);
        updateConfModeBarUI();
    };

    window.switchConfToAI = async function () {
        unlockConfTTSOnGesture();
        await window.startConfRoomMic('ai-audio');
        updateConfModeBarUI();
    };

    // =======================================================
    // 7. РОДНАЯ СЕТКА .video-grid (1 ГЛАВНОЕ + 12 СЛОТОВ)
    // =======================================================
    function ensureConfCamFallbackBtn() {
        const mainBox = document.getElementById('my-video-container');
        if (!mainBox) return;
        const hasNativeBtn = Boolean(document.getElementById('conf-cam-btn'));
        let fb = document.getElementById('hf-cf-cam-fallback-btn');

        if (hasNativeBtn) {
            if (fb) fb.remove();
            return;
        }
        if (!fb) {
            fb = document.createElement('button');
            fb.type = 'button';
            fb.id = 'hf-cf-cam-fallback-btn';
            fb.innerHTML = '<i class="fa-solid fa-video"></i>';
            mainBox.appendChild(fb);
        }
    }

    function refreshMyConfFrameUI() {
        const info = getMyEffectiveConfInfo(CF.activeChannel);
        const flagImg = document.getElementById('my-conf-flag-img');
        if (flagImg) flagImg.src = `https://flagcdn.com/w40/${info.flagCode}.png`;

        const nameEl = document.getElementById('my-conf-username');
        if (nameEl && window.myUsername) nameEl.textContent = window.myUsername;

        const myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || '';
        const myPhImg = document.getElementById('my-conf-ph-img');
        if (myPhImg && myPhoto && myPhImg.getAttribute('src') !== myPhoto) {
            myPhImg.src = myPhoto;
            myPhImg.classList.remove('hidden');
            const phIcon = document.getElementById('my-conf-ph-icon');
            if (phIcon) phIcon.classList.add('hidden');
        }

        const speakerMarquee = document.getElementById('speaker-marquee');
        if (speakerMarquee) {
            speakerMarquee.setAttribute('data-lang', info.lang);
            speakerMarquee.setAttribute('data-flag', info.flag);
        }
        if (!CF.micActive) {
            const label = document.getElementById('hf-cf-mic-label');
            if (label) label.textContent = `${info.flag} ${getConfUiDict().directMode}`;
        }
        ensureConfCamFallbackBtn();
        updateConfCamBtnUI();
    }

    window.initConference = function () {
        ensureConfHeaderBar();
        bindConfAIVoiceCallbacks();

        const confGrid = document.getElementById('conference-grid');
        if (!confGrid) return;
        confGrid.classList.remove('hf-conf-grid-13');

        if (!confGrid.dataset.cfGridMounted) {
            confGrid.dataset.cfGridMounted = '1';
            const info = getMyEffectiveConfInfo('avatar');
            const d = getConfUiDict();
            const myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || '';

            let html = `
                <div class="video-frame main relative overflow-hidden" id="my-video-container">
                    <video id="my-live-video" class="mirror-video cursor-pointer absolute inset-0 w-full h-full object-cover z-20" playsinline autoplay muted></video>
                    <div id="my-conf-ph" class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#111b21] z-10 hidden">
                        <img id="my-conf-ph-img" src="${cfEscapeHtml(myPhoto)}" class="w-16 h-16 rounded-full object-cover border-2 border-[#2a3942] ${myPhoto ? '' : 'hidden'}">
                        <i id="my-conf-ph-icon" class="fa-solid fa-video-slash text-2xl text-[#8696a0] ${myPhoto ? 'hidden' : ''}"></i>
                    </div>
                    <div id="my-conf-username" class="video-overlay z-30">${cfEscapeHtml(window.myUsername || 'Me')}</div>
                    <div class="flag-overlay cursor-pointer z-30" id="my-conf-flag-wrap" style="top:8px; right:8px;">
                        <img id="my-conf-flag-img" src="https://flagcdn.com/w40/${info.flagCode}.png" class="w-6 rounded-sm border border-[#2a3942]">
                    </div>
                    <div class="translation-bar z-30">
                        <div id="speaker-marquee" class="conf-marquee-text conf-listener-marquee" data-lang="${info.lang}" data-flag="${info.flag}" style="animation-duration: 28s;">
                            ${info.flag} ${cfEscapeHtml(d.waiting)}
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
            ensureConfCamFallbackBtn();
            updateConfCamBtnUI();
        } else {
            refreshMyConfFrameUI();
        }

        bindConfDelegation();
    };

    function renderConfGuestSlot(idx, user) {
        const el = document.getElementById(`conf-slot-${idx}`);
        if (!el) return;

        if (!user) {
            el.className = 'video-frame relative overflow-hidden opacity-60';
            el.removeAttribute('data-uid');
            el.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-[#0b141a]"><i class="fa-solid fa-user text-2xl text-[#2a3942]"></i></div>`;
            return;
        }

        const uid = String(user.id);
        const gInfo = getGuestEffectiveInfo(user);
        const firstName = (user.name || 'User').split(' ')[0];

        if (el.getAttribute('data-uid') === uid) {
            const flagImg = el.querySelector('.cf-slot-flag-img');
            if (flagImg) flagImg.src = `https://flagcdn.com/w40/${gInfo.flagCode}.png`;
            const marq = document.getElementById(`conf-marquee-${uid}`);
            if (marq) {
                marq.setAttribute('data-lang', gInfo.lang);
                marq.setAttribute('data-flag', gInfo.flag);
            }
            attachAllConfVideos();
            return;
        }

        el.className = 'video-frame relative overflow-hidden';
        el.setAttribute('data-uid', uid);
        el.innerHTML = `
            <video id="remote-video-${uid}" class="absolute inset-0 w-full h-full object-cover z-20 hidden" autoplay playsinline muted></video>
            <div id="remote-ph-${uid}" class="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10">
                ${user.photo ? `<img src="${cfEscapeHtml(user.photo)}" class="w-12 h-12 rounded-full object-cover opacity-80">` : `<i class="fa-solid fa-user text-2xl text-[#2a3942]"></i>`}
            </div>
            <div class="video-overlay z-30">${cfEscapeHtml(firstName)}</div>
            <div class="flag-overlay z-30" style="top:8px; right:8px;">
                <img src="https://flagcdn.com/w40/${gInfo.flagCode}.png" class="cf-slot-flag-img w-6 rounded-sm border border-[#2a3942]">
            </div>
            <div class="translation-bar z-30">
                <div id="conf-marquee-${uid}" class="conf-marquee-text conf-listener-marquee" data-lang="${gInfo.lang}" data-flag="${gInfo.flag}" style="animation-duration: 28s;">
                    ${gInfo.flag} ${cfEscapeHtml(firstName)}
                </div>
            </div>
        `;

        attachAllConfVideos();
    }

    function playTrackInVideoElement(videoEl, track, placeholderEl = null) {
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
            videoEl.style.display = 'block';
            if (videoEl.paused) {
                videoEl.play().catch(() => {});
            }
            if (placeholderEl) {
                placeholderEl.classList.add('hidden');
                placeholderEl.style.display = 'none';
            }
        } catch (e) {}
    }

    function hideVideoElement(videoEl, placeholderEl = null) {
        if (videoEl) {
            videoEl.srcObject = null;
            videoEl.classList.add('hidden');
            videoEl.style.display = 'none';
        }
        if (placeholderEl) {
            placeholderEl.classList.remove('hidden');
            placeholderEl.style.display = 'flex';
        }
    }

    function attachLocalConfVideo() {
        const myVideo = document.getElementById('my-live-video');
        const myPh = document.getElementById('my-conf-ph');
        if (!myVideo) return;
        if (CF.localVideoTrack && CF.camEnabled) {
            myVideo.style.opacity = '1';
            playTrackInVideoElement(myVideo, CF.localVideoTrack, myPh);
        } else {
            hideVideoElement(myVideo, myPh);
        }
    }

    function attachAllConfVideos() {
        attachLocalConfVideo();

        const usedTracks = new Set();

        // 1. Точное совпадение по ID пользователя (как в calls.js) или по agoraUid
        Object.keys(CF.activeUsers).forEach(uid => {
            const u = CF.activeUsers[uid];
            if (!u) return;
            const aUid = u.agoraUid ? String(u.agoraUid) : '';
            const trackKey = CF.remoteVideoTracks[uid] ? uid : (aUid && CF.remoteVideoTracks[aUid] ? aUid : '');
            const track = trackKey ? CF.remoteVideoTracks[trackKey] : null;
            const vid = document.getElementById(`remote-video-${uid}`);
            const ph = document.getElementById(`remote-ph-${uid}`);
            if (track && vid) {
                playTrackInVideoElement(vid, track, ph);
                usedTracks.add(trackKey);
            }
        });

        // 2. Резерв: если видео гостя пришло раньше его карточки в Firebase
        Object.keys(CF.remoteVideoTracks).forEach(aUid => {
            if (usedTracks.has(aUid)) return;
            const track = CF.remoteVideoTracks[aUid];
            if (!track) return;

            for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
                const uid = CF.slots[i];
                if (!uid) continue;
                const vid = document.getElementById(`remote-video-${uid}`);
                const ph = document.getElementById(`remote-ph-${uid}`);
                if (vid && vid.classList.contains('hidden')) {
                    playTrackInVideoElement(vid, track, ph);
                    usedTracks.add(aUid);
                    return;
                }
            }

            // Если список гостей ещё пуст — сажаем входящую камеру в первый свободный слот сразу
            const fromPart = (window.participants || []).find(p => String(p.id) === String(aUid));
            const tempId = fromPart ? String(fromPart.id) : `agora_${aUid}`;
            let slotIdx = CF.slots.indexOf(tempId);
            if (slotIdx === -1) slotIdx = CF.slots.indexOf(null);
            if (slotIdx !== -1) {
                CF.slots[slotIdx] = tempId;
                renderConfGuestSlot(slotIdx, fromPart || { id: tempId, name: 'Guest', flag: '🌐', flagCode: 'un', agoraUid: aUid });
                const vid = document.getElementById(`remote-video-${tempId}`);
                const ph = document.getElementById(`remote-ph-${tempId}`);
                if (vid) playTrackInVideoElement(vid, track, ph);
            }
        });
    }

    function syncConfParticipants(usersMap) {
        const myId = getMyId();
        const guests = {};

        Object.keys(usersMap || {}).forEach(uid => {
            const u = usersMap[uid];
            if (!u || String(uid) === myId || uid === 'ai') return;
            guests[String(uid)] = u;
        });

        CF.activeUsers = guests;

        for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
            const occ = CF.slots[i];
            if (!occ) continue;
            if (occ.startsWith('agora_')) {
                const aUid = occ.replace('agora_', '');
                if (!CF.remoteVideoTracks[aUid] || findGuestByAgoraUid(aUid)) {
                    CF.slots[i] = null;
                    renderConfGuestSlot(i, null);
                }
            } else if (!guests[occ] && !CF.remoteVideoTracks[occ]) {
                CF.slots[i] = null;
                renderConfGuestSlot(i, null);
            }
        }

        Object.keys(guests).forEach(uid => {
            let idx = CF.slots.indexOf(uid);
            if (idx === -1) {
                idx = CF.slots.indexOf(null);
                if (idx !== -1) CF.slots[idx] = uid;
            }
            if (idx !== -1) renderConfGuestSlot(idx, guests[uid]);
        });

        attachAllConfVideos();
        syncConfAudioByFlags();
    }

    // =======================================================
    // 8. ПОДКЛЮЧЕНИЕ КАМЕР ДЛЯ ВСЕХ (1-в-1 ПОРЯДОК ИЗ calls.js)
    // =======================================================
    async function subscribeConfRemote(user, mediaType) {
        if (!CF.client || !user) return;
        const aUid = String(user.uid);
        const lock = `${aUid}:${mediaType}`;
        if (CF.subscribing.has(lock)) return;

        CF.subscribing.add(lock);
        try {
            await CF.client.subscribe(user, mediaType);
            if (mediaType === 'video' && user.videoTrack) {
                CF.remoteVideoTracks[aUid] = user.videoTrack;
                attachAllConfVideos();
            }
            if (mediaType === 'audio' && user.audioTrack) {
                CF.remoteAudioTracks[aUid] = user.audioTrack;
                user.audioTrack.play();
                syncConfAudioByFlags();
            }
        } catch (e) {
            console.warn('Conf subscribe:', lock, e);
        } finally {
            CF.subscribing.delete(lock);
        }
    }

    async function startConfAgora() {
        if (CF.isStartingAgora || CF.isLeaving) return;
        if (typeof AgoraRTC === 'undefined') {
            setTimeout(() => { if (CF.isActive && !CF.isLeaving) startConfAgora(); }, 1000);
            return;
        }
        if (CF.client && CF.client.connectionState === 'CONNECTED') {
            attachAllConfVideos();
            return;
        }

        CF.isStartingAgora = true;

        try {
            if (CF.client) {
                try { await CF.client.leave(); } catch (e) {}
                CF.client = null;
            }

            CF.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

            CF.client.on('user-published', (user, mediaType) => {
                subscribeConfRemote(user, mediaType);
            });

            CF.client.on('user-unpublished', (user, mediaType) => {
                const aUid = String(user.uid);
                if (mediaType === 'video') {
                    delete CF.remoteVideoTracks[aUid];
                    const guest = findGuestByAgoraUid(aUid);
                    const domId = guest ? String(guest.id) : (document.getElementById(`remote-video-${aUid}`) ? aUid : `agora_${aUid}`);
                    hideVideoElement(document.getElementById(`remote-video-${domId}`), document.getElementById(`remote-ph-${domId}`));
                }
                if (mediaType === 'audio') {
                    if (user.audioTrack) {
                        try { user.audioTrack.stop(); } catch (e) {}
                    }
                    delete CF.remoteAudioTracks[aUid];
                }
            });

            CF.client.on('user-left', (user) => {
                const aUid = String(user.uid);
                const guest = findGuestByAgoraUid(aUid);
                const domId = guest ? String(guest.id) : (document.getElementById(`remote-video-${aUid}`) ? aUid : `agora_${aUid}`);
                hideVideoElement(document.getElementById(`remote-video-${domId}`), document.getElementById(`remote-ph-${domId}`));
                delete CF.remoteVideoTracks[aUid];
                delete CF.remoteAudioTracks[aUid];
            });

            const appId = window.CALLS_AGORA_APP_ID || (typeof AGORA_APP_ID !== 'undefined' ? AGORA_APP_ID : window.AGORA_APP_ID) || '';
            const token = window.CALLS_AGORA_TEMP_TOKEN || (typeof AGORA_TEMP_TOKEN !== 'undefined' ? AGORA_TEMP_TOKEN : window.AGORA_TEMP_TOKEN) || null;
            const channelName = window.CONF_AGORA_CHANNEL || window.CALLS_AGORA_CHANNEL || 'hello';
            const myId = getMyId() || null;

            if (!appId) return;

            let joinedUid = null;
            try {
                joinedUid = await CF.client.join(appId, channelName, token, myId);
            } catch (joinErr) {
                joinedUid = await CF.client.join(appId, channelName, token, null);
            }
            if (!CF.isActive || CF.isLeaving) {
                try { await CF.client.leave(); } catch (e) {}
                CF.client = null;
                return;
            }
            CF.myAgoraUid = String(joinedUid);

            if (CF.presenceRef) {
                CF.presenceRef.update({ agoraUid: CF.myAgoraUid }).catch(() => {});
            }

            const tracksToPublish = [];

            if (CF.localAudioTrack) {
                try { CF.localAudioTrack.close(); } catch (e) {}
                CF.localAudioTrack = null;
            }
            try {
                CF.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
                    AEC: true,
                    ANS: true,
                    AGC: true
                });
                tracksToPublish.push(CF.localAudioTrack);
            } catch (micErr) {
                console.warn('Conf mic unavailable:', micErr);
            }

            if (CF.localVideoTrack) {
                try { CF.localVideoTrack.close(); } catch (e) {}
                CF.localVideoTrack = null;
            }
            if (CF.camEnabled) {
                try {
                    CF.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    CF.camEnabled = true;
                    attachLocalConfVideo();
                    updateConfCamBtnUI();
                    tracksToPublish.push(CF.localVideoTrack);
                } catch (camErr) {
                    console.warn('Conf camera unavailable:', camErr);
                    CF.camEnabled = false;
                    attachLocalConfVideo();
                    updateConfCamBtnUI();
                }
            } else {
                attachLocalConfVideo();
                updateConfCamBtnUI();
            }

            if (tracksToPublish.length > 0 && CF.client && CF.client.connectionState === 'CONNECTED') {
                await CF.client.publish(tracksToPublish);
            }

            (CF.client.remoteUsers || []).forEach(rem => {
                if (rem.hasVideo) subscribeConfRemote(rem, 'video');
                if (rem.hasAudio) subscribeConfRemote(rem, 'audio');
            });

            if (CF.micActive || CF.agoraPausedForTranslation) {
                await pauseConfAgoraMicForTranslation();
            }
        } catch (e) {
            console.warn('Conf Agora error:', e);
            if (window.showToast) {
                window.showToast('Agora Conf', 'Ошибка подключения: ' + (e.code || e.message || e), '', '');
            }
        } finally {
            CF.isStartingAgora = false;
        }
    }

    window.enterConferenceRoom = async function () {
        window.initConference();
        refreshMyConfFrameUI();

        const myId = getMyId();
        if (!myId) {
            setTimeout(() => { if (isConfVisible() && !CF.isLeaving) window.enterConferenceRoom(); }, 700);
            return;
        }

        if (CF.isJoining || CF.isLeaving) return;
        if (CF.isActive && CF.client && CF.client.connectionState === 'CONNECTED') {
            attachAllConfVideos();
            return;
        }

        CF.isActive = true;
        CF.isJoining = true;

        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                if (!CF.offsetSynced) {
                    CF.offsetSynced = true;
                    firebase.database().ref('.info/serverTimeOffset').on('value', (s) => {
                        CF.serverOffset = s.val() || 0;
                    });
                }

                const myInfo = getMyEffectiveConfInfo(CF.activeChannel);
                CF.presenceRef = firebase.database().ref(`conf_world/active_users/${myId}`);
                CF.presenceRef.set({
                    id: myId,
                    name: window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User',
                    photo: (window.myProfileInfo && window.myProfileInfo.photo) || '',
                    flag: myInfo.flag,
                    flagCode: myInfo.flagCode,
                    langCode: myInfo.lang,
                    agoraUid: CF.myAgoraUid || myId,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                });
                CF.presenceRef.onDisconnect().remove();

                syncMyConfChannelLang('avatar', undefined, CF.activeChannel === 'avatar');
                syncMyConfChannelLang('mic', undefined, CF.activeChannel === 'mic');

                if (!CF.langsListener) {
                    CF.langsRef = firebase.database().ref('conf_world/active_langs');
                    CF.langsListener = CF.langsRef.on('value', (snap) => {
                        CF.liveLangs = snap.val() || {};
                        Object.keys(CF.activeUsers).forEach(uid => {
                            const idx = CF.slots.indexOf(uid);
                            if (idx !== -1) renderConfGuestSlot(idx, CF.activeUsers[uid]);
                        });
                        syncConfAudioByFlags();
                    });
                }

                if (!CF.usersListener) {
                    CF.usersRef = firebase.database().ref('conf_world/active_users');
                    CF.usersListener = CF.usersRef.on('value', (snap) => {
                        syncConfParticipants(snap.val() || {});
                    });
                }

                if (!CF.msgListener) {
                    CF.seenKeys.clear();
                    CF.listenerStartedAt = Date.now() + (CF.serverOffset || 0);
                    CF.msgRef = firebase.database().ref('conf_world/messages');
                    CF.msgListener = CF.msgRef.limitToLast(15).on('child_added', handleIncomingConfMsg);
                }
            }

            await startConfAgora();
        } finally {
            CF.isJoining = false;
        }
    };

    window.toggleConfCamera = async function () {
        if (CF.isTogglingCam) return;
        CF.isTogglingCam = true;

        const nextEnabled = !CF.camEnabled;
        try {
            if (nextEnabled) {
                if (!CF.localVideoTrack && CF.client && CF.client.connectionState === 'CONNECTED' && typeof AgoraRTC !== 'undefined') {
                    CF.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    await CF.client.publish([CF.localVideoTrack]);
                } else if (CF.localVideoTrack) {
                    try {
                        await CF.localVideoTrack.setEnabled(true);
                    } catch (e) {
                        await CF.localVideoTrack.setMuted(false);
                    }
                }
                CF.camEnabled = true;
            } else {
                if (CF.localVideoTrack) {
                    try {
                        await CF.localVideoTrack.setEnabled(false);
                    } catch (e) {
                        await CF.localVideoTrack.setMuted(true);
                    }
                }
                CF.camEnabled = false;
            }
            attachLocalConfVideo();
            updateConfCamBtnUI();
        } catch (e) {
            console.warn('Conf cam toggle:', e);
        } finally {
            CF.isTogglingCam = false;
        }
    };

    function updateConfCamBtnUI() {
        const btn = document.getElementById('conf-cam-btn');
        if (btn) {
            btn.className = CF.camEnabled
                ? 'w-[44px] h-[44px] rounded-full bg-[#202c33] text-white flex justify-center items-center text-xl hover:bg-[#2a3942] transition'
                : 'w-[44px] h-[44px] rounded-full bg-red-500/20 text-red-400 border border-red-500/50 flex justify-center items-center text-xl transition';
            btn.innerHTML = CF.camEnabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
        }
        const fb = document.getElementById('hf-cf-cam-fallback-btn');
        if (fb) {
            fb.classList.toggle('cam-off', !CF.camEnabled);
            fb.innerHTML = CF.camEnabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
        }
    }

    window.leaveConferenceRoom = async function () {
        if (CF.isLeaving) return;
        CF.isLeaving = true;
        CF.isActive = false;
        CF.isJoining = false;
        CF.isStartingAgora = false;

        // Сразу закрываем конференцию и перекидываем в глобальный чат
        closeAllConfPopups();
        if (typeof window.switchTab === 'function') window.switchTab(0);
        if (typeof window.openGlobalChat === 'function') {
            try { window.openGlobalChat(); } catch (e) {}
        }

        try {
            CF.myAgoraUid = null;
            CF.subscribing.clear();
            CF.seenKeys.clear();
            CF.recentSpoken = [];
            CF.recentBuckets = { send: [], tts: [] };

            stopConfTTSQueue();
            await window.stopConfRoomMic(true);

            // Сброс сессионных языков конференции при выходе (как в video-room.js)
            localStorage.removeItem('hf_conf_avatar_lang');
            localStorage.removeItem('hf_conf_mic_lang');
            CF.activeChannel = 'avatar';
            CF.camEnabled = true;

            const myId = getMyId();
            if (myId && typeof firebase !== 'undefined' && firebase.database) {
                firebase.database().ref(`conf_world/active_langs/${myId}`).remove().catch(() => {});
            }
            if (CF.presenceRef) { try { await CF.presenceRef.remove(); } catch (e) {} CF.presenceRef = null; }
            if (CF.usersRef && CF.usersListener) { CF.usersRef.off('value', CF.usersListener); CF.usersListener = null; }
            if (CF.langsRef && CF.langsListener) { CF.langsRef.off('value', CF.langsListener); CF.langsListener = null; }
            if (CF.msgRef && CF.msgListener) { CF.msgRef.off('child_added', CF.msgListener); CF.msgListener = null; }

            if (CF.localAudioTrack) { try { CF.localAudioTrack.close(); } catch (e) {} CF.localAudioTrack = null; }
            if (CF.localVideoTrack) { try { CF.localVideoTrack.close(); } catch (e) {} CF.localVideoTrack = null; }
            if (CF.client) { try { await CF.client.leave(); } catch (e) {} CF.client = null; }

            CF.remoteAudioTracks = {};
            CF.remoteVideoTracks = {};
            CF.activeUsers = {};
            CF.liveLangs = {};
            for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
                CF.slots[i] = null;
                renderConfGuestSlot(i, null);
            }

            const myVideo = document.getElementById('my-live-video');
            const myPh = document.getElementById('my-conf-ph');
            hideVideoElement(myVideo, myPh);

            updateConfMicPill('');
            updateConfModeBarUI();
            updateConfCamBtnUI();
        } finally {
            CF.isLeaving = false;
        }
    };

    window.isMeetMarqueeEnabled = true;
    window.toggleMeetMarquee = function () {
        window.isMeetMarqueeEnabled = !window.isMeetMarqueeEnabled;
        document.querySelectorAll('#conference .translation-bar').forEach(b => {
            b.style.opacity = window.isMeetMarqueeEnabled ? '1' : '0';
        });
    };

    // =======================================================
    // 9. ОТПРАВКА И ПРИЁМ СООБЩЕНИЙ (ЧЁТКОЕ РАЗДЕЛЕНИЕ keyboard / voice / ai-audio)
    // =======================================================
    function setConfMarquee(el, html) {
        if (!el) return;
        el.innerHTML = html;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = null;
    }

    window.sendConfRoomPayload = async function (rawText, sourceType = 'keyboard') {
        const cleanText = String(rawText || '').trim();
        if (!cleanText || typeof firebase === 'undefined' || !firebase.database) return;

        const isVoice = (sourceType === 'voice' || sourceType === 'ai-audio');
        if (isVoice && isConfDuplicate(cleanText, 'send')) return;

        const channel = isVoice ? 'mic' : 'avatar';
        syncMyConfChannelLang(channel, undefined, true);

        const myInfo = getMyEffectiveConfInfo(channel);
        const safeId = getMyId() || 'guest';
        const safeName = (window.myUsername || (window.myProfileInfo && window.myProfileInfo.name) || 'User').split(' ')[0];
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';

        const baseText = isVoice
            ? cleanText
            : await cfTranslateText(cleanText, myInfo.lang);

        firebase.database().ref('conf_world/messages').push({
            userId: safeId,
            sessionId: window.mySessionId || 'sess',
            name: safeName,
            photo: safePhoto,
            flag: myInfo.flag,
            flagCode: myInfo.flagCode,
            langCode: myInfo.lang,
            originalText: baseText,
            text: baseText,
            sourceType: sourceType,
            inputChannel: channel,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isConfWorldMsg: true
        }).catch(() => {});
    };

    window.sendConfRoomMsg = async function () {
        const input = document.getElementById('conf-chat-input');
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendConfRoomPayload(raw, 'keyboard');
    };
    window.sendConfMsg = window.sendConfRoomMsg;

    function handleIncomingConfMsg(snapshot) {
        const data = snapshot.val();
        if (!data || !data.text) return;
        if (CF.seenKeys.has(snapshot.key)) return;
        CF.seenKeys.add(snapshot.key);
        if (CF.seenKeys.size > 150) CF.seenKeys.delete(CF.seenKeys.values().next().value);

        const serverNow = Date.now() + (CF.serverOffset || 0);
        if (data.timestamp) {
            if (CF.listenerStartedAt && data.timestamp < (CF.listenerStartedAt - 5000)) return;
            if ((serverNow - data.timestamp) > 60000) return;
        }

        const myId = getMyId();
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const senderName = isMe ? (window.myUsername || 'Me').split(' ')[0] : (data.name || 'User').split(' ')[0];
        const senderLang = cfNormLang(data.langCode) || cfLangFromEmoji(data.flag) || cfNormLang(data.flagCode) || 'en';
        const senderFlag = cfIsRealFlag(data.flag) ? String(data.flag).trim() : ((CONF_LANG_MAP[senderLang] && CONF_LANG_MAP[senderLang].flag) || '🌐');
        const originalText = String(data.originalText || data.text || '').trim();
        if (!originalText) return;

        // 1. В окне самого отправителя всегда бежит его оригинал
        const speakerMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
        setConfMarquee(
            document.getElementById(speakerMarqueeId),
            `<span class="text-white font-bold">${cfEscapeHtml(senderName)}:</span> <span class="text-[#00a884] ml-1.5">${cfEscapeHtml(senderFlag)} ${cfEscapeHtml(originalText)}</span>`
        );

        // 2. В моём главном окне (если сообщение от другого участника)
        const incomingChannel = (data.inputChannel === 'mic' || data.sourceType === 'voice' || data.sourceType === 'ai-audio')
            ? 'mic'
            : 'avatar';

        if (!isMe && CF.activeChannel !== incomingChannel) {
            syncMyConfChannelLang(incomingChannel, undefined, true);
        }

        const myInfo = getMyEffectiveConfInfo(incomingChannel);
        const mainMarquee = document.getElementById('speaker-marquee');

        if (!isMe && mainMarquee) {
            const isSameFlag = (senderFlag && myInfo.flag && senderFlag === myInfo.flag) || (senderLang === myInfo.lang);

            if (isSameFlag) {
                setConfMarquee(
                    mainMarquee,
                    `<span class="text-[#8696a0] text-[0.65rem] uppercase">${cfEscapeHtml(senderName)}:</span> <span class="text-white font-bold ml-1.5">${cfEscapeHtml(senderFlag)} ${cfEscapeHtml(originalText)}</span>`
                );
            } else {
                cfTranslateText(originalText, myInfo.lang, senderLang).then(translated => {
                    setConfMarquee(
                        mainMarquee,
                        `<span class="text-[#8696a0] text-[0.65rem] uppercase">${cfEscapeHtml(senderName)}:</span> <span class="text-yellow-400 font-bold ml-1.5">${cfEscapeHtml(myInfo.flag)} ${cfEscapeHtml(translated)}</span>`
                    );
                    // ИИ-озвучка СТРОГО только на ai-audio (чат keyboard и voice-text НЕ озвучиваются)
                    if (data.sourceType === 'ai-audio' && CF.isActive) {
                        enqueueConfTTS(translated, myInfo.lang);
                    }
                });
            }
        }

        // 3. Веер по остальным занятым фреймам участников
        const otherMarquees = Array.from(document.querySelectorAll('#conference .conf-listener-marquee'))
            .filter(el => el.id !== speakerMarqueeId && el.id !== 'speaker-marquee');

        const byLang = {};
        otherMarquees.forEach(el => {
            const uid = el.id.replace('conf-marquee-', '');
            const guest = CF.activeUsers[uid];
            const gInfo = guest ? getGuestEffectiveInfo(guest, incomingChannel) : null;
            const tl = (gInfo && gInfo.lang) || cfNormLang(el.getAttribute('data-lang')) || 'en';
            if (gInfo && gInfo.flag) el.setAttribute('data-flag', gInfo.flag);
            if (!byLang[tl]) byLang[tl] = [];
            byLang[tl].push(el);
        });

        Object.keys(byLang).forEach(tl => {
            if (tl === senderLang) {
                byLang[tl].forEach(el => {
                    const tf = el.getAttribute('data-flag') || senderFlag;
                    setConfMarquee(el, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${cfEscapeHtml(senderName)}:</span> <span class="text-white font-bold ml-1.5">${cfEscapeHtml(tf)} ${cfEscapeHtml(originalText)}</span>`);
                });
            } else {
                cfTranslateText(originalText, tl, senderLang).then(tr => {
                    byLang[tl].forEach(el => {
                        const tf = el.getAttribute('data-flag') || '🌐';
                        setConfMarquee(el, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${cfEscapeHtml(senderName)}:</span> <span class="text-yellow-400 font-bold ml-1.5">${cfEscapeHtml(tf)} ${cfEscapeHtml(tr)}</span>`);
                    });
                });
            }
        });
    }

    // =======================================================
    // 10. ПЕРЕХВАТ КНОПОК СТРОГО ВНУТРИ #conference (1-в-1 video-room.js)
    // =======================================================
    function bindConfDelegation() {
        const confPage = document.getElementById('conference');
        if (!confPage || confPage.dataset.hfCfDelegated === '1') return;
        confPage.dataset.hfCfDelegated = '1';

        confPage.addEventListener('click', (e) => {
            unlockConfTTSOnGesture();

            // Кнопка включения/выключения камеры (проверяем ДО клика по #my-video-container)
            const camBtn = e.target.closest('#conf-cam-btn, #hf-cf-cam-fallback-btn, button[onclick*="toggleConfCamera"]');
            if (camBtn) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.toggleConfCamera();
                return;
            }

            // Клик по своему видео / флагу -> языковая панель аватара
            if (e.target.closest('#my-video-container')) {
                e.preventDefault();
                e.stopPropagation();
                openConfAvatarLangPanel();
                return;
            }

            // Красная кнопка выхода (только для себя -> в глоб-чат)
            const redBtn = e.target.closest('button.bg-red-500, button.bg-red-600, button[onclick*="leaveConference"]')
                || (e.target.closest('.fa-phone-slash') ? e.target.closest('button') : null);
            if (redBtn && redBtn.id !== 'conf-cam-btn' && !redBtn.closest('#hf-cf-mic-pill')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.leaveConferenceRoom();
                return;
            }

            // Нижняя строка ввода конференции: микрофон и отправка
            const chatArea = e.target.closest('.chat-input-area');
            if (chatArea) {
                const btn = e.target.closest('button');
                if (btn) {
                    const attr = btn.getAttribute('onclick') || '';
                    if (attr.includes('sendFirebaseMsg') || btn.querySelector('.fa-paper-plane')) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.sendConfRoomMsg();
                        return;
                    }
                    if (attr.includes('Mic') || btn.querySelector('.fa-microphone')) {
                        e.preventDefault();
                        e.stopPropagation();
                        openConfMicMenu();
                        return;
                    }
                }
            }
        }, true);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && document.activeElement && document.activeElement.id === 'conf-chat-input') {
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendConfRoomMsg();
            }
        }, true);

        const ecoSelect = document.getElementById('app-lang-select');
        if (ecoSelect && !ecoSelect.dataset.hfCfEcoBound) {
            ecoSelect.dataset.hfCfEcoBound = '1';
            ecoSelect.addEventListener('change', () => {
                setTimeout(() => {
                    ensureConfHeaderBar();
                    updateConfMicPill(CF.pendingInterim);
                }, 60);
            });
        }
    }

    // =======================================================
    // 11. ПРИГЛАШЕНИЯ И ПРИЁМНИК УВЕДОМЛЕНИЙ (13 ЯЗЫКОВ)
    // =======================================================
    window.confDict = {
        ru: { title: 'ПРИГЛАШЕНИЕ', desc: 'ждёт вас на конференции!', btn: 'Войти', no: 'Позже' },
        en: { title: 'INVITATION', desc: 'is waiting for you in the conference!', btn: 'Join', no: 'Later' },
        it: { title: 'INVITO', desc: 'ti aspetta nella conferenza!', btn: 'Entra', no: 'Più tardi' },
        es: { title: 'INVITACIÓN', desc: 'te espera en la conferencia!', btn: 'Unirse', no: 'Más tarde' },
        fr: { title: 'INVITATION', desc: 'vous attend dans la conférence!', btn: 'Rejoindre', no: 'Plus tard' },
        de: { title: 'EINLADUNG', desc: 'wartet auf dich in der Konferenz!', btn: 'Beitreten', no: 'Später' },
        pt: { title: 'CONVITE', desc: 'espera por você na conferência!', btn: 'Entrar', no: 'Mais tarde' },
        tr: { title: 'DAVET', desc: 'seni konferansta bekliyor!', btn: 'Katıl', no: 'Sonra' },
        az: { title: 'DƏVƏT', desc: 'sizi konfransda gözləyir!', btn: 'Qoşul', no: 'Sonra' },
        kk: { title: 'ШАҚЫРУ', desc: 'сізді конференцияда күтуде!', btn: 'Қосылу', no: 'Кейін' },
        ar: { title: 'دعوة', desc: 'ينتظرك في المؤتمر!', btn: 'انضمام', no: 'لاحقاً' },
        ja: { title: '招待', desc: '会議でお待ちしています！', btn: '参加', no: '後で' },
        zh: { title: '邀请', desc: '在会议中等您！', btn: '加入', no: '稍后' }
    };

    window.getConfTranslation = function (key) {
        const uiLang = cfNormLang(window.appLang) || getConfNativeLang(window.myProfileInfo) || 'en';
        const dict = window.confDict[uiLang] || window.confDict.en;
        return dict[key] || '';
    };

    window.openGroupInviteModal = function () {
        const list = document.getElementById('group-invite-list');
        if (!list) return;
        list.innerHTML = '';
        const myId = getMyId();
        (window.participants || []).forEach(p => {
            if (!p || String(p.id) === myId || p.id === 'ai') return;
            list.innerHTML += `
                <label class="flex items-center justify-between p-3 bg-[#202c33] rounded-xl border border-[#2a3942] cursor-pointer hover:border-[#00a884] transition">
                    <div class="flex items-center gap-3">
                        <img src="${cfEscapeHtml(p.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-10 h-10 rounded-full object-cover">
                        <span class="text-white font-bold">${cfEscapeHtml(p.flag || '')} ${cfEscapeHtml(p.name ? p.name.split(' ')[0] : 'User')}</span>
                    </div>
                    <input type="checkbox" value="${cfEscapeHtml(p.id)}" class="w-5 h-5 accent-[#00a884] invite-checkbox">
                </label>
            `;
        });
        const modal = document.getElementById('group-invite-modal');
        const content = document.getElementById('group-invite-content');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        if (content) setTimeout(() => { content.classList.remove('scale-95'); content.classList.add('scale-100'); }, 10);
    };

    window.closeGroupInviteModal = function () {
        const modal = document.getElementById('group-invite-modal');
        const content = document.getElementById('group-invite-content');
        if (content) { content.classList.remove('scale-100'); content.classList.add('scale-95'); }
        if (modal) setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 200);
    };

    window.selectAllForInvite = function () {
        document.querySelectorAll('.invite-checkbox').forEach(cb => { cb.checked = true; });
    };

    window.sendGroupInvites = function () {
        const checked = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
        if (!checked.length) {
            if (window.showToast) window.showToast('Ошибка', 'Выберите пользователей!', '', '');
            return;
        }
        const myId = getMyId();
        const myInfo = getMyEffectiveConfInfo(CF.activeChannel);
        checked.forEach(cb => {
            firebase.database().ref('user_notifications/' + cb.value).push({
                type: 'conference',
                senderId: myId,
                name: window.myUsername || 'User',
                photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
                flag: myInfo.flag,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });
        unlockConfTTSOnGesture();
        window.enterConferenceRoom();
        if (window.showToast) window.showToast('Успех', 'Приглашения отправлены!', '', '');
        window.closeGroupInviteModal();
    };

    window.listenForDirectInvites = function () {
        if (!getMyId()) return setTimeout(window.listenForDirectInvites, 1000);
        if (window._confDirectInviteListening) return;
        window._confDirectInviteListening = true;

        refreshMyConfFrameUI();

        firebase.database().ref('user_notifications/' + getMyId()).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            if (window.sndMsg) window.sndMsg.play().catch(() => {});
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);

            const notifType = data.type || 'conference';
            const firstName = (data.name || 'User').split(' ')[0];
            const popup = document.createElement('div');
            popup.className = 'absolute top-4 left-4 right-4 mx-auto z-[9999] max-w-[280px] bg-[#111b21] border rounded-xl p-2.5';

            if (notifType === 'conference') {
                popup.classList.add('border-[#00a884]', 'shadow-[0_0_15px_rgba(0,168,132,0.4)]');
                popup.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${cfEscapeHtml(data.photo)}" class="w-10 h-10 shrink-0 rounded-full border border-[#00a884] object-cover">
                        <div class="flex flex-col flex-1">
                            <span class="text-[0.65rem] text-[#00a884] font-bold uppercase">${cfEscapeHtml(window.getConfTranslation('title'))}</span>
                            <span class="text-white text-[0.8rem]"><b>${cfEscapeHtml(data.flag || '🌐')} ${cfEscapeHtml(firstName)}</b> ${cfEscapeHtml(window.getConfTranslation('desc'))}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button id="btn-no-${snapshot.key}" class="flex-1 bg-[#202c33] text-[#8696a0] py-1.5 rounded-lg font-bold text-[0.7rem]">${cfEscapeHtml(window.getConfTranslation('no'))}</button>
                        <button id="btn-yes-${snapshot.key}" class="flex-1 bg-[#00a884] text-[#111b21] py-1.5 rounded-lg font-bold text-[0.7rem] flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-video"></i> ${cfEscapeHtml(window.getConfTranslation('btn'))}
                        </button>
                    </div>
                `;
            } else if (notifType === 'missed_call') {
                popup.classList.add('border-red-500', 'cursor-pointer');
                popup.innerHTML = `<div class="text-white text-xs"><b>${cfEscapeHtml(data.flag || '🌐')} ${cfEscapeHtml(firstName)}</b> — ${data.isVideo ? 'пропущенный видеовызов' : 'пропущенный аудиовызов'}</div>`;
            } else if (notifType === 'email') {
                popup.classList.add('border-blue-500', 'cursor-pointer');
                popup.innerHTML = `<div class="text-white text-xs">📧 Новое письмо от <b>${cfEscapeHtml(firstName)}</b></div>`;
            }

            (document.querySelector('.app-wrap') || document.querySelector('#app') || document.body).appendChild(popup);

            if (notifType === 'conference') {
                document.getElementById(`btn-no-${snapshot.key}`).onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(0);
                    popup.remove();
                    snapshot.ref.remove();
                };
                document.getElementById(`btn-yes-${snapshot.key}`).onclick = () => {
                    if (navigator.vibrate) navigator.vibrate(0);
                    unlockConfTTSOnGesture();
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

    // =======================================================
    // 12. ИНИЦИАЛИЗАЦИЯ И АВТОПОДКЛЮЧЕНИЕ ПРИ ОТКРЫТИИ ВКЛАДКИ
    // =======================================================
    function watchConfTabVisibility() {
        const confPage = document.getElementById('conference');
        if (!confPage || confPage.dataset.cfVisWatched === '1') return;
        confPage.dataset.cfVisWatched = '1';

        const check = () => {
            if (isConfVisible() && !CF.isLeaving) {
                if (!CF.isActive) window.enterConferenceRoom();
                else attachAllConfVideos();
            }
        };

        new MutationObserver(check).observe(confPage, { attributes: true, attributeFilter: ['class', 'style'] });
        check();
    }

    function hookConfTabSwitch() {
        if (typeof window.switchTab === 'function' && !window._confTabHooked) {
            const orig = window.switchTab;
            window.switchTab = function (idx) {
                const res = orig.apply(this, arguments);
                if (idx === 2 || idx === 'conference') {
                    unlockConfTTSOnGesture();
                    if (!CF.isActive && !CF.isLeaving) window.enterConferenceRoom();
                    else attachAllConfVideos();
                }
                return res;
            };
            window._confTabHooked = true;
        }
    }

    window.addEventListener('beforeunload', () => {
        if (CF.presenceRef) try { CF.presenceRef.remove(); } catch (e) {}
    });

    function bootConference() {
        hookConfTabSwitch();
        window.initConference();
        watchConfTabVisibility();
        window.listenForDirectInvites();

        try { if (window.speechSynthesis) window.speechSynthesis.getVoices(); } catch (e) {}

        document.addEventListener('click', () => closeAllConfPopups());

        setInterval(() => {
            bindConfAIVoiceCallbacks();
            ensureConfHeaderBar();
            refreshMyConfFrameUI();
            if (isConfVisible() && !CF.isLeaving) {
                if (!CF.isActive && !CF.isJoining && getMyId()) {
                    window.enterConferenceRoom();
                } else if (CF.isActive) {
                    attachAllConfVideos();
                }
            }
        }, 1200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootConference);
    } else {
        bootConference();
    }
})();
