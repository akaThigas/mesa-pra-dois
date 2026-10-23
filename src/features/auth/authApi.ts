import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/shared/lib/supabase';

/** O Supabase devolve erros em inglês: traduzimos os mais comuns. */
const KNOWN_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar: procure a mensagem na sua caixa de entrada (e no spam).',
  'User already registered': 'Já existe uma conta com esse e-mail. Use "Entrar".',
};

export function translateAuthError(message: string): string {
  const known = KNOWN_ERRORS[message];
  if (known) return known;
  if (/password/i.test(message) && /6/.test(message)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(message)) return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.';
  if (/invalid.*email|email.*invalid/i.test(message)) return 'Esse e-mail não parece válido.';
  return message;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(translateAuthError(error.message));
}

/** Retorna se a pessoa ainda precisa confirmar o e-mail antes de entrar. */
export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      // Vai para raw_user_meta_data → o trigger handle_new_user cria o perfil com esse nome.
      data: { display_name: input.displayName.trim() },
      // O link do e-mail de confirmação volta para este mesmo endereço.
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  return { needsEmailConfirmation: data.session === null };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(translateAuthError(error.message));
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
