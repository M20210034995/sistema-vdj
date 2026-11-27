/** Componentes pequenos usados em todas as telas. Classes em src/estilos/app.css. */
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { AlertCircle, ArrowLeft, CheckCircle2, Info, Search } from 'lucide-react';
import type { StatusCompliance, StatusOperacao } from '../tipos';
import { ROTULO_STATUS } from '../services/dados';

/* ---------- hooks ---------- */

/**
 * Carrega dados de um serviço assíncrono e recarrega quando `chave` muda
 * (passe as dependências reais na chave, ex.: JSON.stringify([filtro, busca])).
 */
export function useCarregar<T>(carregar: () => Promise<T>, chave: string): { dados: T | null; erro: string | null; carregando: boolean } {
  const [estado, setEstado] = useState<{ dados: T | null; erro: string | null; carregando: boolean }>({ dados: null, erro: null, carregando: true });
  const fn = useRef(carregar);
  useEffect(() => {
    fn.current = carregar;
  });
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true }));
    fn
      .current()
      .then((dados) => vivo && setEstado({ dados, erro: null, carregando: false }))
      .catch((e: unknown) => vivo && setEstado({ dados: null, erro: e instanceof Error ? e.message : 'Erro ao carregar.', carregando: false }));
    return () => {
      vivo = false;
    };
  }, [chave]);
  return estado;
}

/** true quando a media query casa (ex.: celular = '(max-width: 743.98px)'). */
export function useMidia(query: string): boolean {
  const [casa, setCasa] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const muda = (): void => setCasa(m.matches);
    m.addEventListener('change', muda);
    muda();
    return () => m.removeEventListener('change', muda);
  }, [query]);
  return casa;
}
export const CELULAR = '(max-width: 743.98px)';

/** Mensagem que recebe o foco quando aparece (WCAG 2.4.3: depois de enviar um formulário, o foco vai para o resultado). */
export function useMensagem(): { mensagem: { tipo: 'sucesso' | 'erro' | 'info' | 'atencao'; texto: ReactNode } | null; mostrar: (tipo: 'sucesso' | 'erro' | 'info' | 'atencao', texto: ReactNode) => void; limpar: () => void; ref: RefObject<HTMLDivElement | null> } {
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'info' | 'atencao'; texto: ReactNode; n: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mensagem) ref.current?.focus();
  }, [mensagem]);
  return {
    mensagem,
    mostrar: (tipo, texto) => setMensagem((m) => ({ tipo, texto, n: (m?.n ?? 0) + 1 })),
    limpar: () => setMensagem(null),
    ref,
  };
}

/* ---------- página ---------- */

interface PaginaProps {
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  voltar?: { para: string; rotulo: string };
  children: ReactNode;
}

/** Título da aba, h1 com foco ao abrir a tela (o leitor de tela anuncia a página nova). */
export function Pagina({ titulo, subtitulo, acoes, voltar, children }: PaginaProps) {
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    document.title = `${titulo} · Valor da Joia`;
    h1.current?.focus({ preventScroll: true });
  }, [titulo]);
  return (
    <div className="g-pagina">
      {voltar && (
        <Link className="g-voltar" to={voltar.para}>
          <ArrowLeft aria-hidden="true" size={18} /> {voltar.rotulo}
        </Link>
      )}
      <div className="g-cab">
        <div>
          <h1 ref={h1} tabIndex={-1}>
            {titulo}
          </h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {acoes && <div className="g-cab-acoes">{acoes}</div>}
      </div>
      {children}
    </div>
  );
}

export function Cartao({ titulo, acoes, descricao, children, id }: { titulo?: string; acoes?: ReactNode; descricao?: ReactNode; children: ReactNode; id?: string }) {
  const idTitulo = useId();
  return (
    <section className="g-cartao" aria-labelledby={titulo ? idTitulo : undefined} id={id} tabIndex={id ? -1 : undefined}>
      {titulo && (
        <div className="g-cartao-cab">
          <h2 id={idTitulo}>{titulo}</h2>
          {acoes}
        </div>
      )}
      {descricao && <p className="g-secao-desc">{descricao}</p>}
      {children}
    </section>
  );
}

