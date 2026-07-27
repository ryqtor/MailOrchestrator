/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        surface: '#FFFFFF',
        border: '#DDD8D1',
        primary: {
          50: '#fdf8f6',
          500: '#A34A22',
          600: '#8c3d1b',
          700: '#733114',
        },
        text: {
          main: '#1F1F1F',
          muted: '#6B6B6B',
        },
        status: {
          success: '#1B7F4B',
          warning: '#A46A00',
          error: '#B42318',
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};
