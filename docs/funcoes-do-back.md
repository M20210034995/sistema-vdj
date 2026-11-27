# Funções do back (para o VDJ · Back)

O que o front do Sistema VDJ espera do back. Hoje tudo é simulado em `src/services/*` com os dados de exemplo de `src/mocks/dados.ts`. Para ligar o back, troque o corpo das funções dos serviços pela chamada à API e mantenha as assinaturas. Os tipos estão em `src/tipos.ts` e são o contrato.

Escrito pelo VDJ · Front em 26/11/2026 (branch `feature/sistema-gestao`) e revisto em 26/11/2026 22:54, depois da revisão de QA. Fontes:
- o estudo de um sistema de referência, usado como modelo de estrutura (fica fora deste repositório);
- o dashboard do Lukas (documento interno da equipe, fora deste repositório);
- as decisões do Pedro de 26/11/2026.

## Convenções
- **Dinheiro:** em **centavos** (inteiro).
- **Peso:** em **centésimos de grama** (inteiro).
- **Datas:** ISO 8601 com fuso.
- **Valor de uma peça:** `ceil(pesoCg × precoGramaCentavos / 10000)` reais, × 100 em centavos. É a regra do avaliador: os centavos sobem para o real seguinte, e a conta é feita em inteiros. Não use ponto flutuante.
- **Total da compra:** a soma das peças já arredondadas.
- **Erros:** em JSON (`{ "erro": "texto para a tela" }`), com 401 (sem sessão), 403 (perfil sem acesso), 404, 409 (estado não permite a ação) e 422 (validação, com o campo).

## Login e perfis
- **Login:** e-mail e senha. A sessão vai em cookie `httpOnly` e `Secure`.
  - "Manter conectado" (tablets) estende a sessão, por exemplo para 30 dias. Na tela, começa desmarcado: é para os tablets da loja, não para o aparelho de outra pessoa.
  - Sem essa opção, a sessão vale até fechar o navegador.
- **Hoje:** `src/services/auth.ts` é falso, com usuários de teste só no `npm run dev`. No build, ninguém entra.
- **Perfis** (decisão do Pedro):

| Perfil | Vê e faz |
|---|---|
| `admin` (Lukas e Pedro) | Tudo, nas 3 lojas e nos pontos de compra. Aprova compras, registra pagamento, emite NF, monta lotes e fecha vendas. |
| `gerente` | Tudo da **própria loja**: painel, clientes, operações, envio, transações, equipe e preços. Convida só atendentes da loja. Não mexe em admins. |
| `atendente` | Avaliar, registrar compra e cadastrar o cliente da compra. Depois do login, cai no Avaliar. |

- **O back confere tudo:** cada rota confere a sessão, o perfil e se o registro é de uma loja que a pessoa vê. O gerente e o atendente nunca recebem dados de outra loja.
  - Detalhe de outra loja (`GET /operacoes/:id`, `GET /clientes/:id`, `?cliente=` da nova compra): 404, a mesma resposta de "não existe", sem nenhum dado.
  - Listas e o Painel: já vêm filtrados pelas lojas da pessoa. O filtro "Loja atual" do admin só estreita, nunca amplia.
  - No front, a mesma regra está nos serviços (`src/services/dados.ts`): toda leitura recebe o usuário e devolve só o que é dele. Não é segurança (o back é que protege), mas a tela já se comporta como vai se comportar com o back.
- **Venda ou lote com compras de várias lojas:** o gerente vê só as compras da loja dele dentro do lote (peso e custo da parte dele); o faturamento, o frete, o imposto, os lucros, o valor de venda do lote, o que entra em caixa e o peso enviado de um lote misturado são da venda inteira, não se dividem por loja e ficam só com o admin (na tela: "só o admin vê"). Venda só com compras da loja dele: ele vê tudo.

### Senha de 4 dígitos da loja do aparelho
- **Para que serve:** a troca da loja do aparelho (5 toques no logo do Avaliar). Continua igual: mesma chave `vdj-loja` no `localStorage` e mesmo hash `SENHA_LOJA`.
- **Não é segurança:** com login de verdade, ela só evita que alguém troque a loja do tablet no balcão.
- **Pendente para o Lukas:** se ela continua quando houver login. Uma opção é a loja do aparelho virar um campo do usuário ou do tablet no back.

