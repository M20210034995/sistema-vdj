/**
 * Capturas para revisão (FORA do repositório): CAPTURAS_DIR=/caminho npx playwright test capturas
 * Dois temas × 1440 e 768 (iPad em pé): entrar, painel, operações, nova operação e avaliar. Dados de exemplo.
 */
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { aparelhoNaLoja, entrar } from './ajuda';

const PASTA = process.env.CAPTURAS_DIR;

test.skip(!PASTA, 'defina CAPTURAS_DIR para gerar as capturas');

for (const tema of ['claro', 'escuro'] as const) {
  for (const { w, h } of [
    { w: 1440, h: 900 },
    { w: 768, h: 1024 },
  ]) {
    test(`capturas · ${tema} · ${w}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: w, height: h });
      await aparelhoNaLoja(page);
      await page.addInitScript((t) => localStorage.setItem('vdj-tema', t), tema);
      const salvar = (nome: string) => page.screenshot({ path: join(PASTA ?? '', `${tema}-${w}-${nome}.png`), fullPage: true, animations: 'disabled' });
      await page.goto('#/entrar');
      await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
      await salvar('1-entrar');
      await entrar(page, 'Admin');
      for (const [rota, nome] of [
        ['#/painel', '2-painel'],
        ['#/operacoes', '3-operacoes'],
        ['#/operacoes/nova', '4-nova-operacao'],
        ['#/avaliar', '5-avaliar'],
      ] as const) {
        await page.goto(rota);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);
        await salvar(nome);
      }
    });
  }
}
