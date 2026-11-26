// ============================================================
// ИЗОЛИРОВАННЫЙ МИР СООБЩЕСТВ (js/communities.js) — v3
// - Монтируется строго в #communities-page (индекс 7)
// - Каталог: Открытые (ПРАВИЛА + 7 тематических) и Приватные комнаты
// - Левый «веер» реальных участников, приглашения (+👤), автоправила + 3-уровневый блок
// - Родные функции: Скрепка (Фото/Видео/Аудио/Документ/Геолокация),
//   Корзина (Архив / Очистить / Удалить), Смайлы (toggleEmojiPicker),
//   Микрофон (только Голос в текст, без ИИ-озвучки)
// - Исправлен приоритет языка профиля (казахский kk по флагу 🇰🇿)
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
            comm_new_title: 'New Community', comm_name_ph: 'Community name...', comm_desc_ph: 'Short description (optional)...',
            comm_type_open: 'Open (in catalog)', comm_type_priv: 'Private (invite only)',
            comm_btn_create: 'Create Room', comm_btn_cancel: 'Cancel', comm_rules_btn: 'Rules', comm_invite_btn: 'Invite',
            comm_msg_ph: 'Message to community...', comm_empty_priv: 'No private communities yet. Create one or accept an invite.',
            comm_invite_title: 'Invite to Community', comm_invite_send: 'Send Invites', comm_invite_banner: 'invites you to community:',
            comm_join: 'Accept', comm_later: 'Later', comm_mic_on: 'MIC ON', comm_stop: 'STOP',
            comm_auto: 'Auto (Profile)', comm_lang_kb: 'Keyboard Language', comm_mic_title: 'Voice to Text',
            comm_stt_btn: 'Start Dictation', comm_marquee_ready: 'AI Translation Active...',
            comm_waiting: 'Invite participants via +👤. They will appear in the fan after accepting.',
            comm_base_rule: 'Be respectful and polite. Profanity, insults, and spam are strictly prohibited — violations delete the message and trigger an automatic block.',
            comm_banned_room: 'Message blocked for profanity/spam. You have been automatically blocked from this community.',
            comm_banned_by_owner: 'The community creator has blocked you from this room.',
            comm_banned_global: 'Access to Communities is restricted due to repeated violations (3+ blocks).',
            comm_mod_title: 'Members & Moderation', comm_ban: 'Block', comm_unban: 'Unblock', comm_banned_list: 'Blocked',
            comm_no_members: 'Only you are in the room so far.', comm_members_count: 'members',
            comm_c_cap: 'Capital', comm_c_area: 'Area', comm_c_pop: 'Population', comm_c_waters: 'Waters', comm_c_res: 'Resources',
            comm_photo: 'Photo', comm_video: 'Video', comm_audio: 'Audio', comm_doc: 'Document', comm_loc: 'Location',
            comm_download: 'Download', comm_open_maps: 'Open in Maps', comm_you: 'You',
            comm_trash_title: 'Room Actions', comm_archive_btn: 'Save Backup to Archive',
            comm_clear_btn: 'Clear Chat History', comm_delete_btn: 'Delete Room Forever',
            comm_clear_denied: 'Public starter rooms cannot be cleared.', comm_delete_denied: 'Only the room creator can delete it.'
        },
        ru: {
            comm_title: 'Сообщества', comm_open: 'Открытые', comm_private: 'Приватные', comm_create: '+ Создать',
            comm_new_title: 'Новое сообщество', comm_name_ph: 'Название сообщества...', comm_desc_ph: 'Краткое описание (необязательно)...',
            comm_type_open: 'Открытое (в каталоге)', comm_type_priv: 'Приватное (по приглашению)',
            comm_btn_create: 'Создать', comm_btn_cancel: 'Отмена', comm_rules_btn: 'Правила', comm_invite_btn: 'Пригласить',
            comm_msg_ph: 'Сообщение в сообщество...', comm_empty_priv: 'Приватных сообществ пока нет. Создайте своё или примите приглашение.',
            comm_invite_title: 'Пригласить в сообщество', comm_invite_send: 'Отправить', comm_invite_banner: 'приглашает в сообщество:',
            comm_join: 'Принять', comm_later: 'Позже', comm_mic_on: 'МИК ВКЛ', comm_stop: 'СТОП',
            comm_auto: 'Авто (Профиль)', comm_lang_kb: 'Язык клавиатуры', comm_mic_title: 'Голос в текст',
            comm_stt_btn: 'Начать диктовку', comm_marquee_ready: 'ИИ-перевод активен...',
            comm_waiting: 'Разошлите приглашения через +👤. Участники появятся в веере после нажатия «Принять».',
            comm_base_rule: 'Будьте корректны. Оскорбления, ругательства и спам запрещены — сообщение автоматически пропадает, а нарушитель получает блок.',
            comm_banned_room: 'Сообщение удалено за нарушение правил (мат/спам). Доступ в это сообщество заблокирован.',
            comm_banned_by_owner: 'Создатель сообщества ограничил вам доступ в эту комнату.',
            comm_banned_global: 'Доступ в раздел «Сообщества» закрыт за неоднократные нарушения (3+ блокировки).',
            comm_mod_title: 'Участники и блокировки', comm_ban: 'Блок', comm_unban: 'Разблок.', comm_banned_list: 'Заблокированные',
            comm_no_members: 'Пока в комнате только вы.', comm_members_count: 'участн.',
            comm_c_cap: 'Столица', comm_c_area: 'Территория', comm_c_pop: 'Население', comm_c_waters: 'Воды', comm_c_res: 'Ресурсы',
            comm_photo: 'Фото', comm_video: 'Видео', comm_audio: 'Аудио', comm_doc: 'Документ', comm_loc: 'Геолокация',
            comm_download: 'Скачать', comm_open_maps: 'Открыть на карте', comm_you: 'Вы',
            comm_trash_title: 'Управление комнатой', comm_archive_btn: 'Сохранить в Архив',
            comm_clear_btn: 'Очистить историю', comm_delete_btn: 'Удалить комнату навсегда',
            comm_clear_denied: 'Общие стартовые комнаты нельзя очистить.', comm_delete_denied: 'Удалить комнату может только её создатель.'
        },
        kk: {
            comm_title: 'Қауымдастықтар', comm_open: 'Ашық', comm_private: 'Жеке', comm_create: '+ Құру',
            comm_new_title: 'Жаңа қауымдастық', comm_name_ph: 'Қауымдастық атауы...', comm_desc_ph: 'Қысқаша сипаттама...',
            comm_type_open: 'Ашық (каталогта)', comm_type_priv: 'Жеке (шақырумен)',
            comm_btn_create: 'Құру', comm_btn_cancel: 'Болдырмау', comm_rules_btn: 'Ережелер', comm_invite_btn: 'Шақыру',
            comm_msg_ph: 'Хабарлама жазу...', comm_empty_priv: 'Жеке қауымдастықтар әлі жоқ.',
            comm_invite_title: 'Қауымдастыққа шақыру', comm_invite_send: 'Жіберу', comm_invite_banner: 'қауымдастыққа шақырады:',
            comm_join: 'Қабылдау', comm_later: 'Кейін', comm_mic_on: 'МИК ҚОСУЛЫ', comm_stop: 'ТОҚТА',
            comm_auto: 'Авто (Профиль)', comm_lang_kb: 'Пернетақта тілі', comm_mic_title: 'Дауысты мәтінге',
            comm_stt_btn: 'Диктовканы бастау', comm_marquee_ready: 'ЖИ аударма белсенді...',
            comm_waiting: '+👤 арқылы шақыру жіберіңіз. Қатысушылар «Қабылдау» басқаннан кейін қосылады.',
            comm_base_rule: 'Сыпайы болыңыз. Балағат сөздер, қорлау және спам тыйым салынады — хабарлама өшіріліп, пайдаланушы автоматты түрде бұғатталады.',
            comm_banned_room: 'Ереже бұзғаныңыз үшін хабарлама жойылды. Бұл қауымдастыққа кіру бұғатталды.',
            comm_banned_by_owner: 'Қауымдастық иесі сіздің осы бөлмеге кіруіңізді шектеді.',
            comm_banned_global: 'Қайталанған бұзушылықтар (3+ бұғаттау) себебінен Қауымдастықтар бөліміне кіру жабылды.',
            comm_mod_title: 'Қатысушылар және бұғаттау', comm_ban: 'Бұғаттау', comm_unban: 'Ашу', comm_banned_list: 'Бұғатталғандар',
            comm_no_members: 'Бөлмеде әзірге тек сіз барсыз.', comm_members_count: 'қатыс.',
            comm_c_cap: 'Астанасы', comm_c_area: 'Аумағы', comm_c_pop: 'Халқы', comm_c_waters: 'Сулары', comm_c_res: 'Ресурстары',
            comm_photo: 'Фото', comm_video: 'Бейне', comm_audio: 'Аудио', comm_doc: 'Құжат', comm_loc: 'Геолокация',
            comm_download: 'Жүктеу', comm_open_maps: 'Картада ашу', comm_you: 'Сіз',
            comm_trash_title: 'Бөлмені басқару', comm_archive_btn: 'Мұрағатқа сақтау',
            comm_clear_btn: 'Тарихты тазарту', comm_delete_btn: 'Бөлмені біржола жою',
            comm_clear_denied: 'Ашық бастапқы бөлмелерді тазартуға болмайды.', comm_delete_denied: 'Бөлмені тек жасаушы жоя алады.'
        },
        az: {
            comm_title: 'İcmalar', comm_open: 'Açıq', comm_private: 'Şəxsi', comm_create: '+ Yarat',
            comm_new_title: 'Yeni İcma', comm_name_ph: 'İcmanın adı...', comm_desc_ph: 'Qısa təsvir...',
            comm_type_open: 'Açıq (kataloqda)', comm_type_priv: 'Şəxsi (dəvətlə)',
            comm_btn_create: 'Yarat', comm_btn_cancel: 'Ləğv et', comm_rules_btn: 'Qaydalar', comm_invite_btn: 'Dəvət et',
            comm_msg_ph: 'İcmaya mesaj...', comm_empty_priv: 'Hələ şəxsi icma yoxdur.',
            comm_invite_title: 'İcmaya dəvət', comm_invite_send: 'Göndər', comm_invite_banner: 'sizi icmaya dəvət edir:',
            comm_join: 'Qəbul et', comm_later: 'Sonra', comm_mic_on: 'MİK AÇIQ', comm_stop: 'DAYAN',
            comm_auto: 'Avto (Profil)', comm_lang_kb: 'Klaviatura dili', comm_mic_title: 'Səsdən mətnə',
            comm_stt_btn: 'Diktəni başlat', comm_marquee_ready: 'AI Tərcümə Aktivdir...',
            comm_waiting: '+👤 düyməsi ilə dəvət göndərin. Qəbul edənlər sol paneldə görünəcək.',
            comm_base_rule: 'Nəzakətli olun. Təhqir, söyüş və spam qadağandır — mesaj silinir və istifadəçi avtomatik bloklanır.',
            comm_banned_room: 'Qaydaları pozduğunuz üçün mesaj silindi. Bu icmada bloklandınız.',
            comm_banned_by_owner: 'İcma yaradıcısı sizi bu otaqdan blokladı.',
            comm_banned_global: 'Təkrar qayda pozuntularına (3+ blok) görə İcmalar bölməsinə giriş bağlandı.',
            comm_mod_title: 'Üzvlər və bloklama', comm_ban: 'Blokla', comm_unban: 'Aç', comm_banned_list: 'Bloklananlar',
            comm_no_members: 'Otaqda hələlik yalnız sizsiniz.', comm_members_count: 'üzv',
            comm_c_cap: 'Paytaxt', comm_c_area: 'Ərazi', comm_c_pop: 'Əhali', comm_c_waters: 'Sular', comm_c_res: 'Sərvətlər',
            comm_photo: 'Foto', comm_video: 'Video', comm_audio: 'Audio', comm_doc: 'Sənəd', comm_loc: 'Məkan',
            comm_download: 'Yüklə', comm_open_maps: 'Xəritədə aç', comm_you: 'Siz',
            comm_trash_title: 'Otaq əməliyyatları', comm_archive_btn: 'Arxivdə saxla',
            comm_clear_btn: 'Tarixçəni təmizlə', comm_delete_btn: 'Otağı həmişəlik sil',
            comm_clear_denied: 'Açıq əsas otaqları təmizləmək olmaz.', comm_delete_denied: 'Yalnız otağın yaradıcısı silə bilər.'
        },
        tr: {
            comm_title: 'Topluluklar', comm_open: 'Açık', comm_private: 'Özel', comm_create: '+ Oluştur',
            comm_new_title: 'Yeni Topluluk', comm_name_ph: 'Topluluk adı...', comm_desc_ph: 'Kısa açıklama...',
            comm_type_open: 'Açık (katalogda)', comm_type_priv: 'Özel (davetle)',
            comm_btn_create: 'Oluştur', comm_btn_cancel: 'İptal', comm_rules_btn: 'Kurallar', comm_invite_btn: 'Davet Et',
            comm_msg_ph: 'Topluluğa mesaj...', comm_empty_priv: 'Henüz özel topluluk yok.',
            comm_invite_title: 'Topluluğa Davet Et', comm_invite_send: 'Gönder', comm_invite_banner: 'seni topluluğa davet ediyor:',
            comm_join: 'Kabul Et', comm_later: 'Sonra', comm_mic_on: 'MİK AÇIK', comm_stop: 'DUR',
            comm_auto: 'Oto (Profil)', comm_lang_kb: 'Klavye Dili', comm_mic_title: 'Sesten Metne',
            comm_stt_btn: 'Dikteyi Başlat', comm_marquee_ready: 'AI Çeviri Aktif...',
            comm_waiting: '+👤 ile davet gönderin. Kabul edenler soldaki listede görünür.',
            comm_base_rule: 'Saygılı olun. Hakaret, küfür ve spam yasaktır — mesaj silinir ve kullanıcı otomatik engellenir.',
            comm_banned_room: 'Kural ihlali nedeniyle mesaj silindi. Bu toplulukta engellendiniz.',
            comm_banned_by_owner: 'Topluluk kurucusu sizi bu odadan engelledi.',
            comm_banned_global: 'Tekrarlanan ihlaller (3+ engel) nedeniyle Topluluklar erişiminiz kapatıldı.',
            comm_mod_title: 'Üyeler ve Engelleme', comm_ban: 'Engelle', comm_unban: 'Kaldır', comm_banned_list: 'Engellenenler',
            comm_no_members: 'Odada şimdilik sadece siz varsınız.', comm_members_count: 'üye',
            comm_c_cap: 'Başkent', comm_c_area: 'Yüzölçümü', comm_c_pop: 'Nüfus', comm_c_waters: 'Denizler', comm_c_res: 'Kaynaklar',
            comm_photo: 'Fotoğraf', comm_video: 'Video', comm_audio: 'Ses', comm_doc: 'Belge', comm_loc: 'Konum',
            comm_download: 'İndir', comm_open_maps: 'Haritada Aç', comm_you: 'Sen',
            comm_trash_title: 'Oda İşlemleri', comm_archive_btn: 'Arşive Kaydet',
            comm_clear_btn: 'Geçmişi Temizle', comm_delete_btn: 'Odayı Kalıcı Sil',
            comm_clear_denied: 'Açık başlangıç odaları temizlenemez.', comm_delete_denied: 'Sadece oda kurucusu silebilir.'
        },
        de: {
            comm_title: 'Communities', comm_open: 'Offen', comm_private: 'Privat', comm_create: '+ Erstellen',
            comm_new_title: 'Neue Community', comm_name_ph: 'Name...', comm_desc_ph: 'Kurzbeschreibung...',
            comm_type_open: 'Offen (im Katalog)', comm_type_priv: 'Privat (nur Einladung)',
            comm_btn_create: 'Erstellen', comm_btn_cancel: 'Abbrechen', comm_rules_btn: 'Regeln', comm_invite_btn: 'Einladen',
            comm_msg_ph: 'Nachricht...', comm_empty_priv: 'Noch keine privaten Communities.',
            comm_invite_title: 'Einladen', comm_invite_send: 'Senden', comm_invite_banner: 'lädt dich ein:',
            comm_join: 'Annehmen', comm_later: 'Später', comm_mic_on: 'MIK AN', comm_stop: 'STOPP',
            comm_auto: 'Auto (Profil)', comm_lang_kb: 'Tastatursprache', comm_mic_title: 'Sprache zu Text',
            comm_stt_btn: 'Diktat starten', comm_marquee_ready: 'KI-Übersetzung aktiv...',
            comm_waiting: 'Lade Teilnehmer über +👤 ein. Nach Annahme erscheinen sie links.',
            comm_base_rule: 'Bleibt respektvoll. Beleidigungen, Schimpfwörter und Spam sind verboten — Verstöße führen zur sofortigen Sperrung.',
            comm_banned_room: 'Nachricht wegen Regelverstoß gelöscht. Du wurdest in dieser Community gesperrt.',
            comm_banned_by_owner: 'Der Ersteller hat dich in diesem Raum gesperrt.',
            comm_banned_global: 'Zugang zu Communities wegen wiederholter Verstöße (3+ Sperren) gesperrt.',
            comm_mod_title: 'Mitglieder & Sperren', comm_ban: 'Sperren', comm_unban: 'Freigeben', comm_banned_list: 'Gesperrt',
            comm_no_members: 'Bisher bist nur du im Raum.', comm_members_count: 'Mitgl.',
            comm_c_cap: 'Hauptstadt', comm_c_area: 'Fläche', comm_c_pop: 'Einwohner', comm_c_waters: 'Gewässer', comm_c_res: 'Ressourcen',
            comm_photo: 'Foto', comm_video: 'Video', comm_audio: 'Audio', comm_doc: 'Dokument', comm_loc: 'Standort',
            comm_download: 'Laden', comm_open_maps: 'In Maps öffnen', comm_you: 'Du',
            comm_trash_title: 'Raum-Aktionen', comm_archive_btn: 'Im Archiv sichern',
            comm_clear_btn: 'Verlauf leeren', comm_delete_btn: 'Raum dauerhaft löschen',
            comm_clear_denied: 'Öffentliche Starträume können nicht geleert werden.', comm_delete_denied: 'Nur der Ersteller kann den Raum löschen.'
        },
        ar: {
            comm_title: 'المجتمعات', comm_open: 'عام', comm_private: 'خاص', comm_create: '+ إنشاء',
            comm_new_title: 'مجتمع جديد', comm_name_ph: 'اسم المجتمع...', comm_desc_ph: 'وصف قصير...',
            comm_type_open: 'عام', comm_type_priv: 'خاص (بدعوة فقط)',
            comm_btn_create: 'إنشاء', comm_btn_cancel: 'إلغاء', comm_rules_btn: 'القواعد', comm_invite_btn: 'دعوة',
            comm_msg_ph: 'رسالة إلى المجتمع...', comm_empty_priv: 'لا توجد مجتمعات خاصة بعد.',
            comm_invite_title: 'دعوة إلى المجتمع', comm_invite_send: 'إرسال', comm_invite_banner: 'يدعوك إلى المجتمع:',
            comm_join: 'قبول', comm_later: 'لاحقاً', comm_mic_on: 'الميكروفون يعمل', comm_stop: 'إيقاف',
            comm_auto: 'تلقائي', comm_lang_kb: 'لغة لوحة المفاتيح', comm_mic_title: 'الصوت إلى نص',
            comm_stt_btn: 'بدء الإملاء', comm_marquee_ready: 'الترجمة الفورية نشطة...',
            comm_waiting: 'أرسل الدعوات عبر +👤.',
            comm_base_rule: 'كن محترماً. الشتائم والإهانات والرسائل المزعجة ممنوعة — تؤدي المخالفة للحظر التلقائي.',
            comm_banned_room: 'تم حذف الرسالة وحظرك تلقائياً من هذا المجتمع.',
            comm_banned_by_owner: 'قام منشئ المجتمع بحظرك من هذه الغرفة.',
            comm_banned_global: 'تم إغلاق قسم المجتمعات بسبب المخالفات المتكررة.',
            comm_mod_title: 'الأعضاء والحظر', comm_ban: 'حظر', comm_unban: 'إلغاء', comm_banned_list: 'المحظورون',
            comm_no_members: 'أنت وحدك في الغرفة حالياً.', comm_members_count: 'أعضاء',
            comm_c_cap: 'العاصمة', comm_c_area: 'المساحة', comm_c_pop: 'السكان', comm_c_waters: 'المياه', comm_c_res: 'الموارد',
            comm_photo: 'صورة', comm_video: 'فيديو', comm_audio: 'صوت', comm_doc: 'مستند', comm_loc: 'موقع',
            comm_download: 'تحميل', comm_open_maps: 'فتح في الخرائط', comm_you: 'أنت',
            comm_trash_title: 'إجراءات الغرفة', comm_archive_btn: 'حفظ في الأرشيف',
            comm_clear_btn: 'مسح السجل', comm_delete_btn: 'حذف الغرفة نهائياً',
            comm_clear_denied: 'لا يمكن مسح الغرف العامة الأساسية.', comm_delete_denied: 'يمكن للمنشئ فقط حذف الغرفة.'
        },
        it: {
            comm_title: 'Comunità', comm_open: 'Aperte', comm_private: 'Private', comm_create: '+ Crea',
            comm_new_title: 'Nuova Comunità', comm_name_ph: 'Nome...', comm_desc_ph: 'Breve descrizione...',
            comm_type_open: 'Aperta', comm_type_priv: 'Privata (su invito)',
            comm_btn_create: 'Crea', comm_btn_cancel: 'Annulla', comm_rules_btn: 'Regole', comm_invite_btn: 'Invita',
            comm_msg_ph: 'Messaggio...', comm_empty_priv: 'Nessuna comunità privata ancora.',
            comm_invite_title: 'Invita nella Comunità', comm_invite_send: 'Invia', comm_invite_banner: 'ti invita nella comunità:',
            comm_join: 'Accetta', comm_later: 'Più tardi', comm_mic_on: 'MIC ON', comm_stop: 'STOP',
            comm_auto: 'Auto (Profilo)', comm_lang_kb: 'Lingua Tastiera', comm_mic_title: 'Voce in testo',
            comm_stt_btn: 'Avvia dettatura', comm_marquee_ready: 'Traduzione IA attiva...',
            comm_waiting: 'Invita partecipanti con +👤.',
            comm_base_rule: 'Sii rispettoso. Insulti, parolacce e spam sono vietati — la violazione comporta il blocco automatico.',
            comm_banned_room: 'Messaggio eliminato. Sei stato bloccato in questa comunità.',
            comm_banned_by_owner: 'Il creatore ti ha bloccato da questa stanza.',
            comm_banned_global: 'Accesso alle Comunità bloccato per violazioni ripetute.',
            comm_mod_title: 'Membri e Blocchi', comm_ban: 'Blocca', comm_unban: 'Sblocca', comm_banned_list: 'Bloccati',
            comm_no_members: 'Sei ancora solo nella stanza.', comm_members_count: 'membri',
            comm_c_cap: 'Capitale', comm_c_area: 'Superficie', comm_c_pop: 'Popolazione', comm_c_waters: 'Mari', comm_c_res: 'Risorse',
            comm_photo: 'Foto', comm_video: 'Video', comm_audio: 'Audio', comm_doc: 'Documento', comm_loc: 'Posizione',
            comm_download: 'Scarica', comm_open_maps: 'Apri in Maps', comm_you: 'Tu',
            comm_trash_title: 'Azioni Stanza', comm_archive_btn: 'Salva in Archivio',
            comm_clear_btn: 'Cancella cronologia', comm_delete_btn: 'Elimina stanza',
            comm_clear_denied: 'Le stanze pubbliche base non possono essere svuotate.', comm_delete_denied: 'Solo il creatore può eliminarla.'
        },
        es: {
            comm_title: 'Comunidades', comm_open: 'Abiertas', comm_private: 'Privadas', comm_create: '+ Crear',
            comm_new_title: 'Nueva Comunidad', comm_name_ph: 'Nombre...', comm_desc_ph: 'Descripción breve...',
            comm_type_open: 'Abierta', comm_type_priv: 'Privada (solo invitación)',
            comm_btn_create: 'Crear', comm_btn_cancel: 'Cancelar', comm_rules_btn: 'Reglas', comm_invite_btn: 'Invitar',
            comm_msg_ph: 'Mensaje...', comm_empty_priv: 'Aún no hay comunidades privadas.',
            comm_invite_title: 'Invitar a la Comunidad', comm_invite_send: 'Enviar', comm_invite_banner: 'te invita a la comunidad:',
            comm_join: 'Aceptar', comm_later: 'Más tarde', comm_mic_on: 'MIC ON', comm_stop: 'PARAR',
            comm_auto: 'Auto (Perfil)', comm_lang_kb: 'Idioma del Teclado', comm_mic_title: 'Voz a texto',
            comm_stt_btn: 'Iniciar dictado', comm_marquee_ready: 'Traducción IA activa...',
            comm_waiting: 'Envía invitaciones con +👤.',
            comm_base_rule: 'Sé respetuoso. Insultos, groserías y spam están prohibidos — causan bloqueo automático.',
            comm_banned_room: 'Mensaje bloqueado. Has sido bloqueado automáticamente en esta comunidad.',
            comm_banned_by_owner: 'El creador te ha bloqueado de esta sala.',
            comm_banned_global: 'Acceso a Comunidades restringido por infracciones repetidas.',
            comm_mod_title: 'Miembros y Bloqueos', comm_ban: 'Bloquear', comm_unban: 'Desbloq.', comm_banned_list: 'Bloqueados',
            comm_no_members: 'Solo estás tú por ahora.', comm_members_count: 'miembros',
            comm_c_cap: 'Capital', comm_c_area: 'Superficie', comm_c_pop: 'Población', comm_c_waters: 'Mares', comm_c_res: 'Recursos',
            comm_photo: 'Foto', comm_video: 'Video', comm_audio: 'Audio', comm_doc: 'Documento', comm_loc: 'Ubicación',
            comm_download: 'Descargar', comm_open_maps: 'Abrir en Maps', comm_you: 'Tú',
            comm_trash_title: 'Acciones de Sala', comm_archive_btn: 'Guardar en Archivo',
            comm_clear_btn: 'Limpiar historial', comm_delete_btn: 'Eliminar sala',
            comm_clear_denied: 'Las salas públicas base no se pueden limpiar.', comm_delete_denied: 'Solo el creador puede eliminarla.'
        },
        fr: {
            comm_title: 'Communautés', comm_open: 'Ouvertes', comm_private: 'Privées', comm_create: '+ Créer',
            comm_new_title: 'Nouvelle Communauté', comm_name_ph: 'Nom...', comm_desc_ph: 'Brève description...',
            comm_type_open: 'Ouverte', comm_type_priv: 'Privée (sur invitation)',
            comm_btn_create: 'Créer', comm_btn_cancel: 'Annuler', comm_rules_btn: 'Règles', comm_invite_btn: 'Inviter',
            comm_msg_ph: 'Message...', comm_empty_priv: 'Aucune communauté privée.',
            comm_invite_title: 'Inviter dans la Communauté', comm_invite_send: 'Envoyer', comm_invite_banner: 'vous invite dans :',
            comm_join: 'Accepter', comm_later: 'Plus tard', comm_mic_on: 'MIC ON', comm_stop: 'STOP',
            comm_auto: 'Auto (Profil)', comm_lang_kb: 'Langue du clavier', comm_mic_title: 'Voix en texte',
            comm_stt_btn: 'Démarrer la dictée', comm_marquee_ready: 'Traduction IA active...',
            comm_waiting: 'Invitez des membres via +👤.',
            comm_base_rule: 'Soyez respectueux. Insultes, gros mots et spam sont interdits — blocage automatique.',
            comm_banned_room: 'Message supprimé. Vous avez été bloqué de cette communauté.',
            comm_banned_by_owner: 'Le créateur vous a bloqué de ce salon.',
            comm_banned_global: 'Accès aux Communautés restreint suite à des infractions répétées.',
            comm_mod_title: 'Membres & Blocages', comm_ban: 'Bloquer', comm_unban: 'Débloq.', comm_banned_list: 'Bloqués',
            comm_no_members: 'Vous êtes seul pour le moment.', comm_members_count: 'membres',
            comm_c_cap: 'Capitale', comm_c_area: 'Superficie', comm_c_pop: 'Population', comm_c_waters: 'Mers', comm_c_res: 'Ressources',
            comm_photo: 'Photo', comm_video: 'Vidéo', comm_audio: 'Audio', comm_doc: 'Document', comm_loc: 'Position',
            comm_download: 'Télécharger', comm_open_maps: 'Ouvrir dans Maps', comm_you: 'Vous',
            comm_trash_title: 'Actions du salon', comm_archive_btn: 'Sauvegarder en Archive',
            comm_clear_btn: 'Effacer l’historique', comm_delete_btn: 'Supprimer le salon',
            comm_clear_denied: 'Les salons publics de base ne peuvent pas être vidés.', comm_delete_denied: 'Seul le créateur peut le supprimer.'
        },
        pt: {
            comm_title: 'Comunidades', comm_open: 'Abertas', comm_private: 'Privadas', comm_create: '+ Criar',
            comm_new_title: 'Nova Comunidade', comm_name_ph: 'Nome...', comm_desc_ph: 'Breve descrição...',
            comm_type_open: 'Aberta', comm_type_priv: 'Privada (só convite)',
            comm_btn_create: 'Criar', comm_btn_cancel: 'Cancelar', comm_rules_btn: 'Regras', comm_invite_btn: 'Convidar',
            comm_msg_ph: 'Mensagem...', comm_empty_priv: 'Nenhuma comunidade privada ainda.',
            comm_invite_title: 'Convidar para Comunidade', comm_invite_send: 'Enviar', comm_invite_banner: 'convida você para:',
            comm_join: 'Aceitar', comm_later: 'Mais tarde', comm_mic_on: 'MIC ON', comm_stop: 'PARAR',
            comm_auto: 'Auto (Perfil)', comm_lang_kb: 'Idioma do Teclado', comm_mic_title: 'Voz para texto',
            comm_stt_btn: 'Iniciar ditado', comm_marquee_ready: 'Tradução IA ativa...',
            comm_waiting: 'Convide participantes pelo +👤.',
            comm_base_rule: 'Seja respeitoso. Ofensas, palavrões e spam são proibidos — bloqueio automático.',
            comm_banned_room: 'Mensagem bloqueada. Você foi bloqueado nesta comunidade.',
            comm_banned_by_owner: 'O criador bloqueou você desta sala.',
            comm_banned_global: 'Acesso às Comunidades bloqueado por violações repetidas.',
            comm_mod_title: 'Membros e Bloqueios', comm_ban: 'Bloquear', comm_unban: 'Desbloq.', comm_banned_list: 'Bloqueados',
            comm_no_members: 'Apenas você está na sala.', comm_members_count: 'membros',
            comm_c_cap: 'Capital', comm_c_area: 'Área', comm_c_pop: 'População', comm_c_waters: 'Águas', comm_c_res: 'Recursos',
            comm_photo: 'Foto', comm_video: 'Vídeo', comm_audio: 'Áudio', comm_doc: 'Documento', comm_loc: 'Localização',
            comm_download: 'Baixar', comm_open_maps: 'Abrir no Maps', comm_you: 'Você',
            comm_trash_title: 'Ações da Sala', comm_archive_btn: 'Salvar no Arquivo',
            comm_clear_btn: 'Limpar histórico', comm_delete_btn: 'Excluir sala',
            comm_clear_denied: 'Salas públicas padrão não podem ser limpas.', comm_delete_denied: 'Apenas o criador pode excluir.'
        },
        ja: {
            comm_title: 'コミュニティ', comm_open: '公開', comm_private: '非公開', comm_create: '+ 作成',
            comm_new_title: '新規コミュニティ', comm_name_ph: 'コミュニティ名...', comm_desc_ph: '簡単な説明...',
            comm_type_open: '公開', comm_type_priv: '非公開（招待のみ）',
            comm_btn_create: '作成', comm_btn_cancel: 'キャンセル', comm_rules_btn: 'ルール', comm_invite_btn: '招待',
            comm_msg_ph: 'メッセージ...', comm_empty_priv: '非公開コミュニティはまだありません。',
            comm_invite_title: 'コミュニティに招待', comm_invite_send: '送信', comm_invite_banner: 'が招待しています:',
            comm_join: '参加', comm_later: '後で', comm_mic_on: 'マイクON', comm_stop: '停止',
            comm_auto: '自動', comm_lang_kb: 'キーボード言語', comm_mic_title: '音声をテキストに',
            comm_stt_btn: '音声入力を開始', comm_marquee_ready: 'AI翻訳アクティブ...',
            comm_waiting: '+👤 からメンバーを招待してください。',
            comm_base_rule: '礼儀正しくしてください。暴言・侮辱・スパムは禁止され、自動ブロックされます。',
            comm_banned_room: '違反によりメッセージは削除され、このコミュニティからブロックされました。',
            comm_banned_by_owner: '作成者によってこのルームからブロックされました。',
            comm_banned_global: '度重なる違反によりコミュニティへのアクセスが制限されました。',
            comm_mod_title: 'メンバー管理', comm_ban: 'ブロック', comm_unban: '解除', comm_banned_list: 'ブロック済み',
            comm_no_members: '現在はあなただけです。', comm_members_count: '人',
            comm_c_cap: '首都', comm_c_area: '面積', comm_c_pop: '人口', comm_c_waters: '海域', comm_c_res: '資源',
            comm_photo: '写真', comm_video: '動画', comm_audio: '音声', comm_doc: 'ファイル', comm_loc: '位置情報',
            comm_download: '保存', comm_open_maps: 'マップで開く', comm_you: 'あなた',
            comm_trash_title: 'ルーム操作', comm_archive_btn: 'アーカイブに保存',
            comm_clear_btn: '履歴を消去', comm_delete_btn: 'ルームを完全削除',
            comm_clear_denied: '公開標準ルームは消去できません。', comm_delete_denied: '作成者のみ削除できます。'
        },
        zh: {
            comm_title: '社区', comm_open: '公开', comm_private: '私密', comm_create: '+ 创建',
            comm_new_title: '新建社区', comm_name_ph: '社区名称...', comm_desc_ph: '简短描述...',
            comm_type_open: '公开', comm_type_priv: '私密（仅限邀请）',
            comm_btn_create: '创建', comm_btn_cancel: '取消', comm_rules_btn: '规则', comm_invite_btn: '邀请',
            comm_msg_ph: '发送消息...', comm_empty_priv: '暂无私密社区。',
            comm_invite_title: '邀请加入社区', comm_invite_send: '发送', comm_invite_banner: '邀请您加入社区：',
            comm_join: '接受', comm_later: '稍后', comm_mic_on: '麦克风开', comm_stop: '停止',
            comm_auto: '自动', comm_lang_kb: '键盘语言', comm_mic_title: '语音转文字',
            comm_stt_btn: '开始语音输入', comm_marquee_ready: 'AI翻译已激活...',
            comm_waiting: '点击 +👤 邀请成员加入。',
            comm_base_rule: '请保持礼貌。严禁辱骂和垃圾信息，违规消息将自动删除并封禁账号。',
            comm_banned_room: '消息违规已删除，您已被自动移出并封禁此社区。',
            comm_banned_by_owner: '社区创建者已将您移出此房间。',
            comm_banned_global: '因多次违规（3次以上），社区功能已限制访问。',
            comm_mod_title: '成员与管理', comm_ban: '封禁', comm_unban: '解封', comm_banned_list: '已封禁',
            comm_no_members: '目前只有您在房间内。', comm_members_count: '成员',
            comm_c_cap: '首都', comm_c_area: '面积', comm_c_pop: '人口', comm_c_waters: '水域', comm_c_res: '资源',
            comm_photo: '图片', comm_video: '视频', comm_audio: '音频', comm_doc: '文档', comm_loc: '位置',
            comm_download: '下载', comm_open_maps: '在地图中打开', comm_you: '我',
            comm_trash_title: '房间操作', comm_archive_btn: '保存到存档',
            comm_clear_btn: '清空记录', comm_delete_btn: '永久删除房间',
            comm_clear_denied: '公共默认房间无法清空。', comm_delete_denied: '只有创建者可以删除房间。'
        }
    };

    const STARTER_COMMUNITIES = {
        club_rules: {
            id: 'club_rules', icon: '📜', type: 'open', creatorId: 'system', createdAt: 1700000010, isRulesRoom: true,
            l10n: {
                ru: { name: 'ПРАВИЛА', desc: 'Будьте корректны. Оскорбления, ругательства и спам запрещены — автоматическая блокировка.' },
                kk: { name: 'ЕРЕЖЕЛЕР', desc: 'Сыпайы болыңыз. Балағат сөздер мен спамға тыйым салынады — автоматты бұғаттау.' },
                az: { name: 'QAYDALAR', desc: 'Nəzakətli olun. Təhqir, söyüş və spam qadağandır — avtomatik bloklama.' },
                tr: { name: 'KURALLAR', desc: 'Saygılı olun. Hakaret, küfür ve spam yasaktır — otomatik engelleme.' },
                de: { name: 'REGELN', desc: 'Bleibt respektvoll. Beleidigungen und Spam sind verboten — automatische Sperrung.' },
                en: { name: 'RULES', desc: 'Be respectful. Profanity, insults, and spam are prohibited — automatic block.' },
                ar: { name: 'القواعد', desc: 'كن محترماً. الشتائم والإهانات والسبام ممنوعة — حظر تلقائي.' },
                it: { name: 'REGOLE', desc: 'Sii rispettoso. Insulti e spam vietati — blocco automatico.' },
                es: { name: 'REGLAS', desc: 'Sé respetuoso. Insultos y spam prohibidos — bloqueo automático.' },
                fr: { name: 'RÈGLES', desc: 'Soyez respectueux. Insultes et spam interdits — blocage automatique.' },
                pt: { name: 'REGRAS', desc: 'Seja respeitoso. Ofensas e spam proibidos — bloqueio automático.' },
                ja: { name: 'ルール', desc: '礼儀正しくしてください。暴言・スパム禁止 — 自動ブロック。' },
                zh: { name: '规则', desc: '请保持礼貌。严禁辱骂和垃圾信息 — 自动封禁。' }
            }
        },
        club_games_media: {
            id: 'club_games_media', icon: '🎮', type: 'open', creatorId: 'system', createdAt: 1700000008,
            l10n: {
                ru: { name: 'Кино, Музыка и Игры', desc: 'Рекомендации, турниры и свободное общение.' },
                kk: { name: 'Кино, Музыка және Ойындар', desc: 'Ұсыныстар, турнирлер және еркін әңгіме.' },
                az: { name: 'Kino, Musiqi və Oyunlar', desc: 'Tövsiyələr, turnirlər və sərbəst ünsiyyət.' },
                tr: { name: 'Film, Müzik ve Oyun', desc: 'Öneriler, turnuvalar ve sohbet.' },
                de: { name: 'Filme, Musik & Spiele', desc: 'Empfehlungen, Turniere und lockerer Austausch.' },
                en: { name: 'Movies, Music & Games', desc: 'Recommendations, tournaments, and casual hangouts.' },
                ar: { name: 'الأفلام والموسيقى والألعاب', desc: 'توصيات وبطولات ودردشة ممتعة.' },
                it: { name: 'Film, Musica e Giochi', desc: 'Consigli, tornei e chiacchiere.' },
                es: { name: 'Cine, Música y Juegos', desc: 'Recomendaciones, torneos y charlas.' },
                fr: { name: 'Films, Musique & Jeux', desc: 'Recommandations, tournois et détente.' },
                pt: { name: 'Filmes, Música e Jogos', desc: 'Recomendações, torneios e bate-papo.' },
                ja: { name: '映画・音楽・ゲーム', desc: 'おすすめ、大会、雑談。' },
                zh: { name: '电影、音乐与游戏', desc: '推荐、比赛与轻松交流。' }
            }
        },
        club_sport_active: {
            id: 'club_sport_active', icon: '⚽', type: 'open', creatorId: 'system', createdAt: 1700000007,
            l10n: {
                ru: { name: 'Спорт и Активная жизнь', desc: 'Футбол, тренировки, здоровые привычки и мотивация.' },
                kk: { name: 'Спорт және Белсенді өмір', desc: 'Футбол, жаттығулар, салауатты әдеттер.' },
                az: { name: 'İdman və Aktiv Həyat', desc: 'Futbol, məşqlər, sağlam həyat və motivasiya.' },
                tr: { name: 'Spor ve Aktif Yaşam', desc: 'Futbol, antrenman, sağlıklı alışkanlıklar.' },
                de: { name: 'Sport & Aktives Leben', desc: 'Fußball, Workouts, Gesundheit und Motivation.' },
                en: { name: 'Sport & Active Life', desc: 'Football, workouts, healthy habits, and motivation.' },
                ar: { name: 'الرياضة والحياة النشطة', desc: 'كرة القدم والتمارين والعادات الصحية.' },
                it: { name: 'Sport e Vita Attiva', desc: 'Calcio, allenamenti e motivazione.' },
                es: { name: 'Deporte y Vida Activa', desc: 'Fútbol, entrenamientos y hábitos saludables.' },
                fr: { name: 'Sport & Vie Active', desc: 'Football, entraînements et motivation.' },
                pt: { name: 'Esporte e Vida Ativa', desc: 'Futebol, treinos e hábitos saudáveis.' },
                ja: { name: 'スポーツ＆アクティブ', desc: 'サッカー、筋トレ、健康習慣。' },
                zh: { name: '运动与健康生活', desc: '足球、健身、健康习惯与动力。' }
            }
        },
        club_travel_reloc: {
            id: 'club_travel_reloc', icon: '✈️', type: 'open', creatorId: 'system', createdAt: 1700000006,
            l10n: {
                ru: { name: 'Путешествия и Релокация', desc: 'Советы по странам, городам, визам и жизни за рубежом.' },
                kk: { name: 'Саяхат және Қоныс аудару', desc: 'Елдер, қалалар, визалар және шетелдегі өмір.' },
                az: { name: 'Səyahət və Relokasiya', desc: 'Ölkələr, şəhərlər, vizalar və xaricdə həyat.' },
                tr: { name: 'Seyahat ve Taşınma', desc: 'Ülkeler, şehirler, vizeler ve yurtdışı yaşam.' },
                de: { name: 'Reisen & Auswandern', desc: 'Tipps zu Ländern, Städten, Visa und Leben im Ausland.' },
                en: { name: 'Travel & Relocation', desc: 'Tips on countries, cities, visas, and life abroad.' },
                ar: { name: 'السفر والانتقال', desc: 'نصائح حول الدول والمدن والتأشيرات.' },
                it: { name: 'Viaggi e Trasferimenti', desc: 'Consigli su paesi, città, visti e vita all’estero.' },
                es: { name: 'Viajes y Reubicación', desc: 'Consejos sobre países, ciudades y visas.' },
                fr: { name: 'Voyages & Expatriation', desc: 'Conseils pays, villes, visas et vie à l’étranger.' },
                pt: { name: 'Viagens e Mudança', desc: 'Dicas de países, cidades e vistos.' },
                ja: { name: '旅行＆移住', desc: '国・都市・ビザ・海外生活の情報。' },
                zh: { name: '旅行与移居', desc: '国家、城市、签证与海外生活建议。' }
            }
        },
        club_freelance_biz: {
            id: 'club_freelance_biz', icon: '💼', type: 'open', creatorId: 'system', createdAt: 1700000005,
            l10n: {
                ru: { name: 'Фриланс и Бизнес', desc: 'Поиск клиентов, портфолио и международные переговоры.' },
                kk: { name: 'Фриланс және Бизнес', desc: 'Клиенттер іздеу, портфолио және келіссөздер.' },
                az: { name: 'Frilans və Biznes', desc: 'Müştəri tapmaq, portfolio və danışıqlar.' },
                tr: { name: 'Freelance ve İş', desc: 'Müşteri bulma, portföy ve uluslararası görüşmeler.' },
                de: { name: 'Freelance & Business', desc: 'Kundengewinnung, Portfolios und Verhandlungen.' },
                en: { name: 'Freelance & Business', desc: 'Finding clients, portfolios, and international negotiations.' },
                ar: { name: 'العمل الحر والأعمال', desc: 'إيجاد العملاء والمفاوضات الدولية.' },
                it: { name: 'Freelance e Business', desc: 'Clienti, portfolio e trattative internazionali.' },
                es: { name: 'Freelance y Negocios', desc: 'Clientes, portafolios y negociaciones.' },
                fr: { name: 'Freelance & Business', desc: 'Clients, portfolios et négociations.' },
                pt: { name: 'Freelance e Negócios', desc: 'Clientes, portfólios e negociações.' },
                ja: { name: 'フリーランス＆ビジネス', desc: '案件獲得、ポートフォリオ、商談。' },
                zh: { name: '自由职业与商业', desc: '客户拓展、作品集与国际商务洽谈。' }
            }
        },
        club_masters_craft: {
            id: 'club_masters_craft', icon: '🛠️', type: 'open', creatorId: 'system', createdAt: 1700000004,
            l10n: {
                ru: { name: 'Мастера, Ремесло и Стройка', desc: 'Мебель, столярка, строительство, чертежи и заказы.' },
                kk: { name: 'Шеберлер және Құрылыс', desc: 'Жиһаз, ағаш өңдеу, құрылыс және сызбалар.' },
                az: { name: 'Ustalar və Tikinti', desc: 'Mebel, dülgərlik, tikinti və çertyojlar.' },
                tr: { name: 'Ustalar ve Yapı', desc: 'Mobilya, marangozluk, inşaat ve projeler.' },
                de: { name: 'Handwerk & Bau', desc: 'Möbelbau, Holzbearbeitung, Baupläne und Aufträge.' },
                en: { name: 'Masters, Craft & Build', desc: 'Woodworking, furniture, construction, blueprints, and orders.' },
                ar: { name: 'الحرفيون والبناء', desc: 'الأثاث والنجارة والبناء والمخططات.' },
                it: { name: 'Artigiani e Costruzioni', desc: 'Falegnameria, mobili, edilizia e progetti.' },
                es: { name: 'Oficios y Construcción', desc: 'Carpintería, muebles, obra y planos.' },
                fr: { name: 'Artisans & Construction', desc: 'Menuiserie, meubles, bâtiment et plans.' },
                pt: { name: 'Mestres e Construção', desc: 'Marcenaria, móveis, obras e projetos.' },
                ja: { name: '職人・DIY・建築', desc: '木工、家具、建築、図面と依頼。' },
                zh: { name: '工匠、木工与建筑', desc: '家具、木工、建筑图纸与订单。' }
            }
        },
        club_it_startups: {
            id: 'club_it_startups', icon: '💻', type: 'open', creatorId: 'system', createdAt: 1700000003,
            l10n: {
                ru: { name: 'IT, Код и Стартапы', desc: 'Разработка, ИИ-инструменты, дизайн и разбор проектов.' },
                kk: { name: 'IT, Код және Стартаптар', desc: 'Бағдарламалау, ЖИ құралдары және жобалар.' },
                az: { name: 'IT, Kod və Startaplar', desc: 'Proqramlaşdırma, AI alətləri və dizayn.' },
                tr: { name: 'IT, Kod ve Girişimler', desc: 'Yazılım, yapay zeka araçları ve tasarım.' },
                de: { name: 'IT, Code & Startups', desc: 'Entwicklung, KI-Tools, Design und Projekt-Feedback.' },
                en: { name: 'IT, Code & Startups', desc: 'Development, AI tools, design, and project feedback.' },
                ar: { name: 'التقنية والبرمجة', desc: 'التطوير وأدوات الذكاء الاصطناعي والتصميم.' },
                it: { name: 'IT, Codice e Startup', desc: 'Sviluppo, strumenti IA e design.' },
                es: { name: 'IT, Código y Startups', desc: 'Desarrollo, herramientas IA y diseño.' },
                fr: { name: 'IT, Code & Startups', desc: 'Développement, outils IA et design.' },
                pt: { name: 'IT, Código e Startups', desc: 'Desenvolvimento, ferramentas IA e design.' },
                ja: { name: 'IT・コード・スタートアップ', desc: '開発、AIツール、デザイン。' },
                zh: { name: 'IT、编程与创业', desc: '开发、AI工具、设计与项目交流。' }
            }
        },
        club_lang_exchange: {
            id: 'club_lang_exchange', icon: '🗣️', type: 'open', creatorId: 'system', createdAt: 1700000002,
            l10n: {
                ru: { name: 'Языковой обмен', desc: 'Практика речи, сленг и живые фразы с носителями.' },
                kk: { name: 'Тіл алмасу', desc: 'Сөйлесу тәжірибесі және күнделікті тіркестер.' },
                az: { name: 'Dil Mübadiləsi', desc: 'Danışıq praktikası və canlı ifadələr.' },
                tr: { name: 'Dil Değişimi', desc: 'Konuşma pratiği ve günlük ifadeler.' },
                de: { name: 'Sprachaustausch', desc: 'Sprechen üben und Alltagsphrasen mit Muttersprachlern.' },
                en: { name: 'Language Exchange', desc: 'Practice speaking, slang, and everyday phrases with native speakers.' },
                ar: { name: 'تبادل اللغات', desc: 'ممارسة المحادثة مع الناطقين الأصليين.' },
                it: { name: 'Scambio Linguistico', desc: 'Pratica di conversazione con madrelingua.' },
                es: { name: 'Intercambio de Idiomas', desc: 'Practica conversación con hablantes nativos.' },
                fr: { name: 'Échange Linguistique', desc: 'Pratique orale avec des locuteurs natifs.' },
                pt: { name: 'Intercâmbio de Idiomas', desc: 'Pratique conversação com nativos.' },
                ja: { name: '言語交換', desc: 'ネイティブと会話や日常フレーズを練習。' },
                zh: { name: '语言交换', desc: '与母语者练习口语和日常表达。' }
            }
        }
    };

    const COUNTRY_FACTS = {
        kk: {
            flag: '🇰🇿',
            ru: { name: 'Казахстан', cap: 'Астана', area: '~2,72 млн км²', pop: '~20 млн', waters: 'Каспийское море, оз. Балхаш', res: 'Нефть, газ, уран, металлы, зерно' },
            kk: { name: 'Қазақстан', cap: 'Астана', area: '~2,72 млн км²', pop: '~20 млн', waters: 'Каспий теңізі, Балқаш көлі', res: 'Мұнай, газ, уран, металдар, астық' },
            en: { name: 'Kazakhstan', cap: 'Astana', area: '~2.72M km²', pop: '~20M', waters: 'Caspian Sea, Lake Balkhash', res: 'Oil, gas, uranium, metals, grain' }
        },
        az: {
            flag: '🇦🇿',
            ru: { name: 'Азербайджан', cap: 'Баку', area: '~86,6 тыс. км²', pop: '~10,2 млн', waters: 'Каспийское море', res: 'Нефть, газ, хлопок, фрукты, туризм' },
            az: { name: 'Azərbaycan', cap: 'Bakı', area: '~86,6 min km²', pop: '~10,2 mln', waters: 'Xəzər dənizi', res: 'Neft, qaz, pambıq, meyvə, turizm' },
            en: { name: 'Azerbaijan', cap: 'Baku', area: '~86.6K km²', pop: '~10.2M', waters: 'Caspian Sea', res: 'Oil, gas, cotton, agriculture, tourism' }
        },
        ru: {
            flag: '🇷🇺',
            ru: { name: 'Россия', cap: 'Москва', area: '~17,1 млн км²', pop: '~146 млн', waters: 'Тихий, Сев. Ледовитый и Атлантический океаны, Каспий', res: 'Нефть, газ, лес, металлы, зерно' },
            en: { name: 'Russia', cap: 'Moscow', area: '~17.1M km²', pop: '~146M', waters: 'Pacific, Arctic & Atlantic oceans, Caspian Sea', res: 'Oil, gas, timber, metals, grain' }
        },
        tr: {
            flag: '🇹🇷',
            ru: { name: 'Турция', cap: 'Анкара', area: '~783 тыс. км²', pop: '~85 млн', waters: 'Чёрное, Средиземное, Эгейское и Мраморное моря', res: 'Промышленность, текстиль, туризм, сельское хозяйство' },
            tr: { name: 'Türkiye', cap: 'Ankara', area: '~783 bin km²', pop: '~85 mln', waters: 'Karadeniz, Akdeniz, Ege ve Marmara', res: 'Sanayi, tekstil, turizm, tarım' },
            en: { name: 'Turkey', cap: 'Ankara', area: '~783K km²', pop: '~85M', waters: 'Black, Mediterranean, Aegean & Marmara seas', res: 'Manufacturing, textiles, tourism, agriculture' }
        },
        de: {
            flag: '🇩🇪',
            ru: { name: 'Германия', cap: 'Берлин', area: '~357 тыс. км²', pop: '~84 млн', waters: 'Северное и Балтийское моря', res: 'Машиностроение, автопром, технологии, химия' },
            de: { name: 'Deutschland', cap: 'Berlin', area: '~357 Tsd. km²', pop: '~84 Mio.', waters: 'Nordsee und Ostsee', res: 'Maschinenbau, Automobilindustrie, Technologie' },
            en: { name: 'Germany', cap: 'Berlin', area: '~357K km²', pop: '~84M', waters: 'North Sea & Baltic Sea', res: 'Engineering, automotive, tech, chemicals' }
        },
        en: {
            flag: '🇬🇧',
            ru: { name: 'Великобритания', cap: 'Лондон', area: '~243 тыс. км²', pop: '~68 млн', waters: 'Атлантический океан, Северное и Ирландское моря', res: 'Финансы, технологии, нефть и газ, фармацевтика' },
            en: { name: 'United Kingdom', cap: 'London', area: '~243K km²', pop: '~68M', waters: 'Atlantic Ocean, North & Irish seas', res: 'Finance, tech, North Sea oil & gas, pharma' }
        },
        ar: {
            flag: '🇦🇪',
            ru: { name: 'ОАЭ', cap: 'Абу-Даби', area: '~83,6 тыс. км²', pop: '~10 млн', waters: 'Персидский и Оманский заливы', res: 'Нефть, газ, финансы, торговля, туризм' },
            en: { name: 'UAE', cap: 'Abu Dhabi', area: '~83.6K km²', pop: '~10M', waters: 'Persian Gulf & Gulf of Oman', res: 'Oil, gas, finance, trade, tourism' }
        },
        it: {
            flag: '🇮🇹',
            ru: { name: 'Италия', cap: 'Рим', area: '~301 тыс. км²', pop: '~59 млн', waters: 'Средиземное, Адриатическое и Тирренское моря', res: 'Машиностроение, мода, дизайн, туризм, виноделие' },
            en: { name: 'Italy', cap: 'Rome', area: '~301K km²', pop: '~59M', waters: 'Mediterranean, Adriatic & Tyrrhenian seas', res: 'Machinery, fashion, design, tourism, food' }
        },
        es: {
            flag: '🇪🇸',
            ru: { name: 'Испания', cap: 'Мадрид', area: '~506 тыс. км²', pop: '~48 млн', waters: 'Атлантический океан, Средиземное море', res: 'Туризм, энергетика, сельское хозяйство, автопром' },
            en: { name: 'Spain', cap: 'Madrid', area: '~506K km²', pop: '~48M', waters: 'Atlantic Ocean, Mediterranean Sea', res: 'Tourism, renewables, agriculture, automotive' }
        },
        fr: {
            flag: '🇫🇷',
            ru: { name: 'Франция', cap: 'Париж', area: '~551 тыс. км²', pop: '~68 млн', waters: 'Атлантический океан, Средиземное море, Ла-Манш', res: 'Авиация, атомная энергетика, мода, туризм, агросфера' },
            en: { name: 'France', cap: 'Paris', area: '~551K km²', pop: '~68M', waters: 'Atlantic Ocean, Mediterranean Sea, English Channel', res: 'Aerospace, nuclear energy, luxury, tourism' }
        },
        pt: {
            flag: '🇵🇹',
            ru: { name: 'Португалия', cap: 'Лиссабон', area: '~92 тыс. км²', pop: '~10,5 млн', waters: 'Атлантический океан', res: 'Туризм, пробка, вино, текстиль, IT' },
            en: { name: 'Portugal', cap: 'Lisbon', area: '~92K km²', pop: '~10.5M', waters: 'Atlantic Ocean', res: 'Tourism, cork, wine, textiles, tech' }
        },
        ja: {
            flag: '🇯🇵',
            ru: { name: 'Япония', cap: 'Токио', area: '~378 тыс. км²', pop: '~124 млн', waters: 'Тихий океан, Японское море', res: 'Робототехника, электроника, автопром, рыболовство' },
            en: { name: 'Japan', cap: 'Tokyo', area: '~378K km²', pop: '~124M', waters: 'Pacific Ocean, Sea of Japan', res: 'Robotics, electronics, automotive, fisheries' }
        },
        zh: {
            flag: '🇨🇳',
            ru: { name: 'Китай', cap: 'Пекин', area: '~9,6 млн км²', pop: '~1,41 млрд', waters: 'Жёлтое, Восточно- и Южно-Китайское моря', res: 'Производство, технологии, редкоземельные металлы, торговля' },
            en: { name: 'China', cap: 'Beijing', area: '~9.6M km²', pop: '~1.41B', waters: 'Yellow, East & South China seas', res: 'Manufacturing, tech, rare earth metals, trade' }
        }
    };

    const BAD_PATTERNS = [
        /(^|[^а-яёa-z])(бля(д|т|ть)?|сук(а|и|у)|хуй|хуя|хуе|пизд|еба(ть|л|н|ну)|ёб|ебл|мудак|мудил|пидор|пидар|гандон|шлюх|уеб|мразь|тварь|дебил|идиот|долбоеб|долбоёб)(?=$|[^а-яёa-z])/i,
        /(^|[^a-z])(fuck|fucker|fucking|shit|bitch|asshole|bastard|cunt|dickhead|motherfucker|slut|whore)(?=$|[^a-z])/i,
        /(^|[^a-zğüşıöçə])(siktir|orospu|amına|amina|pezevenk|götveren|sikim|qəhbə|qehbe|gijdıllaq|gijdillaq|oğraş|ogras|pox)(?=$|[^a-zğüşıöçə])/i,
        /(^|[^а-яёқғңұүһөі])(шешең|қотақ|амшық|сігейін|көт|мақұлық)(?=$|[^а-яёқғңұүһөі])/i,
        /(^|[^a-zäöüß])(arschloch|hurensohn|fotze|wichser|scheiße|scheisse|verpiss)(?=$|[^a-zäöüß])/i
    ];

    const CM = {
        mounted: false,
        isTabActive: false,
        filter: 'open',
        roomsMap: { ...STARTER_COMMUNITIES },
        activeRoomId: null,
        renderedRoomId: null,
        rulesExpanded: false,
        globalBanned: false,
        lastUiLang: '',

        // Firebase refs
        metaListenerBound: false,
        inviteListenerBound: false,
        banListenerBound: false,
        msgRef: null,
        msgListener: null,
        langRef: null,
        langListener: null,
        roomMetaRef: null,
        roomMetaListener: null,
        liveLangs: {},
        seenMsgKeys: new Set(),

        recentSends: [],

        // Isolated Mic engine (Voice-to-Text only, 1-to-1 with chat.js)
        micActive: false,
        recognition: null,
        restartTimer: null,
        silenceTimer: null,
        watchdog: null,
        pendingInterim: '',
        lastSentNorm: '',
        lastSentAt: 0,
        recentSend: [],
        recBase: 'en',
        isManualMic: false
    };

    window.HF_COMM_WORLD = CM;

    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('hf_comm_mic_lang_')) localStorage.removeItem(k);
    });

    // ============================================================
    // 1. ХЕЛПЕРЫ ЯЗЫКА (ФИКС КАЗАХСКОГО ПО ПРОФИЛЮ), HTML И ПРОФИЛЯ
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

    function getMyNativeLang() {
        if (window.myProfileInfo) {
            if (typeof window.getLangByFlag === 'function') {
                const byFlag = window.getLangByFlag(window.myProfileInfo.flagCode, window.myProfileInfo.flag);
                if (byFlag) return normLang(byFlag);
            }
            if (typeof window.getSmartLang === 'function') {
                const smart = window.getSmartLang(window.myProfileInfo);
                if (smart) return normLang(smart);
            }
            const lc = normLang(window.myProfileInfo.langCode);
            if (lc) return lc;
        }
        return normLang(navigator.language) || 'en';
    }

    // Приоритет: 1) ручной выбор в меню -> 2) родной язык профиля (флаг 🇰🇿 -> kk) -> 3) язык браузера
    function getUiLang() {
        const savedPref = localStorage.getItem('hf_app_lang');
        let code = null;
        if (savedPref && savedPref !== 'auto') {
            code = savedPref;
        } else if (window.appLang && window.appLang !== 'auto' && savedPref && savedPref !== 'auto') {
            code = window.appLang;
        } else {
            code = getMyNativeLang() || window.appLang || navigator.language || 'en';
        }
        const c = normLang(code) || 'en';
        return COMM_I18N[c] ? c : 'en';
    }

    function t(key) {
        const l = getUiLang();
        return (COMM_I18N[l] && COMM_I18N[l][key]) || COMM_I18N.en[key] || key;
    }

    function getRoomTitle(room) {
        if (!room) return 'Community';
        const starter = STARTER_COMMUNITIES[room.id];
        if (starter && starter.l10n) {
            const l = getUiLang();
            return (starter.l10n[l] && starter.l10n[l].name) || starter.l10n.en.name;
        }
        return room.name || 'Community';
    }

    function getRoomDesc(room) {
        if (!room) return '';
        const starter = STARTER_COMMUNITIES[room.id];
        if (starter && starter.l10n) {
            const l = getUiLang();
            return (starter.l10n[l] && starter.l10n[l].desc) || starter.l10n.en.desc;
        }
        return room.description || t('comm_base_rule');
    }

    function mergeCommI18n() {
        window.i18n = window.i18n || {};
        Object.keys(COMM_I18N).forEach(lang => {
            window.i18n[lang] = Object.assign({}, window.i18n[lang] || {}, COMM_I18N[lang]);
        });
        if (window.i18n.kk) {
            window.i18n.kz = Object.assign({}, window.i18n.kz || {}, window.i18n.kk);
        }
        syncBottomNavLabel();
    }

    function syncBottomNavLabel() {
        const btns = document.querySelectorAll('[data-hf-nav-target="7"], [onclick*="switchTab(7)"]');
        const label = t('comm_title');
        btns.forEach(btn => {
            const spans = btn.querySelectorAll('span');
            if (spans.length > 0) spans[spans.length - 1].textContent = label;
        });
    }

    function getMyCountryKey() {
        const p = window.myProfileInfo || {};
        const byFlagCode = normLang(p.flagCode || p.countryCode || p.country);
        if (byFlagCode && COUNTRY_FACTS[byFlagCode]) return byFlagCode;
        if (p.flag) {
            const match = Object.keys(COUNTRY_FACTS).find(k => COUNTRY_FACTS[k].flag === p.flag);
            if (match) return match;
        }
        const nat = getMyNativeLang();
        return COUNTRY_FACTS[nat] ? nat : 'en';
    }

    function getMyNativeFlag() {
        if (window.myProfileInfo && window.myProfileInfo.flag && window.myProfileInfo.flag !== '🌐') {
            return window.myProfileInfo.flag;
        }
        const ck = getMyCountryKey();
        return (COUNTRY_FACTS[ck] && COUNTRY_FACTS[ck].flag) || '🇬🇧';
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

    function mergeRoomsMap(dbRooms) {
        const merged = {};
        Object.keys(STARTER_COMMUNITIES).forEach(id => {
            merged[id] = Object.assign({}, STARTER_COMMUNITIES[id]);
        });
        if (dbRooms && typeof dbRooms === 'object') {
            Object.keys(dbRooms).forEach(id => {
                if (id === 'club_global_lounge') return;
                const dbItem = dbRooms[id];
                if (dbItem && typeof dbItem === 'object') {
                    const base = merged[id] || {};
                    merged[id] = Object.assign({}, base, dbItem, {
                        id: dbItem.id || base.id || id,
                        icon: base.icon || dbItem.icon || '💬',
                        type: dbItem.type || base.type || 'open'
                    });
                }
            });
        }
        return merged;
    }

    // ============================================================
    // 2. СТИЛИ МОДУЛЯ
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
                display: flex; align-items: center; gap: 7px;
            }
            #comm-info-marquee {
                display: inline-block; padding-left: 100%;
                animation: hfCommMarquee 18s linear infinite;
                font-size: 0.76rem; color: #00a884; font-weight: 600;
            }
            @keyframes hfCommMarquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-100%); }
            }
            #hf-comm-fan {
                width: 60px; flex-shrink: 0; background: #0d171d;
                border-right: 1px solid #202c33; overflow-y: auto;
                display: flex; flex-direction: column; align-items: center;
                gap: 10px; padding: 10px 4px;
            }
            #hf-comm-fan::-webkit-scrollbar { display: none; }
            #hf-cmic-pill {
                display: none; align-items: center; gap: 8px;
                width: calc(100% - 14px); margin: 4px auto 6px auto;
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
            .hf-comm-popup {
                display: none; position: absolute; bottom: 62px; z-index: 82;
                background: #111b21; border: 1.5px solid #00a884;
                border-radius: 16px; padding: 12px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.75);
                flex-direction: column; gap: 8px;
            }
            .hf-comm-popup.active { display: flex; }
            #hf-cmic-card { right: 10px; width: 240px; }
            #hf-comm-attach-menu { left: 10px; width: 220px; }
            .hf-comm-modal-bg {
                position: absolute; inset: 0; z-index: 95;
                background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(4px);
                display: none; align-items: center; justify-content: center; padding: 14px;
            }
            .hf-comm-modal-bg.active { display: flex; }
        `;
        document.head.appendChild(st);
    }

    // ============================================================
    // 3. МОДЕРАЦИЯ: АНТИМАТ, АНТИСПАМ И 3-УРОВНЕВЫЕ БЛОКИРОВКИ
    // ============================================================
    function checkViolation(text) {
        const clean = String(text || '').trim();
        if (!clean) return null;
        for (let i = 0; i < BAD_PATTERNS.length; i++) {
            if (BAD_PATTERNS[i].test(clean)) return 'profanity';
        }
        const now = Date.now();
        const norm = clean.toLowerCase().replace(/\s+/g, ' ');
        CM.recentSends = CM.recentSends.filter(x => (now - x.t) < 6000);
        const fastCount = CM.recentSends.filter(x => (now - x.t) < 4000).length;
        const dupCount = CM.recentSends.filter(x => x.m === norm).length;
        if (fastCount >= 4 || dupCount >= 2 || /(.)\1{14,}/.test(clean)) return 'spam';
        CM.recentSends.push({ t: now, m: norm });
        return null;
    }

    async function enforceAutoBan(roomId) {
        const myId = getMyId();
        if (!roomId || !myId || typeof firebase === 'undefined' || !firebase.database) return;
        const db = firebase.database();
        try {
            await db.ref(`communities_meta/${roomId}/banned/${myId}`).set(true);
            await db.ref(`communities_meta/${roomId}/members/${myId}`).remove();
            await db.ref(`communities_strikes/${myId}/${roomId}`).set(Date.now());
            const snap = await db.ref(`communities_strikes/${myId}`).once('value');
            const strikes = snap.val() ? Object.keys(snap.val()).length : 1;
            if (strikes >= 3) {
                await db.ref(`communities_global_bans/${myId}`).set(true);
                CM.globalBanned = true;
            }
        } catch (e) {}

        if (window.showToast) window.showToast(t('comm_title'), t('comm_banned_room'), '', '');
        else alert(t('comm_banned_room'));
        window.leaveCommunityRoom();
    }

    // ============================================================
    // 4. ПРИСУТСТВИЕ, ВЕЕР И ЗЕРКАЛЬНЫЕ ПЕРЕВОДЫ КОМНАТЫ
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

    function getRoomActiveMembers(room, excludeSelf = false) {
        if (!room) return [];
        const myId = getMyId();
        const banned = room.banned || {};
        const allowedIds = new Set();

        if (myId && !banned[myId]) allowedIds.add(myId);
        if (room.creatorId && room.creatorId !== 'system' && !banned[String(room.creatorId)]) {
            allowedIds.add(String(room.creatorId));
        }
        if (room.members && typeof room.members === 'object') {
            Object.keys(room.members).forEach(uid => {
                if (room.members[uid] && !banned[String(uid)]) allowedIds.add(String(uid));
            });
        }
        if (room.type !== 'private' && CM.liveLangs) {
            Object.keys(CM.liveLangs).forEach(uid => {
                if (!banned[String(uid)]) allowedIds.add(String(uid));
            });
        }

        const byId = {};
        (window.participants || []).forEach(p => {
            if (p && p.id && p.id !== 'ai') byId[String(p.id)] = p;
        });

        const list = [];
        if (!excludeSelf && myId && allowedIds.has(myId)) {
            list.push({
                id: myId, isMe: true, online: true,
                name: (window.myUsername || t('comm_you')).split(' ')[0],
                photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=Me',
                flag: getMyCommFlag('avatar'),
                langCode: getMyNativeLang()
            });
        }

        allowedIds.forEach(uid => {
            if (uid === myId) return;
            const p = byId[uid];
            const memberMeta = (room.memberProfiles && room.memberProfiles[uid]) || {};
            const live = CM.liveLangs && CM.liveLangs[uid];
            const flag = (live && live.avatar && live.avatar.flag) || (p && p.flag) || memberMeta.flag || '🌐';
            const name = ((p && p.name) || memberMeta.name || 'User').split(' ')[0];
            const photo = (p && p.photo) || memberMeta.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);
            const langCode = (p && (typeof window.getSmartLang === 'function' ? window.getSmartLang(p) : p.langCode)) || memberMeta.langCode || 'en';
            list.push({
                id: uid, isMe: false,
                online: Boolean(live && live.presence && live.presence.online),
                name, photo, flag, langCode
            });
        });

        return list;
    }

    function renderLeftFan() {
        const fan = document.getElementById('hf-comm-fan');
        const room = CM.roomsMap[CM.activeRoomId];
        if (!fan || !room) return;

        const members = getRoomActiveMembers(room, false);
        const countEl = document.getElementById('hf-comm-member-count');
        if (countEl) {
            const typeText = room.type === 'private' ? ('🔒 ' + t('comm_private')) : ('🌍 ' + t('comm_open'));
            countEl.textContent = `${typeText} • ${members.length} ${t('comm_members_count')}`;
        }

        let html = '';
        members.forEach(m => {
            const clickAct = m.isMe
                ? `window.openCommLangModal('avatar')`
                : `if(window.openAvatarModal) window.openAvatarModal('${esc(m.id)}')`;
            const ring = m.isMe ? 'border-[#00a884]' : (m.online ? 'border-emerald-400' : 'border-[#2a3942]');
            html += `
                <div onclick="${clickAct}" class="flex flex-col items-center gap-0.5 cursor-pointer w-full group" title="${esc(m.name)}">
                    <div class="relative">
                        <img src="${esc(m.photo)}" class="w-10 h-10 rounded-full object-cover border-2 ${ring} group-hover:scale-105 transition">
                        <span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none">${esc(m.flag)}</span>
                        ${m.online ? '<span class="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#0d171d]"></span>' : ''}
                    </div>
                    <span class="text-[0.6rem] text-[#aebac1] truncate max-w-[52px] text-center">${esc(m.name)}</span>
                </div>
            `;
        });
        fan.innerHTML = html;

        const waitEl = document.getElementById('hf-comm-waiting-hint');
        if (waitEl) {
            waitEl.classList.toggle('hidden', members.length > 1 || CM.seenMsgKeys.size > 0);
        }
    }

    async function buildCommMirrorPacket(roomId, origText, senderLang, channel, senderId) {
        const cleanText = String(origText || '').trim();
        if (!cleanText) return { mirrorFan: [], mirrorMarquee: '' };

        const room = CM.roomsMap[roomId];
        const scopedMembers = getRoomActiveMembers(room, true);
        if (scopedMembers.length === 0) return { mirrorFan: [], mirrorMarquee: cleanText };

        const targetUsers = [];
        const neededLangs = new Set();

        scopedMembers.forEach(member => {
            const mLiveAll = CM.liveLangs ? CM.liveLangs[String(member.id)] : null;
            const live = mLiveAll ? mLiveAll[channel] : null;
            const mFlag = (live && live.flag) ? live.flag : (member.flag || '🌐');
            const mLang = (live && live.langCode) ? normLang(live.langCode) : normLang(member.langCode);

            if (mLang && mLang !== 'un') {
                targetUsers.push({ userId: String(member.id), code: mLang, flag: mFlag, photo: member.photo });
                if (mLang !== senderLang) neededLangs.add(mLang);
            }
        });

        const transCache = {};
        if (senderLang) transCache[senderLang] = cleanText;

        await Promise.all(Array.from(neededLangs).map(async (langCode) => {
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
    // 5. ОТРИСОВКА КАТАЛОГА И ЭКРАНА КОМНАТЫ
    // ============================================================
    function canSeeRoom(room) {
        if (!room || typeof room !== 'object') return false;
        const myId = getMyId();
        if (myId && room.banned && room.banned[myId]) return false;
        if (room.type !== 'private') return true;
        if (!myId) return false;
        if (String(room.creatorId) === myId) return true;
        if (room.members && room.members[myId]) return true;
        return false;
    }

    function renderRoot(forceRedraw = false) {
        const page = document.getElementById('communities-page');
        if (!page) return;
        injectStyles();
        syncBottomNavLabel();

        if (!document.getElementById('hf-comm-root')) {
            page.innerHTML = `<div id="hf-comm-root"></div>`;
            CM.renderedRoomId = null;
        }
        CM.mounted = true;

        if (CM.globalBanned) {
            renderGlobalBannedView();
            return;
        }

        if (CM.activeRoomId && CM.roomsMap[CM.activeRoomId] && canSeeRoom(CM.roomsMap[CM.activeRoomId])) {
            const msgBox = document.getElementById('comm-chat-messages');
            if (!forceRedraw && CM.renderedRoomId === CM.activeRoomId && msgBox) {
                renderLeftFan();
                msgBox.scrollTop = msgBox.scrollHeight;
                return;
            }
            if (forceRedraw) {
                window.openCommunityRoom(CM.activeRoomId);
                return;
            }
            renderRoomView(CM.roomsMap[CM.activeRoomId]);
        } else {
            CM.activeRoomId = null;
            CM.renderedRoomId = null;
            renderCatalogView();
        }
    }

    function renderGlobalBannedView() {
        const root = document.getElementById('hf-comm-root');
        if (!root) return;
        root.innerHTML = `
            <div class="flex items-center justify-between px-3.5 py-3 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                    <i class="fa-solid fa-users text-[#00a884]"></i> ${esc(t('comm_title'))}
                </h2>
            </div>
            <div class="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                <div class="w-14 h-14 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-2xl text-red-400">
                    <i class="fa-solid fa-ban"></i>
                </div>
                <div class="text-sm font-bold text-red-400 max-w-xs">${esc(t('comm_banned_global'))}</div>
            </div>
        `;
    }

    function renderCatalogView() {
        const root = document.getElementById('hf-comm-root');
        if (!root) return;
        CM.renderedRoomId = null;

        const allRooms = Object.values(CM.roomsMap)
            .filter(r => r && canSeeRoom(r) && (CM.filter === 'open' ? r.type !== 'private' : r.type === 'private'))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        let cardsHtml = '';
        if (allRooms.length === 0) {
            cardsHtml = `<div class="text-center text-xs text-[#8696a0] py-12 px-5">${esc(t('comm_empty_priv'))}</div>`;
        } else {
            allRooms.forEach(r => {
                const badge = r.type === 'private'
                    ? `<span class="text-[0.62rem] px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-500/40 shrink-0">🔒 ${esc(t('comm_private'))}</span>`
                    : `<span class="text-[0.62rem] px-2 py-0.5 rounded-full bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/40 shrink-0">${r.isRulesRoom ? '🛡️' : '🌍'} ${esc(t('comm_open'))}</span>`;
                cardsHtml += `
                    <div onclick="window.openCommunityRoom('${esc(r.id)}')" class="bg-[#111b21] border ${r.isRulesRoom ? 'border-[#00a884]/60' : 'border-[#2a3942]'} hover:border-[#00a884] rounded-2xl p-3.5 cursor-pointer transition flex items-start gap-3 shadow-sm">
                        <div class="w-11 h-11 rounded-xl bg-[#202c33] flex items-center justify-center text-2xl shrink-0">${esc(r.icon || '💬')}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <h3 class="text-sm font-bold text-white truncate">${esc(getRoomTitle(r))}</h3>
                                ${badge}
                            </div>
                            <p class="text-xs text-[#8696a0] mt-1 line-clamp-2">${esc(getRoomDesc(r))}</p>
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
                        <option value="private">🔒 ${esc(t('comm_type_priv'))}</option>
                        <option value="open">🌍 ${esc(t('comm_type_open'))}</option>
                    </select>
                    <input id="hf-comm-new-desc" type="text" placeholder="${esc(t('comm_desc_ph'))}" class="bg-[#202c33] border border-[#2a3942] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00a884]">
                    <div class="bg-[#0b141a] border border-[#2a3942] rounded-xl px-3 py-2 text-[0.7rem] text-[#8696a0] leading-snug">
                        🛡️ ${esc(t('comm_base_rule'))}
                    </div>
                    <div class="flex gap-2 mt-1">
                        <button onclick="window.closeCreateCommunityModal()" class="flex-1 py-2.5 rounded-xl bg-[#202c33] text-[#8696a0] text-xs font-bold">${esc(t('comm_btn_cancel'))}</button>
                        <button onclick="window.submitCreateCommunity()" class="flex-1 py-2.5 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold">${esc(t('comm_btn_create'))}</button>
                    </div>
                </div>
            </div>
        `;
    }

    function buildMicCardOptionsHtml() {
        const rId = CM.activeRoomId;
        const cur = rId ? (localStorage.getItem('hf_comm_mic_lang_' + rId) || 'auto') : 'auto';
        let opts = `<option value="auto" ${cur === 'auto' ? 'selected' : ''}>${getMyNativeFlag()} ${esc(t('comm_auto'))}</option>`;
        Object.keys(COMM_LANG_MAP).forEach(code => {
            const it = COMM_LANG_MAP[code];
            opts += `<option value="${code}" ${cur === code ? 'selected' : ''}>${it.flag} ${it.name}</option>`;
        });
        return opts;
    }

    function renderRoomView(room) {
        const root = document.getElementById('hf-comm-root');
        if (!root) return;
        CM.renderedRoomId = room.id;
        const isCreator = getMyId() && String(room.creatorId) === getMyId();
        const myCountryFlag = getMyNativeFlag();
        const rTitle = getRoomTitle(room);
        const rDesc = getRoomDesc(room);

        root.innerHTML = `
            <div class="flex items-center justify-between gap-2 px-3 py-2.5 bg-[#111b21] border-b border-[#202c33] shrink-0">
                <div class="flex items-center gap-2.5 min-w-0">
                    <button onclick="window.leaveCommunityRoom()" class="w-8 h-8 rounded-full bg-[#202c33] text-white flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                    <span class="text-xl shrink-0">${esc(room.icon || '💬')}</span>
                    <div class="min-w-0">
                        <div class="text-sm font-bold text-white truncate">${esc(rTitle)}</div>
                        <div id="hf-comm-member-count" class="text-[0.65rem] text-[#00a884] truncate"></div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="window.toggleCommRules()" class="px-2.5 py-1.5 rounded-xl bg-[#202c33] text-[#e9edef] text-[0.68rem] font-bold border border-[#2a3942]">
                        📌 ${esc(t('comm_rules_btn'))}
                    </button>
                    ${isCreator ? `<button onclick="window.openCommModModal()" class="w-8 h-8 rounded-xl bg-[#202c33] text-amber-400 border border-[#2a3942] flex items-center justify-center" title="${esc(t('comm_mod_title'))}"><i class="fa-solid fa-shield-halved text-xs"></i></button>` : ''}
                    <button onclick="window.openCommInviteModal()" class="px-2.5 py-1.5 rounded-xl bg-[#00a884] text-[#111b21] text-[0.72rem] font-extrabold" title="${esc(t('comm_invite_btn'))}">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
            </div>

            <div class="bg-[#111b21]/90 border-b border-[#202c33] px-3 py-1.5 shrink-0">
                <div class="flex items-center justify-between gap-2">
                    <div onclick="window.toggleCommRules()" class="text-[0.72rem] text-[#8696a0] truncate cursor-pointer flex-1">
                        📌 ${esc(rDesc)}
                    </div>
                    <button onclick="window.openCommCountryModal()" class="w-7 h-7 rounded-full bg-[#202c33] border border-[#2a3942] hover:border-[#00a884] flex items-center justify-center text-sm shrink-0 transition" title="Country Info">
                        ${esc(myCountryFlag)}
                    </button>
                </div>
                <div id="hf-comm-rules-box" class="${CM.rulesExpanded ? '' : 'hidden'} mt-1.5 pt-1.5 border-t border-[#2a3942] text-[0.72rem] text-[#e9edef] leading-relaxed">
                    🛡️ ${esc(t('comm_base_rule'))}
                </div>
            </div>

            <div class="hf-comm-marquee-wrap">
                <span class="px-1.5 py-0.5 rounded bg-[#00a884] text-[#111b21] text-[0.6rem] font-extrabold shrink-0">CC</span>
                <div class="flex-1 overflow-hidden">
                    <div id="comm-info-marquee">${esc(room.icon || '💬')} ${esc(rTitle)} • ${esc(t('comm_marquee_ready'))}</div>
                </div>
            </div>

            <div class="flex flex-1 min-h-0 overflow-hidden relative">
                <div id="hf-comm-fan"></div>

                <div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
                    <div id="hf-comm-waiting-hint" class="mx-3 mt-3 p-3 rounded-2xl bg-[#111b21] border border-[#2a3942] text-xs text-[#8696a0] text-center leading-relaxed">
                        ${esc(t('comm_waiting'))}
                    </div>
                    <div id="comm-chat-messages" class="flex-1 overflow-y-auto px-2.5 py-2 flex flex-col"></div>

                    <div id="hf-cmic-pill">
                        <span id="hf-cmic-dot"></span>
                        <span id="hf-cmic-flag" class="text-sm shrink-0 cursor-pointer" onclick="window.onCommMicBtnClick()">🌐</span>
                        <span id="hf-cmic-text" class="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-xs font-bold text-white"></span>
                        <button type="button" onclick="window.stopCommMic(false)" class="bg-red-500 text-white rounded-full px-3 py-1 text-[0.7rem] font-extrabold shrink-0">${esc(t('comm_stop'))}</button>
                    </div>
                </div>
            </div>

            <div id="hf-comm-attach-menu" class="hf-comm-popup">
                <button type="button" onclick="window.triggerCommFile('image/*')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#202c33] hover:border-[#00a884] border border-[#2a3942] text-xs text-white font-bold">
                    <i class="fa-solid fa-image text-emerald-400 w-4"></i> ${esc(t('comm_photo'))}
                </button>
                <button type="button" onclick="window.triggerCommFile('video/*')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#202c33] hover:border-[#00a884] border border-[#2a3942] text-xs text-white font-bold">
                    <i class="fa-solid fa-video text-purple-400 w-4"></i> ${esc(t('comm_video'))}
                </button>
                <button type="button" onclick="window.triggerCommFile('audio/*')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#202c33] hover:border-[#00a884] border border-[#2a3942] text-xs text-white font-bold">
                    <i class="fa-solid fa-music text-amber-400 w-4"></i> ${esc(t('comm_audio'))}
                </button>
                <button type="button" onclick="window.triggerCommFile('*/*')" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#202c33] hover:border-[#00a884] border border-[#2a3942] text-xs text-white font-bold">
                    <i class="fa-solid fa-file-lines text-blue-400 w-4"></i> ${esc(t('comm_doc'))}
                </button>
                <button type="button" onclick="window.sendCommLocation()" class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#202c33] hover:border-[#00a884] border border-[#2a3942] text-xs text-white font-bold">
                    <i class="fa-solid fa-location-dot text-red-400 w-4"></i> ${esc(t('comm_loc'))}
                </button>
            </div>

            <div id="hf-cmic-card" class="hf-comm-popup">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-bold text-[#00a884] flex items-center gap-1.5">
                        <i class="fa-solid fa-microphone"></i> ${esc(t('comm_mic_title'))}
                    </div>
                    <button type="button" onclick="window.closeCommPopups()" class="text-[#8696a0] hover:text-white text-sm px-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <select id="hf-cmic-lang-select" onchange="window.onCommMicLangSelect(this.value)" class="w-full bg-[#1f2c34] border border-[#2a3942] rounded-xl px-2.5 py-2 text-xs text-white font-semibold outline-none focus:border-[#00a884]">
                    ${buildMicCardOptionsHtml()}
                </select>
                <button type="button" onclick="window.startCommMic()" class="w-full py-2.5 px-3 rounded-xl bg-[#00a884] text-[#111b21] text-xs font-extrabold flex items-center justify-center gap-2 hover:opacity-90 transition">
                    <i class="fa-solid fa-microphone"></i> ${esc(t('comm_stt_btn'))}
                </button>
            </div>

            <input id="comm-file-input" type="file" class="hidden" onchange="window.handleCommFileAttach(event)">

            <div class="flex items-center gap-1.5 px-2 py-2 bg-[#111b21] border-t border-[#202c33] shrink-0">
                <button type="button" onclick="window.toggleCommAttachMenu()" class="w-9 h-9 rounded-full bg-[#202c33] border border-[#2a3942] text-[#8696a0] hover:text-white flex items-center justify-center shrink-0" title="Attach">
                    <i class="fa-solid fa-paperclip text-sm"></i>
                </button>

                <div class="flex-1 flex items-center bg-[#202c33] border border-[#2a3942] focus-within:border-[#00a884] rounded-full px-2.5 py-1.5 gap-1.5 min-w-0">
                    <button type="button" onclick="window.openCommEmojiPicker()" class="text-[#8696a0] hover:text-yellow-400 shrink-0 px-0.5">
                        <i class="fa-regular fa-face-smile text-base"></i>
                    </button>
                    <input id="comm-chat-input" type="text" placeholder="${esc(t('comm_msg_ph'))}" class="flex-1 min-w-0 bg-transparent text-sm text-white outline-none">
                    <button type="button" onclick="window.openCommTrashModal()" class="text-[#8696a0] hover:text-red-400 shrink-0 px-0.5" title="${esc(t('comm_trash_title'))}">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>

                <button id="hf-comm-mic-btn" type="button" onclick="window.onCommMicBtnClick()" class="w-9 h-9 rounded-full bg-[#202c33] border border-[#2a3942] text-[#00a884] flex items-center justify-center shrink-0 transition">
                    <i class="fa-solid fa-microphone"></i>
                </button>
                <button type="button" onclick="window.sendCommMsg()" class="w-9 h-9 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </div>

            <div id="hf-comm-lang-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-invite-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-country-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-mod-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-trash-modal" class="hf-comm-modal-bg" onclick="if(event.target===this) this.classList.remove('active')"></div>
            <div id="hf-comm-img-modal" class="hf-comm-modal-bg" onclick="this.classList.remove('active')"></div>
        `;

        renderLeftFan();

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

    window.closeCommPopups = function () {
        document.getElementById('hf-cmic-card')?.classList.remove('active');
        document.getElementById('hf-comm-attach-menu')?.classList.remove('active');
        if (typeof window.closeEmojiPicker === 'function') window.closeEmojiPicker();
    };

    // ============================================================
    // 6. СПРАВКА ПО СВОЕЙ СТРАНЕ
    // ============================================================
    window.openCommCountryModal = async function () {
        const modal = document.getElementById('hf-comm-country-modal');
        if (!modal) return;

        const cKey = getMyCountryKey();
        const uiLang = getUiLang();
        const item = COUNTRY_FACTS[cKey] || COUNTRY_FACTS.en;

        let info = item[uiLang];
        if (!info) {
            const cacheKey = `hf_cinfo_v1_${cKey}_${uiLang}`;
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) info = JSON.parse(cached);
            } catch (e) {}

            if (!info) {
                const base = item.en || item.ru;
                modal.innerHTML = `<div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-5 text-center text-xs text-[#8696a0]">...</div>`;
                modal.classList.add('active');
                const [name, cap, area, pop, waters, res] = await Promise.all([
                    translateText(base.name, uiLang),
                    translateText(base.cap, uiLang),
                    translateText(base.area, uiLang),
                    translateText(base.pop, uiLang),
                    translateText(base.waters, uiLang),
                    translateText(base.res, uiLang)
                ]);
                info = { name, cap, area, pop, waters, res };
                try { localStorage.setItem(cacheKey, JSON.stringify(info)); } catch (e) {}
            }
        }

        modal.innerHTML = `
            <div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-4 shadow-2xl flex flex-col gap-3">
                <div class="flex items-center justify-between border-b border-[#202c33] pb-2">
                    <div class="text-sm font-bold text-white flex items-center gap-2">
                        <span class="text-xl">${esc(item.flag)}</span>
                        <span>${esc(info.name)}</span>
                    </div>
                    <button type="button" onclick="document.getElementById('hf-comm-country-modal').classList.remove('active')" class="text-[#8696a0] hover:text-white px-1">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="flex flex-col gap-2 text-xs text-[#e9edef]">
                    <div><span class="text-[#00a884] font-bold">${esc(t('comm_c_cap'))}:</span> ${esc(info.cap)}</div>
                    <div><span class="text-[#00a884] font-bold">${esc(t('comm_c_area'))}:</span> ${esc(info.area)}</div>
                    <div><span class="text-[#00a884] font-bold">${esc(t('comm_c_pop'))}:</span> ${esc(info.pop)}</div>
                    <div><span class="text-[#00a884] font-bold">${esc(t('comm_c_waters'))}:</span> ${esc(info.waters)}</div>
                    <div><span class="text-[#00a884] font-bold">${esc(t('comm_c_res'))}:</span> ${esc(info.res)}</div>
                </div>
            </div>
        `;
        modal.classList.add('active');
    };

    // ============================================================
    // 7. ФИЛЬТР, СОЗДАНИЕ, ВХОД, ВЫХОД, ПРИГЛАШЕНИЯ, МОДЕРАЦИЯ
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
        if (CM.globalBanned) return;
        const nameEl = document.getElementById('hf-comm-new-name');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) return nameEl?.focus();

        const icon = (document.getElementById('hf-comm-new-icon')?.value || '💬').trim() || '💬';
        const type = document.getElementById('hf-comm-new-type')?.value === 'open' ? 'open' : 'private';
        const desc = (document.getElementById('hf-comm-new-desc')?.value || '').trim() || name;
        const myId = getMyId() || 'guest';
        const roomId = 'club_' + Date.now();

        const myMeta = {
            name: (window.myUsername || 'User').split(' ')[0],
            photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
            flag: getMyNativeFlag(),
            langCode: getMyNativeLang()
        };

        const roomObj = {
            id: roomId, icon, name, type, description: desc,
            creatorId: myId,
            members: { [myId]: true },
            memberProfiles: { [myId]: myMeta },
            banned: {},
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
        if (!roomId || CM.globalBanned) return;

        if (!CM.roomsMap[roomId] && typeof firebase !== 'undefined' && firebase.database) {
            try {
                const snap = await firebase.database().ref('communities_meta/' + roomId).once('value');
                const val = snap.val();
                if (val && typeof val === 'object') {
                    const base = STARTER_COMMUNITIES[roomId] || {};
                    CM.roomsMap[roomId] = Object.assign({}, base, val, { id: roomId });
                }
            } catch (e) {}
        }

        const room = CM.roomsMap[roomId];
        if (!room || !canSeeRoom(room)) return;

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
        CM.rulesExpanded = Boolean(room.isRulesRoom);
        CM.seenMsgKeys.clear();
        CM.liveLangs = {};
        CM.recentSends = [];

        renderRoomView(room);

        if (typeof firebase !== 'undefined' && firebase.database) {
            setMyRoomPresence(roomId, true);
            syncMyCommChannelLang(roomId, 'avatar');
            syncMyCommChannelLang(roomId, 'mic');

            CM.roomMetaRef = firebase.database().ref('communities_meta/' + roomId);
            CM.roomMetaListener = CM.roomMetaRef.on('value', (snap) => {
                const updated = snap.val();
                if (!updated) return;
                const base = STARTER_COMMUNITIES[roomId] || {};
                CM.roomsMap[roomId] = Object.assign({}, base, updated, { id: roomId });
                const myId = getMyId();
                if (myId && updated.banned && updated.banned[myId]) {
                    if (window.showToast) window.showToast(t('comm_title'), t('comm_banned_by_owner'), '', '');
                    window.leaveCommunityRoom();
                    return;
                }
                renderLeftFan();
            });

            CM.langRef = firebase.database().ref('communities_active_langs/' + roomId);
            CM.langListener = CM.langRef.on('value', (snap) => {
                CM.liveLangs = snap.val() || {};
                renderLeftFan();
            });

            CM.msgRef = firebase.database().ref('communities_messages/' + roomId);
            CM.msgListener = CM.msgRef.limitToLast(60).on('child_added', handleIncomingCommMsg);
        }
    };

    function detachRoomListeners() {
        const prevId = CM.activeRoomId;
        if (CM.msgRef && CM.msgListener) { CM.msgRef.off('child_added', CM.msgListener); CM.msgListener = null; }
        if (CM.langRef && CM.langListener) { CM.langRef.off('value', CM.langListener); CM.langListener = null; }
        if (CM.roomMetaRef && CM.roomMetaListener) { CM.roomMetaRef.off('value', CM.roomMetaListener); CM.roomMetaListener = null; }
        if (prevId) {
            localStorage.removeItem('hf_comm_mic_lang_' + prevId);
            setMyRoomPresence(prevId, false);
        }
    }

    window.leaveCommunityRoom = function () {
        window.closeCommPopups();
        window.stopCommMic(true);
        detachRoomListeners();
        CM.activeRoomId = null;
        CM.renderedRoomId = null;
        if (CM.globalBanned) renderGlobalBannedView();
        else renderCatalogView();
    };

    window.openCommLangModal = function (channel) {
        const modal = document.getElementById('hf-comm-lang-modal');
        const rId = CM.activeRoomId;
        if (!modal || !rId) return;

        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + rId) : ('hf_comm_avatar_lang_' + rId);
        const cur = localStorage.getItem(key) || 'auto';

        let btns = `<button onclick="window.saveCommLang('${channel}','auto')" class="w-full py-2 rounded-xl text-xs font-bold mb-2 ${cur === 'auto' ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-white'}">${getMyNativeFlag()} ${esc(t('comm_auto'))}</button><div class="grid grid-cols-2 gap-1.5">`;
        Object.keys(COMM_LANG_MAP).forEach(code => {
            const item = COMM_LANG_MAP[code];
            btns += `<button onclick="window.saveCommLang('${channel}','${code}')" class="py-2 px-2 rounded-xl text-xs font-bold text-left ${cur === code ? 'bg-[#00a884] text-[#111b21]' : 'bg-[#202c33] text-white'}">${item.flag} ${item.name}</button>`;
        });
        btns += `</div>`;

        modal.innerHTML = `<div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-3.5 max-h-[80%] overflow-y-auto"><div class="text-xs font-bold text-[#00a884] mb-2.5 text-center">${esc(t('comm_lang_kb'))}</div>${btns}</div>`;
        modal.classList.add('active');
    };

    window.saveCommLang = function (channel, code) {
        const rId = CM.activeRoomId;
        if (!rId) return;
        syncMyCommChannelLang(rId, channel, code === 'auto' ? null : code);
        document.getElementById('hf-comm-lang-modal')?.classList.remove('active');
        renderLeftFan();
    };

    window.openCommInviteModal = function () {
        const modal = document.getElementById('hf-comm-invite-modal');
        const room = CM.roomsMap[CM.activeRoomId];
        if (!modal || !room) return;

        const myId = getMyId();
        const banned = room.banned || {};
        let listHtml = '';

        (window.participants || []).forEach(p => {
            if (!p || p.id === 'ai' || String(p.id) === myId) return;
            const pid = String(p.id);
            if (banned[pid]) return;
            listHtml += `
                <label class="flex items-center justify-between p-2.5 bg-[#202c33] rounded-xl border border-[#2a3942] cursor-pointer">
                    <div class="flex items-center gap-2.5">
                        <img src="${esc(p.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-8 h-8 rounded-full object-cover">
                        <span class="text-xs font-bold text-white">${esc(p.flag || '🌐')} ${esc((p.name || 'User').split(' ')[0])}</span>
                    </div>
                    <input type="checkbox" value="${esc(pid)}" class="hf-comm-inv-cb w-4 h-4 accent-[#00a884]">
                </label>
            `;
        });

        modal.innerHTML = `
            <div class="bg-[#111b21] border border-[#00a884] rounded-2xl w-full max-w-xs p-3.5 flex flex-col gap-2.5 max-h-[80%]">
                <div class="text-xs font-bold text-[#00a884]">${esc(t('comm_invite_title'))}</div>
                <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">${listHtml || `<div class="text-xs text-[#8696a0] text-center py-4">—</div>`}</div>
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
        checked.forEach(cb => {
            const targetId = cb.value;
            firebase.database().ref(`communities_invites/${targetId}`).push({
                roomId: room.id,
                roomName: getRoomTitle(room),
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

    window.openCommModModal = function () {
        const modal = document.getElementById('hf-comm-mod-modal');
        const room = CM.roomsMap[CM.activeRoomId];
        if (!modal || !room || String(room.creatorId) !== getMyId()) return;

        const others = getRoomActiveMembers(room, true);
        const bannedIds = Object.keys(room.banned || {}).filter(k => room.banned[k]);
        const byId = {};
        (window.participants || []).forEach(p => { if (p && p.id) byId[String(p.id)] = p; });

        let activeHtml = others.length ? others.map(m => `
            <div class="flex items-center justify-between p-2 bg-[#202c33] rounded-xl border border-[#2a3942]">
                <div class="flex items-center gap-2 min-w-0">
                    <img src="${esc(m.photo)}" class="w-7 h-7 rounded-full object-cover shrink-0">
                    <span class="text-xs text-white font-bold truncate">${esc(m.flag)} ${esc(m.name)}</span>
                </div>
                <button onclick="window.commBanUser('${esc(m.id)}')" class="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-[0.68rem] font-bold shrink-0">${esc(t('comm_ban'))}</button>
            </div>
        `).join('') : `<div class="text-xs text-[#8696a0] text-center py-3">${esc(t('comm_no_members'))}</div>`;

        let bannedHtml = '';
        if (bannedIds.length > 0) {
            bannedHtml = `<div class="text-[0.68rem] font-bold text-red-400 mt-2">${esc(t('comm_banned_list'))}</div>` + bannedIds.map(uid => {
                const p = byId[uid] || (room.memberProfiles && room.memberProfiles[uid]) || { name: uid, flag: '🚫' };
                return `
                    <div class="flex items-center justify-between p-2 bg-[#1a1114] rounded-xl border border-red-900/50">
                        <span class="text-xs text-[#aebac1] truncate">${esc(p.flag || '🚫')} ${esc((p.name || uid).split(' ')[0])}</span>
                        <button onclick="window.commUnbanUser('${esc(uid)}')" class="px-2.5 py-1 rounded-lg bg-[#202c33] text-[#00a884] text-[0.68rem] font-bold shrink-0">${esc(t('comm_unban'))}</button>
                    </div>
                `;
            }).join('');
        }

        modal.innerHTML = `
            <div class="bg-[#111b21] border border-amber-500/60 rounded-2xl w-full max-w-xs p-3.5 flex flex-col gap-2 max-h-[80%]">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-bold text-amber-400">🛡️ ${esc(t('comm_mod_title'))}</div>
                    <button onclick="document.getElementById('hf-comm-mod-modal').classList.remove('active')" class="text-[#8696a0] hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto flex flex-col gap-1.5">${activeHtml}${bannedHtml}</div>
            </div>
        `;
        modal.classList.add('active');
    };

    window.commBanUser = async function (targetUid) {
        const roomId = CM.activeRoomId;
        if (!roomId || !targetUid || typeof firebase === 'undefined') return;
        const db = firebase.database();
        await db.ref(`communities_meta/${roomId}/banned/${targetUid}`).set(true).catch(() => {});
        await db.ref(`communities_meta/${roomId}/members/${targetUid}`).remove().catch(() => {});
        await db.ref(`communities_strikes/${targetUid}/${roomId}`).set(Date.now()).catch(() => {});
        try {
            const snap = await db.ref(`communities_strikes/${targetUid}`).once('value');
            if (snap.val() && Object.keys(snap.val()).length >= 3) {
                await db.ref(`communities_global_bans/${targetUid}`).set(true);
            }
        } catch (e) {}
        setTimeout(() => window.openCommModModal(), 150);
    };

    window.commUnbanUser = async function (targetUid) {
        const roomId = CM.activeRoomId;
        if (!roomId || !targetUid || typeof firebase === 'undefined') return;
        const db = firebase.database();
        await db.ref(`communities_meta/${roomId}/banned/${targetUid}`).remove().catch(() => {});
        await db.ref(`communities_meta/${roomId}/members/${targetUid}`).set(true).catch(() => {});
        setTimeout(() => window.openCommModModal(), 150);
    };

    // ============================================================
    // 8. РОДНЫЕ СКРЕПКА, СМАЙЛЫ И КОРЗИНА (ИЗОЛИРОВАННЫЕ ПОД КОМНАТУ)
    // ============================================================
    window.openCommEmojiPicker = function () {
        document.getElementById('hf-cmic-card')?.classList.remove('active');
        document.getElementById('hf-comm-attach-menu')?.classList.remove('active');
        if (typeof window.toggleEmojiPicker === 'function') {
            window.toggleEmojiPicker('comm-chat-input');
        }
    };

    window.toggleCommAttachMenu = function () {
        document.getElementById('hf-cmic-card')?.classList.remove('active');
        if (typeof window.closeEmojiPicker === 'function') window.closeEmojiPicker();
        document.getElementById('hf-comm-attach-menu')?.classList.toggle('active');
    };

    window.triggerCommFile = function (acceptMask) {
        document.getElementById('hf-comm-attach-menu')?.classList.remove('active');
        const inp = document.getElementById('comm-file-input');
        if (!inp) return;
        inp.accept = acceptMask || '*/*';
        inp.click();
    };

    window.handleCommFileAttach = function (event) {
        const file = event.target && event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file || !CM.activeRoomId) return;

        const mime = file.type || '';
        const inp = document.getElementById('comm-chat-input');
        const caption = inp ? inp.value.trim() : '';
        if (inp) inp.value = '';

        if (mime.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 720;
                    let w = img.width, h = img.height;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                        else { w = Math.round(w * maxDim / h); h = maxDim; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    dispatchCommPayload(caption, 'avatar', {
                        mediaUrl: canvas.toDataURL('image/jpeg', 0.72),
                        mediaType: 'image',
                        fileName: file.name
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            alert('Max file size: 4 MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            let mediaType = 'document';
            if (mime.startsWith('video/')) mediaType = 'video';
            else if (mime.startsWith('audio/')) mediaType = 'audio';
            dispatchCommPayload(caption || file.name, 'avatar', {
                mediaUrl: e.target.result,
                mediaType,
                fileName: file.name
            });
        };
        reader.readAsDataURL(file);
    };

    window.sendCommLocation = function () {
        document.getElementById('hf-comm-attach-menu')?.classList.remove('active');
        if (!navigator.geolocation) return alert('Geolocation not supported.');
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            dispatchCommPayload('', 'avatar', {
                isLocation: true,
                mapLink: `https://www.google.com/maps?q=${lat},${lon}`,
                embedLink: `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`
            });
        }, () => alert('Location permission denied.'));
    };

    window.openCommImagePreview = function (src) {
        if (typeof window.openFullscreenImage === 'function') {
            return window.openFullscreenImage(src);
        }
        const modal = document.getElementById('hf-comm-img-modal');
        if (!modal) return;
        modal.innerHTML = `<img src="${esc(src)}" class="max-w-[92%] max-h-[85%] rounded-2xl shadow-2xl border border-[#2a3942]">`;
        modal.classList.add('active');
    };

    // Родная корзина (Архив / Очистить / Удалить) — строго для текущей комнаты сообщества
    window.openCommTrashModal = function () {
        window.closeCommPopups();
        const modal = document.getElementById('hf-comm-trash-modal');
        const room = CM.roomsMap[CM.activeRoomId];
        if (!modal || !room) return;

        modal.innerHTML = `
            <div class="bg-[#111b21] border border-[#2a3942] rounded-2xl w-full max-w-xs p-4 flex flex-col gap-2.5 shadow-2xl">
                <div class="flex items-center justify-between border-b border-[#202c33] pb-2">
                    <span class="text-xs font-bold text-white flex items-center gap-2"><i class="fa-solid fa-trash-can text-red-400"></i> ${esc(t('comm_trash_title'))}</span>
                    <button onclick="document.getElementById('hf-comm-trash-modal').classList.remove('active')" class="text-[#8696a0] hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <button onclick="window.commActionArchive()" class="w-full py-2.5 px-3 rounded-xl bg-[#202c33] border border-[#2a3942] hover:border-blue-400 text-xs font-bold text-white flex items-center gap-2.5">
                    <i class="fa-solid fa-box-archive text-blue-400"></i> ${esc(t('comm_archive_btn'))}
                </button>
                <button onclick="window.commActionClearHistory()" class="w-full py-2.5 px-3 rounded-xl bg-[#202c33] border border-[#2a3942] hover:border-amber-400 text-xs font-bold text-white flex items-center gap-2.5">
                    <i class="fa-solid fa-broom text-amber-400"></i> ${esc(t('comm_clear_btn'))}
                </button>
                <button onclick="window.commActionDeleteRoom()" class="w-full py-2.5 px-3 rounded-xl bg-red-500/15 border border-red-500/50 hover:bg-red-500/25 text-xs font-bold text-red-400 flex items-center gap-2.5">
                    <i class="fa-solid fa-trash text-red-400"></i> ${esc(t('comm_delete_btn'))}
                </button>
            </div>
        `;
        modal.classList.add('active');
    };

    window.commActionArchive = function () {
        const room = CM.roomsMap[CM.activeRoomId];
        if (!room) return;
        const archiveList = document.getElementById('archive-list');
        const emptyMsg = document.getElementById('empty-archive');
        if (emptyMsg) emptyMsg.style.display = 'none';

        const chatName = getRoomTitle(room);
        const date = new Date().toLocaleDateString();
        const uniqueId = 'comm_item_' + Date.now();
        const safeName = chatName.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        if (archiveList) {
            const archiveItem = document.createElement('div');
            archiveItem.id = uniqueId;
            archiveItem.className = 'bg-[#202c33] border border-[#2a3942] p-3 rounded-2xl flex justify-between items-center shadow-sm mb-2';
            archiveItem.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-blue-400 border border-[#2a3942]"><i class="fa-solid fa-file-zipper"></i></div>
                    <div class="flex flex-col"><span class="text-white font-bold text-sm">Backup: ${esc(chatName)}</span><span class="text-[#8696a0] text-xs">${date} • Community</span></div>
                </div>
                <button onclick="if(window.openArchiveActionMenu) window.openArchiveActionMenu(event, '${uniqueId}', 'Backup: ${safeName}', 'backup')" class="text-[#8696a0] hover:text-white transition p-2 text-xl shrink-0"><i class="fa-solid fa-ellipsis-vertical pointer-events-none"></i></button>
            `;
            archiveList.prepend(archiveItem);
        }
        document.getElementById('hf-comm-trash-modal')?.classList.remove('active');
        if (window.showToast) window.showToast('Archived', 'Saved to Cloud Repository', '', '');
        if (window.switchTab) window.switchTab(5);
    };

    window.commActionClearHistory = function () {
        const room = CM.roomsMap[CM.activeRoomId];
        if (!room) return;
        if (STARTER_COMMUNITIES[room.id]) {
            alert(t('comm_clear_denied'));
            return;
        }
        if (confirm(t('comm_clear_btn') + '?')) {
            const box = document.getElementById('comm-chat-messages');
            if (box) box.innerHTML = '';
            CM.seenMsgKeys.clear();
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('communities_messages/' + room.id).remove().catch(() => {});
            }
            document.getElementById('hf-comm-trash-modal')?.classList.remove('active');
        }
    };

    window.commActionDeleteRoom = function () {
        const room = CM.roomsMap[CM.activeRoomId];
        if (!room) return;
        if (STARTER_COMMUNITIES[room.id] || String(room.creatorId) !== getMyId()) {
            alert(t('comm_delete_denied'));
            return;
        }
        if (confirm(t('comm_delete_btn') + '?')) {
            const idToDel = room.id;
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('communities_messages/' + idToDel).remove().catch(() => {});
                firebase.database().ref('communities_meta/' + idToDel).remove().catch(() => {});
                firebase.database().ref('communities_active_langs/' + idToDel).remove().catch(() => {});
            }
            delete CM.roomsMap[idToDel];
            document.getElementById('hf-comm-trash-modal')?.classList.remove('active');
            window.leaveCommunityRoom();
        }
    };

    // ============================================================
    // 9. ОТПРАВКА И ПРИЁМ СООБЩЕНИЙ (ЧИСТЫЙ ТЕКСТ + ВЛОЖЕНИЯ, БЕЗ ОЗВУЧКИ)
    // ============================================================
    async function dispatchCommPayload(rawText, channel, extra = null) {
        const roomId = CM.activeRoomId;
        const clean = String(rawText || '').trim();
        if (!roomId || (!clean && !extra) || typeof firebase === 'undefined') return;

        if (clean) {
            const violation = checkViolation(clean);
            if (violation) {
                await enforceAutoBan(roomId);
                return;
            }
        }

        const key = (channel === 'mic') ? ('hf_comm_mic_lang_' + roomId) : ('hf_comm_avatar_lang_' + roomId);
        const manual = normLang(localStorage.getItem(key));
        const myActiveLang = manual || getMyNativeLang();
        const myFlag = (manual && COMM_LANG_MAP[manual]) ? COMM_LANG_MAP[manual].flag : getMyNativeFlag();
        const safeId = getMyId() || 'guest';
        const safeName = (window.myUsername || 'User').split(' ')[0];
        const safePhoto = (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U';

        const isMediaOnly = Boolean(extra && (extra.mediaUrl || extra.isLocation));
        const baseText = (clean && !isMediaOnly)
            ? ((channel === 'mic') ? clean : await translateText(clean, myActiveLang))
            : clean;

        const packet = (baseText && !isMediaOnly)
            ? await buildCommMirrorPacket(roomId, baseText, myActiveLang, channel, safeId)
            : { mirrorFan: [], mirrorMarquee: extra && extra.isLocation ? ('📍 ' + t('comm_loc')) : ('📎 ' + t('comm_photo')) };

        const payload = {
            userId: safeId, name: safeName, photo: safePhoto, flag: myFlag,
            langCode: myActiveLang, inputChannel: channel,
            originalText: baseText, text: baseText,
            mirrorFan: packet.mirrorFan, mirrorMarquee: packet.mirrorMarquee,
            sessionId: window.mySessionId || 'sess',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        if (extra && extra.mediaUrl) {
            payload.mediaUrl = extra.mediaUrl;
            payload.mediaType = extra.mediaType || 'image';
            payload.fileName = extra.fileName || 'file';
        }
        if (extra && extra.isLocation) {
            payload.isLocation = true;
            payload.mapLink = extra.mapLink;
            payload.embedLink = extra.embedLink;
        }

        firebase.database().ref('communities_messages/' + roomId).push(payload).catch(() => {});
    }

    window.sendCommMsg = async function () {
        window.closeCommPopups();
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

        document.getElementById('hf-comm-waiting-hint')?.classList.add('hidden');
        const box = document.getElementById('comm-chat-messages');
        if (!box) return;

        const myId = getMyId();
        const isMe = (data.sessionId && data.sessionId === window.mySessionId) || (myId && String(data.userId) === myId);
        const isHistory = data.timestamp && (Date.now() - data.timestamp) > 5000;
        const name = isMe ? (window.myUsername || t('comm_you')).split(' ')[0] : (data.name || 'User').split(' ')[0];
        const flag = data.flag || '🌐';
        const baseText = data.originalText || data.text || '';
        const fan = Array.isArray(data.mirrorFan) ? data.mirrorFan : (data.mirrorFan ? Object.values(data.mirrorFan) : []);

        const group = document.createElement('div');
        group.className = 'flex flex-col w-full mt-2.5 mb-1';

        const avatarClick = isMe ? `window.openCommLangModal('avatar')` : `if(window.openAvatarModal) window.openAvatarModal('${esc(data.userId)}')`;
        const avatarHtml = `<div class="relative shrink-0 self-end cursor-pointer" onclick="${avatarClick}"><img src="${esc(data.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-8 h-8 rounded-full object-cover border border-[#2a3942]"><span class="absolute -bottom-1 -right-1 text-[10px] bg-[#111b21] rounded-full px-[3px] border border-[#2a3942] leading-none">${esc(flag)}</span></div>`;

        const mediaSrc = data.mediaUrl || data.image || '';
        let innerHtml = '';
        let bubbleStyle = isMe ? 'bg-[#005c4b] text-white rounded-tr-sm' : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm';

        if (mediaSrc) {
            const fname = esc(data.fileName || baseText || 'file');
            if (data.mediaType === 'video' || mediaSrc.startsWith('data:video/')) {
                innerHtml = `<video src="${esc(mediaSrc)}" controls class="max-w-[200px] sm:max-w-[240px] rounded-lg border border-[#2a3942]"></video>`;
            } else if (data.mediaType === 'audio' || mediaSrc.startsWith('data:audio/')) {
                innerHtml = `<audio src="${esc(mediaSrc)}" controls class="w-[200px] sm:w-[230px] outline-none"></audio>`;
            } else if (data.mediaType === 'document' || mediaSrc.startsWith('data:application/') || mediaSrc.startsWith('data:text/')) {
                innerHtml = `<div class="flex items-center gap-2.5 bg-[#111b21] p-2.5 rounded-lg border border-[#2a3942] min-w-[180px]"><div class="w-9 h-9 rounded-full bg-[#202c33] flex items-center justify-center text-blue-400 shrink-0"><i class="fa-solid fa-file-arrow-down"></i></div><div class="flex flex-col overflow-hidden"><span class="text-white text-xs font-bold truncate max-w-[130px]">${fname}</span><a href="${esc(mediaSrc)}" download="${fname}" class="text-[0.68rem] text-[#00a884] font-bold mt-0.5 uppercase">${esc(t('comm_download'))}</a></div></div>`;
            } else {
                innerHtml = `<img src="${esc(mediaSrc)}" onclick="window.openCommImagePreview(this.src)" class="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer">`;
            }
            if (baseText && data.mediaType !== 'document') {
                innerHtml += `<div class="mt-1.5 text-sm">${esc(baseText)}</div>`;
            }
        } else if (data.isLocation && data.embedLink) {
            bubbleStyle = 'bg-[#0b141a] border border-[#00a884] !p-0 overflow-hidden';
            innerHtml = `<div class="flex flex-col w-[200px] sm:w-[230px]"><iframe width="100%" height="130" frameborder="0" scrolling="no" src="${esc(data.embedLink)}" style="pointer-events:none;"></iframe><a href="${esc(data.mapLink)}" target="_blank" class="bg-[#202c33] p-2 text-center text-xs text-blue-400 font-bold flex items-center justify-center gap-1.5"><i class="fa-solid fa-map-location-dot"></i> ${esc(t('comm_open_maps'))}</a></div>`;
        } else {
            innerHtml = `<span>${esc(baseText)}</span>`;
        }

        const bubbleHtml = `
            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[82%]">
                <span class="text-[0.64rem] text-[#8696a0] mb-0.5 px-1">${esc(name)}</span>
                <div class="px-3 py-2 rounded-2xl text-sm ${bubbleStyle}">
                    ${innerHtml}
                </div>
            </div>
        `;

        group.innerHTML = `<div class="flex gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}">${isMe ? (bubbleHtml + avatarHtml) : (avatarHtml + bubbleHtml)}</div>`;

        if (!mediaSrc && !data.isLocation && fan.length > 0) {
            const fanWrap = document.createElement('div');
            fanWrap.className = `flex flex-col gap-1.5 mt-1.5 w-full ${isMe ? 'items-end pr-2' : 'items-start pl-10'}`;
            fan.forEach(u => {
                fanWrap.innerHTML += `<div class="flex items-end gap-1.5 max-w-[88%] ${isMe ? 'flex-row-reverse' : 'flex-row'}"><div class="relative shrink-0"><img src="${esc(u.photo || 'https://ui-avatars.com/api/?name=U')}" class="w-5 h-5 rounded-full object-cover border border-[#00a884]"><span class="absolute -bottom-1 -right-1 text-[8px] bg-[#111b21] rounded-full px-[2px] leading-none">${esc(u.flag || '🌐')}</span></div><div class="bg-[#202c33] border border-[#2a3942] rounded-xl px-2.5 py-1 text-xs text-yellow-400 font-bold">${esc(u.text)}</div></div>`;
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
    // 10. ИЗОЛИРОВАННЫЙ МИКРОФОН (ТОЛЬКО ГОЛОС В ТЕКСТ, 1-В-1 С chat.js)
    // ============================================================
    function cmNorm(s) {
        return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    }

    function isCommDup(text) {
        const norm = cmNorm(text);
        if (!norm) return true;
        const now = Date.now();
        const win = norm.length > 10 ? 6500 : 2500;
        const list = CM.recentSend.filter(x => (now - x.ts) < 7000);
        const dup = list.some(x =>
            (x.norm === norm && (now - x.ts) < win) ||
            (norm.length >= 8 && (now - x.ts) < 3500 && x.norm.includes(norm))
        );
        if (dup) { CM.recentSend = list; return true; }
        list.push({ norm, ts: now });
        CM.recentSend = list;
        return false;
    }

    function readCommMicLang() {
        const rId = CM.activeRoomId;
        const manual = rId ? normLang(localStorage.getItem('hf_comm_mic_lang_' + rId)) : null;
        CM.isManualMic = Boolean(manual);
        CM.recBase = CM.isManualMic ? manual : getMyNativeLang();
    }

    function syncMicButtonStyle() {
        const btn = document.getElementById('hf-comm-mic-btn');
        if (!btn) return;
        if (CM.micActive) {
            btn.className = 'w-9 h-9 rounded-full bg-red-600 border border-red-400 text-white flex items-center justify-center shrink-0 transition shadow-lg shadow-red-600/40';
        } else {
            btn.className = 'w-9 h-9 rounded-full bg-[#202c33] border border-[#2a3942] text-[#00a884] flex items-center justify-center shrink-0 transition';
        }
    }

    function updateCommMicPill(preview = '') {
        const pill = document.getElementById('hf-cmic-pill');
        syncMicButtonStyle();
        if (!pill) return;
        if (!CM.micActive) {
            pill.classList.remove('active');
            return;
        }
        const flagEl = document.getElementById('hf-cmic-flag');
        const txtEl = document.getElementById('hf-cmic-text');
        if (flagEl) flagEl.textContent = getMyCommFlag('mic');
        if (txtEl) {
            txtEl.textContent = preview || t('comm_mic_on');
            txtEl.scrollLeft = txtEl.scrollWidth;
        }
        pill.classList.add('active');
    }

    window.onCommMicBtnClick = function () {
        document.getElementById('hf-comm-attach-menu')?.classList.remove('active');
        if (typeof window.closeEmojiPicker === 'function') window.closeEmojiPicker();
        if (CM.micActive) {
            window.stopCommMic(false);
            return;
        }
        const card = document.getElementById('hf-cmic-card');
        if (!card) return;
        const sel = document.getElementById('hf-cmic-lang-select');
        if (sel) sel.innerHTML = buildMicCardOptionsHtml();
        card.classList.toggle('active');
    };

    window.onCommMicLangSelect = function (val) {
        const rId = CM.activeRoomId;
        if (!rId) return;
        syncMyCommChannelLang(rId, 'mic', val === 'auto' ? null : val);
        readCommMicLang();
        if (CM.micActive) {
            updateCommMicPill('');
            resetCommRecognition(120);
        }
    };

    function dispatchCommVoice(text) {
        const clean = String(text || '').trim();
        const norm = cmNorm(clean);
        if (!norm) return;
        const now = Date.now();
        if (norm === CM.lastSentNorm && (now - CM.lastSentAt) < 2200) return;
        if (isCommDup(clean)) return;
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
                if (CM.pendingInterim.trim()) {
                    const tail = CM.pendingInterim.trim();
                    CM.pendingInterim = '';
                    updateCommMicPill('');
                    dispatchCommVoice(tail);
                }
                if (CM.micActive) { updateCommMicPill(''); resetCommRecognition(80); }
            };
            CM.recognition = rec;
            rec.start();
        } catch (e) {
            CM.recognition = null;
            if (CM.micActive) resetCommRecognition(300);
        }
    }

    window.startCommMic = function () {
        window.closeCommPopups();
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
    // 11. СЛУШАТЕЛИ FIREBASE И ЗАПУСК
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
        if (myId && !CM.banListenerBound) {
            CM.banListenerBound = true;
            firebase.database().ref('communities_global_bans/' + myId).on('value', (snap) => {
                CM.globalBanned = Boolean(snap.val());
                if (CM.globalBanned && CM.activeRoomId) window.leaveCommunityRoom();
                else if (isCommTabActive()) renderRoot(false);
            });
        }

        if (myId && !CM.inviteListenerBound) {
            CM.inviteListenerBound = true;
            firebase.database().ref('communities_invites/' + myId).on('child_added', (snap) => {
                const inv = snap.val();
                if (!inv || CM.globalBanned) return;
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
                document.getElementById(`cm-inv-yes-${safeKey}`).onclick = async () => {
                    popup.remove();
                    snap.ref.remove();
                    const db = firebase.database();
                    const meMeta = {
                        name: (window.myUsername || 'User').split(' ')[0],
                        photo: (window.myProfileInfo && window.myProfileInfo.photo) || 'https://ui-avatars.com/api/?name=U',
                        flag: getMyNativeFlag(),
                        langCode: getMyNativeLang()
                    };
                    await db.ref(`communities_meta/${inv.roomId}/members/${myId}`).set(true).catch(() => {});
                    await db.ref(`communities_meta/${inv.roomId}/memberProfiles/${myId}`).set(meMeta).catch(() => {});
                    if (typeof window.switchTab === 'function') window.switchTab(7);
                    setTimeout(() => window.openCommunityRoom(inv.roomId), 150);
                };
            });
        } else if (!myId) {
            setTimeout(bindFirebaseMetaAndInvites, 1000);
        }
    }

    function watchEcosystemLangChanges() {
        CM.lastUiLang = getUiLang();
        const onLangChanged = () => {
            const cur = getUiLang();
            if (cur === CM.lastUiLang) return;
            CM.lastUiLang = cur;
            syncBottomNavLabel();
            if (isCommTabActive()) renderRoot(true);
        };

        const langSel = document.getElementById('app-lang-select');
        if (langSel) {
            langSel.addEventListener('change', () => setTimeout(onLangChanged, 80));
        }
        setInterval(() => {
            if (getUiLang() !== CM.lastUiLang) onLangChanged();
        }, 700);
    }

    function bootCommunities() {
        mergeCommI18n();
        bindFirebaseMetaAndInvites();
        watchEcosystemLangChanges();

        document.addEventListener('hf:tab-changed', (e) => {
            const idx = e.detail && e.detail.index;
            CM.isTabActive = (idx === 7);
            if (idx === 7) {
                renderRoot(false);
            } else {
                window.closeCommPopups();
                window.stopCommMic(true);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootCommunities);
    } else {
        bootCommunities();
    }
})();
