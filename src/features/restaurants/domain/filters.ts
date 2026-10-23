import type { Category, PriceLevel, Rating, Restaurant, RestaurantStatus } from '../types';
import { averageRating } from './ratings';

/*
 * Regras de filtro e ordenação como FUNÇÕES PURAS:
 * sem React, sem banco, sem efeitos colaterais.
 * Por isso são triviais de testar (veja filters.test.ts).
 */

export type SortOption = 'recent' | 'rating' | 'priceAsc' | 'name';

export interface RestaurantFilters {
  status: RestaurantStatus;
  /** null = todas as categorias */
  category: Category | null;
  search: string;
  onlyAcceptsVr: boolean;
  /** Vazio = todas as faixas */
  priceLevels: PriceLevel[];
  /** Compara com a MÉDIA das notas do casal */
  minRating: Rating | null;
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: RestaurantFilters = {
  status: 'wishlist',
  category: null,
  search: '',
  onlyAcceptsVr: false,
  priceLevels: [],
  minRating: null,
  sortBy: 'recent',
};

export const SORT_LABEL: Record<SortOption, string> = {
  recent: 'Mais recentes',
  rating: 'Melhor média',
  priceAsc: 'Mais baratos',
  name: 'A–Z',
};

type Predicate = (restaurant: Restaurant) => boolean;
type Comparator = (a: Restaurant, b: Restaurant) => number;

/** "Pão de Açúcar " → "pao de acucar" — busca sem se preocupar com acentos. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const byStatus =
  (status: RestaurantStatus): Predicate =>
  (restaurant) =>
    restaurant.status === status;

const byCategory =
  (category: Category | null): Predicate =>
  (restaurant) =>
    category === null || restaurant.category === category;

const bySearch = (search: string): Predicate => {
  const term = normalizeText(search);
  if (!term) return () => true;

  return ({ name, cuisine, neighborhood, notes }) =>
    [name, cuisine, neighborhood, notes].some(
      (field) => field != null && normalizeText(field).includes(term),
    );
};

const byVr =
  (onlyAcceptsVr: boolean): Predicate =>
  (restaurant) =>
    !onlyAcceptsVr || restaurant.acceptsVr;

const byPriceLevels =
  (levels: PriceLevel[]): Predicate =>
  (restaurant) =>
    levels.length === 0 || (restaurant.priceLevel !== null && levels.includes(restaurant.priceLevel));

const byMinRating =
  (minRating: Rating | null): Predicate =>
  (restaurant) =>
    minRating === null || (averageRating(restaurant) ?? 0) >= minRating;

const byName: Comparator = (a, b) => a.name.localeCompare(b.name, 'pt-BR');

/** Visitados: data da visita. Wishlist: quando foi adicionado. */
const recencyKey = (restaurant: Restaurant) => restaurant.visitedAt ?? restaurant.createdAt;

const comparators: Record<SortOption, Comparator> = {
  recent: (a, b) => recencyKey(b).localeCompare(recencyKey(a)),
  rating: (a, b) => (averageRating(b) ?? 0) - (averageRating(a) ?? 0) || byName(a, b),
  priceAsc: (a, b) => (a.priceLevel ?? 5) - (b.priceLevel ?? 5) || byName(a, b),
  name: byName,
};

export function filterRestaurants(
  restaurants: readonly Restaurant[],
  filters: RestaurantFilters,
): Restaurant[] {
  const predicates: Predicate[] = [
    byStatus(filters.status),
    byCategory(filters.category),
    bySearch(filters.search),
    byVr(filters.onlyAcceptsVr),
    byPriceLevels(filters.priceLevels),
    byMinRating(filters.minRating),
  ];

  // .filter() já devolve um array novo, então o .sort() não altera o original.
  return restaurants
    .filter((restaurant) => predicates.every((matches) => matches(restaurant)))
    .sort(comparators[filters.sortBy]);
}

export function countByStatus(restaurants: readonly Restaurant[]): Record<RestaurantStatus, number> {
  return restaurants.reduce<Record<RestaurantStatus, number>>(
    (counts, { status }) => ({ ...counts, [status]: counts[status] + 1 }),
    { wishlist: 0, visited: 0 },
  );
}

/** Quantos lugares de cada categoria existem na lista (aba) atual. */
export function countByCategory(
  restaurants: readonly Restaurant[],
  status: RestaurantStatus,
): Partial<Record<Category, number>> {
  const counts: Partial<Record<Category, number>> = {};
  for (const { status: itemStatus, category } of restaurants) {
    if (itemStatus === status) counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

/** Há algum filtro "estreitando" a lista? (lista e ordenação não contam) */
export function hasActiveFilters(filters: RestaurantFilters): boolean {
  return (
    filters.category !== null ||
    filters.search.trim() !== '' ||
    filters.onlyAcceptsVr ||
    filters.priceLevels.length > 0 ||
    filters.minRating !== null
  );
}
