import { memo } from 'react';
import { useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { formatDate } from '@/shared/lib/format';
import { googleSearchUrl } from '@/shared/lib/links';
import { directionsUrl, hasCoordinates } from '@/shared/lib/maps';
import { ratingOf } from '../domain/ratings';
import { searchQueryFor } from '../domain/search';
import type { Restaurant } from '../types';
import { CoupleRatings } from './CoupleRatings';
import { PriceTag } from './PriceTag';
import styles from './RestaurantCard.module.css';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onOpenVisit: (restaurant: Restaurant) => void;
  onEdit: (restaurant: Restaurant) => void;
}

export function describePlace({ cuisine, neighborhood }: Pick<Restaurant, 'cuisine' | 'neighborhood'>): string | null {
  const parts = [cuisine, neighborhood].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Cartão em formato de comanda: cabeçalho com o essencial,
 * picote, e embaixo o "canhoto" com observações e ações.
 * memo: só re-renderiza se ESTE restaurante mudar.
 */
export const RestaurantCard = memo(function RestaurantCard({ restaurant, onOpenVisit, onEdit }: RestaurantCardProps) {
  const { currentUserId } = useCoupleSession();
  const { id, name, status, priceLevel, amountSpent, acceptsVr, notes, visitedAt } = restaurant;

  const isVisited = status === 'visited';
  const place = describePlace(restaurant);
  const actionLabel = !isVisited ? 'Já fomos' : ratingOf(restaurant, currentUserId) === null ? 'Dar minha nota' : 'Atualizar visita';

  return (
    <article className={styles.ticket} aria-labelledby={`restaurant-${id}`}>
      <header className={styles.head}>
        <h3 id={`restaurant-${id}`} className={styles.name}>
          <a className={styles.nameLink} href={googleSearchUrl(searchQueryFor(restaurant))} target="_blank" rel="noreferrer">
            {name}
            <span className="visually-hidden"> (pesquisar no Google, abre em nova aba)</span>
          </a>
        </h3>
        <PriceTag level={priceLevel} amountSpent={isVisited ? amountSpent : null} />
      </header>

      {place && <p className={styles.place}>{place}</p>}

      {isVisited && <CoupleRatings restaurant={restaurant} />}

      <div className={styles.meta}>
        {acceptsVr && <span className={styles.vr}>Aceita VR</span>}
        {isVisited && visitedAt && (
          <span className={styles.date}>
            Fomos em <time dateTime={visitedAt}>{formatDate(visitedAt)}</time>
          </span>
        )}
      </div>

      <div className={styles.stub}>
        {notes && <p className={styles.notes}>{notes}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => onOpenVisit(restaurant)}>
            {actionLabel}
          </button>
          {hasCoordinates(restaurant) && (
            <a
              className={styles.link}
              href={directionsUrl(restaurant.latitude, restaurant.longitude)}
              target="_blank"
              rel="noreferrer"
            >
              Como chegar
            </a>
          )}
          <button
            type="button"
            className={styles.link}
            onClick={() => onEdit(restaurant)}
            aria-label={`Editar dados de ${name}`}
          >
            Editar
          </button>
        </div>
      </div>
    </article>
  );
});
