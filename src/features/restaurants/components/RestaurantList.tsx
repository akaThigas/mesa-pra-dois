import type { LoadState } from '../hooks/useRestaurants';
import type { Restaurant, RestaurantStatus } from '../types';
import { EmptyState } from './EmptyState';
import { RestaurantCard } from './RestaurantCard';
import styles from './RestaurantList.module.css';

interface RestaurantListProps {
  restaurants: Restaurant[];
  loadState: LoadState;
  status: RestaurantStatus;
  isFiltering: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onOpenVisit: (restaurant: Restaurant) => void;
  onEdit: (restaurant: Restaurant) => void;
}

const EMPTY_COPY: Record<RestaurantStatus, { title: string; description: string }> = {
  wishlist: {
    title: 'Nenhum lugar na lista ainda',
    description: 'Toque em “Adicionar” para salvar o próximo restaurante que vocês querem provar.',
  },
  visited: {
    title: 'Nenhuma visita registrada',
    description: 'Quando forem a um lugar da lista, toquem em “Já fomos” no cartão.',
  },
};

/**
 * Decide O QUE mostrar (carregando, erro, vazio, lista).
 * Cada estado tem um ramo explícito — nada de telas em branco.
 */
export function RestaurantList({
  restaurants,
  loadState,
  status,
  isFiltering,
  onRetry,
  onClearFilters,
  onOpenVisit,
  onEdit,
}: RestaurantListProps) {
  if (loadState.kind === 'loading') {
    return (
      <ul className={styles.list} aria-busy="true" aria-label="Carregando restaurantes">
        {[0, 1, 2].map((key) => (
          <li key={key} className={styles.skeleton} />
        ))}
      </ul>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <EmptyState
        title="Não foi possível carregar a lista"
        description={`Verifique sua conexão e tente de novo. Detalhe: ${loadState.message}`}
        action={
          <button type="button" onClick={onRetry}>
            Tentar de novo
          </button>
        }
      />
    );
  }

  if (restaurants.length === 0) {
    return isFiltering ? (
      <EmptyState
        title="Nada com esses filtros"
        description="Tente outra busca ou remova algum filtro."
        action={
          <button type="button" onClick={onClearFilters}>
            Limpar filtros
          </button>
        }
      />
    ) : (
      <EmptyState {...EMPTY_COPY[status]} />
    );
  }

  return (
    <ul className={styles.list}>
      {restaurants.map((restaurant) => (
        <li key={restaurant.id}>
          <RestaurantCard restaurant={restaurant} onOpenVisit={onOpenVisit} onEdit={onEdit} />
        </li>
      ))}
    </ul>
  );
}
