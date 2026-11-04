window.localStream = null;
window.peerConnection = null;
window.targetUserId = null; 
window.currentCallId = null;

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// 1. ИСХОДЯЩИЙ ЗВОНОК
window.startCall = async function(userId, userName) {
    if (window.closeDropdown) window.closeDropdown();
    window.targetUserId = userId;
    window.currentCallId = userId; 

    // Открываем окно активного звонка (если у тебя раздельные модалки)
    const activeModal = document.getElementById('active-call-modal') || document.getElementById('call-modal');
    if (activeModal) activeModal.classList.add('active');

    try {
        window.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = window.localStream;

        window.peerConnection = new RTCPeerConnection(configuration);
        window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

        window.peerConnection.ontrack = event => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        };

        window.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                firebase.database().ref(`calls/${window.targetUserId}/candidates/caller`).push(event.candidate.toJSON());
            }
        };

        const offer = await window.peerConnection.createOffer();
        await window.peerConnection.setLocalDescription(offer);

        firebase.database().ref(`calls/${window.targetUserId}`).set({
            callerId: window.myUserId,
            callerName: window.myUsername || 'Абонент',
            offer: { type: offer.type, sdp: offer.sdp }
        });

        if (window.sendPushNotification) {
            window.sendPushNotification(window.targetUserId, { type: 'call', callerName: window.myUsername }, 'Входящий звонок', `Звонит ${window.myUsername}`);
        }

        firebase.database().ref(`calls/${window.targetUserId}/answer`).on('value', snapshot => {
            const answer = snapshot.val();
            if (answer && !window.peerConnection.currentRemoteDescription) {
                window.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        firebase.database().ref(`calls/${window.targetUserId}/candidates/callee`).on('child_added', snapshot => {
            window.peerConnection.addIceCandidate(new RTCIceCandidate(snapshot.val()));
        });

    } catch (error) {
        window.endCall();
    }
};

// 2. ОТБОЙ / ЗАВЕРШЕНИЕ
window.endCall = function() {
    if (window.targetUserId) firebase.database().ref('calls/' + window.targetUserId).remove();
    if (window.myUserId) firebase.database().ref('calls/' + window.myUserId).remove();

    if (window.sendPushNotification && window.targetUserId) {
        window.sendPushNotification(window.targetUserId, { type: 'missed', callerName: window.myUsername || 'Абонент' }, 'Вызов завершен', 'Сброс');
    }

    // Жестко прячем любые окна звонков, какие только есть в твоем HTML
    ['call-modal', 'incoming-call-modal', 'active-call-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    
    if (window.localStream) {
        window.localStream.getTracks().forEach(track => track.stop());
        window.localStream = null;
    }
    if (window.peerConnection) {
        window.peerConnection.close();
        window.peerConnection = null;
    }
    
    window.targetUserId = null;
    window.currentCallId = null;
};

// 3. ОТВЕТ НА ЗВОНОК
window.answerCall = async function() {
    if (!window.currentCallId) return;

    // Прячем модалку входящего и показываем активный звонок
    const incModal = document.getElementById('incoming-call-modal');
    if (incModal) incModal.classList.remove('active');
    const actModal = document.getElementById('active-call-modal') || document.getElementById('call-modal');
    if (actModal) actModal.classList.add('active');

    try {
        window.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = window.localStream;

        window.peerConnection = new RTCPeerConnection(configuration);
        window.localStream.getTracks().forEach(track => window.peerConnection.addTrack(track, window.localStream));

        window.peerConnection.ontrack = event => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) remoteVideo.srcObject = event.streams[0];
        };

        window.peerConnection.onicecandidate = event => {
            if (event.candidate) firebase.database().ref(`calls/${window.currentCallId}/candidates/callee`).push(event.candidate.toJSON());
        };

        const callSnapshot = await firebase.database().ref(`calls/${window.currentCallId}`).once('value');
        const callData = callSnapshot.val();

        if (callData && callData.offer) {
            await window.peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
            const answer = await window.peerConnection.createAnswer();
            await window.peerConnection.setLocalDescription(answer);

            firebase.database().ref(`calls/${window.currentCallId}/answer`).set({ type: answer.type, sdp: answer.sdp });

            firebase.database().ref(`calls/${window.currentCallId}/candidates/caller`).on('child_added', snapshot => {
                window.peerConnection.addIceCandidate(new RTCIceCandidate(snapshot.val()));
            });
        }
    } catch (error) {
        window.endCall();
    }
};

// 4. СЛУШАТЕЛЬ ВХОДЯЩИХ
window.initCallListener = function() {
    if (!window.myUserId) return;

    firebase.database().ref('calls/' + window.myUserId).on('value', snapshot => {
        const callData = snapshot.val();
        
        // Ищем окно входящего звонка из твоего HTML
        const incomingModal = document.getElementById('incoming-call-modal') || document.getElementById('call-modal');

        if (callData && callData.offer) {
            window.targetUserId = callData.callerId;
            window.currentCallId = window.myUserId;
            if (incomingModal) incomingModal.classList.add('active');
        } else {
            // ЕСЛИ ЗВОНОК ИСЧЕЗ
            if (incomingModal && incomingModal.classList.contains('active')) {
                // Выводим тост о пропущенном
                const dict = window.i18n ? (window.i18n[window.appLang] || window.i18n['en']) : {};
                if (window.showToast) window.showToast(dict['missed_call'] || "Пропущенный вызов", dict['missed_call_desc'] || "Абонент отменил вызов", "", "");
            }

            // Прячем всё
            ['call-modal', 'incoming-call-modal', 'active-call-modal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('active');
            });

            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
                window.localStream = null;
            }
            if (window.peerConnection) {
                window.peerConnection.close();
                window.peerConnection = null;
            }
            window.targetUserId = null;
            window.currentCallId = null;
        }
    });
};

setTimeout(() => { if (window.myUserId) window.initCallListener(); }, 2500);
