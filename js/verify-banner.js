/* After login: prompt to add / verify email (required for anon inbox, seller features, password change). */
(function () {
  "use strict";
  var KEY = "marca_seller_token";
  function tok() { try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; } }
  var shown = false, done = false;
  function check() {
    var t = tok();
    if (!t || shown || done) return;
    var api = String((window.MARCA_CONFIG || {}).AFFILIATE_API_BASE || "").replace(/\/+$/, "");
    if (!api) return;
    fetch(api + "/v1/me", { headers: { Authorization: "Bearer " + t }, credentials: "omit", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok) done = true;
        if (!d || !d.ok || !d.seller || d.seller.email_verified || shown) return;
        shown = true;
        var bar = document.createElement("div");
        bar.setAttribute("role", "status");
        bar.style.cssText = "position:sticky;top:0;z-index:999;background:#f5f3ff;border-bottom:1px solid rgba(80,65,210,.35);color:#1f1d3a;padding:.7rem 1rem;text-align:center;font-weight:600;line-height:1.6";
        var msg = document.createElement("span");
        msg.textContent = d.seller.email
          ? "أكّد بريدك الإلكتروني لتفعيل صندوق المجهول وميزات البائع وتغيير كلمة السر. "
          : "أضف بريدك الإلكتروني وأكّده لحماية حسابك وتفعيل جميع الميزات. ";
        var a = document.createElement("a");
        a.href = "account.html";
        a.textContent = d.seller.email ? "إعادة إرسال رابط التحقق" : "أضف بريدك الآن";
        a.style.cssText = "color:#5041D2;text-decoration:underline;margin-inline-start:.3rem";
        bar.appendChild(msg); bar.appendChild(a);
        document.body.insertBefore(bar, document.body.firstChild);
      })
      .catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check); else check();
  setInterval(check, 4000);
})();
