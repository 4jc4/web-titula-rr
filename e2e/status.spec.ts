import { expect, test } from '@playwright/test';

test.describe('Status', () => {
  test('é visível sem sessão — não é redirecionada pro login', async ({
    page,
  }) => {
    await page.goto('/status');

    await expect(page).toHaveURL('http://localhost:3001/status');
    await expect(page.getByText('Operacional')).toBeVisible();
    await expect(page.getByText('Conectado')).toBeVisible();
  });

  test('continua acessível com sessão, sem expulsar pra home', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('#username', 'dev.gestor');
    await page.fill('#password', 'dev');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3001/');

    await page.getByRole('link', { name: 'Status' }).click();
    await expect(page).toHaveURL('http://localhost:3001/status');
    await expect(page.getByText('Operacional')).toBeVisible();
  });
});
