/**
 * DADOS DE EXEMPLO. Tudo aqui é inventado: pessoas com "Exemplo" no nome, CPF começando com 000.000, e-mails
 * @exemplo.com, telefones (84) 90000-…, endereços "Rua Exemplo". Nada veio do sistema de referência nem do dashboard do Lukas.
 * O gerador é determinístico (mesma semente) e as datas são relativas a hoje, para os filtros de período terem dados.
 * Quando o back existir, este arquivo sai e os serviços (src/services/*) passam a chamar a API.
 */
import type {
  Cliente,
  Convite,
  Documento,
  Local,
  Lote,
  Notificacao,
  Observacao,
  Operacao,
  Pagador,
  Parceiro,
  Peca,
  Quilate,
  SituacaoCompra,
  StatusOperacao,
  Usuario,
  Venda,
} from '../tipos';
import { completarCnpj, completarCpf, valorPecaCentavos } from '../utils/formato';

/** Gerador pseudoaleatório com semente (mulberry32): os dados são os mesmos a cada carga. */
function gerador(semente: number): () => number {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const aleatorio = gerador(20261126);
const entre = (min: number, max: number): number => min + Math.floor(aleatorio() * (max - min + 1));
const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];

const HOJE = new Date();
HOJE.setHours(12, 0, 0, 0);
/** Data ISO `dias` atrás, num horário de loja (9h–18h). */
function diasAtras(dias: number): string {
  const d = new Date(HOJE);
  d.setDate(d.getDate() - dias);
  d.setHours(entre(9, 18), entre(0, 59), 0, 0);
  return d.toISOString();
}
const somarMinutos = (iso: string, min: number): string => new Date(new Date(iso).getTime() + min * 60000).toISOString();

export const LOCAIS: readonly Local[] = [
  { id: 'local-zn', nome: 'Loja ZN', tipo: 'loja', lojaId: '1' },
  { id: 'local-ctc', nome: 'Loja CTC', tipo: 'loja', lojaId: '2' },
  { id: 'local-np', nome: 'Loja Nova Parnamirim', tipo: 'loja', lojaId: '3' },
  { id: 'local-ponto-a', nome: 'Ponto Exemplo Shopping', tipo: 'ponto', lojaId: null },
  { id: 'local-ponto-b', nome: 'Ponto Parceiro Exemplo', tipo: 'ponto', lojaId: null },
];

export const PAGADORES: readonly Pagador[] = [
  { id: 'pag-vj', nome: 'VJ (caixa)', tipo: 'vj' },
  { id: 'pag-socio', nome: 'Sócio Exemplo', tipo: 'socio' },
  { id: 'pag-parceiro', nome: 'Parceiro Exemplo A', tipo: 'parceiro' },
];

export const PARCEIROS: readonly Parceiro[] = [
  { id: 'parc-a', nome: 'Parceiro Exemplo A', pagaClienteDireto: false, impostoSobreLucroPct: null },
  { id: 'parc-b', nome: 'Parceiro Exemplo B', pagaClienteDireto: true, impostoSobreLucroPct: 6.99 },
];

/** Equipe de exemplo. As credenciais de teste ficam em src/services/auth.ts, só no `npm run dev`. */
export const USUARIOS: readonly Usuario[] = [
  { id: 'u-admin1', nome: 'Admin Exemplo Um', email: 'admin@exemplo.com', perfil: 'admin', lojaIds: ['1', '2', '3'], status: 'ativo', desde: diasAtras(400) },
  { id: 'u-admin2', nome: 'Admin Exemplo Dois', email: 'admin2@exemplo.com', perfil: 'admin', lojaIds: ['1', '2', '3'], status: 'ativo', desde: diasAtras(380) },
  { id: 'u-ger1', nome: 'Gerente Exemplo ZN', email: 'gerente.zn@exemplo.com', perfil: 'gerente', lojaIds: ['1'], status: 'ativo', desde: diasAtras(300) },
  { id: 'u-ger2', nome: 'Gerente Exemplo CTC', email: 'gerente.ctc@exemplo.com', perfil: 'gerente', lojaIds: ['2'], status: 'ativo', desde: diasAtras(280) },
  { id: 'u-ger3', nome: 'Gerente Exemplo NP', email: 'gerente.np@exemplo.com', perfil: 'gerente', lojaIds: ['3'], status: 'ativo', desde: diasAtras(200) },
  { id: 'u-at1', nome: 'Atendente Exemplo ZN', email: 'atendente.zn@exemplo.com', perfil: 'atendente', lojaIds: ['1'], status: 'ativo', desde: diasAtras(150) },
  { id: 'u-at2', nome: 'Atendente Exemplo CTC', email: 'atendente.ctc@exemplo.com', perfil: 'atendente', lojaIds: ['2'], status: 'ativo', desde: diasAtras(140) },
  { id: 'u-at3', nome: 'Atendente Exemplo NP', email: 'atendente.np@exemplo.com', perfil: 'atendente', lojaIds: ['3'], status: 'ativo', desde: diasAtras(90) },
  { id: 'u-at4', nome: 'Atendente Exemplo Antigo', email: 'atendente.antigo@exemplo.com', perfil: 'atendente', lojaIds: ['1'], status: 'desativado', desde: diasAtras(500) },
];

