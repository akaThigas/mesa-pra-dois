import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { RestaurantStatus } from '../../types';
import styles from '../MapView.module.css';
import { PlacePopup } from './PlacePopup';
import { FALLBACK_CENTER, type LocatedRestaurant, type MapCanvasProps } from './types';

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
function FitToPins({ points }: { points: LocatedRestaurant[] }) {
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

/** Mapa do OpenStreetMap: usado quando não há chave do Google configurada. */
export default function LeafletCanvas({ restaurants, status }: MapCanvasProps) {
  const icon = useMemo(() => pinIcon(status), [status]);

  return (
    <MapContainer center={FALLBACK_CENTER} zoom={12} className={styles.map} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToPins points={restaurants} />
      {restaurants.map((restaurant) => (
        <Marker key={restaurant.id} position={[restaurant.latitude, restaurant.longitude]} icon={icon} title={restaurant.name}>
          <Popup>
            <PlacePopup restaurant={restaurant} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
