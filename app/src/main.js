// Neon Shore — editor wiring.
//
// The editor holds one state object per cover: the photos in each panel,
// the lettering, the quote, the cast tags and the switches. Every control
// edits the state and redraws the same canvas the exports draw from, so
// what you see is what the PNG holds.
//
// Photos are the two kit samples, plus anything the user drops in; nothing
// is uploaded anywhere. Crops are face-safe by default: a panel's focal
// point sits at the upper third of its photo, where a face usually is.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // --- presets: one cover per sample photo, each with its own words -------
  // The cast tags follow the photos: the pier shot is an older fisherman
  // with a rod, so he is THE CAPTAIN; the boulevard shot is a woman
  // leaning on a red convertible, so she is THE DRIVER.

  const PRESETS = {
    pier: {
      title: "NEON TIDE",
      subtitle: "chasing the last light",
      slogan: "EVERY SUNSET HAS A PRICE",
      quote: "A SUNSET WITH TEETH.",
      quoteSource: "THE SHORELINE POST",
      stars: 4,
      location: "NEON SHORE · 7:15 PM",
      ticket: "VOL. 1",
      hero: { photo: "pier", fx: 0.5, fy: 0.26, zoom: 1, panX: 0, panY: 0, tag: "THE CAPTAIN" },
      cells: [
        { photo: "boulevard", fx: 0.5, fy: 0.26, zoom: 1.25, panX: 0, panY: 0, tag: "THE DRIVER" },
        { photo: "pier", fx: 0.42, fy: 0.26, zoom: 1.4, panX: 0, panY: 0, tag: "THE LOOKOUT" },
        { photo: "boulevard", fx: 0.5, fy: 0.28, zoom: 1.35, panX: 0, panY: 0, flip: true, tag: "THE FIXER" },
        { photo: "pier", fx: 0.45, fy: 0.28, zoom: 1.15, panX: 0, panY: 0, tag: "THE INSIDER" },
      ],
    },
    boulevard: {
      title: "MIDNIGHT MILE",
      subtitle: "the city never blinks",
      slogan: "FOUR LANES · NO BRAKES",
      quote: "FASTER THAN THE RUMOUR.",
      quoteSource: "THE BOULEVARD GAZETTE",
      stars: 5,
      location: "BOULEVARD · 11:48 PM",
      ticket: "VOL. 1",
      hero: { photo: "boulevard", fx: 0.5, fy: 0.26, zoom: 1, panX: 0, panY: 0, tag: "THE DRIVER" },
      cells: [
        { photo: "pier", fx: 0.42, fy: 0.26, zoom: 1.25, panX: 0, panY: 0, tag: "THE CAPTAIN" },
        { photo: "boulevard", fx: 0.5, fy: 0.26, zoom: 1.4, panX: 0, panY: 0, tag: "THE LOOKOUT" },
        { photo: "pier", fx: 0.42, fy: 0.28, zoom: 1.35, panX: 0, panY: 0, flip: true, tag: "THE FIXER" },
        { photo: "boulevard", fx: 0.48, fy: 0.28, zoom: 1.15, panX: 0, panY: 0, tag: "THE INSIDER" },
      ],
    },
  };

  // The nine-grid cover needs nine panels; it reuses the cast with
  // different crops so no two panels show the same slice twice.
  const NINE_EXTRA = [
    { photo: "pier", fx: 0.42, fy: 0.26, zoom: 1.3, panX: 0, panY: 0, tag: "THE CAPTAIN" },
    { photo: "boulevard", fx: 0.5, fy: 0.26, zoom: 1.3, panX: 0, panY: 0, tag: "THE DRIVER" },
    { photo: "pier", fx: 0.42, fy: 0.22, zoom: 1.9, panX: 0, panY: 0, tag: "THE LOOKOUT" },
    { photo: "boulevard", fx: 0.5, fy: 0.22, zoom: 1.9, panX: 0, panY: 0, tag: "THE FIXER" },
    { photo: "pier", fx: 0.35, fy: 0.28, zoom: 1.5, panX: 0, panY: 0, flip: true, tag: "THE INSIDER" },
  ];

  function clonePreset(id) {
    const p = JSON.parse(JSON.stringify(PRESETS[id] || PRESETS.pier));
    p.cells = p.cells.concat(JSON.parse(JSON.stringify(NINE_EXTRA)));
    return p;
  }

  // --- state ---------------------------------------------------------------

  const state = {
    layout: "cast",
    grade: "sunset",
    titleScale: 1,
    showBilling: true,
    showBadge: true,
    photos: {
      pier: { src: "samples/pier.jpg", img: null, name: "Pier" },
      boulevard: { src: "samples/boulevard.jpg", img: null, name: "Boulevard" },
    },
  };

  function applyPreset(id) {
    const p = clonePreset(id);
    state.title = p.title;
    state.subtitle = p.subtitle;
    state.slogan = p.slogan;
    state.quote = p.quote;
    state.quoteSource = p.quoteSource;
    state.stars = p.stars;
    state.location = p.location;
    state.ticket = p.ticket;
    state.hero = p.hero;
    state.cells = p.cells;
    syncInputs();
  }

  // --- selection + pointer editing ----------------------------------------

  const selected = { kind: "hero", index: -1 };
  let drag = null;

  function selectedCell() {
    return selected.kind === "hero" ? state.hero : state.cells[selected.index];
  }

  function canvasPos(e) {
    const canvas = $("cover");
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * DESIGN_W,
      y: ((e.clientY - r.top) / r.height) * DESIGN_H,
    };
  }

  function pickZone(pos) {
    const zones = hitZones(state);
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      if (pos.x >= z.rect.x && pos.x <= z.rect.x + z.rect.w && pos.y >= z.rect.y && pos.y <= z.rect.y + z.rect.h) {
        return z;
      }
    }
    return null;
  }

  function bindCanvas() {
    const canvas = $("cover");
    canvas.addEventListener("pointerdown", (e) => {
      const pos = canvasPos(e);
      const zone = pickZone(pos);
      if (!zone) return;
      selected.kind = zone.kind;
      selected.index = zone.index;
      const cell = selectedCell();
      drag = { x: pos.x, y: pos.y, panX: cell.panX || 0, panY: cell.panY || 0 };
      canvas.setPointerCapture(e.pointerId);
      highlightSelection();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const pos = canvasPos(e);
      const cell = selectedCell();
      const img = state.photos[cell.photo] && state.photos[cell.photo].img;
      if (!img || !img.naturalWidth) return;
      const zone = pickZone({ x: drag.x, y: drag.y }) || { rect: { w: 300, h: 200 } };
      const zoom = Math.max(1, cell.zoom || 1);
      const scale = Math.max(zone.rect.w / img.naturalWidth, zone.rect.h / img.naturalHeight) * zoom;
      // Dragging the photo right shows more of its left side.
      cell.panX = drag.panX - (pos.x - drag.x) / scale;
      cell.panY = drag.panY - (pos.y - drag.y) / scale;
      render();
    });
    const endDrag = () => {
      drag = null;
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const cell = selectedCell();
        const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        cell.zoom = Math.min(3, Math.max(1, (cell.zoom || 1) * f));
        render();
      },
      { passive: false }
    );
  }

  function highlightSelection() {
    const zone = selected.kind === "hero" ? null : selected.index;
    document.querySelectorAll("#castInputs .tag-row").forEach((row, i) => {
      row.classList.toggle("selected", selected.kind === "cell" && i === zone);
    });
    const heroRow = document.querySelector("#castInputs .tag-row.hero-tag");
    if (heroRow) heroRow.classList.toggle("selected", selected.kind === "hero");
  }

  // --- controls ------------------------------------------------------------

  function buildButtons(containerId, items, current, onPick) {
    const box = $(containerId);
    box.innerHTML = "";
    items.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (item.id === current ? " on" : "");
      b.textContent = item.label;
      b.title = item.blurb || "";
      b.addEventListener("click", () => {
        onPick(item.id);
        box.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
        b.classList.add("on");
      });
      box.appendChild(b);
    });
  }

  function buildCastInputs() {
    const box = $("castInputs");
    box.innerHTML = "";
    const n = visibleCellCount(state.layout);
    const rows = [{ label: "Hero", cell: state.hero, hero: true }];
    for (let i = 0; i < n; i++) rows.push({ label: "Panel " + (i + 1), cell: state.cells[i] });
    rows.forEach((row) => {
      if (!row.cell) return;
      const wrap = document.createElement("label");
      wrap.className = "tag-row" + (row.hero ? " hero-tag" : "");
      const span = document.createElement("span");
      span.textContent = row.label;
      const input = document.createElement("input");
      input.type = "text";
      input.value = row.cell.tag || "";
      input.maxLength = 18;
      input.addEventListener("input", () => {
        row.cell.tag = input.value.toUpperCase();
        render();
      });
      wrap.appendChild(span);
      wrap.appendChild(input);
      box.appendChild(wrap);
    });
    highlightSelection();
  }

  function buildPhotoList() {
    const box = $("photoList");
    box.innerHTML = "";
    Object.keys(state.photos).forEach((id) => {
      const p = state.photos[id];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      const img = document.createElement("img");
      img.src = p.src;
      img.alt = p.name;
      const label = document.createElement("span");
      label.textContent = p.name;
      b.appendChild(img);
      b.appendChild(label);
      b.addEventListener("click", () => {
        const cell = selectedCell();
        cell.photo = id;
        render();
      });
      box.appendChild(b);
    });
  }

  function syncInputs() {
    $("titleInput").value = state.title || "";
    $("subtitleInput").value = state.subtitle || "";
    $("sloganInput").value = state.slogan || "";
    $("titleSize").value = String(Math.round((state.titleScale || 1) * 100));
    $("titleSizeVal").textContent = Math.round((state.titleScale || 1) * 100) + "%";
    $("quoteInput").value = state.quote || "";
    $("quoteSourceInput").value = state.quoteSource || "";
    $("starsSelect").value = String(state.stars || 4);
    $("locationInput").value = state.location || "";
    $("ticketInput").value = state.ticket || "";
    $("billingToggle").checked = state.showBilling !== false;
    $("badgeToggle").checked = state.showBadge !== false;
    buildButtons(
      "layoutList",
      layoutIds().map((id) => ({ id, label: LAYOUTS[id].name, blurb: LAYOUTS[id].blurb })),
      state.layout,
      (id) => {
        state.layout = id;
        buildCastInputs();
        render();
      }
    );
    buildButtons(
      "gradeList",
      gradeIds().map((id) => ({ id, label: gradeOf(id).name, blurb: gradeOf(id).blurb })),
      state.grade,
      (id) => {
        state.grade = id;
        render();
      }
    );
    buildCastInputs();
  }

  function bindInputs() {
    $("titleInput").addEventListener("input", (e) => {
      state.title = e.target.value.toUpperCase();
      render();
    });
    $("subtitleInput").addEventListener("input", (e) => {
      state.subtitle = e.target.value;
      render();
    });
    $("sloganInput").addEventListener("input", (e) => {
      state.slogan = e.target.value.toUpperCase();
      render();
    });
    $("titleSize").addEventListener("input", (e) => {
      state.titleScale = Number(e.target.value) / 100;
      $("titleSizeVal").textContent = e.target.value + "%";
      render();
    });
    $("quoteInput").addEventListener("input", (e) => {
      state.quote = e.target.value;
      render();
    });
    $("quoteSourceInput").addEventListener("input", (e) => {
      state.quoteSource = e.target.value.toUpperCase();
      render();
    });
    $("starsSelect").addEventListener("change", (e) => {
      state.stars = Number(e.target.value);
      render();
    });
    $("locationInput").addEventListener("input", (e) => {
      state.location = e.target.value.toUpperCase();
      render();
    });
    $("ticketInput").addEventListener("input", (e) => {
      state.ticket = e.target.value.toUpperCase();
      render();
    });
    $("billingToggle").addEventListener("change", (e) => {
      state.showBilling = e.target.checked;
      render();
    });
    $("badgeToggle").addEventListener("change", (e) => {
      state.showBadge = e.target.checked;
      render();
    });
    document.querySelectorAll(".sample-btn").forEach((b) => {
      b.addEventListener("click", () => {
        applyPreset(b.dataset.photo);
        buildPhotoList();
        render();
      });
    });
    $("fileInput").addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const id = "up" + Date.now() + Math.floor(Math.random() * 1000);
            state.photos[id] = { src: reader.result, img, name: file.name.replace(/\.[^.]+$/, "").slice(0, 14) || "Photo" };
            buildPhotoList();
            const cell = selectedCell();
            cell.photo = id;
            render();
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    });
    document.querySelectorAll(".export-btn").forEach((b) => {
      b.addEventListener("click", async () => {
        const sizeId = b.dataset.size;
        setStatus("Exporting " + EXPORT_SIZES[sizeId].label + "…");
        const blob = await exportCover(state, sizeId);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = EXPORT_SIZES[sizeId].file;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setStatus("Saved " + EXPORT_SIZES[sizeId].file + " — check your downloads.");
      });
    });
  }

  function setStatus(text) {
    $("status").textContent = text;
  }

  // --- render + boot ---------------------------------------------------------

  function render() {
    renderCover($("cover"), state, DESIGN_W, DESIGN_H);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function boot() {
    const params = new URLSearchParams(location.search);
    const shot = params.get("shot");
    const photo = params.get("photo") === "boulevard" ? "boulevard" : "pier";
    applyPreset(photo);
    if (params.get("title")) state.title = params.get("title").toUpperCase();
    if (params.get("caption")) state.title = params.get("caption").toUpperCase();
    if (params.get("subtitle")) state.subtitle = params.get("subtitle");
    if (shot === "cover") document.body.classList.add("shot-cover");
    if (shot === "editor") document.body.classList.add("shot-editor");
    bindInputs();
    bindCanvas();
    buildPhotoList();
    try {
      await Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('60px Pacifico'),
        loadImage("samples/pier.jpg").then((img) => {
          state.photos.pier.img = img;
        }),
        loadImage("samples/boulevard.jpg").then((img) => {
          state.photos.boulevard.img = img;
        }),
      ]);
    } catch (err) {
      setStatus("A font or sample photo failed to load; the cover still renders.");
    }
    render();
    window.__coverReady = true;
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
