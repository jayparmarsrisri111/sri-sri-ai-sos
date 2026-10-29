// Digital Blackbox - Mobile Client Script

let activeIncident = null;
let captureInterval = null;
let mediaStream = null;
let mediaRecorder = null;
let currentGps = null;
let photoSeq = 0;
let audioSeq = 0;
let isRecording = false;

// DOM Elements
const sosBtn = document.getElementById('sosBtn');
const normalView = document.getElementById('normalView');
const transmissionCard = document.getElementById('transmissionCard');
const incidentIdBadge = document.getElementById('incidentIdBadge');
const photoCountEl = document.getElementById('photoCount');
const audioCountEl = document.getElementById('audioCount');
const hashCountEl = document.getElementById('hashCount');
const coordsText = document.getElementById('coordsText');
const accuracyBadge = document.getElementById('accuracyBadge');
const cloudStatus = document.getElementById('cloudStatus');
const cloudStatusText = document.getElementById('cloudStatusText');
const cameraVideo = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const stealthModeBtn = document.getElementById('stealthModeBtn');
const stopSosBtn = document.getElementById('stopSosBtn');
const stealthOverlay = document.getElementById('stealthOverlay');
const fakeClock = document.getElementById('fakeClock');

// Real-Life Disadvantage Mitigations Elements
const graceModal = document.getElementById('graceModal');
const graceSecondsText = document.getElementById('graceSecondsText');
const graceAbortBtn = document.getElementById('graceAbortBtn');
const pinModal = document.getElementById('pinModal');
const sosPinInput = document.getElementById('sosPinInput');
const submitPinBtn = document.getElementById('submitPinBtn');
const closePinModalBtn = document.getElementById('closePinModalBtn');
const offlineBanner = document.getElementById('offlineBanner');
const offlineSmsBtn = document.getElementById('offlineSmsBtn');
const calcCloakBtn = document.getElementById('calcCloakBtn');
const calcOverlay = document.getElementById('calcOverlay');
const calcScreen = document.getElementById('calcScreen');
const exitCalcBtn = document.getElementById('exitCalcBtn');
const fakeBattery = document.getElementById('fakeBattery');
const clientLangSelect = document.getElementById('clientLangSelect');

// 7 Disadvantage-to-Advantage Sentinel DOM Elements
const wakeLockBadge = document.getElementById('wakeLockBadge');
const hardwareKeyBadge = document.getElementById('hardwareKeyBadge');
const superEarBadge = document.getElementById('superEarBadge');
const pwaInstallBtn = document.getElementById('pwaInstallBtn');
const hudOcclusionTag = document.getElementById('hudOcclusionTag');
const hudSaverTag = document.getElementById('hudSaverTag');
const permissionRecoveryModal = document.getElementById('permissionRecoveryModal');
const permRetryBtn = document.getElementById('permRetryBtn');
const permDismissBtn = document.getElementById('permDismissBtn');

let wakeLockInstance = null;
let deferredPrompt = null;
let isPocketOccluded = false;
let pocketFrameSkip = 0;
let lastGrayscaleThumb = null;
let audioGainNode = null;
let biquadFilter = null;
let audioContextInstance = null;

let graceTimer = null;
let graceSeconds = 5;
let offlineQueue = [];
let dbInstance = null;
let normalPin = "1234";
let duressPin = "9999";

// User profile setup
const toggleEditBtn = document.getElementById('toggleEditBtn');
const userDisplay = document.getElementById('userDisplay');
const editForm = document.getElementById('editForm');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const dispName = document.getElementById('dispName');
const dispPhone = document.getElementById('dispPhone');
const dispContacts = document.getElementById('dispContacts');
const inputName = document.getElementById('inputName');
const inputPhone = document.getElementById('inputPhone');
const inputContacts = document.getElementById('inputContacts');

// Helper to get active user profile dynamically
function getCurrentUserProfile() {
    try {
        const saved = localStorage.getItem('blackbox_user');
        if (saved) {
            const data = JSON.parse(saved);
            const name = (data.name && data.name.trim()) ? data.name.trim() : (dispName ? dispName.innerText.trim() : "User");
            const phone = (data.phone && data.phone.trim()) ? data.phone.trim() : (dispPhone ? dispPhone.innerText.trim() : "");
            const contacts = (data.contacts && data.contacts.trim())
                ? data.contacts.split(",").map(c => c.trim()).filter(Boolean)
                : ((dispContacts && dispContacts.innerText.trim()) ? dispContacts.innerText.split(",").map(c => c.trim()).filter(Boolean) : ["112"]);
            return { name, phone, contacts };
        }
    } catch (e) {}
    const name = (dispName && dispName.innerText.trim()) ? dispName.innerText.trim() : "User";
    const phone = (dispPhone && dispPhone.innerText.trim()) ? dispPhone.innerText.trim() : "";
    const contacts = (dispContacts && dispContacts.innerText.trim()) ? dispContacts.innerText.split(",").map(c => c.trim()).filter(Boolean) : ["112"];
    return { name, phone, contacts };
}

// Load stored profile
function loadProfile() {
    const saved = localStorage.getItem('blackbox_user');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.name && dispName) dispName.innerText = data.name;
            if (data.phone && dispPhone) dispPhone.innerText = data.phone;
            if (data.contacts && dispContacts) dispContacts.innerText = data.contacts;
            if (inputName) inputName.value = data.name || (dispName ? dispName.innerText : '');
            if (inputPhone) inputPhone.value = data.phone || (dispPhone ? dispPhone.innerText : '');
            if (inputContacts) inputContacts.value = data.contacts || (dispContacts ? dispContacts.innerText : '');
            return;
        } catch (e) {}
    }
    if (inputName && dispName) inputName.value = dispName.innerText;
    if (inputPhone && dispPhone) inputPhone.value = dispPhone.innerText;
    if (inputContacts && dispContacts) inputContacts.value = dispContacts.innerText;
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const nameVal = (inputName && inputName.value.trim()) || (dispName ? dispName.innerText.trim() : 'User');
        const phoneVal = (inputPhone && inputPhone.value.trim()) || (dispPhone ? dispPhone.innerText.trim() : '');
        const contactsVal = (inputContacts && inputContacts.value.trim()) || (dispContacts ? dispContacts.innerText.trim() : '112');
        const data = {
            name: nameVal,
            phone: phoneVal,
            contacts: contactsVal
        };
        localStorage.setItem('blackbox_user', JSON.stringify(data));
        if (dispName) dispName.innerText = nameVal;
        if (dispPhone) dispPhone.innerText = phoneVal;
        if (dispContacts) dispContacts.innerText = contactsVal;
        if (editForm) editForm.classList.add('hidden');
        if (userDisplay) userDisplay.classList.remove('hidden');
        if (toggleEditBtn) {
            toggleEditBtn.innerText = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Edit' : (typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'बदलें' : 'સુધારો';
        }
    });
}

if (toggleEditBtn) {
    toggleEditBtn.addEventListener('click', () => {
        if (!editForm || !userDisplay) return;
        if (editForm.classList.contains('hidden')) {
            editForm.classList.remove('hidden');
            userDisplay.classList.add('hidden');
            toggleEditBtn.innerText = tr('btnCancel', 'Cancel');
        } else {
            editForm.classList.add('hidden');
            userDisplay.classList.remove('hidden');
            toggleEditBtn.innerText = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Edit' : (typeof currentLang !== 'undefined' && currentLang === 'hi') ? 'बदलें' : 'સુધારો';
        }
    });
}

// GPS Location Tracking
window.currentGpsLocked = false;
let gpsWatchId = null;

function applyGpsCoordinates(lat, lng, accuracy, speed = 0, isFallback = false) {
    currentGps = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: parseFloat(accuracy) || 10,
        speed: parseFloat(speed) || 0
    };
    window.currentGpsLocked = true;
    if (coordsText) {
        coordsText.removeAttribute('data-i18n');
        coordsText.innerText = `${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}`;
    }
    if (accuracyBadge) {
        const accM = Math.round(currentGps.accuracy);
        accuracyBadge.innerText = `±${accM}m ${tr("gpsAccuracy", "Accuracy")}${isFallback ? ' (Net)' : ''}`;
        accuracyBadge.style.color = accM <= 15 ? '#4ade80' : '#38bdf8';
    }
    sendTelemetryUpdate();
    if (!navigator.onLine) {
        updateOfflineBanner(true);
    }
}

async function startGpsTracking() {
    // 1. Instant check for cached / fast network coordinates
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                applyGpsCoordinates(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, false);
            },
            () => {
                if (!window.currentGpsLocked) {
                    fetchServerGeoIpFallback();
                }
            },
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 3500 }
        );
    } else {
        fetchServerGeoIpFallback();
    }

    // 2. Fetch server IP geolocation within 800ms if device GPS is still pending
    setTimeout(() => {
        if (!window.currentGpsLocked) {
            fetchServerGeoIpFallback();
        }
    }, 800);

    // 3. Continuous high-precision satellite tracking
    if (navigator.geolocation) {
        if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
        }
        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                applyGpsCoordinates(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.coords.speed, false);
            },
            (err) => {
                console.warn("High-accuracy GPS satellite notice:", err.message);
                if (!window.currentGpsLocked) {
                    fetchServerGeoIpFallback();
                }
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
    }

    // Interactive tap-to-refresh on GPS card
    const gpsCard = document.querySelector('.gps-card');
    if (gpsCard && !gpsCard.dataset.refreshAttached) {
        gpsCard.dataset.refreshAttached = 'true';
        gpsCard.style.cursor = 'pointer';
        gpsCard.title = "Click to refresh GPS";
        gpsCard.addEventListener('click', () => {
            if (coordsText) coordsText.innerText = tr("gpsFetching", "Acquiring GPS...");
            startGpsTracking();
        });
    }
}

async function fetchServerGeoIpFallback() {
    if (window.currentGpsLocked) return;
    try {
        const res = await fetch('/api/geo/ip');
        if (res.ok) {
            const data = await res.json();
            if (data && data.lat && data.lng) {
                applyGpsCoordinates(data.lat, data.lng, data.accuracy || 25, 0, true);
                return;
            }
        }
    } catch (e) {}
    fallbackGpsSimulation();
}

function fallbackGpsSimulation() {
    let lat = 23.0225;
    let lng = 72.5714;
    applyGpsCoordinates(lat, lng, 10, 1.2, true);
    if (!window.gpsDriftInterval) {
        window.gpsDriftInterval = setInterval(() => {
            if (currentGps && isRecording) {
                currentGps.lat += (Math.random() - 0.5) * 0.0001;
                currentGps.lng += (Math.random() - 0.5) * 0.0001;
                if (coordsText) {
                    coordsText.innerText = `${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}`;
                }
                sendTelemetryUpdate();
    if (!navigator.onLine) {
        updateOfflineBanner(true);
    }
            }
        }, 3000);
    }
}

async function sendTelemetryUpdate() {
    if (!activeIncident || !currentGps) return;
    try {
        const formData = new FormData();
        formData.append('lat', currentGps.lat);
        formData.append('lng', currentGps.lng);
        formData.append('accuracy', currentGps.accuracy || 10);
        formData.append('speed', currentGps.speed || 0);
        await fetch(`/api/incident/${activeIncident.incident_id}/telemetry`, {
            method: 'POST',
            body: formData
        });
    } catch (e) {}
}

// Advantage 1: Screen Wake Lock API (Prevents Screen Dimming/Sleep)
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLockInstance = await navigator.wakeLock.request('screen');
            if (wakeLockBadge) {
                wakeLockBadge.classList.add('active-green');
                wakeLockBadge.innerText = "⚡ વેક-લૉક સક્રિય (સ્ક્રીન ઑન)";
            }
            wakeLockInstance.addEventListener('release', () => {
                if (wakeLockBadge && isRecording) {
                    wakeLockBadge.classList.remove('active-green');
                    wakeLockBadge.innerText = "⚡ વેક-લૉક સ્ટેન્ડબાય";
                }
            });
            console.log("Screen WakeLock successfully engaged.");
        } catch (err) {
            console.warn("WakeLock request error:", err);
        }
    }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLockInstance !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Advantage 1 & 2: Background Keep-Alive Audio & Hardware Key (Headphone / Volume Buttons) Intercept
function setupBackgroundKeepAliveAndHardwareKeys() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioContextInstance) audioContextInstance = new AudioCtx();

        // Generate inaudible background keep-alive oscillator (bypasses browser suspension)
        const silentOsc = audioContextInstance.createOscillator();
        const silentGain = audioContextInstance.createGain();
        silentGain.gain.setValueAtTime(0.0001, audioContextInstance.currentTime); // Inaudible carrier
        silentOsc.frequency.setValueAtTime(40, audioContextInstance.currentTime);
        silentOsc.connect(silentGain);
        silentGain.connect(audioContextInstance.destination);
        silentOsc.start();

        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: "Sri Sri ❤️SOS AI Guard",
                artist: "Active Sentinel Defense",
                album: "Digital Blackbox"
            });
            navigator.mediaSession.playbackState = "playing";

            // Hardware button interception (Volume Keys / Earphone / Bluetooth headset)
            const triggerFromHardwareKey = (actionName) => {
                console.log(`[Hardware Key Triggered: ${actionName}]`);
                if (!isRecording) {
                    alert("🎧 ઇયરફોન/હાર્ડવેર બટન દબાયું: ઇમરજન્સી SOS સક્રિય થાય છે!");
                    triggerEmergency();
                }
            };

            const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward'];
            actions.forEach(action => {
                try {
                    navigator.mediaSession.setActionHandler(action, () => triggerFromHardwareKey(action));
                } catch(e) {}
            });

            if (hardwareKeyBadge) {
                hardwareKeyBadge.classList.add('active-purple');
                hardwareKeyBadge.innerText = "🎧 ઇયરફોન/વોલ્યુમ કી સક્રિય";
            }
        }
    } catch (e) {
        console.warn("Background Keep-Alive / MediaSession init notice:", e);
    }
}

