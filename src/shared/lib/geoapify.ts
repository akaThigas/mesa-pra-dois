/**
 * Chave do Geoapify (opcional). Com ela: autocompletar de endereços e o
 * visual de mapa do Geoapify. Sem ela: OpenStreetMap puro.
 *
 * Plano grátis: 3.000 créditos/dia. Autocompletar = 1 crédito por busca;
 * cada "quadradinho" do mapa = 0,25 crédito.
 */
export const geoapifyApiKey: string | null = import.meta.env.VITE_GEOAPIFY_API_KEY || null;

/** Visual de mapa do Geoapify para o Leaflet (com versão nítida para telas retina). */
export function geoapifyTileUrl(apiKey: string): string {
  return `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}{r}.png?apiKey=${apiKey}`;
}

export const GEOAPIFY_ATTRIBUTION =
  'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | ' +
  '© <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
