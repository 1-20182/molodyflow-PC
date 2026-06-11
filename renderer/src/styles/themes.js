export const themes = {
  dark: {
    '--bg-primary': '#1A1A2E',
    '--bg-secondary': '#16213E',
    '--text-primary': '#FFFFFF',
    '--text-secondary': 'rgba(255,255,255,0.7)',
    '--glass-bg': 'rgba(255,255,255,0.08)',
    '--glass-border': 'rgba(255,255,255,0.12)',
  },
  light: {
    '--bg-primary': '#F5F5F7',
    '--bg-secondary': '#FFFFFF',
    '--text-primary': '#1A1A2E',
    '--text-secondary': 'rgba(0,0,0,0.6)',
    '--glass-bg': 'rgba(255,255,255,0.5)',
    '--glass-border': 'rgba(0,0,0,0.08)',
  },
};

export const EQ_PRESETS = {
  Normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Pop: [3, 2, 1, -1, -1, 0, 2, 3, 4, 3],
  Rock: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4],
  Jazz: [3, 2, 1, 0, 0, 1, 2, 3, 2, 1],
  Classical: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
  'Bass Boost': [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
};

export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
