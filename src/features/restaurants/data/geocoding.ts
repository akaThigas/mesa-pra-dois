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
  /** true quando o número não foi encontrado e o pin fica na rua */
  approximate?: boolean;
}

export interface QueryVariant {
  query: string;
  /** Esta tentativa já descartou o número do imóvel? */
  approximate: boolean;
}

const CEP = /\b\d{5}-?\d{3}\b/g;
const STATE_SUFFIX = /\s+-\s+[A-Z]{2}\b/g; // " - SP"
const DASH_SEPARATOR = /\s+-\s+/g; // "218 - Vila Mariana"
const HOUSE_NUMBER = /^\d+[a-zA-Z]?$/;

/**
 * O Nominatim se perde com o formato completo dos Correios
 * ("Rua X, 218 - Bairro, Cidade - SP, 00000-000") e muitas vezes não
 * conhece o número do prédio. Geramos tentativas do mais exato ao mais
 * genérico; quem chama usa a primeira que encontrar algo.
 */
export function buildQueryVariants(input: string): QueryVariant[] {
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

  const city = rest.at(-1) ?? null;
  const candidates: (QueryVariant | null)[] = [
    { query: original, approximate: false },
    { query: parts.join(', '), approximate: false },
    houseNumber && city ? { query: `${street} ${houseNumber}, ${city}`, approximate: false } : null,
    city ? { query: `${street}, ${city}`, approximate: houseNumber !== null } : null,
  ];

  // Remove vazias e repetidas, mantendo a ordem (da mais exata para a mais genérica).
  const seen = new Set<string>();
  return candidates.filter((variant): variant is QueryVariant => {
    if (!variant || variant.query.length < 3) return false;
    const key = variant.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

/** Tenta as variantes em ordem, com 1,1 s entre elas (regra de uso do Nominatim). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const variants = buildQueryVariants(query);
  for (const [index, variant] of variants.entries()) {
    if (index > 0) await wait(1100, signal);
    const results = await fetchNominatim(variant.query, signal);
    if (results.length > 0) return results.map((place) => ({ ...place, approximate: variant.approximate }));
  }
  return [];
}

async function fetchNominatim(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
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
