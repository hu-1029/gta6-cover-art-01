// Neon Tide Cover Studio — editor wiring.
// Preset switching, layout and grade controls, cover-copy inputs, drag and
// wheel cropping on the preview, ?shot= scenes for the dossier screenshots,
// and the three PNG export sizes. Runs fully offline.

import { PRESETS, LAYOUTS, makeState, applyPreset, loadPhotos, drawCover, renderToSize } from './cover.js';
import { GRADES, GRADE_IDS } from './grades.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

let state = makeState('tide');
let regions = { main: null, cells: [] };
let drag = null;

const canvas = $('preview');

function syncInputs() {
  $('in-title').value = state.title;
  $('in-subtitle').value = state.subtitle;
  $('in-tagline').value = state.tagline;
  $('in-quote').value = state.quote;
  $('in-stars').value = String(state.stars);
  $('in-quoted-by').value = state.quotedBy;
  $('in-place').value = state.place;
  $('in-time').value = state.time;
  state.cells.forEach((cell, i) => {
    const el = $(`in-label-${i}`);
    if (el) el.value = cell.label;
  });
  document.querySelectorAll('[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === state.preset));
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

function render() {
  regions = drawCover(canvas, state);
  if (!window.__coverReady) window.__coverReady = true;
}

function bindCopy(id, key) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('input', () => {
    state[key] = el.value;
    render();
  });
}

function bindStars() {
  const el = $('in-stars');
  el.addEventListener('change', () => {
    state.stars = parseFloat(el.value) || 5;
    render();
  });
}

function bindButtons() {
  document.querySelectorAll('[data-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      state = applyPreset(state, b.dataset.preset);
      syncInputs();
      render();
    });
  });
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      syncInputs();
      render();
    });
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      syncInputs();
      render();
    });
  });
  state.cells.forEach((cell, i) => {
    const el = $(`in-label-${i}`);
    if (el) {
      el.addEventListener('input', () => {
        cell.label = el.value.toUpperCase();
        render();
      });
    }
  });
}

function canvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * canvas.width,
    y: ((evt.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitSlot(p) {
  if (regions.main && p.x >= regions.main.x && p.x <= regions.main.x + regions.main.w && p.y >= regions.main.y && p.y <= regions.main.y + regions.main.h) {
    return state.main;
  }
  for (const r of regions.cells || []) {
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
      return state.cells[r.index];
    }
  }
  return null;
}

function bindCrop() {
  canvas.addEventListener('pointerdown', (evt) => {
    const p = canvasPos(evt);
    const slot = hitSlot(p);
    if (!slot) return;
    drag = { slot, lastX: p.x, lastY: p.y };
    canvas.setPointerCapture(evt.pointerId);
  });
  canvas.addEventListener('pointermove', (evt) => {
    if (!drag) return;
    const p = canvasPos(evt);
    const dx = (p.x - drag.lastX) / canvas.width;
    const dy = (p.y - drag.lastY) / canvas.height;
    drag.slot.cx = Math.max(0, Math.min(1, drag.slot.cx - dx * 1.4));
    drag.slot.cy = Math.max(0, Math.min(1, drag.slot.cy - dy * 1.4));
    drag.lastX = p.x;
    drag.lastY = p.y;
    render();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener(
    'wheel',
    (evt) => {
      evt.preventDefault();
      const p = canvasPos(evt);
      const slot = hitSlot(p);
      if (!slot) return;
      const factor = evt.deltaY < 0 ? 1.08 : 1 / 1.08;
      slot.zoom = Math.max(1, Math.min(3, slot.zoom * factor));
      render();
    },
    { passive: false },
  );
}

function download(canvasEl, name) {
  canvasEl.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

function bindExport() {
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', () => {
      const [w, h] = b.dataset.export.split('x').map(Number);
      const out = renderToSize(state, w, h);
      download(out, `neon-tide-${state.preset}-${w}x${h}.png`);
    });
  });
}

function applyShot() {
  const shot = params.get('shot');
  if (!shot) return;
  document.body.classList.add('cover-only');
  if (shot === 'cover') {
    state = makeState('tide');
    state.layout = 'cast';
  } else if (shot === 'cover2') {
    state = makeState('mile');
    state.layout = 'cast';
  } else if (shot === 'editor') {
    document.body.classList.remove('cover-only');
    state = makeState('mile');
    state.layout = 'cast';
  } else if (LAYOUTS.includes(shot)) {
    state = makeState('tide');
    state.layout = shot;
  }
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const preset = params.get('preset');
  if (preset && PRESETS[preset]) state = applyPreset(state, preset);
}

async function init() {
  applyShot();
  bindCopy('in-title', 'title');
  bindCopy('in-subtitle', 'subtitle');
  bindCopy('in-tagline', 'tagline');
  bindCopy('in-quote', 'quote');
  bindCopy('in-quoted-by', 'quotedBy');
  bindCopy('in-place', 'place');
  bindCopy('in-time', 'time');
  bindStars();
  bindButtons();
  bindCrop();
  bindExport();
  syncInputs();
  await loadPhotos(['pier', 'boulevard']);
  try {
    await Promise.all([document.fonts.load('700 140px Anton'), document.fonts.load('60px Pacifico'), document.fonts.ready]);
  } catch {
    // fall back to system fonts if the bundled ones cannot load
  }
  render();
}

init();
