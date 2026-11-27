/**
 * Leitura e ações dos dados de exemplo: clientes, compras (operações), vendas, lotes, equipe, transações,
 * observações e notificações. Cada função tem a assinatura que a API terá (assíncrona, devolvendo cópias). As ações
 * que gravam passam por `naoLigado`: validam na tela e avisam que nada foi salvo. Rotas sugeridas: docs/funcoes-do-back.md.
 *
 * ESCOPO: toda leitura recebe o usuário e só devolve o que é dos locais que ele pode ver (`locaisPermitidos`). O
 * filtro "Loja atual" do topo só estreita esse limite, nunca o amplia. O que for de outro local volta como null
 * ("não encontrado") ou some da lista; venda e lote de várias lojas voltam só com a parte da pessoa (ver resultadoDaVenda).
 */
import type { Cliente, Convite, Local, LojaId, Notificacao, Operacao, Pagador, Parceiro, SituacaoVenda, StatusOperacao, Usuario, Venda } from '../tipos';
import { CLIENTES, CONVITES, LOCAIS, LOTES, NOTIFICACOES, OBSERVACOES, OPERACOES, PAGADORES, PARCEIROS, USUARIOS, VENDAS } from '../mocks/dados';
import { soDigitos } from '../utils/formato';
import { areaDaRota, locaisPermitidos, pode } from './permissoes';
import { naoLigado, simularRede } from './simulacao';

/* ---------- consultas síncronas (rótulos) ---------- */
export const local = (id: string): Local | undefined => LOCAIS.find((l) => l.id === id);
export const nomeDoLocal = (id: string): string => local(id)?.nome ?? '—';
export const nomeDoUsuario = (id: string): string => USUARIOS.find((u) => u.id === id)?.nome ?? '—';
export const nomeDoPagador = (id: string): string => PAGADORES.find((p) => p.id === id)?.nome ?? '—';
export const pagador = (id: string): Pagador | undefined => PAGADORES.find((p) => p.id === id);
export const parceiro = (id: string): Parceiro | undefined => PARCEIROS.find((p) => p.id === id);
/** Comprador como o Lukas escreve: uma pessoa ou a dupla "A e B". */
export const nomeDosCompradores = (ids: readonly string[]): string => ids.map(nomeDoUsuario).join(' e ');
export const todosOsLocais = (): Local[] => [...LOCAIS];
export const todosOsPagadores = (): Pagador[] => [...PAGADORES];
export const todosOsParceiros = (): Parceiro[] => [...PARCEIROS];

/* ---------- escopo ---------- */
/** Locais do pedido: os que a pessoa pode ver, estreitados pelo filtro do topo (se houver). */
function locaisDoPedido(u: Usuario, filtro?: readonly string[]): string[] {
  const permitidos = locaisPermitidos(u);
  return filtro ? permitidos.filter((id) => filtro.includes(id)) : permitidos;
}
/** O local é de alguém que a pessoa pode ver? (detalhes: compra, cliente). */
export const podeVerLocal = (u: Usuario, localId: string): boolean => locaisPermitidos(u).includes(localId);

/* ---------- status das compras ---------- */
export const ORDEM_STATUS: readonly StatusOperacao[] = ['rascunho', 'avaliacao', 'aprovado', 'termo_assinado', 'pago', 'nf_emitida', 'enviado', 'recebido', 'exportado'];

/** Rótulos do VDJ para os status (estrutura do sistema de referência). Os marcados em docs/funcoes-do-back.md o Lukas confirma. */
export const ROTULO_STATUS: Record<StatusOperacao, string> = {
  rascunho: 'Rascunho',
  avaliacao: 'Em avaliação',
  aprovado: 'Aprovada',
  termo_assinado: 'Termo assinado',
  pago: 'Paga',
  nf_emitida: 'NF emitida',
  enviado: 'Em lote (enviada)',
  recebido: 'Recebida pelo parceiro',
  exportado: 'Faturada',
};

/** Rótulo curto da linha de etapas. */
export const ETAPA_CURTA: Record<StatusOperacao, string> = {
  rascunho: 'Rascunho',
  avaliacao: 'Avaliação',
  aprovado: 'Aprovada',
  termo_assinado: 'Termo',
  pago: 'Paga',
  nf_emitida: 'NF',
  enviado: 'Lote',
  recebido: 'Recebida',
  exportado: 'Faturada',
};

