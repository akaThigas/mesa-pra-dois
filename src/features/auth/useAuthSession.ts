import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { getCurrentSession, onAuthChange } from './authApi';

/**
 * Sessão de login atual, sempre atualizada (entrar, sair, renovar token).
 * undefined = ainda verificando · null = ninguém logado · Session = logado.
 */
export function useAuthSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let isActive = true;
    getCurrentSession()
      .then((current) => isActive && setSession(current))
      .catch(() => isActive && setSession(null));

    const unsubscribe = onAuthChange((next) => setSession(next));
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return session;
}
