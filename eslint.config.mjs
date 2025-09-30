// eslint.config.mjs
import next from "eslint-config-next";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  // Ignorar salidas, generados y bundles
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "public/**",
      "src/generated/**",
      "**/*.min.js",
      "**/*.bundle.js",
      "**/*.umd.js",
    ],
  },

  // Config base de Next.js (flat)
  ...next,

  // Reglas de TypeScript SOLO para tu código fuente
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: null },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // Para .js (terceros / generados) apagamos reglas de TS
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
