/** @type {import('tailwindcss').Config} */

// Colors are CSS variables (see src/index.css) so the palette lives in one
// place; `<alpha-value>` keeps Tailwind opacity modifiers like bg-accent/10 working.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        card: token('card'),
        raised: token('raised'),
        line: token('line'),
        fg: {
          DEFAULT: token('fg'),
          muted: token('fg-muted'),
          subtle: token('fg-subtle'),
        },
        accent: {
          DEFAULT: token('accent'),
          strong: token('accent-strong'),
          fg: token('accent-fg'),
        },
        danger: token('danger'),
        desktop: token('desktop'),
        title: { DEFAULT: token('title'), to: token('title-to') },
        warn: token('warn'),
        info: token('info'),
      },
      fontFamily: {
        // Retro desktop: a Windows-9x-like UI font for text, a pixel font for titles and menus.
        sans: ['Tahoma', 'Verdana', 'Segoe UI', 'sans-serif'],
        pixel: ['Pixelify Sans', 'Tahoma', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'progress-sweep': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
      },
    },
  },
  plugins: [],
};
