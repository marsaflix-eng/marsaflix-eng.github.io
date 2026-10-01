(function () {
  "use strict";
  var cfg = window.MARCA_CONFIG || {};
  var API = (cfg.AFFILIATE_API_BASE || "").replace(/\/+$/, "");
  var TOK_KEY = "marca_admin_token";
  function $(id) { return document.getElementById(id); }
  function token() { try { return localStorage.getItem(TOK_KEY); } catch (e) { return null; } }
  function setToken(t) {
    try { if (t) localStorage.setItem(TOK_KEY, t); else localStorage.removeItem(TOK_KEY); } catch (e) {}
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
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, data: j }; });
    });
  }
  function showDash(show) {
    $("login-card").classList.toggle("hidden", show);
    $("admin-dash").classList.toggle("hidden", !show);
  }
  $("btn-admin-login").addEventListener("click", function () {
    api("/v1/admin/login", { method: "POST", body: { password: $("admin-pass").value } }).then(function (res) {
      if (res.data && res.data.ok && res.data.token) {
        setToken(res.data.token);
        $("login-msg").textContent = "";
        loadAll();
      } else {
        $("login-msg").textContent = "كلمة مرور خاطئة";
        $("login-msg").className = "aff-msg err";
      }
    }).catch(function () {
      $("login-msg").textContent = "خطأ شبكة";
      $("login-msg").className = "aff-msg err";
    });
  });
  $("btn-admin-logout").addEventListener("click", function () {
    api("/v1/auth/logout", { method: "POST" }).finally(function () {
      setToken(null);
      showDash(false);
    });
  });
  $("btn-refresh").addEventListener("click", loadAll);
  function loadAll() {
    if (!token()) { showDash(false); return; }
    showDash(true);
    api("/v1/admin/stats").then(function (res) {
      $("stats").textContent = JSON.stringify(res.data, null, 2);
      if (!res.data || !res.data.ok) { setToken(null); showDash(false); }
    });
    api("/v1/admin/sellers?status=pending").then(function (res) {
      var list = $("sellers-list");
      var sellers = (res.data && res.data.sellers) || [];
      if (!sellers.length) { list.innerHTML = '<li class="aff-sub">لا يوجد</li>'; return; }
      list.innerHTML = "";
      sellers.forEach(function (s) {
        var li = document.createElement("li");
        li.innerHTML = "<div><strong>" + s.name + "</strong> · <span dir='ltr'>" + s.phone + "</span></div>" +
          '<div class="meta">' + s.created_at + "</div>";
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "موافقة";
        ok.addEventListener("click", function () {
          api("/v1/admin/sellers/" + s.id + "/approve", { method: "POST", body: {} }).then(function (r) {
            var box = $("setup-token-box");
            if (r.data && r.data.ok) {
              box.classList.remove("hidden");
              box.innerHTML = "<strong>احفظ الآن (مرة واحدة)</strong><br>ref: " + r.data.ref +
                "<br>setup_token: " + r.data.setup_token +
                "<br><small>أعطِ البائع الرمز لتعيين PIN</small>";
              loadAll();
            } else alert((r.data && r.data.error) || "فشل");
          });
        });
        var no = document.createElement("button");
        no.type = "button"; no.className = "btn btn-ghost"; no.textContent = "رفض";
        no.addEventListener("click", function () {
          api("/v1/admin/sellers/" + s.id + "/reject", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(ok); actions.appendChild(no);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
    api("/v1/admin/orders?status=pending").then(function (res) {
      var list = $("orders-list");
      var orders = (res.data && res.data.orders) || [];
      if (!orders.length) { list.innerHTML = '<li class="aff-sub">لا يوجد</li>'; return; }
      list.innerHTML = "";
      orders.forEach(function (o) {
        var li = document.createElement("li");
        li.innerHTML = "<div>" + o.plan + " · " + o.price_mru + " MRU · REF:" + (o.ref || "—") +
          " · @" + (o.snap_user || "—") +
          (o.seller_name ? " · بائع: " + o.seller_name : "") + "</div>" +
          '<div class="meta">' + o.id + " · " + o.created_at + "</div>";
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var pay = document.createElement("button");
        pay.type = "button"; pay.className = "btn btn-primary"; pay.textContent = "تأكيد الدفع";
        pay.addEventListener("click", function () {
          api("/v1/admin/orders/" + o.id + "/mark-paid", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(pay);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
    api("/v1/admin/commissions?status=pending_payout").then(function (res) {
      var list = $("comms-list");
      var items = (res.data && res.data.commissions) || [];
      if (!items.length) { list.innerHTML = '<li class="aff-sub">لا يوجد</li>'; return; }
      list.innerHTML = "";
      items.forEach(function (c) {
        var li = document.createElement("li");
        li.innerHTML = "<div>" + c.amount_mru + " MRU · " + (c.seller_name || "") + " · " + (c.plan || "") + "</div>" +
          '<div class="meta">' + c.id + "</div>";
        var actions = document.createElement("div");
        actions.className = "aff-actions";
        var ok = document.createElement("button");
        ok.type = "button"; ok.className = "btn btn-primary"; ok.textContent = "إيداع المحفظة";
        ok.addEventListener("click", function () {
          api("/v1/admin/commissions/" + c.id + "/approve", { method: "POST", body: {} }).then(loadAll);
        });
        actions.appendChild(ok);
        li.appendChild(actions);
        list.appendChild(li);
      });
    });
  }
  if (token()) loadAll();
})();
