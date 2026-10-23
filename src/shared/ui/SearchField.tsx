import { useId } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

/** Componente controlado: o estado mora em quem usa, não aqui. */
export function SearchField({ value, onChange, label, placeholder }: SearchFieldProps) {
  const inputId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className="visually-hidden">
        {label}
      </label>
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        id={inputId}
        type="search"
        className={styles.input}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
