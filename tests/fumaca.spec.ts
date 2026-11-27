/** Testes de fumaça: login por perfil, rota proibida, tema, avaliador com o precos-lojas.txt real, senha e nova operação. */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { aparelhoNaLoja, entrar } from './ajuda';
import { tabelasPorLoja } from '../src/services/precos';
import { completarCpf, mascaraCpf } from '../src/utils/formato';

test.describe('login e perfis', () => {
  test('sem login, qualquer tela manda para Entrar', async ({ page }) => {
    await page.goto('#/painel');
    await expect(page).toHaveURL(/#\/entrar/);
    await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible();
  });

  test('admin entra no Painel e vê o menu inteiro', async ({ page }) => {
    await entrar(page, 'Admin');
    await expect(page).toHaveURL(/#\/painel/);
    const menu = page.getByRole('navigation', { name: 'Menu principal' });
    for (const item of ['Painel', 'Avaliar', 'Clientes', 'Operações', 'Envio', 'Equipe', 'Transações', 'Preços']) await expect(menu.getByRole('link', { name: item })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Loja atual' })).toBeVisible();
  });

  test('gerente entra no Painel, sem a troca de loja do topo', async ({ page }) => {
    await entrar(page, 'Gerente (Loja ZN)');
    await expect(page).toHaveURL(/#\/painel/);
    await expect(page.getByRole('combobox', { name: 'Loja atual' })).toHaveCount(0);
  });

  test('atendente cai direto no Avaliar e só vê Avaliar e Registrar compra', async ({ page }) => {
    await aparelhoNaLoja(page);
    await entrar(page, 'Atendente (Loja ZN)');
    await expect(page).toHaveURL(/#\/avaliar/);
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const menu = page.getByRole('navigation', { name: 'Menu principal' });
    await expect(menu.getByRole('link')).toHaveText(['Avaliar', 'Registrar compra']);
  });

  test('rota proibida: atendente no Painel vê "Sem acesso"', async ({ page }) => {
    await aparelhoNaLoja(page);
    await entrar(page, 'Atendente (Loja ZN)');
    for (const rota of ['#/painel', '#/equipe', '#/operacoes', '#/clientes']) {
      await page.goto(rota);
      await expect(page.getByRole('heading', { name: 'Sem acesso', level: 1 })).toBeVisible();
    }
  });

  test('sair encerra a sessão', async ({ page }) => {
    await entrar(page, 'Admin');
    await page.getByRole('button', { name: /menu do usuário/i }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/#\/entrar/);
    await page.goto('#/painel');
    await expect(page).toHaveURL(/#\/entrar/);
  });
});

test('tema: começa claro, troca para escuro e continua escuro depois de recarregar', async ({ page }) => {
  await entrar(page, 'Admin');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');
});

test.describe('avaliador', () => {
  test('lê o precos-lojas.txt real (mesmo caminho) e avalia com a regra de sempre', async ({ page }) => {
    const real = readFileSync(new URL('../precos-lojas.txt', import.meta.url), 'utf8');
    const preco18k = tabelasPorLoja(real)['1']!['Ouro 18k'];
    const esperado = Math.ceil((1240 * Math.round(preco18k * 100)) / 10000); // 12,40 g, centavos para cima
    await aparelhoNaLoja(page, '1');
    await entrar(page, 'Atendente (Loja ZN)');
    await page.getByRole('button', { name: 'Anel' }).click();
    await page.getByRole('button', { name: 'Ouro 18k' }).click();
    await page.locator('#single-form .wbox').click();
    for (const k of ['1', '2', 'Vírgula', '4', '0']) await page.getByRole('group', { name: 'Teclado numérico' }).getByRole('button', { name: k, exact: true }).click();
    await page.getByRole('button', { name: 'Concluir' }).click();
    const leitura = page.waitForResponse((r) => r.url().endsWith('/sistema-vdj/precos-lojas.txt') && r.ok());
    await page.getByRole('button', { name: /Avaliar joia/ }).click();
    await leitura;
    await expect(page.locator('#valor-final')).toHaveText(`Valor estimado: R$ ${esperado.toLocaleString('pt-BR')}`, { timeout: 8000 });
    await expect(page.locator('#result-body .n')).toHaveText(esperado.toLocaleString('pt-BR'));
  });

  test('sem loja no aparelho, pede a loja (obrigatória, sem senha)', async ({ page }) => {
    await entrar(page, 'Atendente (Loja ZN)');
    const roda = page.getByRole('dialog', { name: 'Escolha a loja' });
    await expect(roda).toBeVisible();
    await roda.getByRole('button', { name: 'Confirmar' }).click();
    await expect(roda).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vdj-loja'))).toBe('1');
  });

  test('senha de 4 dígitos: 5 toques no logo pedem a senha; senha errada é recusada', async ({ page }) => {
    await aparelhoNaLoja(page, '2');
    await entrar(page, 'Atendente (Loja ZN)');
    const logo = page.locator('#v-single .logo-img');
    for (let i = 0; i < 5; i++) await logo.click({ delay: 20 });
    const folha = page.getByRole('dialog', { name: 'Mudar de loja' });
    await expect(folha).toContainText('Este aparelho está na Loja CTC');
    for (const d of ['0', '0', '0', '0']) await folha.getByRole('button', { name: d, exact: true }).click();
    await expect(folha.getByText('Senha incorreta.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(folha).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('vdj-loja'))).toBe('2');
  });
});

test('nova operação: do Avaliar ao "Registrar compra", com validação e foco na mensagem', async ({ page }) => {
  await aparelhoNaLoja(page, '1');
  await entrar(page, 'Atendente (Loja ZN)');
  // avalia uma joia e manda para a compra
  await page.getByRole('button', { name: 'Colar' }).click();
  await page.getByRole('button', { name: 'Ouro 18k' }).click();
  await page.locator('#single-form .wbox').click();
  for (const k of ['5']) await page.getByRole('group', { name: 'Teclado numérico' }).getByRole('button', { name: k, exact: true }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.getByRole('button', { name: /Avaliar joia/ }).click();
  await expect(page.locator('#valor-final')).not.toBeEmpty({ timeout: 8000 });
  await page.getByRole('button', { name: /Registrar compra/ }).click();
  await expect(page).toHaveURL(/#\/operacoes\/nova/);
  await expect(page.getByText('1 joia veio da avaliação')).toBeVisible();

  // passo 1 sem cliente: erro com foco
  await page.getByRole('button', { name: 'Próximo' }).click();
  const erro = page.getByRole('alert');
  await expect(erro).toContainText('Busque e escolha o cliente');
  await expect(erro).toBeFocused();

  // cliente de exemplo (CPF 000.000.100-xx)
  await page.getByLabel('CPF ou CNPJ do cliente').fill(mascaraCpf(completarCpf('000000100')));
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Exemplo' })).toBeVisible();
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('heading', { name: 'Passo 2 de 3: Peças' })).toBeFocused();

  // a peça veio da avaliação (Colar, 18K, 5 g, preço da loja); falta a foto da balança
  await expect(page.getByLabel('Peso bruto (g)')).toHaveValue('5');
  await expect(page.getByLabel('Preço do grama (R$)')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('alert')).toContainText('foto da peça na balança');
  await page.getByLabel('Foto da peça na balança').setInputFiles({ name: 'balanca-exemplo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });

  // adicionar e remover uma peça: o foco vai para a peça que ficou
  await page.getByRole('button', { name: 'Adicionar peça' }).click();
  await expect(page.getByRole('heading', { name: 'Peça 2' })).toBeFocused();
  await page.getByRole('button', { name: 'Remover peça 2' }).click();
  await expect(page.getByRole('heading', { name: 'Peça 1' })).toBeFocused();

  await page.getByRole('button', { name: 'Próximo' }).click();
  await expect(page.getByRole('heading', { name: 'Passo 3 de 3: Revisão' })).toBeFocused();
  await page.getByRole('button', { name: 'Registrar compra' }).click();
  const aviso = page.getByRole('status').filter({ hasText: 'Nada foi salvo' });
  await expect(aviso).toContainText('Registrar compra: os dados estão certos, mas isto ainda não está ligado ao back.');
  await expect(aviso).toBeFocused();
});

test.describe('ajustes da revisão', () => {
  test('manter conectado: começa desmarcado; o botão Atendente marca e os outros desmarcam', async ({ page }) => {
    await page.goto('#/entrar');
    const manter = page.getByRole('checkbox', { name: 'Manter conectado neste aparelho' });
    await expect(manter).not.toBeChecked();
    await page.getByRole('button', { name: 'Atendente (Loja ZN)', exact: true }).click();
    await expect(manter).toBeChecked();
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expect(manter).not.toBeChecked();
  });

  test('notificações do atendente só levam a telas que ele abre', async ({ page }) => {
    await aparelhoNaLoja(page, '1');
    await entrar(page, 'Atendente (Loja ZN)');
    await page.getByRole('button', { name: /^Notificações/ }).click();
    const lista = page.getByRole('region', { name: 'Notificações' });
    await expect(lista.getByRole('button')).toHaveCount(1);
    await expect(lista).not.toContainText('Cliente de exemplo');
    await lista.getByRole('button').first().click();
    await expect(page).toHaveURL(/#\/avaliar/);
    await expect(page.getByRole('heading', { name: 'Sem acesso' })).toHaveCount(0);
  });

  test('no Avaliar, o topo mostra a loja do aparelho (de onde vêm os preços), não a do usuário', async ({ page }) => {
    await aparelhoNaLoja(page, '2');
    await entrar(page, 'Atendente (Loja ZN)');
    await expect(page.getByRole('banner')).toContainText('Preços da Loja CTC (este aparelho)');
    await page.goto('#/operacoes/nova');
    await expect(page.getByRole('banner')).not.toContainText('este aparelho');
  });

  test('envio: peso enviado maior que o comprado é recusado, com o motivo', async ({ page }) => {
    await entrar(page, 'Admin');
    await page.goto('#/envio');
    await page.getByRole('checkbox', { name: /^Selecionar OP-/ }).first().check();
    await page.getByRole('button', { name: 'Enviar em lote' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Enviar em lote' });
    await dialogo.getByLabel('Parceiro').selectOption({ index: 1 });
    await dialogo.getByLabel('Peso enviado (g)').fill('99999');
    await dialogo.getByRole('button', { name: 'Enviar lote' }).click();
    await expect(dialogo.getByText(/passa do peso comprado das compras escolhidas/)).toBeVisible();
  });
});
