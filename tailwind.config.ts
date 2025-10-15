// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs du thème dynamiques
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
        
        // Couleurs de base (existantes)
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        theme: 'var(--border-radius)',
      },
      boxShadow: {
        theme: 'var(--shadow)',
      },
      spacing: {
        unit: 'var(--spacing-unit)',
      },
    },
  },
  plugins: [],
};

export default config;