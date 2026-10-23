import { googleSearchUrl } from '@/shared/lib/links';
import { directionsUrl } from '@/shared/lib/maps';
import { searchQueryFor } from '../../domain/search';
import { describePlace } from '../RestaurantCard';
import styles from '../MapView.module.css';
import type { LocatedRestaurant } from './types';

/** Conteúdo do balão do pin, igual nos dois mapas. */
export function PlacePopup({ restaurant }: { restaurant: LocatedRestaurant }) {
  const place = describePlace(restaurant);
  return (
    <div className={styles.popup}>
      <a className={styles.popupName} href={googleSearchUrl(searchQueryFor(restaurant))} target="_blank" rel="noreferrer">
        {restaurant.name}
      </a>
      {place && <span className={styles.popupPlace}>{place}</span>}
      <a href={directionsUrl(restaurant.latitude, restaurant.longitude, restaurant)} target="_blank" rel="noreferrer">
        Como chegar
      </a>
    </div>
  );
}
