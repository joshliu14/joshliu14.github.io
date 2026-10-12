/* =========================================================
   Joshua Liu: site interactions (no dependencies)
   ========================================================= */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year + local time ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  const clocks = $$("[data-clock]");
  const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
  const tick = () => {
    const now = timeFormat.format(new Date());
    clocks.forEach((el) => (el.textContent = `· ${now}`));
  };
  tick();
  setInterval(tick, 30000);

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2000);
  };

  /* ---------- Nav: scrolled state, progress, mobile menu ---------- */
  const nav = $("#nav");
  const navToggle = $("#nav-toggle");
  const progress = $("#progress");

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$(".nav__link").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false);
  });

  /* ---------- Nav: sliding indicator ---------- */
  const pill = $("#nav-pill");
  const navLinks = $$(".nav__link");
  let activeLink = null;

  const movePill = (link) => {
    if (!link || link.offsetParent === null) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.style.opacity = "1";
  };
  navLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => movePill(link));
    link.addEventListener("focus", () => movePill(link));
  });
  $("#nav-links").addEventListener("mouseleave", () => movePill(activeLink));
  window.addEventListener("resize", () => movePill(activeLink));

  const linkFor = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = $$("main section[id]");
  const updateActive = () => {
    const line = window.innerHeight * 0.4;
    let current = null;
    for (const section of sections) {
      const r = section.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) current = section.id;
    }
    const link = linkFor.get(current) || null;
    if (link === activeLink) return;
    navLinks.forEach((a) => a.classList.toggle("is-active", a === link));
    activeLink = link;
    if (!$("#nav-links").matches(":hover")) movePill(link);
  };
  updateActive();
  window.addEventListener("scroll", updateActive, { passive: true });

  /* ---------- Hero parallax as it scrolls away ---------- */
  const heroName = $(".hero__name");
  const heroPortrait = $(".hero__portrait");
  if (!reduceMotion && heroName && heroPortrait) {
    let ticking = false;
    const parallax = () => {
      const y = Math.min(window.scrollY, window.innerHeight);
      heroName.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      heroPortrait.style.transform = `translate3d(0, ${y * -0.06}px, 0)`;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(parallax);
        }
      },
      { passive: true }
    );
  }

  /* ---------- Scroll reveal (only for content below the first screen) ---------- */
  const revealables = $$("[data-reveal]");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const fold = window.innerHeight;
    const pending = revealables.filter((el) => el.getBoundingClientRect().top > fold * 0.92);
    pending.forEach((el) => el.classList.add("pending"));

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        entering.forEach((el, i) => {
          el.style.setProperty("--stagger", `${i * 90}ms`);
          el.classList.remove("pending");
          observer.unobserve(el);
          setTimeout(() => el.style.removeProperty("--stagger"), 1200 + i * 90);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    pending.forEach((el) => observer.observe(el));
  }

  /* ---------- Experience accordion ---------- */
  $$(".role__head").forEach((head) => {
    head.addEventListener("click", () => {
      const role = head.closest(".role");
      const open = !role.classList.contains("is-open");
      role.classList.toggle("is-open", open);
      head.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Copy email ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const range = document.createRange();
        range.selectNodeContents($(".contact__address"));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        showToast("Press Ctrl+C or Cmd+C to copy");
        return;
      }
      const label = $("span", btn);
      btn.classList.add("is-copied");
      label.textContent = "Copied";
      showToast("Email copied");
      setTimeout(() => {
        btn.classList.remove("is-copied");
        label.textContent = "Copy";
      }, 2000);
    });
  });
})();
