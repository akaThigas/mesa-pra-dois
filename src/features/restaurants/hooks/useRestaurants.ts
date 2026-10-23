import { useCallback, useEffect, useState } from 'react';
import { restaurantRepository, type RestaurantRepository } from '../data';
import { applyRestaurantChange } from '../domain/applyRestaurantChange';
import type { Restaurant } from '../types';

export type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };

/**
 * Carrega os restaurantes do casal e mantém a lista sincronizada em tempo real.
 * O repositório é injetável (parâmetro com valor padrão) → fácil de testar.
 */
export function useRestaurants(coupleId: string, repository: RestaurantRepository = restaurantRepository) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true; // evita setState depois do unmount / troca de casal
    setLoadState({ kind: 'loading' });

    // 1º inscreve, 2º busca: assim nenhum evento se perde entre as duas etapas.
    const unsubscribe = repository.subscribe(coupleId, (change) => {
      setRestaurants((current) => applyRestaurantChange(current, change));
    });

    repository
      .list(coupleId)
      .then((data) => {
        if (!isActive) return;
        setRestaurants(data);
        setLoadState({ kind: 'ready' });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        setLoadState({ kind: 'error', message });
      });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [coupleId, repository, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { restaurants, loadState, retry };
}
