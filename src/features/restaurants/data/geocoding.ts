/**
 * Busca de endereço (geocoding): texto → coordenadas, para o pin do mapa.
 *
 * Usa o Nominatim, do OpenStreetMap: gratuito e sem chave de API.
 * Regra de uso deles: no máximo 1 busca por segundo e sem busca
 * automática a cada tecla. Por isso a busca é feita só no botão "Buscar".
 */

export interface PlaceResult {
  /** Nome curto para a lista de resultados */
  label: string;
  /** Endereço legível que fica salvo no restaurante */
  address: string;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
}

/** Formato (parcial) da resposta do Nominatim com addressdetails=1. */
export interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  address?: Partial<
    Record<
      | 'road'
      | 'house_number'
      | 'suburb'
      | 'neighbourhood'
      | 'quarter'
      | 'city_district'
      | 'city'
      | 'town'
      | 'village'
      | 'municipality',
      string
    >
  >;
}

/** Função pura: fácil de testar sem internet. */
export function toPlaceResult(item: NominatimItem): PlaceResult {
  const parts = item.address ?? {};
  const street = [parts.road, parts.house_number].filter(Boolean).join(', ');
  const neighborhood = parts.suburb ?? parts.neighbourhood ?? parts.quarter ?? parts.city_district ?? null;
  const city = parts.city ?? parts.town ?? parts.village ?? parts.municipality ?? null;

  // Padrão brasileiro: "Rua X, 123 - Bairro - Cidade"
  const address = [street, neighborhood, city].filter(Boolean).join(' - ') || item.display_name;
  const label = item.name || street || item.display_name.split(',')[0] || item.display_name;

  return { label, address, neighborhood, latitude: Number(item.lat), longitude: Number(item.lon) };
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!response.ok) throw new Error('A busca de endereço não respondeu agora. Tente de novo em instantes.');

  const items = (await response.json()) as NominatimItem[];
  return items.map(toPlaceResult);
}
