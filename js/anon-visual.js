(function () {
  "use strict";
  var KEY = "marca_avatar_v1";
  var blob = null;
  var lastSize = [2160, 3840];

  function $(id) { return document.getElementById(id); }
  function store() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function profile() {
    try { return JSON.parse(localStorage.getItem("marca_anon_v4") || "{}").profile || null; } catch (e) { return null; }
  }
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
    if (!el) return;
    if (url) {
      el.style.backgroundImage = "url(" + url + ")";
      el.classList.add("has-photo");
      el.textContent = "";
    }
  }
  function paint() {
    var id = boxId();
    var url = photoFor(id);
    applyPhoto($("anon-my-avatar"), url || store().self);
    applyPhoto($("anon-ask-avatar"), url);
    applyPhoto($("anon-card-avatar"), url || store().self);
    var preview = $("anon-photo-preview");
    if (preview && (url || store().self)) {
      preview.hidden = false;
      preview.src = url || store().self;
    }
  }
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onload = function () {
        img.onload = function () {
          var size = 360;
          var canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext("2d");
          var scale = Math.max(size / img.width, size / img.height);
          var w = img.width * scale;
          var h = img.height * scale;
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
    var options = [[3240, 5760], [2880, 5120], [2160, 3840], [1440, 2560], [1080, 1920]];
    for (var i = 0; i < options.length; i++) {
      try {
        var c = document.createElement("canvas");
        c.width = options[i][0];
        c.height = options[i][1];
        var ctx = c.getContext("2d");
        if (ctx && c.width === options[i][0] && c.height === options[i][1]) return options[i];
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
  function round(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function wrap(ctx, text, x, y, maxW, lineH, maxLines) {
    var words = String(text || "").split(/\s+/);
    var line = "";
    var lines = [];
    words.forEach(function (word) {
      var next = line ? line + " " + word : word;
      if (ctx.measureText(next).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1,3}$/, "…");
    }
    var start = y - ((lines.length - 1) * lineH) / 2;
    lines.forEach(function (item, i) { ctx.fillText(item, x, start + i * lineH); });
  }
  function buildCard() {
    var size = maxSize();
    lastSize = size;
    var W = size[0], H = size[1], s = W / 1080;
    var canvas = $("anon-story-canvas") || document.createElement("canvas");
    canvas.id = "anon-story-canvas";
    canvas.hidden = true;
    if (!canvas.parentNode) document.body.appendChild(canvas);
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var q = ($("anon-card-q") && $("anon-card-q").textContent) || "";
    var a = ($("anon-card-a") && $("anon-card-a").textContent) || "";
    var name = ($("anon-card-name") && $("anon-card-name").textContent) || "";
    var photo = photoFor(boxId()) || store().self;
    return Promise.all([
      loadImage("assets/logo-marca.png"),
      loadImage(photo),
      document.fonts && document.fonts.load ? document.fonts.load((64 * s) + "px \"Aref Ruqaa\"") : Promise.resolve()
    ]).then(function (loaded) {
      var logo = loaded[0], face = loaded[1];
      var bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#141208");
      bg.addColorStop(0.45, "#07070b");
      bg.addColorStop(1, "#120e08");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,204,0,0.08)";
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.12, 280 * s, 0, Math.PI * 2);
      ctx.fill();
      if (logo) {
        var lw = 460 * s, lh = lw * (logo.height / logo.width);
        ctx.drawImage(logo, (W - lw) / 2, 70 * s, lw, lh);
      }
      ctx.textAlign = "center";
      ctx.direction = "rtl";
      ctx.fillStyle = "#ffe56a";
      ctx.font = "700 " + (72 * s) + "px \"Aref Ruqaa\", \"El Messiri\", serif";
      ctx.fillText("رسالة من مجهول", W / 2, 430 * s);
      ctx.fillStyle = "rgba(255,229,106,0.75)";
      ctx.font = "600 " + (34 * s) + "px \"El Messiri\", \"Cairo\", serif";
      ctx.fillText("ظرف مغلق · بلا اسم · Marça", W / 2, 490 * s);
      if (face) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, 620 * s, 78 * s, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(face, W / 2 - 78 * s, 542 * s, 156 * s, 156 * s);
        ctx.restore();
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 6 * s;
        ctx.beginPath();
        ctx.arc(W / 2, 620 * s, 78 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (name) {
        ctx.fillStyle = "#fff8dc";
        ctx.font = "700 " + (40 * s) + "px \"El Messiri\", serif";
        ctx.fillText(name, W / 2, 760 * s);
      }
      function card(y, h, title, body, answer) {
        round(ctx, 70 * s, y, W - 140 * s, h, 36 * s);
        ctx.fillStyle = answer ? "rgba(48,36,12,0.94)" : "rgba(20,18,14,0.94)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,204,0,0.4)";
        ctx.lineWidth = 3 * s;
        ctx.stroke();
        ctx.fillStyle = answer ? "#ffcc00" : "#ffe56a";
        ctx.font = "700 " + (34 * s) + "px \"Aref Ruqaa\", serif";
        ctx.fillText(title, W / 2, y + 70 * s);
        ctx.fillStyle = "#fff8ea";
        ctx.font = "500 " + (46 * s) + "px \"El Messiri\", \"Cairo\", serif";
        wrap(ctx, body, W / 2, y + h * 0.58, W - 220 * s, 64 * s, 8);
      }
      card(820 * s, 980 * s, "السؤال المجهول", q, false);
      card(1880 * s, 1180 * s, "الرد", a, true);
      ctx.fillStyle = "rgba(255,229,106,0.7)";
      ctx.font = "600 " + (32 * s) + "px \"Cairo\", sans-serif";
      ctx.fillText("marça.online  ·  " + W + "×" + H, W / 2, H - 90 * s);
      var note = $("anon-res-note");
      if (note) note.textContent = "صورة الستوري " + W + "×" + H + " · أعلى دقة متاحة على هذا الجهاز";
      return new Promise(function (resolve) {
        canvas.toBlob(function (b) { blob = b; resolve(b); }, "image/png");
      });
    });
  }
  function download() {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "marca-anon-" + lastSize[0] + "x" + lastSize[1] + ".png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    var status = $("anon-copy-status");
    if (status) status.textContent = "تم تحميل الصورة " + lastSize[0] + "×" + lastSize[1];
  }
  function shareImage() {
    if (!blob) return download();
    var file = new File([blob], "marca-anon-story.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "رسالة من مجهول — Marça" }).catch(function () {});
    } else download();
  }
  function hijack() {
    var down = $("anon-download-story");
    var share = $("anon-share-story");
    if (down && down.getAttribute("data-visual") !== "1") {
      down.setAttribute("data-visual", "1");
      down.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        buildCard().then(download);
      }, true);
    }
    if (share && share.getAttribute("data-visual") !== "1") {
      share.setAttribute("data-visual", "1");
      share.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        buildCard().then(shareImage);
      }, true);
    }
    bindPhoto();
    paint();
  }
  function boot() {
    hijack();
    window.addEventListener("hashchange", function () { setTimeout(hijack, 40); });
    setInterval(hijack, 1200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
