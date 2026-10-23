import type { MemberRating, Rating, Restaurant } from '../types';

/** Média das notas do casal (null se ninguém avaliou). */
export function averageRating({ ratings }: Pick<Restaurant, 'ratings'>): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, { rating }) => total + rating, 0);
  return sum / ratings.length;
}

export function ratingOf({ ratings }: Pick<Restaurant, 'ratings'>, profileId: string): Rating | null {
  return ratings.find((entry) => entry.profileId === profileId)?.rating ?? null;
}

/** Coloca, troca ou remove (rating null) a nota de uma pessoa. Imutável. */
export function setMemberRating(
  ratings: readonly MemberRating[],
  profileId: string,
  rating: Rating | null,
): MemberRating[] {
  const others = ratings.filter((entry) => entry.profileId !== profileId);
  return rating === null ? others : [...others, { profileId, rating }];
}
