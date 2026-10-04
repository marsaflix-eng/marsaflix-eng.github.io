/**
 * Marça iTunes storefront flow.
 * One iTunes product card → country picker → denominations → WhatsApp payment handoff.
 * No payment processing on-site.
 */
(function () {
  "use strict";

  var data = window.MARCA_ITUNES;
  var cfg = window.MARCA_CONFIG || {};
  if (!data || !data.markets) return;

  var state = { market: null, card: null, step: "country" };
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

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

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
    if (sub) sub.textContent = step === "country" ? "اختر منطقة بطاقة آيتونز، ثم اختر الفئة المناسبة." : step === "denom" ? "اختر قيمة البطاقة — السعر بالأوقية الموريتانية فقط." : "راجع التفاصيل ووافق على الدفع عبر بنكيلي، ثم أرسل طلبك عبر واتساب.";
  }

  function showHome() {
    state.market = null;
    state.card = null;
    if (flow) flow.hidden = true;
    setStep("country");
    if (paymentCheck) paymentCheck.checked = false;
    syncWhatsApp();
  }

  function showFlow() {
    if (!flow) return;
    flow.hidden = false;
    setStep("country");
    renderCountries();
    flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function makeProductCard() {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "product-card featured itunes-product-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", "اختر بطاقة آيتونز — iTunes");

    var icon = document.createElement("div");
    icon.className = "product-icon product-icon-img itunes-product-logo";
    var image = document.createElement("img");
    image.src = "assets/products/itunes.svg";
    image.alt = "شعار بطاقة آيتونز / iTunes";
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
    title.textContent = "بطاقة آيتونز";
    card.appendChild(title);

    var en = document.createElement("p");
    en.className = "product-name-en";
    en.textContent = "iTunes / Apple Gift Card";
    card.appendChild(en);

    var desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = "كل المناطق والفئات — السعر بالأوقية الموريتانية.";
    card.appendChild(desc);

    var cta = document.createElement("span");
    cta.className = "product-cta";
    cta.textContent = "اختيار المنطقة";
    card.appendChild(cta);
    card.addEventListener("click", showFlow);
    return card;
  }

  function renderProductCard() {
    if (!productGrid || document.getElementById("itunes-product-card")) return;
    var card = makeProductCard();
    card.id = "itunes-product-card";
    productGrid.appendChild(card);
  }

  function renderCountries() {
    if (!countryGrid) return;
    clear(countryGrid);
    var query = search ? String(search.value || "").trim().toLowerCase() : "";
    data.markets.forEach(function (market) {
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
      empty.textContent = "لا توجد منطقة مطابقة.";
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
    state.market.cards.forEach(function (card) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "itunes-denom-card";
      button.setAttribute("role", "listitem");
      button.setAttribute("aria-label", card.denomLabel + " — " + priceLabel(card.priceMru));
      var denom = document.createElement("strong");
      denom.textContent = card.denomLabel;
      var price = document.createElement("span");
      price.textContent = priceLabel(card.priceMru);
      button.appendChild(denom);
      button.appendChild(price);
      button.addEventListener("click", function () { chooseDenomination(card); });
      denomGrid.appendChild(button);
    });
  }

  function chooseDenomination(card) {
    if (!state.market) return;
    state.card = card;
    if (selectedOrder) selectedOrder.textContent = state.market.regionAr + " · " + card.denomLabel + " · " + priceLabel(card.priceMru);
    if (paymentCheck) paymentCheck.checked = false;
    syncWhatsApp();
    setStep("payment");
    if (flow) flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function waUrl() {
    var phone = String(cfg.WHATSAPP_E164 || "22248650585").replace(/\D/g, "");
    var lines = [
      "السلام عليكم،",
      "أريد طلب بطاقة آيتونز / iTunes من متجر Marça:",
      "",
      "• المنتج: بطاقة آيتونز / iTunes",
      "• المنطقة: " + state.market.regionAr + " (" + state.market.region + ")",
      "• الفئة: " + state.card.denomLabel,
      "• السعر: " + priceLabel(state.card.priceMru),
      "• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) ✓"
    ];
    if (window.MarcaAffiliate && window.MarcaAffiliate.getRef()) lines.push("• REF:" + window.MarcaAffiliate.getRef());
    lines.push("", "شكرًا لكم.");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function syncWhatsApp() {
    if (!waLink) return;
    var enabled = !!(paymentCheck && paymentCheck.checked && state.market && state.card);
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
    renderProductCard();
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
