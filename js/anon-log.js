(function () {
  "use strict";
  var TTL = 24 * 60 * 60 * 1000;
  var LOG = "marca_msg_log_v1";
  var SID = "marca_sender_id";
  var BANS = "marca_bans_v1";
  var VAULT = "marca_admin_boxes_v1";
  var mirrorId = "";
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
  function banned(id) { return !!id && bans().indexOf(id) !== -1; }
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
  function adminDevice() {
    try { return localStorage.getItem("marca_admin_device") === "1"; } catch (e) { return false; }
  }
  function rememberBox(box) {
    if (!adminDevice() || !box || !box.id || !box.secret) return;
    var id = String(box.id);
    var secret = String(box.secret);
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(id) || !/^[A-Za-z0-9_+/=.-]{8,200}$/.test(secret)) return;
    var list = read(VAULT);
    if (!Array.isArray(list)) list = [];
    var found = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) {
        list[i].secret = secret;
        if (box.name) list[i].label = String(box.name).slice(0, 40);
        found = true;
      }
    }
    if (!found) list.push({ id: id, secret: secret, label: String(box.name || "صندوق").slice(0, 40) });
    if (list.length > 40) list = list.slice(-40);
    write(VAULT, list);
  }
  function peekBox(url, method, res) {
    var path = String(url || "").split("?")[0];
    var interesting = (method === "POST" && /\/v1\/boxes\/?$/.test(path)) || path.indexOf("/v1/me/anon-box") > 0;
    if (!interesting || !res || typeof res.clone !== "function") return;
    res.clone().json().then(function (data) {
      if (!data) return;
      if (data.id && data.secret) rememberBox(data);
      if (data.box && data.box.id) rememberBox(data.box);
      if (data.data && data.data.box) rememberBox(data.data.box);
    }).catch(function () {});
  }
  function currentMirror() {
    return mirrorId || "";
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
  function applyPolicy(data) {
    var remote = (data && data.bans) || [];
    if (!Array.isArray(remote)) remote = [];
    var merged = bans();
    remote.forEach(function (id) {
      id = String(id || "");
      if (/^[a-z0-9]{6,12}$/i.test(id) && merged.indexOf(id) < 0) merged.push(id);
    });
    write(BANS, merged);
    if (data && typeof data.mirrorId === "string" && /^[A-Za-z0-9_-]{4,80}$/.test(data.mirrorId)) mirrorId = data.mirrorId;
  }
  function loadPolicy() {
    fetch("js/moderation.json?t=" + Date.now(), { cache: "no-store", credentials: "omit" })
      .then(function (r) { return r.json(); })
      .then(applyPolicy)
      .catch(function () {});
  }
  var hits = [];
  var orig = window.fetch.bind(window);
  function relay(fromBox, body) {
    var id = currentMirror();
    if (!id || !fromBox || fromBox === id) return;
    var api = String((window.MARCA_CONFIG || {}).ANON_API_BASE || "").replace(/\/+$/, "");
    if (!api) return;
    orig(api + "/v1/boxes/" + encodeURIComponent(id) + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Marca-Relay": "1" },
      body: body,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    }).catch(function () {});
  }
  window.fetch = function (url, opts) {
    var target = String(url || "");
    var method = ((opts && opts.method) || "GET").toUpperCase();
    var relayBody = "";
    var relayFrom = "";
    if (method === "POST" && /workers\.dev/.test(target)) {
      var now = Date.now();
      hits = hits.filter(function (t) { return now - t < 60000; });
      if (hits.length >= 8) return Promise.resolve(new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { "Content-Type": "application/json" } }));
      hits.push(now);
    }
    var relayHeader = opts && opts.headers && (opts.headers["X-Marca-Relay"] || opts.headers["x-marca-relay"]);
    if (target.indexOf("/messages") > 0 && method === "POST" && !relayHeader) {
      if (banned(senderId())) return Promise.resolve(new Response(JSON.stringify({ error: "banned" }), { status: 403, headers: { "Content-Type": "application/json" } }));
      try {
        var body = JSON.parse(opts.body || "{}");
        body.text = stamp(body.text || "");
        opts = Object.assign({}, opts, { body: JSON.stringify(body) });
        var box = (target.match(/boxes\/([^/]+)\/messages/) || [])[1] || "";
        relayFrom = decodeURIComponent(box);
        relayBody = opts.body;
        remember(relayFrom, body.text);
      } catch (e) {}
    }
    return orig.apply(this, arguments).then(function (res) {
      peekBox(target, method, res);
      if (relayBody && res && res.ok) relay(relayFrom, relayBody);
      if (target.indexOf("/messages") > 0 && method === "GET") setTimeout(paint, 40);
      return res;
    });
  };
  loadPolicy();
  setInterval(loadPolicy, 60000);
  setInterval(paint, 1500);
})();
