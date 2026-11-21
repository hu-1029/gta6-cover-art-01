// Neon Tide Cover Studio — cover render engine.
// Draws a GTA-style poster cover on a canvas: quote bar, main photo,
// striped chrome title, script subtitle, tagline, cast cells, billing block
// and footer. Five layouts, three grades, face-safe cropping, three export
// sizes. No network: photos and fonts are bundled in app/.

import { GRADES } from './grades.js';

export const PHOTOS = {
  pier: { src: 'samples/pier.jpg', face: [0.42, 0.22] },
  boulevard: { src: 'samples/boulevard.jpg', face: [0.5, 0.22] },
};

export const PRESETS = {
  tide: {
    id: 'tide',
    title: 'NEON TIDE',
    subtitle: 'chasing the last light',
    tagline: 'EVERY SUNSET HAS A PRICE',
    quote: 'A SUNSET WITH TEETH.',
    stars: 4.5,
    quotedBy: 'THE SHORELINE POST',
    place: 'NEON SHORE',
    time: '7:15 PM',
    mainLabel: 'THE CAPTAIN',
    mainPhoto: 'pier',
    cellLabels: ['THE DRIVER', 'THE LOOKOUT', 'THE FIXER', 'THE INSIDER'],
    cellPhotos: ['boulevard', 'pier', 'boulevard', 'pier'],
  },
  mile: {
    id: 'mile',
    title: 'MIDNIGHT MILE',
    subtitle: 'the city never blinks',
    tagline: 'FOUR LANES · NO BRAKES',
    quote: 'FASTER THAN THE RUMOUR.',
    stars: 5,
    quotedBy: 'THE BOULEVARD GAZETTE',
    place: 'BOULEVARD',
    time: '11:48 PM',
    mainLabel: 'THE DRIVER',
    mainPhoto: 'boulevard',
    cellLabels: ['THE CAPTAIN', 'THE LOOKOUT', 'THE FIXER', 'THE INSIDER'],
    cellPhotos: ['pier', 'boulevard', 'pier', 'boulevard'],
  },
};

export const LAYOUTS = ['cast', 'hero', 'full', 'nine', 'polaroids'];

const imageCache = new Map();

export function loadPhoto(name) {
  if (!imageCache.has(name)) {
    const img = new Image();
    img.src = PHOTOS[name].src;
    imageCache.set(name, img);
  }
  return imageCache.get(name);
}

export function loadPhotos(names) {
  return Promise.all(
    names.map(
      (name) =>
        new Promise((resolve) => {
          const img = loadPhoto(name);
          if (img.complete && img.naturalWidth) resolve(img);
          else {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
          }
        }),
    ),
  );
}

export function makeState(presetId) {
  const p = PRESETS[presetId] || PRESETS.tide;
  const face = (photo) => PHOTOS[photo].face;
  return {
    preset: p.id,
    title: p.title,
    subtitle: p.subtitle,
    tagline: p.tagline,
    quote: p.quote,
    stars: p.stars,
    quotedBy: p.quotedBy,
    place: p.place,
    time: p.time,
    layout: 'cast',
    grade: 'sunset',
    main: { photo: p.mainPhoto, label: p.mainLabel, cx: face(p.mainPhoto)[0], cy: face(p.mainPhoto)[1], zoom: 1 },
    cells: p.cellLabels.map((label, i) => {
      const photo = p.cellPhotos[i];
      return { photo, label, cx: face(photo)[0], cy: face(photo)[1], zoom: 1 };
    }),
  };
}

