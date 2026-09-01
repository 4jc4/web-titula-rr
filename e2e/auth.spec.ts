import { expect, test } from '@playwright/test';

// Contra a api-titula-rr real com AUTH_VALIDATOR=fake — usuários fixos de
// FakeAdValidator (dev.gestor/dev.admin/dev.titulacao, senha "dev").

test.describe('Autenticação', () => {
  test('sem sessão, / redireciona pro login (proxy.ts otimista)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('rejeita credencial inválida com 401', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'dev.gestor');
    await page.fill('#password', 'senha-errada');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Usuário ou senha incorretos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('loga, chega na home via SSR e faz logout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'dev.gestor');
    await page.fill('#password', 'dev');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:3001/');
    // nome vem da api-titula-rr via getCurrentUser() no servidor — não é
    // texto estático, prova que o repasse de cookie funcionou de verdade.
    //
    // "Chefe" é a primeira palavra de `Chefe da DIGOF (Dev)`, o `name` da
    // fixture dev.gestor em fake-ad.validator.ts na API (a home mostra
    // name.split(' ')[0]). É exato de propósito: um teste que aceitasse
    // qualquer nome deixaria de provar que o dado veio de lá. Mudou a
    // fixture na API? Muda aqui — as fixtures são contrato entre os dois
    // repositórios, mesmo não estando no OpenAPI.
    //
    // getByRole (não getByText): o Next também ecoa o título num anunciador
    // de rota (#__next-route-announcer__) escondido, pra leitor de tela —
    // getByText bate nos dois, o heading é o elemento de verdade.
    await expect(
      page.getByRole('heading', { name: 'Olá, Chefe' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);

    // sessão caiu de verdade — voltar pra home deve mandar pro login de novo
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('quem já tem sessão é tirado do /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'dev.gestor');
    await page.fill('#password', 'dev');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3001/');

    await page.goto('/login');
    await expect(page).toHaveURL('http://localhost:3001/');
  });
});
