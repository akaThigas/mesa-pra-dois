/**
 * Busca de endereço (geocoding): texto → coordenadas, para o pin do mapa.
 *
 * Usa o Nominatim, do OpenStreetMap: gratuito e sem chave de API.
 * Regra de uso deles: no máximo 1 busca por segundo e sem busca
 * automática a cada tecla. Por isso a busca é feita só no botão "Buscar".
 */
import { normalizeText } from '../domain/filters';

export interface PlaceResult {
  /** Nome curto para a lista de resultados */
  label: string;
  /** Endereço legível que fica salvo no restaurante */
  address: string;
  neighborhood: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  /** O resultado aponta para o imóvel exato (tem número)? */
  hasHouseNumber: boolean;
  /** true quando a pessoa digitou um número que não foi encontrado: o pin fica na rua */
  approximate?: boolean;
  /** Identificador do Google (só quando a busca foi feita pelo Google) */
  googlePlaceId?: string | null;
}

/** Endereço digitado, separado em partes. */
export interface ParsedAddress {
  original: string;
  /** Sem CEP, sem "- SP" e com traços trocados por vírgula */
  cleaned: string;
  street: string;
  houseNumber: string | null;
  city: string | null;
}

/** Uma tentativa de busca: texto livre ou campos separados (estruturada). */
export type SearchAttempt =
  | { kind: 'free'; query: string }
  | { kind: 'structured'; street: string; city: string };

const CEP = /\b\d{5}-?\d{3}\b/g;
const STATE_SUFFIX = /\s+-\s+[A-Z]{2}\b/g; // " - SP"
const DASH_SEPARATOR = /\s+-\s+/g; // "218 - Vila Mariana"
const HOUSE_NUMBER = /^\d+[a-zA-Z]?$/;

/** "Rua Pirapora, 218 - Vila Mariana, São Paulo - SP, 04008-060" → partes. */
export function parseAddress(input: string): ParsedAddress {
  const original = input.trim();
  const parts = original
    .replace(CEP, '')
    .replace(STATE_SUFFIX, '')
    .replace(DASH_SEPARATOR, ', ')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  let [street = '', ...rest] = parts;
  let houseNumber: string | null = null;

  const numberInsideStreet = street.match(/^(.*\D)\s+(\d+[a-zA-Z]?)$/); // "Rua Pirapora 218"
  if (numberInsideStreet?.[1] && numberInsideStreet[2]) {
    street = numberInsideStreet[1].trim();
    houseNumber = numberInsideStreet[2];
  } else if (rest[0] && HOUSE_NUMBER.test(rest[0])) {
    houseNumber = rest[0]; // "Rua Pirapora, 218"
    rest = rest.slice(1);
  }

  return { original, cleaned: parts.join(', '), street, houseNumber, city: rest.at(-1) ?? null };
}

/**
 * Tentativas da mais exata à mais genérica. Com cidade conhecida, usamos a
 * busca ESTRUTURADA (rua e cidade em campos separados): no texto livre o
 * Nominatim confunde a cidade "São Paulo" com o ESTADO de São Paulo.
 */
export function buildSearchAttempts({ original, cleaned, street, houseNumber, city }: ParsedAddress): SearchAttempt[] {
  const attempts: SearchAttempt[] = [];
  if (city) {
    if (houseNumber) attempts.push({ kind: 'structured', street: `${houseNumber} ${street}`, city });
    attempts.push({ kind: 'structured', street, city });
  }
  attempts.push({ kind: 'free', query: original });
  if (cleaned !== original) attempts.push({ kind: 'free', query: cleaned });

  return attempts.filter((attempt) => (attempt.kind === 'free' ? attempt.query.length >= 3 : attempt.street.length >= 3));
}

/**
 * Mantém só os resultados da cidade digitada (se houver algum) e marca
 * como aproximados os que não acharam o número que a pessoa escreveu.
 */
export function rankResults(results: readonly PlaceResult[], { city, houseNumber }: ParsedAddress): PlaceResult[] {
  const sameCity = city
    ? results.filter((place) => place.city !== null && normalizeText(place.city) === normalizeText(city))
    : [];
  const chosen = sameCity.length > 0 ? sameCity : [...results];
  return chosen.map((place) => ({ ...place, approximate: houseNumber !== null && !place.hasHouseNumber }));
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

  return {
    label,
    address,
    neighborhood,
    city,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    hasHouseNumber: Boolean(parts.house_number),
  };
}

/** Espera respeitando o cancelamento (se a pessoa fechar a gaveta, para tudo). */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Busca cancelada', 'AbortError'));
    });
  });
}

/**
 * Tenta em ordem, com 1,1 s entre as tentativas (regra do Nominatim).
 * Para na primeira que achar algo NA CIDADE digitada; se nenhuma achar,
 * devolve o primeiro resultado que apareceu (melhor que nada).
 */
export async function searchPlaces(input: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const parsed = parseAddress(input);
  let fallback: PlaceResult[] = [];

  for (const [index, attempt] of buildSearchAttempts(parsed).entries()) {
    if (index > 0) await wait(1100, signal);
    const results = await fetchNominatim(attempt, signal);
    if (results.length === 0) continue;

    const ranked = rankResults(results, parsed);
    const inCity = !parsed.city || ranked.some((place) => place.city && normalizeText(place.city) === normalizeText(parsed.city!));
    if (inCity) return ranked;
    if (fallback.length === 0) fallback = ranked;
  }
  return fallback;
}

async function fetchNominatim(attempt: SearchAttempt, signal?: AbortSignal): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'br',
    'accept-language': 'pt-BR',
  });
  if (attempt.kind === 'free') {
    params.set('q', attempt.query);
  } else {
    params.set('street', attempt.street);
    params.set('city', attempt.city);
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!response.ok) throw new Error('A busca de endereço não respondeu agora. Tente de novo em instantes.');

  const items = (await response.json()) as NominatimItem[];
  return items.map(toPlaceResult);
}
