import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from backend.app import app
from PIL import Image
import os

client = TestClient(app)

def test_seo():
    # 1. Test Robots.txt
    r_robots = client.get('/robots.txt')
    assert r_robots.status_code == 200, f'robots.txt failed: {r_robots.status_code}'
    assert 'User-agent: *' in r_robots.text, 'robots.txt missing User-agent'
    assert 'Disallow: /admin' in r_robots.text, 'robots.txt missing admin protection'
    assert 'Sitemap:' in r_robots.text, 'robots.txt missing Sitemap reference'
    print('[PASS] 1. /robots.txt verified successfully!')

    # 2. Test Sitemap.xml
    r_sitemap = client.get('/sitemap.xml')
    assert r_sitemap.status_code == 200, f'sitemap.xml failed: {r_sitemap.status_code}'
    assert '<loc>https://sri-sri-sos-ai.onrender.com/</loc>' in r_sitemap.text, 'sitemap.xml missing root loc'
    assert '2026-10-11' in r_sitemap.text, 'sitemap.xml missing launch date 2026-10-11'
    assert 'hreflang="gu"' in r_sitemap.text, 'sitemap.xml missing hreflang'
    print('[PASS] 2. /sitemap.xml verified successfully with launch date 2026-10-11!')

    # 3. Test Manifest.json
    r_manifest = client.get('/manifest.json')
    assert r_manifest.status_code == 200, f'manifest.json failed: {r_manifest.status_code}'
    data = r_manifest.json()
    assert 'Sri Sri' in data['name'], 'manifest missing name'
    assert data['lang'] == 'gu', 'manifest missing lang'
    print('[PASS] 3. /manifest.json verified successfully!')

    # 4. Test Home Page (client/index.html)
    r_home = client.get('/')
    assert r_home.status_code == 200, f'home failed: {r_home.status_code}'
    html = r_home.text
    assert '<meta name="description"' in html, 'home missing meta description'
    assert '<meta name="keywords"' in html, 'home missing meta keywords'
    assert 'og:image' in html, 'home missing og:image'
    assert 'twitter:image' in html, 'home missing twitter:image'
    assert 'application/ld+json' in html, 'home missing JSON-LD schema'
    assert '11-10-2026' in html or '2026-10-11' in html, 'home missing launch date'
    assert '<h1 class="sr-only">' in html, 'home missing semantic H1'
    assert 'hreflang="gu"' in html, 'home missing hreflang gu'
    assert 'hreflang="hi"' in html, 'home missing hreflang hi'
    assert 'hreflang="en"' in html, 'home missing hreflang en'
    assert 'seo-overview-card' in html, 'home missing seo-overview-card'
    print('[PASS] 4. / (Mobile SOS App) full SEO tags & structured data verified!')

    # 5. Test Dashboard Page
    r_dash = client.get('/dashboard')
    assert r_dash.status_code == 200, f'dashboard failed: {r_dash.status_code}'
    assert '<meta name="robots" content="noindex, follow">' in r_dash.text, 'dashboard missing robots tag'
    print('[PASS] 5. /dashboard SEO & security verified!')

    # 6. Test Admin Page
    r_admin = client.get('/admin')
    assert r_admin.status_code == 200, f'admin failed: {r_admin.status_code}'
    assert '<meta name="robots" content="noindex, nofollow">' in r_admin.text, 'admin missing noindex nofollow'
    print('[PASS] 6. /admin noindex privacy protection verified!')

    # 7. Check og-banner.png image dimensions
    og_path = os.path.join('client', 'static', 'images', 'og-banner.png')
    assert os.path.exists(og_path), 'og-banner.png not found'
    with Image.open(og_path) as im:
        assert im.size == (1200, 630), f'Invalid og image dimensions: {im.size}'
        print(f'[PASS] 7. og-banner.png verified: size={im.size}, format={im.format}')

    print('\n[SUCCESS] ALL 7 SEO VERIFICATION CHECKS PASSED PERFECTLY!')

if __name__ == '__main__':
    test_seo()