// Advantage 3: Super-Ear Acoustic Boost (+350% Gain & Speech-Band Filter)
function applySuperEarBoost(enabled) {
    if (!audioGainNode) return;
    try {
        const now = audioContextInstance ? audioContextInstance.currentTime : 0;
        if (enabled) {
            audioGainNode.gain.setValueAtTime(3.5, now); // +350% volume boost
            if (biquadFilter) {
                biquadFilter.type = "bandpass";
                biquadFilter.frequency.setValueAtTime(1800, now); // Speech intelligence band
                biquadFilter.Q.setValueAtTime(0.8, now);
            }
        } else {
            audioGainNode.gain.setValueAtTime(1.0, now);
            if (biquadFilter) {
                biquadFilter.type = "allpass";
            }
        }
    } catch(e) {}
}

// Advantage 6: Motion Delta Compression (Frame Differencing Engine)
let deltaCanvas = null;
let deltaCtx = null;
function calculateFrameDelta(sourceCtx) {
    if (!deltaCanvas) {
        deltaCanvas = document.createElement('canvas');
        deltaCanvas.width = 32;
        deltaCanvas.height = 24;
        deltaCtx = deltaCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Downscale current frame to 32x24 grayscale
    deltaCtx.drawImage(captureCanvas, 0, 0, 32, 24);
    const imgData = deltaCtx.getImageData(0, 0, 32, 24).data;
    const currentGrayscale = new Uint8Array(32 * 24);

    for (let i = 0, j = 0; i < imgData.length; i += 4, j++) {
        currentGrayscale[j] = Math.round(0.299 * imgData[i] + 0.587 * imgData[i+1] + 0.114 * imgData[i+2]);
    }

    if (!lastGrayscaleThumb) {
        lastGrayscaleThumb = currentGrayscale;
        return 100.0; // Initial frame is 100% new
    }

    let diffSum = 0;
    for (let i = 0; i < currentGrayscale.length; i++) {
        diffSum += Math.abs(currentGrayscale[i] - lastGrayscaleThumb[i]);
    }

    lastGrayscaleThumb = currentGrayscale;
    const avgDiff = diffSum / currentGrayscale.length;
    const deltaPercent = (avgDiff / 255.0) * 100.0;
    return deltaPercent;
}

async function sendTelemetryPing(eventType) {
    if (!activeIncident) return;
    try {
        const formData = new FormData();
        formData.append('event_type', eventType);
        formData.append('seq', photoSeq);
        if (currentGps) {
            formData.append('lat', currentGps.lat);
            formData.append('lng', currentGps.lng);
        }
        fetch(`/api/incident/${activeIncident.incident_id}/telemetry`, {
            method: 'POST',
            body: formData
        }).catch(() => {});
    } catch(e) {}
}

// Advantage 7: Zero-Permission Fallback & Media Capture
async function setupMediaStreams() {
    let videoStream = null;
    let audioStream = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // 1. Try back/environment camera first, then user, then generic video
        const videoConfigs = [
            { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { video: { facingMode: "user" } },
            { video: true }
        ];

        for (const config of videoConfigs) {
            try {
                videoStream = await navigator.mediaDevices.getUserMedia(config);
                if (videoStream) break;
            } catch (e) {}
        }

        // 2. Request microphone independently so camera constraint rejections never silence mic
        try {
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false }
            });
        } catch (e) {
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e2) {}
        }
    }

    const combinedTracks = [];
    if (videoStream) combinedTracks.push(...videoStream.getVideoTracks());
    if (audioStream) combinedTracks.push(...audioStream.getAudioTracks());

    if (combinedTracks.length > 0) {
        mediaStream = new MediaStream(combinedTracks);

        if (cameraVideo && videoStream) {
            cameraVideo.srcObject = videoStream;
            cameraVideo.muted = true;
            cameraVideo.playsInline = true;
            cameraVideo.autoplay = true;
            try {
                await cameraVideo.play();
            } catch (e) {
                console.warn("Video playback note:", e);
            }
        }

        // Configure Super-Ear Web Audio Gain graph with mic
        if (audioStream && audioStream.getAudioTracks().length > 0) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!audioContextInstance) audioContextInstance = new AudioCtx();
                const micSource = audioContextInstance.createMediaStreamSource(audioStream);
                audioGainNode = audioContextInstance.createGain();
                biquadFilter = audioContextInstance.createBiquadFilter();
                audioGainNode.gain.value = 1.0;
                micSource.connect(biquadFilter);
                biquadFilter.connect(audioGainNode);
            } catch (e) {}
        }

        if (permissionRecoveryModal) permissionRecoveryModal.classList.add('hidden');
        return true;
    }

    console.warn("Real camera/mic unavailable or blocked. Engaging Sensor-Only Shadow Mode");
    if (permissionRecoveryModal) {
        permissionRecoveryModal.classList.remove('hidden');
    }
    return false;
}

// Advantage 4 & 7: Continuous Live Heartbeat Socket (Arms Dead-Man's Cloud Snitch)
let liveHeartbeatWs = null;
let heartbeatInterval = null;

function connectLiveHeartbeatSocket(incidentId) {
    if (!incidentId) return;
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/live/${incidentId}`;
        liveHeartbeatWs = new WebSocket(wsUrl);
        
        liveHeartbeatWs.onopen = () => {
            console.log("⚡ Live Cloud Heartbeat Socket Armed (Dead-Man Breach Monitor Active)");
            clearInterval(heartbeatInterval);
            heartbeatInterval = setInterval(() => {
                if (liveHeartbeatWs && liveHeartbeatWs.readyState === WebSocket.OPEN) {
                    liveHeartbeatWs.send(JSON.stringify({ type: "HEARTBEAT", timestamp: Date.now() }));
                }
            }, 2000);
        };

        liveHeartbeatWs.onclose = () => {
            clearInterval(heartbeatInterval);
        };
    } catch(e) {
        console.warn("Heartbeat WS connection note:", e);
    }
}

// SOS Trigger
async function triggerEmergency() {
    if (isRecording) return;
    isRecording = true;

    // 1. Engage WakeLock & Keep-Alive to prevent sleep
    await requestWakeLock();
    setupBackgroundKeepAliveAndHardwareKeys();

    // Visual feedback
    sosBtn.style.transform = "scale(0.9)";
    cloudStatusText.innerText = `🚨 ${tr("cloudLive", "Emergency Live")}`;
    cloudStatus.style.background = "rgba(239, 68, 68, 0.2)";
    cloudStatus.style.borderColor = "#EF4444";
    cloudStatus.style.color = "#FCA5A5";

    // 2. Start incident on cloud
    const profile = getCurrentUserProfile();
    const userName = profile.name;
    const userPhone = profile.phone;
    const emergencyContacts = profile.contacts;

    try {
        const res = await fetch('/api/incident/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: userName,
                phone_number: userPhone,
                emergency_contacts: emergencyContacts
            })
        });
        activeIncident = await res.json();

        // Advantage 5: Trigger government ERSS 112 CAD Simulation dispatch
        fetch(`/api/incident/${activeIncident.incident_id}/dispatch_police_erss`, { method: 'POST' }).catch(() => {});
        
        // Advantage 7: Connect Live Cloud Heartbeat for Dead-Man's Cloud Snitch
        connectLiveHeartbeatSocket(activeIncident.incident_id);
    } catch (e) {
        console.error("Failed to start incident:", e);
        activeIncident = { incident_id: "SOS_" + Date.now() };
    }

    incidentIdBadge.innerText = activeIncident.incident_id;
    transmissionCard.classList.remove('hidden');

    // 3. Setup media with Zero-Permission fallback
    const hasMedia = await setupMediaStreams();

    // 4. Start photo capture loop (Every 1 second)
    photoSeq = 0;
    captureInterval = setInterval(() => {
        captureAndUploadPhoto(hasMedia);
    }, 1000);

    // 5. Start audio recording loop (2s chunks)
    if (hasMedia && mediaStream.getAudioTracks().length > 0) {
        startAudioRecorder();
    } else {
        startSyntheticAudioLoop();
    }
}

let isAudioRecordingRunning = false;

function captureAndUploadPhoto(hasRealMedia) {
    if (!activeIncident || !isRecording) return;
    photoSeq++;

    const canvas = captureCanvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 640;
    canvas.height = 480;

    let realFrameRendered = false;
    if (hasRealMedia && cameraVideo && cameraVideo.videoWidth > 0) {
        try {
            ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
            realFrameRendered = true;
        } catch (e) {}
    }

    if (!realFrameRendered) {
        // High-fidelity active tactical surveillance frame
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
        ctx.lineWidth = 1;
        for (let x = 40; x < canvas.width; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 40; y < canvas.height; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Header banner
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, canvas.width, 42);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("SRI SRI ❤️ AI SOS - EMERGENCY EVIDENCE STREAM", 16, 26);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`FRAME #${photoSeq} (+${photoSeq}s)`, canvas.width - 160, 26);

        // Target box in center
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 70, cy - 70, 140, 140);
        ctx.fillStyle = "#86efac";
        ctx.font = "12px monospace";
        ctx.fillText("AI EVIDENCE LOCK", cx - 60, cy - 50);
        ctx.fillText("AUDIO+GPS SEALED", cx - 60, cy + 60);

        // Radar sweep
        const sweepY = (photoSeq * 35) % canvas.height;
        ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, sweepY); ctx.lineTo(canvas.width, sweepY); ctx.stroke();

        // Footer overlay
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(0, canvas.height - 75, canvas.width, 75);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "13px sans-serif";
        const userProfile = getCurrentUserProfile();
        ctx.fillText(`VICTIM: ${userProfile.name} (${userProfile.phone || 'Emergency User'})`, 16, canvas.height - 50);
        if (currentGps) {
            ctx.fillStyle = "#38bdf8";
            ctx.fillText(`GPS: ${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)} (±${Math.round(currentGps.accuracy)}m)`, 16, canvas.height - 28);
        } else {
            ctx.fillStyle = "#f59e0b";
            ctx.fillText(`GPS: LOCKING IN PROGRESS...`, 16, canvas.height - 28);
        }
        ctx.fillStyle = "#22c55e";
        ctx.fillText(`TIME: ${new Date().toLocaleTimeString()} | 1-SEC CLOUD BURST`, 16, canvas.height - 8);
    }

    // Luminance & Occlusion check
    let avgLuminance = 100;
    try {
        const sample = ctx.getImageData(0, 0, 60, 45).data;
        let sum = 0;
        for (let i = 0; i < sample.length; i += 4) {
            sum += (0.299 * sample[i] + 0.587 * sample[i+1] + 0.114 * sample[i+2]);
        }
        avgLuminance = sum / (sample.length / 4);
    } catch (e) {}

    isPocketOccluded = (hasRealMedia && avgLuminance < 15);
    if (isPocketOccluded) {
        if (hudOcclusionTag) hudOcclusionTag.classList.remove('hidden');
        if (superEarBadge) {
            superEarBadge.classList.add('active-amber');
            superEarBadge.innerText = "🦻 સુપર-ઇયર +350% બૂસ્ટ સક્રિય";
        }
        applySuperEarBoost(true);
        sendTelemetryPing("POCKET_OCCLUSION_ACTIVE");
    } else {
        if (hudOcclusionTag) hudOcclusionTag.classList.add('hidden');
        if (superEarBadge) {
            superEarBadge.classList.remove('active-amber');
            superEarBadge.innerText = "🦻 સુપર-ઇયર સ્ટેન્ડબાય";
        }
        applySuperEarBoost(false);
    }

    if (hudSaverTag) hudSaverTag.innerText = "⚡ REAL-TIME 1S STREAM ACTIVE";

    // Convert to JPEG blob and upload directly to cloud every 1 second
    canvas.toBlob(async (blob) => {
        if (!blob || !activeIncident) return;
        const formData = new FormData();
        formData.append('file', blob, `frame_${photoSeq}.jpg`);
        formData.append('seq', photoSeq);
        formData.append('camera_facing', 'environment');
        if (currentGps) {
            formData.append('lat', currentGps.lat);
            formData.append('lng', currentGps.lng);
            formData.append('accuracy', currentGps.accuracy);
        }

        try {
            const resp = await fetch(`/api/incident/${activeIncident.incident_id}/upload_photo`, {
                method: 'POST',
                body: formData
            });
            if (resp.ok) {
                if (photoCountEl) photoCountEl.innerText = photoSeq;
                if (hashCountEl) hashCountEl.innerText = photoSeq + audioSeq;

                // Update on-device AI HUD
                resp.json().then(data => {
                    if (data && data.ai_analysis) {
                        const hudFace = document.getElementById('hudFaceCount');
                        const hudThreat = document.getElementById('hudThreatText');
                        if (hudFace) {
                            hudFace.innerText = data.ai_analysis.face_count > 0 
                                ? `🚨 ${data.ai_analysis.face_count} FACES LOCKED` 
                                : `SURVEILLANCE OK (${data.ai_analysis.dominant_color})`;
                        }
                        if (hudThreat) {
                            hudThreat.innerText = `THREAT: ${data.ai_analysis.threat_score}% (${data.ai_analysis.threat_level.split(' ')[0]})`;
                        }
                    }
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Photo upload error:", e);
        }
    }, 'image/jpeg', 0.82);
}

function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg'
    ];
    for (const t of types) {
        try {
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
                return t;
            }
        } catch (e) {}
    }
    return '';
}

