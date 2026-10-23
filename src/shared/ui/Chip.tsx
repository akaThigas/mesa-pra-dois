import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  /** Texto para leitor de tela quando o conteúdo visual não basta (ex.: "$$"). */
  ariaLabel?: string;
}

/** Botão de alternância (toggle). aria-pressed comunica o estado. */
export function Chip({ selected, onToggle, children, ariaLabel }: ChipProps) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}
