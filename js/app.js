/**
 * Marça — storefront
 * Home product grid → product flows. Snapchat Plus keeps existing checkout → WhatsApp.
 * No payment processing on-site.
 */
(function () {
  "use strict";

  var cfg = window.MARCA_CONFIG;
  if (!cfg) {
    console.error("MARCA_CONFIG missing");
    return;
  }

  /* ---------- State ---------- */
  /* views: home | plans | username | follow | payment */
  var state = {
    view: "home",
    catalogProduct: null, /* product from PRODUCTS array */
    plan: null,           /* selected plan (nested) */
    username: "",
    followed: false,
    agreedPayment: false
  };

  var USERNAME_RE = /^[A-Za-z0-9._-]{3,15}$/;

  var VIEW_ORDER = ["home", "plans", "username", "follow", "payment"];

  /* ---------- DOM ---------- */
  var el = {
    progressWrap: document.getElementById("progress-wrap"),
    progressFill: document.getElementById("progress-fill"),
    progressSteps: document.querySelectorAll("[data-progress-step]"),
    panels: {
      home: document.getElementById("panel-home"),
      plans: document.getElementById("panel-plans"),
      username: document.getElementById("panel-username"),
      follow: document.getElementById("panel-follow"),
      payment: document.getElementById("panel-payment")
    },
    productGrid: document.getElementById("product-grid"),
    plansGrid: document.getElementById("plans-grid"),
    usernameInput: document.getElementById("snap-username"),
    usernameError: document.getElementById("username-error"),
    summaries: document.querySelectorAll("[data-selected-summary]"),
    followCheck: document.getElementById("check-followed"),
    paymentCheck: document.getElementById("check-payment"),
    snapFollowLink: document.getElementById("snap-follow-link"),
    btnUserNext: document.getElementById("btn-username-next"),
    btnFollowNext: document.getElementById("btn-follow-next"),
    btnWhatsApp: document.getElementById("btn-whatsapp"),
    backButtons: document.querySelectorAll("[data-back]"),
    homeButtons: document.querySelectorAll("[data-home]")
  };

  /* ---------- Helpers (security) ---------- */
  function setText(node, text) {
    if (node) node.textContent = text == null ? "" : String(text);
  }

  function stripAt(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (s.charAt(0) === "@") s = s.slice(1);
    return s.trim();
  }

  function validateUsername(raw) {
    var cleaned = stripAt(raw);
    if (!cleaned) {
      return { ok: false, value: "", error: "يرجى إدخال يوزر سنابشات (Snapchat username)." };
    }
    if (/[<>"'`\\;\x00-\x1f\x7f]/.test(cleaned)) {
      return { ok: false, value: cleaned, error: "اسم المستخدم يحتوي على رموز غير مسموحة." };
    }
    if (!USERNAME_RE.test(cleaned)) {
      return {
        ok: false,
        value: cleaned,
        error: "يوزر سنابشات غير صالح (3–15 حرفًا: حروف أو أرقام أو . _ -)."
      };
    }
    return { ok: true, value: cleaned, error: "" };
  }

  function formatPrice(n) {
    /* Latin digits only in UI */
    return String(n) + " " + cfg.CURRENCY + " (" + cfg.CURRENCY_CODE + ")";
  }

  function buildWhatsAppMessage() {
    var p = state.plan;
    var store = cfg.STORE_NAME || "Marça";
    var lines = [
      "السلام عليكم،",
      "أريد طلب اشتراك سناب شات بلس من متجر " + store + ":",
      "",
      "• الباقة: " + p.nameAr + " (" + p.nameEn + ")",
      "• السعر: " + formatPrice(p.price),
      "• اسم المستخدم على سناب: @" + state.username,
      "• تأكيد المتابعة: تابعت حسابكم ✓",
      "• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) — لا Gimtel ولا طرف ثالث ✓",
      "",
      "شكرًا لكم."
    ];
    return lines.join("\n");
  }

  function buildWhatsAppUrl() {
    var phone = String(cfg.WHATSAPP_E164).replace(/\D/g, "");
    var text = buildWhatsAppMessage();
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
  }

  function findProduct(id) {
    var list = cfg.PRODUCTS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function findPlan(product, planId) {
    if (!product || !product.plans) return null;
    for (var i = 0; i < product.plans.length; i++) {
      if (product.plans[i].id === planId) return product.plans[i];
    }
    return null;
  }

  /* ---------- Navigation ---------- */
  function updateProgress() {
    var checkoutViews = { username: 0, follow: 1, payment: 2 };
    if (!(state.view in checkoutViews)) {
      el.progressWrap.classList.remove("visible");
      return;
    }
    el.progressWrap.classList.add("visible");
    var idx = checkoutViews[state.view];
    var pct = ((idx + 1) / 3) * 100;
    el.progressFill.style.width = pct + "%";

    el.progressSteps.forEach(function (node) {
      var i = parseInt(node.getAttribute("data-progress-step"), 10);
      node.classList.remove("active", "done");
      if (i < idx) node.classList.add("done");
      else if (i === idx) node.classList.add("active");
    });
  }

  function showView(view) {
    state.view = view;
    Object.keys(el.panels).forEach(function (k) {
      var panel = el.panels[k];
      if (!panel) return;
      if (k === view) {
        panel.classList.add("active");
        panel.setAttribute("aria-hidden", "false");
      } else {
        panel.classList.remove("active");
        panel.setAttribute("aria-hidden", "true");
      }
    });
    updateProgress();
    updateSummaries();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateSummaries() {
    if (!state.plan) return;
    var label = state.plan.nameAr + " — " + formatPrice(state.plan.price);
    el.summaries.forEach(function (node) {
      var strong = node.querySelector("strong");
      if (strong) setText(strong, label);
      else setText(node, label);
    });
  }

  function goHome() {
    state.catalogProduct = null;
    state.plan = null;
    state.username = "";
    state.followed = false;
    state.agreedPayment = false;
    if (el.followCheck) el.followCheck.checked = false;
    if (el.paymentCheck) el.paymentCheck.checked = false;
    if (el.usernameInput) {
      el.usernameInput.value = "";
      el.usernameInput.classList.remove("invalid");
    }
    setText(el.usernameError, "");
    if (el.btnUserNext) el.btnUserNext.disabled = true;
    syncFollowNext();
    syncWhatsAppBtn();
    var anon = document.getElementById("panel-anon");
    if (anon) {
      anon.classList.remove("active");
      anon.setAttribute("aria-hidden", "true");
    }
    if (location.hash.indexOf("#anon") === 0 || location.hash.indexOf("#q/") === 0) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    showView("home");
  }

  /* ---------- Product grid (home) ---------- */
  function productIconSvg(kind) {
    var wrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wrap.setAttribute("viewBox", "0 0 48 48");
    wrap.setAttribute("class", "product-icon-svg");
    wrap.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (kind === "snap") {
      /* Abstract gift / spark — not Snapchat logo */
      path.setAttribute(
        "d",
        "M24 6l2.4 7.2H34l-6 4.4 2.3 7.2L24 20.4l-6.3 4.4 2.3-7.2-6-4.4h7.6L24 6zm0 20c6.6 0 12 3.6 12 8v4H12v-4c0-4.4 5.4-8 12-8z"
      );
    } else {
      path.setAttribute(
        "d",
        "M12 14h24v4H12v-4zm0 8h24v16H12V22zm4 4v8h4v-8h-4zm8 0v8h4v-8h-4z"
      );
    }
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
      card.setAttribute(
        "aria-label",
        "اختر " + product.nameAr + (product.nameEn ? " — " + product.nameEn : "")
      );

      if (product.badge) {
        var badge = document.createElement("span");
        badge.className = "product-badge";
        setText(badge, product.badge);
        card.appendChild(badge);
      }

      var iconWrap = document.createElement("div");
      iconWrap.className = "product-icon" + (product.image ? " product-icon-img" : "");
      if (product.image) {
        var img = document.createElement("img");
        img.src = product.image;
        img.alt = product.nameEn || product.nameAr || "";
        img.width = 112;
        img.height = 112;
        img.loading = "lazy";
        img.decoding = "async";
        iconWrap.appendChild(img);
      } else {
        iconWrap.appendChild(productIconSvg(product.icon || "default"));
      }
      card.appendChild(iconWrap);

      var title = document.createElement("h3");
      title.className = "product-title";
      setText(title, product.nameAr);
      card.appendChild(title);

      var en = document.createElement("p");
      en.className = "product-name-en";
      setText(en, product.nameEn);
      card.appendChild(en);

      if (product.plans && product.plans.length) {
        var from = product.plans[0].price;
        for (var i = 1; i < product.plans.length; i++) {
          if (product.plans[i].price < from) from = product.plans[i].price;
        }
        var priceHint = document.createElement("p");
        priceHint.className = "product-from";
        setText(priceHint, "من " + String(from) + " " + cfg.CURRENCY_CODE);
        card.appendChild(priceHint);
      }

      var cta = document.createElement("span");
      cta.className = "product-cta";
      setText(cta, "عرض الباقات");
      card.appendChild(cta);

      card.addEventListener("click", function () {
        openProduct(product.id);
      });

      grid.appendChild(card);
    });
  }

  function openProduct(id) {
    var product = findProduct(id);
    if (!product) return;
    state.catalogProduct = product;
    state.plan = null;
    state.followed = false;
    state.agreedPayment = false;
    if (el.followCheck) el.followCheck.checked = false;
    if (el.paymentCheck) el.paymentCheck.checked = false;
    syncFollowNext();
    syncWhatsAppBtn();

    if (product.flow === "snapchat-plus") {
      renderPlans(product);
      showView("plans");
    } else {
      /* Future flows: could open WhatsApp-simple etc. */
      renderPlans(product);
      showView("plans");
    }
  }

  /* ---------- Plans (Snapchat Plus) ---------- */
  function renderPlans(product) {
    var grid = el.plansGrid;
    if (!grid) return;
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    var plans = (product && product.plans) || [];
    plans.forEach(function (plan) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plan-card" + (plan.highlight ? " featured" : "");
      btn.setAttribute("data-plan-id", plan.id);
      btn.setAttribute(
        "aria-label",
        "اختر باقة " + plan.nameAr + " بسعر " + formatPrice(plan.price)
      );

      if (plan.badge) {
        var badge = document.createElement("span");
        badge.className = "plan-badge";
        setText(badge, plan.badge);
        btn.appendChild(badge);
      }

      var duration = document.createElement("div");
      duration.className = "plan-duration";
      setText(duration, plan.nameAr);
      btn.appendChild(duration);

      var priceWrap = document.createElement("div");
      priceWrap.className = "plan-price";
      var priceVal = document.createElement("span");
      priceVal.className = "plan-price-value";
      setText(priceVal, String(plan.price));
      var priceCur = document.createElement("span");
      priceCur.className = "plan-price-currency";
      setText(priceCur, cfg.CURRENCY + " · " + cfg.CURRENCY_CODE);
      priceWrap.appendChild(priceVal);
      priceWrap.appendChild(priceCur);
      btn.appendChild(priceWrap);

      var cta = document.createElement("span");
      cta.className = "plan-cta";
      setText(cta, "اختر هذه الباقة");
      btn.appendChild(cta);

      btn.addEventListener("click", function () {
        selectPlan(plan.id);
      });

      grid.appendChild(btn);
    });
  }

  function selectPlan(planId) {
    if (!state.catalogProduct) return;
    var found = findPlan(state.catalogProduct, planId);
    if (!found) return;
    state.plan = found;
    state.followed = false;
    state.agreedPayment = false;
    if (el.followCheck) el.followCheck.checked = false;
    if (el.paymentCheck) el.paymentCheck.checked = false;
    syncFollowNext();
    syncWhatsAppBtn();
    showView("username");
    if (el.usernameInput) el.usernameInput.focus();
  }

  /* ---------- Username ---------- */
  function onUsernameInput() {
    var raw = el.usernameInput.value;
    var result = validateUsername(raw);
    if (el.usernameInput.classList) {
      if (raw && !result.ok) el.usernameInput.classList.add("invalid");
      else el.usernameInput.classList.remove("invalid");
    }
    setText(el.usernameError, result.error || "");
    el.btnUserNext.disabled = !result.ok;
  }

  function goUsernameNext() {
    var result = validateUsername(el.usernameInput.value);
    if (!result.ok) {
      setText(el.usernameError, result.error);
      el.usernameInput.classList.add("invalid");
      el.usernameInput.focus();
      return;
    }
    state.username = result.value;
    el.usernameInput.value = result.value;
    el.usernameInput.classList.remove("invalid");
    setText(el.usernameError, "");
    showView("follow");
  }

  /* ---------- Follow ---------- */
  function syncFollowNext() {
    state.followed = !!(el.followCheck && el.followCheck.checked);
    if (el.btnFollowNext) el.btnFollowNext.disabled = !state.followed;
  }

  function goFollowNext() {
    if (!el.followCheck || !el.followCheck.checked) {
      syncFollowNext();
      return;
    }
    state.followed = true;
    showView("payment");
  }

  /* ---------- Payment / WhatsApp ---------- */
  function setWhatsAppEnabled(on) {
    if (!el.btnWhatsApp) return;
    if (on) {
      el.btnWhatsApp.classList.remove("is-disabled");
      el.btnWhatsApp.setAttribute("aria-disabled", "false");
      el.btnWhatsApp.setAttribute("href", buildWhatsAppUrl());
      el.btnWhatsApp.removeAttribute("tabindex");
    } else {
      el.btnWhatsApp.classList.add("is-disabled");
      el.btnWhatsApp.setAttribute("aria-disabled", "true");
      el.btnWhatsApp.removeAttribute("href");
      el.btnWhatsApp.setAttribute("tabindex", "-1");
    }
  }

  function syncWhatsAppBtn() {
    state.agreedPayment = !!(el.paymentCheck && el.paymentCheck.checked);
    var ready = !!(state.agreedPayment && state.plan && state.username);
    setWhatsAppEnabled(ready);
  }

  function onWhatsAppClick(e) {
    if (!state.agreedPayment || !state.plan || !state.username) {
      e.preventDefault();
      return;
    }
    var url = buildWhatsAppUrl();
    el.btnWhatsApp.setAttribute("href", url);
  }

  /* ---------- Back ---------- */
  function goBack() {
    var map = {
      plans: "home",
      username: "plans",
      follow: "username",
      payment: "follow"
    };
    var prev = map[state.view];
    if (!prev) return;
    if (prev === "home") goHome();
    else showView(prev);
  }

  /* ---------- Init ---------- */
  function init() {
    if (el.snapFollowLink) {
      el.snapFollowLink.setAttribute("href", cfg.SNAP_FOLLOW_URL);
      el.snapFollowLink.setAttribute("target", "_blank");
      el.snapFollowLink.setAttribute("rel", "noopener noreferrer");
    }

    renderProducts();
    showView("home");

    if (el.usernameInput) {
      el.usernameInput.addEventListener("input", onUsernameInput);
      el.usernameInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!el.btnUserNext.disabled) goUsernameNext();
        }
      });
    }

    if (el.btnUserNext) {
      el.btnUserNext.addEventListener("click", goUsernameNext);
      el.btnUserNext.disabled = true;
    }

    if (el.followCheck) {
      el.followCheck.addEventListener("change", syncFollowNext);
    }
    if (el.btnFollowNext) {
      el.btnFollowNext.addEventListener("click", goFollowNext);
      el.btnFollowNext.disabled = true;
    }

    if (el.paymentCheck) {
      el.paymentCheck.addEventListener("change", syncWhatsAppBtn);
    }
    if (el.btnWhatsApp) {
      el.btnWhatsApp.addEventListener("click", onWhatsAppClick);
      el.btnWhatsApp.setAttribute("target", "_blank");
      el.btnWhatsApp.setAttribute("rel", "noopener noreferrer");
      setWhatsAppEnabled(false);
    }

    el.backButtons.forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        goBack();
      });
    });

    el.homeButtons.forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        goHome();
      });
    });

    var logo = document.getElementById("logo-home");
    if (logo) {
      logo.addEventListener("click", function (e) {
        e.preventDefault();
        goHome();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
