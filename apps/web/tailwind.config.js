/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Swiss + Claymorphism Palette ──────────────────────
        bg: {
          primary: '#f0eeff',    // soft lavender base
          secondary: '#e8e2ff',  // deeper lavender
          card: '#ffffff',       // pure white cards
          sidebar: '#faf8ff',    // almost white sidebar
        },
        brand: {
          red: '#e63946',        // Swiss bold red
          'red-dark': '#c1121f',
          'red-light': '#ff6b6b',
        },
        clay: {
          blue: '#5b8def',       // clay blue
          'blue-shadow': '#3a6fd4',
          mint: '#36d4a7',       // clay mint
          'mint-shadow': '#1eb88c',
          coral: '#ff6b6b',      // clay coral
          'coral-shadow': '#e84f4f',
          lavender: '#a78bfa',   // clay lavender
          'lavender-shadow': '#7c3aed',
          yellow: '#fbbf24',     // clay yellow
          'yellow-shadow': '#d97706',
          white: '#ffffff',
        },
        text: {
          primary: '#1a1a2e',    // dark charcoal
          secondary: '#4a4a6a',  // medium charcoal
          muted: '#8888a8',      // muted purple-grey
          inverse: '#ffffff',
          red: '#e63946',
        },
        border: {
          subtle: '#ddd6fe',
          medium: '#c4b5fd',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'clay': '20px',
        'clay-lg': '28px',
        'clay-xl': '36px',
        'clay-full': '100px',
      },
      boxShadow: {
        // Claymorphism shadows (key to the puffy 3D look)
        'clay': '0 8px 0 0 rgba(0,0,0,0.12), 0 12px 20px rgba(0,0,0,0.08), inset 0 -4px 0 rgba(0,0,0,0.08)',
        'clay-sm': '0 4px 0 0 rgba(0,0,0,0.10), 0 6px 12px rgba(0,0,0,0.07), inset 0 -2px 0 rgba(0,0,0,0.07)',
        'clay-lg': '0 12px 0 0 rgba(0,0,0,0.14), 0 18px 30px rgba(0,0,0,0.10), inset 0 -6px 0 rgba(0,0,0,0.10)',
        'clay-blue': '0 8px 0 0 #3a6fd4, 0 12px 24px rgba(91,141,239,0.35), inset 0 -4px 0 rgba(0,0,0,0.15)',
        'clay-mint': '0 8px 0 0 #1eb88c, 0 12px 24px rgba(54,212,167,0.35), inset 0 -4px 0 rgba(0,0,0,0.12)',
        'clay-red': '0 8px 0 0 #c1121f, 0 12px 24px rgba(230,57,70,0.35), inset 0 -4px 0 rgba(0,0,0,0.15)',
        'clay-coral': '0 8px 0 0 #e84f4f, 0 12px 24px rgba(255,107,107,0.35), inset 0 -4px 0 rgba(0,0,0,0.12)',
        'clay-lavender': '0 8px 0 0 #7c3aed, 0 12px 24px rgba(167,139,250,0.35), inset 0 -4px 0 rgba(0,0,0,0.12)',
        'clay-yellow': '0 8px 0 0 #d97706, 0 12px 24px rgba(251,191,36,0.35), inset 0 -4px 0 rgba(0,0,0,0.12)',
        'clay-white': '0 8px 0 0 #d0c8f0, 0 12px 24px rgba(0,0,0,0.08), inset 0 -4px 0 rgba(0,0,0,0.06)',
        'clay-hover': '0 4px 0 0 rgba(0,0,0,0.10), 0 6px 16px rgba(0,0,0,0.08)',
        'inner-clay': 'inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'float-delay': 'float 7s ease-in-out 2s infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-clay': 'bounceClay 0.15s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceClay: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(4px)' },
          '100%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
