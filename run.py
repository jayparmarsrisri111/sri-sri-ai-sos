import os
import sys
import socket
import argparse
import subprocess
import threading
import time
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def start_public_tunnel(port):
    """
    Starts an instant public HTTPS tunnel so any user in the world
    can access the app on their device without being on the same Wi-Fi.
    """
    def run_lt():
        try:
            print("\n🌐 પબ્લિક લાઇવ લિંક તૈયાર થઈ રહી છે (Creating Public Live HTTPS Tunnel)...")
            proc = subprocess.Popen(
                ["npx", "localtunnel", "--port", str(port)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=True
            )
            for line in proc.stdout:
                if "your url is:" in line.lower():
                    tunnel_url = line.strip().split()[-1]
                    print("\n" + "🌟" * 35)
                    print(f"🌍 પબ્લિક લાઇવ લિંક (કોઈપણ મોબાઇલ/ડિવાઇસ માટે):")
                    print(f"👉 {tunnel_url}")
                    print(f"🚨 પોલીસ ડેશબોર્ડ: {tunnel_url}/dashboard")
                    print(f"⚙️ એડમિન પેનલ: {tunnel_url}/admin")
                    print("🌟" * 35 + "\n")
                    break
        except Exception as e:
            print(f"Tunnel creation note: {e}")

    t = threading.Thread(target=run_lt, daemon=True)
    t.start()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sri Sri SOS AI Server Launcher")
    parser.add_argument("--port", type=int, default=8055, help="Port to run server on (default 8055)")
    parser.add_argument("--https", "--ssl", action="store_true", help="Enable HTTPS using self-signed SSL cert")
    parser.add_argument("--tunnel", action="store_true", help="Create public live HTTPS URL for global internet access")
    args = parser.parse_args()

    local_ip = get_local_ip()
    port = args.port
    is_https = args.https

    ssl_cert_file = None
    ssl_key_file = None

    if is_https:
        from backend.ssl_generator import generate_self_signed_cert
        ssl_dir = BASE_DIR / "storage" / "ssl"
        ssl_cert_file, ssl_key_file = generate_self_signed_cert(ssl_dir, local_ip)

    proto = "https" if is_https else "http"

    print("=" * 75)
    print("🛡️  SRI SRI ❤️SOS AI - DIGITAL BLACKBOX & GIRLS SAFETY SYSTEM (LIVE)")
    print("=" * 75)
    print(f"📡 સર્વર શરૂ થઈ રહ્યું છે ({proto.upper()})...")
    print()
    print(f"📱 મોબાઇલ SOS એપ (પીડિતા માટે):")
    print(f"   -> કમ્પ્યુટર પર: {proto}://localhost:{port}/")
    print(f"   -> મોબાઇલ ફોન પરથી (WiFi): {proto}://{local_ip}:{port}/")
    print()
    print(f"🚨 પોલીસ & વાલી લાઈવ કંટ્રોલ રૂમ (Tactical Cockpit):")
    print(f"   -> {proto}://localhost:{port}/dashboard")
    print(f"   -> મોબાઇલ/ટેબ્લેટ પરથી: {proto}://{local_ip}:{port}/dashboard")
    print()
    print(f"⚙️  એડમિન માસ્ટર ડેટા પોર્ટલ (Admin Master Portal):")
    print(f"   -> {proto}://localhost:{port}/admin")
    print()
    if is_https:
        print("🔒 HTTPS મોડ ચાલુ છે (મોબાઇલ બ્રાઉઝરમાં કેમેરા, માઇક અને GPS સંપૂર્ણ કામ કરશે).")
    else:
        print("💡 સૂચના: મોબાઇલ પર કેમેરા/માઇક માટે HTTPS જોઈએ. `python run.py --https` અથવા `python run.py --tunnel` વાપરો.")
    print("=" * 75)
    print("કીબોર્ડ પર Ctrl + C દબાવીને સર્વર બંધ કરી શકાય છે.\n")

    if args.tunnel:
        start_public_tunnel(port)

    import uvicorn
    uvicorn_kwargs = {
        "app": "backend.app:app",
        "host": "0.0.0.0",
        "port": port,
        "reload": True
    }
    if is_https and ssl_cert_file and ssl_key_file:
        uvicorn_kwargs["ssl_certfile"] = ssl_cert_file
        uvicorn_kwargs["ssl_keyfile"] = ssl_key_file

    uvicorn.run(**uvicorn_kwargs)
