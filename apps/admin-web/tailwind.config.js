/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          600: '#1e3a8a',
          800: '#1e293b',
          900: '#0f172a',
        },
        brand: {
          500: '#2563eb',
          600: '#1d4ed8',
        }
      },
    },
  },
  plugins: [],
}
