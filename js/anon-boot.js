/**
 * CSP-safe anon bootstrap: early nav wire + panels + anon.js (no inline scripts).
 * Fixes dead click when anon.js loads after DOMContentLoaded.
 */
(function () {
  "use strict";
  var VER = "9";
  var pendingOpen = false;

  function openAnon(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.MarcaAnon && typeof window.MarcaAnon.open === "function") {
      window.MarcaAnon.open();
      return;
    }
    pendingOpen = true;
    try {
      location.hash = "#anon";
    } catch (err) {}
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (window.MarcaAnon && typeof window.MarcaAnon.open === "function") {
        clearInterval(t);
        pendingOpen = false;
        window.MarcaAnon.open();
      } else if (n > 60) {
        clearInterval(t);
      }
    }, 50);
  }

  function wireNav() {
    var nodes = document.querySelectorAll('#btn-anon-nav, [data-action="open-anon"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAttribute("data-anon-wired") === "1") continue;
      el.setAttribute("data-anon-wired", "1");
      el.addEventListener("click", openAnon);
    }
  }

  function loadAnonJs() {
    if (document.querySelector("script[data-anon-js]")) return;
    var s = document.createElement("script");
    s.src = "js/anon.js?v=" + VER;
    s.setAttribute("data-anon-js", "1");
    s.onload = function () {
      var visual = document.createElement("script");
      visual.src = "js/anon-visual.js?v=" + VER;
      document.body.appendChild(visual);
      if (pendingOpen || (location.hash || "").indexOf("#anon") === 0 || (location.hash || "").indexOf("#q/") === 0) {
        if (window.MarcaAnon) {
          if (pendingOpen && window.MarcaAnon.open) window.MarcaAnon.open();
          else if (window.MarcaAnon.route) window.MarcaAnon.route();
        }
        pendingOpen = false;
      }
    };
    document.body.appendChild(s);
  }

  function start() {
    wireNav();
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
        wireNav();
        loadAnonJs();
      })
      .catch(function () {
        loadAnonJs();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  window.openAnon = openAnon;
})();
