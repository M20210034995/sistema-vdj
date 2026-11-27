/**
 * axe (WCAG 2.0/2.1/2.2 A e AA) em todas as telas, nos dois temas, a 1440, 1024, 768 (iPad em pé) e 375 px.
 * Capturas (opcional): CAPTURAS_DIR=/caminho/fora/do/repo npx playwright test capturas
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { aparelhoNaLoja, entrar } from './ajuda';

const LARGURAS = [
  { w: 1440, h: 900 },
  { w: 1024, h: 1366 },
  { w: 768, h: 1024 },
  { w: 375, h: 812 },
];
const ROTAS = [
  '#/painel',
  '#/avaliar',
  '#/operacoes',
  '#/operacoes/nova',
  '#/operacoes/op-1',
  '#/clientes',
  '#/clientes/novo',
  '#/clientes/cli-1',
  '#/envio',
  '#/equipe',
  '#/transacoes',
  '#/precos',
  '#/perfil',
  '#/configuracoes',
  '#/nao-existe',
];

async function analisar(page: Page): Promise<string[]> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

for (const tema of ['claro', 'escuro'] as const) {
  for (const { w, h } of LARGURAS) {
    test(`axe AA · tema ${tema} · ${w}px`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: w, height: h });
      await aparelhoNaLoja(page);
      await page.addInitScript((t) => localStorage.setItem('vdj-tema', t), tema);
      const problemas: string[] = [];
      await page.goto('#/entrar');
      await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
      problemas.push(...(await analisar(page)).map((p) => `#/entrar → ${p}`));
      await entrar(page, 'Admin');
      let anterior = await page.title();
      for (const rota of ROTAS) {
        await page.goto(rota);
        // espera a tela nova: o endereço, o título da aba trocado e nada "Carregando…"
        await expect(page).toHaveURL(new RegExp(`${rota.replace(/[/#-]/g, '\\$&')}$`));
        await page.waitForFunction((antes) => document.title !== antes || document.title.startsWith('Página'), anterior);
        await expect(page.locator('.g-carregando')).toHaveCount(0);
        await page.waitForLoadState('networkidle');
        anterior = await page.title();
        problemas.push(...(await analisar(page)).map((p) => `${rota} → ${p}`));
      }
      expect(problemas, problemas.join('\n')).toEqual([]);
    });
  }
}
