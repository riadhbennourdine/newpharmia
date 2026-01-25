/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{tsx,ts}',
    './{components,pages,context}/**/*.{tsx,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
