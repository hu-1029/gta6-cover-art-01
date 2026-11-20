// Neon Shore — cover renderer.
//
// One design space, 1080 by 1080. Every layout draws into it; exports reuse
// the same drawing at other sizes by scaling the whole design. Nothing here
// touches the network: photos are Image objects the editor loaded from
// local files, and the lettering is the vendored Anton and Pacifico.
//
// The cover speaks movie-poster: a quote bar with stars on top, a full-width
// striped title the hero photo slightly overlaps, a handwritten subtitle, a
// cast of tagged panels, a location strip, a ticket stub, and a billing
// block with a barcode at the bottom.

const DESIGN_W = 1080;
const DESIGN_H = 1080;
const MARGIN = 36;

const LAYOUTS = {
  cast: { name: "Cast Grid", blurb: "Big hero photo, four cast panels below" },
  hero: { name: "Hero Four", blurb: "Big hero photo, three panels below" },
  full: { name: "Full Frame", blurb: "One photo, edge to edge" },
  nine: { name: "Nine Grid", blurb: "Three by three mosaic" },
  polaroids: { name: "Polaroids", blurb: "Tilted instant prints, stacked" },
};

function layoutIds() {
  return Object.keys(LAYOUTS);
}

// --- small helpers -------------------------------------------------------

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
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

// A deterministic source of bar widths for the barcode, so every render
// of the same cover draws the same code.
function barcodeSeed() {
  let s = 20260715;
  return function () {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// --- photo drawing with the face-safe crop -------------------------------
// The focal point defaults to the upper third of the photo, where a face
// usually sits, instead of the middle. Dragging pans the window and the
// wheel zooms it; the window is clamped so it never leaves the photo.

function photoWindow(img, rect, cell) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const zoom = clamp(cell.zoom || 1, 1, 3);
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const visW = rect.w / scale;
  const visH = rect.h / scale;
  let cx = (cell.fx ?? 0.5) * iw + (cell.panX || 0);
  let cy = (cell.fy ?? 0.3) * ih + (cell.panY || 0);
  cx = visW >= iw ? iw / 2 : clamp(cx, visW / 2, iw - visW / 2);
  cy = visH >= ih ? ih / 2 : clamp(cy, visH / 2, ih - visH / 2);
  return { sx: cx - visW / 2, sy: cy - visH / 2, sw: visW, sh: visH, scale };
}

function blitPhoto(ctx, img, win, dest, gradeId, flip, wash) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(dest.x, dest.y, dest.w, dest.h);
  ctx.clip();
  ctx.filter = gradeFilter(gradeId);
  if (flip) {
    ctx.translate(dest.x + dest.w, dest.y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, 0, 0, dest.w, dest.h);
  } else {
    ctx.drawImage(img, win.sx, win.sy, win.sw, win.sh, dest.x, dest.y, dest.w, dest.h);
  }
  ctx.filter = "none";
  if (wash !== false) paintGradeWash(ctx, dest.x, dest.y, dest.w, dest.h, gradeId);
  ctx.restore();
}

function drawPhotoInto(ctx, img, rect, cell, gradeId) {
  if (!img || !img.naturalWidth) return;
  blitPhoto(ctx, img, photoWindow(img, rect, cell), rect, gradeId, !!cell.flip, true);
}

// --- lettering -----------------------------------------------------------

function fitAnton(ctx, text, maxW, startPx) {
  let px = startPx;
  ctx.font = px + 'px Anton, "Arial Narrow", sans-serif';
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = px + 'px Anton, "Arial Narrow", sans-serif';
  }
  return px;
}

// The full-width title: chrome-yellow sunset stripes, a dark outline, and
// a hard offset shadow so it lifts off the photo.
function drawTitle(ctx, text, cx, topY, maxW, scale) {
  const px = fitAnton(ctx, text, maxW, Math.round(150 * scale));
  const grad = ctx.createLinearGradient(cx - maxW / 2, 0, cx + maxW / 2, 0);
  grad.addColorStop(0.0, "#FFE259");
  grad.addColorStop(0.35, "#FFD319");
  grad.addColorStop(0.55, "#FF9A3D");
  grad.addColorStop(0.75, "#FF2975");
  grad.addColorStop(1.0, "#FFC93C");
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = px + 'px Anton, "Arial Narrow", sans-serif';
  ctx.fillStyle = "rgba(10, 4, 24, 0.45)";
  ctx.fillText(text, cx + 5, topY + px + 7);
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(6, px * 0.07);
  ctx.strokeStyle = "#14082B";
  ctx.strokeText(text, cx, topY + px);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, topY + px);
  ctx.restore();
  return px;
}

