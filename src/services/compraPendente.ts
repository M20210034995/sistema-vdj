/** Joias que o Avaliar mandou para a Nova operação ("Registrar compra"). Fica na aba (sessionStorage), lida uma vez. */
import type { JoiaAvaliada } from '../tipos';

const CHAVE = 'vdj-joias-para-compra';

export function guardarJoiasParaCompra(joias: JoiaAvaliada[]): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(joias));
  } catch {
    /* sem armazenamento: a nova operação abre vazia */
  }
}

const ehJoia = (x: unknown): x is JoiaAvaliada =>
  typeof x === 'object' && x !== null && typeof (x as JoiaAvaliada).tipo === 'string' && typeof (x as JoiaAvaliada).material === 'string' && typeof (x as JoiaAvaliada).peso === 'string';

/** Lê e apaga. */
export function tirarJoiasParaCompra(): JoiaAvaliada[] {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    sessionStorage.removeItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehJoia) : [];
  } catch {
    return [];
  }
}