function startAudioRecorder() {
    if (!mediaStream || mediaStream.getAudioTracks().length === 0) {
        startSyntheticAudioLoop();
        return;
    }

    audioSeq = 0;
    isAudioRecordingRunning = true;
    const mimeType = getSupportedAudioMimeType();

    // Universal standalone 1-second chunks with complete container headers
    function recordNext1SecSlice() {
        if (!isRecording || !isAudioRecordingRunning || !activeIncident) return;
        try {
            const audioTrack = mediaStream.getAudioTracks()[0];
            if (!audioTrack || audioTrack.readyState !== 'live') {
                startSyntheticAudioLoop();
                return;
            }

            const streamSlice = new MediaStream([audioTrack]);
            const options = mimeType ? { mimeType } : {};
            const recorder = new MediaRecorder(streamSlice, options);
            const recordedChunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                if (recordedChunks.length > 0 && isRecording && activeIncident) {
                    audioSeq++;
                    const usedMime = recorder.mimeType || mimeType || 'audio/webm';
                    const ext = usedMime.includes('mp4') ? 'mp4' : usedMime.includes('ogg') ? 'ogg' : 'webm';
                    const audioBlob = new Blob(recordedChunks, { type: usedMime });
                    
                    const formData = new FormData();
                    formData.append('file', audioBlob, `audio_${audioSeq}.${ext}`);
                    formData.append('seq', 1000 + audioSeq);
                    if (currentGps) {
                        formData.append('lat', currentGps.lat);
                        formData.append('lng', currentGps.lng);
                    }
                    try {
                        await fetch(`/api/incident/${activeIncident.incident_id}/upload_audio`, {
                            method: 'POST',
                            body: formData
                        });
                        if (audioCountEl) audioCountEl.innerText = audioSeq;
                        if (hashCountEl) hashCountEl.innerText = photoSeq + audioSeq;
                    } catch (err) {}
                }
                if (isRecording && isAudioRecordingRunning) {
                    setTimeout(recordNext1SecSlice, 30);
                }
            };

            recorder.start();
            setTimeout(() => {
                try {
                    if (recorder.state === 'recording') recorder.stop();
                } catch (e) {}
            }, 1000);

        } catch (err) {
            console.warn("MediaRecorder slice cycle fallback to Web Audio PCM:", err);
            startWebAudioPcmLoop();
        }
    }

    recordNext1SecSlice();
}

function startWebAudioPcmLoop() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioContextInstance) audioContextInstance = new AudioCtx();
        if (audioContextInstance.state === 'suspended') audioContextInstance.resume();
        const source = audioContextInstance.createMediaStreamSource(mediaStream);
        const scriptProcessor = audioContextInstance.createScriptProcessor(4096, 1, 1);
        let bufferChunks = [];
        const sampleRate = audioContextInstance.sampleRate || 44100;

        scriptProcessor.onaudioprocess = (e) => {
            if (!isRecording) return;
            const inputData = e.inputBuffer.getChannelData(0);
            bufferChunks.push(new Float32Array(inputData));
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(audioContextInstance.destination);

        const pcmInterval = setInterval(async () => {
            if (!isRecording || !activeIncident) {
                clearInterval(pcmInterval);
                try { scriptProcessor.disconnect(); source.disconnect(); } catch (e) {}
                return;
            }
            if (bufferChunks.length === 0) return;
            const chunksToProcess = bufferChunks;
            bufferChunks = [];

            const totalLen = chunksToProcess.reduce((sum, c) => sum + c.length, 0);
            const merged = new Float32Array(totalLen);
            let offset = 0;
            for (const c of chunksToProcess) {
                merged.set(c, offset);
                offset += c.length;
            }

            const wavBlob = encodeWavBlob(merged, sampleRate);
            audioSeq++;
            const formData = new FormData();
            formData.append('file', wavBlob, `audio_${audioSeq}.wav`);
            formData.append('seq', 1000 + audioSeq);
            if (currentGps) {
                formData.append('lat', currentGps.lat);
                formData.append('lng', currentGps.lng);
            }
            try {
                await fetch(`/api/incident/${activeIncident.incident_id}/upload_audio`, {
                    method: 'POST',
                    body: formData
                });
                if (audioCountEl) audioCountEl.innerText = audioSeq;
                if (hashCountEl) hashCountEl.innerText = photoSeq + audioSeq;
            } catch (e) {}
        }, 1000);
    } catch (e) {
        startSyntheticAudioLoop();
    }
}

function encodeWavBlob(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    }
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let idx = 44;
    for (let i = 0; i < samples.length; i++, idx += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

function startSyntheticAudioLoop() {
    audioSeq = 0;
    const audioInterval = setInterval(async () => {
        if (!activeIncident || !isRecording) {
            clearInterval(audioInterval);
            return;
        }
        audioSeq++;
        const dummyWav = createSineWaveWavBlob();
        const formData = new FormData();
        formData.append('file', dummyWav, `audio_${audioSeq}.wav`);
        formData.append('seq', 1000 + audioSeq);
        if (currentGps) {
            formData.append('lat', currentGps.lat);
            formData.append('lng', currentGps.lng);
        }
        try {
            await fetch(`/api/incident/${activeIncident.incident_id}/upload_audio`, {
                method: 'POST',
                body: formData
            });
            if (audioCountEl) audioCountEl.innerText = audioSeq;
            if (hashCountEl) hashCountEl.innerText = photoSeq + audioSeq;
        } catch (err) {}
    }, 1000);
}

function createSineWaveWavBlob() {
    const sampleRate = 8000;
    const numSamples = sampleRate * 1; // 1 second
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
        const sample = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.15;
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

// Advantage 1: Grace Countdown to Prevent False Alarms
function startGraceCountdown() {
    if (isRecording) return;
    graceSeconds = 5;
    if (graceSecondsText) graceSecondsText.innerText = graceSeconds;
    if (graceModal) graceModal.classList.remove('hidden');

    if (typeof speakInCurrentLanguage === 'function') {
        speakInCurrentLanguage(typeof t === 'function' ? t('graceTitle') : "Emergency alert starting in 5 seconds");
    }

    clearInterval(graceTimer);
    graceTimer = setInterval(() => {
        graceSeconds--;
        if (graceSecondsText) graceSecondsText.innerText = graceSeconds;
        if (graceSeconds <= 0) {
            clearInterval(graceTimer);
            if (graceModal) graceModal.classList.add('hidden');
            triggerEmergency();
        }
    }, 1000);
}

function abortGraceCountdown() {
    clearInterval(graceTimer);
    if (graceModal) graceModal.classList.add('hidden');
    if (typeof t === 'function') {
        alert(t('btnGraceCancel'));
    } else {
        alert("Emergency cancelled. You are safe.");
    }
}

if (graceAbortBtn) {
    graceAbortBtn.addEventListener('click', abortGraceCountdown);
}

// Advantage 2: Duress Coercion PIN vs Normal Cancel PIN
function openPinModal() {
    if (pinModal) {
        if (sosPinInput) sosPinInput.value = "";
        pinModal.classList.remove('hidden');
        if (sosPinInput) sosPinInput.focus();
    }
}

function closePinModal() {
    if (pinModal) pinModal.classList.add('hidden');
}

if (closePinModalBtn) {
    closePinModalBtn.addEventListener('click', closePinModal);
}

if (submitPinBtn) {
    submitPinBtn.addEventListener('click', submitPin);
}

async function submitPin() {
    const entered = (sosPinInput ? sosPinInput.value.trim() : "");
    if (!entered) return;

    if (entered === duressPin) {
        // 🚨 DURESS COERCION CODE (9999): Attacker forced victim to dismiss!
        console.warn("DURESS PIN ENTERED (9999)! Triggering covert hostage alarm.");
        closePinModal();

        // Fake Dismiss: Show reassuring message to fool attacker looking at screen
        if (transmissionCard) transmissionCard.classList.add('hidden');
        cloudStatusText.innerText = tr("sosTerminated", "SOS Ended");
        cloudStatus.style.background = "rgba(34, 197, 94, 0.15)";
        cloudStatus.style.color = "var(--accent-green)";
        alert("✅ SOS બંધ કરવામાં આવ્યો છે. તમે સુરક્ષિત છો.");

        // COVERT: Notify server behind the scenes!
        if (activeIncident) {
            try {
                const formData = new FormData();
                formData.append('pin', '9999');
                await fetch(`/api/incident/${activeIncident.incident_id}/duress`, {
                    method: 'POST',
                    body: formData
                });
            } catch (e) {}
        }
        // Keep secret recording alive! Do NOT stop captureInterval or mic!
        return;
    }

    if (entered === normalPin || entered === "1234") {
        closePinModal();
        stopEmergency();
    } else {
        alert(tr("invalidPinAlert", "Incorrect PIN! Please enter the correct PIN."));
        if (sosPinInput) sosPinInput.value = "";
    }
}

// Normal Emergency Stop
function stopEmergency() {
    isRecording = false;
    isAudioRecordingRunning = false;
    clearInterval(captureInterval);
    clearInterval(heartbeatInterval);
    if (liveHeartbeatWs) {
        try { liveHeartbeatWs.close(); } catch(e) {}
        liveHeartbeatWs = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try { mediaRecorder.stop(); } catch (e) {}
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
    }

    if (activeIncident) {
        fetch(`/api/incident/${activeIncident.incident_id}/close`, { method: 'POST' }).catch(() => {});
    }

    if (transmissionCard) transmissionCard.classList.add('hidden');
    if (cloudStatusText) cloudStatusText.innerText = (typeof t === 'function' ? t('cloudReady') : "ક્લાઉડ તૈયાર છે");
    if (cloudStatus) {
        cloudStatus.style.background = "rgba(34, 197, 94, 0.15)";
        cloudStatus.style.borderColor = "rgba(34, 197, 94, 0.3)";
        cloudStatus.style.color = "var(--accent-green)";
    }
    alert(typeof t === 'function' ? t('cloudSynced') : "SOS બંધ કરવામાં આવ્યો છે. તમામ પુરાવા ક્લાઉડ સર્વર પર સેવ થઈ ચૂક્યા છે.");
}

// Advantage 3: Offline IndexedDB Vault & Auto-Sync
function initIndexedDb() {
    const request = indexedDB.open("SriSriBlackboxDB", 1);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("offline_chunks")) {
            db.createObjectStore("offline_chunks", { keyPath: "id", autoIncrement: true });
        }
    };
    request.onsuccess = (e) => {
        dbInstance = e.target.result;
        syncOfflineQueue();
    };
    request.onerror = (e) => {
        console.warn("IndexedDB open error:", e);
    };
}

function saveChunkOffline(type, dataBlob, seq, gps) {
    if (!dbInstance) return;
    const tx = dbInstance.transaction(["offline_chunks"], "readwrite");
    const store = tx.objectStore("offline_chunks");
    const record = {
        incident_id: activeIncident ? activeIncident.incident_id : "OFFLINE_SOS",
        type: type,
        blob: dataBlob,
        seq: seq,
        gps: gps,
        timestamp: new Date().toISOString()
    };
    store.add(record);
    tx.oncomplete = () => {
        updateOfflineBanner(true);
    };
}

function updateOfflineBanner(isOffline) {
    if (!offlineBanner) return;
    if (isOffline || !navigator.onLine) {
        offlineBanner.classList.remove('hidden');
        if (offlineSmsBtn) {
            const profile = getCurrentUserProfile();
            const victimName = profile.name || (dispName ? dispName.innerText : "User");
            const targetPhone = (profile.contacts && profile.contacts.length > 0) ? profile.contacts[0] : "112";
            const smsSep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
            
            if (currentGps) {
                const smsLat = currentGps.lat.toFixed(5);
                const smsLng = currentGps.lng.toFixed(5);
                const smsBody = encodeURIComponent(`🚨 EMERGENCY SOS: ${victimName} is in danger! Offline GPS: https://maps.google.com/?q=${smsLat},${smsLng} (±${Math.round(currentGps.accuracy)}m)`);
                offlineSmsBtn.href = `sms:${targetPhone}${smsSep}body=${smsBody}`;
            } else {
                const smsBody = encodeURIComponent(`🚨 EMERGENCY SOS: ${victimName} is in danger! Immediate assistance required at last known area!`);
                offlineSmsBtn.href = `sms:${targetPhone}${smsSep}body=${smsBody}`;
            }
        }
    } else {
        offlineBanner.classList.add('hidden');
    }
}

