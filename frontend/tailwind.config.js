/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        canvas: '#FAF8F5',
        surface: '#FFFFFF',
        muted: '#F3F0EA'
      }
    }
  },
  plugins: []
};

