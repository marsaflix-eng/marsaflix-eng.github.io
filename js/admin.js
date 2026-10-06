(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var API = (cfg.AFFILIATE_API_BASE || "").replace(/\/+$/, "");
  var TOK_KEY = "marca_admin_token";
  function $(id) { return document.getElementById(id); }
  function token() { try { return sessionStorage.getItem(TOK_KEY); } catch (e) { return null; } }
  function setToken(t) {
    try { if (t) sessionStorage.setItem(TOK_KEY, t); else sessionStorage.removeItem(TOK_KEY); } catch (e) {}
    try { localStorage.removeItem(TOK_KEY); } catch (e2) {}
  }
  function text(v) { return v == null ? "" : String(v); }
  function addText(parent, value) {
    parent.appendChild(document.createTextNode(text(value)));
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    var t = token();
    if (t) headers.Authorization = "Bearer " + t;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, data: j }; });
    });
  }
  function showDash(show) {
    $("login-card").classList.toggle("hidden", show);
    $("admin-dash").classList.toggle("hidden", !show);
  }
  function empty(list, label) {
    list.textContent = "";
    var li = document.createElement("li");
    li.className = "aff-sub";
    li.textContent = label;
    list.appendChild(li);
  }
  var fails = 0;
  var lastTry = 0;
  $("btn-admin-login").addEventListener("click", function () {
    var now = Date.now();
    if (now - lastTry < 4000) { $("login-msg").textContent = "انتظر قليلاً قبل إعادة المحاولة."; return; }
    lastTry = now;
    var btn = $("btn-admin-login");
    var pass = $("admin-pass");
    if (fails >= 5) { $("login-msg").textContent = "أُوقف الدخول مؤقتاً. أغلق التبويب ثم أعد المحاولة."; return; }
    btn.disabled = true;
    api("/v1/admin/login", { method: "POST", body: { password: pass.value } }).then(function (res) {
      pass.value = "";
      if (res.data && res.data.ok && res.data.token) {
        fails = 0;
        setToken(res.data.token);
        $("login-msg").textContent = "";
        loadAll();
      } else {
        fails += 1;
        $("login-msg").textContent = "تعذر الدخول";
        $("login-msg").className = "aff-msg err";
      }
    }).catch(function () {
      pass.value = "";
      $("login-msg").textContent = "خطأ شبكة";
      $("login-msg").className = "aff-msg err";
    }).then(function () { btn.disabled = false; });
  });
  $("btn-admin-logout").addEventListener("click", function () {
    api("/v1/auth/logout", { method: "POST" }).finally(function () {
      setToken(null);
      try { sessionStorage.removeItem("marca_anon_v4_sec"); } catch (e) {}
      showDash(false);
    });
  });
  $("btn-refresh").addEventListener("click", loadAll);
  function loadAll() {
    if (!token()) { showDash(false); return; }
    showDash(true);
    api("/v1/admin/stats").then(function (res) {
      var data = res.data || {};
      if (!data.ok) { setToken(null); showDash(false); return; }
      var safe = {};
      Object.keys(data).forEach(function (k) {
        if (/token|secret|password|key/i.test(k)) return;
        safe[k] = data[k];
      });
      $("stats").textContent = JSON.stringify(safe, null, 2);
    });
    api("/v1/admin/sellers?status=pending").then(function (res) {
      var list = $("sellers-list");
      var sellers = (res.data && res.data.sellers) || [];
      list.textContent = "";
      if (!sellers.length) { empty(list, "لا يوجد"); return; }
      sellers.forEach(function (s) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        var strong = document.createElement("strong");
        strong.textContent = text(s.name);
        head.appendChild(strong);
        head.appendChild(document.createTextNode(" · "));
        var phone = document.createElement("span");
        phone.dir = "ltr";
        phone.textContent = text(s.phone);
        head.appendChild(phone);
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = text(s.created_at);
        li.appendChild(head);
        li.appendChild(meta);
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "موافقة";
        ok.addEventListener("click", function () {
          api("/v1/admin/sellers/" + encodeURIComponent(s.id) + "/approve", { method: "POST", body: {} }).then(function (r) {
            var box = $("setup-token-box");
            box.textContent = "";
            if (r.data && r.data.ok) {
              box.classList.remove("hidden");
              var title = document.createElement("strong");
              title.textContent = "احفظ الآن (مرة واحدة)";
              box.appendChild(title);
              box.appendChild(document.createElement("br"));
              addText(box, "ref: " + text(r.data.ref));
              box.appendChild(document.createElement("br"));
              addText(box, "setup_token: " + text(r.data.setup_token));
              box.appendChild(document.createElement("br"));
              var note = document.createElement("small");
              note.textContent = "أعطِ البائع الرمز لتعيين PIN";
              box.appendChild(note);
              loadAll();
            } else { box.classList.remove("hidden"); box.textContent = "تعذر تنفيذ العملية"; }
          });
        });
        var no = document.createElement("button");
        no.type = "button"; no.className = "btn btn-ghost"; no.textContent = "رفض";
        no.addEventListener("click", function () {
          api("/v1/admin/sellers/" + encodeURIComponent(s.id) + "/reject", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(ok); actions.appendChild(no);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
    api("/v1/admin/orders?status=pending").then(function (res) {
      var list = $("orders-list");
      var orders = (res.data && res.data.orders) || [];
      list.textContent = "";
      if (!orders.length) { empty(list, "لا يوجد"); return; }
      orders.forEach(function (o) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        head.textContent = text(o.plan) + " · " + text(o.price_mru) + " MRU · REF:" + text(o.ref || "—") +
          " · @" + text(o.snap_user || "—") + (o.seller_name ? " · بائع: " + text(o.seller_name) : "");
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = text(o.id) + " · " + text(o.created_at);
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var pay = document.createElement("button");
        pay.type = "button"; pay.className = "btn btn-primary"; pay.textContent = "تأكيد الدفع";
        pay.addEventListener("click", function () {
          api("/v1/admin/orders/" + encodeURIComponent(o.id) + "/mark-paid", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(pay);
        li.appendChild(head);
        li.appendChild(meta);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
    api("/v1/admin/commissions?status=pending_payout").then(function (res) {
      var list = $("comms-list");
      var items = (res.data && res.data.commissions) || [];
      list.textContent = "";
      if (!items.length) { empty(list, "لا يوجد"); return; }
      items.forEach(function (c) {
        var li = document.createElement("li");
        var head = document.createElement("div");
        head.textContent = text(c.amount_mru) + " MRU · " + text(c.seller_name || "") + " · " + text(c.plan || "");
        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = text(c.id);
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "إيداع المحفظة";
        ok.addEventListener("click", function () {
          api("/v1/admin/commissions/" + encodeURIComponent(c.id) + "/approve", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(ok);
        li.appendChild(head);
        li.appendChild(meta);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
  }
  if (token()) loadAll();
})();
