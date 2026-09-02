/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          card: 'var(--color-card)',
          cardHover: 'var(--color-card-hover)',
          border: 'var(--color-border)',
          borderSubtle: 'var(--color-border-subtle)',
          accent: 'var(--color-accent)',
          accentHover: 'var(--color-accent-hover)',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#06B6D4',
          success: '#10B981',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
          subtle: 'var(--color-subtle)'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border)',
        'card-hover': '0 12px 32px -4px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.3)',
        'glow-blue': '0 0 24px -4px rgba(59, 130, 246, 0.35)',
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.35)',
        'glow-rose': '0 0 24px -4px rgba(244, 63, 94, 0.35)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.35)'
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out'
      }
    },
  },
  plugins: [],
}
