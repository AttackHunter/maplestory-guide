// "My store" tab: Sergei's own store profit per day, from store-sales.js.
// On the public site since 2026-11-11 (Sergei asked); build-share.mjs still strips it from the claude.ai Artifact.
(function () {
  "use strict";
  var root = document.getElementById("tab-store");
  if (!root) return;
  var DATA = window.STORE_SALES;
  if (!DATA || !DATA.sales || !DATA.sales.length) {
    root.innerHTML = "<h2>My store</h2><p class=\"lead\">store-sales.js did not load, so there is nothing to chart yet.</p>";
    return;
  }

  var css = [
    "#tab-store { --up: var(--ok); --down: var(--bandit); }",
    ".st-tiles .tile p { font-size: 22px; letter-spacing: -.01em; }",
    ".st-up { color: var(--up); } .st-down { color: var(--down); }",
    ".st-chart-card { margin-top: 14px; }",
    ".st-chart-head { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; justify-content: space-between; margin-bottom: 10px; }",
    ".st-chart-head h3 { margin: 0; }",
    ".st-chart { position: relative; outline: none; touch-action: pan-y; }",
    ".st-chart:focus-visible { box-shadow: 0 0 0 2px var(--up); border-radius: 6px; }",
    ".st-chart svg { display: block; width: 100%; overflow: visible; }",
    ".st-chart text { fill: var(--muted); font: 11px system-ui, -apple-system, \"Segoe UI\", sans-serif; }",
    ".st-chart text.end { fill: var(--text); font-weight: 600; }",
    ".st-chart .ph-tip strong.st-up { color: var(--up); } .st-chart .ph-tip strong.st-down { color: var(--down); }",
    ".st-days tbody tr { cursor: pointer; }",
    ".st-days tbody tr:hover td { background: var(--surface-2); }",
    ".st-days tbody tr[aria-selected=\"true\"] td { background: color-mix(in srgb, var(--up) 10%, transparent); }",
    ".st-days td:first-child button { appearance: none; border: 0; background: none; padding: 0; font: inherit; font-weight: 600; color: var(--text); cursor: pointer; text-align: left; }",
    ".st-sales tfoot td { font-weight: 700; border-bottom: 0; }",
    ".st-unknown { color: var(--muted); font-size: 13px; }"
  ].join("\n");
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var FEE = 1 - (DATA.fee == null ? 0.03 : DATA.fee);
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function signed(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n)); }
  function short(n) {
    var a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e6) return s + (Math.round(a / 1e5) / 10) + "M";
    if (a >= 1e4) return s + Math.round(a / 1e3) + "K";
    if (a >= 1e3) return s + (Math.round(a / 100) / 10) + "K";
    return s + Math.round(a);
  }
  function signedShort(n) { return (n > 0 ? "+" : "") + short(n); }
  function cls(n) { return n > 0 ? "st-up" : n < 0 ? "st-down" : ""; }
  function parseDay(d) { return new Date(d + "T12:00:00Z"); }
  function label(d, long) {
    var t = parseDay(d);
    return t.toLocaleDateString("en-GB", long ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  }
  function localToday() {
    var n = new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  }

  // ---------- roll the sales up by day, keeping every calendar day so gaps show as gaps ----------
  var byDay = {};
  DATA.sales.forEach(function (r) {
    var day = r[0], price = r[2], paid = r[3], qty = r[4] || 1;
    var net = Math.round(price * FEE) * qty;
    var s = { item: r[1], price: price, paid: paid, qty: qty, net: net, profit: paid === null ? null : net - paid * qty };
    var d = byDay[day] || (byDay[day] = { d: day, sales: [], net: 0, profit: 0, count: 0, unknownNet: 0 });
    d.sales.push(s);
    d.net += net; d.count += qty;
    if (s.profit === null) d.unknownNet += net; else d.profit += s.profit;
  });
  var keys = Object.keys(byDay).sort();
  var days = [];
  for (var t = parseDay(keys[0]), end = parseDay(keys[keys.length - 1]); t <= end; t = new Date(t.getTime() + 864e5)) {
    var k = t.toISOString().slice(0, 10);
    days.push(byDay[k] || { d: k, sales: [], net: 0, profit: 0, count: 0, unknownNet: 0, empty: true });
  }
  var run = 0;
  days.forEach(function (d) { run += d.profit; d.total = run; });
  var sold = days.filter(function (d) { return !d.empty; });
  var totalProfit = run;
  var totalNet = sold.reduce(function (a, d) { return a + d.net; }, 0);
  var totalCount = sold.reduce(function (a, d) { return a + d.count; }, 0);
  var unknownNet = sold.reduce(function (a, d) { return a + d.unknownNet; }, 0);
  var best = sold.reduce(function (a, d) { return d.profit > a.profit ? d : a; }, sold[0]);
  var last = days[days.length - 1];
  var greenDays = sold.filter(function (d) { return d.profit > 0; }).length;

  // ---------- page skeleton ----------
  var updated = DATA.updated ? new Date(DATA.updated) : null;
  root.innerHTML =
    "<h2>My store</h2>" +
    "<p class=\"lead\">Profit after the 3% store fee on every sale you told Claude about, since " + esc(label(keys[0])) + ". " +
    (updated && !isNaN(updated) ? "Last sale logged " + esc(updated.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) + "." : "") + "</p>" +
    "<div class=\"grid g4 st-tiles\" id=\"st-tiles\"></div>" +
    "<div class=\"card st-chart-card\">" +
      "<div class=\"st-chart-head\"><h3 id=\"st-chart-title\">Profit per day</h3>" +
      "<div class=\"seg\" role=\"group\" aria-label=\"Chart\" id=\"st-mode\">" +
        "<button type=\"button\" data-mode=\"day\" aria-pressed=\"true\">Per day</button>" +
        "<button type=\"button\" data-mode=\"total\" aria-pressed=\"false\">Running total</button>" +
      "</div></div>" +
      "<div class=\"st-chart\" id=\"st-chart\" tabindex=\"0\" aria-label=\"Profit chart. Left and right arrows move between days.\"></div>" +
    "</div>" +
    "<h3 id=\"st-day-title\"></h3>" +
    "<div class=\"tbl-wrap\"><table class=\"st-sales\" id=\"st-sales\">" +
      "<thead><tr><th>Item</th><th class=\"num\">Qty</th><th class=\"num\">Sold for</th><th class=\"num\">Paid</th><th class=\"num\">Profit</th></tr></thead>" +
      "<tbody></tbody><tfoot></tfoot></table></div>" +
    "<h3>Every day</h3>" +
    "<div class=\"tbl-wrap\"><table class=\"st-days\" id=\"st-days\">" +
      "<thead><tr><th>Day</th><th class=\"num\">Sales</th><th class=\"num\">Mesos in</th><th class=\"num\">Profit</th><th>Best sale</th></tr></thead>" +
      "<tbody></tbody></table></div>" +
    "<p class=\"small muted\">Mesos in is what reached you after the fee. Sales with an unknown cost (mostly early Palette coupons) count toward mesos in but not toward profit. " +
    "Updated after each sale.</p>";

  // ---------- tiles ----------
  var isToday = last.d === localToday();
  function tile(h, v, vCls, small) {
    return "<div class=\"tile\"><h4>" + esc(h) + "</h4><p class=\"" + vCls + "\">" + v + "</p>" + (small ? "<small>" + small + "</small>" : "") + "</div>";
  }
  document.getElementById("st-tiles").innerHTML =
    tile("Total profit", signed(totalProfit), cls(totalProfit), fmt(totalCount) + " items sold over " + days.length + " days") +
    tile(isToday ? "Today" : label(last.d, true), signed(last.profit), cls(last.profit), last.count + (last.count === 1 ? " item, " : " items, ") + short(last.net) + " mesos in") +
    tile("Best day", signed(best.profit), cls(best.profit), esc(label(best.d, true))) +
    tile("Mesos in", short(totalNet), "", greenDays + " of " + sold.length + " selling days in profit");

  // ---------- chart ----------
  var mode = "day", sel = days.length - 1;
  var chartEl = document.getElementById("st-chart");
  var geo = null;

  function niceStep(span) {
    var step = Math.pow(10, Math.floor(Math.log10(span / 3)));
    [1, 2, 2.5, 5, 10].some(function (m) { if (span / (step * m) <= 4) { step *= m; return true; } return false; });
    return step;
  }

  function draw() {
    var W = Math.max(280, chartEl.clientWidth || 640), L = 52, R = mode === "total" ? 58 : 16, T = 14, H = 230, B = 24;
    var Hh = T + H + B;
    var vals = days.map(function (d) { return mode === "total" ? d.total : d.profit; });
    var lo = Math.min(0, Math.min.apply(null, vals)), hi = Math.max(0, Math.max.apply(null, vals));
    var step = niceStep((hi - lo) || 1);
    var yLo = Math.floor(lo / step) * step, yHi = Math.ceil(hi / step) * step;
    var slot = (W - L - R) / days.length;
    var xAt = function (i) { return L + slot * (i + 0.5); };
    var yAt = function (v) { return T + H * (1 - (v - yLo) / (yHi - yLo)); };
    var s = [];
    s.push("<svg width=\"" + W + "\" height=\"" + Hh + "\" viewBox=\"0 0 " + W + " " + Hh + "\" role=\"img\" aria-hidden=\"true\">");
    for (var g = yLo; g <= yHi + 1e-6; g += step) {
      var gy = yAt(g).toFixed(1);
      s.push("<line x1=\"" + L + "\" x2=\"" + (W - R) + "\" y1=\"" + gy + "\" y2=\"" + gy + "\" stroke=\"var(--border)\" stroke-width=\"1\"" + (g === 0 ? "" : " stroke-dasharray=\"2 3\"") + "/>");
      s.push("<text x=\"" + (L - 8) + "\" y=\"" + gy + "\" text-anchor=\"end\" dominant-baseline=\"middle\">" + short(g) + "</text>");
    }
    var y0 = yAt(0);
    // selected-day band, under the marks
    s.push("<rect class=\"st-band\" x=\"0\" y=\"" + T + "\" width=\"" + slot.toFixed(1) + "\" height=\"" + H + "\" fill=\"var(--surface-2)\" rx=\"4\"/>");
    if (mode === "day") {
      var bw = Math.min(26, Math.max(4, slot * 0.62));
      days.forEach(function (d, i) {
        if (d.empty || !d.profit) return;
        var x = xAt(i) - bw / 2, y = yAt(d.profit), up = d.profit > 0;
        var top = Math.min(y, y0), h = Math.max(2, Math.abs(y - y0)), r = Math.min(4, h / 2, bw / 2);
        var path = up
          ? "M" + x.toFixed(1) + " " + (top + h).toFixed(1) + "V" + (top + r).toFixed(1) + "Q" + x.toFixed(1) + " " + top.toFixed(1) + " " + (x + r).toFixed(1) + " " + top.toFixed(1) +
            "H" + (x + bw - r).toFixed(1) + "Q" + (x + bw).toFixed(1) + " " + top.toFixed(1) + " " + (x + bw).toFixed(1) + " " + (top + r).toFixed(1) + "V" + (top + h).toFixed(1) + "Z"
          : "M" + x.toFixed(1) + " " + top.toFixed(1) + "V" + (top + h - r).toFixed(1) + "Q" + x.toFixed(1) + " " + (top + h).toFixed(1) + " " + (x + r).toFixed(1) + " " + (top + h).toFixed(1) +
            "H" + (x + bw - r).toFixed(1) + "Q" + (x + bw).toFixed(1) + " " + (top + h).toFixed(1) + " " + (x + bw).toFixed(1) + " " + (top + h - r).toFixed(1) + "V" + top.toFixed(1) + "Z";
        s.push("<path d=\"" + path + "\" fill=\"var(" + (up ? "--up" : "--down") + ")\"/>");
      });
    } else {
      var pts = days.map(function (d, i) { return [xAt(i), yAt(d.total)]; });
      var line = pts.map(function (q, i) { return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("");
      s.push("<path d=\"" + line + "L" + pts[pts.length - 1][0].toFixed(1) + " " + y0.toFixed(1) + "L" + pts[0][0].toFixed(1) + " " + y0.toFixed(1) + "Z\" fill=\"var(--up)\" opacity=\".12\"/>");
      s.push("<path d=\"" + line + "\" fill=\"none\" stroke=\"var(--up)\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>");
      var e = pts[pts.length - 1];
      s.push("<circle cx=\"" + e[0].toFixed(1) + "\" cy=\"" + e[1].toFixed(1) + "\" r=\"4\" fill=\"var(--up)\" stroke=\"var(--surface)\" stroke-width=\"2\"/>");
      s.push("<text class=\"end\" x=\"" + (e[0] + 9).toFixed(1) + "\" y=\"" + e[1].toFixed(1) + "\" dominant-baseline=\"middle\">" + short(totalProfit) + "</text>");
      s.push("<circle class=\"st-dot\" r=\"4\" fill=\"var(--up)\" stroke=\"var(--surface)\" stroke-width=\"2\" cx=\"0\" cy=\"0\"/>");
    }
    var every = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor((W - L - R) / 64))));
    days.forEach(function (d, i) {
      if ((days.length - 1 - i) % every) return;
      s.push("<text x=\"" + xAt(i).toFixed(1) + "\" y=\"" + (Hh - 6) + "\" text-anchor=\"middle\">" + esc(label(d.d)) + "</text>");
    });
    s.push("<rect class=\"hit\" x=\"" + L + "\" y=\"0\" width=\"" + (W - L - R) + "\" height=\"" + (T + H) + "\" fill=\"transparent\"/>");
    s.push("</svg>");
    chartEl.innerHTML = s.join("") + "<div class=\"ph-tip\" hidden></div>";
    geo = { L: L, R: R, W: W, slot: slot, xAt: xAt, yAt: yAt };
    var svg = chartEl.querySelector("svg"), hit = chartEl.querySelector(".hit");
    function idxFrom(ev) {
      var r = svg.getBoundingClientRect();
      var x = (ev.clientX - r.left) * (W / r.width);
      return Math.max(0, Math.min(days.length - 1, Math.floor((x - L) / slot)));
    }
    hit.addEventListener("pointermove", function (ev) { mark(idxFrom(ev), true); });
    hit.addEventListener("pointerleave", function () { mark(sel, false); });
    hit.addEventListener("click", function (ev) { select(idxFrom(ev)); });
    mark(sel, false);
  }

  // Highlight a day in the chart; the tooltip shows only while hovering.
  function mark(i, hover) {
    if (!geo) return;
    var d = days[i], band = chartEl.querySelector(".st-band"), tip = chartEl.querySelector(".ph-tip");
    band.setAttribute("x", (geo.xAt(i) - geo.slot / 2).toFixed(1));
    var dot = chartEl.querySelector(".st-dot");
    if (dot) { dot.setAttribute("cx", geo.xAt(i).toFixed(1)); dot.setAttribute("cy", geo.yAt(d.total).toFixed(1)); }
    if (!hover) { tip.hidden = true; return; }
    tip.textContent = "";
    var head = document.createElement("div"); head.textContent = label(d.d, true);
    var big = document.createElement("strong");
    var v = mode === "total" ? d.total : d.profit;
    big.className = cls(v);
    big.textContent = d.empty && mode === "day" ? "No sales" : signed(v) + (mode === "total" ? " so far" : "");
    tip.appendChild(head); tip.appendChild(big);
    if (!d.empty) {
      var l2 = document.createElement("div");
      l2.textContent = d.count + (d.count === 1 ? " item, " : " items, ") + short(d.net) + " mesos in" + (mode === "total" ? ", " + signedShort(d.profit) + " that day" : "");
      tip.appendChild(l2);
    }
    tip.hidden = false;
    var w = tip.offsetWidth, x = geo.xAt(i) / geo.W * chartEl.clientWidth;
    tip.style.left = Math.max(0, Math.min(chartEl.clientWidth - w, x + 12 > chartEl.clientWidth - w ? x - w - 12 : x + 12)) + "px";
  }

  // ---------- the selected day's sales, and the every-day table ----------
  var daysBody = document.querySelector("#st-days tbody");
  function bestSale(d) {
    var b = null;
    d.sales.forEach(function (s) { if (s.profit !== null && (!b || s.profit > b.profit)) b = s; });
    return b;
  }
  daysBody.innerHTML = days.map(function (d, i) { return [d, i]; }).filter(function (p) { return !p[0].empty; }).reverse().map(function (p) {
    var d = p[0], b = bestSale(d);
    return "<tr data-i=\"" + p[1] + "\" aria-selected=\"false\"><td><button type=\"button\">" + esc(label(d.d, true)) + "</button></td>" +
      "<td class=\"num\">" + d.count + "</td><td class=\"num\">" + fmt(d.net) + "</td>" +
      "<td class=\"num " + cls(d.profit) + "\"><strong class=\"" + cls(d.profit) + "\">" + signed(d.profit) + "</strong>" + (d.unknownNet ? " <span class=\"st-unknown\">+ cost unknown</span>" : "") + "</td>" +
      "<td>" + (b ? esc(b.item) + " <span class=\"muted\">" + signedShort(b.profit) + "</span>" : "<span class=\"muted\">cost unknown</span>") + "</td></tr>";
  }).join("");
  daysBody.addEventListener("click", function (ev) {
    var tr = ev.target.closest("tr[data-i]");
    if (tr) { select(+tr.getAttribute("data-i")); document.getElementById("st-day-title").scrollIntoView({ behavior: "smooth", block: "start" }); }
  });

  function drawSales() {
    var d = days[sel];
    document.getElementById("st-day-title").textContent = (d.d === localToday() ? "Today, " : "") + "sales on " + label(d.d, true);
    var body = document.querySelector("#st-sales tbody"), foot = document.querySelector("#st-sales tfoot");
    if (d.empty) {
      body.innerHTML = "<tr><td colspan=\"5\" class=\"muted\">No sales logged that day.</td></tr>";
      foot.innerHTML = "";
    } else {
      body.innerHTML = d.sales.map(function (s) {
        return "<tr><td>" + esc(s.item) + "</td><td class=\"num\">" + s.qty + "</td><td class=\"num\">" + fmt(s.price) + "</td>" +
          "<td class=\"num\">" + (s.paid === null ? "<span class=\"st-unknown\">unknown</span>" : s.paid === 0 ? "<span class=\"st-unknown\">free</span>" : fmt(s.paid)) + "</td>" +
          "<td class=\"num\">" + (s.profit === null ? "<span class=\"st-unknown\">?</span>" : "<strong class=\"" + cls(s.profit) + "\">" + signed(s.profit) + "</strong>") + "</td></tr>";
      }).join("");
      foot.innerHTML = "<tr><td>Day total</td><td class=\"num\">" + d.count + "</td><td class=\"num\" colspan=\"2\"><span class=\"muted\">" + fmt(d.net) + " in</span></td>" +
        "<td class=\"num " + cls(d.profit) + "\">" + signed(d.profit) + "</td></tr>";
    }
    daysBody.querySelectorAll("tr").forEach(function (tr) { tr.setAttribute("aria-selected", String(+tr.getAttribute("data-i") === sel)); });
  }

  function select(i) { sel = i; mark(i, false); drawSales(); }

  document.getElementById("st-mode").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-mode]");
    if (!b) return;
    mode = b.getAttribute("data-mode");
    this.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    document.getElementById("st-chart-title").textContent = mode === "total" ? "Running total" : "Profit per day";
    draw();
  });
  chartEl.addEventListener("keydown", function (ev) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    ev.preventDefault();
    select(Math.max(0, Math.min(days.length - 1, sel + (ev.key === "ArrowRight" ? 1 : -1))));
    mark(sel, true);
  });

  // The tab is hidden until opened, so (re)draw when it shows and when the window resizes.
  document.querySelectorAll("nav.tabs button[data-tab=\"store\"]").forEach(function (b) { b.addEventListener("click", draw); });
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { if (root.classList.contains("active")) draw(); }, 120); });
  window.addEventListener("hashchange", function () { if (location.hash === "#store") draw(); });
  draw();
  drawSales();
})();
