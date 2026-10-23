import styles from './StarRating.module.css';

interface StarRatingProps {
  value: number;
  max?: number;
}

/** Exibição somente leitura. O leitor de tela ouve "Nota 4 de 5". */
export function StarRating({ value, max = 5 }: StarRatingProps) {
  return (
    <span className={styles.stars} role="img" aria-label={`Nota ${value} de ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} aria-hidden="true" className={index < value ? styles.filled : styles.empty}>
          ★
        </span>
      ))}
    </span>
  );
}