## Entidades (rascunho do modelo)

| Entidade | Campos |
|---|---|
| **Loja** | `id` ('1', '2' ou '3'), `nome`: igual ao cabeçalho no `precos-lojas.txt` |
| **Local** | `id`, `nome`, `tipo` (`loja` ou `ponto`), `lojaId` (null nos pontos de compra, que não têm tabela de preço) |
| **Usuario** | `id`, `nome`, `email`, `perfil`, `lojaIds[]`, `status` (`ativo` ou `desativado`), `desde` |
| **Convite** | `id`, `email`, `perfil`, `lojaId`, `criadoEm`, `status` (`pendente`, `usado` ou `expirado`), `token` (só no back) |
| **Pagador** | `id`, `nome`, `tipo` (`vj`, `socio` ou `parceiro`), `parceiroId` (só quando `tipo = parceiro`: aponta para o **Parceiro** que pôs o dinheiro; é o mesmo cadastro do parceiro que compra o ouro na venda) |
| **Parceiro** | `id`, `nome`, `pagaClienteDireto` (bool), `impostoSobreLucroPct` (ex.: 6,99, ou null). Um parceiro pode ser também pagador: um Pagador com `tipo = parceiro` e `parceiroId` dele. |
| **Cliente** | Ver abaixo |
| **Documento** | `id`, `tipo` (lista abaixo), `nomeArquivo`, `tamanhoKb`, `enviadoEm`, `peca?`, dono (cliente ou operação). O arquivo fica em armazenamento privado e sai por link assinado. |
| **EventoCompliance** | `status`, `motivo`, `autor`, `em` |
| **Operacao** (= **compra**) | Ver abaixo |
| **Peca** | `indice`, `tipoPeca`, `quilate` (null = teor não informado), `descricao`, `pesoCg` (null = sem peso), `precoGramaCentavos`, `valorCentavos` |
| **Pagamento** | `idPix`, `pagoEm`, `valorCentavos`, `contaOrigem`, `instituicaoOrigem`, `chaveDestino`, `instituicaoDestino` |
| **NotaFiscal** | `numero`, `serie`, `chave`, `autorizadaEm` (+ DANFE e XML em Documento) |
| **Venda** | `id`, `codigo` (v01, v02…), `data`, `parceiroId`, `freteCentavos`, `impostoCentavos` (null = sai do % do parceiro), `faturamentoCentavos` (null enquanto aberta), `situacao` (`aberta` ou `fechada`) |
| **Lote** | `id`, `vendaId`, `compraIds[]` (pode ter compras de meses anteriores e de várias lojas), `pesoEnviadoCg`, `derretido`, `teorApuradoPct`. Sem pagador próprio: quem pagou é de cada compra (`Operacao.pagadorId`). |
| **Avaliacao** | `id`, `lojaId` (a loja do aparelho, de onde vieram os preços), `usuarioId`, `em`, `joias[]` (`tipo`, `material`, `quilate`, `pesoCg`, `precoGramaCentavos`, `valorCentavos`), `precos` (a tabela usada: preço do grama por quilate e a versão do `precos-lojas.txt`), `totalCentavos`, `operacaoId` (a compra que ela gerou, ou null) |
| **Observacao** | `id`, `em`, `texto`, `localId` (null = geral: só o admin vê), `autor`. É a lista "Observações" do Painel, junto com as observações das compras do período. |
| **Notificacao** | `id`, `texto`, `link`, `em`, `lida` (por usuário). Só vai para quem abre a tela do link (o atendente não recebe aviso de Clientes ou Envio). |
| **TabelaPreco** | `lojaId`, `quilate` (24k, 22k, 18k, 16k, 14k ou 10k), `precoGramaCentavos`, `atualizadoEm`, `atualizadoPor`. Só quando o back substituir o arquivo (ver "Preços"). |

**Cliente:**
- Identificação: `id`, `tipo` (PF ou PJ), `nome` (ou razão social), `documento` (CPF ou CNPJ, só dígitos, único), `email`, `telefone`, `rgCnh`, `nomeMae`, `nomePai`, `pep`, `comoConheceu`, `dataNascimento`.
- Endereço: `endereco { cep, rua, numero, complemento, bairro, cidade, uf }`.
- Pagamento: `pix { tipoChave (cpf_cnpj, email, telefone ou aleatoria), chave }`, `banco { nome, agencia, conta } | null`.
- Conferência: `status` de compliance (`pendente`, `aprovado` ou `reprovado`).
- Origem: `localId`, `cadastradoPor`, `criadoEm`, `documentos[]`, `historicoCompliance[]`.

