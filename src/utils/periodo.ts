/** Filtro de período (Painel, Operações): as mesmas opções do sistema de referência. Semanas de segunda a domingo. */
export type Periodo = 'hoje' | '7d' | '30d' | 'mes' | 'mes_anterior' | 'ano' | 'tudo' | 'personalizado';

export const PERIODOS: readonly { valor: Periodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: '7 dias' },
  { valor: '30d', rotulo: '30 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes_anterior', rotulo: 'Mês anterior' },
  { valor: 'ano', rotulo: 'Este ano' },
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
];

export interface Intervalo {
  de?: Date;
  ate?: Date;
}

const inicioDoDia = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fimDoDia = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** `inicio` e `fim` no formato do <input type="date"> (aaaa-mm-dd), só no personalizado. */
export function intervalo(p: Periodo, inicio = '', fim = '', agora = new Date()): Intervalo {
  const hoje = inicioDoDia(agora);
  switch (p) {
    case 'hoje':
      return { de: hoje, ate: fimDoDia(agora) };
    case '7d':
      return { de: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6), ate: fimDoDia(agora) };
    case '30d':
      return { de: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 29), ate: fimDoDia(agora) };
    case 'mes':
      return { de: new Date(hoje.getFullYear(), hoje.getMonth(), 1), ate: fimDoDia(agora) };
    case 'mes_anterior':
      return { de: new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), ate: fimDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) };
    case 'ano':
      return { de: new Date(hoje.getFullYear(), 0, 1), ate: fimDoDia(agora) };
    case 'personalizado': {
      const de = inicio ? new Date(`${inicio}T00:00:00`) : undefined;
      const ate = fim ? fimDoDia(new Date(`${fim}T00:00:00`)) : undefined;
      return { de, ate };
    }
    default:
      return {};
  }
}

/** aaaa-mm-dd no fuso local (chave de dia). */
export const chaveDoDia = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Segunda-feira da semana de `d` (a semana vai de segunda a domingo: a loja do shopping abre aos domingos). */
export function segundaDaSemana(d: Date): Date {
  const x = inicioDoDia(d);
  const dia = x.getDay(); // 0 = domingo
  x.setDate(x.getDate() - (dia === 0 ? 6 : dia - 1));
  return x;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ddmm = (d: Date): string => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Título do Dashboard, como o do Lukas: "novembro de 2026, até 26/11". */
export function rotuloDoPeriodo(p: Periodo, i: Intervalo, agora = new Date()): string {
  if (p === 'mes') return `${MESES[agora.getMonth()]} de ${agora.getFullYear()}, até ${ddmm(agora)}`;
  if (p === 'mes_anterior' && i.de) return `${MESES[i.de.getMonth()]} de ${i.de.getFullYear()}`;
  if (p === 'ano') return `${agora.getFullYear()}, até ${ddmm(agora)}`;
  if (p === 'tudo') return 'todo o período';
  if (i.de && i.ate) return `${ddmm(i.de)} a ${ddmm(i.ate)}`;
  if (i.de) return `desde ${ddmm(i.de)}`;
  if (i.ate) return `até ${ddmm(i.ate)}`;
  return 'todo o período';
}