export const ROTULO_SITUACAO = { estoque: 'Em estoque', lote: 'Em lote de venda', guardada: 'Guardada', negociacao: 'Em negociação' } as const;

/** Próxima ação de cada status (botão no detalhe da compra) e quem pode. */
export const PROXIMA_ACAO: Partial<Record<StatusOperacao, { rotulo: string; soAdmin: boolean }>> = {
  rascunho: { rotulo: 'Enviar para avaliação', soAdmin: false },
  avaliacao: { rotulo: 'Aprovar compra', soAdmin: true },
  aprovado: { rotulo: 'Registrar termo assinado', soAdmin: false },
  termo_assinado: { rotulo: 'Registrar pagamento', soAdmin: true },
  pago: { rotulo: 'Emitir NF', soAdmin: true },
  nf_emitida: { rotulo: 'Incluir num lote de venda', soAdmin: true },
  enviado: { rotulo: 'Confirmar recebimento pelo parceiro', soAdmin: true },
  recebido: { rotulo: 'Marcar como faturada', soAdmin: true },
};

/* ---------- clientes ---------- */
export interface FiltroClientes {
  /** Filtro do topo; sem ele, todos os locais que a pessoa pode ver. */
  localIds?: readonly string[];
  busca?: string;
  status?: Cliente['status'] | 'todos';
}

export async function listarClientes(u: Usuario, f: FiltroClientes = {}): Promise<Cliente[]> {
  const locais = locaisDoPedido(u, f.localIds);
  const termo = (f.busca ?? '').trim().toLowerCase();
  const digitos = soDigitos(termo);
  const lista = CLIENTES.filter(
    (c) =>
      locais.includes(c.localId) &&
      (!f.status || f.status === 'todos' || c.status === f.status) &&
      (!termo || c.nome.toLowerCase().includes(termo) || c.email.toLowerCase().includes(termo) || (digitos.length >= 3 && c.documento.includes(digitos))),
  );
  return simularRede(lista);
}

/** null quando não existe ou é de um local que a pessoa não vê (para a tela, as duas coisas são "não encontrado"). */
export async function obterCliente(u: Usuario, id: string): Promise<Cliente | null> {
  const c = CLIENTES.find((x) => x.id === id);
  return simularRede(c && podeVerLocal(u, c.localId) ? c : null);
}

/** Busca exata por CPF ou CNPJ (passo 1 da nova operação), só nos locais que a pessoa vê. */
export async function buscarClientePorDocumento(u: Usuario, documento: string): Promise<Cliente | null> {
  const d = soDigitos(documento);
  return simularRede(CLIENTES.find((c) => c.documento === d && podeVerLocal(u, c.localId)) ?? null);
}

export const salvarCliente = (): Promise<never> => naoLigado('Salvar cliente');
export const cadastrarCliente = (): Promise<never> => naoLigado('Cadastrar cliente');

/* ---------- compras (operações) ---------- */
export interface FiltroOperacoes {
  /** Filtro do topo; sem ele, todos os locais que a pessoa pode ver. */
  localIds?: readonly string[];
  de?: Date;
  ate?: Date;
  busca?: string;
  status?: StatusOperacao | 'todos';
}

const noPeriodo = (iso: string, de?: Date, ate?: Date): boolean => {
  const t = new Date(iso).getTime();
  return (!de || t >= de.getTime()) && (!ate || t <= ate.getTime());
};

export function filtrarOperacoes(u: Usuario, f: FiltroOperacoes): Operacao[] {
  const locais = locaisDoPedido(u, f.localIds);
  const termo = (f.busca ?? '').trim().toLowerCase();
  const digitos = soDigitos(termo);
  return OPERACOES.filter((o) => {
    if (!locais.includes(o.localId) || !noPeriodo(o.criadoEm, f.de, f.ate)) return false;
    if (f.status && f.status !== 'todos' && o.status !== f.status) return false;
    if (!termo) return true;
    const cliente = CLIENTES.find((c) => c.id === o.clienteId);
    return o.codigo.toLowerCase().includes(termo) || (cliente?.nome.toLowerCase().includes(termo) ?? false) || (digitos.length >= 3 && (cliente?.documento.includes(digitos) ?? false));
  });
}

export async function listarOperacoes(u: Usuario, f: FiltroOperacoes): Promise<Operacao[]> {
  return simularRede(filtrarOperacoes(u, f));
}

