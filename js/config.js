/**
 * Marça Store Configuration
 * Edit these values without touching app logic.
 * PRODUCTS: each product should use its original brand logo as image.
 */
window.MARCA_CONFIG = Object.freeze({
  ANON_API_BASE: "https://anon.xn--mara-2oa.online",
  /** Set after creating Turnstile widget in CF dashboard (Account → Turnstile). */
  TURNSTILE_SITE_KEY: "0x4AAAAAAFLc3TqbYVj4yBsZ",
  AFFILIATE_API_BASE: "https://api.xn--mara-2oa.online",
  WHATSAPP_E164: "22248650585",
  DOMAIN: "marça.online",
  DOMAIN_PLACEHOLDER: "marça.online",
  STORE_NAME: "Marça",
  STORE_NAME_AR: "مرصة",
  CURRENCY: "أوقية",
  CURRENCY_CODE: "MRU",
  PRODUCTS: Object.freeze([
    Object.freeze({
      id: "snapchat-plus",
      category: "subscriptions",
      categoryAr: "اشتراكات",
      nameAr: "سناب شات بلس",
      nameEn: "Snapchat Plus",
      image: "assets/products/snapchat-plus.png?v=31",
      featured: true,
      flow: "snap-help",
      /* Snapchat Plus: paid help creating the customer's own Indian Apple ID (old 3m/6m/1y plans removed). */
      helpPrice: 90,
      priceLabel: "مساعدة بـ 90 أوقية",
      ctaLabel: "التفاصيل"
    }),
    Object.freeze({
      id: "snapchat-filters",
      category: "filters",
      categoryAr: "فلاتر",
      nameAr: "إنشاء فلاتر سناب شات",
      nameEn: "Snapchat Filters",
      image: "assets/products/snapchat-filters.png?v=31",
      featured: false,
      flow: "snapchat-filters",
      price: 50,
      variants: Object.freeze([
        Object.freeze({ id: "occasion", nameAr: "فلتر مناسبات", price: 50 }),
        Object.freeze({ id: "effects", nameAr: "فلتر مؤثرات", price: 50 })
      ])

    })
  ])
});

/* API fallback: if the custom API host is unreachable (network error / CSP on older pages), retry once on workers.dev. */
(function () {
  "use strict";
  var MAP = {
    "https://api.xn--mara-2oa.online": "https://marca-affiliate.marsaflix.workers.dev",
    "https://anon.xn--mara-2oa.online": "https://marca-anon-inbox.marsaflix.workers.dev",
  };
  var orig = window.fetch;
  if (typeof orig !== "function") return;
  window.fetch = function (input, init) {
    var self = this;
    var url = typeof input === "string" ? input : null;
    return orig.call(self, input, init).catch(function (err) {
      if (url) {
        for (var k in MAP) {
          if (url.indexOf(k + "/") === 0) return orig.call(self, MAP[k] + url.slice(k.length), init);
        }
      }
      throw err;
    });
  };
})();
