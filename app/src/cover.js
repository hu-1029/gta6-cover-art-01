/* cover.js — canvas render engine for the cover art studio.
 * Draws one cover from a state object. No network, no dependencies
 * besides CoverGrades. All layout geometry is normalised (0..1)
 * and scaled to whatever canvas size is asked for. */
(function () {
  "use strict";

  var GAP = 0.008; // gap between panels, as a fraction of the short side

  var LAYOUTS = {
    hero: { label: "Hero Four", cells: 4, blurb: "Big hero photo, three panels below" },
    full: { label: "Full Frame", cells: 1, blurb: "One photo, edge to edge" },
    grid: { label: "Nine Grid", cells: 9, blurb: "Three by three mosaic" },
    polaroid: { label: "Polaroids", cells: 3, blurb: "Tilted instant prints, stacked" },
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Panel rectangles for a layout, in canvas pixels.
  // Each cell: { x, y, w, h, rot (radians), frame (bool) }
  function layoutCells(layout, W, H) {
    var g = Math.round(Math.min(W, H) * GAP);
    var cells = [];
    var i, x, y, w, h;
    if (layout === "full") {
      cells.push({ x: 0, y: 0, w: W, h: H, rot: 0, frame: false });
    } else if (layout === "hero") {
      var heroH = Math.round(H * 0.64);
      cells.push({ x: 0, y: 0, w: W, h: heroH - g, rot: 0, frame: false });
      var bw = Math.floor((W - g * 2) / 3);
      for (i = 0; i < 3; i++) {
        cells.push({
          x: i * (bw + g),
          y: heroH,
          w: bw,
          h: H - heroH,
          rot: 0,
          frame: false,
        });
      }
    } else if (layout === "grid") {
      var cw = Math.floor((W - g * 2) / 3);
      var ch = Math.floor((H - g * 2) / 3);
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
          cells.push({
            x: c * (cw + g),
            y: r * (ch + g),
            w: cw,
            h: ch,
            rot: 0,
            frame: false,
          });
        }
      }
    } else if (layout === "polaroid") {
      var fw = Math.round(W * 0.5);
      var fh = Math.round(H * 0.58);
      var spots = [
        { cx: 0.26, cy: 0.56, rot: -0.16 },
        { cx: 0.5, cy: 0.5, rot: 0.03 },
        { cx: 0.74, cy: 0.56, rot: 0.14 },
      ];
      for (i = 0; i < 3; i++) {
        x = Math.round(spots[i].cx * W - fw / 2);
        y = Math.round(spots[i].cy * H - fh / 2);
        cells.push({ x: x, y: y, w: fw, h: fh, rot: spots[i].rot, frame: true });
      }
    }
    return cells;
  }

  // Cover-fit draw of a graded photo into a cell, with pan (ox/oy in -1..1)
  // and zoom (1..3). Source rect is clamped so no empty edges show.
  function drawCell(ctx, img, cell, photo) {
    var gw = img.width;
    var gh = img.height;
    var cw = cell.w;
    var ch = cell.h;
    var zoom = clamp(photo.zoom || 1, 1, 3);
    var base = Math.max(cw / gw, ch / gh);
    var s = base * zoom;
    var sw = cw / s;
    var sh = ch / s;
    var sx = (gw - sw) / 2 + (photo.ox || 0) * ((gw - sw) / 2);
    var sy = (gh - sh) / 2 + (photo.oy || 0) * ((gh - sh) / 2);
    sx = clamp(sx, 0, Math.max(0, gw - sw));
    sy = clamp(sy, 0, Math.max(0, gh - sh));
    ctx.save();
    if (cell.rot) {
      ctx.translate(cell.x + cw / 2, cell.y + ch / 2);
      ctx.rotate(cell.rot);
      ctx.translate(-cw / 2, -ch / 2);
    } else {
      ctx.translate(cell.x, cell.y);
    }
    if (cell.frame) {
      // White instant-print border with a wider bottom strip.
      ctx.fillStyle = "#f7f2e8";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = Math.round(Math.min(cw, ch) * 0.05);
      ctx.shadowOffsetY = Math.round(Math.min(cw, ch) * 0.02);
      ctx.fillRect(0, 0, cw, ch);
      ctx.shadowColor = "transparent";
      var pad = Math.round(cw * 0.045);
      var strip = Math.round(ch * 0.16);
      ctx.drawImage(
        img, sx, sy, sw, sh,
        pad, pad, cw - pad * 2, ch - pad - strip
      );
      ctx.fillStyle = "#2b2b2b";
      ctx.font = Math.round(strip * 0.42) + "px Pacifico, cursive";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(photo.stripText || "neon shore", cw / 2, ch - strip / 2);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    }
    ctx.restore();
  }

  // Fit caption text into maxWidth: shrink, then word-wrap (max 3 lines).
  function fitLines(ctx, text, maxWidth, baseSize) {
    var size = baseSize;
    var words = String(text || "").toUpperCase().split(/\s+/).filter(Boolean);
    if (!words.length) return { lines: [], size: 0 };
    var lines = [];
    while (size > baseSize * 0.35) {
      ctx.font = size + "px Anton, sans-serif";
      lines = [];
      var cur = words[0];
      for (var i = 1; i < words.length; i++) {
        var trial = cur + " " + words[i];
        if (ctx.measureText(trial).width <= maxWidth) {
          cur = trial;
        } else {
          lines.push(cur);
          cur = words[i];
        }
      }
      lines.push(cur);
      var widest = 0;
      for (var j = 0; j < lines.length; j++) {
        widest = Math.max(widest, ctx.measureText(lines[j]).width);
      }
      if (widest <= maxWidth && lines.length <= 3) break;
      size *= 0.92;
    }
    return { lines: lines, size: size };
  }

  function drawCaption(ctx, W, H, state) {
    var caption = (state.caption || "").trim();
    if (!caption) return;
    var layout = state.layout;
    var maxW = W * (layout === "grid" ? 0.86 : 0.9);
    var base = Math.round(Math.min(W, H) * 0.115 * (state.captionSize || 1));
    var fitted = fitLines(ctx, caption, maxW, base);
    if (!fitted.lines.length) return;
    var size = fitted.size;
    var lineH = size * 1.04;
    var grad = ctx.createLinearGradient(0, 0, 0, size * fitted.lines.length);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#ffe9a8");
    grad.addColorStop(1, "#ff9a5c");
    var totalH = lineH * fitted.lines.length;
    var cx = W / 2;
    var cy;
    if (layout === "polaroid") {
      cy = Math.round(H * 0.1) + totalH / 2; // title band above the prints
    } else if (layout === "grid") {
      cy = H - Math.round(H * 0.1) - totalH / 2; // dark band at the bottom
      ctx.fillStyle = "rgba(10,6,18,0.62)";
      ctx.fillRect(0, H - Math.round(H * 0.2), W, Math.round(H * 0.2));
    } else if (layout === "full") {
      cy = H * (state.captionY == null ? 0.8 : state.captionY);
    } else {
      cy = Math.round(H * 0.64) - totalH - Math.round(H * 0.03); // bottom of hero
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(layout === "polaroid" ? 0 : -0.035);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = size + "px Anton, sans-serif";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.round(size * 0.12);
    ctx.shadowOffsetY = Math.round(size * 0.05);
    ctx.strokeStyle = "rgba(24,8,28,0.92)";
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.fillStyle = grad;
    for (var i = 0; i < fitted.lines.length; i++) {
      var ly = (i - (fitted.lines.length - 1) / 2) * lineH;
      ctx.strokeText(fitted.lines[i], 0, ly);
      ctx.fillText(fitted.lines[i], 0, ly);
    }
    ctx.restore();

    var sub = (state.subcaption || "").trim();
    if (sub) {
      ctx.save();
      ctx.font = Math.round(size * 0.34) + "px Pacifico, cursive";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffe9fb";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      var subY = cy + totalH / 2 + Math.round(size * 0.42);
      if (layout === "grid") subY = H - Math.round(H * 0.035);
      ctx.fillText(sub, W / 2, subY);
      ctx.restore();
    }
  }

  function drawBadge(ctx, W, H, state) {
    if (!state.effects || !state.effects.badge) return;
    var r = Math.round(Math.min(W, H) * 0.085);
    var cx = W - r - Math.round(W * 0.03);
    var cy = r + Math.round(H * 0.03);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.2);
    ctx.beginPath();
    var spikes = 12;
    for (var i = 0; i < spikes * 2; i++) {
      var rad = i % 2 === 0 ? r : r * 0.62;
      var a = (Math.PI * i) / spikes - Math.PI / 2;
      var px = Math.cos(a) * rad;
      var py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "#ff2e88";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.round(r * 0.34) + "px Anton, sans-serif";
    ctx.fillText("EST. 2026", 0, -r * 0.18);
    ctx.font = Math.round(r * 0.26) + "px Anton, sans-serif";
    ctx.fillText("ORIGINAL", 0, r * 0.22);
    ctx.restore();
  }

  var noiseCache = null;
  function grainPattern(ctx) {
    if (noiseCache) return noiseCache;
    var n = document.createElement("canvas");
    n.width = 140;
    n.height = 140;
    var nx = n.getContext("2d");
    var d = nx.createImageData(140, 140);
    for (var i = 0; i < d.data.length; i += 4) {
      var v = (Math.random() * 255) | 0;
      d.data[i] = v;
      d.data[i + 1] = v;
      d.data[i + 2] = v;
      d.data[i + 3] = 28;
    }
    nx.putImageData(d, 0, 0);
    noiseCache = ctx.createPattern(n, "repeat");
    return noiseCache;
  }

  var dotCache = null;
  function halftonePattern(ctx, size) {
    var key = size;
    if (dotCache && dotCache.key === key) return dotCache.pat;
    var n = document.createElement("canvas");
    n.width = size;
    n.height = size;
    var nx = n.getContext("2d");
    nx.fillStyle = "rgba(0,0,0,0.55)";
    nx.beginPath();
    nx.arc(size / 2, size / 2, size * 0.18, 0, Math.PI * 2);
    nx.fill();
    dotCache = { key: key, pat: ctx.createPattern(n, "repeat") };
    return dotCache.pat;
  }

  // state: { layout, grade, caption, subcaption, captionSize, captionY,
  //          photos: [{ img, name }], cells: [{ photo, ox, oy, zoom, stripText }],
  //          effects: { grain, vignette, halftone, badge } }
  // Returns the cell rectangles (canvas pixels) for hit-testing.
  function renderCover(canvas, state) {
    var W = canvas.width;
    var H = canvas.height;
    var ctx = canvas.getContext("2d");
    var grade = (window.CoverGrades.GRADES[state.grade] || window.CoverGrades.GRADES.sunset);
    var cells = layoutCells(state.layout, W, H);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#14101c";
    ctx.fillRect(0, 0, W, H);

    // Photos.
    for (var i = 0; i < cells.length; i++) {
      var slot = state.cells[i] || { photo: 0, ox: 0, oy: 0, zoom: 1 };
      var photo = state.photos[slot.photo] || state.photos[0];
      if (!photo || !photo.img) continue;
      if (!photo.graded) photo.graded = {};
      if (!photo.graded[state.grade]) {
        photo.graded[state.grade] = window.CoverGrades.gradeImage(
          photo.img, state.grade, 720
        );
      }
      var graded = photo.graded[state.grade];
      var slotWithText = {
        ox: slot.ox || 0,
        oy: slot.oy || 0,
        zoom: slot.zoom || 1,
        stripText: slot.stripText || state.subcaption || "neon shore",
      };
      drawCell(ctx, graded, cells[i], slotWithText);
    }

    // Colour wash over the whole cover.
    var wash = ctx.createLinearGradient(0, 0, W, H);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(1, grade.wash[1]);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = grade.washAlpha;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Halftone dots, mostly visible in the shadows.
    if (state.effects && state.effects.halftone) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = halftonePattern(ctx, Math.max(9, Math.round(W / 90)));
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    drawCaption(ctx, W, H, state);
    drawBadge(ctx, W, H, state);

    // Vignette.
    if (!state.effects || state.effects.vignette) {
      var vg = ctx.createRadialGradient(
        W / 2, H / 2, Math.min(W, H) * 0.42,
        W / 2, H / 2, Math.max(W, H) * 0.75
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.38)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    // Film grain last.
    if (!state.effects || state.effects.grain) {
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = grainPattern(ctx);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    renderCover.lastCells = cells;
    return cells;
  }

  // Hit-test a canvas point against the last rendered cells.
  function cellAtPoint(x, y) {
    var cells = renderCover.lastCells || [];
    for (var i = cells.length - 1; i >= 0; i--) {
      var c = cells[i];
      var px = x;
      var py = y;
      if (c.rot) {
        var cx = c.x + c.w / 2;
        var cy = c.y + c.h / 2;
        var dx = x - cx;
        var dy = y - cy;
        var cos = Math.cos(-c.rot);
        var sin = Math.sin(-c.rot);
        px = cx + dx * cos - dy * sin;
        py = cy + dx * sin + dy * cos;
      }
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        return i;
      }
    }
    return -1;
  }

  window.CoverEngine = {
    LAYOUTS: LAYOUTS,
    layoutCells: layoutCells,
    renderCover: renderCover,
    cellAtPoint: cellAtPoint,
  };
})();
