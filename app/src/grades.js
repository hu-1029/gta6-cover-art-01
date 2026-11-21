// Colour grades for Neon Tide — Cover Studio.
// Each grade is a full poster palette: the render engine (cover.js) reads
// only these values, so a grade change never touches layout code.

export const GRADES = {
  sunset: {
    id: "sunset",
    label: "Sunset",
    // Poster ground: deep violet-black, slightly warm.
    bg: "#120a1e",
    bg2: "#0a0614",
    // Ink for the big copy blocks.
    ink: "#f6ead2",
    dimInk: "#c9b8a3",
    // Gold used for the tagline, rules, VOL. 1 pill and label chips.
    gold: "#f2c230",
    goldDeep: "#d99a16",
    // The striped chrome title: yellow -> orange -> hot pink.
    titleStops: ["#ffd23f", "#ff8a1e", "#ff2e88"],
    titleStripe: "rgba(255,255,255,0.16)",
    // Pacifico subtitle and quote text stay warm white.
    script: "#fff7e8",
    quote: "#f6ead2",
    star: "#f2c230",
    starEmpty: "#5a4a2a",
    // Starburst badge and the NS mark.
    badge: "#ff2e88",
    badgeInk: "#ffffff",
    // Small-cell label chips.
    chipBg: "rgba(8,4,18,0.88)",
    chipInk: "#ffffff",
    chipEdge: "#f2c230",
    // Place/time strip.
    stripBg: "rgba(8,4,18,0.88)",
    stripInk: "#ffffff",
    // Barcode block.
    barcodeBg: "#ffffff",
    barcodeInk: "#111111",
    // Grain + vignette strength.
    grain: 0.05,
    vignette: 0.28,
  },
  neon: {
    id: "neon",
    label: "Neon Night",
    bg: "#070312",
    bg2: "#03010a",
    ink: "#eaf6ff",
    dimInk: "#9fb6cc",
    gold: "#ffe600",
    goldDeep: "#c8b400",
    titleStops: ["#ffe600", "#ff5e00", "#ff2ea6"],
    titleStripe: "rgba(255,255,255,0.20)",
    script: "#ffffff",
    quote: "#eaf6ff",
    star: "#ffe600",
    starEmpty: "#3d3a55",
    badge: "#ff2ea6",
    badgeInk: "#ffffff",
    chipBg: "rgba(4,2,16,0.88)",
    chipInk: "#ffffff",
    chipEdge: "#ffe600",
    stripBg: "rgba(4,2,16,0.88)",
    stripInk: "#ffffff",
    barcodeBg: "#ffffff",
    barcodeInk: "#111111",
    grain: 0.06,
    vignette: 0.34,
  },
  golden: {
    id: "golden",
    label: "Golden Hour",
    bg: "#1a1206",
    bg2: "#0f0a03",
    ink: "#fff3d6",
    dimInk: "#d8c49a",
    gold: "#ffd76a",
    goldDeep: "#e0a92e",
    titleStops: ["#ffe08a", "#ff9a3d", "#ff5e7a"],
    titleStripe: "rgba(255,255,255,0.14)",
    script: "#fffaf0",
    quote: "#fff3d6",
    star: "#ffd76a",
    starEmpty: "#6b5426",
    badge: "#ff5e7a",
    badgeInk: "#ffffff",
    chipBg: "rgba(12,8,2,0.88)",
    chipInk: "#ffffff",
    chipEdge: "#ffd76a",
    stripBg: "rgba(12,8,2,0.88)",
    stripInk: "#ffffff",
    barcodeBg: "#ffffff",
    barcodeInk: "#111111",
    grain: 0.04,
    vignette: 0.24,
  },
};

export const GRADE_ORDER = ["sunset", "neon", "golden"];

export function gradeById(id) {
  return GRADES[id] || GRADES.sunset;
}
