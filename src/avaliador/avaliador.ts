/**
 * Avaliador portado do index.html (main 8fa0da9) com o mesmo comportamento: teclado próprio, roda do "Outro",
 * animação do placeholder e do valor, folhas de aviso, loja do aparelho com a senha de 4 dígitos (5 toques no logo)
 * e a leitura do precos-lojas.txt (src/services/precos.ts). O código continua imperativo de propósito: foi afinado
 * no iPad e no Chrome do Android, e reescrever em React mudaria o comportamento.
 *
 * Diferenças: o código vive dentro de `raiz` (a tela Avaliar) e devolve uma função que desfaz tudo ao sair da tela;
 * o resultado ganhou "Registrar compra", que leva as joias para a Nova operação.
 */
import type { JoiaAvaliada } from '../tipos';
import { parsePeso } from '../utils/formato';
import { AVISOS, ErroPreco, lerPrecos, MATERIAIS, OUTROS_MATERIAL, QUILATES_MATERIAL, type MotivoFalhaPreco, type TabelaAvaliador } from '../services/precos';
import { LOJAS, lojaAtual, nomeDaLoja, salvarLoja, senhaConfere, SENHA_DIGITOS, lojaValida } from '../services/lojas';

const OUTROS_TIPO = ['Aliança', 'Corrente', 'Pingente', 'Medalha', 'Moeda', 'Barra', 'Tarraxa', 'Piercing', 'Abotoadura', 'Prótese dentária'];
const TIPOS: readonly [string, string][] = [
  ['Anel', '<circle cx="18" cy="21" r="10"/><path d="M13 9l5-5 5 5-5 3z"/>'],
  ['Colar', '<path d="M6 6c0 14 6 20 12 20s12-6 12-20"/><circle cx="18" cy="29" r="3"/>'],
  ['Pulseira', '<ellipse cx="18" cy="18" rx="13" ry="8"/><ellipse cx="18" cy="18" rx="9" ry="4.5"/>'],
  ['Brinco', '<circle cx="18" cy="8" r="3"/><path d="M18 11v5"/><path d="M12 22l6-6 6 6-6 9z"/>'],
];
const ICONE_APAGAR = '<svg viewBox="0 0 28 20" aria-hidden="true"><path d="M9 1h15a3 3 0 013 3v12a3 3 0 01-3 3H9L1 10z"/><path d="M14 6.5l7 7M21 6.5l-7 7"/></svg>';
const CONTAGEM = 3200;

type Chave = 'tipo' | 'material';
interface Joia {
  tipo: string | null;
  material: string | null;
  peso: string;
}
const quilate = (m: string): string => m.replace('Ouro ', '');
const OUTROS: Record<Chave, { titulo: string; lista: readonly string[]; rotulo: (v: string) => string }> = {
  tipo: { titulo: 'Tipo de peça', lista: OUTROS_TIPO, rotulo: (v) => v },
  material: { titulo: 'Quilate', lista: OUTROS_MATERIAL, rotulo: quilate },
};

const novaJoia = (): Joia => ({ tipo: null, material: null, peso: '' });
const completa = (j: Joia): boolean => !!j.tipo && !!j.material && parsePeso(j.peso) !== null;
const resumo = (j: Joia): string => `${j.tipo} · ${j.material} · ${j.peso.replace('.', ',')} g`;
const brl = (n: number): string => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
/** Valor de uma joia em reais inteiros, com os centavos para cima, em inteiros (ver utils/formato.ts). */
const valor = (j: Joia, precos: TabelaAvaliador): number =>
  Math.ceil((Math.round((parsePeso(j.peso) ?? 0) * 100) * Math.round((precos[j.material ?? ''] ?? 0) * 100)) / 10000);
const escapa = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export interface OpcoesAvaliador {
  /** "Registrar compra" no resultado. Ausente: o botão não aparece. */
  aoRegistrarCompra?: (joias: JoiaAvaliada[]) => void;
}

