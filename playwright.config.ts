import { defineConfig, devices } from '@playwright/test';

// Precisa da api-titula-rr rodando em paralelo (AUTH_VALIDATOR=fake,
// porta 3000 — ver README/CLAUDE.md). Este config só sobe o FRONTEND;
// diferente do e2e da API (que testa em processo, sem servidor HTTP de
// verdade), aqui é sempre um navegador de verdade contra uma porta de
// verdade — não dá pra fugir de precisar dos dois processos no ar.
export default defineConfig({
  testDir: './e2e',
  // Serial, não paralelo: os testes de admin mexem no MESMO usuário
  // fixture (dev.gestor) entre arquivos diferentes (revogar sessão de um,
  // verificar sessão do outro) — paralelismo aqui vira corrida, não
  // velocidade. Mesma escolha do e2e do backend (uma suíte, uma ordem).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // list pro console sempre; html só interessa como artefato de CI quando
  // algo falha (ver ci.yml) — `open: 'never'` pra não tentar abrir
  // navegador nenhum no runner.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI: build de produção de verdade (pega erro que só aparece em build,
    // não em dev). Local: dev server, reaproveitando um que já esteja no ar.
    command: process.env.CI
      ? 'npm run build && npx next start -p 3001'
      : 'npm run dev',
    url: 'http://localhost:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
