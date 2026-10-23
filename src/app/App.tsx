import { CoupleSessionProvider } from '@/features/couple/CoupleSessionContext';
import { isMockMode } from '@/features/restaurants/data';
import { DEMO_SESSION } from '@/features/restaurants/data/seed';
import { HomePage } from '@/pages/HomePage/HomePage';
import { MapsProvider } from '@/shared/lib/googleMaps';
import { AuthGate } from './AuthGate';

export function App() {
  return (
    // Com chave do Google: carrega o SDK uma vez para busca e mapa. Sem chave: não faz nada.
    <MapsProvider>
      {isMockMode ? (
        // Sem Supabase configurado: modo demonstração, com um casal fictício.
        <CoupleSessionProvider session={DEMO_SESSION}>
          <HomePage />
        </CoupleSessionProvider>
      ) : (
        <AuthGate />
      )}
    </MapsProvider>
  );
}
