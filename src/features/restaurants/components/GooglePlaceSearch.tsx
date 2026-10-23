import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef, useState } from 'react';
import { sheetStyles as form } from '@/shared/ui/BottomSheet';
import { GOOGLE_PLACE_FIELDS, toPlaceResultFromGoogle } from '../data/googlePlaces';
import type { PlaceResult } from '../data/geocoding';
import styles from './AddressSearch.module.css';

interface GooglePlaceSearchProps {
  onSelect: (place: PlaceResult) => void;
  /** Texto inicial (ex.: o nome já digitado no formulário) */
  initialQuery: string;
}

/** Sugestões aparecem a partir de 3 letras, 300 ms depois de parar de digitar. */
const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

/** Prioriza resultados perto do centro de São Paulo (sem excluir o resto do Brasil). */
const SEARCH_BIAS = { center: { lat: -23.5505, lng: -46.6333 }, radius: 30_000 };

/**
 * Autocompletar do Google Places (API nova).
 * Usa um "token de sessão": todas as letras digitadas + o clique no
 * resultado contam como UMA sessão para fins de cobrança.
 */
export function GooglePlaceSearch({ onSelect, initialQuery }: GooglePlaceSearchProps) {
  const places = useMapsLibrary('places');
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!places) return;
    const term = query.trim();
    if (term.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      sessionRef.current ??= new places.AutocompleteSessionToken();
      try {
        const { suggestions: found } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: term,
          sessionToken: sessionRef.current,
          includedRegionCodes: ['br'],
          language: 'pt-BR',
          locationBias: SEARCH_BIAS,
        });
        // Ignora respostas atrasadas de buscas antigas (a pessoa já digitou mais).
        if (requestId !== requestIdRef.current) return;
        setSuggestions(found.flatMap((suggestion) => (suggestion.placePrediction ? [suggestion.placePrediction] : [])));
        setError(null);
      } catch {
        if (requestId === requestIdRef.current) setError('A busca do Google não respondeu. Tente de novo.');
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [places, query]);

  async function pick(prediction: google.maps.places.PlacePrediction) {
    setIsPicking(true);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: [...GOOGLE_PLACE_FIELDS] });
      const label = prediction.mainText?.text ?? prediction.text.text;
      const result = toPlaceResultFromGoogle(place, label);
      if (!result) throw new Error('Lugar sem localização');
      sessionRef.current = null; // a sessão termina ao escolher; a próxima busca abre outra
      onSelect(result);
    } catch {
      setError('Não foi possível carregar esse lugar. Tente outro resultado.');
      setIsPicking(false);
    }
  }

  return (
    <div className={form.field}>
      <label className={form.label} htmlFor="google-place-search">
        Endereço <span className={form.optional}>(para aparecer no mapa)</span>
      </label>
      <input
        id="google-place-search"
        className={form.input}
        type="search"
        placeholder="Digite o nome do lugar ou o endereço"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        // Enter não envia o formulário inteiro enquanto se busca.
        onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
        disabled={isPicking}
      />

      {!places && <p className={styles.empty}>Carregando a busca do Google…</p>}
      {error && <p className={form.error}>{error}</p>}

      {suggestions.length > 0 && (
        <>
          <ul className={styles.results} aria-label="Resultados da busca">
            {suggestions.map((prediction) => (
              <li key={prediction.placeId}>
                <button type="button" className={styles.result} onClick={() => void pick(prediction)} disabled={isPicking}>
                  <strong>{prediction.mainText?.text ?? prediction.text.text}</strong>
                  {prediction.secondaryText && <span>{prediction.secondaryText.text}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.credit}>Resultados do Google</p>
        </>
      )}
    </div>
  );
}
