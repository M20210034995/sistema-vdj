/**
 * Detalhe de uma compra (estrutura do detalhe de operação do sistema de referência): etapas, peças, valores, dados da
 * compra (local, compradores, pagador, situação), termo, pagamento, documentos, lote/venda, histórico e a próxima ação.
 * Compra de um local que a pessoa não vê: o serviço devolve null e a tela diz "não encontrada", sem nenhum dado.
 */
import { Link, useParams } from 'react-router';
import { FileDown } from 'lucide-react';
import { useUsuario } from '../contexts/Sessao';
import { avancarOperacao, clienteDaOperacao, ETAPA_CURTA, loteDaCompra, nomeDoLocal, nomeDoPagador, nomeDosCompradores, obterOperacao, ORDEM_STATUS, podeVerLocal, PROXIMA_ACAO, ROTULO_SITUACAO } from '../services/dados';
import { alertasDaCompra, precoPorGrama, teoresDaCompra } from '../services/painel';
import { textoDoErro } from '../services/simulacao';
import { Aviso, Cartao, Carregando, Pagina, Tag, TagCompliance, TagStatus, useCarregar, useMensagem } from '../componentes/ui';
import { Tabela } from '../componentes/Tabela';
import { dataCurta, dataHora, gramas, mascaraDocumento, reais } from '../utils/formato';
import { nomeDoPerfil } from '../componentes/Casca';
import type { TipoDocumento } from '../tipos';

const NOME_DOC: Record<TipoDocumento, string> = {
  rg_frente: 'RG (frente)',
  rg_verso: 'RG (verso)',
  cnh: 'CNH',
  selfie: 'Selfie com documento',
  comprovante_endereco: 'Comprovante de endereço',
  termo_assinado: 'Termo de origem assinado',
  comprovante_pagamento: 'Comprovante de pagamento',
  foto_balanca: 'Foto da balança',
  nfe_danfe: 'DANFE da NF-e',
  nfe_xml: 'XML da NF-e',
  video: 'Vídeo',
  outro: 'Outro arquivo',
};

