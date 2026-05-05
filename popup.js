// popup.js — Flagium

function toFlagEmoji(code) {
  if (!code || code.length !== 2) return "🌐";
  const o = 127397, u = code.toUpperCase();
  return String.fromCodePoint(u.charCodeAt(0) + o, u.charCodeAt(1) + o);
}

function showLoading() {
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("error").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");
}

function showError(msg, details) {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("error").classList.remove("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("error-msg").textContent = msg || "Unknown error";
  const detailEl = document.getElementById("error-detail");
  if (details?.length) { detailEl.textContent = details.join("\n"); detailEl.classList.remove("hidden"); }
  else detailEl.classList.add("hidden");
}

function showResult(info) {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("error").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  document.getElementById("flag-emoji").textContent = toFlagEmoji(info.countryCode);
  const nameEl = document.getElementById("country-name");
  nameEl.childNodes[0].textContent = (info.country || "Unknown") + " ";
  document.getElementById("country-code").textContent = (info.countryCode || "??").toUpperCase();
  document.getElementById("city-name").textContent = info.city || "—";
  document.getElementById("ip-value").textContent = info.ip || "—";
  document.getElementById("org-value").textContent = info.org || "—";
  document.getElementById("host-value").textContent = info.hostname || "—";
  document.getElementById("footer-host").textContent = info.hostname || "—";
}

// Keep the port open while the popup is alive - additional protection against SW falling asleep
const _port = chrome.runtime.connect({ name: "popup-keepalive" });

// Ping SW every 5 seconds while the popup is open
const _pingInterval = setInterval(() => {
  chrome.runtime.sendMessage({ type: "PING" }, () => { void chrome.runtime.lastError; });
}, 5000);

window.addEventListener("unload", () => clearInterval(_pingInterval));

function sendWithRetry(msg, callback, retries = 3) {
  chrome.runtime.sendMessage(msg, (resp) => {
    if (chrome.runtime.lastError) {
      if (retries > 0) setTimeout(() => sendWithRetry(msg, callback, retries - 1), 300);
      else callback(null, chrome.runtime.lastError.message);
      return;
    }
    callback(resp, null);
  });
}

async function loadInfo(forceRefresh = false) {
  showLoading();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) { showError("No active tab"); return; }

  let hostname;
  try {
    const u = new URL(tab.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") { showError("Not an HTTP/HTTPS page"); return; }
    hostname = u.hostname;
  } catch { showError("Invalid URL"); return; }

  document.getElementById("footer-host").textContent = hostname;

  sendWithRetry({ type: "LOOKUP", hostname, forceRefresh }, (resp, err) => {
    if (err) { showError("Runtime error", [err]); return; }
    if (!resp?.ok) { showError(resp?.error || "Lookup failed", resp?.details); return; }
    showResult({ ...resp, hostname });
  });
}

document.querySelectorAll(".card-copy").forEach(btn => {
  btn.addEventListener("click", async () => {
    const val = document.getElementById(btn.dataset.copy)?.textContent?.trim();
    if (!val || val === "—") return;
    await navigator.clipboard.writeText(val);
    btn.textContent = "✓"; btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "⎘"; btn.classList.remove("copied"); }, 1500);
  });
});

document.getElementById("refresh-btn").addEventListener("click", () => loadInfo(true));
loadInfo();
