import { CATEGORIES, type Category } from '../types';
import styles from './CategoryTabs.module.css';

interface CategoryTabsProps {
  active: Category | null;
  /** Quantidade por categoria na lista atual (Para Conhecer ou Já Fomos) */
  counts: Partial<Record<Category, number>>;
  onChange: (category: Category | null) => void;
}

/**
 * Abas por tipo de lugar. Para não poluir, só aparecem as categorias
 * que têm algum lugar na lista atual (ou a que estiver selecionada).
 */
export function CategoryTabs({ active, counts, onChange }: CategoryTabsProps) {
  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
  const visible = CATEGORIES.filter(({ value }) => (counts[value] ?? 0) > 0 || value === active);

  // Com um tipo só (ou nenhum), as abas não ajudam em nada.
  if (visible.length <= 1 && active === null) return null;

  return (
    <div className={styles.tabs} role="group" aria-label="Tipo de lugar">
      <Tab label="Todos" count={total} selected={active === null} onSelect={() => onChange(null)} />
      {visible.map(({ value, plural }) => (
        <Tab
          key={value}
          label={plural}
          count={counts[value] ?? 0}
          selected={active === value}
          onSelect={() => onChange(active === value ? null : value)}
        />
      ))}
    </div>
  );
}

function Tab({ label, count, selected, onSelect }: { label: string; count: number; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={styles.tab} aria-pressed={selected} onClick={onSelect}>
      {label}
      <span className={styles.count}>{count}</span>
    </button>
  );
}
