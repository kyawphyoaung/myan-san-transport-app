// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // src folder အောက်ရှိ JS, TS, JSX, TSX ဖိုင်များအားလုံးကို ထည့်သွင်းပါမည်။
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Inter font ကို ထည့်သွင်းပါ။
      },
    },
  },
  plugins: [],
}