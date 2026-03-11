/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        danger:  { DEFAULT: '#DC2626', light: '#FCA5A5', dark: '#991B1B' },
        warning: { DEFAULT: '#D97706', light: '#FCD34D' },
        safe:    { DEFAULT: '#059669', light: '#6EE7B7' },
        brand: {
          50:  '#fff5f5',
          100: '#ffe0e0',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
          900: '#450A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-in':   'slideIn 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease',
      },
      keyframes: {
        slideIn: { from: { transform: 'translateY(-10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