/** null quando não existe ou é de um local que a pessoa não vê. */
export async function obterOperacao(u: Usuario, id: string): Promise<Operacao | null> {
  const o = OPERACOES.find((x) => x.id === id);
  return simularRede(o && podeVerLocal(u, o.localId) ? o : null);
}

/** Cliente de uma compra que a pessoa já pode ver (o cliente pode ter sido cadastrado em outro local). */
export const clienteDaOperacao = (o: Operacao): Cliente | undefined => CLIENTES.find((c) => c.id === o.clienteId);
/** Compras do cliente nos locais que a pessoa vê. */
export const operacoesDoCliente = (u: Usuario, clienteId: string): Operacao[] => OPERACOES.filter((o) => o.clienteId === clienteId && podeVerLocal(u, o.localId));

export const registrarCompra = (): Promise<never> => naoLigado('Registrar compra');
export const avancarOperacao = (rotulo: string): Promise<never> => naoLigado(rotulo);

/* ---------- vendas e lotes ---------- */
const pagaPorParceiro = (o: Operacao): boolean => pagador(o.pagadorId)?.tipo === 'parceiro';
const somaPeso = (ops: readonly Operacao[]): number => ops.reduce((s, o) => s + (o.pesoCg ?? 0), 0);
const somaCusto = (ops: readonly Operacao[]): number => ops.reduce((s, o) => s + o.totalCentavos, 0);

/** Lote como a pessoa pode ver. */
export interface ResultadoLote {
  id: string;
  vendaId: string;
  vendaCodigo: string;
  vendaSituacao: SituacaoVenda;
  derretido: boolean;
  teorApuradoPct: number | null;
  /** Compras do lote que a pessoa vê (o gerente vê só as da loja dele). */
  compras: Operacao[];
  /** O lote tem compras de locais que a pessoa não vê. */
  parcial: boolean;
  /** Igual ao da venda: false quando a venda tem compras de outra loja e a pessoa não é admin. */
  resultadoVisivel: boolean;
  /** Peso e custo das compras que a pessoa vê. */
  pesoCompradoCg: number;
  custoCentavos: number;
  /** Custo das compras (que a pessoa vê) pagas por um pagador do tipo parceiro: fica com ele. */
  custoDoParceiroCentavos: number;
  /** null quando o lote é parcial: o ouro saiu derretido junto e o peso não se divide por loja. */
  pesoEnviadoCg: number | null;
  diferencaCg: number | null;
  /** null com a venda aberta ou quando o resultado é só do admin (resultadoVisivel = false). */
  valorVendaCentavos: number | null;
  lucroCentavos: number | null;
}

/** Venda como a pessoa pode ver. */
export interface ResultadoVenda {
  id: string;
  codigo: string;
  data: string;
  situacao: SituacaoVenda;
  parceiro: Parceiro | undefined;
  lotes: ResultadoLote[];
  /** A venda tem compras de locais que a pessoa não vê. */
  parcial: boolean;
  /**
   * false quando a venda é parcial: faturamento, frete, imposto, lucros e o que entra em caixa são da venda inteira,
   * não se dividem por loja, e ficam só com o admin. Esses campos vêm null.
   */
  resultadoVisivel: boolean;
  pesoCompradoCg: number;
  /** null quando a venda é parcial. */
  pesoEnviadoCg: number | null;
  /** Custo das compras que a pessoa vê. */
  custoMetalCentavos: number;
  /** Custo das compras (que a pessoa vê) pagas por um parceiro, somado compra a compra. */
  custoDoParceiroCentavos: number;
  freteCentavos: number | null;
  /** null com a venda aberta ("a informar") ou quando resultadoVisivel = false. */
  faturamentoCentavos: number | null;
  lucroBrutoCentavos: number | null;
  impostoCentavos: number | null;
  lucroLiquidoCentavos: number | null;
  /** Faturamento menos o custo pago por parceiro (o que entra em caixa). */
  entraEmCaixaCentavos: number | null;
}

