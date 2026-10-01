/**
 * رسالة من مجهول — true anonymous inbox via Cloudflare Worker API.
 * XSS-safe: textContent only. No WhatsApp for asks (identity leak).
 */
(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var MAX_Q = 280;
  var MAX_A = 400;
  var MAX_NAME = 32;
  var STORE_KEY = "marca_anon_v3";
  var VIEWS = ["hub", "create", "mylink", "inbox", "ask", "sent", "answer", "card"];
  var currentAsk = null;
  var answeringMsgId = null;

  function $(id) { return document.getElementById(id); }
  function setText(n, t) { if (n) n.textContent = t == null ? "" : String(t); }
  function clean(s, max) {
    s = String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
    if (s.length > max) s = s.slice(0, max);
    return s;
  }
  function initial(name) {
    var t = clean(name, MAX_NAME);
    return t ? t.charAt(0).toUpperCase() : "?";
  }
  function apiBase() {
    return String(cfg.ANON_API_BASE || "").replace(/\/+$/, "");
  }
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveStore(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) {}
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
  function profileLink(id) {
    return location.origin + location.pathname.replace(/index\.html$/i, "") + "#q/" + encodeURIComponent(id);
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
  function api(path, opts) {
    var base = apiBase();
    if (!base) return Promise.reject(new Error("no_api"));
    opts = opts || {};
    opts.headers = opts.headers || {};
    if (opts.body && !opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }
    return fetch(base + path, opts).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) {
          var err = new Error((j && j.error) || "http_" + r.status);
          err.status = r.status;
          err.data = j;
          throw err;
        }
        return j;
      });
    });
  }
  function fillMyLink(prof) {
    setText($("anon-my-name"), prof.name || prof.n || "");
    setText($("anon-my-avatar"), initial(prof.name || prof.n));
    var inp = $("anon-my-link-input");
    if (inp) inp.value = profileLink(prof.id);
    var sec = $("anon-secret-input");
    if (sec) sec.value = prof.secret || "";
    setText($("anon-mylink-status"), "");
  }
  function openAsk(box) {
    currentAsk = box;
    setText($("anon-ask-name"), box.name);
    setText($("anon-ask-avatar"), initial(box.name));
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
  }
  function copyText(text, statusEl) {
    if (!text) return;
    function ok() { setText(statusEl, "تم النسخ"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () { ok(); });
    } else ok();
  }
  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" });
    } catch (e) { return ""; }
  }
  function renderInbox(data) {
    var list = $("anon-inbox-list");
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    setText($("anon-inbox-sub"), data.name ? ("وارد " + data.name) : "الرسائل المجهولة تظهر هنا فقط لك.");
    var msgs = data.messages || [];
    if (!msgs.length) {
      var empty = document.createElement("p");
      empty.className = "anon-empty";
      empty.textContent = "لا رسائل بعد. شارك رابطك في الستوري.";
      list.appendChild(empty);
      return;
    }
    msgs.forEach(function (m) {
      var card = document.createElement("div");
      card.className = "anon-msg";
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = "مجهول · " + fmtTime(m.createdAt);
      var text = document.createElement("div");
      text.className = "text";
      text.textContent = m.text || "";
      var row = document.createElement("div");
      row.className = "row";
      var ans = document.createElement("button");
      ans.type = "button";
      ans.className = "btn btn-primary";
      ans.textContent = "أجب وشارك";
      ans.addEventListener("click", function () {
        answeringMsgId = m.id;
        var qIn = $("anon-q-in");
        var aIn = $("anon-a-in");
        if (qIn) qIn.value = m.text || "";
        if (aIn) aIn.value = "";
        setText($("anon-ans-error"), "");
        location.hash = "#anon/reply";
        showAnon("answer");
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost";
      del.textContent = "حذف";
      del.addEventListener("click", function () {
        var st = loadStore();
        if (!st.profile || !st.profile.secret) return;
        api("/v1/boxes/" + encodeURIComponent(st.profile.id) + "/messages/" + encodeURIComponent(m.id), {
          method: "DELETE",
          headers: { "X-Box-Secret": st.profile.secret }
        }).then(function () { return loadInbox(); }).catch(function () {
          setText($("anon-inbox-error"), "تعذر الحذف.");
        });
      });
      row.appendChild(ans);
      row.appendChild(del);
      card.appendChild(meta);
      card.appendChild(text);
      card.appendChild(row);
      list.appendChild(card);
    });
  }
  function loadInbox() {
    var st = loadStore();
    var unlock = $("anon-inbox-unlock");
    setText($("anon-inbox-error"), "");
    if (!st.profile || !st.profile.id || !st.profile.secret) {
      if (unlock) unlock.hidden = false;
      return Promise.resolve();
    }
    if (unlock) unlock.hidden = true;
    if (!apiBase()) {
      setText($("anon-inbox-error"), "الخادم غير مفعّل بعد.");
      return Promise.resolve();
    }
    return api("/v1/boxes/" + encodeURIComponent(st.profile.id) + "/messages", {
      method: "GET",
      headers: { "X-Box-Secret": st.profile.secret }
    }).then(renderInbox).catch(function (e) {
      setText($("anon-inbox-error"), e.message === "unauthorized" ? "مفتاح غير صالح." : "تعذر تحميل الوارد.");
    });
  }
  function route() {
    var h = location.hash || "";
    var mq = h.match(/^#q\/([^/#?]+)$/);
    if (mq) {
      var id = decodeURIComponent(mq[1]);
      if (!apiBase()) {
        showAnon("hub");
        setText($("anon-create-error"), "");
        return true;
      }
      api("/v1/boxes/" + encodeURIComponent(id), { method: "GET" })
        .then(function (box) { openAsk(box); })
        .catch(function () {
          setText($("anon-ask-error"), "الرابط غير صالح أو منتهٍ.");
          showAnon("hub");
        });
      showAnon("ask");
      setText($("anon-ask-name"), "…");
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
    if (h === "#anon/create") { showAnon("create"); return true; }
    if (h === "#anon/me") {
      var st = loadStore();
      if (st.profile && st.profile.id) {
        fillMyLink(st.profile);
        showAnon("mylink");
      } else {
        location.hash = "#anon/create";
        showAnon("create");
      }
      return true;
    }
    if (h === "#anon/inbox") {
      showAnon("inbox");
      loadInbox();
      return true;
    }
    if (h === "#anon/reply") { showAnon("answer"); return true; }
    if (h.indexOf("#anon") === 0) { showAnon("hub"); return true; }
    return false;
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
    function go(hash, view) {
      return function () { location.hash = hash; showAnon(view); };
    }
    var gc = $("anon-go-create"); if (gc) gc.addEventListener("click", go("#anon/create", "create"));
    var gm = $("anon-go-my-link"); if (gm) gm.addEventListener("click", function () { location.hash = "#anon/me"; route(); });
    var gi = $("anon-go-inbox"); if (gi) gi.addEventListener("click", function () { location.hash = "#anon/inbox"; route(); });
    var oi = $("anon-open-inbox"); if (oi) oi.addEventListener("click", function () { location.hash = "#anon/inbox"; route(); });
    var recreate = $("anon-recreate");
    if (recreate) recreate.addEventListener("click", go("#anon/create", "create"));

    var createBtn = $("anon-create-btn");
    if (createBtn) createBtn.addEventListener("click", function () {
      var name = clean($("anon-display-name") && $("anon-display-name").value, MAX_NAME);
      var err = $("anon-create-error");
      if (name.length < 2) { setText(err, "اكتب اسمًا واضحًا (حرفان على الأقل)."); return; }
      if (!apiBase()) { setText(err, "الخادم غير مفعّل بعد. أعد المحاولة بعد النشر."); return; }
      setText(err, "");
      createBtn.disabled = true;
      api("/v1/boxes", { method: "POST", body: JSON.stringify({ name: name }) })
        .then(function (res) {
          var prof = { id: res.id, secret: res.secret, name: res.name, t: Date.now() };
          var st = loadStore();
          st.profile = prof;
          saveStore(st);
          fillMyLink(prof);
          location.hash = "#anon/me";
          showAnon("mylink");
        })
        .catch(function (e) {
          setText(err, e.message === "rate_limited" ? "حاول لاحقًا." : "تعذر الإنشاء. حاول مجددًا.");
        })
        .then(function () { createBtn.disabled = false; });
    });

    var copyMy = $("anon-copy-mylink");
    if (copyMy) copyMy.addEventListener("click", function () {
      copyText($("anon-my-link-input") && $("anon-my-link-input").value, $("anon-mylink-status"));
    });
    var copySec = $("anon-copy-secret");
    if (copySec) copySec.addEventListener("click", function () {
      copyText($("anon-secret-input") && $("anon-secret-input").value, $("anon-mylink-status"));
    });
    var shareMy = $("anon-share-mylink");
    if (shareMy) shareMy.addEventListener("click", function () {
      var inp = $("anon-my-link-input");
      if (!inp || !inp.value) return;
      if (navigator.share) {
        navigator.share({ title: "أرسل لي رسالة مجهولة", text: "أرسل لي رسالة مجهولة 👇", url: inp.value }).catch(function () {});
      } else if (copyMy) copyMy.click();
    });

    var unlockBtn = $("anon-unlock-btn");
    if (unlockBtn) unlockBtn.addEventListener("click", function () {
      var id = clean($("anon-unlock-id") && $("anon-unlock-id").value, 64);
      var secret = clean($("anon-unlock-secret") && $("anon-unlock-secret").value, 128);
      var err = $("anon-unlock-error");
      if (!id || !secret) { setText(err, "أدخل المعرّف والمفتاح."); return; }
      var st = loadStore();
      st.profile = { id: id, secret: secret, name: st.profile && st.profile.name || "", t: Date.now() };
      saveStore(st);
      setText(err, "");
      loadInbox();
    });
    var refresh = $("anon-inbox-refresh");
    if (refresh) refresh.addEventListener("click", function () { loadInbox(); });

    var send = $("anon-send");
    if (send) send.addEventListener("click", function () {
      var q = clean($("anon-question") && $("anon-question").value, MAX_Q);
      var err = $("anon-ask-error");
      if (!currentAsk || !currentAsk.id) { setText(err, "الرابط غير صالح."); return; }
      if (q.length < 2) { setText(err, "اكتب رسالة أوضح."); return; }
      if (!apiBase()) { setText(err, "الخادم غير مفعّل."); return; }
      setText(err, "");
      send.disabled = true;
      api("/v1/boxes/" + encodeURIComponent(currentAsk.id) + "/messages", {
        method: "POST",
        body: JSON.stringify({ text: q })
      }).then(function () {
        showAnon("sent");
      }).catch(function (e) {
        setText(err, e.message === "rate_limited" ? "انتظر قليلًا ثم أعد المحاولة." : "تعذر الإرسال.");
      }).then(function () { send.disabled = false; });
    });

    var again = $("anon-sent-again");
    if (again) again.addEventListener("click", function () { if (currentAsk) openAsk(currentAsk); });
    var sentCreate = $("anon-sent-create");
    if (sentCreate) sentCreate.addEventListener("click", go("#anon/create", "create"));
    var askOwn = $("anon-ask-make-own");
    if (askOwn) askOwn.addEventListener("click", go("#anon/create", "create"));
    var backInbox = $("anon-answer-back-inbox");
    if (backInbox) backInbox.addEventListener("click", function () {
      location.hash = "#anon/inbox";
      route();
    });

    var make = $("anon-make-card");
    if (make) make.addEventListener("click", function () {
      var q = clean($("anon-q-in") && $("anon-q-in").value, MAX_Q);
      var a = clean($("anon-a-in") && $("anon-a-in").value, MAX_A);
      var err = $("anon-ans-error");
      if (!q || !a) { setText(err, "أكمل السؤال والجواب."); return; }
      setText(err, "");
      var st = loadStore();
      var name = (st.profile && st.profile.name) || cfg.STORE_NAME || "Marça";
      var payload = { q: q, a: a, n: name, t: Date.now() };
      var token = b64urlEncode(payload);
      var link = location.origin + location.pathname.replace(/index\.html$/i, "") + "#anon/card/" + token;
      var inp = $("anon-share-link");
      if (inp) inp.value = link;
      renderCard(q, a, name);
      showAnon("card");
      location.hash = "#anon/card/" + token;
      if (answeringMsgId && st.profile && st.profile.secret && apiBase()) {
        api("/v1/boxes/" + encodeURIComponent(st.profile.id) + "/messages/" + encodeURIComponent(answeringMsgId), {
          method: "DELETE",
          headers: { "X-Box-Secret": st.profile.secret }
        }).catch(function () {});
        answeringMsgId = null;
      }
    });
    var copy = $("anon-copy-link");
    if (copy) copy.addEventListener("click", function () {
      copyText($("anon-share-link") && $("anon-share-link").value, $("anon-copy-status"));
    });
    var share = $("anon-native-share");
    if (share) share.addEventListener("click", function () {
      var inp = $("anon-share-link");
      if (!inp || !inp.value) return;
      if (navigator.share) navigator.share({ title: "رسالة من مجهول — Marça", url: inp.value }).catch(function () {});
      else if (copy) copy.click();
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
