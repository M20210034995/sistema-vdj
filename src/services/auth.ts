/**
 * Login FALSO, só para navegar pelas telas enquanto o back não existe.
 *
 * ATENÇÃO: isto NÃO é segurança. A "sessão" é só um registro no navegador que qualquer pessoa pode criar.
 * Quem autentica de verdade é o back (sessão em cookie httpOnly ou token assinado), e cada rota da API precisa
 * conferir a sessão e o perfil no servidor (docs/funcoes-do-back.md).
 *
 * Para ligar ao back: troque o corpo de entrar, sair e usuarioAtual, mantendo as assinaturas.
 */
import type { Perfil, Usuario } from '../tipos';
import { USUARIOS } from '../mocks/dados';
import { simularRede } from './simulacao';

const CHAVE = 'vdj-sessao';

/**
 * Usuários de teste, um por perfil. SÓ EXISTEM NO `npm run dev`: no build, `import.meta.env.DEV` vira false,
 * o objeto sai do JavaScript (conferido com grep no dist) e o login falso recusa qualquer acesso.
 */
export const CREDENCIAIS_TESTE: Readonly<Record<Perfil, { email: string; senha: string }>> | null = import.meta.env.DEV
  ? {
      admin: { email: 'admin@exemplo.com', senha: 'vdj-teste-admin' },
      gerente: { email: 'gerente.zn@exemplo.com', senha: 'vdj-teste-gerente' },
      atendente: { email: 'atendente.zn@exemplo.com', senha: 'vdj-teste-atendente' },
    }
  : null;

export const MENSAGEM_SEM_BACK = 'O acesso só vai funcionar quando o back existir.';

export class ErroLogin extends Error {
  constructor(mensagem = 'E-mail ou senha incorretos.') {
    super(mensagem);
    this.name = 'ErroLogin';
  }
}

function lerSessao(): string | null {
  try {
    return sessionStorage.getItem(CHAVE) ?? localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

/** "Manter conectado" (tablets): a sessão fica no localStorage e sobrevive a fechar o app. Sem isso, dura até fechar a aba. */
export async function entrar(email: string, senha: string, manterConectado: boolean): Promise<Usuario> {
  await simularRede(null);
  if (!CREDENCIAIS_TESTE) throw new ErroLogin(MENSAGEM_SEM_BACK);
  const perfil = (Object.keys(CREDENCIAIS_TESTE) as Perfil[]).find(
    (p) => CREDENCIAIS_TESTE[p].email === email.trim().toLowerCase() && CREDENCIAIS_TESTE[p].senha === senha,
  );
  const usuario = perfil ? USUARIOS.find((u) => u.email === CREDENCIAIS_TESTE[perfil].email) : undefined;
  if (!usuario) throw new ErroLogin();
  try {
    sair();
    (manterConectado ? localStorage : sessionStorage).setItem(CHAVE, usuario.id);
  } catch {
    /* sem armazenamento: o login vale só até recarregar a página */
  }
  return { ...usuario };
}

export function sair(): void {
  try {
    sessionStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE);
  } catch {
    /* nada a fazer */
  }
}

export function usuarioAtual(): Usuario | null {
  if (!import.meta.env.DEV) return null; // em produção, sem back, ninguém entra
  const id = lerSessao();
  const usuario = USUARIOS.find((u) => u.id === id && u.status === 'ativo');
  return usuario ? { ...usuario } : null;
}