function drawSubtitle(ctx, text, cx, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "54px Pacifico, cursive";
  ctx.shadowColor = "rgba(10, 4, 24, 0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#FFE9F3";
  ctx.fillText(text, cx, y);
  ctx.restore();
}

function drawSlogan(ctx, text, cx, y) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '30px Anton, "Arial Narrow", sans-serif';
  ctx.letterSpacing = "7px";
  ctx.fillStyle = "#FFD319";
  ctx.fillText(text, cx, y);
  ctx.restore();
}

// --- furniture: quote bar, tags, ticket, badge, billing ------------------

function drawQuoteBar(ctx, state) {
  const x = MARGIN, y = 30, w = DESIGN_W - MARGIN * 2, h = 54;
  ctx.save();
  ctx.fillStyle = "rgba(10, 6, 24, 0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#FFD319";
  ctx.fillRect(x, y, w, 3);
  ctx.fillRect(x, y + h - 3, w, 3);
  const stars = "★".repeat(state.stars) + "☆".repeat(5 - state.stars);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = '26px Anton, "Arial Narrow", sans-serif';
  ctx.fillStyle = "#FFD319";
  ctx.fillText(stars, x + 16, y + h / 2 + 2);
  const starsW = ctx.measureText(stars).width;
  ctx.font = "bold 24px Arial, sans-serif";
  const src = "— " + state.quoteSource;
  const srcW = ctx.measureText(src).width;
  ctx.fillStyle = "#FFD319";
  ctx.textAlign = "right";
  ctx.fillText(src, x + w - 16, y + h / 2 + 1);
  let px = 26;
  ctx.textAlign = "left";
  ctx.font = "bold " + px + "px Arial, sans-serif";
  const avail = w - 16 - starsW - 24 - srcW - 32;
  const quote = "“" + state.quote + "”";
  while (px > 16 && ctx.measureText(quote).width > avail) {
    px -= 2;
    ctx.font = "bold " + px + "px Arial, sans-serif";
  }
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(quote, x + 16 + starsW + 24, y + h / 2 + 1);
  ctx.restore();
}

// A black chip with a gold edge: the cast tag on a panel's corner.
function drawTag(ctx, text, x, y) {
  ctx.save();
  ctx.font = '22px Anton, "Arial Narrow", sans-serif';
  const w = ctx.measureText(text).width + 22;
  const h = 32;
  ctx.fillStyle = "rgba(8, 4, 20, 0.92)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#FFD319";
  ctx.fillRect(x, y, 4, h);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 12, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawTicket(ctx, text, x, y) {
  ctx.save();
  ctx.font = '24px Anton, "Arial Narrow", sans-serif';
  const w = ctx.measureText(text).width + 30;
  const h = 36;
  ctx.fillStyle = "#FFD319";
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = "#14082B";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawLocationStrip(ctx, text, x, y) {
  ctx.save();
  ctx.font = '24px Anton, "Arial Narrow", sans-serif';
  const w = ctx.measureText(text).width + 28;
  const h = 38;
  ctx.fillStyle = "rgba(8, 4, 20, 0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#FFD319";
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 14, y + h / 2 + 1);
  ctx.restore();
  return w;
}

function drawStarBadge(ctx, cx, cy, r, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#FF2975";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#FFFFFF";
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 21px Arial, sans-serif";
  ctx.fillText("EST. 2026", 0, -12);
  ctx.font = "bold 19px Arial, sans-serif";
  ctx.fillText("ORIGINAL", 0, 12);
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  const next = barcodeSeed();
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x - 6, y - 4, w + 12, h + 8);
  ctx.fillStyle = "#14082B";
  let bx = x;
  while (bx < x + w - 4) {
    const bw = 2 + Math.floor(next() * 4);
    if (next() > 0.35) ctx.fillRect(bx, y, bw, h);
    bx += bw + 2;
  }
  ctx.restore();
}

