/** Configurações (/configuracoes): tema da tela e a loja deste aparelho (que só muda pelo Avaliar, com a senha). */
import { useId } from 'react';
import { Link } from 'react-router';
import { useSessao } from '../contexts/Sessao';
import { lojaAtual, nomeDaLoja, SENHA_DIGITOS } from '../services/lojas';
import type { Tema } from '../services/tema';
import { Cartao, Pagina } from '../componentes/ui';
import '../estilos/telas.css';

const TEMAS: readonly { valor: Tema; rotulo: string }[] = [
  { valor: 'claro', rotulo: 'Claro (padrão)' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

export default function Configuracoes() {
  const { tema, mudarTema } = useSessao();
  const idTema = useId();
  const loja = lojaAtual();

  return (
    <Pagina titulo="Configurações" subtitulo="Valem só para este aparelho.">
      <div className="g-grade g-grade-2">
        <Cartao titulo="Aparência">
          <fieldset className="g-campo t-fieldset">
            <legend>Tema</legend>
            <div className="g-opcoes">
              {TEMAS.map((t) => (
                <label key={t.valor}>
                  <input type="radio" name={idTema} value={t.valor} checked={tema === t.valor} onChange={() => mudarTema(t.valor)} /> {t.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
        </Cartao>

        <Cartao titulo="Loja deste aparelho">
          <div className="t-texto">
            <p>
              Loja: <strong>{loja ? nomeDaLoja(loja) : 'ainda não escolhida'}</strong>
            </p>
            <p className="g-texto2">
              É a loja cujos preços o Avaliar usa. Para trocar, abra o Avaliar, toque 5 vezes seguidas no logo e digite a senha de {SENHA_DIGITOS} dígitos.
              {!loja && ' Na primeira vez, o próprio Avaliar pede a escolha, sem senha.'}
            </p>
            <p>
              <Link className="g-btn" to="/avaliar">
                Abrir o Avaliar
              </Link>
            </p>
          </div>
        </Cartao>
      </div>
    </Pagina>
  );
}
