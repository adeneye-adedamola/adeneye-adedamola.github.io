// Page behaviour: light and dark mode, sticky navbar, mobile menu, active link while scrolling,
// fade-in on scroll, back-to-top button and the contact form.
// This file runs in <head> so a saved theme applies before the page paints.
(function () {
  var root = document.documentElement;
  root.classList.add("js");

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

    // Theme button
    var themeBtn = document.getElementById("themeBtn");
    function themeLabel() { if (themeBtn) themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode"); }
    themeLabel();
    if (themeBtn) themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* not saved, still switches */ }
      themeLabel();
    });

    // Navbar turns solid once you scroll; back-to-top button appears further down
    var navbar = document.getElementById("navbar");
    var toTop = document.getElementById("toTop");
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (navbar) navbar.classList.toggle("scrolled", y > 24);
      if (toTop) toTop.classList.toggle("show", y > 700);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Mobile menu
    var menuBtn = document.getElementById("menuBtn");
    var links = document.getElementById("navLinks");
    function setMenu(open) {
      if (!menuBtn || !links) return;
      links.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open && navbar) navbar.classList.add("scrolled");
      else onScroll();
    }
    if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    if (links) links.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

    // Highlight the nav link for the section on screen
    var navAnchors = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    var sections = navAnchors.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          navAnchors.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { spy.observe(s); });
    }

    // Fade sections in as they scroll into view
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add("in"); });
    }

    // Contact form: opens the visitor's email app with the message filled in
    var form = document.getElementById("contactForm");
    var err = document.getElementById("cf-error");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var subject = form.elements.subject.value.trim();
      var message = form.elements.message.value.trim();
      if (!name || !message) {
        err.textContent = !name ? "Add your name so I know who the message is from." : "Write a message before sending.";
        err.hidden = false;
        (!name ? form.elements.name : form.elements.message).focus();
        return;
      }
      err.hidden = true;
      var subj = subject || "Message from your portfolio";
      var body = message + "\n\n" + name;
      window.location.href = "mailto:adeneyeadedamola200@gmail.com?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    });
  });
})();
