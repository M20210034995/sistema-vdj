/**
 * Tabela responsiva: tabela a partir de 744 px (colunas com `p2` somem abaixo de 1180, no iPad em pé) e lista de
 * cartões no celular, sem rolagem lateral. A linha pode abrir um link (o código/1ª coluna vira o link, para teclado).
 */
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { CELULAR, useMidia, Vazio } from './ui';

export interface Coluna<T> {
  titulo: string;
  celula: (linha: T) => ReactNode;
  /** Some no iPad em pé (744–1179). */
  p2?: boolean;
  direita?: boolean;
  /** Vira o título do cartão no celular. */
  principal?: boolean;
}

interface Props<T> {
  legenda: string;
  colunas: readonly Coluna<T>[];
  linhas: readonly T[];
  chave: (linha: T) => string;
  link?: (linha: T) => string;
  /** Não usado: o nome do link é o texto visível da 1ª coluna (WCAG 2.5.3). Mantido para não quebrar quem passa. */
  rotuloLink?: (linha: T) => string;
  vazio?: { titulo: string; dica?: string };
  rodape?: ReactNode;
  /** A legenda fica visível (gráficos e seções sem título). */
  legendaVisivel?: boolean;
}

export function Tabela<T>({ legenda, colunas, linhas, chave, link, vazio, rodape, legendaVisivel }: Props<T>) {
  const celular = useMidia(CELULAR);
  const navegar = useNavigate();
  if (!linhas.length) return <Vazio titulo={vazio?.titulo ?? 'Nada por aqui'} dica={vazio?.dica} />;

  if (celular) {
    const principal = colunas.find((c) => c.principal) ?? colunas[0];
    return (
      <ul className="g-cartoes" aria-label={legenda}>
        {linhas.map((l) => {
          const conteudo = (
            <>
              {/* no cartão, só o título é link: o nome do link é o texto visível (WCAG 2.5.3) */}
              <span className="g-cartao-titulo">{link ? <Link to={link(l)}>{principal.celula(l)}</Link> : principal.celula(l)}</span>
              <dl>
                {colunas
                  .filter((c) => c !== principal && c.titulo)
                  .map((c) => (
                    <div key={c.titulo} style={{ display: 'contents' }}>
                      <dt>{c.titulo}</dt>
                      <dd>{c.celula(l)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          );
          return <li key={chave(l)}><div>{conteudo}</div></li>;
        })}
      </ul>
    );
  }

  return (
    // Região com foco: se a tabela for mais larga que a tela, dá para rolar pelo teclado (WCAG 2.1.1; axe scrollable-region-focusable).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="g-tabela-rolagem" role="region" aria-label={legenda} tabIndex={0}>
      <table className="g-tabela">
        <caption className={legendaVisivel ? undefined : 'g-sr'}>{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.titulo} scope="col" className={[c.p2 ? 'g-p2' : '', c.direita ? 'g-direita' : ''].filter(Boolean).join(' ') || undefined}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chave(l)} className={link ? 'g-linha-link' : undefined} onClick={link ? () => navegar(link(l)) : undefined}>
              {colunas.map((c, i) => (
                <td key={c.titulo} className={[c.p2 ? 'g-p2' : '', c.direita ? 'g-direita' : ''].filter(Boolean).join(' ') || undefined}>
                  {link && i === 0 ? (
                    <Link to={link(l)} onClick={(e) => e.stopPropagation()}>
                      {c.celula(l)}
                    </Link>
                  ) : (
                    c.celula(l)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape && <tfoot>{rodape}</tfoot>}
      </table>
    </div>
  );
}
