import { AuthScreen } from '@/features/auth/AuthScreen';
import { signOut } from '@/features/auth/authApi';
import { useAuthSession } from '@/features/auth/useAuthSession';
import { CoupleSessionProvider } from '@/features/couple/CoupleSessionContext';
import { CoupleSetupScreen } from '@/features/couple/CoupleSetupScreen';
import { useCoupleSessionLoader } from '@/features/couple/useCoupleSessionLoader';
import { EmptyState } from '@/features/restaurants/components/EmptyState';
import { HomePage } from '@/pages/HomePage/HomePage';
import screen from '@/shared/ui/Screen.module.css';

const handleSignOut = () => void signOut();

/**
 * Porteiro do app: decide QUAL tela mostrar a partir do estado de login.
 *   carregando → login → criar/entrar no casal → app
 * Cada etapa é um componente pequeno; nenhum sabe das outras.
 */
export function AuthGate() {
  const session = useAuthSession();

  if (session === undefined) return <p className={screen.loading}>Carregando…</p>;
  if (session === null) return <AuthScreen />;

  // key = id do usuário: trocar de conta reinicia todo o estado lá dentro.
  return <CoupleGate key={session.user.id} userId={session.user.id} />;
}

function CoupleGate({ userId }: { userId: string }) {
  const { state, reload } = useCoupleSessionLoader(userId);

  switch (state.kind) {
    case 'loading':
      return <p className={screen.loading}>Carregando…</p>;

    case 'error':
      return (
        <main className={screen.screen}>
          <EmptyState
            title="Não foi possível carregar sua conta"
            description={`Verifique a internet e tente de novo. Detalhe: ${state.message}`}
            action={
              <button type="button" onClick={reload}>
                Tentar de novo
              </button>
            }
          />
        </main>
      );

    case 'no-couple':
      return <CoupleSetupScreen displayName={state.displayName} onDone={reload} onSignOut={handleSignOut} />;

    case 'ready':
      return (
        <CoupleSessionProvider session={state.session}>
          <HomePage onSignOut={handleSignOut} />
        </CoupleSessionProvider>
      );
  }
}
