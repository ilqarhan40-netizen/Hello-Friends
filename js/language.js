// ==========================================
// ПРИВАТНЫЙ ЧАТ — ПОЛНОСТЬЮ ИЗОЛИРОВАННЫЙ МИР (js/language.js)
// Два раздельных канала (avatar / mic) + зеркальное копирование
// + 1-в-1 движок безлимитного микрофона из js/video-room.js
// ==========================================

const PRIV_LANG_MAP = {
    en: ['gb', '🇬🇧'], kk: ['kz', '🇰🇿'], ru: ['ru', '🇷🇺'], az: ['az', '🇦🇿'],
    de: ['de', '🇩🇪'], tr: ['tr', '🇹🇷'], ar: ['ae', '🇦🇪'], it: ['it', '🇮🇹'],
    es: ['es', '🇪🇸'], fr: ['fr', '🇫🇷'], pt: ['pt', '🇵🇹'], ja: ['jp', '🇯🇵'], zh: ['cn', '🇨🇳']
};

const PRIV_SPEECH_LOCALE = {
    en: 'en-US', ru: 'ru-RU', az: 'az-AZ', tr: 'tr-TR', de: 'de-DE', kk: 'kk-KZ',
    ar: 'ar-AE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR', pt: 'pt-PT', ja: 'ja-JP', zh: 'zh-CN'
};

// Сброс всех сохранённых языков приватного микрофона на Auto при старте сессии
Object.keys(localStorage).forEach(k => {
    if (k.startsWith('hf_priv_mic_lang_')) localStorage.removeItem(k);
});

function privNormLang(code) {
    if (!code || code === 'auto' || code === 'un') return null;
    let c = String(code).substring(0, 2).toLowerCase();
    const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', us: 'en', gb: 'en' };
    return fix[c] || c;
}

function getPrivateRoomId() {
    const r = window.currentRoomId || '';
    if (!r || r === 'global' || r === 'video_room_global' || r === 'private_ai_bot' || r.startsWith('private_me_')) {
        return null;
    }
    return r;
}

function isPrivChatTabVisible() {
    if (typeof window.isChatTabVisibleNow === 'function') return window.isChatTabVisibleNow();
    if (window.currentIndex === 1 || window.currentIndex === 2 || window.currentIndex === 3 || window.currentIndex === 4 || window.currentIndex === 5) return false;
    return true;
}

function getPrivateTargetUser() {
    const roomId = getPrivateRoomId();
    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';

    if (roomId && roomId.startsWith('private_') && myId) {
        const parts = roomId.replace('private_', '').split('_');
        const otherId = parts.find(id => String(id) !== myId);
        if (otherId) {
            if (window.currentTargetUser && String(window.currentTargetUser.id) === String(otherId)) {
                return window.currentTargetUser;
            }
            if (Array.isArray(window.participants)) {
                const found = window.participants.find(p => String(p.id) === String(otherId));
                if (found) {
                    window.currentTargetUser = { ...found };
                    return window.currentTargetUser;
                }
            }
        }
    }

    if (window.currentTargetUser && window.currentTargetUser.id && String(window.currentTargetUser.id) !== myId) {
        return window.currentTargetUser;
    }
    return null;
}

function getMyPrivateNativeLang() {
    if (window.myProfileInfo) {
        if (typeof window.getLangByFlag === 'function') {
            const byFlag = privNormLang(window.getLangByFlag(window.myProfileInfo.flagCode, window.myProfileInfo.flag));
            if (byFlag) return byFlag;
        }
        if (typeof window.getSmartLang === 'function') {
            const smart = privNormLang(window.getSmartLang(window.myProfileInfo));
            if (smart) return smart;
        }
    }
    return 'en';
}

function getTargetPrivateNativeLang(targetUser) {
    if (!targetUser) return getMyPrivateNativeLang();
    if (typeof window.getLangByFlag === 'function') {
        const byFlag = privNormLang(window.getLangByFlag(targetUser.flagCode, targetUser.flag));
        if (byFlag) return byFlag;
    }
    if (typeof window.getSmartLang === 'function') {
        const smart = privNormLang(window.getSmartLang(targetUser));
        if (smart) return smart;
    }
    return privNormLang(targetUser.langCode) || 'en';
}

async function privTranslateText(text, targetLang) {
    const clean = (text || '').trim();
    const tl = privNormLang(targetLang);
    if (!clean || !tl) return clean;
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (data && data[0]) {
            const joined = data[0].map(s => (s && s[0]) ? s[0] : '').join('');
            if (joined) return joined;
        }
    } catch (e) {}
    return clean;
}

// ==========================================
// 0. ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ ПРИВАТА (РАЗДЕЛЬНО: avatar / mic)
// ==========================================
window.privateLiveLangs = {};
window.privateLiveLangsLoaded = {};
window.activePrivateLangRoom = null;
window.activePrivateLangListener = null;

