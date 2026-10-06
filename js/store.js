(function () {
  "use strict";
  var itunes = window.MARCA_ITUNES,
    cfg = window.MARCA_CONFIG || {};
  var psCards = [
    ["Playstation USA PSN 10 USD", 10, 500],
    ["PSN USA 25 USD", 25, 1250],
    ["PSN USA 50 USD", 50, 2500],
    ["PSN USA 75 USD", 75, 3750],
    ["PSN USA 100 USD", 100, 5000],
    ["PSN USA 150 USD", 150, 7500],
    ["PSN USA 200 USD", 200, 10000],
    ["PSN USA 250 USD", 250, 12500],
    ["Playstation USD Open Range", 25, 1250, 12500]
  ];
  var xboxLive = [
    ["XBOX USA 5 USD", 5, 250],
    ["Xbox USA 10 USD", 10, 500],
    ["Xbox USA 20 USD", 20, 1000],
    ["Xbox USA 25 USD", 25, 1250],
    ["Xbox USA 50 USD", 50, 2500],
    ["Xbox USA 100 USD", 100, 5000],
    ["Xbox Game Pass Essential 12M", 79.99, 4000],
    ["Xbox Game Pass Ultimate 1Month US", 22.99, 1150],
    ["Xbox Game Pass Ultimate 3Months US", 68.99, 3450],
    ["Xbox Game Pass Essential 1M", 9.99, 500],
    ["Xbox Game Pass Essential 3M", 24.99, 1250],
    ["Xbox Game Pass Essential 6M", 39.99, 2000],
    ["Xbox USA 15 USD", 15, 750],
    ["Xbox Live $60", 60, 3000],
    ["Xbox Live $70", 70, 3500],
    ["Xbox Live $75", 75, 3750],
    ["Xbox Live $80", 80, 4000]
  ];
  var xboxPass = [
    ["Xbox Game Pass Ultimate 1M", 22.99, 1150],
    ["Xbox Game Pass Ultimate 3M", 68.99, 3450],
    ["Xbox Game Pass Essential 1M", 9.99, 500],
    ["Xbox Game Pass Essential 3M", 24.99, 1250],
    ["Xbox Game Pass Essential 6M", 39.99, 2000],
    ["Xbox Game Pass Essential 12M", 79.99, 4000]
  ];
  function cards(a) {
    return a.map(function (x, i) {
      return { id: "gift-" + i, denomLabel: x[0], priceMru: x[2], priceMruMax: x[3] || 0 };
    });
  }
  var gifts =
    window.MARCA_GIFT_CARDS ||
    {
      playstation: {
        markets: [
          {
            id: "us",
            region: "United States",
            regionAr: "الولايات المتحدة",
            productName: "PlayStation USD United States",
            cards: cards(psCards)
          }
        ]
      },
      xbox: {
        markets: [
          {
            id: "us",
            region: "United States",
            regionAr: "الولايات المتحدة",
            productName: "Xbox Live / Game Pass USD United States",
            cards: cards(xboxLive)
          }
        ]
      }
    };

  if (!itunes || !itunes.markets) return;

  var products = [
    {
      id: "xbox",
      title: "Xbox",
      en: "Xbox Gift Card",
      short: "Xbox",
      image: "assets/products/xbox.png?v=31",
      alt: "شعار Xbox",
      data: gifts.xbox
    },
    {
      id: "playstation",
      title: "PlayStation",
      en: "PlayStation Gift Card",
      short: "PlayStation",
      image: "assets/products/playstation.png?v=31",
      alt: "شعار PlayStation",
      data: gifts.playstation
    },
    {
      id: "itunes",
      title: "Apple",
      en: "iTunes / Apple Gift Card",
      short: "Apple",
      image: "assets/products/itunes.png?v=31",
      alt: "شعار آيتونز / Apple",
      data: itunes
    }
  ].filter(function (p) {
    return p.data && p.data.markets;
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
    step("country");
    countries();
    sync();
    flow.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function brandTile(p, opts) {
    opts = opts || {};
    var b = document.createElement("button");
    b.type = "button";
    b.className = "brand-tile";
    b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "اختر " + (p.short || p.title) + " — " + p.en);
    var art = document.createElement("div");
    art.className = "brand-tile-art";
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.alt;
    img.width = 160;
    img.height = 160;
    img.loading = "lazy";
    img.decoding = "async";
    art.appendChild(img);
    b.appendChild(art);
    var name = document.createElement("span");
    name.className = "brand-tile-name";
    name.textContent = opts.label || p.short || p.title;
    b.appendChild(name);
    b.addEventListener("click", function () {
      open(p);
    });
    return b;
  }

  function card(p) {
    var b = document.createElement("button");
    b.type = "button";
    b.id = p.id + "-product-card";
    b.className = "product-card featured gift-product-card " + p.id + "-product-card";
    b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "اختر " + p.title + " — " + p.en);
    var i = document.createElement("div");
    i.className = "product-icon product-icon-img gift-product-logo";
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.alt;
    img.width = 160;
    img.height = 160;
    img.loading = "lazy";
    img.decoding = "async";
    i.appendChild(img);
    b.appendChild(i);
    var h = document.createElement("h3");
    h.className = "product-title";
    h.textContent = p.title;
    b.appendChild(h);
    var en = document.createElement("p");
    en.className = "product-name-en";
    en.textContent = p.en;
    b.appendChild(en);
    var c = document.createElement("span");
    c.className = "product-cta";
    c.textContent = "اختيار المنطقة";
    b.appendChild(c);
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
    img = document.createElement("img");
    img.src = "assets/products/snapchat-plus.png?v=31";
    img.alt = "Snapchat Plus";
    img.width = 160;
    img.height = 160;
    img.loading = "lazy";
    img.decoding = "async";
    icon.appendChild(img);
  }

  function snapPopularTile() {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "brand-tile";
    b.setAttribute("role", "listitem");
    b.setAttribute("aria-label", "اختر سناب شات بلس");
    var art = document.createElement("div");
    art.className = "brand-tile-art";
    var img = document.createElement("img");
    img.src = "assets/products/snapchat-plus.png?v=31";
    img.alt = "Snapchat Plus";
    img.width = 160;
    img.height = 160;
    img.loading = "lazy";
    img.decoding = "async";
    art.appendChild(img);
    b.appendChild(art);
    var name = document.createElement("span");
    name.className = "brand-tile-name";
    name.textContent = "Snapchat";
    b.appendChild(name);
    b.addEventListener("click", function () {
      var snap = grid && grid.querySelector('[data-product-id="snapchat-plus"]');
      if (snap) snap.click();
    });
    return b;
  }

  function renderPopular() {
    if (!popular) return;
    clear(popular);
    var order = ["xbox", "playstation", "itunes"];
    order.forEach(function (id) {
      var p = products.filter(function (x) {
        return x.id === id;
      })[0];
      if (p) popular.appendChild(brandTile(p));
    });
    popular.appendChild(snapPopularTile());
  }

  function render() {
    wireSnapchatLogo();
    products.forEach(function (p) {
      if (grid && !document.getElementById(p.id + "-product-card")) grid.appendChild(card(p));
    });
    renderPopular();
  }

  function countries() {
    if (!countryGrid || !state.product) return;
    clear(countryGrid);
    var q = search ? String(search.value || "").trim().toLowerCase() : "";
    state.product.data.markets.forEach(function (m) {
      if (q && (m.region + " " + m.regionAr + " " + m.productName).toLowerCase().indexOf(q) < 0) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "itunes-country-card";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", "اختيار " + m.regionAr + " — " + m.region);
      var ar = document.createElement("strong"),
        en = document.createElement("span");
      ar.textContent = m.regionAr;
      en.textContent = m.region;
      b.appendChild(ar);
      b.appendChild(en);
      b.addEventListener("click", function () {
        country(m);
      });
      countryGrid.appendChild(b);
    });
    if (!countryGrid.firstChild) {
      var e = document.createElement("p");
      e.className = "itunes-empty";
      e.textContent = "لا توجد منطقة مطابقة.";
      countryGrid.appendChild(e);
    }
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
      var e = document.createElement("p");
      e.className = "itunes-empty";
      e.textContent = "لا توجد فئات منشورة حالياً لهذه المنطقة.";
      denomGrid.appendChild(e);
      return;
    }
    state.market.cards.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "itunes-denom-card";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", c.denomLabel + " — " + price(c));
      var d = document.createElement("strong"),
        p = document.createElement("span");
      d.textContent = c.denomLabel;
      p.textContent = price(c);
      b.appendChild(d);
      b.appendChild(p);
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
      "• السعر: " + price(state.card),
      "• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) ✓"
    ];
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
    if (!grid) return;
    Array.prototype.forEach.call(grid.querySelectorAll(".product-card"), function (card) {
      if (!q) {
        card.hidden = false;
        return;
      }
      var t = (card.textContent || "").toLowerCase();
      card.hidden = t.indexOf(q) < 0;
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
        if (state.step === "country" && flow && !flow.hidden) countries();
        else filterHomeCards();
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
    var logo = document.getElementById("logo-home");
    if (logo)
      logo.addEventListener("click", function (e) {
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
