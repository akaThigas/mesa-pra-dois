import { CoupleSessionProvider } from '@/features/couple/CoupleSessionContext';
import { isMockMode } from '@/features/restaurants/data';
import { DEMO_SESSION } from '@/features/restaurants/data/seed';
import { HomePage } from '@/pages/HomePage/HomePage';
import { AuthGate } from './AuthGate';

export function App() {
  // Sem Supabase configurado: modo demonstração, com um casal fictício.
  if (isMockMode) {
    return (
      <CoupleSessionProvider session={DEMO_SESSION}>
        <HomePage />
      </CoupleSessionProvider>
    );
  }

  return <AuthGate />;
}
