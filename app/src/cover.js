// Render engine for Neon Tide — Cover Studio.
// Draws the whole poster on a 2D canvas: quote bar, hero image, striped
// chrome title, Pacifico subtitle, tagline, cast cells, billing block,
// barcode, NS mark and COMING SOON. Layouts: cast / hero / full / nine / polar.
// Everything is drawn from the state object main.js owns; grades come from
// grades.js. No network access anywhere: photos are local samples or user
// uploads held as data URLs.

import { gradeById } from "./grades.js";

export const LAYOUTS = [
  { id: "cast", label: "Cast Grid" },
  { id: "hero", label: "Hero Four" },
  { id: "full", label: "Full Frame" },
  { id: "nine", label: "Nine Grid" },
  { id: "polar", label: "Polaroids" },
];

export const EXPORT_SIZES = [
  { id: "square", label: "1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "1080 × 1350", w: 1080, h: 1350 },
  { id: "wide", label: "1920 × 1080", w: 1920, h: 1080 },
];

// Measured face centres of the two kit samples (fraction of image size).
export const FACE = {
  pier: { x: 0.42, y: 0.22 },
  boulevard: { x: 0.5, y: 0.22 },
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shrink the font until the text fits maxW; returns the size used.
function fitFont(ctx, text, maxW, startPx, family, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight || ""} ${px}px ${family}`.trim();
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  return px;
}

// Cover-fit draw with a focus point (fx, fy in 0..1 of the image).
// The focus lands in the middle of the target rect; zoom and pan (source px)
// come from the editor's drag / wheel interaction.
function coverFit(ctx, img, x, y, w, h, fx, fy, zoom, pan) {
  if (!img || !img.naturalWidth) return;
  const z = zoom || 1;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * z;
  const sw = w / scale;
  const sh = h / scale;
  const px = (pan && pan.x) || 0;
  const py = (pan && pan.y) || 0;
  let sx = fx * img.naturalWidth - sw / 2 + px;
  let sy = fy * img.naturalHeight - sh / 2 + py;
  sx = clamp(sx, 0, Math.max(0, img.naturalWidth - sw));
  sy = clamp(sy, 0, Math.max(0, img.naturalHeight - sh));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStars(ctx, x, y, size, rating, grade) {
  const gap = size * 1.28;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * gap + size / 2;
    const cy = y + size / 2;
    const filled = rating - i;
    starPath(ctx, cx, cy, size / 2);
    if (filled >= 1) {
      ctx.fillStyle = grade.star;
      ctx.fill();
    } else if (filled >= 0.5) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = grade.star;
      ctx.fillRect(cx - size / 2, cy - size / 2, size / 2, size);
      ctx.restore();
      ctx.strokeStyle = grade.star;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = grade.star;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function chip(ctx, text, x, y, px, grade) {
  ctx.font = `${px}px Anton, sans-serif`;
  const w = ctx.measureText(text).width + px * 1.1;
  const h = px * 1.7;
  ctx.fillStyle = grade.chipBg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = grade.chipEdge;
  ctx.fillRect(x, y, 5, h);
  ctx.fillStyle = grade.chipInk;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, x + px * 0.75, y + h / 2 + 1);
  return w;
}

function starburst(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.14);
  ctx.beginPath();
  const n = 16;
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.8;
    const a = (i * Math.PI) / n;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = grade.badge;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = grade.badgeInk;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(r * 0.34)}px Anton, sans-serif`;
  ctx.fillText("EST. 2026", cx, cy - r * 0.22);
  ctx.fillText("ORIGINAL", cx, cy + r * 0.24);
}

function barcode(ctx, x, y, w, h, grade) {
  ctx.fillStyle = grade.barcodeBg;
  ctx.fillRect(x, y, w, h);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.fillStyle = grade.barcodeInk;
  let bx = x + 8;
  while (bx < x + w - 8) {
    const bw = 2 + rnd() * 5;
    if (rnd() > 0.3) ctx.fillRect(bx, y + 6, bw, h - 12);
    bx += bw + 1 + rnd() * 4;
  }
}

// Title with a striped chrome gradient: drawn on an offscreen canvas so the
// stripe overlay only touches the glyphs, then stamped onto the poster.
function drawTitle(ctx, text, cx, baselineY, maxW, startPx, grade) {
  const off = document.createElement("canvas");
  const scale = 2;
  off.width = Math.ceil(maxW * scale);
  off.height = Math.ceil(startPx * 1.4 * scale);
  const o = off.getContext("2d");
  o.scale(scale, scale);
  o.textAlign = "center";
  o.textBaseline = "alphabetic";
  let px = startPx;
  while (px > 12) {
    o.font = `${px}px Anton, sans-serif`;
    if (o.measureText(text).width <= maxW) break;
    px -= 2;
  }
  const grad = o.createLinearGradient(0, 0, 0, px * 1.05);
  grad.addColorStop(0, grade.titleStops[0]);
  grad.addColorStop(0.55, grade.titleStops[1]);
  grad.addColorStop(1, grade.titleStops[2]);
  o.fillStyle = grad;
  o.fillText(text, maxW / 2, px * 0.98);
  o.globalCompositeOperation = "source-atop";
  o.fillStyle = grade.titleStripe;
  for (let y = 0; y < px * 1.1; y += 7) {
    o.fillRect(0, y, maxW, 2.4);
  }
  o.globalCompositeOperation = "source-over";
  ctx.drawImage(off, cx - maxW / 2, baselineY - px * 0.98, maxW, px * 1.4);
  return px;
}

function grain(ctx, W, H, amount) {
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.save();
  for (let i = 0; i < 900; i++) {
    const a = rnd() * amount;
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.6, 1.6);
  }
  ctx.restore();
}

