// background.js — Flagium MV3

const cache = new Map(); // hostname → info (in-memory)

const tabData = new Map(); // tabId → {ip, hostname}

// ==================== KEEPALIVE ====================
// SW в MV3 убивается через ~30с. Будим его каждые 10с через alarm.
chrome.alarms.create("sw-keepalive", { periodInMinutes: 1/6 }); // каждые 10 секунд
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sw-keepalive") {
    // Просто просыпаемся. Ничего делать не надо.
  }
});

// ==================== FLAG ICON GENERATOR ====================
async function createFlagIcon(countryCode) {
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const flagEmoji = countryCode && countryCode.length === 2
    ? String.fromCodePoint(127397 + countryCode.toUpperCase().charCodeAt(0),
                           127397 + countryCode.toUpperCase().charCodeAt(1))
    : '🌐';

  ctx.fillText(flagEmoji, 64, 66);
  ctx.strokeStyle = '#00000044'; ctx.lineWidth = 8; ctx.strokeText(flagEmoji, 64, 66);
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 3; ctx.strokeText(flagEmoji, 64, 66);

  return { "128": ctx.getImageData(0, 0, 128, 128) };
}

// ==================== GEO LOOKUP ====================
async function geoLookup(ip) {
  if (!ip) return null;
  const clean = (v) => v && v !== "—" && v !== "undefined" && v !== "null" ? v : null;

  try {
    const r = await fetch(`https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`);
    const d = await r.json();
    if (!d?.ip) return null;

    let info = {
      ip: d.ip, hostname: null,
      city: clean(d.city), region: clean(d.region), country: clean(d.country),
      countryCode: clean(d.country_code),
      loc: d.latitude && d.longitude ? `${d.latitude},${d.longitude}` : null,
      org: clean(d.organization), postal: clean(d.postal_code),
      timezone: clean(d.timezone), anycast: false
    };

    // Cloudflare fix
    if ((info.org || "").toLowerCase().includes("cloudflare")) {
      info = { ...info, country: "United States", countryCode: "us",
               city: "San Francisco", region: "California", loc: "37.7749,-122.4194" };
    }
    return info;
  } catch (e) {
    console.warn("geojs failed:", e);
    return null;
  }
}

// ==================== DNS OVER HTTPS ====================
async function resolveViaDoh(hostname) {
  try {
    const base = "https://cloudflare-dns.com/dns-query";
    const [aRes, aaaaRes] = await Promise.all([
      fetch(`${base}?name=${encodeURIComponent(hostname)}&type=A`,
        { headers: { "Accept": "application/dns-json" } }).then(r => r.json()).catch(() => null),
      fetch(`${base}?name=${encodeURIComponent(hostname)}&type=AAAA`,
        { headers: { "Accept": "application/dns-json" } }).then(r => r.json()).catch(() => null)
    ]);
    return {
      ipv4: aRes?.Answer?.[0]?.data || null,
      ipv6: aaaaRes?.Answer?.[0]?.data || null,
      preferred: aaaaRes?.Answer?.[0]?.data || aRes?.Answer?.[0]?.data || null
    };
  } catch { return null; }
}

// ==================== LOOKUP ====================
// Сначала смотрим in-memory cache. Только если нет — идём в сеть.
async function lookupHostname(hostname, tabId = null) {
  if (cache.has(hostname)) return cache.get(hostname);

  let ip = (tabId && tabData.has(tabId)) ? tabData.get(tabId).ip : null;
  if (!ip) {
    const doh = await resolveViaDoh(hostname);
    ip = doh?.preferred || null;
  }

  if (ip) {
    const info = await geoLookup(ip);
    if (info) {
      cache.set(hostname, info);
      if (cache.size > 400) cache.delete([...cache.keys()][0]);
      return info;
    }
  }
  return null;
}

// ==================== UPDATE ICON & TITLE ====================
async function updateTabInfo(tabId, url) {
  if (!url) return;
  let hostname;
  try { hostname = new URL(url).hostname; } catch { return; }

  const info = await lookupHostname(hostname, tabId);
  if (!info?.countryCode) return;

  chrome.action.setIcon({ tabId, imageData: await createFlagIcon(info.countryCode) });

  const flag = info.countryCode.length === 2
    ? String.fromCodePoint(127397 + info.countryCode.toUpperCase().charCodeAt(0),
                           127397 + info.countryCode.toUpperCase().charCodeAt(1))
    : '🌐';
  chrome.action.setTitle({ tabId, title: `${flag} ${info.country}\n${info.city || "—"} • ${info.ip}\n${info.org}` });
}

// ==================== LISTENERS ====================
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.type === "main_frame" && details.ip)
      tabData.set(details.tabId, { ip: details.ip, hostname: new URL(details.url).hostname });
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === "complete" && tab?.url) updateTabInfo(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => { if (tab?.url) updateTabInfo(tabId, tab.url); });
});

chrome.tabs.onRemoved.addListener(tabId => tabData.delete(tabId));

// ==================== POPUP MESSAGE HANDLER ====================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PING") { sendResponse({ ok: true }); return false; }
  if (msg.type === "LOOKUP") {
    (async () => {
      const { hostname, forceRefresh } = msg;
      if (forceRefresh) cache.delete(hostname);
      const info = await lookupHostname(hostname);
      sendResponse(info ? { ok: true, ...info } : { error: "Lookup failed" });
    })();
    return true;
  }
});

// ==================== KEEPALIVE PORT ====================
chrome.runtime.onConnect.addListener((port) => {
  // порт от popup — пока открыт, SW не засыпает
});
