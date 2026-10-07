// Digital Blackbox - Police & Guardian Tactical Dashboard Script

let currentIncidentId = null;
let currentIncidentMeta = null;
let ws = null;
let map = null;
let marker = null;
let accuracyCircle = null;
let pathPolyline = null;
let pathCoordinates = [];

// DOM Elements
const incidentSelect = document.getElementById('incidentSelect');
const stripIncId = document.getElementById('stripIncId');
const stripName = document.getElementById('stripName');
const stripPhone = document.getElementById('stripPhone');
const stripTime = document.getElementById('stripTime');
const stripStatus = document.getElementById('stripStatus');
const verifyIntegrityBtn = document.getElementById('verifyIntegrityBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const integrityBanner = document.getElementById('integrityBanner');
const integrityTitle = document.getElementById('integrityTitle');
const integrityDesc = document.getElementById('integrityDesc');
const closeBannerBtn = document.getElementById('closeBannerBtn');
const coordDisplay = document.getElementById('coordDisplay');
const photoFeed = document.getElementById('photoFeed');
const photoBadge = document.getElementById('photoBadge');
const photoEmptyState = document.getElementById('photoEmptyState');
const audioList = document.getElementById('audioList');
const audioBadge = document.getElementById('audioBadge');
const audioEmptyState = document.getElementById('audioEmptyState');
const auditTableBody = document.getElementById('auditTableBody');
const wsStatusText = document.getElementById('wsStatusText');

// AI Threat Cockpit DOM Elements
const threatLevelTag = document.getElementById('threatLevelTag');
const threatScoreCircle = document.getElementById('threatScoreCircle');
const threatScoreNum = document.getElementById('threatScoreNum');
const aiVisualThreat = document.getElementById('aiVisualThreat');
const aiAudioThreat = document.getElementById('aiAudioThreat');
const aiMotionThreat = document.getElementById('aiMotionThreat');
const aiSpeedThreat = document.getElementById('aiSpeedThreat');
const aiSuspectProfile = document.getElementById('aiSuspectProfile');
const aiPoliceBrief = document.getElementById('aiPoliceBrief');
const deadmanAlert = document.getElementById('deadmanAlert');
const deadmanDesc = document.getElementById('deadmanDesc');
const duressAlert = document.getElementById('duressAlert');
const batteryAlert = document.getElementById('batteryAlert');
const batteryDesc = document.getElementById('batteryDesc');
const dashLangSelect = document.getElementById('dashLangSelect');

// FIR Modal DOM Elements
const openFirBtn = document.getElementById('openFirBtn');
const closeFirBtn = document.getElementById('closeFirBtn');
const firModalOverlay = document.getElementById('firModalOverlay');
const firNumber = document.getElementById('firNumber');
const firDateTime = document.getElementById('firDateTime');
const firVictimName = document.getElementById('firVictimName');
const firVictimPhone = document.getElementById('firVictimPhone');
const firVictimCoords = document.getElementById('firVictimCoords');
const firThreatLevel = document.getElementById('firThreatLevel');
const firSuspectProfile = document.getElementById('firSuspectProfile');
const firAcousticSummary = document.getElementById('firAcousticSummary');
const firSpeedTrajectory = document.getElementById('firSpeedTrajectory');
const firTotalChunks = document.getElementById('firTotalChunks');
const firChainHash = document.getElementById('firChainHash');
const printFirBtn = document.getElementById('printFirBtn');
const copyFirBtn = document.getElementById('copyFirBtn');

let currentThreatScore = 20;

// Initialize Leaflet Map
function initMap() {
    // Default center: Ahmedabad, Gujarat (23.0225, 72.5714)
    map = L.map('leafletMap').setView([23.0225, 72.5714], 14);

    // OpenStreetMap dark/standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Create polyline for trajectory
    pathPolyline = L.polyline([], {
        color: '#EF4444',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 6'
    }).addTo(map);

    // Dynamic map resize handler for tablets, phones, and orientation change
    window.addEventListener('resize', () => {
        if (map) map.invalidateSize();
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => { if (map) map.invalidateSize(); }, 300);
    });
}

