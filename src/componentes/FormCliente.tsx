/**
 * Campos do cliente, iguais no cadastro (/clientes/novo) e na edição (/clientes/:id): máscaras, validação e os
 * cartões Dados básicos, Endereço, PIX e Dados bancários.
 */
import { useId } from 'react';
import type { Cliente, TipoChavePix, TipoDocumento, TipoPessoa } from '../tipos';
import { cnpjValido, cpfValido, dataValida, emailValido, mascaraCep, mascaraCnpj, mascaraCpf, mascaraData, mascaraDocumento, mascaraTelefone, soDigitos } from '../utils/formato';
import { CampoSelect, CampoTexto, Cartao } from './ui';

/** As 27 unidades da federação. */
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const;

export const TIPOS_CHAVE: readonly TipoChavePix[] = ['cpf_cnpj', 'email', 'telefone', 'aleatoria'];
export const ROTULO_CHAVE: Record<TipoChavePix, string> = { cpf_cnpj: 'CPF/CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };

export const ROTULO_DOCUMENTO: Record<TipoDocumento, string> = {
  rg_frente: 'RG (frente)',
  rg_verso: 'RG (verso)',
  cnh: 'CNH',
  selfie: 'Selfie com documento',
  comprovante_endereco: 'Comprovante de endereço',
  termo_assinado: 'Termo assinado',
  comprovante_pagamento: 'Comprovante de pagamento',
  foto_balanca: 'Foto da balança',
  nfe_danfe: 'NF-e (DANFE)',
  nfe_xml: 'NF-e (XML)',
  video: 'Vídeo',
  outro: 'Outro',
};

export interface DadosCliente {
  tipo: TipoPessoa;
  documento: string;
  nome: string;
  email: string;
  telefone: string;
  rgCnh: string;
  nomeMae: string;
  nomePai: string;
  pep: boolean;
  comoConheceu: string;
  dataNascimento: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipoChave: TipoChavePix | '';
  chave: string;
  banco: string;
  agencia: string;
  conta: string;
}
export type CampoCliente = keyof DadosCliente;
export type ErrosCliente = Partial<Record<CampoCliente, string>>;
export type MudarCliente = <K extends CampoCliente>(campo: K, valor: DadosCliente[K]) => void;

/** Campos de texto livre (o valor é string). */
type CampoLivre = Exclude<CampoCliente, 'tipo' | 'pep' | 'tipoChave'>;

export const clienteVazio = (tipo: TipoPessoa = 'PF', documento = ''): DadosCliente => ({
  tipo,
  documento: tipo === 'PF' ? mascaraCpf(documento) : mascaraCnpj(documento),
  nome: '',
  email: '',
  telefone: '',
  rgCnh: '',
  nomeMae: '',
  nomePai: '',
  pep: false,
  comoConheceu: '',
  dataNascimento: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  tipoChave: '',
  chave: '',
  banco: '',
  agencia: '',
  conta: '',
});

/** Cliente salvo → campos do formulário, já com as máscaras. */
export function dadosDoCliente(c: Cliente): DadosCliente {
  return {
    tipo: c.tipo,
    documento: c.tipo === 'PF' ? mascaraCpf(c.documento) : mascaraCnpj(c.documento),
    nome: c.nome,
    email: c.email,
    telefone: mascaraTelefone(c.telefone),
    rgCnh: c.rgCnh,
    nomeMae: c.nomeMae,
    nomePai: c.nomePai,
    pep: c.pep,
    comoConheceu: c.comoConheceu,
    dataNascimento: c.dataNascimento,
    ...c.endereco,
    cep: mascaraCep(c.endereco.cep),
    tipoChave: c.pix.tipoChave,
    chave: mascaraChave(c.pix.tipoChave, c.pix.chave),
    banco: c.banco?.nome ?? '',
    agencia: c.banco?.agencia ?? '',
    conta: c.banco?.conta ?? '',
  };
}

export function mascaraChave(tipo: TipoChavePix | '', v: string): string {
  if (tipo === 'cpf_cnpj') return mascaraDocumento(v);
  if (tipo === 'telefone') return mascaraTelefone(v);
  return v;
}

const vazio = (s: string): boolean => s.trim() === '';
const CHAVE_ALEATORIA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarCliente(d: DadosCliente): ErrosCliente {
  const e: ErrosCliente = {};
  const pf = d.tipo === 'PF';
  if (pf) {
    if (vazio(d.documento)) e.documento = 'Informe o CPF.';
    else if (!cpfValido(d.documento)) e.documento = 'CPF inválido: confira os números.';
  } else if (vazio(d.documento)) e.documento = 'Informe o CNPJ.';
  else if (!cnpjValido(d.documento)) e.documento = 'CNPJ inválido: confira os números.';
  if (vazio(d.nome)) e.nome = pf ? 'Informe o nome.' : 'Informe a razão social.';
  if (vazio(d.email)) e.email = 'Informe o e-mail.';
  else if (!emailValido(d.email)) e.email = 'E-mail inválido.';
  const tel = soDigitos(d.telefone).length;
  if (!tel) e.telefone = 'Informe o telefone.';
  else if (tel < 10) e.telefone = 'Telefone incompleto: DDD e número.';
  if (pf) {
    if (vazio(d.nomeMae)) e.nomeMae = 'Informe o nome da mãe.';
    if (vazio(d.dataNascimento)) e.dataNascimento = 'Informe a data de nascimento.';
    else if (!dataValida(d.dataNascimento)) e.dataNascimento = 'Data inválida: use dd/mm/aaaa.';
  }
  const cep = soDigitos(d.cep).length;
  if (!cep) e.cep = 'Informe o CEP.';
  else if (cep !== 8) e.cep = 'O CEP tem 8 números.';
  if (vazio(d.rua)) e.rua = 'Informe a rua.';
  if (vazio(d.numero)) e.numero = 'Informe o número (ou s/n).';
  if (vazio(d.bairro)) e.bairro = 'Informe o bairro.';
  if (vazio(d.cidade)) e.cidade = 'Informe a cidade.';
  if (!d.uf) e.uf = 'Escolha a UF.';
  if (!d.tipoChave) e.tipoChave = 'Escolha o tipo de chave.';
  if (vazio(d.chave)) e.chave = 'Informe a chave PIX.';
  else if (d.tipoChave === 'cpf_cnpj' && !cpfValido(d.chave) && !cnpjValido(d.chave)) e.chave = 'CPF ou CNPJ inválido.';
  else if (d.tipoChave === 'email' && !emailValido(d.chave)) e.chave = 'E-mail inválido.';
  else if (d.tipoChave === 'telefone' && soDigitos(d.chave).length < 10) e.chave = 'Telefone incompleto: DDD e número.';
  else if (d.tipoChave === 'aleatoria' && !CHAVE_ALEATORIA.test(d.chave.trim())) e.chave = 'Chave aleatória inválida: copie a chave inteira, com os hífens.';
  const banco = [d.banco, d.agencia, d.conta];
  if (banco.some((v) => !vazio(v))) {
    const msg = 'Preencha banco, agência e conta, ou deixe os três em branco.';
    if (vazio(d.banco)) e.banco = msg;
    if (vazio(d.agencia)) e.agencia = msg;
    if (vazio(d.conta)) e.conta = msg;
  }
  return e;
}

const GRUPOS: readonly { nome: string; campos: readonly CampoCliente[] }[] = [
  { nome: 'dados básicos', campos: ['documento', 'nome', 'email', 'telefone', 'rgCnh', 'nomeMae', 'nomePai', 'comoConheceu', 'dataNascimento'] },
  { nome: 'endereço', campos: ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] },
  { nome: 'PIX', campos: ['tipoChave', 'chave'] },
  { nome: 'dados bancários completos', campos: ['banco', 'agencia', 'conta'] },
];

