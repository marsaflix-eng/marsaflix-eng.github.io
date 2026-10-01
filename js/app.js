/**
 * Marça — Snapchat Plus gift store
 * Static SPA checkout → WhatsApp. No payment processing on-site.
 */
(function () {
  "use strict";

  var cfg = window.MARCA_CONFIG;
  if (!cfg) {
    console.error("MARCA_CONFIG missing");
    return;
  }

  /* ---------- State ---------- */
  var state = {
    step: 0, /* 0=plans, 1=username, 2=follow, 3=payment */
    product: null,
    username: "",
    followed: false,
    agreedPayment: false
  };

  /* Snapchat username: 3–15 chars, letters/numbers/._/hyphen; no @ */
  var USERNAME_RE = /^[A-Za-z0-9._-]{3,15}$/;

  /* ---------- DOM ---------- */
  var el = {
    progressWrap: document.getElementById("progress-wrap"),
    progressFill: document.getElementById("progress-fill"),
    progressSteps: document.querySelectorAll("[data-progress-step]"),
    panels: {
      0: document.getElementById("panel-plans"),
      1: document.getElementById("panel-username"),
      2: document.getElementById("panel-follow"),
      3: document.getElementById("panel-payment")
    },
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
    backButtons: document.querySelectorAll("[data-back]")
  };

  /* ---------- Helpers (security) ---------- */
  function escapeForDisplay(str) {
    /* textContent assignment is safe; this is extra defensive for any attr use */
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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
      return { ok: false, value: "", error: "يرجى إدخال اسم مستخدم سناب شات." };
    }
    /* Reject obvious XSS / control chars */
    if (/[<>"'`\\;\x00-\x1f\x7f]/.test(cleaned)) {
      return { ok: false, value: cleaned, error: "اسم المستخدم يحتوي على رموز غير مسموحة." };
    }
    if (!USERNAME_RE.test(cleaned)) {
      return {
        ok: false,
        value: cleaned,
        error: "اسم المستخدم غير صالح (3–15 حرفًا: حروف أو أرقام أو . _ -)."
      };
    }
    return { ok: true, value: cleaned, error: "" };
  }

  function formatPrice(n) {
    return String(n) + " " + cfg.CURRENCY + " (" + cfg.CURRENCY_CODE + ")";
  }

  function buildWhatsAppMessage() {
    var p = state.product;
    var lines = [
      "السلام عليكم،",
      "أريد طلب اشتراك سناب شات بلس من متجر " + cfg.STORE_NAME + ":",
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

  /* ---------- Progress UI ---------- */
  function updateProgress() {
    var step = state.step;
    if (step === 0) {
      el.progressWrap.classList.remove("visible");
      return;
    }
    el.progressWrap.classList.add("visible");
    /* steps 1–3 map to progress indices 0–2 (username, follow, payment) */
    var idx = step - 1;
    var pct = ((idx + 1) / 3) * 100;
    el.progressFill.style.width = pct + "%";

    el.progressSteps.forEach(function (node) {
      var i = parseInt(node.getAttribute("data-progress-step"), 10);
      node.classList.remove("active", "done");
      if (i < idx) node.classList.add("done");
      else if (i === idx) node.classList.add("active");
    });
  }

  function showPanel(step) {
    state.step = step;
    Object.keys(el.panels).forEach(function (k) {
      var panel = el.panels[k];
      if (!panel) return;
      if (parseInt(k, 10) === step) {
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
    if (!state.product) return;
    var label = state.product.nameAr + " — " + formatPrice(state.product.price);
    el.summaries.forEach(function (node) {
      var strong = node.querySelector("strong");
      if (strong) setText(strong, label);
      else setText(node, label);
    });
  }

  /* ---------- Render plans ---------- */
  function renderPlans() {
    var grid = el.plansGrid;
    if (!grid) return;
    /* Clear safely */
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    cfg.PRODUCTS.forEach(function (product) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plan-card" + (product.highlight ? " featured" : "");
      btn.setAttribute("data-product-id", product.id);
      btn.setAttribute("aria-label", "اختر باقة " + product.nameAr + " بسعر " + formatPrice(product.price));

      if (product.badge) {
        var badge = document.createElement("span");
        badge.className = "plan-badge";
        setText(badge, product.badge);
        btn.appendChild(badge);
      }

      var duration = document.createElement("div");
      duration.className = "plan-duration";
      setText(duration, product.nameAr);
      btn.appendChild(duration);

      var priceWrap = document.createElement("div");
      priceWrap.className = "plan-price";
      var priceVal = document.createElement("span");
      priceVal.className = "plan-price-value";
      setText(priceVal, String(product.price));
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
        selectProduct(product.id);
      });

      grid.appendChild(btn);
    });
  }

  function selectProduct(id) {
    var found = null;
    for (var i = 0; i < cfg.PRODUCTS.length; i++) {
      if (cfg.PRODUCTS[i].id === id) {
        found = cfg.PRODUCTS[i];
        break;
      }
    }
    if (!found) return;
    state.product = found;
    state.followed = false;
    state.agreedPayment = false;
    if (el.followCheck) el.followCheck.checked = false;
    if (el.paymentCheck) el.paymentCheck.checked = false;
    syncFollowNext();
    syncWhatsAppBtn();
    showPanel(1);
    if (el.usernameInput) {
      el.usernameInput.focus();
    }
  }

  /* ---------- Username step ---------- */
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
    /* Normalize input display without @ */
    el.usernameInput.value = result.value;
    el.usernameInput.classList.remove("invalid");
    setText(el.usernameError, "");
    showPanel(2);
  }

  /* ---------- Follow step ---------- */
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
    showPanel(3);
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
    var ready = !!(state.agreedPayment && state.product && state.username);
    setWhatsAppEnabled(ready);
  }

  function onWhatsAppClick(e) {
    if (!state.agreedPayment || !state.product || !state.username) {
      e.preventDefault();
      return;
    }
    /* Rebuild URL at click time so message is fresh & encoded */
    var url = buildWhatsAppUrl();
    el.btnWhatsApp.setAttribute("href", url);
    /* Allow default navigation to wa.me in new tab (target=_blank on element) */
  }

  /* ---------- Back ---------- */
  function goBack() {
    if (state.step <= 0) return;
    showPanel(state.step - 1);
  }

  /* ---------- Init ---------- */
  function init() {
    /* Snap follow URL from config */
    if (el.snapFollowLink) {
      el.snapFollowLink.setAttribute("href", cfg.SNAP_FOLLOW_URL);
      el.snapFollowLink.setAttribute("target", "_blank");
      el.snapFollowLink.setAttribute("rel", "noopener noreferrer");
    }

    renderPlans();
    showPanel(0);

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

    /* Logo click resets to plans */
    var logo = document.getElementById("logo-home");
    if (logo) {
      logo.addEventListener("click", function (e) {
        e.preventDefault();
        showPanel(0);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
