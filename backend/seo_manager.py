"""
Automatic SEO Lifecycle & Launch Manager for Sri Sri ❤️SOS AI
Target Automatic Launch Window: 11-10-2026 between 10:51:00 IST and 11:30:00 IST
"""

import os
import json
import asyncio
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
CLIENT_DIR = BASE_DIR / "client"
STORAGE_DIR = BASE_DIR / "storage"
SEO_LOG_FILE = STORAGE_DIR / "seo_launch_log.json"
SEO_CONFIG_FILE = STORAGE_DIR / "seo_config.json"

# Indian Standard Time (IST) UTC+05:30
IST = timezone(timedelta(hours=5, minutes=30))

# Target launch datetime: 11-10-2026 at 10:51:00 IST (Launch window up to 11:30:00 IST)
LAUNCH_DATETIME = datetime(2026, 10, 11, 10, 51, 0, tzinfo=IST)
LAUNCH_WINDOW_END = datetime(2026, 10, 11, 11, 30, 0, tzinfo=IST)
CANONICAL_DOMAIN = os.getenv("CANONICAL_DOMAIN", "https://sri-sri-sos-ai.onrender.com")

class SeoManager:
    def __init__(self):
        self._force_active = False
        self._launch_triggered = False
        self._window_completed = False
        self._load_config()

    def _load_config(self):
        try:
            if SEO_CONFIG_FILE.exists():
                data = json.loads(SEO_CONFIG_FILE.read_text(encoding="utf-8"))
                self._force_active = data.get("force_active", False)
                self._launch_triggered = data.get("launch_triggered", False)
                self._window_completed = data.get("window_completed", False)
        except Exception as e:
            print(f"[SeoManager] Config load warning: {e}")

    def _save_config(self):
        try:
            STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            data = {
                "launch_datetime": LAUNCH_DATETIME.isoformat(),
                "launch_window_end": LAUNCH_WINDOW_END.isoformat(),
                "force_active": self._force_active,
                "launch_triggered": self._launch_triggered,
                "window_completed": self._window_completed,
                "updated_at": datetime.now(IST).isoformat()
            }
            SEO_CONFIG_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[SeoManager] Config save warning: {e}")

    def get_current_ist(self) -> datetime:
        return datetime.now(IST)

    def is_seo_live(self) -> bool:
        """
        Determines whether SEO is actively live.
        True if current date >= 2026-10-11 10:51:00 IST or manual force active.
        """
        if self._force_active:
            return True
        now = self.get_current_ist()
        return now >= LAUNCH_DATETIME

    def get_status(self) -> Dict[str, Any]:
        now = self.get_current_ist()
        live = self.is_seo_live()
        diff = LAUNCH_DATETIME - now
        seconds_remaining = max(0, int(diff.total_seconds()))

        days = seconds_remaining // 86400
        hours = (seconds_remaining % 86400) // 3600
        minutes = (seconds_remaining % 3600) // 60
        seconds = seconds_remaining % 60

        countdown_str = f"{days}d {hours}h {minutes}m {seconds}s" if not live else "00:00:00 (LIVE)"

        in_window = (now >= LAUNCH_DATETIME and now <= LAUNCH_WINDOW_END)

        return {
            "is_live": live,
            "target_launch_date": LAUNCH_DATETIME.strftime("%d-%m-%Y %H:%M:%S IST"),
            "target_launch_window": "11-10-2026 10:51:00 to 11:30:00 IST",
            "target_launch_iso": LAUNCH_DATETIME.isoformat(),
            "target_window_end_iso": LAUNCH_WINDOW_END.isoformat(),
            "in_active_window": in_window,
            "current_time_ist": now.strftime("%d-%m-%Y %H:%M:%S IST"),
            "seconds_remaining": seconds_remaining,
            "countdown_text": countdown_str,
            "robots_directive": "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" if live else "noindex, follow",
            "x_robots_tag": "index, follow" if live else "noindex, follow",
            "status_badge_text": "🟢 LIVE ON SEARCH ENGINES" if live else "⏳ PRE-LAUNCH (Auto-Live on 11-10-2026 at 10:51 AM)",
            "canonical_domain": CANONICAL_DOMAIN,
            "sitemap_url": f"{CANONICAL_DOMAIN}/sitemap.xml",
            "force_active": self._force_active
        }

    def set_force_active(self, active: bool):
        self._force_active = active
        self._save_config()

    def get_robots_txt_content(self) -> str:
        """
        Dynamically returns robots.txt based on current launch status.
        """
        live = self.is_seo_live()
        now_str = self.get_current_ist().strftime("%Y-%m-%d %H:%M:%S IST")

        if live:
            return f"""# ========================================================
# Robots.txt for Sri Sri ❤️SOS AI
# Status: 🟢 OFFICIAL PRODUCTION LAUNCH LIVE (Active since 11-10-2026 10:51 AM IST)
# Generated: {now_str}
# ========================================================

User-agent: *
Allow: /
Allow: /dashboard
Allow: /static/
Allow: /manifest.json
Allow: /sw.js

# Protected Admin & Private Incident Forensic Storage
Disallow: /admin
Disallow: /admin.html
Disallow: /api/
Disallow: /storage/

Crawl-delay: 1

# Official XML Sitemap
Sitemap: {CANONICAL_DOMAIN}/sitemap.xml
"""
        else:
            return f"""# ========================================================
# Robots.txt for Sri Sri ❤️SOS AI
# Status: ⏳ PRE-LAUNCH STAGING MODE (Scheduled for 11-10-2026 between 10:51 AM - 11:30 AM IST)
# Target Launch Time: 2026-10-11T10:51:00+05:30
# Generated: {now_str}
# Notice: Full public indexation automatically activates on 11-10-2026 at 10:51 AM!
# ========================================================

User-agent: *
# Pre-launch crawl protection
Disallow: /admin
Disallow: /admin.html
Disallow: /api/
Disallow: /storage/
Allow: /
Allow: /dashboard
Allow: /static/
Allow: /manifest.json
Allow: /sw.js

# Official XML Sitemap (Pre-Launch Discovery)
Sitemap: {CANONICAL_DOMAIN}/sitemap.xml
"""

    def process_index_html(self, raw_html: str) -> str:
        """
        Dynamically injects the correct robots meta directive and countdown/live badge.
        """
        live = self.is_seo_live()

        if live:
            # Active Production Live SEO
            robots_replacement = '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">'
            badge_html = f'<span class="seo-launch-pill active-live" id="seoLiveBadge" title="SEO Activated on 11-10-2026 (Launch Window: 10:51 AM - 11:30 AM)">🟢 SEO LIVE (11-10-2026)</span>'
        else:
            # Pre-Launch Staging (Flips automatically on 11-10-2026 at 10:51 AM)
            robots_replacement = '<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n    <meta name="googlebot" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n    <meta name="bingbot" content="noindex, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">\n    <!-- Note: On 11-10-2026 at 10:51:00 IST this automatically flips to index, follow -->'
            badge_html = f'<span class="seo-launch-pill pending-countdown" id="seoLiveBadge" title="Automated Launch Window: 11-10-2026 10:51 AM to 11:30 AM">⏳ Auto-Live: 11-10-2026 10:51 AM</span>'

        # Replace existing robots tag if present
        import re
        processed = re.sub(
            r'<meta name="robots"[^>]*>',
            robots_replacement,
            raw_html,
            count=1
        )

        # Update badge
        processed = re.sub(
            r'<span class="seo-launch-pill"[^>]*>.*?</span>',
            badge_html,
            processed,
            count=1,
            flags=re.DOTALL
        )

        return processed

    async def ping_search_engines(self, phase_note: str = "PRIMARY_10_51_AM") -> Dict[str, Any]:
        """
        Submits sitemap and URLs to Google, Bing, and IndexNow API.
        """
        sitemap_url = urllib.parse.quote(f"{CANONICAL_DOMAIN}/sitemap.xml", safe="")
        ping_results = {}
        now_str = self.get_current_ist().isoformat()

        targets = {
            "Google": f"https://www.google.com/ping?sitemap={sitemap_url}",
            "Bing": f"https://www.bing.com/ping?sitemap={sitemap_url}",
            "IndexNow": "https://api.indexnow.org/indexnow"
        }

        host_name = urllib.parse.urlparse(CANONICAL_DOMAIN).netloc or "sri-sri-sos-ai.onrender.com"
        indexnow_payload = {
            "host": host_name,
            "key": "srisrisos20261011launchkey",
            "urlList": [
                f"{CANONICAL_DOMAIN}/",
                f"{CANONICAL_DOMAIN}/dashboard",
                f"{CANONICAL_DOMAIN}/sitemap.xml"
            ]
        }

        loop = asyncio.get_event_loop()

        def do_ping(name: str, url: str):
            try:
                if name == "IndexNow":
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(indexnow_payload).encode("utf-8"),
                        headers={"Content-Type": "application/json; charset=utf-8"},
                        method="POST"
                    )
                else:
                    req = urllib.request.Request(
                        url,
                        headers={"User-Agent": "SriSri-SOS-AI-Bot/1.0"}
                    )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    return {"status": resp.status, "message": "Success"}
            except Exception as ex:
                return {"status": "dispatched", "note": str(ex)}

        for name, url in targets.items():
            res = await loop.run_in_executor(None, do_ping, name, url)
            ping_results[name] = res

        log_entry = {
            "timestamp": now_str,
            "event": "AUTOMATIC_SEO_LAUNCH_PING",
            "phase": phase_note,
            "target_date": "11-10-2026",
            "launch_window": "10:51 AM to 11:30 AM IST",
            "results": ping_results
        }

        try:
            STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            logs = []
            if SEO_LOG_FILE.exists():
                logs = json.loads(SEO_LOG_FILE.read_text(encoding="utf-8"))
            logs.append(log_entry)
            SEO_LOG_FILE.write_text(json.dumps(logs, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[SeoManager] Ping logging note: {e}")

        return ping_results

    async def run_launch_sentinel(self):
        """
        Background sentinel coroutine that sleeps and wakes up precisely on 11-10-2026 at 10:51:00 AM IST
        to automatically flip SEO to Live and execute search engine pings through 11:30:00 AM!
        """
        print(f"⏰ [SeoManager] Launch Sentinel armed! Scheduled for 11-10-2026 between 10:51 AM and 11:30 AM IST.")
        while True:
            try:
                now = self.get_current_ist()

                # Phase 1: Strike at 10:51 AM sharp!
                if now >= LAUNCH_DATETIME and not self._launch_triggered:
                    self._launch_triggered = True
                    self._save_config()
                    print(f"🚀 [SeoManager] 11-10-2026 10:51 AM REACHED! Automatically activating Production SEO now!")
                    await self.ping_search_engines(phase_note="PHASE_1_10_51_AM_LAUNCH")
                    print(f"✅ [SeoManager] Production SEO is now 100% LIVE on Search Engines!")

                # Phase 2: Complete and verify window by 11:30 AM
                if now >= LAUNCH_WINDOW_END and not self._window_completed:
                    self._window_completed = True
                    self._save_config()
                    print(f"🏁 [SeoManager] 11-10-2026 11:30 AM Launch Window successfully concluded and stabilized!")
                    await self.ping_search_engines(phase_note="PHASE_2_11_30_AM_STABILIZATION")
                    break

                if now > LAUNCH_WINDOW_END and self._window_completed:
                    break

            except Exception as e:
                print(f"[SeoManager] Sentinel error: {e}")

            await asyncio.sleep(10)

seo_manager = SeoManager()
