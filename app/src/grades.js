// Colour grades for Neon Tide: four looks, one cover.
// Each grade carries the page background, the gold ink, the pink accent,
// the title gradient stops, the photo tint and the scrim used over photos.
// Vice Pink is the default: the hot magenta-purple sunset the top covers use.
export const GRADES = {
  vice: {
    id: 'vice',
    label: 'Vice Pink',
    bg: '#1a0520',
    panel: '#2a0a30',
    gold: '#ffc93c',
    goldDeep: '#ff9d2e',
    pink: '#ff2e88',
    ink: '#fff0f5',
    dim: '#b08bb0',
    titleStops: ['#ffe45c', '#ff9de2', '#ff2e88', '#b44dff'],
    tint: '#ff2e88',
    tintAlpha: 0.12,
    scrim: 'rgba(26,5,32,0.88)',
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    bg: '#120e24',
    panel: '#1b1436',
    gold: '#ffc93c',
    goldDeep: '#ff9d2e',
    pink: '#ff2e88',
    ink: '#f5efdf',
    dim: '#8f86a8',
    titleStops: ['#ffe45c', '#ffb52e', '#ff7a2e', '#ff2e7e'],
    tint: '#ff7a2e',
    tintAlpha: 0.10,
    scrim: 'rgba(10,6,24,0.88)',
  },
  neon: {
    id: 'neon',
    label: 'Neon Night',
    bg: '#070418',
    panel: '#120a30',
    gold: '#2ee6ff',
    goldDeep: '#7a5cff',
    pink: '#ff2ee6',
    ink: '#eef6ff',
    dim: '#7f8fc9',
    titleStops: ['#8ef6ff', '#2ee6ff', '#7a5cff', '#ff2ee6'],
    tint: '#3a2eff',
    tintAlpha: 0.14,
    scrim: 'rgba(4,2,20,0.88)',
  },
  golden: {
    id: 'golden',
    label: 'Golden Hour',
    bg: '#1a1206',
    panel: '#2a1e08',
    gold: '#ffd76a',
    goldDeep: '#e8a13a',
    pink: '#ff5c3a',
    ink: '#fff6e0',
    dim: '#a89a78',
    titleStops: ['#ffedb0', '#ffd76a', '#f5a83c', '#ff5c3a'],
    tint: '#ffb52e',
    tintAlpha: 0.12,
    scrim: 'rgba(24,16,4,0.88)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);

export function gradeById(id) {
  return GRADES[id] || GRADES.vice;
}
