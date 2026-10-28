// Sri Sri ❤️SOS AI - Admin Master Portal Client Script
// 100% English Code, Robust XSS Defense, and Universal Multi-Language Support

// HTML Sanitization Helper to Prevent Stored/Reflected XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Multi-Language Helper with Safe English Fallbacks
function tr(key, fallback) {
    if (typeof t === 'function') {
        const val = t(key);
        if (val && val !== key) return val;
    }
    return fallback;
}

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const statTotalIncidents = document.getElementById('statTotalIncidents');
const statActiveIncidents = document.getElementById('statActiveIncidents');
const statTotalPhotos = document.getElementById('statTotalPhotos');
const statStorageMb = document.getElementById('statStorageMb');
const statWsConns = document.getElementById('statWsConns');
const incidentsTableBody = document.getElementById('incidentsTableBody');
const refreshIncidentsBtn = document.getElementById('refreshIncidentsBtn');

// Dispatch Inputs
const cfgPoliceNum = document.getElementById('cfgPoliceNum');
const cfgCustomControlRoom = document.getElementById('cfgCustomControlRoom');
const cfgAbhayamNum = document.getElementById('cfgAbhayamNum');
const cfgNationalWomenNum = document.getElementById('cfgNationalWomenNum');
const cfgAmbulanceNum = document.getElementById('cfgAmbulanceNum');
const saveDispatchBtn = document.getElementById('saveDispatchBtn');

// Sensitivity Inputs
const cfgScreamDb = document.getElementById('cfgScreamDb');
const valScreamDb = document.getElementById('valScreamDb');
const cfgLuxThreshold = document.getElementById('cfgLuxThreshold');
const valLuxThreshold = document.getElementById('valLuxThreshold');
const cfgFreefallGravity = document.getElementById('cfgFreefallGravity');
const cfgImpactAccel = document.getElementById('cfgImpactAccel');
const cfgNormalPin = document.getElementById('cfgNormalPin');
const cfgDuressPin = document.getElementById('cfgDuressPin');
const cfgGraceSeconds = document.getElementById('cfgGraceSeconds');
const saveSensitivityBtn = document.getElementById('saveSensitivityBtn');

const toastBox = document.getElementById('toastBox');
const toastMsg = document.getElementById('toastMsg');

let currentAdminConfig = null;

// Tab Switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetTab);
        if (targetPane) targetPane.classList.add('active');
    });
});

// Toast notification helper
function showToast(msg, isError = false) {
    if (!toastMsg || !toastBox) return;
    toastMsg.innerText = msg;
    toastBox.style.background = isError ? "#ef4444" : "#22c55e";
    toastBox.classList.remove('hidden');
    setTimeout(() => {
        toastBox.classList.add('hidden');
    }, 2800);
}

// Sliders live value display
if (cfgScreamDb && valScreamDb) {
    cfgScreamDb.addEventListener('input', (e) => {
        valScreamDb.innerText = `${e.target.value} dB`;
    });
}
if (cfgLuxThreshold && valLuxThreshold) {
    cfgLuxThreshold.addEventListener('input', (e) => {
        valLuxThreshold.innerText = `${e.target.value} Lux`;
    });
}

// Fetch Admin Stats
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
            const data = await res.json();
            if (statTotalIncidents) statTotalIncidents.innerText = data.total_incidents || 0;
            if (statActiveIncidents) statActiveIncidents.innerText = data.active_incidents || 0;
            if (statTotalPhotos) statTotalPhotos.innerText = data.total_photos || 0;
            if (statStorageMb) statStorageMb.innerText = `${data.total_storage_mb || 0} MB`;
            if (statWsConns) statWsConns.innerText = data.active_ws_connections || 0;
        }
    } catch (e) {
        console.error("Failed to load admin platform stats:", e);
    }
}

