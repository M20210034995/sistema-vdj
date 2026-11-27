/**
 * Avaliar: o avaliador de sempre (src/avaliador/avaliador.ts), na tela inteira abaixo do topo. O HTML das 3 telas
 * é o mesmo do index.html antigo; o resultado ganhou "Registrar compra", que leva as joias para a Nova operação.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import logo from '../../logo-transparente.png';
import { montarAvaliador } from '../avaliador/avaliador';
import '../avaliador/avaliador.css';
import { guardarJoiasParaCompra } from '../services/compraPendente';

export default function Avaliar() {
  const raiz = useRef<HTMLDivElement>(null);
  const navegar = useNavigate();

  useEffect(() => {
    document.title = 'Avaliar · Valor da Joia';
    if (!raiz.current) return;
    return montarAvaliador(raiz.current, {
      aoRegistrarCompra: (joias) => {
        guardarJoiasParaCompra(joias);
        navegar('/operacoes/nova');
      },
    });
  }, [navegar]);

  return (
    <div className="av-app" ref={raiz}>
      <h1 className="g-sr">Avaliar joias</h1>
      {/* UMA JOIA */}
      <section className="view on" id="v-single" aria-label="Uma joia">
        <div className="appbar">
          <img className="logo-img" src={logo} alt="Valor da Joia — Compra de ouro" />
          <button className="corner pill" id="to-multi" type="button">
            <span className="g" aria-hidden="true">
              +
            </span>
            Várias joias
          </button>
        </div>
        <div className="body">
          <div id="single-form" />
        </div>
        <div className="footer">
          <button className="btn" id="single-go" type="button" disabled>
            Avaliar joia{' '}
            <span className="g" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </section>

      {/* VÁRIAS JOIAS */}
      <section className="view" id="v-multi" aria-label="Várias joias" hidden>
        <div className="appbar">
          <button className="corner l" id="to-single" type="button">
            <span className="g" aria-hidden="true">
              ←
            </span>
            Uma joia
          </button>
          <img className="logo-img" src={logo} alt="" />
        </div>
        <div className="body">
          <h2 className="h1">Várias joias</h2>
          <div className="list" id="multi-list" />
        </div>
        <div className="footer">
          <div className="progress" id="multi-progress" />
          <button className="btn" id="multi-go" type="button" disabled>
            Avaliar joias
          </button>
        </div>
      </section>

      {/* RESULTADO (carregamento e resultado são a mesma tela) */}
      <section className="view" id="v-result" aria-label="Resultado" hidden>
        <div className="appbar">
          <img className="logo-img" src={logo} alt="" />
        </div>
        <div className="center" id="result-body" />
        <div className="footer">
          <button className="btn ghost" id="restart" type="button">
            Nova avaliação
          </button>
          <button className="btn" id="registrar" type="button">
            Registrar compra{' '}
            <span className="g" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
