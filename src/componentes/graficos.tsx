/**
 * Gráficos do Dashboard, em SVG/CSS próprios (sem biblioteca). São decorativos para o leitor de tela (aria-hidden):
 * cada um tem ao lado a TABELA equivalente, como o dashboard do Lukas já faz.
 */
import { reais } from '../utils/formato';

const CORES = ['var(--grafico-1)', 'var(--grafico-2)', 'var(--grafico-3)', 'var(--grafico-4)', 'var(--grafico-5)'];
export const corDaSerie = (i: number): string => CORES[i % CORES.length];

/** Barras horizontais; cada barra pode ser dividida (empilhada) por série (ex.: por local). */
export function BarrasHorizontais({ linhas, series }: { linhas: { nome: string; partes: number[] }[]; series: string[] }) {
  const maior = Math.max(1, ...linhas.map((l) => l.partes.reduce((s, v) => s + v, 0)));
  return (
    <div aria-hidden="true">
      {series.length > 1 && (
        <div className="g-legenda">
          {series.map((s, i) => (
            <span key={s}>
              <i style={{ background: corDaSerie(i) }} />
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="g-barras">
        {linhas.map((l) => {
          const total = l.partes.reduce((s, v) => s + v, 0);
          return (
            <div className="g-barra-linha" key={l.nome} title={`${l.nome}: ${reais(total)}`}>
              <span className="g-barra-nome">{l.nome}</span>
              <div className="g-barra-trilho" style={{ width: `${Math.max(2, (total / maior) * 100)}%` }}>
                {l.partes.map((v, i) => (v > 0 ? <span key={series[i] ?? i} style={{ width: `${(v / total) * 100}%`, background: corDaSerie(i) }} /> : null))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Colunas por dia (peso comprado). */
export function ColunasPorDia({ dias }: { dias: { rotulo: string; valor: number }[] }) {
  const L = 600;
  const A = 180;
  const maior = Math.max(1, ...dias.map((d) => d.valor));
  const largura = dias.length ? L / dias.length : L;
  return (
    <svg className="g-grafico-svg" viewBox={`0 0 ${L} ${A + 20}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1={A} x2={L} y2={A} stroke="var(--linha)" />
      {dias.map((d, i) => {
        const h = (d.valor / maior) * (A - 10);
        return <rect key={d.rotulo} x={i * largura + largura * 0.15} y={A - h} width={largura * 0.7} height={h} rx="2" fill="var(--grafico-1)" />;
      })}
      {dias.length > 0 && (
        <>
          <text x="0" y={A + 16}>
            {dias[0].rotulo}
          </text>
          <text x={L} y={A + 16} textAnchor="end">
            {dias[dias.length - 1].rotulo}
          </text>
        </>
      )}
    </svg>
  );
}