// The billing block: the production line is built from the cast tags, so
// renaming a character renames the billing with it.
function drawBilling(ctx, state) {
  const y0 = 934;
  const cx = DESIGN_W / 2;
  const n = visibleCellCount(state.layout);
  const names = [...new Set([state.hero.tag].concat(state.cells.slice(0, n).map((c) => c.tag)))].filter(Boolean);
  const billingLine = "STARRING " + names.join(" · ");
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '26px Anton, "Arial Narrow", sans-serif';
  ctx.letterSpacing = "4px";
  ctx.fillStyle = "#FFD319";
  ctx.fillText("A NEON SHORE PICTURE", cx, y0 + 8);
  let px = 21;
  ctx.font = px + "px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  while (px > 14 && ctx.measureText(billingLine).width > DESIGN_W - MARGIN * 2) {
    px -= 1;
    ctx.font = px + "px Arial, sans-serif";
  }
  ctx.fillStyle = "#F2EAFB";
  ctx.fillText(billingLine, cx, y0 + 40);
  ctx.font = '34px Anton, "Arial Narrow", sans-serif';
  ctx.letterSpacing = "5px";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.fillText("COMING SOON", MARGIN, y0 + 82);
  drawBarcode(ctx, cx - 90, y0 + 58, 180, 46);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(DESIGN_W - MARGIN - 52, y0 + 58, 52, 46);
  ctx.font = '28px Anton, "Arial Narrow", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("NS", DESIGN_W - MARGIN - 26, y0 + 82);
  ctx.restore();
}

// --- layouts -------------------------------------------------------------

function coverGeometry(layout) {
  const inner = DESIGN_W - MARGIN * 2;
  if (layout === "cast") {
    const hero = { x: MARGIN, y: 96, w: inner, h: 466 };
    const cw = (inner - 3 * 12) / 4;
    const cells = [0, 1, 2, 3].map((i) => ({
      x: MARGIN + i * (cw + 12),
      y: 760,
      w: cw,
      h: 158,
    }));
    return { hero, cells, titleTop: 530, subtitleY: 700, sloganY: 736 };
  }
  if (layout === "hero") {
    const hero = { x: MARGIN, y: 96, w: inner, h: 466 };
    const cw = (inner - 2 * 12) / 3;
    const cells = [0, 1, 2].map((i) => ({
      x: MARGIN + i * (cw + 12),
      y: 760,
      w: cw,
      h: 158,
    }));
    return { hero, cells, titleTop: 530, subtitleY: 700, sloganY: 736 };
  }
  if (layout === "full") {
    return {
      hero: { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H },
      cells: [],
      titleTop: 560,
      subtitleY: 736,
      sloganY: 772,
    };
  }
  if (layout === "nine") {
    const cw = (inner - 2 * 10) / 3;
    const ch = (826 - 2 * 10) / 3;
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        cells.push({ x: MARGIN + c * (cw + 10), y: 96 + r * (ch + 10), w: cw, h: ch });
      }
    }
    return { hero: null, cells, titleTop: 440, subtitleY: 612, sloganY: 648 };
  }
  // polaroids: the hero is the full-bleed backdrop, the prints are placed
  // by drawPolaroids below.
  return {
    hero: { x: 0, y: 0, w: DESIGN_W, h: DESIGN_H },
    cells: [],
    titleTop: 108,
    subtitleY: 284,
    sloganY: 320,
  };
}

// Clickable zones in design space: the hero, then each visible cell.
function hitZones(state) {
  const geo = coverGeometry(state.layout);
  const zones = [];
  if (geo.hero) zones.push({ kind: "hero", index: -1, rect: geo.hero });
  geo.cells.forEach((rect, i) => zones.push({ kind: "cell", index: i, rect }));
  if (state.layout === "polaroids") {
    return [
      { kind: "cell", index: 0, rect: { x: 90, y: 340, w: 300, h: 380 } },
      { kind: "cell", index: 1, rect: { x: 390, y: 330, w: 300, h: 380 } },
      { kind: "cell", index: 2, rect: { x: 690, y: 340, w: 300, h: 380 } },
    ];
  }
  return zones;
}