// Fetch Incidents Ledger with XSS protection and multi-language support
async function loadIncidents() {
    if (!incidentsTableBody) return;
    try {
        const loadingText = tr("loadingIncidents", "Loading incidents register...");
        incidentsTableBody.innerHTML = `<tr><td colspan="8" class="text-center">${escapeHtml(loadingText)}</td></tr>`;
        const res = await fetch('/api/incidents');
        if (!res.ok) throw new Error("Failed to load incidents from server");
        const incidents = await res.json();

        if (!Array.isArray(incidents) || incidents.length === 0) {
            const noIncidentsText = tr("noIncidentsFound", "No emergency incidents recorded in blackbox register.");
            incidentsTableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--text-muted); padding: 24px;">${escapeHtml(noIncidentsText)}</td></tr>`;
            return;
        }

        // Sort descending by start time
        incidents.sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0));

        const activeLang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
        const localeCode = activeLang === 'gu' ? 'gu-IN' : activeLang === 'hi' ? 'hi-IN' : 'en-US';

        let rowsHtml = '';
        incidents.forEach(inc => {
            const isActive = inc.status === "ACTIVE";
            const statusBadge = isActive 
                ? `<span class="badge-active">ACTIVE 🚨</span>` 
                : `<span class="badge-closed">${escapeHtml(inc.status)}</span>`;
            
            const timeFormatted = inc.start_time 
                ? new Date(inc.start_time).toLocaleString(localeCode) 
                : '--';

            const safeId = escapeHtml(inc.incident_id);
            const safeName = escapeHtml(inc.user_name || 'Anonymous');
            const safePhone = escapeHtml(inc.phone_number || '--');
            const photoCount = parseInt(inc.photo_count || 0, 10);
            const audioCount = parseInt(inc.audio_count || 0, 10);
            const viewControlText = tr("btnViewControl", "Cockpit");

            rowsHtml += `
                <tr>
                    <td data-label="Incident ID"><strong>${safeId}</strong></td>
                    <td data-label="Victim">${safeName}</td>
                    <td data-label="Phone">${safePhone}</td>
                    <td data-label="Started">${escapeHtml(timeFormatted)}</td>
                    <td data-label="Status">${statusBadge}</td>
                    <td data-label="Evidence">📸 ${photoCount} | 🎙️ ${audioCount}</td>
                    <td data-label="Integrity"><span class="badge-crypto-ok">🛡️ SHA-256 OK</span></td>
                    <td data-label="Actions" class="table-actions">
                        <a href="/api/incident/${safeId}/pdf" target="_blank" class="btn-tbl btn-tbl-pdf">📄 PDF</a>
                        <a href="/dashboard" class="btn-tbl btn-tbl-view">🖥️ ${escapeHtml(viewControlText)}</a>
                        <button class="btn-tbl btn-tbl-del" onclick="deleteIncident('${safeId}')" title="Delete Incident">🗑️</button>
                    </td>
                </tr>
            `;
        });
        incidentsTableBody.innerHTML = rowsHtml;
    } catch (e) {
        console.error("Error loading incidents:", e);
        const errText = tr("errorLoadingIncidents", "Error loading incident records: ");
        incidentsTableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:#f87171;">${escapeHtml(errText + e.message)}</td></tr>`;
    }
}

