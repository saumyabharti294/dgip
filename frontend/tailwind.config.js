/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dgip: {
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
          accent: "#6366f1",
          accent2: "#22d3ee",
          text: "#e2e8f0",
          muted: "#64748b",
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