export default function Operacao() {
  const { id = '' } = useParams();
  const usuario = useUsuario();
  const { dados, carregando } = useCarregar(() => obterOperacao(usuario, id), `${usuario.id}:${id}`);
  // ao trocar de compra, a anterior não aparece enquanto a nova carrega
  const o = dados && dados.id === id ? dados : null;
  const msg = useMensagem();

  if (carregando && !o) return <Carregando />;
  if (!o)
    return (
      <Pagina titulo="Compra não encontrada" voltar={{ para: '/operacoes', rotulo: 'Operações' }}>
        <p>Esta compra não existe ou não é de uma loja sua.</p>
      </Pagina>
    );

  const cliente = clienteDaOperacao(o);
  const nivel = ORDEM_STATUS.indexOf(o.status);
  const acao = PROXIMA_ACAO[o.status];
  const podeAgir = acao && (!acao.soAdmin || usuario.perfil === 'admin');
  const lote = loteDaCompra(usuario, o.id);
  const clienteVisivel = cliente ? podeVerLocal(usuario, cliente.localId) : false;
  const alertas = alertasDaCompra(o);
  const rg = precoPorGrama(o);

  const agir = async (rotulo: string): Promise<void> => {
    try {
      await avancarOperacao(rotulo);
    } catch (e) {
      msg.mostrar('atencao', textoDoErro(e));
    }
  };

  return (
    <Pagina
      titulo={o.codigo}
      voltar={{ para: '/operacoes', rotulo: 'Operações' }}
      subtitulo={
        <>
          <TagStatus status={o.status} /> {cliente ? `${cliente.nome} · ${mascaraDocumento(cliente.documento)}` : ''}
        </>
      }
      acoes={
        <button type="button" className="g-btn" onClick={() => void agir('Gerar PDF da compra')}>
          <FileDown aria-hidden="true" /> PDF
        </button>
      }
    >
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}

      <section className="g-cartao" aria-label="Etapas da compra">
        <ol className="g-etapas">
          {ORDEM_STATUS.map((s, i) => (
            <li key={s} className={i <= nivel ? 'feita' : undefined} aria-current={i === nivel ? 'step' : undefined}>
              {ETAPA_CURTA[s]}
              <span className="g-sr">{i < nivel ? ' (feita)' : i === nivel ? ' (etapa atual)' : ' (a fazer)'}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="g-detalhe">
        <div>
          <Cartao titulo="Peças">
            <Tabela
              legenda="Peças da compra"
              linhas={o.pecas}
              chave={(p) => String(p.indice)}
              colunas={[
                { titulo: '#', celula: (p) => p.indice, principal: true },
                { titulo: 'Tipo', celula: (p) => p.tipoPeca },
                { titulo: 'Quilate', celula: (p) => p.quilate?.toUpperCase() ?? 'não informado' },
                { titulo: 'Descrição', celula: (p) => p.descricao, p2: true },
                { titulo: 'Peso bruto', celula: (p) => (p.pesoCg === null ? 'sem peso' : gramas(p.pesoCg)), direita: true },
                { titulo: 'Preço/g', celula: (p) => (p.precoGramaCentavos === null ? '—' : reais(p.precoGramaCentavos)), direita: true },
                { titulo: 'Valor pago', celula: (p) => reais(p.valorCentavos), direita: true },
              ]}
              rodape={
                <tr>
                  <td colSpan={3}>
                    Total ({o.pecas.length} {o.pecas.length === 1 ? 'peça' : 'peças'})
                  </td>
                  <td className="g-p2">—</td>
                  <td className="g-direita">{o.pesoCg === null ? '—' : gramas(o.pesoCg)}</td>
                  <td>—</td>
                  <td className="g-direita">{reais(o.totalCentavos)}</td>
                </tr>
              }
            />
          </Cartao>

          <Cartao titulo="Valores">
            <dl className="g-dl">
              <div>
                <dt>Valor total</dt>
                <dd>{reais(o.totalCentavos)}</dd>
              </div>
              <div>
                <dt>Preço médio por grama</dt>
                <dd>{rg === null ? '—' : reais(rg)}</dd>
              </div>
              <div>
                <dt>Teor ou quilates</dt>
                <dd>{teoresDaCompra(o)}</dd>
              </div>
              <div>
                <dt>Pago ao cliente</dt>
                <dd>{o.pagamento ? reais(o.pagamento.valorCentavos) : 'ainda não pago'}</dd>
              </div>
            </dl>
            {alertas.length > 0 && (
              <p className="g-tags" style={{ marginTop: 12 }}>
                {alertas.map((a) => (
                  <Tag key={a} tom="perigo">
                    {a}
                  </Tag>
                ))}
              </p>
            )}
          </Cartao>

          <Cartao titulo="Compra">
            <dl className="g-dl">
              <div>
                <dt>Local</dt>
                <dd>{nomeDoLocal(o.localId)}</dd>
              </div>
              <div>
                <dt>Comprador</dt>
                <dd>{nomeDosCompradores(o.compradorIds)}</dd>
              </div>
              <div>
                <dt>Quem pagou</dt>
                <dd>{nomeDoPagador(o.pagadorId)}</dd>
              </div>
              <div>
                <dt>Situação do ouro</dt>
                <dd>{ROTULO_SITUACAO[o.situacao]}</dd>
              </div>
              <div>
                <dt>Observação</dt>
                <dd>{o.observacao || '—'}</dd>
              </div>
            </dl>
          </Cartao>

          <Cartao titulo="Termo de origem">
            <p>{o.termoAssinadoEm ? `Assinado pelo cliente em ${dataHora(o.termoAssinadoEm)}.` : 'Ainda não assinado.'}</p>
          </Cartao>

          <Cartao titulo="Pagamento">
            {o.pagamento ? (
              <dl className="g-dl">
                <div>
                  <dt>ID do PIX</dt>
                  <dd className="g-num">{o.pagamento.idPix}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{dataHora(o.pagamento.pagoEm)}</dd>
                </div>
                <div>
                  <dt>Situação</dt>
                  <dd>
                    <Tag tom="sucesso">Pago</Tag>
                  </dd>
                </div>
                <div>
                  <dt>Conta de origem</dt>
                  <dd>
                    {o.pagamento.contaOrigem} · {o.pagamento.instituicaoOrigem}
                  </dd>
                </div>
                <div>
                  <dt>Chave PIX ou conta de destino</dt>
                  <dd>
                    {o.pagamento.chaveDestino} · {o.pagamento.instituicaoDestino}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>Ainda não pago.</p>
            )}
          </Cartao>

          <Cartao titulo={`Documentos (${o.documentos.length})`}>
            <ul className="g-tempo">
              {o.documentos.map((d) => (
                <li key={d.id}>
                  {NOME_DOC[d.tipo]}
                  {d.peca ? ` · peça ${d.peca}` : ''}
                  <small>
                    {d.nomeArquivo} · {d.tamanhoKb} KB · {dataCurta(d.enviadoEm)}
                  </small>
                </li>
              ))}
            </ul>
          </Cartao>

          {(lote || o.envio) && (
            <Cartao titulo="Lote e venda">
              <dl className="g-dl">
                {lote && (
                  <div>
                    <dt>Venda</dt>
                    <dd>
                      <Link to="/envio">{lote.vendaCodigo}</Link> · {lote.vendaSituacao === 'aberta' ? 'aberta' : 'fechada'}
                    </dd>
                  </div>
                )}
                {lote && (
                  <div>
                    <dt>Peso enviado no lote</dt>
                    <dd>{lote.pesoEnviadoCg === null ? 'só o admin vê (o lote tem compras de outras lojas)' : gramas(lote.pesoEnviadoCg)}</dd>
                  </div>
                )}
                {o.envio && (
                  <div>
                    <dt>Transporte</dt>
                    <dd>
                      {o.envio.transportadora} · {o.envio.codigoRastreio}
                    </dd>
                  </div>
                )}
              </dl>
            </Cartao>
          )}

          <Cartao titulo="Histórico">
            <ol className="g-tempo">
              {o.historico.map((h) => (
                <li key={h.em + h.acao}>
                  <strong>{h.acao}</strong>
                  {h.detalhe ? ` · ${h.detalhe}` : ''}
                  <small>
                    {h.autor}
                    {h.perfil !== 'sistema' ? ` (${nomeDoPerfil(h.perfil)})` : ''} · {dataHora(h.em)}
                  </small>
                </li>
              ))}
            </ol>
          </Cartao>
        </div>

        <div>
          <Cartao titulo="Resumo">
            <dl className="g-dl">
              <div>
                <dt>Peças</dt>
                <dd>{o.pecas.length}</dd>
              </div>
              <div>
                <dt>Criada em</dt>
                <dd>{dataHora(o.criadoEm)}</dd>
              </div>
              <div>
                <dt>Atualizada em</dt>
                <dd>{dataHora(o.atualizadoEm)}</dd>
              </div>
              <div>
                <dt>Registrada por</dt>
                <dd>{o.criadoPor}</dd>
              </div>
            </dl>
          </Cartao>
          <Cartao titulo="Ações">
            {acao ? (
              podeAgir ? (
                <button type="button" className="g-btn g-btn-primario" onClick={() => void agir(acao.rotulo)}>
                  {acao.rotulo}
                </button>
              ) : (
                <p className="g-texto2">Próxima etapa: {acao.rotulo.toLowerCase()} (só um admin).</p>
              )
            ) : (
              <p className="g-texto2">Compra concluída.</p>
            )}
          </Cartao>
          {cliente && (
            <Cartao titulo="Cliente">
              <p>{clienteVisivel ? <Link to={`/clientes/${cliente.id}`}>{cliente.nome}</Link> : cliente.nome}</p>
              {!clienteVisivel && <p className="g-texto2">Cadastro feito em outra loja.</p>}
              <p className="g-texto2">{mascaraDocumento(cliente.documento)}</p>
              <p className="g-tags" style={{ marginTop: 8 }}>
                <Tag tom="info">{cliente.tipo}</Tag>
                <TagCompliance status={cliente.status} />
              </p>
            </Cartao>
          )}
        </div>
      </div>
    </Pagina>
  );
}