/** Monta o avaliador dentro de `raiz` (o HTML das 3 telas, em Avaliar.tsx). Devolve a limpeza. */
export function montarAvaliador(raiz: HTMLElement, opcoes: OpcoesAvaliador = {}): () => void {
  const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const achado = raiz.querySelector<T>(`#${id}`);
    if (!achado) throw new Error(`Avaliador: falta #${id}`);
    return achado;
  };
  const limpezas: (() => void)[] = [];
  const ouvir = <K extends keyof DocumentEventMap>(alvoEv: Document | Window, tipo: K | string, fn: (e: Event) => void, op?: AddEventListenerOptions): void => {
    alvoEv.addEventListener(tipo, fn, op);
    limpezas.push(() => alvoEv.removeEventListener(tipo, fn, op));
  };
  const folhas = new Set<HTMLElement>();
  let ativo = true;
  // Os ouvintes dos botões fixos da tela saem na limpeza (o React monta a tela duas vezes no modo de desenvolvimento).
  const parar = new AbortController();
  const { signal } = parar;

  let single = novaJoia();
  let multi: Joia[] = [];
  let aberta = 0;
  let ultimasJoias: Joia[] = [];

  // ---- roda de seleção (estilo seletor de data do iOS) ----
  // obrigatorio: sem "Cancelar" (o lugar fica, para o título continuar no meio) e o fundo não fecha.
  function abrirRoda(a: { titulo: string; opcoes: { v: string; label: string }[]; atual: string | null; escolher: (v: string | null) => void; obrigatorio?: boolean; limpar?: boolean; nota?: string }): void {
    const { titulo, opcoes: ops, atual, escolher, obrigatorio = false, limpar = true, nota = '' } = a;
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${escapa(titulo)}">
    <div class="sheet-top"><button class="sheet-btn" data-x${obrigatorio ? ' tabindex="-1" aria-hidden="true" style="visibility:hidden"' : ''}>Cancelar</button><div class="sheet-title">${escapa(titulo)}</div><button class="sheet-btn ok" data-ok>Confirmar</button></div>
    <div class="wheel"><div class="band"></div><div class="wheel-scroll" role="listbox" aria-label="${escapa(titulo)}">${ops.map((o) => `<div class="wi" role="option">${escapa(o.label)}</div>`).join('')}</div></div>
    ${atual && limpar ? '<button class="sheet-clear" data-limpar>Remover seleção</button>' : ''}
    ${nota ? `<p class="sheet-nota">${escapa(nota)}</p>` : ''}
  </div>`;
    document.body.appendChild(bg);
    folhas.add(bg);
    const sc = bg.querySelector<HTMLElement>('.wheel-scroll')!;
    const itens = [...sc.children] as HTMLElement[];
    const ITEM = itens[0].offsetHeight; // 80 px no tablet, 56 no celular
    const gira = (): void => {
      const c = sc.scrollTop / ITEM;
      itens.forEach((it, i) => {
        const d = i - c;
        const ab = Math.min(Math.abs(d), 3);
        it.style.opacity = String(1 - ab * 0.28);
        it.style.transform = `rotateX(${-d * 20}deg) scale(${1 - ab * 0.06})`;
      });
    };
    const fecha = (): void => {
      bg.classList.remove('on');
      setTimeout(() => {
        bg.remove();
        folhas.delete(bg);
      }, 320);
    };
    sc.addEventListener('scroll', gira, { passive: true });
    itens.forEach((it, i) => it.addEventListener('click', () => sc.scrollTo({ top: i * ITEM, behavior: 'smooth' })));
    bg.addEventListener('click', (e) => {
      if (e.target === bg && !obrigatorio) fecha();
    });
    bg.querySelector<HTMLButtonElement>('[data-x]')!.onclick = fecha;
    bg.querySelector<HTMLButtonElement>('[data-ok]')!.onclick = () => {
      escolher(ops[Math.min(Math.round(sc.scrollTop / ITEM), ops.length - 1)].v);
      fecha();
    };
    bg.querySelector('[data-limpar]')?.addEventListener('click', () => {
      escolher(null);
      fecha();
    });
    sc.scrollTop = Math.max(0, ops.findIndex((o) => o.v === atual)) * ITEM;
    gira();
    requestAnimationFrame(() => bg.classList.add('on'));
    bg.querySelector<HTMLButtonElement>('[data-ok]')!.focus({ preventScroll: true });
  }

  // ---- formulário de uma joia; `compacto` é a versão do modo várias ----
  function form(alvoEl: HTMLElement, j: Joia, compacto: boolean, onChange: () => void): void {
    const chipCls = compacto ? 'chip small' : 'chip';
    const campo = `<label class="wbox ${compacto ? 'sm' : ''}"><span class="g-sr">Peso em gramas</span><span class="wfield"><input inputmode="none" enterkeyhint="done" autocomplete="off" placeholder="0,00" value="${escapa(j.peso)}"><span class="wglow" aria-hidden="true"></span></span><span class="u" aria-hidden="true">g</span></label>`;
    const pilula = (k: Chave): string => `<button class="outro-pill" data-outros="${k}" aria-haspopup="dialog"><span class="lbl">Outro</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg></button>`;
    alvoEl.innerHTML = `
    ${compacto ? `<div class="mini-lbl">Tipo de peça${pilula('tipo')}</div>` : `<div class="q"><div class="q-head"><div class="num" data-n="tipo" aria-hidden="true">1</div><div class="q-title">Tipo de peça</div>${pilula('tipo')}</div>`}
      <div class="chips" data-k="tipo" role="group" aria-label="Tipo de peça">${TIPOS.map(([n, svg]) => `<button class="${chipCls}" data-v="${n}" aria-pressed="false">${compacto ? '' : `<svg viewBox="0 0 36 36" aria-hidden="true">${svg}</svg>`}${n}</button>`).join('')}</div>
    ${compacto ? `<div class="mini-lbl">Material${pilula('material')}</div>` : `</div><div class="q"><div class="q-head"><div class="num" data-n="material" aria-hidden="true">2</div><div class="q-title">Material</div>${pilula('material')}</div>`}
      <div class="chips" data-k="material" role="group" aria-label="Material">${MATERIAIS.map((n) => `<button class="chip small" data-v="${n}" aria-pressed="false" aria-label="${n}">${quilate(n)}</button>`).join('')}</div>
    ${compacto ? `<div class="mini-lbl peso-row">Peso${campo}</div>` : `</div><div class="q"><div class="q-head peso-row"><div class="num" data-n="peso" aria-hidden="true">3</div><div class="q-title">Peso</div>${campo}</div>`}
      <div class="whint" aria-live="polite"></div>
    ${compacto ? '' : '</div>'}`;

    const pinta = (): void => {
      alvoEl.querySelectorAll<HTMLElement>('.chips').forEach((g) =>
        g.querySelectorAll<HTMLElement>('.chip[data-v]').forEach((c) => {
          const sel = j[g.dataset.k as Chave] === c.dataset.v;
          c.classList.toggle('sel', sel);
          c.setAttribute('aria-pressed', String(sel));
        }),
      );
      alvoEl.querySelectorAll<HTMLElement>('[data-outros]').forEach((b) => {
        const k = b.dataset.outros as Chave;
        const atualK = j[k];
        const extra = atualK !== null && OUTROS[k].lista.includes(atualK);
        b.classList.toggle('sel', extra);
        // escolhido: o botão mostra só o valor (ex.: "14k"), sem o "Outro"
        b.querySelector('.lbl')!.textContent = extra && atualK ? OUTROS[k].rotulo(atualK) : 'Outro';
        b.setAttribute('aria-label', extra && atualK ? `${OUTROS[k].titulo}: ${OUTROS[k].rotulo(atualK)}. Trocar` : `Outro ${OUTROS[k].titulo.toLowerCase()}`);
      });
      const ok: Record<string, boolean> = { tipo: !!j.tipo, material: !!j.material, peso: parsePeso(j.peso) !== null };
      const numeros: Record<string, string> = { tipo: '1', material: '2', peso: '3' };
      alvoEl.querySelectorAll<HTMLElement>('.num').forEach((n) => {
        const k = n.dataset.n ?? '';
        n.classList.toggle('done', ok[k]);
        n.textContent = ok[k] ? '✓' : numeros[k];
      });
      const glow = alvoEl.querySelector<HTMLElement>('.wglow')!;
      glow.textContent = j.peso;
      glow.parentElement!.classList.toggle('on', j.peso.trim() !== '');
      const hint = alvoEl.querySelector<HTMLElement>('.whint')!;
      const invalido = j.peso.trim() !== '' && parsePeso(j.peso) === null;
      hint.classList.toggle('err', invalido);
      hint.textContent = invalido ? 'Peso inválido. Use até 2 casas (ex.: 12,40).' : '';
    };
    alvoEl.querySelectorAll<HTMLElement>('[data-outros]').forEach((o) =>
      o.addEventListener('click', () => {
        // "Outro" abre a roda de seleção em tela cheia.
        const k = o.dataset.outros as Chave;
        const cfg = OUTROS[k];
        const atualK = j[k];
        abrirRoda({
          titulo: cfg.titulo,
          opcoes: cfg.lista.map((v) => ({ v, label: cfg.rotulo(v) })),
          atual: atualK !== null && cfg.lista.includes(atualK) ? atualK : null,
          escolher: (v) => {
            j[k] = v;
            pinta();
            onChange();
            o.focus({ preventScroll: true });
          },
        });
      }),
    );
    alvoEl.querySelectorAll<HTMLElement>('.chips').forEach((g) =>
      g.addEventListener('click', (e) => {
        const c = (e.target as HTMLElement).closest<HTMLElement>('.chip[data-v]');
        if (!c) return;
        const k = g.dataset.k as Chave;
        j[k] = j[k] === c.dataset.v ? null : (c.dataset.v ?? null);
        pinta();
        onChange();
      }),
    );
    const inp = alvoEl.querySelector('input')!;
    inp.closest('.wbox')!.addEventListener('click', () => {
      inp.focus({ preventScroll: true });
      abrirTeclado(inp);
    });
    // Campo cresce com o texto para o número + "g" ficarem centralizados juntos (mede com um <span> invisível).
    const medida = document.createElement('span');
    medida.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px';
    medida.setAttribute('aria-hidden', 'true');
    alvoEl.appendChild(medida);
    const ajusta = (): void => {
      const cs = getComputedStyle(inp);
      medida.style.fontFamily = cs.fontFamily;
      medida.style.fontSize = cs.fontSize;
      medida.style.fontWeight = cs.fontWeight;
      medida.style.letterSpacing = cs.letterSpacing;
      medida.style.fontVariantNumeric = cs.fontVariantNumeric;
      medida.textContent = inp.value || inp.placeholder;
      inp.style.width = `${Math.ceil(medida.getBoundingClientRect().width) + 6}px`;
    };
    // Só números, vírgula (ponto vira vírgula), até 4 dígitos inteiros e 2 casas decimais.
    const soNumero = (v0: string): string => {
      const v = v0.replace('.', ',').replace(/[^0-9,]/g, '');
      const [int, ...resto] = v.split(',');
      return resto.length ? `${int.slice(0, 4)},${resto.join('').slice(0, 2)}` : int.slice(0, 4);
    };
    inp.addEventListener('input', () => {
      const limpo = soNumero(inp.value);
      if (limpo !== inp.value) inp.value = limpo;
      j.peso = inp.value;
      ajusta();
      pinta();
      onChange();
    });
    ajusta();

    // Enquanto o campo está vazio, o exemplo sobe de 0,00 até um peso sorteado e volta, em ciclos de 10 s.
    const CICLO = 10000;
    const SOBE = 3000;
    const SEGURA = 5000;
    const suave = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const fmt = (v: number): string => v.toFixed(2).replace('.', ',');
    let alvoPeso = 0;
    let inicio = 0;
    const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quadro = (agora: number): void => {
      if (!inp.isConnected || !ativo) return;
      if (!inicio || agora - inicio >= CICLO) {
        inicio = agora;
        alvoPeso = 0.3 + Math.random() * 5.4;
      }
      const t = agora - inicio;
      const f = t < SOBE ? suave(t / SOBE) : t < SOBE + SEGURA ? 1 : 1 - suave((t - SOBE - SEGURA) / (CICLO - SOBE - SEGURA));
      const novo = fmt(alvoPeso * f);
      if (novo !== inp.placeholder) {
        inp.placeholder = novo;
        if (!inp.value) ajusta();
      }
      requestAnimationFrame(quadro);
    };
    inp.placeholder = '0,00';
    ajusta();
    if (!reduzido) requestAnimationFrame(quadro);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inp.blur();
    });
    pinta();
  }

  // ---- teclado numérico próprio: só 0–9, vírgula e apagar ----
  let teclado: HTMLElement | null = null;
  let alvo: HTMLInputElement | null = null;
  function criarTeclado(): HTMLElement {
    const t = document.createElement('div');
    t.className = 'kp';
    t.setAttribute('role', 'group');
    t.setAttribute('aria-label', 'Teclado numérico');
    t.innerHTML = `<div class="kp-top"><button class="kp-ok" data-k="ok">Concluir</button></div>
    <div class="kp-grid">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map((k) => `<button class="kp-key" data-k="${k}" aria-label="${k === 'del' ? 'Apagar' : k === ',' ? 'Vírgula' : k}">${k === 'del' ? ICONE_APAGAR : k}</button>`).join('')}</div>`;
    document.body.appendChild(t);
    t.addEventListener('mousedown', (e) => e.preventDefault()); // não tira o foco do campo
    t.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-k]');
      if (!b || !alvo) return;
      const k = b.dataset.k;
      if (k === 'ok') {
        fecharTeclado();
        return;
      }
      let v = alvo.value;
      if (k === 'del') v = v.slice(0, -1);
      else if (k === ',') {
        if (v.includes(',')) return;
        v = `${v || '0'},`;
      } else v += k;
      alvo.value = v;
      alvo.dispatchEvent(new Event('input')); // o filtro e a atualização da tela ficam no handler do campo
    });
    return t;
  }
  function abrirTeclado(inp: HTMLInputElement): void {
    if (!teclado) teclado = criarTeclado();
    alvo = inp;
    teclado.classList.add('on');
    const h = teclado.offsetHeight;
    document.documentElement.style.setProperty('--kp', `${h}px`);
    document.documentElement.classList.add('kp-on');
    requestAnimationFrame(() => {
      // mantém o campo visível acima do teclado e do botão
      const footer = raiz.querySelector<HTMLElement>('.view.on .footer');
      const livre = innerHeight - h - (footer ? footer.offsetHeight : 0) - 24;
      const r = inp.getBoundingClientRect();
      if (r.bottom > livre) window.scrollBy({ top: r.bottom - livre, behavior: 'smooth' });
    });
  }
  function fecharTeclado(): void {
    if (!teclado || !teclado.classList.contains('on')) return;
    teclado.classList.remove('on');
    document.documentElement.classList.remove('kp-on');
    document.documentElement.style.removeProperty('--kp');
    if (alvo) {
      alvo.blur();
      alvo = null;
    }
  }
  // tocar fora do campo e do teclado fecha (no click, para o toque no botão "Avaliar" ainda valer)
  ouvir(document, 'click', (e) => {
    if (alvo && !(e.target as HTMLElement).closest('.kp, .wbox')) fecharTeclado();
  });

  function show(id: string): void {
    fecharTeclado();
    raiz.querySelectorAll<HTMLElement>('.view').forEach((v) => {
      v.classList.toggle('on', v.id === id);
      v.toggleAttribute('hidden', v.id !== id);
    });
    window.scrollTo(0, 0);
  }

  // Mede de novo o que depende do tamanho da tela ou da fonte (campo de peso e altura do teclado aberto).
  function remedir(): void {
    raiz.querySelectorAll<HTMLInputElement>('.view.on .wbox input').forEach((i) => i.dispatchEvent(new Event('input')));
    if (teclado?.classList.contains('on')) document.documentElement.style.setProperty('--kp', `${teclado.offsetHeight}px`);
  }
  ouvir(window, 'resize', remedir);
  if (window.visualViewport) {
    const vv = window.visualViewport;
    vv.addEventListener('resize', remedir);
    limpezas.push(() => vv.removeEventListener('resize', remedir));
  }
  if (document.fonts) {
    document.fonts.addEventListener('loadingdone', remedir);
    limpezas.push(() => document.fonts.removeEventListener('loadingdone', remedir));
  }

  // ---- uma joia ----
  const renderSingle = (): void => {
    form(el('single-form'), single, false, atualizaSingle);
    atualizaSingle();
  };
  function atualizaSingle(): void {
    el<HTMLButtonElement>('single-go').disabled = !completa(single);
  }

  // ---- várias joias ----
  function renderMulti(focar?: 'aberta' | number): void {
    const list = el('multi-list');
    list.innerHTML = '';
    multi.forEach((j, i) => {
      const card = document.createElement('div');
      if (i === aberta) {
        card.className = 'jcard open';
        card.innerHTML = `<div class="jrow"><span class="numc" aria-hidden="true">${i + 1}</span><span class="t" tabindex="-1">Joia ${i + 1}</span>${multi.length > 1 ? `<button class="e" data-rm aria-label="Remover joia ${i + 1}">Remover</button>` : ''}</div><div class="f"></div>`;
        form(card.querySelector<HTMLElement>('.f')!, j, true, atualizaMulti);
      } else {
        const ok = completa(j);
        card.className = 'jcard';
        card.innerHTML = `<div class="jrow">${ok ? '<span class="check" aria-hidden="true">✓</span>' : `<span class="numc" aria-hidden="true">${i + 1}</span>`}<span class="t" tabindex="-1">Joia ${i + 1}</span><span class="s">${ok ? escapa(resumo(j)) : 'incompleta'}</span><button class="e" data-ed aria-label="Editar joia ${i + 1}">Editar</button>${multi.length > 1 ? `<button class="e" data-rm aria-label="Remover joia ${i + 1}">Remover</button>` : ''}</div>`;
      }
      card.querySelector('[data-ed]')?.addEventListener('click', () => {
        aberta = i;
        renderMulti('aberta');
      });
      card.querySelector('[data-rm]')?.addEventListener('click', () => {
        multi.splice(i, 1);
        aberta = Math.min(aberta, multi.length - 1);
        // WCAG 2.4.3: o foco vai para a joia que ficou no lugar (ou a anterior), não se perde no topo
        renderMulti(Math.min(i, multi.length - 1));
      });
      list.appendChild(card);
    });
    const add = document.createElement('button');
    add.className = 'add';
    add.innerHTML = '<span aria-hidden="true">+</span>Adicionar outra joia';
    add.addEventListener('click', () => {
      multi.push(novaJoia());
      aberta = multi.length - 1;
      renderMulti('aberta');
    });
    list.appendChild(add);
    atualizaMulti();
    if (focar !== undefined) {
      const idx = focar === 'aberta' ? aberta : focar;
      list.querySelectorAll<HTMLElement>('.jcard .t')[idx]?.focus();
    }
  }
  function atualizaMulti(): void {
    const n = multi.length;
    el('multi-progress').textContent = `${n} ${n === 1 ? 'joia' : 'joias'}`;
    el('multi-go').innerHTML = `Avaliar ${n} ${n === 1 ? 'joia' : 'joias'} <span class="g" aria-hidden="true">→</span>`;
    el<HTMLButtonElement>('multi-go').disabled = !multi.every(completa);
  }

  // ---- folhas de aviso (mesmo padrão da roda) ----
  function folhaSimples(titulo: string, html: string, botoes: { x?: string; ok: string; aoOk: () => void }): void {
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="folha-titulo" aria-describedby="folha-msg">
    <div class="sheet-top"><button class="sheet-btn" data-x${botoes.x ? '' : ' tabindex="-1" aria-hidden="true" style="visibility:hidden"'}>${botoes.x ?? botoes.ok}</button><div class="sheet-title" id="folha-titulo">${escapa(titulo)}</div><button class="sheet-btn ok" data-ok>${botoes.ok}</button></div>
    <p class="sheet-msg" id="folha-msg">${html}</p>
  </div>`;
    document.body.appendChild(bg);
    folhas.add(bg);
    const fecha = (): void => {
      bg.classList.remove('on');
      setTimeout(() => {
        bg.remove();
        folhas.delete(bg);
      }, 320);
    };
    bg.addEventListener('click', (e) => {
      if (e.target === bg) fecha();
    });
    bg.querySelector<HTMLButtonElement>('[data-x]')!.onclick = fecha;
    bg.querySelector<HTMLButtonElement>('[data-ok]')!.onclick = () => {
      fecha();
      setTimeout(botoes.aoOk, 320); // espera esta folha sair antes de abrir outra
    };
    void bg.offsetHeight; // aplica o estado inicial antes de animar
    requestAnimationFrame(() => bg.classList.add('on'));
    bg.querySelector<HTMLButtonElement>('[data-ok]')!.focus({ preventScroll: true });
  }
  const avisar = (motivo: MotivoFalhaPreco, minutos: number | null, tentar: () => void): void =>
    folhaSimples(AVISOS[motivo].titulo, escapa(AVISOS[motivo].texto(minutos)), { x: 'Fechar', ok: 'Tentar de novo', aoOk: tentar });
  const mensagem = (titulo: string, html: string): void => folhaSimples(titulo, html, { ok: 'OK', aoOk: () => undefined });

  // ---- loja do aparelho ----
  function escolherLoja({ obrigatoria }: { obrigatoria: boolean }): void {
    const antes = lojaAtual();
    abrirRoda({
      titulo: obrigatoria ? 'Escolha a loja' : 'Mudar de loja',
      opcoes: LOJAS.map((l) => ({ v: l.id, label: l.nome })),
      atual: antes,
      obrigatorio: obrigatoria,
      limpar: false,
      nota: obrigatoria ? 'Em qual loja fica este aparelho? Para trocar depois, só com a senha.' : '',
      escolher: (v) => {
        const id = lojaValida(v);
        if (!id) return;
        salvarLoja(id);
        if (obrigatoria) return;
        setTimeout(
          () =>
            id === antes
              ? mensagem('Loja mantida', `Este aparelho continua na <b>${escapa(nomeDaLoja(id))}</b>.`)
              : mensagem('Loja alterada', `Este aparelho agora está na <b>${escapa(nomeDaLoja(id))}</b>.`),
          320,
        );
      },
    });
  }

  // Senha da troca de loja: 4 dígitos num teclado próprio dentro da folha (sem campo de texto: o teclado do
  // sistema não abre e o aparelho não oferece "Salvar senha"). Confere no último dígito.
  function pedirSenha(depois: () => void): void {
    const id = lojaAtual();
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet pin" role="dialog" aria-modal="true" aria-label="Mudar de loja">
    <div class="sheet-top"><button class="sheet-btn" data-x>Cancelar</button><div class="sheet-title">Mudar de loja</div><button class="sheet-btn" tabindex="-1" aria-hidden="true" style="visibility:hidden">Cancelar</button></div>
    <p class="sheet-msg">${id ? `Este aparelho está na <b>${escapa(nomeDaLoja(id))}</b>.` : 'Este aparelho ainda não tem loja.'} Digite a senha para trocar.</p>
    <div class="pin-pontos" role="img" aria-label="Dígitos digitados: 0 de ${SENHA_DIGITOS}">${'<i></i>'.repeat(SENHA_DIGITOS)}</div>
    <p class="pin-msg" aria-live="polite"></p>
    <div class="kp-grid">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => (k === '' ? '<span></span>' : `<button class="kp-key" data-d="${k}" aria-label="${k === 'del' ? 'Apagar' : k}">${k === 'del' ? ICONE_APAGAR : k}</button>`)).join('')}</div>
  </div>`;
    document.body.appendChild(bg);
    folhas.add(bg);
    const pontos = [...bg.querySelectorAll<HTMLElement>('.pin-pontos i')];
    const pontosRotulo = bg.querySelector<HTMLElement>('.pin-pontos')!;
    const msg = bg.querySelector<HTMLElement>('.pin-msg')!;
    let digitada = '';
    const fecha = (): void => {
      document.removeEventListener('keydown', tecla);
      bg.classList.remove('on');
      setTimeout(() => {
        bg.remove();
        folhas.delete(bg);
      }, 320);
    };
    const marca = (): void => {
      pontos.forEach((p, i) => p.classList.toggle('on', i < digitada.length));
      pontosRotulo.setAttribute('aria-label', `Dígitos digitados: ${digitada.length} de ${SENHA_DIGITOS}`);
    };
    const digita = (k: string): void => {
      msg.textContent = '';
      digitada = k === 'del' ? digitada.slice(0, -1) : (digitada + k).slice(0, SENHA_DIGITOS);
      marca();
      if (digitada.length < SENHA_DIGITOS) return;
      if (senhaConfere(digitada)) {
        fecha();
        setTimeout(depois, 320); // espera esta folha sair
        return;
      }
      digitada = '';
      marca();
      msg.textContent = 'Senha incorreta.';
    };
    function tecla(e: KeyboardEvent): void {
      if (/^\d$/.test(e.key)) digita(e.key);
      else if (e.key === 'Backspace') digita('del');
      else if (e.key === 'Escape') fecha();
    }
    document.addEventListener('keydown', tecla);
    limpezas.push(() => document.removeEventListener('keydown', tecla));
    bg.addEventListener('click', (e) => {
      if (e.target === bg) fecha();
    });
    bg.querySelector<HTMLButtonElement>('[data-x]')!.onclick = fecha;
    bg.querySelector('.kp-grid')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-d]');
      if (b?.dataset.d) digita(b.dataset.d);
    });
    void bg.offsetHeight;
    requestAnimationFrame(() => bg.classList.add('on'));
    bg.querySelector<HTMLButtonElement>('[data-x]')!.focus({ preventScroll: true });
  }

  // ---- "Avaliar": busca o preço e só então avalia. A trava evita duas consultas num toque duplo. ----
  let consultando = false;
  async function pedirAvaliacao(joias: Joia[], botao: HTMLButtonElement): Promise<void> {
    if (consultando) return;
    const id = lojaAtual();
    if (!id) {
      escolherLoja({ obrigatoria: true }); // sem loja não há preço
      return;
    }
    consultando = true;
    botao.classList.add('consultando');
    botao.setAttribute('aria-busy', 'true');
    document.documentElement.classList.add('consultando'); // trava a tela durante a espera
    let precos: TabelaAvaliador;
    try {
      precos = await lerPrecos(id);
    } catch (e) {
      if (!(e instanceof ErroPreco)) console.error(e);
      const motivo = e instanceof ErroPreco ? e.motivo : 'conexao';
      if (ativo) avisar(motivo, e instanceof ErroPreco ? e.minutos : null, () => void pedirAvaliacao(joias, botao));
      return;
    } finally {
      consultando = false;
      botao.classList.remove('consultando');
      botao.removeAttribute('aria-busy');
      document.documentElement.classList.remove('consultando');
    }
    if (ativo && joias.length && joias.every(completa)) avaliar(joias, precos); // o formulário pode ter mudado na espera
  }

  // ---- carregamento + resultado: o valor sobe contando enquanto a barra enche ----
  function avaliar(joias: Joia[], precos: TabelaAvaliador): void {
    ultimasJoias = joias.map((j) => ({ ...j }));
    const total = joias.reduce((s, j) => s + valor(j, precos), 0);
    const varias = joias.length > 1;
    const corpo = el('result-body');
    corpo.innerHTML = `
    <div class="result-label">${varias ? 'Valor total estimado<br>de acordo com a bolsa' : 'Valor estimado<br>de acordo com a bolsa'}</div>
    <div class="value" aria-hidden="true"><small>R$</small><span class="n">0</span></div>
    <p class="g-sr" role="status" id="valor-final"></p>
    <div class="pbar" aria-hidden="true"><i></i></div>`;
    const n = corpo.querySelector<HTMLElement>('.n')!;
    const barra = corpo.querySelector<HTMLElement>('.pbar i')!;
    el('v-result').classList.add('contando');
    show('v-result');
    const t0 = performance.now();
    const duracao = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : CONTAGEM;
    const passo = (agora: number): void => {
      if (!ativo) return;
      const t = Math.min(1, (agora - t0) / duracao);
      const f = 1 - Math.pow(1 - t, 3); // desacelera no fim; barra e valor andam juntos
      n.textContent = brl(total * f);
      barra.style.width = `${f * 100}%`;
      if (t < 1) {
        requestAnimationFrame(passo);
        return;
      }
      n.textContent = brl(total);
      n.classList.add('brilho');
      corpo.querySelector<HTMLElement>('#valor-final')!.textContent = `${varias ? 'Valor total estimado' : 'Valor estimado'}: R$ ${brl(total)}`;
      el('v-result').classList.remove('contando');
      el('restart').focus({ preventScroll: true });
    };
    requestAnimationFrame(passo);
  }

  // ---- ligações ----
  el('to-multi').addEventListener('click', () => {
    multi = [single, novaJoia()];
    aberta = 1;
    renderMulti();
    show('v-multi');
    el('to-single').focus();
  }, { signal });
  el('to-single').addEventListener('click', () => {
    single = multi[0] ?? novaJoia();
    // mostra antes de montar: com a tela escondida, ajusta() mede 0 e o peso já digitado ficaria com 6 px
    show('v-single');
    renderSingle();
    el('to-multi').focus();
  }, { signal });
  el('single-go').addEventListener('click', () => void pedirAvaliacao([single], el<HTMLButtonElement>('single-go')), { signal });
  el('multi-go').addEventListener('click', () => void pedirAvaliacao(multi, el<HTMLButtonElement>('multi-go')), { signal });
  el('restart').addEventListener('click', () => {
    single = novaJoia();
    multi = [];
    renderSingle();
    show('v-single');
  }, { signal });
  const registrar = raiz.querySelector<HTMLButtonElement>('#registrar');
  if (registrar) {
    if (opcoes.aoRegistrarCompra) {
      const aoRegistrar = opcoes.aoRegistrarCompra;
      registrar.addEventListener('click', () => aoRegistrar(ultimasJoias.map((j) => ({ tipo: j.tipo ?? '', material: j.material ?? '', peso: j.peso }))), { signal });
    } else registrar.remove();
  }
  // 5 toques seguidos no logo da tela inicial (até 700 ms entre um e outro) abrem a troca de loja.
  {
    let toques = 0;
    let ultimo = 0;
    raiz.querySelector('#v-single .logo-img')!.addEventListener('click', () => {
      const agora = Date.now();
      toques = agora - ultimo <= 700 ? toques + 1 : 1;
      ultimo = agora;
      if (toques < 5) return;
      toques = 0;
      fecharTeclado();
      pedirSenha(() => escolherLoja({ obrigatoria: false }));
    }, { signal });
  }

  show('v-single');
  renderSingle();
  // Loja do aparelho: a salva ou a do link (src/services/lojas.ts, na abertura do app); senão, pergunta, sem senha.
  if (!lojaAtual()) escolherLoja({ obrigatoria: true });

  return () => {
    ativo = false;
    parar.abort();
    fecharTeclado();
    teclado?.remove();
    folhas.forEach((f) => f.remove());
    document.documentElement.classList.remove('consultando', 'kp-on');
    limpezas.forEach((f) => f());
  };
}

/** Para a Nova operação: quilate da joia avaliada ("Ouro 18k" → "18k"), se for um dos 6. */
export const quilateDaJoia = (material: string): string | null => (QUILATES_MATERIAL.includes(material) ? quilate(material) : null);
