/**
 * Casca do sistema: topo (marca, selo "Dados de exemplo", Loja atual, tema, notificações, menu do usuário), menu
 * lateral (≥1180), trilho de ícones (iPad em pé) ou gaveta (celular e tela Avaliar), e o conteúdo.
 * Só abre com login: sem sessão, manda para /entrar e volta para a tela pedida depois.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { ArrowLeftRight, Bell, Calculator, LayoutDashboard, LogOut, Menu, Moon, Receipt, Settings, ShoppingBag, Sun, Tag as IconeTag, Truck, User, Users, UsersRound, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import logo from '../../logo-transparente.png';
import { useSessao } from '../contexts/Sessao';
import { pode, type Area, type FiltroLoja } from '../services/permissoes';
import { LOJAS, lojaAtual, nomeDaLoja } from '../services/lojas';
import { listarNotificacoes } from '../services/dados';
import type { LojaId, Notificacao, Perfil } from '../tipos';
import { dataCurta } from '../utils/formato';
import { CELULAR, useMidia } from './ui';

const ITENS: readonly { area: Area; para: string; rotulo: string; Icone: LucideIcon }[] = [
  { area: 'painel', para: '/painel', rotulo: 'Painel', Icone: LayoutDashboard },
  { area: 'avaliar', para: '/avaliar', rotulo: 'Avaliar', Icone: Calculator },
  { area: 'operacao_nova', para: '/operacoes/nova', rotulo: 'Registrar compra', Icone: ShoppingBag },
  { area: 'clientes', para: '/clientes', rotulo: 'Clientes', Icone: Users },
  { area: 'operacoes', para: '/operacoes', rotulo: 'Operações', Icone: Receipt },
  { area: 'envio', para: '/envio', rotulo: 'Envio', Icone: Truck },
  { area: 'transacoes', para: '/transacoes', rotulo: 'Transações', Icone: ArrowLeftRight },
  { area: 'equipe', para: '/equipe', rotulo: 'Equipe', Icone: UsersRound },
  { area: 'precos', para: '/precos', rotulo: 'Preços', Icone: IconeTag },
];

const NOME_PERFIL: Record<Perfil, string> = { admin: 'Admin', gerente: 'Gerente', atendente: 'Atendente' };
export const nomeDoPerfil = (p: Perfil): string => NOME_PERFIL[p];

/** Fecha um menu suspenso com Esc ou clique fora, devolvendo o foco ao botão. */
function useMenuSuspenso(): { aberto: boolean; alternar: () => void; fechar: () => void; ancora: React.RefObject<HTMLDivElement | null>; botao: React.RefObject<HTMLButtonElement | null> } {
  const [aberto, setAberto] = useState(false);
  const ancora = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent): void => {
      if (!ancora.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);
  return { aberto, alternar: () => setAberto((a) => !a), fechar: () => setAberto(false), ancora, botao };
}

/**
 * No Avaliar, o topo mostra a LOJA DO APARELHO (de onde vêm os preços), não a do usuário nem o filtro do admin.
 * A loja só muda dentro do avaliador (escolha ou troca com senha), sempre num toque ou tecla: relê depois de cada um.
 */
function LojaDoAparelho() {
  const [loja, setLoja] = useState<LojaId | null>(lojaAtual);
  useEffect(() => {
    let timer = 0;
    const reler = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setLoja(lojaAtual()), 0);
    };
    document.addEventListener('click', reler);
    document.addEventListener('keyup', reler);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('click', reler);
      document.removeEventListener('keyup', reler);
    };
  }, []);
  return <span className="g-topo-aparelho">{loja ? `Preços da ${nomeDaLoja(loja)} (este aparelho)` : 'Este aparelho ainda não tem loja'}</span>;
}

