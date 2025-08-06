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
      colors: {
        // 'custom-purple' ကို နာမည်ပေးပြီး အရောင် scale ကို သတ်မှတ်ပါ
        'my-purple': {
          50: '#f5f0ff',
          100: '#e0d1ff',
          200: '#cbb3ff',
          300: '#b694ff',
          400: '#a175ff',
          500: '#8c55ff', // ဒါက သင့်ရဲ့ default purple ဖြစ်နိုင်ပါတယ်
          600: '#7a48e6',
          700: '#683bcc',
          800: '#562fa3',
          900: '#44217a',
        },
      },
    },
  },
  plugins: [],
}