// Neon Tide Cover Studio — colour grades.
// Four grades. Each grade carries the cover background, the panel colour,
// the chrome title gradient stops, the accent (gold) colour, the muted
// footer colour and the quote-bar rule colour. Vice Pink is the default.

const GRADES = {
  'vice-pink': {
    label: 'Vice Pink',
    bg: '#2b0a4e',
    bgDeep: '#1d0636',
    panel: '#3a1166',
    titleStops: ['#ffd94d', '#ff7ad0', '#ff2e88', '#ff7ad0', '#ffd94d'],
    accent: '#f5c542',
    accentSoft: '#e8b23a',
    ink: '#ffffff',
    muted: '#8f7fb8',
    rule: '#f5c542',
    tag: '#ffd94d',
    seal: '#ff2e88',
    sealInk: '#ffffff'
  },
  'sunset': {
    label: 'Sunset',
    bg: '#3a0f2e',
    bgDeep: '#260818',
    panel: '#4d1538',
    titleStops: ['#ffe066', '#ff9e4d', '#ff4d6d', '#ff9e4d', '#ffe066'],
    accent: '#ffb347',
    accentSoft: '#e89b3a',
    ink: '#ffffff',
    muted: '#a87f9a',
    rule: '#ffb347',
    tag: '#ffe066',
    seal: '#ff4d6d',
    sealInk: '#ffffff'
  },
  'neon-night': {
    label: 'Neon Night',
    bg: '#0a1030',
    bgDeep: '#05081f',
    panel: '#141c48',
    titleStops: ['#5ef2ff', '#b45cff', '#ff2e9e', '#b45cff', '#5ef2ff'],
    accent: '#39d5ff',
    accentSoft: '#2fb3e0',
    ink: '#ffffff',
    muted: '#7d86c4',
    rule: '#39d5ff',
    tag: '#5ef2ff',
    seal: '#ff2e9e',
    sealInk: '#ffffff'
  },
  'golden-hour': {
    label: 'Golden Hour',
    bg: '#2e1a05',
    bgDeep: '#1d1002',
    panel: '#40260a',
    titleStops: ['#fff3a0', '#ffcf5c', '#ff8a2a', '#ffcf5c', '#fff3a0'],
    accent: '#ffcf5c',
    accentSoft: '#e0aa3a',
    ink: '#ffffff',
    muted: '#a8906a',
    rule: '#ffcf5c',
    tag: '#fff3a0',
    seal: '#ff8a2a',
    sealInk: '#ffffff'
  }
};

const GRADE_ORDER = ['vice-pink', 'sunset', 'neon-night', 'golden-hour'];
const DEFAULT_GRADE = 'vice-pink';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GRADES, GRADE_ORDER, DEFAULT_GRADE };
}