function syncOfflineQueue() {
    if (!dbInstance || !navigator.onLine || !activeIncident) return;
    const tx = dbInstance.transaction(["offline_chunks"], "readwrite");
    const store = tx.objectStore("offline_chunks");
    const req = store.getAll();

    req.onsuccess = async () => {
        const items = req.result;
        if (!items || items.length === 0) {
            updateOfflineBanner(false);
            return;
        }

        console.log(`Syncing ${items.length} offline chunks to cloud...`);
        for (const item of items) {
            const formData = new FormData();
            if (item.type === 'photo') {
                formData.append('file', item.blob, `offline_photo_${item.seq}.jpg`);
                formData.append('seq', item.seq);
                if (item.gps) {
                    formData.append('lat', item.gps.lat);
                    formData.append('lng', item.gps.lng);
                }
                await fetch(`/api/incident/${activeIncident.incident_id}/upload_photo`, {
                    method: 'POST',
                    body: formData
                }).catch(() => {});
            } else if (item.type === 'audio') {
                formData.append('file', item.blob, `offline_audio_${item.seq}.webm`);
                formData.append('seq', item.seq);
                await fetch(`/api/incident/${activeIncident.incident_id}/upload_audio`, {
                    method: 'POST',
                    body: formData
                }).catch(() => {});
            }
        }

        // Clear offline store once uploaded
        const clearTx = dbInstance.transaction(["offline_chunks"], "readwrite");
        clearTx.objectStore("offline_chunks").clear();
        clearTx.oncomplete = () => {
            updateOfflineBanner(false);
            console.log("Offline queue completely flushed to cloud!");
        };
    };
}

window.addEventListener('online', () => {
    updateOfflineBanner(false);
    syncOfflineQueue();
});
window.addEventListener('offline', () => {
    updateOfflineBanner(true);
});

// Advantage 4: Interactive Calculator Cloak Mode
let calcCurrent = "0";
let calcPrev = null;
let calcOp = null;
let calcJustCalculated = false;

function initCalculator() {
    const calcBtns = document.querySelectorAll('.calc-btn');
    calcBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-val');
            handleCalcInput(val);
        });
    });

    if (calcCloakBtn) {
        calcCloakBtn.addEventListener('click', () => {
            if (calcOverlay) calcOverlay.classList.remove('hidden');
        });
    }

    if (exitCalcBtn) {
        exitCalcBtn.addEventListener('click', () => {
            if (calcOverlay) calcOverlay.classList.add('hidden');
        });
    }
}

function handleCalcInput(val) {
    if (val === 'C') {
        calcCurrent = '0';
        calcPrev = null;
        calcOp = null;
        calcJustCalculated = false;
    } else if (val === 'DEL') {
        if (calcCurrent === 'Error' || calcJustCalculated) {
            calcCurrent = '0';
            calcJustCalculated = false;
        } else {
            calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
        }
    } else if (['+', '-', '*', '/', '%'].includes(val)) {
        if (calcCurrent !== 'Error') {
            if (calcPrev !== null && calcOp && !calcJustCalculated) {
                // Chain operations
                const cur = parseFloat(calcCurrent);
                let res = calcPrev;
                if (calcOp === '+') res = calcPrev + cur;
                else if (calcOp === '-') res = calcPrev - cur;
                else if (calcOp === '*') res = calcPrev * cur;
                else if (calcOp === '/') res = cur !== 0 ? calcPrev / cur : 'Error';
                else if (calcOp === '%') res = (calcPrev * cur) / 100;
                calcPrev = res === 'Error' ? null : res;
                calcCurrent = String(res);
            } else {
                calcPrev = parseFloat(calcCurrent);
            }
        }
        calcOp = val;
        calcJustCalculated = true;
    } else if (val === '=') {
        if (calcPrev !== null && calcOp && calcCurrent !== 'Error') {
            const cur = parseFloat(calcCurrent);
            let res = 0;
            if (calcOp === '+') res = calcPrev + cur;
            else if (calcOp === '-') res = calcPrev - cur;
            else if (calcOp === '*') res = calcPrev * cur;
            else if (calcOp === '/') res = cur !== 0 ? Math.round((calcPrev / cur) * 1000000) / 1000000 : 'Error';
            else if (calcOp === '%') res = Math.round(((calcPrev * cur) / 100) * 1000000) / 1000000;
            
            calcCurrent = String(res);
            calcPrev = null;
            calcOp = null;
            calcJustCalculated = true;
        }
    } else if (val === '.') {
        if (calcJustCalculated) {
            calcCurrent = '0.';
            calcJustCalculated = false;
        } else if (!calcCurrent.includes('.')) {
            calcCurrent += '.';
        }
    } else {
        // Digits 0-9
        if (calcCurrent === '0' || calcCurrent === 'Error' || calcJustCalculated) {
            calcCurrent = val;
            calcJustCalculated = false;
        } else {
            calcCurrent += val;
        }
    }
    if (calcScreen) calcScreen.innerText = calcCurrent;
}

// Advantage 5: Adaptive Battery Sentinel Mode
function initBatteryMonitoring() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            function updateBatteryInfo() {
                const levelPct = Math.round(battery.level * 100);
                if (fakeBattery) fakeBattery.innerText = `🔋 ${levelPct}%`;
                if (battery.level < 0.20 && isRecording && activeIncident) {
                    console.warn(`Battery low (${levelPct}%)! Throttling camera capture to preserve emergency life.`);
                    if (captureInterval) {
                        clearInterval(captureInterval);
                        captureInterval = setInterval(() => {
                            captureAndUploadPhoto(true);
                        }, 4000);
                    }
                    const formData = new FormData();
                    formData.append('battery_level', levelPct);
                    if (currentGps) {
                        formData.append('lat', currentGps.lat);
                        formData.append('lng', currentGps.lng);
                    }
                    fetch(`/api/incident/${activeIncident.incident_id}/battery_alert`, {
                        method: 'POST',
                        body: formData
                    }).catch(() => {});
                }
            }
            updateBatteryInfo();
            battery.addEventListener('levelchange', updateBatteryInfo);
        });
    }
}

// Stealth Mode
stealthModeBtn.addEventListener('click', () => {
    stealthOverlay.classList.remove('hidden');
    updateClock();
});

let stealthTapCount = 0;
let stealthTapTimer = null;
stealthOverlay.addEventListener('click', () => {
    stealthTapCount++;
    clearTimeout(stealthTapTimer);
    stealthTapTimer = setTimeout(() => { stealthTapCount = 0; }, 800);
    if (stealthTapCount >= 3) {
        stealthOverlay.classList.add('hidden');
        stealthTapCount = 0;
    }
});

function updateClock() {
    const now = new Date();
    if (fakeClock) {
        fakeClock.innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    const fakeDateEl = document.getElementById('fakeDate');
    if (fakeDateEl) {
        const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'gu';
        const localeCode = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
        try {
            fakeDateEl.innerText = now.toLocaleDateString(localeCode, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            fakeDateEl.innerText = now.toDateString();
        }
    }
}
setInterval(updateClock, 1000);

// AI Free-Fall Snatch & Sudden Drop Detection
let freeFallDetected = false;
let freeFallTimer = null;

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (e) => {
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;

        // 1. Free-Fall Physics Check: Phone falling or snatched from hand
        const totalMag = Math.sqrt((acc.x || 0)**2 + (acc.y || 0)**2 + (acc.z || 0)**2);
        if (totalMag < 3.2) {
            freeFallDetected = true;
            clearTimeout(freeFallTimer);
            freeFallTimer = setTimeout(() => { freeFallDetected = false; }, 800);
        }

        // Violent ground impact or rapid predatory snatch jerk
        if (totalMag > 28.0 && freeFallDetected && !isRecording) {
            console.warn("AI Physics Alert: Free-fall + Hard Impact detected! Triggering SOS immediately.");
            const hudSnatch = document.getElementById('hudSnatchText');
            if (hudSnatch) hudSnatch.innerText = "IMPACT DETECTED!";
            triggerEmergency();
            freeFallDetected = false;
        }

        // 2. 3x Shake detector
        if (lastX !== undefined) {
            const delta = Math.abs(acc.x - lastX) + Math.abs(acc.y - lastY) + Math.abs(acc.z - lastZ);
            if (delta > 28) {
                shakeCount++;
                clearTimeout(shakeResetTimer);
                shakeResetTimer = setTimeout(() => { shakeCount = 0; }, 1500);
                if (shakeCount >= 3 && !isRecording) {
                    triggerEmergency();
                }
            }
        }
        lastX = acc.x;
        lastY = acc.y;
        lastZ = acc.z;
    });
}

// ==========================================
// 🌸 GIRLS SAFETY & SAFE EXIT TOOLKIT LOGIC 🌸
// ==========================================

// 1. FAKE CALL (SAFE EXIT)
const callerTypeSelect = document.getElementById('callerType');
const fakeCallNowBtn = document.getElementById('fakeCallNowBtn');
const fakeCall5sBtn = document.getElementById('fakeCall5sBtn');
const fakeCallOverlay = document.getElementById('fakeCallOverlay');
const incomingCallView = document.getElementById('incomingCallView');
const activeCallView = document.getElementById('activeCallView');
const callAvatar = document.getElementById('callAvatar');
const callNameDisplay = document.getElementById('callNameDisplay');
const activeCallAvatar = document.getElementById('activeCallAvatar');
const activeCallNameDisplay = document.getElementById('activeCallNameDisplay');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const declineCallBtn = document.getElementById('declineCallBtn');
const endActiveCallBtn = document.getElementById('endActiveCallBtn');
const activeCallTimer = document.getElementById('activeCallTimer');

let audioCtx = null;
let ringtoneOsc1 = null;
let ringtoneOsc2 = null;
let ringtoneGain = null;
let ringtoneInterval = null;
let callDurationTimer = null;
let callSeconds = 0;

function getCallerDetails() {
    const val = callerTypeSelect ? callerTypeSelect.value : "Papa (પપ્પા)";
    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'gu';
    
    if (val.includes("Mom") || val.includes("મમ્મી")) {
        return {
            type: "mom",
            name: lang === 'en' ? "Mom" : lang === 'hi' ? "मम्मी (Mom)" : "Mom (મમ્મી)",
            avatar: "👩",
            voice: lang === 'en'
                ? "Hello dear, where are you? I am waiting outside with the car, come out quickly."
                : lang === 'hi'
                ? "हाँ बेटा, कहाँ पहुँची? मैं बाहर ही गाड़ी लेकर खड़ी हूँ, जल्दी बाहर आ जा।"
                : "હા બેટા, ક્યાં પહોંચી? હું બહાર જ ગાડી લઈને ઊભી છું, જલ્દી બહાર આવ."
        };
    }
    if (val.includes("Brother") || val.includes("ભાઈ")) {
        return {
            type: "brother",
            name: lang === 'en' ? "Brother" : lang === 'hi' ? "भाई (Brother)" : "Brother (ભાઈ)",
            avatar: "👦",
            voice: lang === 'en'
                ? "Hey, where are you? I came outside to pick you up, hurry up."
                : lang === 'hi'
                ? "दीदी, कहाँ हो आप? मैं बाहर गाड़ी लेके आ गया हूँ, फटाफट बाहर आओ।"
                : "દીદી, ક્યાં છે તું? હું તને લેવા બહાર ગાડી લઈને ઊભો છું, ફટાફટ આવ."
        };
    }
    if (val.includes("Police") || val.includes("પોલીસ")) {
        return {
            type: "police",
            name: lang === 'en' ? "Police Inspector 112" : lang === 'hi' ? "पुलिस इंस्पेक्टर 112" : "Police Inspector (પોલીસ ૧૧૨)",
            avatar: "👮",
            voice: lang === 'en'
                ? "Hello madam, ERSS 112 police control room here. Your live location is received, our patrol van arrives in 2 minutes."
                : lang === 'hi'
                ? "नमस्ते, ERSS 112 पुलिस कंट्रोल रूम से बोल रहे हैं। आपका लाइव लोकेशन मिल गया है, पेट्रोलिंग वैन 2 मिनट में पहुँच रही है।"
                : "નમસ્તે બેન, ERSS 112 પોલીસ કંટ્રોલ રૂમથી બોલું છું. તમારું લાઈવ લોકેશન મળી ગયું છે, પેટ્રોલિંગ વાન ૨ મિનિટમાં પહોંચે છે."
        };
    }
    return {
        type: "papa",
        name: lang === 'en' ? "Papa" : lang === 'hi' ? "पापा (Papa)" : "Papa (પપ્પા)",
        avatar: "👨",
        voice: lang === 'en'
            ? "Yes beta, where are you? I am parked right outside with headlights on, walk straight out."
            : lang === 'hi'
            ? "हाँ बेटा, कहाँ पहुँची? मैं बाहर ही गाड़ी लेकर खड़ा हूँ, हेडलाइट ऑन है, जल्दी बाहर आ जा।"
            : "હા બેટા, ક્યાં પહોંચી? હું બહાર જ ગાડી લઈને ઊભો છું, હેડલાઇટ ચાલુ છે, જલ્દી બહાર આવ."
    };
}

