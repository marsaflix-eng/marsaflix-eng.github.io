/* Marça account pages: forgot/reset password, verify email, account settings. */
(function () {
  "use strict";
  var API = String((window.MARCA_CONFIG || {}).AFFILIATE_API_BASE || "").replace(/\/+$/, "");
  var KEY = "marca_seller_token";
  function $(id) { return document.getElementById(id); }
  function say(id, text, ok) { var el = $(id); if (!el) return; el.textContent = text || ""; el.className = "acc-msg " + (ok ? "ok" : "err"); }
  function token() {
    try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function strong(p) { return p.length >= 10 && p.length <= 64 && /[A-Za-z\u0600-\u06FF]/.test(p) && /[0-9]/.test(p); }
  function call(path, method, body, auth) {
    var h = { "Content-Type": "application/json" };
    if (auth) h.Authorization = "Bearer " + auth;
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, credentials: "omit", cache: "no-store" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d || {} }; }); })
      .catch(function () { return { status: 0, data: { error: "network" } }; });
  }
  var ERR = {
    weak_password: "كلمة السر ضعيفة: 10 أحرف على الأقل مع حرف ورقم.",
    invalid_or_expired: "الرابط غير صالح أو منتهي الصلاحية أو مستخدم من قبل.",
    rate_limited: "محاولات كثيرة. حاول لاحقاً.",
    turnstile_failed: "أكمل التحقق ثم أعد المحاولة.",
    email_not_configured: "خدمة البريد غير مفعّلة بعد. تواصل معنا عبر واتساب.",
    invalid_email: "البريد الإلكتروني غير صالح.",
    email_taken: "هذا البريد مستخدم في حساب آخر.",
    invalid_credentials: "كلمة السر الحالية غير صحيحة.",
    unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.",
    network: "خطأ في الشبكة.",
  };
  function errText(d) { return ERR[d && d.error] || "حدث خطأ. حاول مرة أخرى."; }
  function fragToken() {
    var m = /(?:^#|&)token=([A-Za-z0-9_-]{40,64})(?:&|$)/.exec(location.hash || "");
    return m ? m[1] : null;
  }
  function scrubFragment() {
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  function resetPage() {
    var t = fragToken();
    if (t) {
      scrubFragment();
      $("forgot-box").hidden = true;
      $("reset-box").hidden = false;
      $("reset-btn").addEventListener("click", function () {
        var p = $("reset-pass").value, p2 = $("reset-pass2").value;
        if (!strong(p)) return say("reset-msg", ERR.weak_password);
        if (p !== p2) return say("reset-msg", "كلمتا السر غير متطابقتين.");
        var b = $("reset-btn"); b.disabled = true;
        call("/v1/auth/reset-password", "POST", { token: t, new_password: p }).then(function (r) {
          b.disabled = false;
          if (r.data.ok) {
            t = null; b.hidden = true; $("reset-done").hidden = false;
            try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch (e) {}
            say("reset-msg", "تم تغيير كلمة السر. سجّل الدخول بكلمة السر الجديدة.", true);
          } else say("reset-msg", errText(r.data));
        });
      });
      return;
    }
    $("forgot-btn").addEventListener("click", function () {
      var v = $("forgot-id").value.trim();
      if (v.length < 6) return say("forgot-msg", "أدخل البريد أو رقم الهاتف.");
      var body = v.indexOf("@") > 0 ? { email: v } : { phone: v };
      var b = $("forgot-btn"); b.disabled = true;
      call("/v1/auth/forgot-password", "POST", body).then(function (r) {
        b.disabled = false;
        if (r.data.ok) say("forgot-msg", r.data.message || "إن كان هناك حساب مرتبط ببريد مؤكد، فستصلك رسالة خلال دقائق.", true);
        else say("forgot-msg", errText(r.data));
      });
    });
  }

  function verifyPage() {
    var t = fragToken();
    scrubFragment();
    if (!t) return say("verify-msg", ERR.invalid_or_expired);
    call("/v1/auth/verify-email", "POST", { token: t }).then(function (r) {
      if (r.data.ok) say("verify-msg", "تم تأكيد بريدك الإلكتروني بنجاح.", true);
      else say("verify-msg", errText(r.data));
    });
  }

  function accountPage() {
    var tok = token();
    if (!tok) { $("acc-login").hidden = false; return; }
    function load() {
      return call("/v1/me", "GET", null, tok).then(function (r) {
        if (!r.data.ok) { $("acc-main").hidden = true; $("acc-login").hidden = false; return; }
        var s = r.data.seller || {};
        $("acc-main").hidden = false;
        $("acc-name").textContent = s.name ? "حساب " + s.name : "حسابك";
        $("acc-email").textContent = s.email || "لا يوجد";
        var st = $("acc-email-state");
        st.hidden = !s.email;
        st.textContent = s.email_verified ? "مؤكد" : "غير مؤكد";
        st.className = "acc-badge " + (s.email_verified ? "ok" : "no");
      });
    }
    load();
    $("email-btn").addEventListener("click", function () {
      var e = $("email-new").value.trim(), p = $("email-pass").value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return say("email-msg", ERR.invalid_email);
      if (!p) return say("email-msg", "أدخل كلمة السر الحالية.");
      var b = $("email-btn"); b.disabled = true;
      call("/v1/me/email", "POST", { email: e, password: p }, tok).then(function (r) {
        b.disabled = false; $("email-pass").value = "";
        if (r.data.ok) { say("email-msg", r.data.verified ? "البريد مؤكد مسبقاً." : (r.data.email_sent ? "أرسلنا رابط التأكيد إلى بريدك. الرابط صالح 24 ساعة." : "تم الحفظ، لكن تعذّر إرسال الرسالة الآن."), true); load(); }
        else say("email-msg", errText(r.data));
      });
    });
    $("pw-btn").addEventListener("click", function () {
      var c = $("pw-cur").value, n = $("pw-new").value, n2 = $("pw-new2").value;
      if (!c) return say("pw-msg", "أدخل كلمة السر الحالية.");
      if (!strong(n)) return say("pw-msg", ERR.weak_password);
      if (n !== n2) return say("pw-msg", "كلمتا السر غير متطابقتين.");
      var b = $("pw-btn"); b.disabled = true;
      call("/v1/me/change-password", "POST", { current: c, new: n }, tok).then(function (r) {
        b.disabled = false; $("pw-cur").value = $("pw-new").value = $("pw-new2").value = "";
        if (r.data.ok) say("pw-msg", "تم تغيير كلمة السر وتسجيل الخروج من الأجهزة الأخرى.", true);
        else say("pw-msg", errText(r.data));
      });
    });
  }

  function boot() {
    var page = document.body.getAttribute("data-page");
    if (page === "reset") resetPage();
    else if (page === "verify") verifyPage();
    else if (page === "account") accountPage();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
