/**
 * Marça Store Configuration
 * PRODUCTS is category-ready: each product can nest plans / flow type.
 */
window.MARCA_CONFIG = Object.freeze({
  WHATSAPP_E164: "22248650585",
  SNAP_FOLLOW_URL: "https://snapchat.com/t/7BEXzDEV",
  DOMAIN: "marça.online",
  DOMAIN_PLACEHOLDER: "marça.online",
  STORE_NAME: "Marça",
  STORE_NAME_AR: "مرصة",
  CURRENCY: "أوقية",
  CURRENCY_CODE: "MRU",
  TAGLINE_AR: "بوتيك رقمي أنيق — هدايا واشتراكات رقمية",
  TAGLINE_EN: "Elegant digital boutique",
  PRODUCTS: Object.freeze([
    Object.freeze({
      id: "snapchat-plus",
      category: "subscriptions",
      categoryAr: "اشتراكات",
      nameAr: "سناب شات بلس",
      nameEn: "Snapchat Plus",
      shortAr: "هدية اشتراك سناب شات بلس بأسعار واضحة",
      shortEn: "Snapchat Plus gift subscriptions",
      badge: "متوفر الآن",
      featured: true,
      icon: "snap",
      flow: "snapchat-plus",
      plans: Object.freeze([
        Object.freeze({ id: "3m", nameAr: "3 أشهر", nameEn: "3 months", durationMonths: 3, price: 170, badge: "الأكثر طلبًا", highlight: false }),
        Object.freeze({ id: "6m", nameAr: "6 أشهر", nameEn: "6 months", durationMonths: 6, price: 330, badge: "قيمة ممتازة", highlight: true }),
        Object.freeze({ id: "1y", nameAr: "سنة كاملة", nameEn: "1 year", durationMonths: 12, price: 630, badge: "أفضل عرض", highlight: false })
      ])
    })
  ])
});
