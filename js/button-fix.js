/**
 * Marça button audit: make every control do something real; hide leftovers via CSS.
 * Loads after store.js / app.js. Does not invent cart/account/login.
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function goHomeUI() {
    if (window.MarcaApp && typeof window.MarcaApp.goHome === "function") {
      window.MarcaApp.goHome({ noScroll: true });
      return;
    }
    var home = document.getElementById("panel-home");
    if (!home) return;
    document.querySelectorAll(".panel").forEach(function (p) {
      var on = p === home;
      p.classList.toggle("active", on);
      p.setAttribute("aria-hidden", on ? "false" : "true");
    });
    var flow = document.getElementById("itunes-block");
    if (flow) flow.hidden = true;
    var anon = document.getElementById("panel-anon");
    if (anon) {
      anon.classList.remove("active");
      anon.setAttribute("aria-hidden", "true");
    }
  }

  function setCatOn(targetId) {
    var nav = document.getElementById("ts-cats");
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      a.classList.toggle("is-on", (a.getAttribute("data-nav-target") || "") === targetId);
    });
  }

  function jumpTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try {
      el.scrollIntoView({ block: "start", inline: "nearest" });
    } catch (e) {
      var y = el.getBoundingClientRect().top + (window.pageYOffset || 0) - 130;
      window.scrollTo(0, y > 0 ? y : 0);
    }
  }

  function expandSection(id) {
    var sec = document.getElementById(id);
    if (sec && typeof sec._fillAll === "function") sec._fillAll();
  }

  function openApple() {
    var card = document.getElementById("apple-product-card") || document.querySelector('[data-brand="apple"]');
    if (card) card.click();
  }

  function goTarget(target) {
    if (!target) return;
    goHomeUI();
    if (target === "apple") {
      setCatOn("cat-entertainment");
      setTimeout(openApple, 40);
      return;
    }
    if (target.indexOf("cat-") === 0) {
      expandSection(target);
      setCatOn(target);
      setTimeout(function () {
        jumpTo(target);
      }, 50);
      return;
    }
    if (target === "popular-grid" || target === "catalog-sections" || target === "section-gifts") {
      if (target === "catalog-sections") {
        Array.prototype.forEach.call(document.querySelectorAll(".ts-cat-section"), function (s) {
          if (typeof s._fillAll === "function") s._fillAll();
        });
      }
      setCatOn(target === "popular-grid" ? "popular-grid" : "cat-games");
      setTimeout(function () {
        jumpTo(target);
      }, 50);
    }
  }

  function wireNav() {
    function onNavClick(e) {
      var a = e.target.closest ? e.target.closest("[data-nav-target]") : null;
      if (!a) return;
      e.preventDefault();
      goTarget(a.getAttribute("data-nav-target"));
    }
    var cats = document.getElementById("ts-cats");
    var icons = document.getElementById("ts-icon-cats");
    if (cats && cats.getAttribute("data-bf-wired") !== "1") {
      cats.setAttribute("data-bf-wired", "1");
      cats.addEventListener("click", onNavClick);
    }
    if (icons && icons.getAttribute("data-bf-wired") !== "1") {
      icons.setAttribute("data-bf-wired", "1");
      icons.addEventListener("click", onNavClick);
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-go-catalog]"), function (a) {
      if (a.getAttribute("data-bf-wired") === "1") return;
      a.setAttribute("data-bf-wired", "1");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        goTarget("catalog-sections");
      });
    });
  }

  function wireSearch() {
    var input = document.getElementById("catalog-search");
    var btn = document.getElementById("catalog-search-btn");
    if (!input) return;

    function filterPopular() {
      var q = String(input.value || "").trim().toLowerCase();
      var popular = document.getElementById("popular-grid");
      if (popular) {
        Array.prototype.forEach.call(popular.querySelectorAll(".brand-tile"), function (t) {
          var label = (t.getAttribute("aria-label") || t.textContent || "").toLowerCase();
          t.hidden = !!q && label.indexOf(q) < 0;
        });
      }
      var snap = document.querySelector('[data-product-id="snapchat-plus"]');
      if (snap) {
        if (!snap.getAttribute("data-search"))
          snap.setAttribute("data-search", "سناب شات بلس snapchat plus snap");
        var t = (snap.getAttribute("data-search") || "").toLowerCase();
        snap.hidden = !!q && t.indexOf(q) < 0;
      }
    }

    if (input.getAttribute("data-bf-wired") !== "1") {
      input.setAttribute("data-bf-wired", "1");
      input.addEventListener("input", filterPopular);
    }
    if (btn && btn.getAttribute("data-bf-wired") !== "1") {
      btn.setAttribute("data-bf-wired", "1");
      btn.addEventListener("click", function () {
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        filterPopular();
        if (String(input.value || "").trim()) {
          goHomeUI();
          var first =
            document.querySelector("#product-grid .product-card:not([hidden])") ||
            document.querySelector("#catalog-sections .product-card:not([hidden])");
          if (first) {
            try {
              first.scrollIntoView({ block: "center", inline: "nearest" });
            } catch (e) {}
          } else jumpTo("catalog-sections");
        }
      });
    }
  }

  function wireWhatsApp() {
    var wa = document.getElementById("itunes-wa");
    if (wa) {
      wa.setAttribute("target", "_blank");
      wa.setAttribute("rel", "noopener noreferrer");
    }
    var snapWa = document.getElementById("btn-whatsapp");
    if (snapWa) {
      snapWa.setAttribute("target", "_blank");
      snapWa.setAttribute("rel", "noopener noreferrer");
    }
  }

  function ensureNavAttrs() {
    Array.prototype.forEach.call(document.querySelectorAll("#ts-cats a, #ts-icon-cats a"), function (a) {
      if (a.getAttribute("data-nav-target")) return;
      var href = a.getAttribute("href") || "";
      if (href.indexOf("#cat-") === 0) a.setAttribute("data-nav-target", href.slice(1));
      else if (href === "#popular-grid") a.setAttribute("data-nav-target", "popular-grid");
      else if (href === "#apple-product-card") a.setAttribute("data-nav-target", "apple");
    });
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#catalog-sections"], a[href="#section-gifts"]'), function (a) {
      if (a.closest && a.closest(".ts-popular-head, .ts-section-head")) {
        a.setAttribute("data-go-catalog", "1");
        a.setAttribute("href", "#catalog-sections");
      }
    });
    var searchBtn = document.querySelector(".ts-search button");
    if (searchBtn && !searchBtn.id) {
      searchBtn.id = "catalog-search-btn";
      searchBtn.removeAttribute("aria-hidden");
      searchBtn.removeAttribute("tabindex");
      searchBtn.setAttribute("aria-label", "بحث");
    }
  }

  function boot() {
    ensureNavAttrs();
    wireNav();
    wireSearch();
    wireWhatsApp();
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash === "apple-product-card" || hash === "apple") goTarget("apple");
    else if (hash.indexOf("cat-") === 0 || hash === "popular-grid" || hash === "catalog-sections") goTarget(hash);
  }

  ready(function () {
    setTimeout(boot, 30);
    setTimeout(boot, 300);
  });
})();
