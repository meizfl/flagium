// background.js — Flagium MV3
const cache = new Map();           // hostname → info
const tabData = new Map();         // tabId → {ip, hostname, ...}

// ==================== FLAG ICON GENERATOR (ПРОЗРАЧНЫЙ) ====================
async function createFlagIcon(countryCode) {
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext('2d', { alpha: true });

  // Очищаем canvas (прозрачный фон)
  ctx.clearRect(0, 0, 128, 128);

  // Эмодзи флага
  ctx.font = 'bold 96px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const flagEmoji = countryCode && countryCode.length === 2
  ? String.fromCodePoint(
    127397 + countryCode.toUpperCase().charCodeAt(0),
                         127397 + countryCode.toUpperCase().charCodeAt(1)
  )
  : '🌐';

  // Основной флаг
  ctx.fillText(flagEmoji, 64, 66);

  // Лёгкая тёмная обводка для лучшей видимости на любом фоне
  ctx.strokeStyle = '#00000044';
  ctx.lineWidth = 8;
  ctx.strokeText(flagEmoji, 64, 66);

  // Светлая обводка (для контраста на тёмном фоне)
  ctx.strokeStyle = '#ffffff66';
  ctx.lineWidth = 3;
  ctx.strokeText(flagEmoji, 64, 66);

  const imageData = ctx.getImageData(0, 0, 128, 128);

  return { "128": imageData };
}

// ==================== GEO LOOKUP ====================
async function geoLookup(ip) {
  if (!ip) return null;

  // helpers
  const normalize = (data, source) => {
    if (!data) return null;

    // ipwho.is
    if (source === "ipwho") {
      return {
        ip: data.ip,
        country: data.country || "Unknown",
        countryCode: (data.country_code || "").toLowerCase(),
        city: data.city || "—",
        org: data.connection?.isp || data.connection?.org || "—",
        hostname: data.connection?.domain || "—",
        lat: data.latitude,
        lon: data.longitude
      };
    }

    // ipinfo.io
    if (source === "ipinfo") {
      const [lat, lon] = (data.loc || ",").split(",");

      return {
        ip: data.ip,
        country: data.country || "Unknown",
        countryCode: (data.country || "").toLowerCase(),
        city: data.city || "—",
        org: data.org || "—",
        hostname: data.hostname || "—",
        lat: parseFloat(lat) || null,
        lon: parseFloat(lon) || null
      };
    }

    return null;
  };

  // 1) try ipwho.is first
  try {
    const r1 = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    const d1 = await r1.json();

    if (d1?.success) {
      return normalize(d1, "ipwho");
    }
  } catch (e) {
    console.warn("ipwho failed:", e);
  }

  // 2) fallback ipinfo.io
  try {
    const r2 = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`);
    const d2 = await r2.json();

    if (d2?.ip) {
      return normalize(d2, "ipinfo");
    }
  } catch (e) {
    console.warn("ipinfo failed:", e);
  }

  return null;
}

// ==================== DNS OVER HTTPS ====================
async function resolveViaDoh(hostname) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { "Accept": "application/dns-json" }
    });
    const data = await r.json();
    return data?.Answer?.[0]?.data || null;
  } catch { return null; }
}

// ==================== LOOKUP ====================
async function lookupHostname(hostname, tabId = null) {
  if (cache.has(hostname)) return cache.get(hostname);

  let ip = tabId && tabData.has(tabId) ? tabData.get(tabId).ip : null;
  if (!ip) ip = await resolveViaDoh(hostname);

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

  const imageDataDict = await createFlagIcon(info.countryCode);
  chrome.action.setIcon({
    tabId: tabId,
    imageData: imageDataDict
  });

  const flag = info.countryCode.length === 2
  ? String.fromCodePoint(127397 + info.countryCode.toUpperCase().charCodeAt(0),
                         127397 + info.countryCode.toUpperCase().charCodeAt(1))
  : '🌐';

  chrome.action.setTitle({
    tabId,
    title: `${flag} ${info.country}\n${info.city || "—"} • ${info.ip}\n${info.org}`
  });
}

// ==================== LISTENERS ====================
chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    if (details.type === "main_frame" && details.ip) {
      tabData.set(details.tabId, {
        ip: details.ip,
        hostname: new URL(details.url).hostname
      });
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === "complete" && tab?.url) {
    updateTabInfo(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, tab => {
    if (tab?.url) updateTabInfo(tabId, tab.url);
  });
});

chrome.tabs.onRemoved.addListener(tabId => tabData.delete(tabId));

// ==================== POPUP ====================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
