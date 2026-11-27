/** Formatação e validação usadas em várias telas. Tudo em pt-BR. */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const reais = (centavos: number): string => MOEDA.format(centavos / 100);
export const gramas = (cg: number): string => `${(cg / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} g`;
export const dataCurta = (iso: string): string => DATA.format(new Date(iso));
export const dataHora = (iso: string): string => DATA_HORA.format(new Date(iso));
/** 6.99 → "6,99%" (até 2 casas: o imposto do parceiro tem 2). */
export const porcento = (n: number): string => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

export const soDigitos = (s: string): string => s.replace(/\D/g, '');

export function mascaraCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function mascaraCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export const mascaraDocumento = (v: string): string => (soDigitos(v).length > 11 ? mascaraCnpj(v) : mascaraCpf(v));

/**
 * CPF ou CNPJ PARCIAL, para as listas (LGPD): só o miolo à mostra, ***.000.101-** e **.000.000/0001-**.
 * O número completo fica no detalhe (com o back, a abertura do detalhe entra no registro de acesso).
 */
export function documentoParcial(v: string): string {
  const d = soDigitos(v);
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
  return d.length > 4 ? `${'*'.repeat(d.length - 4)}${d.slice(-4)}` : '****';
}

/** Chave PIX PARCIAL, para as listas: e-mail "an***@exemplo.com"; CPF ou CNPJ como documentoParcial; outras, só os 4 últimos. */
export function chavePixParcial(chave: string): string {
  const [nome, dominio] = chave.split('@');
  if (dominio !== undefined) return `${nome.slice(0, 2)}***@${dominio}`;
  const d = soDigitos(chave);
  if (d.length === chave.length && (d.length === 11 || d.length === 14)) return documentoParcial(d);
  return chave.length > 4 ? `****${chave.slice(-4)}` : '****';
}

export function mascaraTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function mascaraCep(v: string): string {
  return soDigitos(v).slice(0, 8).replace(/^(\d{2})(\d{3})(\d)/, '$1.$2-$3');
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split('').reduce((s, c, i) => s + Number(c) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const d1 = digitoVerificador(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

export function cnpjValido(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const d1 = digitoVerificador(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(d[12]) && d2 === Number(d[13]);
}

/** Completa os dois dígitos verificadores de um CPF de 9 dígitos (usado pelos dados de exemplo). */
export function completarCpf(nove: string): string {
  const d1 = digitoVerificador(nove, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(nove + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${nove}${d1}${d2}`;
}

/** Completa os dois dígitos verificadores de um CNPJ de 12 dígitos (usado pelos dados de exemplo). */
export function completarCnpj(doze: string): string {
  const d1 = digitoVerificador(doze, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(doze + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${doze}${d1}${d2}`;
}

export const emailValido = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** dd/mm/aaaa válida e no passado. */
export function dataValida(v: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return false;
  const [, dd, mm, aaaa] = m;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  return d.getFullYear() === Number(aaaa) && d.getMonth() === Number(mm) - 1 && d.getDate() === Number(dd) && d < new Date();
}

export function mascaraData(v: string): string {
  return soDigitos(v).slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/**
 * Peso como o avaliador aceita: até 4 dígitos inteiros e 2 casas, com vírgula ou ponto. Devolve gramas ou null.
 * (Mesma regra do index.html antigo; o preço do precos-lojas.txt usa o mesmo formato.)
 */
export function parsePeso(txt: string): number | null {
  const t = txt.trim().replace('.', ',');
  if (!/^\d{1,4}(,\d{1,2})?$/.test(t)) return null;
  const n = parseFloat(t.replace(',', '.'));
  return n > 0 ? n : null;
}

/** Peso digitado → centésimos de grama (inteiro), ou null. */
export function pesoEmCg(txt: string): number | null {
  const g = parsePeso(txt);
  return g === null ? null : Math.round(g * 100);
}

/**
 * Valor de uma peça em CENTAVOS, com a regra do avaliador: peso × preço do grama, em reais inteiros, com os
 * centavos arredondados para cima (1.498,50 → 1.499). A conta é feita em inteiros (centésimos de grama × centavos):
 * em ponto flutuante, 0,07 × 300 dá 21,000000000000004 e o arredondamento para cima viraria 22.
 */
export const valorPecaCentavos = (pesoCg: number, precoGramaCentavos: number): number => Math.ceil((pesoCg * precoGramaCentavos) / 10000) * 100;
