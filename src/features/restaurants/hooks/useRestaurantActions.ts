import { useCallback } from 'react';
import { restaurantRepository, type RestaurantRepository } from '../data';
import type { VisitDetails } from '../types';

/**
 * Comandos (escritas). Repare que eles NÃO mexem no estado da lista:
 * a mudança volta pelo canal de tempo real e o useRestaurants aplica.
 * Uma única fonte da verdade → as duas telas (sua e do seu par) ficam iguais.
 */
export function useRestaurantActions(repository: RestaurantRepository = restaurantRepository) {
  const recordVisit = useCallback(
    (restaurantId: string, details: VisitDetails) => repository.recordVisit(restaurantId, details),
    [repository],
  );

  return { recordVisit };
}
