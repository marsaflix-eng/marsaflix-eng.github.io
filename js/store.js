/**
 * Marça saved gift-card storefront flow.
 * One card per brand → country picker → MRU denomination → Bankily/WhatsApp handoff.
 * No payment processing on-site.
 */
(function () {
  "use strict";

  var itunes = window.MARCA_ITUNES;
  var gifts = window.MARCA_GIFT_CARDS || {};
  var cfg = window.MARCA_CONFIG || {};
  if (!itunes || !itunes.markets) return;

  var products = [
    { id: "itunes", title: "بطاقة آيتونز", en: "iTunes / Apple Gift Card", image: "assets/products/itunes.svg", alt: "شعار بطاقة آيتونز / iTunes", data: itunes, empty: "لا توجد منطقة مطابقة." },
    { id: "playstation", title: "بطاقة PlayStation", en: "PlayStation Gift Card", image: "assets/products/playstation.svg", alt: "شعار بطاقة PlayStation", data: gifts.playstation, empty: "لا توجد منطقة مطابقة." },
    { id: "xbox", title: "بطاقة Xbox", en: "Xbox Gift Card", image: "assets/products/xbox.svg", alt: "شعار بطاقة Xbox", data: gifts.xbox, empty: "لا توجد منطقة مطابقة." }
  ].filter(function (product) { return product.data && product.data.markets; });

  var state = { product: null, market: null, card: null, step: "country" };
  var productGrid = document.getElementById("product-grid");
  var search = document.getElementById("catalog-search");
  var flow = document.getElementById("itunes-block");
  var countryStep = document.getElementById("itunes-step-country");
  var denomStep = document.getElementById("itunes-step-denom");
  var paymentStep = document.getElementById("itunes-step-payment");
  var countryGrid = document.getElementById("itunes-country-grid");
  var denomGrid = document.getElementById("itunes-denom-grid");
  var selectedCountry = document.getElementById("itunes-selected-country");
  var selectedOrder = document.getElementById("itunes-selected-order");
  var paymentCheck = document.getElementById("itunes-payment-check");
  var waLink = document.getElementById("itunes-wa");

  function digits(n) {
    var s = String(Math.round(Number(n)));
    var out = "";
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ",";
      out += s.charAt(i);
    }
    return out;
  }

  function priceLabel(n) { return digits(n) + " أوقية (MRU)"; }
  function cardPriceLabel(card) {
    return card.priceMruMax ? digits(card.priceMru) + "–" + digits(card.priceMruMax) + " أوقية (MRU)" : priceLabel(card.priceMru);
  }
  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function currentTitle() { return state.product ? state.product.title : "البطاقة"; }

  function setStep(step) {
    state.step = step;
    var steps = { country: countryStep, denom: denomStep, payment: paymentStep };
    Object.keys(steps).forEach(function (key) {
      var node = steps[key];
      if (!node) return;
      var active = key === step;
      node.hidden = !active;
      node.classList.toggle("is-active", active);
    });
    var title = document.getElementById("itunes-flow-title");
    var sub = document.getElementById("itunes-flow-sub");
    if (title) title.textContent = step === "country" ? "اختر الدولة أو المنطقة" : step === "denom" ? "اختر الفئة" : "إكمال الطلب";
    if (sub) sub.textContent = step === "country" ? "اختر منطقة " + currentTitle() + "." : step === "denom" ? "الأسعار المعروضة بالأوقية الموريتانية (MRU) فقط." : "راجع التفاصيل ووافق على الدفع عبر بنكيلي، ثم أرسل طلبك عبر واتساب.";
  }

  function showHome() {
    state.product = null;
    state.market = null;
    state.card = null;
    if (flow) flow.hidden = true;
    setStep("country");
    if (paymentCheck) paymentCheck.checked = false;
    syncWhatsApp();
  }

  function showFlow(product) {
    if (!flow) return;
    state.product = product;
    state.market = null;
    state.card = null;
    flow.hidden = false;
    var kicker = flow.querySelector(".itunes-flow-head .cat-kicker");
    if (kicker) kicker.textContent = product.title + " / " + product.en;
    var backHome = document.getElementById("itunes-back-home");
    if (backHome) backHome.innerHTML = "<span aria-hidden=\"true\">→</span> كل المنتجات";
    setStep("country");
    renderCountries();
    syncWhatsApp();
    flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function makeProductCard(product) {
    var card = document.createElement("button");
    card.type = "button";
    card.id = product.id + "-product-card";
    card.className = "product-card featured gift-product-card " + product.id + "-product-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", "اختر " + product.title + " — " + product.en);

    var icon = document.createElement("div");
    icon.className = "product-icon product-icon-img gift-product-logo";
    var image = document.createElement("img");
    image.src = product.image;
    image.alt = product.alt;
    image.width = 112;
    image.height = 112;
    image.loading = "lazy";
    image.decoding = "async";
    icon.appendChild(image);
    card.appendChild(icon);

    var category = document.createElement("span");
    category.className = "product-category";
    category.textContent = "بطاقات رقمية";
    card.appendChild(category);

    var title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.title;
    card.appendChild(title);

    var en = document.createElement("p");
    en.className = "product-name-en";
    en.textContent = product.en;
    card.appendChild(en);

    var desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = "كل المناطق والفئات — السعر بالأوقية الموريتانية.";
    card.appendChild(desc);

    var cta = document.createElement("span");
    cta.className = "product-cta";
    cta.textContent = "اختيار المنطقة";
    card.appendChild(cta);
    card.addEventListener("click", function () { showFlow(product); });
    return card;
  }

  function renderProductCards() {
    if (!productGrid) return;
    products.forEach(function (product) {
      if (!document.getElementById(product.id + "-product-card")) productGrid.appendChild(makeProductCard(product));
    });
  }

  function renderCountries() {
    if (!countryGrid || !state.product) return;
    clear(countryGrid);
    var query = search ? String(search.value || "").trim().toLowerCase() : "";
    state.product.data.markets.forEach(function (market) {
      var blob = (market.region + " " + market.regionAr + " " + market.productName).toLowerCase();
      if (query && blob.indexOf(query) === -1) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "itunes-country-card";
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", "اختيار " + market.regionAr + " — " + market.region);
      var ar = document.createElement("strong");
      ar.textContent = market.regionAr;
      var en = document.createElement("span");
      en.textContent = market.region;
      button.appendChild(ar);
      button.appendChild(en);
      button.addEventListener("click", function () { chooseCountry(market); });
      countryGrid.appendChild(button);
    });
    if (!countryGrid.firstChild) {
      var empty = document.createElement("p");
      empty.className = "itunes-empty";
      empty.textContent = state.product.empty;
      countryGrid.appendChild(empty);
    }
  }

  function chooseCountry(market) {
    state.market = market;
    state.card = null;
    if (selectedCountry) selectedCountry.textContent = market.regionAr + " — " + market.region;
    renderDenominations();
    setStep("denom");
    if (flow) flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderDenominations() {
    if (!denomGrid || !state.market) return;
    clear(denomGrid);
    if (!state.market.cards || !state.market.cards.length) {
      var empty = document.createElement("p");
      empty.className = "itunes-empty";
      empty.textContent = "لا توجد فئات منشورة حالياً لهذه المنطقة على Tokenstore.";
      denomGrid.appendChild(empty);
      return;
    }
    state.market.cards.forEach(function (card) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "itunes-denom-card";
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", card.denomLabel + " — " + cardPriceLabel(card));
      var denom = document.createElement("strong");
      denom.textContent = card.denomLabel;
      var price = document.createElement("span");
      price.textContent = cardPriceLabel(card);
      button.appendChild(denom);
      button.appendChild(price);
      button.addEventListener("click", function () { chooseDenomination(card); });
      denomGrid.appendChild(button);
    });
  }

  function chooseDenomination(card) {
    if (!state.market || !state.product) return;
    state.card = card;
    if (selectedOrder) selectedOrder.textContent = state.product.title + " · " + state.market.regionAr + " · " + card.denomLabel + " · " + cardPriceLabel(card);
    if (paymentCheck) paymentCheck.checked = false;
    syncWhatsApp();
    setStep("payment");
    if (flow) flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function waUrl() {
    var phone = String(cfg.WHATSAPP_E164 || "22248650585").replace(/\D/g, "");
    var lines = [
      "السلام عليكم،",
      "أريد طلب " + currentTitle() + " من متجر Marça:",
      "",
      "• المنتج: " + currentTitle() + " (" + state.product.en + ")",
      "• المنطقة: " + state.market.regionAr + " (" + state.market.region + ")",
      "• الفئة: " + state.card.denomLabel,
      "• السعر: " + cardPriceLabel(state.card),
      "• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) ✓"
    ];
    if (window.MarcaAffiliate && window.MarcaAffiliate.getRef()) lines.push("• REF:" + window.MarcaAffiliate.getRef());
    lines.push("", "شكرًا لكم.");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function syncWhatsApp() {
    if (!waLink) return;
    var enabled = !!(paymentCheck && paymentCheck.checked && state.product && state.market && state.card);
    waLink.classList.toggle("is-disabled", !enabled);
    waLink.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (enabled) {
      waLink.href = waUrl();
      waLink.removeAttribute("tabindex");
    } else {
      waLink.removeAttribute("href");
      waLink.setAttribute("tabindex", "-1");
    }
  }

  function init() {
    renderProductCards();
    if (flow) flow.hidden = true;
    if (search) search.addEventListener("input", function () {
      if (state.step === "country" && flow && !flow.hidden) renderCountries();
    });
    var backHome = document.getElementById("itunes-back-home");
    var backCountry = document.getElementById("itunes-back-country");
    var backDenom = document.getElementById("itunes-back-denom");
    var backDenom2 = document.getElementById("itunes-back-denom-2");
    if (backHome) backHome.addEventListener("click", showHome);
    if (backCountry) backCountry.addEventListener("click", function () { setStep("country"); renderCountries(); });
    if (backDenom) backDenom.addEventListener("click", function () { setStep("denom"); });
    if (backDenom2) backDenom2.addEventListener("click", function () { setStep("denom"); });
    if (paymentCheck) paymentCheck.addEventListener("change", syncWhatsApp);
    if (waLink) waLink.addEventListener("click", function (event) {
      if (waLink.getAttribute("aria-disabled") === "true") event.preventDefault();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
