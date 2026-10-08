/* Marça storefront: one product per brand → country → MRU denomination → Bankily/WhatsApp.
   Data: js/catalog.js (window.MARCA_CATALOG, generated from tokenstore.io) + js/products.js (MARCA_ITUNES). */
(function () {
  "use strict";
  var itunes = window.MARCA_ITUNES,
    cat = window.MARCA_CATALOG,
    cfg = window.MARCA_CONFIG || {};
  if (!cat || !cat.brands) return;

  var IMG_V = "?v=" + (cat.v || 1);
  function expandMarkets(ms) {
    return ms.map(function (m) {
      return {
        id: String(m[0]).toLowerCase(),
        region: m[1],
        regionAr: m[2],
        productName: m[3],
        cards: m[4].map(function (c, i) {
          return { id: m[0] + "-" + i, denomLabel: c[0], priceMru: c[1], priceMruMax: c[2] || 0, oos: !!c[3] };
        })
      };
    });
  }
  var products = cat.brands.map(function (b) {
    return {
      id: b[0],
      title: b[1],
      ar: b[2],
      en: b[3],
      short: b[1],
      cat: b[4],
      image: "assets/brands/" + b[0] + ".webp" + IMG_V,
      alt: "شعار " + b[1],
      data: { markets: expandMarkets(b[5]) }
    };
  });
  /* Apple keeps the reviewed iTunes market list (products.js); extra Tokenstore Apple markets are appended. */
  products.forEach(function (p) {
    if (p.id !== "apple" || !itunes || !itunes.markets) return;
    var have = {};
    itunes.markets.forEach(function (m) {
      have[String(m.id).toLowerCase()] = 1;
    });
    p.data = {
      markets: itunes.markets.concat(
        p.data.markets.filter(function (m) {
          return !have[m.id];
        })
      )
    };
  });
  var byId = {};
  products.forEach(function (p) {
    byId[p.id] = p;
  });

  var state = { product: null, market: null, card: null, step: "country" };
  var grid = document.getElementById("product-grid");
  var popular = document.getElementById("popular-grid");
  var search = document.getElementById("catalog-search");
  var flow = document.getElementById("itunes-block");
  var countryStep = document.getElementById("itunes-step-country");
  var denomStep = document.getElementById("itunes-step-denom");
  var paymentStep = document.getElementById("itunes-step-payment");
  var countryGrid = document.getElementById("itunes-country-grid");
  var denomGrid = document.getElementById("itunes-denom-grid");
  var selectedCountry = document.getElementById("itunes-selected-country");
  var selectedOrder = document.getElementById("itunes-selected-order");
  var check = document.getElementById("itunes-payment-check");
  var wa = document.getElementById("itunes-wa");
  var catHost = document.getElementById("catalog-sections");

  function digits(n) {
    var s = String(Math.round(Number(n))),
      o = "";
    for (var i = 0; i < s.length; i++) {
      if (i && (s.length - i) % 3 === 0) o += ",";
      o += s.charAt(i);
    }
    return o;
  }
  function price(c) {
    return c.priceMruMax
      ? digits(c.priceMru) + "–" + digits(c.priceMruMax) + " أوقية"
      : digits(c.priceMru) + " أوقية";
  }
  function clear(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
  }
  function title() {
    return state.product ? state.product.title : "البطاقة";
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function logo(p, size) {
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.alt;
    img.width = size || 160;
    img.height = size || 160;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    return img;
  }
  function step(s) {
    state.step = s;
    var x = { country: countryStep, denom: denomStep, payment: paymentStep };
    Object.keys(x).forEach(function (k) {
      if (x[k]) {
        x[k].hidden = k !== s;
        x[k].classList.toggle("is-active", k === s);
      }
    });
    var h = document.getElementById("itunes-flow-title"),
      sub = document.getElementById("itunes-flow-sub");
    if (h)
      h.textContent =
        s === "country" ? "اختر الدولة أو المنطقة" : s === "denom" ? "اختر الفئة" : "إكمال الطلب";
    if (sub)
      sub.textContent =
        s === "country"
          ? "اختر منطقة " + title() + "."
          : s === "denom"
            ? "الأسعار المعروضة بالأوقية فقط."
            : "راجع التفاصيل ووافق على الدفع عبر بنكيلي، ثم أرسل طلبك عبر واتساب.";
  }
  function home() {
    state.product = state.market = state.card = null;
    if (flow) flow.hidden = true;
    step("country");
    if (check) check.checked = false;
    sync();
  }
  function open(p) {
    if (!flow) return;
    state.product = p;
    state.market = state.card = null;
    flow.hidden = false;
    var k = flow.querySelector(".itunes-flow-head .cat-kicker");
    if (k) k.textContent = p.title + " / " + p.en;
    if (search) search.value = "";
    filterHomeCards();
    step("country");
    countries();
    sync();
    if (p.data.markets.length === 1) country(p.data.markets[0]);
    else flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function brandTile(p) {
    var b = el("button", "brand-tile");
    b.type = "button";
    b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "اختر " + p.title + " — " + p.en);
    var art = el("div", "brand-tile-art");
    art.appendChild(logo(p));
    b.appendChild(art);
    b.appendChild(el("span", "brand-tile-name", p.short || p.title));
    b.addEventListener("click", function () {
      open(p);
    });
    return b;
  }

  function card(p, withId) {
    var b = el("button", "product-card featured gift-product-card " + p.id + "-product-card");
    b.type = "button";
    if (withId) b.id = p.id + "-product-card";
    b.setAttribute("role", "listitem");
    b.setAttribute("data-brand", p.id);
    b.setAttribute("aria-label", "اختر " + p.title + " — " + p.en);
    var i = el("div", "product-icon product-icon-img gift-product-logo");
    i.appendChild(logo(p));
    b.appendChild(i);
    b.appendChild(el("h3", "product-title", p.title));
    b.appendChild(el("p", "product-name-en", p.ar && p.ar !== p.title ? p.ar : p.en));
    var n = p.data.markets.length;
    b.appendChild(el("span", "product-cta", n > 1 ? n + " دولة · اختيار المنطقة" : "اختيار الفئة"));
    b.setAttribute(
      "data-search",
      (p.title + " " + p.ar + " " + p.en + " " + p.data.markets.map(function (m) {
        return m.region + " " + m.regionAr;
      }).join(" ")).toLowerCase()
    );
    b.addEventListener("click", function () {
      open(p);
    });
    return b;
  }

  function wireSnapchatLogo() {
    if (!grid) return;
    var snap = grid.querySelector('[data-product-id="snapchat-plus"]');
    if (!snap) return;
    snap.classList.add("gift-product-card", "snapchat-plus-product-card");
    var img = snap.querySelector("img");
    if (img) {
      img.src = "assets/products/snapchat-plus.png?v=31";
      img.alt = "Snapchat Plus";
      return;
    }
    var icon = snap.querySelector(".product-icon");
    if (!icon) return;
    icon.textContent = "";
    icon.classList.add("product-icon-img", "gift-product-logo");
    icon.appendChild(logo({ image: "assets/products/snapchat-plus.png?v=31", alt: "Snapchat Plus" }));
  }

  function snapPopularTile() {
    var b = el("button", "brand-tile");
    b.type = "button";
    b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "اختر سناب شات بلس");
    var art = el("div", "brand-tile-art");
    art.appendChild(logo({ image: "assets/products/snapchat-plus.png?v=31", alt: "Snapchat Plus" }));
    b.appendChild(art);
    b.appendChild(el("span", "brand-tile-name", "Snapchat"));
    b.addEventListener("click", function () {
      var snap = grid && grid.querySelector('[data-product-id="snapchat-plus"]');
      if (snap) snap.click();
    });
    return b;
  }

  function renderPopular() {
    if (!popular) return;
    clear(popular);
    (cat.popular || []).forEach(function (id) {
      if (byId[id]) popular.appendChild(brandTile(byId[id]));
    });
    popular.appendChild(snapPopularTile());
  }

  var SHOW = 12;
  function renderSections() {
    if (!catHost) return;
    clear(catHost);
    (cat.cats || []).forEach(function (c) {
      var list = products.filter(function (p) {
        return p.cat === c[0];
      });
      if (!list.length) return;
      var sec = el("section", "ts-section ts-cat-section");
      sec.id = "cat-" + c[0];
      var head = el("div", "ts-section-head");
      var h = el("h2", null, c[1]);
      h.appendChild(el("span", "ts-count", " " + list.length));
      head.appendChild(h);
      var more = el("button", "all-link ts-more", "الكل ←");
      more.type = "button";
      head.appendChild(more);
      sec.appendChild(head);
      var g = el("div", "product-grid ts-cat-grid");
      g.setAttribute("role", "list");
      g.setAttribute("aria-label", c[1]);
      sec.appendChild(g);
      var shown = 0;
      function fill(n) {
        for (; shown < Math.min(n, list.length); shown++) g.appendChild(card(list[shown]));
        more.hidden = shown >= list.length;
        if (shown > SHOW) g.classList.add("is-all");
      }
      fill(SHOW);
      more.addEventListener("click", function () {
        fill(list.length);
      });
      sec._fillAll = function () {
        fill(list.length);
      };
      catHost.appendChild(sec);
    });
  }

  function render() {
    wireSnapchatLogo();
    (cat.featured || []).forEach(function (id) {
      var p = byId[id];
      if (p && grid && !grid.querySelector('[data-brand="' + id + '"]')) grid.appendChild(card(p, true));
    });
    renderPopular();
    renderSections();
  }

  function countries() {
    if (!countryGrid || !state.product) return;
    clear(countryGrid);
    state.product.data.markets.forEach(function (m) {
      var b = el("button", "itunes-country-card");
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", "اختيار " + m.regionAr + " — " + m.region);
      b.appendChild(el("strong", null, m.regionAr));
      b.appendChild(el("span", null, m.region + " · " + m.cards.length + " فئة"));
      b.addEventListener("click", function () {
        country(m);
      });
      countryGrid.appendChild(b);
    });
    if (!countryGrid.firstChild) countryGrid.appendChild(el("p", "itunes-empty", "لا توجد منطقة مطابقة."));
  }
  function country(m) {
    state.market = m;
    state.card = null;
    if (selectedCountry) selectedCountry.textContent = m.regionAr + " — " + m.region;
    denoms();
    step("denom");
    if (flow) flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function denoms() {
    if (!denomGrid || !state.market) return;
    clear(denomGrid);
    if (!state.market.cards || !state.market.cards.length) {
      denomGrid.appendChild(el("p", "itunes-empty", "لا توجد فئات منشورة حالياً لهذه المنطقة."));
      return;
    }
    state.market.cards.forEach(function (c) {
      var b = el("button", "itunes-denom-card" + (c.oos ? " is-oos" : ""));
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", c.denomLabel + " — " + price(c) + (c.oos ? " — نفدت مؤقتاً" : ""));
      b.appendChild(el("strong", null, c.denomLabel));
      b.appendChild(el("span", null, c.oos ? price(c) + " · نفدت مؤقتاً" : price(c)));
      if (c.oos) b.disabled = true;
      else
        b.addEventListener("click", function () {
          denom(c);
        });
      denomGrid.appendChild(b);
    });
  }
  function denom(c) {
    state.card = c;
    if (selectedOrder)
      selectedOrder.textContent =
        title() + " · " + state.market.regionAr + " · " + c.denomLabel + " · " + price(c);
    if (check) check.checked = false;
    sync();
    step("payment");
    if (flow) flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function url() {
    var phone = String(cfg.WHATSAPP_E164 || "22248650585").replace(/\D/g, "");
    var l = [
      "السلام عليكم،",
      "أريد طلب " + title() + " من متجر Marça:",
      "",
      "• المنتج: " + title() + " (" + state.product.en + ")",
      "• المنطقة: " + state.market.regionAr + " (" + state.market.region + ")",
      "• الفئة: " + state.card.denomLabel,
      "• السعر: " + price(state.card)
    ];
    if (state.card.priceMruMax) l.push("• المبلغ المطلوب: (اكتب المبلغ هنا)");
    l.push("• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) ✓");
    if (window.MarcaAffiliate && window.MarcaAffiliate.getRef())
      l.push("• REF:" + window.MarcaAffiliate.getRef());
    l.push("", "شكرًا لكم.");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(l.join("\n"));
  }
  function sync() {
    if (!wa) return;
    var ok = !!(check && check.checked && state.product && state.market && state.card);
    wa.classList.toggle("is-disabled", !ok);
    wa.setAttribute("aria-disabled", ok ? "false" : "true");
    if (ok) {
      wa.href = url();
      wa.removeAttribute("tabindex");
    } else {
      wa.removeAttribute("href");
      wa.setAttribute("tabindex", "-1");
    }
  }
  function filterHomeCards() {
    var q = search ? String(search.value || "").trim().toLowerCase() : "";
    if (q && catHost)
      Array.prototype.forEach.call(catHost.querySelectorAll(".ts-cat-section"), function (s) {
        if (s._fillAll) s._fillAll();
      });
    var scopes = [grid].concat(catHost ? Array.prototype.slice.call(catHost.querySelectorAll(".ts-cat-grid")) : []);
    scopes.forEach(function (g) {
      if (!g) return;
      var any = false;
      Array.prototype.forEach.call(g.querySelectorAll(".product-card"), function (c) {
        var t = (c.getAttribute("data-search") || c.textContent || "").toLowerCase();
        c.hidden = !!q && t.indexOf(q) < 0;
        if (!c.hidden) any = true;
      });
      var sec = g.closest ? g.closest(".ts-cat-section") : null;
      if (sec) sec.hidden = !!q && !any;
    });
  }
  function init() {
    function boot() {
      render();
      if (flow) flow.hidden = true;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(boot, 0);
      });
    } else {
      setTimeout(boot, 0);
    }
    if (search) {
      search.addEventListener("input", function () {
        if (flow && !flow.hidden && state.product) home();
        filterHomeCards();
      });
    }
    var bh = document.getElementById("itunes-back-home"),
      bc = document.getElementById("itunes-back-country"),
      bd = document.getElementById("itunes-back-denom"),
      bd2 = document.getElementById("itunes-back-denom-2");
    if (bh) bh.addEventListener("click", home);
    if (bc)
      bc.addEventListener("click", function () {
        step("country");
        countries();
      });
    if (bd)
      bd.addEventListener("click", function () {
        step("denom");
      });
    if (bd2)
      bd2.addEventListener("click", function () {
        step("denom");
      });
    if (check) check.addEventListener("change", sync);
    if (wa)
      wa.addEventListener("click", function (e) {
        if (wa.getAttribute("aria-disabled") === "true") e.preventDefault();
      });
    var lg = document.getElementById("logo-home");
    if (lg)
      lg.addEventListener("click", function (e) {
        e.preventDefault();
        home();
        if (window.MarcaApp && typeof window.MarcaApp.goHome === "function") window.MarcaApp.goHome();
        else {
          var homePanel = document.getElementById("panel-home");
          if (homePanel) {
            document.querySelectorAll(".panel").forEach(function (p) {
              p.classList.toggle("active", p === homePanel);
              p.setAttribute("aria-hidden", p === homePanel ? "false" : "true");
            });
          }
        }
      });
  }
  init();
})();