/**
 * Regras do dashboard do Lukas:
 * - lucro bruto = faturamento − custo do metal; lucro líquido = lucro bruto − frete − imposto;
 * - parceiro que paga o cliente direto: imposto de X% sobre o LUCRO bruto, não sobre o faturamento;
 * - compra paga por um parceiro: o custo fica com ele; em caixa entra o faturamento menos a soma dessas compras
 *   (compra a compra: um lote pode misturar compras pagas pela VJ e pelo parceiro).
 * O valor de venda de cada lote é o faturamento dividido pelo peso enviado.
 *
 * Várias lojas na mesma venda: quem não é admin vê só as compras dos locais dele (peso e custo da parte dele). O
 * faturamento, o frete, o imposto, os lucros e o que entra em caixa são da venda inteira e ficam só com o admin.
 * Devolve null quando a pessoa não vê nenhuma compra da venda.
 */
export function resultadoDaVenda(venda: Venda, u: Usuario): ResultadoVenda | null {
  const permitidos = locaisPermitidos(u);
  const p = parceiro(venda.parceiroId);
  const brutos = LOTES.filter((l) => l.vendaId === venda.id).map((lote) => {
    const todas = OPERACOES.filter((o) => lote.compraIds.includes(o.id));
    return { lote, todas, visiveis: todas.filter((o) => permitidos.includes(o.localId)) };
  });
  const todasDaVenda = brutos.flatMap((b) => b.todas);
  const visiveisDaVenda = brutos.flatMap((b) => b.visiveis);
  if (!visiveisDaVenda.length) return null;
  const parcial = visiveisDaVenda.length < todasDaVenda.length;
  const resultadoVisivel = !parcial;

  // a venda inteira (só sai da função quando resultadoVisivel)
  const pesoEnviado = brutos.reduce((s, b) => s + b.lote.pesoEnviadoCg, 0);
  const custoMetal = somaCusto(todasDaVenda);
  const custoParceiro = somaCusto(todasDaVenda.filter(pagaPorParceiro));
  const fat = venda.faturamentoCentavos;
  const bruto = fat === null ? null : fat - custoMetal;
  const imposto = bruto === null ? null : p?.impostoSobreLucroPct != null ? Math.round((Math.max(bruto, 0) * p.impostoSobreLucroPct) / 100) : (venda.impostoCentavos ?? 0);

  const lotes: ResultadoLote[] = brutos
    .filter((b) => b.visiveis.length > 0)
    .map(({ lote, todas, visiveis }) => {
      const loteParcial = visiveis.length < todas.length;
      const pesoComprado = somaPeso(visiveis);
      const custo = somaCusto(visiveis);
      const valorVenda = !resultadoVisivel || fat === null || pesoEnviado === 0 ? null : Math.round((fat * lote.pesoEnviadoCg) / pesoEnviado);
      return {
        id: lote.id,
        vendaId: venda.id,
        vendaCodigo: venda.codigo,
        vendaSituacao: venda.situacao,
        derretido: lote.derretido,
        teorApuradoPct: lote.teorApuradoPct,
        compras: visiveis,
        parcial: loteParcial,
        resultadoVisivel,
        pesoCompradoCg: pesoComprado,
        custoCentavos: custo,
        custoDoParceiroCentavos: somaCusto(visiveis.filter(pagaPorParceiro)),
        pesoEnviadoCg: loteParcial ? null : lote.pesoEnviadoCg,
        diferencaCg: loteParcial ? null : pesoComprado - lote.pesoEnviadoCg,
        valorVendaCentavos: valorVenda,
        lucroCentavos: valorVenda === null ? null : valorVenda - custo,
      };
    });

  const soAdmin = <T,>(v: T): T | null => (resultadoVisivel ? v : null);
  return {
    id: venda.id,
    codigo: venda.codigo,
    data: venda.data,
    situacao: venda.situacao,
    parceiro: p,
    lotes,
    parcial,
    resultadoVisivel,
    pesoCompradoCg: somaPeso(visiveisDaVenda),
    pesoEnviadoCg: soAdmin(pesoEnviado),
    custoMetalCentavos: somaCusto(visiveisDaVenda),
    custoDoParceiroCentavos: somaCusto(visiveisDaVenda.filter(pagaPorParceiro)),
    freteCentavos: soAdmin(venda.freteCentavos),
    faturamentoCentavos: soAdmin(fat),
    lucroBrutoCentavos: soAdmin(bruto),
    impostoCentavos: soAdmin(imposto),
    lucroLiquidoCentavos: resultadoVisivel && bruto !== null && imposto !== null ? bruto - venda.freteCentavos - imposto : null,
    entraEmCaixaCentavos: resultadoVisivel && fat !== null ? fat - custoParceiro : null,
  };
}