/** Partes com erro, para o resumo "Falta: …". */
export const partesComErro = (e: ErrosCliente): string[] => GRUPOS.filter((g) => g.campos.some((c) => e[c])).map((g) => g.nome);

interface Props {
  dados: DadosCliente;
  erros: ErrosCliente;
  mudar: MudarCliente;
  /** Na edição o CPF/CNPJ não muda. */
  documentoFixo?: boolean;
}

/** Os 4 cartões do formulário do cliente. */
export function SecoesCliente({ dados, erros, mudar, documentoFixo }: Props) {
  const idPep = useId();
  const pf = dados.tipo === 'PF';
  const campo = (c: CampoLivre, mascara?: (v: string) => string) => ({ valor: dados[c], aoMudar: (v: string) => mudar(c, mascara ? mascara(v) : v), erro: erros[c] });

  return (
    <>
      <Cartao titulo={pf ? 'Dados básicos' : 'Dados da empresa'}>
        <div className="g-campos">
          <CampoTexto
            rotulo={pf ? 'CPF' : 'CNPJ'}
            obrigatorio
            modo="numeric"
            placeholder={pf ? '000.000.000-00' : '00.000.000/0000-00'}
            somenteLeitura={documentoFixo}
            ajuda={documentoFixo ? 'Não muda depois do cadastro.' : undefined}
            {...campo('documento', pf ? mascaraCpf : mascaraCnpj)}
          />
          <CampoTexto rotulo={pf ? 'Nome completo' : 'Razão social'} obrigatorio {...campo('nome')} />
          <CampoTexto rotulo="E-mail" tipo="email" modo="email" obrigatorio {...campo('email')} />
          <CampoTexto rotulo="Telefone" tipo="tel" modo="tel" obrigatorio placeholder="(00) 00000-0000" {...campo('telefone', mascaraTelefone)} />
          {pf && (
            <>
              <CampoTexto rotulo="RG/CNH" placeholder="Número do documento" {...campo('rgCnh')} />
              <CampoTexto rotulo="Nome da mãe" obrigatorio {...campo('nomeMae')} />
              <CampoTexto rotulo="Nome do pai" {...campo('nomePai')} />
              <CampoTexto rotulo="Data de nascimento" obrigatorio modo="numeric" placeholder="dd/mm/aaaa" ajuda="Dia, mês e ano: dd/mm/aaaa." {...campo('dataNascimento', mascaraData)} />
              <CampoTexto rotulo="Como nos conheceu" placeholder="Instagram, indicação, Google…" {...campo('comoConheceu')} />
              <fieldset className="g-campo t-fieldset">
                <legend>Pessoa politicamente exposta</legend>
                <div className="g-opcoes">
                  <label>
                    <input type="radio" name={idPep} checked={!dados.pep} onChange={() => mudar('pep', false)} /> Não
                  </label>
                  <label>
                    <input type="radio" name={idPep} checked={dados.pep} onChange={() => mudar('pep', true)} /> Sim
                  </label>
                </div>
              </fieldset>
            </>
          )}
        </div>
      </Cartao>

      <Cartao titulo="Endereço">
        <div className="g-campos">
          <CampoTexto rotulo="CEP" obrigatorio modo="numeric" placeholder="00.000-000" {...campo('cep', mascaraCep)} />
          <CampoTexto rotulo="Rua" obrigatorio {...campo('rua')} />
          <CampoTexto rotulo="Número" obrigatorio {...campo('numero')} />
          <CampoTexto rotulo="Complemento" {...campo('complemento')} />
          <CampoTexto rotulo="Bairro" obrigatorio {...campo('bairro')} />
          <CampoTexto rotulo="Cidade" obrigatorio {...campo('cidade')} />
          <CampoSelect rotulo="UF" obrigatorio vazio="Escolha" opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))} valor={dados.uf} aoMudar={(v) => mudar('uf', v)} erro={erros.uf} />
        </div>
      </Cartao>

      <Cartao titulo="PIX" descricao="Para onde vai o pagamento das compras.">
        <div className="g-campos">
          <CampoSelect
            rotulo="Tipo de chave"
            obrigatorio
            vazio="Escolha"
            opcoes={TIPOS_CHAVE.map((t) => ({ valor: t, rotulo: ROTULO_CHAVE[t] }))}
            valor={dados.tipoChave}
            aoMudar={(v) => {
              const tipo = TIPOS_CHAVE.find((t) => t === v) ?? '';
              mudar('tipoChave', tipo);
              mudar('chave', mascaraChave(tipo, dados.chave));
            }}
            erro={erros.tipoChave}
          />
          <CampoTexto rotulo="Chave PIX" obrigatorio {...campo('chave', (v) => mascaraChave(dados.tipoChave, v))} />
        </div>
      </Cartao>

      <Cartao titulo="Dados bancários" descricao="Opcional. Se preencher, preencha os três.">
        <div className="g-campos">
          <CampoTexto rotulo="Banco" placeholder="Nome ou código" {...campo('banco')} />
          <CampoTexto rotulo="Agência" modo="numeric" {...campo('agencia')} />
          <CampoTexto rotulo="Conta com dígito" {...campo('conta')} />
        </div>
      </Cartao>
    </>
  );
}