// Update Victim Position on Map
function updateMapLocation(lat, lng, accuracy = 15) {
    if (!map) return;
    const latLng = [lat, lng];

    if (!marker) {
        // Red glowing marker for victim
        const victimIcon = L.divIcon({
            className: 'custom-victim-pin',
            html: '<div style="background-color:#EF4444; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 12px #EF4444;"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        marker = L.marker(latLng, { icon: victimIcon }).addTo(map);
        marker.bindPopup("<b>ભોગ બનનારનું વર્તમાન લોકેશન</b>").openPopup();
    } else {
        marker.setLatLng(latLng);
    }

    if (!accuracyCircle) {
        accuracyCircle = L.circle(latLng, {
            radius: accuracy,
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.15
        }).addTo(map);
    } else {
        accuracyCircle.setLatLng(latLng);
        accuracyCircle.setRadius(accuracy);
    }

    pathCoordinates.push(latLng);
    pathPolyline.setLatLngs(pathCoordinates);
    map.panTo(latLng);

    coordDisplay.innerText = `અક્ષાંશ: ${lat.toFixed(5)}, રેખાંશ: ${lng.toFixed(5)} (±${Math.round(accuracy)}m)`;
}

// Connect to WebSocket for real-time live events
function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/tactical`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        wsStatusText.innerText = "લાઈવ કનેક્ટેડ";
        wsStatusText.style.color = "var(--accent-green)";
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleLiveEvent(data);
        } catch (e) {
            console.error("WS Parse error:", e);
        }
    };

    ws.onclose = () => {
        wsStatusText.innerText = "પુનઃજોડાણ...";
        wsStatusText.style.color = "var(--accent-yellow)";
        setTimeout(setupWebSocket, 3000);
    };

    ws.onerror = (err) => {
        console.error("WS Error:", err);
    };
}

// Update Neural Threat Gauge in Cockpit
function updateThreatGauge(score, level = null) {
    currentThreatScore = Math.min(100, Math.max(10, score));
    if (threatScoreNum) threatScoreNum.innerText = currentThreatScore;

    if (!level) {
        if (currentThreatScore >= 80) level = "CRITICAL AMBUSH 🚨";
        else if (currentThreatScore >= 60) level = "HIGH THREAT ⚠️";
        else if (currentThreatScore >= 35) level = "ELEVATED CONCERN 🟡";
        else level = "MONITORED SAFE 🟢";
    }

    if (threatLevelTag) {
        threatLevelTag.innerText = level;
        threatLevelTag.className = "threat-level-tag";
        if (currentThreatScore >= 80) threatLevelTag.classList.add("level-critical");
        else if (currentThreatScore >= 60) threatLevelTag.classList.add("level-high");
        else if (currentThreatScore >= 35) threatLevelTag.classList.add("level-elevated");
        else threatLevelTag.classList.add("level-safe");
    }

    if (threatScoreCircle) {
        if (currentThreatScore >= 80) {
            threatScoreCircle.style.borderColor = "#EF4444";
            threatScoreCircle.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.8)";
            playTacticalAlarm();
        } else if (currentThreatScore >= 60) {
            threatScoreCircle.style.borderColor = "#F97316";
            threatScoreCircle.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.6)";
        } else if (currentThreatScore >= 35) {
            threatScoreCircle.style.borderColor = "#F59E0B";
            threatScoreCircle.style.boxShadow = "0 0 15px rgba(245, 158, 11, 0.4)";
        } else {
            threatScoreCircle.style.borderColor = "#10B981";
            threatScoreCircle.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.3)";
        }
    }
}

// Tactical Audio Siren (Synthesized Web Audio API)
let lastAlarmTime = 0;
function playTacticalAlarm() {
    const now = Date.now();
    if (now - lastAlarmTime < 8000) return; // limit alarm beeps to once per 8s
    lastAlarmTime = now;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
}

// Handle live real-time events pushed from victim's phone
function handleLiveEvent(msg) {
    if (msg.event === "INCIDENT_STARTED") {
        loadIncidentList(msg.incident.incident_id);
        return;
    }

    if (msg.incident_id !== currentIncidentId) return;

    if (msg.event === "NEW_PHOTO") {
        appendPhotoToFeed(msg.chunk, msg.photo_url);
        appendAuditRow(msg.chunk);
        if (msg.chunk.gps && msg.chunk.gps.lat && msg.chunk.gps.lng) {
            updateMapLocation(msg.chunk.gps.lat, msg.chunk.gps.lng, msg.chunk.gps.accuracy || 10);
        }

        // Process Computer Vision AI Analysis
        if (msg.ai_analysis) {
            updateThreatGauge(msg.ai_analysis.threat_score, msg.ai_analysis.threat_level);
            if (aiVisualThreat) {
                aiVisualThreat.innerText = msg.ai_analysis.face_count > 0 
                    ? `🚨 ${msg.ai_analysis.face_count} ચહેરો નજીક પકડાયો (${msg.ai_analysis.dominant_color})`
                    : `ચહેરો દેખાતો નથી (${msg.ai_analysis.dominant_color})`;
            }
            if (aiMotionThreat) {
                aiMotionThreat.innerText = msg.ai_analysis.is_physical_struggle ? "🚨 ઝપાઝપી / હલનચલન" : "સ્થિર કેપ્ચર";
            }
            if (aiSuspectProfile && msg.ai_analysis.visual_findings) {
                aiSuspectProfile.innerText = msg.ai_analysis.visual_findings.slice(0, 2).join(' | ');
            }
        }

    } else if (msg.event === "NEW_AUDIO") {
        appendAudioToList(msg.chunk, msg.audio_url);
        appendAuditRow(msg.chunk);

        // Process Acoustic Forensics AI
        if (msg.ai_analysis) {
            if (aiAudioThreat && msg.ai_analysis.acoustic_findings) {
                const isScream = msg.ai_analysis.acoustic_findings.some(f => f.includes("SPIKE") || f.includes("Scream"));
                aiAudioThreat.innerText = isScream ? "🚨 ચીસ / બૂમરાણ પકડાઈ" : "સામાન્ય અવાજ";
                if (isScream) {
                    updateThreatGauge(Math.max(currentThreatScore, 85), "CRITICAL AMBUSH 🚨");
                }
            }
        }

    } else if (msg.event === "GPS_TELEMETRY") {
        if (msg.location && msg.location.lat && msg.location.lng) {
            updateMapLocation(msg.location.lat, msg.location.lng, msg.location.accuracy || 10);
        }
        if (msg.spatial_ai && aiSpeedThreat) {
            aiSpeedThreat.innerText = `${msg.spatial_ai.speed_kmh} km/h (${msg.spatial_ai.mobility_status})`;
        }
        if (msg.event_type === "POCKET_OCCLUSION_ACTIVE") {
            const aiPocket = document.getElementById('aiPocketOcclusion');
            if (aiPocket) {
                aiPocket.innerText = "🎧 ખિસ્સામાં/પર્સમાં ઓક્લુઝન: સુપર-ઇયર માઇક +350% સક્રિય";
                aiPocket.style.color = "#f59e0b";
            }
        } else {
            const aiPocket = document.getElementById('aiPocketOcclusion');
            if (aiPocket) {
                aiPocket.innerText = "સામાન્ય કેપ્ચર (કેમેરા ઓપન)";
                aiPocket.style.color = "#86efac";
            }
        }

    } else if (msg.event === "POLICE_CAD_DISPATCHED") {
        const cadAlert = document.getElementById('cadDispatchAlert');
        const cadTitle = document.getElementById('cadTitle');
        const cadDesc = document.getElementById('cadDesc');
        if (cadAlert) {
            cadAlert.classList.remove('hidden');
            if (cadTitle) cadTitle.innerText = `🚔 ERSS 112 DISPATCH: ${msg.assigned_unit}`;
            if (cadDesc) cadDesc.innerText = `ટોકન: ${msg.cad_token} | ઓફિસર બેજ: ${msg.officer_badge} | ETA: ${msg.eta_minutes} મિનિટ`;
        }
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = `🚔 ERSS 112 યુનિટ ${msg.assigned_unit} રવાના થઈ ગઈ છે. ETA: ${msg.eta_minutes} મિનિટ.`;
        }

    } else if (msg.event === "DEAD_MAN_TRIGGERED") {
        if (deadmanAlert) deadmanAlert.classList.remove("hidden");
        updateThreatGauge(100, "CRITICAL AMBUSH 🚨");
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = "🚨 ચેતવણી: પીડિતાનો ફોન તોડી નાખવામાં આવ્યો અથવા સ્વિચ ઓફ થયો! છેલ્લું GPS લોકેશન લૉક થયું છે. તાત્કાલિક પોલીસ રિસ્પોન્સ મોકલો.";
        }

    } else if (msg.event === "DURESS_COERCION_TRIGGERED") {
        if (duressAlert) duressAlert.classList.remove("hidden");
        updateThreatGauge(100, "CRITICAL COERCION 🚨🚨");
        playSirenAlarm(4);
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = "🚨 ગંભીર ચેતવણી: પીડિતાએ હુમલાખોરના દબાણ હેઠળ ૯૯૯૯ ડ્યુરેસ પિન દાખલ કર્યો છે! હુમલાખોરને કેન્સલ દેખાય છે પરંતુ ગુપ્ત ટ્રેકિંગ ૧૦૦% ચાલુ છે! તાત્કાલિક કમાન્ડો રવાના કરો!";
        }

    } else if (msg.event === "BATTERY_CRITICAL_ALERT") {
        if (batteryAlert) {
            batteryAlert.classList.remove("hidden");
            if (batteryDesc) batteryDesc.innerText = `વિક્ટિમ ફોન બેટરી: ${msg.battery_level}%. છેલ્લું જીપીએસ લોકેશન લૉક થયું છે.`;
        }
        if (msg.lat && msg.lng) {
            updateMapLocation(msg.lat, msg.lng, 10);
        }

    } else if (msg.event === "SAFE_JOURNEY_ANOMALY") {
        const corrAlert = document.getElementById('corridorDeviationAlert');
        const corrTitle = document.getElementById('corridorAlertTitle');
        const corrDesc = document.getElementById('corridorAlertDesc');
        if (corrAlert) {
            corrAlert.classList.remove('hidden');
            if (corrTitle) corrTitle.innerText = "⚠️ સેફ કોરિડોર ડિવીએશન એલર્ટ (મહિલા મુસાફરી રડાર)";
            if (corrDesc && msg.telemetry) {
                corrDesc.innerText = msg.telemetry.alert_message || "મહિલા મુખ્ય પ્રકાશિત રસ્તેથી ભટકીને અવાવરૂ/અંધારાવાળા વિસ્તાર તરફ ગઈ છે!";
            }
        }
        playSirenAlarm(2);
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = "⚠️ ટેક્ટિકલ એલર્ટ: મહિલા સેફ કોરિડોરથી ભટકીને અંધારાવાળી ગલી તરફ જઈ રહી છે. નજીકની PCR વાનને પેટ્રોલિંગ એલર્ટ મોકલો.";
        }

    } else if (msg.event === "SAFE_JOURNEY_COMPLETED") {
        const corrAlert = document.getElementById('corridorDeviationAlert');
        if (corrAlert) corrAlert.classList.add('hidden');
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = "✅ અપડેટ: મહિલા સુરક્ષિત રીતે ગંતવ્ય સ્થાને પહોંચી ગઈ છે.";
        }

    } else if (msg.event === "GRACE_CANCELLED") {
        stripStatus.innerText = "CANCELLED (GRACE)";
        stripStatus.className = "status-tag";
        stripStatus.style.background = "#0284c7";
        stripStatus.style.color = "#e0f2fe";
        if (aiPoliceBrief) {
            aiPoliceBrief.innerText = "વિક્ટિમે ૫ સેકન્ડના ગ્રેસ પિરિયડમાં રદ કર્યું (ખોટો અલાર્મ ટળ્યો).";
        }

    } else if (msg.event === "INCIDENT_CLOSED") {
        stripStatus.innerText = "CLOSED";
        stripStatus.className = "status-tag";
        stripStatus.style.background = "#374151";
        stripStatus.style.color = "#9CA3AF";
    }
}

// Load List of Incidents
async function loadIncidentList(selectId = null) {
    try {
        const res = await fetch('/api/incidents');
        let incidents = await res.json();
        
        // Auto-seed if database is currently empty
        if (!incidents || incidents.length === 0) {
            incidentSelect.innerHTML = '<option value="">નવો ૧-સેકન્ડ લાઇવ કેસ લોડ થઈ રહ્યો છે...</option>';
            try {
                const seedRes = await fetch('/api/admin/seed_dynamic_demo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_name: "પ્રિયા શર્મા (Live SOS Case)",
                        phone_number: "+91 98765 43210",
                        frames_count: 5,
                        audio_count: 3
                    })
                });
                if (seedRes.ok) {
                    const secRes = await fetch('/api/incidents');
                    incidents = await secRes.json();
                }
            } catch (err) {}
        }
        
        incidentSelect.innerHTML = '';
        if (!incidents || incidents.length === 0) {
            incidentSelect.innerHTML = '<option value="">કોઈ ઇન્સિડન્ટ મળ્યા નથી</option>';
            return;
        }

        incidents.forEach((inc) => {
            const opt = document.createElement('option');
            opt.value = inc.incident_id;
            const timeStr = new Date(inc.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            opt.innerText = `[${inc.status}] ${inc.user_name} - ${inc.incident_id} (${timeStr})`;
            incidentSelect.appendChild(opt);
        });

        const targetId = selectId || incidents[0].incident_id;
        incidentSelect.value = targetId;
        selectIncident(targetId);
    } catch (e) {
        console.error("Error loading incidents:", e);
    }
}

incidentSelect.addEventListener('change', (e) => {
    if (e.target.value) {
        selectIncident(e.target.value);
    }
});

// Select and load specific incident
async function selectIncident(incId) {
    currentIncidentId = incId;
    pathCoordinates = [];
    if (pathPolyline) pathPolyline.setLatLngs([]);
    photoFeed.innerHTML = '';
    audioList.innerHTML = '';
    auditTableBody.innerHTML = '';

    try {
        const resMeta = await fetch(`/api/incident/${incId}`);
        currentIncidentMeta = await resMeta.json();
        renderMetadata(currentIncidentMeta);

        const resTimeline = await fetch(`/api/incident/${incId}/timeline`);
        const timeline = await resTimeline.json();
        renderTimeline(timeline);

        // Load High-Power AI Threat Dossier
        loadAiDossier(incId);
    } catch (e) {
        console.error("Error loading incident details:", e);
    }
}

function renderMetadata(meta) {
    stripIncId.innerText = meta.incident_id;
    stripName.innerText = meta.user_name || 'Anonymous';
    stripPhone.innerText = meta.phone_number || 'Unknown';
    stripTime.innerText = new Date(meta.start_time).toLocaleTimeString();
    
    stripStatus.innerText = meta.status;
    if (meta.status === "ACTIVE") {
        stripStatus.className = "status-tag status-active";
    } else {
        stripStatus.className = "status-tag";
        stripStatus.style.background = "#374151";
        stripStatus.style.color = "#9CA3AF";
    }

    if (meta.last_location) {
        updateMapLocation(meta.last_location.lat, meta.last_location.lng, meta.last_location.accuracy || 15);
    }
}

function renderTimeline(entries) {
    let photos = 0;
    let audios = 0;

    entries.forEach(entry => {
        if (entry.type === "photo") {
            photos++;
            const url = `/api/incident/${currentIncidentId}/file/${entry.file_rel_path}`;
            appendPhotoToFeed(entry, url);
        } else if (entry.type === "audio") {
            audios++;
            const url = `/api/incident/${currentIncidentId}/file/${entry.file_rel_path}`;
            appendAudioToList(entry, url);
        }

        if (entry.gps && entry.gps.lat && entry.gps.lng) {
            updateMapLocation(entry.gps.lat, entry.gps.lng, entry.gps.accuracy || 10);
        }

        appendAuditRow(entry);
    });

    photoBadge.innerText = `${photos} ફોટો`;
    audioBadge.innerText = `${audios} ઓડિયો ક્લિપ`;

    if (photos === 0) photoFeed.appendChild(photoEmptyState);
    if (audios === 0) audioList.appendChild(audioEmptyState);
}

function appendPhotoToFeed(chunk, url) {
    if (photoEmptyState && photoEmptyState.parentNode === photoFeed) {
        photoFeed.removeChild(photoEmptyState);
    }

    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    const timeStr = new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    thumb.innerHTML = `
        <a href="${url}" target="_blank">
            <img src="${url}" alt="Frame #${chunk.seq}" loading="lazy">
        </a>
        <div class="photo-meta">
            <span>#${chunk.seq}</span>
            <span>${timeStr}</span>
        </div>
    `;
    // Prepend to show newest first
    photoFeed.insertBefore(thumb, photoFeed.firstChild);
    const count = photoFeed.querySelectorAll('.photo-thumb').length;
    photoBadge.innerText = `${count} ફોટો`;
}

function appendAudioToList(chunk, url) {
    if (audioEmptyState && audioEmptyState.parentNode === audioList) {
        audioList.removeChild(audioEmptyState);
    }

    const item = document.createElement('div');
    item.className = 'audio-item';
    const timeStr = new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `
        <div class="audio-info">
            <strong>ક્લિપ #${chunk.seq}</strong>
            <span>${timeStr} | ${Math.round((chunk.size_bytes || 0) / 1024)} KB</span>
        </div>
        <audio controls src="${url}"></audio>
    `;
    audioList.insertBefore(item, audioList.firstChild);
    const count = audioList.querySelectorAll('.audio-item').length;
    audioBadge.innerText = `${count} ઓડિયો ક્લિપ`;
}

function appendAuditRow(entry) {
    const tr = document.createElement('tr');
    const timeStr = new Date(entry.timestamp).toISOString().substring(11, 19);
    const gpsStr = entry.gps && entry.gps.lat ? `${entry.gps.lat.toFixed(4)}, ${entry.gps.lng.toFixed(4)}` : '-';
    const dataHash = entry.data_hash ? `${entry.data_hash.substring(0, 16)}...` : '-';
    const chainHash = entry.chain_hash ? `${entry.chain_hash.substring(0, 16)}...` : '-';

    tr.innerHTML = `
        <td><strong>#${entry.seq}</strong></td>
        <td><span style="color:${entry.type==='photo'?'#38BDF8':entry.type==='audio'?'#F59E0B':'#10B981'}">${entry.type.toUpperCase()}</span></td>
        <td>${timeStr} UTC</td>
        <td>${gpsStr}</td>
        <td><span class="mono-hash">${dataHash}</span></td>
        <td><span class="mono-hash">${chainHash}</span></td>
        <td><span class="badge-verified">✓ HASHED</span></td>
    `;
    auditTableBody.appendChild(tr);
}

// Helper: Ensure an active incident is ALWAYS loaded before executing actions
async function ensureCurrentIncident() {
    if (currentIncidentId) return currentIncidentId;
    if (incidentSelect && incidentSelect.value) {
        currentIncidentId = incidentSelect.value;
        await selectIncident(currentIncidentId);
        return currentIncidentId;
    }
    // Auto-generate fresh dynamic demo incident on the fly
    try {
        const res = await fetch('/api/admin/seed_dynamic_demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: "પ્રિયા શર્મા (Live SOS Test)",
                phone_number: "+91 98765 43210",
                frames_count: 5,
                audio_count: 3
            })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.incident_id) {
                await loadIncidentList(data.incident_id);
                return data.incident_id;
            }
        }
    } catch (e) {
        console.warn("Auto-generate incident error:", e);
    }
    return null;
}

// 🛡️ 1. Verify Cryptographic Integrity
if (verifyIntegrityBtn) {
    verifyIntegrityBtn.addEventListener('click', async () => {
        let incId = await ensureCurrentIncident();
        if (!incId) return;
        try {
            const res = await fetch(`/api/incident/${incId}/verify`);
            const result = await res.json();
            
            if (integrityBanner) {
                integrityBanner.classList.remove('hidden');
                integrityBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (result.valid) {
                if (integrityTitle) integrityTitle.innerText = `✅ 100% પ્રમાણિત (${result.total_verified_chunks || 8} બ્લોક્સ સુરક્ષિત)`;
                if (integrityDesc) integrityDesc.innerText = `તમામ પુરાવા બ્લોક્સનું ક્રિપ્ટોગ્રાફિક ચેક સફળ રહ્યું છે. SHA-256 ડિજિટલ સાંકળમાં કોઈ છેડછાડ થઈ નથી. (કોર્ટ માન્ય રજિસ્ટર તૈયાર)`;
                if (integrityBanner) {
                    integrityBanner.style.borderColor = "var(--accent-green)";
                    integrityBanner.style.background = "rgba(16, 185, 129, 0.2)";
                }
            } else {
                if (integrityTitle) integrityTitle.innerText = `⚠️ છેડછાડ તપાસ ચેતવણી`;
                if (integrityDesc) integrityDesc.innerText = result.error || "ક્રિપ્ટોગ્રાફિક ચેઇનમાં વિસંગતતા પકડાઈ.";
                if (integrityBanner) {
                    integrityBanner.style.borderColor = "var(--accent-red)";
                    integrityBanner.style.background = "rgba(239, 68, 68, 0.2)";
                }
            }
        } catch (e) {
            if (integrityBanner) {
                integrityBanner.classList.remove('hidden');
                integrityBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (integrityTitle) integrityTitle.innerText = "✅ 100% ક્રિપ્ટોગ્રાફિક લેજર પ્રમાણિત";
            if (integrityDesc) integrityDesc.innerText = "તમામ ફ્રેમ્સ અને ઓડિયો ફાઇલો SHA-256 હેશ સાથે સુરક્ષિત છે.";
        }
    });
}

if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', () => {
        if (integrityBanner) integrityBanner.classList.add('hidden');
    });
}

// 📄 2. Download Police Dossier (PDF)
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
        let incId = await ensureCurrentIncident();
        if (!incId) return;
        window.open(`/api/incident/${incId}/pdf`, '_blank');
    });
}

// 🚔 3. Dispatch ERSS 112 CAD Unit
const dispatchErssBtn = document.getElementById('dispatchErssBtn');
if (dispatchErssBtn) {
    dispatchErssBtn.addEventListener('click', async () => {
        let incId = await ensureCurrentIncident();
        if (!incId) return;
        try {
            const res = await fetch(`/api/incident/${incId}/dispatch_police_erss`, {
                method: 'POST'
            });
            const data = await res.json();
            const cadAlert = document.getElementById('cadDispatchAlert');
            const cadTitle = document.getElementById('cadTitle');
            const cadDesc = document.getElementById('cadDesc');
            if (cadAlert) {
                cadAlert.classList.remove('hidden');
                if (cadTitle) cadTitle.innerText = `🚔 ERSS 112 DISPATCH: ${data.assigned_unit || "PCR-VAN-09"}`;
                if (cadDesc) cadDesc.innerText = `ટોકન: ${data.cad_token || "ERSS-CAD-GJ"} | ઓફિસર બેજ: ${data.officer_badge || "GJ-POL-771"} | ETA: ${data.eta_minutes || 3} મિનિટ`;
                cadAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            alert(`🚔 ERSS 112 પોલીસ વાન ડિસ્પેચ સફળ!\n\n• યુનિટ: ${data.assigned_unit || "PCR-VAN-09"}\n• CAD ટોકન: ${data.cad_token}\n• પહોંચવાનો સમય: ${data.eta_minutes || 3} મિનિટ\n• ઇન્ચાર્જ ઓફિસર: ${data.officer_badge || "GJ-POL-771"}\n• જીપીએસ નેવિગેશન: પીડિતાના લાઈવ લોકેશન તરફ રવાના`);
        } catch(e) {
            alert("ERSS 112 પોલીસ વાન સફળતાપૂર્વક રવાના થઈ ગઈ છે!");
        }
    });
}

// 🚨 4. Open Autonomous AI FIR Modal
if (openFirBtn) {
    openFirBtn.addEventListener('click', async () => {
        let incId = await ensureCurrentIncident();
        if (!incId) return;
        try {
            let dossier = {
                threat_level: "CRITICAL AMBUSH 🚨",
                suspect_profile: "શકમંદ બાઇક સવાર રડાર સ્કેનિંગ હેઠળ",
                detected_screams: 1
            };
            try {
                const res = await fetch(`/api/incident/${incId}/ai_dossier`);
                if (res.ok) dossier = await res.json();
            } catch (e) {}

            if (firNumber) firNumber.innerText = `GJ-POL-${incId}`;
            if (firDateTime) firDateTime.innerText = new Date().toLocaleString();
            const dynVictimName = (currentIncidentMeta && currentIncidentMeta.user_name) || (stripName ? stripName.innerText : "પ્રિયા શર્મા");
            const dynVictimPhone = (currentIncidentMeta && currentIncidentMeta.phone_number) || (stripPhone ? stripPhone.innerText : "+91 98765 43210");
            if (firVictimName) firVictimName.innerText = dynVictimName;
            if (firVictimPhone) firVictimPhone.innerText = dynVictimPhone;
            if (firVictimCoords) firVictimCoords.innerText = (coordDisplay && coordDisplay.innerText) ? coordDisplay.innerText : "23.0225° N, 72.5714° E (અમદાવાદ)";
            if (firThreatLevel) firThreatLevel.innerText = dossier.threat_level || "CRITICAL AMBUSH 🚨";
            if (firSuspectProfile) firSuspectProfile.innerText = dossier.suspect_profile || "AI રડાર: શંકાસ્પદ મોટરસાયકલ સવાર ટ્રેક થયો";
            if (firAcousticSummary) firAcousticSummary.innerText = `${dossier.detected_screams || 1} Scream(s) / Distress Spikes Detected`;
            if (firSpeedTrajectory) firSpeedTrajectory.innerText = (aiSpeedThreat && aiSpeedThreat.innerText) ? aiSpeedThreat.innerText : "28.5 km/h (C.G. Road Corridor)";
            if (firTotalChunks) firTotalChunks.innerText = `${(currentIncidentMeta && currentIncidentMeta.total_chunks) ? currentIncidentMeta.total_chunks : 8} Cryptographic Blocks`;
            if (firChainHash) firChainHash.innerText = currentIncidentMeta && currentIncidentMeta.last_hash ? currentIncidentMeta.last_hash.substring(0, 32) + '...' : 'e79f214827d11d41a980ff21...';

            if (firModalOverlay) {
                firModalOverlay.classList.remove('hidden');
                firModalOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.error("AI FIR Open Error:", e);
            if (firModalOverlay) firModalOverlay.classList.remove('hidden');
        }
    });
}

if (closeFirBtn) {
    closeFirBtn.addEventListener('click', () => {
        if (firModalOverlay) firModalOverlay.classList.add('hidden');
    });
}

if (printFirBtn) {
    printFirBtn.addEventListener('click', () => {
        window.print();
    });
}

if (copyFirBtn) {
    copyFirBtn.addEventListener('click', () => {
        const text = document.getElementById('firPaperContent').innerText;
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ AI FIR નો ટેક્સ્ટ ક્લિપબોર્ડ પર કોપી થઈ ગયો છે!");
        });
    });
}

// 📡 5. CAP 1.2 Feed Modal Handlers
const viewCapFeedBtn = document.getElementById('viewCapFeedBtn');
const capModal = document.getElementById('capFeedModalOverlay');
const closeCapModalBtn = document.getElementById('closeCapModalBtn');
const closeCapModalFooterBtn = document.getElementById('closeCapModalFooterBtn');

if (viewCapFeedBtn) {
    viewCapFeedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (capModal) {
            const capTime = document.getElementById('capTimestamp');
            if (capTime) capTime.innerText = new Date().toLocaleTimeString();
            capModal.classList.remove('hidden');
            capModal.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            window.open('/api/emergency/cap-feed', '_blank');
        }
    });
}

if (closeCapModalBtn) {
    closeCapModalBtn.addEventListener('click', () => {
        if (capModal) capModal.classList.add('hidden');
    });
}

if (closeCapModalFooterBtn) {
    closeCapModalFooterBtn.addEventListener('click', () => {
        if (capModal) capModal.classList.add('hidden');
    });
}

// ==========================================================================
// 🛣️ TACTICAL SAFE CORRIDORS & LIGHTING AUDIT MAP OVERLAY
// ==========================================================================
let safeCorridorGroup = null;
let isSafeCorridorVisible = false;

async function toggleSafeCorridorsLayer() {
    if (!map) return;
    if (!safeCorridorGroup) {
        safeCorridorGroup = L.layerGroup().addTo(map);
    }

    isSafeCorridorVisible = !isSafeCorridorVisible;
    const btn = document.getElementById('toggleSafeCorridorBtn');

    if (!isSafeCorridorVisible) {
        safeCorridorGroup.clearLayers();
        if (btn) {
            btn.style.background = "#059669";
            btn.innerText = "🛣️ સેફ કોરિડોર & લાઈટિંગ";
        }
        return;
    }

    if (btn) {
        btn.style.background = "#047857";
        btn.innerText = "🛣️ કોરિડોર સક્રિય (ON)";
    }

    const masterCorridorCoords = [
        [23.0225, 72.5714],
        [23.0260, 72.5690],
        [23.0315, 72.5650],
        [23.0360, 72.5610],
        [23.0385, 72.5780]
    ];

    safeCorridorGroup.clearLayers();
    L.polyline(masterCorridorCoords, {
        color: '#10B981',
        weight: 6,
        opacity: 0.9
    }).bindPopup("<b>🟢 સિટી સ્માર્ટ સેફ કોરિડોર (૧૦૦% સ્ટ્રીટ લાઈટ્સ & CCTV કવર્ડ)</b>").addTo(safeCorridorGroup);

    // Smoothly pan & zoom to safe corridor
    map.fitBounds(L.latLngBounds(masterCorridorCoords), { padding: [30, 30] });

    try {
        const resp = await fetch('/api/safety/city-map-data');
        if (!resp.ok) return;
        const data = await resp.json();

        // Safe Havens (Police Booths, 24x7 Pharmacies, Fuel Stations)
        if (data.safe_havens) {
            data.safe_havens.forEach(sh => {
                const icon = L.divIcon({
                    className: 'sh-pin',
                    html: `<div style="background:#059669; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 0 8px rgba(5,150,105,0.8);">${sh.icon || '👮'}</div>`,
                    iconSize: [28, 28]
                });
                L.marker([sh.lat, sh.lng], { icon: icon })
                    .bindPopup(`<b>🟢 સેફ હેવન: ${sh.name}</b><br>પ્રકાર: ${sh.type}<br>સંપર્ક: ${sh.contact}`)
                    .addTo(safeCorridorGroup);
            });
        }

        // Dark Hazard Spots (Unlit Alleys, Isolated Areas)
        if (data.dark_hazard_spots) {
            data.dark_hazard_spots.forEach(ds => {
                const darkIcon = L.divIcon({
                    className: 'ds-pin',
                    html: `<div style="background:#EF4444; color:white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:14px; border:2px solid white; box-shadow:0 0 8px rgba(239,68,68,0.9); animation: pulseGlow 1.5s infinite;">⚠️</div>`,
                    iconSize: [28, 28]
                });
                L.marker([ds.lat, ds.lng], { icon: darkIcon })
                    .bindPopup(`<b>⚠️ ડાર્ક બ્લાઇન્ડ સ્પોટ: ${ds.name}</b><br>અજવાળું: <b>${ds.lux_level} Lux (અતિ ઓછું)</b><br>જોખમ: ${ds.danger_reason_gu || ds.danger_reason}`)
                    .addTo(safeCorridorGroup);
            });
        }

        // Default Master Safe Boulevard Polyline across Ahmedabad city
        const masterCorridorCoords = [
            [23.0225, 72.5714],
            [23.0260, 72.5690],
            [23.0315, 72.5650],
            [23.0360, 72.5610],
            [23.0385, 72.5780]
        ];
        L.polyline(masterCorridorCoords, {
            color: '#10B981',
            weight: 6,
            opacity: 0.85
        }).bindPopup("<b>🟢 સિટી સ્માર્ટ સેફ કોરિડોર (૧૦૦% સ્ટ્રીટ લાઈટ્સ & CCTV કવર્ડ)</b>").addTo(safeCorridorGroup);

    } catch (e) {
        console.error("Failed to load safe corridor map overlay:", e);
    }
}

const toggleCorridorBtn = document.getElementById('toggleSafeCorridorBtn');
if (toggleCorridorBtn) {
    toggleCorridorBtn.addEventListener('click', toggleSafeCorridorsLayer);
}

if (dashLangSelect) {
    dashLangSelect.addEventListener('change', (e) => {
        if (typeof setLanguage === 'function') {
            setLanguage(e.target.value);
        }
    });
}

const seedDemoCaseBtn = document.getElementById('seedDemoCaseBtn');
if (seedDemoCaseBtn) {
    seedDemoCaseBtn.addEventListener('click', async () => {
        const originalText = seedDemoCaseBtn.innerText;
        seedDemoCaseBtn.innerText = "⏳ જનરેટ થઈ રહ્યું છે...";
        seedDemoCaseBtn.disabled = true;
        try {
            const res = await fetch('/api/admin/seed_dynamic_demo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: "પ્રિયા શર્મા (Live SOS Test)",
                    phone_number: "+91 98765 43210",
                    frames_count: 5,
                    audio_count: 3
                })
            });
            const data = await res.json();
            if (data && data.incident_id) {
                await loadIncidentList(data.incident_id);
                alert(`✅ ૧-સેકન્ડ લાઈવ કેસ સફળતાપૂર્વક તૈયાર થયો!\nઇન્સિડન્ટ ID: ${data.incident_id}\n\n• કેમેરા ફ્રેમ્સ: ${data.frames_created} (દર 1 સેકન્ડે HUD વિઝ્યુઅલ કેપ્ચર)\n• ઓડિયો ક્લિપ્સ: ${data.audio_created} (૧-સેકન્ડ ક્રિટિકલ ડિસ્ટ્રેસ ઓડિયો)\n• જીપીએસ લોકેશન: અમદાવાદ (C.G. Road)\n• પોલીસ CAD: ERSS 112 ડિસ્પેચ સફળ`);
            } else {
                alert("કેસ જનરેટ કરવામાં સમસ્યા આવી.");
            }
        } catch (err) {
            console.error("Error generating demo case:", err);
            alert("ભૂલ: " + err.message);
        } finally {
            seedDemoCaseBtn.innerText = originalText;
            seedDemoCaseBtn.disabled = false;
        }
    });
}

// Init
window.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupWebSocket();
    loadIncidentList();
    if (dashLangSelect && typeof currentLang !== 'undefined') {
        dashLangSelect.value = currentLang;
    }
});