export const CONVITES: readonly Convite[] = [
  { id: 'conv-1', email: 'novo.atendente@exemplo.com', perfil: 'atendente', lojaId: '2', criadoEm: diasAtras(2), status: 'pendente' },
  { id: 'conv-2', email: 'atendente.np@exemplo.com', perfil: 'atendente', lojaId: '3', criadoEm: diasAtras(92), status: 'usado' },
  { id: 'conv-3', email: 'gerente.antigo@exemplo.com', perfil: 'gerente', lojaId: '1', criadoEm: diasAtras(40), status: 'expirado' },
];

const PRIMEIROS = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Iara', 'João', 'Kátia', 'Lucas', 'Marta', 'Nilo', 'Olga', 'Paulo', 'Rita', 'Sérgio', 'Tânia', 'Vera', 'Wagner', 'Yara'];
const SOBRENOMES = ['Exemplo', 'Fictício', 'de Teste', 'Exemplo da Silva', 'Fictícia Souza', 'Teste Lima'];
const COMO_CONHECEU = ['Instagram', 'Indicação', 'Passou na frente da loja', 'Google', ''];

function documentosDoCliente(criadoEm: string, cnh: boolean): Documento[] {
  const docs: Documento[] = cnh
    ? [{ id: 'd1', tipo: 'cnh', nomeArquivo: 'cnh-exemplo.pdf', tamanhoKb: 184, enviadoEm: criadoEm }]
    : [
        { id: 'd1', tipo: 'rg_frente', nomeArquivo: 'rg-frente-exemplo.jpg', tamanhoKb: 212, enviadoEm: criadoEm },
        { id: 'd2', tipo: 'rg_verso', nomeArquivo: 'rg-verso-exemplo.jpg', tamanhoKb: 198, enviadoEm: criadoEm },
      ];
  return docs;
}

function criarClientes(): Cliente[] {
  const lista: Cliente[] = [];
  for (let i = 0; i < 26; i++) {
    const pj = i % 9 === 8;
    const nome = pj ? `Comércio Exemplo ${i} Ltda` : `${PRIMEIROS[i % PRIMEIROS.length]} ${SOBRENOMES[i % SOBRENOMES.length]}`;
    const documento = pj ? completarCnpj(`00000000${String(1000 + i).slice(-4)}`) : completarCpf(`000000${String(100 + i).padStart(3, '0')}`);
    const criadoEm = diasAtras(entre(5, 220));
    const local = LOCAIS[i % LOCAIS.length];
    const status = i === 3 || i === 17 ? 'pendente' : i === 11 ? 'reprovado' : 'aprovado';
    const email = `${nome.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}.${i}@exemplo.com`;
    lista.push({
      id: `cli-${i + 1}`,
      tipo: pj ? 'PJ' : 'PF',
      nome,
      documento,
      email,
      telefone: `849000000${String(10 + i).slice(-2)}`,
      rgCnh: pj ? '' : `000${String(1000 + i)}`,
      nomeMae: pj ? '' : `Mãe Exemplo ${i + 1}`,
      nomePai: pj || i % 3 === 0 ? '' : `Pai Exemplo ${i + 1}`,
      pep: i === 7,
      comoConheceu: COMO_CONHECEU[i % COMO_CONHECEU.length],
      dataNascimento: pj ? '' : `${String(1 + (i % 27)).padStart(2, '0')}/${String(1 + (i % 12)).padStart(2, '0')}/${1960 + (i % 40)}`,
      endereco: { cep: `59000${String(100 + i).slice(-3)}`, rua: 'Rua Exemplo', numero: String(10 + i * 3), complemento: i % 4 === 0 ? 'Casa' : '', bairro: 'Bairro Exemplo', cidade: 'Natal', uf: 'RN' },
      pix: { tipoChave: i % 3 === 0 ? 'email' : 'cpf_cnpj', chave: i % 3 === 0 ? email : documento },
      banco: i % 4 === 0 ? { nome: 'Banco Exemplo S.A.', agencia: '0001', conta: `${10000 + i}-${i % 10}` } : null,
      status,
      localId: local.id,
      cadastradoPor: USUARIOS[2 + (i % 6)].nome,
      criadoEm,
      documentos: documentosDoCliente(criadoEm, i % 2 === 0),
      historicoCompliance:
        status === 'pendente'
          ? []
          : [
              {
                status,
                motivo: status === 'aprovado' ? 'Aprovado na conferência de documentos (exemplo).' : 'Documento ilegível; pedir outro (exemplo).',
                autor: status === 'aprovado' ? 'Sistema (automático)' : 'Admin Exemplo Um',
                em: somarMinutos(criadoEm, 30),
              },
            ],
    });
  }
  return lista;
}
export const CLIENTES: readonly Cliente[] = criarClientes();

