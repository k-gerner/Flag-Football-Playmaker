import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0f1720",
        },
        field: {
          50: "#f4f0e6",
          100: "#e6ddc6",
          300: "#9fb480",
          500: "#5f7d53",
          700: "#2f4f3d",
        },
        ember: {
          300: "#f3ab6a",
          500: "#d87431",
        },
      },
      boxShadow: {
        panel: "0 28px 60px rgba(15, 23, 32, 0.18)",
      },
      fontFamily: {
        display: ['"Trebuchet MS"', '"Avenir Next"', "sans-serif"],
        body: ['"Trebuchet MS"', '"Gill Sans"', "sans-serif"],
        mono: ['"SFMono-Regular"', '"Menlo"', "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
