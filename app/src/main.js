// Neon Tide editor: presets, layout and grade switches, copy fields,
// per-cell crop (drag to move the face point, wheel to zoom), photo upload
// and PNG export. Photos never leave the machine.
import { GRADES, GRADE_IDS, gradeById } from './grades.js';
import { COVER, PRESETS, makeState, applyPreset, renderCover, exportCanvas, visibleCells } from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const PHOTO_NAMES = ['Pier', 'Boulevard', 'Redhead', 'Curly', 'Elder', 'Young Man'];

const params = new URLSearchParams(location.search);
const shot = params.get('shot') || '';
const state = makeState(params.get('preset') === 'midnight' ? 'midnight' : 'neon');
if (params.get('layout')) state.layout = params.get('layout');
if (params.get('grade')) state.grade = params.get('grade');

const canvas = $('#cover');
let selected = 0; // index into visibleCells(state)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadFonts() {
  const loads = [
    document.fonts.load('190px Anton'),
    document.fonts.load('150px Anton'),
    document.fonts.load('64px Pacifico'),
    document.fonts.load('40px Anton'),
  ];
  return Promise.all(loads).catch(() => undefined);
}

function draw() {
  renderCover(canvas, state);
}

function syncInputs() {
  $('#in-title').value = state.title;
  $('#in-subtitle').value = state.subtitle;
  $('#in-tagline').value = state.tagline;
  $('#in-quote').value = state.quote;
  $('#in-stars').value = String(state.stars);
  $('#in-source').value = state.source;
  $('#in-place').value = state.place;
  $('#in-time').value = state.time;
  $$('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  $$('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  $$('[data-preset]').forEach((b) => b.classList.toggle('active', b.dataset.preset === state.preset));
  buildCellRows();
}

function buildCellRows() {
  const list = $('#cell-list');
  list.innerHTML = '';
  const cells = visibleCells(state);
  if (selected >= cells.length) selected = 0;
  cells.forEach((cell, i) => {
    const row = document.createElement('div');
    row.className = 'cell-row' + (i === selected ? ' selected' : '');
    const tag = document.createElement('span');
    tag.className = 'cell-tag';
    tag.textContent = i === 0 ? 'HERO' : 'CELL ' + i;
    const label = document.createElement('input');
    label.type = 'text';
    label.value = cell.label;
    label.setAttribute('aria-label', 'Role label');
    label.addEventListener('input', () => {
      cell.label = label.value.toUpperCase();
      draw();
    });
    const photo = document.createElement('select');
    photo.setAttribute('aria-label', 'Photo');
    PHOTO_NAMES.forEach((name, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = name;
      if (cell.photo === idx) opt.selected = true;
      photo.appendChild(opt);
    });
    photo.addEventListener('change', () => {
      cell.photo = Number(photo.value);
      draw();
    });
    row.appendChild(tag);
    row.appendChild(label);
    row.appendChild(photo);
    row.addEventListener('click', () => {
      selected = i;
      buildCellRows();
    });
    list.appendChild(row);
  });
}

function bindCopy() {
  const map = [
    ['#in-title', 'title'],
    ['#in-subtitle', 'subtitle'],
    ['#in-tagline', 'tagline'],
    ['#in-quote', 'quote'],
    ['#in-source', 'source'],
    ['#in-place', 'place'],
    ['#in-time', 'time'],
  ];
  for (const [sel, key] of map) {
    $(sel).addEventListener('input', (e) => {
      state[key] = e.target.value;
      draw();
    });
  }
  $('#in-stars').addEventListener('change', (e) => {
    state.stars = Number(e.target.value);
    draw();
  });
  $$('[data-layout]').forEach((b) =>
    b.addEventListener('click', () => {
      state.layout = b.dataset.layout;
      selected = 0;
      syncInputs();
      draw();
    }),
  );
  $$('[data-grade]').forEach((b) =>
    b.addEventListener('click', () => {
      state.grade = b.dataset.grade;
      syncInputs();
      draw();
    }),
  );
  $$('[data-preset]').forEach((b) =>
    b.addEventListener('click', () => {
      applyPreset(state, b.dataset.preset);
      selected = 0;
      syncInputs();
      draw();
    }),
  );
  $$('[data-export]').forEach((b) =>
    b.addEventListener('click', () => {
      const [w, h] = b.dataset.export.split('x').map(Number);
      const out = exportCanvas(state, w, h);
      out.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'neon-tide-' + w + 'x' + h + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }, 'image/png');
    }),
  );
  $('#upload').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.photos.push(img);
        const cells = visibleCells(state);
        cells[selected].photo = state.photos.length - 1;
        buildCellRows();
        draw();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// Hit-test the cover in 1080 space: the mosaic and row rects for the
