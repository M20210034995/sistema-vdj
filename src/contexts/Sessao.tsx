/** Sessão: usuário logado, "Loja atual" do topo e tema. Um contexto só, lido por todas as telas. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Local, Usuario } from '../tipos';
import { entrar as entrarNoServico, sair as sairDoServico, usuarioAtual } from '../services/auth';
import { locaisVisiveis, type FiltroLoja } from '../services/permissoes';
import { salvarTema, temaSalvo, type Tema } from '../services/tema';

interface ValorSessao {
  usuario: Usuario | null;
  entrar: (email: string, senha: string, manter: boolean) => Promise<Usuario>;
  sair: () => void;
  filtroLoja: FiltroLoja;
  mudarFiltroLoja: (f: FiltroLoja) => void;
  /** Locais que a pessoa vê com o filtro atual (lojas e, para o admin em "todas", os pontos). */
  locais: Local[];
  localIds: string[];
  tema: Tema;
  mudarTema: (t: Tema) => void;
}

const Contexto = createContext<ValorSessao | null>(null);
const CHAVE_FILTRO = 'vdj-filtro-loja';

function filtroSalvo(): FiltroLoja {
  try {
    const f = localStorage.getItem(CHAVE_FILTRO);
    return f === '1' || f === '2' || f === '3' ? f : 'todas';
  } catch {
    return 'todas';
  }
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => usuarioAtual());
  const [filtroLoja, setFiltroLoja] = useState<FiltroLoja>(filtroSalvo);
  const [tema, setTema] = useState<Tema>(temaSalvo);

  const valor = useMemo<ValorSessao>(() => {
    const locais = usuario ? locaisVisiveis(usuario, filtroLoja) : [];
    return {
      usuario,
      entrar: async (email, senha, manter) => {
        const u = await entrarNoServico(email, senha, manter);
        setUsuario(u);
        return u;
      },
      sair: () => {
        sairDoServico();
        setUsuario(null);
      },
      filtroLoja,
      mudarFiltroLoja: (f) => {
        setFiltroLoja(f);
        try {
          localStorage.setItem(CHAVE_FILTRO, f);
        } catch {
          /* vale até recarregar */
        }
      },
      locais,
      localIds: locais.map((l) => l.id),
      tema,
      mudarTema: (t) => {
        salvarTema(t);
        setTema(t);
      },
    };
  }, [usuario, filtroLoja, tema]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ValorSessao {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSessao fora do SessaoProvider');
  return v;
}

/** Para telas que só abrem com login (a casca garante): o usuário nunca é null aqui. */
export function useUsuario(): Usuario {
  const { usuario } = useSessao();
  if (!usuario) throw new Error('Tela protegida sem usuário');
  return usuario;
}
