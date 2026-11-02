/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F4EDE6',
          50: '#FBF7F2',
          100: '#F4EDE6',
          200: '#EDE2D5',
          300: '#E3D3C1',
          400: '#D3BEA6',
        },
        olive: {
          DEFAULT: '#465626',
          100: '#E8EBDD',
          200: '#CFD7BB',
          300: '#ADBA8D',
          400: '#87995E',
          500: '#6B7C44',
          600: '#57682F',
          700: '#465626',
          800: '#37451F',
          900: '#283215',
          950: '#1B2210',
        },
        clay: {
          DEFAULT: '#A9522F',
          soft: '#C4785A',
          pale: '#F0DED3',
        },
        gold: {
          DEFAULT: '#C09A57',
          pale: '#EFE3CB',
        },
      },
      fontFamily: {
        display: ['Shrikhand', 'Georgia', 'serif'],
        editorial: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'spin-slow': 'spin 26s linear infinite',
        rise: 'rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'soft-pulse': 'softPulse 3.5s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        softPulse: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
