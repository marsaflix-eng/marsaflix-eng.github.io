(function () {
  "use strict";
  var TTL = 24 * 60 * 60 * 1000;
  var BANS = "marca_bans_v1";
  var VAULT = "marca_admin_boxes_v1";
  var MIRROR = "marca_admin_mirror_v1";
  var UNLOCK = "marca_mod_unlock";
  var RECOVER = "marca_admin_recover_v1";
  var FAILS = "marca_admin_recover_fail";
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function $(id) { return document.getElementById(id); }
  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || ""); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function bans() { var v = read(BANS, []); return Array.isArray(v) ? v : []; }
  function saveBans(list) { write(BANS, list); renderBans(); }
  function vault() { var v = read(VAULT, []); return Array.isArray(v) ? v : []; }
  function saveVault(list) { write(VAULT, list.slice(-40)); }
  function serverToken() { try { return sessionStorage.getItem("marca_admin_token") || ""; } catch (e) { return ""; } }
  function unlocked() { try { return sessionStorage.getItem(UNLOCK) === "1"; } catch (e) { return false; } }
  function gate() { return !!serverToken() || unlocked(); }
  function apiBase() { return String((window.MARCA_CONFIG || {}).ANON_API_BASE || "").replace(/\/+$/, ""); }
  function affBase() { return String((window.MARCA_CONFIG || {}).AFFILIATE_API_BASE || "").replace(/\/+$/, ""); }
  function waPhone() { return String((window.MARCA_CONFIG || {}).WHATSAPP_E164 || "").replace(/\D/g, ""); }
  function split(text) {
    var raw = String(text || "");
    var i = raw.lastIndexOf("\u2060");
    if (i < 0) return { text: raw, sender: "" };
    return { text: raw.slice(0, i), sender: raw.slice(i + 1) };
  }
  function setMsg(text, bad) {
    var msg = $("mod-msg");
    if (!msg) return;
    msg.textContent = text || "";
    msg.className = bad ? "aff-msg err" : "aff-msg";
  }
  function upsert(box) {
    if (!box || !box.id || !box.secret) return;
    var id = String(box.id || "").trim();
    var secret = String(box.secret || "").trim();
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(id) || !/^[A-Za-z0-9_+/=.-]{8,200}$/.test(secret)) return;
    var list = vault();
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) {
        list[i].secret = secret;
        if (box.label) list[i].label = String(box.label).slice(0, 40);
        found = true;
      }
    }
    if (!found) list.push({ id: id, secret: secret, label: String(box.label || "صندوق").slice(0, 40) });
    saveVault(list);
  }
  function sessionBox() {
    var profile = read("marca_anon_v4", {}).profile || {};
    var secret = "";
    try { secret = sessionStorage.getItem("marca_anon_v4_sec") || ""; } catch (e) {}
    if (!secret && profile.secret) secret = profile.secret;
    if (!profile.id || !secret) return null;
    return { id: profile.id, secret: secret, label: profile.name || "هذا الجهاز" };
  }
  function consider(id, secret, label) {
    if (!id || !secret) return;
    upsert({ id: id, secret: secret, label: label || "بائع" });
  }
  function harvest(node, depth) {
    if (!node || typeof node !== "object" || depth > 5) return;
    if (Array.isArray(node)) {
      node.forEach(function (item) { harvest(item, depth + 1); });
      return;
    }
    if (node.box && typeof node.box === "object") consider(node.box.id, node.box.secret, node.box.name || node.name || node.phone);
    if (node.anon_box && typeof node.anon_box === "object") consider(node.anon_box.id, node.anon_box.secret, node.name || node.phone);
    consider(node.box_id || node.boxId || node.anon_box_id || node.anonBoxId, node.box_secret || node.boxSecret || node.anon_box_secret || node.anonBoxSecret, node.name || node.phone);
    if (node.id && node.secret && !node.phone && !node.password && !node.pin) consider(node.id, node.secret, node.name);
    Object.keys(node).forEach(function (k) {
      if (/token|password|authorization|pin/i.test(k)) return;
      if (node[k] && typeof node[k] === "object") harvest(node[k], depth + 1);
    });
  }
  function pullSellers() {
    var token = serverToken();
    var base = affBase();
    if (!token || !base) return Promise.resolve();
    var statuses = ["approved", "active", "pending", "all"];
    return Promise.all(statuses.map(function (status) {
      return fetch(base + "/v1/admin/sellers?status=" + encodeURIComponent(status), {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer"
      }).then(function (r) { return r.json(); }).then(function (data) {
        harvest(data, 0);
      }).catch(function () {});
    }));
  }
  function renderBoxes(count) {
    var el = $("mod-boxes");
    if (!el) return;
    var list = vault();
    el.textContent = list.length
      ? ("صناديق مربوطة: " + list.length + (count != null ? " · رسائل آخر 24 ساعة: " + count : ""))
      : "لا يوجد صندوق مربوط بعد.";
  }
  function renderBans() {
    var list = $("ban-list");
    if (!list) return;
    list.textContent = "";
    var items = bans();
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "aff-msg";
      empty.textContent = "لا يوجد محظور.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (id) {
      var row = document.createElement("div");
      row.className = "ban-row";
      var name = document.createElement("span");
      name.dir = "ltr";
      name.textContent = id;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost";
      btn.textContent = "رفع الحظر";
      btn.addEventListener("click", function () {
        saveBans(bans().filter(function (x) { return x !== id; }));
        load();
      });
      row.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }
  function render(items) {
    var list = $("mod-list");
    if (!list) return;
    list.textContent = "";
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "aff-msg";
      empty.textContent = "لا رسائل خلال آخر 24 ساعة.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (m) {
      var parts = split(m.text);
      var blocked = !!(parts.sender && bans().indexOf(parts.sender) >= 0);
      var row = document.createElement("div");
      row.className = "mod-row" + (blocked ? " is-banned" : "");
      var meta = document.createElement("div");
      meta.className = "mod-meta";
      var when = "";
      try { when = new Date(m.createdAt).toLocaleString("ar"); } catch (e) { when = ""; }
      meta.textContent = (m.label || "صندوق") + " · " + when + (parts.sender ? " · " + parts.sender : "") + (blocked ? " · محظور" : "");
      var body = document.createElement("div");
      body.className = "mod-text";
      body.textContent = parts.text;
      var actions = document.createElement("div");
      actions.className = "mod-actions";
      var ban = document.createElement("button");
      ban.type = "button";
      ban.className = "btn btn-primary";
      ban.textContent = blocked ? "رفع الحظر" : "حظر";
      ban.addEventListener("click", function () {
        if (!gate()) return;
        if (!parts.sender) { setMsg("هذه الرسالة بلا معرّف مرسل. يمكن حذفها فقط.", true); return; }
        var next = bans().filter(function (id) { return id !== parts.sender; });
        if (!blocked) next.push(parts.sender);
        saveBans(next);
        load();
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost";
      del.textContent = "حذف";
      del.addEventListener("click", function () {
        if (!gate() || !m.boxId || !m.secret || !m.id) return;
        del.disabled = true;
        fetch(apiBase() + "/v1/boxes/" + encodeURIComponent(m.boxId) + "/messages/" + encodeURIComponent(m.id), {
          method: "DELETE",
          headers: { "X-Box-Secret": m.secret },
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer"
        }).then(function () { load(); }).catch(function () { setMsg("تعذر حذف الرسالة.", true); del.disabled = false; });
      });
      actions.appendChild(ban);
      actions.appendChild(del);
      row.appendChild(meta);
      row.appendChild(body);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }
  var lastPull = 0;
  function load(forcePull) {
    if (!gate()) { setMsg("ادخل لوحة الإدارة أولاً."); return; }
    var exit = $("btn-mod-lock");
    if (exit) exit.classList.toggle("hidden", !!serverToken());
    var local = sessionBox();
    if (local) upsert(local);
    var savedMirror = read(MIRROR, null);
    if (savedMirror && savedMirror.id && savedMirror.secret) upsert({ id: savedMirror.id, secret: savedMirror.secret, label: "مراقبة عامة" });
    var pull = (!forcePull && Date.now() - lastPull < 120000) ? Promise.resolve() : pullSellers().then(function () { lastPull = Date.now(); });
    pull.then(function () {
      var boxes = vault();
      renderBoxes(null);
      if (!boxes.length) {
        render([]);
        setMsg("اربط صندوق هذا المتصفح، أو أضف معرّف الصندوق وسرّه. الرسائل تبقى 24 ساعة.");
        return;
      }
      var base = apiBase();
      return Promise.all(boxes.map(function (box) {
        return fetch(base + "/v1/boxes/" + encodeURIComponent(box.id) + "/messages", {
          headers: { "X-Box-Secret": box.secret },
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer"
        }).then(function (r) {
          return r.json().then(function (d) { return { ok: r.ok, data: d, box: box }; });
        }).catch(function () { return { ok: false, box: box }; });
      })).then(function (results) {
        var now = Date.now();
        var seen = Object.create(null);
        var items = [];
        var failed = 0;
        results.forEach(function (res) {
          if (!res.ok || !res.data || !Array.isArray(res.data.messages)) { failed += 1; return; }
          res.data.messages.forEach(function (m) {
            var at = new Date(m.createdAt).getTime();
            if (!at || now - at >= TTL) return;
            var key = res.box.id + ":" + m.id;
            if (seen[key]) return;
            seen[key] = 1;
            items.push({ id: m.id, text: m.text, createdAt: m.createdAt, boxId: res.box.id, secret: res.box.secret, label: res.box.label || "صندوق" });
          });
        });
        items.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        render(items.slice(0, 200));
        renderBoxes(items.length);
        setMsg(failed ? ("تم التحميل. تعذر فتح " + failed + " صندوق.") : "");
      });
    }).catch(function () { setMsg("تعذر تحميل الرسائل.", true); });
  }
  function showModOnly() {
    $("login-card").classList.add("hidden");
    var rec = $("recover-card");
    if (rec) rec.classList.add("hidden");
    $("admin-dash").classList.remove("hidden");
    var only = document.querySelectorAll(".admin-only");
    for (var i = 0; i < only.length; i++) only[i].classList.add("hidden");
  }
  function lockMod() {
    try { sessionStorage.removeItem(UNLOCK); } catch (e) {}
    $("admin-dash").classList.add("hidden");
    $("login-card").classList.remove("hidden");
  }
  function bytesHex(size) {
    var bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
    return out;
  }
  function sha(salt, code) {
    var data = new TextEncoder().encode(salt + ":" + String(code || "").trim().toUpperCase());
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      var hex = "";
      var view = new Uint8Array(buf);
      for (var i = 0; i < view.length; i++) hex += ("0" + view[i].toString(16)).slice(-2);
      return hex;
    });
  }
  function randomCode() {
    var bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    var out = "";
    for (var i = 0; i < bytes.length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
  }
  function openWa(text) {
    var phone = waPhone();
    if (!phone) { setRecover("رقم الواتساب غير مضبوط.", true); return; }
    var url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
    var w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) location.href = url;
  }
  function setRecover(text, bad) {
    var el = $("recover-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = bad ? "aff-msg err" : "aff-msg";
  }
  function failState() {
    var v = read(FAILS, { n: 0, at: 0 });
    if (!v || typeof v !== "object") return { n: 0, at: 0 };
    return { n: Number(v.n) || 0, at: Number(v.at) || 0 };
  }
  function makeCode() {
    if (!window.crypto || !crypto.subtle || !gate()) return;
    var code = randomCode();
    var salt = bytesHex(16);
    sha(salt, code).then(function (hash) {
      write(RECOVER, { salt: salt, hash: hash });
      var shown = $("recover-new-code");
      if (shown) shown.textContent = code;
      var hint = $("recover-setup-msg");
      if (hint) hint.textContent = "احفظ الرمز. سيُفتح واتساب لإرساله إلى رقم المتجر. الرمز يفتح الرسائل والحظر على هذا الجهاز فقط.";
      openWa("رمز استعادة لوحة مرصة (احفظه ولا تشاركه):\n" + code);
    }).catch(function () {
      var hint = $("recover-setup-msg");
      if (hint) hint.textContent = "تعذر إنشاء الرمز على هذا المتصفح.";
    });
  }
  function tryRecover() {
    var input = $("recover-code");
    var code = input ? String(input.value || "").trim().toUpperCase() : "";
    if (input) input.value = "";
    var state = failState();
    if (state.n >= 5 && Date.now() - state.at < 10 * 60 * 1000) {
      setRecover("محاولات كثيرة. انتظر عشر دقائق.", true);
      return;
    }
    var saved = read(RECOVER, null);
    if (!saved || !saved.salt || !saved.hash) {
      setRecover("لا يوجد رمز محفوظ على هذا الجهاز. أنشئه بعد دخول صحيح، أو أرسل طلباً عبر واتساب.", true);
      return;
    }
    if (!window.crypto || !crypto.subtle) { setRecover("المتصفح لا يدعم الاستعادة هنا.", true); return; }
    sha(saved.salt, code).then(function (hash) {
      if (!sameHex(hash, saved.hash)) {
        write(FAILS, { n: state.n + 1, at: Date.now() });
        setRecover("الرمز غير صحيح.", true);
        return;
      }
      write(FAILS, { n: 0, at: 0 });
      try { sessionStorage.setItem(UNLOCK, "1"); } catch (e) {}
      setRecover("");
      showModOnly();
    }).catch(function () { setRecover("تعذر التحقق.", true); });
  }
  function createMirror() {
    if (!gate()) return;
    var details = $("mod-mirror-details");
    if (details && !details.open) details.open = true;
    if (window.MarcaTurnstile) window.MarcaTurnstile.mount("admin-ts-mirror");
    var token = window.MarcaTurnstile && window.MarcaTurnstile.token("admin-ts-mirror");
    var note = $("mod-mirror-msg");
    if (!token) {
      if (note) note.textContent = "أكمل التحقق أعلاه ثم اضغط التفعيل مرة أخرى.";
      return;
    }
    var btn = $("mod-mirror-btn");
    if (btn) btn.disabled = true;
    fetch(apiBase() + "/v1/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "مراقبة مرصة", turnstile_token: token }),
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok || !d.id || !d.secret) throw new Error((d && d.error) || "fail");
        return d;
      });
    }).then(function (d) {
      try { localStorage.setItem("marca_admin_device", "1"); } catch (e) {}
      write(MIRROR, { id: d.id, secret: d.secret });
      upsert({ id: d.id, secret: d.secret, label: "مراقبة عامة" });
      var field = $("mod-mirror-id");
      if (field) field.value = d.id;
      if (note) note.textContent = "تم على هذا الجهاز. السر يبقى هنا ولا يُعرض. الرسائل الجديدة تُنسخ إلى هذا الصندوق بعد أن يُنشر معرّفه في الموقع.";
      if (window.MarcaTurnstile) window.MarcaTurnstile.reset("admin-ts-mirror");
      load();
    }).catch(function () {
      if (note) note.textContent = "تعذر إنشاء صندوق المراقبة. أعد التحقق وحاول مرة أخرى.";
    }).then(function () { if (btn) btn.disabled = false; });
  }
  function sameHex(a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a.length !== b.length) return false;
    var n = 0;
    for (var i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return n === 0;
  }
  function addManual() {
    if (!gate()) return;
    var idEl = $("mod-box-id");
    var secretEl = $("mod-box-secret");
    var id = idEl ? String(idEl.value || "").trim() : "";
    upsert({ id: id, secret: secretEl && secretEl.value, label: "مضاف يدوياً" });
    if (secretEl) secretEl.value = "";
    var added = vault().some(function (b) { return b && b.id === id; });
    if (!added) { setMsg("تحقق من المعرّف والسر.", true); return; }
    load(true);
  }
  function boot() {
    var refresh = $("mod-refresh");
    if (refresh) refresh.addEventListener("click", function () { load(true); });
    var imp = $("mod-import-local");
    if (imp) imp.addEventListener("click", function () {
      var box = sessionBox();
      if (!box) { setMsg("افتح رسالة من مجهول في هذا التبويب بعد دخول الإدارة، ثم ارجع واضغط الربط.", true); return; }
      upsert(box);
      load();
    });
    var add = $("mod-add-box");
    if (add) add.addEventListener("click", addManual);
    var mirrorBtn = $("mod-mirror-btn");
    if (mirrorBtn) mirrorBtn.addEventListener("click", createMirror);
    var details = $("mod-mirror-details");
    if (details) details.addEventListener("toggle", function () {
      if (details.open && window.MarcaTurnstile) window.MarcaTurnstile.mount("admin-ts-mirror");
    });
    var forgot = $("btn-forgot");
    if (forgot) forgot.addEventListener("click", function () {
      $("login-card").classList.add("hidden");
      $("recover-card").classList.remove("hidden");
      setRecover("");
    });
    var back = $("btn-recover-back");
    if (back) back.addEventListener("click", function () {
      $("recover-card").classList.add("hidden");
      $("login-card").classList.remove("hidden");
    });
    var recover = $("btn-recover");
    if (recover) recover.addEventListener("click", tryRecover);
    var codeInput = $("recover-code");
    if (codeInput) codeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") tryRecover(); });
    var wa = $("btn-recover-wa");
    if (wa) wa.addEventListener("click", function () {
      openWa("طلب استعادة دخول لوحة إدارة مرصة.");
      setRecover("سيفتح واتساب لإرسال الطلب إلى رقم المتجر. هذا لا يغيّر كلمة الخادم.");
    });
    var make = $("btn-make-code");
    if (make) make.addEventListener("click", makeCode);
    var exit = $("btn-mod-lock");
    if (exit) exit.addEventListener("click", lockMod);
    renderBans();
    var savedMirror = read(MIRROR, null);
    var field = $("mod-mirror-id");
    if (field && savedMirror && savedMirror.id) field.value = savedMirror.id;
    var dash = $("admin-dash");
    if (!dash) return;
    new MutationObserver(function () {
      if (!dash.classList.contains("hidden") && gate()) load();
    }).observe(dash, { attributes: true, attributeFilter: ["class"] });
    if (unlocked() && !serverToken()) showModOnly();
    else if (!dash.classList.contains("hidden") && gate()) load();
    setInterval(function () {
      if (dash.classList.contains("hidden") || !gate()) return;
      load(false);
    }, 25000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
