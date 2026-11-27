/**
 * Números do Painel, na ordem do dashboard do Lukas ("Compras de ouro"): resumo e cartões, por local, por
 * comprador, quem pagou, ao longo do tempo (dias e semanas de segunda a domingo), vendas, lotes enviados, ouro em
 * estoque, ouro guardado, observações e todos os registros. Com o back, isto vira uma rota só (GET /painel).
 * Tudo com o escopo do usuário (src/services/dados.ts): o gerente só recebe a parte da loja dele.
 */
import type { Operacao, Quilate, Usuario } from '../tipos';
import { chaveDoDia, segundaDaSemana, type Intervalo } from '../utils/periodo';
import { gramas } from '../utils/formato';
import { filtrarOperacoes, nomeDoLocal, nomeDoPagador, nomeDosCompradores, observacoesDoPeriodo, type ResultadoLote, type ResultadoVenda, vendasVisiveis } from './dados';
import { locaisPermitidos } from './permissoes';
import { simularRede } from './simulacao';
import { LOCAIS } from '../mocks/dados';

/** Abaixo disto (R$/g), a compra ganha a marca "Preço por grama baixo". Valor de exemplo: o Lukas confirma. */
export const LIMITE_PRECO_BAIXO_CENTAVOS = 10000;

export interface LinhaAgrupada {
  chave: string;
  nome: string;
  pesoCg: number;
  valorCentavos: number;
  semPeso: number;
  /** Valor por local (id do local → centavos). */
  porLocal: Record<string, number>;
}

export interface Semana {
  inicio: string;
  fim: string;
  pesoCg: number;
  valorCentavos: number;
  compras: number;
  emAndamento: boolean;
}

export interface Painel {
  /** Só as compras pagas (com pagamento registrado). Se as em negociação entram nos totais é pendência do Lukas. */
  resumo: { pesoCg: number; valorCentavos: number; precoMedioCentavos: number | null; compras: number; semPeso: number };
  /** Compras do período em negociação: fora dos totais, mas em "Todos os registros". */
  negociacao: { compras: number; valorCentavos: number };
  locais: { id: string; nome: string }[];
  porLocal: LinhaAgrupada[];
  porComprador: LinhaAgrupada[];
  porPagador: LinhaAgrupada[];
  porDia: { dia: string; pesoCg: number; valorCentavos: number }[];
  semanas: Semana[];
  vendas: ResultadoVenda[];
  cartoesVendas: {
    /** null quando alguma venda tem compras de outra loja (só o admin vê). */
    pesoEnviadoCg: number | null;
    custoCentavos: number;
    /** Soma das vendas fechadas; null quando alguma venda tem compras de outra loja (só o admin vê). */
    entraEmCaixaCentavos: number | null;
    abertas: number;
  };
  lotes: ResultadoLote[];
  estoque: Operacao[];
  guardado: { pesoCg: number; valorCentavos: number; compras: Operacao[] };
  observacoes: { em: string; texto: string }[];
  /** TODAS as compras do período (pagas e em negociação): as observações só citam códigos que estão aqui. */
  registros: Operacao[];
  atualizadoEm: string;
}

/** "10K 2,40 g; 18K 5,10 g" (ou "não informado"). */
export function teoresDaCompra(o: Operacao): string {
  const porQuilate = new Map<Quilate, number>();
  for (const p of o.pecas) if (p.quilate && p.pesoCg !== null) porQuilate.set(p.quilate, (porQuilate.get(p.quilate) ?? 0) + p.pesoCg);
  if (!porQuilate.size) return 'não informado';
  return [...porQuilate.entries()].map(([q, cg]) => `${q.toUpperCase()} ${gramas(cg)}`).join('; ');
}

export const precoPorGrama = (o: Operacao): number | null => (o.pesoCg ? Math.round((o.totalCentavos * 100) / o.pesoCg) : null);

/** Marcas automáticas do registro, como no dashboard do Lukas. */
export function alertasDaCompra(o: Operacao): string[] {
  const alertas: string[] = [];
  const rg = precoPorGrama(o);
  if (rg !== null && rg < LIMITE_PRECO_BAIXO_CENTAVOS) alertas.push('Preço por grama baixo');
  if (o.pecas.some((p) => p.quilate === null)) alertas.push('teor não informado');
  if (o.pesoCg === null) alertas.push('peso não informado');
  return alertas;
}

function agrupar(compras: Operacao[], chaveDe: (o: Operacao) => string, nomeDe: (o: Operacao) => string): LinhaAgrupada[] {
  const mapa = new Map<string, LinhaAgrupada>();
  for (const o of compras) {
    const chave = chaveDe(o);
    const linha = mapa.get(chave) ?? { chave, nome: nomeDe(o), pesoCg: 0, valorCentavos: 0, semPeso: 0, porLocal: {} };
    linha.pesoCg += o.pesoCg ?? 0;
    linha.valorCentavos += o.totalCentavos;
    if (o.pesoCg === null) linha.semPeso += 1;
    linha.porLocal[o.localId] = (linha.porLocal[o.localId] ?? 0) + o.totalCentavos;
    mapa.set(chave, linha);
  }
  return [...mapa.values()].sort((a, b) => b.valorCentavos - a.valorCentavos);
}