function vignette(ctx, W, H, strength) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.72
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// The four cast cells: [other, main, other, main] photos with the four
// editable labels. Returns the list of visible labels for the billing block.
function cellPhotos(state) {
  const main = state.mainPhoto;
  const other = main === "pier" ? "boulevard" : "pier";
  return [other, main, other, main];
}

function drawCells(ctx, x, y, w, h, state, grade) {
  const gap = 12;
  const cw = (w - gap * 3) / 4;
  const photos = cellPhotos(state);
  const labels = state.labels.slice(1, 5);
  const crops = state.crops.cells;
  for (let i = 0; i < 4; i++) {
    const cx = x + i * (cw + gap);
    const img = state.photos[photos[i]];
    const face = FACE[photos[i]];
    const crop = crops[i] || {};
    coverFit(ctx, img, cx, y, cw, h, face.x, face.y, crop.zoom, { x: crop.dx || 0, y: crop.dy || 0 });
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, y + 0.5, cw - 1, h - 1);
    chip(ctx, labels[i] || "", cx + 8, y + h - 44, 22, grade);
  }
}

function drawQuoteBar(ctx, x, y, w, state, grade) {
  ctx.fillStyle = grade.gold;
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + 64, w, 3);
  drawStars(ctx, x + 4, y + 18, 30, state.stars, grade);
  ctx.fillStyle = grade.quote;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fitFont(ctx, `\u201C${state.quote}\u201D`, w * 0.52, 34, "Anton, sans-serif");
  ctx.fillText(`\u201C${state.quote}\u201D`, x + w / 2, y + 33);
  ctx.fillStyle = grade.gold;
  ctx.textAlign = "right";
  fitFont(ctx, `\u2014 ${state.quotedBy}`, w * 0.3, 26, "Anton, sans-serif");
  ctx.fillText(`\u2014 ${state.quotedBy}`, x + w - 4, y + 33);
  ctx.textAlign = "left";
}

function drawBilling(ctx, x, y, w, state, grade) {
  const seen = [];
  for (const label of state.labels) {
    if (label && !seen.includes(label)) seen.push(label);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = grade.gold;
  fitFont(ctx, "A NEON SHORE PICTURE", w, 34, "Anton, sans-serif");
  ctx.fillText("A NEON SHORE PICTURE", x + w / 2, y);
  ctx.fillStyle = grade.ink;
  const line = "STARRING " + seen.join(" \u00B7 ");
  fitFont(ctx, line, w, 26, "Anton, sans-serif");
  ctx.fillText(line, x + w / 2, y + 28);
  ctx.textAlign = "left";
}

function drawFooter(ctx, x, y, w, state, grade) {
  ctx.fillStyle = "#b9b3c4";
  ctx.font = "44px Anton, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("COMING SOON", x, y + 40);
  const bw = 190;
  const bx = x + w / 2 - bw / 2;
  barcode(ctx, bx, y - 6, bw, 46, grade);
  ctx.strokeStyle = grade.ink;
  ctx.lineWidth = 3;
  const ns = 52;
  ctx.strokeRect(x + w - ns, y - 4, ns, ns);
  ctx.fillStyle = grade.ink;
  ctx.font = "30px Anton, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NS", x + w - ns / 2, y + 32);
  ctx.textAlign = "left";
}

// The hero image plus its furniture (label, badge, strip, pill). The
// furniture is drawn AFTER the title block so the title can never cover it.
function drawHeroImage(ctx, x, y, w, h, state) {
  const img = state.photos[state.mainPhoto];
  const face = FACE[state.mainPhoto];
  const crop = state.crops.main || {};
  coverFit(ctx, img, x, y, w, h, face.x, 0.3, crop.zoom, { x: crop.dx || 0, y: crop.dy || 0 });
}