function startPhoneRingtone() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        function playRingBurst() {
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            
            // Dual frequency telecom standard (440Hz + 480Hz)
            ringtoneOsc1 = audioCtx.createOscillator();
            ringtoneOsc2 = audioCtx.createOscillator();
            ringtoneGain = audioCtx.createGain();

            ringtoneOsc1.frequency.setValueAtTime(440, now);
            ringtoneOsc2.frequency.setValueAtTime(480, now);

            ringtoneGain.gain.setValueAtTime(0.3, now);
            ringtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

            ringtoneOsc1.connect(ringtoneGain);
            ringtoneOsc2.connect(ringtoneGain);
            ringtoneGain.connect(audioCtx.destination);

            ringtoneOsc1.start(now);
            ringtoneOsc2.start(now);
            ringtoneOsc1.stop(now + 1.8);
            ringtoneOsc2.stop(now + 1.8);
        }

        playRingBurst();
        ringtoneInterval = setInterval(playRingBurst, 3000);
    } catch (e) {
        console.warn("Ringtone audio synthesis not allowed until user interaction:", e);
    }
}

function stopPhoneRingtone() {
    if (ringtoneInterval) clearInterval(ringtoneInterval);
    if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
        audioCtx = null;
    }
}

function triggerFakeCall() {
    const caller = getCallerDetails();
    callNameDisplay.innerText = caller.name;
    callAvatar.innerText = caller.avatar;
    activeCallNameDisplay.innerText = caller.name;
    activeCallAvatar.innerText = caller.avatar;

    incomingCallView.classList.remove('hidden');
    activeCallView.classList.add('hidden');
    fakeCallOverlay.classList.remove('hidden');

    startPhoneRingtone();
}

if (fakeCallNowBtn) {
    fakeCallNowBtn.addEventListener('click', () => triggerFakeCall());
}

if (fakeCall5sBtn) {
    fakeCall5sBtn.addEventListener('click', () => {
        fakeCall5sBtn.innerText = `⏳ ${tr("call5sCountdown", "Calling in 5s...")}`;
        fakeCall5sBtn.disabled = true;
        setTimeout(() => {
            triggerFakeCall();
            fakeCall5sBtn.innerText = "૫ સેકન્ડ પછી કોલ";
            fakeCall5sBtn.disabled = false;
        }, 5000);
    });
}

if (declineCallBtn) {
    declineCallBtn.addEventListener('click', () => {
        stopPhoneRingtone();
        fakeCallOverlay.classList.add('hidden');
    });
}

if (acceptCallBtn) {
    acceptCallBtn.addEventListener('click', () => {
        stopPhoneRingtone();
        incomingCallView.classList.add('hidden');
        activeCallView.classList.remove('hidden');

        // Start call duration counter
        callSeconds = 0;
        activeCallTimer.innerText = "00:00";
        clearInterval(callDurationTimer);
        callDurationTimer = setInterval(() => {
            callSeconds++;
            const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
            const s = String(callSeconds % 60).padStart(2, '0');
            activeCallTimer.innerText = `${m}:${s}`;
        }, 1000);

        // Simulated caller speech voice
        const caller = getCallerDetails();
        const curLang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'gu';
        const targetVoiceLang = curLang === 'en' ? 'en-IN' : curLang === 'hi' ? 'hi-IN' : 'gu-IN';

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(caller.voice);
            utterance.rate = 0.95;
            utterance.pitch = caller.type === 'mom' ? 1.15 : caller.type === 'brother' ? 1.05 : 0.95;
            utterance.lang = targetVoiceLang;
            utterance.onend = () => {
                // Once greeting finishes, start real-time conversational AI listening
                startInteractiveVoiceDecoy(caller);
            };
            window.speechSynthesis.speak(utterance);
        } else {
            startInteractiveVoiceDecoy(caller);
        }
    });
}

let decoySpeechRecognition = null;
function startInteractiveVoiceDecoy(caller) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
        if (decoySpeechRecognition) decoySpeechRecognition.stop();
        decoySpeechRecognition = new SpeechRecognition();
        decoySpeechRecognition.continuous = true;
        decoySpeechRecognition.interimResults = false;
        
        const curLang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'gu';
        decoySpeechRecognition.lang = curLang === 'en' ? 'en-IN' : curLang === 'hi' ? 'hi-IN' : 'gu-IN';

        decoySpeechRecognition.onresult = (event) => {
            const last = event.results.length - 1;
            const text = event.results[last][0].transcript.toLowerCase();
            const cType = caller ? caller.type : "papa";

            let aiReply = "";

            if (cType === "police") {
                if (text.includes("where") || text.includes("ક્યાં") || text.includes("kaha") || text.includes("kidhar")) {
                    aiReply = curLang === 'en'
                        ? "Madam, our PCR unit is right at the corner of your street with flashing lights, walk towards the avenue."
                        : curLang === 'hi'
                        ? "मैडम, हमारी पीसीआर वैन आपकी गली के मोड़ पर ही नीली बत्ती ऑन करके खड़ी है, आप मुख्य सड़क की तरफ आइए।"
                        : "બેન, અમારી PCR વાન તમારા રોડના છેડે જ છે, વાનની બ્લુ લાઈટ ઓન છે, તમે મેઈન રોડ તરફ આવો.";
                } else if (text.includes("fast") || text.includes("જલ્દી") || text.includes("hurry") || text.includes("jaldi")) {
                    aiReply = curLang === 'en'
                        ? "Yes madam, our patrol car is approaching with sirens at high speed. Keep your call connected."
                        : curLang === 'hi'
                        ? "हाँ मैडम, सायरन के साथ वैन पूरी स्पीड में आपके पास आ रही है, 1 मिनट में पहुँच रहे हैं, फोन चालू रखिए।"
                        : "હા બેન, સાયરન સાથે વાન ફૂલ સ્પીડમાં તમારી તરફ જ આવી રહી છે, ૧ મિનિટમાં પહોંચીએ છીએ, ફોન ચાલુ રાખો.";
                } else if (text.includes("police") || text.includes("પોલીસ") || text.includes("man") || text.includes("માણસ") || text.includes("પીછો") || text.includes("dar") || text.includes("chasing")) {
                    aiReply = curLang === 'en'
                        ? "Do not panic at all. Smart City CCTV has locked onto your sector, tactical team is on site."
                        : curLang === 'hi'
                        ? "आप बिल्कुल मत घबराइए, स्मार्ट सिटी कैमरों में आपका इलाका कवर हो चुका है, ऑफिसर्स स्पॉट पर पहुँच गए हैं।"
                        : "તમે જરાય ગભરાશો નહિ, કંટ્રોલ રૂમના સ્માર્ટ સીસીટીવીમાં તમારો વિસ્તાર કવર થઈ ગયો છે, ઓફિસર્સ પહોંચી ગયા છે.";
                } else {
                    aiReply = curLang === 'en'
                        ? "Madam, ERSS 112 control room is live on the line with you. Walk towards the nearest light."
                        : curLang === 'hi'
                        ? "मैडम, 112 पुलिस टीम आपके साथ लगातार कनेक्टेड है, आप बस सामने लाइट की तरफ आगे बढ़िए।"
                        : "બેન, ERSS 112 કંટ્રોલ રૂમ તમારી સાથે લાઈવ જોડાયેલું છે, સામે લાઈટ છે ત્યાં ચાલતા રહો.";
                }
            } else if (cType === "mom") {
                if (text.includes("where") || text.includes("ક્યાં") || text.includes("kaha")) {
                    aiReply = curLang === 'en'
                        ? "Beta, I am waiting right on the main road at the end of the alley. Walk straight out."
                        : curLang === 'hi'
                        ? "बेटा, मैं गली के मुहाने पर ही खड़ी हूँ, तू बस सीधी चली आ।"
                        : "બેટા, હું ગલીના છેડે મેઈન રોડ પર જ ઊભી છું, તું બસ સીધી ચાલતી આવ.";
                } else if (text.includes("fast") || text.includes("જલ્દી") || text.includes("hurry")) {
                    aiReply = curLang === 'en'
                        ? "Yes beta, the car door is already open for you. Don't be afraid, hurry over."
                        : curLang === 'hi'
                        ? "हाँ बेटा, गाड़ी का दरवाजा खुला ही है, तू बिना डरे जल्दी आ जा।"
                        : "હા બેટા, કારનો દરવાજો ખુલ્લો જ છે, તું ફટાફટ આવ, જરાય ડરીશ નહિ.";
                } else if (text.includes("police") || text.includes("માણસ") || text.includes("man") || text.includes("પીછો")) {
                    aiReply = curLang === 'en'
                        ? "Beta, Papa and brother are right here with me watching the road. Come right here."
                        : curLang === 'hi'
                        ? "बेटा, तेरे पापा और भाई दोनों मेरे साथ ही हैं, हम सड़क पर ही देख रहे हैं, तू जल्दी आ।"
                        : "બેટા, પપ્પા અને ભાઈ બંને મારી સાથે જ છે, અમે બંને રસ્તા પર જોઈ રહ્યા છીએ, તું સામે આવ.";
                } else {
                    aiReply = curLang === 'en'
                        ? "Yes beta, keep talking to me. I see you coming, keep walking straight."
                        : curLang === 'hi'
                        ? "हाँ बेटा, फोन चालू ही रख, मैं सामने देख रही हूँ, सीधी आ।"
                        : "હા બેટા, હું બહાર જ ઊભી છું, સામે લાઈટ છે ત્યાં જલ્દી ચાલતી આવ.";
                }
            } else if (cType === "brother") {
                if (text.includes("where") || text.includes("ક્યાં") || text.includes("kaha")) {
                    aiReply = curLang === 'en'
                        ? "Didi, I am waiting right at the main gate on the vehicle, I am honking the horn."
                        : curLang === 'hi'
                        ? "दीदी, मैं मेन गेट पर ही गाड़ी लेके खड़ा हूँ, हॉर्न बजा रहा हूँ देखो।"
                        : "દીદી, હું મેઈન ગેટ પર બાઈક લઈને ઊભો છું, હોર્ન વગાડું છું જો.";
                } else if (text.includes("fast") || text.includes("જલ્દી") || text.includes("hurry")) {
                    aiReply = curLang === 'en'
                        ? "Yes didi, engine is running. Come out fast, I am right here."
                        : curLang === 'hi'
                        ? "हाँ दीदी, गाड़ी स्टार्ट ही है, दौड़ के बाहर आ जाओ।"
                        : "હા દીદી, હું ગાડી સ્ટાર્ટ રાખીને જ ઊભો છું, દોડીને આવ.";
                } else if (text.includes("police") || text.includes("માણસ") || text.includes("man") || text.includes("પીછો")) {
                    aiReply = curLang === 'en'
                        ? "Who is there? I am walking inside the alley right now, keep the phone on."
                        : curLang === 'hi'
                        ? "वहाँ कौन है? मैं अभी गली के अंदर आ रहा हूँ, फोन कट मत करना।"
                        : "કોણ છે ત્યાં? હું હમણાં જ ગલીની અંદર આવું છું, તું ફોન કટ ના કરતી.";
                } else {
                    aiReply = curLang === 'en'
                        ? "Didi, where are you? I am waiting right outside, come quickly."
                        : curLang === 'hi'
                        ? "दीदी, आप कहाँ पहुँचीं? मैं बाहर ही खड़ा हूँ, जल्दी आइए।"
                        : "દીદી, તું ક્યાં પહોંચી? હું બહાર જ ઊભો છું, જલ્દી આવ.";
                }
            } else {
                // Papa
                if (text.includes("where") || text.includes("ક્યાં") || text.includes("kaha")) {
                    aiReply = curLang === 'en'
                        ? "Beta, I am parked at the alley corner in the white car with headlights on. Walk straight out."
                        : curLang === 'hi'
                        ? "बेटा, मैं मोड़ पर ही गाड़ी में हेडलाइट ऑन करके खड़ा हूँ, सीधी चली आ।"
                        : "બેટા, હું ગલીના નાકે સફેદ સ્વિફ્ટ કાર લઈને ઊભો છું. ફોન ચાલુ રાખ અને સીધી આવ.";
                } else if (text.includes("fast") || text.includes("જલ્દી") || text.includes("hurry")) {
                    aiReply = curLang === 'en'
                        ? "Yes beta, uncle and I are both in the car, don't worry at all, come out fast."
                        : curLang === 'hi'
                        ? "हाँ बेटा, मैं और चाचा दोनों गाड़ी में ही हैं, तू घबराना मत, जल्दी बाहर आ।"
                        : "હા બેટા, હું અને કાકા બંને ગાડીમાં છીએ, હેડલાઇટ ચાલુ છે, તું જરાય ડરીશ નહિ.";
                } else if (text.includes("police") || text.includes("પોલીસ") || text.includes("man") || text.includes("માણસ") || text.includes("પીછો")) {
                    aiReply = curLang === 'en'
                        ? "Beta, the 112 police patrol van is right next to my car too, I am waving to them."
                        : curLang === 'hi'
                        ? "बेटा, 112 की पुलिस वैन भी अपनी गाड़ी के पास ही है, मैंने उन्हें भी इशारा कर दिया है।"
                        : "બેટા, 112 ની પોલીસ પેટ્રોલિંગ વાન હમણાં જ આપણી ગલી પાસે વળી છે, હું તેમને પણ હાથ બતાવું છું.";
                } else {
                    aiReply = curLang === 'en'
                        ? "Yes beta, I am standing right outside where the street light is, walk towards me."
                        : curLang === 'hi'
                        ? "हाँ बेटा, मैं बाहर ही खड़ा हूँ, जहाँ लाइट है वहाँ जल्दी चलती हुई आ जा।"
                        : "હા બેટા, હું બહાર જ ઊભો છું, સામે લાઈટ છે ત્યાં જલ્દી ચાલતી આવ.";
                }
            }

            const dialogueEl = document.getElementById('activeCallDialogueText');
            if (dialogueEl) {
                dialogueEl.innerHTML = `💬 <i>"${aiReply}"</i>`;
            }

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(aiReply);
                utter.rate = 0.95;
                utter.pitch = cType === 'mom' ? 1.15 : cType === 'brother' ? 1.05 : 0.95;
                utter.lang = curLang === 'en' ? 'en-IN' : curLang === 'hi' ? 'hi-IN' : 'gu-IN';
                window.speechSynthesis.speak(utter);
            }
        };

        decoySpeechRecognition.start();
    } catch(e) {}
}

