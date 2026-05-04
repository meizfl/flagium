// popup.js — Flagium

function toFlagEmoji(code) {
  if (!code || code.length !== 2) return "🌐";
  const o = 127397;
  const u = code.toUpperCase();
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
  if (details?.length) {
    detailEl.textContent = details.join("\n");
    detailEl.classList.remove("hidden");
  } else {
    detailEl.classList.add("hidden");
  }
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

async function loadInfo(forceRefresh = false) {
  showLoading();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) { showError("No active tab"); return; }

  let hostname;
  try {
    const u = new URL(tab.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      showError("Not an HTTP/HTTPS page");
      return;
    }
    hostname = u.hostname;
  } catch {
    showError("Invalid URL");
    return;
  }

  document.getElementById("footer-host").textContent = hostname;

  chrome.runtime.sendMessage({ type: "LOOKUP", hostname, forceRefresh }, (resp) => {
    if (chrome.runtime.lastError) {
      showError("Runtime error", [chrome.runtime.lastError.message]);
      return;
    }
    if (!resp?.ok) {
      showError(resp?.error || "Lookup failed", resp?.details);
      return;
    }
    showResult({ ...resp, hostname });
  });
}

document.querySelectorAll(".card-copy").forEach(btn => {
  btn.addEventListener("click", async () => {
    const val = document.getElementById(btn.dataset.copy)?.textContent?.trim();
    if (!val || val === "—") return;
    await navigator.clipboard.writeText(val);
    btn.textContent = "✓";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "⎘"; btn.classList.remove("copied"); }, 1500);
  });
});

document.getElementById("refresh-btn").addEventListener("click", () => loadInfo(true));
loadInfo();
