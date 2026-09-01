/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#020504',
        'surface-darker': '#040907',
        surface: '#060e0a',
        'surface-subtle': '#0a1711',
        'surface-card': '#0c1c15',
        'surface-border': '#133023',
        'surface-border-bright': '#1b4d36',
        terminal: {
          void: '#010403',
          dark: '#050c08',
          card: '#08140e',
          panel: '#0b1c14',
          border: '#112d20',
          'border-glow': '#10b981',
          dim: '#4b7a65',
          text: '#a3e5c7',
          bright: '#00ff66',
        },
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        matrix: {
          50: '#f0fdf4',
          400: '#4ade80',
          500: '#22c55e',
          glow: '#00ff66',
        },
        accent: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          amber: '#f59e0b',
          crimson: '#ef4444',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'terminal-sm': '0 0 10px -2px rgba(16, 185, 129, 0.15)',
        'terminal-md': '0 0 20px -3px rgba(16, 185, 129, 0.2)',
        'terminal-glow': '0 0 25px -2px rgba(0, 255, 102, 0.25)',
        'terminal-crimson': '0 0 20px -3px rgba(239, 68, 68, 0.25)',
      },
      animation: {
        'terminal-blink': 'blink 1s step-start infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
}

