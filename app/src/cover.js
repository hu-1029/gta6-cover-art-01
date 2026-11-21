// Neon Tide Cover Studio — cover render engine.
// Draws a GTA 6 style cover onto a 2D canvas. Everything is drawn from
// the state object: preset copy, layout, grade, six photos with labels
// and per-cell crop settings. No network access, no external assets.

(function (global) {
  'use strict';

  var W = 1080;
  var H = 1080;
  var MARGIN = 36;

  var LAYOUTS = ['mosaic', 'hero-four', 'full-frame', 'nine-grid', 'polaroids'];
  var LAYOUT_LABELS = {
    'mosaic': 'Mosaic',
    'hero-four': 'Hero Four',
    'full-frame': 'Full Frame',
    'nine-grid': 'Nine Grid',
    'polaroids': 'Polaroids'
  };

  // ---------------------------------------------------------------- helpers

  function starPath(ctx, cx, cy, rOuter, rInner, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = (i % 2 === 0) ? rOuter : rInner;
      var a = (Math.PI * i) / points - Math.PI / 2;
      var x = cx + r * Math.cos(a);
      var y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function seededRand(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function fontAnton(px, weight) {
    return (weight || 400) + ' ' + px + 'px Anton, "Arial Narrow", sans-serif';
  }

  function fontPacifico(px) {
    return px + 'px Pacifico, cursive';
  }

  // Cover-fit draw with a focal point (fx, fy in 0..1), zoom scale and
  // drag offset (dx, dy in px). Default focal point is 30% from the top,
  // which keeps faces in frame for the kit samples and the cast portraits.
  function drawPhoto(ctx, img, rect, cell) {
    if (!img || !img.naturalWidth) return;
    var iw = img.naturalWidth;
    var ih = img.naturalHeight;
    var scale = Math.max(rect.w / iw, rect.h / ih) * (cell.scale || 1);
    var dw = iw * scale;
    var dh = ih * scale;
    var fx = (cell.fx == null) ? 0.5 : cell.fx;
    var fy = (cell.fy == null) ? 0.3 : cell.fy;
    var dx = rect.x + rect.w / 2 - dw * fx + (cell.dx || 0);
    var dy = rect.y + rect.h / 2 - dh * fy + (cell.dy || 0);
    if (dw > rect.w) {
      if (dx > rect.x) dx = rect.x;
      if (dx + dw < rect.x + rect.w) dx = rect.x + rect.w - dw;
    } else {
      dx = rect.x + (rect.w - dw) / 2;
    }
    if (dh > rect.h) {
      if (dy > rect.y) dy = rect.y;
      if (dy + dh < rect.y + rect.h) dy = rect.y + rect.h - dh;
    } else {
      dy = rect.y + (rect.h - dh) / 2;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  // Black role tag with a gold left border, pinned to a cell's top-left.
  function drawTag(ctx, x, y, text, grade) {
    ctx.save();
    ctx.font = fontAnton(26);
    var tw = ctx.measureText(text).width;
    var padX = 12;
    var h = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(x, y, tw + padX * 2 + 6, h);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(x, y, 6, h);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 6 + padX, y + h / 2 + 1);
    ctx.restore();
  }

  // Dense barcode: every step draws a bar (width 2-5px, gap 1-3px).
  function drawBarcode(ctx, x, y, w, h, seed) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#111111';
    var rand = seededRand(seed);
    var cx = x + 6;
    var end = x + w - 6;
    while (cx < end) {
      var bw = 2 + Math.floor(rand() * 4);
      if (cx + bw > end) bw = end - cx;
      ctx.fillRect(cx, y + 5, bw, h - 10);
      cx += bw + 1 + Math.floor(rand() * 3);
    }
    ctx.restore();
  }

  function drawVolPill(ctx, x, y, grade) {
    ctx.save();
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.ellipse(x, y, 64, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d0636';
    ctx.font = fontAnton(28);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOL. 1', x, y + 1);
    ctx.restore();
  }

  function drawSeal(ctx, x, y, grade) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = grade.seal;
    ctx.beginPath();
    var spikes = 12;
    for (var i = 0; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? 48 : 38;
      var a = (Math.PI * i) / spikes - Math.PI / 2;
      var px = r * Math.cos(a);
      var py = r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = grade.sealInk;
    ctx.font = fontAnton(19);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EST. 2026', 0, -11);
    ctx.fillText('ORIGINAL', 0, 11);
    ctx.restore();
  }

  function drawLocationStrip(ctx, rect, text, grade) {
    ctx.save();
    var h = 44;
    var y = rect.y + rect.h - h;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(rect.x, y, rect.w, h);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(rect.x, y, 6, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = fontAnton(27);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rect.x + 16, y + h / 2 + 1);
    ctx.restore();
  }

  // ------------------------------------------------------------- quote bar

  function drawQuoteBar(ctx, state, grade) {
    var top = 28;
    var bottom = 92;
    var cy = (top + bottom) / 2;
    ctx.save();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.strokeStyle = grade.rule;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN, top);
    ctx.lineTo(W - MARGIN, top);
    ctx.moveTo(MARGIN, bottom);
    ctx.lineTo(W - MARGIN, bottom);
    ctx.stroke();
    // Five stars on the left: four filled, one outline.
    var sx = MARGIN + 14;
    for (var i = 0; i < 5; i++) {
      var cx = sx + i * 42;
      starPath(ctx, cx, cy, 17, 7, 5);
      if (i < 4) {
        ctx.fillStyle = grade.accent;
        ctx.fill();
      } else {
        ctx.strokeStyle = grade.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    var starsRight = sx + 4 * 42 + 20;
    // Source on the right. Measure it first so the quote gets the gap
    // between the stars and the source, and never collides with it. The
    // source is drawn right-aligned at the margin, so it can never run
    // off the right edge even if the font metrics shift.
    ctx.font = fontAnton(28);
    var sourceText = '— ' + state.source;
    var sourceW = ctx.measureText(sourceText).width;
    var sourceLeft = W - MARGIN - sourceW;
    var quoteZoneLeft = starsRight + 24;
    var quoteZoneRight = sourceLeft - 48;
    var quoteSize = 38;
    ctx.font = fontAnton(quoteSize);
    var quoteText = '"' + state.quote + '"';
    while (quoteSize > 22 && ctx.measureText(quoteText).width > (quoteZoneRight - quoteZoneLeft)) {
      quoteSize -= 2;
      ctx.font = fontAnton(quoteSize);
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(quoteText, (quoteZoneLeft + quoteZoneRight) / 2, cy + 1);
    ctx.fillStyle = grade.accent;
    ctx.textAlign = 'right';
    ctx.fillText(sourceText, W - MARGIN, cy + 1);
    ctx.restore();
  }

  // ---------------------------------------------------------------- title

  function drawTitleBlock(ctx, state, grade, titleTop) {
    ctx.save();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // Vertical chrome gradient: yellow at the top, pink in the middle,
    // magenta at the bottom — the same striped-chrome look as the
    // reference covers. The gradient spans the title's own height so the
    // yellow shows at the letters' tops instead of only at the canvas edge.
    var grad = ctx.createLinearGradient(0, titleTop, 0, titleTop + 150);
    grad.addColorStop(0, grade.titleStops[0]);
    grad.addColorStop(0.5, grade.titleStops[1]);
    grad.addColorStop(1, grade.titleStops[2]);
    ctx.font = fontAnton(150);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.strokeText(state.title, W / 2, titleTop);
    ctx.fillStyle = grad;
    ctx.fillText(state.title, W / 2, titleTop);
    // Handwritten subtitle tucked under the title's bottom edge. Its
    // descenders must clear the bottom-row labels, so it sits high.
    ctx.font = fontPacifico(52);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(state.subtitle, W / 2, titleTop + 108);
    ctx.restore();
  }

  // ------------------------------------------------------------ bottom rows

  // y is the TOP of the billing block, which sits below the photo grid
  // with a clear gap. All three lines use top baselines so nothing can
  // drift up over the grid or the location strip.
  function drawBilling(ctx, state, grade, y) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = grade.tag;
    ctx.font = fontAnton(64);
    ctx.fillText(state.tagline, W / 2, y);
    ctx.fillStyle = grade.accent;
    ctx.font = fontAnton(44);
    ctx.fillText('A NEON SHORE PICTURE', W / 2, y + 74);
    // Billing line: visible cells' labels, in order, deduplicated.
    var seen = {};
    var names = [];
    state.cells.forEach(function (c) {
      if (c.visible === false) return;
      if (!seen[c.label]) {
        seen[c.label] = true;
        names.push(c.label);
      }
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = fontAnton(30);
    ctx.fillText('STARRING ' + names.join(' · '), W / 2, y + 122);
    ctx.restore();
  }

  function drawFooter(ctx, state, grade, y) {
    ctx.save();
    ctx.font = fontAnton(56);
    ctx.fillStyle = grade.muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMING SOON', MARGIN, y + 32);
    drawBarcode(ctx, W / 2 - 110, y, 220, 64, state.title.length * 7919 + 13);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(W - MARGIN - 66, y, 66, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = fontAnton(34);
    ctx.textAlign = 'center';
    ctx.fillText('NS', W - MARGIN - 33, y + 34);
    ctx.restore();
  }

  // --------------------------------------------------------------- layouts

  function photoArea() {
    return { x: MARGIN, y: 108, w: W - MARGIN * 2, h: 662 };
  }

  function mosaicCells() {
    var a = photoArea();
    var gap = 8;
    var cw = (a.w - gap * 2) / 3;
    var ch = (a.h - gap) / 2;
    var cells = [];
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 3; c++) {
        cells.push({
          x: a.x + c * (cw + gap),
          y: a.y + r * (ch + gap),
          w: cw,
          h: ch
        });
      }
    }
    return cells;
  }

  function heroFourCells() {
    var a = photoArea();
    var gap = 8;
    var heroW = a.w * 0.55;
    var sideX = a.x + heroW + gap;
    var sideW = a.w - heroW - gap;
    var sw = (sideW - gap) / 2;
    var sh = (a.h - gap) / 2;
    var cells = [
      { x: a.x, y: a.y, w: heroW, h: a.h },
      { x: sideX, y: a.y, w: sw, h: sh },
      { x: sideX + sw + gap, y: a.y, w: sw, h: sh },
      { x: sideX, y: a.y + sh + gap, w: sw, h: sh },
      { x: sideX + sw + gap, y: a.y + sh + gap, w: sw, h: sh }
    ];
    return cells;
  }

  function nineGridCells() {
    var a = photoArea();
    var gap = 8;
    var cw = (a.w - gap * 2) / 3;
    var ch = (a.h - gap * 2) / 3;
    var cells = [];
    for (var r = 0; r < 3; r++) {
      for (var c = 0; c < 3; c++) {
        cells.push({
          x: a.x + c * (cw + gap),
          y: a.y + r * (ch + gap),
          w: cw,
          h: ch
        });
      }
    }
    return cells;
  }

  function polaroidCells() {
    var a = photoArea();
    var gap = 14;
    var cw = (a.w - gap * 2) / 3;
    var ch = (a.h - gap) / 2;
    var cells = [];
    var tilts = [-2.5, 1.5, -1, 2, -1.5, 1];
    for (var r = 0; r < 2; r++) {
      for (var c = 0; c < 3; c++) {
        cells.push({
          x: a.x + c * (cw + gap),
          y: a.y + r * (ch + gap),
          w: cw,
          h: ch,
          tilt: tilts[r * 3 + c]
        });
      }
    }
    return cells;
  }

  // Returns the rects the layout draws, in cell order, plus which cell
  // index is the hero and where the title goes.
  function layoutGeometry(layout) {
    if (layout === 'hero-four') {
      return { rects: heroFourCells(), hero: 0, titleTop: 280 };
    }
    if (layout === 'full-frame') {
      var a = photoArea();
      return { rects: [a], hero: 0, titleTop: 280 };
    }
    if (layout === 'nine-grid') {
      // Title overlaps the centre (hero) cell, below its top-pinned label,
      // so the middle-row labels stay readable and the bottom-row labels
      // are never covered.
      return { rects: nineGridCells(), hero: 4, titleTop: 370 };
    }
    if (layout === 'polaroids') {
      return { rects: polaroidCells(), hero: 1, titleTop: 280 };
    }
    return { rects: mosaicCells(), hero: 1, titleTop: 280 };
  }

  // ---------------------------------------------------------------- render

  function renderCover(ctx, state) {
    var grade = (typeof GRADES !== 'undefined' && GRADES[state.grade]) ? GRADES[state.grade] : GRADES['vice-pink'];
    var geo = layoutGeometry(state.layout);
    var rects = geo.rects;

    ctx.save();
    ctx.fillStyle = grade.bg;
    ctx.fillRect(0, 0, W, H);

    drawQuoteBar(ctx, state, grade);

    // Photos.
    if (state.layout === 'full-frame') {
      var heroCell = state.cells[state.heroIndex || 0];
      drawPhoto(ctx, heroCell.photo, rects[0], heroCell);
    } else if (state.layout === 'nine-grid') {
      // 3x3: the six photos, then the first three again. The repeat rows
      // keep the same face-safe crop (fy 0.3) with a slightly tighter
      // zoom, so every cell still shows a complete face.
      var order = [0, 1, 2, 3, 4, 5, 0, 1, 2];
      for (var i = 0; i < 9; i++) {
        var cell = state.cells[order[i]];
        var variant = Object.assign({}, cell);
        if (i >= 6) {
          variant.fx = 0.5;
          variant.fy = 0.3;
          variant.scale = (cell.scale || 1) * 1.15;
        }
        drawPhoto(ctx, cell.photo, rects[i], variant);
      }
    } else if (state.layout === 'polaroids') {
      for (var p = 0; p < 6; p++) {
        var pc = state.cells[p];
        var pr = rects[p];
        ctx.save();
        ctx.translate(pr.x + pr.w / 2, pr.y + pr.h / 2);
        ctx.rotate((pr.tilt || 0) * Math.PI / 180);
        ctx.fillStyle = '#f7f2e8';
        ctx.fillRect(-pr.w / 2, -pr.h / 2, pr.w, pr.h);
        var photoRect = { x: -pr.w / 2 + 12, y: -pr.h / 2 + 12, w: pr.w - 24, h: pr.h - 66 };
        drawPhoto(ctx, pc.photo, photoRect, pc);
        ctx.fillStyle = '#222222';
        ctx.font = fontAnton(24);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pc.label, 0, pr.h / 2 - 27);
        ctx.restore();
      }
    } else {
      // mosaic / hero-four: one rect per visible cell.
      var visible = state.cells.filter(function (c) { return c.visible !== false; });
      for (var m = 0; m < visible.length && m < rects.length; m++) {
        drawPhoto(ctx, visible[m].photo, rects[m], visible[m]);
      }
    }

    // Role tags (not on polaroids: the caption already carries the label).
    if (state.layout !== 'polaroids') {
      if (state.layout === 'nine-grid') {
        var norder = [0, 1, 2, 3, 4, 5, 0, 1, 2];
        for (var n = 0; n < 9; n++) {
          var nc = state.cells[norder[n]];
          drawTag(ctx, rects[n].x, rects[n].y, nc.label, grade);
        }
      } else if (state.layout === 'full-frame') {
        var fc = state.cells[state.heroIndex || 0];
        drawTag(ctx, rects[0].x, rects[0].y, fc.label, grade);
      } else {
        var vis = state.cells.filter(function (c) { return c.visible !== false; });
        for (var t = 0; t < vis.length && t < rects.length; t++) {
          drawTag(ctx, rects[t].x, rects[t].y, vis[t].label, grade);
        }
      }
    }

    // Hero chrome: VOL. 1 on the hero cell, location strip on the
    // bottom-left cell, gold seal on the bottom-right cell.
    var heroRect = rects[geo.hero];
    if (state.layout === 'nine-grid') heroRect = rects[4];
    if (state.layout === 'full-frame') heroRect = rects[0];
    drawVolPill(ctx, heroRect.x + heroRect.w - 78, heroRect.y + 40, grade);
    var blRect = rects[rects.length - 3] || rects[0];
    if (state.layout === 'hero-four') blRect = rects[3];
    if (state.layout === 'full-frame') blRect = rects[0];
    if (state.layout === 'nine-grid') blRect = rects[6];
    drawLocationStrip(ctx, blRect, state.location, grade);
    var brRect = rects[rects.length - 1];
    drawSeal(ctx, brRect.x + brRect.w - 58, brRect.y + brRect.h - 58, grade);

    // Selection outline: editor only, only after the user picked a cell.
    if (state.showSelection && state.selected != null && state.selected >= 0) {
      var sel = rects[state.selected];
      if (sel) {
        ctx.save();
        ctx.strokeStyle = grade.accent;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(sel.x + 2, sel.y + 2, sel.w - 4, sel.h - 4);
        ctx.restore();
      }
    }

    drawTitleBlock(ctx, state, grade, geo.titleTop);
    drawBilling(ctx, state, grade, 792);
    drawFooter(ctx, state, grade, 962);
    ctx.restore();
  }

  // Render the 1080 cover into any canvas, letterboxed on the grade bg.
  function renderCoverToSize(canvas, state) {
    var ctx = canvas.getContext('2d');
    var grade = (typeof GRADES !== 'undefined' && GRADES[state.grade]) ? GRADES[state.grade] : GRADES['vice-pink'];
    var scale = Math.min(canvas.width / W, canvas.height / H);
    var dw = W * scale;
    var dh = H * scale;
    var ox = (canvas.width - dw) / 2;
    var oy = (canvas.height - dh) / 2;
    ctx.save();
    ctx.fillStyle = grade.bgDeep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    renderCover(ctx, state);
    ctx.restore();
  }

  global.CoverStudio = {
    W: W,
    H: H,
    LAYOUTS: LAYOUTS,
    LAYOUT_LABELS: LAYOUT_LABELS,
    layoutGeometry: layoutGeometry,
    renderCover: renderCover,
    renderCoverToSize: renderCoverToSize
  };
})(typeof window !== 'undefined' ? window : globalThis);
