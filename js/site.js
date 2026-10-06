
(function () {
  "use strict";
  var phone = "22248650585";
  var products = {
    plus: { title: "سناب شات بلس", items: [{ label: "سنة", price: "490 أوقية" }] },
    filters: { title: "فلاتر سناب شات", items: [{ label: "فلتر مناسبات", price: "50 أوقية" }, { label: "فلتر مؤثرات", price: "50 أوقية" }] },
    itunes: { title: "بطاقة آيتونز", items: [["2 USD","100 أوقية"],["5 USD","250 أوقية"],["10 USD","500 أوقية"],["25 USD","1250 أوقية"],["50 USD","2500 أوقية"],["100 USD","5000 أوقية"]].map(function (x) { return { label: x[0], price: x[1] }; }) },
    ps: { title: "بطاقة PlayStation", items: [["10 USD","500 أوقية"],["25 USD","1250 أوقية"],["50 USD","2500 أوقية"],["100 USD","5000 أوقية"]].map(function (x) { return { label: x[0], price: x[1] }; }) },
    xbox: { title: "بطاقة Xbox", items: [["5 USD","250 أوقية"],["10 USD","500 أوقية"],["25 USD","1250 أوقية"],["50 USD","2500 أوقية"]].map(function (x) { return { label: x[0], price: x[1] }; }) }
  };
  var sheet = document.getElementById("sheet");
  var title = document.getElementById("sheet-title");
  var opts = document.getElementById("opts");
  var extra = document.getElementById("extra");
  var order = document.getElementById("order");
  var chosen = null;
  function link(text) { return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text); }
  function render(id) {
    var p = products[id];
    chosen = p;
    title.textContent = p.title;
    opts.textContent = "";
    extra.hidden = id !== "filters";
    p.items.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.textContent = item.label + " — " + item.price;
      b.addEventListener("click", function () {
        var lines = ["السلام عليكم،", "طلب من متجر Marça:", "المنتج: " + p.title, "الفئة: " + item.label, "السعر: " + item.price, "الدفع فقط عبر بنكيلي."];
        if (id === "filters" && extra.value.trim()) lines.push("التفاصيل: " + extra.value.trim().slice(0, 400));
        order.href = link(lines.join("\n"));
        order.hidden = false;
      });
      opts.appendChild(b);
    });
    order.hidden = true;
    sheet.classList.add("open");
    sheet.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.querySelectorAll("[data-product]").forEach(function (btn) {
    btn.addEventListener("click", function () { render(btn.getAttribute("data-product")); });
  });
})();