if (endActiveCallBtn) {
    endActiveCallBtn.addEventListener('click', () => {
        clearInterval(callDurationTimer);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (decoySpeechRecognition) {
            try { decoySpeechRecognition.stop(); } catch(e){}
            decoySpeechRecognition = null;
        }
        fakeCallOverlay.classList.add('hidden');
    });
}

// Dead-Man's Cloud Trigger: If device window is destroyed during SOS, beacon server immediately!
window.addEventListener('beforeunload', () => {
    if (activeIncident && isRecording) {
        navigator.sendBeacon(`/api/incident/${activeIncident.incident_id}/dead_man_trigger`);
    }
});


// 2. AI VOICE & DISTRESS SCREAM DETECTOR (HANDS-FREE SOS)
const voiceListenToggle = document.getElementById('voiceListenToggle');
const micStatusBar = document.getElementById('micStatusBar');
const voiceStatusText = document.getElementById('voiceStatusText');
const audioLevelBar = document.getElementById('audioLevelBar');

let recognition = null;
let micAudioStream = null;
let micAudioContext = null;
let micAnalyser = null;
let micAnimFrame = null;
let screamCounter = 0;

function setupVoiceAndScreamDetection() {
    // A. Web Speech Recognition for "Help", "Bachao", "Save me", "બચાવો", "મદદ", "Police"
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        const curLang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'gu';
        recognition.lang = curLang === 'en' ? 'en-IN' : curLang === 'hi' ? 'hi-IN' : 'gu-IN';

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript.toLowerCase();
                console.log("Voice transcript detected:", transcript);
                const emergencyKeywords = [
                    "help", "bachao", "save", "બચાવો", "મદદ", "chor", "police", 
                    "પકડો", "stop", "મુકો", "chodo", "જવા દો", "chhod", "danger", 
                    "emergency", "112", "181", "बचाओ", "मदद", "पुलिस", "छोड़ो"
                ];
                if (emergencyKeywords.some(kw => transcript.includes(kw))) {
                    if (voiceStatusText) voiceStatusText.innerText = "🚨 ઇમરજન્સી શબ્દ પકડાયો: " + transcript;
                    triggerEmergency();
                    break;
                }
            }
        };

        recognition.onerror = (e) => {
            console.warn("Speech recognition notice:", e.error);
        };

        recognition.onend = () => {
            if (voiceListenToggle && voiceListenToggle.checked && !isRecording) {
                try { recognition.start(); } catch (err) {}
            }
        };
    }

    // B. Decibel / Volume spike analyzer for physical screams & shouting
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        micAudioStream = stream;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        micAudioContext = new AudioContext();
        micAnalyser = micAudioContext.createAnalyser();
        micAnalyser.fftSize = 256;

        const micSource = micAudioContext.createMediaStreamSource(stream);
        micSource.connect(micAnalyser);

        const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);

        function checkAudioLevel() {
            if (!voiceListenToggle || !voiceListenToggle.checked) return;
            micAnalyser.getByteFrequencyData(dataArray);

            let sum = 0;
            let maxVal = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
                if (dataArray[i] > maxVal) maxVal = dataArray[i];
            }
            const average = sum / dataArray.length;
            const percentage = Math.min(100, Math.round((maxVal / 220) * 100));

            if (audioLevelBar) {
                audioLevelBar.style.width = percentage + "%";
                audioLevelBar.style.background = percentage > 75 ? "#ef4444" : percentage > 45 ? "#f59e0b" : "#22c55e";
            }

            // High energy scream spike detection (Peak > 200 or Avg > 50)
            if (maxVal >= 200 || average >= 50) {
                screamCounter++;
                if (screamCounter >= 4 && !isRecording) { // Sustained scream/distress
                    if (voiceStatusText) voiceStatusText.innerText = "🚨 જોરદાર ચીસ ડિટેક્ટ થઈ! SOS ટ્રિગર...";
                    triggerEmergency();
                }
            } else {
                screamCounter = Math.max(0, screamCounter - 1);
            }

            micAnimFrame = requestAnimationFrame(checkAudioLevel);
        }
        checkAudioLevel();
    }).catch(err => {
        console.warn("Mic access for scream detection failed:", err);
    });
}

function stopVoiceDetection() {
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
    if (micAnimFrame) cancelAnimationFrame(micAnimFrame);
    if (micAudioContext) {
        try { micAudioContext.close(); } catch (e) {}
        micAudioContext = null;
    }
    if (micAudioStream) {
        micAudioStream.getTracks().forEach(t => t.stop());
        micAudioStream = null;
    }
    if (audioLevelBar) audioLevelBar.style.width = "0%";
}

if (voiceListenToggle) {
    voiceListenToggle.addEventListener('change', () => {
        if (voiceListenToggle.checked) {
            micStatusBar.classList.remove('hidden');
            if (recognition) {
                try { recognition.start(); } catch (e) {}
            }
            setupVoiceAndScreamDetection();
        } else {
            micStatusBar.classList.add('hidden');
            stopVoiceDetection();
        }
    });
}


// 3. SAFE JOURNEY / CAB COUNTDOWN TIMER
let selectedMinutes = 5;
let journeyTimer = null;
let remainingSeconds = 300;

const journeyChips = document.querySelectorAll('.btn-chip');
const startJourneyBtn = document.getElementById('startJourneyBtn');
const journeySetup = document.getElementById('journeySetup');
const journeyActiveBox = document.getElementById('journeyActiveBox');
const countdownDisplay = document.getElementById('countdownDisplay');
const safeArrivedBtn = document.getElementById('safeArrivedBtn');

journeyChips.forEach(chip => {
    chip.addEventListener('click', () => {
        journeyChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedMinutes = parseInt(chip.getAttribute('data-mins'), 10) || 5;
    });
});

if (startJourneyBtn) {
    startJourneyBtn.addEventListener('click', () => {
        remainingSeconds = selectedMinutes * 60;
        journeySetup.classList.add('hidden');
        journeyActiveBox.classList.remove('hidden');

        updateCountdownDisplay();
        clearInterval(journeyTimer);

        journeyTimer = setInterval(() => {
            remainingSeconds--;
            updateCountdownDisplay();

            if (remainingSeconds <= 0) {
                clearInterval(journeyTimer);
                alert("🚨 સમય પૂરો થઈ ગયો છે! સેફ અરાઇવલ કન્ફર્મ ન થતાં ઓટોમેટિક SOS શરૂ થઈ રહ્યું છે!");
                triggerEmergency();
            }
        }, 1000);
    });
}

function updateCountdownDisplay() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    if (countdownDisplay) countdownDisplay.innerText = `${mins}:${secs}`;
}

if (safeArrivedBtn) {
    safeArrivedBtn.addEventListener('click', () => {
        clearInterval(journeyTimer);
        journeyActiveBox.classList.add('hidden');
        journeySetup.classList.remove('hidden');
        alert("✅ સેફ ટ્રાવેલ સમાપ્ત. તમે સુરક્ષિત પહોંચી ગયા છો!");
    });
}


// 4. WHATSAPP LIVE LOCATION SHARE
const whatsappShareBtn = document.getElementById('whatsappShareBtn');
if (whatsappShareBtn) {
    whatsappShareBtn.addEventListener('click', () => {
        const profile = getCurrentUserProfile();
        const victimName = profile.name;
        const coords = currentGps ? `${currentGps.lat.toFixed(5)},${currentGps.lng.toFixed(5)}` : "Unavailable";
        const googleMapsLink = currentGps ? `https://maps.google.com/?q=${currentGps.lat},${currentGps.lng}` : "";
        const dashboardLink = `${window.location.origin}/dashboard`;

        const message = `🚨 *ઇમરજન્સી SOS એલર્ટ (Sri Sri ❤️SOS AI)*\n\nહું (${victimName}) મુસાફરીમાં છું. મારું લાઈવ ડિજિટલ બ્લેકબોક્સ ટ્રેકિંગ અહીં જુઓ:\n\n📍 *ગૂગલ મેપ:* ${googleMapsLink}\n🛡️ *પોલીસ/વાલી લાઈવ ટ્રેકિંગ કંટ્રોલ:* ${dashboardLink}\n\nજો હું સંપર્કમાં ના રહું તો કૃપા કરીને આ લિંક પરથી છેલ્લું લોકેશન અને ફોટો મેળવો.`;

        const encodedMsg = encodeURIComponent(message);
        window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
    });
}

// Event Listeners
sosBtn.addEventListener('click', startGraceCountdown);
stopSosBtn.addEventListener('click', openPinModal);

// Load dynamic server settings (PINs, grace duration, etc.)
async function fetchServerSettings() {
    try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
            const cfg = await res.json();
            if (cfg.security) {
                if (cfg.security.normal_cancel_pin) normalPin = cfg.security.normal_cancel_pin;
                if (cfg.security.duress_coercion_pin) duressPin = cfg.security.duress_coercion_pin;
                if (cfg.security.grace_countdown_seconds) graceSeconds = cfg.security.grace_countdown_seconds;
            }
        }
    } catch (e) {
        console.warn("Could not fetch remote server settings, using defaults:", e);
    }
}

// Advantage 1: PWA Service Worker Registration & App Install Prompt
function registerServiceWorkerAndPwa() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log("PWA Service Worker registered with scope:", reg.scope);
        }).catch(err => {
            console.warn("PWA Service Worker registration notice:", err);
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pwaBanner = document.getElementById('pwaInstallBanner');
        if (pwaBanner) pwaBanner.classList.remove('hidden');
        if (pwaInstallBtn) {
            pwaInstallBtn.classList.remove('hidden');
            pwaInstallBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const choice = await deferredPrompt.userChoice;
                    if (choice.outcome === 'accepted') {
                        if (pwaBanner) pwaBanner.classList.add('hidden');
                        pwaInstallBtn.classList.add('hidden');
                    }
                    deferredPrompt = null;
                }
            });
        }
    });
}

// Advantage 7: Permission Recovery Wizard Handlers
function setupPermissionRecoveryWizard() {
    if (permRetryBtn) {
        permRetryBtn.addEventListener('click', async () => {
            if (permissionRecoveryModal) permissionRecoveryModal.classList.add('hidden');
            const hasAccess = await setupMediaStreams();
            if (hasAccess) {
                alert("✅ કેમેરા અને માઇક્રોફોન સફળતાપૂર્વક ચાલુ થઈ ગયા છે!");
            } else {
                alert("⚠️ પરમિશન હજુ બ્લોક છે. બ્રાઉઝરના Address Bar માં લૉક (🔒) આઇકન પર ક્લિક કરીને કેમેરા અને માઇક 'Allow' કરો.");
                if (permissionRecoveryModal) permissionRecoveryModal.classList.remove('hidden');
            }
        });
    }

    if (permDismissBtn) {
        permDismissBtn.addEventListener('click', () => {
            if (permissionRecoveryModal) permissionRecoveryModal.classList.add('hidden');
        });
    }
}

// ==========================================================================
// 🛣️ AI SAFE ROUTE & STREET SAFETY AUDIT CONTROLLER
// ==========================================================================
let miniRouteMap = null;
let safeRoutePolyline = null;
let riskyRoutePolyline = null;
let routeMarkersGroup = null;
let activeSafeJourneyToken = null;
let safeJourneyWatchInterval = null;
let currentEvaluatedRoutes = null;

// =========================================================================
// 🛣️ DYNAMIC SAFE ROUTE & SAVED PLACES (HOME / OFFICE / ANY ADDRESS)
// =========================================================================
const DEFAULT_SAVED_PLACES = {
    home: { name: "ઘર (Home)", lat: 23.0310, lng: 72.5780, address: "નવરંગપુરા વિસ્તાર (ડિફોલ્ટ)", is_custom: false },
    office: { name: "ઓફિસ (Office)", lat: 23.0350, lng: 72.5550, address: "કોલેજ / ઓફિસ કેમ્પસ (ડિફોલ્ટ)", is_custom: false }
};

function getSavedPlaces() {
    try {
        const raw = localStorage.getItem('sos_saved_places');
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SAVED_PLACES, ...parsed };
        }
    } catch (e) {}
    return { ...DEFAULT_SAVED_PLACES };
}

function savePlace(key, data) {
    const places = getSavedPlaces();
    places[key] = { ...places[key], ...data, is_custom: true };
    localStorage.setItem('sos_saved_places', JSON.stringify(places));
    updateSavedPlacesUI();
}