function visibleCellCount(layout) {
  if (layout === "cast") return 4;
  if (layout === "hero") return 3;
  if (layout === "nine") return 9;
  if (layout === "polaroids") return 3;
  return 0;
}

function drawPolaroids(ctx, state, img) {
  const prints = [
    { cell: state.cells[0], x: 90, y: 340, rot: -0.1 },
    { cell: state.cells[1], x: 390, y: 330, rot: 0.03 },
    { cell: state.cells[2], x: 690, y: 340, rot: 0.09 },
  ];
  prints.forEach((p) => {
    const cell = p.cell;
    if (!cell) return;
    const w = 300;
    const photoH = 300;
    const frameH = 380;
    ctx.save();
    ctx.translate(p.x + w / 2, p.y + frameH / 2);
    ctx.rotate(p.rot);
    ctx.fillStyle = "#F7F2E8";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillRect(-w / 2, -frameH / 2, w, frameH);
    ctx.shadowColor = "rgba(0, 0, 0, 0)";
    drawPhotoInto(
      ctx,
      img(cell.photo),
      { x: -w / 2 + 14, y: -frameH / 2 + 14, w: w - 28, h: photoH },
      cell,
      state.grade
    );
    ctx.fillStyle = "#14082B";
    ctx.font = '26px Anton, "Arial Narrow", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cell.tag, 0, frameH / 2 - 36);
    ctx.restore();
  });
}

// --- the cover -----------------------------------------------------------

function drawDesign(ctx, state) {
  const layout = state.layout;
  const geo = coverGeometry(layout);
  ctx.fillStyle = "#0D0716";
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  const img = (id) => state.photos[id] && state.photos[id].img;

  if (layout === "full") {
    drawPhotoInto(ctx, img(state.hero.photo), geo.hero, state.hero, state.grade);
    const scrim = ctx.createLinearGradient(0, 700, 0, DESIGN_H);
    scrim.addColorStop(0, "rgba(10, 4, 24, 0)");
    scrim.addColorStop(1, "rgba(10, 4, 24, 0.85)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 700, DESIGN_W, DESIGN_H - 700);
    const topScrim = ctx.createLinearGradient(0, 0, 0, 140);
    topScrim.addColorStop(0, "rgba(10, 4, 24, 0.75)");
    topScrim.addColorStop(1, "rgba(10, 4, 24, 0)");
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, DESIGN_W, 140);
  } else if (layout === "nine") {
    geo.cells.forEach((rect, i) => {
      const cell = state.cells[i] || state.cells[0];
      drawPhotoInto(ctx, img(cell.photo), rect, cell, state.grade);
      drawTag(ctx, cell.tag, rect.x + 8, rect.y + rect.h - 40);
    });
    ctx.fillStyle = "rgba(10, 4, 24, 0.72)";
    ctx.fillRect(0, 424, DESIGN_W, 256);
  } else if (layout === "polaroids") {
    drawPhotoInto(ctx, img(state.hero.photo), geo.hero, state.hero, state.grade);
    ctx.fillStyle = "rgba(10, 4, 24, 0.45)";
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    drawPolaroids(ctx, state, img);
  } else {
    // cast + hero: one big photo, a row of cast panels under the title.
    drawPhotoInto(ctx, img(state.hero.photo), geo.hero, state.hero, state.grade);
    geo.cells.forEach((rect, i) => {
      const cell = state.cells[i];
      if (!cell) return;
      drawPhotoInto(ctx, img(cell.photo), rect, cell, state.grade);
      drawTag(ctx, cell.tag, rect.x + 8, rect.y + rect.h - 40);
    });
    drawTag(ctx, state.hero.tag, geo.hero.x + 12, geo.hero.y + 12);
  }

  drawQuoteBar(ctx, state);

  drawTitle(ctx, state.title, DESIGN_W / 2, geo.titleTop, DESIGN_W - MARGIN * 2 - 20, state.titleScale || 1);
  drawSubtitle(ctx, state.subtitle, DESIGN_W / 2, geo.subtitleY);
  drawSlogan(ctx, state.slogan, DESIGN_W / 2, geo.sloganY);

  // The hero's bottom band is painted over the title's top edge, so the
  // photo looks like it breaks out of its frame over the lettering.
  if ((layout === "cast" || layout === "hero") && img(state.hero.photo)) {
    const heroImg = img(state.hero.photo);
    const bandH = 44;
    const win = photoWindow(heroImg, geo.hero, state.hero);
    const bandWin = {
      sx: win.sx,
      sy: win.sy + win.sh * (1 - bandH / geo.hero.h),
      sw: win.sw,
      sh: win.sh * (bandH / geo.hero.h),
      scale: win.scale,
    };
    blitPhoto(
      ctx,
      heroImg,
      bandWin,
      { x: geo.hero.x, y: geo.hero.y + geo.hero.h - bandH, w: geo.hero.w, h: bandH },
      state.grade,
      !!state.hero.flip,
      true
    );
  }

  if (layout === "cast" || layout === "hero") {
    drawLocationStrip(ctx, state.location, geo.hero.x + 12, geo.hero.y + geo.hero.h - 50);
    drawTicket(ctx, state.ticket, geo.hero.x + geo.hero.w - 116, geo.hero.y + geo.hero.h - 50);
  } else if (layout === "full") {
    drawLocationStrip(ctx, state.location, MARGIN, 100);
    drawTicket(ctx, state.ticket, DESIGN_W - MARGIN - 116, 100);
  } else if (layout === "polaroids") {
    drawLocationStrip(ctx, state.location, MARGIN, 880);
    drawTicket(ctx, state.ticket, DESIGN_W - MARGIN - 116, 880);
  }

  if (state.showBadge && layout !== "nine") {
    const badgeY = layout === "full" ? 230 : 150;
    drawStarBadge(ctx, DESIGN_W - MARGIN - 46, badgeY, 54, -0.21);
  }

  if (state.showBilling) drawBilling(ctx, state);
}

