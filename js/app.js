/**
 * Marça — storefront
 * Home product grid → product views. Snapchat Plus = help creating the customer's own Indian Apple ID (WhatsApp).
 * No payment processing on-site.
 */
(function () {
  "use strict";

  var cfg = window.MARCA_CONFIG;
  if (!cfg) {
    console.error("MARCA_CONFIG missing");
    return;
  }

  /* views: home | plans | snap */
  var state = { view: "home", catalogProduct: null };

  var el = {
    panels: {
      home: document.getElementById("panel-home"),
      plans: document.getElementById("panel-plans"),
      snap: document.getElementById("panel-snap")
    },
    productGrid: document.getElementById("product-grid"),
    plansGrid: document.getElementById("plans-grid"),
    backButtons: document.querySelectorAll("[data-back]"),
    homeButtons: document.querySelectorAll("[data-home]")
  };

  function setText(node, text) {
    if (node) node.textContent = text == null ? "" : String(text);
  }
  function findProduct(id) {
    var list = cfg.PRODUCTS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function showView(view) {
    state.view = view;
    Object.keys(el.panels).forEach(function (k) {
      var panel = el.panels[k];
      if (!panel) return;
      if (k === view) { panel.classList.add("active"); panel.setAttribute("aria-hidden", "false"); }
      else { panel.classList.remove("active"); panel.setAttribute("aria-hidden", "true"); }
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goHome() {
    state.catalogProduct = null;
    var anon = document.getElementById("panel-anon");
    if (anon) { anon.classList.remove("active"); anon.setAttribute("aria-hidden", "true"); }
    var h = location.hash;
    if (h.indexOf("#anon") === 0 || h.indexOf("#q/") === 0 || h === "#snap-help") history.replaceState(null, "", location.pathname + location.search);
    showView("home");
  }
  function productIconSvg() {
    var wrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wrap.setAttribute("viewBox", "0 0 48 48");
    wrap.setAttribute("class", "product-icon-svg");
    wrap.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M12 14h24v4H12v-4zm0 8h24v16H12V22zm4 4v8h4v-8h-4zm8 0v8h4v-8h-4z");
    path.setAttribute("fill", "currentColor");
    wrap.appendChild(path);
    return wrap;
  }
  function renderProducts() {
    var grid = el.productGrid;
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    (cfg.PRODUCTS || []).forEach(function (product) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "product-card" + (product.featured ? " featured" : "");
      card.setAttribute("data-product-id", product.id);
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", "اختر " + product.nameAr + (product.nameEn ? " — " + product.nameEn : ""));
      if (product.badge) { var badge = document.createElement("span"); badge.className = "product-badge"; setText(badge, product.badge); card.appendChild(badge); }
      var iconWrap = document.createElement("div");
      iconWrap.className = "product-icon" + (product.image ? " product-icon-img" : "");
      if (product.image) {
        var img = document.createElement("img");
        img.src = product.image; img.alt = product.nameEn || product.nameAr || ""; img.width = 112; img.height = 112; img.loading = "lazy"; img.decoding = "async";
        iconWrap.appendChild(img);
      } else iconWrap.appendChild(productIconSvg());
      card.appendChild(iconWrap);
      var title = document.createElement("h3"); title.className = "product-title"; setText(title, product.nameAr); card.appendChild(title);
      var en = document.createElement("p"); en.className = "product-name-en"; setText(en, product.nameEn); card.appendChild(en);
      if (product.priceLabel) { var hint = document.createElement("p"); hint.className = "product-from"; setText(hint, product.priceLabel); card.appendChild(hint); }
      var cta = document.createElement("span"); cta.className = "product-cta"; setText(cta, product.ctaLabel || "عرض الباقات"); card.appendChild(cta);
      card.addEventListener("click", function () { openProduct(product.id); });
      grid.appendChild(card);
    });
  }
  function openProduct(id) {
    var product = findProduct(id);
    if (!product) return;
    state.catalogProduct = product;
    if (product.flow === "snap-help") { showView("snap"); return; }
    var title = document.getElementById("plans-title");
    if (title) title.textContent = product.nameAr || "الباقات";
    if (product.flow === "snapchat-filters") renderFilterPlans(product);
    showView("plans");
    var sheet = document.getElementById("panel-plans");
    if (sheet) sheet.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function waLink(text) {
    var phone = String((cfg.WHATSAPP_E164 || "22248650585")).replace(/\D/g, "");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
  }
  function renderFilterPlans(product) {
    var grid = el.plansGrid;
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    (product.variants || []).forEach(function (v) {
      var btn = document.createElement("a");
      btn.className = "plan-card featured";
      btn.href = waLink("السلام عليكم\nطلب: " + v.nameAr + "\nالسعر: " + v.price + " أوقية\nالدفع عبر بنكيلي.");
      btn.target = "_blank";
      btn.rel = "noopener";
      btn.textContent = v.nameAr + " — " + v.price + " أوقية";
      grid.appendChild(btn);
    });
  }
  function openIndiaItunes(e) {
    if (!window.MarcaStore || typeof window.MarcaStore.openMarket !== "function") return;
    e.preventDefault();
    goHome();
    window.MarcaStore.openMarket("apple", "in");
  }
  function goBack() {
    if (state.view === "plans" || state.view === "snap") goHome();
  }
  function init() {
    renderProducts();
    showView("home");
    el.backButtons.forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); goBack(); }); });
    el.homeButtons.forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); goHome(); }); });
    var india = document.getElementById("snap-help-itunes");
    if (india) india.addEventListener("click", openIndiaItunes);
    var logo = document.getElementById("logo-home");
    if (logo) logo.addEventListener("click", function (e) { e.preventDefault(); goHome(); });
    if (location.hash === "#snap-help") openProduct("snapchat-plus");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

(function(){
  document.addEventListener("click", function(e){
    if (e.target && e.target.id === "plans-back") {
      var home = document.getElementById("panel-home");
      var plans = document.getElementById("panel-plans");
      if (home) { home.classList.add("active"); home.setAttribute("aria-hidden","false"); }
      if (plans) { plans.classList.remove("active"); plans.setAttribute("aria-hidden","true"); }
    }
  });
})();
