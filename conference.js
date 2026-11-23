// =======================================================
// КОНФЕРЕНЦИЯ: РОДНАЯ СЕТКА + КЛОН ИИ-СИСТЕМЫ + КАМЕРЫ AGORA (hello)
// =======================================================

(function () {
    'use strict';

    const CONF_LANG_MAP = {
        en: ['gb', '🇬🇧'], kk: ['kz', '🇰🇿'], ru: ['ru', '🇷🇺'], az: ['az', '🇦🇿'],
        de: ['de', '🇩🇪'], tr: ['tr', '🇹🇷'], ar: ['ae', '🇦🇪'], it: ['it', '🇮🇹'],
        es: ['es', '🇪🇸'], fr: ['fr', '🇫🇷'], pt: ['pt', '🇵🇹'], ja: ['jp', '🇯🇵'], zh: ['cn', '🇨🇳']
    };

    const CONF_FLAG_TO_LANG = {
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

    const confState = {
        isActive: false,
        isJoining: false,
        chatBound: false,
        mode: 'voice', // 'voice' | 'ai'
        camEnabled: true,
        aiMicRunning: false,
        pausedByTyping: false,
        echoPaused: false,
        recognition: null,
        client: null,
        myAgoraUid: null,
        audioTrack: null,
        videoTrack: null,
        remoteAudioTracks: {},
        remoteVideoTracks: {},
        subscribing: new Set(),
        slots: new Array(MAX_GUEST_SLOTS).fill(null),
        activeUsers: {},
        processedKeys: new Set(),
        presenceRef: null,
        usersRef: null,
        chatRef: null,
        translateCache: new Map()
    };

    window._confWorldState = confState;

    // -------------------------------------------------------
    // 1. ИЗОЛИРОВАННЫЕ ЯЗЫКОВЫЕ НАСТРОЙКИ КОНФЕРЕНЦИИ
    // -------------------------------------------------------
    function getConfMyUid() {
        return (window.myProfileInfo && window.myProfileInfo.id) ? String(window.myProfileInfo.id) : '';
    }

    function confNormLang(code) {
        if (!code || code === 'auto' || code === 'un') return '';
        const raw = String(code).trim();
        if (CONF_FLAG_TO_LANG[raw]) return CONF_FLAG_TO_LANG[raw];
        const c = raw.split(/[-_]/)[0].substring(0, 2).toLowerCase();
        const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', sa: 'ar', eg: 'ar', us: 'en', gb: 'en', uk: 'en', br: 'pt', mx: 'es' };
        return fix[c] || c;
    }

    function getConfProfileLang() {
        const p = window.myProfileInfo;
        if (p) {
            const pf = p.flag ? String(p.flag).trim() : '';
            if (pf && CONF_FLAG_TO_LANG[pf]) return CONF_FLAG_TO_LANG[pf];
            if (p.flagCode) {
                const byCode = confNormLang(p.flagCode);
                if (byCode) return byCode;
            }
            if (typeof window.getLangByFlag === 'function') {
                const byFlag = confNormLang(window.getLangByFlag(p.flagCode, p.flag));
                if (byFlag) return byFlag;
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
        return confNormLang(localStorage.getItem('hf_conf_read_lang')) || getConfAvatarLang() || getConfProfileLang();
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

    // -------------------------------------------------------
    // 2. ВЕРХНЯЯ ПАНЕЛЬ (МИКРОФОН + VOICE / AI, БЕЗ REC И CONFERENCE)
    // -------------------------------------------------------
    function ensureConfHeader() {
        const oldBroken = document.getElementById('hf-conf-isolated-styles');
        if (oldBroken) oldBroken.remove();

        if (!document.getElementById('hf-conf-ui-styles')) {
            const st = document.createElement('style');
            st.id = 'hf-conf-ui-styles';
            st.textContent = `
                .conf-live-wrap { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; }
                .conf-live-txt { display: inline-block; white-space: nowrap; font-size: 0.78rem; font-weight: 600; color: #8696a0; }
                .conf-mode-pill { display: inline-flex; background: #0b141a; border: 1px solid #2a3942; border-radius: 9999px; padding: 2px; }
                .conf-mode-btn { padding: 4px 10px; border-radius: 9999px; font-size: 0.72rem; font-weight: 800; color: #8696a0; transition: all 0.15s; }
                .conf-mode-btn.active-voice { background: #00a884; color: #111b21; }
                .conf-mode-btn.active-ai { background: #eab308; color: #111b21; }
                .conf-mic-lang-popup {
                    position: absolute; bottom: 62px; right: 12px; background: #111b21;
                    border: 1px solid #2a3942; border-radius: 18px; padding: 12px;
                    display: none; flex-direction: column; gap: 8px; z-index: 9999;
                    min-width: 225px; box-shadow: 0 12px 30px rgba(0,0,0,0.6);
                }
                .conf-mic-lang-popup.active { display: flex; }
            `;
            document.head.appendChild(st);
        }

        const confPage = document.getElementById('conference');
        if (!confPage) return;
        const topBar = confPage.firstElementChild;
        if (!topBar || topBar.dataset.confHeaderReady === '1') return;

        topBar.dataset.confHeaderReady = '1';
        topBar.className = 'flex items-center justify-between gap-2 px-3 py-2 bg-[#111b21] border-b border-[#202c33] shrink-0';
        topBar.innerHTML = `
            <div class="flex items-center gap-2 flex-1 min-w-0 bg-[#202c33] border border-[#2a3942] rounded-full px-2 py-1">
                <button id="conf-ai-mic-btn" type="button" onclick="window.toggleConfLiveMic()"
                    class="w-7 h-7 rounded-full bg-[#111b21] text-[#8696a0] flex items-center justify-center shrink-0 border border-[#2a3942]">
                    <i class="fa-solid fa-microphone text-xs"></i>
                </button>
                <span id="conf-header-flag" class="text-sm shrink-0">${getConfReadFlag()}</span>
                <div id="conf-live-wrap" class="conf-live-wrap">
                    <span id="conf-live-txt" class="conf-live-txt">Voice Direct • Live</span>
                </div>
            </div>
            <div class="conf-mode-pill shrink-0">
                <button id="conf-btn-voice" type="button" onclick="window.setConfMode('voice')" class="conf-mode-btn active-voice">Voice</button>
                <button id="conf-btn-ai" type="button" onclick="window.setConfMode('ai')" class="conf-mode-btn">AI</button>
            </div>
        `;
    }

    function setConfHeaderStatus(text, isSpeech) {
        const wrap = document.getElementById('conf-live-wrap');
        const txt = document.getElementById('conf-live-txt');
        const btn = document.getElementById('conf-ai-mic-btn');
        const flag = document.getElementById('conf-header-flag');

        if (flag) flag.textContent = getConfReadFlag();
        if (txt) {
            txt.textContent = text;
            txt.style.color = isSpeech ? '#ffffff' : (confState.mode === 'ai' ? '#facc15' : '#8696a0');
        }
        if (wrap) wrap.scrollLeft = wrap.scrollWidth;

        if (btn) {
            if (confState.mode === 'ai' && confState.aiMicRunning && !confState.pausedByTyping) {
                btn.className = 'w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 animate-pulse';
                btn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
            } else if (confState.mode === 'ai') {
                btn.className = 'w-7 h-7 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/50';
                btn.innerHTML = '<i class="fa-solid fa-microphone text-xs"></i>';
            } else {
                btn.className = 'w-7 h-7 rounded-full bg-[#111b21] text-[#8696a0] flex items-center justify-center shrink-0 border border-[#2a3942]';
                btn.innerHTML = '<i class="fa-solid fa-microphone text-xs"></i>';
            }
        }
    }

    // -------------------------------------------------------
    // 3. ПЕРЕКЛЮЧАТЕЛЬ VOICE / AI И УМНАЯ МАРШРУТИЗАЦИЯ ПО ФЛАГАМ
    // -------------------------------------------------------
    window.setConfMode = function (mode) {
        confState.mode = (mode === 'ai') ? 'ai' : 'voice';
        const bV = document.getElementById('conf-btn-voice');
        const bA = document.getElementById('conf-btn-ai');
        if (bV) bV.className = 'conf-mode-btn' + (confState.mode === 'voice' ? ' active-voice' : '');
        if (bA) bA.className = 'conf-mode-btn' + (confState.mode === 'ai' ? ' active-ai' : '');

        syncConfAudioByFlags();

        if (confState.mode === 'ai') {
            confState.pausedByTyping = false;
            startConfAIMic();
        } else {
            stopConfAIMic();
            if (typeof window.stopVoiceAI === 'function') window.stopVoiceAI();
            setConfHeaderStatus('Voice Direct • Live', false);
        }
    };

    window.toggleConfLiveMic = function () {
        if (confState.mode !== 'ai') return window.setConfMode('ai');
        if (confState.aiMicRunning) {
            stopConfAIMic();
            setConfHeaderStatus('AI Mic Paused', false);
        } else {
            confState.pausedByTyping = false;
            startConfAIMic();
        }
    };

    function findConfGuestByAgoraUid(aUid) {
        const key = String(aUid);
        const ids = Object.keys(confState.activeUsers);
        for (let i = 0; i < ids.length; i++) {
            const u = confState.activeUsers[ids[i]];
            if (u && (String(u.agoraUid || '') === key || String(u.id) === key)) return u;
        }
        return null;
    }

    function syncConfAudioByFlags() {
        const myLang = getConfReadLang();
        const myFlag = getConfReadFlag();

        Object.keys(confState.remoteAudioTracks).forEach(aUid => {
            const track = confState.remoteAudioTracks[aUid];
            if (!track) return;

            if (confState.mode === 'voice') {
                try { track.setVolume(100); } catch (e) {}
                return;
            }

            const u = findConfGuestByAgoraUid(aUid);
            const uLang = u ? (confNormLang(u.langCode) || confNormLang(u.flag) || confNormLang(u.flagCode)) : '';
            const uFlag = u ? String(u.flag || '').trim() : '';
            const isSameFlag = (uFlag && myFlag && uFlag === myFlag) || (uLang && myLang && uLang === myLang);

            try { track.setVolume(isSameFlag ? 100 : 0); } catch (e) {}
        });
    }

    // -------------------------------------------------------
    // 4. КЛОН ИИ-МИКРОФОНА + ЗАЩИТА ОТ ЭХА ЧЕРЕЗ РОДНОЙ voice.js
    // -------------------------------------------------------
    function hookConfVoiceEchoGuard() {
        if (window._confVoiceEchoHooked) return;
        window._confVoiceEchoHooked = true;

        const origStart = window.onAIVoiceStart;
        const origEnd = window.onAIVoiceEnd;

        window.onAIVoiceStart = function () {
            if (typeof origStart === 'function') origStart.apply(this, arguments);
            if (confState.isActive && confState.mode === 'ai' && confState.aiMicRunning) {
                confState.echoPaused = true;
                stopConfAIMic();
            }
        };

        window.onAIVoiceEnd = function () {
            if (typeof origEnd === 'function') origEnd.apply(this, arguments);
            if (confState.echoPaused) {
                confState.echoPaused = false;
                if (confState.isActive && confState.mode === 'ai' && !confState.pausedByTyping) {
                    setTimeout(startConfAIMic, 250);
                }
            }
        };
    }

    function startConfAIMic() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR || confState.aiMicRunning || confState.pausedByTyping || confState.echoPaused) return;

        const recBase = getConfMicLang() || getConfReadLang() || getConfProfileLang();
        const rec = new SR();
        rec.lang = CONF_SPEECH_LOCALE[recBase] || recBase;
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        confState.recognition = rec;
        confState.aiMicRunning = true;
        setConfHeaderStatus('● Слушаю...', false);

        rec.onresult = (ev) => {
            let interim = '', finalStr = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                if (ev.results[i].isFinal) finalStr += ev.results[i][0].transcript;
                else interim += ev.results[i][0].transcript;
            }
            if (interim.trim()) setConfHeaderStatus('● ' + interim.trim(), true);
            if (finalStr.trim()) {
                setConfHeaderStatus('✓ ' + finalStr.trim(), true);
                pushConfMessage(finalStr.trim(), recBase);
            }
        };

        rec.onerror = (e) => {
            const err = (e && e.error) ? e.error : '';
            if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
                confState.aiMicRunning = false;
                setConfHeaderStatus('Нет доступа к микрофону', false);
            }
        };

        rec.onend = () => {
            const restart = confState.isActive && confState.mode === 'ai' && confState.aiMicRunning && !confState.pausedByTyping && !confState.echoPaused;
            confState.aiMicRunning = false;
            if (restart) setTimeout(startConfAIMic, 250);
        };

        try { rec.start(); } catch (e) { confState.aiMicRunning = false; }
    }

    function stopConfAIMic() {
        confState.aiMicRunning = false;
        if (confState.recognition) {
            try { confState.recognition.onend = null; confState.recognition.abort(); } catch (e) {}
            confState.recognition = null;
        }
    }

    // -------------------------------------------------------
    // 5. РОДНАЯ СЕТКА .video-grid (1 ГЛАВНОЕ + 12 СЛОТОВ)
    // -------------------------------------------------------
    function refreshConfMyFrame() {
        const flagImg = document.getElementById('my-conf-flag-img');
        if (flagImg) flagImg.src = `https://flagcdn.com/w40/${getConfReadFlagCode()}.png`;
        const hFlag = document.getElementById('conf-header-flag');
        if (hFlag) hFlag.textContent = getConfReadFlag();
        const nameEl = document.getElementById('my-conf-username');
        if (nameEl && window.myUsername) nameEl.textContent = window.myUsername;
        const m = document.getElementById('speaker-marquee');
        if (m) {
            m.setAttribute('data-lang', getConfReadLang());
            m.setAttribute('data-flag', getConfReadFlag());
        }
    }

    window.initConference = function () {
        ensureConfHeader();
        hookConfVoiceEchoGuard();

        const confGrid = document.getElementById('conference-grid');
        if (!confGrid) return;
        confGrid.classList.remove('hf-conf-grid-13');

        if (!confGrid.dataset.confGridMounted) {
            confGrid.dataset.confGridMounted = '1';
            let html = `
                <div class="video-frame main" id="my-video-container" onclick="window.openConfLangModal()">
                    <video id="my-live-video" class="mirror-video cursor-pointer" playsinline autoplay muted></video>
                    <div id="my-conf-username" class="video-overlay">${window.myUsername || 'Me'}</div>
                    <div class="flag-overlay" style="top:8px; right:8px;">
                        <img id="my-conf-flag-img" src="https://flagcdn.com/w40/${getConfReadFlagCode()}.png" class="w-6 rounded-sm border border-[#2a3942]">
                    </div>
                    <div class="translation-bar">
                        <div id="speaker-marquee" class="conf-marquee-text conf-listener-marquee" data-lang="${getConfReadLang()}" data-flag="${getConfReadFlag()}" style="animation-duration: 28s;">
                            ${getConfReadFlag()} Готов к конференции...
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
            refreshConfMyFrame();
        }

        bindConfControls();
        mountConfMicLangPopup();
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
        const uLang = confNormLang(user.langCode) || confNormLang(user.flag) || confNormLang(user.flagCode) || 'en';
        const uFlag = String(user.flag || '🌐').trim();
        const uFlagCode = String(user.flagCode || 'un').trim().toLowerCase();
        const firstName = (user.name || 'User').split(' ')[0];

        if (el.getAttribute('data-uid') !== uid) {
            el.className = 'video-frame relative overflow-hidden';
            el.setAttribute('data-uid', uid);
            el.innerHTML = `
                <video id="remote-video-${uid}" class="absolute inset-0 w-full h-full object-cover z-20 hidden" autoplay playsinline muted></video>
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
        } else {
            const flagImg = el.querySelector('.conf-slot-flag-img');
            if (flagImg) flagImg.src = `https://flagcdn.com/w40/${uFlagCode}.png`;
            const marq = document.getElementById(`conf-marquee-${uid}`);
            if (marq) {
                marq.setAttribute('data-lang', uLang);
                marq.setAttribute('data-flag', uFlag);
            }
        }

        attachAllConfRemoteVideos();
    }

    function playConfTrackOnVideo(videoEl, track) {
        if (!videoEl || !track) return;
        try {
            const mediaTrack = track.getMediaStreamTrack();
            if (!mediaTrack) return;
            const current = (videoEl.srcObject && videoEl.srcObject.getVideoTracks) ? videoEl.srcObject.getVideoTracks()[0] : null;
            if (!current || current.id !== mediaTrack.id) {
                videoEl.srcObject = new MediaStream([mediaTrack]);
            }
            videoEl.muted = true;
            videoEl.classList.remove('hidden');
            videoEl.play().catch(() => {});
        } catch (e) {}
    }

    function attachAllConfRemoteVideos() {
        const usedTracks = new Set();

        Object.keys(confState.activeUsers).forEach(uid => {
            const u = confState.activeUsers[uid];
            if (!u) return;
            const aUid = u.agoraUid ? String(u.agoraUid) : '';
            const track = (aUid && confState.remoteVideoTracks[aUid]) || confState.remoteVideoTracks[uid];
            if (track) {
                const vid = document.getElementById(`remote-video-${uid}`);
                if (vid) {
                    playConfTrackOnVideo(vid, track);
                    usedTracks.add(aUid || uid);
                }
            }
        });

        const unassigned = Object.keys(confState.remoteVideoTracks).filter(k => !usedTracks.has(k));
        unassigned.forEach(aUid => {
            const track = confState.remoteVideoTracks[aUid];
            if (!track) return;

            for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
                const uid = confState.slots[i];
                if (!uid) continue;
                const vid = document.getElementById(`remote-video-${uid}`);
                if (vid && vid.classList.contains('hidden')) {
                    playConfTrackOnVideo(vid, track);
                    return;
                }
            }

            let slotIdx = confState.slots.indexOf(`agora_${aUid}`);
            if (slotIdx === -1) slotIdx = confState.slots.indexOf(null);
            if (slotIdx !== -1) {
                const tempId = `agora_${aUid}`;
                confState.slots[slotIdx] = tempId;
                renderConfGuestSlot(slotIdx, { id: tempId, name: 'Guest', flag: '🌐', flagCode: 'un', langCode: 'en', agoraUid: aUid });
                const vid = document.getElementById(`remote-video-${tempId}`);
                if (vid) playConfTrackOnVideo(vid, track);
            }
        });
    }

    function syncConfParticipants(usersMap) {
        const myId = getConfMyUid();
        const guests = {};

        Object.keys(usersMap || {}).forEach(uid => {
            const u = usersMap[uid];
            if (!u || String(uid) === myId || uid === 'ai') return;
            guests[String(uid)] = u;
        });

        confState.activeUsers = guests;

        for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
            const occ = confState.slots[i];
            if (!occ) continue;
            if (occ.startsWith('agora_')) {
                const aUid = occ.replace('agora_', '');
                if (!confState.remoteVideoTracks[aUid] || findConfGuestByAgoraUid(aUid)) {
                    confState.slots[i] = null;
                    renderConfGuestSlot(i, null);
                }
            } else if (!guests[occ]) {
                confState.slots[i] = null;
                renderConfGuestSlot(i, null);
            }
        }

        Object.keys(guests).forEach(uid => {
            let idx = confState.slots.indexOf(uid);
            if (idx === -1) {
                idx = confState.slots.indexOf(null);
                if (idx !== -1) confState.slots[idx] = uid;
            }
            if (idx !== -1) renderConfGuestSlot(idx, guests[uid]);
        });

        attachAllConfRemoteVideos();
        syncConfAudioByFlags();
    }

    // -------------------------------------------------------
    // 6. ПОДКЛЮЧЕНИЕ КАМЕР AGORA (КАК В calls.js: hello)
    // -------------------------------------------------------
    async function subscribeConfRemote(user, mediaType) {
        if (!confState.client || !user) return;
        const aUid = String(user.uid);
        const lock = `${aUid}:${mediaType}`;
        if (confState.subscribing.has(lock)) return;

        confState.subscribing.add(lock);
        try {
            await confState.client.subscribe(user, mediaType);
            if (mediaType === 'video' && user.videoTrack) {
                confState.remoteVideoTracks[aUid] = user.videoTrack;
                attachAllConfRemoteVideos();
            }
            if (mediaType === 'audio' && user.audioTrack) {
                confState.remoteAudioTracks[aUid] = user.audioTrack;
                user.audioTrack.play();
                syncConfAudioByFlags();
            }
        } catch (e) {
            console.warn('Conf subscribe:', lock, e);
        } finally {
            confState.subscribing.delete(lock);
        }
    }

    function showConfLocalCamera() {
        const myVideo = document.getElementById('my-live-video');
        if (myVideo && confState.videoTrack) {
            playConfTrackOnVideo(myVideo, confState.videoTrack);
        }
    }

    window.enterConferenceRoom = async function () {
        window.initConference();
        refreshConfMyFrame();

        const myId = getConfMyUid();
        if (!myId) {
            setTimeout(window.enterConferenceRoom, 700);
            return;
        }
        if (confState.isJoining) return;
        if (confState.isActive && confState.client && confState.client.connectionState === 'CONNECTED') {
            showConfLocalCamera();
            return;
        }

        confState.isActive = true;
        confState.isJoining = true;

        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                confState.presenceRef = firebase.database().ref(`conf_world/active_users/${myId}`);
                confState.presenceRef.set({
                    id: myId,
                    name: window.myUsername || 'User',
                    photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : '',
                    flag: getConfReadFlag(),
                    flagCode: getConfReadFlagCode(),
                    langCode: getConfReadLang(),
                    agoraUid: confState.myAgoraUid || '',
                    joinedAt: firebase.database.ServerValue.TIMESTAMP
                });
                confState.presenceRef.onDisconnect().remove();

                if (!confState.usersRef) {
                    confState.usersRef = firebase.database().ref('conf_world/active_users');
                    confState.usersRef.on('value', (snap) => syncConfParticipants(snap.val() || {}));
                }

                if (!confState.chatBound) {
                    confState.chatBound = true;
                    confState.chatRef = firebase.database().ref('conf_world/messages');
                    confState.chatRef.limitToLast(20).once('value', (snap) => {
                        snap.forEach(c => { if (c.key) confState.processedKeys.add(c.key); });
                        if (confState.isActive && confState.chatRef) {
                            confState.chatRef.limitToLast(20).on('child_added', handleConfMessage);
                        }
                    });
                }
            }

            await connectConfAgoraCameras();
        } finally {
            confState.isJoining = false;
        }
    };

    async function connectConfAgoraCameras() {
        if (typeof AgoraRTC === 'undefined') return;

        if (!confState.audioTrack) {
            try { confState.audioTrack = await AgoraRTC.createMicrophoneAudioTrack(); } catch (e) { console.warn('Conf mic:', e); }
        }
        if (!confState.videoTrack) {
            try {
                confState.videoTrack = await AgoraRTC.createCameraVideoTrack();
                confState.camEnabled = true;
                showConfLocalCamera();
                updateConfCamBtnUI();
            } catch (e) { console.warn('Conf cam:', e); }
        } else {
            showConfLocalCamera();
        }

        if (!confState.client) {
            confState.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

            confState.client.on('user-published', (user, mediaType) => subscribeConfRemote(user, mediaType));

            confState.client.on('user-unpublished', (user, mediaType) => {
                const aUid = String(user.uid);
                if (mediaType === 'video') {
                    delete confState.remoteVideoTracks[aUid];
                    const u = findConfGuestByAgoraUid(aUid);
                    const vid = document.getElementById(`remote-video-${u ? u.id : 'agora_' + aUid}`);
                    if (vid) { vid.srcObject = null; vid.classList.add('hidden'); }
                }
                if (mediaType === 'audio') delete confState.remoteAudioTracks[aUid];
            });

            confState.client.on('user-left', (user) => {
                const aUid = String(user.uid);
                const u = findConfGuestByAgoraUid(aUid);
                const vid = document.getElementById(`remote-video-${u ? u.id : 'agora_' + aUid}`);
                if (vid) { vid.srcObject = null; vid.classList.add('hidden'); }
                delete confState.remoteVideoTracks[aUid];
                delete confState.remoteAudioTracks[aUid];
            });
        }

        if (confState.client.connectionState === 'DISCONNECTED') {
            const appId = window.CALLS_AGORA_APP_ID || (typeof AGORA_APP_ID !== 'undefined' ? AGORA_APP_ID : window.AGORA_APP_ID) || '';
            const token = window.CALLS_AGORA_TEMP_TOKEN || (typeof AGORA_TEMP_TOKEN !== 'undefined' ? AGORA_TEMP_TOKEN : window.AGORA_TEMP_TOKEN) || null;
            const channel = window.CONF_AGORA_CHANNEL || window.CALLS_AGORA_CHANNEL || 'hello';

            if (!appId) return;

            try {
                const assignedUid = await confState.client.join(appId, channel, token, null);
                confState.myAgoraUid = String(assignedUid);

                if (confState.presenceRef) {
                    confState.presenceRef.update({ agoraUid: confState.myAgoraUid }).catch(() => {});
                }

                const tracks = [confState.audioTrack, confState.videoTrack].filter(Boolean);
                if (tracks.length) await confState.client.publish(tracks);

                (confState.client.remoteUsers || []).forEach(rem => {
                    if (rem.hasVideo) subscribeConfRemote(rem, 'video');
                    if (rem.hasAudio) subscribeConfRemote(rem, 'audio');
                });
            } catch (e) {
                console.warn('Agora Conf join error:', e);
                if (window.showToast) {
                    window.showToast('Agora Conf', 'Ошибка входа (' + channel + '): ' + (e.code || e.message), '', '');
                }
            }
        }
    }

    window.toggleConfCamera = async function () {
        if (!confState.videoTrack) return;
        confState.camEnabled = !confState.camEnabled;
        try { await confState.videoTrack.setEnabled(confState.camEnabled); } catch (e) {}
        const myVideo = document.getElementById('my-live-video');
        if (myVideo) myVideo.style.opacity = confState.camEnabled ? '1' : '0.15';
        updateConfCamBtnUI();
    };

    function updateConfCamBtnUI() {
        const btn = document.getElementById('conf-cam-btn');
        if (!btn) return;
        btn.className = confState.camEnabled
            ? 'w-[44px] h-[44px] rounded-full bg-[#202c33] text-white flex justify-center items-center text-xl hover:bg-[#2a3942] transition'
            : 'w-[44px] h-[44px] rounded-full bg-red-500/20 text-red-400 border border-red-500/50 flex justify-center items-center text-xl transition';
        btn.innerHTML = confState.camEnabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
    }

    window.leaveConferenceRoom = async function () {
        confState.isActive = false;
        confState.isJoining = false;
        confState.chatBound = false;
        confState.myAgoraUid = null;
        confState.subscribing.clear();
        confState.processedKeys.clear();

        stopConfAIMic();
        if (typeof window.stopVoiceAI === 'function') window.stopVoiceAI();

        if (confState.presenceRef) { try { await confState.presenceRef.remove(); } catch (e) {} confState.presenceRef = null; }
        if (confState.usersRef) { try { confState.usersRef.off(); } catch (e) {} confState.usersRef = null; }
        if (confState.chatRef) { try { confState.chatRef.off(); } catch (e) {} confState.chatRef = null; }

        if (confState.audioTrack) { try { confState.audioTrack.stop(); confState.audioTrack.close(); } catch (e) {} confState.audioTrack = null; }
        if (confState.videoTrack) { try { confState.videoTrack.stop(); confState.videoTrack.close(); } catch (e) {} confState.videoTrack = null; }
        if (confState.client) { try { await confState.client.leave(); } catch (e) {} confState.client = null; }

        confState.remoteAudioTracks = {};
        confState.remoteVideoTracks = {};
        confState.activeUsers = {};
        for (let i = 0; i < MAX_GUEST_SLOTS; i++) {
            confState.slots[i] = null;
            renderConfGuestSlot(i, null);
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
    // 7. УМНАЯ ЛОГИКА ПЕРЕВОДА И РОДНОЙ ИИ-ГОЛОС (window.playAIVoice)
    // -------------------------------------------------------
    async function translateConfText(text, targetLang) {
        const tl = confNormLang(targetLang) || 'en';
        const key = `${tl}::${text}`;
        if (confState.translateCache.has(key)) return confState.translateCache.get(key);
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await res.json();
            const out = (data && data[0]) ? data[0].map(s => (s && s[0]) ? s[0] : '').join('') : text;
            if (confState.translateCache.size > 150) {
                confState.translateCache.delete(confState.translateCache.keys().next().value);
            }
            confState.translateCache.set(key, out);
            return out;
        } catch (e) {
            return text;
        }
    }

    function setConfMarquee(el, html) {
        if (!el) return;
        el.innerHTML = html;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = null;
    }

    function pushConfMessage(rawText, explicitLang) {
        const text = String(rawText || '').trim();
        if (!text || typeof firebase === 'undefined' || !firebase.database) return;

        firebase.database().ref('conf_world/messages').push({
            userId: getConfMyUid() || 'guest',
            sessionId: window.mySessionId || 'sess',
            name: window.myUsername || 'User',
            text: text,
            flag: getConfReadFlag(),
            flagCode: getConfReadFlagCode(),
            langCode: confNormLang(explicitLang) || getConfReadLang(),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function handleConfMessage(snapshot) {
        const data = snapshot.val();
        if (!data || !data.text) return;
        if (snapshot.key) {
            if (confState.processedKeys.has(snapshot.key)) return;
            confState.processedKeys.add(snapshot.key);
        }

        const myId = getConfMyUid();
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const senderName = isMe ? (window.myUsername || 'Me') : (data.name || 'User').split(' ')[0];
        const senderLang = confNormLang(data.langCode) || confNormLang(data.flag) || confNormLang(data.flagCode) || 'en';
        const senderFlag = String(data.flag || '🌐').trim();
        const text = String(data.text).trim();

        const speakerMarqueeId = isMe ? 'speaker-marquee' : `conf-marquee-${data.userId}`;
        setConfMarquee(
            document.getElementById(speakerMarqueeId),
            `<span class="text-white font-bold">${senderName}:</span> <span class="text-[#00a884] ml-1.5">${senderFlag} ${text}</span>`
        );

        const myLang = getConfReadLang();
        const myFlag = getConfReadFlag();
        const mainMarquee = document.getElementById('speaker-marquee');

        if (!isMe && mainMarquee) {
            const sameFlag = (senderFlag && myFlag && senderFlag === myFlag) || (senderLang === myLang);
            if (sameFlag) {
                setConfMarquee(mainMarquee, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-white font-bold ml-1.5">${senderFlag} ${text}</span>`);
            } else {
                translateConfText(text, myLang).then(translated => {
                    setConfMarquee(mainMarquee, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-yellow-400 font-bold ml-1.5">${myFlag} ${translated}</span>`);
                    if (confState.mode === 'ai' && typeof window.playAIVoice === 'function') {
                        window.playAIVoice(encodeURIComponent(translated), myLang);
                    }
                });
            }
        }

        const others = Array.from(document.querySelectorAll('#conference .conf-listener-marquee'))
            .filter(el => el.id !== speakerMarqueeId && el.id !== 'speaker-marquee');

        const byLang = {};
        others.forEach(el => {
            const tl = confNormLang(el.getAttribute('data-lang')) || 'en';
            if (!byLang[tl]) byLang[tl] = [];
            byLang[tl].push(el);
        });

        Object.keys(byLang).forEach(tl => {
            if (tl === senderLang) {
                byLang[tl].forEach(el => setConfMarquee(el, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-white font-bold ml-1.5">${el.getAttribute('data-flag') || senderFlag} ${text}</span>`));
            } else {
                translateConfText(text, tl).then(tr => {
                    byLang[tl].forEach(el => setConfMarquee(el, `<span class="text-[#8696a0] text-[0.65rem] uppercase">${senderName}:</span> <span class="text-yellow-400 font-bold ml-1.5">${el.getAttribute('data-flag') || '🌐'} ${tr}</span>`));
                });
            }
        });
    }

    // -------------------------------------------------------
    // 8. ЯЗЫКОВАЯ ПАНЕЛЬ АВАТАРА + ВЫБОР ЯЗЫКА МИКРОФОНА + ЧАТ КОНФЕРЕНЦИИ
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

    function applyConfLangUpdate() {
        refreshConfMyFrame();
        if (confState.isActive && confState.presenceRef) {
            confState.presenceRef.update({
                flag: getConfReadFlag(),
                flagCode: getConfReadFlagCode(),
                langCode: getConfReadLang()
            }).catch(() => {});
        }
        syncConfAudioByFlags();
        if (confState.mode === 'ai' && confState.aiMicRunning) {
            stopConfAIMic();
            startConfAIMic();
        }
    }

    window.saveConfAvatarLang = function (langCode) {
        if (!langCode || langCode === 'auto') {
            localStorage.removeItem('hf_conf_avatar_lang');
            const micFb = localStorage.getItem('hf_conf_mic_lang');
            if (micFb) localStorage.setItem('hf_conf_read_lang', micFb);
            else localStorage.removeItem('hf_conf_read_lang');
        } else {
            localStorage.setItem('hf_conf_avatar_lang', langCode);
            localStorage.setItem('hf_conf_read_lang', langCode);
        }
        applyConfLangUpdate();
        document.getElementById('personal-lang-modal')?.classList.remove('active');
        if (window.showToast) window.showToast('Conference Language', 'Saved strictly for Conference', '', '');
    };

    window.saveConfMicLang = function (val) {
        if (!val || val === 'auto') {
            localStorage.removeItem('hf_conf_mic_lang');
            const avFb = localStorage.getItem('hf_conf_avatar_lang');
            if (avFb) localStorage.setItem('hf_conf_read_lang', avFb);
            else localStorage.removeItem('hf_conf_read_lang');
        } else {
            localStorage.setItem('hf_conf_mic_lang', val);
            localStorage.setItem('hf_conf_read_lang', val);
        }
        applyConfLangUpdate();
        if (window.showToast) window.showToast('Conference Mic', 'Language updated', '', '');
    };

    function mountConfMicLangPopup() {
        const confPage = document.getElementById('conference');
        if (!confPage || document.getElementById('conf-mic-lang-popup')) return;

        const savedMic = localStorage.getItem('hf_conf_mic_lang') || 'auto';
        const optionsHtml = `<option value="auto">🤖 Auto (Profile)</option>` +
            CONF_13_LANGS.map(l => `<option value="${l.code}">${l.flag} ${l.name}</option>`).join('');

        const popup = document.createElement('div');
        popup.id = 'conf-mic-lang-popup';
        popup.className = 'conf-mic-lang-popup';
        popup.onclick = (e) => e.stopPropagation();
        popup.innerHTML = `
            <div class="text-[0.7rem] font-bold uppercase tracking-wider text-[#00a884] flex justify-between items-center">
                <span>🎙 Conference Mic</span>
                <span class="text-[#8696a0] text-[0.65rem] normal-case">Isolated</span>
            </div>
            <select id="conf-mic-lang-select" class="w-full bg-[#202c33] text-white border border-[#2a3942] rounded-xl px-3 py-2 text-sm font-semibold outline-none">
                ${optionsHtml}
            </select>
            <button type="button" id="conf-mic-dictate-btn" class="w-full bg-[#00a884] text-[#111b21] font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 transition">
                <i class="fa-solid fa-microphone"></i> Голосом в строку
            </button>
        `;
        confPage.appendChild(popup);

        const sel = document.getElementById('conf-mic-lang-select');
        if (sel) {
            sel.value = savedMic;
            sel.onchange = () => window.saveConfMicLang(sel.value);
        }
        const dictBtn = document.getElementById('conf-mic-dictate-btn');
        if (dictBtn) {
            dictBtn.onclick = () => {
                popup.classList.remove('active');
                window.startConfSingleDictation();
            };
        }
        document.addEventListener('click', () => popup.classList.remove('active'));
    }

    window.startConfSingleDictation = function () {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        const recBase = getConfMicLang() || getConfReadLang() || getConfProfileLang();
        const rec = new SR();
        rec.lang = CONF_SPEECH_LOCALE[recBase] || recBase;
        rec.interimResults = false;
        rec.onstart = () => { if (window.showToast) window.showToast('Conf Mic', 'Говорите...', '', ''); };
        rec.onresult = (e) => {
            const spoken = e.results[0][0].transcript;
            if (spoken && spoken.trim()) pushConfMessage(spoken.trim(), recBase);
        };
        try { rec.start(); } catch (e) {}
    };

    window.sendConfMsg = function () {
        const input = document.getElementById('conf-chat-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        pushConfMessage(text, getConfReadLang());

        if (confState.mode === 'ai' && confState.pausedByTyping) {
            confState.pausedByTyping = false;
            setTimeout(startConfAIMic, 200);
        }
    };

    function bindConfControls() {
        const confPage = document.getElementById('conference');
        if (!confPage) return;

        const camBtn = document.getElementById('conf-cam-btn');
        if (camBtn && !camBtn.dataset.confBound) {
            camBtn.dataset.confBound = '1';
            camBtn.removeAttribute('onclick');
            camBtn.onclick = (e) => { e.preventDefault(); window.toggleConfCamera(); };
        }

        const redBtn = confPage.querySelector('button.bg-red-500');
        if (redBtn && !redBtn.dataset.confBound) {
            redBtn.dataset.confBound = '1';
            redBtn.removeAttribute('onclick');
            redBtn.onclick = (e) => { e.preventDefault(); window.leaveConferenceRoom(); };
        }

        const input = document.getElementById('conf-chat-input');
        if (input && !input.dataset.confBound) {
            input.dataset.confBound = '1';
            input.addEventListener('input', () => {
                if (confState.mode === 'ai' && input.value.trim().length > 0 && !confState.pausedByTyping) {
                    confState.pausedByTyping = true;
                    stopConfAIMic();
                    setConfHeaderStatus('Пауза (ввод текста)', false);
                } else if (confState.mode === 'ai' && input.value.trim().length === 0 && confState.pausedByTyping) {
                    confState.pausedByTyping = false;
                    startConfAIMic();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    window.sendConfMsg();
                }
            }, true);

            const area = input.closest('.chat-input-area') || confPage;
            area.querySelectorAll('button').forEach(btn => {
                const attr = btn.getAttribute('onclick') || '';
                if (attr.includes('sendFirebaseMsg') || btn.querySelector('.fa-paper-plane')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = (e) => { e.preventDefault(); window.sendConfMsg(); };
                } else if (attr.includes('Mic') || btn.querySelector('.fa-microphone')) {
                    btn.removeAttribute('onclick');
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('conf-mic-lang-popup')?.classList.toggle('active');
                    };
                }
            });
        }
    }

    // -------------------------------------------------------
    // 9. ПРИГЛАШЕНИЯ И УВЕДОМЛЕНИЯ
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
        const uiLang = confNormLang(window.appLang) || getConfReadLang() || 'en';
        const dict = window.confDict[uiLang] || window.confDict.en;
        return dict[key] || '';
    };

    window.openGroupInviteModal = function () {
        const list = document.getElementById('group-invite-list');
        if (!list) return;
        list.innerHTML = '';
        const myId = getConfMyUid();
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
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    };

    window.closeGroupInviteModal = function () {
        const modal = document.getElementById('group-invite-modal');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    };

    window.selectAllForInvite = function () {
        document.querySelectorAll('.invite-checkbox').forEach(cb => { cb.checked = true; });
    };

    window.sendGroupInvites = function () {
        const checked = document.querySelectorAll('#group-invite-list input[type="checkbox"]:checked');
        if (!checked.length) return;
        const myId = getConfMyUid();
        checked.forEach(cb => {
            firebase.database().ref('user_notifications/' + cb.value).push({
                type: 'conference',
                senderId: myId,
                name: window.myUsername || 'User',
                photo: (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U',
                flag: getConfReadFlag(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });
        window.enterConferenceRoom();
        if (window.showToast) window.showToast('Успех', 'Приглашения отправлены!', '', '');
        window.closeGroupInviteModal();
    };

    window.listenForDirectInvites = function () {
        if (!getConfMyUid()) return setTimeout(window.listenForDirectInvites, 1000);
        refreshConfMyFrame();

        firebase.database().ref('user_notifications/' + getConfMyUid()).on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            if (window.sndMsg) window.sndMsg.play().catch(() => {});
            if (navigator.vibrate) navigator.vibrate([400, 200, 400]);

            const notifType = data.type || 'conference';
            const firstName = (data.name || 'User').split(' ')[0];
            const popup = document.createElement('div');
            popup.className = 'absolute top-4 left-4 right-4 mx-auto z-[9999] max-w-[280px] bg-[#111b21] border rounded-xl p-2.5';

            if (notifType === 'conference') {
                popup.classList.add('border-[#00a884]');
                popup.innerHTML = `
                    <div class="flex items-center gap-3">
                        <img src="${data.photo}" class="w-10 h-10 shrink-0 rounded-full border border-[#00a884] object-cover">
                        <div class="flex flex-col flex-1">
                            <span class="text-[0.65rem] text-[#00a884] font-bold uppercase">${window.getConfTranslation('title')}</span>
                            <span class="text-white text-[0.8rem]"><b>${data.flag || '🌐'} ${firstName}</b> ${window.getConfTranslation('desc')}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                        <button id="btn-no-${snapshot.key}" class="flex-1 bg-[#202c33] text-[#8696a0] py-1.5 rounded-lg font-bold text-[0.7rem]">${window.getConfTranslation('no')}</button>
                        <button id="btn-yes-${snapshot.key}" class="flex-1 bg-[#00a884] text-[#111b21] py-1.5 rounded-lg font-bold text-[0.7rem] flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-video"></i> ${window.getConfTranslation('btn')}
                        </button>
                    </div>
                `;
            } else if (notifType === 'missed_call') {
                popup.classList.add('border-red-500', 'cursor-pointer');
                popup.innerHTML = `<div class="text-white text-xs"><b>${data.flag || '🌐'} ${firstName}</b> — ${data.isVideo ? 'пропущенный видеовызов' : 'пропущенный аудиовызов'}</div>`;
            } else if (notifType === 'email') {
                popup.classList.add('border-blue-500', 'cursor-pointer');
                popup.innerHTML = `<div class="text-white text-xs">📧 Новое письмо от <b>${firstName}</b></div>`;
            }

            (document.querySelector('.app-wrap') || document.querySelector('#app') || document.body).appendChild(popup);

            if (notifType === 'conference') {
                document.getElementById(`btn-no-${snapshot.key}`).onclick = () => { popup.remove(); snapshot.ref.remove(); };
                document.getElementById(`btn-yes-${snapshot.key}`).onclick = () => {
                    popup.remove();
                    snapshot.ref.remove();
                    if (typeof window.switchTab === 'function') window.switchTab(2);
                    window.enterConferenceRoom();
                };
            } else {
                popup.onclick = () => {
                    popup.remove();
                    snapshot.ref.remove();
                    if (notifType === 'email' && typeof window.switchTab === 'function') window.switchTab(4);
                };
            }
        });
    };

    // -------------------------------------------------------
    // 10. АВТОПОДКЛЮЧЕНИЕ ПРИ ОТКРЫТИИ ВКЛАДКИ КОНФЕРЕНЦИИ
    // -------------------------------------------------------
    function watchConfTab() {
        const confPage = document.getElementById('conference');
        if (!confPage || confPage.dataset.confWatched) return;
        confPage.dataset.confWatched = '1';

        const check = () => {
            const visible = window.getComputedStyle(confPage).display !== 'none' && !confPage.classList.contains('hidden');
            if (visible && !confState.isActive) window.enterConferenceRoom();
        };

        new MutationObserver(check).observe(confPage, { attributes: true, attributeFilter: ['class', 'style'] });
        check();
    }

    function hookConfTabSwitch() {
        if (typeof window.switchTab === 'function' && !window._confTabHooked) {
            const orig = window.switchTab;
            window.switchTab = function (idx) {
                const r = orig.apply(this, arguments);
                if (idx === 2 || idx === 'conference') window.enterConferenceRoom();
                return r;
            };
            window._confTabHooked = true;
        }
    }

    window.addEventListener('beforeunload', () => {
        if (confState.presenceRef) try { confState.presenceRef.remove(); } catch (e) {}
    });

    window.addEventListener('load', () => {
        hookConfTabSwitch();
        window.initConference();
        watchConfTab();
        setTimeout(() => {
            hookConfTabSwitch();
            watchConfTab();
            refreshConfMyFrame();
            bindConfControls();
            window.listenForDirectInvites();
        }, 1200);
    });
})();
