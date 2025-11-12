/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter_400Regular"],
        inter: ["Inter_400Regular"],
        "inter-light": ["Inter_300Light"],
        "inter-medium": ["Inter_500Medium"],
        "inter-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
