import { useId } from 'react';
import styles from './StarInput.module.css';

interface StarInputProps<T extends number> {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  max?: number;
}

/**
 * Estrelas tocáveis feitas com <input type="radio"> de verdade:
 * teclado (setas) e leitor de tela funcionam "de graça", sem ARIA extra.
 */
export function StarInput<T extends number>({ label, value, onChange, max = 5 }: StarInputProps<T>) {
  const name = useId();

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.stars}>
        {Array.from({ length: max }, (_, index) => {
          const starValue = (index + 1) as T;
          return (
            <label key={starValue} className={styles.star} data-filled={value !== null && starValue <= value}>
              <input
                type="radio"
                name={name}
                value={starValue}
                checked={value === starValue}
                onChange={() => onChange(starValue)}
                className="visually-hidden"
              />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">
                {starValue} {starValue === 1 ? 'estrela' : 'estrelas'}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
