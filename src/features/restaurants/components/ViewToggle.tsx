import styles from './ViewToggle.module.css';

export type ViewMode = 'list' | 'map';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

const OPTIONS: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    value: 'list',
    label: 'Ver em lista',
    icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  },
  {
    value: 'map',
    label: 'Ver no mapa',
    icon: (
      <>
        <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </>
    ),
  },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label="Modo de visualização">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.button}
          aria-pressed={value === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {option.icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
