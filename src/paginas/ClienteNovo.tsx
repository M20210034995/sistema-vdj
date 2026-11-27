/**
 * Novo cliente (/clientes/novo): abas Dados e Documentos, pessoa física ou jurídica. Abre também para o atendente
 * (a compra precisa do cadastro). Aceita ?documento=… para vir com o CPF/CNPJ já digitado.
 * Sem o back, nada é salvo nem enviado: os arquivos só guardam o nome escolhido.
 */
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useUsuario } from '../contexts/Sessao';
import { cadastrarCliente } from '../services/dados';
import { inicioDo, pode } from '../services/permissoes';
import { NaoLigadoError, textoDoErro } from '../services/simulacao';
import { Aviso, CampoArquivo, Cartao, Pagina, Tag, useMensagem } from '../componentes/ui';
import { clienteVazio, partesComErro, SecoesCliente, validarCliente, type DadosCliente, type MudarCliente } from '../componentes/FormCliente';
import type { TipoPessoa } from '../tipos';
import { soDigitos } from '../utils/formato';
import { juntar } from '../utils/entrada';
import '../estilos/telas.css';

const ABAS = [
  { id: 'dados', rotulo: 'Dados' },
  { id: 'documentos', rotulo: 'Documentos' },
] as const;
type Aba = (typeof ABAS)[number]['id'];

interface Arquivos {
  rgFrente: string;
  rgVerso: string;
  cnh: string;
  selfie: string;
  comprovante: string;
}
const SEM_ARQUIVOS: Arquivos = { rgFrente: '', rgVerso: '', cnh: '', selfie: '', comprovante: '' };
const ACEITA = 'image/*,application/pdf';

/** PF: RG frente e verso, ou o arquivo único da CNH. PJ: nenhum documento obrigatório por enquanto. */
function validarArquivos(tipo: TipoPessoa, a: Arquivos): Partial<Record<keyof Arquivos, string>> {
  if (tipo === 'PJ' || a.cnh || (a.rgFrente && a.rgVerso)) return {};
  return {
    rgFrente: a.rgFrente ? undefined : a.rgVerso ? 'Falta a frente do RG.' : 'Envie o RG (frente e verso) ou a CNH.',
    rgVerso: a.rgVerso ? undefined : a.rgFrente ? 'Falta o verso do RG.' : 'Falta o verso do RG (ou envie a CNH).',
  };
}

const temErro = (e: object): boolean => Object.values(e).some(Boolean);