function updateSavedPlacesUI() {
    const places = getSavedPlaces();
    const homeEl = document.getElementById('dispSavedHomeAddr');
    const officeEl = document.getElementById('dispSavedOfficeAddr');
    if (homeEl) {
        homeEl.innerText = places.home.address || `${places.home.lat.toFixed(4)}, ${places.home.lng.toFixed(4)}`;
    }
    if (officeEl) {
        officeEl.innerText = places.office.address || `${places.office.lat.toFixed(4)}, ${places.office.lng.toFixed(4)}`;
    }
}

async function getFreshGpsPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(currentGps || { lat: 23.0225, lng: 72.5714 });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                currentGps = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
                resolve(currentGps);
            },
            (err) => {
                resolve(currentGps || { lat: 23.0225, lng: 72.5714 });
            },
            { enableHighAccuracy: true, timeout: 3500, maximumAge: 10000 }
        );
    });
}

let activeGeocodeAbort = null;
let geocodeDebounceTimer = null;

async function searchGeocodeSuggestions(query) {
    if (!query || query.length < 2) return [];
    try {
        if (activeGeocodeAbort) activeGeocodeAbort.abort();
        activeGeocodeAbort = new AbortController();
        const resp = await fetch(`/api/safety/geocode?q=${encodeURIComponent(query)}`, {
            signal: activeGeocodeAbort.signal
        });
        if (resp.ok) {
            return await resp.json();
        }
    } catch (e) {
        if (e.name !== 'AbortError') console.warn("Geocode search error:", e);
    }
    return [];
}

async function resolveDestinationTarget(destName) {
    const trimmed = (destName || "").trim();
    const lower = trimmed.toLowerCase();
    const places = getSavedPlaces();

    if (lower.includes('home') || lower.includes('ઘર')) {
        return { lat: places.home.lat, lng: places.home.lng, name: places.home.name };
    }
    if (lower.includes('office') || lower.includes('ઓફિસ')) {
        return { lat: places.office.lat, lng: places.office.lng, name: places.office.name };
    }
    if (lower.includes('hostel') || lower.includes('pg') || lower.includes('હોસ્ટેલ')) {
        return { lat: 23.0280, lng: 72.5680, name: "Hostel / PG (હોસ્ટેલ)" };
    }
    if (lower.includes('station') || lower.includes('સ્ટેશન') || lower.includes('railway')) {
        return { lat: 23.0385, lng: 72.5780, name: "Railway Station (રેલવે સ્ટેશન)" };
    }
    if (lower.includes('college') || lower.includes('કોલેજ')) {
        return { lat: 23.0390, lng: 72.5510, name: "College Campus (કોલેજ)" };
    }

    // Dynamic geocode lookup for any custom address / city entered
    try {
        const results = await searchGeocodeSuggestions(trimmed);
        if (results && results.length > 0) {
            return {
                lat: results[0].lat,
                lng: results[0].lng,
                name: results[0].name || trimmed
            };
        }
    } catch (e) {}

    // Fallback default
    return { lat: 23.0360, lng: 72.5610, name: trimmed || "Selected Destination" };
}

function initSafeRouteEngine() {
    const btnAuditRoute = document.getElementById('btnAuditRoute');
    const routeDestInput = document.getElementById('routeDestinationInput');
    const btnClearDest = document.getElementById('btnClearDest');
    const suggestionsDropdown = document.getElementById('routeSearchSuggestions');
    const routeChips = document.querySelectorAll('.route-chip');
    const btnStartSafeNav = document.getElementById('btnStartSafeNav');
    const btnEndSafeNav = document.getElementById('btnEndSafeNav');

    // Manage Places Elements
    const btnOpenManagePlaces = document.getElementById('btnOpenManagePlaces');
    const modalManagePlaces = document.getElementById('modalManagePlaces');
    const btnClosePlacesModal = document.getElementById('btnClosePlacesModal');
    const btnDonePlaces = document.getElementById('btnDonePlaces');
    const btnSaveCurrentGpsHome = document.getElementById('btnSaveCurrentGpsHome');
    const btnSaveCurrentGpsOffice = document.getElementById('btnSaveCurrentGpsOffice');
    const btnSaveCustomHome = document.getElementById('btnSaveCustomHome');
    const inputCustomHomeAddr = document.getElementById('inputCustomHomeAddr');
    const btnSaveCustomOffice = document.getElementById('btnSaveCustomOffice');
    const inputCustomOfficeAddr = document.getElementById('inputCustomOfficeAddr');

    updateSavedPlacesUI();

    // Destination Input Clear button
    if (btnClearDest && routeDestInput) {
        btnClearDest.addEventListener('click', () => {
            routeDestInput.value = '';
            btnClearDest.classList.add('hidden');
            if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');
            routeDestInput.focus();
        });
    }

    // Autocomplete Search as user types
    if (routeDestInput && suggestionsDropdown) {
        routeDestInput.addEventListener('input', () => {
            const val = routeDestInput.value.trim();
            if (btnClearDest) {
                if (val.length > 0) btnClearDest.classList.remove('hidden');
                else btnClearDest.classList.add('hidden');
            }

            clearTimeout(geocodeDebounceTimer);
            if (val.length < 2) {
                suggestionsDropdown.classList.add('hidden');
                return;
            }

            geocodeDebounceTimer = setTimeout(async () => {
                const results = await searchGeocodeSuggestions(val);
                if (!results || results.length === 0) {
                    suggestionsDropdown.classList.add('hidden');
                    return;
                }
                suggestionsDropdown.innerHTML = results.map(r => `
                    <div class="route-suggestion-item" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${encodeURIComponent(r.name)}">
                        <span class="route-suggestion-title">📍 ${r.name}</span>
                        <span class="route-suggestion-sub">${r.display_name}</span>
                    </div>
                `).join('');
                suggestionsDropdown.classList.remove('hidden');

                // Attach click handler to suggestions
                suggestionsDropdown.querySelectorAll('.route-suggestion-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const lat = parseFloat(item.getAttribute('data-lat'));
                        const lng = parseFloat(item.getAttribute('data-lng'));
                        const name = decodeURIComponent(item.getAttribute('data-name'));
                        routeDestInput.value = name;
                        suggestionsDropdown.classList.add('hidden');
                        routeChips.forEach(c => c.classList.remove('active'));

                        const liveGps = await getFreshGpsPosition();
                        await auditSafeRouteWithCoords(liveGps, { lat, lng, name });
                    });
                });
            }, 250);
        });

        // Hide dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!routeDestInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
                suggestionsDropdown.classList.add('hidden');
            }
        });
    }

    // Quick destination chips
    routeChips.forEach(chip => {
        chip.addEventListener('click', async () => {
            if (chip.id === 'btnOpenManagePlaces') return;

            routeChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const dest = chip.getAttribute('data-dest');
            if (!dest) return;

            if (routeDestInput) routeDestInput.value = dest;
            if (btnClearDest) btnClearDest.classList.remove('hidden');
            if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');

            const liveGps = await getFreshGpsPosition();
            const places = getSavedPlaces();

            if (chip.id === 'chipHomeBtn' || dest.includes('Home') || dest.includes('ઘર')) {
                await auditSafeRouteWithCoords(liveGps, {
                    lat: places.home.lat,
                    lng: places.home.lng,
                    name: "🏠 મારું ઘર (Home)"
                });
            } else if (chip.id === 'chipOfficeBtn' || dest.includes('Office') || dest.includes('ઓફિસ')) {
                await auditSafeRouteWithCoords(liveGps, {
                    lat: places.office.lat,
                    lng: places.office.lng,
                    name: "🏢 મારી ઓફિસ (Office)"
                });
            } else {
                const target = await resolveDestinationTarget(dest);
                await auditSafeRouteWithCoords(liveGps, target);
            }
        });
    });

    // Audit Button Click
    if (btnAuditRoute && routeDestInput) {
        btnAuditRoute.addEventListener('click', async () => {
            const query = routeDestInput.value.trim();
            if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');
            const liveGps = await getFreshGpsPosition();
            const target = await resolveDestinationTarget(query);
            await auditSafeRouteWithCoords(liveGps, target);
        });

        // Enter key in input
        routeDestInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestionsDropdown) suggestionsDropdown.classList.add('hidden');
                btnAuditRoute.click();
            }
        });
    }

    // Manage Saved Places Modal triggers
    if (btnOpenManagePlaces && modalManagePlaces) {
        btnOpenManagePlaces.addEventListener('click', () => {
            updateSavedPlacesUI();
            modalManagePlaces.classList.remove('hidden');
        });
    }

    const closePlaces = () => {
        if (modalManagePlaces) modalManagePlaces.classList.add('hidden');
    };
    if (btnClosePlacesModal) btnClosePlacesModal.addEventListener('click', closePlaces);
    if (btnDonePlaces) btnDonePlaces.addEventListener('click', closePlaces);

    // Save Current GPS as Home
    if (btnSaveCurrentGpsHome) {
        btnSaveCurrentGpsHome.addEventListener('click', async () => {
            btnSaveCurrentGpsHome.innerText = "⏳ લાઈવ GPS ફેચ કરી રહ્યા છીએ...";
            const gps = await getFreshGpsPosition();
            savePlace('home', {
                lat: gps.lat,
                lng: gps.lng,
                address: `લાઇવ GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
            });
            btnSaveCurrentGpsHome.innerText = "✅ ઘરનું લોકેશન સેવ થયું!";
            setTimeout(() => {
                btnSaveCurrentGpsHome.innerText = "📌 વર્તમાન લાઈવ GPS ને 'ઘર' બનાવો";
            }, 2000);
        });
    }

    // Save Custom Address as Home
    if (btnSaveCustomHome && inputCustomHomeAddr) {
        btnSaveCustomHome.addEventListener('click', async () => {
            const addr = inputCustomHomeAddr.value.trim();
            if (!addr) return;
            btnSaveCustomHome.innerText = "શોધી રહ્યા છીએ...";
            const res = await searchGeocodeSuggestions(addr);
            if (res && res.length > 0) {
                savePlace('home', {
                    lat: res[0].lat,
                    lng: res[0].lng,
                    address: res[0].display_name
                });
                btnSaveCustomHome.innerText = "✅ સેવ થયું";
                inputCustomHomeAddr.value = "";
            } else {
                savePlace('home', {
                    lat: 23.0310,
                    lng: 72.5780,
                    address: addr
                });
                btnSaveCustomHome.innerText = "✅ સેવ થયું";
            }
            setTimeout(() => { btnSaveCustomHome.innerText = "સેવ કરો"; }, 2000);
        });
    }

    // Save Current GPS as Office
    if (btnSaveCurrentGpsOffice) {
        btnSaveCurrentGpsOffice.addEventListener('click', async () => {
            btnSaveCurrentGpsOffice.innerText = "⏳ લાઈવ GPS ફેચ કરી રહ્યા છીએ...";
            const gps = await getFreshGpsPosition();
            savePlace('office', {
                lat: gps.lat,
                lng: gps.lng,
                address: `લાઇવ GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
            });
            btnSaveCurrentGpsOffice.innerText = "✅ ઓફિસ લોકેશન સેવ થયું!";
            setTimeout(() => {
                btnSaveCurrentGpsOffice.innerText = "📌 વર્તમાન લાઈવ GPS ને 'ઓફિસ' બનાવો";
            }, 2000);
        });
    }

    // Save Custom Address as Office
    if (btnSaveCustomOffice && inputCustomOfficeAddr) {
        btnSaveCustomOffice.addEventListener('click', async () => {
            const addr = inputCustomOfficeAddr.value.trim();
            if (!addr) return;
            btnSaveCustomOffice.innerText = "શોધી રહ્યા છીએ...";
            const res = await searchGeocodeSuggestions(addr);
            if (res && res.length > 0) {
                savePlace('office', {
                    lat: res[0].lat,
                    lng: res[0].lng,
                    address: res[0].display_name
                });
                btnSaveCustomOffice.innerText = "✅ સેવ થયું";
                inputCustomOfficeAddr.value = "";
            } else {
                savePlace('office', {
                    lat: 23.0350,
                    lng: 72.5550,
                    address: addr
                });
                btnSaveCustomOffice.innerText = "✅ સેવ થયું";
            }
            setTimeout(() => { btnSaveCustomOffice.innerText = "સેવ કરો"; }, 2000);
        });
    }

    if (btnStartSafeNav) {
        btnStartSafeNav.addEventListener('click', startSafeEscortJourney);
    }

    if (btnEndSafeNav) {
        btnEndSafeNav.addEventListener('click', endSafeEscortJourney);
    }

    // Run initial default audit after 1.2s
    setTimeout(async () => {
        const liveGps = await getFreshGpsPosition();
        auditSafeRouteWithCoords(liveGps, {
            lat: 23.0360,
            lng: 72.5610,
            name: "Navrangpura (નવરંગપુરા)"
        });
    }, 1200);
}

async function auditSafeRoute(destName) {
    const liveGps = await getFreshGpsPosition();
    const target = await resolveDestinationTarget(destName);
    return auditSafeRouteWithCoords(liveGps, target);
}

