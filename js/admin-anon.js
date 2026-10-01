(function () {
  "use strict";
  var TTL = 24 * 60 * 60 * 1000;
  var BANS = "marca_bans_v1";
  function $(id) { return document.getElementById(id); }
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || ""); } catch (e) { return fallback; } }
  function bans() { var v = read(BANS, []); return Array.isArray(v) ? v : []; }
  function saveBans(list) { try { localStorage.setItem(BANS, JSON.stringify(list)); } catch (e) {} renderBans(); }
  function box() {
    var profile = read("marca_anon_v4", {}).profile || {};
    var secret = "";
    try { secret = sessionStorage.getItem("marca_anon_v4_sec") || ""; } catch (e) {}
    return { id: profile.id || "", secret: secret || profile.secret || "" };
  }
  function split(text) {
    var raw = String(text || "");
    var i = raw.lastIndexOf("\u2060");
    if (i < 0) return { text: raw, sender: "" };
    return { text: raw.slice(0, i), sender: raw.slice(i + 1) };
  }
  function apiBase() { return String((window.MARCA_CONFIG || {}).ANON_API_BASE || "").replace(/\/+$/, ""); }
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
      row.className = "btn-row";
      var name = document.createElement("span");
      name.textContent = id;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost";
      btn.textContent = "إلغاء الحظر";
      btn.addEventListener("click", function () { saveBans(bans().filter(function (x) { return x !== id; })); });
      row.appendChild(name);
      row.appendChild(btn);
      list.appendChild(row);
    });
  }
  function load() {
    var msg = $("mod-msg");
    var creds = box();
    if (!creds.id || !creds.secret) {
      if (msg) msg.textContent = "افتح رسالة من مجهول وسجّل الدخول في هذا المتصفح، ثم ارجع وحدّث.";
      return;
    }
    fetch(apiBase() + "/v1/boxes/" + encodeURIComponent(creds.id) + "/messages", { headers: { "X-Box-Secret": creds.secret } })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error("bad"); return d; }); })
      .then(function (data) {
        var now = Date.now();
        var items = (data.messages || []).filter(function (m) { return now - new Date(m.createdAt).getTime() < TTL; });
        render(items, creds);
        if (msg) msg.textContent = items.length ? ("رسائل آخر 24 ساعة: " + items.length) : "لا رسائل خلال آخر 24 ساعة.";
      })
      .catch(function () { if (msg) msg.textContent = "تعذر تحميل الرسائل."; });
  }
  function render(items, creds) {
    var list = $("mod-list");
    if (!list) return;
    list.textContent = "";
    items.forEach(function (m) {
      var parts = split(m.text);
      var row = document.createElement("div");
      row.className = "anon-msg";
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(m.createdAt).toLocaleString("ar");
      var body = document.createElement("div");
      body.className = "text";
      body.textContent = parts.text;
      var actions = document.createElement("div");
      actions.className = "btn-row";
      var ban = document.createElement("button");
      ban.type = "button";
      ban.className = "btn btn-primary";
      var blocked = parts.sender && bans().indexOf(parts.sender) >= 0;
      ban.textContent = blocked ? "إلغاء الحظر" : "حظر";
      ban.addEventListener("click", function () {
        if (!parts.sender) { $("mod-msg").textContent = "هذه الرسالة قديمة بلا معرّف، يمكن حذفها فقط."; return; }
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
        fetch(apiBase() + "/v1/boxes/" + encodeURIComponent(creds.id) + "/messages/" + encodeURIComponent(m.id), { method: "DELETE", headers: { "X-Box-Secret": creds.secret } }).then(load);
      });
      actions.appendChild(ban);
      actions.appendChild(del);
      row.appendChild(meta);
      row.appendChild(body);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }
  function boot() {
    var btn = $("mod-load");
    if (btn) btn.addEventListener("click", load);
    renderBans();
    var dash = $("admin-dash");
    if (!dash) return;
    new MutationObserver(function () {
      if (!dash.classList.contains("hidden")) load();
    }).observe(dash, { attributes: true });
    if (!dash.classList.contains("hidden")) load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
