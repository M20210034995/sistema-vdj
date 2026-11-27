/**
 * Painel (Dashboard) no formato do dashboard do Lukas ("Compras de ouro"), na ordem dele:
 * resumo e 3 cartões → por local → por comprador → quem pagou → ao longo do tempo → vendas → lotes enviados →
 * ouro em estoque → ouro guardado → observações → todos os registros. Cada gráfico tem a tabela equivalente ao lado.
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { montarPainel, alertasDaCompra, precoPorGrama, teoresDaCompra, type LinhaAgrupada } from '../services/painel';
import { nomeDoLocal, nomeDoPagador, nomeDosCompradores, ROTULO_SITUACAO, type ResultadoLote, type ResultadoVenda } from '../services/dados';
import { Aviso, Cartao, Carregando, Pagina, Paginador, Segmentado, Tag, useCarregar, usePaginacao, type Tom } from '../componentes/ui';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { BarrasHorizontais, ColunasPorDia } from '../componentes/graficos';
import { dataCurta, dataHora, gramas, reais } from '../utils/formato';
import { juntar } from '../utils/entrada';
import { intervalo, PERIODOS, rotuloDoPeriodo, type Periodo } from '../utils/periodo';
import type { Operacao, SituacaoCompra } from '../tipos';

const SECOES = [
  ['por-local', 'Por local'],
  ['por-comprador', 'Por comprador'],
  ['quem-pagou', 'Quem pagou'],
  ['tempo', 'Ao longo do tempo'],
  ['vendas', 'Vendas'],
  ['lotes', 'Lotes enviados'],
  ['estoque', 'Ouro em estoque'],
  ['guardado', 'Ouro guardado'],
  ['observacoes', 'Observações'],
  ['registros', 'Todos os registros'],
] as const;

const ddmm = (chave: string): string => `${chave.slice(8, 10)}/${chave.slice(5, 7)}`;
const opcional = (c: number | null): string => (c === null ? 'a informar' : reais(c));
/** Venda com compras de outra loja: o resultado é da venda inteira e fica com o admin. */
const SoAdmin = () => <span className="g-so-admin">só o admin vê</span>;
const resultado = (visivel: boolean, c: number | null): ReactNode => (visivel ? opcional(c) : <SoAdmin />);
const situacaoDaVenda = (v: ResultadoVenda) => <Tag tom={v.situacao === 'aberta' ? 'aviso' : 'sucesso'}>{v.situacao === 'aberta' ? 'Aberta' : 'Fechada'}</Tag>;

/**
 * Colunas da tabela de vendas. Quando nenhuma venda da lista tem o resultado visível (gerente com vendas de várias
 * lojas), as colunas de dinheiro viram uma só, "Faturamento e lucros: só o admin vê", e a tabela cabe no iPad.
 */
function colunasDeVendas(algumResultado: boolean): Coluna<ResultadoVenda>[] {
  const inicio: Coluna<ResultadoVenda>[] = [
    { titulo: 'Venda', celula: (v) => v.codigo, principal: true },
    { titulo: 'Data', celula: (v) => dataCurta(v.data) },
    { titulo: 'Comprador da venda', celula: (v) => v.parceiro?.nome ?? '—', p2: true },
  ];
  const meio: Coluna<ResultadoVenda>[] = algumResultado
    ? [
        { titulo: 'Faturamento', celula: (v) => resultado(v.resultadoVisivel, v.faturamentoCentavos), direita: true },
        { titulo: 'Custo do parceiro', celula: (v) => reais(v.custoDoParceiroCentavos), direita: true, p2: true },
        { titulo: 'Entra em caixa', celula: (v) => resultado(v.resultadoVisivel, v.entraEmCaixaCentavos), direita: true },
        { titulo: 'Lucro bruto', celula: (v) => resultado(v.resultadoVisivel, v.lucroBrutoCentavos), direita: true, p2: true },
        { titulo: 'Lucro líquido', celula: (v) => resultado(v.resultadoVisivel, v.lucroLiquidoCentavos), direita: true },
      ]
    : [
        { titulo: 'Custo (sua parte)', celula: (v) => reais(v.custoMetalCentavos), direita: true },
        { titulo: 'Custo do parceiro', celula: (v) => reais(v.custoDoParceiroCentavos), direita: true, p2: true },
        { titulo: 'Faturamento e lucros', celula: () => <SoAdmin /> },
      ];
  return [...inicio, ...meio, { titulo: 'Situação', celula: situacaoDaVenda }];
}

