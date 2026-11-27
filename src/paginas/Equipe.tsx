/**
 * Equipe (/equipe): os usuários das lojas visíveis, os últimos convites e o convite de um usuário novo.
 * Admin vê e mexe em todos (menos em si); o gerente vê a própria loja e não mexe em admins.
 */
import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { useSessao, useUsuario } from '../contexts/Sessao';
import { nomeDoPerfil } from '../componentes/Casca';
import { convidarUsuario, listarEquipe, mudarUsuario } from '../services/dados';
import { LOJAS, nomeDaLoja } from '../services/lojas';
import { perfisConvidaveis } from '../services/permissoes';
import { NaoLigadoError, textoDoErro } from '../services/simulacao';
import { Aviso, CampoSelect, CampoTexto, Carregando, Cartao, Dialogo, Pagina, Tag, useCarregar, useMensagem, type Tom } from '../componentes/ui';
import { Tabela, type Coluna } from '../componentes/Tabela';
import type { Convite, LojaId, Perfil, StatusConvite, Usuario } from '../tipos';
import { dataCurta, emailValido } from '../utils/formato';
import '../estilos/telas.css';

const TOM_PERFIL: Record<Perfil, Tom> = { admin: 'info', gerente: 'aviso', atendente: 'neutra' };
const CONVITE: Record<StatusConvite, [string, Tom]> = { pendente: ['Pendente', 'aviso'], usado: ['Usado', 'sucesso'], expirado: ['Expirado', 'neutra'] };
const lojasDe = (ids: readonly LojaId[]): string => (ids.length === LOJAS.length ? 'Todas' : ids.map(nomeDaLoja).join(', '));

export default function Equipe() {
  const usuario = useUsuario();
  const { locais } = useSessao();
  // lojas do filtro do topo (admin em "todas": as 3; gerente: a dele)
  const lojaIds = [...new Set(locais.flatMap((l) => (l.lojaId ? [l.lojaId] : [])))];
  const { dados, erro } = useCarregar(() => listarEquipe(usuario, lojaIds), JSON.stringify([usuario.id, lojaIds]));
  const [convidando, setConvidando] = useState(false);
  const msg = useMensagem();
  const admin = usuario.perfil === 'admin';

  const podeMexer = (u: Usuario): boolean => u.id !== usuario.id && (admin || u.perfil !== 'admin');

  async function acao(rotulo: string): Promise<void> {
    try {
      await mudarUsuario(rotulo);
    } catch (e) {
      msg.mostrar(e instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(e));
    }
  }

  const colunas: readonly Coluna<Usuario>[] = [
    {
      titulo: 'Nome',
      principal: true,
      celula: (u) => (
        <span className="g-tags">
          {u.nome}
          {u.id === usuario.id && <Tag tom="sucesso">Você</Tag>}
        </span>
      ),
    },
    { titulo: 'E-mail', celula: (u) => u.email },
    { titulo: 'Perfil', celula: (u) => <Tag tom={TOM_PERFIL[u.perfil]}>{nomeDoPerfil(u.perfil)}</Tag> },
    { titulo: 'Loja(s)', p2: true, celula: (u) => lojasDe(u.lojaIds) },
    { titulo: 'Status', celula: (u) => (u.status === 'ativo' ? <Tag tom="sucesso">Ativo</Tag> : <Tag>Desativado</Tag>) },
    { titulo: 'Desde', p2: true, celula: (u) => dataCurta(u.desde) },
    {
      titulo: 'Ações',
      celula: (u) =>
        podeMexer(u) ? (
          <span className="g-linha-acoes">
            <button type="button" className="g-btn" aria-label={`Mudar perfil de ${u.nome}`} onClick={() => void acao(`Mudar perfil de ${u.nome}`)}>
              Mudar perfil
            </button>
            {u.status === 'ativo' ? (
              <button type="button" className="g-btn g-btn-perigo" aria-label={`Desativar ${u.nome}`} onClick={() => void acao(`Desativar ${u.nome}`)}>
                Desativar
              </button>
            ) : (
              <button type="button" className="g-btn" aria-label={`Reativar ${u.nome}`} onClick={() => void acao(`Reativar ${u.nome}`)}>
                Reativar
              </button>
            )}
          </span>
        ) : (
          <span className="g-texto2">—</span>
        ),
    },
  ];

  const convites = [...(dados?.convites ?? [])].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <Pagina
      titulo="Equipe"
      subtitulo={`Usuários de ${lojaIds.length === LOJAS.length ? 'todas as lojas' : lojaIds.map(nomeDaLoja).join(', ')}.`}
      acoes={
        perfisConvidaveis(usuario.perfil).length > 0 && (
          <button type="button" className="g-btn g-btn-primario" onClick={() => setConvidando(true)}>
            <UserPlus aria-hidden="true" /> Convidar usuário
          </button>
        )
      }
    >
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}
      {erro ? (
        <Aviso tipo="erro">{erro}</Aviso>
      ) : !dados ? (
        <Carregando texto="Carregando equipe…" />
      ) : (
        <>
          <Cartao titulo="Usuários" descricao={admin ? undefined : 'Admins aparecem na lista, mas só outro admin mexe neles.'}>
            <Tabela legenda="Usuários" colunas={colunas} linhas={dados.usuarios} chave={(u) => u.id} vazio={{ titulo: 'Nenhum usuário nesta loja' }} />
          </Cartao>
          <Cartao titulo="Últimos convites">
            {convites.length ? (
              <ul className="t-lista">
                {convites.map((c) => (
                  <ItemConvite key={c.id} convite={c} />
                ))}
              </ul>
            ) : (
              <p className="g-texto2">Nenhum convite ainda.</p>
            )}
          </Cartao>
        </>
      )}
      {convidando && <DialogoConvite usuario={usuario} jaNaEquipe={(dados?.usuarios ?? []).map((u) => u.email.toLowerCase())} aoFechar={() => setConvidando(false)} />}
    </Pagina>
  );
}

