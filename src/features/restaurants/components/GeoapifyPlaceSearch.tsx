import { useEffect, useRef, useState } from 'react';
import { sheetStyles as form } from '@/shared/ui/BottomSheet';
import { geoapifyAutocomplete } from '../data/geoapify';
import type { PlaceResult } from '../data/geocoding';
import styles from './AddressSearch.module.css';

interface GeoapifyPlaceSearchProps {
  apiKey: string;
  onSelect: (place: PlaceResult) => void;
  /** Texto inicial (ex.: o nome já digitado no formulário) */
  initialQuery: string;
}

/** Busca a partir de 3 letras, 400 ms depois de parar de digitar (economiza créditos). */
const MIN_CHARS = 3;
const DEBOUNCE_MS = 400;

type SearchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; results: PlaceResult[] }
  | { kind: 'error'; message: string };

/** Autocompletar do Geoapify: sugestões aparecem enquanto a pessoa digita. */
export function GeoapifyPlaceSearch({ apiKey, onSelect, initialQuery }: GeoapifyPlaceSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SearchState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_CHARS) {
      setState({ kind: 'idle' });
      return;
    }

    const timer = setTimeout(async () => {
      // Cancela a busca anterior: só a resposta mais recente importa.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ kind: 'loading' });
      try {
        const results = await geoapifyAutocomplete(term, apiKey, controller.signal);
        setState({ kind: 'done', results });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ kind: 'error', message: error instanceof Error ? error.message : 'Falha na busca.' });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [apiKey, query]);

  // Cancela qualquer busca pendente se a gaveta fechar.
  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className={form.field}>
      <label className={form.label} htmlFor="geoapify-search">
        Endereço <span className={form.optional}>(para aparecer no mapa)</span>
      </label>
      <input
        id="geoapify-search"
        className={form.input}
        type="search"
        placeholder="Nome do lugar ou endereço"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        // Enter não envia o formulário inteiro enquanto se busca.
        onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
      />

      {state.kind === 'loading' && <p className={styles.empty}>Buscando…</p>}
      {state.kind === 'error' && <p className={form.error}>{state.message}</p>}
      {state.kind === 'done' && state.results.length === 0 && (
        <p className={styles.empty}>Nada encontrado. Tente a rua e o número, por exemplo: Rua Pirapora 218.</p>
      )}

      {state.kind === 'done' && state.results.length > 0 && (
        <>
          <ul className={styles.results} aria-label="Resultados da busca">
            {state.results.map((place) => (
              <li key={`${place.latitude},${place.longitude},${place.label}`}>
                <button type="button" className={styles.result} onClick={() => onSelect(place)}>
                  <strong>{place.label}</strong>
                  <span>{place.address}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.credit}>Busca: Geoapify © OpenStreetMap</p>
        </>
      )}
    </div>
  );
}
