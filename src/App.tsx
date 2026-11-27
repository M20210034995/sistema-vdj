/**
 * Rotas por hash (/#/painel): o GitHub Pages não tem volta para o index.html em rota de SPA, e assim o ?loja=N
 * continua antes do # (links das lojas). Tudo fica atrás do login (decisão do Pedro em 26/11/2026).
 */
import type { ReactNode } from 'react';
import { createHashRouter, Navigate, RouterProvider } from 'react-router';
import { Casca } from './componentes/Casca';
import { SessaoProvider, useSessao } from './contexts/Sessao';
import { inicioDo, pode, type Area } from './services/permissoes';
import Entrar from './paginas/Entrar';
import Avaliar from './paginas/Avaliar';
import Painel from './paginas/Painel';
import Operacoes from './paginas/Operacoes';
import OperacaoNova from './paginas/OperacaoNova';
import Operacao from './paginas/Operacao';
import Clientes from './paginas/Clientes';
import ClienteNovo from './paginas/ClienteNovo';
import Cliente from './paginas/Cliente';
import Envio from './paginas/Envio';
import Equipe from './paginas/Equipe';
import Transacoes from './paginas/Transacoes';
import Precos from './paginas/Precos';
import Perfil from './paginas/Perfil';
import Configuracoes from './paginas/Configuracoes';
import { NaoEncontrada, SemAcesso } from './paginas/Avisos';

/** Abre a tela só para quem pode; os outros veem "Sem acesso" (e o link para a própria tela inicial). */
function Rota({ area, children }: { area: Area; children: ReactNode }) {
  const { usuario } = useSessao();
  if (!usuario) return null;
  return pode(usuario.perfil, area) ? children : <SemAcesso />;
}

function Inicio() {
  const { usuario } = useSessao();
  return <Navigate to={usuario ? inicioDo(usuario.perfil) : '/entrar'} replace />;
}

const roteador = createHashRouter([
  { path: '/entrar', element: <Entrar /> },
  {
    path: '/',
    element: <Casca />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'painel', element: <Rota area="painel"><Painel /></Rota> },
      { path: 'avaliar', element: <Rota area="avaliar"><Avaliar /></Rota> },
      { path: 'clientes', element: <Rota area="clientes"><Clientes /></Rota> },
      { path: 'clientes/novo', element: <Rota area="cliente_novo"><ClienteNovo /></Rota> },
      { path: 'clientes/:id', element: <Rota area="cliente"><Cliente /></Rota> },
      { path: 'operacoes', element: <Rota area="operacoes"><Operacoes /></Rota> },
      { path: 'operacoes/nova', element: <Rota area="operacao_nova"><OperacaoNova /></Rota> },
      { path: 'operacoes/:id', element: <Rota area="operacao"><Operacao /></Rota> },
      { path: 'envio', element: <Rota area="envio"><Envio /></Rota> },
      { path: 'equipe', element: <Rota area="equipe"><Equipe /></Rota> },
      { path: 'transacoes', element: <Rota area="transacoes"><Transacoes /></Rota> },
      { path: 'precos', element: <Rota area="precos"><Precos /></Rota> },
      { path: 'perfil', element: <Rota area="perfil"><Perfil /></Rota> },
      { path: 'configuracoes', element: <Rota area="configuracoes"><Configuracoes /></Rota> },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
]);

export default function App() {
  return (
    <SessaoProvider>
      <RouterProvider router={roteador} />
    </SessaoProvider>
  );
}
