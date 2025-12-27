import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@coinbase/onchainkit/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Deep Navy Gradient Colors
        navy: {
          900: "#05070A",
          800: "#0A0E16",
          700: "#0E1420",
          600: "#151B2B",
        },
        // Base Blue Accent
        base: {
          DEFAULT: "#0052FF",
          50: "#E6EEFF",
          100: "#CCE0FF",
          200: "#99C0FF",
          300: "#66A1FF",
          400: "#3381FF",
          500: "#0052FF",
          600: "#0047E0",
          700: "#003CC2",
          800: "#0031A3",
          900: "#002685",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        label: "#0052FF",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--foreground))",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      boxShadow: {
        'nova': '0 0 12px rgba(255, 255, 255, 0.05)',
        'glow-base': '0 0 12px rgba(0, 82, 255, 0.19)',
        'glow-base-strong': '0 0 20px rgba(0, 82, 255, 0.4)',
        'glow-base-intense': '0 0 30px rgba(0, 82, 255, 0.5)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'deep-navy': 'linear-gradient(180deg, #05070A 0%, #0A0E16 50%, #0E1420 100%)',
        'deep-navy-radial': 'radial-gradient(ellipse at top, #0E1420 0%, #0A0E16 50%, #05070A 100%)',
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 0.05)',
        'glass-hover': 'rgba(255, 255, 255, 0.08)',
      },
      backdropBlur: {
        'glass': '16px',
        'glass-strong': '20px',
      },
    },
  },
  plugins: [],
};

export default config;
