(function () {
  const prefix = "/monobot-studio";

  const socialPreviewAssets = [
    {
      src: `${prefix}/og.png`,
      alt: "Monobot Studio: Si no se debe pensar, se debe automatizar",
      label: "Brand statement",
      format: "Social preview · 3:2",
      featured: true,
    },
    {
      src: `${prefix}/brand/monobot-front.png`,
      alt: "Monobot flotando sobre un fondo cálido",
      label: "Monobot en acción",
      format: "Visual de campaña · 1:1",
    },
    {
      src: `${prefix}/brand/monobot-angle.png`,
      alt: "Monobot señalando",
      label: "Dirección visual",
      format: "Asset de apoyo · 4:3",
    },
  ];

  const socialPlatforms = [
    {
      name: "Facebook",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.7.3-1 1-1Z"/></svg>',
    },
    {
      name: "X",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.2l3.5 4.8L16.8 4H19l-5.3 6.2L20 20h-4.2l-4-5.5L7.2 20H5l5.8-6.9L5 4Zm3.1 1.7 8.5 12.6h1.3L9.4 5.7H8.1Z"/></svg>',
    },
    {
      name: "Instagram",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.7" r="1.2"/></svg>',
    },
    {
      name: "YouTube",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="#fff"/></svg>',
    },
    {
      name: "TikTok",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3v10.7a4.6 4.6 0 1 1-4-4.6v3.2a1.6 1.6 0 1 0 1 1.5V3h3Zm0 2.6c.8 1.6 2 2.5 4 2.7v3.1c-1.5-.1-2.8-.6-4-1.4V5.6Z"/></svg>',
    },
  ];

  const createSocialLinks = (placement, showPending = false) => {
    const block = document.createElement("div");
    block.className = `social-links-block social-links-${placement}`;
    const icons = document.createElement("div");
    icons.className = "social-links";
    icons.setAttribute("aria-label", "Redes sociales de Monobot Studio, enlaces pendientes");
    socialPlatforms.forEach((platform) => {
      const icon = document.createElement("span");
      icon.className = "social-icon";
      icon.setAttribute("role", "img");
      icon.setAttribute("aria-label", `${platform.name} — enlace pendiente`);
      icon.setAttribute("title", `${platform.name} — enlace pendiente`);
      icon.innerHTML = platform.icon;
      icons.appendChild(icon);
    });
    block.appendChild(icons);
    if (showPending) {
      const pending = document.createElement("small");
      pending.className = "social-links-pending";
      pending.textContent = "Pendiente: conectar perfiles oficiales.";
      block.appendChild(pending);
    }
    return block;
  };

  document.querySelectorAll(".nav").forEach((nav) => {
    const cta = nav.querySelector(".nav-cta");
    if (cta) nav.insertBefore(createSocialLinks("header"), cta);
  });

  const siteHeaders = [...document.querySelectorAll(".site-header")];
  if (siteHeaders.length) {
    const headerSpacers = new Map();
    siteHeaders.forEach((header) => {
      const spacer = document.createElement("div");
      spacer.className = "site-header-spacer";
      spacer.setAttribute("aria-hidden", "true");
      header.after(spacer);
      headerSpacers.set(header, spacer);
    });

    let headerFrame;
    const updateHeaderState = () => {
      const isCompact = window.scrollY > 56;
      siteHeaders.forEach((header) => {
        const spacer = headerSpacers.get(header);
        if (isCompact === header.classList.contains("is-compact")) return;
        if (isCompact) {
          const styles = window.getComputedStyle(header);
          const occupiedHeight = header.offsetHeight + parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
          spacer.style.height = `${occupiedHeight}px`;
          header.classList.add("is-compact");
        } else {
          header.classList.remove("is-compact");
          spacer.style.height = "0px";
        }
      });
      headerFrame = undefined;
    };
    const requestHeaderUpdate = () => {
      if (headerFrame) return;
      headerFrame = window.requestAnimationFrame(updateHeaderState);
    };
    updateHeaderState();
    window.addEventListener("scroll", requestHeaderUpdate, { passive: true });
    window.addEventListener("resize", requestHeaderUpdate, { passive: true });
  }

  document.querySelectorAll(".mobile-menu > div").forEach((menu) => {
    menu.appendChild(createSocialLinks("mobile"));
  });

  document.querySelectorAll("footer .footer-main > div:last-child").forEach((column) => {
    const button = column.querySelector(".footer-agenda-button");
    const socialBlock = createSocialLinks("footer", true);
    if (button) column.insertBefore(socialBlock, button);
    else column.appendChild(socialBlock);
  });

  const normalizePath = (path) => path.replace(/\/+$/, "") || "/";
  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    const isBlogAdmin = currentPath.startsWith(`${prefix}/admin/blog`) && linkPath === `${prefix}/blog`;
    if (currentPath === linkPath || isBlogAdmin) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  document.querySelectorAll("[data-social-preview-gallery]").forEach((gallery) => {
    const isHero = gallery.dataset.socialPreviewGallery === "hero";
    socialPreviewAssets.forEach((asset, index) => {
      const card = document.createElement("figure");
      card.className = `social-preview-card${asset.featured ? " social-preview-featured" : ""}`;

      const image = document.createElement("img");
      image.src = asset.src;
      image.alt = asset.alt;
      image.decoding = "async";
      image.loading = isHero && index === 0 ? "eager" : "lazy";
      image.fetchPriority = isHero && index === 0 ? "high" : "auto";
      image.sizes = isHero
        ? "(max-width: 700px) calc(100vw - 64px), (max-width: 1000px) 70vw, 42vw"
        : "(max-width: 700px) calc(100vw - 32px), 60vw";

      const caption = document.createElement("figcaption");
      const label = document.createElement("strong");
      const format = document.createElement("span");
      label.textContent = asset.label;
      format.textContent = asset.format;
      caption.append(label, format);
      card.append(image, caption);
      gallery.appendChild(card);
    });
  });

  document.querySelectorAll(".mobile-menu").forEach((menu) => {
    let previousY = window.scrollY;
    window.addEventListener("scroll", () => {
      if (Math.abs(window.scrollY - previousY) > 6) menu.removeAttribute("open");
      previousY = window.scrollY;
    }, { passive: true });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => menu.removeAttribute("open")));
  });

  document.querySelectorAll(".faq-group").forEach((group) => {
    group.querySelectorAll("details").forEach((item) => item.addEventListener("toggle", () => {
      if (!item.open) return;
      group.querySelectorAll("details[open]").forEach((other) => {
        if (other !== item) other.removeAttribute("open");
      });
    }));
  });

  const storageKey = "monobot-blog-drafts";
  const readDrafts = () => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  };
  const saveDrafts = (drafts) => localStorage.setItem(storageKey, JSON.stringify(drafts));

  const adminForm = document.querySelector(".editor-form");
  const draftList = document.querySelector(".draft-list");
  if (adminForm && draftList) {
    const fields = adminForm.querySelectorAll("input, select, textarea");
    const [title, category, date, summary, body, published] = fields;
    if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);

    const renderDrafts = () => {
      const drafts = readDrafts();
      draftList.innerHTML = "<h2>Borradores</h2>";
      if (!drafts.length) {
        draftList.insertAdjacentHTML("beforeend", "<p>Aún no hay artículos guardados.</p>");
        return;
      }
      drafts.forEach((draft) => {
        const article = document.createElement("article");
        article.innerHTML = `<small>${draft.date} · ${draft.category}</small><h3></h3><p></p><div><button data-action="publish">${draft.published ? "Retirar" : "Publicar"}</button><button data-action="delete">Eliminar</button></div>`;
        article.querySelector("h3").textContent = draft.title;
        article.querySelector("p").textContent = draft.summary;
        article.querySelector('[data-action="publish"]').addEventListener("click", () => {
          saveDrafts(readDrafts().map((item) => item.id === draft.id ? { ...item, published: !item.published } : item));
          renderDrafts();
        });
        article.querySelector('[data-action="delete"]').addEventListener("click", () => {
          saveDrafts(readDrafts().filter((item) => item.id !== draft.id));
          renderDrafts();
        });
        draftList.appendChild(article);
      });
    };

    adminForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const draft = { id: crypto.randomUUID(), title: title.value.trim(), category: category.value, date: date.value, summary: summary.value.trim(), body: body.value.trim(), published: published.checked };
      saveDrafts([draft, ...readDrafts()]);
      adminForm.reset();
      date.value = new Date().toISOString().slice(0, 10);
      renderDrafts();
    });
    renderDrafts();
  }

  const newsletter = document.querySelector(".newsletter");
  if (newsletter && window.location.pathname.startsWith(`${prefix}/blog`)) {
    const drafts = readDrafts().filter((draft) => draft.published);
    if (drafts.length) {
      const section = document.createElement("section");
      section.className = "local-posts shell";
      section.innerHTML = `<div class="resources-head"><div><p class="kicker">Publicados desde el editor local</p><h2>Nuevas notas.</h2></div><a href="${prefix}/admin/blog">Administrar artículos ↗</a></div><div class="post-grid"></div>`;
      const grid = section.querySelector(".post-grid");
      drafts.forEach((draft) => {
        const entry = document.createElement("details");
        entry.className = "post-entry";
        entry.innerHTML = `<summary><div class="post-meta"><span>${draft.date} · ${draft.category}</span><b>NUEVO</b></div><h2></h2><p></p><small>Leer entrada <i>＋</i></small></summary><div class="post-body"><p></p></div>`;
        entry.querySelector("h2").textContent = draft.title;
        entry.querySelector("summary > p").textContent = draft.summary;
        entry.querySelector(".post-body p").textContent = draft.body;
        grid.appendChild(entry);
      });
      newsletter.before(section);
    }
  }
})();
