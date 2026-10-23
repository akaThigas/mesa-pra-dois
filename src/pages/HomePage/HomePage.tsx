import { lazy, Suspense, useCallback, useId, useState } from 'react';
import { useCoupleSession } from '@/features/couple/CoupleSessionContext';
import { InviteBanner } from '@/features/couple/InviteBanner';
import { CategoryTabs } from '@/features/restaurants/components/CategoryTabs';
import { FilterBar } from '@/features/restaurants/components/FilterBar';
import { ListTabs } from '@/features/restaurants/components/ListTabs';
import { RestaurantFormSheet, type RestaurantFormTarget } from '@/features/restaurants/components/RestaurantFormSheet';
import { RestaurantList } from '@/features/restaurants/components/RestaurantList';
import { ViewToggle, type ViewMode } from '@/features/restaurants/components/ViewToggle';
import { VisitSheet } from '@/features/restaurants/components/VisitSheet';
import { isMockMode } from '@/features/restaurants/data';
import { useRestaurantActions } from '@/features/restaurants/hooks/useRestaurantActions';
import { useRestaurantFilters } from '@/features/restaurants/hooks/useRestaurantFilters';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import type { NewRestaurant, Restaurant, RestaurantStatus } from '@/features/restaurants/types';
import { SearchField } from '@/shared/ui/SearchField';
import styles from './HomePage.module.css';

// Code splitting: o Leaflet só é baixado quando alguém abre o mapa.
const MapView = lazy(() => import('@/features/restaurants/components/MapView'));

function describeCounts(counts: Record<RestaurantStatus, number>): string {
  const { wishlist, visited } = counts;
  return `${wishlist} ${wishlist === 1 ? 'lugar' : 'lugares'} na fila, ${visited} já ${visited === 1 ? 'provado' : 'provados'}.`;
}

interface HomePageProps {
  /** Ausente no modo demonstração (não há login). */
  onSignOut?: () => void;
}

/**
 * PÁGINA = composição. Ela conecta hooks (dados/estado) a componentes
 * (apresentação) e não contém regra de negócio própria.
 */
export function HomePage({ onSignOut }: HomePageProps) {
  const panelId = useId();
  const { coupleId, members, inviteCode } = useCoupleSession();
  const [view, setView] = useState<ViewMode>('list');
  const [visiting, setVisiting] = useState<Restaurant | null>(null);
  const [formTarget, setFormTarget] = useState<RestaurantFormTarget>(null);

  const { restaurants, loadState, retry } = useRestaurants(coupleId);
  const { filters, visibleRestaurants, counts, categoryCounts, isFiltering, actions } = useRestaurantFilters(restaurants);
  const { createRestaurant, updateRestaurant, removeRestaurant, recordVisit } = useRestaurantActions();

  const closeVisit = useCallback(() => setVisiting(null), []);
  const closeForm = useCallback(() => setFormTarget(null), []);
  const openEdit = useCallback((restaurant: Restaurant) => setFormTarget({ mode: 'edit', restaurant }), []);

  // Adicionado direto em "Já Fomos"? Emenda com a gaveta de visita para já dar a nota.
  const handleCreate = useCallback(
    async (input: NewRestaurant) => {
      const created = await createRestaurant(input);
      if (created.status === 'visited') setVisiting(created);
    },
    [createRestaurant],
  );

  const showInvite = inviteCode !== null && members.length < 2;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Mesa pra Dois</h1>
          {onSignOut && (
            <button type="button" className={styles.signOut} onClick={onSignOut}>
              Sair
            </button>
          )}
        </div>
        {loadState.kind === 'ready' && <p className={styles.subtitle}>{describeCounts(counts)}</p>}
        {isMockMode && <p className={styles.demo}>Modo demonstração: dados fictícios, nada é salvo.</p>}
      </header>

      {showInvite && <InviteBanner code={inviteCode} />}

      <div className={styles.controls}>
        <SearchField
          label="Buscar restaurantes"
          placeholder="Nome, tipo, bairro, prato…"
          value={filters.search}
          onChange={actions.setSearch}
        />
        <ListTabs active={filters.status} counts={counts} onChange={actions.changeStatus} panelId={panelId} />
        <CategoryTabs active={filters.category} counts={categoryCounts} onChange={actions.setCategory} />
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
            <MapView restaurants={visibleRestaurants} status={filters.status} onAddAddress={openEdit} />
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
            onEdit={openEdit}
          />
        )}
      </main>

      <button
        type="button"
        className={styles.fab}
        // Está na aba "Bares"? O novo lugar já vem marcado como bar.
        onClick={() =>
          setFormTarget({ mode: 'create', status: filters.status, category: filters.category ?? 'restaurante' })
        }
      >
        <span aria-hidden="true" className={styles.fabPlus}>
          +
        </span>
        Adicionar
      </button>

      <RestaurantFormSheet
        target={formTarget}
        onClose={closeForm}
        onCreate={handleCreate}
        onUpdate={updateRestaurant}
        onDelete={removeRestaurant}
      />
      <VisitSheet restaurant={visiting} onClose={closeVisit} onSave={recordVisit} />
    </div>
  );
}
