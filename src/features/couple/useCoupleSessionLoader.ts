import { useCallback, useEffect, useState } from 'react';
import { loadCoupleSession, type CoupleLoadResult } from './coupleApi';

type LoaderState = { kind: 'loading' } | { kind: 'error'; message: string } | CoupleLoadResult;

/**
 * Carrega o casal de quem está logado.
 * Também recarrega em silêncio quando o app volta ao primeiro plano:
 * assim, quando o par entra com o código, o nome dele aparece sem recarregar a página.
 */
export function useCoupleSessionLoader(userId: string) {
  const [state, setState] = useState<LoaderState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isActive = true;

    const load = (silent: boolean) => {
      if (!silent) setState({ kind: 'loading' });
      loadCoupleSession(userId)
        .then((result) => isActive && setState(result))
        .catch((error: unknown) => {
          // Numa recarga silenciosa, um erro de rede não derruba a tela que já funciona.
          if (!isActive || silent) return;
          setState({ kind: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' });
        });
    };

    load(false);

    const onVisible = () => document.visibilityState === 'visible' && load(true);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, version]);

  const reload = useCallback(() => setVersion((n) => n + 1), []);

  return { state, reload };
}
