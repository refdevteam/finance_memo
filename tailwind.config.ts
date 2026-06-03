import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xs: "2px",
        sm: "6px",
        md: "8px",
        lg: "24px",
        xl: "32px",
        pill: "50px",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        figma: {
          primary: "#000000",
          onPrimary: "#ffffff",
          ink: "#000000",
          canvas: "#ffffff",
          "surface-soft": "#f7f7f5",
          hairline: "#e6e6e6",
          "hairline-soft": "#f1f1f1",
          lime: "#dceeb1",
          lilac: "#c5b0f4",
          cream: "#f4ecd6",
          pink: "#efd4d4",
          mint: "#c8e6cd",
          coral: "#f3c9b6",
          navy: "#1f1d3d",
          magenta: "#ff3d8b",
        }
      },
    },
  },
  plugins: [],
};
export default config;
