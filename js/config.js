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
  SNAP_FOLLOW_URL: "https://snapchat.com/t/7BEXzDEV",
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
      image: "assets/products/snapchat-plus.png?v=10",
      featured: true,
      flow: "snapchat-plus",
      plans: Object.freeze([
        Object.freeze({
          id: "3m",
          nameAr: "3 أشهر",
          nameEn: "3 months",
          durationMonths: 3,
          price: 170,
          badge: "الأكثر طلبًا",
          highlight: false
        }),
        Object.freeze({
          id: "6m",
          nameAr: "6 أشهر",
          nameEn: "6 months",
          durationMonths: 6,
          price: 330,
          badge: "قيمة ممتازة",
          highlight: true
        }),
        Object.freeze({
          id: "1y",
          nameAr: "سنة كاملة",
          nameEn: "1 year",
          durationMonths: 12,
          price: 630,
          badge: "أفضل عرض",
          highlight: false
        })
      ])
    })
  ])
});
