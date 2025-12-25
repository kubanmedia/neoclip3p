/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00FFFF',
        secondary: '#BF00FF',
      },
      animation: {
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'slideDown': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slideDown': {
          'from': { opacity: '0', transform: 'translate(-50%, -20px)' },
          'to': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
    },
  },
  plugins: [],
}
