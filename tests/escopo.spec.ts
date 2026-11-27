/**
 * Escopo por loja: o gerente e o atendente só recebem dados dos locais deles, pela tela e pela URL. E a conta do
 * custo do parceiro, compra a compra. Os testes de unidade importam os serviços direto (sem navegador), como o
 * tests/paridade.spec.ts; os outros entram no `npm run dev` com os usuários de teste.
 */
import { expect, test, type Page } from '@playwright/test';
import { aparelhoNaLoja, entrar } from './ajuda';
import { CLIENTES, LOCAIS, LOTES, OPERACOES, PAGADORES, USUARIOS, VENDAS } from '../src/mocks/dados';
import { obterCliente, obterOperacao, resultadoDaVenda, vendasVisiveis } from '../src/services/dados';
import { mascaraDocumento } from '../src/utils/formato';
import type { Operacao, Usuario } from '../src/tipos';

const usuario = (id: string): Usuario => {
  const u = USUARIOS.find((x) => x.id === id);
  if (!u) throw new Error(`sem o usuário ${id}`);
  return u;
};
const ADMIN = usuario('u-admin1');
const GERENTE_ZN = usuario('u-ger1');
const ATENDENTE_ZN = usuario('u-at1');

const tipoDoPagador = (o: Operacao): string | undefined => PAGADORES.find((p) => p.id === o.pagadorId)?.tipo;
const comprasDe = (ids: readonly string[]): Operacao[] => OPERACOES.filter((o) => ids.includes(o.id));
const soma = (ops: readonly Operacao[]): number => ops.reduce((s, o) => s + o.totalCentavos, 0);

/** Nomes dos locais que não são da Loja ZN e os códigos das compras deles: nada disso pode aparecer para a ZN. */
const OUTROS_LOCAIS = LOCAIS.filter((l) => l.id !== 'local-zn').map((l) => l.nome);
const CODIGOS_DE_FORA = OPERACOES.filter((o) => o.localId !== 'local-zn').map((o) => o.codigo);
const COMPRA_DA_CTC = OPERACOES.find((o) => o.localId === 'local-ctc');

async function semNadaDeFora(page: Page, tela: string): Promise<void> {
  const texto = await page.locator('#conteudo').innerText();
  for (const nome of OUTROS_LOCAIS) expect(texto, `${tela} mostra "${nome}"`).not.toContain(nome);
  for (const codigo of CODIGOS_DE_FORA) expect(texto, `${tela} mostra a compra ${codigo}, de outra loja`).not.toContain(codigo);
}

test.describe('serviços (sem navegador)', () => {
  test('M1: lote com compras pagas pela VJ e pelo parceiro dá o custo do parceiro e o "Entra em caixa" compra a compra', () => {
    const misturado = LOTES.find((l) => {
      const tipos = new Set(comprasDe(l.compraIds).map(tipoDoPagador));
      return tipos.has('parceiro') && tipos.has('vj') && VENDAS.find((v) => v.id === l.vendaId)?.faturamentoCentavos !== null;
    });
    expect(misturado, 'os dados de exemplo precisam de um lote, numa venda fechada, com compras pagas pela VJ e pelo parceiro').toBeDefined();
    if (!misturado) return;
    const venda = VENDAS.find((v) => v.id === misturado.vendaId);
    if (!venda || venda.faturamentoCentavos === null) throw new Error('venda do lote sem faturamento');

    // a conta à mão: só as compras pagas por um pagador do tipo parceiro
    const daVenda = comprasDe(LOTES.filter((l) => l.vendaId === venda.id).flatMap((l) => l.compraIds));
    const parceiroNaVenda = soma(daVenda.filter((o) => tipoDoPagador(o) === 'parceiro'));
    const parceiroNoLote = soma(comprasDe(misturado.compraIds).filter((o) => tipoDoPagador(o) === 'parceiro'));
    expect(parceiroNaVenda).toBeGreaterThan(0);

    const r = resultadoDaVenda(venda, ADMIN);
    if (!r) throw new Error('o admin vê todas as vendas');
    expect(r.custoDoParceiroCentavos).toBe(parceiroNaVenda);
    expect(r.entraEmCaixaCentavos).toBe(venda.faturamentoCentavos - parceiroNaVenda);
    const lote = r.lotes.find((l) => l.id === misturado.id);
    expect(lote?.custoDoParceiroCentavos).toBe(parceiroNoLote);
    // misturado: o parceiro pagou só uma parte do lote (antes, o lote inteiro contava como VJ)
    expect(lote?.custoDoParceiroCentavos).toBeGreaterThan(0);
    expect(lote?.custoDoParceiroCentavos).toBeLessThan(lote?.custoCentavos ?? 0);
  });

  test('venda de várias lojas: o gerente recebe só as compras da loja dele e nada do resultado da venda', () => {
    const vendas = vendasVisiveis(GERENTE_ZN);
    expect(vendas.length).toBeGreaterThan(0);
    expect(vendas.some((v) => v.parcial), 'os dados de exemplo precisam de uma venda com compras de várias lojas').toBe(true);
    for (const v of vendas) {
      for (const l of v.lotes) for (const o of l.compras) expect(o.localId).toBe('local-zn');
      expect(v.custoMetalCentavos).toBe(soma(v.lotes.flatMap((l) => l.compras)));
      if (!v.parcial) continue;
      expect(v.resultadoVisivel).toBe(false);
      for (const campo of [v.faturamentoCentavos, v.lucroBrutoCentavos, v.lucroLiquidoCentavos, v.impostoCentavos, v.entraEmCaixaCentavos, v.freteCentavos, v.pesoEnviadoCg]) expect(campo).toBeNull();
      for (const l of v.lotes) {
        expect(l.valorVendaCentavos).toBeNull();
        expect(l.lucroCentavos).toBeNull();
        if (l.parcial) expect(l.pesoEnviadoCg).toBeNull();
      }
    }
  });

  test('detalhe pelo id: compra e cliente de outra loja voltam como "não encontrado"', async () => {
    if (!COMPRA_DA_CTC) throw new Error('sem compra da CTC nos dados');
    expect(await obterOperacao(GERENTE_ZN, COMPRA_DA_CTC.id)).toBeNull();
    expect(await obterOperacao(ADMIN, COMPRA_DA_CTC.id)).not.toBeNull();
    const cli2 = CLIENTES.find((c) => c.id === 'cli-2');
    expect(cli2?.localId).toBe('local-ctc');
    expect(await obterCliente(ATENDENTE_ZN, 'cli-2')).toBeNull();
    expect(await obterCliente(ADMIN, 'cli-2')).not.toBeNull();
  });
});

