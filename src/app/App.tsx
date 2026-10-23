import { CoupleSessionProvider } from '@/features/couple/CoupleSessionContext';
import { EmptyState } from '@/features/restaurants/components/EmptyState';
import { isMockMode } from '@/features/restaurants/data';
import { DEMO_SESSION } from '@/features/restaurants/data/seed';
import { HomePage } from '@/pages/HomePage/HomePage';
import styles from './App.module.css';

export function App() {
  // Próximo passo: um <AuthGate> que faz login pelo Supabase Auth,
  // lê o perfil (couple_id) e os membros do casal, e monta a CoupleSession.
  if (!isMockMode) {
    return (
      <div className={styles.pending}>
        <EmptyState
          title="Supabase conectado, falta o login"
          description="A tela de entrar e o convite do casal são o próximo passo. Para ver o app agora, use VITE_USE_MOCK=true no .env."
        />
      </div>
    );
  }

  return (
    <CoupleSessionProvider session={DEMO_SESSION}>
      <HomePage />
    </CoupleSessionProvider>
  );
}
