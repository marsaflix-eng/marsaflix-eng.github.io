/* Extra catalog product: Virtual Visa Gift Card (USD), sold by Marça. Facts per SEAGM product page (Rewarble Virtual Visa Gift Card USD). */
(function () {
  "use strict";
  var cat = window.MARCA_CATALOG;
  if (!cat || !cat.brands) return;
  var ID = "visa-virtual";
  var faces = [10, 20, 25, 30, 50, 60, 100];
  if (!cat.brands.some(function (b) { return b[0] === ID; })) {
    cat.brands.unshift([ID, "Virtual Visa Gift Card", "بطاقة فيزا الافتراضية", "Rewarble Virtual Visa Gift Card USD", "shopping",
      [["US", "USD", "بالدولار الأمريكي", "Rewarble Virtual Visa Gift Card USD", faces.map(function (f) { return [f + " USD", Math.round(f * 50)]; })]]]);
    cat.popular = [ID].concat((cat.popular || []).filter(function (x) { return x !== ID; }));
    cat.featured = [ID].concat((cat.featured || []).filter(function (x) { return x !== ID; }));
  }
  var link = document.createElement("link");
  link.rel = "stylesheet"; link.href = "css/visa.css?v=1";
  document.head.appendChild(link);

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function a(href, text) { var x = el("a", null, text); x.href = href; x.target = "_blank"; x.rel = "noopener noreferrer"; return x; }
  function box(cls, title, kids) { var b = el("section", "vv-box " + (cls || "")); b.appendChild(el("h3", null, title)); kids.forEach(function (k) { b.appendChild(k); }); return b; }
  function list(tag, items) { var l = el(tag); items.forEach(function (it) { var li = el("li"); (Array.isArray(it) ? it : [it]).forEach(function (p) { li.appendChild(typeof p === "string" ? document.createTextNode(p) : p); }); l.appendChild(li); }); return l; }

  function detail() {
    var d = el("div", "vv-detail"); d.id = "vv-detail";
    d.appendChild(box("", "ما هي بطاقة فيزا الافتراضية؟", [
      el("p", null, "بطاقة هدايا رقمية من Rewarble بالدولار الأمريكي. بعد استلام الكود من Marça تستبدله على موقع Rewarble الرسمي فتحصل فوراً على كود بطاقة Visa افتراضية تستخدمها للدفع أونلاين: التسوق والاشتراكات والخدمات."),
      el("p", null, "إذا كانت قيمة البطاقة أكبر من المبلغ الذي استبدلته، يبقى الرصيد المتبقي على البطاقة لاستبدالات لاحقة حتى تنتهي صلاحيتها.")
    ]));
    d.appendChild(box("", "طريقة الاستخدام", [list("ol", [
      "اختر الفئة واطلبها من Marça (الدفع عبر بنكيلي ثم واتساب) — نرسل لك كود Rewarble.",
      ["افتح صفحة الاستبدال الرسمية: ", a("https://www.rewarble.com/redeem", "rewarble.com/redeem")],
      "أدخل الكود كما هو تماماً، بما في ذلك الشرطات.",
      "اختر Virtual Visa وأكّد، وأدخل بريدك الإلكتروني إن طُلب.",
      "يصلك كود بطاقة Visa الافتراضية فوراً — استخدمه للدفع أونلاين."
    ])]));
    d.appendChild(box("vv-tiktok", "اشحن عملات تيك توك بنفسك", [list("ol", [
      ["افتح صفحة الشحن الرسمية: ", a("https://www.tiktok.com/coin", "tiktok.com/coin")],
      "سجّل الدخول بحسابك أنت فقط.",
      "اختر عدد العملات أو مبلغاً مخصصاً.",
      "ادفع ببيانات بطاقة Visa الافتراضية (إن كانت طريقة الدفع بالبطاقة متاحة في بلدك).",
      "تظهر العملات في حسابك. لا تعطِ كلمة السر أو رموز التحقق لأي شخص — ولا حتى لنا."
    ])]));
    d.appendChild(box("vv-warn", "لماذا لا تشارك بيانات حسابك؟", [list("ul", [
      "سرقة الحساب: من يملك كلمة السر ورمز التحقق يستطيع تغييرهما وطردك من حسابك.",
      "خسارة العملات والمتابعين والمحتوى، وقد يصعب استرجاعها.",
      "الاحتيال: كثير من «الشحن الرخيص» عبر تسليم الحساب ينتهي بالسرقة أو الابتزاز.",
      "كشف خصوصيتك: رسائلك وبياناتك الشخصية تصبح بيد غريب.",
      "احتيال الدفع: قد تُستخدم وسيلة دفعك أو يُربط حسابك بعمليات مشبوهة.",
      "لا تشارك أبداً رموز OTP التي تصلك برسالة أو بريد، واشحن فقط من موقع tiktok.com الرسمي."
    ])]));
    d.appendChild(el("p", "vv-note", "Marça تبيع كود بطاقة Rewarble. قبول الدفع يعود للمتجر أو الموقع الذي تشتري منه، وقد لا تقبله بعض المواقع. Visa وTikTok وRewarble علامات تجارية لأصحابها."));
    return d;
  }
  function sync() {
    var flow = document.getElementById("itunes-block");
    if (!flow) return;
    var k = flow.querySelector(".itunes-flow-head .cat-kicker");
    var on = !flow.hidden && k && /Rewarble Virtual Visa/.test(k.textContent || "");
    var cur = document.getElementById("vv-detail");
    if (on && !cur) { var h = flow.querySelector(".itunes-flow-head"); h.parentNode.insertBefore(detail(), h.nextSibling); }
    else if (!on && cur) cur.parentNode.removeChild(cur);
  }
  function fixImgs(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('img[src*="brands/visa-virtual.webp"]'), function (i) { i.src = "assets/brands/visa-virtual.svg?v=1"; });
  }
  function start() {
    fixImgs();
    new MutationObserver(function () { fixImgs(); sync(); }).observe(document.getElementById("main") || document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"], characterData: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
