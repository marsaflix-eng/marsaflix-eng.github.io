/* Clickjacking guard: GitHub Pages cannot send frame-ancestors / X-Frame-Options, so refuse to run inside a frame. */
(function () {
  "use strict";
  if (window.top !== window.self) {
    document.documentElement.style.display = "none";
    try { window.top.location = window.self.location.href; } catch (e) {}
    throw new Error("framed");
  }
})();
