import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Unitário (Vitest) só — o e2e (Playwright, e2e/**) roda separado, contra
// a api-titula-rr real, não aqui. Ver playwright.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    // api-titula-rr: checkout do repositório irmão que o e2e-tests do CI
    // baixa numa subpasta (ver tsconfig.json) — não faz parte deste
    // projeto, mesmo que alguém tenha clonado ele ali por conta própria.
    exclude: ['node_modules', '.next', 'e2e/**', 'api-titula-rr/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