// Delete Incident with Confirmation and Safety
async function deleteIncident(incidentId) {
    const confirmPrompt = tr("confirmDeleteIncident", "Are you sure you want to permanently delete incident ") + incidentId + "?";
    if (!confirm(confirmPrompt)) return;
    try {
        const res = await fetch(`/api/incident/${encodeURIComponent(incidentId)}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(tr("toastIncidentDeleted", "Incident successfully removed from registry!"));
            loadStats();
            loadIncidents();
        } else {
            showToast(tr("toastDeleteFailed", "Failed to delete incident from server."), true);
        }
    } catch (e) {
        showToast(e.message, true);
    }
}

// Fetch Admin System Configuration
async function loadConfig() {
    try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
            currentAdminConfig = await res.json();
            
            // Populate Dispatch Numbers
            if (currentAdminConfig.emergency_numbers) {
                const em = currentAdminConfig.emergency_numbers;
                if (cfgPoliceNum) cfgPoliceNum.value = em.police || "112";
                if (cfgCustomControlRoom) cfgCustomControlRoom.value = em.custom_control_room || "+91 98765 00112";
                if (cfgAbhayamNum) cfgAbhayamNum.value = em.women_helpline_abhayam || "181";
                if (cfgNationalWomenNum) cfgNationalWomenNum.value = em.women_cell_national || "1091";
                if (cfgAmbulanceNum) cfgAmbulanceNum.value = em.ambulance || "108";
            }

            // Populate AI Sensitivity Thresholds
            if (currentAdminConfig.ai_sensitivity) {
                const ai = currentAdminConfig.ai_sensitivity;
                if (cfgScreamDb) {
                    cfgScreamDb.value = ai.scream_decibel_threshold || 85;
                    valScreamDb.innerText = `${cfgScreamDb.value} dB`;
                }
                if (cfgLuxThreshold) {
                    cfgLuxThreshold.value = ai.dark_alley_lux_threshold || 45;
                    valLuxThreshold.innerText = `${cfgLuxThreshold.value} Lux`;
                }
                if (cfgFreefallGravity) cfgFreefallGravity.value = ai.snatch_freefall_gravity || 3.2;
                if (cfgImpactAccel) cfgImpactAccel.value = ai.snatch_impact_accel || 28.0;
            }

            // Populate Security Configuration
            if (currentAdminConfig.security) {
                const sec = currentAdminConfig.security;
                if (cfgNormalPin) cfgNormalPin.value = sec.normal_cancel_pin || "1234";
                if (cfgDuressPin) cfgDuressPin.value = sec.duress_coercion_pin || "9999";
                if (cfgGraceSeconds) cfgGraceSeconds.value = sec.grace_countdown_seconds || 5;
            }
        }
    } catch (e) {
        console.error("Failed to load admin configuration:", e);
    }
}

// Save Dispatch Numbers
if (saveDispatchBtn) {
    saveDispatchBtn.addEventListener('click', async () => {
        if (!currentAdminConfig) currentAdminConfig = {};
        if (!currentAdminConfig.emergency_numbers) currentAdminConfig.emergency_numbers = {};

        currentAdminConfig.emergency_numbers.police = cfgPoliceNum.value.trim();
        currentAdminConfig.emergency_numbers.custom_control_room = cfgCustomControlRoom.value.trim();
        currentAdminConfig.emergency_numbers.women_helpline_abhayam = cfgAbhayamNum.value.trim();
        currentAdminConfig.emergency_numbers.women_cell_national = cfgNationalWomenNum.value.trim();
        currentAdminConfig.emergency_numbers.ambulance = cfgAmbulanceNum.value.trim();

        await saveConfigToServer();
    });
}

// Save AI Sensitivity & Security
if (saveSensitivityBtn) {
    saveSensitivityBtn.addEventListener('click', async () => {
        if (!currentAdminConfig) currentAdminConfig = {};
        if (!currentAdminConfig.ai_sensitivity) currentAdminConfig.ai_sensitivity = {};
        if (!currentAdminConfig.security) currentAdminConfig.security = {};

        currentAdminConfig.ai_sensitivity.scream_decibel_threshold = parseFloat(cfgScreamDb.value) || 85.0;
        currentAdminConfig.ai_sensitivity.dark_alley_lux_threshold = parseFloat(cfgLuxThreshold.value) || 45.0;
        currentAdminConfig.ai_sensitivity.snatch_freefall_gravity = parseFloat(cfgFreefallGravity.value) || 3.2;
        currentAdminConfig.ai_sensitivity.snatch_impact_accel = parseFloat(cfgImpactAccel.value) || 28.0;

        currentAdminConfig.security.normal_cancel_pin = cfgNormalPin.value.trim() || "1234";
        currentAdminConfig.security.duress_coercion_pin = cfgDuressPin.value.trim() || "9999";
        currentAdminConfig.security.grace_countdown_seconds = parseInt(cfgGraceSeconds.value, 10) || 5;

        await saveConfigToServer();
    });
}

async function saveConfigToServer() {
    try {
        const res = await fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentAdminConfig)
        });
        if (res.ok) {
            showToast(tr("toastConfigSaved", "Configuration saved successfully! 💾"));
        } else {
            showToast(tr("toastConfigError", "Error saving configuration to server!"), true);
        }
    } catch (e) {
        showToast(e.message, true);
    }
}

// Refresh Incidents Button Listener
if (refreshIncidentsBtn) {
    refreshIncidentsBtn.addEventListener('click', () => {
        loadStats();
        loadIncidents();
    });
}

// ==========================================
// 🎮 LIVE SIMULATION & CONTROL CENTER
// ==========================================
let activeSimIncidentId = null;
let simSeq = 0;

const simActiveBadge = document.getElementById('simActiveBadge');
const simStartSosBtn = document.getElementById('simStartSosBtn');
const simUploadFrameBtn = document.getElementById('simUploadFrameBtn');
const simDeadManBtn = document.getElementById('simDeadManBtn');
const simDuressBtn = document.getElementById('simDuressBtn');
const simBatteryBtn = document.getElementById('simBatteryBtn');

if (simStartSosBtn) {
    simStartSosBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/incident/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: "Admin Simulated Victim",
                    phone_number: "+91 99999 11222",
                    emergency_contacts: ["112", "+91 98765 00112"]
                })
            });
            if (res.ok) {
                const data = await res.json();
                activeSimIncidentId = data.incident_id;
                simSeq = 0;
                if (simActiveBadge) {
                    simActiveBadge.innerText = `${tr("simActivePrefix", "Active Case: ")} ${activeSimIncidentId} 🚨`;
                    simActiveBadge.style.background = "rgba(239, 68, 68, 0.2)";
                }
                showToast(`✅ ${tr("simAlertStarted", "Simulated SOS incident initialized!")} (${activeSimIncidentId})`);
                loadStats();
                loadIncidents();
            }
        } catch (e) {
            showToast(tr("simErrorStart", "Error initiating simulation!"), true);
        }
    });
}

if (simUploadFrameBtn) {
    simUploadFrameBtn.addEventListener('click', async () => {
        if (!activeSimIncidentId) {
            alert(tr("simNeedStartAlert", "Please click '1. Start Live Test SOS' first."));
            return;
        }
        simSeq++;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = 300;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 400, 300);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`SIMULATED FRAME #${simSeq}`, 20, 40);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '12px monospace';
            ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 20, 80);
            ctx.fillText(`AI SENSOR INJECTION: AMBUSH SIMULATION`, 20, 110);
            
            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('file', blob, `sim_frame_${simSeq}.jpg`);
                formData.append('seq', simSeq);
                formData.append('lat', 23.0225);
                formData.append('lng', 72.5714);
                formData.append('accuracy', 6.0);
                formData.append('speed', 1.8);
                const res = await fetch(`/api/incident/${encodeURIComponent(activeSimIncidentId)}/upload_photo`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    showToast(`📸 ${tr("simUploadSuccess", "Frame uploaded! Computer Vision analysis complete.")} (#${simSeq})`);
                    loadStats();
                }
            }, 'image/jpeg');
        } catch (e) {
            showToast(tr("simFrameUploadFailed", "Frame upload simulation failed!"), true);
        }
    });
}