window.syncMyPrivateChannelLang = function(roomId, channel, forcedLang) {
    if (typeof firebase === 'undefined' || !roomId || !window.myProfileInfo || !window.myProfileInfo.id) return;
    if (channel !== 'avatar' && channel !== 'mic') return;

    const myId = String(window.myProfileInfo.id);
    const storageKey = (channel === 'mic') ? ('hf_priv_mic_lang_' + roomId) : ('hf_priv_avatar_lang_' + roomId);
    const activeLang = forcedLang !== undefined
        ? privNormLang(forcedLang)
        : privNormLang(localStorage.getItem(storageKey));

    const userRef = firebase.database().ref(`private_active_langs/${roomId}/${myId}`);
    const chRef = userRef.child(channel);

    if (!window.privateLiveLangs[roomId]) window.privateLiveLangs[roomId] = {};
    if (!window.privateLiveLangs[roomId][myId]) window.privateLiveLangs[roomId][myId] = {};

    if (activeLang && PRIV_LANG_MAP[activeLang]) {
        const payload = {
            langCode: activeLang,
            flagCode: PRIV_LANG_MAP[activeLang][0],
            flag: PRIV_LANG_MAP[activeLang][1],
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        window.privateLiveLangs[roomId][myId][channel] = payload;
        chRef.set(payload).catch(() => {});
        try { userRef.onDisconnect().remove(); } catch (e) {}
    } else {
        delete window.privateLiveLangs[roomId][myId][channel];
        chRef.remove().catch(() => {});
    }
};

window.initPrivateLiveLangSync = function(roomId) {
    const rId = roomId || getPrivateRoomId();
    if (!rId || typeof firebase === 'undefined' || !window.myProfileInfo || !window.myProfileInfo.id) return;

    if (window.activePrivateLangRoom && window.activePrivateLangRoom !== rId) {
        const prevRoom = window.activePrivateLangRoom;
        localStorage.removeItem('hf_priv_mic_lang_' + prevRoom);
        window.syncMyPrivateChannelLang(prevRoom, 'mic', null);
        if (window.activePrivateLangListener) {
            firebase.database().ref('private_active_langs/' + prevRoom).off('value', window.activePrivateLangListener);
            window.activePrivateLangListener = null;
        }
    }

    if (window.activePrivateLangRoom !== rId || !window.activePrivateLangListener) {
        window.activePrivateLangRoom = rId;
        window.activePrivateLangListener = firebase.database().ref('private_active_langs/' + rId).on('value', (snap) => {
            window.privateLiveLangs[rId] = snap.val() || {};
            window.privateLiveLangsLoaded[rId] = true;
        });
    }

    window.syncMyPrivateChannelLang(rId, 'avatar');
    window.syncMyPrivateChannelLang(rId, 'mic');
};

async function getTargetLivePrivateChannel(roomId, targetUser, channel) {
    if (!targetUser) {
        return {
            lang: getMyPrivateNativeLang(),
            flag: window.myProfileInfo?.flag || '🌐',
            flagCode: window.myProfileInfo?.flagCode || 'un',
            name: 'User'
        };
    }

    if (roomId && !window.privateLiveLangsLoaded[roomId] && typeof firebase !== 'undefined') {
        try {
            const snap = await firebase.database().ref('private_active_langs/' + roomId).once('value');
            window.privateLiveLangs[roomId] = snap.val() || {};
            window.privateLiveLangsLoaded[roomId] = true;
        } catch (e) {}
    }

    const roomMap = window.privateLiveLangs[roomId] || {};
    const targetLiveAll = roomMap[String(targetUser.id)] || null;
    const live = targetLiveAll ? targetLiveAll[channel] : null;

    const targetLang = (live && live.langCode)
        ? privNormLang(live.langCode)
        : getTargetPrivateNativeLang(targetUser);
    const targetFlag = (live && live.flag)
        ? live.flag
        : (targetUser.flag || '🌐');
    const targetFlagCode = (live && live.flagCode)
        ? live.flagCode
        : (targetUser.flagCode || 'un');

    return {
        lang: targetLang || 'en',
        flag: targetFlag,
        flagCode: targetFlagCode,
        name: (targetUser.name || 'User').split(' ')[0]
    };
}

function buildPrivateMirrorMarquee(senderFlag, senderName, originalText, targetFlag, targetName, translatedText) {
    let html = `<span class="text-white mr-2">${senderFlag} ${senderName}:</span> <span class="text-[#e9edef]">${originalText}</span>`;
    if (translatedText && originalText.toLowerCase() !== translatedText.toLowerCase()) {
        html += ` &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; <span class="text-[#00a884] font-bold">${targetFlag} ${targetName}: ${translatedText}</span>`;
    }
    return html;
}

// ==========================================
// 1. МЕНЮ ЯЗЫКА АВАТАРА (КЛАВИАТУРА) И МИКРОФОНА (ТОЛЬКО ПРИВАТ)
// ==========================================
window.openPrivateLangModal = function() {
    const roomId = getPrivateRoomId();
    if (!roomId) return;
    window.initPrivateLiveLangSync(roomId);

    const listContainer = document.getElementById('personal-lang-list');
    if (!listContainer) return;

    const targetUser = getPrivateTargetUser();
    const roomLabel = targetUser ? ('👤 ' + (targetUser.name || 'Private').split(' ')[0]) : '🔒 Private Chat';
    const currentPref = localStorage.getItem('hf_priv_avatar_lang_' + roomId) || 'auto';

    const langs = [
        { code: 'auto', name: '🤖 Auto (Profile)', flag: '🌐' }, { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'kk', name: 'Қазақша', flag: '🇰🇿' }, { code: 'pt', name: 'Português', flag: '🇵🇹' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }, { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
        { code: 'de', name: 'Deutsch', flag: '🇩🇪' }, { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'ar', name: 'العربية', flag: '🇦🇪' }, { code: 'it', name: 'Italiano', flag: '🇮🇹' },
        { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' }, { code: 'zh', name: '中文', flag: '🇨🇳' }
    ];

    let html = `<div class="text-[0.7rem] text-[#00a884] mb-3 text-center uppercase tracking-widest border-b border-[#2a3942] pb-2">Settings strictly for:<br><b class="text-white text-sm">${roomLabel} (Keyboard)</b></div>`;
    langs.forEach(l => {
        const isActive = (currentPref === l.code) ? 'border-[#00a884] bg-[#202c33]' : 'border-[#2a3942] bg-[#111b21]';
        html += `<div onclick="window.savePrivateAvatarLang('${l.code}', '${roomId}')" class="flex items-center p-3 rounded-xl border ${isActive} cursor-pointer mb-2 hover:border-[#00a884] transition shadow-sm"><span class="text-white font-bold text-[0.9rem] flex gap-3 items-center"><span class="text-xl">${l.flag}</span> ${l.name}</span></div>`;
    });

    listContainer.innerHTML = html;
    document.getElementById('personal-lang-modal')?.classList.add('active');
};

window.savePrivateAvatarLang = function(langCode, roomId) {
    const rId = roomId || getPrivateRoomId();
    if (!rId) return;

    if (langCode === 'auto') {
        localStorage.removeItem('hf_priv_avatar_lang_' + rId);
    } else {
        localStorage.setItem('hf_priv_avatar_lang_' + rId, langCode);
    }

    window.syncMyPrivateChannelLang(rId, 'avatar');

    document.getElementById('personal-lang-modal')?.classList.remove('active');
    if (window.showToast) window.showToast("Keyboard Language", "Saved strictly for this Private Chat.", "", "");
};

window.savePrivateMicLang = function(val) {
    const roomId = getPrivateRoomId();
    if (!roomId) return;

    if (!val || val === 'auto') {
        localStorage.removeItem('hf_priv_mic_lang_' + roomId);
    } else {
        localStorage.setItem('hf_priv_mic_lang_' + roomId, val);
    }

    window.syncMyPrivateChannelLang(roomId, 'mic');
    if (typeof window.onPrivateMicLangChanged === 'function') window.onPrivateMicLangChanged();

    if (window.showToast) window.showToast("Mic Language", "Saved strictly for this Private Chat", "", "");
};

window.syncPrivateMicLangUI = function() {
    const roomId = getPrivateRoomId();
    if (!roomId) return;
    window.initPrivateLiveLangSync(roomId);
    const sel = document.getElementById('plus-mic-lang');
    if (sel) sel.value = localStorage.getItem('hf_priv_mic_lang_' + roomId) || 'auto';
};

// ==========================================
// 2. ОТПРАВКА С КЛАВИАТУРЫ (КАНАЛ avatar — ЗЕРКАЛЬНЫЙ ПАКЕТ)
// ==========================================
window.sendPrivateMsg = async function() {
    const roomId = getPrivateRoomId();
    if (!roomId) return;
    window.initPrivateLiveLangSync(roomId);

    const inputField = document.getElementById('chat-input');
    if (!inputField) return;
    const rawText = inputField.value.trim();
    if (!rawText) return;
    inputField.value = '';

    const manualLang = privNormLang(localStorage.getItem('hf_priv_avatar_lang_' + roomId));
    const myActiveLang = manualLang || getMyPrivateNativeLang();

    const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
    const safeName = window.myUsername || 'User';
    const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

    let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';
    let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';

    if (manualLang && PRIV_LANG_MAP[manualLang]) {
        activeFlagCode = PRIV_LANG_MAP[manualLang][0];
        activeFlag = PRIV_LANG_MAP[manualLang][1];
    }

    let myBaseText = myActiveLang
        ? await privTranslateText(rawText, myActiveLang)
        : rawText;

    const targetUser = getPrivateTargetUser();
    const targetInfo = await getTargetLivePrivateChannel(roomId, targetUser, 'avatar');
    let textToShip = myBaseText;

    if (targetInfo.lang && targetInfo.lang !== myActiveLang) {
        textToShip = await privTranslateText(myBaseText, targetInfo.lang);
    }

    const mirrorMarquee = buildPrivateMirrorMarquee(
        activeFlag, safeName, myBaseText,
        targetInfo.flag, targetInfo.name, textToShip
    );

    try {
        firebase.database().ref(roomId).push({
            userId: safeId,
            name: safeName,
            text: textToShip || myBaseText || "Error",
            originalText: myBaseText || "Error",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: myActiveLang,
            targetLang: targetInfo.lang,
            targetFlag: targetInfo.flag,
            targetName: targetInfo.name,
            inputChannel: 'avatar',
            mirrorMarquee: mirrorMarquee,
            isConfMsg: false
        });
    } catch (err) {
        alert("Ошибка отправки в приват: " + err.message);
    }

    const chatMsgs = document.getElementById('chat-messages');
    if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100);
    if (targetUser && typeof window.sendPushToUser === 'function') {
        window.sendPushToUser(targetUser.id, safeName, textToShip);
    }
};

// ==========================================
// 3. ГОЛОСОВОЙ ВВОД ПРИВАТА (1-в-1 ДВИЖОК ИЗ js/video-room.js, СМЕНА ЯЗЫКА НА ЛЕТУ + СБРОС НА AUTO)
// ==========================================
(function () {
    const PM = {
        active: false,
        mode: 'text', // 'text' | 'ai-audio'
        roomId: null,
        recognition: null,
        restartTimer: null,
        silenceTimer: null,
        watchdog: null,
        pendingInterim: '',
        lastSentNorm: '',
        lastSentAt: 0,
        recentSend: [],
        recBase: 'en',
        isManual: false
    };
    window.HF_PRIV_MIC = PM;

    function pmNorm(s) {
        return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    function isPrivDup(text) {
        const norm = pmNorm(text);
        if (!norm) return true;
        const now = Date.now();
        const win = norm.length > 10 ? 6500 : 2500;
        const list = PM.recentSend.filter(x => (now - x.ts) < 7000);
        const dup = list.some(x =>
            (x.norm === norm && (now - x.ts) < win) ||
            (norm.length >= 8 && (now - x.ts) < 3500 && x.norm.includes(norm))
        );
        if (dup) { PM.recentSend = list; return true; }
        list.push({ norm, ts: now });
        PM.recentSend = list;
        return false;
    }

    function readPrivateMicLang(roomId) {
        const rId = roomId || PM.roomId || getPrivateRoomId();
        const manual = rId ? privNormLang(localStorage.getItem('hf_priv_mic_lang_' + rId)) : null;
        PM.isManual = Boolean(manual);
        PM.recBase = PM.isManual ? manual : getMyPrivateNativeLang();
    }

    function resetPrivateMicToAuto(roomId) {
        const rId = roomId || PM.roomId || getPrivateRoomId();
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('hf_priv_mic_lang_')) localStorage.removeItem(k);
        });
        if (rId) window.syncMyPrivateChannelLang(rId, 'mic', null);
        const sel = document.getElementById('plus-mic-lang');
        if (sel && getPrivateRoomId()) sel.value = 'auto';
        readPrivateMicLang(rId);
    }

    function ensurePrivateMicPill() {
        if (!document.getElementById('hf-pmic-styles')) {
            const st = document.createElement('style');
            st.id = 'hf-pmic-styles';
            st.textContent = `
                #hf-pmic-pill {
                    display: none;
                    align-items: center;
                    gap: 8px;
                    width: calc(100% - 16px);
                    margin: 0 auto 6px auto;
                    padding: 7px 10px;
                    background: #111b21;
                    border: 1.5px solid #ef4444;
                    border-radius: 999px;
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
                    flex-shrink: 0;
                    box-sizing: border-box;
                    z-index: 60;
                }
                #hf-pmic-pill.active { display: flex; }
                #hf-pmic-pill.ai-mode {
                    border-color: #00e5b0;
                    box-shadow: 0 6px 20px rgba(0, 229, 176, 0.35);
                }
                #hf-pmic-dot {
                    width: 9px; height: 9px; border-radius: 50%;
                    background: #ef4444; flex-shrink: 0;
                    animation: hfPmPulse 1s infinite;
                }
                #hf-pmic-pill.ai-mode #hf-pmic-dot { background: #00e5b0; }
                #hf-pmic-badge {
                    display: none;
                    font-size: 0.68rem; font-weight: 800;
                    padding: 2px 6px; border-radius: 999px;
                    background: rgba(0, 229, 176, 0.16); color: #00e5b0;
                    flex-shrink: 0;
                }
                #hf-pmic-pill.ai-mode #hf-pmic-badge { display: inline-block; }
                #hf-pmic-text {
                    flex: 1 1 auto; min-width: 0; overflow: hidden;
                    white-space: nowrap; color: #fff; font-size: 0.8rem; font-weight: 600;
                }
                #hf-pmic-stop {
                    flex-shrink: 0; background: #ef4444; color: #fff; border: none;
                    border-radius: 999px; padding: 4px 12px; font-size: 0.72rem;
                    font-weight: 800; cursor: pointer;
                }
                @keyframes hfPmPulse {
                    0% { transform: scale(0.85); opacity: 0.6; }
                    50% { transform: scale(1.25); opacity: 1; }
                    100% { transform: scale(0.85); opacity: 0.6; }
                }
            `;
            document.head.appendChild(st);
        }

        let pill = document.getElementById('hf-pmic-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'hf-pmic-pill';
            pill.innerHTML = `
                <span id="hf-pmic-dot"></span>
                <span id="hf-pmic-badge">🤖 AI</span>
                <span id="hf-pmic-flag" class="text-sm shrink-0 cursor-pointer">🌐</span>
                <span id="hf-pmic-text"></span>
                <button type="button" id="hf-pmic-stop">STOP</button>
            `;
            pill.querySelector('#hf-pmic-flag').onclick = (e) => {
                e.stopPropagation();
                if (typeof window.toggleUniversalMic === 'function') window.toggleUniversalMic();
            };
            pill.querySelector('#hf-pmic-stop').onclick = (e) => {
                e.stopPropagation();
                window.stopPrivateUnlimitedMic(false);
            };
        }

        const inp = document.getElementById('chat-input');
        const area = inp ? inp.closest('.chat-input-area') : null;
        if (area && area.parentNode && pill.parentNode !== area.parentNode) {
            area.parentNode.insertBefore(pill, area);
        }
        return pill;
    }

    function updatePrivatePillUI(preview = '') {
        const pill = ensurePrivateMicPill();
        if (!pill) return;
        if (!PM.active) {
            pill.classList.remove('active', 'ai-mode');
            return;
        }
        pill.classList.toggle('ai-mode', PM.mode === 'ai-audio');
        const flagEl = document.getElementById('hf-pmic-flag');
        const txtEl = document.getElementById('hf-pmic-text');
        const activeFlag = (PM.isManual && PRIV_LANG_MAP[PM.recBase])
            ? PRIV_LANG_MAP[PM.recBase][1]
            : ((window.myProfileInfo && window.myProfileInfo.flag) || '🌐');
        if (flagEl) flagEl.textContent = activeFlag;
        if (txtEl) {
            txtEl.textContent = preview || (PM.mode === 'ai-audio' ? 'AI VOICE ON' : 'MIC ON');
            txtEl.scrollLeft = txtEl.scrollWidth;
        }
        pill.classList.add('active');
    }

    async function dispatchPrivateVoicePhrase(text) {
        const recognized = String(text || '').trim();
        const roomId = PM.roomId || getPrivateRoomId();
        if (!recognized || !roomId) return;

        const norm = pmNorm(recognized);
        if (!norm) return;

        const now = Date.now();
        if (norm === PM.lastSentNorm && (now - PM.lastSentAt) < 2200) return;
        if (isPrivDup(recognized)) return;

        PM.lastSentNorm = norm;
        PM.lastSentAt = now;

        const sendMode = PM.mode;
        const spokenLangCode = PM.recBase;
        const isMicManual = PM.isManual;
        window.speechRecognizedText = recognized;

        const targetUser = getPrivateTargetUser();
        const targetInfo = await getTargetLivePrivateChannel(roomId, targetUser, 'mic');

        let textToShip = recognized;
        if (targetInfo.lang && targetInfo.lang !== spokenLangCode) {
            textToShip = await privTranslateText(recognized, targetInfo.lang);
        }

        const safeId = (window.myProfileInfo && window.myProfileInfo.id) ? window.myProfileInfo.id : 'guest';
        const safeName = window.myUsername || 'User';
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) ? window.myProfileInfo.photo : 'https://ui-avatars.com/api/?name=U';

        let activeFlagCode = (window.myProfileInfo && window.myProfileInfo.flagCode) ? window.myProfileInfo.flagCode : 'un';
        let activeFlag = (window.myProfileInfo && window.myProfileInfo.flag) ? window.myProfileInfo.flag : '🌐';

        if (isMicManual && PRIV_LANG_MAP[spokenLangCode]) {
            activeFlagCode = PRIV_LANG_MAP[spokenLangCode][0];
            activeFlag = PRIV_LANG_MAP[spokenLangCode][1];
        }

        const mirrorMarquee = buildPrivateMirrorMarquee(
            activeFlag, safeName, recognized,
            targetInfo.flag, targetInfo.name, textToShip
        );

        const msgPayload = {
            userId: safeId,
            name: safeName,
            text: textToShip || "...",
            originalText: recognized || "...",
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            photo: safePhoto,
            flag: activeFlag,
            flagCode: activeFlagCode,
            langCode: spokenLangCode,
            targetLang: targetInfo.lang,
            targetFlag: targetInfo.flag,
            targetName: targetInfo.name,
            inputChannel: 'mic',
            mirrorMarquee: mirrorMarquee,
            isConfMsg: false
        };

        if (sendMode === 'ai-audio') msgPayload.isAIAudio = true;
        firebase.database().ref(roomId).push(msgPayload);

        const chatMsgs = document.getElementById('chat-messages');
        if (chatMsgs) setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 100);

        if (targetUser && typeof window.sendPushToUser === 'function') {
            window.sendPushToUser(targetUser.id, safeName, textToShip);
        }
    }

    function schedulePrivateRestart(delay = 80) {
        if (!PM.active) return;
        clearTimeout(PM.restartTimer);
        PM.restartTimer = setTimeout(() => {
            PM.restartTimer = null;
            launchPrivateRecognition();
        }, delay);
    }

    function resetPrivateRecognitionFresh(delay = 100) {
        clearTimeout(PM.silenceTimer);
        PM.silenceTimer = null;
        PM.pendingInterim = '';

        if (PM.recognition) {
            try {
                PM.recognition.onresult = null;
                PM.recognition.onend = null;
                PM.recognition.onerror = null;
                PM.recognition.abort();
            } catch (e) {}
            PM.recognition = null;
        }
        if (PM.active) schedulePrivateRestart(delay);
    }

    function flushPrivateInterim() {
        clearTimeout(PM.silenceTimer);
        PM.silenceTimer = null;

        const phrase = PM.pendingInterim.trim();
        PM.pendingInterim = '';
        updatePrivatePillUI('');

        if (!phrase) return;
        dispatchPrivateVoicePhrase(phrase);
        resetPrivateRecognitionFresh(80);
    }

    function launchPrivateRecognition() {
        PM.restartTimer = null;
        if (!PM.active) return;

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        if (PM.recognition) {
            try {
                PM.recognition.onresult = null;
                PM.recognition.onend = null;
                PM.recognition.onerror = null;
                PM.recognition.abort();
            } catch (e) {}
            PM.recognition = null;
        }

        PM.pendingInterim = '';
        readPrivateMicLang(PM.roomId);

        try {
            const rec = new SpeechRec();
            rec.lang = PRIV_SPEECH_LOCALE[PM.recBase] || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (event) => {
                if (!event.results || !event.results.length || !PM.active) return;

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
                    clearTimeout(PM.silenceTimer);
                    PM.silenceTimer = null;
                    PM.pendingInterim = '';
                    updatePrivatePillUI('');
                    dispatchPrivateVoicePhrase(finalTxt);
                    return;
                }

                if (interimTxt) {
                    PM.pendingInterim = interimTxt;
                    updatePrivatePillUI(interimTxt);

                    clearTimeout(PM.silenceTimer);
                    PM.silenceTimer = setTimeout(flushPrivateInterim, PM.recBase === 'az' ? 1400 : 1000);
                }
            };

            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) {
                    window.stopPrivateUnlimitedMic(true);
                    return;
                }
                if (PM.pendingInterim.trim()) {
                    flushPrivateInterim();
                    return;
                }
                if (PM.active) {
                    PM.recognition = null;
                    schedulePrivateRestart(220);
                }
            };

            rec.onend = () => {
                PM.recognition = null;
                if (PM.pendingInterim.trim()) {
                    const tail = PM.pendingInterim.trim();
                    PM.pendingInterim = '';
                    clearTimeout(PM.silenceTimer);
                    PM.silenceTimer = null;
                    updatePrivatePillUI('');
                    dispatchPrivateVoicePhrase(tail);
                }
                if (PM.active) {
                    updatePrivatePillUI('');
                    schedulePrivateRestart(80);
                }
            };

            PM.recognition = rec;
            rec.start();
        } catch (e) {
            PM.recognition = null;
            if (PM.active) schedulePrivateRestart(300);
        }
    }

    window.onPrivateMicLangChanged = function () {
        const roomId = getPrivateRoomId();
        if (!roomId) return;
        readPrivateMicLang(roomId);
        if (!PM.active || roomId !== PM.roomId) return;
        updatePrivatePillUI('');
        if (window.closeAllMenus) window.closeAllMenus();
        resetPrivateRecognitionFresh(150);
    };

    window.stopPrivateUnlimitedMic = function (discard = true) {
        const tail = (!discard && PM.pendingInterim) ? PM.pendingInterim.trim() : '';
        const prevRoom = PM.roomId;
        PM.active = false;
        clearTimeout(PM.restartTimer);
        clearTimeout(PM.silenceTimer);
        clearInterval(PM.watchdog);
        PM.restartTimer = null;
        PM.silenceTimer = null;
        PM.watchdog = null;
        PM.pendingInterim = '';

        if (PM.recognition) {
            try {
                PM.recognition.onresult = null;
                PM.recognition.onend = null;
                PM.recognition.onerror = null;
                PM.recognition.stop();
            } catch (e) {}
            PM.recognition = null;
        }

        if (tail) dispatchPrivateVoicePhrase(tail);
        updatePrivatePillUI('');

        // После окончания сессии возвращаем язык микрофона привата на Auto
        resetPrivateMicToAuto(prevRoom);
    };

    window.startPrivateMic = async function (mode) {
        const roomId = getPrivateRoomId();
        if (!roomId) return;
        window.initPrivateLiveLangSync(roomId);
        if (window.closeAllMenus) window.closeAllMenus();
        if (typeof window.stopGlobalUnlimitedMic === 'function') window.stopGlobalUnlimitedMic(true);

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return alert("Голосовой ввод не поддерживается браузером.");

        PM.roomId = roomId;
        PM.mode = (mode === 'ai-audio') ? 'ai-audio' : 'text';
        readPrivateMicLang(roomId);

        const wasActive = PM.active;
        PM.active = true;
        updatePrivatePillUI('');

        if (wasActive) {
            resetPrivateRecognitionFresh(120);
        } else {
            launchPrivateRecognition();
        }

        clearInterval(PM.watchdog);
        PM.watchdog = setInterval(() => {
            if (!PM.active) return;
            if (!isPrivChatTabVisible() || getPrivateRoomId() !== PM.roomId) {
                window.stopPrivateUnlimitedMic(true);
                return;
            }
            if (!PM.recognition && !PM.restartTimer) {
                launchPrivateRecognition();
            }
        }, 2000);
    };

    // Прямой перехват смены языка в #plus-mic-lang (переключает мгновенно на лету в Привате)
    document.addEventListener('change', (e) => {
        if (!e.target || e.target.id !== 'plus-mic-lang') return;
        if (!isPrivChatTabVisible()) return;
        const roomId = getPrivateRoomId();
        if (!roomId) return;
        const val = e.target.value;
        if (!val || val === 'auto') localStorage.removeItem('hf_priv_mic_lang_' + roomId);
        else localStorage.setItem('hf_priv_mic_lang_' + roomId, val);
        window.syncMyPrivateChannelLang(roomId, 'mic');
        window.onPrivateMicLangChanged();
    }, true);
})();

