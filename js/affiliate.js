/**
 * Marça affiliate attribution — last-touch ref cookie + localStorage (30d).
 */
(function () {
  "use strict";
  var KEY = "marca_ref";
  var KEY_TS = "marca_ref_ts";
  var TTL_MS = 30 * 24 * 60 * 60 * 1000;
  var REF_RE = /^[A-Za-z0-9_-]{6,16}$/;
  function apiBase() {
    var c = window.MARCA_CONFIG || {};
    return (c.AFFILIATE_API_BASE || "").replace(/\/+$/, "");
  }
  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value, maxAgeSec) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = name + "=" + encodeURIComponent(value) + "; Path=/; Max-Age=" + maxAgeSec + "; SameSite=Lax" + secure;
  }
  function persistRef(ref) {
    if (!REF_RE.test(ref)) return;
    var ts = String(Date.now());
    try { localStorage.setItem(KEY, ref); localStorage.setItem(KEY_TS, ts); } catch (e) {}
    writeCookie(KEY, ref, Math.floor(TTL_MS / 1000));
  }
  function getStoredRef() {
    var ref = null, ts = 0;
    try { ref = localStorage.getItem(KEY); ts = parseInt(localStorage.getItem(KEY_TS) || "0", 10) || 0; } catch (e) {}
    if (!ref) { ref = readCookie(KEY); ts = Date.now(); }
    if (!ref || !REF_RE.test(ref)) return null;
    if (ts && Date.now() - ts > TTL_MS) {
      try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_TS); } catch (e2) {}
      writeCookie(KEY, "", 0);
      return null;
    }
    return ref;
  }
  function captureFromUrl() {
    try {
      var u = new URL(location.href);
      var ref = u.searchParams.get("ref");
      if (ref) persistRef(ref.trim());
      var plan = u.searchParams.get("plan");
      if (plan && /^(3m|6m|1y)$/.test(plan)) {
        try { sessionStorage.setItem("marca_plan_hint", plan); } catch (e) {}
      }
    } catch (e) {}
  }
  function getRef() { return getStoredRef(); }
  function trackOrder(payload) {
    var base = apiBase();
    if (!base) return Promise.resolve(null);
    var body = { ref: getRef() || undefined, plan: payload.plan, price_mru: payload.price_mru, snap_user: payload.snap_user || undefined, note: payload.note || undefined };
    return fetch(base + "/v1/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .catch(function () { return null; });
  }
  captureFromUrl();
  window.MarcaAffiliate = { getRef: getRef, persistRef: persistRef, trackOrder: trackOrder, apiBase: apiBase };
})();
