/** Tema claro (o visual do avaliador, padrão) ou escuro. A escolha fica no navegador. */
export type Tema = 'claro' | 'escuro';

const CHAVE = 'vdj-tema';

export function temaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE) === 'escuro' ? 'escuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'escuro' ? '#0A0A0A' : '#F3F1EC');
}

export function salvarTema(tema: Tema): void {
  aplicarTema(tema);
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    /* sem armazenamento: vale até recarregar */
  }
}
