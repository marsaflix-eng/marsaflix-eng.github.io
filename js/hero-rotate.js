(function () {
  "use strict";
  var cards = [
    {
      title: "رسالة من مجهول",
      text: "رابط تشاركه في ستوريتك. يصلك السؤال بلا اسم، وترد عليه بصورة أنيقة.",
      action: "anon",
      label: "ادخل"
    },
    {
      title: "البيع كطرف ثالث",
      text: "أنشئ رابطك، شاركه، وتابع عمولتك عند اكتمال الطلب.",
      action: "seller",
      label: "ادخل"
    }
  ];
  var i = 0;
  var logo = document.querySelector(".hero-logo");
  var card = document.getElementById("hero-card");
  if (!logo || !card) return;
  function show(item) {
    card.hidden = false;
    card.textContent = "";
    var h = document.createElement("h2");
    h.textContent = item.title;
    var p = document.createElement("p");
    p.textContent = item.text;
    var btn = document.createElement(item.action === "seller" ? "a" : "button");
    btn.className = "btn btn-primary";
    btn.textContent = item.label;
    if (item.action === "seller") btn.href = "seller.html";
    else {
      btn.type = "button";
      btn.setAttribute("data-action", "open-anon");
      btn.addEventListener("click", function () {
        if (window.openAnon) window.openAnon();
      });
    }
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(btn);
    logo.classList.add("is-shifted");
    card.classList.add("is-in");
  }
  function hideLogo() {
    logo.classList.remove("is-shifted");
    card.classList.remove("is-in");
  }
  function tick() {
    show(cards[i % cards.length]);
    i += 1;
  }
  setTimeout(tick, 1600);
  setInterval(tick, 5200);
})();
