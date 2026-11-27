/** Transações (/transacoes): os pagamentos feitos aos clientes (PIX), com busca, período e o total do filtro. */
import { useState } from 'react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { clienteDaOperacao, listarTransacoes, nomeDoLocal } from '../services/dados';
import { Aviso, Busca, CampoTexto, Carregando, Cartao, Paginador, Pagina, TagStatus, useCarregar, usePaginacao } from '../componentes/ui';
import { Tabela, type Coluna } from '../componentes/Tabela';
import type { Operacao } from '../tipos';
import { chavePixParcial, dataHora, reais } from '../utils/formato';
import '../estilos/telas.css';

const COLUNAS: readonly Coluna<Operacao>[] = [
  { titulo: 'Código', principal: true, celula: (o) => <span className="g-num">{o.codigo}</span> },
  { titulo: 'Cliente', celula: (o) => clienteDaOperacao(o)?.nome ?? '—' },
  { titulo: 'Local', p2: true, celula: (o) => nomeDoLocal(o.localId) },
  // na lista, a chave vai parcial (LGPD); completa só no detalhe da compra
  { titulo: 'Chave PIX', p2: true, celula: (o) => (o.pagamento ? chavePixParcial(o.pagamento.chaveDestino) : '—') },
  { titulo: 'Valor pago', direita: true, celula: (o) => <span className="g-num">{reais(o.pagamento?.valorCentavos ?? 0)}</span> },
  { titulo: 'Data do pagamento', celula: (o) => (o.pagamento ? dataHora(o.pagamento.pagoEm) : '—') },
  { titulo: 'Status', celula: (o) => <TagStatus status={o.status} /> },
];

/** "aaaa-mm-dd" do input date → início ou fim desse dia, no fuso do aparelho. */
const inicioDoDia = (d: string): Date | undefined => (d ? new Date(`${d}T00:00:00`) : undefined);
const fimDoDia = (d: string): Date | undefined => (d ? new Date(`${d}T23:59:59.999`) : undefined);

export default function Transacoes() {
  const usuario = useUsuario();
  const { localIds } = useSessao();
  const [busca, setBusca] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const invertido = Boolean(de && ate && de > ate);
  const { dados, erro } = useCarregar(() => listarTransacoes(usuario, { localIds, busca, de: inicioDoDia(de), ate: fimDoDia(ate) }), JSON.stringify([usuario.id, localIds, busca, de, ate]));
  const pagamentos = invertido ? [] : [...(dados ?? [])].sort((a, b) => (b.pagamento?.pagoEm ?? '').localeCompare(a.pagamento?.pagoEm ?? ''));
  const pag = usePaginacao(pagamentos, 10);
  const total = pagamentos.reduce((s, o) => s + (o.pagamento?.valorCentavos ?? 0), 0);

  const mudar =
    (set: (v: string) => void) =>
    (v: string): void => {
      set(v);
      pag.irPara(1);
    };

  return (
    <Pagina titulo="Transações" subtitulo="Pagamentos feitos aos clientes.">
      <Cartao>
        <div className="g-filtros" style={{ marginBottom: 16 }}>
          <Busca rotulo="Buscar por código, cliente ou ID do PIX" valor={busca} aoMudar={mudar(setBusca)} />
          <CampoTexto rotulo="De" tipo="date" valor={de} aoMudar={mudar(setDe)} />
          <CampoTexto rotulo="Até" tipo="date" valor={ate} aoMudar={mudar(setAte)} erro={invertido ? 'Esta data é antes da data "De".' : undefined} />
        </div>
        {erro ? (
          <Aviso tipo="erro">{erro}</Aviso>
        ) : !dados ? (
          <Carregando texto="Carregando pagamentos…" />
        ) : (
          <>
            <Tabela
              legenda="Pagamentos aos clientes"
              colunas={COLUNAS}
              linhas={pag.pagina}
              chave={(o) => o.id}
              link={(o) => `/operacoes/${o.id}`}
              rotuloLink={(o) => `Abrir a compra ${o.codigo}`}
              vazio={{ titulo: 'Nenhum pagamento no período', dica: 'Mude a busca ou as datas.' }}
            />
            {pagamentos.length > 0 && (
              <p className="t-total">
                <span>
                  Total do filtro ({pagamentos.length} {pagamentos.length === 1 ? 'pagamento' : 'pagamentos'})
                </span>
                <span className="g-num">{reais(total)}</span>
              </p>
            )}
            <Paginador atual={pag.atual} total={pag.total} porPagina={pag.porPagina} quantidade={pagamentos.length} irPara={pag.irPara} mudarPorPagina={pag.mudarPorPagina} />
          </>
        )}
      </Cartao>
    </Pagina>
  );
}
