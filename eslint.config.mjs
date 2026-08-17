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
    // Checkout do repositório IRMÃO que o job e2e-tests do CI baixa numa
    // subpasta (ver tsconfig.json e .github/workflows/ci.yml) — não é
    // código deste projeto.
    "api-titula-rr/**",
  ]),
]);

export default eslintConfig;
