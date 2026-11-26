// ============================================================
// ИЗОЛИРОВАННЫЙ МОДУЛЬ «ЖИВОЙ ЭФИР» (js/live-room.js)
// - Отвязывает нижнюю видеоиконку от 1-на-1 звонков (#voice-translator)
//   и переводит её подпись на все 13 языков системы
// - 1-на-1 аудио/видеозвонки с аватара остаются полностью отдельными
// - Свои ветки Firebase:
//     live_stream_hosts/<hostId>
//     live_stream_viewers/<hostId>/<viewerId>
//     live_stream_feed/<hostId>
//     live_stream_signals/<hostId>/<viewerId>
// - Левая боковая панель пользователей (ведущие с LIVE наверху)
// - Один видеофрейм + камера и двойной микрофон (Текст / ИИ-Голос) под ним
// - Без баблов:
//     * Верхняя строка CC — оригиналы речи/сообщений
//     * Строка внутри видеофрейма — медленная очередь переводов (~46px/s):
//       - Ведущий видит переводы всех зрителей с их флагом и именем
//       - Зритель видит только перевод речи Ведущего на свой язык
// ============================================================

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

    const LIVE_I18N = {
        en: {
            live_nav: 'Live', live_title: 'Live Stream', live_btn: 'LIVE', live_off: 'OFF AIR', live_start_cam: 'Go Live',
            live_stop_cam: 'End Live', live_msg_ph: 'Message to live...', live_cc_wait: 'Live original stream...',
            live_frame_wait_host: 'Viewer translations will appear here...', live_frame_wait_viewer: 'Host translation will appear here...',
            live_mic_title: 'Audio-Microphone', live_ai_btn: 'AI Translator (Voice)', live_stt_btn: 'Speech to Text',
            live_mic_on: 'MIC ON', live_ai_on: 'AI VOICE ON', live_stop: 'STOP', live_auto: 'Auto (Profile)',
            live_tap_sound: 'Tap for sound', live_you: 'You', live_studio_hint: 'Press camera to start your Live Stream, or pick a LIVE user on the left.',
            live_cam_err: 'Camera/microphone access denied.', live_connecting: 'Connecting to live stream...', live_ended: 'Broadcast ended'
        },
        ru: {
            live_nav: 'Живой эфир', live_title: 'Живой эфир', live_btn: 'LIVE', live_off: 'НЕ В ЭФИРЕ', live_start_cam: 'В эфир',
            live_stop_cam: 'Завершить', live_msg_ph: 'Написать в эфир...', live_cc_wait: 'Оригиналы речи и сообщений...',
            live_frame_wait_host: 'Здесь появятся переводы зрителей...', live_frame_wait_viewer: 'Здесь появится перевод ведущего...',
            live_mic_title: 'Аудио-микрофон', live_ai_btn: 'ИИ-переводчик (Голос)', live_stt_btn: 'Голос в текст',
            live_mic_on: 'МИК ВКЛ', live_ai_on: 'ИИ-ГОЛОС ВКЛ', live_stop: 'СТОП', live_auto: 'Авто (Профиль)',
            live_tap_sound: 'Включить звук', live_you: 'Вы', live_studio_hint: 'Нажмите камеру, чтобы выйти в Живой эфир, или выберите ведущего LIVE слева.',
            live_cam_err: 'Нет доступа к камере или микрофону.', live_connecting: 'Подключение к эфиру...', live_ended: 'Эфир завершён'
        },
        kk: {
            live_nav: 'Тікелей эфир', live_title: 'Тікелей эфир', live_btn: 'LIVE', live_off: 'ЭФИРДЕ ЕМЕС', live_start_cam: 'Эфирге шығу',
            live_stop_cam: 'Аяқтау', live_msg_ph: 'Эфирге жазу...', live_cc_wait: 'Түпнұсқа сөздер мен хабарламалар...',
            live_frame_wait_host: 'Көрермендердің аудармалары осында...', live_frame_wait_viewer: 'Жүргізушінің аудармасы осында...',
            live_mic_title: 'Аудио-микрофон', live_ai_btn: 'ЖИ-аудармашы (Дауыс)', live_stt_btn: 'Дауысты мәтінге',
            live_mic_on: 'МИК ҚОСУЛЫ', live_ai_on: 'ЖИ-ДАУЫС ҚОСУЛЫ', live_stop: 'ТОҚТА', live_auto: 'Авто (Профиль)',
            live_tap_sound: 'Дыбысты қосу', live_you: 'Сіз', live_studio_hint: 'Тікелей эфирді бастау үшін камераны басыңыз немесе сол жақтан LIVE таңдаңыз.',
            live_cam_err: 'Камера немесе микрофонға рұқсат жоқ.', live_connecting: 'Эфирге қосылуда...', live_ended: 'Эфир аяқталды'
        },
        az: {
            live_nav: 'Canlı efir', live_title: 'Canlı Efir', live_btn: 'LIVE', live_off: 'EFİRDƏ DEYİL', live_start_cam: 'Canlıya çıx',
            live_stop_cam: 'Bitir', live_msg_ph: 'Efirə yaz...', live_cc_wait: 'Orijinal nitq və mesajlar...',
            live_frame_wait_host: 'İzləyicilərin tərcümələri burada...', live_frame_wait_viewer: 'Aparıcının tərcüməsi burada...',
            live_mic_title: 'Audio-Mikrofon', live_ai_btn: 'AI Tərcüməçi (Səs)', live_stt_btn: 'Səsdən mətnə',
            live_mic_on: 'MİK AÇIQ', live_ai_on: 'AI-SƏS AÇIQ', live_stop: 'DAYAN', live_auto: 'Avto (Profil)',
            live_tap_sound: 'Səsi aç', live_you: 'Siz', live_studio_hint: 'Canlı yayım üçün kameranı açın və ya soldan LIVE seçin.',
            live_cam_err: 'Kamera və ya mikrofona icazə yoxdur.', live_connecting: 'Yayıma qoşulur...', live_ended: 'Yayım bitdi'
        },
        tr: {
            live_nav: 'Canlı', live_title: 'Canlı Yayın', live_btn: 'LIVE', live_off: 'YAYIN DIŞI', live_start_cam: 'Yayına Başla',
            live_stop_cam: 'Bitir', live_msg_ph: 'Yayına yaz...', live_cc_wait: 'Orijinal konuşma ve mesajlar...',
            live_frame_wait_host: 'İzleyici çevirileri burada görünecek...', live_frame_wait_viewer: 'Yayıncı çevirisi burada görünecek...',
            live_mic_title: 'Ses Mikrofonu', live_ai_btn: 'AI Çevirmen (Ses)', live_stt_btn: 'Sesten Metne',
            live_mic_on: 'MİK AÇIK', live_ai_on: 'AI-SES AÇIK', live_stop: 'DUR', live_auto: 'Oto (Profil)',
            live_tap_sound: 'Sesi aç', live_you: 'Sen', live_studio_hint: 'Canlı yayın için kameraya basın veya soldan LIVE seçin.',
            live_cam_err: 'Kamera/mikrofon izni verilmedi.', live_connecting: 'Yayına bağlanıyor...', live_ended: 'Yayın sona erdi'
        },
        de: {
            live_nav: 'Live', live_title: 'Live-Stream', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Live gehen',
            live_stop_cam: 'Beenden', live_msg_ph: 'In den Live-Stream schreiben...', live_cc_wait: 'Originale Sprache & Nachrichten...',
            live_frame_wait_host: 'Übersetzungen der Zuschauer erscheinen hier...', live_frame_wait_viewer: 'Übersetzung des Hosts erscheint hier...',
            live_mic_title: 'Audio-Mikrofon', live_ai_btn: 'KI-Übersetzer (Stimme)', live_stt_btn: 'Sprache zu Text',
            live_mic_on: 'MIK AN', live_ai_on: 'KI-STIMME AN', live_stop: 'STOPP', live_auto: 'Auto (Profil)',
            live_tap_sound: 'Ton einschalten', live_you: 'Du', live_studio_hint: 'Kamera drücken für eigenen Stream oder links LIVE wählen.',
            live_cam_err: 'Kamera-/Mikrofonzugriff verweigert.', live_connecting: 'Verbinde zum Stream...', live_ended: 'Stream beendet'
        },
        ar: {
            live_nav: 'بث مباشر', live_title: 'بث مباشر', live_btn: 'LIVE', live_off: 'غير متصل', live_start_cam: 'بدء البث',
            live_stop_cam: 'إنهاء', live_msg_ph: 'اكتب في البث...', live_cc_wait: 'الرسائل الأصلية...',
            live_frame_wait_host: 'ستظهر ترجمات المشاهدين هنا...', live_frame_wait_viewer: 'ستظهر ترجمة المضيف هنا...',
            live_mic_title: 'ميكروفون الصوت', live_ai_btn: 'مترجم الذكاء (صوت)', live_stt_btn: 'الصوت إلى نص',
            live_mic_on: 'الميكروفون يعمل', live_ai_on: 'صوت الذكاء يعمل', live_stop: 'إيقاف', live_auto: 'تلقائي',
            live_tap_sound: 'تشغيل الصوت', live_you: 'أنت', live_studio_hint: 'اضغط على الكاميرا لبدء البث أو اختر مضيفاً من القائمة.',
            live_cam_err: 'تم رفض الوصول للكاميرا أو الميكروفون.', live_connecting: 'جاري الاتصال بالبث...', live_ended: 'انتهى البث'
        },
        it: {
            live_nav: 'Diretta', live_title: 'Diretta Live', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Vai in diretta',
            live_stop_cam: 'Termina', live_msg_ph: 'Scrivi in diretta...', live_cc_wait: 'Messaggi originali...',
            live_frame_wait_host: 'Le traduzioni degli spettatori appariranno qui...', live_frame_wait_viewer: 'La traduzione dell’host apparirà qui...',
            live_mic_title: 'Audio-Microfono', live_ai_btn: 'Traduttore IA (Voce)', live_stt_btn: 'Voce in testo',
            live_mic_on: 'MIC ON', live_ai_on: 'VOCE IA ON', live_stop: 'STOP', live_auto: 'Auto (Profilo)',
            live_tap_sound: 'Attiva audio', live_you: 'Tu', live_studio_hint: 'Premi la fotocamera per andare in diretta o scegli un utente LIVE.',
            live_cam_err: 'Accesso a fotocamera/microfono negato.', live_connecting: 'Connessione alla diretta...', live_ended: 'Diretta terminata'
        },
        es: {
            live_nav: 'En vivo', live_title: 'En Vivo', live_btn: 'LIVE', live_off: 'FUERA DE AIRE', live_start_cam: 'Transmitir',
            live_stop_cam: 'Finalizar', live_msg_ph: 'Escribir en vivo...', live_cc_wait: 'Mensajes originales...',
            live_frame_wait_host: 'Traducciones de espectadores aquí...', live_frame_wait_viewer: 'Traducción del anfitrión aquí...',
            live_mic_title: 'Audio-Micrófono', live_ai_btn: 'Traductor IA (Voz)', live_stt_btn: 'Voz a texto',
            live_mic_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR', live_auto: 'Auto (Perfil)',
            live_tap_sound: 'Activar sonido', live_you: 'Tú', live_studio_hint: 'Pulsa la cámara para transmitir o elige un usuario LIVE.',
            live_cam_err: 'Permiso de cámara/micrófono denegado.', live_connecting: 'Conectando al directo...', live_ended: 'Directo finalizado'
        },
        fr: {
            live_nav: 'En direct', live_title: 'En Direct', live_btn: 'LIVE', live_off: 'HORS LIGNE', live_start_cam: 'Lancer le direct',
            live_stop_cam: 'Arrêter', live_msg_ph: 'Écrire dans le direct...', live_cc_wait: 'Messages originaux...',
            live_frame_wait_host: 'Traductions des spectateurs ici...', live_frame_wait_viewer: 'Traduction de l’hôte ici...',
            live_mic_title: 'Audio-Micro', live_ai_btn: 'Traducteur IA (Voix)', live_stt_btn: 'Voix en texte',
            live_mic_on: 'MIC ON', live_ai_on: 'VOIX IA ON', live_stop: 'STOP', live_auto: 'Auto (Profil)',
            live_tap_sound: 'Activer le son', live_you: 'Vous', live_studio_hint: 'Appuyez sur la caméra pour démarrer ou choisissez un LIVE.',
            live_cam_err: 'Accès caméra/micro refusé.', live_connecting: 'Connexion au direct...', live_ended: 'Direct terminé'
        },
        pt: {
            live_nav: 'Ao vivo', live_title: 'Ao Vivo', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Iniciar Live',
            live_stop_cam: 'Encerrar', live_msg_ph: 'Escrever na live...', live_cc_wait: 'Mensagens originais...',
            live_frame_wait_host: 'Traduções dos espectadores aqui...', live_frame_wait_viewer: 'Tradução do apresentador aqui...',
            live_mic_title: 'Áudio-Microfone', live_ai_btn: 'Tradutor IA (Voz)', live_stt_btn: 'Voz para texto',
            live_mic_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR', live_auto: 'Auto (Perfil)',
            live_tap_sound: 'Ativar som', live_you: 'Você', live_studio_hint: 'Toque na câmera para iniciar ou escolha alguém LIVE.',
            live_cam_err: 'Acesso à câmera/microfone negado.', live_connecting: 'Conectando à live...', live_ended: 'Live encerrada'
        },
        ja: {
            live_nav: 'ライブ', live_title: 'ライブ配信', live_btn: 'LIVE', live_off: 'オフライン', live_start_cam: '配信開始',
            live_stop_cam: '終了', live_msg_ph: 'ライブに送信...', live_cc_wait: 'オリジナル音声・メッセージ...',
            live_frame_wait_host: '視聴者の翻訳がここに表示されます...', live_frame_wait_viewer: '配信者の翻訳がここに表示されます...',
            live_mic_title: 'オーディオマイク', live_ai_btn: 'AI翻訳（音声）', live_stt_btn: '音声をテキストに',
            live_mic_on: 'マイクON', live_ai_on: 'AI音声ON', live_stop: '停止', live_auto: '自動',
            live_tap_sound: '音声をオン', live_you: 'あなた', live_studio_hint: 'カメラを押して配信開始、または左のLIVEを選択してください。',
            live_cam_err: 'カメラ/マイクへのアクセスが拒否されました。', live_connecting: '配信に接続中...', live_ended: '配信終了'
        },
        zh: {
            live_nav: '直播', live_title: '直播', live_btn: 'LIVE', live_off: '未开播', live_start_cam: '开始直播',
            live_stop_cam: '结束直播', live_msg_ph: '发送消息到直播...', live_cc_wait: '实时原文...',
            live_frame_wait_host: '观众翻译将显示在此处...', live_frame_wait_viewer: '主播翻译将显示在此处...',
            live_mic_title: '音频麦克风', live_ai_btn: 'AI翻译（语音）', live_stt_btn: '语音转文字',
            live_mic_on: '麦克风开', live_ai_on: 'AI语音开', live_stop: '停止', live_auto: '自动',
            live_tap_sound: '开启声音', live_you: '我', live_studio_hint: '点击摄像头开始直播，或在左侧选择正在直播的主播。',
            live_cam_err: '摄像头或麦克风权限被拒绝。', live_connecting: '正在连接直播...', live_ended: '直播已结束'
        }
    };

    const LIVE_EMOJIS = ['😀','😂','🔥','❤️','👏','👍','🎉','😍','🙏','🤝','😎','😮','💯','🌍','🎤','🎬'];
    const ICE_CONFIG = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const LR = {
        isOpen: false,
        mounted: false,
        lastUiLang: '',

        // Роли и эфир
        isBroadcasting: false,
        currentHostId: null,
        facingMode: 'user',
        localStream: null,
        remoteStream: null,
        liveHostsMap: {},
        viewersCount: 0,

        // WebRTC (изолированный пул соединений)
        hostPeers: {},
        hostSigRef: null,
        hostSigListener: null,
        viewerPc: null,
        viewerSigRef: null,
        viewerOfferListener: null,
        viewerIceListener: null,

        // Firebase слушатели
        hostsListBound: false,
        feedRef: null,
        feedListener: null,
        viewersRef: null,
        viewersListener: null,
        myViewerRef: null,
        seenKeys: new Set(),

        // Очереди бегущих строк (верхняя CC и внутренняя с переводом)
        ccQueue: [],
        ccRunning: false,
        ccAnim: null,
        frameQueue: [],
        frameRunning: false,
        frameAnim: null,

        // Изолированный двойной микрофон
        micActive: false,
        micMode: null, // 'text' | 'ai'
        aiSpeaking: false,
        recognition: null,
        restartTimer: null,
        silenceTimer: null,
        watchdog: null,
        pendingInterim: '',
        lastSentNorm: '',
        lastSentAt: 0,
        recBase: 'en',
        isManualMic: false
    };

    window.HF_LIVE_ROOM = LR;
    localStorage.removeItem('hf_live_mic_lang');

    // ============================================================
    // 1. ХЕЛПЕРЫ ЯЗЫКА, HTML И ПРОФИЛЯ
    // ============================================================
    function getMyId() {
        const id = window.myProfileInfo && window.myProfileInfo.id;
        return (id && id !== 'guest') ? String(id) : '';
    }

    function esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normLang(code) {
        if (!code || code === 'auto' || code === 'un') return null;
        const c = String(code).trim().toLowerCase().split(/[-_]/)[0].substring(0, 2);
        const fix = { kz: 'kk', cn: 'zh', jp: 'ja', ae: 'ar', us: 'en', gb: 'en', uk: 'en' };
        return fix[c] || c;
    }

    function getUiLang() {
        let code = window.appLang || localStorage.getItem('hf_app_lang') || navigator.language || 'en';
        if (code === 'auto') {
            code = (typeof window.getSmartLang === 'function' && window.myProfileInfo)
                ? window.getSmartLang(window.myProfileInfo)
                : ((window.myProfileInfo && window.myProfileInfo.langCode) || navigator.language || 'en');
        }
        const c = normLang(code) || 'en';
        return LIVE_I18N[c] ? c : 'en';
    }

    function t(key) {
        const l = getUiLang();
        return (LIVE_I18N[l] && LIVE_I18N[l][key]) || LIVE_I18N.en[key] || key;
    }

    function mergeLiveI18n() {
        window.i18n = window.i18n || {};
        Object.keys(LIVE_I18N).forEach(lang => {
            window.i18n[lang] = Object.assign({}, window.i18n[lang] || {}, {
                nav_live_stream: LIVE_I18N[lang].live_nav
            });
        });
        if (window.i18n.kk) {
            window.i18n.kz = Object.assign({}, window.i18n.kz || {}, {
                nav_live_stream: LIVE_I18N.kk.live_nav
            });
        }
    }

    function getLangLabel(code) {
        const c = normLang(code);
        if (!c) return '';
        const ui = getUiLang();
        if (typeof window.getLocalizedLangName === 'function') {
            return window.getLocalizedLangName(c, ui);
        }
        try {
            if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
                const dn = new Intl.DisplayNames([ui], { type: 'language' });
                const lbl = dn.of(c);
                if (lbl) return lbl.charAt(0).toUpperCase() + lbl.slice(1);
            }
        } catch (e) {}
        return (LIVE_LANG_MAP[c] && LIVE_LANG_MAP[c].name) || c.toUpperCase();
    }

    function getMyNativeLang() {
        if (typeof window.getSmartLang === 'function' && window.myProfileInfo) {
            return normLang(window.getSmartLang(window.myProfileInfo)) || 'en';
        }
        return normLang(window.myProfileInfo && window.myProfileInfo.langCode) || 'en';
    }

    function getMyNativeFlag() {
        if (window.myProfileInfo && window.myProfileInfo.flag && window.myProfileInfo.flag !== '🌐') {
            return window.myProfileInfo.flag;
        }
        const l = getMyNativeLang();
        return (LIVE_LANG_MAP[l] && LIVE_LANG_MAP[l].flag) || '🇬🇧';
    }

    function getMyLiveMicFlag() {
        const manual = normLang(localStorage.getItem('hf_live_mic_lang'));
        return (manual && LIVE_LANG_MAP[manual]) ? LIVE_LANG_MAP[manual].flag : getMyNativeFlag();
    }

    function isHostRole() {
        const myId = getMyId();
        return Boolean(myId && LR.currentHostId && String(LR.currentHostId) === myId);
    }

    async function translateText(text, targetLang) {
        const clean = String(text || '').trim();
        const tl = normLang(targetLang);
        if (!clean || !tl) return clean;
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&q=${encodeURIComponent(clean)}`);
            const data = await res.json();
            if (data && Array.isArray(data[0])) {
                return data[0].map(s => (s && s[0]) ? s[0] : '').join('').trim() || clean;
            }
        } catch (e) {}
        return clean;
    }

    // ============================================================
    // 2. СТИЛИ МОДУЛЯ (ИЗОЛИРОВАННЫЕ #hf-live-*)
    // ============================================================
    function injectStyles() {
        if (document.getElementById('hf-live-styles')) return;
        const st = document.createElement('style');
        st.id = 'hf-live-styles';
        st.textContent = `
            #hf-live-room-page {
                display: none;
                position: absolute;
                inset: 0;
                z-index: 68;
                background: #0b141a;
                color: #e9edef;
                flex-direction: column;
                overflow: hidden;
            }
            #hf-live-room-page.active { display: flex; }

            /* Подсветка нижней видеоиконки, когда открыт Живой эфир */
            .hf-live-nav-active,
            .hf-live-nav-active i,
            .hf-live-nav-active span {
                color: #00a884 !important;
            }
            .hf-live-nav-dimmed,
            .hf-live-nav-dimmed i,
            .hf-live-nav-dimmed span {
                color: #8696a0 !important;
            }
            .hf-live-nav-dot {
                position: absolute; top: 4px; right: 12px;
                width: 7px; height: 7px; border-radius: 50%;
                background: #ef4444; box-shadow: 0 0 6px #ef4444;
                animation: hfLivePulse 1.2s infinite;
                pointer-events: none;
            }
            @keyframes hfLivePulse {
                0% { transform: scale(0.8); opacity: 0.55; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.8); opacity: 0.55; }
            }

            /* Верхняя бегущая строка CC (оригиналы) */
            .hf-live-cc-bar {
                display: flex; align-items: center; gap: 7px;
                background: #111b21; border-bottom: 1px solid #202c33;
                padding: 6px 10px; flex-shrink: 0; overflow: hidden;
            }
            #hf-live-cc-viewport {
                flex: 1; overflow: hidden; white-space: nowrap; position: relative; height: 20px;
                display: flex; align-items: center;
            }
            #hf-live-cc-track {
                display: inline-block; white-space: nowrap; will-change: transform;
                font-size: 0.78rem; color: #e9edef; font-weight: 600;
            }

            /* Левая боковая панель пользователей */
            #hf-live-sidebar {
                width: 64px; flex-shrink: 0; background: #0d171d;
                border-right: 1px solid #202c33; overflow-y: auto;
                display: flex; flex-direction: column; align-items: center;
                gap: 10px; padding: 10px 4px;
            }
            #hf-live-sidebar::-webkit-scrollbar { display: none; }

            /* Видеофрейм + внутренняя бегущая строка перевода */
            #hf-live-video-wrap {
                position: relative; flex: 1; min-height: 0;
                margin: 8px 8px 6px 8px;
                border-radius: 18px; overflow: hidden;
                background: radial-gradient(circle at 50% 40%, #15252e 0%, #091116 100%);
                border: 1.5px solid #202c33;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
            }
            #hf-live-video-wrap.is-live {
                border-color: rgba(239, 68, 68, 0.75);
                box-shadow: 0 0 22px rgba(239, 68, 68, 0.22);
            }
            #hf-live-video {
                width: 100%; height: 100%; object-fit: cover; background: #060b0e;
                display: block;
            }
            #hf-live-frame-ticker {
                position: absolute; left: 0; right: 0; bottom: 0; z-index: 12;
                background: linear-gradient(180deg, rgba(6,11,14,0) 0%, rgba(6,11,14,0.88) 38%, rgba(6,11,14,0.96) 100%);
                padding: 16px 10px 10px 10px;
                display: flex; align-items: center; gap: 6px;
            }
            #hf-live-frame-viewport {
                flex: 1; overflow: hidden; white-space: nowrap; position: relative; height: 24px;
                display: flex; align-items: center;
            }
            #hf-live-frame-track {
                display: inline-block; white-space: nowrap; will-change: transform;
                font-size: 0.9rem; font-weight: 800; color: #facc15;
                text-shadow: 0 1px 4px rgba(0,0,0,0.95);
            }

            /* Капсула активного микрофона / ИИ-голоса */
            #hf-live-mic-pill {
                display: none; align-items: center; gap: 8px;
                width: calc(100% - 16px); margin: 0 auto 6px auto;
                padding: 6px 10px; background: #0b141a;
                border: 1.5px solid #ef4444; border-radius: 999px;
                box-shadow: 0 0 18px rgba(239, 68, 68, 0.35);
                flex-shrink: 0; box-sizing: border-box;
            }
            #hf-live-mic-pill.active { display: flex; }
            #hf-live-mic-pill.mode-ai {
                border-color: #00a884;
                box-shadow: 0 0 20px rgba(0, 168, 132, 0.45);
            }
            #hf-live-mic-dot {
                width: 9px; height: 9px; border-radius: 50%;
                background: #ef4444; flex-shrink: 0;
                animation: hfLivePulse 1s infinite;
            }
            #hf-live-mic-pill.mode-ai #hf-live-mic-dot { background: #00a884; }

            /* Выпадающая карточка двойного микрофона */
            #hf-live-mic-card {
                display: none; position: absolute; right: 10px; bottom: 60px; z-index: 85;
                width: 256px; background: #0b141a; border: 1.5px solid #00a884;
                border-radius: 16px; padding: 12px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.8);
                flex-direction: column; gap: 9px;
            }
            #hf-live-mic-card.active { display: flex; }

            #hf-live-emoji-tray {
                display: none; position: absolute; left: 10px; right: 10px; bottom: 58px; z-index: 84;
                background: #111b21; border: 1px solid #2a3942; border-radius: 14px;
                padding: 8px; box-shadow: 0 10px 26px rgba(0,0,0,0.65);
                flex-wrap: wrap; gap: 6px; justify-content: center;
            }
            #hf-live-emoji-tray.active { display: flex; }
        `;
        document.head.appendChild(st);
    }

    // ============================================================
    // 3. ПРИВЯЗКА И ПЕРЕИМЕНОВАНИЕ НИЖНЕЙ ВИДЕОИКОНКИ (ОТДЕЛЬНО ОТ ЗВОНКОВ)
    // ============================================================
    function getBottomLiveNavBtns() {
        const list = [];
        document.querySelectorAll('[onclick*="switchTab(1)"], [data-hf-live-nav="1"]').forEach(el => {
            // Пропускаем кнопки внутри модалок/звонков — берём только навигацию
            if (el.closest('#hf-live-room-page') || el.closest('#incoming-call-modal') || el.closest('#avatar-modal')) return;
            list.push(el);
        });
        return list;
    }

    function syncLiveNavButton() {
        const btns = getBottomLiveNavBtns();
        const label = t('live_nav');
        const anyLive = Object.values(LR.liveHostsMap || {}).some(h => h && h.online);

        btns.forEach(btn => {
            btn.dataset.hfLiveNav = '1';
            btn.style.position = btn.style.position || 'relative';
            btn.title = t('live_title');

            const spans = btn.querySelectorAll('span');
            if (spans.length > 0) {
                const lblSpan = spans[spans.length - 1];
                lblSpan.setAttribute('data-i18n', 'nav_live_stream');
                lblSpan.textContent = label;
            }

            // Красная точка на иконке, когда кто-то в прямом эфире
            let dot = btn.querySelector('.hf-live-nav-dot');
            if (anyLive && !dot) {
                dot = document.createElement('span');
                dot.className = 'hf-live-nav-dot';
                btn.appendChild(dot);
            } else if (!anyLive && dot) {
                dot.remove();
            }
        });
    }

    function setBottomNavLiveHighlight(active) {
        const btns = getBottomLiveNavBtns();
        btns.forEach(liveBtn => {
            const navBar = liveBtn.parentElement;
            if (!navBar) return;
            Array.from(navBar.children).forEach(child => {
                if (child === liveBtn) {
                    child.classList.toggle('hf-live-nav-active', active);
                    child.classList.remove('hf-live-nav-dimmed');
                } else {
                    child.classList.remove('hf-live-nav-active');
                    // Кнопку «+» не трогаем
                    const txt = (child.textContent || '').trim();
                    if (txt !== '+' && !child.querySelector('.fa-plus')) {
                        child.classList.toggle('hf-live-nav-dimmed', active);
                    }
                }
            });
        });
    }

    // ============================================================
    // 4. ОЧЕРЕДИ МЕДЛЕННЫХ БЕГУЩИХ СТРОК (ВЕРХНЯЯ CC И ВНУТРИ ФРЕЙМА)
    // ============================================================
    function resetTicker(kind) {
        if (kind === 'cc') {
            LR.ccQueue = [];
            LR.ccRunning = false;
            if (LR.ccAnim) { try { LR.ccAnim.cancel(); } catch (e) {} LR.ccAnim = null; }
            const tr = document.getElementById('hf-live-cc-track');
            if (tr) { tr.style.transform = 'translateX(0)'; tr.textContent = t('live_cc_wait'); }
        } else {
            LR.frameQueue = [];
            LR.frameRunning = false;
            if (LR.frameAnim) { try { LR.frameAnim.cancel(); } catch (e) {} LR.frameAnim = null; }
            const tr = document.getElementById('hf-live-frame-track');
            const qBadge = document.getElementById('hf-live-q-badge');
            if (qBadge) qBadge.classList.add('hidden');
            if (tr) {
                tr.style.transform = 'translateX(0)';
                tr.textContent = isHostRole() ? t('live_frame_wait_host') : t('live_frame_wait_viewer');
            }
        }
    }

    function updateQueueBadge() {
        const badge = document.getElementById('hf-live-q-badge');
        if (!badge) return;
        const left = LR.frameQueue.length;
        if (left > 0) {
            badge.textContent = `+${left}`;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    function enqueueCcOriginal(flag, name, text) {
        const clean = String(text || '').trim();
        if (!clean) return;
        LR.ccQueue.push({ flag: flag || '🌐', name: name || 'User', text: clean });
        if (LR.ccQueue.length > 20) LR.ccQueue.shift();
        if (!LR.ccRunning) runNextCcItem();
    }

    function runNextCcItem() {
        const vp = document.getElementById('hf-live-cc-viewport');
        const tr = document.getElementById('hf-live-cc-track');
        if (!vp || !tr || !LR.ccQueue.length) {
            LR.ccRunning = false;
            return;
        }
        LR.ccRunning = true;
        const item = LR.ccQueue.shift();
        tr.innerHTML = `<span class="text-[#00a884] mr-1.5">${esc(item.flag)} ${esc(item.name)}:</span><span class="text-white">${esc(item.text)}</span>`;

        const vpW = vp.clientWidth || 260;
        const trW = tr.scrollWidth || 160;
        const durationMs = Math.max(5500, Math.min(24000, Math.round(((vpW + trW) / 56) * 1000)));

        if (LR.ccAnim) { try { LR.ccAnim.cancel(); } catch (e) {} }
        if (typeof tr.animate === 'function') {
            LR.ccAnim = tr.animate(
                [{ transform: `translateX(${vpW}px)` }, { transform: `translateX(-${trW + 24}px)` }],
                { duration: durationMs, easing: 'linear', fill: 'forwards' }
            );
            LR.ccAnim.onfinish = () => {
                LR.ccAnim = null;
                if (LR.ccQueue.length > 0) runNextCcItem();
                else {
                    LR.ccRunning = false;
                    tr.style.transform = 'translateX(0)';
                }
            };
        } else {
            tr.style.transform = 'translateX(0)';
            setTimeout(() => { LR.ccRunning = false; runNextCcItem(); }, 5000);
        }
    }

    function enqueueFrameTranslation(flag, name, translatedText) {
        const clean = String(translatedText || '').trim();
        if (!clean) return;
        LR.frameQueue.push({ flag: flag || '🌐', name: name || 'User', text: clean });
        if (LR.frameQueue.length > 25) LR.frameQueue.shift();
        updateQueueBadge();
        if (!LR.frameRunning) runNextFrameItem();
    }

    function runNextFrameItem() {
        const vp = document.getElementById('hf-live-frame-viewport');
        const tr = document.getElementById('hf-live-frame-track');
        if (!vp || !tr || !LR.frameQueue.length) {
            LR.frameRunning = false;
            updateQueueBadge();
            return;
        }
        LR.frameRunning = true;
        const item = LR.frameQueue.shift();
        updateQueueBadge();

        tr.innerHTML = `<span class="text-white mr-1.5">${esc(item.flag)} ${esc(item.name)}:</span><span class="text-yellow-300">${esc(item.text)}</span>`;

        const vpW = vp.clientWidth || 260;
        const trW = tr.scrollWidth || 180;
        const durationMs = Math.max(6800, Math.min(30000, Math.round(((vpW + trW) / 46) * 1000)));

        if (LR.frameAnim) { try { LR.frameAnim.cancel(); } catch (e) {} }
        if (typeof tr.animate === 'function') {
            LR.frameAnim = tr.animate(
                [{ transform: `translateX(${vpW}px)` }, { transform: `translateX(-${trW + 28}px)` }],
                { duration: durationMs, easing: 'linear', fill: 'forwards' }
            );
            LR.frameAnim.onfinish = () => {
                LR.frameAnim = null;
                if (LR.frameQueue.length > 0) runNextFrameItem();
                else {
                    LR.frameRunning = false;
                    tr.style.transform = 'translateX(0)';
                }
            };
        } else {
            tr.style.transform = 'translateX(0)';
            setTimeout(() => { LR.frameRunning =
