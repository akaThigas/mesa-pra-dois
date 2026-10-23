import { AdvancedMarker, InfoWindow, Map, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import { googleMapsConfig } from '@/shared/lib/googleMaps';
import styles from '../MapView.module.css';
import { PlacePopup } from './PlacePopup';
import { FALLBACK_CENTER, type LocatedRestaurant, type MapCanvasProps } from './types';

/** Ajusta o zoom para caberem todos os pins sempre que a lista muda. */
function FitToPins({ points }: { points: LocatedRestaurant[] }) {
  const map = useMap();
  const key = points.map(({ latitude, longitude }) => `${latitude},${longitude}`).join('|');

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setCenter({ lat: points[0]!.latitude, lng: points[0]!.longitude });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach(({ latitude, longitude }) => bounds.extend({ lat: latitude, lng: longitude }));
    map.fitBounds(bounds, 48);
    // Dependemos de `key` (texto) e não de `points` (array novo a cada render).
  }, [map, key]);

  return null;
}

/** Mapa do Google: usado quando há chave configurada. */
export default function GoogleCanvas({ restaurants, status }: MapCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = restaurants.find(({ id }) => id === selectedId) ?? null;

  return (
    <Map
      className={styles.map}
      mapId={googleMapsConfig?.mapId}
      defaultCenter={FALLBACK_CENTER}
      defaultZoom={12}
      // "cooperative": no celular, rolar a página não fica preso no mapa (mexe com 2 dedos).
      gestureHandling="cooperative"
      disableDefaultUI
      zoomControl
      clickableIcons={false}
    >
      <FitToPins points={restaurants} />

      {restaurants.map((restaurant) => (
        <AdvancedMarker
          key={restaurant.id}
          position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
          title={restaurant.name}
          onClick={() => setSelectedId(restaurant.id)}
        >
          <span className={`${styles.pin} ${styles[status]} ${styles.googlePin}`} />
        </AdvancedMarker>
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude, lng: selected.longitude }}
          pixelOffset={[0, -14]}
          onCloseClick={() => setSelectedId(null)}
        >
          <PlacePopup restaurant={selected} />
        </InfoWindow>
      )}
    </Map>
  );
}
