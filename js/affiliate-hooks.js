/* Snapchat Plus help (#snap-help-wa): append stored REF to the WhatsApp text and report product snap-help @ 90 MRU. */
(function () {
  "use strict";
  var BASE_TEXT = "السلام عليكم، أريد المساعدة في إنشاء Apple ID هندي للاشتراك في سناب شات بلس (الخدمة: 90 أوقية).";
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("#snap-help-wa") : null;
      if (!a) return;
      var cfg = window.MARCA_CONFIG || {};
      var phone = String(cfg.WHATSAPP_E164 || "22248650585").replace(/\D/g, "");
      var ref = window.MarcaAffiliate && window.MarcaAffiliate.getRef ? window.MarcaAffiliate.getRef() : null;
      var text = BASE_TEXT + (ref ? "\nREF:" + ref : "");
      a.setAttribute("href", "https://wa.me/" + phone + "?text=" + encodeURIComponent(text));
      if (window.MarcaAffiliate && window.MarcaAffiliate.trackOrder) {
        try { window.MarcaAffiliate.trackOrder({ product: "snap-help", price_mru: 90 }); } catch (e2) {}
      }
    },
    true
  );
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
