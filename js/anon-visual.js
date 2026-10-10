(function () {
  "use strict";
  var KEY = "marca_avatar_v1";
  var blob = null;
  var lastSize = [1080, 1920];

  function $(id) { return document.getElementById(id); }
  function store() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function profile() { try { return JSON.parse(localStorage.getItem("marca_anon_v4") || "{}").profile || null; } catch (e) { return null; } }
  function boxId() {
    var p = profile();
    if (p && p.id) return p.id;
    var m = (location.hash || "").match(/^#q\/([^/#?]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function photoFor(id) {
    var data = store();
    if (id && data.boxes && data.boxes[id]) return data.boxes[id];
    return data.self || "";
  }
  function applyPhoto(el, url) {
    if (!el || !url) return;
    el.style.backgroundImage = "url(" + url + ")";
    el.classList.add("has-photo");
    el.textContent = "";
  }
  function paint() {
    var url = photoFor(boxId()) || store().self;
    applyPhoto($("anon-my-avatar"), url);
    applyPhoto($("anon-ask-avatar"), url);
    applyPhoto($("anon-card-avatar"), url);
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onload = function () {
        img.onload = function () {
          var size = 360, canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext("2d");
          var scale = Math.max(size / img.width, size / img.height);
          var w = img.width * scale, h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.86));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function bindPhoto() {
    var input = $("anon-photo");
    if (!input || input.getAttribute("data-bound") === "1") return;
    input.setAttribute("data-bound", "1");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      readFile(file).then(function (url) {
        var data = store();
        data.self = url;
        data.boxes = data.boxes || {};
        var id = boxId();
        if (id) data.boxes[id] = url;
        save(data);
        paint();
      }).catch(function () {});
    });
  }
  function maxSize() {
    var options = [[2160, 3840], [1440, 2560], [1080, 1920]];
    for (var i = 0; i < options.length; i++) {
      try {
        var c = document.createElement("canvas");
        c.width = options[i][0];
        c.height = options[i][1];
        if (c.getContext("2d") && c.width === options[i][0]) return options[i];
      } catch (e) {}
    }
    return [1080, 1920];
  }
  function loadImage(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }
  function esc(s) { return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"); }
  function textImage(text, width, height, fontPx, color) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">'
      + '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" direction="rtl" unicode-bidi="plaintext" fill="' + color + '" font-size="' + fontPx + '" font-family="Cairo, Arial, sans-serif" font-weight="700">'
      + esc(text) + '</text></svg>';
    return loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  function linesOf(ctx, text, maxW) {
    var words = String(text || "—").split(/\s+/);
    var lines = [], line = "";
    words.forEach(function (word) {
      var next = line ? line + " " + word : word;
      if (ctx.measureText(next).width > maxW && line) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    return lines.slice(0, 8);
  }
  function round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function esc(s) { return String(s || "").replace(/&/g, "&").replace(/</g, "<"); }
  function textImage(text, w, h, px, color, weight) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" direction="rtl" fill="' + color + '" font-size="' + px + '" font-family="Cairo, Arial" font-weight="' + weight + '">' + esc(text) + '</text></svg>';
    return loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }
  function buildCard() {
    var size = maxSize();
    lastSize = size;
    var W = size[0], H = size[1];
    var canvas = $("anon-story-canvas") || document.createElement("canvas");
    canvas.id = "anon-story-canvas";
    canvas.hidden = true;
    if (!canvas.parentNode) document.body.appendChild(canvas);
    canvas.width = W; canvas.height = H;
    var q = (($("anon-q-in") && $("anon-q-in").value) || ($("anon-card-q") && $("anon-card-q").textContent) || "").trim() || "—";
    var a = (($("anon-a-in") && $("anon-a-in").value) || ($("anon-card-a") && $("anon-card-a").textContent) || "").trim() || "—";
    var ctx = canvas.getContext("2d");
    ctx.font = Math.round(W * 0.042) + "px Cairo, Arial";
    function lines(text) {
      var words = String(text).split(/\s+/), out = [], line = "";
      words.forEach(function (word) {
        var next = line ? line + " " + word : word;
        if (ctx.measureText(next).width > W * 0.62 && line) { out.push(line); line = word; } else line = next;
      });
      if (line) out.push(line);
      return out.slice(0, 5);
    }
    var qLines = lines(q), aLines = lines(a);
    var jobs = [textImage("مجهول", W, H * 0.06, W * 0.055, "#5041D2", 700), textImage("رسالة جديدة", W, H * 0.04, W * 0.032, "#6b7280", 500), textImage("الآن", W, H * 0.04, W * 0.03, "#111827", 600), textImage("الرد", W, H * 0.06, W * 0.055, "#5041D2", 700), textImage("جوابي", W, H * 0.04, W * 0.032, "#6b7280", 500)];
    qLines.forEach(function (line) { jobs.push(textImage(line, W, H * 0.05, W * 0.04, "#111827", 500)); });
    aLines.forEach(function (line) { jobs.push(textImage(line, W, H * 0.05, W * 0.04, "#111827", 500)); });
    return Promise.all(jobs).then(function (imgs) {
      var title = imgs[0], sub = imgs[1], now = imgs[2], titleA = imgs[3], subA = imgs[4];
      var qImgs = imgs.slice(5, 5 + qLines.length);
      var aImgs = imgs.slice(5 + qLines.length);
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#f5f3ff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(80,65,210,.12)";
      ctx.beginPath(); ctx.arc(W * 0.2, H * 0.12, W * 0.18, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(W * 0.82, H * 0.78, W * 0.16, 0, 7); ctx.fill();
      function card(y, h, tImg, sImg, body) {
        var x = W * 0.08, w = W * 0.84, r = W * 0.05;
        round(ctx, x, y, w, h, r);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.strokeStyle = "rgba(80,65,210,.55)"; ctx.lineWidth = Math.max(2, W * 0.003); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + w - W * 0.1, y + H * 0.055, W * 0.045, 0, 7);
        ctx.strokeStyle = "#5041D2"; ctx.stroke();
        ctx.fillStyle = "#5041D2"; ctx.beginPath(); ctx.arc(x + w - W * 0.1, y + H * 0.05, W * 0.02, 0, 7); ctx.fill();
        if (tImg) ctx.drawImage(tImg, x + W * 0.16, y + H * 0.02, W * 0.28, H * 0.05);
        if (sImg) ctx.drawImage(sImg, x + W * 0.16, y + H * 0.065, W * 0.28, H * 0.035);
        if (now) ctx.drawImage(now, x + W * 0.04, y + H * 0.035, W * 0.16, H * 0.035);
        var by = y + H * 0.15;
        body.forEach(function (img) { if (img) { ctx.drawImage(img, x, by, w, H * 0.045); by += H * 0.05; } });
      }
      var gap = H * 0.03, top = H * 0.08, ch = (H - top * 2 - gap) / 2;
      card(top, ch, title, sub, qImgs);
      card(top + ch + gap, ch, titleA, subA, aImgs);
      var note = $("anon-res-note");
      if (note) note.textContent = "صورة الستوري " + W + "×" + H;
      return new Promise(function (resolve) { canvas.toBlob(function (b) { blob = b; resolve(b); }, "image/png"); });
    });
  }
  function download() {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "marca-anon-" + lastSize[0] + "x" + lastSize[1] + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function shareImage() {
    if (!blob) return download();
    var file = new File([blob], "marca-anon-story.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: "رسالة المجهول" }).catch(function () {});
    else download();
  }
  function hijack() {
    ["anon-download-story", "anon-share-story", "anon-make-card"].forEach(function (id) {
      var btn = $(id);
      if (!btn || btn.getAttribute("data-visual") === "11") return;
      btn.setAttribute("data-visual", "11");
      btn.addEventListener("click", function (e) {
        if (id === "anon-make-card") {
          var q = $("anon-q-in") && $("anon-q-in").value;
          var a = $("anon-a-in") && $("anon-a-in").value;
          if ($("anon-card-q")) $("anon-card-q").textContent = q || "";
          if ($("anon-card-a")) $("anon-card-a").textContent = a || "";
          return;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        buildCard().then(id === "anon-share-story" ? shareImage : download);
      }, true);
    });
    bindPhoto();
    paint();
  }
  function boot() {
    hijack();
    window.addEventListener("hashchange", function () { setTimeout(hijack, 40); });
    setInterval(hijack, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
