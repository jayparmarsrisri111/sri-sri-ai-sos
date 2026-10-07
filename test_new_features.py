import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

print("--- Testing /admin route ---")
res = client.get("/admin")
assert res.status_code == 200, f"/admin status: {res.status_code}"
assert "Admin Master" in res.text or "ADMIN MASTER" in res.text
print("✓ /admin page served successfully")

print("--- Testing /api/admin/config GET & POST ---")
cfg_res = client.get("/api/admin/config")
assert cfg_res.status_code == 200
cfg_data = cfg_res.json()
print("Current config keys:", list(cfg_data.keys()))

cfg_data["system_name"] = "Sri Sri ❤️SOS AI"
cfg_data["security"]["normal_cancel_pin"] = "1234"
cfg_data["security"]["duress_coercion_pin"] = "9999"
post_cfg = client.post("/api/admin/config", json=cfg_data)
assert post_cfg.status_code == 200
print("✓ /api/admin/config GET & POST verified")

print("--- Testing /api/admin/stats ---")
stats_res = client.get("/api/admin/stats")
assert stats_res.status_code == 200
stats = stats_res.json()
print("Admin Stats:", stats)
print("✓ /api/admin/stats verified")

print("--- Testing Incident Flow with Duress & Battery ---")
inc_res = client.post("/api/incident/start", json={
    "user_name": "Pooja Patel",
    "phone_number": "+91 98765 43210"
})
assert inc_res.status_code == 200
inc = inc_res.json()
inc_id = inc["incident_id"]
print(f"Started incident: {inc_id}")

# Test Duress Coercion PIN
duress_res = client.post(f"/api/incident/{inc_id}/duress", data={"pin": "9999"})
assert duress_res.status_code == 200
assert duress_res.json().get("status") == "covert_engaged"
print("✓ Duress Coercion PIN (9999) trigger verified")

# Test Battery Alert
bat_res = client.post(f"/api/incident/{inc_id}/battery_alert", data={
    "battery_level": 12.0,
    "lat": 23.0225,
    "lng": 72.5714
})
assert bat_res.status_code == 200
print("✓ Battery Critical alert verified")

# Test Grace Cancel
grace_res = client.post(f"/api/incident/{inc_id}/grace_cancel")
assert grace_res.status_code == 200
print("✓ Grace Cancel verified")

# Test Delete Incident
del_res = client.delete(f"/api/incident/{inc_id}")
assert del_res.status_code == 200
print("✓ Incident Delete verified")

print("\n🎉 ALL NEW MASTER DATA & ADVANTAGE MITIGATION FEATURES TESTED & PASSING!")
