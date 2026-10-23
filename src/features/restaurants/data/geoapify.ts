import type { PlaceResult } from './geocoding';

/** Campos (parciais) de um resultado do Geoapify Autocomplete com format=json. */
export interface GeoapifyItem {
  lat: number;
  lon: number;
  formatted?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  suburb?: string;
  district?: string;
  quarter?: string;
  neighbourhood?: string;
  city?: string;
  county?: string;
  address_line1?: string;
  result_type?: string;
}

/** Função pura: traduz o resultado do Geoapify para o nosso PlaceResult. */
export function toPlaceResultFromGeoapify(item: GeoapifyItem): PlaceResult {
  const street = [item.street, item.housenumber].filter(Boolean).join(', ');
  const neighborhood = item.suburb ?? item.district ?? item.quarter ?? item.neighbourhood ?? null;
  const city = item.city ?? item.county ?? null;
  const isEstablishment = item.result_type === 'amenity' && Boolean(item.name);

  // Padrão brasileiro: "Rua X, 123 - Bairro - Cidade"
  const address = [street, neighborhood, city].filter(Boolean).join(' - ') || item.formatted || '';

  return {
    label: (isEstablishment ? item.name : null) ?? item.address_line1 ?? street ?? address,
    address,
    neighborhood,
    city,
    latitude: item.lat,
    longitude: item.lon,
    hasHouseNumber: Boolean(item.housenumber),
    isEstablishment,
  };
}

/** Prioriza São Paulo (sem excluir o resto do Brasil). */
const PROXIMITY = 'proximity:-46.6333,-23.5505';

export async function geoapifyAutocomplete(text: string, apiKey: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    text,
    apiKey,
    lang: 'pt',
    limit: '6',
    format: 'json',
    filter: 'countrycode:br',
    bias: PROXIMITY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal });
  if (response.status === 401 || response.status === 403) {
    throw new Error('A chave do Geoapify foi recusada. Confira a chave e os sites permitidos no painel do Geoapify.');
  }
  if (!response.ok) throw new Error('A busca de endereço não respondeu agora. Tente de novo em instantes.');

  const { results = [] } = (await response.json()) as { results?: GeoapifyItem[] };
  return results.map(toPlaceResultFromGeoapify);
}
