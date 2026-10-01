/**
 * CSP-safe anon bootstrap: load panels HTML then anon.js (no inline scripts).
 */
(function () {
  "use strict";
  var VER = "4";
  function loadAnonJs() {
    var s = document.createElement("script");
    s.src = "js/anon.js?v=" + VER;
    s.defer = true;
    document.body.appendChild(s);
  }
  var slot = document.getElementById("anon-root");
  if (!slot) {
    loadAnonJs();
    return;
  }
  fetch("anon-panels.html?v=" + VER, { credentials: "same-origin" })
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
