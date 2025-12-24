// js/animations.js
(() => {
  // Fail safely if GSAP isn't loaded
  if (typeof window.gsap === "undefined") return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Helpers ----------
  const refreshAfterAssets = () => {
  if (!window.ScrollTrigger) return;

  const images = Array.from(document.images || []);
  const iframes = Array.from(document.querySelectorAll("iframe"));

  const imgPromises = images.map((img) => {
    // If already loaded, resolve immediately
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();

    // Prefer decode if available (more reliable)
    if (img.decode) return img.decode().catch(() => {});

    // Fallback to load/error events
    return new Promise((res) => {
      img.addEventListener("load", res, { once: true });
      img.addEventListener("error", res, { once: true });
    });
  });

  const iframePromises = iframes.map((fr) => {
    // Some iframes never fire reliably; still attempt
    return new Promise((res) => {
      fr.addEventListener("load", res, { once: true });
      // fallback timer so we don’t hang
      setTimeout(res, 1200);
    });
  });

  const fontsReady =
    document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();

  Promise.all([fontsReady, ...imgPromises, ...iframePromises]).then(() => {
    // Multiple refreshes help with late layout shifts
    ScrollTrigger.refresh();
    setTimeout(() => ScrollTrigger.refresh(), 250);
    setTimeout(() => ScrollTrigger.refresh(), 800);
  });
};
  

  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const setSafeDefaults = () => {
    // Avoid accidental horizontal scroll from transforms
    document.documentElement.style.overflowX = "hidden";
  };

  // ---------- Intro / Hero ----------
  const heroIntro = () => {
    // Only animate what's available on the page
    const headlineBar = document.querySelector('[data-reveal="fade-down"]');
    const heroBadge = document.querySelector('[data-reveal="badge"]');
    const heroHeadline = document.querySelector('[data-reveal="headline"]');
    const heroCopy = document.querySelector('p[data-reveal="fade-up"]');
    const heroButtonsWrap = document.querySelector('[data-stagger="buttons"]');
    const heroMedia = document.querySelector('[data-reveal="media"]');

    if (prefersReducedMotion) {
      // Make sure elements are visible if reduced motion is preferred
      qsa(".js-reveal, .js-stagger").forEach((el) => gsap.set(el, { clearProps: "all" }));
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

    if (headlineBar) tl.from(headlineBar, { y: -16, opacity: 0, duration: 0.6 }, 0);

    if (heroBadge) tl.from(heroBadge, { y: 16, opacity: 0, scale: 0.98 }, 0.15);

    if (heroHeadline) tl.from(heroHeadline, { y: 22, opacity: 0 }, 0.25);

    if (heroCopy) tl.from(heroCopy, { y: 18, opacity: 0, duration: 0.7 }, 0.35);

    if (heroButtonsWrap) {
      const btns = qsa("a, button", heroButtonsWrap);
      if (btns.length) tl.from(btns, { y: 14, opacity: 0, stagger: 0.12, duration: 0.6 }, 0.45);
    }

    if (heroMedia) tl.from(heroMedia, { y: 18, opacity: 0, duration: 0.9 }, 0.25);

    // Nice subtle “dot pulse” (non-annoying)
    const dot = document.querySelector(".js-pulse-dot");
    if (dot) {
      gsap.to(dot, {
        scale: 1.35,
        opacity: 0.6,
        duration: 0.9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.8,
      });
    }
  };

  // ---------- Scroll Reveals ----------
  // ---------- Scroll Reveals (safe + re-runnable) ----------
const revealOnScroll = (root = document) => {
  if (!ScrollTrigger || prefersReducedMotion) return;

  // Generic reveals
  qsa(".js-reveal", root).forEach((el) => {
    if (el.dataset.gsapDone === "1") return; // prevent duplicates
    el.dataset.gsapDone = "1";

    const type = el.dataset.reveal || "fade-up";

    const varsByType = {
      fade: { opacity: 0 },
      "fade-up": { y: 18, opacity: 0 },
      "fade-down": { y: -18, opacity: 0 },
      badge: { y: 12, opacity: 0, scale: 0.985 },
      headline: { y: 24, opacity: 0 },
      media: { y: 18, opacity: 0, scale: 0.99 },
      video: { y: 16, opacity: 0, scale: 0.99 },
      cta: { y: 18, opacity: 0, scale: 0.99 },
    };

    const fromVars = varsByType[type] || varsByType["fade-up"];

    gsap.from(el, {
      ...fromVars,
      duration: 0.85,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        end: "bottom 60%",
        toggleActions: "play none none reverse",
      },
    });
  });

  // Stagger groups
  qsa(".js-stagger", root).forEach((wrap) => {
    if (wrap.dataset.gsapDone === "1") return;
    wrap.dataset.gsapDone = "1";

    const mode = wrap.dataset.stagger || "items";

    let items = [];
    if (mode === "cards" || mode === "mini-cards" || mode === "mini-grid") items = qsa(".js-card", wrap);
    else if (mode === "buttons") items = qsa("a, button", wrap);
    else if (mode === "section-title" || mode === "center-title" || mode === "content") items = qsa(":scope > *", wrap);
    else if (mode === "list") items = qsa("li", wrap);
    else if (mode === "lines") items = qsa("span", wrap);
    else if (mode === "links") items = qsa("a, select, div", wrap);
    else items = qsa(":scope > *", wrap);

    if (!items.length) return;

    gsap.from(items, {
      y: 16,
      opacity: 0,
      duration: 0.65,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: wrap,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    });
  });
};


// Re-run reveals when navbar/footer are injected later
const watchMounts = () => {
  if (!ScrollTrigger || prefersReducedMotion) return;

  const mounts = ["#navbarMount", "#footerMount"]
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);

  if (!mounts.length) return;

  const obs = new MutationObserver(() => {
    // Run reveal setup again (only new elements will be animated)
    revealOnScroll(document);

    // Refresh triggers so ScrollTrigger recalculates
    ScrollTrigger.refresh();
  });

  mounts.forEach((m) => obs.observe(m, { childList: true, subtree: true }));
};

  // ---------- Parallax (very light) ----------
  const parallax = () => {
    if (!ScrollTrigger || prefersReducedMotion) return;

    // Glow layer parallax
    qsa('[data-parallax="glow"]').forEach((el) => {
      gsap.to(el, {
        y: -18,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    });

    // Image parallax
    qsa('[data-parallax="image"]').forEach((img) => {
      gsap.to(img, {
        y: 16,
        ease: "none",
        scrollTrigger: {
          trigger: img,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    });
  };

  // ---------- Hover micro-interactions (no layout shift) ----------
  const cardHover = () => {
    // This is subtle and safe even without GSAP, but we’ll use GSAP for smoothness
    const cards = qsa(".js-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        if (prefersReducedMotion) return;
        gsap.to(card, { y: -4, duration: 0.25, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        if (prefersReducedMotion) return;
        gsap.to(card, { y: 0, duration: 0.25, ease: "power2.out" });
      });
    });
  };

  // ---------- Init ----------
  const init = () => {
    setSafeDefaults();
    heroIntro();
    revealOnScroll();
    parallax();
    cardHover();
    watchMounts();

    refreshAfterAssets();

    // Refresh ScrollTrigger after dynamic mounts (navbar/footer)
    // (your navbar/footer are injected, so we refresh a bit later)
    if (ScrollTrigger && !prefersReducedMotion) {
      window.addEventListener("load", () => ScrollTrigger.refresh());
      setTimeout(() => ScrollTrigger.refresh(), 600);
      setTimeout(() => ScrollTrigger.refresh(), 1400);
    }
  };

  // Run once DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