// --- grain and vignette --------------------------------------------------

let grainPattern = null;

function paintGrain(ctx, w, h) {
  if (!grainPattern) {
    const g = document.createElement("canvas");
    g.width = 160;
    g.height = 160;
    const gc = g.getContext("2d");
    const data = gc.createImageData(160, 160);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    gc.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(g, "repeat");
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function paintVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75
  );
  grad.addColorStop(0, "rgba(8, 3, 18, 0)");
  grad.addColorStop(1, "rgba(8, 3, 18, 0.30)");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// --- render + export -----------------------------------------------------

// Draw the cover onto any canvas at any size. Square uses the design as
// it is; portrait extends the dark top and bottom; landscape fills the
// sides with the hero photo, blurred and darkened.
function renderCover(canvas, state, w, h) {
  const ctx = canvas.getContext("2d");
  canvas.width = w;
  canvas.height = h;
  const scale = Math.min(w / DESIGN_W, h / DESIGN_H);
  const dw = DESIGN_W * scale;
  const dh = DESIGN_H * scale;
  const ox = (w - dw) / 2;
  const oy = (h - dh) / 2;
  if (w > h) {
    const heroImg = state.photos[state.hero.photo] && state.photos[state.hero.photo].img;
    ctx.save();
    ctx.filter = "blur(28px) brightness(0.45) saturate(1.2)";
    if (heroImg && heroImg.naturalWidth) ctx.drawImage(heroImg, 0, 0, w, h);
    else {
      ctx.fillStyle = "#0D0716";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = "#0D0716";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  drawDesign(ctx, state);
  ctx.restore();
  paintGrain(ctx, w, h);
  paintVignette(ctx, w, h);
}

const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: "Square · 1080 × 1080", file: "neon-shore-1080x1080.png" },
  portrait: { w: 1080, h: 1350, label: "Portrait · 1080 × 1350", file: "neon-shore-1080x1350.png" },
  wide: { w: 1920, h: 1080, label: "Wide · 1920 × 1080", file: "neon-shore-1920x1080.png" },
};

function exportCover(state, sizeId) {
  const size = EXPORT_SIZES[sizeId];
  const canvas = document.createElement("canvas");
  renderCover(canvas, state, size.w, size.h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