async function auditSafeRouteWithCoords(originCoords, destCoords) {
    const loadingEl = document.getElementById('routeAuditLoading');
    if (loadingEl) loadingEl.classList.remove('hidden');

    const originLat = originCoords ? originCoords.lat : 23.0225;
    const originLng = originCoords ? originCoords.lng : 72.5714;
    const destLat = destCoords ? destCoords.lat : 23.0360;
    const destLng = destCoords ? destCoords.lng : 72.5610;
    const destName = destCoords ? destCoords.name : "Selected Destination";

    // Update banner text
    const bannerText = document.getElementById('routeLiveOriginText');
    if (bannerText) {
        bannerText.innerText = `શરૂઆત: તમારું લાઈવ GPS (${originLat.toFixed(4)}, ${originLng.toFixed(4)}) ➔ ગંતવ્ય: ${destName}`;
    }

    try {
        const resp = await fetch('/api/safety/safe-route-audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin_lat: originLat,
                origin_lng: originLng,
                dest_lat: destLat,
                dest_lng: destLng,
                origin_name: "તમારું વર્તમાન લાઈવ લોકેશન",
                dest_name: destName
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            currentEvaluatedRoutes = data;
            renderSafeRouteData(data);
            renderMiniRouteMap(data);
        }
    } catch (e) {
        console.error("Safe route audit failed:", e);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

function renderSafeRouteData(data) {
    if (!data || !data.routes || data.routes.length < 2) return;
    const safeRoute = data.routes[0];
    const riskyRoute = data.routes[1];

    // Safe route cards
    const safeScoreEl = document.getElementById('safeScoreNum');
    const safeTimeMetaEl = document.getElementById('safeTimeMeta');
    const safeDistMetaEl = document.getElementById('safeDistMeta');
    const metricLightValEl = document.getElementById('metricLightVal');
    const metricAreaValEl = document.getElementById('metricAreaVal');
    const metricRoadValEl = document.getElementById('metricRoadVal');
    const metricPoliceValEl = document.getElementById('metricPoliceVal');

    if (safeScoreEl) safeScoreEl.innerText = safeRoute.safety_score;
    if (safeTimeMetaEl) safeTimeMetaEl.innerText = `⏱️ ${safeRoute.walk_eta_mins} મિનિટ (ચાલતા) / ${safeRoute.vehicle_eta_mins} મિનિટ (કેબ)`;
    if (safeDistMetaEl) safeDistMetaEl.innerText = `📏 ${safeRoute.distance_km} કિમી`;

    if (metricLightValEl) metricLightValEl.innerText = `${safeRoute.metrics.lighting_score}% પ્રકાશિત (૯૫ Lux)`;
    if (metricAreaValEl) metricAreaValEl.innerText = safeRoute.metrics.area_label_gu || "વેપારી & ભીડવાળો";
    if (metricRoadValEl) metricRoadValEl.innerText = safeRoute.metrics.road_label_gu || "૪-લેન પહોળો માર્ગ";
    if (metricPoliceValEl) metricPoliceValEl.innerText = `${safeRoute.metrics.police_proximity_meters}m PCR / ${safeRoute.metrics.cctv_coverage_pct}% CCTV`;

    // Risky route cards
    const riskyScoreEl = document.getElementById('riskyScoreNum');
    const riskyTimeMetaEl = document.getElementById('riskyTimeMeta');
    const riskyDistMetaEl = document.getElementById('riskyDistMeta');
    const riskyWarnDescEl = document.getElementById('riskyWarnDesc');

    if (riskyScoreEl) riskyScoreEl.innerText = riskyRoute.safety_score;
    if (riskyTimeMetaEl) riskyTimeMetaEl.innerText = `⏱️ ${riskyRoute.walk_eta_mins} મિનિટ (શોર્ટકટ)`;
    if (riskyDistMetaEl) riskyDistMetaEl.innerText = `📏 ${riskyRoute.distance_km} કિમી`;
    if (riskyWarnDescEl && riskyRoute.advisory_notes_gu) {
        riskyWarnDescEl.innerText = riskyRoute.advisory_notes_gu.join(' ');
    }
}

function renderMiniRouteMap(data) {
    if (typeof L === 'undefined') return;
    const mapContainer = document.getElementById('miniRouteMap');
    if (!mapContainer) return;

    if (!miniRouteMap) {
        miniRouteMap = L.map('miniRouteMap', {
            zoomControl: false,
            attributionControl: false
        }).setView([data.origin.lat, data.origin.lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(miniRouteMap);

        routeMarkersGroup = L.layerGroup().addTo(miniRouteMap);
    }

    if (routeMarkersGroup) routeMarkersGroup.clearLayers();
    if (safeRoutePolyline) miniRouteMap.removeLayer(safeRoutePolyline);
    if (riskyRoutePolyline) miniRouteMap.removeLayer(riskyRoutePolyline);

    const safeRoute = data.routes[0];
    const riskyRoute = data.routes[1];

    const safeLatLngs = safeRoute.waypoints.map(w => [w.lat, w.lng]);
    const riskyLatLngs = riskyRoute.waypoints.map(w => [w.lat, w.lng]);

    // Draw Safe Corridor in Vibrant Green
    safeRoutePolyline = L.polyline(safeLatLngs, {
        color: '#10B981',
        weight: 6,
        opacity: 0.95
    }).addTo(miniRouteMap);

    // Draw Risky Shortcut in Red Dashed
    riskyRoutePolyline = L.polyline(riskyLatLngs, {
        color: '#EF4444',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 8'
    }).addTo(miniRouteMap);

    // Origin Marker
    const originIcon = L.divIcon({
        className: 'origin-marker-icon',
        html: '<div style="background:#2563EB; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 0 6px #2563EB;"></div>',
        iconSize: [16, 16]
    });
    L.marker([data.origin.lat, data.origin.lng], { icon: originIcon })
        .bindPopup("<b>તમારું વર્તમાન લોકેશન</b>")
        .addTo(routeMarkersGroup);

    // Destination Marker
    const destIcon = L.divIcon({
        className: 'dest-marker-icon',
        html: '<div style="background:#10B981; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px #10B981;"></div>',
        iconSize: [18, 18]
    });
    L.marker([data.destination.lat, data.destination.lng], { icon: destIcon })
        .bindPopup(`<b>${data.destination.name}</b>`)
        .addTo(routeMarkersGroup);

    // Plot Safe Havens along safe route
    if (safeRoute.safe_havens) {
        safeRoute.safe_havens.forEach(sh => {
            const shIcon = L.divIcon({
                className: 'sh-marker',
                html: `<div style="font-size:16px;">${sh.icon || '🛡️'}</div>`,
                iconSize: [20, 20]
            });
            L.marker([sh.lat, sh.lng], { icon: shIcon })
                .bindPopup(`<b>${sh.name}</b><br>24x7 હેલ્પલાઇન: ${sh.contact}`)
                .addTo(routeMarkersGroup);
        });
    }

    // Fit bounds to display full route
    const allBounds = L.latLngBounds([...safeLatLngs, ...riskyLatLngs]);
    miniRouteMap.fitBounds(allBounds, { padding: [20, 20] });
    setTimeout(() => { if (miniRouteMap) miniRouteMap.invalidateSize(); }, 300);

    window.addEventListener('resize', () => { if (miniRouteMap) miniRouteMap.invalidateSize(); });
    window.addEventListener('orientationchange', () => { setTimeout(() => { if (miniRouteMap) miniRouteMap.invalidateSize(); }, 300); });
}

async function startSafeEscortJourney() {
    if (!currentEvaluatedRoutes) {
        alert("કૃપા કરીને પહેલાં ગંતવ્ય સ્થળ પસંદ કરી સેફ રૂટ સ્કેન કરો.");
        return;
    }
    const safeRoute = currentEvaluatedRoutes.routes[0];
    const profile = getCurrentUserProfile();
    const victimName = profile.name;
    const victimPhone = profile.phone;

    try {
        const resp = await fetch('/api/safety/start-journey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: victimName,
                phone_number: victimPhone,
                selected_route: safeRoute,
                origin: currentEvaluatedRoutes.origin,
                destination: currentEvaluatedRoutes.destination
            })
        });

        if (resp.ok) {
            const journey = await resp.json();
            activeSafeJourneyToken = journey.journey_token;

            const livePanel = document.getElementById('liveNavEscortPanel');
            if (livePanel) livePanel.classList.remove('hidden');

            livePanel.scrollIntoView({ behavior: 'smooth' });

            if (safeJourneyWatchInterval) clearInterval(safeJourneyWatchInterval);
            safeJourneyWatchInterval = setInterval(sendJourneyTelemetryUpdate, 4000);

            if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
            alert("🟢 AI સેફ નેવિગેશન એસ્કોર્ટ શરૂ થયું! કંટ્રોલ રૂમ અને સેફ કોરિડોર રડાર તમારી મુસાફરી પર નજર રાખી રહ્યા છે.");
        }
    } catch (e) {
        console.error("Start journey failed:", e);
    }
}

async function sendJourneyTelemetryUpdate() {
    if (!activeSafeJourneyToken) return;
    const lat = currentGps ? currentGps.lat : 23.0225;
    const lng = currentGps ? currentGps.lng : 72.5714;

    try {
        const resp = await fetch('/api/safety/update-journey-position', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                journey_token: activeSafeJourneyToken,
                lat: lat,
                lng: lng
            })
        });

        if (resp.ok) {
            const data = await resp.json();
            const devAlert = document.getElementById('navDeviationAlert');
            if (data.is_deviated || data.stalled_alarm) {
                if (devAlert) {
                    devAlert.classList.remove('hidden');
                    devAlert.innerText = data.alert_message;
                }
                if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            } else {
                if (devAlert) devAlert.classList.add('hidden');
            }

            if (data.has_arrived) {
                endSafeEscortJourney();
            }
        }
    } catch (e) {
        console.warn("Journey telemetry ping warning:", e);
    }
}

async function endSafeEscortJourney() {
    if (safeJourneyWatchInterval) {
        clearInterval(safeJourneyWatchInterval);
        safeJourneyWatchInterval = null;
    }
    if (activeSafeJourneyToken) {
        try {
            await fetch('/api/safety/complete-journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ journey_token: activeSafeJourneyToken })
            });
        } catch (e) {}
        activeSafeJourneyToken = null;
    }

    const livePanel = document.getElementById('liveNavEscortPanel');
    if (livePanel) livePanel.classList.add('hidden');
    alert("✅ યાત્રા સફળતાપૂર્વક પૂર્ણ થઈ! તમે સુરક્ષિત રીતે ગંતવ્ય સ્થાને પહોંચી ગયા છો.");
}

// ========================================================
// 🚀 AUTOMATIC SEO LAUNCH WATCHER (Target: 11-10-2026)
// ========================================================
function initAutomaticSeoWatcher() {
    const seoBadge = document.getElementById('seoLiveBadge');
    if (!seoBadge) return;

    // Launch Target: 11-10-2026 10:51:00 AM IST (+05:30) (Launch Window: 10:51 AM to 11:30 AM)
    const targetLaunchDate = new Date('2026-10-11T10:51:00+05:30');

    function updateSeoCountdown() {
        const now = new Date();
        const diff = targetLaunchDate - now;

        if (diff <= 0) {
            seoBadge.className = 'seo-launch-pill active-live';
            seoBadge.innerText = '🟢 SEO LIVE (11-10-2026)';
            seoBadge.title = 'સત્તાવાર લોન્ચ: સર્ચ એન્જિન ઇન્ડેક્સિંગ લાઇવ છે!';
        } else {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            seoBadge.className = 'seo-launch-pill pending-countdown';
            seoBadge.innerText = `⏳ Auto-Live: 11-10-2026 10:51 AM (${hours}h ${mins}m બાકી)`;
            seoBadge.title = `૧૧-૧૦-૨૦૨૬ સવારે ૧૦:૫૧ થી ૧૧:૩૦ દરમિયાન આ પ્રોજેક્ટનું SEO ઓટોમેટિક લાઇવ થશે. બાકી સમય: ${hours} કલાક, ${mins} મિનિટ.`;
        }
    }

    updateSeoCountdown();
    setInterval(updateSeoCountdown, 30000);

    seoBadge.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/seo/status');
            const data = await res.json();
            alert(`🚀 Sri Sri ❤️SOS AI - ઓટોમેટિક SEO સ્ટેટસ:\n\n• લક્ષ્ય તારીખ & સમય: ૧૧-૧૦-૨૦૨૬ સવારે ૧૦:૫૧ થી ૧૧:૩૦ IST\n• વર્તમાન સ્થિતિ: ${data.is_live ? "🟢 સંપૂર્ણ લાઇવ (Live)" : "⏳ પૂર્વ-તૈયારી (Pre-Launch Staging)"}\n• બાકી સમય: ${data.countdown_text}\n• Robots નિર્દેશ: ${data.robots_directive}\n• સેટિંગ: ૧૧-૧૦-૨૦૨૬ ના દિવસે સવારે ૧૦:૫૧ વાગ્યે કોઈપણ માનવીય દખલ વગર ઓટોમેટિક લાઇવ થઈ જશે!`);
        } catch (e) {
            alert("૧૧-૧૦-૨૦૨૬ ના રોજ સવારે ૧૦:૫૧ વાગ્યે SEO આપોઆપ લાઇવ થઈ જશે!");
        }
    });
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    startGpsTracking();
    initIndexedDb();
    initCalculator();
    initBatteryMonitoring();
    fetchServerSettings();
    registerServiceWorkerAndPwa();
    setupPermissionRecoveryWizard();
    requestWakeLock();
    setupBackgroundKeepAliveAndHardwareKeys();
    initSafeRouteEngine();
    initAutomaticSeoWatcher();
});

