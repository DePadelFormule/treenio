import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nivo Sparta huisstijl: rood / zwart / wit
        sparta: {
          DEFAULT: "#C8102E", // clubrood
          dark: "#8A0A1F", // donkerrood (hover/accent)
          black: "#111111",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
