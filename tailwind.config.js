/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          "primary-text": "var(--color-primary-text)",
          "primary-text-hover": "var(--color-primary-text-hover)",
          secondary: "var(--color-secondary)",
          accent: "var(--color-accent)",
          background: "var(--color-background)",
          calendar: "var(--color-calendar)",
          surface: "var(--color-surface)",
          soft: "var(--color-surface-soft)",
          muted: "var(--color-surface-muted)",
          nude: "var(--color-nude)",
          text: "var(--color-text)",
          "text-muted": "var(--color-text-muted)",
          border: "var(--color-border)",
          "border-strong": "var(--color-border-strong)",
          success: "var(--color-success)",
          "success-soft": "var(--color-success-soft)",
          warning: "var(--color-warning)",
          "warning-soft": "var(--color-warning-soft)",
          danger: "var(--color-danger)",
          "danger-soft": "var(--color-danger-soft)",
          ink: "var(--color-ink)",
          "ink-soft": "var(--color-ink-soft)",
          "gold-light": "var(--color-gold-light)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-body)",
          "Poppins",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Cormorant Garamond",
          "Times New Roman",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        brand: "var(--radius-sm)",
        "brand-md": "var(--radius-md)",
        "brand-lg": "var(--radius-lg)",
      },
      boxShadow: {
        brand: "var(--shadow-sm)",
        "brand-md": "var(--shadow-md)",
        "brand-lg": "var(--shadow-lg)",
      },
      keyframes: {
        "menu-in": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "menu-in": "menu-in 0.15s ease-out forwards",
      },
    },
  },
  plugins: [],
};
