// ==========================================
// ФАЙЛ: js/video-room.js (ISOLATED VIDEO WORLD v10)
// Сверено с index.html и js/language.js:
// 1. Меню строго внутри #voice-translator (в рамках #phone-body на планшете)
// 2. Авто строго от флага профиля
// 3. Связь с экосистемой: window.i18n, window.appLang, window.changeAppLanguage
// 4. Клик вне меню закрывает окна, флаг аватара не сбрасывается базой users
// 5. Текст отправителя соответствует его активному флагу
// ==========================================

(function () {
    'use strict';

    const LANG_MAP = {
        en: { name: 'English', flagCode: 'gb', flag: '🇬🇧', speech: 'en-US' },
        ru: { name: 'Русский', flagCode: 'ru', flag: '🇷🇺', speech: 'ru-RU' },
        az: { name: 'Azərbaycan', flagCode: 'az', flag: '🇦🇿', speech: 'az-AZ' },
        tr: { name: 'Türkçe', flagCode: 'tr', flag: '🇹🇷', speech: 'tr-TR' },
        de: { name: 'Deutsch', flagCode: 'de', flag: '🇩🇪', speech: 'de-DE' },
        kk: { name: 'Қазақша', flagCode: 'kz', flag: '🇰🇿', speech: 'kk-KZ' },
        ar: { name: 'العربية', flagCode: 'ae', flag: '🇦🇪', speech: 'ar-AE' },
        it: { name: 'Italiano', flagCode: 'it', flag: '🇮🇹', speech: 'it-IT' },
        es: { name: 'Español', flagCode: 'es', flag: '🇪🇸', speech: 'es-ES' },
        fr: { name: 'Français', flagCode: 'fr', flag: '🇫🇷', speech: 'fr-FR' },
        pt: { name: 'Português', flagCode: 'pt', flag: '🇵🇹', speech: 'pt-PT' },
        ja: { name: '日本語', flagCode: 'jp', flag: '🇯🇵', speech: 'ja-JP' },
        zh: { name: '中文', flagCode: 'cn', flag: '🇨🇳', speech: 'zh-CN' }
    };

    const UI_FALLBACK = {
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
        manualAvatarLang: null, // null = Авто строго от флага профиля
        manualMicLang: null,    // null = Авто строго от флага профиля
        queue: [],
        seenKeys: new Set(),
        activeDbPath: null,
        activeListener: null,
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

    function isVideoMode() {
        return window.currentActiveCallType === 'video';
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function isRealFlag(flag) {
        const f = String(flag || '').trim();
        return Boolean(f && f !== '🌐' && f !== '🏳️' && f !== 'un');
    }

    function fixLang(code) {
        if (!code) return '';
        const raw = String(code).trim().toLowerCase();
        if (!raw || raw === 'auto' || raw === 'un') return '';
        const tl = raw.split(/[-_]/)[0].substring(0, 2);
        const map = {
            us: 'en', gb: 'en', uk: 'en',
            kz: 'kk', cn: 'zh', jp: 'ja',
            ae: 'ar', sa: 'ar', eg: 'ar',
            br: 'pt', mx: 'es'
        };
        return map[tl] || tl;
    }

    function langFromFlagEmoji(flag) {
        if (!flag) return '';
        const emojiMap = {
            '🇬🇧': 'en', '🇺🇸': 'en', '🇷🇺': 'ru', '🇦🇿': 'az',
            '🇹🇷': 'tr', '🇩🇪': 'de', '🇰🇿': 'kk', '🇦🇪': 'ar',
            '🇸🇦': 'ar', '🇮🇹': 'it', '🇪🇸': 'es', '🇫🇷': 'fr',
            '🇵🇹': 'pt', '🇧🇷': 'pt', '🇯🇵': 'ja', '🇨🇳': 'zh'
        };
        return emojiMap[String(flag).trim()] || '';
    }

    function langFromPhone(phone) {
        if (!phone) return '';
        const digits = String(phone).replace(/\D/g, '');
        if (!digits) return '';
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
        return '';
    }

    // СТРОГО ОТ ФЛАГА ПРОФИЛЯ
    function resolveProfileLang(userObj) {
        if (!userObj) return 'en';
        const byFlag = langFromFlagEmoji(userObj.flag);
        if (byFlag) return byFlag;
        const byFlagCode = fixLang(userObj.flagCode);
        if (byFlagCode) return byFlagCode;
        const byPhone = langFromPhone(userObj.phone || userObj.phoneNumber || userObj.tel);
        if (byPhone) return byPhone;
        const byCode = fixLang(userObj.langCode || userObj.lang);
        if (byCode) return byCode;
        return 'en';
    }

    function resolveProfileFlag(userObj) {
        if (userObj && isRealFlag(userObj.flag)) return String(userObj.flag).trim();
        const lang = resolveProfileLang(userObj);
        return (LANG_MAP[lang] && LANG_MAP[lang].flag) ? LANG_MAP[lang].flag : '🇬🇧';
    }

    // Язык подписей меню: при принудительном языке экосистемы — от экосистемы; в Auto — от флага профиля
    function getUiLang() {
        const savedEco = localStorage.getItem('hf_app_lang');
        if (savedEco && savedEco !== 'auto') {
            const ecoCode = fixLang(savedEco);
            if (ecoCode && UI_FALLBACK[ecoCode]) return ecoCode;
        }
        if (VR.manualAvatarLang && UI_FALLBACK[VR.manualAvatarLang]) {
            return VR.manualAvatarLang;
        }
        const prof = resolveProfileLang(window.myProfileInfo);
        if (prof && UI_FALLBACK[prof]) return prof;
        const appEco = fixLang(window.appLang);
        return (appEco && UI_FALLBACK[appEco]) ? appEco : 'en';
    }

    function getUiDict() {
        const lang = getUiLang();
        const fb = UI_FALLBACK[lang] || UI_FALLBACK.en;
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

    // Точный контейнер экрана видеокомнаты внутри рамки #phone-body (фикс планшета)
    function getVideoHostContainer() {
        return document.getElementById('voice-translator')
            || document.getElementById('phone-body')
            || document.body;
    }

    function getPartner() {
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

    function getDbPath() {
        if (!isVideoMode()) return null;
        const partner = getPartner();
        if (!partner || !partner.id || !window.myProfileInfo || !window.myProfileInfo.id) return null;
        const pair = [String(window.myProfileInfo.id), String(partner.id)].sort();
        return `video_rooms/${pair[0]}_${pair[1]}`;
    }

    async function translateText(text, targetTl) {
        const clean = String(text || '').trim();
        if (!clean || !targetTl) return clean;
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetTl)}&dt=t&q=${encodeURIComponent(clean)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                return data[0].map(p => (p && p[0]) ? p[0] : '').join('') || clean;
            }
            return clean;
        } catch (e) {
            return clean;
        }
    }

    function getTab1Input() {
        return document.getElementById('voice-chat-input');
    }

    function getTab1Bar() {
        const inp = getTab1Input();
        return inp ? inp.closest('.chat-input-area') : null;
    }

    function getTab1MicBtn() {
        const bar = getTab1Bar();
        return bar ? bar.querySelector('button[onclick*="toggleUniversalMic"]') : null;
    }

    function getTab1SendBtn() {
        const bar = getTab1Bar();
        return bar ? bar.querySelector('button[onclick*="sendFirebaseMsg"]') : null;
    }

    // ==========================================
    // 1. СТИЛИ И ПАНЕЛИ ВНУТРИ #voice-translator (#phone-body)
    // ==========================================
    function injectStyles() {
        if (document.getElementById('hf-vr-v10-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-vr-v10-styles';
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

    function updateMyAvatarFlagUI() {
        const flagEl = document.getElementById('voice-me-flag');
        if (!flagEl) return;
        const desired = (VR.manualAvatarLang && LANG_MAP[VR.manualAvatarLang])
            ? LANG_MAP[VR.manualAvatarLang].flag
            : resolveProfileFlag(window.myProfileInfo);
        if (flagEl.textContent !== desired) {
            flagEl.textContent = desired;
        }
    }

    function syncEcosystemLanguage(chosenCode) {
        const target = chosenCode || 'auto';
        if (typeof window.changeAppLanguage === 'function') {
            try { window.changeAppLanguage(target); } catch (e) {}
        } else {
            localStorage.setItem('hf_app_lang', target);
            if (typeof window.applyTranslations === 'function') {
                try { window.applyTranslations(); } catch (e) {}
            }
        }
    }

    function closeAllVideoPopups() {
        const a = document.getElementById('hf-vr-avatar-modal');
        const m = document.getElementById('hf-vr-mic-popup');
        if (a) a.classList.remove('active');
        if (m) m.classList.remove('active');
    }

    // ПАНЕЛЬ ЯЗЫКОВ С АВАТАРА (ВНУТРИ #voice-translator + СВЯЗЬ С ЭКОСИСТЕМОЙ)
    function openVideoAvatarLangPanel() {
        injectStyles();
        const existing = document.getElementById('hf-vr-avatar-modal');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllVideoPopups();
        if (wasOpen) return;

        const host = getVideoHostContainer();
        let modal = existing;
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'hf-vr-avatar-modal';
            modal.addEventListener('click', (e) => e.stopPropagation());
        }
        if (modal.parentNode !== host) host.appendChild(modal);

        const d = getUiDict();
        const profileFlag = resolveProfileFlag(window.myProfileInfo);

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;">🌐 ${escapeHtml(d.langTitle)}</span>
                <button type="button" id="hf-vr-avatar-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <button type="button" data-lang="auto" class="hf-vr-lang-btn ${!VR.manualAvatarLang ? 'selected' : ''}" style="width:100%;justify-content:center;">
                ${profileFlag} ${escapeHtml(d.autoProfile)}
            </button>
            <div class="hf-vr-lang-grid">
        `;
        Object.keys(LANG_MAP).forEach(code => {
            const item = LANG_MAP[code];
            html += `<button type="button" data-lang="${code}" class="hf-vr-lang-btn ${VR.manualAvatarLang === code ? 'selected' : ''}">${item.flag} ${item.name}</button>`;
        });
        html += `</div>`;
        modal.innerHTML = html;

        modal.querySelector('#hf-vr-avatar-close').onclick = () => modal.classList.remove('active');
        modal.querySelectorAll('.hf-vr-lang-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const chosen = btn.getAttribute('data-lang');
                VR.manualAvatarLang = (chosen === 'auto') ? null : chosen;
                updateMyAvatarFlagUI();
                syncEcosystemLanguage(chosen);
                updateMicPill();
                modal.classList.remove('active');
            };
        });

        modal.classList.add('active');
    }

    // МЕНЮ МИКРОФОНА (ВНУТРИ #voice-translator + СВЯЗЬ С ЭКОСИСТЕМОЙ)
    function openVideoMicMenu() {
        injectStyles();
        const existing = document.getElementById('hf-vr-mic-popup');
        const wasOpen = existing && existing.classList.contains('active');
        closeAllVideoPopups();
        if (wasOpen) return;

        const host = getVideoHostContainer();
        let popup = existing;
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'hf-vr-mic-popup';
            popup.addEventListener('click', (e) => e.stopPropagation());
        }
        if (popup.parentNode !== host) host.appendChild(popup);

        const d = getUiDict();
        const profileFlag = resolveProfileFlag(window.myProfileInfo);

        let optionsHtml = `<option value="auto" ${!VR.manualMicLang ? 'selected' : ''}>${profileFlag} ${escapeHtml(d.autoProfile)}</option>`;
        Object.keys(LANG_MAP).forEach(code => {
            const item = LANG_MAP[code];
            optionsHtml += `<option value="${code}" ${VR.manualMicLang === code ? 'selected' : ''}>${item.flag} ${item.name}</option>`;
        });

        popup.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:0.78rem;font-weight:800;color:#00a884;"><i class="fa-solid fa-microphone mr-1"></i> ${escapeHtml(d.micTitle)}</span>
                <button type="button" id="hf-vr-mic-close" style="background:none;border:none;color:#8696a0;font-size:1rem;cursor:pointer;">✕</button>
            </div>
            <select id="hf-vr-mic-select" style="width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:10px;padding:8px;font-size:0.82rem;margin-bottom:10px;outline:none;">
                ${optionsHtml}
            </select>
            <button type="button" id="hf-vr-mic-start-btn" style="width:100%;background:#00a884;color:#111b21;border:none;border-radius:10px;padding:9px;font-size:0.82rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                <i class="fa-solid fa-microphone"></i> ${escapeHtml(d.voiceToText)}
            </button>
        `;

        popup.querySelector('#hf-vr-mic-close').onclick = () => popup.classList.remove('active');
        popup.querySelector('#hf-vr-mic-select').onchange = (e) => {
            const val = e.target.value;
            VR.manualMicLang = (val === 'auto') ? null : val;
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
    // 2. БЕГУЩАЯ СТРОКА ВИДЕОКОМНАТЫ
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

    function pushMarquee(html) {
        if (!html) return;
        startMarqueeEngine();
        VR.queue.push(html);
        const isPlaceholder = !VR.marquee.currentHtml || VR.marquee.currentHtml.indexOf('img src=') === -1;
        if (isPlaceholder || VR.marquee.passCount >= 1) {
            loadNextMarquee(true);
        }
    }

    window.resetVideoRoomState = function () {
        VR.manualAvatarLang = null;
        VR.manualMicLang = null;
        VR.queue = [];
        VR.seenKeys.clear();
        VR.marquee.currentHtml = '';
        VR.marquee.passCount = 0;
        closeAllVideoPopups();

        if (VR.activeDbPath && VR.activeListener && typeof firebase !== 'undefined') {
            firebase.database().ref(VR.activeDbPath).off('child_added', VR.activeListener);
        }
        VR.activeDbPath = null;
        VR.activeListener = null;

        const { textEl } = getMarqueeNodes();
        if (textEl) textEl.innerHTML = getUiDict().waiting;
        updateMyAvatarFlagUI();
    };

    // ==========================================
    // 3. ОТПРАВКА И ПРИЁМ (ТЕКСТ ОТПРАВИТЕЛЯ СТРОГО ПОД ЕГО ФЛАГ)
    // ==========================================
    window.sendVideoRoomPayload = async function (rawText, sourceType = 'keyboard') {
        if (!isVideoMode()) return;
        const cleanText = String(rawText || '').trim();
        if (!cleanText) return;

        window.syncVideoRoomListener();
        const dbPath = getDbPath();
        if (!dbPath) return;

        const partner = getPartner();
        const isVoice = (sourceType === 'voice');

        const manualLang = isVoice ? VR.manualMicLang : VR.manualAvatarLang;
        const myLang = manualLang || resolveProfileLang(window.myProfileInfo);
        const myFlag = (manualLang && LANG_MAP[manualLang])
            ? LANG_MAP[manualLang].flag
            : resolveProfileFlag(window.myProfileInfo);

        const targetLang = resolveProfileLang(partner);

        // Текст отправителя приводим к языку его активного флага
        const senderDisplayText = await translateText(cleanText, myLang);
        const translatedText = (targetLang && targetLang !== myLang)
            ? await translateText(senderDisplayText, targetLang)
            : senderDisplayText;

        const me = window.myProfileInfo || {};
        firebase.database().ref(dbPath).push({
            userId: String(me.id || 'guest'),
            name: window.myUsername || me.name || 'User',
            photo: me.photo || 'https://ui-avatars.com/api/?name=U',
            flag: myFlag,
            langCode: myLang,
            targetLang: targetLang,
            originalText: senderDisplayText || cleanText,
            text: translatedText || senderDisplayText || cleanText,
            sourceType: sourceType,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isVideoRoomMsg: true
        }).catch(() => {});
    };

    window.sendVideoRoomMsg = async function () {
        if (!isVideoMode()) return;
        const input = getTab1Input();
        if (!input) return;
        const raw = input.value.trim();
        if (!raw) return;
        input.value = '';
        if (window.playSafeSound && window.sndMsg) window.playSafeSound(window.sndMsg);
        await window.sendVideoRoomPayload(raw, 'keyboard');
    };

    async function handleIncomingVideoMsg(snapshot) {
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

        const myId = window.myProfileInfo ? String(window.myProfileInfo.id) : '';
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const partner = getPartner();

        const senderText = String(data.originalText || data.text || '').trim();
        let receiverText = String(data.text || senderText).trim();

        let senderPhoto, senderFlag, senderName;
        let receiverPhoto, receiverFlag, receiverName;

        if (isMe) {
            senderPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = isRealFlag(data.flag) ? data.flag : resolveProfileFlag(window.myProfileInfo);
            senderName = (window.myUsername || 'Me').split(' ')[0];

            receiverPhoto = (partner && partner.photo) || 'https://ui-avatars.com/api/?name=U';
            receiverFlag = resolveProfileFlag(partner);
            receiverName = partner ? (partner.name || 'Partner').split(' ')[0] : 'Partner';
        } else {
            senderPhoto = data.photo || (partner && partner.photo) || 'https://ui-avatars.com/api/?name=U';
            senderFlag = isRealFlag(data.flag) ? data.flag : resolveProfileFlag(partner);
            senderName = (data.name || (partner && partner.name) || 'Partner').split(' ')[0];

            receiverPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';
            receiverName = (window.myUsername || 'Me').split(' ')[0];

            const myReadLang = VR.manualAvatarLang || resolveProfileLang(window.myProfileInfo);
            receiverFlag = (VR.manualAvatarLang && LANG_MAP[VR.manualAvatarLang])
                ? LANG_MAP[VR.manualAvatarLang].flag
                : resolveProfileFlag(window.myProfileInfo);

            const sentTarget = fixLang(data.targetLang);
            const sourceLang = fixLang(data.langCode);
            if (sourceLang && sourceLang === myReadLang) {
                receiverText = senderText;
            } else if (sentTarget && sentTarget === myReadLang && data.text) {
                receiverText = data.text;
            } else {
                receiverText = await translateText(senderText, myReadLang);
            }
        }

        const icon = data.sourceType === 'voice'
            ? '<i class="fa-solid fa-microphone text-yellow-400 mx-2 text-[0.65rem]"></i>'
            : '<i class="fa-solid fa-arrow-right text-[#00a884] mx-2 text-[0.65rem]"></i>';

        const html =
            `<span class="inline-flex items-center">` +
                `<img src="${escapeHtml(senderPhoto)}" class="w-5 h-5 rounded-full border border-[#2a3942] mr-1 object-cover shadow-sm">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(senderName)}:</span>` +
                `<span class="text-[#e9edef] mr-1">${escapeHtml(senderFlag)} ${escapeHtml(senderText)}</span>` +
                `${icon}` +
                `<img src="${escapeHtml(receiverPhoto)}" class="w-5 h-5 rounded-full border border-yellow-400 mr-1 object-cover">` +
                `<span class="text-white font-bold mr-1">${escapeHtml(receiverName)}:</span>` +
                `<span class="text-yellow-400 font-bold">${escapeHtml(receiverFlag)} ${escapeHtml(receiverText)}</span>` +
            `</span>`;

        pushMarquee(html);
    }

    window.syncVideoRoomListener = function () {
        if (!isVideoMode() || typeof firebase === 'undefined' || !firebase.database) return;

        if (!VR.offsetSynced) {
            VR.offsetSynced = true;
            firebase.database().ref('.info/serverTimeOffset').on('value', (s) => {
                VR.serverOffset = s.val() || 0;
            });
        }

        const desiredPath = getDbPath();
        if (!desiredPath) return;
        if (VR.activeDbPath === desiredPath && VR.activeListener) return;

        if (VR.activeDbPath && VR.activeListener) {
            firebase.database().ref(VR.activeDbPath).off('child_added', VR.activeListener);
        }

        VR.seenKeys.clear();
        VR.activeDbPath = desiredPath;
        VR.listenerStartedAt = Date.now() + (VR.serverOffset || 0);
        VR.activeListener = firebase.database()
            .ref(desiredPath)
            .limitToLast(10)
            .on('child_added', handleIncomingVideoMsg);
    };

    // ==========================================
    // 4. МИКРОФОН ВИДЕОКОМНАТЫ
    // ==========================================
    function ensureMicPill() {
        injectStyles();
        const d = getUiDict();
        let pill = document.getElementById('hf-vr-mic-pill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'hf-vr-mic-pill';
            pill.innerHTML = `
                <span class="dot"></span>
                <span id="hf-vr-mic-label"></span>
                <button type="button" class="stop-btn" id="hf-vr-stop-btn" onclick="event.stopPropagation(); window.stopVideoRoomMic(false)">${escapeHtml(d.stop)}</button>
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
        const host = getVideoHostContainer();
        if (pill.parentNode !== host) host.appendChild(pill);
        return pill;
    }

    function updateMicPill(preview = '') {
        const pill = ensureMicPill();
        const label = document.getElementById('hf-vr-mic-label');
        const micBtn = getTab1MicBtn();

        if (!VR.micActive) {
            pill.classList.remove('active');
            if (micBtn) micBtn.classList.remove('hf-vr-mic-live');
            return;
        }

        const d = getUiDict();
        const flag = (VR.manualMicLang && LANG_MAP[VR.manualMicLang])
            ? LANG_MAP[VR.manualMicLang].flag
            : resolveProfileFlag(window.myProfileInfo);

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
            const activeLang = VR.manualMicLang || resolveProfileLang(window.myProfileInfo);
            rec.lang = (LANG_MAP[activeLang] && LANG_MAP[activeLang].speech) || 'en-US';
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
    // 5. ПРИВЯЗКА КНОПОК ТОЛЬКО В ВИДЕОКОМНАТЕ
    // ==========================================
    function bindVideoControls() {
        const sendBtn = getTab1SendBtn();
        if (sendBtn && !sendBtn.dataset.hfVrBound) {
            sendBtn.dataset.hfVrBound = '1';
            sendBtn.addEventListener('click', (e) => {
                if (!isVideoMode()) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                window.sendVideoRoomMsg();
            }, true);
        }

        const micBtn = getTab1MicBtn();
        if (micBtn && !micBtn.dataset.hfVrBound) {
            micBtn.dataset.hfVrBound = '1';
            micBtn.addEventListener('click', (e) => {
                if (!isVideoMode()) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                if (VR.micActive) window.stopVideoRoomMic(false);
                else openVideoMicMenu();
            }, true);
        }

        const mePhoto = document.getElementById('voice-me-photo');
        const meTarget = mePhoto ? mePhoto.parentElement : null;
        if (meTarget && !meTarget.dataset.hfVrBound) {
            meTarget.dataset.hfVrBound = '1';
            meTarget.addEventListener('click', (e) => {
                if (!isVideoMode()) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                openVideoAvatarLangPanel();
            }, true);
        }

        // Реагируем на смену языка из верхнего меню настроек экосистемы
        const ecoSelect = document.getElementById('app-lang-select');
        if (ecoSelect && !ecoSelect.dataset.hfVrBound) {
            ecoSelect.dataset.hfVrBound = '1';
            ecoSelect.addEventListener('change', () => {
                setTimeout(() => {
                    if (!isVideoMode()) return;
                    updateMicPill();
                    const { textEl } = getMarqueeNodes();
                    if (textEl && (!VR.marquee.currentHtml || VR.marquee.currentHtml.indexOf('img src=') === -1)) {
                        textEl.innerHTML = getUiDict().waiting;
                    }
                }, 50);
            });
        }
    }

    function init() {
        startMarqueeEngine();
        bindVideoControls();

        document.addEventListener('click', () => {
            if (isVideoMode()) closeAllVideoPopups();
        });

        setInterval(() => {
            if (isVideoMode()) {
                window.syncVideoRoomListener();
                bindVideoControls();
                updateMyAvatarFlagUI();
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
