/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  safelist: [
    'w-[340px]',   // force include this class for dynamic use
  ],
  theme: {
    extend: {
      colors: {
        'brand-cyan': '#4DFFD4',
        'brand-violet': '#7B6FFF',
        'brand-pink': '#C87FFF',
        'brand-gold': '#F5C542',
        'brand-ember': '#FF4D6A',
        'bg-dark': '#07080D',
        'surface-1': '#0F1118',
        'surface-2': '#161922',
        'surface-3': '#1D2130',
        'border-accent': '#232640',
        'text-primary': '#ECEFFE',
        'text-secondary': '#9BA1C0',
        'text-muted': '#6B7194',
        'discord': '#5865F2',
        'twitch': '#9146FF',
        'youtube': '#FF0000',
        'steam': '#1B2838',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dmsans: ['DM Sans', 'sans-serif'],
        dmmono: ['DM Mono', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #4DFFD4 0%, #7B6FFF 50%, #C87FFF 100%)',
        'cta-gradient': 'linear-gradient(135deg, #7B6FFF 0%, #C87FFF 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F5C542 0%, #D4A017 100%)',
        'ember-gradient': 'linear-gradient(135deg, #FF4D6A 0%, #FF2D55 100%)',
        'dark-gradient': 'linear-gradient(180deg, #07080D 0%, #0F1118 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(77,255,212,0.08) 0%, rgba(123,111,255,0.08) 100%)',
        'holographic': 'linear-gradient(135deg, #4DFFD4 0%, #7B6FFF 25%, #C87FFF 50%, #F5C542 75%, #4DFFD4 100%)',
      },
      borderRadius: { custom: '14px' },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(77,255,212,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(77,255,212,0.3)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};