export function applyPreset(state, presetId) {
  const fresh = makeState(presetId);
  fresh.layout = state.layout;
  fresh.grade = state.grade;
  return fresh;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitFont(ctx, text, maxWidth, startSize, font, weight = '') {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

function drawPhotoCover(ctx, img, x, y, w, h, fx, fy, zoom) {
  if (!img || !img.naturalWidth) {
    ctx.fillStyle = '#241a3d';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const sw = w / scale;
  const sh = h / scale;
  let sx = fx * iw - sw / 2;
  let sy = fy * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawChip(ctx, text, x, y, fontSize, grade, goldBar = true) {
  ctx.font = `700 ${fontSize}px Anton, sans-serif`;
  const tw = ctx.measureText(text).width;
  const padX = 14;
  const padY = 9;
  const w = tw + padX * 2 + (goldBar ? 6 : 0);
  const h = fontSize + padY * 2;
  ctx.fillStyle = 'rgba(8, 6, 16, 0.92)';
  ctx.fillRect(x, y, w, h);
  if (goldBar) {
    ctx.fillStyle = grade.gold;
    ctx.fillRect(x, y, 6, h);
  }
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX + (goldBar ? 6 : 0), y + h / 2 + 1);
  return { x, y, w, h };
}

function drawStarburst(ctx, cx, cy, r, grade, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.fillStyle = grade.pink;
  ctx.beginPath();
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(r * 0.24)}px Anton, sans-serif`;
  ctx.fillText(lines[0], 0, -r * 0.16);
  ctx.fillText(lines[1], 0, r * 0.18);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawBarcode(ctx, x, y, w, h, seedText) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const rnd = mulberry32([...seedText].reduce((a, c) => a + c.charCodeAt(0), 7));
  ctx.fillStyle = '#111111';
  let bx = x + 8;
  const end = x + w - 8;
  while (bx < end - 4) {
    const bw = [2, 3, 4, 6][Math.floor(rnd() * 4)];
    if (rnd() > 0.35) ctx.fillRect(bx, y + 6, bw, h - 12);
    bx += bw + 2 + Math.floor(rnd() * 3);
  }
}

function drawQuoteBar(ctx, state, grade, x, y, w) {
  const midY = y + 39;
  ctx.fillStyle = grade.gold;
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + 75, w, 3);
  // stars
  const starR = 15;
  let sx = x + 18;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = grade.gold;
    ctx.strokeStyle = grade.gold;
    ctx.lineWidth = 2;
    if (state.stars >= i + 1) {
      drawStar(ctx, sx, midY, starR, true);
    } else if (state.stars > i) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - starR, midY - starR, starR, starR * 2);
      ctx.clip();
      drawStar(ctx, sx, midY, starR, true);
      ctx.restore();
      drawStar(ctx, sx, midY, starR, false);
    } else {
      drawStar(ctx, sx, midY, starR, false);
    }
    sx += 36;
  }
  // source, right aligned
  ctx.font = '700 26px Anton, sans-serif';
  const srcText = `— ${state.quotedBy}`;
  const srcW = ctx.measureText(srcText).width;
  ctx.fillStyle = grade.gold;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(srcText, x + w - 6, midY);
  // quote, centered in the remaining space
  const qLeft = x + 5 * 36 + 24;
  const qRight = x + w - srcW - 30;
  const qSize = fitFont(ctx, `“${state.quote}”`, qRight - qLeft, 34, 'Anton, sans-serif', '700');
  ctx.fillStyle = grade.cream;
  ctx.textAlign = 'center';
  ctx.fillText(`“${state.quote}”`, (qLeft + qRight) / 2, midY);
  ctx.textAlign = 'left';
  return qSize;
}

function drawTitleBlock(ctx, state, grade, x, y, w, titleSize) {
  // Big striped chrome title.
  const grad = ctx.createLinearGradient(0, y, 0, y + titleSize);
  const stops = grade.titleStops;
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  ctx.font = `700 ${titleSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = x + w / 2;
  const titleY = y + titleSize;
  ctx.fillStyle = grad;
  ctx.fillText(state.title, cx, titleY);
  // chrome stripes clipped to the drawn title
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#000000';
  for (let sy = y; sy < y + titleSize; sy += 14) ctx.fillRect(x, sy, w, 4);
  ctx.restore();
  // script subtitle overlapping the title's bottom edge
  const subSize = Math.round(titleSize * 0.42);
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.subtitle, cx, titleY + subSize * 0.52);
  // tagline
  const tagSize = Math.round(titleSize * 0.32);
  const tagY = titleY + subSize * 0.52 + tagSize + 26;
  fitFont(ctx, state.tagline, w, tagSize, 'Anton, sans-serif', '700');
  ctx.fillStyle = grade.gold;
  ctx.fillText(state.tagline, cx, tagY);
  ctx.textAlign = 'left';
  return tagY + 10;
}

function billingLabels(state, layout) {
  if (layout === 'full') return [state.main.label];
  if (layout === 'hero') return [state.main.label, ...state.cells.slice(0, 3).map((c) => c.label)];
  if (layout === 'polaroids') return state.cells.slice(0, 3).map((c) => c.label);
  const all = [state.main.label, ...state.cells.map((c) => c.label)];
  return [...new Set(all)];
}

function drawBilling(ctx, state, grade, layout, x, y, w) {
  ctx.textAlign = 'center';
  ctx.fillStyle = grade.gold;
  const line1 = 'A NEON SHORE PICTURE';
  const s1 = fitFont(ctx, line1, w, 36, 'Anton, sans-serif', '700');
  ctx.fillText(line1, x + w / 2, y + s1);
  const labels = billingLabels(state, layout);
  const starring = `STARRING ${labels.join(' · ')}`;
  const s2 = fitFont(ctx, starring, w, 24, 'Anton, sans-serif', '700');
  ctx.fillStyle = grade.cream;
  ctx.fillText(starring, x + w / 2, y + s1 + s2 + 10);
  ctx.textAlign = 'left';
  return y + s1 + s2 + 24;
}

function drawFooter(ctx, state, grade, x, y, w) {
  ctx.font = '700 40px Anton, sans-serif';
  ctx.fillStyle = '#8f8aa3';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMING SOON', x, y + 20);
  const bw = 150;
  drawBarcode(ctx, x + w / 2 - bw / 2, y, bw, 40, state.title);
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = 3;
  const ns = 40;
  ctx.strokeRect(x + w - ns, y, ns, ns);
  ctx.fillStyle = grade.ink;
  ctx.font = '700 24px Anton, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NS', x + w - ns / 2, y + ns / 2 + 1);
  ctx.textAlign = 'left';
}

function drawGrainVignette(ctx, W, H, seedText) {
  const rnd = mulberry32([...seedText].reduce((a, c) => a * 31 + c.charCodeAt(0), 11));
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }
  ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawCellsRow(ctx, state, grade, images, x, y, w, h) {
  const gap = 8;
  const cw = (w - gap * 3) / 4;
  const rects = [];
  state.cells.forEach((cell, i) => {
    const cx = x + i * (cw + gap);
    const img = images[cell.photo];
    drawPhotoCover(ctx, img, cx, y, cw, h, cell.cx, cell.cy, cell.zoom);
    drawChip(ctx, cell.label, cx + 8, y + h - 44, 22, grade);
    rects.push({ x: cx, y, w: cw, h, kind: 'cell', index: i });
  });
  return rects;
}

function drawSquare(ctx, state, grade, images, W, H) {
  const regions = { main: null, cells: [] };
  const mx = 36;
  const mw = W - 72;
  // background
  ctx.fillStyle = grade.bg;
  ctx.fillRect(0, 0, W, H);
  // quote bar
  drawQuoteBar(ctx, state, grade, mx, 18, mw);
  const layout = state.layout;

  if (layout === 'full') {
    // Full-bleed main photo with a dark scrim at the bottom.
    const img = images[state.main.photo];
    drawPhotoCover(ctx, img, 0, 0, W, H, state.main.cx, state.main.cy, state.main.zoom);
    const scrim = ctx.createLinearGradient(0, H * 0.42, 0, H);
    scrim.addColorStop(0, 'rgba(0,0,0,0)');
    scrim.addColorStop(1, grade.scrim);
    ctx.fillStyle = scrim;
    ctx.fillRect(0, H * 0.42, W, H * 0.58);
    drawQuoteBar(ctx, state, grade, mx, 18, mw);
    // location strip + VOL.1 over the photo, just above the title
    drawChip(ctx, `${state.place} · ${state.time}`, mx + 8, H * 0.52, 24, grade);
    ctx.fillStyle = grade.gold;
    ctx.beginPath();
    ctx.roundRect(W - mx - 96, H * 0.52, 88, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = '700 24px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOL. 1', W - mx - 52, H * 0.52 + 21);
    ctx.textAlign = 'left';
    drawTitleBlock(ctx, state, grade, mx, H * 0.58, mw, 132);
    drawBilling(ctx, state, grade, layout, mx, H - 134, mw);
    drawFooter(ctx, state, grade, mx, H - 48, mw);
    regions.main = { x: 0, y: 0, w: W, h: H, kind: 'main' };
    drawGrainVignette(ctx, W, H, state.title);
    return regions;
  }

  if (layout === 'nine') {
    // 3x3 grid with the title band across the middle row.
    const gy = 108;
    const gh = 760;
    const gap = 6;
    const cw = (mw - gap * 2) / 3;
    const ch = (gh - gap * 2) / 3;
    const cast = [state.main.label, ...state.cells.map((c) => c.label)];
    const photos = [state.main.photo, ...state.cells.map((c) => c.photo)];
    const focus = [state.main, ...state.cells];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        const x = mx + c * (cw + gap);
        const y = gy + r * (ch + gap);
        const photo = photos[i % photos.length];
        const f = focus[i % focus.length];
        drawPhotoCover(ctx, images[photo], x, y, cw, ch, f.cx, f.cy, f.zoom);
        // the middle row gets its labels after the title band, so the band
        // cannot dim them; the centre cell's label stays hidden under the
        // title itself
        if (r !== 1) drawChip(ctx, cast[i % cast.length], x + 8, y + ch - 42, 20, grade);
      }
    }
    // title band over the middle row
    const bandY = gy + ch + gap - 14;
    ctx.fillStyle = 'rgba(8, 6, 16, 0.82)';
    ctx.fillRect(mx, bandY, mw, ch + 28);
    drawTitleBlock(ctx, state, grade, mx, bandY + 6, mw, 108);
    // middle-row side labels, on top of the band at the top of their cells
    drawChip(ctx, cast[3], mx + 8, gy + ch + gap + 8, 20, grade);
    drawChip(ctx, cast[0], mx + 2 * (cw + gap) + 8, gy + ch + gap + 8, 20, grade);
    const by = gy + gh + 26;
    drawBilling(ctx, state, grade, layout, mx, by, mw);
    drawFooter(ctx, state, grade, mx, H - 48, mw);
    drawGrainVignette(ctx, W, H, state.title);
    return regions;
  }

  if (layout === 'polaroids') {
    // Three tilted polaroid cards, then the title block.
    const cy0 = 150;
    const cardW = 300;
    const cardH = 430;
    const gapX = (mw - cardW * 3) / 2;
    const tilts = [-0.05, 0.0, 0.05];
    state.cells.slice(0, 3).forEach((cell, i) => {
      const cx = mx + i * (cardW + gapX) + cardW / 2;
      const cy = cy0 + cardH / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilts[i]);
      ctx.fillStyle = '#f7f2e6';
      ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      const img = images[cell.photo];
      drawPhotoCover(ctx, img, -cardW / 2 + 16, -cardH / 2 + 16, cardW - 32, cardH - 96, cell.cx, cell.cy, cell.zoom);
      ctx.fillStyle = '#222222';
      ctx.font = '44px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.label.toLowerCase(), 0, cardH / 2 - 40);
      ctx.restore();
      ctx.textAlign = 'left';
    });
    const ty = cy0 + cardH + 30;
    drawTitleBlock(ctx, state, grade, mx, ty, mw, 120);
    drawBilling(ctx, state, grade, layout, mx, ty + 280, mw);
    drawFooter(ctx, state, grade, mx, H - 48, mw);
    drawGrainVignette(ctx, W, H, state.title);
    return regions;
  }

  // cast (default) and hero share the stacked layout below the photo zone.
  let photoBottom;
  if (layout === 'hero') {
    const gap = 8;
    const pw = (mw - gap * 3) / 4;
    const ph = 512;
    const panels = [state.main, ...state.cells.slice(0, 3)];
    panels.forEach((slot, i) => {
      const x = mx + i * (pw + gap);
      drawPhotoCover(ctx, images[slot.photo], x, 108, pw, ph, slot.cx, slot.cy, slot.zoom);
      drawChip(ctx, slot.label, x + 8, 108 + ph - 44, 22, grade);
    });
    regions.main = { x: mx, y: 108, w: pw, h: ph, kind: 'main' };
    regions.cells = state.cells.slice(0, 3).map((_, i) => ({ x: mx + (i + 1) * (pw + gap), y: 108, w: pw, h: ph, kind: 'cell', index: i }));
    photoBottom = 108 + ph;
  } else {
    const img = images[state.main.photo];
    drawPhotoCover(ctx, img, mx, 108, mw, 440, state.main.cx, state.main.cy, state.main.zoom);
    drawChip(ctx, state.main.label, mx + 8, 116, 24, grade);
    drawStarburst(ctx, mx + mw - 78, 178, 62, grade, ['EST. 2026', 'ORIGINAL']);
    drawChip(ctx, `${state.place} · ${state.time}`, mx + 8, 108 + 440 - 46, 24, grade);
    // VOL. 1 pill
    ctx.fillStyle = grade.gold;
    ctx.beginPath();
    ctx.roundRect(mx + mw - 104, 108 + 440 - 46, 88, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.font = '700 24px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOL. 1', mx + mw - 60, 108 + 440 - 25);
    ctx.textAlign = 'left';
    regions.main = { x: mx, y: 108, w: mw, h: 440, kind: 'main' };
    photoBottom = 548;
    // cast cells row
    regions.cells = drawCellsRow(ctx, state, grade, images, mx, 818, mw, 116);
  }

  const titleY = photoBottom + 8;
  drawTitleBlock(ctx, state, grade, mx, titleY, mw, 140);
  if (layout === 'cast') {
    drawBilling(ctx, state, grade, layout, mx, 946, mw);
    drawFooter(ctx, state, grade, mx, H - 48, mw);
  } else {
    // hero: billing sits right under the title block
    drawBilling(ctx, state, grade, layout, mx, 880, mw);
    drawFooter(ctx, state, grade, mx, 990, mw);
  }
  drawGrainVignette(ctx, W, H, state.title);
  return regions;
}