export function Aviso({ tipo, children, focoRef }: { tipo: 'sucesso' | 'erro' | 'info' | 'atencao'; children: ReactNode; focoRef?: RefObject<HTMLDivElement | null> }) {
  const Icone = tipo === 'sucesso' ? CheckCircle2 : tipo === 'erro' ? AlertCircle : Info;
  return (
    <div className={`g-aviso g-aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'} tabIndex={focoRef ? -1 : undefined} ref={focoRef}>
      <Icone aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export const Carregando = ({ texto = 'Carregando…' }: { texto?: string }) => (
  <p className="g-carregando" role="status">
    {texto}
  </p>
);

export const Vazio = ({ titulo, dica }: { titulo: string; dica?: string }) => (
  <div className="g-vazio">
    <strong>{titulo}</strong>
    {dica}
  </div>
);

/* ---------- tags ---------- */
export type Tom = 'sucesso' | 'aviso' | 'info' | 'perigo' | 'neutra';
export const Tag = ({ tom = 'neutra', children }: { tom?: Tom; children: ReactNode }) => <span className={`g-tag${tom === 'neutra' ? '' : ` g-tag-${tom}`}`}>{children}</span>;

const TOM_STATUS: Record<StatusOperacao, Tom> = {
  rascunho: 'neutra',
  avaliacao: 'aviso',
  aprovado: 'info',
  termo_assinado: 'info',
  pago: 'sucesso',
  nf_emitida: 'sucesso',
  enviado: 'aviso',
  recebido: 'info',
  exportado: 'neutra',
};
export const TagStatus = ({ status }: { status: StatusOperacao }) => <Tag tom={TOM_STATUS[status]}>{ROTULO_STATUS[status]}</Tag>;

const ROTULO_COMPLIANCE: Record<StatusCompliance, [string, Tom]> = { pendente: ['Pendente', 'aviso'], aprovado: ['Aprovado', 'sucesso'], reprovado: ['Reprovado', 'perigo'] };
export const TagCompliance = ({ status }: { status: StatusCompliance }) => <Tag tom={ROTULO_COMPLIANCE[status][1]}>{ROTULO_COMPLIANCE[status][0]}</Tag>;

/* ---------- filtros ---------- */
export function Segmentado<T extends string>({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: readonly { valor: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void }) {
  const id = useId();
  return (
    <div>
      <span className="g-rotulo-filtro" id={id}>
        {rotulo}
      </span>
      <div className="g-segmentado" role="group" aria-labelledby={id}>
        {opcoes.map((o) => (
          <button key={o.valor} type="button" aria-pressed={o.valor === valor} onClick={() => aoMudar(o.valor)}>
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Busca({ rotulo, valor, aoMudar, placeholder }: { rotulo: string; valor: string; aoMudar: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="g-busca">
      <label className="g-sr" htmlFor={id}>
        {rotulo}
      </label>
      <Search aria-hidden="true" />
      <input id={id} className="g-input" type="search" value={valor} placeholder={placeholder ?? rotulo} onChange={(e) => aoMudar(e.target.value)} />
    </div>
  );
}

/* ---------- campos ---------- */
interface CampoBase {
  rotulo: string;
  obrigatorio?: boolean;
  erro?: string | null;
  ajuda?: string;
}

export function Campo({ rotulo, obrigatorio, erro, ajuda, children }: CampoBase & { children: (props: { id: string; 'aria-invalid': boolean | undefined; 'aria-describedby': string | undefined; 'aria-required': boolean | undefined }) => ReactNode }) {
  const id = useId();
  const idAjuda = `${id}-ajuda`;
  const idErro = `${id}-erro`;
  const descricao = [ajuda ? idAjuda : '', erro ? idErro : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="g-campo">
      <label htmlFor={id}>
        {rotulo}
        {obrigatorio && (
          <span className="g-obrig" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': erro ? true : undefined, 'aria-describedby': descricao, 'aria-required': obrigatorio || undefined })}
      {ajuda && (
        <span className="g-ajuda" id={idAjuda}>
          {ajuda}
        </span>
      )}
      {erro && (
        <span className="g-erro" id={idErro}>
          {erro}
        </span>
      )}
    </div>
  );
}

export function CampoTexto({
  rotulo,
  obrigatorio,
  erro,
  ajuda,
  valor,
  aoMudar,
  tipo = 'text',
  modo,
  placeholder,
  somenteLeitura,
  autoComplete,
}: CampoBase & { valor: string; aoMudar: (v: string) => void; tipo?: string; modo?: 'numeric' | 'decimal' | 'email' | 'tel' | 'text'; placeholder?: string; somenteLeitura?: boolean; autoComplete?: string }) {
  return (
    <Campo rotulo={rotulo} obrigatorio={obrigatorio} erro={erro} ajuda={ajuda}>
      {(p) => (
        <input
          {...p}
          className="g-input"
          type={tipo}
          inputMode={modo}
          value={valor}
          placeholder={placeholder}
          readOnly={somenteLeitura}
          autoComplete={autoComplete ?? 'off'}
          onChange={(e) => aoMudar(e.target.value)}
        />
      )}
    </Campo>
  );
}

export function CampoSelect({ rotulo, obrigatorio, erro, ajuda, valor, aoMudar, opcoes, vazio }: CampoBase & { valor: string; aoMudar: (v: string) => void; opcoes: readonly { valor: string; rotulo: string }[]; vazio?: string }) {
  return (
    <Campo rotulo={rotulo} obrigatorio={obrigatorio} erro={erro} ajuda={ajuda}>
      {(p) => (
        <select {...p} className="g-select" value={valor} onChange={(e) => aoMudar(e.target.value)}>
          {vazio !== undefined && <option value="">{vazio}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      )}
    </Campo>
  );
}

/** Arquivo: só guarda o nome escolhido (nada é enviado sem o back). */
export function CampoArquivo({ rotulo, obrigatorio, erro, ajuda, aceita, aoMudar, nome }: CampoBase & { aceita: string; nome: string; aoMudar: (nome: string) => void }) {
  return (
    <Campo rotulo={rotulo} obrigatorio={obrigatorio} erro={erro} ajuda={ajuda ?? (nome ? `Escolhido: ${nome}` : undefined)}>
      {(p) => <input {...p} className="g-input" type="file" accept={aceita} onChange={(e) => aoMudar(e.target.files?.[0]?.name ?? '')} />}
    </Campo>
  );
}

/* ---------- paginação ---------- */
export function usePaginacao<T>(itens: readonly T[], porPaginaInicial = 10): { pagina: T[]; atual: number; total: number; porPagina: number; irPara: (n: number) => void; mudarPorPagina: (n: number) => void } {
  const [atual, setAtual] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);
  const total = Math.max(1, Math.ceil(itens.length / porPagina));
  const pag = Math.min(atual, total);
  return {
    pagina: itens.slice((pag - 1) * porPagina, pag * porPagina),
    atual: pag,
    total,
    porPagina,
    irPara: setAtual,
    mudarPorPagina: (n) => {
      setPorPagina(n);
      setAtual(1);
    },
  };
}

export function Paginador({ atual, total, porPagina, quantidade, irPara, mudarPorPagina }: { atual: number; total: number; porPagina: number; quantidade: number; irPara: (n: number) => void; mudarPorPagina?: (n: number) => void }) {
  const id = useId();
  if (quantidade === 0) return null;
  const de = (atual - 1) * porPagina + 1;
  const ate = Math.min(atual * porPagina, quantidade);
  return (
    <nav className="g-paginador" aria-label="Paginação">
      <span>
        {de}–{ate} de {quantidade}
      </span>
      <div className="g-paginador-botoes">
        {mudarPorPagina && (
          <>
            <label htmlFor={id}>Por página</label>
            <select id={id} className="g-select" style={{ width: 'auto' }} value={porPagina} onChange={(e) => mudarPorPagina(Number(e.target.value))}>
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </>
        )}
        <button type="button" className="g-btn" disabled={atual <= 1} onClick={() => irPara(atual - 1)}>
          Anterior
        </button>
        <span aria-current="page">
          Página {atual} de {total}
        </span>
        <button type="button" className="g-btn" disabled={atual >= total} onClick={() => irPara(atual + 1)}>
          Próxima
        </button>
      </div>
    </nav>
  );
}

/* ---------- diálogo ---------- */
/** Diálogo modal: foco preso dentro, Esc fecha, o foco volta para quem abriu. */
export function Dialogo({ titulo, aoFechar, children, acoes }: { titulo: string; aoFechar: () => void; children: ReactNode; acoes: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const focaveis = (): HTMLElement[] => [...(caixa.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])].filter((e) => !e.hasAttribute('disabled'));
    focaveis()[0]?.focus();
    const tecla = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar.current();
      }
      if (e.key !== 'Tab') return;
      const f = focaveis();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      anterior?.focus();
    };
  }, []);
  return (
    // O fundo fecha com clique (o Esc já fecha pelo teclado, no efeito acima).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="g-dialogo-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="g-dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo} ref={caixa}>
        <h2 id={idTitulo}>{titulo}</h2>
        {children}
        <div className="g-dialogo-acoes">{acoes}</div>
      </div>
    </div>
  );
}
