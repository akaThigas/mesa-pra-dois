import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_FILTERS,
  countByCategory,
  countByStatus,
  filterRestaurants,
  hasActiveFilters,
  type RestaurantFilters,
  type SortOption,
} from '../domain/filters';
import type { Category, PriceLevel, Rating, Restaurant, RestaurantStatus } from '../types';

/**
 * Estado dos filtros + lista derivada.
 * Expõe AÇÕES com nomes de intenção (toggleVr, changeStatus…) em vez de um
 * setFilters genérico: a UI fica declarativa e as regras ficam aqui.
 */
export function useRestaurantFilters(restaurants: readonly Restaurant[]) {
  const [filters, setFilters] = useState<RestaurantFilters>(DEFAULT_FILTERS);

  const setSearch = useCallback((search: string) => setFilters((f) => ({ ...f, search })), []);

  const setCategory = useCallback((category: Category | null) => setFilters((f) => ({ ...f, category })), []);

  const toggleVr = useCallback(() => setFilters((f) => ({ ...f, onlyAcceptsVr: !f.onlyAcceptsVr })), []);

  const togglePriceLevel = useCallback(
    (level: PriceLevel) =>
      setFilters((f) => ({
        ...f,
        priceLevels: f.priceLevels.includes(level)
          ? f.priceLevels.filter((l) => l !== level)
          : [...f.priceLevels, level].sort(),
      })),
    [],
  );

  const setMinRating = useCallback((minRating: Rating | null) => setFilters((f) => ({ ...f, minRating })), []);

  const setSortBy = useCallback((sortBy: SortOption) => setFilters((f) => ({ ...f, sortBy })), []);

  // Regra de negócio: na wishlist não existe nota, então limpamos o que não faz sentido.
  const changeStatus = useCallback(
    (status: RestaurantStatus) =>
      setFilters((f) => ({
        ...f,
        status,
        minRating: status === 'wishlist' ? null : f.minRating,
        sortBy: status === 'wishlist' && f.sortBy === 'rating' ? 'recent' : f.sortBy,
      })),
    [],
  );

  const clearFilters = useCallback(() => setFilters((f) => ({ ...DEFAULT_FILTERS, status: f.status, sortBy: f.sortBy })), []);

  // Para a escala de um casal (dezenas/centenas de itens), filtrar no cliente
  // a cada tecla é instantâneo — não precisa de debounce nem de query no banco.
  const visibleRestaurants = useMemo(() => filterRestaurants(restaurants, filters), [restaurants, filters]);
  const counts = useMemo(() => countByStatus(restaurants), [restaurants]);
  const categoryCounts = useMemo(() => countByCategory(restaurants, filters.status), [restaurants, filters.status]);

  return {
    filters,
    visibleRestaurants,
    counts,
    categoryCounts,
    isFiltering: hasActiveFilters(filters),
    actions: { setSearch, setCategory, toggleVr, togglePriceLevel, setMinRating, setSortBy, changeStatus, clearFilters },
  };
}

export type FilterActions = ReturnType<typeof useRestaurantFilters>['actions'];