// ==========================================
// 4. ПРИЁМ СООБЩЕНИЙ ПРИВАТА: ТУПОЕ ЗЕРКАЛЬНОЕ КОПИРОВАНИЕ (БЕЗ ПОВТОРНЫХ ПЕРЕВОДОВ)
// ==========================================
window.handlePrivateMessage = function(snapshot) {
    const data = snapshot.val();
    if (!data) return;
    if (data.isVoiceRoomMsg || data.isVideoRoomMsg || data.isConfMsg) return;

    const roomKey = snapshot.ref.parent ? snapshot.ref.parent.key : window.currentRoomId;
    if (roomKey !== window.currentRoomId) return;

    window.initPrivateLiveLangSync(roomKey);

    try {
        const deletedMsgs = JSON.parse(localStorage.getItem('hf_deleted_msgs') || '[]');
        if (deletedMsgs.includes(snapshot.key)) return;
    } catch (e) {}

    const chatMessages = document.getElementById('chat-messages');
    const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
    const isMe = data.sessionId === window.mySessionId || (myId && String(data.userId) === myId);
    const isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;

    const p = isMe
        ? window.myProfileInfo
        : ((window.participants || []).find(part => String(part.id) === String(data.userId)) || {
            id: data.userId,
            photo: data.photo || 'https://ui-avatars.com/api/?name=U',
            langCode: data.langCode || 'en',
            flag: data.flag || '🌐'
        });

    const baseText = (data.originalText || data.text || '').trim();
    const translatedText = (data.text || baseText).trim();
    const hasDiff = Boolean(baseText && translatedText && baseText.toLowerCase() !== translatedText.toLowerCase());

    const isAppActiveAndInChat = (document.visibilityState === 'visible' && isPrivChatTabVisible());
    const senderDisplayName = isMe ? window.myUsername : (data.name || 'User').split(' ')[0];

    if (!isMe && !isHistory) {
        if (data.isTransfer) { window.sndCash?.play().catch(() => {}); }
        else { window.sndMsg?.play().catch(() => {}); }

        let textPreview = translatedText;
        if (data.isAIAudio) textPreview = "🤖 AI Voice Message";
        if (data.mediaUrl) textPreview = data.mediaType === 'video' ? "📹 Video" : "🖼️ Photo";
        if (data.isLocation) textPreview = "📍 Shared Location";
        if (data.isTransfer) textPreview = "💸 Money Transfer Received!";

        if (!isAppActiveAndInChat && window.showToast) {
            window.showToast("Message | " + senderDisplayName, textPreview, p.photo, "");
        }
    }

    const messageGroup = document.createElement('div');
    messageGroup.className = "flex flex-col w-full mt-3 mb-2";
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`;

    const displayFlag = data.flag || (isMe ? (window.myProfileInfo?.flag || '🌐') : (p.flag || '🌐'));
    const avatarClick = isMe ? `window.openPersonalLangModal()` : `window.openAvatarModal('${p.id}')`;
    const avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer hover:scale-105 transition" onclick="${avatarClick}"><img src="${p.photo || 'https://ui-avatars.com/api/?name=U'}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942] shadow-md"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] shadow border border-[#2a3942] leading-none">${displayFlag}</span></div>`;

    let bubbleContent = `<div class="text-[#e9edef]">${baseText}</div>`;
    let bubbleClasses = `chat-bubble`;

    if (baseText && !data.mediaUrl && !data.isTransfer && !data.isLocation && !data.isAIAudio) {
        if (hasDiff) {
            if (isMe) {
                bubbleContent = `
                    <div class="text-[#e9edef]">${baseText}</div>
                    <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${translatedText}</div>
                `;
            } else {
                bubbleContent = `
                    <div class="text-[#e9edef]">${translatedText}</div>
                    <div class="mt-1 pt-1 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${baseText}</div>
                `;
            }
        }
    }

    if (data.isAIAudio) {
        const playLang = isMe
            ? (privNormLang(data.langCode) || getMyPrivateNativeLang())
            : (privNormLang(data.targetLang) || getMyPrivateNativeLang());
        const textToPlay = isMe ? baseText : translatedText;
        const safeEncodedText = encodeURIComponent(textToPlay || '').replace(/'/g, "%27");

        let audioBodyHtml = `<div class="text-[#e9edef]">${baseText}</div>`;
        if (hasDiff) {
            if (isMe) {
                audioBodyHtml = `
                    <div class="text-[#e9edef]">${baseText}</div>
                    <div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-yellow-400 font-bold tracking-wide">➔ ${translatedText}</div>
                `;
            } else {
                audioBodyHtml = `
                    <div class="text-[#e9edef]">${translatedText}</div>
                    <div class="mt-2 pt-1.5 border-t border-white/20 text-[0.75rem] text-[#00a884] font-bold tracking-wide">➔ ${baseText}</div>
                `;
            }
        }
        bubbleContent = `<div class="ai-audio-player" onclick="window.playAIVoice('${safeEncodedText}', '${playLang.substring(0, 2)}')"><i class="fa-solid fa-circle-play"></i><span>Play Voice</span></div><div style="font-size:0.85rem; margin-top:6px; opacity:0.95;">${audioBodyHtml}</div>`;
    } else if (data.mediaUrl) {
        const fileName = data.text ? data.text.replace('📄 Документ: ', '').replace('🖼️ Photo', 'Файл').replace('📹 Video', 'Видео') : 'Файл';
        if (data.mediaType === 'video' || data.mediaUrl.startsWith('data:video/')) {
            bubbleContent = `<video src="${data.mediaUrl}" controls class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 border border-[#2a3942]"></video>`;
        } else if (data.mediaType === 'audio' || data.mediaUrl.startsWith('data:audio/')) {
            bubbleContent = `<audio src="${data.mediaUrl}" controls class="w-[200px] sm:w-[250px] mt-1 outline-none"></audio>`;
        } else if (data.mediaType === 'document' || data.mediaUrl.startsWith('data:application/') || data.mediaUrl.startsWith('data:text/')) {
            bubbleContent = `<div class="flex items-center gap-3 bg-[#111b21] p-3 rounded-lg border border-[#2a3942] mt-1 min-w-[200px]"><div class="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-blue-400 shrink-0"><i class="fa-solid fa-file-arrow-down text-xl"></i></div><div class="flex flex-col overflow-hidden"><span class="text-white text-sm font-bold truncate max-w-[140px]">${fileName}</span><a href="${data.mediaUrl}" download="${fileName}" class="text-[0.7rem] text-[#00a884] font-bold mt-1 uppercase tracking-wide hover:text-white transition">Скачать</a></div></div>`;
        } else {
            bubbleContent = `<img src="${data.mediaUrl}" class="max-w-[200px] sm:max-w-[250px] rounded-lg mt-1 cursor-pointer border border-[#2a3942] hover:opacity-90 transition" onclick="window.openFullscreenImage(this.src)">`;
        }
        bubbleClasses = `chat-bubble !bg-[#202c33] !p-2`;
    } else if (data.isTransfer) {
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`;
        bubbleContent = `<div class="flex flex-col items-center p-4 min-w-[200px]"><div class="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center text-[#111b21] mb-2 shadow-lg"><i class="fa-solid fa-check text-2xl"></i></div><span class="text-[0.7rem] text-[#00a884] font-bold uppercase tracking-widest mb-1 text-center">${data.transferTypeLabel || 'Transfer'}</span><span class="text-2xl font-bold text-white mb-1">$${data.amount}</span><div class="w-full h-[1px] bg-[#2a3942] mb-2"></div><span class="text-xs text-[#8696a0]">To: <span class="text-white font-bold">${data.recName}</span></span></div>`;
    } else if (data.isLocation) {
        bubbleClasses = `chat-bubble !bg-[#0b141a] border border-[#00a884] shadow-[0_0_15px_rgba(0,168,132,0.3)] !p-0 overflow-hidden`;
        bubbleContent = `<div class="flex flex-col w-[200px] sm:w-[250px]"><iframe width="100%" height="150" frameborder="0" scrolling="no" src="${data.embedLink}" style="pointer-events: none;"></iframe><a href="${data.mapLink}" target="_blank" class="bg-[#202c33] p-2.5 text-center text-[0.8rem] text-blue-400 font-bold hover:bg-[#2a3942] transition flex items-center justify-center gap-2"><i class="fa-solid fa-map-location-dot"></i> Open in Maps</a></div>`;
    }

    msgWrapper.innerHTML = isMe
        ? `<div class="chat-bubble-wrapper outgoing items-end flex flex-col" data-id="${snapshot.key}"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>` + avatarHtml
        : avatarHtml + `<div class="chat-bubble-wrapper incoming items-start flex flex-col" data-id="${snapshot.key}"><div class="chat-sender-name">${senderDisplayName}</div><div class="${bubbleClasses}">${bubbleContent}</div></div>`;

    messageGroup.appendChild(msgWrapper);
    if (chatMessages) {
        chatMessages.appendChild(messageGroup);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    if (!isHistory && !data.isTransfer && !data.mediaUrl && !data.isLocation && !data.isFile) {
        const mText = document.getElementById('chat-info-marquee');
        if (mText && window.isMarqueeEnabled !== false) {
            const targetUser = getPrivateTargetUser();
            const fallbackReceiverName = data.targetName || (isMe ? (targetUser?.name || 'User').split(' ')[0] : window.myUsername);
            const fallbackReceiverFlag = data.targetFlag || (isMe ? (targetUser?.flag || '🌐') : (window.myProfileInfo?.flag || '🌐'));

            const marqueeHtml = data.mirrorMarquee || buildPrivateMirrorMarquee(
                displayFlag, senderDisplayName, baseText,
                fallbackReceiverFlag, fallbackReceiverName, translatedText
            );

            mText.innerHTML = marqueeHtml;
            mText.style.animation = 'none';
            void mText.offsetWidth;
            mText.style.animation = null;
        }
    }
};

// ==========================================
// 5. ПЕРЕВОДЫ БАННЕРОВ ПОЧТЫ И ПРОПУЩЕННЫХ ВЫЗОВОВ (13 ЯЗЫКОВ)
// ==========================================
window.HF_BANNER_I18N = {
    en: {
        new_mail_title: 'NEW EMAIL',
        new_mail_text: 'You have a new email',
        btn_open_mail: 'Open',
        missed_audio_title: 'MISSED AUDIO CALL',
        missed_audio_text: 'Missed audio call from',
        missed_video_title: 'MISSED VIDEO CALL',
        missed_video_text: 'Missed video call from',
        btn_later: 'Later',
        btn_callback: 'Call back'
    },
    ru: {
        new_mail_title: 'НОВОЕ ПИСЬМО',
        new_mail_text: 'Вам пришло новое письмо',
        btn_open_mail: 'Открыть',
        missed_audio_title: 'ПРОПУЩЕННЫЙ АУДИОВЫЗОВ',
        missed_audio_text: 'Пропущенный аудиозвонок от',
        missed_video_title: 'ПРОПУЩЕННЫЙ ВИДЕОВЫЗОВ',
        missed_video_text: 'Пропущенный видеозвонок от',
        btn_later: 'Позже',
        btn_callback: 'Перезвонить'
    },
    az: {
        new_mail_title: 'YENİ MƏKTUB',
        new_mail_text: 'Yeni e-poçtunuz var',
        btn_open_mail: 'Açmaq',
        missed_audio_title: 'BURAXILMIŞ AUDİO ZƏNG',
        missed_audio_text: 'Buraxılmış audio zəng:',
        missed_video_title: 'BURAXILMIŞ VİDEO ZƏNG',
        missed_video_text: 'Buraxılmış video zəng:',
        btn_later: 'Sonra',
        btn_callback: 'Geri zəng et'
    },
    kk: {
        new_mail_title: 'ЖАҢА ХАТ',
        new_mail_text: 'Сізге жаңа хат келді',
        btn_open_mail: 'Ашу',
        missed_audio_title: 'ҚАБЫЛДАНБАҒАН АУДИО ҚОҢЫРАУ',
        missed_audio_text: 'Қабылданбаған аудио қоңырау:',
        missed_video_title: 'ҚАБЫЛДАНБАҒАН БЕЙНЕ ҚОҢЫРАУ',
        missed_video_text: 'Қабылданбаған бейне қоңырау:',
        btn_later: 'Кейінірек',
        btn_callback: 'Қайта қоңырау'
    },
    tr: {
        new_mail_title: 'YENİ E-POSTA',
        new_mail_text: 'Yeni bir e-postanız var',
        btn_open_mail: 'Aç',
        missed_audio_title: 'CEVAPSIZ SESLİ ARAMA',
        missed_audio_text: 'Cevapsız sesli arama:',
        missed_video_title: 'CEVAPSIZ GÖRÜNTÜLÜ ARAMA',
        missed_video_text: 'Cevapsız görüntülü arama:',
        btn_later: 'Sonra',
        btn_callback: 'Geri ara'
    },
    de: {
        new_mail_title: 'NEUE E-MAIL',
        new_mail_text: 'Sie haben eine neue E-Mail',
        btn_open_mail: 'Öffnen',
        missed_audio_title: 'VERPASSTER AUDIOANRUF',
        missed_audio_text: 'Verpasster Audioanruf von',
        missed_video_title: 'VERPASSTER VIDEOANRUF',
        missed_video_text: 'Verpasster Videoanruf von',
        btn_later: 'Später',
        btn_callback: 'Zurückrufen'
    },
    ar: {
        new_mail_title: 'بريد جديد',
        new_mail_text: 'لديك رسالة بريد جديدة',
        btn_open_mail: 'فتح',
        missed_audio_title: 'مكالمة صوتية فائتة',
        missed_audio_text: 'مكالمة صوتية فائتة من',
        missed_video_title: 'مكالمة فيديو فائتة',
        missed_video_text: 'مكالمة فيديو فائتة من',
        btn_later: 'لاحقاً',
        btn_callback: 'معاودة الاتصال'
    },
    it: {
        new_mail_title: 'NUOVA EMAIL',
        new_mail_text: 'Hai una nuova email',
        btn_open_mail: 'Apri',
        missed_audio_title: 'CHIAMATA AUDIO PERSA',
        missed_audio_text: 'Chiamata audio persa da',
        missed_video_title: 'VIDEOCHIAMATA PERSA',
        missed_video_text: 'Videochiamata persa da',
        btn_later: 'Più tardi',
        btn_callback: 'Richiama'
    },
    es: {
        new_mail_title: 'NUEVO CORREO',
        new_mail_text: 'Tienes un nuevo correo',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'LLAMADA DE AUDIO PERDIDA',
        missed_audio_text: 'Llamada de audio perdida de',
        missed_video_title: 'VIDEOLLAMADA PERDIDA',
        missed_video_text: 'Videollamada perdida de',
        btn_later: 'Más tarde',
        btn_callback: 'Devolver llamada'
    },
    fr: {
        new_mail_title: 'NOUVEL E-MAIL',
        new_mail_text: 'Vous avez un nouvel e-mail',
        btn_open_mail: 'Ouvrir',
        missed_audio_title: 'APPEL AUDIO MANQUÉ',
        missed_audio_text: 'Appel audio manqué de',
        missed_video_title: 'APPEL VIDÉO MANQUÉ',
        missed_video_text: 'Appel vidéo manqué de',
        btn_later: 'Plus tard',
        btn_callback: 'Rappeler'
    },
    pt: {
        new_mail_title: 'NOVO E-MAIL',
        new_mail_text: 'Você tem um novo e-mail',
        btn_open_mail: 'Abrir',
        missed_audio_title: 'CHAMADA DE ÁUDIO PERDIDA',
        missed_audio_text: 'Chamada de áudio perdida de',
        missed_video_title: 'CHAMADA DE VÍDEO PERDIDA',
        missed_video_text: 'Chamada de vídeo perdida de',
        btn_later: 'Mais tarde',
        btn_callback: 'Retornar'
    },
    ja: {
        new_mail_title: '新着メール',
        new_mail_text: '新しいメールが届きました',
        btn_open_mail: '開く',
        missed_audio_title: '不在着信（音声）',
        missed_audio_text: '音声通話の不在着信:',
        missed_video_title: '不在着信（ビデオ）',
        missed_video_text: 'ビデオ通話の不在着信:',
        btn_later: 'あとで',
        btn_callback: '折り返す'
    },
    zh: {
        new_mail_title: '新邮件',
        new_mail_text: '您有一封新邮件',
        btn_open_mail: '打开',
        missed_audio_title: '未接语音来电',
        missed_audio_text: '未接语音来电:',
        missed_video_title: '未接视频来电',
        missed_video_text: '未接视频来电:',
        btn_later: '稍后',
        btn_callback: '回拨'
    }
};

window.mergeBannerI18n = function() {
    window.i18n = window.i18n || {};
    Object.keys(window.HF_BANNER_I18N).forEach((code) => {
        window.i18n[code] = Object.assign({}, window.i18n[code] || {}, window.HF_BANNER_I18N[code]);
    });
};

window.mergeBannerI18n();
document.addEventListener('DOMContentLoaded', window.mergeBannerI18n);
window.addEventListener('load', window.mergeBannerI18n);
