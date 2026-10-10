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
