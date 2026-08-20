/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette from reference screenshots
        bg: {
          primary: '#0d0d0f',
          secondary: '#131318',
          tertiary: '#1a1a24',
          card: '#16161e',
          hover: '#1e1e28',
        },
        accent: {
          blue: '#6366f1',
          cyan: '#22d3ee',
          purple: '#a855f7',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
        },
        border: {
          subtle: '#2a2a3a',
          medium: '#3a3a50',
          accent: '#6366f1',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
          accent: '#6366f1',
        },
        status: {
          online: '#10b981',
          offline: '#f59e0b',
          settled: '#10b981',
          pending: '#6366f1',
          failed: '#ef4444',
          expired: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
