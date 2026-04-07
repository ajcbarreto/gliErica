import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#eef2f7",
        surface: "#ffffff",
        "surface-elevated": "#f8fafc",
        accent: {
          DEFAULT: "#059669",
          muted: "#047857",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        tab: "0 -1px 0 0 rgba(15, 23, 42, 0.08)",
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
