import { api } from "./api.js";

function setResults(html, type = "muted") {
  const results = document.getElementById("results");
  if (!results) return;

  // type: muted | success | danger | info
  results.innerHTML = `
    <div class="text-${type}">
      ${html}
    </div>
  `;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("trackForm");
  const input = document.getElementById("trackingNumber");

  if (!form || !input) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const code = input.value.trim();
    if (!code) {
      setResults("Please enter a tracking number.", "danger");
      return;
    }

    setResults("Checking shipment status...", "info");

    try {
      // ✅ TRY PATHS (pick the one your backend supports)
      // 1) GET /api/logistics/track/:code
      // 2) GET /api/logistics/track?code=...
      // 3) POST /api/logistics/track  { trackingCode }

      let data = null;
      let lastErr = null;

      const attempts = [
        () => api(`/api/logistics/track/${encodeURIComponent(code)}`, { method: "GET", auth: true }),
        () => api(`/api/logistics/track?code=${encodeURIComponent(code)}`, { method: "GET", auth: true }),
        () => api(`/api/logistics/track`, { method: "POST", auth: true, body: { trackingCode: code } }),
      ];

      for (const attempt of attempts) {
        try {
          data = await attempt();
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!data) throw lastErr || new Error("Unable to fetch tracking data.");

      // Try to normalize common response shapes
      const shipment = data.shipment || data.data || data;
      const status = shipment.status || shipment.currentStatus || "UNKNOWN";
      const location = shipment.location || shipment.currentLocation || "—";
      const eta = shipment.eta || shipment.estimatedDelivery || "—";
      const updatedAt = shipment.updatedAt || shipment.lastUpdated || "—";

      setResults(
        `
        <p><strong>Tracking Number:</strong> ${escapeHtml(code)}</p>
        <p><strong>Status:</strong> ${escapeHtml(status)}</p>
        <p><strong>Location:</strong> ${escapeHtml(location)}</p>
        <p><strong>ETA:</strong> ${escapeHtml(eta)}</p>
        <p class="small text-muted mb-0"><strong>Last Update:</strong> ${escapeHtml(updatedAt)}</p>
        `,
        "success"
      );
    } catch (err) {
      setResults(
        err?.message
          ? escapeHtml(err.message)
          : "Tracking failed. Please try again.",
        "danger"
      );
    }
  });
});
