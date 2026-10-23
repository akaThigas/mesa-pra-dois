import { useCallback, useMemo } from 'react';
import { restaurantRepository, type RestaurantRepository } from '../data';
import type { NewRestaurant, RestaurantPatch, VisitDetails } from '../types';

/**
 * Comandos (escritas). Repare que eles NÃO mexem no estado da lista:
 * a mudança volta pelo canal de tempo real e o useRestaurants aplica.
 * Uma única fonte da verdade → as duas telas (sua e do seu par) ficam iguais.
 */
export function useRestaurantActions(repository: RestaurantRepository = restaurantRepository) {
  const createRestaurant = useCallback((input: NewRestaurant) => repository.create(input), [repository]);

  const updateRestaurant = useCallback(
    (id: string, patch: RestaurantPatch) => repository.update(id, patch),
    [repository],
  );

  const removeRestaurant = useCallback((id: string) => repository.remove(id), [repository]);

  const recordVisit = useCallback(
    (restaurantId: string, details: VisitDetails) => repository.recordVisit(restaurantId, details),
    [repository],
  );

  return useMemo(
    () => ({ createRestaurant, updateRestaurant, removeRestaurant, recordVisit }),
    [createRestaurant, updateRestaurant, removeRestaurant, recordVisit],
  );
}
