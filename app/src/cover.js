// Neon Tide cover renderer: draws the whole 1080 x 1080 poster on a canvas.
// Five layouts, four grades, six cast photos, face-safe crops, a huge
// striped chrome title pressed over the hero photo, billing.
// No network, no Rockstar art: only the bundled sample photos and OFL fonts.
import { gradeById } from './grades.js';

export const COVER = 1080;
const MARGIN = 36;
const CW = COVER - MARGIN * 2;

// The six sample photos and their face centres (measured by hand).
// 0 pier, 1 boulevard, 2 redhead, 3 curly, 4 elder, 5 young man.
export const FACE = [
  { x: 0.42, y: 0.22 },
  { x: 0.5, y: 0.22 },
  { x: 0.5, y: 0.35 },
  { x: 0.5, y: 0.45 },
  { x: 0.5, y: 0.35 },
  { x: 0.5, y: 0.4 },
];

export const PRESETS = {
  neon: {
    title: 'NEON TIDE',
    subtitle: 'chasing the last light',
    tagline: 'EVERY SUNSET HAS A PRICE',
    quote: 'A SUNSET WITH TEETH.',
    stars: 4.5,
    source: 'THE SHORELINE POST',
    place: 'NEON SHORE',
    time: '7:15 PM',
    hero: { photo: 0, label: 'THE CAPTAIN' },
    cells: [
      { photo: 1, label: 'THE DRIVER' },
      { photo: 2, label: 'THE FIXER' },
      { photo: 3, label: 'THE LOOKOUT' },
      { photo: 4, label: 'THE BOSS' },
      { photo: 5, label: 'THE INSIDER' },
    ],
    nine: [
      { photo: 0, label: 'THE CAPTAIN' },
      { photo: 1, label: 'THE DRIVER' },
      { photo: 2, label: 'THE FIXER' },
      { photo: 3, label: 'THE LOOKOUT' },
      { photo: 4, label: 'THE BOSS' },
      { photo: 5, label: 'THE INSIDER' },
      { photo: 0, label: 'THE CAPTAIN' },
      { photo: 1, label: 'THE DRIVER' },
      { photo: 2, label: 'THE FIXER' },
    ],
    cards: [
      { photo: 0, label: 'THE CAPTAIN', caption: 'the last light' },
      { photo: 1, label: 'THE DRIVER', caption: 'no brakes' },
      { photo: 5, label: 'THE INSIDER', caption: 'four lanes' },
    ],
  },
  midnight: {
    title: 'MIDNIGHT MILE',
    subtitle: 'the city never blinks',
    tagline: 'FOUR LANES · NO BRAKES',
    quote: 'FASTER THAN THE RUMOUR.',
    stars: 5,
    source: 'THE BOULEVARD GAZETTE',
    place: 'BOULEVARD',
    time: '11:48 PM',
    hero: { photo: 1, label: 'THE DRIVER' },
    cells: [
      { photo: 0, label: 'THE CAPTAIN' },
      { photo: 3, label: 'THE LOOKOUT' },
      { photo: 2, label: 'THE FIXER' },
      { photo: 5, label: 'THE INSIDER' },
      { photo: 4, label: 'THE BOSS' },
    ],
    nine: [
      { photo: 1, label: 'THE DRIVER' },
      { photo: 0, label: 'THE CAPTAIN' },
      { photo: 3, label: 'THE LOOKOUT' },
      { photo: 2, label: 'THE FIXER' },
      { photo: 5, label: 'THE INSIDER' },
      { photo: 4, label: 'THE BOSS' },
      { photo: 1, label: 'THE DRIVER' },
      { photo: 0, label: 'THE CAPTAIN' },
      { photo: 3, label: 'THE LOOKOUT' },
    ],
    cards: [
      { photo: 1, label: 'THE DRIVER', caption: 'the city never blinks' },
      { photo: 0, label: 'THE CAPTAIN', caption: 'last light' },
      { photo: 4, label: 'THE BOSS', caption: 'sunset with teeth' },
    ],
  },
};

