/**
 * iTunes / Apple gift-card grid. Snapchat Plus stays in app.js.
 * Prices: Latin digits + أوقية. No dollar prices.
 */
(function () {
  "use strict";

  var data = window.MARCA_ITUNES;
  var cfg = window.MARCA_CONFIG || {};
  if (!data || !data.markets) return;

  var region = "all";
  var query = "";
  var selected = null;

  var grid = document.getElementById("sku-grid");
  var filters = document.getElementById("region-filters");
  var search = document.getElementById("catalog-search");
  var countEl = document.getElementById("sku-count");
  var modal = document.getElementById("card-modal");
  var NS = "http://www.w3.org/2000/svg";

  function digits(n) {
    var s = String(Math.round(Number(n)));
    var out = "";
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 === 0) out += ",";
      out += s.charAt(i);
    }
    return out;
  }

  function priceLabel(n) {
    return digits(n) + " أوقية";
  }

  function tone(id) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 6;
    return "tone-" + h;
  }

  function cardArt(code) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 240 140");
    svg.setAttribute("class", "sku-svg");
    svg.setAttribute("aria-hidden", "true");
    var body = document.createElementNS(NS, "rect");
    body.setAttribute("x", "16");
    body.setAttribute("y", "18");
    body.setAttribute("width", "208");
    body.setAttribute("height", "104");
    body.setAttribute("rx", "16");
    body.setAttribute("fill", "rgba(255,255,255,0.12)");
    body.setAttribute("stroke", "rgba(255,255,255,0.55)");
    svg.appendChild(body);
    var apple = document.createElementNS(NS, "path");
    apple.setAttribute("fill", "#fff");
    apple.setAttribute("d", "M118 46c2-6 8-9 8-9s-1 6-4 9c4 1 8 5 8 11 0 8-6 16-14 16s-14-7-14-15c0-7 5-12 10-13-1-2 1-6 6-9 0 0 2 6 0 10z");
    svg.appendChild(apple);
    var t = document.createElementNS(NS, "text");
    t.setAttribute("x", "120");
    t.setAttribute("y", "104");
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#fff");
    t.setAttribute("font-size", "16");
    t.setAttribute("font-family", "Red Hat Display, Segoe UI, sans-serif");
    t.setAttribute("font-weight", "700");
    t.textContent = code;
    svg.appendChild(t);
    return svg;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function matches(market, card) {
    if (region !== "all" && market.id !== region) return false;
    if (!query) return true;
    var blob = (market.region + " " + market.regionAr + " " + market.productName + " " + card.denomLabel + " " + card.id).toLowerCase();
    return blob.indexOf(query) !== -1;
  }

  function renderFilters() {
    if (!filters) return;
    clear(filters);
    var all = document.createElement("button");
    all.type = "button";
    all.textContent = "كل المناطق";
    if (region === "all") all.className = "is-on";
    all.addEventListener("click", function () { region = "all"; render(); });
    filters.appendChild(all);
    data.markets.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = m.regionAr;
      if (region === m.id) b.className = "is-on";
      b.addEventListener("click", function () { region = m.id; render(); });
      filters.appendChild(b);
    });
  }

  function renderGrid() {
    if (!grid) return;
    clear(grid);
    var n = 0;
    data.markets.forEach(function (m) {
      m.cards.forEach(function (card) {
        if (!matches(m, card)) return;
        n += 1;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sku-card " + tone(m.id);
        btn.setAttribute("aria-label", m.productName + " " + card.denomLabel + " " + priceLabel(card.priceMru));
        var art = document.createElement("div");
        art.className = "sku-art";
        art.appendChild(cardArt(m.id.toUpperCase()));
        btn.appendChild(art);
        var name = document.createElement("div");
        name.className = "sku-name";
        name.textContent = m.productName;
        var denom = document.createElement("div");
        denom.className = "sku-denom";
        denom.textContent = m.regionAr + " · " + card.denomLabel;
        var price = document.createElement("div");
        price.className = "sku-price";
        price.textContent = priceLabel(card.priceMru);
        btn.appendChild(name);
        btn.appendChild(denom);
        btn.appendChild(price);
        btn.addEventListener("click", function () { openCard(m, card); });
        grid.appendChild(btn);
      });
    });
    if (!n) {
      var empty = document.createElement("p");
      empty.className = "sku-empty";
      empty.textContent = "لا توجد بطاقات مطابقة.";
      grid.appendChild(empty);
    }
    if (countEl) countEl.textContent = digits(n) + " بطاقة";
  }

  function render() {
    renderFilters();
    renderGrid();
  }

  function waUrl(m, card) {
    var phone = String(cfg.WHATSAPP_E164 || "22248650585").replace(/\D/g, "");
    var lines = [
      "السلام عليكم،",
      "أريد طلب بطاقة آيتونز / آبل من متجر Marça:",
      "",
      "• المنتج: " + m.productName,
      "• المنطقة: " + m.regionAr,
      "• الفئة: " + card.denomLabel,
      "• السعر: " + priceLabel(card.priceMru),
      "• تأكيد الدفع: أوافق على الدفع فقط عبر بنكيلي (Bankily) — لا Gimtel ولا طرف ثالث ✓"
    ];
    if (window.MarcaAffiliate && window.MarcaAffiliate.getRef()) {
      lines.push("• REF:" + window.MarcaAffiliate.getRef());
    }
    lines.push("");
    lines.push("شكرًا لكم.");
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(lines.join("\n"));
  }

  function openCard(m, card) {
    selected = { m: m, card: card };
    var title = document.getElementById("card-modal-title");
    var sub = document.getElementById("card-modal-sub");
    var price = document.getElementById("card-modal-price");
    var agree = document.getElementById("card-agree");
    var link = document.getElementById("card-wa");
    if (title) title.textContent = m.productName;
    if (sub) sub.textContent = m.regionAr + " · " + card.denomLabel;
    if (price) price.textContent = priceLabel(card.priceMru);
    if (agree) agree.checked = false;
    if (link) {
      link.setAttribute("aria-disabled", "true");
      link.removeAttribute("href");
    }
    if (modal) modal.hidden = false;
  }

  function closeCard() {
    if (modal) modal.hidden = true;
    selected = null;
  }

  function syncLink() {
    var agree = document.getElementById("card-agree");
    var link = document.getElementById("card-wa");
    if (!link || !selected) return;
    if (agree && agree.checked) {
      link.href = waUrl(selected.m, selected.card);
      link.setAttribute("aria-disabled", "false");
    } else {
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
    }
  }

  function init() {
    render();
    if (search) {
      search.addEventListener("input", function () {
        query = String(search.value || "").trim().toLowerCase();
        renderGrid();
      });
    }
    var agree = document.getElementById("card-agree");
    if (agree) agree.addEventListener("change", syncLink);
    var closer = document.querySelectorAll("[data-close-card]");
    for (var i = 0; i < closer.length; i++) {
      closer[i].addEventListener("click", closeCard);
    }
    var link = document.getElementById("card-wa");
    if (link) {
      link.addEventListener("click", function (e) {
        if (link.getAttribute("aria-disabled") === "true" || !link.getAttribute("href")) {
          e.preventDefault();
        }
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCard();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
