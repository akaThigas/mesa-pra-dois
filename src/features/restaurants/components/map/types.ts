import type { LatLng } from '@/shared/lib/maps';
import type { Restaurant, RestaurantStatus } from '../../types';

export type LocatedRestaurant = Restaurant & LatLng;

/** Contrato comum: qualquer "tela de mapa" (Google ou OpenStreetMap) recebe isto. */
export interface MapCanvasProps {
  restaurants: LocatedRestaurant[];
  status: RestaurantStatus;
}

/** Centro padrão quando ainda não há nenhum pin (centro de São Paulo). */
export const FALLBACK_CENTER = { lat: -23.5505, lng: -46.6333 };