export function Casca() {
  const { usuario, sair, filtroLoja, mudarFiltroLoja, tema, mudarTema } = useSessao();
  const local = useLocation();
  const navegar = useNavigate();
  const [gaveta, setGaveta] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const menuUsuario = useMenuSuspenso();
  const menuAvisos = useMenuSuspenso();
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const balcao = local.pathname.startsWith('/avaliar');
  const celular = useMidia(CELULAR);
  // Gaveta fechada (celular e Avaliar): fora da tela e fora do Tab.
  const navEscondido = (celular || balcao) && !gaveta;

  // só as notificações que levam a uma tela que o perfil abre
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    void listarNotificacoes(usuario).then((ns) => vivo && setNotificacoes(ns));
    return () => {
      vivo = false;
    };
  }, [usuario]);
  // Troca de tela fecha a gaveta e os menus (os menus não entram nas dependências: só a troca de tela fecha).
  useEffect(() => {
    setGaveta(false);
    menuUsuario.fechar();
    menuAvisos.fechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.pathname]);
  useEffect(() => {
    if (!gaveta) return;
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setGaveta(false);
        botaoMenu.current?.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [gaveta]);

  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;

  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const iniciais = usuario.nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
  const itens = ITENS.filter((i) => pode(usuario.perfil, i.area));

  return (
    <div className={`g-casca${balcao ? ' balcao' : ''}`}>
      <a className="g-pular" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus(); }}>
        Pular para o conteúdo
      </a>
      <header className="g-topo">
        <button ref={botaoMenu} type="button" className="g-btn-icone g-btn-menu" aria-label={gaveta ? 'Fechar menu' : 'Abrir menu'} aria-expanded={gaveta} aria-controls="menu-principal" onClick={() => setGaveta((g) => !g)}>
          {gaveta ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
        {!balcao && (
          <Link to="/" className="g-marca" aria-label="Valor da Joia, início">
            <img src={logo} alt="" />
          </Link>
        )}
        <span className="g-selo" title="Os dados destas telas são inventados, para teste">
          Dados de exemplo
        </span>
        <span className="g-topo-espaco" />
        {balcao ? (
          <LojaDoAparelho />
        ) : usuario.perfil === 'admin' ? (
          <label className="g-topo-loja">
            <span className="g-topo-loja-rotulo">Loja atual</span>
            <span className="g-sr">Loja atual</span>
            <select value={filtroLoja} onChange={(e) => mudarFiltroLoja(e.target.value as FiltroLoja)}>
              <option value="todas">Todas</option>
              {LOJAS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="g-topo-loja g-topo-loja-rotulo">{LOJAS.find((l) => l.id === usuario.lojaIds[0])?.nome}</span>
        )}
        <button type="button" className="g-btn-icone" aria-label={tema === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={() => mudarTema(tema === 'escuro' ? 'claro' : 'escuro')}>
          {tema === 'escuro' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <div className="g-ancora" ref={menuAvisos.ancora}>
          <button ref={menuAvisos.botao} type="button" className="g-btn-icone" aria-label={`Notificações${naoLidas ? `, ${naoLidas} não lidas` : ''}`} aria-expanded={menuAvisos.aberto} aria-haspopup="true" onClick={menuAvisos.alternar}>
            <Bell aria-hidden="true" />
            {naoLidas > 0 && (
              <span className="g-contador" aria-hidden="true">
                {naoLidas}
              </span>
            )}
          </button>
          {menuAvisos.aberto && (
            <div className="g-pop" role="region" aria-label="Notificações">
              <div className="g-pop-cab">
                <strong>Notificações</strong>
                <span className="g-texto2">Exemplos; marcar como lida só vale nesta tela.</span>
              </div>
              {notificacoes.length === 0 && <p className="g-texto2 g-pop-vazio">Nenhuma notificação.</p>}
              {notificacoes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="g-pop-item"
                  onClick={() => {
                    setNotificacoes((ns) => ns.map((x) => (x.id === n.id ? { ...x, lida: true } : x)));
                    navegar(n.link);
                  }}
                >
                  <span>
                    {!n.lida && <span className="g-sr">Não lida: </span>}
                    {n.texto}
                    <small className="g-celula-2">{dataCurta(n.em)}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="g-ancora" ref={menuUsuario.ancora}>
          <button ref={menuUsuario.botao} type="button" className="g-avatar" aria-label={`${iniciais}, menu do usuário: ${usuario.nome}`} aria-expanded={menuUsuario.aberto} aria-haspopup="true" onClick={menuUsuario.alternar}>
            {iniciais}
          </button>
          {menuUsuario.aberto && (
            <div className="g-pop" role="region" aria-label="Menu do usuário">
              <div className="g-pop-cab">
                <strong>{usuario.nome}</strong>
                <span className="g-texto2">{nomeDoPerfil(usuario.perfil)}</span>
              </div>
              <Link to="/perfil">
                <User aria-hidden="true" size={18} /> Meu perfil
              </Link>
              <Link to="/configuracoes">
                <Settings aria-hidden="true" size={18} /> Configurações
              </Link>
              <button
                type="button"
                className="g-pop-item"
                onClick={() => {
                  sair();
                  navegar('/entrar', { replace: true });
                }}
              >
                <LogOut aria-hidden="true" size={18} /> Sair
              </button>
            </div>
          )}
        </div>
      </header>

      {gaveta && <div className="g-veu" onClick={() => setGaveta(false)} aria-hidden="true" />}
      <nav className="g-nav" id="menu-principal" aria-label="Menu principal" data-aberto={gaveta} inert={navEscondido}>
        <ul>
          {itens.map(({ para, rotulo, Icone }) => (
            <li key={para}>
              <NavLink to={para} end={para === '/operacoes'}>
                <Icone aria-hidden="true" />
                <span>{rotulo}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="g-principal" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
