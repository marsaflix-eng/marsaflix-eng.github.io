/**
 * Marça Store Configuration
 * Edit these values without touching app logic.
 * PRODUCTS: each product should use its original brand logo as image.
 */
window.MARCA_CONFIG = Object.freeze({
  ANON_API_BASE: "https://marca-anon-inbox.marsaflix.workers.dev",
  /** Set after creating Turnstile widget in CF dashboard (Account → Turnstile). */
  TURNSTILE_SITE_KEY: "0x4AAAAAAFLc3TqbYVj4yBsZ",
  AFFILIATE_API_BASE: "https://marca-affiliate.marsaflix.workers.dev", // set after Cloudflare deploy, e.g. https://marca-anon-inbox.xxx.workers.dev
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
