import { membersForDisplay, useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { StarRating } from '@/shared/ui/StarRating';
import { ratingOf } from '../domain/ratings';
import type { Restaurant } from '../types';
import styles from './CoupleRatings.module.css';

/** A nota de cada um, lado a lado — inclusive de quem ainda não avaliou. */
export function CoupleRatings({ restaurant }: { restaurant: Restaurant }) {
  const session = useCoupleSession();

  return (
    <dl className={styles.ratings}>
      {membersForDisplay(session).map((member) => {
        const rating = ratingOf(restaurant, member.id);
        return (
          <div key={member.id} className={styles.row}>
            <dt className={styles.who}>{member.displayName}</dt>
            <dd className={styles.value}>
              {rating === null ? <span className={styles.pending}>ainda não avaliou</span> : <StarRating value={rating} />}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
