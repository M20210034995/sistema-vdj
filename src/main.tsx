import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import './estilos/app.css';
import App from './App.tsx';
import { configurarLojaNaAbertura } from './services/lojas';
import { aplicarTema, temaSalvo } from './services/tema';

aplicarTema(temaSalvo());
// Loja do aparelho: a salva vale; sem ela, a do link (?loja=N) é salva já na abertura, como no avaliador antigo.
configurarLojaNaAbertura();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
