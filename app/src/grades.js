// Neon Shore — colour grades.
//
// A grade is a look painted over every photo on the cover: a canvas filter
// for contrast and saturation, plus a tint wash in the grade's own palette.
// The three grades share one shape, so the editor can swap them without
// touching the render code.

const GRADES = {
  sunset: {
    name: "Sunset",
    blurb: "Warm orange to pink",
    filter: "saturate(1.30) contrast(1.08) brightness(1.03)",
    wash: ["rgba(255, 122, 24, 0.16)", "rgba(255, 41, 117, 0.20)"],
  },
  neon: {
    name: "Neon Night",
    blurb: "Teal shadows, magenta highs",
    filter: "saturate(1.35) contrast(1.12) brightness(0.98)",
    wash: ["rgba(0, 229, 255, 0.15)", "rgba(255, 41, 117, 0.24)"],
  },
  golden: {
    name: "Golden Hour",
    blurb: "Warm gold all over",
    filter: "saturate(1.20) contrast(1.05) brightness(1.06) sepia(0.22)",
    wash: ["rgba(255, 190, 60, 0.16)", "rgba(255, 120, 40, 0.18)"],
  },
};

function gradeIds() {
  return Object.keys(GRADES);
}

function gradeOf(id) {
  return GRADES[id] || GRADES.sunset;
}

// The canvas filter string for a grade, applied while the photo is drawn.
function gradeFilter(id) {
  return gradeOf(id).filter;
}

// Paint a grade's tint over a rectangle that already holds a photo.
// The wash runs top to bottom, so skies go warm and shadows go pink.
function paintGradeWash(ctx, x, y, w, h, id) {
  const grade = gradeOf(id);
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
