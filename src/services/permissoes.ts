/**
 * Quem vê o quê (decisão do Pedro em 26/11/2026):
 * - admin (Lukas e Pedro): tudo, nas lojas e nos pontos de compra;
 * - gerente: tudo da própria loja (menos trocar de loja e mexer em admins);
 * - atendente: avaliar e registrar compra (com o cadastro do cliente que a compra precisa).
 * O front só esconde: o back precisa conferir as mesmas regras em cada rota (docs/funcoes-do-back.md).
 */
import type { Local, Perfil, Usuario } from '../tipos';
import { LOCAIS } from '../mocks/dados';

export type Area =
  | 'painel'
  | 'avaliar'
  | 'clientes'
  | 'cliente_novo'
  | 'cliente'
  | 'operacoes'
  | 'operacao_nova'
  | 'operacao'
  | 'envio'
  | 'equipe'
  | 'transacoes'
  | 'precos'
  | 'perfil'
  | 'configuracoes';

const TODOS: readonly Perfil[] = ['admin', 'gerente', 'atendente'];
const GESTAO: readonly Perfil[] = ['admin', 'gerente'];

const QUEM: Record<Area, readonly Perfil[]> = {
  painel: GESTAO,
  avaliar: TODOS,
  clientes: GESTAO,
  cliente_novo: TODOS,
  cliente: GESTAO,
  operacoes: GESTAO,
  operacao_nova: TODOS,
  operacao: GESTAO,
  envio: GESTAO,
  equipe: GESTAO,
  transacoes: GESTAO,
  precos: GESTAO,
  perfil: TODOS,
  configuracoes: TODOS,
};

export const pode = (perfil: Perfil, area: Area): boolean => QUEM[area].includes(perfil);

/** Para onde a pessoa vai depois do login: o atendente cai direto no Avaliar. */
export const inicioDo = (perfil: Perfil): string => (perfil === 'atendente' ? '/avaliar' : '/painel');

/** Perfis que cada um pode convidar: o gerente só convida atendentes da própria loja. */
export const perfisConvidaveis = (perfil: Perfil): Perfil[] => (perfil === 'admin' ? ['atendente', 'gerente', 'admin'] : perfil === 'gerente' ? ['atendente'] : []);

/** Ações de etapa que só o admin faz (aprovar, registrar pagamento, fechar venda). */
export const ehAdmin = (u: Usuario): boolean => u.perfil === 'admin';

/** "Loja atual" do topo: o admin escolhe; os outros ficam na própria loja. */
export type FiltroLoja = 'todas' | '1' | '2' | '3';

/** Locais que a pessoa vê com o filtro atual. Pontos de compra (sem loja) só o admin vê, em "todas". */
export function locaisVisiveis(u: Usuario, filtro: FiltroLoja): Local[] {
  if (u.perfil === 'admin') return filtro === 'todas' ? [...LOCAIS] : LOCAIS.filter((l) => l.lojaId === filtro);
  return LOCAIS.filter((l) => l.lojaId !== null && u.lojaIds.includes(l.lojaId));
}

/**
 * Locais que a pessoa PODE ver, sem o filtro do topo. É o limite que os serviços (src/services/dados.ts) aplicam em
 * toda leitura: o que for de outro local volta como "não encontrado" ou some da lista. O back faz o mesmo em cada rota.
 */
export const locaisPermitidos = (u: Usuario): string[] => locaisVisiveis(u, 'todas').map((l) => l.id);

/** Área de uma rota do app ('/clientes/cli-1' → 'cliente'), para não levar ninguém a uma tela que o perfil não abre. */
export function areaDaRota(caminho: string): Area | null {
  const [, a = '', b] = caminho.split(/[?#]/)[0].split('/');
  if (a === 'clientes') return b === undefined ? 'clientes' : b === 'novo' ? 'cliente_novo' : 'cliente';
  if (a === 'operacoes') return b === undefined ? 'operacoes' : b === 'nova' ? 'operacao_nova' : 'operacao';
  return (Object.keys(QUEM) as Area[]).find((x) => x === a) ?? null;
}
