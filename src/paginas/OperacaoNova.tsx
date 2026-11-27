/**
 * Registrar compra (nova operação), em 3 passos como no sistema de referência: 1 Cliente e compra → 2 Peças → 3 Revisão.
 * Pode vir do Avaliar ("Registrar compra"): as joias avaliadas viram peças. O preço do grama vem do precos-lojas.txt
 * (mesmo serviço e cache do Avaliar) quando o local é uma loja; pode ser negociado. Nada é salvo sem o back.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { buscarClientePorDocumento, local as acharLocal, obterCliente, registrarCompra, todosOsPagadores } from '../services/dados';
import { emCentavos, ErroPreco, lerPrecos, QUILATES, AVISOS } from '../services/precos';
import { tirarJoiasParaCompra } from '../services/compraPendente';
import { quilateDaJoia } from '../avaliador/avaliador';
import { textoDoErro } from '../services/simulacao';
import { USUARIOS } from '../mocks/dados';
import { Aviso, CampoArquivo, CampoSelect, CampoTexto, Cartao, Pagina, TagCompliance, useMensagem } from '../componentes/ui';
import { cnpjValido, cpfValido, gramas, mascaraDocumento, parsePeso, pesoEmCg, reais, soDigitos, valorPecaCentavos } from '../utils/formato';
import type { Cliente, Quilate, TabelaPrecos } from '../tipos';

const TIPOS_PECA = ['Anel', 'Colar', 'Pulseira', 'Brinco', 'Aliança', 'Corrente', 'Pingente', 'Medalha', 'Moeda', 'Barra', 'Tarraxa', 'Piercing', 'Abotoadura', 'Prótese dentária'];

interface PecaForm {
  chave: number;
  tipoPeca: string;
  quilate: Quilate | 'nao_informado' | '';
  descricao: string;
  semPeso: boolean;
  peso: string;
  preco: string;
  valorManual: string;
  foto: string;
}

let proximaChave = 1;
const novaPeca = (parcial: Partial<PecaForm> = {}): PecaForm => ({ chave: proximaChave++, tipoPeca: '', quilate: '', descricao: '', semPeso: false, peso: '', preco: '', valorManual: '', foto: '', ...parcial });
const reaisTexto = (centavos: number): string => (centavos / 100).toFixed(2).replace('.', ',');
/** "350,00" → centavos, ou null. */
const centavosDe = (txt: string): number | null => {
  const t = txt.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  const n = Math.round(Number(t) * 100);
  return n > 0 ? n : null;
};

function valorDaPeca(p: PecaForm): number | null {
  if (p.semPeso) return centavosDe(p.valorManual);
  const cg = pesoEmCg(p.peso);
  const preco = centavosDe(p.preco);
  return cg !== null && preco !== null ? valorPecaCentavos(cg, preco) : null;
}

function errosDaPeca(p: PecaForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!p.tipoPeca) e.tipoPeca = 'Escolha o tipo da peça.';
  if (!p.quilate) e.quilate = 'Escolha o quilate (ou "não informado").';
  if (!p.descricao.trim()) e.descricao = 'Descreva a peça.';
  if (p.semPeso) {
    if (centavosDe(p.valorManual) === null) e.valorManual = 'Informe o valor pago, em reais (ex.: 350,00).';
  } else {
    if (parsePeso(p.peso) === null) e.peso = 'Peso inválido. Use até 2 casas (ex.: 12,40).';
    if (centavosDe(p.preco) === null) e.preco = 'Informe o preço do grama (ex.: 350,00).';
    if (!p.foto) e.foto = 'Envie a foto da peça na balança.';
  }
  return e;
}