export default function ClienteNovo() {
  const usuario = useUsuario();
  const navegar = useNavigate();
  const local = useLocation();
  const [busca] = useSearchParams();
  const [dados, setDados] = useState<DadosCliente>(() => {
    const doc = soDigitos(busca.get('documento') ?? '');
    return clienteVazio(doc.length === 14 ? 'PJ' : 'PF', doc);
  });
  const [arquivos, setArquivos] = useState<Arquivos>(SEM_ARQUIVOS);
  const [aba, setAba] = useState<Aba>('dados');
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const msg = useMensagem();
  const base = useId();
  const idFalta = `${base}-falta`;
  const botoesAba = useRef<Record<Aba, HTMLButtonElement | null>>({ dados: null, documentos: null });

  const errosTodos = validarCliente(dados);
  const errosArqTodos = validarArquivos(dados.tipo, arquivos);
  // os erros aparecem nos campos só depois da primeira tentativa de enviar; o "Falta:" vale desde o início
  const erros = tentou ? errosTodos : {};
  const errosArq = tentou ? errosArqTodos : {};
  const faltaDocumento = temErro(errosArqTodos);
  const falta = [...partesComErro(errosTodos), ...(faltaDocumento ? ['documento de identidade (RG frente e verso, ou CNH)'] : [])];
  const podeListar = pode(usuario.perfil, 'clientes');
  const pf = dados.tipo === 'PF';

  const mudar: MudarCliente = (campo, valor) => setDados((d) => ({ ...d, [campo]: valor }));
  const escolher = (campo: keyof Arquivos) => (nome: string) => setArquivos((a) => ({ ...a, [campo]: nome }));

  function mudarTipo(tipo: TipoPessoa): void {
    if (tipo === dados.tipo) return;
    // o documento e os arquivos de identidade não servem para o outro tipo
    setDados((d) => ({ ...d, tipo, documento: '' }));
    setArquivos((a) => ({ ...a, rgFrente: '', rgVerso: '', cnh: '' }));
  }

  function teclaAba(e: KeyboardEvent<HTMLButtonElement>): void {
    const i = ABAS.findIndex((a) => a.id === aba);
    const destino = e.key === 'ArrowRight' ? (i + 1) % ABAS.length : e.key === 'ArrowLeft' ? (i - 1 + ABAS.length) % ABAS.length : e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : -1;
    if (destino < 0) return;
    e.preventDefault();
    const nova = ABAS[destino].id;
    setAba(nova);
    botoesAba.current[nova]?.focus();
  }

  function voltar(): void {
    // "default" = a tela abriu direto neste endereço: não há tela anterior do sistema para voltar
    if (local.key !== 'default') void navegar(-1);
    else void navegar(podeListar ? '/clientes' : inicioDo(usuario.perfil));
  }

  async function enviar(e: FormEvent): Promise<void> {
    e.preventDefault();
    setTentou(true);
    const comErro = ABAS.filter((a) => (a.id === 'dados' ? temErro(errosTodos) : faltaDocumento));
    if (comErro.length) {
      if (!comErro.some((a) => a.id === aba)) setAba(comErro[0].id);
      msg.mostrar('erro', comErro.length === 2 ? 'Confira os campos marcados nas abas Dados e Documentos.' : `Confira os campos marcados na aba ${comErro[0].rotulo}.`);
      return;
    }
    setEnviando(true);
    try {
      await cadastrarCliente();
    } catch (erro) {
      msg.mostrar(erro instanceof NaoLigadoError ? 'atencao' : 'erro', textoDoErro(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pagina titulo="Novo cliente" subtitulo="Preencha os dados e anexe os documentos." voltar={podeListar ? { para: '/clientes', rotulo: 'Clientes' } : undefined}>
      <form className="g-form" onSubmit={enviar} noValidate>
        {msg.mensagem && (
          <Aviso tipo={msg.mensagem.tipo} focoRef={msg.ref}>
            {msg.mensagem.texto}
          </Aviso>
        )}

        <div role="tablist" aria-label="Partes do cadastro" className="t-abas">
          {ABAS.map((a) => (
            <button
              key={a.id}
              ref={(el) => {
                botoesAba.current[a.id] = el;
              }}
              type="button"
              role="tab"
              className="t-aba"
              id={`${base}-aba-${a.id}`}
              aria-controls={`${base}-painel-${a.id}`}
              aria-selected={aba === a.id}
              tabIndex={aba === a.id ? 0 : -1}
              onClick={() => setAba(a.id)}
              onKeyDown={teclaAba}
            >
              {a.rotulo}
              {a.id === 'documentos' && faltaDocumento && <Tag tom="aviso">Pendente</Tag>}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`${base}-painel-dados`} aria-labelledby={`${base}-aba-dados`} hidden={aba !== 'dados'} className="t-pilha">
          <Cartao titulo="Tipo de cliente">
            <fieldset className="g-campo t-fieldset">
              <legend>O cliente é</legend>
              <div className="g-opcoes">
                <label>
                  <input type="radio" name={`${base}-tipo`} checked={pf} onChange={() => mudarTipo('PF')} /> Pessoa física (CPF)
                </label>
                <label>
                  <input type="radio" name={`${base}-tipo`} checked={!pf} onChange={() => mudarTipo('PJ')} /> Pessoa jurídica (CNPJ)
                </label>
              </div>
            </fieldset>
          </Cartao>
          <SecoesCliente dados={dados} erros={erros} mudar={mudar} />
        </div>

        <div role="tabpanel" id={`${base}-painel-documentos`} aria-labelledby={`${base}-aba-documentos`} hidden={aba !== 'documentos'} className="t-pilha">
          {pf ? (
            <Cartao titulo="Documento de identidade" descricao="RG frente e verso, ou o arquivo único da CNH. Imagem ou PDF.">
              <div className="g-campos">
                <CampoArquivo rotulo="RG (frente)" aceita={ACEITA} nome={arquivos.rgFrente} aoMudar={escolher('rgFrente')} erro={errosArq.rgFrente} />
                <CampoArquivo rotulo="RG (verso)" aceita={ACEITA} nome={arquivos.rgVerso} aoMudar={escolher('rgVerso')} erro={errosArq.rgVerso} />
                <CampoArquivo rotulo="CNH (arquivo único)" aceita={ACEITA} nome={arquivos.cnh} aoMudar={escolher('cnh')} />
              </div>
            </Cartao>
          ) : (
            <Aviso tipo="info">Para pessoa jurídica, nenhum documento é obrigatório por enquanto.</Aviso>
          )}
          <Cartao titulo="Outros documentos (opcional)" descricao="Imagem ou PDF. Sem o back, nada é enviado: o sistema só guarda o nome do arquivo.">
            <div className="g-campos">
              <CampoArquivo rotulo="Selfie com documento" aceita={ACEITA} nome={arquivos.selfie} aoMudar={escolher('selfie')} />
              <CampoArquivo rotulo="Comprovante de endereço" aceita={ACEITA} nome={arquivos.comprovante} aoMudar={escolher('comprovante')} />
            </div>
          </Cartao>
        </div>

        <p className="t-falta" id={idFalta}>
          {falta.length ? `Falta: ${juntar(falta)}.` : 'Tudo preenchido.'}
        </p>

        <div className="g-linha-acoes">
          <button type="submit" className="g-btn g-btn-primario" disabled={enviando} aria-describedby={idFalta}>
            {enviando ? 'Cadastrando…' : 'Cadastrar cliente'}
          </button>
          <button type="button" className="g-btn" onClick={voltar}>
            Cancelar
          </button>
        </div>
      </form>
    </Pagina>
  );
}
