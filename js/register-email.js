/* Adds the optional email field to /v1/auth/register requests (seller + anon forms). */
(function () {
  "use strict";
  var orig = window.fetch;
  if (typeof orig !== "function") return;
  function val(id) {
    var el = document.getElementById(id);
    return el && el.offsetParent !== null ? String(el.value || "").trim() : "";
  }
  window.fetch = function (input, init) {
    var u = String(typeof input === "string" ? input : (input && input.url) || "");
    if (/\/v1\/auth\/register$/.test(u) && init && typeof init.body === "string") {
      var email = val("reg-email") || val("anon-reg-email");
      if (email) {
        try {
          var b = JSON.parse(init.body);
          if (b && typeof b === "object" && !b.email) { b.email = email.toLowerCase(); init = Object.assign({}, init, { body: JSON.stringify(b) }); }
        } catch (e) {}
      }
    }
    return orig.call(this, input, init);
  };
})();
