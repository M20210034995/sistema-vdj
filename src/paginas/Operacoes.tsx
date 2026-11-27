/** Operações (compras): período, busca, status, tabela paginada e CSV. Estrutura da tela de Operações do sistema de referência. */
import { useState } from 'react';
import { Link } from 'react-router';
import { Download, Plus } from 'lucide-react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { clienteDaOperacao, listarOperacoes, nomeDoLocal, nomeDosCompradores, ORDEM_STATUS, ROTULO_STATUS } from '../services/dados';
import { Aviso, Busca, CampoSelect, Carregando, Pagina, Paginador, Segmentado, TagStatus, useCarregar, usePaginacao } from '../componentes/ui';
import { Tabela } from '../componentes/Tabela';
import { dataCurta, documentoParcial, gramas, reais } from '../utils/formato';
import { intervalo, PERIODOS, type Periodo } from '../utils/periodo';
import type { Operacao, StatusOperacao } from '../tipos';

const material = (o: Operacao): string => [...new Set(o.pecas.map((p) => (p.quilate ? p.quilate.toUpperCase() : 'teor ?')))].join(' + ');

function baixarCsv(linhas: Operacao[]): void {
  const cab = ['Código', 'Data', 'Cliente', 'Local', 'Comprador', 'Peso (g)', 'Valor (R$)', 'Status'];
  const campo = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  const corpo = linhas.map((o) =>
    [o.codigo, dataCurta(o.criadoEm), clienteDaOperacao(o)?.nome ?? '', nomeDoLocal(o.localId), nomeDosCompradores(o.compradorIds), o.pesoCg === null ? '' : (o.pesoCg / 100).toFixed(2).replace('.', ','), (o.totalCentavos / 100).toFixed(2).replace('.', ','), ROTULO_STATUS[o.status]].map(campo).join(';'),
  );
  const blob = new Blob([`﻿${[cab.map(campo).join(';'), ...corpo].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operacoes-exemplo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Operacoes() {
  const usuario = useUsuario();
  const { localIds } = useSessao();
  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusOperacao | 'todos'>('todos');
  const i = intervalo(periodo, inicio, fim);
  const { dados, carregando, erro } = useCarregar(() => listarOperacoes(usuario, { localIds, de: i.de, ate: i.ate, busca, status }), JSON.stringify([usuario.id, localIds, periodo, inicio, fim, busca, status]));
  const lista = dados ?? [];
  const pag = usePaginacao(lista, 10);

  return (
    <Pagina
      titulo="Operações"
      subtitulo={dados ? `${lista.length} ${lista.length === 1 ? 'compra' : 'compras'} no filtro` : 'Compras de ouro'}
      acoes={
        <>
          <button type="button" className="g-btn" onClick={() => baixarCsv(lista)} disabled={!lista.length}>
            <Download aria-hidden="true" /> Exportar CSV
          </button>
          <Link to="/operacoes/nova" className="g-btn g-btn-primario">
            <Plus aria-hidden="true" /> Registrar compra
          </Link>
        </>
      }
    >
      <section className="g-cartao g-form" aria-label="Filtros">
        <div className="g-filtros">
          <Segmentado rotulo="Período" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
          {periodo === 'personalizado' && (
            <>
              <div className="g-campo">
                <label htmlFor="op-de">De</label>
                <input id="op-de" className="g-input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div className="g-campo">
                <label htmlFor="op-ate">Até</label>
                <input id="op-ate" className="g-input" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </>
          )}
        </div>
        <div className="g-filtros">
          <Busca rotulo="Buscar por código, cliente ou CPF/CNPJ" valor={busca} aoMudar={setBusca} />
          <div style={{ minWidth: 220 }}>
            <CampoSelect rotulo="Status" valor={status} aoMudar={(v) => setStatus(v as StatusOperacao | 'todos')} opcoes={[{ valor: 'todos', rotulo: 'Todos os status' }, ...ORDEM_STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] }))]} />
          </div>
        </div>
      </section>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <section className="g-cartao" aria-label="Lista de compras" aria-busy={carregando}>
        {carregando && !dados ? (
          <Carregando />
        ) : (
          <>
            <Tabela
              legenda="Compras"
              linhas={pag.pagina}
              chave={(o) => o.id}
              link={(o) => `/operacoes/${o.id}`}
              rotuloLink={(o) => `Abrir ${o.codigo}`}
              colunas={[
                { titulo: 'Código', celula: (o) => <span className="g-num">{o.codigo}</span>, principal: true },
                {
                  titulo: 'Cliente',
                  celula: (o) => {
                    const c = clienteDaOperacao(o);
                    return (
                      <>
                        {c?.nome ?? '—'}
                        {c && <span className="g-celula-2">{documentoParcial(c.documento)}</span>}
                      </>
                    );
                  },
                },
                { titulo: 'Local', celula: (o) => nomeDoLocal(o.localId), p2: true },
                {
                  titulo: 'Material',
                  celula: (o) => (
                    <>
                      {material(o)}
                      <span className="g-celula-2">{o.pesoCg === null ? 'sem peso' : `${gramas(o.pesoCg)} bruto`}</span>
                    </>
                  ),
                },
                { titulo: 'Valor total', celula: (o) => reais(o.totalCentavos), direita: true },
                { titulo: 'Status', celula: (o) => <TagStatus status={o.status} /> },
                { titulo: 'Data', celula: (o) => dataCurta(o.criadoEm), p2: true },
              ]}
              vazio={{ titulo: 'Nenhuma operação encontrada', dica: 'Tente outro período ou outra busca.' }}
            />
            <Paginador atual={pag.atual} total={pag.total} porPagina={pag.porPagina} quantidade={lista.length} irPara={pag.irPara} mudarPorPagina={pag.mudarPorPagina} />
          </>
        )}
      </section>
    </Pagina>
  );
}