/** Colunas dos lotes. Sem nenhum resultado visível, "Valor de venda" e "Lucro do lote" saem (a descrição avisa). */
function colunasDeLotes(algumResultado: boolean): Coluna<ResultadoLote>[] {
  const colunas: Coluna<ResultadoLote>[] = [
    { titulo: 'Venda', celula: (l) => l.vendaCodigo, principal: true },
    {
      titulo: 'Compras de origem',
      celula: (l) => (
        <span className="g-tags">
          {l.compras.map((o) => (
            <Link key={o.id} to={`/operacoes/${o.id}`}>
              {o.codigo}
            </Link>
          ))}
        </span>
      ),
    },
    { titulo: 'Peso comprado', celula: (l) => gramas(l.pesoCompradoCg), direita: true, p2: true },
    {
      titulo: 'Peso enviado',
      celula: (l) => (
        <>
          {l.pesoEnviadoCg === null ? <SoAdmin /> : gramas(l.pesoEnviadoCg)}
          {l.derretido && <span className="g-celula-2">derretido{l.teorApuradoPct !== null ? `, teor ${l.teorApuradoPct.toLocaleString('pt-BR')}%` : ''}</span>}
        </>
      ),
      direita: true,
    },
    { titulo: 'Diferença', celula: (l) => (l.diferencaCg === null ? <SoAdmin /> : gramas(l.diferencaCg)), direita: true },
    { titulo: 'Pago por', celula: (l) => juntar([...new Set(l.compras.map((o) => nomeDoPagador(o.pagadorId)))]), p2: true },
    { titulo: 'Custo', celula: (l) => reais(l.custoCentavos), direita: true },
    { titulo: 'Custo do parceiro', celula: (l) => reais(l.custoDoParceiroCentavos), direita: true, p2: true },
  ];
  if (!algumResultado) return colunas;
  return [
    ...colunas,
    { titulo: 'Valor de venda', celula: (l) => resultado(l.resultadoVisivel, l.valorVendaCentavos), direita: true, p2: true },
    { titulo: 'Lucro do lote', celula: (l) => resultado(l.resultadoVisivel, l.lucroCentavos), direita: true },
  ];
}
const pesoOuSem = (o: Operacao): string => (o.pesoCg === null ? 'sem peso' : gramas(o.pesoCg));
const TOM_SITUACAO: Record<SituacaoCompra, Tom> = { estoque: 'info', lote: 'sucesso', guardada: 'neutra', negociacao: 'aviso' };

/** Colunas de uma tabela agrupada (comprador ou pagador): nome, peso, valor e uma coluna por local. */
function colunasAgrupadas(primeira: string, locais: { id: string; nome: string }[]): Coluna<LinhaAgrupada>[] {
  return [
    { titulo: primeira, celula: (l) => l.nome, principal: true },
    { titulo: 'Peso', celula: (l) => gramas(l.pesoCg), direita: true },
    { titulo: 'Valor', celula: (l) => reais(l.valorCentavos), direita: true },
    ...locais.map((loc) => ({ titulo: loc.nome, celula: (l: LinhaAgrupada) => (l.porLocal[loc.id] ? reais(l.porLocal[loc.id]) : '—'), direita: true, p2: true })),
  ];
}

function CartaoNumero({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="g-cartao">
      <p className="g-kpi-rotulo">{rotulo}</p>
      <p className="g-kpi-valor">{valor}</p>
      <p className="g-kpi-nota">{nota}</p>
    </div>
  );
}