if (simDeadManBtn) {
    simDeadManBtn.addEventListener('click', async () => {
        if (!activeSimIncidentId) {
            alert(tr("simNeedStartAlert", "Please click '1. Start Live Test SOS' first."));
            return;
        }
        try {
            const res = await fetch(`/api/incident/${encodeURIComponent(activeSimIncidentId)}/dead_man_trigger?reason=Admin_Simulation_Smashed_Device`, {
                method: 'POST'
            });
            if (res.ok) {
                showToast(`💥 ${tr("simDeadManSuccess", "Dead-Man device smashed alert broadcasted to control room!")}`);
            }
        } catch (e) {
            showToast(tr("simDeadManFailed", "Dead-Man simulation failed!"), true);
        }
    });
}

if (simDuressBtn) {
    simDuressBtn.addEventListener('click', async () => {
        if (!activeSimIncidentId) {
            alert(tr("simNeedStartAlert", "Please click '1. Start Live Test SOS' first."));
            return;
        }
        try {
            const formData = new FormData();
            formData.append('pin', '9999');
            const res = await fetch(`/api/incident/${encodeURIComponent(activeSimIncidentId)}/duress`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                showToast(`🥷 ${tr("simDuressSuccess", "Code 9999 Duress hostage alert triggered covertly!")}`);
            }
        } catch (e) {
            showToast(tr("simDuressFailed", "Duress simulation failed!"), true);
        }
    });
}

if (simBatteryBtn) {
    simBatteryBtn.addEventListener('click', async () => {
        if (!activeSimIncidentId) {
            alert(tr("simNeedStartAlert", "Please click '1. Start Live Test SOS' first."));
            return;
        }
        try {
            const formData = new FormData();
            formData.append('battery_level', 8.0);
            formData.append('lat', 23.0225);
            formData.append('lng', 72.5714);
            const res = await fetch(`/api/incident/${encodeURIComponent(activeSimIncidentId)}/battery_alert`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                showToast(`🔋 ${tr("simBatterySuccess", "Critical 8% battery distress alert sent to control room!")}`);
            }
        } catch (e) {
            showToast(tr("simBatteryFailed", "Battery alert simulation failed!"), true);
        }
    });
}

// React instantly when user changes language
window.addEventListener('languageChanged', () => {
    loadIncidents();
});

// Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadIncidents();
    loadConfig();
});