export async function montarPainel(u: Usuario, localIds: readonly string[], i: Intervalo, agora = new Date()): Promise<Painel> {
  // Os totais contam só as compras pagas (o dinheiro saiu): A CONFIRMAR COM O LUKAS. As em negociação aparecem em
  // "Todos os registros" e no cartão "Em negociação".
  const todas = filtrarOperacoes(u, { localIds, de: i.de, ate: i.ate });
  const compras = todas.filter((o) => o.pagamento !== null);
  const emNegociacao = todas.filter((o) => o.situacao === 'negociacao');
  const comPeso = compras.filter((o) => o.pesoCg !== null);
  const pesoCg = comPeso.reduce((s, o) => s + (o.pesoCg ?? 0), 0);
  const valorComPeso = comPeso.reduce((s, o) => s + o.totalCentavos, 0);

  const dias = new Map<string, { pesoCg: number; valorCentavos: number }>();
  const semanas = new Map<string, Semana>();
  const segundaAtual = chaveDoDia(segundaDaSemana(agora));
  for (const o of compras) {
    const d = new Date(o.criadoEm);
    const k = chaveDoDia(d);
    const dia = dias.get(k) ?? { pesoCg: 0, valorCentavos: 0 };
    dia.pesoCg += o.pesoCg ?? 0;
    dia.valorCentavos += o.totalCentavos;
    dias.set(k, dia);
    const seg = segundaDaSemana(d);
    const ks = chaveDoDia(seg);
    const dom = new Date(seg);
    dom.setDate(dom.getDate() + 6);
    const s = semanas.get(ks) ?? { inicio: ks, fim: chaveDoDia(dom), pesoCg: 0, valorCentavos: 0, compras: 0, emAndamento: ks === segundaAtual };
    s.pesoCg += o.pesoCg ?? 0;
    s.valorCentavos += o.totalCentavos;
    s.compras += 1;
    semanas.set(ks, s);
  }

  const vendas = vendasVisiveis(u, { localIds, de: i.de, ate: i.ate });
  const lotes = vendas.flatMap((v) => v.lotes);
  const guardadas = compras.filter((o) => o.situacao === 'guardada');
  const permitidos = locaisPermitidos(u);
  const locaisUsados = LOCAIS.filter((l) => localIds.includes(l.id) && permitidos.includes(l.id));
  const resultadoVisivel = vendas.every((v) => v.resultadoVisivel);

  return simularRede({
    resumo: { pesoCg, valorCentavos: compras.reduce((s, o) => s + o.totalCentavos, 0), precoMedioCentavos: pesoCg ? Math.round((valorComPeso * 100) / pesoCg) : null, compras: compras.length, semPeso: compras.length - comPeso.length },
    negociacao: { compras: emNegociacao.length, valorCentavos: emNegociacao.reduce((s, o) => s + o.totalCentavos, 0) },
    locais: locaisUsados.map((l) => ({ id: l.id, nome: l.nome })),
    porLocal: agrupar(compras, (o) => o.localId, (o) => nomeDoLocal(o.localId)),
    porComprador: agrupar(compras, (o) => [...o.compradorIds].sort().join('+'), (o) => nomeDosCompradores([...o.compradorIds].sort())),
    porPagador: agrupar(compras, (o) => o.pagadorId, (o) => nomeDoPagador(o.pagadorId)),
    porDia: [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, ...v })),
    semanas: [...semanas.values()].sort((a, b) => b.inicio.localeCompare(a.inicio)),
    vendas,
    cartoesVendas: {
      pesoEnviadoCg: resultadoVisivel ? vendas.reduce((s, v) => s + (v.pesoEnviadoCg ?? 0), 0) : null,
      custoCentavos: lotes.reduce((s, l) => s + l.custoCentavos, 0),
      entraEmCaixaCentavos: resultadoVisivel ? vendas.reduce((s, v) => s + (v.entraEmCaixaCentavos ?? 0), 0) : null,
      abertas: vendas.filter((v) => v.situacao === 'aberta').length,
    },
    lotes,
    estoque: compras.filter((o) => o.situacao === 'estoque'),
    guardado: { pesoCg: guardadas.reduce((s, o) => s + (o.pesoCg ?? 0), 0), valorCentavos: guardadas.reduce((s, o) => s + o.totalCentavos, 0), compras: guardadas },
    observacoes: [
      ...observacoesDoPeriodo(u, { localIds, de: i.de, ate: i.ate }),
      ...todas.filter((o) => o.observacao).map((o) => ({ em: o.criadoEm, texto: `${o.codigo}: ${o.observacao}` })),
    ].sort((a, b) => b.em.localeCompare(a.em)),
    registros: todas,
    atualizadoEm: new Date().toISOString(),
  });
}
