/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06080c',
        panel: '#0c1118',
        panel2: '#101722',
        line: '#1c2635',
        ink: '#e8eef4',
        dim: '#8b98a9',
        faint: '#4a5668',
        amber: '#ffb224',
        signal: '#3df08a',
        violet: '#8b7bff',
        rose: '#ff6b7a',
      },
      fontFamily: {
        mono: ['SFMono-Regular', 'ui-monospace', 'Cascadia Code', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
