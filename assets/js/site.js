/*
  Prakshal Shah — Portfolio
  Hand-written vanilla JS. No frameworks, no external libraries, no build step.

  Two independent, progressively-enhanced features:
  1. Hero particle network (canvas) — purely decorative.
  2. Scroll-reveal for sections/cards via IntersectionObserver.

  Everything here fails gracefully: if JS is disabled, the page is fully
  readable — nothing here is required for content to appear.
*/

(function () {
  "use strict";

  // Mark that JS is active, so CSS can opt reveal-animations in only now.
  document.documentElement.classList.add("js");

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------------
     1. Scroll reveal
     --------------------------------------------------------------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------------
     2. Hero particle network
     --------------------------------------------------------------- */
  function initParticleNetwork() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var wrap = canvas.parentElement;
    var particles = [];
    var pointer = { x: null, y: null, active: false };
    var width, height, dpr;
    var rafId = null;

    var DENSITY = 9000; // px^2 per particle — lower = more particles
    var MAX_LINK_DIST = 130;
    var SPEED = 0.18;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function seedParticles() {
      var count = Math.max(18, Math.min(70, Math.round((width * height) / DENSITY)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
          r: Math.random() * 1.6 + 0.6
        });
      }
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (pointer.active) {
          var dx = pointer.x - p.x;
          var dy = pointer.y - p.y;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < 30000) {
            p.x -= dx * 0.0025;
            p.y -= dy * 0.0025;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240, 151, 63, 0.85)"; /* --leaf (amber) */
        ctx.fill();
      }

      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var pa = particles[a];
          var pb = particles[b];
          var ddx = pa.x - pb.x;
          var ddy = pa.y - pb.y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < MAX_LINK_DIST) {
            var alpha = (1 - d / MAX_LINK_DIST) * 0.35;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = "rgba(217, 123, 41, " + alpha.toFixed(3) + ")"; /* --amber */
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(step);
    }

    function onPointerMove(e) {
      var rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
    }

    window.addEventListener("resize", debounce(resize, 200));
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerleave", onPointerLeave);

    // Pause animation when hero is off-screen to save CPU/battery.
    if ("IntersectionObserver" in window) {
      var visObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!rafId) { resize(); rafId = requestAnimationFrame(step); }
          } else if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        });
      });
      visObserver.observe(wrap);
    } else {
      resize();
      rafId = requestAnimationFrame(step);
    }
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  var isFinePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------------------------------------------------------
     3. Custom cursor — ring + dot, only on mouse/trackpad devices
     --------------------------------------------------------------- */
  function initCustomCursor() {
    if (!isFinePointer || prefersReducedMotion) return;

    document.documentElement.classList.add("custom-cursor");

    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ringPos = { x: mouse.x, y: mouse.y };
    var active = false;

    window.addEventListener("mousemove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!active) {
        active = true;
        dot.classList.add("is-active");
        ring.classList.add("is-active");
      }
      dot.style.left = mouse.x + "px";
      dot.style.top = mouse.y + "px";

      var target = e.target.closest("a, button, .project-card, [data-cursor-hover]");
      ring.classList.toggle("is-hovering", !!target);
    });

    document.addEventListener("mouseleave", function () {
      active = false;
      dot.classList.remove("is-active");
      ring.classList.remove("is-active");
    });

    (function follow() {
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      ring.style.left = ringPos.x + "px";
      ring.style.top = ringPos.y + "px";
      requestAnimationFrame(follow);
    })();
  }

  /* ---------------------------------------------------------------
     4. Subtle 3D tilt on project cards
     --------------------------------------------------------------- */
  function initCardTilt() {
    if (!isFinePointer || prefersReducedMotion) return;

    var cards = document.querySelectorAll(".project-card");
    cards.forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        var relX = (e.clientX - rect.left) / rect.width - 0.5;
        var relY = (e.clientY - rect.top) / rect.height - 0.5;
        var rotateX = (relY * -8).toFixed(2);
        var rotateY = (relX * 10).toFixed(2);
        card.style.transform =
          "perspective(700px) rotateX(" + rotateX + "deg) rotateY(" + rotateY +
          "deg) translateY(-6px)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------
     5. Magnetic effect on primary buttons
     --------------------------------------------------------------- */
  function initMagneticButtons() {
    if (!isFinePointer || prefersReducedMotion) return;

    var buttons = document.querySelectorAll(".button");
    buttons.forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var rect = btn.getBoundingClientRect();
        var relX = e.clientX - (rect.left + rect.width / 2);
        var relY = e.clientY - (rect.top + rect.height / 2);
        btn.style.transform = "translate(" + relX * 0.25 + "px, " + relY * 0.35 + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------
     6. Hero blueprint-grid parallax on scroll
     --------------------------------------------------------------- */
  function initParallax() {
    if (prefersReducedMotion) return;
    var layer = document.querySelector("[data-parallax]");
    if (!layer) return;

    window.addEventListener(
      "scroll",
      function () {
        var shift = window.scrollY * 0.12;
        layer.style.transform = "translateY(" + shift + "px)";
      },
      { passive: true }
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    initScrollReveal();
    initCustomCursor();
    initCardTilt();
    initMagneticButtons();
    initParallax();
    if (!prefersReducedMotion) initParticleNetwork();
  });
})();
