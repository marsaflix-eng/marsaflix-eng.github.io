(function () {
  "use strict";
  var TTL = 24 * 60 * 60 * 1000;
  var LOG = "marca_msg_log_v1";
  var SID = "marca_sender_id";
  var BANS = "marca_bans_v1";
  function senderId() {
    try {
      var id = localStorage.getItem(SID);
      if (!id) {
        id = Math.random().toString(36).slice(2, 10);
        localStorage.setItem(SID, id);
      }
      return id;
    } catch (e) { return "guest"; }
  }
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function fresh(items) {
    var now = Date.now();
    return (items || []).filter(function (m) { return m && m.at && now - m.at < TTL; });
  }
  function bans() {
    var local = read(BANS);
    return Array.isArray(local) ? local : [];
  }
  function banned(id) { return bans().indexOf(id) !== -1; }
  function stamp(text) {
    var clean = String(text || "").replace(/\u2060[a-z0-9]{6,12}$/i, "");
    return clean + "\u2060" + senderId();
  }
  function split(text) {
    var raw = String(text || "");
    var i = raw.lastIndexOf("\u2060");
    if (i < 0) return { text: raw, sender: "" };
    return { text: raw.slice(0, i), sender: raw.slice(i + 1) };
  }
  function remember(boxId, text, id) {
    var items = fresh(read(LOG));
    items.push({ id: id || ("local-" + Date.now()), boxId: boxId, text: text, at: Date.now(), sender: senderId() });
    write(LOG, items);
  }
  function paint() {
    var list = document.getElementById("anon-inbox-list");
    var sub = document.getElementById("anon-inbox-sub");
    if (sub && sub.textContent.indexOf("24") < 0) sub.textContent = "الرسائل تبقى 24 ساعة ثم تُحذف تلقائياً.";
    if (!list) return;
    var items = fresh(read(LOG));
    write(LOG, items);
    items.forEach(function (m) {
      if (list.querySelector('[data-log-id="' + m.id + '"]')) return;
      var row = document.createElement("div");
      row.className = "anon-msg";
      row.setAttribute("data-log-id", m.id);
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = "محفوظة 24 ساعة · " + new Date(m.at).toLocaleString("ar");
      var body = document.createElement("div");
      body.className = "text";
      body.textContent = split(m.text).text;
      row.appendChild(meta);
      row.appendChild(body);
      list.appendChild(row);
    });
    Array.prototype.forEach.call(list.querySelectorAll(".text"), function (node) {
      var parts = split(node.textContent);
      if (parts.sender) node.textContent = parts.text;
    });
  }
  var hits = [];
  var orig = window.fetch;
  window.fetch = function (url, opts) {
    var target = String(url || "");
    var method = ((opts && opts.method) || "GET").toUpperCase();
    if (method === "POST" && /workers\.dev/.test(target)) {
      var now = Date.now();
      hits = hits.filter(function (t) { return now - t < 60000; });
      if (hits.length >= 8) return Promise.resolve(new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }));
      hits.push(now);
    }
    if (target.indexOf("/messages") > 0 && method === "POST") {
      if (banned(senderId())) return Promise.resolve(new Response(JSON.stringify({ error: "banned" }), { status: 403 }));
      try {
        var body = JSON.parse(opts.body || "{}");
        body.text = stamp(body.text || "");
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
        var box = (target.match(/boxes\/([^/]+)\/messages/) || [])[1] || "";
        remember(decodeURIComponent(box), body.text);
      } catch (e) {}
    }
    return orig.apply(this, arguments).then(function (res) {
      if (target.indexOf("/messages") > 0 && method === "GET") setTimeout(paint, 40);
      return res;
    });
  };
  fetch("js/moderation.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (data) {
    var remote = (data && data.bans) || [];
    var merged = bans();
    remote.forEach(function (id) { if (merged.indexOf(id) < 0) merged.push(id); });
    write(BANS, merged);
  }).catch(function () {});
  setInterval(paint, 1500);
})();
