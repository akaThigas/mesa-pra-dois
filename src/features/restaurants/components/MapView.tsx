import { lazy, Suspense, useMemo } from 'react';
import { googleMapsConfig } from '@/shared/lib/googleMaps';
import { hasCoordinates } from '@/shared/lib/maps';
import type { Restaurant, RestaurantStatus } from '../types';
import styles from './MapView.module.css';

/*
 * Strategy: a mesma tela, duas implementações de mapa.
 * Cada uma é carregada sob demanda, então quem usa o Google
 * nunca baixa o Leaflet (e vice-versa).
 */
const MapCanvas = googleMapsConfig
  ? lazy(() => import('./map/GoogleCanvas'))
  : lazy(() => import('./map/LeafletCanvas'));

interface MapViewProps {
  restaurants: Restaurant[];
  status: RestaurantStatus;
  /** Abre o formulário para completar o endereço de quem está sem pin. */
  onAddAddress: (restaurant: Restaurant) => void;
}

export default function MapView({ restaurants, status, onAddAddress }: MapViewProps) {
  const located = useMemo(() => restaurants.filter(hasCoordinates), [restaurants]);
  const missing = useMemo(() => restaurants.filter((restaurant) => !hasCoordinates(restaurant)), [restaurants]);

  return (
    <section aria-label="Mapa dos lugares" className={styles.wrapper}>
      <Suspense fallback={<div className={styles.map} />}>
        <MapCanvas restaurants={located} status={status} />
      </Suspense>

      {/* Em vez de só avisar, mostra QUEM falta e leva direto à correção. */}
      {missing.length > 0 && (
        <section className={styles.missing} aria-labelledby="missing-title">
          <h3 id="missing-title" className={styles.missingTitle}>
            {missing.length === 1 ? '1 lugar sem endereço' : `${missing.length} lugares sem endereço`}
          </h3>
          <p className={styles.note}>Eles não aparecem no mapa até você buscar e escolher o endereço.</p>
          <ul className={styles.missingList}>
            {missing.map((restaurant) => (
              <li key={restaurant.id} className={styles.missingItem}>
                <span>{restaurant.name}</span>
                <button type="button" className={styles.addAddress} onClick={() => onAddAddress(restaurant)}>
                  Adicionar endereço
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
