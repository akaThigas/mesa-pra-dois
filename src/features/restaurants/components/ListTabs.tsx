import { STATUS_LABEL, type RestaurantStatus } from '../types';
import styles from './ListTabs.module.css';

const TABS: readonly RestaurantStatus[] = ['wishlist', 'visited'];

interface ListTabsProps {
  active: RestaurantStatus;
  counts: Record<RestaurantStatus, number>;
  onChange: (status: RestaurantStatus) => void;
  panelId: string;
}

/**
 * Controle segmentado entre as duas listas.
 * Segmentado (e não navegação inferior) porque é o MESMO conteúdo visto
 * por dois recortes — busca e filtros continuam valendo ao trocar.
 */
export function ListTabs({ active, counts, onChange, panelId }: ListTabsProps) {
  return (
    <div role="tablist" aria-label="Listas de restaurantes" className={styles.tabs}>
      {TABS.map((status) => (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={status === active}
          aria-controls={panelId}
          className={styles.tab}
          onClick={() => onChange(status)}
        >
          {STATUS_LABEL[status]}
          <span className={styles.count}>{counts[status]}</span>
        </button>
      ))}
    </div>
  );
}
