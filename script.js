// Two jobs: light and dark mode, and the dot animation that draws the name in the header.
// This file runs in <head> so a saved theme applies before the page paints.
(function () {
  var root = document.documentElement;

  // ---------- light and dark mode ----------
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) { /* storage blocked: follow the system setting */ }
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    var btn = document.getElementById("themeBtn");
    function label() {
      if (!btn) return;
      var dark = isDark();
      btn.textContent = dark ? "Light mode" : "Dark mode";
      btn.setAttribute("aria-pressed", dark ? "true" : "false");
    }
    label();
    if (btn) btn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* not saved, still switches */ }
      label();
      window.dispatchEvent(new Event("themechange"));
    });
    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", function () { label(); window.dispatchEvent(new Event("themechange")); });
    }

    whenFontReady(startDots);
  });

  function whenFontReady(cb) {
    var done = false;
    function go() { if (!done) { done = true; cb(); } }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 100px "Syne"').then(go, go);
      setTimeout(go, 2500);
    } else {
      go();
    }
  }

  // ---------- the name, drawn in dots ----------
  // Scattered dots move into place to spell the name, like points settling into clusters.
  // A few pink "outliers" stay outside the letters. Dots move away from the pointer.
  function startDots() {
    var hero = document.querySelector(".hero");
    var canvas = document.getElementById("dots");
    if (!hero || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var LINES = ["Adeneye", "Adedamola"];
    var FONT = '"Syne", "Arial Black", sans-serif';
    var DUR = 1.6;            // seconds for a dot to reach its place
    var W = 0, H = 0, r = 2, pts = [], outs = [];
    var t0 = 0, raf = 0, visible = true, lastMove = -1e9;
    var px = -1e4, py = -1e4;
    var colDot = "#fff", colOut = "#FF8FC4";

    function readColours() {
      var cs = getComputedStyle(root);
      colDot = cs.getPropertyValue("--dot").trim() || colDot;
      colOut = cs.getPropertyValue("--outlier").trim() || colOut;
    }

    function build(animate) {
      hero.classList.add("has-dots");
      W = Math.floor(canvas.parentElement.clientWidth);
      if (!W) return false;

      // Size the type so the longest line fills the width.
      var o = document.createElement("canvas").getContext("2d");
      o.font = "800 100px " + FONT;
      var widest = 0;
      LINES.forEach(function (l) { widest = Math.max(widest, o.measureText(l).width); });
      var size = Math.min((W * 0.99) / (widest / 100), 240);
      o.font = "800 " + size + "px " + FONT;
      var m1 = o.measureText(LINES[0]), m2 = o.measureText(LINES[1]);
      var asc1 = m1.actualBoundingBoxAscent || size * 0.72, desc1 = m1.actualBoundingBoxDescent || size * 0.2;
      var asc2 = m2.actualBoundingBoxAscent || size * 0.72, desc2 = m2.actualBoundingBoxDescent || 0;
      var pad = Math.ceil(size * 0.04);
      var base1 = pad + asc1;
      var base2 = base1 + desc1 + size * 0.06 + asc2;
      H = Math.ceil(base2 + desc2 + pad);

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = H + "px";
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Draw the words off screen, then sample them on a grid to get the dot positions.
      var off = document.createElement("canvas");
      off.width = W; off.height = H;
      var oc = off.getContext("2d");
      oc.font = "800 " + size + "px " + FONT;
      oc.fillStyle = "#000";
      oc.fillText(LINES[0], 0, base1);
      oc.fillText(LINES[1], 0, base2);
      var data = oc.getImageData(0, 0, W, H).data;
      var inside = function (x, y) { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 100; };

      var step = Math.max(2.4, size / 21);   // dot spacing; a little tighter on small screens so the name stays readable
      r = step * 0.4;
      pts = [];
      for (var y = step / 2; y < H; y += step) {
        for (var x = step / 2; x < W; x += step) {
          if (inside(x, y)) {
            pts.push({ tx: x, ty: y, sx: animate ? Math.random() * W : x, sy: animate ? Math.random() * H : y, d: Math.random() * 0.55, ox: 0, oy: 0 });
          }
        }
      }

      // Outliers sit in the empty space, away from the letters.
      outs = [];
      var want = Math.max(7, Math.round(pts.length * 0.02));
      for (var tries = 0; outs.length < want && tries < want * 60; tries++) {
        var ox = r * 4 + Math.random() * (W - r * 8), oy = r * 4 + Math.random() * (H - r * 8);
        var clear = true;
        for (var a = 0; a < 8 && clear; a++) {
          var ang = a * Math.PI / 4;
          if (inside(ox, oy) || inside(ox + Math.cos(ang) * step * 2.5, oy + Math.sin(ang) * step * 2.5)) clear = false;
        }
        if (clear) outs.push({ x: ox, y: oy, ph: Math.random() * 6.28, sp: 0.5 + Math.random() * 0.7 });
      }
      return true;
    }

    function frame(now) {
      raf = 0;
      if (!t0) t0 = now;
      var t = (now - t0) / 1000;
      var R = Math.max(48, W * 0.07), R2 = R * R, push = R * 0.4;
      var moving = false;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = colDot;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var k = reduce ? 1 : (t - p.d) / DUR;
        k = k < 0 ? 0 : k > 1 ? 1 : k;
        if (k < 1) moving = true;
        var e = 1 - Math.pow(1 - k, 3);
        var x = p.sx + (p.tx - p.sx) * e;
        var y = p.sy + (p.ty - p.sy) * e;
        var gx = 0, gy = 0;
        if (!reduce) {
          var dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1, f = (1 - d / R) * push;
            gx = (dx / d) * f; gy = (dy / d) * f;
          }
        }
        p.ox += (gx - p.ox) * 0.16;
        p.oy += (gy - p.oy) * 0.16;
        if (Math.abs(p.ox) > 0.05 || Math.abs(p.oy) > 0.05) moving = true;
        x += p.ox; y += p.oy;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();

      var ro = r * 1.2;
      ctx.fillStyle = colOut;
      ctx.beginPath();
      for (var j = 0; j < outs.length; j++) {
        var q = outs[j];
        var qx = q.x + (reduce ? 0 : Math.sin(t * q.sp + q.ph) * 4);
        var qy = q.y + (reduce ? 0 : Math.cos(t * q.sp * 0.8 + q.ph) * 4);
        ctx.moveTo(qx + ro, qy);
        ctx.arc(qx, qy, ro, 0, 6.2832);
      }
      ctx.fill();

      // Keep animating while dots are settling, for a few seconds after load, or while the pointer is moving.
      var keep = moving || t < 8 || now - lastMove < 1500;
      if (keep && visible && !reduce) raf = requestAnimationFrame(frame);
    }

    function kick() {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    }

    readColours();
    if (!build(!reduce)) { hero.classList.remove("has-dots"); return; }
    kick();

    canvas.addEventListener("pointermove", function (ev) {
      var b = canvas.getBoundingClientRect();
      px = ev.clientX - b.left; py = ev.clientY - b.top;
      lastMove = performance.now();
      kick();
    });
    canvas.addEventListener("pointerleave", function () {
      px = py = -1e4; lastMove = performance.now(); kick();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) kick();
      }).observe(canvas);
    }

    var lastW = W, timer = 0;
    window.addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (Math.floor(canvas.parentElement.clientWidth) === lastW) return;
        if (build(false)) { lastW = W; kick(); }
      }, 150);
    });

    window.addEventListener("themechange", function () { readColours(); kick(); });
  }
})();
