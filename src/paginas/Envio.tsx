/**
 * Envio (/envio). Na VJ, "envio" é o LOTE de compras que sai numa VENDA a um parceiro:
 * (a) as compras prontas para o lote (em estoque, pagas ou com NF emitida), por local, com seleção;
 * (b) as vendas, com o resultado de cada uma e, na aberta, o faturamento a informar.
 * Montar lote e informar faturamento são ações de admin (PROXIMA_ACAO e ehAdmin em src/services).
 * Venda com compras de outra loja: o gerente vê só a parte dele; o resultado da venda fica com o admin.
 */
import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Truck } from 'lucide-react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { clienteDaOperacao, criarLote, informarFaturamento, listarOperacoes, listarVendas, todosOsParceiros, type ResultadoVenda } from '../services/dados';
import { ehAdmin } from '../services/permissoes';
import { NaoLigadoError, textoDoErro } from '../services/simulacao';
import { Aviso, Campo, CampoSelect, CampoTexto, Carregando, Cartao, Dialogo, Pagina, Tag, useCarregar, useMensagem, Vazio } from '../componentes/ui';
import { Tabela, type Coluna } from '../componentes/Tabela';
import type { Operacao } from '../tipos';
import { dataCurta, gramas, porcento, reais } from '../utils/formato';
import { gramasEmCg, hojeIso, reaisEmCentavos } from '../utils/entrada';
import '../estilos/telas.css';

/** Pronta para o lote: o ouro está em estoque e a compra já foi paga (com ou sem NF). */
const pronta = (o: Operacao): boolean => o.situacao === 'estoque' && (o.status === 'nf_emitida' || o.status === 'pago');
const somaPeso = (ops: readonly Operacao[]): number => ops.reduce((s, o) => s + (o.pesoCg ?? 0), 0);
const somaValor = (ops: readonly Operacao[]): number => ops.reduce((s, o) => s + o.totalCentavos, 0);
const qtd = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;
const resumo = (ops: readonly Operacao[]): string => `${qtd(ops.length, 'compra', 'compras')} · ${gramas(somaPeso(ops))} · ${reais(somaValor(ops))}`;
const valorOu = (c: number | null, texto: string) => (c === null ? <span className="g-texto2">{texto}</span> : <span className="g-num">{reais(c)}</span>);
/** Resultado da venda: "só o admin vê" quando a venda tem compras de outra loja; senão, o valor ou o texto. */
const SoAdmin = () => <span className="g-so-admin">só o admin vê</span>;
const resultadoOu = (r: ResultadoVenda, c: number | null, texto: string) => (r.resultadoVisivel ? valorOu(c, texto) : <SoAdmin />);
const resultadoPeso = (r: ResultadoVenda) => (r.pesoEnviadoCg === null ? <SoAdmin /> : <span className="g-num">{gramas(r.pesoEnviadoCg)}</span>);

