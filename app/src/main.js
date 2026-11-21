// Editor wiring for Neon Tide — Cover Studio.
// Owns the state, the preset copy sets, the controls, drag / wheel cropping,
// the ?shot= scenes the screenshots use, and the three PNG exports.
// The poster itself is drawn by cover.js; the palettes live in grades.js.

import { drawCover, renderToCanvas, loadImage, LAYOUTS, EXPORT_SIZES, FACE } from "./cover.js";
import { GRADES, GRADE_ORDER } from "./grades.js";

const PRESETS = {
  tide: {
    mainPhoto: "pier",
    title: "NEON TIDE",
    subtitle: "chasing the last light",
    tagline: "EVERY SUNSET HAS A PRICE",
    quote: "A SUNSET WITH TEETH.",
    stars: 4.5,
    quotedBy: "THE SHORELINE POST",
    place: "NEON SHORE",
    time: "7:15 PM",
    labels: ["THE CAPTAIN", "THE DRIVER", "THE LOOKOUT", "THE FIXER", "THE INSIDER"],
  },
  mile: {
    mainPhoto: "boulevard",
    title: "MIDNIGHT MILE",
    subtitle: "the city never blinks",
    tagline: "FOUR LANES · NO BRAKES",
    quote: "FASTER THAN THE RUMOUR.",
    stars: 5,
    quotedBy: "THE BOULEVARD GAZETTE",
    place: "BOULEVARD",
    time: "11:48 PM",
    labels: ["THE DRIVER", "THE CAPTAIN", "THE LOOKOUT", "THE FIXER", "THE INSIDER"],
  },
};

const state = {
  preset: "tide",
  layout: "cast",
  grade: "sunset",
  photos: {},
  mainPhoto: "pier",
  title: "",
  subtitle: "",
  tagline: "",
  quote: "",
  stars: 4.5,
  quotedBy: "",
  place: "",
  time: "",
  labels: [],
  crops: { main: { dx: 0, dy: 0, zoom: 1 }, cells: [{}, {}, {}, {}] },
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function applyPreset(key) {
  const p = PRESETS[key];
  state.preset = key;
  state.mainPhoto = p.mainPhoto;
  state.title = p.title;
  state.subtitle = p.subtitle;
  state.tagline = p.tagline;
  state.quote = p.quote;
  state.stars = p.stars;
  state.quotedBy = p.quotedBy;
  state.place = p.place;
  state.time = p.time;
  state.labels = [...p.labels];
  state.crops = { main: { dx: 0, dy: 0, zoom: 1 }, cells: [{}, {}, {}, {}] };
  syncInputs();
  render();
}

function syncInputs() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set("in-title", state.title);
  set("in-subtitle", state.subtitle);
  set("in-tagline", state.tagline);
  set("in-quote", state.quote);
  set("in-stars", String(state.stars));
  set("in-quotedby", state.quotedBy);
  set("in-place", state.place);
  set("in-time", state.time);
  $$(".label-input").forEach((el) => {
    const i = Number(el.dataset.i);
    el.value = state.labels[i] || "";
  });
  $$(".preset-btn").forEach((b) => b.classList.toggle("active", b.dataset.preset === state.preset));
  $$(".layout-btn").forEach((b) => b.classList.toggle("active", b.dataset.layout === state.layout));
  $$(".grade-btn").forEach((b) => b.classList.toggle("active", b.dataset.grade === state.grade));
}

const canvas = $("#cover");
const ctx = canvas.getContext("2d");
let ready = false;

function render() {
  drawCover(ctx, 1080, 1080, state);
  if (!ready) {
    ready = true;
    window.__coverReady = true;
  }
}

function buildButtons() {
  const layoutBox = $("#layout-btns");
  LAYOUTS.forEach((l) => {
    const b = document.createElement("button");
    b.className = "layout-btn";
    b.dataset.layout = l.id;
    b.textContent = l.label;
    b.addEventListener("click", () => { state.layout = l.id; syncInputs(); render(); });
    layoutBox.appendChild(b);
  });
  const gradeBox = $("#grade-btns");
  GRADE_ORDER.forEach((id) => {
    const b = document.createElement("button");
    b.className = "grade-btn";
    b.dataset.grade = id;
    b.textContent = GRADES[id].label;
    b.addEventListener("click", () => { state.grade = id; syncInputs(); render(); });
    gradeBox.appendChild(b);
  });
  const exportBox = $("#export-btns");
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement("button");
    b.className = "export-btn";
    b.textContent = `PNG ${s.label}`;
    b.addEventListener("click", () => exportPNG(s));
    exportBox.appendChild(b);
  });
}

