/* Explicit Turnstile widgets: one token per protected action, reset after use. */
(function () {
  "use strict";
  var widgets = Object.create(null);
  var tokens = Object.create(null);
  var pending = Object.create(null);
  var attempts = 0;
  var originalFetch = window.fetch;

  function siteKey() {
    return String((window.MARCA_CONFIG || {}).TURNSTILE_SITE_KEY || "");
  }
  function visible(id) {
    var el = document.getElementById(id);
    return !!(el && el.offsetParent !== null);
  }
  function render(id) {
    if (!siteKey() || widgets[id] !== undefined) return;
    if (!window.turnstile || typeof window.turnstile.render !== "function") {
      if (!pending[id] && attempts < 100) {
        pending[id] = true;
        setTimeout(function () { pending[id] = false; attempts += 1; render(id); }, 100);
      }
      return;
    }
    var el = document.getElementById(id);
    if (!el || !visible(id)) return;
    widgets[id] = window.turnstile.render(el, {
      sitekey: siteKey(),
      callback: function (token) { tokens[id] = token; },
      "expired-callback": function () { tokens[id] = null; },
      "error-callback": function () { tokens[id] = null; },
    });
  }
  function actionId(url) {
    var u = String(url || "");
    if (/\/v1\/auth\/register$/.test(u)) return visible("seller-ts-register") ? "seller-ts-register" : "anon-ts-reg";
    if (/\/v1\/auth\/login$/.test(u)) return visible("seller-ts-login") ? "seller-ts-login" : "anon-ts-login";
    if (/\/v1\/boxes$/.test(u)) return "anon-ts-create";
    if (/\/messages$/.test(u)) return "anon-ts-ask";
    if (/\/v1\/orders\/track$/.test(u)) return visible("track-ts-snap") ? "track-ts-snap" : "track-ts-gift";
    return null;
  }
  if (typeof originalFetch === "function") {
    window.fetch = function (input, init) {
      init = init || {};
      var id = actionId(typeof input === "string" ? input : input && input.url);
      var injected = false;
      if (id && init.body && !/FormData|URLSearchParams/.test(Object.prototype.toString.call(init.body))) {
        try {
          var body = JSON.parse(init.body);
          if (body && !body.turnstile_token && tokens[id]) {
            body.turnstile_token = tokens[id];
            init = Object.assign({}, init, { body: JSON.stringify(body) });
            injected = true;
          }
        } catch (_) {}
      }
      var result = originalFetch.call(this, input, init);
      if (injected && window.MarcaTurnstile) window.MarcaTurnstile.reset(id);
      return result;
    };
  }
  window.MarcaTurnstile = {
    mount: render,
    token: function (id) { return tokens[id] || null; },
    reset: function (id) {
      tokens[id] = null;
      if (window.turnstile && widgets[id] !== undefined) window.turnstile.reset(widgets[id]);
    },
  };
  function scan() {
    ["anon-ts-reg", "anon-ts-login", "anon-ts-create", "anon-ts-ask", "seller-ts-login", "seller-ts-register", "admin-ts-mirror", "track-ts-snap", "track-ts-gift"].forEach(function (id) {
      if (visible(id)) render(id);
    });
  }
  new MutationObserver(scan).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "style"] });
  setTimeout(scan, 0);
})();
