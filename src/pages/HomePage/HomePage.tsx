import { lazy, Suspense, useCallback, useId, useState } from 'react';
import { useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { FilterBar } from '@/features/restaurants/components/FilterBar';
import { ListTabs } from '@/features/restaurants/components/ListTabs';
import { RestaurantList } from '@/features/restaurants/components/RestaurantList';
import { ViewToggle, type ViewMode } from '@/features/restaurants/components/ViewToggle';
import { VisitSheet } from '@/features/restaurants/components/VisitSheet';
import { isMockMode } from '@/features/restaurants/data';
import { useRestaurantActions } from '@/features/restaurants/hooks/useRestaurantActions';
import { useRestaurantFilters } from '@/features/restaurants/hooks/useRestaurantFilters';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import type { Restaurant, RestaurantStatus } from '@/features/restaurants/types';
import { SearchField } from '@/shared/ui/SearchField';
import styles from './HomePage.module.css';

// Code splitting: o Leaflet só é baixado quando alguém abre o mapa.
const MapView = lazy(() => import('@/features/restaurants/components/MapView'));

function describeCounts(counts: Record<RestaurantStatus, number>): string {
  const { wishlist, visited } = counts;
  return `${wishlist} ${wishlist === 1 ? 'lugar' : 'lugares'} na fila, ${visited} já ${visited === 1 ? 'provado' : 'provados'}.`;
}

/**
 * PÁGINA = composição. Ela conecta hooks (dados/estado) a componentes
 * (apresentação) e não contém regra de negócio própria.
 */
export function HomePage() {
  const panelId = useId();
  const { coupleId } = useCoupleSession();
  const [view, setView] = useState<ViewMode>('list');
  const [visiting, setVisiting] = useState<Restaurant | null>(null);

  const { restaurants, loadState, retry } = useRestaurants(coupleId);
  const { filters, visibleRestaurants, counts, isFiltering, actions } = useRestaurantFilters(restaurants);
  const { recordVisit } = useRestaurantActions();

  const closeVisit = useCallback(() => setVisiting(null), []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mesa pra Dois</h1>
        {loadState.kind === 'ready' && <p className={styles.subtitle}>{describeCounts(counts)}</p>}
        {isMockMode && <p className={styles.demo}>Modo demonstração: dados fictícios, nada é salvo.</p>}
      </header>

      <div className={styles.controls}>
        <SearchField
          label="Buscar restaurantes"
          placeholder="Nome, bairro, prato…"
          value={filters.search}
          onChange={actions.setSearch}
        />
        <ListTabs active={filters.status} counts={counts} onChange={actions.changeStatus} panelId={panelId} />
        <FilterBar
          filters={filters}
          actions={actions}
          resultCount={visibleRestaurants.length}
          trailing={<ViewToggle value={view} onChange={setView} />}
        />
      </div>

      <main id={panelId} role="tabpanel" className={styles.main}>
        {view === 'map' && loadState.kind === 'ready' ? (
          <Suspense fallback={<div className={styles.mapLoading}>Carregando mapa…</div>}>
            <MapView restaurants={visibleRestaurants} status={filters.status} />
          </Suspense>
        ) : (
          <RestaurantList
            restaurants={visibleRestaurants}
            loadState={loadState}
            status={filters.status}
            isFiltering={isFiltering}
            onRetry={retry}
            onClearFilters={actions.clearFilters}
            onOpenVisit={setVisiting}
          />
        )}
      </main>

      <VisitSheet restaurant={visiting} onClose={closeVisit} onSave={recordVisit} />
    </div>
  );
}
