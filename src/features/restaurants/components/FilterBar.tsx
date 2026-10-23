import { useId, type ReactNode } from 'react';
import { Chip } from '@/shared/ui/Chip';
import { SORT_LABEL, type RestaurantFilters, type SortOption } from '../domain/filters';
import type { FilterActions } from '../hooks/useRestaurantFilters';
import { PRICE_LEVELS } from '../types';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  filters: RestaurantFilters;
  actions: FilterActions;
  resultCount: number;
  /** "Slot" à direita da linha de resumo (composição em vez de mais props). */
  trailing?: ReactNode;
}

const SORT_OPTIONS_BY_STATUS: Record<RestaurantFilters['status'], SortOption[]> = {
  wishlist: ['recent', 'priceAsc', 'name'],
  visited: ['recent', 'rating', 'priceAsc', 'name'],
};

export function FilterBar({ filters, actions, resultCount, trailing }: FilterBarProps) {
  const sortId = useId();
  const isVisitedList = filters.status === 'visited';

  return (
    <div className={styles.bar}>
      <div className={styles.chips} role="group" aria-label="Filtros">
        <Chip selected={filters.onlyAcceptsVr} onToggle={actions.toggleVr}>
          Aceita VR
        </Chip>

        {PRICE_LEVELS.map((level) => (
          <Chip
            key={level}
            selected={filters.priceLevels.includes(level)}
            onToggle={() => actions.togglePriceLevel(level)}
            ariaLabel={`Faixa de preço ${level} de 4`}
          >
            {'$'.repeat(level)}
          </Chip>
        ))}

        {isVisitedList && (
          <Chip
            selected={filters.minRating === 4}
            onToggle={() => actions.setMinRating(filters.minRating === 4 ? null : 4)}
            ariaLabel="Média do casal 4 ou mais"
          >
            ★ 4+
          </Chip>
        )}
      </div>

      <div className={styles.summary}>
        <p className={styles.count} aria-live="polite">
          {resultCount === 1 ? '1 restaurante' : `${resultCount} restaurantes`}
        </p>

        <div className={styles.trailing}>
          <label htmlFor={sortId} className="visually-hidden">
            Ordenar por
          </label>
          <select
            id={sortId}
            className={styles.sort}
            value={filters.sortBy}
            onChange={(event) => actions.setSortBy(event.target.value as SortOption)}
          >
            {SORT_OPTIONS_BY_STATUS[filters.status].map((option) => (
              <option key={option} value={option}>
                {SORT_LABEL[option]}
              </option>
            ))}
          </select>
          {trailing}
        </div>
      </div>
    </div>
  );
}