function bindInputs() {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      state[key] = key === "stars" ? Number(el.value) : el.value;
      render();
    });
  };
  bind("in-title", "title");
  bind("in-subtitle", "subtitle");
  bind("in-tagline", "tagline");
  bind("in-quote", "quote");
  bind("in-stars", "stars");
  bind("in-quotedby", "quotedBy");
  bind("in-place", "place");
  bind("in-time", "time");
  $$(".preset-btn").forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
  $$(".label-input").forEach((el) => {
    el.addEventListener("input", () => {
      state.labels[Number(el.dataset.i)] = el.value.toUpperCase();
      render();
    });
  });
  const up = $("#upload");
  if (up) {
    up.addEventListener("change", () => {
      const file = up.files && up.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const img = await loadImage(reader.result);
          state.photos[state.mainPhoto] = img;
          FACE[state.mainPhoto] = { x: 0.5, y: 0.3 };
          render();
        } catch (e) {
          console.error("upload failed", e);
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

// Drag to pan the crop, wheel to zoom. Top half pans the hero; the bottom
// cells row pans the cell under the pointer (Cast Grid / Hero Four only).
function bindCrop() {
  let drag = null;
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 1080,
      y: ((e.clientY - r.top) / r.height) * 1080,
    };
  };
  const hitCell = (x, y) => {
    if (state.layout !== "cast" && state.layout !== "hero") return -1;
    if (y < 800 || y > 970) return -1;
    const cw = (1008 - 36) / 4;
    const i = Math.floor((x - 36) / (cw + 12));
    return i >= 0 && i < 4 ? i : -1;
  };
  canvas.addEventListener("pointerdown", (e) => {
    const p = toLogical(e);
    const cell = hitCell(p.x, p.y);
    const img = cell >= 0
      ? state.photos[cellPhotos()[cell]]
      : state.photos[state.mainPhoto];
    drag = { cell, img, lx: p.x, ly: p.y };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || !drag.img) return;
    const p = toLogical(e);
    const k = drag.img.naturalWidth / 1008;
    const target = drag.cell >= 0
      ? (state.crops.cells[drag.cell] = state.crops.cells[drag.cell] || {})
      : state.crops.main;
    const zoom = target.zoom || 1;
    target.dx = (target.dx || 0) - (p.x - drag.lx) * k / zoom;
    target.dy = (target.dy || 0) - (p.y - drag.ly) * k / zoom;
    drag.lx = p.x;
    drag.ly = p.y;
    render();
  });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = toLogical(e);
    const cell = hitCell(p.x, p.y);
    const target = cell >= 0
      ? (state.crops.cells[cell] = state.crops.cells[cell] || {})
      : state.crops.main;
    const z = target.zoom || 1;
    target.zoom = Math.min(2.5, Math.max(1, z * (e.deltaY < 0 ? 1.1 : 0.9)));
    render();
  }, { passive: false });
}

function cellPhotos() {
  const main = state.mainPhoto;
  const other = main === "pier" ? "boulevard" : "pier";
  return [other, main, other, main];
}

function exportPNG(size) {
  const out = renderToCanvas(state, size.w, size.h);
  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `neon-tide-${size.id}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

async function init() {
  buildButtons();
  bindInputs();
  bindCrop();
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  const photo = params.get("photo");
  if (photo === "boulevard") applyPreset("mile");
  else applyPreset("tide");
  if (shot === "cover") {
    document.body.classList.add("cover-only");
    if (photo === "boulevard") applyPreset("mile");
    else applyPreset("tide");
  }
  try {
    await Promise.all([
      document.fonts.load('150px Anton'),
      document.fonts.load('64px Pacifico'),
      document.fonts.load('40px Anton'),
      document.fonts.load('26px Anton'),
    ]);
  } catch (e) {
    console.warn("font preload", e);
  }
  const [pier, boulevard] = await Promise.all([
    loadImage("samples/pier.jpg"),
    loadImage("samples/boulevard.jpg"),
  ]);
  state.photos = { pier, boulevard };
  render();
}

init();
