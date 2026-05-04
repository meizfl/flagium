# Flagium 🌍

**FlagFox for Chromium browsers (and Firefox) — Manifest V3**

Modern alternative to the classic FlagFox extension. Shows the country flag of the website's server in the toolbar.

![Flagium Demo](https://proside.pp.ua/archive/sitecache/flagium.png)

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
1. Download or clone this repository
2. Go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **"Load unpacked"** and select the `flagium` folder

#### Firefox
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `manifest.json`

### API Usage

Uses free public services:
- `ipinfo.io` — primary GeoIP
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
