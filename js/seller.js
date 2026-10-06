(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var API = (cfg.AFFILIATE_API_BASE || "").replace(/\/+$/, "");
  var TOK_KEY = "marca_seller_token";

  function $(id) { return document.getElementById(id); }
  function msg(el, text, ok) {
    el.textContent = text || "";
    el.className = "aff-msg" + (text ? (ok ? " ok" : " err") : "");
  }
  function token() {
    try { return sessionStorage.getItem(TOK_KEY); } catch (e) { return null; }
  }
  function setToken(t) {
    try { if (t) sessionStorage.setItem(TOK_KEY, t); else sessionStorage.removeItem(TOK_KEY); } catch (e) {}
    try { localStorage.removeItem(TOK_KEY); } catch (e2) {}
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var t = token();
    if (t) headers.Authorization = "Bearer " + t;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, data: j }; });
    });
  }

  function showTab(name) {
    ["login", "register", "pin"].forEach(function (n) {
      var p = $("panel-" + n);
      var b = $("tab-" + n);
      if (p) p.classList.toggle("hidden", n !== name);
      if (b) b.classList.toggle("active", n === name);
    });
  }

  document.querySelectorAll(".aff-tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () { showTab(btn.getAttribute("data-tab")); });
  });

  $("btn-register").addEventListener("click", function () {
    var m = $("auth-msg");
    var passEl = $("reg-pass");
    var password = passEl ? passEl.value : "";
    if (!password || password.length < 10 || !/[A-Za-z\u0600-\u06FF]/.test(password) || !/[0-9]/.test(password)) { msg(m, "كلمة المرور 10 أحرف على الأقل وتضم حرفاً ورقماً"); return; }
    api("/v1/auth/register", {
      method: "POST",
      body: { phone: $("reg-phone").value, name: $("reg-name").value, password: password },
    }).then(function (res) {
      if (res.data && res.data.ok && res.data.token) {
        setToken(res.data.token);
        msg(m, "تم التسجيل والدخول.", true);
        loadDash();
      } else if (res.data && res.data.error === "already_registered") {
        msg(m, "الحساب موجود — استخدم الدخول");
        showTab("login");
      } else msg(m, (res.data && res.data.error) || "فشل التسجيل");
    }).catch(function () { msg(m, "خطأ شبكة"); });
  });

  $("btn-set-pin").addEventListener("click", function () {
    var m = $("auth-msg");
    api("/v1/auth/set-pin", {
      method: "POST",
      body: {
        phone: $("pin-phone").value,
        setup_token: $("pin-token").value.trim(),
        pin: $("pin-new").value,
      },
    }).then(function (res) {
      if (res.data && res.data.ok) {
        msg(m, "تم تعيين PIN. يمكنك الدخول الآن.", true);
        showTab("login");
      } else msg(m, (res.data && res.data.error) || "فشل");
    }).catch(function () { msg(m, "خطأ شبكة"); });
  });

  $("btn-login").addEventListener("click", function () {
    var m = $("auth-msg");
    api("/v1/auth/login", {
      method: "POST",
      body: { phone: $("login-phone").value, password: $("login-pin").value, pin: $("login-pin").value },
    }).then(function (res) {
      if (res.data && res.data.ok && res.data.token) {
        setToken(res.data.token);
        msg(m, "", true);
        loadDash();
      } else msg(m, "بيانات غير صحيحة أو الحساب غير جاهز");
    }).catch(function () { msg(m, "خطأ شبكة"); });
  });

  $("btn-logout").addEventListener("click", function () {
    api("/v1/auth/logout", { method: "POST" }).finally(function () {
      setToken(null);
      $("dash").classList.add("hidden");
      $("auth-card").classList.remove("hidden");
    });
  });

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function renderLinks(links) {
    var box = $("share-links");
    while (box.firstChild) box.removeChild(box.firstChild);
    var items = [
      { label: "الصفحة الرئيسية", url: links.home },
      { label: "سنة — 490 أوقية", url: links["1y"] },
    ];
    items.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "aff-link-row";
      var inp = document.createElement("input");
      inp.readOnly = true;
      inp.value = it.url;
      inp.setAttribute("aria-label", it.label);
      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-primary";
      copyBtn.textContent = "نسخ";
      copyBtn.addEventListener("click", function () {
        copyText(it.url).then(function () { copyBtn.textContent = "تم"; setTimeout(function () { copyBtn.textContent = "نسخ"; }, 1200); });
      });
      var wa = document.createElement("a");
      wa.className = "btn btn-whatsapp";
      wa.href = "https://wa.me/?text=" + encodeURIComponent("اطلب سناب بلس من مرصة: " + it.url);
      wa.target = "_blank";
      wa.rel = "noopener noreferrer";
      wa.textContent = "واتساب";
      row.appendChild(inp);
      row.appendChild(copyBtn);
      row.appendChild(wa);
      var lab = document.createElement("p");
      lab.className = "aff-sub";
      lab.style.textAlign = "right";
      lab.style.margin = "0 0 .25rem";
      lab.textContent = it.label;
      box.appendChild(lab);
      box.appendChild(row);
    });
  }

  function statusBadge(s) {
    var cls = s === "paid" || s === "paid_to_wallet" ? "badge-ok" : s === "pending" || s === "pending_payout" ? "badge-pending" : "badge-bad";
    var span = document.createElement("span");
    span.className = "badge " + cls;
    span.textContent = s == null ? "" : String(s);
    return span;
  }
  function fillRows(list, rows, render) {
    list.textContent = "";
    if (!rows.length) {
      var li = document.createElement("li");
      li.className = "aff-sub";
      li.textContent = "لا يوجد بعد";
      list.appendChild(li);
      return;
    }
    rows.forEach(function (row) { list.appendChild(render(row)); });
  }

  function loadDash() {
    if (!token()) return;
    Promise.all([
      api("/v1/me"),
      api("/v1/me/share-links"),
      api("/v1/me/commissions"),
      api("/v1/me/orders"),
      api("/v1/me/wallet"),
    ]).then(function (all) {
      var me = all[0];
      if (!me.data || !me.data.ok) {
        setToken(null);
        return;
      }
      $("auth-card").classList.add("hidden");
      $("dash").classList.remove("hidden");
      $("dash-name").textContent = "مرحبًا، " + me.data.seller.name;
      var sref = me.data.seller.ref;
      $("dash-ref").textContent = sref || (me.data.seller.affiliate_status === "pending" ? "بانتظار موافقة العمولة" : "—");
      var bal = (all[4].data && all[4].data.available) || me.data.wallet.available || 0;
      $("dash-wallet").textContent = String(bal) + " MRU";
      if (all[1].data && all[1].data.links) renderLinks(all[1].data.links);
      var cl = $("comm-list");
      var comms = (all[2].data && all[2].data.commissions) || [];
      fillRows(cl, comms, function (c) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        head.appendChild(document.createTextNode(String(c.amount_mru) + " MRU "));
        head.appendChild(statusBadge(c.status));
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = c.created_at == null ? "" : String(c.created_at);
        li.appendChild(head);
        li.appendChild(meta);
        return li;
      });
      var ol = $("ord-list");
      var ords = (all[3].data && all[3].data.orders) || [];
      fillRows(ol, ords, function (o) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        head.appendChild(document.createTextNode(String(o.plan) + " · " + String(o.price_mru) + " MRU "));
        head.appendChild(statusBadge(o.status));
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = o.created_at == null ? "" : String(o.created_at);
        li.appendChild(head);
        li.appendChild(meta);
        return li;
      });
    }).catch(function () {});
  }

  if (!API) {
    msg($("auth-msg"), "AFFILIATE_API_BASE غير مضبوط");
  } else {
    loadDash();
  }
})();
