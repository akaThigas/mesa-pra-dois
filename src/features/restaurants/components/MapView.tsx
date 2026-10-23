import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { googleSearchUrl } from '@/shared/lib/links';
import { directionsUrl, hasCoordinates, type LatLng } from '@/shared/lib/maps';
import { searchQueryFor } from '../domain/search';
import type { Restaurant, RestaurantStatus } from '../types';
import { describePlace } from './RestaurantCard';
import styles from './MapView.module.css';

interface MapViewProps {
  restaurants: Restaurant[];
  status: RestaurantStatus;
}

/** Centro padrão quando ainda não há nenhum pin (centro de São Paulo). */
const FALLBACK_CENTER: [number, number] = [-23.5505, -46.6333];

/** Pin feito em CSS (divIcon): evita o problema clássico das imagens do Leaflet com bundlers. */
function pinIcon(status: RestaurantStatus) {
  return L.divIcon({
    className: `${styles.pin} ${styles[status]}`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

/** Ajusta o zoom para caberem todos os pins sempre que a lista muda. */
function FitToPins({ points }: { points: LatLng[] }) {
  const map = useMap();
  // Chave estável: só reenquadra quando os pontos realmente mudam.
  const key = points.map(({ latitude, longitude }) => `${latitude},${longitude}`).join('|');

  useEffect(() => {
    if (points.length === 0) return;
    const latLngs = points.map(({ latitude, longitude }) => L.latLng(latitude, longitude));
    if (latLngs.length === 1) map.setView(latLngs[0]!, 15);
    else map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 15 });
    // Dependemos de `key` (texto) e não de `points` (array novo a cada render).
  }, [map, key]);

  return null;
}

/**
 * Export default porque esta tela é carregada sob demanda (React.lazy):
 * o Leaflet (~150 KB) só é baixado quando alguém abre o mapa.
 */
export default function MapView({ restaurants, status }: MapViewProps) {
  const located = useMemo(() => restaurants.filter(hasCoordinates), [restaurants]);
  const missingCount = restaurants.length - located.length;
  const icon = useMemo(() => pinIcon(status), [status]);

  return (
    <section aria-label="Mapa dos restaurantes" className={styles.wrapper}>
      <MapContainer center={FALLBACK_CENTER} zoom={12} className={styles.map} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins points={located} />

        {located.map((restaurant) => (
          <Marker key={restaurant.id} position={[restaurant.latitude, restaurant.longitude]} icon={icon} title={restaurant.name}>
            <Popup>
              <a
                className={styles.popupName}
                href={googleSearchUrl(searchQueryFor(restaurant))}
                target="_blank"
                rel="noreferrer"
              >
                {restaurant.name}
              </a>
              {describePlace(restaurant) && <span className={styles.popupPlace}>{describePlace(restaurant)}</span>}
              <a href={directionsUrl(restaurant.latitude, restaurant.longitude)} target="_blank" rel="noreferrer">
                Como chegar
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {missingCount > 0 && (
        <p className={styles.note}>
          {missingCount === 1
            ? '1 restaurante não tem endereço e não aparece no mapa.'
            : `${missingCount} restaurantes não têm endereço e não aparecem no mapa.`}
        </p>
      )}
    </section>
  );
}