export default function Envio() {
  const usuario = useUsuario();
  const { locais, localIds } = useSessao();
  const admin = ehAdmin(usuario);
  const ops = useCarregar(() => listarOperacoes(usuario, { localIds }), JSON.stringify([usuario.id, localIds]));
  const vendas = useCarregar(() => listarVendas(usuario, { localIds }), JSON.stringify([usuario.id, localIds]));
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(() => new Set());
  const [loteAberto, setLoteAberto] = useState(false);
  const [faturar, setFaturar] = useState<ResultadoVenda | null>(null);

  const prontas = (ops.dados ?? []).filter(pronta).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const grupos = locais.map((l) => ({ local: l, compras: prontas.filter((o) => o.localId === l.id) })).filter((g) => g.compras.length > 0);
  // só conta o que ainda está na lista (o filtro de loja pode ter tirado alguma)
  const selecionadas = prontas.filter((o) => marcadas.has(o.id));
  // o serviço já devolve só as vendas com compras dos locais visíveis, cada uma com a parte da pessoa
  const listaVendas = [...(vendas.dados ?? [])].sort((a, b) => b.data.localeCompare(a.data));

  function alternar(ids: readonly string[], marcar: boolean): void {
    setMarcadas((m) => {
      const n = new Set(m);
      for (const id of ids) {
        if (marcar) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }

  const colunasProntas: readonly Coluna<Operacao>[] = [
    {
      titulo: 'Código',
      principal: true,
      celula: (o) => (
        <span className="t-sel">
          {admin && (
            <label className="t-caixa">
              <input type="checkbox" checked={marcadas.has(o.id)} onChange={(e) => alternar([o.id], e.target.checked)} />
              <span className="g-sr">Selecionar {o.codigo}</span>
            </label>
          )}
          <Link to={`/operacoes/${o.id}`} className="g-num">
            {o.codigo}
          </Link>
        </span>
      ),
    },
    { titulo: 'Cliente', celula: (o) => clienteDaOperacao(o)?.nome ?? '—' },
    { titulo: 'Peso', direita: true, celula: (o) => (o.pesoCg === null ? <span className="g-texto2">sem peso</span> : <span className="g-num">{gramas(o.pesoCg)}</span>) },
    { titulo: 'Valor', direita: true, celula: (o) => <span className="g-num">{reais(o.totalCentavos)}</span> },
    { titulo: 'Data', celula: (o) => dataCurta(o.criadoEm) },
  ];

  const colunasVendas: readonly Coluna<ResultadoVenda>[] = [
    {
      titulo: 'Venda',
      principal: true,
      celula: (r) => (
        <>
          {r.codigo}
          <span className="g-celula-2">{qtd(r.lotes.length, 'lote', 'lotes')}</span>
        </>
      ),
    },
    { titulo: 'Data', celula: (r) => dataCurta(r.data) },
    { titulo: 'Parceiro', p2: true, celula: (r) => r.parceiro?.nome ?? '—' },
    { titulo: 'Peso enviado', p2: true, direita: true, celula: (r) => resultadoPeso(r) },
    // sem nenhum resultado visível (gerente com vendas de várias lojas), o dinheiro da venda vira uma coluna só
    ...(listaVendas.some((r) => r.resultadoVisivel)
      ? [
          { titulo: 'Faturamento', direita: true, celula: (r: ResultadoVenda) => resultadoOu(r, r.faturamentoCentavos, 'a informar') },
          { titulo: 'Custo do parceiro', p2: true, direita: true, celula: (r: ResultadoVenda) => <span className="g-num">{reais(r.custoDoParceiroCentavos)}</span> },
          { titulo: 'Entra em caixa', direita: true, celula: (r: ResultadoVenda) => resultadoOu(r, r.entraEmCaixaCentavos, 'a apurar') },
          { titulo: 'Lucro bruto', p2: true, direita: true, celula: (r: ResultadoVenda) => resultadoOu(r, r.lucroBrutoCentavos, 'a apurar') },
          { titulo: 'Lucro líquido', direita: true, celula: (r: ResultadoVenda) => resultadoOu(r, r.lucroLiquidoCentavos, 'a apurar') },
        ]
      : [
          { titulo: 'Custo (sua parte)', direita: true, celula: (r: ResultadoVenda) => <span className="g-num">{reais(r.custoMetalCentavos)}</span> },
          { titulo: 'Custo do parceiro', p2: true, direita: true, celula: (r: ResultadoVenda) => <span className="g-num">{reais(r.custoDoParceiroCentavos)}</span> },
          { titulo: 'Faturamento e lucros', celula: () => <SoAdmin /> },
        ]),
    { titulo: 'Situação', celula: (r) => (r.situacao === 'aberta' ? <Tag tom="aviso">Aberta</Tag> : <Tag>Fechada</Tag>) },
    ...(admin
      ? [
          {
            titulo: 'Ação',
            celula: (r: ResultadoVenda) =>
              r.situacao === 'aberta' ? (
                <button type="button" className="g-btn" aria-label={`Informar faturamento da venda ${r.codigo}`} onClick={() => setFaturar(r)}>
                  Informar faturamento
                </button>
              ) : (
                <span className="g-texto2">—</span>
              ),
          },
        ]
      : []),
  ];

  return (
    <Pagina titulo="Envio" subtitulo={ops.dados ? `${qtd(prontas.length, 'compra pronta', 'compras prontas')} para o lote.` : 'Lotes de compras enviados nas vendas aos parceiros.'}>
      <Cartao
        titulo="Prontas para o lote"
        descricao={admin ? 'Compras em estoque, pagas ou com NF emitida. Marque as que vão juntas no mesmo lote.' : 'Compras em estoque, pagas ou com NF emitida. Só um admin monta o lote.'}
        acoes={
          admin && (
            <div className="g-linha-acoes">
              <span className="t-resumo-sel" aria-live="polite">
                {selecionadas.length ? `Selecionadas: ${resumo(selecionadas)}` : 'Nenhuma selecionada'}
              </span>
              <button type="button" className="g-btn g-btn-primario" disabled={!selecionadas.length} onClick={() => setLoteAberto(true)}>
                <Truck aria-hidden="true" /> Enviar em lote
              </button>
            </div>
          )
        }
      >
        {ops.erro ? (
          <Aviso tipo="erro">{ops.erro}</Aviso>
        ) : !ops.dados ? (
          <Carregando texto="Carregando compras…" />
        ) : grupos.length === 0 ? (
          <Vazio titulo="Nenhuma compra pronta para o lote" dica="Aparecem aqui as compras em estoque, pagas ou com NF emitida." />
        ) : (
          grupos.map((g) => {
            const ids = g.compras.map((o) => o.id);
            const n = ids.filter((id) => marcadas.has(id)).length;
            return (
              <div className="t-grupo" key={g.local.id}>
                <div className="t-grupo-cab">
                  <div>
                    <h3>{g.local.nome}</h3>
                    <span className="g-texto2">{resumo(g.compras)}</span>
                  </div>
                  {admin && (
                    <label className="g-check">
                      <input
                        type="checkbox"
                        checked={n === ids.length}
                        ref={(el) => {
                          if (el) el.indeterminate = n > 0 && n < ids.length;
                        }}
                        onChange={(e) => alternar(ids, e.target.checked)}
                      />
                      Selecionar todas<span className="g-sr"> de {g.local.nome}</span>
                    </label>
                  )}
                </div>
                <Tabela legenda={`Compras prontas de ${g.local.nome}`} colunas={colunasProntas} linhas={g.compras} chave={(o) => o.id} />
              </div>
            );
          })
        )}
      </Cartao>

      <Cartao
        titulo="Vendas e lotes"
        descricao="Lucro bruto = faturamento − custo do metal. Lucro líquido = lucro bruto − frete − imposto. Quando o parceiro paga o cliente direto, o imposto é um percentual sobre o lucro, não sobre o faturamento. Entra em caixa = faturamento − custo das compras pagas por parceiro (compra a compra)."
      >
        {listaVendas.some((r) => !r.resultadoVisivel) && (
          <p className="g-secao-desc">Vendas com compras de outras lojas: você vê só as compras da sua loja (peso e custo); faturamento, lucros e o que entra em caixa só o admin vê.</p>
        )}
        {vendas.erro ? (
          <Aviso tipo="erro">{vendas.erro}</Aviso>
        ) : !vendas.dados ? (
          <Carregando texto="Carregando vendas…" />
        ) : (
          <Tabela legenda="Vendas aos parceiros" colunas={colunasVendas} linhas={listaVendas} chave={(r) => r.id} vazio={{ titulo: 'Nenhuma venda ainda' }} />
        )}
      </Cartao>

      {loteAberto && <DialogoLote compras={selecionadas} aoFechar={() => setLoteAberto(false)} />}
      {faturar && <DialogoFaturamento venda={faturar} aoFechar={() => setFaturar(null)} />}
    </Pagina>
  );
}

function DialogoLote({ compras, aoFechar }: { compras: readonly Operacao[]; aoFechar: () => void }) {
  const parceiros = todosOsParceiros();
  const [parceiroId, setParceiroId] = useState('');
  const [data, setData] = useState(hojeIso);
  const [peso, setPeso] = useState('');
  const [frete, setFrete] = useState('');
  const [obs, setObs] = useState('');
  const [erros, setErros] = useState<{ parceiro?: string; data?: string; peso?: string; frete?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const msg = useMensagem();
  const idForm = useId();
  const semPeso = compras.filter((o) => o.pesoCg === null).length;
  const escolhido = parceiros.find((p) => p.id === parceiroId);

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    const pesoCg = gramasEmCg(peso);
    const comprado = somaPeso(compras);
    const novos = {
      parceiro: escolhido ? undefined : 'Escolha o parceiro.',
      data: !data ? 'Informe a data do envio.' : data > hojeIso() ? 'A data não pode ser depois de hoje.' : undefined,
      peso: !peso.trim()
        ? 'Informe o peso enviado.'
        : pesoCg === null
          ? 'Peso inválido. Exemplo: 152,40'
          : pesoCg > comprado
            ? `O peso enviado (${gramas(pesoCg)}) passa do peso comprado das compras escolhidas (${gramas(comprado)}). O ouro só perde peso até o envio (na fundição): confira a balança${semPeso > 0 ? ' ou informe o peso das compras que estão sem peso' : ''}.`
            : undefined,
      frete: frete.trim() && reaisEmCentavos(frete) === null ? 'Valor inválido. Exemplo: 250,00' : undefined,
    };
    setErros(novos);
    if (novos.parceiro || novos.data || novos.peso || novos.frete) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      await criarLote();
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      titulo="Enviar em lote"
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="g-btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" form={idForm} className="g-btn g-btn-primario" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar lote'}
          </button>
        </>
      }
    >
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}
      <p className="g-texto2">
        No lote: {resumo(compras)}.{semPeso > 0 && ` ${qtd(semPeso, 'compra está', 'compras estão')} sem peso.`}
      </p>
      <form id={idForm} className="g-form" onSubmit={enviar} noValidate>
        <CampoSelect
          rotulo="Parceiro"
          obrigatorio
          vazio="Escolha"
          opcoes={parceiros.map((p) => ({ valor: p.id, rotulo: p.nome }))}
          valor={parceiroId}
          aoMudar={setParceiroId}
          erro={erros.parceiro}
          ajuda={escolhido?.pagaClienteDireto ? `Paga o cliente direto: imposto de ${porcento(escolhido.impostoSobreLucroPct ?? 0)} sobre o lucro.` : undefined}
        />
        <CampoTexto rotulo="Data do envio" tipo="date" obrigatorio valor={data} aoMudar={setData} erro={erros.data} />
        <CampoTexto rotulo="Peso enviado (g)" obrigatorio modo="decimal" placeholder="0,00" ajuda={`Peso na balança na hora do envio. Comprado: ${gramas(somaPeso(compras))}.`} valor={peso} aoMudar={setPeso} erro={erros.peso} />
        <CampoTexto rotulo="Frete (R$)" modo="decimal" placeholder="0,00" valor={frete} aoMudar={setFrete} erro={erros.frete} />
        <Campo rotulo="Observação">{(p) => <textarea {...p} className="g-textarea" value={obs} onChange={(e) => setObs(e.target.value)} />}</Campo>
      </form>
    </Dialogo>
  );
}

function DialogoFaturamento({ venda: r, aoFechar }: { venda: ResultadoVenda; aoFechar: () => void }) {
  const pct = r.parceiro?.impostoSobreLucroPct ?? null;
  const [faturamento, setFaturamento] = useState('');
  const [imposto, setImposto] = useState('');
  const [erros, setErros] = useState<{ faturamento?: string; imposto?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const msg = useMensagem();
  const idForm = useId();
  const fatDigitado = faturamento.trim() ? reaisEmCentavos(faturamento) : null;

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    const fat = reaisEmCentavos(faturamento);
    const novos = {
      faturamento: !faturamento.trim() ? 'Informe o faturamento.' : fat === null || fat === 0 ? 'Valor inválido. Exemplo: 12.500,00' : undefined,
      imposto: pct === null && imposto.trim() && reaisEmCentavos(imposto) === null ? 'Valor inválido. Exemplo: 350,00' : undefined,
    };
    setErros(novos);
    if (novos.faturamento || novos.imposto) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      await informarFaturamento();
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      titulo={`Informar faturamento da venda ${r.codigo}`}
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="g-btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button type="submit" form={idForm} className="g-btn g-btn-primario" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar faturamento'}
          </button>
        </>
      }
    >
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}
      <p className="g-texto2">
        {r.parceiro?.nome ?? 'Parceiro'} · {gramas(r.pesoEnviadoCg ?? 0)} enviados · custo do metal {reais(r.custoMetalCentavos)} · frete {reais(r.freteCentavos ?? 0)}
      </p>
      <p className="g-texto2">
        Custo pago por parceiro: {reais(r.custoDoParceiroCentavos)} (soma das compras pagas por ele).{' '}
        {fatDigitado !== null && fatDigitado > 0 ? `Entra em caixa: ${reais(fatDigitado - r.custoDoParceiroCentavos)}.` : 'Entra em caixa: faturamento − esse custo.'}
      </p>
      <form id={idForm} className="g-form" onSubmit={enviar} noValidate>
        <CampoTexto rotulo="Faturamento (R$)" obrigatorio modo="decimal" placeholder="0,00" ajuda="O que o parceiro pagou pela venda." valor={faturamento} aoMudar={setFaturamento} erro={erros.faturamento} />
        {pct === null ? (
          <CampoTexto rotulo="Imposto (R$)" modo="decimal" placeholder="0,00" ajuda="Deixe em branco se não houver." valor={imposto} aoMudar={setImposto} erro={erros.imposto} />
        ) : (
          <p className="g-texto2">Imposto: {porcento(pct)} sobre o lucro bruto, calculado pelo sistema (este parceiro paga o cliente direto).</p>
        )}
      </form>
    </Dialogo>
  );
}
