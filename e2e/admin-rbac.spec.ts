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

  // NÃO é redundante com o teste acima, apesar de afirmar a mesma coisa:
  // dev.titulacao é papel de setor puro, dev.gestor é o NÍVEL de chefia
  // imediata, que SOMA permissão ao papel de setor (aqui, governanca). O
  // que este teste prova é que o que ele soma é autoridade sobre processo
  // (Art. 80), não sobre contas — foi exatamente essa distinção que a
  // matriz da API passou a fazer, movendo usuario:listar para
  // `administrador`.
  test('gestor soma permissão de processo, não de conta', async ({ page }) => {
    await login(page, 'dev.gestor');
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);

    await page.goto('/admin');
    await expect(page.getByText('Acesso restrito')).toBeVisible();
  });

  // Não existe mais teste de "lista mas não revoga": com usuario:listar e
  // sessao:revogar no mesmo papel, nenhum papel consegue um sem o outro. Se
  // a matriz voltar a separá-los, o caso volta a existir e merece teste.

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
