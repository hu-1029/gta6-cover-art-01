/* grades.js — colour grades for the cover art studio.
 * Each grade is a duotone lookup: the photo's luminance is remapped
 * through a small palette, then blended back with the original colour
 * so faces and detail survive. All palettes are invented here. */
(function () {
  "use strict";

  var GRADES = {
    sunset: {
      label: "Sunset",
      hint: "Warm orange to pink",
      stops: [
        [0.0, "#1d0b33"],
        [0.3, "#6e1b4e"],
        [0.6, "#e8542f"],
        [0.85, "#ff9a5c"],
        [1.0, "#ffd98a"],
      ],
      wash: ["#ff5e3a", "#ff2e88"],
      washAlpha: 0.16,
      keep: 0.22,
    },
    neon: {
      label: "Neon Night",
      hint: "Teal shadows, magenta highs",
      stops: [
        [0.0, "#020d24"],
        [0.3, "#0b3d5c"],
        [0.6, "#0e7c86"],
        [0.85, "#ff4fd8"],
        [1.0, "#ffe9fb"],
      ],
      wash: ["#00e5ff", "#ff2ec4"],
      washAlpha: 0.15,
      keep: 0.22,
    },
    golden: {
      label: "Golden Hour",
      hint: "Warm gold all over",
      stops: [
        [0.0, "#241708"],
        [0.3, "#5c3a0e"],
        [0.6, "#b97e1e"],
        [0.85, "#f2b64c"],
        [1.0, "#ffe9a8"],
      ],
      wash: ["#ffb347", "#ffdf8a"],
      washAlpha: 0.14,
      keep: 0.28,
    },
  };

  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Build a 256-entry lookup table mapping luminance -> [r, g, b].
  function buildLut(stops) {
    var rgb = stops.map(function (s) {
      return { at: s[0], c: hexRgb(s[1]) };
    });
    var lut = new Array(256);
    for (var i = 0; i < 256; i++) {
      var t = i / 255;
      var j = 0;
      while (j < rgb.length - 2 && t > rgb[j + 1].at) j++;
      var a = rgb[j];
      var b = rgb[j + 1];
      var span = b.at - a.at || 1;
      var f = Math.max(0, Math.min(1, (t - a.at) / span));
      lut[i] = [
        lerp(a.c[0], b.c[0], f),
        lerp(a.c[1], b.c[1], f),
        lerp(a.c[2], b.c[2], f),
      ];
    }
    return lut;
  }

  // Grade an image into a fresh canvas, capped at maxDim on the long edge.
  // Returns the canvas; the caller draws crops of it into the cover.
  function gradeImage(img, gradeKey, maxDim) {
    var g = GRADES[gradeKey] || GRADES.sunset;
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, (maxDim || 720) / Math.max(w, h));
    var cw = Math.max(2, Math.round(w * scale));
    var ch = Math.max(2, Math.round(h * scale));
    var cv = document.createElement("canvas");
    cv.width = cw;
    cv.height = ch;
    var ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cw, ch);
    var data;
    try {
      data = ctx.getImageData(0, 0, cw, ch);
    } catch (e) {
      return cv; // cross-origin or tainted: fall back to the raw photo
    }
    var px = data.data;
    var lut = buildLut(g.stops);
    var keep = g.keep;
    for (var i = 0; i < px.length; i += 4) {
      var r = px[i];
      var gg = px[i + 1];
      var b = px[i + 2];
      var lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) | 0;
      var m = lut[lum];
      px[i] = r * keep + m[0] * (1 - keep);
      px[i + 1] = gg * keep + m[1] * (1 - keep);
      px[i + 2] = b * keep + m[2] * (1 - keep);
    }
    ctx.putImageData(data, 0, 0);
    return cv;
  }

  window.CoverGrades = {
    GRADES: GRADES,
    gradeImage: gradeImage,
  };
})();
