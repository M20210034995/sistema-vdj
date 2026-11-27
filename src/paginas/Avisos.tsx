/** "Sem acesso" (rota de outro perfil) e "Página não encontrada". */
import { Link } from 'react-router';
import { useSessao } from '../contexts/Sessao';
import { inicioDo } from '../services/permissoes';
import { Pagina } from '../componentes/ui';

export function SemAcesso() {
  const { usuario } = useSessao();
  return (
    <Pagina titulo="Sem acesso" subtitulo="O seu perfil não abre esta tela.">
      <p>
        Se precisar dela, fale com um admin. <Link to={usuario ? inicioDo(usuario.perfil) : '/entrar'}>Voltar para o início</Link>
      </p>
    </Pagina>
  );
}

export function NaoEncontrada() {
  const { usuario } = useSessao();
  return (
    <Pagina titulo="Página não encontrada" subtitulo="O endereço não existe ou mudou.">
      <p>
        <Link to={usuario ? inicioDo(usuario.perfil) : '/entrar'}>Voltar para o início</Link>
      </p>
    </Pagina>
  );
}
