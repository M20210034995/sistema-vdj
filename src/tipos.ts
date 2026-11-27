/**
 * Tipos do sistema. São o contrato com o back (docs/funcoes-do-back.md):
 * dinheiro em CENTAVOS (inteiro) e peso em CENTÉSIMOS DE GRAMA (inteiro), como a conta do avaliador.
 */

export type Perfil = 'admin' | 'gerente' | 'atendente';
export type LojaId = '1' | '2' | '3';

export interface Loja {
  id: LojaId;
  /** Igual ao cabeçalho do bloco da loja no precos-lojas.txt. */
  nome: string;
}

export type StatusUsuario = 'ativo' | 'desativado';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  /** Lojas que a pessoa vê. Admin: todas. */
  lojaIds: LojaId[];
  status: StatusUsuario;
  desde: string;
}

export type StatusConvite = 'pendente' | 'usado' | 'expirado';

export interface Convite {
  id: string;
  email: string;
  perfil: Perfil;
  lojaId: LojaId;
  criadoEm: string;
  status: StatusConvite;
}

/** Os 6 quilates do precos-lojas.txt. Acrescentar um exige mudar o código e o arquivo juntos. */
export type Quilate = '24k' | '22k' | '18k' | '16k' | '14k' | '10k';
/** Preço do grama por quilate, em centavos. */
export type TabelaPrecos = Record<Quilate, number>;

export type TipoPessoa = 'PF' | 'PJ';
export type StatusCompliance = 'pendente' | 'aprovado' | 'reprovado';
export type TipoChavePix = 'cpf_cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type TipoDocumento =
  | 'rg_frente'
  | 'rg_verso'
  | 'cnh'
  | 'selfie'
  | 'comprovante_endereco'
  | 'termo_assinado'
  | 'comprovante_pagamento'
  | 'foto_balanca'
  | 'nfe_danfe'
  | 'nfe_xml'
  | 'video'
  | 'outro';

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  nomeArquivo: string;
  tamanhoKb: number;
  enviadoEm: string;
  /** Só na foto da balança: a peça (1, 2, …). */
  peca?: number;
}

export interface EventoCompliance {
  status: StatusCompliance;
  motivo: string;
  autor: string;
  em: string;
}

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  /** Nome (PF) ou razão social (PJ). */
  nome: string;
  /** CPF ou CNPJ, só dígitos. */
  documento: string;
  email: string;
  telefone: string;
  rgCnh: string;
  nomeMae: string;
  nomePai: string;
  pep: boolean;
  comoConheceu: string;
  dataNascimento: string;
  endereco: Endereco;
  pix: { tipoChave: TipoChavePix; chave: string };
  banco: { nome: string; agencia: string; conta: string } | null;
  status: StatusCompliance;
  /** Local onde o cliente foi cadastrado. */
  localId: string;
  cadastradoPor: string;
  criadoEm: string;
  documentos: Documento[];
  historicoCompliance: EventoCompliance[];
}

export type StatusOperacao =
  | 'rascunho'
  | 'avaliacao'
  | 'aprovado'
  | 'termo_assinado'
  | 'pago'
  | 'nf_emitida'
  | 'enviado'
  | 'recebido'
  | 'exportado';

/**
 * Local da compra: as lojas da VJ e os pontos de compra (alguns de parceiros).
 * Só os locais com `lojaId` têm tabela no precos-lojas.txt; nos outros, o preço do grama é digitado.
 */
export interface Local {
  id: string;
  nome: string;
  tipo: 'loja' | 'ponto';
  lojaId: LojaId | null;
}

/** Quem pôs o dinheiro da compra: a VJ, um sócio ou um parceiro (se for parceiro, o custo fica com ele). */
export interface Pagador {
  id: string;
  nome: string;
  tipo: 'vj' | 'socio' | 'parceiro';
}

/** Parceiro que compra o ouro da VJ numa venda. */
export interface Parceiro {
  id: string;
  nome: string;
  /** O parceiro paga o cliente direto e a VJ recebe a diferença (comissão). */
  pagaClienteDireto: boolean;
  /** Imposto sobre o LUCRO, em %, quando o parceiro funciona assim (ex.: 6,99). null = imposto informado na venda. */
  impostoSobreLucroPct: number | null;
}

