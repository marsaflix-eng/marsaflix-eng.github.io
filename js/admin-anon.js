(function () {
  "use strict";
  var TTL = 24 * 60 * 60 * 1000;
  var BANS = "marca_bans_v1";
  var CREDS = "marca_mod_box";
  function $(id) { return document.getElementById(id); }
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || ""); } catch (e) { return fallback; } }
  function bans() { var v = read(BANS, []); return Array.isArray(v) ? v : []; }
  function saveBans(list) { try { localStorage.setItem(BANS, JSON.stringify(list)); } catch (e) {} }
  function split(text) {
    var raw = String(text || "");
    var i = raw.lastIndexOf("\u2060");
    if (i < 0) return { text: raw, sender: "" };
    return { text: raw.slice(0, i), sender: raw.slice(i + 1) };
  }
  function apiBase() {
    var cfg = window.MARCA_CONFIG || {};
    return String(cfg.ANON_API_BASE || "").replace(/\/+$/, "");
  }
  function load() {
    var creds = read(CREDS, {}) || {};
    var id = ($("mod-box-id") && $("mod-box-id").value.trim()) || creds.id;
    var secret = ($("mod-box-secret") && $("mod-box-secret").value.trim()) || creds.secret;
    var msg = $("mod-msg");
    if (!id || !secret) { if (msg) msg.textContent = "أدخل معرّف الصندوق وسره من حساب رسالة من مجهول."; return; }
    try { sessionStorage.setItem(CREDS, JSON.stringify({ id: id, secret: secret })); } catch (e) {}
    fetch(apiBase() + "/v1/boxes/" + encodeURIComponent(id) + "/messages", { headers: { "X-Box-Secret": secret } })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "http"); return d; }); })
      .then(function (data) {
        var now = Date.now();
        var items = (data.messages || []).filter(function (m) { return now - new Date(m.createdAt).getTime() < TTL; });
        render(items, id, secret);
        if (msg) msg.textContent = "ظاهرة رسائل آخر 24 ساعة: " + items.length;
      })
      .catch(function () { if (msg) msg.textContent = "تعذر تحميل السجل. تأكد من المعرف والسر."; });
  }
  function render(items, boxId, secret) {
    var list = $("mod-list");
    if (!list) return;
    list.textContent = "";
    if (!items.length) {
      var empty = document.createElement("p");
      empty.textContent = "لا رسائل خلال آخر 24 ساعة.";
      list.appendChild(empty);
      return;
    }
    items.forEach(function (m) {
      var parts = split(m.text);
      var row = document.createElement("div");
      row.className = "anon-msg";
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(m.createdAt).toLocaleString("ar") + (parts.sender ? " · " + parts.sender : "");
      var body = document.createElement("div");
      body.className = "text";
      body.textContent = parts.text;
      var actions = document.createElement("div");
      actions.className = "row";
      var ban = document.createElement("button");
      ban.type = "button";
      ban.className = "btn btn-ghost";
      var isBanned = parts.sender && bans().indexOf(parts.sender) >= 0;
      ban.textContent = isBanned ? "إلغاء الحظر" : "حظر";
      ban.addEventListener("click", function () {
        if (!parts.sender) { $("mod-msg").textContent = "هذه الرسالة بلا معرّف مرسل، لا يمكن حظر جهازها."; return; }
        var listBans = bans().filter(function (id) { return id !== parts.sender; });
        if (!isBanned) listBans.push(parts.sender);
        saveBans(listBans);
        $("mod-msg").textContent = isBanned ? "تم إلغاء الحظر عن " + parts.sender : "تم حظر " + parts.sender;
        load();
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-ghost";
      del.textContent = "حذف";
      del.addEventListener("click", function () {
        fetch(apiBase() + "/v1/boxes/" + encodeURIComponent(boxId) + "/messages/" + encodeURIComponent(m.id), { method: "DELETE", headers: { "X-Box-Secret": secret } }).then(load);
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
    var creds = read(CREDS, {}) || {};
    if ($("mod-box-id") && creds.id) $("mod-box-id").value = creds.id;
    if ($("mod-box-secret") && creds.secret) $("mod-box-secret").value = creds.secret;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