function irPara(id: string): void {
  const alvo = document.getElementById(id);
  alvo?.scrollIntoView({ behavior: 'smooth' });
  alvo?.focus({ preventScroll: true });
}

export default function Painel() {
  const usuario = useUsuario();
  const { localIds, locais } = useSessao();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const i = intervalo(periodo, inicio, fim);
  const { dados: p, carregando, erro } = useCarregar(() => montarPainel(usuario, localIds, i), JSON.stringify([usuario.id, localIds, periodo, inicio, fim]));
  const registros = usePaginacao<Operacao>(p?.registros ?? [], 25);

  const nomesLocais = (p?.locais ?? []).map((l) => l.nome);
  const partes = (l: LinhaAgrupada): number[] => (p?.locais ?? []).map((loc) => l.porLocal[loc.id] ?? 0);

  return (
    <Pagina titulo="Painel" subtitulo={`Compras de ouro · ${rotuloDoPeriodo(periodo, i)}`}>
      <div className="g-filtros">
        <Segmentado rotulo="Período" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
        {periodo === 'personalizado' && (
          <>
            <div className="g-campo">
              <label htmlFor="painel-de">De</label>
              <input id="painel-de" className="g-input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="g-campo">
              <label htmlFor="painel-ate">Até</label>
              <input id="painel-ate" className="g-input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {carregando && !p && <Carregando />}
      {p && (
        <>
          <section className="g-cartao" aria-labelledby="resumo-titulo" aria-busy={carregando}>
            <h2 id="resumo-titulo" className="g-sr">
              Resumo do período
            </h2>
            <p className="g-resumo-frase">
              {i.de && i.ate ? `De ${dataCurta(i.de.toISOString())} a ${dataCurta(i.ate.toISOString())}` : 'No período'} foram registrados <strong>{gramas(p.resumo.pesoCg)}</strong> de ouro e{' '}
              <strong>{reais(p.resumo.valorCentavos)}</strong> pagos, em {p.resumo.compras} {p.resumo.compras === 1 ? 'compra paga' : 'compras pagas'}.
            </p>
            <p className="g-kpi-nota">
              Atualizado em {dataHora(p.atualizadoEm)}. Locais: {locais.map((l) => l.nome).join(', ')}.
            </p>
          </section>

          <Aviso tipo="atencao">
            Os totais contam só as compras pagas. As em negociação ficam fora dos totais, mas aparecem no cartão &quot;Em negociação&quot; e em &quot;Todos os registros&quot;. Regra a confirmar com o Lukas.
          </Aviso>

          <div className="g-grade g-grade-4">
            <CartaoNumero rotulo="Peso total registrado" valor={gramas(p.resumo.pesoCg)} nota={`Soma das compras pagas com peso${p.resumo.semPeso ? `; ${p.resumo.semPeso} sem peso` : ''}`} />
            <CartaoNumero rotulo="Valor total comprado" valor={reais(p.resumo.valorCentavos)} nota="Compras pagas no período, nos locais visíveis" />
            <CartaoNumero rotulo="Preço médio pago" valor={p.resumo.precoMedioCentavos === null ? '—' : `${reais(p.resumo.precoMedioCentavos)}/g`} nota="Só nas compras pagas com peso" />
            <CartaoNumero
              rotulo="Em negociação"
              valor={reais(p.negociacao.valorCentavos)}
              nota={`${p.negociacao.compras} ${p.negociacao.compras === 1 ? 'compra' : 'compras'} ainda sem pagamento, fora dos totais (a confirmar com o Lukas)`}
            />
          </div>

          <nav aria-label="Seções do painel" className="g-linha-acoes">
            {SECOES.map(([id, rotulo]) => (
              <a
                key={id}
                href={`#${id}`}
                className="g-btn g-btn-fantasma"
                onClick={(e) => {
                  e.preventDefault();
                  irPara(id);
                }}
              >
                {rotulo}
              </a>
            ))}
          </nav>

          <Cartao titulo="Por local" id="por-local">
            <figure className="g-figura">
              <figcaption>Valor comprado em cada local. A tabela ao lado tem os mesmos números.</figcaption>
              <BarrasHorizontais linhas={p.porLocal.map((l) => ({ nome: l.nome, partes: [l.valorCentavos] }))} series={['Valor']} />
              <Tabela
                legenda="Compras por local"
                linhas={p.porLocal}
                chave={(l) => l.chave}
                colunas={[
                  { titulo: 'Local', celula: (l) => l.nome, principal: true },
                  { titulo: 'Peso', celula: (l) => gramas(l.pesoCg), direita: true },
                  { titulo: 'Valor', celula: (l) => reais(l.valorCentavos), direita: true },
                  { titulo: 'Sem peso', celula: (l) => l.semPeso, direita: true },
                ]}
                vazio={{ titulo: 'Nenhuma compra no período' }}
              />
            </figure>
          </Cartao>

          <Cartao titulo="Por comprador" id="por-comprador" descricao="Quem fez a compra (pode ser uma dupla), dividido pelo local.">
            <figure className="g-figura">
              <figcaption>Barras empilhadas por local. A tabela ao lado tem os mesmos números.</figcaption>
              <BarrasHorizontais linhas={p.porComprador.map((l) => ({ nome: l.nome, partes: partes(l) }))} series={nomesLocais} />
              <Tabela legenda="Compras por comprador" linhas={p.porComprador} chave={(l) => l.chave} colunas={colunasAgrupadas('Comprador', p.locais)} vazio={{ titulo: 'Nenhuma compra no período' }} />
            </figure>
          </Cartao>

          <Cartao titulo="Quem pagou" id="quem-pagou" descricao="Quem pôs o dinheiro: a VJ, um sócio ou um parceiro (o custo pago pelo parceiro fica com ele).">
            <figure className="g-figura">
              <figcaption>Barras empilhadas por local. A tabela ao lado tem os mesmos números.</figcaption>
              <BarrasHorizontais linhas={p.porPagador.map((l) => ({ nome: l.nome, partes: partes(l) }))} series={nomesLocais} />
              <Tabela legenda="Compras por pagador" linhas={p.porPagador} chave={(l) => l.chave} colunas={colunasAgrupadas('Pagador', p.locais)} vazio={{ titulo: 'Nenhuma compra no período' }} />
            </figure>
          </Cartao>

          <Cartao titulo="Ao longo do tempo" id="tempo" descricao="A semana vai de segunda a domingo (a loja do shopping abre aos domingos).">
            <figure className="g-figura">
              <figcaption>Peso comprado por dia; a tabela por dia fica logo abaixo do gráfico, e a de semanas, ao lado.</figcaption>
              <div>
                <ColunasPorDia dias={p.porDia.map((d) => ({ rotulo: ddmm(d.dia), valor: d.pesoCg }))} />
                <details>
                  <summary>Ver a tabela por dia</summary>
                  <Tabela
                    legenda="Peso comprado por dia"
                    linhas={p.porDia}
                    chave={(d) => d.dia}
                    colunas={[
                      { titulo: 'Dia', celula: (d) => ddmm(d.dia), principal: true },
                      { titulo: 'Peso', celula: (d) => gramas(d.pesoCg), direita: true },
                      { titulo: 'Valor', celula: (d) => reais(d.valorCentavos), direita: true },
                    ]}
                  />
                </details>
              </div>
              <Tabela
                legenda="Semanas (segunda a domingo)"
                linhas={p.semanas}
                chave={(s) => s.inicio}
                colunas={[
                  {
                    titulo: 'Semana',
                    celula: (s) => (
                      <>
                        {ddmm(s.inicio)} a {ddmm(s.fim)} {s.emAndamento && <Tag tom="aviso">em andamento</Tag>}
                      </>
                    ),
                    principal: true,
                  },
                  { titulo: 'Compras', celula: (s) => s.compras, direita: true },
                  { titulo: 'Peso', celula: (s) => gramas(s.pesoCg), direita: true },
                  { titulo: 'Valor', celula: (s) => reais(s.valorCentavos), direita: true },
                ]}
                vazio={{ titulo: 'Nenhuma compra no período' }}
              />
            </figure>
          </Cartao>

          <Cartao
            titulo="Vendas"
            id="vendas"
            descricao="Vendas a parceiros com data no período. Lucro bruto = faturamento − custo do metal; lucro líquido = bruto − frete − imposto. Entra em caixa = faturamento − custo das compras pagas por parceiro (compra a compra)."
          >
            {p.vendas.some((v) => !v.resultadoVisivel) && (
              <p className="g-secao-desc">Vendas com compras de outras lojas: você vê só as compras da sua loja; faturamento, lucros e o que entra em caixa só o admin vê.</p>
            )}
            <div className="g-grade g-grade-4" style={{ marginBottom: 16 }}>
              <CartaoNumero rotulo="Peso enviado" valor={p.cartoesVendas.pesoEnviadoCg === null ? 'Só o admin vê' : gramas(p.cartoesVendas.pesoEnviadoCg)} nota="Soma de todos os lotes" />
              <CartaoNumero rotulo="Custo das compras nos lotes" valor={reais(p.cartoesVendas.custoCentavos)} nota="O que foi pago pelo ouro que saiu" />
              <CartaoNumero rotulo="Entra em caixa" valor={p.cartoesVendas.entraEmCaixaCentavos === null ? 'Só o admin vê' : reais(p.cartoesVendas.entraEmCaixaCentavos)} nota="Vendas fechadas: faturamento − custo pago por parceiro" />
              <CartaoNumero rotulo="Vendas em aberto" valor={String(p.cartoesVendas.abertas)} nota="Ainda sem faturamento" />
            </div>
            <Tabela
              legenda="Vendas do período"
              legendaVisivel
              linhas={p.vendas}
              chave={(v) => v.id}
              colunas={colunasDeVendas(p.vendas.some((v) => v.resultadoVisivel))}
              vazio={{ titulo: 'Nenhuma venda no período' }}
            />
          </Cartao>

          <Cartao
            titulo="Lotes enviados"
            id="lotes"
            descricao={`De quais compras saiu o ouro de cada venda. A diferença é a perda na fundição.${p.lotes.some((l) => l.parcial) ? ' Num lote com compras de outras lojas, você vê só as da sua.' : ''}${p.lotes.length && !p.lotes.some((l) => l.resultadoVisivel) ? ' Valor de venda e lucro dos lotes: só o admin vê.' : ''}`}
          >
            <Tabela
              legenda="Lotes enviados"
              linhas={p.lotes}
              chave={(l) => l.id}
              colunas={colunasDeLotes(p.lotes.some((l) => l.resultadoVisivel))}
              vazio={{ titulo: 'Nenhum lote no período' }}
            />
          </Cartao>

          <Cartao titulo="Ouro em estoque" id="estoque" descricao="Compras do período que ainda não saíram em nenhuma venda nem foram guardadas.">
            <Tabela
              legenda="Ouro em estoque"
              linhas={p.estoque}
              chave={(o) => o.id}
              link={(o) => `/operacoes/${o.id}`}
              rotuloLink={(o) => `Abrir ${o.codigo}`}
              colunas={[
                { titulo: 'Código', celula: (o) => o.codigo, principal: true },
                { titulo: 'Data', celula: (o) => dataCurta(o.criadoEm) },
                { titulo: 'Local', celula: (o) => nomeDoLocal(o.localId) },
                { titulo: 'Peso', celula: pesoOuSem, direita: true },
                { titulo: 'Valor', celula: (o) => reais(o.totalCentavos), direita: true },
                { titulo: 'Teores', celula: teoresDaCompra, p2: true },
              ]}
              vazio={{ titulo: 'Nenhum ouro em estoque no período' }}
            />
          </Cartao>

          <Cartao titulo="Ouro guardado" id="guardado" descricao="Ouro baixo que o dono guardou para uso pessoal: não está à venda e não entra no estoque, mas conta nas compras.">
            <p style={{ marginBottom: 12 }}>
              Total guardado: <strong>{gramas(p.guardado.pesoCg)}</strong>, {reais(p.guardado.valorCentavos)}.
            </p>
            <Tabela
              legenda="Ouro guardado"
              linhas={p.guardado.compras}
              chave={(o) => o.id}
              colunas={[
                { titulo: 'Data', celula: (o) => dataCurta(o.criadoEm), principal: true },
                { titulo: 'Local', celula: (o) => nomeDoLocal(o.localId) },
                { titulo: 'Peso', celula: pesoOuSem, direita: true },
                { titulo: 'Teor', celula: teoresDaCompra },
                { titulo: 'Pagou', celula: (o) => nomeDoPagador(o.pagadorId), p2: true },
                { titulo: 'Valor', celula: (o) => reais(o.totalCentavos), direita: true },
                { titulo: 'Observação', celula: (o) => o.observacao || '—', p2: true },
              ]}
              vazio={{ titulo: 'Nada guardado no período' }}
            />
          </Cartao>

          <Cartao titulo="Observações sobre os dados" id="observacoes">
            {p.observacoes.length ? (
              <ul className="g-tempo">
                {p.observacoes.map((o) => (
                  <li key={o.em + o.texto}>
                    {o.texto}
                    <small>{dataCurta(o.em)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="g-texto2">Nenhuma observação no período.</p>
            )}
          </Cartao>

          <Cartao titulo="Todos os registros" id="registros" descricao="Todas as compras do período, pagas e em negociação (estas ficam fora dos totais), com as marcas automáticas.">
            <Tabela
              legenda="Todos os registros"
              linhas={registros.pagina}
              chave={(o) => o.id}
              link={(o) => `/operacoes/${o.id}`}
              rotuloLink={(o) => `Abrir a compra de ${dataCurta(o.criadoEm)}, ${o.codigo}`}
              colunas={[
                { titulo: 'Data', celula: (o) => dataCurta(o.criadoEm), principal: true },
                { titulo: 'Local', celula: (o) => nomeDoLocal(o.localId) },
                { titulo: 'Situação', celula: (o) => <Tag tom={TOM_SITUACAO[o.situacao]}>{ROTULO_SITUACAO[o.situacao]}</Tag> },
                { titulo: 'Comprador', celula: (o) => nomeDosCompradores(o.compradorIds), p2: true },
                { titulo: 'Pagou', celula: (o) => nomeDoPagador(o.pagadorId), p2: true },
                { titulo: 'Peso', celula: pesoOuSem, direita: true },
                { titulo: 'Valor', celula: (o) => reais(o.totalCentavos), direita: true },
                {
                  titulo: 'R$/g',
                  celula: (o) => {
                    const rg = precoPorGrama(o);
                    return rg === null ? '—' : reais(rg);
                  },
                  direita: true,
                  p2: true,
                },
                { titulo: 'Teor ou quilates', celula: teoresDaCompra },
                { titulo: 'Peças', celula: (o) => o.pecas.map((pc) => pc.tipoPeca).join(', '), p2: true },
                {
                  titulo: 'Observação',
                  celula: (o) => {
                    const alertas = alertasDaCompra(o);
                    return (
                      <>
                        {o.observacao || (alertas.length ? '' : '—')}
                        {alertas.length > 0 && (
                          <span className="g-tags">
                            {alertas.map((a) => (
                              <Tag key={a} tom="perigo">
                                {a}
                              </Tag>
                            ))}
                          </span>
                        )}
                      </>
                    );
                  },
                },
              ]}
              vazio={{ titulo: 'Nenhuma compra no período' }}
            />
            <Paginador atual={registros.atual} total={registros.total} porPagina={registros.porPagina} quantidade={p.registros.length} irPara={registros.irPara} mudarPorPagina={registros.mudarPorPagina} />
          </Cartao>
        </>
      )}
    </Pagina>
  );
}
