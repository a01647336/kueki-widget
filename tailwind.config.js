/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./contents/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // ────────────────────────────────────────────────────────────
        // Paleta oficial Kueski Brand Refresh 2026 — monocromática azul
        //   #030B64 — navy (oscuro)
        //   #173CEC — azul primario (CTAs, headers)
        //   #0D52BB — azul medio (hover, secundarios)
        //   #9FBFFA — azul claro (fondos, chips)
        //   #03BFFF — cian (acentos brillantes)
        // ────────────────────────────────────────────────────────────
        emerald: {
          50:  "#EDF1FE",
          100: "#D2DDFB",
          200: "#9FBFFA",
          300: "#6B8CF7",
          400: "#4268F4",
          500: "#2B4EEF",
          600: "#173CEC",
          700: "#1230CC",
          800: "#0D52BB",
          900: "#030B64"
        },
        teal: {
          50:  "#E0F6FF",
          100: "#B3EAFF",
          200: "#80DCFF",
          300: "#4DCEFF",
          400: "#26C3FF",
          500: "#03BFFF",
          600: "#03BFFF",
          700: "#02A0D9",
          800: "#0182B0",
          900: "#016488"
        },
        blue: {
          50:  "#EDF1FE",
          100: "#D2DDFB",
          200: "#9FBFFA",
          300: "#6B8CF7",
          400: "#4268F4",
          500: "#0D52BB",
          600: "#173CEC",
          700: "#0D52BB",
          800: "#0A3D9A",
          900: "#030B64"
        },
        // Tokens semánticos del widget (mapean a variables --k-*)
        background:  "var(--k-background)",
        foreground:  "var(--k-foreground)",
        card: {
          DEFAULT:    "var(--k-card)",
          foreground: "var(--k-card-foreground)"
        },
        primary: {
          DEFAULT:    "var(--k-primary)",
          foreground: "var(--k-primary-foreground)"
        },
        secondary: {
          DEFAULT:    "var(--k-secondary)",
          foreground: "var(--k-secondary-foreground)"
        },
        muted: {
          DEFAULT:    "var(--k-muted)",
          foreground: "var(--k-muted-foreground)"
        },
        accent: {
          DEFAULT:    "var(--k-accent)",
          foreground: "var(--k-accent-foreground)"
        },
        destructive: {
          DEFAULT:    "var(--k-destructive)",
          foreground: "var(--k-destructive-foreground)"
        },
        border: "var(--k-border)",
        input:  "var(--k-input)",
        ring:   "var(--k-ring)"
      },
      borderRadius: {
        lg: "var(--k-radius)",
        md: "calc(var(--k-radius) - 2px)",
        sm: "calc(var(--k-radius) - 4px)"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"]
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
