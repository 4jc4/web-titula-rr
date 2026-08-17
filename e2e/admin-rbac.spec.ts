import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, username: string, password = 'dev') {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3001/');
}

test.describe('RBAC do módulo admin', () => {
  test('sem usuario:listar: link escondido E a API barra o acesso direto', async ({
    page,
  }) => {
    await login(page, 'dev.titulacao');
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);

    // o gate do nav é só estética — a rota em si tem que recusar mesmo
    // chegando direto pela URL, sem passar pelo link.
    await page.goto('/admin');
    await expect(page.getByText('Acesso restrito')).toBeVisible();
  });

  test('gestor lista usuários mas não vê a coluna de ações', async ({
    page,
  }) => {
    await login(page, 'dev.gestor');
    await page.getByRole('link', { name: 'Administração' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Revogar sessões')).toHaveCount(0);
  });

  test('administrador revoga sessões de outro usuário', async ({ page }) => {
    await login(page, 'dev.admin');
    await page.getByRole('link', { name: 'Administração' }).click();
    await expect(page.getByRole('table')).toBeVisible();

    const linha = page.getByRole('row', { name: /dev\.gestor/ });
    await linha.getByRole('button', { name: 'Revogar sessões' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.getByText(/sessão\(ões\) revogada\(s\)/)).toBeVisible();
  });
});
