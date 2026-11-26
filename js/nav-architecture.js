// ============================================================
// ЭТАП 1: АРХИТЕКТУРА НАВИГАЦИИ И ИЗОЛЯЦИЯ НОВЫХ ЭКРАНОВ
// Файл: js/nav-architecture.js
// Не изменяет рабочие модули calls.js / video-room.js / conference.js / chat.js
// ============================================================

(function () {
    'use strict';

    // 1. Словарь на 13 языков экосистемы
    const HF_NAV_I18N = {
        en: {
            nav_video_rooms: 'Video Rooms',
            nav_communities: 'Communities',
            video_rooms_title: 'Video Rooms',
            video_rooms_ready: 'Public video rooms module will be mounted here (Stage 3).',
            communities_title: 'Communities',
            communities_ready: 'Public communities module will be mounted here (Stage 2).'
        },
        ru: {
            nav_video_rooms: 'Видео-румы',
            nav_communities: 'Сообщества',
            video_rooms_title: 'Видео-румы',
            video_rooms_ready: 'Здесь подключится раздел публичных Видео-румов (Этап 3).',
            communities_title: 'Сообщества',
            communities_ready: 'Здесь подключится раздел Сообществ (Этап 2).'
        },
        az: {
            nav_video_rooms: 'Video Otaqlar',
            nav_communities: 'İcmalar',
            video_rooms_title: 'Video Otaqlar',
            video_rooms_ready: 'Açıq video otaqlar bölməsi burada qoşulacaq (Mərhələ 3).',
            communities_title: 'İcmalar',
            communities_ready: 'İcmalar bölməsi burada qoşulacaq (Mərhələ 2).'
        },
        kk: {
            nav_video_rooms: 'Бейне бөлмелер',
            nav_communities: 'Қауымдастықтар',
            video_rooms_title: 'Бейне бөлмелер',
            video_rooms_ready: 'Ашық бейне бөлмелер бөлімі осында қосылады (3-кезең).',
            communities_title: 'Қауымдастықтар',
            communities_ready: 'Қауымдастықтар бөлімі осында қосылады (2-кезең).'
        },
        tr: {
            nav_video_rooms: 'Video Odalar',
            nav_communities: 'Topluluklar',
            video_rooms_title: 'Video Odalar',
            video_rooms_ready: 'Açık video odaları modülü buraya eklenecek (Aşama 3).',
            communities_title: 'Topluluklar',
            communities_ready: 'Topluluklar modülü buraya eklenecek (Aşama 2).'
        },
        de: {
            nav_video_rooms: 'Video-Räume',
            nav_communities: 'Communities',
            video_rooms_title: 'Video-Räume',
            video_rooms_ready: 'Öffentliche Video-Räume werden hier eingebunden (Schritt 3).',
            communities_title: 'Communities',
            communities_ready: 'Communities-Bereich wird hier eingebunden (Schritt 2).'
        },
        ar: {
            nav_video_rooms: 'غرف الفيديو',
            nav_communities: 'المجتمعات',
            video_rooms_title: 'غرف الفيديو',
            video_rooms_ready: 'سيتم ربط قسم غرف الفيديو العامة هنا (المرحلة 3).',
            communities_title: 'المجتمعات',
            communities_ready: 'سيتم ربط قسم المجتمعات هنا (المرحلة 2).'
        },
        it: {
            nav_video_rooms: 'Stanze Video',
            nav_communities: 'Comunità',
            video_rooms_title: 'Stanze Video',
            video_rooms_ready: 'Il modulo Stanze Video pubbliche verrà collegato qui (Fase 3).',
            communities_title: 'Comunità',
            communities_ready: 'Il modulo Comunità verrà collegato qui (Fase 2).'
        },
        es: {
            nav_video_rooms: 'Salas de Video',
            nav_communities: 'Comunidades',
            video_rooms_title: 'Salas de Video',
            video_rooms_ready: 'El módulo de Salas de Video públicas se conectará aquí (Fase 3).',
            communities_title: 'Comunidades',
            communities_ready: 'El módulo de Comunidades se conectará aquí (Fase 2).'
        },
        fr: {
            nav_video_rooms: 'Salons Vidéo',
            nav_communities: 'Communautés',
            video_rooms_title: 'Salons Vidéo',
            video_rooms_ready: 'Le module des salons vidéo publics sera connecté ici (Étape 3).',
            communities_title: 'Communautés',
            communities_ready: 'Le module des communautés sera connecté ici (Étape 2).'
        },
        pt: {
            nav_video_rooms: 'Salas de Vídeo',
            nav_communities: 'Comunidades',
            video_rooms_title: 'Salas de Vídeo',
            video_rooms_ready: 'O módulo de Salas de Vídeo públicas será conectado aqui (Etapa 3).',
            communities_title: 'Comunidades',
            communities_ready: 'O módulo de Comunidades será conectado aqui (Etapa 2).'
        },
        ja: {
            nav_video_rooms: 'ビデオルーム',
            nav_communities: 'コミュニティ',
            video_rooms_title: 'ビデオルーム',
            video_rooms_ready: '公開ビデオルーム機能はここに接続されます（ステップ3）。',
            communities_title: 'コミュニティ',
            communities_ready: 'コミュニティ機能はここに接続されます（ステップ2）。'
        },
        zh: {
            nav_video_rooms: '视频房间',
            nav_communities: '社区',
            video_rooms_title: '视频房间',
            video_rooms_ready: '公开视频房间模块将挂载于此（第3阶段）。',
            communities_title: '社区',
            communities_ready: '社区模块将挂载于此（第2阶段）。'
        }
    };

    const STATE = {
        booted: false,
        initialHomeApplied: false,
        navButtons: {},
        navContainer: null,
        lastAvatarUserId: null
    };

    window.HF_NAV = STATE;

    function getUiLang() {
        let code = window.appLang || localStorage.getItem('hf_app_lang') || navigator.language || 'en';
        if (code === 'auto') code = navigator.language || 'en';
        code = String(code).slice(0, 2).toLowerCase();
        if (code === 'kz') code = 'kk';
        if (code === 'cn') code = 'zh';
        if (code === 'jp') code = 'ja';
        if (code === 'ae') code = 'ar';
        return HF_NAV_I18N[code] ? code : 'en';
    }

    function t(key) {
        const lang = getUiLang();
        return (HF_NAV_I18N[lang] && HF_NAV_I18N[lang][key]) || HF_NAV_I18N.en[key] || key;
    }

    function mergeNavI18n() {
        window.i18n = window.i18n || {};
        Object.keys(HF_NAV_I18N).forEach(lang => {
            window.i18n[lang] = Object.assign({}, window.i18n[lang] || {}, HF_NAV_I18N[lang]);
        });
    }

    function refreshNavTexts() {
        mergeNavI18n();
        document.querySelectorAll('[data-hf-nav-i18n]').forEach(el => {
            const key = el.getAttribute('data-hf-nav-i18n');
            if (key) el.textContent = t(key);
        });
    }

    // Вспомогательная проверка для будущих комнат-клубов (Этап 2)
    window.isPublicClubRoom = function (roomId) {
        return typeof roomId === 'string' && roomId.startsWith('club_');
    };

    // 2. Создание двух пустых контейнеров новых экранов (индексы 6 и 7)
    function ensureNewPages() {
        const msgEl = document.getElementById('message');
        if (!msgEl || !msgEl.parentNode) return;

        const parent = msgEl.parentNode;
        const baseClasses = Array.from(msgEl.classList).filter(c => c !== 'active' && c !== 'hidden');
        const classStr = baseClasses.length ? baseClasses.join(' ') : 'page';

        if (!document.getElementById('video-rooms-page')) {
            const vrPage = document.createElement('section');
            vrPage.id = 'video-rooms-page';
            vrPage.className = classStr;
            vrPage.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full w-full p-6 text-center gap-3">
                    <div class="w-16 h-16 rounded-2xl bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-[#00a884] text-2xl">
                        <i class="fa-solid fa-video"></i>
                    </div>
                    <h2 class="text-lg font-bold text-[var(--wa-text,#e9edef)]" data-i18n="video_rooms_title" data-hf-nav-i18n="video_rooms_title">${t('video_rooms_title')}</h2>
                    <p class="text-xs text-[#8696a0] max-w-[260px]" data-i18n="video_rooms_ready" data-hf-nav-i18n="video_rooms_ready">${t('video_rooms_ready')}</p>
                </div>
            `;
            parent.appendChild(vrPage);
        }

        if (!document.getElementById('communities-page')) {
            const cmPage = document.createElement('section');
            cmPage.id = 'communities-page';
            cmPage.className = classStr;
            cmPage.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full w-full p-6 text-center gap-3">
                    <div class="w-16 h-16 rounded-2xl bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-[#00a884] text-2xl">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <h2 class="text-lg font-bold text-[var(--wa-text,#e9edef)]" data-i18n="communities_title" data-hf-nav-i18n="communities_title">${t('communities_title')}</h2>
                    <p class="text-xs text-[#8696a0] max-w-[260px]" data-i18n="communities_ready" data-hf-nav-i18n="communities_ready">${t('communities_ready')}</p>
                </div>
            `;
            parent.appendChild(cmPage);
        }
    }

    // 3. Управление видимостью стартовой заставки и всех экранов
    function getWelcomeScreen() {
        return document.getElementById('empty-state-screen');
    }

    function isWelcomeVisible() {
        const w = getWelcomeScreen();
        if (!w) return false;
        if (w.classList.contains('hidden')) return false;
        const st = window.getComputedStyle(w);
        return st.display !== 'none' && st.visibility !== 'hidden';
    }

    function hideWelcomeScreen() {
        const w = getWelcomeScreen();
        if (!w) return;
        w.classList.remove('active');
        w.classList.add('hidden');
        w.style.display = 'none';
    }

    function showWelcomeScreen() {
        const w = getWelcomeScreen();
        if (!w) return false;
        w.classList.remove('hidden');
        w.classList.add('active');
        w.style.display = 'flex';
        return true;
    }

    function hideAllTabScreens() {
        const msgEl = document.getElementById('message');
        const parent = msgEl ? msgEl.parentNode : null;
        if (parent) {
            Array.from(parent.children).forEach(child => {
                if (child.id === 'empty-state-screen') return;
                if (child.classList.contains('active')) {
                    child.classList.remove('active');
                }
            });
        }
        ['message', 'voice-translator', 'conference', 'profession', 'social', 'archive', 'video-rooms-page', 'communities-page'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
    }

    function stopChatMicsSafely() {
        if (typeof window.stopGlobalUnlimitedMic === 'function') {
            try { window.stopGlobalUnlimitedMic(true); } catch (e) {}
        }
        if (typeof window.stopPrivateUnlimitedMic === 'function') {
            try { window.stopPrivateUnlimitedMic(true); } catch (e) {}
        }
        if (typeof window.closeAllMicPopups === 'function') {
            try { window.closeAllMicPopups(); } catch (e) {}
        }
        if (typeof window.closeAllMenus === 'function') {
            try { window.closeAllMenus(); } catch (e) {}
        }
    }

    function highlightBottomNav(targetIdx) {
        Object.keys(STATE.navButtons).forEach(k => {
            const btn = STATE.navButtons[k];
            if (btn) btn.classList.remove('active');
        });
        const activeBtn = STATE.navButtons[String(targetIdx)];
        if (activeBtn) activeBtn.classList.add('active');
    }

    // Возврат на стартовую заставку (не трогает шапку и нижние кнопки)
    window.goHomeScreen = function () {
        const w = getWelcomeScreen();
        if (!w) return;
        stopChatMicsSafely();
        hideAllTabScreens();
        highlightBottomNav(-1);
        showWelcomeScreen();
        window.currentIndex = -1;
    };

    // 4. Перехват window.switchTab (индексы 0..5 остаются родными, добавляются 6 и 7)
    function hookSwitchTab() {
        if (typeof window.switchTab !== 'function' || window._hfNavSwitchHooked) return;
        const origSwitchTab = window.switchTab;

        const wrappedSwitchTab = function (idx) {
            ensureNewPages();

            // Новые изолированные экраны: 6 (Видео-румы) и 7 (Сообщества)
            if (idx === 6 || idx === 7) {
                stopChatMicsSafely();
                hideWelcomeScreen();
                hideAllTabScreens();

                const targetEl = document.getElementById(idx === 6 ? 'video-rooms-page' : 'communities-page');
                if (targetEl) {
                    targetEl.classList.remove('hidden');
                    targetEl.classList.add('active');
                }
                window.currentIndex = idx;
                highlightBottomNav(idx);

                // Событие для будущих модулей (Этап 2 и Этап 3)
                document.dispatchEvent(new CustomEvent('hf:tab-changed', { detail: { index: idx } }));
                return;
            }

            // Любая родная вкладка (0, 1, 2, 3, 4, 5): прячем заставку и новые экраны, отдаём родной логике
            hideWelcomeScreen();
            const vr = document.getElementById('video-rooms-page');
            const cm = document.getElementById('communities-page');
            if (vr) vr.classList.remove('active');
            if (cm) cm.classList.remove('active');

            const res = origSwitchTab.apply(this, arguments);

            // Подсветка нижней панели только для видимых кнопок (0, 3, 4); для 1 и 2 не путаем с 6 и 7
            if (idx === 0 || idx === 3 || idx === 4) {
                highlightBottomNav(idx);
            } else if (idx === 1 || idx === 2 || idx === 5) {
                highlightBottomNav(-1);
            }

            document.dispatchEvent(new CustomEvent('hf:tab-changed', { detail: { index: idx } }));
            return res;
        };

        wrappedSwitchTab._hfNavSwitchHooked = true;
        window._hfNavSwitchHooked = true;
        window.switchTab = wrappedSwitchTab;
    }

    // 5. Настройка нижней панели: перевешиваем кнопки 2 -> 6 и 3 -> 7 + toggle на заставку
    function updateNavButtonLabel(btn, i18nKey) {
        if (!btn) return;
        const span = btn.querySelector('span');
        if (span) {
            span.setAttribute('data-i18n', i18nKey);
            span.setAttribute('data-hf-nav-i18n', i18nKey);
            span.textContent = t(i18nKey);
        }
    }

    function setupBottomNav() {
        const btnChat = document.querySelector('nav [onclick*="switchTab(0)"], footer [onclick*="switchTab(0)"], .bottom-nav [onclick*="switchTab(0)"], [onclick*="switchTab(0)"]');
        if (!btnChat || !btnChat.parentElement) return;

        const container = btnChat.closest('nav, footer, .bottom-nav') || btnChat.parentElement;
        if (!container) return;
        STATE.navContainer = container;

        const findNavBtn = (origIdx) => {
            return container.querySelector(`[onclick*="switchTab(${origIdx})"]`)
                || container.querySelector(`[data-hf-orig-tab="${origIdx}"]`);
        };

        const b0 = findNavBtn(0);
        const b1 = findNavBtn(1);
        const b2 = findNavBtn(2);
        const b3 = findNavBtn(3);
        const b4 = findNavBtn(4);

        const mapping = [
            { btn: b0, orig: 0, target: 0 },
            { btn: b1, orig: 1, target: 6, i18nKey: 'nav_video_rooms' },
            { btn: b2, orig: 2, target: 7, i18nKey: 'nav_communities' },
            { btn: b3, orig: 3, target: 3 },
            { btn: b4, orig: 4, target: 4 }
        ];

        mapping.forEach(item => {
            if (!item.btn) return;
            item.btn.dataset.hfOrigTab = String(item.orig);
            item.btn.dataset.hfNavTarget = String(item.target);
            STATE.navButtons[String(item.target)] = item.btn;
            if (item.i18nKey) updateNavButtonLabel(item.btn, item.i18nKey);
        });

        if (container.dataset.hfNavBound === '1') return;
        container.dataset.hfNavBound = '1';

        // Перехват в capture-фазе строго внутри нижней панели (плюс "+" не затрагивается)
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-hf-nav-target]');
            if (!btn || !container.contains(btn)) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const targetIdx = Number(btn.dataset.hfNavTarget);
            if (Number.isNaN(targetIdx)) return;

            // Toggle: повторное нажатие на открытую вкладку сворачивает на стартовую заставку
            if (window.currentIndex === targetIdx && getWelcomeScreen()) {
                window.goHomeScreen();
                return;
            }

            if (typeof window.switchTab === 'function') {
                window.switchTab(targetIdx);
            }
        }, true);
    }

    // 6. Возврат «Домой» по клику на надпись "Hello Friends" (кружок HF не трогаем)
    function bindHeaderLogoHome() {
        const header = document.querySelector('header') || document.querySelector('.app-header');
        if (!header) return;

        const candidates = header.querySelectorAll('span, h1, h2, div, p, a');
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            const txt = (el.textContent || '').trim();
            if (txt !== 'Hello Friends') continue;
            const ownOnclick = el.getAttribute('onclick') || '';
            if (ownOnclick.includes('activateGodMode') || el.querySelector('[onclick*="activateGodMode"]')) continue;

            if (el.dataset.hfHomeBound !== '1') {
                el.dataset.hfHomeBound = '1';
                el.style.cursor = 'pointer';
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.goHomeScreen();
                });
            }
            break;
        }
    }

    // 7. Кнопка «Конференция» на аватаре -> #conference + авто-окно приглашения + предвыбор пользователя
    window.openConferenceWithUser = function (targetUserId) {
        const uid = targetUserId ? String(targetUserId) : '';

        if (typeof window.closeAvatarModal === 'function') {
            try { window.closeAvatarModal(); } catch (e) {}
        }
        const avatarModal = document.getElementById('avatar-modal');
        if (avatarModal) avatarModal.classList.remove('active');

        if (typeof window.switchTab === 'function') {
            window.switchTab(2);
        }

        setTimeout(() => {
            if (typeof window.openGroupInviteModal === 'function') {
                window.openGroupInviteModal();
                if (uid) {
                    setTimeout(() => {
                        const list = document.getElementById('group-invite-list');
                        if (!list) return;
                        const boxes = list.querySelectorAll('input.invite-checkbox');
                        boxes.forEach(cb => {
                            if (String(cb.value) === uid) {
                                cb.checked = true;
                                try { cb.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
                            }
                        });
                    }, 60);
                }
            }
        }, 120);
    };

    function hookAvatarConferenceButton() {
        if (typeof window.openAvatarModal === 'function' && !window._hfNavAvatarHooked) {
            const origOpenAvatar = window.openAvatarModal;
            window.openAvatarModal = function (userId) {
                STATE.lastAvatarUserId = userId ? String(userId) : null;
                return origOpenAvatar.apply(this, arguments);
            };
            window._hfNavAvatarHooked = true;
        }

        if (document.documentElement.dataset.hfAvatarConfBound === '1') return;
        document.documentElement.dataset.hfAvatarConfBound = '1';

        document.addEventListener('click', (e) => {
            const modal = e.target.closest('#avatar-modal, [id*="avatar-modal"]');
            if (!modal) return;

            const btn = e.target.closest('button, [onclick]');
            if (!btn || !modal.contains(btn)) return;

            const attr = (btn.getAttribute('onclick') || '');
            // Пропускаем кнопки личного чата, аудио- и видеозвонка
            if (/makeCall|startCall|switchChatRoom|closeAvatar/i.test(attr)) return;

            const isConfBtn = attr.includes('switchTab(2)')
                || /openGroupInviteModal|conference|inviteToConf/i.test(attr)
                || Boolean(btn.querySelector('.fa-users, .fa-user-group, .fa-people-group'));

            if (!isConfBtn) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            window.openConferenceWithUser(STATE.lastAvatarUserId);
        }, true);
    }

    // 8. Страховка видимости чата для микрофонов (chat.js и language.js)
    function hookChatVisibilityGuard() {
        if (typeof window.isChatTabVisibleNow === 'function' && !window._hfNavChatVisHooked) {
            const origIsChatVisible = window.isChatTabVisibleNow;
            window.isChatTabVisibleNow = function () {
                if (window.currentIndex === -1 || window.currentIndex === 6 || window.currentIndex === 7) return false;
                if (isWelcomeVisible()) return false;
                return origIsChatVisible.apply(this, arguments);
            };
            window._hfNavChatVisHooked = true;
        }
    }

    // 9. Синхронизация переводов при смене языка в меню "три точки"
    function hookTranslations() {
        if (typeof window.applyTranslations === 'function' && !window._hfNavI18nHooked) {
            const origApply = window.applyTranslations;
            window.applyTranslations = function () {
                mergeNavI18n();
                const res = origApply.apply(this, arguments);
                refreshNavTexts();
                return res;
            };
            window._hfNavI18nHooked = true;
        }

        if (typeof window.changeAppLanguage === 'function' && !window._hfNavLangHooked) {
            const origChange = window.changeAppLanguage;
            window.changeAppLanguage = function () {
                const res = origChange.apply(this, arguments);
                setTimeout(refreshNavTexts, 60);
                return res;
            };
            window._hfNavLangHooked = true;
        }
    }

    // 10. Запуск и стартовый экран на заставке
    function bootNavArchitecture() {
        mergeNavI18n();
        ensureNewPages();
        hookSwitchTab();
        hookChatVisibilityGuard();
        hookAvatarConferenceButton();
        hookTranslations();
        setupBottomNav();
        bindHeaderLogoHome();
        refreshNavTexts();
        STATE.booted = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootNavArchitecture);
    } else {
        bootNavArchitecture();
    }

    window.addEventListener('load', () => {
        bootNavArchitecture();
        setTimeout(() => {
            bootNavArchitecture();
            // Старт приложения на приветственной заставке (если не идёт активный звонок/конференция)
            if (!STATE.initialHomeApplied && window.currentIndex !== 1 && window.currentIndex !== 2 && getWelcomeScreen()) {
                STATE.initialHomeApplied = true;
                window.goHomeScreen();
            }
        }, 250);
    });
})();
