import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Endereço do projeto no GitHub Pages (https://m20210034995.github.io/sistema-vdj/). */
const BASE = '/sistema-vdj/'
const PRECOS = fileURLToPath(new URL('./precos-lojas.txt', import.meta.url))

/**
 * O app lê o precos-lojas.txt como o avaliador antigo: no github.io, pela API do GitHub; fora dele, o arquivo ao lado da página.
 * No `npm run dev`, o Vite já serve a raiz do repositório. No `npm run preview`, este middleware serve o arquivo da raiz,
 * lido na hora. O build NÃO leva uma cópia: uma cópia no dist ficaria velha assim que o Lukas mudasse um preço.
 */
function precosNoPreview(): Plugin {
  return {
    name: 'vdj-precos-no-preview',
    configurePreviewServer(server) {
      server.middlewares.use(`${BASE}precos-lojas.txt`, (_req, res) => {
        readFile(PRECOS, 'utf8')
          .then((texto) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(texto)
          })
          .catch(() => {
            res.statusCode = 404
            res.end()
          })
      })
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [react(), precosNoPreview()],
  build: { sourcemap: false },
})
