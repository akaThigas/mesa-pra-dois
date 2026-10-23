import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { sheetStyles as form } from '@/shared/ui/BottomSheet';
import { searchPlaces, type PlaceResult } from '../data/geocoding';
import styles from './AddressSearch.module.css';

export interface SelectedPlace {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressSearchProps {
  value: SelectedPlace | null;
  onSelect: (place: PlaceResult | null) => void;
  /** Texto inicial da busca (ex.: o nome do restaurante) */
  suggestion: string;
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; results: PlaceResult[] }
  | { kind: 'error'; message: string };

/**
 * Campo de endereço com busca. Dois estados visuais:
 * já tem endereço escolhido (mostra + "Trocar") ou está buscando.
 */
export function AddressSearch({ value, onSelect, suggestion }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // Cancela uma busca em andamento se o componente sair da tela.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function search() {
    const term = (query || suggestion).trim();
    if (term.length < 3) {
      setState({ kind: 'error', message: 'Digite pelo menos 3 letras: nome do lugar, rua ou bairro.' });
      return;
    }
    if (!query) setQuery(term);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ kind: 'loading' });
    try {
      const results = await searchPlaces(term, controller.signal);
      setState({ kind: 'done', results });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Falha na busca.' });
    }
  }

  // Enter no campo busca o endereço em vez de enviar o formulário inteiro.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void search();
  }

  if (value) {
    return (
      <div className={form.field}>
        <span className={form.label}>Endereço</span>
        <div className={styles.selected}>
          <p className={styles.selectedText}>{value.address}</p>
          <button type="button" className={form.textButton} onClick={() => onSelect(null)}>
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={form.field}>
      <label className={form.label} htmlFor="address-search">
        Endereço <span className={form.optional}>(para aparecer no mapa)</span>
      </label>
      <div className={styles.searchRow}>
        <input
          id="address-search"
          className={form.input}
          type="search"
          enterKeyHint="search"
          placeholder={suggestion ? `Ex.: ${suggestion} São Paulo` : 'Nome do lugar, rua ou bairro'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={form.secondary}
          onClick={() => void search()}
          disabled={state.kind === 'loading'}
        >
          {state.kind === 'loading' ? '…' : 'Buscar'}
        </button>
      </div>

      {state.kind === 'error' && <p className={form.error}>{state.message}</p>}

      {state.kind === 'done' &&
        (state.results.length === 0 ? (
          <p className={styles.empty}>Nada encontrado. Tente o nome da rua com o bairro.</p>
        ) : (
          <ul className={styles.results} aria-label="Resultados da busca">
            {state.results.map((place) => (
              <li key={`${place.latitude},${place.longitude}`}>
                <button type="button" className={styles.result} onClick={() => onSelect(place)}>
                  <strong>{place.label}</strong>
                  <span>{place.address}</span>
                </button>
              </li>
            ))}
          </ul>
        ))}

      {state.kind === 'done' && <p className={styles.credit}>Busca: © OpenStreetMap</p>}
    </div>
  );
}
