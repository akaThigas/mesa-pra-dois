import { APIProvider } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

/**
 * Configuração do Google Maps vinda do ambiente (Vercel / .env).
 * null = sem chave: o app usa OpenStreetMap (busca e mapa) no lugar.
 */
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const googleMapsConfig = apiKey
  ? {
      apiKey,
      // Marcadores avançados exigem um Map ID. DEMO_MAP_ID é o ID de testes do Google.
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
    }
  : null;

/** Carrega o SDK do Google uma única vez para o app inteiro (só se houver chave). */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!googleMapsConfig) return <>{children}</>;
  return (
    <APIProvider apiKey={googleMapsConfig.apiKey} language="pt-BR" region="BR">
      {children}
    </APIProvider>
  );
}
