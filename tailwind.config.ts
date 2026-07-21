import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080B14',
        surface: '#0D1220',
        border: '#1A2035',
        primary: '#00D4FF',
        secondary: '#FF6B2B',
        success: '#00FF94',
        danger: '#FF3B5C',
        muted: '#4A5568',
        'text-primary': '#E2E8F0',
        'text-secondary': '#94A3B8',
      },
      fontFamily: {
        sans: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'border-rotate': 'borderRotate 3s linear infinite',
        'draw-path': 'drawPath 0.8s ease-out forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(0,212,255,0.3)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(0,212,255,0.6)' },
        },
        borderRotate: {
          from: { '--border-angle': '0deg' } as any,
          to: { '--border-angle': '360deg' } as any,
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
