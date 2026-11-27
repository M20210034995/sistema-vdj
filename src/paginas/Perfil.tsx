/** Meu perfil (/perfil): os dados de quem está logado e o formulário de troca de senha (sem o back, nada é salvo). */
import { useState, type FormEvent, type ReactNode } from 'react';
import { useUsuario } from '../contexts/Sessao';
import { nomeDoPerfil } from '../componentes/Casca';
import { LOJAS, nomeDaLoja } from '../services/lojas';
import { NaoLigadoError, naoLigado, textoDoErro } from '../services/simulacao';
import { Aviso, CampoTexto, Cartao, Pagina, Tag, useMensagem } from '../componentes/ui';
import { dataCurta } from '../utils/formato';
import '../estilos/telas.css';

const MINIMO = 8;

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function Perfil() {
  const usuario = useUsuario();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erros, setErros] = useState<{ atual?: string; nova?: string; confirmar?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const msg = useMensagem();
  const todas = usuario.lojaIds.length === LOJAS.length;

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    const novos = {
      atual: atual ? undefined : 'Informe a senha atual.',
      nova: !nova ? 'Informe a nova senha.' : nova.length < MINIMO ? `A nova senha precisa de ${MINIMO} caracteres ou mais.` : nova === atual ? 'A nova senha precisa ser diferente da atual.' : undefined,
      confirmar: !confirmar ? 'Repita a nova senha.' : confirmar !== nova ? 'As duas senhas não são iguais.' : undefined,
    };
    setErros(novos);
    if (novos.atual || novos.nova || novos.confirmar) {
      msg.mostrar('erro', 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      await naoLigado('Trocar senha');
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina titulo="Meu perfil" subtitulo="Seus dados e a senha de acesso.">
      <div className="g-grade g-grade-2">
        <Cartao titulo="Seus dados" descricao="Para mudar nome, e-mail ou lojas, fale com um admin.">
          <dl className="g-dl">
            <Item rotulo="Nome">{usuario.nome}</Item>
            <Item rotulo="E-mail">{usuario.email}</Item>
            <Item rotulo="Perfil">
              <Tag tom="info">{nomeDoPerfil(usuario.perfil)}</Tag>
            </Item>
            <Item rotulo={usuario.lojaIds.length === 1 ? 'Loja' : 'Lojas'}>{todas ? 'Todas as lojas' : usuario.lojaIds.map(nomeDaLoja).join(', ')}</Item>
            <Item rotulo="Na equipe desde">{dataCurta(usuario.desde)}</Item>
          </dl>
        </Cartao>

        <Cartao titulo="Trocar senha">
          <form className="g-form" onSubmit={enviar} noValidate>
            {msg.mensagem && (
              <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
                {msg.mensagem.texto}
              </Aviso>
            )}
            {/* campo oculto de usuário: o gerenciador de senhas sabe de qual conta é a senha */}
            <input type="text" name="username" autoComplete="username" value={usuario.email} readOnly hidden />
            <CampoTexto rotulo="Senha atual" tipo="password" autoComplete="current-password" obrigatorio valor={atual} aoMudar={setAtual} erro={erros.atual} />
            <CampoTexto rotulo="Nova senha" tipo="password" autoComplete="new-password" obrigatorio ajuda={`${MINIMO} caracteres ou mais.`} valor={nova} aoMudar={setNova} erro={erros.nova} />
            <CampoTexto rotulo="Confirmar a nova senha" tipo="password" autoComplete="new-password" obrigatorio valor={confirmar} aoMudar={setConfirmar} erro={erros.confirmar} />
            <div className="g-linha-acoes">
              <button type="submit" className="g-btn g-btn-primario" disabled={enviando}>
                {enviando ? 'Trocando…' : 'Trocar senha'}
              </button>
            </div>
          </form>
        </Cartao>
      </div>
    </Pagina>
  );
}
