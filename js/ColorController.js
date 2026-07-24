/**
 * ColorController.js
 * -----------------------------------------------------------------------
 * Manages color themes and color transitions for the hologram project.
 * Allows switching themes at runtime (Cyan, Blue, Purple, Green, Red).
 * -----------------------------------------------------------------------
 */

export const Themes = {
  cyan: {
    primary: '#00E5FF',
    secondary: '#74F9FF',
    highlight: '#C8FFFF',
    glow: 'rgba(0, 229, 255, 0.18)',
  },
  blue: {
    primary: '#2979FF',
    secondary: '#82B1FF',
    highlight: '#E3F2FD',
    glow: 'rgba(41, 121, 255, 0.18)',
  },
  purple: {
    primary: '#D500F9',
    secondary: '#E040FB',
    highlight: '#F3E5F5',
    glow: 'rgba(213, 0, 249, 0.18)',
  },
  green: {
    primary: '#00E676',
    secondary: '#69F0AE',
    highlight: '#E8F5E9',
    glow: 'rgba(0, 230, 118, 0.18)',
  },
  red: {
    primary: '#FF1744',
    secondary: '#FF5252',
    highlight: '#FFEBEE',
    glow: 'rgba(255, 23, 68, 0.18)',
  },
};

export class ColorController {
  constructor(defaultTheme = 'cyan') {
    this.currentThemeName = defaultTheme;
  }

  setTheme(themeName) {
    if (Themes[themeName]) {
      this.currentThemeName = themeName;
    }
  }

  getTheme() {
    return Themes[this.currentThemeName];
  }

  getThemeName() {
    return this.currentThemeName;
  }
}