export function makeState(presetName) {
  const p = PRESETS[presetName] || PRESETS.neon;
  const cell = (c) => ({
    photo: c.photo,
    label: c.label,
    caption: c.caption || '',
    fx: FACE[c.photo].x,
    fy: FACE[c.photo].y,
    zoom: 1,
  });
  return {
    layout: 'cast',
    grade: 'vice',
    preset: presetName || 'neon',
    title: p.title,
    subtitle: p.subtitle,
    tagline: p.tagline,
    quote: p.quote,
    stars: p.stars,
    source: p.source,
    place: p.place,
    time: p.time,
    hero: cell(p.hero),
    cells: p.cells.map(cell),
    nine: p.nine.map(cell),
    cards: p.cards.map(cell),
    photos: [null, null, null, null, null, null],
  };
}

export function applyPreset(state, presetName) {
  const fresh = makeState(presetName);
  const keep = { layout: state.layout, grade: state.grade, photos: state.photos };
  Object.assign(state, fresh, keep);
  return state;
}

// Cells actually shown by the current layout, hero first, in reading order.
export function visibleCells(state) {
  if (state.layout === 'full') return [state.hero];
  if (state.layout === 'nine') return state.nine;
  if (state.layout === 'polaroid') return state.cards;
  if (state.layout === 'hero') return [state.hero, ...state.cells.slice(0, 4)];
  return [state.hero, ...state.cells];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setLetterSpacing(ctx, px) {
  try {
    ctx.letterSpacing = px + 'px';
  } catch (e) {
    /* older canvas: no letter spacing */
  }
}

// Face-safe cover fit: the photo's face centre lands at the middle of the
// cell horizontally and 30% down it vertically, then clamps to cover.
function drawPhoto(ctx, img, rect, fx, fy, zoom, tint, tintAlpha) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const s = Math.max(rect.w / iw, rect.h / ih) * (zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  let dx = rect.x + rect.w / 2 - fx * dw;
  let dy = rect.y + rect.h * 0.3 - fy * dh;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  if (tint) {
    ctx.globalAlpha = tintAlpha;
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawRoleTag(ctx, x, y, label, size) {
  ctx.font = size + 'px Anton, sans-serif';
  setLetterSpacing(ctx, 1);
  const w = ctx.measureText(label).width + 22;
  const h = size + 16;
  ctx.fillStyle = 'rgba(10,7,20,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(x, y, 6, h);
  ctx.fillStyle = '#f5efdf';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 14, y + h / 2 + 1);
  setLetterSpacing(ctx, 0);
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStars(ctx, x, y, rating, gold) {
  const r = 17;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * 42 + r;
    if (rating >= i + 1) {
      ctx.fillStyle = gold;
      starPath(ctx, cx, y, r);
      ctx.fill();
    } else if (rating > i) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - r, y - r, r, r * 2);
      ctx.clip();
      ctx.fillStyle = gold;
      starPath(ctx, cx, y, r);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      starPath(ctx, cx, y, r);
      ctx.stroke();
    } else {
      ctx.strokeStyle = gold;
      ctx.lineWidth = 2;
      starPath(ctx, cx, y, r);
      ctx.stroke();
    }
  }
}

function drawStarburst(ctx, cx, cy, r, pink) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.fillStyle = pink;
  ctx.beginPath();
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16;
    const rr = i % 2 === 0 ? r : r * 0.82;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '22px Anton, sans-serif';
  setLetterSpacing(ctx, 1);
  ctx.fillText('EST. 2026', 0, -13);
  ctx.fillText('ORIGINAL', 0, 13);
  setLetterSpacing(ctx, 0);
  ctx.restore();
}

function drawBarcode(ctx, cx, y, w, h) {
  const rnd = mulberry32(20261121);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - w / 2, y, w, h);
  ctx.fillStyle = '#0d0a1a';
  let x = cx - w / 2 + 8;
  while (x < cx + w / 2 - 10) {
    const bw = [2, 3, 5, 8][Math.floor(rnd() * 4)];
    ctx.fillRect(x, y + 5, bw, h - 10);
    x += bw + 2 + Math.floor(rnd() * 4);
  }
}

