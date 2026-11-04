# Valor da Joia — protótipo (POC de front-end)

Protótipo clicável para iPad (retrato) do avaliador de ouro da **Valor da Joia**.
Sem back-end: o preço do grama do ouro fica no arquivo `preco-ouro-24k.txt`, que a página lê pela API do GitHub.

- `prototipo-v4.html` — o protótipo principal. Abra por um servidor local (ex.: `python3 -m http.server 8765`) e acesse `http://localhost:8765/prototipo-v4.html`. Rodando local, o preço vem do `preco-ouro-24k.txt` desta pasta.
- `preco-ouro-24k.txt` — o preço do grama do ouro 24k, em reais.
- `loading-opcoes.html`, `dourados.html`, `fluxo-*.html`, `ideias-v2.html` — explorações de design.
- `logo-transparente.png` — logo usado no protótipo.

## Como mudar o preço do ouro

1. No GitHub, abra o arquivo `preco-ouro-24k.txt` no branch `main` e clique no lápis (**Edit this file**).
2. Apague o número que está lá e escreva o preço novo do grama do ouro **24k**, em reais. Escreva só o número, com vírgula ou ponto nos centavos: `650` ou `650,50`. Não ponha "R$", ponto de milhar nem nenhum outro texto no arquivo.
3. Clique em **Commit changes** e confirme, direto no `main`.

Os outros quilates são calculados a partir desse número (o 18k vale 75% dele). Os tablets passam a usar o preço novo em até uns 2 minutos, sem precisar recarregar.

Se o arquivo tiver algo além do número, os tablets bloqueiam a avaliação com o aviso "Preço do ouro inválido" até o arquivo ser corrigido.

O repositório precisa continuar público. Se ficar privado, a página não consegue ler o preço e mostra "Sistema fora do ar".
