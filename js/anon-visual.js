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
  function buildCard() {
    var size = maxSize();
    lastSize = size;
    var W = size[0], H = size[1];
    var canvas = $("anon-story-canvas") || document.createElement("canvas");
    canvas.id = "anon-story-canvas";
    canvas.hidden = true;
    if (!canvas.parentNode) document.body.appendChild(canvas);
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var q = (($("anon-q-in") && $("anon-q-in").value) || ($("anon-card-q") && $("anon-card-q").textContent) || "").trim() || "—";
    var a = (($("anon-a-in") && $("anon-a-in").value) || ($("anon-card-a") && $("anon-card-a").textContent) || "").trim() || "—";
    var name = (($("anon-card-name") && $("anon-card-name").textContent) || "").replace(/^رد\s+/, "").trim();
    ctx.font = Math.round(W * 0.045) + "px Cairo, Arial, sans-serif";
    var qLines = linesOf(ctx, q, W * 0.72);
    var aLines = linesOf(ctx, a, W * 0.72);
    var jobs = [textImage("رسالة المجهول", W, Math.round(H * 0.06), Math.round(W * 0.055), "#ffe56a"), textImage("جوابي", W, Math.round(H * 0.06), Math.round(W * 0.055), "#ffcc00")];
    qLines.forEach(function (line) { jobs.push(textImage(line, W, Math.round(H * 0.055), Math.round(W * 0.046), "#fff8ea")); });
    aLines.forEach(function (line) { jobs.push(textImage(line, W, Math.round(H * 0.055), Math.round(W * 0.046), "#fff8ea")); });
    if (name) jobs.push(textImage(name, W, Math.round(H * 0.05), Math.round(W * 0.04), "#ffe56a"));
    return Promise.all(jobs).then(function (imgs) {
      var titleQ = imgs[0], titleA = imgs[1], cursor = 2;
      var qImgs = imgs.slice(cursor, cursor + qLines.length); cursor += qLines.length;
      var aImgs = imgs.slice(cursor, cursor + aLines.length); cursor += aLines.length;
      var nameImg = name ? imgs[cursor] : null;
      ctx.fillStyle = "#07070b";
      ctx.fillRect(0, 0, W, H);
      var margin = Math.round(W * 0.06);
      var top = margin;
      if (nameImg) { ctx.drawImage(nameImg, 0, top, W, Math.round(H * 0.05)); top += Math.round(H * 0.07); }
      var footer = Math.round(H * 0.05);
      var gap = Math.round(H * 0.03);
      var cardH = Math.floor((H - top - footer - gap - margin) / 2);
      function card(y, titleImg, bodyImgs) {
        round(ctx, margin, y, W - margin * 2, cardH, Math.round(W * 0.04));
        ctx.fillStyle = "#141208";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,204,0,0.7)";
        ctx.lineWidth = Math.max(2, Math.round(W * 0.004));
        ctx.stroke();
        if (titleImg) ctx.drawImage(titleImg, margin, y + Math.round(cardH * 0.04), W - margin * 2, Math.round(H * 0.06));
        var by = y + Math.round(cardH * 0.22);
        bodyImgs.forEach(function (img) {
          if (!img) return;
          ctx.drawImage(img, margin, by, W - margin * 2, Math.round(H * 0.055));
          by += Math.round(H * 0.06);
        });
      }
      card(top, titleQ, qImgs);
      card(top + cardH + gap, titleA, aImgs);
      ctx.fillStyle = "rgba(255,229,106,0.7)";
      ctx.font = Math.round(W * 0.03) + "px Cairo, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("marça.online", W / 2, H - Math.round(margin * 0.45));
      var note = $("anon-res-note");
      if (note) note.textContent = "السؤال والرد داخل الصورة · " + W + "×" + H;
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