function drawGrain(ctx, seed) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(rnd() * COVER, rnd() * COVER, 1.4, 1.4);
  }
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(540, 540, 320, 540, 540, 820);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, COVER, COVER);
}

function fitFont(ctx, text, maxW, startSize, family) {
  let size = startSize;
  ctx.font = size + 'px ' + family;
  while (size > 56 && ctx.measureText(text).width > maxW) {
    size -= 4;
    ctx.font = size + 'px ' + family;
  }
  return size;
}

// Striped chrome title, pressed over the photo: a thick white outline and
// a soft drop shadow lift the gradient glyphs off the picture, then thin
// dark stripes are clipped to the glyphs.
function drawTitle(ctx, text, cx, top, maxW, startSize, stops) {
  setLetterSpacing(ctx, 1);
  const size = fitFont(ctx, text, maxW, startSize, 'Anton, sans-serif');
  const w = ctx.measureText(text).width;
  const x = cx - w / 2;
  const baseline = top + size * 0.82;
  const grad = ctx.createLinearGradient(0, top, 0, baseline + size * 0.12);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(6, size * 0.07);
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.textBaseline = 'alphabetic';
  ctx.strokeText(text, x, baseline);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(text, x, baseline);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = top; y < baseline; y += 12) ctx.fillRect(x, y, w, 2);
  ctx.restore();
  setLetterSpacing(ctx, 0);
  return { size, baseline, width: w };
}

function drawQuoteBar(ctx, state, g) {
  ctx.fillStyle = g.gold;
  ctx.fillRect(MARGIN, 20, CW, 3);
  ctx.fillRect(MARGIN, 96, CW, 3);
  drawStars(ctx, MARGIN, 58, state.stars, g.gold);
  // The source sits right-aligned; the quote is centred in the space that
  // is left between the stars and the source, shrinking before it can
  // touch the source (a long quote + a long source used to collide).
  ctx.font = '28px Anton, sans-serif';
  setLetterSpacing(ctx, 1);
  const srcText = '\u2014 ' + state.source;
  const srcW = ctx.measureText(srcText).width;
  const zoneLeft = MARGIN + 5 * 42 + 24;
  const zoneRight = 1044 - srcW - 24;
  const quote = '\u201C' + state.quote + '\u201D';
  let size = 40;
  ctx.font = size + 'px Anton, sans-serif';
  while (size > 24 && ctx.measureText(quote).width > zoneRight - zoneLeft) {
    size -= 2;
    ctx.font = size + 'px Anton, sans-serif';
  }
  ctx.fillStyle = g.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(quote, (zoneLeft + zoneRight) / 2, 59);
  ctx.textAlign = 'right';
  ctx.fillStyle = g.gold;
  ctx.font = '28px Anton, sans-serif';
  ctx.fillText(srcText, 1044, 59);
  ctx.textAlign = 'left';
  setLetterSpacing(ctx, 0);
}

function drawPlaceStrip(ctx, state, x, y) {
  const label = state.place + ' \u00B7 ' + state.time;
  ctx.font = '28px Anton, sans-serif';
  setLetterSpacing(ctx, 1);
  const w = ctx.measureText(label).width + 24;
  const h = 44;
  ctx.fillStyle = 'rgba(10,7,20,0.88)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#ffc93c';
  ctx.fillRect(x, y, 6, h);
  ctx.fillStyle = '#f5efdf';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 14, y + h / 2 + 1);
  setLetterSpacing(ctx, 0);
}

function drawVolPill(ctx, x, y) {
  ctx.font = '26px Anton, sans-serif';
  setLetterSpacing(ctx, 1);
  const label = 'VOL. 1';
  const w = ctx.measureText(label).width + 28;
  const h = 42;
  ctx.fillStyle = '#ffc93c';
  roundRect(ctx, x - w, y, w, h, 21);
  ctx.fill();
  ctx.fillStyle = '#0d0a1a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x - w / 2, y + h / 2 + 1);
  ctx.textAlign = 'left';
  setLetterSpacing(ctx, 0);
}

