/**
 * Paridade com o avaliador antigo (o index.html da main): o código portado tem de dar o MESMO resultado.
 * Lê o index.html antigo direto do git (git show main:index.html) e compara as funções, sem rodar o navegador.
 * Não descobre nem mostra a senha: só confere que o embaralhamento e o hash guardado são os mesmos.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { embaralha, LOJA_CHAVE, SENHA_LOJA, SENHA_DIGITOS } from '../src/services/lojas';
import { tabelasPorLoja } from '../src/services/precos';

const antigo = execSync('git show main:index.html', { encoding: 'utf8' });
const script = antigo.slice(antigo.indexOf('<script>') + 8, antigo.indexOf('</script>'));
/** Extrai uma função de topo do script antigo pelo nome (até a próxima linha que fecha a função). */
function funcaoAntiga(nome: string): string {
  const ini = script.indexOf(`function ${nome}(`);
  const fim = script.indexOf('\n}\n', ini);
  return script.slice(ini, fim + 2);
}
const constante = (nome: string): string => {
  const m = new RegExp(`const ${nome} = ([^;]+);`).exec(script);
  if (!m) throw new Error(`sem ${nome}`);
  return m[1];
};

test('senha: mesma chave do aparelho, mesmo hash guardado e mesmo embaralhamento', () => {
  expect(LOJA_CHAVE).toBe(JSON.parse(constante('LOJA_CHAVE').replace(/'/g, '"')));
  expect(SENHA_LOJA).toBe(JSON.parse(constante('SENHA_LOJA').replace(/'/g, '"')));
  expect(String(SENHA_DIGITOS)).toBe(constante('SENHA_DIGITOS'));
  const embaralhaAntigo = new Function(`${funcaoAntiga('embaralha')}; return embaralha;`)() as (s: string) => string;
  for (const s of ['0000', '1234', '9876', '4321', 'abc', '']) expect(embaralha(s)).toBe(embaralhaAntigo(s));
});

test('preços: o arquivo real e casos inválidos dão as mesmas tabelas do código antigo', () => {
  const montarAntigo = new Function(
    `const LOJAS = ${constante('LOJAS')};
     const MATERIAIS = ${constante('MATERIAIS')};
     const OUTROS_MATERIAL = ${constante('OUTROS_MATERIAL')};
     const QUILATES = [...MATERIAIS, ...OUTROS_MATERIAL];
     const LINHA_QUILATE = ${constante('LINHA_QUILATE')};
     ${funcaoAntiga('parsePeso')}
     ${funcaoAntiga('tabelaPrecos')}
     const normalizaNome = ${constante('normalizaNome')};
     ${funcaoAntiga('tabelasPorLoja')}
     return tabelasPorLoja;`,
  ) as () => (t: string) => Record<string, Record<string, number> | null>;
  const tabelasAntigo = montarAntigo();
  const real = readFileSync(new URL('../precos-lojas.txt', import.meta.url), 'utf8');
  const casos = [
    real,
    real.replace('Loja CTC', 'Loja CTX'), // cabeçalho com erro: só a CTC fica sem preço
    real.replace(/\n24k 400\n/, '\n'), // falta um quilate na ZN
    real.replace('18k 300', '18k R$ 300'), // preço mal escrito
    `${real}\nLoja ZN\n24k 1`, // cabeçalho repetido
    '24k 550\n22k 450\n18k 300\n16k 150\n14k 120\n10k 70', // formato antigo, sem cabeçalho
    'loja zn:\n24K: 550\n22k = 450,50\n18k 300\n16k 150\n14k 120\n10k 70',
  ];
  for (const t of casos) expect(tabelasPorLoja(t)).toEqual(tabelasAntigo(t));
  // e o arquivo real tem as 3 lojas válidas hoje
  expect(Object.values(tabelasPorLoja(real)).every(Boolean)).toBe(true);
});
