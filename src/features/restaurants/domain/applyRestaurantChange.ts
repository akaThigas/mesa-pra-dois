import type { Restaurant, RestaurantChange } from '../types';
import { setMemberRating } from './ratings';

/**
 * Aplica um evento de tempo real à lista local (função pura, estilo reducer).
 *
 * É IDEMPOTENTE: receber o mesmo evento duas vezes dá o mesmo resultado.
 * Isso importa porque quem fez a alteração também recebe o "eco" dela
 * pelo canal de realtime — com upsert por id, não há duplicação.
 */
export function applyRestaurantChange(
  restaurants: readonly Restaurant[],
  change: RestaurantChange,
): Restaurant[] {
  switch (change.type) {
    case 'delete':
      return restaurants.filter(({ id }) => id !== change.id);

    case 'upsert': {
      const { restaurant } = change;
      const existing = restaurants.find(({ id }) => id === restaurant.id);

      // O evento da tabela restaurants não traz as notas (outra tabela):
      // preservamos as que já estavam na lista.
      if (!existing) return [{ ...restaurant, ratings: [] }, ...restaurants];
      return restaurants.map((current) =>
        current.id === restaurant.id ? { ...restaurant, ratings: current.ratings } : current,
      );
    }

    case 'rating':
      return restaurants.map((current) =>
        current.id === change.restaurantId
          ? { ...current, ratings: setMemberRating(current.ratings, change.profileId, change.rating) }
          : current,
      );
  }
}
