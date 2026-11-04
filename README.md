# Valor da Joia — protótipo (POC de front-end)

Protótipo clicável para iPad (retrato) do avaliador de ouro da **Valor da Joia**.
Sem back-end: o preço do grama de cada quilate fica no arquivo `precos-ouro.txt`, que a página lê pela API do GitHub.

Publicado em **https://m20210034995.github.io/sistema-vdj/** (GitHub Pages, a partir do branch `main`).

- `index.html` — o app. Para rodar no computador, abra um servidor local nesta pasta (ex.: `python3 -m http.server 8765`) e acesse `http://localhost:8765/`. Rodando local, os preços vêm do `precos-ouro.txt` desta pasta.
- `precos-ouro.txt` — o preço do grama de cada quilate, em reais.
- `logo-transparente.png` — logo usado no app.
- `design/` — explorações de design (pranchas com as opções avaliadas) e as fontes do logo.

## Como mudar o preço do ouro

1. No GitHub, abra o arquivo `precos-ouro.txt` no branch `main` e clique no lápis (**Edit this file**).
2. O arquivo tem uma linha por quilate, com o preço do grama em reais:

   ```
   24k 550
   22k 450
   18k 300
   16k 150
   14k 120
   10k 70
   ```

   Troque só os números. Pode usar vírgula ou ponto nos centavos (`550,50`). Não ponha "R$" nem ponto de milhar, e não apague nem repita nenhuma linha: os 6 quilates precisam estar no arquivo.
3. Clique em **Commit changes** e confirme, direto no `main`.

Cada quilate vale o preço que estiver no arquivo; um não depende do outro. Os tablets passam a usar os preços novos em até uns 2 minutos, sem precisar recarregar.

Se faltar um quilate, sobrar alguma linha ou algum preço estiver mal escrito, os tablets bloqueiam a avaliação com o aviso "Preço do ouro inválido" até o arquivo ser corrigido.

O repositório precisa continuar público. Se ficar privado, a página não consegue ler os preços e mostra "Sistema fora do ar".
