import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        academy: {
          ink: "#08111d",
          blue: "#0c6ddf",
          sky: "#d9ecff",
          sun: "#f6c15b"
        }
      },
      boxShadow: {
        hero: "0 30px 80px rgba(8, 17, 29, 0.28)",
        glow: "0 0 0 1px rgba(255,255,255,0.15), 0 22px 60px rgba(53, 128, 255, 0.35)"
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
