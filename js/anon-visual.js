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
  function esc(s) {
    return String(s || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
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
    var q = (($("anon-card-q") && $("anon-card-q").textContent) || ($("anon-q-in") && $("anon-q-in").value) || "").trim();
    var a = (($("anon-card-a") && $("anon-card-a").textContent) || ($("anon-a-in") && $("anon-a-in").value) || "").trim();
    var name = (($("anon-card-name") && $("anon-card-name").textContent) || "").trim();
    var photo = photoFor(boxId()) || store().self || "";
    var pad = Math.round(W * 0.06);
    var html = ''
      + '<div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="box-sizing:border-box;width:' + W + 'px;height:' + H + 'px;padding:' + pad + 'px;background:#07070b;color:#fff8ea;font-family:Cairo,El Messiri,sans-serif;display:flex;flex-direction:column;gap:' + Math.round(H * 0.025) + 'px;">'
      + (photo ? '<img src="' + esc(photo) + '" style="width:' + Math.round(W * 0.22) + 'px;height:' + Math.round(W * 0.22) + 'px;object-fit:cover;border-radius:50%;border:' + Math.round(W * 0.008) + 'px solid #ffcc00;margin:0 auto;" />' : '')
      + (name ? '<div style="text-align:center;color:#ffe56a;font-size:' + Math.round(W * 0.045) + 'px;font-weight:700;">' + esc(name) + '</div>' : '')
      + '<div style="flex:1;border:' + Math.round(W * 0.004) + 'px solid rgba(255,204,0,.55);border-radius:' + Math.round(W * 0.04) + 'px;padding:' + Math.round(W * 0.04) + 'px;background:#141208;display:flex;flex-direction:column;">'
      + '<div style="text-align:center;color:#ffe56a;font-size:' + Math.round(W * 0.05) + 'px;font-weight:700;margin-bottom:' + Math.round(H * 0.02) + 'px;">رسالة المجهول</div>'
      + '<div style="white-space:pre-wrap;word-break:break-word;text-align:center;font-size:' + Math.round(W * 0.055) + 'px;line-height:1.45;color:#fff8ea;">' + esc(q || "—") + '</div></div>'
      + '<div style="flex:1;border:' + Math.round(W * 0.004) + 'px solid rgba(255,204,0,.75);border-radius:' + Math.round(W * 0.04) + 'px;padding:' + Math.round(W * 0.04) + 'px;background:#1a150c;display:flex;flex-direction:column;">'
      + '<div style="text-align:center;color:#ffcc00;font-size:' + Math.round(W * 0.05) + 'px;font-weight:700;margin-bottom:' + Math.round(H * 0.02) + 'px;">جوابي</div>'
      + '<div style="white-space:pre-wrap;word-break:break-word;text-align:center;font-size:' + Math.round(W * 0.055) + 'px;line-height:1.45;color:#fff8ea;">' + esc(a || "—") + '</div></div>'
      + '<div style="text-align:center;color:rgba(255,229,106,.7);font-size:' + Math.round(W * 0.03) + 'px;">marça.online</div>'
      + '</div>';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><foreignObject width="100%" height="100%">' + html + '</foreignObject></svg>';
    return loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)).then(function (img) {
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#07070b";
      ctx.fillRect(0, 0, W, H);
      if (img) ctx.drawImage(img, 0, 0, W, H);
      var note = $("anon-res-note");
      if (note) note.textContent = "صورة الستوري " + W + "×" + H + " · السؤال والرد ظاهران";
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
