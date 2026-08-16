import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desliga regras estilísticas do ESLint que colidiriam com o Prettier —
  // mesmo par que o backend usa (prettier decide formatação, eslint decide
  // correção).
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Gerado pelo orval (orval.config.ts) — nunca editar, nunca lintar.
    "lib/api/generated/**",
  ]),
]);

export default eslintConfig;
