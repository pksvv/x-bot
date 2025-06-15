/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        twitter: {
          blue: '#1DA1F2',
          dark: '#14171A',
          light: '#F7F9FA',
          gray: '#657786',
        },
      },
    },
  },
  plugins: [],
}