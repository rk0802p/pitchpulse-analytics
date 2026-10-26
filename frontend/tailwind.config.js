/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pitch: {
          dark: '#080c14',
          surface: '#0d131f',
          card: '#131c2e',
          'card-hover': '#1a273e',
          border: '#1e293b',
          'border-light': '#334155',
          accent: '#10b981',
          'accent-hover': '#059669',
          muted: '#64748b',
          text: '#f8fafc',
          'text-secondary': '#94a3b8'
        },
        'pitch-green': '#10b981',
        'stadium-night-blue': '#0d131f',
        'df-green': '#10b981',
        'mf-blue': '#3b82f6',
        'fw-red': '#f43f5e',
        'gk-yellow': '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'bebas-neue': ['Bebas Neue', 'sans-serif'],
        'oswald': ['Oswald', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'analytics-gradient': 'linear-gradient(180deg, #0d131f 0%, #080c14 100%)',
        'card-glow': 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
      }
    },
  },
  plugins: [],
}
