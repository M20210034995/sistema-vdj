# Valor da Joia — protótipo (POC de front-end)

Protótipo clicável para iPad (retrato) do avaliador de ouro da **Valor da Joia**.
Sem back-end: o preço do grama de cada quilate, em cada loja, fica no arquivo `precos-lojas.txt`, que a página lê pela API do GitHub.

Publicado em **https://m20210034995.github.io/sistema-vdj/** (GitHub Pages, a partir do branch `main`).

- `index.html` — o app. Para rodar no computador, abra um servidor local nesta pasta (ex.: `python3 -m http.server 8765`) e acesse `http://localhost:8765/`. Rodando local, os preços vêm do `precos-lojas.txt` desta pasta.
- `precos-lojas.txt` — o preço do grama de cada quilate em cada loja, em reais.
- `precos-ouro.txt` — o arquivo da versão antiga, com uma tabela só para todas as lojas. Vai ser apagado quando os 3 tablets estiverem com a versão nova; não precisa mexer nele.
- `logo-transparente.png` — logo usado no app.
- `design/` — explorações de design (pranchas com as opções avaliadas) e as fontes do logo.

## Como mudar o preço do ouro

1. No GitHub, abra o arquivo `precos-lojas.txt` no branch `main` e clique no lápis (**Edit this file**).
2. O arquivo tem um bloco por loja: o nome da loja numa linha e, embaixo, uma linha por quilate, com o preço do grama em reais:

   ```
   Loja ZN
   24k 550
   22k 450
   18k 300
   16k 150
   14k 120
   10k 70

   Loja CTC
   24k 560
   22k 460
   ...

   Loja Nova Parnamirim
   24k 540
   ...
   ```

   Troque só os números. Pode usar vírgula ou ponto nos centavos (`550,50`). Não ponha "R$" nem ponto de milhar, não mude o nome das lojas e não apague nem repita nenhuma linha: cada loja precisa ter os 6 quilates.
3. Clique em **Commit changes** e confirme, direto no `main`.

Cada loja e cada quilate valem o preço que estiver no arquivo; um não depende do outro. Os tablets passam a usar os preços novos em até uns 2 minutos, sem precisar recarregar.

O valor de uma joia é o peso vezes o preço do grama da loja, sem centavos: os centavos arredondam para cima (R$ 1.498,50 vira R$ 1.499). Com várias joias, o total é a soma do valor de cada uma.

Se o bloco de uma loja estiver errado (faltar um quilate, sobrar alguma linha ou algum preço estiver mal escrito), só os aparelhos dessa loja bloqueiam a avaliação, com o aviso "Preço do ouro inválido", até o arquivo ser corrigido. As outras lojas continuam avaliando.

O repositório precisa continuar público. Se ficar privado, a página não consegue ler os preços e mostra "Sistema fora do ar".

## Em qual loja o aparelho está

- Na primeira vez que o app é aberto num aparelho, ele pergunta em qual loja o aparelho fica. A escolha fica salva no aparelho.
- Para configurar sem a pergunta, abra o link da loja e adicione o app à tela de início a partir dele. O link só vale num aparelho que ainda não tem loja salva.
  - Loja ZN: https://m20210034995.github.io/sistema-vdj/?loja=1
  - Loja CTC: https://m20210034995.github.io/sistema-vdj/?loja=2
  - Loja Nova Parnamirim: https://m20210034995.github.io/sistema-vdj/?loja=3
- Para conferir ou trocar a loja de um aparelho, toque 5 vezes seguidas no logo da tela inicial. Aparece em qual loja ele está; para trocar, digite a senha (com Pedro).
- Se o aparelho perder a loja salva (no iPad, por exemplo, quando o app é apagado da tela de início e adicionado de novo), ele pergunta a loja outra vez.