export default function OperacaoNova() {
  const usuario = useUsuario();
  const { locais } = useSessao();
  const [busca] = useSearchParams();
  const msg = useMensagem();
  const tituloPasso = useRef<HTMLHeadingElement>(null);
  const titulosPecas = useRef(new Map<number, HTMLHeadingElement>());
  const [focarPeca, setFocarPeca] = useState<number | null>(null);

  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [tentou, setTentou] = useState<Record<number, boolean>>({});
  const [documento, setDocumento] = useState('');
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscaMsg, setBuscaMsg] = useState<string | null>(null);
  const [localId, setLocalId] = useState(() => locais.find((l) => l.lojaId && usuario.lojaIds.includes(l.lojaId))?.id ?? locais[0]?.id ?? '');
  const [comprador1, setComprador1] = useState(usuario.perfil === 'admin' ? '' : usuario.id);
  const [comprador2, setComprador2] = useState('');
  const [pagadorId, setPagadorId] = useState('pag-vj');
  const [observacao, setObservacao] = useState('');
  const [veioDaAvaliacao] = useState(() => tirarJoiasParaCompra());
  const [pecas, setPecas] = useState<PecaForm[]>(() =>
    veioDaAvaliacao.length
      ? veioDaAvaliacao.map((j) => novaPeca({ tipoPeca: TIPOS_PECA.includes(j.tipo) ? j.tipo : '', quilate: (quilateDaJoia(j.material) as Quilate | null) ?? '', peso: j.peso.replace('.', ','), descricao: j.tipo ? `${j.tipo} (da avaliação)` : '' }))
      : [novaPeca()],
  );
  const [tabela, setTabela] = useState<TabelaPrecos | null>(null);
  const [erroPreco, setErroPreco] = useState<string | null>(null);

  const local = acharLocal(localId);
  const equipeDoLocal = useMemo(() => USUARIOS.filter((u) => u.status === 'ativo' && u.perfil !== 'admin' && (!local?.lojaId || u.lojaIds.includes(local.lojaId))), [local]);

  // ?cliente=<id> (vindo do detalhe do cliente). O serviço só devolve cliente dos locais que a pessoa vê.
  useEffect(() => {
    const id = busca.get('cliente');
    if (!id) return;
    let vivo = true;
    void obterCliente(usuario, id).then((c) => {
      if (!vivo) return;
      if (c) {
        setCliente(c);
        setDocumento(mascaraDocumento(c.documento));
      } else setBuscaMsg('O cliente do link não foi encontrado nas suas lojas. Busque pelo CPF ou CNPJ.');
    });
    return () => {
      vivo = false;
    };
  }, [busca, usuario]);

  // Preço do grama da loja do local (mesmo serviço e cache de 60 s do Avaliar).
  useEffect(() => {
    let vivo = true;
    setTabela(null);
    setErroPreco(null);
    if (!local?.lojaId) return;
    lerPrecos(local.lojaId)
      .then((t) => vivo && setTabela(emCentavos(t)))
      .catch((e: unknown) => vivo && setErroPreco(e instanceof ErroPreco ? `${AVISOS[e.motivo].titulo}: ${AVISOS[e.motivo].texto(e.minutos)}` : textoDoErro(e)));
    return () => {
      vivo = false;
    };
  }, [local?.lojaId]);

  // Preenche o preço do grama das peças sem preço quando a tabela chega.
  useEffect(() => {
    if (!tabela) return;
    setPecas((ps) => ps.map((p) => (!p.preco && p.quilate && p.quilate !== 'nao_informado' ? { ...p, preco: reaisTexto(tabela[p.quilate]) } : p)));
  }, [tabela]);

  // Troca de passo: o foco vai para o título do passo (no primeiro desenho, fica no h1 da página).
  const passoAnterior = useRef(passo);
  useEffect(() => {
    if (passoAnterior.current === passo) return;
    passoAnterior.current = passo;
    tituloPasso.current?.focus();
  }, [passo]);
  useEffect(() => {
    if (focarPeca === null) return;
    titulosPecas.current.get(focarPeca)?.focus();
    setFocarPeca(null);
  }, [focarPeca, pecas]);

  const mudarPeca = (chave: number, mudanca: Partial<PecaForm>): void =>
    setPecas((ps) =>
      ps.map((p) => {
        if (p.chave !== chave) return p;
        const nova = { ...p, ...mudanca };
        // trocar o quilate traz o preço da tabela da loja (dá para negociar depois)
        if (mudanca.quilate && mudanca.quilate !== 'nao_informado' && tabela) nova.preco = reaisTexto(tabela[mudanca.quilate]);
        return nova;
      }),
    );

  const errosPasso1 = (): string[] => {
    const e: string[] = [];
    if (!cliente) e.push('Busque e escolha o cliente pelo CPF ou CNPJ.');
    else if (cliente.status === 'reprovado') e.push('Este cliente foi reprovado na conferência: não dá para registrar compra.');
    if (!localId) e.push('Escolha o local da compra.');
    if (!comprador1) e.push('Escolha quem fez a compra.');
    if (comprador2 && comprador2 === comprador1) e.push('O segundo comprador precisa ser outra pessoa.');
    if (!pagadorId) e.push('Escolha quem pagou.');
    return e;
  };
  const errosPasso2 = (): string[] => {
    if (!pecas.length) return ['Adicione ao menos uma peça.'];
    return pecas.flatMap((p, i) => Object.values(errosDaPeca(p)).map((t) => `Peça ${i + 1}: ${t}`));
  };

  async function buscarCliente(e: FormEvent): Promise<void> {
    e.preventDefault();
    const d = soDigitos(documento);
    if (!(d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false)) {
      setCliente(null);
      setBuscaMsg('CPF ou CNPJ inválido. Confira os números.');
      return;
    }
    const achado = await buscarClientePorDocumento(usuario, d);
    setCliente(achado);
    setBuscaMsg(achado ? null : 'Nenhum cliente com este documento. Cadastre o cliente e volte.');
  }

  const avancar = (): void => {
    setTentou((t) => ({ ...t, [passo]: true }));
    const erros = passo === 1 ? errosPasso1() : errosPasso2();
    if (erros.length) {
      msg.mostrar(
        'erro',
        <>
          Confira antes de seguir:
          <ul className="g-lista-faltas">
            {erros.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>,
      );
      return;
    }
    msg.limpar();
    setPasso((p) => (p === 1 ? 2 : 3));
  };

  const registrar = async (): Promise<void> => {
    try {
      await registrarCompra();
    } catch (e) {
      msg.mostrar('atencao', textoDoErro(e));
    }
  };

  const total = pecas.reduce((s, p) => s + (valorDaPeca(p) ?? 0), 0);
  const pesoTotal = pecas.reduce((s, p) => s + (p.semPeso ? 0 : (pesoEmCg(p.peso) ?? 0)), 0);
  const opcoesEquipe = equipeDoLocal.map((u) => ({ valor: u.id, rotulo: u.nome }));
  const PASSOS = ['Cliente e compra', 'Peças', 'Revisão'];

  return (
    <Pagina titulo="Registrar compra" subtitulo="Compra de ouro de um cliente, em 3 passos.">
      <ol className="g-etapas" aria-label="Passos">
        {PASSOS.map((nome, i) => (
          <li key={nome} className={i + 1 <= passo ? 'feita' : undefined} aria-current={i + 1 === passo ? 'step' : undefined}>
            {i + 1}. {nome}
          </li>
        ))}
      </ol>

      {veioDaAvaliacao.length > 0 && passo === 1 && (
        <Aviso tipo="info">
          {veioDaAvaliacao.length} {veioDaAvaliacao.length === 1 ? 'joia veio' : 'joias vieram'} da avaliação e já estão nas peças (passo 2).
        </Aviso>
      )}
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}

      <h2 ref={tituloPasso} tabIndex={-1} style={{ fontSize: 20 }}>
        Passo {passo} de 3: {PASSOS[passo - 1]}
      </h2>

      {passo === 1 && (
        <>
          <Cartao titulo="Cliente">
            <form className="g-filtros" onSubmit={buscarCliente} noValidate>
              <div style={{ flex: 1, minWidth: 240 }}>
                <CampoTexto rotulo="CPF ou CNPJ do cliente" obrigatorio modo="numeric" valor={documento} aoMudar={(v) => setDocumento(mascaraDocumento(v))} erro={buscaMsg && !cliente ? buscaMsg : tentou[1] && !cliente ? 'Busque o cliente.' : null} placeholder="000.000.000-00" />
              </div>
              <button type="submit" className="g-btn">
                <Search aria-hidden="true" /> Buscar
              </button>
            </form>
            {cliente && (
              <div className="g-aviso g-aviso-sucesso" role="status" style={{ marginTop: 12 }}>
                <div>
                  <strong>{cliente.nome}</strong> · {mascaraDocumento(cliente.documento)} <TagCompliance status={cliente.status} />
                  {cliente.status === 'pendente' && <p>Conferência de documentos pendente: a compra fica em avaliação até a aprovação.</p>}
                </div>
              </div>
            )}
            <p style={{ marginTop: 12 }}>
              Cliente novo? <Link to={`/clientes/novo${soDigitos(documento) ? `?documento=${soDigitos(documento)}` : ''}`}>Cadastrar cliente</Link>
            </p>
          </Cartao>
          <Cartao titulo="Compra">
            <div className="g-campos">
              <CampoSelect rotulo="Local da compra" obrigatorio valor={localId} aoMudar={setLocalId} opcoes={locais.map((l) => ({ valor: l.id, rotulo: l.nome }))} vazio="Escolha" erro={tentou[1] && !localId ? 'Escolha o local.' : null} />
              <CampoSelect rotulo="Comprador" obrigatorio valor={comprador1} aoMudar={setComprador1} opcoes={opcoesEquipe} vazio="Escolha" erro={tentou[1] && !comprador1 ? 'Escolha quem comprou.' : null} />
              <CampoSelect rotulo="Segundo comprador (dupla)" valor={comprador2} aoMudar={setComprador2} opcoes={opcoesEquipe} vazio="Nenhum" erro={comprador2 && comprador2 === comprador1 ? 'Escolha outra pessoa.' : null} />
              <CampoSelect rotulo="Quem pagou" obrigatorio valor={pagadorId} aoMudar={setPagadorId} opcoes={todosOsPagadores().map((p) => ({ valor: p.id, rotulo: p.nome }))} ajuda="Se foi um parceiro, o custo fica com ele." />
            </div>
          </Cartao>
        </>
      )}

      {passo === 2 && (
        <Cartao titulo={`Peças (${pecas.length})`}>
          {local?.lojaId ? (
            erroPreco ? (
              <Aviso tipo="atencao">{erroPreco} Digite o preço do grama à mão.</Aviso>
            ) : (
              <p className="g-texto2" style={{ marginBottom: 12 }}>
                Preço do grama da {local.nome}, lido do arquivo de preços{tabela ? '' : ' (carregando…)'}. Dá para negociar em cada peça.
              </p>
            )
          ) : (
            <p className="g-texto2" style={{ marginBottom: 12 }}>
              Este local não tem tabela de preço: digite o preço do grama.
            </p>
          )}
          <div className="g-pecas">
            {pecas.map((p, i) => {
              const e = tentou[2] ? errosDaPeca(p) : {};
              const v = valorDaPeca(p);
              return (
                <section key={p.chave} className="g-peca" aria-labelledby={`peca-${p.chave}`}>
                  <div className="g-peca-cab">
                    <h3
                      id={`peca-${p.chave}`}
                      tabIndex={-1}
                      ref={(el) => {
                        if (el) titulosPecas.current.set(p.chave, el);
                        else titulosPecas.current.delete(p.chave);
                      }}
                    >
                      Peça {i + 1}
                    </h3>
                    {pecas.length > 1 && (
                      <button
                        type="button"
                        className="g-btn g-btn-perigo"
                        aria-label={`Remover peça ${i + 1}`}
                        onClick={() => {
                          const resto = pecas.filter((x) => x.chave !== p.chave);
                          setPecas(resto);
                          // WCAG 2.4.3: o foco vai para a peça que ficou no lugar (ou a anterior)
                          setFocarPeca(resto[Math.min(i, resto.length - 1)].chave);
                        }}
                      >
                        <Trash2 aria-hidden="true" /> Remover
                      </button>
                    )}
                  </div>
                  <div className="g-campos">
                    <CampoSelect rotulo="Tipo de peça" obrigatorio valor={p.tipoPeca} aoMudar={(x) => mudarPeca(p.chave, { tipoPeca: x })} opcoes={TIPOS_PECA.map((t) => ({ valor: t, rotulo: t }))} vazio="Escolha" erro={e.tipoPeca} />
                    <CampoSelect
                      rotulo="Quilate"
                      obrigatorio
                      valor={p.quilate}
                      aoMudar={(x) => mudarPeca(p.chave, { quilate: x as PecaForm['quilate'] })}
                      opcoes={[...QUILATES.map((q) => ({ valor: q, rotulo: q.toUpperCase() })), { valor: 'nao_informado', rotulo: 'Não informado' }]}
                      vazio="Escolha"
                      erro={e.quilate}
                    />
                    <CampoTexto rotulo="Descrição" obrigatorio valor={p.descricao} aoMudar={(x) => mudarPeca(p.chave, { descricao: x })} placeholder="Ex.: anel com pedra" erro={e.descricao} />
                  </div>
                  <label className="g-check" style={{ marginTop: 8 }}>
                    <input type="checkbox" checked={p.semPeso} onChange={(ev) => mudarPeca(p.chave, { semPeso: ev.target.checked })} />
                    Sem peso (balança indisponível)
                  </label>
                  <div className="g-campos">
                    {p.semPeso ? (
                      <CampoTexto rotulo="Valor pago (R$)" obrigatorio modo="decimal" valor={p.valorManual} aoMudar={(x) => mudarPeca(p.chave, { valorManual: x })} erro={e.valorManual} placeholder="0,00" />
                    ) : (
                      <>
                        <CampoTexto rotulo="Peso bruto (g)" obrigatorio modo="decimal" valor={p.peso} aoMudar={(x) => mudarPeca(p.chave, { peso: x })} erro={e.peso} placeholder="0,00" />
                        <CampoTexto rotulo="Preço do grama (R$)" obrigatorio modo="decimal" valor={p.preco} aoMudar={(x) => mudarPeca(p.chave, { preco: x })} erro={e.preco} placeholder="0,00" />
                        <CampoArquivo rotulo="Foto da peça na balança" obrigatorio aceita="image/*" nome={p.foto} aoMudar={(x) => mudarPeca(p.chave, { foto: x })} erro={e.foto} />
                      </>
                    )}
                  </div>
                  <p style={{ marginTop: 10 }} aria-live="polite">
                    Valor da peça: <strong>{v === null ? '—' : reais(v)}</strong>
                    {!p.semPeso && <span className="g-texto2"> (peso × preço, centavos arredondados para cima)</span>}
                  </p>
                </section>
              );
            })}
          </div>
          <button
            type="button"
            className="g-btn"
            style={{ marginTop: 16 }}
            onClick={() => {
              const nova = novaPeca();
              setPecas((ps) => [...ps, nova]);
              setFocarPeca(nova.chave);
            }}
          >
            <Plus aria-hidden="true" /> Adicionar peça
          </button>
          <div className="g-total" style={{ marginTop: 16 }}>
            <span>Total</span>
            <span>
              {reais(total)} · {gramas(pesoTotal)}
            </span>
          </div>
        </Cartao>
      )}

      {passo === 3 && (
        <>
          <Cartao titulo="Revisão">
            <dl className="g-dl">
              <div>
                <dt>Cliente</dt>
                <dd>{cliente ? `${cliente.nome} · ${mascaraDocumento(cliente.documento)}` : '—'}</dd>
              </div>
              <div>
                <dt>Local</dt>
                <dd>{local?.nome ?? '—'}</dd>
              </div>
              <div>
                <dt>Comprador</dt>
                <dd>{[comprador1, comprador2].filter(Boolean).map((id) => USUARIOS.find((u) => u.id === id)?.nome).join(' e ')}</dd>
              </div>
              <div>
                <dt>Quem pagou</dt>
                <dd>{todosOsPagadores().find((p) => p.id === pagadorId)?.nome}</dd>
              </div>
              <div>
                <dt>Peso total</dt>
                <dd>{gramas(pesoTotal)}</dd>
              </div>
              <div>
                <dt>Valor total</dt>
                <dd>
                  <strong>{reais(total)}</strong>
                </dd>
              </div>
            </dl>
            <ul className="g-tempo" style={{ marginTop: 16 }}>
              {pecas.map((p, i) => (
                <li key={p.chave}>
                  Peça {i + 1}: {p.tipoPeca}, {p.quilate === 'nao_informado' ? 'quilate não informado' : p.quilate.toUpperCase()}, {p.semPeso ? 'sem peso' : `${p.peso} g`}
                  <small>
                    {p.descricao} · {reais(valorDaPeca(p) ?? 0)}
                  </small>
                </li>
              ))}
            </ul>
          </Cartao>
          <Cartao titulo="Observação">
            <div className="g-campo">
              <label htmlFor="obs">Observação (opcional)</label>
              <textarea id="obs" className="g-textarea" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: acerto pendente com o cliente" />
            </div>
          </Cartao>
        </>
      )}

      <div className="g-linha-acoes">
        {passo > 1 ? (
          <button type="button" className="g-btn" onClick={() => setPasso((p) => (p === 3 ? 2 : 1))}>
            Voltar
          </button>
        ) : (
          <Link to={usuario.perfil === 'atendente' ? '/avaliar' : '/operacoes'} className="g-btn">
            Cancelar
          </Link>
        )}
        {passo < 3 ? (
          <button type="button" className="g-btn g-btn-primario" onClick={avancar}>
            Próximo
          </button>
        ) : (
          <button type="button" className="g-btn g-btn-primario" onClick={() => void registrar()}>
            Registrar compra
          </button>
        )}
      </div>
    </Pagina>
  );
}
