import { formatCurrency } from '@/shared/lib/format';
import type { PriceLevel } from '../types';
import styles from './PriceTag.module.css';

interface PriceTagProps {
  level: PriceLevel | null;
  /** Quando existe, mostra o valor real gasto no lugar da estimativa. */
  amountSpent: number | null;
}

const MAX_LEVEL = 4;

export function PriceTag({ level, amountSpent }: PriceTagProps) {
  if (amountSpent !== null) {
    return (
      <span className={styles.spent}>
        <span className="visually-hidden">Gasto: </span>
        {formatCurrency(amountSpent)}
      </span>
    );
  }

  if (level === null) return null;

  return (
    <span className={styles.level} role="img" aria-label={`Faixa de preço ${level} de ${MAX_LEVEL}`}>
      <span aria-hidden="true">{'$'.repeat(level)}</span>
      <span aria-hidden="true" className={styles.dim}>
        {'$'.repeat(MAX_LEVEL - level)}
      </span>
    </span>
  );
}
