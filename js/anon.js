/**
 * رسالة من مجهول — static-safe: ask via WhatsApp, share cards via URL hash.
 * XSS-safe: textContent only. No remote scripts.
 */
(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var MAX_Q = 280;
  var MAX_A = 400;
  var STORE_KEY = "marca_anon_v1";

  function $(id) { return document.getElementById(id); }
  function setText(n, t) { if (n) n.textContent = t == null ? "" : String(t); }
  function clean(s, max) {
    s = String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
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
  function phone() {
    return String(cfg.WHATSAPP_E164 || "").replace(/\D/g, "");
  }
  function showAnon(view) {
    ["hub", "ask", "answer", "card"].forEach(function (v) {
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
  function openAskFromHash() {
    var h = location.hash || "";
    var m = h.match(/^#anon\/card\/([A-Za-z0-9_-]+)/);
    if (m) {
      var data = b64urlDecode(m[1]);
      if (data && data.q) {
        renderCard(data.q, data.a || "", data.n || "مجهول");
        showAnon("card");
        return true;
      }
    }
    if (h === "#anon" || h.indexOf("#anon/ask") === 0) {
      showAnon("ask");
      return true;
    }
    return false;
  }
  function renderCard(q, a, name) {
    setText($("anon-card-q"), q);
    setText($("anon-card-a"), a);
    setText($("anon-card-name"), name ? "إلى " + name : "رسالة من مجهول");
  }
  function bind() {
    var btnNav = $("btn-anon-nav");
    if (btnNav) btnNav.addEventListener("click", function (e) {
      e.preventDefault();
      location.hash = "#anon";
      showAnon("hub");
    });
    document.querySelectorAll("[data-anon-back]").forEach(function (b) {
      b.addEventListener("click", function () { showAnon("hub"); location.hash = "#anon"; });
    });
    var goAsk = $("anon-go-ask");
    if (goAsk) goAsk.addEventListener("click", function () {
      location.hash = "#anon/ask";
      showAnon("ask");
    });
    var goAns = $("anon-go-answer");
    if (goAns) goAns.addEventListener("click", function () { showAnon("answer"); });

    var send = $("anon-send");
    if (send) send.addEventListener("click", function () {
      var q = clean($("anon-question") && $("anon-question").value, MAX_Q);
      var err = $("anon-ask-error");
      if (!q || q.length < 3) {
        setText(err, "اكتب سؤالاً واضحًا (3 أحرف على الأقل).");
        return;
      }
      setText(err, "");
      var msg = "رسالة من مجهول عبر Marça:\n\n" + q;
      var url = "https://wa.me/" + phone() + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener,noreferrer");
      var st = loadStore();
      st.lastAsk = Date.now();
      saveStore(st);
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
      var payload = { q: q, a: a, n: cfg.STORE_NAME || "Marça", t: Date.now() };
      var token = b64urlEncode(payload);
      var link = location.origin + location.pathname + "#anon/card/" + token;
      var inp = $("anon-share-link");
      if (inp) inp.value = link;
      renderCard(q, a, payload.n);
      showAnon("card");
      location.hash = "#anon/card/" + token;
      var st = loadStore();
      st.cards = st.cards || [];
      st.cards.unshift(payload);
      if (st.cards.length > 30) st.cards.length = 30;
      saveStore(st);
    });

    var copy = $("anon-copy-link");
    if (copy) copy.addEventListener("click", function () {
      var inp = $("anon-share-link");
      if (!inp || !inp.value) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inp.value);
        setText($("anon-copy-status"), "تم النسخ");
      } else {
        inp.select();
        document.execCommand("copy");
        setText($("anon-copy-status"), "تم النسخ");
      }
    });

    var share = $("anon-native-share");
    if (share) share.addEventListener("click", function () {
      var inp = $("anon-share-link");
      if (!inp || !inp.value) return;
      if (navigator.share) {
        navigator.share({ title: "رسالة من مجهول — Marça", url: inp.value }).catch(function () {});
      } else {
        copy && copy.click();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    if (!openAskFromHash()) {
      /* stay on store home */
    }
    window.addEventListener("hashchange", function () {
      if ((location.hash || "").indexOf("#anon") === 0) openAskFromHash() || showAnon("hub");
      else hideAnon();
    });
  });

  window.MarcaAnon = { show: showAnon, openAskFromHash: openAskFromHash };
})();
