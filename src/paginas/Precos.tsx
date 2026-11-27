/**
 * Preços (/precos): o preço do grama de cada quilate nas 3 lojas, lido do precos-lojas.txt de verdade (o mesmo
 * módulo e o mesmo cache de 60 s do Avaliar). Só leitura: a edição nesta tela vem com o back.
 */
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw } from 'lucide-react';
import { AVISOS, emCentavos, ErroPreco, LINK_EDITAR_PRECOS, lerTodasAsLojas, QUILATES, type MotivoFalhaPreco } from '../services/precos';
import { LOJAS } from '../services/lojas';
import { textoDoErro } from '../services/simulacao';
import { Aviso, Carregando, Cartao, CELULAR, Pagina, useCarregar, useMidia } from '../componentes/ui';
import type { LojaId, TabelaPrecos } from '../tipos';
import { reais } from '../utils/formato';
import '../estilos/telas.css';

type Leitura = { ok: true; lojas: Record<LojaId, TabelaPrecos | null>; em: number } | { ok: false; motivo: MotivoFalhaPreco | null; texto: string };

/** Nunca rejeita: a falha vira um resultado, para a tela saber o motivo (conexão, limite ou arquivo inválido). */
async function ler(): Promise<Leitura> {
  try {
    const lidos = await lerTodasAsLojas();
    const lojas = {} as Record<LojaId, TabelaPrecos | null>;
    for (const l of LOJAS) {
      const t = lidos.lojas[l.id];
      lojas[l.id] = t ? emCentavos(t) : null;
    }
    return { ok: true, lojas, em: lidos.em };
  } catch (e) {
    return e instanceof ErroPreco ? { ok: false, motivo: e.motivo, texto: e.message } : { ok: false, motivo: null, texto: textoDoErro(e) };
  }
}

const hora = (ms: number): string => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const INVALIDO = 'Bloco inválido no arquivo';

export default function Precos() {
  const [tentativa, setTentativa] = useState(0);
  const { dados, carregando } = useCarregar(ler, String(tentativa));
  const celular = useMidia(CELULAR);
  const regiao = useRef<HTMLDivElement>(null);
  const focarNoFim = useRef(false);

  // depois do "Tentar de novo", o botão pode sumir (deu certo): o foco vai para o resultado
  useEffect(() => {
    if (carregando || !focarNoFim.current) return;
    focarNoFim.current = false;
    regiao.current?.focus();
  }, [carregando]);

  function tentarDeNovo(): void {
    if (carregando) return;
    focarNoFim.current = true;
    setTentativa((n) => n + 1);
  }

  const invalidas = dados?.ok ? LOJAS.filter((l) => !dados.lojas[l.id]) : [];

  return (
    <Pagina titulo="Preços" subtitulo="Preço do grama de ouro em cada loja, em reais.">
      <Cartao titulo="Tabela de hoje">
        <div ref={regiao} tabIndex={-1} className="t-pilha">
          {!dados ? (
            <Carregando texto="Lendo o precos-lojas.txt…" />
          ) : !dados.ok ? (
            <>
              <Aviso tipo="erro">
                <strong>{dados.motivo ? AVISOS[dados.motivo].titulo : 'Não deu para ler os preços'}</strong>
                <br />
                {dados.texto}
              </Aviso>
              <div className="g-linha-acoes">
                <button type="button" className="g-btn" onClick={tentarDeNovo} aria-disabled={carregando || undefined}>
                  <RotateCw aria-hidden="true" /> {carregando ? 'Lendo…' : 'Tentar de novo'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="g-texto2">Lido às {hora(dados.em)}. A leitura vale por até 60 segundos.</p>
              {invalidas.length > 0 && (
                <Aviso tipo="atencao">
                  {invalidas.map((l) => l.nome).join(', ')}: {INVALIDO.toLowerCase()}. O Avaliar {invalidas.length === 1 ? 'dessa loja fica bloqueado' : 'dessas lojas fica bloqueado'} até o arquivo ser corrigido.
                </Aviso>
              )}
              {celular ? <PorLoja lojas={dados.lojas} /> : <Grade lojas={dados.lojas} />}
            </>
          )}
        </div>
      </Cartao>

      <Cartao titulo="Como mudar o preço">
        <div className="t-texto">
          <p>
            Quem muda é o Lukas, no arquivo <code>precos-lojas.txt</code> do GitHub. Depois de salvar, o preço novo aparece em até uns 2 minutos (o GitHub e o sistema guardam a leitura por 60 segundos cada).
          </p>
          <p>
            <a className="t-link-externo" href={LINK_EDITAR_PRECOS} target="_blank" rel="noopener noreferrer">
              Editar o precos-lojas.txt no GitHub (abre em nova aba) <ExternalLink aria-hidden="true" />
            </a>
          </p>
          <ul>
            <li>Um bloco por loja: o nome da loja numa linha, igual ao da tabela acima.</li>
            <li>Embaixo, os 6 quilates ({QUILATES.join(', ')}), um por linha, com o preço do grama em reais.</li>
            <li>
              Formato da linha: <code>24k 550</code> (vale vírgula: <code>24k 550,50</code>).
            </li>
            <li>Faltou, repetiu ou errou um quilate: o bloco inteiro fica inválido e o Avaliar daquela loja não abre a conta.</li>
          </ul>
          <p className="g-texto2">Exemplo de bloco (valores fictícios):</p>
          <pre className="t-codigo">{`${LOJAS[0].nome}\n${QUILATES.map((q, i) => `${q} ${[500, 460, 380, 320, 280, 200][i]}`).join('\n')}`}</pre>
          <p className="g-texto2">Mudar o preço por esta tela vem junto com o back.</p>
        </div>
      </Cartao>
    </Pagina>
  );
}

function Grade({ lojas }: { lojas: Record<LojaId, TabelaPrecos | null> }) {
  return (
    <div className="g-tabela-rolagem">
      <table className="g-tabela">
        <caption className="g-sr">Preço do grama por quilate em cada loja</caption>
        <thead>
          <tr>
            <th scope="col">Quilate</th>
            {LOJAS.map((l) => (
              <th key={l.id} scope="col" className="g-direita">
                {l.nome}
                {!lojas[l.id] && <span className="g-celula-2">{INVALIDO}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {QUILATES.map((q) => (
            <tr key={q}>
              <th scope="row">{q}</th>
              {LOJAS.map((l) => {
                const t = lojas[l.id];
                return (
                  <td key={l.id} className="g-direita">
                    {t ? <span className="g-num">{reais(t[q])}</span> : <span className="g-texto2">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Celular: um bloco por loja, sem rolagem lateral. */
function PorLoja({ lojas }: { lojas: Record<LojaId, TabelaPrecos | null> }) {
  return (
    <div className="t-pilha">
      {LOJAS.map((l) => {
        const t = lojas[l.id];
        return (
          <section key={l.id} aria-labelledby={`preco-loja-${l.id}`}>
            <h3 id={`preco-loja-${l.id}`} style={{ fontSize: 16, marginBottom: 8 }}>
              {l.nome}
            </h3>
            {t ? (
              <dl className="g-dl">
                {QUILATES.map((q) => (
                  <div key={q}>
                    <dt>{q}</dt>
                    <dd className="g-num">{reais(t[q])}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="g-texto2">{INVALIDO}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
