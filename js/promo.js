/* Sponsored promo row (referral links). Static content, no third-party requests. */
(function () {
  "use strict";
  if (document.getElementById("promo-row")) return;
  var anchor = document.querySelector(".ts-hero-row");
  if (!anchor || !anchor.parentNode) return;
  var css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "css/promo.css?v=1";
  document.head.appendChild(css);
  var NS = "http://www.w3.org/2000/svg";
  function svg(parts) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 48 48"); s.setAttribute("aria-hidden", "true");
    parts.forEach(function (p) {
      var e = document.createElementNS(NS, p[0]);
      Object.keys(p[1]).forEach(function (k) { e.setAttribute(k, p[1][k]); });
      s.appendChild(e);
    });
    return s;
  }
  var ADS = [
    {
      href: "https://www.hostinger.com/ae?REFERRALCODE=IFJSALEMSOAN",
      brand: "HOSTINGER",
      title: "أطلق موقعك اليوم",
      text: "استضافة سريعة ونطاق وبريد احترافي، بأسعار مناسبة مع خصم عبر رابطنا.",
      cta: "احصل على الخصم",
      logo: svg([
        ["path", { d: "M10 6l10 5v12l-10-5z", fill: "#673DE6" }],
        ["path", { d: "M28 11l10-5v16l-10 5z", fill: "#673DE6" }],
        ["path", { d: "M10 22l28 9v11l-10-5V31L20 28v14l-10-5z", fill: "#4A23B8" }]
      ])
    },
    {
      href: "https://url.hk/i/fr/tmv3a",
      brand: "RedotPay",
      title: "بطاقة دفع بالعملات الرقمية",
      text: "ادفع أونلاين وفي المتاجر وحوّل دولياً — بطاقة افتراضية أو فعلية ومتعددة العملات.",
      cta: "افتح حسابك",
      logo: svg([
        ["rect", { x: "5", y: "11", width: "38", height: "26", rx: "5", fill: "#1f1d3a" }],
        ["rect", { x: "10", y: "17", width: "9", height: "7", rx: "1.5", fill: "#f2c94c" }],
        ["circle", { cx: "34", cy: "29", r: "5", fill: "#E5322D" }]
      ])
    }
  ];
  var row = document.createElement("div");
  row.id = "promo-row"; row.className = "promo-row";
  row.setAttribute("aria-label", "إعلانات");
  ADS.forEach(function (ad) {
    var a = document.createElement("a");
    a.className = "promo-card"; a.href = ad.href; a.target = "_blank";
    a.rel = "sponsored noopener noreferrer";
    var label = document.createElement("span"); label.className = "promo-ad"; label.textContent = "إعلان";
    var logo = document.createElement("span"); logo.className = "promo-logo"; logo.appendChild(ad.logo);
    var body = document.createElement("span"); body.className = "promo-body";
    [["promo-brand", ad.brand], ["promo-title", ad.title], ["promo-text", ad.text], ["promo-cta", ad.cta + " ←"]].forEach(function (x) {
      var e = document.createElement("span"); e.className = x[0]; e.textContent = x[1]; body.appendChild(e);
    });
    a.appendChild(label); a.appendChild(logo); a.appendChild(body);
    row.appendChild(a);
  });
  anchor.parentNode.insertBefore(row, anchor.nextSibling);
})();
