import type { PlaceResult } from './geocoding';

/**
 * Tradução do resultado do Google Places (API nova) para o nosso PlaceResult.
 * Recebe um objeto "parecido" com google.maps.places.Place em vez da classe
 * real: assim dá para testar sem carregar o SDK do Google.
 */
export interface GooglePlaceLike {
  id: string;
  formattedAddress?: string | null;
  location?: { lat(): number; lng(): number } | null;
  addressComponents?: { longText: string | null; types: string[] }[] | null;
}

/**
 * Campos pedidos ao Google. Todos da faixa "Essentials" (a mais barata).
 * O nome NÃO é pedido aqui: viria da faixa "Pro". Usamos o nome que já
 * veio na sugestão do autocompletar.
 */
export const GOOGLE_PLACE_FIELDS = ['location', 'formattedAddress', 'addressComponents'] as const;

function component(place: GooglePlaceLike, ...types: string[]): string | null {
  for (const type of types) {
    const found = place.addressComponents?.find((part) => part.types.includes(type));
    if (found?.longText) return found.longText;
  }
  return null;
}

export function toPlaceResultFromGoogle(place: GooglePlaceLike, label: string): PlaceResult | null {
  if (!place.location) return null;

  return {
    label,
    // "R. Pirapora, 218 - Vila Mariana, São Paulo - SP, 04008-060, Brasil" → sem o país
    address: (place.formattedAddress ?? label).replace(/,\s*(Brasil|Brazil)$/i, ''),
    // No Brasil, o Google usa "sublocality" para bairro e "administrative_area_level_2" para cidade.
    neighborhood: component(place, 'sublocality_level_1', 'sublocality', 'neighborhood'),
    city: component(place, 'administrative_area_level_2', 'locality'),
    latitude: place.location.lat(),
    longitude: place.location.lng(),
    hasHouseNumber: component(place, 'street_number') !== null,
    googlePlaceId: place.id,
    isEstablishment: true,
  };
}
