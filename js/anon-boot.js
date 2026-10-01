/**
 * CSP-safe anon bootstrap: load panels HTML then anon.js (no inline scripts).
 */
(function () {
  "use strict";
  function loadAnonJs() {
    var s = document.createElement("script");
    s.src = "js/anon.js";
    s.defer = true;
    document.body.appendChild(s);
  }
  var slot = document.getElementById("anon-root");
  if (!slot) {
    loadAnonJs();
    return;
  }
  fetch("anon-panels.html", { credentials: "same-origin" })
    .then(function (r) {
      if (!r.ok) throw new Error("panels");
      return r.text();
    })
    .then(function (t) {
      slot.outerHTML = t;
      loadAnonJs();
    })
    .catch(function () {
      loadAnonJs();
    });
})();