export interface FiltroVendas {
  /** Filtro do topo: a venda entra se tiver alguma compra destes locais. */
  localIds?: readonly string[];
  de?: Date;
  ate?: Date;
}

/** Vendas com alguma compra que a pessoa vê, cada uma só com a parte dela (ver resultadoDaVenda). */
export function vendasVisiveis(u: Usuario, f: FiltroVendas = {}): ResultadoVenda[] {
  const locais = locaisDoPedido(u, f.localIds);
  return VENDAS.filter((v) => noPeriodo(v.data, f.de, f.ate))
    .map((v) => resultadoDaVenda(v, u))
    .filter((r): r is ResultadoVenda => r !== null && r.lotes.some((l) => l.compras.some((o) => locais.includes(o.localId))));
}

export async function listarVendas(u: Usuario, f: FiltroVendas = {}): Promise<ResultadoVenda[]> {
  return simularRede(vendasVisiveis(u, f));
}

/** Lote em que a compra saiu, como a pessoa pode ver (null se a compra não saiu em lote ou não é dela). */
export function loteDaCompra(u: Usuario, compraId: string): ResultadoLote | null {
  const lote = LOTES.find((l) => l.compraIds.includes(compraId));
  const venda = lote && VENDAS.find((v) => v.id === lote.vendaId);
  if (!lote || !venda) return null;
  return resultadoDaVenda(venda, u)?.lotes.find((l) => l.id === lote.id && l.compras.some((o) => o.id === compraId)) ?? null;
}

export const criarLote = (): Promise<never> => naoLigado('Enviar lote numa venda');
export const informarFaturamento = (): Promise<never> => naoLigado('Informar faturamento');

/* ---------- observações do período ---------- */
/** Observações livres dos locais que a pessoa vê; as gerais (sem local) só o admin vê. */
export function observacoesDoPeriodo(u: Usuario, f: FiltroVendas = {}): { em: string; texto: string }[] {
  const locais = locaisDoPedido(u, f.localIds);
  return OBSERVACOES.filter((ob) => (ob.localId === null ? u.perfil === 'admin' : locais.includes(ob.localId)) && noPeriodo(ob.em, f.de, f.ate)).map((ob) => ({ em: ob.em, texto: ob.texto }));
}

/* ---------- equipe ---------- */
/** Usuários e convites das lojas pedidas, dentro das lojas que a pessoa vê. */
export async function listarEquipe(u: Usuario, lojaIds: readonly LojaId[]): Promise<{ usuarios: Usuario[]; convites: Convite[] }> {
  const lojas = lojaIds.filter((l) => u.lojaIds.includes(l));
  return simularRede({
    usuarios: USUARIOS.filter((x) => x.lojaIds.some((l) => lojas.includes(l))),
    convites: CONVITES.filter((c) => lojas.includes(c.lojaId)),
  });
}
export const convidarUsuario = (): Promise<never> => naoLigado('Gerar convite');
export const mudarUsuario = (acao: string): Promise<never> => naoLigado(acao);

/* ---------- transações (pagamentos aos clientes) ---------- */
export async function listarTransacoes(u: Usuario, f: FiltroOperacoes): Promise<Operacao[]> {
  const locais = locaisDoPedido(u, f.localIds);
  const termo = (f.busca ?? '').trim().toLowerCase();
  return simularRede(
    OPERACOES.filter((o) => o.pagamento && locais.includes(o.localId) && noPeriodo(o.pagamento.pagoEm, f.de, f.ate)).filter((o) => {
      if (!termo) return true;
      const cliente = CLIENTES.find((c) => c.id === o.clienteId);
      return o.codigo.toLowerCase().includes(termo) || (cliente?.nome.toLowerCase().includes(termo) ?? false) || (o.pagamento?.idPix.toLowerCase().includes(termo) ?? false);
    }),
  );
}

/* ---------- notificações ---------- */
/** Só as que levam a uma tela que o perfil abre (o atendente não recebe aviso de Clientes ou Envio). */
export async function listarNotificacoes(u: Usuario): Promise<Notificacao[]> {
  return simularRede(
    NOTIFICACOES.filter((n) => {
      const area = areaDaRota(n.link);
      return area !== null && pode(u.perfil, area);
    }),
  );
}
