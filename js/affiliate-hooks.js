(function () {
  "use strict";
  function inject() {
    var btn = document.getElementById("btn-whatsapp");
    if (!btn || !window.MarcaAffiliate) return;
    btn.addEventListener(
      "click",
      function () {
        var ref = window.MarcaAffiliate.getRef && window.MarcaAffiliate.getRef();
        var href = btn.getAttribute("href") || "";
        if (ref && href.indexOf("wa.me") !== -1) {
          try {
            var u = new URL(href);
            var text = u.searchParams.get("text") || "";
            if (text && text.indexOf("REF:") === -1) {
              text = text.replace(/\n?شكرًا لكم\.?\s*$/, "") + "\n• REF:" + ref + "\n\nشكرًا لكم.";
              u.searchParams.set("text", text);
              btn.setAttribute("href", u.toString());
            }
          } catch (e) {}
        }
        if (window.MarcaAffiliate.trackOrder) {
          try {
            var t = new URL(btn.getAttribute("href") || href).searchParams.get("text") || "";
            var um = t.match(/@([A-Za-z0-9._-]{3,15})/);
            var snap = um ? um[1] : undefined;
            var plan = null, price = null;
            if (/1 year|سنة/.test(t)) { plan = "1y"; price = 490; }
            if (plan && price) {
              window.MarcaAffiliate.trackOrder({ plan: plan, price_mru: price, snap_user: snap });
            }
          } catch (e2) {}
        }
      },
      true
    );
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();