function billingLabels(state) {
  const seen = [];
  for (const c of visibleCells(state)) {
    if (c.label && !seen.includes(c.label)) seen.push(c.label);
  }
  return seen;
}

function drawBilling(ctx, state, g, titleY, starringY) {
  ctx.textAlign = 'center';
  ctx.fillStyle = g.gold;
  ctx.font = '36px Anton, sans-serif';
  setLetterSpacing(ctx, 2);
  ctx.fillText('A NEON SHORE PICTURE', 540, titleY);
  ctx.fillStyle = g.ink;
  let size = 24;
  ctx.font = size + 'px Anton, sans-serif';
  const line = 'STARRING ' + billingLabels(state).join(' \u00B7 ');
  while (size > 16 && ctx.measureText(line).width > CW) {
    size -= 2;
    ctx.font = size + 'px Anton, sans-serif';
  }
  ctx.fillText(line, 540, starringY);
  ctx.textAlign = 'left';
  setLetterSpacing(ctx, 0);
}

function drawFooter(ctx, g) {
  ctx.fillStyle = '#6f6a80';
  ctx.font = '44px Anton, sans-serif';
  setLetterSpacing(ctx, 2);
  ctx.textBaseline = 'middle';
  ctx.fillText('COMING SOON', MARGIN, 1052);
  drawBarcode(ctx, 540, 1032, 190, 40);
  ctx.strokeStyle = g.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(996, 1032, 48, 40);
  ctx.fillStyle = g.ink;
  ctx.font = '26px Anton, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NS', 1020, 1053);
  ctx.textAlign = 'left';
  setLetterSpacing(ctx, 0);
}

function drawSubtitleTagline(ctx, state, g, titleBaseline, titleSize, taglineY) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '56px Pacifico, cursive';
  ctx.fillText(state.subtitle, 540, titleBaseline + 46);
  ctx.fillStyle = g.gold;
  ctx.font = '44px Anton, sans-serif';
  setLetterSpacing(ctx, 6);
  // The tagline normally sits right under the subtitle, but the mosaic
  // moves it below the photos so it never crosses a face.
  ctx.fillText(state.tagline, 540, taglineY || titleBaseline + 118);
  ctx.textAlign = 'left';
  setLetterSpacing(ctx, 0);
}

function cellRow(ctx, state, g, y, h, cells) {
  const gap = 8;
  const w = (CW - gap * 3) / 4;
  cells.forEach((cell, i) => {
    const x = MARGIN + i * (w + gap);
    const rect = { x, y, w, h };
    drawPhoto(ctx, state.photos[cell.photo], rect, cell.fx, cell.fy, cell.zoom, g.tint, g.tintAlpha);
    drawRoleTag(ctx, x + 10, y + h - 44, cell.label, 22);
  });
}

