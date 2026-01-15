/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "rgb(var(--app-bg) / <alpha-value>)",
          surface: "rgb(var(--app-surface) / <alpha-value>)",
          surface2: "rgb(var(--app-surface2) / <alpha-value>)",
          border: "rgb(var(--app-border) / <alpha-value>)",
          text: "rgb(var(--app-text) / <alpha-value>)",
          muted: "rgb(var(--app-muted) / <alpha-value>)",
          accent: "rgb(var(--app-accent) / <alpha-value>)",
          accent2: "rgb(var(--app-accent-2) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(31, 41, 55, 0.08)",
        lift: "0 16px 45px rgba(31, 41, 55, 0.14)"
      },
      borderRadius: { xl2: "1rem" }
    },
  },
  plugins: [],
}