/** Preço do grama de exemplo, em centavos (NÃO é o precos-lojas.txt: os dados antigos guardam o preço do dia da compra). */
const PRECO_EXEMPLO: Record<Quilate, number> = { '24k': 52000, '22k': 46000, '18k': 35000, '16k': 14000, '14k': 11000, '10k': 7000 };
const TIPOS_PECA = ['Anel', 'Colar', 'Pulseira', 'Brinco', 'Aliança', 'Corrente', 'Pingente'];
const QUILATES_SORTEIO: readonly Quilate[] = ['18k', '18k', '18k', '18k', '14k', '10k', '22k', '24k', '16k'];

function pecasDeExemplo(baixoTeor: boolean): Peca[] {
  const n = entre(1, 3);
  const pecas: Peca[] = [];
  for (let i = 0; i < n; i++) {
    const quilate: Quilate | null = aleatorio() < 0.06 ? null : baixoTeor ? escolher<Quilate>(['10k', '14k']) : escolher(QUILATES_SORTEIO);
    const semPeso = aleatorio() < 0.07;
    const pesoCg = semPeso ? null : entre(60, 1800);
    const base = PRECO_EXEMPLO[quilate ?? '10k'];
    const preco = pesoCg === null ? null : Math.round((base * (0.92 + aleatorio() * 0.1)) / 100) * 100;
    const valor = pesoCg !== null && preco !== null ? valorPecaCentavos(pesoCg, preco) : entre(150, 900) * 100;
    const tipo = escolher(TIPOS_PECA);
    pecas.push({ indice: i + 1, tipoPeca: tipo, quilate, descricao: `${tipo} de exemplo`, pesoCg, precoGramaCentavos: preco, valorCentavos: valor });
  }
  return pecas;
}

const ORDEM_STATUS: readonly StatusOperacao[] = ['rascunho', 'avaliacao', 'aprovado', 'termo_assinado', 'pago', 'nf_emitida', 'enviado', 'recebido', 'exportado'];

function statusPelaIdade(dias: number): StatusOperacao {
  if (dias > 45) return escolher<StatusOperacao>(['exportado', 'exportado', 'recebido']);
  if (dias > 25) return escolher<StatusOperacao>(['enviado', 'recebido', 'nf_emitida', 'pago']);
  if (dias > 6) return escolher<StatusOperacao>(['pago', 'pago', 'nf_emitida', 'enviado', 'termo_assinado']);
  return escolher<StatusOperacao>(['rascunho', 'avaliacao', 'aprovado', 'termo_assinado', 'pago', 'pago']);
}

const codigoOperacao = (iso: string, i: number): string => `OP-${iso.slice(0, 10).replace(/-/g, '')}-EX${String(1000 + i * 37).slice(-4)}`;

