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
            if (/1 year|سنة/.test(t)) { plan = "1y"; price = 630; }
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

/* button-fix loader */
(function(){
  if (document.querySelector('script[data-button-fix]')) return;
  var s=document.createElement('script');
  s.src='js/button-fix.js?v=2';
  s.defer=true;
  s.setAttribute('data-button-fix','1');
  (document.body||document.documentElement).appendChild(s);
})();

/* Gift-card order tracking (catalog flow → #itunes-wa). Reads the prepared WhatsApp text; fire-and-forget. */
(function () {
  "use strict";
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function digits(s) { return String(s || "").replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }).replace(/[^\d.]/g, ""); }
  function line(t, label) { var m = t.match(new RegExp("• " + label + ": ([^\\n]+)")); return m ? m[1].trim() : ""; }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("#itunes-wa") : null;
    if (!a || a.getAttribute("aria-disabled") === "true" || !window.MarcaAffiliate || !window.MarcaAffiliate.trackOrder) return;
    if (a._tracked === a.getAttribute("href")) return;
    try {
      var t = new URL(a.getAttribute("href")).searchParams.get("text") || "";
      var prod = line(t, "المنتج"), reg = line(t, "المنطقة"), denom = line(t, "الفئة"), price = line(t, "السعر");
      var brand = prod.replace(/\s*\(.*\)\s*$/, "");
      var country = (reg.match(/\(([^)]+)\)\s*$/) || [])[1] || reg;
      var p = Number(digits(price.split(/[–-]/)[0]));
      if (brand && country && denom && p > 0) {
        a._tracked = a.getAttribute("href");
        window.MarcaAffiliate.trackOrder({ kind: "gift", brand: brand, country: country, denom: denom, price_mru: p });
      }
    } catch (err) {}
  }, true);
})();
