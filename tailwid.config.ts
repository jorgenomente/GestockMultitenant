import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        inputBackground: "var(--input-background)",
        switch: {
          background: "var(--switch-background)"
        },
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          primaryForeground: "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          accentForeground: "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)"
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)"
        }
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        DEFAULT: "var(--radius-base)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)"
      },
      fontFamily: {
        sans: ["var(--font-family-body)", "system-ui"],
        display: ["var(--font-family-heading)", "system-ui"],
        heading: ["var(--font-family-heading)", "system-ui"],
        text: ["var(--font-family-body)", "system-ui"],
        body: ["var(--font-family-body)", "system-ui"],
        mono: ["var(--font-family-mono)", "ui-monospace"]
      },
      fontSize: {
        "2xl": "var(--text-2xl)",
        xl: "var(--text-xl)",
        lg: "var(--text-lg)",
        base: "var(--text-base)",
        sm: "var(--text-sm)",
        xs: "var(--text-xs)"
      }
    }
  },
  plugins: []
};
export default config;
