/**
 * Cliente (/clientes/:id): dados, documentos, histórico de compliance e as últimas compras. "Editar" troca as
 * seções de dados pelos mesmos campos do cadastro; "Salvar" valida e cai no aviso de que o back ainda não existe.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Pencil, Plus } from 'lucide-react';
import { useUsuario } from '../contexts/Sessao';
import { nomeDoLocal, obterCliente, operacoesDoCliente, salvarCliente } from '../services/dados';
import { NaoLigadoError, textoDoErro } from '../services/simulacao';
import { Aviso, Carregando, Cartao, Pagina, TagCompliance, TagStatus, useCarregar, useMensagem } from '../componentes/ui';
import { dadosDoCliente, mascaraChave, ROTULO_CHAVE, ROTULO_DOCUMENTO, SecoesCliente, validarCliente, type DadosCliente, type MudarCliente } from '../componentes/FormCliente';
import type { Cliente as ClienteT } from '../tipos';
import { dataCurta, dataHora, mascaraCep, mascaraCnpj, mascaraCpf, mascaraTelefone, reais } from '../utils/formato';
import '../estilos/telas.css';

const VOLTAR = { para: '/clientes', rotulo: 'Clientes' };

export default function Cliente() {
  const { id = '' } = useParams();
  const usuario = useUsuario();
  const { dados, erro, carregando } = useCarregar(() => obterCliente(usuario, id), `${usuario.id}:${id}`);
  // ao trocar de cliente, o anterior não aparece enquanto o novo carrega
  const cliente = dados && dados.id === id ? dados : null;

  if (carregando && !cliente) {
    return (
      <Pagina titulo="Cliente" voltar={VOLTAR}>
        <Carregando texto="Carregando cliente…" />
      </Pagina>
    );
  }
  if (erro) {
    return (
      <Pagina titulo="Cliente" voltar={VOLTAR}>
        <Aviso tipo="erro">{erro}</Aviso>
      </Pagina>
    );
  }
  // o serviço só devolve clientes dos locais que a pessoa vê (o filtro do topo não esconde o detalhe)
  if (!cliente) {
    return (
      <Pagina titulo="Cliente não encontrado" voltar={VOLTAR}>
        <Cartao>
          <p>Este cliente não existe ou não é de uma loja sua.</p>
          <p>
            <Link to="/clientes">Voltar para a lista de clientes</Link>
          </p>
        </Cartao>
      </Pagina>
    );
  }
  return <DetalheCliente key={cliente.id} cliente={cliente} />;
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const ou = (v: string): ReactNode => (v.trim() ? v : <span className="g-texto2">Não informado</span>);

function DetalheCliente({ cliente }: { cliente: ClienteT }) {
  const usuario = useUsuario();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<DadosCliente>(() => dadosDoCliente(cliente));
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // o ano corrente, lido uma vez ao abrir a tela (render puro)
  const [ano] = useState(() => new Date().getFullYear());
  const msg = useMensagem();
  const botaoEditar = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focarDepois = useRef<'form' | 'editar' | null>(null);

  // o botão Editar some na edição e volta no fim: o foco vai para o 1º campo e, depois, de volta ao Editar
  useEffect(() => {
    if (focarDepois.current === 'form') formRef.current?.querySelector<HTMLElement>('input:not([readonly]), select')?.focus();
    if (focarDepois.current === 'editar') botaoEditar.current?.focus();
    focarDepois.current = null;
  }, [editando]);

  const pf = cliente.tipo === 'PF';
  const doc = pf ? mascaraCpf(cliente.documento) : mascaraCnpj(cliente.documento);
  const ops = operacoesDoCliente(usuario, cliente.id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const compradoNoAno = ops.reduce((s, o) => s + (o.pagamento && new Date(o.pagamento.pagoEm).getFullYear() === ano ? o.pagamento.valorCentavos : 0), 0);
  const historico = [...cliente.historicoCompliance].sort((a, b) => b.em.localeCompare(a.em));
  const nDocs = cliente.documentos.length;
  const e = cliente.endereco;

  const mudar: MudarCliente = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  function editar(): void {
    setForm(dadosDoCliente(cliente));
    setTentou(false);
    msg.limpar();
    focarDepois.current = 'form';
    setEditando(true);
  }

  function cancelar(): void {
    msg.limpar();
    focarDepois.current = 'editar';
    setEditando(false);
  }

  async function salvar(ev: FormEvent): Promise<void> {
    ev.preventDefault();
    setTentou(true);
    if (Object.values(validarCliente(form)).some(Boolean)) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setSalvando(true);
    try {
      await salvarCliente();
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Pagina
      titulo={cliente.nome}
      subtitulo={
        <>
          <TagCompliance status={cliente.status} /> {pf ? 'Pessoa física · CPF' : 'Pessoa jurídica · CNPJ'} {doc}
        </>
      }
      voltar={VOLTAR}
      acoes={
        <>
          <Link className="g-btn g-btn-primario" to={`/operacoes/nova?cliente=${encodeURIComponent(cliente.id)}`}>
            <Plus aria-hidden="true" /> Nova operação
          </Link>
          {!editando && (
            <button ref={botaoEditar} type="button" className="g-btn" onClick={editar}>
              <Pencil aria-hidden="true" /> Editar
            </button>
          )}
        </>
      }
    >
      <div className="g-detalhe">
        <div>
          {msg.mensagem && (
            <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
              {msg.mensagem.texto}
            </Aviso>
          )}

          {editando ? (
            <form ref={formRef} className="t-pilha" onSubmit={salvar} noValidate aria-label="Editar cliente">
              <SecoesCliente dados={form} erros={tentou ? validarCliente(form) : {}} mudar={mudar} documentoFixo />
              <div className="g-linha-acoes">
                <button type="submit" className="g-btn g-btn-primario" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
                <button type="button" className="g-btn" onClick={cancelar}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <Cartao titulo={pf ? 'Dados básicos' : 'Dados da empresa'}>
                <dl className="g-dl">
                  <Item rotulo={pf ? 'Nome' : 'Razão social'}>{cliente.nome}</Item>
                  <Item rotulo={pf ? 'CPF' : 'CNPJ'}>
                    <span className="g-num">{doc}</span>
                  </Item>
                  <Item rotulo="E-mail">{ou(cliente.email)}</Item>
                  <Item rotulo="Telefone">{ou(mascaraTelefone(cliente.telefone))}</Item>
                  {pf && (
                    <>
                      <Item rotulo="RG/CNH">{ou(cliente.rgCnh)}</Item>
                      <Item rotulo="Nome da mãe">{ou(cliente.nomeMae)}</Item>
                      <Item rotulo="Nome do pai">{ou(cliente.nomePai)}</Item>
                      <Item rotulo="Data de nascimento">{ou(cliente.dataNascimento)}</Item>
                      <Item rotulo="Politicamente exposta">{cliente.pep ? 'Sim' : 'Não'}</Item>
                      <Item rotulo="Como nos conheceu">{ou(cliente.comoConheceu)}</Item>
                    </>
                  )}
                </dl>
              </Cartao>
              <Cartao titulo="Endereço">
                <dl className="g-dl">
                  <Item rotulo="Rua e número">
                    {e.rua}, {e.numero}
                    {e.complemento && ` · ${e.complemento}`}
                  </Item>
                  <Item rotulo="Bairro">{ou(e.bairro)}</Item>
                  <Item rotulo="Cidade/UF">
                    {e.cidade}/{e.uf}
                  </Item>
                  <Item rotulo="CEP">{ou(mascaraCep(e.cep))}</Item>
                </dl>
              </Cartao>
              <Cartao titulo="PIX">
                <dl className="g-dl">
                  <Item rotulo="Tipo de chave">{ROTULO_CHAVE[cliente.pix.tipoChave]}</Item>
                  <Item rotulo="Chave PIX">{ou(mascaraChave(cliente.pix.tipoChave, cliente.pix.chave))}</Item>
                </dl>
              </Cartao>
              <Cartao titulo="Dados bancários">
                {cliente.banco ? (
                  <dl className="g-dl">
                    <Item rotulo="Banco">{cliente.banco.nome}</Item>
                    <Item rotulo="Agência">{cliente.banco.agencia}</Item>
                    <Item rotulo="Conta">{cliente.banco.conta}</Item>
                  </dl>
                ) : (
                  <p className="g-texto2">Dados bancários não informados.</p>
                )}
              </Cartao>
            </>
          )}

          <Cartao titulo={`Documentos (${nDocs} ${nDocs === 1 ? 'arquivo' : 'arquivos'})`}>
            {nDocs ? (
              <ul className="t-lista">
                {cliente.documentos.map((d) => (
                  <li key={d.id}>
                    <span className="t-lista-texto">
                      <strong>{ROTULO_DOCUMENTO[d.tipo]}</strong>
                      <span className="g-texto2">{d.nomeArquivo}</span>
                    </span>
                    <span className="g-texto2">
                      {d.tamanhoKb} KB · {dataCurta(d.enviadoEm)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="g-texto2">Nenhum documento enviado.</p>
            )}
          </Cartao>

          <Cartao titulo="Histórico de compliance">
            {historico.length ? (
              <ol className="g-tempo">
                {historico.map((h) => (
                  <li key={`${h.em}-${h.status}`}>
                    <TagCompliance status={h.status} /> {h.motivo}
                    <small>
                      {h.autor} · {dataHora(h.em)}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="g-texto2">Nenhuma conferência registrada ainda.</p>
            )}
          </Cartao>
        </div>

        <div>
          <Cartao titulo="Resumo">
            <dl className="g-dl">
              <Item rotulo="Cliente desde">{dataCurta(cliente.criadoEm)}</Item>
              <Item rotulo="Total de operações">{ops.length}</Item>
              <Item rotulo="Valor comprado no ano">
                <span className="g-num">{reais(compradoNoAno)}</span>
                <span className="g-celula-2">compras pagas em {ano}</span>
              </Item>
              <Item rotulo="Cadastrado por">{ou(cliente.cadastradoPor)}</Item>
              <Item rotulo="Local">{nomeDoLocal(cliente.localId)}</Item>
            </dl>
          </Cartao>
          <Cartao titulo="Últimas operações">
            {ops.length ? (
              <ul className="t-lista">
                {ops.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <span className="t-lista-texto">
                      <Link to={`/operacoes/${o.id}`}>{o.codigo}</Link>
                      <span className="g-texto2">
                        {dataCurta(o.criadoEm)} · {reais(o.totalCentavos)}
                      </span>
                    </span>
                    <TagStatus status={o.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="g-texto2">Nenhuma operação ainda.</p>
            )}
          </Cartao>
        </div>
      </div>
    </Pagina>
  );
}
