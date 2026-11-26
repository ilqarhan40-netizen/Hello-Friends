// ============================================================
// СИНХРОНИЗАЦИЯ AGORA-ТОКЕНА ИЗ FIREBASE REALTIME DATABASE
// Файл: js/agora-token-sync.js
// Ветка в базе: config/agoraToken
// ============================================================

(function () {
    'use strict';

    let liveToken = null;
    let subscribed = false;
    let agoraPatched = false;
    let pollTimer = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    function applyToken(token) {
        if (typeof token !== 'string') return;
        const clean = token.trim();
        if (clean.length < 20) return;

        liveToken = clean;
        window.CALLS_AGORA_TEMP_TOKEN = clean;
        window.AGORA_TOKEN = clean;
        window.AGORA_TEMP_TOKEN = clean;
        console.log('[AgoraSync] Актуальный токен загружен из Firebase');
    }

    function fetchTokenOnceFast() {
        return new Promise((resolve) => {
            if (liveToken) return resolve(liveToken);
            if (!window.firebase || !firebase.apps || !firebase.apps.length || typeof firebase.database !== 'function') {
                return resolve(null);
            }

            let done = false;
            const timer = setTimeout(() => {
                if (!done) {
                    done = true;
                    resolve(liveToken);
                }
            }, 1500);

            firebase.database().ref('config/agoraToken').once('value')
                .then((snap) => {
                    if (!done) {
                        done = true;
                        clearTimeout(timer);
                        applyToken(snap.val());
                        resolve(liveToken);
                    }
                })
                .catch(() => {
                    if (!done) {
                        done = true;
                        clearTimeout(timer);
                        resolve(liveToken);
                    }
                });
        });
    }

    function patchAgoraClient() {
        if (agoraPatched) return true;
        if (!window.AgoraRTC || typeof window.AgoraRTC.createClient !== 'function') return false;

        agoraPatched = true;
        const origCreateClient = window.AgoraRTC.createClient.bind(window.AgoraRTC);

        window.AgoraRTC.createClient = function () {
            const client = origCreateClient.apply(window.AgoraRTC, arguments);
            if (client && typeof client.join === 'function' && !client.__hfTokenPatched) {
                client.__hfTokenPatched = true;
                const origJoin = client.join.bind(client);

                client.join = async function () {
                    const args = Array.prototype.slice.call(arguments);
                    if (args.length >= 3 && typeof args[0] === 'string' && typeof args[1] === 'string') {
                        const fresh = liveToken || await fetchTokenOnceFast();
                        if (fresh) {
                            args[2] = fresh;
                        }
                    }
                    return origJoin.apply(client, args);
                };
            }
            return client;
        };

        return true;
    }

    function startTokenSync() {
        if (subscribed) return true;
        if (!window.firebase || !firebase.apps || !firebase.apps.length || typeof firebase.database !== 'function') {
            return false;
        }

        subscribed = true;
        try {
            firebase.database().ref('config/agoraToken').on('value', (snapshot) => {
                applyToken(snapshot.val());
            }, (err) => {
                console.warn('[AgoraSync] Ошибка чтения config/agoraToken:', err && err.message ? err.message : err);
            });
        } catch (e) {
            subscribed = false;
            console.warn('[AgoraSync] Ошибка подписки:', e);
        }

        return subscribed;
    }

    function checkAndStart() {
        patchAgoraClient();
        startTokenSync();

        if ((subscribed && agoraPatched) && pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
            return;
        }

        if ((!subscribed || !agoraPatched) && !pollTimer) {
            pollTimer = setInterval(() => {
                attempts++;
                patchAgoraClient();
                startTokenSync();
                if ((subscribed && agoraPatched) || attempts >= MAX_ATTEMPTS) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                }
            }, 300);
        }
    }

    checkAndStart();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndStart);
    }
    window.addEventListener('load', checkAndStart);
})();