**Operacao (compra):**
- Identificação: `id`, `codigo` (`OP-AAAAMMDD-XXXXXX`), `clienteId`, `localId`, `compradorIds[]` (1 ou 2), `pagadorId`, `criadoPor`.
- Estado: `status` (ver "Status da compra"), `situacao` (`estoque`, `lote`, `guardada` ou `negociacao`).
- Valores: `pecas[]`, `pesoCg` (soma das peças com peso; null se nenhuma tem), `totalCentavos`, `observacao`.
- Datas: `criadoEm`, `atualizadoEm`, `termoAssinadoEm`.
- Ligados: `pagamento | null`, `nf | null`, `envio | null`, `documentos[]`, `historico[]`. Cada evento do histórico tem ação, detalhe, autor, perfil e data.

**Tipos de documento:** `rg_frente`, `rg_verso`, `cnh`, `selfie`, `comprovante_endereco`, `termo_assinado`, `comprovante_pagamento`, `foto_balanca`, `nfe_danfe`, `nfe_xml`, `video` e `outro`.

## Status da compra (estrutura do sistema de referência, sentido da VJ)
`rascunho` → `avaliacao` → `aprovado` → `termo_assinado` → `pago` → `nf_emitida` → `enviado` → `recebido` → `exportado`

| Status | Rótulo no front | Próxima ação (quem) |
|---|---|---|
| `rascunho` | Rascunho | Enviar para avaliação (quem registrou) |
| `avaliacao` | Em avaliação | Aprovar compra (admin) |
| `aprovado` | Aprovada | Registrar termo assinado (loja) |
| `termo_assinado` | Termo assinado | Registrar pagamento (admin) |
| `pago` | Paga | Emitir NF (admin) |
| `nf_emitida` | NF emitida | Incluir num lote de venda (admin) |
| `enviado` | **Em lote (enviada)** | Confirmar recebimento pelo parceiro (admin) |
| `recebido` | **Recebida pelo parceiro** | Marcar como faturada (admin) |
| `exportado` | **Faturada** | (fim) |

O back valida a ordem: uma ação fora do status devolve 409.

### Nomes e regras que o Lukas precisa confirmar
1. "Em lote (enviada)", "Recebida pelo parceiro" e "Faturada" são os nomes VJ de `enviado`, `recebido` e `exportado`. No sistema de referência, "Exportado" é o fim do ciclo.
2. "Envio" no menu: na VJ são os **lotes enviados numa venda a um parceiro**. O nome do menu pode virar "Vendas e lotes".
3. "Situação do ouro": Em estoque, Em lote de venda, Guardada e Em negociação.
4. "Quem pagou": VJ (caixa), Sócio e Parceiro.
5. "Termo de origem": o documento que o cliente assina. A VJ usa termo? Com que nome?
6. "Compliance": a conferência de documentos do cliente (Pendente, Aprovado ou Reprovado). A VJ faz? Automática ou manual?
7. Limite da marca "Preço por grama baixo": hoje é R$ 100/g, só de exemplo (`LIMITE_PRECO_BAIXO_CENTAVOS` em `src/services/painel.ts`).
8. Os 5 locais: as 3 lojas + 2 pontos de compra. Quais são os pontos e de quem são?
9. **Compras em negociação no Painel:** entram nos totais ou não? Até ele decidir, os totais contam só as compras pagas (com pagamento registrado), com o aviso "a confirmar com o Lukas" na tela; todas as compras do período aparecem em "Todos os registros" (coluna Situação) e o cartão "Em negociação" mostra quantidade e valor. Esta regra é do Front, não do Lukas.
10. **Imposto do parceiro que paga o cliente direto (ex.: 6,99%):** é calculado antes ou depois do frete? Hoje sai do lucro bruto (faturamento − custo do metal), antes do frete.
11. **Quem muda a situação da compra** (guardar, voltar ao estoque, negociação): só o admin ou também o gerente da loja?

