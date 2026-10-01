/**
 * رسالة من مجهول — NGL/Sendit style for site visitors.
 * Each visitor creates a personal link (name + WhatsApp) for their followers.
 * Static-safe: profile in URL hash, deliver via wa.me. XSS-safe: textContent only.
 */
(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var MAX_Q = 280;
  var MAX_A = 400;
  var MAX_NAME = 32;
  var STORE_KEY = "marca_anon_v2";
  var VIEWS = ["hub", "create", "mylink", "ask", "sent", "answer", "card"];
  var currentAsk = null;

  function $(id) { return document.getElementById(id); }
  function setText(n, t) { if (n) n.textContent = t == null ? "" : String(t); }
  function clean(s, max) {
    s = String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
  }
  function digitsPhone(s) {
    return String(s == null ? "" : s).replace(/\D/g, "").slice(0, 15);
  }
  function validPhone(p) {
    return /^[1-9]\d{7,14}$/.test(p);
  }
  function initial(name) {
    var t = clean(name, MAX_NAME);
    return t ? t.charAt(0).toUpperCase() : "?";
  }
  function b64urlEncode(obj) {
    var json = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function b64urlDecode(str) {
    try {
      var b64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveStore(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) {}
  }
  function profileLink(prof) {
    return location.origin + location.pathname.replace(/index\.html$/i, "") + "#q/" + b64urlEncode({
      v: 1, n: prof.n, w: prof.w
    });
  }
  function showAnon(view) {
    VIEWS.forEach(function (v) {
      var p = $("anon-" + v);
      if (!p) return;
      var on = v === view;
      p.classList.toggle("active", on);
      p.setAttribute("aria-hidden", on ? "false" : "true");
    });
    var wrap = $("panel-anon");
    if (wrap) {
      wrap.classList.add("active");
      wrap.setAttribute("aria-hidden", "false");
    }
    ["home", "plans", "username", "follow", "payment"].forEach(function (k) {
      var p = $("panel-" + k);
      if (!p) return;
      p.classList.remove("active");
      p.setAttribute("aria-hidden", "true");
    });
    var prog = $("progress-wrap");
    if (prog) prog.classList.remove("visible");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function hideAnon() {
    var wrap = $("panel-anon");
    if (wrap) {
      wrap.classList.remove("active");
      wrap.setAttribute("aria-hidden", "true");
    }
  }
  function fillMyLink(prof) {
    setText($("anon-my-name"), prof.n);
    setText($("anon-my-avatar"), initial(prof.n));
    var inp = $("anon-my-link-input");
    if (inp) inp.value = profileLink(prof);
    setText($("anon-mylink-status"), "");
  }
  function openAsk(prof) {
    currentAsk = prof;
    setText($("anon-ask-name"), prof.n);
    setText($("anon-ask-avatar"), initial(prof.n));
    var ta = $("anon-question");
    if (ta) ta.value = "";
    setText($("anon-ask-error"), "");
    showAnon("ask");
  }
  function renderCard(q, a, name) {
    setText($("anon-card-q"), q);
    setText($("anon-card-a"), a);
    setText($("anon-card-name"), name ? "رد " + name : "");
    setText($("anon-card-avatar"), initial(name || "?"));
    setText($("anon-card-brand"), "رسالة من مجهول · Marça");
  }
  function route() {
    var h = location.hash || "";
    var mq = h.match(/^#q\/([A-Za-z0-9_-]+)$/);
    if (mq) {
      var prof = b64urlDecode(mq[1]);
      if (prof && prof.n && validPhone(digitsPhone(prof.w))) {
        openAsk({ n: clean(prof.n, MAX_NAME), w: digitsPhone(prof.w) });
        return true;
      }
      showAnon("hub");
      return true;
    }
    var mc = h.match(/^#anon\/card\/([A-Za-z0-9_-]+)/);
    if (mc) {
      var data = b64urlDecode(mc[1]);
      if (data && data.q) {
        renderCard(data.q, data.a || "", data.n || "");
        var inp = $("anon-share-link");
        if (inp) inp.value = location.origin + location.pathname.replace(/index\.html$/i, "") + "#anon/card/" + mc[1];
        showAnon("card");
        return true;
      }
    }
    if (h === "#anon" || h === "#anon/") {
      showAnon("hub");
      return true;
    }
    if (h === "#anon/create") {
      showAnon("create");
      return true;
    }
    if (h === "#anon/me") {
      var st = loadStore();
      if (st.profile && st.profile.n && validPhone(st.profile.w)) {
        fillMyLink(st.profile);
        showAnon("mylink");
      } else {
        showAnon("create");
        location.hash = "#anon/create";
      }
      return true;
    }
    if (h === "#anon/reply") {
      showAnon("answer");
      return true;
    }
    if (h.indexOf("#anon") === 0) {
      showAnon("hub");
      return true;
    }
    return false;
  }
  function copyText(text, statusEl) {
    if (!text) return;
    function ok() { setText(statusEl, "تم النسخ"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () {
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        ok();
      });
    } else {
      ok();
    }
  }
  function bind() {
    var btnNav = $("btn-anon-nav");
    if (btnNav) btnNav.addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "#anon";
      showAnon("hub");
    });
    document.querySelectorAll("[data-anon-back]").forEach(function (b) {
      b.addEventListener("click", function () {
        location.hash = "#anon";
        showAnon("hub");
      });
    });
    var goCreate = $("anon-go-create");
    if (goCreate) goCreate.addEventListener("click", function () {
      location.hash = "#anon/create";
      showAnon("create");
    });
    var goMy = $("anon-go-my-link");
    if (goMy) goMy.addEventListener("click", function () {
      location.hash = "#anon/me";
      route();
    });
    var goAns = $("anon-go-answer");
    if (goAns) goAns.addEventListener("click", function () {
      location.hash = "#anon/reply";
      showAnon("answer");
    });
    var recreate = $("anon-recreate");
    if (recreate) recreate.addEventListener("click", function () {
      var st = loadStore();
      if (st.profile) {
        var n = $("anon-display-name");
        var w = $("anon-wa");
        if (n) n.value = st.profile.n || "";
        if (w) w.value = st.profile.w || "";
      }
      location.hash = "#anon/create";
      showAnon("create");
    });
    var createBtn = $("anon-create-btn");
    if (createBtn) createBtn.addEventListener("click", function () {
      var name = clean($("anon-display-name") && $("anon-display-name").value, MAX_NAME);
      var wa = digitsPhone($("anon-wa") && $("anon-wa").value);
      var err = $("anon-create-error");
      if (name.length < 2) {
        setText(err, "اكتب اسمًا واضحًا (حرفان على الأقل).");
        return;
      }
      if (!validPhone(wa)) {
        setText(err, "رقم واتساب غير صالح. استخدم الرقم الدولي بدون +.");
        return;
      }
      setText(err, "");
      var prof = { n: name, w: wa, t: Date.now() };
      var st = loadStore();
      st.profile = prof;
      saveStore(st);
      fillMyLink(prof);
      location.hash = "#anon/me";
      showAnon("mylink");
    });
    var copyMy = $("anon-copy-mylink");
    if (copyMy) copyMy.addEventListener("click", function () {
      var inp = $("anon-my-link-input");
      copyText(inp && inp.value, $("anon-mylink-status"));
    });
    var shareMy = $("anon-share-mylink");
    if (shareMy) shareMy.addEventListener("click", function () {
      var inp = $("anon-my-link-input");
      if (!inp || !inp.value) return;
      if (navigator.share) {
        navigator.share({
          title: "أرسل لي رسالة مجهولة",
          text: "أرسل لي رسالة مجهولة 👇",
          url: inp.value
        }).catch(function () {});
      } else {
        copyMy && copyMy.click();
      }
    });
    var preview = $("anon-preview-ask");
    if (preview) preview.addEventListener("click", function () {
      var st = loadStore();
      if (st.profile) {
        location.hash = "#q/" + b64urlEncode({ v: 1, n: st.profile.n, w: st.profile.w });
        openAsk(st.profile);
      }
    });
    var send = $("anon-send");
    if (send) send.addEventListener("click", function () {
      var q = clean($("anon-question") && $("anon-question").value, MAX_Q);
      var err = $("anon-ask-error");
      if (!currentAsk || !validPhone(currentAsk.w)) {
        setText(err, "الرابط غير صالح.");
        return;
      }
      if (!q || q.length < 2) {
        setText(err, "اكتب رسالة أوضح.");
        return;
      }
      var st = loadStore();
      var last = st.lastAskAt || 0;
      if (Date.now() - last < 8000) {
        setText(err, "انتظر لحظات قبل إرسال آخر.");
        return;
      }
      setText(err, "");
      var msg = "رسالة مجهولة عبر Marça لـ " + currentAsk.n + ":\n\n" + q;
      var url = "https://wa.me/" + currentAsk.w + "?text=" + encodeURIComponent(msg);
      st.lastAskAt = Date.now();
      saveStore(st);
      window.open(url, "_blank", "noopener,noreferrer");
      showAnon("sent");
    });
    var again = $("anon-sent-again");
    if (again) again.addEventListener("click", function () {
      if (currentAsk) openAsk(currentAsk);
    });
    var sentCreate = $("anon-sent-create");
    if (sentCreate) sentCreate.addEventListener("click", function () {
      location.hash = "#anon/create";
      showAnon("create");
    });
    var askOwn = $("anon-ask-make-own");
    if (askOwn) askOwn.addEventListener("click", function () {
      location.hash = "#anon/create";
      showAnon("create");
    });
    var make = $("anon-make-card");
    if (make) make.addEventListener("click", function () {
      var q = clean($("anon-q-in") && $("anon-q-in").value, MAX_Q);
      var a = clean($("anon-a-in") && $("anon-a-in").value, MAX_A);
      var err = $("anon-ans-error");
      if (!q || !a) {
        setText(err, "أكمل السؤال والجواب.");
        return;
      }
      setText(err, "");
      var st = loadStore();
      var name = (st.profile && st.profile.n) || cfg.STORE_NAME || "Marça";
      var payload = { q: q, a: a, n: name, t: Date.now() };
      var token = b64urlEncode(payload);
      var link = location.origin + location.pathname.replace(/index\.html$/i, "") + "#anon/card/" + token;
      var inp = $("anon-share-link");
      if (inp) inp.value = link;
      renderCard(q, a, name);
      showAnon("card");
      location.hash = "#anon/card/" + token;
      st.cards = st.cards || [];
      st.cards.unshift(payload);
      if (st.cards.length > 30) st.cards.length = 30;
      saveStore(st);
    });
    var copy = $("anon-copy-link");
    if (copy) copy.addEventListener("click", function () {
      var inp = $("anon-share-link");
      copyText(inp && inp.value, $("anon-copy-status"));
    });
    var share = $("anon-native-share");
    if (share) share.addEventListener("click", function () {
      var inp = $("anon-share-link");
      if (!inp || !inp.value) return;
      if (navigator.share) {
        navigator.share({ title: "رسالة من مجهول — Marça", url: inp.value }).catch(function () {});
      } else if (copy) copy.click();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    route();
    window.addEventListener("hashchange", function () {
      var h = location.hash || "";
      if (h.indexOf("#anon") === 0 || h.indexOf("#q/") === 0) route();
      else hideAnon();
    });
  });

  window.MarcaAnon = { show: showAnon, route: route };
})();