// layouts that show them; returns the cell object or null.
function hitCell(px, py) {
  const L = state.layout;
  const inRect = (r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  if (L === 'cast') {
    const bw = (1008 - 16) / 3;
    const rects = [
      { cell: state.cells[0], rect: { x: 36, y: 110, w: 246, h: 360 } },
      { cell: state.hero, rect: { x: 290, y: 110, w: 500, h: 360 } },
      { cell: state.cells[1], rect: { x: 798, y: 110, w: 246, h: 360 } },
      { cell: state.cells[2], rect: { x: 36, y: 478, w: bw, h: 320 } },
      { cell: state.cells[3], rect: { x: 36 + bw + 8, y: 478, w: bw, h: 320 } },
      { cell: state.cells[4], rect: { x: 36 + (bw + 8) * 2, y: 478, w: bw, h: 320 } },
    ];
    for (const hit of rects) {
      if (inRect(hit.rect)) return hit;
    }
  } else if (L === 'hero') {
    if (inRect({ x: 36, y: 110, w: 1008, h: 360 })) return { cell: state.hero, rect: { x: 36, y: 110, w: 1008, h: 360 } };
    const w = (1008 - 24) / 4;
    for (let i = 0; i < 4; i++) {
      const r = { x: 36 + i * (w + 8), y: 480, w, h: 120 };
      if (inRect(r)) return { cell: state.cells[i], rect: r };
    }
  } else if (L === 'full') {
    if (inRect({ x: 36, y: 110, w: 1008, h: 900 })) return { cell: state.hero, rect: { x: 36, y: 110, w: 1008, h: 900 } };
  } else if (L === 'nine') {
    const cw = (1008 - 16) / 3;
    const ys = [110, 342, 574];
    for (let i = 0; i < 9; i++) {
      const r = { x: 36 + (i % 3) * (cw + 8), y: ys[Math.floor(i / 3)], w: cw, h: 224 };
      if (inRect(r)) return { cell: state.nine[i], rect: r };
    }
  }
  return null;
}

function bindCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * COVER;
    const py = ((e.clientY - r.top) / r.height) * COVER;
    const hit = hitCell(px, py);
    if (!hit) return;
    drag = { cell: hit.cell, rect: hit.rect, lastX: px, lastY: py };
    const cells = visibleCells(state);
    selected = cells.indexOf(hit.cell);
    buildCellRows();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * COVER;
    const py = ((e.clientY - r.top) / r.height) * COVER;
    const img = state.photos[drag.cell.photo];
    if (img) {
      drag.cell.fx = Math.min(0.95, Math.max(0.05, drag.cell.fx + ((px - drag.lastX) / drag.rect.w) * (drag.rect.w / (img.naturalWidth * Math.max(drag.rect.w / img.naturalWidth, drag.rect.h / img.naturalHeight) * drag.cell.zoom))));
      drag.cell.fy = Math.min(0.95, Math.max(0.05, drag.cell.fy + ((py - drag.lastY) / drag.rect.h) * (drag.rect.h / (img.naturalHeight * Math.max(drag.rect.w / img.naturalWidth, drag.rect.h / img.naturalHeight) * drag.cell.zoom))));
    }
    drag.lastX = px;
    drag.lastY = py;
    draw();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    const r = canvas.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * COVER;
    const py = ((e.clientY - r.top) / r.height) * COVER;
    const hit = hitCell(px, py);
    if (!hit) return;
    e.preventDefault();
    hit.cell.zoom = Math.min(2.5, Math.max(0.8, hit.cell.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    draw();
  }, { passive: false });
}

async function boot() {
  const coverOnly = shot === 'cover' || shot === 'cover2';
  if (shot === 'cover2') applyPreset(state, 'midnight');
  if (shot === 'editor') applyPreset(state, 'midnight');
  document.body.classList.toggle('cover-only', coverOnly);
  const [pier, boulevard, redhead, curly, elder, youngman] = await Promise.all([
    loadImage('samples/pier.jpg'),
    loadImage('samples/boulevard.jpg'),
    loadImage('samples/cast-redhead.jpg'),
    loadImage('samples/cast-curly.jpg'),
    loadImage('samples/cast-elder.jpg'),
    loadImage('samples/cast-youngman.jpg'),
  ]);
  state.photos = [pier, boulevard, redhead, curly, elder, youngman];
  await loadFonts();
  bindCopy();
  bindCanvas();
  syncInputs();
  draw();
  window.__coverReady = true;
}

boot().catch((err) => {
  console.error(err);
  const note = document.createElement('p');
  note.textContent = 'Could not start the cover studio: ' + err.message;
  document.body.appendChild(note);
});
