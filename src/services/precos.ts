/**
 * Preço do grama de cada quilate em cada loja: o precos-lojas.txt da raiz do repositório, que o Lukas edita no site
 * do GitHub. Lógica portada sem mudança do avaliador antigo (index.html até a main 8fa0da9):
 * - no github.io, ou com ?api na URL, lê pela API do GitHub, sem login (60 leituras por hora por IP);
 * - fora dele (npm run dev, preview, iPad pela rede), lê o arquivo servido ao lado da página;
 * - reaproveita a última leitura por 60 s; desiste em 8 s; qualquer falha bloqueia (não há valor de reserva).
 * O arquivo tem um bloco por loja: o nome da loja numa linha e, embaixo, "24k 550" (vale "24K: 550" e "24k = 550,50").
 * Cada bloco precisa dos 6 quilates, sem repetir. Um bloco errado bloqueia só aquela loja.
 *
 * Todas as telas usam ESTE módulo (o cache é um só): o Avaliar, a Nova operação e a tela de Preços.
 */
import type { LojaId, Quilate, TabelaPrecos } from '../tipos';
import { parsePeso } from '../utils/formato';
import { LOJAS } from './lojas';

export const MATERIAIS = ['Ouro 24k', 'Ouro 22k', 'Ouro 18k', 'Ouro 16k'] as const;
export const OUTROS_MATERIAL = ['Ouro 14k', 'Ouro 10k'] as const;
/** Os 6 quilates do app: o bloco de cada loja precisa ter exatamente estes. */
export const QUILATES_MATERIAL: readonly string[] = [...MATERIAIS, ...OUTROS_MATERIAL];
export const QUILATES: readonly Quilate[] = ['24k', '22k', '18k', '16k', '14k', '10k'];

export const quilateDoMaterial = (m: string): Quilate => m.replace('Ouro ', '') as Quilate;

const PRECO_ARQUIVO = 'precos-lojas.txt';
const PRECO_API = `https://api.github.com/repos/M20210034995/sistema-vdj/contents/${PRECO_ARQUIVO}?ref=main`;
const usaApi = (): boolean => location.hostname.endsWith('github.io') || new URLSearchParams(location.search).has('api');
/** O arquivo fica na raiz do site (o mesmo caminho de antes), qualquer que seja a rota. */
const urlDoArquivo = (): string => `${import.meta.env.BASE_URL}${PRECO_ARQUIVO}`;
export const PRECO_REUSO = 60 * 1000; // a API só atualiza a cada 60 s
const PRECO_ESPERA = 8 * 1000; // sem resposta nesse tempo, conta como fora do ar

/** Tabela de um bloco como o avaliador usa: {'Ouro 24k': 550, …} em reais. */
export type TabelaAvaliador = Record<string, number>;

export type MotivoFalhaPreco = 'conexao' | 'limite' | 'invalido';

export class ErroPreco extends Error {
  readonly motivo: MotivoFalhaPreco;
  readonly minutos: number | null;
  constructor(motivo: MotivoFalhaPreco, minutos: number | null = null) {
    super(AVISOS[motivo].texto(minutos));
    this.name = 'ErroPreco';
    this.motivo = motivo;
    this.minutos = minutos;
  }
}

export const AVISOS: Record<MotivoFalhaPreco, { titulo: string; texto: (min: number | null) => string }> = {
  conexao: { titulo: 'Sistema fora do ar', texto: () => 'Não foi possível consultar o preço do ouro. Confira a internet e tente de novo.' },
  limite: {
    titulo: 'Limite de consultas atingido',
    texto: (min) =>
      `Esta internet passou do limite de consultas por hora. Tente de novo ${min ? `em ${min} min` : 'daqui a pouco'} ou use outra internet, como outro Wi-Fi ou os dados do celular.`,
  },
  invalido: { titulo: 'Preço do ouro inválido', texto: () => 'Os preços desta loja não estão no formato que o sistema entende. Avise o responsável.' },
};

const LINHA_QUILATE = /^(\d{1,2})\s*k\s*[:=]?\s*(\S+)$/i;

/** A tabela de um bloco, ou null se faltar, repetir ou sobrar alguma linha. */
export function tabelaPrecos(texto: string): TabelaAvaliador | null {
  const tabela: TabelaAvaliador = {};
  for (const linha of texto.split(/\r?\n/)) {
    if (linha.trim() === '') continue;
    const m = linha.trim().match(LINHA_QUILATE);
    if (!m) return null;
    const material = `Ouro ${parseInt(m[1], 10)}k`;
    const preco = parsePeso(m[2]); // mesmo formato do peso: até 4 dígitos, vírgula ou ponto, até 2 casas
    if (!QUILATES_MATERIAL.includes(material) || material in tabela || preco === null) return null;
    tabela[material] = preco;
  }
  return QUILATES_MATERIAL.every((q) => q in tabela) ? tabela : null;
}

