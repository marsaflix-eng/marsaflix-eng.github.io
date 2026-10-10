/* Marça admin dashboard — talks only to the affiliate Worker (bearer session). */
(function () {
  "use strict";
  var API = "https://marca-affiliate.marsaflix.workers.dev";
  var TK = "marca_ops_token";
  var token = sessionStorage.getItem(TK) || "";
  var tab = "overview";
  var st = { sellers: { offset: 0 }, orders: { offset: 0 }, commissions: { offset: 0 }, wallet: { offset: 0 } };
  var LIMIT = 25;
  var $ = function (id) { return document.getElementById(id); };
  var TITLES = { overview: "نظرة عامة", sellers: "البائعون", orders: "الطلبات", commissions: "العمولات", wallet: "المحافظ والسجل", anon: "رسائل مجهولة", catalog: "الكتالوج" };
  var LBL = { pending: "قيد الانتظار", paid: "مدفوع", approved: "معتمد", active: "نشط", rejected: "مرفوض", pending_payout: "بانتظار الاعتماد", paid_to_wallet: "في المحفظة", commission_credit: "عمولة", snap: "سناب بلس", gift: "بطاقة" };
  var TONE = { paid: "ok", approved: "ok", active: "p", paid_to_wallet: "ok", pending: "warn", pending_payout: "warn", rejected: "bad" };

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "cls") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); });
    return e;
  }
  function num(n) { return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 }); }
  function mru(n) { return num(n) + " MRU"; }
  function dt(s) { if (!s) return "—"; var d = new Date(s); return isNaN(d) ? s : d.toLocaleString("en-GB", { timeZone: "Europe/Paris", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  function pill(s) { return h("span", { cls: "pill " + (TONE[s] || ""), text: LBL[s] || s || "—" }); }
  function sumBy(arr, key, val) { var r = (arr || []).find(function (x) { return x[key] === val; }); return r || {}; }
  function toast(msg, kind) { var t = h("div", { cls: "toast " + (kind || ""), text: msg }); $("toasts").appendChild(t); setTimeout(function () { t.remove(); }, 3500); }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function empty(msg) { return h("div", { cls: "empty" }, [h("b", { text: "∅" }), msg || "لا توجد بيانات"]); }

  function api(path, opts) {
    opts = opts || {};
    var hd = { "Content-Type": "application/json" };
    if (token) hd.Authorization = "Bearer " + token;
    return fetch(API + path, { method: opts.method || "GET", headers: hd, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && path !== "/v1/admin/login") { logout(true); throw new Error("انتهت الجلسة"); }
          if (!r.ok || j.ok === false) throw new Error(j.error || ("HTTP " + r.status));
          return j;
        });
      });
  }

  /* ---------- auth ---------- */
  function showApp(on) { $("login").hidden = on; $("app").hidden = !on; }
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var b = $("login-btn"); b.disabled = true; $("login-err").textContent = "";
    api("/v1/admin/login", { method: "POST", body: { password: $("pw").value } })
      .then(function (j) { token = j.token; sessionStorage.setItem(TK, token); $("pw").value = ""; showApp(true); go("overview"); })
      .catch(function (err) { $("login-err").textContent = err.message === "rate_limited" ? "محاولات كثيرة، انتظر دقيقة" : "كلمة المرور غير صحيحة"; })
      .then(function () { b.disabled = false; });
  });
  function logout(expired) {
    if (token && !expired) api("/v1/admin/logout", { method: "POST" }).catch(function () {});
    token = ""; sessionStorage.removeItem(TK); showApp(false);
    if (expired) $("login-err").textContent = "انتهت الجلسة، سجّل الدخول مجددًا";
  }
  $("logout").addEventListener("click", function () { logout(false); });

  /* ---------- shell ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("#nav button"), function (b) {
    b.addEventListener("click", function () { go(b.getAttribute("data-tab")); $("side").classList.remove("open"); });
  });
  $("menu").addEventListener("click", function () { $("side").classList.toggle("open"); });
  $("refresh").addEventListener("click", function () { go(tab); });
  $("modal-close").addEventListener("click", function () { $("modal").hidden = true; });
  $("modal").addEventListener("click", function (e) { if (e.target === $("modal")) $("modal").hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("modal").hidden = true; });
  function modal(nodes) { var b = $("modal-body"); clear(b); nodes.forEach(function (n) { b.appendChild(n); }); $("modal").hidden = false; $("modal-close").focus(); }

  function go(t) {
    tab = t;
    Array.prototype.forEach.call(document.querySelectorAll("#nav button"), function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === t); });
    $("title").textContent = TITLES[t];
    var v = $("view"); clear(v);
    var g = h("div", { cls: "grid" }); for (var i = 0; i < 4; i++) g.appendChild(h("div", { cls: "skel" })); v.appendChild(g);
    (VIEWS[t])(v).then(function () { $("updated").textContent = "آخر تحديث " + dt(new Date().toISOString()); })
      .catch(function (err) { clear(v); v.appendChild(empty("تعذّر التحميل: " + err.message)); toast(err.message, "bad"); });
  }
  function stat(k, v, s, accent) { return h("div", { cls: "card stat" + (accent ? " accent" : "") }, [h("div", { cls: "k", text: k }), h("div", { cls: "v", text: v }), s ? h("div", { cls: "s", text: s }) : null]); }
  function table(cols, rows, rowFn) {
    if (!rows.length) return h("div", { cls: "tbl-wrap" }, [empty()]);
    return h("div", { cls: "tbl-wrap" }, [h("table", null, [
      h("thead", null, [h("tr", null, cols.map(function (c) { return h("th", { text: c }); }))]),
      h("tbody", null, rows.map(function (r) { return h("tr", null, rowFn(r).map(function (c) { return c instanceof Node ? (c.tagName === "TD" ? c : h("td", null, [c])) : h("td", { text: c == null || c === "" ? "—" : String(c) }); })); }))
    ])]);
  }
  function pager(s, total, reload) {
    var from = total ? s.offset + 1 : 0, to = Math.min(total, s.offset + LIMIT);
    return h("div", { cls: "pager" }, [
      h("span", { text: from + "–" + to + " من " + total }),
      h("div", { cls: "toolbar" }, [
        h("button", { cls: "btn ghost sm", disabled: s.offset === 0, text: "→ السابق", onclick: function () { s.offset = Math.max(0, s.offset - LIMIT); reload(); } }),
        h("button", { cls: "btn ghost sm", disabled: to >= total, text: "التالي ←", onclick: function () { s.offset += LIMIT; reload(); } })
      ])
    ]);
  }
  function filters(s, opts, reload) {
    var q = h("input", { type: "search", placeholder: opts.ph || "بحث…", value: s.q || "" });
    var t; q.addEventListener("input", function () { clearTimeout(t); t = setTimeout(function () { s.q = q.value.trim(); s.offset = 0; reload(); }, 350); });
    var kids = [q];
    (opts.selects || []).forEach(function (sel) {
      var e = h("select", { "aria-label": sel.label }, sel.options.map(function (o) { return h("option", { value: o[0], text: o[1], selected: (s[sel.key] || "") === o[0] }); }));
      e.addEventListener("change", function () { s[sel.key] = e.value; s.offset = 0; reload(); });
      kids.push(e);
    });
    return h("div", { cls: "toolbar" }, kids);
  }
  function qs(s, extra) {
    var p = new URLSearchParams({ limit: LIMIT, offset: s.offset });
    if (s.q) p.set("q", s.q);
    (extra || []).forEach(function (k) { if (s[k]) p.set(k, s[k]); });
    return p.toString();
  }
  function action(btn, path, okMsg, after) {
    btn.disabled = true;
    return api(path, { method: "POST" }).then(function (j) { toast(okMsg, "ok"); if (after) after(j); else go(tab); })
      .catch(function (e) { toast("خطأ: " + e.message, "bad"); btn.disabled = false; });
  }

  /* ---------- views ---------- */
  var VIEWS = {};
  VIEWS.overview = function (v) {
    return Promise.all([api("/v1/admin/overview"), api("/v1/admin/anon-stats").catch(function () { return null; })]).then(function (r) {
      var o = r[0], an = r[1]; clear(v);
      var os = o.orders.by_status, cs = o.commissions.by_status, ss = o.sellers.by_affiliate_status;
      v.appendChild(h("div", { cls: "grid" }, [
        stat("إيراد مدفوع", mru(o.revenue.paid_mru), "طلبات قيد الانتظار: " + mru(o.revenue.pending_mru), true),
        stat("الطلبات", num(o.orders.total), "آخر 7 أيام: " + o.orders.last7 + " · 30 يومًا: " + o.orders.last30),
        stat("طلبات قيد الانتظار", num(sumBy(os, "status", "pending").n), "مدفوعة: " + num(sumBy(os, "status", "paid").n)),
        stat("البائعون", num(o.sellers.total), "شركاء معتمدون: " + num(sumBy(ss, "status", "approved").n) + " · بانتظار: " + num(sumBy(ss, "status", "pending").n)),
        stat("عمولات بانتظار الاعتماد", mru(sumBy(cs, "status", "pending_payout").sum), num(sumBy(cs, "status", "pending_payout").n) + " عمولة"),
        stat("عمولات معتمدة", mru(sumBy(cs, "status", "paid_to_wallet").sum), num(sumBy(cs, "status", "paid_to_wallet").n) + " عمولة"),
        stat("إجمالي المحافظ", mru(o.wallet.total_mru), o.wallet.sellers_with_balance + " بائع لديه رصيد"),
        stat("صناديق مجهولة", an && an.inbox ? num(an.inbox.boxes) : "—", an && an.inbox ? num(an.inbox.messages_received) + " رسالة مستلمة" : "غير متاح")
      ]));
      var bars = h("div", { cls: "bars" }), days = {}, max = 1;
      o.orders.daily30.forEach(function (d) { days[d.day] = d.n; if (d.n > max) max = d.n; });
      for (var i = 29; i >= 0; i--) {
        var day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), n = days[day] || 0;
        var b = h("span", { title: day + ": " + n }); b.style.height = Math.max(2, (n / max) * 100) + "%"; bars.appendChild(b);
      }
      var top = h("div", { cls: "list" }), tmax = Math.max.apply(null, o.orders.top.map(function (x) { return x.n; }).concat([1]));
      if (!o.orders.top.length) top.appendChild(empty());
      o.orders.top.forEach(function (x) {
        var m = h("div", { cls: "meter" }, [h("span")]); m.firstChild.style.width = (x.n / tmax * 100) + "%";
        top.appendChild(h("section", null, [h("div", null, [h("strong", { text: x.label || "—" }), h("span", { cls: "muted", text: x.n + " · " + mru(x.sum) })]), m]));
      });
      v.appendChild(h("div", { cls: "two" }, [
        h("div", { cls: "card" }, [h("h3", { text: "الطلبات — آخر 30 يومًا" }), bars]),
        h("div", { cls: "card" }, [h("h3", { text: "الأكثر طلبًا" }), top])
      ]));
      var kinds = h("div", { cls: "list" });
      o.orders.by_kind.forEach(function (k) { kinds.appendChild(h("div", null, [pill(k.kind), h("span", { text: k.n + " طلب · " + mru(k.sum) })])); });
      var sel = h("div", { cls: "list" });
      o.sellers.by_status.forEach(function (k) { sel.appendChild(h("div", null, [pill(k.status), h("span", { text: k.n })])); });
      sel.appendChild(h("div", null, [h("span", { text: "حسابات مرتبطة بصندوق مجهول" }), h("span", { text: o.sellers.anon_accounts })]));
      v.appendChild(h("div", { cls: "two" }, [
        h("div", { cls: "card" }, [h("h3", { text: "حسب نوع المنتج" }), o.orders.by_kind.length ? kinds : empty()]),
        h("div", { cls: "card" }, [h("h3", { text: "حالة الحسابات" }), sel])
      ]));
    });
  };

  VIEWS.sellers = function (v) {
    var s = st.sellers;
    return api("/v1/admin/sellers?" + qs(s, ["affiliate_status"])).then(function (j) {
      clear(v);
      v.appendChild(filters(s, { ph: "ابحث بالاسم أو الهاتف أو رمز الإحالة", selects: [{ key: "affiliate_status", label: "حالة الشراكة", options: [["", "كل حالات الشراكة"], ["pending", "بانتظار الموافقة"], ["approved", "معتمد"]] }] }, function () { go("sellers"); }));
      v.appendChild(table(["البائع", "الهاتف", "رمز الإحالة", "الحساب", "الشراكة", "الطلبات", "مبيعات مدفوعة", "عمولة معلّقة", "المحفظة", "التسجيل", "إجراءات"], j.sellers, function (r) {
        var acts = h("td", null, [h("div", { cls: "toolbar" }, [
          h("button", { cls: "btn ghost sm", text: "تفاصيل", onclick: function () { sellerDetail(r.id); } }),
          r.affiliate_status !== "approved" ? h("button", { cls: "btn ok sm", text: "اعتماد", onclick: function (e) { approve(e.target, r); } }) : null,
          r.status !== "rejected" && r.affiliate_status !== "approved" ? h("button", { cls: "btn bad sm", text: "رفض", onclick: function (e) { if (confirm("رفض " + r.name + "؟")) action(e.target, "/v1/admin/sellers/" + r.id + "/reject", "تم الرفض"); } }) : null
        ])]);
        return [h("strong", { text: r.name }), h("span", { cls: "ltr", text: r.phone }), h("span", { cls: "ltr", text: r.ref || "—" }), pill(r.status), pill(r.affiliate_status), r.orders_n, mru(r.sales_paid), mru(r.comm_pending), mru(r.wallet), dt(r.created_at), acts];
      }));
      v.appendChild(pager(s, j.total, function () { go("sellers"); }));
    });
  };
  function approve(btn, r) {
    if (!confirm("اعتماد " + r.name + " كشريك؟")) return;
    action(btn, "/v1/admin/sellers/" + r.id + "/approve", "تم الاعتماد", function (j) {
      var nodes = [h("h3", { text: "تم اعتماد " + r.name }), h("p", { text: "رمز الإحالة: " + j.ref })];
      if (j.setup_token) nodes.push(h("p", { cls: "muted", text: "رمز الإعداد يظهر مرة واحدة فقط — انسخه وأرسله للبائع:" }), h("div", { cls: "token", text: j.setup_token }),
        h("button", { cls: "btn primary sm", text: "نسخ", onclick: function () { navigator.clipboard && navigator.clipboard.writeText(j.setup_token).then(function () { toast("تم النسخ", "ok"); }); } }));
      else nodes.push(h("p", { cls: "muted", text: "لدى البائع كلمة مرور بالفعل — لا حاجة لرمز إعداد." }));
      modal(nodes); go("sellers");
    });
  }
  function sellerDetail(id) {
    api("/v1/admin/sellers/" + id).then(function (j) {
      var s = j.seller;
      modal([
        h("h3", { text: s.name }),
        h("div", { cls: "grid" }, [stat("المحفظة", mru(j.wallet)), stat("الطلبات", j.orders.length), stat("العمولات", j.commissions.length), stat("رمز الإحالة", s.ref || "—")]),
        h("p", { cls: "muted", text: "الهاتف: " + s.phone + " · الحساب: " + (LBL[s.status] || s.status) + " · الشراكة: " + (LBL[s.affiliate_status] || s.affiliate_status) + " · صندوق مجهول: " + (s.has_anon_box ? "نعم" : "لا") + " · كلمة مرور: " + (s.has_password ? "نعم" : "لا") }),
        h("h3", { text: "سجل المحفظة" }),
        table(["التاريخ", "النوع", "المبلغ", "ملاحظة"], j.ledger, function (l) { return [dt(l.created_at), pill(l.kind), mru(l.amount_mru), l.note]; }),
        h("h3", { text: "الطلبات" }),
        table(["التاريخ", "المنتج", "السعر", "الحالة"], j.orders, function (o) { return [dt(o.created_at), prod(o), mru(o.price_mru), pill(o.status)]; })
      ]);
    }).catch(function (e) { toast(e.message, "bad"); });
  }
  function prod(o) { return o.kind === "gift" ? [o.brand, o.denom].filter(Boolean).join(" · ") : "Snapchat+ " + (o.plan || ""); }

  VIEWS.orders = function (v) {
    var s = st.orders;
    return api("/v1/admin/orders?" + qs(s, ["status", "kind"])).then(function (j) {
      clear(v);
      v.appendChild(filters(s, { ph: "ابحث برقم الطلب أو الإحالة أو يوزر سناب أو العلامة", selects: [
        { key: "status", label: "الحالة", options: [["", "كل الحالات"], ["pending", "قيد الانتظار"], ["paid", "مدفوع"]] },
        { key: "kind", label: "النوع", options: [["", "كل الأنواع"], ["snap", "سناب بلس"], ["gift", "بطاقات"]] }] }, function () { go("orders"); }));
      v.appendChild(h("div", { cls: "grid" }, [stat("عدد النتائج", num(j.total)), stat("إجمالي القيمة", mru(j.sum_mru))]));
      v.appendChild(table(["التاريخ", "النوع", "المنتج / العلامة", "الدولة", "الفئة", "السعر", "الإحالة", "البائع", "يوزر سناب", "الحالة", "العمولة", ""], j.orders, function (o) {
        return [dt(o.created_at), pill(o.kind || "snap"), h("td", { cls: "wrap", text: o.kind === "gift" ? (o.brand || "—") + (o.catalog_ok ? "" : " ⚠") : "Snapchat+ " + o.plan }),
          o.country, h("td", { cls: "wrap", text: o.denom || (o.kind === "snap" ? o.plan : "—") }), mru(o.price_mru), h("span", { cls: "ltr", text: o.ref || "—" }),
          o.seller_name, h("span", { cls: "ltr", text: o.snap_user ? "@" + o.snap_user : "—" }), pill(o.status), o.commission_status ? pill(o.commission_status) : "—",
          o.status !== "paid" ? h("button", { cls: "btn ok sm", text: "تأكيد الدفع", onclick: function (e) { if (confirm("تأكيد دفع هذا الطلب؟")) action(e.target, "/v1/admin/orders/" + o.id + "/mark-paid", "تم تأكيد الدفع"); } }) : h("span", { cls: "muted", text: dt(o.paid_at) })];
      }));
      v.appendChild(pager(s, j.total, function () { go("orders"); }));
    });
  };

  VIEWS.commissions = function (v) {
    var s = st.commissions;
    return api("/v1/admin/commissions?" + qs(s, ["status"])).then(function (j) {
      clear(v);
      v.appendChild(filters(s, { ph: "ابحث باسم البائع أو الهاتف أو رقم الطلب", selects: [{ key: "status", label: "الحالة", options: [["", "كل الحالات"], ["pending_payout", "بانتظار الاعتماد"], ["paid_to_wallet", "في المحفظة"]] }] }, function () { go("commissions"); }));
      v.appendChild(h("div", { cls: "grid" }, [stat("عدد العمولات", num(j.total)), stat("الإجمالي", mru(j.sum_mru))]));
      v.appendChild(table(["التاريخ", "البائع", "الهاتف", "الطلب", "قيمة الطلب", "العمولة", "الحالة", ""], j.commissions, function (c) {
        return [dt(c.created_at), c.seller_name, h("span", { cls: "ltr", text: c.seller_phone }), prod(c), mru(c.price_mru), h("strong", { text: mru(c.amount_mru) }), pill(c.status),
          c.status !== "paid_to_wallet" ? h("button", { cls: "btn ok sm", text: "اعتماد للمحفظة", onclick: function (e) { action(e.target, "/v1/admin/commissions/" + c.id + "/approve", "أضيفت للمحفظة"); } }) : h("span", { cls: "muted", text: dt(c.approved_at) })];
      }));
      v.appendChild(pager(s, j.total, function () { go("commissions"); }));
    });
  };

  VIEWS.wallet = function (v) {
    var s = st.wallet;
    return api("/v1/admin/ledger?" + qs(s, ["seller_id"])).then(function (j) {
      clear(v);
      var sel = h("select", { "aria-label": "البائع" }, [h("option", { value: "", text: "كل البائعين" })].concat(j.balances.map(function (b) { return h("option", { value: b.id, text: b.name + " — " + mru(b.balance), selected: s.seller_id === b.id }); })));
      sel.addEventListener("change", function () { s.seller_id = sel.value; s.offset = 0; go("wallet"); });
      v.appendChild(h("div", { cls: "two" }, [
        h("div", { cls: "card" }, [h("h3", { text: "أرصدة البائعين" }), table(["البائع", "الهاتف", "الرصيد", "القيود"], j.balances, function (b) { return [b.name, h("span", { cls: "ltr", text: b.phone }), h("strong", { text: mru(b.balance) }), b.entries]; })]),
        h("div", { cls: "grid" }, [stat("مجموع القيود المعروضة", mru(j.sum_mru), null, true), stat("عدد القيود", num(j.total))])
      ]));
      v.appendChild(h("div", { cls: "toolbar" }, [h("strong", { text: "سجل المحفظة" }), sel]));
      v.appendChild(table(["التاريخ", "البائع", "النوع", "المبلغ", "ملاحظة"], j.entries, function (l) { return [dt(l.created_at), l.seller_name, pill(l.kind), h("strong", { text: mru(l.amount_mru) }), l.note]; }));
      v.appendChild(pager(s, j.total, function () { go("wallet"); }));
    });
  };

  VIEWS.anon = function (v) {
    return api("/v1/admin/anon-stats").then(function (j) {
      clear(v); var i = j.inbox;
      if (!i) { v.appendChild(h("div", { cls: "card" }, [empty("إحصاءات الصناديق غير متاحة حاليًا")])); return; }
      v.appendChild(h("div", { cls: "grid" }, [
        stat("الصناديق", num(i.boxes), i.complete ? "عدّ كامل" : "تمت قراءة " + i.boxes_read, true),
        stat("الرسائل المستلمة", num(i.messages_received), "إجمالي منذ الإنشاء"),
        stat("صناديق وصلتها رسائل", num(i.boxes_with_messages), i.boxes ? Math.round(i.boxes_with_messages / i.boxes * 100) + "%" : ""),
        stat("صناديق جديدة", num(i.new_boxes_7d), "آخر 7 أيام · " + i.new_boxes_30d + " خلال 30 يومًا"),
        stat("أعلى صندوق", num(i.max_in_one_box), "رسالة"),
        stat("مرتبطة بحسابات بائعين", num(j.linked_seller_boxes))
      ]));
      v.appendChild(h("div", { cls: "card" }, [h("p", { cls: "muted", text: "حفاظًا على الخصوصية تعرض اللوحة أرقامًا إجمالية فقط — لا أسماء صناديق ولا محتوى رسائل." })]));
    });
  };

  VIEWS.catalog = function (v) {
    return api("/v1/admin/catalog-stats").then(function (j) {
      clear(v); var t = j.totals, s = { q: "" };
      v.appendChild(h("div", { cls: "grid" }, [stat("العلامات", num(t.brands), null, true), stat("الأسواق", num(t.markets), t.countries + " دولة/منطقة"), stat("الفئات (SKU)", num(t.skus), t.ranged + " بمبلغ مفتوح"), stat("غير متوفر", num(t.out_of_stock)), stat("نطاق الأسعار", num(t.min_mru) + "–" + num(t.max_mru), "MRU"), stat("تاريخ البيانات", j.as_of || "—", (j.source || "") + " · ×" + (j.fx || ""))]));
      v.appendChild(table(["الفئة", "العلامات", "SKU"], j.categories, function (c) { return [c.ar, num(c.brands), num(c.skus)]; }));
      var host = h("div"), q = h("input", { type: "search", placeholder: "ابحث عن علامة…" });
      function render() {
        clear(host);
        var rows = j.brands.filter(function (b) { var k = (b.title + " " + b.title_ar + " " + b.slug).toLowerCase(); return !s.q || k.indexOf(s.q) >= 0; }).sort(function (a, b) { return b.skus - a.skus; });
        host.appendChild(table(["العلامة", "بالعربية", "الفئة", "الأسواق", "SKU"], rows.slice(0, 60), function (b) { return [h("strong", { text: b.title }), b.title_ar, b.category, b.markets, b.skus]; }));
        if (rows.length > 60) host.appendChild(h("p", { cls: "muted", text: "يعرض 60 من " + rows.length + " — استخدم البحث للتصفية." }));
      }
      q.addEventListener("input", function () { s.q = q.value.trim().toLowerCase(); render(); });
      v.appendChild(h("div", { cls: "toolbar" }, [h("strong", { text: "العلامات (قراءة فقط)" }), q])); v.appendChild(host); render();
    });
  };

  if (token) { showApp(true); go("overview"); } else showApp(false);
})();
