module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pitch-green': '#4CAF50',
        'stadium-night-blue': '#191970',
        'df-green': '#00FF00',
        'mf-blue': '#0000FF',
        'fw-red': '#FF0000',
        'gk-yellow': '#FFFF00',
      },
      fontFamily: {
        'bebas-neue': ['Bebas Neue', 'sans-serif'],
        'oswald': ['Oswald', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'grass-light': "url('/img/grass-light.jpg')",
        'grass-dark': "url('/img/grass-dark.jpg')",
      }
    },
  },
}