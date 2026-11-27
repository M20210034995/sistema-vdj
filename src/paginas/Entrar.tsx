/** Entrar. Login simulado (src/services/auth.ts); os botões de usuário de teste só existem no `npm run dev`. */
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import logo from '../../logo-transparente.png';
import { useSessao } from '../contexts/Sessao';
import { CREDENCIAIS_TESTE } from '../services/auth';
import { inicioDo } from '../services/permissoes';
import { textoDoErro } from '../services/simulacao';
import { Aviso, CampoTexto, useMensagem } from '../componentes/ui';
import { emailValido } from '../utils/formato';
import type { Perfil } from '../tipos';

export default function Entrar() {
  const { usuario, entrar } = useSessao();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  // começa desmarcado: só os tablets da loja ficam conectados (quem entra num aparelho de outra pessoa não fica)
  const [manter, setManter] = useState(false);
  const idManter = useId();
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const msg = useMensagem();
  const h1 = useRef<HTMLHeadingElement>(null);
  const de = (local.state as { de?: string } | null)?.de;

  useEffect(() => {
    document.title = 'Entrar · Valor da Joia';
    h1.current?.focus();
  }, []);

  if (usuario) return <Navigate to={de && de !== '/' ? de : inicioDo(usuario.perfil)} replace />;

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    const novos = { email: emailValido(email) ? undefined : 'Informe um e-mail válido.', senha: senha ? undefined : 'Informe a senha.' };
    setErros(novos);
    if (novos.email || novos.senha) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      const u = await entrar(email, senha, manter);
      // atendente cai direto no Avaliar; os outros, no Painel (ou na tela que pediram antes do login)
      navegar(de && de !== '/' ? de : inicioDo(u.perfil), { replace: true });
    } catch (erro) {
      msg.mostrar('erro', textoDoErro(erro));
      setEnviando(false);
    }
  }

  const preencher = (p: Perfil): void => {
    if (!CREDENCIAIS_TESTE) return;
    setEmail(CREDENCIAIS_TESTE[p].email);
    setSenha(CREDENCIAIS_TESTE[p].senha);
    // o atendente usa o tablet da loja; admin e gerente, em geral, o próprio aparelho
    setManter(p === 'atendente');
  };

  return (
    <main className="g-entrar">
      <div className="g-entrar-caixa">
        <img src={logo} alt="Valor da Joia" />
        <h1 ref={h1} tabIndex={-1}>
          Entrar
        </h1>
        <span className="g-selo" style={{ alignSelf: 'center' }}>
          Dados de exemplo
        </span>
        {msg.mensagem && (
          <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
            {msg.mensagem.texto}
          </Aviso>
        )}
        <form className="g-form g-cartao" onSubmit={enviar} noValidate>
          <CampoTexto rotulo="E-mail" tipo="email" modo="email" autoComplete="username" obrigatorio valor={email} aoMudar={setEmail} erro={erros.email} />
          <CampoTexto rotulo="Senha" tipo="password" autoComplete="current-password" obrigatorio valor={senha} aoMudar={setSenha} erro={erros.senha} />
          <div>
            <label className="g-check">
              <input type="checkbox" checked={manter} onChange={(e) => setManter(e.target.checked)} aria-describedby={idManter} />
              Manter conectado neste aparelho
            </label>
            <p id={idManter} className="g-ajuda">
              Para os tablets da loja: a sessão continua depois de fechar o app. Num aparelho de outra pessoa, deixe desmarcado.
            </p>
          </div>
          <button className="g-btn g-btn-primario" type="submit" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {CREDENCIAIS_TESTE && (
          <section className="g-cartao" aria-labelledby="teste-titulo">
            <h2 id="teste-titulo" style={{ fontSize: 16, marginBottom: 8 }}>
              Usuários de teste (só no modo de desenvolvimento)
            </h2>
            <div className="g-entrar-teste">
              <button type="button" className="g-btn" onClick={() => preencher('admin')}>
                Admin
              </button>
              <button type="button" className="g-btn" onClick={() => preencher('gerente')}>
                Gerente (Loja ZN)
              </button>
              <button type="button" className="g-btn" onClick={() => preencher('atendente')}>
                Atendente (Loja ZN)
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
