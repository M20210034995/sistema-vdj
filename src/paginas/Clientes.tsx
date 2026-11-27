/** Clientes (/clientes): busca, filtro de status, lista paginada e o CSV da lista filtrada. */
import { useState } from 'react';
import { Link } from 'react-router';
import { Download, UserPlus } from 'lucide-react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { listarClientes, nomeDoLocal } from '../services/dados';
import { Aviso, Busca, Carregando, Cartao, Paginador, Pagina, Segmentado, TagCompliance, useCarregar, usePaginacao } from '../componentes/ui';
import { Tabela, type Coluna } from '../componentes/Tabela';
import type { Cliente, StatusCompliance } from '../tipos';
import { documentoParcial, mascaraDocumento } from '../utils/formato';
import { baixarTexto, hojeIso, montarCsv } from '../utils/entrada';
import '../estilos/telas.css';

type FiltroStatus = StatusCompliance | 'todos';

const STATUS: readonly { valor: FiltroStatus; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'aprovado', rotulo: 'Aprovado' },
  { valor: 'reprovado', rotulo: 'Reprovado' },
];
const ROTULO_STATUS_CLIENTE: Record<StatusCompliance, string> = { pendente: 'Pendente', aprovado: 'Aprovado', reprovado: 'Reprovado' };
const tipoPorExtenso = (c: Cliente): string => (c.tipo === 'PF' ? 'Pessoa física' : 'Pessoa jurídica');

const COLUNAS: readonly Coluna<Cliente>[] = [
  {
    titulo: 'Nome',
    principal: true,
    celula: (c) => (
      <>
        {c.nome}
        <span className="g-celula-2">{tipoPorExtenso(c)}</span>
      </>
    ),
  },
  // na lista, o documento vai parcial (LGPD); completo só no detalhe do cliente
  { titulo: 'CPF/CNPJ', celula: (c) => <span className="g-num">{documentoParcial(c.documento)}</span> },
  { titulo: 'E-mail', p2: true, celula: (c) => c.email },
  { titulo: 'Cidade/UF', p2: true, celula: (c) => `${c.endereco.cidade}/${c.endereco.uf}` },
  { titulo: 'Local', celula: (c) => nomeDoLocal(c.localId) },
  { titulo: 'Status', celula: (c) => <TagCompliance status={c.status} /> },
];

export default function Clientes() {
  const usuario = useUsuario();
  const { localIds } = useSessao();
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<FiltroStatus>('todos');
  const [baixado, setBaixado] = useState<number | null>(null);
  const todos = useCarregar(() => listarClientes(usuario, { localIds }), JSON.stringify([usuario.id, localIds]));
  const lista = useCarregar(() => listarClientes(usuario, { localIds, busca, status }), JSON.stringify([usuario.id, localIds, busca, status]));
  const clientes = lista.dados ?? [];
  const pag = usePaginacao(clientes, 10);

  const mudarBusca = (v: string): void => {
    setBusca(v);
    pag.irPara(1);
  };
  const mudarStatus = (v: FiltroStatus): void => {
    setStatus(v);
    pag.irPara(1);
  };

  function exportar(): void {
    const linhas = [
      ['Nome', 'Tipo', 'CPF/CNPJ', 'E-mail', 'Cidade', 'UF', 'Local', 'Status'],
      ...clientes.map((c) => [c.nome, c.tipo, mascaraDocumento(c.documento), c.email, c.endereco.cidade, c.endereco.uf, nomeDoLocal(c.localId), ROTULO_STATUS_CLIENTE[c.status]]),
    ];
    baixarTexto(`clientes-${hojeIso()}.csv`, montarCsv(linhas));
    setBaixado(clientes.length);
  }

  const total = todos.dados?.length;

  return (
    <Pagina
      titulo="Clientes"
      subtitulo={total === undefined ? 'Contando clientes…' : `${total} ${total === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
      acoes={
        <>
          <button type="button" className="g-btn" onClick={exportar} disabled={!clientes.length}>
            <Download aria-hidden="true" /> Exportar CSV
          </button>
          <Link className="g-btn g-btn-primario" to="/clientes/novo">
            <UserPlus aria-hidden="true" /> Novo cliente
          </Link>
        </>
      }
    >
      {baixado !== null && <Aviso tipo="sucesso">CSV baixado com {baixado === 1 ? '1 cliente' : `${baixado} clientes`} (a lista filtrada).</Aviso>}
      <Cartao>
        <div className="g-filtros" style={{ marginBottom: 16 }}>
          <Busca rotulo="Buscar por nome, CPF/CNPJ ou e-mail" valor={busca} aoMudar={mudarBusca} />
          <Segmentado rotulo="Status" opcoes={STATUS} valor={status} aoMudar={mudarStatus} />
        </div>
        {lista.erro ? (
          <Aviso tipo="erro">{lista.erro}</Aviso>
        ) : !lista.dados ? (
          <Carregando texto="Carregando clientes…" />
        ) : (
          <>
            <Tabela
              legenda="Clientes"
              colunas={COLUNAS}
              linhas={pag.pagina}
              chave={(c) => c.id}
              link={(c) => `/clientes/${c.id}`}
              rotuloLink={(c) => `Abrir ${c.nome}`}
              vazio={{ titulo: 'Nenhum cliente encontrado', dica: 'Mude a busca ou o filtro de status.' }}
            />
            <Paginador atual={pag.atual} total={pag.total} porPagina={pag.porPagina} quantidade={clientes.length} irPara={pag.irPara} mudarPorPagina={pag.mudarPorPagina} />
          </>
        )}
      </Cartao>
    </Pagina>
  );
}