function drawLayout(ctx, state, g) {
  const L = state.layout;
  if (L === 'cast') {
    // Mosaic: big hero centre-top, one small cell each side, three cells
    // across the bottom row. Six different photos, no repeats.
    const hero = { x: 290, y: 110, w: 500, h: 360 };
    const left = { x: MARGIN, y: 110, w: 246, h: 360 };
    const right = { x: 798, y: 110, w: 246, h: 360 };
    const bw = (CW - 16) / 3;
    const bottom = [
      { x: MARGIN, y: 478, w: bw, h: 320 },
      { x: MARGIN + bw + 8, y: 478, w: bw, h: 320 },
      { x: MARGIN + (bw + 8) * 2, y: 478, w: bw, h: 320 },
    ];
    drawPhoto(ctx, state.photos[state.cells[0].photo], left, state.cells[0].fx, state.cells[0].fy, state.cells[0].zoom, g.tint, g.tintAlpha);
    drawRoleTag(ctx, left.x + 10, left.y + 10, state.cells[0].label, 22);
    drawPhoto(ctx, state.photos[state.hero.photo], hero, state.hero.fx, state.hero.fy, state.hero.zoom, g.tint, g.tintAlpha);
    drawRoleTag(ctx, hero.x + 12, hero.y + 12, state.hero.label, 28);
    drawPhoto(ctx, state.photos[state.cells[1].photo], right, state.cells[1].fx, state.cells[1].fy, state.cells[1].zoom, g.tint, g.tintAlpha);
    drawRoleTag(ctx, right.x + 10, right.y + 10, state.cells[1].label, 22);
    state.cells.slice(2).forEach((cell, i) => {
      const rect = bottom[i];
      drawPhoto(ctx, state.photos[cell.photo], rect, cell.fx, cell.fy, cell.zoom, g.tint, g.tintAlpha);
      drawRoleTag(ctx, rect.x + 10, rect.y + 10, cell.label, 22);
    });
    drawStarburst(ctx, 985, 735, 62, g.pink);
    drawVolPill(ctx, hero.x + hero.w - 12, hero.y + 12);
    drawPlaceStrip(ctx, state, bottom[0].x + 12, bottom[0].y + bottom[0].h - 56);
    // The title presses over the bottom of the hero photo; the subtitle
    // sits right under it, still inside the hero, so neither crosses a
    // face or a role tag in the bottom row. The tagline moves below the
    // photos. The seal sits on the bottom-right cell so a wide title
    // (MIDNIGHT MILE) cannot cover its text.
    const t = drawTitle(ctx, state.title, 540, 280, CW, 150, g.titleStops);
    drawSubtitleTagline(ctx, state, g, t.baseline, t.size, 830);
    drawBilling(ctx, state, g, 900, 935);
    return;
  }
  if (L === 'hero') {
    const hero = { x: MARGIN, y: 110, w: CW, h: 360 };
    drawPhoto(ctx, state.photos[state.hero.photo], hero, state.hero.fx, state.hero.fy, state.hero.zoom, g.tint, g.tintAlpha);
    drawRoleTag(ctx, hero.x + 12, hero.y + 12, state.hero.label, 28);
    drawStarburst(ctx, 968, 168, 62, g.pink);
    drawPlaceStrip(ctx, state, hero.x + 12, hero.y + hero.h - 56);
    drawVolPill(ctx, hero.x + hero.w - 12, hero.y + hero.h - 54);
    cellRow(ctx, state, g, 480, 120, state.cells.slice(0, 4));
    const t = drawTitle(ctx, state.title, 540, 620, CW, 150, g.titleStops);
    drawSubtitleTagline(ctx, state, g, t.baseline, t.size);
    drawBilling(ctx, state, g, 930, 965);
    return;
  }
  if (L === 'full') {
    const hero = { x: MARGIN, y: 110, w: CW, h: 900 };
    drawPhoto(ctx, state.photos[state.hero.photo], hero, state.hero.fx, state.hero.fy, state.hero.zoom, g.tint, g.tintAlpha);
    const scrim = ctx.createLinearGradient(0, 560, 0, 1010);
    scrim.addColorStop(0, 'rgba(10,6,24,0)');
    scrim.addColorStop(1, g.scrim);
    ctx.fillStyle = scrim;
    ctx.fillRect(hero.x, hero.y, hero.w, hero.h);
    drawRoleTag(ctx, hero.x + 12, hero.y + 12, state.hero.label, 28);
    drawStarburst(ctx, 968, 168, 62, g.pink);
    drawPlaceStrip(ctx, state, hero.x + 12, hero.y + hero.h - 140);
    drawVolPill(ctx, hero.x + hero.w - 12, hero.y + hero.h - 138);
    const t = drawTitle(ctx, state.title, 540, 640, CW, 130, g.titleStops);
    drawSubtitleTagline(ctx, state, g, t.baseline, t.size);
    drawBilling(ctx, state, g, 950, 985);
    return;
  }
  if (L === 'nine') {
    const gap = 8;
    const cw = (CW - gap * 2) / 3;
    const ch = 224;
    const ys = [110, 342, 574];
    state.nine.forEach((cell, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const rect = { x: MARGIN + col * (cw + gap), y: ys[row], w: cw, h: ch };
      drawPhoto(ctx, state.photos[cell.photo], rect, cell.fx, cell.fy, cell.zoom, g.tint, g.tintAlpha);
      if (row !== 1) drawRoleTag(ctx, rect.x + 10, rect.y + 10, cell.label, 22);
    });
    // Title band across the middle row, then the middle labels on top of it.
    ctx.fillStyle = 'rgba(13,10,26,0.82)';
    ctx.fillRect(MARGIN, 400, CW, 160);
    const t = drawTitle(ctx, state.title, 540, 408, CW, 120, g.titleStops);
    ctx.fillStyle = '#ffffff';
    ctx.font = '52px Pacifico, cursive';
    ctx.textAlign = 'center';
    ctx.fillText(state.subtitle, 540, t.baseline + 44);
    ctx.fillStyle = g.gold;
    ctx.font = '36px Anton, sans-serif';
    setLetterSpacing(ctx, 5);
    ctx.fillText(state.tagline, 540, t.baseline + 96);
    ctx.textAlign = 'left';
    setLetterSpacing(ctx, 0);
    state.nine.forEach((cell, i) => {
      if (Math.floor(i / 3) !== 1) return;
      const col = i % 3;
      const x = MARGIN + col * (cw + gap);
      drawRoleTag(ctx, x + 10, 352, cell.label, 22);
    });
    drawBilling(ctx, state, g, 880, 915);
    return;
  }
  // polaroid
  const t = drawTitle(ctx, state.title, 540, 110, CW, 140, g.titleStops);
  drawSubtitleTagline(ctx, state, g, t.baseline, t.size);
  const cards = [
    { x: 90, y: 330, rot: -0.07 },
    { x: 390, y: 312, rot: 0.035 },
    { x: 690, y: 330, rot: -0.05 },
  ];
  state.cards.forEach((cell, i) => {
    const c = cards[i];
    ctx.save();
    ctx.translate(c.x + 150, c.y + 190);
    ctx.rotate(c.rot);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#f5efdf';
    ctx.fillRect(-150, -190, 300, 380);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    drawPhoto(ctx, state.photos[cell.photo], { x: -136, y: -176, w: 272, h: 272 }, cell.fx, cell.fy, cell.zoom, g.tint, g.tintAlpha);
    ctx.fillStyle = '#1c1830';
    ctx.font = '30px Pacifico, cursive';
    ctx.textAlign = 'center';
    ctx.fillText(cell.caption, 0, 160);
    ctx.fillStyle = '#6f6a80';
    ctx.font = '20px Anton, sans-serif';
    setLetterSpacing(ctx, 2);
    ctx.fillText(cell.label, 0, 178);
    ctx.textAlign = 'left';
    setLetterSpacing(ctx, 0);
    ctx.restore();
  });
  drawBilling(ctx, state, g, 900, 935);
}

export function drawCover(ctx, state) {
  const g = gradeById(state.grade);
  ctx.save();
  ctx.fillStyle = g.bg;
  ctx.fillRect(0, 0, COVER, COVER);
  ctx.textBaseline = 'alphabetic';
  drawQuoteBar(ctx, state, g);
  drawLayout(ctx, state, g);
  drawFooter(ctx, g);
  drawGrain(ctx, 20261121);
  drawVignette(ctx);
  ctx.restore();
}

export function renderCover(canvas, state) {
  canvas.width = COVER;
  canvas.height = COVER;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, state);
  return canvas;
}

// Export at a post size: the square cover is fitted and centred on the
// page background, never stretched.
export function exportCanvas(state, w, h) {
  const g = gradeById(state.grade);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = g.bg;
  ctx.fillRect(0, 0, w, h);
  const s = Math.min(w, h) / COVER;
  const ox = (w - COVER * s) / 2;
  const oy = (h - COVER * s) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  drawCover(ctx, state);
  ctx.restore();
  return c;
}
