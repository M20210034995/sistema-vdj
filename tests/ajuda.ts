import { expect, type Page } from '@playwright/test';

export type PerfilTeste = 'Admin' | 'Gerente (Loja ZN)' | 'Atendente (Loja ZN)';

/** Entra com um usuário de teste (botões que só existem no `npm run dev`). */
export async function entrar(page: Page, perfil: PerfilTeste): Promise<void> {
  await page.goto('#/entrar');
  await page.getByRole('button', { name: perfil, exact: true }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/#\/entrar/);
}

/** Aparelho já configurado na Loja ZN (como os tablets), para o Avaliar não pedir a loja. */
export async function aparelhoNaLoja(page: Page, id: '1' | '2' | '3' = '1'): Promise<void> {
  await page.addInitScript((loja) => localStorage.setItem('vdj-loja', loja), id);
}