/** Nome de loja para comparar com o cabeçalho: sem acento, sem diferenciar maiúsculas, sem espaços extras e sem ":" no fim. */
const normalizaNome = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s*:$/, '')
    .replace(/\s+/g, ' ')
    .trim();

export type TabelasPorLoja = Record<LojaId, TabelaAvaliador | null>;

/**
 * Separa o arquivo em blocos e valida cada um. Linha de quilate antes do primeiro cabeçalho não conta.
 * Qualquer outra linha fecha o bloco. Cabeçalho repetido deixa a loja sem preço.
 */
export function tabelasPorLoja(texto: string): TabelasPorLoja {
  const blocos: Partial<Record<LojaId, string[] | null>> = {};
  let atual: string[] | null = null;
  for (const linha of texto.split(/\r?\n/)) {
    const t = linha.trim();
    if (t === '') continue;
    if (LINHA_QUILATE.test(t)) {
      if (atual) atual.push(t);
      continue;
    }
    const loja = LOJAS.find((l) => normalizaNome(l.nome) === normalizaNome(t));
    atual = null;
    if (!loja) continue;
    if (loja.id in blocos) {
      blocos[loja.id] = null;
      continue;
    }
    atual = [];
    blocos[loja.id] = atual;
  }
  const saida = {} as TabelasPorLoja;
  for (const l of LOJAS) {
    const linhas = blocos[l.id];
    saida[l.id] = linhas ? tabelaPrecos(linhas.join('\n')) : null;
  }
  return saida;
}

let precosLidos: { lojas: TabelasPorLoja; em: number } | null = null;

async function lerArquivo(): Promise<{ lojas: TabelasPorLoja; em: number }> {
  const url = usaApi() ? PRECO_API : urlDoArquivo();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PRECO_ESPERA);
  let r: Response;
  let texto = '';
  try {
    // Não acrescente outros cabeçalhos: fora da lista do GitHub, o navegador faz pré-voo e a API recusa.
    // no-store só no arquivo local: o servidor de teste não manda Cache-Control.
    r = await fetch(url, { headers: { Accept: 'application/vnd.github.raw+json' }, cache: url === PRECO_API ? 'default' : 'no-store', signal: ctrl.signal });
    if (r.ok) texto = await r.text();
  } catch (e) {
    console.error('Preço: sem resposta de', url, e);
    throw new ErroPreco('conexao');
  } finally {
    clearTimeout(timer);
  }
  if (!r.ok) {
    if ((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0') {
      const reset = Number(r.headers.get('x-ratelimit-reset')) * 1000;
      throw new ErroPreco('limite', reset ? Math.min(60, Math.max(1, Math.ceil((reset - Date.now()) / 60000))) : null);
    }
    console.error('Preço: resposta', r.status, 'de', url);
    throw new ErroPreco('conexao');
  }
  precosLidos = { lojas: tabelasPorLoja(texto), em: Date.now() };
  return precosLidos;
}

/**
 * A tabela da loja `id`. Reaproveita a última leitura por 60 s se ela tiver a tabela dessa loja; se não tiver
 * (bloco errado), lê de novo, para o "Tentar de novo" pegar o arquivo corrigido.
 */
export async function lerPrecos(id: LojaId): Promise<TabelaAvaliador> {
  if (precosLidos && Date.now() - precosLidos.em < PRECO_REUSO && precosLidos.lojas[id]) return precosLidos.lojas[id];
  const lidos = await lerArquivo();
  const tabela = lidos.lojas[id];
  if (!tabela) {
    console.error(`Preço: o bloco da loja ${id} está inválido ou faltando.`);
    throw new ErroPreco('invalido');
  }
  return tabela;
}

/** As 3 lojas de uma vez (tela de Preços), com o mesmo cache de 60 s. */
export async function lerTodasAsLojas(): Promise<{ lojas: TabelasPorLoja; em: number }> {
  if (precosLidos && Date.now() - precosLidos.em < PRECO_REUSO) return precosLidos;
  return lerArquivo();
}

/** Tabela do avaliador (reais) → tabela do sistema (centavos por quilate). */
export function emCentavos(t: TabelaAvaliador): TabelaPrecos {
  const saida = {} as TabelaPrecos;
  for (const q of QUILATES) saida[q] = Math.round(t[`Ouro ${q}`] * 100);
  return saida;
}

/** Link para o Lukas editar o arquivo no GitHub. */
export const LINK_EDITAR_PRECOS = 'https://github.com/M20210034995/sistema-vdj/edit/main/precos-lojas.txt';
