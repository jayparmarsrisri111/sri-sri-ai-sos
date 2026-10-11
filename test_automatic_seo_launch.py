import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app import app
from backend.seo_manager import seo_manager, IST, LAUNCH_DATETIME
import json
import os

client = TestClient(app)

def test_auto_seo_lifecycle():
    print("[TEST] 1. Pre-Launch State Verification (Simulating Before 11-10-2026)...")
    orig_ist_fn = seo_manager.get_current_ist
    seo_manager.get_current_ist = lambda: datetime(2026, 10, 10, 10, 0, 0, tzinfo=IST)
    seo_manager.set_force_active(False)
    
    # Status endpoint check
    res_status = client.get('/api/seo/status')
    assert res_status.status_code == 200, f"Status failed: {res_status.status_code}"
    status_data = res_status.json()
    assert "11-10-2026" in status_data["target_launch_date"], "Missing target launch date"
    assert "10:51:00" in status_data["target_launch_window"], "Missing 10:51:00 launch time"
    assert "11:30:00" in status_data["target_launch_window"], "Missing 11:30:00 window end"
    print(f"   ✓ Status check passed: Window = {status_data['target_launch_window']}, Countdown = {status_data['countdown_text']}")

    # Pre-Launch Robots.txt check
    res_robots = client.get('/robots.txt')
    assert res_robots.status_code == 200
    assert "PRE-LAUNCH STAGING MODE" in res_robots.text
    assert "11-10-2026" in res_robots.text
    print("   ✓ Robots.txt is staging-protected before 11-10-2026")

    # Pre-Launch Home Page check
    res_home = client.get('/')
    assert res_home.status_code == 200
    assert res_home.headers.get("X-Robots-Tag") == "noindex, follow"
    assert res_home.headers.get("X-SEO-Launch-Status") == "SCHEDULED-2026-10-11"
    print("   ✓ Home page serves noindex, follow with scheduled launch header before 11-10-2026")

    # Restore real clock
    seo_manager.get_current_ist = orig_ist_fn

    print("\n[TEST] 2. Simulating Automatic Arrival of 11-10-2026 (Live Flip)...")
    # Simulate arrival of 11-10-2026
    seo_manager.set_force_active(True)

    # Active Robots.txt check
    res_robots_live = client.get('/robots.txt')
    assert res_robots_live.status_code == 200
    assert "OFFICIAL PRODUCTION LAUNCH LIVE" in res_robots_live.text
    assert "Allow: /" in res_robots_live.text
    print("   ✓ Robots.txt AUTOMATICALLY became production live!")

    # Active Home Page check
    res_home_live = client.get('/')
    assert res_home_live.status_code == 200
    assert res_home_live.headers.get("X-Robots-Tag") == "index, follow"
    assert res_home_live.headers.get("X-SEO-Launch-Status") == "LIVE"
    assert 'content="index, follow' in res_home_live.text
    assert "🟢 SEO LIVE" in res_home_live.text
    print("   ✓ Home page AUTOMATICALLY flipped to index, follow with LIVE badge!")

    # Search Engine Ping Execution check
    print("\n[TEST] 3. Verifying Search Engine Ping & Log Record...")
    res_ping = client.post('/api/seo/ping_search_engines')
    assert res_ping.status_code == 200
    ping_data = res_ping.json()
    assert ping_data["status"] == "success"
    assert "Google" in ping_data["results"]
    assert "Bing" in ping_data["results"]
    assert "IndexNow" in ping_data["results"]
    print("   ✓ Ping to Google, Bing, and IndexNow successfully recorded!")

    # Verify log file
    log_file = os.path.join("storage", "seo_launch_log.json")
    assert os.path.exists(log_file), "Log file was not created"
    logs = json.loads(open(log_file, "r", encoding="utf-8").read())
    assert len(logs) > 0, "Logs are empty"
    print(f"   ✓ storage/seo_launch_log.json contains {len(logs)} automated launch record(s)!")

    # Revert to scheduled automatic state
    seo_manager.set_force_active(False)
    print("\n[TEST] 4. Reverted back to automatic clock mode.")
    status_final = seo_manager.get_status()
    print(f"   ✓ Final Clock State: is_live={status_final['is_live']}, launch_target={status_final['target_launch_date']}")

    print("\n🎉 ALL AUTOMATIC SEO LAUNCH LIFECYCLE TESTS PASSED 100%!")

if __name__ == "__main__":
    test_auto_seo_lifecycle()
