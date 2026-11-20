/* main.js — editor wiring for Neon Shore.
 * Owns the state, the controls, photo upload, canvas drag/zoom,
 * the ?shot=cover / ?shot=editor scenes, and PNG export. */
(function () {
  "use strict";

  var SAMPLES = [
    { id: "boulevard", name: "Boulevard", src: "samples/boulevard.jpg" },
    { id: "pier", name: "Pier", src: "samples/pier.jpg" },
  ];

  var SIZES = {
    "1080x1080": [1080, 1080],
    "1080x1350": [1080, 1350],
    "1920x1080": [1920, 1080],
  };

  var state = {
    layout: "hero",
    grade: "sunset",
    caption: "NEON SHORE",
    subcaption: "a sunset heist story",
    captionSize: 1,
    captionY: 0.8,
    photos: [],
    cells: [],
    effects: { grain: true, vignette: true, halftone: false, badge: true },
    exportSize: "1080x1080",
  };

  var selectedCell = 0;
  var canvas = null;
  var drag = null;
  var shotMode = null;

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  function ensureCells() {
    var want = window.CoverEngine.LAYOUTS[state.layout].cells;
    while (state.cells.length < want) {
      state.cells.push({
        photo: state.cells.length % Math.max(1, state.photos.length),
        ox: 0,
        oy: 0,
        zoom: 1,
      });
    }
    state.cells.length = want;
    if (selectedCell >= want) selectedCell = want - 1;
  }

  function render() {
    ensureCells();
    var dims = SIZES[state.exportSize];
    var scale = Math.min(1, 720 / Math.max(dims[0], dims[1]));
    var pw = Math.round(dims[0] * scale);
    var ph = Math.round(dims[1] * scale);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    window.CoverEngine.renderCover(canvas, state);
    drawSelection();
  }

  function drawSelection() {
    if (shotMode === "cover") return;
    var cells = window.CoverEngine.renderCover.lastCells;
    if (!cells || !cells[selectedCell]) return;
    var c = cells[selectedCell];
    var ctx = canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = "#ff2e88";
    ctx.lineWidth = Math.max(2, canvas.width / 360);
    ctx.setLineDash([10, 6]);
    if (c.rot) {
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
      ctx.rotate(c.rot);
      ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    } else {
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
    ctx.restore();
  }

  function thumbSrc(photo) {
    if (photo.img.src && photo.img.src.indexOf("data:") === 0) return photo.img.src;
    var found = null;
    for (var i = 0; i < SAMPLES.length; i++) {
      if (SAMPLES[i].id === photo.id) found = SAMPLES[i].src;
    }
    return found || photo.img.src;
  }

  function buildThumbs() {
    var box = $("thumbs");
    box.innerHTML = "";
    var inUse = {};
    for (var i = 0; i < state.cells.length; i++) {
      inUse[state.cells[i].photo] = true;
    }
    state.photos.forEach(function (photo, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.title = photo.name || ("Photo " + (idx + 1));
      if (inUse[idx]) b.className = "in-use";
      var im = document.createElement("img");
      im.src = thumbSrc(photo);
      im.alt = photo.name || ("Photo " + (idx + 1));
      b.appendChild(im);
      b.addEventListener("click", function () {
        ensureCells();
        state.cells[selectedCell].photo = idx;
        state.cells[selectedCell].ox = 0;
        state.cells[selectedCell].oy = 0;
        state.cells[selectedCell].zoom = 1;
        buildThumbs();
        render();
      });
      box.appendChild(b);
    });
  }

  function markActive(containerId, value) {
    var box = $(containerId);
    var btns = box.querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle("active", btns[i].dataset.value === value);
    }
  }

  function buildButtons() {
    var layouts = $("layouts");
    Object.keys(window.CoverEngine.LAYOUTS).forEach(function (key) {
      var meta = window.CoverEngine.LAYOUTS[key];
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.value = key;
      b.innerHTML = meta.label + "<small>" + meta.blurb + "</small>";
      b.addEventListener("click", function () {
        state.layout = key;
        ensureCells();
        markActive("layouts", key);
        render();
      });
      layouts.appendChild(b);
    });

    var grades = $("grades");
    Object.keys(window.CoverGrades.GRADES).forEach(function (key) {
      var g = window.CoverGrades.GRADES[key];
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.value = key;
      b.innerHTML = g.label + "<small>" + g.hint + "</small>";
      b.addEventListener("click", function () {
        state.grade = key;
        markActive("grades", key);
        render();
      });
      grades.appendChild(b);
    });

    var sizes = $("sizes");
    Object.keys(SIZES).forEach(function (key) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.value = key;
      b.textContent = key.replace("x", " × ");
      b.addEventListener("click", function () {
        state.exportSize = key;
        markActive("sizes", key);
        render();
      });
      sizes.appendChild(b);
    });

    markActive("layouts", state.layout);
    markActive("grades", state.grade);
    markActive("sizes", state.exportSize);
  }

  function bindControls() {
    $("caption").addEventListener("input", function (e) {
      state.caption = e.target.value;
      render();
    });
    $("subcaption").addEventListener("input", function (e) {
      state.subcaption = e.target.value;
      render();
    });
    $("capSize").addEventListener("input", function (e) {
      state.captionSize = parseFloat(e.target.value) || 1;
      render();
    });
    $("fxGrain").addEventListener("change", function (e) {
      state.effects.grain = e.target.checked;
      render();
    });
    $("fxVignette").addEventListener("change", function (e) {
      state.effects.vignette = e.target.checked;
      render();
    });
    $("fxHalftone").addEventListener("change", function (e) {
      state.effects.halftone = e.target.checked;
      render();
    });
    $("fxBadge").addEventListener("change", function (e) {
      state.effects.badge = e.target.checked;
      render();
    });
    $("resetPos").addEventListener("click", function () {
      state.cells.forEach(function (s) {
        s.ox = 0;
        s.oy = 0;
        s.zoom = 1;
      });
      render();
    });
    $("download").addEventListener("click", exportPng);

    var sampleBtns = document.querySelectorAll("[data-sample]");
    for (var i = 0; i < sampleBtns.length; i++) {
      sampleBtns[i].addEventListener("click", function (e) {
        var id = e.currentTarget.dataset.sample;
        var idx = -1;
        for (var j = 0; j < state.photos.length; j++) {
          if (state.photos[j].id === id) idx = j;
        }
        if (idx < 0) return;
        ensureCells();
        state.cells[selectedCell].photo = idx;
        state.cells[selectedCell].ox = 0;
        state.cells[selectedCell].oy = 0;
        state.cells[selectedCell].zoom = 1;
        buildThumbs();
        render();
      });
    }

    $("upload").addEventListener("change", function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      files.forEach(function (f) {
        if (!f.type || f.type.indexOf("image/") !== 0) return;
        var rd = new FileReader();
        rd.onload = function () {
          loadImage(rd.result).then(function (img) {
            state.photos.push({
              id: "up-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
              img: img,
              name: f.name,
            });
            buildThumbs();
            render();
          });
        };
        rd.readAsDataURL(f);
      });
      e.target.value = "";
    });

    canvas.addEventListener("pointerdown", function (e) {
      if (shotMode === "cover") return;
      var p = canvasPoint(e);
      var idx = window.CoverEngine.cellAtPoint(p.x, p.y);
      if (idx < 0) return;
      selectedCell = idx;
      var slot = state.cells[idx];
      drag = {
        x: p.x,
        y: p.y,
        ox: slot.ox || 0,
        oy: slot.oy || 0,
        cell: idx,
      };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        /* pointer capture is best-effort */
      }
      render();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var p = canvasPoint(e);
      var cells = window.CoverEngine.renderCover.lastCells;
      if (!cells || !cells[drag.cell]) return;
      var c = cells[drag.cell];
      var slot = state.cells[drag.cell];
      slot.ox = clamp(drag.ox + ((p.x - drag.x) / c.w) * 2, -1, 1);
      slot.oy = clamp(drag.oy + ((p.y - drag.y) / c.h) * 2, -1, 1);
      render();
    });
    function endDrag() {
      drag = null;
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener(
      "wheel",
      function (e) {
        if (shotMode === "cover") return;
        e.preventDefault();
        var p = canvasPoint(e);
        var idx = window.CoverEngine.cellAtPoint(p.x, p.y);
        if (idx < 0) return;
        var slot = state.cells[idx];
        var z = slot.zoom || 1;
        slot.zoom = clamp(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08), 1, 3);
        render();
      },
      { passive: false }
    );
  }

  function canvasPoint(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  function exportPng() {
    var dims = SIZES[state.exportSize];
    var off = document.createElement("canvas");
    off.width = dims[0];
    off.height = dims[1];
    window.CoverEngine.renderCover(off, state);
    off.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "neon-shore-cover-" + state.exportSize + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 5000);
    }, "image/png");
  }

  function init() {
    canvas = $("cover");
    buildButtons();
    bindControls();

    var params = new URLSearchParams(location.search);
    shotMode = params.get("shot");
    var wantPhoto = params.get("photo");
    var wantCaption = params.get("caption");
    if (wantCaption) {
      state.caption = wantCaption;
      $("caption").value = wantCaption;
    }

    Promise.all(
      SAMPLES.map(function (s) {
        return loadImage(s.src);
      })
    )
      .then(function (imgs) {
        imgs.forEach(function (img, i) {
          state.photos.push({ id: SAMPLES[i].id, img: img, name: SAMPLES[i].name });
        });
        if (wantPhoto) {
          var idx = -1;
          for (var j = 0; j < state.photos.length; j++) {
            if (state.photos[j].id === wantPhoto) idx = j;
          }
          if (idx >= 0) {
            ensureCells();
            state.cells.forEach(function (s) {
              s.photo = idx;
            });
          }
        }
        if (shotMode === "cover") {
          document.body.classList.add("shot-cover");
          state.exportSize = "1080x1080";
        }
        buildThumbs();
        render();
        // Re-render once the display fonts arrive so the caption
        // switches from the fallback face to Anton / Pacifico.
        if (document.fonts && document.fonts.load) {
          Promise.all([
            document.fonts.load('100px "Anton"'),
            document.fonts.load('40px "Pacifico"'),
          ])
            .catch(function () {})
            .then(function () {
              render();
            });
        }
      })
      .catch(function () {
        // Samples failed to load (e.g. opened from a bare file path):
        // the editor still works with user uploads.
        render();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
