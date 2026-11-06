/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        panel: 'var(--panel)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        rule: 'var(--rule)',
        tlblue: 'var(--blue)',
        tlred: 'var(--red)',
        tlamber: 'var(--amber)',
        board: 'var(--board)',
        tile: 'var(--tile)',
      },
      fontFamily: {
        disp: ['"Big Shoulders Display"', '"Arial Narrow"', 'Impact', 'sans-serif'],
        ser: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
}
