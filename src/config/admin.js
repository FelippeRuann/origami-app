/**
 * Identidades de administracao e contato, lidas do ambiente.
 *
 * Ficam aqui, e nao espalhadas pelas telas, para que nenhum endereco pessoal
 * seja escrito no codigo — o repositorio e publico. Configure no .env:
 *
 *   EXPO_PUBLIC_ADMIN_EMAILS="um@exemplo.com,outro@exemplo.com"
 *   EXPO_PUBLIC_SUPPORT_EMAIL="suporte@exemplo.com"
 *
 * Aviso: variaveis EXPO_PUBLIC_ sao embutidas no bundle do app, entao isto
 * mantem os enderecos fora do Git, nao fora do aplicativo distribuido. O
 * controle de acesso real e feito pelas regras do Firestore, nunca por aqui —
 * esconder o botao nao impede ninguem de chamar o banco direto.
 */

export const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'suporte@exemplo.com';

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
