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
        canvas: "#09090b",
        surface: "#18181b",
        "surface-elevated": "#1f1f23",
        accent: {
          DEFAULT: "#10b981",
          muted: "#059669",
          foreground: "#022c22",
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
        tab: "0 -1px 0 0 rgba(255,255,255,0.06)",
        card: "0 1px 0 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
