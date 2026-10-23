/**
 * Link universal de rota do Google Maps: no celular abre o app
 * (Android/iOS); no computador, o site. Não precisa de chave de API.
 */
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Type guard: depois do filtro, o TypeScript sabe que as coordenadas existem. */
export function hasCoordinates<T extends { latitude: number | null; longitude: number | null }>(
  item: T,
): item is T & LatLng {
  return item.latitude !== null && item.longitude !== null;
}
