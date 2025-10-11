/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{tsx,ts}",
    "./{components,pages,context}/**/*.{tsx,ts}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