## Regras de negócio (do dashboard do Lukas)
- **Compra:** data, local, comprador(es), pagador, peso (pode faltar), valor, teores por quilate, peças e observação.
  - Situação: em estoque, em lote de venda, guardada (uso pessoal) ou em negociação (acerto pendente com o cliente).
  - **Ouro guardado:** conta nas compras, mas não entra no estoque nem nas vendas.
- **Venda:** a um parceiro, com código, data, lotes, frete, imposto, faturamento e situação (aberta ou fechada). Aberta: os resultados aparecem como "a informar".
- **Lote:** compras de origem (de qualquer mês), peso enviado, perda na fundição (peso comprado − peso enviado), derretido, teor apurado e pagador.
- **Resultados:**
  - lucro bruto = faturamento − custo do metal (a soma das compras dos lotes);
  - lucro líquido = lucro bruto − frete − imposto;
  - valor de venda de um lote = faturamento × peso enviado do lote ÷ peso enviado da venda;
  - lucro do lote = valor de venda − custo.
- **Pagador parceiro:** o custo das compras que ele pagou fica com ele. Conta-se **compra a compra** (`Operacao.pagadorId`), porque um lote pode misturar compras pagas pela VJ e pelo parceiro. Entra em caixa = faturamento − soma dessas compras (aparece no Painel, seção Vendas, e no Envio).
- **Parceiro que paga o cliente direto:** a VJ recebe a diferença (comissão). O imposto (ex.: 6,99%) incide sobre o **lucro bruto**, não sobre o faturamento (antes ou depois do frete: item 10 da lista acima).
- **Marcas automáticas no registro:** "Preço por grama baixo" (R$/g abaixo do limite), "teor não informado" (alguma peça sem quilate) e "peso não informado".
- **Semana:** de segunda a domingo, porque a loja do shopping abre aos domingos. A semana corrente aparece "em andamento".
- **Compras em negociação no Painel:** pendência do Lukas (item 9 da lista acima), não regra dele. Até a decisão, os totais contam só as pagas, com o aviso na tela, e nenhuma compra some de "Todos os registros".

## Rotas sugeridas da API
Todas exigem sessão. "Escopo" quer dizer filtrar pelas lojas do usuário (admin: todas, ou a "Loja atual" escolhida no topo); registro de outra loja responde 404.

| Método e rota | Para | Quem |
|---|---|---|
| `POST /sessao` · `DELETE /sessao` · `GET /sessao` | Entrar (com `manterConectado`), sair, usuário atual | todos |
| `GET /painel?de&ate&loja` | Os números do Painel, como `montarPainel` em `src/services/painel.ts` (com a regra de várias lojas) | admin, gerente (escopo) |
| `GET /locais` · `GET /pagadores` · `GET /parceiros` | Listas de apoio | todos (escopo) |
| `GET /clientes?busca&status&pagina&porPagina` | Lista | admin, gerente |
| `GET /clientes/por-documento/:doc` | Busca exata (passo 1 da compra). Devolve só o mínimo: id, nome, documento mascarado e status | todos (escopo) |
| `GET /clientes/:id` · `PATCH /clientes/:id` | Detalhe e edição | admin, gerente |
| `POST /clientes` | Cadastrar (com a validação do CPF/CNPJ) | todos |
| `POST /clientes/:id/documentos` | Enviar documento (multipart) | todos |
| `GET /operacoes?de&ate&busca&status&pagina&porPagina` | Lista | admin, gerente |
| `GET /operacoes.csv?…` | Exportar (hoje o CSV é gerado no navegador) | admin, gerente |
| `POST /operacoes` | Registrar compra (peças, local, compradores, pagador, observação; fotos da balança) | todos |
| `GET /operacoes/:id` | Detalhe | admin, gerente |
| `POST /operacoes/:id/acoes/:acao` | Avançar etapa (`enviar-avaliacao`, `aprovar`, `termo`, `pagamento`, `nf`, `recebido`, `faturada`) | ver tabela de status |
| `PATCH /operacoes/:id/situacao` | Mudar a situação do ouro: `{ "situacao": "guardada" }` (guardar para uso pessoal), `"estoque"` (voltar ao estoque) ou `"negociacao"`. Recusa (409) compra já em lote | admin (gerente: item 11 da lista) |
| `GET /operacoes/:id/pdf` | PDF da compra | admin, gerente |
| `GET /transacoes?de&ate&busca` | Pagamentos aos clientes | admin, gerente |
| `GET /vendas` | Vendas com o resultado | admin; gerente lê só as vendas com compras da loja dele, com a regra de várias lojas (só a parte dele; o resultado fica com o admin) |
| `POST /vendas` · `PATCH /vendas/:id` | Criar com lotes, informar faturamento e imposto, fechar | admin |
| `POST /vendas/:id/lotes` | Lote: compras de origem e peso enviado (até o peso comprado das compras: 422 se passar) | admin |
| `PATCH /lotes/:id` | Depois da fundição: `{ "derretido": true, "teorApuradoPct": 71.5 }` (teor apurado) | admin |
| `POST /avaliacoes` · `GET /avaliacoes?de&ate&loja` | Guardar cada avaliação do Avaliar (e ligar `operacaoId` quando vira compra); listar | todos gravam; admin e gerente leem (escopo) |
| `GET /observacoes?de&ate&loja` · `POST /observacoes` | Observações do período | admin, gerente (escopo; as gerais, só o admin) |
| `GET /equipe` · `PATCH /usuarios/:id` | Usuários (perfil, desativar ou reativar) | admin, gerente (só atendentes da loja) |
| `POST /convites` · `GET /convites` | Convites | admin, gerente |
| `GET /notificacoes` · `POST /notificacoes/:id/lida` | Notificações | todos |
| `GET /precos` · `PUT /precos/:lojaId` | Preço do grama por loja (quando substituir o arquivo) | todos leem; admin edita |

