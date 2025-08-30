/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        "my-purple": {
          50: "#f5f0ff",
          100: "#e0d1ff",
          200: "#cbb3ff",
          300: "#b694ff",
          400: "#a175ff",
          500: "#8c55ff",
          600: "#7a48e6",
          700: "#683bcc",
          800: "#562fa3",
          900: "#44217a",
        },
      },
      // ဒီနေရာမှာ 'animation' နဲ့ 'keyframes' ကို ထည့်ရပါမယ်
      animation: {
        "gradient-move": "gradient-move 10s ease-in-out infinite",
      },
      keyframes: {
        "gradient-move": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};