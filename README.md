# Flagium 🌍

**FlagFox for Chromium browsers (and Firefox) — Manifest V3**

Modern alternative to the classic FlagFox extension. Shows the country flag of the website's server in the toolbar.

![Flagium Chromium](https://proside.pp.ua/archive/sitecache/flagium_chromium.png)
![Flagium Firefox](https://proside.pp.ua/archive/sitecache/flagium_firefox.png)

### Features

- **Dynamic toolbar icon** — automatically changes to the country flag of the current site
- Real server IP detection (more accurate than simple DNS lookup)
- Displays: IP address, City, Country, Organization/ISP, Hostname
- Click-to-copy buttons
- Session caching (respects API rate limits)
- Works on both **Chrome** and **Firefox** (Manifest V3)
- Lightweight and fast

### Installation

#### Chrome / Edge / Brave / etc.
Go to https://chromewebstore.google.com/detail/flagium/kklifcgkdgkbfhigndfcnppchbpdmddk

#### Firefox
Go to https://addons.mozilla.org/uk/firefox/addon/flagium/

### API Usage

Uses free public services:
- `get.geojs.io` — primary GeoIP
- Cloudflare DNS-over-HTTPS — fallback resolver

### Permissions

- `webRequest` — to capture real server IP
- `activeTab` + `<all_urls>` — to work on all websites
- No unnecessary permissions

### Differences from original FlagFox

- Works on Chromium browsers (original is Firefox-only)
- Dynamic toolbar icon instead of address bar icon (due to MV3 limitations)
- More accurate real connection IP detection

---

**License**: GPL-3.0

Made with ❤️ for developers and power users.
## For donations
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/V7V61YY60F)
