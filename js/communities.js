// ============================================================
// ЭТАП 2: ИЗОЛИРОВАННЫЙ МИР СООБЩЕСТВ (js/communities.js) — FIXED
// - Монтируется строго в #communities-page (индекс 7)
// - Префикс комнат: club_ (совместим с window.isPublicClubRoom)
// - Отдельные ветки Firebase:
//     communities_meta/<roomId>
//     communities_messages/<roomId>
//     communities_active_langs/<roomId>/<uid>
//     communities_invites/<targetUid>
// - Не затрагивает звонки, Agora и конференции
// ============================================================

(function () {
    'use strict';

    const COMM_LANG_MAP = {
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

    const COMM_I18N = {
        en: {
            comm_title: 'Communities', comm_open: 'Open', comm_private: 'Private', comm_create: '+ Create',
            comm_new_title: 'New Community', comm_name_ph: 'Community name...', comm_desc_ph: 'Short description (1-2 lines)...',
            comm_rules_ph: 'Room rules (respect, no spam...)...', comm_type_open: 'Open (for everyone)', comm_type_priv: 'Private (invite only)',
            comm_btn_create: 'Create Room', comm_btn_cancel: 'Cancel', comm_rules_btn: 'Rules', comm_invite_btn: 'Invite',
            comm_msg_ph: 'Message to community...', comm_empty_priv: 'No private communities yet. Create one or wait for an invite.',
            comm_invite_title: 'Invite to Community', comm_invite_send: 'Send Invites', comm_invite_banner: 'invites you to community:',
            comm_join: 'Join', comm_later: 'Later', comm_mic_on: 'MIC ON', comm_stop: 'STOP', comm_auto: 'Auto (Profile)',
            comm_lang_kb: 'Community Keyboard Language', comm_lang_mic: 'Community Mic Language', comm_marquee_ready: 'AI Translation Active...'
        },
        ru: {
            comm_title: 'Сообщества', comm_open: 'Открытые', comm_private: 'Приватные', comm_create: '+ Создать',
            comm_new_title: 'Новое сообщество', comm_name_ph: 'Название сообщества...', comm_desc_ph: 'Краткое описание (1–2 строки)...',
            comm_rules_ph: 'Правила комнаты (уважение, без спама...)...', comm_type_open: 'Открытое (для всех)', comm_type_priv: 'Приватное (по приглашению)',
            comm_btn_create: 'Создать комнату', comm_btn_cancel: 'Отмена', comm_rules_btn: 'Правила', comm_invite_btn: 'Пригласить',
            comm_msg_ph: 'Сообщение в сообщество...', comm_empty_priv: 'Приватных сообществ пока нет. Создайте своё или примите приглашение.',
            comm_invite_title: 'Пригласить в сообщество', comm_invite_send: 'Отправить', comm_invite_banner: 'приглашает в сообщество:',
            comm_join: 'Войти', comm_later: 'Позже', comm_mic_on: 'МИК ВКЛ', comm_stop: 'СТОП', comm_auto: 'Авто (Профиль)',
            comm_lang_kb: 'Язык клавиатуры комнаты', comm_lang_mic: 'Язык микрофона комнаты', comm_marquee_ready: 'ИИ-перевод активен...'
        },
        az: {
            comm_title: 'İcmalar', comm_open: 'Açıq', comm_private: 'Şəxsi', comm_create: '+ Yarat',
            comm_new_title: 'Yeni İcma', comm_name_ph: 'İcmanın adı...', comm_desc_ph: 'Qısa təsvir...',
            comm_rules_ph: 'Otaq qaydaları...', comm_type_open: 'Açıq (hamı üçün)', comm_type_priv: 'Şəxsi (dəvətlə)',
            comm_btn_create: 'Otaq Yarat', comm_btn_cancel: 'Ləğv et', comm_rules_btn: 'Qaydalar', comm_invite_btn: 'Dəvət et',
            comm_msg_ph: 'İcmaya mesaj...', comm_empty_priv: 'Hələ şəxsi icma yoxdur.',
            comm_invite_title: 'İcmaya dəvət', comm_invite_send: 'Göndər', comm_invite_banner: 'sizi icmaya dəvət edir:',
            comm_join: 'Qoşul', comm_later: 'Sonra', comm_mic_on: 'MİK AÇIQ', comm_stop: 'DAYAN', comm_auto: 'Avto (Profil)',
            comm_lang_kb: 'Otaq klaviatura dili', comm_lang_mic: 'Otaq mikrofon dili', comm_marquee_ready: 'AI Tərcümə Aktivdir...'
        },
        tr: {
            comm_title: 'Topluluklar', comm_open: 'Açık', comm_private: 'Özel', comm_create: '+ Oluştur',
            comm_new_title: 'Yeni Topluluk', comm_name_ph: 'Topluluk adı...', comm_desc_ph: 'Kısa açıklama...',
            comm_rules_ph: 'Oda kuralları...', comm_type_open: 'Açık (herkese)', comm_type_priv: 'Özel (davetle)',
            comm_btn_create: 'Oda Oluştur', comm_btn_cancel: 'İptal', comm_rules_btn: 'Kurallar', comm_invite_btn: 'Davet Et',
            comm_msg_ph: 'Topluluğa mesaj...', comm_empty_priv: 'Henüz özel topluluk yok.',
            comm_invite_title: 'Topluluğa Davet Et', comm_invite_send: 'Gönder', comm_invite_banner: 'seni topluluğa davet ediyor:',
            comm_join: 'Katıl', comm_later: 'Sonra', comm_mic_on: 'MİK AÇIK', comm_stop: 'DUR', comm_auto: 'Oto (Profil)',
            comm_lang_kb: 'Oda Klavye Dili', comm_lang_mic: 'Oda Mikrofon Dili', comm_marquee_ready: 'AI Çeviri Aktif...'
        },
        kk: {
            comm_title: 'Қауымдастықтар', comm_open: 'Ашық', comm_private: 'Жеке', comm_create: '+ Құру',
            comm_new_title: 'Жаңа қауымдастық', comm_name_ph: 'Атауы...', comm_desc_ph: 'Қысқаша сипаттама...',
            comm_rules_ph: 'Бөлме ережелері...', comm_type_open: 'Ашық (барлығына)', comm_type_priv: 'Жеке (шақырумен)',
            comm_btn_create: 'Бөлме құру', comm_btn_cancel: 'Болдырмау', comm_rules_btn: 'Ережелер', comm_invite_btn: 'Шақыру',
            comm_msg_ph: 'Хабарлама...', comm_empty_priv: 'Жеке қауымдастықтар әлі жоқ.',
            comm_invite_title: 'Қауымдастыққа шақыру', comm_invite_send: 'Жіберу', comm_invite_banner: 'қауымдастыққа шақырады:',
            comm_join: 'Қосылу', comm_later: 'Кейін', comm_mic_on: 'МИК ҚОСУЛЫ', comm_stop: 'ТОҚТА', comm_auto: 'Авто (Профиль)',
            comm_lang_kb: 'Пернетақта тілі', comm_lang_mic: 'Микрофон тілі', comm_marquee_ready: 'AI аударма белсенді...'
        },
        de: {
            comm_title: 'Communities', comm_open: 'Offen', comm_private: 'Privat', comm_create: '+ Erstellen',
            comm_new_title: 'Neue Community', comm_name_ph: 'Name...', comm_desc_ph: 'Kurzbeschreibung...',
            comm_rules_ph: 'Raumregeln...', comm_type_open: 'Offen (für alle)', comm_type_priv: 'Privat (nur Einladung)',
            comm_btn_create: 'Erstellen', comm_btn_cancel: 'Abbrechen', comm_rules_btn: 'Regeln', comm_invite_btn: 'Einladen',
            comm_msg_ph: 'Nachricht...', comm_empty_priv: 'Noch keine privaten Communities.',
            comm_invite_title: 'Einladen', comm_invite_send: 'Senden', comm_invite_banner: 'lädt dich ein:',
            comm_join: 'Beitreten', comm_later: 'Später', comm_mic_on: 'MIK AN', comm_stop: 'STOPP', comm_auto: 'Auto (Profil)',
            comm_lang_kb: 'Tastatursprache', comm_lang_mic: 'Mikrofonsprache', comm_marquee_ready: 'KI-Übersetzung aktiv...'
        },
        ar: {
            comm_title: 'المجتمعات', comm_open: 'عام', comm_private: 'خاص', comm_create: '+ إنشاء',
            comm_new_title: 'مجتمع جديد', comm_name_ph: 'اسم المجتمع...', comm_desc_ph: 'وصف قصير...',
            comm_rules_ph: 'قواعد الغرفة...', comm_type_open: 'عام (للجميع)', comm_type_priv: 'خاص (بدعوة فقط)',
            comm_btn_create: 'إنشاء غرفة', comm_btn_cancel: 'إلغاء', comm_rules_btn: 'القواعد', comm_invite_btn: 'دعوة',
            comm_msg_ph: 'رسالة إلى المجتمع...', comm_empty_priv: 'لا توجد مجتمعات خاصة بعد.',
            comm_invite_title: 'دعوة إلى المجتمع', comm_invite_send: 'إرسال', comm_invite_banner: 'يدعوك إلى المجتمع:',
            comm_join: 'انضمام', comm_later: 'لاحقاً', comm_mic_on: 'الميكروفون يعمل', comm_stop: 'إيقاف', comm_auto: 'تلقائي',
            comm_lang_kb: 'لغة لوحة المفاتيح', comm_lang_mic: 'لغة الميكروفون', comm_marquee_ready: 'الترجمة الفورية نشطة...'
        },
        it: {
            comm_title: 'Comunità', comm_open: 'Aperte', comm_private: 'Private', comm_create: '+ Crea',
            comm_new_title: 'Nuova Comunità', comm_name_ph: 'Nome...', comm_desc_ph: 'Breve descrizione...',
            comm_rules_ph: 'Regole della stanza...', comm_type_open: 'Aperta (a tutti)', comm_type_priv: 'Privata (su invito)',
            comm_btn_create: 'Crea Stanza', comm_btn_cancel: 'Annulla', comm_rules_btn: 'Regole', comm_invite_btn: 'Invita',
            comm_msg_ph: 'Messaggio...', comm_empty_priv: 'Nessuna comunità privata ancora.',
            comm_invite_title: 'Invita nella Comunità', comm_invite_send: 'Invia', comm_invite_banner: 'ti invita nella comunità:',
            comm_join: 'Entra', comm_later: 'Più tardi', comm_mic_on: 'MIC ON', comm_stop: 'STOP', comm_auto: 'Auto (Profilo)',
            comm_lang_kb: 'Lingua Tastiera', comm_lang_mic: 'Lingua Microfono', comm_marquee_ready: 'Traduzione IA attiva...'
        },
        es: {
            comm_title: 'Comunidades', comm_open: 'Abiertas', comm_private: 'Privadas', comm_create: '+ Crear',
            comm_new_title: 'Nueva Comunidad', comm_name_ph: 'Nombre...', comm_desc_ph: 'Descripción breve...',
            comm_rules_ph: 'Reglas de la sala...', comm_type_open: 'Abierta (para todos)', comm_type_priv: 'Privada (solo invitación)',
            comm_btn_create: 'Crear Sala', comm_btn_cancel: 'Cancelar', comm_rules_btn: 'Reglas', comm_invite_btn: 'Invitar',
            comm_msg_ph: 'Mensaje...', comm_empty_priv: 'Aún no hay comunidades privadas.',
            comm_invite_title: 'Invitar a la Comunidad', comm_invite_send: 'Enviar', comm_invite_banner: 'te invita a la comunidad:',
            comm_join: 'Unirse', comm_later: 'Más tarde', comm_mic_on: 'MIC ON', comm_stop: 'PARAR', comm_auto: 'Auto (Perfil)',
            comm_lang_kb: 'Idioma del Teclado', comm_lang_mic: 'Idioma del Micrófono', comm_marquee_ready: 'Traducción IA activa...'
        },
        fr: {
            comm_title: 'Communautés', comm_open: 'Ouvertes', comm_private: 'Privées', comm_create: '+ Créer',
            comm_new_title: 'Nouvelle Communauté', comm_name_ph: 'Nom...', comm_desc_ph: 'Brève description...',
            comm_rules_ph: 'Règles du salon...', comm_type_open: 'Ouverte (à tous)', comm_type_priv: 'Privée (sur invitation)',
            comm_btn_create: 'Créer le salon', comm_btn_cancel: 'Annuler', comm_rules_btn: 'Règles', comm_invite_btn: 'Inviter',
            comm_msg_ph: 'Message...', comm_empty_priv: 'Aucune communauté privée pour le moment.',
            comm_invite_title: 'Inviter dans la Communauté', comm_invite_send: 'Envoyer', comm_invite_banner: 'vous invite dans :',
            comm_join: 'Rejoindre', comm_later: 'Plus tard', comm_mic_on: 'MIC ON', comm_stop: 'STOP', comm_auto: 'Auto (Profil)',
            comm_lang_kb: 'Langue du clavier', comm_lang_mic: 'Langue du micro', comm_marquee_ready: 'Traduction IA active...'
        },
        pt: {
            comm_title: 'Comunidades', comm_open: 'Abertas', comm_private: 'Privadas', comm_create: '+ Criar',
            comm_new_title: 'Nova Comunidade', comm_name_ph: 'Nome...', comm_desc_ph: 'Breve descrição...',
            comm_rules_ph: 'Regras da sala...', comm_type_open: 'Aberta (para todos)', comm_type_priv: 'Privada (só convite)',
            comm_btn_create: 'Criar Sala', comm_btn_cancel: 'Cancelar', comm_rules_btn: 'Regras', comm_invite_btn: 'Convidar',
            comm_msg_ph: 'Mensagem...', comm_empty_priv: 'Nenhuma comunidade privada ainda.',
            comm_invite_title: 'Convidar para Comunidade', comm_invite_send: 'Enviar', comm_invite_banner: 'convida você para:',
            comm_join: 'Entrar', comm_later: 'Mais tarde', comm_mic_on: 'MIC ON', comm_stop: 'PARAR', comm_auto: 'Auto (Perfil)',
            comm_lang_kb: 'Idioma do Teclado', comm_lang_mic: 'Idioma do Microfone', comm_marquee_ready: 'Tradução IA ativa...'
        },
        ja: {
            comm_title: 'コミュニティ', comm_open: '公開', comm_private: '非公開', comm_create: '+ 作成',
            comm_new_title: '新規コミュニティ', comm_name_ph: 'コミュニティ名...', comm_desc_ph: '簡単な説明...',
            comm_rules_ph: 'ルームのルール...', comm_type_open: '公開（誰でも）', comm_type_priv: '非公開（招待のみ）',
            comm_btn_create: '作成', comm_btn_cancel: 'キャンセル', comm_rules_btn: 'ルール', comm_invite_btn: '招待',
            comm_msg_ph: 'メッセージ...', comm_empty_priv: '非公開コミュニティはまだありません。',
            comm_invite_title: 'コミュニティに招待', comm_invite_send: '送信', comm_invite_banner: 'が招待しています:',
            comm_join: '参加', comm_later: '後で', comm_mic_on: 'マイクON', comm_stop: '停止', comm_auto: '自動',
            comm_lang_kb: 'キーボード言語', comm_lang_mic: 'マイク言語', comm_marquee_ready: 'AI翻訳アクティブ...'
        },
        zh: {
            comm_title: '社区', comm_open: '公开', comm_private: '私密', comm_create: '+ 创建',
            comm_new_title: '新建社区', comm_name_ph: '社区名称...', comm_desc_ph: '简短描述...',
            comm_rules_ph: '房间规则...', comm_type_open: '公开（所有人）', comm_type_priv: '私密（仅限邀请）',
            comm_btn_create: '创建房间', comm_btn_cancel: '取消', comm_rules_btn: '规则', comm_invite_btn: '邀请',
            comm_msg_ph: '发送消息...', comm_empty_priv: '暂无私密社区。',
            comm_invite_title: '邀请加入社区', comm_invite_send: '发送', comm_invite_banner: '邀请您加入社区：',
            comm_join: '加入', comm_later: '稍后', comm_mic_on: '麦克风开', comm_stop: '停止', comm_auto: '自动',
            comm_lang_kb: '键盘语言', comm_lang_mic: '麦克风语言', comm_marquee_ready: 'AI翻译已激活...'
        }
    };

    const STARTER_COMMUNITIES = {
        club_global_lounge: {
            id: 'club_global_lounge', icon: '🌍', name: 'Global Lounge', type: 'open',
            description: 'Free international chat with live AI translation for all languages.',
            rules: '1. Respect everyone.\n2. No spam or offensive content.\n3. Write in your native language — AI translates automatically.',
            creatorId: 'system', createdAt: 1700000001
        },
        club_lang_exchange: {
            id: 'club_lang_exchange', icon: '🗣️', name: 'Language Exchange', type: 'open',
            description: 'Practice speaking, slang, and everyday phrases with native speakers.',
            rules: '1. Help others learn kindly.\n2. Feel free to use voice-to-text.\n3. Keep topics friendly.',
            creatorId: 'system', createdAt: 1700000002
        },
        club_it_startups: {
            id: 'club_it_startups', icon: '💻', name: 'IT, Code & Startups', type: 'open',
            description: 'Development, AI tools, design, and project feedback.',
            rules: '1. Share constructive feedback.\n2. No scam links.\n3. Stay on tech & product topics.',
            creatorId: 'system', createdAt: 1700000003
        },
        club_masters_craft: {
            id: 'club_masters_craft', icon: '🛠️', name: 'Masters, Craft & Build', type: 'open',
            description: 'Woodworking, furniture, construction, blueprints, and orders.',
            rules: '1. Share real experience and tips.\n2. Be respectful to clients and craftsmen.',
            creatorId: 'system', createdAt: 1700000004
        },
        club_freelance_biz: {
            id: 'club_freelance_biz', icon: '💼', name: 'Freelance & Business', type: 'open',
            description: 'Finding clients, portfolios, and international negotiations.',
            rules: '1. Honest offers only.\n2. No spam.',
            creatorId: 'system', createdAt: 1700000005
        },
        club_travel_reloc: {
            id: 'club_travel_reloc', icon: '✈️', name: 'Travel & Relocation', type: 'open',
            description: 'Tips on countries, cities, visas, and life abroad.',
            rules: '1. Share verified travel tips.\n2. Respect local cultures.',
            creatorId: 'system', createdAt: 1700000006
        },
        club_sport_active: {
            id: 'club_sport_active', icon: '⚽', name: 'Sport & Active Life', type: 'open',
            description: 'Football, workouts, healthy habits, and motivation.',
            rules: '1. Fair play in chat.\n2. Support each other.',
            creatorId: 'system', createdAt: 1700000007
        },
        club_games_media: {
            id: 'club_games_media', icon: '🎮', name: 'Movies, Music & Games', type: 'open',
            description: 'Recommendations, tournaments, and casual hangouts.',
            rules: '1. Warn about spoilers.\n2. Have fun.',
            creatorId: 'system', createdAt: 1700000008
        }
    };

    const CM = {
        mounted: false,
        isTabActive: false,
        filter: 'open', // 'open' | 'private'
        roomsMap: { ...STARTER_COMMUNITIES },
        activeRoomId: null,
        renderedRoomId: null,
        rulesExpanded: false,

        // Firebase refs
        metaListenerBound: false,
        inviteListenerBound: false,
        msgRef: null,
        msgListener: null,
        langRef: null,
        langListener: null,
        liveLangs: {},
        seenMsgKeys: new Set(),

        // Mic engine (isolated)
        micActive: false,
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

    window.HF_COMM_WORLD = CM;

    // Сброс временных языков микрофона сообществ при старте
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('hf_comm_mic_lang_')) localStorage.removeItem(k);
    });

    // ============================================================
    // 1. ХЕЛПЕРЫ ЯЗЫКА, HTML, ПРОФИЛЯ И ВИДИМОСТИ ВКЛАДКИ
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

    function isCommTabActive() {
        if (typeof window.currentIndex === 'number') return window.currentIndex === 7;
        if (CM.isTabActive) return true;
        const page = document.getElementById('communities-page');
        if (!page) return false;
        const st = window.getComputedStyle(page);
        return st.display !== 'none' && st.visibility !== 'hidden' && page.offsetParent !== null;
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
        return COMM_I18N[c] ? c : 'en';
    }

    function t(key) {
        const l = getUiLang();
        return (COMM_I18N[l] && COMM_I18N[l][key]) || COMM_I18N.en[key] || key;
    }

    function mergeCommI18n() {
        window.i18n = window.i18n || {};
        Object.keys(COMM_I18N).forEach(lang => {
            window.i18n[lang] = Object.assign({}, window.i18n[lang] || {}, COMM_I18N[lang]);
        });
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
        return (COMM_LANG_MAP[l] && COMM_LANG_MAP[l].flag) || '🇬🇧';
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

    // Безопасное слияние стартовых и БД-комнат (чтобы частичные узлы не стирали название/иконку)
    function mergeRoomsMap(dbRooms) {
        const merged = {};
        Object.keys(STARTER_COMMUNITIES).forEach(id => {
            merged[id] = Object.assign({}, STARTER_COMMUNITIES[id]);
        });
        if (dbRooms && typeof dbRooms === 'object') {
            Object.keys(dbRooms).forEach(id => {
                const dbItem = dbRooms[id];
                if (dbItem && typeof dbItem === 'object') {
                    const base = merged[id] || {};
                    merged[id] = Object.assign({}, base, dbItem, {
                        id: dbItem.id || base.id || id,
                        name: dbItem.name || base.name || 'Community',
                        icon: dbItem.icon || base.icon || '💬',
                        type: dbItem.type || base.type || 'open'
                    });
                }
            });
        }
        return merged;
    }

    // ============================================================
    // 2. СТИЛИ МОДУЛЯ (ИЗОЛИРОВАННЫЕ #hf-comm-*)
    // ============================================================
    function injectStyles() {
        if (document.getElementById('hf-comm-styles')) return;
        const st = document.createElement('style');
        st.id = 'hf-comm-styles';
        st.textContent = `
            #hf-comm-root {
                display: flex; flex-direction: column; width: 100%; height: 100%;
                background: var(--wa-bg, #0b141a); color: var(--wa-text, #e9edef);
                overflow: hidden; position: relative;
            }
            .hf-comm-marquee-wrap {
                background: #111b21; border-bottom: 1px solid #202c33;
                padding: 5px 10px; overflow: hidden; white-space: nowrap; flex-shrink: 0;
            }
            #comm-info-marquee {
                display: inline-block; padding-left: 100%;
                animation: hfCommMarquee 18s linear infinite;
                font-size: 0.78rem; color: #00a884; font-weight: 600;
            }
            @keyframes hfCommMarquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-100%); }
            }
            #hf-cmic-pill {
                display: none; align-items: center; gap: 8px;
                width: calc(100% - 16px); margin: 0 auto 6px auto;
                padding: 7px 10px; background: #111b21;
                border: 1.5px solid #ef4444; border-radius: 999px;
                box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
                flex-shrink: 0; box-sizing: border-box;
            }
            #hf-cmic-pill.active { display: flex; }
            #hf-cmic-dot {
                width: 9px; height: 9px; border-radius: 50%;
                background: #ef4444; flex-shrink: 0;
                animation: hfCmPulse 1s infinite;
            }
            @keyframes hfCmPulse {
                0% { transform: scale(0.85); opacity: 0.6; }
                50% { transform: scale(1.25); opacity: 1; }
                100% { transform: scale(0.85); opacity: 0.6; }
            }
            .hf-comm-modal-bg {
                position: absolute; inset: 0; z-index: 95;
                background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center; padding: 14px;
            }
            .hf-comm-modal-bg.active { display: flex; }
        `;
        document.head.appendChild(st);
    }

    // ============================================================
    // 3. ПРИСУТСТВИЕ И ЖИВАЯ СИНХРОНИЗАЦИЯ ФЛАГОВ ВНУТРИ КОМНАТЫ
    // ============================================================
    function setMyRoomPresence(roomId, active) {
        const myId = getMyId();
        if (!roomId || !myId || typeof firebase === 'undefined' || !firebase.database) return;
        const userRef = firebase.database().ref(`communities_active_langs/${roomId}/${myId}`);
        if (active) {
            userRef.child('presence').set({
                online: true,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
            try { userRef.onDisconnect().remove(); } catch (e) {}
        } else {
            // Полная очистка узла пользователя при выходе (без хвостов avatar/mic/presence)
            userRef.remove().catch(() => {});
        }
    }

    function syncMyCommChannelLang(roomId, channel, forcedLang) {
        const myId = getMyId();
        if (!roomId || !myId || typeof firebase === 'undefined' || !firebase.database) return;

        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + roomId) : ('hf_comm_avatar_lang_' + roomId);
        if (forcedLang !== undefined) {
            if (!forcedLang || forcedLang === 'auto') localStorage.removeItem(key);
            else localStorage.setItem(key, forcedLang);
        }

        const activeLang = normLang(localStorage.getItem(key));
        const userRef = firebase.database().ref(`communities_active_langs/${roomId}/${myId}`);
        const chRef = userRef.child(channel);

        if (activeLang && COMM_LANG_MAP[activeLang]) {
            const payload = {
                langCode: activeLang,
                flagCode: COMM_LANG_MAP[activeLang].flagCode,
                flag: COMM_LANG_MAP[activeLang].flag,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            if (!CM.liveLangs[myId]) CM.liveLangs[myId] = {};
            CM.liveLangs[myId][channel] = payload;
            chRef.set(payload).catch(() => {});
            try { userRef.onDisconnect().remove(); } catch (e) {}
        } else {
            if (CM.liveLangs[myId]) delete CM.liveLangs[myId][channel];
            chRef.remove().catch(() => {});
        }
    }

    async function buildCommMirrorPacket(roomId, origText, senderLang, channel, senderId) {
        const cleanText = String(origText || '').trim();
        if (!cleanText) return { mirrorFan: [], mirrorMarquee: '' };

        const room = CM.roomsMap[roomId];
        const allParticipants = (window.participants || []).filter(p => p && p.id !== 'ai' && String(p.id) !== String(senderId));
        const liveIds = new Set(Object.keys(CM.liveLangs || {}).filter(uid => String(uid) !== String(senderId)));

        let scopedMembers = [];
        if (room && room.type === 'private') {
            // Строго участники приватной комнаты (не светим чужих людей)
            scopedMembers = allParticipants.filter(p => {
                const pid = String(p.id);
                return (room.members && room.members[pid]) || String(room.creatorId) === pid || liveIds.has(pid);
            });
        } else {
            // Открытая комната: приоритет тем, кто реально внутри комнаты; если ты в комнате один — фоллбек на участников
            const presentMembers = allParticipants.filter(p => liveIds.has(String(p.id)));
            scopedMembers = presentMembers.length > 0 ? presentMembers : allParticipants;
        }

        const targetUsers = [];
        const neededLangs = new Set();

        scopedMembers.forEach(member => {
            const mLiveAll = CM.liveLangs ? CM.liveLangs[String(member.id)] : null;
            const live = mLiveAll ? mLiveAll[channel] : null;
            const mFlag = (live && live.flag) ? live.flag : (member.flag || '🌐');
            const mLang = (live && live.langCode)
                ? normLang(live.langCode)
                : normLang((typeof window.getSmartLang === 'function' ? window.getSmartLang(member) : member.langCode));

            if (mLang && mLang !== 'un') {
                targetUsers.push({
                    userId: String(member.id),
                    code: mLang,
                    flag: mFlag,
                    photo: member.photo || 'https://ui-avatars.com/api/?name=U'
                });
                if (mLang !== senderLang) neededLangs.add(mLang);
            }
        });

        const transCache = {};
        if (senderLang) transCache[senderLang] = cleanText;

        // Параллельный перевод уникальных языков вместо медленного последовательного цикла
        const langsArr = Array.from(neededLangs);
        await Promise.all(langsArr.map(async (langCode) => {
            transCache[langCode] = await translateText(cleanText, langCode);
        }));

        const mirrorFan = [];
        const addedMarqueeLangs = new Set();
        let mirrorMarquee = '';

        targetUsers.forEach(u => {
            const tr = (transCache[u.code] || cleanText).trim();
            if (tr.toLowerCase() === cleanText.toLowerCase()) return;
            mirrorFan.push({ userId: u.userId, code: u.code, flag: u.flag, photo: u.photo, text: tr });
            if (!addedMarqueeLangs.has(u.code)) {
                addedMarqueeLangs.add(u.code);
                mirrorMarquee += `${u.flag} ${tr}        `;
            }
        });

        return { mirrorFan, mirrorMarquee: mirrorMarquee.trim() || cleanText };
    }

    // ============================================================
    // 4. ОТРИСОВКА КАТАЛОГА И ЭКРАНА КОМНАТЫ
    // ============================================================
    function canSeeRoom(room) {
        if (!room) return false;
        if (room.type !== 'private') return true;
        const myId = getMyId();
        if (!myId) return false;
        if (String(room.creatorId) === myId) return true;
        if (room.members && room.members[myId]) return true;
        return false;
    }

    function renderRoot(forceRedraw = false) {
        const page = document.getElementById('communities-page');
        if (!page) return;
        injectStyles();

        if (!document.getElementById('hf-comm-root')) {
            page.innerHTML = `<div id="hf-comm-root"></div>`;
            CM.renderedRoomId = null;
        }
        CM.mounted = true;

        if (CM.activeRoomId && CM.roomsMap[CM.activeRoomId]) {
            // Не стираем переписку при обычном возвращении на вкладку 7
            const msgBox = document.getElementById('comm-chat-messages');
            if (!forceRedraw && CM.renderedRoomId === CM.activeRoomId && msgBox) {
                msgBox.scrollTop = msgBox.scrollHeight;
                return;
            }
            if (forceRedraw) {
                window.openCommunityRoom(CM.activeRoomId);
                return;
            }
            renderRoomView(CM.roomsMap[CM.activeRoomId]);
        } else {
            CM.renderedRoomId = null;
            renderCatalogView();
        }
    }

    function renderCatalogView() {
        const root = document.getElementById('hf-comm-root');
        if (!root) return;
        CM.renderedRoomId = null;

        const allRooms = Object.values(CM.roomsMap)
            .filter(r => r && (CM.filter === 'open' ? r.type !== 'private' : (r.type === 'private' && canSeeRoom(r))))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        let cardsHtml = '';
        if (allRooms.length === 0) {
            cardsHtml = `<div class="text-center text-xs text-[#8696a0] py-10 px-4">${esc(t('comm_empty_priv'))}</div>`;
        } else {
            allRooms.forEach(r => {
                const badge = r.type === 'private'
                    ? `<span class="text-[0.62rem] px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40">🔒 ${esc(t('comm_private'))}</span>`
                    : `<span class="text-[0.62rem] px-2 py-0.5 rounded-full bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/40">🌍 ${esc(t('comm_open'))}</span>`;
                cardsHtml += `
                    <div onclick="window.openCommunityRoom('${esc(r.id)}')" class="bg-[#111b21] border border-[#2a3942] hover:border-[#00a884] rounded-2xl p-3.5 cursor-pointer transition flex items-start gap-3 shadow-sm">
                        <div class="w-11 h-11 rounded-xl bg-[#202c33] flex items-center justify-center text-2xl shrink-0">${esc(r.icon || '💬')}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <h3 class="text-sm font-bold text-white truncate">${esc(r.name)}</h3>
                                ${badge}
                            </div>
                            <p class="text-xs text-[#8696a0] mt-1 line-clamp-2">${esc(r.description || '')}</p>
                        </div>
                    </div>
                `;
            });
        }

        root.innerHTML = `
            <div class="flex items-center justify-between px-3.5 py-3 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-users text-[#00a884]"></i> ${esc(t('comm_title'))}
                </h2>
                <button onclick="window.openCreateCommunityModal()" class="px-3 py-1.5 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold hover:opacity-90 transition">
                    ${esc(t('comm_create'))}
                </button>
            </div>
            <div class="flex gap-2 px-3.5 py-2.5 bg-[#0b141a] border-b border-[#202c33] shrink-0">
                <button onclick="window.setCommunityFilter('open')" class="flex-1 py-2 rounded-xl text-xs font-bold transition ${CM.filter === 'open' ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-[#8696a0]'}">
                    🌍 ${esc(t('comm_open'))}
                </button>
                <button onclick="window.setCommunityFilter('private')" class="flex-1 py-2 rounded-xl text-xs font-bold transition ${CM.filter === 'private' ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-[#8696a0]'}">
                    🔒 ${esc(t('comm_private'))}
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                ${cardsHtml}
            </div>
            ${buildCreateModalHtml()}
        `;
    }

    function buildCreateModalHtml() {
        return `
            <div id="hf-comm-create-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) window.closeCreateCommunityModal()">
                <div class="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-sm p-4 flex flex-col gap-3 shadow-2xl">
                    <h3 class="text-sm font-bold text-white">${esc(t('comm_new_title'))}</h3>
                    <div class="flex gap-2">
                        <input id="hf-comm-new-icon" type="text" value="💬" maxlength="4" class="w-14 text-center bg-[#202c33] border border-[#2a3942] rounded-xl py-2 text-lg text-white outline-none">
                        <input id="hf-comm-new-name" type="text" placeholder="${esc(t('comm_name_ph'))}" class="flex-1 bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00a884]">
                    </div>
                    <select id="hf-comm-new-type" class="bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-white outline-none">
                        <option value="open">🌍 ${esc(t('comm_type_open'))}</option>
                        <option value="private">🔒 ${esc(t('comm_type_priv'))}</option>
                    </select>
                    <input id="hf-comm-new-desc" type="text" placeholder="${esc(t('comm_desc_ph'))}" class="bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00a884]">
                    <textarea id="hf-comm-new-rules" rows="3" placeholder="${esc(t('comm_rules_ph'))}" class="bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00a884] resize-none"></textarea>
                    <div class="flex gap-2 mt-1">
                        <button onclick="window.closeCreateCommunityModal()" class="flex-1 py-2.5 rounded-xl bg-[#202c33] text-[#8696a0] text-xs font-bold">${esc(t('comm_btn_cancel'))}</button>
                        <button onclick="window.submitCreateCommunity()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold">${esc(t('comm_btn_create'))}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderRoomView(room) {
        const root = document.getElementById('hf-comm-root');
        if (!root) return;
        CM.renderedRoomId = room.id;

        const rulesText = esc(room.rules || '1. Respect everyone.\n2. No spam.').replace(/\n/g, '<br>');
        root.innerHTML = `
            <div class="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <button onclick="window.leaveCommunityRoom()" class="w-8 h-8 rounded-full bg-[#202c33] text-white flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <span class="text-xl shrink-0">${esc(room.icon || '💬')}</span>
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-white truncate">${esc(room.name)}</div>
                        <div class="text-[0.65rem] text-[#00a884] truncate">${room.type === 'private' ? '🔒 ' + esc(t('comm_private')) : '🌍 ' + esc(t('comm_open'))}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="window.toggleCommRules()" class="px-2.5 py-1.5 rounded-xl bg-[#202c33] text-[#e9edef] text-[0.7rem] font-bold border border-[#2a3942]">
                        📌 ${esc(t('comm_rules_btn'))}
                    </button>
                    <button onclick="window.openCommInviteModal()" class="px-2.5 py-1.5 rounded-xl bg-[#00a884] text-[#111b21] text-[0.7rem] font-extrabold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
            </div>

            <div class="bg-[#111b21]/90 border-b border-[#202c33] px-3 py-1.5 shrink-0">
                <div class="text-[0.72rem] text-[#8696a0] truncate">📌 ${esc(room.description || room.name)}</div>
                <div id="hf-comm-rules-box" class="${CM.rulesExpanded ? '' : 'hidden'} mt-1.5 pt-1.5 border-t border-[#2a3942] text-[0.72rem] text-[#e9edef] leading-relaxed">
                    ${rulesText}
                </div>
            </div>

            <div class="hf-comm-marquee-wrap">
                <div id="comm-info-marquee">${esc(room.icon || '💬')} ${esc(room.name)} • ${esc(t('comm_marquee_ready'))}</div>
            </div>

            <div id="comm-chat-messages" class="flex-1 overflow-y-auto px-3 py-2 flex flex-col"></div>

            <div id="hf-cmic-pill">
                <span id="hf-cmic-dot"></span>
                <span id="hf-cmic-flag" class="text-sm shrink-0 cursor-pointer" onclick="window.openCommLangModal('mic')">🌐</span>
                <span id="hf-cmic-text" class="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-xs font-bold text-white"></span>
                <button type="button" onclick="window.stopCommMic(false)" class="bg-red-500 text-white rounded-full px-3 py-1 text-[0.7rem] font-extrabold shrink-0">${esc(t('comm_stop'))}</button>
            </div>

            <div class="flex items-center gap-2 px-2.5 py-2 bg-[#111b21] border-t border-[#202c33] shrink-0">
                <button onclick="window.openCommLangModal('avatar')" class="w-9 h-9 rounded-full bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-base shrink-0" title="Language">
                    <span id="hf-comm-kb-flag">${getMyCommFlag('avatar')}</span>
                </button>
                <input id="comm-chat-input" type="text" placeholder="${esc(t('comm_msg_ph'))}" class="flex-1 bg-[#202c33] border border-[#2a3942] rounded-full px-3.5 py-2 text-sm text-white outline-none focus:border-[#00a884]">
                <button onclick="window.toggleCommMic()" class="w-9 h-9 rounded-full bg-[#202c33] border border-[#2a3942] text-[#00a884] flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-microphone"></i>
                </button>
                <button onclick="window.sendCommMsg()" class="w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </div>

            <div id="hf-comm-lang-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-invite-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
        `;

        const inp = document.getElementById('comm-chat-input');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.sendCommMsg();
                }
            });
        }
    }

    function getMyCommFlag(channel) {
        const rId = CM.activeRoomId;
        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + rId) : ('hf_comm_avatar_lang_' + rId);
        const manual = normLang(localStorage.getItem(key));
        return (manual && COMM_LANG_MAP[manual]) ? COMM_LANG_MAP[manual].flag : getMyNativeFlag();
    }

    // ============================================================
    // 5. ДЕЙСТВИЯ: СОЗДАНИЕ, ВХОД, ВЫХОД, ПРИГЛАШЕНИЯ
    // ============================================================
    window.setCommunityFilter = function (f) {
        CM.filter = (f === 'private') ? 'private' : 'open';
        renderCatalogView();
    };

    window.openCreateCommunityModal = function () {
        document.getElementById('hf-comm-create-modal')?.classList.add('active');
    };

    window.closeCreateCommunityModal = function () {
        document.getElementById('hf-comm-create-modal')?.classList.remove('active');
    };

    window.submitCreateCommunity = function () {
        const nameEl = document.getElementById('hf-comm-new-name');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) return nameEl?.focus();

        const icon = (document.getElementById('hf-comm-new-icon')?.value || '💬').trim() || '💬';
        const type = document.getElementById('hf-comm-new-type')?.value === 'private' ? 'private' : 'open';
        const desc = (document.getElementById('hf-comm-new-desc')?.value || '').trim() || name;
        const rules = (document.getElementById('hf-comm-new-rules')?.value || '').trim() || '1. Respect everyone.\n2. No spam.';
        const myId = getMyId() || 'guest';
        const roomId = 'club_' + Date.now();

        const roomObj = {
            id: roomId, icon, name, type, description: desc, rules,
            creatorId: myId,
            members: { [myId]: true },
            createdAt: Date.now()
        };

        CM.roomsMap[roomId] = roomObj;
        if (typeof firebase !== 'undefined' && firebase.database) {
            firebase.database().ref('communities_meta/' + roomId).set(roomObj).catch(() => {});
        }
        window.closeCreateCommunityModal();
        window.openCommunityRoom(roomId);
    };

    window.toggleCommRules = function () {
        CM.rulesExpanded = !CM.rulesExpanded;
        const box = document.getElementById('hf-comm-rules-box');
        if (box) box.classList.toggle('hidden', !CM.rulesExpanded);
    };

    window.openCommunityRoom = async function (roomId) {
        if (!roomId) return;

        // Если комната ещё не успела прилететь в roomsMap (например, вход по инвайту на медленной сети) — догружаем
        if (!CM.roomsMap[roomId] && typeof firebase !== 'undefined' && firebase.database) {
            try {
                const snap = await firebase.database().ref('communities_meta/' + roomId).once('value');
                const val = snap.val();
                if (val && typeof val === 'object') {
                    const base = STARTER_COMMUNITIES[roomId] || {};
                    CM.roomsMap[roomId] = Object.assign({}, base, val, { id: val.id || roomId });
                }
            } catch (e) {}
        }

        const room = CM.roomsMap[roomId];
        if (!room) return;

        // Гарантируем, что корневой контейнер #hf-comm-root уже смонтирован
        if (!document.getElementById('hf-comm-root')) {
            const page = document.getElementById('communities-page');
            if (page) {
                injectStyles();
                page.innerHTML = `<div id="hf-comm-root"></div>`;
                CM.mounted = true;
            }
        }

        detachRoomListeners();
        window.stopCommMic(true);

        CM.activeRoomId = roomId;
        CM.rulesExpanded = false;
        CM.seenMsgKeys.clear();
        CM.liveLangs = {};

        renderRoomView(room);

        if (typeof firebase !== 'undefined' && firebase.database) {
            setMyRoomPresence(roomId, true);
            syncMyCommChannelLang(roomId, 'avatar');
            syncMyCommChannelLang(roomId, 'mic');

            CM.langRef = firebase.database().ref('communities_active_langs/' + roomId);
            CM.langListener = CM.langRef.on('value', (snap) => {
                CM.liveLangs = snap.val() || {};
            });

            CM.msgRef = firebase.database().ref('communities_messages/' + roomId);
            CM.msgListener = CM.msgRef.limitToLast(60).on('child_added', handleIncomingCommMsg);
        }
    };

    function detachRoomListeners() {
        const prevId = CM.activeRoomId;
        if (CM.msgRef && CM.msgListener) { CM.msgRef.off('child_added', CM.msgListener); CM.msgListener = null; }
        if (CM.langRef && CM.langListener) { CM.langRef.off('value', CM.langListener); CM.langListener = null; }
        if (prevId) {
            localStorage.removeItem('hf_comm_mic_lang_' + prevId);
            setMyRoomPresence(prevId, false);
        }
    }

    window.leaveCommunityRoom = function () {
        window.stopCommMic(true);
        detachRoomListeners();
        CM.activeRoomId = null;
        CM.renderedRoomId = null;
        renderCatalogView();
    };

    window.openCommLangModal = function (channel) {
        const modal = document.getElementById('hf-comm-lang-modal');
        const rId = CM.activeRoomId;
        if (!modal || !rId) return;

        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + rId) : ('hf_comm_avatar_lang_' + rId);
        const cur = localStorage.getItem(key) || 'auto';
        const title = channel === 'mic' ? t('comm_lang_mic') : t('comm_lang_kb');

        let btns = `<button onclick="window.saveCommLang('${channel}','auto')" class="w-full py-2 rounded-xl text-xs font-bold mb-2 ${cur === 'auto' ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-white'}">${getMyNativeFlag()} ${esc(t('comm_auto'))}</button><div class="grid grid-cols-2 gap-1.5">`;
        Object.keys(COMM_LANG_MAP).forEach(code => {
            const item = COMM_LANG_MAP[code];
            btns += `<button onclick="window.saveCommLang('${channel}','${code}')" class="py-2 px-2 rounded-xl text-xs font-bold text-left ${cur === code ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-white'}">${item.flag} ${item.name}</button>`;
        });
        btns += `</div>`;

        modal.innerHTML = `<div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-3.5 max-h-[80%] overflow-y-auto"><div class="text-xs font-bold text-[#00a884] mb-2.5 text-center">${esc(title)}</div>${btns}</div>`;
        modal.classList.add('active');
    };

    window.saveCommLang = function (channel, code) {
        const rId = CM.activeRoomId;
        if (!rId) return;
        syncMyCommChannelLang(rId, channel, code === 'auto' ? null : code);
        document.getElementById('hf-comm-lang-modal')?.classList.remove('active');

        const kbFlag = document.getElementById('hf-comm-kb-flag');
        if (kbFlag) kbFlag.textContent = getMyCommFlag('avatar');

        if (channel === 'mic' && CM.micActive) {
            readCommMicLang();
            updateCommMicPill('');
            resetCommRecognition(100);
        }
    };

    window.openCommInviteModal = function () {
        const modal = document.getElementById('hf-comm-invite-modal');
        if (!modal || !CM.activeRoomId) return;
        const myId = getMyId();
        let listHtml = '';
        (window.participants || []).forEach(p => {
            if (!p || p.id === 'ai' || String(p.id) === myId) return;
            listHtml += `
                <label class="flex items-center justify-between p-2.5 bg-[#202c33] rounded-xl border border-[#2a3942] cursor-pointer">
                    <div class="flex items-center gap-2.5">
                        <img src="${esc(p.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-8 h-8 rounded-full object-cover">
                        <span class="text-xs font-bold text-white">${esc(p.flag || '🌐')} ${esc((p.name || 'User').split(' ')[0])}</span>
                    </div>
                    <input type="checkbox" value="${esc(p.id)}" class="hf-comm-inv-cb w-4 h-4 accent-[#00a884]">
                </label>
            `;
        });
        modal.innerHTML = `
            <div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-3.5 flex flex-col gap-2.5 max-h-[80%]">
                <div class="text-xs font-bold text-[#00a884]">${esc(t('comm_invite_title'))}</div>
                <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">${listHtml}</div>
                <div class="flex gap-2">
                    <button onclick="document.getElementById('hf-comm-invite-modal').classList.remove('active')" class="flex-1 py-2 rounded-xl bg-[#202c33] text-[#8696a0] text-xs font-bold">${esc(t('comm_btn_cancel'))}</button>
                    <button onclick="window.sendCommInvites()" class="flex-1 py-2 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold">${esc(t('comm_invite_send'))}</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    };

    window.sendCommInvites = function () {
        const room = CM.roomsMap[CM.activeRoomId];
        if (!room || typeof firebase === 'undefined') return;
        const checked = document.querySelectorAll('.hf-comm-inv-cb:checked');
        if (!checked.length) {
            document.getElementById('hf-comm-invite-modal')?.classList.remove('active');
            return;
        }
        const myId = getMyId();
        const isStarter = Boolean(STARTER_COMMUNITIES[room.id]);

        checked.forEach(cb => {
            const targetId = cb.value;
            // Для приватных/пользовательских комнат пишем в members, стартовые открытые не засоряем
            if (!isStarter) {
                firebase.database().ref(`communities_meta/${room.id}/members/${targetId}`).set(true).catch(() => {});
            }
            firebase.database().ref(`communities_invites/${targetId}`).push({
                roomId: room.id,
                roomName: room.name,
                roomIcon: room.icon || '💬',
                fromId: myId,
                fromName: window.myUsername || 'User',
                fromPhoto: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
                fromFlag: getMyNativeFlag(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        });
        document.getElementById('hf-comm-invite-modal')?.classList.remove('active');
        if (window.showToast) window.showToast(t('comm_title'), t('comm_invite_send') + ' ✓', '', '');
    };

    // ============================================================
    // 6. ОТПРАВКА И ПРИЁМ СООБЩЕНИЙ СООБЩЕСТВА
    // ============================================================
    async function dispatchCommPayload(rawText, channel) {
        const roomId = CM.activeRoomId;
        const clean = String(rawText || '').trim();
        if (!roomId || !clean || typeof firebase === 'undefined') return;

        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + roomId) : ('hf_comm_avatar_lang_' + roomId);
        const manual = normLang(localStorage.getItem(key));
        const myActiveLang = manual || getMyNativeLang();
        const myFlag = (manual && COMM_LANG_MAP[manual]) ? COMM_LANG_MAP[manual].flag : getMyNativeFlag();
        const safeId = getMyId() || 'guest';
        const safeName = (window.myUsername || 'User').split(' ')[0];
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';

        const baseText = (channel === 'mic') ? clean : await translateText(clean, myActiveLang);
        const packet = await buildCommMirrorPacket(roomId, baseText, myActiveLang, channel, safeId);

        firebase.database().ref('communities_messages/' + roomId).push({
            userId: safeId, name: safeName, photo: safePhoto, flag: myFlag,
            langCode: myActiveLang, inputChannel: channel,
            originalText: baseText, text: baseText,
            mirrorFan: packet.mirrorFan, mirrorMarquee: packet.mirrorMarquee,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => {});
    }

    window.sendCommMsg = async function () {
        const inp = document.getElementById('comm-chat-input');
        if (!inp) return;
        const val = inp.value.trim();
        if (!val) return;
        inp.value = '';
        await dispatchCommPayload(val, 'avatar');
    };

    function handleIncomingCommMsg(snap) {
        const data = snap.val();
        if (!data || CM.seenMsgKeys.has(snap.key)) return;
        CM.seenMsgKeys.add(snap.key);

        const box = document.getElementById('comm-chat-messages');
        if (!box) return;

        const myId = getMyId();
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;
        const name = isMe ? (window.myUsername || 'Me').split(' ')[0] : (data.name || 'User').split(' ')[0];
        const flag = data.flag || '🌐';
        const baseText = data.originalText || data.text || '';
        const fan = Array.isArray(data.mirrorFan) ? data.mirrorFan : (data.mirrorFan ? Object.values(data.mirrorFan) : []);

        const group = document.createElement('div');
        group.className = 'flex flex-col w-full mt-2.5 mb-1';

        const avatarClick = isMe ? `window.openCommLangModal('avatar')` : `if(window.openAvatarModal) window.openAvatarModal('${esc(data.userId)}')`;
        const avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer" onclick="${avatarClick}"><img src="${esc(data.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942]"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none">${esc(flag)}</span></div>`;
        const bubbleHtml = `<div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[78%]"><span class="text-[0.65rem] text-[#8696a0] mb-0.5 px-1">${esc(name)}</span><div class="px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#005c4b] text-white rounded-tr-sm' : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm'}">${esc(baseText)}</div></div>`;

        group.innerHTML = `<div class="flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}">${isMe ? (bubbleHtml + avatarHtml) : (avatarHtml + bubbleHtml)}</div>`;

        if (fan.length > 0) {
            const fanWrap = document.createElement('div');
            fanWrap.className = `flex flex-col gap-1.5 mt-1.5 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
            fan.forEach(u => {
                fanWrap.innerHTML += `<div class="flex items-end gap-1.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}"><div class="relative shrink-0"><img src="${esc(u.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-5 h-5 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${esc(u.flag || '🌐')}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-xl px-2.5 py-1 text-xs text-yellow-400 font-bold">${esc(u.text)}</div></div>`;
            });
            group.appendChild(fanWrap);
        }

        box.appendChild(group);
        box.scrollTop = box.scrollHeight;

        if (!isHistory) {
            if (!isMe && window.sndMsg) window.sndMsg.play().catch(() => {});
            const mText = document.getElementById('comm-info-marquee');
            if (mText) {
                mText.innerHTML = `<span class="text-white mr-2">${esc(flag)} ${esc(name)}:</span> <span class="text-[#00a884] font-bold">${esc(data.mirrorMarquee || baseText)}</span>`;
                mText.style.animation = 'none'; void mText.offsetWidth; mText.style.animation = null;
            }
        }
    }

    // ============================================================
    // 7. ИЗОЛИРОВАННЫЙ БЕЗЛИМИТНЫЙ МИКРОФОН СООБЩЕСТВА
    // ============================================================
    function cmNorm(s) {
        return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    function readCommMicLang() {
        const rId = CM.activeRoomId;
        const manual = rId ? normLang(localStorage.getItem('hf_comm_mic_lang_' + rId)) : null;
        CM.isManualMic = Boolean(manual);
        CM.recBase = CM.isManualMic ? manual : getMyNativeLang();
    }

    function updateCommMicPill(preview = '') {
        const pill = document.getElementById('hf-cmic-pill');
        if (!pill) return;
        if (!CM.micActive) { pill.classList.remove('active'); return; }
        const flagEl = document.getElementById('hf-cmic-flag');
        const txtEl = document.getElementById('hf-cmic-text');
        if (flagEl) flagEl.textContent = getMyCommFlag('mic');
        if (txtEl) { txtEl.textContent = preview || t('comm_mic_on'); txtEl.scrollLeft = txtEl.scrollWidth; }
        pill.classList.add('active');
    }

    function dispatchCommVoice(text) {
        const clean = String(text || '').trim();
        const norm = cmNorm(clean);
        if (!norm) return;
        const now = Date.now();
        if (norm === CM.lastSentNorm && (now - CM.lastSentAt) < 2200) return;
        CM.lastSentNorm = norm;
        CM.lastSentAt = now;
        dispatchCommPayload(clean, 'mic');
    }

    function resetCommRecognition(delay = 100) {
        clearTimeout(CM.silenceTimer); CM.silenceTimer = null; CM.pendingInterim = '';
        if (CM.recognition) {
            try { CM.recognition.onresult = CM.recognition.onend = CM.recognition.onerror = null; CM.recognition.abort(); } catch (e) {}
            CM.recognition = null;
        }
        if (CM.micActive) {
            clearTimeout(CM.restartTimer);
            CM.restartTimer = setTimeout(() => { CM.restartTimer = null; launchCommRecognition(); }, delay);
        }
    }

    function flushCommInterim() {
        clearTimeout(CM.silenceTimer); CM.silenceTimer = null;
        const phrase = CM.pendingInterim.trim();
        CM.pendingInterim = '';
        updateCommMicPill('');
        if (!phrase) return;
        dispatchCommVoice(phrase);
        resetCommRecognition(80);
    }

    function launchCommRecognition() {
        if (!CM.micActive || !CM.activeRoomId) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        readCommMicLang();
        try {
            const rec = new SpeechRec();
            rec.lang = (COMM_LANG_MAP[CM.recBase] && COMM_LANG_MAP[CM.recBase].speech) || 'en-US';
            rec.continuous = false;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onresult = (e) => {
                if (!CM.micActive) return;
                let fin = '', inter = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const ch = (e.results[i][0] && e.results[i][0].transcript) || '';
                    if (e.results[i].isFinal) fin += ' ' + ch; else inter += ' ' + ch;
                }
                if (fin.trim()) {
                    clearTimeout(CM.silenceTimer); CM.pendingInterim = ''; updateCommMicPill('');
                    dispatchCommVoice(fin.trim());
                    return;
                }
                if (inter.trim()) {
                    CM.pendingInterim = inter.trim();
                    updateCommMicPill(CM.pendingInterim);
                    clearTimeout(CM.silenceTimer);
                    CM.silenceTimer = setTimeout(flushCommInterim, CM.recBase === 'az' ? 1400 : 1000);
                }
            };
            rec.onerror = (ev) => {
                if (ev && (ev.error === 'not-allowed' || ev.error === 'service-not-allowed')) return window.stopCommMic(true);
                if (CM.pendingInterim.trim()) return flushCommInterim();
                if (CM.micActive) { CM.recognition = null; resetCommRecognition(220); }
            };
            rec.onend = () => {
                CM.recognition = null;
                if (CM.pendingInterim.trim()) { const tail = CM.pendingInterim.trim(); CM.pendingInterim = ''; updateCommMicPill(''); dispatchCommVoice(tail); }
                if (CM.micActive) { updateCommMicPill(''); resetCommRecognition(80); }
            };
            CM.recognition = rec;
            rec.start();
        } catch (e) {
            CM.recognition = null;
            if (CM.micActive) resetCommRecognition(300);
        }
    }

    window.toggleCommMic = function () {
        if (CM.micActive) window.stopCommMic(false);
        else window.startCommMic();
    };

    window.startCommMic = function () {
        if (!CM.activeRoomId) return;
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return alert('Speech recognition is not supported.');
        readCommMicLang();
        CM.micActive = true;
        updateCommMicPill('');
        launchCommRecognition();
        clearInterval(CM.watchdog);
        CM.watchdog = setInterval(() => {
            if (!CM.micActive) return;
            if (!isCommTabActive() || !CM.activeRoomId) return window.stopCommMic(true);
            if (!CM.recognition && !CM.restartTimer) launchCommRecognition();
        }, 2000);
    };

    window.stopCommMic = function (discard = true) {
        const tail = (!discard && CM.pendingInterim) ? CM.pendingInterim.trim() : '';
        CM.micActive = false;
        clearTimeout(CM.restartTimer); clearTimeout(CM.silenceTimer); clearInterval(CM.watchdog);
        CM.restartTimer = CM.silenceTimer = CM.watchdog = null; CM.pendingInterim = '';
        if (CM.recognition) {
            try { CM.recognition.onresult = CM.recognition.onend = CM.recognition.onerror = null; CM.recognition.stop(); } catch (e) {}
            CM.recognition = null;
        }
        if (tail) dispatchCommVoice(tail);
        updateCommMicPill('');
        if (CM.activeRoomId) {
            localStorage.removeItem('hf_comm_mic_lang_' + CM.activeRoomId);
            syncMyCommChannelLang(CM.activeRoomId, 'mic', null);
        }
    };

    // ============================================================
    // 8. СЛУШАТЕЛИ FIREBASE (МЕТАДАННЫЕ И ПРИГЛАШЕНИЯ) + ЗАПУСК
    // ============================================================
    function bindFirebaseMetaAndInvites() {
        if (typeof firebase === 'undefined' || !firebase.database) {
            setTimeout(bindFirebaseMetaAndInvites, 600);
            return;
        }
        if (!CM.metaListenerBound) {
            CM.metaListenerBound = true;
            firebase.database().ref('communities_meta').on('value', (snap) => {
                CM.roomsMap = mergeRoomsMap(snap.val() || {});
                if (isCommTabActive() && !CM.activeRoomId) renderCatalogView();
            });
        }
        const myId = getMyId();
        if (myId && !CM.inviteListenerBound) {
            CM.inviteListenerBound = true;
            firebase.database().ref('communities_invites/' + myId).on('child_added', (snap) => {
                const inv = snap.val();
                if (!inv) return;
                if (window.sndMsg) window.sndMsg.play().catch(() => {});
                const safeKey = esc(snap.key);
                const popup = document.createElement('div');
                popup.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xs bg-[#111b21] border border-[#00a884] rounded-2xl p-3 shadow-2xl';
                popup.innerHTML = `
                    <div class="flex items-center gap-2.5">
                        <img src="${esc(inv.fromPhoto)}" class="w-10 h-10 rounded-full object-cover border border-[#00a884]">
                        <div class="text-xs text-white"><b>${esc(inv.fromFlag || '')} ${esc(inv.fromName)}</b> ${esc(t('comm_invite_banner'))} <b class="text-[#00a884]">${esc(inv.roomIcon || '')} ${esc(inv.roomName)}</b></div>
                    </div>
                    <div class="flex gap-2 mt-2.5">
                        <button id="cm-inv-no-${safeKey}" class="flex-1 py-1.5 rounded-xl bg-[#202c33] text-[#8696a0] text-xs font-bold">${esc(t('comm_later'))}</button>
                        <button id="cm-inv-yes-${safeKey}" class="flex-1 py-1.5 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold">${esc(t('comm_join'))}</button>
                    </div>
                `;
                document.body.appendChild(popup);
                document.getElementById(`cm-inv-no-${safeKey}`).onclick = () => { popup.remove(); snap.ref.remove(); };
                document.getElementById(`cm-inv-yes-${safeKey}`).onclick = () => {
                    popup.remove(); snap.ref.remove();
                    if (typeof window.switchTab === 'function') window.switchTab(7);
                    setTimeout(() => window.openCommunityRoom(inv.roomId), 120);
                };
            });
        } else if (!myId) {
            setTimeout(bindFirebaseMetaAndInvites, 1000);
        }
    }

    function bootCommunities() {
        mergeCommI18n();
        bindFirebaseMetaAndInvites();

        document.addEventListener('hf:tab-changed', (e) => {
            const idx = e.detail && e.detail.index;
            CM.isTabActive = (idx === 7);
            if (idx === 7) {
                renderRoot(false);
            } else {
                window.stopCommMic(true);
            }
        });

        const langSel = document.getElementById('app-lang-select');
        if (langSel) {
            langSel.addEventListener('change', () => {
                setTimeout(() => { if (isCommTabActive()) renderRoot(true); }, 80);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootCommunities);
    } else {
        bootCommunities();
    }
})();
