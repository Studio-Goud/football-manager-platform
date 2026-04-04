import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0A0E1A',
        surface: '#0F1629',
        'surface-2': '#162040',
        border: '#1E2A45',
        'border-2': '#263552',
        accent: {
          DEFAULT: '#00FF87',
          dark: '#00CC6A',
          light: '#33FFА0',
        },
        green: {
          400: '#00FF87',
          500: '#00E077',
          600: '#00CC6A',
        },
        blue: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
        },
        tier: {
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#FFD700',
          platinum: '#E5E4E2',
          rare: '#9B59B6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0A0E1A 0%, #0F1629 50%, #0A1628 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(15,22,41,0.9) 0%, rgba(10,14,26,0.95) 100%)',
        'green-gradient': 'linear-gradient(135deg, #00FF87 0%, #00CC6A 100%)',
        'blue-gradient': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        'pitch-gradient': 'linear-gradient(180deg, #1a3a1a 0%, #1e4a1e 50%, #1a3a1a 100%)',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(0, 255, 135, 0.3)',
        'green-glow-lg': '0 0 40px rgba(0, 255, 135, 0.4)',
        'blue-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6)',
        'inner-glow': 'inset 0 0 20px rgba(0, 255, 135, 0.1)',
      },
      animation: {
        'pulse-green': 'pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
        'count-up': 'count-up 1s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(0, 255, 135, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 25px rgba(0, 255, 135, 0.8)' },
        },
        'glow': {
          'from': { boxShadow: '0 0 10px rgba(0, 255, 135, 0.3)' },
          'to': { boxShadow: '0 0 30px rgba(0, 255, 135, 0.6)' },
        },
        'slide-up': {
          'from': { transform: 'translateY(10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          'from': { transform: 'translateY(-10px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}

export default config
