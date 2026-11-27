/** Leitura de valores digitados (reais, gramas, datas do input date) e o CSV baixado no navegador. */

/** "1.234,56", "1234,56" ou "1234.56" → centavos (inteiro); null se não for um valor válido. */
export function reaisEmCentavos(txt: string): number | null {
  let t = txt.replace(/R\$|\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

/** "152,40" ou "152.4" → centésimos de grama (inteiro, maior que zero); null se não for um peso válido. */
export function gramasEmCg(txt: string): number | null {
  const t = txt.trim().replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  const cg = Math.round(parseFloat(t) * 100);
  return cg > 0 ? cg : null;
}

/** Hoje no formato do input date (aaaa-mm-dd), no fuso do aparelho. */
export function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Junta itens como numa frase: "a, b e c". */
export function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/**
 * CSV com ";" (o Excel em português abre direto). Célula que começa com = + - @ ganha um apóstrofo, para a planilha
 * não executar fórmula vinda dos dados.
 */
export function montarCsv(linhas: readonly (readonly string[])[]): string {
  const celula = (v: string): string => {
    const seguro = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return linhas.map((l) => l.map(celula).join(';')).join('\r\n');
}

/** Baixa um texto como arquivo, sem servidor (Blob + link temporário). */
export function baixarTexto(nome: string, conteudo: string, tipo = 'text/csv;charset=utf-8'): void {
  // O BOM faz o Excel ler os acentos em UTF-8.
  const url = URL.createObjectURL(new Blob(['﻿', conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