## Preços (precos-lojas.txt): não quebrar o fluxo do Lukas
- **Hoje:**
  - o Lukas edita `precos-lojas.txt` na raiz do `main`, pelo site do GitHub;
  - o front lê pela API do GitHub (`contents/precos-lojas.txt?ref=main`, só com o cabeçalho `Accept: application/vnd.github.raw+json`), com 60 s de reaproveitamento;
  - o código está em `src/services/precos.ts`, portado sem mudança do avaliador antigo e com teste de paridade em `tests/paridade.spec.ts`.
- **Quando o back assumir:**
  - `GET /precos` devolve o mesmo formato por loja (os 6 quilates);
  - a tela de Preços ganha a edição (só admin);
  - troca-se só o corpo de `lerPrecos`/`lerTodasAsLojas`;
  - até lá, o arquivo continua no mesmo caminho e formato.
- **O preço do dia fica guardado na compra:** cada peça guarda o preço do grama usado. Mudar a tabela não muda compras antigas.

## LGPD (dados pessoais dos clientes)
- **Tempo de guarda:** dados e documentos do cliente (CPF, RG/CNH, endereço, PIX, selfie, termo, comprovantes, fotos da balança, NF) ficam guardados pelo prazo que o Lukas e o contador definirem. Referência comum: 5 anos depois da última compra, pelas regras fiscais e de prevenção à lavagem de dinheiro. Passado o prazo, apagar ou anonimizar. Também a confirmar: a base legal de cada dado.
- **Registro de acesso:** o back registra quem viu o CPF ou documento completo (detalhe do cliente ou da compra, link de arquivo) e quem exportou CSV (quem, quando, filtro e quantas linhas). Só o admin lê o registro, e ninguém apaga.
- **Mascarado nas listas:** nas listas (Clientes, Operações, Transações e a busca por documento), CPF/CNPJ e chave PIX já vêm parciais do back (ex.: `***.000.101-**`, `an***@exemplo.com`). Completo só no detalhe, e a abertura do detalhe entra no registro. O front já mostra parcial nas listas (`documentoParcial` e `chavePixParcial` em `src/utils/formato.ts`).
- **Arquivos:** armazenamento privado, link assinado e de vida curta, nunca público.
- **Pedidos do titular** (acesso, correção, exclusão): o admin atende; o que a lei manda guardar fica até o fim do prazo.

## O que fica para depois (sem back não existe)
- Login de verdade, recuperação de senha e convites por e-mail.
- Upload e armazenamento de documentos, fotos da balança e vídeo.
- Consulta de CPF/CNPJ e conferência automática.
- PIX real, NF-e/SEFAZ, termo assinado por e-mail, rastreio de transporte e PDF.
- Notificações reais.
- Auditoria (quem fez o quê) e backups.
- Cotação automática da bolsa: hoje vale o preço que o Lukas põe no arquivo.
