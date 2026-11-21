// Colour grades for Neon Tide Cover Studio.
// Each grade is a full palette: the cover background, the panel ink, the
// cream body text, the gold accent, the pink badge colour, and the stops of
// the striped chrome title gradient (top to bottom).

export const GRADES = {
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    bg: '#0d0a1a',
    panel: '#17102e',
    ink: '#f5eeda',
    cream: '#fff3d6',
    gold: '#ffd21f',
    goldDim: '#c9a227',
    pink: '#ff2e7e',
    titleStops: ['#ffe95c', '#ffc21f', '#ff8a1f', '#ff5e3a', '#ff2e7e'],
    scrim: 'rgba(13, 10, 26, 0.72)',
  },
  neon: {
    id: 'neon',
    label: 'Neon Night',
    bg: '#070312',
    panel: '#120a2a',
    ink: '#eaf6ff',
    cream: '#dff4ff',
    gold: '#7df9ff',
    goldDim: '#3fb8c9',
    pink: '#ff2ed1',
    titleStops: ['#a5f3ff', '#5ee6ff', '#38b6ff', '#7a5cff', '#ff2ed1'],
    scrim: 'rgba(7, 3, 18, 0.72)',
  },
  golden: {
    id: 'golden',
    label: 'Golden Hour',
    bg: '#120b02',
    panel: '#221503',
    ink: '#fdf3d8',
    cream: '#ffedb8',
    gold: '#ffc93c',
    goldDim: '#c9962a',
    pink: '#ff7a1a',
    titleStops: ['#ffe9a3', '#ffd23c', '#ffae1f', '#ff8a1f', '#ff6a1a'],
    scrim: 'rgba(18, 11, 2, 0.72)',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
