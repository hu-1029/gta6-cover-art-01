// Neon Tide Cover Studio — editor wiring.
// Loads the six photos, holds the two presets, wires the layout / grade /
// copy controls, per-cell drag + wheel cropping, photo upload, ?shot
// scenes and the three PNG exports. All paths are absolute from the app
// directory; the page itself is served offline from the repo.

(function () {
  'use strict';

  var PHOTOS = [
    { src: 'samples/pier.jpg', label: 'THE CAPTAIN', fx: 0.42, fy: 0.22 },
    { src: 'samples/boulevard.jpg', label: 'THE DRIVER', fx: 0.5, fy: 0.22 },
    { src: 'samples/cast-redhead.jpg', label: 'THE FIXER', fx: 0.5, fy: 0.3 },
    { src: 'samples/cast-curly.jpg', label: 'THE LOOKOUT', fx: 0.5, fy: 0.3 },
    { src: 'samples/cast-elder.jpg', label: 'THE BOSS', fx: 0.5, fy: 0.3 },
    { src: 'samples/cast-youngman.jpg', label: 'THE INSIDER', fx: 0.5, fy: 0.3 }
  ];

  // Grid order is row-major: [top-left, top-centre (hero), top-right,
  // bottom-left, bottom-centre, bottom-right]. hero is the grid position
  // of the hero cell (1 for both presets: the centre of the top row).
  var PRESETS = {
    'neon-tide': {
      title: 'NEON TIDE',
      subtitle: 'chasing the last light',
      tagline: 'EVERY SUNSET HAS A PRICE',
      quote: 'A SUNSET WITH TEETH.',
      source: 'THE SHORELINE POST',
      location: 'NEON SHORE · 7:15 PM',
      order: [1, 0, 2, 3, 4, 5],
      hero: 1
    },
    'midnight-mile': {
      title: 'MIDNIGHT MILE',
      subtitle: 'the city never blinks',
      tagline: 'FOUR LANES · NO BRAKES',
      quote: 'FASTER THAN THE RUMOUR.',
      source: 'THE BOULEVARD GAZETTE',
      location: 'BOULEVARD · 11:48 PM',
      order: [0, 1, 3, 2, 5, 4],
      hero: 1
    }
  };

  var state = {
    preset: 'neon-tide',
    layout: 'mosaic',
    grade: 'vice-pink',
    title: '',
    subtitle: '',
    tagline: '',
    quote: '',
    source: '',
    location: '',
    cells: [],
    heroIndex: 1,
    selected: -1,
    showSelection: false
  };

  var images = {};
  var canvas;
  var ctx;
  var ready = false;

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function buildCells() {
    var preset = PRESETS[state.preset];
    var order = preset.order.slice();
    if (state.layout === 'hero-four') {
      // Hero first so the big hero rect shows the hero photo.
      var heroPhoto = order.splice(preset.hero, 1)[0];
      order.unshift(heroPhoto);
    }
    state.cells = order.map(function (pi) {
      var p = PHOTOS[pi];
      return {
        photo: images[p.src],
        label: p.label,
        fx: p.fx,
        fy: p.fy,
        scale: 1,
        dx: 0,
        dy: 0,
        visible: true
      };
    });
    state.heroIndex = preset.hero;
    if (state.layout === 'hero-four') state.heroIndex = 0;
    state.selected = -1;
    state.showSelection = false;
  }

  function applyPreset(name) {
    state.preset = name;
    var p = PRESETS[name];
    state.title = p.title;
    state.subtitle = p.subtitle;
    state.tagline = p.tagline;
    state.quote = p.quote;
    state.source = p.source;
    state.location = p.location;
    buildCells();
    syncInputs();
    render();
  }

  function syncInputs() {
    var set = function (id, v) {
      var el = document.getElementById(id);
      if (el) el.value = v;
    };
    set('copyTitle', state.title);
    set('copySubtitle', state.subtitle);
    set('copyTagline', state.tagline);
    set('copyQuote', state.quote);
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-preset') === state.preset);
    });
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-layout') === state.layout);
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-grade') === state.grade);
    });
  }

  function render() {
    if (!canvas || !ready) return;
    CoverStudio.renderCover(ctx, state);
    window.__coverReady = true;
  }

  function cellRects() {
    return CoverStudio.layoutGeometry(state.layout).rects;
  }

  function canvasPoint(evt) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (canvas.width / r.width),
      y: (evt.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function hitCell(pt) {
    var rects = cellRects();
    var visible = state.cells.filter(function (c) { return c.visible !== false; });
    for (var i = rects.length - 1; i >= 0; i--) {
      var rc = rects[i];
      if (i >= visible.length) continue;
      if (pt.x >= rc.x && pt.x <= rc.x + rc.w && pt.y >= rc.y && pt.y <= rc.y + rc.h) return i;
    }
    return -1;
  }

  function bindCanvas() {
    var dragging = false;
    var last = null;
    canvas.addEventListener('pointerdown', function (evt) {
      var pt = canvasPoint(evt);
      var idx = hitCell(pt);
      if (idx >= 0) {
        state.selected = idx;
        state.showSelection = true;
        dragging = true;
        last = pt;
        canvas.setPointerCapture(evt.pointerId);
        render();
      }
    });
    canvas.addEventListener('pointermove', function (evt) {
      if (!dragging || state.selected < 0) return;
      var pt = canvasPoint(evt);
      var cell = state.cells[state.selected];
      if (!cell) return;
      var rects = cellRects();
      var scale = canvas.width / canvas.getBoundingClientRect().width;
      cell.dx += (pt.x - last.x);
      cell.dy += (pt.y - last.y);
      last = pt;
      render();
    });
    canvas.addEventListener('pointerup', function () {
      dragging = false;
    });
    canvas.addEventListener('wheel', function (evt) {
      evt.preventDefault();
      var pt = canvasPoint(evt);
      var idx = hitCell(pt);
      if (idx < 0) return;
      state.selected = idx;
      state.showSelection = true;
      var cell = state.cells[idx];
      var factor = evt.deltaY < 0 ? 1.08 : 1 / 1.08;
      cell.scale = Math.min(3, Math.max(1, (cell.scale || 1) * factor));
      render();
    }, { passive: false });
  }

  function exportPNG(w, h) {
    var off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    CoverStudio.renderCoverToSize(off, state);
    var slug = state.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    off.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = slug + '-' + w + 'x' + h + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }, 'image/png');
  }

  function bindControls() {
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () { applyPreset(b.getAttribute('data-preset')); });
    });
    document.querySelectorAll('[data-layout]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.layout = b.getAttribute('data-layout');
        buildCells();
        syncInputs();
        render();
      });
    });
    document.querySelectorAll('[data-grade]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.grade = b.getAttribute('data-grade');
        syncInputs();
        render();
      });
    });
    var bindText = function (id, key) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        state[key] = el.value;
        render();
      });
    };
    bindText('copyTitle', 'title');
    bindText('copySubtitle', 'subtitle');
    bindText('copyTagline', 'tagline');
    bindText('copyQuote', 'quote');
    var up = document.getElementById('uploadInput');
    if (up) {
      up.addEventListener('change', function () {
        var file = up.files && up.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            var idx = state.selected >= 0 ? state.selected : 0;
            var cell = state.cells[idx];
            if (cell) {
              cell.photo = img;
              cell.fx = 0.5;
              cell.fy = 0.3;
              cell.scale = 1;
              cell.dx = 0;
              cell.dy = 0;
              render();
            }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }
    var ex = function (id, w, h) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { exportPNG(w, h); });
    };
    ex('export1080', 1080, 1080);
    ex('export1350', 1080, 1350);
    ex('export1920', 1920, 1080);
  }

  function applyShot() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    if (shot === 'cover2') {
      applyPreset('midnight-mile');
    } else if (shot === 'cover') {
      applyPreset('neon-tide');
    }
    var layout = q.get('layout');
    if (layout && CoverStudio.LAYOUTS.indexOf(layout) >= 0) {
      state.layout = layout;
      buildCells();
    }
    var grade = q.get('grade');
    if (grade && GRADES[grade]) {
      state.grade = grade;
    }
    if (shot === 'cover' || shot === 'cover2') {
      document.body.classList.add('cover-only');
      state.showSelection = false;
    }
    syncInputs();
  }

  async function init() {
    canvas = document.getElementById('coverCanvas');
    ctx = canvas.getContext('2d');
    var loads = PHOTOS.map(function (p) {
      return loadImage(p.src).then(function (img) { images[p.src] = img; });
    });
    await Promise.all(loads);
    try { await document.fonts.ready; } catch (e) { /* fonts may already be ready */ }
    applyPreset('neon-tide');
    applyShot();
    bindControls();
    bindCanvas();
    ready = true;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