function criarOperacoes(): Operacao[] {
  const lista: Operacao[] = [];
  const atendentesDaLoja = (lojaId: string | null): Usuario[] =>
    USUARIOS.filter((u) => u.perfil !== 'admin' && u.status === 'ativo' && (lojaId === null || u.lojaIds.includes(lojaId as '1')));
  for (let i = 0; i < 72; i++) {
    const dias = entre(0, 80);
    const criadoEm = diasAtras(dias);
    const local = escolher([LOCAIS[0], LOCAIS[0], LOCAIS[1], LOCAIS[1], LOCAIS[2], LOCAIS[3], LOCAIS[4]]);
    const equipe = atendentesDaLoja(local.lojaId);
    const comprador = escolher(equipe);
    const dupla = aleatorio() < 0.2 ? escolher(equipe.filter((u) => u.id !== comprador.id)) : null;
    const status = statusPelaIdade(dias);
    const guardada = status === 'pago' && aleatorio() < 0.25;
    const pecas = pecasDeExemplo(guardada);
    const comPeso = pecas.filter((p) => p.pesoCg !== null);
    const pesoCg = comPeso.length ? comPeso.reduce((s, p) => s + (p.pesoCg ?? 0), 0) : null;
    const total = pecas.reduce((s, p) => s + p.valorCentavos, 0);
    const nivel = ORDEM_STATUS.indexOf(status);
    let situacao: SituacaoCompra = 'estoque';
    if (nivel < 4) situacao = 'negociacao';
    else if (nivel >= 6) situacao = 'lote';
    else if (guardada) situacao = 'guardada';
    const cliente = CLIENTES[(i * 7) % CLIENTES.length];
    const pagador = aleatorio() < 0.8 ? PAGADORES[0] : aleatorio() < 0.6 ? PAGADORES[1] : PAGADORES[2];
    const pagoEm = somarMinutos(criadoEm, 90);
    const historico: Operacao['historico'] = [{ acao: 'Compra registrada', detalhe: `${pecas.length} peça(s)`, autor: comprador.nome, perfil: comprador.perfil, em: criadoEm }];
    if (nivel >= 1) historico.push({ acao: 'Enviada para avaliação', detalhe: '', autor: comprador.nome, perfil: comprador.perfil, em: somarMinutos(criadoEm, 10) });
    if (nivel >= 2) historico.push({ acao: 'Aprovada', detalhe: 'Termo enviado ao cliente', autor: 'Admin Exemplo Um', perfil: 'admin', em: somarMinutos(criadoEm, 30) });
    if (nivel >= 3) historico.push({ acao: 'Termo assinado', detalhe: 'Termo de origem assinado na loja', autor: comprador.nome, perfil: comprador.perfil, em: somarMinutos(criadoEm, 60) });
    if (nivel >= 4) historico.push({ acao: 'Pagamento registrado', detalhe: 'PIX ao cliente', autor: 'Admin Exemplo Um', perfil: 'admin', em: pagoEm });
    if (nivel >= 5) historico.push({ acao: 'NF emitida', detalhe: 'Nota fiscal de entrada (exemplo)', autor: 'Sistema', perfil: 'sistema', em: somarMinutos(criadoEm, 24 * 60) });
    if (nivel >= 6) historico.push({ acao: 'Saiu num lote', detalhe: 'Enviada ao parceiro numa venda', autor: 'Admin Exemplo Um', perfil: 'admin', em: somarMinutos(criadoEm, 3 * 24 * 60) });
    const observacao =
      situacao === 'negociacao' && aleatorio() < 0.4
        ? 'Acerto pendente com o cliente (exemplo).'
        : pagador.tipo === 'parceiro'
          ? 'Compra paga pelo parceiro (exemplo).'
          : guardada
            ? 'Ouro baixo guardado para uso pessoal (exemplo).'
            : '';
    lista.push({
      id: `op-${i + 1}`,
      codigo: codigoOperacao(criadoEm, i),
      clienteId: cliente.id,
      localId: local.id,
      compradorIds: dupla ? [comprador.id, dupla.id] : [comprador.id],
      pagadorId: pagador.id,
      criadoPor: comprador.nome,
      status,
      situacao,
      pecas,
      pesoCg,
      totalCentavos: total,
      observacao,
      criadoEm,
      atualizadoEm: historico[historico.length - 1].em,
      termoAssinadoEm: nivel >= 3 ? somarMinutos(criadoEm, 60) : null,
      pagamento:
        nivel >= 4
          ? {
              idPix: `E000000000EXEMPLO${String(i).padStart(4, '0')}`,
              pagoEm,
              valorCentavos: total,
              contaOrigem: '0001 / 00000-0',
              instituicaoOrigem: 'Banco Exemplo S.A.',
              chaveDestino: cliente.pix.chave,
              instituicaoDestino: 'Banco Exemplo S.A.',
            }
          : null,
      nf: nivel >= 5 ? { numero: String(100 + i), serie: '1', chave: `0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 ${String(1000 + i)}`, autorizadaEm: somarMinutos(criadoEm, 24 * 60) } : null,
      envio: nivel >= 6 ? { transportadora: 'Transportadora Exemplo', codigoRastreio: `EX${String(100000 + i)}BR`, enviadoEm: somarMinutos(criadoEm, 3 * 24 * 60) } : null,
      documentos: [
        ...pecas.map((p): Documento => ({ id: `f${p.indice}`, tipo: 'foto_balanca', nomeArquivo: `balanca-peca-${p.indice}-exemplo.jpg`, tamanhoKb: 240, enviadoEm: criadoEm, peca: p.indice })),
        ...(nivel >= 3 ? [{ id: 't', tipo: 'termo_assinado' as const, nomeArquivo: 'termo-exemplo.pdf', tamanhoKb: 96, enviadoEm: somarMinutos(criadoEm, 60) }] : []),
        ...(nivel >= 4 ? [{ id: 'c', tipo: 'comprovante_pagamento' as const, nomeArquivo: 'comprovante-pix-exemplo.pdf', tamanhoKb: 64, enviadoEm: pagoEm }] : []),
      ],
      historico,
    });
  }
  return lista.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}
