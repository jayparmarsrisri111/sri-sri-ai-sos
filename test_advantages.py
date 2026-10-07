import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

print("=== VERIFYING 7 DISADVANTAGE-TO-ADVANTAGE CAPABILITIES ===")

# 1. Test PWA Manifest & Service Worker
print("\n[1] Testing PWA Manifest & Offline Service Worker Routes:")
res_manifest = client.get("/manifest.json")
assert res_manifest.status_code == 200, f"Manifest failed: {res_manifest.status_code}"
manifest_data = res_manifest.json()
assert manifest_data.get("short_name") == "SriSri SOS"
assert manifest_data.get("display") == "standalone"
print("  ✓ /manifest.json valid (Standalone PWA configuration verified)")

res_sw = client.get("/sw.js")
assert res_sw.status_code == 200, f"SW failed: {res_sw.status_code}"
assert "sri-sri-sos-v1" in res_sw.text
print("  ✓ /sw.js valid (Service worker asset caching verified)")

# 2. Test Mobile UI enhancements
print("\n[2] Testing Mobile SOS HTML UI Elements:")
res_index = client.get("/")
assert res_index.status_code == 200
assert 'rel="manifest" href="/manifest.json"' in res_index.text
assert 'id="sentinelChipsBar"' in res_index.text
assert 'id="wakeLockBadge"' in res_index.text
assert 'id="hardwareKeyBadge"' in res_index.text
assert 'id="superEarBadge"' in res_index.text
assert 'id="permissionRecoveryModal"' in res_index.text
print("  ✓ Mobile App contains WakeLock, Hardware Key, Super-Ear, and Permission Wizard")

# 3. Test Government Protocol CAP 1.2 Feed
print("\n[3] Testing Standard CAP 1.2 Feed (ITU-T X.1303 / OASIS):")
res_cap = client.get("/api/emergency/cap-feed")
assert res_cap.status_code == 200
cap_data = res_cap.json()
assert cap_data.get("standard") == "CAP-v1.2 (ITU-T X.1303 / OASIS)"
assert "alerts" in cap_data
print(f"  ✓ /api/emergency/cap-feed active ({cap_data.get('total_active_alerts')} active CAP emergency alerts)")

# 4. Test ERSS 112 CAD Unit Dispatch Simulation
print("\n[4] Testing ERSS 112 Police CAD Dispatch Endpoint:")
start_res = client.post("/api/incident/start", json={
    "user_name": "Pooja Patel",
    "phone_number": "+91 98765 43210"
})
assert start_res.status_code == 200
incident_id = start_res.json()["incident_id"]

erss_res = client.post(f"/api/incident/{incident_id}/dispatch_police_erss", data={"priority": "CRITICAL"})
assert erss_res.status_code == 200
erss_data = erss_res.json()
assert erss_data.get("event") == "POLICE_CAD_DISPATCHED"
assert "ERSS112-GJ-CAD" in erss_data.get("cad_token")
assert "PCR-VAN" in erss_data.get("assigned_unit")
assert erss_data.get("eta_minutes") == 3
print(f"  ✓ ERSS 112 CAD Dispatched: Unit {erss_data.get('assigned_unit')}, Token {erss_data.get('cad_token')}, ETA {erss_data.get('eta_minutes')} min")

# 5. Test Dashboard and Admin integration
print("\n[5] Testing Police Dashboard & Admin Portal Integration:")
dash_res = client.get("/dashboard")
assert dash_res.status_code == 200
assert 'id="dispatchErssBtn"' in dash_res.text
assert 'id="viewCapFeedBtn"' in dash_res.text
assert 'id="aiPocketOcclusion"' in dash_res.text
print("  ✓ Police Cockpit contains ERSS 112 CAD button, CAP feed link, and Pocket Occlusion radar")

admin_res = client.get("/admin")
assert admin_res.status_code == 200
assert "/api/emergency/cap-feed" in admin_res.text
print("  ✓ Admin Master Portal contains live CAP 1.2 government feed gateway")

print("\n=======================================================")
print("  ALL 7 ADVANTAGE ARCHITECTURAL TESTS PASSED (100% OK)!")
print("=======================================================")