function ItemConvite({ convite: c }: { convite: Convite }) {
  const [rotulo, tom] = CONVITE[c.status];
  return (
    <li>
      <span className="t-lista-texto">
        <strong>{c.email}</strong>
        <span className="g-texto2">
          {nomeDaLoja(c.lojaId)} · {dataCurta(c.criadoEm)}
        </span>
      </span>
      <span className="g-tags">
        <Tag tom={TOM_PERFIL[c.perfil]}>{nomeDoPerfil(c.perfil)}</Tag>
        <Tag tom={tom}>{rotulo}</Tag>
      </span>
    </li>
  );
}

function DialogoConvite({ usuario, jaNaEquipe, aoFechar }: { usuario: Usuario; jaNaEquipe: readonly string[]; aoFechar: () => void }) {
  const perfis = perfisConvidaveis(usuario.perfil);
  const lojas = usuario.perfil === 'admin' ? LOJAS : LOJAS.filter((l) => usuario.lojaIds.includes(l.id));
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<string>(perfis[0] ?? '');
  const [loja, setLoja] = useState<string>(lojas.length === 1 ? lojas[0].id : '');
  const [erros, setErros] = useState<{ email?: string; perfil?: string; loja?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const msg = useMensagem();
  const idForm = 'form-convite';

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    const novos = {
      email: !email.trim() ? 'Informe o e-mail.' : !emailValido(email) ? 'E-mail inválido.' : jaNaEquipe.includes(email.trim().toLowerCase()) ? 'Este e-mail já está na equipe.' : undefined,
      perfil: perfis.some((p) => p === perfil) ? undefined : 'Escolha o perfil.',
      loja: lojas.some((l) => l.id === loja) ? undefined : 'Escolha a loja.',
    };
    setErros(novos);
    if (novos.email || novos.perfil || novos.loja) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      await convidarUsuario();
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      titulo="Convidar usuário"
      aoFechar={aoFechar}
      acoes={
        <>
          <button type="button" className="g-btn" onClick={aoFechar}>
            Fechar
          </button>
          <button type="submit" form={idForm} className="g-btn g-btn-primario" disabled={enviando}>
            {enviando ? 'Gerando…' : 'Gerar convite'}
          </button>
        </>
      }
    >
      {msg.mensagem && (
        <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
          {msg.mensagem.texto}
        </Aviso>
      )}
      <form id={idForm} className="g-form" onSubmit={enviar} noValidate>
        <CampoTexto rotulo="E-mail do convidado" tipo="email" modo="email" obrigatorio valor={email} aoMudar={setEmail} erro={erros.email} />
        <CampoSelect
          rotulo="Perfil"
          obrigatorio
          opcoes={perfis.map((p) => ({ valor: p, rotulo: nomeDoPerfil(p) }))}
          valor={perfil}
          aoMudar={setPerfil}
          erro={erros.perfil}
          ajuda={usuario.perfil === 'gerente' ? 'O gerente convida só atendentes da própria loja.' : undefined}
        />
        <CampoSelect rotulo="Loja" obrigatorio vazio={lojas.length > 1 ? 'Escolha' : undefined} opcoes={lojas.map((l) => ({ valor: l.id, rotulo: l.nome }))} valor={loja} aoMudar={setLoja} erro={erros.loja} />
      </form>
    </Dialogo>
  );
}
