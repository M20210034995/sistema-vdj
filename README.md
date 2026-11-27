# Valor da Joia: sistema de gestão

Sistema da **Valor da Joia** para as lojas: avaliar joias, registrar a compra de ouro, clientes, operações, lotes e vendas a parceiros, equipe, preços e o Painel. É feito para o **iPad em pé** e funciona no computador e no celular.

**Situação (branch `feature/sistema-gestao`):**
- Ainda não está no ar. O site publicado (**https://m20210034995.github.io/sistema-vdj/**, a partir do `main`) continua sendo o avaliador antigo.
- Ainda não há back: todos os dados das telas são **de exemplo** (pessoas e documentos inventados) e nada é salvo. Os formulários validam e avisam que "ainda não está ligado ao back".
- Os **preços são de verdade**: o sistema lê o `precos-lojas.txt` deste repositório, no mesmo caminho e formato de sempre.

## Antes de publicar
Esta branch **não se mescla no `main`** enquanto o back não existir: no build, ninguém entra (o login de teste só existe no `npm run dev`) e o Avaliar está atrás do login, então os tablets ficariam sem avaliar.

Quando for a hora, no mesmo dia:
1. **Back pronto** e ligado aos serviços de `src/services/` (ver `docs/funcoes-do-back.md`).
2. **GitHub Pages para GitHub Actions, no mesmo momento do merge.** Só o Lukas (único admin do repositório) faz isso, em *Settings → Pages → Source: GitHub Actions*, com o workflow que monta o `dist/`. Se o merge entrar com o Pages ainda publicando a branch, os tablets abrem uma **página em branco** (o `index.html` da raiz pede o código-fonte, que o navegador não roda).
3. **Os 2 arquivos de preço continuam na raiz do `main`:** `precos-lojas.txt` (o que vale hoje) e `precos-ouro.txt` (o dos tablets ainda na versão antiga). Não mover nem renomear.
4. **Testar num iPad de verdade antes**, pela rede (`npm run dev:rede`) e depois no endereço publicado: avaliar nas 3 lojas, o link `?loja=N` e a troca de loja com a senha.

## Como rodar no computador
Precisa do Node 24 (`nvm use`).

```bash
npm install
npm run dev        # http://localhost:5173/sistema-vdj/
npm run dev:rede   # para abrir no iPad pela mesma rede: http://<IP do Mac>:5173/sistema-vdj/
```

**Entrar:** a tela de entrada mostra botões de usuários de teste (Admin, Gerente e Atendente). Eles só existem no `npm run dev`. No build não há login até o back existir.

**Outros comandos:**

```bash
npm run build        # checa os tipos e gera dist/
npm run lint         # oxlint, sem avisos
npm run test:fumaca  # login por perfil, rota proibida, tema, avaliador com o precos-lojas.txt real, senha, nova operação e paridade com o avaliador antigo
npx playwright test escopo  # cada perfil só vê a própria loja (pela tela e pela URL) e o custo do parceiro compra a compra
npm run test:axe     # acessibilidade (WCAG 2.2 AA) em todas as telas, nos dois temas, a 1440, 1024, 768 e 375 px
CAPTURAS_DIR=/pasta/fora/do/repo npm run capturas
```

Os testes usam o Google Chrome instalado no computador (não baixam navegador).

**Arquivos:**
- `src/`: o app (React + TypeScript).
  - `src/services/`: a ligação com os dados: hoje simulada, depois a API.
  - `src/avaliador/`: o avaliador de antes, portado sem mudar o comportamento.
- `docs/funcoes-do-back.md`: o que o back precisa fazer (entidades, rotas, permissões e regras).
- `precos-lojas.txt`: o preço do grama de cada quilate em cada loja, em reais.
- `precos-ouro.txt`: o arquivo da versão antiga, com uma tabela só para todas as lojas. Vai ser apagado quando os 3 tablets estiverem com a versão nova; não precisa mexer nele.
- `logo-transparente.png`: o logo usado no app.
- `design/`: explorações de design (pranchas com as opções avaliadas) e as fontes do logo.

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
