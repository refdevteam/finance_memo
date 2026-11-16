import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // `next lint` sudah dihapus di Next.js 16; konfigurasi ini menggantikannya.
  // Cakupan sengaja sama dengan `next lint` lama (hanya src/), sehingga berkas
  // SQL di supabase/ dan skrip build tidak ikut diperiksa.
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "supabase/**",
    "scripts/**",
    "public/**",
    "coverage/**",
  ]),
  {
    // Aturan baru react-hooks v7 (React Compiler) menandai pola setState di
    // dalam effect yang sudah lama ada di banyak form. Menyalakan aturan ini
    // butuh refactor tersendiri; dimatikan dulu agar upgrade dependensi tidak
    // menutupi error nyata. `react-hooks/incompatible-library` tetap warning.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/static-components": "off",
    },
  },
]);
