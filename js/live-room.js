// ============================================================
// ИЗОЛИРОВАННЫЙ МОДУЛЬ «ЖИВОЙ ЭФИР» (js/live-room.js)
// - Полностью отделён от 1-на-1 звонков с аватара (#voice-translator),
//   конференции (#conference), Глобального чата и Сообществ
// - Свои ветки Firebase:
//     live_stream_hosts/<hostId>
//     live_stream_viewers/<hostId>/<viewerId>
//     live_stream_feed/<hostId>
//     live_stream_signals/<hostId>/<viewerId>
// - Левая боковая панель пользователей (ведущие с LIVE наверху)
// - Один видеофрейм + WebRTC-трансляция + камера и двойной микрофон под ним
// - Без баблов:
//     * Верхняя строка CC — оригиналы речи/сообщений
//     * Строка внутри видеофрейма — медленная очередь переводов (~48px/s):
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
            live_title: 'Live Stream', live_btn: 'LIVE', live_off: 'OFF AIR', live_start_cam: 'Go Live',
            live_stop_cam: 'End Live', live_msg_ph: 'Message to live...', live_cc_wait: 'Live original stream...',
            live_frame_wait_host: 'Viewer translations will appear here...', live_frame_wait_viewer: 'Host translation will appear here...',
            live_mic_title: 'Audio-Microphone', live_ai_btn: 'AI Translator (Voice)', live_stt_btn: 'Speech to Text',
            live_mic_on: 'MIC ON', live_ai_on: 'AI VOICE ON', live_stop: 'STOP', live_auto: 'Auto (Profile)',
            live_tap_sound: 'Tap for sound', live_you: 'You', live_studio_hint: 'Press camera to start your Live Stream, or pick a LIVE user on the left.',
            live_cam_err: 'Camera/microphone access denied.', live_connecting: 'Connecting to live stream...', live_ended: 'Broadcast ended'
        },
        ru: {
            live_title: 'Живой эфир', live_btn: 'LIVE', live_off: 'НЕ В ЭФИРЕ', live_start_cam: 'В эфир',
            live_stop_cam: 'Завершить', live_msg_ph: 'Написать в эфир...', live_cc_wait: 'Оригиналы речи и сообщений...',
            live_frame_wait_host: 'Здесь появятся переводы зрителей...', live_frame_wait_viewer: 'Здесь появится перевод ведущего...',
            live_mic_title: 'Аудио-микрофон', live_ai_btn: 'ИИ-переводчик (Голос)', live_stt_btn: 'Голос в текст',
            live_mic_on: 'МИК ВКЛ', live_ai_on: 'ИИ-ГОЛОС ВКЛ', live_stop: 'СТОП', live_auto: 'Авто (Профиль)',
            live_tap_sound: 'Включить звук', live_you: 'Вы', live_studio_hint: 'Нажмите камеру, чтобы выйти в Живой эфир, или выберите ведущего LIVE слева.',
            live_cam_err: 'Нет доступа к камере или микрофону.', live_connecting: 'Подключение к эфиру...', live_ended: 'Эфир завершён'
        },
        kk: {
            live_title: 'Тікелей эфир', live_btn: 'LIVE', live_off: 'ЭФИРДЕ ЕМЕС', live_start_cam: 'Эфирге шығу',
            live_stop_cam: 'Аяқтау', live_msg_ph: 'Эфирге жазу...', live_cc_wait: 'Түпнұсқа сөздер мен хабарламалар...',
            live_frame_wait_host: 'Көрермендердің аудармалары осында...', live_frame_wait_viewer: 'Жүргізушінің аудармасы осында...',
            live_mic_title: 'Аудио-микрофон', live_ai_btn: 'ЖИ-аудармашы (Дауыс)', live_stt_btn: 'Дауысты мәтінге',
            live_mic_on: 'МИК ҚОСУЛЫ', live_ai_on: 'ЖИ-ДАУЫС ҚОСУЛЫ', live_stop: 'ТОҚТА', live_auto: 'Авто (Профиль)',
            live_tap_sound: 'Дыбысты қосу', live_you: 'Сіз', live_studio_hint: 'Тікелей эфирді бастау үшін камераны басыңыз немесе сол жақтан LIVE таңдаңыз.',
            live_cam_err: 'Камера немесе микрофонға рұқсат жоқ.', live_connecting: 'Эфирге қосылуда...', live_ended: 'Эфир аяқталды'
        },
        az: {
            live_title: 'Canlı Efir', live_btn: 'LIVE', live_off: 'OFİRLƏNMƏYİB', live_start_cam: 'Canlıya çıx',
            live_stop_cam: 'Bitir', live_msg_ph: 'Efirə yaz...', live_cc_wait: 'Orijinal nitq və mesajlar...',
            live_frame_wait_host: 'İzləyicilərin tərcümələri burada...', live_frame_wait_viewer: 'Aparıcının tərcüməsi burada...',
            live_mic_title: 'Audio-Mikrofon', live_ai_btn: 'AI Tərcüməçi (Səs)', live_stt_btn: 'Səsdən mətnə',
            live_mic_on: 'MİK AÇIQ', live_ai_on: 'AI-SƏS AÇIQ', live_stop: 'DAYAN', live_auto: 'Avto (Profil)',
            live_tap_sound: 'Səsi aç', live_you: 'Siz', live_studio_hint: 'Canlı yayım üçün kameranı açın və ya soldan LIVE seçin.',
            live_cam_err: 'Kamera və ya mikrofona icazə yoxdur.', live_connecting: 'Yayıma qoşulur...', live_ended: 'Yayım bitdi'
        },
        tr: {
            live_title: 'Canlı Yayın', live_btn: 'LIVE', live_off: 'YAYIN DIŞI', live_start_cam: 'Yayına Başla',
            live_stop_cam: 'Bitir', live_msg_ph: 'Yayına yaz...', live_cc_wait: 'Orijinal konuşma ve mesajlar...',
            live_frame_wait_host: 'İzleyici çevirileri burada görünecek...', live_frame_wait_viewer: 'Yayıncı çevirisi burada görünecek...',
            live_mic_title: 'Ses Mikrofonu', live_ai_btn: 'AI Çevirmen (Ses)', live_stt_btn: 'Sesten Metne',
            live_mic_on: 'MİK AÇIK', live_ai_on: 'AI-SES AÇIK', live_stop: 'DUR', live_auto: 'Oto (Profil)',
            live_tap_sound: 'Sesi aç', live_you: 'Sen', live_studio_hint: 'Canlı yayın için kameraya basın veya soldan LIVE seçin.',
            live_cam_err: 'Kamera/mikrofon izni verilmedi.', live_connecting: 'Yayına bağlanıyor...', live_ended: 'Yayın sona erdi'
        },
        de: {
            live_title: 'Live-Stream', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Live gehen',
            live_stop_cam: 'Beenden', live_msg_ph: 'In den Live-Stream schreiben...', live_cc_wait: 'Originale Sprache & Nachrichten...',
            live_frame_wait_host: 'Übersetzungen der Zuschauer erscheinen hier...', live_frame_wait_viewer: 'Übersetzung des Hosts erscheint hier...',
            live_mic_title: 'Audio-Mikrofon', live_ai_btn: 'KI-Übersetzer (Stimme)', live_stt_btn: 'Sprache zu Text',
            live_mic_on: 'MIK AN', live_ai_on: 'KI-STIMME AN', live_stop: 'STOPP', live_auto: 'Auto (Profil)',
            live_tap_sound: 'Ton einschalten', live_you: 'Du', live_studio_hint: 'Kamera drücken für eigenen Stream oder links LIVE wählen.',
            live_cam_err: 'Kamera-/Mikrofonzugriff verweigert.', live_connecting: 'Verbinde zum Stream...', live_ended: 'Stream beendet'
        },
        ar: {
            live_title: 'بث مباشر', live_btn: 'LIVE', live_off: 'غير متصل', live_start_cam: 'بدء البث',
            live_stop_cam: 'إنهاء', live_msg_ph: 'اكتب في البث...', live_cc_wait: 'الرسائل الأصلية...',
            live_frame_wait_host: 'ستظهر ترجمات المشاهدين هنا...', live_frame_wait_viewer: 'ستظهر ترجمة المضيف هنا...',
            live_mic_title: 'ميكروفون الصوت', live_ai_btn: 'مترجم الذكاء (صوت)', live_stt_btn: 'الصوت إلى نص',
            live_mic_on: 'الميكروفون يعمل', live_ai_on: 'صوت الذكاء يعمل', live_stop: 'إيقاف', live_auto: 'تلقائي',
            live_tap_sound: 'تشغيل الصوت', live_you: 'أنت', live_studio_hint: 'اضغط على الكاميرا لبدء البث أو اختر مضيفاً من القائمة.',
            live_cam_err: 'تم رفض الوصول للكاميرا أو الميكروفون.', live_connecting: 'جاري الاتصال بالبث...', live_ended: 'انتهى البث'
        },
        it: {
            live_title: 'Diretta Live', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Vai in diretta',
            live_stop_cam: 'Termina', live_msg_ph: 'Scrivi in diretta...', live_cc_wait: 'Messaggi originali...',
            live_frame_wait_host: 'Le traduzioni degli spettatori appariranno qui...', live_frame_wait_viewer: 'La traduzione dell’host apparirà qui...',
            live_mic_title: 'Audio-Microfono', live_ai_btn: 'Traduttore IA (Voce)', live_stt_btn: 'Voce in testo',
            live_mic_on: 'MIC ON', live_ai_on: 'VOCE IA ON', live_stop: 'STOP', live_auto: 'Auto (Profilo)',
            live_tap_sound: 'Attiva audio', live_you: 'Tu', live_studio_hint: 'Premi la fotocamera per andare in diretta o scegli un utente LIVE.',
            live_cam_err: 'Accesso a fotocamera/microfono negato.', live_connecting: 'Connessione alla diretta...', live_ended: 'Diretta terminata'
        },
        es: {
            live_title: 'En Vivo', live_btn: 'LIVE', live_off: 'FUERA DE AIRE', live_start_cam: 'Transmitir',
            live_stop_cam: 'Finalizar', live_msg_ph: 'Escribir en vivo...', live_cc_wait: 'Mensajes originales...',
            live_frame_wait_host: 'Traducciones de espectadores aquí...', live_frame_wait_viewer: 'Traducción del anfitrión aquí...',
            live_mic_title: 'Audio-Micrófono', live_ai_btn: 'Traductor IA (Voz)', live_stt_btn: 'Voz a texto',
            live_mic_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR', live_auto: 'Auto (Perfil)',
            live_tap_sound: 'Activar sonido', live_you: 'Tú', live_studio_hint: 'Pulsa la cámara para transmitir o elige un usuario LIVE.',
            live_cam_err: 'Permiso de cámara/micrófono denegado.', live_connecting: 'Conectando al directo...', live_ended: 'Directo finalizado'
        },
        fr: {
            live_title: 'En Direct', live_btn: 'LIVE', live_off: 'HORS LIGNE', live_start_cam: 'Lancer le direct',
            live_stop_cam: 'Arrêter', live_msg_ph: 'Écrire dans le direct...', live_cc_wait: 'Messages originaux...',
            live_frame_wait_host: 'Traductions des spectateurs ici...', live_frame_wait_viewer: 'Traduction de l’hôte ici...',
            live_mic_title: 'Audio-Micro', live_ai_btn: 'Traducteur IA (Voix)', live_stt_btn: 'Voix en texte',
            live_mic_on: 'MIC ON', live_ai_on: 'VOIX IA ON', live_stop: 'STOP', live_auto: 'Auto (Profil)',
            live_tap_sound: 'Activer le son', live_you: 'Vous', live_studio_hint: 'Appuyez sur la caméra pour démarrer ou choisissez un LIVE.',
            live_cam_err: 'Accès caméra/micro refusé.', live_connecting: 'Connexion au direct...', live_ended: 'Direct terminé'
        },
        pt: {
            live_title: 'Ao Vivo', live_btn: 'LIVE', live_off: 'OFFLINE', live_start_cam: 'Iniciar Live',
            live_stop_cam: 'Encerrar', live_msg_ph: 'Escrever na live...', live_cc_wait: 'Mensagens originais...',
            live_frame_wait_host: 'Traduções dos espectadores aqui...', live_frame_wait_viewer: 'Tradução do apresentador aqui...',
            live_mic_title: 'Áudio-Microfone', live_ai_btn: 'Tradutor IA (Voz)', live_stt_btn: 'Voz para texto',
            live_mic_on: 'MIC ON', live_ai_on: 'VOZ IA ON', live_stop: 'PARAR', live_auto: 'Auto (Perfil)',
            live_tap_sound: 'Ativar som', live_you: 'Você', live_studio_hint: 'Toque na câmera para iniciar ou escolha alguém LIVE.',
            live_cam_err: 'Acesso à câmera/microfone negado.', live_connecting: 'Conectando à live...', live_ended: 'Live encerrada'
        },
        ja: {
            live_title: 'ライブ配信', live_btn: 'LIVE', live_off: 'オフライン', live_start_cam: '配信開始',
            live_stop_cam: '終了', live_msg_ph: 'ライブに送信...', live_cc_wait: 'オリジナル音声・メッセージ...',
            live_frame_wait_host: '視聴者の翻訳がここに表示されます...', live_frame_wait_viewer: '配信者の翻訳がここに表示されます...',
            live_mic_title: 'オーディオマイク', live_ai_btn: 'AI翻訳（音声）', live_stt_btn: '音声をテキストに',
            live_mic_on: 'マイクON', live_ai_on: 'AI音声ON', live_stop: '停止', live_auto: '自動',
            live_tap_sound: '音声をオン', live_you: 'あなた', live_studio_hint: 'カメラを押して配信開始、または左のLIVEを選択してください。',
            live_cam_err: 'カメラ/マイクへのアクセスが拒否されました。', live_connecting: '配信に接続中...', live_ended: '配信終了'
        },
        zh: {
            live_title: '直播', live_btn: 'LIVE', live_off: '未开播', live_start_cam: '开始直播',
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
        currentHostId: null, // ID канала эфира (свой ID = студия/ведущий, чужой ID = просмотр)
        facingMode: 'user',
        localStream: null,
        remoteStream: null,
        liveHostsMap: {},
        viewersCount: 0,

        // WebRTC (полностью изолированный пул соединений)
        hostPeers: {},     // { viewerId: { pc, sigRef, iceListener, ansListener } }
        hostSigRef: null,
        hostSigListener: null,
        viewerPc: null,
        viewerSigRef: null,
        viewerOfferListener: null,
        viewerIceListener: null,

        // Firebase слушатели комнаты эфира
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

        // Изолированный двойной микрофон (Голос в текст / ИИ-Голос)
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
        if (code === 'auto') code = (window.myProfileInfo && window.myProfileInfo.langCode) || navigator.language || 'en';
        const c = normLang(code) || 'en';
        return LIVE_I18N[c] ? c : 'en';
    }

    function t(key) {
        const l = getUiLang();
        return (LIVE_I18N[l] && LIVE_I18N[l][key]) || LIVE_I18N.en[key] || key;
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

            #hf-live-header-btn {
                display: inline-flex; align-items: center; gap: 5px;
                padding: 4px 10px; border-radius: 999px;
                background: rgba(239, 68, 68, 0.16);
                border: 1px solid rgba(239, 68, 68, 0.7);
                color: #fff; font-size: 0.7rem; font-weight: 800;
                cursor: pointer; transition: 0.2s; margin-right: 6px;
            }
            #hf-live-header-btn:hover { background: rgba(239, 68, 68, 0.35); }
            #hf-live-header-btn .hf-live-dot {
                width: 7px; height: 7px; border-radius: 50%;
                background: #ef4444; animation: hfLivePulse 1.2s infinite;
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

            /* Левая боковая панель пользователей (как в Глобальном чате) */
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

            /* Капсула активного микрофона / ИИ-голоса (в стиле звонка) */
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
    // 3. ОЧЕРЕДИ МЕДЛЕННЫХ БЕГУЩИХ СТРОК (ВЕРХНЯЯ CC И ВНУТРИ ФРЕЙМА)
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
        // Комфортная скорость ~56 px/сек
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
        // Спокойная, легко читаемая скорость ~46 px/сек
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
            setTimeout(() => { LR.frameRunning = false; runNextFrameItem(); }, 6000);
        }
    }

    // ============================================================
    // 4. МОНТИРОВАНИЕ ЭКРАНА И КНОПКИ ВХОДА В ШАПКЕ
    // ============================================================
    function mountHeaderTriggerButton() {
        if (document.getElementById('hf-live-header-btn')) {
            const lbl = document.getElementById('hf-live-header-lbl');
            if (lbl) lbl.textContent = t('live_title');
            return;
        }
        // Находим верхнюю шапку с "Hello Friends" или иконкой лупы/три точки
        const searchBtn = document.querySelector('header button, .app-header button, #search-btn, [onclick*="Search"], [onclick*="Dropdown"]');
        const headerBar = searchBtn ? searchBtn.parentElement : null;
        if (!headerBar) return;

        const btn = document.createElement('button');
        btn.id = 'hf-live-header-btn';
        btn.type = 'button';
        btn.innerHTML = `<span class="hf-live-dot"></span><span id="hf-live-header-lbl">${esc(t('live_title'))}</span>`;
        btn.onclick = (e) => {
            e.stopPropagation();
            if (LR.isOpen) window.closeLiveRoom();
            else window.openLiveRoom();
        };
        headerBar.insertBefore(btn, headerBar.firstChild);
    }

    function ensureLiveContainer() {
        injectStyles();
        let page = document.getElementById('hf-live-room-page');
        if (!page) {
            page = document.createElement('div');
            page.id = 'hf-live-room-page';
            const sibling = document.getElementById('communities-page')
                || document.getElementById('voice-translator')
                || document.getElementById('chat-page');
            const hostParent = (sibling && sibling.parentElement) ? sibling.parentElement : document.body;
            if (hostParent !== document.body) {
                const cs = window.getComputedStyle(hostParent);
                if (cs.position === 'static') hostParent.style.position = 'relative';
            }
            hostParent.appendChild(page);
        }
        return page;
    }

    function buildMicOptionsHtml() {
        const cur = localStorage.getItem('hf_live_mic_lang') || 'auto';
        let html = `<option value="auto" ${cur === 'auto' ? 'selected' : ''}>${getMyNativeFlag()} ${esc(t('live_auto'))}</option>`;
        Object.keys(LIVE_LANG_MAP).forEach(code => {
            const it = LIVE_LANG_MAP[code];
            html += `<option value="${code}" ${cur === code ? 'selected' : ''}>${it.flag} ${esc(getLangLabel(code))}</option>`;
        });
        return html;
    }

    function renderLiveLayout() {
        const page = ensureLiveContainer();
        LR.mounted = true;

        page.innerHTML = `
            <div class="flex items-center justify-between px-3 py-2 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <button type="button" onclick="window.closeLiveRoom()" class="w-8 h-8 rounded-full bg-[#202c33] text-white flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                    <span class="text-sm font-extrabold text-white truncate">${esc(t('live_title'))}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span id="hf-live-viewers-chip" class="px-2.5 py-1 rounded-full bg-[#202c33] border border-[#2a3942] text-[0.7rem] font-bold text-[#e9edef]">
                        👁 0
                    </span>
                </div>
            </div>

            <div class="hf-live-cc-bar">
                <span class="px-1.5 py-0.5 rounded bg-[#00a884] text-[#111b21] text-[0.62rem] font-extrabold shrink-0">CC</span>
                <div id="hf-live-cc-viewport">
                    <div id="hf-live-cc-track">${esc(t('live_cc_wait'))}</div>
                </div>
            </div>

            <div class="flex flex-1 min-h-0 overflow-hidden relative">
                <div id="hf-live-sidebar"></div>

                <div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
                    <div id="hf-live-video-wrap">
                        <video id="hf-live-video" autoplay playsinline webkit-playsinline></video>

                        <div id="hf-live-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-5 text-center gap-3 z-10">
                            <div class="w-16 h-16 rounded-full bg-[#202c33] border-2 border-[#2a3942] flex items-center justify-center text-2xl text-[#00a884]">
                                <i class="fa-solid fa-video"></i>
                            </div>
                            <div id="hf-live-placeholder-txt" class="text-xs text-[#8696a0] max-w-[220px] leading-relaxed">
                                ${esc(t('live_studio_hint'))}
                            </div>
                        </div>

                        <div class="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                            <div id="hf-live-host-badge" class="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-sm border border-white/15">
                                <span id="hf-live-status-pill" class="px-1.5 py-0.5 rounded bg-[#2a3942] text-[0.6rem] font-extrabold text-[#aebac1]">${esc(t('live_off'))}</span>
                                <span id="hf-live-host-name" class="text-xs font-bold text-white truncate max-w-[130px]"></span>
                            </div>
                            <div class="pointer-events-auto flex items-center gap-1.5">
                                <button id="hf-live-unmute-btn" type="button" onclick="window.unmuteLiveVideo()" class="hidden px-2.5 py-1 rounded-full bg-[#00a884] text-[#111b21] text-[0.68rem] font-extrabold shadow">
                                    🔊 ${esc(t('live_tap_sound'))}
                                </button>
                                <button id="hf-live-flip-btn" type="button" onclick="window.flipLiveCamera()" class="hidden w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center">
                                    <i class="fa-solid fa-camera-rotate text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <div id="hf-live-frame-ticker">
                            <span id="hf-live-q-badge" class="hidden px-1.5 py-0.5 rounded-full bg-yellow-400 text-[#111b21] text-[0.6rem] font-extrabold shrink-0"></span>
                            <div id="hf-live-frame-viewport">
                                <div id="hf-live-frame-track">${esc(isHostRole() ? t('live_frame_wait_host') : t('live_frame_wait_viewer'))}</div>
                            </div>
                        </div>
                    </div>

                    <div id="hf-live-mic-pill">
                        <span id="hf-live-mic-dot"></span>
                        <span id="hf-live-mic-flag" class="text-sm shrink-0">🌐</span>
                        <span id="hf-live-mic-text" class="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-xs font-bold text-white"></span>
                        <button type="button" onclick="window.stopLiveMic(false)" class="bg-red-500 text-white rounded-full px-3 py-1 text-[0.7rem] font-extrabold shrink-0">${esc(t('live_stop'))}</button>
                    </div>

                    <div class="flex items-center justify-center gap-5 py-2 px-3 bg-[#0b141a] shrink-0">
                        <button id="hf-live-cam-btn" type="button" onclick="window.toggleLiveBroadcast()" class="w-12 h-12 rounded-full bg-[#202c33] border-2 border-[#2a3942] text-white flex items-center justify-center text-lg shadow-lg transition hover:border-[#00a884]" title="${esc(t('live_start_cam'))}">
                            <i class="fa-solid fa-video"></i>
                        </button>
                        <button id="hf-live-mic-main-btn" type="button" onclick="window.onLiveMicBtnClick()" class="w-12 h-12 rounded-full bg-[#202c33] border-2 border-[#00a884] text-[#00a884] flex items-center justify-center text-lg shadow-lg transition" title="${esc(t('live_mic_title'))}">
                            <i class="fa-solid fa-microphone"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div id="hf-live-mic-card">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-bold text-[#00a884] flex items-center gap-1.5">
                        <i class="fa-solid fa-microphone"></i> ${esc(t('live_mic_title'))}
                    </div>
                    <button type="button" onclick="window.closeLiveMicCard()" class="text-[#8696a0] hover:text-white text-sm px-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <select id="hf-live-mic-lang-select" onchange="window.onLiveMicLangChange(this.value)" class="w-full bg-[#1f2c34] border border-[#2a3942] rounded-xl px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-[#00a884]">
                    ${buildMicOptionsHtml()}
                </select>
                <button type="button" onclick="window.startLiveMicMode('ai')" class="w-full py-2.5 px-3 rounded-xl bg-[#0d3b2e] border border-[#00a884] text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#114b3b] transition">
                    <i class="fa-solid fa-robot text-[#00a884]"></i> ${esc(t('live_ai_btn'))}
                </button>
                <button type="button" onclick="window.startLiveMicMode('text')" class="w-full py-2.5 px-3 rounded-xl bg-[#202c33] border border-[#2a3942] text-white text-xs font-bold flex items-center justify-center gap-2 hover:border-[#00a884] transition">
                    <i class="fa-solid fa-microphone text-[#00a884]"></i> ${esc(t('live_stt_btn'))}
                </button>
            </div>

            <div id="hf-live-emoji-tray">
                ${LIVE_EMOJIS.map(em => `<button type="button" onclick="window.insertLiveEmoji('${em}')" class="text-lg hover:scale-125 transition p-1">${em}</button>`).join('')}
            </div>

            <div class="flex items-center gap-1.5 px-2.5 py-2 bg-[#111b21] border-t border-[#202c33] shrink-0">
                <div class="flex-1 flex items-center bg-[#202c33] border border-[#2a3942] focus-within:border-[#00a884] rounded-full px-3 py-1.5 gap-2 min-w-0">
                    <button type="button" onclick="window.toggleLiveEmoji()" class="text-[#8696a0] hover:text-yellow-400 shrink-0">
                        <i class="fa-regular fa-face-smile text-base"></i>
                    </button>
                    <input id="hf-live-input" type="text" placeholder="${esc(t('live_msg_ph'))}" class="flex-1 min-w-0 bg-transparent text-sm text-white outline-none">
                    <button type="button" onclick="window.clearLiveTickers()" class="text-[#8696a0] hover:text-red-400 shrink-0" title="Clear">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
                <button type="button" onclick="window.sendLiveTextMsg()" class="w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </div>
        `;

        const inp = document.getElementById('hf-live-input');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendLiveTextMsg();
                }
            });
        }

        renderLiveSidebar();
        syncBroadcastUI();
    }

    // ============================================================
    // 5. БОКОВАЯ ПАНЕЛЬ ПОЛЬЗОВАТЕЛЕЙ (LIVE ПОДНИМАЮТСЯ НАВЕРХ)
    // ============================================================
    function renderLiveSidebar() {
        const sb = document.getElementById('hf-live-sidebar');
        if (!sb) return;

        const myId = getMyId() || 'guest';
        const myName = (window.myUsername || t('live_you')).split(' ')[0];
        const myPhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=Me';
        const myFlag = getMyNativeFlag();
        const mySelected = String(LR.currentHostId) === String(myId);

        let html = `
            <div onclick="window.selectLiveChannel('${esc(myId)}')" class="flex flex-col items-center gap-0.5 cursor-pointer w-full">
                <div class="relative">
                    <img src="${esc(myPhoto)}" class="w-11 h-11 rounded-full object-cover border-2 ${LR.isBroadcasting ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]' : (mySelected ? 'border-[#00a884]' : 'border-[#2a3942]')}">
                    <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none">${esc(myFlag)}</span>
                    ${LR.isBroadcasting ? `<span class="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded bg-red-600 text-[0.52rem] font-extrabold text-white tracking-wider">LIVE</span>` : ''}
                </div>
                <span class="text-[0.62rem] font-bold ${mySelected ? 'text-[#00a884]' : 'text-[#aebac1]'} truncate max-w-[56px] text-center">${esc(myName)}</span>
            </div>
        `;

        const others = (window.participants || []).filter(p => p && p.id && p.id !== 'ai' && String(p.id) !== String(myId));
        // Также добавим ведущих из liveHostsMap, если их нет в participants
        const seenOther = new Set(others.map(p => String(p.id)));
        Object.keys(LR.liveHostsMap || {}).forEach(hid => {
            if (hid !== myId && !seenOther.has(hid) && LR.liveHostsMap[hid] && LR.liveHostsMap[hid].online) {
                const h = LR.liveHostsMap[hid];
                others.push({ id: hid, name: h.name || 'Host', photo: h.photo, flag: h.flag || '🌐' });
            }
        });

        // Сортировка: кто сейчас LIVE — строго наверх!
        others.sort((a, b) => {
            const aLive = Boolean(LR.liveHostsMap[String(a.id)] && LR.liveHostsMap[String(a.id)].online);
            const bLive = Boolean(LR.liveHostsMap[String(b.id)] && LR.liveHostsMap[String(b.id)].online);
            if (aLive !== bLive) return aLive ? -1 : 1;
            return 0;
        });

        others.forEach(p => {
            const pid = String(p.id);
            const isLive = Boolean(LR.liveHostsMap[pid] && LR.liveHostsMap[pid].online);
            const isSel = String(LR.currentHostId) === pid;
            const ring = isLive
                ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.65)]'
                : (isSel ? 'border-[#00a884]' : 'border-[#2a3942] opacity-70');
            html += `
                <div onclick="window.selectLiveChannel('${esc(pid)}')" class="flex flex-col items-center gap-0.5 cursor-pointer w-full">
                    <div class="relative">
                        <img src="${esc(p.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-11 h-11 rounded-full object-cover border-2 ${ring}">
                        <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none">${esc(p.flag || '🌐')}</span>
                        ${isLive ? `<span class="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded bg-red-600 text-[0.52rem] font-extrabold text-white tracking-wider">LIVE</span>` : ''}
                    </div>
                    <span class="text-[0.62rem] ${isSel ? 'text-[#00a884] font-bold' : 'text-[#aebac1]'} truncate max-w-[56px] text-center">${esc((p.name || 'User').split(' ')[0])}</span>
                </div>
            `;
        });

        sb.innerHTML = html;
    }

    function syncBroadcastUI() {
        const wrap = document.getElementById('hf-live-video-wrap');
        const camBtn = document.getElementById('hf-live-cam-btn');
        const flipBtn = document.getElementById('hf-live-flip-btn');
        const pill = document.getElementById('hf-live-status-pill');
        const hostNameEl = document.getElementById('hf-live-host-name');
        const ph = document.getElementById('hf-live-placeholder');
        const phTxt = document.getElementById('hf-live-placeholder-txt');
        const vChip = document.getElementById('hf-live-viewers-chip');

        const hostId = LR.currentHostId;
        const isHost = isHostRole();
        const hostInfo = hostId ? LR.liveHostsMap[String(hostId)] : null;
        const channelLive = isHost ? LR.isBroadcasting : Boolean(hostInfo && hostInfo.online);

        if (vChip) vChip.textContent = `👁 ${LR.viewersCount || 0}`;
        if (wrap) wrap.classList.toggle('is-live', channelLive);

        if (pill) {
            pill.textContent = channelLive ? t('live_btn') : t('live_off');
            pill.className = channelLive
                ? 'px-1.5 py-0.5 rounded bg-red-600 text-[0.6rem] font-extrabold text-white'
                : 'px-1.5 py-0.5 rounded bg-[#2a3942] text-[0.6rem] font-extrabold text-[#aebac1]';
        }

        if (hostNameEl) {
            if (isHost) {
                hostNameEl.textContent = `${getMyNativeFlag()} ${(window.myUsername || t('live_you')).split(' ')[0]}`;
            } else {
                const p = (window.participants || []).find(x => String(x.id) === String(hostId));
                const nm = (hostInfo && hostInfo.name) || (p && p.name) || 'Host';
                const fl = (hostInfo && hostInfo.flag) || (p && p.flag) || '🌐';
                hostNameEl.textContent = `${fl} ${nm.split(' ')[0]}`;
            }
        }

        if (camBtn) {
            if (LR.isBroadcasting) {
                camBtn.className = 'w-12 h-12 rounded-full bg-red-600 border-2 border-red-400 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/40 transition';
                camBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i>';
                camBtn.title = t('live_stop_cam');
            } else {
                camBtn.className = 'w-12 h-12 rounded-full bg-[#202c33] border-2 border-[#2a3942] text-white flex items-center justify-center text-lg shadow-lg transition hover:border-[#00a884]';
                camBtn.innerHTML = '<i class="fa-solid fa-video"></i>';
                camBtn.title = t('live_start_cam');
            }
        }

        if (flipBtn) flipBtn.classList.toggle('hidden', !LR.isBroadcasting);

        const video = document.getElementById('hf-live-video');
        const hasVideoStream = Boolean(video && video.srcObject);
        if (ph) ph.classList.toggle('hidden', hasVideoStream);
        if (phTxt) {
            phTxt.textContent = isHost
                ? t('live_studio_hint')
                : (channelLive ? t('live_connecting') : t('live_ended'));
        }
    }

    // ============================================================
    // 6. WEBRTC: ВИДЕОТРАНСЛЯЦИЯ (ВЕДУЩИЙ -> ЗРИТЕЛИ) БЕЗ КОНФЛИКТА СО ЗВОНКАМИ
    // ============================================================
    function closeAllHostPeers() {
        Object.keys(LR.hostPeers).forEach(vid => {
            const p = LR.hostPeers[vid];
            try { if (p.ansRef && p.ansListener) p.ansRef.off('value', p.ansListener); } catch (e) {}
            try { if (p.iceRef && p.iceListener) p.iceRef.off('child_added', p.iceListener); } catch (e) {}
            try { if (p.pc) p.pc.close(); } catch (e) {}
        });
        LR.hostPeers = {};
        if (LR.hostSigRef && LR.hostSigListener) {
            LR.hostSigRef.off('child_added', LR.hostSigListener);
            LR.hostSigListener = null;
        }
    }

    function closeViewerPeer() {
        if (LR.viewerSigRef && LR.viewerOfferListener) {
            LR.viewerSigRef.child('offer').off('value', LR.viewerOfferListener);
            LR.viewerOfferListener = null;
        }
        if (LR.viewerSigRef && LR.viewerIceListener) {
            LR.viewerSigRef.child('hostIce').off('child_added', LR.viewerIceListener);
            LR.viewerIceListener = null;
        }
        if (LR.viewerSigRef) {
            LR.viewerSigRef.remove().catch(() => {});
            LR.viewerSigRef = null;
        }
        if (LR.viewerPc) {
            try { LR.viewerPc.close(); } catch (e) {}
            LR.viewerPc = null;
        }
        LR.remoteStream = null;
        const video = document.getElementById('hf-live-video');
        if (video && !LR.isBroadcasting) video.srcObject = null;
        document.getElementById('hf-live-unmute-btn')?.classList.add('hidden');
    }

    window.unmuteLiveVideo = function () {
        const video = document.getElementById('hf-live-video');
        if (video) {
            video.muted = false;
            video.play().catch(() => {});
        }
        document.getElementById('hf-live-unmute-btn')?.classList.add('hidden');
    };

    async function hostHandleViewerJoin(hostId, viewerId) {
        if (!LR.isBroadcasting || !LR.localStream || typeof firebase === 'undefined') return;
        const db = firebase.database();

        if (LR.hostPeers[viewerId]) {
            try { LR.hostPeers[viewerId].pc.close(); } catch (e) {}
        }

        const pc = new RTCPeerConnection(ICE_CONFIG);
        LR.localStream.getTracks().forEach(track => pc.addTrack(track, LR.localStream));

        const sigBase = db.ref(`live_stream_signals/${hostId}/${viewerId}`);
        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                sigBase.child('hostIce').push(ev.candidate.toJSON()).catch(() => {});
            }
        };

        const ansRef = sigBase.child('answer');
        const ansListener = ansRef.on('value', async (snap) => {
            const ans = snap.val();
            if (ans && !pc.currentRemoteDescription) {
                try { await pc.setRemoteDescription(new RTCSessionDescription(ans)); } catch (e) {}
            }
        });

        const iceRef = sigBase.child('viewerIce');
        const iceListener = iceRef.on('child_added', async (snap) => {
            const cand = snap.val();
            if (cand) {
                try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
        });

        LR.hostPeers[viewerId] = { pc, ansRef, ansListener, iceRef, iceListener };

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sigBase.child('offer').set({ type: offer.type, sdp: offer.sdp });
        } catch (e) {}
    }

    function viewerConnectToHost(hostId) {
        closeViewerPeer();
        const myId = getMyId();
        if (!myId || !hostId || String(hostId) === myId || typeof firebase === 'undefined') return;
        const hostInfo = LR.liveHostsMap[String(hostId)];
        if (!hostInfo || !hostInfo.online) return;

        const db = firebase.database();
        const sigBase = db.ref(`live_stream_signals/${hostId}/${myId}`);
        LR.viewerSigRef = sigBase;

        const pc = new RTCPeerConnection(ICE_CONFIG);
        LR.viewerPc = pc;

        pc.ontrack = (ev) => {
            const stream = (ev.streams && ev.streams[0]) || new MediaStream([ev.track]);
            LR.remoteStream = stream;
            const video = document.getElementById('hf-live-video');
            if (video) {
                video.srcObject = stream;
                video.muted = false;
                video.play().catch(() => {
                    video.muted = true;
                    video.play().catch(() => {});
                    document.getElementById('hf-live-unmute-btn')?.classList.remove('hidden');
                });
            }
            syncBroadcastUI();
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                sigBase.child('viewerIce').push(ev.candidate.toJSON()).catch(() => {});
            }
        };

        // Сначала очищаем старый сигнал и шлём запрос на подключение
        sigBase.set({ joinAt: Date.now(), viewerId: myId }).then(() => {
            try { sigBase.onDisconnect().remove(); } catch (e) {}

            LR.viewerOfferListener = sigBase.child('offer').on('value', async (snap) => {
                const offer = snap.val();
                if (!offer || pc.currentRemoteDescription) return;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await sigBase.child('answer').set({ type: answer.type, sdp: answer.sdp });
                } catch (e) {}
            });

            LR.viewerIceListener = sigBase.child('hostIce').on('child_added', async (snap) => {
                const cand = snap.val();
                if (cand) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
                }
            });
        }).catch(() => {});
    }

    window.toggleLiveBroadcast = async function () {
        if (LR.isBroadcasting) {
            window.stopLiveBroadcast();
            return;
        }
        const myId = getMyId();
        if (!myId) return;

        // Переключаемся на свой канал, если смотрели чужой
        if (String(LR.currentHostId) !== myId) {
            window.selectLiveChannel(myId);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: LR.facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
                audio: true
            });
            LR.localStream = stream;
            LR.isBroadcasting = true;

            const video = document.getElementById('hf-live-video');
            if (video) {
                video.srcObject = stream;
                video.muted = true; // Себя не эхом
                video.play().catch(() => {});
            }

            if (typeof firebase !== 'undefined' && firebase.database) {
                const db = firebase.database();
                const hostRef = db.ref('live_stream_hosts/' + myId);
                await hostRef.set({
                    hostId: myId,
                    name: (window.myUsername || 'Host').split(' ')[0],
                    photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=H',
                    flag: getMyNativeFlag(),
                    langCode: getMyNativeLang(),
                    online: true,
                    startedAt: firebase.database.ServerValue.TIMESTAMP
                });
                try { hostRef.onDisconnect().remove(); } catch (e) {}

                await db.ref('live_stream_signals/' + myId).remove().catch(() => {});
                LR.hostSigRef = db.ref('live_stream_signals/' + myId);
                LR.hostSigListener = LR.hostSigRef.on('child_added', (snap) => {
                    const viewerId = snap.key;
                    if (viewerId && viewerId !== myId) {
                        hostHandleViewerJoin(myId, viewerId);
                    }
                });
                try { LR.hostSigRef.onDisconnect().remove(); } catch (e) {}
            }

            renderLiveSidebar();
            syncBroadcastUI();
        } catch (err) {
            if (window.showToast) window.showToast(t('live_title'), t('live_cam_err'), '', '');
            else alert(t('live_cam_err'));
        }
    };

    window.stopLiveBroadcast = function () {
        const myId = getMyId();
        LR.isBroadcasting = false;
        closeAllHostPeers();

        if (LR.localStream) {
            LR.localStream.getTracks().forEach(tr => tr.stop());
            LR.localStream = null;
        }
        const video = document.getElementById('hf-live-video');
        if (video) video.srcObject = null;

        if (myId && typeof firebase !== 'undefined' && firebase.database) {
            firebase.database().ref('live_stream_hosts/' + myId).remove().catch(() => {});
            firebase.database().ref('live_stream_signals/' + myId).remove().catch(() => {});
        }

        renderLiveSidebar();
        syncBroadcastUI();
    };

    window.flipLiveCamera = async function () {
        if (!LR.isBroadcasting || !LR.localStream) return;
        LR.facingMode = (LR.facingMode === 'user') ? 'environment' : 'user';
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: LR.facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
                audio: false
            });
            const newTrack = newStream.getVideoTracks()[0];
            if (!newTrack) return;

            const oldTrack = LR.localStream.getVideoTracks()[0];
            if (oldTrack) {
                LR.localStream.removeTrack(oldTrack);
                oldTrack.stop();
            }
            LR.localStream.addTrack(newTrack);

            // Подменяем видеотрек всем подключённым зрителям без разрыва связи
            Object.values(LR.hostPeers).forEach(p => {
                if (!p || !p.pc) return;
                const sender = p.pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(newTrack).catch(() => {});
            });

            const video = document.getElementById('hf-live-video');
            if (video) video.srcObject = LR.localStream;
        } catch (e) {}
    };

    // ============================================================
    // 7. ПЕРЕКЛЮЧЕНИЕ КАНАЛОВ, ВВОД И РОЛЕВОЙ ПЕРЕВОД СООБЩЕНИЙ
    // ============================================================
    function detachChannelListeners() {
        if (LR.feedRef && LR.feedListener) {
            LR.feedRef.off('child_added', LR.feedListener);
            LR.feedListener = null;
        }
        if (LR.viewersRef && LR.viewersListener) {
            LR.viewersRef.off('value', LR.viewersListener);
            LR.viewersListener = null;
        }
        if (LR.myViewerRef) {
            LR.myViewerRef.remove().catch(() => {});
            LR.myViewerRef = null;
        }
        closeViewerPeer();
    }

    window.selectLiveChannel = function (hostId) {
        if (!hostId) return;
        const myId = getMyId() || 'guest';
        const targetId = String(hostId);

        // Если вели эфир и уходим смотреть другого — завершаем свой эфир
        if (LR.isBroadcasting && targetId !== myId) {
            window.stopLiveBroadcast();
        }

        detachChannelListeners();
        LR.currentHostId = targetId;
        LR.seenKeys.clear();
        LR.viewersCount = 0;

        resetTicker('cc');
        resetTicker('frame');
        renderLiveSidebar();
        syncBroadcastUI();

        if (typeof firebase === 'undefined' || !firebase.database) return;
        const db = firebase.database();

        // Присутствие зрителя в этом эфире
        if (myId !== 'guest' && targetId !== myId) {
            LR.myViewerRef = db.ref(`live_stream_viewers/${targetId}/${myId}`);
            LR.myViewerRef.set({ joinedAt: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
            try { LR.myViewerRef.onDisconnect().remove(); } catch (e) {}
        }

        LR.viewersRef = db.ref(`live_stream_viewers/${targetId}`);
        LR.viewersListener = LR.viewersRef.on('value', (snap) => {
            const val = snap.val();
            LR.viewersCount = val ? Object.keys(val).length : 0;
            const vChip = document.getElementById('hf-live-viewers-chip');
            if (vChip) vChip.textContent = `👁 ${LR.viewersCount}`;
        });

        // Поток сообщений эфира (только свежие в реальном времени)
        const joinTs = Date.now() - 2500;
        LR.feedRef = db.ref(`live_stream_feed/${targetId}`);
        LR.feedListener = LR.feedRef.limitToLast(15).on('child_added', (snap) => {
            handleIncomingLiveFeed(snap, joinTs);
        });

        if (targetId !== myId) {
            viewerConnectToHost(targetId);
        }
    };

    async function handleIncomingLiveFeed(snap, joinTs) {
        const data = snap.val();
        if (!data || LR.seenKeys.has(snap.key)) return;
        LR.seenKeys.add(snap.key);

        if (data.timestamp && data.timestamp < joinTs) return;

        const myId = getMyId();
        const senderId = String(data.userId || '');
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && senderId === myId);
        const senderName = (data.name || 'User').split(' ')[0];
        const senderFlag = data.flag || '🌐';
        const origText = String(data.originalText || data.text || '').trim();
        if (!origText) return;

        // 1. ВЕРХНЯЯ БЕГУЩАЯ СТРОКА (CC) — оригинал всех участников эфира
        enqueueCcOriginal(senderFlag, senderName, origText);

        // 2. ВНУТРЕННЯЯ СТРОКА В ВИДЕОФРЕЙМЕ — ролевой перевод:
        //    - Ведущий видит переводы всех ЗРИТЕЛЕЙ на свой язык (с их флагом и именем)
        //    - Зритель видит перевод только ВЕДУЩЕГО на свой язык
        const amHost = isHostRole();
        const senderIsHost = String(LR.currentHostId) === senderId || Boolean(data.isHost);

        let shouldTranslateIntoFrame = false;
        if (amHost && !isMe) {
            // Я ведущий -> перевожу в свой фрейм всех зрителей, кто мне пишет/говорит
            shouldTranslateIntoFrame = true;
        } else if (!amHost && senderIsHost && !isMe) {
            // Я зритель -> перевожу в фрейм только слова Ведущего
            shouldTranslateIntoFrame = true;
        }

        if (!shouldTranslateIntoFrame) return;

        const myTargetLang = getMyNativeLang();
        const senderLang = normLang(data.langCode);
        const translated = (senderLang && senderLang === myTargetLang)
            ? origText
            : await translateText(origText, myTargetLang);

        enqueueFrameTranslation(senderFlag, senderName, translated);

        // В режиме ИИ-голоса озвучиваем перевод вслух
        if (LR.micActive && LR.micMode === 'ai' && translated) {
            speakLiveText(translated, myTargetLang);
        }
    }

    function dispatchLiveMessage(rawText, channel) {
        const clean = String(rawText || '').trim();
        const hostId = LR.currentHostId;
        if (!clean || !hostId || typeof firebase === 'undefined' || !firebase.database) return;

        const myId = getMyId() || 'guest';
        const manualMic = (channel === 'mic') ? normLang(localStorage.getItem('hf_live_mic_lang')) : null;
        const activeLang = manualMic || getMyNativeLang();
        const activeFlag = (manualMic && LIVE_LANG_MAP[manualMic]) ? LIVE_LANG_MAP[manualMic].flag : getMyNativeFlag();

        firebase.database().ref(`live_stream_feed/${hostId}`).push({
            userId: myId,
            isHost: isHostRole(),
            name: (window.myUsername || 'User').split(' ')[0],
            flag: activeFlag,
            langCode: activeLang,
            inputChannel: channel,
            originalText: clean,
            text: clean,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
    }

    window.sendLiveTextMsg = function () {
        document.getElementById('hf-live-emoji-tray')?.classList.remove('active');
        const inp = document.getElementById('hf-live-input');
        if (!inp) return;
        const val = inp.value.trim();
        if (!val) return;
        inp.value = '';
        dispatchLiveMessage(val, 'keyboard');
    };

    window.toggleLiveEmoji = function () {
        window.closeLiveMicCard();
        document.getElementById('hf-live-emoji-tray')?.classList.toggle('active');
    };

    window.insertLiveEmoji = function (em) {
        const inp = document.getElementById('hf-live-input');
        if (!inp) return;
        inp.value += em;
        inp.focus();
    };

    window.clearLiveTickers = function () {
        const inp = document.getElementById('hf-live-input');
        if (inp) inp.value = '';
        resetTicker('cc');
        resetTicker('frame');
    };

    // ============================================================
    // 8. ИЗОЛИРОВАННЫЙ ДВОЙНОЙ МИКРОФОН (ГОЛОС В ТЕКСТ + ИИ-ПОМОЩНИК)
    // ============================================================
    function speakLiveText(text, langCode) {
        const clean = String(text || '').trim();
        if (!clean || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(clean);
            const lc = normLang(langCode) || getMyNativeLang();
            utt.lang = (LIVE_LANG_MAP[lc] && LIVE_LANG_MAP[lc].speech) || 'en-US';
            utt.rate = 1.02;
            utt.onstart = () => {
                LR.aiSpeaking = true;
                if (LR.micActive && LR.recognition) {
                    try { LR.recognition.abort(); } catch (e) {}
                }
            };
            utt.onend = utt.onerror = () => {
                LR.aiSpeaking = false;
                if (LR.micActive && LR.isOpen) resetLiveRecognition(150);
            };
            window.speechSynthesis.speak(utt);
        } catch (e) {}
    }

    function readLiveMicLang() {
        const manual = normLang(localStorage.getItem('hf_live_mic_lang'));
        LR.isManualMic = Boolean(manual);
        LR.recBase = LR.isManualMic ? manual : getMyNativeLang();
    }

    function updateLiveMicPill(preview = '') {
        const pill = document.getElementById('hf-live-mic-pill');
        const btn = document.getElementById('hf-live-mic-main-btn');
        if (btn) {
            btn.className = LR.micActive
                ? (LR.micMode === 'ai'
                    ? 'w-12 h-12 rounded-full bg-[#00a884] border-2 border-emerald-300 text-[#111b21] flex items-center justify-center text-lg shadow-lg shadow-[#00a884]/40 transition'
                    : 'w-12 h-12 rounded-full bg-red-600 border-2 border-red-400 text-white flex items-center justify-center text-lg shadow-lg shadow-red-600/40 transition')
                : 'w-12 h-12 rounded-full bg-[#202c33] border-2 border-[#00a884] text-[#00a884] flex items-center justify-center text-lg shadow-lg transition';
        }
        if (!pill) return;
        if (!LR.micActive) {
            pill.classList.remove('active', 'mode-ai');
            return;
        }
        pill.classList.toggle('mode-ai', LR.micMode === 'ai');
        const fl = document.getElementById('hf-live-mic-flag');
        const tx = document.getElementById('hf-live-mic-text');
        if (fl) fl.textContent = getMyLiveMicFlag();
        if (tx) {
            tx.textContent = preview || (LR.micMode === 'ai' ? t('live_ai_on') : t('live_mic_on'));
            tx.scrollLeft = tx.scrollWidth;
        }
        pill.classList.add('active');
    }

    window.onLiveMicBtnClick = function () {
        document.getElementById('hf-live-emoji-tray')?.classList.remove('active');
        if (LR.micActive) {
            window.stopLiveMic(false);
            return;
        }
        const card = document.getElementById('hf-live-mic-card');
        if (!card) return;
        const sel = document.getElementById('hf-live-mic-lang-select');
        if (sel) sel.innerHTML = buildMicOptionsHtml();
        card.classList.toggle('active');
    };

    window.closeLiveMicCard = function () {
        document.getElementById('hf-live-mic-card')?.classList.remove('active');
    };

    window.onLiveMicLangChange = function (val) {
        if (!val || val === 'auto') localStorage.removeItem('hf_live_mic_lang');
        else localStorage.setItem('hf_live_mic_lang', val);
        readLiveMicLang();
    };

    window.startLiveMicMode = function (mode) {
        window.closeLiveMicCard();
        LR.micMode = (mode === 'ai') ? 'ai' : 'text';
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return alert('Speech recognition is not supported.');

        // Глушим чужие микрофоны экосистемы, чтобы не конфликтовали
        if (typeof window.stopGlobalUnlimitedMic === 'function') window.stopGlobalUnlimitedMic(true);
        if (typeof window.stopPrivateUnlimitedMic === 'function') window.stopPrivateUnlimitedMic(true);
        if (typeof window.stopCommMic === 'function') window.stopCommMic(true);

        readLiveMicLang();
        LR.micActive = true;
        updateLiveMicPill('');
        launchLiveRecognition();

        clearInterval(LR.watchdog);
        LR.watchdog = setInterval(() => {
            if (!LR.micActive) return;
            if (!LR.isOpen) return window.stopLiveMic(true);
            if (!LR.recognition && !LR.restartTimer && !LR.aiSpeaking) launchLiveRecognition();
        }, 2000);
    };

    function dispatchLiveVoice(text) {
        const clean = String(text || '').trim();
        const norm = clean.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
        if (!norm) return;
        const now = Date.now();
        if (norm === LR.lastSentNorm && (now - LR.lastSentAt) < 2200) return;
        LR.lastSentNorm = norm;
        LR.lastSentAt = now;
        dispatchLiveMessage(clean, 'mic');
    }

    function resetLiveRecognition(delay = 100) {
        clearTimeout(LR.silenceTimer); LR.silenceTimer = null; LR.pendingInterim = '';
        if (LR.recognition) {
            try { LR.recognition.onresult = LR.recognition.onend = LR.recognition.onerror = null; LR.recognition.abort(); } catch (e) {}
            LR.recognition = null;
        }
        if (LR.micActive && LR.isOpen && !LR.aiSpeaking) {
            clearTimeout(LR.restartTimer);
            LR.restartTimer = setTimeout(() => { LR.restartTimer = null; launchLiveRecognition(); }, delay);
        }
    }

    function flushLiveInterim() {
        clearTimeout(LR.silenceTimer); LR.silenceTimer = null;
        const phrase = LR.pendingInterim.trim();
        LR.pendingInterim = '';
        updateLiveMicPill('');
        if (!phrase) return;
        dispatchLiveVoice(phrase);
        resetLiveRecognition(80);
    }

    function launchLiveRecognition() {
        if (!LR.micActive || !LR.isOpen || LR.aiSpeaking) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        readLiveMicLang();
        try {
            const rec = new SpeechRec();
            rec.lang = (LIVE_LANG_MAP[LR.recBase] && LIVE_LANG_MAP[LR.recBase].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (e) => {
                if (!LR.micActive || LR.aiSpeaking) return;
                let fin = '', inter = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const ch = (e.results[i][0] && e.results[i][0].transcript) || '';
                    if (e.results[i].isFinal) fin += ' ' + ch; else inter += ' ' + ch;
                }
                if (fin.trim()) {
                    clearTimeout(LR.silenceTimer); LR.pendingInterim = ''; updateLiveMicPill('');
                    dispatchLiveVoice(fin.trim());
                    return;
                }
                if (inter.trim()) {
                    LR.pendingInterim = inter.trim();
                    updateLiveMicPill(LR.pendingInterim);
                    clearTimeout(LR.silenceTimer);
                    LR.silenceTimer = setTimeout(flushLiveInterim, LR.recBase === 'az' ? 1400 : 1000);
                }
            };
            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) return window.stopLiveMic(true);
                if (LR.pendingInterim.trim()) return flushLiveInterim();
                if (LR.micActive && !LR.aiSpeaking) { LR.recognition = null; resetLiveRecognition(220); }
            };
            rec.onend = () => {
                LR.recognition = null;
                if (LR.pendingInterim.trim()) {
                    const tail = LR.pendingInterim.trim();
                    LR.pendingInterim = '';
                    updateLiveMicPill('');
                    dispatchLiveVoice(tail);
                }
                if (LR.micActive && !LR.aiSpeaking) { updateLiveMicPill(''); resetLiveRecognition(80); }
            };
            LR.recognition = rec;
            rec.start();
        } catch (e) {
            LR.recognition = null;
            if (LR.micActive && !LR.aiSpeaking) resetLiveRecognition(300);
        }
    }

    window.stopLiveMic = function (discard = true) {
        const tail = (!discard && LR.pendingInterim) ? LR.pendingInterim.trim() : '';
        LR.micActive = false;
        LR.micMode = null;
        LR.aiSpeaking = false;
        clearTimeout(LR.restartTimer); clearTimeout(LR.silenceTimer); clearInterval(LR.watchdog);
        LR.restartTimer = LR.silenceTimer = LR.watchdog = null; LR.pendingInterim = '';
        if (LR.recognition) {
            try { LR.recognition.onresult = LR.recognition.onend = LR.recognition.onerror = null; LR.recognition.stop(); } catch (e) {}
            LR.recognition = null;
        }
        try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
        if (tail) dispatchLiveVoice(tail);
        localStorage.removeItem('hf_live_mic_lang');
        updateLiveMicPill('');
    };

    // ============================================================
    // 9. ОТКРЫТИЕ, ЗАКРЫТИЕ И СЛУШАТЕЛИ ЭКОСИСТЕМЫ
    // ============================================================
    window.openLiveRoom = function (targetHostId) {
        if (typeof window.stopGlobalUnlimitedMic === 'function') window.stopGlobalUnlimitedMic(true);
        if (typeof window.stopPrivateUnlimitedMic === 'function') window.stopPrivateUnlimitedMic(true);
        if (typeof window.stopCommMic === 'function') window.stopCommMic(true);

        renderLiveLayout();
        const page = document.getElementById('hf-live-room-page');
        if (page) page.classList.add('active');
        LR.isOpen = true;

        const myId = getMyId() || 'guest';
        const activeLiveHost = Object.keys(LR.liveHostsMap || {}).find(id => LR.liveHostsMap[id] && LR.liveHostsMap[id].online && id !== myId);
        const startChannel = targetHostId || LR.currentHostId || activeLiveHost || myId;
        window.selectLiveChannel(startChannel);
    };

    window.closeLiveRoom = function () {
        if (!LR.isOpen) return;
        LR.isOpen = false;
        window.stopLiveMic(true);
        if (LR.isBroadcasting) window.stopLiveBroadcast();
        detachChannelListeners();
        document.getElementById('hf-live-room-page')?.classList.remove('active');
    };

    function bindFirebaseHosts() {
        if (typeof firebase === 'undefined' || !firebase.database) {
            setTimeout(bindFirebaseHosts, 600);
            return;
        }
        if (LR.hostsListBound) return;
        LR.hostsListBound = true;

        firebase.database().ref('live_stream_hosts').on('value', (snap) => {
            const prevOnline = LR.currentHostId && LR.liveHostsMap[LR.currentHostId] && LR.liveHostsMap[LR.currentHostId].online;
            LR.liveHostsMap = snap.val() || {};
            const nowOnline = LR.currentHostId && LR.liveHostsMap[LR.currentHostId] && LR.liveHostsMap[LR.currentHostId].online;

            // Обновляем красную точку на кнопке в шапке
            const btn = document.getElementById('hf-live-header-btn');
            const anyLive = Object.values(LR.liveHostsMap).some(h => h && h.online);
            if (btn) btn.style.borderColor = anyLive ? '#ef4444' : 'rgba(239, 68, 68, 0.55)';

            if (LR.isOpen) {
                renderLiveSidebar();
                syncBroadcastUI();
                // Если ведущий только что вышел в эфир, пока мы открыли его канал — подключаемся к видео
                if (!isHostRole() && !prevOnline && nowOnline) {
                    viewerConnectToHost(LR.currentHostId);
                }
                if (!isHostRole() && prevOnline && !nowOnline) {
                    closeViewerPeer();
                    syncBroadcastUI();
                }
            }
        });
    }

    function bootLiveRoom() {
        injectStyles();
        mountHeaderTriggerButton();
        bindFirebaseHosts();

        LR.lastUiLang = getUiLang();
        const refreshLang = () => {
            const cur = getUiLang();
            if (cur === LR.lastUiLang) return;
            LR.lastUiLang = cur;
            mountHeaderTriggerButton();
            if (LR.isOpen) {
                const keepHost = LR.currentHostId;
                const keepStream = LR.isBroadcasting ? LR.localStream : LR.remoteStream;
                renderLiveLayout();
                const video = document.getElementById('hf-live-video');
                if (video && keepStream) {
                    video.srcObject = keepStream;
                    video.muted = LR.isBroadcasting;
                    video.play().catch(() => {});
                }
                LR.currentHostId = keepHost;
                renderLiveSidebar();
                syncBroadcastUI();
            }
        };

        document.addEventListener('hf:lang-changed', () => setTimeout(refreshLang, 40));
        document.getElementById('app-lang-select')?.addEventListener('change', () => setTimeout(refreshLang, 80));
        setInterval(() => {
            mountHeaderTriggerButton();
            if (getUiLang() !== LR.lastUiLang) refreshLang();
        }, 1200);

        // При переключении нижней вкладки или старте 1-на-1 звонка с аватара — аккуратно закрываем Живой эфир
        document.addEventListener('hf:tab-changed', () => {
            if (LR.isOpen) window.closeLiveRoom();
        });
        document.addEventListener('click', (e) => {
            if (!LR.isOpen) return;
            const navBtn = e.target && e.target.closest && e.target.closest('[onclick*="switchTab("]');
            if (navBtn) window.closeLiveRoom();
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootLiveRoom);
    } else {
        bootLiveRoom();
    }
})();
