/* =========================================================
   Joshua Liu: site interactions (no dependencies)
   ========================================================= */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200);
  };

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  const navToggle = $("#nav-toggle");
  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  navToggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$(".nav__link").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  const onScrollNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
  onScrollNav();
  window.addEventListener("scroll", onScrollNav, { passive: true });

  // Active link
  const links = new Map($$(".nav__link").map((a) => [a.getAttribute("href").slice(1), a]));
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.remove("is-active"));
        const link = links.get(entry.target.id);
        if (link) link.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal + count-up ---------- */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const format = (v) => prefix + v.toFixed(decimals) + suffix;
    if (reduceMotion) {
      el.textContent = format(target);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * t);
      el.textContent = format(target * (t === 1 ? 1 : eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        $$("[data-count]", entry.target).forEach(countUp);
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  $$("[data-reveal]").forEach((el) => revealObserver.observe(el));

  /* ---------- Experience timeline progress ---------- */
  const xpList = $("#xp-list");
  if (xpList) {
    let ticking = false;
    const update = () => {
      const r = xpList.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / r.height));
      xpList.style.setProperty("--progress", p.toFixed(4));
      ticking = false;
    };
    const request = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  }

  /* ---------- Spotlight hover ---------- */
  if (finePointer) {
    $$(".spot").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Trading card: tilt + flip ---------- */
  const card = $("#tcard");
  if (card) {
    const flip = () => {
      const flipped = card.classList.toggle("is-flipped");
      card.setAttribute("aria-pressed", String(flipped));
    };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });

    if (finePointer && !reduceMotion) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add("is-tilting");
        card.style.setProperty("--ry", `${(x - 0.5) * 20}deg`);
        card.style.setProperty("--rx", `${(0.5 - y) * 16}deg`);
        card.style.setProperty("--px", `${x * 100}%`);
        card.style.setProperty("--py", `${y * 100}%`);
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    }
  }

  /* ---------- Hero canvas: reactive dot field ---------- */
  const canvas = $(".hero__canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const hero = $(".hero");
    const GAP = 30;
    const RADIUS = 170;
    let w = 0;
    let h = 0;
    let dots = [];
    let running = false;
    let rafId = 0;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const ox = (w % GAP) / 2;
      const oy = (h % GAP) / 2;
      for (let y = oy; y <= h; y += GAP) {
        for (let x = ox; x <= w; x += GAP) dots.push(x, y);
      }
    };

    const draw = (t) => {
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      ctx.clearRect(0, 0, w, h);

      // Base field
      ctx.fillStyle = "rgba(242, 240, 233, 0.13)";
      ctx.beginPath();
      const lit = [];
      for (let i = 0; i < dots.length; i += 2) {
        const x = dots[i];
        const y = dots[i + 1];
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < RADIUS) {
          lit.push(x, y, dx, dy, d);
          continue;
        }
        const wave = reduceMotion ? 0 : Math.sin(x * 0.012 + t * 0.0007) * Math.cos(y * 0.014 - t * 0.0005);
        const r = 0.9 + wave * 0.35;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();

      // Dots near the pointer light up and get pushed away
      for (let i = 0; i < lit.length; i += 5) {
        const inf = 1 - lit[i + 4] / RADIUS;
        const push = inf * inf * 10;
        const n = lit[i + 4] || 1;
        const x = lit[i] + (lit[i + 2] / n) * push;
        const y = lit[i + 1] + (lit[i + 3] / n) * push;
        ctx.fillStyle = `rgba(212, 255, 58, ${0.15 + inf * 0.85})`;
        ctx.beginPath();
        ctx.arc(x, y, 1 + inf * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (t) => {
      draw(t);
      rafId = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    build();
    draw(0);
    window.addEventListener("resize", () => {
      build();
      draw(performance.now());
    });

    if (finePointer) {
      hero.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.tx = e.clientX - r.left;
        pointer.ty = e.clientY - r.top;
        if (pointer.x < -999) {
          pointer.x = pointer.tx;
          pointer.y = pointer.ty;
        }
        if (reduceMotion) draw(0);
      });
      hero.addEventListener("pointerleave", () => {
        pointer.tx = pointer.ty = -9999;
        pointer.x = pointer.y = -9999;
        if (reduceMotion) draw(0);
      });
    }

    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

  /* ---------- Core utilization viz ---------- */
  const cores = $("#cores");
  const coresState = $("#cores-state");
  if (cores && !reduceMotion) {
    let timer = 0;
    const toggle = () => {
      const on = cores.classList.toggle("is-optimized");
      coresState.textContent = on ? "target" : "baseline";
    };
    new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) {
        timer = setInterval(toggle, 2600);
        setTimeout(toggle, 900);
      }
    }).observe(cores);
  }

  /* ---------- Copy email ---------- */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      const label = $("span", btn);
      btn.classList.add("is-copied");
      label.textContent = "Copied";
      showToast(`Copied ${text}`);
      setTimeout(() => {
        btn.classList.remove("is-copied");
        label.textContent = "Copy";
      }, 2000);
    });
  });

  /* ---------- Detection mode: run "YOLO" on the page itself ---------- */
  const layer = $("#detect-layer");
  const hud = $("#detect-hud");
  const detectBtn = $("#detect-toggle");
  const COLORS = {
    headline: "var(--accent)",
    title: "var(--accent)",
    person: "var(--pink)",
    baseball_game: "var(--pink)",
    trading_card: "var(--pink)",
    button: "var(--orange)",
    metric: "var(--cyan)",
    stat: "var(--cyan)",
    skill: "var(--violet)",
    logo: "var(--orange)",
    card: "rgba(242, 240, 233, 0.55)",
    text: "rgba(242, 240, 233, 0.35)",
  };
  const RULES = [
    [".nav__logo", "logo"],
    ["#tcard", "trading_card"],
    ["img[data-det]", (el) => el.dataset.det],
    ["h1, h2", "headline"],
    ["h3", "title"],
    [".btn, .copy-btn, .detect-toggle", "button"],
    [".metric", "metric"],
    [".fact", "stat"],
    [".chip, .stack li", "skill"],
    [".xp__card, .rcard, .proj, .sgroup, .ecard, .side__item", "card"],
    ["main p", "text"],
  ];
  const conf = new WeakMap();
  const boxes = new Map();
  let detecting = false;
  let detectRaf = 0;
  let detectTimer = 0;

  const isVisible = (el) => {
    if (el.closest(".tcard") && el.id !== "tcard") return false;
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    return true;
  };

  const scan = () => {
    detectRaf = 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const navBottom = nav.getBoundingClientRect().bottom;
    const seen = new Set();
    let count = 0;

    for (const [selector, cls] of RULES) {
      for (const el of $$(selector)) {
        if (seen.has(el) || count >= 80) continue;
        const r = el.getBoundingClientRect();
        // Content scrolled under the fixed nav gets clipped at the nav's edge
        const top = nav.contains(el) ? r.top : Math.max(r.top, navBottom);
        const height = r.bottom - top;
        if (r.width < 18 || height < 12 || top > vh || r.right < 0 || r.left > vw) continue;
        if (!isVisible(el)) continue;
        seen.add(el);
        count++;

        const label = typeof cls === "function" ? cls(el) : cls;
        if (!conf.has(el)) conf.set(el, (0.8 + Math.random() * 0.19).toFixed(2));
        let box = boxes.get(el);
        if (!box) {
          box = document.createElement("div");
          box.className = "dbox";
          box.style.setProperty("--c", COLORS[label] || "var(--accent)");
          box.innerHTML = `<span>${label} ${conf.get(el)}</span>`;
          layer.appendChild(box);
          boxes.set(el, box);
        }
        box.style.left = `${r.left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${r.width}px`;
        box.style.height = `${height}px`;
        box.classList.toggle("is-top", top < 18 || (top > r.top && !nav.contains(el)) || top - navBottom < 16);
      }
    }

    boxes.forEach((box, el) => {
      if (!seen.has(el)) {
        box.remove();
        boxes.delete(el);
      }
    });

    hud.innerHTML = `<i></i> detecting · <b>${count}</b> objects <button type="button" data-stop>stop (esc)</button>`;
  };
  const requestScan = () => {
    if (detecting && !detectRaf) detectRaf = requestAnimationFrame(scan);
  };

  const setDetect = (on) => {
    detecting = on;
    detectBtn.setAttribute("aria-pressed", String(on));
    hud.classList.toggle("is-on", on);
    if (on) {
      scan();
      detectTimer = setInterval(requestScan, 400);
    } else {
      clearInterval(detectTimer);
      cancelAnimationFrame(detectRaf);
      detectRaf = 0;
      boxes.forEach((box) => box.remove());
      boxes.clear();
    }
  };

  detectBtn.addEventListener("click", () => setDetect(!detecting));
  hud.addEventListener("click", (e) => {
    if (e.target.closest("[data-stop]")) setDetect(false);
  });
  window.addEventListener("scroll", requestScan, { passive: true });
  window.addEventListener("resize", requestScan);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key === "d" || e.key === "D") setDetect(!detecting);
    else if (e.key === "Escape") {
      if (detecting) setDetect(false);
      if (nav.classList.contains("is-open")) setMenu(false);
    }
  });

  /* ---------- Hello, fellow dev ---------- */
  console.log(
    "%c JL¹⁴ %c Hey, you opened the console. Respect. Press D on the page to run detection, or say hi: joshua.liu@tufts.edu",
    "background:#d4ff3a;color:#0a0a0b;font-weight:700;padding:4px 6px;border-radius:4px",
    "color:inherit;padding:4px"
  );
})();