/** Onde o ouro da compra está: em estoque, num lote de venda, guardado (uso pessoal) ou em negociação com o cliente. */
export type SituacaoCompra = 'estoque' | 'lote' | 'guardada' | 'negociacao';

export interface Peca {
  indice: number;
  /** Anel, Colar, Pulseira, Brinco ou um dos "Outros" do avaliador. */
  tipoPeca: string;
  /** null = teor não informado. */
  quilate: Quilate | null;
  descricao: string;
  /** null = peso não informado. */
  pesoCg: number | null;
  precoGramaCentavos: number | null;
  valorCentavos: number;
}

/** Peso por quilate dentro de uma compra ("10K x g; 18K y g"). */
export interface TeorCompra {
  quilate: Quilate;
  pesoCg: number;
}

export type SituacaoVenda = 'aberta' | 'fechada';

export interface Venda {
  id: string;
  /** v01, v02… */
  codigo: string;
  data: string;
  parceiroId: string;
  freteCentavos: number;
  /** null enquanto a venda está aberta, ou quando o imposto sai do % do parceiro. */
  impostoCentavos: number | null;
  /** null enquanto a venda está aberta ("a informar"). */
  faturamentoCentavos: number | null;
  situacao: SituacaoVenda;
}

/**
 * Lote: o ouro de uma ou mais compras (de qualquer mês e de qualquer local) que saiu numa venda.
 * O lote não tem pagador: quem pagou é de cada compra (Operacao.pagadorId), e o custo do parceiro sai compra a compra.
 */
export interface Lote {
  id: string;
  vendaId: string;
  compraIds: string[];
  pesoEnviadoCg: number;
  derretido: boolean;
  /** Teor apurado depois de derretido, em %. */
  teorApuradoPct: number | null;
}

export interface Pagamento {
  idPix: string;
  pagoEm: string;
  valorCentavos: number;
  contaOrigem: string;
  instituicaoOrigem: string;
  chaveDestino: string;
  instituicaoDestino: string;
}

export interface NotaFiscal {
  numero: string;
  serie: string;
  chave: string;
  autorizadaEm: string;
}

export interface DadosEnvio {
  transportadora: string;
  codigoRastreio: string;
  enviadoEm: string;
}

export interface EventoOperacao {
  acao: string;
  detalhe: string;
  autor: string;
  perfil: Perfil | 'sistema';
  em: string;
}

/** Operação = uma COMPRA de ouro de um cliente (estrutura do sistema de referência + campos do dashboard do Lukas). */
export interface Operacao {
  id: string;
  /** OP-AAAAMMDD-XXXXXX */
  codigo: string;
  clienteId: string;
  localId: string;
  /** Quem comprou; pode ser uma dupla. Ids de Usuario. */
  compradorIds: string[];
  pagadorId: string;
  criadoPor: string;
  status: StatusOperacao;
  situacao: SituacaoCompra;
  pecas: Peca[];
  /** Soma dos pesos informados; null quando nenhuma peça tem peso. */
  pesoCg: number | null;
  totalCentavos: number;
  observacao: string;
  criadoEm: string;
  atualizadoEm: string;
  termoAssinadoEm: string | null;
  pagamento: Pagamento | null;
  nf: NotaFiscal | null;
  envio: DadosEnvio | null;
  documentos: Documento[];
  historico: EventoOperacao[];
}

/** Observação livre sobre os dados de um período (lista "Observações" do Painel). */
export interface Observacao {
  id: string;
  em: string;
  texto: string;
  /** Local de que a observação trata; null = geral (só o admin vê). */
  localId: string | null;
  autor: string;
}

export interface Notificacao {
  id: string;
  texto: string;
  link: string;
  em: string;
  lida: boolean;
}

/** Uma joia como o avaliador guarda: peso em texto com vírgula ("12,40"), material "Ouro 18k". */
export interface JoiaAvaliada {
  tipo: string;
  material: string;
  peso: string;
}