function drawHeroFurniture(ctx, x, y, w, h, state, grade) {
  chip(ctx, state.labels[0] || "", x + 8, y + 8, 28, grade);
  starburst(ctx, x + w - 78, y + 74, 62, grade);
  const strip = `${state.place} \u00B7 ${state.time}`;
  ctx.font = "26px Anton, sans-serif";
  const sw = ctx.measureText(strip).width + 30;
  ctx.fillStyle = grade.stripBg;
  ctx.fillRect(x + 8, y + h - 46, sw, 38);
  ctx.fillStyle = grade.stripInk;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(strip, x + 22, y + h - 27);
  // VOL. 1 pill, bottom-right.
  ctx.font = "26px Anton, sans-serif";
  const pw = ctx.measureText("VOL. 1").width + 34;
  rr(ctx, x + w - pw - 8, y + h - 46, pw, 38, 19);
  ctx.fillStyle = grade.gold;
  ctx.fill();
  ctx.fillStyle = "#140b02";
  ctx.textAlign = "center";
  ctx.fillText("VOL. 1", x + w - pw / 2 - 8, y + h - 27);
  ctx.textAlign = "left";
}

function drawTitleBlock(ctx, cx, topY, maxW, state, grade, startPx) {
  const titlePx = drawTitle(ctx, state.title, cx, topY + startPx * 0.98, maxW, startPx, grade);
  const subY = topY + titlePx * 0.98 + 40;
  ctx.fillStyle = grade.script;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const subPx = fitFont(ctx, state.subtitle, maxW * 0.86, 64, "Pacifico, cursive");
  ctx.fillText(state.subtitle, cx, subY);
  ctx.fillStyle = grade.gold;
  ctx.font = "40px Anton, sans-serif";
  try { ctx.letterSpacing = "7px"; } catch (e) {}
  const tagPx = fitFont(ctx, state.tagline, maxW, 40, "Anton, sans-serif");
  ctx.fillText(state.tagline, cx, subY + tagPx + 22);
  try { ctx.letterSpacing = "0px"; } catch (e) {}
  ctx.textAlign = "left";
  return subY + tagPx + 22;
}

function drawPoster(ctx, W, H, state) {
  const grade = gradeById(state.grade);
  const S = W / 1080;
  const heroExtra = Math.max(0, H - 1080 * S);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, grade.bg);
  bg.addColorStop(1, grade.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const M = 36 * S;
  const CW = W - M * 2;
  const layout = state.layout || "cast";

  if (layout === "nine") {
    drawNine(ctx, M, CW, H, S, state, grade);
  } else if (layout === "polar") {
    drawPolar(ctx, M, CW, H, S, state, grade);
  } else if (layout === "full") {
    drawFull(ctx, M, CW, H, S, state, grade);
  } else {
    drawStacked(ctx, M, CW, H, S, heroExtra, state, grade, layout === "hero");
  }

  grain(ctx, W, H, grade.grain);
  vignette(ctx, W, H, grade.vignette);
}

function drawStacked(ctx, M, CW, H, S, heroExtra, state, grade, shortHero) {
  const heroH = (shortHero ? 358 : 440) * S + heroExtra;
  const heroY = 112 * S;
  const heroX = M;
  drawQuoteBar(ctx, M, 36 * S, CW, state, grade);
  drawHeroImage(ctx, heroX, heroY, CW, heroH, state);
  // Title overlaps the hero bottom by ~20px; furniture goes on top last.
  const titleTop = heroY + heroH - 20 * S;
  const titleEnd = drawTitleBlock(ctx, M + CW / 2, titleTop, CW, state, grade, 150 * S);
  drawHeroFurniture(ctx, heroX, heroY, CW, heroH, state, grade);
  const cellsY = titleEnd + 20 * S;
  const cellsH = 150 * S;
  drawCells(ctx, M, cellsY, CW, cellsH, state, grade);
  drawBilling(ctx, M, cellsY + cellsH + 32 * S, CW, state, grade);
  drawFooter(ctx, M, H - 56 * S, CW, state, grade);
}