test.describe('telas', () => {
  test('o gerente da ZN não abre uma compra da CTC pela URL', async ({ page }) => {
    if (!COMPRA_DA_CTC) throw new Error('sem compra da CTC nos dados');
    const cliente = CLIENTES.find((c) => c.id === COMPRA_DA_CTC.clienteId);
    await entrar(page, 'Gerente (Loja ZN)');
    await page.goto(`#/operacoes/${COMPRA_DA_CTC.id}`);
    await expect(page.getByRole('heading', { name: 'Compra não encontrada', level: 1 })).toBeVisible();
    const texto = await page.locator('#conteudo').innerText();
    expect(texto).toContain('não é de uma loja sua');
    for (const dado of [COMPRA_DA_CTC.codigo, 'Loja CTC', cliente?.nome ?? '?', mascaraDocumento(cliente?.documento ?? '')]) expect(texto).not.toContain(dado);
  });

  test('Painel do gerente (Tudo): só a Loja ZN, e o resultado das vendas de várias lojas fica com o admin', async ({ page }) => {
    await entrar(page, 'Gerente (Loja ZN)');
    await expect(page).toHaveURL(/#\/painel/);
    await page.getByRole('group', { name: 'Período' }).getByRole('button', { name: 'Tudo' }).click();
    await expect(page.getByRole('button', { name: 'Tudo' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('table', { name: 'Lotes enviados' })).toBeVisible();
    await expect(page.locator('.g-carregando')).toHaveCount(0);
    await semNadaDeFora(page, 'Painel');
    const vendas = page.getByRole('table', { name: 'Vendas do período' });
    await expect(vendas).toContainText('só o admin vê');
    // os lotes mostram só compras da ZN (com link) e nenhuma de fora
    const links = await page.getByRole('table', { name: 'Lotes enviados' }).getByRole('link').allInnerTexts();
    expect(links.length).toBeGreaterThan(0);
    for (const codigo of links) expect(OPERACOES.find((o) => o.codigo === codigo)?.localId).toBe('local-zn');
  });

  test('Envio do gerente: só a Loja ZN nas compras prontas e nas vendas', async ({ page }) => {
    await entrar(page, 'Gerente (Loja ZN)');
    await page.goto('#/envio');
    const vendas = page.getByRole('table', { name: 'Vendas aos parceiros' });
    await expect(vendas).toBeVisible();
    await expect(page.locator('.g-carregando')).toHaveCount(0);
    await semNadaDeFora(page, 'Envio');
    await expect(vendas).toContainText('só o admin vê');
    // nenhuma venda mostra o faturamento: todas as vendas da ZN têm compras de outras lojas nos dados de exemplo
    for (const v of vendasVisiveis(GERENTE_ZN).filter((x) => x.parcial)) {
      const fat = VENDAS.find((x) => x.id === v.id)?.faturamentoCentavos;
      if (fat) await expect(vendas).not.toContainText((fat / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    }
  });

  test('o atendente da ZN não vê o cliente da CTC pelo link ?cliente=cli-2', async ({ page }) => {
    const cli2 = CLIENTES.find((c) => c.id === 'cli-2');
    if (!cli2) throw new Error('sem cli-2');
    await aparelhoNaLoja(page, '1');
    await entrar(page, 'Atendente (Loja ZN)');
    await page.goto('#/operacoes/nova?cliente=cli-2');
    await expect(page.getByText('O cliente do link não foi encontrado nas suas lojas.')).toBeVisible();
    await expect(page.getByLabel('CPF ou CNPJ do cliente')).toHaveValue('');
    const texto = await page.locator('#conteudo').innerText();
    expect(texto).not.toContain(cli2.nome);
    expect(texto).not.toContain(mascaraDocumento(cli2.documento));
  });
});
