import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // La app carga datos en el navegador (el feed público con Supabase
      // Realtime y las consultas con RLS de la sesión del usuario), por lo que
      // el patrón "cargar al montar + suscribirse" es intencional. La regla
      // queda como advertencia para no bloquear `npm run lint`.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Copia de respaldo local usada durante tareas de refactor.
    ".dsh-backup/**",
  ]),
]);

export default eslintConfig;
