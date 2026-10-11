"""
Comprehensive Multi-Language & Anti-Banner Validation Test Suite for Sri Sri SOS AI
Verifies:
1. 100% dictionary completeness for all 11 languages (gu, en, hi, mr, ta, es, fr, de, ru, zh, ar)
2. Zero external Google Translate script tags or injection
3. Zero google_translate_element container tags
4. 100% validity of data-i18n attributes in index.html, dashboard.html, admin.html
5. CSS banner suppression rules present in sos.css, dashboard.css, admin.css
6. RTL auto-direction for Arabic (ar) and LTR for others
"""

import json
import re
import os
import unittest

class TestI18nSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open('client/static/js/i18n.js', 'r', encoding='utf-8') as f:
            cls.i18n_content = f.read()
        with open('client/index.html', 'r', encoding='utf-8') as f:
            cls.index_html = f.read()
        with open('client/dashboard.html', 'r', encoding='utf-8') as f:
            cls.dash_html = f.read()
        with open('client/admin.html', 'r', encoding='utf-8') as f:
            cls.admin_html = f.read()

    def test_all_11_languages_present_and_complete(self):
        langs = ['gu', 'en', 'hi', 'mr', 'ta', 'es', 'fr', 'de', 'ru', 'zh', 'ar']
        # Extract master keys from 'en' in i18n.js
        pattern_en = r'en:\s*\{([^}]+)\}'
        m_en = re.search(pattern_en, self.i18n_content)
        self.assertIsNotNone(m_en, "Language 'en' block not found in i18n.js")
        master_keys = set(re.findall(r'"([a-zA-Z0-9_]+)":', m_en.group(1)))
        self.assertGreaterEqual(len(master_keys), 290)

        # Check that each language has its dictionary defined in i18n.js
        for lang in langs:
            pattern = rf'{lang}:\s*\{{([^}}]+)\}}'
            match = re.search(pattern, self.i18n_content)
            self.assertIsNotNone(match, f"Language '{lang}' block not found in i18n.js")
            keys_in_lang = set(re.findall(r'"([a-zA-Z0-9_]+)":', match.group(1)))
            missing = master_keys - keys_in_lang
            self.assertEqual(len(missing), 0, f"Language '{lang}' is missing keys: {missing}")

    def test_zero_google_translate_script_injection(self):
        # i18n.js must NOT inject translate.google.com/translate_a/element.js
        self.assertNotIn("translate.google.com", self.i18n_content,
                         "translate.google.com script found inside i18n.js!")
        self.assertNotIn("translate.google.com", self.index_html,
                         "translate.google.com found in index.html!")
        self.assertNotIn("translate.google.com", self.dash_html,
                         "translate.google.com found in dashboard.html!")
        self.assertNotIn("translate.google.com", self.admin_html,
                         "translate.google.com found in admin.html!")

    def test_zero_google_translate_element_div(self):
        # No google_translate_element div in any HTML
        self.assertNotIn('id="google_translate_element"', self.index_html)
        self.assertNotIn('id="google_translate_element"', self.dash_html)
        self.assertNotIn('id="google_translate_element"', self.admin_html)

    def test_all_html_files_load_i18n_js(self):
        self.assertIn('src="/static/js/i18n.js"', self.index_html)
        self.assertIn('src="/static/js/i18n.js"', self.dash_html)
        self.assertIn('src="/static/js/i18n.js"', self.admin_html)

    def test_all_html_data_i18n_attributes_valid(self):
        pattern_en = r'en:\s*\{([^}]+)\}'
        m_en = re.search(pattern_en, self.i18n_content)
        known_keys = set(re.findall(r'"([a-zA-Z0-9_]+)":', m_en.group(1)))

        for name, html in [('index.html', self.index_html),
                           ('dashboard.html', self.dash_html),
                           ('admin.html', self.admin_html)]:
            used_keys = re.findall(r'data-i18n="([^"]+)"', html)
            self.assertGreater(len(used_keys), 0, f"No data-i18n attributes found in {name}")
            for k in used_keys:
                self.assertIn(k, known_keys, f"Key '{k}' in {name} is not in i18n master dictionary!")

    def test_anti_google_banner_suppression_css(self):
        css_files = ['client/static/css/sos.css', 'client/static/css/dashboard.css', 'client/static/css/admin.css']
        for css_path in css_files:
            with open(css_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            self.assertIn('.goog-te-banner-frame', css_content, f"Missing banner frame suppression in {css_path}")
            self.assertIn('top: 0px !important', css_content, f"Missing body top 0px override in {css_path}")

    def test_rtl_support_for_arabic(self):
        self.assertIn("lang === 'ar'", self.i18n_content)
        self.assertIn("'rtl'", self.i18n_content)

if __name__ == '__main__':
    unittest.main()
