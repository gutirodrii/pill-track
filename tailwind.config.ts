import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        paper: "#f7f4ec",
        mint: "#dff3e4",
        leaf: "#2f6d4f",
        coral: "#e86f51",
        lilac: "#dcd2ff",
        gold: "#f3c95b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(31, 41, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