export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const names = [...new Set([state.main.photo, ...state.cells.map((c) => c.photo)])];
  const images = {};
  names.forEach((n) => {
    images[n] = loadPhoto(n);
  });

  if (W / H > 1.25) {
    // Landscape export: darkened full-bleed photo behind a centered square poster.
    const img = images[state.main.photo];
    drawPhotoCover(ctx, img, 0, 0, W, H, state.main.cx, state.main.cy, 1.1);
    ctx.fillStyle = 'rgba(5, 3, 12, 0.78)';
    ctx.fillRect(0, 0, W, H);
    const off = document.createElement('canvas');
    off.width = 1080;
    off.height = 1080;
    drawSquare(off.getContext('2d'), state, grade, images, 1080, 1080);
    ctx.drawImage(off, (W - 1080) / 2, 0, 1080, 1080);
    drawGrainVignette(ctx, W, H, state.title);
    return { main: null, cells: [] };
  }

  // Square and portrait: the same stacked layout, the main photo absorbs
  // the extra height of a portrait canvas.
  if (H > W) {
    const extra = H - W;
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d');
    octx.fillStyle = grade.bg;
    octx.fillRect(0, 0, W, H);
    // draw the square layout into the top, then stretch the photo zone by
    // re-drawing with a taller main image is complex; instead render the
    // square poster and place it centered with the extra split top/bottom.
    const sq = document.createElement('canvas');
    sq.width = 1080;
    sq.height = 1080;
    drawSquare(sq.getContext('2d'), state, grade, images, 1080, 1080);
    const scale = W / 1080;
    octx.drawImage(sq, 0, (H - 1080 * scale) / 2, W, 1080 * scale);
    ctx.drawImage(off, 0, 0);
    drawGrainVignette(ctx, W, H, state.title);
    return { main: null, cells: [] };
  }

  return drawSquare(ctx, state, grade, images, W, H);
}

export function renderToSize(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
