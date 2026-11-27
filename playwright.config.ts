import { defineConfig } from '@playwright/test';

/**
 * Testes de fumaça, axe e capturas. Usam o Google Chrome instalado no Mac (channel 'chrome'): nada de baixar navegador.
 * Sobe o `npm run dev` na porta 5199 (o login de teste só existe no modo dev), sem a latência simulada.
 */
const PORTA = 5199;

export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORTA}/sistema-vdj/`,
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    timezoneId: 'America/Fortaleza',
  },
  webServer: {
    command: `npm run dev -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}/sistema-vdj/`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { VITE_LATENCIA_API_MS: '0' },
  },
});
