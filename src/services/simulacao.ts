/** Simulação de back enquanto ele não existe: latência e o aviso "ainda não está ligado". */

/**
 * Espera artificial (ms), para as telas mostrarem o "carregando" como fariam com a API.
 * Padrão: 200 no `npm run dev` e 0 no build. VITE_LATENCIA_API_MS muda o valor; 0 desliga.
 */
// Fora do Vite (testes de unidade no Node), import.meta.env não existe: sem latência.
const ENV: Partial<ImportMetaEnv> = import.meta.env ?? {};
const LATENCIA_MS = Number(ENV.VITE_LATENCIA_API_MS ?? (ENV.DEV ? 200 : 0)) || 0;

/** Devolve uma cópia do valor depois da espera, como uma resposta HTTP: quem recebe não altera o "banco". */
export function simularRede<T>(valor: T): Promise<T> {
  const copia = structuredClone(valor);
  if (LATENCIA_MS <= 0) return Promise.resolve(copia);
  return new Promise((ok) => setTimeout(() => ok(copia), LATENCIA_MS));
}

/** Toda ação que grava algo cai aqui enquanto o back não existe. */
export class NaoLigadoError extends Error {
  constructor(acao: string) {
    super(`${acao}: os dados estão certos, mas isto ainda não está ligado ao back. Nada foi salvo.`);
    this.name = 'NaoLigadoError';
  }
}

export async function naoLigado(acao: string): Promise<never> {
  await simularRede(null);
  throw new NaoLigadoError(acao);
}

/** Texto de um erro qualquer, para mostrar na tela. */
export const textoDoErro = (e: unknown): string => (e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.');