export const OPERACOES: readonly Operacao[] = criarOperacoes();

/** Vendas e lotes: as compras "em lote" agrupadas por janelas de tempo, a mais nova ainda aberta. */
function criarVendasELotes(): { vendas: Venda[]; lotes: Lote[] } {
  const emLote = OPERACOES.filter((o) => o.situacao === 'lote').sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const vendas: Venda[] = [];
  const lotes: Lote[] = [];
  const porVenda = 5;
  for (let v = 0; v * porVenda < emLote.length; v++) {
    const compras = emLote.slice(v * porVenda, v * porVenda + porVenda);
    const ultima = compras[compras.length - 1];
    const data = somarMinutos(ultima.criadoEm, 4 * 24 * 60);
    const parceiro = PARCEIROS[v % 2];
    const metades = compras.length > 2 ? [compras.slice(0, 2), compras.slice(2)] : [compras];
    let custo = 0;
    metades.forEach((grupo, k) => {
      const comprado = grupo.reduce((s, o) => s + (o.pesoCg ?? 0), 0);
      custo += grupo.reduce((s, o) => s + o.totalCentavos, 0);
      const derretido = (v + k) % 3 === 0;
      lotes.push({
        id: `lote-${v + 1}-${k + 1}`,
        vendaId: `venda-${v + 1}`,
        compraIds: grupo.map((o) => o.id),
        pesoEnviadoCg: Math.round(comprado * (0.975 + aleatorio() * 0.02)),
        derretido,
        teorApuradoPct: derretido ? Math.round((68 + aleatorio() * 6) * 10) / 10 : null,
      });
    });
    const ultimaVenda = (v + 1) * porVenda >= emLote.length;
    const faturamento = ultimaVenda ? null : Math.round((custo * (1.08 + aleatorio() * 0.08)) / 100) * 100;
    const lucro = faturamento === null ? 0 : faturamento - custo;
    vendas.push({
      id: `venda-${v + 1}`,
      codigo: `v${String(v + 1).padStart(2, '0')}`,
      data,
      parceiroId: parceiro.id,
      freteCentavos: entre(150, 400) * 100,
      impostoCentavos: faturamento === null || parceiro.impostoSobreLucroPct !== null ? null : Math.round(lucro * 0.06),
      faturamentoCentavos: faturamento,
      situacao: ultimaVenda ? 'aberta' : 'fechada',
    });
  }
  return { vendas, lotes };
}
const VL = criarVendasELotes();
export const VENDAS: readonly Venda[] = VL.vendas;
export const LOTES: readonly Lote[] = VL.lotes;

/** Observações livres do período (as compras com observação também entram na lista do Painel). Sem local: geral, só o admin vê. */
export const OBSERVACOES: readonly Observacao[] = [
  { id: 'obs-1', em: diasAtras(3), texto: 'Uma compra do Ponto Exemplo Shopping foi registrada sem peso; a balança estava em manutenção (exemplo).', localId: 'local-ponto-a', autor: 'Admin Exemplo Um' },
  { id: 'obs-2', em: diasAtras(12), texto: 'Lote da venda mais recente ainda sem teor apurado; o parceiro informa depois da fundição (exemplo).', localId: null, autor: 'Admin Exemplo Um' },
  { id: 'obs-3', em: diasAtras(5), texto: 'Balança da loja conferida com o peso padrão (exemplo).', localId: 'local-zn', autor: 'Gerente Exemplo ZN' },
];

export const NOTIFICACOES: readonly Notificacao[] = [
  { id: 'n1', texto: 'Cliente de exemplo aguardando conferência de documentos.', link: '/clientes', em: diasAtras(0), lida: false },
  { id: 'n2', texto: 'Compra de exemplo enviada para avaliação.', link: '/operacoes', em: diasAtras(1), lida: false },
  { id: 'n3', texto: 'Venda de exemplo ainda sem faturamento informado.', link: '/envio', em: diasAtras(4), lida: true },
  { id: 'n4', texto: 'Preços de exemplo do dia conferidos: avalie com a tabela nova.', link: '/avaliar', em: diasAtras(0), lida: false },
];
