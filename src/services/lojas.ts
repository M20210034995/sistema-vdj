/**
 * Lojas e LOJA DO APARELHO, iguais ao avaliador antigo (index.html até a main 8fa0da9).
 * Não mude a chave do localStorage, o hash da senha nem os ids: os 3 tablets já estão configurados com eles.
 *
 * Cada aparelho fica numa loja e usa o bloco dela no precos-lojas.txt. Na primeira vez, a loja vem do link
 * (?loja=2) ou de uma escolha obrigatória, sem senha. Depois, a salva vale mais que o link, e trocar exige a senha
 * de 4 dígitos (5 toques no logo do Avaliar). Quando houver login de verdade, o Lukas decide se a senha continua.
 */
import type { Loja, LojaId } from '../tipos';

/** O nome é o cabeçalho do bloco no precos-lojas.txt. Renomear: mudar aqui e no arquivo, no mesmo commit. */
export const LOJAS: readonly Loja[] = [
  { id: '1', nome: 'Loja ZN' },
  { id: '2', nome: 'Loja CTC' },
  { id: '3', nome: 'Loja Nova Parnamirim' },
];

export const LOJA_CHAVE = 'vdj-loja';

/**
 * Senha da troca de loja: 4 dígitos, guardada embaralhada (embaralha). Para trocar: no console, embaralha('nova senha')
 * e pôr o resultado aqui. Se o tamanho mudar, SENHA_DIGITOS muda junto.
 */
export const SENHA_LOJA = '1350gl71src';
export const SENHA_DIGITOS = 4;

let lojaEmMemoria: LojaId | null = null; // para quando o navegador não deixa gravar

export const lojaValida = (id: string | null | undefined): LojaId | null => (LOJAS.find((l) => l.id === id)?.id ?? null);
export const nomeDaLoja = (id: string | null | undefined): string => LOJAS.find((l) => l.id === id)?.nome ?? '';

export function lojaSalva(): LojaId | null {
  try {
    return lojaValida(localStorage.getItem(LOJA_CHAVE));
  } catch {
    return null;
  }
}

/** O ?loja= fica antes do # (rotas por hash), então location.search continua valendo. */
export const lojaDoLink = (): LojaId | null => lojaValida(new URLSearchParams(location.search).get('loja'));

/** Relê o armazenamento a cada uso: no Android, cada toque no atalho pode abrir outra aba. */
export const lojaAtual = (): LojaId | null => lojaSalva() ?? lojaEmMemoria;

export function salvarLoja(id: LojaId): void {
  lojaEmMemoria = id;
  try {
    localStorage.setItem(LOJA_CHAVE, id);
  } catch (e) {
    console.error('Loja: não deu para salvar no aparelho; vale até fechar.', e);
  }
}

/** Na abertura: vale a salva; senão, a do link (e salva). A escolha obrigatória fica com o Avaliar. */
export function configurarLojaNaAbertura(): void {
  const salva = lojaSalva();
  if (salva) lojaEmMemoria = salva;
  else {
    const doLink = lojaDoLink();
    if (doLink) salvarLoja(doLink);
  }
}

/**
 * Embaralha a senha (cyrb53, 53 bits): o código guarda só o resultado. Com 4 dígitos, testar as 10 mil combinações
 * leva milissegundos: não é segurança, só evita a troca no balcão. Sem crypto.subtle, que não existe em http://IP.
 */
export function embaralha(txt: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < txt.length; i++) {
    const c = txt.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export const senhaConfere = (digitada: string): boolean => embaralha(digitada) === SENHA_LOJA;