function drawFull(ctx, M, CW, H, S, state, grade) {
  const img = state.photos[state.mainPhoto];
  const face = FACE[state.mainPhoto];
  const crop = state.crops.main || {};
  const y0 = 112 * S;
  const y1 = H - 210 * S;
  drawQuoteBar(ctx, M, 36 * S, CW, state, grade);
  coverFit(ctx, img, M, y0, CW, y1 - y0, face.x, 0.3, crop.zoom, { x: crop.dx || 0, y: crop.dy || 0 });
  const scrim = ctx.createLinearGradient(0, y1 - 300 * S, 0, y1);
  scrim.addColorStop(0, "rgba(10,6,20,0)");
  scrim.addColorStop(1, "rgba(10,6,20,0.88)");
  ctx.fillStyle = scrim;
  ctx.fillRect(M, y1 - 300 * S, CW, 300 * S);
  drawTitleBlock(ctx, M + CW / 2, y1 - 285 * S, CW, state, grade, 120 * S);
  drawHeroFurniture(ctx, M, y0, CW, y1 - y0, state, grade);
  drawBilling(ctx, M, y1 + 52 * S, CW, state, grade);
  drawFooter(ctx, M, H - 62 * S, CW, state, grade);
}

function drawNine(ctx, M, CW, H, S, state, grade) {
  const y0 = 112 * S;
  const gridH = H - 330 * S;
  const gap = 8 * S;
  const cw = (CW - gap * 2) / 3;
  const ch = (gridH - gap * 2) / 3;
  const photos = [state.mainPhoto, state.mainPhoto === "pier" ? "boulevard" : "pier"];
  const labels = state.labels;
  drawQuoteBar(ctx, M, 36 * S, CW, state, grade);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const x = M + c * (cw + gap);
      const y = y0 + r * (ch + gap);
      const photo = photos[i % 2];
      const face = FACE[photo];
      coverFit(ctx, state.photos[photo], x, y, cw, ch, face.x, face.y, 1, { x: 0, y: 0 });
      // Labels sit at the top of each cell so the title band never dims them.
      chip(ctx, labels[i % labels.length] || "", x + 6, y + 6, 22 * S, grade);
    }
  }
  // Title band across the middle row.
  const bandY = y0 + ch + gap - 14 * S;
  const bandH = ch + 28 * S;
  ctx.fillStyle = "rgba(10,6,20,0.78)";
  ctx.fillRect(M, bandY, CW, bandH);
  drawTitleBlock(ctx, M + CW / 2, bandY + 6 * S, CW * 0.96, state, grade, 104 * S);
  drawBilling(ctx, M, y0 + gridH + 46 * S, CW, state, grade);
  drawFooter(ctx, M, H - 62 * S, CW, state, grade);
}

function drawPolar(ctx, M, CW, H, S, state, grade) {
  drawQuoteBar(ctx, M, 36 * S, CW, state, grade);
  const titleEnd = drawTitleBlock(ctx, M + CW / 2, 128 * S, CW, state, grade, 128 * S);
  const cardW = (CW - 48 * S) / 3;
  const cardH = cardW * 1.24;
  const y = titleEnd + 30 * S;
  const captions = ["the captain", "chasing light", "midnight mile"];
  const photos = [state.mainPhoto, state.mainPhoto === "pier" ? "boulevard" : "pier", state.mainPhoto];
  const rots = [-0.05, 0.035, -0.02];
  for (let i = 0; i < 3; i++) {
    const x = M + i * (cardW + 24 * S);
    ctx.save();
    ctx.translate(x + cardW / 2, y + cardH / 2);
    ctx.rotate(rots[i]);
    ctx.fillStyle = "#f4efe4";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 22 * S;
    ctx.shadowOffsetY = 8 * S;
    ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
    ctx.shadowColor = "transparent";
    const face = FACE[photos[i]];
    coverFit(ctx, state.photos[photos[i]], -cardW / 2 + 14 * S, -cardH / 2 + 14 * S, cardW - 28 * S, cardW - 28 * S, face.x, face.y, 1, { x: 0, y: 0 });
    ctx.fillStyle = "#2b2b2b";
    ctx.font = `${Math.round(34 * S)}px Pacifico, cursive`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(captions[i], 0, cardH / 2 - 34 * S);
    ctx.restore();
  }
  drawBilling(ctx, M, y + cardH + 56 * S, CW, state, grade);
  drawFooter(ctx, M, H - 62 * S, CW, state, grade);
}

// Main entry: draws the poster into ctx at W x H.
// Landscape exports render the square poster centred on a dark stage.
export function drawCover(ctx, W, H, state) {
  if (W / H > 1.3) {
    const grade = gradeById(state.grade);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, grade.bg);
    bg.addColorStop(1, grade.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const off = document.createElement("canvas");
    off.width = 1080;
    off.height = 1080;
    const o = off.getContext("2d");
    drawPoster(o, 1080, 1080, state);
    ctx.drawImage(off, (W - 1080) / 2, 0, 1080, 1080);
    grain(ctx, W, H, grade.grain * 0.5);
    vignette(ctx, W, H, grade.vignette);
    return;
  }
  drawPoster(ctx, W, H, state);
}

export function renderToCanvas(state, w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext("2d"), w, h, state);
  return canvas;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
